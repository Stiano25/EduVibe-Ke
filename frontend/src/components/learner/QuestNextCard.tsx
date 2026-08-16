import { Link } from 'react-router-dom'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { animationKeyForSubjectName } from '@/lib/lottieAnimations'
import { QUEST_COPY } from '@/lib/complexityBands'

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
  unitId: string
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
}

export const QuestNextCard = ({ data, loading }: QuestNextCardProps) => {
  if (loading) {
    return (
      <div className="mb-4 sm:mb-6 px-2 sm:px-3 md:px-5">
        <div className="max-w-md mx-auto rounded-[28px] bg-white/80 border-2 border-slate-200 p-6 flex justify-center">
          <div className="w-20 h-20">
            <LazyLottie animationKey="loading" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      </div>
    )
  }

  const task = data?.task
  if (!task) {
    return (
      <div className="mb-4 sm:mb-6 px-2 sm:px-3 md:px-5">
        <div className="max-w-md mx-auto rounded-[28px] bg-white/90 border-2 border-slate-200 p-6 text-center">
          <div className="w-24 h-24 mx-auto mb-3">
            <LazyLottie animationKey="happyBoy" style={{ width: '100%', height: '100%' }} />
          </div>
          <p
            className="text-xl font-black text-[#0F172A]"
            style={{ fontFamily: 'Fredoka, sans-serif' }}
          >
            {QUEST_COPY.done}
          </p>
        </div>
      </div>
    )
  }

  const href = `/learner/lessons/${task.lessonId}`
  const label = task.progress > 0 ? QUEST_COPY.keepGoing : QUEST_COPY.start
  const animationKey = animationKeyForSubjectName(task.subjectName)

  return (
    <div className="mb-4 sm:mb-6 px-2 sm:px-3 md:px-5">
      <div className="max-w-md mx-auto overflow-hidden rounded-[28px] border-2 border-white/40 shadow-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600">
        <div className="p-5 sm:p-6 text-center" style={{ fontFamily: 'Fredoka, sans-serif' }}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/80 font-semibold mb-2">
            {QUEST_COPY.next}
          </p>
          <div className="w-28 h-28 mx-auto mb-3">
            <LazyLottie animationKey={animationKey} style={{ width: '100%', height: '100%' }} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug px-1">{task.title}</h2>
          <Link
            to={href}
            className="mt-4 inline-flex items-center justify-center px-8 py-3 rounded-full bg-white text-indigo-700 text-base font-bold shadow-lg hover:bg-indigo-50"
          >
            {label}
          </Link>
        </div>
      </div>
    </div>
  )
}
