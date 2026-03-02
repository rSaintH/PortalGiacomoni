-- Saved palettes per user (max 3)
CREATE TABLE IF NOT EXISTS public.user_palettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  palette JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_palettes_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT user_palettes_name_len CHECK (char_length(name) <= 60)
);

CREATE INDEX IF NOT EXISTS idx_user_palettes_user_id ON public.user_palettes(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_palettes_user_name ON public.user_palettes(user_id, lower(name));

ALTER TABLE public.user_palettes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own palettes" ON public.user_palettes;
CREATE POLICY "Users can view own palettes"
  ON public.user_palettes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own palettes up to 3" ON public.user_palettes;
CREATE POLICY "Users can insert own palettes up to 3"
  ON public.user_palettes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      SELECT count(*)
      FROM public.user_palettes up
      WHERE up.user_id = auth.uid()
    ) < 3
  );

DROP POLICY IF EXISTS "Users can update own palettes" ON public.user_palettes;
CREATE POLICY "Users can update own palettes"
  ON public.user_palettes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own palettes" ON public.user_palettes;
CREATE POLICY "Users can delete own palettes"
  ON public.user_palettes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_palettes_updated_at ON public.user_palettes;
CREATE TRIGGER update_user_palettes_updated_at
  BEFORE UPDATE ON public.user_palettes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
