import mongoose from 'mongoose'

/**
 * Snapshot of a blood request that has been expired or fulfilled. The old TTL index simply
 * deleted these, so donation history lost the recipient side of every completed donation.
 * Kept schemaless on the payload so it survives future changes to the ReqBlood shape.
 *
 * Each archive row has its own _id rather than reusing the blood request's. One profile carries
 * one ReqBlood document (recipientId is unique) and resubmitting after an expiry reuses it, so
 * keying the archive on that id meant the second round's history was written as an upsert
 * against the first round's row and silently dropped. Identity is (bloodRequestId, cycle,
 * reason) instead: the cycle counter on ReqBlood advances on every resubmit, so each round gets
 * its own record while a repeated archive of the same round still collapses into one.
 */
const archivedBloodRequestSchema = new mongoose.Schema({
    // the ReqBlood document this snapshot came from; not unique, one per cycle
    bloodRequestId:{
        type:mongoose.Types.ObjectId,
        ref:'ReqBlood',
        required:true,
        index:true
    },
    // which round of that blood request this was. 0 for the original submission and for rows
    // archived before the counter existed.
    cycle:{
        type:Number,
        required:true,
        default:0
    },
    recipientId:{
        type:mongoose.Types.ObjectId,
        required:true,
        index:true
    },
    reason:{
        type:String,
        enum:["expired","fulfilled","replaced","deleted"],
        required:true
    },
    bloodType:String,
    patientsName:String,
    location:String,
    place:String,
    pinCode:Number,
    bloodUnits:Number,
    hospitalInfo:String,
    isDonorFinded:Boolean,
    // set when the archived round ended in a completed donation, so history keeps the donor
    fulfilledBy:{
        type:mongoose.Types.ObjectId,
        ref:'User',
        default:null
    },
    fulfilledAt:{
        type:Date,
        default:null
    },
    reqDate:Date,
    requestedAt:Date,
    archivedAt:{
        type:Date,
        default:Date.now
    },
    snapshot:{
        type:mongoose.Schema.Types.Mixed
    }
},{timestamps:true})

// What makes an archive row unique. Two sweeps, a sweep racing a user action, or a repeated
// OTP submission all archive the same round, and this collapses them into one row instead of
// duplicating the history.
archivedBloodRequestSchema.index({bloodRequestId:1, cycle:1, reason:1}, {unique:true})

const ArchivedBloodRequest = mongoose.model('ArchivedBloodRequest', archivedBloodRequestSchema)
export default ArchivedBloodRequest
