import { Router } from 'express';
import { list, getById, create, join, myCreated, submitProof, getPendingSubmissions, reviewSubmission, getMySubmissions } from '../controllers/challengeController.js';
import { createChallengeSchema } from '../validators/challengeValidator.js';
import validate from '../middlewares/validate.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/rbacMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', list);
router.get('/mine', authorize('trainer', 'admin'), myCreated);
router.get('/submissions', getMySubmissions);
router.get('/submissions/pending', authorize('trainer', 'admin'), getPendingSubmissions);
router.get('/:id', getById);

router.post('/', authorize('trainer', 'admin'), validate(createChallengeSchema), create);
router.post('/:id/join', join);
router.post('/:id/submit-proof', submitProof);
router.post('/submissions/:id/review', authorize('trainer', 'admin'), reviewSubmission);

export default router;
