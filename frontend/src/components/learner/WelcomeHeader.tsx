import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import gsap from 'gsap'

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

  useEffect(() => {
    if (!welcomeRef.current) return
    gsap.fromTo(
      welcomeRef.current,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
    )
  }, [])

  const name = firstName(user?.name)
  const initial = (name || user?.name || '?').charAt(0).toUpperCase()
  const grade = user?.grade

  return (
    <div className="mb-5 flex items-center gap-3" ref={welcomeRef}>
      <div
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ev-pink text-lg font-black text-white sm:h-14 sm:w-14 sm:text-xl"
        aria-hidden
      >
        {initial}
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-black leading-tight text-ev-ink sm:text-3xl">
          {greetingForNow()}
          {name ? `, ${name}!` : '!'}
        </h1>
        {grade ? (
          <p className="text-sm font-bold text-ev-muted">Grade {grade}</p>
        ) : (
          <p className="text-sm font-bold text-ev-muted">Ready to learn something new?</p>
        )}
      </div>
    </div>
  )
}
