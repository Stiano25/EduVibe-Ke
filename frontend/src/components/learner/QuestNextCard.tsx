import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { animationKeyForSubjectName } from '@/lib/lottieAnimations'
import { QUEST_COPY } from '@/lib/complexityBands'
import { learnerButton } from '@/lib/learnerUi'

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
}

/**
 * Wide coloured hero. Copy sits on the left; the character hangs off the
 * right edge so it feels part of the card instead of sitting in a box.
 */
export const QuestNextCard = ({
  data,
  loading,
  showPickerLink = true,
  hasOpenLessons = false,
}: QuestNextCardProps) => {
  if (loading) {
    return (
      <div className="relative min-h-[176px] overflow-hidden rounded-ev-lg bg-ev-green shadow-ev-card">
        <div className="relative z-10 flex min-h-[176px] max-w-[62%] flex-col justify-center p-5 sm:p-6">
          <p className="text-2xl font-black leading-tight text-white sm:text-3xl">Loading…</p>
        </div>
        <div className="pointer-events-none absolute -bottom-6 -right-4 h-44 w-44 sm:-bottom-8 sm:-right-2 sm:h-56 sm:w-56">
          <LazyLottie animationKey="happyBoy" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    )
  }

  const task = data?.task
  if (!task) {
    return (
      <div className="relative min-h-[168px] overflow-hidden rounded-ev-lg bg-ev-green shadow-ev-card">
        <div className="relative z-10 flex min-h-[168px] max-w-[62%] flex-col justify-center p-5 sm:p-6">
          <p className="text-2xl font-black leading-tight text-white sm:text-3xl">
            {hasOpenLessons ? QUEST_COPY.chooseAny : QUEST_COPY.done}
          </p>
          {showPickerLink ? (
            <Link to="/learner/lessons" className={learnerButton('onColor', 'md', 'mt-4 self-start')}>
              <Play className="h-4 w-4 fill-current" aria-hidden />
              {QUEST_COPY.pick}
            </Link>
          ) : null}
        </div>
        <div className="pointer-events-none absolute -bottom-6 -right-4 h-44 w-44 sm:-bottom-8 sm:-right-2 sm:h-56 sm:w-56">
          <LazyLottie animationKey="happyBoy" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    )
  }

  const href = `/learner/lessons/${task.lessonId}`
  const label = task.progress > 0 ? QUEST_COPY.keepGoing : QUEST_COPY.start
  const animationKey = animationKeyForSubjectName(task.subjectName)
  const progress = Math.max(0, Math.min(100, task.progress || 0))
  const fill = task.progress > 0 ? 'bg-ev-blue' : 'bg-ev-green'

  return (
    <div className={`relative min-h-[176px] overflow-hidden rounded-ev-lg ${fill} shadow-ev-card`}>
      <div className="relative z-10 flex min-h-[176px] flex-col justify-between p-5 pr-28 sm:p-6 sm:pr-40">
        <div>
          <p className="text-sm font-bold text-white/80">{task.subjectName || QUEST_COPY.next}</p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-white sm:text-3xl">{task.title}</h2>
          {progress > 0 ? (
            <div className="mt-3 h-2.5 w-36 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </div>
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
      </div>
      <div className="pointer-events-none absolute -bottom-8 -right-4 h-48 w-48 sm:-bottom-10 sm:-right-2 sm:h-60 sm:w-60">
        <LazyLottie animationKey={animationKey} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}
