import mongoose from 'mongoose'

const completeSchema = mongoose.Schema({
    _id:{
        type:mongoose.Types.ObjectId,
        required:true
    },
    donorId:{
        type:mongoose.Types.ObjectId,
        required:true
    },
    recipientId:{
        type:mongoose.Types.ObjectId,
        required:true
    },
    status:{
        type:String,
        required:true
    }
},{timestamps:true})

const Completed = mongoose.model('Completed',completeSchema)
export default Completed