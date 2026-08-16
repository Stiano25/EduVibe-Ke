import { DIAGRAM_TYPES, renderDiagram, coerceLabeledBoxesParams } from './diagramTemplates.js';

/**
 * Infer diagram type from free-text brief when AI omits diagramType.
 *
 * `youngGrade` (Grade 3 and below) runs the concrete keyword tests first, so a
 * counting or number-line cue wins over the abstract process/comparison cues
 * further down the chain. Anything the concrete tests miss falls through to the
 * normal ordering unchanged.
 */
export const inferDiagramType = (brief = '', skillFocus = '', { youngGrade = false } = {}) => {
  const t = `${brief} ${skillFocus}`.toLowerCase();
  if (youngGrade) {
    if (/count(ing)?|counters?|circles?|dots?|ten\s*frame|objects?\s*to\s*count|how\s*many|altogether|in\s*all|group\s*of/.test(t)) {
      return 'counting_circles';
    }
    if (/number\s*line|numberline|count\s*on|jump\s*(of|to|forward)|order\s*the\s*numbers/.test(t)) {
      return 'number_line';
    }
    if (/fraction|half|halves|quarter|third|equal\s*parts?|shaded/.test(t)) return 'fraction_bars';
    if (/label|parts?\s*of|name\s*the|match\s*the|which\s*part/.test(t)) return 'labeled_boxes';
  }
  if (/matrix|matrices|determinant|row\s*and\s*column/.test(t)) return 'matrix';
  if (/unit\s*circle|radian|exact\s*value.*(sin|cos)|special\s*angle/.test(t)) return 'unit_circle';
  if (/trigonometr|sin\b|cos\b|tan\b|sohcahtoa|right\s*triangle|hypotenuse|opposite|adjacent/.test(t)) {
    return 'right_triangle';
  }
  if (/count(ing)?|counters?|circles?|dots?|ten\s*frame|objects?\s*to\s*count|how\s*many/.test(t)) {
    return 'counting_circles';
  }
  if (/indic(es|ex)|exponent|power\s*of|squared|cubed|\^[0-9]|base\s*and\s*power/.test(t)) {
    return 'indices';
  }
  if (/coordinate|cartesian|gradient|slope|perpendicular|parallel\s+line|y\s*=\s*|linear\s+graph|line\s+graph|axes/.test(t)) {
    return 'coordinate_plane';
  }
  if (/number\s*line|numberline/.test(t)) return 'number_line';
  if (/fraction|shaded\s*bar|pie\s*of/.test(t)) return 'fraction_bars';
  if (/bar\s*model|part[- ]whole|tape\s*diagram/.test(t)) return 'bar_model';
  if (/place\s*value|hundreds|tens\s*and\s*ones|thousands/.test(t)) return 'place_value';
  if (/process|cycle|steps?\s*(of|to)|sequence|flow/.test(t)) return 'process_flow';
  if (/compare|versus|vs\.?|difference|before\s*and\s*after/.test(t)) return 'comparison';
  return 'labeled_boxes';
};

const defaultParamsForType = (diagramType, brief, skillFocus) => {
  const label = skillFocus || brief?.slice(0, 60) || 'Concept';
  switch (diagramType) {
    case 'number_line':
      return { min: 0, max: 10, step: 1, highlight: 5, label };
    case 'fraction_bars':
      return { parts: 4, shaded: 1, label };
    case 'bar_model':
      return { label, segments: [{ value: 2, label: 'Part A' }, { value: 3, label: 'Part B' }] };
    case 'place_value':
      return { number: 245, label, headers: ['H', 'T', 'O'] };
    case 'process_flow':
      return { title: label, steps: ['Observe', 'Explain', 'Apply'] };
    case 'comparison':
      return { title: label, leftLabel: 'A', rightLabel: 'B', leftItems: ['Feature 1'], rightItems: ['Feature 1'] };
    case 'coordinate_plane':
      return {
        title: label,
        xMin: -5,
        xMax: 5,
        yMin: -5,
        yMax: 5,
        lines: [
          { m: 1, c: 0, label: 'y = x' },
          { m: -1, c: 0, label: 'y = −x' }
        ]
      };
    case 'matrix':
      return { title: label, rows: 2, cols: 2, values: [[1, 2], [3, 4]] };
    case 'counting_circles':
      return { title: label, count: 6, columns: 5 };
    case 'indices':
      return { title: label, base: 2, exponent: 3 };
    case 'right_triangle':
      return {
        title: label,
        angleDeg: 35,
        opposite: 'opp',
        adjacent: 'adj',
        hypotenuse: 'hyp'
      };
    case 'unit_circle':
      return { title: label, angleDeg: 60, pointLabel: '(cos θ, sin θ)' };
    case 'labeled_boxes':
    default:
      return { title: label, items: [{ label: 'Idea', text: skillFocus || 'Key concept' }] };
  }
};

/**
 * Build SVG buffer from a visual brief (structured or free-text).
 * @returns {{ svg: string, buffer: Buffer, mimeType: string, diagramType: string }}
 */
export const renderVisualBriefToSvg = (briefObj = {}) => {
  const brief = String(briefObj.brief || briefObj.description || '').trim();
  const skillFocus = String(briefObj.skillFocus || '').trim();
  let diagramType = String(briefObj.diagramType || '').trim();

  if (!DIAGRAM_TYPES.has(diagramType)) {
    diagramType = inferDiagramType(brief, skillFocus);
  }

  const rawParams = {
    ...defaultParamsForType(diagramType, brief, skillFocus),
    ...(briefObj.params && typeof briefObj.params === 'object' ? briefObj.params : {}),
    brief,
    skillFocus,
    label: briefObj.params?.label || skillFocus || brief.slice(0, 60)
  };
  const params =
    diagramType === 'labeled_boxes' ? coerceLabeledBoxesParams(rawParams) : rawParams;

  const svg = renderDiagram(diagramType, params);
  return {
    svg,
    buffer: Buffer.from(svg, 'utf8'),
    mimeType: 'image/svg+xml',
    diagramType
  };
};
