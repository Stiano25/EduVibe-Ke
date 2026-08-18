import { CheckCircle, XCircle } from 'lucide-react'
import { MathText } from '@/components/ui/MathText'
import { LiveDiagram, isLiveDiagramType } from '../diagrams/LiveDiagram'
import { resolveAdditionLayout, resolveColumnOperation } from '@/lib/additionLayout'
import { ColumnOperation } from './ColumnAddition'
import type { MultipleChoiceReviewProps } from './types'

export const NumericEntryReview = ({
  item,
  index,
  diagramUrl,
  visualBrief,
}: MultipleChoiceReviewProps) => {
  const submitted = item.submittedValue ?? item.selectedOptionIndex
  const expected = item.expectedValue
  const layout = resolveAdditionLayout(item.layout)
  const operation = resolveColumnOperation(item.operation)
  const addends = item.addends
  const vertical =
    layout === 'vertical' &&
    addends != null &&
    Number.isInteger(addends.a) &&
    Number.isInteger(addends.b)

  return (
    <div
      className={`p-5 rounded-ev-md border-2 ${
        item.correct ? 'border-ev-green bg-emerald-50/40' : 'border-ev-red bg-ev-red-soft/40'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs font-bold text-ev-muted">Q{index + 1}</span>
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

      {vertical ? (
        <div className="flex justify-center mb-3">
          <ColumnOperation
            a={addends.a}
            b={addends.b}
            operation={operation}
            sumText={submitted == null ? '' : String(submitted)}
            scaffoldCarry={operation === 'subtract' ? false : item.scaffoldCarry !== false}
            reveal="sum"
            animate={false}
          />
        </div>
      ) : visualBrief && isLiveDiagramType(visualBrief.diagramType) ? (
        <LiveDiagram diagramType={visualBrief.diagramType} params={visualBrief.params} className="mb-3" />
      ) : diagramUrl ? (
        <img
          src={diagramUrl}
          alt={`Picture for the question: ${item.question}`}
          className="mb-3 max-h-48 mx-auto rounded-ev-sm border border-ev-line"
        />
      ) : null}

      <MathText as="p" text={item.question} className="font-bold text-ev-ink mb-3" />
      <p className="text-sm text-slate-700">
        You wrote: {submitted == null ? '—' : submitted}
        {expected != null ? ` · Answer: ${expected}` : ''}
      </p>
    </div>
  )
}
