import { Router } from 'express';
import { getBranchMembers, nudgeUser, getBranchStats } from '../controllers/trainerController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/rbacMiddleware.js';

const router = Router();
router.use(authMiddleware);
router.use(authorize('trainer', 'admin'));

router.get('/members', getBranchMembers);
router.get('/stats', getBranchStats);
router.post('/nudge', nudgeUser);

export default router;
