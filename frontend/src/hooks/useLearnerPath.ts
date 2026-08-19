import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export type PathLesson = {
  lessonId: string
  title: string
  lessonOrder: number
  isUnlocked: boolean
  isDone: boolean
  progress: number
  isCurrent: boolean
}

export type PathUnit = {
  unitId: string | null
  subStrandId: string
  unitName: string
  sequenceNumber: number | null
  lessonsAllocated: number | null
  isUnlocked: boolean
  isFullyCompleted: boolean
  lessons: PathLesson[]
}

export type PathStrand = {
  strandId: string
  strandName: string
  sequenceNumber: number
  units: PathUnit[]
}

export type PathSubject = {
  subjectId: string
  subjectName: string
  strands: PathStrand[]
}

export type LearnerPathResponse = {
  grade: string | null
  currentLessonId: string | null
  subjects: PathSubject[]
}

export const unitBadgeKey = (unit: PathUnit) => unit.unitId || `sub:${unit.subStrandId}`

export const flattenPathLessons = (subjects: PathSubject[]) => {
  const rows: Array<{ subject: PathSubject; strand: PathStrand; unit: PathUnit; lesson: PathLesson }> =
    []
  for (const subject of subjects) {
    for (const strand of subject.strands) {
      for (const unit of strand.units) {
        for (const lesson of unit.lessons) {
          rows.push({ subject, strand, unit, lesson })
        }
      }
    }
  }
  return rows
}

export const earnedUnitBadges = (subjects: PathSubject[]) => {
  const badges: Array<{
    key: string
    unitName: string
    strandName: string
    subjectName: string
  }> = []
  for (const subject of subjects) {
    for (const strand of subject.strands) {
      for (const unit of strand.units) {
        if (!unit.isFullyCompleted) continue
        badges.push({
          key: unitBadgeKey(unit),
          unitName: unit.unitName,
          strandName: strand.strandName,
          subjectName: subject.subjectName,
        })
      }
    }
  }
  return badges
}

export const strandHasCompletedPath = (strand: PathStrand) => {
  const withLessons = strand.units.filter((unit) => unit.lessons.length > 0)
  return withLessons.length > 0 && withLessons.every((unit) => unit.isFullyCompleted)
}

let inFlight: Promise<LearnerPathResponse> | null = null

const empty: LearnerPathResponse = { grade: null, currentLessonId: null, subjects: [] }

const fetchPath = () => {
  if (!inFlight) {
    inFlight = (api.learner.getPath() as Promise<LearnerPathResponse>)
      .then((data) => ({
        grade: data?.grade ?? null,
        currentLessonId: data?.currentLessonId ?? null,
        subjects: Array.isArray(data?.subjects) ? data.subjects : [],
      }))
      .catch(() => empty)
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}

export const useLearnerPath = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const [path, setPath] = useState<LearnerPathResponse>(empty)
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) {
      setPath(empty)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchPath().then((data) => {
      if (cancelled) return
      setPath(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { path, loading }
}
