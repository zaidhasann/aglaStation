export type Direction = 'up' | 'down';
export interface Station {
    id: string;
    name: string;
    hindi?: string;
    x?: number;
    y?: number;
}
export interface MetroLine {
    id: string;
    name: string;
    color: string;
    bgGradient?: string;
    borderColor?: string;
    textColor?: string;
    accentColor?: string;
    stations: Station[];
}
export type TrackProvider = 'youtube' | 'audio-url';
export interface Track {
    id: string;
    provider: TrackProvider;
    sourceId: string;
    title?: string;
    durationSec?: number;
}
export interface UserProfile {
    id: string;
    name: string;
    startStationId?: string;
    destStationId?: string;
}
export interface RoomInfo {
    roomId: string;
    lineId: string;
    direction: Direction;
}
export interface RoomStatePayload {
    room: RoomInfo;
    stationIndex: number;
    currentStation: Station;
    nextStation: Station | null;
    track: Track;
    startedAt: number;
    serverTime: number;
    listenersCount: number;
    stationCounts: Record<string, number>;
}
export interface RoomResyncPayload {
    stationIndex: number;
    track: Track;
    startedAt: number;
    serverTime: number;
}
export interface StationAdvancePayload {
    stationIndex: number;
    currentStation: Station;
    nextStation: Station | null;
    track: Track;
    startedAt: number;
    serverTime: number;
}
export interface PresenceRider {
    id: string;
    name: string;
    stationId?: string;
}
export interface PresenceUpdatePayload {
    listenersCount: number;
    stationCounts: Record<string, number>;
    riders: PresenceRider[];
}
export interface JoinRoomPayload {
    lineId: string;
    direction: Direction;
    startStationId: string;
    destStationId: string;
    name?: string;
}
export interface TimePingPayload {
    clientSendTime: number;
}
export interface TimePongPayload {
    clientSendTime: number;
    serverTime: number;
}
export interface ChatRequestPayload {
    requestId: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
}
export interface ChatAcceptPayload {
    requestId: string;
    chatId: string;
}
export interface ChatDeclinePayload {
    requestId: string;
}
export interface ChatMessagePayload {
    chatId: string;
    messageId: string;
    senderId: string;
    text: string;
    timestamp: number;
}
export interface ChatEndPayload {
    chatId: string;
    reason?: string;
}
export interface UserBlockPayload {
    targetUserId: string;
}
export interface UserReportPayload {
    targetUserId: string;
    reason: string;
}
//# sourceMappingURL=types.d.ts.map