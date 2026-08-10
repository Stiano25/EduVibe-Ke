import { useMemo, type ReactNode } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

type MathTextProps = {
  text: string
  className?: string
  as?: 'span' | 'p' | 'div'
}

/** Convert light ASCII math into KaTeX when authors omit $…$. */
const preprocessAsciiMath = (raw: string): string => {
  let s = String(raw || '')
  // Already has math delimiters — leave alone
  if (/\$[^$]+\$|\\\(|\\\[/.test(s)) return s

  // x^2, a^{n+1}, (x+1)^2 → wrap nearby expression in $…$
  s = s.replace(
    /([A-Za-z0-9)\]])\^(\{[^}]+\}|[A-Za-z0-9]+)/g,
    (_m, base, exp) => `$${base}^{${String(exp).replace(/^\{|\}$/g, '')}}$`
  )
  // a/b fractions when clearly numeric or simple vars (avoid URLs)
  s = s.replace(
    /(^|[\s(=])(\d+)\s*\/\s*(\d+)(?=[\s).,;?]|$)/g,
    (_m, pre, a, b) => `${pre}$\\frac{${a}}{${b}}$`
  )
  // Division word / ÷ symbol already fine; normalize "div" mid expression
  s = s.replace(/\s+div\s+/gi, ' $\\div$ ')
  s = s.replace(/\s+×\s+/g, ' $\\times$ ')
  return s
}

const renderSegment = (segment: string, display: boolean, key: string) => {
  try {
    const html = katex.renderToString(segment, {
      throwOnError: false,
      displayMode: display,
      strict: 'ignore',
    })
    return (
      <span
        key={key}
        className={display ? 'block my-1 overflow-x-auto' : 'inline'}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  } catch {
    return (
      <span key={key} className="font-mono text-[0.95em]">
        {segment}
      </span>
    )
  }
}

/** One-pass tokens: KaTeX $…$ / $$…$$ plus {{term:…}} / {{example:…}}. */
const INLINE_TOKEN_RE =
  /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\{\{term:([^}]+)\}\}|\{\{example:([^}]+)\}\})/g

/**
 * Renders text with inline KaTeX ($...$ / $$...$$) and lesson emphasis
 * ({{term:…}} bold vocabulary, {{example:…}} highlighted examples).
 */
export const MathText = ({ text, className, as: Tag = 'span' }: MathTextProps) => {
  const nodes = useMemo(() => {
    const src = preprocessAsciiMath(text)
    const parts: ReactNode[] = []
    let last = 0
    let m: RegExpExecArray | null
    let i = 0
    INLINE_TOKEN_RE.lastIndex = 0
    while ((m = INLINE_TOKEN_RE.exec(src)) !== null) {
      if (m.index > last) {
        parts.push(<span key={`t-${i++}`}>{src.slice(last, m.index)}</span>)
      }
      const token = m[1]
      if (token.startsWith('$$')) {
        parts.push(renderSegment(token.slice(2, -2).trim(), true, `m-${i++}`))
      } else if (token.startsWith('$')) {
        parts.push(renderSegment(token.slice(1, -1).trim(), false, `m-${i++}`))
      } else if (token.startsWith('{{term:')) {
        parts.push(
          <strong
            key={`term-${i++}`}
            className="lesson-term font-semibold text-primary-700"
          >
            {m[2]}
          </strong>
        )
      } else if (token.startsWith('{{example:')) {
        parts.push(
          <mark
            key={`ex-${i++}`}
            className="lesson-example rounded px-0.5 bg-secondary-50 text-secondary-700"
          >
            {m[3]}
          </mark>
        )
      }
      last = m.index + token.length
    }
    if (last < src.length) {
      parts.push(<span key={`t-${i++}`}>{src.slice(last)}</span>)
    }
    return parts.length > 0 ? parts : [<span key="empty">{text}</span>]
  }, [text])

  return <Tag className={className}>{nodes}</Tag>
}
