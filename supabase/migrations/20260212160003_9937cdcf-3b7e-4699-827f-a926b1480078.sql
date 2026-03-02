
-- Add editor_roles column to tasks, occurrences, and pops
-- Default is both roles (everyone can edit). Admins can restrict to specific roles.
ALTER TABLE public.tasks ADD COLUMN editor_roles text[] NOT NULL DEFAULT '{admin,colaborador}'::text[];
ALTER TABLE public.occurrences ADD COLUMN editor_roles text[] NOT NULL DEFAULT '{admin,colaborador}'::text[];
ALTER TABLE public.pops ADD COLUMN editor_roles text[] NOT NULL DEFAULT '{admin,colaborador}'::text[];
