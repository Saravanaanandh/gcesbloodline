import express from 'express'
import { getAllRecipients, getSingleRecipient,createRecipients, deleteRecipient } from '../controllers/recipientController.js'

const router = express.Router()

router.get('/',getAllRecipients)
router.get('/:id',getSingleRecipient)
router.post('/',createRecipients)  
router.delete('/',deleteRecipient)  

export default router