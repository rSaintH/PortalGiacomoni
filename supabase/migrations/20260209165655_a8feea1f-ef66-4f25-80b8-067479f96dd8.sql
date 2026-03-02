
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'colaborador');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'colaborador',
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
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

-- Helper: is current user admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Profiles RLS
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles RLS
CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin());

-- Auto-create profile on signup
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1) sectors
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

-- 2) sections
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

-- 3) clients
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    cnpj TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Prospecção')),
    group_name TEXT,
    notes_quick TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    is_archived BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_admin());

-- 4) client_particularities
CREATE TABLE public.client_particularities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    sector_id UUID REFERENCES public.sectors(id) NOT NULL,
    section_id UUID REFERENCES public.sections(id),
    title TEXT NOT NULL,
    details TEXT,
    priority TEXT NOT NULL DEFAULT 'Média' CHECK (priority IN ('Alta', 'Média', 'Baixa')),
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

-- 5) pops
CREATE TABLE public.pops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL DEFAULT 'Geral' CHECK (scope IN ('Geral', 'Cliente')),
    sector_id UUID REFERENCES public.sectors(id) NOT NULL,
    section_id UUID REFERENCES public.sections(id),
    client_id UUID REFERENCES public.clients(id),
    title TEXT NOT NULL,
    objective TEXT,
    steps TEXT,
    links TEXT[] DEFAULT '{}',
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
CREATE POLICY "Admin can insert pops" ON public.pops FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admin can update pops" ON public.pops FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin can delete pops" ON public.pops FOR DELETE TO authenticated USING (public.is_admin());

-- 6) pop_revisions
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

-- 7) tasks
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    sector_id UUID REFERENCES public.sectors(id) NOT NULL,
    section_id UUID REFERENCES public.sections(id),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'Pendência' CHECK (type IN ('Pendência', 'Ajuste', 'Solicitação ao cliente', 'Conferência')),
    priority TEXT NOT NULL DEFAULT 'Média' CHECK (priority IN ('Alta', 'Média', 'Baixa')),
    status TEXT NOT NULL DEFAULT 'Aberta' CHECK (status IN ('Aberta', 'Em andamento', 'Aguardando cliente', 'Aguardando terceiro', 'Concluída', 'Cancelada')),
    due_date DATE,
    assignee_id UUID REFERENCES auth.users(id),
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

-- 8) task_comments
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

-- 9) occurrences
CREATE TABLE public.occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    sector_id UUID REFERENCES public.sectors(id) NOT NULL,
    section_id UUID REFERENCES public.sections(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Informativa' CHECK (category IN ('Informativa', 'Atenção')),
    related_task_id UUID REFERENCES public.tasks(id),
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

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON public.sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_particularities_updated_at BEFORE UPDATE ON public.client_particularities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pops_updated_at BEFORE UPDATE ON public.pops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
