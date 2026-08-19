import { CheckCircle, XCircle } from 'lucide-react'
import { modalityLabel } from '@/lib/modalityQuiz'
import { MathText } from '@/components/ui/MathText'
import { LiveDiagram, isLiveDiagramType } from '../diagrams/LiveDiagram'
import { ObjectMentionVisual, inferObjectKind } from '../diagrams/objectIcons'
import { OptionVisual } from '../OptionVisual'
import type { MultipleChoiceReviewProps } from './types'

/** Review MCQ card. Sibling interaction types get their own file — do not extend this. */
export const MultipleChoiceReview = ({
  item,
  index,
  diagramUrl,
  visualBrief,
}: MultipleChoiceReviewProps) => (
  <div
    className={`p-5 rounded-ev-md border-2 ${
      item.correct ? 'border-ev-green bg-emerald-50/40' : 'border-ev-red bg-ev-red-soft/40'
    }`}
  >
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <span className="text-xs font-bold text-ev-muted">Q{index + 1}</span>
      {item.modality && (
        <span className="px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-800 rounded-full">
          {modalityLabel(item.modality)}
        </span>
      )}
      {item.correct ? (
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-ev-green-edge">
          <CheckCircle className="w-3.5 h-3.5" /> Correct
        </span>
      ) : (
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-ev-red-edge">
          <XCircle className="w-3.5 h-3.5" /> Incorrect
        </span>
      )}
    </div>

    {item.steps && item.steps.length > 0 && (
      <ol className="mb-3 list-decimal pl-5 text-sm text-slate-700 bg-ev-pink-soft border border-amber-100 rounded-ev-sm p-3 space-y-1">
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
        alt={`Picture for the question: ${item.question}`}
        className="mb-3 max-h-48 mx-auto rounded-ev-sm border border-ev-line"
      />
    ) : inferObjectKind(item.question) ? (
      <div className="mb-3">
        <ObjectMentionVisual text={item.question} />
      </div>
    ) : null}

    <MathText
      as="p"
      text={item.question}
      className="text-base font-semibold text-ev-ink mb-3"
    />

    <div className="space-y-2">
      {item.options.map((opt, oi) => {
        const isSelected = oi === item.selectedOptionIndex
        const isCorrectOpt = oi === item.correctAnswerIndex
        return (
          <div
            key={oi}
            className={`p-3 rounded-ev-sm border-2 text-sm ${
              isCorrectOpt
                ? 'bg-ev-green-soft border-ev-green-edge'
                : isSelected
                  ? 'bg-ev-red-soft border-ev-red-edge'
                  : 'bg-white border-ev-line'
            }`}
          >
            <span className="font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span>
            <OptionVisual option={opt} compact />
            {isSelected && !isCorrectOpt && (
              <span className="ml-2 text-[10px] font-bold text-ev-red-edge">Your answer</span>
            )}
            {isCorrectOpt && (
              <span className="ml-2 text-[10px] font-bold text-ev-green-edge">Correct</span>
            )}
          </div>
        )
      })}
    </div>

    {item.explanation && (
      <p className="mt-3 text-xs text-slate-700 whitespace-pre-line bg-white/70 rounded-[10px] p-3 border border-ev-line">
        <MathText text={item.explanation} />
      </p>
    )}
  </div>
)
