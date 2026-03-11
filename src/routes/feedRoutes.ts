import { Router } from 'express';
import { feedController } from '../controllers';
import { authenticate } from '../middleware';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => feedController.getFeed(req, res, next));

export { router as feedRoutes };
