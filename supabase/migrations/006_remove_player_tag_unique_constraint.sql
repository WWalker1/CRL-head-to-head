-- Remove unique constraint on player_tag to allow multiple users with same tag
-- (Since we can't verify account ownership, multiple users can claim the same player_tag)
ALTER TABLE user_ratings
DROP CONSTRAINT IF EXISTS user_ratings_player_tag_key;

-- Keep the index for fast lookups (non-unique)
-- Index already exists from migration 005, so this is just for reference

