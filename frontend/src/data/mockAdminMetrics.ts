export interface AdminMetrics {
  totalLearners: number
  activeLearners: number
  totalLessons: number
  publishedLessons: number
  totalStrands: number
  totalCurriculumSubjects: number
  totalSubStrands: number
  averageEngagement: number
  completionRate: number
  lessonsByGrade: Record<string, number>
  lessonsByDifficulty: Record<string, number>
  lessonsByContentType: Record<string, number>
  recentActivity: {
    id: string
    type: 'lesson_created' | 'lesson_updated' | 'lesson_deleted' | 'user_registered'
    description: string
    timestamp: string
  }[]
}

export const mockMetrics: AdminMetrics = {
  totalLearners: 1284,
  activeLearners: 892,
  totalLessons: 452,
  publishedLessons: 398,
  totalStrands: 8,
  totalCurriculumSubjects: 42,
  totalSubStrands: 156,
  averageEngagement: 84,
  completionRate: 72,
  lessonsByGrade: {
    'K': 45,
    '1': 52,
    '2': 48,
    '3': 55,
    '4': 61,
    '5': 58,
    '6': 63,
    '11': 70,
  },
  lessonsByDifficulty: {
    beginner: 156,
    intermediate: 198,
    advanced: 98,
  },
  lessonsByContentType: {
    video: 180,
    interactive: 142,
    reading: 130,
  },
  recentActivity: [
    {
      id: '1',
      type: 'lesson_created',
      description: 'New lesson "Fundamentals of Drawing" was created',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      type: 'user_registered',
      description: '15 new learners registered today',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'lesson_updated',
      description: 'Lesson "Introduction to Numbers" was updated',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      type: 'lesson_deleted',
      description: 'Lesson "Old Content" was removed',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
}







