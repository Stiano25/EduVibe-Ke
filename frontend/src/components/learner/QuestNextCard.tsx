import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { animationKeyForSubjectName } from '@/lib/lottieAnimations'
import { QUEST_COPY } from '@/lib/complexityBands'
import { learnerButton } from '@/lib/learnerUi'
import { BannerDecor } from '@/components/learner/BannerDecor'
import { LearnerIdentityStrip } from '@/components/learner/WelcomeHeader'

export type NextTaskPayload = {
  lessonId: string
  title: string
  progress: number
  reason: 'continue' | 'next'
  subjectId: string
  subjectName: string
  strandId: string
  strandName: string
  subStrandId: string
  subStrandName: string
  unitId: string | null
}

export type NextTaskResponse = {
  navigationMode: 'quest' | 'browse'
  grade: string | null
  complexityBand: string
  catalog: {
    subjectCount: number
    subjectNames: string[]
    crossSubjectAvailable: boolean
    limitation: string | null
  }
  task: NextTaskPayload | null
}

type QuestNextCardProps = {
  data: NextTaskResponse | null
  loading?: boolean
  showPickerLink?: boolean
  hasOpenLessons?: boolean
  /** Dashboard only — greeting lives in this hero, not a second card. */
  showGreeting?: boolean
}

const HeroShell = ({
  accent,
  state,
  children,
  animationKey,
}: {
  accent: 'green' | 'blue'
  state: 'loading' | 'done' | 'task'
  children: ReactNode
  animationKey: 'happyBoy' | ReturnType<typeof animationKeyForSubjectName>
}) => (
  <div
    className={`relative overflow-hidden rounded-ev-lg ev-banner-depth ${
      accent === 'blue' ? 'bg-ev-blue' : 'bg-ev-green'
    }`}
    data-quest-hero={state}
  >
    <BannerDecor accent={accent} variant="hero" />
    <div className="relative z-10 p-4 pr-28 sm:p-5 sm:pr-40">{children}</div>
    <div className="pointer-events-none absolute -bottom-7 -right-4 h-44 w-44 sm:-bottom-9 sm:-right-2 sm:h-56 sm:w-56">
      <LazyLottie animationKey={animationKey} style={{ width: '100%', height: '100%' }} />
    </div>
  </div>
)

/**
 * One hero: compact identity + next-task / all-caught-up. Copy left, character right.
 */
export const QuestNextCard = ({
  data,
  loading,
  showPickerLink = true,
  hasOpenLessons = false,
  showGreeting = false,
}: QuestNextCardProps) => {
  const greeting = showGreeting ? (
    <div className="mb-3">
      <LearnerIdentityStrip tone="onColor" />
    </div>
  ) : null

  if (loading) {
    return (
      <HeroShell accent="green" state="loading" animationKey="happyBoy">
        {greeting}
        <p className="text-2xl font-black leading-tight text-white sm:text-3xl">Loading…</p>
      </HeroShell>
    )
  }

  const task = data?.task
  if (!task) {
    return (
      <HeroShell accent="green" state="done" animationKey="happyBoy">
        {greeting}
        <p className="text-2xl font-black leading-tight text-white sm:text-3xl">
          {hasOpenLessons ? QUEST_COPY.chooseAny : QUEST_COPY.done}
        </p>
        {showPickerLink ? (
          <Link to="/learner/lessons" className={learnerButton('onColor', 'md', 'mt-4 self-start')}>
            <Play className="h-4 w-4 fill-current" aria-hidden />
            {QUEST_COPY.pick}
          </Link>
        ) : null}
      </HeroShell>
    )
  }

  const href = `/learner/lessons/${task.lessonId}`
  const label = task.progress > 0 ? QUEST_COPY.keepGoing : QUEST_COPY.start
  const animationKey = animationKeyForSubjectName(task.subjectName)
  const progress = Math.max(0, Math.min(100, task.progress || 0))
  const accent = task.progress > 0 ? 'blue' : 'green'

  return (
    <HeroShell accent={accent} state="task" animationKey={animationKey}>
      {greeting}
      <h2 className="text-2xl font-black leading-tight text-white sm:text-3xl">{task.title}</h2>
      {progress > 0 ? (
        <div className="mt-3 h-2.5 w-36 overflow-hidden rounded-full bg-white/30">
          <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link to={href} className={learnerButton('onColor', 'md')}>
          <Play className="h-4 w-4 fill-current" aria-hidden />
          {label}
        </Link>
        {showPickerLink ? (
          <Link
            to="/learner/lessons"
            className="text-sm font-bold text-white/90 underline underline-offset-4 hover:text-white"
          >
            {QUEST_COPY.pick}
          </Link>
        ) : null}
      </div>
    </HeroShell>
  )
}
