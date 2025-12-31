# Database Migration Guide

## Quick Migration (Recommended)

The easiest way to create the database tables is through Supabase's SQL Editor:

1. **Open SQL Editor**: https://app.supabase.com/project/evmvruqclyhfeuycuezi/sql/new

2. **Copy the migration file**: Open `backend/database/migrations.sql` and copy ALL its contents

3. **Paste and Run**: 
   - Paste into the SQL Editor
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for "Success" message

4. **Verify**: Run `npm run test-connection` to verify tables were created

## What the Migration Creates

The migration script creates:
- ✅ `users` table - User accounts (admin/learner)
- ✅ `curriculum_designs` table - Curriculum designs by grade
- ✅ `subjects` table - Subjects from curriculum designs
- ✅ `strands` table - Strands (AI-generated from PDFs)
- ✅ `lessons` table - Lessons (AI-generated from strands)
- ✅ `notes` table - Educational notes
- ✅ `quizzes` table - Quizzes
- ✅ Indexes for performance
- ✅ Automatic `updated_at` triggers

## Alternative Methods

### Using Supabase CLI (if installed)
```bash
supabase db push
```

### Using the Helper Script
```bash
npm run migrate
```
This will verify your connection and provide step-by-step instructions.

## Troubleshooting

**Error: "relation does not exist"**
- Tables haven't been created yet. Run the migration.

**Error: "permission denied"**
- Make sure you're using the correct Supabase project
- Check that your service role key is correct in `.env`

**Error: "duplicate key value"**
- Some tables may already exist. This is okay - the migration uses `CREATE TABLE IF NOT EXISTS`

## After Migration

Test your connection:
```bash
npm run test-connection
```

Start the server:
```bash
npm start
```

Test the API:
- Health: http://localhost:3000/api/health
- Dashboard: http://localhost:3000/api/admin/dashboard/metrics




