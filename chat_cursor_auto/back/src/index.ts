import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from './env.js';
import { buildApp } from './app.js';
import { registerChatSocket } from './ws/chatSocket.js';

const start = async () => {
  const app = await buildApp();
  await app.listen({ port: env.HTTP_PORT, host: '0.0.0.0' });

  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });
  registerChatSocket(io);
  httpServer.listen(env.SOCKET_PORT, '0.0.0.0', () => {
    app.log.info({ port: env.SOCKET_PORT }, 'Socket.IO слушает порт');
  });
};

void start().catch((err) => {
  console.error(err);
  process.exit(1);
});
