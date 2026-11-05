export declare const SOCKET_EVENTS: {
    readonly TIME_PING: "time:ping";
    readonly TIME_PONG: "time:pong";
    readonly ROOM_JOIN: "room:join";
    readonly ROOM_LEAVE: "room:leave";
    readonly ROOM_STATE: "room:state";
    readonly ROOM_RESYNC: "room:resync";
    readonly STATION_ADVANCE: "station:advance";
    readonly STATION_ADVANCE_MANUAL: "station:advance_manual";
    readonly PRESENCE_UPDATE: "presence:update";
    readonly PROFILE_SET_NAME: "profile:setName";
    readonly CHAT_REQUEST: "chat:request";
    readonly CHAT_ACCEPT: "chat:accept";
    readonly CHAT_DECLINE: "chat:decline";
    readonly CHAT_MESSAGE: "chat:message";
    readonly CHAT_END: "chat:end";
    readonly USER_BLOCK: "user:block";
    readonly USER_REPORT: "user:report";
};
export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
//# sourceMappingURL=events.d.ts.map