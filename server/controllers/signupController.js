import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import PendingSignup from '../model/PendingSignup.js'
import User from '../model/User.js'
import { verifyPinCodeLocation } from '../utils/pincode.js'
import { isMailConfigured, sendSignupOtpEmail } from '../utils/mailer.js'
import { getCookieOptions } from '../utils/cookieOptions.js'

/**
 * Signup with email verification.
 *
 * The flow, and where the security properties live:
 *
 *   POST /signup               validates the form, bcrypt-hashes the password, generates a code
 *                              with crypto.randomInt, stores only its bcrypt hash with a five
 *                              minute expiry, emails the plaintext, and returns an opaque ticket.
 *                              No User row, no JWT, no cookie.
 *   POST /signup/verify-otp    compares against the hash, then claims the pending row with a
 *                              compare-and-set and creates the account.
 *   POST /signup/resend-otp    new code, rate limited by a per-row cooldown and a resend cap.
 *   POST /signup/change-email  new address, duplicate-checked; the previous code is replaced, so
 *                              whatever was sent to the wrong address stops working.
 *
 * The plaintext OTP exists in exactly two places: the local variable in generateOtp's caller, and
 * the email body. It is never stored, never logged in production and never in a response body.
 */

const OTP_TTL_MINUTES = 5
const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000
const MAX_OTP_ATTEMPTS = 5
const RESEND_COOLDOWN_SECONDS = 45
const MAX_RESENDS = 5

// crypto.randomInt, not Math.random: a six digit code guessable from the generator is not a
// verification of anything. Uniform over 100000-999999.
const generateOtp = ()=> String(crypto.randomInt(100000, 1000000))

// The ticket is a bearer credential, so the row stores a digest of it rather than the value.
// sha256 rather than bcrypt because it is a 256-bit random string - there is nothing to brute
// force - and this runs on every request in the flow.
const newTicket = ()=> crypto.randomBytes(32).toString('hex')
const hashTicket = (ticket)=> crypto.createHash('sha256').update(String(ticket)).digest('hex')

const normalizeEmail = (email)=> String(email || '').trim().toLowerCase()
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Issues a code for a pending signup and emails it. Returns what the client is allowed to know:
 * how long it lasts and how long before another can be requested. Never the code.
 *
 * The write is a single update that replaces the hash, moves the expiry and zeroes the attempt
 * counter together, so a new code can never inherit the old one's exhausted attempts and an old
 * code can never survive alongside a new one.
 */
const issueOtp = async (pending, {countAsResend = false} = {})=>{
    const otp = generateOtp()
    const otpHash = await bcrypt.hash(otp, await bcrypt.genSalt(10))

    await PendingSignup.updateOne(
        {_id:pending._id},
        {
            $set:{
                otpHash,
                otpExpiresAt:new Date(Date.now() + OTP_TTL_MS),
                attempts:0,
                lastSentAt:new Date()
            },
            ...(countAsResend ? {$inc:{resendCount:1}} : {})
        }
    )

    const delivery = await sendSignupOtpEmail({
        email:pending.email,
        username:pending.payload?.username,
        otp,
        minutes:OTP_TTL_MINUTES
    })

    // Local escape hatch for a machine with no mail credential configured: the code goes to the
    // server console so development is not blocked. Guarded on NODE_ENV, so a production box
    // missing its credential fails closed rather than writing live codes into its logs.
    if(delivery.skipped && process.env.NODE_ENV !== 'production'){
        console.warn(`[signup] email delivery is disabled - verification code for ${pending.email} is ${otp}`)
    }

    return {
        email:pending.email,
        expiresInMinutes:OTP_TTL_MINUTES,
        resendCooldownSeconds:RESEND_COOLDOWN_SECONDS,
        // so the UI can say why nothing arrived instead of leaving the user staring at an
        // empty inbox; says nothing about the code itself
        emailDelivery:delivery.ok ? 'sent' : (delivery.skipped ? 'disabled' : 'failed')
    }
}

// Loads the pending signup this ticket stands for. A ticket that names nothing is indistinguishable
// from one that expired, and both get the same answer: start again.
const findByTicket = async (ticket)=>{
    if(!ticket || typeof ticket !== 'string') return null
    return await PendingSignup.findOne({ticketHash:hashTicket(ticket)})
}

const TICKET_EXPIRED = {
    status:410,
    body:{message:"Your verification session has expired. Please fill the signup form again.", restart:true}
}

/**
 * Step one. Validates the form, checks the email is free, and starts a verification round.
 *
 * Deliberately creates no User and sets no cookie - an unverified signup lives only in
 * PendingSignup, so there is no half-made account to clean up if the user walks away.
 */
