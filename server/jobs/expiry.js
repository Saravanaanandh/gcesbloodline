import mongoose from 'mongoose'
import { io } from '../config/socket.js'
import Requests from '../model/Request.js'
import ReqBlood from '../model/Recipient.js'
import User from '../model/User.js'
import ArchivedBloodRequest from '../model/ArchivedBloodRequest.js'
import { getExpirySweepMinutes, donorRequestExpiry, requestExpiry } from '../config/workflow.js'
import { endOfDayIST } from '../utils/istDate.js'
import {
    DEADLINE_STATUSES,
    IN_PROGRESS_STATUSES,
    LIVE_STATUSES,
    archiveBloodRequest,
    emitToUsers,
    retireRequest,
} from '../utils/requestWorkflow.js'

/**
 * The old 30 day TTL indexes deleted documents unconditionally. They are dropped here so the
 * scheduled sweeper below is the only thing that retires anything; otherwise MongoDB would
 * keep deleting requests behind its back, including donations still in progress.
 */
const dropLegacyTTLIndexes = async ()=>{
    const collections = [Requests, ReqBlood]
    for(const model of collections){
        try{
            const indexes = await model.collection.indexes()
            for(const index of indexes){
                const isCreatedAtTTL = index.key?.createdAt === 1 && index.expireAfterSeconds !== undefined
                if(isCreatedAtTTL){
                    await model.collection.dropIndex(index.name)
                    console.log(`dropped legacy TTL index ${model.modelName}.${index.name}`)
                }
            }
        }catch(err){
            // a missing collection on a fresh database is normal
            if(err?.codeName !== "NamespaceNotFound") console.log(`could not inspect ${model.modelName} indexes: ${err.message}`)
        }
    }
}

/**
 * Builds the unique partial index that stops two simultaneous sends creating duplicate
 * requests. Done explicitly at boot, and tolerantly: on a database that already holds
 * duplicates the build fails, and that must not stop the server - sendRequest's own
 * duplicate check still covers the ordinary case.
 */
const ensureRequestIndexes = async ()=>{
    try{
        await Requests.createIndexes()
    }catch(err){
        console.log(`could not build Requests indexes, clear duplicate live requests first: ${err.message}`)
    }
}

/**
 * Migrates archive rows written while the archive reused the blood request's own _id. Those
 * rows carry no bloodRequestId or cycle, so the unique index on (bloodRequestId, cycle,
 * reason) could not build and their history would not be found by a lookup on the blood
 * request. The old _id *was* the blood request id, so it is copied across and the row is
 * treated as round 0.
 *
 * Tolerant like the other index builds: a database that somehow already holds two rows for
 * one round must not stop the server from starting.
 */
const migrateBloodRequestArchive = async ()=>{
    try{
        const legacy = await ArchivedBloodRequest.find({bloodRequestId:{$exists:false}}).select('_id')
        for(const row of legacy){
            await ArchivedBloodRequest.updateOne({_id:row._id}, {$set:{bloodRequestId:row._id, cycle:0}})
        }
        if(legacy.length) console.log(`migrated ${legacy.length} archived blood requests onto (bloodRequestId, cycle)`)
        await ArchivedBloodRequest.createIndexes()
    }catch(err){
        console.log(`could not migrate the blood request archive: ${err.message}`)
    }
}

/**
 * Backfills expiresAt so the sweeper has something to compare against instead of ignoring a
 * document forever.
 *
 * A blood request's deadline is now the end of its blood-needed day in IST, so every one is
 * recomputed from reqDate rather than only filled in when missing: documents written while
 * expiresAt was a flat 30 days from creation are carrying a deadline that has nothing to do
 * with the date the recipient chose, and leaving those alone would keep requests open weeks
 * past the day the blood was actually needed. Only the ones that disagree are written.
 */
