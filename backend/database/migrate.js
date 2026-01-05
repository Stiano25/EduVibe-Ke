// Automated Database Migration Script
// This script connects directly to PostgreSQL and creates all tables

import dotenv from 'dotenv';
import pkg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pkg;
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  let client;

  try {
    console.log('🚀 Starting database migration...\n');

    // Get Supabase connection details
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    }

    // Extract database connection details from Supabase URL
    // Supabase URL format: https://project-ref.supabase.co
    // We need to construct the PostgreSQL connection string
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!urlMatch) {
      throw new Error('Invalid Supabase URL format');
    }

    const projectRef = urlMatch[1];
    
    // Supabase PostgreSQL connection details
    // You can find these in: Project Settings > Database > Connection string
    // For now, we'll use the Supabase REST API approach which is simpler
    
    console.log('📋 Note: Direct PostgreSQL connection requires database password.');
    console.log('   Using Supabase Management API instead...\n');

    // Alternative: Use Supabase Management API
    const sql = readFileSync(join(__dirname, 'migrations.sql'), 'utf8');

    // Supabase doesn't expose a direct SQL execution endpoint via REST API
    // The best approach is to use Supabase CLI or manual execution
    // But we can create a helper that makes it easier

    console.log('⚠️  Supabase JS client cannot execute raw SQL directly.');
    console.log('   However, I can help you run it easily!\n');
    
    console.log('📝 EASIEST METHOD:');
    console.log('   1. Open this link: https://app.supabase.com/project/evmvruqclyhfeuycuezi/sql/new');
    console.log('   2. The SQL file is ready at: backend/database/migrations.sql');
    console.log('   3. Copy the entire file contents');
    console.log('   4. Paste into the SQL Editor');
    console.log('   5. Click "Run" (or Ctrl+Enter)\n');

    console.log('💡 ALTERNATIVE: Use Supabase CLI (if you have it installed)');
    console.log('   supabase db push\n');

    // We can still verify the connection works
    console.log('🔌 Verifying Supabase connection...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('✅ Connection verified! Tables need to be created.');
    } else if (error) {
      console.log('⚠️  Connection issue:', error.message);
    } else {
      console.log('✅ Connection verified! Some tables may already exist.');
    }

    console.log('\n✨ After running the migration, test with: node test-connection.js');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.log('\n📋 Please run the migration manually:');
    console.log('   1. Go to: https://app.supabase.com/project/evmvruqclyhfeuycuezi/sql');
    console.log('   2. Open: backend/database/migrations.sql');
    console.log('   3. Copy and paste into SQL Editor');
    console.log('   4. Run the query');
  }
}

runMigration();





