import { getDbClient } from '../config/supabase.js';
import { oneOrNull } from '../utils/dbResult.js';

const isMissingTwinColumn = (error) =>
  error &&
  (error.code === '42703' ||
    error.code === 'PGRST204' ||
    /twin_role|twin_pair_id|response_time_ms|question_params/i.test(error.message || ''));

const isMissingBktColumn = (error) =>
  error &&
  (error.code === '42703' ||
    error.code === 'PGRST204' ||
    error.code === '42P01' ||
    /bkt_p_know|bkt_n_observations|bkt_updated_at|bkt_skill_params/i.test(
      error.message || ''
    ));

const baseAttemptRow = (row) => ({
  user_id: row.userId,
  lesson_id: row.lessonId,
  question_id: row.questionId,
  learning_outcome_key: row.learningOutcomeKey,
  skill_focus: row.skillFocus || null,
  grade_level: row.gradeLevel || null,
  bloom_level: row.bloomLevel || null,
  correct: row.correct,
  selected_option_index: row.selectedOptionIndex ?? null,
  misconception_key: row.misconceptionKey || null,
  modality_shown: row.modalityShown || 'mixed',
  attempt_in_skill_streak: row.attemptInSkillStreak || 1,
  created_at: new Date().toISOString()
});

const diagnosticAttemptFields = (row) => ({
  response_time_ms: row.responseTimeMs ?? null,
  twin_pair_id: row.twinPairId || null,
  twin_role: row.twinRole || null,
  twin_trigger_reason: row.twinTriggerReason || null,
  source_question_id: row.sourceQuestionId || null,
  question_params: row.questionParams || null
});

export class SkillAttempt {
  static tableName = 'skill_attempts';

  static async create(row) {
    const db = getDbClient();
    const payload = { ...baseAttemptRow(row), ...diagnosticAttemptFields(row) };
    let { data, error } = await db
      .from(this.tableName)
      .insert(payload)
      .select()
      .single();

    if (error && isMissingTwinColumn(error)) {
      if (row.twinRole === 'twist') {
        console.warn('[twin-consistency] migration missing; twist retained in session_review only');
        return null;
      }
      ({ data, error } = await db.from(this.tableName).insert(baseAttemptRow(row)).select().single());
    }
    if (error) throw error;
    return this.mapToModel(data);
  }

  static async createMany(rows) {
    if (!rows?.length) return [];
    const hasDiagnostics = rows.some(
      (row) =>
        row.responseTimeMs !== undefined ||
        row.twinPairId ||
        row.twinRole ||
        row.questionParams
    );
    const insertData = rows.map((row) => ({
      ...baseAttemptRow(row),
      ...(hasDiagnostics ? diagnosticAttemptFields(row) : {})
    }));

    const { data, error } = await getDbClient()
      .from(this.tableName)
      .insert(insertData)
      .select();

    if (error) throw error;
    return (data || []).map((item) => this.mapToModel(item));
  }

