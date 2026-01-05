# Backend Setup Guide

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Configure Environment Variables

Create a `.env` file in the `backend/` directory with the following:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
# Get these from your Supabase project settings: https://app.supabase.com/project/_/settings/api
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=sb_secret_oLOLsghTx3blzzF8MXOrKw_1kFjLsA9

# Gemini AI Configuration
# Get this from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### How to get your Supabase credentials:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (you already have this)

## Step 3: Create Database Tables

You need to create the following tables in Supabase. Go to **SQL Editor** and run the migration scripts (see `database/migrations.sql` if available, or create them manually).

Required tables:
- `curriculum_designs`
- `subjects`
- `strands`
- `lessons`
- `notes`
- `quizzes`
- `users`

## Step 4: Start the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

## Testing

Test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

Test the dashboard metrics:
```bash
curl http://localhost:3000/api/admin/dashboard/metrics
```





