# Learner presentation audit — how questions are actually shown

**Date:** 2026-08-15
**Follows:** [`docs/quiz-generation-full-audit.md`](quiz-generation-full-audit.md) Part B3 (which named the one renderer). This report walks what that renderer *feels like*, moment by moment.
**Method:** Static walk of the live learner path. No code was changed. Copy is quoted, not paraphrased.
**Scope:** What a learner sees from opening a lesson to finishing its quiz. Admin review UI is out of scope except where a field exists only there.

There is no `QuizSession` component and no `QuestionCard` component. The entire learner quiz is [`AdaptiveQuizPanel.tsx`](../frontend/src/components/learner/AdaptiveQuizPanel.tsx) plus [`TapSelectOptions.tsx`](../frontend/src/components/learner/TapSelectOptions.tsx), mounted from [`LessonView.tsx`](../frontend/src/pages/learner/LessonView.tsx). There is no `/learner/quiz/...` route. Quiz is a section of `/learner/lessons/:id`.

---

## PART A: The session, step by step

### 1. Entry

A learner reaches a lesson from the lessons grid (`"Start Lesson"`), dashboard recents, recommendations, scaffold/similar/next links, or a retake link. All of those land on `/learner/lessons/:id` ([`App.tsx`](../frontend/src/App.tsx) lines 233–239). There is no dedicated quiz entry.

On load, `LessonView` fetches the lesson, then paints a single long page:

1. `"Back"`
2. Lesson title, description, `"Grade {n}"`, difficulty pill, `"{lesson.duration} minutes"`, `contentType`, tags
3. Optional banner, only when preferred modality is not `mixed`:

> Practice mode: {Visual | Step-by-step | Practice}. Questions mix styles; we lean toward what has worked for you on this topic

4. Teaching body (or a stub — see below)
5. A `border-t` then the quiz panel

There is **no** “Start quiz” button, **no** instruction screen, **no** “are you ready?” gate. Comment at [`LessonView.tsx`](../frontend/src/pages/learner/LessonView.tsx) line 504: `Quiz Section — live one-by-one; review = all answers at once`. If `lesson.quiz` has a `questionCount` (or `questions.length`) greater than zero, `AdaptiveQuizPanel` mounts and immediately `POST`s `/learner/lessons/:id/adaptive-start`.

While that call is in flight the learner sees a spinner and:

> Preparing your quiz…

If the call fails:

> Failed to start quiz

(or the server error message)

If the bank is empty after start:

> No quiz questions available.

If `lesson_progress.session_review` already exists, start returns `mode: 'review'` and the panel never enters a live session. Backend comment, [`adaptiveController.js`](../backend/learner/controllers/adaptiveController.js) lines 382–384:

> If they already finished an attempt, show review (answers + corrections). Do NOT require progress.completed — that is pass/fail only; a finished but below-threshold attempt still has session_review and must not force a retake.

There is no same-lesson retake control on this page. A finished attempt, pass or fail, is review-only forever from this UI.

The quiz session (and the first question’s silent `responseTimeMs` clock) starts as soon as the first `TapSelectOptions` mounts. That is the same moment the teaching content above becomes visible. If the learner is still reading the lesson, the timer for question 1 is already running.

Teaching stubs the learner can hit before the quiz, quoted:

- Video lessons: `"Video Lesson"` / `"Video player will be integrated with backend"` / `"URL: {lesson.videoUrl}"`
- Empty content: `"Interactive Content"` / `"Interactive content will be displayed here"`

Neither blocks the quiz from auto-starting underneath.

A one-time dashboard modal (`ModalityPreferencePrompt`) can have run earlier in the product, not on this page:

> How do you like to learn?
> Pick one. You can change this later — we also learn from how you do on quizzes.

Options: `"Pictures & diagrams"`, `"Step-by-step text"`, `"Lots of practice"`, `"A bit of everything"`. CTA: `"Continue"` / `"Saving..."`. That preference is used server-side when picking the next question. It is passed into `AdaptiveQuizPanel` as `preferredModality` and then ignored by the panel (the prop is on the interface, not in the destructure).

