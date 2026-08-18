import { useNavigate } from 'react-router-dom'
import { useLessonChoices } from '@/hooks/useLessonChoices'
import { QUEST_COPY } from '@/lib/complexityBands'

type QuestLessonSwitchProps = {
  currentLessonId: string
}

/** Jump between unlocked lessons without going back to the journey. */
export const QuestLessonSwitch = ({ currentLessonId }: QuestLessonSwitchProps) => {
  const navigate = useNavigate()
  const { choices } = useLessonChoices()

  const unlocked = choices.filter((c) => c.isUnlocked)
  if (unlocked.length < 2) return null

  return (
    <label className="mb-4 flex max-w-sm flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-ev-muted">
        {QUEST_COPY.pick}
      </span>
      <select
        value={currentLessonId}
        onChange={(event) => {
          const next = event.target.value
          if (next && next !== currentLessonId) navigate(`/learner/lessons/${next}`)
        }}
        className="w-full min-h-12 rounded-ev-md border-2 border-b-4 border-ev-line bg-white px-3 text-base font-bold text-ev-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ev-blue/40"
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
