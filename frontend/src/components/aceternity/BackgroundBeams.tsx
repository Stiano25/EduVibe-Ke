import React from 'react'

type BackgroundBeamsProps = {
  className?: string
}

export const BackgroundBeams = ({ className = '' }: BackgroundBeamsProps) => {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      {/* soft grid */}
      <div className="absolute inset-0 bg-ac-grid opacity-[0.22]" />

      {/* animated beams */}
      <div className="absolute -top-20 left-[-20%] h-[380px] w-[140%] rotate-[-8deg] bg-ac-beams animate-ac-beams opacity-60 blur-[2px]" />
      <div className="absolute top-[22%] left-[-25%] h-[320px] w-[150%] rotate-[7deg] bg-ac-beams-2 animate-ac-beams-slow opacity-45 blur-[2px]" />

      {/* vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/85" />
    </div>
  )
}