  static async countRecentFails(userId, learningOutcomeKey, gradeLevel) {
    const db = getDbClient();
    let { data, error } = await db
      .from(this.tableName)
      .select('id, correct, created_at')
      .eq('user_id', userId)
      .eq('learning_outcome_key', learningOutcomeKey)
      .eq('grade_level', gradeLevel)
      .or('twin_role.is.null,twin_role.neq.twist')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error && isMissingTwinColumn(error)) {
      ({ data, error } = await db
        .from(this.tableName)
        .select('id, correct, created_at')
        .eq('user_id', userId)
        .eq('learning_outcome_key', learningOutcomeKey)
        .eq('grade_level', gradeLevel)
        .order('created_at', { ascending: false })
        .limit(10));
    }
    if (error) throw error;
    let streak = 0;
    for (const row of data || []) {
      if (row.correct) break;
      streak += 1;
    }
    return streak;
  }

  /** Recent attempts for one learner/outcome, newest first. */
  static async listByUserOutcome(userId, learningOutcomeKey, { limit = 40 } = {}) {
    const db = getDbClient();
    let { data, error } = await db
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('learning_outcome_key', learningOutcomeKey)
      .or('twin_role.is.null,twin_role.neq.twist')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error && isMissingTwinColumn(error)) {
      ({ data, error } = await db
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('learning_outcome_key', learningOutcomeKey)
        .order('created_at', { ascending: false })
        .limit(limit));
    }
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  /**
   * Full history for BKT replay, oldest first, including twin twists.
   * Heuristic 3-of-4 still uses listByUserOutcome (twists excluded).
   */
  static async listByUserOutcomeAll(userId, learningOutcomeKey, { limit = 500 } = {}) {
    const db = getDbClient();
    let { data, error } = await db
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('learning_outcome_key', learningOutcomeKey)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error && isMissingTwinColumn(error)) {
      ({ data, error } = await db
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('learning_outcome_key', learningOutcomeKey)
        .order('created_at', { ascending: true })
        .limit(limit));
    }
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  /**
   * Modality that most recently correlated with success on this outcome.
   * Needs ≥2 attempts with ≥2 distinct non-mixed modalities; else null (cold-start).
   */
  static deriveSuccessfulModality(attempts) {
    const usable = (attempts || []).filter(
      (a) => a.modalityShown && a.modalityShown !== 'mixed'
    );
    if (usable.length < 2) return null;
    const distinct = new Set(usable.map((a) => a.modalityShown));
    if (distinct.size < 2) return null;

    // Prefer newest-first order for "most recent correct" tie-break
    const stats = {};
    for (const a of usable) {
      const mod = a.modalityShown;
      if (!stats[mod]) {
        stats[mod] = { correct: 0, total: 0, lastCorrectAt: null };
      }
      stats[mod].total += 1;
      if (a.correct) {
        stats[mod].correct += 1;
        if (!stats[mod].lastCorrectAt) {
          stats[mod].lastCorrectAt = a.createdAt || '';
        }
      }
    }

    let best = null;
    for (const [modality, s] of Object.entries(stats)) {
      const rate = s.total > 0 ? s.correct / s.total : 0;
      if (
        !best ||
        rate > best.rate ||
        (rate === best.rate && (s.lastCorrectAt || '') > (best.lastCorrectAt || ''))
      ) {
        best = { modality, rate, lastCorrectAt: s.lastCorrectAt || '' };
      }
    }
    return best?.modality || null;
  }

  static async getSuccessfulModalityForOutcome(userId, learningOutcomeKey) {
    const attempts = await this.listByUserOutcome(userId, learningOutcomeKey, {
      limit: 40
    });
    return this.deriveSuccessfulModality(attempts);
  }

  /** Batch: Map<learningOutcomeKey, modality|null> for pickNextMain. */
  static async getSuccessfulModalitiesForOutcomes(userId, outcomeKeys) {
    const keys = [...new Set((outcomeKeys || []).filter(Boolean))];
    const result = new Map();
    for (const k of keys) result.set(k, null);
    if (!keys.length) return result;

    const db = getDbClient();
    let { data, error } = await db
      .from(this.tableName)
      .select('learning_outcome_key, modality_shown, correct, created_at')
      .eq('user_id', userId)
      .in('learning_outcome_key', keys)
      .or('twin_role.is.null,twin_role.neq.twist')
      .order('created_at', { ascending: false });

    if (error && isMissingTwinColumn(error)) {
      ({ data, error } = await db
        .from(this.tableName)
        .select('learning_outcome_key, modality_shown, correct, created_at')
        .eq('user_id', userId)
        .in('learning_outcome_key', keys)
        .order('created_at', { ascending: false }));
    }
    if (error) throw error;

    const byOutcome = new Map();
    for (const row of data || []) {
      const k = row.learning_outcome_key;
      if (!byOutcome.has(k)) byOutcome.set(k, []);
      byOutcome.get(k).push({
        modalityShown: row.modality_shown,
        correct: row.correct,
        createdAt: row.created_at
      });
    }

    for (const key of keys) {
      result.set(key, this.deriveSuccessfulModality(byOutcome.get(key) || []));
    }
    return result;
  }

  /** True when ≥3 of the most recent (up to 4) attempts are correct. */
  static meetsMasteredWindow(attemptsNewestFirst) {
    const window = (attemptsNewestFirst || []).slice(0, 4);
    if (window.length < 3) return false;
    const correctCount = window.filter((a) => a.correct).length;
    return correctCount >= 3;
  }

  static mapToModel(data) {
    return {
      id: data.id,
      userId: data.user_id,
      lessonId: data.lesson_id,
      questionId: data.question_id,
      learningOutcomeKey: data.learning_outcome_key,
      skillFocus: data.skill_focus,
      gradeLevel: data.grade_level,
      bloomLevel: data.bloom_level,
      correct: data.correct,
      selectedOptionIndex: data.selected_option_index,
      misconceptionKey: data.misconception_key,
      modalityShown: data.modality_shown,
      attemptInSkillStreak: data.attempt_in_skill_streak,
      responseTimeMs: data.response_time_ms,
      twinPairId: data.twin_pair_id,
      twinRole: data.twin_role,
      twinTriggerReason: data.twin_trigger_reason,
      sourceQuestionId: data.source_question_id,
      questionParams: data.question_params,
      createdAt: data.created_at
    };
  }
}

