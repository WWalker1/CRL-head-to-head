-- Friend history and explicitly shared rivalry snapshots.
-- This migration is intentionally additive; apply it only after review.
BEGIN;

CREATE TABLE IF NOT EXISTS friend_match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracked_friend_id UUID NOT NULL REFERENCES tracked_friends(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  physical_match_id TEXT NOT NULL,
  battle_time TIMESTAMP WITH TIME ZONE NOT NULL,
  mode TEXT NOT NULL,
  friend_result TEXT NOT NULL CHECK (friend_result IN ('win', 'loss', 'draw')),
  friend_deck JSONB NOT NULL,
  opponent_deck JSONB,
  observed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  source TEXT NOT NULL DEFAULT 'royale_api',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE (tracked_friend_id, physical_match_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_history_friend_time
  ON friend_match_history(tracked_friend_id, battle_time DESC);
CREATE INDEX IF NOT EXISTS idx_friend_history_user
  ON friend_match_history(user_id, battle_time DESC);

ALTER TABLE friend_match_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own friend history"
  ON friend_match_history FOR SELECT USING (auth.uid() = user_id);
-- Authoritative history is inserted by the service role only.
REVOKE INSERT, UPDATE, DELETE ON friend_match_history FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS rivalry_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracked_friend_id UUID NOT NULL REFERENCES tracked_friends(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_rivalry_shares_share_id ON rivalry_shares(share_id);
ALTER TABLE rivalry_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view their rivalry shares"
  ON rivalry_shares FOR SELECT USING (auth.uid() = owner_user_id);
-- Creation/revocation runs through authenticated server routes using trusted scores.
REVOKE INSERT, UPDATE, DELETE ON rivalry_shares FROM anon, authenticated;
-- Public reads go through the server route, which selects only snapshot and status
-- using the service role. Do not expose owner_user_id/tracked_friend_id to anon.
COMMIT;