---

### 2. Per-question presentation

Five UI states exist in `AdaptiveQuizPanel` (loading, error, review, empty, live). Live and review share one question assembly. Live layout, top to bottom:

**Header (outside the card)**

- Title: `"Quiz: {lesson.quiz.title || 'Practice'}"`. Default title from sanitize is `"Quiz Challenge"` when the bank has a title; the UI fallback if title is missing is `"Practice"`.
- Counter: server `progressLabel`, or `"…"` if meta has not arrived.
- A 12px-tall rounded bar.
- If `meta.phase === 'retry'` only:

> Retry round — questions you missed

**White card** (`p-5 rounded-[16px] border-2 border-slate-200 bg-white space-y-3`)

1. Badge row (optional):
   - Modality pill, violet, 10px: `"Visual"` / `"Step-by-step"` / `"Practice"` ([`modalityQuiz.ts`](../frontend/src/lib/modalityQuiz.ts); unknown values also become `"Practice"`).
   - Bloom pill, slate, 10px, CSS `capitalize` on the raw string: `"recall"` / `"understand"` / `"apply"` / `"reason"`.
2. If `steps[]` is non-empty: amber numbered `<ol>`, each line through `MathText`. Read-only.
3. If `resolveDiagramUrl(diagramBriefId)` returns a URL: a centered `<img className="max-h-52 mx-auto …">` with `alt=""`.
4. Stem: `MathText` as a `<p className="text-lg font-bold">`.
5. `TapSelectOptions`: full-width lettered buttons `"A."` `"B."` `"C."` `"D."` plus option text.
6. On incorrect flash only: `"Correct answer: {letter}. {explanation}"`.
7. While submitting and flash has not arrived: spinner + `"Checking…"`.

That is the entire live question. There is no per-question enter/exit animation. The next question is a React state replace after 650ms (`setTimeout` in `handleSelectAndSubmit`). `StaggeredEntry` GSAP fade runs once on page load for the lesson shell, not between questions.

`skillFocus` and `points` are on the live payload and are not rendered. `type` is sent as `'multiple-choice'` and is not even declared on the panel’s `AdaptiveQuestion` type. Twin flags (`isTwistedVariant`, `twinPairId`, `twinOf`) are sent for Grade 1 addition twists and are not read by the UI.

---

### 3. Answering

Comment in the panel, line 135:

> Tap an option → submit immediately (no separate Submit button).

There is no Submit control. There is no way to change an answer. The tap is the submit.

Sequence on tap:

1. Guard: ignore if already submitting or a flash is showing.
2. Selected button goes to primary highlight (`border-primary-400 bg-primary-50`).
3. `"Checking…"` appears under the list. Buttons disable (`disabled:cursor-not-allowed`).
4. `POST …/adaptive-next` with `{ session, selectedOptionIndex, responseTimeMs }`.
5. On success, `flash` is set from `lastAnswer`. The **selected** button only turns emerald (`border-emerald-400 bg-emerald-100`) or red (`border-red-400 bg-red-100`). Other options do not change.
6. If the session is not done: wait **650ms**, swap the question, clear selection and flash.
7. If the session is done: skip the wait, unmount the live card, mount review. The last answer’s flash is never seen.

The only motion on the button itself is `active:scale-[0.99]` plus `transition-all`. There is no sound anywhere on this path (no `Audio`, Howl, or sfx in `frontend/src` for quizzes).

Hover exists (`hover:border-primary-300`). That is a desktop affordance on a tap-to-submit control.

---

### 4. Correct vs incorrect feedback

**Live, correct.** Color change on the tapped button. No `"Correct"`. No check icon. No `"Well done!"`. No explanation. 650ms later the next question replaces it.

**Live, incorrect.** Tapped button goes red. Under the list, 12px emerald text:

> Correct answer: B. {explanation}

