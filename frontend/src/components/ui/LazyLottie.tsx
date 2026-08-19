import { useEffect, useRef, useState } from 'react'
// @ts-ignore - lottie-react types
import Lottie from 'lottie-react'
import { loadAnimation, type AnimationKey } from '@/lib/lottieAnimations'

type LazyLottieProps = {
  animationKey: AnimationKey
  className?: string
  style?: React.CSSProperties
  loop?: boolean
  autoplay?: boolean
  /** Playback speed. Default 1. Used to fit a pose inside a short hold window. */
  speed?: number
}

/**
 * Loads a Lottie JSON file on demand (and caches it), instead of bundling all
 * animation files into the initial page load.
 */
export const LazyLottie = ({
  animationKey,
  className,
  style,
  loop = true,
  autoplay = true,
  speed = 1,
}: LazyLottieProps) => {
  const [animationData, setAnimationData] = useState<object | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lottieRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    setAnimationData(null)

    loadAnimation(animationKey)
      .then((data) => {
        if (!cancelled) setAnimationData(data)
      })
      .catch(() => {
        if (!cancelled) setAnimationData(null)
      })

    return () => {
      cancelled = true
    }
  }, [animationKey])

  useEffect(() => {
    if (lottieRef.current && typeof lottieRef.current.setSpeed === 'function') {
      lottieRef.current.setSpeed(speed)
    }
  }, [speed, animationData])

  if (!animationData) {
    return (
      <div
        className={className}
        style={{
          ...style,
          background: 'rgba(255,255,255,0.18)',
          borderRadius: '18px',
        }}
        aria-hidden
      />
    )
  }

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
    />
  )
}
