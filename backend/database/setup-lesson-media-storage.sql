-- Supabase Storage bucket for educational lesson diagrams
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-media', 'lesson-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Lesson Media"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-media');

CREATE POLICY "Service Upload Lesson Media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lesson-media');

CREATE POLICY "Service Update Lesson Media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lesson-media');

CREATE POLICY "Service Delete Lesson Media"
ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-media');
