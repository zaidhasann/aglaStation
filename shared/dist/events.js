"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS = void 0;
// Socket event names used across client and server
exports.SOCKET_EVENTS = {
    // Time sync
    TIME_PING: 'time:ping',
    TIME_PONG: 'time:pong',
    // Room lifecycle & sync
    ROOM_JOIN: 'room:join',
    ROOM_LEAVE: 'room:leave',
    ROOM_STATE: 'room:state',
    ROOM_RESYNC: 'room:resync',
    STATION_ADVANCE: 'station:advance',
    STATION_ADVANCE_MANUAL: 'station:advance_manual',
    // Presence & Identity
    PRESENCE_UPDATE: 'presence:update',
    PROFILE_SET_NAME: 'profile:setName',
    // Chat & Moderation
    CHAT_REQUEST: 'chat:request',
    CHAT_ACCEPT: 'chat:accept',
    CHAT_DECLINE: 'chat:decline',
    CHAT_MESSAGE: 'chat:message',
    CHAT_END: 'chat:end',
    USER_BLOCK: 'user:block',
    USER_REPORT: 'user:report',
};
//# sourceMappingURL=events.js.map