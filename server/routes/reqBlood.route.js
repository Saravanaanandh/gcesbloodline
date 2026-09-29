import express from 'express'
import {
    acceptReq,
    cancelConfirmedReq,
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
// registered before '/:id', otherwise the wildcard matches "completed" first and this endpoint
// is unreachable - getRequest then fails on it as an invalid ObjectId
router.get('/completed',completedRequests)
router.get('/:id',getRequest)
router.post('/:id',sendRequest)
router.put('/:id',acceptReq)
router.put('/:id/reject',rejectReq) 
router.put('/:id/confirm',confirmReq)
router.put('/:id/rejected',rejectAcceptedReq)  
router.put('/:id/confirmed',confirmedReq)
// the recipient calling off a donation they had already confirmed
router.put('/:id/cancel',cancelConfirmedReq)
router.delete('/:id',deleteRequest)

export default router