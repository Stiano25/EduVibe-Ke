# Grade 1 UI/UX audit — current reality

**Date:** 2026-08-18
**Status:** Report only. No code changed.
**Method:** Reconstructed from the current workspace learner UI and backend, plus one real generated Grade 1 Addition lesson dump. This is not a live screenshot session and not a production-database walk. Where the generated dump and the template-backed path differ, both are quoted.

**Walked lesson (generated dump):** [`docs/measurements/after-g1-addition.json`](measurements/after-g1-addition.json) — title `"Adding a 2-digit Number to a 1-digit Number"`, grade `"1"`, generated 2026-08-11 against sub-strand `6566c510-80af-4ff9-a159-cd23a6ca70dc` (Numbers · Addition).

**Two tracks a Grade 1 child can actually hit:**

1. **Generated fixed-pool lesson** (the dump): teaching prose on the same page, then auto-starting MCQ quiz titled `"Quiz Challenge"`, first stem `"What is $45+3$?"`.
2. **Template-backed session** (current addition / subtraction / number-concept ladders): same page chrome, but first item is often `"Add."` / `"Subtract."` / `"Show this many."` with column digits or drag objects.

Grade 1 uses quest navigation (`usesQuestNavigation`: grade ≤ 5) in [`frontend/src/lib/complexityBands.ts`](../frontend/src/lib/complexityBands.ts).

Related earlier docs: [`docs/grade1-question-format-audit.md`](grade1-question-format-audit.md) (task formats vs CBC paper), [`docs/grade-banded-quiz-verification.md`](grade-banded-quiz-verification.md) (stem word counts). [`docs/learner-presentation-audit.md`](learner-presentation-audit.md) still claims there is no quiz sound — that is stale; live code has Web Audio tones.

---

## Part A — Notes / teaching content: how much reading is required today

### A1. Walk: open a Grade 1 Addition lesson → first question

The child is already signed in (login is adult chrome: `"Welcome back!"`, `"Sign in to access your dashboard"`, Email, Password — [`frontend/src/pages/landing/Login.tsx`](../frontend/src/pages/landing/Login.tsx)). From home they tap **Start** on the quest card, or a journey row, and land on `/learner/lessons/:id`.

**What is on that page, top to bottom, before they can tap an answer:**

1. Shell: `EduVibe`, subtitle `Learner`, nav `Dashboard` / `Lessons`, `Logout`.
2. Button `"Back"` with an ArrowLeft icon ([`LessonView.tsx`](../frontend/src/pages/learner/LessonView.tsx) lines 428–434).
3. Optional `"Pick a lesson"` dropdown of other unlocked titles ([`QuestLessonSwitch.tsx`](../frontend/src/components/learner/QuestLessonSwitch.tsx)).
4. Lesson title as an `<h1>`: **"Adding a 2-digit Number to a 1-digit Number"** (9 words). Grade, difficulty, duration, tags, and the description are hidden on the quest path (LessonView lines 444–481). The description in the dump is still stored — `"Learners add a 2-digit number and a 1-digit number without regrouping using place value."` — but a Grade 1 child does not see it here.
5. Teaching blocks, if `content` / `contentBlocks` exist. For this dump they do. Verbatim `contentBlocks` from the dump:

> When we add a 2-digit number and a 1-digit number, we only add the {{term:ones}}. The {{term:tens}} digit stays the same because we are not adding anything to the tens. For example, in $23+4$, the tens digit $2$ stays the same, and we add the ones: $3+4=7$, giving $23+4=27$.

> Let's look at another {{example:worked example}}: $45+3$. The tens digit $4$ does not change. We add the ones: $5+3=8$. So $45+3=48$.

> Now you try. What is $32+6$? Think about the tens and add only the ones.

That is **three paragraphs, about 85 words of teaching prose**, with two diagrams interleaved (`vb-1`, `vb-2`, `diagramType: "place_value"`). `{{term:ones}}` / `{{term:tens}}` render as bold; `{{example:worked example}}` as a highlight ([`MathText.tsx`](../frontend/src/components/ui/MathText.tsx)). There is no "skip notes" or "start quiz" control. The quiz is already mounting below.

