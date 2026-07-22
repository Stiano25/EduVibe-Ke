import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** When true, backdrop click and X are disabled (long-running ops). */
  preventClose?: boolean
  /** Optional footer pinned below scrollable body */
  footer?: React.ReactNode
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  preventClose = false,
  footer,
}: ModalProps) => {
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
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  }

  const handleClose = () => {
    if (!preventClose) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={handleClose}
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className={`relative w-full ${sizeClasses[size]} max-h-[min(92vh,900px)] flex flex-col bg-white/95 backdrop-blur-2xl rounded-[24px] border-2 border-slate-200 shadow-2xl overflow-hidden`}
        style={{ animation: 'fadeInScale 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-slate-200 shrink-0">
          <h2
            className="text-lg sm:text-xl font-bold text-[#0F172A] truncate"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {title}
          </h2>
          {!preventClose && (
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-slate-700" />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>

        {footer && (
          <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t-2 border-slate-200 bg-white/90">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
