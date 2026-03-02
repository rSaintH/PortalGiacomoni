-- Patch: substitui pull antigo (service role) por pull via RPC anon + sync_key

DROP FUNCTION IF EXISTS public.pull_fator_r_fiscal_changes(text, text, integer);

CREATE OR REPLACE FUNCTION public.pull_fator_r_fiscal_changes(
  p_source_url text DEFAULT 'https://knssjftfuyuhzrpvwhhd.supabase.co',
  p_source_anon_key text DEFAULT NULL,
  p_sync_key text DEFAULT NULL,
  p_batch_size integer DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_cursor timestamptz;
  v_request_url text;
  v_request_body text;
  v_response record;
  v_payload jsonb;
  v_imported_rows integer := 0;
  v_max_updated_at timestamptz;
  v_next_cursor timestamptz;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas admin pode executar o pull.';
  END IF;

  IF p_source_url IS NULL OR btrim(p_source_url) = '' THEN
    RAISE EXCEPTION 'p_source_url obrigatorio.';
  END IF;

  IF p_source_anon_key IS NULL OR btrim(p_source_anon_key) = '' THEN
    RAISE EXCEPTION 'p_source_anon_key obrigatorio.';
  END IF;

  IF p_sync_key IS NULL OR btrim(p_sync_key) = '' THEN
    RAISE EXCEPTION 'p_sync_key obrigatorio.';
  END IF;

  p_batch_size := GREATEST(1, LEAST(COALESCE(p_batch_size, 1000), 5000));

  INSERT INTO public.fator_r_sync_cursor (id)
  VALUES (true)
  ON CONFLICT (id) DO NOTHING;

  SELECT last_source_updated_at
    INTO v_cursor
  FROM public.fator_r_sync_cursor
  WHERE id = true
  FOR UPDATE;

  v_request_url := rtrim(p_source_url, '/') || '/rest/v1/rpc/export_fator_r_fiscal_changes';

  v_request_body := jsonb_build_object(
    'p_since', to_char(v_cursor AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'p_limit', p_batch_size,
    'p_sync_key', p_sync_key
  )::text;

  SELECT *
    INTO v_response
  FROM http((
      'POST',
      v_request_url,
      http_headers(
        'apikey', p_source_anon_key,
        'Authorization', 'Bearer ' || p_source_anon_key,
        'Accept', 'application/json',
        'Content-Type', 'application/json'
      ),
      'application/json',
      v_request_body
    )::http_request);

  IF v_response.status < 200 OR v_response.status >= 300 THEN
    UPDATE public.fator_r_sync_cursor
       SET last_pull_at = now(),
           last_pull_status = 'error',
           last_pull_message = 'HTTP ' || v_response.status::text,
           updated_at = now()
     WHERE id = true;

    RETURN jsonb_build_object(
      'ok', false,
      'status', v_response.status,
      'message', 'Erro ao buscar dados na origem.',
      'cursor', v_cursor
    );
  END IF;

  v_payload :=
    CASE
      WHEN v_response.content IS NULL OR btrim(v_response.content) = '' THEN '[]'::jsonb
      ELSE v_response.content::jsonb
    END;

  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'array' THEN
    UPDATE public.fator_r_sync_cursor
       SET last_pull_at = now(),
           last_pull_status = 'error',
           last_pull_message = 'Resposta nao retornou array json.',
           updated_at = now()
     WHERE id = true;

    RETURN jsonb_build_object(
      'ok', false,
      'status', v_response.status,
      'message', 'Resposta invalida da origem.',
      'cursor', v_cursor
    );
  END IF;

  WITH raw_rows AS (
    SELECT
      NULLIF(btrim(item->>'cnpj'), '') AS cnpj,
      public.normalize_competencia_fator_r(item->>'competencia') AS competencia,
      COALESCE((item->>'fiscal_fechou')::boolean, false) AS fiscal_fechou,
      (item->>'source_updated_at')::timestamptz AS source_updated_at,
      NULLIF(item->>'source_row_id', '')::uuid AS source_row_id,
      item AS source_payload
    FROM jsonb_array_elements(v_payload) AS item
  ),
  filtered_rows AS (
    SELECT *
    FROM raw_rows
    WHERE cnpj IS NOT NULL
      AND regexp_replace(cnpj, '\D', '', 'g') <> ''
      AND competencia ~ '^\d{4}-(0[1-9]|1[0-2])$'
      AND source_updated_at IS NOT NULL
  ),
  upserted AS (
    INSERT INTO public.fator_r_fiscal_sync (
      cnpj,
      competencia,
      fiscal_fechou,
      source_updated_at,
      source_row_id,
      source_payload,
      pulled_at,
      updated_at
    )
    SELECT
      cnpj,
      competencia,
      fiscal_fechou,
      source_updated_at,
      source_row_id,
      source_payload,
      now(),
      now()
    FROM filtered_rows
    ON CONFLICT (cnpj_digits, competencia)
    DO UPDATE
      SET cnpj = EXCLUDED.cnpj,
          fiscal_fechou = EXCLUDED.fiscal_fechou,
          source_updated_at = EXCLUDED.source_updated_at,
          source_row_id = EXCLUDED.source_row_id,
          source_payload = EXCLUDED.source_payload,
          pulled_at = now(),
          updated_at = now()
    WHERE EXCLUDED.source_updated_at >= public.fator_r_fiscal_sync.source_updated_at
    RETURNING source_updated_at
  )
  SELECT COUNT(*), MAX(source_updated_at)
    INTO v_imported_rows, v_max_updated_at
  FROM upserted;

  v_next_cursor := COALESCE(v_max_updated_at - interval '1 second', v_cursor);

  UPDATE public.fator_r_sync_cursor
     SET last_source_updated_at = v_next_cursor,
         last_pull_at = now(),
         last_pull_status = 'ok',
         last_pull_message = format('%s linha(s) importada(s)', v_imported_rows),
         updated_at = now()
   WHERE id = true;

  RETURN jsonb_build_object(
    'ok', true,
    'status', v_response.status,
    'imported_rows', v_imported_rows,
    'cursor_before', v_cursor,
    'cursor_after', v_next_cursor
  );
EXCEPTION
  WHEN OTHERS THEN
    UPDATE public.fator_r_sync_cursor
       SET last_pull_at = now(),
           last_pull_status = 'error',
           last_pull_message = SQLERRM,
           updated_at = now()
     WHERE id = true;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.pull_fator_r_fiscal_changes(text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pull_fator_r_fiscal_changes(text, text, text, integer) TO authenticated;
