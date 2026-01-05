// Automated Table Creation Script
// This uses Supabase Management API to create tables programmatically

import dotenv from 'dotenv';
import { supabaseAdmin } from '../config/supabase.js';

dotenv.config();

async function createTables() {
  console.log('🚀 Creating database tables...\n');

  if (!supabaseAdmin) {
    console.error('❌ Admin client not available. Check SUPABASE_SERVICE_ROLE_KEY in .env');
    return;
  }

  // Since Supabase JS client doesn't support raw SQL execution,
  // we'll provide clear instructions and verify the connection
  
  console.log('📋 IMPORTANT: Supabase JS client cannot execute raw SQL directly.');
  console.log('   You need to run the SQL migration manually.\n');
  
  console.log('📝 Steps to create tables:');
  console.log('   1. Open: https://app.supabase.com/project/evmvruqclyhfeuycuezi/sql');
  console.log('   2. Click "New Query"');
  console.log('   3. Open the file: backend/database/migrations.sql');
  console.log('   4. Copy ALL the contents');
  console.log('   5. Paste into the SQL Editor');
  console.log('   6. Click "Run" (or press Ctrl+Enter)\n');

  // Test connection
  try {
    console.log('🔌 Testing Supabase connection...');
    const { data, error } = await supabaseAdmin.from('users').select('count').limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('✅ Connection successful!');
        console.log('   Tables not found - ready to create them.\n');
      } else {
        console.log('⚠️  Connection issue:', error.message);
      }
    } else {
      console.log('✅ Connection successful!');
      console.log('   Some tables may already exist.\n');
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }

  console.log('💡 After running the migration, test with: node test-connection.js');
}

createTables();





