import { create } from 'zustand'
import { SubStrand } from '@/types'
import { api } from '@/lib/api'

interface SubStrandStore {
  subStrands: SubStrand[]
  isLoading: boolean
  error: string | null
  fetchSubStrands: () => Promise<void>
  fetchSubStrandsByStrand: (strandId: string) => Promise<void>
  fetchSubStrandsBySubject: (subjectId: string) => Promise<void>
  addSubStrand: (subStrand: Omit<SubStrand, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateSubStrand: (id: string, subStrand: Partial<SubStrand>) => Promise<void>
  deleteSubStrand: (id: string) => Promise<void>
  getSubStrandById: (id: string) => SubStrand | undefined
  getSubStrandsByStrand: (strandId: string) => SubStrand[]
  getSubStrandsBySubject: (subjectId: string) => SubStrand[]
}

export const useSubStrandStore = create<SubStrandStore>((set, get) => ({
  subStrands: [],
  isLoading: false,
  error: null,

  fetchSubStrands: async () => {
    set({ isLoading: true, error: null })
    try {
      const subStrands = await api.admin.getSubStrands()
      set({ subStrands, isLoading: false })
    } catch (error) {
      console.error('Error fetching sub-strands:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch sub-strands', isLoading: false })
    }
  },

  fetchSubStrandsByStrand: async (strandId: string) => {
    set({ isLoading: true, error: null })
    try {
      const subStrands = await api.admin.getSubStrandsByStrand(strandId)
      set({ subStrands, isLoading: false })
    } catch (error) {
      console.error('Error fetching sub-strands by strand:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch sub-strands', isLoading: false })
    }
  },

  fetchSubStrandsBySubject: async (subjectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const subStrands = await api.admin.getSubStrandsBySubject(subjectId)
      set({ subStrands, isLoading: false })
    } catch (error) {
      console.error('Error fetching sub-strands by subject:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch sub-strands', isLoading: false })
    }
  },

  addSubStrand: async (subStrand) => {
    try {
      const newSubStrand = await api.admin.createSubStrand(subStrand)
      set({ subStrands: [...get().subStrands, newSubStrand] })
    } catch (error) {
      console.error('Error adding sub-strand:', error)
      throw error
    }
  },

  updateSubStrand: async (id, subStrand) => {
    try {
      const updated = await api.admin.updateSubStrand(id, subStrand)
      set({ subStrands: get().subStrands.map(s => s.id === id ? updated : s) })
    } catch (error) {
      console.error('Error updating sub-strand:', error)
      throw error
    }
  },

  deleteSubStrand: async (id) => {
    try {
      await api.admin.deleteSubStrand(id)
      set({ subStrands: get().subStrands.filter(s => s.id !== id) })
    } catch (error) {
      console.error('Error deleting sub-strand:', error)
      throw error
    }
  },

  getSubStrandById: (id) => {
    return get().subStrands.find(s => s.id === id)
  },

  getSubStrandsByStrand: (strandId) => {
    return get().subStrands.filter(s => s.strandId === strandId)
  },

  getSubStrandsBySubject: (subjectId) => {
    return get().subStrands.filter(s => s.subjectId === subjectId)
  },
}))





