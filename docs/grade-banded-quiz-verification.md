# Grade-banded quiz generation + admin review rationale — verification

**Date:** 2026-08-11
**Follows:** `docs/quiz-generation-full-audit.md` (baseline findings)
**Method:** Four real generations against the live Claude API (`claude-sonnet-5`) and the live
Supabase curriculum. Two before the change, two after. No lesson was saved to the database —
`generateLessonsFromSubStrand` returns in memory and the harness dumps to `docs/measurements/`.

Reproduce with:

```bash
node scripts/measure-quiz-complexity.js <subStrandId> <label>   # one real generation + metrics
node scripts/compare-quiz-measurements.js                        # before/after table
node scripts/verify-grade-complexity-qa.js                       # live QA ceiling check
node scripts/print-quiz-prompt.js 1 Mathematics Addition reasoning
```

Sub-strands used, both Mathematics so the subject profile is held constant:

| Grade | Sub-strand | id |
|---|---|---|
| 1 | Numbers · Addition (the seeded Addition sub-strand, template engine active) | `6566c510-80af-4ff9-a159-cd23a6ca70dc` |
| 7 | 1.0 NUMBERS · 1.3 Fractions | `82716c61-609e-4547-b847-da2fe7a60866` |

---

## 0. Scope caveat, stated first

Two refinements were made **after** the four measured runs, in response to defects those runs
exposed (§3 and §6). The Anthropic account ran out of credits before a confirming run could be
made, so **these two changes are reasoned but not yet measured**:

1. The "stem must still ask something / stay grammatical" rules added to both constrained bands.
2. The token budget raise (`quizChunk` 20,000 → 28,000, `coverageGap` 2,200 → 4,000,
   `quizQa` 3,000 → 4,000).

Every number below comes from the four runs that predate those two edits. Re-run
`measure-quiz-complexity.js` once credits are available to confirm them.

Also: this is **one generation per condition**. A single sample cannot separate the effect of the
change from run-to-run model variance. The Grade 1 shifts are far too large to be variance; the
Grade 7 shifts in §2 are not, and are reported as observations rather than conclusions.

---

## 1. Grade 1 stem complexity — the headline result

Reasoning band only, 10 questions in each run:

| Metric | Before | After | Change |
|---|---|---|---|
| Average words per stem | 16.0 | **6.5** | −59% |
| Longest stem | 24 words | **9 words** | −15 |
| Average sentences | 2.0 | **1.0** | −1.0 |
| Longest stem in sentences | 3 | **1** | −2 |
| Stems over 12 words (the Grade 1 ceiling) | 8 of 10 | **0 of 10** | −8 |
| Stems over 2 sentences | 4 of 10 | **0 of 10** | −4 |

Whole bank, 30 questions:

| Metric | Before | After |
|---|---|---|
| Average words per stem | 13.43 | 5.83 |
| Longest stem | 24 words | 10 words |
| Stems over 12 words | 16 of 30 | 0 of 30 |
| Stems over 2 sentences | 11 of 30 | 0 of 30 |

The audit's worry case was the multi-clause comparative scenario, e.g. the Grade 3 stem
*"Look at the two bean plants below. Plant A has wide, healthy green leaves. Plant B has small,
yellow, curled leaves. Which plant will most likely make more food and grow faster?"* (33 words,
4 sentences). Nothing of that shape survives. Real Grade 1 reasoning stems after the change:

> What is $63+4$?
> How many toys in all for $31+6$?
> Which digit changes in $41+3$?
> In $72+6$, what is new ones digit?

Before, from the same sub-strand and the same band:

> Wanjiku saved $41$ shillings for a toy. Her uncle gave her $6$ more shillings as a gift. How many shillings does she have now? *(24 words, 3 sentences)*
> Neema had $64$ mangoes. She picked $3$ more from the tree. Which number sentence correctly shows her total mangoes? *(19 words, 3 sentences)*

