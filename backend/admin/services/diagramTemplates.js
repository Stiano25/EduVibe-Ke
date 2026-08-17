import { DEFAULT_OBJECT_KIND, inferObjectKind, isObjectKind, objectIconSvg } from '../../utils/objectKinds.js';

/** Escape text for SVG attribute / text nodes. */
const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const SUPER = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  n: 'ⁿ',
  i: 'ⁱ'
};

/** Make diagram labels print accurate indices / operators (SVG cannot run KaTeX). */
export const formatDiagramLabel = (raw = '') => {
  let s = String(raw || '').trim();
  if (!s) return '';
  s = s.replace(/^\$+|\$+$/g, '');
  s = s.replace(/\\text\{([^}]*)\}/g, '$1');
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
  s = s.replace(/\\div/g, '÷');
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  s = s.replace(/\\sqrt/g, '√');
  s = s.replace(/\^{([^}]+)}/g, (_m, exp) =>
    String(exp)
      .split('')
      .map((c) => SUPER[c] || c)
      .join('')
  );
  s = s.replace(/\^([0-9+\-ni])/g, (_m, c) => SUPER[c] || `^${c}`);
  s = s.replace(/\\,/g, ' ').replace(/\\;/g, ' ').replace(/\\ /g, ' ');
  return esc(s);
};
const svgWrap = (inner, w = 640, h = 280) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <rect width="100%" height="100%" fill="#F8FAFC"/>
  ${inner}
