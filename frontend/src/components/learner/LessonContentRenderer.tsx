import React from 'react'
import { MathText } from '@/components/ui/MathText'

type LessonContentRendererProps = {
  content: string
}

export const LessonContentRenderer: React.FC<LessonContentRendererProps> = ({ content }) => {
  // Normalize raw AI text into logical "lines" / sections for better layout
  const normalized = content
    .replace(/\s*(Mini Notes?:)/gi, '\n$1')
    .replace(/\s*(Worked Example\s*1?:)/gi, '\n$1')
    .replace(/\s*(Worked Example\s*2?:)/gi, '\n$1')
    .replace(/\s*(Worked Example\s*3?:)/gi, '\n$1')
    .replace(/\s*(Practice Prompts?:)/gi, '\n$1')
    .replace(/\n{2,}/g, '\n\n')

  const lines = normalized.split('\n')

  return (
    <div
      className="text-slate-900 leading-relaxed text-base sm:text-lg space-y-6 max-w-3xl"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {lines.map((rawLine, index) => {
        const line = rawLine.trim()

        if (!line) {
          return <br key={index} />
        }

        if (/^mini notes?/i.test(line)) {
          const text = line.replace(/^mini notes?:\s*/i, '')
          return (
            <div key={index} className="mt-4 mb-4">
              <h3
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3"
                style={{ fontFamily: 'Fredoka, sans-serif' }}
              >
                Mini Notes
              </h3>
              {text && (
                <p className="text-slate-800">
                  <MathText text={text} />
                </p>
              )}
            </div>
          )
        }

        if (/^worked example/i.test(line)) {
          const match = /^(worked example\s*\d*:?)(.*)$/i.exec(line)
          const title = match ? match[1].trim() : line
          const rest = match && match[2] ? match[2].trim().replace(/^[:\-]\s*/, '') : ''
          return (
            <div key={index} className="mt-5 mb-2">
              <h4
                className="text-lg sm:text-xl font-semibold text-slate-900 mb-2"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                <MathText text={title} />
              </h4>
              {rest && (
                <p className="text-slate-800 mt-1">
                  <MathText text={rest} />
                </p>
              )}
            </div>
          )
        }

        if (/^practice prompts?/i.test(line)) {
          const text = line.replace(/^practice prompts?:\s*/i, '')
          return (
            <div key={index} className="mt-6 mb-3">
              <h4
                className="text-lg sm:text-xl font-semibold text-slate-900 mb-2"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Practice Prompts
              </h4>
              {text && (
                <p className="text-slate-800">
                  <MathText text={text} />
                </p>
              )}
            </div>
          )
        }

        const stepMatch = /^step\s+(\d+):\s*(.*)$/i.exec(line)
        if (stepMatch) {
          const [, stepNumber, rest] = stepMatch
          return (
            <p key={index} className="mb-2 text-slate-800">
              <span className="font-semibold text-[#0F172A] mr-1">Step {stepNumber}:</span>
              <MathText text={rest} />
            </p>
          )
        }

        if (/^[-•]\s+/.test(line)) {
          const text = line.replace(/^[-•]\s+/, '')
          return (
            <div key={index} className="flex items-start gap-2 ml-4">
              <span className="text-slate-500 mt-1.5">•</span>
              <MathText text={text} />
            </div>
          )
        }

        const numberedMatch = /^(\d+)\.\s+(.*)$/.exec(line)
        if (numberedMatch) {
          const [, num, text] = numberedMatch
          return (
            <div key={index} className="flex items-start gap-2 ml-4">
              <span className="text-slate-600 font-semibold mt-1.5">{num}.</span>
              <MathText text={text} />
            </div>
          )
        }

        return (
          <p key={index} className="mb-2 text-slate-700">
            <MathText text={line} />
          </p>
        )
      })}
    </div>
  )
}
