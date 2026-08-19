import { Loader2 } from 'lucide-react'
import { modalityLabel } from '@/lib/modalityQuiz'
import { MathText } from '@/components/ui/MathText'
import { TapSelectOptions } from '../TapSelectOptions'
import { LiveDiagram, isLiveDiagramType } from '../diagrams/LiveDiagram'
import { ObjectMentionVisual, inferObjectKind } from '../diagrams/objectIcons'
import { LEARNER_PANEL } from '@/lib/learnerUi'
import type { MultipleChoiceLiveProps } from './types'

/** Live MCQ body. Sibling interaction types get their own file — do not extend this. */
export const MultipleChoiceLive = ({
  question,
  diagramUrl,
  visualBrief,
  selected,
  submitting,
  flash,
  flashCopy,
  interactiveRef,
  onSelect,
}: MultipleChoiceLiveProps) => (
  <div className={`${LEARNER_PANEL} p-5 space-y-3`}>
    <div className="flex flex-wrap gap-2">
      {question.modality && (
        <span className="px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-800 rounded-full">
          {modalityLabel(question.modality)}
        </span>
      )}
      {question.bloomLevel && (
        <span className="px-2 py-0.5 text-[10px] font-semibold bg-ev-line/50 text-ev-muted rounded-full capitalize">
          {question.bloomLevel}
        </span>
      )}
    </div>

    <div ref={interactiveRef} className="space-y-3">
      {question.steps && question.steps.length > 0 && (
        <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 bg-ev-pink-soft border border-amber-100 rounded-ev-sm p-3">
          {question.steps.map((s, i) => (
            <li key={i}>
              <MathText text={s} />
            </li>
          ))}
        </ol>
      )}

      {visualBrief && isLiveDiagramType(visualBrief.diagramType) ? (
        <LiveDiagram diagramType={visualBrief.diagramType} params={visualBrief.params} />
      ) : diagramUrl ? (
        <img
          src={diagramUrl}
          alt={`Picture for the question: ${question.question}`}
          className="max-h-52 mx-auto rounded-ev-sm border border-violet-100"
        />
      ) : inferObjectKind(question.question) ? (
        <ObjectMentionVisual text={question.question} />
      ) : null}

      <MathText
        as="p"
        text={question.question}
        className="text-lg font-bold text-ev-ink"
      />

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

    {flash && (
      <p className={`text-xs font-semibold ${flash.correct ? 'text-emerald-800' : 'text-red-800'}`}>
        {flash.correct ? flashCopy.correct : flashCopy.incorrect}
      </p>
    )}

    {flash && !flash.correct && flash.correctAnswerIndex != null && (
      <p className="text-xs text-emerald-800">
        Correct answer: {String.fromCharCode(65 + flash.correctAnswerIndex)}.{' '}
        {flash.explanation ? <MathText text={flash.explanation} /> : null}
      </p>
    )}

    {submitting && !flash && (
      <p className="text-xs text-ev-pink-edge flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking…
      </p>
    )}
  </div>
)
