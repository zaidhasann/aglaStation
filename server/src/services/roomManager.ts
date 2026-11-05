import { MetroLine, Station, Direction, Track } from 'agla-station-shared';
import linesData from '../../data/lines.json';
import { getTrack, getFallbackTrack } from './trackService';

const linesMap = linesData as Record<string, MetroLine>;

export interface ActiveRoom {
  roomId: string;
  lineId: string;
  direction: Direction;
  stationIndex: number;
  track: Track;
  startedAt: number; // Server epoch ms
  interstationSec: number;
  timer?: NodeJS.Timeout;
  errorReports: Set<string>; // Set of user public IDs who reported error for current track
}

export class RoomManager {
  private rooms: Map<string, ActiveRoom> = new Map();
  private defaultAdvanceIntervalMs: number;
  private onStationAdvanceCallback?: (room: ActiveRoom, current: Station, next: Station | null) => void;
  private onTrackFallbackCallback?: (room: ActiveRoom, fallbackTrack: Track) => void;

  constructor(defaultAdvanceIntervalMs: number = 120000) {
    this.defaultAdvanceIntervalMs = defaultAdvanceIntervalMs;
  }

  public setOnAdvance(cb: (room: ActiveRoom, current: Station, next: Station | null) => void) {
    this.onStationAdvanceCallback = cb;
  }

  public setOnTrackFallback(cb: (room: ActiveRoom, fallbackTrack: Track) => void) {
    this.onTrackFallbackCallback = cb;
  }

  public static getRoomId(lineId: string, direction: Direction): string {
    return `${lineId}:${direction}`;
  }

  public getLine(lineId: string): MetroLine | undefined {
    return linesMap[lineId];
  }

  public validateJourney(params: {
    lineId: string;
    direction: Direction;
    startStationId: string;
    destStationId: string;
  }): { isValid: boolean; error?: string } {
    const { lineId, direction, startStationId, destStationId } = params;

    const line = this.getLine(lineId);
    if (!line) {
      return { isValid: false, error: `Invalid line '${lineId}'` };
    }

    if (direction !== 'up' && direction !== 'down') {
      return { isValid: false, error: `Invalid direction '${direction}'` };
    }

    const stations = this.getOrderedStations(lineId, direction);
    const startIndex = stations.findIndex((s) => s.id === startStationId);
    const destIndex = stations.findIndex((s) => s.id === destStationId);

    if (startIndex === -1) {
      return { isValid: false, error: `Start station '${startStationId}' does not exist on ${line.name}` };
    }

    if (destIndex === -1) {
      return { isValid: false, error: `Destination station '${destStationId}' does not exist on ${line.name}` };
    }

    if (startIndex >= destIndex) {
      return {
        isValid: false,
        error: `Destination '${destStationId}' must come after start '${startStationId}' in the '${direction}' direction`,
      };
    }

    return { isValid: true };
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

  public getOrCreateRoom(lineId: string, direction: Direction): ActiveRoom | null {
    const line = this.getLine(lineId);
    if (!line || (direction !== 'up' && direction !== 'down')) {
      return null;
    }

    const roomId = RoomManager.getRoomId(lineId, direction);
    let room = this.rooms.get(roomId);

    if (!room) {
      const stations = this.getOrderedStations(lineId, direction);
      const stationIndex = 0;
      const initialStation = stations[stationIndex] || { id: 'default', name: 'Starting Station' };
      const interstationSec = initialStation.interstationSec || Math.round(this.defaultAdvanceIntervalMs / 1000);
      const track = getTrack(initialStation.id, lineId, stationIndex, interstationSec);

      room = {
        roomId,
        lineId,
        direction,
        stationIndex,
        track,
        startedAt: Date.now(),
        interstationSec,
        errorReports: new Set(),
      };

      this.rooms.set(roomId, room);
      this.scheduleRoomTimer(room);
      console.log(`[RoomManager] Initialized active room: ${roomId} (Segment: ${interstationSec}s)`);
    }

    return room;
  }

  public getRoom(roomId: string): ActiveRoom | undefined {
    return this.rooms.get(roomId);
  }

  private scheduleRoomTimer(room: ActiveRoom) {
    if (room.timer) {
      clearTimeout(room.timer);
    }

    const durationMs = (room.interstationSec || 120) * 1000;
    room.timer = setTimeout(() => {
      this.advanceStation(room.roomId);
    }, durationMs);
  }

  /**
   * Terminus-to-Terminus reversing logic:
   * When the train reaches the final station in its direction:
   * It reaches terminus, reverses direction, resets to the first departure station.
   */
  public advanceStation(roomId: string): { current: Station; next: Station | null; track: Track; interstationSec: number } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const stations = this.getOrderedStations(room.lineId, room.direction);
    if (stations.length === 0) return null;

    // Reset error reports on station advance
    room.errorReports.clear();

    const nextIndex = room.stationIndex + 1;

    if (nextIndex >= stations.length) {
      // Reached terminus! Reverse direction
      console.log(`[RoomManager] Terminus reached on ${room.roomId}. Reversing train direction.`);
      room.direction = room.direction === 'up' ? 'down' : 'up';
      room.roomId = RoomManager.getRoomId(room.lineId, room.direction);
      room.stationIndex = 0;
    } else {
      room.stationIndex = nextIndex;
    }

    const currentStations = this.getOrderedStations(room.lineId, room.direction);
    const current = currentStations[room.stationIndex] || currentStations[0];
    const following = currentStations[room.stationIndex + 1] || null;

    // Segment duration from current station
    room.interstationSec = current.interstationSec || Math.round(this.defaultAdvanceIntervalMs / 1000);
    room.track = getTrack(current.id, room.lineId, room.stationIndex, room.interstationSec);
    room.startedAt = Date.now();

    this.scheduleRoomTimer(room);

    if (this.onStationAdvanceCallback) {
      this.onStationAdvanceCallback(room, current, following);
    }

    return { current, next: following, track: room.track, interstationSec: room.interstationSec };
  }

  /**
   * Records a track playback error report from a client.
   * If >= 2 distinct users (or > 50% of room listeners) report an error,
   * dynamically substitutes a safe fallback track for everyone in the room.
   */
  public reportTrackError(roomId: string, userPublicId: string, listenerCount: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.errorReports.add(userPublicId);
    const threshold = Math.min(2, Math.max(1, Math.ceil(listenerCount * 0.4)));

    if (room.errorReports.size >= threshold && !room.track.id.startsWith('fallback-')) {
      console.warn(`[TrackService] Error threshold reached (${room.errorReports.size} reports) for track ${room.track.sourceId} in ${roomId}. Swapping fallback track.`);
      room.track = getFallbackTrack(0, room.interstationSec);
      room.startedAt = Date.now();

      if (this.onTrackFallbackCallback) {
        this.onTrackFallbackCallback(room, room.track);
      }
      return true;
    }
    return false;
  }

  public getRoomStationDetails(room: ActiveRoom): { currentStation: Station; nextStation: Station | null } {
    const stations = this.getOrderedStations(room.lineId, room.direction);
    const currentStation = stations[room.stationIndex] || { id: 'unknown', name: 'Unknown' };
    const nextStation = stations[room.stationIndex + 1] || null;
    return { currentStation, nextStation };
  }

  public removeRoomIfEmpty(roomId: string, listenerCount: number) {
    if (listenerCount <= 0) {
      const room = this.rooms.get(roomId);
      if (room) {
        if (room.timer) {
          clearTimeout(room.timer);
        }
        this.rooms.delete(roomId);
        console.log(`[RoomManager] Closed empty room: ${roomId}`);
      }
    }
  }
}
