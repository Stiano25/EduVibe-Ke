/**
 * Modality display helpers.
 * Session question mix is chosen server-side by pickNextMain (adaptiveQuizService),
 * not a fixed client-side preferred-mix ratio.
 */

export const modalityLabel = (m?: string): string => {
  switch (m) {
    case 'visual':
      return 'Visual'
    case 'text_steps':
      return 'Step-by-step'
    case 'practice':
      return 'Practice'
    default:
      return 'Practice'
  }
}