</svg>`;

/** Number line: min, max, step?, highlight?, label? */
export const renderNumberLine = (params = {}) => {
  const min = Number.isFinite(Number(params.min)) ? Number(params.min) : 0;
  const max = Number.isFinite(Number(params.max)) ? Number(params.max) : 10;
  const step = Number(params.step) > 0 ? Number(params.step) : 1;
  const highlight = params.highlight != null ? Number(params.highlight) : null;
  const label = params.label || '';
  const pad = 48;
  const y = 140;
  const usable = 640 - pad * 2;
  const range = Math.max(max - min, 1);
  const xAt = (v) => pad + ((v - min) / range) * usable;

  const ticks = [];
  for (let v = min; v <= max + 1e-9; v += step) {
    const x = xAt(v);
    const isHi = highlight != null && Math.abs(v - highlight) < 1e-9;
    ticks.push(`
      <line x1="${x}" y1="${y - 12}" x2="${x}" y2="${y + 12}" stroke="${isHi ? '#0F766E' : '#334155'}" stroke-width="${isHi ? 3 : 2}"/>
      <text x="${x}" y="${y + 36}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="14" fill="#0F172A">${formatDiagramLabel(String(v))}</text>
      ${isHi ? `<circle cx="${x}" cy="${y}" r="8" fill="#14B8A6"/>` : ''}
    `);
  }

  return svgWrap(`
    ${label ? `<text x="320" y="36" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(label)}</text>` : ''}
    <line x1="${pad}" y1="${y}" x2="${640 - pad}" y2="${y}" stroke="#334155" stroke-width="3"/>
    <polygon points="${640 - pad},${y} ${640 - pad - 10},${y - 6} ${640 - pad - 10},${y + 6}" fill="#334155"/>
    ${ticks.join('')}
  `);
};

/** Fraction bars: parts, shaded, label? */
export const renderFractionBars = (params = {}) => {
  const parts = Math.min(Math.max(Number(params.parts) || 4, 2), 12);
  const shaded = Math.min(Math.max(Number(params.shaded) || 1, 0), parts);
  const label = params.label || `${shaded}/${parts}`;
  const x0 = 48;
  const y0 = 100;
  const w = 544;
  const h = 64;
  const cellW = w / parts;
  const cells = [];
  for (let i = 0; i < parts; i++) {
    const fill = i < shaded ? '#14B8A6' : '#E2E8F0';
    cells.push(
      `<rect x="${x0 + i * cellW}" y="${y0}" width="${cellW - 2}" height="${h}" fill="${fill}" stroke="#334155" stroke-width="2" rx="4"/>`
    );
  }
  return svgWrap(`
    <text x="320" y="48" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(label)}</text>
    ${cells.join('')}
    <text x="320" y="210" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="14" fill="#475569">${formatDiagramLabel(`${shaded} of ${parts} equal parts shaded`)}</text>
  `);
};

/** Bar model: segments [{value, label, color?}] or values[] */
export const renderBarModel = (params = {}) => {
  let segments = Array.isArray(params.segments) ? params.segments : [];
  if (segments.length === 0 && Array.isArray(params.values)) {
    segments = params.values.map((v, i) => ({
      value: Number(v) || 1,
      label: params.labels?.[i] || String(v)
    }));
  }
  if (segments.length === 0) {
    segments = [
      { value: 2, label: 'A' },
      { value: 3, label: 'B' }
    ];
  }
  const total = segments.reduce((s, seg) => s + (Number(seg.value) || 1), 0) || 1;
  const x0 = 48;
  const y0 = 110;
  const w = 544;
  const h = 56;
  const colors = ['#14B8A6', '#0EA5E9', '#F59E0B', '#8B5CF6', '#F43F5E'];
  let x = x0;
  const rects = segments.map((seg, i) => {
    const vw = Math.max(((Number(seg.value) || 1) / total) * w, 8);
    const fill = seg.color || colors[i % colors.length];
    const node = `
      <rect x="${x}" y="${y0}" width="${vw - 2}" height="${h}" fill="${fill}" stroke="#0F172A" stroke-width="1.5" rx="4"/>
      <text x="${x + vw / 2}" y="${y0 + h / 2 + 5}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="13" fill="#0F172A">${formatDiagramLabel(seg.label || String(seg.value))}</text>
    `;
    x += vw;
    return node;
  });
  const title = params.label || params.title || 'Bar model';
  return svgWrap(`
    <text x="320" y="44" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(title)}</text>
    ${rects.join('')}
  `);
};

/** Place value: digits array or number string; headers optional */
export const renderPlaceValue = (params = {}) => {
  const headers = Array.isArray(params.headers) && params.headers.length
    ? params.headers.map(String)
    : ['Th', 'H', 'T', 'O'];
  let digits = Array.isArray(params.digits) ? params.digits.map(String) : [];
  if (digits.length === 0 && params.number != null) {
    const s = String(params.number).replace(/\D/g, '');
    digits = s.padStart(headers.length, '0').slice(-headers.length).split('');
  }
  while (digits.length < headers.length) digits.unshift('0');
  digits = digits.slice(-headers.length);

  const n = headers.length;
  const boxW = Math.min(100, 520 / n);
  const gap = 12;
  const totalW = n * boxW + (n - 1) * gap;
  const x0 = (640 - totalW) / 2;
  const y0 = 90;
  const cells = headers.map((h, i) => {
    const x = x0 + i * (boxW + gap);
    return `
      <rect x="${x}" y="${y0}" width="${boxW}" height="100" fill="#F1F5F9" stroke="#334155" stroke-width="2" rx="8"/>
      <text x="${x + boxW / 2}" y="${y0 + 28}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="13" fill="#64748B">${formatDiagramLabel(h)}</text>
      <text x="${x + boxW / 2}" y="${y0 + 72}" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="28" font-weight="700" fill="#0F172A">${formatDiagramLabel(digits[i] || '0')}</text>
    `;
  });
  const title = params.label || params.title || 'Place value';
  return svgWrap(`
    <text x="320" y="44" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(title)}</text>
    ${cells.join('')}
  `);
};

/** True when items is missing or only default placeholder "Idea"/"Concept" shells. */
export const isPlaceholderLabeledItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return true;
  return items.every((it) => {
    const text = String(it?.text ?? it?.detail ?? '').trim();
    const label = String(it?.label ?? '').trim();
    return !text && /^(Idea|Concept)$/i.test(label);
  });
};

/**
 * Canonicalize labeled_boxes params to items:[{label,text}].
 * Prefer real boxes/detail (or zipped boxes+labels) over empty placeholder items.
 */
export const coerceLabeledBoxesParams = (params = {}) => {
  const p = params && typeof params === 'object' ? { ...params } : {};
  let items = Array.isArray(p.items) ? [...p.items] : [];
  const hasBoxes = Array.isArray(p.boxes) && p.boxes.length > 0;
  const itemsAreDefaultShell =
    items.length > 0 &&
    items.every((it) => /^(Idea|Concept)$/i.test(String(it?.label ?? '').trim()));
  if (isPlaceholderLabeledItems(items) || (hasBoxes && itemsAreDefaultShell)) items = [];

  if (items.length === 0 && hasBoxes) {
    const labelsArr = Array.isArray(p.labels) ? p.labels : [];
    const boxesAreStrings = p.boxes.every((b) => typeof b === 'string');
    items = p.boxes.map((b, i) => {
      if (typeof b === 'string') {
        return { label: b, text: String(labelsArr[i] ?? '') };
      }
      return {
        label: String(b?.label ?? ''),
        text: String(b?.text ?? b?.detail ?? '')
      };
    });
    // When boxes were string labels zipped with labels[], drop labels so we don't re-map
    if (boxesAreStrings && labelsArr.length > 0) {
      delete p.labels;
    }
  }

  if (items.length === 0 && Array.isArray(p.labels) && p.labels.length > 0) {
    items = p.labels.map((l) => ({ label: String(l), text: '' }));
  }

  items = items.map((it) => ({
    label: String(it?.label ?? ''),
    text: String(it?.text ?? it?.detail ?? '')
  }));

  const { boxes: _boxes, ...rest } = p;
  return { ...rest, items };
};

/** Labeled boxes: title + items [{label, text}] or labels[] / boxes[] */
export const renderLabeledBoxes = (params = {}) => {
  const coerced = coerceLabeledBoxesParams(params);
  let items = Array.isArray(coerced.items) ? coerced.items : [];
  if (items.length === 0) {
    items = [
      { label: 'Concept', text: 'A' },
      { label: 'Example', text: 'B' }
    ];
  }
  items = items.slice(0, 6);
  params = coerced;
  const cols = items.length <= 3 ? items.length : Math.ceil(items.length / 2);
  const boxW = Math.min(180, (560 - (cols - 1) * 16) / cols);
  const boxH = 88;
  const title = params.title || params.label || 'Key ideas';
  const boxes = items.map((it, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const rowCount = Math.min(cols, items.length - row * cols);
    const rowW = rowCount * boxW + (rowCount - 1) * 16;
    const x0 = (640 - rowW) / 2;
    const x = x0 + col * (boxW + 16);
    const y = 70 + row * (boxH + 20);
    return `
      <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" fill="#ECFDF5" stroke="#0F766E" stroke-width="2" rx="10"/>
      <text x="${x + boxW / 2}" y="${y + 32}" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="14" font-weight="600" fill="#0F172A">${formatDiagramLabel(it.label || '')}</text>
      <text x="${x + boxW / 2}" y="${y + 58}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="12" fill="#334155">${formatDiagramLabel(it.text || '')}</text>
    `;
  });
  const rows = Math.ceil(items.length / cols);
  const h = 70 + rows * (boxH + 20) + 24;
  return svgWrap(
    `
    <text x="320" y="40" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(title)}</text>
    ${boxes.join('')}
  `,
    640,
    Math.max(280, h)
  );
};

/** Word-wrap plain text for SVG tspans (~charsPerLine for narrow process nodes). */
const wrapSvgWords = (raw = '', charsPerLine = 14) => {
  const words = String(raw || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return [''];
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= charsPerLine) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      // Hard-break oversized single tokens
      if (w.length > charsPerLine) {
        for (let i = 0; i < w.length; i += charsPerLine) {
          lines.push(w.slice(i, i + charsPerLine));
        }
        cur = '';
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines;
};

/** Process flow: steps string[] — wrap step text instead of truncating. */
export const renderProcessFlow = (params = {}) => {
  let steps = Array.isArray(params.steps) ? params.steps.map(String) : [];
  if (steps.length === 0 && typeof params.brief === 'string') {
    steps = params.brief.split(/→|->|,/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
  }
  if (steps.length === 0) steps = ['Step 1', 'Step 2', 'Step 3'];
  steps = steps.slice(0, 5);
  const n = steps.length;
  const boxW = Math.min(120, (560 - (n - 1) * 28) / n);
  const charsPerLine = Math.max(10, Math.floor(boxW / 7.5));
  const wrapped = steps.map((step) => wrapSvgWords(step, charsPerLine));
  const maxLines = Math.max(1, ...wrapped.map((lines) => lines.length));
  const boxH = 28 + maxLines * 14 + 12;
  const totalW = n * boxW + (n - 1) * 28;
  const x0 = (640 - totalW) / 2;
  const y = 100;
  const nodes = steps.map((step, i) => {
    const x = x0 + i * (boxW + 28);
    const cx = x + boxW / 2;
    const lines = wrapped[i];
    const arrowY = y + boxH / 2;
    const arrow =
      i < n - 1
        ? `<line x1="${x + boxW + 2}" y1="${arrowY}" x2="${x + boxW + 24}" y2="${arrowY}" stroke="#64748B" stroke-width="2"/>
           <polygon points="${x + boxW + 26},${arrowY} ${x + boxW + 16},${arrowY - 6} ${x + boxW + 16},${arrowY + 6}" fill="#64748B"/>`
        : '';
    const tspans = lines
      .map((line, li) => {
        const dy = li === 0 ? 0 : 14;
        return `<tspan x="${cx}" dy="${dy}">${formatDiagramLabel(line)}</tspan>`;
      })
      .join('');
    return `
      <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" fill="#EFF6FF" stroke="#2563EB" stroke-width="2" rx="8"/>
      <text x="${cx}" y="${y + 18}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="11" fill="#64748B">${i + 1}</text>
      <text x="${cx}" y="${y + 36}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="12" fill="#0F172A">${tspans}</text>
      ${arrow}
    `;
  });
  const title = params.title || params.label || 'Process';
  const svgH = Math.max(280, y + boxH + 40);
  return svgWrap(
    `
    <text x="320" y="48" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(title)}</text>
    ${nodes.join('')}
  `,
    640,
    svgH
  );
};

/** Comparison: left/right {title, items[]} or leftLabel/rightLabel */
export const renderComparison = (params = {}) => {
  const leftTitle = params.left?.title || params.leftLabel || 'A';
  const rightTitle = params.right?.title || params.rightLabel || 'B';
  let leftItems = (params.left?.items || params.leftItems || []).map(String).slice(0, 5);
  let rightItems = (params.right?.items || params.rightItems || []).map(String).slice(0, 5);
  if (leftItems.length === 0) leftItems = ['…'];
  if (rightItems.length === 0) rightItems = ['…'];

  const leftList = leftItems
    .map((t, i) => `<text x="170" y="${120 + i * 24}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="13" fill="#0F172A">${formatDiagramLabel(t)}</text>`)
    .join('');
  const rightList = rightItems
    .map((t, i) => `<text x="470" y="${120 + i * 24}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="13" fill="#0F172A">${formatDiagramLabel(t)}</text>`)
    .join('');

  const title = params.title || params.label || 'Compare';
  return svgWrap(`
    <text x="320" y="40" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(title)}</text>
    <rect x="40" y="64" width="260" height="180" fill="#ECFDF5" stroke="#0F766E" stroke-width="2" rx="12"/>
    <rect x="340" y="64" width="260" height="180" fill="#EFF6FF" stroke="#2563EB" stroke-width="2" rx="12"/>
    <text x="170" y="92" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="15" font-weight="600" fill="#0F766E">${formatDiagramLabel(leftTitle)}</text>
    <text x="470" y="92" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="15" font-weight="600" fill="#2563EB">${formatDiagramLabel(rightTitle)}</text>
    ${leftList}
    ${rightList}
  `);
};

