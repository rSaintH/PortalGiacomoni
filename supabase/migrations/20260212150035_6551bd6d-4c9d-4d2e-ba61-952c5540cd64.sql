
-- Add monetary_value to tasks
ALTER TABLE public.tasks ADD COLUMN monetary_value numeric(15,2) DEFAULT NULL;

-- Add monetary_value to occurrences
ALTER TABLE public.occurrences ADD COLUMN monetary_value numeric(15,2) DEFAULT NULL;

-- Create occurrence_comments table (mirrors task_comments)
CREATE TABLE public.occurrence_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  occurrence_id uuid NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.occurrence_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view occurrence comments"
ON public.occurrence_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated can insert occurrence comments"
ON public.occurrence_comments FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner can update own occurrence comment"
ON public.occurrence_comments FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Admin can update any occurrence comment"
ON public.occurrence_comments FOR UPDATE
USING (is_admin());

CREATE POLICY "Admin can delete occurrence comments"
ON public.occurrence_comments FOR DELETE
USING (is_admin());
