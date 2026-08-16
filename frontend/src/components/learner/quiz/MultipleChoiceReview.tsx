import { CheckCircle, XCircle } from 'lucide-react'
import { modalityLabel } from '@/lib/modalityQuiz'
import { MathText } from '@/components/ui/MathText'
import { LiveDiagram, isLiveDiagramType } from '../diagrams/LiveDiagram'
import type { MultipleChoiceReviewProps } from './types'

/** Review MCQ card. Sibling interaction types get their own file — do not extend this. */
export const MultipleChoiceReview = ({
  item,
  index,
  diagramUrl,
  visualBrief,
}: MultipleChoiceReviewProps) => (
  <div
    className={`p-5 rounded-[16px] border-2 ${
      item.correct ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40'
    }`}
  >
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <span className="text-xs font-bold text-slate-600">Q{index + 1}</span>
      {item.modality && (
        <span className="px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-800 rounded-full">
          {modalityLabel(item.modality)}
        </span>
      )}
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

    {item.steps && item.steps.length > 0 && (
      <ol className="mb-3 list-decimal pl-5 text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-[12px] p-3 space-y-1">
        {item.steps.map((s, si) => (
          <li key={si}>
            <MathText text={s} />
          </li>
        ))}
      </ol>
    )}

    {visualBrief && isLiveDiagramType(visualBrief.diagramType) ? (
      <LiveDiagram diagramType={visualBrief.diagramType} params={visualBrief.params} className="mb-3" />
    ) : diagramUrl ? (
      <img
        src={diagramUrl}
        alt=""
        className="mb-3 max-h-48 mx-auto rounded-[12px] border border-slate-200"
      />
    ) : null}

    <MathText
      as="p"
      text={item.question}
      className="text-base font-semibold text-[#0F172A] mb-3"
    />

    <div className="space-y-2">
      {item.options.map((opt, oi) => {
        const isSelected = oi === item.selectedOptionIndex
        const isCorrectOpt = oi === item.correctAnswerIndex
        return (
          <div
            key={oi}
            className={`p-3 rounded-[12px] border-2 text-sm ${
              isCorrectOpt
                ? 'bg-emerald-100 border-emerald-400'
                : isSelected
                  ? 'bg-red-100 border-red-400'
                  : 'bg-white border-slate-200'
            }`}
          >
            <span className="font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span>
            <MathText text={opt} />
            {isSelected && !isCorrectOpt && (
              <span className="ml-2 text-[10px] font-bold text-red-700">Your answer</span>
            )}
            {isCorrectOpt && (
              <span className="ml-2 text-[10px] font-bold text-emerald-700">Correct</span>
            )}
          </div>
        )
      })}
    </div>

    {item.explanation && (
      <p className="mt-3 text-xs text-slate-700 whitespace-pre-line bg-white/70 rounded-[10px] p-3 border border-slate-200">
        <MathText text={item.explanation} />
      </p>
    )}
  </div>
)
