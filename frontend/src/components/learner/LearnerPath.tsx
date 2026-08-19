import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Flag, Lock, Star } from 'lucide-react'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { QUEST_COPY } from '@/lib/complexityBands'
import { ACCENT_BG, accentFor, type LearnerAccent } from '@/lib/learnerUi'
import { justUnlockedAgainstSeen, rememberUnlocked } from '@/lib/learnerPathChrome'
import {
  currentStopIndex,
  flattenStrandStops,
  hillFillPath,
  layoutStops,
  obstacleKeyFor,
  obstacleRemaining,
  pointsToCubicPath,
  progressAlongPath,
  readVehicleStop,
  rememberVehicleStop,
  roadHeight,
  unitCheckpointLesson,
  type PathStop,
  type RoadPoint,
  type UnitVisualState,
} from '@/lib/learnerPathRoad'
import {
  flattenPathLessons,
  strandHasCompletedPath,
  type PathLesson,
  type PathStrand,
  type PathSubject,
  type PathUnit,
} from '@/hooks/useLearnerPath'
import { PathVehicle } from './path/PathVehicle'
import { QuestObstacleArt, QuestObstacleSilhouette, OBSTACLE_LABEL } from './path/QuestObstacleArt'
import { ResistanceMeter } from './path/ResistanceMeter'
import { BannerDecor } from '@/components/learner/BannerDecor'

type NodeState = 'locked' | 'current' | 'done' | 'open'

const NODE_FILL: Record<NodeState, string> = {
  locked: 'bg-ev-line text-ev-muted',
  current: 'bg-ev-blue text-white',
  done: 'bg-ev-green text-white',
  open: 'bg-ev-pink text-white',
}

const NODE_SIZE: Record<NodeState, string> = {
  locked: 'h-14 w-14',
  open: 'h-16 w-16',
  done: 'h-[4.25rem] w-[4.25rem]',
  current: 'h-[4.75rem] w-[4.75rem]',
}

const STRAND_FILL: Record<LearnerAccent, string> = {
  green: 'bg-ev-green',
  blue: 'bg-ev-blue',
  pink: 'bg-ev-pink',
}

const UNIT_CARD: Record<UnitVisualState, string> = {
  done: 'bg-ev-green text-white shadow-ev-lift',
  current: 'bg-ev-blue-soft text-ev-ink ring-4 ring-ev-blue shadow-ev-lift',
  locked: 'bg-ev-line/70 text-ev-muted',
  open: 'bg-white text-ev-ink shadow-ev-card',
}

const lessonHref = (id: string) => `/learner/lessons/${id}`

const stateFor = (lesson: PathLesson): NodeState => {
  if (!lesson.isUnlocked) return 'locked'
  if (lesson.isDone) return 'done'
  if (lesson.isCurrent) return 'current'
  return 'open'
}

