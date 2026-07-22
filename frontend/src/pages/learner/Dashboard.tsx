import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, BookOpen, CheckCircle2, TrendingUp } from 'lucide-react'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { WelcomeHeader } from '@/components/learner/WelcomeHeader'
import { SearchBar } from '@/components/learner/SearchBar'
import { SubjectNavigation } from '@/components/learner/SubjectNavigation'
import { DailyExerciseCard } from '@/components/learner/DailyExerciseCard'
import { ModalityPreferencePrompt } from '@/components/learner/ModalityPreferencePrompt'
import { useLessonStore } from '@/store/useLessonStore'
import { api } from '@/lib/api'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [report, setReport] = useState<ProgressReport | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [loadingReport, setLoadingReport] = useState(true)

  useEffect(() => {
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
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Fredoka, sans-serif' }}>
      <div className="p-[5px] pt-[5px] print:p-0">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6 print:bg-white print:rounded-none print:border-0 print:shadow-none">
          <StaggeredEntry>
            <div className="print:hidden">
              <WelcomeHeader />
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
              <SubjectNavigation />
              <DailyExerciseCard />
            </div>

            <div
              id="learner-progress-report"
              className="mt-6 bg-white/90 rounded-[24px] border-2 border-slate-200 p-5 sm:p-6 print:border-0 print:p-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2
                    className="text-xl font-black text-[#0F172A]"
                    style={{ fontFamily: 'Fredoka, sans-serif' }}
                  >
                    My progress
                  </h2>
                  <p className="text-xs text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 print:hidden"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <Download className="w-4 h-4" />
                  Save PDF report
                </button>
              </div>

              {loadingReport ? (
                <p className="text-sm text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Loading progress…
                </p>
              ) : reportError ? (
                <p className="text-sm text-red-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {reportError}
                </p>
              ) : report ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-[14px] bg-indigo-50 border border-indigo-100 p-3">
                      <div className="flex items-center gap-2 text-indigo-700 mb-1">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Tracked</span>
                      </div>
                      <p className="text-2xl font-black text-[#0F172A]">{report.summary.lessonsTracked}</p>
                    </div>
                    <div className="rounded-[14px] bg-emerald-50 border border-emerald-100 p-3">
                      <div className="flex items-center gap-2 text-emerald-700 mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Done</span>
                      </div>
                      <p className="text-2xl font-black text-[#0F172A]">{report.summary.completed}</p>
                    </div>
                    <div className="rounded-[14px] bg-amber-50 border border-amber-100 p-3">
                      <div className="flex items-center gap-2 text-amber-700 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">In progress</span>
                      </div>
                      <p className="text-2xl font-black text-[#0F172A]">{report.summary.inProgress}</p>
                    </div>
                    <div className="rounded-[14px] bg-violet-50 border border-violet-100 p-3">
                      <div className="flex items-center gap-2 text-violet-700 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wide">Avg score</span>
                      </div>
                      <p className="text-2xl font-black text-[#0F172A]">
                        {report.summary.averageScore != null ? `${report.summary.averageScore}%` : '—'}
                      </p>
                    </div>
                  </div>

                  {report.skillsNeedingPractice.length > 0 && (
                    <div>
                      <h3
                        className="text-sm font-bold text-[#0F172A] mb-2"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
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
                            <span className="text-xs text-amber-700 capitalize">({s.status})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h3
                      className="text-sm font-bold text-[#0F172A] mb-2"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      Recent lessons
                    </h3>
                    {report.recentLessons.length === 0 ? (
                      <p className="text-sm text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        No lesson progress yet. Start a lesson to build your report.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {report.recentLessons.slice(0, 12).map((row) => (
                          <Link
                            key={row.lessonId}
                            to={`/learner/lessons/${row.lessonId}`}
                            className="flex items-center justify-between gap-3 p-3 rounded-[12px] border border-slate-200 bg-white hover:border-indigo-300 transition-all print:border-slate-300"
                          >
                            <div className="min-w-0">
                              <p
                                className="text-sm font-semibold text-[#0F172A] truncate"
                                style={{ fontFamily: 'Manrope, sans-serif' }}
                              >
                                {row.title}
                              </p>
                              <p className="text-[11px] text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                {row.completed ? 'Completed' : `${row.progress}% progress`}
                              </p>
                            </div>
                            <span
                              className="text-sm font-bold text-indigo-700 shrink-0"
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
          </StaggeredEntry>
        </div>
      </div>

      <div className="print:hidden">
        <ModalityPreferencePrompt />
      </div>

      {searchQuery && filteredLessons.length === 0 && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-2xl p-8 overflow-y-auto animate-fade-in print:hidden">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2
                className="text-2xl font-black tracking-tight text-[#0F172A]"
                style={{ fontFamily: 'Fredoka, sans-serif' }}
              >
                No lessons found for "<span className="text-gradient">{searchQuery}</span>"
              </h2>
              <button
                onClick={() => setSearchQuery('')}
                className="p-3 rounded-3xl bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all font-black text-sm"
                style={{ fontFamily: 'Fredoka, sans-serif' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
