/**
 * Canonical learner interaction types. Keep in sync with
 * backend/utils/interactionTypes.js.
 *
 * To add a second type (e.g. drag_to_target): append it here, add a sibling
 * Live/Review component, and register it in interactionRegistry. Do not edit
 * MultipleChoiceLive or MultipleChoiceReview.
 */
export const DEFAULT_INTERACTION_TYPE = 'multiple_choice' as const

export const INTERACTION_TYPES = ['multiple_choice', 'drag_to_target', 'numeric_entry'] as const

export type InteractionType = (typeof INTERACTION_TYPES)[number]

const LEGACY_TYPE_MAP: Record<string, InteractionType> = {
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
}

export const resolveInteractionType = (value?: string | null): InteractionType => {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if (LEGACY_TYPE_MAP[raw]) return LEGACY_TYPE_MAP[raw]
  if ((INTERACTION_TYPES as readonly string[]).includes(raw)) return raw as InteractionType
  return DEFAULT_INTERACTION_TYPE
}
