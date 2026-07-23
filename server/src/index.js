import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import http from 'http';
import { Server } from 'socket.io';
import { initBattleSocket } from './sockets/battleSocket.js';
import { initPeerSocket } from './sockets/peerSocket.js';
import { initRecruiterSocket } from './sockets/recruiterSocket.js';

import { startCronJobs } from './services/cronService.js';

const startServer = async () => {
  await connectDB();
  
  startCronJobs();

  const server = http.createServer(app);
  
  const allowedOrigins = env.CLIENT_URL.split(',').map((origin) => origin.trim());
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  initBattleSocket(io);
  initPeerSocket(io);
  initRecruiterSocket(io);

  server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
