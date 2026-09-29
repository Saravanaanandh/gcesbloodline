import mongoose from "mongoose";
import { MAX_BLOOD_UNITS } from "../config/workflow.js";
import { endOfDayIST } from "../utils/istDate.js";

const reqBloodSchema = new mongoose.Schema({
    recipientId:{
        type:mongoose.Types.ObjectId,
        ref:'User',
        required:true,
        unique:true
    },
    bloodType:{
        type:String,
        required:true,
        enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-',"A1+", "A1-", "A2+", "A2-", "A1B+","A1B-", "A2B+", "A2B-", "BOMBAY BLOOD GROUP"],
        set: value => value.toUpperCase()
    },
    patientsName:{
        type:String,
        required:true,
        maxlength:30
    },
    patientsage:{
        type:Number,
        required:true
    },
    AttendeesName:{
        type:String,
        required:true,
        maxlength:30
    },
    AttendeesPhno:{
        type:Number,
        required:true
    },
    gender:{
        type:String,
        enum:["MALE","FEMALE"],
        set:value => value.toUpperCase(),
        required:true
    },
    email:{
        type:String,
        required:true,
        match:/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    },
    location:{
        type:String,
        required:true
    },
    place:{
        type:String,
        default:"",
        trim:true,
        maxlength:100
    },
    pinCode:{
        type:Number,
        required:true
    },
    // "Date of Blood Needed". This is the deadline for the whole request: once this day has
    // finished in IST the request expires, so it is required rather than defaulted.
    reqDate:{
        type:Date,
        required:[true,"Please choose the date the blood is needed"]
    },
    // One profile carries one active request, and a single confirmed donor covers it, so the
    // quantity is capped at what one donor can reasonably be asked for. 1 or 2 units is the
    // recommendation; 3 is the ceiling. More than that means a separate profile.
    bloodUnits:{
        type:Number,
        required:true,
        default:1,
        min:[1,"Request at least 1 unit of blood"],
        max:[MAX_BLOOD_UNITS,`A single request can ask for at most ${MAX_BLOOD_UNITS} units`]
    },
    hospitalInfo:String,
    note:String,
    isCritical:{
        type:Boolean,
        default:true
    },
    isDonorFinded:{
        type:Boolean,
        default:false
    },
    // The one request whose donor this recipient has confirmed, or null when still
    // choosing. Confirming flips this from null to the request id in a single atomic
    // update, which is what stops a recipient confirming several donors at once.
    confirmedRequestId:{
        type:mongoose.Types.ObjectId,
        ref:'Requests',
        default:null
    },
    // Derived from reqDate: the end of the blood-needed day in IST. Replaces the old 30 day
    // TTL on createdAt, which deleted documents unconditionally and left no history. It has
    // no default on purpose - the deadline is the date the recipient chose, never a guess, so
    // the hook below is the only thing that sets it on a create or a save, and the controller
    // sets it explicitly on updates, which do not run document hooks.
    expiresAt:{
        type:Date,
        required:[true,"Please choose the date the blood is needed"]
    },
    isExpired:{
        type:Boolean,
        default:false
    },
    // Which round this request is on. One profile carries one ReqBlood document, and
    // resubmitting after an expiry reuses it rather than creating a new one, so without a
    // counter every round would share one identity and the archive could only keep the first.
    // Incremented by the resubmit path in recipientController; never reset.
    cycle:{
        type:Number,
        default:0
    },
    // Set once a donation against this request completes. A fulfilled request is finished for
    // good: it attracts no new donors, is not expired by the sweeper, and cannot be reopened
    // by editing the form. A recipient who needs more blood after this uses another profile.
    isFulfilled:{
        type:Boolean,
        default:false
    },
    fulfilledAt:{
        type:Date,
        default:null
    },
    // The donor (User id) whose donation fulfilled this request, kept for history.
    fulfilledBy:{
        type:mongoose.Types.ObjectId,
        ref:'User',
        default:null
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
},{timestamps:true})

// expiresAt is always the end of the blood-needed day in IST. Kept in a hook so a direct
// create or save cannot produce a document whose deadline disagrees with its reqDate; the
// controller sets it explicitly on updates, which do not run document hooks.
reqBloodSchema.pre('validate', function(next){
    if(this.reqDate) this.expiresAt = endOfDayIST(this.reqDate)
    next()
})

reqBloodSchema.index({isExpired:1, expiresAt:1})
reqBloodSchema.index({isFulfilled:1})

const ReqBlood = mongoose.model("ReqBlood",reqBloodSchema)
export default ReqBlood