# Question group model

**Date:** 2026-08-16  
**Status:** Design only. No schema, no UI, no generation changes in this document.  
**Depends on:** `docs/grade1-question-format-audit.md`

This is the decided model for **blocked, shared-instruction practice** during skill acquisition. Implement against this, not against a heading wrapped around today's MCQs.

---

## 1. Shared instruction, params-only items

A **group** is one instruction plus N items. The instruction owns all language. Each item owns only parameters.

```text
instruction: "Add."
interactionType: column_addition   // future renderer; today: drag_to_target or numeric entry
items:
  - { a: 5, b: 2 }
  - { a: 2, b: 1 }
  - { a: 13, b: 4 }
```

Rendered: the word "Add." once, then three layouts (`5 / 2 / +`, etc.). No item restates "Amina has 5 beads."

### Compliance test (non-negotiable)

**If an item still has a sentence describing its own context, it is not a group item.** It is a heading over old-style questions. Fail the item in QA.

Allowed on an item: `id`, `params`, `answer` / `answerFormula`, `constraints`, `skillFocus` / `learningOutcomeKey` inherited from the group, optional `diagramType` inherited from the group.

Forbidden on an item: `question` / stem string, a restated scenario, per-item `options` that re-encode the instruction.

The group may carry a short `instruction` string (Grade 1: 1–4 words, e.g. "Add.", "Draw enough balls.", "Write the next number."). That string is the only learner-facing prose for the whole group.

### Mapping from today's templates

Grade 1 Addition already produces parameter-only items:

- `questionText` with `{a}` and `{b}`
- `params: { a, b }`
- `answerFormula: "a + b"`
- `constraints`

Under this model, **drop `questionText` from the learner payload**. Keep it as an admin/debug pattern if needed. The group instruction is `"Add."` or `"How many altogether?"`. `twistAdditionQuestion` / `twistCountIntoBoxQuestion` already enumerate other `{a,b}` pairs — those become the other items in the group, not new stems.

`count_into_box` / `drag_to_target` is the same shape: one instruction ("Draw enough balls." / "Put them in the box."), items `{ target: 5 }`, `{ target: 8 }`, … with `objectPool` derived from target. Minimal rework: wrap N twisted pairs in a group object instead of scheduling them as unrelated questions.

---

## 2. Interruptibility

A group is **not** a transaction that must commit. The learner can be pulled out after any item.

Rules:

1. Each item still writes one `skill_attempts` row (boolean `correct`, existing integer channel for now). BKT, fail-streak, and twin logic see **items**, not the group as a single observation.
2. After each item, the session may:
   - continue to the next item in the group, or
   - **abandon the remaining items** and route to scaffolding / a Layer 2 approved edge / a twin, using the same thresholds as today (`scaffoldTolerance` on consecutive fails at the outcome).
3. Abandoned items are not marked wrong. They are simply not asked. Do not inflate fail-streaks with unasked work.
4. A group should be short (3–5 items) so an interrupt is cheap. Do not build 20-item worksheets that trap a struggling learner.

Suggested session field (when implemented): `openGroup: { groupId, itemIndex, remainingItemIds }`. Clearing `openGroup` is the abandon path. No new table required for a first implementation.

Twins: a miss inside a group may still enqueue a twin of **that item's params** (different `{a,b}`), either immediately (interrupt) or after the group if the learner is still succeeding. Do not twin the whole group as one blob.

---

## 3. Answer capture for group items (this spec only)

Most acquisition items under a shared instruction want a **single value**, not four options.

```text
response:
  kind: "scalar"
  value: 7          // number or short string
```

Grading for this slice: `value === expected`, where `expected` comes from `answerFormula` + `params` (already how `expectedCountForQuestion` works) or a stored scalar.

Until a group UI exists, **drag_to_target already captures this as `placedCount`**, which is an integer on the existing `selected_option_index` channel. Numeric keypad entry would use the same integer (or a small text field coerced to number). Do not invent option lists for "Add." items.

### Explicitly out of scope here (roadmap Part E)

Do **not** design `skill_attempts.response jsonb` in this document. Circle-all, sequence-fill, and matching need sets / ordered lists / pairs. That is a separate schema + grader-registry piece. When it happens, it should assume groups (instruction + params items), not isolated MCQ stems.

---

## 4. Where groups fit vs the adaptive engine

Founder's split, formalized:

| Phase | Format | Engine |
|---|---|---|
| **Acquisition** (inside a unit, first teaching of a skill) | Blocked groups. One instruction, several param items, same format. | Item-level BKT and fail-streak still update after each item. Scaffolding **may interrupt** the group. No interleaved formats. Layer 2 proposals stay suppressed for Grade 1 until format quality is trusted. |
| **Revision / unit-end / topic review** | Interleaved single items, mixed instructions. Existing adaptive session (main set, twins, fail-queue). | Full adaptive engine: twin-consistency, modality switching, fail-queue retries, Layer 2 (once Grade 1 signal is clean). |

Boundary: a **unit** (already in `units` + `curriculum_sequence`) ends with a revision session that is *not* grouped. Lessons that introduce a skill use groups. The existing `createAdaptiveSession` path is the revision engine; groups are an acquisition scheduler that can hand off to it.

What applies where:

- **BKT updates:** both phases, per item.
- **Twin-consistency:** revision always; acquisition only on interrupt or after a miss, not as a second full group.
- **Fail-streak / scaffoldTolerance:** both, per item; acquisition uses it to abandon the group.
- **Layer 2 fail-streak jobs:** revision only until Grade 1 items are params-only (reading load gone). Currently suppressed for Grade 1 entirely.
- **Question bank / MCQ:** remains valid for revision and for older grades. Acquisition at Grade 1 should not default to prose MCQ.

---

## 5. Existing infrastructure → this model

| Existing | Role in groups |
|---|---|
| `additionTemplate.js` `{a}/{b}` + `twistAdditionQuestion` | Item factory. One twist = one more group item. |
| `countIntoBox.js` + `DragToTargetLive` | First acquisition renderer. Instruction + `{target}` / `{a,b}`. |
| `skill_attempts.selected_option_index` | Temporary scalar channel (`placedCount` or numeric entry). |
| `advanceAdaptiveSession` | Grade one item; decide continue vs abandon group. |
| `QUIZ_CHUNKS` / generation | Later: emit `{ instruction, items[] }` instead of 10 independent stems. Not in this pass. |
| Units + Layer 1 edges | Boundary between grouped lessons and revision sessions. |

Do not redesign the template engine. Promote it from "hidden MCQ generator" to "group item generator."

---

## 6. What not to build yet

- No `response jsonb` column or structured-answer graders (circle / sequence / match).
- No new interaction types beyond `multiple_choice` and `drag_to_target`.
- No group UI, no `quiz.groups[]` persistence, no migration for groups.
- No change that wraps today's MCQ stems in a heading and calls it a group.
- No blocking "finish all five" behaviour.

This document exists so Part E (structured answers) and a future group implementation share one model: **instruction + params items, interruptible, scalar answers first, adaptive engine reserved for revision.**
