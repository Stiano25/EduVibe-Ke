import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { MathText } from '@/components/ui/MathText'
import { LiveDiagram, isLiveDiagramType } from '../diagrams/LiveDiagram'
import { useVisibleResponseTimer } from '@/hooks/useVisibleResponseTimer'
import {
  resolveAdditionLayout,
  resolveColumnOperation,
  applyColumnDigit,
  columnSumMaxDigits,
  expectedSumDigitCount,
  digitChoicesForSum,
  shuffleWithSeed,
} from '@/lib/additionLayout'
import { ColumnOperation } from './ColumnAddition'
import { AdditionWorkedExample } from './AdditionWorkedExample'
import { LEARNER_PANEL, learnerButton } from '@/lib/learnerUi'
import type { MultipleChoiceLiveProps } from './types'

const FALLBACK_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
/** Tiny pause so the last digit paints before Yes! / Try again. */
const AUTO_SUBMIT_MS = 40

const CHIP_TONES = [
  'bg-ev-blue text-white shadow-[0_5px_0_0_#1A93CE]',
  'bg-ev-pink text-white shadow-[0_5px_0_0_#DB3B87]',
  'bg-ev-green text-white shadow-[0_5px_0_0_#5FB93B]',
  'bg-amber-400 text-amber-950 shadow-[0_5px_0_0_#d97706]',
  'bg-violet-400 text-white shadow-[0_5px_0_0_#7c3aed]',
]

