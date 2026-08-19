import type { LearnerAccent } from '@/lib/learnerUi'

const WASH: Record<LearnerAccent, string> = {
  green: 'ev-banner-wash-green',
  blue: 'ev-banner-wash-blue',
  pink: 'ev-banner-wash-pink',
}

/** Decorative depth for hero and strand banners — tokens only, no new palette. */
export const BannerDecor = ({
  accent,
  variant,
}: {
  accent: LearnerAccent
  variant: 'hero' | 'strand'
}) => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <div className={`absolute inset-0 ${WASH[accent]}`} />
    <div className="ev-banner-dots absolute inset-0" />
    {variant === 'hero' ? (
      <>
        <span className="absolute -left-10 -top-12 h-36 w-36 rounded-full bg-white/15" />
        <span className="absolute bottom-[-30%] right-[28%] h-40 w-40 rounded-full bg-black/10" />
        <span className="absolute right-16 top-3 h-16 w-16 rounded-full bg-white/20" />
      </>
    ) : (
      <>
        <span className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
        <svg className="absolute inset-x-0 bottom-0 h-14 w-full" viewBox="0 0 400 56" preserveAspectRatio="none">
          <path d="M0 56 L0 28 C70 8 110 40 180 22 C250 4 300 34 400 16 L400 56 Z" fill="rgba(255,255,255,0.18)" />
          <path
            d="M20 40 C80 28 120 44 190 32 C260 20 320 42 380 30"
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M20 40 C80 28 120 44 190 32 C260 20 320 42 380 30"
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 10"
          />
        </svg>
      </>
    )}
  </div>
)
