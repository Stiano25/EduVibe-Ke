import { CheckCircle, XCircle } from 'lucide-react'
import { MathText } from '@/components/ui/MathText'
import type { MultipleChoiceReviewProps } from './types'

export const DragToTargetReview = ({ item, index }: MultipleChoiceReviewProps) => {
  const placed = item.placedCount ?? item.selectedOptionIndex
  const expected = item.expectedCount

  return (
    <div
      className={`p-5 rounded-[16px] border-2 ${
        item.correct ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs font-bold text-slate-600">Q{index + 1}</span>
        {item.correct ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CheckCircle className="w-3.5 h-3.5" /> Correct
          </span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-red-700">
            <XCircle className="w-3.5 h-3.5" /> Incorrect
          </span>
        )}
      </div>
      <MathText as="p" text={item.question} className="font-bold text-[#0F172A] mb-3" />
      <p className="text-sm text-slate-700">
        Box: {placed}
        {expected != null ? ` · Need: ${expected}` : ''}
      </p>
    </div>
  )
}
