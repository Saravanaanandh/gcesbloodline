 
import Requests from '../model/Request.js'
import User from '../model/User.js'
import ReqBlood from '../model/Recipient.js'
import Donor from '../model/Donar.js'
import { io } from '../config/socket.js'
import { verifyPinCodeLocation } from '../utils/pincode.js'
import { MAX_BLOOD_UNITS } from '../config/workflow.js'
import ArchivedBloodRequest from '../model/ArchivedBloodRequest.js'
import {
    ACTIVE_CONFIRMATION_STATUSES,
    LIVE_STATUSES,
    archiveBloodRequest,
    emitToUsers,
    findDonorCommitment,
    findRecipientCommitment,
} from '../utils/requestWorkflow.js'
import { endOfDayIST, isPastInIST, todayIST } from '../utils/istDate.js'
import { publicBloodRequest, publicUser, viewerTier } from '../utils/publicView.js'

// The message the spec fixes for a form frozen by an active commitment. Kept in one place so the
// API and the UI cannot drift apart - the client shows whatever the server sent.
export const FORM_LOCKED_MESSAGE = "Your blood request is currently in progress with a confirmed donor. To modify your request, you must first cancel the ongoing donation request."

// The form is allowed to set these and nothing else. The workflow fields - isFulfilled,
// isDonorFinded, confirmedRequestId, isExpired, expiresAt - are owned by the server, so a
// client cannot post its way out of a fulfilled or expired request.
const EDITABLE_FIELDS = [
    'bloodType','patientsName','patientsage','AttendeesName','AttendeesPhno','gender',
    'email','reqDate','bloodUnits','hospitalInfo','note','isCritical'
]
const sanitizeRequestBody = (body = {})=>
    EDITABLE_FIELDS.reduce((clean, field)=>{
        if(body[field] !== undefined) clean[field] = body[field]
        return clean
    }, {})

