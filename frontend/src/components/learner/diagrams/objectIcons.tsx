import type { ReactNode } from 'react'

export const OBJECT_KINDS = [
  'ball',
  'banana',
  'apple',
  'mango',
  'bead',
  'block',
  'counter',
  'spoon',
  'pencil',
  'crayon',
  'hen',
  'shell',
  'star',
] as const

export type ObjectKind = (typeof OBJECT_KINDS)[number]

const KEYWORDS: Record<ObjectKind, RegExp> = {
  ball: /\bballs?\b/i,
  banana: /\bbananas?\b/i,
  apple: /\bapples?\b/i,
  mango: /\bmangoes?\b/i,
  bead: /\bbeads?\b/i,
  block: /\bblocks?\b/i,
  counter: /\bcounters?\b/i,
  spoon: /\bspoons?\b/i,
  pencil: /\bpencils?\b/i,
  crayon: /\bcrayons?\b/i,
  hen: /\bhens?\b|\bchickens?\b/i,
  shell: /\bshells?\b/i,
  star: /\bstars?\b/i,
}

export const DEFAULT_OBJECT_KIND: ObjectKind = 'bead'

export const isObjectKind = (value?: string | null): value is ObjectKind =>
  OBJECT_KINDS.includes(value as ObjectKind)

export const inferObjectKind = (text = '', fallback: ObjectKind | null = null): ObjectKind | null => {
  const t = String(text || '')
  for (const kind of OBJECT_KINDS) {
    if (KEYWORDS[kind].test(t)) return kind
  }
  return fallback
}

export const resolveObjectKind = (value?: string | null, stem = ''): ObjectKind => {
  if (isObjectKind(value)) return value
  return inferObjectKind(stem, DEFAULT_OBJECT_KIND) || DEFAULT_OBJECT_KIND
}

type IconProps = { className?: string; title?: string }

const wrap = (title: string, className: string | undefined, inner: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    className={className || 'h-10 w-10'}
    role="img"
    aria-label={title}
  >
    <title>{title}</title>
    {inner}
  </svg>
)

