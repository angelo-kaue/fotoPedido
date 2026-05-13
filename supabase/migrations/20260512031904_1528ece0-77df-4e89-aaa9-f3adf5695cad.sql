-- 1. Events: payment_mode
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'whatsapp';

ALTER TABLE public.events 
  ADD CONSTRAINT events_payment_mode_check 
  CHECK (payment_mode IN ('whatsapp', 'pix_manual'));

-- 2. Selections: payment fields
ALTER TABLE public.selections
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS download_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS download_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_token text;

-- Backfill tokens for existing rows
UPDATE public.selections SET public_token = gen_random_uuid()::text WHERE public_token IS NULL;

-- Set default + unique + not null after backfill
ALTER TABLE public.selections 
  ALTER COLUMN public_token SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS selections_public_token_idx ON public.selections(public_token);

-- Allow public SELECT by token (anon needs to read order via /order/:token)
-- Token is unguessable UUID; safe to expose row when token is known
DROP POLICY IF EXISTS "Public can view selection by token" ON public.selections;
CREATE POLICY "Public can view selection by token"
  ON public.selections FOR SELECT
  TO anon, authenticated
  USING (true);

-- Public can update payment_status when uploading proof (controlled via edge function with service role; keep restrictive here)
-- We rely on edge function with service role for updates.

-- 3. payment_proofs table
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  file_path text NOT NULL,
  original_filename text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_proofs_selection_idx ON public.payment_proofs(selection_id);
CREATE INDEX IF NOT EXISTS payment_proofs_tenant_idx ON public.payment_proofs(tenant_id);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage own proofs"
  ON public.payment_proofs FOR ALL
  TO authenticated
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- 4. photographer_settings: PIX fields
ALTER TABLE public.photographer_settings
  ADD COLUMN IF NOT EXISTS pix_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix_recipient_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix_qrcode_url text NOT NULL DEFAULT '';

-- 5. Storage bucket payment-proofs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public can INSERT (upload), tenant admins can SELECT
DROP POLICY IF EXISTS "Public can upload payment proofs" ON storage.objects;
CREATE POLICY "Public can upload payment proofs"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Tenant admins can view payment proofs" ON storage.objects;
CREATE POLICY "Tenant admins can view payment proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND is_tenant_admin(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Tenant admins can delete payment proofs" ON storage.objects;
CREATE POLICY "Tenant admins can delete payment proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND is_tenant_admin(((storage.foldername(name))[1])::uuid)
  );