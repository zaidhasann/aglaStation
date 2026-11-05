'use client';

import React, { useState, useEffect } from 'react';
import { Sponsor } from 'agla-station-shared';
import { X, ExternalLink, MapPin, Tag } from 'lucide-react';

interface SponsorCardProps {
  sponsor: Sponsor | null;
  accentColor?: string;
  onAction?: (sponsorId: string, stationId: string, action: 'impression' | 'dismiss' | 'tap') => void;
}

export function SponsorCard({ sponsor, accentColor, onAction }: SponsorCardProps) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // Reset dismissal when sponsor changes (at new station)
  useEffect(() => {
    if (sponsor && sponsor.id !== dismissedId) {
      if (onAction) {
        onAction(sponsor.id, sponsor.stationId, 'impression');
      }
    }
  }, [sponsor, dismissedId, onAction]);

  if (!sponsor || sponsor.id === dismissedId) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedId(sponsor.id);
    if (onAction) {
      onAction(sponsor.id, sponsor.stationId, 'dismiss');
    }
  };

  const handleTap = () => {
    if (onAction) {
      onAction(sponsor.id, sponsor.stationId, 'tap');
    }
    if (sponsor.link) {
      window.open(sponsor.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleTap();
      }}
      className="relative mx-4 my-2 p-3 bg-neutral-900 border border-neutral-800 rounded-xl cursor-pointer hover:border-neutral-700 transition shadow-sm text-left group"
      style={{ borderLeftColor: accentColor ? accentColor : undefined, borderLeftWidth: accentColor ? '3px' : '1px' }}
      aria-label={`Sponsored offer from ${sponsor.businessName}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] tracking-wider uppercase font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
            Sponsored
          </span>
          <span className="text-xs text-neutral-400 font-medium flex items-center">
            <Tag className="w-3 h-3 mr-1 text-neutral-500" />
            {sponsor.category}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-neutral-500 hover:text-neutral-300 rounded-md hover:bg-neutral-800 transition"
          aria-label="Dismiss sponsored card"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="pr-4">
        <h4 className="text-sm font-semibold text-neutral-100 flex items-center group-hover:text-amber-300 transition">
          {sponsor.businessName}
          <ExternalLink className="w-3 h-3 ml-1.5 opacity-60 text-neutral-400" />
        </h4>
        <p className="text-xs text-neutral-300 mt-1 leading-snug">{sponsor.offerTextEn}</p>
        <p className="text-xs text-neutral-400 mt-0.5 font-hindi leading-snug">{sponsor.offerTextHi}</p>
        <div className="flex items-center text-[11px] text-neutral-500 mt-2">
          <MapPin className="w-3 h-3 mr-1 shrink-0 text-neutral-500" />
          <span className="truncate">{sponsor.address}</span>
        </div>
      </div>
    </div>
  );
}
