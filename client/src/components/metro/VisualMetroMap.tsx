'use client';

import React, { useRef, useEffect } from 'react';
import { Station, Direction } from 'agla-station-shared';
import { motion, useReducedMotion } from 'framer-motion';
import { Train, Radio } from 'lucide-react';
import { getLineTheme } from '@/lib/metroThemes';

interface VisualMetroMapProps {
  lineId: string;
  stations: Station[];
  currentIndex: number;
  direction: Direction;
  stationCounts?: Record<string, number>;
  onStationSelect?: (index: number) => void;
}

/**
 * Visual route map showing active station, curved transit path,
 * and live co-riders at each stop.
 */
export function VisualMetroMap({
  lineId,
  stations,
  currentIndex,
  direction,
  stationCounts = {},
  onStationSelect,
}: VisualMetroMapProps) {
  const theme = getLineTheme(lineId);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Keep active train in view
  useEffect(() => {
    const activeNode = document.getElementById(`station-node-${currentIndex}`);
    if (activeNode && containerRef.current) {
      activeNode.scrollIntoView({ behavior: prefersReduced ? 'instant' : 'smooth', block: 'center' });
    }
  }, [currentIndex, prefersReduced]);

  const currentStation = stations[currentIndex];

  return (
    <div className="relative w-full overflow-hidden bg-[#0A0A0A] border border-[#2A2A2A] flex flex-col" style={{ borderRadius: 4 }}>
      {/* Map Header */}
      <div className="px-4 py-3 bg-[#111111] border-b border-[#2A2A2A] flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: theme.hex }}
            aria-hidden="true"
          />
          <div>
            <h3 className="text-xs font-bold text-[#E8E8E8]">{theme.name} Track</h3>
            <p className="text-[10px] text-[#666666]">
              {direction === 'up' ? 'Forward transit' : 'Reverse transit'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold bg-[#1a1a1a] border border-[#2A2A2A] text-[#E8E8E8]" style={{ borderRadius: 4 }}>
            <Radio className="w-3 h-3 text-[#D0021B]" /> Live sync
          </span>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={containerRef}
        className="relative h-[480px] overflow-y-auto overflow-x-hidden p-6 select-none bg-[#0A0A0A]"
      >
        <div className="relative min-h-[1400px] w-full max-w-sm mx-auto">
          {/* SVG Curved Track */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`track-grad-${lineId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={theme.hex} stopOpacity="0.8" />
                <stop offset="50%" stopColor={theme.hex} stopOpacity="1" />
                <stop offset="100%" stopColor={theme.hex} stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {(() => {
              const endY = stations.length * 68 + 20;
              const midY = endY / 2;
              const pathD = `M 50% 40 Q 65% ${midY} 50% ${endY}`;
              return (
                <>
                  <path
                    d={pathD}
                    stroke="#1c1c1c"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d={pathD}
                    stroke={`url(#track-grad-${lineId})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              );
            })()}
          </svg>

          {/* Stations & Riders */}
          <div className="relative flex flex-col gap-8 py-6">
            {stations.map((st, idx) => {
              const isActive = idx === currentIndex;
              const isPassed = idx < currentIndex;
              const ridersHere = stationCounts[st.id] || 0;
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={st.id}
                  id={`station-node-${idx}`}
                  onClick={() => onStationSelect && onStationSelect(idx)}
                  className={`flex items-center justify-between w-full relative z-10 transition cursor-pointer group ${
                    isEven ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  {/* Station Label */}
                  <div
                    className={`w-[42%] flex flex-col ${
                      isEven ? 'text-right items-end pr-3' : 'text-left items-start pl-3'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-devanagari truncate ${
                        isActive ? 'text-[#E8E8E8] font-bold' : isPassed ? 'text-[#333]' : 'text-[#666666]'
                      }`}
                    >
                      {st.hindi || ''}
                    </span>
                    <span
                      className={`text-xs font-semibold truncate ${
                        isActive
                          ? 'text-[#E8E8E8] font-bold'
                          : isPassed
                          ? 'text-[#444]'
                          : 'text-[#888888] group-hover:text-white'
                      }`}
                      style={{ color: isActive ? theme.hex : undefined }}
                    >
                      {st.name}
                    </span>
                  </div>

                  {/* Node */}
                  <div className="relative flex items-center justify-center shrink-0 w-10 h-10">
                    {isActive ? (
                      <motion.div
                        layoutId="active-delivery-train"
                        transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 28 }}
                        className="relative z-30 flex items-center justify-center"
                      >
                        <div
                          className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-white border border-zinc-700/70 shadow-md font-bold relative z-10"
                          style={{
                            borderRadius: 7,
                          }}
                        >
                          <Train className="w-4 h-4 text-white fill-current drop-shadow-sm" />
                        </div>
                      </motion.div>
                    ) : (
                      <div
                        className="w-3 h-3 rounded-full border transition-transform duration-150 group-hover:scale-125 z-10"
                        style={{
                          backgroundColor: isPassed ? '#222222' : '#0A0A0A',
                          borderColor: isPassed ? '#333333' : theme.hex,
                        }}
                      />
                    )}
                  </div>

                  {/* Co-riders at Station */}
                  <div
                    className={`w-[42%] flex ${
                      isEven ? 'justify-start pl-3' : 'justify-end pr-3'
                    }`}
                  >
                    {ridersHere > 0 ? (
                      <span
                        className="px-2 py-0.5 text-[10px] font-semibold bg-[#1a1a1a] border border-[#2A2A2A]"
                        style={{ color: theme.hex, borderRadius: 4 }}
                      >
                        {ridersHere} {ridersHere === 1 ? 'commuter' : 'commuters'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#333333] font-mono">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-[#111111] border-t border-[#2A2A2A] flex items-center justify-between text-xs text-[#888888]">
        <div>
          <span>Now at: </span>
          <span className="text-[#E8E8E8] font-semibold">{currentStation?.name || 'In transit'}</span>
        </div>
        <div style={{ color: theme.hex }} className="text-[11px] font-semibold">
          Synced with train line
        </div>
      </div>
    </div>
  );
}
