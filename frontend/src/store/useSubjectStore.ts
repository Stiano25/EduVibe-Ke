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
      console.error('Error fetching subjects:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch subjects', isLoading: false })
    }
  },
  
  fetchSubjectsByCurriculumDesign: async (curriculumDesignId: string) => {
    set({ isLoading: true, error: null })
    try {
      const subjects = await api.admin.getSubjectsByCurriculumDesign(curriculumDesignId)
      set({ subjects, isLoading: false })
    } catch (error) {
      console.error('Error fetching subjects by curriculum design:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch subjects', isLoading: false })
    }
  },
  
  fetchSubjectsByGrade: async (grade: string) => {
    set({ isLoading: true, error: null })
    try {
      const subjects = await api.admin.getSubjectsByGrade(grade)
      set({ subjects, isLoading: false })
    } catch (error) {
      console.error('Error fetching subjects by grade:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch subjects', isLoading: false })
    }
  },
  
  addSubject: async (subjectData) => {
    set({ isLoading: true, error: null })
    try {
      const newSubject = await api.admin.createSubject(subjectData)
      set((state) => ({ subjects: [...state.subjects, newSubject], isLoading: false }))
    } catch (error) {
      console.error('Error creating subject:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to create subject', isLoading: false })
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
        isLoading: false
      }))
    } catch (error) {
      console.error('Error updating subject:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to update subject', isLoading: false })
      throw error
    }
  },
  
  deleteSubject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.admin.deleteSubject(id)
      set((state) => ({
        subjects: state.subjects.filter((subject) => subject.id !== id),
        isLoading: false
      }))
    } catch (error) {
      console.error('Error deleting subject:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to delete subject', isLoading: false })
      throw error
    }
  },
  
  getSubjectById: (id) => {
    return get().subjects.find((subject) => subject.id === id)
  },
  
  getSubjectsByCurriculumDesign: (curriculumDesignId) => {
    return get().subjects.filter((subject) => subject.curriculumDesignId === curriculumDesignId)
  },
  
  getSubjectsByGrade: (grade) => {
    return get().subjects.filter((subject) => subject.grade === grade)
  },
  
}))

