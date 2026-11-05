import { Track } from 'agla-station-shared';
import songsData from '../../data/songs.json';
import fs from 'fs';
import path from 'path';

interface SongEntry {
  id: string;
  provider: 'youtube' | 'audio-url';
  sourceId: string;
  title: string;
  artist?: string;
  durationSec: number;
  startOffsetSec?: number;
  playSec?: number;
  isLiveStream?: boolean;
}

const songsMap: Record<string, SongEntry> = songsData as Record<string, SongEntry>;

// Safe royalty-free / verified fallback tracks if a song fails to embed
const FALLBACK_TRACKS: Track[] = [
  {
    id: 'fallback-1',
    provider: 'youtube',
    sourceId: 'jfKfPfyJRdk', // Lofi girl peaceful instrumental
    title: 'Delhi Metro Ambient Chill',
    artist: 'Metro Sound Labs',
    durationSec: 180,
    startOffsetSec: 0,
    playSec: 120,
    isLiveStream: false,
  },
  {
    id: 'fallback-2',
    provider: 'youtube',
    sourceId: '5qap5aO4i9A', // Lofi hip hop beats
    title: 'Yamuna Evening Beats',
    artist: 'Antigravity Studio',
    durationSec: 210,
    startOffsetSec: 10,
    playSec: 120,
    isLiveStream: false,
  },
];

// Load Violet line tracks dynamically from playlist extract if available
let violetTracks: { sourceId: string; title: string; artist?: string; durationSec?: number }[] = [];
try {
  const p = path.resolve(__dirname, '../../violet_tracks.json');
  if (fs.existsSync(p)) {
    violetTracks = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load violet_tracks.json', e);
}

/**
 * Music-source abstraction: retrieves the Track for a given station, line, and segment duration.
 * Slices playback via startOffsetSec and playSec matching interstation transit.
 */
export function getTrack(stationId: string, lineId?: string, stationIndex: number = 0, interstationSec: number = 120): Track {
  let baseTrack: Track;

  // If ride is on Violet line and we have playlist tracks
  if (lineId === 'violet' && violetTracks.length > 0) {
    const trackItem = violetTracks[stationIndex % violetTracks.length];
    baseTrack = {
      id: `violet-${stationId}-${trackItem.sourceId}`,
      provider: 'youtube',
      sourceId: trackItem.sourceId,
      title: trackItem.title,
      artist: trackItem.artist || '90s Bollywood Hits',
      durationSec: trackItem.durationSec || 210,
      startOffsetSec: 15, // Skip intro silence/branding
      playSec: interstationSec,
      isLiveStream: false,
    };
  } else {
    const song = songsMap[stationId] || songsMap['default'];
    baseTrack = {
      id: song.id,
      provider: song.provider,
      sourceId: song.sourceId,
      title: song.title,
      artist: song.artist || 'Metro Soundtracks',
      durationSec: song.durationSec || 180,
      startOffsetSec: song.startOffsetSec || 0,
      playSec: interstationSec,
      isLiveStream: false,
    };
  }

  // Refuse live streams (cannot be deterministically synchronized across riders)
  if (baseTrack.isLiveStream) {
    return getFallbackTrack(0, interstationSec);
  }

  return baseTrack;
}

export function getFallbackTrack(fallbackIndex = 0, interstationSec: number = 120): Track {
  const fb = FALLBACK_TRACKS[fallbackIndex % FALLBACK_TRACKS.length];
  return {
    ...fb,
    playSec: interstationSec,
  };
}
