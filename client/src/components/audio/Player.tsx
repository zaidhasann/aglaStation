'use client';

import React from 'react';
import { Track } from 'agla-station-shared';
import { YouTubeAdapter } from './YouTubeAdapter';

interface PlayerProps {
  track: Track | null;
  computeTargetSeek: () => number;
  isUnlocked: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onTrackError?: () => void;
}

/**
 * Provider-agnostic Player component.
 * Currently renders the YouTubeAdapter, but easily pluggable for other adapters (HTML5 audio, SoundCloud, etc.)
 */
export function Player({
  track,
  computeTargetSeek,
  isUnlocked,
  onPlayStateChange,
  onTrackError,
}: PlayerProps) {
  if (!track) {
    return (
      <div className="w-full aspect-video bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-sm">
        Waiting for train track info...
      </div>
    );
  }

  if (track.provider === 'youtube') {
    return (
      <YouTubeAdapter
        track={track}
        computeTargetSeek={computeTargetSeek}
        isUnlocked={isUnlocked}
        onPlayStateChange={onPlayStateChange}
        onTrackError={onTrackError}
      />
    );
  }

  return (
    <div className="w-full aspect-video bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-sm">
      Unsupported audio provider: {track.provider}
    </div>
  );
}
