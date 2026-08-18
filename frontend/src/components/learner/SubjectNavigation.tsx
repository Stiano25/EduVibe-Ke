import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { SubStrandCards } from './SubStrandCards'
import { LazyLottie } from '@/components/ui/LazyLottie'
import { animationKeyForSubjectId } from '@/lib/lottieAnimations'
import { subjectTone } from '@/lib/learnerUi'
import type { Subject, Strand, SubStrand } from '@/types'

type NavigationView = 'subjects' | 'strands' | 'substrands'

/** Learner substrands endpoint enriches each substrand with progress info */
type SubStrandWithProgress = SubStrand & {
  progressPercent?: number
  lessonCount?: number
  estimatedMinutes?: number
  isUnlocked?: boolean
}

export const SubjectNavigation = () => {
  const [navigationView, setNavigationView] = useState<NavigationView>('subjects')
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedStrand, setSelectedStrand] = useState<Strand | null>(null)
  
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [strands, setStrands] = useState<Strand[]>([])
  const [substrands, setSubstrands] = useState<SubStrandWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.learner.getSubjects()
        setSubjects(data)
      } catch (err: any) {
        console.error('Error fetching subjects:', err)
        setError(err.message || 'Failed to load subjects')
      } finally {
        setLoading(false)
      }
    }

    fetchSubjects()
  }, [])

  // Fetch strands when subject is selected
  useEffect(() => {
    if (selectedSubject && navigationView === 'strands') {
      const fetchStrands = async () => {
        try {
          setLoading(true)
          setError(null)
          const data = await api.learner.getStrands(selectedSubject.id)
          setStrands(data)
        } catch (err: any) {
          console.error('Error fetching strands:', err)
          setError(err.message || 'Failed to load strands')
        } finally {
          setLoading(false)
        }
      }

      fetchStrands()
    }
  }, [selectedSubject, navigationView])

  // Fetch substrands when strand is selected
  useEffect(() => {
    if (selectedStrand && navigationView === 'substrands') {
      const fetchSubstrands = async () => {
        try {
          setLoading(true)
          setError(null)
          const data = await api.learner.getSubstrands(selectedStrand.id)
          setSubstrands(data)
        } catch (err: any) {
          console.error('Error fetching substrands:', err)
          setError(err.message || 'Failed to load substrands')
        } finally {
          setLoading(false)
        }
      }

      fetchSubstrands()
    }
  }, [selectedStrand, navigationView])

  const handleBack = () => {
    if (navigationView === 'substrands') {
      setNavigationView('strands')
      setSelectedStrand(null)
      setSubstrands([])
    } else if (navigationView === 'strands') {
      setNavigationView('subjects')
      setSelectedSubject(null)
      setStrands([])
    }
  }

  // Empty state: No subjects for grade
  if (!loading && navigationView === 'subjects' && subjects.length === 0 && !error) {
    return (
      <div className="mb-6 bg-white rounded-ev-lg border-2 border-ev-line p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ev-line/50 flex items-center justify-center">
          <ArrowLeft className="w-8 h-8 text-ev-muted" />
        </div>
        <p className="text-lg font-semibold text-ev-ink mb-2"  >
          No subjects available
        </p>
        <p className="text-sm text-ev-muted"  >
          There are no subjects currently available for your grade. Please check back later.
        </p>
      </div>
    )
  }

  // Error state
  if (error && navigationView === 'subjects') {
    return (
      <div className="mb-6 bg-ev-red-soft rounded-ev-lg border-2 border-ev-red p-8 text-center">
        <p className="text-lg font-semibold text-ev-red-edge mb-2"  >
          Error loading subjects
        </p>
        <p className="text-sm text-ev-red-edge"  >
          {error}
        </p>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {navigationView !== 'subjects' && (
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-ev-line hover:bg-white transition-all text-sm font-semibold text-slate-700"
           
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
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto">
            <LazyLottie animationKey="loading" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      )}

      {!loading && navigationView === 'subjects' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-6">
          {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => {
                  setSelectedSubject(subject)
                  setNavigationView('strands')
                }}
                className="group flex flex-col items-center justify-center gap-2 sm:gap-3 hover:scale-105 transition-transform"
                 
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(2px) scale(0.98)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = ''
                }}
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                  <LazyLottie
                    animationKey={animationKeyForSubjectId(subject.id)}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-ev-ink text-center leading-tight"  >
                  {subject.name}
                </span>
              </button>
          ))}
        </div>
      )}

      {!loading && navigationView === 'strands' && (
        <>
          {strands.length === 0 ? (
            <div className="bg-white rounded-ev-lg border-2 border-ev-line p-8 text-center">
              <p className="text-sm text-ev-muted"  >
                No strands available for this subject.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-6">
              {strands.map((strand) => {
                const iconTone = subjectTone(strand.name)
                return (
                  <button
                    key={strand.id}
                    onClick={() => {
                      setSelectedStrand(strand)
                      setNavigationView('substrands')
                    }}
                    className="group flex flex-col items-center justify-center gap-2 sm:gap-3 hover:scale-105 transition-transform"
                     
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'translateY(2px) scale(0.98)'
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = ''
                    }}
                  >
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-b-4 ${iconTone} flex items-center justify-center`}>
                      <span className="text-white text-xl sm:text-2xl font-bold">
                        {strand.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-ev-ink text-center leading-tight"  >
                      {strand.name}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {!loading && navigationView === 'substrands' && selectedStrand && selectedSubject && (
        <>
          {substrands.length === 0 ? (
            <div className="bg-white rounded-ev-lg border-2 border-ev-line p-8 text-center">
              <p className="text-sm text-ev-muted"  >
                No substrands with approved lessons available for this strand.
              </p>
            </div>
          ) : (
            <SubStrandCards
              subStrands={substrands.map(ss => ({
                id: ss.id,
                name: ss.name,
                progressPercent: ss.progressPercent,
                lessonCount: ss.lessonCount,
                estimatedMinutes: ss.estimatedMinutes,
              }))}
              strand={selectedStrand}
              subject={selectedSubject}
            />
          )}
        </>
      )}
    </div>
  )
}
