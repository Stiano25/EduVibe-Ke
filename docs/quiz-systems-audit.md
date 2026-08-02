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

## 3. Recommendation (needs founder sign-off)

Choose one before any consolidation work:

**(a) Deprecate standalone `quizzes`**  
Migrate any real linked/note usage into lesson banks (or a clearer “practice pack” product), remove admin CRUD, and keep a single adaptive path via `lessons.quiz`. Requires a separate migration plan (data, call sites, tests).

**(b) Keep both, document roles**  
- `lessons.quiz` = adaptive CBC lesson banks (generation + learner mastery).  
- `quizzes` = optional ad-hoc / note-linked practice outside the adaptive lesson flow.  
Clarify nav/copy so admins do not edit the wrong system.

**(c) Something else**  
e.g. rename standalone to “Practice packs” and hide until productized.

**This workstream stops here.** Do not delete, merge, or migrate the `quizzes` table until one of the above is chosen.
