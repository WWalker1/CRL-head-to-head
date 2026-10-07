-- Keep at most 100 full games per owner/tag or tracked friend. Preserve only
-- compact per-deck totals for older games; counts begin when tracking starts.
BEGIN;

CREATE TABLE public.history_deck_totals (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('player', 'friend')),
  subject_id TEXT NOT NULL,
  deck_key TEXT NOT NULL,
  deck JSONB NOT NULL,
  match_count BIGINT NOT NULL DEFAULT 0 CHECK (match_count >= 0),
  first_seen TIMESTAMPTZ NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, subject_type, subject_id, deck_key)
);
CREATE INDEX history_deck_top ON public.history_deck_totals
  (user_id, subject_type, subject_id, match_count DESC);
ALTER TABLE public.history_deck_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own deck totals" ON public.history_deck_totals
  FOR SELECT USING (auth.uid() = user_id);
GRANT SELECT ON public.history_deck_totals TO authenticated;
REVOKE ALL ON public.history_deck_totals FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.history_deck_totals FROM authenticated;
GRANT ALL ON public.history_deck_totals TO service_role;

CREATE FUNCTION public.history_deck_key(p_deck JSONB) RETURNS TEXT
LANGUAGE SQL IMMUTABLE SET search_path = public AS $$
  SELECT md5(jsonb_build_object(
    'cards', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', card->>'id', 'form', card->>'form')
      ORDER BY card->>'id', card->>'form') FROM jsonb_array_elements(p_deck->'cards') AS card), '[]'::jsonb),
    'tower', p_deck->>'tower'
  )::text);
$$;
REVOKE ALL ON FUNCTION public.history_deck_key(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.history_deck_key(JSONB) TO service_role;

-- Seed counters from any rows already collected before this migration.
INSERT INTO public.history_deck_totals (user_id, subject_type, subject_id, deck_key, deck, match_count, first_seen, last_seen)
SELECT user_id, 'player', player_tag, public.history_deck_key(player_deck),
       (array_agg(player_deck ORDER BY battle_time DESC))[1], count(*), min(battle_time), max(battle_time)
FROM public.player_match_history
GROUP BY user_id, player_tag, public.history_deck_key(player_deck);
INSERT INTO public.history_deck_totals (user_id, subject_type, subject_id, deck_key, deck, match_count, first_seen, last_seen)
SELECT user_id, 'friend', tracked_friend_id::TEXT, public.history_deck_key(friend_deck),
       (array_agg(friend_deck ORDER BY battle_time DESC))[1], count(*), min(battle_time), max(battle_time)
FROM public.friend_match_history
GROUP BY user_id, tracked_friend_id, public.history_deck_key(friend_deck);

CREATE FUNCTION public.capture_history_deck_and_prune() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type TEXT;
  v_id TEXT;
  v_deck JSONB;
BEGIN
  IF TG_TABLE_NAME = 'player_match_history' THEN
    v_type := 'player'; v_id := NEW.player_tag; v_deck := NEW.player_deck;
  ELSE
    v_type := 'friend'; v_id := NEW.tracked_friend_id::TEXT; v_deck := NEW.friend_deck;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::TEXT || ':' || v_type || ':' || v_id, 0));
  INSERT INTO public.history_deck_totals (user_id, subject_type, subject_id, deck_key, deck, match_count, first_seen, last_seen)
  VALUES (NEW.user_id, v_type, v_id, public.history_deck_key(v_deck), v_deck, 1, NEW.battle_time, NEW.battle_time)
  ON CONFLICT (user_id, subject_type, subject_id, deck_key) DO UPDATE
  SET match_count = public.history_deck_totals.match_count + 1,
      deck = CASE WHEN EXCLUDED.last_seen >= public.history_deck_totals.last_seen THEN EXCLUDED.deck ELSE public.history_deck_totals.deck END,
      first_seen = LEAST(public.history_deck_totals.first_seen, EXCLUDED.first_seen),
      last_seen = GREATEST(public.history_deck_totals.last_seen, EXCLUDED.last_seen);
  IF v_type = 'player' THEN
    DELETE FROM public.player_match_history WHERE id IN (
      SELECT id FROM public.player_match_history
      WHERE user_id = NEW.user_id AND player_tag = NEW.player_tag
      ORDER BY battle_time DESC, id DESC OFFSET 100
    );
  ELSE
    DELETE FROM public.friend_match_history WHERE id IN (
      SELECT id FROM public.friend_match_history
      WHERE tracked_friend_id = NEW.tracked_friend_id
      ORDER BY battle_time DESC, id DESC OFFSET 100
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_history_deck_and_prune() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER player_history_bounded AFTER INSERT ON public.player_match_history
  FOR EACH ROW EXECUTE FUNCTION public.capture_history_deck_and_prune();
CREATE TRIGGER friend_history_bounded AFTER INSERT ON public.friend_match_history
  FOR EACH ROW EXECUTE FUNCTION public.capture_history_deck_and_prune();

CREATE FUNCTION public.delete_friend_deck_totals() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.history_deck_totals
  WHERE user_id = OLD.user_id AND subject_type = 'friend' AND subject_id = OLD.id::TEXT;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_friend_deck_totals() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER delete_friend_deck_totals AFTER DELETE ON public.tracked_friends
  FOR EACH ROW EXECUTE FUNCTION public.delete_friend_deck_totals();

DELETE FROM public.player_match_history WHERE id IN (
  SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY user_id, player_tag ORDER BY battle_time DESC, id DESC) AS rn
    FROM public.player_match_history) ranked WHERE rn > 100
);
DELETE FROM public.friend_match_history WHERE id IN (
  SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY tracked_friend_id ORDER BY battle_time DESC, id DESC) AS rn
    FROM public.friend_match_history) ranked WHERE rn > 100
);
COMMIT;
