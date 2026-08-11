const ALLOWED_VARIABLES = new Set(['a', 'b']);
const OPERATORS = {
  '+': { precedence: 1, apply: (a, b) => a + b },
  '-': { precedence: 1, apply: (a, b) => a - b },
  '*': { precedence: 2, apply: (a, b) => a * b }
};

const asInt = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
};

const normalizeRange = (range, fallback) => {
  const raw = Array.isArray(range) ? range : fallback;
  const min = Math.max(0, asInt(raw?.[0], fallback[0]));
  const max = Math.max(min, asInt(raw?.[1], fallback[1]));
  return [min, max];
};

export const normalizeAdditionConstraints = (raw = {}) => ({
  a: normalizeRange(raw.a, [1, 9]),
  b: normalizeRange(raw.b, [1, 9]),
  sumMax: Math.min(100, Math.max(2, asInt(raw.sumMax, 10))),
  operation: 'addition',
  ...(raw.aGteB === true ? { aGteB: true } : {}),
  ...(raw.noRegrouping === true ? { noRegrouping: true } : {}),
  ...(asInt(raw.aStep, 1) > 1 ? { aStep: asInt(raw.aStep, 1) } : {}),
  ...(asInt(raw.bStep, 1) > 1 ? { bStep: asInt(raw.bStep, 1) } : {})
});

const tokenizeFormula = (formula) => {
  const source = String(formula || '').trim();
  if (!source || source.length > 80) throw new Error('Formula is empty or too long');
  const tokens = source.match(/[A-Za-z]+|\d+|[()+\-*]/g) || [];
  if (tokens.join('').toLowerCase() !== source.replace(/\s+/g, '').toLowerCase()) {
    throw new Error('Formula contains unsupported characters');
  }
  return tokens.map((token) => {
    const lower = token.toLowerCase();
    if (/^\d+$/.test(token)) return { type: 'number', value: Number(token) };
    if (ALLOWED_VARIABLES.has(lower)) return { type: 'variable', value: lower };
    if (OPERATORS[token]) return { type: 'operator', value: token };
    if (token === '(' || token === ')') return { type: 'paren', value: token };
    throw new Error(`Unsupported formula token: ${token}`);
  });
};

const toPostfix = (tokens) => {
  const output = [];
  const stack = [];
  let expectsValue = true;
  for (const token of tokens) {
    if (token.type === 'number' || token.type === 'variable') {
      if (!expectsValue) throw new Error('Formula is missing an operator');
      output.push(token);
      expectsValue = false;
      continue;
    }
    if (token.type === 'paren' && token.value === '(') {
      if (!expectsValue) throw new Error('Formula is missing an operator before "("');
      stack.push(token);
      continue;
    }
    if (token.type === 'paren' && token.value === ')') {
      if (expectsValue) throw new Error('Formula has an empty or incomplete group');
      while (stack.length && stack.at(-1).value !== '(') output.push(stack.pop());
      if (!stack.length) throw new Error('Formula parentheses do not match');
      stack.pop();
      expectsValue = false;
      continue;
    }
    if (token.type === 'operator') {
      if (expectsValue) throw new Error('Unary operators are not supported');
      while (
        stack.length &&
        stack.at(-1).type === 'operator' &&
        OPERATORS[stack.at(-1).value].precedence >= OPERATORS[token.value].precedence
      ) {
        output.push(stack.pop());
      }
      stack.push(token);
      expectsValue = true;
    }
  }
  if (expectsValue) throw new Error('Formula is incomplete');
  while (stack.length) {
    const token = stack.pop();
    if (token.type === 'paren') throw new Error('Formula parentheses do not match');
    output.push(token);
  }
  return output;
};

export const compileFormula = (formula) => {
  const postfix = toPostfix(tokenizeFormula(formula));
  return (params = {}) => {
    const stack = [];
    for (const token of postfix) {
      if (token.type === 'number') stack.push(token.value);
      else if (token.type === 'variable') {
        const value = Number(params[token.value]);
        if (!Number.isFinite(value)) throw new Error(`Missing formula variable: ${token.value}`);
        stack.push(value);
      } else {
        if (stack.length < 2) throw new Error('Formula is incomplete');
        const right = stack.pop();
        const left = stack.pop();
        stack.push(OPERATORS[token.value].apply(left, right));
      }
    }
    if (stack.length !== 1 || !Number.isFinite(stack[0])) {
      throw new Error('Formula did not produce one finite value');
    }
    return stack[0];
  };
};

