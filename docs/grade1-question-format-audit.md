# Grade 1 question format audit

**Date:** 2026-08-16
**Trigger:** A real CBC 2020 Grade 1 Mathematical Activities paper was compared against generated Grade 1 content. None of the paper's five task formats can be produced by the current engine.
**Status:** Diagnosis only. No code changed.

---

## 1. The finding in one line

The generator has exactly one output shape — a prose stem with 3-4 text options — and Grade 1 assessment needs about five. Every quality fix applied at this grade so far (the complexity ceiling, the word counter, the QA pass) operates *inside* that one shape and therefore cannot reach the actual problem.

**1,077 questions exist across all grades. All 1,077 are `multiple-choice`. Zero are anything else.**

```sql
SELECT qq->>'interactionType', count(*)
FROM lessons l, jsonb_array_elements(l.quiz->'questions') qq
GROUP BY 1;
-- multiple_choice: 30   (Grade 1, post-Part-2)
-- null:          1047   (pre-Part-2, all type 'multiple-choice')
```

---

## 2. What a real Grade 1 paper asks for

From the CBC 2020 sample, page 1:

| # | Instruction | Items under it | Task |
|---|---|---|---|
| 1-4 | "Circle all the numbers." | 4 | Multi-select from a mixed set of numerals and letters |
| 5-8 | "Write the next number." | 4 | Free entry, completing a sequence with 3 blanks |
| 9-15 | "Match the numbers." | ~7 | Pair a numeral to its word |
| 16-20 | "Draw enough balls." | 5 | Construct a quantity: `5 = ____` |
| 21-25 | "Add." | 5 | Vertical column arithmetic, plus `13 + 4 =` |

Two structural properties matter more than the formats themselves.

**The instruction is separated from the content.** "Add." is one word and heads five items. "Draw enough balls." is three words and heads five. Roughly **15 words of instruction cover ~23 items** — well under one word per item.

**The cognitive work lives in the layout, not the sentence.** `5 / 2 / +1` stacked vertically *is* the question. There is no sentence to parse.

---

## 3. What EduVibe produces instead

All 60 Grade 1 questions currently in the database, across two lessons.

### 3.1 Reading load is roughly 15× too high

Every EduVibe item carries its own self-contained prose stem, averaging ~11 words. The real paper averages under 1 word per item because instructions are shared. Same amount of arithmetic, an order of magnitude more reading.

### 3.2 37% of one lesson is answerable without doing any maths

In "Sorting and Grouping Objects", **11 of 30 questions** can be answered by re-reading a number already printed in the stem:

Pure read-back:
- "A tray has 5 spoons and 4 forks. How many spoons are there?" → `5`
- "A room has 8 chairs and 3 tables. How many chairs are there?" → `8`
- "A farmer has 6 hens and 4 cocks. How many hens does he have?" → `6`
- "A box has 5 squares and 2 triangles. How many shapes are squares?" → `5`

"Counted twice" read-back — **seven questions all testing the identical concept**, each with the answer stated in the stem:
- "Seven shells counted from either end give what count?" → `7`
- "A boy counts 9 ten-shilling coins twice — what is the count?" → `9`
- "A tailor measures 6 metres of cloth twice — what is the count?" → `6`
- "A group has 6 mangoes. Counted twice, what is the count?" → `6 and 6`
- "8 crayons are counted forward then backward. What is the count?" → `8 and 8`
- "A group of nine pencils is counted twice — what is the count?" → `9`
- "Ten crayons are counted twice in different orders — does the count change?" → `No`

This is the direct cost of the 12-word ceiling. Squeezed between "must be a self-contained prose MCQ" and "must fit 12 words", read-a-number-back is nearly the only construction that satisfies both. The ceiling did not cause bad questions by being wrong; it caused them by being the only lever available inside a shape that cannot express a Grade 1 task.

### 3.3 The model is hand-drawing with Unicode

> "How many dots show the number five?"
> Options: `["●●●●●", "●●●", "●●●●●●", "●●"]`

The model needed pictures in the answer choices and had no way to ask for them, so it typed bullet characters. `options` is `string[]` end to end (`frontend/src/components/learner/quiz/types.ts:8`) — a diagram can attach to the stem, never to an option. Picture-choice answers are extremely common in real Grade 1 papers and are structurally impossible here.

### 3.4 Visual questions that have no visual

Tagged `modality: "visual"` with nothing to see:
- "What is $12 + 5$?"
- "What is $46 + 3$?"
- "A rope is 52 cm long. Another piece is 6 cm long. What is the total length in cm?"

