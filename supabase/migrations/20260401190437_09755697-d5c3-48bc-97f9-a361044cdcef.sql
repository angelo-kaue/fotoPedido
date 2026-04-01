
-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  event_date DATE,
  price_per_photo NUMERIC(10,2) NOT NULL DEFAULT 15.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_photos table
CREATE TABLE public.event_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT NOT NULL,
  preview_path TEXT NOT NULL,
  photo_code TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_photos_event_id ON public.event_photos(event_id);
CREATE UNIQUE INDEX idx_event_photos_code ON public.event_photos(event_id, photo_code);

-- Create selections table
CREATE TABLE public.selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  whatsapp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'editando', 'entregue')),
  total_photos INTEGER NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_selections_event_id ON public.selections(event_id);

-- Create selection_photos table
CREATE TABLE public.selection_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  selection_id UUID NOT NULL REFERENCES public.selections(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
  UNIQUE(selection_id, photo_id)
);

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_photos ENABLE ROW LEVEL SECURITY;

-- Events: anyone can read active events, authenticated users can manage
CREATE POLICY "Anyone can view active events" ON public.events
  FOR SELECT USING (status = 'active');

CREATE POLICY "Authenticated users can manage events" ON public.events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Event photos: anyone can view, authenticated can manage
CREATE POLICY "Anyone can view event photos" ON public.event_photos
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage photos" ON public.event_photos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Selections: anyone can insert, authenticated can view/update all
CREATE POLICY "Anyone can create selections" ON public.selections
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view selections" ON public.selections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update selections" ON public.selections
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Selection photos: anyone can insert, authenticated can view
CREATE POLICY "Anyone can add selection photos" ON public.selection_photos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view selection photos" ON public.selection_photos
  FOR SELECT TO authenticated USING (true);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_selections_updated_at
  BEFORE UPDATE ON public.selections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for event photos (public for thumbnails/previews)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view event photos storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-photos');

CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-photos');

CREATE POLICY "Authenticated users can delete photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'event-photos');
