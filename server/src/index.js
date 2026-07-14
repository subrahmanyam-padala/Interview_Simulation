import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

import { startCronJobs } from './services/cronService.js';

const startServer = async () => {
  await connectDB();
  
  startCronJobs();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
