-- Persistent eligible 1v1 history. No rolling deletion: latest-100 is a display window.
BEGIN;
ALTER TABLE public.friend_match_history
  ADD COLUMN player_tag TEXT,
  ADD COLUMN opponent_tag TEXT,
  ADD COLUMN player_crowns INTEGER,
  ADD COLUMN opponent_crowns INTEGER,
  ADD COLUMN battle_type TEXT,
  ADD COLUMN game_mode_id INTEGER,
  ADD COLUMN expected_win_probability DOUBLE PRECISION CHECK (expected_win_probability BETWEEN 0 AND 1),
  ADD COLUMN prediction_model_version TEXT,
  ADD COLUMN prediction_training_cutoff TIMESTAMPTZ,
  ADD COLUMN prediction_eligible BOOLEAN,
  ADD COLUMN prediction_scored_at TIMESTAMPTZ;

CREATE TABLE public.player_match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_tag TEXT NOT NULL,
  physical_match_id TEXT NOT NULL,
  battle_time TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('ladder', 'ranked')),
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  player_deck JSONB NOT NULL,
  opponent_deck JSONB NOT NULL,
  opponent_tag TEXT,
  player_crowns INTEGER,
  opponent_crowns INTEGER,
  battle_type TEXT,
  game_mode_id INTEGER,
  expected_win_probability DOUBLE PRECISION CHECK (expected_win_probability BETWEEN 0 AND 1),
  prediction_model_version TEXT,
  prediction_training_cutoff TIMESTAMPTZ,
  prediction_eligible BOOLEAN,
  prediction_scored_at TIMESTAMPTZ,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, player_tag, physical_match_id)
);
CREATE INDEX player_history_recent ON public.player_match_history(user_id, player_tag, battle_time DESC);
ALTER TABLE public.player_match_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own player history" ON public.player_match_history FOR SELECT USING (auth.uid() = user_id);
GRANT SELECT ON public.player_match_history TO authenticated;
REVOKE ALL ON public.player_match_history FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.player_match_history FROM authenticated;
GRANT ALL ON public.player_match_history TO service_role;
COMMIT;
