# Backend Integration Guide

## ✅ What Was Fixed

The frontend was using **local state (Zustand)** instead of calling the backend API. This meant data was only stored in memory and not saved to the database.

### Changes Made:

1. **Created API Client** (`frontend/src/lib/api.ts`)
   - Centralized API client for all backend calls
   - Handles errors and JSON parsing
   - Base URL: `http://localhost:3000/api` (configurable via `VITE_API_URL`)

2. **Updated Note Store** (`frontend/src/store/useNoteStore.ts`)
   - Now uses API calls instead of local state
   - Added `fetchNotes()` to load data from backend
   - All operations (create, update, delete) now save to database
   - Added loading and error states

3. **Updated Notes Page** (`frontend/src/pages/admin/Notes.tsx`)
   - Fetches notes on component mount
   - Handles async operations properly
   - Shows loading and error states

## 🚀 How to Use

### 1. Start the Backend Server

```bash
cd backend
npm install  # If not done already
npm start
```

The server should run on `http://localhost:3000`

### 2. Start the Frontend

```bash
cd frontend
npm install  # If not done already
npm run dev
```

### 3. Test the Integration

1. Open the admin dashboard
2. Navigate to "Manage Notes"
3. Click "Add Note" - it should save to the database
4. Refresh the page - notes should persist

## 📝 Next Steps

You'll need to update other stores similarly:

- `useCurriculumStore.ts` - Update to use `api.admin.*` methods
- `useSubjectStore.ts` - Update to use `api.admin.*` methods
- `useStrandStore.ts` - Update to use `api.admin.*` methods
- `useLessonStore.ts` - Update to use `api.admin.*` methods
- `useQuizStore.ts` - Update to use `api.admin.*` methods

The API client already has all the methods defined in `frontend/src/lib/api.ts`.

## 🔧 Configuration

To change the API URL, create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:3000/api
```

## 🐛 Troubleshooting

**Error: "Failed to fetch"**
- Make sure the backend server is running
- Check that the API URL is correct
- Check browser console for CORS errors

**Error: "Network request failed"**
- Backend server might not be running
- Check `http://localhost:3000/api/health` in browser

**Data not saving**
- Check browser console for errors
- Check backend server logs
- Verify database tables exist (run migration if needed)

## ✅ Testing

Test the API directly:
```bash
# Health check
curl http://localhost:3000/api/health

# Get notes
curl http://localhost:3000/api/admin/notes

# Create a note
curl -X POST http://localhost:3000/api/admin/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test note","grade":"11","difficulty":"beginner","content":"Test content","tags":[],"duration":30}'
```

