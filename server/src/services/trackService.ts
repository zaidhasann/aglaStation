import { Track } from 'agla-station-shared';
import songsData from '../../data/songs.json';
import fs from 'fs';
import path from 'path';

interface SongEntry {
  id: string;
  provider: 'youtube' | 'audio-url';
  sourceId: string;
  title: string;
  durationSec: number;
}

const songsMap: Record<string, SongEntry> = songsData as Record<string, SongEntry>;

// Load Violet line tracks dynamically from playlist extract if available
let violetTracks: { sourceId: string; title: string; durationSec?: number }[] = [];
try {
  const p = path.resolve(__dirname, '../../violet_tracks.json');
  if (fs.existsSync(p)) {
    violetTracks = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load violet_tracks.json', e);
}

/**
 * Music-source abstraction: retrieves the Track for a given station and line.
 */
export function getTrack(stationId: string, lineId?: string, stationIndex: number = 0): Track {
  // If ride is on Violet line and we have playlist tracks
  if (lineId === 'violet' && violetTracks.length > 0) {
    const trackItem = violetTracks[stationIndex % violetTracks.length];
    return {
      id: `violet-${stationId}-${trackItem.sourceId}`,
      provider: 'youtube',
      sourceId: trackItem.sourceId,
      title: trackItem.title,
      durationSec: trackItem.durationSec || 210,
    };
  }

  const song = songsMap[stationId] || songsMap['default'];
  return {
    id: song.id,
    provider: song.provider,
    sourceId: song.sourceId,
    title: song.title,
    durationSec: song.durationSec || 180,
  };
}
