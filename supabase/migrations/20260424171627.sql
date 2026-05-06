-- Create public bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public can read question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Admin/super_admin can insert
CREATE POLICY "Admins can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'question-images'
  AND public.has_user_role(auth.uid(), ARRAY['admin','super_admin'])
);

-- Admin/super_admin can update
CREATE POLICY "Admins can update question images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'question-images'
  AND public.has_user_role(auth.uid(), ARRAY['admin','super_admin'])
);

-- Admin/super_admin can delete
CREATE POLICY "Admins can delete question images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'question-images'
  AND public.has_user_role(auth.uid(), ARRAY['admin','super_admin'])
);