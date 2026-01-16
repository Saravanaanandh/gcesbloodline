 
import Requests from '../model/Request.js'
import User from '../model/User.js'
import ReqBlood from '../model/Recipient.js' 
import { io } from '../config/socket.js'

export const createRecipients = async (req, res)=>{
    const {_id:userId} = req.user

    if(!userId) return res.status(401).json({message:"unauthorized user"});

    try{
        const existingRecipient = await ReqBlood.findOne({recipientId:userId})
        if(existingRecipient){
            const updatedRecipient = await ReqBlood.findOneAndUpdate({recipientId:userId},{...req.body},{new:true})
            io.emit("newrecipient",updatedRecipient)
            res.status(201).json(updatedRecipient) 
        }else{
            const recipient = await ReqBlood.create({...req.body,recipientId:userId})
            const user = await User.findByIdAndUpdate(userId,{recipientId:recipient._id},{new:true}) 
            io.emit("newrecipient",recipient)
            res.status(201).json(recipient)  
        }
    }catch(err){
        if(err.name === "ValidationError"){
            return res.status(400).json({message:"please provide the valid details"})
        }
        res.status(500).json({message:err.name})
    }
}

export const getAllRecipients = async(req, res)=>{
    const {_id:userId} = req.user
    if(!userId) return res.status(400).json({message:"Invalid User Id"})

    const recipients = await ReqBlood.find({recipientId:{$ne: userId, $exists:true}})
    if(!recipients) return res.status(200).json({message:"No recipients are there"}) 
        
    const recipientProfile = await Promise.all(
        recipients.map(recipient => User.findOne({_id:recipient.recipientId}).select('-password'))
    );  
    const requests = await Promise.all(
        recipients.map(recipient => Requests.findOne({recipientId:recipient.recipientId,donorId:userId}))
    ); 
    io.emit("allrecipients",{recipients,recipientProfile,requests,count:recipients.length})
    res.status(200).json({recipients,recipientProfile,requests,count:recipients.length})
}
export const getSingleRecipient = async(req, res)=>{
    const {_id:id} = req.user
    const {id:recipientId} = req.params
    const userId = id.toString()
    if(!userId) return res.status(400).json({message:"Invalid User Id"})
    const recipientDetail = await ReqBlood.findById(recipientId)
    if(!recipientDetail) return res.status(400).json({message:"recipient not found"})
    const recipientProfile = await User.findOne({recipientId}).select('-password') 
    const request = await Requests.findOne({recipientId:recipientDetail.recipientId,donorId:userId})
    console.log(userId, recipientId)//new ObjectId('689b338ff323e34ce2141778') 689b3514f323e34ce2141798
    io.emit('getrecipient',{recipientDetail,request,recipientProfile})
    res.status(200).json({recipientDetail,request,recipientProfile}) 
}

export const deleteRecipient = async (req, res)=>{
    const {_id:userId} = req.user
    if(!userId) return res.status(401).json({message:"Unauthorized User"})

    try{
        const recipient = await ReqBlood.findOne({recipientId:userId})
        if(!recipient) return res.status(404).json({message:"You're not a recipient"})
        await ReqBlood.findOneAndDelete({recipientId:userId})
        await User.findOneAndUpdate({_id:userId},{$unset: {recipientId: ""}})
        res.status(200).json({message:"recipient was deleted"})
    }catch(err){
        res.status(500).json({message:"cant delete try again later"})
    }
}
