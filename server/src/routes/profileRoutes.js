import { Router } from 'express';
import { getMe, updateProfile, completeOnboarding } from '../controllers/profileController.js';
import { updateProfileSchema, onboardingSchema } from '../validators/authValidator.js';
import validate from '../middlewares/validate.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', getMe);
router.put('/me', validate(updateProfileSchema), updateProfile);
router.put('/onboarding', validate(onboardingSchema), completeOnboarding);

export default router;
