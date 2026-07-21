import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** When true, backdrop click and X are disabled (long-running ops). */
  preventClose?: boolean
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md', preventClose = false }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  const handleClose = () => {
    if (!preventClose) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-white/95 backdrop-blur-2xl rounded-[24px] border-2 border-slate-200 shadow-2xl`}
        style={{
          animation: 'fadeInScale 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-slate-200">
          <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {title}
          </h2>
          {!preventClose && (
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4 text-slate-700" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

