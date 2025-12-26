import { supabase } from '../config/supabase.js';

export class Quiz {
  static tableName = 'quizzes';

  static async create(data) {
    const {
      title,
      description,
      grade,
      difficulty,
      questions,
      passingScore,
      timeLimit,
      linkedTo
    } = data;

    const { data: quiz, error } = await supabase
      .from(this.tableName)
      .insert({
        title,
        description,
        grade,
        difficulty,
        questions,
        passing_score: passingScore,
        time_limit: timeLimit,
        linked_to: linkedTo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(quiz);
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

  static async findByLink(type, linkId) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('linked_to->>type', type)
      .eq('linked_to->>id', linkId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async findByGrade(grade) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('grade', grade)
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
    if (updates.passingScore !== undefined) {
      updateData.passing_score = updates.passingScore;
      delete updateData.passingScore;
    }
    if (updates.timeLimit !== undefined) {
      updateData.time_limit = updates.timeLimit;
      delete updateData.timeLimit;
    }
    if (updates.linkedTo !== undefined) {
      updateData.linked_to = updates.linkedTo;
      delete updateData.linkedTo;
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
      title: data.title,
      description: data.description,
      grade: data.grade,
      difficulty: data.difficulty,
      questions: data.questions || [],
      passingScore: data.passing_score,
      timeLimit: data.time_limit,
      linkedTo: data.linked_to,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

