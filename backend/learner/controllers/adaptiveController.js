import { LearnerProfile } from '../../models/LearnerProfile.js';
import { SkillAttempt, SkillMastery, BktSkillParams } from '../../models/SkillAttempt.js';
import { Lesson } from '../../models/Lesson.js';
import { findScaffoldLesson } from '../../admin/services/scaffoldService.js';
import { outcomeKey } from '../../utils/outcomeKey.js';
import { signSession, verifySession, stripSignature } from '../services/sessionSigner.js';

const getUserId = (req) => req.user?.id || null;

export const getLearnerProfile = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const profile = await LearnerProfile.getOrCreate(userId);
    res.json(profile);
  } catch (error) {
    console.error('Error fetching learner profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateLearnerProfile = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { preferredModality, modalityPromptSeen } = req.body;
    const allowed = ['visual', 'text_steps', 'practice', 'mixed'];
    if (preferredModality && !allowed.includes(preferredModality)) {
      return res.status(400).json({ error: 'Invalid preferredModality' });
    }

    const profile = await LearnerProfile.upsert(userId, {
      preferredModality,
      modalityPromptSeen
    });
    res.json(profile);
  } catch (error) {
    console.error('Error updating learner profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Persist quiz answers as skill_attempts and update skill_mastery.
 * Body: { lessonId, modalityShown?, answers: [{ questionId, selectedOptionIndex }] }
 */
export const submitSkillAttempts = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { lessonId, answers, modalityShown = 'mixed' } = req.body;
    if (!lessonId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'lessonId and answers are required' });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const profile = await LearnerProfile.getOrCreate(userId);
    const questions = lesson.quiz?.questions || [];
    const missedSkills = [];
    const created = [];
    let scaffoldHint = null;

    for (const answer of answers) {
      const qIndex = questions.findIndex(
        (q, i) => (q.id || `question-${i}`) === answer.questionId || `q-${i + 1}` === answer.questionId
      );
      const question =
        qIndex >= 0
          ? questions[qIndex]
          : questions.find((q) => q.id === answer.questionId);

      if (!question) continue;

      const selected = Number(answer.selectedOptionIndex);
      const correct = selected === question.correctAnswerIndex;
      const outcomeText =
        lesson.learningObjectives?.[(question.learningOutcomeIndex || 1) - 1] ||
        question.skillFocus ||
        '';
      const learningOutcomeKey =
        question.learningOutcomeKey || outcomeKey(outcomeText || question.question);

      const priorFails = await SkillAttempt.countRecentFails(
        userId,
        learningOutcomeKey,
        lesson.grade
      );
      const attemptInSkillStreak = correct ? 1 : priorFails + 1;

      const distractor = (question.distractors || []).find(
        (d) => Number(d.optionIndex) === selected
      );

      const row = await SkillAttempt.create({
        userId,
        lessonId,
        questionId: question.id || answer.questionId,
        learningOutcomeKey,
        skillFocus: question.skillFocus || outcomeText,
        gradeLevel: lesson.grade,
        bloomLevel: question.bloomLevel || null,
        correct,
        selectedOptionIndex: selected,
        misconceptionKey: correct ? null : distractor?.misconception || null,
        modalityShown: modalityShown || profile.preferredModality || 'mixed',
        attemptInSkillStreak
      });
      created.push(row);

      await SkillMastery.upsertFromAttempt({
        userId,
        learningOutcomeKey,
        skillFocus: question.skillFocus || outcomeText,
        gradeLevel: lesson.grade,
        correct,
        consecutiveFails: correct ? 0 : attemptInSkillStreak,
        modalityShown: modalityShown || profile.preferredModality
      });
      await SkillMastery.recomputeBkt({
        userId,
        learningOutcomeKey,
        skillFocus: question.skillFocus || outcomeText,
        gradeLevel: lesson.grade
      });

      try {
        const { recordRemediationFollowup } = await import(
          '../../admin/services/layer2PrerequisiteService.js'
        );
        await recordRemediationFollowup({
          userId,
          learningOutcomeKey,
          correct,
          isTwin: false
        });
      } catch (err) {
        console.warn('Layer 2 follow-up log skipped:', err.message || err);
      }

      if (!correct) {
        missedSkills.push({
          skillFocus: question.skillFocus || outcomeText,
          learningOutcomeKey,
          misconception: distractor?.misconception || null,
          consecutiveFails: attemptInSkillStreak
        });

        if (attemptInSkillStreak >= (profile.scaffoldTolerance || 2) && !scaffoldHint) {
          scaffoldHint = await findScaffoldLesson(userId, {
            learningOutcomeKey,
            skillFocus: question.skillFocus,
            gradeLevel: lesson.grade,
            lessonId
          });
          const { maybeQueueLayer2Proposal } = await import(
            '../../admin/services/layer2PrerequisiteService.js'
          );
          void maybeQueueLayer2Proposal({
            userId,
            learningOutcomeKey,
            grade: lesson.grade,
            consecutiveFails: attemptInSkillStreak
          }).catch((err) => console.warn('Layer 2 queue skipped:', err.message || err));
        }
      }
    }

    // Unique missed skills by key
    const uniqueMissed = [];
    const seen = new Set();
    for (const m of missedSkills) {
      if (seen.has(m.learningOutcomeKey)) continue;
      seen.add(m.learningOutcomeKey);
      uniqueMissed.push(m);
    }

    res.json({
      attempts: created.length,
      missedSkills: uniqueMissed,
      scaffold: scaffoldHint
        ? {
            needsScaffold: scaffoldHint.needsScaffold,
            targetGrade: scaffoldHint.targetGrade,
            preferredModality: scaffoldHint.preferredModality,
            lesson: scaffoldHint.scaffoldLesson
              ? {
                  id: scaffoldHint.scaffoldLesson.id,
                  title: scaffoldHint.scaffoldLesson.title,
                  grade: scaffoldHint.scaffoldLesson.grade,
                  subjectId: scaffoldHint.scaffoldLesson.subjectId,
                  strandId: scaffoldHint.scaffoldLesson.strandId,
                  subStrandId: scaffoldHint.scaffoldLesson.subStrandId,
                  images: scaffoldHint.scaffoldLesson.images || []
                }
              : null
          }
        : null
    });
  } catch (error) {
    console.error('Error submitting skill attempts:', error);
    res.status(500).json({
      error: 'Failed to record skill attempts',
      message: error.message
    });
  }
};

