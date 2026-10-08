-- Run against a migrated database. Everything is rolled back, including the
-- temporary deck summaries and match rows.
BEGIN;
DO $$
DECLARE
  v_user UUID;
  v_tag TEXT := '#TEST016' || pg_backend_pid()::TEXT;
  v_count BIGINT;
  v_key TEXT;
  v_deck JSONB := '{"cards":[{"id":1,"form":0}],"tower":1}'::JSONB;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'An existing test user is required'; END IF;

  -- One established deck and 1,000 one-off decks. The established deck must
  -- survive the cap, and the newest one-off must have room to grow.
  INSERT INTO public.history_deck_totals
    (user_id, subject_type, subject_id, deck_key, deck, match_count, first_seen, last_seen)
  VALUES (v_user, 'player', v_tag, 'established', v_deck, 500, now(), now());
  FOR i IN 1..1000 LOOP
    INSERT INTO public.history_deck_totals
      (user_id, subject_type, subject_id, deck_key, deck, match_count, first_seen, last_seen)
    VALUES (v_user, 'player', v_tag, 'oneoff-' || i, v_deck, 1, now(), now() + i * interval '1 second');
  END LOOP;
  SELECT count(*) INTO v_count FROM public.history_deck_totals
  WHERE user_id = v_user AND subject_type = 'player' AND subject_id = v_tag;
  IF v_count <> 1000 THEN RAISE EXCEPTION 'Deck summary cap failed: %', v_count; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.history_deck_totals WHERE user_id = v_user
    AND subject_type = 'player' AND subject_id = v_tag AND deck_key = 'established') THEN
    RAISE EXCEPTION 'Most-played deck was pruned';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.history_deck_totals WHERE user_id = v_user
    AND subject_type = 'player' AND subject_id = v_tag AND deck_key = 'oneoff-1000') THEN
    RAISE EXCEPTION 'New deck was pruned immediately';
  END IF;

  -- Lifetime count remains exact as full match rows come in.
  FOR i IN 1..2 LOOP
    INSERT INTO public.player_match_history
      (user_id, player_tag, physical_match_id, battle_time, mode, result, player_deck, opponent_deck)
    VALUES (v_user, v_tag, 'test-016-' || i, now() + i * interval '1 second',
      'ladder', 'win', v_deck, v_deck);
  END LOOP;
  SELECT public.history_match_count(v_user, 'player', v_tag) INTO v_count;
  IF v_count <> 2 THEN RAISE EXCEPTION 'Lifetime match count failed: %', v_count; END IF;
  SELECT count(*) INTO v_count FROM public.history_deck_totals
  WHERE user_id = v_user AND subject_type = 'player' AND subject_id = v_tag;
  IF v_count > 1000 THEN RAISE EXCEPTION 'Deck summary cap exceeded: %', v_count; END IF;
END;
$$;
ROLLBACK;
