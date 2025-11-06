-- First, remove any duplicate battles (keep the most recent one based on created_at)
-- This prevents the unique constraint from failing if duplicates exist
-- Only runs if the constraint doesn't already exist
DO $$
BEGIN
  -- Remove duplicates if constraint doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_battle_time_type'
  ) THEN
    DELETE FROM battles
    WHERE id NOT IN (
      SELECT DISTINCT ON (user_id, battle_time, battle_type) id
      FROM battles
      ORDER BY user_id, battle_time, battle_type, created_at DESC
    );
  END IF;
END $$;

-- Add unique constraint to battles table to prevent duplicates
-- This replaces the need for the processed_battles table
-- Only adds if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_battle_time_type'
  ) THEN
    ALTER TABLE battles
    ADD CONSTRAINT unique_user_battle_time_type UNIQUE (user_id, battle_time, battle_type);
  END IF;
END $$;

-- Drop indexes related to processed_battles
DROP INDEX IF EXISTS idx_processed_battles_user_id;
DROP INDEX IF EXISTS idx_processed_battles_battle_id;

-- Drop RLS policies for processed_battles
DROP POLICY IF EXISTS "Users can view their own processed battles" ON processed_battles;
DROP POLICY IF EXISTS "Users can insert their own processed battles" ON processed_battles;

-- Drop the processed_battles table
DROP TABLE IF EXISTS processed_battles;

-- Remove the processed column from battles table as it's now redundant
-- (existence in the table means it's processed)
ALTER TABLE battles
DROP COLUMN IF EXISTS processed;

