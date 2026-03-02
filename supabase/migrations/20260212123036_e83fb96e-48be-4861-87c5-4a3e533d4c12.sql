
-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Create client_tags junction table for N:N relationship
CREATE TABLE public.client_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  tag_id UUID NOT NULL REFERENCES public.tags(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, tag_id)
);

-- Add tag_ids column to pops table
ALTER TABLE public.pops
ADD COLUMN tag_ids UUID[] DEFAULT '{}'::uuid[];

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for tags
CREATE POLICY "Authenticated can view tags" 
ON public.tags FOR SELECT USING (true);

CREATE POLICY "Admin can insert tags" 
ON public.tags FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admin can update tags" 
ON public.tags FOR UPDATE USING (is_admin());

CREATE POLICY "Admin can delete tags" 
ON public.tags FOR DELETE USING (is_admin());

-- Enable RLS on client_tags
ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_tags
CREATE POLICY "Authenticated can view client_tags" 
ON public.client_tags FOR SELECT USING (true);

CREATE POLICY "Admin can insert client_tags" 
ON public.client_tags FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admin can update client_tags" 
ON public.client_tags FOR UPDATE USING (is_admin());

CREATE POLICY "Admin can delete client_tags" 
ON public.client_tags FOR DELETE USING (is_admin());

-- Create trigger for tags updated_at
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for client_tags updated_at
CREATE TRIGGER update_client_tags_updated_at
BEFORE UPDATE ON public.client_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
