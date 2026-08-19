import type { Grade } from '@/types'

export type QuestionBankStatus = 'pending' | 'approved' | 'rejected' | 'all'

export const parseQuestionBankStatus = (raw: string | null): QuestionBankStatus => {
  if (raw === 'approved' || raw === 'rejected' || raw === 'all' || raw === 'pending') return raw
  return 'pending'
}

export const questionBankReviewHref = (opts: {
  grade?: string | null
  subjectId?: string | null
  strandId?: string | null
  subStrandId?: string | null
  status?: string
}) => {
  const params = new URLSearchParams()
  params.set('status', parseQuestionBankStatus(opts.status || 'pending'))
  if (opts.grade) params.set('grade', String(opts.grade))
  if (opts.subjectId) params.set('subjectId', opts.subjectId)
  if (opts.strandId) params.set('strandId', opts.strandId)
  if (opts.subStrandId) params.set('subStrandId', opts.subStrandId)
  return `/admin/knowledge?${params.toString()}`
}

export const readQuestionBankFiltersFromUrl = (params: URLSearchParams) => ({
  status: parseQuestionBankStatus(params.get('status')),
  grade: (params.get('grade') as Grade) || '',
  subjectId: params.get('subjectId') || '',
  strandId: params.get('strandId') || '',
  subStrandId: params.get('subStrandId') || '',
})
