-- Create storage bucket for POP images
INSERT INTO storage.buckets (id, name, public)
VALUES ('pop-images', 'pop-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload pop images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pop-images' AND auth.uid() IS NOT NULL);

-- Allow public read access
CREATE POLICY "Pop images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'pop-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete pop images"
ON storage.objects FOR DELETE
USING (bucket_id = 'pop-images' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update pop images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pop-images' AND auth.uid() IS NOT NULL);