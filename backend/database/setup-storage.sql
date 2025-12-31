-- SQL script to create Supabase Storage bucket for curriculum designs
-- Run this in Supabase SQL Editor

-- Create storage bucket for curriculum designs
INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculum-designs', 'curriculum-designs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies (allow public read, authenticated write)
-- Note: Adjust these policies based on your security requirements

-- Allow public read access
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'curriculum-designs');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'curriculum-designs');

-- Allow authenticated users to update their own files
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'curriculum-designs');

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'curriculum-designs');




