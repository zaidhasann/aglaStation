'use client';

import React, { useState } from 'react';
import { Direction, MetroLine } from 'agla-station-shared';
import { Compass, MapPin, Navigation, ArrowRight } from 'lucide-react';
import { getLineTheme } from '@/lib/metroThemes';
import allLinesData from '@/data/lines.json';

const ALL_LINES = allLinesData as Record<string, MetroLine>;

interface SelectionFlowProps {
  onComplete: (selection: {
    lineId: string;
    direction: Direction;
    startStationId: string;
    destStationId: string;
    userName: string;
  }) => void;
}

export function SelectionFlow({ onComplete }: SelectionFlowProps) {
  const [selectedLineId, setSelectedLineId] = useState<string>('yellow');
  const [direction, setDirection] = useState<Direction>('up');

  const currentLine = ALL_LINES[selectedLineId] || ALL_LINES['yellow'];
  const stations = currentLine.stations;
  const theme = getLineTheme(selectedLineId);

  const [startId, setStartId] = useState<string>(stations[0]?.id || '');
  const [destId, setDestId] = useState<string>(stations[stations.length - 1]?.id || '');
  const [userName, setUserName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // When line changes, reset start/dest stations
  const handleLineChange = (lineKey: string) => {
    setSelectedLineId(lineKey);
    const line = ALL_LINES[lineKey];
    if (line && line.stations.length > 0) {
      setStartId(line.stations[0].id);
      setDestId(line.stations[line.stations.length - 1].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const startIndex = stations.findIndex((s) => s.id === startId);
    const destIndex = stations.findIndex((s) => s.id === destId);

    if (startIndex === -1 || destIndex === -1) {
      setError('Select valid stations to continue.');
      return;
    }

    if (startIndex === destIndex) {
      setError('Boarding and destination cannot be the same station.');
      return;
    }

    // Direction validation against line order
    if (direction === 'up' && startIndex > destIndex) {
      setError(`Destination is behind boarding station. Switch direction or adjust stops.`);
      return;
    }

    if (direction === 'down' && startIndex < destIndex) {
      setError(`Destination is behind boarding station. Switch direction or adjust stops.`);
      return;
    }

    onComplete({
      lineId: selectedLineId,
      direction,
      startStationId: startId,
      destStationId: destId,
      userName: userName.trim() || undefined as any,
    });
  };

  const termA = stations[0]?.name || 'Start';
  const termB = stations[stations.length - 1]?.name || 'Terminus';

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] p-5 flex flex-col gap-5" style={{ borderRadius: 4 }}>
      <div className="border-b border-[#2A2A2A] pb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: theme.hex }}
            aria-hidden="true"
          />
          <h2 className="text-base font-bold text-[#E8E8E8]">Select your ride</h2>
        </div>
        <p className="text-xs text-[#666666]">Choose line, direction, and stations to sync music with commuters.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Metro Line Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#888888] mb-2 uppercase tracking-wide">
            Metro Line
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {Object.keys(ALL_LINES).map((lineKey) => {
              const l = ALL_LINES[lineKey];
              const isSelected = selectedLineId === lineKey;
              const lTheme = getLineTheme(lineKey);

              return (
                <button
                  type="button"
                  key={lineKey}
                  onClick={() => handleLineChange(lineKey)}
                  className={`tap-target flex items-center gap-2 p-2.5 border text-xs font-semibold text-left transition-colors ${
                    isSelected
                      ? 'bg-[#1a1a1a] text-white border-current'
                      : 'bg-[#0e0e0e] border-[#222222] text-[#888888] hover:text-[#cccccc]'
                  }`}
                  style={{
                    borderRadius: 4,
                    borderColor: isSelected ? lTheme.hex : undefined,
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: lTheme.hex }}
                  />
                  <div className="truncate min-w-0">
                    <div className="truncate">{l.name.replace(' Line', '')}</div>
                    <div className="text-[10px] text-[#666666] font-normal">{l.stations.length} stops</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Direction toggle */}
        <div>
          <label className="block text-xs font-semibold text-[#888888] mb-1.5 flex items-center gap-1 uppercase tracking-wide">
            <Compass className="w-3.5 h-3.5 text-[#666666]" /> Direction
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('up')}
              className={`tap-target py-2 px-3 text-xs border text-left transition-colors ${
                direction === 'up'
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-[#0e0e0e] border-[#222222] text-[#888888]'
              }`}
              style={{
                borderRadius: 4,
                borderColor: direction === 'up' ? theme.hex : undefined,
              }}
            >
              <div className="font-bold truncate">Towards {termB}</div>
              <div className="text-[10px] text-[#666666]">Terminal stop</div>
            </button>

            <button
              type="button"
              onClick={() => setDirection('down')}
              className={`tap-target py-2 px-3 text-xs border text-left transition-colors ${
                direction === 'down'
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-[#0e0e0e] border-[#222222] text-[#888888]'
              }`}
              style={{
                borderRadius: 4,
                borderColor: direction === 'down' ? theme.hex : undefined,
              }}
            >
              <div className="font-bold truncate">Towards {termA}</div>
              <div className="text-[10px] text-[#666666]">Terminal stop</div>
            </button>
          </div>
        </div>

        {/* Start Station */}
        <div>
          <label className="block text-xs font-semibold text-[#888888] mb-1.5 flex items-center gap-1 uppercase tracking-wide">
            <MapPin className="w-3.5 h-3.5 text-[#666666]" /> Boarding Station
          </label>
          <select
            value={startId}
            onChange={(e) => setStartId(e.target.value)}
            className="w-full tap-target bg-[#0e0e0e] border border-[#2A2A2A] px-3 py-2 text-xs text-[#E8E8E8] focus:outline-none"
            style={{ borderRadius: 4 }}
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.hindi ? `(${s.hindi})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Destination Station */}
        <div>
          <label className="block text-xs font-semibold text-[#888888] mb-1.5 flex items-center gap-1 uppercase tracking-wide">
            <Navigation className="w-3.5 h-3.5 text-[#666666]" /> Destination Station
          </label>
          <select
            value={destId}
            onChange={(e) => setDestId(e.target.value)}
            className="w-full tap-target bg-[#0e0e0e] border border-[#2A2A2A] px-3 py-2 text-xs text-[#E8E8E8] focus:outline-none"
            style={{ borderRadius: 4 }}
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.hindi ? `(${s.hindi})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* User Display Name */}
        <div>
          <label className="block text-xs font-semibold text-[#888888] mb-1.5 uppercase tracking-wide">
            Rider Handle <span className="text-[10px] text-[#555555] font-normal lowercase">(optional)</span>
          </label>
          <input
            type="text"
            maxLength={20}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="e.g. Commuter42"
            className="w-full tap-target bg-[#0e0e0e] border border-[#2A2A2A] px-3 py-2 text-xs text-[#E8E8E8] placeholder-[#555555] focus:outline-none"
            style={{ borderRadius: 4 }}
          />
        </div>

        {error && (
          <div className="text-xs text-[#D0021B] bg-[#D0021B]/10 border border-[#D0021B]/20 p-2.5" style={{ borderRadius: 4 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="tap-target w-full mt-2 font-bold py-3 px-4 text-sm flex items-center justify-center gap-2 transition-opacity active:opacity-75"
          style={{
            backgroundColor: theme.hex,
            color: theme.onLine,
            borderRadius: 4,
          }}
        >
          Board {theme.name} <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
