import { User } from './models/User.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  try {
    const email = 'Wisdom369@eduvibe.com';
    const password = 'CTRLRoom@369';
    const name = 'Admin User'; // You can change this if needed

    console.log('🔐 Creating admin user...');
    console.log(`📧 Email: ${email}`);

    // Check if user already exists
    const existingUser = await User.findByEmail(email, true);
    if (existingUser) {
      console.log('⚠️  User with this email already exists!');
      console.log(`   User ID: ${existingUser.id}`);
      console.log(`   Role: ${existingUser.role}`);
      
      // Update existing user to admin if not already
      if (existingUser.role !== 'admin') {
        console.log('🔄 Updating user role to admin...');
        // We'll need to update the user - for now, just inform
        console.log('   Please update the user role manually or delete and recreate.');
        return;
      }
      
      // Update password if needed
      console.log('🔄 Updating password...');
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Update password using Supabase directly
      const { supabaseAdmin } = await import('./config/supabase.js');
      if (supabaseAdmin) {
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ password_hash: passwordHash })
          .eq('email', email);
        
        if (updateError) {
          console.error('❌ Error updating password:', updateError);
          return;
        }
        console.log('✅ Password updated successfully!');
      } else {
        console.log('⚠️  Service role key not available. Cannot update password.');
      }
      
      return;
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    console.log('👤 Creating user...');
    const user = await User.create({
      name,
      email,
      role: 'admin',
      passwordHash
    });

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 User Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Keep these credentials secure!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    console.error('Error details:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    process.exit(1);
  }
}

createAdmin();




