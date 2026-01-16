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
},{timestamps:true})

const Donor = mongoose.model('Donor',donorSchema)
export default Donor