const parseSlope = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v ?? '').trim();
  if (!s) return null;
  const frac = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (frac) {
    const d = Number(frac[2]);
    if (d === 0) return null;
    return Number(frac[1]) / d;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/**
 * Coordinate plane with y = mx + c lines (gradients / parallel / perpendicular).
 * params: xMin,xMax,yMin,yMax, title,
 *   lines: [{ m|slope, c|intercept, label, color? }]
 */
export const renderCoordinatePlane = (params = {}) => {
  const xMin = Number.isFinite(Number(params.xMin)) ? Number(params.xMin) : -5;
  const xMax = Number.isFinite(Number(params.xMax)) ? Number(params.xMax) : 5;
  const yMin = Number.isFinite(Number(params.yMin)) ? Number(params.yMin) : -5;
  const yMax = Number.isFinite(Number(params.yMax)) ? Number(params.yMax) : 5;
  const title = params.title || params.label || 'Coordinate plane';
  const colors = ['#0F766E', '#2563EB', '#C2410C', '#7C3AED'];

  let lines = Array.isArray(params.lines) ? params.lines : [];
  if (lines.length === 0 && (params.m != null || params.slope != null)) {
    lines = [
      {
        m: params.m ?? params.slope,
        c: params.c ?? params.intercept ?? 0,
        label: params.lineLabel || params.label || 'Line'
      }
    ];
  }
  if (lines.length === 0) {
    lines = [
      { m: 1, c: 0, label: 'y = x' },
      { m: -1, c: 0, label: 'y = -x' }
    ];
  }

  const padL = 56;
  const padR = 24;
  const padT = 52;
  const padB = 40;
  const w = 640;
  const h = 320;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const xSpan = Math.max(xMax - xMin, 1e-6);
  const ySpan = Math.max(yMax - yMin, 1e-6);
  const sx = (x) => padL + ((x - xMin) / xSpan) * plotW;
  const sy = (y) => padT + ((yMax - y) / ySpan) * plotH;

  const grid = [];
  const xStep = Number(params.xStep) > 0 ? Number(params.xStep) : 1;
  const yStep = Number(params.yStep) > 0 ? Number(params.yStep) : 1;
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 1e-9; x += xStep) {
    const px = sx(x);
    grid.push(
      `<line x1="${px}" y1="${padT}" x2="${px}" y2="${padT + plotH}" stroke="#E2E8F0" stroke-width="1"/>`
    );
    if (Math.abs(x) > 1e-9) {
      grid.push(
        `<text x="${px}" y="${padT + plotH + 18}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="11" fill="#64748B">${formatDiagramLabel(String(x))}</text>`
      );
    }
  }
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 1e-9; y += yStep) {
    const py = sy(y);
    grid.push(
      `<line x1="${padL}" y1="${py}" x2="${padL + plotW}" y2="${py}" stroke="#E2E8F0" stroke-width="1"/>`
    );
    if (Math.abs(y) > 1e-9) {
      grid.push(
        `<text x="${padL - 8}" y="${py + 4}" text-anchor="end" font-family="Manrope, Arial, sans-serif" font-size="11" fill="#64748B">${formatDiagramLabel(String(y))}</text>`
      );
    }
  }

  const axisX0 = xMin <= 0 && xMax >= 0 ? sx(0) : null;
  const axisY0 = yMin <= 0 && yMax >= 0 ? sy(0) : null;
  const axes = `
    <line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#334155" stroke-width="2"/>
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#334155" stroke-width="2"/>
    ${
      axisY0 != null
        ? `<line x1="${padL}" y1="${axisY0}" x2="${padL + plotW}" y2="${axisY0}" stroke="#0F172A" stroke-width="2"/>`
        : ''
    }
    ${
      axisX0 != null
        ? `<line x1="${axisX0}" y1="${padT}" x2="${axisX0}" y2="${padT + plotH}" stroke="#0F172A" stroke-width="2"/>`
        : ''
    }
    <text x="${padL + plotW - 4}" y="${axisY0 != null ? axisY0 - 8 : padT + 14}" text-anchor="end" font-family="Manrope, Arial, sans-serif" font-size="12" fill="#334155">x</text>
    <text x="${axisX0 != null ? axisX0 + 10 : padL + 10}" y="${padT + 14}" font-family="Manrope, Arial, sans-serif" font-size="12" fill="#334155">y</text>
  `;

  const lineSvg = lines.slice(0, 4).map((line, i) => {
    const m = parseSlope(line.m ?? line.slope);
    const c = parseSlope(line.c ?? line.intercept) ?? 0;
    if (m == null) return '';
    const yAt = (x) => m * x + c;
    // clip line to plot box
    const x1 = xMin;
    const x2 = xMax;
    let y1 = yAt(x1);
    let y2 = yAt(x2);
    const color = line.color || colors[i % colors.length];
    const label = line.label || `m=${line.m ?? m}`;
    const midX = (x1 + x2) / 2;
    const midY = yAt(midX);
    const labelY = Math.min(Math.max(midY, yMin + 0.3), yMax - 0.3);
    return `
      <line x1="${sx(x1)}" y1="${sy(y1)}" x2="${sx(x2)}" y2="${sy(y2)}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <text x="${sx(midX) + 6}" y="${sy(labelY) - 6}" font-family="Manrope, Arial, sans-serif" font-size="12" font-weight="600" fill="${color}">${formatDiagramLabel(String(label))}</text>
    `;
  });

  return svgWrap(
    `
    <text x="320" y="32" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(title)}</text>
    ${grid.join('')}
    ${axes}
    ${lineSvg.join('')}
  `,
    w,
    h
  );
};

