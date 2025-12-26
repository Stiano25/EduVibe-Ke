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
export interface QuizQuestion {
  id: string
  question: string
  type: 'multiple-choice'
  options: string[] // 2-6 options
  correctAnswerIndex: number // Index of correct option
  explanation: string // General explanation for the question
  optionExplanations?: string[] // One explanation per option (why each is or isn't correct)
  feedbackCorrect?: string // Congratulatory, with example
  feedbackIncorrect?: string // Corrective, with example
  difficulty?: 'easy' | 'intermediate' | 'advanced'
  points: number
}

// Standalone Quiz
export interface Quiz {
  id: string
  title: string
  description?: string
  grade: Grade
  difficulty: Difficulty
  questions: QuizQuestion[]
  passingScore: number // Percentage
  timeLimit?: number // in minutes
  linkedTo?: {
    type: 'note' | 'substrand'
    id: string
  }
  createdAt: string
  updatedAt: string
}

// Note - Content Only (No Quizzes)
export interface Note {
  id: string
  title: string
  description: string
  subStrandId?: string // Optional link to sub-strand
  grade: Grade
  difficulty: Difficulty
  content: string // Markdown content
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
  content?: string // Markdown content
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

