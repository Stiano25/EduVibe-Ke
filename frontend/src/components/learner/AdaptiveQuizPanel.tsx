import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { modalityLabel } from '@/lib/modalityQuiz'
import { MathText } from '@/components/ui/MathText'
import { TapSelectOptions, type TapSelection } from './TapSelectOptions'
import type { Lesson } from '@/types'

type AdaptiveQuestion = {
  id: string
  question: string
  options: string[]
  points?: number
  skillFocus?: string
  bloomLevel?: string
  modality?: string
  diagramBriefId?: string | null
  steps?: string[]
  learningOutcomeIndex?: number
}

type ReviewItem = {
  id: string
  question: string
  options: string[]
  correctAnswerIndex: number
  selectedOptionIndex: number
  correct: boolean
  explanation?: string
  optionExplanations?: string[]
  modality?: string
  steps?: string[]
  diagramBriefId?: string | null
  skillFocus?: string
  bloomLevel?: string
  phase?: string
}

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
  const [meta, setMeta] = useState<{
    progressLabel?: string
    phase?: string
    mainAnswered?: number
    mainTarget?: number
    done?: boolean
    score?: { correct: number; total: number; percentage: number; retryCount?: number }
    modalitySignal?: { source?: string; modality?: string | null }
  } | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [flash, setFlash] = useState<{
    correct: boolean
    correctAnswerIndex?: number
    explanation?: string
  } | null>(null)
  const [review, setReview] = useState<ReviewPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          meta?: typeof meta
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

  const progressPct = () => {
    if (mode === 'review' && review?.score) return review.score.percentage
    if (meta?.score) return meta.score.percentage
    if (meta?.mainTarget && meta.mainAnswered != null) {
      const base = meta.mainTarget
      return Math.min(100, Math.round(((meta.mainAnswered || 0) / Math.max(base, 1)) * 100))
    }
    return lesson.progress || 0
  }

  /** Tap an option → submit immediately (no separate Submit button). */
  const handleSelectAndSubmit = async ({
    optionIndex,
    responseTimeMs,
  }: TapSelection) => {
    if (!session || !question || submitting || flash) return
    setSelected(optionIndex)
    setSubmitting(true)
    setFlash(null)
    try {
      const res = (await api.learner.nextAdaptiveQuiz(lessonId, {
        session,
        selectedOptionIndex: optionIndex,
        responseTimeMs,
      })) as {
        session: Record<string, unknown>
        question: AdaptiveQuestion | null
        meta: typeof meta
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

      if (res.meta?.done && res.review) {
        setMode('review')
        setReview(res.review)
        setQuestion(null)
        const pct = res.review.score?.percentage ?? 0
        const passing = Math.max(lesson.quiz?.passingScore || 60, 60)
        onSessionComplete?.(pct, pct >= passing, !!res.topicMastered)
      } else {
        await new Promise((r) => setTimeout(r, 650))
        setQuestion(res.question)
        setSelected(null)
        setFlash(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
      setSelected(null)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-primary-700">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span  >Preparing your quiz…</span>
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-red-600"  >
        {error}
      </p>
    )
  }

  // ——— REVIEW MODE: all answers at once ———
  if (mode === 'review' && review) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2
              className="text-2xl sm:text-3xl font-black text-[#0F172A]"
             
            >
              Review mode
            </h2>
            {review.score && (
              <span
                className="text-sm font-bold text-primary-700"
                 
              >
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
              style={{ width: `${progressPct()}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500"  >
            Your choices and corrections for this lesson. Read-only.
          </p>
        </div>

        <div className="space-y-4">
          {review.items.map((item, i) => (
            <div
              key={item.id}
              className={`p-5 rounded-[16px] border-2 ${
                item.correct ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className="text-xs font-bold text-slate-600"
                   
                >
                  Q{i + 1}
                </span>
                {item.modality && (
                  <span
                    className="px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-800 rounded-full"
                     
                  >
                    {modalityLabel(item.modality)}
                  </span>
                )}
                {item.correct ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle className="w-3.5 h-3.5" /> Correct
                  </span>
                ) : (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                    <XCircle className="w-3.5 h-3.5" /> Incorrect
                  </span>
                )}
              </div>

              {item.steps && item.steps.length > 0 && (
                <ol className="mb-3 list-decimal pl-5 text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-[12px] p-3 space-y-1">
                  {item.steps.map((s, si) => (
                    <li key={si}  >
                      <MathText text={s} />
                    </li>
                  ))}
                </ol>
              )}

              {item.diagramBriefId && resolveDiagramUrl?.(item.diagramBriefId) && (
                <img
                  src={resolveDiagramUrl(item.diagramBriefId)!}
                  alt=""
                  className="mb-3 max-h-48 mx-auto rounded-[12px] border border-slate-200"
                />
              )}

              <MathText
                as="p"
                text={item.question}
                className="text-base font-semibold text-[#0F172A] mb-3"
              />

              <div className="space-y-2">
                {item.options.map((opt, oi) => {
                  const isSelected = oi === item.selectedOptionIndex
                  const isCorrectOpt = oi === item.correctAnswerIndex
                  return (
                    <div
                      key={oi}
                      className={`p-3 rounded-[12px] border-2 text-sm ${
                        isCorrectOpt
                          ? 'bg-emerald-100 border-emerald-400'
                          : isSelected
                            ? 'bg-red-100 border-red-400'
                            : 'bg-white border-slate-200'
                      }`}
                       
                    >
                      <span className="font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span>
                      <MathText text={opt} />
                      {isSelected && !isCorrectOpt && (
                        <span className="ml-2 text-[10px] font-bold text-red-700">Your answer</span>
                      )}
                      {isCorrectOpt && (
                        <span className="ml-2 text-[10px] font-bold text-emerald-700">Correct</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {item.explanation && (
                <p
                  className="mt-3 text-xs text-slate-700 whitespace-pre-line bg-white/70 rounded-[10px] p-3 border border-slate-200"
                   
                >
                  <MathText text={item.explanation} />
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ——— LIVE one-by-one ———
  if (!question) {
    return (
      <p className="text-sm text-slate-500"  >
        No quiz questions available.
      </p>
    )
  }

  const diagramUrl = resolveDiagramUrl?.(question.diagramBriefId)

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2
            className="text-2xl sm:text-3xl font-black text-[#0F172A]"
           
          >
            Quiz: {lesson.quiz?.title || 'Practice'}
          </h2>
          <span className="text-xs font-semibold text-slate-600"  >
            {meta?.progressLabel || '…'}
          </span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div
            className={`h-full rounded-full transition-all ${
              meta?.phase === 'retry'
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-primary-500 to-primary-600'
            }`}
            style={{
              width: `${
                meta?.phase === 'retry'
                  ? 85
                  : Math.min(
                      95,
                      Math.round(
                        (((meta?.mainAnswered || 0) + (selected != null ? 0.3 : 0)) /
                          Math.max(meta?.mainTarget || 10, 1)) *
                          100
                      )
                    )
              }%`,
            }}
          />
        </div>
        {meta?.phase === 'retry' && (
          <p className="mt-1 text-xs text-amber-700 font-semibold"  >
            Retry round — questions you missed
          </p>
        )}
      </div>

      <div className="p-5 rounded-[16px] border-2 border-slate-200 bg-white space-y-3">
        <div className="flex flex-wrap gap-2">
          {question.modality && (
            <span
              className="px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-800 rounded-full"
               
            >
              {modalityLabel(question.modality)}
            </span>
          )}
          {question.bloomLevel && (
            <span
              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full capitalize"
               
            >
              {question.bloomLevel}
            </span>
          )}
        </div>

        {question.steps && question.steps.length > 0 && (
          <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-[12px] p-3">
            {question.steps.map((s, i) => (
              <li key={i}  >
                <MathText text={s} />
              </li>
            ))}
          </ol>
        )}

        {diagramUrl && (
          <img
            src={diagramUrl}
            alt=""
            className="max-h-52 mx-auto rounded-[12px] border border-violet-100"
          />
        )}

        <MathText
          as="p"
          text={question.question}
          className="text-lg font-bold text-[#0F172A]"
        />

        <TapSelectOptions
          questionKey={question.id}
          options={question.options}
          selectedIndex={selected}
          disabled={submitting || !!flash}
          feedback={flash}
          onSelect={handleSelectAndSubmit}
        />

        {flash && !flash.correct && flash.correctAnswerIndex != null && (
          <p className="text-xs text-emerald-800"  >
            Correct answer: {String.fromCharCode(65 + flash.correctAnswerIndex)}.{' '}
            {flash.explanation ? <MathText text={flash.explanation} /> : null}
          </p>
        )}

        {submitting && !flash && (
          <p
            className="text-xs text-primary-700 flex items-center gap-1.5"
             
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Checking…
          </p>
        )}
      </div>
    </div>
  )
}
