/**
 * Canonical learner interaction types. Keep in sync with
 * frontend/src/lib/interactionTypes.ts.
 *
 * Part 2 shipped multiple_choice only. Part 7 adds drag_to_target.
 * numeric_entry is the scalar keypad for bare computation.
 */
export const DEFAULT_INTERACTION_TYPE = 'multiple_choice';

export const INTERACTION_TYPES = Object.freeze([
  'multiple_choice',
  'drag_to_target',
  'numeric_entry',
  'matching_pairs',
  'odd_one_out'
]);

const LEGACY_TYPE_MAP = Object.freeze({
  'multiple-choice': 'multiple_choice',
  multiple_choice: 'multiple_choice',
  multiplechoice: 'multiple_choice',
  'drag-to-target': 'drag_to_target',
  drag_to_target: 'drag_to_target',
  dragtotarget: 'drag_to_target',
  'numeric-entry': 'numeric_entry',
  numeric_entry: 'numeric_entry',
  numericentry: 'numeric_entry',
  free_response: 'numeric_entry',
  'free-response': 'numeric_entry',
  matching_pairs: 'matching_pairs',
  'matching-pairs': 'matching_pairs',
  matchingpairs: 'matching_pairs',
  odd_one_out: 'odd_one_out',
  'odd-one-out': 'odd_one_out',
  oddoneout: 'odd_one_out'
});

export const resolveInteractionType = (value) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (LEGACY_TYPE_MAP[raw]) return LEGACY_TYPE_MAP[raw];
  if (INTERACTION_TYPES.includes(raw)) return raw;
  return DEFAULT_INTERACTION_TYPE;
};
