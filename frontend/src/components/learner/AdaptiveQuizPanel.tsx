import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { quizFlashCopy } from '@/lib/quizFlashCopy'
import { type TapSelection } from './TapSelectOptions'
import { LiveInteraction, ReviewInteraction } from './quiz/interactionRegistry'
import type { AdaptiveQuestion, LiveFlash, ReviewItem } from './quiz/types'
import type { Lesson } from '@/types'

const FEEDBACK_HOLD_MS = 650
const LAST_QUESTION_HOLD_MS = 1000

type ReviewPayload = {
  items: ReviewItem[]
  score?: {
    correct: number
    total: number
    percentage: number
    retryCount?: number
  } | null
  completedAt?: string | null
}

type QuizMeta = {
  progressLabel?: string
  phase?: string
  mainAnswered?: number
  mainTarget?: number
  done?: boolean
  progressPct?: number
  score?: { correct: number; total: number; percentage: number; retryCount?: number }
  modalitySignal?: { source?: string; modality?: string | null }
}

interface AdaptiveQuizPanelProps {
  lesson: Lesson & { isCompleted?: boolean; sessionReview?: unknown; progress?: number }
  lessonId: string
  preferredModality: string
  onSessionComplete?: (pct: number, passed: boolean, topicMastered?: boolean) => void
  resolveDiagramUrl?: (briefId?: string | null) => string | null
}

export const AdaptiveQuizPanel = ({
  lesson,
  lessonId,
  onSessionComplete,
  resolveDiagramUrl,
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
  const interactiveRef = useRef<HTMLDivElement>(null)
  const flashCopy = quizFlashCopy(lesson.grade)

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
        } else {
          setMode('adaptive')
          setSession(res.session || null)
          setQuestion(res.question || null)
          setMeta(res.meta || null)
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

  /** Tap an option → submit immediately (no separate Submit button). */
  const submitAnswer = async ({
    selectedOptionIndex,
    placedCount,
    responseTimeMs,
  }: {
    selectedOptionIndex?: number
    placedCount?: number
    responseTimeMs: number
  }) => {
    if (!session || !question || submitting || flash) return
    if (selectedOptionIndex != null) setSelected(selectedOptionIndex)
    setSubmitting(true)
    setFlash(null)
    setHeldLabel({ progressLabel: meta?.progressLabel, phase: meta?.phase })
    try {
      const res = (await api.learner.nextAdaptiveQuiz(lessonId, {
        session,
        selectedOptionIndex: selectedOptionIndex ?? placedCount ?? 0,
        placedCount,
        responseTimeMs,
      })) as {
        session: Record<string, unknown>
        question: AdaptiveQuestion | null
        meta: QuizMeta
        lastAnswer?: {
          correct: boolean
          correctAnswerIndex: number
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
          explanation: res.lastAnswer.explanation,
        })
      }

      setSession(res.session)
      setMeta(res.meta)

      const holdMs = res.meta?.done ? LAST_QUESTION_HOLD_MS : FEEDBACK_HOLD_MS
      await new Promise((r) => setTimeout(r, holdMs))

      if (res.meta?.done && res.review) {
        setMode('review')
        setReview(res.review)
        setQuestion(null)
        setHeldLabel(null)
        const pct = res.review.score?.percentage ?? 0
        const passing = Math.max(lesson.quiz?.passingScore || 60, 60)
        onSessionComplete?.(pct, pct >= passing, !!res.topicMastered)
      } else {
        setQuestion(res.question)
        setSelected(null)
        setFlash(null)
        setHeldLabel(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
      setSelected(null)
      setHeldLabel(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectAndSubmit = ({ optionIndex, responseTimeMs }: TapSelection) =>
    submitAnswer({ selectedOptionIndex: optionIndex, responseTimeMs })

  const handleSubmitDrag = (payload: { placedCount: number; responseTimeMs: number }) =>
    submitAnswer(payload)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-primary-700">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Preparing your quiz…</span>
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error}
      </p>
    )
  }

  if (mode === 'review' && review) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
              Review mode
            </h2>
            {review.score && (
              <span className="text-sm font-bold text-primary-700">
                Score: {review.score.correct}/{review.score.total} ({review.score.percentage}%)
                {typeof review.score.retryCount === 'number' && review.score.retryCount > 0
                  ? ` · ${review.score.retryCount} ${review.score.retryCount === 1 ? 'retry' : 'retries'}`
                  : ''}
              </span>
            )}
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all"
              style={{ width: `${reviewScorePct()}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
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
      <p className="text-sm text-slate-500">
        No quiz questions available.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
            Quiz: {lesson.quiz?.title || 'Practice'}
          </h2>
          <span className="text-xs font-semibold text-slate-600">
            {displayLabel || '…'}
          </span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div
            className={`h-full rounded-full transition-all ${
              displayPhase === 'retry'
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-primary-500 to-primary-600'
            }`}
            style={{ width: `${liveProgressPct()}%` }}
          />
        </div>
        {displayPhase === 'retry' && (
          <p className="mt-1 text-xs text-amber-700 font-semibold">
            Retry round — questions you missed
          </p>
        )}
      </div>

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
      />
    </div>
  )
}