export class SkillMastery {
  static tableName = 'skill_mastery';

  static async findByUserAndOutcome(userId, learningOutcomeKey) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('learning_outcome_key', learningOutcomeKey)
      .maybeSingle();

    return oneOrNull(data, error, (row) => this.mapToModel(row));
  }

  static async findByUser(userId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  /**
   * Mastered requires ≥3 of the most recent 4 attempts correct (not 2-in-a-row).
   * Fail side unchanged: struggling (<2 consecutive fails) / scaffolding (≥2).
   */
  static async upsertFromAttempt({
    userId,
    learningOutcomeKey,
    skillFocus,
    gradeLevel,
    correct,
    consecutiveFails,
    modalityShown
  }) {
    const existing = await this.findByUserAndOutcome(userId, learningOutcomeKey);
    let status = existing?.status || 'unknown';
    let lastSuccessGrade = existing?.lastSuccessGrade || null;
    let preferredModalityObserved = existing?.preferredModalityObserved || null;

    if (correct) {
      const recent = await SkillAttempt.listByUserOutcome(userId, learningOutcomeKey, {
        limit: 4
      });
      status = SkillAttempt.meetsMasteredWindow(recent) ? 'mastered' : 'developing';
      lastSuccessGrade = gradeLevel;
      if (modalityShown && modalityShown !== 'mixed') {
        preferredModalityObserved = modalityShown;
      }
    } else if (consecutiveFails >= 2) {
      status = 'scaffolding';
    } else {
      status = 'struggling';
    }

    const payload = {
      user_id: userId,
      learning_outcome_key: learningOutcomeKey,
      skill_focus: skillFocus || existing?.skillFocus || null,
      status,
      consecutive_fails_at_level: correct ? 0 : consecutiveFails,
      current_grade_level: gradeLevel,
      last_success_grade: lastSuccessGrade,
      preferred_modality_observed: preferredModalityObserved,
      updated_at: new Date().toISOString(),
      // Preserve BKT columns — this upsert is the 3-of-4 heuristic only (Part 5.4).
      bkt_p_know: existing?.bktPKnow ?? null,
      bkt_n_observations: existing?.bktNObservations ?? null,
      bkt_updated_at: existing?.bktUpdatedAt ?? null
    };

    let { data, error } = await getDbClient()
      .from(this.tableName)
      .upsert(payload, { onConflict: 'user_id,learning_outcome_key' })
      .select()
      .single();

    if (error && isMissingBktColumn(error)) {
      const heuristicOnly = { ...payload };
      delete heuristicOnly.bkt_p_know;
      delete heuristicOnly.bkt_n_observations;
      delete heuristicOnly.bkt_updated_at;
      ({ data, error } = await getDbClient()
        .from(this.tableName)
        .upsert(heuristicOnly, { onConflict: 'user_id,learning_outcome_key' })
        .select()
        .single());
    }

    if (error) throw error;
    return this.mapToModel(data);
  }

  /**
   * Replay BKT from full attempt history (including twins) and store p(Know).
   * Does not change heuristic `status`. Creates a row with status unknown if needed.
   */
  static async recomputeBkt({
    userId,
    learningOutcomeKey,
    skillFocus = null,
    gradeLevel = null
  }) {
    const { replayBkt } = await import('../utils/bkt.js');
    const params = await BktSkillParams.getOrCreate(learningOutcomeKey);
    const attempts = await SkillAttempt.listByUserOutcomeAll(userId, learningOutcomeKey);
    const { pKnow, observations } = replayBkt(attempts, params);
    const existing = await this.findByUserAndOutcome(userId, learningOutcomeKey);
    const now = new Date().toISOString();

    const payload = {
      user_id: userId,
      learning_outcome_key: learningOutcomeKey,
      skill_focus: skillFocus || existing?.skillFocus || null,
      status: existing?.status || 'unknown',
      consecutive_fails_at_level: existing?.consecutiveFailsAtLevel ?? 0,
      current_grade_level: gradeLevel || existing?.currentGradeLevel || null,
      last_success_grade: existing?.lastSuccessGrade || null,
      preferred_modality_observed: existing?.preferredModalityObserved || null,
      updated_at: existing?.updatedAt || now,
      bkt_p_know: pKnow,
      bkt_n_observations: observations,
      bkt_updated_at: now
    };

    let { data, error } = await getDbClient()
      .from(this.tableName)
      .upsert(payload, { onConflict: 'user_id,learning_outcome_key' })
      .select()
      .single();

    if (error && isMissingBktColumn(error)) {
      console.warn('BKT columns missing; heuristic status stored without p(Know)');
      return existing || this.mapToModel({ ...payload, id: null });
    }

    if (error) throw error;
    return this.mapToModel(data);
  }

  static mapToModel(data) {
    return {
      id: data.id,
      userId: data.user_id,
      learningOutcomeKey: data.learning_outcome_key,
      skillFocus: data.skill_focus,
      status: data.status,
      consecutiveFailsAtLevel: data.consecutive_fails_at_level,
      currentGradeLevel: data.current_grade_level,
      lastSuccessGrade: data.last_success_grade,
      preferredModalityObserved: data.preferred_modality_observed,
      bktPKnow: data.bkt_p_know == null ? null : Number(data.bkt_p_know),
      bktNObservations: data.bkt_n_observations == null ? null : Number(data.bkt_n_observations),
      bktUpdatedAt: data.bkt_updated_at || null,
      updatedAt: data.updated_at,
      createdAt: data.created_at
    };
  }
}

