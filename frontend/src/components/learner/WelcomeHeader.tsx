import { useAuthStore } from '@/store/useAuthStore'
import { LazyLottie } from '@/components/ui/LazyLottie'

const greetingForNow = () => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** First given name, keeping hyphenated / double-barrelled tokens intact. */
const givenName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || ''

type StripTone = 'page' | 'onColor'

/**
 * Compact identity for the shared hero. Name sits on its own line and wraps —
 * never ellipsizes mid-word. Time-of-day is a quiet label so it doesn't
 * compete with the status copy below.
 */
export const LearnerIdentityStrip = ({ tone = 'page' }: { tone?: StripTone }) => {
  const user = useAuthStore((s) => s.user)
  const onColor = tone === 'onColor'
  const name = givenName(user?.name)
  const grade = user?.grade

  return (
    <div
      className="flex min-w-0 items-start gap-2.5"
      data-welcome-header="true"
      data-identity-strip={tone}
    >
      <div
        className={`relative mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-full ${
          onColor ? 'bg-white/20 ring-2 ring-white/55' : 'bg-ev-pink-soft ring-2 ring-ev-pink/70'
        }`}
        aria-hidden
      >
        <div className="absolute -bottom-2 -right-1 h-12 w-12">
          <LazyLottie animationKey="happyBoy" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[11px] font-bold uppercase tracking-wide ${
            onColor ? 'text-white/80' : 'text-ev-muted'
          }`}
        >
          {greetingForNow()}
          {grade ? ` · Grade ${grade}` : ''}
        </p>
        {name ? (
          <p
            data-identity-name="true"
            className={`max-w-full text-xl font-black leading-tight [overflow-wrap:anywhere] sm:text-2xl ${
              onColor ? 'text-white' : 'text-ev-ink'
            }`}
          >
            {name}!
          </p>
        ) : null}
      </div>
    </div>
  )
}

/** Browse dashboards only — quest dashboards fold this into the hero. */
export const WelcomeHeader = () => (
  <div className="mb-4">
    <LearnerIdentityStrip tone="page" />
  </div>
)
