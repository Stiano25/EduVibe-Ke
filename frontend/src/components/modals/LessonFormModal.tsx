import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Lesson, ContentType, Difficulty, Grade, Quiz, QuizQuestion } from '@/types'
import { Save, X, Plus, Trash2, Video, FileText, HelpCircle } from 'lucide-react'

interface LessonFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) => void
  lesson?: Lesson | null
  isLoading?: boolean
}

const grades: Grade[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const contentTypes: ContentType[] = ['video', 'interactive', 'reading']
const difficulties: Difficulty[] = ['beginner', 'intermediate', 'advanced']

export const LessonFormModal = ({
  isOpen,
  onClose,
  onSave,
  lesson,
  isLoading = false,
}: LessonFormModalProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentType: 'video' as ContentType,
    difficulty: 'beginner' as Difficulty,
    grade: 'K' as Grade,
    tags: '',
    duration: '',
    videoUrl: '',
    content: '',
  })

  const [hasQuiz, setHasQuiz] = useState(false)
  const [quiz, setQuiz] = useState<Quiz>({
    id: '',
    title: '',
    description: '',
    questions: [],
    passingScore: 70,
    timeLimit: 0,
  })

  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title,
        description: lesson.description,
        contentType: lesson.contentType,
        difficulty: lesson.difficulty,
        grade: lesson.grade,
        tags: lesson.tags.join(', '),
        duration: lesson.duration.toString(),
        videoUrl: lesson.videoUrl || '',
        content: lesson.content || '',
      })
      if (lesson.quiz) {
        setHasQuiz(true)
        setQuiz(lesson.quiz)
      } else {
        setHasQuiz(false)
        setQuiz({
          id: '',
          title: '',
          description: '',
          questions: [],
          passingScore: 70,
          timeLimit: 0,
        })
      }
    } else {
      setFormData({
        title: '',
        description: '',
        contentType: 'video',
        difficulty: 'beginner',
        grade: 'K',
        tags: '',
        duration: '',
        videoUrl: '',
        content: '',
      })
      setHasQuiz(false)
      setQuiz({
        id: '',
        title: '',
        description: '',
        questions: [],
        passingScore: 70,
        timeLimit: 0,
      })
    }
  }, [lesson, isOpen])

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 1,
    }
    setQuiz({
      ...quiz,
      questions: [...quiz.questions, newQuestion],
    })
  }

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    })
  }

  const removeQuestion = (id: string) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.filter((q) => q.id !== id),
    })
  }

  const updateQuestionOption = (questionId: string, optionIndex: number, value: string) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) => {
        if (q.id === questionId && q.options) {
          const newOptions = [...q.options]
          newOptions[optionIndex] = value
          return { ...q, options: newOptions }
        }
        return q
      }),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    const lessonData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'> = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      contentType: formData.contentType,
      difficulty: formData.difficulty,
      grade: formData.grade,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      duration: parseInt(formData.duration) || 0,
      videoUrl: formData.videoUrl || undefined,
      content: formData.content || undefined,
      quiz: hasQuiz && quiz.questions.length > 0 ? quiz : undefined,
    }

    onSave(lessonData)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lesson ? 'Edit Lesson' : 'Create New Lesson'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Basic Information
          </h3>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
              style={{ fontFamily: 'Manrope, sans-serif' }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm resize-none"
              style={{ fontFamily: 'Manrope, sans-serif' }}
              required
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Difficulty *
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                required
              >
                {difficulties.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Duration (min) *
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                min="1"
                className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Content Type *
            </label>
            <select
              value={formData.contentType}
              onChange={(e) => setFormData({ ...formData, contentType: e.target.value as ContentType })}
              className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
              style={{ fontFamily: 'Manrope, sans-serif' }}
              required
            >
              {contentTypes.map((ct) => (
                <option key={ct} value={ct}>
                  {ct.charAt(0).toUpperCase() + ct.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="math, numbers, counting"
              className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            />
          </div>
        </div>

        {/* Video Content */}
        {formData.contentType === 'video' && (
          <div className="space-y-4 pt-4 border-t-2 border-slate-200">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Video Content
              </h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Video URL
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://example.com/video.mp4"
                className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              />
            </div>
          </div>
        )}

        {/* Text Content */}
        {(formData.contentType === 'reading' || formData.contentType === 'interactive') && (
          <div className="space-y-4 pt-4 border-t-2 border-slate-200">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Content (Markdown)
              </h3>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Lesson Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                placeholder="Write your lesson content in Markdown format..."
                className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm font-mono resize-none"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              />
            </div>
          </div>
        )}

        {/* Quiz Section */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Quiz
              </h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasQuiz}
                onChange={(e) => setHasQuiz(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="text-sm font-medium text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Include Quiz
              </span>
            </label>
          </div>

          {hasQuiz && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-[16px] border-2 border-slate-200">
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Quiz Title
                </label>
                <input
                  type="text"
                  value={quiz.title}
                  onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                  placeholder="Lesson Quiz"
                  className="w-full px-4 py-2.5 rounded-[12px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    value={quiz.passingScore}
                    onChange={(e) => setQuiz({ ...quiz, passingScore: parseInt(e.target.value) || 70 })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 rounded-[12px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Time Limit (min)
                  </label>
                  <input
                    type="number"
                    value={quiz.timeLimit || ''}
                    onChange={(e) => setQuiz({ ...quiz, timeLimit: parseInt(e.target.value) || 0 })}
                    min="0"
                    placeholder="No limit"
                    className="w-full px-4 py-2.5 rounded-[12px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Questions ({quiz.questions.length})
                  </label>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all flex items-center gap-1.5"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question
                  </button>
                </div>

                {quiz.questions.map((question, qIndex) => (
                  <div key={question.id} className="p-4 bg-white rounded-[12px] border-2 border-slate-200 space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-semibold text-indigo-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Question {qIndex + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0F172A] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Question Text *
                      </label>
                      <textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 rounded-[10px] bg-slate-50 border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm resize-none"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0F172A] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Question Type *
                      </label>
                      <select
                        value={question.type}
                        onChange={(e) => {
                          const type = e.target.value as QuizQuestion['type']
                          updateQuestion(question.id, {
                            type,
                            options: type === 'multiple-choice' ? ['', '', '', ''] : undefined,
                            correctAnswer: type === 'multiple-choice' ? 0 : '',
                          })
                        }}
                        className="w-full px-3 py-2 rounded-[10px] bg-slate-50 border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="true-false">True/False</option>
                        <option value="short-answer">Short Answer</option>
                      </select>
                    </div>

                    {question.type === 'multiple-choice' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Options *
                        </label>
                        {question.options?.map((option, optIndex) => (
                          <div key={`${question.id}-option-${optIndex}`} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${question.id}`}
                              checked={question.correctAnswer === optIndex}
                              onChange={() => updateQuestion(question.id, { correctAnswer: optIndex })}
                              className="w-4 h-4 text-indigo-600 border-2 border-slate-300 focus:ring-2 focus:ring-indigo-100"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateQuestionOption(question.id, optIndex, e.target.value)}
                              placeholder={`Option ${optIndex + 1}`}
                              className="flex-1 px-3 py-1.5 rounded-[8px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                              style={{ fontFamily: 'Manrope, sans-serif' }}
                              required
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === 'true-false' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Correct Answer *
                        </label>
                        <div className="flex gap-3">
                          {['True', 'False'].map((option) => (
                            <label key={option} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`tf-${question.id}`}
                                checked={question.correctAnswer === option}
                                onChange={() => updateQuestion(question.id, { correctAnswer: option })}
                                className="w-4 h-4 text-indigo-600 border-2 border-slate-300 focus:ring-2 focus:ring-indigo-100"
                              />
                              <span className="text-sm text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                {option}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {question.type === 'short-answer' && (
                      <div>
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Correct Answer *
                        </label>
                        <input
                          type="text"
                          value={question.correctAnswer as string}
                          onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                          placeholder="Enter the correct answer"
                          className="w-full px-3 py-2 rounded-[10px] bg-slate-50 border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                          required
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Points
                        </label>
                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 1 })}
                          min="1"
                          className="w-full px-3 py-1.5 rounded-[8px] bg-slate-50 border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Explanation (optional)
                        </label>
                        <input
                          type="text"
                          value={question.explanation || ''}
                          onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                          placeholder="Why this is correct"
                          className="w-full px-3 py-1.5 rounded-[8px] bg-slate-50 border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t-2 border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-full bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all text-sm font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.title.trim()}
            className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                {lesson ? 'Update' : 'Create'} Lesson
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