export const createRecipients = async (req, res)=>{
    const {_id:userId} = req.user

    if(!userId) return res.status(401).json({message:"unauthorized user"});

    const {location, place, pinCode, bloodUnits, reqDate} = req.body
    if(!location || !pinCode) return res.status(400).json({message:"please provide the district and pincode"})

    // "Date of Blood Needed" is the expiry deadline for the whole request, so it has to be a
    // real date and it cannot already be behind us. Judged in IST, because that is the
    // calendar the recipient picked from, whatever timezone the server happens to run in.
    if(!reqDate) return res.status(400).json({message:"Please choose the date the blood is needed"})
    const neededOn = endOfDayIST(reqDate)
    if(!neededOn) return res.status(400).json({message:"Please choose a valid date for when the blood is needed"})
    if(isPastInIST(reqDate)){
        return res.status(400).json({message:`The date the blood is needed must be today (${todayIST()}) or later`})
    }

    // One active request settled by one confirmed donor, so the quantity is bounded here as
    // well as in the schema - the form is only a recommendation, this is the rule.
    const units = Number(bloodUnits)
    if(!Number.isInteger(units) || units < 1){
        return res.status(400).json({message:"Please enter a whole number of blood units, at least 1"})
    }
    if(units > MAX_BLOOD_UNITS){
        return res.status(400).json({message:`A single request can ask for at most ${MAX_BLOOD_UNITS} units. Raise a separate request from another profile if more blood is needed.`})
    }

    try{
        // the district and place are auto-filled on the client, so they are re-checked
        // against India Post here rather than trusted as submitted
        const verified = await verifyPinCodeLocation(pinCode, location, place, {requirePlace:false})
        if(!verified.ok) return res.status(400).json({message:verified.message})

        const verifiedLocation = {
            location: verified.district,
            place: verified.place,
            pinCode: Number(pinCode)
        }

        // One live document per profile, so a brand new requirement is simply a create. A
        // completed one is deleted the moment its donation finalizes, which is what makes this
        // the ordinary path after a successful donation rather than the exception.
        const createFreshRequest = async ()=>{
            const recipient = await ReqBlood.create({
                ...sanitizeRequestBody(req.body),
                ...verifiedLocation,
                bloodUnits:units,
                expiresAt:neededOn,
                recipientId:userId
            })
            await User.findByIdAndUpdate(userId,{recipientId:recipient._id},{new:true})
            io.emit("newrecipient",{bloodRequestId:recipient._id, recipientId:userId})
            return res.status(201).json(recipient)
        }

        const existingRecipient = await ReqBlood.findOne({recipientId:userId})
        if(existingRecipient){
            // THE FORM LOCK. Once a donor is confirmed the request is frozen: editing it would
            // change what that donor agreed to donate, mid-donation. It stays frozen until the
            // donation completes or the recipient cancels it, which is what the message says to do.
            //
            // Enforced here and not only by rendering the form read-only, so a direct POST to this
            // endpoint is refused as well.
            //
            // Scoped to pending/confirmed rather than to "accepted" as well: a donor merely having
            // accepted is not a commitment by the recipient - the recipient is still choosing
            // between several donors at that point and must stay able to correct their own form.
            // Those donors are told about the edit further down instead.
            const commitment = await findRecipientCommitment(userId)
            if(commitment){
                return res.status(409).json({message:FORM_LOCKED_MESSAGE})
            }

            // A round that is over is being replaced rather than edited: its donation completed,
            // the sweeper has flagged it expired, or its date has passed and the sweeper has
            // simply not got to it yet.
            //
            // A fulfilled round counts. It used to be refused outright - one profile, one
            // request, ever - which is what produced "Blood request already fulfilled" on every
            // later attempt. The rule it was protecting is that a profile may hold one *active*
            // request at a time, and a completed one is not active: it is history, already
            // archived, and replacing it here leaves exactly one live requirement as before.
            //
            // Normally there is nothing to replace at all, because a fulfilled document is
            // deleted as its donation finalizes. This path is what recovers the ones that were
            // left behind - written before that existed, or by a crash mid-completion.
            const isReplacingFinishedRound = Boolean(
                existingRecipient.isFulfilled
                || existingRecipient.isExpired
                || isPastInIST(existingRecipient.reqDate)
            )

            // The outgoing round is archived before it is overwritten, so its history survives
            // the reopen. Deduped on (blood request, cycle, reason), so a round the sweeper or
            // the completion flow already archived is a no-op here rather than a second row -
            // and the round that never reached either is still recorded.
            if(isReplacingFinishedRound){
                await archiveBloodRequest(
                    existingRecipient,
                    existingRecipient.isFulfilled ? "fulfilled" : "expired"
                )
            }

            // Re-submitting an expired or untouched request reopens it against the new date.
            // Every piece of workflow state from the previous round is reset here - the expiry
            // flag, the search flag and the confirmation lock - so a reopened request starts
            // clean rather than inheriting a commitment that no longer exists. The whitelist
            // stops a client posting isFulfilled or expiresAt of its own.
            //
            // The cycle advances only when a finished round is replaced, never on an ordinary
            // edit of a live request: it is what gives each round its own archive identity, so
            // it has to line up with what was actually archived above.
            const updatedRecipient = await ReqBlood.findOneAndUpdate(
                {recipientId:userId, _id:existingRecipient._id},
                {
                    $set:{
                        ...sanitizeRequestBody(req.body),
                        ...verifiedLocation,
                        bloodUnits:units,
                        isExpired:false,
                        expiresAt:neededOn,
                        isDonorFinded:false,
                        confirmedRequestId:null,
                        // The outcome of the round just archived above. Left set, these would
                        // hand the new round the previous one's completion - closed on arrival,
                        // credited to a donor who never agreed to it.
                        isFulfilled:false,
                        fulfilledAt:null,
                        fulfilledBy:null
                    },
                    ...(isReplacingFinishedRound ? {$inc:{cycle:1}} : {})
                },
                {new:true, runValidators:true}
            )
            // The document went away between the read and the write - the donation finalized in
            // that window and took it with it. Nothing is wrong, there is simply no longer a
            // round to replace, so this submission is the new request.
            if(!updatedRecipient) return await createFreshRequest()
            // Ids only. This used to broadcast the whole document - patient name, attendee phone
            // number, contact email - to every connected client, authenticated or not. It has
            // always only been a cache-invalidation signal, so the ids are all it needs to carry.
            io.emit("newrecipient",{bloodRequestId:updatedRecipient._id, recipientId:userId})

            // Donors already holding a live request against this requirement are looking at the
            // details as they were before the edit. They are told to reload rather than left to
            // act on a version that no longer exists. This is what makes it safe to let the form
            // be edited while a donor has accepted but nobody is confirmed yet.
            const openRequests = await Requests.find({
                recipientId:userId,
                status:{$in:LIVE_STATUSES}
            }).select('donorId')
            emitToUsers(
                openRequests.map(request => request.donorId),
                "bloodrequestupdated",
                {bloodRequestId:updatedRecipient._id, recipientId:userId}
            )

            res.status(201).json(updatedRecipient)
        }else{
            return await createFreshRequest()
        }
    }catch(err){
        if(err.name === "ValidationError"){
            return res.status(400).json({message:"please provide the valid details"})
        }
        res.status(500).json({message:err.name})
    }
}

