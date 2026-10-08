-- Serialize inserts per owner so concurrent requests cannot exceed the limit.
BEGIN;
CREATE OR REPLACE FUNCTION public.enforce_tracked_friend_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 20261006));
  IF (SELECT count(*) FROM public.tracked_friends WHERE user_id = NEW.user_id) >= 15 THEN
    RAISE EXCEPTION 'Tracked friend limit reached'
      USING ERRCODE = '23514', CONSTRAINT = 'tracked_friends_limit_15';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tracked_friend_limit ON public.tracked_friends;
CREATE TRIGGER enforce_tracked_friend_limit
BEFORE INSERT ON public.tracked_friends
FOR EACH ROW EXECUTE FUNCTION public.enforce_tracked_friend_limit();
COMMIT;
