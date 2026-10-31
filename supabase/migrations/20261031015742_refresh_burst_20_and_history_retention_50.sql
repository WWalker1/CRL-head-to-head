-- Twenty completed account operations per minute; overlapping work still holds a lease.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.game_api_budgets ADD COLUMN IF NOT EXISTS minute_requests integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.acquire_game_api_budget(p_user_id uuid, p_address_digest text, p_operation text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  stamp timestamptz := clock_timestamp();
  day_bucket timestamptz := date_trunc('day', stamp AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  minute_bucket timestamptz := date_trunc('minute', stamp);
  keys text[];
  key text;
  row_budget public.game_api_budgets%ROWTYPE;
  cost integer;
  daily_cap integer;
  minute_cap integer;
  wait_seconds integer := 0;
  new_lease uuid := gen_random_uuid();
BEGIN
  IF p_operation IS NULL OR p_operation NOT IN ('sync', 'friend_refresh', 'add_friend', 'validate')
     OR p_address_digest IS NULL OR p_address_digest !~ '^[0-9a-f]{64}$'
     OR (p_user_id IS NULL AND p_operation <> 'validate') THEN
    RAISE EXCEPTION 'Invalid budget request';
  END IF;
  cost := CASE WHEN p_operation = 'sync' THEN 16 ELSE 1 END;
  keys := ARRAY['global', 'address:' || p_address_digest];
  IF p_user_id IS NOT NULL THEN keys := array_append(keys, 'user:' || p_user_id::text); END IF;

  -- Always lock the global row first. Checking and reserving every dimension
  -- in one transaction prevents parallel instances from exceeding the caps.
  FOREACH key IN ARRAY keys LOOP
    INSERT INTO public.game_api_budgets(bucket_key, day_start, minute_start)
      VALUES (key, day_bucket, minute_bucket) ON CONFLICT DO NOTHING;
    SELECT * INTO row_budget FROM public.game_api_budgets WHERE bucket_key = key FOR UPDATE;
    daily_cap := CASE WHEN key = 'global' THEN 10000 WHEN key LIKE 'user:%' THEN 3200 ELSE 6400 END;
    minute_cap := CASE WHEN key = 'global' THEN 1920 WHEN p_user_id IS NULL THEN 60 WHEN key LIKE 'user:%' THEN 320 ELSE 640 END;
    IF row_budget.day_start = day_bucket AND row_budget.day_count + cost > daily_cap THEN
      wait_seconds := GREATEST(wait_seconds, ceil(extract(epoch FROM day_bucket + interval '1 day' - stamp))::integer);
    END IF;
    IF row_budget.minute_start = minute_bucket AND row_budget.minute_count + cost > minute_cap THEN
      wait_seconds := GREATEST(wait_seconds, ceil(extract(epoch FROM minute_bucket + interval '1 minute' - stamp))::integer);
    END IF;
    IF key LIKE 'user:%' THEN
      IF row_budget.lease_until > stamp THEN
        wait_seconds := GREATEST(wait_seconds, ceil(extract(epoch FROM row_budget.lease_until - stamp))::integer);
      END IF;
      IF row_budget.minute_start = minute_bucket AND row_budget.minute_requests >= 20 THEN
        wait_seconds := GREATEST(wait_seconds, ceil(extract(epoch FROM minute_bucket + interval '1 minute' - stamp))::integer);
      END IF;
    END IF;
  END LOOP;
  IF wait_seconds > 0 THEN RETURN jsonb_build_object('allowed', false, 'retry_after', wait_seconds); END IF;
  FOREACH key IN ARRAY keys LOOP
    UPDATE public.game_api_budgets SET
      day_count = CASE WHEN day_start = day_bucket THEN day_count + cost ELSE cost END,
      minute_count = CASE WHEN minute_start = minute_bucket THEN minute_count + cost ELSE cost END,
      day_start = day_bucket, minute_start = minute_bucket,
      minute_requests = CASE WHEN minute_start = minute_bucket THEN minute_requests + 1 ELSE 1 END,
      next_allowed_at = CASE WHEN key LIKE 'user:%' THEN stamp ELSE next_allowed_at END,
      lease_id = CASE WHEN key LIKE 'user:%' THEN new_lease ELSE lease_id END,
      lease_until = CASE WHEN key LIKE 'user:%' THEN stamp + interval '5 minutes' ELSE lease_until END
    WHERE bucket_key = key;
  END LOOP;
  DELETE FROM public.game_api_budgets WHERE day_start < day_bucket - interval '1 day' AND lease_until < stamp;
  RETURN jsonb_build_object('allowed', true, 'lease_id', CASE WHEN p_user_id IS NULL THEN NULL ELSE new_lease END);
END;
$$;



-- Reviewed October 31, 2026. Preserve all lifetime aggregates.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
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
      ORDER BY battle_time DESC, id DESC OFFSET 50
    );
  ELSE
    DELETE FROM public.friend_match_history WHERE id IN (
      SELECT id FROM public.friend_match_history
      WHERE tracked_friend_id = NEW.tracked_friend_id
      ORDER BY battle_time DESC, id DESC OFFSET 50
    );
  END IF;
  RETURN NEW;
END;
$$;


WITH ranked AS (
 SELECT id,row_number() OVER (PARTITION BY user_id,player_tag ORDER BY battle_time DESC,id DESC) rn FROM public.player_match_history
) DELETE FROM public.player_match_history h USING ranked r WHERE h.id=r.id AND r.rn>50;
WITH ranked AS (
 SELECT id,row_number() OVER (PARTITION BY tracked_friend_id ORDER BY battle_time DESC,id DESC) rn FROM public.friend_match_history
) DELETE FROM public.friend_match_history h USING ranked r WHERE h.id=r.id AND r.rn>50;


