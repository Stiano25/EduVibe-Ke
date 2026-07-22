import { getDbClient } from '../config/supabase.js';
import { oneOrNull } from '../utils/dbResult.js';

export class SkillAttempt {
  static tableName = 'skill_attempts';

  static async create(row) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .insert({
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
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(data);
  }

  static async createMany(rows) {
    if (!rows?.length) return [];
    const insertData = rows.map((row) => ({
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
    }));

    const { data, error } = await getDbClient()
      .from(this.tableName)
      .insert(insertData)
      .select();

    if (error) throw error;
    return (data || []).map((item) => this.mapToModel(item));
  }

  static async countRecentFails(userId, learningOutcomeKey, gradeLevel) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('id, correct, created_at')
      .eq('user_id', userId)
      .eq('learning_outcome_key', learningOutcomeKey)
      .eq('grade_level', gradeLevel)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    let streak = 0;
    for (const row of data || []) {
      if (row.correct) break;
      streak += 1;
    }
    return streak;
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
      status = consecutiveFails === 0 && existing?.status === 'scaffolding' ? 'developing' : 'developing';
      if (existing?.status === 'developing' || existing?.status === 'mastered') {
        status = 'mastered';
      }
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
      updated_at: new Date().toISOString()
    };

    const { data, error } = await getDbClient()
      .from(this.tableName)
      .upsert(payload, { onConflict: 'user_id,learning_outcome_key' })
      .select()
      .single();

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
      updatedAt: data.updated_at,
      createdAt: data.created_at
    };
  }
}
