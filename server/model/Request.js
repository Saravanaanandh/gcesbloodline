import mongoose from "mongoose";
import { donorRequestExpiry } from "../config/workflow.js";

const requestSchema = new mongoose.Schema({
    donorId:{
        type:mongoose.Types.ObjectId,
        ref:'User',
        required:true
    },
    recipientId:{
        type:mongoose.Types.ObjectId,
        ref:'User',
        required:true
    },
    // The blood request this donor request belongs to. Two requests to the same donor for
    // the same blood requirement are duplicates; a later, separate requirement is not.
    bloodRequestId:{
        type:mongoose.Types.ObjectId,
        ref:'ReqBlood',
        default:null
    },
    status:{
        type:String,
        enum:["prepending","accepted","rejected","pending","confirmed","expired","finalState"],
        default:"prepending",
    },
    // Deadline for the party whose turn it is. Set when a donor accepts and reset when the
    // recipient confirms, so a stalled acceptance cannot hold a donor indefinitely. Cleared
    // once the status reaches "confirmed", where the donation is actively in progress.
    // null until a donor accepts: an untouched request is governed by expiresAt instead.
    respondBy:{
        type:Date,
        default:null
    },
    // Replaces the old TTL on createdAt. The sweeper decides when to act on this, which
    // lets it skip anything mid-donation and archive the rest instead of silently deleting.
    expiresAt:{
        type:Date,
        default:donorRequestExpiry
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
},{timestamps:true})

// the sweeper scans by deadline, so both are indexed
requestSchema.index({status:1, respondBy:1})
requestSchema.index({status:1, expiresAt:1})

// The duplicate check in sendRequest reads before it writes, and on a deployment without
// transactions two simultaneous clicks can both pass that read. This unique index is what
// actually closes the race: the second insert fails with E11000 and the controller turns
// that into the same 409. It is partial so that a request which has been rejected or
// expired no longer blocks a fresh one for the same requirement.
requestSchema.index(
    {recipientId:1, donorId:1, bloodRequestId:1},
    {
        unique:true,
        partialFilterExpression:{status:{$in:["prepending","accepted","pending","confirmed"]}}
    }
)

const Requests = mongoose.model('Requests',requestSchema)
export default Requests
