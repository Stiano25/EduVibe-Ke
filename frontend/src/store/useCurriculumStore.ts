import { create } from 'zustand'
import type { CurriculumDesign, Grade } from '@/types'
import { api } from '@/lib/api'

interface CurriculumState {
  curriculumDesigns: CurriculumDesign[]
  isLoading: boolean
  error: string | null
  fetchCurriculumDesigns: () => Promise<void>
  fetchCurriculumDesignsByGrade: (grade: Grade) => Promise<void>
  addCurriculumDesign: (design: Omit<CurriculumDesign, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateCurriculumDesign: (id: string, design: Partial<CurriculumDesign>) => Promise<void>
  deleteCurriculumDesign: (id: string) => Promise<void>
  getCurriculumDesignById: (id: string) => CurriculumDesign | undefined
  getCurriculumDesignsByGrade: (grade: Grade) => CurriculumDesign[]
  getGrades: () => Grade[]
}

export const useCurriculumStore = create<CurriculumState>((set, get) => ({
  curriculumDesigns: [],
  isLoading: false,
  error: null,
  
  fetchCurriculumDesigns: async () => {
    set({ isLoading: true, error: null })
    try {
      const designs = await api.admin.getCurriculumDesigns()
      set({ curriculumDesigns: designs, isLoading: false })
    } catch (error) {
      console.error('Error fetching curriculum designs:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch curriculum designs', isLoading: false })
    }
  },
  
  fetchCurriculumDesignsByGrade: async (grade: Grade) => {
    set({ isLoading: true, error: null })
    try {
      const designs = await api.admin.getCurriculumDesignsByGrade(grade)
      set({ curriculumDesigns: designs, isLoading: false })
    } catch (error) {
      console.error('Error fetching curriculum designs by grade:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch curriculum designs', isLoading: false })
    }
  },
  
  addCurriculumDesign: async (designData) => {
    set({ isLoading: true, error: null })
    try {
      const newDesign = await api.admin.createCurriculumDesign(designData)
      set((state) => ({ curriculumDesigns: [...state.curriculumDesigns, newDesign], isLoading: false }))
    } catch (error) {
      console.error('Error creating curriculum design:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to create curriculum design', isLoading: false })
      throw error
    }
  },
  
  updateCurriculumDesign: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updatedDesign = await api.admin.updateCurriculumDesign(id, updates)
      set((state) => ({
        curriculumDesigns: state.curriculumDesigns.map((design) =>
          design.id === id ? updatedDesign : design
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('Error updating curriculum design:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to update curriculum design', isLoading: false })
      throw error
    }
  },
  
  deleteCurriculumDesign: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.admin.deleteCurriculumDesign(id)
      set((state) => ({
        curriculumDesigns: state.curriculumDesigns.filter((design) => design.id !== id),
        isLoading: false
      }))
    } catch (error) {
      console.error('Error deleting curriculum design:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to delete curriculum design', isLoading: false })
      throw error
    }
  },
  
  getCurriculumDesignById: (id) => {
    return get().curriculumDesigns.find((design) => design.id === id)
  },
  
  getCurriculumDesignsByGrade: (grade) => {
    return get().curriculumDesigns.filter((design) => design.grade === grade)
  },
  
  getGrades: () => {
    const designs = get().curriculumDesigns
    const uniqueGrades = Array.from(new Set(designs.map((d) => d.grade)))
    return uniqueGrades.sort((a, b) => {
      if (a === 'K') return -1
      if (b === 'K') return 1
      return parseInt(a) - parseInt(b)
    }) as Grade[]
  },
}))