const backfillExpiry = async ()=>{
    const requests = await Requests.updateMany(
        {expiresAt:{$exists:false}},
        {$set:{expiresAt:donorRequestExpiry()}}
    )

    let realigned = 0
    const bloodRequests = await ReqBlood.find({}).select('reqDate expiresAt isExpired')
    for(const bloodRequest of bloodRequests){
        // a document with no reqDate at all predates the field being required, so it falls
        // back to the old rolling window rather than being given a deadline out of thin air
        const deadline = bloodRequest.reqDate ? endOfDayIST(bloodRequest.reqDate) : requestExpiry()
        if(!deadline) continue
        if(bloodRequest.expiresAt && bloodRequest.expiresAt.getTime() === deadline.getTime()) continue
        await ReqBlood.updateOne({_id:bloodRequest._id}, {$set:{expiresAt:deadline}})
        realigned++
    }

    if(requests.modifiedCount || realigned){
        console.log(`backfilled expiresAt on ${requests.modifiedCount} requests and realigned ${realigned} blood requests to their blood-needed date`)
    }
}

/**
 * Issue 1: a donor accepted but then went quiet. The acceptance is expired once its
 * deadline passes and both sides are told, which frees the donor and lets the recipient
 * pick somebody else.
 */
export const expireStaleAcceptances = async ()=>{
    const overdue = await Requests.find({
        status:{$in:DEADLINE_STATUSES},
        respondBy:{$ne:null, $lte:new Date()}
    }).select('_id donorId recipientId status respondBy')

    let expired = 0
    for(const request of overdue){
        const retired = await retireRequest(request._id, DEADLINE_STATUSES, "expired")
        if(!retired) continue
        emitToUsers([retired.donorId, retired.recipientId], "acceptanceexpired", {
            requestId:retired._id,
            donorId:retired.donorId,
            recipientId:retired.recipientId,
        })
        expired++
    }
    return expired
}

/**
 * Donor requests nobody ever acted on. Only "prepending" is swept here; anything further
 * along is governed by the acceptance deadline above.
 */
export const expireUntouchedRequests = async ()=>{
    const overdue = await Requests.find({
        status:"prepending",
        expiresAt:{$ne:null, $lte:new Date()}
    }).select('_id donorId recipientId status')

    let expired = 0
    for(const request of overdue){
        const retired = await retireRequest(request._id, ["prepending"], "expired")
        if(!retired) continue
        emitToUsers([retired.donorId, retired.recipientId], "requestexpired", {requestId:retired._id})
        expired++
    }
    return expired
}

/**
 * Issue 2: the blood-needed date is the deadline for the whole request. Once that day has
 * finished in IST the request is over, and every donor request hanging off it goes with it -
 * prepending, accepted, pending and confirmed alike.
 *
 * Note that a donation in progress no longer defers the expiry. An earlier rule skipped
 * these, on the grounds that a live donation should outrank the clock. The blood-needed date
 * overrides that: blood needed on the 5th is no use on the 7th, so a donor who never turned
 * up by the deadline is cancelled rather than left holding the request open indefinitely.
 * Both sides are told, and both commitment locks are released by retireRequest.
 *
 * The blood request document is archived and then deleted, not merely flagged. Nothing expires
 * a moment early: the deadline is endOfDayIST(reqDate), which is 23:59:59.999 IST on the
 * chosen day, and the query below only picks up documents already past it.
 */
