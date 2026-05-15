-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Admin push tokens table (multi-device, multi-tenant)
CREATE TABLE public.admin_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  device_label text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_push_tokens_tenant ON public.admin_push_tokens(tenant_id);
CREATE INDEX idx_admin_push_tokens_user ON public.admin_push_tokens(user_id);

ALTER TABLE public.admin_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own push tokens"
  ON public.admin_push_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND is_tenant_admin(tenant_id))
  WITH CHECK (auth.uid() = user_id AND is_tenant_admin(tenant_id));

CREATE TRIGGER trg_admin_push_tokens_updated_at
  BEFORE UPDATE ON public.admin_push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();