export const enumerateAdditionPairs = (rawConstraints = {}) => {
  const constraints = normalizeAdditionConstraints(rawConstraints);
  const pairs = [];
  const aStep = constraints.aStep || 1;
  const bStep = constraints.bStep || 1;
  for (let a = constraints.a[0]; a <= constraints.a[1]; a += aStep) {
    for (let b = constraints.b[0]; b <= constraints.b[1]; b += bStep) {
      if (a + b > constraints.sumMax) continue;
      if (constraints.aGteB && a < b) continue;
      if (constraints.noRegrouping && (a % 10) + (b % 10) >= 10) continue;
      pairs.push({ a, b });
    }
  }
  return pairs;
};

const DEFAULT_DISTRACTOR_FORMULAS = [
  {
    id: 'off_by_one_low',
    formula: 'a + b - 1',
    misconception: 'counted one too few'
  },
  {
    id: 'off_by_one_high',
    formula: 'a + b + 1',
    misconception: 'counted one too many'
  },
  {
    id: 'recounted_extra',
    formula: 'a + b + 2',
    misconception: 'recounted two objects'
  }
];

const normalizeDistractorFormulas = (items) =>
  (Array.isArray(items) ? items : [])
    .slice(0, 5)
    .map((item, index) => ({
      id: String(item?.id || `distractor_${index + 1}`).slice(0, 60),
      formula: String(item?.formula || '').trim(),
      misconception: String(item?.misconception || 'addition mix-up').slice(0, 120)
    }))
    .filter((item) => item.formula);

const evaluatePair = ({ pair, answerFn, distractorFns }) => {
  const correct = answerFn(pair);
  const distractors = distractorFns.map(({ item, fn }) => ({
    ...item,
    value: fn(pair)
  }));
  const values = [correct, ...distractors.map((item) => item.value)];
  const valid =
    values.every((value) => Number.isInteger(value) && value >= 0) &&
    new Set(values).size === values.length;
  return { valid, correct, distractors };
};

export const validateAdditionTemplate = (template = {}) => {
  const constraints = normalizeAdditionConstraints(template.constraints);
  const pairs = enumerateAdditionPairs(constraints);
  if (pairs.length < 2) return { valid: false, reason: 'fewer than two valid parameter pairs' };
  if (!/\{a\}/.test(String(template.questionText)) || !/\{b\}/.test(String(template.questionText))) {
    return { valid: false, reason: 'questionText must contain {a} and {b}' };
  }
  try {
    const answerFormula = String(template.answerFormula || 'a + b');
    const answerFn = compileFormula(answerFormula);
    const formulas = normalizeDistractorFormulas(template.distractorFormulas);
    if (formulas.length < 3) return { valid: false, reason: 'at least three distractor formulas required' };
    const distractorFns = formulas.map((item) => ({ item, fn: compileFormula(item.formula) }));
    for (const pair of pairs) {
      if (!evaluatePair({ pair, answerFn, distractorFns }).valid) {
        return { valid: false, reason: `invalid or duplicate answer at a=${pair.a}, b=${pair.b}` };
      }
    }
    return {
      valid: true,
      constraints,
      pairs,
      answerFormula,
      distractorFormulas: formulas
    };
  } catch (error) {
    return { valid: false, reason: error.message || String(error) };
  }
};

const renderTemplateText = (text, params) =>
  String(text || '')
    .replaceAll('{a}', String(params.a))
    .replaceAll('{b}', String(params.b));