And where a figure genuinely is needed, the template renders words instead of shapes:
- "Which box holds the square card?" → options `["Circle box", "Square box", "Triangle box"]`, figure rendered by `labeled_boxes` as three rectangles containing that same text. The question collapses to word-matching "square" against "square". Another read-back.

### 3.5 LaTeX shown to six-year-olds

`$12 + 5$`, `$83 + 5$`, `$100$` appear in stems, inconsistently mixed with plain `26 books` in the same lesson.

### 3.6 Number range to verify

The addition lesson runs to `93 + 4`, `84 + 3`, `81 + 8`. The sample paper's largest item is `13 + 4`. Worth checking the CBC Grade 1 design document — this may be a scope error on top of the format error, but it is asserted here only as a hypothesis.

---

## 4. Why this corrupts the adaptive engine

This is the part that makes it more than a content-quality complaint.

`skill_attempts` records one boolean per attempt, keyed to a numeracy outcome:

```
correct                  boolean  NOT NULL
learning_outcome_key     text     NOT NULL
selected_option_index    integer
```

A Grade 1 learner who can compute `5 + 2` but cannot yet read *"A tray has 5 spoons and 4 forks"* is recorded as **failing a numeracy outcome**. Reading ability is silently folded into the maths signal.

That contaminated boolean then drives:

- **BKT mastery** (`utils/bkt.js`) — mastery estimate decays for the wrong reason
- **Scaffold routing** — `consecutiveFails` crossing `scaffoldTolerance` sends the learner down a grade
- **Part 9 Layer 2 proposals** — the same fail-streak queues an LLM job asking "what prerequisite is this learner missing?" The honest answer is "reading fluency", which is not in the curriculum graph. The model will confidently propose a *mathematics* prerequisite and an admin will plausibly approve it.
- **Modality preference** — the learner looks like they fail at text, when they fail at *length*

Part 9 has just made this worse in a specific way: it converts a measurement artefact into a durable, human-approved edge in the curriculum graph. **This is the strongest argument for treating format as urgent rather than cosmetic.**

---

## 5. Where the MCQ shape is hardcoded

| Layer | Location | Constraint |
|---|---|---|
| Prompt | `buildQuizChunkPrompt`, `buildCoverageGapPrompt` | `interactionType` is **never mentioned**. The model is not told any alternative exists. |
| Normalize | `lessonGenerationService.js:472` | `type: 'multiple-choice'` hardcoded |
| Resolve | `utils/interactionTypes.js:26` | Anything unrecognised silently defaults to `multiple_choice` |
| Registry | `interactionTypes.js:9` | Only two types exist: `multiple_choice`, `drag_to_target` |
| Grading | `adaptiveQuizService.js:620` | `correct = selectedOriginal === bankCorrect` — one integer |
| Grading (drag) | `adaptiveQuizService.js:612` | `correct = placed === expectedCount` — also one integer |
| Transport | `adaptiveController.js:542` | `selectedOptionIndex: selectedOptionIndex ?? placedCount` |
| Storage | `skill_attempts.selected_option_index` | `integer` |
| Options | `quiz/types.ts:8` | `options: string[]` — text only |

**The load-bearing constraint is the single-integer answer channel.** `drag_to_target` was addable without a migration precisely because "how many did you place" is an integer. Everything else on the real paper needs structure: a *set* of circled items, an *ordered list* of sequence values, a *set of pairs* for matching.

---

## 6. Format gap table

| Paper format | Answer shape | Renderer needed | Answer channel | Cost |
|---|---|---|---|---|
| "Draw enough balls" | integer | **exists** (`DragToTargetLive`) | **exists** | **Wiring only** |
| "Add." vertical column | integer (via options) | new `column_addition` template | exists | Low |
| Picture-choice MCQ | integer | options carry diagrams | exists | Medium |
| "Write the next number" | ordered list | sequence strip with blanks | **new** | High |
| "Circle all the numbers" | set of indices | selectable item grid | **new** | High |
| "Match the numbers" | set of pairs | two columns + connectors | **new** | High |
| Shared instruction over N items | n/a | question-group header | n/a | High |

### Diagram inventory against Grade 1 need

13 templates exist: `number_line`, `fraction_bars`, `bar_model`, `place_value`, `labeled_boxes`, `process_flow`, `comparison`, `coordinate_plane`, `matrix`, `counting_circles`, `indices`, `right_triangle`, `unit_circle`.

