import express from 'express'
import rateLimit from 'express-rate-limit'
import { loginController, logoutController, updateProfileController,getUserProfile, checkAuth, sendOTPForPasswordReset, verifyOTPForPasswordReset, resetPasswordController } from '../controllers/authController.js'
import { changeSignupEmail, resendSignupOtp, signupMailStatus, startSignup, verifySignupOtp } from '../controllers/signupController.js'
import { verifyJWT } from '../middleware/auth.middleware.js'

const router = express.Router()

// Tighter than the 100/minute the rest of the API gets. These four endpoints are unauthenticated
// and two of them send email, so the limit is what stops one client turning the signup form into
// an OTP brute forcer or a mail relay. The per-pending-signup cooldown and attempt counters in the
// controller are the other half: this bounds an IP, those bound a single signup.
const signupLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    message: { message: "Too many verification attempts. Please try again in a few minutes." },
    standardHeaders: true,
    legacyHeaders: true
})

router.post('/signup', signupLimiter, startSignup)
router.post('/signup/verify-otp', signupLimiter, verifySignupOtp)
router.post('/signup/resend-otp', signupLimiter, resendSignupOtp)
router.post('/signup/change-email', signupLimiter, changeSignupEmail)
router.get('/signup/mail-status', signupMailStatus)

router.post('/login',loginController)

router.get('/check-auth',verifyJWT,checkAuth)
router.get('/',verifyJWT,getUserProfile)
router.put('/update-profile',verifyJWT,updateProfileController)
router.delete('/logout',verifyJWT,logoutController)
router.post('/forget-password/send-otp', sendOTPForPasswordReset)
router.post('/forget-password/verify-otp', verifyOTPForPasswordReset)
router.post('/forget-password/reset-password', resetPasswordController)

export default router
