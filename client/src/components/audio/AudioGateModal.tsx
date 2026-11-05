'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2 } from 'lucide-react';

interface AudioGateModalProps {
  isOpen: boolean;
  onJoinRide: () => void;
  lineHex?: string;
  onLineHex?: string;
}

/** Browser autoplay gate — asks for a tap before audio starts.
 * Keeps copy plain and specific. No emoji in buttons. */
export function AudioGateModal({ isOpen, onJoinRide, lineHex = '#F5C518', onLineHex = '#0A0A0A' }: AudioGateModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.97, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="bg-[#111111] border border-[#2A2A2A] p-6 max-w-xs w-full flex flex-col gap-5"
            style={{ borderRadius: 6 }}
          >
            {/* Icon */}
            <div
              className="w-12 h-12 flex items-center justify-center shrink-0"
              style={{ backgroundColor: lineHex, borderRadius: 4 }}
              aria-hidden="true"
            >
              <Volume2 className="w-6 h-6" style={{ color: onLineHex }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="text-base font-bold text-[#E8E8E8]">Tap to start the stream</h2>
              <p className="text-sm text-[#666666] leading-relaxed">
                Browsers require a tap before playing audio. This syncs you with everyone on this line.
              </p>
            </div>

            <button
              onClick={onJoinRide}
              className="tap-target w-full flex items-center justify-center font-bold text-sm transition-opacity active:opacity-75"
              style={{
                backgroundColor: lineHex,
                color: onLineHex,
                borderRadius: 4,
                padding: '12px 16px',
              }}
            >
              Start listening
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
