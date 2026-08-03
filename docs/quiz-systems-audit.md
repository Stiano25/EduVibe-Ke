# Dual quiz systems audit

**Date:** 2026-08-02  
**Scope:** Read-only audit. No schema changes, data migration, or deletion of the standalone `quizzes` table.

## Summary

EduVibe currently has **two quiz storage paths**. Learners only use the lesson-bank path. The standalone `quizzes` table is admin CRUD + analytics counting only.

| System | Storage | Adaptive / learner path? | Primary consumers |
|--------|---------|--------------------------|-------------------|
| Lesson quiz bank | `lessons.quiz` JSONB | **Yes** | Lesson generation, top-up API, `adaptiveQuizService`, `AdaptiveQuizPanel`, `LessonReviewModal` |
| Standalone quizzes | `quizzes` table | **No** | Admin CRUD UI, dashboard/analytics total count |

---

## 1. Lesson bank (`lessons.quiz`) — active learning path

| Layer | Path | Role |
|-------|------|------|
| Schema | `backend/database/migration_add_quiz_to_lessons.sql` | `quiz` JSONB on `lessons` |
| Generation | `backend/admin/services/lessonGenerationService.js` | Builds ~30-item bank; coverage + QA flags |
| Top-up | `POST /admin/lessons/:id/quiz/top-up` | Fills short banks |
| Adaptive engine | `backend/learner/services/adaptiveQuizService.js` | `pickNextMain` over `lesson.quiz.questions` |
| Learner UI | `frontend/src/components/learner/AdaptiveQuizPanel.tsx` | Live adaptive attempts |
| Admin review | `frontend/src/components/admin/LessonReviewModal.tsx` | Approve / filter / top-up |

This is the **canonical** quiz system for CBC adaptive learning (bloom, modality, outcome mastery).

---

## 2. Standalone `quizzes` table — admin / legacy

### Schema (`backend/database/migrations.sql`)

- `id`, `title`, `description`, `grade`, `difficulty` (`beginner` \| `intermediate` \| `advanced`)
- `questions` JSONB, `passing_score`, `time_limit`
- `linked_to` JSONB (`{ type: 'note' \| 'substrand', id }`)

### Call sites

| Layer | File | Operations |
|-------|------|------------|
| Model | `backend/models/Quiz.js` | `create`, `findById`, `findByLink`, `findByGrade`, `findAll`, `update`, `delete` |
| Controller | `backend/admin/controllers/quizController.js` | CRUD wrappers |
| Routes | `backend/admin/routes/quiz.js` → mounted at `/admin/quizzes` | REST CRUD |
| Analytics | `backend/admin/services/analyticsService.js` | `Quiz.findAll()` → `quizzes.total` metric |
| Frontend API | `frontend/src/lib/api.ts` | get/create/update/delete |
| Store | `frontend/src/store/useQuizStore.ts` | fetch/add/update/delete |
| Admin UI | `frontend/src/pages/admin/Quizzes.tsx`, `QuizFormModal.tsx` | Full CRUD |
| Route | `frontend/src/App.tsx` → `/admin/quizzes` | Page exists |
| Dashboard / Analytics | `Dashboard.tsx`, `Analytics.tsx` | Display quiz **count** only |

### Not on the learning path

- No learner routes or adaptive code read from `quizzes`.
- `frontend/src/components/learner/AvailableQuizzes.tsx` appears unused (no imports found).
- Quizzes is **not** listed in primary admin nav (`adminNav.ts`); route is reachable by URL only.
- `fetchQuizzesByLink` / `fetchQuizzesByGrade` in the store are unused by other pages.

**Verdict:** Standalone table is **admin CRUD + analytics**, not dead code in the strict sense (UI + API still work), but **not wired into adaptive selection** and easy to confuse with `lessons.quiz`.

---

## 3. Founder decision

**Decision (2026-08-02): (a) — deprecate the standalone `quizzes` table.**

Keep a single adaptive path via `lessons.quiz`. Do **not** start deprecation/migration in this workstream.

### Follow-up task (not started)

Deprecate/remove the standalone `quizzes` table and admin CRUD, after a dedicated plan covering data migration, call-site updates, and tests.

