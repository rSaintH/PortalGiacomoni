-- ============================================================
-- Shared DB compatibility mode (post-hardening)
-- Run this AFTER 20260303120000_permissions_and_management_hardening.sql
-- ============================================================

-- This migration keeps new schema changes and relaxes some RLS rules
-- to preserve behavior for older forks connected to the same database.

-- Helpers
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

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.is_supervisor();
$$;

-- 1) permission_settings: allow admin + supervisor to manage
DO $$
BEGIN
  IF to_regclass('public.permission_settings') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin can manage permission_settings" ON public.permission_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Admin or supervisor can manage permission_settings" ON public.permission_settings';
    EXECUTE '
      CREATE POLICY "Admin or supervisor can manage permission_settings"
      ON public.permission_settings
      FOR ALL
      TO authenticated
      USING (public.is_admin_or_supervisor())
      WITH CHECK (public.is_admin_or_supervisor())
    ';
  END IF;
END $$;

-- 2) management_config: allow admin + supervisor to manage
DO $$
BEGIN
  IF to_regclass('public.management_config') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin can manage management_config" ON public.management_config';
    EXECUTE 'DROP POLICY IF EXISTS "Admin or supervisor can manage management_config" ON public.management_config';
    EXECUTE '
      CREATE POLICY "Admin or supervisor can manage management_config"
      ON public.management_config
      FOR ALL
      TO authenticated
      USING (public.is_admin_or_supervisor())
      WITH CHECK (public.is_admin_or_supervisor())
    ';
  END IF;
END $$;

-- 3) management_reviews: allow authenticated user to manage own marks
DO $$
BEGIN
  IF to_regclass('public.management_reviews') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Assigned reviewers can insert management_reviews" ON public.management_reviews';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can insert own management_reviews" ON public.management_reviews';
    EXECUTE '
      CREATE POLICY "Authenticated can insert own management_reviews"
      ON public.management_reviews
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND reviewed_by = auth.uid()
      )
    ';

    EXECUTE 'DROP POLICY IF EXISTS "Assigned reviewers or admin can delete management_reviews" ON public.management_reviews';
    EXECUTE 'DROP POLICY IF EXISTS "Admin or owner can delete management_reviews" ON public.management_reviews';
    EXECUTE '
      CREATE POLICY "Admin or owner can delete management_reviews"
      ON public.management_reviews
      FOR DELETE
      TO authenticated
      USING (
        public.is_admin()
        OR (auth.uid() IS NOT NULL AND reviewed_by = auth.uid())
      )
    ';

    EXECUTE 'DROP POLICY IF EXISTS "Admin can update management_reviews" ON public.management_reviews';
    EXECUTE 'DROP POLICY IF EXISTS "Admin or owner can update management_reviews" ON public.management_reviews';
    EXECUTE '
      CREATE POLICY "Admin or owner can update management_reviews"
      ON public.management_reviews
      FOR UPDATE
      TO authenticated
      USING (
        public.is_admin()
        OR (auth.uid() IS NOT NULL AND reviewed_by = auth.uid())
      )
      WITH CHECK (
        public.is_admin()
        OR (auth.uid() IS NOT NULL AND reviewed_by = auth.uid())
      )
    ';
  END IF;
END $$;
