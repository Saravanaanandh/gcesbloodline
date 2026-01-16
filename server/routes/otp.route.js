import express from 'express'
import { sendOTP, verifyOTP } from '../controllers/OTPController.js'

const router = express.Router()

router.post('/:id/send',sendOTP)
router.post('/:id/verifyotp',verifyOTP)
// router.post('/mailtodonor',sendMailToDonor)

export default router