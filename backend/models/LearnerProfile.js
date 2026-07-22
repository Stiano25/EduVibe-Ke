import { getDbClient } from '../config/supabase.js';
import { oneOrNull } from '../utils/dbResult.js';

export class LearnerProfile {
  static tableName = 'learner_profiles';

  static async findByUserId(userId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return oneOrNull(data, error, (row) => this.mapToModel(row));
  }

  static async getOrCreate(userId) {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    const { data, error } = await getDbClient()
      .from(this.tableName)
      .insert({
        user_id: userId,
        preferred_modality: 'mixed',
        scaffold_tolerance: 2,
        modality_prompt_seen: false
      })
      .select()
      .single();

    if (error) {
      // Race: another request created it
      const again = await this.findByUserId(userId);
      if (again) return again;
      throw error;
    }
    return this.mapToModel(data);
  }

  static async upsert(userId, updates = {}) {
    await this.getOrCreate(userId);
    const updateData = { updated_at: new Date().toISOString() };
    if (updates.preferredModality !== undefined) {
      updateData.preferred_modality = updates.preferredModality;
    }
    if (updates.scaffoldTolerance !== undefined) {
      updateData.scaffold_tolerance = updates.scaffoldTolerance;
    }
    if (updates.modalityPromptSeen !== undefined) {
      updateData.modality_prompt_seen = updates.modalityPromptSeen;
    }

    const { data, error } = await getDbClient()
      .from(this.tableName)
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(data);
  }

  static mapToModel(data) {
    return {
      id: data.id,
      userId: data.user_id,
      preferredModality: data.preferred_modality,
      scaffoldTolerance: data.scaffold_tolerance ?? 2,
      modalityPromptSeen: data.modality_prompt_seen === true,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
