import { useRef, type RefObject } from 'react'
import { useVisibleResponseTimer } from '@/hooks/useVisibleResponseTimer'
import { OptionVisual } from './OptionVisual'
import type { QuizOption } from './quiz/types'

export type TapSelection = {
  optionIndex: number
  responseTimeMs: number
}

interface TapSelectOptionsProps {
  options: QuizOption[]
  questionKey: string
  selectedIndex?: number | null
  disabled?: boolean
  feedback?: { correct: boolean; correctAnswerIndex?: number } | null
  onSelect: (selection: TapSelection) => void
  className?: string
  /** Observe this element (stem + options) instead of the option list alone. */
  visibilityRootRef?: RefObject<Element | null>
}

/** Generic accessible tap-target answers with per-question response timing. */
export const TapSelectOptions = ({
  options,
  questionKey,
  selectedIndex = null,
  disabled = false,
  feedback = null,
  onSelect,
  className = '',
  visibilityRootRef,
}: TapSelectOptionsProps) => {
  const ownRootRef = useRef<HTMLDivElement>(null)
  const targetRef = visibilityRootRef ?? ownRootRef
  const { measureResponseTimeMs } = useVisibleResponseTimer(questionKey, targetRef)

  const select = (optionIndex: number) => {
    if (disabled) return
    onSelect({
      optionIndex,
      responseTimeMs: measureResponseTimeMs(),
    })
  }

  return (
    <div
      ref={visibilityRootRef ? undefined : ownRootRef}
      className={`space-y-2 ${className}`}
      role="group"
      aria-label="Answer choices"
    >
      {options.map((option, optionIndex) => {
        const selected = selectedIndex === optionIndex
        const showFeedback = feedback && selected
        return (
          <button
            key={`${questionKey}-${optionIndex}`}
            type="button"
            disabled={disabled}
            onClick={() => select(optionIndex)}
            aria-pressed={selected}
            className={`min-h-14 w-full touch-manipulation rounded-ev-sm border-2 p-4 text-left text-base transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ev-blue/40 ${
              showFeedback
                ? feedback.correct
                  ? 'border-ev-green-edge bg-ev-green-soft'
                  : 'border-ev-red-edge bg-ev-red-soft'
                : selected
                  ? 'border-ev-blue bg-ev-blue-soft'
                  : 'border-ev-line bg-white hover:border-ev-blue active:scale-[0.99]'
            } disabled:cursor-not-allowed`}
          >
            <span className="mr-2 font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
            <OptionVisual option={option} compact />
          </button>
        )
      })}
    </div>
  )
}
