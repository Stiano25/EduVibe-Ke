import { columnWorking, placeValueRows, resolveColumnOperation, type ColumnOperation, type ColumnReveal } from '@/lib/additionLayout'

type ColumnOperationProps = {
  a: number
  b: number
  operation?: ColumnOperation
  sumText?: string
  showSumSlot?: boolean
  scaffoldCarry?: boolean
  /** Fill the tens carry box (worked example only — live stays empty). */
  fillCarry?: boolean
  /** How far a worked example has revealed. Live answering uses 'sum'. */
  reveal?: ColumnReveal
  animate?: boolean
  highlightOnes?: boolean
  className?: string
}

const DigitCell = ({
  ch,
  tone = 'ink',
  animate = false,
  delayMs = 0,
  slot = false,
  active = false,
}: {
  ch: string
  tone?: 'ink' | 'sum' | 'muted'
  animate?: boolean
  delayMs?: number
  slot?: boolean
  active?: boolean
}) => {
  const empty = ch === ' '
  const color =
    tone === 'sum' ? 'text-ev-blue-edge' : tone === 'muted' ? 'text-ev-muted' : 'text-ev-ink'
  const box = slot
    ? `rounded-md border-2 ${
        active
          ? 'border-ev-blue bg-white ring-4 ring-ev-blue/30'
          : empty
            ? 'border-dashed border-ev-line bg-white/70'
            : 'border-ev-blue/40 bg-white'
      }`
    : ''
  return (
    <span
      className={`inline-flex h-10 w-8 items-center justify-center text-3xl font-black tabular-nums ${color} ${box} ${
        animate && !empty ? 'ev-digit-in' : ''
      }`}
      style={{ animationDelay: animate && !empty ? `${delayMs}ms` : undefined }}
    >
      {empty ? '' : ch}
    </span>
  )
}

const CarryBox = ({
  digit,
  filled,
  pop,
}: {
  digit: number
  filled: boolean
  pop: boolean
}) => (
  <span
    className={`inline-flex h-8 w-8 items-center justify-center rounded-md border-2 text-lg font-black tabular-nums ${
      filled
        ? 'border-amber-400 bg-ev-pink-soft text-amber-800'
        : 'border-dashed border-amber-300 bg-ev-pink-soft/40 text-amber-300'
    } ${pop && filled ? 'ev-carry-pop' : ''}`}
   
    aria-label={filled ? `carry ${digit}` : 'carry box'}
  >
    {filled && digit > 0 ? digit : ''}
  </span>
)

const revealRank: Record<ColumnReveal, number> = {
  addends: 0,
  ones: 1,
  carry: 2,
  sum: 3,
}

/** Stacked operands, plus or minus, line, optional tens carry box, answer row. */
export const ColumnOperation = ({
  a,
  b,
  operation = 'add',
  sumText = '',
  showSumSlot = true,
  scaffoldCarry = true,
  fillCarry = false,
  reveal = 'sum',
  animate = true,
  highlightOnes = false,
  className = '',
}: ColumnOperationProps) => {
  const op = resolveColumnOperation(operation)
  const subtract = op === 'subtract'
  const work = columnWorking(a, b)
  const minCols = Math.max(scaffoldCarry && !subtract ? 2 : 1, work.cols)
  const typed = String(sumText || '').replace(/\D/g, '')
  const rows = placeValueRows(a, b, typed, minCols)
  const rank = revealRank[reveal] ?? 3
  const showCarryDigit = scaffoldCarry && !subtract && fillCarry && work.onesCarry > 0
  const onesIndex = rows.cols - 1
  const partialSum =
    rank >= revealRank.sum
      ? typed
      : rank >= revealRank.ones
        ? String(work.written[onesIndex] ?? '')
        : ''
  const sumRows = placeValueRows(a, b, partialSum, minCols)
  const nextCol =
    rank >= revealRank.sum && typed.length < rows.cols ? rows.cols - 1 - typed.length : -1
  const sign = subtract ? '−' : '+'
  const spoken = subtract ? 'minus' : 'plus'

  return (
    <div
      className={`inline-flex flex-col items-end gap-1 px-4 py-3 ${className}`}
      role="img"
      aria-label={`${a} ${spoken} ${b}`}
    >
      {scaffoldCarry && !subtract ? (
        <div className="flex items-center gap-1">
          <span className="inline-flex h-8 w-8" />
          {Array.from({ length: rows.cols }, (_, i) =>
            i === onesIndex ? (
              <span key={`c-${i}`} className="inline-flex h-8 w-8" />
            ) : (
              <CarryBox
                key={`c-${i}`}
                digit={work.carryInto[i] || 0}
                filled={showCarryDigit && (work.carryInto[i] || 0) > 0}
                pop={showCarryDigit && (work.carryInto[i] || 0) > 0 && animate}
              />
            )
          )}
        </div>
      ) : null}

      <div className={`flex items-center gap-1 rounded-md ${highlightOnes && rank >= 1 ? 'ev-col-pulse' : ''}`}>
        <span className="inline-flex h-10 w-8" />
        {rows.a.map((ch, i) => (
          <DigitCell key={`a-${i}`} ch={ch} animate={animate} delayMs={40 * i} />
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span
          className={`inline-flex h-10 w-8 items-center justify-center text-2xl font-black text-ev-ink ${
            animate ? 'ev-digit-in' : ''
          }`}
          style={{ animationDelay: animate ? '120ms' : undefined }}
        >
          {sign}
        </span>
        {rows.b.map((ch, i) => (
          <DigitCell key={`b-${i}`} ch={ch} animate={animate} delayMs={160 + 40 * i} />
        ))}
      </div>
      <div
        className={`h-1 rounded-full bg-[#0F172A] self-stretch mt-0.5 ${animate ? 'ev-line-draw' : ''}`}
        style={{ minWidth: `${(rows.cols + 1) * 2.25}rem` }}
      />
      {showSumSlot ? (
        <div className="flex items-center gap-1 min-h-10">
          <span className="inline-flex h-10 w-8" />
          {sumRows.sum.map((ch, i) => (
            <DigitCell
              key={`s-${i}`}
              ch={ch}
              tone="sum"
              slot={rank >= revealRank.sum}
              active={i === nextCol}
              animate={animate && rank >= revealRank.ones && ch !== ' '}
              delayMs={80 * i}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated Use ColumnOperation. Same renderer; operation defaults to add. */
export const ColumnAddition = ColumnOperation