6. Loading copy while adaptive start returns: **"Getting your questions…"** ([`AdaptiveQuizPanel.tsx`](../frontend/src/components/learner/AdaptiveQuizPanel.tsx) line 253).
7. Quiz header: **"Quiz: Quiz Challenge"** (see A4) and **"Question 1 of 10"** (template) or **"Question 1 of 12"** (large fixed pool).
8. First question body.

**Dump first question (generated bank, still MCQ):**

> What is $45+3$?

Options: `"48"`, `"47"`, `"49"`, `"50"` — each prefixed on screen with `"A."` `"B."` `"C."` `"D."` ([`TapSelectOptions.tsx`](../frontend/src/components/learner/TapSelectOptions.tsx) line 73).

**Template-backed first question (current addition ladder, typical):** stem rewritten to **`"Add."`** with a stacked column of the two addends and a digit pad ([`VERTICAL_ADDITION_INSTRUCTION`](../backend/utils/additionLayout.js) = `'Add.'`). Subtraction: **`"Subtract."`**. Number-concept drag: **`"Show this many."`** or **`"Count."`**. Addition drag: **`"How many is {a} plus {b}?"`**.

Before the first tap on the measured lesson, the child (or whoever is reading to them) has already faced: lesson title + ~85 words of notes + `Quiz: Quiz Challenge` + `Question 1 of N` + the stem + four lettered options. That is required reading, not decoration.

### A2. Is teaching content audio-narrated, autoplaying, or text-only?

**Text and diagrams only. No narration. No TTS. No autoplay speech.**

There is no `speechSynthesis`, no lesson audio URL, no read-aloud control on notes or stems. The Grade 1 generation prompt says *"One or two very short sentences a child can hear out loud"* ([`lessonGenerationService.js`](../backend/admin/services/lessonGenerationService.js) lines 1275–1280). Nothing in the learner app actually speaks those sentences.

The only sound in the learner experience is two Web Audio oscillator tones **after** an answer tap ([`frontend/src/lib/quizSound.ts`](../frontend/src/lib/quizSound.ts)). Lottie characters autoplay as **silent** visuals.

### A3. Structure actually implemented (not design intent)

**Notes then quiz, on one scroll. The quiz auto-starts. There is no separate "short instruction then question" screen.**

[`LessonView.tsx`](../frontend/src/pages/learner/LessonView.tsx) always renders `LessonTeachingFromLesson` above `AdaptiveQuizPanel` when `content` or `contentBlocks` exist (lines 509–543). `AdaptiveQuizPanel` calls `startAdaptiveQuiz` on mount (lines 81–117). There is no Start Quiz button.

Grade 1 **does** set `hideExplanationNotes={String(lesson.grade) === '1'}` ([`LessonTeachingBlocks.tsx`](../frontend/src/components/learner/LessonTeachingBlocks.tsx) line 135). That only drops lines whose text **starts with** `Mini Notes`, `Worked Example`, or `Practice Prompts` ([`LessonContentRenderer.tsx`](../frontend/src/components/learner/LessonContentRenderer.tsx) lines 37–96). The measured lesson never uses those headings, so **all three teaching paragraphs still render**.

Generation *intent* is now "show, do not explain" (same `buildLessonShellPrompt`). What the dump actually produced — and what the renderer would show — is a full notes block, then the quiz. Do not treat the prompt as the screen.

On the template-backed path, the **question** can be one word (`Add.`). The **page** still has notes above it if the lesson shell has content.

### A4. Every piece of required-reading text in a Grade 1 session, and whether it has a non-text alternative

