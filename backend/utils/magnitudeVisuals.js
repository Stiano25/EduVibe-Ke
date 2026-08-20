/**
 * Magnitude-aware diagram routing for counting visuals.
 *
 * object_quantity, counting_circles, and unit-tick number lines only work
 * when a child can actually count or trace the marks. Caps run at
 * generation/normalize time so stored params never disagree with the figure.
 * Render-time clamps are a last-ditch safety net, not the policy.
 */
import { resolveInteractionType } from './interactionTypes.js';
import { resolveAdditionLayout } from './additionLayout.js';
import { inferObjectKind, namesCountableObject } from './objectKinds.js';

export const OBJECT_QUANTITY_CEILING = 20;
export const COUNTING_CIRCLES_CEILING = 40;
export const NUMBER_LINE_MAX_TICKS = 20;
export const NUMBER_LINE_STEPS = Object.freeze([1, 5, 10, 50, 100]);
/** Placeholder from defaultParamsHint — never keep when real digits exist. */
export const PLACE_VALUE_DEFAULT_NUMBER = 245;

export const CONCRETE_DIAGRAM_MAGNITUDE_LINE =
  'Concrete count visuals (object_quantity, counting_circles, drag_to_target) are only for quantities ≤ 20. A number_line must stay at about 20 ticks — raise step to 5, 10, 50, or 100 rather than drawing hundreds of unit marks. For 2–3 digit numbers use place_value (hundreds/tens/ones) or a vertical column. Never store 325 icons and draw 20.';

export const numbersFromText = (text = '') =>
  [...String(text).matchAll(/\d+(?:\.\d+)?/g)]
    .map((m) => Number(m[0]))
    .filter((n) => Number.isFinite(n));

export const integerQuantitiesFromText = (text = '') =>
  numbersFromText(text).filter((n) => Number.isInteger(n) && n >= 0);

export const objectQuantities = (params = {}) => {
  if (Array.isArray(params.groups) && params.groups.length) {
    return params.groups.map((n) => Number(n) || 0);
  }
  const count = Number(params.count);
  return Number.isFinite(count) ? [count] : [];
};

export const objectQuantityExceedsCeiling = (params = {}) => {
  const qs = objectQuantities(params);
  if (!qs.length) return false;
  if (qs.some((n) => n > OBJECT_QUANTITY_CEILING)) return true;
  // Equal groups (3×4 → groups:[4,4,4]) must cap the total icons, not only each group.
  return qs.reduce((sum, n) => sum + n, 0) > OBJECT_QUANTITY_CEILING;
};

export const countingCirclesExceedsCeiling = (params = {}) =>
  (Number(params.count) || 0) > COUNTING_CIRCLES_CEILING;

export const quantitiesExceedObjectCeiling = (quantities = []) =>
  (quantities || []).some((n) => Number(n) > OBJECT_QUANTITY_CEILING);

export const prefersConcreteDiagrams = (gradeNumber, quantities) => {
  const n = Number(gradeNumber);
  if (!(Number.isFinite(n) && n <= 3)) return false;
  if (Array.isArray(quantities) && quantitiesExceedObjectCeiling(quantities)) return false;
  return true;
};

/**
 * Read the authored span. start/end are aliases of min/max.
 * When both exist and min/max is the 0–10 default while start/end is a
 * real span, prefer start/end (the G3 Addition 342→367 bug).
 */
export const resolveNumberLineRange = (params = {}) => {
  const start = Number(params.start);
  const end = Number(params.end);
  const minRaw = Number(params.min);
  const maxRaw = Number(params.max);
  const hasStartEnd = Number.isFinite(start) && Number.isFinite(end) && start !== end;
  const hasMinMax = Number.isFinite(minRaw) && Number.isFinite(maxRaw);
  let min;
  let max;
  if (hasStartEnd && hasMinMax) {
    const minMaxDefault = minRaw === 0 && maxRaw === 10;
    const startEndDefault = start === 0 && end === 10;
    if (minMaxDefault && !startEndDefault) {
      min = start;
      max = end;
    } else {
      min = minRaw;
      max = maxRaw;
    }
  } else if (hasStartEnd) {
    min = start;
    max = end;
  } else if (hasMinMax) {
    min = minRaw;
    max = maxRaw;
  } else {
    min = 0;
    max = 10;
  }
  if (max < min) {
    const swap = min;
    min = max;
    max = swap;
  }
  return { min, max };
};

