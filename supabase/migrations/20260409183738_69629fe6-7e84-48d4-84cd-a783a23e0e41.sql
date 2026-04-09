-- Make the event-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'event-photos';

-- Drop the existing public access policy if it exists
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view event photos" ON storage.objects;

-- Allow admins full access to storage
CREATE POLICY "Admins can manage event photos storage"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'event-photos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'event-photos' AND public.has_role(auth.uid(), 'admin'));

-- Allow public read via signed URLs (handled by edge function with service role)
-- No public SELECT policy needed since we use signed URLs