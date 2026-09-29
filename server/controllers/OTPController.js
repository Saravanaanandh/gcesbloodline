import nodemailer from 'nodemailer'
import OTP from '../model/OTP.js'
import bcrypt from 'bcryptjs'
import User from './../model/User.js'
import Requests from '../model/Request.js' 
import Completed from '../model/Completed.js'
import Donor from '../model/Donar.js'
import ReqBlood from '../model/Recipient.js'
import { getUserSocket, io } from '../config/socket.js'
import { DONATION_GAP_DAYS, getNextDonationDate, toDateOnly } from '../utils/donationWindow.js'
import { inSession, withTransaction } from '../utils/transaction.js'
import { archiveBloodRequest, markBloodRequestFulfilled } from '../utils/requestWorkflow.js'

const transporter = nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.USER_ACCOUNT,
        pass:process.env.PASSWORD,
    }
})

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

/**
 * Finalizes a donation exactly once.
 *
 * The whole thing hangs off one atomic conditional update: the request is moved from
 * "confirmed" to "finalState" with `status:"confirmed"` in the filter. MongoDB applies that
 * to a single document atomically, so out of any number of concurrent or repeated OTP
 * submissions exactly one gets a document back and every other one gets null. Only the
 * winner increments the donation count, so the count, the availability flag, the last
 * donation date and the Completed row are each written once.
 *
 * The remaining writes run inside a transaction where the deployment supports one, so a
 * crash midway cannot leave the request finalized but the donor's count unchanged. On a
 * standalone database they run without one, and the conditional update above still makes
 * the operation idempotent - that is the guarantee that actually prevents double counting.
 */
export const finalizeDonation = async (donorUserId, requestId)=>{
    const lastDonated = toDateOnly(Date.now())
    const nextDonationDate = getNextDonationDate(lastDonated)

    return await withTransaction(async (session)=>{
        const request = await Requests.findOneAndUpdate(
            {_id:requestId, donorId:donorUserId, status:"confirmed"},
            {status:"finalState", respondBy:null},
            {new:true, ...inSession(session)}
        )
        if(!request){
            // Either it was never confirmed, or another submission already finalized it. The
            // request's own status is checked first: it is flipped to finalState by the same
            // atomic update that lost, so it is already visible here, whereas the Completed
            // row is written a moment later and a loser arriving in between would otherwise
            // be told the request does not exist.
            const finalized = await Requests.findOne({_id:requestId, status:"finalState"}, null, inSession(session))
            if(finalized) return {ok:false, code:409, message:"This donation has already been completed"}
            const alreadyDone = await Completed.findOne({_id:requestId, status:"finalState"}, null, inSession(session))
            if(alreadyDone) return {ok:false, code:409, message:"This donation has already been completed"}
            return {ok:false, code:404, message:"request not found"}
        }

        const user = await User.findOneAndUpdate(
            {_id:donorUserId},
            {$inc:{donation:1}, available:false, lastDonated, nextDonationDate},
            {new:true, runValidators:true, ...inSession(session)}
        )

        // upsert rather than insert: Completed reuses the request id as its primary key, so
        // an insert would throw on any retry instead of being a no-op
        await Completed.updateOne(
            {_id:request._id},
            {$setOnInsert:{donorId:request.donorId, recipientId:request.recipientId, status:request.status}},
            {upsert:true, ...inSession(session)}
        )

        // The donation is over, so both sides are released from this request: the donor can
        // commit again once they are eligible, and the recipient can confirm another donor.
        await Donor.findOneAndUpdate(
            {donorId:request.donorId, committedRequestId:request._id},
            {committedRequestId:null},
            inSession(session)
        )
        // The requirement is met, so it is closed for good: fulfilled, no longer searching,
        // and the recipient's confirmation lock released. One conditional update does all
        // three, which is why a repeat submission cannot reopen or double-close it.
        const fulfilled = await markBloodRequestFulfilled(request.recipientId, request.donorId, session)

        // Archived here rather than at the call site, so that finalizing a donation and
        // preserving its history are one step: any caller of this function records both.
        const bloodRequest = fulfilled
            || await ReqBlood.findOne({recipientId:request.recipientId}, null, inSession(session))
        if(bloodRequest) await archiveBloodRequest(bloodRequest, "fulfilled")

        return {
            ok:true,
            request,
            bloodRequest,
            lastDonated:user?.lastDonated || lastDonated,
            nextDonationDate:user?.nextDonationDate || nextDonationDate,
        }
    })
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
                    const finalized = await finalizeDonation(userId, requestId)
                    if(!finalized.ok){
                        return res.status(finalized.code).json({message:finalized.message})
                    }

                    // finalizeDonation has already closed and archived the requirement
                    const bloodRequest = finalized.bloodRequest

                    const receiverSocketId = getUserSocket(finalized.request.recipientId)
                    if(receiverSocketId){
                        io.to(receiverSocketId).emit("otpverified")
                        // the recipient's own views switch to the fulfilled state right away
                        io.to(receiverSocketId).emit("bloodrequestfulfilled",{
                            bloodRequestId:bloodRequest?._id,
                            requestId:finalized.request._id
                        })
                    }
                    // Everybody else is browsing a directory that still lists this requirement,
                    // so a broadcast tells every client to refetch and drop it. Deliberately a
                    // separate event from the targeted one above: that one carries the
                    // recipient's own "your request is fulfilled" message, which must not be
                    // shown to every connected user. This one is an invalidation and nothing
                    // more, so it carries no personal data.
                    io.emit("bloodrequestclosed",{
                        bloodRequestId:bloodRequest?._id,
                        reason:"fulfilled"
                    })
                    res.status(200).json({
                        status:"VERIFIED",
                        message:"otp verified",
                        // the client shows the thank you note and the estimated next date,
                        // so it is returned here rather than guessed on the front end
                        lastDonated:finalized.lastDonated,
                        nextDonationDate:finalized.nextDonationDate,
                        donationGapDays:DONATION_GAP_DAYS
                    })
                    await OTP.deleteMany({userId})
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