`{letter}` is `A`–`D` from `correctAnswerIndex`. `{explanation}` is `question.explanation` (generation cap: 16 words). If explanation is empty, only the letter line shows. The actual correct option button is **not** highlighted during live flash — only the learner’s wrong tap is.

**Last item of the session.** `if (res.meta?.done && res.review)` sets `mode` to `'review'` in the same tick as `setFlash`. The live card unmounts. Whatever the last tap was, the learner does not see the 650ms flash for it.

**Fields that exist and are not shown live**

| Field | Stored default / source | Live UI |
|---|---|---|
| `feedbackCorrect` | `'Well done!'` ([`lessonGenerationService.js`](../backend/admin/services/lessonGenerationService.js) line 479) | Not on `publicQuestion`. Never rendered. |
| `feedbackIncorrect` | `'Review this skill and try again.'` (line 480) | Same. |
| `optionExplanations` | Expanded from distractors; returned on `lastAnswer` | Frontend never reads it. |
| `distractors[].misconception` | Generation cap 8 words | Used when recording skill attempts, never shown. |
| `reviewRationale` | Admin-only, 20–30 words per option | Not on `publicQuestion`, not on `buildReviewView`, not on `sanitizeQuizForLearner`. Does not leak. |

Review mode later shows `explanation` in a white box under the options, and chips `"Your answer"` / `"Correct"` on the option rows. It still does not render `feedbackCorrect`, `feedbackIncorrect`, or `optionExplanations`, even though the last two are in the review JSON.

---

### 5. Retry flow

Retry is automatic after the main phase (and any pending Grade 1 addition twins). There is no “Retry” button.

When `meta.phase === 'retry'`:

- Counter becomes `"Retry {i} of {n}"` (server, [`adaptiveQuizService.js`](../backend/learner/services/adaptiveQuizService.js) lines 742–743).
- Bar fill switches to amber and is **hardcoded to 85% width**.
- Banner: `"Retry round — questions you missed"`.

The question card is otherwise identical: same badges, same optional steps/diagram, same stem, same lettered buttons, same instant submit, same 650ms flash.

Server pick ([`pickRetryQuestion`](../backend/learner/services/adaptiveQuizService.js) lines 291–331): prefer a sibling of the failed item (same outcome, same-or-lower Bloom, unseen), with `text_steps` preferred on ties; else replay the original verbatim. The learner is not told “this is a new item on the same skill” vs “this is the same question again.”

**Twin / “Practice check”.** Grade 1 addition templates can inject a twisted numeric variant after a miss or a fast correct. The only learner-visible difference is the counter string `"Practice check"`. There is no banner analogous to retry. Twins strip `diagramBriefId` and `steps` and force `modality: 'practice'`, so they look like a plain Practice question. The UI never reads `isTwistedVariant`. The learner is not told this is a consistency check, and `responseTimeMs` (the trigger) is never shown.

---

### 6. Progress indication

There is a counter and there is a bar. Neither is a faithful “how much is left.”

**Counter (`progressLabel`), server-authored:**

| Situation | Copy |
|---|---|
| Empty bank | `"No questions"` |
| Start / main | `"Question {n} of {mainTarget}"` |
| Twin | `"Practice check"` |
| Retry | `"Retry {i} of {n}"` |
| Done | `"Complete"` |

`mainTarget` is 10, or the full bank if the bank is ≤10, or at most 12 ([`targetMainLength`](../backend/learner/services/adaptiveQuizService.js)). Retries and twins are extra items **after** that count, so `"Question 10 of 10"` can be followed by `"Practice check"` and then `"Retry 1 of 3"`. The main counter never advertised those.

**Bar, live:**

- Main: `((mainAnswered + 0.3 if an option is selected) / mainTarget) * 100`, then **capped at 95%**. It never fills on the last main item.
- Retry: width `85`, always. Completing retries does not move it.
- Review: width = score percentage (a result bar, not a progress bar).

`progressPct()` exists for review/score. The live bar does not use it.

---

### 7. Session end / review mode

On the last successful `adaptive-next` with `meta.done`, two things happen at once:

