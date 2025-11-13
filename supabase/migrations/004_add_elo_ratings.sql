-- Add Elo rating column to tracked friends
ALTER TABLE tracked_friends
ADD COLUMN IF NOT EXISTS elo_rating INTEGER NOT NULL DEFAULT 1500;

-- Create table to track user Elo ratings
CREATE TABLE IF NOT EXISTS user_ratings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  elo_rating INTEGER NOT NULL DEFAULT 1500,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS on user_ratings
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Policies for user_ratings (drop first to avoid duplicate creation)
DROP POLICY IF EXISTS "Users can view their own rating" ON user_ratings;
DROP POLICY IF EXISTS "Users can insert their own rating" ON user_ratings;
DROP POLICY IF EXISTS "Users can update their own rating" ON user_ratings;
DROP POLICY IF EXISTS "Users can delete their own rating" ON user_ratings;

CREATE POLICY "Users can view their own rating"
  ON user_ratings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rating"
  ON user_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rating"
  ON user_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rating"
  ON user_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to keep updated_at current
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_user_ratings_updated_at'
  ) THEN
    CREATE TRIGGER update_user_ratings_updated_at
    BEFORE UPDATE ON user_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


