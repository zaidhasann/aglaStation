'use client';

import React, { useRef, useEffect } from 'react';
import { Station, Track } from 'agla-station-shared';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Player } from '../audio/Player';
import { Equalizer } from '../audio/Equalizer';
import { Users, FastForward, MessageSquare } from 'lucide-react';
import { getLineTheme, lineVars } from '@/lib/metroThemes';

interface NowPlayingCardProps {
  lineId: string;
  stations: Station[];
  currentStation: Station | null;
  nextStation: Station | null;
  stationIndex: number;
  stationCounts?: Record<string, number>;
  track: Track | null;
  listenersCount: number;
  isPlaying: boolean;
  isUnlocked: boolean;
  computeTargetSeek: () => number;
  onAdvanceStation: () => void;
  onPlayStateChange: (playing: boolean) => void;
  onOpenChat: () => void;
  chatBadge?: number;
}

/**
 * Main ride view.
 * Layout (top-to-bottom):
 *   1. Station board — large bilingual display
 *   2. Strip map — vertical line with all stations, active marker, rider counts
 *   3. Player panel — fixed-ratio YouTube window
 *   4. Bottom bar — next-station button + chat
 */
export function NowPlayingCard({
  lineId,
  stations,
  currentStation,
  nextStation,
  stationIndex,
  stationCounts = {},
  track,
  listenersCount,
  isPlaying,
  isUnlocked,
  computeTargetSeek,
  onAdvanceStation,
  onPlayStateChange,
  onOpenChat,
  chatBadge = 0,
}: NowPlayingCardProps) {
  const theme = getLineTheme(lineId);
  const prefersReduced = useReducedMotion();

  // Auto-scroll strip map to active station
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const active = stripRef.current?.querySelector('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ behavior: prefersReduced ? 'instant' : 'smooth', block: 'center' });
    }
  }, [stationIndex, prefersReduced]);

  const totalListeners = listenersCount;

  return (
    <div
      className="flex flex-col bg-[#0A0A0A] text-[#E8E8E8] min-h-screen"
      style={lineVars(lineId)}
    >
      {/* ── SECTION 1: STATION BOARD ── */}
      <div className="px-4 pt-5 pb-4 border-b border-[#2A2A2A]">
        {/* Line badge + listener count */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Line colour swatch + name */}
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: theme.hex }}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-[#E8E8E8]">{theme.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-[#666666]">
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="font-semibold text-[#E8E8E8]">{totalListeners}</span>
              <span>listening</span>
            </span>
            {/* Live indicator — a single dot, no blobs */}
            <span className="flex items-center gap-1.5 text-xs text-[#666666]">
              <span
                className="w-2 h-2 rounded-full bg-[#D0021B]"
                aria-hidden="true"
              />
              Live
            </span>
          </div>
        </div>

        {/* Bilingual station board */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStation?.id || 'loading'}
            initial={prefersReduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {/* Hindi — primary, large */}
            <p
              className="font-devanagari font-bold leading-tight text-[#E8E8E8]"
              style={{ fontSize: 'clamp(2rem, 9vw, 3.5rem)' }}
              lang="hi"
            >
              {currentStation?.hindi || 'अगला स्टेशन'}
            </p>
            {/* English — same line, line-colour accent */}
            <p
              className="font-bold leading-tight"
              style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)', color: theme.hex }}
            >
              {currentStation?.name || 'Awaiting train…'}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Next stop */}
        {nextStation ? (
          <p className="mt-2 text-sm text-[#666666]">
            अगला: <span className="text-[#E8E8E8]">{nextStation.name}</span>
            {nextStation.hindi && (
              <span className="font-devanagari ml-1 text-[#666666]">({nextStation.hindi})</span>
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#666666]">Last station on this route</p>
        )}
      </div>

      {/* ── SECTION 2: STRIP MAP ── */}
      <div
        ref={stripRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        aria-label="Route strip map"
        style={{ maxHeight: '38vh', minHeight: '180px' }}
      >
        {stations.length === 0 ? (
          <p className="text-sm text-[#666666] text-center py-8">No stations loaded.</p>
        ) : (
          <div className="relative">
            {/* Vertical track line */}
            <div
              className="absolute left-[15px] top-0 bottom-0 w-[2px]"
              style={{ backgroundColor: theme.hex, opacity: 0.5 }}
              aria-hidden="true"
            />

            {/* Station rows */}
            <div className="flex flex-col">
              {stations.map((st, idx) => {
                const isActive = idx === stationIndex;
                const isPassed = idx < stationIndex;
                const ridersHere = stationCounts[st.id] || 0;

                return (
                  <div
                    key={st.id}
                    data-active={isActive ? 'true' : 'false'}
                    className="relative flex items-center gap-4 py-2"
                  >
                    {/* Track dot */}
                    <div className="relative z-10 w-8 flex items-center justify-center shrink-0">
                      {isActive ? (
                        <motion.div
                          layoutId="strip-active"
                          transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
                          className="w-4 h-4 rounded-full border-2 border-[#0A0A0A]"
                          style={{ backgroundColor: theme.hex }}
                          aria-label="You are here"
                        />
                      ) : (
                        <div
                          className="w-3 h-3 rounded-full border"
                          style={{
                            backgroundColor: isPassed ? '#2A2A2A' : '#0A0A0A',
                            borderColor: isPassed ? '#444' : theme.hex,
                            opacity: isPassed ? 0.5 : 1,
                          }}
                        />
                      )}
                    </div>

                    {/* Station name + Hindi */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-devanagari text-xs leading-tight ${
                          isActive ? 'text-[#E8E8E8]' : isPassed ? 'text-[#444]' : 'text-[#666666]'
                        }`}
                        lang="hi"
                      >
                        {st.hindi || ''}
                      </p>
                      <p
                        className={`text-sm font-semibold leading-tight truncate ${
                          isActive ? 'font-bold' : isPassed ? 'text-[#444]' : 'text-[#999]'
                        }`}
                        style={isActive ? { color: theme.hex } : undefined}
                      >
                        {st.name}
                      </p>
                    </div>

                    {/* Rider count */}
                    <div className="shrink-0 text-right min-w-[40px]">
                      {ridersHere > 0 ? (
                        <span className="text-xs font-semibold" style={{ color: theme.hex }}>
                          {ridersHere}
                        </span>
                      ) : (
                        <span className="text-xs text-[#2A2A2A]">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 3: PLAYER PANEL ── */}
      <div className="border-t border-[#2A2A2A]">
        {/* Platform display label */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Equalizer isPlaying={isPlaying} />
            <p className="text-xs text-[#666666] truncate">
              {isPlaying
                ? `In sync · ${theme.name}`
                : track
                ? 'Paused'
                : 'Waiting for stream…'}
            </p>
          </div>
          {track && (
            <p className="text-xs font-semibold text-[#E8E8E8] truncate max-w-[50%] text-right ml-2">
              {track.title}
            </p>
          )}
        </div>

        {/* YouTube window — visible always per YouTube ToS */}
        <div className="w-full bg-black">
          <Player
            track={track}
            computeTargetSeek={computeTargetSeek}
            isUnlocked={isUnlocked}
            onPlayStateChange={onPlayStateChange}
          />
        </div>
      </div>

      {/* ── SECTION 4: BOTTOM BAR ── */}
      <div className="border-t border-[#2A2A2A] px-4 py-3 flex items-center gap-3">
        {/* Next station */}
        <button
          onClick={onAdvanceStation}
          className="tap-target flex-1 flex items-center justify-center gap-2 font-bold text-sm transition-opacity active:opacity-75"
          style={{
            backgroundColor: theme.hex,
            color: theme.onLine,
            borderRadius: 4,
          }}
          aria-label="Advance to next station"
        >
          <FastForward className="w-4 h-4" aria-hidden="true" />
          Next station
        </button>

        {/* Chat */}
        <button
          onClick={onOpenChat}
          className="tap-target relative flex items-center justify-center bg-[#111111] border border-[#2A2A2A] text-[#E8E8E8] transition-opacity active:opacity-75"
          style={{ borderRadius: 4, width: 48 }}
          aria-label={chatBadge > 0 ? `Open chat, ${chatBadge} unread` : 'Open chat'}
        >
          <MessageSquare className="w-5 h-5" aria-hidden="true" />
          {chatBadge > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ backgroundColor: theme.hex, color: theme.onLine }}
              aria-hidden="true"
            >
              {chatBadge}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