1. The panel replaces itself with review.
2. `LessonView.handleAdaptiveSessionComplete` sets `showResults` and paints a second block **below** the now-review panel.

**Review header, quoted:**

> Review mode
> Score: {correct}/{total} ({percentage}%) · {n} retry / retries
> Your choices and corrections for this lesson. Read-only.

The `· N retry(s)` clause only appears when `retryCount > 0`. The percentage is **first-try (main phase) only**. Comment in code: `First-try (main phase) score only — retries excluded from percentage (Option C).` The learner-facing strings never say “first try.” This matches [`docs/copy-vs-reality-audit.md`](copy-vs-reality-audit.md) C17.

Pass/completion on the client and server uses `Math.max(lesson.quiz?.passingScore || 60, 60)` — a 60% floor. Review does not print “Passed” or “Failed.” Those words do not appear. The CBC-band card below is the pass/fail theatre.

**Each review item, top to bottom:**

- `"Q{n}"` (1-based index in the review list, not the live order label)
- Modality pill (same as live). Bloom is on the payload (`ReviewItem.bloomLevel`) and **is not rendered** in review.
- Right-aligned `"Correct"` (CheckCircle) or `"Incorrect"` (XCircle)
- Optional amber `steps[]` list
- Optional diagram, `max-h-48`, `alt=""`
- Stem
- Option rows as `<div>`s, not buttons:
  - Correct option: emerald + chip `"Correct"`
  - Learner’s wrong pick: red + chip `"Your answer"`
  - Others: white
- `explanation` in a bordered white box, if present

`phase` (`main` / `retry` / `twin`) is on each item and unused. Twins that used `questionSnapshot` can appear as extra `Qn` cards with no label that they were practice checks. Review keeps the last attempt per `questionId`, so a retry of the same id overwrites the first try in the list.

**CBC-band card under review** (`LessonView.getPerformanceMessage`). Title is `"{band} {sessionPct}%"`:

| Band | Title | Message |
|---|---|---|
| `< 25%` | `Below Expectations` | `You got {n}%! Don't worry, everyone learns at their own pace. Let's try some easier exercises to help you understand better!` |
| `< 50%` | `Approaching Expectations` | `Great effort! You got {n}%. You're getting there! Try these practice exercises to help you master this topic.` |
| `< 75%` | `Meeting Expectations` | `Awesome work! You got {n}%. You understand this topic well! Ready for the next challenge?` |
| else | `Exceeding Expectations` | `Wow! You got {n}%! You're doing amazing! You've mastered this topic. Let's move on to something new!` **or** `Wow! You got {n}%! You're doing amazing! Keep practicing to lock in mastery. Let's move on to something new!` |

Then:

> Scroll up to see every question and your choices in review mode.

That instruction is inverted relative to layout: review is **above** this card. The learner who has just been dumped into review is already looking at it; the card they are reading tells them to scroll up.

Further blocks that may appear, quoted:

- `"Skills to practice"` — list of `skillFocus`, with `" (we will scaffold this down a grade)"` when `consecutiveFails >= 2`
- `"Confidence builder (Grade {n})"` / `"You missed this skill twice at your grade. Try this lower-grade lesson next, then come back stronger."` / `"Open: {title}"`
- `"Practice from a lower grade"` — similar-lesson links, or `"No practice exercises available at the moment. Keep practicing with what you have!"`
- `"Great Progress!"` / `"You've completed the practice exercise! Now retake the lesson you struggled with earlier. You need to score at least 60% to proceed."` / `"Retake: {title}"` — this retake is a **different, previously failed** lesson, not this one
- `"What's Next?"` / `"Continue with more lessons in this topic:"` / `"Go to Next Topic"` / `"Explore Other Subjects"` / `"Great job! You've completed all available lessons in this topic. Take a break and explore other subjects!"`

Returning to a completed lesson (`isCompleted` or `progress >= 60`) shows the results card immediately while the panel boots into review. The learner cannot play the quiz again from here.

