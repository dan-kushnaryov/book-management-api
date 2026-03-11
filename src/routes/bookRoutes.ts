import { Router, Request, Response, NextFunction } from 'express';
import { bookController } from '../controllers';
import { authenticate, validate, createBookValidation, updateBookValidation } from '../middleware';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  createBookValidation,
  validate,
  (req: Request, res: Response, next: NextFunction) => bookController.create(req, res, next)
);

router.get('/', (req, res, next) => bookController.findAll(req, res, next));

router.get('/:id', (req, res, next) => bookController.findById(req, res, next));

router.put(
  '/:id',
  updateBookValidation,
  validate,
  (req: Request, res: Response, next: NextFunction) => bookController.update(req, res, next)
);

router.delete('/:id', (req, res, next) => bookController.delete(req, res, next));

export { router as bookRoutes };