export const ObjectIcon = ({
  kind,
  className,
  title,
}: IconProps & { kind?: string | null }) => {
  const k = isObjectKind(kind) ? kind : DEFAULT_OBJECT_KIND
  const label = title || k
  switch (k) {
    case 'ball':
      return wrap(
        label,
        className,
        <>
          <circle cx="12" cy="12" r="9" fill="#F97316" stroke="#9A3412" strokeWidth="1.5" />
          <ellipse cx="9" cy="9" rx="3" ry="2" fill="#FDBA74" opacity="0.8" />
        </>
      )
    case 'banana':
      return wrap(
        label,
        className,
        <>
          <path
            d="M5 7 C8 4 16 5 20 10 C16 16 8 18 5 14 C7 12 8 10 5 7Z"
            fill="#FACC15"
            stroke="#A16207"
            strokeWidth="1.4"
          />
          <path d="M18.5 9.5 C16 12 12 14 8 14" fill="none" stroke="#CA8A04" strokeWidth="0.8" />
        </>
      )
    case 'apple':
      return wrap(
        label,
        className,
        <>
          <circle cx="12" cy="14" r="7.5" fill="#DC2626" stroke="#7F1D1D" strokeWidth="1.4" />
          <path d="M12 7 C13 5 15 4.5 16 6" fill="none" stroke="#166534" strokeWidth="1.6" />
          <ellipse cx="14.5" cy="6.5" rx="2.2" ry="1.1" fill="#22C55E" />
        </>
      )
    case 'mango':
      return wrap(
        label,
        className,
        <>
          <ellipse cx="12" cy="13" rx="7" ry="8" fill="#F59E0B" stroke="#B45309" strokeWidth="1.4" />
          <path d="M12 5 C13 3.5 15 3 16 4.5" fill="none" stroke="#166534" strokeWidth="1.5" />
        </>
      )
    case 'block':
      return wrap(
        label,
        className,
        <>
          <rect x="5" y="7" width="14" height="12" rx="1.5" fill="#38BDF8" stroke="#0369A1" strokeWidth="1.5" />
          <path d="M5 10 H19" stroke="#0369A1" strokeWidth="1" />
        </>
      )
    case 'counter':
      return wrap(
        label,
        className,
        <>
          <ellipse cx="12" cy="13" rx="8" ry="7" fill="#A78BFA" stroke="#5B21B6" strokeWidth="1.5" />
          <ellipse cx="12" cy="11" rx="5" ry="2.2" fill="#DDD6FE" />
        </>
      )
    case 'spoon':
      return wrap(
        label,
        className,
        <>
          <ellipse cx="9" cy="8" rx="4.5" ry="5.5" fill="#CBD5E1" stroke="#475569" strokeWidth="1.3" />
          <rect x="8" y="13" width="2.4" height="8" rx="1" fill="#94A3B8" stroke="#475569" strokeWidth="0.8" />
        </>
      )
    case 'pencil':
      return wrap(
        label,
        className,
        <>
          <rect x="10" y="3" width="4" height="14" fill="#FDE047" stroke="#A16207" strokeWidth="1" />
          <polygon points="10,17 14,17 12,21" fill="#FDBA74" stroke="#9A3412" strokeWidth="0.8" />
          <rect x="10" y="3" width="4" height="2.5" fill="#EF4444" />
        </>
      )
    case 'crayon':
      return wrap(
        label,
        className,
        <>
          <rect x="9.5" y="4" width="5" height="13" rx="1" fill="#22C55E" stroke="#166534" strokeWidth="1" />
          <polygon points="9.5,17 14.5,17 12,21.5" fill="#86EFAC" stroke="#166534" strokeWidth="0.8" />
        </>
      )
    case 'hen':
      return wrap(
        label,
        className,
        <>
          <ellipse cx="12" cy="14" rx="7" ry="5.5" fill="#F8FAFC" stroke="#334155" strokeWidth="1.3" />
          <circle cx="17" cy="10" r="3.2" fill="#F8FAFC" stroke="#334155" strokeWidth="1.2" />
          <polygon points="19.5,9 23,10.5 19.5,12" fill="#F97316" />
          <path d="M15 6 L16 3 L17.5 6" fill="#DC2626" />
        </>
      )
    case 'shell':
      return wrap(
        label,
        className,
        <>
          <path
            d="M12 20 C6 16 5 10 8 6 C12 3 16 6 18 10 C20 14 17 18 12 20Z"
            fill="#FDE68A"
            stroke="#B45309"
            strokeWidth="1.3"
          />
          <path d="M12 18 C10 14 11 10 13 8" fill="none" stroke="#D97706" strokeWidth="1" />
        </>
      )
    case 'star':
      return wrap(
        label,
        className,
        <polygon
          points="12,3 14.4,8.8 20.8,9.2 16,13.5 17.6,19.8 12,16.6 6.4,19.8 8,13.5 3.2,9.2 9.6,8.8"
          fill="#FBBF24"
          stroke="#B45309"
          strokeWidth="1.2"
        />
      )
    case 'bead':
    default:
      return wrap(
        label,
        className,
        <>
          <circle cx="12" cy="12" r="9" fill="#14B8A6" stroke="#0F766E" strokeWidth="1.8" />
          <ellipse cx="9" cy="9" rx="3" ry="2" fill="#5EEAD4" opacity="0.85" />
        </>
      )
  }
}

type QuantityParams = {
  objectKind?: string
  count?: number
  columns?: number
  groups?: number[]
  showTotal?: boolean
}

export const ObjectQuantityStrip = ({
  params,
  compact = false,
}: {
  params?: QuantityParams | Record<string, unknown> | null
  compact?: boolean
}) => {
  const p = (params && typeof params === 'object' ? params : {}) as QuantityParams
  const kind = resolveObjectKind(p.objectKind)
  const groups = Array.isArray(p.groups) && p.groups.length
    ? p.groups.map((n) => Math.min(20, Math.max(0, Number(n) || 0)))
    : [Math.min(20, Math.max(1, Number(p.count) || 1))]
  const iconClass = compact ? 'h-7 w-7' : 'h-10 w-10'

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${compact ? 'p-1' : 'p-2'}`}>
      {groups.map((count, gi) => (
        <div key={gi} className="flex flex-wrap justify-center gap-1">
          {Array.from({ length: count }, (_, i) => (
            <span
              key={`${gi}-${i}`}
              className="ev-object-pop inline-flex"
              style={{ animationDelay: `${(gi * 6 + i) * 70}ms` }}
            >
              <ObjectIcon kind={kind} className={iconClass} title={kind} />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