| Copy (verbatim) | Where | Icon / audio alternative today? |
|---|---|---|
| `Dashboard` | Shell nav | LayoutDashboard icon; **label still required** |
| `Lessons` | Shell nav | BookOpen icon; **label still required** |
| `Learner` | Shell subtitle (sm+) | none |
| `Logout` | Shell | LogOut icon; **label still required** |
| `Good morning, {name}!` (or afternoon/evening) | WelcomeHeader | avatar letter only |
| `Grade 1` | WelcomeHeader | none |
| `How do you like to learn?` + four options + hints + `Continue` | ModalityPreferencePrompt (first visit; **not gated off for Grade 1**) | none — all text |
| Lesson title on quest card | QuestNextCard | Lottie character; **title is the target** |
| `Start` / `Keep going` | QuestNextCard | Play icon; short word still shown |
| `Pick a lesson` | QuestNextCard / QuestLessonSwitch | underline text, **no icon** |
| `All done for now.` / `Pick any lesson below.` | QuestNextCard empty | Lottie |
| `Your lessons` | Dashboard | none |
| `{n}/{m} done` | Dashboard | none |
| Journey row title + `Done` / `Keep going` / `New` / `Locked` | LessonJourney | Lottie thumb + Check/Lock/Chevron; **status is a word because "a tick alone is not readable"** (comment in `complexityBands.ts`) |
| `Topic {n}` + sub-strand name | LessonJourney (full catalog) | colored banner; text required |
| `Back` | LessonView / Lessons | ArrowLeft |
| `Pick a lesson` + `<select>` of titles | QuestLessonSwitch | text-only dropdown |
| Lesson `<h1>` title | LessonView | none |
| Teaching paragraphs (dump quoted in A1) | LessonTeachingBlocks | diagrams beside them; **prose has no audio** |
| `Diagram pending approval` + admin brief | LessonTeachingBlocks if asset missing | none — admin leak |
| `Getting your questions…` | AdaptiveQuizPanel | Lottie spinner |
| `Quiz: Quiz Challenge` | AdaptiveQuizPanel; default title `'Quiz Challenge'` in [`learnerController.js`](../backend/learner/controllers/learnerController.js) line 92 and generation | none |
| `Question 1 of 10` (then 2, 3, …) | `progressLabel` from [`adaptiveQuizService.js`](../backend/learner/services/adaptiveQuizService.js) | none |
| `Retry round — questions you missed` | AdaptiveQuizPanel | none |
| `Retry N of M` / `Practice check` / `Complete` | same `progressLabel` | none |
| Sound toggle | AdaptiveQuizPanel | **icon only** (Volume2 / VolumeX); `aria-label` `"Turn sound off"` / `"Turn sound on"` |
| MCQ pills `Visual` / `Step-by-step` / `Practice` | MultipleChoiceLive | none |
| Bloom pill `recall` / `understand` / `apply` / `reason` | MultipleChoiceLive | none — raw enum |
| Stem (`What is $45+3$?` or `Add.` / `Subtract.` / `Show this many.` / `How many is {a} plus {b}?` / `Count.` / `How many?`) | live interaction | column/objects may carry the maths; **stem is still text** |
| `A.` `B.` `C.` `D.` + option text | TapSelectOptions | picture options possible via OptionVisual; letters always shown |
| Digit chips `0`–`9` | NumericEntryLive | the digit *is* the affordance; `aria-label` is the digit |
| `Rubber` | NumericEntryLive | eraser SVG **and** the word `Rubber` |
| `Done` | drag, and numeric when length is unknown | none |
| `Box` | DragToTargetLive | dashed box is visual; label is uppercase text |
| Worked-example `Back` / `Next step` / `Done` / `Step N of M` + step sentences | AdditionWorkedExample | column animation; **steps are text, tap-to-advance, not spoken** |
| `Yes!` / `Try again` | live flash | tone + confetti (correct) / soft tone (wrong); **word still shown** |
| `Correct answer: A. {explanation}` | MCQ wrong | none |
| ` The answer is {n}.` | numeric wrong | none |
| `Checking…` | submitting | spinner |
| `Review mode` | session end | none |
| `Score: {c}/{t} ({pct}%)` · `{n} retries` | review header | none |
| `Your choices and corrections for this lesson. Read-only.` | review header | none |
| `Q1` … + `Correct` / `Incorrect` | review cards | CheckCircle / XCircle |
| `Your answer` / `Correct` on options | MCQ review | color |
| `You wrote: {n} · Answer: {n}` | numeric review | none |
| `Box: {n} · Need: {n}` | drag review | none |
| `Good try!` / `Nearly there!` / `Well done!` / `Amazing!` + `{pct}%` | results banner | icon |
| `You got {n}%. Let's practise this one more.` (and sibling messages) | results banner | none |
| `Try this one first` / `This lesson is a little easier. Come back after.` | scaffold offer | Play on the lesson link |

