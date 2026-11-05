"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceService = void 0;
const PROFANITY_WORDS = ['badword', 'curse', 'abuse', 'hate', 'spam'];
class PresenceService {
    // socketId -> rider details
    socketRiders = new Map();
    // roomId -> Set of socketIds
    roomMembers = new Map();
    registerUser(socketId, initialName, stationId) {
        const randomHex = Math.floor(1000 + Math.random() * 9000);
        const defaultName = `Anonymous Rider #${randomHex}`;
        const name = this.sanitizeName(initialName) || defaultName;
        const rider = {
            id: socketId,
            name,
            stationId,
        };
        this.socketRiders.set(socketId, rider);
        return rider;
    }
    sanitizeName(name) {
        if (!name)
            return null;
        let clean = name.trim().slice(0, 20);
        if (clean.length < 2)
            return null;
        // Basic profanity filter
        for (const word of PROFANITY_WORDS) {
            const regex = new RegExp(word, 'gi');
            clean = clean.replace(regex, '***');
        }
        return clean;
    }
    updateUserName(socketId, rawName) {
        const sanitized = this.sanitizeName(rawName);
        if (!sanitized)
            return null;
        const rider = this.socketRiders.get(socketId);
        if (rider) {
            rider.name = sanitized;
            return sanitized;
        }
        return null;
    }
    joinRoom(socketId, roomId, stationId) {
        this.leaveRoom(socketId);
        const rider = this.socketRiders.get(socketId) || this.registerUser(socketId);
        rider.roomId = roomId;
        if (stationId)
            rider.stationId = stationId;
        if (!this.roomMembers.has(roomId)) {
            this.roomMembers.set(roomId, new Set());
        }
        this.roomMembers.get(roomId).add(socketId);
    }
    leaveRoom(socketId) {
        const rider = this.socketRiders.get(socketId);
        if (!rider || !rider.roomId)
            return undefined;
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
    removeUser(socketId) {
        const roomId = this.leaveRoom(socketId);
        this.socketRiders.delete(socketId);
        return roomId;
    }
    getRider(socketId) {
        return this.socketRiders.get(socketId);
    }
    getRoomPresence(roomId) {
        const members = this.roomMembers.get(roomId) || new Set();
        const stationCounts = {};
        const riders = [];
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
exports.PresenceService = PresenceService;
