/**
 * odd_one_out is a single-select from 4–5 items. Same grading channel as MCQ.
 */

export const isOddOneOutQuestion = (q = {}) => {
  const type = String(q.interactionType || q.type || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  return type === 'odd_one_out' || type === 'oddoneout';
};

export const itemsFromOddOneOut = (q = {}) => {
  if (Array.isArray(q.items) && q.items.length >= 3) return q.items;
  if (Array.isArray(q.options) && q.options.length >= 3) return q.options;
  return [];
};
