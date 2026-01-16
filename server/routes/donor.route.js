import express from 'express' 
import { 
    createDonor,
    deleteDonar,
    getAllDonars,
    getDonar, 
} from './../controllers/donorController.js'

const router = express.Router()

router.get('/',getAllDonars)
router.get('/:id',getDonar)

router.post('/',createDonor)
router.delete('/',deleteDonar)

export default router