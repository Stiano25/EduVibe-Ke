import { getDbClient } from '../config/supabase.js';
import { oneOrNull } from '../utils/dbResult.js';

export class Strand {
  static tableName = 'strands';

  static async create(data) {
    const { name, description, subjectId, theme, isAIGenerated } = data;
    
    const { data: strand, error } = await getDbClient()
      .from(this.tableName)
      .insert({
        name,
        description,
        subject_id: subjectId,
        theme,
        is_ai_generated: isAIGenerated ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(strand);
  }

  static async createMany(strandsData) {
    const insertData = strandsData.map(data => ({
      name: data.name,
      description: data.description || '',
      subject_id: data.subjectId,
      theme: data.theme,
      is_ai_generated: data.isAIGenerated ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await getDbClient()
      .from(this.tableName)
      .insert(insertData)
      .select();

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async findById(id) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return oneOrNull(data, error, (row) => this.mapToModel(row));
  }

  static async findBySubjectAndName(subjectId, name) {
    const strands = await this.findBySubject(subjectId);
    const key = this.normalizeName(name);
    if (!key) return null;
    return strands.find((strand) => this.normalizeName(strand.name) === key) || null;
  }

  /**
   * Strands for a subject in curriculum order (oldest first = PDF parse order).
   */
  static async findBySubject(subjectId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((item) => this.mapToModel(item));
  }

  /**
   * Normalize strand names so PDF re-parses with tiny naming differences collapse:
   * "1.0 NUMBERS" / "1.0: NUMBERS" / "NUMBERS" → same key.
   */
  static normalizeName(name) {
    return (name || '')
      .toLowerCase()
      .replace(/^theme\s+/i, '')
      .replace(/^\d+(\.\d+)?\s*[:.)-]?\s*/i, '')
      .replace(/[:./_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Keep first occurrence of each normalized strand name (call after sorting / filtering). */
  static dedupeByNamePreserveOrder(strands) {
    const seen = new Set();
    return strands.filter((strand) => {
      const key = this.normalizeName(strand.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** Return subject IDs that have at least one strand (single query). */
  static async findSubjectIdsHavingAny(subjectIds) {
    if (!subjectIds?.length) return new Set();

    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('subject_id')
      .in('subject_id', subjectIds);

    if (error) throw error;
    return new Set((data || []).map((row) => row.subject_id));
  }

  static async findAll() {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async update(id, updates) {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Map camelCase to snake_case
    if (updates.subjectId !== undefined) {
      updateData.subject_id = updates.subjectId;
      delete updateData.subjectId;
    }
    if (updates.isAIGenerated !== undefined) {
      updateData.is_ai_generated = updates.isAIGenerated;
      delete updateData.isAIGenerated;
    }

    const { data, error } = await getDbClient()
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(data);
  }

  static async delete(id) {
    const { error } = await getDbClient()
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static mapToModel(data) {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      subjectId: data.subject_id,
      theme: data.theme,
      isAIGenerated: data.is_ai_generated,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

