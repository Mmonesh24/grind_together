import { Router } from 'express';
import { list, getById, create, join, myCreated } from '../controllers/challengeController.js';
import { createChallengeSchema } from '../validators/challengeValidator.js';
import validate from '../middlewares/validate.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/rbacMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', list);
router.get('/mine', myCreated);
router.get('/:id', getById);
router.post('/', authorize('trainer', 'admin'), validate(createChallengeSchema), create);
router.post('/:id/join', join);

export default router;