const EraserMark = () => (
  <svg viewBox="0 0 56 36" className="h-8 w-12" aria-hidden>
    <g transform="rotate(-16 28 18)">
      <rect x="2" y="8" width="24" height="20" rx="5" fill="#F472B6" />
      <rect x="22" y="8" width="28" height="20" rx="5" fill="#FDE68A" />
      <rect x="22" y="8" width="7" height="20" fill="#F9A8D4" />
      <path d="M8 14h10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
    </g>
  </svg>
)

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
  const layout = resolveAdditionLayout(question.layout)
  const operation = resolveColumnOperation(question.operation)
  const addends = question.addends
  const hasAddends = addends != null && Number.isInteger(addends.a) && Number.isInteger(addends.b)
  const vertical = layout === 'vertical' && hasAddends
  const scaffoldCarry = operation === 'subtract' ? false : question.scaffoldCarry !== false
  const workedSteps = Array.isArray(question.workedSteps) ? question.workedSteps : []
  const maxDigits = hasAddends ? columnSumMaxDigits(addends.a, addends.b, operation) : 6
  const autoLen = hasAddends ? expectedSumDigitCount(addends.a, addends.b, operation) : null
  const padDigits = useMemo(() => {
    if (!hasAddends) return FALLBACK_DIGITS
    return shuffleWithSeed(
      digitChoicesForSum(addends.a, addends.b, question.difficulty, operation),
      question.id
    )
  }, [hasAddends, addends, question.difficulty, question.id, operation])
  const allowed = useMemo(() => new Set(padDigits.map(String)), [padDigits])
  const sent = useRef(false)

  const press = (key: string) => {
    if (disabled || sent.current) return
    if (vertical) {
      setDigits((prev) => applyColumnDigit(prev, key, maxDigits))
      return
    }
    if (key === 'back') {
      setDigits((prev) => prev.slice(0, -1))
      return
    }
    setDigits((prev) => (prev + key).slice(0, maxDigits))
  }

  const submit = () => {
    if (disabled || sent.current || !onSubmitNumeric || digits.length === 0) return
    sent.current = true
    onSubmitNumeric({
      submittedValue: digits,
      responseTimeMs: measureResponseTimeMs(),
    })
  }

  const latest = useRef({ submit, press, disabled, allowed })
  latest.current = { submit, press, disabled, allowed }

  useEffect(() => {
    sent.current = false
  }, [question.id])

  useEffect(() => {
    if (disabled || sent.current || autoLen == null || digits.length < autoLen) return
    const t = window.setTimeout(() => latest.current.submit(), AUTO_SUBMIT_MS)
    return () => window.clearTimeout(t)
  }, [digits, autoLen, disabled, question.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { submit: doSubmit, press: doPress, disabled: isDisabled, allowed: keys } =
        latest.current
      if (isDisabled) return
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

      if (event.key >= '0' && event.key <= '9') {
        if (!keys.has(event.key)) return
        event.preventDefault()
        doPress(event.key)
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        doPress('back')
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        doSubmit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [question.id])

  return (
    <div className={`${LEARNER_PANEL} p-5 space-y-4`}>
      <div ref={interactiveRef} className="space-y-4">
        {!vertical && visualBrief && isLiveDiagramType(visualBrief.diagramType) ? (
          <LiveDiagram diagramType={visualBrief.diagramType} params={visualBrief.params} />
        ) : !vertical && diagramUrl ? (
          <img
            src={diagramUrl}
            alt={`Picture for the question: ${question.question}`}
            className="max-h-52 mx-auto rounded-ev-sm border border-violet-100"
          />
        ) : null}

        <MathText as="p" text={question.question} className="text-lg font-bold text-ev-ink" />

        {vertical && workedSteps.length > 0 ? (
          <>
            <AdditionWorkedExample
              a={addends.a}
              b={addends.b}
              operation={operation}
              steps={workedSteps}
              scaffoldCarry={scaffoldCarry}
            />
            <div
              className="min-h-14 rounded-ev-md border-2 border-ev-blue bg-ev-blue-soft flex items-center justify-center px-4"
              aria-live="polite"
            >
              <span className="text-3xl font-black tracking-widest text-ev-ink">
                {digits || '—'}
              </span>
            </div>
          </>
        ) : vertical ? (
          <div className="flex justify-center rounded-ev-md border-2 border-ev-blue bg-ev-blue-soft">
            <ColumnOperation
              a={addends.a}
              b={addends.b}
              operation={operation}
              sumText={digits}
              scaffoldCarry={scaffoldCarry}
              reveal="sum"
              animate
            />
          </div>
        ) : (
          <div
            className="min-h-16 rounded-ev-md border-2 border-ev-blue bg-ev-blue-soft flex items-center justify-center px-4"
            aria-live="polite"
          >
            <span className="text-4xl font-black tracking-widest text-ev-ink">
              {digits || '—'}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 max-w-sm mx-auto">
          {padDigits.map((d, i) => (
            <button
              key={`${question.id}-${d}`}
              type="button"
              disabled={disabled}
              onClick={() => press(String(d))}
              className={`ev-press grid h-16 w-16 place-items-center rounded-full text-3xl font-black touch-manipulation disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ev-blue/40 active:translate-y-[4px] active:shadow-none ${CHIP_TONES[i % CHIP_TONES.length]}`}
              aria-label={String(d)}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            disabled={disabled || digits.length === 0}
            onClick={() => press('back')}
            className="ev-press inline-flex h-16 items-center gap-1.5 rounded-2xl bg-[#FDE68A] px-3 shadow-[0_5px_0_0_#d97706] touch-manipulation disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ev-pink/40 active:translate-y-[4px] active:shadow-none"
            aria-label="Rubber"
          >
            <EraserMark />
            <span className="text-sm font-black text-amber-950">Rubber</span>
          </button>
        </div>

        {autoLen == null ? (
          <button
            type="button"
            disabled={disabled || digits.length === 0}
            onClick={submit}
            className={learnerButton('primary', 'lg', 'w-full max-w-xs mx-auto flex')}
          >
            {flash ? (flash.correct ? flashCopy.correct : flashCopy.incorrect) : 'Done'}
          </button>
        ) : null}
      </div>

      {flash && (
        <p className={`text-base font-bold ${flash.correct ? 'text-emerald-800' : 'text-red-800'}`}>
          {flash.correct ? flashCopy.correct : flashCopy.incorrect}
          {!flash.correct && flash.expectedValue != null
            ? ` The answer is ${flash.expectedValue}.`
            : ''}
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
}
