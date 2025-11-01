-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table to store tracked friends
CREATE TABLE tracked_friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_player_tag TEXT NOT NULL,
  friend_name TEXT NOT NULL,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_losses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, friend_player_tag)
);

-- Table to store all battles
CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  battle_time TIMESTAMP WITH TIME ZONE NOT NULL,
  battle_type TEXT NOT NULL,
  opponent_tag TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Table to track processed battles to avoid duplicates
CREATE TABLE processed_battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  battle_id TEXT NOT NULL, -- API battle ID (combination of battleTime + type)
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, battle_id)
);

-- Indexes for better query performance
CREATE INDEX idx_tracked_friends_user_id ON tracked_friends(user_id);
CREATE INDEX idx_tracked_friends_user_tag ON tracked_friends(user_id, friend_player_tag);
CREATE INDEX idx_battles_user_id ON battles(user_id);
CREATE INDEX idx_battles_opponent_tag ON battles(opponent_tag);
CREATE INDEX idx_battles_battle_time ON battles(battle_time DESC);
CREATE INDEX idx_processed_battles_user_id ON processed_battles(user_id);
CREATE INDEX idx_processed_battles_battle_id ON processed_battles(battle_id);

-- Enable Row Level Security
ALTER TABLE tracked_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_battles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracked_friends
CREATE POLICY "Users can view their own tracked friends"
  ON tracked_friends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked friends"
  ON tracked_friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked friends"
  ON tracked_friends FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked friends"
  ON tracked_friends FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for battles
CREATE POLICY "Users can view their own battles"
  ON battles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own battles"
  ON battles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for processed_battles
CREATE POLICY "Users can view their own processed battles"
  ON processed_battles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processed battles"
  ON processed_battles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_tracked_friends_updated_at
  BEFORE UPDATE ON tracked_friends
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

