import { useState } from 'react'
import { ColumnAddition } from './ColumnAddition'
import type { ColumnReveal, WorkedStep } from '@/lib/additionLayout'

type AdditionWorkedExampleProps = {
  a: number
  b: number
  steps: WorkedStep[]
  scaffoldCarry?: boolean
}

export const AdditionWorkedExample = ({
  a,
  b,
  steps,
  scaffoldCarry = true,
}: AdditionWorkedExampleProps) => {
  const [index, setIndex] = useState(0)
  const safeIndex = Math.min(Math.max(index, 0), Math.max(steps.length - 1, 0))
  const current = steps[safeIndex]
  const reveal: ColumnReveal = current?.reveal || 'addends'
  const last = safeIndex >= steps.length - 1

  return (
    <div className="rounded-ev-md border-2 border-ev-pink bg-ev-pink-soft/70 p-3 space-y-3">
      <div className="flex justify-center">
        <ColumnAddition
          a={a}
          b={b}
          scaffoldCarry={scaffoldCarry}
          fillCarry={reveal === 'carry' || reveal === 'sum'}
          reveal={reveal}
          highlightOnes={reveal === 'ones' || reveal === 'carry'}
          sumText={reveal === 'sum' ? String(a + b) : ''}
          animate
        />
      </div>
      <p
        className="text-sm font-semibold text-amber-950 text-center ev-digit-in"
        key={current?.id || safeIndex}
       
      >
        {current?.text}
      </p>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={safeIndex === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-ev-pink bg-white disabled:opacity-40"
        >
          Back
        </button>
        <span className="text-[11px] font-semibold text-amber-800">
          Step {safeIndex + 1} of {steps.length}
        </span>
        <button
          type="button"
          disabled={last}
          onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
          className="px-3 py-1.5 rounded-full text-xs font-bold bg-ev-pink text-white disabled:opacity-40"
        >
          {last ? 'Done' : 'Next step'}
        </button>
      </div>
    </div>
  )
}
