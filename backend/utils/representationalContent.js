/**
 * B5 boundary: representational diagrams / picture options only when the
 * content names a countable object, a shape, or a quantity the learner should see.
 *
 * Do not force pictures onto abstract number comparisons or bare symbolic math.
 * Do not keep labeled_boxes as the default for object/quantity content (Part 0).
 */
import { inferObjectKind, namesCountableObject } from './objectKinds.js';
import {
  coerceDotRunOption,
  countFromDotRun,
  isVisualOption,
  normalizeQuizOption,
  optionDisplayText
} from './quizOptions.js';
import {
  OBJECT_QUANTITY_CEILING,
  integerQuantitiesFromText,
  quantitiesExceedObjectCeiling
} from './magnitudeVisuals.js';

const OBJECT_QUANTITY_CUE =
  /\b(how many|altogether|in all|count|show this many|draw enough|group of)\b/i;

const GEOMETRY_CUE =
  /\b(cube|cuboid|rectangle|square|triangle|circle|sphere|cylinder|shape)\b/i;

const ABSTRACT_COMPARE =
  /\b(bigger|smaller|greater|less than|more than|which number)\b/i;

export const isObjectQuantityContent = (text = '') => {
  const t = String(text || '');
  if (!namesCountableObject(t)) return false;
  const quantities = integerQuantitiesFromText(t);
  if (quantitiesExceedObjectCeiling(quantities)) return false;
  if (OBJECT_QUANTITY_CUE.test(t)) return true;
  if (/\b\d+\b/.test(t)) return true;
  return false;
};

export const isGeometricContent = (text = '') => GEOMETRY_CUE.test(String(text || ''));

export const isAbstractNumericContent = (text = '') => {
  const t = String(text || '');
  if (namesCountableObject(t) || isGeometricContent(t)) return false;
  if (ABSTRACT_COMPARE.test(t)) return true;
  if (/^\s*(what is|find|compute)?\s*\$?\d+\s*[+\-×x*÷/]\s*\d+/i.test(t)) return true;
  return false;
};

export const shouldUseRepresentationalDiagram = (text = '') =>
  isObjectQuantityContent(text) || isGeometricContent(text);

export const inferGeometryDiagramType = (text = '') => {
  const t = String(text || '').toLowerCase();
  if (/\bcube|cuboid\b/.test(t)) return 'cube';
  if (/\brectangle|square\b/.test(t)) return 'rectangle';
  if (/\btriangle\b/.test(t)) return 'right_triangle';
  return null;
};

const integerFromOption = (option) => {
  const text = optionDisplayText(option).trim();
  if (/^\d+$/.test(text)) return Number(text);
  const fromDots = countFromDotRun(text);
  if (fromDots != null) return fromDots;
  const m = text.match(/^(\d+)\s/);
  return m ? Number(m[1]) : null;
};

/**
 * Picture options when the stem is visual (objects/shapes) or the option itself
 * is a figure / Unicode-dot run. Leave "10 vs 30" style choices as text.
 */
export const coercePictureOptions = (options = [], stem = '') => {
  const list = Array.isArray(options) ? options : [];
  const kind = inferObjectKind(stem) || 'bead';
  const stemWantsPictures =
    isObjectQuantityContent(stem) || isGeometricContent(stem);
  const abstract = isAbstractNumericContent(stem);

  return list.map((option) => {
    if (isVisualOption(option)) return normalizeQuizOption(option);
    const dotted = coerceDotRunOption(option, kind);
    if (isVisualOption(dotted)) return dotted;
    if (abstract || !stemWantsPictures) return normalizeQuizOption(option);
    const n = integerFromOption(option);
    if (n != null && n >= 1 && n <= OBJECT_QUANTITY_CEILING && isObjectQuantityContent(stem)) {
      return { diagramType: 'object_quantity', params: { objectKind: kind, count: n } };
    }
    return normalizeQuizOption(option);
  });
};

export const objectQuantityParamsFromQuestion = (question = {}) => {
  const stem = `${question.question || ''} ${question.questionText || ''}`;
  const kind =
    question.params?.objectKind || inferObjectKind(stem) || 'bead';
  const a = Number(question.params?.a);
  const b = Number(question.params?.b);
  if (Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0) {
    return { objectKind: kind, groups: [a, b] };
  }
  const count = Number(question.params?.target ?? question.params?.count);
  if (Number.isInteger(count) && count >= 1) {
    return { objectKind: kind, count };
  }
  return { objectKind: kind, count: 5 };
};

export const optionsHaveVisuals = (options = []) =>
  Array.isArray(options) && options.some(isVisualOption);
