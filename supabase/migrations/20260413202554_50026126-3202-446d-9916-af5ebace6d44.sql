
-- Create event_visits table for analytics
CREATE TABLE public.event_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups by event
CREATE INDEX idx_event_visits_event_id ON public.event_visits(event_id);
CREATE INDEX idx_event_visits_created_at ON public.event_visits(created_at);

-- Enable RLS
ALTER TABLE public.event_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can insert visits (anonymous tracking)
CREATE POLICY "Anyone can register visits"
ON public.event_visits
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can view visits
CREATE POLICY "Admins can view visits"
ON public.event_visits
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
