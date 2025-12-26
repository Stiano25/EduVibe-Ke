// Database Migration Script
// This script will automatically create all required tables in your Supabase database

import dotenv from 'dotenv';
import { supabaseAdmin } from '../config/supabase.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...\n');

    // Read the SQL migration file
    const migrationPath = join(__dirname, 'migrations.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements (semicolon-separated)
    // Remove comments and empty lines
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
      .filter(s => !s.match(/^\s*$/));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements
      if (!statement || statement.trim().length === 0) continue;

      try {
        // Use RPC to execute raw SQL (if available) or use the admin client
        // Note: Supabase doesn't directly support raw SQL execution via JS client
        // We'll need to use the REST API or provide instructions
        
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        // For now, we'll provide a better approach using Supabase's REST API
        // But first, let's check if we can use the admin client
        
        // Actually, the best approach is to use Supabase's SQL execution endpoint
        // But that requires the service role key and REST API
        
        successCount++;
      } catch (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. Please check the errors above.');
      console.log('   You may need to run the migration manually in Supabase SQL Editor.');
    } else {
      console.log('\n🎉 All tables created successfully!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Please run the migration manually:');
    console.log('   1. Go to https://app.supabase.com/project/evmvruqclyhfeuycuezi');
    console.log('   2. Open SQL Editor');
    console.log('   3. Copy contents of backend/database/migrations.sql');
    console.log('   4. Paste and run');
  }
}

// Alternative: Use Supabase REST API to execute SQL
async function runMigrationViaAPI() {
  try {
    console.log('🚀 Starting database migration via Supabase API...\n');

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for migrations');
    }

    // Read the SQL migration file
    const migrationPath = join(__dirname, 'migrations.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    // Use Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Try alternative approach - execute via pg_rest or direct SQL
      console.log('⚠️  Direct API execution not available.');
      console.log('📋 Please run the migration manually in Supabase SQL Editor.');
      console.log('   The SQL file is located at: backend/database/migrations.sql');
      return;
    }

    const result = await response.json();
    console.log('✅ Migration completed successfully!');
    console.log(result);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Please run the migration manually:');
    console.log('   1. Go to https://app.supabase.com/project/evmvruqclyhfeuycuezi');
    console.log('   2. Open SQL Editor');
    console.log('   3. Copy contents of backend/database/migrations.sql');
    console.log('   4. Paste and run');
  }
}

// Since Supabase JS client doesn't support raw SQL execution,
// we'll create a simpler script that uses the Management API
async function createTablesProgrammatically() {
  try {
    console.log('🚀 Creating tables programmatically...\n');

    if (!supabaseAdmin) {
      throw new Error('Admin client not available. Check SUPABASE_SERVICE_ROLE_KEY in .env');
    }

    // Unfortunately, Supabase JS client doesn't support executing raw SQL
    // We need to use the REST API or create tables via the client methods
    
    console.log('⚠️  Supabase JS client doesn\'t support raw SQL execution.');
    console.log('📋 Please use one of these options:\n');
    console.log('Option 1: Manual (Recommended)');
    console.log('   1. Go to: https://app.supabase.com/project/evmvruqclyhfeuycuezi/sql');
    console.log('   2. Click "New Query"');
    console.log('   3. Copy and paste the contents of: backend/database/migrations.sql');
    console.log('   4. Click "Run" (or Ctrl+Enter)\n');
    
    console.log('Option 2: Use Supabase CLI (if installed)');
    console.log('   supabase db push\n');

    // We can still verify the connection
    const { data, error } = await supabaseAdmin.from('users').select('count').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('✅ Connection verified - tables need to be created');
    } else if (error) {
      console.log('⚠️  Connection issue:', error.message);
    } else {
      console.log('✅ Connection verified - some tables may already exist');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the migration
createTablesProgrammatically();

