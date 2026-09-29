import bcrypt from 'bcryptjs'
import cloudinary from '../config/cloudinary.js'
import { getUserSocket, io } from '../config/socket.js'
import OTPPasswordReset from '../model/OTPforPasswordReset.js'
import User from './../model/User.js'
import Donor from './../model/Donar.js'
import { verifyPinCodeLocation } from '../utils/pincode.js'
import { getClearCookieOptions, getCookieOptions } from '../utils/cookieOptions.js'

// Signup now runs through email verification and lives in controllers/signupController.js: there
// is no longer an endpoint that creates an account and issues a cookie in one unverified step.

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

    // The password hash does not belong in a response body, not even the account's own: it is one
    // XSS or one logged response away from being cracked offline.
    const profile = user.toObject()
    delete profile.password
    res.status(200).json(profile)
}

export const updateProfileController = async (req, res)=>{
    const {location, place, available, profile, banner, tattooIn12, pinCode, mobile, positiveHIVTest, weight, age, bloodType, gender, username} = req.body
    try{
        const user = req.user
        if(!user) return res.status(401).json({message:"unauthorized User"})

        const updateFields = {}
        if (username !== undefined && username !== null && username.trim() !== "") updateFields.username = username.trim()
        if (available !== undefined && available !== null) updateFields.available = available
        if (tattooIn12 !== undefined && tattooIn12 !== null) updateFields.tattooIn12 = tattooIn12
        if (positiveHIVTest !== undefined && positiveHIVTest !== null) updateFields.positiveHIVTest = positiveHIVTest
        if (mobile !== undefined && mobile !== null && mobile !== "") updateFields.mobile = Number(mobile)

        // pincode, district and place only make sense as a verified triple, so any
        // change to one of them is re-checked against India Post using the user's
        // existing values to fill the gaps.
        const touchesLocation = [location, place, pinCode].some(v => v !== undefined && v !== null && v !== "")
        if (touchesLocation) {
            const effectivePin = (pinCode !== undefined && pinCode !== null && pinCode !== "") ? pinCode : user.pinCode
            const effectiveDistrict = (location !== undefined && location !== null && location !== "") ? location : user.location
            const effectivePlace = (place !== undefined && place !== null && place !== "") ? place : user.place

            const verified = await verifyPinCodeLocation(effectivePin, effectiveDistrict, effectivePlace)
            if (!verified.ok) return res.status(400).json({message: verified.message})

            updateFields.pinCode = Number(effectivePin)
            updateFields.location = verified.district
            updateFields.place = verified.place
        }
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
        // Ids only. This used to broadcast the whole user document - email, mobile number, weight,
        // HIV test answer, and the bcrypt password hash - to every connected client every time
        // anybody saved their profile. Listeners re-fetch the profile they are showing instead.
        io.emit("updateProfile", {userId:newUser?._id})
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

    const user = await User.findOne({_id:userId}).select('-password')
    if(!user) return res.status(403).json({message:"forbidden"})

    // After a donation the donor has to refill the eligibility form before accepting
    // requests again. The profile needs to know whether that has happened, and only the
    // donor record carries the timestamp, so the answer is derived here.
    const donor = await Donor.findOne({donorId:userId}).select('updatedAt')
    const eligibilityFormCurrent = !user.lastDonated
        ? Boolean(donor)
        : Boolean(donor && donor.updatedAt > new Date(user.lastDonated))

    const profile = {...user.toObject(), eligibilityFormCurrent}
    // No broadcast. This used to io.emit the caller's own profile - email, mobile, weight, health
    // answers - to every connected client, and nothing was listening for it.
    res.status(200).json(profile)
}

export const checkAuth = async(req, res)=>{
    if(!req?.user) return res.status(401).json({message:"unauthorized user"})
    // guarded: io.to(undefined) throws, and a user can hit this endpoint before their socket
    // has connected or after it has dropped
    const userSocket = getUserSocket(req.user._id)
    if(userSocket) io.to(userSocket).emit("checkAuth", req.user)
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