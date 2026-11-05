'use client';

import React from 'react';
import { Station, Direction } from 'agla-station-shared';
import { motion, useReducedMotion } from 'framer-motion';
import { Compass, TrainTrack } from 'lucide-react';

interface RouteStripProps {
  stations: Station[];
  currentIndex: number;
  direction: Direction;
  stationCounts?: Record<string, number>;
  onStationSelect?: (index: number) => void;
}

export function RouteStrip({
  stations,
  currentIndex,
  direction,
  stationCounts = {},
  onStationSelect,
}: RouteStripProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium pb-2 border-b border-slate-800">
        <span className="flex items-center gap-1.5 text-yellow-400">
          <TrainTrack className="w-3.5 h-3.5" /> Metro Route
        </span>
        <span className="flex items-center gap-1 text-[11px] bg-slate-800/80 px-2.5 py-1 rounded-full text-slate-300">
          <Compass className="w-3 h-3 text-yellow-400" />
          {direction === 'up' ? 'Samaypur Badli → Millennium City' : 'Millennium City → Samaypur Badli'}
        </span>
      </div>

      {/* Vertical Metro Track */}
      <div className="relative max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
        {/* Continuous Track Line */}
        <div className="absolute left-[17px] top-3 bottom-3 w-1 bg-slate-800 rounded-full" />

        <div className="flex flex-col gap-3 py-1">
          {stations.map((st, idx) => {
            const isActive = idx === currentIndex;
            const isPassed = idx < currentIndex;
            const countAtStation = stationCounts[st.id] || 0;

            return (
              <div
                key={st.id}
                onClick={() => onStationSelect && onStationSelect(idx)}
                className={`flex items-center gap-3 relative py-1 px-1 rounded-xl transition cursor-pointer select-none ${
                  isActive ? 'bg-yellow-400/10' : 'hover:bg-slate-800/40'
                }`}
              >
                {/* Station Node Indicator */}
                <div className="relative z-10 w-9 h-9 flex items-center justify-center shrink-0">
                  {isActive ? (
                    <motion.div
                      layoutId={shouldReduceMotion ? undefined : 'active-train-halo'}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      className="absolute inset-0 rounded-full bg-yellow-400/20 border-2 border-yellow-400 flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                    >
                      <motion.div
                        animate={shouldReduceMotion ? {} : { scale: [1, 1.25, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                        className="w-3.5 h-3.5 rounded-full bg-yellow-400"
                      />
                    </motion.div>
                  ) : (
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 transition ${
                        isPassed
                          ? 'border-slate-600 bg-slate-700'
                          : 'border-slate-500 bg-slate-900'
                      }`}
                    />
                  )}
                </div>

                {/* Station Title & Riders badge */}
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span
                    className={`text-xs truncate font-medium transition ${
                      isActive
                        ? 'text-yellow-300 font-bold text-sm'
                        : isPassed
                        ? 'text-slate-500'
                        : 'text-slate-300'
                    }`}
                  >
                    {st.name}
                  </span>

                  {countAtStation > 0 && (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono ml-2">
                      👤 {countAtStation}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