---

### 8. Diagrams in practice

Quiz diagrams are **not** the teaching-diagram component. Teaching uses [`LessonTeachingBlocks`](../frontend/src/components/learner/LessonTeachingBlocks.tsx): `<figure>`, `alt={asset.alt || brief || 'Lesson diagram'}`, italic caption, and if the asset is missing:

> Diagram pending approval{`: ${brief}`}

Quiz uses a bare `<img>` inside the question card.

**Position.** In the vertical stack, after steps and before the stem. Centered, `max-h-52` live / `max-h-48` review, not beside the stem, not overlapping. One column.

**Loading.** None. No skeleton, no spinner, no `onLoad` / `onError`. The browser fetches the URL; until then the `img` is an empty box of unknown height.

**Null URL.** `resolveDiagramUrl` ([`LessonView.tsx`](../frontend/src/pages/learner/LessonView.tsx) lines 50–61) returns `null` when there is no `briefId`, no matching asset `url`, and no index fallback into `images`. The panel then skips the `<img>` entirely:

```ts
const diagramUrl = resolveDiagramUrl?.(question.diagramBriefId)
// …
{diagramUrl && ( <img src={diagramUrl} alt="" … /> )}
```

A `modality: 'visual'` question whose asset is missing still shows the `"Visual"` badge and no figure. The learner is told it is visual and is given nothing to look at. Teaching, on the same lesson, would have shown the dashed pending box.

`alt=""` on both live and review quiz images. A screen reader skips them.

---

### 9. `steps[]` (text_steps modality)

Rendered when `question.steps` is a non-empty array, independent of the modality badge. `modality: 'text_steps'` without `steps` is a badge only.

Display: a static `<ol className="list-decimal">` in `bg-amber-50 border-amber-100 rounded-[12px] p-3`. Each step is `MathText`. No collapse, no “show next step”, no tap-to-reveal, no worked-example playback. Pure read-only text above the diagram and stem.

Generation asks for `steps[] (max 3 short steps)` on `text_steps` questions. The learner experience of that modality is: an extra amber box of prose, then the same option list as every other question.

---

### 10. Timing

Nothing about time is shown during the quiz.

- `TapSelectOptions` records `responseTimeMs = performance.now() - shownAtRef` from mount-of-this-`questionKey` to tap, and posts it. Used server-side for Grade 1 addition twin heuristics (`TWIN_TIMING_HEURISTIC.coldStartMs = 1200`, `fastRatio = 0.35`). The learner never sees a number, a “too fast”, or a pace cue.
- `quiz.timeLimit` is copied onto the sanitized lesson quiz (`timeLimit: quiz.timeLimit ?? 12`) and is not read by `AdaptiveQuizPanel`.
- The Clock icon in the lesson header is `"{lesson.duration} minutes"` — lesson length, not a countdown, not `timeLimit`.
- There is no per-question timer and no session countdown.

---

### 11. Mobile / small-screen behavior

Considered only as Tailwind leftovers, not as a quiz layout.

Present:

- Option buttons: `min-h-12` (48px), `w-full`, `touch-manipulation`, `active:scale-[0.99]`
- Quiz title: `text-2xl sm:text-3xl`
- Lesson shell: `p-4 sm:p-5 md:p-6`, `rounded-[24px] md:rounded-[32px] lg:rounded-[40px]`, `max-w-4xl`
- Results cards: `flex-wrap`

Absent:

- Any quiz-specific breakpoint that changes the question shape
- Side-by-side diagram + options on large screens (always stacked)
- Landscape handling
- Sticky progress / sticky stem
- Tests (`AdaptiveQuizPanel` / `TapSelectOptions` have no `*.test.*` / `*.spec.*` files)

It is a single full-width column that happens to have 48px tap targets. Desktop-first stacked card, shrunk.

---

## PART B: Honest critique

### 1. Static / non-interactive beyond tap-and-wait

The founder’s complaint that presentation feels outdated and tiresome is describing the actual architecture, not a mood.

