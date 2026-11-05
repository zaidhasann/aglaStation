"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const lines_json_1 = __importDefault(require("../../data/lines.json"));
const trackService_1 = require("./trackService");
const linesMap = lines_json_1.default;
class RoomManager {
    rooms = new Map();
    advanceIntervalMs;
    onStationAdvanceCallback;
    constructor(advanceIntervalMs = 120000) {
        this.advanceIntervalMs = advanceIntervalMs;
    }
    setOnAdvance(cb) {
        this.onStationAdvanceCallback = cb;
    }
    static getRoomId(lineId, direction) {
        return `${lineId}:${direction}`;
    }
    getLine(lineId) {
        return linesMap[lineId];
    }
    getOrderedStations(lineId, direction) {
        const line = this.getLine(lineId);
        if (!line)
            return [];
        const stations = [...line.stations];
        if (direction === 'down') {
            stations.reverse();
        }
        return stations;
    }
    getOrCreateRoom(lineId, direction) {
        const roomId = RoomManager.getRoomId(lineId, direction);
        let room = this.rooms.get(roomId);
        if (!room) {
            const stations = this.getOrderedStations(lineId, direction);
            const stationIndex = 0;
            const initialStation = stations[stationIndex] || { id: 'default', name: 'Starting Station' };
            const track = (0, trackService_1.getTrack)(initialStation.id);
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
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    startRoomTimer(room) {
        if (room.timer) {
            clearInterval(room.timer);
        }
        room.timer = setInterval(() => {
            this.advanceStation(room.roomId);
        }, this.advanceIntervalMs);
    }
    advanceStation(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return null;
        const stations = this.getOrderedStations(room.lineId, room.direction);
        if (stations.length === 0)
            return null;
        // Advance station; loop if reached terminus
        room.stationIndex = (room.stationIndex + 1) % stations.length;
        const current = stations[room.stationIndex];
        const nextIndex = (room.stationIndex + 1) % stations.length;
        const next = stations[nextIndex];
        room.track = (0, trackService_1.getTrack)(current.id);
        room.startedAt = Date.now();
        if (this.onStationAdvanceCallback) {
            this.onStationAdvanceCallback(room, current, next);
        }
        return { current, next, track: room.track };
    }
    getRoomStationDetails(room) {
        const stations = this.getOrderedStations(room.lineId, room.direction);
        const currentStation = stations[room.stationIndex] || { id: 'unknown', name: 'Unknown' };
        const nextIndex = (room.stationIndex + 1) % stations.length;
        const nextStation = stations[nextIndex] || null;
        return { currentStation, nextStation };
    }
    removeRoomIfEmpty(roomId, listenerCount) {
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
exports.RoomManager = RoomManager;