const parameterizeRenderedQuestion = (question = {}) => {
  let text = String(question.questionText || question.question || '');
  for (const key of ['a', 'b']) {
    if (text.includes(`{${key}}`)) continue;
    const value = asInt(question.params?.[key], NaN);
    if (!Number.isFinite(value)) continue;
    const pattern = new RegExp(`(^|\\D)${value}(?=\\D|$)`);
    text = text.replace(pattern, (_match, prefix) => `${prefix}{${key}}`);
  }
  return text;
};

const buildFromValidated = (template, validation, pair) => {
  const answerFn = compileFormula(validation.answerFormula);
  const distractorFns = validation.distractorFormulas.map((item) => ({
    item,
    fn: compileFormula(item.formula)
  }));
  const evaluated = evaluatePair({ pair, answerFn, distractorFns });
  if (!evaluated.valid) return null;
  const options = [
    String(evaluated.correct),
    ...evaluated.distractors.map((item) => String(item.value))
  ];
  return {
    ...template,
    template: true,
    templateVersion: 1,
    questionText: String(template.questionText),
    params: { a: pair.a, b: pair.b },
    constraints: validation.constraints,
    answerFormula: validation.answerFormula,
    distractorFormulas: validation.distractorFormulas,
    question: renderTemplateText(template.questionText, pair),
    options,
    correctAnswerIndex: 0,
    distractors: evaluated.distractors.map((item, index) => ({
      optionIndex: index + 1,
      misconception: item.misconception,
      formulaId: item.id
    }))
  };
};

/**
 * Canonicalize an AI-authored Addition template. Invalid AI distractors are
 * replaced with conservative formula distractors, then validated over the full domain.
 */
export const normalizeAdditionTemplateQuestion = (question = {}) => {
  if (question.template !== true) return { question, valid: false, reason: 'not a template' };
  const base = {
    ...question,
    questionText: parameterizeRenderedQuestion(question),
    constraints: normalizeAdditionConstraints(question.constraints),
    answerFormula: String(question.answerFormula || 'a + b'),
    distractorFormulas: normalizeDistractorFormulas(question.distractorFormulas)
  };
  let validation = validateAdditionTemplate(base);
  let repairedDistractors = false;
  if (!validation.valid) {
    base.distractorFormulas = DEFAULT_DISTRACTOR_FORMULAS;
    validation = validateAdditionTemplate(base);
    repairedDistractors = validation.valid;
  }
  if (!validation.valid) return { question, valid: false, reason: validation.reason };
  const requested = {
    a: asInt(question.params?.a, NaN),
    b: asInt(question.params?.b, NaN)
  };
  const pair =
    validation.pairs.find((candidate) => candidate.a === requested.a && candidate.b === requested.b) ||
    validation.pairs[0];
  const built = buildFromValidated(base, validation, pair);
  return {
    question: built,
    valid: !!built,
    repairedDistractors,
    reason: built ? null : 'initial pair could not produce valid distractors'
  };
};

/**
 * Generate a different safe pair. Candidates are tried without replacement,
 * so an invalid pair is skipped and generation continues rather than failing silently.
 */
export const twistAdditionQuestion = (template = {}, { random = Math.random } = {}) => {
  const normalized = normalizeAdditionTemplateQuestion(template);
  if (!normalized.valid) return { ok: false, reason: normalized.reason };
  const validation = validateAdditionTemplate(normalized.question);
  const original = normalized.question.params || {};
  const candidates = validation.pairs.filter(
    (pair) => pair.a !== Number(original.a) || pair.b !== Number(original.b)
  );
  while (candidates.length > 0) {
    const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
    const [pair] = candidates.splice(index, 1);
    const built = buildFromValidated(normalized.question, validation, pair);
    if (built) return { ok: true, question: built, attempts: validation.pairs.length - candidates.length };
  }
  return { ok: false, reason: 'no alternative parameter pair produced valid distractors' };
};

export const isGradeOneAdditionContext = (ctx = {}) => {
  const subject = String(ctx.subject?.name || ctx.subjectName || '').toLowerCase();
  const subStrand = String(ctx.subStrand?.name || ctx.subStrandName || '')
    .toLowerCase()
    .replace(/^\d+(\.\d+)?\s*/, '');
  return String(ctx.grade) === '1' && subject === 'mathematics' && subStrand === 'addition';
};
