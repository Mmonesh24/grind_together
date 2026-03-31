import { Router } from 'express';
import { getHistory } from '../controllers/chatController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/:roomId', getHistory);

export default router;
