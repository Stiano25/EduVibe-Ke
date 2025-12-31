# Quick Start Guide

## ✅ Step 1: Environment Setup (DONE)
Your `.env` file has been created with your Supabase credentials.

## 📦 Step 2: Install Dependencies
```bash
cd backend
npm install
```

## 🗄️ Step 3: Create Database Tables
1. Go to your Supabase project: https://app.supabase.com/project/evmvruqclyhfeuycuezi
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `backend/database/migrations.sql`
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" - this means the tables were created!

## 🧪 Step 4: Test the Connection
```bash
node test-connection.js
```

If you see "✅ Supabase connection successful!", you're good to go!

## 🚀 Step 5: Start the Server
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## 🧪 Step 6: Test the API
Open your browser or use curl:
- Health check: http://localhost:3000/api/health
- Dashboard metrics: http://localhost:3000/api/admin/dashboard/metrics

## 📝 Next Steps
1. Get your Gemini API key from https://makersuite.google.com/app/apikey
2. Add it to your `.env` file: `GEMINI_API_KEY=your_key_here`
3. Start building your admin dashboard integration!

## ⚠️ Important Notes
- The `.env` file is already in `.gitignore` - your secrets are safe
- Make sure your Supabase project has Row Level Security (RLS) configured if needed
- For production, update `NODE_ENV=production` and set proper CORS origins




