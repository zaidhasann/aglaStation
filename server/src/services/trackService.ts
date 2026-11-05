import { Track } from 'agla-station-shared';
import tracksData from '../../data/tracks.json';
import fs from 'fs';
import path from 'path';

export interface CatalogueTrack {
  id: string;
  provider: 'youtube' | 'audio-url';
  sourceId: string;
  title: string;
  artist: string;
  license?: string;
  attributionText?: string;
  sourceUrl?: string;
  permissionProof?: string;
  moodTags: string[];
  durationSec?: number;
  startOffsetSec?: number;
  playSec?: number;
  isLiveStream?: boolean;
}

const catalogue: CatalogueTrack[] = tracksData as CatalogueTrack[];

// Mood mappings from lineId to tags
const LINE_MOODS: Record<string, string[]> = {
  yellow: ['yellow', 'acoustic', 'chill', 'pop'],
  blue: ['blue', 'indie', 'electronic', 'chillhop'],
  'blue-branch': ['blue', 'indie', 'chillhop'],
  red: ['red', 'heritage', 'classical', 'folk'],
  green: ['green', 'nature', 'calm', 'ambient'],
  'green-branch': ['green', 'nature', 'calm'],
  violet: ['violet', 'evening', 'lofi', 'retro'],
  pink: ['pink', 'youth', 'groove', 'beats'],
  magenta: ['magenta', 'synthwave', 'modern', 'beats'],
  grey: ['grey', 'minimalist', 'ambient', 'flute'],
  orange: ['orange', 'energetic', 'fast', 'electronic'],
  aqua: ['aqua', 'smooth', 'lounge', 'relaxed'],
};

// Prototype demo tracks for Violet line (clearly marked)
let violetTracks: { sourceId: string; title: string; artist?: string; durationSec?: number }[] = [];
try {
  const p = path.resolve(__dirname, '../../violet_tracks.json');
  if (fs.existsSync(p)) {
    violetTracks = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
} catch (e) {
  console.warn('Could not load violet_tracks.json', e);
}

// Fallback tracks when an embed fails
export const FALLBACK_TRACKS: Track[] = [
  {
    id: 'fallback-1',
    provider: 'youtube',
    sourceId: 'jfKfPfyJRdk',
    title: 'Delhi Metro Ambient Chill',
    artist: 'Metro Sound Labs',
    durationSec: 180,
    startOffsetSec: 0,
    playSec: 120,
    license: 'Royalty-Free Open Music',
    attributionText: 'Delhi Metro Open Commute Project',
    isLiveStream: false,
  },
  {
    id: 'fallback-2',
    provider: 'youtube',
    sourceId: '5qap5aO4i9A',
    title: 'Yamuna Evening Beats',
    artist: 'Antigravity Studio',
    durationSec: 210,
    startOffsetSec: 10,
    playSec: 120,
    license: 'Royalty-Free Open Music',
    attributionText: 'Antigravity Studio',
    isLiveStream: false,
  },
];

/**
 * Music-source abstraction: selects tracks mapped to lines by mood tags.
 * Slices playback via startOffsetSec and playSec matching interstation transit.
 * Rejects live streams.
 */
export function getTrack(
  stationId: string,
  lineId: string = 'yellow',
  stationIndex: number = 0,
  interstationSec: number = 120
): Track {
  // If ride is on Violet line and we want prototype demo tracks
  if (lineId === 'violet' && violetTracks.length > 0) {
    const trackItem = violetTracks[stationIndex % violetTracks.length];
    return {
      id: `violet-${stationId}-${trackItem.sourceId}`,
      provider: 'youtube',
      sourceId: trackItem.sourceId,
      title: trackItem.title,
      artist: trackItem.artist || '90s Bollywood Hits (Demo)',
      durationSec: trackItem.durationSec || 210,
      startOffsetSec: 15,
      playSec: interstationSec,
      attributionText: 'Prototype Demo Playlist (Not for public broadcast)',
      isLiveStream: false,
    };
  }

  // Find tracks matching this line's mood tags
  const preferredMoods = LINE_MOODS[lineId] || ['chill'];
  const matchingTracks = catalogue.filter((t) =>
    t.moodTags.some((tag) => preferredMoods.includes(tag))
  );

  const pool = matchingTracks.length > 0 ? matchingTracks : catalogue;
  const selected = pool[stationIndex % pool.length];

  const track: Track = {
    id: `track-${lineId}-${stationId}-${selected.id}`,
    provider: selected.provider,
    sourceId: selected.sourceId,
    title: selected.title,
    artist: selected.artist,
    durationSec: selected.durationSec || 240,
    startOffsetSec: selected.startOffsetSec || 0,
    playSec: interstationSec,
    license: selected.license,
    attributionText: selected.attributionText,
    sourceUrl: selected.sourceUrl,
    isLiveStream: selected.isLiveStream || false,
  };

  // Refuse live streams
  if (track.isLiveStream) {
    return getFallbackTrack(0, interstationSec);
  }

  return track;
}

export function getFallbackTrack(index: number = 0, interstationSec: number = 120): Track {
  const fallback = FALLBACK_TRACKS[index % FALLBACK_TRACKS.length];
  return {
    ...fallback,
    playSec: interstationSec,
  };
}
