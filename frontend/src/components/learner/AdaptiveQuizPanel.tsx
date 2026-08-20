import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { api } from '@/lib/api'
import { quizFlashCopy } from '@/lib/quizFlashCopy'
import { isQuizSoundOn, playAnswerSound, setQuizSoundOn } from '@/lib/quizSound'
import { isGrade1to3 } from '@/lib/complexityBands'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { type TapSelection } from './TapSelectOptions'
import { AnswerCelebration } from './quiz/AnswerCelebration'
import {
  AnswerCharacterReaction,
  prefetchAnswerCharacters,
} from './quiz/AnswerCharacterReaction'
import { LiveInteraction, ReviewInteraction } from './quiz/interactionRegistry'
import type { AdaptiveQuestion, LiveFlash, ReviewItem } from './quiz/types'
import type { Lesson } from '@/types'
import { CheckpointHud } from './path/CheckpointHud'
import type { ObstacleKey } from '@/lib/learnerPathRoad'

/** Confetti animation is 0.85s; hold at least this long on a fast round-trip. */
const CORRECT_HOLD_MS = 600
/** Longer: the learner also has to read what the right answer was. */
const INCORRECT_HOLD_MS = 1000
const LAST_QUESTION_EXTRA_MS = 200
/** After a slow network wait, still flash briefly — do not stack the full hold. */
const HOLD_FLOOR_MS = 200

type ScoreBlock = {
  correct: number
  total: number
  percentage: number
  retryCount?: number
}

type PracticeScoreBlock = {
  percentage: number
  total?: number
  creditSum?: number
}

type ReviewPayload = {
  items: ReviewItem[]
  score?: ScoreBlock | null
  practiceScore?: PracticeScoreBlock | null
  completedAt?: string | null
}

type QuizMeta = {
  progressLabel?: string
  phase?: string
  mainAnswered?: number
  mainTarget?: number
  done?: boolean
  progressPct?: number
  score?: ScoreBlock
  modalitySignal?: { source?: string; modality?: string | null }
}

type CheckpointEncounter = {
  obstacleKey: ObstacleKey
  unitName: string
}

interface AdaptiveQuizPanelProps {
  lesson: Lesson & { isCompleted?: boolean; sessionReview?: unknown; progress?: number }
  lessonId: string
  preferredModality: string
  onSessionComplete?: (pct: number, passed: boolean, topicMastered?: boolean) => void
  resolveDiagramUrl?: (briefId?: string | null) => string | null
  /** Last lesson of a unit — meter shrinks on correct answers only. */
  checkpoint?: CheckpointEncounter | null
}

const displayPctFromReview = (review: ReviewPayload, grade?: string | number | null) => {
  const firstTry = review.score?.percentage ?? 0
  if (isGrade1to3(grade != null ? String(grade) : null) && review.practiceScore?.percentage != null) {
    return review.practiceScore.percentage
  }
  return firstTry
}

