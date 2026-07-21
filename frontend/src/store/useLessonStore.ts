import { create } from 'zustand'
import type { Lesson } from '@/types'
import { api } from '@/lib/api'

interface LessonState {
  lessons: Lesson[]
  isLoading: boolean
  error: string | null
  fetchLessons: () => Promise<void>
  fetchLessonsByStrand: (strandId: string) => Promise<void>
  fetchLessonsBySubStrand: (subStrandId: string) => Promise<void>
  fetchLessonsBySubject: (subjectId: string) => Promise<void>
  fetchLessonsByStatus: (status: string) => Promise<void>
  clearLessons: () => void
  addLesson: (lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateLesson: (id: string, lesson: Partial<Lesson>) => Promise<void>
  deleteLesson: (id: string) => Promise<void>
  getLessonById: (id: string) => Lesson | undefined
  getLessonsByStrand: (strandId: string) => Lesson[]
  getLessonsBySubject: (subjectId: string) => Lesson[]
  approveLesson: (id: string) => Promise<void>
  rejectLesson: (id: string) => Promise<void>
  addAIGeneratedLessons: (lessons: Lesson[]) => Promise<void>
}

export const useLessonStore = create<LessonState>((set, get) => ({
  lessons: [],
  isLoading: false,
  error: null,
  
  fetchLessons: async () => {
    set({ isLoading: true, error: null })
    try {
      const lessons = await api.admin.getLessons()
      set({ lessons, isLoading: false })
    } catch (error) {
      console.error('Error fetching lessons:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch lessons', isLoading: false })
    }
  },
  
  fetchLessonsByStrand: async (strandId: string) => {
    set({ isLoading: true, error: null })
    try {
      const lessons = await api.admin.getLessonsByStrand(strandId)
      set({ lessons, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch lessons', isLoading: false })
    }
  },

  fetchLessonsBySubStrand: async (subStrandId: string) => {
    set({ isLoading: true, error: null })
    try {
      const lessons = await api.admin.getLessonsBySubStrand(subStrandId)
      set({ lessons, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch lessons', isLoading: false })
    }
  },

  clearLessons: () => {
    set({ lessons: [], error: null })
  },
  
  fetchLessonsBySubject: async (subjectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const lessons = await api.admin.getLessonsBySubject(subjectId)
      set({ lessons, isLoading: false })
    } catch (error) {
      console.error('Error fetching lessons by subject:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch lessons', isLoading: false })
    }
  },
  
  fetchLessonsByStatus: async (status: string) => {
    set({ isLoading: true, error: null })
    try {
      const lessons = await api.admin.getLessonsByStatus(status)
      set({ lessons, isLoading: false })
    } catch (error) {
      console.error('Error fetching lessons by status:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch lessons', isLoading: false })
    }
  },
  
  addLesson: async (lessonData) => {
    set({ isLoading: true, error: null })
    try {
      const newLesson = await api.admin.createLesson(lessonData)
      set((state) => ({ lessons: [...state.lessons, newLesson], isLoading: false }))
    } catch (error) {
      console.error('Error creating lesson:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to create lesson', isLoading: false })
      throw error
    }
  },
  
  addAIGeneratedLessons: async (newLessons) => {
    set((state) => ({ lessons: [...state.lessons, ...newLessons] }))
  },
  
  updateLesson: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updatedLesson = await api.admin.updateLesson(id, updates)
      set((state) => ({
        lessons: state.lessons.map((lesson) =>
          lesson.id === id ? updatedLesson : lesson
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('Error updating lesson:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to update lesson', isLoading: false })
      throw error
    }
  },
  
  deleteLesson: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.admin.deleteLesson(id)
      set((state) => ({
        lessons: state.lessons.filter((lesson) => lesson.id !== id),
        isLoading: false
      }))
    } catch (error) {
      console.error('Error deleting lesson:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to delete lesson', isLoading: false })
      throw error
    }
  },
  
  approveLesson: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const updatedLesson = await api.admin.approveLesson(id)
      set((state) => ({
        lessons: state.lessons.map((lesson) =>
          lesson.id === id ? updatedLesson : lesson
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('Error approving lesson:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to approve lesson', isLoading: false })
      throw error
    }
  },
  
  rejectLesson: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const updatedLesson = await api.admin.rejectLesson(id)
      set((state) => ({
        lessons: state.lessons.map((lesson) =>
          lesson.id === id ? updatedLesson : lesson
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('Error rejecting lesson:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to reject lesson', isLoading: false })
      throw error
    }
  },
  
  getLessonById: (id) => {
    return get().lessons.find((lesson) => lesson.id === id)
  },
  
  getLessonsByStrand: (strandId) => {
    return get().lessons.filter((lesson) => lesson.strandId === strandId)
  },
  
  getLessonsBySubject: (subjectId) => {
    return get().lessons.filter((lesson) => lesson.subjectId === subjectId)
  },
}))