/** Matrix grid: rows, cols, OR values: number[][] / flat values + rows/cols */
export const renderMatrix = (params = {}) => {
  let grid = [];
  if (Array.isArray(params.values) && Array.isArray(params.values[0])) {
    grid = params.values.map((row) => row.map((c) => String(c)));
  } else {
    const rows = Math.min(Math.max(Number(params.rows) || 2, 1), 5);
    const cols = Math.min(Math.max(Number(params.cols) || 2, 1), 5);
    const flat = Array.isArray(params.values) ? params.values.map(String) : [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push(flat[r * cols + c] ?? String((r + 1) * 10 + (c + 1)));
      }
      grid.push(row);
    }
  }
  const rows = grid.length;
  const cols = grid[0]?.length || 1;
  const title = params.title || params.label || 'Matrix';
  const cellW = Math.min(72, Math.floor(420 / cols));
  const cellH = 44;
  const startX = 320 - (cols * cellW) / 2;
  const startY = 90;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * cellW;
      const y = startY + r * cellH;
      cells.push(`
        <rect x="${x}" y="${y}" width="${cellW - 4}" height="${cellH - 4}" fill="#EEF2FF" stroke="#4338CA" stroke-width="2" rx="6"/>
        <text x="${x + (cellW - 4) / 2}" y="${y + cellH / 2 + 4}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="18" font-weight="700" fill="#0F172A">${formatDiagramLabel(grid[r][c])}</text>
      `);
    }
  }
  const bracketH = rows * cellH;
  return svgWrap(`
    <text x="320" y="40" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(title)}</text>
    <path d="M ${startX - 16} ${startY} L ${startX - 8} ${startY} L ${startX - 8} ${startY + bracketH - 4} L ${startX - 16} ${startY + bracketH - 4}" fill="none" stroke="#0F172A" stroke-width="3"/>
    <path d="M ${startX + cols * cellW + 4} ${startY} L ${startX + cols * cellW - 4} ${startY} L ${startX + cols * cellW - 4} ${startY + bracketH - 4} L ${startX + cols * cellW + 4} ${startY + bracketH - 4}" fill="none" stroke="#0F172A" stroke-width="3"/>
    ${cells.join('')}
  `);
};