Rare stubs still in LessonView if content is empty or `contentType === 'video'`: `"Interactive Content"` / `"Interactive content will be displayed here"`; `"Video Lesson"` / `"Video player will be integrated with backend"` / `"URL: {videoUrl}"`. Those are admin leftovers on a learner screen.

**Honest summary:** almost every control that lets a Grade 1 child proceed is a word they must read (or have read to them). Icons sit next to `Back`, `Start`, `Dashboard`, `Lessons`, `Logout`. They do not replace those words. Teaching notes have no audio. Stems have no audio. Feedback has a beep, not speech.

---

## Part B — Feedback tone and near-miss handling

Live flash copy is grade-banded and **static**. It does not come from per-question `feedbackCorrect` / `feedbackIncorrect`.

```8:13:frontend/src/lib/quizFlashCopy.ts
export const quizFlashCopy = (grade?: string | number | null): { correct: string; incorrect: string } => {
  const n = grade === 'K' || grade === 'k' ? 0 : Number(grade)
  const young = !Number.isFinite(n) || n <= 5
  return young
    ? { correct: 'Yes!', incorrect: 'Try again' }
```

The file comment states that stored `"Well done!"` / `"Review this skill and try again."` **stay unused on the learner path**. Those defaults are still written at generation ([`lessonGenerationService.js`](../backend/admin/services/lessonGenerationService.js) lines 718–719).

Hold times ([`AdaptiveQuizPanel.tsx`](../frontend/src/components/learner/AdaptiveQuizPanel.tsx) lines 13–16): correct **600ms**, incorrect **1000ms** ("the learner also has to read what the right answer was"), plus **200ms** on the last item.

### B1. Exact wrong-answer copy, by interaction type

**`multiple_choice`** — [`MultipleChoiceLive.tsx`](../frontend/src/components/learner/quiz/MultipleChoiceLive.tsx) lines 73–83:

- `"Try again"`
- then `"Correct answer: "` + letter (`A`/`B`/`C`/`D`) + optional `explanation`

For the dump's q-1, a miss on `"47"` would show:

> Try again
>
> Correct answer: A. Add ones: 5+3=8, tens stay 4, so 48.

The explanation is more reading after a miss (that one is 10 words). The option they tapped goes red; they are not told *why that option is the misconception*, only the right letter and the explanation string.

**`numeric_entry` and column addition/subtraction** — same component [`NumericEntryLive.tsx`](../frontend/src/components/learner/quiz/NumericEntryLive.tsx) lines 231–237. Column add/sub is vertical `numeric_entry`, not a separate copy set:

> Try again The answer is {expectedValue}.

Example if expected is 58: `"Try again The answer is 58."`

There is no second sentence for "close" vs "far". The column itself does not highlight which digit was wrong.

**`drag_to_target`** — [`DragToTargetLive.tsx`](../frontend/src/components/learner/quiz/DragToTargetLive.tsx) lines 101–107. The Done button label becomes `"Try again"`. **No expected count. No explanation. No "Need: N".** The box just sits there with the wrong number of objects until the next question loads.

**Uniform regardless of closeness.** One incorrect string per grade band. Nothing in the live UI branches on off-by-one, transposition, or wrong operation.

### B2. Error-pattern detection: exists internally, not on the child's screen

Distractor formulas **do** tag patterns. From the dump's q-1:

- `"counted one too few"` (`a + b - 1`)
- `"counted one too many"` (`a + b + 1`)
- `"recounted two objects"`

