export const LIVE_DIAGRAM_TYPES = [
  'counting_circles',
  'labeled_boxes',
  'number_line',
  'fraction_bars',
] as const

export type LiveDiagramType = (typeof LIVE_DIAGRAM_TYPES)[number]

export const isLiveDiagramType = (value?: string | null): value is LiveDiagramType =>
  LIVE_DIAGRAM_TYPES.includes(value as LiveDiagramType)

const formatLabel = (raw: unknown) => {
  let s = String(raw ?? '').trim()
  if (!s) return ''
  s = s.replace(/^\$+|\$+$/g, '')
  s = s.replace(/\\text\{([^}]*)\}/g, '$1')
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
  return s
}

type DiagramParams = Record<string, unknown>

const NumberLine = ({ params }: { params: DiagramParams }) => {
  const min = Number.isFinite(Number(params.min)) ? Number(params.min) : 0
  const max = Number.isFinite(Number(params.max)) ? Number(params.max) : 10
  const step = Number(params.step) > 0 ? Number(params.step) : 1
  const highlight = params.highlight != null ? Number(params.highlight) : null
  const label = formatLabel(params.label)
  const pad = 48
  const y = 140
  const usable = 640 - pad * 2
  const range = Math.max(max - min, 1)
  const xAt = (v: number) => pad + ((v - min) / range) * usable
  const ticks: number[] = []
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(v)

  return (
    <svg viewBox="0 0 640 280" className="w-full h-auto" role="img">
      <rect width="100%" height="100%" fill="#F8FAFC" />
      {label ? (
        <text x="320" y="36" textAnchor="middle" fontFamily="Poppins, Arial, sans-serif" fontSize="18" fontWeight="600" fill="#0F172A">
          {label}
        </text>
      ) : null}
      <line x1={pad} y1={y} x2={640 - pad} y2={y} stroke="#334155" strokeWidth="3" />
      {ticks.map((v) => {
        const x = xAt(v)
        const isHi = highlight != null && Math.abs(v - highlight) < 1e-9
        return (
          <g key={v}>
            <line x1={x} y1={y - 12} x2={x} y2={y + 12} stroke={isHi ? '#0F766E' : '#334155'} strokeWidth={isHi ? 3 : 2} />
            <text x={x} y={y + 36} textAnchor="middle" fontFamily="Manrope, Arial, sans-serif" fontSize="14" fill="#0F172A">
              {formatLabel(String(v))}
            </text>
            {isHi ? <circle cx={x} cy={y} r="8" fill="#14B8A6" /> : null}
          </g>
        )
      })}
    </svg>
  )
}

const FractionBars = ({ params }: { params: DiagramParams }) => {
  const parts = Math.min(Math.max(Number(params.parts) || 4, 2), 12)
  const shaded = Math.min(Math.max(Number(params.shaded) || 1, 0), parts)
  const label = formatLabel(params.label || `${shaded}/${parts}`)
  const x0 = 48
  const y0 = 100
  const w = 544
  const h = 64
  const cellW = w / parts

  return (
    <svg viewBox="0 0 640 280" className="w-full h-auto" role="img">
      <rect width="100%" height="100%" fill="#F8FAFC" />
      <text x="320" y="48" textAnchor="middle" fontFamily="Poppins, Arial, sans-serif" fontSize="18" fontWeight="600" fill="#0F172A">
        {label}
      </text>
      {Array.from({ length: parts }, (_, i) => (
        <rect
          key={i}
          x={x0 + i * cellW}
          y={y0}
          width={cellW - 2}
          height={h}
          fill={i < shaded ? '#14B8A6' : '#E2E8F0'}
          stroke="#334155"
          strokeWidth="2"
          rx="4"
        />
      ))}
      <text x="320" y="210" textAnchor="middle" fontFamily="Manrope, Arial, sans-serif" fontSize="14" fill="#475569">
        {`${shaded} of ${parts} equal parts shaded`}
      </text>
    </svg>
  )
}

const coerceItems = (params: DiagramParams) => {
  let items: Array<{ label: string; text: string }> = Array.isArray(params.items)
    ? (params.items as Array<{ label?: string; text?: string }>).map((it) => ({
        label: String(it?.label ?? ''),
        text: String(it?.text ?? ''),
      }))
    : []
  if (items.length === 0 && Array.isArray(params.boxes)) {
    const labels = Array.isArray(params.labels) ? (params.labels as unknown[]) : []
    items = (params.boxes as unknown[]).map((b, i) =>
      typeof b === 'string'
        ? { label: b, text: String(labels[i] ?? '') }
        : {
            label: String((b as { label?: string })?.label ?? ''),
            text: String((b as { text?: string })?.text ?? ''),
          }
    )
  }
  if (items.length === 0 && Array.isArray(params.labels)) {
    items = (params.labels as unknown[]).map((l) => ({ label: String(l), text: '' }))
  }
  if (items.length === 0) {
    items = [
      { label: 'Concept', text: 'A' },
      { label: 'Example', text: 'B' },
    ]
  }
  return items.slice(0, 6)
}

