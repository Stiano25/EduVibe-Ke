import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { LearnerModality } from '@/types'

const OPTIONS: { id: LearnerModality; label: string; hint: string }[] = [
  { id: 'visual', label: 'Pictures & diagrams', hint: 'I understand best with graphics and labeled figures' },
  { id: 'text_steps', label: 'Step-by-step text', hint: 'I like clear written steps and worked examples' },
  { id: 'practice', label: 'Lots of practice', hint: 'I learn by doing short practice questions' },
  { id: 'mixed', label: 'A bit of everything', hint: 'Mix it up for me' },
]

/** One-time modality preference prompt for the hybrid learner model. */
export const ModalityPreferencePrompt = () => {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<LearnerModality>('mixed')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const profile = (await api.learner.getProfile()) as {
          modalityPromptSeen?: boolean
          preferredModality?: LearnerModality
        }
        if (!cancelled && !profile.modalityPromptSeen) {
          setSelected(profile.preferredModality || 'mixed')
          setOpen(true)
        }
      } catch {
        // Profile table may not exist yet — fail quiet
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const save = async (modality: LearnerModality) => {
    setSaving(true)
    try {
      await api.learner.updateProfile({
        preferredModality: modality,
        modalityPromptSeen: true,
      })
      setOpen(false)
    } catch (err) {
      console.error('Failed to save learning preference:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-[28px] border-2 border-slate-200 shadow-2xl p-6">
        <h2 className="text-xl font-bold text-[#0F172A] mb-1">
          How do you like to learn?
        </h2>
        <p className="text-sm text-text-secondary mb-4"  >
          Pick one. You can change this later — we also learn from how you do on quizzes.
        </p>
        <div className="space-y-2 mb-4">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelected(opt.id)}
              className={`w-full text-left px-4 py-3 rounded-[16px] border-2 transition-all ${
                selected === opt.id
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
               
            >
              <span className="block text-sm font-semibold text-[#0F172A]">{opt.label}</span>
              <span className="block text-xs text-text-secondary mt-0.5">{opt.hint}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => save(selected)}
          className="w-full py-3 rounded-full bg-gradient-to-r bg-primary-600 text-white font-semibold disabled:opacity-50"
           
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
