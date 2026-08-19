import { useEffect, useState } from 'react'
import { ColumnOperation } from './ColumnAddition'
import { columnResult, resolveColumnOperation, type ColumnOperation as ColumnOp, type ColumnReveal, type WorkedStep } from '@/lib/additionLayout'

type AdditionWorkedExampleProps = {
  a: number
  b: number
  operation?: ColumnOp
  steps: WorkedStep[]
  scaffoldCarry?: boolean
}

/** Pause between autoplay steps. Brief enough to keep moving, long enough to read. */
export const WORKED_EXAMPLE_STEP_MS = 1600

export const AdditionWorkedExample = ({
  a,
  b,
  operation = 'add',
  steps,
  scaffoldCarry = true,
}: AdditionWorkedExampleProps) => {
  const [index, setIndex] = useState(0)
  const [replayKey, setReplayKey] = useState(0)
  const lastIndex = Math.max(steps.length - 1, 0)
  const safeIndex = Math.min(Math.max(index, 0), lastIndex)
  const current = steps[safeIndex]
  const reveal: ColumnReveal = current?.reveal || 'addends'
  const last = safeIndex >= lastIndex
  const playing = steps.length > 1 && !last

  useEffect(() => {
    if (!playing) return
    const t = window.setTimeout(() => setIndex((i) => Math.min(i + 1, lastIndex)), WORKED_EXAMPLE_STEP_MS)
    return () => window.clearTimeout(t)
  }, [playing, safeIndex, lastIndex, replayKey])

  const watchAgain = () => {
    setIndex(0)
    setReplayKey((k) => k + 1)
  }

  return (
    <div className="rounded-ev-md border-2 border-ev-pink bg-ev-pink-soft/70 p-3 space-y-3" data-worked-example>
      <div className="flex justify-center">
        <ColumnOperation
          a={a}
          b={b}
          operation={resolveColumnOperation(operation)}
          scaffoldCarry={scaffoldCarry}
          fillCarry={reveal === 'carry' || reveal === 'sum'}
          reveal={reveal}
          highlightOnes={reveal === 'ones' || reveal === 'carry'}
          sumText={reveal === 'sum' ? String(columnResult(a, b, operation)) : ''}
          animate
        />
      </div>
      <p
        className="text-sm font-semibold text-amber-950 text-center ev-digit-in"
        key={`${replayKey}-${current?.id || safeIndex}`}
        data-worked-step={safeIndex}
        data-testid="worked-example-step"
      >
        {current?.text}
      </p>
      <div className="flex items-center justify-center gap-2">
        <span className="text-[11px] font-semibold text-amber-800">
          Step {safeIndex + 1} of {steps.length}
        </span>
        {last ? (
          <button
            type="button"
            onClick={watchAgain}
            className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-ev-pink bg-white"
          >
            Watch again
          </button>
        ) : null}
      </div>
    </div>
  )
}
