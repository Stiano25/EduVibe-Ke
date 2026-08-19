import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Flag, Lock, Star } from 'lucide-react'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { QUEST_COPY } from '@/lib/complexityBands'
import { ACCENT_BG, accentFor, type LearnerAccent } from '@/lib/learnerUi'
import { justUnlockedAgainstSeen, rememberUnlocked } from '@/lib/learnerPathChrome'
import {
  flattenPathLessons,
  strandHasCompletedPath,
  type PathLesson,
  type PathStrand,
  type PathSubject,
  type PathUnit,
} from '@/hooks/useLearnerPath'

type NodeState = 'locked' | 'current' | 'done' | 'open'

const NODE_FILL: Record<NodeState, string> = {
  locked: 'bg-ev-line text-ev-muted',
  current: 'bg-ev-blue text-white',
  done: 'bg-ev-green text-white',
  open: 'bg-ev-pink text-white',
}

const STRAND_FILL: Record<LearnerAccent, string> = {
  green: 'bg-ev-green',
  blue: 'bg-ev-blue',
  pink: 'bg-ev-pink',
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
  index,
  justUnlocked,
}: {
  lesson: PathLesson
  index: number
  justUnlocked: boolean
}) => {
  const state = stateFor(lesson)
  const side = index % 2 === 0 ? 'ml-[18%] mr-auto' : 'mr-[18%] ml-auto'
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
        className={`relative flex h-16 w-16 items-center justify-center rounded-full shadow-ev-card ${NODE_FILL[state]} ${
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

  const className = `relative z-10 flex w-[42%] flex-col items-center ${side}`

  if (state === 'locked') {
    return (
      <div
        className={`${className} opacity-60`}
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
      data-path-node={lesson.lessonId}
      data-node-state={justUnlocked && state !== 'done' ? 'just-unlocked' : state}
      aria-label={`${lesson.title} — ${statusWord}`}
    >
      {inner}
    </Link>
  )
}

const UnitCheckpoint = ({ unit }: { unit: PathUnit }) => {
  const locked = !unit.isUnlocked
  return (
    <div
      data-path-unit={unit.subStrandId}
      data-unit-complete={unit.isFullyCompleted ? 'true' : 'false'}
      className={`relative z-10 mx-auto my-2 flex w-[min(100%,20rem)] items-center gap-3 rounded-ev-md px-4 py-3 shadow-ev-card ${
        unit.isFullyCompleted
          ? 'bg-ev-green text-white'
          : locked
            ? 'bg-white text-ev-muted'
            : 'bg-white text-ev-ink'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          unit.isFullyCompleted ? 'bg-white/20' : locked ? 'bg-ev-line' : 'bg-ev-blue-soft'
        }`}
      >
        {unit.isFullyCompleted ? (
          <Star className="h-5 w-5 fill-current" aria-hidden />
        ) : locked ? (
          <Lock className="h-5 w-5" aria-hidden />
        ) : (
          <Flag className="h-5 w-5 text-ev-blue-edge" aria-hidden />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-wide opacity-80">
          {unit.isFullyCompleted ? 'Unit complete' : locked ? 'Next unit' : 'Unit'}
        </span>
        <span className="block truncate text-lg font-black leading-tight">{unit.unitName}</span>
      </span>
    </div>
  )
}

const StrandSection = ({
  strand,
  justUnlocked,
}: {
  strand: PathStrand
  justUnlocked: Set<string>
}) => {
  const accent = accentFor(strand.strandName)
  const sectionDone = strandHasCompletedPath(strand)
  let nodeIndex = 0

  return (
    <section data-path-strand={strand.strandId} className="space-y-3">
      <div className={`relative overflow-hidden rounded-ev-lg px-5 py-4 text-white shadow-ev-lift ${STRAND_FILL[accent]}`}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/80">Strand</p>
        <p className="text-2xl font-black leading-tight">{strand.strandName}</p>
        {sectionDone ? (
          <div className="pointer-events-none absolute -bottom-4 -right-3 h-28 w-28" aria-hidden>
            <LazyLottie animationKey="cuteTiger" style={{ width: '100%', height: '100%' }} />
          </div>
        ) : null}
      </div>

      <div className="relative py-2">
        <div
          data-path-line="true"
          className="pointer-events-none absolute bottom-10 left-1/2 top-10 w-1.5 -translate-x-1/2 rounded-full bg-ev-blue"
          aria-hidden
        />
        <div className="relative space-y-5">
          {strand.units.map((unit) => (
            <div key={unit.subStrandId} className="space-y-5">
              <UnitCheckpoint unit={unit} />
              {unit.lessons.map((lesson) => {
                const index = nodeIndex
                nodeIndex += 1
                return (
                  <PathNode
                    key={lesson.lessonId}
                    lesson={lesson}
                    index={index}
                    justUnlocked={justUnlocked.has(lesson.lessonId) && lesson.isUnlocked && !lesson.isDone}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const SubjectPath = ({
  subject,
  justUnlocked,
}: {
  subject: PathSubject
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
        <StrandSection key={strand.strandId} strand={strand} justUnlocked={justUnlocked} />
      ))}
    </article>
  )
}

type LearnerPathBoardProps = {
  subjects: PathSubject[]
  loading?: boolean
}

export const LearnerPathBoard = ({ subjects, loading }: LearnerPathBoardProps) => {
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
        <SubjectPath key={subject.subjectId} subject={subject} justUnlocked={justUnlocked} />
      ))}
    </div>
  )
}
