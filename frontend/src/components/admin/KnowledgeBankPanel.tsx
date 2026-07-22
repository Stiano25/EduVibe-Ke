import { useState, useEffect } from 'react'
import { Subject, Grade } from '@/types'
import { api } from '@/lib/api'
import { Upload, Trash2, Loader2, Library } from 'lucide-react'

const grades: Grade[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

type KnowledgeDoc = {
  id: string
  title: string
  source_type?: string
  grade?: string | null
  subject_name?: string | null
  status: string
  error_message?: string | null
  chunkCount?: number
  created_at?: string
}

type Props = {
  subjects: Subject[]
  /** Compact card for embedding; full page uses default. */
  compact?: boolean
}

export const KnowledgeBankPanel = ({ subjects, compact = false }: Props) => {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [grade, setGrade] = useState<Grade | ''>('')
  const [subjectId, setSubjectId] = useState('')
  const [sourceType, setSourceType] = useState<'exam' | 'past_paper' | 'notes'>('exam')
  const [file, setFile] = useState<File | null>(null)

  const loadDocs = async () => {
    setLoading(true)
    try {
      const list = (await api.admin.listKnowledge()) as KnowledgeDoc[]
      setDocs(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Failed to load knowledge bank:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocs()
  }, [])

  const handleUpload = async () => {
    if (!file) {
      alert('Choose a PDF exam or past paper first')
      return
    }
    setUploading(true)
    try {
      const subject = subjects.find((s) => s.id === subjectId)
      await api.admin.uploadKnowledge(file, {
        title: title || file.name,
        grade: grade || subject?.grade || undefined,
        subjectId: subjectId || undefined,
        subjectName: subject?.name,
        sourceType,
      })
      setFile(null)
      setTitle('')
      await loadDocs()
      alert('Document ingested. New lesson generation will use it for quiz style grounding.')
    } catch (err) {
      console.error(err)
      await loadDocs()
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this document and its chunks from the knowledge bank?')) return
    try {
      await api.admin.deleteKnowledge(id)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  return (
    <div
      className={`bg-white/80 backdrop-blur-md rounded-[20px] border-2 border-slate-200 ${
        compact ? 'p-4' : 'p-4 sm:p-6'
      } space-y-4`}
    >
      {!compact && (
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shrink-0">
            <Library className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2
              className="text-base sm:text-lg font-bold text-[#0F172A]"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Upload past papers
            </h2>
            <p className="text-xs text-text-secondary" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Tag by grade and subject so lesson generation can match real exam difficulty. We
              paraphrase — we never copy questions verbatim.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-3 py-2 rounded-[16px] bg-white border-2 border-slate-200 text-sm outline-none focus:border-teal-400"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        />
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value as Grade | '')}
          className="px-3 py-2 rounded-[16px] bg-white border-2 border-slate-200 text-sm outline-none focus:border-teal-400"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <option value="">Grade (optional)</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
            </option>
          ))}
        </select>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="px-3 py-2 rounded-[16px] bg-white border-2 border-slate-200 text-sm outline-none focus:border-teal-400"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <option value="">Link subject (optional)</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} (G{s.grade})
            </option>
          ))}
        </select>
        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as 'exam' | 'past_paper' | 'notes')}
          className="px-3 py-2 rounded-[16px] bg-white border-2 border-slate-200 text-sm outline-none focus:border-teal-400"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <option value="exam">Exam</option>
          <option value="past_paper">Past paper</option>
          <option value="notes">Notes</option>
        </select>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-teal-100 file:text-teal-800"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !file}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Ingesting…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload &amp; embed
            </>
          )}
        </button>
      </div>

      <div>
        <h3
          className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          In bank ({docs.length})
        </h3>
        {loading ? (
          <p className="text-sm text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Loading…
          </p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
            No documents yet. Upload a PDF to improve quiz style and difficulty.
          </p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-[14px] bg-slate-50 border border-slate-200"
              >
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold text-[#0F172A] truncate"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                  >
                    {d.title}
                  </p>
                  <p className="text-[11px] text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {d.source_type || 'exam'}
                    {d.grade ? ` · G${d.grade}` : ''}
                    {d.subject_name ? ` · ${d.subject_name}` : ''}
                    {' · '}
                    <span
                      className={
                        d.status === 'ready'
                          ? 'text-teal-700 font-semibold'
                          : d.status === 'failed'
                            ? 'text-red-600 font-semibold'
                            : 'text-amber-600 font-semibold'
                      }
                    >
                      {d.status}
                    </span>
                    {d.error_message ? ` — ${d.error_message}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center shrink-0"
                  aria-label="Delete knowledge document"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
