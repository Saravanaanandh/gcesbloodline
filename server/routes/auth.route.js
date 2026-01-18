import express from 'express'
import { signupController,loginController, logoutController, updateProfileController,getUserProfile, checkAuth, sendOTPForPasswordReset, verifyOTPForPasswordReset, resetPasswordController } from '../controllers/authController.js'
import { verifyJWT } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/signup',signupController)
router.post('/login',loginController)

router.get('/check-auth',verifyJWT,checkAuth)
router.get('/',verifyJWT,getUserProfile)
router.put('/update-profile',verifyJWT,updateProfileController)
router.delete('/logout',verifyJWT,logoutController)
router.post('/forget-password/send-otp', sendOTPForPasswordReset)
router.post('/forget-password/verify-otp', verifyOTPForPasswordReset)
router.post('/forget-password/reset-password', resetPasswordController)

export default router
