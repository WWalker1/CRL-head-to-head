-- Keep exact lifetime match counts while bounding per-deck summaries. The 900
-- most frequent decks plus 100 recent decks allow a newly played deck to grow.
BEGIN;

CREATE TABLE public.history_subject_totals (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('player', 'friend')),
  subject_id TEXT NOT NULL,
  match_count BIGINT NOT NULL DEFAULT 0 CHECK (match_count >= 0),
  PRIMARY KEY (user_id, subject_type, subject_id)
);
ALTER TABLE public.history_subject_totals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.history_subject_totals FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.history_subject_totals TO service_role;

INSERT INTO public.history_subject_totals (user_id, subject_type, subject_id, match_count)
SELECT user_id, subject_type, subject_id, sum(match_count)::BIGINT
FROM public.history_deck_totals
GROUP BY user_id, subject_type, subject_id;

-- This trigger runs only for a new deck key, never for a repeated match.
-- Writes for one subject are serialized by capture_history_deck_and_prune.
CREATE FUNCTION public.cap_history_deck_totals() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.history_deck_totals
      WHERE user_id = NEW.user_id AND subject_type = NEW.subject_type AND subject_id = NEW.subject_id) > 1000 THEN
    WITH frequent AS (
      SELECT deck_key FROM public.history_deck_totals
      WHERE user_id = NEW.user_id AND subject_type = NEW.subject_type AND subject_id = NEW.subject_id
      ORDER BY match_count DESC, last_seen DESC, deck_key LIMIT 900
    ), recent AS (
      SELECT deck_key FROM public.history_deck_totals
      WHERE user_id = NEW.user_id AND subject_type = NEW.subject_type AND subject_id = NEW.subject_id
        AND deck_key NOT IN (SELECT deck_key FROM frequent)
      ORDER BY last_seen DESC, match_count DESC, deck_key LIMIT 100
    ), retained AS (
      SELECT deck_key FROM frequent UNION ALL SELECT deck_key FROM recent
    )
    DELETE FROM public.history_deck_totals AS totals
    WHERE totals.user_id = NEW.user_id AND totals.subject_type = NEW.subject_type
      AND totals.subject_id = NEW.subject_id
      AND totals.deck_key NOT IN (SELECT deck_key FROM retained);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.cap_history_deck_totals() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER history_deck_totals_bounded AFTER INSERT ON public.history_deck_totals
  FOR EACH ROW EXECUTE FUNCTION public.cap_history_deck_totals();

-- Migration 011's trigger already serializes inserts for each subject. Keep
-- that lock, increment the exact lifetime total, then upsert the deck summary.
CREATE OR REPLACE FUNCTION public.capture_history_deck_and_prune() RETURNS TRIGGER
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
  INSERT INTO public.history_subject_totals (user_id, subject_type, subject_id, match_count)
  VALUES (NEW.user_id, v_type, v_id, 1)
  ON CONFLICT (user_id, subject_type, subject_id) DO UPDATE
  SET match_count = public.history_subject_totals.match_count + 1;
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

CREATE OR REPLACE FUNCTION public.history_match_count(p_user_id UUID, p_subject_type TEXT, p_subject_id TEXT)
RETURNS BIGINT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT match_count FROM public.history_subject_totals
    WHERE user_id = p_user_id AND subject_type = p_subject_type AND subject_id = p_subject_id), 0)::BIGINT;
$$;

CREATE OR REPLACE FUNCTION public.delete_friend_deck_totals() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.history_deck_totals
  WHERE user_id = OLD.user_id AND subject_type = 'friend' AND subject_id = OLD.id::TEXT;
  DELETE FROM public.history_subject_totals
  WHERE user_id = OLD.user_id AND subject_type = 'friend' AND subject_id = OLD.id::TEXT;
  RETURN OLD;
END;
$$;

-- Existing subjects may already have more than 1,000 distinct decks.
WITH ranked AS (
  SELECT totals.user_id, totals.subject_type, totals.subject_id, totals.deck_key,
    row_number() OVER (PARTITION BY totals.user_id, totals.subject_type, totals.subject_id
      ORDER BY totals.match_count DESC, totals.last_seen DESC, totals.deck_key) AS frequency_rank,
    row_number() OVER (PARTITION BY totals.user_id, totals.subject_type, totals.subject_id
      ORDER BY totals.last_seen DESC, totals.match_count DESC, totals.deck_key) AS recent_rank
  FROM public.history_deck_totals AS totals
), kept AS (
  SELECT user_id, subject_type, subject_id, deck_key FROM ranked WHERE frequency_rank <= 900
  UNION
  SELECT user_id, subject_type, subject_id, deck_key FROM ranked WHERE recent_rank <= 100
)
DELETE FROM public.history_deck_totals AS totals
WHERE NOT EXISTS (SELECT 1 FROM kept WHERE user_id = totals.user_id
  AND subject_type = totals.subject_type AND subject_id = totals.subject_id AND deck_key = totals.deck_key);

COMMIT;
