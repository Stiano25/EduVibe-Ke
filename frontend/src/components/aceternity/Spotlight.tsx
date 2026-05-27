import React from 'react'

type SpotlightProps = {
  className?: string
  /** CSS color string like 'rgba(124,58,237,0.35)' */
  fill?: string
}

export const Spotlight = ({ className = '', fill = 'rgba(124,58,237,0.35)' }: SpotlightProps) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl opacity-60"
        style={{
          background: `radial-gradient(circle at center, ${fill} 0%, rgba(124,58,237,0) 60%)`,
        }}
      />
      <div
        className="absolute top-24 -left-32 h-[420px] w-[420px] rounded-full blur-3xl opacity-40"
        style={{
          background: `radial-gradient(circle at center, rgba(255,107,53,0.28) 0%, rgba(255,107,53,0) 60%)`,
        }}
      />
      <div
        className="absolute -bottom-32 right-0 h-[520px] w-[520px] rounded-full blur-3xl opacity-35"
        style={{
          background: `radial-gradient(circle at center, rgba(78,205,196,0.28) 0%, rgba(78,205,196,0) 60%)`,
        }}
      />
    </div>
  )
}