export const getAllRecipients = async(req, res)=>{
    const {_id:userId} = req.user
    if(!userId) return res.status(400).json({message:"Invalid User Id"})

    // This donor's own lock, so the directory can show why Accept is unavailable everywhere. Sent
    // as a flag plus the one requirement it belongs to - not as a list of who else is involved.
    // Read before the query below, which needs to know which requirement is this donor's own.
    const donorCommitment = await findDonorCommitment(userId)

    // A requirement that already has a confirmed donor leaves the public directory. It is being
    // served, one confirmed donor is all it needs, and leaving it listed invites other donors to
    // accept a request that will only be auto-cancelled underneath them.
    //
    // Derived from the request rows rather than from ReqBlood.confirmedRequestId, which can lag
    // behind a crashed confirmation, and in one query rather than per recipient.
    //
    // The viewer's own counterpart is deliberately exempt. "Leaves the public directory" means
    // hidden from donors who are not part of it - the confirmed donor has to keep seeing the
    // requirement, or the moment the recipient confirms them their own donation vanishes from
    // their Accepted and Confirmed tabs, which is the one place they go to carry it out.
    const committedRecipientIds = (await Requests
        .find({status:{$in:ACTIVE_CONFIRMATION_STATUSES}})
        .distinct('recipientId'))
        .filter(recipientId => !(
            donorCommitment && String(recipientId) === String(donorCommitment.recipientId)
        ))

    // A closed request is no longer offered to donors to act on: fulfilled, expired, or past
    // its blood-needed date but not yet swept. The last condition matters because the sweeper
    // runs on an interval, so there is always a window where the flag has not been set yet.
    const recipients = await ReqBlood.find({
        recipientId:{$ne: userId, $exists:true, $nin:committedRecipientIds},
        isFulfilled:{$ne:true},
        isExpired:{$ne:true},
        expiresAt:{$gt:new Date()}
    })

    const profiles = await Promise.all(
        recipients.map(recipient => User.findOne({_id:recipient.recipientId}))
    )
    const requests = await Promise.all(
        recipients.map(recipient => Requests.findOne({recipientId:recipient.recipientId,donorId:userId}))
    )

    // Contact details only for the recipients this donor already has a live request with. A
    // stranger in the directory gets the requirement, not the family's phone number.
    const tiers = recipients.map((recipient, index) => viewerTier(userId, recipient.recipientId, requests[index]))

    // No io.emit here any more. This used to broadcast the whole list - including a `requests`
    // array computed for *this* caller only - to every connected client, so one donor's page
    // could be overwritten with another donor's request states. Callers now read their own
    // response, and the mutation handlers broadcast id-only invalidation signals instead.
    res.status(200).json({
        recipients:recipients.map((recipient, index) => publicBloodRequest(recipient, tiers[index])),
        recipientProfile:profiles.map((profile, index) => publicUser(profile, tiers[index])),
        requests,
        viewerDonorCommitted:Boolean(donorCommitment),
        viewerCommittedRecipientId:donorCommitment ? donorCommitment.recipientId : null,
        count:recipients.length
    })
}
/**
 * The recipient's own blood request, for the "My Blood Request" view on their profile.
 *
 * Strictly read only. Nothing here writes, and it deliberately does not broadcast: viewing the
 * form must never touch the expiry deadline, the confirmation lock or any donor request, so
 * there is no findOneAndUpdate and no io.emit anywhere in this handler. That is the whole point
 * of it being a separate endpoint rather than a reuse of the create/update path.
 *
 * Returns the live request (or null), the donor who is confirmed against it if there is one,
 * every donor request raised for it, and the archive of previous rounds - so a user whose
 * request has just expired and been swept still has a history to look at.
 */