const LabeledBoxes = ({ params }: { params: DiagramParams }) => {
  const items = coerceItems(params)
  const cols = items.length <= 3 ? items.length : Math.ceil(items.length / 2)
  const boxW = Math.min(180, (560 - (cols - 1) * 16) / cols)
  const boxH = 88
  const title = formatLabel(params.title || params.label || 'Key ideas')
  const rows = Math.ceil(items.length / cols)
  const svgH = Math.max(280, 70 + rows * (boxH + 20) + 24)

  return (
    <svg viewBox={`0 0 640 ${svgH}`} className="w-full h-auto" role="img">
      <rect width="100%" height="100%" fill="#F8FAFC" />
      <text x="320" y="40" textAnchor="middle" fontFamily="Poppins, Arial, sans-serif" fontSize="18" fontWeight="600" fill="#0F172A">
        {title}
      </text>
      {items.map((it, i) => {
        const row = Math.floor(i / cols)
        const col = i % cols
        const rowCount = Math.min(cols, items.length - row * cols)
        const rowW = rowCount * boxW + (rowCount - 1) * 16
        const x0 = (640 - rowW) / 2
        const x = x0 + col * (boxW + 16)
        const y = 70 + row * (boxH + 20)
        return (
          <g key={i}>
            <rect x={x} y={y} width={boxW} height={boxH} fill="#ECFDF5" stroke="#0F766E" strokeWidth="2" rx="10" />
            <text x={x + boxW / 2} y={y + 32} textAnchor="middle" fontFamily="Poppins, Arial, sans-serif" fontSize="14" fontWeight="600" fill="#0F172A">
              {formatLabel(it.label)}
            </text>
            <text x={x + boxW / 2} y={y + 58} textAnchor="middle" fontFamily="Manrope, Arial, sans-serif" fontSize="12" fill="#334155">
              {formatLabel(it.text)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const CountingCircles = ({ params }: { params: DiagramParams }) => {
  const count = Math.min(Math.max(Number(params.count) || 5, 1), 40)
  const columns = Math.min(Math.max(Number(params.columns) || 5, 1), 10)
  const title = formatLabel(params.title || params.label || `Count: ${count}`)
  const highlight = params.highlight != null ? Number(params.highlight) : null
  const color = String(params.color || '#14B8A6')
  const r = 16
  const gap = 12
  const startY = 80

  return (
    <svg viewBox="0 0 640 280" className="w-full h-auto" role="img">
      <rect width="100%" height="100%" fill="#F8FAFC" />
      <text x="320" y="40" textAnchor="middle" fontFamily="Poppins, Arial, sans-serif" fontSize="18" fontWeight="600" fill="#0F172A">
        {title}
      </text>
      {Array.from({ length: count }, (_, i) => {
        const col = i % columns
        const row = Math.floor(i / columns)
        const rowWidth = Math.min(columns, count - row * columns) * (r * 2 + gap) - gap
        const startX = 320 - rowWidth / 2 + r
        const cx = startX + col * (r * 2 + gap)
        const cy = startY + row * (r * 2 + gap)
        const isHi = highlight != null && i + 1 === highlight
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={isHi ? '#F59E0B' : color} stroke="#0F766E" strokeWidth="2" />
            <text x={cx} y={cy + 5} textAnchor="middle" fontFamily="Manrope, Arial, sans-serif" fontSize="12" fontWeight="700" fill="#fff">
              {i + 1}
            </text>
          </g>
        )
      })}
      <text x="320" y="260" textAnchor="middle" fontFamily="Manrope, Arial, sans-serif" fontSize="16" fill="#334155">
        {`Total = ${count}`}
      </text>
    </svg>
  )
}

type LiveDiagramProps = {
  diagramType?: string | null
  params?: DiagramParams | null
  className?: string
}

export const LiveDiagram = ({ diagramType, params, className = '' }: LiveDiagramProps) => {
  if (!isLiveDiagramType(diagramType)) return null
  const p = params && typeof params === 'object' ? params : {}
  return (
    <div className={`rounded-[12px] border border-violet-100 overflow-hidden bg-slate-50 ${className}`}>
      {diagramType === 'number_line' ? <NumberLine params={p} /> : null}
      {diagramType === 'fraction_bars' ? <FractionBars params={p} /> : null}
      {diagramType === 'labeled_boxes' ? <LabeledBoxes params={p} /> : null}
      {diagramType === 'counting_circles' ? <CountingCircles params={p} /> : null}
    </div>
  )
}
