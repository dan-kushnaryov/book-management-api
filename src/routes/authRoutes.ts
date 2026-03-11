import { Router } from 'express';
import { authController } from '../controllers';

const router = Router();

router.post('/login', (req, res, next) => authController.login(req, res, next));

export { router as authRoutes };
