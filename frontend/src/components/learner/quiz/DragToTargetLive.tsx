import { useRef, useState } from 'react'
import { MathText } from '@/components/ui/MathText'
import { useVisibleResponseTimer } from '@/hooks/useVisibleResponseTimer'
import { ObjectIcon, resolveObjectKind } from '../diagrams/objectIcons'
import type { MultipleChoiceLiveProps } from './types'

const DONE = 'Done'
const BOX = 'Box'

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
    <div className="p-5 rounded-[16px] border-2 border-slate-200 bg-white space-y-4">
      <div ref={interactiveRef} className="space-y-4">
        <MathText as="p" text={question.question} className="text-lg font-bold text-[#0F172A]" />

        <div className="flex flex-wrap gap-2 min-h-[52px] p-2 rounded-[12px] bg-slate-50 border border-slate-200">
          {pool.map((id) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-label={objectKind}
              className={`touch-manipulation ${dragging === id ? 'opacity-50' : ''}`}
              onClick={() => dropIntoBox(id)}
              onPointerDown={() => setDragging(id)}
              onPointerUp={(e) => onPointerUp(id, e.clientX, e.clientY)}
            >
              <ObjectIcon kind={objectKind} className="h-10 w-10" />
            </button>
          ))}
        </div>

        <div
          ref={boxRef}
          className="min-h-[140px] rounded-[16px] border-4 border-dashed border-indigo-300 bg-indigo-50 p-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-2">{BOX}</p>
          <div className="flex flex-wrap gap-2">
            {inBox.map((id) => (
              <button
                key={id}
                type="button"
                disabled={disabled}
                aria-label={`${objectKind} in box`}
                className="touch-manipulation"
                onClick={() => returnToPool(id)}
              >
                <ObjectIcon kind={objectKind} className="h-10 w-10" />
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={submit}
          className="w-full py-3 rounded-full bg-indigo-600 text-white font-bold disabled:opacity-50"
          style={{ fontFamily: 'Fredoka, sans-serif' }}
        >
          {flash ? (flash.correct ? flashCopy.correct : flashCopy.incorrect) : DONE}
        </button>
      </div>
    </div>
  )
}
