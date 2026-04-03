import { Router } from 'express';
import { subscribe, unsubscribe, handleAction } from '../controllers/notificationController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

// Public but identified via endpoint in body
router.post('/action', handleAction);

router.use(authMiddleware);

router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

export default router;
