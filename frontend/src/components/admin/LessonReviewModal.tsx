import { useEffect, useMemo, useState, useRef } from 'react'
import { Check, ChevronLeft, ChevronRight, Edit, FileText, HelpCircle, ImageIcon, Loader2, RefreshCw, Upload } from 'lucide-react'
import { Modal } from '@/components/modals/Modal'
import { api } from '@/lib/api'
import { modalityLabel } from '@/lib/modalityQuiz'
import { MathText } from '@/components/ui/MathText'
import { LessonTeachingFromLesson } from '@/components/learner/LessonTeachingBlocks'
import { LiveDiagram, isLiveDiagramType } from '@/components/learner/diagrams/LiveDiagram'
import { OptionVisual } from '@/components/learner/OptionVisual'
import { ColumnAddition } from '@/components/learner/quiz/ColumnAddition'
import { AdditionWorkedExample } from '@/components/learner/quiz/AdditionWorkedExample'
import { additionWorkedSteps, resolveAdditionLayout } from '@/lib/additionLayout'
import type { Lesson, LessonVisualBrief, QuizQuestion } from '@/types'

const DIAGRAM_TYPES = [
  'number_line',
  'fraction_bars',
  'bar_model',
  'place_value',
  'labeled_boxes',
  'process_flow',
  'comparison',
  'coordinate_plane',
  'matrix',
  'counting_circles',
  'object_quantity',
  'rectangle',
  'cube',
  'indices',
  'right_triangle',
  'unit_circle',
] as const

type ReviewTab = 'content' | 'visuals' | 'quiz'

interface LessonReviewModalProps {
  lesson: Lesson
  isOpen: boolean
  onClose: () => void
  onEdit: (lesson: Lesson) => void
  onApprove: (lesson: Lesson) => Promise<void>
  onLessonUpdated?: (lesson: Lesson) => void
}