export const startSignup = async (req, res)=>{
    const {username, age, gender, bloodType, location, place, pinCode, mobile, password} = req.body
    const email = normalizeEmail(req.body.email)

    if(!username || !email || !gender || !password || !age || !bloodType || !location || !place || !pinCode || !mobile){
        return res.status(400).json({message:"please fill required fields"})
    }
    if(!EMAIL_PATTERN.test(email)) return res.status(400).json({message:"Please enter a valid email address"})
    if(String(password).length < 6) return res.status(400).json({message:"Password must be at least 6 characters"})

    try{
        const duplicateUser = await User.findOne({email}).select('_id')
        if(duplicateUser) return res.status(409).json({message:"user already with that email"})

        const verifiedLocation = await verifyPinCodeLocation(pinCode, location, place)
        if(!verifiedLocation.ok) return res.status(400).json({message:verifiedLocation.message})

        const passwordHash = await bcrypt.hash(String(password), await bcrypt.genSalt(10))
        const ticket = newTicket()

        // Upserted on the email rather than rejected as a duplicate: an abandoned signup must not
        // lock an address out for the hour its TTL runs. Whoever asks gets a fresh ticket and a
        // fresh code, and the code only ever goes to the address itself - so restarting a signup
        // somebody else began reveals nothing and blocks nothing.
        const pending = await PendingSignup.findOneAndUpdate(
            {email},
            {$set:{
                email,
                payload:{
                    username,
                    age:Number(age),
                    gender,
                    bloodType,
                    location:verifiedLocation.district,
                    place:verifiedLocation.place,
                    pinCode:Number(pinCode),
                    mobile:Number(mobile)
                },
                passwordHash,
                ticketHash:hashTicket(ticket),
                // placeholders; issueOtp overwrites all three in one write below
                otpHash:'pending',
                otpExpiresAt:new Date(Date.now() + OTP_TTL_MS),
                attempts:0,
                resendCount:0,
                consumed:false,
                createdAt:new Date()
            }},
            {new:true, upsert:true}
        )

        const issued = await issueOtp(pending)
        res.status(200).json({requiresVerification:true, ticket, ...issued})
    }catch(err){
        // the unique index on User.email, or a race between two signups for the same address
        if(err?.code === 11000) return res.status(409).json({message:"user already with that email"})
        console.log(err)
        res.status(400).json({message:err.name})
    }
}

/**
 * Step two. Verifies the code and creates the account.
 *
 * Ordering matters here. The code is checked first, then the row is claimed with a compare-and-set
 * on `consumed`, and only then is the User written - so a replayed or doubled verification finds
 * the row already claimed and is refused rather than creating a second account. The unique index
 * on User.email is the backstop if both arrive inside the same instant.
 */
export const verifySignupOtp = async (req, res)=>{
    const {ticket, otp} = req.body
    if(!ticket || !otp) return res.status(400).json({message:"Please enter the verification code"})

    try{
        const pending = await findByTicket(ticket)
        if(!pending) return res.status(TICKET_EXPIRED.status).json(TICKET_EXPIRED.body)
        if(pending.consumed) return res.status(409).json({message:"This email has already been verified. Please log in."})

        if(pending.otpExpiresAt.getTime() <= Date.now()){
            return res.status(400).json({message:"That code has expired. Please request a new one.", expired:true})
        }
        if(pending.attempts >= MAX_OTP_ATTEMPTS){
            return res.status(429).json({message:"Too many incorrect codes. Please request a new one.", locked:true})
        }

        const isMatch = await bcrypt.compare(String(otp).trim(), pending.otpHash)
        if(!isMatch){
            // Counted with $inc rather than by saving a read-then-written value, so parallel
            // guesses each cost an attempt instead of overwriting one another.
            const updated = await PendingSignup.findOneAndUpdate(
                {_id:pending._id},
                {$inc:{attempts:1}},
                {new:true}
            )
            const used = updated?.attempts ?? MAX_OTP_ATTEMPTS
            const remaining = Math.max(MAX_OTP_ATTEMPTS - used, 0)
            return res.status(400).json({
                message:remaining > 0
                    ? `Incorrect code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left.`
                    : "Too many incorrect codes. Please request a new one.",
                attemptsLeft:remaining,
                locked:remaining === 0
            })
        }

        // Claim. Exactly one caller gets the document back; everybody else sees null and is told
        // the verification already happened.
        const claimed = await PendingSignup.findOneAndUpdate(
            {_id:pending._id, consumed:{$ne:true}},
            {$set:{consumed:true}},
            {new:true}
        )
        if(!claimed) return res.status(409).json({message:"This email has already been verified. Please log in."})

        // Re-checked after claiming: the address may have been registered by another route during
        // the five minutes this code was valid.
        const duplicateUser = await User.findOne({email:claimed.email}).select('_id')
        if(duplicateUser){
            await PendingSignup.deleteOne({_id:claimed._id})
            return res.status(409).json({message:"user already with that email"})
        }

        let user
        try{
            // Built with `new` + save rather than create so the already-hashed password can be
            // flagged; see the pre('save') hook in model/User.js.
            user = new User({
                ...claimed.payload,
                email:claimed.email,
                password:claimed.passwordHash,
                emailVerified:true
            })
            user.$locals.passwordAlreadyHashed = true
            await user.save()
        }catch(err){
            if(err?.code === 11000){
                await PendingSignup.deleteOne({_id:claimed._id})
                return res.status(409).json({message:"user already with that email"})
            }
            // The account was not created, so the claim is rolled back and the user can retry
            // with the code they already have instead of being told to start over.
            await PendingSignup.updateOne({_id:claimed._id}, {$set:{consumed:false}})
            throw err
        }

        await PendingSignup.deleteOne({_id:claimed._id})

        // Verification succeeded, so this is the first moment a cookie may be issued.
        const token = user.createJWT()
        user.token = token
        res.cookie('jwt', token, getCookieOptions(req))

        const created = user.toObject()
        delete created.password
        res.status(201).json(created)
    }catch(err){
        if(err.name === "ValidationError"){
            return res.status(400).json({message:"please provide the valid details"})
        }
        console.log(err)
        res.status(500).json({message:"Please try again later"})
    }
}

