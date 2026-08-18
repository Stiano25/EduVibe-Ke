/**
 * Shared class strings for the learner surface.
 *
 * Exported as strings rather than components because roughly half of the
 * learner CTAs are react-router `<Link>` elements, not `<button>`.
 *
 * The visual language is soft and borderless: white cards lifted off a tinted
 * page by a shadow, generous radii, and fully rounded pill buttons in one of
 * three accent colours. Outlines are used only for focus rings. `.ev-press`
 * (globals.css) shrinks a control slightly while it is held.
 *
 * Sizes are floors, not suggestions: young children miss small targets, so
 * `md` is 48px tall and `lg` is 56px.
 */

export type LearnerAccent = 'blue' | 'pink' | 'green'
export type LearnerButtonVariant =
  | LearnerAccent
  | 'primary'
  | 'secondary'
  | 'onColor'
  | 'quiet'
  | 'danger'
export type LearnerButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'ev-press inline-flex items-center justify-center gap-2 rounded-full font-bold touch-manipulation select-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ev-blue/30 disabled:opacity-50 disabled:cursor-not-allowed'

const SIZES: Record<LearnerButtonSize, string> = {
  sm: 'min-h-10 px-4 text-sm',
  md: 'min-h-12 px-6 text-sm',
  lg: 'min-h-14 px-8 text-base',
}

const VARIANTS: Record<LearnerButtonVariant, string> = {
  blue: 'bg-ev-blue text-white shadow-ev-card hover:brightness-105',
  pink: 'bg-ev-pink text-white shadow-ev-card hover:brightness-105',
  green: 'bg-ev-green text-white shadow-ev-card hover:brightness-105',
  /** Loudest CTA — pink, same as the name colour in the greeting. */
  primary: 'bg-ev-pink text-white shadow-ev-card hover:brightness-105',
  secondary: 'bg-white text-ev-ink shadow-ev-sm hover:shadow-ev-card',
  /** Sits on a saturated card, so it inverts to a white fill. */
  onColor: 'bg-white text-ev-ink shadow-ev-card hover:bg-white/90',
  quiet: 'bg-white text-ev-ink shadow-ev-sm hover:shadow-ev-card',
  danger: 'bg-ev-red text-white shadow-ev-card hover:brightness-105',
}

export const learnerButton = (
  variant: LearnerButtonVariant = 'blue',
  size: LearnerButtonSize = 'md',
  extra = ''
) => `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${extra}`.trim()

/** White surface lifted off the page. Pair with padding at the call site. */
export const LEARNER_CARD = 'rounded-ev-lg bg-white shadow-ev-card'

/** Surface for question shells and result tiles. */
export const LEARNER_PANEL = 'rounded-ev-md bg-white shadow-ev-sm'

/** Solid accent fill for hero cards and thumbnails. */
export const ACCENT_BG: Record<LearnerAccent, string> = {
  blue: 'bg-ev-blue',
  pink: 'bg-ev-pink',
  green: 'bg-ev-green',
}

/** Pale accent tint, for thumbnails and status chips. */
export const ACCENT_TINT: Record<LearnerAccent, string> = {
  blue: 'bg-ev-blue-soft text-ev-blue-edge',
  pink: 'bg-ev-pink-soft text-ev-pink-edge',
  green: 'bg-ev-green-soft text-ev-green-edge',
}

const ACCENTS: LearnerAccent[] = ['blue', 'pink', 'green']

/**
 * Picks a stable accent for a subject or lesson.
 *
 * Subjects carry a `color` field in the database, but it holds Tailwind
 * gradient stops ("from-x via-y to-z") from an older look and cannot render as
 * a flat fill. Deriving the accent from the name keeps each subject visually
 * consistent across screens without a data migration.
 */
export const accentFor = (name?: string | null): LearnerAccent => {
  const seed = (name || '').split('').reduce((total, ch) => total + ch.charCodeAt(0), 0)
  return ACCENTS[seed % ACCENTS.length]
}

/** Back-compat for callers that just want fill classes for a badge. */
export const subjectTone = (name?: string | null) => ACCENT_BG[accentFor(name)]
