
CREATE TABLE public.order_edit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.atendimentos(id) ON DELETE CASCADE,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  previous_status TEXT,
  new_status TEXT,
  previous_price NUMERIC,
  new_price NUMERIC,
  previous_payment_method TEXT,
  new_payment_method TEXT,
  edited_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage edit history"
ON public.order_edit_history
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_order_edit_history_order_id ON public.order_edit_history(order_id);
