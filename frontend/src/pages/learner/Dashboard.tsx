import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, BookOpen, CheckCircle2, TrendingUp } from 'lucide-react'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { LearnerPage } from '@/components/layout/LearnerPage'
import { WelcomeHeader } from '@/components/learner/WelcomeHeader'
import { SearchBar } from '@/components/learner/SearchBar'
import { SubjectNavigation } from '@/components/learner/SubjectNavigation'
import { DailyExerciseCard } from '@/components/learner/DailyExerciseCard'
import { QuestNextCard, type NextTaskResponse } from '@/components/learner/QuestNextCard'
import { LessonJourney } from '@/components/learner/LessonJourney'
import { ModalityPreferencePrompt } from '@/components/learner/ModalityPreferencePrompt'
import { useLessonStore } from '@/store/useLessonStore'
import { useAuthStore } from '@/store/useAuthStore'
import { api } from '@/lib/api'
import { useLessonChoices } from '@/hooks/useLessonChoices'
import { usesQuestNavigation } from '@/lib/complexityBands'

type ProgressReport = {
  learner: { name?: string | null; grade?: string | null; email?: string | null }
  generatedAt: string
  summary: {
    lessonsTracked: number
    completed: number
    inProgress: number
    averageScore: number | null
  }
  masteryCounts: Record<string, number>
  skillsNeedingPractice: Array<{
    skillFocus: string
    learningOutcomeKey: string
    status: string
  }>
  recentLessons: Array<{
    lessonId: string
    title: string
    progress: number
    completed: boolean
    scorePercentage: number | null
    lastAccessed?: string | null
  }>
}

