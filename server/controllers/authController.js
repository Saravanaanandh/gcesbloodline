import cloudinary from '../config/cloudinary.js'
import { getUserSocket, io } from '../config/socket.js'
import User from './../model/User.js' 


export const signupController = async (req, res)=>{
    const {username,age, gender, bloodType,location,pinCode,mobile, email, password} = req.body 
    if(!username || !email || !gender || !password || !age || !bloodType || !location || !pinCode || !mobile) return res.status(400).json({message:"please fill required fields"})
    try{ 
        const duplicateUser = await User.findOne({email})
        if(duplicateUser) return res.status(409).json({message:"user already with that email"})
         
        const user = await User.create({...req.body})
        const token = user.createJWT() 
        user.token = token 

        res.cookie('jwt',token,{httpOnly:true,maxAge:30*24*60*60*1000, secure:true, sameSite:"None"})
        res.status(201).json(user) 
    }catch(err){
        res.status(400).json({message:err.name})
    }
}

export const loginController = async (req, res)=>{
    const {email, password} = req.body 
    if(!email || !password) return res.status(400).json({message:"please fill required fields"})

    const user = await User.findOne({email})
    if(!user) return res.status(404).json({message:"user not found with that email"})
    
    const passwordMatch = await user.comparePassword(password)
    if(!passwordMatch) return res.status(401).json({message:"Incorrect Password"})

    const token = user.createJWT()
    user.token = token

    res.cookie('jwt',token,{httpOnly:true,maxAge:30*24*60*60*1000, secure:true, sameSite:"none"})
    res.status(200).json(user)
}

export const updateProfileController = async (req, res)=>{
    const {location, available, profile, banner, tattooIn12, pinCode, mobile, positiveHIVTest,weight} = req.body
    try{
        const user = req.user
        if(!user) return res.status(401).json({message:"unauthorized User"}) 
        let updatedUser = await User.findOneAndUpdate({email:user.email},{location, available, tattooIn12, pinCode, mobile, positiveHIVTest,weight},{new:true,runValidators:true})
            
        if(profile){
            const uploadedResponse = await cloudinary.uploader.upload(profile)
            updatedUser = await User.findOneAndUpdate({email:user.email},{profile:uploadedResponse.secure_url},{new:true})
        }
        if(banner){
            const uploadedResponse = await cloudinary.uploader.upload(banner)
            updatedUser = await User.findOneAndUpdate({email:user.email},{banner:uploadedResponse.secure_url},{new:true})
        } 
        const newUser = updatedUser  
        res.status(200).json(newUser)  
        io.emit("updateProfile", newUser)  
    }catch(err){
        if(err.name === "ValidationError"){
            return res.status(400).json({message:"please provide the valid details"})
        }
        console.log(err)
        res.status(500).json({message:err.name})
    }
}

export const logoutController = async (req, res)=>{
    const {email} = req.user

    const user = await User.findOne({email}) 
    if(!user) return res.status(404).json({message:"user not found"}) 
    user.token = ""

    res.clearCookie('jwt',{httpOnly:true, secure:true, sameSite:"None"})
    res.status(204).json({message:"user logout successfully"})
} 

export const getUserProfile = async(req, res)=>{
    const {_id:userId} = req.user;

    if(!userId) return res.status(401).json({message:"unauthorized user"})

    const user = await User.findOne({_id:userId})
    if(!user) return res.status(403).json({message:"forbidden"})

    res.status(200).json(user)
    io.emit("getProfile", user)
}

export const checkAuth = async(req, res)=>{
    if(!req?.user) return res.status(401).json({message:"unauthorized user"})  
    const userSocket = getUserSocket(req.user._id)
    io.to(userSocket).emit("checkAuth", req.user)
    res.status(200).json(req.user)
}