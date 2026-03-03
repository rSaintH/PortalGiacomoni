-- ============================================================
-- SCHEMA COMPLETO - Portal Giacomoni
-- Gerado a partir de todas as migrations consolidadas
-- Rodar em um Supabase limpo (com auth.users já existente)
-- ============================================================

-- ============================================================
-- 0) EXTENSOES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- ============================================================
-- 1) ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'colaborador', 'supervisao');

-- ============================================================
-- 2) TABELA user_roles (precisa existir antes das funções de role)
-- ============================================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'colaborador',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3) FUNCOES UTILITARIAS
-- ============================================================

-- Trigger genérico de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Verifica se usuário tem determinada role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Atalho: é admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Atalho: é supervisor?
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = 'supervisao'
  );
$$;

-- Atalho: é admin ou supervisor?
CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.is_supervisor();
$$;

-- Auto-criar perfil no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

-- Normaliza competência do Fator R
CREATE OR REPLACE FUNCTION public.normalize_competencia_fator_r(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF value IS NULL THEN RETURN NULL; END IF;
  IF value ~ '^\d{4}-(0[1-9]|1[0-2])$' THEN RETURN value; END IF;
  IF value ~ '^(0[1-9]|1[0-2])/\d{4}$' THEN
    RETURN substr(value, 4, 4) || '-' || substr(value, 1, 2);
  END IF;
  RETURN value;
END;
$$;

-- Compatibilidade http_headers
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
  IF n = 0 THEN RETURN v_headers; END IF;
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

-- ============================================================
-- 4) TABELAS PRINCIPAIS
-- ============================================================

CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin());

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  sector_id UUID,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- sectors
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sectors" ON public.sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert sectors" ON public.sectors FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update sectors" ON public.sectors FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin can delete sectors" ON public.sectors FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON public.sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FK de profiles para sectors (após sectors existir)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON DELETE SET NULL;

-- sections
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES public.sectors(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sections" ON public.sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert sections" ON public.sections FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update sections" ON public.sections FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin can delete sections" ON public.sections FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "Supervisao can insert sections" ON public.sections FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'supervisao'));

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  cnpj TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  group_name TEXT,
  notes_quick TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  exclude_from_doc_report BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_clients_cnpj_unique ON public.clients (cnpj) WHERE cnpj IS NOT NULL AND cnpj != '';

CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY "Supervisao can insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'supervisao'));

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- client_particularities
CREATE TABLE public.client_particularities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES public.sectors(id) NOT NULL,
  section_id UUID REFERENCES public.sections(id),
  title TEXT NOT NULL,
  details TEXT,
  priority TEXT NOT NULL DEFAULT 'Média',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  is_archived BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.client_particularities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view particularities" ON public.client_particularities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert particularities" ON public.client_particularities FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admin can update any particularity" ON public.client_particularities FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Owner can update own particularity" ON public.client_particularities FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Admin can delete particularities" ON public.client_particularities FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_client_particularities_updated_at BEFORE UPDATE ON public.client_particularities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Admin can insert tags" ON public.tags FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update tags" ON public.tags FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin can delete tags" ON public.tags FOR DELETE USING (public.is_admin());
CREATE POLICY "Supervisao can insert tags" ON public.tags FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'supervisao'));
CREATE POLICY "Supervisao can delete tags" ON public.tags FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'supervisao'));

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- client_tags
CREATE TABLE public.client_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  tag_id UUID NOT NULL REFERENCES public.tags(id),
  sector_id UUID REFERENCES public.sectors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, tag_id)
);
ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client_tags" ON public.client_tags FOR SELECT USING (true);
CREATE POLICY "Admin can insert client_tags" ON public.client_tags FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update client_tags" ON public.client_tags FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin can delete client_tags" ON public.client_tags FOR DELETE USING (public.is_admin());

