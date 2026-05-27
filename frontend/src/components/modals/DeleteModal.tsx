import { Modal } from './Modal'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  itemName?: string
  isLoading?: boolean
}

export const DeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  isLoading = false,
}: DeleteModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-[16px] border-2 border-red-200">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              This action cannot be undone
            </p>
            <p className="text-xs text-red-700 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {description}
            </p>
          </div>
        </div>

        {itemName && (
          <div className="p-3 bg-slate-50 rounded-[12px] border border-slate-200">
            <p className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {itemName}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-full bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all text-sm font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 inline mr-2" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}