**Every live question, regardless of content, modality, Bloom, subject, twin, or retry, is the same card:** badges, optional amber steps, optional image, stem, lettered option buttons. Confirming Part B3 of the generation audit, not softening it: one assembly. The optional pieces do not make a different interaction. They decorate the same box.

Concrete evidence of “tap and wait”:

- No drag, drop, fill-in, cloze, true/false control, short-answer field, diagram labeling, ordering, or multi-select. Admin authoring offers `"True/False"` and `"Short Answer"` ([`LessonFormModal.tsx`](../frontend/src/components/modals/LessonFormModal.tsx) lines 474–476); the learner renderer would still print them as an option list, because it never reads `type`.
- No separate submit. Tap is commit. Wait for `"Checking…"`. Wait 650ms. Next identical card.
- `steps[]` cannot be interacted with.
- The diagram cannot be interacted with (no hotspots, no zoom, no “what is this part?”).
- Review is the same list as non-clickable divs.
- Session length is typically 10–12 mains plus retries/twins, each in that shape.

The only visual variety between two consecutive questions is: (a) different stem text, (b) whether an amber box and/or an image happened to be present, (c) which 10px pill says Visual / Step-by-step / Practice / recall / apply. That is not a different question shape.

Fine-as-is, stated plainly: instant tap-to-submit is implemented as designed (the code comment says so). Retry **does** have a distinct banner and amber bar. Those two things work. They do not change the question card.

---

### 2. Missing feedback / affordances a modern quiz would typically have

Listed as current absences, not as a spec:

- **Start gate.** Quiz auto-starts, including the question-1 timer, while the lesson is still on screen.
- **Honest remaining work.** Main counter ignores retries/twins. Bar capped at 95% then stuck at 85% in retry.
- **Encouraging micro-copy on a correct tap.** `feedbackCorrect: 'Well done!'` is stored and discarded. Live correct is a green border for 650ms.
- **Why the wrong option is wrong.** `misconception` (8 words) and `optionExplanations` and `reviewRationale` all exist in the bank. The live incorrect line is the correct letter plus a ≤16-word `explanation`. The wrong option is not explained.
- **Highlighting the right option when the learner missed.** Live flash colors only the tap. Review does highlight the right option — after the session is over.
- **Last-answer feedback.** Dropped.
- **Pacing / momentum.** Fixed 650ms, then a hard cut. No streak, no “3 in a row”, no sound, no motion beyond `active:scale-[0.99]`.
- **Visual variety by question type.** None. See B4.
- **Pause, skip, go back, change answer.** None.
- **Same-lesson retry.** Explicitly refused once `session_review` exists.
- **Visible timer, or a clear statement that there isn’t one.** `timeLimit` sits on the payload unused. Duration in the header is the lesson clock, which is easy to misread as quiz time pressure.
- **First-try scoring disclosed.** The number on screen is first-try; the copy is `"Score: C/T (P%)"` and `"You got {n}%"`.
- **Celebration inside the quiz panel.** Pass/fail theatre is a second card under review, plus `"Scroll up…"`.
- **Inert chrome nearby.** Dashboard `"Daily Exercise"` / `"Are you ready for the daily exercise?"` / `"Start Now"` has no `onClick`. [`AvailableQuizzes`](../frontend/src/components/learner/AvailableQuizzes.tsx) (`"Available Quizzes"`, `"{n} questions"`, `"{duration}m"`) is never imported.

---

### 3. Incomplete or half-built

No `TODO` / `FIXME` / `XXX` / `HACK` in the learner quiz components. The unfinished work is unused fields and dead UI, not marked stubs.

