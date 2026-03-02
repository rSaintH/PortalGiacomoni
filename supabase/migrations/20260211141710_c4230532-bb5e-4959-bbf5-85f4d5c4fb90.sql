
-- 1. Client-specific POP notes (rich text per client+pop)
CREATE TABLE public.client_pop_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  pop_id UUID NOT NULL REFERENCES public.pops(id),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(client_id, pop_id)
);

ALTER TABLE public.client_pop_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client_pop_notes" ON public.client_pop_notes FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert client_pop_notes" ON public.client_pop_notes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner can update own client_pop_notes" ON public.client_pop_notes FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Admin can update any client_pop_notes" ON public.client_pop_notes FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can delete client_pop_notes" ON public.client_pop_notes FOR DELETE USING (is_admin());

CREATE TRIGGER update_client_pop_notes_updated_at
  BEFORE UPDATE ON public.client_pop_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Sector styles (configurable per sector by admin)
CREATE TABLE public.sector_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sector_id UUID NOT NULL REFERENCES public.sectors(id),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(sector_id, name)
);

ALTER TABLE public.sector_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sector_styles" ON public.sector_styles FOR SELECT USING (true);
CREATE POLICY "Admin can insert sector_styles" ON public.sector_styles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can update sector_styles" ON public.sector_styles FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can delete sector_styles" ON public.sector_styles FOR DELETE USING (is_admin());

-- 3. Client sector style assignment
CREATE TABLE public.client_sector_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  sector_id UUID NOT NULL REFERENCES public.sectors(id),
  style_id UUID NOT NULL REFERENCES public.sector_styles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(client_id, sector_id)
);

ALTER TABLE public.client_sector_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client_sector_styles" ON public.client_sector_styles FOR SELECT USING (true);
CREATE POLICY "Admin can insert client_sector_styles" ON public.client_sector_styles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can update client_sector_styles" ON public.client_sector_styles FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can delete client_sector_styles" ON public.client_sector_styles FOR DELETE USING (is_admin());
