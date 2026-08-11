# Copy vs Reality Audit

Date: 2026-08-10  
Scope: Landing, learner, and admin user-facing claims in the current repository  
Method: Static trace from visible copy to routes, API handlers, services, stores, database writes, and mock data. No copy or product behavior was changed as part of this audit.

## Executive summary

Twenty material claims were checked:

- 4 match current behavior
- 4 are partially supported
- 8 describe missing behavior
- 3 are misleading
- 1 is stale

The largest trust risk is the landing page. It presents EduVibe as a teacher-and-parent classroom analytics product, while the current application has only `admin` and `learner` roles and primarily supports curriculum administration plus learner lessons and adaptive quizzes. The next largest risks are learner features presented as personalized despite using mock or inert UI, and scoring language that does not explain that the displayed adaptive-session percentage is based on first attempts only.

Priority meanings:

- **P0** — likely to create a materially false expectation about the product or a child’s experience
- **P1** — behavior exists in part, but the copy overstates or omits an important qualification
- **P2** — lower-risk stale or operational wording

Verdicts:

- **Matches** — the claim is directly supported
- **Partial** — some meaningful part is supported, but the wording is broader or more certain than the implementation
- **Missing** — the promised workflow or capability is absent
- **Misleading** — the visible label describes a different mechanism or user
- **Stale** — the wording names an implementation detail that is no longer generally true

## P0 findings

### C01 — Classroom activity becomes teacher and parent insights

**Claim:** “EduVibe turns everyday classroom activity into clear insights for teachers and parents.”

**Verdict:** Missing

The application does not capture everyday classroom activity. Its protected roles are `admin` and `learner`; there is no teacher or parent role, class roster workflow, or parent-facing dashboard.

Evidence:

- `frontend/src/pages/landing/Landing.tsx:95-96`
- `frontend/src/types/index.ts:1-9`
- `frontend/src/App.tsx:70-95`

### C02 — Instant class-level performance and engagement view

**Claim:** Teachers get an “instant view of performance, engagement, and skills across your class.”

**Verdict:** Missing

The admin area has aggregate analytics and curriculum/lesson administration, but no class entity, class roster, class-level skill matrix, or teacher performance view.

Evidence:

- `frontend/src/pages/landing/Landing.tsx:118-128`
- `frontend/src/config/adminNav.ts:21-61`
- `frontend/src/App.tsx:112-215`

### C03 — Weekly parent highlights and home actions

**Claim:** Parents receive “simple explanations and weekly highlights you can act on at home.”

**Verdict:** Missing

There is no parent role, scheduled weekly summary, parent delivery channel, or home-action recommendation workflow.

Evidence:

- `frontend/src/pages/landing/Landing.tsx:129-138`
- `frontend/src/types/index.ts:1`
- `frontend/src/App.tsx:217-248`

### C04 — Teachers record scores and observations

**Claim:** “Teachers record quick scores or observations after lessons, assessments, or projects.”

**Verdict:** Missing

No teacher observation or manual classroom-score entry route, page, controller, or model was found. Current attempt data is produced by learner quiz interactions.

Evidence:

- `frontend/src/pages/landing/Landing.tsx:247-255`
- `frontend/src/App.tsx:112-215`
- `backend/learner/controllers/adaptiveController.js:401-544`

### C05 — Parents receive summaries with two or three practical suggestions

**Claim:** “Parents receive a short, visual summary” with “2–3 practical ways to support learning at home.”

**Verdict:** Missing

The learner has an on-screen progress report, but there is no parent recipient, delivery mechanism, or generated set of home-support suggestions.

Evidence:

- `frontend/src/pages/landing/Landing.tsx:264-270`
- `frontend/src/pages/learner/Dashboard.tsx:92-132`
- `frontend/src/types/index.ts:1`

### C06 — Teacher report export

**Claim:** Teachers can “export summaries for meetings, reports, and school leaders.”

**Verdict:** Missing

No admin export action or report-export endpoint was found. The only related learner action invokes the browser print dialog.

Evidence:

- `frontend/src/pages/landing/Landing.tsx:316-327`
- `frontend/src/pages/learner/Dashboard.tsx:76-78`
- `frontend/src/config/adminNav.ts:21-61`

### C07 — Parent demo credentials

