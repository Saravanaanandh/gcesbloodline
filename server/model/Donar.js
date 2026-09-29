import mongoose from "mongoose" 

const donorSchema = new mongoose.Schema({
    donorId:{
        type:mongoose.Types.ObjectId,
        ref:'User',
        required:true,
        unique:true
    }, 
    donatePre:{
        type:String,
        enum:["yes","no"],
        set:value => value.toLowerCase(),
        required:true
    },
    lastSixmonthActivity:{
        type:String,
        enum:["tattooing","piercing","dental extraction","affected by covid","heavy fever","no"],
        set:value => value.toLowerCase(),
        required:true
    },
    // The one request this donor is currently committed to, or null when free.
    // Accepting a request flips this from null to the request id in a single atomic
    // update, which is what stops a donor from committing to two recipients at once.
    committedRequestId:{
        type:mongoose.Types.ObjectId,
        ref:'Requests',
        default:null
    },
},{timestamps:true})

const Donor = mongoose.model('Donor',donorSchema)
export default Donor