export const numberLineTickCount = (min, max, step = 1) => {
  const s = Number(step) > 0 ? Number(step) : 1;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return 0;
  return Math.floor((max - min) / s) + 1;
};

/**
 * Keep a number line only when some skip-count step in NUMBER_LINE_STEPS
 * holds total ticks at NUMBER_LINE_MAX_TICKS. Never shrink an authored step.
 */
export const fitNumberLineStep = (params = {}) => {
  const { min, max } = resolveNumberLineRange(params);
  const authored = Number(params.step) > 0 ? Number(params.step) : 1;
  const stepsToTry = NUMBER_LINE_STEPS.filter((s) => s >= authored || authored === 1);
  for (const step of stepsToTry) {
    const ticks = numberLineTickCount(min, max, step);
    if (ticks >= 2 && ticks <= NUMBER_LINE_MAX_TICKS) {
      return { ok: true, min, max, step, ticks };
    }
  }
  return {
    ok: false,
    min,
    max,
    step: authored,
    ticks: numberLineTickCount(min, max, authored)
  };
};

export const composePlaceValueNumber = (params = {}) => {
  const thousands = Number(params.thousands);
  const hundreds = Number(params.hundreds);
  const tens = Number(params.tens);
  const ones = Number(params.ones);
  const hasPlaces = [thousands, hundreds, tens, ones].some((n) => Number.isInteger(n));
  if (!hasPlaces) return null;
  return (
    (Number.isInteger(thousands) ? thousands : 0) * 1000 +
    (Number.isInteger(hundreds) ? hundreds : 0) * 100 +
    (Number.isInteger(tens) ? tens : 0) * 10 +
    (Number.isInteger(ones) ? ones : 0)
  );
};

export const placeValueParamsForNumber = (n) => {
  const abs = Math.trunc(Math.abs(Number(n) || 0));
  const len = String(abs).length;
  const headers = len >= 4 ? ['Th', 'H', 'T', 'O'] : len >= 3 ? ['H', 'T', 'O'] : ['T', 'O'];
  return { number: abs, headers, label: String(abs) };
};

export const sanitizePlaceValueParams = (params = {}, text = '') => {
  const p = { ...(params || {}) };
  const fromPlaces = composePlaceValueNumber(p);
  if (fromPlaces != null) {
    p.number = fromPlaces;
    if (!p.label || p.label === 'Place value' || String(p.number) === String(PLACE_VALUE_DEFAULT_NUMBER)) {
      p.label = String(fromPlaces);
    }
    return p;
  }
  const fromText = integerQuantitiesFromText(text).filter((n) => n >= 10);
  const stored = Number(p.number);
  if (
    stored === PLACE_VALUE_DEFAULT_NUMBER &&
    fromText.length > 0 &&
    !fromText.includes(PLACE_VALUE_DEFAULT_NUMBER)
  ) {
    const n = fromText[0];
    return { ...p, ...placeValueParamsForNumber(n) };
  }
  if (!Number.isFinite(stored) && fromText.length > 0) {
    return { ...p, ...placeValueParamsForNumber(fromText[0]) };
  }
  return p;
};

const largestUsefulNumber = (text, questionParams) => {
  const fromQ = [questionParams?.a, questionParams?.b, questionParams?.target, questionParams?.count]
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 10);
  const fromText = integerQuantitiesFromText(text).filter((n) => n >= 10);
  const all = [...fromQ, ...fromText];
  if (!all.length) return null;
  return Math.max(...all);
};

export const magnitudeFallback = ({
  interactionType = null,
  questionParams = null,
  text = '',
  preferPlaceValue = false
} = {}) => {
  const isVerticalNumeric =
    resolveInteractionType(interactionType) === 'numeric_entry' &&
    resolveAdditionLayout(questionParams?.layout, { defaultLayout: 'horizontal' }) === 'vertical';
  if (isVerticalNumeric && !preferPlaceValue) {
    return { diagramType: null, params: null, dropVisual: true };
  }
  const n = largestUsefulNumber(text, questionParams);
  if (n != null) {
    return { diagramType: 'place_value', params: placeValueParamsForNumber(n), dropVisual: false };
  }
  return { diagramType: null, params: null, dropVisual: true };
};