export const LearnerDashboard = () => {
  const { lessons } = useLessonStore()
  const user = useAuthStore((s) => s.user)
  const questNav = usesQuestNavigation(user?.grade)
  const [searchQuery, setSearchQuery] = useState('')
  const [report, setReport] = useState<ProgressReport | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [loadingReport, setLoadingReport] = useState(true)
  const [nextTask, setNextTask] = useState<NextTaskResponse | null>(null)
  const [loadingNextTask, setLoadingNextTask] = useState(questNav)
  const { choices: lessonChoices } = useLessonChoices({ enabled: questNav })
  const hasOpenLessons = lessonChoices.some((c) => c.isUnlocked && !c.isCompleted)
  const doneCount = lessonChoices.filter((c) => c.isCompleted).length

  useEffect(() => {
    if (questNav) {
      setLoadingReport(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoadingReport(true)
      setReportError(null)
      try {
        const data = (await api.learner.getProgressReport()) as ProgressReport
        if (!cancelled) setReport(data)
      } catch (err) {
        if (!cancelled) {
          setReportError(err instanceof Error ? err.message : 'Could not load progress')
        }
      } finally {
        if (!cancelled) setLoadingReport(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!questNav) return
    let cancelled = false
    const load = async () => {
      setLoadingNextTask(true)
      try {
        const data = (await api.learner.getNextTask()) as NextTaskResponse
        if (!cancelled) setNextTask(data)
      } catch {
        if (!cancelled) setNextTask(null)
      } finally {
        if (!cancelled) setLoadingNextTask(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [questNav])

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      !searchQuery ||
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  const handlePrintReport = () => {
    window.print()
  }

  return (
    <LearnerPage>
      <StaggeredEntry>
            <div className="print:hidden">
              <WelcomeHeader />
              {questNav ? (
                <div className="space-y-6">
                  <QuestNextCard
                    data={nextTask}
                    loading={loadingNextTask}
                    showPickerLink={false}
                    hasOpenLessons={hasOpenLessons}
                  />
                  {lessonChoices.length > 0 ? (
                    <div>
                      <div className="mb-3 flex items-end justify-between gap-3">
                        <h2 className="text-xl font-black text-ev-ink">Your lessons</h2>
                        {doneCount > 0 ? (
                          <p className="text-sm font-bold text-ev-muted">
                            {doneCount}/{lessonChoices.length} done
                          </p>
                        ) : null}
                      </div>
                      <LessonJourney compact />
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <SearchBar value={searchQuery} onChange={setSearchQuery} />
                  <SubjectNavigation />
                  <DailyExerciseCard />
                </>
              )}
            </div>

            {!questNav && (
            <div
              id="learner-progress-report"
              className="mt-6 bg-white/90 rounded-ev-lg border-2 border-ev-line p-5 sm:p-6 print:border-0 print:p-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2
                    className="text-xl font-black text-ev-ink"
                   
                  >
                    My progress
                  </h2>
                  <p className="text-xs text-ev-muted" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {report?.learner?.name ? `${report.learner.name} · ` : ''}
                    {report?.learner?.grade ? `Grade ${report.learner.grade}` : 'Learner report'}
                    {report?.generatedAt
                      ? ` · ${new Date(report.generatedAt).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ev-blue text-white text-sm font-semibold hover:brightness-105 print:hidden"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <Download className="w-4 h-4" />
                  Save PDF report
                </button>
              </div>

              {loadingReport ? (
                <p className="text-sm text-ev-muted" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Loading progress…
                </p>
              ) : reportError ? (
                <p className="text-sm text-ev-red-edge" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {reportError}
                </p>
              ) : report ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-ev-sm bg-ev-blue-soft border border-indigo-100 p-3">
                      <div className="flex items-center gap-2 text-ev-blue-edge mb-1">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Tracked</span>
                      </div>
                      <p className="text-2xl font-black text-ev-ink">{report.summary.lessonsTracked}</p>
                    </div>
                    <div className="rounded-ev-sm bg-emerald-50 border border-emerald-100 p-3">
                      <div className="flex items-center gap-2 text-ev-green-edge mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Done</span>
                      </div>
                      <p className="text-2xl font-black text-ev-ink">{report.summary.completed}</p>
                    </div>
                    <div className="rounded-ev-sm bg-ev-pink-soft border border-amber-100 p-3">
                      <div className="flex items-center gap-2 text-ev-pink-edge mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">In progress</span>
                      </div>
                      <p className="text-2xl font-black text-ev-ink">{report.summary.inProgress}</p>
                    </div>
                    <div className="rounded-ev-sm bg-violet-50 border border-violet-100 p-3">
                      <div className="flex items-center gap-2 text-violet-700 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wide">Avg score</span>
                      </div>
                      <p className="text-2xl font-black text-ev-ink">
                        {report.summary.averageScore != null ? `${report.summary.averageScore}%` : '—'}
                      </p>
                    </div>
                  </div>

                  {report.skillsNeedingPractice.length > 0 && (
                    <div>
                      <h3
                        className="text-sm font-bold text-ev-ink mb-2"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        Skills needing practice
                      </h3>
                      <ul className="space-y-1">
                        {report.skillsNeedingPractice.map((s) => (
                          <li
                            key={s.learningOutcomeKey}
                            className="text-sm text-slate-700"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                          >
                            {s.skillFocus}{' '}
                            <span className="text-xs text-ev-pink-edge capitalize">({s.status})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h3
                      className="text-sm font-bold text-ev-ink mb-2"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      Recent lessons
                    </h3>
                    {report.recentLessons.length === 0 ? (
                      <p className="text-sm text-ev-muted" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        No lesson progress yet. Start a lesson to build your report.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {report.recentLessons.slice(0, 12).map((row) => (
                          <Link
                            key={row.lessonId}
                            to={`/learner/lessons/${row.lessonId}`}
                            className="flex items-center justify-between gap-3 p-3 rounded-ev-sm border border-ev-line bg-white hover:border-ev-blue transition-all print:border-ev-line"
                          >
                            <div className="min-w-0">
                              <p
                                className="text-sm font-semibold text-ev-ink truncate"
                                style={{ fontFamily: 'Manrope, sans-serif' }}
                              >
                                {row.title}
                              </p>
                              <p className="text-[11px] text-ev-muted" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                {row.completed ? 'Completed' : `${row.progress}% progress`}
                              </p>
                            </div>
                            <span
                              className="text-sm font-bold text-ev-blue-edge shrink-0"
                              style={{ fontFamily: 'Manrope, sans-serif' }}
                            >
                              {row.scorePercentage != null ? `${row.scorePercentage}%` : '—'}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            )}
      </StaggeredEntry>

      <div className="print:hidden">
        <ModalityPreferencePrompt />
      </div>

      {searchQuery && filteredLessons.length === 0 && (
        <div className="fixed inset-0 z-[100] bg-white/95 p-8 overflow-y-auto animate-fade-in print:hidden">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2
                className="text-2xl font-black tracking-tight text-ev-ink"
               
              >
                No lessons found for "<span className="text-gradient">{searchQuery}</span>"
              </h2>
              <button
                onClick={() => setSearchQuery('')}
                className="p-3 rounded-3xl bg-white border-2 border-ev-line hover:bg-white transition-all font-black text-sm"
               
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </LearnerPage>
  )
}
