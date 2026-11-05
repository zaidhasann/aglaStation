import { Server, Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  JoinRoomPayload,
  TimePingPayload,
  TimePongPayload,
  ChatMessagePayload,
  ChatRequestPayload,
  ChatAcceptPayload,
  ChatDeclinePayload,
  ChatEndPayload,
  UserBlockPayload,
  UserReportPayload,
} from 'agla-station-shared';
import { RoomManager } from '../services/roomManager';
import { PresenceService } from '../services/presenceService';
import { ChatService } from '../services/chatService';
import { CONFIG } from '../config';

export function setupSocketHandlers(
  io: Server,
  roomManager: RoomManager,
  presenceService: PresenceService,
  chatService: ChatService
) {
  // Hook station advancement callback to broadcast to rooms
  roomManager.setOnAdvance((room, currentStation, nextStation) => {
    const serverTime = Date.now();
    io.to(room.roomId).emit(SOCKET_EVENTS.STATION_ADVANCE, {
      stationIndex: room.stationIndex,
      currentStation,
      nextStation,
      track: room.track,
      startedAt: room.startedAt,
      serverTime,
    });
  });

  io.on('connection', (socket: Socket) => {
    const socketId = socket.id;

    // Register user profile
    presenceService.registerUser(socketId);

    // 1. Time sync (NTP-style ping/pong)
    socket.on(SOCKET_EVENTS.TIME_PING, (payload: TimePingPayload) => {
      const serverTime = Date.now();
      const response: TimePongPayload = {
        clientSendTime: payload?.clientSendTime || 0,
        serverTime,
      };
      socket.emit(SOCKET_EVENTS.TIME_PONG, response);
    });

    // 2. Profile set name
    socket.on(SOCKET_EVENTS.PROFILE_SET_NAME, ({ name }: { name: string }) => {
      const cleanName = presenceService.updateUserName(socketId, name);
      if (cleanName) {
        const rider = presenceService.getRider(socketId);
        if (rider && (rider as any).roomId) {
          const roomId = (rider as any).roomId;
          io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, presenceService.getRoomPresence(roomId));
        }
      }
    });

    // 3. Room Join
    socket.on(SOCKET_EVENTS.ROOM_JOIN, (payload: JoinRoomPayload) => {
      if (!payload || !payload.lineId || !payload.direction) {
        return;
      }

      const roomId = RoomManager.getRoomId(payload.lineId, payload.direction);
      const room = roomManager.getOrCreateRoom(payload.lineId, payload.direction);

      // Join socket room
      socket.join(roomId);

      // Update presence
      if (payload.name) {
        presenceService.updateUserName(socketId, payload.name);
      }
      presenceService.joinRoom(socketId, roomId, payload.startStationId);

      const { currentStation, nextStation } = roomManager.getRoomStationDetails(room);
      const presence = presenceService.getRoomPresence(roomId);
      const serverTime = Date.now();

      // Emit complete initial room state to joining client
      socket.emit(SOCKET_EVENTS.ROOM_STATE, {
        room: {
          roomId: room.roomId,
          lineId: room.lineId,
          direction: room.direction,
        },
        stationIndex: room.stationIndex,
        currentStation,
        nextStation,
        track: room.track,
        startedAt: room.startedAt,
        serverTime,
        listenersCount: presence.listenersCount,
        stationCounts: presence.stationCounts,
      });

      // Broadcast presence update to everyone in room
      io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, presence);
    });

    // 4. Room Resync request
    socket.on(SOCKET_EVENTS.ROOM_RESYNC, () => {
      const rider = presenceService.getRider(socketId);
      const roomId = (rider as any)?.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (room) {
        socket.emit(SOCKET_EVENTS.ROOM_RESYNC, {
          stationIndex: room.stationIndex,
          track: room.track,
          startedAt: room.startedAt,
          serverTime: Date.now(),
        });
      }
    });

    // 5. Manual station advance (dev & testing tool)
    socket.on(SOCKET_EVENTS.STATION_ADVANCE_MANUAL, () => {
      const rider = presenceService.getRider(socketId);
      const roomId = (rider as any)?.roomId;
      if (roomId) {
        roomManager.advanceStation(roomId);
      }
    });

    // 6. Chat Flow
    socket.on(SOCKET_EVENTS.CHAT_REQUEST, ({ toUserId }: { toUserId: string }) => {
      const rider = presenceService.getRider(socketId);
      if (!rider) return;

      const result = chatService.createRequest(socketId, rider.name, toUserId);
      if ('error' in result) {
        socket.emit('chat:error', { error: result.error });
        return;
      }

      // Notify target user
      io.to(toUserId).emit(SOCKET_EVENTS.CHAT_REQUEST, {
        requestId: result.requestId,
        fromUserId: socketId,
        fromUserName: rider.name,
        toUserId,
      });
    });

    socket.on(SOCKET_EVENTS.CHAT_ACCEPT, ({ requestId }: { requestId: string }) => {
      const result = chatService.acceptRequest(requestId, socketId);
      if ('error' in result) {
        socket.emit('chat:error', { error: result.error });
        return;
      }

      // Notify both parties
      const payload = { requestId, chatId: result.chatId };
      io.to(result.session.users[0]).emit(SOCKET_EVENTS.CHAT_ACCEPT, payload);
      io.to(result.session.users[1]).emit(SOCKET_EVENTS.CHAT_ACCEPT, payload);
    });

    socket.on(SOCKET_EVENTS.CHAT_DECLINE, ({ requestId }: { requestId: string }) => {
      const req = chatService.getRequest(requestId);
      if (req && req.toUserId === socketId) {
        const fromUserId = req.fromUserId;
        chatService.declineRequest(requestId, socketId);
        io.to(fromUserId).emit(SOCKET_EVENTS.CHAT_DECLINE, { requestId });
      }
    });

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (payload: { chatId: string; text: string }) => {
      if (!payload || !payload.chatId || !payload.text) return;

      // Rate limit check
      if (!chatService.checkRateLimit(socketId, CONFIG.RATE_LIMIT_MAX_MESSAGES, CONFIG.RATE_LIMIT_WINDOW_MS)) {
        socket.emit('chat:error', { error: 'Rate limit exceeded. Please wait a moment.' });
        return;
      }

      // Membership check
      if (!chatService.isUserInChat(payload.chatId, socketId)) {
        socket.emit('chat:error', { error: 'You are not a member of this chat.' });
        return;
      }

      const cleanText = payload.text.trim().slice(0, CONFIG.MAX_MESSAGE_LENGTH);
      if (!cleanText) return;

      const partnerId = chatService.getChatPartner(payload.chatId, socketId);
      const messagePayload: ChatMessagePayload = {
        chatId: payload.chatId,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: socketId,
        text: cleanText,
        timestamp: Date.now(),
      };

      socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, messagePayload);
      if (partnerId) {
        io.to(partnerId).emit(SOCKET_EVENTS.CHAT_MESSAGE, messagePayload);
      }
    });

    socket.on(SOCKET_EVENTS.CHAT_END, ({ chatId }: { chatId: string }) => {
      const session = chatService.endChat(chatId, socketId);
      if (session) {
        const payload: ChatEndPayload = { chatId, reason: 'Chat ended by participant' };
        io.to(session.users[0]).emit(SOCKET_EVENTS.CHAT_END, payload);
        io.to(session.users[1]).emit(SOCKET_EVENTS.CHAT_END, payload);
      }
    });

    socket.on(SOCKET_EVENTS.USER_BLOCK, ({ targetUserId }: UserBlockPayload) => {
      chatService.blockUser(socketId, targetUserId);
      socket.emit('user:blocked', { targetUserId });
    });

    socket.on(SOCKET_EVENTS.USER_REPORT, ({ targetUserId, reason }: UserReportPayload) => {
      chatService.addReport(socketId, targetUserId, reason);
      socket.emit('user:reported', { targetUserId });
    });

    // 7. Disconnect handling
    socket.on('disconnect', () => {
      const endedChatIds = chatService.handleDisconnect(socketId);
      for (const chatId of endedChatIds) {
        io.emit(SOCKET_EVENTS.CHAT_END, { chatId, reason: 'Participant disconnected' });
      }

      const roomId = presenceService.removeUser(socketId);
      if (roomId) {
        const presence = presenceService.getRoomPresence(roomId);
        io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, presence);
        roomManager.removeRoomIfEmpty(roomId, presence.listenersCount);
      }
    });
  });
}
