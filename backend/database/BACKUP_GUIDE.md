# Database Backup Guide

This guide covers multiple methods to backup your Supabase PostgreSQL database for EduVibe.

## Table of Contents
1. [Supabase Built-in Backups](#supabase-built-in-backups)
2. [Manual Backup with pg_dump](#manual-backup-with-pg_dump)
3. [Automated Backup Script](#automated-backup-script)
4. [Restore from Backup](#restore-from-backup)
5. [Best Practices](#best-practices)

---

## Supabase Built-in Backups

### Automatic Backups (Recommended for Production)

Supabase provides automatic daily backups for all projects:

1. **Access Backups**:
   - Go to your Supabase Dashboard: https://app.supabase.com
   - Select your project
   - Navigate to **Settings** → **Database** → **Backups**

2. **Backup Retention**:
   - **Free Tier**: 7 days of backups
   - **Pro Tier**: 7 days of backups
   - **Team/Enterprise**: Custom retention periods

3. **Point-in-Time Recovery (PITR)**:
   - Available on Pro and Enterprise plans
   - Allows recovery to any point in time within the retention period

### Manual Backup via Supabase Dashboard

1. Go to **Settings** → **Database** → **Backups**
2. Click **"Create Backup"** or **"Download Backup"**
3. The backup will be available for download as a SQL dump

---

## Manual Backup with pg_dump

### Prerequisites

1. Install PostgreSQL client tools:
   ```bash
   # Windows (using Chocolatey)
   choco install postgresql

   # macOS
   brew install postgresql

   # Linux (Ubuntu/Debian)
   sudo apt-get install postgresql-client
   ```

2. Get your database connection string from Supabase:
   - Go to **Settings** → **Database**
   - Find **Connection string** → **URI**
   - Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

### Basic Backup Command

```bash
# Full database backup
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --file=eduvibe_backup_$(date +%Y%m%d_%H%M%S).sql \
  --verbose

# Compressed backup (recommended)
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --file=eduvibe_backup_$(date +%Y%m%d_%H%M%S).sql.gz \
  --verbose \
  --compress=9
```

### Backup Specific Tables Only

```bash
# Backup only specific tables
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --table=users \
  --table=lessons \
  --table=quizzes \
  --file=eduvibe_partial_backup_$(date +%Y%m%d_%H%M%S).sql \
  --verbose
```

### Backup Schema Only (Structure)

```bash
# Schema only (no data)
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --schema-only \
  --file=eduvibe_schema_$(date +%Y%m%d_%H%M%S).sql \
  --verbose
```

### Backup Data Only (No Schema)

```bash
# Data only (no structure)
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --data-only \
  --file=eduvibe_data_$(date +%Y%m%d_%H%M%S).sql \
  --verbose
```

---

## Automated Backup Script

Create a backup script that can be run manually or scheduled.

### Windows PowerShell Script

Create `backend/database/backup.ps1`:

```powershell
# EduVibe Database Backup Script
# Usage: .\backup.ps1

param(
    [string]$BackupDir = ".\backups",
    [string]$EnvFile = "..\.env"
)

# Load environment variables
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

$SUPABASE_DB_URL = $env:SUPABASE_DB_URL
if (-not $SUPABASE_DB_URL) {
    Write-Host "Error: SUPABASE_DB_URL not found in environment" -ForegroundColor Red
    exit 1
}

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Generate backup filename with timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir "eduvibe_backup_$timestamp.sql.gz"

Write-Host "Starting backup..." -ForegroundColor Green
Write-Host "Backup file: $backupFile" -ForegroundColor Cyan

# Run pg_dump
try {
    # Extract connection details from URL
    $dbUrl = $SUPABASE_DB_URL
    
    # Use pg_dump with compression
    pg_dump $dbUrl --file=$backupFile --verbose --compress=9
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $backupFile).Length / 1MB
        Write-Host "Backup completed successfully!" -ForegroundColor Green
        Write-Host "File size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
        
        # Optional: Keep only last 30 backups
        Get-ChildItem $BackupDir -Filter "eduvibe_backup_*.sql.gz" | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -Skip 30 | 
            Remove-Item
        
        Write-Host "Old backups cleaned (keeping last 30)" -ForegroundColor Yellow
    } else {
        Write-Host "Backup failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
```

### Linux/macOS Bash Script

Create `backend/database/backup.sh`:

```bash
#!/bin/bash
# EduVibe Database Backup Script
# Usage: ./backup.sh

set -e

# Configuration
BACKUP_DIR="./backups"
ENV_FILE="../.env"
KEEP_BACKUPS=30

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' $ENV_FILE | xargs)
fi

# Check for database URL
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "Error: SUPABASE_DB_URL not found in environment"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/eduvibe_backup_$TIMESTAMP.sql.gz"

echo "Starting backup..."
echo "Backup file: $BACKUP_FILE"

# Run pg_dump
if pg_dump "$SUPABASE_DB_URL" --file="$BACKUP_FILE" --verbose --compress=9; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup completed successfully!"
    echo "File size: $FILE_SIZE"
    
    # Keep only last N backups
    ls -t "$BACKUP_DIR"/eduvibe_backup_*.sql.gz | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm
    
    echo "Old backups cleaned (keeping last $KEEP_BACKUPS)"
else
    echo "Backup failed!"
    exit 1
fi
```

Make it executable:
```bash
chmod +x backend/database/backup.sh
```

### Node.js Backup Script

Create `backend/database/backup.js`:

```javascript
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BACKUP_DIR = path.join(__dirname, 'backups');
const KEEP_BACKUPS = 30;

async function backupDatabase() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  
  if (!dbUrl) {
    console.error('Error: SUPABASE_DB_URL not found in environment');
    process.exit(1);
  }

  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Generate backup filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(BACKUP_DIR, `eduvibe_backup_${timestamp}.sql.gz`);

  console.log('Starting backup...');
  console.log(`Backup file: ${backupFile}`);

  // Run pg_dump
  const command = `pg_dump "${dbUrl}" --file="${backupFile}" --verbose --compress=9`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup failed: ${error.message}`);
      process.exit(1);
    }

    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('Backup completed successfully!');
    console.log(`File size: ${fileSizeMB} MB`);

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
      toDelete.forEach(backup => {
        fs.unlinkSync(backup.path);
        console.log(`Deleted old backup: ${backup.name}`);
      });
      console.log(`Cleaned old backups (keeping last ${KEEP_BACKUPS})`);
    }
  });
}

