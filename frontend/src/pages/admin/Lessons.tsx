import { useState, useMemo, useEffect } from 'react'
import { useLessonStore } from '@/store/useLessonStore'
import { useSubjectStore } from '@/store/useSubjectStore'
import { useStrandStore } from '@/store/useStrandStore'
import { useSubStrandStore } from '@/store/useSubStrandStore'
import { Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { ArrowLeft, Edit, Trash2, BookOpen, Search, Sparkles, Check, X, RefreshCw, Loader2 } from 'lucide-react'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { Lesson, Strand, Subject, SubStrand, Grade } from '@/types'
import { Modal } from '@/components/modals/Modal'
import { LessonFormModal } from '@/components/modals/LessonFormModal'
import { api } from '@/lib/api'
import { AiProgressOverlay } from '@/components/ui/AiProgressOverlay'

const grades: Grade[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

const LESSON_GEN_STEPS = [
  'Reading learning outcomes...',
  'Asking Gemini to design lessons...',
  'Building lesson content and activities...',
  'Creating review questions...',
  'Saving generated lessons...',
  'Almost done — finishing up...',
]

export const AdminLessons = () => {
  const {
    lessons,
    isLoading: lessonsLoading,
    fetchLessonsBySubStrand,
    clearLessons,
    deleteLesson,
    updateLesson,
    approveLesson,
    rejectLesson,
    addAIGeneratedLessons,
  } = useLessonStore()
  const { subjects, fetchSubjects } = useSubjectStore()
  const { strands, fetchStrandsBySubject, getStrandsBySubject } = useStrandStore()
  const { subStrands, fetchSubStrandsByStrand, getSubStrandsByStrand } = useSubStrandStore()
  
  const [selectedGrade, setSelectedGrade] = useState<Grade | ''>('')
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedStrand, setSelectedStrand] = useState<Strand | null>(null)
  const [selectedSubStrand, setSelectedSubStrand] = useState<SubStrand | null>(null)
  const [numberOfLessons, setNumberOfLessons] = useState(5)
  const [searchQuery, setSearchQuery] = useState('')
  const [isGeneratingLessons, setIsGeneratingLessons] = useState(false)
  const [generateModal, setGenerateModal] = useState<{ isOpen: boolean }>({ isOpen: false })
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; lesson: Lesson | null }>({
    isOpen: false,
    lesson: null,
  })
  const [editModal, setEditModal] = useState<{ isOpen: boolean; lesson: Lesson | null }>({
    isOpen: false,
    lesson: null,
  })
  const [reviewModal, setReviewModal] = useState<{ isOpen: boolean; lesson: Lesson | null }>({
    isOpen: false,
    lesson: null,
  })
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const refreshSubStrandLessons = async () => {
    if (selectedSubStrand) {
      await fetchLessonsBySubStrand(selectedSubStrand.id)
    }
  }

  // Subjects only on mount — avoid downloading every lesson/strand up front
  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  // Strands for the selected subject only
  useEffect(() => {
    if (selectedSubject) {
      fetchStrandsBySubject(selectedSubject.id)
    }
  }, [selectedSubject, fetchStrandsBySubject])

  // Sub-strands when strand is selected
  useEffect(() => {
    if (selectedStrand) {
      fetchSubStrandsByStrand(selectedStrand.id)
    }
  }, [selectedStrand, fetchSubStrandsByStrand])

  // Lessons only for the selected sub-strand
  useEffect(() => {
    if (selectedSubStrand) {
      fetchLessonsBySubStrand(selectedSubStrand.id)
    } else {
      clearLessons()
    }
  }, [selectedSubStrand, fetchLessonsBySubStrand, clearLessons])

  // Filter subjects by grade
  const filteredSubjects = useMemo(() => {
    if (!selectedGrade) return []
    return subjects.filter(s => s.grade === selectedGrade)
  }, [subjects, selectedGrade])

  // Get strands for selected subject
  const subjectStrands = useMemo(() => {
    if (!selectedSubject) return []
    return getStrandsBySubject(selectedSubject.id)
  }, [selectedSubject, strands, getStrandsBySubject])

  // Get sub-strands for selected strand
  const strandSubStrands = useMemo(() => {
    if (!selectedStrand) return []
    return getSubStrandsByStrand(selectedStrand.id)
  }, [selectedStrand, subStrands, getSubStrandsByStrand])

  // Store is already scoped to the selected sub-strand
  const subStrandLessons = useMemo(() => {
    if (!selectedSubStrand) return []
    return lessons
  }, [selectedSubStrand, lessons])

  // AI Lesson Generation from Sub-strand
  const generateLessons = async () => {
    if (!selectedSubStrand) return
    
    setIsGeneratingLessons(true)
    try {
      const generatedLessons = await api.admin.createAIGeneratedLessons({
        subStrandId: selectedSubStrand.id,
        numberOfLessons: numberOfLessons
      })
      
      addAIGeneratedLessons(generatedLessons)
      await refreshSubStrandLessons()
      setGenerateModal({ isOpen: false })
      setNumberOfLessons(5)
      alert(`Successfully generated ${generatedLessons.length} lesson(s)! Review and approve them below.`)
    } catch (error) {
      alert('Failed to generate lessons: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsGeneratingLessons(false)
    }
  }

  const handleDeleteClick = (lesson: Lesson) => {
    setDeleteModal({ isOpen: true, lesson })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.lesson) return
    setIsDeleting(true)
    try {
      await deleteLesson(deleteModal.lesson.id)
    } finally {
      setIsDeleting(false)
      setDeleteModal({ isOpen: false, lesson: null })
    }
  }

  const handleEditClick = (lesson: Lesson) => {
    setEditModal({ isOpen: true, lesson })
  }

  const handleApprove = async (lesson: Lesson) => {
    try {
      await approveLesson(lesson.id)
      await refreshSubStrandLessons()
    } catch (error) {
      alert('Failed to approve lesson: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleReject = async (lesson: Lesson) => {
    try {
      await rejectLesson(lesson.id)
      await refreshSubStrandLessons()
    } catch (error) {
      alert('Failed to reject lesson: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleSave = async (lessonData: any) => {
    if (editModal.lesson) {
      const updatedData = {
        ...lessonData,
        subStrandId: editModal.lesson.subStrandId,
        subjectId: editModal.lesson.subjectId,
        strandId: editModal.lesson.strandId,
        grade: editModal.lesson.grade,
      }
      await updateLesson(editModal.lesson.id, updatedData)
      await refreshSubStrandLessons()
    }
    setEditModal({ isOpen: false, lesson: null })
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
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Manage Lessons
                      </h1>
                      <p className="text-xs text-text-secondary hidden sm:block" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        AI-generated lessons from subjects
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grade Selection */}
              <div className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-3 sm:p-4">
                <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Select Grade *
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => {
                    setSelectedGrade(e.target.value as Grade)
                    setSelectedSubject(null)
                    setSelectedStrand(null)
                    setSelectedSubStrand(null)
                  }}
                  className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <option value="">Select a grade</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selection */}
              {selectedGrade && (
                <div className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-3 sm:p-4">
                  <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Select Subject *
                  </label>
                  {filteredSubjects.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {filteredSubjects.map((subject) => (
                        <button
                          key={subject.id}
                          onClick={() => {
                            setSelectedSubject(subject)
                            setSelectedStrand(null)
                            setSelectedSubStrand(null)
                          }}
                          className={`p-3 rounded-[16px] border-2 transition-all text-left ${
                            selectedSubject?.id === subject.id
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'bg-white/70 border-slate-200 hover:border-indigo-200'
                          }`}
                        >
                          <p className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {subject.name}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      No subjects found for Grade {selectedGrade}. Please create a subject first.
                    </p>
                  )}
                </div>
              )}

              {/* Strand Selection */}
              {selectedSubject && (
                <div className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-4">
                  <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Select Strand (Topic)
                  </h2>
                  {subjectStrands.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {subjectStrands.map((strand) => (
                        <button
                          key={strand.id}
                          onClick={() => {
                            setSelectedStrand(strand)
                            setSelectedSubStrand(null)
                          }}
                          className={`p-4 rounded-[16px] border-2 transition-all text-left ${
                            selectedStrand?.id === strand.id
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'bg-white/70 border-slate-200 hover:border-indigo-200'
                          }`}
                        >
                          <h3 className="text-sm font-semibold text-[#0F172A] mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {strand.name}
                          </h3>
                          {strand.description && (
                            <p className="text-xs text-text-secondary line-clamp-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {strand.description}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-text-secondary mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        No strands found. Strands are automatically extracted when you upload a PDF to the subject.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-strand Selection */}
              {selectedStrand && (
                <div className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Select Sub-strand (Sub-topic)
                    </h2>
                    {selectedSubStrand && (
                      <button
                        onClick={() => setGenerateModal({ isOpen: true })}
                        className="px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-xs font-semibold flex items-center gap-1.5"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        <Sparkles className="w-3 h-3" />
                        Generate Lessons
                      </button>
                    )}
                  </div>
                  {strandSubStrands.length > 0 ? (
                    <div className="space-y-3">
                      {strandSubStrands.map((subStrand) => (
                        <button
                          key={subStrand.id}
                          onClick={() => {
                            setSelectedSubStrand(subStrand)
                          }}
                          className={`w-full p-4 rounded-[16px] border-2 transition-all text-left ${
                            selectedSubStrand?.id === subStrand.id
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'bg-white/70 border-slate-200 hover:border-indigo-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {subStrand.name}
                            </h3>
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                          </div>
                          {subStrand.description && (
                            <p className="text-xs text-text-secondary mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {subStrand.description}
                            </p>
                          )}
                          {subStrand.learningOutcomes.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-semibold text-text-secondary mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                Learning Outcomes:
                              </p>
                              <ul className="text-xs text-text-secondary space-y-0.5">
                                {subStrand.learningOutcomes.slice(0, 2).map((outcome, i) => (
                                  <li key={i}>• {outcome}</li>
                                ))}
                                {subStrand.learningOutcomes.length > 2 && (
                                  <li className="text-indigo-600">+{subStrand.learningOutcomes.length - 2} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        No sub-strands found. Sub-strands are automatically extracted when you upload a PDF to the subject.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Lesson Display */}
              {selectedSubStrand && (
                <div className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Lessons for {selectedSubStrand.name}
                    </h2>
                    <button
                      onClick={() => setGenerateModal({ isOpen: true })}
                      className="px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-xs font-semibold flex items-center gap-1.5"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate More
                    </button>
                  </div>
                  {lessonsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                      <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Loading lessons...
                      </p>
                    </div>
                  ) : subStrandLessons.length > 0 ? (
                    <div className="space-y-3">
                      {subStrandLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="p-4 bg-white/70 rounded-[16px] border-2 border-slate-200 hover:border-indigo-200 transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                  {lesson.title}
                                </h3>
                                {lesson.isAIGenerated && (
                                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                    AI
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                    lesson.status === 'approved'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : lesson.status === 'rejected'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}
                                  style={{ fontFamily: 'Manrope, sans-serif' }}
                                >
                                  {lesson.status.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-text-secondary line-clamp-2 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                {lesson.description}
                              </p>
                              {lesson.duration && (
                                <p className="text-xs text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                  Duration: {lesson.duration} minutes
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1.5 ml-2 flex-shrink-0">
                              {lesson.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setReviewModal({ isOpen: true, lesson })
                                      setCurrentQuestionIndex(0)
                                    }}
                                    className="px-2 py-1 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-semibold transition-all"
                                    title="Review Questions"
                                  >
                                    Review
                                  </button>
                                  <button
                                    onClick={() => handleApprove(lesson)}
                                    className="w-7 h-7 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-all"
                                    title="Approve"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(lesson)}
                                    className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all"
                                    title="Reject"
                                  >
                                    <X className="w-3.5 h-3.5 text-red-600" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleEditClick(lesson)}
                                className="w-7 h-7 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center transition-all"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5 text-indigo-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(lesson)}
                                className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-text-secondary mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        No lessons generated yet. Click "Generate Lessons" to create up to 5 lessons from this sub-strand.
                      </p>
                      <button
                        onClick={() => setGenerateModal({ isOpen: true })}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-semibold flex items-center gap-2 mx-auto"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        <Sparkles className="w-4 h-4" />
                        Generate Lessons
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!selectedSubject && (
                <div className="bg-white/80 backdrop-blur-md rounded-[24px] border-2 border-slate-200 p-12 text-center">
                  <p className="text-lg font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Select a Subject
                  </p>
                  <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Search and select a subject to generate strands and lessons
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
        onClose={() => setDeleteModal({ isOpen: false, lesson: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Lesson"
        description="This will permanently delete this lesson. This action cannot be undone."
        itemName={deleteModal.lesson?.title}
        isLoading={isDeleting}
      />

      {/* Generate Lessons Modal */}
      <Modal
        isOpen={generateModal.isOpen}
        onClose={() => {
          if (isGeneratingLessons) return
          setGenerateModal({ isOpen: false })
          setSelectedSubStrand(null)
        }}
        title="Generate AI Lessons"
        size="md"
        preventClose={isGeneratingLessons}
      >
        {selectedSubStrand && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-secondary mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Generate lessons for: <strong>{selectedSubStrand.name}</strong>
              </p>
              {selectedSubStrand.learningOutcomes.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-text-secondary mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Learning Outcomes:
                  </p>
                  <ul className="text-xs text-text-secondary space-y-0.5">
                    {selectedSubStrand.learningOutcomes.map((outcome, i) => (
                      <li key={i}>• {outcome}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedSubStrand.keyInquiryQuestions.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-text-secondary mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Key Inquiry Questions:
                  </p>
                  <ul className="text-xs text-text-secondary space-y-0.5">
                    {selectedSubStrand.keyInquiryQuestions.map((q, i) => (
                      <li key={i}>• {q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Number of Lessons (Max 5) *
              </label>
              <select
                value={numberOfLessons}
                onChange={(e) => setNumberOfLessons(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {[1, 2, 3, 4, 5].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Lesson' : 'Lessons'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setGenerateModal({ isOpen: false })
                  setSelectedSubStrand(null)
                }}
                disabled={isGeneratingLessons}
                className="flex-1 px-4 py-2.5 rounded-full bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all text-sm font-semibold text-slate-700 disabled:opacity-50"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={generateLessons}
                disabled={isGeneratingLessons}
                className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-semibold disabled:opacity-50 flex items-center justify-center"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {isGeneratingLessons ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Lessons
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      {editModal.lesson && (
        <LessonFormModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal({ isOpen: false, lesson: null })}
          onSave={handleSave}
          lesson={editModal.lesson}
          isLoading={false}
        />
      )}

      {/* Review Questions Modal */}
      {reviewModal.lesson && reviewModal.lesson.quiz && (
        <Modal
          isOpen={reviewModal.isOpen}
          onClose={() => {
            setReviewModal({ isOpen: false, lesson: null })
            setCurrentQuestionIndex(0)
          }}
          title={`Review: ${reviewModal.lesson.title}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Lesson Info */}
            <div className="bg-slate-50 rounded-[16px] p-4 border-2 border-slate-200">
              <p className="text-sm text-text-secondary mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {reviewModal.lesson.description}
              </p>
              {reviewModal.lesson.content && (
                <div className="mt-3 p-3 bg-white rounded-[12px] border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Content (for highlighting exercise):
                  </p>
                  <p className="text-sm text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {reviewModal.lesson.content}
                  </p>
                </div>
              )}
            </div>

            {/* All Questions List */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {reviewModal.lesson.quiz.questions.map((q, idx) => (
                <div key={idx} className="bg-white rounded-[16px] p-4 border-2 border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Question {idx + 1}
                    </p>
                    <span className="text-xs text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Points: {q.points}
                    </span>
                  </div>
                  <p className="text-base text-[#0F172A] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {q.question}
                  </p>

                  {q.type === 'multiple-choice' && q.options && (
                    <div className="space-y-2 mb-3">
                      {q.options.map((option, optIdx) => {
                        const isCorrect = optIdx === q.correctAnswerIndex
                        const optExplanation = q.optionExplanations?.[optIdx]
                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-[12px] border-2 ${
                              isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span className="text-sm text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                {option}
                              </span>
                              {isCorrect && (
                                <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                  Correct
                                </span>
                              )}
                            </div>
                            {optExplanation && (
                              <p
                                className={`mt-2 text-xs whitespace-pre-line rounded-[8px] p-2 border ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-red-50 border-red-200 text-red-800'
                                }`}
                                style={{ fontFamily: 'Manrope, sans-serif' }}
                              >
                                {isCorrect ? 'Correct: ' : 'Not correct: '} {optExplanation}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {(q.explanation || q.feedbackCorrect || q.feedbackIncorrect) && (
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      {q.explanation && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Explanation:
                          </p>
                          <p className="text-sm text-[#0F172A] whitespace-pre-line bg-slate-50 rounded-[10px] p-3 border border-slate-200" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {q.explanation}
                          </p>
                        </div>
                      )}
                      {q.feedbackCorrect && (
                        <div>
                          <p className="text-xs font-semibold text-emerald-700 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            If correct:
                          </p>
                          <p className="text-sm text-emerald-800 whitespace-pre-line bg-emerald-50 rounded-[10px] p-3 border border-emerald-200" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {q.feedbackCorrect}
                          </p>
                        </div>
                      )}
                      {q.feedbackIncorrect && (
                        <div>
                          <p className="text-xs font-semibold text-red-700 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            If incorrect:
                          </p>
                          <p className="text-sm text-red-800 whitespace-pre-line bg-red-50 rounded-[10px] p-3 border border-red-200" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {q.feedbackIncorrect}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t-2 border-slate-200">
              <button
                onClick={() => {
                  setReviewModal({ isOpen: false, lesson: null })
                  setCurrentQuestionIndex(0)
                }}
                className="flex-1 px-4 py-2.5 rounded-full bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all text-sm font-semibold text-slate-700"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleEditClick(reviewModal.lesson!)
                  setReviewModal({ isOpen: false, lesson: null })
                  setCurrentQuestionIndex(0)
                }}
                className="flex-1 px-4 py-2.5 rounded-full bg-indigo-100 hover:bg-indigo-200 transition-all text-sm font-semibold text-indigo-700 flex items-center justify-center"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Lesson
              </button>
              <button
                onClick={async () => {
                  await handleApprove(reviewModal.lesson!)
                  setReviewModal({ isOpen: false, lesson: null })
                  setCurrentQuestionIndex(0)
                }}
                className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 transition-all text-sm font-semibold flex items-center justify-center"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve Lesson
              </button>
            </div>
          </div>
        </Modal>
      )}

      <AiProgressOverlay
        isOpen={isGeneratingLessons}
        title="Generating AI lessons"
        subtitle={selectedSubStrand?.name}
        steps={LESSON_GEN_STEPS}
      />
    </div>
  )
}
