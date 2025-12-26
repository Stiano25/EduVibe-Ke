import { supabase } from '../config/supabase.js';

export class SubStrand {
  static tableName = 'sub_strands';

  static async create(data) {
    const {
      name,
      description,
      strandId,
      subjectId,
      learningOutcomes,
      keyInquiryQuestions,
      isAIGenerated
    } = data;

    const { data: subStrand, error } = await supabase
      .from(this.tableName)
      .insert({
        name,
        description,
        strand_id: strandId,
        subject_id: subjectId,
        learning_outcomes: learningOutcomes || [],
        key_inquiry_questions: keyInquiryQuestions || [],
        is_ai_generated: isAIGenerated ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(subStrand);
  }

  static async createMany(subStrandsData) {
    const insertData = subStrandsData.map(data => ({
      name: data.name,
      description: data.description || '',
      strand_id: data.strandId,
      subject_id: data.subjectId,
      learning_outcomes: data.learningOutcomes || [],
      key_inquiry_questions: data.keyInquiryQuestions || [],
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

  static async findByStrand(strandId) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('strand_id', strandId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
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
    if (updates.strandId !== undefined) {
      updateData.strand_id = updates.strandId;
      delete updateData.strandId;
    }
    if (updates.subjectId !== undefined) {
      updateData.subject_id = updates.subjectId;
      delete updateData.subjectId;
    }
    if (updates.learningOutcomes !== undefined) {
      updateData.learning_outcomes = updates.learningOutcomes;
      delete updateData.learningOutcomes;
    }
    if (updates.keyInquiryQuestions !== undefined) {
      updateData.key_inquiry_questions = updates.keyInquiryQuestions;
      delete updateData.keyInquiryQuestions;
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
      strandId: data.strand_id,
      subjectId: data.subject_id,
      learningOutcomes: data.learning_outcomes || [],
      keyInquiryQuestions: data.key_inquiry_questions || [],
      isAIGenerated: data.is_ai_generated,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

