import { Router } from 'express';
import { getDailyPlan, completeExercise, completeMeal, updateWater } from '../controllers/dailyPlanController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getDailyPlan);
router.post('/exercise/:exerciseId/complete', completeExercise);
router.post('/meal/:mealId/complete', completeMeal);
router.post('/water', updateWater);

export default router;
