import { useEffect, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export const AnimatedCounter = ({ 
  value, 
  duration = 1000, 
  className = '',
  prefix = '',
  suffix = ''
}: AnimatedCounterProps) => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime: number | null = null
    const startValue = 0
    
    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentCount = Math.floor(startValue + (value - startValue) * easeOut)
      
      setCount(currentCount)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCount(value)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value, duration])
  
  return (
    <span className={className}>
      {prefix}{count}{suffix}
    </span>
  )
}