-- pops
CREATE TABLE public.pops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL DEFAULT 'Geral' CHECK (scope IN ('Geral', 'Cliente', 'Tag')),
  sector_id UUID REFERENCES public.sectors(id) NOT NULL,
  section_id UUID REFERENCES public.sections(id),
  client_id UUID REFERENCES public.clients(id),
  title TEXT NOT NULL,
  objective TEXT,
  steps TEXT,
  links TEXT[] DEFAULT '{}',
  tag_ids UUID[] DEFAULT '{}'::uuid[],
  editor_roles TEXT[] NOT NULL DEFAULT '{admin,colaborador}'::text[],
  status TEXT NOT NULL DEFAULT 'Rascunho' CHECK (status IN ('Rascunho', 'Em revisão', 'Publicado', 'Arquivado')),
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  is_archived BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.pops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pops" ON public.pops FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert pops" ON public.pops FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update pops" ON public.pops FOR UPDATE USING (true);
CREATE POLICY "Admin can delete pops" ON public.pops FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_pops_updated_at BEFORE UPDATE ON public.pops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- pop_revisions
CREATE TABLE public.pop_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pop_id UUID REFERENCES public.pops(id) ON DELETE CASCADE NOT NULL,
  proposed_changes TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Aprovada', 'Rejeitada')),
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);
ALTER TABLE public.pop_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view revisions" ON public.pop_revisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert revisions" ON public.pop_revisions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admin can update revisions" ON public.pop_revisions FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Owner can update own revision" ON public.pop_revisions FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- pop_versions
CREATE TABLE public.pop_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pop_id UUID NOT NULL REFERENCES public.pops(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  steps TEXT,
  links TEXT[],
  scope TEXT NOT NULL,
  status TEXT NOT NULL,
  sector_id UUID NOT NULL,
  section_id UUID,
  client_id UUID,
  editor_roles TEXT[] NOT NULL DEFAULT '{admin,colaborador}',
  tag_ids UUID[],
  saved_by UUID,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pop_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pop_versions" ON public.pop_versions FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert pop_versions" ON public.pop_versions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete pop_versions" ON public.pop_versions FOR DELETE USING (public.is_admin());

CREATE INDEX idx_pop_versions_pop_id ON public.pop_versions(pop_id, saved_at DESC);

-- Função: salvar versão do POP antes de update (mantém últimas 10)
CREATE OR REPLACE FUNCTION public.save_pop_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pop_versions (
    pop_id, version_number, title, objective, steps, links, scope, status,
    sector_id, section_id, client_id, editor_roles, tag_ids, saved_by
  ) VALUES (
    OLD.id, OLD.version, OLD.title, OLD.objective, OLD.steps, OLD.links, OLD.scope, OLD.status,
    OLD.sector_id, OLD.section_id, OLD.client_id, OLD.editor_roles, OLD.tag_ids, NEW.updated_by
  );
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

CREATE TRIGGER trg_save_pop_version
  BEFORE UPDATE ON public.pops
  FOR EACH ROW
  EXECUTE FUNCTION public.save_pop_version();

-- client_pop_notes
CREATE TABLE public.client_pop_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  pop_id UUID NOT NULL REFERENCES public.pops(id),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(client_id, pop_id)
);
ALTER TABLE public.client_pop_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client_pop_notes" ON public.client_pop_notes FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert client_pop_notes" ON public.client_pop_notes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner can update own client_pop_notes" ON public.client_pop_notes FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Admin can update any client_pop_notes" ON public.client_pop_notes FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin can delete client_pop_notes" ON public.client_pop_notes FOR DELETE USING (public.is_admin());

CREATE TRIGGER update_client_pop_notes_updated_at BEFORE UPDATE ON public.client_pop_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- sector_styles
CREATE TABLE public.sector_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID NOT NULL REFERENCES public.sectors(id),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(sector_id, name)
);
ALTER TABLE public.sector_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sector_styles" ON public.sector_styles FOR SELECT USING (true);
CREATE POLICY "Admin can insert sector_styles" ON public.sector_styles FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update sector_styles" ON public.sector_styles FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin can delete sector_styles" ON public.sector_styles FOR DELETE USING (public.is_admin());
CREATE POLICY "Supervisao can insert sector_styles" ON public.sector_styles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'supervisao'));

