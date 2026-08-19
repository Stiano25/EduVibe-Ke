import { useRef } from 'react'
import { gsap, useGSAP } from '@/lib/gsap'

type ResistanceMeterProps = {
  remaining: number
  label?: string
}

/** Display-only. Shrinks on correct checkpoint answers; never grows on a miss. */
export const ResistanceMeter = ({ remaining, label = 'Resistance' }: ResistanceMeterProps) => {
  const fillRef = useRef<HTMLSpanElement>(null)
  const clamped = Math.max(0, Math.min(100, remaining))

  useGSAP(
    () => {
      if (!fillRef.current) return
      gsap.to(fillRef.current, {
        scaleX: clamped / 100,
        duration: 0.35,
        ease: 'power2.out',
        transformOrigin: 'left center',
        overwrite: 'auto',
      })
    },
    { dependencies: [clamped] }
  )

  return (
    <div className="w-full" data-obstacle-meter="true" data-obstacle-remaining={Math.round(clamped)}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ev-muted">{label}</span>
        <span className="text-[11px] font-bold text-ev-ink">{Math.round(clamped)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-ev-line" aria-hidden>
        <span
          ref={fillRef}
          className="ev-path-meter-fill block h-full origin-left rounded-full bg-ev-pink"
          style={{ transform: `scaleX(${clamped / 100})` }}
        />
      </div>
    </div>
  )
}
