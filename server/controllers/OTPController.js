import nodemailer from 'nodemailer'
import OTP from '../model/OTP.js'
import bcrypt from 'bcryptjs'
import User from './../model/User.js'
import Requests from '../model/Request.js' 
import Completed from '../model/Completed.js'
import { getUserSocket, io } from '../config/socket.js'

const transporter = nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.USER_ACCOUNT,
        pass:process.env.PASSWORD,
    }
})
function get90thDayFromDate(date) {
    let givenDate = new Date(date); 
    givenDate.setDate(givenDate.getDate() + 90);  
    return givenDate.toISOString().split('T')[0];  
}

export const sendOTP = async(req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params
    const {email} = req.body

    const request = await Requests.findOne({_id:requestId,donorId:userId, status:"confirmed"})
    if(!request) return res.status(404).json({message:"request not found, cant send otp"})
    // const otpExists = await OTP.findOne({userId})
    // if(otpExists) return res.status(400).json({message:"otp already sent wait for 2 minutes"})
    const generatedOTP = `${Math.floor(100000 + Math.random()*900000)}` 
    try{
        // const mailOptions = {
        //     from:'"Blood Donation App" <973ae0001@smtp-brevo.com>',
        //     to:email,
        //     subject:"verify with OTP",
        //     html:`<div><h1>Gces Blood Line</h1><p>Your OTP is: ${generatedOTP}. It is valid for 2 minutes.</p></div>`, 
        // }
        // await transporter.sendMail(mailOptions) 
        const salt = await bcrypt.genSalt(10)
        const hashedOtp = await bcrypt.hash(generatedOTP, salt) 
        const otpDetail = await OTP.create({
            userId:userId,
            otp:hashedOtp,
            createdAt:Date.now(),
            expiresAt:Date.now()+120000
        }) 
        res.status(200).json({
            otpDetail: generatedOTP,
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

export const verifyOTP = async(req, res)=>{
    const {_id:userId} = req.user
    const {id:requestId} = req.params
    const {otp} = req.body 

    if(!userId) return res.status(401).json({message: "Unauthorized User"})
    const requestCheck = await Requests.findOne({_id:requestId,donorId:userId, status:"confirmed"})
    if(!requestCheck) return res.status(404).json({message:"request not found, cant verify otp with that request"}) 
    if(!otp) return res.status(400).json({message: "please enter otp"})
    if(otp.length !== 6 || !/^\d{6}$/.test(otp)) return res.status(400).json({message:"Invalid OTP"})
    try{
        const users = await OTP.find({userId,status:"pending"}).sort('-createdAt')
        if(users.length<=0) {return res.status(400).json({message:"please send otp and verify !"})}
        else{ 
            const expires = users[0].expiresAt
            if(Date.now() < expires){
                const isVerified = await bcrypt.compare(otp, users[0].otp)
                if(isVerified){
                    const lastDonationDate = new Date(Date.now()).toISOString().split('T')[0];
                    const nextDonationDate = get90thDayFromDate(lastDonationDate); 
                    const user = await User.findOneAndUpdate({_id:userId}, {$inc :{donation: 1},available:false,lastDonated:lastDonationDate,nextDonationDate:nextDonationDate},{new: true, runValidators: true})
                    const request = await Requests.findOneAndUpdate({_id:requestId,status:"confirmed"},{status:"finalState"},{new:true})
                    if(!request) return res.status(404).json({message:"request not found"})  
                    await Completed.create({_id:request._id, donorId: request.donorId, recipientId:request.recipientId, status:request.status})
                    const receiverSocketId = getUserSocket(request.recipientId)
                    io.to(receiverSocketId).emit("otpverified")
                    res.status(200).json({
                        status:"VERIFIED",
                        message:"otp verified"
                    }) 
                    await OTP.deleteMany({userId})
                    // await Requests.deleteOne({_id:requestId,status:"finalState"})
                }else{ 
                    res.status(200).json({
                        status:"PENDING",
                        message:"otp Incorrect"
                    }) 
                } 
            }else{ 
                res.status(200).json({
                    status:"EXPIRED",
                    message:"otp expired"
                })
                await OTP.deleteMany({userId}) 
            } 
        }
    }catch(err){
        res.status(500).json({err}) 
        console.log(err) 
    }
}

// export const sendMailToDonor = async(req, res)=>{ 
//     const {email} = req.body 
//     try{
//         const mailOptions = {
//             from:process.env.USER_ACCOUNT,
//             to:email,
//             subject:"Incoming Request",
//             // html:`<div><h1>Gces Blood Line</h1><p>Your OTP is: ${generatedOTP}. It is valid for 5 minutes.</p></div>`,
//             text: `one blood donation request for you`
//         }
//         await transporter.sendMail(mailOptions)

//     }catch(err){
//         res.status(400).json({
//             status:"failed",
//             message:"Please try again later",
//             error:err
//         }) 
//     }
// }