import mongoose from "mongoose";

const OTPforPasswordReset = new mongoose.Schema({
    userId:{
        type:mongoose.Types.ObjectId,
        ref:'User',
        required:true
    },  
    otp:String,
    createdAt:Date,
    expiresAt:Date
})

const OTPPasswordReset = mongoose.model('OTPPasswordReset',OTPforPasswordReset)
export default OTPPasswordReset