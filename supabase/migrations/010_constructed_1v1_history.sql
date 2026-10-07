-- Archive constructed 1v1 modes beyond Ladder and Ranked, including modern Challenges.
-- The archive remains append-only by physical match; latest 100 is only a read window.
BEGIN;

ALTER TABLE public.player_match_history
  DROP CONSTRAINT IF EXISTS player_match_history_mode_check;
ALTER TABLE public.player_match_history
  ADD CONSTRAINT player_match_history_mode_check
  CHECK (mode IN ('ladder', 'ranked', 'challenge', 'other'));

ALTER TABLE public.player_match_history
  ADD COLUMN IF NOT EXISTS game_mode_name TEXT,
  ADD COLUMN IF NOT EXISTS deck_selection TEXT,
  ADD COLUMN IF NOT EXISTS challenge_type TEXT,
  ADD COLUMN IF NOT EXISTS event_tag TEXT;

ALTER TABLE public.friend_match_history
  ADD COLUMN IF NOT EXISTS game_mode_name TEXT,
  ADD COLUMN IF NOT EXISTS deck_selection TEXT,
  ADD COLUMN IF NOT EXISTS challenge_type TEXT,
  ADD COLUMN IF NOT EXISTS event_tag TEXT;

COMMIT;