const PathNode = ({
  lesson,
  point,
  justUnlocked,
}: {
  lesson: PathLesson
  point: RoadPoint
  justUnlocked: boolean
}) => {
  const state = stateFor(lesson)
  const statusWord =
    state === 'done'
      ? QUEST_COPY.statusDone
      : state === 'current'
        ? QUEST_COPY.statusKeepGoing
        : state === 'locked'
          ? QUEST_COPY.locked
          : QUEST_COPY.statusNew
  const inner = (
    <>
      <span
        className={`relative flex items-center justify-center rounded-full shadow-ev-lift ${NODE_SIZE[state]} ${NODE_FILL[state]} ${
          justUnlocked ? 'ev-just-unlock' : ''
        }`}
      >
        {state === 'current' ? (
          <span className="ev-node-pulse pointer-events-none absolute inset-0 rounded-full bg-ev-blue" />
        ) : null}
        {state === 'done' ? (
          <Check className="relative z-10 h-7 w-7" strokeWidth={3} aria-hidden />
        ) : state === 'locked' ? (
          <Lock className="relative z-10 h-6 w-6" aria-hidden />
        ) : (
          <Star className="relative z-10 h-6 w-6 fill-current" aria-hidden />
        )}
      </span>
      <span className="mt-2 max-w-[9.5rem] text-center text-sm font-bold leading-tight text-ev-ink">
        {lesson.title}
      </span>
      <span className="mt-0.5 text-[11px] font-bold text-ev-muted">{statusWord}</span>
    </>
  )

  const className =
    'absolute z-10 flex w-[42%] max-w-[11.5rem] -translate-x-1/2 -translate-y-[1.1rem] flex-col items-center'
  const style = { left: point.x, top: point.y }

  if (state === 'locked') {
    return (
      <div
        className={`${className} opacity-60`}
        style={style}
        data-path-node={lesson.lessonId}
        data-node-state="locked"
        aria-disabled="true"
        aria-label={`${lesson.title} — ${QUEST_COPY.locked}`}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      to={lessonHref(lesson.lessonId)}
      className={`${className} ev-press`}
      style={style}
      data-path-node={lesson.lessonId}
      data-node-state={justUnlocked && state !== 'done' ? 'just-unlocked' : state}
      aria-label={`${lesson.title} — ${statusWord}`}
    >
      {inner}
    </Link>
  )
}

const UnitCheckpoint = ({
  unit,
  state,
  point,
  strandId,
}: {
  unit: PathUnit
  state: UnitVisualState
  point: RoadPoint
  strandId: string
}) => {
  const empty = unit.lessons.length === 0
  const fog = (state === 'open' && empty) || state === 'locked'
  const previewKey = obstacleKeyFor(strandId, Number(unit.sequenceNumber) || 0)
  const label =
    state === 'done'
      ? 'Done'
      : state === 'locked'
        ? QUEST_COPY.locked
        : state === 'current'
          ? 'Now'
          : empty
            ? 'Coming up'
            : 'Next'

  return (
    <div
      data-path-unit={unit.subStrandId}
      data-unit-state={state}
      data-unit-complete={unit.isFullyCompleted ? 'true' : 'false'}
      className="absolute z-10 w-[min(100%,20rem)] -translate-x-1/2 -translate-y-1/2 px-2"
      style={{ left: point.x, top: point.y }}
    >
      <div
        className={`relative overflow-hidden rounded-ev-md ${
          fog
            ? 'bg-ev-blue-soft text-ev-ink shadow-ev-card'
            : UNIT_CARD[state]
        }`}
      >
        {fog ? (
          <div className="pointer-events-none absolute -right-3 -bottom-5 h-32 w-32" aria-hidden>
            <QuestObstacleSilhouette obstacleKey={previewKey} className="h-32 w-32" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-ev-blue-soft/25 to-ev-blue-soft" />
          </div>
        ) : null}
        <div className={`relative z-10 flex items-center gap-3 px-4 py-3 ${fog ? 'pr-20' : ''}`}>
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              state === 'done'
                ? 'bg-white/20'
                : state === 'locked'
                  ? 'bg-white/70'
                  : state === 'current'
                    ? 'bg-white'
                    : 'bg-white/80'
            }`}
          >
            {state === 'done' ? (
              <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
            ) : state === 'locked' ? (
              <Lock className="h-5 w-5" aria-hidden />
            ) : state === 'current' ? (
              <Flag className="h-5 w-5 text-ev-blue-edge" aria-hidden />
            ) : (
              <Star className="h-5 w-5 text-ev-blue-edge" aria-hidden />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</span>
            <span className="block truncate text-lg font-black leading-tight">{unit.unitName}</span>
            {fog ? (
              <span className="mt-0.5 block text-xs font-bold text-ev-blue-edge">
                {state === 'locked' ? 'Still in the mist' : 'A new stretch of road'}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  )
}

const UnitObstacle = ({
  stop,
  point,
}: {
  stop: Extract<PathStop, { kind: 'obstacle' }>
  point: RoadPoint
}) => {
  const remaining = obstacleRemaining(stop.unit)
  const cleared = remaining <= 0 || stop.unit.isFullyCompleted
  const checkpoint = unitCheckpointLesson(stop.unit)
  const locked = !checkpoint?.isUnlocked
  const inner = (
    <div
      className={`flex w-[13rem] flex-col items-center ${cleared ? 'opacity-80' : ''} ${locked ? 'opacity-70' : ''}`}
    >
      <span className={`relative ${cleared ? '' : 'ev-bob'}`}>
        <QuestObstacleArt obstacleKey={stop.obstacleKey} className="h-40 w-40 drop-shadow-md" />
        {cleared ? (
          <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ev-green text-white shadow-ev-sm">
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
          </span>
        ) : null}
      </span>
      <span className="mt-1 text-center text-sm font-black text-ev-ink">{OBSTACLE_LABEL[stop.obstacleKey]}</span>
      {cleared ? (
        <span className="text-[11px] font-bold text-ev-green-edge">Cleared</span>
      ) : (
        <div className="mt-1 w-[9.5rem]">
          <ResistanceMeter remaining={remaining} />
        </div>
      )}
    </div>
  )

  const className = 'absolute z-10 -translate-x-1/2 -translate-y-[2.4rem]'
  const style = { left: point.x, top: point.y }

  if (locked || !checkpoint) {
    return (
      <div
        className={className}
        style={style}
        data-path-obstacle={stop.obstacleKey}
        data-obstacle-cleared={cleared ? 'true' : 'false'}
        aria-label={`${OBSTACLE_LABEL[stop.obstacleKey]} — ${QUEST_COPY.locked}`}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      to={lessonHref(checkpoint.lessonId)}
      className={`${className} ev-press`}
      style={style}
      data-path-obstacle={stop.obstacleKey}
      data-obstacle-cleared={cleared ? 'true' : 'false'}
      aria-label={`${OBSTACLE_LABEL[stop.obstacleKey]} — ${stop.unit.unitName}`}
    >
      {inner}
    </Link>
  )
}

const StrandRoad = ({
  strand,
  currentLessonId,
  justUnlocked,
}: {
  strand: PathStrand
  currentLessonId: string | null
  justUnlocked: Set<string>
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const [width, setWidth] = useState(0)
  const [pathEl, setPathEl] = useState<SVGPathElement | null>(null)
  const [travel, setTravel] = useState({ from: 0, to: 0 })
  const fromStopId = useRef<string | null>(readVehicleStop())

  const stops = useMemo(() => flattenStrandStops(strand, currentLessonId), [strand, currentLessonId])
  const points = useMemo(() => (width < 200 ? [] : layoutStops(stops, width)), [stops, width])
  const pathD = useMemo(() => pointsToCubicPath(points), [points])
  const height = width < 200 ? 128 : roadHeight(points)
  const accent = accentFor(strand.strandName)
  const roadStroke = accent === 'pink' ? '#FF5CA8' : accent === 'green' ? '#7ED957' : '#2BB3F3'
  const roadEdge = accent === 'pink' ? '#DB3B87' : accent === 'green' ? '#5FB93B' : '#1A93CE'

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const apply = () => setWidth(Math.max(280, Math.round(el.getBoundingClientRect().width)))
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const path = pathRef.current
    if (!path || points.length === 0 || path.getTotalLength() < 20) {
      setPathEl(null)
      return
    }
    setPathEl(path)
    const idx = Math.min(currentStopIndex(stops, currentLessonId), points.length - 1)
    const next = progressAlongPath(path, points[idx])
    const origin = fromStopId.current
    const prevIdx = origin ? stops.findIndex((stop) => stop.id === origin) : -1
    const from = prevIdx >= 0 ? progressAlongPath(path, points[prevIdx]) : next
    setTravel({ from, to: next })
  }, [pathD, points, stops, currentLessonId, width])

  const markArrived = () => {
    if (Math.abs(travel.from - travel.to) < 0.004) return
    const idx = Math.min(currentStopIndex(stops, currentLessonId), Math.max(stops.length - 1, 0))
    const stop = stops[idx]
    if (stop) {
      fromStopId.current = stop.id
      rememberVehicleStop(stop.id)
    }
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      data-path-road="true"
      data-travel={`${travel.from.toFixed(3)}-${travel.to.toFixed(3)}`}
      data-origin-stop={fromStopId.current || ''}
      style={{ height }}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMinYMin meet"
        aria-hidden
      >
        <path d={hillFillPath(width, height)} fill="currentColor" className="text-ev-green-soft" />
        <path
          d={pathD}
          fill="none"
          stroke={roadEdge}
          strokeWidth="42"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          ref={pathRef}
          data-path-line="true"
          d={pathD}
          fill="none"
          stroke={roadStroke}
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="10 14"
          opacity="0.55"
        />
      </svg>

      {stops.map((stop, i) => {
        const point = points[i]
        if (!point) return null
        if (stop.kind === 'unit') {
          return <UnitCheckpoint key={stop.id} unit={stop.unit} state={stop.state} point={point} strandId={stop.strandId} />
        }
        if (stop.kind === 'lesson') {
          return (
            <PathNode
              key={stop.id}
              lesson={stop.lesson}
              point={point}
              justUnlocked={justUnlocked.has(stop.lesson.lessonId) && stop.lesson.isUnlocked && !stop.lesson.isDone}
            />
          )
        }
        return <UnitObstacle key={stop.id} stop={stop} point={point} />
      })}

      {pathEl && points.length > 0 ? (
        <PathVehicle
          pathEl={pathEl}
          fromProgress={travel.from}
          toProgress={travel.to}
          layoutKey={`${strand.strandId}:${width}`}
          onArrived={markArrived}
        />
      ) : null}
    </div>
  )
}

const StrandSection = ({
  strand,
  currentLessonId,
  justUnlocked,
}: {
  strand: PathStrand
  currentLessonId: string | null
  justUnlocked: Set<string>
}) => {
  const accent = accentFor(strand.strandName)
  const sectionDone = strandHasCompletedPath(strand)

  return (
    <section data-path-strand={strand.strandId} className="space-y-3">
      <div
        className={`relative overflow-hidden rounded-ev-lg px-5 py-5 text-white ev-banner-depth ${STRAND_FILL[accent]}`}
        data-strand-banner="true"
      >
        <BannerDecor accent={accent} variant="strand" />
        <div className="relative z-10 pr-6">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/85">Strand</p>
          <p className="text-2xl font-black leading-tight">{strand.strandName}</p>
        </div>
        {sectionDone ? (
          <div className="pointer-events-none absolute -bottom-5 -right-3 h-24 w-24" aria-hidden>
            <LazyLottie animationKey="cuteTiger" style={{ width: '100%', height: '100%' }} />
          </div>
        ) : null}
      </div>
      <div className="rounded-ev-lg bg-white/70 py-4 shadow-ev-sm">
        <StrandRoad strand={strand} currentLessonId={currentLessonId} justUnlocked={justUnlocked} />
      </div>
    </section>
  )
}

const SubjectPath = ({
  subject,
  currentLessonId,
  justUnlocked,
}: {
  subject: PathSubject
  currentLessonId: string | null
  justUnlocked: Set<string>
}) => {
  const accent = accentFor(subject.subjectName)
  return (
    <article data-path-subject={subject.subjectId} className="space-y-6">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${ACCENT_BG[accent]}`} aria-hidden />
        <h3 className="text-xl font-black text-ev-ink">{subject.subjectName}</h3>
      </div>
      {subject.strands.map((strand) => (
        <StrandSection
          key={strand.strandId}
          strand={strand}
          currentLessonId={currentLessonId}
          justUnlocked={justUnlocked}
        />
      ))}
    </article>
  )
}

