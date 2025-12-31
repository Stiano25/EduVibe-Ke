import React, { useMemo } from 'react'

export type MovingCard = {
  quote: string
  name: string
  role?: string
}

type InfiniteMovingCardsProps = {
  items: MovingCard[]
  className?: string
  speed?: 'slow' | 'normal' | 'fast'
}

export const InfiniteMovingCards = ({ items, className = '', speed = 'normal' }: InfiniteMovingCardsProps) => {
  const duration = speed === 'fast' ? '22s' : speed === 'slow' ? '44s' : '32s'
  const doubled = useMemo(() => [...items, ...items], [items])

  return (
    <div className={`relative overflow-hidden ac-mask-fade-x ${className}`}>
      <div
        className="flex w-max gap-4 animate-ac-marquee will-change-transform"
        style={{ animationDuration: duration }}
      >
        {doubled.map((item, idx) => (
          <div
            key={`${item.name}-${idx}`}
            className="w-[260px] sm:w-[320px] glassmorphic-card p-4 sm:p-5 hover:translate-y-0"
          >
            <p className="text-[12px] sm:text-sm text-text-secondary leading-relaxed">
              “{item.quote}”
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text-primary">{item.name}</p>
                {item.role && <p className="text-[11px] text-text-tertiary">{item.role}</p>}
              </div>
              <span className="h-8 w-8 rounded-2xl bg-gradient-to-br from-primary-100 via-white to-success-100 border border-white/70 shadow-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}







