import { Play } from 'lucide-react'

interface Quiz {
  id: string
  title: string
  subject: string
  questions: number
  duration: number
}

interface AvailableQuizzesProps {
  quizzes: Quiz[]
  onQuizClick: (quizId: string) => void
}

export const AvailableQuizzes = ({ quizzes, onQuizClick }: AvailableQuizzesProps) => {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md lg:max-w-lg space-y-4">
        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/90 to-cyan-50/90 backdrop-blur-md rounded-[32px] border-2 border-emerald-200/50 shadow-lg p-4 md:p-5" style={{ fontFamily: 'Inter, sans-serif' }}>
          <h3 className="text-sm md:text-base font-semibold text-[#0F172A] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Available Quizzes
          </h3>
          <div className="space-y-2">
            {quizzes.map((quiz, index) => (
              <div
                key={quiz.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-emerald-200/40 p-3 cursor-pointer transition-all relative hover:scale-[1.02] shadow-sm"
                style={{ 
                  transform: `rotate(-1deg) translateY(${index * 1}px)`,
                  fontFamily: 'Inter, sans-serif'
                }}
                onClick={() => onQuizClick(quiz.id)}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = `rotate(-1deg) translateY(${index * 1 + 1}px) scale(0.98)`
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = `rotate(-1deg) translateY(${index * 1}px)`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = `rotate(-1deg) translateY(${index * 1}px)`
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Play className="w-4 h-4 text-white" fill="currentColor" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-semibold text-[#0F172A] mb-0.5 line-clamp-1">
                      {quiz.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] md:text-xs text-text-secondary">
                      <span>{quiz.questions} questions</span>
                      <span>•</span>
                      <span>{quiz.duration}m</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

