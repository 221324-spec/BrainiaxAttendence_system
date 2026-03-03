import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate, authenticate } from '../middleware';
import { loginSchema, registerSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.get('/profile', authenticate, AuthController.getMyProfile);
router.patch('/profile', authenticate, AuthController.updateMyProfile);
router.post('/change-password', authenticate, AuthController.changePassword);

export default router;
