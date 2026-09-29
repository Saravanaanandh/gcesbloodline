import express from 'express'
import { getAllRecipients, getMyBloodRequest, getSingleRecipient,createRecipients, deleteRecipient } from '../controllers/recipientController.js'

const router = express.Router()

router.get('/',getAllRecipients)
// registered before '/:id', otherwise the wildcard matches "me" first and this endpoint is
// unreachable - getSingleRecipient then fails on it as an invalid ObjectId
router.get('/me',getMyBloodRequest)
router.get('/:id',getSingleRecipient)
router.post('/',createRecipients)
router.delete('/',deleteRecipient)

export default router
