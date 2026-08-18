export type MasteryStatus = 'unknown' | 'struggling' | 'scaffolding' | 'developing' | 'mastered'

export type LearnerReportSkill = {
  skillFocus: string
  learningOutcomeKey: string
  status: MasteryStatus
  bktPKnow: number | null
  preferredModality: string | null
  consecutiveFailsAtLevel: number
  updatedAt?: string | null
}

export type CountPair = { correct: number; total: number }

export type LearnerReport = {
  learner: { id: string; name?: string | null; email?: string | null; grade?: string | null }
  generatedAt: string
  summary: {
    lessonsTracked: number
    completed: number
    inProgress: number
    averageScore: number | null
    skillsTracked: number
    strengthsCount: number
    weaknessesCount: number
    attemptCount: number
    accuracyPercent: number | null
  }
  masteryCounts: Record<MasteryStatus, number>
  strengths: LearnerReportSkill[]
  weaknesses: LearnerReportSkill[]
  skillsNeedingPractice?: LearnerReportSkill[]
  bloomBreakdown: Record<string, CountPair>
  modalityBreakdown: Record<string, CountPair>
  misconceptions: Array<{ key: string; count: number }>
  recentLessons: Array<{
    lessonId: string
    title: string
    progress: number
    completed: boolean
    scorePercentage: number | null
    lastAccessed?: string | null
  }>
}

export type ClassInsights = {
  learnerCount: number
  commonWeaknesses: Array<{
    skillFocus: string
    learningOutcomeKey: string
    learnerCount: number
    learnerNames: string[]
  }>
  commonStrengths: Array<{
    skillFocus: string
    learningOutcomeKey: string
    learnerCount: number
    learnerNames: string[]
  }>
  needsAttention: Array<{
    id: string
    name: string
    grade?: string | null
    weaknessesCount: number
    strengthsCount: number
    accuracyPercent: number | null
  }>
}

export const STATUS_LABEL: Record<MasteryStatus, string> = {
  mastered: 'Mastered',
  developing: 'Developing',
  struggling: 'Struggling',
  scaffolding: 'Needs scaffolding',
  unknown: 'Not enough data',
}

export const STATUS_CLASS: Record<MasteryStatus, string> = {
  mastered: 'bg-emerald-100 text-emerald-800',
  developing: 'bg-sky-100 text-sky-800',
  struggling: 'bg-amber-100 text-amber-800',
  scaffolding: 'bg-rose-100 text-rose-800',
  unknown: 'bg-slate-100 text-slate-700',
}

export const MODALITY_LABEL: Record<string, string> = {
  visual: 'Pictures',
  text_steps: 'Step by step',
  practice: 'Practice',
  mixed: 'Mixed',
}

export const BLOOM_LABEL: Record<string, string> = {
  recall: 'Recall',
  understand: 'Understand',
  apply: 'Apply',
  reason: 'Reason',
}

export const rateLabel = (pair?: CountPair | null) => {
  if (!pair || !pair.total) return '—'
  return `${Math.round((pair.correct / pair.total) * 100)}%`
}
