-- 1) Sync trigger: when selections.payment_status becomes 'approved', set status='entregue'
--    and propagate to atendimentos linked by order_id.
CREATE OR REPLACE FUNCTION public.sync_status_on_payment_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'approved'
     AND (OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    -- Auto-mark the order as delivered if not cancelled
    IF NEW.status IS DISTINCT FROM 'cancelado' THEN
      NEW.status := 'entregue';
    END IF;

    -- Sync atendimentos linked to this selection
    UPDATE public.atendimentos
       SET status = 'entregue', updated_at = now()
     WHERE order_id = NEW.id
       AND status <> 'cancelado';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_status_on_payment_approval ON public.selections;
CREATE TRIGGER trg_sync_status_on_payment_approval
BEFORE UPDATE ON public.selections
FOR EACH ROW
EXECUTE FUNCTION public.sync_status_on_payment_approval();

-- 2) Public storage bucket for PIX QR Codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('pix-qrcodes', 'pix-qrcodes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read
DROP POLICY IF EXISTS "Public can view pix qrcodes" ON storage.objects;
CREATE POLICY "Public can view pix qrcodes"
ON storage.objects FOR SELECT
USING (bucket_id = 'pix-qrcodes');

-- Tenant admins manage their own folder ({tenant_id}/...)
DROP POLICY IF EXISTS "Tenant admins can upload own pix qrcode" ON storage.objects;
CREATE POLICY "Tenant admins can upload own pix qrcode"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pix-qrcodes'
  AND public.is_tenant_admin( ((storage.foldername(name))[1])::uuid )
);

DROP POLICY IF EXISTS "Tenant admins can update own pix qrcode" ON storage.objects;
CREATE POLICY "Tenant admins can update own pix qrcode"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pix-qrcodes'
  AND public.is_tenant_admin( ((storage.foldername(name))[1])::uuid )
);

DROP POLICY IF EXISTS "Tenant admins can delete own pix qrcode" ON storage.objects;
CREATE POLICY "Tenant admins can delete own pix qrcode"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pix-qrcodes'
  AND public.is_tenant_admin( ((storage.foldername(name))[1])::uuid )
);

-- 3) Realtime
ALTER TABLE public.selections REPLICA IDENTITY FULL;
ALTER TABLE public.payment_proofs REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.selections;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_proofs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;