/** Counting circles / counters for early years: count, columns?, label?, highlight? */
export const renderCountingCircles = (params = {}) => {
  const count = Math.min(Math.max(Number(params.count) || 5, 1), 40);
  const columns = Math.min(Math.max(Number(params.columns) || 5, 1), 10);
  const showTotal = params.showTotal === true;
  const showNumbers = params.showNumbers === true;
  const title = params.title || params.label || '';
  const highlight = params.highlight != null ? Number(params.highlight) : null;
  const color = params.color || '#14B8A6';
  const r = 16;
  const gap = 12;
  const startY = title ? 80 : 48;
  const circles = [];
  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const rowWidth = Math.min(columns, count - row * columns) * (r * 2 + gap) - gap;
    const startX = 320 - rowWidth / 2 + r;
    const cx = startX + col * (r * 2 + gap);
    const cy = startY + row * (r * 2 + gap);
    const isHi = highlight != null && i + 1 === highlight;
    circles.push(`
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${isHi ? '#F59E0B' : color}" stroke="#0F766E" stroke-width="2"/>
      ${showNumbers ? `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="12" font-weight="700" fill="#fff">${i + 1}</text>` : ''}
    `);
  }
  return svgWrap(`
    ${title ? `<text x="320" y="40" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(title)}</text>` : ''}
    ${circles.join('')}
    ${showTotal ? `<text x="320" y="260" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="16" fill="#334155">${formatDiagramLabel(`Total = ${count}`)}</text>` : ''}
  `);
};