export const AdaptiveQuizPanel = ({
  lesson,
  lessonId,
  onSessionComplete,
  resolveDiagramUrl,
  checkpoint = null,
}: AdaptiveQuizPanelProps) => {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'adaptive' | 'review'>('adaptive')
  const [session, setSession] = useState<Record<string, unknown> | null>(null)
  const [question, setQuestion] = useState<AdaptiveQuestion | null>(null)
  const [meta, setMeta] = useState<QuizMeta | null>(null)
  const [heldLabel, setHeldLabel] = useState<{ progressLabel?: string; phase?: string } | null>(
    null
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [flash, setFlash] = useState<LiveFlash | null>(null)
  const [review, setReview] = useState<ReviewPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(isQuizSoundOn)
  const [correctHits, setCorrectHits] = useState(0)
  const interactiveRef = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onSessionComplete)
  onCompleteRef.current = onSessionComplete
  const flashCopy = quizFlashCopy(lesson.grade)
  const earlyPrimary = isGrade1to3(lesson.grade)

  const toggleSound = () => {
    setSoundOn((prev) => {
      setQuizSoundOn(!prev)
      return !prev
    })
  }

  useEffect(() => {
    if (earlyPrimary) prefetchAnswerCharacters()
  }, [earlyPrimary])

  const notifySessionComplete = (payload: ReviewPayload, completed?: boolean, topicMastered?: boolean) => {
    const firstTryPct = payload.score?.percentage ?? 0
    const passing = Math.max(lesson.quiz?.passingScore || 60, 60)
    const passed = typeof completed === 'boolean' ? completed : firstTryPct >= passing
    onCompleteRef.current?.(displayPctFromReview(payload, lesson.grade), passed, !!topicMastered)
  }

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = (await api.learner.startAdaptiveQuiz(lessonId)) as {
          mode: 'adaptive' | 'review'
          session?: Record<string, unknown>
          question?: AdaptiveQuestion
          meta?: QuizMeta
          review?: ReviewPayload
          completed?: boolean
        }
        if (cancelled) return
        if (res.mode === 'review' && res.review) {
          setMode('review')
          setReview(res.review)
          const scored = res.review.score?.correct ?? 0
          setCorrectHits(scored)
          if (isGrade1to3(lesson.grade)) {
            notifySessionComplete(res.review, res.completed)
          }
        } else {
          setMode('adaptive')
          setSession(res.session || null)
          setQuestion(res.question || null)
          setMeta(res.meta || null)
          const prior = Number((res.session as { mainScoreCorrect?: number } | null)?.mainScoreCorrect) || 0
          setCorrectHits(prior)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to start quiz')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    boot()
    return () => {
      cancelled = true
    }
    // lesson.grade is stable per lessonId; notify uses current lesson via closure + ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  const reviewScorePct = () => {
    if (mode === 'review' && review?.score) return review.score.percentage
    if (meta?.score) return meta.score.percentage
    return lesson.progress || 0
  }

  const liveProgressPct = () => {
    if (typeof meta?.progressPct === 'number') return Math.max(0, Math.min(100, meta.progressPct))
    return 0
  }

  const displayPhase = heldLabel?.phase ?? meta?.phase
  const displayLabel = heldLabel?.progressLabel ?? meta?.progressLabel
  const meterTarget = Math.max(1, Number(meta?.mainTarget) || 10)
  const checkpointRemaining = Math.max(0, Math.min(100, 100 - (correctHits / meterTarget) * 100))

  /** Tap an option → submit immediately (no separate Submit button). */
  const submitAnswer = async ({
    selectedOptionIndex,
    placedCount,
    submittedValue,
    submittedPairs,
    responseTimeMs,
    optimistic,
  }: {
    selectedOptionIndex?: number
    placedCount?: number
    submittedValue?: string | number
    submittedPairs?: number[][]
    responseTimeMs: number
    optimistic?: LiveFlash
  }) => {
    if (!session || !question || submitting || flash) return
    if (selectedOptionIndex != null) setSelected(selectedOptionIndex)
    if (optimistic) {
      setFlash(optimistic)
      playAnswerSound(optimistic.correct)
    }
    setSubmitting(true)
    if (!optimistic) setFlash(null)
    setHeldLabel({ progressLabel: meta?.progressLabel, phase: meta?.phase })
    const startedAt = performance.now()
    try {
      const res = (await api.learner.nextAdaptiveQuiz(lessonId, {
        session,
        selectedOptionIndex: Number(selectedOptionIndex ?? placedCount ?? submittedValue ?? 0),
        placedCount,
        submittedValue,
        submittedPairs,
        responseTimeMs,
      })) as {
        session: Record<string, unknown>
        question: AdaptiveQuestion | null
        meta: QuizMeta
        lastAnswer?: {
          correct: boolean
          correctAnswerIndex: number
          expectedValue?: number
          matchedPairs?: number
          totalPairs?: number
          explanation?: string
        }
        review?: ReviewPayload
        completed?: boolean
        topicMastered?: boolean
      }

      if (res.lastAnswer) {
        setFlash({
          correct: res.lastAnswer.correct,
          correctAnswerIndex: res.lastAnswer.correctAnswerIndex,
          expectedValue: res.lastAnswer.expectedValue,
          matchedPairs: res.lastAnswer.matchedPairs,
          totalPairs: res.lastAnswer.totalPairs,
          explanation: res.lastAnswer.explanation,
        })
        if (!optimistic) playAnswerSound(res.lastAnswer.correct)
        // Obstacle meter: correct shrinks resistance. A miss does not grow it
        // back, reset the lesson, or touch earlier progress.
        if (res.lastAnswer.correct) {
          setCorrectHits((n) => n + 1)
        }
      }

      setSession(res.session)
      setMeta(res.meta)

      const target =
        (res.lastAnswer?.correct === false ? INCORRECT_HOLD_MS : CORRECT_HOLD_MS) +
        (res.meta?.done ? LAST_QUESTION_EXTRA_MS : 0)
      const remaining = Math.max(HOLD_FLOOR_MS, target - (performance.now() - startedAt))
      await new Promise((r) => setTimeout(r, remaining))

      if (res.meta?.done && res.review) {
        setMode('review')
        setReview(res.review)
        setQuestion(null)
        setHeldLabel(null)
        notifySessionComplete(res.review, res.completed, res.topicMastered)
      } else {
        setQuestion(res.question)
        setSelected(null)
        setFlash(null)
        setHeldLabel(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
      setSelected(null)
      setFlash(null)
      setHeldLabel(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectAndSubmit = ({ optionIndex, responseTimeMs }: TapSelection) =>
    submitAnswer({ selectedOptionIndex: optionIndex, responseTimeMs })

  const handleSubmitDrag = (payload: { placedCount: number; responseTimeMs: number }) =>
    submitAnswer(payload)

  const handleSubmitNumeric = (payload: {
    submittedValue: string | number
    responseTimeMs: number
  }) => {
    const add = question?.addends
    if (add && Number.isInteger(add.a) && Number.isInteger(add.b)) {
      const expected = add.a + add.b
      const got = Number(payload.submittedValue)
      return submitAnswer({
        ...payload,
        optimistic: {
          correct: Number.isFinite(got) && got === expected,
          expectedValue: expected,
        },
      })
    }
    return submitAnswer(payload)
  }

  const handleSubmitMatching = (payload: {
    submittedPairs: number[][]
    responseTimeMs: number
  }) => submitAnswer(payload)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-24 h-24">
          <LazyLottie animationKey="loading" style={{ width: '100%', height: '100%' }} />
        </div>
        <p className="mt-2 text-base font-semibold text-ev-blue-edge">Getting your questions…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-ev-md border-2 border-ev-red bg-ev-red-soft p-5 text-center">
        <p className="text-base font-semibold text-ev-red-edge">{error}</p>
      </div>
    )
  }

  if (mode === 'review' && review) {
    if (earlyPrimary) return null
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl sm:text-3xl font-black text-ev-ink">
              Review mode
            </h2>
            {review.score && (
              <span className="text-sm font-bold text-ev-pink-edge">
                Score: {review.score.correct}/{review.score.total} ({review.score.percentage}%)
                {typeof review.score.retryCount === 'number' && review.score.retryCount > 0
                  ? ` · ${review.score.retryCount} ${review.score.retryCount === 1 ? 'retry' : 'retries'}`
                  : ''}
              </span>
            )}
          </div>
          <div className="h-4 rounded-full bg-white overflow-hidden border-2 border-ev-line">
            <div
              className="h-full rounded-full bg-ev-green transition-all"
              style={{ width: `${reviewScorePct()}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ev-muted">
            Your choices and corrections for this lesson. Read-only.
          </p>
        </div>

        <div className="space-y-4">
          {review.items.map((item, i) => (
            <ReviewInteraction
              key={item.id}
              item={item}
              index={i}
              diagramUrl={resolveDiagramUrl?.(item.diagramBriefId) ?? null}
              visualBrief={
                (lesson.visualBriefs || []).find((b) => b.id === item.diagramBriefId) || null
              }
            />
          ))}
        </div>
      </div>
    )
  }

  if (!question) {
    return (
      <p className="text-sm text-ev-muted">
        No quiz questions available.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {checkpoint ? (
        <CheckpointHud
          obstacleKey={checkpoint.obstacleKey}
          unitName={checkpoint.unitName}
          remaining={checkpointRemaining}
        />
      ) : null}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-2xl sm:text-3xl font-black text-ev-ink">
            {checkpoint ? 'Checkpoint' : `Quiz: ${lesson.quiz?.title || 'Practice'}`}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-ev-muted">{displayLabel || '…'}</span>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
              className="grid place-items-center min-h-12 min-w-12 rounded-full text-ev-muted hover:bg-ev-line/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ev-blue/40"
            >
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="h-4 rounded-full bg-white overflow-hidden border-2 border-ev-line">
          <div
            className={`h-full rounded-full transition-all ${
              displayPhase === 'retry' ? 'bg-ev-pink' : 'bg-ev-green'
            }`}
            style={{ width: `${liveProgressPct()}%` }}
          />
        </div>
        {displayPhase === 'retry' && (
          <p className="mt-1 text-xs text-ev-pink-edge font-semibold">
            Retry round — questions you missed
          </p>
        )}
      </div>

      <div className="relative">
        <LiveInteraction
          key={question.id}
          question={question}
          diagramUrl={resolveDiagramUrl?.(question.diagramBriefId) ?? null}
          visualBrief={
            (lesson.visualBriefs || []).find((b) => b.id === question.diagramBriefId) || null
          }
          selected={selected}
          submitting={submitting}
          flash={flash}
          flashCopy={flashCopy}
          interactiveRef={interactiveRef}
          onSelect={handleSelectAndSubmit}
          onSubmitDrag={handleSubmitDrag}
          onSubmitNumeric={handleSubmitNumeric}
          onSubmitMatching={handleSubmitMatching}
        />
        {flash?.correct ? <AnswerCelebration runKey={question.id} /> : null}
        {earlyPrimary && flash ? (
          <AnswerCharacterReaction correct={flash.correct} runKey={`${question.id}-${flash.correct}`} />
        ) : null}
      </div>
    </div>
  )
}
