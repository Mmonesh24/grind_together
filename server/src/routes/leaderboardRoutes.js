import { Router } from 'express';
import { getByPoints, getByStreaks } from '../controllers/leaderboardController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getByPoints);
router.get('/streaks', getByStreaks);

export default router;