/** N copies of a named object. Never print the count on quiz figures. */
export const renderObjectQuantity = (params = {}) => {
  const kind = isObjectKind(params.objectKind)
    ? params.objectKind
    : inferObjectKind(`${params.title || ''} ${params.label || ''} ${params.brief || ''}`, DEFAULT_OBJECT_KIND);
  const groups = Array.isArray(params.groups) && params.groups.length
    ? params.groups.map((n) => Math.min(20, Math.max(0, Number(n) || 0)))
    : [Math.min(20, Math.max(1, Number(params.count) || 1))];
  const size = 28;
  const gap = 8;
  const groupGap = 28;
  const icons = [];
  let x = 40;
  const y = 90;
  for (let g = 0; g < groups.length; g += 1) {
    for (let i = 0; i < groups[g]; i += 1) {
      icons.push(objectIconSvg(kind, { x, y, size }));
      x += size + gap;
    }
    x += groupGap;
  }
  const width = Math.max(640, x + 40);
  return svgWrap(
    `
    ${icons.join('')}
  `,
    width,
    220
  );
};

export const renderRectangle = (params = {}) => {
  const width = Number(params.width) || Number(params.length) || 8;
  const height = Number(params.height) || 5;
  const unit = params.unit || 'cm';
  const x = 120;
  const y = 70;
  const w = 400;
  const h = 160;
  return svgWrap(`
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ECFDF5" stroke="#0F766E" stroke-width="3"/>
    <text x="${x + w / 2}" y="${y + h + 28}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="16" fill="#0F172A">${formatDiagramLabel(`${width} ${unit}`)}</text>
    <text x="${x - 16}" y="${y + h / 2}" text-anchor="end" font-family="Manrope, Arial, sans-serif" font-size="16" fill="#0F172A">${formatDiagramLabel(`${height} ${unit}`)}</text>
  `);
};

