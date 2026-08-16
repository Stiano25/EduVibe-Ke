import { useCallback, useEffect, useRef, type RefObject } from 'react'

const VISIBLE_THRESHOLD = 0.35

const isElementVisible = (el: Element, threshold: number) => {
  const rect = el.getBoundingClientRect()
  if (rect.height <= 0 || rect.width <= 0) return false
  const viewHeight = window.innerHeight || document.documentElement.clientHeight
  const visible = Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0)
  return visible / rect.height >= threshold
}

/**
 * Response-time clock that starts only when `targetRef` is actually in view.
 * Resets on `questionKey`. A tap before the observer fires starts the clock at
 * the tap (0ms) so we never invent time spent above the fold.
 */
export const useVisibleResponseTimer = (
  questionKey: string,
  targetRef: RefObject<Element | null>
) => {
  const shownAtRef = useRef<number | null>(null)

  const start = useCallback(() => {
    if (shownAtRef.current == null) {
      shownAtRef.current = performance.now()
    }
  }, [])

  useEffect(() => {
    shownAtRef.current = null
    const el = targetRef.current
    if (!el) return undefined

    if (typeof IntersectionObserver === 'undefined') {
      start()
      return undefined
    }

    if (isElementVisible(el, VISIBLE_THRESHOLD)) start()

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start()
      },
      { threshold: VISIBLE_THRESHOLD }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [questionKey, targetRef, start])

  const measureResponseTimeMs = useCallback(() => {
    if (shownAtRef.current == null) {
      shownAtRef.current = performance.now()
      return 0
    }
    return Math.max(0, Math.round(performance.now() - shownAtRef.current))
  }, [])

  return { measureResponseTimeMs }
}
