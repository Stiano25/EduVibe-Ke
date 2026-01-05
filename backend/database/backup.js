import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BACKUP_DIR = path.join(__dirname, 'backups');
const KEEP_BACKUPS = 30;

async function backupDatabase() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  
  if (!dbUrl) {
    console.error('❌ Error: SUPABASE_DB_URL not found in environment');
    console.error('   Please set SUPABASE_DB_URL in your .env file');
    console.error('   Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres');
    process.exit(1);
  }

  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }

  // Generate backup filename
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, -5)
    .replace('T', '_');
  const backupFile = path.join(BACKUP_DIR, `eduvibe_backup_${timestamp}.sql.gz`);

  console.log('🔄 Starting backup...');
  console.log(`📄 Backup file: ${backupFile}`);

  try {
    // Run pg_dump
    const command = `pg_dump "${dbUrl}" --file="${backupFile}" --verbose --compress=9`;
    
    console.log('⏳ Running pg_dump...');
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('pg_dump: warning')) {
      console.warn('⚠️  Warnings:', stderr);
    }

    // Check if backup file was created
    if (!fs.existsSync(backupFile)) {
      throw new Error('Backup file was not created');
    }

    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('✅ Backup completed successfully!');
    console.log(`📊 File size: ${fileSizeMB} MB`);

    // Clean old backups
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('eduvibe_backup_') && f.endsWith('.sql.gz'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime
      }))
      .sort((a, b) => b.time - a.time);

    if (backups.length > KEEP_BACKUPS) {
      const toDelete = backups.slice(KEEP_BACKUPS);
      let deletedCount = 0;
      toDelete.forEach(backup => {
        try {
          fs.unlinkSync(backup.path);
          deletedCount++;
        } catch (err) {
          console.warn(`⚠️  Could not delete ${backup.name}: ${err.message}`);
        }
      });
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned ${deletedCount} old backup(s) (keeping last ${KEEP_BACKUPS})`);
      }
    }

    console.log(`\n💾 Backup saved to: ${backupFile}`);
    console.log(`📅 Total backups: ${backups.length}`);
    
  } catch (error) {
    console.error('❌ Backup failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('pg_dump: command not found')) {
      console.error('\n💡 Solution: Install PostgreSQL client tools');
      console.error('   Windows: choco install postgresql');
      console.error('   macOS: brew install postgresql');
      console.error('   Linux: sudo apt-get install postgresql-client');
    } else if (error.message.includes('connection')) {
      console.error('\n💡 Solution: Check your SUPABASE_DB_URL');
      console.error('   - Verify the connection string is correct');
      console.error('   - Check if your IP is allowed in Supabase settings');
      console.error('   - Ensure the database is accessible');
    }
    
    process.exit(1);
  }
}

// Run backup
backupDatabase();

