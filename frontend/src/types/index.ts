export type UserRole = 'admin' | 'learner'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  grade?: Grade
}

export type ContentType = 'video' | 'interactive' | 'reading'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type Grade = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12'

// Quiz Question - Multiple Choice Only
export type BloomLevel = 'recall' | 'understand' | 'apply' | 'reason'
export type LearnerModality = 'visual' | 'text_steps' | 'practice' | 'mixed'

export interface QuizDistractor {
  optionIndex: number
  misconception: string
}

export type QuizOptionVisual = {
  text?: string
  diagramType: string
  params?: Record<string, unknown>
}

export interface QuizQuestion {
  id: string
  question?: string
  type?: 'multiple-choice' | 'drag-to-target' | 'numeric-entry'
  options?: Array<string | QuizOptionVisual>
  /** Omitted on learner lesson payloads — served only via adaptive endpoints */
  correctAnswerIndex?: number
  explanation?: string
  optionExplanations?: string[]
  feedbackCorrect?: string
  feedbackIncorrect?: string
  difficulty?: 'easy' | 'intermediate' | 'advanced'
  points?: number
  learningOutcomeIndex?: number
  learningOutcomeKey?: string
  skillFocus?: string
  bloomLevel?: BloomLevel
  distractors?: QuizDistractor[]
  /**
   * Full reasoning for every option, indexed like `options`. Admin review only —
   * never served on any learner endpoint, and never a substitute for the terse
   * learner-facing `explanation` / `misconception` strings.
   */
  reviewRationale?: string[]
  modality?: Exclude<LearnerModality, 'mixed'> | 'practice' | 'visual' | 'text_steps'
  /**
   * How the learner answers.
   * Distinct from legacy `type: 'multiple-choice'`, which is kept for older banks.
   */
  interactionType?: 'multiple_choice' | 'drag_to_target' | 'numeric_entry'
  params?: Record<string, unknown>
  answerFormula?: string
  activity?: string
  diagramBriefId?: string | null
  steps?: string[]
  /** Set when AI output is too close to a past-paper exemplar — admin should review */
  flagged_near_duplicate?: boolean
  /** Outcome label was assigned via remap fallback (no dedicated generated question) */
  coverage_remapped?: boolean
  /** Automated QA flagged a quality issue — admin should review */
  qa_flagged?: boolean
  qa_issue?: string | null
  /** Set when this quiz item was pulled from the reviewed question bank */
  bankEntryId?: string
}

export interface QuizBankStats {
  total: number
  byBloom: Record<string, number>
  byModality: Record<string, number>
  byOutcome: Record<string, { total: number; visual: number; text_steps: number; practice: number }>
}

/** Post-generation outcome coverage summary (1-based learningOutcomeIndex) */
export interface QuizCoverageReport {
  realCovered: number[]
  remapped: number[]
  stillMissing: number[]
  outcomes: string[]
}

// Standalone Quiz / lesson quiz envelope
export interface Quiz {
  id?: string
  title: string
  description?: string
  grade?: Grade
  difficulty?: Difficulty
  questions: QuizQuestion[]
  /** Present on learner-sanitized payloads (stems stripped) */
  questionCount?: number
  bankStats?: QuizBankStats
  coverageReport?: QuizCoverageReport
  passingScore: number
  timeLimit?: number
  linkedTo?: {
    type: 'note' | 'substrand'
    id: string
  }
  contentBlocks?: LessonContentBlock[]
  visualBriefs?: LessonVisualBrief[]
  visualAssets?: LessonVisualAsset[]
  createdAt?: string
  updatedAt?: string
}

export interface LessonVisualBrief {
  id?: string
  skillFocus: string
  outcomeKey?: string
  brief: string
  diagramType?: string
  params?: Record<string, unknown>
  /** teaching = lesson content; question = one visual quiz item */
  scope?: 'teaching' | 'question'
  questionId?: string
  /** template = code SVG; upload = admin file */
  source?: 'template' | 'upload'
  customUrl?: string
}

export interface LessonContentBlock {
  id?: string
  type: 'text' | 'diagram'
  text?: string
  briefId?: string
}