export const getScaffoldForLesson = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const masteryRows = await SkillMastery.findByUser(userId);
    const lessonOutcomeKeys = new Set(
      (lesson.quiz?.questions || [])
        .map((q) => q.learningOutcomeKey)
        .filter(Boolean)
    );
    const lessonSkillFoci = new Set(
      (lesson.quiz?.questions || [])
        .map((q) => String(q.skillFocus || '').toLowerCase().trim())
        .filter(Boolean)
    );
    // Only scaffold for skills belonging to THIS lesson
    const relevant = masteryRows.find((m) => {
      const struggling =
        m.status === 'scaffolding' || (m.consecutiveFailsAtLevel || 0) >= 2;
      if (!struggling) return false;
      if (lessonOutcomeKeys.size === 0 && lessonSkillFoci.size === 0) return true;
      return (
        (m.learningOutcomeKey && lessonOutcomeKeys.has(m.learningOutcomeKey)) ||
        (m.skillFocus && lessonSkillFoci.has(String(m.skillFocus).toLowerCase().trim()))
      );
    });

    if (!relevant) {
      return res.json({ needsScaffold: false, scaffoldLesson: null });
    }

    const result = await findScaffoldLesson(userId, {
      learningOutcomeKey: relevant.learningOutcomeKey,
      skillFocus: relevant.skillFocus,
      gradeLevel: lesson.grade,
      lessonId: lesson.id
    });

    res.json({
      needsScaffold: result.needsScaffold,
      targetGrade: result.targetGrade,
      preferredModality: result.preferredModality,
      skillFocus: relevant.skillFocus,
      lesson: result.scaffoldLesson
        ? {
            id: result.scaffoldLesson.id,
            title: result.scaffoldLesson.title,
            grade: result.scaffoldLesson.grade,
            subjectId: result.scaffoldLesson.subjectId,
            strandId: result.scaffoldLesson.strandId,
            subStrandId: result.scaffoldLesson.subStrandId,
            images: result.scaffoldLesson.images || []
          }
        : null
    });
  } catch (error) {
    console.error('Error fetching scaffold:', error);
    res.status(500).json({ error: 'Failed to fetch scaffold' });
  }
};

export const getSkillMastery = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const rows = await SkillMastery.findByUser(userId);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching skill mastery:', error);
    res.status(500).json({ error: 'Failed to fetch skill mastery' });
  }
};

