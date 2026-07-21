import { getDbClient } from '../config/supabase.js';
import { oneOrNull } from '../utils/dbResult.js';

export class Subject {
  static tableName = 'subjects';

  static async create(data) {
    const { name, description, curriculumDesignId, grade, icon, color } = data;
    
    const { data: subject, error } = await getDbClient()
      .from(this.tableName)
      .insert({
        name,
        description,
        curriculum_design_id: curriculumDesignId,
        grade,
        icon,
        color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(subject);
  }

  static async findById(id) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return oneOrNull(data, error, (row) => this.mapToModel(row));
  }

  static async findByCurriculumDesign(curriculumDesignId) {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .eq('curriculum_design_id', curriculumDesignId)
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


  static async findAll() {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .order('grade', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async update(id, updates) {
    // Only allow specific fields to be updated in subjects table
    // PDF fields (pdfUrl, pdfFileName) belong to curriculum_designs table, not subjects
    const allowedFields = ['name', 'description', 'curriculumDesignId', 'grade', 'icon', 'color'];
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Only include allowed fields
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Map camelCase to snake_case
    if (updateData.curriculumDesignId !== undefined) {
      updateData.curriculum_design_id = updateData.curriculumDesignId;
      delete updateData.curriculumDesignId;
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
      curriculumDesignId: data.curriculum_design_id,
      grade: data.grade,
      icon: data.icon,
      color: data.color,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

