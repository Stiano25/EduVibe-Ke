import { unitBadgeKey, type PathLesson, type PathStrand, type PathUnit } from '@/hooks/useLearnerPath'

export const OBSTACLE_KEYS = ['hippo', 'goat', 'crab', 'tortoise', 'snail', 'sheep'] as const
export type ObstacleKey = (typeof OBSTACLE_KEYS)[number]

export type UnitVisualState = 'locked' | 'current' | 'done' | 'open'

export type PathStop =
  | {
      kind: 'unit'
      id: string
      unit: PathUnit
      strandId: string
      state: UnitVisualState
    }
  | {
      kind: 'lesson'
      id: string
      lesson: PathLesson
      unit: PathUnit
    }
  | {
      kind: 'obstacle'
      id: string
      unit: PathUnit
      strandId: string
      obstacleKey: ObstacleKey
    }

export type RoadPoint = { x: number; y: number }

const STEP_Y: Record<PathStop['kind'], number> = {
  unit: 136,
  lesson: 132,
  obstacle: 228,
}

const TOP_PAD = 48
const BOTTOM_PAD = 64

const hashString = (value: string) => {
  let n = 0
  for (let i = 0; i < value.length; i += 1) n = (n * 31 + value.charCodeAt(i)) >>> 0
  return n
}

/**
 * Rotate the 6-obstacle pool along the unit sequence, offset per strand so
 * two strands do not open on the same creature. Consecutive checkpoints in
 * one strand never repeat (pool length > 1).
 */
export const obstacleKeyFor = (strandId: string, unitIndex: number): ObstacleKey => {
  const offset = hashString(strandId) % OBSTACLE_KEYS.length
  return OBSTACLE_KEYS[(offset + unitIndex) % OBSTACLE_KEYS.length]
}

export const unitVisualState = (
  unit: PathUnit,
  strand: PathStrand,
  currentLessonId: string | null
): UnitVisualState => {
  if (unit.isFullyCompleted) return 'done'
  if (!unit.isUnlocked) return 'locked'
  if (unit.lessons.some((lesson) => lesson.isCurrent || lesson.lessonId === currentLessonId)) {
    return 'current'
  }
  const currentUnit = strand.units.find((row) =>
    row.lessons.some((lesson) => lesson.isCurrent || lesson.lessonId === currentLessonId)
  )
  if (currentUnit) return 'open'
  const firstPlayable = strand.units.find(
    (row) => row.isUnlocked && !row.isFullyCompleted && row.lessons.some((lesson) => !lesson.isDone)
  )
  if (firstPlayable && unitBadgeKey(firstPlayable) === unitBadgeKey(unit)) return 'current'
  return 'open'
}

export const flattenStrandStops = (
  strand: PathStrand,
  currentLessonId: string | null
): PathStop[] => {
  const stops: PathStop[] = []
  strand.units.forEach((unit, unitIndex) => {
    stops.push({
      kind: 'unit',
      id: `unit:${unitBadgeKey(unit)}`,
      unit,
      strandId: strand.strandId,
      state: unitVisualState(unit, strand, currentLessonId),
    })
    unit.lessons.forEach((lesson) => {
      stops.push({
        kind: 'lesson',
        id: `lesson:${lesson.lessonId}`,
        lesson,
        unit,
      })
    })
    if (unit.lessons.length > 0) {
      stops.push({
        kind: 'obstacle',
        id: `obstacle:${unitBadgeKey(unit)}`,
        unit,
        strandId: strand.strandId,
        obstacleKey: obstacleKeyFor(strand.strandId, unitIndex),
      })
    }
  })
  return stops
}

export const checkpointForLesson = (
  subjects: Array<{ strands: PathStrand[] }>,
  lessonId: string
) => {
  for (const subject of subjects) {
    for (const strand of subject.strands) {
      for (let i = 0; i < strand.units.length; i += 1) {
        const unit = strand.units[i]
        if (unit.lessons.length === 0) continue
        const last = unit.lessons[unit.lessons.length - 1]
        if (last.lessonId !== lessonId) continue
        return {
          unit,
          strandId: strand.strandId,
          unitName: unit.unitName,
          obstacleKey: obstacleKeyFor(strand.strandId, i),
        }
      }
    }
  }
  return null
}

