# EduVibe Backend API

Backend API for the EduVibe educational platform built with Node.js, Express, Supabase, and Gemini AI.

## Project Structure

```
backend/
├── admin/              # Admin-specific routes, controllers, and services
│   ├── routes/         # Admin API routes
│   ├── controllers/    # Request handlers for admin endpoints
│   └── services/       # Business logic for admin features
├── learner/            # Learner-specific routes, controllers, and services
│   ├── routes/         # Learner API routes
│   ├── controllers/    # Request handlers for learner endpoints
│   └── services/       # Business logic for learner features
├── models/             # Database models (Supabase)
│   ├── CurriculumDesign.js
│   ├── Subject.js
│   ├── Strand.js
│   ├── Lesson.js
│   ├── Note.js
│   ├── Quiz.js
│   └── User.js
├── config/             # Configuration files
│   ├── supabase.js     # Supabase client configuration
│   └── gemini.js       # Gemini AI configuration
├── server.js           # Main server file
└── package.json        # Dependencies
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

3. Configure your environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (optional, for admin operations)
- `GEMINI_API_KEY`: Your Google Gemini API key
- `GENERATION_PROVIDER`: Optional. Lesson generation provider — `deepseek` (default), `claude`, or `gemini`. Embeddings and OCR stay on Gemini regardless.
- `DEEPSEEK_API_KEY`: Required for DeepSeek generation (default provider)
- `DEEPSEEK_MODEL`: Optional. DeepSeek model id (default `deepseek-v4-pro`; `deepseek-v4-flash` is also valid)
- `ANTHROPIC_API_KEY`: Required when `GENERATION_PROVIDER=claude`
- `CLAUDE_MODEL`: Optional. Claude model id (default `claude-sonnet-5`)
- `QUIZ_QA_ENABLED`: Optional. Batched quiz QA after lesson generation (default on). Set to `false` or `0` to skip the extra generation call per lesson.
- `FRONTEND_URL`: Your frontend URL (for CORS)

Adaptive session scoring (first-try % vs retries) is documented under **Founder decision — adaptive session score** in `docs/quiz-systems-audit.md`. **Open decision:** the 60% pass/unlock floor now compares against first-try-only scores (systematically lower for retry-heavy learners) — revisit after real session data; see that doc section. To recompute `skill_mastery` under the 3-of-4 mastered rule (one-shot, dry-run by default): `node scripts/recompute-skill-mastery.js` then `--apply` after confirming test-only data. Modality selection signals (`per_outcome` / `global_fallback` / `none`) are logged to `adaptive_modality_signal_log` (run `database/migration_modality_signal_log.sql`) and mirrored on `session_review.modalitySignals`.

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Admin Endpoints

#### Dashboard
- `GET /api/admin/dashboard/metrics` - Get dashboard metrics

#### Curriculum
- `POST /api/admin/curriculum` - Create curriculum design
- `GET /api/admin/curriculum` - Get all curriculum designs
- `GET /api/admin/curriculum/grade/:grade` - Get curriculum designs by grade
- `GET /api/admin/curriculum/:id` - Get curriculum design by ID
- `PUT /api/admin/curriculum/:id` - Update curriculum design
- `DELETE /api/admin/curriculum/:id` - Delete curriculum design

#### Subjects
- `POST /api/admin/subjects` - Create subject
- `GET /api/admin/subjects` - Get all subjects
- `GET /api/admin/subjects/curriculum/:curriculumDesignId` - Get subjects by curriculum design
- `GET /api/admin/subjects/grade/:grade` - Get subjects by grade
- `GET /api/admin/subjects/discipline/:discipline` - Get subjects by discipline
- `GET /api/admin/subjects/:id` - Get subject by ID
- `PUT /api/admin/subjects/:id` - Update subject
- `DELETE /api/admin/subjects/:id` - Delete subject

#### Strands
- `POST /api/admin/strands` - Create strand
- `POST /api/admin/strands/ai-generate` - Generate strands using AI
- `GET /api/admin/strands` - Get all strands
- `GET /api/admin/strands/subject/:subjectId` - Get strands by subject
- `GET /api/admin/strands/:id` - Get strand by ID
- `PUT /api/admin/strands/:id` - Update strand
- `DELETE /api/admin/strands/:id` - Delete strand

#### Lessons
- `POST /api/admin/lessons` - Create lesson
- `POST /api/admin/lessons/ai-generate` - Generate lessons using AI
- `GET /api/admin/lessons` - Get all lessons
- `GET /api/admin/lessons/strand/:strandId` - Get lessons by strand
- `GET /api/admin/lessons/subject/:subjectId` - Get lessons by subject
- `GET /api/admin/lessons/status/:status` - Get lessons by status
- `GET /api/admin/lessons/:id` - Get lesson by ID
- `PUT /api/admin/lessons/:id` - Update lesson
- `PATCH /api/admin/lessons/:id/approve` - Approve lesson
- `PATCH /api/admin/lessons/:id/reject` - Reject lesson
- `DELETE /api/admin/lessons/:id` - Delete lesson

#### Notes
- `POST /api/admin/notes` - Create note
- `GET /api/admin/notes` - Get all notes
- `GET /api/admin/notes/substrand/:subStrandId` - Get notes by sub-strand
- `GET /api/admin/notes/grade/:grade` - Get notes by grade
- `GET /api/admin/notes/difficulty/:difficulty` - Get notes by difficulty
- `GET /api/admin/notes/:id` - Get note by ID
- `PUT /api/admin/notes/:id` - Update note
- `DELETE /api/admin/notes/:id` - Delete note

#### Quizzes
- `POST /api/admin/quizzes` - Create quiz
- `GET /api/admin/quizzes` - Get all quizzes
- `GET /api/admin/quizzes/link/:type/:id` - Get quizzes by link
- `GET /api/admin/quizzes/grade/:grade` - Get quizzes by grade
- `GET /api/admin/quizzes/:id` - Get quiz by ID
- `PUT /api/admin/quizzes/:id` - Update quiz
- `DELETE /api/admin/quizzes/:id` - Delete quiz

#### Users
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/role/:role` - Get users by role
- `GET /api/admin/users/active-learners` - Get active learners
- `GET /api/admin/users/:id` - Get user by ID

#### Analytics
- `GET /api/admin/analytics` - Get analytics data

## Database Schema

The backend uses Supabase (PostgreSQL) with the following main tables:
- `curriculum_designs` - Curriculum designs by grade
- `subjects` - Subjects created from curriculum designs
- `strands` - Strands (AI-generated from curriculum PDFs)
- `lessons` - Lessons (AI-generated from strands)
- `notes` - Educational notes
- `quizzes` - Quizzes
- `users` - User accounts

## AI Integration

The backend uses Google Gemini Flash 3 for:
- Generating strands from curriculum PDFs
- Generating lessons from strands

## Notes

- Authentication is not yet implemented (as per requirements)
- The database tables need to be created in Supabase matching the model structures
- File uploads (PDFs, images) would need additional setup with Supabase Storage







