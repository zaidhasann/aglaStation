import { PresenceRider } from 'agla-station-shared';
import crypto from 'crypto';
import { containsProfanity } from './moderation';

export interface InternalRider {
  socketId: string;
  publicId: string; // Opaque public ID shared with other clients
  name: string;
  roomId?: string;
  startStationId?: string;
  destStationId?: string;
}

export class PresenceService {
  // socketId -> InternalRider
  private socketRiders: Map<string, InternalRider> = new Map();
  // publicId -> socketId
  private publicIdToSocketId: Map<string, string> = new Map();
  // roomId -> Set of socketIds
  private roomMembers: Map<string, Set<string>> = new Map();

  public registerUser(socketId: string, initialName?: string, startStationId?: string, destStationId?: string): InternalRider {
    // Generate an opaque, cryptographically random public ID
    const publicId = `rider_${crypto.randomBytes(4).toString('hex')}`;
    const defaultName = `Rider ${publicId.slice(-4).toUpperCase()}`;

    let name = defaultName;
    if (initialName && !containsProfanity(initialName)) {
      name = initialName.trim().slice(0, 24);
    }

    const rider: InternalRider = {
      socketId,
      publicId,
      name,
      startStationId,
      destStationId,
    };

    this.socketRiders.set(socketId, rider);
    this.publicIdToSocketId.set(publicId, socketId);
    return rider;
  }

  public updateUserName(socketId: string, rawName: string): string | null {
    if (!rawName) return null;
    const clean = rawName.trim().slice(0, 24);
    if (clean.length < 2) return null;

    if (containsProfanity(clean)) {
      return null;
    }

    const rider = this.socketRiders.get(socketId);
    if (rider) {
      rider.name = clean;
      return clean;
    }
    return null;
  }

  public joinRoom(socketId: string, roomId: string, startStationId?: string, destStationId?: string) {
    this.leaveRoom(socketId);

    let rider = this.socketRiders.get(socketId);
    if (!rider) {
      rider = this.registerUser(socketId, undefined, startStationId, destStationId);
    } else {
      rider.startStationId = startStationId;
      rider.destStationId = destStationId;
    }

    rider.roomId = roomId;

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

  public removeUser(socketId: string): { roomId?: string; publicId?: string } {
    const roomId = this.leaveRoom(socketId);
    const rider = this.socketRiders.get(socketId);
    const publicId = rider?.publicId;

    if (publicId) {
      this.publicIdToSocketId.delete(publicId);
    }
    this.socketRiders.delete(socketId);
    return { roomId, publicId };
  }

  public getRiderBySocket(socketId: string): InternalRider | undefined {
    return this.socketRiders.get(socketId);
  }

  public getSocketIdByPublicId(publicId: string): string | undefined {
    return this.publicIdToSocketId.get(publicId);
  }

  public getPublicId(socketId: string): string | undefined {
    return this.socketRiders.get(socketId)?.publicId;
  }

  /**
   * Safe Presence: Exposes ONLY opaque publicId and display name.
   * Never leaks boarding stations (startStationId) or raw socket IDs to peers.
   */
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
        riders.push({
          id: rider.publicId, // Opaque identifier
          name: rider.name,
        });

        // Station counts count riders getting off at each destination
        const dest = rider.destStationId;
        if (dest) {
          stationCounts[dest] = (stationCounts[dest] || 0) + 1;
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
