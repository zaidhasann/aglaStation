import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { CONFIG } from './config';
import { RoomManager } from './services/roomManager';
import { PresenceService } from './services/presenceService';
import { ChatService } from './services/chatService';
import { ReportsStore } from './services/reportsStore';
import { setupSocketHandlers } from './sockets/handler';

export function createServer() {
  const app = express();

  // Strict CORS policy - reject wildcard origins in production
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        const allowed = CONFIG.CORS_ORIGIN.split(',').map((s) => s.trim());
        if (allowed.includes('*') || allowed.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(express.json());

  // Health endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'NextStation Server', time: Date.now() });
  });

  const reportsStore = new ReportsStore();

  // Protected Admin Reports Route
  const adminAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.query.token;

    if (!token || token !== CONFIG.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized: Invalid admin token' });
    }
    next();
  };

  app.get('/admin/reports', adminAuth, (_req: Request, res: Response) => {
    res.json(reportsStore.getReportsSummary());
  });

  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: CONFIG.CORS_ORIGIN.includes(',') ? CONFIG.CORS_ORIGIN.split(',').map((s) => s.trim()) : CONFIG.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const roomManager = new RoomManager(CONFIG.STATION_ADVANCE_INTERVAL_MS);
  const presenceService = new PresenceService();
  const chatService = new ChatService(reportsStore);

  setupSocketHandlers(io, roomManager, presenceService, chatService);

  return { app, httpServer, io, roomManager, presenceService, chatService, reportsStore };
}

export function startServer() {
  const { httpServer } = createServer();
  httpServer.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`[NextStation server] Running on http://0.0.0.0:${CONFIG.PORT}`);
    console.log(`[Config] CORS_ORIGIN: ${CONFIG.CORS_ORIGIN}`);
    console.log(`[Config] ENABLE_DEV_TOOLS: ${CONFIG.ENABLE_DEV_TOOLS}`);
  });
}
