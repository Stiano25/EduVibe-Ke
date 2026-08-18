import { useState, useMemo, useEffect } from 'react'
import { useLessonStore } from '@/store/useLessonStore'
import { useSubjectStore } from '@/store/useSubjectStore'
import { useStrandStore } from '@/store/useStrandStore'
import { useSubStrandStore } from '@/store/useSubStrandStore'
import { Link } from 'react-router-dom'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { Edit, Trash2, BookOpen, Search, Sparkles, Check, X, RefreshCw, Loader2, GraduationCap, Library } from 'lucide-react'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { Lesson, Strand, Subject, SubStrand, Grade } from '@/types'
import { Modal } from '@/components/modals/Modal'
import { LessonFormModal } from '@/components/modals/LessonFormModal'
import { LessonReviewModal } from '@/components/admin/LessonReviewModal'
import { api } from '@/lib/api'
import { AiProgressOverlay } from '@/components/ui/AiProgressOverlay'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

const grades: Grade[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

const LESSON_GEN_STEPS = [
  'Loading curriculum…',
  'Retrieving exam exemplars…',
  'Generating lesson with Gemini…',
  'Parsing and normalizing…',
  'Saving lessons…',
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
  const [numberOfLessons, setNumberOfLessons] = useState(2)
  const [searchQuery, setSearchQuery] = useState('')
  const [isGeneratingLessons, setIsGeneratingLessons] = useState(false)
  const [genPercent, setGenPercent] = useState(0)
  const [genStatus, setGenStatus] = useState<string | null>(null)
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
  const [isDeleting, setIsDeleting] = useState(false)

  const closeReviewModal = () => {
    setReviewModal({ isOpen: false, lesson: null })
  }

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
    setGenPercent(2)
    setGenStatus('Starting…')
    try {
      const generatedLessons = (await api.admin.createAIGeneratedLessonsStream(
        {
          subStrandId: selectedSubStrand.id,
          numberOfLessons: numberOfLessons,
        },
        ({ percent, message }) => {
          setGenPercent(percent)
          setGenStatus(message)
        }
      )) as Lesson[]

      addAIGeneratedLessons(generatedLessons)
      await refreshSubStrandLessons()
      setGenerateModal({ isOpen: false })
      setNumberOfLessons(2)
      alert(
        `Successfully generated ${generatedLessons.length} lesson(s)! Review and approve them below.`
      )
    } catch (error) {
      alert(
        'Failed to generate lessons: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setIsGeneratingLessons(false)
      setGenPercent(0)
      setGenStatus(null)
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
              <AdminPageHeader
                title="Lessons"
                subtitle="Step 3 — pick Grade → Subject → Strand → Sub-strand, then generate and approve"
                icon={BookOpen}
                iconClassName="from-cyan-500 to-blue-600"
                actions={
                  <>
                    <Link
                      to="/admin/subjects"
                      className="px-3 py-1.5 rounded-full bg-white border-2 border-purple-200 text-purple-800 font-semibold text-xs sm:text-sm hover:bg-purple-50 inline-flex items-center gap-1.5"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      <GraduationCap className="w-4 h-4" />
                      Subjects
                    </Link>
                    <Link
                      to="/admin/knowledge"
                      className="px-3 py-1.5 rounded-full bg-white border-2 border-teal-200 text-teal-800 font-semibold text-xs sm:text-sm hover:bg-teal-50 inline-flex items-center gap-1.5"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      <Library className="w-4 h-4" />
                      Exam bank
                    </Link>
                  </>
                }
              />

              {(selectedSubject || selectedStrand || selectedSubStrand) && (
                <div
                  className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 px-1"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <span className="font-semibold text-slate-500">Path:</span>
                  {selectedGrade && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100">Grade {selectedGrade}</span>
                  )}
                  {selectedSubject && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800">
                      {selectedSubject.name}
                    </span>
                  )}
                  {selectedStrand && (
                    <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-800">
                      {selectedStrand.name}
                    </span>
                  )}
                  {selectedSubStrand && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-900 font-semibold">
                      {selectedSubStrand.name}
                    </span>
                  )}
                </div>
              )}

              {/* Grade Selection */}
              <div className="bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 p-3 sm:p-4">
                <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  1. Select Grade *
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
                    2. Select Subject *
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
                    3. Select Strand (Topic)
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
                      4. Units (sub-strands in curriculum order)
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
                              {subStrand.sequenceNumber != null ? `Unit ${subStrand.sequenceNumber} · ` : ''}
                              {subStrand.name}
                            </h3>
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                          </div>
                          {subStrand.lessonsAllocated != null && (
                            <p className="text-xs text-slate-500 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              Curriculum allocation: {subStrand.lessonsAllocated} lessons
                            </p>
                          )}
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
                                      : lesson.status === 'draft'
                                      ? 'bg-slate-100 text-slate-700'
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
                              {((lesson.status === 'pending' || lesson.status === 'draft') &&
                                !(lesson.quiz?.questions || []).length &&
                                lesson.quiz?.source !== 'templates') && (
                                <p className="text-xs text-amber-700 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                  Quiz is empty until question-bank items are approved. You can still review the lesson content.
                                </p>
                              )}
                              {lesson.duration && (
                                <p className="text-xs text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                  Duration: {lesson.duration} minutes
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1.5 ml-2 flex-shrink-0">
                              {(lesson.status === 'pending' || lesson.status === 'draft') && (
                                <>
                                  <button
                                    onClick={() => {
                                      setReviewModal({ isOpen: true, lesson })
                                    }}
                                    className="px-2 py-1 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-semibold transition-all"
                                    title="Review Questions"
                                  >
                                    Review
                                  </button>
                                  {lesson.status === 'pending' &&
                                    ((lesson.quiz?.questions || []).length > 0 ||
                                      lesson.quiz?.source === 'templates') && (
                                    <button
                                      onClick={() => handleApprove(lesson)}
                                      className="w-7 h-7 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-all"
                                      title="Approve"
                                    >
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    </button>
                                  )}
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
                        No lessons generated yet. Click "Generate Lessons" to create short AI lessons (recommended: 2).
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
                    {num === 2 ? ' (recommended)' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Template-backed lessons use a reviewed ladder; live sessions draw twists (10–12 items). Other topics pull from the approved question bank.
              </p>
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

      {reviewModal.lesson && (
        <LessonReviewModal
          isOpen={reviewModal.isOpen}
          lesson={reviewModal.lesson}
          onClose={closeReviewModal}
          onEdit={handleEditClick}
          onApprove={handleApprove}
          onLessonUpdated={(updated) => setReviewModal({ isOpen: true, lesson: updated })}
        />
      )}

      <AiProgressOverlay
        isOpen={isGeneratingLessons}
        title="Generating AI lessons"
        subtitle={selectedSubStrand?.name}
        steps={LESSON_GEN_STEPS}
        percent={genPercent}
        statusMessage={genStatus}
      />
    </div>
  )
}
