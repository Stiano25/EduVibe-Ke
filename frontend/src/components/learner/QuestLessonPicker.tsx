import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Lock } from 'lucide-react'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { api } from '@/lib/api'
import { QUEST_COPY } from '@/lib/complexityBands'

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

type QuestLessonPickerProps = {
  compact?: boolean
  currentLessonId?: string
  heading?: string
}

const lessonHref = (id: string) => `/learner/lessons/${id}`

export const QuestLessonPicker = ({
  compact = false,
  currentLessonId,
  heading,
}: QuestLessonPickerProps) => {
  const [choices, setChoices] = useState<LessonChoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = (await api.learner.getLessonChoices()) as LessonChoicesResponse
        if (!cancelled) setChoices(Array.isArray(data.choices) ? data.choices : [])
      } catch {
        if (!cancelled) setChoices([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const visible = compact ? choices.slice(0, 6) : choices
  const groups = useMemo(() => {
    const map = new Map<string, LessonChoice[]>()
    for (const choice of visible) {
      const key = compact
        ? 'all'
        : [choice.subjectName, choice.strandName, choice.subStrandName].filter(Boolean).join(' · ')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(choice)
    }
    return [...map.entries()]
  }, [visible, compact])

  if (loading) {
    return (
      <div className={compact ? 'mt-4' : 'px-2 sm:px-3 md:px-5'}>
        <div className="max-w-md mx-auto rounded-[28px] bg-white/80 border-2 border-slate-200 p-6 flex justify-center">
          <div className="w-16 h-16">
            <LazyLottie animationKey="loading" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (choices.length === 0) {
    if (compact) return null
    return (
      <div className="px-2 sm:px-3 md:px-5">
        <div className="max-w-md mx-auto rounded-[28px] bg-white/90 border-2 border-slate-200 p-6 text-center">
          <p className="text-xl font-black text-[#0F172A]" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            {QUEST_COPY.done}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={compact ? 'mt-5' : 'px-2 sm:px-3 md:px-5 pb-6'}>
      <div className="max-w-md mx-auto space-y-4" style={{ fontFamily: 'Fredoka, sans-serif' }}>
        <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-black text-[#0F172A] text-center`}>
          {heading || QUEST_COPY.pick}
        </h2>

        {groups.map(([label, items]) => (
          <div key={label} className="space-y-2">
            {!compact && label !== 'all' ? (
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">{label}</p>
            ) : null}
            {items.map((choice) => {
              const isCurrent = choice.lessonId === currentLessonId
              const progress = choice.isCompleted ? 100 : Math.max(0, Math.min(100, choice.progress || 0))
              const inner = (
                <>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-base font-bold text-[#0F172A] leading-snug">{choice.title}</span>
                    {compact ? (
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {choice.subStrandName || choice.subjectName}
                      </span>
                    ) : null}
                    {progress > 0 ? (
                      <span className="mt-2 block h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-indigo-500"
                          style={{ width: `${progress}%` }}
                        />
                      </span>
                    ) : null}
                  </span>
                  {choice.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : !choice.isUnlocked ? (
                    <Lock className="w-5 h-5 text-slate-400 shrink-0" aria-label={QUEST_COPY.locked} />
                  ) : null}
                </>
              )

              const className = `w-full flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-[20px] border-2 text-left ${
                isCurrent
                  ? 'border-indigo-400 bg-indigo-50'
                  : choice.isUnlocked
                    ? 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/60'
                    : 'border-slate-100 bg-slate-50 opacity-70'
              }`

              if (!choice.isUnlocked) {
                return (
                  <div key={choice.lessonId} className={className} aria-disabled="true">
                    {inner}
                  </div>
                )
              }

              return (
                <Link key={choice.lessonId} to={lessonHref(choice.lessonId)} className={className}>
                  {inner}
                </Link>
              )
            })}
          </div>
        ))}

        {compact && choices.length > 6 ? (
          <div className="text-center pt-1">
            <Link
              to="/learner/lessons"
              className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-white border-2 border-slate-200 text-indigo-700 text-sm font-bold hover:bg-indigo-50"
            >
              {QUEST_COPY.lessons}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}

type QuestLessonSwitchProps = {
  currentLessonId: string
}

export const QuestLessonSwitch = ({ currentLessonId }: QuestLessonSwitchProps) => {
  const navigate = useNavigate()
  const [choices, setChoices] = useState<LessonChoice[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = (await api.learner.getLessonChoices()) as LessonChoicesResponse
        if (!cancelled) setChoices(Array.isArray(data.choices) ? data.choices : [])
      } catch {
        if (!cancelled) setChoices([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const unlocked = choices.filter((c) => c.isUnlocked)
  if (unlocked.length < 2) return null

  return (
    <label className="mb-4 flex flex-col gap-1 max-w-sm" style={{ fontFamily: 'Fredoka, sans-serif' }}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{QUEST_COPY.pick}</span>
      <select
        value={currentLessonId}
        onChange={(event) => {
          const next = event.target.value
          if (next && next !== currentLessonId) navigate(lessonHref(next))
        }}
        className="w-full min-h-12 rounded-[16px] border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-[#0F172A]"
      >
        {unlocked.map((choice) => (
          <option key={choice.lessonId} value={choice.lessonId}>
            {choice.title}
          </option>
        ))}
      </select>
    </label>
  )
}
