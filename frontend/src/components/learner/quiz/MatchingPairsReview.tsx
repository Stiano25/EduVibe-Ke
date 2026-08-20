import { CheckCircle, XCircle } from 'lucide-react'
import { MathText } from '@/components/ui/MathText'
import { LEARNER_PANEL } from '@/lib/learnerUi'
import type { MultipleChoiceReviewProps } from './types'

export const MatchingPairsReview = ({ item, index }: MultipleChoiceReviewProps) => {
  const left = Array.isArray(item.left) ? item.left : []
  const right = Array.isArray(item.right) ? item.right : []
  const expected = new Map(
    (item.correctPairs || []).map(([l, r]) => [Number(l), Number(r)])
  )
  const submitted = new Map(
    (item.submittedPairs || []).map((pair) => [Number(pair[0]), Number(pair[1])])
  )

  return (
    <div
      className={`${LEARNER_PANEL} p-5 border-2 ${
        item.correct ? 'border-ev-green bg-emerald-50/40' : 'border-ev-red bg-ev-red-soft/40'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs font-bold text-ev-muted">Q{index + 1}</span>
        {item.correct ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-ev-green-edge">
            <CheckCircle className="w-3.5 h-3.5" /> All matches
          </span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-ev-red-edge">
            <XCircle className="w-3.5 h-3.5" /> {item.matchedPairs ?? 0} of {item.totalPairs ?? left.length} matches
          </span>
        )}
      </div>
      <MathText as="p" text={item.question} className="text-base font-semibold text-ev-ink mb-3" />
      <div className="space-y-2">
        {left.map((label, i) => {
          const got = submitted.get(i)
          const need = expected.get(i)
          const ok = got === need
          return (
            <p key={i} className={`text-sm rounded-ev-sm border-2 p-3 ${ok ? 'border-ev-green-edge bg-ev-green-soft' : 'border-ev-red-edge bg-ev-red-soft'}`}>
              <span className="font-bold">{label}</span>
              {' → '}
              {got != null ? right[got] ?? '—' : '—'}
              {!ok && need != null ? (
                <span className="block text-xs text-ev-green-edge mt-1">Match: {right[need]}</span>
              ) : null}
            </p>
          )
        })}
      </div>
    </div>
  )
}
