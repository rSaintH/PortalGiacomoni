
-- ============================================================
-- REINF - Tabelas e configurações
-- ============================================================

-- Configuração de periodicidade por regime tributário
CREATE TABLE public.regime_period_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  regime text NOT NULL UNIQUE,
  periodo_tipo text NOT NULL DEFAULT 'trimestral',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.regime_period_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view regime_period_config"
  ON public.regime_period_config FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage regime_period_config"
  ON public.regime_period_config FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed com os regimes padrão
INSERT INTO public.regime_period_config (regime, periodo_tipo) VALUES
  ('Simples Nacional', 'trimestral'),
  ('Lucro Presumido', 'trimestral'),
  ('Lucro Real', 'trimestral'),
  ('MEI', 'trimestral');

-- Entradas REINF por cliente/ano/trimestre
CREATE TABLE public.reinf_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  trimestre integer NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
  
  -- Valores de lucro por mês do trimestre
  lucro_mes1 numeric DEFAULT 0,
  lucro_mes2 numeric DEFAULT 0,
  lucro_mes3 numeric DEFAULT 0,
  
  -- Workflow status
  status text NOT NULL DEFAULT 'pendente_contabil',
  
  -- Auditoria do workflow
  contabil_usuario_id uuid,
  contabil_preenchido_em timestamptz,
  dp_usuario_id uuid,
  dp_aprovado_em timestamptz,
  fiscal_usuario_id uuid,
  fiscal_enviado_em timestamptz,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  
  -- Unique constraint por cliente/ano/trimestre
  UNIQUE (client_id, ano, trimestre)
);

ALTER TABLE public.reinf_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reinf_entries"
  ON public.reinf_entries FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert reinf_entries"
  ON public.reinf_entries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update reinf_entries"
  ON public.reinf_entries FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can delete reinf_entries"
  ON public.reinf_entries FOR DELETE
  USING (public.is_admin());

-- Trigger para updated_at
CREATE TRIGGER update_reinf_entries_updated_at
  BEFORE UPDATE ON public.reinf_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
