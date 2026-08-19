import { useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { gsap, useGSAP } from '@/lib/gsap'
import { LazyLottie } from '@/components/ui/LazyLottie'

const greetingForNow = () => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || ''

export const WelcomeHeader = () => {
  const user = useAuthStore((s) => s.user)
  const welcomeRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!welcomeRef.current) return
      gsap.fromTo(
        welcomeRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
      )
    },
    { scope: welcomeRef }
  )

  const name = firstName(user?.name)
  const grade = user?.grade

  return (
    <div className="relative mb-6" ref={welcomeRef} data-welcome-header="true">
      <span className="pointer-events-none absolute -left-3 -top-2 h-16 w-16 rounded-full bg-ev-green/25" aria-hidden />
      <span className="pointer-events-none absolute right-6 top-0 h-10 w-10 rounded-full bg-ev-blue/20" aria-hidden />
      <div className="relative flex items-center gap-4">
        <div
          className="relative h-[4.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-full bg-ev-pink-soft shadow-ev-lift ring-[5px] ring-ev-pink sm:h-24 sm:w-24"
          aria-hidden
        >
          <span className="pointer-events-none absolute inset-1 rounded-full ring-2 ring-white/70" />
          <div className="absolute -bottom-4 -right-2 h-[5.75rem] w-[5.75rem] sm:-bottom-5 sm:h-28 sm:w-28">
            <LazyLottie animationKey="happyBoy" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-ev-blue-edge sm:text-lg">{greetingForNow()}</p>
          <h1 className="truncate font-sans text-4xl font-black leading-none tracking-tight text-ev-pink sm:text-5xl">
            {name ? `${name}!` : 'Hello!'}
          </h1>
          <span className="mt-2 block h-2 w-16 rounded-full bg-ev-green" aria-hidden />
          {grade ? (
            <span className="mt-2 inline-flex rounded-full bg-ev-blue px-3 py-1 text-xs font-black text-white shadow-ev-sm">
              Grade {grade}
            </span>
          ) : (
            <p className="mt-2 text-sm font-bold text-ev-muted">Ready to learn something new?</p>
          )}
        </div>
      </div>
    </div>
  )
}
