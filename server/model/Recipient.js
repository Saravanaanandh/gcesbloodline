import mongoose from "mongoose"; 

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
    pinCode:{
        type:Number,
        required:true
    },
    reqDate:{
        type:Date,
        default:Date.now(), 
    },
    bloodUnits:{
        type:Number,
        required:true,
        default:1
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
    createdAt:{
        type:Date,
        default:Date.now,
        expires:30*24*60*60
    },
},{timestamps:true})

const ReqBlood = mongoose.model("ReqBlood",reqBloodSchema)
export default ReqBlood