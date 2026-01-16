import mongoose from 'mongoose'

const deleteSchema = mongoose.Schema({
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

const DeletedReq = mongoose.model('Delete', deleteSchema)
export default DeletedReq