| Item | What exists | What the learner gets |
|---|---|---|
| `feedbackCorrect` / `feedbackIncorrect` | Defaults written on every generated question; included in `buildReviewView` | Never rendered. `ReviewItem` does not even declare them. |
| `optionExplanations` | On `lastAnswer` and review items | Typed on `ReviewItem`, never rendered. |
| `preferredModality` on `AdaptiveQuizPanel` | Required prop from `LessonView` | Not destructured. Dead argument. |
| `getAdaptiveReview` | Client method + `GET …/adaptive-review` | Panel only uses start/next. |
| `AvailableQuizzes` | Full component | Unmounted. |
| Daily Exercise `"Start Now"` | Button with press animation | No navigation. |
| `"Interactive content will be displayed here"` / `"Video player will be integrated with backend"` | Visible copy on the lesson page | Unfinished teaching body, same page as the quiz. |
| Admin `true-false` / `short-answer` | Form `<option>`s | Learner still sees MCQ buttons. |
| `QuizQuestion.type` | Hardcoded `'multiple-choice'` at normalize (line 471); comment in types: `// Quiz Question - Multiple Choice Only` | Unread by the renderer. |
| `isTwistedVariant` | On `publicQuestion` for twins | Unread. Twin looks like Practice. |
| `skillFocus`, `points` | On live payload | Unread in live UI. `skillFocus` appears later under `"Skills to practice"`. |
| Review `phase` | On each item | Unread. |
| `quiz.timeLimit` | Sanitized onto the lesson | Unread. |
| `modalityMixText` | Now interpolated into the **generation** prompt (`MODALITY MIX for ${subject}: …`). [`quiz-generation-full-audit.md`](quiz-generation-full-audit.md) §A calling it dead is stale as of this branch. | Still unused in presentation. A generation mix is not a learner mix of shapes. |
| Knowledge `question_type` | Eight-value taxonomy on ingested chunks | RAG only. See Part C. |

`reviewRationale` isolation is complete on the learner path (generation prompt, sanitize, `publicQuestion`, `buildReviewView` all keep it off). That part is finished and fine.

---

### 4. How many distinct visual shapes?

**One.**

Not “one plus decorations that count as types.” One shape.

Evidence:

- [`AdaptiveQuizPanel`](../frontend/src/components/learner/AdaptiveQuizPanel.tsx) live return is a single JSX tree: badges → steps → img → stem → `TapSelectOptions`. There is no `switch (question.type)`, no `switch (question.modality)` that picks a different component, no `interactionType`.
- `TapSelectOptions` is `options.map` → lettered `<button>`. That is the interaction.
- Review is the same tree with `<div>` instead of `<button>`.
- `modality` changes a 10px label and whether `steps` / `diagramBriefId` were likely populated. It does not change the layout component.
- `bloomLevel` changes a 10px label.
- Subject does not enter the renderer at all.
- Combinations (plain / +steps / +diagram / +both) are optional slots on the same card, like optional fields on a form. They are not four products.

Part B3 of the generation audit already said this. Walking the session does not find a second shape it missed. After Phase 1, `TapSelectOptions` extracted the option list and added a silent timer; it did not add a second interaction.

---

### 5. Accessibility gaps (beyond Phase 1 on `TapSelectOptions`)

**Present, and fine as far as they go:**

- `role="group"` `aria-label="Answer choices"`
- `aria-pressed={selected}`
- Native `<button>` (Enter/Space when focused)
- `focus-visible:ring-4 focus-visible:ring-primary-200`
- `min-h-12` tap targets
- `touch-manipulation`

**Missing on the rest of the session:**

- Quiz diagrams: `alt=""`. Teaching diagrams on the same lesson have real alt text. A visual question is invisible to a screen reader except for the stem.
- No `aria-live` (or `role="status"`) for `"Checking…"`, for the green/red flash, or for `"Correct answer: B. …"`. Those updates are visual only.
- Live correct/incorrect is color on the selected button. Review adds icons + `"Correct"` / `"Incorrect"` text; live does not.
- No roving tabindex, no arrow-key move between options, no 1–4 / A–D shortcuts. Keyboard users Tab through every option, every question.
- No session-level keyboard path (no “next” because next is automatic; no “skip”).
- Review options are non-focusable `<div>`s. Fine for read-only if the stem and explanation are in the reading order; the letter chips are text, so that part is readable.
- Stem has no extra accessible name. KaTeX is injected with `dangerouslySetInnerHTML`. Whatever KaTeX emits is the accessible math; there is no plain-language fallback on the quiz card.
- `"Preparing your quiz…"` / error / `"No quiz questions available."` are plain text, which is fine.
- Color contrast of 10px violet/slate pills and 12px `"Correct answer:"` was not measured here. The live incorrect reveal is `text-xs text-emerald-800` — small, and emerald, used to announce the right answer after a miss.

