import express, { Application } from 'express';
import cors from 'cors';
import { authRoutes, bookRoutes, feedRoutes } from './routes';
import { errorHandler } from './middleware';

export const createApp = (): Application => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/', authRoutes);
  app.use('/books', bookRoutes);
  app.use('/feed', feedRoutes);

  app.use(errorHandler);

  return app;
};