backupDatabase();
```

Add to `package.json`:
```json
{
  "scripts": {
    "backup": "node database/backup.js"
  }
}
```

---

## Restore from Backup

### Restore Full Database

```bash
# From SQL file
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < eduvibe_backup_20240101_120000.sql

# From compressed file
gunzip -c eduvibe_backup_20240101_120000.sql.gz | psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

### Restore via Supabase Dashboard

1. Go to **Settings** → **Database** → **Backups**
2. Select a backup point
3. Click **"Restore"** or **"Download"**

⚠️ **Warning**: Restoring will overwrite existing data. Always backup current state before restoring.

---

## Best Practices

### 1. Backup Frequency

- **Development**: Weekly or before major changes
- **Production**: Daily (automatic) + before deployments
- **Critical Operations**: Before and after major data migrations

### 2. Backup Storage

- Store backups in multiple locations:
  - Local machine
  - Cloud storage (AWS S3, Google Cloud Storage, etc.)
  - Version control (for schema-only backups)

### 3. Backup Verification

Regularly test restore procedures:
```bash
# Test restore to a temporary database
createdb eduvibe_test
psql eduvibe_test < eduvibe_backup_20240101_120000.sql
# Verify data integrity
dropdb eduvibe_test
```

### 4. Automated Scheduling

#### Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., Daily at 2 AM)
4. Action: Start a program
5. Program: `powershell.exe`
6. Arguments: `-File "E:\EduVibe Ke\backend\database\backup.ps1"`

#### Linux/macOS Cron
```bash
# Edit crontab
crontab -e

# Add line for daily backup at 2 AM
0 2 * * * cd /path/to/backend/database && ./backup.sh >> backup.log 2>&1
```

### 5. Environment Variables

Create `.env` with:
```env
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

⚠️ **Security**: Never commit `.env` files to version control. Add to `.gitignore`.

### 6. Backup Retention

- Keep at least 30 days of backups
- Keep weekly backups for 3 months
- Keep monthly backups for 1 year

### 7. Monitoring

Set up alerts for:
- Failed backups
- Backup file size anomalies
- Storage space issues

---

## Quick Reference

### Common Commands

```bash
# Full backup
pg_dump "$SUPABASE_DB_URL" --file=backup.sql.gz --compress=9

# Schema only
pg_dump "$SUPABASE_DB_URL" --schema-only --file=schema.sql

# Data only
pg_dump "$SUPABASE_DB_URL" --data-only --file=data.sql

# Restore
gunzip -c backup.sql.gz | psql "$SUPABASE_DB_URL"

# List tables
psql "$SUPABASE_DB_URL" -c "\dt"

# Check database size
psql "$SUPABASE_DB_URL" -c "SELECT pg_size_pretty(pg_database_size('postgres'));"
```

---

## Troubleshooting

### Error: "pg_dump: command not found"
- Install PostgreSQL client tools (see Prerequisites)

### Error: "connection refused"
- Check your database URL
- Verify network connectivity
- Check Supabase project status

### Error: "permission denied"
- Verify database credentials
- Check IP allowlist in Supabase settings

### Large Backup Files
- Use compression (`--compress=9`)
- Consider backing up only specific tables
- Use incremental backups for large databases

---

## Additional Resources

- [Supabase Backup Documentation](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL Backup and Restore Guide](https://www.postgresql.org/docs/current/backup.html)

---

**Last Updated**: 2024
**Maintained by**: EduVibe Development Team