-- client_sector_styles
CREATE TABLE public.client_sector_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  sector_id UUID NOT NULL REFERENCES public.sectors(id),
  style_id UUID NOT NULL REFERENCES public.sector_styles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(client_id, sector_id)
);
ALTER TABLE public.client_sector_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client_sector_styles" ON public.client_sector_styles FOR SELECT USING (true);
CREATE POLICY "Admin can insert client_sector_styles" ON public.client_sector_styles FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update client_sector_styles" ON public.client_sector_styles FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin can delete client_sector_styles" ON public.client_sector_styles FOR DELETE USING (public.is_admin());

-- tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES public.sectors(id) NOT NULL,
  section_id UUID REFERENCES public.sections(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'Pendência',
  priority TEXT NOT NULL DEFAULT 'Média',
  status TEXT NOT NULL DEFAULT 'Aberta',
  due_date DATE,
  assignee_id UUID REFERENCES auth.users(id),
  monetary_value NUMERIC(15,2) DEFAULT NULL,
  editor_roles TEXT[] NOT NULL DEFAULT '{admin,colaborador}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admin can update any task" ON public.tasks FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Owner can update own task" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Admin can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- task_comments
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view comments" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert comments" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admin can update any comment" ON public.task_comments FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Owner can update own comment" ON public.task_comments FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- occurrences
CREATE TABLE public.occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES public.sectors(id) NOT NULL,
  section_id UUID REFERENCES public.sections(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Informativa',
  related_task_id UUID REFERENCES public.tasks(id),
  monetary_value NUMERIC(15,2) DEFAULT NULL,
  editor_roles TEXT[] NOT NULL DEFAULT '{admin,colaborador}'::text[],
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view occurrences" ON public.occurrences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert occurrences" ON public.occurrences FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admin can update any occurrence" ON public.occurrences FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Owner can update own occurrence" ON public.occurrences FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Admin can delete occurrences" ON public.occurrences FOR DELETE TO authenticated USING (public.is_admin());

-- occurrence_comments
CREATE TABLE public.occurrence_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id UUID NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.occurrence_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view occurrence comments" ON public.occurrence_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert occurrence comments" ON public.occurrence_comments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner can update own occurrence comment" ON public.occurrence_comments FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Admin can update any occurrence comment" ON public.occurrence_comments FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin can delete occurrence comments" ON public.occurrence_comments FOR DELETE USING (public.is_admin());

-- parameter_options
CREATE TABLE public.parameter_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  color TEXT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parameter_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view parameter_options" ON public.parameter_options FOR SELECT USING (true);
CREATE POLICY "Admin can insert parameter_options" ON public.parameter_options FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update parameter_options" ON public.parameter_options FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin can delete parameter_options" ON public.parameter_options FOR DELETE USING (public.is_admin());
CREATE POLICY "Supervisao can insert parameter_options" ON public.parameter_options FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'supervisao'));
CREATE POLICY "Supervisao can delete parameter_options" ON public.parameter_options FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'supervisao'));

-- client_partners
CREATE TABLE public.client_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view client_partners" ON public.client_partners FOR SELECT USING (true);
CREATE POLICY "Admin can insert client_partners" ON public.client_partners FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update client_partners" ON public.client_partners FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin can delete client_partners" ON public.client_partners FOR DELETE USING (public.is_admin());
CREATE POLICY "Supervisao can insert client_partners" ON public.client_partners FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'supervisao'));

-- ============================================================
-- 4) REINF
-- ============================================================

-- regime_period_config
CREATE TABLE public.regime_period_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regime TEXT NOT NULL UNIQUE,
  periodo_tipo TEXT NOT NULL DEFAULT 'trimestral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.regime_period_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view regime_period_config" ON public.regime_period_config FOR SELECT USING (true);
