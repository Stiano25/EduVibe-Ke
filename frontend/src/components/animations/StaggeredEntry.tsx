import { useEffect, useRef, ReactNode } from 'react'
import { gsap } from '@/lib/gsap'

interface StaggeredEntryProps {
  children: ReactNode
  delay?: number
  className?: string
}

export const StaggeredEntry = ({ children, delay = 0.1, className = '' }: StaggeredEntryProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const children = containerRef.current.children
    gsap.fromTo(
      children,
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: delay,
        ease: 'power3.out',
      }
    )
  }, [delay])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

