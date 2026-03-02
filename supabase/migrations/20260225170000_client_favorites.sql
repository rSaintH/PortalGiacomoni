-- Favorite clients per user (no limit)
CREATE TABLE IF NOT EXISTS public.client_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_client_favorites_user_client UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_favorites_user_id ON public.client_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_client_favorites_client_id ON public.client_favorites(client_id);

ALTER TABLE public.client_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own client favorites" ON public.client_favorites;
CREATE POLICY "Users can view own client favorites"
  ON public.client_favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own client favorites" ON public.client_favorites;
CREATE POLICY "Users can insert own client favorites"
  ON public.client_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own client favorites" ON public.client_favorites;
CREATE POLICY "Users can delete own client favorites"
  ON public.client_favorites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
