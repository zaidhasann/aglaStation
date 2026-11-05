import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { CONFIG } from './config';
import { RoomManager } from './services/roomManager';
import { PresenceService } from './services/presenceService';
import { ChatService } from './services/chatService';
import { setupSocketHandlers } from './sockets/handler';

export function createServer() {
  const app = express();
  app.use(cors({ origin: CONFIG.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: CONFIG.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  const roomManager = new RoomManager(CONFIG.STATION_ADVANCE_INTERVAL_MS);
  const presenceService = new PresenceService();
  const chatService = new ChatService();

  setupSocketHandlers(io, roomManager, presenceService, chatService);

  return { app, httpServer, io, roomManager, presenceService, chatService };
}

export function startServer() {
  const { httpServer } = createServer();
  httpServer.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`[aglaStation server] Running on http://0.0.0.0:${CONFIG.PORT}`);
  });
}
