# Unit backend state — status before any path UI

**Date:** 2026-08-19
**Status:** Discovery only. No path UI designed or built.
**Method:** Current workspace code. Not assumed from earlier Part 4 reports.

**Constraints for any later path work (reaffirmed):** no peer comparison or leaderboards; no loss-aversion mechanics (no hearts/lives, no punishing streaks). Gamification, if added later, is personal progress only. See §6 for what already exists that could be mistaken for either.

---

## Verdict in one paragraph

A `units` table and `Unit` model exist (1:1 with sub-strand). Sequential unlock **logic** exists and is used on the learner path. It does **not** read the `units` table — it sequences **sub-strands** and reuses the lesson pass threshold. The Grade 1 dashboard is a **flat stacked lesson list** (`"Your lessons"`) that ignores unit grouping on screen. Older-grade browse mode shows sub-strand **cards** with a progress percent, still not a path. There is no stored “unit complete” row, no unit-level celebration, and no node graph. A path UI would be almost entirely new frontend work, plus a learner API that actually returns units (or honest sub-strand groups) with counts and states — not a coat of paint on today’s list.

---

## 1. Does the Unit entity and gating exist, and in what state?

**Partially built. Backend entity + gating algorithm: working. Learner APIs: gating works via sub-strands, not via `units`. Path UI: not built.**

### What exists

**Schema** — [`backend/database/migration_units_and_prerequisites.sql`](../backend/database/migration_units_and_prerequisites.sql):

- `units` table: `id`, `sub_strand_id` **UNIQUE** (1:1), `strand_id`, `subject_id`, `grade`, `name`, `sequence_number`, `lessons_allocated`.
- `sub_strands` also gained `sequence_number` and `lessons_allocated`.
- Index `units(strand_id, sequence_number)`.

**Model** — [`backend/models/CurriculumGraph.js`](../backend/models/CurriculumGraph.js) `Unit`: `upsertForSubStrand`, `findBySubStrandId`, `findByStrand` (ordered by `sequence_number`), `findBySubject`.

**Seed/sync** — [`syncUnitsAndOutcomes`](../backend/admin/services/prerequisiteGraphService.js) upserts a Unit for every Mathematics sub-strand. **Mathematics only** (`Strand.normalizeName(subject.name) === 'mathematics'`). Other subjects may have sequenced sub-strands without a `units` row.

**Admin read APIs** — [`unitController.js`](../backend/admin/controllers/unitController.js): `GET` units by strand/subject; `GET /admin/strands/:id/units` joins the sub-strand. Admin Lessons UI labels `"Unit {sequenceNumber} · {name}"` from the **sub-strand**, not a dedicated Unit screen for learners.

**Gating algorithm** — [`backend/utils/lessonUnlock.js`](../backend/utils/lessonUnlock.js):

- Pass threshold: `LESSON_PASS_THRESHOLD = 60` — satisfied if `completed === true` **or** `progress >= 60`.
- `unlockFlagsForSequence`: first item unlocked; later items stay locked until the **last approved lesson** of the previous item is satisfied. Empty items (no approved lessons) do not block later ones.

**Learner wiring** — [`loadStrandUnitUnlock`](../backend/learner/services/unitGatingService.js):

- Loads `SubStrand.findByStrand` (ordered by `sequence_number`).
- Loads approved lessons + `lesson_progress`.
- Runs `unlockFlagsForSequence` on **sub-strands**.
- **Does not query `units`.** There is no `Unit.find` anywhere under `backend/learner/`.

Used by:

- `getLearnerSubstrands` (browse cards)
- `getLearnerLessons` (intra-unit lesson list: unit must be unlocked, then lesson 1, then previous lesson passed)
- `resolveNextTask` / `listLessonChoices` (quest)

Offline test: [`verify-prerequisite-graph.js`](../backend/scripts/verify-prerequisite-graph.js) (`[true, false, false]` with no progress; second opens after first passed). Live script: [`verify-grade1-units-live.js`](../backend/scripts/verify-grade1-units-live.js) reads `Unit.findByStrand` **and** `loadStrandUnitUnlock` (sub-strand flags keyed by `unit.subStrandId`).

### What is not fully working as a “Unit product”

