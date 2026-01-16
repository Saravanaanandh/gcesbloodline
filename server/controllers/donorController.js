import { io } from '../config/socket.js'
import Requests from '../model/Request.js'
import Donor from './../model/Donar.js'
import User from './../model/User.js' 


export const createDonor = async (req, res)=>{
    const {_id:userId} = req.user 
    if(!userId) return res.status(401).json({message:"unauthorized user"})

    try{
        const existingDonor = await Donor.findOne({donorId:userId})
        if(existingDonor){
            const updatedDonor = await Donor.findOneAndUpdate({donorId:userId},{...req.body},{new:true})  
            io.emit("newdonor",updatedDonor)
            res.status(201).json(updatedDonor) 
        }else{
            const donor = await Donor.create({...req.body,donorId:userId}) 
            const user = await User.findByIdAndUpdate(userId, {donorId:donor._id,available:true},{new:true}) 
            io.emit("newdonor",donor)
            res.status(201).json(donor)  
        }
    }catch(err){
        if(err.name === "ValidationError"){
            return res.status(400).json({message:"please provide the valid details"})
        }
        res.status(500).json({message:err.name})
    }
}

export const getAllDonars = async(req, res)=>{

    const {_id:userId} = req.user  
    if(!userId) return res.status(401).json({message:"unauthorized user"})

    const donors = await Donor.find({donorId :{$ne: userId, $exists:true}}) 
    if(!donors) return res.status(200).json({message:"no donors available"})  
    const donorDetails = await Promise.all(
        donors.map(donor => User.findOne({ _id: donor.donorId }).select('-password'))
    );
    const requestDetails = await Promise.all(
        donors.map(donor => Requests.findOne({donorId:donor.donorId,recipientId:userId}))
    );  
    io.emit("allDonors",{donors,requestDetails,donorDetails,count:donors.length}) 
    res.status(200).json({donors,donorDetails,requestDetails,count:donors.length})
}

export const getDonar = async (req, res)=>{
    const {_id:userId} = req.user 
    const {id:donorId} = req.params

    if(!userId) return res.status(400).json({message:"unauthorized user"})
    if(!donorId) return res.status(400).json({message:"donar id not valid"})
     
    else{
        try{
            const donor = await Donor.findById(donorId)
            if(!donor) return res.status(200).json({message:"donar not found"}) 
            const donorDetail = await User.findOne(donor.donorId) 
            const requestDetail = await Requests.findOne({donorId:donor.donorId,recipientId:userId})
            res.status(200).json({donor,donorDetail,requestDetail}) 
            io.emit("getDonor",{donor,donorDetail,requestDetail})
        }catch(err){
            if(err.name === "CastError"){
                res.status(400).json({message:"ObjectId not valid"}) 
            }else{
                res.status(400).json({message:err.message})  
            }
        }  
    }
}

export const deleteDonar = async (req, res)=>{
    const {_id:userId} = req.user   
    if(!userId) return res.status(400).json({message:"unauthorized user"}) 
    try{
        const donor = await Donor.findOne({donorId:userId})
        if(!donor) return res.status(404).json({message:"You're not a donor"})
        await Donor.findOneAndDelete({donorId:userId}) 
        await User.findByIdAndUpdate(userId,{ $unset: { donorId: "" } })
        res.status(200).json({message:"Donor was deleted"}) 
    }catch(err){ 
        res.status(400).json({message:err})   
    }   
}