Subtraction ladder ([`templateLadders.js`](../backend/utils/templateLadders.js) lines 288–291, 317–320, 345–348):

- `"added instead of subtract"`
- `"counted one too many"` / `"counted one too few"`
- `"off by ten"` / `"ones digit slip"`

Those strings are stored as `misconceptionKey` on `SkillAttempt` when the selected MCQ option matches a distractor ([`adaptiveController.js`](../backend/learner/controllers/adaptiveController.js) lines 337–351):

```351:351:backend/learner/controllers/adaptiveController.js
    misconceptionKey: correct ? null : distractor?.misconception || null,
```

Admin review shows `"Diagnoses: …"`. Learner reports tally misconception keys. **Live flash never prints them.** [`LessonView.tsx`](../frontend/src/pages/learner/LessonView.tsx) line 247 even forces `misconception: null` when building the child's missed-skills list (and that list is hidden on the quest path anyway).

There is **no** digit-transposition detector, no off-by-one grader, no "wrong operation" classifier on the submitted number. Those tags exist only as **prebuilt wrong MCQ options**, not as analysis of a free numeric answer.

### B3. Correct-answer language

Grade 1 (young band): **`"Yes!"`** every time. Not a rotating pool. Not `"Well done!"` (that string is stored and unused).

Plus: CSS confetti, 18 pieces, ~0.85s ([`AnswerCelebration.tsx`](../frontend/src/components/learner/quiz/AnswerCelebration.tsx)); two-note chime (~E5 then A5) if sound is on. Review badge later: `"Correct"`.

### B4. Numeric / column grading: 85 vs 58 is the same miss as 12 vs 58

Authoritative path in [`adaptiveQuizService.js`](../backend/learner/services/adaptiveQuizService.js) lines 836–844:

```836:844:backend/learner/services/adaptiveQuizService.js
  } else if (isNumeric) {
    expectedValue = expectedScalarForQuestion(question);
    submittedValue = parseNumericAnswer(
      rawSubmittedValue ?? rawPlacedCount ?? selectedOptionIndex
    );
    selectedDisplay = submittedValue;
    selectedOriginal = submittedValue;
    correct = expectedValue != null && submittedValue === expectedValue;
    displayCorrect = expectedValue;
```

[`parseNumericAnswer`](../backend/utils/expectedScalar.js) lines 13–18: trim, must match `/^\d+$/`, then `Number(s)` (`"06"` → `6`). Empty or non-digits → `null` (wrong).

Expected value is `answerFormula(params)`, else `target` / `answer`, else `a - b` or `a + b`. **No second comparison.** `85 === 58` is false; `12 === 58` is false; both are `correct: false`; both get `"Try again The answer is 58."`

Column addition and subtraction use this same numeric channel. Drag uses `placed === expectedCount` — also binary.

**Current client quirk (fact, not a proposed fix):** optimistic scoring in `handleSubmitNumeric` always computes `add.a + add.b` ([`AdaptiveQuizPanel.tsx`](../frontend/src/components/learner/AdaptiveQuizPanel.tsx) lines 232–244). It ignores `operation === 'subtract'`. A correct subtraction (e.g. 7 − 3 → 4) can flash `"Try again"` and play the wrong-answer tone locally, then be overwritten when the server returns. Addition items match the server.

---

## Part C — Navigation and UI chrome: reading beyond quiz content

### C1. Full Grade 1 path, and where reading is required to proceed

Grade ≤ 5 → quest nav. Recommendations is hidden in the shell and [`Recommendations.tsx`](../frontend/src/pages/learner/Recommendations.tsx) redirects to `/learner`. Search, subject browse, daily exercise, and `"My progress"` PDF report are **not** on the Grade 1 dashboard.

**Login (adult, but the child may sit through it):** `"Welcome back!"`, `"Sign in to access your dashboard"`, `Email`, `Password`, `Sign in`.

