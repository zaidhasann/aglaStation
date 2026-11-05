'use client';

import React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';

/** Three-bar equalizer indicator. Uses `--line` CSS variable for colour. */
export function Equalizer({ isPlaying }: { isPlaying: boolean }) {
  const shouldReduceMotion = useReducedMotion();

  const barVariants: Variants = {
    playing: (i: number) => ({
      scaleY: shouldReduceMotion ? 1 : [0.3, 1, 0.5, 0.8, 0.2],
      transition: {
        duration: 0.9,
        repeat: Infinity,
        repeatType: 'mirror',
        delay: i * 0.18,
        ease: 'easeInOut',
      },
    }),
    paused: {
      scaleY: 0.2,
      transition: { duration: 0.3 },
    },
  };

  return (
    <div
      className="flex items-end gap-[2px] h-4 w-5"
      aria-label={isPlaying ? 'Playing' : 'Paused'}
      aria-hidden="true"
    >
      {[0, 1, 2].map((bar) => (
        <motion.div
          key={bar}
          custom={bar}
          variants={barVariants}
          animate={isPlaying ? 'playing' : 'paused'}
          style={{ originY: 1, backgroundColor: 'var(--line)' }}
          className="w-[3px] rounded-[1px] h-full"
        />
      ))}
    </div>
  );
}
