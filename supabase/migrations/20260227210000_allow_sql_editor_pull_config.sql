-- Permite configurar/rodar pull via SQL Editor (auth.uid() nulo),
-- mantendo bloqueio para usuarios autenticados nao-admin.

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
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
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
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
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
