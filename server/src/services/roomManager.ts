import { MetroLine, Station, Direction, Track } from 'agla-station-shared';
import linesData from '../../data/lines.json';
import { getTrack } from './trackService';

const linesMap = linesData as Record<string, MetroLine>;

export interface ActiveRoom {
  roomId: string;
  lineId: string;
  direction: Direction;
  stationIndex: number;
  track: Track;
  startedAt: number; // Server epoch ms
  timer?: NodeJS.Timeout;
}

export class RoomManager {
  private rooms: Map<string, ActiveRoom> = new Map();
  private advanceIntervalMs: number;
  private onStationAdvanceCallback?: (room: ActiveRoom, current: Station, next: Station | null) => void;

  constructor(advanceIntervalMs: number = 120000) {
    this.advanceIntervalMs = advanceIntervalMs;
  }

  public setOnAdvance(cb: (room: ActiveRoom, current: Station, next: Station | null) => void) {
    this.onStationAdvanceCallback = cb;
  }

  public static getRoomId(lineId: string, direction: Direction): string {
    return `${lineId}:${direction}`;
  }

  public getLine(lineId: string): MetroLine | undefined {
    return linesMap[lineId];
  }

  public getOrderedStations(lineId: string, direction: Direction): Station[] {
    const line = this.getLine(lineId);
    if (!line) return [];
    const stations = [...line.stations];
    if (direction === 'down') {
      stations.reverse();
    }
    return stations;
  }

  public getOrCreateRoom(lineId: string, direction: Direction): ActiveRoom {
    const roomId = RoomManager.getRoomId(lineId, direction);
    let room = this.rooms.get(roomId);

    if (!room) {
      const stations = this.getOrderedStations(lineId, direction);
      const stationIndex = 0;
      const initialStation = stations[stationIndex] || { id: 'default', name: 'Starting Station' };
      const track = getTrack(initialStation.id, lineId, stationIndex);

      room = {
        roomId,
        lineId,
        direction,
        stationIndex,
        track,
        startedAt: Date.now(),
      };

      this.rooms.set(roomId, room);
      this.startRoomTimer(room);
    }

    return room;
  }

  public getRoom(roomId: string): ActiveRoom | undefined {
    return this.rooms.get(roomId);
  }

  private startRoomTimer(room: ActiveRoom) {
    if (room.timer) {
      clearInterval(room.timer);
    }

    room.timer = setInterval(() => {
      this.advanceStation(room.roomId);
    }, this.advanceIntervalMs);
  }

  public advanceStation(roomId: string): { current: Station; next: Station | null; track: Track } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const stations = this.getOrderedStations(room.lineId, room.direction);
    if (stations.length === 0) return null;

    // Advance station; loop if reached terminus
    room.stationIndex = (room.stationIndex + 1) % stations.length;
    const current = stations[room.stationIndex];
    const nextIndex = (room.stationIndex + 1) % stations.length;
    const next = stations[nextIndex];

    room.track = getTrack(current.id, room.lineId, room.stationIndex);
    room.startedAt = Date.now();

    if (this.onStationAdvanceCallback) {
      this.onStationAdvanceCallback(room, current, next);
    }

    return { current, next, track: room.track };
  }

  public getRoomStationDetails(room: ActiveRoom): { currentStation: Station; nextStation: Station | null } {
    const stations = this.getOrderedStations(room.lineId, room.direction);
    const currentStation = stations[room.stationIndex] || { id: 'unknown', name: 'Unknown' };
    const nextIndex = (room.stationIndex + 1) % stations.length;
    const nextStation = stations[nextIndex] || null;
    return { currentStation, nextStation };
  }

  public removeRoomIfEmpty(roomId: string, listenerCount: number) {
    if (listenerCount <= 0) {
      const room = this.rooms.get(roomId);
      if (room) {
        if (room.timer) {
          clearInterval(room.timer);
        }
        this.rooms.delete(roomId);
      }
    }
  }
}