const recordOneAttempt = async ({
  userId,
  lesson,
  question,
  questionId,
  selected,
  correct,
  learningOutcomeKey,
  bloomLevel,
  modalityShown,
  profile,
  responseTimeMs,
  isTwin = false,
  twinPairId = null,
  twinRole = null,
  twinTriggerReason = null,
  sourceQuestionId = null,
  questionParams = null,
  masteryRows = []
}) => {
  const shown = modalityShown || profile.preferredModality || 'mixed';
  const existing =
    (masteryRows || []).find((m) => m.learningOutcomeKey === learningOutcomeKey) || null;

  const [priorAttempts, bktParams] = await Promise.all([
    SkillAttempt.listByUserOutcomeAll(userId, learningOutcomeKey, { lean: true }),
    BktSkillParams.getOrCreate(learningOutcomeKey)
  ]);

  const last = [...priorAttempts].reverse().find((a) => a.twinRole !== 'twist');
  if (
    last &&
    !last.correct &&
    last.modalityShown &&
    last.modalityShown !== 'mixed' &&
    shown !== 'mixed' &&
    shown !== last.modalityShown
  ) {
    console.debug(
      '[modality-switch]',
      learningOutcomeKey,
      `${last.modalityShown}→${shown}`,
      correct ? 'success' : 'fail'
    );
  }

  const priorFails = SkillAttempt.consecutiveFailStreak(priorAttempts, lesson.grade);
  const attemptInSkillStreak = correct ? 1 : priorFails + 1;
  const distractor = (question.distractors || []).find(
    (d) => Number(d.optionIndex) === selected
  );

  const created = await SkillAttempt.create({
    userId,
    lessonId: lesson.id,
    questionId,
    learningOutcomeKey,
    skillFocus: question.skillFocus || learningOutcomeKey,
    gradeLevel: lesson.grade,
    bloomLevel: bloomLevel || null,
    correct,
    selectedOptionIndex: selected,
    misconceptionKey: correct ? null : distractor?.misconception || null,
    modalityShown: shown,
    attemptInSkillStreak,
    responseTimeMs,
    twinPairId,
    twinRole,
    twinTriggerReason,
    sourceQuestionId,
    questionParams
  });

  const allAttempts = created ? [...priorAttempts, created] : priorAttempts;
  const mastery = await SkillMastery.applyAttemptAndBkt({
    userId,
    learningOutcomeKey,
    skillFocus: question.skillFocus || learningOutcomeKey,
    gradeLevel: lesson.grade,
    correct,
    consecutiveFails: correct ? 0 : attemptInSkillStreak,
    modalityShown: shown,
    isTwin,
    existing,
    attemptsOldestFirst: allAttempts,
    bktParams
  });

  void import('../../admin/services/layer2PrerequisiteService.js')
    .then(({ recordRemediationFollowup, maybeQueueLayer2Proposal }) => {
      void recordRemediationFollowup({
        userId,
        learningOutcomeKey,
        correct,
        isTwin
      }).catch((err) => console.warn('Layer 2 follow-up log skipped:', err.message || err));
      if (!isTwin && !correct && attemptInSkillStreak >= (profile.scaffoldTolerance || 2)) {
        void maybeQueueLayer2Proposal({
          userId,
          learningOutcomeKey,
          grade: lesson.grade,
          consecutiveFails: attemptInSkillStreak
        }).catch((err) => console.warn('Layer 2 queue skipped:', err.message || err));
      }
    })
    .catch((err) => console.warn('Layer 2 follow-up log skipped:', err.message || err));

  return { attemptInSkillStreak, distractor, mastery };
};

const loadModalitySuccessMap = async (userId, lesson) => {
  const { lessonOutcomeKeys } = await import('../services/adaptiveQuizService.js');
  const keys = lessonOutcomeKeys(lesson);
  return SkillAttempt.getSuccessfulModalitiesForOutcomes(userId, keys);
};

