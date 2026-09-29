import mongoose from 'mongoose'

/**
 * A signup that has been filled in but not yet verified.
 *
 * The account does not exist until the email is verified, so there is nothing to "activate" and
 * no cookie to withhold - an unverified signup is simply a row in this collection and a User is
 * created only once the right OTP comes back. That is the strongest reading of "do not activate
 * the user account or issue authentication cookies until email verification succeeds".
 *
 * Nothing here is ever sent to the client:
 *
 *   passwordHash  the password, already bcrypt hashed, so the plaintext is not held anywhere
 *                 while the user verifies
 *   otpHash       the code, bcrypt hashed, so a database read does not hand over live codes
 *   ticketHash    sha256 of the opaque ticket given to the browser that started this signup.
 *                 Hashed for the same reason as a session token: it is a bearer credential.
 *
 * The ticket exists so verify/resend/change-email are bound to the browser that began the
 * signup rather than to an email address anybody could name. Without it, knowing that
 * somebody@example.com was mid-signup would be enough to redirect their verification code.
 *
 * The whole row is disposable: a TTL on createdAt clears abandoned signups after an hour, which
 * is deliberately much longer than the five minute OTP window so that "Resend OTP" still works
 * after a code has expired.
 */
const pendingSignupSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
        lowercase:true,
        trim:true,
        unique:true
    },
    // The form as submitted, kept server-side so the user never refills it to verify or to
    // correct their email address. Validated on the way in, so creating the User from it later
    // cannot fail on a field the user can no longer see.
    payload:{
        username:String,
        age:Number,
        gender:String,
        bloodType:String,
        location:String,
        place:String,
        pinCode:Number,
        mobile:Number
    },
    passwordHash:{
        type:String,
        required:true
    },
    ticketHash:{
        type:String,
        required:true,
        index:true
    },
    otpHash:{
        type:String,
        required:true
    },
    otpExpiresAt:{
        type:Date,
        required:true
    },
    // Wrong guesses against the current code. Reset whenever a new code is issued, so a user who
    // mistypes three times and asks for a fresh code is not punished for it.
    attempts:{
        type:Number,
        default:0
    },
    resendCount:{
        type:Number,
        default:0
    },
    lastSentAt:{
        type:Date,
        default:Date.now
    },
    // Claimed by the one verification that won. Set by a compare-and-set before the User is
    // created, so two verifications arriving together cannot both register the account.
    consumed:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now,
        expires:60 * 60
    }
})

const PendingSignup = mongoose.model('PendingSignup', pendingSignupSchema)

export default PendingSignup
