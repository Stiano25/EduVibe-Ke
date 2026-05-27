# Stores Update Summary

## ✅ All Stores Updated

All Zustand stores have been updated to connect to the backend API instead of using local state. Data will now persist to the Supabase database.

## Updated Stores

1. ✅ **useNoteStore** - Notes management
2. ✅ **useCurriculumStore** - Curriculum designs
3. ✅ **useSubjectStore** - Subjects
4. ✅ **useStrandStore** - Strands (with AI generation)
5. ✅ **useLessonStore** - Lessons (with AI generation and approval)
6. ✅ **useQuizStore** - Quizzes

## Key Changes

### Before (Local State)
```typescript
addNote: (noteData) => {
  const newNote = { ...noteData, id: Date.now().toString() }
  set((state) => ({ notes: [...state.notes, newNote] }))
}
```

### After (API Integration)
```typescript
addNote: async (noteData) => {
  set({ isLoading: true, error: null })
  try {
    const newNote = await api.admin.createNote(noteData)
    set((state) => ({ notes: [...state.notes, newNote], isLoading: false }))
  } catch (error) {
    set({ error: error.message, isLoading: false })
    throw error
  }
}
```

## New Features Added

### 1. Loading States
All stores now have `isLoading` state:
```typescript
const { notes, isLoading } = useNoteStore()
```

### 2. Error Handling
All stores now have `error` state:
```typescript
const { notes, error } = useNoteStore()
```

### 3. Fetch Methods
All stores have `fetch*` methods to load data:
```typescript
const { fetchNotes } = useNoteStore()

useEffect(() => {
  fetchNotes()
}, [fetchNotes])
```

## Usage Examples

### Fetching Data
```typescript
import { useEffect } from 'react'
import { useNoteStore } from '@/store/useNoteStore'

export const MyComponent = () => {
  const { notes, isLoading, error, fetchNotes } = useNoteStore()

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return <div>{/* render notes */}</div>
}
```

### Creating Data
```typescript
const { addNote, isLoading } = useNoteStore()

const handleSave = async (noteData) => {
  try {
    await addNote(noteData)
    // Success - note is saved to database
  } catch (error) {
    // Error is already handled in store
    console.error('Failed to save:', error)
  }
}
```

### Updating Data
```typescript
const { updateNote } = useNoteStore()

const handleUpdate = async (id, updates) => {
  try {
    await updateNote(id, updates)
    // Success - note is updated in database
  } catch (error) {
    console.error('Failed to update:', error)
  }
}
```

### Deleting Data
```typescript
const { deleteNote } = useNoteStore()

const handleDelete = async (id) => {
  try {
    await deleteNote(id)
    // Success - note is deleted from database
  } catch (error) {
    console.error('Failed to delete:', error)
  }
}
```

## Store-Specific Methods

### Curriculum Store
- `fetchCurriculumDesigns()` - Load all designs
- `fetchCurriculumDesignsByGrade(grade)` - Load by grade
- `getGrades()` - Get unique grades (local filter)

### Subject Store
- `fetchSubjects()` - Load all subjects
- `fetchSubjectsByCurriculumDesign(id)` - Load by curriculum
- `fetchSubjectsByGrade(grade)` - Load by grade
- `fetchSubjectsByDiscipline(discipline)` - Load by discipline

### Strand Store
- `fetchStrands()` - Load all strands
- `fetchStrandsBySubject(subjectId)` - Load by subject
- `addAIGeneratedStrands(data)` - Generate AI strands

### Lesson Store
- `fetchLessons()` - Load all lessons
- `fetchLessonsByStrand(strandId)` - Load by strand
- `fetchLessonsBySubject(subjectId)` - Load by subject
- `fetchLessonsByStatus(status)` - Load by status
- `addAIGeneratedLessons(data)` - Generate AI lessons
- `approveLesson(id, approvedBy)` - Approve lesson
- `rejectLesson(id)` - Reject lesson

### Quiz Store
- `fetchQuizzes()` - Load all quizzes
- `fetchQuizzesByLink(type, id)` - Load by link
- `fetchQuizzesByGrade(grade)` - Load by grade

## Important Notes

1. **All operations are now async** - Use `await` or `.then()`
2. **Always fetch data on mount** - Use `useEffect` with `fetch*` methods
3. **Handle errors** - Check `error` state and use try/catch
4. **Show loading states** - Use `isLoading` state for better UX
5. **Backend must be running** - Ensure `http://localhost:3000` is running

## Next Steps

Update your components to:
1. Fetch data on mount using `fetch*` methods
2. Handle async operations properly
3. Show loading and error states
4. Remove any `setTimeout` delays (no longer needed)

## Testing

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Test each feature:
   - Create → Should save to database
   - Refresh page → Data should persist
   - Update → Should update in database
   - Delete → Should remove from database







