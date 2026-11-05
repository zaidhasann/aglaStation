export type Direction = 'up' | 'down';

export interface Station {
  id: string;
  name: string;
  hindi?: string;
  interstationSec?: number; // Travel time from this station to the next in seconds (default 120s)
  x?: number;
  y?: number;
}

export interface MetroLine {
  id: string;
  name: string;
  color: string;
  stations: Station[];
}

export type TrackProvider = 'youtube' | 'audio-url';

export interface Track {
  id: string;
  provider: TrackProvider;
  sourceId: string;
  title?: string;
  artist?: string;
  durationSec?: number;
  startOffsetSec?: number;
  playSec?: number;
  license?: string;
  attributionText?: string;
  sourceUrl?: string;
  isLiveStream?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  startStationId?: string;
  destStationId?: string;
}

export interface RoomInfo {
  roomId: string; // e.g. "yellow:up"
  lineId: string;
  direction: Direction;
}

export interface RoomStatePayload {
  room: RoomInfo;
  stationIndex: number;
  currentStation: Station;
  nextStation: Station | null;
  track: Track;
  startedAt: number; // Server epoch ms
  serverTime: number; // Server current epoch ms
  listenersCount: number;
  stationCounts: Record<string, number>;
  interstationSec?: number;
}

export interface RoomResyncPayload {
  stationIndex: number;
  track: Track;
  startedAt: number;
  serverTime: number;
  interstationSec?: number;
}

export interface StationAdvancePayload {
  stationIndex: number;
  currentStation: Station;
  nextStation: Station | null;
  track: Track;
  startedAt: number;
  serverTime: number;
  interstationSec?: number;
}

export interface PresenceRider {
  id: string; // Opaque public ID (not raw socket ID)
  name: string;
}

export interface PresenceUpdatePayload {
  listenersCount: number;
  stationCounts: Record<string, number>; // Station ID -> count of riders getting off here
  riders: PresenceRider[];
}

export interface JoinRoomPayload {
  lineId: string;
  direction: Direction;
  startStationId: string;
  destStationId: string;
  name?: string;
}

export interface LeaveRoomPayload {
  roomId?: string;
}

export interface TimePingPayload {
  clientSendTime: number;
}

export interface TimePongPayload {
  clientSendTime: number;
  serverTime: number;
}

// Chat Types
export interface ChatRequestPayload {
  requestId: string;
  fromUserId: string; // Opaque public ID
  fromUserName: string;
  toUserId: string; // Opaque public ID
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
  senderId: string; // Opaque public ID
  text: string;
  timestamp: number;
}

export interface ChatEndPayload {
  chatId: string;
  reason?: string;
}

export interface UserBlockPayload {
  targetUserId: string; // Opaque public ID
}

export interface UserReportPayload {
  targetUserId: string; // Opaque public ID
  reason: string;
}

export interface TrackErrorPayload {
  sourceId: string;
  stationId: string;
  lineId: string;
  error?: string;
}