The reasoning band kept its Bloom character — "which digit changes", "what is the new ones digit"
are still reasoning about place value, not recall — while losing the narrative padding. That is
the intended outcome: difficulty from the idea, not from the sentence.

---

## 2. Grade 7 got *longer*, not shorter — an unintended observation

Grade 7 sits in the unconstrained `pre_teen` band and by design received no ceiling, only a
one-line reading-level note. Behaviour there should have been roughly unchanged. It was not:

| Metric (reasoning band) | Before | After |
|---|---|---|
| Average words per stem | 22.1 | 26.4 |
| Stems over 20 words | 7 of 10 | 10 of 10 |
| Stems with a subordinate/comparative marker | 4 of 10 | **0 of 10** |

So stems got longer but structurally *simpler* — the subordinate clauses disappeared entirely
while word count rose, which reads as more concrete real-world setup rather than more convolution.
The likely drivers are the new modality-mix line and the visual-fit rule changing the question mix,
plus ordinary run variance. **I cannot attribute this from one sample per condition.** If Grade 7
verbosity matters, the cheap fix is to give the `pre_teen` band a soft ceiling too; that was
explicitly out of scope here ("no new restriction needed"), so I did not add one.

---

## 3. Over-compression defect found at Grade 1, and fixed (unmeasured)

The ceiling worked on the metric but pushed the model into dropping the interrogative on 4 of 30
Grade 1 stems:

> A girl has 61 shillings, finds 7 more.
> A pole is 82 cm, grows 6 more cm.
> A show lasts 45 minutes, adds 3 more.
> A farmer has 43 hens, gets 4 more.

These are comma splices that state a situation and never ask anything. For contrast, the baseline
had 7 of 30 stems without a question mark, but those were well-formed imperatives
("Calculate $51 + 7$.", "Find the sum of $84 + 3$."), which are fine. So the raw count barely moved
(7 → 6) but the *kind* of stem got worse.

Fixed by adding two rules to both constrained bands — the stem must still ask something and must
stay grammatical, with that exact bad example quoted in the prompt — plus a sixth QA check that
flags a stem "does not ask a question" when it has been compressed to a bare statement. **Not yet
confirmed by a run** (see §0).

---

## 4. QA pass now does real work

| | Before | After |
|---|---|---|
| Grade 1 questions flagged | 0 of 30 | **5 of 30** |
| Grade 7 questions flagged | 0 of 30 | 0 of 30 |

All five Grade 1 flags read `too complex for grade: 2 sentences` — the QA pass catching the
residual stems that exceeded the one-sentence ceiling. Previously it could not have caught these:
it was never told the grade, and was told only not to flag questions for being *too simple*.

### The grade-sensitivity test

`scripts/verify-grade-complexity-qa.js` sends the same stems to the live QA model at two grades:

```
--- grade-1-ceiling (Grade 1) ---
  overcomplex: FLAGGED — too complex for grade: 52 words, 1 sentence, multi-part scenario
                          with temporal clauses ('while', 'after', 'since')
  moderate:    FLAGGED — too complex for grade: 23 words, 2 sentences, multi-step
                          multiplication and subtraction with large numbers
  compliant:   passed

--- grade-9-control (Grade 9) ---
  moderate:    passed
```

The `moderate` stem — *"A trader buys 3 sacks of maize at 2,400 shillings each. After selling all
of them for 8,700 shillings, what is her profit?"* — is **the same string in both runs**. Flagged at
Grade 1, passes at Grade 9. That is the check being genuinely grade-sensitive rather than merely
length-averse, which a single-grade test could not have shown.

One earlier control was discarded as badly designed: a 52-word stem wrapped around a trivial
`14 + 3` is legitimately bad at *any* grade, so its flagging at Grade 9 proved nothing.

---

## 5. Diagrams: placeholders eliminated, visuals not collapsed

The audit's baseline was ~23% visual with ~70% of those being `Figure for:` placeholders.
Measured here:

