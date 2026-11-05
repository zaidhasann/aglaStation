'use client';

import React from 'react';
import { WifiOff } from 'lucide-react';

interface ReconnectingBannerProps {
  isConnected: boolean;
}

/** Full-width status bar shown when the socket drops.
 * Stays still — no pulse animation on the banner itself (motion only on the icon). */
export function ReconnectingBanner({ isConnected }: ReconnectingBannerProps) {
  if (isConnected) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="sticky top-0 z-50 w-full bg-[#D0021B] text-white px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>Connection lost. Catching up with the train…</span>
    </div>
  );
}