export const renderCube = (params = {}) => {
  const side = Number(params.side) || Number(params.length) || 4;
  const width = Number(params.width) || side;
  const height = Number(params.height) || side;
  const depth = Number(params.depth) || side;
  const unit = params.unit || 'cm';
  const ox = 220;
  const oy = 200;
  const dx = 90;
  const dy = 50;
  const frontW = 180;
  const frontH = 140;
  const a = `${ox},${oy}`;
  const b = `${ox + frontW},${oy}`;
  const c = `${ox + frontW},${oy - frontH}`;
  const d = `${ox},${oy - frontH}`;
  const f = `${ox + frontW + dx},${oy - dy}`;
  const g = `${ox + frontW + dx},${oy - frontH - dy}`;
  const h = `${ox + dx},${oy - frontH - dy}`;
  return svgWrap(`
    <polygon points="${a} ${b} ${c} ${d}" fill="#CCFBF1" stroke="#0F766E" stroke-width="2.5"/>
    <polygon points="${c} ${b} ${f} ${g}" fill="#99F6E4" stroke="#0F766E" stroke-width="2.5"/>
    <polygon points="${d} ${c} ${g} ${h}" fill="#5EEAD4" stroke="#0F766E" stroke-width="2.5"/>
    <text x="${ox + frontW / 2}" y="${oy + 24}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="15" fill="#0F172A">${formatDiagramLabel(`${width} ${unit}`)}</text>
    <text x="${ox - 14}" y="${oy - frontH / 2}" text-anchor="end" font-family="Manrope, Arial, sans-serif" font-size="15" fill="#0F172A">${formatDiagramLabel(`${height} ${unit}`)}</text>
    <text x="${ox + frontW + dx / 2 + 28}" y="${oy - dy / 2 + 8}" text-anchor="start" font-family="Manrope, Arial, sans-serif" font-size="15" fill="#0F172A">${formatDiagramLabel(`${depth} ${unit}`)}</text>
  `);
};

/** Indices / powers: base, exponent, showExpansion? */
export const renderIndices = (params = {}) => {
  const base = params.base != null ? String(params.base) : '2';
  const exponent = params.exponent != null ? String(params.exponent) : '3';
  const title = params.title || params.label || 'Indices';
  const expNum = Number(exponent);
  let expansion = params.expansion || '';
  if (!expansion && Number.isFinite(expNum) && expNum >= 1 && expNum <= 8 && /^-?\d+(\.\d+)?$/.test(base)) {
    expansion = Array.from({ length: expNum }, () => base).join(' × ');
  }
  const result =
    params.result != null
      ? String(params.result)
      : Number.isFinite(Number(base)) && Number.isFinite(expNum)
        ? String(Number(base) ** expNum)
        : '';

  return svgWrap(`
    <text x="320" y="40" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(title)}</text>
    <rect x="120" y="70" width="400" height="90" rx="16" fill="#EEF2FF" stroke="#4338CA" stroke-width="2"/>
    <text x="320" y="128" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="42" font-weight="700" fill="#0F172A">${formatDiagramLabel(`${base}^${exponent}`)}</text>
    ${
      expansion
        ? `<text x="320" y="200" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="18" fill="#334155">${formatDiagramLabel(expansion)}</text>`
        : ''
    }
    ${
      result
        ? `<text x="320" y="240" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="20" font-weight="700" fill="#0F766E">${formatDiagramLabel(`= ${result}`)}</text>`
        : ''
    }
  `);
};

/** Right triangle for trigonometry: angleDeg (acute), side labels a,b,c optional */
export const renderRightTriangle = (params = {}) => {
  const angleDeg = Math.min(Math.max(Number(params.angleDeg) || 35, 15), 75);
  const title = params.title || params.label || 'Right triangle';
  const hyp = params.hypotenuse || params.c || 'hyp';
  const opp = params.opposite || params.a || 'opp';
  const adj = params.adjacent || params.b || 'adj';
  const showRight = params.showRightAngle !== false;

  const ax = 120;
  const ay = 230;
  const adjLen = 280;
  const oppLen = Math.tan((angleDeg * Math.PI) / 180) * adjLen;
  const bx = ax + adjLen;
  const by = ay;
  const cx = ax;
  const cy = ay - Math.min(oppLen, 160);

  return svgWrap(`
    <text x="320" y="36" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(title)}</text>
    <polygon points="${ax},${ay} ${bx},${by} ${cx},${cy}" fill="#ECFDF5" stroke="#0F766E" stroke-width="3"/>
    ${
      showRight
        ? `<path d="M ${ax + 18} ${ay} L ${ax + 18} ${ay - 18} L ${ax} ${ay - 18}" fill="none" stroke="#334155" stroke-width="2"/>`
        : ''
    }
    <text x="${(ax + bx) / 2}" y="${ay + 22}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="14" fill="#0F172A">${formatDiagramLabel(String(adj))}</text>
    <text x="${ax - 28}" y="${(ay + cy) / 2}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="14" fill="#0F172A">${formatDiagramLabel(String(opp))}</text>
    <text x="${(bx + cx) / 2 + 18}" y="${(by + cy) / 2}" text-anchor="start" font-family="Manrope, Arial, sans-serif" font-size="14" fill="#0F172A">${formatDiagramLabel(String(hyp))}</text>
    <text x="${bx - 8}" y="${by - 12}" text-anchor="end" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="600" fill="#C2410C">${formatDiagramLabel(`${angleDeg}°`)}</text>
  `);
};