| | G1 before | G1 after | G7 before | G7 after |
|---|---|---|---|---|
| Visual questions | 9 of 30 (30%) | 8 of 30 (26.7%) | 6 of 30 (20%) | **9 of 30 (30%)** |
| Question diagram briefs | 9 | 8 | 6 | 9 |
| Placeholder briefs | 6 (66.7%) | **0** | 3 (50%) | **0** |

Both concerns in the task are answered:

- The placeholder ratio went to **zero** in both runs. Every remaining brief is model-authored
  and specific. In the Grade 1 run exactly one question was tagged visual with no diagram data and
  was downgraded `visual → practice` rather than shipping a placeholder
  (`Question q-30: tagged visual with no diagram brief — downgraded to practice`).
- Relaxing the per-outcome quota did **not** collapse visuals. Grade 1 held roughly steady
  (30% → 26.7%) and Grade 7 went *up* (20% → 30%). Content-fit guidance produced more genuine
  visuals than the forced minimum did, not fewer.

---

## 6. Token and cost impact — a real increase, not a rounding error

Full generation of one 30-question lesson, measured from the provider's own usage counters:

| | Grade 1 before | Grade 1 after | Grade 7 before | Grade 7 after |
|---|---|---|---|---|
| Input tokens | 9,971 | 13,367 | 11,213 | 14,727 |
| Output tokens | 36,516 | 47,588 | 32,630 | 54,564 |
| **Total tokens** | 46,487 | **60,955** | 43,843 | **69,291** |
| Cost @ $3/$15 per M | $0.5777 | **$0.7539** | $0.5231 | **$0.8626** |
| **Change** | | **+30.5%** | | **+64.9%** |

So roughly **+$0.18 to +$0.34 per lesson, averaging about +48%**. At 30 questions × 3-4 options ×
~15-20 words of rationale that is 1,800-2,400 extra words of generated prose per lesson, and the
cost reflects it. Pricing is list Sonnet rates; override with `PRICE_INPUT_PER_M` /
`PRICE_OUTPUT_PER_M` if your contract differs.

Input tokens rose ~34% in both runs purely from the longer prompt (ceiling block, modality mix,
diagram integrity rules, rationale spec). That part is fixed overhead and is not attributable to
`reviewRationale`.

### Two output budgets were silently blown, and are now raised

The Grade 7 run hit two caps:

```
lesson 1 coverage gap    2034 ->    2200 / cap 2200  *** HIT CAP ***
lesson 1 quiz QA         2154 ->    3000 / cap 3000  *** HIT CAP ***
lesson 1 quiz application 10018 ->  19388 / cap 20000
```

The coverage-gap truncation was not cosmetic — it broke that call outright:

```
[generation] label=lesson 1 coverage gap reached output budget (out=2200, max=2200, stop=max_tokens)
Failed to parse AI lesson JSON: Unterminated string in JSON at position 2341
Lesson 1: coverage gap fill parse failed — will remap in normalizeQuiz
Lesson 1: still uncovered after targeted regen: [2]
```

Outcome 2 lost its dedicated question and fell back to remapping. This is a genuine regression
caused by Task 5, so budgets were raised to roughly 40% headroom over worst observed usage:
`quizChunk` 20,000 → 28,000, `coverageGap` 2,200 → 4,000, `quizQa` 3,000 → 4,000. **Unmeasured**
(see §0). The measured cost above therefore slightly *understates* the true cost, since the
truncated calls did less work than they now will.

---

## 7. `reviewRationale` — coverage and learner-facing isolation

| | G1 after | G7 after |
|---|---|---|
| Questions carrying `reviewRationale` | 30 of 30 | 30 of 30 |
| Options covered | 120 of 120 | 120 of 120 |
| Average words per rationale | 15.47 | 20.13 |

Coverage is complete — every option, correct and incorrect. Grade 1 came in **below** the requested
20-30 words (15.47), most likely because the same prompt tells the model to keep Grade 1 language
short; the two instructions pull against each other for young grades. Grade 7 landed in range.

### Nothing learner-facing changed

Measured directly on the stored questions:

| Field (cap) | G1 before | G1 after | G7 before | G7 after |
|---|---|---|---|---|
| `explanation` avg words | 9.57 | 8.70 | 6.37 | 7.03 |
| `explanation` max words (cap 16) | 12 | 10 | 13 | 12 |
| `misconception` avg words | 4.57 | 4.58 | 5.47 | 5.91 |
| `misconception` max words (cap 8) | 7 | 6 | 8 | 8 |
| `optionExplanations` max words | 12 | 10 | 13 | 12 |

No cap is breached and no field grew meaningfully. `feedbackCorrect` and `feedbackIncorrect` remain
the single server-side defaults (`"Well done!"` / `"Review this skill and try again."`) in all four
runs — the model never emitted them before or after.

**The field cannot reach a learner.** Both learner serialisers are strict allowlists that were not
touched: `publicQuestion` (live attempt) and `buildReviewView` (post-quiz review) in
`backend/learner/services/adaptiveQuizService.js` each construct a fresh object field by field, so
an added bank field is dropped by construction rather than by an exclusion rule that could rot.
`AdaptiveQuizPanel` and `TapSelectOptions` were not modified and never see the field.

### Admin display

`LessonReviewModal` gained one conditional paragraph inside the existing per-option block, showing
`Reviewer note: <rationale>` for every option including the correct one. No layout, styling,
spacing or structural change was made anywhere else in the component, per the firm constraint on
admin redesign work. The diff is 6 added lines plus one `const`.

---

## 8. Grade 1 Addition template — no conflict

Task 1.4 asked for confirmation that the template block and the new ceiling coexist without
contradicting each other. `node scripts/print-quiz-prompt.js 1 Mathematics Addition reasoning`
prints the exact assembled prompt; `isGradeOneAdditionContext` is `true` and the band is
`very_young`. The two blocks are reconciled rather than merely co-present:

- The ceiling block states that it "overrides any style guidance above that would make a stem
  longer", so precedence is explicit.
- The template block now opens by restating that the ceiling applies to both the rendered
  `question` and the `{a}`/`{b}` `questionText` pattern, with a worked example of a compliant
  one-sentence template stem.
- The template engine's own logic (`isGradeOneAdditionContext`, `additionTemplate.js`) is untouched.

One residual tension worth naming, resolved rather than silent: the Mathematics `quizStyle` asks
for "2+ real-life word problems", and a word problem in one sentence of ≤12 words is tight. The
ceiling explicitly wins, and the template block now shows how to write a compliant one-sentence
word problem. `verify-addition-twist.js` still passes (500 iterations, 44/45 domain pairs,
distractor repair intact).

---

## 9. Regression checks

| Check | Result |
|---|---|
| `node scripts/verify-quiz-quality.js` | OK — coverage, QA fail-soft, difficulty mapping, adaptive session |
| `node scripts/verify-addition-twist.js` | OK — template twist and distractor repair unaffected |
| `node scripts/verify-diagram-rendering.js` | OK — diagram params and labels unaffected |
| `npx tsc --noEmit` (frontend) | 124 errors before, 124 after — no new errors; all pre-existing, in `useSubjectStore` / `useSubStrandStore` |
| `normalizeQuiz` / `runQuizQAPass` callers | All new options are defaulted; existing call sites unchanged in behaviour |
| `type: 'multiple-choice'` coercion | Untouched, as required |

---

## 10. Open items

- **Confirm the two unmeasured changes** (§0) with one more Grade 1 run when API credits allow.
- **Grade 1 rationale length** averages 15.47 words against a 20-30 word target (§7).
- **Grade 7 verbosity drift** (§2) is unexplained and needs a second sample before acting.
- **Grade 2-5 unverified.** The `young` band (2 sentences / 20 words) has never been exercised
  against a real generation. Only `very_young` (Grade 1) and `pre_teen` (Grade 7) were measured.
- **`docs/measurements/*.json` are large generated dumps** (four full lessons). Keep or gitignore
  as you prefer; they are the raw evidence for every number above.