CREATE POLICY "Admin can manage regime_period_config" ON public.regime_period_config FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- reinf_entries
CREATE TABLE public.reinf_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  trimestre INTEGER NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
  lucro_mes1 NUMERIC DEFAULT 0,
  lucro_mes2 NUMERIC DEFAULT 0,
  lucro_mes3 NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente_contabil',
  -- Status por mês
  status_mes1 TEXT NOT NULL DEFAULT 'pendente_contabil',
  status_mes2 TEXT NOT NULL DEFAULT 'pendente_contabil',
  status_mes3 TEXT NOT NULL DEFAULT 'pendente_contabil',
  -- Auditoria global
  contabil_usuario_id UUID,
  contabil_preenchido_em TIMESTAMPTZ,
  dp_usuario_id UUID,
  dp_aprovado_em TIMESTAMPTZ,
  fiscal_usuario_id UUID,
  fiscal_enviado_em TIMESTAMPTZ,
  -- Auditoria por mês 1
  contabil_usuario_id_mes1 UUID,
  contabil_preenchido_em_mes1 TIMESTAMPTZ,
  dp_usuario_id_mes1 UUID,
  dp_aprovado_em_mes1 TIMESTAMPTZ,
  fiscal_usuario_id_mes1 UUID,
  fiscal_enviado_em_mes1 TIMESTAMPTZ,
  -- Auditoria por mês 2
  contabil_usuario_id_mes2 UUID,
  contabil_preenchido_em_mes2 TIMESTAMPTZ,
  dp_usuario_id_mes2 UUID,
  dp_aprovado_em_mes2 TIMESTAMPTZ,
  fiscal_usuario_id_mes2 UUID,
  fiscal_enviado_em_mes2 TIMESTAMPTZ,
  -- Auditoria por mês 3
  contabil_usuario_id_mes3 UUID,
  contabil_preenchido_em_mes3 TIMESTAMPTZ,
  dp_usuario_id_mes3 UUID,
  dp_aprovado_em_mes3 TIMESTAMPTZ,
  fiscal_usuario_id_mes3 UUID,
  fiscal_enviado_em_mes3 TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (client_id, ano, trimestre)
);
ALTER TABLE public.reinf_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reinf_entries" ON public.reinf_entries FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert reinf_entries" ON public.reinf_entries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update reinf_entries" ON public.reinf_entries FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete reinf_entries" ON public.reinf_entries FOR DELETE USING (public.is_admin());

CREATE TRIGGER update_reinf_entries_updated_at BEFORE UPDATE ON public.reinf_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- reinf_logs
CREATE TABLE public.reinf_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reinf_entry_id UUID NOT NULL REFERENCES public.reinf_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reinf_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reinf_logs" ON public.reinf_logs FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert reinf_logs" ON public.reinf_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete reinf_logs" ON public.reinf_logs FOR DELETE USING (public.is_admin());

CREATE INDEX idx_reinf_logs_entry ON public.reinf_logs(reinf_entry_id);

-- reinf_partner_profits
CREATE TABLE public.reinf_partner_profits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reinf_entry_id UUID NOT NULL REFERENCES public.reinf_entries(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.client_partners(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 3),
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reinf_partner_profits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reinf_partner_profits" ON public.reinf_partner_profits FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert reinf_partner_profits" ON public.reinf_partner_profits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update reinf_partner_profits" ON public.reinf_partner_profits FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete reinf_partner_profits" ON public.reinf_partner_profits FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE UNIQUE INDEX idx_reinf_partner_profits_unique ON public.reinf_partner_profits(reinf_entry_id, partner_id, mes);

-- ============================================================
-- 5) DOCUMENTOS
-- ============================================================

-- document_types
CREATE TABLE public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'necessario' CHECK (classification IN ('essencial', 'necessario', 'irrelevante')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  include_in_report BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  internal_observation TEXT
);
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_document_types_client ON public.document_types(client_id);

CREATE POLICY "Authenticated users can read document_types" ON public.document_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage document_types" ON public.document_types FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_document_types_updated_at BEFORE UPDATE ON public.document_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- document_monthly_status
CREATE TABLE public.document_monthly_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id UUID NOT NULL REFERENCES public.document_types(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  has_document BOOLEAN NOT NULL DEFAULT false,
  observation TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_type_id, year_month)
);
ALTER TABLE public.document_monthly_status ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_document_monthly_status_client_month ON public.document_monthly_status(client_id, year_month);
CREATE INDEX idx_document_monthly_status_doc_type ON public.document_monthly_status(document_type_id);

