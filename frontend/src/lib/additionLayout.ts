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
