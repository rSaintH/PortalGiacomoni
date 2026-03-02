
-- 1. Recreate clients table
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legal_name text NOT NULL,
  trade_name text,
  cnpj text,
  status text NOT NULL DEFAULT 'Ativo'::text,
  group_name text,
  notes_quick text,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can delete clients" ON public.clients FOR DELETE USING (is_admin());
CREATE POLICY "Admin can insert clients" ON public.clients FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can update clients" ON public.clients FOR UPDATE USING (is_admin());
CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Clean orphaned data (children first)
DELETE FROM public.reinf_partner_profits;
DELETE FROM public.reinf_logs;
DELETE FROM public.reinf_entries;
DELETE FROM public.task_comments;
DELETE FROM public.tasks;
DELETE FROM public.occurrence_comments;
DELETE FROM public.occurrences;
DELETE FROM public.client_particularities;
DELETE FROM public.client_partners;
DELETE FROM public.client_pop_notes;
DELETE FROM public.client_sector_styles;
DELETE FROM public.client_tags;
DELETE FROM public.pop_versions WHERE client_id IS NOT NULL;
UPDATE public.pops SET client_id = NULL WHERE client_id IS NOT NULL;

-- 3. Re-add all foreign keys
ALTER TABLE public.client_particularities ADD CONSTRAINT client_particularities_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.client_partners ADD CONSTRAINT client_partners_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.client_pop_notes ADD CONSTRAINT client_pop_notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.client_sector_styles ADD CONSTRAINT client_sector_styles_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.client_tags ADD CONSTRAINT client_tags_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.occurrences ADD CONSTRAINT occurrences_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.reinf_entries ADD CONSTRAINT reinf_entries_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.pops ADD CONSTRAINT pops_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
