-- Run with migration 017 in a transaction and roll back. No player records
-- are read or changed; quota subjects are synthetic UUIDs and digests.
DO $$
DECLARE
  subject uuid := gen_random_uuid();
  result jsonb;
  first_lease uuid;
BEGIN
  IF has_function_privilege('anon', 'public.increment_win(uuid,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.increment_loss(uuid,text)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.acquire_game_api_budget(uuid,text,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.release_game_api_budget(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Untrusted RPC execution remains possible';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.increment_win(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Trusted sync RPC access was removed';
  END IF;
  IF has_column_privilege('authenticated','public.tracked_friends','total_wins','UPDATE')
    OR has_column_privilege('authenticated','public.tracked_friends','total_losses','INSERT')
    OR has_column_privilege('authenticated','public.user_ratings','elo_rating','UPDATE')
    OR has_table_privilege('authenticated','public.battles','INSERT') THEN
    RAISE EXCEPTION 'Authoritative client writes remain possible';
  END IF;
  IF NOT has_table_privilege('authenticated','public.tracked_friends','SELECT')
    OR NOT has_table_privilege('authenticated','public.user_ratings','SELECT') THEN
    RAISE EXCEPTION 'Dashboard reads were removed';
  END IF;

  result := public.acquire_game_api_budget(subject, repeat('a',64), 'sync');
  IF NOT (result->>'allowed')::boolean THEN RAISE EXCEPTION 'First reservation rejected'; END IF;
  first_lease := (result->>'lease_id')::uuid;
  result := public.acquire_game_api_budget(subject, repeat('b',64), 'friend_refresh');
  IF (result->>'allowed')::boolean THEN RAISE EXCEPTION 'Concurrent cross-endpoint refresh allowed'; END IF;
  PERFORM public.release_game_api_budget(subject, gen_random_uuid());
  IF NOT EXISTS (SELECT 1 FROM public.game_api_budgets WHERE bucket_key = 'user:'||subject::text AND lease_id = first_lease) THEN
    RAISE EXCEPTION 'Wrong token released another request';
  END IF;
  PERFORM public.release_game_api_budget(subject, first_lease);
  result := public.acquire_game_api_budget(subject, repeat('a',64), 'sync');
  IF (result->>'allowed')::boolean THEN RAISE EXCEPTION 'Release bypassed cooldown'; END IF;

  UPDATE public.game_api_budgets SET next_allowed_at = '-infinity', day_count = 320
    WHERE bucket_key = 'user:'||subject::text;
  result := public.acquire_game_api_budget(subject, repeat('c',64), 'sync');
  IF (result->>'allowed')::boolean THEN RAISE EXCEPTION 'Changed address bypassed account daily cap'; END IF;

  UPDATE public.game_api_budgets SET minute_count = 120, minute_start = date_trunc('minute', clock_timestamp()) WHERE bucket_key = 'global';
  result := public.acquire_game_api_budget(gen_random_uuid(), repeat('d',64), 'sync');
  IF (result->>'allowed')::boolean THEN RAISE EXCEPTION 'Global minute cap bypassed'; END IF;
  UPDATE public.game_api_budgets SET minute_count = 0, day_count = 10000 WHERE bucket_key = 'global';
  result := public.acquire_game_api_budget(NULL, repeat('e',64), 'validate');
  IF (result->>'allowed')::boolean THEN RAISE EXCEPTION 'Validation bypassed global daily cap'; END IF;

  UPDATE public.game_api_budgets SET day_count = 0 WHERE bucket_key = 'global';
  INSERT INTO public.game_api_budgets(bucket_key, day_start, minute_start, day_count)
    VALUES ('address:'||repeat('f',64), date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', date_trunc('minute', now()), 640);
  result := public.acquire_game_api_budget(gen_random_uuid(), repeat('f',64), 'add_friend');
  IF (result->>'allowed')::boolean THEN RAISE EXCEPTION 'New account bypassed address daily cap'; END IF;

  UPDATE public.game_api_budgets SET day_start = day_start - interval '1 day', minute_start = minute_start - interval '1 minute', next_allowed_at = '-infinity', lease_until = '-infinity';
  result := public.acquire_game_api_budget(subject, repeat('a',64), 'sync');
  IF NOT (result->>'allowed')::boolean THEN RAISE EXCEPTION 'Expired window did not reset'; END IF;
END;
$$;
