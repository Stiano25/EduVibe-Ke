import { useState } from 'react'
import { useLessonStore } from '@/store/useLessonStore'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { WelcomeHeader } from '@/components/learner/WelcomeHeader'
import { SearchBar } from '@/components/learner/SearchBar'
import { SubjectNavigation } from '@/components/learner/SubjectNavigation'
import { DailyExerciseCard } from '@/components/learner/DailyExerciseCard'
import { AvailableQuizzes } from '@/components/learner/AvailableQuizzes'

const mockQuizzes = [
  { id: '1', title: 'Math Basics Quiz', subject: 'Math', questions: 10, duration: 15 },
  { id: '2', title: 'Science Knowledge Test', subject: 'Science', questions: 12, duration: 20 },
  { id: '3', title: 'Language Skills Challenge', subject: 'Language', questions: 8, duration: 12 },
  { id: '4', title: 'Art History Quiz', subject: 'Art', questions: 15, duration: 25 },
]

export const LearnerDashboard = () => {
  const { lessons } = useLessonStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [quizzes] = useState(mockQuizzes)

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch = !searchQuery || 
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  const handleQuizClick = (quizId: string) => {
    console.log('Navigate to quiz:', quizId)
  }

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Fredoka, sans-serif' }}>
      <div className="p-[5px] pt-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
          <StaggeredEntry>
            <WelcomeHeader />
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <SubjectNavigation />
            <DailyExerciseCard />
            <AvailableQuizzes quizzes={quizzes} onQuizClick={handleQuizClick} />
          </StaggeredEntry>
        </div>
      </div>

      {searchQuery && filteredLessons.length === 0 && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-2xl p-8 overflow-y-auto animate-fade-in">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black tracking-tight text-[#0F172A]" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                No lessons found for "<span className="text-gradient">{searchQuery}</span>"
              </h2>
              <button 
                onClick={() => setSearchQuery('')}
                className="p-3 rounded-3xl bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all font-black text-sm"
                style={{ fontFamily: 'Fredoka, sans-serif' }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(2px)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = ''
                }}
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
