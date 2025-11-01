-- Function to increment win counter for a friend
CREATE OR REPLACE FUNCTION increment_win(
  p_user_id UUID,
  p_friend_tag TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE tracked_friends
  SET total_wins = total_wins + 1
  WHERE user_id = p_user_id 
    AND friend_player_tag = p_friend_tag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment loss counter for a friend
CREATE OR REPLACE FUNCTION increment_loss(
  p_user_id UUID,
  p_friend_tag TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE tracked_friends
  SET total_losses = total_losses + 1
  WHERE user_id = p_user_id 
    AND friend_player_tag = p_friend_tag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

