
-- Table for configurable parameter options (task statuses, types, priorities, occurrence categories)
CREATE TABLE public.parameter_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'task_status', 'task_type', 'task_priority', 'occurrence_category'
  value TEXT NOT NULL,
  color TEXT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.parameter_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view parameter_options" ON public.parameter_options FOR SELECT USING (true);
CREATE POLICY "Admin can insert parameter_options" ON public.parameter_options FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can update parameter_options" ON public.parameter_options FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can delete parameter_options" ON public.parameter_options FOR DELETE USING (is_admin());

-- Seed existing values
INSERT INTO public.parameter_options (type, value, color, order_index) VALUES
  ('task_status', 'Aberta', '#22c55e', 0),
  ('task_status', 'Em andamento', '#3b82f6', 1),
  ('task_status', 'Aguardando cliente', '#f59e0b', 2),
  ('task_status', 'Aguardando terceiro', '#a855f7', 3),
  ('task_status', 'Concluída', '#14b8a6', 4),
  ('task_status', 'Cancelada', '#ef4444', 5),
  ('task_type', 'Pendência', NULL, 0),
  ('task_type', 'Ajuste', NULL, 1),
  ('task_type', 'Solicitação ao cliente', NULL, 2),
  ('task_type', 'Conferência', NULL, 3),
  ('task_priority', 'Alta', '#ef4444', 0),
  ('task_priority', 'Média', '#f59e0b', 1),
  ('task_priority', 'Baixa', '#22c55e', 2),
  ('occurrence_category', 'Informativa', '#3b82f6', 0),
  ('occurrence_category', 'Atenção', '#f59e0b', 1);
