
DROP POLICY "Anyone can read post images" ON storage.objects;

CREATE POLICY "Anyone can read post images by path" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images' AND auth.role() = 'anon' OR bucket_id = 'post-images' AND auth.role() = 'authenticated');
