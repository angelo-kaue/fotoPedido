-- Allow anon users to read back their own inserted selections
CREATE POLICY "Anon can select own inserted selections"
ON public.selections
FOR SELECT
TO anon
USING (true);

-- Allow anon users to read back their own inserted selection_photos
CREATE POLICY "Anon can select own inserted selection_photos"
ON public.selection_photos
FOR SELECT
TO anon
USING (true);