"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const roomManager_1 = require("./services/roomManager");
const presenceService_1 = require("./services/presenceService");
const chatService_1 = require("./services/chatService");
const handler_1 = require("./sockets/handler");
function createServer() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({ origin: config_1.CONFIG.CORS_ORIGIN }));
    app.use(express_1.default.json());
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', time: Date.now() });
    });
    const httpServer = http_1.default.createServer(app);
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: config_1.CONFIG.CORS_ORIGIN,
            methods: ['GET', 'POST'],
        },
    });
    const roomManager = new roomManager_1.RoomManager(config_1.CONFIG.STATION_ADVANCE_INTERVAL_MS);
    const presenceService = new presenceService_1.PresenceService();
    const chatService = new chatService_1.ChatService();
    (0, handler_1.setupSocketHandlers)(io, roomManager, presenceService, chatService);
    return { app, httpServer, io, roomManager, presenceService, chatService };
}
function startServer() {
    const { httpServer } = createServer();
    httpServer.listen(config_1.CONFIG.PORT, '0.0.0.0', () => {
        console.log(`[aglaStation server] Running on http://0.0.0.0:${config_1.CONFIG.PORT}`);
    });
}
