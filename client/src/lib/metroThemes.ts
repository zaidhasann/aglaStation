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
 * Official Delhi Metro Rail Corporation brand palette:
 * Yellow #F8B800, Blue #0072BC, Red #ED1C24, Green #009E49, Violet #6F2C91,
 * Pink #EC008C, Magenta #B7295A, Grey #808285, Orange/Airport #E65A15, Aqua #00A3AD.
 */
export const METRO_THEMES: Record<string, LineTheme> = {
  yellow: {
    id: 'yellow',
    name: 'Yellow Line',
    hex: '#F8B800',
    onLine: '#0A0A0A',
  },
  blue: {
    id: 'blue',
    name: 'Blue Line',
    hex: '#0072BC',
    onLine: '#FFFFFF',
  },
  'blue-branch': {
    id: 'blue-branch',
    name: 'Blue Line (Vaishali)',
    hex: '#0072BC',
    onLine: '#FFFFFF',
  },
  red: {
    id: 'red',
    name: 'Red Line',
    hex: '#ED1C24',
    onLine: '#FFFFFF',
  },
  green: {
    id: 'green',
    name: 'Green Line',
    hex: '#009E49',
    onLine: '#FFFFFF',
  },
  'green-branch': {
    id: 'green-branch',
    name: 'Green Line (Kirti Nagar)',
    hex: '#009E49',
    onLine: '#FFFFFF',
  },
  violet: {
    id: 'violet',
    name: 'Violet Line',
    hex: '#6F2C91',
    onLine: '#FFFFFF',
  },
  pink: {
    id: 'pink',
    name: 'Pink Line',
    hex: '#EC008C',
    onLine: '#FFFFFF',
  },
  magenta: {
    id: 'magenta',
    name: 'Magenta Line',
    hex: '#B7295A',
    onLine: '#FFFFFF',
  },
  grey: {
    id: 'grey',
    name: 'Grey Line',
    hex: '#808285',
    onLine: '#FFFFFF',
  },
  orange: {
    id: 'orange',
    name: 'Airport Express (Orange)',
    hex: '#E65A15',
    onLine: '#FFFFFF',
  },
  aqua: {
    id: 'aqua',
    name: 'Aqua Line (NMRC)',
    hex: '#00A3AD',
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