**Shell (every `/learner/*` page):** `EduVibe` + `Learner`; **`Dashboard`** and **`Lessons`** to move; **`Logout`** to leave. Mobile menu also shows full `user.name` and `user.role` (`learner`). A non-reader cannot choose Dashboard vs Lessons vs Logout from icons alone if they do not already know the icons.

**Dashboard `/learner`:**

- `"Good morning, {name}!"` / `"Grade 1"`
- Quest hero: subject name (e.g. Mathematics) + lesson title + **`Start`** or **`Keep going`** (Play icon). Progress bar if `progress > 0`. Optional text-only **`Pick a lesson`**.
- `"Your lessons"` + optional `"{n}/{m} done"`
- Up to 5 journey rows: title + status word `New` / `Keep going` / `Done` / `Locked`. Locked rows are not links. Compact overflow CTA: `"Lessons"` + chevron.

**Lessons `/learner/lessons` (catalogMode for quest):** `"Back"` then heading `"Lessons"` and the full journey, grouped under `"Topic {n}"` + sub-strand name.

**In-lesson:** `"Back"`, optional `"Pick a lesson"` select, title, teaching (A1), auto-start quiz. No Start Quiz.

**In-session controls:** quiz title, `Question N of M` (text-only counter), sound icon, the item itself. Retry phase adds `"Retry round — questions you missed"`. Twin phase label: `"Practice check"`.

**Session end:** Review mode (every item, read-only) **and** the results banner **and** QuestNextCard. See Part D.

**Choke points where a non-reader stalls:** shell labels; quest CTA if they miss the Play icon; journey titles; locked vs new; Back vs Pick a lesson; teaching prose; `Quiz: Quiz Challenge`; `Question X of Y`; MCQ letters and option text; `Done` on drag; review/results paragraphs; first-visit modality modal.

### C2. Admin-flavored language still in the Grade 1 UI

The pattern from the earlier screenshot is **still present**.

Default quiz title is still `'Quiz Challenge'`:

```92:92:backend/learner/controllers/learnerController.js
    title: quiz.title || 'Quiz Challenge',
```

The panel always prefixes it:

```323:324:frontend/src/components/learner/AdaptiveQuizPanel.tsx
          <h2 className="text-2xl sm:text-3xl font-black text-ev-ink">
            Quiz: {lesson.quiz?.title || 'Practice'}
```

So the child sees **`Quiz: Quiz Challenge`**.

Progress labels from the server ([`adaptiveQuizService.js`](../backend/learner/services/adaptiveQuizService.js) lines 1038–1046):

- `"Question ${session.mainAnswered + 1} of ${session.mainTarget}"` — e.g. `"Question 1 of 10"`
- `"Retry ${n} of ${m}"`
- `"Practice check"`
- `"Complete"`

Also on the Grade 1 path today:

- `"Retry round — questions you missed"`
- `"Review mode"`
- `"Score: 7/10 (70%)"` and `" · 3 retries"`
- `"Your choices and corrections for this lesson. Read-only."`
- Review `"Q1"`, `"Correct"`, `"Incorrect"`, `"Your answer"`
- MCQ live pills `"Visual"` / `"Step-by-step"` / `"Practice"` and raw bloom `"recall"` / `"apply"` / …
- `"Checking…"`
- First-visit `"How do you like to learn?"` / `"Pick one. You can change this later — we also learn from how you do on quizzes."` / `"Pictures & diagrams"` / `"I understand best with graphics and labeled figures"` / `"Step-by-step text"` / `"I like clear written steps and worked examples"` / `"Lots of practice"` / `"I learn by doing short practice questions"` / `"A bit of everything"` / `"Mix it up for me"`

**Already hidden for quest (Grade 1):** CBC titles `"Below Expectations"` / `"Approaching Expectations"` / `"Meeting Expectations"` / `"Exceeding Expectations"`; `"Practice mode: …"`; lesson description, grade chip, difficulty, duration, tags; `"Skills to practice"`; `"Scroll up to see every question and your choices in review mode."`

### C3. Audio map

