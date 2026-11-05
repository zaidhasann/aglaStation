'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Ticker({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center overflow-hidden h-5 relative font-mono text-xs font-semibold">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
