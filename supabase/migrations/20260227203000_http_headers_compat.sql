-- Compatibilidade para projetos que nao expõem http_headers(...) na extensao http
-- Permite manter chamadas existentes em pull_fator_r_fiscal_changes

CREATE OR REPLACE FUNCTION public.http_headers(VARIADIC kv text[])
RETURNS extensions.http_header[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_headers extensions.http_header[] := ARRAY[]::extensions.http_header[];
  i integer := 1;
  n integer := COALESCE(array_length(kv, 1), 0);
BEGIN
  IF n = 0 THEN
    RETURN v_headers;
  END IF;

  IF mod(n, 2) <> 0 THEN
    RAISE EXCEPTION 'http_headers requer numero par de argumentos (chave/valor).';
  END IF;

  WHILE i <= n LOOP
    v_headers := v_headers || (ROW(kv[i], kv[i + 1])::extensions.http_header);
    i := i + 2;
  END LOOP;

  RETURN v_headers;
END;
$$;
