import { Server, Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  JoinRoomPayload,
  LeaveRoomPayload,
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

// Track connection and join rate-limiting per IP
const connectionAttempts = new Map<string, number[]>();
const joinAttempts = new Map<string, number[]>();

function checkIpRateLimit(ip: string, map: Map<string, number[]>, maxCount: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (map.get(ip) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxCount) {
    return false;
  }
  timestamps.push(now);
  map.set(ip, timestamps);
  return true;
}

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
      interstationSec: room.interstationSec,
    });
  });

  // Hook fallback track substitution callback
  roomManager.setOnTrackFallback((room, fallbackTrack) => {
    const serverTime = Date.now();
    io.to(room.roomId).emit(SOCKET_EVENTS.ROOM_RESYNC, {
      stationIndex: room.stationIndex,
      track: fallbackTrack,
      startedAt: room.startedAt,
      serverTime,
      interstationSec: room.interstationSec,
    });
  });

  io.on('connection', (socket: Socket) => {
    const socketId = socket.id;
    const clientIp = socket.handshake.address || 'unknown';

    // Rate limit connections per IP
    if (!checkIpRateLimit(clientIp, connectionAttempts, 30, 60000)) {
      console.warn(`[SOCKET] Rate limit exceeded on connection for IP: ${clientIp}`);
      socket.emit('error:notice', { message: 'Too many connection attempts. Please slow down.' });
      socket.disconnect(true);
      return;
    }

    // Register user profile with opaque public ID
    const internalUser = presenceService.registerUser(socketId);
    console.log(`[SOCKET] User connected: publicId=${internalUser.publicId} (socket=${socketId}) from ${clientIp}`);

    // Helper: leave current room cleanly
    const performRoomLeave = () => {
      const rider = presenceService.getRiderBySocket(socketId);
      const oldRoomId = rider?.roomId;
      if (oldRoomId) {
        socket.leave(oldRoomId);
        presenceService.leaveRoom(socketId);

        const presence = presenceService.getRoomPresence(oldRoomId);
        io.to(oldRoomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, presence);
        roomManager.removeRoomIfEmpty(oldRoomId, presence.listenersCount);
        console.log(`[ROOM] User ${rider?.publicId} left room ${oldRoomId}. New count: ${presence.listenersCount}`);
      }
      return oldRoomId;
    };

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
        const rider = presenceService.getRiderBySocket(socketId);
        if (rider && rider.roomId) {
          const roomId = rider.roomId;
          io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, presenceService.getRoomPresence(roomId));
        }
      } else {
        socket.emit('error:notice', { message: 'Name contains disallowed terms or is invalid.' });
      }
    });

    // 3. Room Join with full validation
    socket.on(SOCKET_EVENTS.ROOM_JOIN, (payload: JoinRoomPayload) => {
      if (!payload) return;

      // Rate limit room joins
      if (!checkIpRateLimit(clientIp, joinAttempts, CONFIG.RATE_LIMIT_JOINS_MAX, CONFIG.RATE_LIMIT_JOINS_WINDOW_MS)) {
        socket.emit('error:notice', { message: 'Joining rooms too frequently. Please wait a moment.' });
        return;
      }

      // Validate inputs against lines.json
      const validation = roomManager.validateJourney({
        lineId: payload.lineId,
        direction: payload.direction,
        startStationId: payload.startStationId,
        destStationId: payload.destStationId,
      });

      if (!validation.isValid) {
        console.warn(`[ROOM_JOIN] Rejected invalid join from socket ${socketId}: ${validation.error}`);
        socket.emit('error:notice', { message: validation.error || 'Invalid train route specified.' });
        return;
      }

      // Cleanly leave existing room if already joined
      performRoomLeave();

      const roomId = RoomManager.getRoomId(payload.lineId, payload.direction);
      const room = roomManager.getOrCreateRoom(payload.lineId, payload.direction);
      if (!room) {
        socket.emit('error:notice', { message: 'Failed to access requested train line.' });
        return;
      }

      // Join socket room
      socket.join(roomId);

      // Update presence
      if (payload.name) {
        presenceService.updateUserName(socketId, payload.name);
      }
      presenceService.joinRoom(socketId, roomId, payload.startStationId, payload.destStationId);

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
        interstationSec: room.interstationSec,
      });

      // Broadcast sanitized presence update to everyone in room
      io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, presence);
      console.log(`[ROOM_JOIN] Rider joined ${roomId} (Listeners: ${presence.listenersCount})`);
    });

    // 4. Room Leave
    socket.on(SOCKET_EVENTS.ROOM_LEAVE, (_payload: LeaveRoomPayload) => {
      performRoomLeave();
    });

    // 5. Room Resync request
    socket.on(SOCKET_EVENTS.ROOM_RESYNC, () => {
      const rider = presenceService.getRiderBySocket(socketId);
      const roomId = rider?.roomId;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      if (room) {
        socket.emit(SOCKET_EVENTS.ROOM_RESYNC, {
          stationIndex: room.stationIndex,
          track: room.track,
          startedAt: room.startedAt,
          serverTime: Date.now(),
          interstationSec: room.interstationSec,
        });
      }
    });

    // 6. Track Error Reporting from Client (Automatic Fallback Trigger)
    socket.on(SOCKET_EVENTS.TRACK_ERROR, (payload: { sourceId?: string; error?: string }) => {
      const rider = presenceService.getRiderBySocket(socketId);
      const roomId = rider?.roomId;
      if (!roomId) return;

      const presence = presenceService.getRoomPresence(roomId);
      console.warn(`[SOCKET] Track error reported by rider ${rider.publicId} in ${roomId}: ${payload?.error || payload?.sourceId}`);
      roomManager.reportTrackError(roomId, rider.publicId, presence.listenersCount);
    });

    // 7. Manual station advance: STRICTLY gated behind ENABLE_DEV_TOOLS
    socket.on(SOCKET_EVENTS.STATION_ADVANCE_MANUAL, () => {
      if (!CONFIG.ENABLE_DEV_TOOLS) {
        console.warn(`[DEV_GATE] Blocked manual station advance attempt from socket ${socketId}`);
        socket.emit('error:notice', { message: 'Manual station advance is disabled in production.' });
        return;
      }

      const rider = presenceService.getRiderBySocket(socketId);
      const roomId = rider?.roomId;
      if (roomId) {
        console.log(`[DEV_TOOL] Manual station advance triggered for room: ${roomId}`);
        roomManager.advanceStation(roomId);
      }
    });

    // 7. Chat Flow with Opaque Public IDs & Verification
    socket.on(SOCKET_EVENTS.CHAT_REQUEST, ({ toUserId }: { toUserId: string }) => {
      const fromRider = presenceService.getRiderBySocket(socketId);
      if (!fromRider || !fromRider.roomId) return;

      const toSocketId = presenceService.getSocketIdByPublicId(toUserId);
      if (!toSocketId) {
        socket.emit('chat:error', { error: 'Rider is no longer online.' });
        return;
      }

      const toRider = presenceService.getRiderBySocket(toSocketId);
      const result = chatService.createRequest({
        fromPublicId: fromRider.publicId,
        fromSocketId: socketId,
        fromUserName: fromRider.name,
        toPublicId: toUserId,
        toSocketId,
        fromRoomId: fromRider.roomId,
        toRoomId: toRider?.roomId,
      });

      if ('error' in result) {
        socket.emit('chat:error', { error: result.error });
        return;
      }

      // Notify target user via socket using opaque fromUserId
      io.to(toSocketId).emit(SOCKET_EVENTS.CHAT_REQUEST, {
        requestId: result.requestId,
        fromUserId: fromRider.publicId,
        fromUserName: fromRider.name,
        toUserId,
      });
      console.log(`[CHAT_REQUEST] ${fromRider.publicId} -> ${toUserId} in ${fromRider.roomId}`);
    });

    socket.on(SOCKET_EVENTS.CHAT_ACCEPT, ({ requestId }: { requestId: string }) => {
      const result = chatService.acceptRequest(requestId, socketId);
      if ('error' in result) {
        socket.emit('chat:error', { error: result.error });
        return;
      }

      // Notify only the two participants
      const payload: ChatAcceptPayload = { requestId, chatId: result.chatId };
      io.to(result.session.socketIds[0]).emit(SOCKET_EVENTS.CHAT_ACCEPT, payload);
      io.to(result.session.socketIds[1]).emit(SOCKET_EVENTS.CHAT_ACCEPT, payload);
      console.log(`[CHAT_ACCEPT] Session started: ${result.chatId}`);
    });

    socket.on(SOCKET_EVENTS.CHAT_DECLINE, ({ requestId }: { requestId: string }) => {
      const req = chatService.getRequest(requestId);
      if (req && req.toSocketId === socketId) {
        const fromSocketId = req.fromSocketId;
        chatService.declineRequest(requestId, socketId);
        io.to(fromSocketId).emit(SOCKET_EVENTS.CHAT_DECLINE, { requestId });
      }
    });

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (payload: { chatId: string; text: string }) => {
      if (!payload || !payload.chatId || !payload.text) return;

      const fromRider = presenceService.getRiderBySocket(socketId);
      if (!fromRider) return;

      // Rate limit check
      if (!chatService.checkMessageRateLimit(fromRider.publicId)) {
        socket.emit('chat:error', { error: 'Rate limit exceeded. Please wait a moment.' });
        return;
      }

      // Membership check
      if (!chatService.isSocketInChat(payload.chatId, socketId)) {
        socket.emit('chat:error', { error: 'You are not a participant in this conversation.' });
        return;
      }

      // Profanity moderation and length sanitization
      const { cleanText } = chatService.sanitizeMessage(payload.text);
      if (!cleanText) return;

      const partnerSocketId = chatService.getChatPartnerSocketId(payload.chatId, socketId);
      const messagePayload: ChatMessagePayload = {
        chatId: payload.chatId,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: fromRider.publicId, // Opaque public ID
        text: cleanText,
        timestamp: Date.now(),
      };

      socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, messagePayload);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit(SOCKET_EVENTS.CHAT_MESSAGE, messagePayload);
      }
    });

    socket.on(SOCKET_EVENTS.CHAT_END, ({ chatId }: { chatId: string }) => {
      const session = chatService.endChat(chatId, socketId);
      if (session) {
        const payload: ChatEndPayload = { chatId, reason: 'Chat ended by participant' };
        io.to(session.socketIds[0]).emit(SOCKET_EVENTS.CHAT_END, payload);
        io.to(session.socketIds[1]).emit(SOCKET_EVENTS.CHAT_END, payload);
        console.log(`[CHAT_END] ${chatId} closed`);
      }
    });

    socket.on(SOCKET_EVENTS.USER_BLOCK, ({ targetUserId }: UserBlockPayload) => {
      const rider = presenceService.getRiderBySocket(socketId);
      if (rider && targetUserId) {
        chatService.blockUser(rider.publicId, targetUserId);
        socket.emit('user:blocked', { targetUserId });
      }
    });

    socket.on(SOCKET_EVENTS.USER_REPORT, ({ targetUserId, reason }: UserReportPayload) => {
      const rider = presenceService.getRiderBySocket(socketId);
      if (rider && targetUserId) {
        const { isMuted } = chatService.addReport(rider.publicId, targetUserId, reason);
        socket.emit('user:reported', { targetUserId });
        if (isMuted) {
          const targetSocketId = presenceService.getSocketIdByPublicId(targetUserId);
          if (targetSocketId) {
            io.to(targetSocketId).emit('error:notice', {
              message: 'Your account has been temporarily muted due to multiple commuter reports.',
            });
          }
        }
      }
    });

    // 8. Disconnect handling: Scoped notifications only! Never io.emit!
    socket.on('disconnect', () => {
      // End active chats and notify ONLY the other participant
      const endedChats = chatService.handleDisconnect(socketId);
      for (const item of endedChats) {
        io.to(item.partnerSocketId).emit(SOCKET_EVENTS.CHAT_END, {
          chatId: item.chatId,
          reason: 'Participant disconnected',
        });
      }

      // Clean up room presence and close room if empty
      const { roomId } = presenceService.removeUser(socketId);
      if (roomId) {
        const presence = presenceService.getRoomPresence(roomId);
        io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, presence);
        roomManager.removeRoomIfEmpty(roomId, presence.listenersCount);
      }
      console.log(`[SOCKET] User disconnected: socket=${socketId}`);
    });
  });
}
