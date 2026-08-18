import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { MetricCard } from '@/components/admin/MetricCard'
import {
  Users,
  BookOpen,
  Activity,
  Target,
  GraduationCap,
  Library,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Loader2,
} from 'lucide-react'
import { adminWorkflowSteps } from '@/config/adminNav'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { api } from '@/lib/api'

const stepIcons = [GraduationCap, Library, BookOpen]

type AnalyticsPayload = {
  users: { total: number; learners: number; admins: number }
  lessons: {
    total: number
    approved: number
    pending: number
    rejected: number
    aiGenerated: number
    manual: number
  }
  notes: { total: number }
  quizzes: { total: number }
}

export const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = (await api.admin.getAnalytics()) as AnalyticsPayload
        setAnalytics(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load snapshot')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const approvalRate =
    analytics && analytics.lessons.total > 0
      ? Math.round((analytics.lessons.approved / analytics.lessons.total) * 100)
      : 0

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="p-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6 max-w-6xl mx-auto">
          <StaggeredEntry>
            <div className="space-y-6">
              <AdminPageHeader
                title="Admin home"
                subtitle="Follow the curriculum flow below — each step is in the top navigation"
                icon={Target}
                iconClassName="from-indigo-500 to-violet-600"
                showWorkflow={false}
                actions={
                  <Link
                    to="/admin/analytics"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border-2 border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-white"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </Link>
                }
              />

              <section>
                <h2
                  className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  How to build content
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {adminWorkflowSteps.map((s, i) => {
                    const Icon = stepIcons[i] || BookOpen
                    return (
                      <Link
                        key={s.path}
                        to={s.path}
                        className="group bg-white/90 backdrop-blur-md rounded-[20px] border-2 border-slate-200 hover:border-indigo-300 transition-all p-5 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 text-sm font-bold"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                          >
                            {s.step}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shrink-0">
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p
                              className="text-base font-bold text-[#0F172A]"
                              style={{ fontFamily: 'Manrope, sans-serif' }}
                            >
                              {s.title}
                            </p>
                            <p
                              className="text-xs text-text-secondary mt-0.5"
                              style={{ fontFamily: 'Manrope, sans-serif' }}
                            >
                              {s.detail}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>

              <section>
                <h2
                  className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Also available
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link
                    to="/admin/users"
                    className="bg-white/80 rounded-[20px] border-2 border-slate-200 hover:border-orange-200 p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold text-[#0F172A]"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        Users
                      </p>
                      <p
                        className="text-xs text-text-secondary"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        Learners and admins
                      </p>
                    </div>
                  </Link>
                  <Link
                    to="/admin/reports"
                    className="bg-white/80 rounded-[20px] border-2 border-slate-200 hover:border-violet-200 p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold text-[#0F172A]"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        Reports
                      </p>
                      <p
                        className="text-xs text-text-secondary"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        Strengths and weaknesses
                      </p>
                    </div>
                  </Link>
                  <Link
                    to="/admin/analytics"
                    className="bg-white/80 rounded-[20px] border-2 border-slate-200 hover:border-blue-200 p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold text-[#0F172A]"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        Analytics
                      </p>
                      <p
                        className="text-xs text-text-secondary"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        Full charts and breakdowns
                      </p>
                    </div>
                  </Link>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2
                    className="text-sm font-semibold text-text-secondary uppercase tracking-wide"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    Snapshot
                  </h2>
                  <Link
                    to="/admin/analytics"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    View details →
                  </Link>
                </div>

                {loading && (
                  <div className="bg-white/80 rounded-[20px] border-2 border-slate-200 p-8 flex items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Loading live counts…
                    </span>
                  </div>
                )}

                {error && !analytics && (
                  <div className="bg-red-50 rounded-[20px] border-2 border-red-200 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {analytics && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <MetricCard
                      title="Learners"
                      value={analytics.users.learners}
                      subtitle={`${analytics.users.total} total users · ${analytics.users.admins} admins`}
                      icon={Users}
                      iconColor="bg-orange-100 text-orange-600"
                    />
                    <MetricCard
                      title="Approved lessons"
                      value={analytics.lessons.approved}
                      subtitle={`of ${analytics.lessons.total} total`}
                      icon={BookOpen}
                      iconColor="bg-pink-100 text-pink-600"
                    />
                    <MetricCard
                      title="Pending review"
                      value={analytics.lessons.pending}
                      subtitle={`${analytics.lessons.aiGenerated} AI-generated`}
                      icon={Activity}
                      iconColor="bg-blue-100 text-blue-600"
                    />
                    <MetricCard
                      title="Approval rate"
                      value={`${approvalRate}%`}
                      subtitle={`${analytics.quizzes.total} quizzes · ${analytics.notes.total} notes`}
                      icon={Target}
                      iconColor="bg-teal-100 text-teal-600"
                    />
                  </div>
                )}
              </section>
            </div>
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}
