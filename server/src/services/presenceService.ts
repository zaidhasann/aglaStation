import { PresenceRider } from 'agla-station-shared';

const PROFANITY_WORDS = ['badword', 'curse', 'abuse', 'hate', 'spam'];

export interface InternalRider extends PresenceRider {
  roomId?: string;
}

export class PresenceService {
  // socketId -> rider details
  private socketRiders: Map<string, InternalRider> = new Map();
  // roomId -> Set of socketIds
  private roomMembers: Map<string, Set<string>> = new Map();

  public registerUser(socketId: string, initialName?: string, stationId?: string): InternalRider {
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const defaultName = `Anonymous Rider #${randomHex}`;
    const name = this.sanitizeName(initialName) || defaultName;

    const rider: InternalRider = {
      id: socketId,
      name,
      stationId,
    };
    this.socketRiders.set(socketId, rider);
    return rider;
  }

  public sanitizeName(name?: string): string | null {
    if (!name) return null;
    let clean = name.trim().slice(0, 20);
    if (clean.length < 2) return null;

    // Basic profanity filter
    for (const word of PROFANITY_WORDS) {
      const regex = new RegExp(word, 'gi');
      clean = clean.replace(regex, '***');
    }
    return clean;
  }

  public updateUserName(socketId: string, rawName: string): string | null {
    const sanitized = this.sanitizeName(rawName);
    if (!sanitized) return null;

    const rider = this.socketRiders.get(socketId);
    if (rider) {
      rider.name = sanitized;
      return sanitized;
    }
    return null;
  }

  public joinRoom(socketId: string, roomId: string, stationId?: string) {
    this.leaveRoom(socketId);

    const rider: InternalRider = this.socketRiders.get(socketId) || this.registerUser(socketId);
    rider.roomId = roomId;
    if (stationId) rider.stationId = stationId;

    if (!this.roomMembers.has(roomId)) {
      this.roomMembers.set(roomId, new Set());
    }
    this.roomMembers.get(roomId)!.add(socketId);
  }

  public leaveRoom(socketId: string): string | undefined {
    const rider = this.socketRiders.get(socketId);
    if (!rider || !rider.roomId) return undefined;

    const roomId = rider.roomId;
    rider.roomId = undefined;

    const members = this.roomMembers.get(roomId);
    if (members) {
      members.delete(socketId);
      if (members.size === 0) {
        this.roomMembers.delete(roomId);
      }
    }
    return roomId;
  }

  public removeUser(socketId: string): string | undefined {
    const roomId = this.leaveRoom(socketId);
    this.socketRiders.delete(socketId);
    return roomId;
  }

  public getRider(socketId: string): InternalRider | undefined {
    return this.socketRiders.get(socketId);
  }

  public getRoomPresence(roomId: string): {
    listenersCount: number;
    stationCounts: Record<string, number>;
    riders: PresenceRider[];
  } {
    const members = this.roomMembers.get(roomId) || new Set();
    const stationCounts: Record<string, number> = {};
    const riders: PresenceRider[] = [];

    for (const socketId of members) {
      const rider = this.socketRiders.get(socketId);
      if (rider) {
        riders.push({ id: rider.id, name: rider.name, stationId: rider.stationId });
        if (rider.stationId) {
          stationCounts[rider.stationId] = (stationCounts[rider.stationId] || 0) + 1;
        }
      }
    }

    return {
      listenersCount: members.size,
      stationCounts,
      riders,
    };
  }
}
