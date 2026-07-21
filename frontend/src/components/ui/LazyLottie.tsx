import { useEffect, useState } from 'react'
// @ts-ignore - lottie-react types
import Lottie from 'lottie-react'
import { loadAnimation, type AnimationKey } from '@/lib/lottieAnimations'

type LazyLottieProps = {
  animationKey: AnimationKey
  className?: string
  style?: React.CSSProperties
  loop?: boolean
  autoplay?: boolean
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
}: LazyLottieProps) => {
  const [animationData, setAnimationData] = useState<object | null>(null)

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

  if (!animationData) {
    return <div className={className} style={style} aria-hidden />
  }

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
    />
  )
}
