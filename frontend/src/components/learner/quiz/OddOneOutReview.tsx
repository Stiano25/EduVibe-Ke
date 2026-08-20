import { MultipleChoiceReview } from './MultipleChoiceReview'
import type { MultipleChoiceReviewProps } from './types'

/** Review uses the MCQ card — same selected vs correct index. */
export const OddOneOutReview = (props: MultipleChoiceReviewProps) => (
  <MultipleChoiceReview {...props} />
)
