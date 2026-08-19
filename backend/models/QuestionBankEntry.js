import { getDbClient } from '../config/supabase.js';
import { oneOrNull } from '../utils/dbResult.js';

export class QuestionBankEntry {
  static tableName = 'question_bank_entries';

  static mapToModel(row) {
    if (!row) return null;
    return {
      id: row.id,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      grade: row.grade,
      strandId: row.strand_id,
      subStrandId: row.sub_strand_id,
      topic: row.topic,
      difficulty: row.difficulty,
      interactionType: row.interaction_type,
      bloomLevel: row.bloom_level,
      question: row.question || {},
      styleSourceNote: row.style_source_note,
      status: row.status,
      qaFlagged: row.qa_flagged,
      qaIssue: row.qa_issue,
      flaggedNearDuplicate: row.flagged_near_duplicate,
      rejectReason: row.reject_reason,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async createMany(rows) {
    if (!rows.length) return [];
    const insertData = rows.map((row) => ({
      subject_id: row.subjectId || null,
      subject_name: row.subjectName || null,
      grade: row.grade || null,
      strand_id: row.strandId || null,
      sub_strand_id: row.subStrandId || null,
      topic: row.topic || null,
      difficulty: row.difficulty || null,
      interaction_type: row.interactionType || 'multiple_choice',
      bloom_level: row.bloomLevel || null,
      question: row.question || {},
      style_source_note: row.styleSourceNote || null,
      status: row.status || 'pending',
      qa_flagged: !!row.qaFlagged,
      qa_issue: row.qaIssue || null,
      flagged_near_duplicate: !!row.flaggedNearDuplicate,
      reject_reason: row.rejectReason || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .insert(insertData)
      .select();
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  static async findById(id) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return oneOrNull(data, error, (row) => this.mapToModel(row));
  }

  static async list({
    status = null,
    subStrandId = null,
    grade = null,
    subjectId = null,
    strandId = null,
    limit = 50
  } = {}) {
    let q = getDbClient()
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit) || 50, 200));
    if (status) q = q.eq('status', status);
    if (subStrandId) q = q.eq('sub_strand_id', subStrandId);
    if (grade) q = q.eq('grade', String(grade));
    if (subjectId) q = q.eq('subject_id', subjectId);
    if (strandId) q = q.eq('strand_id', strandId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  static async findApprovedForPull({ subStrandId, grade, interactionType = null }) {
    let q = getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('status', 'approved');
    if (interactionType) q = q.eq('interaction_type', interactionType);
    if (subStrandId) q = q.eq('sub_strand_id', subStrandId);
    if (grade) q = q.eq('grade', String(grade));
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  static async update(id, fields) {
    const patch = { updated_at: new Date().toISOString() };
    if (fields.question !== undefined) patch.question = fields.question;
    if (fields.difficulty !== undefined) patch.difficulty = fields.difficulty;
    if (fields.bloomLevel !== undefined) patch.bloom_level = fields.bloomLevel;
    if (fields.interactionType !== undefined) patch.interaction_type = fields.interactionType;
    if (fields.styleSourceNote !== undefined) patch.style_source_note = fields.styleSourceNote;
    if (fields.status !== undefined) patch.status = fields.status;
    if (fields.qaFlagged !== undefined) patch.qa_flagged = fields.qaFlagged;
    if (fields.qaIssue !== undefined) patch.qa_issue = fields.qaIssue;
    if (fields.flaggedNearDuplicate !== undefined) {
      patch.flagged_near_duplicate = fields.flaggedNearDuplicate;
    }
    if (fields.rejectReason !== undefined) patch.reject_reason = fields.rejectReason;
    if (fields.reviewedBy !== undefined) patch.reviewed_by = fields.reviewedBy;
    if (fields.reviewedAt !== undefined) patch.reviewed_at = fields.reviewedAt;
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapToModel(data);
  }
}

export class QuestionBankServe {
  static tableName = 'question_bank_serves';

  static async record({ bankEntryId, lessonId = null, learnerId = null, questionId = null, source }) {
    if (!bankEntryId || !source) return null;
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .insert({
        bank_entry_id: bankEntryId,
        lesson_id: lessonId,
        learner_id: learnerId,
        question_id: questionId,
        source,
        served_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();
    if (error) {
      console.warn('[question-bank-serves] insert skipped:', error.message || error);
      return null;
    }
    return data;
  }
}
