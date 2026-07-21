import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client for regular operations (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for operations requiring service role (use with caution)
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Prefer service-role client for server-side DB access.
 * The anon key has no user JWT here, so RLS blocks most reads/writes.
 */
let warnedMissingServiceRole = false;
export const getDbClient = () => {
  if (!supabaseAdmin && !warnedMissingServiceRole) {
    warnedMissingServiceRole = true;
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set; using anon client (RLS may block operations).');
  }
  return supabaseAdmin || supabase;
};

export default supabase;







