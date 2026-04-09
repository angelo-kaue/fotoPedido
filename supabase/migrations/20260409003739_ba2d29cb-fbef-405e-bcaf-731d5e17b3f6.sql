
-- Create photographer settings table (singleton pattern)
CREATE TABLE public.photographer_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_name text NOT NULL DEFAULT 'Fotógrafo',
  whatsapp_number text NOT NULL DEFAULT '',
  default_price_per_photo numeric NOT NULL DEFAULT 15.00,
  watermark_text text NOT NULL DEFAULT 'AMOSTRA',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.photographer_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for public checkout)
CREATE POLICY "Anyone can view settings"
ON public.photographer_settings
FOR SELECT
TO public
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage settings"
ON public.photographer_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_photographer_settings_updated_at
BEFORE UPDATE ON public.photographer_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row
INSERT INTO public.photographer_settings (photographer_name, whatsapp_number, default_price_per_photo, watermark_text)
VALUES ('Fotógrafo', '', 15.00, 'AMOSTRA');
