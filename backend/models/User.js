import { supabase } from '../config/supabase.js';

export class User {
  static tableName = 'users';

  static async findById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? this.mapToModel(data) : null;
  }

  static async findByEmail(email) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data ? this.mapToModel(data) : null;
  }

  static async findAll() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async findByRole(role) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async getActiveLearners() {
    // This would need to check last login or activity
    // For now, return all learners
    return this.findByRole('learner');
  }

  static mapToModel(data) {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: data.avatar,
      grade: data.grade,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

