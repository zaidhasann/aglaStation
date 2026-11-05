'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StationToastProps {
  stationName: string | null;
  isVisible: boolean;
  onDismiss: () => void;
}

/** Arrival notification — slides in from the top, stays quiet visually. */
export function StationAdvanceToast({ stationName, isVisible, onDismiss }: StationToastProps) {
  return (
    <AnimatePresence>
      {isVisible && stationName && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={onDismiss}
          aria-label={`Arrived at ${stationName}. Tap to dismiss.`}
          className="fixed top-2 left-4 right-4 max-w-sm mx-auto z-50 bg-[#111111] border border-[#2A2A2A] text-[#E8E8E8] px-4 py-3 flex items-baseline gap-3 cursor-pointer text-left"
          style={{ borderRadius: 4 }}
        >
          <span className="text-xs text-[#666666] shrink-0 font-semibold">Now at</span>
          <span className="text-sm font-bold truncate">{stationName}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
