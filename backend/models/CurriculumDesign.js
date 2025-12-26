import { supabase } from '../config/supabase.js';

export class CurriculumDesign {
  static tableName = 'curriculum_designs';

  static async create(data) {
    const { grade, subjectName, name, disciplines, pdfUrl, pdfFileName } = data;
    
    // Auto-generate name if not provided: Grade{number}_{SubjectName}_Curriculum Design
    let designName = name;
    if (!designName && grade && subjectName) {
      designName = `Grade${grade}_${subjectName}_Curriculum Design`;
    }
    
    const { data: curriculumDesign, error } = await supabase
      .from(this.tableName)
      .insert({
        grade,
        subject_name: subjectName,
        name: designName,
        disciplines: disciplines || [],
        pdf_url: pdfUrl,
        pdf_file_name: pdfFileName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToModel(curriculumDesign);
  }

  static async findBySubjectName(grade, subjectName) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('grade', grade)
      .eq('subject_name', subjectName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data ? this.mapToModel(data) : null;
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
      .order('grade', { ascending: true })
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
    if (updates.pdfUrl !== undefined) {
      updateData.pdf_url = updates.pdfUrl;
      delete updateData.pdfUrl;
    }
    if (updates.pdfFileName !== undefined) {
      updateData.pdf_file_name = updates.pdfFileName;
      delete updateData.pdfFileName;
    }
    if (updates.subjectName !== undefined) {
      updateData.subject_name = updates.subjectName;
      delete updateData.subjectName;
    }
    
    // Auto-update name if subjectName or grade changes
    if (updates.subjectName || updates.grade) {
      const current = await this.findById(id);
      if (current) {
        const newGrade = updates.grade || current.grade;
        const newSubjectName = updates.subjectName || current.subjectName;
        if (newGrade && newSubjectName) {
          updateData.name = `Grade${newGrade}_${newSubjectName}_Curriculum Design`;
        }
      }
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
      grade: data.grade,
      subjectName: data.subject_name,
      name: data.name,
      disciplines: data.disciplines || [],
      pdfUrl: data.pdf_url,
      pdfFileName: data.pdf_file_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

