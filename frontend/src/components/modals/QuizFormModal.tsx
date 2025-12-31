import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Quiz, QuizQuestion, Grade, Difficulty } from '@/types'
import { Save, X, Plus, Trash2, HelpCircle } from 'lucide-react'

interface QuizFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => void
  quiz?: Quiz | null
  isLoading?: boolean
}

const grades: Grade[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const difficulties: Difficulty[] = ['beginner', 'intermediate', 'advanced']

export const QuizFormModal = ({
  isOpen,
  onClose,
  onSave,
  quiz,
  isLoading = false,
}: QuizFormModalProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    grade: 'K' as Grade,
    difficulty: 'beginner' as Difficulty,
    passingScore: 70,
    timeLimit: '',
    linkedToType: '' as 'note' | 'substrand' | '',
    linkedToId: '',
  })

  const [questions, setQuestions] = useState<QuizQuestion[]>([])

  useEffect(() => {
    if (quiz) {
      setFormData({
        title: quiz.title,
        description: quiz.description || '',
        grade: quiz.grade,
        difficulty: quiz.difficulty,
        passingScore: quiz.passingScore,
        timeLimit: quiz.timeLimit?.toString() || '',
        linkedToType: quiz.linkedTo?.type || '',
        linkedToId: quiz.linkedTo?.id || '',
      })
      setQuestions(quiz.questions)
    } else {
      setFormData({
        title: '',
        description: '',
        grade: 'K',
        difficulty: 'beginner',
        passingScore: 70,
        timeLimit: '',
        linkedToType: '',
        linkedToId: '',
      })
      setQuestions([])
    }
  }, [quiz, isOpen])

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      question: '',
      type: 'multiple-choice',
      options: ['', ''],
      correctAnswerIndex: 0,
      explanation: '',
      points: 1,
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    )
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options && q.options.length < 6) {
          return { ...q, options: [...q.options, ''] }
        }
        return q
      })
    )
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options && q.options.length > 2) {
          const newOptions = q.options.filter((_, i) => i !== optionIndex)
          return {
            ...q,
            options: newOptions,
            correctAnswerIndex:
              q.correctAnswerIndex >= newOptions.length
                ? newOptions.length - 1
                : q.correctAnswerIndex,
          }
        }
        return q
      })
    )
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options) {
          const newOptions = [...q.options]
          newOptions[optionIndex] = value
          return { ...q, options: newOptions }
        }
        return q
      })
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || questions.length === 0) return

    // Validate all questions have required fields
    const invalidQuestions = questions.filter(
      (q) =>
        !q.question.trim() ||
        !q.options ||
        q.options.length < 2 ||
        q.options.some((opt) => !opt.trim()) ||
        q.explanation.trim() === ''
    )

    if (invalidQuestions.length > 0) {
      alert('Please fill in all required fields for each question.')
      return
    }

    const quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'> = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      grade: formData.grade,
      difficulty: formData.difficulty,
      passingScore: formData.passingScore,
      timeLimit: formData.timeLimit ? parseInt(formData.timeLimit) : undefined,
      questions,
      linkedTo:
        formData.linkedToType && formData.linkedToId
          ? {
              type: formData.linkedToType,
              id: formData.linkedToId,
            }
          : undefined,
    }

    onSave(quizData)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={quiz ? 'Edit Quiz' : 'Create New Quiz'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Basic Information
          </h3>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Quiz Title *
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
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm resize-none"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                Passing Score (%) *
              </label>
              <input
                type="number"
                value={formData.passingScore}
                onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 70 })}
                min="0"
                max="100"
                className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Time Limit (min)
              </label>
              <input
                type="number"
                value={formData.timeLimit}
                onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
                min="0"
                placeholder="No limit"
                className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Questions ({questions.length})
              </h3>
            </div>
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

          {questions.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-[16px] border-2 border-slate-200 text-center">
              <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                No questions added yet. Click "Add Question" to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, qIndex) => (
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

                  {/* Question Text */}
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

                  {/* Options */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Options * (Select correct answer)
                      </label>
                      {question.options && question.options.length < 6 && (
                        <button
                          type="button"
                          onClick={() => addOption(question.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                          + Add Option
                        </button>
                      )}
                    </div>
                    {question.options?.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={question.correctAnswerIndex === optIndex}
                          onChange={() => updateQuestion(question.id, { correctAnswerIndex: optIndex })}
                          className="w-4 h-4 text-indigo-600 border-2 border-slate-300 focus:ring-2 focus:ring-indigo-100"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                          placeholder={`Option ${optIndex + 1}`}
                          className="flex-1 px-3 py-1.5 rounded-[8px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                          required
                        />
                        {question.options && question.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(question.id, optIndex)}
                            className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Explanation * (Why this answer is correct)
                    </label>
                    <textarea
                      value={question.explanation}
                      onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                      rows={2}
                      placeholder="Explain why this answer is correct..."
                      className="w-full px-3 py-2 rounded-[10px] bg-slate-50 border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm resize-none"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                      required
                    />
                  </div>

                  {/* Points */}
                  <div>
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
                </div>
              ))}
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
            disabled={isLoading || !formData.title.trim() || questions.length === 0}
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
                {quiz ? 'Update' : 'Create'} Quiz
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}




