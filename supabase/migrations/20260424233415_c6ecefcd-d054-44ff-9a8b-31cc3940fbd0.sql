ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS cover_photo_id UUID REFERENCES public.event_photos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_cover_photo_id ON public.events(cover_photo_id);