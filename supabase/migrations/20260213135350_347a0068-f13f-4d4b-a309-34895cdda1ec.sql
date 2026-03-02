
-- Audit log for REINF entries
CREATE TABLE public.reinf_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reinf_entry_id UUID NOT NULL REFERENCES public.reinf_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reinf_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reinf_logs"
  ON public.reinf_logs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert reinf_logs"
  ON public.reinf_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can delete reinf_logs"
  ON public.reinf_logs FOR DELETE
  USING (is_admin());

CREATE INDEX idx_reinf_logs_entry ON public.reinf_logs(reinf_entry_id);
