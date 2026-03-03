-- ============================================================
-- management_config id compatibility for legacy imports
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.management_config') IS NOT NULL THEN
    ALTER TABLE public.management_config
      ADD COLUMN IF NOT EXISTS id uuid;

    UPDATE public.management_config
    SET id = gen_random_uuid()
    WHERE id IS NULL;

    ALTER TABLE public.management_config
      ALTER COLUMN id SET DEFAULT gen_random_uuid(),
      ALTER COLUMN id SET NOT NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'management_config_id_key'
        AND conrelid = 'public.management_config'::regclass
    ) THEN
      ALTER TABLE public.management_config
        ADD CONSTRAINT management_config_id_key UNIQUE (id);
    END IF;
  END IF;
END $$;