/**
 * Seed range/counts from stem without silently truncating over-ceiling values.
 * Over-ceiling data is left intact so applyMagnitudeCaps can reroute the type.
 */
export const seedMagnitudeParams = (diagramType, params, text = '') => {
  const p = { ...(params || {}) };
  const nums = numbersFromText(text);

  switch (diagramType) {
    case 'number_line': {
      const resolved = resolveNumberLineRange(p);
      p.min = resolved.min;
      p.max = resolved.max;
      p.start = resolved.min;
      p.end = resolved.max;
      if (nums.length >= 1 && (p.highlight == null || Number(p.highlight) === 5)) {
        const spanNums = nums.filter((n) => n >= resolved.min && n <= resolved.max);
        if (spanNums.length) p.highlight = spanNums[0];
        else if (!Number.isFinite(Number(params?.highlight))) p.highlight = nums[0];
      }
      const fitted = fitNumberLineStep(p);
      if (fitted.ok) {
        p.min = fitted.min;
        p.max = fitted.max;
        p.step = fitted.step;
        p.start = fitted.min;
        p.end = fitted.max;
        p._numberLineFits = true;
      } else {
        p._numberLineFits = false;
      }
      return p;
    }
    case 'object_quantity': {
      p.objectKind = inferObjectKind(text) || p.objectKind || 'bead';
      if (Array.isArray(p.groups) && p.groups.length >= 1) return p;
      if (nums.length >= 2 && namesCountableObject(text)) {
        p.groups = nums.slice(0, 2).map((n) => Math.trunc(n));
      } else if (nums.length >= 1) {
        p.count = Math.trunc(nums[0]);
      }
      return p;
    }
    case 'counting_circles':
      if (nums.length >= 1 && p.count == null) p.count = Math.trunc(nums[0]);
      return p;
    case 'place_value':
      return sanitizePlaceValueParams(p, text);
    default:
      return p;
  }
};

export const applyMagnitudeCaps = ({
  diagramType,
  params,
  text = '',
  interactionType = null,
  questionParams = null,
  preferPlaceValue = false
} = {}) => {
  const type = String(diagramType || '').trim();
  const seeded = seedMagnitudeParams(type, params, text);
  const textQuantities = integerQuantitiesFromText(text);
  const overObject =
    type === 'object_quantity' &&
    (objectQuantityExceedsCeiling(seeded) || quantitiesExceedObjectCeiling(textQuantities));
  const overCircles =
    type === 'counting_circles' &&
    (countingCirclesExceedsCeiling(seeded) ||
      textQuantities.some((n) => n > COUNTING_CIRCLES_CEILING));
  const overLine = type === 'number_line' && seeded._numberLineFits === false;

  if (overObject || overCircles || overLine) {
    return magnitudeFallback({
      interactionType,
      questionParams,
      text,
      preferPlaceValue
    });
  }

  if (type === 'number_line') {
    const { _numberLineFits, ...rest } = seeded;
    return { diagramType: type, params: rest, dropVisual: false };
  }
  if (type === 'place_value') {
    return { diagramType: type, params: sanitizePlaceValueParams(seeded, text), dropVisual: false };
  }
  return { diagramType: type, params: seeded, dropVisual: false };
};

export const mergeDiagramParams = (diagramType, authored, hint) => {
  const a = authored && typeof authored === 'object' ? authored : {};
  const h = hint && typeof hint === 'object' ? hint : {};
  if (diagramType === 'number_line') {
    const merged = { ...h, ...a };
    const resolved = resolveNumberLineRange(merged);
    return {
      ...merged,
      min: resolved.min,
      max: resolved.max,
      start: resolved.min,
      end: resolved.max,
      step: Number(merged.step) > 0 ? Number(merged.step) : 1
    };
  }
  if (diagramType === 'place_value') {
    const merged = { ...h, ...a };
    if (a.number == null) delete merged.number;
    return sanitizePlaceValueParams(merged, '');
  }
  return { ...h, ...a };
};