Seven of those (`matrix`, `unit_circle`, `right_triangle`, `indices`, `coordinate_plane`, `process_flow`, `comparison`) are secondary-school constructs — unsurprising, since 790 of 1,077 questions are Grade 9. Missing for Grade 1: vertical column layout, actual drawn shapes, countable object pictures, matching connectors, sequence-with-blanks.

`labeled_boxes` is the default fallback and renders text in rectangles, which is why it absorbs Grade 1 shape questions and turns them into word-matching.

### The thing already built and never used

`utils/countIntoBox.js` produces exactly the "Draw enough balls" task: an object pool, a target box, place N, press Done. It is wired end to end — `advanceAdaptiveSession` grades it, twin scheduling handles it, `DragToTargetLive`/`DragToTargetReview` render it, the visible-response timer covers it.

**It has never been generated once.** It sits behind the Grade 1 Addition template path and was never injected there either. Zero rows in the database.

---

## 7. Staged roadmap

Staged by whether the answer channel has to change, because that is what separates a contained change from a migration.

### Stage 0 — Degenerate-question gate (independent of everything below)

Worth doing regardless, and cheap. The QA pass currently checks ambiguity, plausibility, factual error and complexity. It does not check whether the answer is printed in the stem — which is why 11 of 30 got through.

- Add a mechanical pre-check: if the correct option appears verbatim as a token in the stem, flag it.
- Add a QA rule: *"a question whose answer can be read directly out of the stem is a defect."*
- Add a concept-repetition check: seven questions on order-irrelevance of counting is a coverage failure the current near-duplicate detector misses, because the stems differ while the concept does not.

### Stage A — Formats that fit the existing integer channel

No migration, no contract change.

1. **Inject count-into-box into Grade 1 generation.** Highest value per unit of work in this document — the interaction is finished and idle.
2. **Teach the prompt that `interactionType` exists.** One block in `buildQuizChunkPrompt` describing when to choose `drag_to_target`.
3. **Add a `column_addition` diagram template.** Lets the stem shrink to "Add." with the figure carrying `5 / 2 / +1`.
4. **Add concrete shape and object rendering** so `counting_circles` and a new `shape_group` draw circles, squares and triangles instead of printing their names.

### Stage B — Picture options

Answer stays an index; only the option payload gets richer.

- `options: string[]` → `options: (string | { text?, diagramType?, params? })[]`
- Touches `normalizeQuiz`, `publicQuestion`, `MultipleChoiceLive`, `MultipleChoiceReview`, admin review, and option shuffling (`applyStoredOrder` must carry diagrams through the permutation).
- Unlocks a large fraction of real Grade 1 items, including "How many dots show the number five?" as an actual figure rather than `●●●●●`.

### Stage C — Structured answers

The migration. Everything on the paper that is not already an integer needs this.

- Add `skill_attempts.response jsonb` alongside the existing integer column; keep the integer populated for MCQ so nothing downstream breaks at once.
- Replace `correct = a === b` with a per-interaction grader registry, mirroring the existing frontend `LIVE_INTERACTIONS` pattern.
- Then add `multi_select`, `sequence_fill`, `matching`.
- Also touches twin scheduling, misconception keying (a partially-correct multi-select is not one misconception), and the review UI.

### Stage D — Question groups

The deepest change, and the one that actually removes the reading load: a shared instruction heading N items, so "Add." covers five questions instead of five stems each restating themselves.

This also fixes the variation problem. On the real paper items 16-20 are `5=`, `8=`, `7=`, `6=`, `10=` — identical format, varying quantity, and that repetition *is* the pedagogy. The current one-stem-one-question model makes format repetition look like duplicate content, so the generator varies the story instead (spoons, hens, chairs, crayons, mangoes). It is varying the wrong dimension: adding words, adding no rigour. The Grade 1 addition template engine with `{a}`/`{b}` params already varies the right dimension, but is fenced to one sub-strand.

---

## 8. Recommended sequence

Stage 0 and Stage A are worth doing immediately and are independent of the larger decision — Stage A step 1 in particular is wiring up something already finished.

Stage C is the real commitment. It should not start until the schema shape for `response jsonb` and the grader registry have been designed, because it touches BKT, twins, misconceptions and the review UI simultaneously.

The complexity ceiling should stay. It is not wrong, it is just downstream of this — and once instructions are shared and content moves into layouts, most stems will fall under it without being forced.
