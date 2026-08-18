import { useRef, useState } from 'react'
import { MathText } from '@/components/ui/MathText'
import { useVisibleResponseTimer } from '@/hooks/useVisibleResponseTimer'
import { ObjectIcon, resolveObjectKind } from '../diagrams/objectIcons'
import { LEARNER_PANEL, learnerButton } from '@/lib/learnerUi'
import type { MultipleChoiceLiveProps } from './types'

const DONE = 'Done'
const BOX = 'Box'

/** 56px floor: small children consistently miss the old 40px icons. */
const TARGET =
  'grid place-items-center min-h-14 min-w-14 rounded-ev-sm touch-manipulation transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ev-blue/40'

export const DragToTargetLive = ({
  question,
  submitting,
  flash,
  flashCopy,
  interactiveRef,
  onSubmitDrag,
}: MultipleChoiceLiveProps) => {
  const poolSize = Math.min(20, Math.max(Number(question.objectPool) || 8, 3))
  const objectKind = resolveObjectKind(question.objectKind, question.question)
  const [inBox, setInBox] = useState<number[]>([])
  const [dragging, setDragging] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const { measureResponseTimeMs } = useVisibleResponseTimer(question.id, interactiveRef)
  const pool = Array.from({ length: poolSize }, (_, i) => i).filter((id) => !inBox.includes(id))
  const disabled = submitting || !!flash

  const dropIntoBox = (id: number) => {
    if (disabled || inBox.includes(id)) return
    setInBox((prev) => [...prev, id])
  }

  const returnToPool = (id: number) => {
    if (disabled) return
    setInBox((prev) => prev.filter((x) => x !== id))
  }

  const onPointerUp = (id: number, clientX: number, clientY: number) => {
    setDragging(null)
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    const over = clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom
    if (over) dropIntoBox(id)
  }

  const submit = () => {
    if (disabled || !onSubmitDrag) return
    onSubmitDrag({
      placedCount: inBox.length,
      responseTimeMs: measureResponseTimeMs(),
    })
  }

  return (
    <div className={`${LEARNER_PANEL} p-5 space-y-4`}>
      <div ref={interactiveRef} className="space-y-4">
        <MathText as="p" text={question.question} className="text-lg font-bold text-ev-ink" />

        <div className="flex flex-wrap gap-2 min-h-16 p-2 rounded-ev-sm bg-white border border-ev-line">
          {pool.map((id) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-label={`Put one ${objectKind} in the box`}
              className={`${TARGET} ${dragging === id ? 'opacity-50' : ''}`}
              onClick={() => dropIntoBox(id)}
              onPointerDown={() => setDragging(id)}
              onPointerUp={(e) => onPointerUp(id, e.clientX, e.clientY)}
            >
              <ObjectIcon kind={objectKind} className="h-14 w-14" />
            </button>
          ))}
        </div>

        <div
          ref={boxRef}
          className="min-h-[140px] rounded-ev-md border-4 border-dashed border-ev-blue bg-ev-blue-soft p-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-ev-blue-edge mb-2">{BOX}</p>
          <div className="flex flex-wrap gap-2">
            {inBox.map((id) => (
              <button
                key={id}
                type="button"
                disabled={disabled}
                aria-label={`Take one ${objectKind} out of the box`}
                className={TARGET}
                onClick={() => returnToPool(id)}
              >
                <ObjectIcon kind={objectKind} className="h-14 w-14" />
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={submit}
          className={learnerButton('primary', 'lg', 'w-full')}
        >
          {flash ? (flash.correct ? flashCopy.correct : flashCopy.incorrect) : DONE}
        </button>
      </div>
    </div>
  )
}
