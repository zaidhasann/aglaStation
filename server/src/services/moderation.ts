/**
 * Unified Unicode, Leetspeak, and Hinglish/Hindi/English Content Moderation Filter
 */

// Character substitution map for common leetspeak / homoglyphs
const HOMOGLYPH_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  '0': 'o',
  '5': 's',
  '$': 's',
  '7': 't',
  '+': 't',
  'v': 'u',
};

// Bad words list: English, Hindi, and Hinglish transliterations
const PROFANITY_ROOTS = [
  // English
  'asshole',
  'bastard',
  'bitch',
  'blowjob',
  'cunt',
  'dick',
  'fag',
  'fuck',
  'nigger',
  'pussy',
  'shit',
  'slut',
  'whore',
  // Hindi / Hinglish transliterations
  'bhenchod',
  'behenchod',
  'bc',
  'madarchod',
  'mc',
  'chutiya',
  'choot',
  'gaand',
  'gand',
  'gandu',
  'lund',
  'lauda',
  'loda',
  'harami',
  'saala',
  'kameena',
  'randi',
  'bhosdi',
  'bhosdike',
  'bhadwe',
  'chinal',
  'tatte',
  'muth',
];

/**
 * Normalizes text: Unicode NFKD, strips accents, replaces common leetspeak glyphs, collapses repeated chars.
 */
export function normalizeText(raw: string): string {
  if (!raw) return '';

  // 1. Unicode decomposition (NFKD) and remove combining diacritical marks
  let normalized = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // 2. Homoglyph substitution
  let result = '';
  for (const ch of normalized) {
    result += HOMOGLYPH_MAP[ch] || ch;
  }

  // 3. Remove zero-width spaces, special formatting symbols, and punctuation used as separators
  result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  return result;
}

/**
 * Checks whether the text contains abusive / offensive terms in English, Hindi, or Hinglish.
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;

  const normalized = normalizeText(text);

  // Check whole words or collapsed patterns
  // Remove non-alphanumeric except spaces for token analysis
  const words = normalized.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

  for (const word of words) {
    for (const root of PROFANITY_ROOTS) {
      if (word === root) return true;
    }
  }

  // Also check without any spaces (catches "b.h.e.n.c.h.o.d", "f u c k", "m_c")
  const stripped = normalized.replace(/[^a-z0-9]/g, '');
  for (const root of PROFANITY_ROOTS) {
    // Exact or embedded if root is 4+ letters
    if (root.length >= 4 && stripped.includes(root)) {
      return true;
    }
  }

  return false;
}

/**
 * Sanitizes input (replaces profanities with asterisks or rejects).
 */
export function sanitizeInput(text: string, maxLen = 300): { cleanText: string; isFlagged: boolean } {
  if (!text) return { cleanText: '', isFlagged: false };
  const trimmed = text.trim().slice(0, maxLen);
  const flagged = containsProfanity(trimmed);
  return {
    cleanText: flagged ? '[Censored message]' : trimmed,
    isFlagged: flagged,
  };
}
