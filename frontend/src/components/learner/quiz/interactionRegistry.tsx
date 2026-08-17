import type { ComponentType } from 'react'
import { resolveInteractionType, type InteractionType } from '@/lib/interactionTypes'
import { MultipleChoiceLive } from './MultipleChoiceLive'
import { MultipleChoiceReview } from './MultipleChoiceReview'
import { DragToTargetLive } from './DragToTargetLive'
import { DragToTargetReview } from './DragToTargetReview'
import { NumericEntryLive } from './NumericEntryLive'
import { NumericEntryReview } from './NumericEntryReview'
import type { MultipleChoiceLiveProps, MultipleChoiceReviewProps } from './types'

export const LIVE_INTERACTIONS: Record<InteractionType, ComponentType<MultipleChoiceLiveProps>> = {
  multiple_choice: MultipleChoiceLive,
  drag_to_target: DragToTargetLive,
  numeric_entry: NumericEntryLive,
}

export const REVIEW_INTERACTIONS: Record<
  InteractionType,
  ComponentType<MultipleChoiceReviewProps>
> = {
  multiple_choice: MultipleChoiceReview,
  drag_to_target: DragToTargetReview,
  numeric_entry: NumericEntryReview,
}

export const LiveInteraction = (props: MultipleChoiceLiveProps) => {
  const type = resolveInteractionType(props.question.interactionType)
  const View = LIVE_INTERACTIONS[type] ?? MultipleChoiceLive
  return <View {...props} />
}

export const ReviewInteraction = (props: MultipleChoiceReviewProps) => {
  const type = resolveInteractionType(props.item.interactionType)
  const View = REVIEW_INTERACTIONS[type] ?? MultipleChoiceReview
  return <View {...props} />
}
