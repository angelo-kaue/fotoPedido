CREATE OR REPLACE FUNCTION public.sync_status_on_payment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_status = 'approved'
     AND (OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    NEW.status := 'entregue';

    UPDATE public.atendimentos
       SET status = 'entregue'::atendimento_status, updated_at = now()
     WHERE order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_status_on_payment_approval_trigger ON public.selections;
CREATE TRIGGER sync_status_on_payment_approval_trigger
BEFORE UPDATE ON public.selections
FOR EACH ROW
EXECUTE FUNCTION public.sync_status_on_payment_approval();