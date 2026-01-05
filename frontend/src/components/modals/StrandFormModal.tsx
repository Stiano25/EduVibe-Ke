import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { MainSubject } from '@/data/curriculumData'
import { Save, X } from 'lucide-react'

interface StrandFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; color: string }) => void
  strand?: MainSubject | null
  isLoading?: boolean
}

const colorOptions = [
  { value: 'from-indigo-500 to-purple-600', label: 'Indigo-Purple' },
  { value: 'from-purple-500 to-pink-600', label: 'Purple-Pink' },
  { value: 'from-emerald-500 to-teal-600', label: 'Emerald-Teal' },
  { value: 'from-cyan-500 to-blue-600', label: 'Cyan-Blue' },
  { value: 'from-orange-500 to-red-600', label: 'Orange-Red' },
  { value: 'from-yellow-500 to-amber-600', label: 'Yellow-Amber' },
]

export const StrandFormModal = ({
  isOpen,
  onClose,
  onSave,
  strand,
  isLoading = false,
}: StrandFormModalProps) => {
  const [name, setName] = useState('')
  const [color, setColor] = useState('from-indigo-500 to-purple-600')

  useEffect(() => {
    if (strand) {
      setName(strand.name)
      setColor(strand.color)
    } else {
      setName('')
      setColor('from-indigo-500 to-purple-600')
    }
  }, [strand, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSave({ name: name.trim(), color })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={strand ? 'Edit Strand' : 'Add New Strand'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Input */}
        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Strand Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Applied Sciences"
            className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
            style={{ fontFamily: 'Manrope, sans-serif' }}
            required
          />
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Color Theme
          </label>
          <div className="grid grid-cols-3 gap-2">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setColor(option.value)}
                className={`p-3 rounded-[12px] border-2 transition-all ${
                  color === option.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-full h-8 rounded-lg bg-gradient-to-br ${option.value} mb-2`} />
                <p className="text-xs font-medium text-slate-700" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {option.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
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
            disabled={isLoading || !name.trim()}
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
                {strand ? 'Update' : 'Create'} Strand
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}