CREATE POLICY "Authenticated users can read document_monthly_status" ON public.document_monthly_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage document_monthly_status" ON public.document_monthly_status FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_document_monthly_status_updated_at BEFORE UPDATE ON public.document_monthly_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- document_report_logs
CREATE TABLE public.document_report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.document_report_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_document_report_logs_client ON public.document_report_logs(client_id, year_month);

CREATE POLICY "Authenticated users can read document_report_logs" ON public.document_report_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert document_report_logs" ON public.document_report_logs FOR INSERT TO authenticated WITH CHECK (true);

-- doc_tags
CREATE TABLE public.doc_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  text_color TEXT DEFAULT '#ffffff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.doc_tags ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_doc_tags_active ON public.doc_tags(is_active);

CREATE POLICY "Authenticated users can read doc_tags" ON public.doc_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage doc_tags" ON public.doc_tags FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Supervisao can insert doc_tags" ON public.doc_tags FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'supervisao'));
CREATE POLICY "Supervisao can delete doc_tags" ON public.doc_tags FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'supervisao'));

CREATE TRIGGER update_doc_tags_updated_at BEFORE UPDATE ON public.doc_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- document_type_doc_tags
CREATE TABLE public.document_type_doc_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id UUID NOT NULL REFERENCES public.document_types(id) ON DELETE CASCADE,
  doc_tag_id UUID NOT NULL REFERENCES public.doc_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_type_id, doc_tag_id)
);
ALTER TABLE public.document_type_doc_tags ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_document_type_doc_tags_doc ON public.document_type_doc_tags(document_type_id);
CREATE INDEX idx_document_type_doc_tags_tag ON public.document_type_doc_tags(doc_tag_id);

CREATE POLICY "Authenticated users can read document_type_doc_tags" ON public.document_type_doc_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage document_type_doc_tags" ON public.document_type_doc_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6) FAVORITOS E PALETAS
-- ============================================================

-- user_palettes
CREATE TABLE public.user_palettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  palette JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_palettes_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT user_palettes_name_len CHECK (char_length(name) <= 60)
);
ALTER TABLE public.user_palettes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_palettes_user_id ON public.user_palettes(user_id);
CREATE UNIQUE INDEX uq_user_palettes_user_name ON public.user_palettes(user_id, lower(name));

CREATE POLICY "Users can view own palettes" ON public.user_palettes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own palettes up to 3" ON public.user_palettes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (SELECT count(*) FROM public.user_palettes up WHERE up.user_id = auth.uid()) < 3);
CREATE POLICY "Users can update own palettes" ON public.user_palettes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own palettes" ON public.user_palettes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_user_palettes_updated_at BEFORE UPDATE ON public.user_palettes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- client_favorites
CREATE TABLE public.client_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_client_favorites_user_client UNIQUE (user_id, client_id)
);
ALTER TABLE public.client_favorites ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_client_favorites_user_id ON public.client_favorites(user_id);
CREATE INDEX idx_client_favorites_client_id ON public.client_favorites(client_id);

CREATE POLICY "Users can view own client favorites" ON public.client_favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own client favorites" ON public.client_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own client favorites" ON public.client_favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 7) FATOR R - SYNC FISCAL
-- ============================================================

-- fator_r_fiscal_sync
CREATE TABLE public.fator_r_fiscal_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT NOT NULL,
  cnpj_digits TEXT GENERATED ALWAYS AS (regexp_replace(cnpj, '\D', '', 'g')) STORED,
  competencia TEXT NOT NULL CHECK (competencia ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  fiscal_fechou BOOLEAN NOT NULL DEFAULT false,
  source_updated_at TIMESTAMPTZ NOT NULL,
  source_row_id UUID,
  source_payload JSONB,
  pulled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cnpj_digits, competencia)
);
ALTER TABLE public.fator_r_fiscal_sync ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_fator_r_fiscal_sync_competencia ON public.fator_r_fiscal_sync (competencia);
CREATE INDEX idx_fator_r_fiscal_sync_source_updated ON public.fator_r_fiscal_sync (source_updated_at DESC);

