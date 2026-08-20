import { useState } from 'react'
import { MathText } from '@/components/ui/MathText'
import { useVisibleResponseTimer } from '@/hooks/useVisibleResponseTimer'
import { LEARNER_PANEL, learnerButton } from '@/lib/learnerUi'
import type { MultipleChoiceLiveProps } from './types'

const PAIR_TONES = [
  'border-ev-blue bg-ev-blue-soft text-ev-blue-edge',
  'border-ev-pink bg-ev-pink-soft text-ev-pink-edge',
  'border-ev-green bg-ev-green-soft text-ev-green-edge',
  'border-amber-400 bg-amber-50 text-amber-900',
]

const TAP =
  'min-h-14 w-full rounded-ev-sm border-2 p-3 text-left text-base font-semibold touch-manipulation transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ev-blue/40'

/**
 * Tap a left item, then tap a right item to pair them.
 * Same large targets and accent colours as the rest of the learner quiz.
 */
export const MatchingPairsLive = ({
  question,
  submitting,
  flash,
  flashCopy,
  interactiveRef,
  onSubmitMatching,
}: MultipleChoiceLiveProps) => {
  const left = Array.isArray(question.left) ? question.left : []
  const right = Array.isArray(question.right) ? question.right : []
  const [pairs, setPairs] = useState<Record<number, number>>({})
  const [pickedLeft, setPickedLeft] = useState<number | null>(null)
  const { measureResponseTimeMs } = useVisibleResponseTimer(question.id, interactiveRef)
  const disabled = submitting || !!flash
  const usedRight = new Set(Object.values(pairs))
  const allPaired = left.length > 0 && Object.keys(pairs).length === left.length

  const pairLeft = (leftIndex: number) => {
    if (disabled) return
    if (pairs[leftIndex] !== undefined) {
      const next = { ...pairs }
      delete next[leftIndex]
      setPairs(next)
    }
    setPickedLeft(leftIndex)
  }

  const pairRight = (rightIndex: number) => {
    if (disabled || pickedLeft == null) return
    const next = { ...pairs }
    for (const [l, r] of Object.entries(next)) {
      if (Number(r) === rightIndex) delete next[Number(l)]
    }
    next[pickedLeft] = rightIndex
    setPairs(next)
    setPickedLeft(null)
  }

  const submit = () => {
    if (disabled || !allPaired || !onSubmitMatching) return
    onSubmitMatching({
      submittedPairs: left.map((_, i) => [i, pairs[i]]),
      responseTimeMs: measureResponseTimeMs(),
    })
  }

  const toneForLeft = (leftIndex: number) =>
    pairs[leftIndex] === undefined ? '' : PAIR_TONES[leftIndex % PAIR_TONES.length]

  return (
    <div className={`${LEARNER_PANEL} p-5 space-y-4`}>
      <div ref={interactiveRef} className="space-y-4">
        <MathText as="p" text={question.question} className="text-lg font-bold text-ev-ink" />
        <p className="text-sm font-semibold text-ev-muted">Tap a word on the left, then tap its match.</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            {left.map((item, i) => (
              <button
                key={`L-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => pairLeft(i)}
                className={`${TAP} ${
                  pickedLeft === i
                    ? 'border-ev-blue bg-ev-blue-soft'
                    : toneForLeft(i) || 'border-ev-line bg-white'
                }`}
              >
                <MathText text={String(item)} />
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {right.map((item, i) => {
              const owner = Object.entries(pairs).find(([, r]) => r === i)
              const tone = owner ? PAIR_TONES[Number(owner[0]) % PAIR_TONES.length] : ''
              return (
                <button
                  key={`R-${i}`}
                  type="button"
                  disabled={disabled || (usedRight.has(i) && pickedLeft == null)}
                  onClick={() => pairRight(i)}
                  className={`${TAP} ${tone || 'border-ev-line bg-white'}`}
                >
                  <MathText text={String(item)} />
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={disabled || !allPaired}
          onClick={submit}
          className={learnerButton('primary', 'lg', 'w-full')}
        >
          {flash
            ? flash.correct
              ? flashCopy.correct
              : `${flashCopy.incorrect}${
                  flash.matchedPairs != null && flash.totalPairs != null
                    ? ` ${flash.matchedPairs} of ${flash.totalPairs} matches`
                    : ''
                }`
            : 'Done'}
        </button>
      </div>
    </div>
  )
}
