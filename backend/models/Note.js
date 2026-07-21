import { getDbClient } from '../config/supabase.js';
import { oneOrNull } from '../utils/dbResult.js';

export class Note {
  static tableName = 'notes';

  static async create(data) {
    const {
      title,
      description,
      subStrandId,
      grade,
      difficulty,
      content,
      images,
      videos,
      learningObjectives,
      keyConcepts,
      examples,
      summary,
      tags,
      duration
    } = data;

    const { data: note, error } = await getDbClient()
      .from(this.tableName)
      .insert({
        title,
        description,
        sub_strand_id: subStrandId,
        grade,
        difficulty,
        content,
        images: images || [],
        videos: videos || [],
        learning_objectives: learningObjectives || [],
        key_concepts: keyConcepts || [],
        examples: examples || [],
        summary,
        tags: tags || [],
        duration,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(note);
  }

  static async findById(id) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return oneOrNull(data, error, (row) => this.mapToModel(row));
  }

  static async findBySubStrand(subStrandId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('sub_strand_id', subStrandId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async findByGrade(grade) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('grade', grade)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async findByDifficulty(difficulty) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('difficulty', difficulty)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
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
    if (updates.subStrandId !== undefined) {
      updateData.sub_strand_id = updates.subStrandId;
      delete updateData.subStrandId;
    }
    if (updates.learningObjectives !== undefined) {
      updateData.learning_objectives = updates.learningObjectives;
      delete updateData.learningObjectives;
    }
    if (updates.keyConcepts !== undefined) {
      updateData.key_concepts = updates.keyConcepts;
      delete updateData.keyConcepts;
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
      title: data.title,
      description: data.description,
      subStrandId: data.sub_strand_id,
      grade: data.grade,
      difficulty: data.difficulty,
      content: data.content,
      images: data.images || [],
      videos: data.videos || [],
      learningObjectives: data.learning_objectives || [],
      keyConcepts: data.key_concepts || [],
      examples: data.examples || [],
      summary: data.summary,
      tags: data.tags || [],
      duration: data.duration,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}







