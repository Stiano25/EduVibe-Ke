import React from 'react'

type LessonContentRendererProps = {
  content: string
}

type FractionProps = {
  numerator: string
  denominator: string
}

// Simple inline fraction renderer, purely visual (no MathJax/LaTeX)
const Fraction: React.FC<FractionProps> = ({ numerator, denominator }) => {
  return (
    <span className="inline-flex flex-col items-center justify-center align-[0.1em] mx-0.5">
      <span className="leading-none text-sm sm:text-base">{numerator}</span>
      <span className="border-t border-current w-full leading-none text-sm sm:text-base">
        {denominator}
      </span>
    </span>
  )
}

// Replace plain "a/b" patterns with inline <Fraction /> components
const renderInlineFractions = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = []
  const fractionRegex = /(\d+)\s*\/\s*(\d+)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = fractionRegex.exec(text)) !== null) {
    const [fullMatch, numerator, denominator] = match
    const start = match.index

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start))
    }

    parts.push(
      <Fraction
        key={`${start}-${fullMatch}`}
        numerator={numerator}
        denominator={denominator}
      />
    )

    lastIndex = start + fullMatch.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

export const LessonContentRenderer: React.FC<LessonContentRendererProps> = ({ content }) => {
  // Normalize raw AI text into logical "lines" / sections for better layout
  const normalized = content
    // Ensure each major section starts on a new line, even if AI wrote them inline
    .replace(/\s*(Mini Notes?:)/gi, '\n$1')
    .replace(/\s*(Worked Example\s*1?:)/gi, '\n$1')
    .replace(/\s*(Worked Example\s*2?:)/gi, '\n$1')
    .replace(/\s*(Worked Example\s*3?:)/gi, '\n$1')
    .replace(/\s*(Practice Prompts?:)/gi, '\n$1')
    // Collapse multiple newlines
    .replace(/\n{2,}/g, '\n\n')

  const lines = normalized.split('\n')

  return (
    <div className="text-slate-900 leading-relaxed text-base sm:text-lg space-y-6 max-w-3xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
      {lines.map((rawLine, index) => {
        const line = rawLine.trim()

        if (!line) {
          return <br key={index} />
        }

        // Mini-notes / key idea section
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
                  {renderInlineFractions(text)}
                </p>
              )}
            </div>
          )
        }

        // Worked example headers (Example 1, Example 2 ...)
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
                {renderInlineFractions(title)}
              </h4>
              {rest && (
                <p className="text-slate-800 mt-1">
                  {renderInlineFractions(rest)}
                </p>
              )}
            </div>
          )
        }

        // Practice prompts section
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
                  {renderInlineFractions(text)}
                </p>
              )}
            </div>
          )
        }

        // Steps: "Step 1: Do this"
        const stepMatch = /^step\s+(\d+):\s*(.*)$/i.exec(line)
        if (stepMatch) {
          const [, stepNumber, rest] = stepMatch
          return (
            <p key={index} className="mb-2 text-slate-800">
              <span className="font-semibold text-[#0F172A] mr-1">
                Step {stepNumber}:
              </span>
              <span>{renderInlineFractions(rest)}</span>
            </p>
          )
        }

        // Simple dash bullets (still plain text on backend, styled here)
        if (/^[-•]\s+/.test(line)) {
          const text = line.replace(/^[-•]\s+/, '')
          return (
            <div key={index} className="flex items-start gap-2 ml-4">
              <span className="text-slate-500 mt-1.5">•</span>
              <span>{renderInlineFractions(text)}</span>
            </div>
          )
        }

        // Numbered lines like "1. Something"
        const numberedMatch = /^(\d+)\.\s+(.*)$/.exec(line)
        if (numberedMatch) {
          const [, num, text] = numberedMatch
          return (
            <div key={index} className="flex items-start gap-2 ml-4">
              <span className="text-slate-600 font-semibold mt-1.5">{num}.</span>
              <span>{renderInlineFractions(text)}</span>
            </div>
          )
        }

        // Default paragraph
        return (
          <p key={index} className="mb-2 text-slate-700">
            {renderInlineFractions(line)}
          </p>
        )
      })}
    </div>
  )
}

