
-- Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Drop overly permissive policies
DROP POLICY "Authenticated users can manage events" ON public.events;
DROP POLICY "Authenticated users can manage photos" ON public.event_photos;
DROP POLICY "Authenticated users can view selections" ON public.selections;
DROP POLICY "Authenticated users can update selections" ON public.selections;
DROP POLICY "Anyone can create selections" ON public.selections;
DROP POLICY "Anyone can add selection photos" ON public.selection_photos;
DROP POLICY "Authenticated users can view selection photos" ON public.selection_photos;

-- Events: admins can do everything
CREATE POLICY "Admins can manage events" ON public.events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Event photos: admins can manage
CREATE POLICY "Admins can manage photos" ON public.event_photos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Selections: public can insert, admins can view/update
CREATE POLICY "Public can create selections" ON public.selections
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view selections" ON public.selections
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update selections" ON public.selections
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Selection photos: public can insert, admins can view
CREATE POLICY "Public can add selection photos" ON public.selection_photos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view selection photos" ON public.selection_photos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
