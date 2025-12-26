import { Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { MetricCard } from '@/components/admin/MetricCard'
import { mockMetrics } from '@/data/mockAdminMetrics'
import { Users, BookOpen, Activity, GraduationCap, Target, FileText } from 'lucide-react'

export const AdminDashboard = () => {

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="p-[5px] pt-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
          <StaggeredEntry>
            <div className="space-y-4">
              {/* Header */}
              <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    EduVibe Control Centre
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Manage curriculum, lessons, and monitor platform engagement
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to="/admin/analytics">
                    <button className="px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border-2 border-slate-200 hover:bg-white transition-all text-xs sm:text-sm font-semibold text-slate-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Analytics
                    </button>
                  </Link>
                </div>
              </header>

              {/* Metrics Grid */}
              <section>
                <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Platform Metrics
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard
                    title="Active Learners"
                    value={mockMetrics.activeLearners}
                    subtitle={`of ${mockMetrics.totalLearners} total`}
                    icon={Users}
                    iconColor="bg-orange-100 text-orange-600"
                    trend={{ value: '+8.2%', isPositive: true }}
                  />
                  <MetricCard
                    title="Published Lessons"
                    value={mockMetrics.publishedLessons}
                    subtitle={`of ${mockMetrics.totalLessons} total`}
                    icon={BookOpen}
                    iconColor="bg-pink-100 text-pink-600"
                  />
                  <MetricCard
                    title="Average Engagement"
                    value={`${mockMetrics.averageEngagement}%`}
                    subtitle="across all lessons"
                    icon={Activity}
                    iconColor="bg-blue-100 text-blue-600"
                    trend={{ value: '+12.5%', isPositive: true }}
                  />
                  <MetricCard
                    title="Completion Rate"
                    value={`${mockMetrics.completionRate}%`}
                    subtitle="lesson completion"
                    icon={Target}
                    iconColor="bg-teal-100 text-teal-600"
                  />
                </div>
              </section>

              {/* Management Sections */}
              <section>
                <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Management
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link to="/admin/subjects" className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-indigo-200 hover:border-indigo-300 transition-all p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Manage Subjects
                      </p>
                      <p className="text-xs text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Create subjects with curriculum designs
                      </p>
                    </div>
                  </Link>
                  <Link to="/admin/subjects" className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-purple-200 hover:border-purple-300 transition-all p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Manage Subjects
                      </p>
                      <p className="text-xs text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Create subjects from curriculum designs
                      </p>
                    </div>
                  </Link>
                  <Link to="/admin/lessons" className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-cyan-200 hover:border-cyan-300 transition-all p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Manage Lessons
                      </p>
                      <p className="text-xs text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        AI-generated lessons from subjects
                      </p>
                    </div>
                  </Link>
                </div>
              </section>
            </div>
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}
