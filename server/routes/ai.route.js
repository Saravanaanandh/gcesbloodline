import express from 'express';
import { getUserContext, aiChat } from '../controllers/aiController.js';

const router = express.Router();

router.get('/user-context', getUserContext);
router.post('/chat', aiChat);

export default router;
