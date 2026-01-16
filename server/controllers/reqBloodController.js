
import Completed from '../model/Completed.js'
import Donor from '../model/Donar.js'
import Requests from '../model/Request.js'
import User from '../model/User.js'
import ReqBlood from '../model/Recipient.js' 
import nodemailer from 'nodemailer'
import mongoose from 'mongoose'
import DeletedReq from '../model/Deleted.js'
import { getUserSocket } from '../config/socket.js'
import { io } from '../config/socket.js'
import { Resend } from "resend";

export const sendRequest = async(req, res)=>{
    const {_id:recipientId} = req.user
    const {id:donorId} = req.params  
    if(!recipientId) return res.status(401).json({message:"unauthorized user"})
    if(!req.user.recipientId || !mongoose.isValidObjectId(req.user.recipientId)) return res.status(400).json({message:"You're not a recipient, so cant send request"})
    try{
        const donor = await Donor.findOne({donorId})
        if(!donor) return res.status(404).json({message:"Donor not found"})

        if(recipientId === donorId) return res.status(400).json({message:"cant send request"})

        const existingRequest = await Requests.findOne({recipientId, donorId, status:{$ne:"finalState"}})
        if(existingRequest) return res.status(200).json({message:"already request was sent to donor!"})

        const request = await Requests.create({recipientId, donorId}) 
 
        const recipient = await User.findOne({_id:recipientId})
        const recipientDetail = await ReqBlood.findOne({recipientId}) 
        const donorDetail = await User.findOne({donorId: donor._id})
        const redirectPage = `https://blood-donation-o7z9.onrender.com/allrequests/${recipientDetail._id}`

        // const transporter = nodemailer.createTransport({
        //     service:'gmail',
        //     auth:{
        //         user:process.env.USER_ACCOUNT,
        //         pass:process.env.PASSWORD,
        //     }
        // })
        // const mailOptions = {
        //     from: '"Blood Donation App" <973ae0001@smtp-brevo.com>',
        //     to: donorDetail.email,
        //     subject:`🩸 Urgent Blood Donation Request from ${donorDetail.username}`,
        //     html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        //             <h1 style="color: #d32f2f; text-align: center;">
        //                 🩸 GCES Blood Line
        //             </h1>
        //             <p>
        //                 Hello <strong>${donorDetail.username}</strong>,
        //             </p>
        //             <p>You have received a <strong>Blood Donation Request</strong> from <strong>${recipient.username}</strong>.</p>
        //             <p><strong>Your small act of kindness can save a precious life! 💖</strong></p>
        //             <p style="display:flex; flex-direction:column; gap:10px;">
        //                 <strong>Additional Message from Requester:</strong>
        //             </p>
        //             <p style="width:100%; min-height:100px; border:1px solid black; border-radius:5px; padding:5px; margin:5px;">${recipientDetail.note}</p>
        //             <p style="text-align: center; margin-top: 20px;">
        //                 <a href=${redirectPage}
        //                     style="background-color: #d32f2f; color: white; margin:20px auto; padding: 10px 20px; 
        //                     text-decoration: none; border-radius: 5px; font-weight: bold;">
        //                     View Request
        //                 </a>
        //             </p>
        //             <p>Thank you for being a Life-Saver! 💉🩸</p>
        //         </div>` 
        // } 
        const receiverSocketId = getUserSocket(donorDetail._id)
        if(receiverSocketId) io.to(receiverSocketId).emit("requestsent", request)
        res.status(200).json(request)
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid donor id"})
        }
        res.status(404).json({message:err.name})
    }
}



export const getAllRequests = async (req, res)=>{
    const {_id:userId,donorId,recipientId} = req.user 
    if(!userId) return res.status(400).json({message:"Unauthorized user"})

    if(!donorId && !recipientId) return res.status(400).json({message:"You're neither a donor nor a recipient, so no requests come to you"})

    const requests = await Requests.find({$or:[{donorId:userId},{recipientId:userId}]})
    if(!requests) return res.status(200).json({message:"no requests"}) 
    
    const donorProfile = await Promise.all(
        requests.map(request => User.findOne({_id:request.donorId}).select('-password'))
    ); 
    const recipientProfile = await Promise.all(
        requests.map(request => User.findOne({_id:request.recipientId}).select('-password'))
    );  
    res.status(200).json({requests,donorProfile,recipientProfile,count:requests.length})
}