**Prerequisite before that follow-up begins:** audit exactly what admin analytics currently reads from the `quizzes` table, and define the `lessons.quiz` replacement metrics so nothing is removed until those are replicated.

Known analytics touchpoint today (starter list — deepen in the follow-up audit):

| Consumer | File | What it reads from `quizzes` |
|----------|------|------------------------------|
| `getAnalytics` | `backend/admin/services/analyticsService.js` | `Quiz.findAll()` → `quizzes.total` (count only) |
| Dashboard / Analytics UI | `Dashboard.tsx`, `Analytics.tsx` | Displays `analytics.quizzes.total` |

Likely replacement: count of lessons with a non-empty `quiz.questions` bank (and/or question totals), not a separate table count. Confirm all other readers before deletion.

---

## 4. Founder decision — adaptive session score (retries)

**Decision (2026-08-03): Option C — retries excluded from session percentage.**

- `score.percentage` / `lesson_progress.progress` use **main-phase (first-try) answers only**.
- Retries are reported separately as `score.retryCount` (e.g. UI: `80% · 3 retries`).
- Pass/unlock still compares that first-try `%` to `max(lesson.quiz.passingScore || 60, 60)` — **floor not recalibrated in this change**.
- Mastered status uses a separate rule (≥3 of last 4 attempts correct); celebration “mastered” copy keys off `skill_mastery.status`, not session %.

### OPEN DECISION — 60% pass / unlock floor (do not close until revisited)

**Status: open — revisit after more real first-try session data.**

Because Option C dropped retries from the %, the same raw performance now yields a **systematically lower** `progress` / pass check for retry-heavy learners than under the old blended score. The floor is still hard-coded at `max(passingScore || 60, 60)` in:

- `adaptiveController.js` (complete / `lesson_progress.completed`)
- `learnerController.js` (next-lesson unlock via `progress >= 60`)
- `Lessons.tsx` / `LessonView.tsx` (UI gates on `progress >= 60`)

No recalibration in this change. Decide later whether to lower the floor, keep 60, or use separate first-try vs retry metrics for unlock.

### Fast-follow (not started)

Recalibrate the 60% pass / unlock floor using aggregated first-try session data once available.

---

## 5. Modality selection signal persistence

Each main-path `pickNextMain` records `{ source, modality, questionId, learningOutcomeKey, at }` where `source` is `per_outcome` | `global_fallback` | `none`.

**Stored in two places (both queryable):**

1. `lesson_progress.session_review.modalitySignals` — per completed session (JSONB array)
2. `adaptive_modality_signal_log` table — one row per selection (`migration_modality_signal_log.sql`)

Example aggregation (share of rich signal vs fallback):

```sql
SELECT source, COUNT(*) AS n,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM adaptive_modality_signal_log
GROUP BY source;
```

Use this to decide whether the combined modality bonus should move from **+8 → +18**.

---

## 6. Generation provider — Claude primary (2026-08-03)

**Decision:** `GENERATION_PROVIDER` defaults to **`claude`**. Lesson shell, Bloom-band quiz chunks, coverage gap-fill, QA pass, and top-up all go through the Claude adapter (`claude-sonnet-5` via `CLAUDE_MODEL`).

**Gemini retained only for:**
- Embeddings (`gemini-embedding-001`) — RAG knowledge bank
- OCR fallback for scanned PDF ingest

The Gemini content adapter and provider abstraction remain available (`GENERATION_PROVIDER=gemini`) but are not the default.

### Closed — superseded Gemini verification items

| Item | Prior status | Now |
|------|--------------|-----|
| Live-UI top-up click-through on **Gemini** | Pending (awaiting free-tier quota / verification) | **Closed — superseded** by switch to Claude as primary generation provider |
| Grade 3 Science generation run on **Gemini** (Plant parts seed `82861888-…`) | Reserved for Gemini comparison / verification | **Closed — superseded** — same seed used for the Claude-primary generation instead |

**Why closed (not still pending):** Gemini is no longer used for lesson/quiz generation, so further verifying its generation path (including waiting on free-tier quota resets) is not needed. Record kept here so the drop is explicit rather than silent.
