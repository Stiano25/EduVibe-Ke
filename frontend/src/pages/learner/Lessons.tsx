import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { ArrowLeft, Play, Clock, Lock } from 'lucide-react'
import { api } from '@/lib/api'
import type { Lesson, Subject, Strand, SubStrand } from '@/types'
// @ts-ignore - lottie-react types
import Lottie from 'lottie-react'
// @ts-ignore - JSON imports for animations
import loadingAnimation from '@/animations/loading.json'
import studentAnimation from '@/animations/STUDENT.json'
import teacherAnimation from '@/animations/Teacher in Classroom.json'
import wingedTeacherAnimation from '@/animations/Winged Teacher.json'
import happyBoyAnimation from '@/animations/Happy boy.json'
import yogaDogAnimation from '@/animations/Yoga Dog.json'
import flirtingDogAnimation from '@/animations/Flirting Dog.json'
import cuteTigerAnimation from '@/animations/Cute Tiger.json'
import fireAnimation from '@/animations/Fire.json'

interface LessonWithUnlock extends Lesson {
  isUnlocked: boolean
  isCompleted: boolean
  progress: number
  lastAccessed?: string
  theme?: string | null
}

// Available Lottie animations for subjects
const subjectAnimations = [
  studentAnimation,
  teacherAnimation,
  wingedTeacherAnimation,
  happyBoyAnimation,
  yogaDogAnimation,
  flirtingDogAnimation,
  cuteTigerAnimation,
  fireAnimation,
]

// Extract theme number from theme string (e.g., "Theme 1" -> 1, "1" -> 1)
const extractThemeNumber = (theme: string | null | undefined): number | null => {
  if (!theme) return null
  const match = theme.match(/\d+/)
  return match ? parseInt(match[0], 10) : null
}

