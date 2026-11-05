import React from 'react';

export interface LineTheme {
  id: string;
  name: string;
  /** DMRC-accurate hex colour for this line */
  hex: string;
  /** CSS colour for text-on-line-colour (dark lines use white, light lines use black) */
  onLine: string;
}

/** DMRC-accurate line colours.
 * Source: Delhi Metro Rail Corporation official route maps. */
export const METRO_THEMES: Record<string, LineTheme> = {
  yellow: {
    id: 'yellow',
    name: 'Yellow Line',
    hex: '#F5C518',
    onLine: '#0A0A0A',
  },
  blue: {
    id: 'blue',
    name: 'Blue Line',
    hex: '#1E5EAA',
    onLine: '#FFFFFF',
  },
  red: {
    id: 'red',
    name: 'Red Line',
    hex: '#D0021B',
    onLine: '#FFFFFF',
  },
  violet: {
    id: 'violet',
    name: 'Violet Line',
    hex: '#7B2D8B',
    onLine: '#FFFFFF',
  },
  magenta: {
    id: 'magenta',
    name: 'Magenta Line',
    hex: '#E3007A',
    onLine: '#FFFFFF',
  },
  green: {
    id: 'green',
    name: 'Green Line',
    hex: '#00A650',
    onLine: '#FFFFFF',
  },
  pink: {
    id: 'pink',
    name: 'Pink Line',
    hex: '#FF3366',
    onLine: '#FFFFFF',
  },
  grey: {
    id: 'grey',
    name: 'Grey Line',
    hex: '#888888',
    onLine: '#FFFFFF',
  },
};

export function getLineTheme(lineId: string): LineTheme {
  return METRO_THEMES[lineId] || METRO_THEMES['yellow'];
}

/** Returns CSS variable overrides for a given line — apply on a wrapper element */
export function lineVars(lineId: string): React.CSSProperties {
  const t = getLineTheme(lineId);
  return { '--line': t.hex, '--on-line': t.onLine } as React.CSSProperties;
}
