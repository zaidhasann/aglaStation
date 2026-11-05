"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrack = getTrack;
const songs_json_1 = __importDefault(require("../../data/songs.json"));
const songsMap = songs_json_1.default;
/**
 * Music-source abstraction: retrieves the Track for a given station.
 * Extensible to other providers (royalty-free audio, stream URLs, etc.)
 */
function getTrack(stationId) {
    const song = songsMap[stationId] || songsMap['default'];
    return {
        id: song.id,
        provider: song.provider,
        sourceId: song.sourceId,
        title: song.title,
        durationSec: song.durationSec || 180,
    };
}
