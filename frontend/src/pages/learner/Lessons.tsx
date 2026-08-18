import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { LearnerPage } from '@/components/layout/LearnerPage'
import { learnerButton } from '@/lib/learnerUi'
import { ArrowLeft, Play, Clock, Lock } from 'lucide-react'
import { api } from '@/lib/api'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { animationKeyForSubjectId, type AnimationKey } from '@/lib/lottieAnimations'
import { LessonJourney } from '@/components/learner/LessonJourney'
import type { Lesson, Subject, Strand, SubStrand } from '@/types'
import { useAuthStore } from '@/store/useAuthStore'
import { QUEST_COPY, usesQuestNavigation } from '@/lib/complexityBands'
import { subjectTone } from '@/lib/learnerUi'

interface LessonWithUnlock extends Lesson {
  isUnlocked: boolean
  isCompleted: boolean
  progress: number
  lastAccessed?: string
  theme?: string | null
}

// Extract theme number from theme string (e.g., "Theme 1" -> 1, "1" -> 1)
const extractThemeNumber = (theme: string | null | undefined): number | null => {
  if (!theme) return null
  const match = theme.match(/\d+/)
  return match ? parseInt(match[0], 10) : null
}

export const LearnerLessons = () => {
  const [searchParams] = useSearchParams()
  const questNav = usesQuestNavigation(useAuthStore((s) => s.user)?.grade)
  const subjectId = searchParams.get('subject')
  const strandId = searchParams.get('strand')
  const substrandId = searchParams.get('substrand')

  const [lessons, setLessons] = useState<LessonWithUnlock[]>([])
  const [subject, setSubject] = useState<Subject | null>(null)
  const [strand, setStrand] = useState<Strand | null>(null)
  const [substrand, setSubstrand] = useState<SubStrand | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogMode = questNav && !substrandId

  const subjectLottieKey: AnimationKey | null = useMemo(() => {
    if (!subjectId) return null
    return animationKeyForSubjectId(subjectId)
  }, [subjectId])

  // Fetch subject, strand, and substrand info
  useEffect(() => {
    const fetchData = async () => {
      if (catalogMode) {
        setLoading(false)
        return
      }
      if (!subjectId || !strandId || !substrandId) {
        setError('Missing required parameters')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch subject, strand, and substrand in parallel
        const [subjectData, strandData, substrandData, lessonsData] = await Promise.all([
          api.learner.getSubject(subjectId),
          api.learner.getStrand(strandId),
          api.learner.getSubStrand(substrandId),
          api.learner.getLessons(substrandId)
        ])

        setSubject(subjectData)
        setStrand(strandData)
        setSubstrand(substrandData)
        setLessons(lessonsData)
      } catch (err: any) {
        console.error('Error fetching data:', err)
        setError(err.message || 'Failed to load lessons')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [catalogMode, subjectId, strandId, substrandId])

  // Sort and categorize lessons by completion status
  const categorizeLessons = (lessonList: LessonWithUnlock[]) => {
    const incomplete: LessonWithUnlock[] = [] // < 60%
    const partiallyCompleted: LessonWithUnlock[] = [] // >= 60% && < 100%
    const fullyCompleted: LessonWithUnlock[] = [] // 100%

    lessonList.forEach(lesson => {
      const progress = lesson.isCompleted ? 100 : (lesson.progress || 0)
      if (progress >= 100) {
        fullyCompleted.push(lesson)
      } else if (progress >= 60) {
        partiallyCompleted.push(lesson)
      } else {
        incomplete.push(lesson)
      }
    })

    // Sort incomplete by unlock status, then by id (for consistent ordering)
    incomplete.sort((a, b) => {
      if (a.isUnlocked !== b.isUnlocked) {
        return a.isUnlocked ? -1 : 1 // Unlocked first
      }
      // If both unlocked or both locked, maintain original order (by id)
      return a.id.localeCompare(b.id)
    })

    // Sort partially completed by progress (descending)
    partiallyCompleted.sort((a, b) => {
      const aProgress = a.isCompleted ? 100 : (a.progress || 0)
      const bProgress = b.isCompleted ? 100 : (b.progress || 0)
      return bProgress - aProgress
    })

    // Sort fully completed by completion date (most recent first)
    fullyCompleted.sort((a, b) => {
      if (a.lastAccessed && b.lastAccessed) {
        return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
      }
      return 0
    })

    // Return: incomplete first, then partially completed, then fully completed
    return [...incomplete, ...partiallyCompleted, ...fullyCompleted]
  }

  // Group lessons by theme and sort themes from 1 to 10
  const lessonsByTheme = useMemo(() => {
    const grouped: { [key: number]: LessonWithUnlock[] } = {}
    const noTheme: LessonWithUnlock[] = []

    lessons.forEach(lesson => {
      const themeNum = extractThemeNumber(lesson.theme)
      if (themeNum !== null && themeNum >= 1 && themeNum <= 10) {
        if (!grouped[themeNum]) {
          grouped[themeNum] = []
        }
        grouped[themeNum].push(lesson)
      } else {
        noTheme.push(lesson)
      }
    })

    // Sort and categorize lessons within each theme
    Object.keys(grouped).forEach(themeNum => {
      grouped[Number(themeNum)] = categorizeLessons(grouped[Number(themeNum)])
    })
    const sortedNoTheme = categorizeLessons(noTheme)

    // Sort themes from 1 to 10 (ascending order)
    const sortedThemes = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b) // Ascending sort: 1, 2, 3... 10
      .filter(theme => theme >= 1 && theme <= 10)

    return { grouped, sortedThemes, noTheme: sortedNoTheme }
  }, [lessons])

  // Find the main priority lesson (first incomplete unlocked lesson)
  const mainPriorityLesson = useMemo(() => {
    if (lessons.length === 0) return null
    
    // Find first incomplete (< 60%) unlocked lesson
    const incompleteUnlocked = lessons.find(l => {
      const progress = l.isCompleted ? 100 : (l.progress || 0)
      return l.isUnlocked && progress < 60
    })
    
    if (incompleteUnlocked) return incompleteUnlocked
    
    // Fallback: first unlocked lesson
    const unlocked = lessons.find(l => l.isUnlocked)
    return unlocked || lessons[0]
  }, [lessons])

  const iconTone = subjectTone(subject?.name)

  if (catalogMode) {
    return (
      <LearnerPage width="wide">
        <Link to="/learner" className={learnerButton('secondary', 'md', 'mb-6')}>
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
        <LessonJourney heading={QUEST_COPY.lessons} />
      </LearnerPage>
    )
  }

  if (loading) {
    return (
      <LearnerPage>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-40 h-40 sm:w-48 sm:h-48">
            <LazyLottie animationKey="loading" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      </LearnerPage>
    )
  }

  if (error) {
    return (
      <LearnerPage>
        <div className="bg-ev-red-soft rounded-ev-lg border-2 border-ev-red p-8 text-center">
          <p className="text-lg font-semibold text-ev-red-edge mb-2">Error loading lessons</p>
          <p className="text-sm text-ev-red-edge">{error}</p>
        </div>
      </LearnerPage>
    )
  }

  const renderLessonCard = (lesson: LessonWithUnlock, isMainPriority: boolean) => {
    const isLocked = !lesson.isUnlocked
    const progressPercentage = lesson.isCompleted ? 100 : Math.max(0, Math.min(100, lesson.progress || 0))
    
    // Determine completion status
    const isFullyCompleted = progressPercentage >= 100
    const isPartiallyCompleted = progressPercentage >= 60 && progressPercentage < 100
    const isIncomplete = progressPercentage < 60

    // Flat status theming: one solid fill, one solid edge, per state.
    let barTone = 'bg-ev-pink'
    let cardBorderColor = 'border-ev-line'
    let cardBgColor = 'bg-white'

    if (isMainPriority && isIncomplete) {
      barTone = 'bg-ev-pink'
      cardBorderColor = 'border-ev-pink'
      cardBgColor = 'bg-ev-pink-soft'
    } else if (isFullyCompleted) {
      barTone = 'bg-ev-green'
      cardBorderColor = 'border-ev-green'
      cardBgColor = 'bg-ev-green-soft'
    } else if (isPartiallyCompleted) {
      barTone = 'bg-ev-blue'
      cardBorderColor = 'border-ev-blue'
      cardBgColor = 'bg-ev-blue-soft'
    }

    const LessonCard = (
      <div
        className={`
          h-full flex flex-col ${cardBgColor} rounded-ev-lg
          border-2 border-b-4 ${cardBorderColor} relative overflow-hidden
          ${isLocked ? 'opacity-60 cursor-not-allowed' : 'ev-edge'}
          ${isMainPriority && isIncomplete ? 'sm:col-span-2 xl:col-span-2' : ''}
        `}
      >
        {isMainPriority && isIncomplete && (
          <div className="absolute -top-2 right-3 rotate-[-3deg] z-20">
            <span className="inline-flex px-3 py-1 rounded-2xl border-2 border-ev-pink-edge bg-ev-pink text-[10px] font-black text-white">
              Focus Lesson
            </span>
          </div>
        )}
        {isFullyCompleted && (
          <div className="absolute -top-2 right-3 rotate-[-3deg] z-20">
            <span className="inline-flex px-3 py-1 rounded-2xl border-2 border-ev-green-edge bg-ev-green text-[10px] font-black text-white">
              Completed ✓
            </span>
          </div>
        )}
        {isPartiallyCompleted && !isFullyCompleted && (
          <div className="absolute -top-2 right-3 rotate-[-3deg] z-20">
            <span className="inline-flex px-3 py-1 rounded-2xl border-2 border-ev-blue-edge bg-ev-blue text-[10px] font-black text-white">
              In Progress
            </span>
          </div>
        )}

        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-ev-lg z-10">
            <div className="text-center">
              <Lock className="w-8 h-8 text-ev-muted mx-auto mb-2" strokeWidth={2.5} />
              <p className="text-xs font-semibold text-ev-muted"  >
                Complete previous lesson to unlock
              </p>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5 flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div
              className={`w-12 h-12 rounded-full border-2 ${barTone} ${cardBorderColor} flex items-center justify-center flex-shrink-0 overflow-hidden`}
            >
              {(() => {
                const lessonKey = animationKeyForSubjectId(lesson.id)
                return (
                  <div className="w-full h-full">
                    <LazyLottie animationKey={lessonKey} style={{ width: '100%', height: '100%' }} />
                  </div>
                )
              })()}
            </div>
            <span className="px-3 py-1 text-xs font-bold bg-ev-green-soft text-ev-green-edge rounded-full capitalize border-2 border-ev-green">
              {lesson.contentType}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-ev-ink mb-2 group-hover:text-ev-pink-edge transition-colors leading-snug">
            {lesson.title}
          </h3>
          <p className="text-sm text-ev-muted mb-4 line-clamp-2 leading-relaxed"  >
            {lesson.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-2.5 py-1 text-xs font-semibold bg-ev-pink-soft text-ev-pink-edge rounded-full"  >
              Grade {lesson.grade}
            </span>
            <span className="px-2.5 py-1 text-xs font-bold bg-ev-green-soft text-ev-green-edge rounded-full capitalize">
              {lesson.difficulty}
            </span>
            <div className="flex items-center gap-1 ml-auto text-xs text-ev-muted font-medium"  >
              <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{lesson.duration}m</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {lesson.tags.slice(0, 3).map((tag) => (
              <span 
                key={tag} 
                className="px-2 py-0.5 text-[10px] bg-ev-line/50 text-slate-700 rounded-full font-medium"
                 
              >
                {tag}
              </span>
            ))}
            {lesson.tags.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] bg-ev-line/50 text-slate-700 rounded-full font-medium"  >
                +{lesson.tags.length - 3}
              </span>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-ev-line">
            <div className="flex items-center justify-between mb-2">
              {isLocked ? (
                <div className="flex items-center gap-1.5 text-ev-muted font-semibold text-sm"  >
                  <Lock className="w-4 h-4" strokeWidth={2.5} />
                  <span>Locked</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-ev-pink-edge font-semibold text-sm group-hover:gap-2 transition-all"  >
                  <Play className="w-4 h-4 fill-current" strokeWidth={2.5} />
                  <span>Start Lesson</span>
                </div>
              )}
              <span className="text-xs font-semibold text-ev-muted"  >
                {progressPercentage}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-3 w-full rounded-full border-2 border-ev-line bg-white overflow-hidden">
              <div
                className={`h-full ${barTone} transition-all duration-300`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )

    if (isLocked) {
      return (
        <div key={lesson.id} className={isMainPriority ? 'sm:col-span-2 xl:col-span-2' : ''}>
          {LessonCard}
        </div>
      )
    }

    return (
      <Link
        key={lesson.id}
        to={`/learner/lessons/${lesson.id}`}
        className={isMainPriority ? 'sm:col-span-2 xl:col-span-2' : ''}
        style={{ 
          fontFamily: 'Manrope, sans-serif',
        }}
      >
        {LessonCard}
      </Link>
    )
  }

  return (
    <LearnerPage width="wide">
      <StaggeredEntry>
            {/* Back Button */}
            <Link to="/learner" className={learnerButton('secondary', 'md', 'mb-6')}>
              <ArrowLeft className="w-5 h-5" />
              Back
            </Link>

            {/* Header */}
            <div className="mb-6">
              {substrand && strand && subject ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    {subjectLottieKey ? (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
                        <LazyLottie
                          animationKey={subjectLottieKey}
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                    ) : (
                      <div className={`w-14 h-14 rounded-full border-2 border-b-4 ${iconTone} flex items-center justify-center`}>
                        <span className="text-white text-2xl font-bold">
                          {substrand.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-ev-ink">
                        {substrand.name}
                      </h1>
                      <p className="text-ev-muted mt-1"  >
                        {strand.name} • {subject.name}
                      </p>
                    </div>
                  </div>
                  <p className="text-base text-ev-muted max-w-2xl"  >
                    Explore lessons and activities for <span className="font-semibold text-ev-pink-edge">{substrand.name}</span> in {strand.name}
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-14 h-14 rounded-full bg-ev-pink flex items-center justify-center  overflow-hidden">
                    {subjectLottieKey ? (
                      <LazyLottie
                        animationKey={subjectLottieKey}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div className="w-full h-full">
                        <LazyLottie animationKey="student" style={{ width: '100%', height: '100%' }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-ev-ink">
                      All Lessons
                    </h1>
                    <p className="text-ev-muted mt-1"  >
                      Explore and discover new learning opportunities
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Lessons by Theme */}
            {lessons.length > 0 ? (
              <div className="space-y-8">
                {/* Display lessons grouped by theme from 1 to 10 */}
                {lessonsByTheme.sortedThemes.map((themeNum) => {
                  const themeLessons = lessonsByTheme.grouped[themeNum]
                  if (!themeLessons || themeLessons.length === 0) return null

                  return (
                    <div key={themeNum} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl sm:text-2xl font-black text-ev-ink">
                          Theme {themeNum}
                        </h2>
                        <div className="flex-1 h-0.5 bg-ev-line" />
                        <span className="text-sm font-semibold text-ev-muted px-3 py-1 bg-ev-line/50 rounded-full"  >
                          {themeLessons.length} {themeLessons.length === 1 ? 'lesson' : 'lessons'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {themeLessons.map((lesson) => {
                          const isMainPriority = mainPriorityLesson?.id === lesson.id
                          return renderLessonCard(lesson, isMainPriority)
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Display lessons without theme */}
                {lessonsByTheme.noTheme.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl sm:text-2xl font-black text-ev-ink">
                        Other Lessons
                      </h2>
                      <div className="flex-1 h-0.5 bg-ev-line" />
                      <span className="text-sm font-semibold text-ev-muted px-3 py-1 bg-ev-line/50 rounded-full"  >
                        {lessonsByTheme.noTheme.length} {lessonsByTheme.noTheme.length === 1 ? 'lesson' : 'lessons'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {lessonsByTheme.noTheme.map((lesson) => {
                        const isMainPriority = mainPriorityLesson?.id === lesson.id
                        return renderLessonCard(lesson, isMainPriority)
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-ev-lg border-2 border-ev-line p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-ev-line/50 flex items-center justify-center overflow-hidden">
                  <LazyLottie animationKey="student" style={{ width: '100%', height: '100%' }} />
                </div>
                <p className="text-lg font-semibold text-ev-ink mb-2"  >
                  No lessons found
                </p>
                <p className="text-sm text-ev-muted"  >
                  {substrand 
                    ? `No approved lessons available for ${substrand.name} yet.`
                    : 'No lessons available at the moment.'}
                </p>
              </div>
            )}
      </StaggeredEntry>
    </LearnerPage>
  )
}
