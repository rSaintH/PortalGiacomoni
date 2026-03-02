
-- Table for client partners (sócios)
CREATE TABLE public.client_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client_partners"
  ON public.client_partners FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert client_partners"
  ON public.client_partners FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update client_partners"
  ON public.client_partners FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin can delete client_partners"
  ON public.client_partners FOR DELETE
  USING (public.is_admin());

-- Table for tracking which partners receive profit in each REINF entry month
CREATE TABLE public.reinf_partner_profits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reinf_entry_id UUID NOT NULL REFERENCES public.reinf_entries(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.client_partners(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 3),
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reinf_partner_profits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reinf_partner_profits"
  ON public.reinf_partner_profits FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert reinf_partner_profits"
  ON public.reinf_partner_profits FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update reinf_partner_profits"
  ON public.reinf_partner_profits FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete reinf_partner_profits"
  ON public.reinf_partner_profits FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Unique constraint to prevent duplicate partner-month entries
CREATE UNIQUE INDEX idx_reinf_partner_profits_unique 
  ON public.reinf_partner_profits(reinf_entry_id, partner_id, mes);
