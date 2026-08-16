import type { RefObject } from 'react'
import type { InteractionType } from '@/lib/interactionTypes'
import type { TapSelection } from '../TapSelectOptions'

export type AdaptiveQuestion = {
  id: string
  question: string
  options: string[]
  points?: number
  skillFocus?: string
  bloomLevel?: string
  modality?: string
  diagramBriefId?: string | null
  steps?: string[]
  learningOutcomeIndex?: number
  interactionType?: InteractionType | string
  activity?: string
  objectPool?: number
  bankEntryId?: string
}

export type ReviewItem = {
  id: string
  question: string
  options: string[]
  correctAnswerIndex: number
  selectedOptionIndex: number
  correct: boolean
  explanation?: string
  optionExplanations?: string[]
  modality?: string
  steps?: string[]
  diagramBriefId?: string | null
  skillFocus?: string
  bloomLevel?: string
  interactionType?: InteractionType | string
  activity?: string
  objectPool?: number
  expectedCount?: number
  placedCount?: number
  phase?: string
}

export type LiveFlash = {
  correct: boolean
  correctAnswerIndex?: number
  explanation?: string
}

export type LiveFlashCopy = {
  correct: string
  incorrect: string
}

export type VisualBriefLite = {
  diagramType?: string
  params?: Record<string, unknown>
}

export type MultipleChoiceLiveProps = {
  question: AdaptiveQuestion
  diagramUrl: string | null
  visualBrief?: VisualBriefLite | null
  selected: number | null
  submitting: boolean
  flash: LiveFlash | null
  flashCopy: LiveFlashCopy
  interactiveRef: RefObject<HTMLDivElement | null>
  onSelect: (selection: TapSelection) => void
  onSubmitDrag?: (payload: { placedCount: number; responseTimeMs: number }) => void
}

export type MultipleChoiceReviewProps = {
  item: ReviewItem
  index: number
  diagramUrl: string | null
  visualBrief?: VisualBriefLite | null
}
