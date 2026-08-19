import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { LearnerPage } from '@/components/layout/LearnerPage'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { ACCENT_BG, ACCENT_TINT, accentFor, LEARNER_CARD, learnerButton } from '@/lib/learnerUi'
import { earnedUnitBadges, useLearnerPath } from '@/hooks/useLearnerPath'

export const LearnerBadges = () => {
  const { path, loading } = useLearnerPath()
  const badges = earnedUnitBadges(path.subjects)

  return (
    <LearnerPage>
      <StaggeredEntry>
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-ev-ink">Your badges</h1>
            <p className="mt-1 text-sm font-bold text-ev-muted">
              {badges.length === 0
                ? 'Finish every lesson in a unit to earn one.'
                : `${badges.length} earned — just yours, nobody else.`}
            </p>
          </div>
          <Link to="/learner" className={learnerButton('quiet', 'sm')}>
            Path
          </Link>
        </div>

        {loading ? (
          <p className="text-lg font-black text-ev-ink">Loading…</p>
        ) : badges.length === 0 ? (
          <div className={`${LEARNER_CARD} p-6`}>
            <p className="text-lg font-black text-ev-ink">No badges yet.</p>
            <p className="mt-1 text-sm font-bold text-ev-muted">Complete a whole unit on your path.</p>
          </div>
        ) : (
          <ul data-badge-collection="true" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {badges.map((badge) => {
              const accent = accentFor(badge.unitName)
              return (
                <li
                  key={badge.key}
                  data-badge={badge.key}
                  className={`${LEARNER_CARD} flex flex-col items-center p-4 text-center`}
                >
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-full ${ACCENT_BG[accent]} text-white shadow-ev-sm`}
                  >
                    <Star className="h-8 w-8 fill-current" aria-hidden />
                  </span>
                  <p className="mt-3 text-base font-black leading-tight text-ev-ink">{badge.unitName}</p>
                  <p className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${ACCENT_TINT[accent]}`}>
                    {badge.subjectName}
                  </p>
                </li>
              )
            })}
          </ul>
        )}

        {badges.length > 0 ? (
          <div className="relative mt-8 overflow-hidden rounded-ev-lg bg-ev-pink p-5 text-white shadow-ev-card">
            <p className="relative z-10 max-w-[62%] text-2xl font-black leading-tight">Nice work — keep going on your path.</p>
            <div className="pointer-events-none absolute -bottom-6 -right-3 h-36 w-36" aria-hidden>
              <LazyLottie animationKey="happyBoy" style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        ) : null}
      </StaggeredEntry>
    </LearnerPage>
  )
}
