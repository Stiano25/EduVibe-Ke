import { useState, useMemo, useEffect } from 'react'
import { useNoteStore } from '@/store/useNoteStore'
import { Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { ArrowLeft, Plus, Edit, Trash2, FileText, Search } from 'lucide-react'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { NoteFormModal } from '@/components/modals/NoteFormModal'
import { Note } from '@/types'

export const AdminNotes = () => {
  const { notes, isLoading, error, fetchNotes, deleteNote, addNote, updateNote } = useNoteStore()
  
  // Fetch notes on component mount
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; note: Note | null }>({
    isOpen: false,
    note: null,
  })
  const [formModal, setFormModal] = useState<{ isOpen: boolean; note: Note | null }>({
    isOpen: false,
    note: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (searchQuery && !note.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !note.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (filterGrade !== 'all' && note.grade !== filterGrade) return false
      if (filterDifficulty !== 'all' && note.difficulty !== filterDifficulty) return false
      return true
    })
  }, [notes, searchQuery, filterGrade, filterDifficulty])

  const handleDeleteClick = (note: Note) => {
    setDeleteModal({ isOpen: true, note })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.note) return
    setIsDeleting(true)
    try {
      await deleteNote(deleteModal.note.id)
      setDeleteModal({ isOpen: false, note: null })
    } catch (error) {
      console.error('Failed to delete note:', error)
      // Error is handled in the store
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddClick = () => {
    setFormModal({ isOpen: true, note: null })
  }

  const handleEditClick = (note: Note) => {
    setFormModal({ isOpen: true, note })
  }

  const handleSave = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSaving(true)
    try {
      if (formModal.note) {
        await updateNote(formModal.note.id, noteData)
      } else {
        await addNote(noteData)
      }
      setFormModal({ isOpen: false, note: null })
    } catch (error) {
      console.error('Failed to save note:', error)
      // Error is handled in the store
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="p-[5px] pt-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] md:rounded-[32px] lg:rounded-[40px] border-white/40 p-4 sm:p-5 md:p-6">
          <StaggeredEntry>
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Link
                    to="/admin"
                    className="p-1.5 sm:p-2 rounded-full bg-white/80 backdrop-blur-md border-2 border-slate-200 hover:bg-white transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                  </Link>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Manage Notes
                      </h1>
                      <p className="text-xs text-text-secondary hidden sm:block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Create, edit, and organize educational content
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleAddClick}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add Note</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>

              {/* Search & Filters */}
              <div className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-3 sm:p-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-[20px] bg-white/70 backdrop-blur-md border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                      className="px-4 py-2.5 rounded-[20px] bg-white/70 backdrop-blur-md border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      <option value="all">All Grades</option>
                      <option value="K">Kindergarten</option>
                      <option value="1">Grade 1</option>
                      <option value="2">Grade 2</option>
                      <option value="3">Grade 3</option>
                      <option value="4">Grade 4</option>
                      <option value="5">Grade 5</option>
                      <option value="6">Grade 6</option>
                      <option value="11">Grade 11</option>
                    </select>
                    <select
                      value={filterDifficulty}
                      onChange={(e) => setFilterDifficulty(e.target.value)}
                      className="px-4 py-2.5 rounded-[20px] bg-white/70 backdrop-blur-md border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      <option value="all">All Difficulties</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-[20px] p-4">
                  <p className="text-sm text-red-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {error}
                  </p>
                </div>
              )}

              {/* Loading State */}
              {isLoading && notes.length === 0 && (
                <div className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-12 text-center">
                  <p className="text-lg font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Loading notes...
                  </p>
                </div>
              )}

              {/* Notes Grid */}
              {!isLoading && filteredNotes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-3 sm:p-4 hover:border-indigo-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEditClick(note)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center transition-all"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(note)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-[#0F172A] mb-1.5 line-clamp-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {note.title}
                      </h3>
                      <p className="text-xs text-text-secondary mb-3 line-clamp-2 hidden sm:block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {note.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          G{note.grade}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 rounded-full capitalize" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {note.difficulty.slice(0, 3)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-12 text-center">
                  <p className="text-lg font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    No notes found
                  </p>
                  <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Try adjusting your search or filters
                  </p>
                </div>
              )}
            </div>
          </StaggeredEntry>
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, note: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Note"
        description="This will permanently delete this note. This action cannot be undone."
        itemName={deleteModal.note?.title}
        isLoading={isDeleting}
      />

      {/* Form Modal */}
      <NoteFormModal
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, note: null })}
        onSave={handleSave}
        note={formModal.note}
        isLoading={isSaving}
      />
    </div>
  )
}

