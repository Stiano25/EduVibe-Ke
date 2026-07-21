import { getDbClient } from '../config/supabase.js';
import { oneOrNull } from '../utils/dbResult.js';

export class Lesson {
  static tableName = 'lessons';

  static async create(data) {
    const {
      title,
      description,
      strandId,
      subStrandId,
      subjectId,
      grade,
      contentType,
      difficulty,
      tags,
      duration,
      videoUrl,
      content,
      images,
      videos,
      learningObjectives,
      keyConcepts,
      examples,
      summary,
      quiz,
      isAIGenerated,
      status,
      lessonOrder
    } = data;

    const { data: lesson, error } = await getDbClient()
      .from(this.tableName)
      .insert({
        title,
        description,
        strand_id: strandId,
        sub_strand_id: subStrandId,
        subject_id: subjectId,
        grade,
        content_type: contentType,
        difficulty,
        tags,
        duration,
        video_url: videoUrl,
        content,
        images,
        videos,
        learning_objectives: learningObjectives,
        key_concepts: keyConcepts,
        examples,
        summary,
      quiz: quiz || null,
      is_ai_generated: isAIGenerated ?? true,
      status: status || 'pending',
      lesson_order: lessonOrder || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(lesson);
  }

  static async createMany(lessonsData) {
    const insertData = lessonsData.map((data, index) => ({
      title: data.title,
      description: data.description,
      strand_id: data.strandId,
      sub_strand_id: data.subStrandId,
      subject_id: data.subjectId,
      grade: data.grade,
      content_type: data.contentType,
      difficulty: data.difficulty,
      tags: data.tags || [],
      duration: data.duration,
      video_url: data.videoUrl,
      content: data.content,
      images: data.images || [],
      videos: data.videos || [],
      learning_objectives: data.learningObjectives || [],
      key_concepts: data.keyConcepts || [],
      examples: data.examples || [],
      summary: data.summary,
      quiz: data.quiz || null,
      is_ai_generated: data.isAIGenerated ?? true,
      status: data.status || 'pending',
      lesson_order: data.lessonOrder ?? index + 1,
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

  static async findByStrand(strandId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('strand_id', strandId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async findBySubStrand(subStrandId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('sub_strand_id', subStrandId)
      .order('lesson_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  /** Return sub-strand IDs that have at least one approved lesson (single query). */
  static async findSubStrandIdsWithApproved(subStrandIds) {
    if (!subStrandIds?.length) return new Set();

    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('sub_strand_id')
      .in('sub_strand_id', subStrandIds)
      .eq('status', 'approved');

    if (error) throw error;
    return new Set((data || []).map((row) => row.sub_strand_id));
  }

  static async findBySubject(subjectId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async findByStatus(status) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('status', status)
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
    if (updates.strandId !== undefined) {
      updateData.strand_id = updates.strandId;
      delete updateData.strandId;
    }
    if (updates.subStrandId !== undefined) {
      updateData.sub_strand_id = updates.subStrandId;
      delete updateData.subStrandId;
    }
    if (updates.subjectId !== undefined) {
      updateData.subject_id = updates.subjectId;
      delete updateData.subjectId;
    }
    if (updates.contentType !== undefined) {
      updateData.content_type = updates.contentType;
      delete updateData.contentType;
    }
    if (updates.videoUrl !== undefined) {
      updateData.video_url = updates.videoUrl;
      delete updateData.videoUrl;
    }
    if (updates.learningObjectives !== undefined) {
      updateData.learning_objectives = updates.learningObjectives;
      delete updateData.learningObjectives;
    }
    if (updates.keyConcepts !== undefined) {
      updateData.key_concepts = updates.keyConcepts;
      delete updateData.keyConcepts;
    }
    if (updates.isAIGenerated !== undefined) {
      updateData.is_ai_generated = updates.isAIGenerated;
      delete updateData.isAIGenerated;
    }
    if (updates.approvedAt !== undefined) {
      updateData.approved_at = updates.approvedAt;
      delete updateData.approvedAt;
    }
    if (updates.approvedBy !== undefined) {
      updateData.approved_by = updates.approvedBy;
      delete updateData.approvedBy;
    }
    if (updates.lessonOrder !== undefined) {
      updateData.lesson_order = updates.lessonOrder;
      delete updateData.lessonOrder;
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
      strandId: data.strand_id,
      subStrandId: data.sub_strand_id,
      subjectId: data.subject_id,
      grade: data.grade,
      contentType: data.content_type,
      difficulty: data.difficulty,
      tags: data.tags || [],
      duration: data.duration,
      videoUrl: data.video_url,
      content: data.content,
      images: data.images || [],
      videos: data.videos || [],
      learningObjectives: data.learning_objectives || [],
      keyConcepts: data.key_concepts || [],
      examples: data.examples || [],
      summary: data.summary,
      quiz: data.quiz || null,
      isAIGenerated: data.is_ai_generated,
      status: data.status,
      approvedAt: data.approved_at,
      approvedBy: data.approved_by,
      lessonOrder: data.lesson_order || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

