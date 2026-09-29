import Completed from '../model/Completed.js'
import Donor from '../model/Donar.js'
import Requests from '../model/Request.js'
import ReqBlood from '../model/Recipient.js'
import ArchivedBloodRequest from '../model/ArchivedBloodRequest.js'
import { getUserSocket, io } from '../config/socket.js'
import { acceptanceDeadline } from '../config/workflow.js'
import { inSession } from './transaction.js'

// A donor is considered committed while their request sits in any of these states.
export const ACTIVE_COMMITMENT_STATUSES = ["accepted","pending","confirmed"]

// A recipient has settled on a donor while their request sits in either of these states.
export const ACTIVE_CONFIRMATION_STATUSES = ["pending","confirmed"]

// Statuses where a donation is under way. A blood request in any of these is never expired
// by the sweeper, and these are the statuses a duplicate check has to consider "live".
export const IN_PROGRESS_STATUSES = ["accepted","pending","confirmed"]

// Everything that still occupies the donor/recipient pair, including a request nobody has
// acted on yet. Used for the duplicate-request check.
export const LIVE_STATUSES = ["prepending","accepted","pending","confirmed"]

// The donor still owes the recipient an action in these states, so they carry a deadline.
export const DEADLINE_STATUSES = ["accepted","pending"]

// A request in one of these is never removed by the ordinary delete endpoint. "confirmed" is a
// donation in progress, which the recipient cancels rather than deletes; "finalState" is a
// completed donation, and deleting it would erase history that the Completed archive and the
// donor's donation count both still refer to.
export const UNDELETABLE_STATUSES = ["confirmed","finalState"]

export { acceptanceDeadline }

/**
 * Writes a request into the Completed archive. Upserted on the request's own _id so a
 * retry, a concurrent sweep and a user action can all archive the same request without
 * either colliding on the primary key or double counting it.
 */
export const archiveRequest = async (request, session = null)=>{
    await Completed.updateOne(
        {_id:request._id},
        {$setOnInsert:{
            donorId:request.donorId,
            recipientId:request.recipientId,
            status:request.status
        }},
        {upsert:true, ...inSession(session)}
    )
}

// Tells every recipient still waiting on this donor that the donor's availability
// changed, so no list is left showing a donor who is already taken (or still shows one
// as taken after they were freed).
export const notifyWaitingRecipients = async (donorId, event, excludeRequestId = null)=>{
    const filter = {donorId, status:"prepending"}
    if(excludeRequestId) filter._id = {$ne:excludeRequestId}
    const waitingRequests = await Requests.find(filter)
    waitingRequests.forEach(waiting => {
        const waitingSocketId = getUserSocket(waiting.recipientId)
        if(waitingSocketId) io.to(waitingSocketId).emit(event,{requestId:waiting._id, donorId})
    })
}

export const releaseCommitment = async (donorId, requestId, session = null)=>{
    const released = await Donor.findOneAndUpdate(
        {donorId, committedRequestId:requestId},
        {committedRequestId:null},
        inSession(session)
    )
    if(released) await notifyWaitingRecipients(donorId, "donoravailable")
}

export const releaseConfirmation = async (recipientId, requestId, session = null)=>{
    await ReqBlood.findOneAndUpdate(
        {recipientId, confirmedRequestId:requestId},
        {confirmedRequestId:null},
        inSession(session)
    )
}

/**
 * The request this recipient has committed to, or null when they are still shopping around.
 *
 * Derived from the request rows rather than read off ReqBlood.confirmedRequestId, because the
 * lock field can lag: a crash between claiming it and moving the request leaves it pointing at a
 * request that never became "pending", and trusting it would then block the recipient forever.
 * The rows are the truth; the lock field is only the mutual-exclusion mechanism.
 *
 * "Committed" deliberately means pending or confirmed, not accepted. A donor accepting is not a
 * commitment by the recipient - the whole point of the five-donors-three-accept flow is that the
 * recipient keeps talking to everybody until they confirm one. The lock starts at confirmation.
 */
export const findRecipientCommitment = async (recipientId, session = null)=>{
    return await Requests.findOne(
        {recipientId, status:{$in:ACTIVE_CONFIRMATION_STATUSES}},
        null,
        inSession(session)
    ).select('_id donorId status respondBy')
}