type LearnerPathBoardProps = {
  subjects: PathSubject[]
  currentLessonId?: string | null
  loading?: boolean
}

export const LearnerPathBoard = ({
  subjects,
  currentLessonId = null,
  loading,
}: LearnerPathBoardProps) => {
  const unlockedIds = useMemo(
    () =>
      flattenPathLessons(subjects)
        .filter((row) => row.lesson.isUnlocked)
        .map((row) => row.lesson.lessonId),
    [subjects]
  )
  const [justUnlocked, setJustUnlocked] = useState<Set<string>>(new Set())
  const unlockedKey = unlockedIds.join(',')

  useEffect(() => {
    if (!subjects.length) return
    setJustUnlocked(justUnlockedAgainstSeen(unlockedIds))
    const timer = window.setTimeout(() => rememberUnlocked(unlockedIds), 0)
    return () => window.clearTimeout(timer)
  }, [subjects.length, unlockedKey])

  if (loading) {
    return (
      <div className="rounded-ev-lg bg-white p-6 shadow-ev-card">
        <p className="text-lg font-black text-ev-ink">Loading your path…</p>
      </div>
    )
  }

  if (!subjects.length) {
    return null
  }

  return (
    <div data-learner-path="true" className="space-y-10">
      {subjects.map((subject) => (
        <SubjectPath
          key={subject.subjectId}
          subject={subject}
          currentLessonId={currentLessonId}
          justUnlocked={justUnlocked}
        />
      ))}
    </div>
  )
}
