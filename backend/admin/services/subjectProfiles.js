/**
 * Subject-category profiles — each category teaches with a different analogy:
 * - mathematics: worked examples + step-by-step working
 * - languages:   passage/dialogue + vocabulary + correct usage
 * - sciences:    facts, experiments/observation, real-life cause → effect
 * - humanities:  stories, people, values, decisions (incl. religious education)
 * - practical:   learn by doing — activity steps and techniques
 *
 * Each profile controls: teaching style block (shell prompt), quiz style block
 * (quiz prompt), math notation rule, allowed diagram types + guidance, and the
 * default modality cycle for quiz questions.
 */

const MATH_DIAGRAMS = [
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
];

const FLOW_DIAGRAMS = ['labeled_boxes', 'process_flow', 'comparison'];

const PROFILES = [
  {
    key: 'mathematics',
    matchers: [/math/i],
    mathRule:
      'Use $math$ KaTeX for all maths (e.g. $x^{2}$, $\\frac{3}{4}$, $5\\div 2$).',
    teachingStyle: `TEACHING STYLE (Mathematics — worked examples, NOT stories):
- Mini notes plus 2 short worked examples with step-by-step working.
- Every number used in a diagram must appear in the teaching text.
- End with one quick practice prompt (not graded).`,
    quizStyle: `QUIZ STYLE (Mathematics): at least 7 of the questions are calculations; explanations show the key working step. Include 2+ real-life word problems (money, time, measurement).`,
    modalityCycle: ['visual', 'text_steps', 'practice', 'practice', 'visual', 'text_steps', 'practice', 'visual', 'text_steps', 'practice'],
    modalityMixText: '~1/3 visual, ~1/3 text_steps (with steps[] max 3), ~1/3 practice.',
    allowedDiagramTypes: MATH_DIAGRAMS,
    diagramGuidance: `- gradients/slopes/parallel/perpendicular → coordinate_plane (lines:[{m,c,label}])
- matrices → matrix (values:[[...],[...]])
- indices/exponents/powers → indices (base, exponent)
- trigonometry / SOHCAHTOA → right_triangle (angleDeg, opposite, adjacent, hypotenuse)
- unit circle / special angles → unit_circle (angleDeg)
- early counting / how many named objects → object_quantity (objectKind, count or groups:[a,b])
- abstract counters with no named object → counting_circles (count, columns; do not print Total)
- cubes / cuboids with dimensions → cube (side or length,width,height)
- rectangles / squares with dimensions → rectangle (width, height)
- fractions → fraction_bars; place value → place_value; number line → number_line`,
    fallbackDiagramType: 'labeled_boxes'
  },
  {
    key: 'languages',
    matchers: [/english|kiswahili|swahili|french|german|arabic|mandarin|language|literacy|lugha/i],
    mathRule: 'Do NOT use KaTeX or $...$ notation. Plain readable text only.',
    teachingStyle: `TEACHING STYLE (Languages — passage, vocabulary, usage):
- Start with a short passage OR dialogue (4–8 lines) that uses the target words/structures naturally.
- Then list 5–8 vocabulary words/phrases with simple meanings.
- Finish with 2 usage tips (the correct way to say or write it).`,
    quizStyle: `QUIZ STYLE (Languages): mostly cloze/fill-the-gap ("Choose the word that completes the sentence"), comprehension questions about the passage, and "which sentence is correct" phrasing questions. NO calculations.`,
    modalityCycle: ['practice', 'practice', 'text_steps', 'practice', 'visual', 'practice', 'text_steps', 'practice', 'practice', 'visual'],
    modalityMixText: 'mostly practice (cloze and comprehension), some text_steps; at most 2 visual questions where a vocabulary table or comparison helps.',
    allowedDiagramTypes: FLOW_DIAGRAMS,
    diagramGuidance: `- vocabulary words and meanings → labeled_boxes (items:[{label,text}])
- correct vs incorrect usage → comparison (leftLabel/rightLabel + leftItems/rightItems)
- steps to build a sentence or greeting exchange → process_flow (steps:[string])`,
    fallbackDiagramType: 'labeled_boxes'
  },
  {
    key: 'practical',
    // Checked before sciences so "Home Science" lands here
    matchers: [/home science|art|music|physical|p\.?h\.?e|sport|agricult|pre.?tech|craft|creative|drama/i],
    mathRule: 'Do NOT use KaTeX. Plain text; simple numbers are fine.',
    teachingStyle: `TEACHING STYLE (Practical/creative — learn by doing):
- Teach as an activity: what to do, how to do it step by step, and what a good result looks like.
- Include one common mistake and how to avoid it.
- Mention 1 real Kenyan or global figure in this field where natural.`,
    quizStyle: `QUIZ STYLE (Practical): order-the-steps, choose-the-right-tool/technique, and what-went-wrong questions; a few recall questions on key terms and notable figures.`,
    modalityCycle: ['text_steps', 'practice', 'visual', 'practice', 'text_steps', 'practice', 'visual', 'practice', 'text_steps', 'practice'],
    modalityMixText: '~1/3 text_steps (activity steps), ~1/4 visual, the rest practice.',
    allowedDiagramTypes: FLOW_DIAGRAMS,
    diagramGuidance: `- activity/technique steps → process_flow (steps:[string])
- tools, materials or parts → labeled_boxes (items:[{label,text}])
- good vs poor technique → comparison (leftLabel/rightLabel + leftItems/rightItems)`,
    fallbackDiagramType: 'process_flow'
  },
  {
    key: 'sciences',
    matchers: [/science|biology|chemistry|physics|environment|health|technology/i],
    mathRule: 'Use $math$ KaTeX only for real quantities/units when needed; otherwise plain text.',
    teachingStyle: `TEACHING STYLE (Sciences — facts, experiments, real life):
- Teach through a real-life situation (home, school, weather, the body, a farm).
- State the fact, then explain WHY it happens (cause → effect).
- Include one simple experiment or observation the learner can safely do to see it.`,
    quizStyle: `QUIZ STYLE (Sciences): "why does X happen", "what happens if...", predict-the-outcome, and identify-the-step questions. Ground every question in a real-life situation or a simple experiment.`,
    modalityCycle: ['visual', 'practice', 'text_steps', 'practice', 'visual', 'practice', 'text_steps', 'practice', 'visual', 'practice'],
    modalityMixText: '~1/3 visual (process or parts diagrams), ~1/4 text_steps, the rest practice.',
    allowedDiagramTypes: ['process_flow', 'labeled_boxes', 'comparison', 'bar_model'],
    diagramGuidance: `- cycles and processes (water cycle, digestion, circuits) → process_flow (steps:[string])
- parts and their functions → labeled_boxes (items:[{label,text}])
- compare two things (solid vs liquid, healthy vs unhealthy) → comparison (leftLabel/rightLabel + leftItems/rightItems)
- simple measured amounts → bar_model`,
    fallbackDiagramType: 'process_flow'
  },
  {
    key: 'humanities',
    matchers: [/social|cre|ire|hre|religio|christian|islamic|hindu|history|geograph|citizen|business/i],
    mathRule: 'Do NOT use KaTeX. Plain text only.',
    teachingStyle: `TEACHING STYLE (Humanities — REAL stories and people):
- Teach through a SHORT story grounded in reality, never invented "facts".
- Social Studies / History / Geography / Citizenship: use a REAL, well-known event, place or named figure (Kenyan or African where possible, e.g. Wangari Maathai, Mekatilili wa Menza, the building of the Kenya-Uganda railway). Only include facts you are sure of.
- CRE: retell an ACTUAL Bible story and cite the reference (e.g. The Good Samaritan, Luke 10:25-37). IRE: an actual Quran/Hadith account with its reference. Never invent scripture or verses.
- Everyday-scenario stories (a learner facing a choice at school/home) are allowed ONLY for values/decision topics — clearly fictional, no fake historical claims.
- Draw out the lesson: the people involved, their roles, the values shown, and the consequences.`,
    quizStyle: `QUIZ STYLE (Humanities): questions about the real story's people, decisions, values and consequences; "what should X do next" best-choice reasoning; some recall of key facts, places, dates and roles. All facts, names and scripture references must be REAL and accurate — never invented.`,
    modalityCycle: ['practice', 'practice', 'text_steps', 'practice', 'visual', 'practice', 'practice', 'text_steps', 'practice', 'visual'],
    modalityMixText: 'mostly practice (story and values reasoning), some text_steps; at most 2 visual questions.',
    allowedDiagramTypes: FLOW_DIAGRAMS,
    diagramGuidance: `- then vs now, right vs wrong choice → comparison (leftLabel/rightLabel + leftItems/rightItems)
- sequence of events in the story or in history → process_flow (steps:[string])
- roles and responsibilities → labeled_boxes (items:[{label,text}])`,
    fallbackDiagramType: 'comparison'
  }
];

