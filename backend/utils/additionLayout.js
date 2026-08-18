/**
 * Presentation of a two-addend numeric_entry item.
 * Same {a, b} + answerFormula; only the layout changes.
 *
 * Grade 1 default is vertical (CBC: "horizontally and vertically").
 * Horizontal is the flexibility-probe twin — same numbers, different format.
 * scaffoldCarry draws the tens carry box; it stays empty unless this pair regroups
 * (or a worked example fills it).
 */

export const ADDITION_LAYOUTS = Object.freeze(['vertical', 'horizontal']);
export const DEFAULT_ADDITION_LAYOUT = 'vertical';
export const VERTICAL_ADDITION_INSTRUCTION = 'Add.';
export const VERTICAL_SUBTRACTION_INSTRUCTION = 'Subtract.';
export const HORIZONTAL_ADDITION_PATTERN = 'What is {a} + {b}?';
export const DEFAULT_COLUMN_OPERATION = 'add';

export const resolveColumnOperation = (value) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw === 'subtract' || raw === 'subtraction' || raw === '-') return 'subtract';
  return DEFAULT_COLUMN_OPERATION;
};

export const columnResult = (a, b, operation = 'add') => {
  const left = asAbsInt(a);
  const right = asAbsInt(b);
  return resolveColumnOperation(operation) === 'subtract'
    ? Math.max(0, left - right)
    : left + right;
};

export const resolveAdditionLayout = (value, { defaultLayout = DEFAULT_ADDITION_LAYOUT } = {}) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (ADDITION_LAYOUTS.includes(raw)) return raw;
  return defaultLayout;
};

export const renderHorizontalAdditionStem = (a, b, pattern = HORIZONTAL_ADDITION_PATTERN) =>
  String(pattern)
    .replaceAll('{a}', String(a))
    .replaceAll('{b}', String(b));

/** Short instruction for a vertical item. Never keep a computation sentence. */
export const verticalAdditionInstruction = (question = '', operation = 'add') => {
  if (resolveColumnOperation(operation) === 'subtract') return VERTICAL_SUBTRACTION_INSTRUCTION;
  const text = String(question || '').trim();
  if (text && text.length <= 12 && !/\d/.test(text)) return text;
  return VERTICAL_ADDITION_INSTRUCTION;
};

export const hasIntegerAddends = (params = {}) => {
  const a = Number(params.a);
  const b = Number(params.b);
  return Number.isInteger(a) && Number.isInteger(b);
};

const asAbsInt = (n) => Math.trunc(Math.abs(Number(n) || 0));

export const onesDigit = (n) => asAbsInt(n) % 10;

export const needsRegrouping = (a, b) => onesDigit(a) + onesDigit(b) >= 10;

/**
 * Explicit true/false wins. Otherwise: vertical items get the empty tens box
 * (scaffold). The digit only appears when this pair actually carries.
 */
export const resolveScaffoldCarry = (value, { layout = 'vertical' } = {}) => {
  if (value === true || value === 'true' || value === 1) return true;
  if (value === false || value === 'false' || value === 0) return false;
  return resolveAdditionLayout(layout) === 'vertical';
};

/**
 * Right-aligned place-value cells. Empty high-place cells are spaces, not zeros.
 * minCols=2 when a tens carry box must have a column to sit in.
 */
export const placeValueRows = (a, b, sumText = '', { minCols = 1 } = {}) => {
  const aStr = String(asAbsInt(a));
  const bStr = String(asAbsInt(b));
  const sumStr = String(sumText || '').replace(/\D/g, '');
  const cols = Math.max(aStr.length, bStr.length, sumStr.length || 1, minCols, 1);
  const cells = (s) => s.padStart(cols, ' ').split('');
  return {
    cols,
    a: cells(aStr),
    b: cells(bStr),
    sum: cells(sumStr)
  };
};

/** Column addition: first digit is ones; the next digit fills tens to the left. */
export const applyColumnDigit = (prev, key, maxLen = 6) => {
  const cur = String(prev || '').replace(/\D/g, '');
  if (key === 'back') return cur.slice(1);
  if (!/^\d$/.test(key) || cur.length >= maxLen) return cur;
  return `${key}${cur}`;
};

export const columnSumMaxDigits = (a, b, operation = 'add') =>
  Math.min(6, Math.max(2, String(columnResult(a, b, operation)).length));

export const expectedSumDigitCount = (a, b, operation = 'add') =>
  String(columnResult(a, b, operation)).length;

const EXTRA_DISTRACTORS = { easy: 2, intermediate: 4, advanced: 6 };

const uniqueDigitsOf = (n) => {
  const out = [];
  for (const ch of String(asAbsInt(n))) {
    const d = Number(ch);
    if (!out.includes(d)) out.push(d);
  }
  return out;
};

const pushDigit = (list, d) => {
  const n = ((Math.trunc(d) % 10) + 10) % 10;
  if (!list.includes(n)) list.push(n);
};

/** Answer digits plus a difficulty-scaled mix of distractors. */
export const digitChoicesForSum = (a, b, difficulty = 'intermediate', operation = 'add') => {
  const left = asAbsInt(a);
  const right = asAbsInt(b);
  const op = resolveColumnOperation(operation);
  const needed = uniqueDigitsOf(columnResult(left, right, op));
  const pool = [];
  uniqueDigitsOf(left).forEach((d) => pushDigit(pool, d));
  uniqueDigitsOf(right).forEach((d) => pushDigit(pool, d));
  if (op === 'subtract') {
    uniqueDigitsOf(left + right).forEach((d) => pushDigit(pool, d));
  }
  const onesSum = (left % 10) + (right % 10);
  pushDigit(pool, onesSum % 10);
  if (onesSum >= 10) pushDigit(pool, Math.floor(onesSum / 10));
  needed.forEach((d) => {
    pushDigit(pool, d + 1);
    pushDigit(pool, d - 1);
  });
  ;[9, 0, 1, 4, 7, 2, 5, 8, 3, 6].forEach((d) => pushDigit(pool, d));
  const distractors = pool.filter((d) => !needed.includes(d));
  const extra = EXTRA_DISTRACTORS[difficulty] ?? EXTRA_DISTRACTORS.intermediate;
  return [...needed, ...distractors.slice(0, extra)];
};

/**
 * Column working from the ones place leftward.
 * carryInto[i] is the digit carried into column i (0 = leftmost / highest place).
 */
export const columnWorking = (a, b) => {
  const total = asAbsInt(a) + asAbsInt(b);
  const aStr = String(asAbsInt(a));
  const bStr = String(asAbsInt(b));
  const cols = Math.max(aStr.length, bStr.length, String(total).length, 2);
  const aDig = aStr.padStart(cols, '0').split('').map(Number);
  const bDig = bStr.padStart(cols, '0').split('').map(Number);
  const carryInto = Array(cols).fill(0);
  const written = Array(cols).fill(0);
  const carryOut = Array(cols).fill(0);
  for (let i = cols - 1; i >= 0; i -= 1) {
    const sum = aDig[i] + bDig[i] + carryInto[i];
    written[i] = sum % 10;
    carryOut[i] = Math.floor(sum / 10);
    if (i > 0) carryInto[i - 1] = carryOut[i];
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
    needsRegroup: carryOut.some((c) => c > 0)
  };
};