/** Last lesson in a unit is the existing mixed checkpoint session. */
export const unitCheckpointLesson = (unit: PathUnit) =>
  unit.lessons.length > 0 ? unit.lessons[unit.lessons.length - 1] : null

/**
 * Remaining resistance 0–100. Only the checkpoint lesson's first-try progress
 * shrinks the meter — earlier lessons do not. A 0% checkpoint stays full.
 */
export const obstacleRemaining = (unit: PathUnit) => {
  if (unit.isFullyCompleted) return 0
  const checkpoint = unitCheckpointLesson(unit)
  if (!checkpoint) return 100
  if (!checkpoint.isUnlocked) return 100
  return Math.max(0, Math.min(100, 100 - (Number(checkpoint.progress) || 0)))
}

export const currentStopIndex = (stops: PathStop[], currentLessonId: string | null) => {
  if (currentLessonId) {
    const current = stops.findIndex((stop) => stop.kind === 'lesson' && stop.lesson.lessonId === currentLessonId)
    if (current >= 0) return current
  }
  for (let i = stops.length - 1; i >= 0; i -= 1) {
    const stop = stops[i]
    if (stop.kind === 'lesson' && stop.lesson.isDone) return i
  }
  const firstOpen = stops.findIndex((stop) => stop.kind === 'lesson' && stop.lesson.isUnlocked)
  return firstOpen >= 0 ? firstOpen : 0
}

export const layoutStops = (stops: PathStop[], width: number): RoadPoint[] => {
  const cx = width / 2
  const amplitude = Math.max(28, Math.min(96, width / 2 - 78))
  let y = TOP_PAD
  return stops.map((stop, i) => {
    if (i > 0) y += STEP_Y[stop.kind]
    // Unit signposts stay centered so wide cards don't clip; nodes follow the road.
    const x = stop.kind === 'unit' ? cx : cx + Math.sin(i * 0.92 + 0.35) * amplitude
    return { x, y }
  })
}

export const roadHeight = (points: RoadPoint[]) => {
  if (points.length === 0) return TOP_PAD + BOTTOM_PAD
  return (points[points.length - 1]?.y || TOP_PAD) + BOTTOM_PAD
}

/** Catmull-Rom-ish cubics so the road actually bends between stops. */
export const pointsToCubicPath = (points: RoadPoint[]) => {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const p = points[0]
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  }
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const t = 0.2
    const c1x = p1.x + (p2.x - p0.x) * t
    const c1y = p1.y + (p2.y - p0.y) * t
    const c2x = p2.x - (p3.x - p1.x) * t
    const c2y = p2.y - (p3.y - p1.y) * t
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

export const hillFillPath = (width: number, height: number) => {
  const waves = 5
  let d = `M 0 ${height}`
  d += ` L 0 ${Math.round(height * 0.42)}`
  for (let i = 0; i <= waves; i += 1) {
    const x = (i / waves) * width
    const y = height * 0.34 + Math.sin(i * 1.35) * 28 + (i % 2 === 0 ? 10 : -8)
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`
  }
  d += ` L ${width} ${height} Z`
  return d
}

export const progressAlongPath = (path: SVGPathElement, point: RoadPoint) => {
  const total = path.getTotalLength()
  if (!total) return 0
  const samples = Math.max(64, Math.ceil(total / 3))
  let best = 0
  let bestD = Infinity
  for (let i = 0; i <= samples; i += 1) {
    const p = path.getPointAtLength((i / samples) * total)
    const d = (p.x - point.x) ** 2 + (p.y - point.y) ** 2
    if (d < bestD) {
      bestD = d
      best = i / samples
    }
  }
  return best
}

export const VEHICLE_STOP_KEY = 'ev-path-vehicle-stop'

export const readVehicleStop = () => {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem(VEHICLE_STOP_KEY)
}

export const rememberVehicleStop = (stopId: string) => {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(VEHICLE_STOP_KEY, stopId)
}
