import { useState, useMemo, useEffect } from 'react'
import { useSubjectStore } from '@/store/useSubjectStore'
import { Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { ArrowLeft, Plus, Edit, Trash2, FileText, Search, Sparkles, Loader2 } from 'lucide-react'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { Subject, Grade } from '@/types'
import { Modal } from '@/components/modals/Modal'
import { Save, X } from 'lucide-react'
import { api } from '@/lib/api'

const grades: Grade[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

export const AdminSubjects = () => {
  const { subjects, isLoading: subjectsLoading, error: subjectsError, fetchSubjects, addSubject, updateSubject, deleteSubject } = useSubjectStore()
  const [selectedGrade, setSelectedGrade] = useState<Grade | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; subject: Subject | null }>({
    isOpen: false,
    subject: null,
  })
  const [formModal, setFormModal] = useState<{ isOpen: boolean; subject: Subject | null }>({
    isOpen: false,
    subject: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parsingSubjectId, setParsingSubjectId] = useState<string | null>(null)

  // Fetch subjects on mount
  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  const filteredSubjects = useMemo(() => {
    let filtered = subjects
    if (selectedGrade !== 'all') {
      filtered = filtered.filter((s) => s.grade === selectedGrade)
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return filtered
  }, [subjects, selectedGrade, searchQuery])

  const handleDeleteClick = (subject: Subject) => {
    setDeleteModal({ isOpen: true, subject })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.subject) return
    setIsDeleting(true)
    try {
      await deleteSubject(deleteModal.subject.id)
      setDeleteModal({ isOpen: false, subject: null })
    } catch (error) {
      console.error('Failed to delete subject:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddClick = () => {
    setFormModal({ isOpen: true, subject: null })
  }

  const handleEditClick = (subject: Subject) => {
    setFormModal({ isOpen: true, subject })
  }

  const handleSave = async (subjectData: any) => {
    setIsSaving(true)
    try {
      // If there's a PDF file, upload it first
      let finalSubjectData = { ...subjectData }
      if (subjectData.pdfFile) {
        try {
          const uploadResult = await api.admin.uploadPDF(subjectData.pdfFile)
          finalSubjectData.pdfUrl = uploadResult.url
          finalSubjectData.pdfFileName = uploadResult.fileName
          delete finalSubjectData.pdfFile // Remove the file object
        } catch (uploadError) {
          console.error('Failed to upload PDF:', uploadError)
          alert('Failed to upload PDF: ' + (uploadError instanceof Error ? uploadError.message : 'Unknown error'))
          setIsSaving(false)
          return
        }
      }

      if (formModal.subject) {
        await updateSubject(formModal.subject.id, finalSubjectData)
      } else {
        await addSubject(finalSubjectData)
      }
      setFormModal({ isOpen: false, subject: null })
      // Refresh subjects list
      fetchSubjects()
    } catch (error) {
      console.error('Failed to save subject:', error)
      alert('Failed to save subject: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleParsePDF = async (subject: Subject) => {
    setParsingSubjectId(subject.id)
    try {
      const result = await api.admin.parseSubjectPDF(subject.id)
      alert(`PDF parsed successfully!\nFound ${result.strandsCount} strands and ${result.subStrandsCount} sub-strands.`)
      // Refresh subjects to show updated data
      fetchSubjects()
    } catch (error) {
      console.error('Failed to parse PDF:', error)
      alert('Failed to parse PDF: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setParsingSubjectId(null)
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
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Manage Subjects
                      </h1>
                      <p className="text-xs text-text-secondary hidden sm:block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Create subjects from curriculum designs
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
                  <span className="hidden sm:inline">Add Subject</span>
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
                      placeholder="Search subjects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-[20px] bg-white/70 backdrop-blur-md border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value as Grade | 'all')}
                      className="px-4 py-2.5 rounded-[20px] bg-white/70 backdrop-blur-md border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      <option value="all">All Grades</option>
                      {grades.map((g) => (
                        <option key={g} value={g}>
                          {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {subjectsError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-[20px] p-4">
                  <p className="text-sm text-red-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {subjectsError}
                  </p>
                </div>
              )}

              {/* Loading State */}
              {subjectsLoading && filteredSubjects.length === 0 && (
                <div className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-12 text-center">
                  <p className="text-lg font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Loading subjects...
                  </p>
                </div>
              )}

              {/* Subjects Grid */}
              {!subjectsLoading && filteredSubjects.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredSubjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-4 hover:border-purple-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEditClick(subject)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center transition-all"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(subject)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-[#0F172A] mb-1.5 line-clamp-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {subject.name}
                      </h3>
                      <p className="text-xs text-text-secondary mb-2 line-clamp-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {subject.description || 'No description'}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          G{subject.grade}
                        </span>
                      </div>
                      <button
                        onClick={() => handleParsePDF(subject)}
                        disabled={parsingSubjectId === subject.id}
                        className="w-full px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        {parsingSubjectId === subject.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Parsing PDF...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Parse PDF
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-12 text-center">
                  <p className="text-lg font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    No subjects found
                  </p>
                  <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Create your first subject from a curriculum design
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
        onClose={() => setDeleteModal({ isOpen: false, subject: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Subject"
        description="This will permanently delete this subject. This action cannot be undone."
        itemName={deleteModal.subject?.name}
        isLoading={isDeleting}
      />

      {/* Form Modal */}
      <SubjectFormModal
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, subject: null })}
        onSave={handleSave}
        subject={formModal.subject}
        isLoading={isSaving}
      />
    </div>
  )
}

// Subject Form Modal Component
interface SubjectFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => void
  subject?: Subject | null
  isLoading?: boolean
}

const SubjectFormModal = ({ isOpen, onClose, onSave, subject, isLoading = false }: SubjectFormModalProps) => {
  const [formData, setFormData] = useState({
    name: subject?.name || '',
    description: subject?.description || '',
    grade: (subject?.grade || '') as Grade | '',
  })
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfFileName, setPdfFileName] = useState('')

  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name,
        description: subject.description || '',
        grade: subject.grade,
      })
    } else {
      setFormData({
        name: '',
        description: '',
        grade: '' as Grade | '',
      })
      setPdfFile(null)
      setPdfFileName('')
    }
  }, [subject, isOpen])

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
      setPdfFileName(file.name)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.grade) return

    onSave({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      grade: formData.grade,
      // PDF file will be uploaded by handleSave
      pdfFile: pdfFile || undefined,
      pdfFileName: pdfFileName || undefined,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={subject ? 'Edit Subject' : 'Create Subject'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Grade *
          </label>
          <select
            value={formData.grade}
            onChange={(e) => setFormData({ ...formData, grade: e.target.value as Grade })}
            className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
            style={{ fontFamily: 'Manrope, sans-serif' }}
            required
          >
            <option value="">Select a grade</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Subject Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Agriculture, Computer Studies, Chemistry"
            className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
            style={{ fontFamily: 'Manrope, sans-serif' }}
            required
          />
          <p className="text-xs text-text-secondary mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Curriculum design will be auto-created as: <strong>Grade{formData.grade || '{number}'}_{formData.name || 'SubjectName'}_Curriculum Design</strong>
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Brief description of the subject..."
            className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm resize-none"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Curriculum Design PDF (Optional)
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handlePdfUpload}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className="flex items-center gap-2 px-4 py-3 rounded-[16px] bg-indigo-50 border-2 border-indigo-200 hover:bg-indigo-100 cursor-pointer transition-all"
          >
            <FileText className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {pdfFileName || 'Choose PDF File'}
            </span>
          </label>
          {pdfFileName && (
            <p className="text-xs text-text-secondary mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {pdfFileName}
            </p>
          )}
          <p className="text-xs text-text-secondary mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Upload the curriculum design PDF for this subject. This will be attached to the auto-created curriculum design.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t-2 border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-full bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all text-sm font-semibold text-slate-700 disabled:opacity-50"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.name.trim() || !formData.grade}
            className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-semibold disabled:opacity-50 flex items-center justify-center"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 inline mr-2" />
                {subject ? 'Update' : 'Create'} Subject
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

