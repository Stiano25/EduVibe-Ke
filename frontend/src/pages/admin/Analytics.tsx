import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import {
  TrendingUp,
  BarChart3,
  Users,
  BookOpen,
  HelpCircle,
  FileText,
} from 'lucide-react'
import gsap from 'gsap'
import { api } from '@/lib/api'

type AnalyticsPayload = {
  users: { total: number; learners: number; admins: number }
  lessons: {
    total: number
    approved: number
    pending: number
    rejected: number
    aiGenerated: number
    manual: number
    byGrade: Record<string, number>
    byDifficulty: Record<string, number>
    byContentType: Record<string, number>
  }
  notes: { total: number }
  quizzes: { total: number }
}

const PIE_COLORS = ['#7C3AED', '#FF6B35', '#4ECDC4', '#A78BFA', '#F59E0B']

export const AdminAnalytics = () => {
  const headerRef = useRef<HTMLDivElement>(null)
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
      )
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await api.admin.getAnalytics()
        setAnalytics(data as AnalyticsPayload)
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const chartData = useMemo(() => {
    if (!analytics) return []
    return Object.entries(analytics.lessons.byGrade)
      .sort(([a], [b]) => {
        if (a === 'K') return -1
        if (b === 'K') return 1
        return Number(a) - Number(b)
      })
      .map(([grade, count]) => ({
        grade: grade === 'K' ? 'K' : `G${grade}`,
        count,
      }))
  }, [analytics])

  const pieData = useMemo(() => {
    if (!analytics) return []
    return Object.entries(analytics.lessons.byContentType).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
  }, [analytics])

  const statusData = useMemo(() => {
    if (!analytics) return []
    return [
      { name: 'Approved', count: analytics.lessons.approved },
      { name: 'Pending', count: analytics.lessons.pending },
      { name: 'Rejected', count: analytics.lessons.rejected },
    ]
  }, [analytics])

  const totalLessons = analytics?.lessons.total || 0

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="p-[5px] pt-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
          <StaggeredEntry>
            <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Platform <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Analytics</span>
                </h1>
                <p className="text-xs text-text-secondary mt-1 hidden sm:block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Live counts from your curriculum and users
                </p>
              </div>
            </div>

            {loading && (
              <div className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-12 text-center mb-4">
                <p className="text-lg font-semibold text-[#0F172A]">Loading analytics...</p>
              </div>
            )}

            {error && !analytics && (
              <div className="bg-red-50 backdrop-blur-md rounded-[24px] border-2 border-red-200 p-12 text-center mb-4">
                <p className="text-lg font-semibold text-red-700 mb-2">Failed to load analytics</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {analytics && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {[
                    {
                      label: 'Learners',
                      value: String(analytics.users.learners),
                      icon: Users,
                      iconColor: 'bg-purple-100 text-purple-600',
                    },
                    {
                      label: 'Total Lessons',
                      value: String(analytics.lessons.total),
                      icon: BookOpen,
                      iconColor: 'bg-indigo-100 text-indigo-600',
                    },
                    {
                      label: 'Approved Lessons',
                      value: String(analytics.lessons.approved),
                      icon: TrendingUp,
                      iconColor: 'bg-emerald-100 text-emerald-600',
                    },
                    {
                      label: 'Quizzes',
                      value: String(analytics.quizzes.total),
                      icon: HelpCircle,
                      iconColor: 'bg-cyan-100 text-cyan-600',
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-5 relative overflow-hidden"
                    >
                      <div className={`w-12 h-12 rounded-full ${stat.iconColor} flex items-center justify-center mb-4`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">
                        {stat.label}
                      </p>
                      <h3 className="text-2xl font-bold text-[#0F172A]">{stat.value}</h3>
                      {stat.label === 'Quizzes' && (
                        <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {analytics.notes.total} notes
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
                  <div className="lg:col-span-8 bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-bold text-[#0F172A]">Lessons by Grade</h2>
                    </div>

                    <div className="h-[300px] sm:h-[350px] w-full">
                      {chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm text-text-secondary">
                          No lesson grade data yet
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#7C3AED" stopOpacity={1} />
                                <stop offset="100%" stopColor="#A855F7" stopOpacity={0.6} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                              dataKey="grade"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                              dy={10}
                            />
                            <YAxis
                              allowDecimals={false}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                            />
                            <Tooltip
                              cursor={{ fill: '#f1f5f9' }}
                              contentStyle={{
                                borderRadius: '16px',
                                border: 'none',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                backdropFilter: 'blur(10px)',
                                padding: '12px 16px',
                              }}
                            />
                            <Bar dataKey="count" fill="url(#barGradient)" radius={[10, 10, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-4 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-bold text-[#0F172A]">Content Mix</h2>
                    </div>

                    <div className="flex-1 min-h-[250px] relative">
                      {pieData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm text-text-secondary">
                          No content-type data yet
                        </div>
                      ) : (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={8}
                                dataKey="value"
                              >
                                {pieData.map((_, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                    stroke="none"
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  borderRadius: '16px',
                                  border: 'none',
                                  boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                                  backgroundColor: 'rgba(255,255,255,0.9)',
                                  backdropFilter: 'blur(10px)',
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-3xl font-bold text-[#0F172A]">{totalLessons}</p>
                            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                              Total Lessons
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mt-6 space-y-3">
                      {pieData.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                            <span className="text-xs font-semibold text-[#0F172A]">{item.name}</span>
                          </div>
                          <span className="text-xs font-bold text-text-secondary">
                            {totalLessons ? Math.round((item.value / totalLessons) * 100) : 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-[#0F172A]">Lesson Status</h2>
                  </div>

                  <div className="h-[250px] sm:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '16px',
                            border: 'none',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            backdropFilter: 'blur(10px)',
                          }}
                        />
                        <Bar dataKey="count" fill="#4ECDC4" radius={[10, 10, 0, 0]} barSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-text-secondary">AI generated</p>
                      <p className="text-lg font-bold text-[#0F172A]">{analytics.lessons.aiGenerated}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-text-secondary">Manual</p>
                      <p className="text-lg font-bold text-[#0F172A]">{analytics.lessons.manual}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-text-secondary">Admins</p>
                      <p className="text-lg font-bold text-[#0F172A]">{analytics.users.admins}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs text-text-secondary">All users</p>
                      <p className="text-lg font-bold text-[#0F172A]">{analytics.users.total}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}