export const getRequest = async (req, res)=>{
    const {_id:userId,donorId, recipientId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!donorId && !recipientId) return res.status(400).json({message:"You're neither a donor nor a recipient, so no requests come to you"})
    if(!requestId) return res.status(400).json({message:"No requests found"}) 

    try{
        const request = await Requests.findOne({_id:requestId}) 
        if(!request) return res.status(400).json({message:"Request does not exists"})
        const recipientDetail = await ReqBlood.findOne({recipientId:request.recipientId}) 
        if(!recipientDetail) return res.status(404).json({message:"recipient not found"}) 
        const donor = await Donor.findOne({donorId:request.donorId})  
        const donorDetail = await User.findOne({_id:request.donorId}).select('-password')  
        res.status(200).json({request,recipientDetail,donor, donorDetail}) 
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

export const acceptReq = async (req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params
 
    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!requestId) return res.status(400).json({message:"recipient id invalid"})
    try{
        const request = await Requests.findOneAndUpdate({_id:requestId,recipientId:{$ne: userId},status:"prepending"},{status:"accepted"},{new:true})
        if(!request) return res.status(404).json({message:"request not found"}) 
        const receiverSocketId = getUserSocket(request.recipientId)
        if(receiverSocketId) io.to(receiverSocketId).emit("acceptrequest",request)
        res.status(200).json(request)
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

export const confirmReq = async (req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!requestId) return res.status(400).json({message:"request Not found"})
    try{
        const request = await Requests.findOneAndUpdate({_id:requestId,donorId:{$ne: userId},status:"accepted"},{status:"pending"},{new:true}) 
        if(!request) return res.status(404).json({message:"request not found"})   
        const receiverSocketId = getUserSocket(request.donorId)
        if(receiverSocketId) io.to(receiverSocketId).emit("confirmrequest",request)
        res.status(200).json(request)
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

export const confirmedReq = async (req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!requestId) return res.status(400).json({message:"request Not found"})
    try{
        const request = await Requests.findOneAndUpdate({_id:requestId,recipientId:{$ne: userId},status:"pending"},{status:"confirmed"},{new:true}) 
        if(!request) return res.status(404).json({message:"request not found"}) 
        await ReqBlood.findOneAndUpdate({recipientId: request.recipientId},{isDonorFinded:true}, {new:true}) 
        const receiverSocketId = getUserSocket(request.recipientId)
        if(receiverSocketId) io.to(receiverSocketId).emit("confirmedrequest",request)
        res.status(200).json(request)
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

export const rejectReq = async (req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!requestId) return res.status(400).json({message:"request Not found"})

    try{
        const request = await Requests.findOneAndUpdate({_id:requestId, $or:[{status:"prepending"},{status:"accepted"}]},{status:"rejected"},{new:true})
        console.log(request)
        if(!request) return res.status(404).json({message:"request not found"})
        await Completed.create({_id:request._id, donorId: request.donorId, recipientId:request.recipientId, status:request.status})
        await Requests.deleteOne({_id:requestId,status:"rejected"})
        await ReqBlood.findOneAndUpdate({recipientId: request.recipientId},{isDonorFinded:false}, {new:true}) 
        const receiverSocketId = getUserSocket(request.recipientId)
        const senderSocketId = getUserSocket(request.donorId)
        if(receiverSocketId && senderSocketId) io.to([receiverSocketId,senderSocketId]).emit("rejectrequest")
        res.status(200).json(request)
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

export const rejectAcceptedReq = async (req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    if(!requestId) return res.status(400).json({message:"request Not found"})

    try{
        const request = await Requests.findOneAndUpdate({_id:requestId, status:"pending"},{status:"rejected"},{new:true})
        if(!request) return res.status(404).json({message:"request not found"})
        await Completed.create({_id:request._id, donorId: request.donorId, recipientId:request.recipientId, status:request.status})
        await Requests.deleteOne({_id:requestId,status:"rejected"})
        await ReqBlood.findOneAndUpdate({recipientId: request.recipientId},{isDonorFinded:false}, {new:true}) 
        const receiverSocketId = getUserSocket(request.recipientId)
        
        if(receiverSocketId) io.to(receiverSocketId).emit("rejectaccrequest",request)
        res.status(200).json(request)
    }catch(err){
        if(err.name === "CastError"){
            return res.status(400).json({message:"please provide the valid recipient id"})
        }
        res.status(404).json({message:err.name})
    }
}

export const deleteRequest = async(req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params

    if(!userId) return res.status(400).json({message:"Unauthorized User"})
    try{
        const request = await Requests.findOne({_id:requestId,recipientId:userId})
        if(!request) return res.status(400).json({message:"request only deleted by recipient"})
        const deletedReq = await Requests.findOneAndDelete({_id:requestId, recipientId:userId,status:{$ne:"confirmed"}})
        if(!deletedReq) return res.status(404).json({message:"request cant be deleted, because it was confirmed"})
        await DeletedReq.create({_id:request._id, donorId: request.donorId, recipientId:request.recipientId, status:request.status})
        const receiverSocket = getUserSocket(deletedReq.donorId)
        if(receiverSocket) io.to(receiverSocket).emit("deleterequest")
        return res.status(200).json({message:"request was deleted!"})
    }catch(err){
        return res.status(500).json({message:"cant delete the request, try again later"})
    }
}

export const completedRequests = async(req, res)=>{
    const {_id:userId} = req.user
    if(!userId) return res.status(401).json({message:"Unauthorized user"})
    
    try{
        const requests = await Completed.find({$or:[{donorId:userId},{recipientId:userId}],status:"finalState"})
        const donorDetail = await Promise.all(
            requests.map(request => User.findById(request.donorId).select('-password')
        ))
        const recipientDetail = await Promise.all(
            requests.map(request => User.findById(request.recipientId).select('-password')
        ))
        res.status(200).json({requests, donorDetail, recipientDetail, count:requests.length})
    }catch(err){
        res.status(500).json({message:err.message})
    }
}
