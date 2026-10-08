BEGIN;

-- Only trusted sync workers may change authoritative counters.
CREATE OR REPLACE FUNCTION public.increment_win(p_user_id uuid, p_friend_tag text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.tracked_friends SET total_wins = total_wins + 1
  WHERE user_id = p_user_id AND friend_player_tag = p_friend_tag;
$$;
CREATE OR REPLACE FUNCTION public.increment_loss(p_user_id uuid, p_friend_tag text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.tracked_friends SET total_losses = total_losses + 1
  WHERE user_id = p_user_id AND friend_player_tag = p_friend_tag;
$$;
REVOKE ALL ON FUNCTION public.increment_win(uuid, text), public.increment_loss(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_win(uuid, text), public.increment_loss(uuid, text) TO service_role;

REVOKE ALL ON public.tracked_friends, public.user_ratings, public.battles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tracked_friends, public.user_ratings, public.battles TO authenticated;
GRANT ALL ON public.tracked_friends, public.user_ratings, public.battles TO service_role;

-- Budgets count reserved upstream log/profile calls. A full sync reserves its
-- maximum 16 calls before starting, including the owner's 15 tracked friends.
CREATE TABLE public.game_api_budgets (
  bucket_key text PRIMARY KEY,
  day_start timestamptz NOT NULL,
  day_count integer NOT NULL DEFAULT 0,
  minute_start timestamptz NOT NULL,
  minute_count integer NOT NULL DEFAULT 0,
  next_allowed_at timestamptz NOT NULL DEFAULT '-infinity',
  lease_id uuid,
  lease_until timestamptz NOT NULL DEFAULT '-infinity'
);
ALTER TABLE public.game_api_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_api_budgets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.game_api_budgets TO service_role;
CREATE INDEX game_api_budgets_expiry_idx ON public.game_api_budgets(day_start);

CREATE FUNCTION public.acquire_game_api_budget(p_user_id uuid, p_address_digest text, p_operation text)
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
    daily_cap := CASE WHEN key = 'global' THEN 10000 WHEN key LIKE 'user:%' THEN 320 ELSE 640 END;
    minute_cap := CASE WHEN key = 'global' THEN 120 ELSE 60 END;
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
      IF row_budget.next_allowed_at > stamp THEN
        wait_seconds := GREATEST(wait_seconds, ceil(extract(epoch FROM row_budget.next_allowed_at - stamp))::integer);
      END IF;
    END IF;
  END LOOP;
  IF wait_seconds > 0 THEN RETURN jsonb_build_object('allowed', false, 'retry_after', wait_seconds); END IF;
  FOREACH key IN ARRAY keys LOOP
    UPDATE public.game_api_budgets SET
      day_count = CASE WHEN day_start = day_bucket THEN day_count + cost ELSE cost END,
      minute_count = CASE WHEN minute_start = minute_bucket THEN minute_count + cost ELSE cost END,
      day_start = day_bucket, minute_start = minute_bucket,
      next_allowed_at = CASE WHEN key LIKE 'user:%' THEN stamp + CASE WHEN p_operation IN ('sync', 'friend_refresh') THEN interval '60 seconds' ELSE interval '2 seconds' END ELSE next_allowed_at END,
      lease_id = CASE WHEN key LIKE 'user:%' THEN new_lease ELSE lease_id END,
      lease_until = CASE WHEN key LIKE 'user:%' THEN stamp + interval '5 minutes' ELSE lease_until END
    WHERE bucket_key = key;
  END LOOP;
  DELETE FROM public.game_api_budgets WHERE day_start < day_bucket - interval '1 day' AND lease_until < stamp;
  RETURN jsonb_build_object('allowed', true, 'lease_id', CASE WHEN p_user_id IS NULL THEN NULL ELSE new_lease END);
END;
$$;

CREATE FUNCTION public.release_game_api_budget(p_user_id uuid, p_lease_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.game_api_budgets SET lease_id = NULL, lease_until = '-infinity'
  WHERE bucket_key = 'user:' || p_user_id::text AND lease_id = p_lease_id;
$$;
REVOKE ALL ON FUNCTION public.acquire_game_api_budget(uuid, text, text), public.release_game_api_budget(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_game_api_budget(uuid, text, text), public.release_game_api_budget(uuid, uuid) TO service_role;
COMMIT;
