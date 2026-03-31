import { Router } from 'express';
import {
  weightTrend, calorieTrend, workoutBreakdown,
  cardioTrend, heatmap, weeklyReport, exportCsv,
} from '../controllers/analyticsController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/weight', weightTrend);
router.get('/calories', calorieTrend);
router.get('/workouts', workoutBreakdown);
router.get('/cardio', cardioTrend);
router.get('/heatmap', heatmap);
router.get('/weekly-report', weeklyReport);
router.get('/export', exportCsv);

export default router;
