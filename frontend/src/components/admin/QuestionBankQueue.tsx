import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight, Loader2, Pencil, Sparkles, X } from 'lucide-react'
import { api } from '@/lib/api'
import { MathText } from '@/components/ui/MathText'
import { useSubjectStore } from '@/store/useSubjectStore'
import { useStrandStore } from '@/store/useStrandStore'
import { useSubStrandStore } from '@/store/useSubStrandStore'
import type { Grade, QuizQuestion } from '@/types'
import { readQuestionBankFiltersFromUrl } from '@/lib/questionBank'

const grades: Grade[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

type BankStatus = 'pending' | 'approved' | 'rejected'

type BankEntry = {
  id: string
  subjectName?: string | null
  grade?: string | null
  topic?: string | null
  subStrandId?: string | null
  difficulty?: string | null
  bloomLevel?: string | null
  status: BankStatus
  qaFlagged?: boolean
  qaIssue?: string | null
  flaggedNearDuplicate?: boolean
  rejectReason?: string | null
  styleSourceNote?: string | null
  question: QuizQuestion
}

type QueueFilters = {
  status: BankStatus | 'all'
  grade: Grade | ''
  subjectId: string
  strandId: string
  subStrandId: string
}

const filtersToSearchParams = (next: QueueFilters) => {
  const params = new URLSearchParams()
  params.set('status', next.status)
  if (next.grade) params.set('grade', next.grade)
  if (next.subjectId) params.set('subjectId', next.subjectId)
  if (next.strandId) params.set('strandId', next.strandId)
  if (next.subStrandId) params.set('subStrandId', next.subStrandId)
  return params
}

const statusChip = (status: BankStatus) => {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-800'
  if (status === 'rejected') return 'bg-red-100 text-red-800'
  return 'bg-amber-100 text-amber-800'
}

export const QuestionBankQueue = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { subjects, fetchSubjects } = useSubjectStore()
  const { strands, fetchStrandsBySubject, getStrandsBySubject } = useStrandStore()
  const { subStrands, fetchSubStrandsByStrand, getSubStrandsByStrand } = useSubStrandStore()

  const [filters, setFilters] = useState<QueueFilters>(() => readQuestionBankFiltersFromUrl(searchParams))
  const [entries, setEntries] = useState<BankEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStem, setEditStem] = useState('')
  const [editOptions, setEditOptions] = useState<string[]>([])
  const [editCorrect, setEditCorrect] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const applyFilters = (next: QueueFilters) => {
    setFilters(next)
    setSearchParams(filtersToSearchParams(next), { replace: true })
  }

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  useEffect(() => {
    if (filters.subjectId) fetchStrandsBySubject(filters.subjectId)
  }, [filters.subjectId, fetchStrandsBySubject])

  useEffect(() => {
    if (filters.strandId) fetchSubStrandsByStrand(filters.strandId)
  }, [filters.strandId, fetchSubStrandsByStrand])

  const filteredSubjects = useMemo(() => {
    if (!filters.grade) return []
    return subjects.filter((s) => s.grade === filters.grade)
  }, [subjects, filters.grade])

  const subjectStrands = useMemo(() => {
    if (!filters.subjectId) return []
    return getStrandsBySubject(filters.subjectId)
  }, [filters.subjectId, strands, getStrandsBySubject])

  const strandSubStrands = useMemo(() => {
    if (!filters.strandId) return []
    return getSubStrandsByStrand(filters.strandId)
  }, [filters.strandId, subStrands, getSubStrandsByStrand])

  const selectedSubStrand = useMemo(
    () => strandSubStrands.find((s) => s.id === filters.subStrandId) || null,
    [strandSubStrands, filters.subStrandId]
  )

  const loadEntries = async (nextFilters: QueueFilters = filters) => {
    setLoading(true)
    setError(null)
    try {
      const list = (await api.admin.listQuestionBank({
        status: nextFilters.status === 'all' ? undefined : nextFilters.status,
        grade: nextFilters.grade || undefined,
        subjectId: nextFilters.subjectId || undefined,
        strandId: nextFilters.strandId || undefined,
        subStrandId: nextFilters.subStrandId || undefined,
        limit: 80,
      })) as BankEntry[]
      setEntries(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question bank')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.grade, filters.subjectId, filters.strandId, filters.subStrandId])

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startEdit = (entry: BankEntry) => {
    setEditingId(entry.id)
    setExpandedIds((prev) => new Set(prev).add(entry.id))
    setEditStem(entry.question?.question || '')
    setEditOptions((entry.question?.options || []).map((opt) => (typeof opt === 'string' ? opt : '')))
    setEditCorrect(Number(entry.question?.correctAnswerIndex) || 0)
  }

  const saveEdit = async (entry: BankEntry) => {
    setBusyId(entry.id)
    setError(null)
    try {
      await api.admin.editQuestionBankEntry(entry.id, {
        question: editStem,
        options: editOptions,
        correctAnswerIndex: editCorrect,
      })
      setEditingId(null)
      await loadEntries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleApprove = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await api.admin.approveQuestionBankEntry(id)
      await loadEntries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (id: string) => {
    const reason = window.prompt('Reject reason (optional)', 'not original or not grade-fit') || undefined
    setBusyId(id)
    setError(null)
    try {
      await api.admin.rejectQuestionBankEntry(id, reason)
      await loadEntries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleGenerate = async () => {
    if (!selectedSubStrand) {
      setError('Pick Grade → Subject → Strand → Sub-strand first')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const result = (await api.admin.generateQuestionBank(selectedSubStrand.id, 8)) as {
        created?: number
        pending?: number
        rejected?: number
      }
      applyFilters({ ...filters, status: 'pending', subStrandId: selectedSubStrand.id })
      await loadEntries({ ...filters, status: 'pending', subStrandId: selectedSubStrand.id })
      window.alert(
        `Created ${result.created ?? 0} original items (${result.pending ?? 0} pending, ${result.rejected ?? 0} auto-rejected as too close to source).`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      className="rounded-[16px] border-2 border-indigo-100 bg-white/80 p-4 space-y-4"
      data-testid="question-bank-queue"
    >
      <div>
        <h2 className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Original question bank
        </h2>
        <p className="mt-1 text-sm text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Filter pending items by grade, subject, or sub-strand. Source PDFs above inform style only — never copy them.
          Approve here before lesson generation can pull them. Waiting lessons pick up approved items automatically.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Grade
          </label>
          <select
            value={filters.grade}
            onChange={(e) => {
              applyFilters({
                ...filters,
                grade: e.target.value as Grade | '',
                subjectId: '',
                strandId: '',
                subStrandId: '',
              })
            }}
            className="w-full px-3 py-2 rounded-[12px] border-2 border-slate-200 text-sm"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            <option value="">All grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
              </option>
            ))}
          </select>
        </div>
        {filters.grade && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Subject
            </label>
            <select
              value={filters.subjectId}
              onChange={(e) => {
                applyFilters({
                  ...filters,
                  subjectId: e.target.value,
                  strandId: '',
                  subStrandId: '',
                })
              }}
              className="w-full px-3 py-2 rounded-[12px] border-2 border-slate-200 text-sm"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <option value="">All subjects</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {filters.subjectId && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Strand
            </label>
            <select
              value={filters.strandId}
              onChange={(e) => {
                applyFilters({
                  ...filters,
                  strandId: e.target.value,
                  subStrandId: '',
                })
              }}
              className="w-full px-3 py-2 rounded-[12px] border-2 border-slate-200 text-sm"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <option value="">All strands</option>
              {subjectStrands.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {filters.strandId && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Sub-strand
            </label>
            <select
              value={filters.subStrandId}
              onChange={(e) => {
                applyFilters({
                  ...filters,
                  subStrandId: e.target.value,
                })
              }}
              className="w-full px-3 py-2 rounded-[12px] border-2 border-slate-200 text-sm"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <option value="">All sub-strands</option>
              {strandSubStrands.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => applyFilters({ ...filters, status: key })}
            className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${
              filters.status === key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!selectedSubStrand || generating}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Generate original batch
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Loading queue…
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
          No items in this filter. Generate a batch for a sub-strand, then review here.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const q = entry.question || {}
            const options = q.options || []
            const isEditing = editingId === entry.id
            const isExpanded = isEditing || expandedIds.has(entry.id)
            return (
              <div key={entry.id} className="rounded-[12px] border-2 border-slate-200 bg-white p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${statusChip(entry.status)}`}>
                    {entry.status}
                  </span>
                  {entry.grade && <span className="text-slate-500">Grade {entry.grade}</span>}
                  {entry.subjectName && <span className="text-slate-600">{entry.subjectName}</span>}
                  {entry.topic && <span className="text-slate-600">{entry.topic}</span>}
                  {entry.bloomLevel && <span className="text-slate-500">{entry.bloomLevel}</span>}
                  {entry.qaFlagged && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">QA flagged</span>
                  )}
                  {entry.flaggedNearDuplicate && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800">Too close to source</span>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editStem}
                      onChange={(e) => setEditStem(e.target.value)}
                      className="w-full px-3 py-2 rounded-[10px] border-2 border-slate-200 text-sm"
                      rows={2}
                    />
                    {editOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={editCorrect === i}
                          onChange={() => setEditCorrect(i)}
                        />
                        <input
                          value={opt}
                          onChange={(e) => {
                            const next = [...editOptions]
                            next[i] = e.target.value
                            setEditOptions(next)
                          }}
                          className="flex-1 px-3 py-1.5 rounded-[10px] border-2 border-slate-200 text-sm"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => saveEdit(entry)}
                      disabled={busyId === entry.id}
                      className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold"
                    >
                      Save edit
                    </button>
                  </div>
                ) : (
                  <>
                    <MathText
                      as="p"
                      text={q.question || ''}
                      className="text-sm font-semibold text-[#0F172A]"
                    />
                    {isExpanded &&
                      options.map((option, optIdx) => {
                        const isCorrect = optIdx === q.correctAnswerIndex
                        const misconception = q.distractors?.find((d) => d.optionIndex === optIdx)?.misconception
                        const rationale = q.reviewRationale?.[optIdx]?.trim()
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
                                <MathText text={typeof option === 'string' ? option : ''} />
                              </span>
                              {isCorrect && (
                                <span
                                  className="ml-auto px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full"
                                  style={{ fontFamily: 'Manrope, sans-serif' }}
                                >
                                  Correct
                                </span>
                              )}
                            </div>
                            {!isCorrect && misconception && (
                              <p className="mt-1 text-[11px] text-amber-800" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                Diagnoses: <MathText text={misconception} />
                              </p>
                            )}
                            {rationale && (
                              <p
                                className="mt-1 text-[11px] text-slate-600"
                                style={{ fontFamily: 'Manrope, sans-serif' }}
                                title="Full reasoning for reviewers — not shown to learners"
                              >
                                Reviewer note: <MathText text={rationale} />
                              </p>
                            )}
                          </div>
                        )
                      })}
                  </>
                )}

                {isExpanded && entry.qaIssue && (
                  <p className="text-[11px] text-amber-800">QA: {entry.qaIssue}</p>
                )}
                {isExpanded && entry.rejectReason && (
                  <p className="text-[11px] text-red-700">Rejected: {entry.rejectReason}</p>
                )}
                {isExpanded && entry.styleSourceNote && (
                  <p className="text-[11px] text-slate-500">{entry.styleSourceNote}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(entry.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-slate-200 text-xs font-semibold"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </button>
                  )}
                  {entry.status !== 'approved' && !entry.flaggedNearDuplicate && (
                    <button
                      type="button"
                      onClick={() => handleApprove(entry.id)}
                      disabled={busyId === entry.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold"
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                  )}
                  {entry.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => handleReject(entry.id)}
                      disabled={busyId === entry.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-semibold"
                    >
                      <X className="w-3 h-3" />
                      Reject
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (isEditing ? setEditingId(null) : startEdit(entry))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-slate-200 text-xs font-semibold"
                  >
                    <Pencil className="w-3 h-3" />
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
