-- ============================================================
-- Permissions + Management hardening
-- ============================================================

-- 1) Add missing role in enum (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role'
      AND e.enumlabel = 'supervisao'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'supervisao';
  END IF;
END $$;

-- 2) permission_settings table + column compatibility
CREATE TABLE IF NOT EXISTS public.permission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  allowed_roles text[] NOT NULL DEFAULT '{}'::text[],
  allowed_sectors text[] NOT NULL DEFAULT '{}'::text[],
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_settings
  ADD COLUMN IF NOT EXISTS allowed_sectors text[] NOT NULL DEFAULT '{}'::text[];

CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_settings_key_unique
  ON public.permission_settings(key);

UPDATE public.permission_settings
SET allowed_roles = COALESCE(allowed_roles, '{}'::text[]),
    allowed_sectors = COALESCE(allowed_sectors, '{}'::text[])
WHERE allowed_roles IS NULL OR allowed_sectors IS NULL;

ALTER TABLE public.permission_settings
  ALTER COLUMN allowed_roles SET DEFAULT '{}'::text[],
  ALTER COLUMN allowed_sectors SET DEFAULT '{}'::text[],
  ALTER COLUMN allowed_roles SET NOT NULL,
  ALTER COLUMN allowed_sectors SET NOT NULL;

ALTER TABLE public.permission_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view permission_settings" ON public.permission_settings;
CREATE POLICY "Authenticated can view permission_settings"
  ON public.permission_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin can manage permission_settings" ON public.permission_settings;
CREATE POLICY "Admin can manage permission_settings"
  ON public.permission_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_permission_settings_updated_at ON public.permission_settings;
CREATE TRIGGER update_permission_settings_updated_at
  BEFORE UPDATE ON public.permission_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default permission rows (only when missing)
INSERT INTO public.permission_settings (key, enabled, allowed_roles, allowed_sectors)
VALUES (
  'restrict_collaborator_sectors',
  false,
  '{}'::text[],
  '{}'::text[]
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.permission_settings (key, enabled, allowed_roles, allowed_sectors)
VALUES (
  'reinf_fill_profits',
  true,
  ARRAY['admin', 'supervisao']::text[],
  '{}'::text[]
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.permission_settings (key, enabled, allowed_roles, allowed_sectors)
VALUES (
  'view_management',
  true,
  ARRAY['admin', 'supervisao']::text[],
  '{}'::text[]
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.permission_settings (key, enabled, allowed_roles, allowed_sectors)
VALUES (
  'view_accounting_ready',
  true,
  '{}'::text[],
  COALESCE(
    (
      SELECT array_agg(s.id::text ORDER BY s.name)
      FROM public.sectors s
      WHERE s.is_active = true
    ),
    '{}'::text[]
  )
)
ON CONFLICT (key) DO NOTHING;

-- 3) Management tables
CREATE TABLE IF NOT EXISTS public.management_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  key text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.management_config
  ADD COLUMN IF NOT EXISTS id uuid;

UPDATE public.management_config
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.management_config
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'management_config_id_key'
      AND conrelid = 'public.management_config'::regclass
  ) THEN
    ALTER TABLE public.management_config
      ADD CONSTRAINT management_config_id_key UNIQUE (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.management_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year_month text NOT NULL CHECK (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  reviewer_number integer NOT NULL CHECK (reviewer_number IN (1, 2)),
  reviewed_by uuid NOT NULL REFERENCES auth.users(id),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, year_month, reviewer_number)
);

CREATE INDEX IF NOT EXISTS idx_management_reviews_year_month
  ON public.management_reviews(year_month);

CREATE INDEX IF NOT EXISTS idx_management_reviews_reviewer
  ON public.management_reviews(reviewer_number, reviewed_by);

ALTER TABLE public.management_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view management_config" ON public.management_config;
CREATE POLICY "Authenticated can view management_config"
  ON public.management_config
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin can manage management_config" ON public.management_config;
CREATE POLICY "Admin can manage management_config"
  ON public.management_config
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_management_config_updated_at ON public.management_config;
CREATE TRIGGER update_management_config_updated_at
  BEFORE UPDATE ON public.management_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper to validate who can check reviewer slot 1 or 2
CREATE OR REPLACE FUNCTION public.is_management_reviewer(_reviewer_number integer, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.management_config mc
    WHERE mc.key = CASE _reviewer_number
      WHEN 1 THEN 'reviewer_1'
      WHEN 2 THEN 'reviewer_2'
      ELSE '__invalid__'
    END
    AND mc.user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "Authenticated can view management_reviews" ON public.management_reviews;
CREATE POLICY "Authenticated can view management_reviews"
  ON public.management_reviews
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Assigned reviewers can insert management_reviews" ON public.management_reviews;
CREATE POLICY "Assigned reviewers can insert management_reviews"
  ON public.management_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND reviewed_by = auth.uid()
    AND (
      public.is_admin()
      OR public.is_management_reviewer(reviewer_number, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Assigned reviewers or admin can delete management_reviews" ON public.management_reviews;
CREATE POLICY "Assigned reviewers or admin can delete management_reviews"
  ON public.management_reviews
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR (
      auth.uid() IS NOT NULL
      AND reviewed_by = auth.uid()
      AND public.is_management_reviewer(reviewer_number, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admin can update management_reviews" ON public.management_reviews;
CREATE POLICY "Admin can update management_reviews"
  ON public.management_reviews
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
