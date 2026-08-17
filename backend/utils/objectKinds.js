/**
 * Named countable objects for Grade 1–3 CBC content.
 * Icons are simple SVG shapes — they must look like the object, never a text label.
 *
 * Part 0: labeled_boxes cannot render these params (it only understands items/boxes),
 * which is why object-count briefs used to show Idea/Concept rectangles.
 */
export const OBJECT_KINDS = Object.freeze([
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
  'star'
]);

const KEYWORDS = Object.freeze({
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
  star: /\bstars?\b/i
});

export const DEFAULT_OBJECT_KIND = 'bead';

export const isObjectKind = (value) => OBJECT_KINDS.includes(String(value || ''));

export const inferObjectKind = (text = '', fallback = null) => {
  const t = String(text || '');
  for (const kind of OBJECT_KINDS) {
    if (KEYWORDS[kind].test(t)) return kind;
  }
  return fallback;
};

/** True when the text names a real-world countable object from the library. */
export const namesCountableObject = (text = '') => inferObjectKind(text) != null;

/**
 * Tiny SVG inner markup (24×24 viewBox) for one icon. Used by backend diagram
 * templates; the frontend ObjectIcon component mirrors these shapes.
 */
export const objectIconInner = (kind) => {
  switch (kind) {
    case 'ball':
      return `<circle cx="12" cy="12" r="9" fill="#F97316" stroke="#9A3412" stroke-width="1.5"/>
        <ellipse cx="9" cy="9" rx="3" ry="2" fill="#FDBA74" opacity="0.8"/>`;
    case 'banana':
      return `<path d="M5 7 C8 4 16 5 20 10 C16 16 8 18 5 14 C7 12 8 10 5 7Z" fill="#FACC15" stroke="#A16207" stroke-width="1.4"/>
        <path d="M18.5 9.5 C16 12 12 14 8 14" fill="none" stroke="#CA8A04" stroke-width="0.8"/>`;
    case 'apple':
      return `<circle cx="12" cy="14" r="7.5" fill="#DC2626" stroke="#7F1D1D" stroke-width="1.4"/>
        <path d="M12 7 C13 5 15 4.5 16 6" fill="none" stroke="#166534" stroke-width="1.6"/>
        <ellipse cx="14.5" cy="6.5" rx="2.2" ry="1.1" fill="#22C55E"/>`;
    case 'mango':
      return `<ellipse cx="12" cy="13" rx="7" ry="8" fill="#F59E0B" stroke="#B45309" stroke-width="1.4"/>
        <path d="M12 5 C13 3.5 15 3 16 4.5" fill="none" stroke="#166534" stroke-width="1.5"/>`;
    case 'block':
      return `<rect x="5" y="7" width="14" height="12" rx="1.5" fill="#38BDF8" stroke="#0369A1" stroke-width="1.5"/>
        <path d="M5 10 H19" stroke="#0369A1" stroke-width="1"/>`;
    case 'counter':
      return `<ellipse cx="12" cy="13" rx="8" ry="7" fill="#A78BFA" stroke="#5B21B6" stroke-width="1.5"/>
        <ellipse cx="12" cy="11" rx="5" ry="2.2" fill="#DDD6FE"/>`;
    case 'spoon':
      return `<ellipse cx="9" cy="8" rx="4.5" ry="5.5" fill="#CBD5E1" stroke="#475569" stroke-width="1.3"/>
        <rect x="8" y="13" width="2.4" height="8" rx="1" fill="#94A3B8" stroke="#475569" stroke-width="0.8"/>`;
    case 'pencil':
      return `<rect x="10" y="3" width="4" height="14" fill="#FDE047" stroke="#A16207" stroke-width="1"/>
        <polygon points="10,17 14,17 12,21" fill="#FDBA74" stroke="#9A3412" stroke-width="0.8"/>
        <rect x="10" y="3" width="4" height="2.5" fill="#EF4444"/>`;
    case 'crayon':
      return `<rect x="9.5" y="4" width="5" height="13" rx="1" fill="#22C55E" stroke="#166534" stroke-width="1"/>
        <polygon points="9.5,17 14.5,17 12,21.5" fill="#86EFAC" stroke="#166534" stroke-width="0.8"/>`;
    case 'hen':
      return `<ellipse cx="12" cy="14" rx="7" ry="5.5" fill="#F8FAFC" stroke="#334155" stroke-width="1.3"/>
        <circle cx="17" cy="10" r="3.2" fill="#F8FAFC" stroke="#334155" stroke-width="1.2"/>
        <polygon points="19.5,9 23,10.5 19.5,12" fill="#F97316"/>
        <path d="M15 6 L16 3 L17.5 6" fill="#DC2626"/>`;
    case 'shell':
      return `<path d="M12 20 C6 16 5 10 8 6 C12 3 16 6 18 10 C20 14 17 18 12 20Z" fill="#FDE68A" stroke="#B45309" stroke-width="1.3"/>
        <path d="M12 18 C10 14 11 10 13 8" fill="none" stroke="#D97706" stroke-width="1"/>`;
    case 'star':
      return `<polygon points="12,3 14.4,8.8 20.8,9.2 16,13.5 17.6,19.8 12,16.6 6.4,19.8 8,13.5 3.2,9.2 9.6,8.8" fill="#FBBF24" stroke="#B45309" stroke-width="1.2"/>`;
    case 'bead':
    default:
      return `<circle cx="12" cy="12" r="9" fill="#14B8A6" stroke="#0F766E" stroke-width="1.8"/>
        <ellipse cx="9" cy="9" rx="3" ry="2" fill="#5EEAD4" opacity="0.85"/>`;
  }
};

export const objectIconSvg = (kind, { x = 0, y = 0, size = 24 } = {}) =>
  `<g transform="translate(${x} ${y}) scale(${size / 24})">${objectIconInner(kind)}</g>`;