/** Unit circle: angleDeg, show radii, label sin/cos optional */
export const renderUnitCircle = (params = {}) => {
  const angleDeg = Number.isFinite(Number(params.angleDeg)) ? Number(params.angleDeg) : 60;
  const title = params.title || params.label || 'Unit circle';
  const rad = (angleDeg * Math.PI) / 180;
  const cx = 320;
  const cy = 160;
  const R = 100;
  const px = cx + R * Math.cos(rad);
  const py = cy - R * Math.sin(rad);
  const showPoint = params.showPoint !== false;

  return svgWrap(
    `
    <text x="320" y="32" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${formatDiagramLabel(title)}</text>
    <line x1="${cx - R - 20}" y1="${cy}" x2="${cx + R + 20}" y2="${cy}" stroke="#94A3B8" stroke-width="2"/>
    <line x1="${cx}" y1="${cy + R + 20}" x2="${cx}" y2="${cy - R - 20}" stroke="#94A3B8" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="#EEF2FF" stroke="#4338CA" stroke-width="2.5"/>
    <line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="#0F766E" stroke-width="3"/>
    <path d="M ${cx + 28} ${cy} A 28 28 0 ${Math.abs(angleDeg) > 180 ? 1 : 0} ${angleDeg >= 0 ? 0 : 1} ${cx + 28 * Math.cos(rad)} ${cy - 28 * Math.sin(rad)}" fill="none" stroke="#C2410C" stroke-width="2"/>
    ${showPoint ? `<circle cx="${px}" cy="${py}" r="6" fill="#C2410C"/>` : ''}
    <text x="${cx + 36}" y="${cy - 8}" font-family="Manrope, Arial, sans-serif" font-size="13" fill="#C2410C">${formatDiagramLabel(`${angleDeg}°`)}</text>
    <text x="${px + 10}" y="${py - 8}" font-family="Manrope, Arial, sans-serif" font-size="12" fill="#0F172A">${formatDiagramLabel(params.pointLabel || '(cos, sin)')}</text>
  `,
    640,
    300
  );
};

export const DIAGRAM_TYPES = new Set([
  'number_line',
  'fraction_bars',
  'bar_model',
  'place_value',
  'labeled_boxes',
  'process_flow',
  'comparison',
  'coordinate_plane',
  'matrix',
  'counting_circles',
  'object_quantity',
  'rectangle',
  'cube',
  'indices',
  'right_triangle',
  'unit_circle'
]);

export const renderDiagram = (diagramType, params = {}) => {
  switch (diagramType) {
    case 'number_line':
      return renderNumberLine(params);
    case 'fraction_bars':
      return renderFractionBars(params);
    case 'bar_model':
      return renderBarModel(params);
    case 'place_value':
      return renderPlaceValue(params);
    case 'labeled_boxes':
      return renderLabeledBoxes(params);
    case 'process_flow':
      return renderProcessFlow(params);
    case 'comparison':
      return renderComparison(params);
    case 'coordinate_plane':
      return renderCoordinatePlane(params);
    case 'matrix':
      return renderMatrix(params);
    case 'counting_circles':
      return renderCountingCircles(params);
    case 'object_quantity':
      return renderObjectQuantity(params);
    case 'rectangle':
      return renderRectangle(params);
    case 'cube':
      return renderCube(params);
    case 'indices':
      return renderIndices(params);
    case 'right_triangle':
      return renderRightTriangle(params);
    case 'unit_circle':
      return renderUnitCircle(params);
    default:
      return renderLabeledBoxes({
        title: params.label || params.brief || 'Concept',
        labels: [params.skillFocus || 'Idea']
      });
  }
};
