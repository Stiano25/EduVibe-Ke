import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { ArrowLeft, BookOpen, Play, Clock, Lock } from 'lucide-react'
import { api } from '@/lib/api'
import type { Lesson, Subject, Strand, SubStrand } from '@/types'

interface LessonWithUnlock extends Lesson {
  isUnlocked: boolean
  isCompleted: boolean
  progress: number
  lastAccessed?: string
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

  // Find the main priority lesson (first unlocked, or first if all locked)
  const mainPriorityLesson = useMemo(() => {
    if (lessons.length === 0) return null
    const unlocked = lessons.find(l => l.isUnlocked)
    return unlocked || lessons[0]
  }, [lessons])

  const iconColor = subject?.color || 'from-indigo-500 to-purple-600'

  if (loading) {
    return (
      <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Fredoka, sans-serif' }}>
        <div className="p-[5px] pt-[5px]">
          <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
            <div className="text-center py-12">
              <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Loading lessons...
              </p>
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
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${iconColor} flex items-center justify-center shadow-lg`}>
                      <span className="text-white text-2xl font-bold">
                        {substrand.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
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
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <BookOpen className="w-7 h-7 text-white" strokeWidth={2.5} />
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

            {/* Lessons Grid */}
            {lessons.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {lessons.map((lesson, index) => {
                  const isMainPriority = mainPriorityLesson?.id === lesson.id
                  const isLocked = !lesson.isUnlocked
                  const cardTheme = isMainPriority
                    ? 'from-indigo-400 via-sky-400 to-emerald-400'
                    : 'from-purple-400 via-violet-400 to-indigo-400'

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
                        h-full flex flex-col bg-white/80 backdrop-blur-md rounded-[24px]
                        border border-slate-200 relative overflow-hidden
                        ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.03] transition-transform'}
                        ${isMainPriority ? 'sm:col-span-2 xl:col-span-2' : ''}
                      `}
                      style={{ 
                        borderWidth: '2.5px',
                        boxShadow: isLocked ? 'none' : '0 10px 0 0 rgba(0,0,0,0.05)'
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseUp={resetTransform}
                      onMouseLeave={resetTransform}
                    >
                      {isMainPriority && (
                        <div className="absolute -top-2 right-3 rotate-[-3deg]">
                          <span className="inline-flex px-3 py-1 rounded-2xl bg-amber-400 text-[10px] font-black text-[#0F172A] shadow-md" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            Featured
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
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                            <BookOpen className="w-6 h-6 text-white" strokeWidth={2.5} />
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
                          <div className="flex items-center justify-between">
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
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3 h-2 w-full rounded-full bg-slate-200/60 overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${cardTheme} blur-[1px]`}
                              style={{ width: `${lesson.isCompleted ? 100 : lesson.progress}%` }}
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
                })}
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-slate-400" strokeWidth={2.5} />
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