export const getMyBloodRequest = async(req, res)=>{
    const {_id:userId} = req.user
    if(!userId) return res.status(401).json({message:"unauthorized user"})

    try{
        const bloodRequest = await ReqBlood.findOne({recipientId:userId})

        // Past rounds, newest first. Present whether or not a live request exists, because the
        // sweeper deletes an expired request outright and this is the only trace left of it.
        const history = await ArchivedBloodRequest.find({recipientId:userId})
            .sort('-archivedAt')
            .select('-snapshot')

        if(!bloodRequest){
            return res.status(200).json({
                bloodRequest:null,
                status:"none",
                donorRequests:[],
                confirmedDonor:null,
                history
            })
        }

        // Derived here rather than stored, so it cannot drift from the document. The
        // expiresAt comparison covers the gap between the deadline and the next sweep.
        const isPastDeadline = Boolean(bloodRequest.expiresAt && bloodRequest.expiresAt <= new Date())
        const status = bloodRequest.isFulfilled ? "fulfilled"
            : (bloodRequest.isExpired || isPastDeadline) ? "expired"
            : "active"

        const donorRequests = await Requests.find({recipientId:userId, status:{$in:LIVE_STATUSES}})
            .sort('-createdAt')
        // 'related' rather than the raw document: a live request entitles the recipient to the
        // donor's name and contact details so they can arrange the donation, and to nothing from
        // the donor's eligibility questionnaire.
        const donorProfiles = await Promise.all(
            donorRequests.map(async request => publicUser(await User.findById(request.donorId), 'related'))
        )
        // The Donor record id, which is what /alldonors/:id and GET /donate/:id are keyed on. The
        // page used to link with the profile's `donorId`, but that field is returned at the 'own'
        // tier only, so every one of these links went to /alldonors/undefined.
        const donorRecordIds = await Promise.all(
            donorRequests.map(async request => {
                const donor = await Donor.findOne({donorId:request.donorId}).select('_id')
                return donor ? donor._id : null
            })
        )

        // The one donor this recipient is committed to, if any. Matched on the confirmation
        // statuses - not IN_PROGRESS_STATUSES - because that is exactly what createRecipients and
        // deleteRecipient refuse on, and a lock the UI shows where the API would have allowed the
        // edit is just as wrong as the reverse. A donor who has only *accepted* is not a
        // commitment: the recipient is still choosing between them.
        const commitment = donorRequests.find(request => ACTIVE_CONFIRMATION_STATUSES.includes(request.status))
        const confirmedDonor = commitment
            ? {
                request:commitment,
                donor:donorProfiles[donorRequests.indexOf(commitment)] || null
            }
            : null

        res.status(200).json({
            bloodRequest,
            status,
            // true while a donation is under way: the form is frozen until it finishes or is
            // cancelled, which is exactly what createRecipients enforces with a 409
            isLocked:Boolean(commitment),
            // The one place this string is defined, so the locked form shows the API's own words.
            formLockedMessage:commitment ? FORM_LOCKED_MESSAGE : null,
            // How many donors have accepted and are waiting to be chosen. Not a lock - shown so
            // the recipient knows there is something to act on.
            acceptedCount:donorRequests.filter(request => request.status === 'accepted').length,
            donorRequests:donorRequests.map((request, index) => ({
                request,
                donor:donorProfiles[index] || null,
                donorRecordId:donorRecordIds[index]
            })),
            confirmedDonor,
            history
        })
    }catch(err){
        res.status(500).json({message:err.message})
    }
}

