/**
 * MCQ options may be a plain string or a visual reference.
 * Grading is always by index — only display changes.
 */
export const isVisualOption = (option) => {
  if (option == null || typeof option !== 'object' || Array.isArray(option)) return false;
  const diagramType = String(option.diagramType || option.type || '').trim();
  return diagramType.length > 0;
};

export const normalizeQuizOption = (option) => {
  if (option != null && typeof option === 'object' && !Array.isArray(option)) {
    const diagramType = String(option.diagramType || option.type || '').trim();
    if (diagramType) {
      const params =
        option.params && typeof option.params === 'object' && !Array.isArray(option.params)
          ? option.params
          : {};
      const text = option.text != null ? String(option.text) : undefined;
      return {
        diagramType,
        params,
        ...(text ? { text } : {})
      };
    }
    if (option.text != null) return String(option.text);
    if (option.label != null) return String(option.label);
    return '';
  }
  if (option == null) return '';
  return String(option);
};

export const optionDisplayText = (option) => {
  if (isVisualOption(option)) return String(option.text || '').trim();
  return String(option ?? '');
};

const DOT_RUN = /^[●•○◦]+$/u;

export const countFromDotRun = (raw) => {
  const s = String(raw || '').trim();
  if (!DOT_RUN.test(s)) return null;
  return [...s].length;
};

/** Turn "●●●●●" style options into object_quantity picture options. */
export const coerceDotRunOption = (option, objectKind = 'bead') => {
  if (isVisualOption(option)) return normalizeQuizOption(option);
  const count = countFromDotRun(option);
  if (count == null || count < 1) return normalizeQuizOption(option);
  return {
    diagramType: 'object_quantity',
    params: { objectKind, count }
  };
};
