import type { LearnerModality, QuizQuestion } from '@/types'

const MODALITIES = ['visual', 'text_steps', 'practice'] as const
type QuestionModality = (typeof MODALITIES)[number]

const asModality = (m?: string): QuestionModality => {
  if (m === 'visual' || m === 'text_steps' || m === 'practice') return m
  return 'practice'
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Target mix for a session (option B: ~60% preferred + rest). */
export const modalitySessionWeights = (
  preferred: LearnerModality
): Record<QuestionModality, number> => {
  if (preferred === 'mixed') {
    return { visual: 0.34, text_steps: 0.33, practice: 0.33 }
  }
  if (preferred === 'visual') {
    return { visual: 0.6, practice: 0.25, text_steps: 0.15 }
  }
  if (preferred === 'text_steps') {
    return { text_steps: 0.6, practice: 0.25, visual: 0.15 }
  }
  return { practice: 0.6, visual: 0.2, text_steps: 0.2 }
}

/**
 * Build a Duolingo-style quiz session from modality-tagged questions.
 * Falls back to all questions if none are tagged.
 */
export const buildModalitySession = (
  questions: QuizQuestion[],
  preferred: LearnerModality = 'mixed',
  targetCount = 10
): QuizQuestion[] => {
  if (!questions?.length) return []

  const tagged = questions.some((q) => Boolean(q.modality))
  if (!tagged) {
    return questions.slice(0, targetCount)
  }

  const pools: Record<QuestionModality, QuizQuestion[]> = {
    visual: [],
    text_steps: [],
    practice: [],
  }
  for (const q of questions) {
    pools[asModality(q.modality)].push(q)
  }
  for (const key of MODALITIES) {
    pools[key] = shuffle(pools[key])
  }

  const weights = modalitySessionWeights(preferred)
  const counts: Record<QuestionModality, number> = {
    visual: 0,
    text_steps: 0,
    practice: 0,
  }
  let remaining = Math.min(targetCount, questions.length)
  for (const key of MODALITIES) {
    counts[key] = Math.floor(weights[key] * targetCount)
    remaining -= counts[key]
  }
  // Give leftover slots to the strongest weight
  const primary = (Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0] ||
    'practice') as QuestionModality
  counts[primary] += Math.max(0, remaining)

  const picked: QuizQuestion[] = []
  const used = new Set<string>()

  const take = (mod: QuestionModality, n: number) => {
    let got = 0
    for (const q of pools[mod]) {
      if (got >= n) break
      const id = q.id || q.question
      if (used.has(id)) continue
      used.add(id)
      picked.push(q)
      got++
    }
    return n - got
  }

  let shortfall = 0
  for (const key of MODALITIES) {
    shortfall += take(key, counts[key])
  }

  if (shortfall > 0 || picked.length < Math.min(targetCount, questions.length)) {
    for (const q of shuffle(questions)) {
      if (picked.length >= targetCount) break
      const id = q.id || q.question
      if (used.has(id)) continue
      used.add(id)
      picked.push(q)
    }
  }

  return shuffle(picked).slice(0, targetCount)
}

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
