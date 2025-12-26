import { useLessonStore } from '@/store/useLessonStore'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { 
  TrendingUp, BarChart3, Users, BookOpen, 
  Download, Filter, Calendar, ArrowUpRight, Target
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export const AdminAnalytics = () => {
  const { lessons } = useLessonStore()
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, 
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
      )
    }
  }, [])

  const gradeData = lessons.reduce((acc, lesson) => {
    acc[lesson.grade] = (acc[lesson.grade] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(gradeData).map(([grade, count]) => ({
    grade: `Grade ${grade}`,
    count,
  }))

  const contentTypeData = lessons.reduce((acc, lesson) => {
    acc[lesson.contentType] = (acc[lesson.contentType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(contentTypeData).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  const PIE_COLORS = ['#7C3AED', '#FF6B35', '#4ECDC4', '#A78BFA']

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="p-[5px] pt-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
          <StaggeredEntry>
            {/* Header Section */}
            <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Platform <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Analytics</span>
                </h1>
                <p className="text-xs text-text-secondary mt-1 hidden sm:block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Analyze performance and engagement
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border-2 border-slate-200 hover:bg-white transition-all text-xs font-semibold text-slate-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <Filter className="w-3.5 h-3.5" /> Filter
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg text-xs" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Avg. Engagement', value: '84%', icon: Target, trend: '+12.5%', iconColor: 'bg-indigo-100 text-indigo-600' },
                { label: 'Active Students', value: '1,284', icon: Users, trend: '+8.2%', iconColor: 'bg-purple-100 text-purple-600' },
                { label: 'Lessons Completed', value: '452', icon: BookOpen, trend: '+15.1%', iconColor: 'bg-emerald-100 text-emerald-600' },
                { label: 'Retention Rate', value: '92%', icon: TrendingUp, trend: '+2.4%', iconColor: 'bg-cyan-100 text-cyan-600' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-5 relative overflow-hidden">
                  <div className={`w-12 h-12 rounded-full ${stat.iconColor} flex items-center justify-center mb-4`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>{stat.label}</p>
                  <h3 className="text-2xl font-bold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>{stat.value}</h3>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    <ArrowUpRight className="w-3 h-3" strokeWidth={3} /> {stat.trend}
                  </div>
                </div>
              ))}
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
              {/* Lessons by Grade - Bar Chart */}
              <div className="lg:col-span-8 bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>Grade Distribution</h2>
                  </div>
                  <select className="bg-white/70 backdrop-blur-md border-2 border-slate-300 rounded-full px-3 py-1.5 text-xs font-medium outline-none" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    <option>Last 30 Days</option>
                    <option>Last 6 Months</option>
                  </select>
                </div>
                
                <div className="h-[300px] sm:h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C3AED" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#A855F7" stopOpacity={0.6}/>
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
                          padding: '12px 16px'
                        }}
                        labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#1e293b' }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="url(#barGradient)" 
                        radius={[10, 10, 0, 0]}
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lessons by Content Type - Pie Chart */}
              <div className="lg:col-span-4 bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-4 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>Content Mix</h2>
                </div>
                
                <div className="flex-1 min-h-[250px] relative">
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
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
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
                    <p className="text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>{lessons.length}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>Total Lessons</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {pieData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                        <span className="text-xs font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>{Math.round((item.value / lessons.length) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Engagement Over Time */}
            <div className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>Engagement Trend</h2>
                </div>
                <div className="flex gap-2">
                  {['Day', 'Week', 'Month', 'Year'].map(t => (
                    <button key={t} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${t === 'Month' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-white/70 text-text-secondary hover:bg-white border-2 border-slate-200'}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[250px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Jan', value: 400 }, { name: 'Feb', value: 300 }, { name: 'Mar', value: 600 },
                    { name: 'Apr', value: 800 }, { name: 'May', value: 500 }, { name: 'Jun', value: 900 },
                    { name: 'Jul', value: 1100 }
                  ]}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                    />
                    <YAxis 
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
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#7C3AED" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#areaGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}
