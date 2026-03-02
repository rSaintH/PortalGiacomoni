-- Configuracao segura para refresh do pull do Fator R sem expor chaves no frontend

CREATE TABLE IF NOT EXISTS public.fator_r_pull_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  source_url text NOT NULL DEFAULT 'https://knssjftfuyuhzrpvwhhd.supabase.co',
  source_anon_key text NOT NULL DEFAULT '',
  sync_key text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.fator_r_pull_config (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.fator_r_pull_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view fator_r_pull_config" ON public.fator_r_pull_config;
CREATE POLICY "Admin can view fator_r_pull_config"
  ON public.fator_r_pull_config
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage fator_r_pull_config" ON public.fator_r_pull_config;
CREATE POLICY "Admin can manage fator_r_pull_config"
  ON public.fator_r_pull_config
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.set_fator_r_pull_config(
  p_source_url text DEFAULT 'https://knssjftfuyuhzrpvwhhd.supabase.co',
  p_source_anon_key text DEFAULT NULL,
  p_sync_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas admin pode configurar o pull.';
  END IF;

  IF p_source_anon_key IS NULL OR btrim(p_source_anon_key) = '' THEN
    RAISE EXCEPTION 'p_source_anon_key obrigatorio.';
  END IF;

  IF p_sync_key IS NULL OR btrim(p_sync_key) = '' THEN
    RAISE EXCEPTION 'p_sync_key obrigatorio.';
  END IF;

  INSERT INTO public.fator_r_pull_config (
    id,
    source_url,
    source_anon_key,
    sync_key,
    updated_at,
    updated_by
  )
  VALUES (
    true,
    COALESCE(NULLIF(btrim(p_source_url), ''), 'https://knssjftfuyuhzrpvwhhd.supabase.co'),
    p_source_anon_key,
    p_sync_key,
    now(),
    auth.uid()
  )
  ON CONFLICT (id)
  DO UPDATE
    SET source_url = EXCLUDED.source_url,
        source_anon_key = EXCLUDED.source_anon_key,
        sync_key = EXCLUDED.sync_key,
        updated_at = now(),
        updated_by = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_fator_r_pull_config(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_fator_r_pull_config(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.run_fator_r_fiscal_pull(
  p_batch_size integer DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.fator_r_pull_config%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas admin pode executar o refresh.';
  END IF;

  SELECT *
    INTO v_cfg
  FROM public.fator_r_pull_config
  WHERE id = true;

  IF v_cfg.id IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Configuracao de pull nao encontrada.';
  END IF;

  IF btrim(COALESCE(v_cfg.source_anon_key, '')) = '' THEN
    RAISE EXCEPTION 'source_anon_key nao configurada.';
  END IF;

  IF btrim(COALESCE(v_cfg.sync_key, '')) = '' THEN
    RAISE EXCEPTION 'sync_key nao configurada.';
  END IF;

  RETURN public.pull_fator_r_fiscal_changes(
    p_source_url => v_cfg.source_url,
    p_source_anon_key => v_cfg.source_anon_key,
    p_sync_key => v_cfg.sync_key,
    p_batch_size => p_batch_size
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_fator_r_fiscal_pull(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_fator_r_fiscal_pull(integer) TO authenticated;
