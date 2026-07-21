import { create } from 'zustand'
import type { Strand } from '@/types'
import { api } from '@/lib/api'

interface StrandState {
  strands: Strand[]
  isLoading: boolean
  error: string | null
  fetchStrands: () => Promise<void>
  fetchStrandsBySubject: (subjectId: string) => Promise<void>
  addStrand: (strand: Omit<Strand, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateStrand: (id: string, strand: Partial<Strand>) => Promise<void>
  deleteStrand: (id: string) => Promise<void>
  getStrandById: (id: string) => Strand | undefined
  getStrandsBySubject: (subjectId: string) => Strand[]
}

export const useStrandStore = create<StrandState>((set, get) => ({
  strands: [],
  isLoading: false,
  error: null,
  
  fetchStrands: async () => {
    set({ isLoading: true, error: null })
    try {
      const strands = await api.admin.getStrands()
      set({ strands, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch strands', isLoading: false })
    }
  },
  
  fetchStrandsBySubject: async (subjectId: string) => {
    set({ isLoading: true, error: null })
    try {
      const strands = await api.admin.getStrandsBySubject(subjectId)
      set({ strands, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch strands', isLoading: false })
    }
  },
  
  addStrand: async (strandData) => {
    set({ isLoading: true, error: null })
    try {
      const newStrand = await api.admin.createStrand(strandData)
      set((state) => ({ strands: [...state.strands, newStrand], isLoading: false }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create strand', isLoading: false })
      throw error
    }
  },
  
  updateStrand: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updatedStrand = await api.admin.updateStrand(id, updates)
      set((state) => ({
        strands: state.strands.map((strand) =>
          strand.id === id ? updatedStrand : strand
        ),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update strand', isLoading: false })
      throw error
    }
  },
  
  deleteStrand: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.admin.deleteStrand(id)
      set((state) => ({
        strands: state.strands.filter((strand) => strand.id !== id),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete strand', isLoading: false })
      throw error
    }
  },
  
  getStrandById: (id) => {
    return get().strands.find((strand) => strand.id === id)
  },
  
  getStrandsBySubject: (subjectId) => {
    return get().strands.filter((strand) => strand.subjectId === subjectId)
  },
}))