/** Start adaptive one-by-one quiz session */
export const startAdaptiveQuiz = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const lessonId = req.params.lessonId;
    const { getDbClient } = await import('../../config/supabase.js');
    const [lesson, profile, masteryRows, progressRes] = await Promise.all([
      Lesson.findByIdForAdaptive(lessonId),
      LearnerProfile.getOrCreate(userId),
      SkillMastery.findByUser(userId),
      getDbClient()
        .from('lesson_progress')
        .select('progress, completed, session_review')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle()
    ]);
    if (!lesson || lesson.status !== 'approved') {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    const progress = progressRes?.data;
    if (progressRes?.error) {
      console.warn('lesson_progress lookup skipped:', progressRes.error.message || progressRes.error);
    }

    // If they already finished an attempt, show review (answers + corrections).
    // Do NOT require progress.completed — that is pass/fail only; a finished
    // but below-threshold attempt still has session_review and must not force a retake.
    if (progress?.session_review) {
      const { buildReviewView } = await import('../services/adaptiveQuizService.js');
      return res.json({
        mode: 'review',
        review: buildReviewView(lesson, progress.session_review),
        progress: progress.progress,
        completed: !!progress.completed
      });
    }

    if (lesson.subStrandId) {
      const { SubStrand } = await import('../../models/SubStrand.js');
      const { loadStrandUnitUnlock } = await import('../services/unitGatingService.js');
      const substrand = await SubStrand.findById(lesson.subStrandId);
      if (substrand) {
        const { flagsById } = await loadStrandUnitUnlock(userId, substrand.strandId);
        if (flagsById.get(substrand.id) === false) {
          return res.status(403).json({
            error: 'This unit is locked. Finish the previous unit first.'
          });
        }
      }
    }

    const [{ createAdaptiveSession }, modalitySuccessMap] = await Promise.all([
      import('../services/adaptiveQuizService.js'),
      loadModalitySuccessMap(userId, lesson)
    ]);
    const result = createAdaptiveSession({
      lesson,
      preferredModality: profile.preferredModality || 'mixed',
      masteryRows,
      modalitySuccessMap
    });

    if (result.question?.bankEntryId) {
      const { recordLearnerBankServe } = await import(
        '../../admin/services/questionBankService.js'
      );
      void recordLearnerBankServe({
        bankEntryId: result.question.bankEntryId,
        lessonId,
        learnerId: userId,
        questionId: result.question.id
      }).catch((err) => console.warn('Bank serve log skipped:', err.message || err));
    }

    res.json({
      mode: 'adaptive',
      session: signSession(result.session),
      question: result.question,
      meta: result.meta
    });
  } catch (error) {
    console.error('Error starting adaptive quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to start adaptive quiz' });
  }
};