/**
 * The request this donor has committed to, or null when they are free to take one on.
 *
 * The donor's side of the same idea, and note the different status list: a donor is locked from
 * the moment they *accept*, because acceptReq claims Donor.committedRequestId there and will
 * refuse a second acceptance. So "accepted" counts here while it does not for the recipient -
 * this function mirrors what the API actually refuses, which is the only thing that makes it
 * safe for the UI to explain a refusal before the user runs into it.
 *
 * Derived from the rows for the same reason as above: committedRequestId is the mutual-exclusion
 * mechanism, not the record.
 */
export const findDonorCommitment = async (donorId, session = null)=>{
    return await Requests.findOne(
        {donorId, status:{$in:ACTIVE_COMMITMENT_STATUSES}},
        null,
        inSession(session)
    ).select('_id recipientId status respondBy')
}

/**
 * A donor stopped carrying this request through - rejected it, was cancelled, or let the
 * acceptance deadline pass - so the request goes back to looking for somebody. Guarded on
 * isFulfilled so a finished request is never dragged back into the searching state, and on
 * there being no other donation still in progress, so cancelling one of several requests
 * cannot clear the flag while another donor is mid-donation.
 */
export const resetDonorFound = async (recipientId, session = null)=>{
    const stillInProgress = await Requests.findOne(
        {recipientId, status:{$in:IN_PROGRESS_STATUSES}},
        null,
        inSession(session)
    ).select('_id')
    if(stillInProgress) return

    await ReqBlood.findOneAndUpdate(
        {recipientId, isFulfilled:{$ne:true}},
        {isDonorFinded:false},
        inSession(session)
    )
}

/**
 * Why this user's blood request is no longer something they can act on, or null when it still
 * is. "fulfilled" means the donation completed; "expired" covers both a request the sweeper
 * has already flagged and one simply past its blood-needed date. That last case matters
 * because the sweeper runs on an interval, so between the deadline and the next sweep the
 * flag is still false while the request is, in effect, dead.
 *
 * The reason is returned rather than just a boolean, because the two closures need opposite
 * messages: a fulfilled request is a success and an expired one is a prompt to raise a new
 * request. Fulfilled is checked first - a request can be both, and having saved a life
 * outranks the calendar.
 */
export const bloodRequestClosedReason = async (recipientId, session = null)=>{
    const bloodRequest = await ReqBlood.findOne(
        {recipientId},
        null,
        inSession(session)
    ).select('isExpired isFulfilled expiresAt')
    if(!bloodRequest) return null
    if(bloodRequest.isFulfilled) return "fulfilled"
    if(bloodRequest.isExpired) return "expired"
    if(bloodRequest.expiresAt && bloodRequest.expiresAt.getTime() <= Date.now()) return "expired"
    return null
}

/**
 * The boolean form of the above, for the callers that only need to know whether to refuse an
 * action rather than what to say about it. Listing endpoints use it so they never offer
 * Accept or Confirm on a request that is already over.
 */
export const isBloodRequestClosed = async (recipientId, session = null)=>{
    return Boolean(await bloodRequestClosedReason(recipientId, session))
}

/**
 * Marks a blood request fulfilled once its donation completes. A single compare-and-set on
 * isFulfilled, so repeated or simultaneous OTP submissions can only ever flip it once: the
 * winner gets the document back, everybody else gets null. The same write clears the search
 * flag and releases the recipient's confirmation lock, so the three cannot drift apart.
 */
export const markBloodRequestFulfilled = async (recipientId, donorId, session = null)=>{
    return await ReqBlood.findOneAndUpdate(
        {recipientId, isFulfilled:{$ne:true}},
        {
            isFulfilled:true,
            fulfilledAt:new Date(),
            fulfilledBy:donorId,
            isDonorFinded:false,
            confirmedRequestId:null
        },
        {new:true, ...inSession(session)}
    )
}

