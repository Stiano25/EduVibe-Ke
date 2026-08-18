/**
 * Keep in sync with backend/utils/additionLayout.js.
 */
export const ADDITION_LAYOUTS = ['vertical', 'horizontal'] as const

export type AdditionLayout = (typeof ADDITION_LAYOUTS)[number]

export const DEFAULT_ADDITION_LAYOUT: AdditionLayout = 'vertical'
export const VERTICAL_ADDITION_INSTRUCTION = 'Add.'

export type ColumnReveal = 'addends' | 'ones' | 'carry' | 'sum'

export const resolveAdditionLayout = (value?: string | null): AdditionLayout => {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if ((ADDITION_LAYOUTS as readonly string[]).includes(raw)) return raw as AdditionLayout
  return DEFAULT_ADDITION_LAYOUT
}

export const resolveScaffoldCarry = (
  value?: boolean | string | number | null,
  layout?: string | null
): boolean => {
  if (value === true || value === 'true' || value === 1) return true
  if (value === false || value === 'false' || value === 0) return false
  return resolveAdditionLayout(layout) === 'vertical'
}

const asAbsInt = (n: number) => Math.trunc(Math.abs(Number(n) || 0))

export const onesDigit = (n: number) => asAbsInt(n) % 10

export const needsRegrouping = (a: number, b: number) => onesDigit(a) + onesDigit(b) >= 10

export const placeValueRows = (a: number, b: number, sumText = '', minCols = 1) => {
  const aStr = String(asAbsInt(a))
  const bStr = String(asAbsInt(b))
  const sumStr = String(sumText || '').replace(/\D/g, '')
  const cols = Math.max(aStr.length, bStr.length, sumStr.length || 1, minCols, 1)
  const cells = (s: string) => s.padStart(cols, ' ').split('')
  return {
    cols,
    a: cells(aStr),
    b: cells(bStr),
    sum: cells(sumStr),
  }
}

/**
 * Column addition is ones → tens (right to left).
 * First digit stays in the ones; the next digit fills the tens to its left.
 */
export const applyColumnDigit = (prev: string, key: string, maxLen = 6) => {
  const cur = String(prev || '').replace(/\D/g, '')
  if (key === 'back') return cur.slice(1)
  if (!/^\d$/.test(key) || cur.length >= maxLen) return cur
  return `${key}${cur}`
}

export const columnSumMaxDigits = (a: number, b: number) =>
  Math.min(6, Math.max(2, String(asAbsInt(a + b)).length))

/** Digit count of a + b. Used to auto-submit once ones (then tens) are filled. */
export const expectedSumDigitCount = (a: number, b: number) =>
  String(asAbsInt(a) + asAbsInt(b)).length

export type DigitPadTier = 'easy' | 'intermediate' | 'advanced'

const EXTRA_DISTRACTORS: Record<DigitPadTier, number> = {
  easy: 2,
  intermediate: 4,
  advanced: 6,
}

const uniqueDigitsOf = (n: number) => {
  const out: number[] = []
  for (const ch of String(asAbsInt(n))) {
    const d = Number(ch)
    if (!out.includes(d)) out.push(d)
  }
  return out
}

const pushDigit = (list: number[], d: number) => {
  const n = ((Math.trunc(d) % 10) + 10) % 10
  if (!list.includes(n)) list.push(n)
}

/**
 * Answer digits plus a difficulty-scaled mix of distractors (addend digits,
 * carry slips, neighbours). Chips are reused — 11 still needs only {1}.
 */
export const digitChoicesForSum = (
  a: number,
  b: number,
  difficulty: string | null | undefined = 'intermediate'
): number[] => {
  const left = asAbsInt(a)
  const right = asAbsInt(b)
  const needed = uniqueDigitsOf(left + right)
  const pool: number[] = []
  uniqueDigitsOf(left).forEach((d) => pushDigit(pool, d))
  uniqueDigitsOf(right).forEach((d) => pushDigit(pool, d))
  const onesSum = (left % 10) + (right % 10)
  pushDigit(pool, onesSum % 10)
  if (onesSum >= 10) pushDigit(pool, Math.floor(onesSum / 10))
  needed.forEach((d) => {
    pushDigit(pool, d + 1)
    pushDigit(pool, d - 1)
  })
  ;[9, 0, 1, 4, 7, 2, 5, 8, 3, 6].forEach((d) => pushDigit(pool, d))
  const distractors = pool.filter((d) => !needed.includes(d))
  const tier = (['easy', 'intermediate', 'advanced'] as const).includes(
    difficulty as DigitPadTier
  )
    ? (difficulty as DigitPadTier)
    : 'intermediate'
  return [...needed, ...distractors.slice(0, EXTRA_DISTRACTORS[tier])]
}

export const shuffleWithSeed = <T,>(items: readonly T[], seed: string): T[] => {
  const arr = [...items]
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  for (let i = arr.length - 1; i > 0; i -= 1) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    const j = h % (i + 1)
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

export const columnWorking = (a: number, b: number) => {
  const total = asAbsInt(a) + asAbsInt(b)
  const aStr = String(asAbsInt(a))
  const bStr = String(asAbsInt(b))
  const cols = Math.max(aStr.length, bStr.length, String(total).length, 2)
  const aDig = aStr.padStart(cols, '0').split('').map(Number)
  const bDig = bStr.padStart(cols, '0').split('').map(Number)
  const carryInto = Array(cols).fill(0)
  const written = Array(cols).fill(0)
  const carryOut = Array(cols).fill(0)
  for (let i = cols - 1; i >= 0; i -= 1) {
    const sum = aDig[i] + bDig[i] + carryInto[i]
    written[i] = sum % 10
    carryOut[i] = Math.floor(sum / 10)
    if (i > 0) carryInto[i - 1] = carryOut[i]
  }
  return {
    cols,
    aDig,
    bDig,
    carryInto,
    written,
    carryOut,
    sum: total,
    onesCarry: carryOut[cols - 1] || 0,
    needsRegroup: carryOut.some((c) => c > 0),
  }
}

export type WorkedStep = {
  id: string
  text: string
  reveal: ColumnReveal
}

export const additionWorkedSteps = (a: number, b: number): WorkedStep[] => {
  const left = asAbsInt(a)
  const right = asAbsInt(b)
  const work = columnWorking(left, right)
  const onesA = onesDigit(left)
  const onesB = onesDigit(right)
  const onesSum = onesA + onesB
  const onesWrite = onesSum % 10
  const carry = work.onesCarry
  return [
    {
      id: 'align',
      text: `Line up ${left} and ${right}. Ones under ones.`,
      reveal: 'addends',
    },
    {
      id: 'ones',
      text:
        carry > 0
          ? `${onesA} + ${onesB} = ${onesSum}. Write ${onesWrite}.`
          : `${onesA} + ${onesB} = ${onesSum}. Write ${onesSum} in the ones.`,
      reveal: 'ones',
    },
    {
      id: 'carry',
      text: carry > 0 ? `Carry ${carry} to the tens.` : 'Nothing to carry.',
      reveal: 'carry',
    },
    {
      id: 'sum',
      text: `The total is ${work.sum}.`,
      reveal: 'sum',
    },
  ]
}
