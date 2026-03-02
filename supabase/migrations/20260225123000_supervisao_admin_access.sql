-- Allow users with role "supervisao" to perform admin tab actions
-- required by the restricted supervisor scope in the frontend.

DROP POLICY IF EXISTS "Supervisao can insert sections" ON public.sections;
CREATE POLICY "Supervisao can insert sections"
  ON public.sections FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'supervisao'
    )
  );

DROP POLICY IF EXISTS "Supervisao can insert sector_styles" ON public.sector_styles;
CREATE POLICY "Supervisao can insert sector_styles"
  ON public.sector_styles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'supervisao'
    )
  );

DROP POLICY IF EXISTS "Supervisao can insert tags" ON public.tags;
CREATE POLICY "Supervisao can insert tags"
  ON public.tags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'supervisao'
    )
  );

DROP POLICY IF EXISTS "Supervisao can delete tags" ON public.tags;
CREATE POLICY "Supervisao can delete tags"
  ON public.tags FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'supervisao'
    )
  );

DROP POLICY IF EXISTS "Supervisao can insert doc_tags" ON public.doc_tags;
CREATE POLICY "Supervisao can insert doc_tags"
  ON public.doc_tags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'supervisao'
    )
  );

DROP POLICY IF EXISTS "Supervisao can delete doc_tags" ON public.doc_tags;
CREATE POLICY "Supervisao can delete doc_tags"
  ON public.doc_tags FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'supervisao'
    )
  );

DROP POLICY IF EXISTS "Supervisao can insert parameter_options" ON public.parameter_options;
CREATE POLICY "Supervisao can insert parameter_options"
  ON public.parameter_options FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'supervisao'
    )
  );

DROP POLICY IF EXISTS "Supervisao can delete parameter_options" ON public.parameter_options;
CREATE POLICY "Supervisao can delete parameter_options"
  ON public.parameter_options FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'supervisao'
    )
  );

DROP POLICY IF EXISTS "Supervisao can insert clients" ON public.clients;
CREATE POLICY "Supervisao can insert clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'supervisao'
    )
  );

DROP POLICY IF EXISTS "Supervisao can insert client_partners" ON public.client_partners;
CREATE POLICY "Supervisao can insert client_partners"
  ON public.client_partners FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'supervisao'
    )
  );