/** Per-skill BKT parameters. Missing keys get the Part 5.2 defaults. */
export class BktSkillParams {
  static tableName = 'bkt_skill_params';

  static async getOrCreate(learningOutcomeKey) {
    const key = String(learningOutcomeKey || '').trim();
    if (!key) {
      return { pL0: 0.3, pT: 0.3, pS: 0.1, pG: 0.2 };
    }
    const db = getDbClient();
    const { data: existing, error: readErr } = await db
      .from(this.tableName)
      .select('*')
      .eq('learning_outcome_key', key)
      .maybeSingle();
    if (readErr && isMissingBktColumn(readErr)) {
      return { pL0: 0.3, pT: 0.3, pS: 0.1, pG: 0.2 };
    }
    if (readErr) throw readErr;
    if (existing) {
      return {
        pL0: Number(existing.p_l0),
        pT: Number(existing.p_t),
        pS: Number(existing.p_s),
        pG: Number(existing.p_g)
      };
    }

    const { data, error } = await db
      .from(this.tableName)
      .upsert(
        {
          learning_outcome_key: key,
          p_l0: 0.3,
          p_t: 0.3,
          p_s: 0.1,
          p_g: 0.2,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'learning_outcome_key' }
      )
      .select()
      .single();
    if (error) throw error;
    return {
      pL0: Number(data.p_l0),
      pT: Number(data.p_t),
      pS: Number(data.p_s),
      pG: Number(data.p_g)
    };
  }
}
