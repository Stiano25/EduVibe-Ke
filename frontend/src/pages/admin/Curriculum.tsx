import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { ArrowLeft, GraduationCap, Info } from 'lucide-react'

export const AdminCurriculum = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to subjects page since curriculum designs are now managed through subjects
    navigate('/admin/subjects', { replace: true })
  }, [navigate])

  // Show a message while redirecting (or if redirect fails)
  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="p-[5px] pt-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
          <StaggeredEntry>
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <Link
                  to="/admin"
                  className="p-1.5 sm:p-2 rounded-full bg-white/80 backdrop-blur-md border-2 border-slate-200 hover:bg-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                </Link>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Curriculum Designs
                    </h1>
                    <p className="text-xs text-text-secondary hidden sm:block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Redirecting to Subjects...
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Message */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-[20px] p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Curriculum Designs are Managed Through Subjects
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-800 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Curriculum designs are now automatically created when you create a subject. Each subject gets its own curriculum design with the format: <strong>Grade{'{number}'}_{'{SubjectName}'}_Curriculum Design</strong>
                    </p>
                    <Link
                      to="/admin/subjects"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all text-xs sm:text-sm"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      Go to Manage Subjects
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}
