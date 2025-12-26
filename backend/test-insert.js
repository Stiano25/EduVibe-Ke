// Test script to check if we can insert data
import dotenv from 'dotenv';
import { supabase, supabaseAdmin } from './config/supabase.js';
import { CurriculumDesign } from './models/CurriculumDesign.js';

dotenv.config();

async function testInsert() {
  try {
    console.log('🧪 Testing database insert...\n');

    // First, check if tables exist
    console.log('1️⃣ Checking if tables exist...');
    const { data: tables, error: tableError } = await supabase
      .from('curriculum_designs')
      .select('count')
      .limit(1);

    if (tableError) {
      if (tableError.code === 'PGRST116') {
        console.log('❌ Tables do not exist!');
        console.log('   Please run the migration first:');
        console.log('   1. Go to: https://app.supabase.com/project/evmvruqclyhfeuycuezi/sql');
        console.log('   2. Copy contents of: backend/database/migrations.sql');
        console.log('   3. Paste and run\n');
        return;
      } else {
        console.log('⚠️  Error checking tables:', tableError.message);
        console.log('   Code:', tableError.code);
        console.log('   Details:', tableError.details);
        console.log('   Hint:', tableError.hint, '\n');
      }
    } else {
      console.log('✅ Tables exist!\n');
    }

    // Try a simple insert
    console.log('2️⃣ Testing insert operation...');
    try {
      const testData = {
        grade: '11',
        name: 'Test Curriculum Design',
        disciplines: ['Mathematics', 'Physics']
      };

      const result = await CurriculumDesign.create(testData);
      console.log('✅ Insert successful!');
      console.log('   Created:', result.id);
      
      // Clean up - delete the test record
      await CurriculumDesign.delete(result.id);
      console.log('   Test record cleaned up\n');

    } catch (insertError) {
      console.log('❌ Insert failed:', insertError.message);
      console.log('   Code:', insertError.code);
      console.log('   Details:', insertError.details);
      console.log('   Hint:', insertError.hint, '\n');

      // Check for RLS issues
      if (insertError.code === '42501' || insertError.message.includes('permission')) {
        console.log('🔒 ROW LEVEL SECURITY (RLS) ISSUE DETECTED!');
        console.log('   Supabase RLS policies are blocking the insert.');
        console.log('   Solution:');
        console.log('   1. Go to: https://app.supabase.com/project/evmvruqclyhfeuycuezi/auth/policies');
        console.log('   2. Disable RLS for development, OR');
        console.log('   3. Create policies that allow inserts\n');
      }

      // Check for missing columns
      if (insertError.code === '42703' || insertError.message.includes('column')) {
        console.log('📋 COLUMN MISMATCH DETECTED!');
        console.log('   The database columns don\'t match the model.');
        console.log('   Solution: Run the migration script to create correct columns\n');
      }
    }

    // Check RLS status
    console.log('3️⃣ Checking Row Level Security status...');
    console.log('   (This requires checking table policies in Supabase dashboard)');
    console.log('   Go to: https://app.supabase.com/project/evmvruqclyhfeuycuezi/auth/policies\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testInsert();