export interface LessonVisualAsset {
  id?: string | null
  url: string
  skillFocus?: string
  outcomeKey?: string
  alt?: string
  brief?: string
  diagramType?: string
  attribution?: string
}

export interface LearnerProfile {
  userId: string
  preferredModality: LearnerModality
  scaffoldTolerance: number
  modalityPromptSeen: boolean
}

// Note - Content Only (No Quizzes)
export interface Note {
  id: string
  title: string
  description: string
  subStrandId?: string // Optional link to sub-strand
  grade: Grade
  difficulty: Difficulty
  content: string // Plain text; optional {{term:…}} / {{example:…}} emphasis
  images?: string[] // Array of image URLs (uploaded)
  videos?: {
    type: 'upload' | 'youtube' | 'vimeo'
    url: string
  }[]
  learningObjectives?: string[]
  keyConcepts?: string[]
  examples?: string[]
  summary?: string
  tags: string[]
  duration: number // in minutes
  createdAt: string
  updatedAt: string
}

// Curriculum Design - Per subject, named as Grade{number}_{SubjectName}_Curriculum Design
export interface CurriculumDesign {
  id: string
  grade: Grade
  subjectName?: string // The subject name this curriculum design belongs to
  name: string // Auto-generated: "Grade{number}_{SubjectName}_Curriculum Design"
  disciplines: string[] // Custom disciplines (e.g., "Mathematics", "Physics", "Agriculture")
  pdfUrl?: string // Uploaded PDF file URL
  pdfFileName?: string
  createdAt: string
  updatedAt: string
}

// Subject - Curriculum design is auto-created when subject is created
export interface Subject {
  id: string
  name: string
  description?: string
  curriculumDesignId: string // Auto-created curriculum design ID
  grade: Grade
  icon?: string // Icon identifier or URL
  color?: string // Color theme
  createdAt: string
  updatedAt: string
}

// Strand - AI-generated from Curriculum PDF (topics)
export interface Strand {
  id: string
  name: string
  description?: string
  subjectId: string // Links to Subject
  theme?: string // Optional theme from PDF
  isAIGenerated: boolean
  createdAt: string
  updatedAt: string
}

// SubStrand - AI-generated from Curriculum PDF (sub-topics under strands)
export interface SubStrand {
  id: string
  name: string
  description?: string
  strandId: string // Links to Strand
  subjectId: string // Links to Subject
  learningOutcomes: string[] // Learning outcomes from PDF
  keyInquiryQuestions: string[] // Key inquiry questions from PDF
  isAIGenerated: boolean
  lessonsAllocated?: number | null
  sequenceNumber?: number | null
  createdAt: string
  updatedAt: string
}

// Lesson - AI-generated from SubStrand
export interface Lesson {
  id: string
  title: string
  description: string
  strandId: string // Links to Strand
  subStrandId: string // Links to SubStrand
  subjectId: string // Links to Subject
  grade: Grade
  contentType: ContentType
  difficulty: Difficulty
  tags: string[]
  duration: number // in minutes
  videoUrl?: string
  content?: string // Plain text; optional {{term:…}} / {{example:…}} emphasis
  images?: string[] // Array of image URLs
  videos?: {
    type: 'upload' | 'youtube' | 'vimeo'
    url: string
  }[]
  learningObjectives?: string[]
  keyConcepts?: string[]
  examples?: string[]
  summary?: string
  quiz?: Quiz
  visualAssets?: LessonVisualAsset[]
  visualBriefs?: LessonVisualBrief[]
  contentBlocks?: LessonContentBlock[]
  theme?: string | null // Theme from strand (e.g., "Theme 1", "1")
  lessonOrder?: number
  // Approval workflow
  isAIGenerated: boolean
  status: 'pending' | 'approved' | 'rejected' | 'draft'
  approvedAt?: string
  approvedBy?: string
  createdAt: string
  updatedAt: string
}

export interface Recommendation {
  id: string
  lessonId: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

export interface LearnerProgress {
  lessonId: string
  completed: boolean
  progress: number // 0-100
  lastAccessed: string
}

