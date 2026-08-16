import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { ArrowLeft, Clock, BookOpen, Play, CheckCircle, Sparkles, TrendingUp, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import type { Lesson } from '@/types'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { LessonTeachingFromLesson } from '@/components/learner/LessonTeachingBlocks'
import { AdaptiveQuizPanel } from '@/components/learner/AdaptiveQuizPanel'
import { modalityLabel } from '@/lib/modalityQuiz'
import { QuestNextCard, type NextTaskResponse } from '@/components/learner/QuestNextCard'
import { usesQuestNavigation } from '@/lib/complexityBands'

export const LessonView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Quiz / adaptive session follow-up
  const [showResults, setShowResults] = useState(false)
  const [sessionPct, setSessionPct] = useState(0)
  const [similarLessons, setSimilarLessons] = useState<Lesson[]>([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [nextLessons, setNextLessons] = useState<Lesson[]>([])
  const [loadingNext, setLoadingNext] = useState(false)
  const [showRetakePrompt, setShowRetakePrompt] = useState(false)
  const [failedLessonId, setFailedLessonId] = useState<string | null>(null)
  const [failedLessonTitle, setFailedLessonTitle] = useState<string | null>(null)
  const [nextSubstrand, setNextSubstrand] = useState<{ id: string; name: string; subjectId?: string; strandId?: string } | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [canProceedToNextSubstrand, setCanProceedToNextSubstrand] = useState(false)
  const [missedSkills, setMissedSkills] = useState<
    { skillFocus: string; learningOutcomeKey: string; misconception: string | null; consecutiveFails: number }[]
  >([])
  const [scaffoldOffer, setScaffoldOffer] = useState<{
    needsScaffold: boolean
    targetGrade?: string
    lesson?: { id: string; title: string; grade: string; subjectId?: string; strandId?: string; subStrandId?: string } | null
  } | null>(null)
  const [preferredModality, setPreferredModality] = useState<string>('mixed')
  const [topicMastered, setTopicMastered] = useState(false)
  const [questNext, setQuestNext] = useState<NextTaskResponse | null>(null)
  const [loadingQuestNext, setLoadingQuestNext] = useState(false)

  const getFailedLessonKey = (key: string) => {
    const userId = user?.id || 'anonymous'
    return `${key}_${userId}`
  }

  const resolveDiagramUrl = useCallback(
    (briefId?: string | null) => {
      if (!lesson || !briefId) return null
      const briefs = lesson.visualBriefs || []
      const assets = lesson.visualAssets || []
      const images = lesson.images || []
      const byId = assets.find((a) => a.id === briefId)
      if (byId?.url) return byId.url
      const idx = briefs.findIndex((b) => b.id === briefId)
      if (idx >= 0) return assets[idx]?.url || images[idx] || null
      return null
    },
    [lesson]
  )

  const getPerformanceCategory = (percentage: number): 'below' | 'approaching' | 'meeting' | 'exceeding' => {
    if (percentage < 25) return 'below'
    if (percentage < 50) return 'approaching'
    if (percentage < 75) return 'meeting'
    return 'exceeding'
  }

  const getPerformanceMessage = (
    category: string,
    percentage: number,
    masteredTopic = false
  ) => {
    switch (category) {
      case 'below':
        return {
          title: 'Below Expectations',
          message: `You got ${percentage}%! Don't worry, everyone learns at their own pace. Let's try some easier exercises to help you understand better!`,
          color: 'from-red-50 to-orange-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          icon: <Sparkles className="w-6 h-6" />,
        }
      case 'approaching':
        return {
          title: 'Approaching Expectations',
          message: `Great effort! You got ${percentage}%. You're getting there! Try these practice exercises to help you master this topic.`,
          color: 'from-yellow-50 to-amber-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          icon: <TrendingUp className="w-6 h-6" />,
        }
      case 'meeting':
        return {
          title: 'Meeting Expectations',
          message: `Awesome work! You got ${percentage}%. You understand this topic well! Ready for the next challenge?`,
          color: 'from-primary-50 to-teal-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          icon: <CheckCircle className="w-6 h-6" />,
        }
      case 'exceeding':
        return {
          title: 'Exceeding Expectations',
          message: masteredTopic
            ? `Wow! You got ${percentage}%! You're doing amazing! You've mastered this topic. Let's move on to something new!`
            : `Wow! You got ${percentage}%! You're doing amazing! Keep practicing to lock in mastery. Let's move on to something new!`,
          color: 'from-emerald-50 to-teal-50',
          borderColor: 'border-emerald-200',
          textColor: 'text-emerald-700',
          icon: <Sparkles className="w-6 h-6" />,
        }
      default:
        return {
          title: 'Great Job!',
          message: `You got ${percentage}%!`,
          color: 'from-primary-50 to-primary-100',
          borderColor: 'border-primary-200',
          textColor: 'text-primary-700',
          icon: <CheckCircle className="w-6 h-6" />,
        }
    }
  }

  const loadNextLessons = async (lessonId: string) => {
    setLoadingNext(true)
    try {
      const nextData = await api.learner.getNextLessons(lessonId)
      setNextLessons(nextData.nextLessons || [])
      if (nextData.nextSubstrand) {
        localStorage.setItem('next_substrand_id', nextData.nextSubstrand.id)
        localStorage.setItem('next_substrand_name', nextData.nextSubstrand.name)
        if (nextData.nextSubstrand.subjectId) {
          localStorage.setItem('next_substrand_subject_id', nextData.nextSubstrand.subjectId)
        }
        if (nextData.nextSubstrand.strandId) {
          localStorage.setItem('next_substrand_strand_id', nextData.nextSubstrand.strandId)
        }
        setNextSubstrand({
          id: nextData.nextSubstrand.id,
          name: nextData.nextSubstrand.name,
          subjectId: nextData.nextSubstrand.subjectId,
          strandId: nextData.nextSubstrand.strandId,
        })
      } else {
        localStorage.removeItem('next_substrand_id')
        localStorage.removeItem('next_substrand_name')
        localStorage.removeItem('next_substrand_subject_id')
        localStorage.removeItem('next_substrand_strand_id')
        setNextSubstrand(null)
      }
      const count = nextData.completedCount || 0
      const canProceed = nextData.canProceedToNextSubstrand || false
      localStorage.setItem('substrand_completed_count', String(count))
      localStorage.setItem('can_proceed_to_next_substrand', String(canProceed))
      setCompletedCount(count)
      setCanProceedToNextSubstrand(canProceed)
    } catch (err) {
      console.error('Error loading next lessons:', err)
      setNextLessons([])
    } finally {
      setLoadingNext(false)
    }
  }

  const handleAdaptiveSessionComplete = async (
    pct: number,
    passed: boolean,
    masteredFromSession = false
  ) => {
    if (!lesson || !id) return
    setSessionPct(pct)
    setShowResults(true)
    setTopicMastered(!!masteredFromSession)

    try {
      const scaffold = (await api.learner.getScaffold(id)) as typeof scaffoldOffer
      if (scaffold?.needsScaffold) setScaffoldOffer(scaffold)
      else setScaffoldOffer(null)
    } catch {
      /* ignore */
    }

    try {
      const mastery = (await api.learner.getSkillMastery()) as Array<{
        skillFocus?: string
        learningOutcomeKey?: string
        status?: string
        consecutiveFailsAtLevel?: number
      }>
      // Only show skills that belong to THIS lesson's outcomes — the mastery
      // endpoint returns every skill the learner has ever attempted.
      const lessonOutcomeKeys = new Set(
        (lesson.quiz?.questions || [])
          .map((q) => q.learningOutcomeKey)
          .filter(Boolean) as string[]
      )
      const lessonSkillFoci = new Set(
        (lesson.quiz?.questions || [])
          .map((q) => (q.skillFocus || '').toLowerCase().trim())
          .filter(Boolean)
      )

      if (!masteredFromSession && lessonOutcomeKeys.size > 0) {
        const allMastered = [...lessonOutcomeKeys].every((k) =>
          (mastery || []).some((m) => m.learningOutcomeKey === k && m.status === 'mastered')
        )
        setTopicMastered(allMastered)
      }

      setMissedSkills(
        (mastery || [])
          .filter((m) => m.status === 'struggling' || m.status === 'scaffolding')
          .filter(
            (m) =>
              (m.learningOutcomeKey && lessonOutcomeKeys.has(m.learningOutcomeKey)) ||
              (m.skillFocus && lessonSkillFoci.has(m.skillFocus.toLowerCase().trim()))
          )
          .slice(0, 8)
          .map((m) => ({
            skillFocus: m.skillFocus || 'Skill',
            learningOutcomeKey: m.learningOutcomeKey || '',
            misconception: null,
            consecutiveFails: m.consecutiveFailsAtLevel || 0,
          }))
      )
    } catch {
      /* ignore */
    }

    const performanceCategory = getPerformanceCategory(pct)
    const questNav = usesQuestNavigation(lesson.grade)

    if (questNav) {
      setLoadingQuestNext(true)
      try {
        setQuestNext((await api.learner.getNextTask()) as NextTaskResponse)
      } catch {
        setQuestNext(null)
      } finally {
        setLoadingQuestNext(false)
      }
    } else if (passed && user?.id) {
      const storedFailed = localStorage.getItem(getFailedLessonKey('failed_lesson_id'))
      if (storedFailed === id) {
        localStorage.removeItem(getFailedLessonKey('failed_lesson_id'))
        localStorage.removeItem(getFailedLessonKey('failed_lesson_title'))
        localStorage.removeItem(getFailedLessonKey('failed_lesson_subject_id'))
      }
      const otherFailed = localStorage.getItem(getFailedLessonKey('failed_lesson_id'))
      const otherSubject = localStorage.getItem(getFailedLessonKey('failed_lesson_subject_id'))
      const otherTitle = localStorage.getItem(getFailedLessonKey('failed_lesson_title'))
      if (otherFailed && otherFailed !== id && lesson.subjectId === otherSubject && otherTitle) {
        setShowRetakePrompt(true)
        setFailedLessonId(otherFailed)
        setFailedLessonTitle(otherTitle)
      } else if (performanceCategory === 'meeting' || performanceCategory === 'exceeding') {
        await loadNextLessons(id)
      } else {
        setLoadingSimilar(true)
        try {
          setSimilarLessons(await api.learner.getSimilarLessons(id))
        } catch (err) {
          console.error('Error loading similar lessons:', err)
        } finally {
          setLoadingSimilar(false)
        }
      }
    } else {
      const userGrade = useAuthStore.getState().user?.grade
      if (userGrade && lesson.grade === userGrade && user?.id) {
        localStorage.setItem(getFailedLessonKey('failed_lesson_id'), id)
        localStorage.setItem(getFailedLessonKey('failed_lesson_title'), lesson.title)
        localStorage.setItem(getFailedLessonKey('failed_lesson_subject_id'), lesson.subjectId || '')
        setFailedLessonId(id)
        setFailedLessonTitle(lesson.title)
      }
      setLoadingSimilar(true)
      try {
        setSimilarLessons(await api.learner.getSimilarLessons(id))
      } catch (err) {
        console.error('Error loading similar lessons:', err)
      } finally {
        setLoadingSimilar(false)
      }
    }
  }

  useEffect(() => {
    const fetchLesson = async () => {
      if (!id) {
        setError('Lesson ID is required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        setShowResults(false)
        setSessionPct(0)
        setTopicMastered(false)
        const lessonData = (await api.learner.getLesson(id)) as Lesson & {
          isCompleted?: boolean
          progress?: number
        }
        setLesson(lessonData)
        if (lessonData.isCompleted || (lessonData.progress != null && lessonData.progress >= 60)) {
          setShowResults(true)
          setSessionPct(lessonData.progress || 100)
          try {
            const mastery = (await api.learner.getSkillMastery()) as Array<{
              learningOutcomeKey?: string
              status?: string
            }>
            const keys = new Set(
              (lessonData.quiz?.questions || [])
                .map((q) => q.learningOutcomeKey)
                .filter(Boolean) as string[]
            )
            if (keys.size > 0) {
              setTopicMastered(
                [...keys].every((k) =>
                  (mastery || []).some((m) => m.learningOutcomeKey === k && m.status === 'mastered')
                )
              )
            }
          } catch {
            /* ignore */
          }
        }
        try {
          const profile = (await api.learner.getProfile()) as { preferredModality?: string }
          if (profile?.preferredModality) setPreferredModality(profile.preferredModality)
        } catch {
          /* ignore */
        }
      } catch (err: any) {
        console.error('Error fetching lesson:', err)
        setError(err.message || 'Failed to load lesson')
      } finally {
        setLoading(false)
      }
    }

    fetchLesson()

    if (user?.id) {
      const storedFailedLessonId = localStorage.getItem(getFailedLessonKey('failed_lesson_id'))
      const storedFailedLessonTitle = localStorage.getItem(getFailedLessonKey('failed_lesson_title'))
      if (storedFailedLessonId && storedFailedLessonTitle) {
        setFailedLessonId(storedFailedLessonId)
        setFailedLessonTitle(storedFailedLessonTitle)
      }
    }
  }, [id, user?.id])

  if (loading) {
    return (
      <div className="min-h-screen premium-mesh flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-[32px] border-2 border-slate-200 p-8 text-center max-w-md">
          <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto">
            <LazyLottie animationKey="loading" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen premium-mesh flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-[32px] border-2 border-slate-200 p-8 text-center max-w-md">
          <h1 className="text-3xl font-black text-[#0F172A] mb-4">
            {error ? 'Error' : 'Lesson Not Found'}
          </h1>
          <p className="text-text-secondary mb-6"  >
            {error || 'The lesson you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <Link 
            to="/learner" 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all"
             
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const quizScore = showResults ? { percentage: sessionPct, score: 0, total: 0 } : null
  const performanceCategory = quizScore ? getPerformanceCategory(quizScore.percentage) : null
  const performanceMessage = performanceCategory
    ? getPerformanceMessage(performanceCategory, quizScore!.percentage, topicMastered)
    : null
  const questNav = usesQuestNavigation(lesson.grade)

  return (
    <div className="min-h-screen premium-mesh">
      <div className="p-[5px] pt-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
          <StaggeredEntry>
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => (questNav ? navigate('/learner') : navigate(-1))}
                className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border-2 border-slate-200 hover:bg-white transition-all text-sm font-semibold text-slate-700"
                 
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(2px) scale(0.98)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = ''
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = ''
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] mb-4">
                  {lesson.title}
                </h1>
                <p className="text-lg sm:text-xl text-text-secondary mb-6"  >
                  {lesson.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mb-6"  >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Grade {lesson.grade}</span>
                  </div>
                  <span>•</span>
                  <span className="capitalize px-3 py-1 bg-primary-100 text-primary-700 rounded-full font-semibold">
                    {lesson.difficulty}
                  </span>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{lesson.duration} minutes</span>
                  </div>
                  <span>•</span>
                  <span className="capitalize">{lesson.contentType}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {lesson.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="px-3 py-1 text-xs bg-gradient-to-r from-primary-100 to-primary-50 text-primary-700 rounded-full font-semibold"
                       
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-6 sm:p-8">
                {preferredModality && preferredModality !== 'mixed' && (
                  <p className="text-xs font-semibold text-primary-700 mb-4"  >
                    Practice mode: {modalityLabel(preferredModality)}. Questions mix styles; we lean
                    toward what has worked for you on this topic
                  </p>
                )}

                {lesson.contentType === 'video' && lesson.videoUrl ? (
                  <div className="aspect-video bg-slate-100 rounded-[16px] flex items-center justify-center mb-6">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-600 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white fill-current" />
                      </div>
                      <p className="text-lg font-semibold text-slate-700 mb-2"  >
                        Video Lesson
                      </p>
                      <p className="text-sm text-text-secondary"  >
                        Video player will be integrated with backend
                      </p>
                      <p className="text-xs text-text-secondary mt-2"  >
                        URL: {lesson.videoUrl}
                      </p>
                    </div>
                  </div>
                ) : lesson.content || (lesson.contentBlocks && lesson.contentBlocks.length > 0) ? (
                  <LessonTeachingFromLesson
                    lesson={lesson}
                    showDiagrams={
                      preferredModality === 'visual' ||
                      preferredModality === 'mixed' ||
                      preferredModality === 'text_steps' ||
                      Boolean(lesson.images?.length)
                    }
                  />
                ) : (
                  <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-[16px] p-8 sm:p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-600 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-lg font-semibold text-slate-700 mb-2"  >
                      Interactive Content
                    </p>
                    <p className="text-sm text-text-secondary"  >
                      Interactive content will be displayed here
                    </p>
                  </div>
                )}

                {/* Quiz Section — live one-by-one; review = all answers at once */}
                {lesson.quiz &&
                  ((lesson.quiz.questionCount ?? lesson.quiz.questions?.length) || 0) > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-200 space-y-6">
                    <AdaptiveQuizPanel
                      lesson={lesson as Lesson & { isCompleted?: boolean; progress?: number }}
                      lessonId={id!}
                      preferredModality={preferredModality}
                      resolveDiagramUrl={resolveDiagramUrl}
                      onSessionComplete={handleAdaptiveSessionComplete}
                    />

                    {showResults && performanceMessage && (
                      <div className="space-y-6">
                        <div className={`p-6 rounded-[16px] bg-gradient-to-br ${performanceMessage.color} border-2 ${performanceMessage.borderColor}`}>
                          <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 ${performanceMessage.textColor}`}>
                              {performanceMessage.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className={`text-2xl font-black ${performanceMessage.textColor} mb-2`}>
                                {performanceMessage.title} {sessionPct}%
                              </h3>
                              <p className="text-base mb-2"  >
                                {performanceMessage.message}
                              </p>
                              <p className="text-sm text-slate-600"  >
                                Scroll up to see every question and your choices in review mode.
                              </p>
                            </div>
                          </div>
                        </div>

                        {missedSkills.length > 0 && (
                          <div className="p-5 rounded-[16px] bg-amber-50 border-2 border-amber-200">
                            <h4 className="text-lg font-bold text-amber-900 mb-2"  >
                              Skills to practice
                            </h4>
                            <ul className="space-y-2">
                              {missedSkills.map((skill) => (
                                <li
                                  key={skill.learningOutcomeKey || skill.skillFocus}
                                  className="text-sm text-amber-900"
                                   
                                >
                                  <span className="font-semibold">{skill.skillFocus || 'Skill'}</span>
                                  {skill.consecutiveFails >= 2 ? ' (we will scaffold this down a grade)' : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {scaffoldOffer?.needsScaffold && scaffoldOffer.lesson && (
                          <div className="p-5 rounded-[16px] bg-emerald-50 border-2 border-emerald-200">
                            <h4 className="text-lg font-bold text-emerald-900 mb-2"  >
                              Confidence builder (Grade {scaffoldOffer.lesson.grade})
                            </h4>
                            <p className="text-sm text-emerald-800 mb-3"  >
                              You missed this skill twice at your grade. Try this lower-grade lesson next, then come back stronger.
                            </p>
                            <Link
                              to={`/learner/lessons/${scaffoldOffer.lesson.id}`}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm"
                               
                            >
                              <Play className="w-4 h-4" />
                              Open: {scaffoldOffer.lesson.title}
                            </Link>
                          </div>
                        )}

                        {questNav && (
                          <QuestNextCard data={questNext} loading={loadingQuestNext} />
                        )}

                        {!questNav &&
                          (performanceCategory === 'below' ||
                            performanceCategory === 'approaching' ||
                            (quizScore && quizScore.percentage < 60)) && (
                          <div className="space-y-4">
                            <h4 className="text-lg font-bold text-[#0F172A]"  >
                              Practice from a lower grade
                            </h4>
                            {loadingSimilar ? (
                              <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto">
                                  <LazyLottie animationKey="loading" style={{ width: '100%', height: '100%' }} />
                                </div>
                              </div>
                            ) : similarLessons.length > 0 ? (
                              <div className="space-y-3">
                                {similarLessons.map((similarLesson) => (
                                  <Link
                                    key={similarLesson.id}
                                    to={`/learner/lessons/${similarLesson.id}`}
                                    className="block p-4 rounded-[12px] bg-white border-2 border-slate-200 hover:border-primary-300 hover:shadow-md transition-all"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br bg-primary-600 flex items-center justify-center flex-shrink-0">
                                        <Play className="w-5 h-5 text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <h5 className="font-bold text-[#0F172A] mb-1"  >
                                          {similarLesson.title}
                                        </h5>
                                        <p className="text-sm text-text-secondary"  >
                                          Grade {similarLesson.grade} • {similarLesson.difficulty}
                                        </p>
                                      </div>
                                      <Play className="w-5 h-5 text-primary-700" />
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 rounded-[12px] bg-slate-50 border-2 border-slate-200">
                                <p className="text-sm text-text-secondary"  >
                                  No practice exercises available at the moment. Keep practicing with what you have!
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {showRetakePrompt && failedLessonId && failedLessonTitle && (
                          <div className="p-6 rounded-[16px] bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 text-amber-600">
                                <AlertCircle className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-lg font-bold text-amber-800 mb-2"  >
                                  Great Progress!
                                </h4>
                                <p className="text-base mb-4"  >
                                  You've completed the practice exercise! Now retake the lesson you struggled with earlier.
                                  You need to score at least 60% to proceed.
                                </p>
                                <Link
                                  to={`/learner/lessons/${failedLessonId}`}
                                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-all"
                                   
                                >
                                  <BookOpen className="w-5 h-5" />
                                  Retake: {failedLessonTitle}
                                </Link>
                              </div>
                            </div>
                          </div>
                        )}

                        {!questNav &&
                          (performanceCategory === 'meeting' || performanceCategory === 'exceeding') &&
                          !showRetakePrompt && (
                          <div className="space-y-4">
                            <h4 className="text-lg font-bold text-[#0F172A]"  >
                              What's Next?
                            </h4>
                            {loadingNext ? (
                              <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto">
                                  <LazyLottie animationKey="loading" style={{ width: '100%', height: '100%' }} />
                                </div>
                              </div>
                            ) : nextLessons.length > 0 ? (
                              <>
                                <p className="text-sm text-text-secondary mb-3"  >
                                  Continue with more lessons in this topic:
                                </p>
                                <div className="space-y-3">
                                  {nextLessons.map((nextLesson) => (
                                    <Link
                                      key={nextLesson.id}
                                      to={`/learner/lessons/${nextLesson.id}`}
                                      className="block p-4 rounded-[12px] bg-white border-2 border-slate-200 hover:border-primary-300 hover:shadow-md transition-all"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                          <Play className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                          <h5 className="font-bold text-[#0F172A] mb-1"  >
                                            {nextLesson.title}
                                          </h5>
                                          <p className="text-sm text-text-secondary"  >
                                            {nextLesson.description || 'Continue learning'}
                                          </p>
                                        </div>
                                        <ArrowLeft className="w-5 h-5 text-emerald-600 rotate-180" />
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                                {canProceedToNextSubstrand && nextSubstrand && (
                                  <div className="mt-4 p-4 rounded-[12px] bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                                    <p className="text-sm font-semibold text-amber-800 mb-2"  >
                                      Great progress! You've completed {completedCount} lessons in this topic.
                                    </p>
                                    <p className="text-sm text-amber-700 mb-3"  >
                                      You can now move on to the next topic: <strong>{nextSubstrand.name}</strong>
                                    </p>
                                    <Link
                                      to={
                                        nextSubstrand.subjectId && nextSubstrand.strandId
                                          ? `/learner/lessons?subject=${nextSubstrand.subjectId}&strand=${nextSubstrand.strandId}&substrand=${nextSubstrand.id}`
                                          : `/learner/lessons?substrand=${nextSubstrand.id}`
                                      }
                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-all"
                                       
                                    >
                                      <ArrowLeft className="w-4 h-4 rotate-180" />
                                      Go to Next Topic
                                    </Link>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="p-6 rounded-[12px] bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
                                <p className="text-base mb-2"  >
                                  {canProceedToNextSubstrand && nextSubstrand ? (
                                    <>
                                      Amazing work! You've completed all available lessons in this topic.
                                      {completedCount >= 3 && (
                                        <> You can now move on to the next topic: <strong>{nextSubstrand.name}</strong></>
                                      )}
                                    </>
                                  ) : (
                                    "Great job! You've completed all available lessons in this topic. Take a break and explore other subjects!"
                                  )}
                                </p>
                                {canProceedToNextSubstrand && nextSubstrand ? (
                                  <Link
                                    to={
                                      nextSubstrand.subjectId && nextSubstrand.strandId
                                        ? `/learner/lessons?subject=${nextSubstrand.subjectId}&strand=${nextSubstrand.strandId}&substrand=${nextSubstrand.id}`
                                        : `/learner/lessons?substrand=${nextSubstrand.id}`
                                    }
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all mt-3"
                                     
                                  >
                                    <ArrowLeft className="w-4 h-4 rotate-180" />
                                    Go to Next Topic: {nextSubstrand.name}
                                  </Link>
                                ) : (
                                  <Link
                                    to="/learner"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all mt-3"
                                     
                                  >
                                    <BookOpen className="w-4 h-4" />
                                    Explore Other Subjects
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}