export const expireBloodRequests = async ()=>{
    // a fulfilled request is already closed and archived, so expiring it would only overwrite
    // a finished outcome with "expired"
    const overdue = await ReqBlood.find({
        isExpired:{$ne:true},
        isFulfilled:{$ne:true},
        expiresAt:{$ne:null, $lte:new Date()}
    })

    let expired = 0, cancelledDonations = 0
    for(const bloodRequest of overdue){
        // Conditional update, so two sweeps cannot both expire and both archive it. The search
        // flag and the confirmation lock are cleared in the same write as the expiry flag, so
        // an expired request can never be left looking like it still has a donor lined up.
        const claimed = await ReqBlood.findOneAndUpdate(
            {_id:bloodRequest._id, isExpired:{$ne:true}},
            {isExpired:true, isDonorFinded:false, confirmedRequestId:null},
            {new:true}
        )
        if(!claimed) continue

        // archived before anything is deleted, so the history survives the sweep
        await archiveBloodRequest(claimed, "expired")

        // Every donor request against this requirement is now pointless, whatever stage it
        // reached. retireRequest archives each one, deletes it and releases the donor's
        // committedRequestId and the recipient's confirmedRequestId.
        const orphans = await Requests.find({
            recipientId:claimed.recipientId,
            status:{$in:LIVE_STATUSES}
        }).select('_id donorId recipientId status')

        for(const orphan of orphans){
            const wasInProgress = IN_PROGRESS_STATUSES.includes(orphan.status)
            const retired = await retireRequest(orphan._id, LIVE_STATUSES, "expired")
            if(!retired) continue

            if(wasInProgress){
                // a donation somebody had committed to is being called off, so both sides are
                // told, not just the donor whose incoming request vanished
                emitToUsers([retired.donorId, retired.recipientId], "donationcancelled", {
                    requestId:retired._id,
                    donorId:retired.donorId,
                    recipientId:retired.recipientId,
                    reason:"expired",
                })
                cancelledDonations++
            }
            emitToUsers([retired.donorId], "requestexpired", {requestId:retired._id})
        }

        // The request itself is now removed, not just flagged. It is archived above, so the
        // history is already safe, and deleting it is what lets the recipient raise a fresh
        // request without an expired record standing in the way: createRecipients finds no
        // existing document and takes the create path rather than reopening a dead round.
        // Deleted last, after the donor requests are retired, because retireRequest reads this
        // document to release the confirmation lock.
        await ReqBlood.findByIdAndDelete(claimed._id)
        // otherwise User.recipientId dangles at a document that no longer exists, and the
        // client keeps treating the user as an active recipient
        await User.findOneAndUpdate({_id:claimed.recipientId}, {$unset:{recipientId:""}})

        emitToUsers([claimed.recipientId], "bloodrequestexpired", {
            bloodRequestId:claimed._id,
            reqDate:claimed.reqDate,
        })
        // donors merely browsing the directory still have this requirement on screen, and they
        // have no request of their own here to be notified about, so the whole room is told to
        // refetch. Carries ids only - the personal message goes to the recipient above.
        io.emit("bloodrequestclosed",{bloodRequestId:claimed._id, reason:"expired"})
        expired++
    }
    return {expired, cancelledDonations}
}

export const runExpirySweep = async ()=>{
    if(mongoose.connection.readyState !== 1) return
    try{
        const acceptances = await expireStaleAcceptances()
        const untouched = await expireUntouchedRequests()
        const {expired, cancelledDonations} = await expireBloodRequests()
        if(acceptances || untouched || expired || cancelledDonations){
            console.log(`expiry sweep: ${acceptances} acceptances, ${untouched} untouched requests, ${expired} blood requests past their needed-by date, ${cancelledDonations} in-progress donations cancelled`)
        }
    }catch(err){
        console.log(`expiry sweep failed: ${err.message}`)
    }
}

let timer = null

export const startExpiryScheduler = async ()=>{
    if(mongoose.connection.readyState !== 1){
        console.log("expiry scheduler not started: no database connection")
        return
    }
    await dropLegacyTTLIndexes()
    await ensureRequestIndexes()
    await migrateBloodRequestArchive()
    await backfillExpiry()
    await runExpirySweep()
    const sweepMinutes = getExpirySweepMinutes()
    if(timer) clearInterval(timer)
    timer = setInterval(runExpirySweep, sweepMinutes * 60 * 1000)
    // an interval must not keep the process alive on its own
    if(typeof timer.unref === 'function') timer.unref()
    console.log(`expiry scheduler running every ${sweepMinutes} minute(s)`)
}

export const stopExpiryScheduler = ()=>{
    if(timer) clearInterval(timer)
    timer = null
}
