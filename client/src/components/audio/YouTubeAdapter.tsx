'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Track } from 'agla-station-shared';

interface YouTubeAdapterProps {
  track: Track;
  computeTargetSeek: () => number;
  isUnlocked: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onTrackError?: () => void;
}

/**
 * Standard YouTube Iframe embed.
 * Avoids IP/origin blocks on mobile by letting YouTube handle the player directly
 * with standard mobile browser permissions (playsinline, autoplay, picture-in-picture).
 */
export function YouTubeAdapter({
  track,
  computeTargetSeek,
  isUnlocked,
  onPlayStateChange,
  onTrackError,
}: YouTubeAdapterProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Removed unused isPlaying state as it's not needed for iframe control

  const startSeconds = Math.max(0, Math.floor(computeTargetSeek()));

  // Construct standard YouTube embed URL
  const embedUrl = `https://www.youtube.com/embed/${track.sourceId}?autoplay=${isUnlocked ? 1 : 0}&start=${startSeconds}&controls=1&rel=0&playsinline=1&modestbranding=1&enablejsapi=1`;

  // Listen to postMessage from YouTube iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'onStateChange') {
          // 1: PLAYING, 2: PAUSED, 3: BUFFERING, 0: ENDED
          const playing = data.info === 1;
          // setIsPlaying removed
          if (onPlayStateChange) onPlayStateChange(playing);
        } else if (data.event === 'onError') {
          console.warn('YouTube embed error event:', data.info);
          if (onTrackError) onTrackError();
        }
      } catch {
        // Not a JSON message from YouTube, ignore safely
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPlayStateChange, onTrackError]);

  const sendCommand = useCallback((func: string, args: any[] = []) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  }, []);

  // When isUnlocked flips, trigger play
  useEffect(() => {
    if (isUnlocked) {
      sendCommand('playVideo');
    }
  }, [isUnlocked, sendCommand]);

  return (
    <div className="w-full relative aspect-video bg-black overflow-hidden">
      <iframe
        ref={iframeRef}
        key={`${track.sourceId}-${startSeconds}`}
        src={embedUrl}
        className="w-full h-full border-0"
        title={track.title || 'Metro Music Track'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
