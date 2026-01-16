
import mongoose from "mongoose";

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
    status:{
        type:String, 
        enum:["prepending","accepted","rejected","pending","confirmed","finalState"],
        default:"prepending", 
    },
    createdAt:{
        type:Date,
        default:Date.now,
        expires:30*24*60*60
    }
},{timestamps:true})

const Requests = mongoose.model('Requests',requestSchema)
export default Requests