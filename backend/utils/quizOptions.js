/**
 * MCQ options may be a plain string or a visual reference.
 * Grading is always by index — only display changes.
 */
export const isVisualOption = (option) =>
  option != null &&
  typeof option === 'object' &&
  !Array.isArray(option) &&
  typeof option.diagramType === 'string' &&
  option.diagramType.trim().length > 0;

export const normalizeQuizOption = (option) => {
  if (isVisualOption(option)) {
    const params =
      option.params && typeof option.params === 'object' && !Array.isArray(option.params)
        ? option.params
        : {};
    const text = option.text != null ? String(option.text) : undefined;
    return {
      diagramType: String(option.diagramType).trim(),
      params,
      ...(text ? { text } : {})
    };
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
