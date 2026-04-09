ALTER TABLE public.event_photos
ADD COLUMN captured_at timestamptz DEFAULT now();