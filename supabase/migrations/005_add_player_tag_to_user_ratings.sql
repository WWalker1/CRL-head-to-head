-- Add player_tag to user_ratings for looking up opponents
ALTER TABLE user_ratings
ADD COLUMN IF NOT EXISTS player_tag TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_ratings_player_tag ON user_ratings(player_tag);

