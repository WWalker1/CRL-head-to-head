-- Run with the proposed function definitions inside BEGIN / ROLLBACK.
DO $$
DECLARE
  subject uuid := gen_random_uuid();
  result jsonb;
  lease uuid;
  owner uuid;
  friend uuid;
  tag text := '#RETENTION_TEST_' || pg_backend_pid();
  deck jsonb := '{"cards":[{"id":1,"form":0}],"tower":1}';
BEGIN
  -- Synthetic quotas only; all changes, including the global row, roll back.
  UPDATE public.game_api_budgets SET day_count=0, minute_count=0, minute_requests=0
    WHERE bucket_key='global';
  FOR i IN 1..20 LOOP
    result := public.acquire_game_api_budget(subject,repeat('a',64),'sync');
    IF NOT (result->>'allowed')::boolean THEN RAISE EXCEPTION 'Sync % rejected before 20',i; END IF;
    lease := (result->>'lease_id')::uuid;
    IF i=1 THEN
      result := public.acquire_game_api_budget(subject,repeat('b',64),'friend_refresh');
      IF (result->>'allowed')::boolean THEN RAISE EXCEPTION 'Concurrent refresh admitted'; END IF;
      PERFORM public.release_game_api_budget(subject,gen_random_uuid());
      IF NOT EXISTS(SELECT 1 FROM public.game_api_budgets WHERE bucket_key='user:'||subject AND lease_id=lease) THEN
        RAISE EXCEPTION 'Wrong lease released active sync';
      END IF;
    END IF;
    PERFORM public.release_game_api_budget(subject,lease);
  END LOOP;
  result := public.acquire_game_api_budget(subject,repeat('b',64),'friend_refresh');
  IF (result->>'allowed')::boolean THEN RAISE EXCEPTION '21st operation admitted through alternate endpoint/address'; END IF;
  IF (result->>'retry_after')::integer NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Wrong retry window'; END IF;
  UPDATE public.game_api_budgets SET minute_start=minute_start-interval '1 minute' WHERE bucket_key='user:'||subject;
  result := public.acquire_game_api_budget(subject,repeat('a',64),'sync');
  IF NOT (result->>'allowed')::boolean THEN RAISE EXCEPTION 'New minute did not reset'; END IF;
  PERFORM public.release_game_api_budget(subject,(result->>'lease_id')::uuid);
  UPDATE public.game_api_budgets SET day_count=3200 WHERE bucket_key='user:'||subject;
  result := public.acquire_game_api_budget(subject,repeat('c',64),'sync');
  IF (result->>'allowed')::boolean THEN RAISE EXCEPTION 'Daily account budget bypassed'; END IF;
  UPDATE public.game_api_budgets SET day_count=10000 WHERE bucket_key='global';
  result := public.acquire_game_api_budget(NULL,repeat('d',64),'validate');
  IF (result->>'allowed')::boolean THEN RAISE EXCEPTION 'Global daily budget bypassed'; END IF;
  IF has_function_privilege('anon','public.acquire_game_api_budget(uuid,text,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.acquire_game_api_budget(uuid,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Public budget mutation allowed';
  END IF;

  SELECT u.id INTO owner FROM auth.users u WHERE
    (SELECT count(*) FROM public.tracked_friends f WHERE f.user_id=u.id)<15 LIMIT 1;
  IF owner IS NULL THEN RAISE EXCEPTION 'No fixture owner available'; END IF;
  INSERT INTO public.tracked_friends(user_id,friend_player_tag,friend_name,total_wins,total_losses)
    VALUES(owner,tag,'Rollback fixture',7,3) RETURNING id INTO friend;
  FOR i IN 1..65 LOOP
    INSERT INTO public.player_match_history(user_id,player_tag,physical_match_id,battle_time,mode,result,player_deck,opponent_deck)
      VALUES(owner,tag,tag||i,now()+i*interval '1 second','ladder','win',deck,deck);
    INSERT INTO public.friend_match_history(user_id,tracked_friend_id,physical_match_id,battle_time,mode,friend_result,friend_deck,opponent_deck)
      VALUES(owner,friend,tag||i,now()+i*interval '1 second','ladder','win',deck,deck);
  END LOOP;
  IF (SELECT count(*) FROM public.player_match_history WHERE user_id=owner AND player_tag=tag)<>50
    OR (SELECT count(*) FROM public.friend_match_history WHERE tracked_friend_id=friend)<>50 THEN
    RAISE EXCEPTION 'History did not cap at 50';
  END IF;
  IF EXISTS(SELECT 1 FROM public.player_match_history WHERE user_id=owner AND player_tag=tag AND physical_match_id=tag||'15')
    OR NOT EXISTS(SELECT 1 FROM public.player_match_history WHERE user_id=owner AND player_tag=tag AND physical_match_id=tag||'16') THEN
    RAISE EXCEPTION 'Wrong end of history pruned';
  END IF;
  IF public.history_match_count(owner,'player',tag)<>65 OR public.history_match_count(owner,'friend',friend::text)<>65 THEN
    RAISE EXCEPTION 'Lifetime count lost on pruning';
  END IF;
  IF (SELECT sum(match_count) FROM public.history_deck_totals WHERE user_id=owner AND subject_id IN(tag,friend::text))<>130 THEN
    RAISE EXCEPTION 'Deck totals lost on pruning';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.tracked_friends WHERE id=friend AND total_wins=7 AND total_losses=3) THEN
    RAISE EXCEPTION 'Friend win/loss totals changed';
  END IF;
END;
$$;
