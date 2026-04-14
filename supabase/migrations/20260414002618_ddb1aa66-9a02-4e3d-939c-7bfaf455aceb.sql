
-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('pix', 'dinheiro', 'cartao', 'outro');

-- Create atendimento status enum
CREATE TYPE public.atendimento_status AS ENUM ('novo', 'em_atendimento', 'pago', 'entregue');

-- Create atendimentos table
CREATE TABLE public.atendimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.selections(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  payment_method public.payment_method NOT NULL DEFAULT 'pix',
  status public.atendimento_status NOT NULL DEFAULT 'novo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Only admins can manage atendimentos
CREATE POLICY "Admins can manage atendimentos"
ON public.atendimentos
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_atendimentos_updated_at
BEFORE UPDATE ON public.atendimentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_atendimentos_event_id ON public.atendimentos(event_id);
CREATE INDEX idx_atendimentos_status ON public.atendimentos(status);
CREATE INDEX idx_atendimentos_created_at ON public.atendimentos(created_at DESC);

-- Function to auto-create atendimento when a selection is created
CREATE OR REPLACE FUNCTION public.create_atendimento_from_selection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.atendimentos (order_id, customer_name, whatsapp, event_id, quantity, final_price)
  VALUES (NEW.id, NEW.customer_name, NEW.whatsapp, NEW.event_id, NEW.total_photos, NEW.total_price);
  RETURN NEW;
END;
$$;

-- Trigger on selections to auto-create atendimento
CREATE TRIGGER on_selection_created_create_atendimento
AFTER INSERT ON public.selections
FOR EACH ROW
EXECUTE FUNCTION public.create_atendimento_from_selection();
