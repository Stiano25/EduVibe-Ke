// Test script to verify Supabase connection
import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';

dotenv.config();

async function testConnection() {
  try {
    console.log('🔌 Testing Supabase connection...');
    console.log('📡 URL:', process.env.SUPABASE_URL);
    console.log('🔑 Anon Key:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('🔐 Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
    
    // Test a simple query
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️  Tables not found. Please run the migration script first.');
        console.log('   Go to Supabase SQL Editor and run: backend/database/migrations.sql');
      } else {
        console.error('❌ Connection error:', error.message);
      }
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('📊 Database is ready.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConnection();