---

## PART C: What would have to exist for a genuinely different visual shape

No redesign. Architecture facts only.

### 1. Is the rendering path flexible today?

No. It is hardcoded to one layout.

The live question is not dispatched. It is this sequence in [`AdaptiveQuizPanel.tsx`](../frontend/src/components/learner/AdaptiveQuizPanel.tsx) (lines 404–455): badge row, optional `<ol>` of steps, optional `<img>`, `MathText` stem, `TapSelectOptions`. `TapSelectOptions` only knows `options: string[]` and an index callback.

`publicQuestion` ([`adaptiveQuizService.js`](../backend/learner/services/adaptiveQuizService.js) lines 119–140) always sends `question`, shuffled `options`, and optional `steps` / `diagramBriefId`. It always omits the answer key. It always includes `type: q.type || 'multiple-choice'`. The panel’s `AdaptiveQuestion` type does not include `type`, so even that one-value field cannot branch the UI today.

Putting different content into `question` / `options` / `steps` / an image URL changes what is *inside* the box. It does not change the box. A fill-in, a labeled diagram, a true/false pair, or a worked example that reveals step-by-step cannot be expressed through this tree without adding a branch that does not exist.

### 2. Where a “question type” / “interaction type” would have to be introduced

Confirming the generation audit, against the current tree:

**`interactionType` does not exist.** Zero occurrences in backend, frontend, SQL, or types. Phase 1 prose in `docs/tier2-phase1-verification.md` names the interaction `tap-select`; that string is not a stored field.

**Lesson-quiz `type` is one value.** `normalizeQuiz` writes `type: 'multiple-choice'`. Frontend types: `type?: 'multiple-choice'` under `// Quiz Question - Multiple Choice Only`. The learner UI never reads it. Admin `true-false` / `short-answer` are form chrome against that union.

**Knowledge-bank `question_type` is a different system.** Ingest taxonomy ([`knowledgeIngestService.js`](../backend/admin/services/knowledgeIngestService.js) line 198):

> `multiple_choice`, `short_answer`, `essay`, `fill_in_blank`, `true_false`, `diagram_labeling`, `calculation`, `not_a_question`

Stored on `knowledge_chunks.question_type`. Used to label past-paper chunks and to bias exemplar retrieval (`retrieveQuizExemplars` may filter foundation to `multiple_choice`). It is **not** copied onto lesson quiz questions and **not** read by `AdaptiveQuizPanel`. It is easy to mistake for a learner rendering type. It is not one.

**`modality` is not a question type.** `visual` | `text_steps` | `practice` drives selection weighting, a badge, and whether `steps` / a diagram were attached. Same card.

**Natural insertion point in the current code, as a fact about where a new field would have to flow:**

1. Stored on the question in the lesson quiz JSON (today: `QuizQuestion` in [`frontend/src/types/index.ts`](../frontend/src/types/index.ts) and the object `normalizeQuiz` writes).
2. Included in `publicQuestion` so the live client actually receives it (today the client drops `type` on the floor).
3. Branched in `AdaptiveQuizPanel` live (and the review copy of that markup in the same file). Until a branch exists there, every served question is an option list.

`sanitizeQuizForLearner` strips stems and options from the lesson GET; interaction would still have to travel on the adaptive start/next payloads, which is the only place a question is fully served.

Until that field exists and that branch exists, a richer knowledge-bank content structure can store whatever taxonomy it wants — the learner will still sit through stem, then A/B/C/D, then `"Checking…"`, then 650ms, then the same card again.
