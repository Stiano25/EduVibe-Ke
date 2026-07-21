import { useEffect, useState } from 'react'
import { LazyLottie } from '@/components/ui/LazyLottie'

interface AiProgressOverlayProps {
  isOpen: boolean
  title: string
  subtitle?: string
  steps: string[]
}

/** Full-screen blocking progress UI for long AI operations (PDF parse, lesson gen). */
export const AiProgressOverlay = ({
  isOpen,
  title,
  subtitle,
  steps,
}: AiProgressOverlayProps) => {
  const [stepIndex, setStepIndex] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0)
      setElapsedSec(0)
      return
    }

    document.body.style.overflow = 'hidden'
    const stepTimer = window.setInterval(() => {
      setStepIndex((i) => (i + 1) % Math.max(steps.length, 1))
    }, 3500)
    const clockTimer = window.setInterval(() => {
      setElapsedSec((s) => s + 1)
    }, 1000)

    return () => {
      document.body.style.overflow = 'unset'
      window.clearInterval(stepTimer)
      window.clearInterval(clockTimer)
    }
  }, [isOpen, steps.length])

  if (!isOpen) return null

  const minutes = Math.floor(elapsedSec / 60)
  const seconds = elapsedSec % 60
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-md" />

      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[28px] border-2 border-slate-200 shadow-2xl p-6 sm:p-8 text-center">
        <div className="w-36 h-36 sm:w-44 sm:h-44 mx-auto mb-2">
          <LazyLottie animationKey="loading" style={{ width: '100%', height: '100%' }} />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1">{title}</h2>
        {subtitle && (
          <p className="text-sm text-text-secondary mb-4">{subtitle}</p>
        )}

        <div className="mb-5 rounded-[18px] bg-indigo-50 border border-indigo-100 px-4 py-3 min-h-[3.25rem] flex items-center justify-center">
          <p className="text-sm font-semibold text-indigo-700 transition-opacity duration-300">
            {steps[stepIndex] || 'Working...'}
          </p>
        </div>

        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-4">
          <div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"
            style={{ animation: 'aiProgressSlide 1.4s ease-in-out infinite' }}
          />
        </div>

        <p className="text-xs text-text-secondary">
          Elapsed {timeLabel} · This can take 1–3 minutes. Please keep this tab open.
        </p>
      </div>

      <style>{`
        @keyframes aiProgressSlide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
    </div>
  )
}
