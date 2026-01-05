import React from 'react'

type HoverBorderGradientProps = {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  as?: 'button' | 'div'
}

export const HoverBorderGradient = ({ children, className = '', onClick, as = 'button' }: HoverBorderGradientProps) => {
  const Comp: any = as

  return (
    <Comp
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full p-[1px] ac-gradient-border ${className}`}
    >
      <span className="relative z-10 inline-flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md px-5 py-2.5 text-sm font-semibold text-text-primary">
        {children}
      </span>
    </Comp>
  )
}








