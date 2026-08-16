import { useLessonStore } from '@/store/useLessonStore'
import { mockRecommendations } from '@/data/mockRecommendations'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { usesQuestNavigation } from '@/lib/complexityBands'

export const LearnerRecommendations = () => {
  const questNav = usesQuestNavigation(useAuthStore((s) => s.user)?.grade)
  const { lessons } = useLessonStore()

  if (questNav) {
    return <Navigate to="/learner" replace />
  }

  const recommendations = mockRecommendations
    .map(rec => ({
      ...rec,
      lesson: lessons.find(l => l.id === rec.lessonId),
    }))
    .filter(item => item.lesson)

  return (
    <StaggeredEntry>
      <div className="section-spacing">
        <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] mb-4">AI Recommendations</h1>
        <p className="text-lg text-gray-600 mb-section">
          Personalized lesson recommendations based on your learning progress
        </p>

        <div className="space-y-6">
          {recommendations.length > 0 ? (
            recommendations.map((rec) => (
              <div key={rec.id} className="py-6">
                <div className="mb-2">
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                    rec.priority === 'high' 
                      ? 'bg-primary text-white' 
                      : rec.priority === 'medium'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {rec.priority === 'high' ? 'High Priority' : rec.priority === 'medium' ? 'Medium Priority' : 'Low Priority'}
                  </span>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">{rec.lesson!.title}</h3>
                <p className="text-gray-600 mb-2">{rec.lesson!.description}</p>
                <p className="text-sm text-primary mb-4 font-medium">{rec.reason}</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                  <span>Grade {rec.lesson!.grade}</span>
                  <span>•</span>
                  <span className="capitalize">{rec.lesson!.difficulty}</span>
                  <span>•</span>
                  <span className="capitalize">{rec.lesson!.contentType}</span>
                  <span>•</span>
                  <span>{rec.lesson!.duration} minutes</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {rec.lesson!.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link to={`/learner/lessons/${rec.lesson!.id}`}>
                  <button className="text-primary font-medium hover:text-primary-dark transition-colors">
                    Start Lesson →
                  </button>
                </Link>
              </div>
            ))
          ) : (
            <p className="text-gray-600">No recommendations available at the moment. Check back later!</p>
          )}
        </div>
      </div>
    </StaggeredEntry>
  )
}