const GENERAL_PROFILE = {
  key: 'general',
  mathRule: 'Use plain text; $math$ KaTeX only if the topic truly needs maths notation.',
  teachingStyle: `TEACHING STYLE (General):
- Explain the idea simply, give one concrete example, then one real-life application.`,
  quizStyle: `QUIZ STYLE (General): balanced recall, apply and reasoning questions grounded in everyday situations.`,
  modalityCycle: ['practice', 'visual', 'text_steps', 'practice', 'practice', 'visual', 'text_steps', 'practice', 'practice', 'visual'],
  modalityMixText: 'balanced mix of practice, text_steps and visual.',
  allowedDiagramTypes: FLOW_DIAGRAMS,
  diagramGuidance: `- key ideas → labeled_boxes (items:[{label,text}]); steps → process_flow (steps:[string]); contrasts → comparison (leftLabel/rightLabel + leftItems/rightItems)`,
  fallbackDiagramType: 'labeled_boxes'
};

/** Resolve the profile for a subject name (order matters: practical before sciences). */
export const getSubjectProfile = (subjectName = '') => {
  const name = String(subjectName || '');
  for (const profile of PROFILES) {
    if (profile.matchers.some((re) => re.test(name))) return profile;
  }
  return GENERAL_PROFILE;
};