export const LessonReviewModal = ({
  lesson: initialLesson,
  isOpen,
  onClose,
  onEdit,
  onApprove,
  onLessonUpdated,
}: LessonReviewModalProps) => {
  const [lesson, setLesson] = useState(initialLesson)
  const [reviewTab, setReviewTab] = useState<ReviewTab>('quiz')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [briefs, setBriefs] = useState<LessonVisualBrief[]>(initialLesson.visualBriefs || [])
  const [briefIndex, setBriefIndex] = useState(0)
  const [previewSvg, setPreviewSvg] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [savingVisuals, setSavingVisuals] = useState(false)
  const [approving, setApproving] = useState(false)
  const [visualError, setVisualError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [uploadingVisual, setUploadingVisual] = useState(false)
  const [regenNote, setRegenNote] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [modalityFilter, setModalityFilter] = useState<'all' | 'visual' | 'text_steps' | 'practice'>('all')
  const [bloomFilter, setBloomFilter] = useState<'all' | 'recall' | 'understand' | 'apply' | 'reason'>('all')
  const [qaFilter, setQaFilter] = useState<'all' | 'flagged'>('all')
  const [toppingUp, setToppingUp] = useState(false)
  const [topUpMessage, setTopUpMessage] = useState<string | null>(null)

  const TARGET_BANK = 30

  useEffect(() => {
    setLesson(initialLesson)
    setBriefs(initialLesson.visualBriefs || [])
    setBriefIndex(0)
    setCurrentQuestionIndex(0)
    setReviewTab('quiz')
    setPreviewSvg(null)
    setVisualError(null)
    setModalityFilter('all')
    setBloomFilter('all')
    setQaFilter('all')
    setTopUpMessage(null)
  }, [initialLesson.id, isOpen])

  const questions = lesson.quiz?.questions || []
  const coverageReport = lesson.quiz?.coverageReport
  const bankCoverage = useMemo(() => {
    const modality: Record<string, number> = { visual: 0, text_steps: 0, practice: 0, other: 0 }
    const bloom: Record<string, number> = {
      recall: 0,
      understand: 0,
      apply: 0,
      reason: 0,
      other: 0,
    }
    const outcomes = new Set<number>()
    let qaFlagged = 0
    let coverageRemapped = 0
    for (const qq of questions) {
      const m = qq.modality || 'other'
      if (modality[m] != null) modality[m] += 1
      else modality.other += 1
      const b = qq.bloomLevel || 'other'
      if (bloom[b] != null) bloom[b] += 1
      else bloom.other += 1
      if (qq.learningOutcomeIndex) outcomes.add(qq.learningOutcomeIndex)
      if (qq.qa_flagged) qaFlagged += 1
      if (qq.coverage_remapped) coverageRemapped += 1
    }
    return {
      modality,
      bloom,
      outcomesCovered: outcomes.size,
      total: questions.length,
      qaFlagged,
      coverageRemapped,
    }
  }, [questions])

  const filteredIndices = useMemo(() => {
    return questions
      .map((qq, idx) => ({ qq, idx }))
      .filter(({ qq }) => {
        if (modalityFilter !== 'all' && (qq.modality || 'practice') !== modalityFilter) return false
        if (bloomFilter !== 'all' && (qq.bloomLevel || '') !== bloomFilter) return false
        if (qaFilter === 'flagged' && !qq.qa_flagged) return false
        return true
      })
      .map(({ idx }) => idx)
  }, [questions, modalityFilter, bloomFilter, qaFilter])

  const qCount = questions.length
  const safeIndex = Math.min(Math.max(currentQuestionIndex, 0), Math.max(qCount - 1, 0))
  const q = questions[safeIndex] as QuizQuestion | undefined
  const numericLayout =
    q?.interactionType === 'numeric_entry'
      ? resolveAdditionLayout(typeof q.params?.layout === 'string' ? q.params.layout : undefined)
      : null
  const showColumnAddition =
    numericLayout === 'vertical' &&
    Number.isInteger(Number(q?.params?.a)) &&
    Number.isInteger(Number(q?.params?.b))
  const activeBrief = briefs[briefIndex]

  useEffect(() => {
    if (filteredIndices.length === 0) return
    if (!filteredIndices.includes(safeIndex)) {
      setCurrentQuestionIndex(filteredIndices[0])
    }
  }, [filteredIndices, safeIndex])

  const handleTopUpBank = async () => {
    setToppingUp(true)
    setTopUpMessage(null)
    setVisualError(null)
    try {
      const result = await api.admin.topUpQuizBank(lesson.id)
      const updated = result.lesson as Lesson
      setLesson(updated)
      onLessonUpdated?.(updated)
      if (result.added === 0) {
        setTopUpMessage(`Bank already at ${result.bankSize} questions.`)
      } else {
        setTopUpMessage(`Added ${result.added} questions — bank now ${result.bankSize}.`)
      }
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : 'Failed to top up quiz bank')
    } finally {
      setToppingUp(false)
    }
  }

  const paramFields = useMemo(() => {
    if (!activeBrief) return [] as { key: string; label: string }[]
    const t = activeBrief.diagramType || 'labeled_boxes'
    if (t === 'number_line') {
      return [
        { key: 'min', label: 'Min' },
        { key: 'max', label: 'Max' },
        { key: 'step', label: 'Step' },
        { key: 'highlight', label: 'Highlight' },
        { key: 'label', label: 'Label' },
      ]
    }
    if (t === 'fraction_bars') {
      return [
        { key: 'parts', label: 'Parts' },
        { key: 'shaded', label: 'Shaded' },
        { key: 'label', label: 'Label' },
      ]
    }
    if (t === 'place_value') {
      return [
        { key: 'number', label: 'Number' },
        { key: 'label', label: 'Label' },
      ]
    }
    if (t === 'coordinate_plane') {
      return [
        { key: 'title', label: 'Title' },
        { key: 'xMin', label: 'x min' },
        { key: 'xMax', label: 'x max' },
        { key: 'yMin', label: 'y min' },
        { key: 'yMax', label: 'y max' },
      ]
    }
    if (t === 'matrix') {
      return [
        { key: 'title', label: 'Title' },
        { key: 'rows', label: 'Rows' },
        { key: 'cols', label: 'Cols' },
      ]
    }
    if (t === 'counting_circles') {
      return [
        { key: 'title', label: 'Title' },
        { key: 'count', label: 'Count' },
        { key: 'columns', label: 'Columns' },
      ]
    }
    if (t === 'indices') {
      return [
        { key: 'title', label: 'Title' },
        { key: 'base', label: 'Base' },
        { key: 'exponent', label: 'Exponent' },
      ]
    }
    if (t === 'right_triangle') {
      return [
        { key: 'title', label: 'Title' },
        { key: 'angleDeg', label: 'Angle °' },
        { key: 'opposite', label: 'Opposite' },
        { key: 'adjacent', label: 'Adjacent' },
        { key: 'hypotenuse', label: 'Hypotenuse' },
      ]
    }
    if (t === 'unit_circle') {
      return [
        { key: 'title', label: 'Title' },
        { key: 'angleDeg', label: 'Angle °' },
        { key: 'pointLabel', label: 'Point label' },
      ]
    }
    return [{ key: 'label', label: 'Label' }, { key: 'title', label: 'Title' }]
  }, [activeBrief])

  const runPreview = async (brief: LessonVisualBrief) => {
    setPreviewLoading(true)
    setVisualError(null)
    try {
      const res = await api.admin.previewDiagram({
        id: brief.id,
        skillFocus: brief.skillFocus,
        brief: brief.brief,
        diagramType: brief.diagramType,
        params: brief.params || {},
      })
      setPreviewSvg(res.svg)
    } catch (err) {
      setPreviewSvg(null)
      setVisualError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => {
    if (reviewTab === 'visuals' && activeBrief) {
      runPreview(activeBrief)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewTab, briefIndex, activeBrief?.diagramType])

  const updateActiveBrief = (patch: Partial<LessonVisualBrief>) => {
    setBriefs((prev) =>
      prev.map((b, i) => (i === briefIndex ? { ...b, ...patch } : b))
    )
  }

  const updateParam = (key: string, value: string) => {
    const numKeys = new Set([
      'min',
      'max',
      'step',
      'highlight',
      'parts',
      'shaded',
      'number',
      'xMin',
      'xMax',
      'yMin',
      'yMax',
      'rows',
      'cols',
      'count',
      'columns',
      'base',
      'exponent',
      'angleDeg',
    ])
    const parsed = numKeys.has(key) && value !== '' && !Number.isNaN(Number(value)) ? Number(value) : value
    updateActiveBrief({
      params: { ...(activeBrief?.params || {}), [key]: parsed },
    })
  }

  const updateLineParam = (lineIndex: number, key: 'm' | 'c' | 'label', value: string) => {
    const lines = Array.isArray(activeBrief?.params?.lines)
      ? [...(activeBrief!.params!.lines as Record<string, unknown>[])]
      : [
          { m: 1, c: 0, label: 'Line 1' },
          { m: -1, c: 0, label: 'Line 2' },
        ]
    while (lines.length <= lineIndex) {
      lines.push({ m: 1, c: 0, label: `Line ${lines.length + 1}` })
    }
    lines[lineIndex] = { ...lines[lineIndex], [key]: value }
    updateActiveBrief({
      params: { ...(activeBrief?.params || {}), lines },
    })
  }

  const saveVisuals = async () => {
    setSavingVisuals(true)
    setVisualError(null)
    try {
      const updated = (await api.admin.updateLessonVisuals(lesson.id, {
        visualBriefs: briefs,
        contentBlocks: lesson.contentBlocks || lesson.quiz?.contentBlocks,
      })) as Lesson
      setLesson(updated)
      setBriefs(updated.visualBriefs || briefs)
      onLessonUpdated?.(updated)
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : 'Failed to save visuals')
    } finally {
      setSavingVisuals(false)
    }
  }

  const regenerateActiveVisual = async () => {
    if (!activeBrief?.id) {
      setVisualError('Save visuals first so this brief has an id, or pick a brief with an id.')
      return
    }
    setRegenerating(true)
    setVisualError(null)
    try {
      // Persist local edits first so regenerate uses latest text
      await api.admin.updateLessonVisuals(lesson.id, {
        visualBriefs: briefs,
        contentBlocks: lesson.contentBlocks || lesson.quiz?.contentBlocks,
      })
      const res = (await api.admin.regenerateLessonVisual(lesson.id, activeBrief.id, {
        instruction: regenNote || undefined,
        preferredType: activeBrief.diagramType,
      })) as { lesson: Lesson; brief: LessonVisualBrief }
      setLesson(res.lesson)
      setBriefs(res.lesson.visualBriefs || briefs)
      onLessonUpdated?.(res.lesson)
      setRegenNote('')
      if (res.brief) await runPreview(res.brief)
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : 'Failed to regenerate figure')
    } finally {
      setRegenerating(false)
    }
  }

  const uploadActiveVisual = async (file: File) => {
    if (!activeBrief?.id) {
      setVisualError('Brief needs an id before upload.')
      return
    }
    setUploadingVisual(true)
    setVisualError(null)
    try {
      await api.admin.updateLessonVisuals(lesson.id, {
        visualBriefs: briefs,
        contentBlocks: lesson.contentBlocks || lesson.quiz?.contentBlocks,
      })
      const res = (await api.admin.uploadLessonVisual(lesson.id, activeBrief.id, file)) as {
        lesson: Lesson
        brief: LessonVisualBrief
        url: string
      }
      setLesson(res.lesson)
      setBriefs(res.lesson.visualBriefs || briefs)
      onLessonUpdated?.(res.lesson)
      setPreviewSvg(null)
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : 'Failed to upload figure')
    } finally {
      setUploadingVisual(false)
    }
  }

  const diagramUrlForQuestion = (question: QuizQuestion) => {
    if (!question.diagramBriefId) return null
    const asset = lesson.visualAssets?.find((a) => a.id === question.diagramBriefId)
    if (asset?.url) return asset.url
    // Prefer id match over positional images (teaching + per-question briefs share one list)
    const idx = (lesson.visualBriefs || []).findIndex((b) => b.id === question.diagramBriefId)
    if (idx >= 0) {
      const byBriefOrder = lesson.visualAssets?.[idx]?.url
      if (byBriefOrder) return byBriefOrder
    }
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review: ${lesson.title}`}
      size="xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-full bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all text-sm font-semibold text-slate-700"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onEdit(lesson)
              onClose()
            }}
            className="flex-1 px-4 py-2.5 rounded-full bg-indigo-100 hover:bg-indigo-200 transition-all text-sm font-semibold text-indigo-700 flex items-center justify-center"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Lesson
          </button>
          <button
            type="button"
            disabled={approving}
            onClick={async () => {
              setApproving(true)
              try {
                if (briefs.length > 0) {
                  await api.admin.updateLessonVisuals(lesson.id, {
                    visualBriefs: briefs,
                    contentBlocks: lesson.contentBlocks || lesson.quiz?.contentBlocks,
                  })
                }
                await onApprove(lesson)
                onClose()
              } finally {
                setApproving(false)
              }
            }}
            className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 transition-all text-sm font-semibold flex items-center justify-center disabled:opacity-60"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {approving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Approve Lesson
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {lesson.description}
        </p>

        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-full w-fit">
          {(
            [
              { id: 'content' as const, label: 'Content', icon: FileText },
              { id: 'visuals' as const, label: `Visuals (${briefs.length})`, icon: ImageIcon },
              { id: 'quiz' as const, label: `Quiz (${qCount})`, icon: HelpCircle },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReviewTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  reviewTab === tab.id
                    ? 'bg-white text-indigo-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {reviewTab === 'content' && (
          <div className="space-y-3">
            {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
              <div className="rounded-[16px] border-2 border-indigo-100 bg-indigo-50/60 p-4">
                <p
                  className="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-2"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Learning objectives
                </p>
                <ul className="space-y-1.5">
                  {lesson.learningObjectives.map((obj, i) => (
                    <li key={i} className="text-sm text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {i + 1}. {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(lesson.contentBlocks || lesson.quiz?.contentBlocks || []).length > 0 ||
            Boolean(lesson.content?.trim()) ? (
              <LessonTeachingFromLesson lesson={lesson} showDiagrams />
            ) : (
              <div className="rounded-[16px] border-2 border-slate-200 bg-slate-50 p-4">
                <p
                  className="text-sm text-[#0F172A] whitespace-pre-wrap leading-relaxed"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  No content text on this lesson.
                </p>
              </div>
            )}
          </div>
        )}

        {reviewTab === 'visuals' && (
          <div className="space-y-4">
            {briefs.length === 0 ? (
              <p className="text-sm text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                No visual briefs on this lesson. Approve will skip diagrams.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {briefs.map((b, i) => {
                    const isQuestion = String(b.id || '').startsWith('qvb-') || (b as { scope?: string }).scope === 'question'
                    return (
                    <button
                      key={b.id || i}
                      type="button"
                      onClick={() => setBriefIndex(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        i === briefIndex ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      {isQuestion ? 'Q · ' : 'Teach · '}
                      {b.id || `Diagram ${i + 1}`}
                    </button>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Teaching diagrams (vb-*) appear in lesson content. Quiz diagrams (qvb-*) are unique per visual question.
                </p>

                {activeBrief && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Diagram type
                        <select
                          className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm"
                          value={activeBrief.diagramType || 'labeled_boxes'}
                          onChange={(e) => updateActiveBrief({ diagramType: e.target.value })}
                        >
                          {DIAGRAM_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-semibold text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Alt / brief
                        <input
                          className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm"
                          value={activeBrief.brief || ''}
                          onChange={(e) => updateActiveBrief({ brief: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Skill focus
                        <input
                          className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm"
                          value={activeBrief.skillFocus || ''}
                          onChange={(e) => updateActiveBrief({ skillFocus: e.target.value })}
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {paramFields.map((f) => (
                          <label
                            key={f.key}
                            className="block text-xs font-semibold text-slate-600"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                          >
                            {f.label}
                            <input
                              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm"
                              value={String(activeBrief.params?.[f.key] ?? '')}
                              onChange={(e) => updateParam(f.key, e.target.value)}
                            />
                          </label>
                        ))}
                      </div>
                      {activeBrief.diagramType === 'coordinate_plane' && (
                        <div className="space-y-2 rounded-[12px] border border-indigo-100 bg-indigo-50/40 p-3">
                          <p className="text-xs font-bold text-indigo-800" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Lines (y = mx + c)
                          </p>
                          {[0, 1].map((li) => {
                            const line = (Array.isArray(activeBrief.params?.lines)
                              ? (activeBrief.params.lines as Record<string, unknown>[])[li]
                              : null) || { m: '', c: '', label: '' }
                            return (
                              <div key={li} className="grid grid-cols-3 gap-2">
                                <label className="text-[10px] font-semibold text-slate-600">
                                  Slope m
                                  <input
                                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                                    value={String(line.m ?? '')}
                                    placeholder="-2/3"
                                    onChange={(e) => updateLineParam(li, 'm', e.target.value)}
                                  />
                                </label>
                                <label className="text-[10px] font-semibold text-slate-600">
                                  Intercept c
                                  <input
                                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                                    value={String(line.c ?? '')}
                                    placeholder="0"
                                    onChange={(e) => updateLineParam(li, 'c', e.target.value)}
                                  />
                                </label>
                                <label className="text-[10px] font-semibold text-slate-600">
                                  Label
                                  <input
                                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                                    value={String(line.label ?? '')}
                                    onChange={(e) => updateLineParam(li, 'label', e.target.value)}
                                  />
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => activeBrief && runPreview(briefs[briefIndex] || activeBrief)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-100 text-sm font-semibold text-slate-800"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                          <RefreshCw className="w-4 h-4" />
                          Refresh preview
                        </button>
                        <button
                          type="button"
                          disabled={savingVisuals}
                          onClick={saveVisuals}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                          {savingVisuals ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Save visuals
                        </button>
                      </div>
                      <div className="rounded-[12px] border border-amber-100 bg-amber-50/50 p-3 space-y-2">
                        <p className="text-xs font-bold text-amber-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Redirect / regenerate figure
                        </p>
                        <input
                          className="w-full rounded-xl border-2 border-amber-100 px-3 py-2 text-sm bg-white"
                          placeholder="Optional note e.g. use unit circle for 60°"
                          value={regenNote}
                          onChange={(e) => setRegenNote(e.target.value)}
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={regenerating || !activeBrief?.id}
                            onClick={regenerateActiveVisual}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-600 text-white text-sm font-semibold disabled:opacity-60"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                          >
                            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Regenerate for topic
                          </button>
                          <button
                            type="button"
                            disabled={uploadingVisual || !activeBrief?.id}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border-2 border-slate-200 text-sm font-semibold text-slate-800 disabled:opacity-60"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                          >
                            {uploadingVisual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Upload own figure
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) void uploadActiveVisual(f)
                              e.target.value = ''
                            }}
                          />
                        </div>
                        {(activeBrief as LessonVisualBrief & { source?: string; customUrl?: string })?.source ===
                          'upload' && (
                          <p className="text-[11px] text-emerald-800" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Using admin upload — approve will keep this figure.
                          </p>
                        )}
                      </div>
                      {visualError && (
                        <p className="text-xs text-red-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {visualError}
                        </p>
                      )}
                    </div>
                    <div className="rounded-[16px] border-2 border-slate-200 bg-white min-h-[200px] flex items-center justify-center p-3 overflow-auto">
                      {previewLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      ) : activeBrief.customUrl ||
                        (activeBrief.source === 'upload' &&
                          lesson.visualAssets?.find((a) => a.id === activeBrief.id)?.url) ? (
                        <img
                          src={
                            activeBrief.customUrl ||
                            lesson.visualAssets?.find((a) => a.id === activeBrief.id)?.url ||
                            ''
                          }
                          alt={activeBrief.brief || 'Custom figure'}
                          className="max-h-64 w-auto object-contain"
                        />
                      ) : previewSvg ? (
                        <div
                          className="w-full [&_svg]:max-w-full [&_svg]:h-auto"
                          dangerouslySetInnerHTML={{ __html: previewSvg }}
                        />
                      ) : (
                        <p className="text-sm text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          No preview yet
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {reviewTab === 'quiz' && (
          <div className="space-y-4">
            {qCount === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  No quiz questions on this lesson.
                </p>
                <button
                  type="button"
                  onClick={handleTopUpBank}
                  disabled={toppingUp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  {toppingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Generate quiz bank
                </button>
                {topUpMessage && (
                  <p className="text-xs text-emerald-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {topUpMessage}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-[14px] border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Question bank: {bankCoverage.total}/{TARGET_BANK} · outcomes covered:{' '}
                      {bankCoverage.outcomesCovered}
                      {bankCoverage.total < TARGET_BANK ? (
                        <span className="text-amber-700 font-semibold"> · short — top up recommended</span>
                      ) : null}
                    </p>
                    {bankCoverage.total < TARGET_BANK && (
                      <button
                        type="button"
                        onClick={handleTopUpBank}
                        disabled={toppingUp}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-semibold disabled:opacity-50"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        {toppingUp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Top up to {TARGET_BANK}
                      </button>
                    )}
                  </div>
                  {topUpMessage && (
                    <p className="text-xs text-emerald-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {topUpMessage}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[10px]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                      visual {bankCoverage.modality.visual}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      text_steps {bankCoverage.modality.text_steps}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      practice {bankCoverage.modality.practice}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      recall {bankCoverage.bloom.recall}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      apply {bankCoverage.bloom.apply}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      reason {bankCoverage.bloom.reason}
                    </span>
                  </div>
                  {((coverageReport?.remapped?.length ?? 0) > 0 ||
                    (coverageReport?.stillMissing?.length ?? 0) > 0 ||
                    bankCoverage.coverageRemapped > 0) && (
                    <p
                      className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-[10px] px-3 py-2"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      {(coverageReport?.remapped?.length ?? bankCoverage.coverageRemapped) > 0 && (
                        <>
                          {coverageReport?.remapped?.length ?? bankCoverage.coverageRemapped} outcome
                          {(coverageReport?.remapped?.length ?? bankCoverage.coverageRemapped) === 1
                            ? ''
                            : 's'}{' '}
                          lack a dedicated question (remapped onto existing items)
                          {coverageReport?.remapped?.length
                            ? `: ${coverageReport.remapped
                                .map((idx) => coverageReport.outcomes?.[idx - 1] || `#${idx}`)
                                .join('; ')}`
                            : ''}
                          .{' '}
                        </>
                      )}
                      {(coverageReport?.stillMissing?.length ?? 0) > 0 && (
                        <>
                          Still missing coverage for:{' '}
                          {coverageReport!.stillMissing
                            .map((idx) => coverageReport!.outcomes?.[idx - 1] || `#${idx}`)
                            .join('; ')}
                          .
                        </>
                      )}
                    </p>
                  )}
                  {bankCoverage.qaFlagged > 0 && (
                    <p
                      className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-[10px] px-3 py-2"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      {bankCoverage.qaFlagged} question{bankCoverage.qaFlagged === 1 ? '' : 's'} flagged
                      for review (automated QA)
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <select
                      value={modalityFilter}
                      onChange={(e) =>
                        setModalityFilter(e.target.value as typeof modalityFilter)
                      }
                      className="text-xs rounded-full border border-slate-200 px-3 py-1.5 bg-white"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      <option value="all">All modalities</option>
                      <option value="visual">Visual</option>
                      <option value="text_steps">Text steps</option>
                      <option value="practice">Practice</option>
                    </select>
                    <select
                      value={bloomFilter}
                      onChange={(e) => setBloomFilter(e.target.value as typeof bloomFilter)}
                      className="text-xs rounded-full border border-slate-200 px-3 py-1.5 bg-white"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      <option value="all">All bloom levels</option>
                      <option value="recall">Recall</option>
                      <option value="understand">Understand</option>
                      <option value="apply">Apply</option>
                      <option value="reason">Reason</option>
                    </select>
                    {bankCoverage.qaFlagged > 0 && (
                      <select
                        value={qaFilter}
                        onChange={(e) => setQaFilter(e.target.value as typeof qaFilter)}
                        className="text-xs rounded-full border border-slate-200 px-3 py-1.5 bg-white"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        <option value="all">All QA status</option>
                        <option value="flagged">QA flagged only</option>
                      </select>
                    )}
                    <span className="text-[10px] text-slate-500 self-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Showing {filteredIndices.length} of {qCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const pos = filteredIndices.indexOf(safeIndex)
                      const prev = filteredIndices[Math.max(0, pos - 1)]
                      if (prev != null) setCurrentQuestionIndex(prev)
                    }}
                    disabled={filteredIndices.indexOf(safeIndex) <= 0}
                    className="w-9 h-9 rounded-full border-2 border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 flex flex-wrap gap-1.5 justify-center max-h-20 overflow-y-auto py-1">
                    {filteredIndices.map((idx) => {
                      const qq = questions[idx]
                      return (
                        <button
                          key={qq.id || idx}
                          type="button"
                          onClick={() => setCurrentQuestionIndex(idx)}
                          title={
                            qq.qa_flagged
                              ? qq.qa_issue || 'QA flagged — review'
                              : qq.coverage_remapped
                                ? 'Outcome remapped — no dedicated question'
                                : qq.flagged_near_duplicate
                                  ? 'Near duplicate — review'
                                  : modalityLabel(qq.modality)
                          }
                          className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                            idx === safeIndex
                              ? 'bg-indigo-600 text-white'
                              : qq.qa_flagged
                                ? 'bg-rose-200 text-rose-900 ring-2 ring-rose-400'
                                : qq.flagged_near_duplicate || qq.coverage_remapped
                                  ? 'bg-amber-200 text-amber-900 ring-2 ring-amber-400'
                                  : qq.modality === 'visual'
                                    ? 'bg-violet-100 text-violet-800'
                                    : qq.modality === 'text_steps'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                          }`}
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const pos = filteredIndices.indexOf(safeIndex)
                      const next = filteredIndices[Math.min(filteredIndices.length - 1, pos + 1)]
                      if (next != null) setCurrentQuestionIndex(next)
                    }}
                    disabled={
                      filteredIndices.length === 0 ||
                      filteredIndices.indexOf(safeIndex) >= filteredIndices.length - 1
                    }
                    className="w-9 h-9 rounded-full border-2 border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-center text-xs text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Question {safeIndex + 1} of {qCount}
                  {filteredIndices.length !== qCount ? ` (filtered)` : ''}
                </p>

                {q && (
                  <div className="bg-white rounded-[16px] p-4 sm:p-5 border-2 border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-800 rounded-full"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        {modalityLabel(q.modality)}
                      </span>
                      {q.skillFocus && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded-full"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                          {q.skillFocus}
                        </span>
                      )}
                      {q.bloomLevel && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full capitalize"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                          {q.bloomLevel}
                        </span>
                      )}
                      {q.interactionType && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold bg-teal-100 text-teal-800 rounded-full"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                          {q.interactionType}
                        </span>
                      )}
                      {q.flagged_near_duplicate && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-900 rounded-full border border-amber-300"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                          title="Generated stem is very similar to a past-paper exemplar"
                        >
                          Near duplicate — review
                        </span>
                      )}
                      {q.coverage_remapped && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-900 rounded-full border border-amber-300"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                          title="This question was reassigned to cover an outcome that had no dedicated question"
                        >
                          Coverage remapped
                        </span>
                      )}
                      {q.qa_flagged && (
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-900 rounded-full border border-rose-300"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                          title={q.qa_issue || 'Automated QA flagged this question'}
                        >
                          QA flagged{q.qa_issue ? `: ${q.qa_issue}` : ''}
                        </span>
                      )}
                    </div>

                    {q.modality === 'text_steps' && !showColumnAddition && q.steps && q.steps.length > 0 ? (
                      <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-[12px] p-3">
                        {q.steps.map((s, i) => (
                          <li key={i} style={{ fontFamily: 'Manrope, sans-serif' }}>
                            <MathText text={s} />
                          </li>
                        ))}
                      </ol>
                    ) : null}

                    {q.modality === 'visual' && !showColumnAddition && (
                      <div className="rounded-[12px] border border-violet-100 bg-violet-50/50 p-3 text-xs text-violet-800" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {q.diagramBriefId && /^vb-\d+$/i.test(q.diagramBriefId) ? (
                          <p className="text-amber-800 font-semibold mb-1">
                            Shares teaching diagram {q.diagramBriefId} — regenerate this lesson for a per-question figure.
                          </p>
                        ) : (
                          <p className="mb-1">
                            Question figure: {q.diagramBriefId || '(missing)'}
                            {briefs.find((b) => b.id === q.diagramBriefId)?.diagramType
                              ? ` · ${briefs.find((b) => b.id === q.diagramBriefId)?.diagramType}`
                              : ''}
                          </p>
                        )}
                        {(() => {
                          const brief = briefs.find((b) => b.id === q.diagramBriefId)
                          if (brief && isLiveDiagramType(brief.diagramType)) {
                            return (
                              <LiveDiagram
                                diagramType={brief.diagramType}
                                params={brief.params}
                                className="mt-2"
                              />
                            )
                          }
                          if (diagramUrlForQuestion(q)) {
                            return <img src={diagramUrlForQuestion(q)!} alt="" className="mt-2 max-h-40 mx-auto" />
                          }
                          return (
                            <p className="text-violet-600 mt-1">SVG renders on approve (preview under Visuals tab).</p>
                          )
                        })()}
                      </div>
                    )}

                    <MathText
                      as="p"
                      text={showColumnAddition ? 'Add.' : q.question || ''}
                      className="text-base sm:text-lg font-semibold text-[#0F172A]"
                    />

                    {q.interactionType === 'numeric_entry' && (
                      <div className="rounded-[16px] border-2 border-indigo-200 bg-indigo-50 p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                          {showColumnAddition ? 'Column addition' : 'Numeric entry'}
                        </p>
                        {showColumnAddition && q.modality === 'text_steps' ? (
                          <AdditionWorkedExample
                            a={Number(q.params?.a)}
                            b={Number(q.params?.b)}
                            steps={additionWorkedSteps(Number(q.params?.a), Number(q.params?.b))}
                          />
                        ) : showColumnAddition ? (
                          <div className="flex justify-center bg-white rounded-[12px] border border-indigo-100">
                            <ColumnAddition
                              a={Number(q.params?.a)}
                              b={Number(q.params?.b)}
                              scaffoldCarry
                              animate
                            />
                          </div>
                        ) : (
                          <div className="min-h-12 rounded-[12px] border-2 border-indigo-200 bg-white flex items-center justify-center text-2xl font-black text-slate-400">
                            —
                          </div>
                        )}
                        <p className="text-xs text-slate-600">
                          Learner types the answer. Expected from formula
                          {q.answerFormula ? ` ${q.answerFormula}` : ''}.
                        </p>
                      </div>
                    )}

                    {q.options?.map((option, optIdx) => {
                      const isCorrect = optIdx === q.correctAnswerIndex
                      const optExplanation = q.optionExplanations?.[optIdx]
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
                            <span className="text-sm text-[#0F172A] flex-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              <OptionVisual option={option} compact />
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
                          {optExplanation && (
                            <p
                              className={`mt-2 text-xs whitespace-pre-line rounded-[8px] p-2 border ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-red-50 border-red-200 text-red-800'
                              }`}
                              style={{ fontFamily: 'Manrope, sans-serif' }}
                            >
                              <MathText text={optExplanation} />
                            </p>
                          )}
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
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
