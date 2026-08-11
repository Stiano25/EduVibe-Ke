import { useEffect, useRef } from 'react'
import { MathText } from '@/components/ui/MathText'

export type TapSelection = {
  optionIndex: number
  responseTimeMs: number
}

interface TapSelectOptionsProps {
  options: string[]
  questionKey: string
  selectedIndex?: number | null
  disabled?: boolean
  feedback?: { correct: boolean; correctAnswerIndex?: number } | null
  onSelect: (selection: TapSelection) => void
  className?: string
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
}: TapSelectOptionsProps) => {
  const shownAtRef = useRef(performance.now())

  useEffect(() => {
    shownAtRef.current = performance.now()
  }, [questionKey])

  const select = (optionIndex: number) => {
    if (disabled) return
    onSelect({
      optionIndex,
      responseTimeMs: Math.max(0, Math.round(performance.now() - shownAtRef.current)),
    })
  }

  return (
    <div className={`space-y-2 ${className}`} role="group" aria-label="Answer choices">
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
            className={`min-h-12 w-full touch-manipulation rounded-[12px] border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 ${
              showFeedback
                ? feedback.correct
                  ? 'border-emerald-400 bg-emerald-100'
                  : 'border-red-400 bg-red-100'
                : selected
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-slate-200 bg-white hover:border-primary-300 active:scale-[0.99]'
            } disabled:cursor-not-allowed`}
          >
            <span className="mr-2 font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
            <MathText text={option} />
          </button>
        )
      })}
    </div>
  )
}
