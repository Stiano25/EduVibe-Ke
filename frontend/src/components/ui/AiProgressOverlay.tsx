import { useEffect, useState } from 'react'
import { LazyLottie } from '@/components/ui/LazyLottie'

interface AiProgressOverlayProps {
  isOpen: boolean
  title: string
  subtitle?: string
  steps?: string[]
  /** Real 0–100 progress when the backend reports it */
  percent?: number | null
  /** Live status line (overrides rotating steps when set) */
  statusMessage?: string | null
}

/** Full-screen blocking progress UI for long AI operations (PDF parse, lesson gen). */
export const AiProgressOverlay = ({
  isOpen,
  title,
  subtitle,
  steps = [],
  percent = null,
  statusMessage = null,
}: AiProgressOverlayProps) => {
  const [stepIndex, setStepIndex] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [estimatedPercent, setEstimatedPercent] = useState(5)

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0)
      setElapsedSec(0)
      setEstimatedPercent(5)
      return
    }

    document.body.style.overflow = 'hidden'
    const stepTimer =
      steps.length > 0
        ? window.setInterval(() => {
            setStepIndex((i) => (i + 1) % steps.length)
          }, 3500)
        : undefined
    const clockTimer = window.setInterval(() => {
      setElapsedSec((s) => s + 1)
      // Soft estimate when no real percent (PDF parse, etc.)
      setEstimatedPercent((p) => Math.min(90, p + 1.2))
    }, 1000)

    return () => {
      document.body.style.overflow = 'unset'
      if (stepTimer) window.clearInterval(stepTimer)
      window.clearInterval(clockTimer)
    }
  }, [isOpen, steps.length])

  if (!isOpen) return null

  const hasRealPercent = typeof percent === 'number' && !Number.isNaN(percent)
  const displayPercent = hasRealPercent
    ? Math.max(0, Math.min(100, Math.round(percent)))
    : Math.round(estimatedPercent)

  const minutes = Math.floor(elapsedSec / 60)
  const seconds = elapsedSec % 60
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`
  const message =
    statusMessage ||
    (steps.length > 0 ? steps[stepIndex] : null) ||
    'Working…'

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
        {subtitle && <p className="text-sm text-text-secondary mb-3">{subtitle}</p>}

        <div className="mb-4 flex items-end justify-center gap-1">
          <span className="text-4xl font-black text-indigo-700 tabular-nums leading-none">
            {displayPercent}
          </span>
          <span className="text-lg font-bold text-indigo-500 mb-0.5">%</span>
        </div>

        <div className="mb-5 rounded-[18px] bg-indigo-50 border border-indigo-100 px-4 py-3 min-h-[3.25rem] flex items-center justify-center">
          <p className="text-sm font-semibold text-indigo-700 transition-opacity duration-300">
            {message}
          </p>
        </div>

        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden mb-4 border border-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 transition-[width] duration-500 ease-out"
            style={{ width: `${displayPercent}%` }}
          />
        </div>

        <p className="text-xs text-text-secondary">
          Elapsed {timeLabel}
          {hasRealPercent ? ' · Live progress from server' : ' · Estimated progress'}
          {' · '}
          Keep this tab open.
        </p>
      </div>
    </div>
  )
}
