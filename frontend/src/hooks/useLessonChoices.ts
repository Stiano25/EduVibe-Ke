import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export type LessonChoice = {
  lessonId: string
  title: string
  subjectName: string
  strandName: string
  subStrandName: string
  isUnlocked: boolean
  isCompleted: boolean
  progress: number
}

export type LessonChoicesResponse = {
  grade: string | null
  choices: LessonChoice[]
}

/**
 * The dashboard renders the picker and the next-task card side by side, and the
 * lesson view renders a switcher. Sharing one in-flight request keeps them from
 * each hitting /lesson-choices on the same paint.
 */
let inFlight: Promise<LessonChoice[]> | null = null

const fetchChoices = () => {
  if (!inFlight) {
    inFlight = (api.learner.getLessonChoices() as Promise<LessonChoicesResponse>)
      .then((data) => (Array.isArray(data?.choices) ? data.choices : []))
      .catch(() => [])
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}

/** `enabled` is false on browse-mode screens, which never render a picker. */
export const useLessonChoices = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const [choices, setChoices] = useState<LessonChoice[]>([])
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) {
      setChoices([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchChoices().then((rows) => {
      if (cancelled) return
      setChoices(rows)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { choices, loading }
}
