# Tier 2 Phase 1 verification

Date: 2026-08-10

## Scope and gate

Implemented only the authorized vertical slice:

- Grade 1 Mathematics → Numbers → Addition
- `tap-select` interaction
- formula-backed Addition templates and pure-code twists
- twin-consistency detection, deferred re-serving, comparison, and logging

No remediation routing, mastery changes from twin results, prerequisite graph,
additional diagnostic primitives, additional interaction types, or live diagram
architecture were added.

## Curriculum seed

The idempotent seed and verify pass matched the supplied source:

```json
{
  "curriculumDesigns": 3,
  "subjects": 3,
  "strands": 9,
  "subStrands": 39,
  "learningOutcomes": 148,
  "keyInquiryQuestions": 55,
  "grade1NumbersAddition": {
    "curriculumDesignId": "232b3fea-1cb2-4731-84f2-bb603e0a0b2a",
    "subjectId": "235311d3-d8b1-42cc-9c3d-ee503ffadca9",
    "strandId": "b3bf41ce-2c76-4eb9-9ef5-32c28d7912ab",
    "subStrandId": "6566c510-80af-4ff9-a159-cd23a6ca70dc",
    "learningOutcomeCount": 7,
    "keyInquiryQuestionCount": 1
  }
}
```

The source JSON retains `lessonsAllocated`; the current database schema has no
matching column, so the seed intentionally does not discard or invent a mapping.

## Real Addition generation

Generated lesson `fa11d688-5978-436c-b558-d2ff283917d7`,
“Adding a 2-Digit Number and a 1-Digit Number”.

- Status: pending (the verification did not bypass admin review)
- Question bank: 30/30
- Valid stored Addition templates: 13
- Coverage: the selected curriculum outcome was genuinely covered
- QA flags: 0
- Quiz outputs: foundation 9,142; application 8,827; reasoning 16,131 tokens
- All three quiz chunks stopped normally and returned 10 questions

The new template fields increased real output size. Because the reasoning chunk
used 16,131 of the former 16,384-token ceiling, the future quiz-chunk ceiling was
raised to 20,000 for meaningful headroom. Token billing remains based on actual
output, not the ceiling.

Malformed AI-authored templates are handled at the boundary:

- rendered numeric stems are parameterized from their supplied `params`
- invalid distractor formula sets are replaced with conservative formulas
- the resulting template is accepted only after full-domain validation
- an unrecoverable template is stored as a normal non-template question

## Twist validation

`verify-addition-twist.js` generated 500 variants from a sum-to-10 template.

- 500/500 valid
- 44 distinct twisted pairs across a 45-pair domain (the original is excluded)
- correct answer always matched `a + b`
- no negative or duplicate distractors
- no twist reused the original pair
- invalid AI distractor formulas were detected and repaired

Runtime generation tries candidate pairs without replacement. If one pair cannot
produce valid distinct distractors, it skips that pair and tries another. It
returns a controlled failure only after exhausting the finite valid domain; it
never silently emits a broken question.

## Twin-consistency session

Real generated-content session:

```json
{
  "pairId": "e08c6542-2ef0-48ff-9341-d8ad9ff27cd2",
  "triggerReason": "incorrect",
  "original": {
    "question": "Grace has 26 books. Her teacher gives her 3 more books. What is the total number of books?",
    "params": { "a": 26, "b": 3 },
    "correct": false,
    "responseTimeMs": 4200
  },
  "twist": {
    "question": "Grace has 71 books. Her teacher gives her 8 more books. What is the total number of books?",
    "params": { "a": 71, "b": 8 },
    "options": ["79", "78", "80", "81"],
    "correctAnswer": "79",
    "correct": true,
    "responseTimeMs": 3300
  },
  "interveningMainQuestions": 2
}
```

The completed session scored 11/12 first tries (92%) plus one retry. Twin and
retry answers did not alter the first-try denominator. Twin results do not update
skill mastery.

The placeholder fast-answer rule is:

- cold start: under 1,200 ms
- after two baseline samples: under 35% of the running mean
- baseline scope: main-path Grade 1 Addition template questions only
- excluded: non-template items, twins, and retries

This is explicitly a temporary heuristic to tune from real age-peer data.

## Persistence

The session review stores each pair's IDs, trigger, original/twist params,
correctness, and response times. `migration_twin_consistency.sql` adds queryable
columns to `skill_attempts`; twin rows are diagnostic only and are excluded from
mastery/modality calculations.

The migration was not applied to the live Supabase database during this run:
the project has no `exec_sql` RPC, and Supabase MCP authentication was not
authorized. Until the migration is run, completed session reviews retain the
pair summary and the compatibility path avoids breaking existing quizzes, but
dedicated twin `skill_attempts` rows are not available.

## Verification commands

- `node scripts/seed-grade1-3-mathematics-curriculum.js`
- `node scripts/seed-grade1-3-mathematics-curriculum.js --verify-only`
- `node scripts/verify-addition-twist.js`
- `node scripts/verify-twin-consistency.js`
- `node scripts/verify-addition-phase1-e2e.js fa11d688-5978-436c-b558-d2ff283917d7`
- `node scripts/verify-quiz-quality.js`
- `npx vite build`

All offline/service checks and the frontend production bundle passed. The Vite
build still reports pre-existing duplicate-`className` warnings in
`src/pages/learner/Lessons.tsx`.
