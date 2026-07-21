import { supabase, getDbClient } from '../config/supabase.js';
import { oneOrNull } from '../utils/dbResult.js';

export class User {
  static tableName = 'users';

  static async findById(id, useAdmin = true) {
    // Server-side lookups use service role by default (anon has no JWT → RLS blocks)
    const client = useAdmin ? getDbClient() : supabase;

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return oneOrNull(data, error, (row) => this.mapToModel(row));
  }

  static async findByEmail(email, useAdmin = false) {
    // Use admin client if requested (for fetching after creation / login password check)
    const client = useAdmin ? getDbClient() : supabase;
    
    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .maybeSingle();

    // Include password hash only when admin fetch is used (login)
    return oneOrNull(data, error, (row) =>
      this.mapToModel(row, { includePasswordHash: useAdmin })
    );
  }

  static async findAll() {
    const { data, error } = await getDbClient()
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(item => this.mapToModel(item));
  }

  static async findByRole(role) {
    const { data, error } = await getDbClient()
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

  static async create(data) {
    const { name, email, role, avatar, grade, passwordHash } = data;

    const insertData = {
      name,
      email,
      role: role || 'learner',
      avatar: avatar || null,
      grade: grade || null,
      password_hash: passwordHash || null
    };

    const client = getDbClient();
    const { data: users, error } = await client
      .from(this.tableName)
      .insert(insertData)
      .select();

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('coerce')) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const { data: fetchedUser } = await client
          .from(this.tableName)
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (fetchedUser) return this.mapToModel(fetchedUser);
      }
      console.error('Error creating user:', error.message || error);
      throw error;
    }

    if (!users?.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const { data: fetchedUser } = await client
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (fetchedUser) return this.mapToModel(fetchedUser);
      throw new Error('User was not created - no data returned and could not fetch by email');
    }

    return this.mapToModel(users[0]);
  }

  static mapToModel(data, { includePasswordHash = false } = {}) {
    const user = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: data.avatar,
      grade: data.grade,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    // Only attach hash for login verification — never for list/get APIs
    if (includePasswordHash) {
      user.passwordHash = data.password_hash;
    }
    return user;
  }
}

