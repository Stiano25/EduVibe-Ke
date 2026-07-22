import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { KnowledgeBankPanel } from '@/components/admin/KnowledgeBankPanel'
import { useSubjectStore } from '@/store/useSubjectStore'
import { Library, ArrowRight, BookOpen } from 'lucide-react'

export const AdminKnowledgeBank = () => {
  const { subjects, fetchSubjects } = useSubjectStore()

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="p-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] border-white/40 p-4 sm:p-5 md:p-6 max-w-5xl mx-auto">
          <StaggeredEntry>
            <div className="space-y-5">
              <AdminPageHeader
                title="Exam / knowledge bank"
                subtitle="Past papers ground AI quizzes — cheaper and more accurate than fine-tuning"
                icon={Library}
                iconClassName="from-teal-500 to-cyan-600"
                actions={
                  <Link
                    to="/admin/lessons"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    <BookOpen className="w-4 h-4" />
                    Generate lessons
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                }
              />

              <div className="rounded-[16px] border-2 border-teal-100 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
                <p style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <strong>When to use:</strong> After you have subjects set up, upload grade-tagged
                  exams here. Then generate lessons — the AI matches difficulty and distractor style
                  without copying wording.
                </p>
              </div>

              <KnowledgeBankPanel subjects={subjects} />
            </div>
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}
