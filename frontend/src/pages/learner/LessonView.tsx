import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { ArrowLeft, Clock, BookOpen, Play, CheckCircle, XCircle, Sparkles, TrendingUp, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import type { Lesson, QuizQuestion } from '@/types'
// @ts-ignore - lottie-react types
import Lottie from 'lottie-react'
// @ts-ignore - JSON imports for animations
import loadingAnimation from '@/animations/loading.json'
// @ts-ignore - JSON imports for animations
import flirtingDogAnimation from '@/animations/Flirting Dog.json'
import { LessonContentRenderer } from '@/components/learner/LessonContentRenderer'

export const LessonView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: string]: number }>({})
  const [showResults, setShowResults] = useState(false)
  const [quizResults, setQuizResults] = useState<{ [questionId: string]: boolean }>({})
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
  const [showUnansweredTooltip, setShowUnansweredTooltip] = useState(false)

  // Helper function to get user-scoped localStorage keys
  const getStorageKey = (key: string) => {
    const userId = user?.id || 'anonymous'
    return `${key}_${userId}_${id}`
  }

  // Helper function to get user-scoped failed lesson keys
  const getFailedLessonKey = (key: string) => {
    const userId = user?.id || 'anonymous'
    return `${key}_${userId}`
  }

  // Restore quiz state from localStorage on mount, clear when lesson changes
  useEffect(() => {
    if (id && user?.id) {
      // Check if this is a retake of a failed lesson - if so, clear all saved state
      const failedLessonId = localStorage.getItem(getFailedLessonKey('failed_lesson_id'))
      const isRetaking = failedLessonId === id
      
      if (isRetaking) {
        // Clear all saved quiz state for retake
        localStorage.removeItem(getStorageKey('quiz_answers'))
        localStorage.removeItem(getStorageKey('quiz_results'))
        localStorage.removeItem(getStorageKey('quiz_show_results'))
        setSelectedAnswers({})
        setQuizResults({})
        setShowResults(false)
      } else {
        // Normal restore - load saved state if available (scoped to current user)
        const savedAnswers = localStorage.getItem(getStorageKey('quiz_answers'))
        const savedResults = localStorage.getItem(getStorageKey('quiz_results'))
        const savedShowResults = localStorage.getItem(getStorageKey('quiz_show_results'))
        
        if (savedAnswers) {
          try {
            setSelectedAnswers(JSON.parse(savedAnswers))
          } catch (e) {
            console.error('Error restoring quiz answers:', e)
            setSelectedAnswers({})
          }
        } else {
          setSelectedAnswers({})
        }
        
        if (savedResults) {
          try {
            setQuizResults(JSON.parse(savedResults))
          } catch (e) {
            console.error('Error restoring quiz results:', e)
            setQuizResults({})
          }
        } else {
          setQuizResults({})
        }
        
        if (savedShowResults === 'true') {
          setShowResults(true)
        } else {
          setShowResults(false)
        }
      }
    } else {
      // Clear state if no lesson ID or user
      setSelectedAnswers({})
      setQuizResults({})
      setShowResults(false)
    }
  }, [id, user?.id])

  // Save quiz state to localStorage whenever it changes (scoped to current user)
  useEffect(() => {
    if (id && user?.id) {
      if (Object.keys(selectedAnswers).length > 0) {
        localStorage.setItem(getStorageKey('quiz_answers'), JSON.stringify(selectedAnswers))
      }
      if (Object.keys(quizResults).length > 0) {
        localStorage.setItem(getStorageKey('quiz_results'), JSON.stringify(quizResults))
      }
      localStorage.setItem(getStorageKey('quiz_show_results'), showResults.toString())
    }
  }, [selectedAnswers, quizResults, showResults, id, user?.id])

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
        // Fetch lesson from API - we'll need to add this endpoint or use existing one
        // For now, let's try to get it from the learner lessons endpoint
        // We might need to create a new endpoint to get a single lesson
        const lessonData = await api.admin.getLesson(id)
        setLesson(lessonData)
      } catch (err: any) {
        console.error('Error fetching lesson:', err)
        setError(err.message || 'Failed to load lesson')
      } finally {
        setLoading(false)
      }
    }

    fetchLesson()
    
    // Check for failed lesson on mount (user-scoped)
    if (user?.id) {
      const storedFailedLessonId = localStorage.getItem(getFailedLessonKey('failed_lesson_id'))
      const storedFailedLessonTitle = localStorage.getItem(getFailedLessonKey('failed_lesson_title'))
      if (storedFailedLessonId && storedFailedLessonTitle) {
        setFailedLessonId(storedFailedLessonId)
        setFailedLessonTitle(storedFailedLessonTitle)
      }
    }
  }, [id, user?.id])

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    if (showResults) return // Don't allow changes after showing results
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }))
  }

  const handleSubmitQuiz = async () => {
    if (!lesson?.quiz) return

    const results: { [questionId: string]: boolean } = {}
    lesson.quiz.questions.forEach((question, index) => {
      // Use question.id if available, otherwise use index as fallback
      const questionKey = question.id || `question-${index}`
      const selectedAnswer = selectedAnswers[questionKey]
      results[questionKey] = selectedAnswer === question.correctAnswerIndex
    })

    setQuizResults(results)
    setShowResults(true)
    
    // Save to localStorage immediately (user-scoped)
    if (id && user?.id) {
      localStorage.setItem(getStorageKey('quiz_results'), JSON.stringify(results))
      localStorage.setItem(getStorageKey('quiz_show_results'), 'true')
    }

    // Calculate score using the results directly
    const score = calculateQuizScore(results)
    
    // Minimum passing score is 60%
    const passingScore = Math.max(lesson.quiz.passingScore || 60, 60)
    const passed = score.percentage >= passingScore
    
    // Auto-complete lesson if passed (60% or more)
    if (passed && id) {
      try {
        await api.learner.completeLesson(id)
        // Update progress to 100%
        await api.learner.updateLessonProgress(id, 100)
        
        // Clear failed lesson if this was the failed lesson (user-scoped)
        if (user?.id) {
          const failedLessonId = localStorage.getItem(getFailedLessonKey('failed_lesson_id'))
          if (failedLessonId === id) {
            localStorage.removeItem(getFailedLessonKey('failed_lesson_id'))
            localStorage.removeItem(getFailedLessonKey('failed_lesson_title'))
            localStorage.removeItem(getFailedLessonKey('failed_lesson_subject_id'))
          }
          
          // Check if this is a lower grade lesson and user has a failed lesson in the SAME SUBJECT
          const storedFailedLessonId = localStorage.getItem(getFailedLessonKey('failed_lesson_id'))
          const storedFailedLessonSubjectId = localStorage.getItem(getFailedLessonKey('failed_lesson_subject_id'))
          if (storedFailedLessonId && storedFailedLessonId !== id && lesson.subjectId === storedFailedLessonSubjectId) {
            // User passed a lower grade lesson in the same subject, prompt to retake failed lesson
            setShowRetakePrompt(true)
          }
        }
      } catch (err) {
        console.error('Error completing lesson:', err)
      }
    } else if (id) {
      // Failed - score is less than 60%
      // Store this as the failed lesson if it's from the user's current grade (user-scoped)
      const userGrade = useAuthStore.getState().user?.grade
      if (userGrade && lesson.grade === userGrade && user?.id) {
        localStorage.setItem(getFailedLessonKey('failed_lesson_id'), id)
        localStorage.setItem(getFailedLessonKey('failed_lesson_title'), lesson.title)
        localStorage.setItem(getFailedLessonKey('failed_lesson_subject_id'), lesson.subjectId || '')
      }
      
      // Update progress based on score
      try {
        await api.learner.updateLessonProgress(id, score.percentage)
      } catch (err) {
        console.error('Error updating progress:', err)
      }
    }

    // Load recommendations based on performance
    const performanceCategory = getPerformanceCategory(score.percentage)
    
    // Only allow progression if score is 60% or more
    if (score.percentage < 60) {
      // Failed - score is less than 60%
      // Store this as the failed lesson if it's from the user's current grade (user-scoped)
      const userGrade = useAuthStore.getState().user?.grade
      if (userGrade && lesson.grade === userGrade && id && user?.id) {
        localStorage.setItem(getFailedLessonKey('failed_lesson_id'), id)
        localStorage.setItem(getFailedLessonKey('failed_lesson_title'), lesson.title)
        localStorage.setItem(getFailedLessonKey('failed_lesson_subject_id'), lesson.subjectId || '')
        setFailedLessonId(id)
        setFailedLessonTitle(lesson.title)
      }
      
      // Load similar lessons from lower grades for remediation
      if (id) {
        setLoadingSimilar(true)
        try {
          const similar = await api.learner.getSimilarLessons(id)
          setSimilarLessons(similar)
        } catch (err) {
          console.error('Error loading similar lessons:', err)
        } finally {
          setLoadingSimilar(false)
        }
      }
    } else if (performanceCategory === 'below' || performanceCategory === 'approaching') {
      // Score is 60%+ but still below expectations - load similar lessons
      if (id) {
        setLoadingSimilar(true)
        try {
          const similar = await api.learner.getSimilarLessons(id)
          setSimilarLessons(similar)
        } catch (err) {
          console.error('Error loading similar lessons:', err)
        } finally {
          setLoadingSimilar(false)
        }
      }
    } else {
      // Meeting or exceeding - check if this is a lower grade lesson and user has a failed lesson in the SAME SUBJECT (user-scoped)
      if (user?.id) {
        const storedFailedLessonId = localStorage.getItem(getFailedLessonKey('failed_lesson_id'))
        const storedFailedLessonTitle = localStorage.getItem(getFailedLessonKey('failed_lesson_title'))
        const storedFailedLessonSubjectId = localStorage.getItem(getFailedLessonKey('failed_lesson_subject_id'))
        
        if (storedFailedLessonId && storedFailedLessonTitle && storedFailedLessonId !== id && lesson.subjectId === storedFailedLessonSubjectId) {
          // User passed a lower grade lesson in the same subject, prompt to retake failed lesson
          setShowRetakePrompt(true)
          setFailedLessonId(storedFailedLessonId)
          setFailedLessonTitle(storedFailedLessonTitle)
        } else {
          // Load next lessons in same sub-strand
          if (id) {
            setLoadingNext(true)
            try {
              const nextData = await api.learner.getNextLessons(id)
              setNextLessons(nextData.nextLessons || [])
            // Store next sub-strand info if available
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
                strandId: nextData.nextSubstrand.strandId
              })
            } else {
              localStorage.removeItem('next_substrand_id')
              localStorage.removeItem('next_substrand_name')
              localStorage.removeItem('next_substrand_subject_id')
              localStorage.removeItem('next_substrand_strand_id')
              setNextSubstrand(null)
            }
            // Store completion count
            const completedCount = nextData.completedCount || 0
            const canProceed = nextData.canProceedToNextSubstrand || false
            localStorage.setItem('substrand_completed_count', String(completedCount))
            localStorage.setItem('can_proceed_to_next_substrand', String(canProceed))
            setCompletedCount(completedCount)
            setCanProceedToNextSubstrand(canProceed)
          } catch (err) {
            console.error('Error loading next lessons:', err)
            setNextLessons([])
          } finally {
            setLoadingNext(false)
          }
        }
      }
      } else {
        // No user ID - load next lessons anyway
        if (id) {
          setLoadingNext(true)
          try {
            const nextData = await api.learner.getNextLessons(id)
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
                strandId: nextData.nextSubstrand.strandId
              })
            } else {
              localStorage.removeItem('next_substrand_id')
              localStorage.removeItem('next_substrand_name')
              localStorage.removeItem('next_substrand_subject_id')
              localStorage.removeItem('next_substrand_strand_id')
              setNextSubstrand(null)
            }
            const completedCount = nextData.completedCount || 0
            const canProceed = nextData.canProceedToNextSubstrand || false
            localStorage.setItem('substrand_completed_count', String(completedCount))
            localStorage.setItem('can_proceed_to_next_substrand', String(canProceed))
            setCompletedCount(completedCount)
            setCanProceedToNextSubstrand(canProceed)
          } catch (err) {
            console.error('Error loading next lessons:', err)
            setNextLessons([])
          } finally {
            setLoadingNext(false)
          }
        }
      }
    }
  }

  const calculateQuizScore = (results?: { [questionId: string]: boolean }) => {
    if (!lesson?.quiz) return { score: 0, total: 0, percentage: 0 }
    
    const resultsToUse = results || quizResults
    let correct = 0
    lesson.quiz.questions.forEach((question, index) => {
      const questionKey = question.id || `question-${index}`
      if (resultsToUse[questionKey]) {
        correct++
      }
    })

    const total = lesson.quiz.questions.length
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

    return { score: correct, total, percentage }
  }

  const getPerformanceCategory = (percentage: number): 'below' | 'approaching' | 'meeting' | 'exceeding' => {
    if (percentage < 25) return 'below'
    if (percentage < 50) return 'approaching'
    if (percentage < 75) return 'meeting'
    return 'exceeding'
  }

  const getPerformanceMessage = (category: string, percentage: number) => {
    switch (category) {
      case 'below':
        return {
          title: 'Below Expectations',
          message: `You got ${percentage}%! Don't worry, everyone learns at their own pace. Let's try some easier exercises to help you understand better!`,
          color: 'from-red-50 to-orange-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          icon: <Sparkles className="w-6 h-6" />
        }
      case 'approaching':
        return {
          title: 'Approaching Expectations',
          message: `Great effort! You got ${percentage}%. You're getting there! Try these practice exercises to help you master this topic.`,
          color: 'from-yellow-50 to-amber-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          icon: <TrendingUp className="w-6 h-6" />
        }
      case 'meeting':
        return {
          title: 'Meeting Expectations',
          message: `Awesome work! You got ${percentage}%. You understand this topic well! Ready for the next challenge?`,
          color: 'from-blue-50 to-indigo-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          icon: <CheckCircle className="w-6 h-6" />
        }
      case 'exceeding':
        return {
          title: 'Exceeding Expectations',
          message: `Wow! You got ${percentage}%! You're doing amazing! You've mastered this topic. Let's move on to something new!`,
          color: 'from-emerald-50 to-teal-50',
          borderColor: 'border-emerald-200',
          textColor: 'text-emerald-700',
          icon: <Sparkles className="w-6 h-6" />
        }
      default:
        return {
          title: 'Great Job!',
          message: `You got ${percentage}%!`,
          color: 'from-indigo-50 to-purple-50',
          borderColor: 'border-indigo-200',
          textColor: 'text-indigo-700',
          icon: <CheckCircle className="w-6 h-6" />
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen premium-mesh flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-[32px] border-2 border-slate-200 p-8 text-center max-w-md">
          <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto">
            {/* @ts-ignore - lottie-react types */}
            <Lottie 
              animationData={loadingAnimation}
              loop
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen premium-mesh flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-[32px] border-2 border-slate-200 p-8 text-center max-w-md">
          <h1 className="text-3xl font-black text-[#0F172A] mb-4" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            {error ? 'Error' : 'Lesson Not Found'}
          </h1>
          <p className="text-text-secondary mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {error || 'The lesson you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <Link 
            to="/learner" 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const quizScore = showResults ? calculateQuizScore() : null
  const performanceCategory = quizScore ? getPerformanceCategory(quizScore.percentage) : null
  const performanceMessage = performanceCategory ? getPerformanceMessage(performanceCategory, quizScore!.percentage) : null

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Fredoka, sans-serif' }}>
      <div className="p-[5px] pt-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
          <StaggeredEntry>
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => navigate(-1)}
                className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border-2 border-slate-200 hover:bg-white transition-all text-sm font-semibold text-slate-700"
                style={{ fontFamily: 'Manrope, sans-serif' }}
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
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] mb-4" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                  {lesson.title}
                </h1>
                <p className="text-lg sm:text-xl text-text-secondary mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {lesson.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Grade {lesson.grade}</span>
                  </div>
                  <span>•</span>
                  <span className="capitalize px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
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
                      className="px-3 py-1 text-xs bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full font-semibold"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-6 sm:p-8">
                {lesson.contentType === 'video' && lesson.videoUrl ? (
                  <div className="aspect-video bg-slate-100 rounded-[16px] flex items-center justify-center mb-6">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-600 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white fill-current" />
                      </div>
                      <p className="text-lg font-semibold text-slate-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        Video Lesson
                      </p>
                      <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Video player will be integrated with backend
                      </p>
                      <p className="text-xs text-text-secondary mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        URL: {lesson.videoUrl}
                      </p>
                    </div>
                  </div>
                ) : lesson.content ? (
                  <div className="prose max-w-none">
                    <LessonContentRenderer content={lesson.content} />
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-[16px] p-8 sm:p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-indigo-600 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-lg font-semibold text-slate-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Interactive Content
                    </p>
                    <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Interactive content will be displayed here
                    </p>
                  </div>
                )}

                {/* Quiz Section */}
                {lesson.quiz && lesson.quiz.questions.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-200">
                    <div className="mb-6">
                      <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                        Quiz: {lesson.quiz.title || 'Test Your Knowledge'}
                      </h2>
                      {lesson.quiz.description && (
                        <p className="text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {lesson.quiz.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-6">
                      {lesson.quiz.questions.map((question, qIndex) => {
                        // Use question.id if available, otherwise use index as fallback
                        const questionKey = question.id || `question-${qIndex}`
                        const selectedAnswer = selectedAnswers[questionKey]
                        const isCorrect = quizResults[questionKey]
                        const showAnswer = showResults

                        return (
                          <div
                            key={questionKey}
                            className={`p-5 rounded-[16px] border-2 transition-all ${
                              showAnswer
                                ? isCorrect
                                  ? 'bg-emerald-50 border-emerald-300'
                                  : 'bg-red-50 border-red-300'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-3 mb-4">
                              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                {qIndex + 1}
                              </span>
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-[#0F172A] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                  {question.question}
                                </h3>
                                <div className="space-y-2">
                                  {question.options.map((option, optIndex) => {
                                    const isSelected = selectedAnswer === optIndex
                                    const isCorrectAnswer = optIndex === question.correctAnswerIndex
                                    const showFeedback = showAnswer && isSelected

                                    return (
                                      <button
                                        key={optIndex}
                                        onClick={() => handleAnswerSelect(questionKey, optIndex)}
                                        disabled={showResults}
                                        className={`w-full text-left p-4 rounded-[12px] border-2 transition-all ${
                                          showAnswer
                                            ? isCorrectAnswer
                                              ? 'bg-emerald-100 border-emerald-400'
                                              : isSelected
                                              ? 'bg-red-100 border-red-400'
                                              : 'bg-slate-50 border-slate-200'
                                            : isSelected
                                            ? 'bg-indigo-50 border-indigo-400'
                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                                        } ${showResults ? 'cursor-default' : 'cursor-pointer'}`}
                                        style={{ fontFamily: 'Manrope, sans-serif' }}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                            showAnswer
                                              ? isCorrectAnswer
                                                ? 'bg-emerald-500 border-emerald-600'
                                                : isSelected
                                                ? 'bg-red-500 border-red-600'
                                                : 'bg-slate-200 border-slate-300'
                                              : isSelected
                                              ? 'bg-indigo-500 border-indigo-600'
                                              : 'bg-white border-slate-300'
                                          }`}>
                                            {showAnswer && isCorrectAnswer && (
                                              <CheckCircle className="w-4 h-4 text-white" />
                                            )}
                                            {showAnswer && isSelected && !isCorrectAnswer && (
                                              <XCircle className="w-4 h-4 text-white" />
                                            )}
                                            {!showAnswer && isSelected && (
                                              <div className="w-2 h-2 rounded-full bg-white" />
                                            )}
                                          </div>
                                          <span className={`flex-1 font-medium ${
                                            showAnswer && isCorrectAnswer
                                              ? 'text-emerald-900'
                                              : showAnswer && isSelected && !isCorrectAnswer
                                              ? 'text-red-900'
                                              : 'text-slate-900'
                                          }`}>
                                            {String.fromCharCode(65 + optIndex)}. {option}
                                          </span>
                                        </div>
                                        {showFeedback && question.optionExplanations?.[optIndex] && (
                                          <p className={`mt-2 text-sm ml-9 ${
                                            isCorrectAnswer ? 'text-emerald-700' : 'text-red-700'
                                          }`}>
                                            {question.optionExplanations[optIndex]}
                                          </p>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                                {showAnswer && question.explanation && (
                                  <div className={`mt-4 p-3 rounded-[8px] ${
                                    isCorrect ? 'bg-emerald-100' : 'bg-red-100'
                                  }`}>
                                    <p className={`text-sm font-medium ${
                                      isCorrect ? 'text-emerald-800' : 'text-red-800'
                                    }`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                                      {isCorrect ? '✓ ' : '✗ '}
                                      {question.explanation}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {!showResults ? (() => {
                      // Find unanswered questions
                      const unansweredQuestions = lesson.quiz.questions
                        .map((question, index) => {
                          const questionKey = question.id || `question-${index}`
                          return selectedAnswers[questionKey] === undefined ? { question, index: index + 1 } : null
                        })
                        .filter((q): q is { question: QuizQuestion; index: number } => q !== null)
                      
                      const hasUnanswered = unansweredQuestions.length > 0
                      
                      return (
                        <div className="mt-6 relative">
                          <button
                            onClick={handleSubmitQuiz}
                            disabled={hasUnanswered}
                            onMouseEnter={() => hasUnanswered && setShowUnansweredTooltip(true)}
                            onMouseLeave={() => setShowUnansweredTooltip(false)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                          >
                            Submit Quiz
                          </button>
                          
                          {/* Flirting Dog Tooltip on Hover */}
                          {showUnansweredTooltip && hasUnanswered && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 z-50 w-80 sm:w-96">
                              <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-200 p-4 relative">
                                {/* Flirting Dog Animation */}
                                <div className="w-32 h-32 mx-auto mb-3">
                                  <Lottie 
                                    animationData={flirtingDogAnimation}
                                    loop
                                    autoplay
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                </div>
                                
                                {/* Message */}
                                <div className="text-center">
                                  <p className="text-sm font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                                    Oops! You missed some questions! 🐕
                                  </p>
                                  <p className="text-xs text-slate-600 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                    Please answer the following questions before submitting:
                                  </p>
                                  
                                  {/* List of unanswered questions */}
                                  <div className="space-y-1">
                                    {unansweredQuestions.map(({ question, index }) => (
                                      <div 
                                        key={question.id || `question-${index}`}
                                        className="text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-200"
                                        style={{ fontFamily: 'Poppins, sans-serif' }}
                                      >
                                        Question {index}: {question.question.length > 40 ? `${question.question.substring(0, 40)}...` : question.question}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Arrow pointing to button */}
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                                  <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-amber-200"></div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs text-text-secondary mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Please answer all questions before submitting
                          </p>
                        </div>
                      )
                    })() : quizScore && performanceMessage && (
                      <div className="mt-6 space-y-6">
                        {/* Performance Feedback */}
                        <div className={`p-6 rounded-[16px] bg-gradient-to-br ${performanceMessage.color} border-2 ${performanceMessage.borderColor}`}>
                          <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 ${performanceMessage.textColor}`}>
                              {performanceMessage.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className={`text-2xl font-black ${performanceMessage.textColor} mb-2`} style={{ fontFamily: 'Fredoka, sans-serif' }}>
                                {performanceMessage.title} {quizScore.percentage}%
                              </h3>
                              <p className="text-base mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                {performanceMessage.message}
                              </p>
                              <p className="text-sm text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                You answered {quizScore.score} out of {quizScore.total} questions correctly.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Recommendations */}
                        {(performanceCategory === 'below' || performanceCategory === 'approaching') && (
                          <div className="space-y-4">
                            {loadingSimilar ? (
                              <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto">
                                  <Lottie 
                                    animationData={loadingAnimation}
                                    loop
                                    autoplay
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                </div>
                                <p className="text-sm text-text-secondary mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                  Finding practice exercises...
                                </p>
                              </div>
                            ) : similarLessons.length > 0 ? (
                              <>
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                    Practice Exercises
                                  </h4>
                                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-semibold border-2 border-indigo-200" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                    <Sparkles className="w-4 h-4" />
                                    Try these!
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  {similarLessons.map((similarLesson) => (
                                    <Link
                                      key={similarLesson.id}
                                      to={`/learner/lessons/${similarLesson.id}`}
                                      className="block p-4 rounded-[12px] bg-white border-2 border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                          <BookOpen className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                          <h5 className="font-bold text-[#0F172A] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                            {similarLesson.title}
                                          </h5>
                                          <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                            Grade {similarLesson.grade} • {similarLesson.difficulty}
                                          </p>
                                        </div>
                                        <Play className="w-5 h-5 text-indigo-600" />
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="p-4 rounded-[12px] bg-slate-50 border-2 border-slate-200">
                                <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                  No practice exercises available at the moment. Keep practicing with what you have!
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Retake Failed Lesson Prompt */}
                        {showRetakePrompt && failedLessonId && failedLessonTitle && (
                          <div className="p-6 rounded-[16px] bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 text-amber-600">
                                <AlertCircle className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-lg font-bold text-amber-800 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                  Great Progress! 🎉
                                </h4>
                                <p className="text-base mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                  You've completed the practice exercise! Now it's time to retake the lesson you struggled with earlier. 
                                  You need to score at least 60% to proceed to the next lesson.
                                </p>
                                <Link
                                  to={`/learner/lessons/${failedLessonId}`}
                                  onClick={() => {
                                    // Clear quiz state for the failed lesson (user-scoped)
                                    if (user?.id && failedLessonId) {
                                      localStorage.removeItem(`quiz_answers_${user.id}_${failedLessonId}`)
                                      localStorage.removeItem(`quiz_results_${user.id}_${failedLessonId}`)
                                      localStorage.removeItem(`quiz_show_results_${user.id}_${failedLessonId}`)
                                    }
                                  }}
                                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-all"
                                  style={{ fontFamily: 'Poppins, sans-serif' }}
                                >
                                  <BookOpen className="w-5 h-5" />
                                  Retake: {failedLessonTitle}
                                </Link>
                              </div>
                            </div>
                          </div>
                        )}

                        {(performanceCategory === 'meeting' || performanceCategory === 'exceeding') && !showRetakePrompt && (
                          <div className="space-y-4">
                            <h4 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              What's Next?
                            </h4>
                            {loadingNext ? (
                              <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto">
                                  <Lottie 
                                    animationData={loadingAnimation}
                                    loop
                                    autoplay
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                </div>
                                <p className="text-sm text-text-secondary mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                  Loading next lessons...
                                </p>
                              </div>
                            ) : nextLessons.length > 0 ? (
                              <>
                                <p className="text-sm text-text-secondary mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                  Continue with more lessons in this topic:
                                </p>
                                <div className="space-y-3">
                                  {nextLessons.map((nextLesson) => (
                                    <Link
                                      key={nextLesson.id}
                                      to={`/learner/lessons/${nextLesson.id}`}
                                      className="block p-4 rounded-[12px] bg-white border-2 border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                          <Play className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                          <h5 className="font-bold text-[#0F172A] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                            {nextLesson.title}
                                          </h5>
                                          <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
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
                                    <p className="text-sm font-semibold text-amber-800 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                      🎉 Great progress! You've completed {completedCount} lessons in this topic.
                                    </p>
                                    <p className="text-sm text-amber-700 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                      You can now move on to the next topic: <strong>{nextSubstrand.name}</strong>
                                    </p>
                                    <Link
                                      to={nextSubstrand.subjectId && nextSubstrand.strandId 
                                        ? `/learner/lessons?subject=${nextSubstrand.subjectId}&strand=${nextSubstrand.strandId}&substrand=${nextSubstrand.id}`
                                        : `/learner/lessons?substrand=${nextSubstrand.id}`}
                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-all"
                                      style={{ fontFamily: 'Poppins, sans-serif' }}
                                    >
                                      <ArrowLeft className="w-4 h-4 rotate-180" />
                                      Go to Next Topic
                                    </Link>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="p-6 rounded-[12px] bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
                                <p className="text-base mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                  {canProceedToNextSubstrand && nextSubstrand ? (
                                    <>
                                      🎉 Amazing work! You've completed all available lessons in this topic. 
                                      {completedCount >= 3 && (
                                        <> You can now move on to the next topic: <strong>{nextSubstrand.name}</strong></>
                                      )}
                                    </>
                                  ) : (
                                    "✨ Great job! You've completed all available lessons in this topic. Take a break, relax, and explore other subjects!"
                                  )}
                                </p>
                                {canProceedToNextSubstrand && nextSubstrand ? (
                                  <Link
                                    to={nextSubstrand.subjectId && nextSubstrand.strandId 
                                      ? `/learner/lessons?subject=${nextSubstrand.subjectId}&strand=${nextSubstrand.strandId}&substrand=${nextSubstrand.id}`
                                      : `/learner/lessons?substrand=${nextSubstrand.id}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all mt-3"
                                    style={{ fontFamily: 'Poppins, sans-serif' }}
                                  >
                                    <ArrowLeft className="w-4 h-4 rotate-180" />
                                    Go to Next Topic: {nextSubstrand.name}
                                  </Link>
                                ) : (
                                  <Link
                                    to="/learner"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all mt-3"
                                    style={{ fontFamily: 'Poppins, sans-serif' }}
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