**Claim:** `john@eduvibe.com` is labeled “Parents demo.”

**Verdict:** Misleading

The corresponding mock user is a learner, and `parent` is not a valid role.

Evidence:

- `frontend/src/pages/landing/Landing.tsx:408-414`
- `frontend/src/data/mockUsers.ts:10-15`
- `frontend/src/types/index.ts:1`

### C08 — AI recommendations based on learning progress

**Claim:** “Personalized lesson recommendations based on your learning progress.”

**Verdict:** Misleading

The Recommendations page maps static `mockRecommendations` to lessons. It does not derive recommendations from learner attempts, mastery, or progress.

Evidence:

- `frontend/src/pages/learner/Recommendations.tsx:1-14`
- `frontend/src/pages/learner/Recommendations.tsx:19-22`
- `frontend/src/App.tsx:241-247`

### C09 — Personalized daily exercise

**Claim:** “Short, fun activities picked just for you,” with a “Start Now” action.

**Verdict:** Misleading

The card is static. Its button has visual mouse handlers but no click handler, navigation, exercise selection, or API call.

Evidence:

- `frontend/src/components/learner/DailyExerciseCard.tsx:14-37`
- `frontend/src/pages/learner/Dashboard.tsx:84-90`

### C20 — Regular parent updates

**Claim:** “Regular updates – not just once a term or once a year.”

**Verdict:** Missing

No scheduler, notification channel, parent account, or recurring report workflow was found.

Evidence:

- `frontend/src/pages/landing/Landing.tsx:331-355`
- `frontend/src/types/index.ts:1`

## P1 findings

### C10 — Save PDF report

**Claim:** “Save PDF report.”

**Verdict:** Partial

The button calls `window.print()`. A user may choose “Save as PDF” in a browser print dialog, but EduVibe does not create or download a PDF itself. The label omits that dependency.

Evidence:

- `frontend/src/pages/learner/Dashboard.tsx:76-78`
- `frontend/src/pages/learner/Dashboard.tsx:112-120`

### C11 — Modality preference can be changed later

**Claim:** “Pick one. You can change this later.”

**Verdict:** Partial

The preference is persisted and can be updated through the backend profile endpoint, but no learner settings or other visible change-preference UI was found after the one-time prompt.

Evidence:

- `frontend/src/components/learner/ModalityPreferencePrompt.tsx:60-65`
- `backend/learner/controllers/adaptiveController.js:24-36`
- `frontend/src/App.tsx:217-248`

### C12 — The system learns from quiz performance by modality

**Claim:** “We also learn from how you do on quizzes.”

**Verdict:** Matches

Adaptive selection loads successful modalities per outcome and applies a modality bonus, falling back to the learner’s explicit preference when there is no per-outcome signal.

Evidence:

- `frontend/src/components/learner/ModalityPreferencePrompt.tsx:63-65`
- `backend/learner/controllers/adaptiveController.js:337-340`
- `backend/learner/controllers/adaptiveController.js:377-385`
- `backend/learner/services/adaptiveQuizService.js:144-162`
- `backend/learner/services/adaptiveQuizService.js:232-233`

### C15 — Curriculum structure is automatically extracted on PDF upload

**Claim:** Strands and sub-strands “are automatically extracted when you upload a PDF.”

**Verdict:** Partial

Creating or updating a subject with a remote PDF URL triggers best-effort parsing and saves the extracted structure. Parsing is non-blocking, can fail while the subject request still succeeds, and only works for a valid remote URL; the UI also exposes a manual parse flow.

Evidence:

- `frontend/src/pages/admin/Lessons.tsx:373-377`
- `frontend/src/pages/admin/Lessons.tsx:444-448`
- `backend/admin/controllers/subjectController.js:14-25`
- `backend/admin/controllers/subjectController.js:28-65`
- `backend/admin/controllers/subjectController.js:147-169`

### C16 — Past papers ground quizzes without copied wording

**Claim:** Past papers ground AI quizzes and the AI matches difficulty and distractor style “without copying wording.”

**Verdict:** Partial

The generation path retrieves grade/topic/Bloom-filtered quiz exemplars and checks generated stems for near-duplicates. However, an empty or undersized bank falls back to ungrounded generation, and near-duplicates are flagged for admin review rather than prevented. “More accurate” is not measured by the application.

