import { getDbClient } from '../config/supabase.js';
import { oneOrNull } from '../utils/dbResult.js';

export class CurriculumOutcome {
  static tableName = 'curriculum_outcomes';

  static mapToModel(row) {
    if (!row) return null;
    return {
      id: row.id,
      subStrandId: row.sub_strand_id,
      strandId: row.strand_id,
      subjectId: row.subject_id,
      grade: row.grade,
      outcomeText: row.outcome_text,
      outcomeKey: row.outcome_key,
      sortIndex: row.sort_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async findBySubStrand(subStrandId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('sub_strand_id', subStrandId)
      .order('sort_index', { ascending: true });
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

  static async findByIds(ids = []) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    if (!unique.length) return [];
    const { data, error } = await getDbClient().from(this.tableName).select('*').in('id', unique);
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  static async findByOutcomeKey(key, { grade = null } = {}) {
    if (!key) return [];
    let q = getDbClient().from(this.tableName).select('*').eq('outcome_key', key);
    if (grade != null && grade !== '') q = q.eq('grade', String(grade));
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  static async listAll({ limit = 2000 } = {}) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .order('grade', { ascending: true })
      .order('sort_index', { ascending: true })
      .limit(Math.min(Number(limit) || 2000, 5000));
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  static async replaceForSubStrand(subStrandId, rows) {
    const db = getDbClient();
    const { error: delError } = await db.from(this.tableName).delete().eq('sub_strand_id', subStrandId);
    if (delError) throw delError;
    if (!rows.length) return [];
    const { data, error } = await db
      .from(this.tableName)
      .insert(
        rows.map((row) => ({
          sub_strand_id: subStrandId,
          strand_id: row.strandId || null,
          subject_id: row.subjectId || null,
          grade: row.grade || null,
          outcome_text: row.outcomeText,
          outcome_key: row.outcomeKey,
          sort_index: row.sortIndex,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      )
      .select();
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }
}

export class Unit {
  static tableName = 'units';

  static mapToModel(row) {
    if (!row) return null;
    return {
      id: row.id,
      subStrandId: row.sub_strand_id,
      strandId: row.strand_id,
      subjectId: row.subject_id,
      grade: row.grade,
      name: row.name,
      sequenceNumber: row.sequence_number,
      lessonsAllocated: row.lessons_allocated,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async upsertForSubStrand(subStrand, extra = {}) {
    const existing = await this.findBySubStrandId(subStrand.id);
    const values = {
      sub_strand_id: subStrand.id,
      strand_id: subStrand.strandId,
      subject_id: subStrand.subjectId,
      grade: extra.grade || existing?.grade || null,
      name: subStrand.name,
      sequence_number: subStrand.sequenceNumber ?? extra.sequenceNumber ?? null,
      lessons_allocated: subStrand.lessonsAllocated ?? extra.lessonsAllocated ?? null,
      updated_at: new Date().toISOString()
    };
    if (existing) {
      const { data, error } = await getDbClient()
        .from(this.tableName)
        .update(values)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return this.mapToModel(data);
    }
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .insert({ ...values, created_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return this.mapToModel(data);
  }

  static async findBySubStrandId(subStrandId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('sub_strand_id', subStrandId)
      .maybeSingle();
    return oneOrNull(data, error, (row) => this.mapToModel(row));
  }

  static async findByStrand(strandId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('strand_id', strandId)
      .order('sequence_number', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  static async findBySubject(subjectId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('subject_id', subjectId)
      .order('grade', { ascending: true })
      .order('sequence_number', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }
}

export class PrerequisiteEdge {
  static tableName = 'prerequisite_edges';

  static mapToModel(row) {
    if (!row) return null;
    return {
      id: row.id,
      outcomeId: row.outcome_id,
      prerequisiteOutcomeId: row.prerequisite_outcome_id,
      confidence: row.confidence,
      source: row.source,
      edgeType: row.edge_type,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at || null,
      reviewerId: row.reviewer_id || null,
      rejectReason: row.reject_reason || null
    };
  }

  static async findById(id) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return oneOrNull(data, error, (row) => this.mapToModel(row));
  }

  static async listByOutcome(outcomeId, { edgeType = null, statuses = null } = {}) {
    if (!outcomeId) return [];
    let q = getDbClient().from(this.tableName).select('*').eq('outcome_id', outcomeId);
    if (edgeType) q = q.eq('edge_type', edgeType);
    if (Array.isArray(statuses) && statuses.length) q = q.in('status', statuses);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  static async listByStatus(status, { edgeType = null, limit = 80 } = {}) {
    let q = getDbClient()
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit) || 80, 200));
    if (status && status !== 'all') q = q.eq('status', status);
    if (edgeType) q = q.eq('edge_type', edgeType);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  static async update(id, fields) {
    const payload = { };
    if (fields.status !== undefined) payload.status = fields.status;
    if (fields.reason !== undefined) payload.reason = fields.reason;
    if (fields.confidence !== undefined) payload.confidence = fields.confidence;
    if (fields.prerequisiteOutcomeId !== undefined) {
      payload.prerequisite_outcome_id = fields.prerequisiteOutcomeId;
    }
    if (fields.reviewedAt !== undefined) payload.reviewed_at = fields.reviewedAt;
    if (fields.reviewerId !== undefined) payload.reviewer_id = fields.reviewerId;
    if (fields.rejectReason !== undefined) payload.reject_reason = fields.rejectReason;
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapToModel(data);
  }

  static async deleteBySource(source) {
    const { error } = await getDbClient().from(this.tableName).delete().eq('source', source);
    if (error) throw error;
  }

  static async createMany(rows) {
    if (!rows.length) return [];
    const insertData = rows.map((row) => ({
      outcome_id: row.outcomeId,
      prerequisite_outcome_id: row.prerequisiteOutcomeId,
      confidence: row.confidence ?? 1,
      source: row.source || 'curriculum_sequence',
      edge_type: row.edgeType,
      reason: row.reason || null,
      status: row.status || 'active'
    }));
    const { data, error } = await getDbClient().from(this.tableName).insert(insertData).select();
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  static async list({ edgeType = null, source = 'curriculum_sequence', limit = 5000 } = {}) {
    let q = getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('source', source)
      .limit(Math.min(Number(limit) || 5000, 20000));
    if (edgeType) q = q.eq('edge_type', edgeType);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((row) => this.mapToModel(row));
  }

  static async countByType() {
    const db = getDbClient();
    const types = ['same_strand_prior_grade', 'same_grade_prior_substrand', 'cross_strand'];
    const byType = {};
    let total = 0;
    for (const edgeType of types) {
      const { count, error } = await db
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('edge_type', edgeType);
      if (error) throw error;
      byType[edgeType] = count || 0;
      total += count || 0;
    }
    return { total, byType };
  }
}
