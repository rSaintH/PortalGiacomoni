
-- Add sector_id to client_tags (nullable = empresa geral)
ALTER TABLE public.client_tags
ADD COLUMN sector_id uuid REFERENCES public.sectors(id) ON DELETE CASCADE;