export const getSingleRecipient = async(req, res)=>{
    const {_id:id} = req.user
    const {id:recipientId} = req.params
    const userId = id?.toString()
    if(!userId) return res.status(401).json({message:"unauthorized user"})

    try{
        const recipientDetail = await ReqBlood.findById(recipientId)
        if(!recipientDetail) return res.status(404).json({message:"recipient not found"})

        const recipientProfile = await User.findOne({recipientId})
        const request = await Requests.findOne({recipientId:recipientDetail.recipientId, donorId:userId})

        // The viewer sees contact details only if they are the recipient themselves or a donor
        // who already has a live request with them. A direct link to this page is not a way
        // around the masking applied to the directory.
        const tier = viewerTier(userId, recipientDetail.recipientId, request)

        // This requirement is off the public directory while a donation is under way. Said out
        // loud rather than 404ing, so a donor arriving from a stale list or a bookmark is told
        // why they cannot act instead of being shown a dead link - and so the page can render
        // the In Progress state instead of a Send Request button.
        const commitment = await findRecipientCommitment(recipientDetail.recipientId)

        // The viewer's own commitment as a donor. They are entitled to know about their own
        // donation, and it is why Accept is unavailable on everybody else's requirement - acceptReq
        // refuses a second acceptance outright, so this lets the page say so instead of letting
        // them click into a 409.
        const donorCommitment = await findDonorCommitment(userId)

        // Dropped the io.emit('getrecipient', ...) that used to fire here. Opening one
        // recipient's page broadcast that recipient's details - patient name, attendee phone
        // number - to every connected client, and overwrote whatever page they had open.
        res.status(200).json({
            recipientDetail:publicBloodRequest(recipientDetail, tier),
            request,
            recipientProfile:publicUser(recipientProfile, tier),
            isInProgress:Boolean(commitment),
            viewerDonorCommitted:Boolean(donorCommitment),
            // whether that commitment is to *this* requirement, which is the difference between
            // "carry on" and "you are busy elsewhere". The other recipient is not named.
            viewerCommittedHere:Boolean(
                donorCommitment && String(donorCommitment.recipientId) === String(recipientDetail.recipientId)
            ),
            // the confirmed donor's identity is the recipient's own business; other viewers
            // only learn that the requirement is taken
            inProgressWith:commitment && tier === 'own' ? commitment.donorId : undefined
        })
    }catch(err){
        // an id that is not a valid ObjectId reaches findById as a CastError, which used to
        // escape as an unhandled rejection rather than a response
        if(err.name === "CastError") return res.status(404).json({message:"recipient not found"})
        res.status(500).json({message:err.message})
    }
}

export const deleteRecipient = async (req, res)=>{
    const {_id:userId} = req.user
    if(!userId) return res.status(401).json({message:"Unauthorized User"})

    try{
        const recipient = await ReqBlood.findOne({recipientId:userId})
        if(!recipient) return res.status(404).json({message:"You're not a recipient"})

        // Deleting the requirement out from under a donation that is already under way would leave
        // the confirmed donor holding a request whose blood requirement no longer exists - and
        // would be a way around the form lock, since the recipient could delete and re-create
        // instead of cancelling. Cancel the donation first; that is what the message says.
        const commitment = await findRecipientCommitment(userId)
        if(commitment){
            return res.status(409).json({message:FORM_LOCKED_MESSAGE})
        }

        // archived before it is deleted, so tearing down the profile does not take the
        // donation history with it - this is the other route by which a user ends up
        // raising a fresh blood request
        await archiveBloodRequest(recipient, recipient.isFulfilled ? "fulfilled" : "deleted")
        await ReqBlood.findOneAndDelete({recipientId:userId})
        await User.findOneAndUpdate({_id:userId},{$unset: {recipientId: ""}})
        res.status(200).json({message:"recipient was deleted"})
    }catch(err){
        res.status(500).json({message:"cant delete try again later"})
    }
}