/** Submit answer and get next question (or done + review) */
export const nextAdaptiveQuiz = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const lessonId = req.params.lessonId;
    const { session, selectedOptionIndex, placedCount, submittedValue, responseTimeMs } = req.body || {};
    if (
      !session ||
      (selectedOptionIndex === undefined || selectedOptionIndex === null) &&
        (placedCount === undefined || placedCount === null) &&
        (submittedValue === undefined || submittedValue === null)
    ) {
      return res.status(400).json({ error: 'session and an answer are required' });
    }
    if (session.lessonId && session.lessonId !== lessonId) {
      return res.status(400).json({ error: 'session lesson mismatch' });
    }
    if (!verifySession(session)) {
      return res.status(400).json({
        error: 'Session integrity check failed — please restart the quiz'
      });
    }

    const [lesson, profile, masteryRows] = await Promise.all([
      Lesson.findByIdForAdaptive(lessonId),
      LearnerProfile.getOrCreate(userId),
      SkillMastery.findByUser(userId)
    ]);
    if (!lesson || lesson.status !== 'approved') {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const [{ advanceAdaptiveSession, buildReviewView, lessonOutcomeKeys }, modalitySuccessMap] =
      await Promise.all([
        import('../services/adaptiveQuizService.js'),
        loadModalitySuccessMap(userId, lesson)
      ]);

    const result = advanceAdaptiveSession({
      session: stripSignature(session),
      lesson,
      selectedOptionIndex: selectedOptionIndex ?? placedCount ?? submittedValue,
      placedCount,
      submittedValue,
      responseTimeMs,
      masteryRows,
      modalitySuccessMap
    });

    const { attemptContext } = result;
    let updatedMastery = null;
    if (attemptContext?.question) {
      const recorded = await recordOneAttempt({
        userId,
        lesson,
        question: attemptContext.question,
        questionId: attemptContext.questionId,
        selected: attemptContext.selected,
        correct: attemptContext.correct,
        learningOutcomeKey: attemptContext.learningOutcomeKey,
        bloomLevel: attemptContext.bloomLevel,
        modalityShown:
          attemptContext.question.modality || profile.preferredModality || 'mixed',
        profile,
        responseTimeMs: attemptContext.responseTimeMs,
        isTwin: attemptContext.isTwin,
        twinPairId: attemptContext.twinPairId,
        twinRole: attemptContext.twinRole,
        twinTriggerReason: attemptContext.twinTriggerReason,
        sourceQuestionId: attemptContext.sourceQuestionId,
        questionParams: attemptContext.questionParams,
        masteryRows
      });
      updatedMastery = recorded.mastery || null;
    }

    void import('../../admin/services/questionBankService.js')
      .then(({ recordLearnerBankServe }) => {
        if (attemptContext?.bankEntryId) {
          void recordLearnerBankServe({
            bankEntryId: attemptContext.bankEntryId,
            lessonId,
            learnerId: userId,
            questionId: attemptContext.questionId
          }).catch((err) => console.warn('Bank serve log skipped:', err.message || err));
        }
        if (result.question?.bankEntryId) {
          void recordLearnerBankServe({
            bankEntryId: result.question.bankEntryId,
            lessonId,
            learnerId: userId,
            questionId: result.question.id
          }).catch((err) => console.warn('Bank serve log skipped:', err.message || err));
        }
      })
      .catch((err) => console.warn('Bank serve log skipped:', err.message || err));

    if (result.meta.done && result.review) {
      const { getDbClient } = await import('../../config/supabase.js');
      const db = getDbClient();
      const pct = result.review.score?.percentage ?? 0; // first-try only; practiceScore stays in session_review
      const passing = Math.max(lesson.quiz?.passingScore || 60, 60);
      const completed = pct >= passing;

      const payload = {
        user_id: userId,
        lesson_id: lessonId,
        progress: pct,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        session_review: result.review,
        last_accessed: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: existing } = await db
        .from('lesson_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (existing) {
        await db.from('lesson_progress').update(payload).eq('id', existing.id);
      } else {
        await db.from('lesson_progress').insert(payload);
      }

      const signalRows = (result.session.modalitySignalLog || []).map((entry) => ({
        user_id: userId,
        lesson_id: lessonId,
        question_id: entry.questionId || null,
        learning_outcome_key: entry.learningOutcomeKey || null,
        source: entry.source || 'none',
        modality: entry.modality || null,
        created_at: entry.at || new Date().toISOString()
      }));
      if (signalRows.length > 0) {
        void db
          .from('adaptive_modality_signal_log')
          .insert(signalRows)
          .then(({ error: signalErr }) => {
            if (signalErr) {
              console.warn(
                '[modality-signal-log] insert skipped:',
                signalErr.message || signalErr
              );
            }
          });
      }

      const outcomeKeys = lessonOutcomeKeys(lesson);
      const byKey = new Map(masteryRows.map((m) => [m.learningOutcomeKey, m.status]));
      if (updatedMastery?.learningOutcomeKey) {
        byKey.set(updatedMastery.learningOutcomeKey, updatedMastery.status);
      }
      const topicMastered =
        outcomeKeys.length > 0 &&
        outcomeKeys.every((k) => byKey.get(k) === 'mastered');

      return res.json({
        mode: 'adaptive',
        session: signSession(result.session),
        question: null,
        meta: result.meta,
        lastAnswer: result.lastAnswer,
        review: buildReviewView(lesson, result.review),
        completed,
        topicMastered
      });
    }

    res.json({
      mode: 'adaptive',
      session: signSession(result.session),
      question: result.question,
      meta: result.meta,
      lastAnswer: result.lastAnswer
    });
  } catch (error) {
    console.error('Error advancing adaptive quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to advance adaptive quiz' });
  }
};

/** Explicit review fetch (all-at-once) */
export const getAdaptiveReview = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const { getDbClient } = await import('../../config/supabase.js');
    const { data: progress } = await getDbClient()
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lesson.id)
      .maybeSingle();

    if (!progress?.session_review) {
      return res.status(404).json({ error: 'No completed session to review' });
    }

    const { buildReviewView } = await import('../services/adaptiveQuizService.js');
    res.json({
      mode: 'review',
      review: buildReviewView(lesson, progress.session_review),
      progress: progress.progress,
      completed: progress.completed
    });
  } catch (error) {
    console.error('Error fetching adaptive review:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
};
