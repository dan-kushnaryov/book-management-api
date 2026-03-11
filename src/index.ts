import { config } from './config';
import { connectDatabase } from './config/database';
import { createApp } from './app';

const startServer = async (): Promise<void> => {
  await connectDatabase();

  const app = createApp();

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
