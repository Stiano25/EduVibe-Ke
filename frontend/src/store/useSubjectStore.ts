import { create } from 'zustand'
import type { Subject } from '@/types'
import { api } from '@/lib/api'

interface SubjectState {
  subjects: Subject[]
  isLoading: boolean
  error: string | null
  fetchSubjects: () => Promise<void>
  fetchSubjectsByCurriculumDesign: (curriculumDesignId: string) => Promise<void>
  fetchSubjectsByGrade: (grade: string) => Promise<void>
  addSubject: (subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateSubject: (id: string, subject: Partial<Subject>) => Promise<void>
  deleteSubject: (id: string) => Promise<void>
  getSubjectById: (id: string) => Subject | undefined
  getSubjectsByCurriculumDesign: (curriculumDesignId: string) => Subject[]
  getSubjectsByGrade: (grade: string) => Subject[]
}

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export const useSubjectStore = create<SubjectState>((set, get) => ({
  subjects: [],
  isLoading: false,
  error: null,

  fetchSubjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const subjects = await api.admin.getSubjects()
      set({ subjects, isLoading: false })
    } catch (error) {
      set({ error: toErrorMessage(error, 'Failed to fetch subjects'), isLoading: false })
    }
  },

  fetchSubjectsByCurriculumDesign: async (curriculumDesignId) => {
    set({ isLoading: true, error: null })
    try {
      const subjects = await api.admin.getSubjectsByCurriculumDesign(curriculumDesignId)
      set({ subjects, isLoading: false })
    } catch (error) {
      set({ error: toErrorMessage(error, 'Failed to fetch subjects'), isLoading: false })
    }
  },

  fetchSubjectsByGrade: async (grade) => {
    set({ isLoading: true, error: null })
    try {
      const subjects = await api.admin.getSubjectsByGrade(grade)
      set({ subjects, isLoading: false })
    } catch (error) {
      set({ error: toErrorMessage(error, 'Failed to fetch subjects'), isLoading: false })
    }
  },

  addSubject: async (subjectData) => {
    set({ isLoading: true, error: null })
    try {
      const newSubject = await api.admin.createSubject(subjectData)
      set((state) => ({ subjects: [...state.subjects, newSubject], isLoading: false }))
    } catch (error) {
      set({ error: toErrorMessage(error, 'Failed to create subject'), isLoading: false })
      throw error
    }
  },

  updateSubject: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updatedSubject = await api.admin.updateSubject(id, updates)
      set((state) => ({
        subjects: state.subjects.map((subject) =>
          subject.id === id ? updatedSubject : subject
        ),
        isLoading: false,
      }))
    } catch (error) {
      set({ error: toErrorMessage(error, 'Failed to update subject'), isLoading: false })
      throw error
    }
  },

  deleteSubject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.admin.deleteSubject(id)
      set((state) => ({
        subjects: state.subjects.filter((subject) => subject.id !== id),
        isLoading: false,
      }))
    } catch (error) {
      set({ error: toErrorMessage(error, 'Failed to delete subject'), isLoading: false })
      throw error
    }
  },

  getSubjectById: (id) => get().subjects.find((subject) => subject.id === id),

  getSubjectsByCurriculumDesign: (curriculumDesignId) =>
    get().subjects.filter((subject) => subject.curriculumDesignId === curriculumDesignId),

  getSubjectsByGrade: (grade) =>
    get().subjects.filter((subject) => subject.grade === grade),
}))
