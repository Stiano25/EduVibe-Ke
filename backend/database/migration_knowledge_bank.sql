-- Knowledge bank for exam / past-paper RAG (embeddings stored as JSONB)

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'exam'
    CHECK (source_type IN ('exam', 'past_paper', 'notes')),
  grade TEXT,
  subject_id UUID,
  subject_name TEXT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding JSONB,
  grade TEXT,
  subject_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_grade ON knowledge_documents(grade);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_subject_id ON knowledge_documents(subject_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_status ON knowledge_documents(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_grade ON knowledge_chunks(grade);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_subject_name ON knowledge_chunks(subject_name);
