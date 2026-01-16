import express from 'express'
import {
    acceptReq,
    completedRequests,
    confirmReq, 
    confirmedReq, 
    deleteRequest, 
    getAllRequests, 
    getRequest,  
    rejectAcceptedReq,  
    rejectReq, 
    sendRequest
} from './../controllers/reqBloodController.js' 

const router = express.Router() 

router.get('/',getAllRequests)
router.get('/:id',getRequest)
router.get('/completed',completedRequests)
router.post('/:id',sendRequest)
router.put('/:id',acceptReq)
router.put('/:id/reject',rejectReq) 
router.put('/:id/confirm',confirmReq)
router.put('/:id/rejected',rejectAcceptedReq)  
router.put('/:id/confirmed',confirmedReq)
router.delete('/:id',deleteRequest)

export default router