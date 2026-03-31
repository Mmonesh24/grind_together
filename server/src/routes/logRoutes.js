import { Router } from 'express';
import { getToday, createLog, updateLog, getHistory } from '../controllers/logController.js';
import { createLogSchema } from '../validators/logValidator.js';
import validate from '../middlewares/validate.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/today', getToday);
router.post('/', validate(createLogSchema), createLog);
router.put('/:id', validate(createLogSchema), updateLog);
router.get('/history', getHistory);

export default router;
