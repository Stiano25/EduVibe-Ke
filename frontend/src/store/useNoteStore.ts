import { create } from 'zustand'
import type { Note } from '@/types'
import { api } from '@/lib/api'

interface NoteState {
  notes: Note[]
  isLoading: boolean
  error: string | null
  fetchNotes: () => Promise<void>
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateNote: (id: string, note: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  getNoteById: (id: string) => Note | undefined
  getNotesBySubStrand: (subStrandId: string) => Note[]
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  isLoading: false,
  error: null,
  
  fetchNotes: async () => {
    set({ isLoading: true, error: null })
    try {
      const notes = await api.admin.getNotes()
      set({ notes, isLoading: false })
    } catch (error) {
      console.error('Error fetching notes:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch notes', isLoading: false })
    }
  },
  
  addNote: async (noteData) => {
    set({ isLoading: true, error: null })
    try {
      const newNote = await api.admin.createNote(noteData)
      set((state) => ({ notes: [...state.notes, newNote], isLoading: false }))
    } catch (error) {
      console.error('Error creating note:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to create note', isLoading: false })
      throw error
    }
  },
  
  updateNote: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updatedNote = await api.admin.updateNote(id, updates)
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? updatedNote : note
        ),
        isLoading: false
      }))
    } catch (error) {
      console.error('Error updating note:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to update note', isLoading: false })
      throw error
    }
  },
  
  deleteNote: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await api.admin.deleteNote(id)
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
        isLoading: false
      }))
    } catch (error) {
      console.error('Error deleting note:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to delete note', isLoading: false })
      throw error
    }
  },
  
  getNoteById: (id) => {
    return get().notes.find((note) => note.id === id)
  },
  
  getNotesBySubStrand: (subStrandId) => {
    return get().notes.filter((note) => note.subStrandId === subStrandId)
  },
}))