| Kind | Present? | Where |
|---|---|---|
| Lesson / stem / option / notes narration | **No** | — |
| TTS / `speechSynthesis` | **No** | no matches under `frontend/src` |
| Answer SFX | **Yes** | [`quizSound.ts`](../frontend/src/lib/quizSound.ts): correct two triangle tones (659.25 Hz then 880 Hz); incorrect one soft low tone (246.94 Hz). Comment: *"a wrong answer should not feel like a buzzer."* Default on; `localStorage` key `eduvibe_quiz_sound`. |
| Sound toggle | **Yes** | icon-only in the quiz header |
| Confetti | visual only | no sound |
| Session-complete fanfare | **No** | — |
| Lottie | visual only | quest, journey, loading |

[`docs/learner-presentation-audit.md`](learner-presentation-audit.md) line 118 still says there is no quiz sound. Live code contradicts it.

---

## Part D — Session rhythm and pacing

### D1. Session length, fatigue, stopping point

**No fatigue signal. No time budget. No early natural stop for a young learner.** Response times are collected on Grade 1 addition-template items (`additionTemplateResponseTimes`) only to decide whether to enqueue a **twin** (`fast_correct` if faster than a cold-start threshold or `average * fastRatio`). They never end the session.

Main-item count is fixed ([`quizSessionSize.js`](../backend/utils/quizSessionSize.js)):

- `SESSION_MAIN_MIN = 10`
- `SESSION_MAIN_MAX = 12`
- Template-backed: **always 10**
- Fixed pool: bank size if ≤ 10, else clamp **10–12**

Done when `mainAnswered >= mainTarget` (or the unused bank is exhausted), then pending **twins**, then a **retry round** of misses, then `phase: 'done'` / `progressLabel: 'Complete'` ([`adaptiveQuizService.js`](../backend/learner/services/adaptiveQuizService.js) lines 954–1040).

A struggling child can sit through 10 mains + twins (`Practice check`) + `"Retry round — questions you missed"` with no pause, no "that's enough for now", no shorter path. Score percentage uses main-phase (first-try) answers only; retries still have to be *done*.

### D2. What "session complete" looks and sounds like

After the last item's hold (600ms / 1000ms / +200ms):

1. **`AdaptiveQuizPanel` switches to Review mode.** Heading `"Review mode"`. Score line `"Score: {correct}/{total} ({percentage}%)"` and retry count. Green bar. `"Your choices and corrections for this lesson. Read-only."` Then every answered item as a card (`Q1`, `Correct`/`Incorrect`, stems, `"You wrote: … · Answer: …"` / `"Box: … · Need: …"` / lettered options). **No sound on this transition.**

2. **Below that, LessonView paints the young results banner** (`questNav === true`, lines 90–136, 545–610):

| Score | Title | Message |
|---|---|---|
| < 25% | `Good try!` | `You got {n}%. Let's practise this one more.` |
| < 50% | `Nearly there!` | `You got {n}%. A little more practice and you have it.` |
| < 75% | `Well done!` | `You got {n}%. You know this one.` |
| ≥ 75% | `Amazing!` | `You got {n}%. Time for something new.` |

The heading is **`{title} {sessionPct}%`** — e.g. `"Well done! 70%"`. Icon (Sparkles / TrendingUp / CheckCircle). Quest path omits `"Scroll up to see every question…"`.

3. **Scaffold, if offered:** `"Try this one first"` / `"This lesson is a little easier. Come back after."` plus a Play link to the easier lesson title.

4. **`QuestNextCard`:** next lesson title + `Start` / `Keep going`, or `"All done for now."` / `"Pick any lesson below."` with the happy-boy Lottie. Silent.

Passing used in `onSessionComplete` is `Math.max(lesson.quiz?.passingScore || 60, 60)`. The child is not shown the word "pass" or "fail"; they are shown a percent and a short praise line. The review list under that is still a wall of `Correct`/`Incorrect` and answer keys.

There is **no** end-of-session sound, **no** end Lottie tied to the result, **no** "you finished 10 questions" in child language. The meta label at the last server tick is `"Complete"`.

---

## Part E — What's genuinely fine as-is

