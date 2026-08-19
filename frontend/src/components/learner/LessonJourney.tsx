import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Lock } from 'lucide-react'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { useLessonChoices, type LessonChoice } from '@/hooks/useLessonChoices'
import { animationKeyForSubjectName } from '@/lib/lottieAnimations'
import { QUEST_COPY } from '@/lib/complexityBands'
import { ACCENT_BG, accentFor, learnerButton, type LearnerAccent } from '@/lib/learnerUi'

type NodeState = 'done' | 'current' | 'open' | 'locked'

const WORDS: Record<NodeState, string> = {
  done: QUEST_COPY.statusDone,
  current: QUEST_COPY.statusKeepGoing,
  open: QUEST_COPY.statusNew,
  locked: QUEST_COPY.locked,
}

const WORD_TONES: Record<NodeState, string> = {
  done: 'text-ev-green-edge',
  current: 'text-ev-blue-edge',
  open: 'text-ev-pink-edge',
  locked: 'text-ev-muted',
}

const TOPIC_FILL: Record<LearnerAccent, string> = {
  blue: 'bg-ev-blue',
  pink: 'bg-ev-pink',
  green: 'bg-ev-green',
}

const lessonHref = (id: string) => `/learner/lessons/${id}`

const stateFor = (choice: LessonChoice, activeId: string | null): NodeState => {
  if (!choice.isUnlocked) return 'locked'
  if (choice.isCompleted) return 'done'
  if (choice.lessonId === activeId) return 'current'
  return 'open'
}

type RowProps = {
  choice: LessonChoice
  state: NodeState
}

const LessonRow = ({ choice, state }: RowProps) => {
  const accent = accentFor(choice.subjectName || choice.title)
  const animationKey = animationKeyForSubjectName(choice.subjectName || '')
  const progress = choice.isCompleted ? 100 : Math.max(0, Math.min(100, choice.progress || 0))

  const inner = (
    <>
      <div
        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-[18px] sm:h-[72px] sm:w-[72px] ${
          state === 'locked' ? 'bg-ev-line' : ACCENT_BG[accent]
        }`}
      >
        <LazyLottie
          animationKey={animationKey}
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-base font-bold leading-snug text-ev-ink">
          {choice.title}
        </span>
        <span className={`mt-0.5 block text-xs font-bold ${WORD_TONES[state]}`}>
          {WORDS[state]}
          {choice.subStrandName && state !== 'locked' ? ` · ${choice.subStrandName}` : ''}
        </span>
        {progress > 0 && progress < 100 ? (
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ev-line">
            <span className="block h-full rounded-full bg-ev-blue" style={{ width: `${progress}%` }} />
          </span>
        ) : null}
      </span>

      {state === 'done' ? (
        <Check className="h-5 w-5 shrink-0 text-ev-green" strokeWidth={3} aria-hidden />
      ) : state === 'locked' ? (
        <Lock className="h-5 w-5 shrink-0 text-ev-muted" aria-hidden />
      ) : (
        <ChevronRight className="h-5 w-5 shrink-0 text-ev-muted" aria-hidden />
      )}
    </>
  )

  const className =
    'flex w-full items-center gap-3 rounded-ev-lg bg-white p-3 shadow-ev-card transition-transform ev-press focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ev-blue/30'

  if (state === 'locked') {
    return (
      <div className={`${className} opacity-70`} aria-disabled="true" aria-label={`${choice.title} — ${QUEST_COPY.locked}`}>
        {inner}
      </div>
    )
  }

  return (
    <Link to={lessonHref(choice.lessonId)} className={className} aria-label={`${choice.title} — ${WORDS[state]}`}>
      {inner}
    </Link>
  )
}

type LessonJourneyProps = {
  compact?: boolean
  currentLessonId?: string
  heading?: string
}

export const LessonJourney = ({ compact = false, currentLessonId, heading }: LessonJourneyProps) => {
  const { choices, loading } = useLessonChoices()

  const activeId =
    currentLessonId || choices.find((c) => c.isUnlocked && !c.isCompleted)?.lessonId || null

  const visible = compact ? choices.slice(0, 5) : choices

  const groups = useMemo(() => {
    const map = new Map<string, LessonChoice[]>()
    for (const choice of visible) {
      const key = compact
        ? 'all'
        : choice.subStrandName || choice.strandName || choice.subjectName || 'Lessons'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(choice)
    }
    return [...map.entries()]
  }, [visible, compact])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-16 w-16">
          <LazyLottie animationKey="loading" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    )
  }

  if (choices.length === 0) {
    if (compact) return null
    return <p className="py-6 text-center text-xl font-black text-ev-ink">{QUEST_COPY.done}</p>
  }

  return (
    <div className="w-full">
      {heading ? <h2 className="mb-4 text-xl font-black text-ev-ink">{heading}</h2> : null}

      <div className="space-y-5">
        {groups.map(([label, items], groupIndex) => {
          const topicAccent: LearnerAccent = (['blue', 'pink', 'green'] as const)[groupIndex % 3]
          return (
            <section key={label}>
              {!compact && label !== 'all' ? (
                <div
                  className={`${TOPIC_FILL[topicAccent]} mb-3 rounded-ev-md px-4 py-2.5 text-white shadow-ev-sm`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                    Topic {groupIndex + 1}
                  </p>
                  <p className="text-lg font-black leading-tight">{label}</p>
                </div>
              ) : null}

              <ul className="space-y-3">
                {items.map((choice) => (
                  <li key={choice.lessonId}>
                    <LessonRow choice={choice} state={stateFor(choice, activeId)} />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {compact && choices.length > visible.length ? (
        <div className="mt-5">
          <Link to="/learner/lessons" className={learnerButton('secondary', 'md')}>
            {QUEST_COPY.lessons}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  )
}
