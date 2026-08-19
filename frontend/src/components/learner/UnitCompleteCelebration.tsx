import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { learnerButton } from '@/lib/learnerUi'
import { hasCelebratedUnit, markUnitCelebrated } from '@/lib/learnerPathChrome'
import { earnedUnitBadges, type PathSubject } from '@/hooks/useLearnerPath'

type PendingBadge = {
  key: string
  unitName: string
  strandName: string
  subjectName: string
}

const CONFETTI = [
  { dx: '-72px', dy: '-110px', rot: '-28deg', color: 'bg-ev-green', delay: '0ms' },
  { dx: '64px', dy: '-96px', rot: '22deg', color: 'bg-ev-blue', delay: '40ms' },
  { dx: '-28px', dy: '-140px', rot: '12deg', color: 'bg-ev-pink', delay: '80ms' },
  { dx: '96px', dy: '-60px', rot: '-18deg', color: 'bg-ev-green', delay: '120ms' },
  { dx: '-100px', dy: '-40px', rot: '30deg', color: 'bg-ev-blue', delay: '160ms' },
  { dx: '20px', dy: '-160px', rot: '-8deg', color: 'bg-ev-pink', delay: '200ms' },
]

export const UnitCompleteCelebration = ({ subjects }: { subjects: PathSubject[] }) => {
  const pending = useMemo(
    () => earnedUnitBadges(subjects).filter((badge) => !hasCelebratedUnit(badge.key)),
    [subjects]
  )
  const [queue, setQueue] = useState<PendingBadge[]>([])

  useEffect(() => {
    setQueue(pending)
  }, [pending])

  const current = queue[0] || null
  if (!current) return null

  const dismiss = () => {
    markUnitCelebrated(current.key)
    setQueue((rows) => rows.slice(1))
  }

  return (
    <div
      data-unit-celebration={current.key}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ev-ink/40 p-4"
      role="dialog"
      aria-labelledby="unit-complete-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-ev-lg bg-white p-6 text-center shadow-ev-lift">
        <div className="ev-celebrate pointer-events-none absolute inset-0" aria-hidden>
          {CONFETTI.map((piece, i) => (
            <span
              key={i}
              className={`ev-confetti ${piece.color}`}
              style={
                {
                  '--ev-dx': piece.dx,
                  '--ev-dy': piece.dy,
                  '--ev-rot': piece.rot,
                  animationDelay: piece.delay,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <div className="relative mx-auto h-52 w-52 sm:h-64 sm:w-64">
          <LazyLottie animationKey="happyBoy" loop={false} style={{ width: '100%', height: '100%' }} />
        </div>
        <h2 id="unit-complete-title" className="mt-2 text-3xl font-black text-ev-ink sm:text-4xl">
          You finished {current.unitName}!
        </h2>
        <p className="mt-2 text-sm font-bold text-ev-muted">
          {current.subjectName} · {current.strandName}
        </p>
        <p className="mt-1 text-base font-bold text-ev-green-edge">A badge is now in your collection.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/learner/badges" className={learnerButton('green', 'lg')} onClick={dismiss}>
            See my badges
          </Link>
          <button type="button" className={learnerButton('quiet', 'md')} onClick={dismiss}>
            Keep going
          </button>
        </div>
      </div>
    </div>
  )
}
