
-- Table to store POP version snapshots
CREATE TABLE public.pop_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pop_id uuid NOT NULL REFERENCES public.pops(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  objective text,
  steps text,
  links text[],
  scope text NOT NULL,
  status text NOT NULL,
  sector_id uuid NOT NULL,
  section_id uuid,
  client_id uuid,
  editor_roles text[] NOT NULL DEFAULT '{admin,colaborador}',
  tag_ids uuid[],
  saved_by uuid,
  saved_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pop_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pop_versions"
  ON public.pop_versions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert pop_versions"
  ON public.pop_versions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can delete pop_versions"
  ON public.pop_versions FOR DELETE
  USING (is_admin());

-- Index for fast lookups
CREATE INDEX idx_pop_versions_pop_id ON public.pop_versions(pop_id, saved_at DESC);

-- Function: save current state before update, keep only last 10
CREATE OR REPLACE FUNCTION public.save_pop_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Save the OLD version
  INSERT INTO public.pop_versions (
    pop_id, version_number, title, objective, steps, links, scope, status,
    sector_id, section_id, client_id, editor_roles, tag_ids, saved_by
  ) VALUES (
    OLD.id, OLD.version, OLD.title, OLD.objective, OLD.steps, OLD.links, OLD.scope, OLD.status,
    OLD.sector_id, OLD.section_id, OLD.client_id, OLD.editor_roles, OLD.tag_ids, NEW.updated_by
  );

  -- Keep only the last 10 versions
  DELETE FROM public.pop_versions
  WHERE pop_id = OLD.id
    AND id NOT IN (
      SELECT id FROM public.pop_versions
      WHERE pop_id = OLD.id
      ORDER BY saved_at DESC
      LIMIT 10
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on pops update
CREATE TRIGGER trg_save_pop_version
  BEFORE UPDATE ON public.pops
  FOR EACH ROW
  EXECUTE FUNCTION public.save_pop_version();