CREATE POLICY "Authenticated can view fator_r_fiscal_sync" ON public.fator_r_fiscal_sync FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage fator_r_fiscal_sync" ON public.fator_r_fiscal_sync FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- fator_r_sync_cursor
CREATE TABLE public.fator_r_sync_cursor (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  last_source_updated_at TIMESTAMPTZ NOT NULL DEFAULT to_timestamp(0),
  last_pull_at TIMESTAMPTZ,
  last_pull_status TEXT NOT NULL DEFAULT 'idle',
  last_pull_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fator_r_sync_cursor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view fator_r_sync_cursor" ON public.fator_r_sync_cursor FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage fator_r_sync_cursor" ON public.fator_r_sync_cursor FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.fator_r_sync_cursor (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- fator_r_pull_config
CREATE TABLE public.fator_r_pull_config (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  source_url TEXT NOT NULL DEFAULT 'https://knssjftfuyuhzrpvwhhd.supabase.co',
  source_anon_key TEXT NOT NULL DEFAULT '',
  sync_key TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.fator_r_pull_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view fator_r_pull_config" ON public.fator_r_pull_config FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admin can manage fator_r_pull_config" ON public.fator_r_pull_config FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.fator_r_pull_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Função: pull do Fator R via RPC anon + sync_key
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

  INSERT INTO public.fator_r_sync_cursor (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

  SELECT last_source_updated_at INTO v_cursor
  FROM public.fator_r_sync_cursor WHERE id = true FOR UPDATE;

  v_request_url := rtrim(p_source_url, '/') || '/rest/v1/rpc/export_fator_r_fiscal_changes';
  v_request_body := jsonb_build_object(
    'p_since', to_char(v_cursor AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'p_limit', p_batch_size,
    'p_sync_key', p_sync_key
  )::text;

  SELECT * INTO v_response
  FROM http((
    'POST', v_request_url,
    http_headers('apikey', p_source_anon_key, 'Authorization', 'Bearer ' || p_source_anon_key, 'Accept', 'application/json', 'Content-Type', 'application/json'),
    'application/json', v_request_body
  )::http_request);

  IF v_response.status < 200 OR v_response.status >= 300 THEN
    UPDATE public.fator_r_sync_cursor
    SET last_pull_at = now(), last_pull_status = 'error',
        last_pull_message = 'HTTP ' || v_response.status::text, updated_at = now()
    WHERE id = true;
    RETURN jsonb_build_object('ok', false, 'status', v_response.status, 'message', 'Erro ao buscar dados na origem.', 'cursor', v_cursor);
  END IF;

  v_payload := CASE WHEN v_response.content IS NULL OR btrim(v_response.content) = '' THEN '[]'::jsonb ELSE v_response.content::jsonb END;

  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'array' THEN
    UPDATE public.fator_r_sync_cursor
    SET last_pull_at = now(), last_pull_status = 'error',
        last_pull_message = 'Resposta nao retornou array json.', updated_at = now()
    WHERE id = true;
    RETURN jsonb_build_object('ok', false, 'status', v_response.status, 'message', 'Resposta invalida da origem.', 'cursor', v_cursor);
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
    SELECT * FROM raw_rows
    WHERE cnpj IS NOT NULL
      AND regexp_replace(cnpj, '\D', '', 'g') <> ''
      AND competencia ~ '^\d{4}-(0[1-9]|1[0-2])$'
      AND source_updated_at IS NOT NULL
  ),
  upserted AS (
    INSERT INTO public.fator_r_fiscal_sync (cnpj, competencia, fiscal_fechou, source_updated_at, source_row_id, source_payload, pulled_at, updated_at)
    SELECT cnpj, competencia, fiscal_fechou, source_updated_at, source_row_id, source_payload, now(), now()
    FROM filtered_rows
    ON CONFLICT (cnpj_digits, competencia)
    DO UPDATE SET
      cnpj = EXCLUDED.cnpj, fiscal_fechou = EXCLUDED.fiscal_fechou,
      source_updated_at = EXCLUDED.source_updated_at, source_row_id = EXCLUDED.source_row_id,
      source_payload = EXCLUDED.source_payload, pulled_at = now(), updated_at = now()
    WHERE EXCLUDED.source_updated_at >= public.fator_r_fiscal_sync.source_updated_at
    RETURNING source_updated_at
  )
  SELECT COUNT(*), MAX(source_updated_at) INTO v_imported_rows, v_max_updated_at FROM upserted;

  v_next_cursor := COALESCE(v_max_updated_at - interval '1 second', v_cursor);

  UPDATE public.fator_r_sync_cursor
  SET last_source_updated_at = v_next_cursor, last_pull_at = now(), last_pull_status = 'ok',
      last_pull_message = format('%s linha(s) importada(s)', v_imported_rows), updated_at = now()
  WHERE id = true;

  RETURN jsonb_build_object('ok', true, 'status', v_response.status, 'imported_rows', v_imported_rows, 'cursor_before', v_cursor, 'cursor_after', v_next_cursor);
EXCEPTION WHEN OTHERS THEN
  UPDATE public.fator_r_sync_cursor
  SET last_pull_at = now(), last_pull_status = 'error', last_pull_message = SQLERRM, updated_at = now()
  WHERE id = true;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.pull_fator_r_fiscal_changes(text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pull_fator_r_fiscal_changes(text, text, text, integer) TO authenticated;

-- Função: configurar pull do Fator R
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

  INSERT INTO public.fator_r_pull_config (id, source_url, source_anon_key, sync_key, updated_at, updated_by)
  VALUES (true, COALESCE(NULLIF(btrim(p_source_url), ''), 'https://knssjftfuyuhzrpvwhhd.supabase.co'), p_source_anon_key, p_sync_key, now(), auth.uid())
  ON CONFLICT (id) DO UPDATE SET
    source_url = EXCLUDED.source_url, source_anon_key = EXCLUDED.source_anon_key,
    sync_key = EXCLUDED.sync_key, updated_at = now(), updated_by = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_fator_r_pull_config(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_fator_r_pull_config(text, text, text) TO authenticated;

-- Função: rodar pull usando config salva
CREATE OR REPLACE FUNCTION public.run_fator_r_fiscal_pull(p_batch_size integer DEFAULT 5000)
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

  SELECT * INTO v_cfg FROM public.fator_r_pull_config WHERE id = true;
  IF v_cfg.id IS DISTINCT FROM true THEN RAISE EXCEPTION 'Configuracao de pull nao encontrada.'; END IF;
  IF btrim(COALESCE(v_cfg.source_anon_key, '')) = '' THEN RAISE EXCEPTION 'source_anon_key nao configurada.'; END IF;
  IF btrim(COALESCE(v_cfg.sync_key, '')) = '' THEN RAISE EXCEPTION 'sync_key nao configurada.'; END IF;

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

-- ============================================================
-- 8) PERMISSOES E GERENCIAMENTO
-- ============================================================

-- permission_settings
CREATE TABLE public.permission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  allowed_roles TEXT[] NOT NULL DEFAULT '{}'::text[],
  allowed_sectors TEXT[] NOT NULL DEFAULT '{}'::text[],
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.permission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view permission_settings" ON public.permission_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or supervisor can manage permission_settings" ON public.permission_settings FOR ALL TO authenticated
  USING (public.is_admin_or_supervisor()) WITH CHECK (public.is_admin_or_supervisor());

CREATE TRIGGER update_permission_settings_updated_at BEFORE UPDATE ON public.permission_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- management_config
CREATE TABLE public.management_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  key TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.management_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view management_config" ON public.management_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or supervisor can manage management_config" ON public.management_config FOR ALL TO authenticated
  USING (public.is_admin_or_supervisor()) WITH CHECK (public.is_admin_or_supervisor());

CREATE TRIGGER update_management_config_updated_at BEFORE UPDATE ON public.management_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: validar reviewer de management
CREATE OR REPLACE FUNCTION public.is_management_reviewer(_reviewer_number integer, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.management_config mc
    WHERE mc.key = CASE _reviewer_number WHEN 1 THEN 'reviewer_1' WHEN 2 THEN 'reviewer_2' ELSE '__invalid__' END
    AND mc.user_id = _user_id
  );
$$;

-- management_reviews
CREATE TABLE public.management_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL CHECK (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  reviewer_number INTEGER NOT NULL CHECK (reviewer_number IN (1, 2)),
  reviewed_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, year_month, reviewer_number)
);
ALTER TABLE public.management_reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_management_reviews_year_month ON public.management_reviews(year_month);
CREATE INDEX idx_management_reviews_reviewer ON public.management_reviews(reviewer_number, reviewed_by);

CREATE POLICY "Authenticated can view management_reviews" ON public.management_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert own management_reviews" ON public.management_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND reviewed_by = auth.uid());
CREATE POLICY "Admin or owner can delete management_reviews" ON public.management_reviews FOR DELETE TO authenticated
  USING (public.is_admin() OR (auth.uid() IS NOT NULL AND reviewed_by = auth.uid()));
CREATE POLICY "Admin or owner can update management_reviews" ON public.management_reviews FOR UPDATE TO authenticated
  USING (public.is_admin() OR (auth.uid() IS NOT NULL AND reviewed_by = auth.uid()))
  WITH CHECK (public.is_admin() OR (auth.uid() IS NOT NULL AND reviewed_by = auth.uid()));

-- ============================================================
-- 9) STORAGE
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('pop-images', 'pop-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload pop images' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can upload pop images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pop-images' AND auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Pop images are publicly accessible' AND tablename = 'objects') THEN
    CREATE POLICY "Pop images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'pop-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete pop images' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can delete pop images" ON storage.objects FOR DELETE USING (bucket_id = 'pop-images' AND auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update pop images' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can update pop images" ON storage.objects FOR UPDATE USING (bucket_id = 'pop-images' AND auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================================
-- 10) SEED DATA
-- ============================================================

-- Regimes padrão
INSERT INTO public.regime_period_config (regime, periodo_tipo) VALUES
  ('Simples Nacional', 'trimestral'),
  ('Lucro Presumido', 'trimestral'),
  ('Lucro Real', 'trimestral'),
  ('MEI', 'trimestral')
ON CONFLICT (regime) DO NOTHING;

-- Opções de parâmetros
INSERT INTO public.parameter_options (type, value, color, order_index) VALUES
  ('task_status', 'Aberta', '#22c55e', 0),
  ('task_status', 'Em andamento', '#3b82f6', 1),
  ('task_status', 'Aguardando cliente', '#f59e0b', 2),
  ('task_status', 'Aguardando terceiro', '#a855f7', 3),
  ('task_status', 'Concluída', '#14b8a6', 4),
  ('task_status', 'Cancelada', '#ef4444', 5),
  ('task_type', 'Pendência', NULL, 0),
  ('task_type', 'Ajuste', NULL, 1),
  ('task_type', 'Solicitação ao cliente', NULL, 2),
  ('task_type', 'Conferência', NULL, 3),
  ('task_priority', 'Alta', '#ef4444', 0),
  ('task_priority', 'Média', '#f59e0b', 1),
  ('task_priority', 'Baixa', '#22c55e', 2),
  ('occurrence_category', 'Informativa', '#3b82f6', 0),
  ('occurrence_category', 'Atenção', '#f59e0b', 1);

-- Permissões padrão
INSERT INTO public.permission_settings (key, enabled, allowed_roles, allowed_sectors) VALUES
  ('restrict_collaborator_sectors', false, '{}'::text[], '{}'::text[]),
  ('reinf_fill_profits', true, ARRAY['admin', 'supervisao']::text[], '{}'::text[]),
  ('view_management', true, ARRAY['admin', 'supervisao']::text[], '{}'::text[]),
  ('view_accounting_ready', true, '{}'::text[], '{}'::text[])
ON CONFLICT (key) DO NOTHING;
