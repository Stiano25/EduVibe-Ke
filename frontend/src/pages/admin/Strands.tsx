import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { ArrowLeft, Plus, Edit, Trash2, Layers } from 'lucide-react'
import { curriculumData, MainSubject } from '@/data/curriculumData'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { StrandFormModal } from '@/components/modals/StrandFormModal'

export const AdminStrands = () => {
  const [strands] = useState<MainSubject[]>(curriculumData)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; strand: MainSubject | null }>({
    isOpen: false,
    strand: null,
  })
  const [formModal, setFormModal] = useState<{ isOpen: boolean; strand: MainSubject | null }>({
    isOpen: false,
    strand: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleDeleteClick = (strand: MainSubject) => {
    setDeleteModal({ isOpen: true, strand })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.strand) return
    setIsDeleting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Delete strand:', deleteModal.strand.id)
    // In real app, this would call an API
    setIsDeleting(false)
    setDeleteModal({ isOpen: false, strand: null })
  }

  const handleEditClick = (strand: MainSubject) => {
    setFormModal({ isOpen: true, strand })
  }

  const handleAddClick = () => {
    setFormModal({ isOpen: true, strand: null })
  }

  const handleSave = async (data: { name: string; color: string }) => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log(formModal.strand ? 'Update strand:' : 'Create strand:', data)
    // In real app, this would call an API
    setIsSaving(false)
    setFormModal({ isOpen: false, strand: null })
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
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Manage Strands
                      </h1>
                      <p className="text-xs text-text-secondary hidden sm:block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Main curriculum subject areas
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
                  <span className="hidden sm:inline">Add Strand</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>

              {/* Strands Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {strands.map((strand) => {
                  const Icon = strand.icon
                  return (
                    <div
                      key={strand.id}
                      className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-3 sm:p-4 hover:border-indigo-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${strand.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEditClick(strand)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center transition-all"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(strand)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-[#0F172A] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {strand.name}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        <span>{strand.curriculumSubjects.length} subjects</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{strand.curriculumSubjects.reduce((acc, curr) => acc + curr.subStrands.length, 0)} sub-strands</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </StaggeredEntry>
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, strand: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Strand"
        description="This will permanently delete this strand and all associated curriculum subjects and sub-strands. This action cannot be undone."
        itemName={deleteModal.strand?.name}
        isLoading={isDeleting}
      />

      {/* Form Modal */}
      <StrandFormModal
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, strand: null })}
        onSave={handleSave}
        strand={formModal.strand}
        isLoading={isSaving}
      />
    </div>
  )
}

