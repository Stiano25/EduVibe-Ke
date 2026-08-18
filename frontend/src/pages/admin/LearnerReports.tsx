import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, Download, Loader2, Search } from 'lucide-react'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { LearnerReportCard } from '@/components/admin/LearnerReportCard'
import { api } from '@/lib/api'
import type { User } from '@/types'
import type { ClassInsights, LearnerReport } from '@/lib/learnerReport'

const grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const

export const AdminLearnerReports = () => {
  const [searchParams] = useSearchParams()
  const preselectedId = searchParams.get('learnerId') || ''

  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [grade, setGrade] = useState('')
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [reports, setReports] = useState<LearnerReport[]>([])
  const [insights, setInsights] = useState<ClassInsights | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const autoStarted = useRef(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoadingUsers(true)
        const data = (await api.admin.getUsers()) as User[]
        if (cancelled) return
        const learners = data.filter((user) => user.role === 'learner')
        setUsers(learners)
        if (preselectedId && learners.some((user) => user.id === preselectedId)) {
          setSelectedIds(new Set([preselectedId]))
        }
      } catch (err: unknown) {
        if (!cancelled) setUsersError(err instanceof Error ? err.message : 'Failed to load learners')
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [preselectedId])

  const filteredLearners = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((user) => {
      if (grade && user.grade !== grade) return false
      if (!q) return true
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        String(user.grade || '').includes(q)
      )
    })
  }, [users, grade, query])

  const allFilteredSelected =
    filteredLearners.length > 0 && filteredLearners.every((user) => selectedIds.has(user.id))

  const toggleLearner = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        for (const user of filteredLearners) next.delete(user.id)
      } else {
        for (const user of filteredLearners) next.add(user.id)
      }
      return next
    })
  }

  const generate = async (ids = [...selectedIds]) => {
    if (!ids.length) {
      setGenerateError('Select at least one learner')
      return
    }
    try {
      setGenerating(true)
      setGenerateError('')
      const data = (await api.admin.generateLearnerReports(ids)) as {
        generatedAt: string
        reports: LearnerReport[]
        classInsights: ClassInsights | null
      }
      setReports(data.reports || [])
      setInsights(data.classInsights || null)
      setGeneratedAt(data.generatedAt || new Date().toISOString())
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate reports')
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (autoStarted.current || !preselectedId || loadingUsers) return
    if (!users.some((user) => user.id === preselectedId)) return
    autoStarted.current = true
    generate([preselectedId])
    // One-shot when arriving from Users with a learner id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedId, loadingUsers, users])

  return (
    <div className="min-h-screen premium-mesh" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="p-[5px]">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[24px] border-white/40 p-4 sm:p-6 max-w-6xl mx-auto">
          <StaggeredEntry>
            <div className="space-y-5">
              <div className="print:hidden space-y-5">
              <AdminPageHeader
                title="Learner reports"
                subtitle="Generate strengths and weaknesses for one learner or a class"
                icon={ClipboardList}
                iconClassName="from-violet-500 to-indigo-600"
                showWorkflow={false}
              />

              <section className="bg-white/80 border-2 border-slate-200 rounded-[20px] p-4 sm:p-5 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <label className="sm:col-span-2 relative block">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name or email"
                      className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm"
                  >
                    <option value="">All grades</option>
                    {grades.map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <p className="text-sm text-slate-600">
                    {selectedIds.size} selected
                    {filteredLearners.length !== users.length
                      ? ` · ${filteredLearners.length} shown`
                      : ` of ${users.length} learners`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={toggleAllFiltered}
                      disabled={filteredLearners.length === 0}
                      className="px-3 py-1.5 rounded-full border-2 border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                    >
                      {allFilteredSelected ? 'Clear shown' : 'Select shown'}
                    </button>
                    <button
                      type="button"
                      onClick={() => generate()}
                      disabled={generating || selectedIds.size === 0}
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                      Generate report
                    </button>
                  </div>
                </div>

                {loadingUsers && <p className="text-sm text-slate-600">Loading learners…</p>}
                {usersError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{usersError}</div>
                )}
                {generateError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 mb-3">
                    {generateError}
                  </div>
                )}

                {!loadingUsers && !usersError && filteredLearners.length === 0 && (
                  <p className="text-sm text-slate-600">No learners match those filters.</p>
                )}

                {!loadingUsers && filteredLearners.length > 0 && (
                  <ul className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                    {filteredLearners.map((user) => (
                      <li key={user.id}>
                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 cursor-pointer hover:border-indigo-200">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleLearner(user.id)}
                            className="rounded border-slate-300"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[#0F172A] truncate">{user.name}</span>
                            <span className="block text-xs text-slate-500 truncate">
                              {user.email}
                              {user.grade ? ` · Grade ${user.grade}` : ''}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              </div>

              {reports.length > 0 && (
                <div id="admin-learner-reports" className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {generatedAt && (
                      <p className="text-xs text-slate-500 print:text-slate-700">
                        Generated {new Date(generatedAt).toLocaleString()} · {reports.length} learner
                        {reports.length === 1 ? '' : 's'}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 print:hidden ml-auto"
                    >
                      <Download className="w-4 h-4" />
                      Save PDF
                    </button>
                  </div>

                  {insights && (
                    <section className="bg-white/90 border-2 border-indigo-100 rounded-[20px] p-4 sm:p-5">
                      <h2 className="text-lg font-bold text-[#0F172A] mb-3">Class snapshot</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-rose-800 mb-2">Shared weaknesses</h3>
                          {insights.commonWeaknesses.length === 0 ? (
                            <p className="text-sm text-slate-600">No overlapping weak skills.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {insights.commonWeaknesses.map((item) => (
                                <li key={item.learningOutcomeKey} className="text-sm text-slate-700">
                                  <span className="font-semibold">{item.skillFocus}</span>
                                  <span className="text-slate-500">
                                    {' '}
                                    · {item.learnerCount} learner{item.learnerCount === 1 ? '' : 's'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-emerald-800 mb-2">Shared strengths</h3>
                          {insights.commonStrengths.length === 0 ? (
                            <p className="text-sm text-slate-600">No overlapping strong skills yet.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {insights.commonStrengths.map((item) => (
                                <li key={item.learningOutcomeKey} className="text-sm text-slate-700">
                                  <span className="font-semibold">{item.skillFocus}</span>
                                  <span className="text-slate-500">
                                    {' '}
                                    · {item.learnerCount} learner{item.learnerCount === 1 ? '' : 's'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      {insights.needsAttention.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <h3 className="text-sm font-bold text-amber-800 mb-2">Needs attention</h3>
                          <ul className="flex flex-wrap gap-2">
                            {insights.needsAttention.map((item) => (
                              <li
                                key={item.id}
                                className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-xs font-semibold text-amber-900"
                              >
                                {item.name} · {item.weaknessesCount} weak skill
                                {item.weaknessesCount === 1 ? '' : 's'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                  )}

                  {reports.map((report) => (
                    <LearnerReportCard key={report.learner.id} report={report} />
                  ))}
                </div>
              )}
            </div>
          </StaggeredEntry>
        </div>
      </div>
    </div>
  )
}
