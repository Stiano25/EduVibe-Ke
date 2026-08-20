import { MathText } from '@/components/ui/MathText'
import { TapSelectOptions } from '../TapSelectOptions'
import { LEARNER_PANEL } from '@/lib/learnerUi'
import type { MultipleChoiceLiveProps } from './types'

/** Same tap-select + single-index grading as MCQ. Stem names the activity. */
export const OddOneOutLive = ({
  question,
  selected,
  submitting,
  flash,
  interactiveRef,
  onSelect,
}: MultipleChoiceLiveProps) => (
  <div className={`${LEARNER_PANEL} p-5 space-y-3`}>
    <div ref={interactiveRef} className="space-y-3">
      <MathText as="p" text={question.question} className="text-lg font-bold text-ev-ink" />
      <p className="text-sm font-semibold text-ev-muted">Which one does not belong?</p>
      <TapSelectOptions
        questionKey={question.id}
        options={question.options}
        selectedIndex={selected}
        disabled={submitting || !!flash}
        feedback={flash}
        onSelect={onSelect}
        visibilityRootRef={interactiveRef}
      />
    </div>
  </div>
)
