
-- Restrict clients SELECT to authenticated users only
DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;
CREATE POLICY "Authenticated can view clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
