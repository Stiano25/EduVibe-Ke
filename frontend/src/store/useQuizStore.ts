import { create } from 'zustand'
import type { Quiz } from '@/types'
import { api } from '@/lib/api'

interface QuizState {
  quizzes: Quiz[]
  isLoading: boolean
  error: string | null
  fetchQuizzes: () => Promise<void>
  fetchQuizzesByLink: (type: 'note' | 'substrand', id: string) => Promise<void>
  fetchQuizzesByGrade: (grade: string) => Promise<void>
  addQuiz: (quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateQuiz: (id: string, quiz: Partial<Quiz>) => Promise<void>
  deleteQuiz: (id: string) => Promise<void>
  getQuizById: (id: string) => Quiz | undefined
  getQuizzesByLink: (type: 'note' | 'substrand', id: string) => Quiz[]
}

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: [],
  isLoading: false,
  error: null,
  
  fetchQuizzes: async () => {
    set({ isLoading: true, error: null })
    try {
      const quizzes = await api.admin.getQuizzes()
      set({ quizzes, isLoading: false })
    } catch (error) {
      console.error('Error fetching quizzes:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch quizzes', isLoading: false })
    }
  },
  
  fetchQuizzesByLink: async (type: 'note' | 'substrand', id: string) => {
    set({ isLoading: true, error: null })
    try {
      const quizzes = await api.admin.getQuizzesByLink(type, id)
      set({ quizzes, isLoading: false })
    } catch (error) {
      console.error('Error fetching quizzes by link:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch quizzes', isLoading: false })
    }
  },
  
  fetchQuizzesByGrade: async (grade: string) => {
    set({ isLoading: true, error: null })
    try {
      const quizzes = await api.admin.getQuizzesByGrade(grade)
      set({ quizzes, isLoading: false })
    } catch (error) {
      console.error('Error fetching quizzes by grade:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch quizzes', isLoading: false })
    }
  },
  
  addQuiz: async (quizData) => {
    set({ isLoading: true, error: null })
    try {
      const newQuiz = await api.admin.createQuiz(quizData)
      set((state) => ({ quizzes: [...state.quizzes, newQuiz], isLoading: false }))
    } catch (error) {
      console.error('Error creating quiz:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to create quiz', isLoading: false })
      throw error
    }
  },
  
  updateQuiz: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updatedQuiz = await api.admin.updateQuiz(id, updates)
      set((state) => ({
        quizzes: state.quizzes.map((quiz) =>
          quiz.id === id ? updatedQuiz : quiz
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('Error updating quiz:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to update quiz', isLoading: false })
      throw error
    }
  },
  
  deleteQuiz: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.admin.deleteQuiz(id)
      set((state) => ({
        quizzes: state.quizzes.filter((quiz) => quiz.id !== id),
        isLoading: false
      }))
    } catch (error) {
      console.error('Error deleting quiz:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to delete quiz', isLoading: false })
      throw error
    }
  },
  
  getQuizById: (id) => {
    return get().quizzes.find((quiz) => quiz.id === id)
  },
  
  getQuizzesByLink: (type, id) => {
    return get().quizzes.filter(
      (quiz) => quiz.linkedTo?.type === type && quiz.linkedTo?.id === id
    )
  },
}))

