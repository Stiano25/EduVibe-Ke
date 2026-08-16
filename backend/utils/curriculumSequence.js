/** Pull the trailing sequence from names like "1.3 Addition" → 3. */
export const parseCurriculumSequence = (rawName) => {
  const match = String(rawName || '').match(/^\s*\d+\.(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
};