| Claim | Reality |
|---|---|
| 1:1 Unit row per sub-strand | True for Maths after sync; not guaranteed for other subjects |
| Gating uses the `units` table | **False.** Gating uses sub-strand order. If `units.sequence_number` and `sub_strands.sequence_number` ever diverge, the learner follows sub-strands |
| `unitId` on next-task | **`picked.unit.id` is the sub-strand id**, aliased as `unitId` in [`nextTaskService.js`](../backend/learner/services/nextTaskService.js) lines 100–146 |
| Frontend `Unit` type | **None** in [`frontend/src/types/index.ts`](../frontend/src/types/index.ts) |

**State label:** gating is **working** as sub-strand sequential unlock. The Unit table is a **parallel record** for admin/graph sync, not the source of truth for the child.

---

## 2. Does the dashboard / lesson list read from units today?

**No. Grade 1 (quest) is a flat per-lesson list. It does not render units.**

Grade ≤ 5 dashboard ([`Dashboard.tsx`](../frontend/src/pages/learner/Dashboard.tsx) lines 122–143):

1. `QuestNextCard` — one next lesson (`Start` / `Keep going`). Payload includes `unitId` (sub-strand id) but the card **never displays it**.
2. Heading **`"Your lessons"`** plus `"{done}/{total} done"` (count of `isCompleted` lessons across the whole grade).
3. [`LessonJourney compact`](../frontend/src/components/learner/LessonJourney.tsx) — `compact` forces group key `'all'`, so **no unit/topic headers**. Rows are lessons from `GET /learner/lesson-choices`.

That matches the screenshot: stacked cards, no path, no visible unit grouping.

`listLessonChoices` ([`nextTaskService.js`](../backend/learner/services/nextTaskService.js) lines 156–207) returns:

```
lessonId, title, subjectName, strandName, subStrandName, isUnlocked, isCompleted, progress
```

No `unitId`, no `sequenceNumber`, no `lessonsInUnit`, no `unitComplete`.

On `/learner/lessons` (full catalog, still quest), `LessonJourney` without `compact` groups by **`subStrandName`** and paints `"Topic {groupIndex + 1}"` — display order, **not** DB `sequence_number`. Still a stacked `<ul>`, not a connected path.

**Older grades (browse)** hide quest and show [`SubjectNavigation`](../frontend/src/components/learner/SubjectNavigation.tsx) → [`SubStrandCards`](../frontend/src/components/learner/SubStrandCards.tsx). Those cards **are** sub-strand/unit-shaped: name, `{n} lessons`, `progressPercent`, `Locked` / `"Finish the previous unit first."` Data comes from `GET /learner/substrands/:strandId`, which aliases `unitId: substrand.id`. Still a **card grid**, not a path, and **Grade 1 does not use this screen**.

---

## 3. What unit-level progress data already exists?

**Nothing is stored as unit progress.** Everything is derived from `lesson_progress` at read time.

| Signal | Exists? | Where | Usable as-is for a path? |
|---|---|---|---|
| Lessons in a unit (approved count) | Derived | `lessonsBySub` size / `lessonCount` on substrand payload | Yes, for browse API; **not** on `/lesson-choices` |
| Curriculum allocation | Stored | `lessons_allocated` on sub-strand and unit | Admin/curriculum; not learner quest payload |
| Average progress % in a unit | Derived | `getLearnerSubstrands` `progressPercent` = mean of each lesson’s 0–100 (completed counts as 100) | Browse only |
| Unit unlocked? | Derived | `unlockFlagsForSequence` | Yes, but quest list only has **per-lesson** `isUnlocked` |
| Unit “done”? | **Not stored** | Implied if last lesson in the unit meets the 60% / completed rule (that is what opens the **next** unit) | Would need a derived flag; completing *every* lesson is a stricter rule than “last lesson passed” |
| Next incomplete lesson in unit | Derived | `resolveNextTask` walks units then `lesson_order` | One global next lesson, not “next in this unit” as a first-class object |

`doneCount` on the Grade 1 dashboard is **lessons completed in the whole grade**, not per unit.

---

## 4. What a real path UI would still need (no design — inventory)

**Already ordered (backend), if a path rendered one strand:**

- Sub-strands / units: `sequence_number` ascending, then `created_at`.
- Lessons inside a unit: `lesson_order`.
- Next-task walk: subjects (name sort) → strands (`dedupeByNamePreserveOrder`) → sub-strands with approved lessons → lessons. That is a **catalog walk**, not a single visual spine. Cross-subject “one Duolingo path” is **not** modeled.

