import bcrypt from 'bcryptjs'
import cloudinary from '../config/cloudinary.js'
import { getUserSocket, io } from '../config/socket.js'
import OTPPasswordReset from '../model/OTPforPasswordReset.js'
import User from './../model/User.js' 


const isProduction = process.env.NODE_ENV === "production";

const getCookieOptions = (req) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || (isProduction && !req.headers.host?.includes('localhost'));
    return {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: isHttps,
        sameSite: isHttps ? "none" : "lax"
    };
};

const getClearCookieOptions = (req) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || (isProduction && !req.headers.host?.includes('localhost'));
    return {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? "none" : "lax"
    };
};

export const signupController = async (req, res)=>{
    const {username,age, gender, bloodType,location,pinCode,mobile, email, password} = req.body 
    if(!username || !email || !gender || !password || !age || !bloodType || !location || !pinCode || !mobile) return res.status(400).json({message:"please fill required fields"})
    try{ 
        const duplicateUser = await User.findOne({email})
        if(duplicateUser) return res.status(409).json({message:"user already with that email"})
         
        const user = await User.create({...req.body})
        const token = user.createJWT() 
        user.token = token 

        res.cookie('jwt', token, getCookieOptions(req))
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

    res.cookie('jwt', token, getCookieOptions(req))
    res.status(200).json(user)
}

export const updateProfileController = async (req, res)=>{
    const {location, available, profile, banner, tattooIn12, pinCode, mobile, positiveHIVTest, weight, age, bloodType, gender, username} = req.body
    try{
        const user = req.user
        if(!user) return res.status(401).json({message:"unauthorized User"}) 
        
        const updateFields = {}
        if (username !== undefined && username !== null && username.trim() !== "") updateFields.username = username.trim()
        if (location !== undefined && location !== null && location !== "") updateFields.location = location
        if (available !== undefined && available !== null) updateFields.available = available
        if (tattooIn12 !== undefined && tattooIn12 !== null) updateFields.tattooIn12 = tattooIn12
        if (positiveHIVTest !== undefined && positiveHIVTest !== null) updateFields.positiveHIVTest = positiveHIVTest
        if (pinCode !== undefined && pinCode !== null && pinCode !== "") updateFields.pinCode = Number(pinCode)
        if (mobile !== undefined && mobile !== null && mobile !== "") updateFields.mobile = Number(mobile)
        if (weight !== undefined && weight !== null && weight !== "") updateFields.weight = Number(weight)
        if (age !== undefined && age !== null && age !== "") updateFields.age = Number(age)
        if (bloodType !== undefined && bloodType !== null && bloodType !== "") updateFields.bloodType = bloodType
        if (gender !== undefined && gender !== null && gender !== "") updateFields.gender = gender

        let updatedUser = user
        if (Object.keys(updateFields).length > 0) {
            updatedUser = await User.findOneAndUpdate(
                {email:user.email},
                {$set: updateFields},
                {new:true, runValidators:true}
            )
        }
            
        if(profile){
            const uploadedResponse = await cloudinary.uploader.upload(profile)
            updatedUser = await User.findOneAndUpdate({email:user.email},{$set: {profile:uploadedResponse.secure_url}},{new:true})
        }
        if(banner){
            const uploadedResponse = await cloudinary.uploader.upload(banner)
            updatedUser = await User.findOneAndUpdate({email:user.email},{$set: {banner:uploadedResponse.secure_url}},{new:true})
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

    res.clearCookie('jwt', getClearCookieOptions(req))
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

export const sendOTPForPasswordReset = async(req, res)=>{
    const {email} = req.body
    if(!email) return res.status(400).json({message:"please provide email"})
    const user = await User.findOne({email})
    if(!user) return res.status(404).json({message:"user not found with that email"})
    const generatedOTP = `${Math.floor(100000 + Math.random()*900000)}` 
    try{ 
        const salt = await bcrypt.genSalt(10)
        const hashedOtp = await bcrypt.hash(generatedOTP, salt) 
        const OTP = await OTPPasswordReset.create({
            userId:user._id,
            otp:hashedOtp,
            createdAt:Date.now(),
            expiresAt:Date.now()+300000
        }) 
        res.status(200).json({
            otp: generatedOTP,
            email
        })
    }catch(err){
        console.log(err)
        res.status(500).json({ 
            message:"Please try again later",
            error:err
        })  
    }
}

export const verifyOTPForPasswordReset = async(req, res)=>{
    const {email, otp} = req.body
    if(!email || !otp) return res.status(400).json({message:"please provide required fields"})
    const user = await User.findOne({email})
    if(!user) return res.status(404).json({message:"user not found with that email"})
    const validOTP = await OTPPasswordReset.findOne({userId:user._id}).sort({createdAt:-1}) 
    if(!validOTP) return res.status(400).json({message:"please request for OTP again"}) 
    if(validOTP.expiresAt < Date.now()) return res.status(400).json({message:"OTP expired, please request for new OTP"})
    const isOtpMatch = await bcrypt.compare(otp, validOTP.otp)
    if(!isOtpMatch) return res.status(400).json({message:"invalid OTP, please try again"})
    OTPPasswordReset.deleteMany({userId:user._id})
    res.status(200).json({message:"OTP verified successfully"})
}

export const resetPasswordController = async(req, res)=>{
    const {email, password} = req.body
    if(!email || !password) return res.status(400).json({message:"please provide required fields"})
    const user = await User.findOne({email})
    if(!user) return res.status(404).json({message:"user not found with that email"}) 
    user.password = password
    await user.save()
    res.status(200).json({message:"password reset successfully"}) 
}