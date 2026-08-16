/**
 * Diff two measure-quiz-complexity.js runs and print the before/after table:
 * stem complexity per Bloom band, diagram and placeholder ratios, QA flags,
 * admin rationale coverage, learner-facing field lengths, and token cost.
 *
 * Usage: node scripts/compare-quiz-measurements.js
 */
import { readFileSync } from 'node:fs';

const load = (label) =>
  JSON.parse(
    readFileSync(new URL(`../../docs/measurements/${label}.json`, import.meta.url), 'utf8')
  ).report;

const pairs = [
  ['baseline-g1-addition', 'after-g1-addition'],
  ['baseline-g7-fractions', 'after-g7-fractions']
];

const row = (name, a, b, unit = '') => {
  const delta = typeof a === 'number' && typeof b === 'number' ? (b - a).toFixed(2) : '';
  console.log(
    `  ${name.padEnd(36)} ${String(a).padStart(9)}${unit} -> ${String(b).padStart(9)}${unit}  (${delta >= 0 ? '+' : ''}${delta})`
  );
};

for (const [beforeLabel, afterLabel] of pairs) {
  const before = load(beforeLabel);
  const after = load(afterLabel);
  console.log(`\n======== ${beforeLabel}  ->  ${afterLabel} ========`);
  console.log(` grade ${before.grade} | "${before.lessonTitle}" -> "${after.lessonTitle}"`);

  console.log('\n OVERALL STEM COMPLEXITY');
  for (const k of ['avgWords', 'maxWords', 'avgSentences', 'maxSentences', 'stemsOver12Words', 'stemsOver20Words', 'stemsOver2Sentences']) {
    row(k, before.overall[k], after.overall[k]);
  }

  console.log('\n REASONING BAND ONLY');
  const rb = before.byBloom.reason;
  const ra = after.byBloom.reason;
  for (const k of ['n', 'avgWords', 'maxWords', 'avgSentences', 'maxSentences', 'stemsWithSubordinator', 'stemsOver12Words', 'stemsOver20Words', 'stemsOver2Sentences']) {
    row(k, rb[k], ra[k]);
  }

  console.log('\n DIAGRAMS');
  row('visual questions', before.visualQuestions, after.visualQuestions);
  row('question briefs', before.questionBriefs, after.questionBriefs);
  row('placeholder briefs', before.placeholderBriefs, after.placeholderBriefs);
  row('placeholder ratio', before.placeholderRatio, after.placeholderRatio);
  row('visual share of bank %',
    Number(((before.visualQuestions / before.questionCount) * 100).toFixed(1)),
    Number(((after.visualQuestions / after.questionCount) * 100).toFixed(1)));

  console.log('\n QA');
  row('qa flagged', before.qaFlagged, after.qaFlagged);

  console.log('\n ADMIN RATIONALE (new)');
  row('options total', before.optionsTotal, after.optionsTotal);
  row('rationales present', before.rationalesPresent, after.rationalesPresent);
  row('rationale avg words', before.rationaleAvgWords, after.rationaleAvgWords);

  console.log('\n LEARNER-FACING FIELDS (must not grow)');
  const lb = before.learnerFacingLengths || {};
  const la = after.learnerFacingLengths || {};
  row('explanation avg words', lb.explanationAvgWords ?? 'n/a', la.explanationAvgWords ?? 'n/a');
  row('explanation max words (cap 16)', lb.explanationMaxWords ?? 'n/a', la.explanationMaxWords ?? 'n/a');
  row('misconception max words (cap 8)', lb.misconceptionMaxWords ?? 'n/a', la.misconceptionMaxWords ?? 'n/a');

  console.log('\n TOKENS / COST');
  row('input tokens', before.tokens.inputTokens, after.tokens.inputTokens);
  row('output tokens', before.tokens.outputTokens, after.tokens.outputTokens);
  row('total tokens',
    before.tokens.inputTokens + before.tokens.outputTokens,
    after.tokens.inputTokens + after.tokens.outputTokens);
  row('estimated USD', before.tokens.estimatedUsd, after.tokens.estimatedUsd);
  const pct = (
    ((after.tokens.estimatedUsd - before.tokens.estimatedUsd) / before.tokens.estimatedUsd) *
    100
  ).toFixed(1);
  console.log(`  cost change: ${pct}%`);

  console.log('\n PER-CALL OUTPUT TOKENS');
  for (let i = 0; i < after.tokens.byLabel.length; i++) {
    const b = before.tokens.byLabel[i];
    const a = after.tokens.byLabel[i];
    if (!a) continue;
    console.log(
      `  ${(a.label || '').padEnd(28)} ${String(b?.outputTokens ?? '-').padStart(7)} -> ${String(a.outputTokens).padStart(7)} / cap ${a.maxTokens}${a.reachedTokenLimit ? '  *** HIT CAP ***' : ''}`
    );
  }
}
