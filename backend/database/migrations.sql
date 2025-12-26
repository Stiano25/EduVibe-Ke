-- EduVibe Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (if not using Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'learner')),
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Curriculum Designs table
-- Each curriculum design is per subject, named as: Grade{number}_{SubjectName}_Curriculum Design
CREATE TABLE IF NOT EXISTS curriculum_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade TEXT NOT NULL CHECK (grade IN ('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
  subject_name TEXT, -- The subject name this curriculum design belongs to
  name TEXT NOT NULL, -- Auto-generated: "Grade{number}_{SubjectName}_Curriculum Design"
  disciplines TEXT[] DEFAULT '{}', -- Optional disciplines array
  pdf_url TEXT,
  pdf_file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_grade_subject UNIQUE (grade, subject_name)
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  curriculum_design_id UUID REFERENCES curriculum_designs(id) ON DELETE CASCADE,
  grade TEXT NOT NULL CHECK (grade IN ('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strands table (topics extracted from PDF)
CREATE TABLE IF NOT EXISTS strands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  theme TEXT, -- Optional theme from PDF
  is_ai_generated BOOLEAN DEFAULT true, -- Extracted from PDF
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sub-strands table (sub-topics under strands, extracted from PDF)
CREATE TABLE IF NOT EXISTS sub_strands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  strand_id UUID REFERENCES strands(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  learning_outcomes TEXT[] NOT NULL DEFAULT '{}', -- Array of learning outcomes
  key_inquiry_questions TEXT[] NOT NULL DEFAULT '{}', -- Array of key inquiry questions
  is_ai_generated BOOLEAN DEFAULT true, -- Extracted from PDF
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons table (generated from sub-strands)
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  strand_id UUID REFERENCES strands(id) ON DELETE CASCADE,
  sub_strand_id UUID REFERENCES sub_strands(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  grade TEXT NOT NULL CHECK (grade IN ('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'interactive', 'reading')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[] DEFAULT '{}',
  duration INTEGER DEFAULT 0,
  video_url TEXT,
  content TEXT,
  images TEXT[] DEFAULT '{}',
  videos JSONB DEFAULT '[]',
  learning_objectives TEXT[] DEFAULT '{}',
  key_concepts TEXT[] DEFAULT '{}',
  examples TEXT[] DEFAULT '{}',
  summary TEXT,
  is_ai_generated BOOLEAN DEFAULT true, -- Generated from sub-strand
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'draft')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sub_strand_id UUID, -- Can reference strands or be null
  grade TEXT NOT NULL CHECK (grade IN ('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  videos JSONB DEFAULT '[]',
  learning_objectives TEXT[] DEFAULT '{}',
  key_concepts TEXT[] DEFAULT '{}',
  examples TEXT[] DEFAULT '{}',
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  grade TEXT NOT NULL CHECK (grade IN ('K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  questions JSONB NOT NULL DEFAULT '[]',
  passing_score INTEGER NOT NULL DEFAULT 70,
  time_limit INTEGER, -- in minutes
  linked_to JSONB, -- { type: 'note' | 'substrand', id: string }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subjects_curriculum_design ON subjects(curriculum_design_id);
CREATE INDEX IF NOT EXISTS idx_subjects_grade ON subjects(grade);
CREATE INDEX IF NOT EXISTS idx_strands_subject ON strands(subject_id);
CREATE INDEX IF NOT EXISTS idx_sub_strands_strand ON sub_strands(strand_id);
CREATE INDEX IF NOT EXISTS idx_sub_strands_subject ON sub_strands(subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_strand ON lessons(strand_id);
CREATE INDEX IF NOT EXISTS idx_lessons_sub_strand ON lessons(sub_strand_id);
CREATE INDEX IF NOT EXISTS idx_lessons_subject ON lessons(subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_grade ON lessons(grade);
CREATE INDEX IF NOT EXISTS idx_notes_grade ON notes(grade);
CREATE INDEX IF NOT EXISTS idx_notes_difficulty ON notes(difficulty);
CREATE INDEX IF NOT EXISTS idx_quizzes_grade ON quizzes(grade);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_curriculum_designs_updated_at BEFORE UPDATE ON curriculum_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strands_updated_at BEFORE UPDATE ON strands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

