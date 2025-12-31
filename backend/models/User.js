import { supabase, supabaseAdmin } from '../config/supabase.js';

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

  static async findByEmail(email, useAdmin = false) {
    // Use admin client if requested (for fetching after creation)
    const client = (useAdmin && supabaseAdmin) ? supabaseAdmin : supabase;
    
    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
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

  static async create(data) {
    const { name, email, role, avatar, grade, passwordHash } = data;
    
    // Insert user - let Supabase handle timestamps if they have defaults
    const insertData = {
      name,
      email,
      role: role || 'learner',
      avatar: avatar || null,
      grade: grade || null,
      password_hash: passwordHash || null
    };
    
    // Use admin client to bypass RLS for user creation
    // If admin client is not available, log a warning
    const client = supabaseAdmin || supabase;
    
    if (!supabaseAdmin) {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set. Using anon client - RLS might block user creation.');
    }
    
    console.log('Creating user with client:', supabaseAdmin ? 'admin' : 'anon');
    
    const { data: users, error } = await client
      .from(this.tableName)
      .insert(insertData)
      .select();

    // Handle specific Supabase errors
    if (error) {
      console.error('Error creating user:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // If it's a "coerce" error, try fetching by email instead
      if (error.code === 'PGRST116' || error.message?.includes('coerce')) {
        console.log('Select failed, trying to fetch user by email as fallback...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Use admin client for fetching too
        const fetchClient = supabaseAdmin || supabase;
        const { data: fetchedUser, error: fetchError } = await fetchClient
          .from(this.tableName)
          .select('*')
          .eq('email', email)
          .maybeSingle(); // Use maybeSingle instead of single to avoid error on no rows
        
        if (fetchedUser) {
          console.log('Successfully fetched user by email');
          return this.mapToModel(fetchedUser);
        }
        
        console.error('Failed to fetch user by email:', fetchError);
      }
      
      throw error;
    }
    
    // If insert doesn't return data, fetch the user by email as fallback
    if (!users || users.length === 0) {
      console.log('Insert succeeded but no data returned, fetching user by email...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const fetchClient = supabaseAdmin || supabase;
      const { data: fetchedUser, error: fetchError } = await fetchClient
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error on no rows
      
      if (fetchedUser) {
        return this.mapToModel(fetchedUser);
      }
      
      throw new Error('User was not created - no data returned and could not fetch by email');
    }
    
    return this.mapToModel(users[0]);
  }

  static mapToModel(data) {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: data.avatar,
      grade: data.grade,
      passwordHash: data.password_hash, // Only for internal use, never return to client
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

