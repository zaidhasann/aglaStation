'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { ChatRequestPayload } from 'agla-station-shared';

interface ChatRequestModalProps {
  request: ChatRequestPayload | null;
  onAccept: () => void;
  onDecline: () => void;
  accentColor?: string;
  onLineColor?: string;
}

export function ChatRequestModal({
  request,
  onAccept,
  onDecline,
  accentColor = '#F5C518',
  onLineColor = '#0A0A0A',
}: ChatRequestModalProps) {
  return (
    <AnimatePresence>
      {request && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-50 bg-[#111111] border border-[#2A2A2A] p-4 flex flex-col gap-3 shadow-2xl"
          style={{ borderRadius: 4 }}
        >
          <div className="flex items-start gap-3">
            <span
              className="w-3 h-3 rounded-full mt-1 shrink-0"
              style={{ backgroundColor: accentColor }}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-[#666666] uppercase tracking-wide font-semibold block">
                Chat Request
              </span>
              <h4 className="text-sm font-bold text-[#E8E8E8] truncate">{request.fromUserName}</h4>
              <p className="text-xs text-[#888888] mt-0.5">Wants to chat while listening together.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onDecline}
              className="tap-target flex items-center justify-center gap-1.5 bg-[#181818] border border-[#2A2A2A] text-[#888888] hover:text-[#E8E8E8] text-xs font-semibold py-2 px-3"
              style={{ borderRadius: 4 }}
            >
              <X className="w-3.5 h-3.5" /> Decline
            </button>
            <button
              onClick={onAccept}
              className="tap-target flex items-center justify-center gap-1.5 font-bold py-2 px-3 text-xs transition-opacity active:opacity-75"
              style={{
                backgroundColor: accentColor,
                color: onLineColor,
                borderRadius: 4,
              }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" /> Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
