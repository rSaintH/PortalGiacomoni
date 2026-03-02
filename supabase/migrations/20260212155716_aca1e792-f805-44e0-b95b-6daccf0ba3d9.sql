
-- Allow all authenticated users to update POPs (not just admin)
CREATE POLICY "Authenticated can update pops"
ON public.pops
FOR UPDATE
USING (true);

-- Allow all authenticated users to insert POPs (not just admin)
CREATE POLICY "Authenticated can insert pops"
ON public.pops
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Drop admin-only insert/update policies for pops
DROP POLICY IF EXISTS "Admin can insert pops" ON public.pops;
DROP POLICY IF EXISTS "Admin can update pops" ON public.pops;
