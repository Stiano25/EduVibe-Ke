import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { MathText } from '@/components/ui/MathText'
import { LiveDiagram, isLiveDiagramType } from '../diagrams/LiveDiagram'
import { useVisibleResponseTimer } from '@/hooks/useVisibleResponseTimer'
import type { MultipleChoiceLiveProps } from './types'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0'] as const

export const NumericEntryLive = ({
  question,
  diagramUrl,
  visualBrief,
  submitting,
  flash,
  flashCopy,
  interactiveRef,
  onSubmitNumeric,
}: MultipleChoiceLiveProps) => {
  const [digits, setDigits] = useState('')
  const { measureResponseTimeMs } = useVisibleResponseTimer(question.id, interactiveRef)
  const disabled = submitting || !!flash

  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return
    if (key === 'back') {
      setDigits((prev) => prev.slice(0, -1))
      return
    }
    setDigits((prev) => (prev + key).slice(0, 6))
  }

  const submit = () => {
    if (disabled || !onSubmitNumeric || digits.length === 0) return
    onSubmitNumeric({
      submittedValue: digits,
      responseTimeMs: measureResponseTimeMs(),
    })
  }

  return (
    <div className="p-5 rounded-[16px] border-2 border-slate-200 bg-white space-y-4">
      <div ref={interactiveRef} className="space-y-4">
        {visualBrief && isLiveDiagramType(visualBrief.diagramType) ? (
          <LiveDiagram diagramType={visualBrief.diagramType} params={visualBrief.params} />
        ) : diagramUrl ? (
          <img
            src={diagramUrl}
            alt=""
            className="max-h-52 mx-auto rounded-[12px] border border-violet-100"
          />
        ) : null}

        <MathText as="p" text={question.question} className="text-lg font-bold text-[#0F172A]" />

        <div
          className="min-h-16 rounded-[16px] border-2 border-indigo-200 bg-indigo-50 flex items-center justify-center px-4"
          aria-live="polite"
        >
          <span
            className="text-4xl font-black tracking-widest text-[#0F172A]"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            {digits || '—'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => press(key)}
              className="min-h-14 rounded-[14px] border-2 border-slate-200 bg-white text-xl font-bold text-[#0F172A] touch-manipulation active:scale-[0.98] disabled:opacity-50"
              style={{ fontFamily: 'Fredoka, sans-serif' }}
              aria-label={key === 'back' ? 'Backspace' : key}
            >
              {key === 'back' ? '⌫' : key}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={disabled || digits.length === 0}
          onClick={submit}
          className="w-full py-3 rounded-full bg-indigo-600 text-white font-bold disabled:opacity-50"
          style={{ fontFamily: 'Fredoka, sans-serif' }}
        >
          {flash ? (flash.correct ? flashCopy.correct : flashCopy.incorrect) : 'Done'}
        </button>
      </div>

      {flash && (
        <p className={`text-xs font-semibold ${flash.correct ? 'text-emerald-800' : 'text-red-800'}`}>
          {flash.correct ? flashCopy.correct : flashCopy.incorrect}
          {!flash.correct && flash.correctAnswerIndex != null
            ? ` · ${flash.correctAnswerIndex}`
            : ''}
        </p>
      )}

      {submitting && !flash && (
        <p className="text-xs text-primary-700 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Checking…
        </p>
      )}
    </div>
  )
}
