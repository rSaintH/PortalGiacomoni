
-- Add sector_id to profiles for sector assignment
ALTER TABLE public.profiles
  ADD COLUMN sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL;
