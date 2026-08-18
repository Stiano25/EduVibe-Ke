import { useMemo, type CSSProperties } from 'react'

type AnswerCelebrationProps = {
  /** Changes per answer so the burst remounts and replays. */
  runKey: string
}

const COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#38BDF8']
const PIECES = 18

/**
 * CSS confetti burst for a correct answer. Deliberately not a Lottie: the
 * smallest animation in this project is 24kB and this fires on every right
 * answer. Hidden entirely under prefers-reduced-motion (see globals.css).
 */
export const AnswerCelebration = ({ runKey }: AnswerCelebrationProps) => {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        const angle = (i / PIECES) * 2 * Math.PI
        const distance = 70 + ((i * 37) % 60)
        return {
          id: i,
          dx: `${Math.cos(angle) * distance}px`,
          dy: `${Math.sin(angle) * distance - 20}px`,
          color: COLORS[i % COLORS.length],
          delay: `${(i % 5) * 24}ms`,
          rotate: `${(i * 57) % 360}deg`,
        }
      }),
    []
  )

  return (
    <div
      key={runKey}
      className="ev-celebrate pointer-events-none absolute inset-0 z-20 overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="ev-confetti"
          style={
            {
              backgroundColor: p.color,
              animationDelay: p.delay,
              '--ev-dx': p.dx,
              '--ev-dy': p.dy,
              '--ev-rot': p.rotate,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