Evidence:

- `frontend/src/pages/admin/KnowledgeBank.tsx:21-44`
- `backend/admin/services/knowledgeRetrieveService.js:216-286`
- `backend/admin/services/knowledgeRetrieveService.js:329-377`
- `backend/admin/services/lessonGenerationService.js:875-903`
- `backend/admin/services/lessonGenerationService.js:1227-1284`

### C17 — Quiz percentage meaning

**Claim by presentation:** The learner-facing session percentage is shown as the quiz result without explaining its basis.

**Verdict:** Missing

The percentage includes main-phase first attempts only; retry answers are excluded and counted separately. Pass/completion compares that first-try percentage with at least a 60% floor. This is intentional, but the learner-facing result does not clearly state “first try.”

Evidence:

- `backend/learner/services/adaptiveQuizService.js:314-320`
- `backend/learner/services/adaptiveQuizService.js:400-465`
- `backend/learner/controllers/adaptiveController.js:457-462`
- `docs/quiz-systems-audit.md:88-107`

## P2 findings and verified claims

### C13 — Lesson generation uses Gemini

**Claim:** “Generating lesson with Gemini…”

**Verdict:** Stale

The lesson generation provider defaults to Claude and the controlled Tier 1 run used `claude-sonnet-5`. Gemini remains an optional provider, so naming it unconditionally is incorrect.

Evidence:

- `frontend/src/pages/admin/Lessons.tsx:20-25`
- `backend/providers/contentProvider.js:74-104`
- `docs/first-claude-generation-g3-science.json:37-108`

### C14 — Curriculum PDF parsing uses Gemini

**Claim:** “Sending content to Gemini AI…”

**Verdict:** Matches under the default configuration

The curriculum parser gets the configured Gemini-compatible model and calls `generateContent` to extract curriculum JSON. The wording would become stale if `AI_PROVIDER` is changed to another supported provider.

Evidence:

- `frontend/src/pages/admin/Subjects.tsx:16-21`
- `backend/admin/services/pdfParserService.js:1`
- `backend/admin/services/pdfParserService.js:71-76`
- `backend/admin/services/pdfParserService.js:147-160`
- `backend/config/ai.js:153-204`

### C18 — “Mastered this topic”

**Claim:** The learner is told “You’ve mastered this topic.”

**Verdict:** Matches

The message is only selected when every outcome key for the lesson has fresh `skill_mastery.status === "mastered"`. It is not inferred from one high session percentage.

Evidence:

- `frontend/src/pages/learner/LessonView.tsx:106-110`
- `backend/learner/controllers/adaptiveController.js:514-529`
- `docs/quiz-systems-audit.md:90-95`

### C19 — Complete the previous lesson to unlock

**Claim:** “Complete previous lesson to unlock.”

**Verdict:** Matches, with a terminology caveat

Sequential unlock behavior is implemented. In practice, “complete” means the previous lesson is marked completed or has progress at/above the 60% gate, not necessarily 100%.

Evidence:

- `frontend/src/pages/learner/Lessons.tsx:210-212`
- `frontend/src/pages/learner/Lessons.tsx:301-307`
- `backend/learner/controllers/learnerController.js:465-466`
- `docs/quiz-systems-audit.md:97-107`

## Recommended review order

This audit intentionally makes no copy changes. Recommended founder decisions, in order:

1. Decide whether the launch positioning is learner self-study or a future teacher/parent analytics product. Until the latter exists, the landing page should not promise parent delivery, classroom capture, class dashboards, or exports.
2. Hide or clearly label Recommendations and Daily Exercise as previews until they are backed by learner data and working actions.
3. Decide whether browser printing is acceptable for the “Save PDF” label.
4. Add a visible way to change modality preference, or remove “You can change this later.”
5. Explain “first-try score” wherever the adaptive percentage affects completion or unlock.
6. Make provider progress copy generic (“Generating lesson…”) unless the UI reads the active provider.
7. Qualify knowledge-bank claims: grounding applies only when eligible exemplars are found, and similarity checking flags rather than guarantees no copied wording.

## Out of scope

- No landing, learner, or admin copy was rewritten.
- No mock feature was hidden or implemented.
- No scoring, mastery, unlock, role, notification, or export behavior was changed.
- No parent or teacher architecture was added.
