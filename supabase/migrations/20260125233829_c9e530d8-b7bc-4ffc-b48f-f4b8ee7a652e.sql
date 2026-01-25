-- Create storage bucket for admin content images
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-content', 'admin-content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for admin-content bucket
CREATE POLICY "Admin content images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-content');

CREATE POLICY "Authenticated users can upload admin content images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'admin-content' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'admin-content' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'admin-content' AND auth.uid() IS NOT NULL);