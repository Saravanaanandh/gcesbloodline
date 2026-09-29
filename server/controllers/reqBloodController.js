
import Completed from '../model/Completed.js'
import Donor from '../model/Donar.js'
import Requests from '../model/Request.js'
import User from '../model/User.js'
import ReqBlood from '../model/Recipient.js'
import mongoose from 'mongoose'
import DeletedReq from '../model/Deleted.js'
import ArchivedBloodRequest from '../model/ArchivedBloodRequest.js'
import { getUserSocket } from '../config/socket.js'
import { io } from '../config/socket.js'
import { acceptanceDeadline, donorRequestExpiry } from '../config/workflow.js'
import { inSession, withTransaction } from '../utils/transaction.js'
import { sendDonorCancellationEmail } from '../utils/mailer.js'
import { publicBloodRequest, publicDonor, publicUser, viewerTier } from '../utils/publicView.js'
import {
    ACTIVE_COMMITMENT_STATUSES,
    ACTIVE_CONFIRMATION_STATUSES,
    LIVE_STATUSES,
    UNDELETABLE_STATUSES,
    archiveRequest,
    emitToUsers,
    findRecipientCommitment,
    releaseCommitment,
    releaseConfirmation,
    releaseStaleCommitment,
    releaseStaleConfirmation,
    notifyWaitingRecipients,
    resetDonorFound,
    retireRequest,
} from '../utils/requestWorkflow.js'

export const sendRequest = async(req, res)=>{
    const {_id:recipientId} = req.user
    const {id:donorId} = req.params  
    if(!recipientId) return res.status(401).json({message:"unauthorized user"})
    if(!req.user.recipientId || !mongoose.isValidObjectId(req.user.recipientId)) return res.status(400).json({message:"You're not a recipient, so cant send request"})
    try{
        const donor = await Donor.findOne({donorId})
        if(!donor) return res.status(404).json({message:"Donor not found"})

        // Self-matching. The old check compared an ObjectId against the string route
        // param, so it never fired and a user could request blood from themselves.
        if(String(recipientId) === String(donorId) || String(donor.donorId) === String(recipientId)){
            return res.status(400).json({message:"You cannot send a blood request to your own donor profile"})
        }

        const recipientDetail = await ReqBlood.findOne({recipientId})
        if(!recipientDetail) return res.status(400).json({message:"Fill your blood request form before sending requests"})

        // This requirement has been met, so it takes no further donors. It is normally deleted as
        // its donation finalizes, so reaching this means the completion is still in flight; either
        // way the answer is a fresh request, which the recipient may now raise straight away on
        // this same profile.
        if(recipientDetail.isFulfilled){
            return res.status(409).json({message:"This blood request has already been fulfilled. Submit the Blood Request Form again to raise a new request."})
        }

        // An expired blood requirement must not attract new donors.
        if(recipientDetail.isExpired || (recipientDetail.expiresAt && recipientDetail.expiresAt <= new Date())){
            return res.status(410).json({message:"This blood request has expired. Create a new request to contact donors."})
        }

        // THE COMMITMENT LOCK, recipient side. Once this recipient has confirmed a donor the
        // requirement is being served and must stop recruiting: approaching more donors would
        // waste their time and could produce a second confirmed donation for a requirement that
        // only needs one. Enforced here rather than only by hiding the button, so a direct POST
        // to this endpoint is refused too.
        //
        // releaseStaleConfirmation runs first so a lock left behind by a request that has since
        // died cannot block the recipient permanently, and the check itself reads the request
        // rows rather than the lock field for the same reason.
        await releaseStaleConfirmation(recipientDetail)
        const commitment = await findRecipientCommitment(recipientId)
        if(commitment){
            return res.status(409).json({message:"Your blood request is already in progress with a confirmed donor. Cancel that donation before contacting other donors."})
        }

        // Duplicates are scoped to the blood requirement, not to the accounts: a later,
        // separate requirement may legitimately reach the same donor again. The check and
        // the insert share a transaction where the deployment supports one, so two
        // simultaneous clicks cannot both get through.
        const request = await withTransaction(async (session)=>{
            // Re-read inside the transaction: on a replica set this makes the commitment check
            // and the insert one atomic unit, so a confirmation landing at the same moment
            // cannot slip between them.
            const raced = await findRecipientCommitment(recipientId, session)
            if(raced) return {committed:true}

            const duplicate = await Requests.findOne({
                recipientId,
                donorId,
                status:{$in:LIVE_STATUSES},
                $or:[{bloodRequestId:recipientDetail._id},{bloodRequestId:null}]
            }, null, inSession(session))
            if(duplicate) return {duplicate}

            try{
                const [created] = await Requests.create([{
                    recipientId,
                    donorId,
                    bloodRequestId:recipientDetail._id,
                    expiresAt:donorRequestExpiry()
                }], inSession(session))
                return {created}
            }catch(err){
                // the unique partial index on (recipientId, donorId, bloodRequestId) rejected
                // it, which means a simultaneous click got there first
                if(err?.code === 11000) return {duplicate:true}
                throw err
            }
        })

        if(request.committed){
            return res.status(409).json({message:"Your blood request is already in progress with a confirmed donor. Cancel that donation before contacting other donors."})
        }
        if(request.duplicate){
            return res.status(409).json({message:"You have already sent a request to this donor for this blood requirement"})
        }

        // The dev database is a standalone mongod, so withTransaction falls back to running
        // session-free and the check above is not genuinely atomic there. A confirmation that
        // landed in that window would leave this brand new request stranded as a live
        // "prepending" row against a requirement that is no longer recruiting, so it is undone
        // here instead. Compare-and-set on the status it was just created with, so this can
        // never remove a request a donor has already acted on.
        const committedAfter = await findRecipientCommitment(recipientId)
        if(committedAfter){
            await Requests.deleteOne({_id:request.created._id, status:"prepending"})
            return res.status(409).json({message:"Your blood request is already in progress with a confirmed donor. Cancel that donation before contacting other donors."})
        }

        // The "you have a new request" email to the donor is still sent client-side through
        // EmailJS (useRecipientStore.sendRequest), because that path has a browser attached and
        // carries no secret. Only the flows that cannot work that way - automatic cancellations
        // and signup OTPs - go through utils/mailer.js.
        //
        // Resolved defensively: a Donor row whose User has since dropped its donorId would
        // otherwise throw here, after the request row has already been written, and the catch
        // below would report that as a 404 on a request that does in fact exist.
        const donorDetail = await User.findOne({donorId: donor._id}).select('_id')
        const receiverSocketId = donorDetail ? getUserSocket(donorDetail._id) : null
        if(receiverSocketId) io.to(receiverSocketId).emit("requestsent", request.created)
        res.status(200).json(request.created)
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid donor id"})
        }
        res.status(404).json({message:err.name})
    }
}



