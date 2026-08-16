import { useEffect, useState } from 'react'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import { api } from '@/lib/api'

type EdgeStatus = 'pending_review' | 'active' | 'rejected'

type OutcomeRef = {
  id: string
  grade?: string | null
  outcomeText?: string | null
  strandName?: string | null
  subjectName?: string | null
}

type Layer2Edge = {
  id: string
  status: EdgeStatus
  confidence: number
  reason?: string | null
  rejectReason?: string | null
  source?: string | null
  edgeType?: string | null
  outcome?: OutcomeRef | null
  prerequisite?: OutcomeRef | null
}

const statusChip = (status: EdgeStatus) => {
  if (status === 'active') return 'bg-emerald-100 text-emerald-800'
  if (status === 'rejected') return 'bg-red-100 text-red-800'
  return 'bg-amber-100 text-amber-800'
}

const outcomeLabel = (row?: OutcomeRef | null) => {
  if (!row) return 'Unknown outcome'
  const where = [row.grade ? `Grade ${row.grade}` : null, row.subjectName, row.strandName]
    .filter(Boolean)
    .join(' · ')
  return `${where ? `${where}: ` : ''}${row.outcomeText || row.id}`
}

export const PrerequisiteEdgeQueue = () => {
  const [status, setStatus] = useState<EdgeStatus | 'all'>('pending_review')
  const [edges, setEdges] = useState<Layer2Edge[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editReason, setEditReason] = useState('')
  const [editConfidence, setEditConfidence] = useState('0.7')
  const [error, setError] = useState<string | null>(null)

  const loadEdges = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = (await api.admin.listPrerequisiteEdges({
        status: status === 'all' ? 'all' : status,
        limit: 80,
      })) as Layer2Edge[]
      setEdges(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prerequisite edges')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEdges()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const startEdit = (edge: Layer2Edge) => {
    setEditingId(edge.id)
    setEditReason(edge.reason || '')
    setEditConfidence(String(edge.confidence ?? 0.7))
  }

  const saveEdit = async (edge: Layer2Edge) => {
    setBusyId(edge.id)
    setError(null)
    try {
      await api.admin.editPrerequisiteEdge(edge.id, {
        reason: editReason,
        confidence: Number(editConfidence),
      })
      setEditingId(null)
      await loadEdges()
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
      await api.admin.approvePrerequisiteEdge(id)
      await loadEdges()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (id: string) => {
    const reason = window.prompt('Reject reason (optional)', 'not a genuine prerequisite') || undefined
    setBusyId(id)
    setError(null)
    try {
      await api.admin.rejectPrerequisiteEdge(id, reason)
      await loadEdges()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="rounded-[16px] border-2 border-indigo-100 bg-white/80 p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Cross-strand prerequisites
        </h2>
        <p className="mt-1 text-sm text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Proposed when a learner gets stuck and Layer 1 has no cross-strand link. Approve before
          they can be used for remediation routing.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['pending_review', 'active', 'rejected', 'all'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${
              status === key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {key === 'pending_review' ? 'pending' : key}
          </button>
        ))}
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
      ) : edges.length === 0 ? (
        <p className="text-sm text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
          No Layer 2 edges in this filter. They appear after a fail-streak on an outcome with no
          cross-strand link yet.
        </p>
      ) : (
        <div className="space-y-3">
          {edges.map((edge) => {
            const isEditing = editingId === edge.id
            return (
              <div key={edge.id} className="rounded-[12px] border-2 border-slate-200 bg-white p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${statusChip(edge.status)}`}>
                    {edge.status}
                  </span>
                  <span className="text-slate-500">confidence {Number(edge.confidence).toFixed(2)}</span>
                </div>
                <p className="text-sm text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <strong>Stuck on:</strong> {outcomeLabel(edge.outcome)}
                </p>
                <p className="text-sm text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <strong>Needs:</strong> {outcomeLabel(edge.prerequisite)}
                </p>
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-[10px] border-2 border-slate-200 text-sm"
                      rows={2}
                    />
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={editConfidence}
                      onChange={(e) => setEditConfidence(e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-[10px] border-2 border-slate-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(edge)}
                      disabled={busyId === edge.id}
                      className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold"
                    >
                      {busyId === edge.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save edit'}
                    </button>
                  </div>
                ) : (
                  <p className="text-[12px] text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {edge.reason}
                  </p>
                )}
                {edge.rejectReason && (
                  <p className="text-[11px] text-red-700">Rejected: {edge.rejectReason}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {edge.status !== 'active' && edge.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => handleApprove(edge.id)}
                      disabled={busyId === edge.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold"
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                  )}
                  {edge.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => handleReject(edge.id)}
                      disabled={busyId === edge.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-semibold"
                    >
                      <X className="w-3 h-3" />
                      Reject
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (isEditing ? setEditingId(null) : startEdit(edge))}
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
