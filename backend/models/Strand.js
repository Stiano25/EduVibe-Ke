import { supabase } from '../config/supabase.js';

export class Strand {
  static tableName = 'strands';

  static async create(data) {
    const { name, description, subjectId, theme, isAIGenerated } = data;
    
    const { data: strand, error } = await supabase
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

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(insertData)
      .select();

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? this.mapToModel(data) : null;
  }

  static async findBySubject(subjectId) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async findAll() {
    const { data, error } = await supabase
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

    const { data, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(data);
  }

  static async delete(id) {
    const { error } = await supabase
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