These are already good for a Grade 1 Kenyan child. Do not "fix" them in a later pass unless something else forces a change.

**Rubber, not Erase.** The keypad control is labeled `"Rubber"` with a pink/yellow eraser drawing and `aria-label="Rubber"` ([`NumericEntryLive.tsx`](../frontend/src/components/learner/quiz/NumericEntryLive.tsx) lines 212–215). That is the school-English word children actually use.

**Toy digit chips.** 64×64 round buttons, five candy tones with 3D bottom shadows, press that translates down 4px. Digits are shuffled from a constrained pad (`digitChoicesForSum`), not a full 0–9 grid when it is not needed.

**Column layout is the question.** Vertical items use `"Add."` / `"Subtract."` and stacked place-value cells. The live tens carry box stays empty (filled only in worked-example reveal). Digits of the addends animate on. Auto-submit fires ~40ms after the expected digit count is filled, so column items do not need a second `"Done"` tap.

**Instant local flash on addition numeric.** Optimistic `Yes!` / `Try again` + tone before the network returns; 600ms / 1000ms hold so the flash is visible. MCQ tap-submits immediately (no separate Submit). Drag/MCQ wait for the server for the verdict but do not add extra chrome.

**Soft wrong-answer tone.** Deliberately low and quiet; not a buzzer ([`quizSound.ts`](../frontend/src/lib/quizSound.ts) lines 58–59). Mute is an icon the child can hit without reading.

**Per-correct confetti.** Short CSS burst, skipped under `prefers-reduced-motion`. Cheap enough to fire every right answer.

**Quest copy that is actually short.** `Start`, `Keep going`, `Next`, `All done for now.`, `Pick a lesson`, `Done`, `New`, `Locked` ([`QUEST_COPY`](../frontend/src/lib/complexityBands.ts)). Play icon on the main CTA. Status words exist because a tick alone was judged unreadable — that choice is coherent.

**Teacher metadata hidden on the lesson page.** Grade chip, difficulty, duration, tags, and description do not push the work down for quest learners (LessonView comment at lines 444–445: *"A six-year-old cannot read them and they push the lesson down."*). That is already done. CBC rubric titles stay off this path.

**Tap targets.** Learner buttons floor at 48px (`md`) / 56px (`lg`) ([`learnerUi.ts`](../frontend/src/lib/learnerUi.ts)). Drag objects are 56px icons; click-or-drag into a large dashed box. MCQ options are `min-h-14` full-width taps.

**Drag objects are pictures.** `ObjectIcon` in the pool; `"Box"` is a drop zone, not a paragraph. `aria-label` `"Put one {kind} in the box"` is for assistive tech, not extra on-screen prose.

**Worked-example column animation.** Digits draw in (`ev-digit-in`, `ev-line-draw`). **Steps do not autoplay.** They are tap-to-reveal: `"Back"`, `"Next step"`, `"Done"`, `"Step {n} of {m}"`, with texts like `"Line up 23 and 4. Ones under ones."` / `"Carry {n} to the tens."` / `"Nothing to carry."` / `"The total is {sum}."` Only `text_steps` vertical items get this (today, the `add-twodigit-mid-steps` rung). Do not credit autoplay that is not there.

**Young results titles** (`Good try!` / `Nearly there!` / `Well done!` / `Amazing!`) are short and already split from CBC language. The problem around them is the review wall and the percent, not those four titles.

**Grade 1 header-stripping of Mini Notes / Worked Example / Practice Prompts** is the right instinct. It does not currently hide unlabeled teaching paragraphs (Part A); the hide itself is still worth keeping for lessons that *do* use those headings.

---

## Method notes

- Quotes are from current workspace files and from `docs/measurements/after-g1-addition.json`. A production lesson generated on another date may have different teaching sentences; the **chrome, flash copy, grading, session length, and audio** are code, not dump-specific.
- Template-backed sessions can show `"Add."` as the first stem; they do not remove the teaching block above, `Quiz: Quiz Challenge`, or `Question 1 of 10`.
- No redesigns are proposed in this document.
