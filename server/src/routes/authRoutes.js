import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/authController.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import validate from '../middlewares/validate.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', authMiddleware, logout);

export default router;