// Clears a commitment whose request is no longer live - rejected, expired or deleted - so a
// stale lock can never strand a donor forever.
export const releaseStaleCommitment = async (donor)=>{
    if(!donor.committedRequestId) return donor
    const heldRequest = await Requests.findOne({_id:donor.committedRequestId, status:{$in:ACTIVE_COMMITMENT_STATUSES}})
    if(heldRequest) return donor
    return await Donor.findOneAndUpdate(
        {donorId:donor.donorId, committedRequestId:donor.committedRequestId},
        {committedRequestId:null},
        {new:true}
    ) || donor
}

// Mirror of releaseStaleCommitment for the recipient side: drops a confirmation whose
// request is no longer live, so an expired or deleted request cannot block the recipient
// from ever confirming another donor.
export const releaseStaleConfirmation = async (bloodRequest)=>{
    if(!bloodRequest.confirmedRequestId) return
    const heldRequest = await Requests.findOne({_id:bloodRequest.confirmedRequestId, status:{$in:ACTIVE_CONFIRMATION_STATUSES}})
    if(heldRequest) return
    await ReqBlood.findOneAndUpdate(
        {recipientId:bloodRequest.recipientId, confirmedRequestId:bloodRequest.confirmedRequestId},
        {confirmedRequestId:null}
    )
}

/**
 * Archives a blood request snapshot so donation history survives its expiry or fulfilment.
 *
 * Upserted on (bloodRequestId, cycle, reason) rather than on the blood request's own id. One
 * profile carries one ReqBlood document and resubmitting after an expiry reuses it, so keying
 * on that id alone made every round after the first a no-op upsert against the first round's
 * row - the history was silently dropped. Keying on the round instead means each round keeps
 * its own record, while archiving the same round twice still collapses into one.
 *
 * The unique index on those three fields is what actually enforces that on a deployment
 * without transactions, so a concurrent duplicate surfaces as E11000 and is swallowed here:
 * the row it collided with is the row this call was trying to write.
 */
export const archiveBloodRequest = async (bloodRequest, reason)=>{
    const snapshot = typeof bloodRequest.toObject === 'function' ? bloodRequest.toObject() : bloodRequest
    const cycle = Number.isFinite(bloodRequest.cycle) ? bloodRequest.cycle : 0
    try{
        await ArchivedBloodRequest.updateOne(
            {bloodRequestId:bloodRequest._id, cycle, reason},
            {$setOnInsert:{
                recipientId:bloodRequest.recipientId,
                bloodType:bloodRequest.bloodType,
                patientsName:bloodRequest.patientsName,
                location:bloodRequest.location,
                place:bloodRequest.place,
                pinCode:bloodRequest.pinCode,
                bloodUnits:bloodRequest.bloodUnits,
                hospitalInfo:bloodRequest.hospitalInfo,
                isDonorFinded:bloodRequest.isDonorFinded,
                fulfilledBy:bloodRequest.fulfilledBy || null,
                fulfilledAt:bloodRequest.fulfilledAt || null,
                reqDate:bloodRequest.reqDate,
                requestedAt:bloodRequest.createdAt,
                archivedAt:new Date(),
                snapshot,
            }},
            {upsert:true}
        )
    }catch(err){
        // two callers upserted the same round at once; the loser's row is already there
        if(err?.code !== 11000) throw err
    }
}

export const emitToUsers = (userIds, event, payload)=>{
    const socketIds = userIds.map(getUserSocket).filter(Boolean)
    if(socketIds.length) io.to(socketIds).emit(event, payload)
}

/**
 * Retires a single request: archives it, removes it from the live collection and frees both
 * sides. The status flip is a conditional update on the statuses that are still retirable,
 * so two sweeps (or a sweep racing a user action) cannot both retire the same request.
 * Returns the retired request, or null if somebody else got there first.
 */
export const retireRequest = async (requestId, fromStatuses, toStatus)=>{
    const retired = await Requests.findOneAndUpdate(
        {_id:requestId, status:{$in:fromStatuses}},
        {status:toStatus, respondBy:null},
        {new:true}
    )
    if(!retired) return null

    await archiveRequest(retired)
    await Requests.deleteOne({_id:retired._id, status:toStatus})
    await releaseCommitment(retired.donorId, retired._id)
    await releaseConfirmation(retired.recipientId, retired._id)
    // the donor who was going to donate no longer is, so the request is searching again
    await resetDonorFound(retired.recipientId)
    return retired
}