export const LearnerLessons = () => {
  const [searchParams] = useSearchParams()
  const subjectId = searchParams.get('subject')
  const strandId = searchParams.get('strand')
  const substrandId = searchParams.get('substrand')

  const [lessons, setLessons] = useState<LessonWithUnlock[]>([])
  const [subject, setSubject] = useState<Subject | null>(null)
  const [strand, setStrand] = useState<Strand | null>(null)
  const [substrand, setSubstrand] = useState<SubStrand | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get random Lottie animation for subject
  const subjectLottie = useMemo(() => {
    if (!subjectId) return null
    // Use subjectId to get consistent animation per subject
    const index = parseInt(subjectId.slice(-1) || '0', 16) % subjectAnimations.length
    return subjectAnimations[index]
  }, [subjectId])

  // Fetch subject, strand, and substrand info
  useEffect(() => {
    const fetchData = async () => {
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
          api.admin.getSubject(subjectId),
          api.admin.getStrand(strandId),
          api.admin.getSubStrand(substrandId),
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
  }, [subjectId, strandId, substrandId])

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

  const iconColor = subject?.color || 'from-indigo-500 to-purple-600'

  if (loading) {
    return (
      <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Fredoka, sans-serif' }}>
        <div className="p-[5px] pt-[5px]">
          <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-40 h-40 sm:w-48 sm:h-48">
                <Lottie 
                  animationData={loadingAnimation}
                  loop
                  autoplay
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Fredoka, sans-serif' }}>
        <div className="p-[5px] pt-[5px]">
          <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
            <div className="bg-red-50 backdrop-blur-md rounded-[24px] border-2 border-red-200 p-8 text-center">
              <p className="text-lg font-semibold text-red-700 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Error loading lessons
              </p>
              <p className="text-sm text-red-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderLessonCard = (lesson: LessonWithUnlock, isMainPriority: boolean) => {
    const isLocked = !lesson.isUnlocked
    const progressPercentage = lesson.isCompleted ? 100 : Math.max(0, Math.min(100, lesson.progress || 0))
    
    // Determine completion status
    const isFullyCompleted = progressPercentage >= 100
    const isPartiallyCompleted = progressPercentage >= 60 && progressPercentage < 100
    const isIncomplete = progressPercentage < 60

    // Different color gradients based on status
    let cardTheme = 'from-purple-400 via-violet-400 to-indigo-400'
    let cardBorderColor = 'border-slate-200'
    let cardBgColor = 'bg-white/80'
    
    if (isMainPriority && isIncomplete) {
      // Main incomplete lesson - special gradient
      cardTheme = 'from-amber-400 via-orange-400 to-red-400'
      cardBorderColor = 'border-amber-300'
      cardBgColor = 'bg-gradient-to-br from-amber-50/90 to-orange-50/90'
    } else if (isFullyCompleted) {
      // Fully completed - green/emerald
      cardTheme = 'from-emerald-400 via-teal-400 to-cyan-400'
      cardBorderColor = 'border-emerald-300'
      cardBgColor = 'bg-gradient-to-br from-emerald-50/90 to-teal-50/90'
    } else if (isPartiallyCompleted) {
      // Partially completed - blue/indigo
      cardTheme = 'from-blue-400 via-indigo-400 to-purple-400'
      cardBorderColor = 'border-blue-300'
      cardBgColor = 'bg-gradient-to-br from-blue-50/90 to-indigo-50/90'
    } else {
      // Incomplete (not main) - default purple
      cardTheme = 'from-purple-400 via-violet-400 to-indigo-400'
      cardBorderColor = 'border-slate-200'
      cardBgColor = 'bg-white/80'
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
      if (!isLocked) {
        e.currentTarget.style.transform = 'translateY(4px)'
        e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'
      }
    }

    const resetTransform = (e: React.MouseEvent<HTMLElement>) => {
      if (!isLocked) {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = '0 10px 0 0 rgba(0,0,0,0.05)'
      }
    }

    const LessonCard = (
      <div
        className={`
          h-full flex flex-col ${cardBgColor} backdrop-blur-md rounded-[24px]
          border-2 ${cardBorderColor} relative overflow-hidden
          ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.03] transition-transform'}
          ${isMainPriority && isIncomplete ? 'sm:col-span-2 xl:col-span-2 ring-2 ring-amber-400/50' : ''}
          ${isFullyCompleted ? 'opacity-90' : ''}
        `}
        style={{ 
          borderWidth: isMainPriority && isIncomplete ? '3px' : '2.5px',
          boxShadow: isLocked ? 'none' : isMainPriority && isIncomplete 
            ? '0 12px 0 0 rgba(251, 191, 36, 0.15)' 
            : '0 10px 0 0 rgba(0,0,0,0.05)'
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={resetTransform}
        onMouseLeave={resetTransform}
      >
        {isMainPriority && isIncomplete && (
          <div className="absolute -top-2 right-3 rotate-[-3deg] z-20">
            <span className="inline-flex px-3 py-1 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-[10px] font-black text-white shadow-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Focus Lesson
            </span>
          </div>
        )}
        {isFullyCompleted && (
          <div className="absolute -top-2 right-3 rotate-[-3deg] z-20">
            <span className="inline-flex px-3 py-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-[10px] font-black text-white shadow-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Completed ✓
            </span>
          </div>
        )}
        {isPartiallyCompleted && !isFullyCompleted && (
          <div className="absolute -top-2 right-3 rotate-[-3deg] z-20">
            <span className="inline-flex px-3 py-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-[10px] font-black text-white shadow-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
              In Progress
            </span>
          </div>
        )}

        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-[24px] z-10">
            <div className="text-center">
              <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" strokeWidth={2.5} />
              <p className="text-xs font-semibold text-slate-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Complete previous lesson to unlock
              </p>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5 flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${
              isMainPriority && isIncomplete 
                ? 'from-amber-500 to-orange-600' 
                : isFullyCompleted
                ? 'from-emerald-500 to-teal-600'
                : isPartiallyCompleted
                ? 'from-blue-500 to-indigo-600'
                : 'from-indigo-500 to-purple-600'
            } flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden`}>
              {(() => {
                // Select a consistent animation for this lesson based on lesson ID
                const animationIndex = parseInt(lesson.id.slice(-1) || '0', 16) % subjectAnimations.length
                const lessonAnimation = subjectAnimations[animationIndex]
                return (
                  <div className="w-full h-full">
                    <Lottie 
                      animationData={lessonAnimation}
                      loop
                      autoplay
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                )
              })()}
            </div>
            <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 rounded-full capitalize border border-emerald-200" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {lesson.contentType}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-[#0F172A] mb-2 group-hover:text-indigo-600 transition-colors leading-snug" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            {lesson.title}
          </h3>
          <p className="text-sm text-text-secondary mb-4 line-clamp-2 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {lesson.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Grade {lesson.grade}
            </span>
            <span className="px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 rounded-full capitalize" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {lesson.difficulty}
            </span>
            <div className="flex items-center gap-1 ml-auto text-xs text-text-secondary font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{lesson.duration}m</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {lesson.tags.slice(0, 3).map((tag) => (
              <span 
                key={tag} 
                className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded-full font-medium"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {tag}
              </span>
            ))}
            {lesson.tags.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded-full font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>
                +{lesson.tags.length - 3}
              </span>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              {isLocked ? (
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <Lock className="w-4 h-4" strokeWidth={2.5} />
                  <span>Locked</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm group-hover:gap-2 transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <Play className="w-4 h-4 fill-current" strokeWidth={2.5} />
                  <span>Start Lesson</span>
                </div>
              )}
              <span className="text-xs font-semibold text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {progressPercentage}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 w-full rounded-full bg-slate-200/60 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${cardTheme} transition-all duration-300`}
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
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Fredoka, sans-serif' }}>
      <div className="p-[5px] pt-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
          <StaggeredEntry>
            {/* Back Button */}
            <Link
              to="/learner"
              className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border-2 border-slate-200 hover:bg-white transition-all text-sm font-semibold text-slate-700"
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
            </Link>

            {/* Header */}
            <div className="mb-6">
              {substrand && strand && subject ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    {subjectLottie ? (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
                        <Lottie 
                          animationData={subjectLottie}
                          loop
                          autoplay
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                    ) : (
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${iconColor} flex items-center justify-center shadow-lg`}>
                        <span className="text-white text-2xl font-bold">
                          {substrand.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-[#0F172A]" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                        {substrand.name}
                      </h1>
                      <p className="text-text-secondary mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {strand.name} • {subject.name}
                      </p>
                    </div>
                  </div>
                  <p className="text-base text-text-secondary max-w-2xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Explore lessons and activities for <span className="font-semibold text-indigo-600">{substrand.name}</span> in {strand.name}
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg overflow-hidden">
                    {subjectLottie ? (
                      <Lottie 
                        animationData={subjectLottie}
                        loop
                        autoplay
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div className="w-full h-full">
                        <Lottie 
                          animationData={studentAnimation}
                          loop
                          autoplay
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0F172A]" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                      All Lessons
                    </h1>
                    <p className="text-text-secondary mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
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
                        <h2 className="text-xl sm:text-2xl font-black text-[#0F172A]" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                          Theme {themeNum}
                        </h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200" />
                        <span className="text-sm font-semibold text-slate-600 px-3 py-1 bg-slate-100 rounded-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
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
                      <h2 className="text-xl sm:text-2xl font-black text-[#0F172A]" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                        Other Lessons
                      </h2>
                      <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200" />
                      <span className="text-sm font-semibold text-slate-600 px-3 py-1 bg-slate-100 rounded-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
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
              <div className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                  <Lottie 
                    animationData={studentAnimation}
                    loop
                    autoplay
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <p className="text-lg font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  No lessons found
                </p>
                <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {substrand 
                    ? `No approved lessons available for ${substrand.name} yet.`
                    : 'No lessons available at the moment.'}
                </p>
              </div>
            )}
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}