/**
 * A fresh code for the same address. Rate limited twice: a per-row cooldown so the button cannot
 * be leaned on, and a cap on how many codes one pending signup may ever produce, so a single
 * ticket cannot be turned into a mail flood aimed at somebody's inbox.
 */
export const resendSignupOtp = async (req, res)=>{
    const {ticket} = req.body
    if(!ticket) return res.status(400).json({message:"Please start the signup again"})

    try{
        const pending = await findByTicket(ticket)
        if(!pending) return res.status(TICKET_EXPIRED.status).json(TICKET_EXPIRED.body)
        if(pending.consumed) return res.status(409).json({message:"This email has already been verified. Please log in."})

        const elapsed = Date.now() - new Date(pending.lastSentAt || 0).getTime()
        const waitSeconds = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - elapsed) / 1000)
        if(waitSeconds > 0){
            return res.status(429).json({
                message:`Please wait ${waitSeconds} seconds before requesting another code.`,
                retryAfterSeconds:waitSeconds
            })
        }
        if(pending.resendCount >= MAX_RESENDS){
            return res.status(429).json({message:"Too many codes requested. Please fill the signup form again.", restart:true})
        }

        const issued = await issueOtp(pending, {countAsResend:true})
        res.status(200).json({message:`A new verification code has been sent to ${pending.email}.`, ...issued})
    }catch(err){
        console.log(err)
        res.status(500).json({message:"Please try again later"})
    }
}

/**
 * The user typed the wrong address. The form is not refilled - it is already held in the pending
 * row - only the address changes, and issuing the new code overwrites the old hash, so the code
 * sent to the wrong address stops working the moment this succeeds.
 */
export const changeSignupEmail = async (req, res)=>{
    const {ticket} = req.body
    const email = normalizeEmail(req.body.email)

    if(!ticket) return res.status(400).json({message:"Please start the signup again"})
    if(!email) return res.status(400).json({message:"Please enter your email address"})
    if(!EMAIL_PATTERN.test(email)) return res.status(400).json({message:"Please enter a valid email address"})

    try{
        const pending = await findByTicket(ticket)
        if(!pending) return res.status(TICKET_EXPIRED.status).json(TICKET_EXPIRED.body)
        if(pending.consumed) return res.status(409).json({message:"This email has already been verified. Please log in."})

        if(email === pending.email){
            return res.status(400).json({message:"That is the address the code was already sent to"})
        }

        const duplicateUser = await User.findOne({email}).select('_id')
        if(duplicateUser) return res.status(409).json({message:"user already with that email"})

        // Changing the address resets the resend budget along with it: the new address has had no
        // codes yet, and the cap exists to protect inboxes, not to ration the flow.
        let moved
        try{
            moved = await PendingSignup.findOneAndUpdate(
                {_id:pending._id, consumed:{$ne:true}},
                {$set:{email, resendCount:0, attempts:0}},
                {new:true}
            )
        }catch(err){
            // the unique index: somebody else is already mid-signup on that address
            if(err?.code === 11000){
                return res.status(409).json({message:"A signup for that email is already being verified. Please check that inbox, or use a different address."})
            }
            throw err
        }
        if(!moved) return res.status(409).json({message:"This email has already been verified. Please log in."})

        const issued = await issueOtp(moved)
        res.status(200).json({message:`A verification code has been sent to ${moved.email}.`, ...issued})
    }catch(err){
        console.log(err)
        res.status(500).json({message:"Please try again later"})
    }
}

// Surfaced so the signup screen can warn that verification emails will not arrive on a box with
// no mail credential, instead of the user blaming their spam folder.
export const signupMailStatus = (req, res)=>{
    res.status(200).json({emailDelivery:isMailConfigured() ? 'enabled' : 'disabled'})
}