export const getAllRequests = async (req, res)=>{
    const {_id:userId,donorId,recipientId} = req.user 
    if(!userId) return res.status(400).json({message:"Unauthorized user"})

    if(!donorId && !recipientId) return res.status(400).json({message:"You're neither a donor nor a recipient, so no requests come to you"})

    const requests = await Requests.find({$or:[{donorId:userId},{recipientId:userId}]})

    // Every profile here belongs to the caller or to the other party in one of the caller's own
    // requests, so it is 'own' or 'related': contact details, because they have to be able to
    // reach each other, and none of the health answers, which are nobody else's business even
    // between two people arranging a donation.
    const donorProfile = await Promise.all(
        requests.map(async request => publicUser(
            await User.findOne({_id:request.donorId}),
            viewerTier(userId, request.donorId, true)
        ))
    )
    const recipientProfile = await Promise.all(
        requests.map(async request => publicUser(
            await User.findOne({_id:request.recipientId}),
            viewerTier(userId, request.recipientId, true)
        ))
    )
    res.status(200).json({requests,donorProfile,recipientProfile,count:requests.length})
}

export const getRequest = async (req, res)=>{
    const {_id:userId,donorId, recipientId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!donorId && !recipientId) return res.status(400).json({message:"You're neither a donor nor a recipient, so no requests come to you"})
    if(!requestId) return res.status(400).json({message:"No requests found"}) 

    try{
        // Scoped to the two parties. Without this, any authenticated user who knows (or guesses)
        // a request id could read the recipient's patient name, attendee phone number and
        // hospital out of a request they have nothing to do with.
        const request = await Requests.findOne({
            _id:requestId,
            $or:[{donorId:userId},{recipientId:userId}]
        })
        if(!request) return res.status(404).json({message:"Request does not exists"})
        const recipientDetail = await ReqBlood.findOne({recipientId:request.recipientId})
        if(!recipientDetail) return res.status(404).json({message:"recipient not found"})
        const donor = await Donor.findOne({donorId:request.donorId})
        const donorDetail = await User.findOne({_id:request.donorId})

        // Both parties are 'related' to each other through this request; each is 'own' when
        // looking at their own side. Either way the eligibility questionnaire stays with the
        // donor - the recipient needs a phone number to arrange the donation, not a medical file.
        const donorTier = viewerTier(userId, request.donorId, true)
        const recipientTier = viewerTier(userId, request.recipientId, true)

        res.status(200).json({
            request,
            recipientDetail:publicBloodRequest(recipientDetail, recipientTier),
            donor:publicDonor(donor, donorTier),
            donorDetail:publicUser(donorDetail, donorTier)
        })
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

/**
 * Once a recipient confirms one donor, every other donor they were still talking to is released,
 * told the recipient is no longer looking, and emailed.
 *
 * Scoped to the blood requirement rather than to the account. One profile carries one ReqBlood
 * document today so the two are equivalent in practice, but the requirement is the thing being
 * served, and a legacy row written before bloodRequestId existed still has to be swept - hence
 * the null arm.
 *
 * Only prepending and accepted are swept. pending and confirmed cannot co-exist with the
 * confirmation that triggered this (the confirmedRequestId lock is what guarantees that), and
 * finalState is a completed donation which is never undone.
 *
 * Returns the donors to notify rather than emailing them inline, so the caller can answer the
 * HTTP request first and only then wait on a mail provider. Each entry is a request whose status
 * flip actually succeeded, which is what makes "exactly one notice per donor" true: a request
 * that had already been rejected or cancelled loses the compare-and-set and never reaches the
 * list, so it produces no email.
 */
const cancelCompetingRequests = async (recipientUserId, keepRequestId, bloodRequestId)=>{
    const competing = await Requests.find({
        recipientId:recipientUserId,
        _id:{$ne:keepRequestId},
        status:{$in:["prepending","accepted"]},
        ...(bloodRequestId ? {$or:[{bloodRequestId},{bloodRequestId:null}]} : {})
    })

    const cancelledRequests = []
    for(const other of competing){
        const cancelled = await Requests.findOneAndUpdate(
            {_id:other._id, status:{$in:["prepending","accepted"]}},
            {status:"rejected", respondBy:null},
            {new:true}
        )
        if(!cancelled) continue

        // Completed keeps the request id as its own _id, so this is an upsert rather than
        // an insert that a retry or a concurrent sweep could collide with. Archived before the
        // row is deleted, so the cancellation survives in history exactly as a rejection does.
        await archiveRequest(cancelled)
        await Requests.deleteOne({_id:cancelled._id, status:"rejected"})

        // a donor who had already accepted is now free to commit to someone else
        await releaseCommitment(cancelled.donorId, cancelled._id)

        // The donor's "Request Received" list is refreshed immediately. The event name is
        // deliberately not "rejectrequest": this is not the donor's own rejection and must not
        // be presented to them as one.
        const donorSocketId = getUserSocket(cancelled.donorId)
        if(donorSocketId){
            io.to(donorSocketId).emit("recipientfounddonor",{
                requestId:cancelled._id,
                recipientId:recipientUserId,
                reason:"recipient-confirmed-another-donor"
            })
        }
        cancelledRequests.push(cancelled)
    }
    return cancelledRequests
}

/**
 * Emails each donor whose request was automatically cancelled, once.
 *
 * Deduplicated on donor id even though the unique partial index on
 * (recipientId, donorId, bloodRequestId) already makes a repeat impossible within one
 * requirement - the guarantee the spec asks for should not depend on an index that a future
 * schema change could relax.
 *
 * Runs after the HTTP response and never throws: sendMail swallows transport errors, and a donor
 * missing an email is a far smaller problem than a confirmation that appears to have failed
 * because a mail provider was slow. Because it is driven by the rows whose status flip already
 * committed, every email corresponds to a transition that really happened.
 */
const notifyCancelledDonors = async (cancelledRequests)=>{
    if(!cancelledRequests.length) return

    const donorIds = [...new Set(cancelledRequests.map(request => String(request.donorId)))]
    const donors = await User.find({_id:{$in:donorIds}}).select('email username')

    await Promise.all(
        donors.map(donor => sendDonorCancellationEmail({email:donor.email, donorName:donor.username}))
    )
}

export const acceptReq = async (req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!requestId) return res.status(400).json({message:"recipient id invalid"})
    try{
        // only a registered donor may accept, and the donor record is the source of
        // truth here rather than the client-side flag on the user
        const donor = await Donor.findOne({donorId:userId})
        if(!donor) return res.status(403).json({message:"Complete your donor form before accepting blood donation requests"})

        // After a completed donation the donor is switched to unavailable and has to opt
        // back in deliberately: refill the eligibility form, then turn availability on.
        // Both are checked here so the rule holds even if the UI is bypassed.
        const donorUser = await User.findById(userId).select('available lastDonated')
        if(!donorUser?.available){
            return res.status(403).json({message:"Turn on your availability in your profile before accepting blood donation requests"})
        }
        if(donorUser.lastDonated && !(donor.updatedAt > new Date(donorUser.lastDonated))){
            return res.status(403).json({message:"Fill your donor eligibility form again before accepting a new request"})
        }

        // an expired or already fulfilled blood requirement is no longer donatable
        const incoming = await Requests.findOne({_id:requestId, donorId:userId}).select('recipientId')
        if(incoming){
            const bloodRequest = await ReqBlood.findOne({recipientId:incoming.recipientId}).select('isExpired expiresAt isFulfilled')
            if(bloodRequest?.isFulfilled){
                return res.status(409).json({message:"This blood request has already been fulfilled by another donor"})
            }
            if(!bloodRequest || bloodRequest.isExpired || (bloodRequest.expiresAt && bloodRequest.expiresAt <= new Date())){
                return res.status(410).json({message:"This blood request has expired and can no longer be accepted"})
            }

            // The recipient has already confirmed somebody else. cancelCompetingRequests removes
            // rows like this one at the moment of confirmation, so arriving here means either a
            // stale client that still shows the Accept button or a genuine race with the confirm.
            // Either way, accepting now would take a commitment the recipient no longer needs and
            // lock this donor out of requests they could actually serve.
            const commitment = await findRecipientCommitment(incoming.recipientId)
            if(commitment && String(commitment._id) !== String(requestId)){
                return res.status(409).json({message:"The recipient has already confirmed another donor for this request"})
            }
        }

        await releaseStaleCommitment(donor)

        // Claim the donor before touching the request. This is a single document
        // compare-and-set, so if two acceptances race, exactly one sees
        // committedRequestId as null and wins; the loser gets null back.
        const claimed = await Donor.findOneAndUpdate(
            {donorId:userId, committedRequestId:null},
            {committedRequestId:requestId},
            {new:true}
        )
        if(!claimed){
            return res.status(409).json({message:"You have already committed to another recipient. Reject that request before accepting a new one."})
        }

        // accepting starts the response clock: if the donation is not driven to "confirmed"
        // before respondBy, the sweeper expires the acceptance and frees both sides
        const request = await Requests.findOneAndUpdate(
            {_id:requestId,donorId:userId,status:"prepending"},
            {status:"accepted", respondBy:acceptanceDeadline()},
            {new:true}
        )
        if(!request){
            // the claim only holds if the request itself moved, otherwise give it back
            await releaseCommitment(userId, requestId)
            return res.status(404).json({message:"request not found"})
        }

        const receiverSocketId = getUserSocket(request.recipientId)
        if(receiverSocketId) io.to(receiverSocketId).emit("acceptrequest",request)

        // every other recipient still waiting on this donor is told they are taken,
        // so nobody is left believing the donor committed to them too
        await notifyWaitingRecipients(userId, "donorunavailable", request._id)

        res.status(200).json(request)
    }catch(err){
        if(err.name === "CastError"){
            await releaseCommitment(userId, requestId).catch(()=>{})
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

export const confirmReq = async (req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!requestId) return res.status(400).json({message:"request Not found"})
    try{
        const bloodRequest = await ReqBlood.findOne({recipientId:userId})
        if(!bloodRequest) return res.status(403).json({message:"Fill the blood request form before confirming a donor"})

        // a finished request takes no further donors
        if(bloodRequest.isFulfilled){
            return res.status(409).json({message:"This blood request has already been fulfilled. Submit the Blood Request Form again to raise a new request."})
        }

        await releaseStaleConfirmation(bloodRequest)

        // Claim the blood request before touching the donor request. Single document
        // compare-and-set, so simultaneous clicks or two devices race on this one write and
        // exactly one of them sees confirmedRequestId as null. isFulfilled is part of the
        // filter so a donation completing at the same moment cannot be overtaken.
        const claimed = await ReqBlood.findOneAndUpdate(
            {recipientId:userId, confirmedRequestId:null, isFulfilled:{$ne:true}},
            {confirmedRequestId:requestId},
            {new:true}
        )
        if(!claimed){
            return res.status(409).json({message:"You have already confirmed a donor for this request. Reject that donor before confirming another."})
        }

        // the clock restarts: now the donor owes the final confirmation
        const request = await Requests.findOneAndUpdate(
            {_id:requestId,recipientId:userId,status:"accepted"},
            {status:"pending", respondBy:acceptanceDeadline()},
            {new:true}
        )
        if(!request){
            // the claim only holds if the request itself moved, otherwise give it back
            await releaseConfirmation(userId, requestId)
            return res.status(404).json({message:"request not found"})
        }

        // one donor is settled, so every competing request for this requirement is cancelled
        // and each of those donors is freed to commit elsewhere
        const cancelledRequests = await cancelCompetingRequests(userId, request._id, claimed._id)

        const receiverSocketId = getUserSocket(request.donorId)
        if(receiverSocketId) io.to(receiverSocketId).emit("confirmrequest",request)

        // The recipient's other tabs and devices need to switch to the in-progress view too -
        // the HTTP response only reaches the one that clicked. Targeted, because it names a
        // specific donor.
        emitToUsers([userId], "requestinprogress", {
            requestId:request._id,
            donorId:request.donorId,
            bloodRequestId:claimed._id
        })

        // Every donor browsing the recipient directory needs this requirement to disappear from
        // it, and there is no way to know which sockets those are, so this one is a broadcast.
        // Ids only: a broadcast reaches every connected client, so it must never carry the
        // recipient's details.
        io.emit("recipientcommitted", {bloodRequestId:claimed._id, recipientId:userId})

        res.status(200).json(request)

        // Deliberately after the response. Emailing several donors through an external provider
        // must not make the recipient's confirmation appear slow or, worse, time out - and the
        // rows these emails describe are already committed, so nothing is lost by answering first.
        await notifyCancelledDonors(cancelledRequests)
    }catch(err){
        if(err.name === "CastError"){
            await releaseConfirmation(userId, requestId).catch(()=>{})
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

export const confirmedReq = async (req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!requestId) return res.status(400).json({message:"request Not found"})
    try{
        // the donation is now actively in progress, so the response deadline is cleared and
        // neither the acceptance sweeper nor the blood request sweeper will touch it
        const request = await Requests.findOneAndUpdate(
            {_id:requestId,donorId:userId,status:"pending"},
            {status:"confirmed", respondBy:null},
            {new:true}
        )
        if(!request) return res.status(404).json({message:"request not found"})
        // guarded on isFulfilled so this cannot reopen a request that has just been closed
        await ReqBlood.findOneAndUpdate({recipientId: request.recipientId, isFulfilled:{$ne:true}},{isDonorFinded:true}, {new:true})
        const receiverSocketId = getUserSocket(request.recipientId)
        if(receiverSocketId) io.to(receiverSocketId).emit("confirmedrequest",request)
        res.status(200).json(request)
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

export const rejectReq = async (req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!requestId) return res.status(400).json({message:"request Not found"})

    try{
        // Scoped to the two parties: a stranger with a request id must not be able to reject a
        // donation they have no part in. The status filter is still what makes the transition
        // atomic, so two rejections cannot both succeed.
        const request = await Requests.findOneAndUpdate(
            {_id:requestId, status:{$in:["prepending","accepted"]}, $or:[{donorId:userId},{recipientId:userId}]},
            {status:"rejected", respondBy:null},
            {new:true}
        )
        if(!request) return res.status(404).json({message:"request not found"})
        // frees the donor if this was the request they were committed to
        await releaseCommitment(request.donorId, request._id)
        await archiveRequest(request)
        await Requests.deleteOne({_id:requestId,status:"rejected"})
        // this donor is out, so the request goes back to searching - unless it is fulfilled
        // or another donor is still mid-donation
        await resetDonorFound(request.recipientId)
        // Both parties, independently. This used to require *both* to be online before it emitted
        // anything, so whenever one of them had the page closed the other's list silently kept
        // showing a request that no longer existed.
        emitToUsers([request.recipientId, request.donorId], "rejectrequest", {
            requestId:request._id,
            donorId:request.donorId,
            recipientId:request.recipientId
        })
        res.status(200).json(request)
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

export const rejectAcceptedReq = async (req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!requestId) return res.status(400).json({message:"request Not found"})

    try{
        // Scoped to the two parties, as with rejectReq.
        const request = await Requests.findOneAndUpdate(
            {_id:requestId, status:"pending", $or:[{donorId:userId},{recipientId:userId}]},
            {status:"rejected", respondBy:null},
            {new:true}
        )
        if(!request) return res.status(404).json({message:"request not found"})
        // frees both sides: the donor to commit again, the recipient to confirm another donor
        await releaseCommitment(request.donorId, request._id)
        await releaseConfirmation(request.recipientId, request._id)
        await archiveRequest(request)
        await Requests.deleteOne({_id:requestId,status:"rejected"})
        // the confirmed donor backed out, so the recipient is free to find another
        await resetDonorFound(request.recipientId)

        // Both parties: the donor's own list has to drop the request too, and previously only the
        // recipient was told.
        emitToUsers([request.recipientId, request.donorId], "rejectaccrequest", request)

        // The commitment lock is released, so this requirement is recruiting again and belongs
        // back in the public recipient directory. Ids only - this is a broadcast.
        io.emit("recipientreleased", {bloodRequestId:request.bloodRequestId, recipientId:request.recipientId})

        res.status(200).json(request)
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

/**
 * The recipient calls off a donation they had already settled on - the donor went quiet, or
 * said they cannot donate after all. deleteRequest deliberately refuses to touch a confirmed
 * request, so without this the recipient would be stuck waiting for the blood-needed date to
 * pass before they could approach anybody else.
 *
 * Scoped to the recipient, so a donor cannot cancel through this route; they have their own
 * reject. retireRequest does the rest in one place: archive, delete, release the donor's
 * committedRequestId and the recipient's confirmedRequestId, and clear isDonorFinded.
 */
export const cancelConfirmedReq = async(req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(401).json({message:"Unauthorized User"})
    if(!requestId) return res.status(400).json({message:"request Not found"})

    try{
        // Ownership is checked here; the status transition itself is a compare-and-set inside
        // retireRequest, so two cancels (or a cancel racing the sweeper) cannot both succeed.
        const owned = await Requests.findOne({
            _id:requestId,
            recipientId:userId,
            status:{$in:ACTIVE_COMMITMENT_STATUSES}
        }).select('_id status')
        if(!owned){
            // a donation that has already completed is history, not something to cancel
            const finalized = await Requests.findOne({_id:requestId, recipientId:userId, status:"finalState"}).select('_id')
                || await Completed.findOne({_id:requestId, recipientId:userId, status:"finalState"}).select('_id')
            if(finalized) return res.status(409).json({message:"This donation has already been completed"})
            return res.status(404).json({message:"No confirmed donor found on this request to cancel"})
        }

        const cancelled = await retireRequest(owned._id, ACTIVE_COMMITMENT_STATUSES, "rejected")
        if(!cancelled) return res.status(409).json({message:"This request has already been cancelled or completed"})

        // the donor loses a donation they had agreed to, so they are told rather than left
        // to notice the request has quietly vanished
        emitToUsers([cancelled.donorId, cancelled.recipientId], "donationcancelled", {
            requestId:cancelled._id,
            donorId:cancelled.donorId,
            recipientId:cancelled.recipientId,
            reason:"cancelled",
        })

        // Both locks are released, so the requirement is recruiting again and returns to the
        // public recipient directory. Ids only - this is a broadcast.
        io.emit("recipientreleased", {bloodRequestId:cancelled.bloodRequestId, recipientId:cancelled.recipientId})

        res.status(200).json({message:"The donation was cancelled. You can now contact another donor.", request:cancelled})
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid request id"})
        }
        res.status(500).json({message:"cant cancel the request, try again later"})
    }
}

export const deleteRequest = async(req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    try{
        const request = await Requests.findOne({_id:requestId,recipientId:userId})
        if(!request) return res.status(400).json({message:"request only deleted by recipient"})

        // A donation in progress or already completed is not deletable through here. finalState
        // matters as much as confirmed: this endpoint removed the row from Requests while the
        // Completed record kept pointing at it, so a finished donation could be erased from the
        // recipient's own history. Cancelling a confirmed donation has its own endpoint, which
        // archives it and releases both locks instead of deleting it outright.
        const deletedReq = await Requests.findOneAndDelete({
            _id:requestId,
            recipientId:userId,
            status:{$nin:UNDELETABLE_STATUSES}
        })
        if(!deletedReq){
            const message = request.status === "finalState"
                ? "This donation has already been completed, so its record cannot be deleted"
                : "This request cant be deleted because a donor is confirmed. Cancel the donation instead."
            return res.status(409).json({message})
        }
        // frees both sides: the donor to commit again, the recipient to confirm another donor
        await releaseCommitment(deletedReq.donorId, deletedReq._id)
        await releaseConfirmation(deletedReq.recipientId, deletedReq._id)
        await resetDonorFound(deletedReq.recipientId)
        // upsert rather than insert: DeletedReq reuses the request id as its primary key, so a
        // retry would otherwise throw E11000 and be reported as a server error
        await DeletedReq.updateOne(
            {_id:request._id},
            {$setOnInsert:{donorId:request.donorId, recipientId:request.recipientId, status:request.status}},
            {upsert:true}
        )
        const receiverSocket = getUserSocket(deletedReq.donorId)
        if(receiverSocket) io.to(receiverSocket).emit("deleterequest")
        return res.status(200).json({message:"request was deleted!"})
    }catch(err){
        return res.status(500).json({message:"cant delete the request, try again later"})
    }
}

export const completedRequests = async(req, res)=>{
    const {_id:userId} = req.user
    if(!userId) return res.status(401).json({message:"Unauthorized user"})
    
    try{
        // newest first, so the most recent donation is at the top of the history
        const requests = await Completed.find({
            $or:[{donorId:userId},{recipientId:userId}],
            status:"finalState"
        }).sort('-createdAt')
        // a completed donation makes the two parties 'related' for good; still no health answers
        const donorDetail = await Promise.all(
            requests.map(async request => publicUser(
                await User.findById(request.donorId),
                viewerTier(userId, request.donorId, true)
            ))
        )
        const recipientDetail = await Promise.all(
            requests.map(async request => publicUser(
                await User.findById(request.recipientId),
                viewerTier(userId, request.recipientId, true)
            ))
        )
        // The recipient side of the history: one row per round of the user's own blood request,
        // which is what the archive exists to preserve. Without this the archive is write-only
        // and a fulfilled request leaves no trace the user can see.
        const bloodRequestHistory = await ArchivedBloodRequest.find({recipientId:userId})
            .sort('-archivedAt')
            .select('-snapshot')
        res.status(200).json({
            requests, donorDetail, recipientDetail, bloodRequestHistory, count:requests.length
        })
    }catch(err){
        res.status(500).json({message:err.message})
    }
}
