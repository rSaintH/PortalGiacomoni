ALTER TABLE public.pops DROP CONSTRAINT IF EXISTS pops_scope_check;
ALTER TABLE public.pops ADD CONSTRAINT pops_scope_check CHECK (scope IN ('Geral', 'Cliente', 'Tag'));