**Would need new work:**

1. **Learner API for path nodes** — today’s `/lesson-choices` is a flat lesson array. A path needs groups: strand → unit → lessons, with `sequenceNumber`, unlock, and counts. Either extend this payload or add an endpoint that actually reads `Unit` (or admits it is grouping sub-strands).
2. **Frontend path** — no connected nodes, no unit headers on the Grade 1 dashboard (`compact` flattens them). Entirely new UI.
3. **Unit-complete signal** — not a column. Must be defined (last lesson passed vs all lessons completed) and returned.
4. **Maths-only Unit sync** — if the path is keyed on `units` ids, non-maths subjects may have no rows.
5. **`unitId` honesty** — today it is the sub-strand UUID. Do not assume it matches `units.id`.
6. **Cross-strand / cross-subject sequence** — not a first-class ordered path; would be new product rules, not a missing `ORDER BY`.

---

## 5. Current lesson / node states vs a path

[`LessonJourney`](../frontend/src/components/learner/LessonJourney.tsx) `NodeState`: `'done' | 'current' | 'open' | 'locked'`.

| State | How it is set today | Maps to a path? |
|---|---|---|
| `locked` | `!isUnlocked` (unit locked **or** previous lesson in the unit not passed) | Yes — locked node |
| `done` | `isCompleted` from `lesson_progress.completed` **only** | Partial — **does not** use the 60% pass rule that unlocks the next lesson |
| `current` | First unlocked + not completed in the list (or `currentLessonId`) | Rough “you are here”; not persisted |
| `open` | Unlocked, not completed, not the current row | Yes — available but not the focus |

Browse lesson cards (non-quest `Lessons.tsx`) also use incomplete / ≥60% “In Progress” / 100% “Completed” / “Focus Lesson” / “Locked” — **Grade 1 quest does not use that page’s card chrome**.

**Not present:**

- `"just unlocked"`
- `"unit complete"` (as a node or banner)
- in-progress as its own quest state (progress bar only when `0 < progress < 100` on the row)

**Inconsistency a path would inherit if it reused these flags:** next-task **skips** a lesson at 60% even if `completed` is false (`progressMeetsUnlock`). The journey row would still show `Keep going` / `New`, not `Done`. Unlock of the *next* lesson would already be true. The UI and the gate do not use the same definition of “done.”

---

## 6. Peer comparison and loss-aversion — current codebase

**No leaderboard, no ranking of learners, no XP, no hearts, no lives.** Do not add them in a later path.

What exists that is **not** those things, but could be confused with them:

| Thing | What it is | Learner-facing? |
|---|---|---|
| `attempt_in_skill_streak` / consecutive fails | Scaffolding / Layer 2 prerequisite jobs | **No** (admin / internal). Grade 1 Layer 2 fail-streak jobs are suppressed as untrustworthy |
| Adaptive `failQueue` + `"Retry round — questions you missed"` | Extra practice after misses | Yes — practice, not a life lost |
| Twin `"Practice check"` | Format-transfer probe after fast/wrong | Yes — extra item, not a streak freeze |
| Dashboard `{n}/{m} done` | Personal count of completed lessons | Absolute, not vs peers — keep it that way |
| Per-answer confetti / `Yes!` | Personal feedback | Fine under the positive-only rule |

[`docs/learner-presentation-audit.md`](learner-presentation-audit.md) already noted there is no “3 in a row” streak UI. That remains true. **Do not introduce punishing streaks or hearts when building a path.**

---

## Honest split: exists / partial / new

| Layer | Status |
|---|---|
| `units` table + model + Maths sync | **Exists** |
| Sequential unlock (sub-strand then lesson) | **Exists and is used** |
| Browse sub-strand cards with % and lock copy | **Exists** (not Grade 1 dashboard) |
| Quest next-lesson picker | **Exists** |
| Grade 1 dashboard unit grouping | **Absent** (flat list) |
| Path visualization, node graph, unit-complete celebration, badges, mascot-on-unit-clear | **Entirely new** |
| Learner payload shaped as sequenced units | **New** (or a breaking extension of `/lesson-choices`) |
| Using `units.id` as the path key | **Unsafe today** — learner code keys off sub-strand id |

No path UI is proposed here.
