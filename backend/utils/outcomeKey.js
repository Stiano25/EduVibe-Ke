import { createHash } from 'crypto';

/** Stable key for a learning outcome string (cross-grade matching). */
export const outcomeKey = (text = '') => {
  const normalized = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return 'unknown';
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
};

export const normalizeOutcomeText = (text = '') =>
  String(text).replace(/\s+/g, ' ').trim();
