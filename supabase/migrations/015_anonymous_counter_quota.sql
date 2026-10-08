-- Three anonymous counter searches per UTC day and address digest.
-- Apply after 013; callers cannot supply a user ID or access quota rows.
BEGIN;
CREATE TABLE IF NOT EXISTS public.anonymous_counter_quotas (
  address_digest text PRIMARY KEY CHECK (address_digest ~ '^[0-9a-f]{64}$'),
  utc_day date NOT NULL,
  request_count integer NOT NULL
);
ALTER TABLE public.anonymous_counter_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anonymous_counter_quotas FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS anonymous_counter_quotas_expiry_idx ON public.anonymous_counter_quotas (utc_day);

CREATE OR REPLACE FUNCTION public.consume_anonymous_counter_quota(address_digest text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  today date := (now() AT TIME ZONE 'UTC')::date;
  used integer;
BEGIN
  IF address_digest IS NULL OR address_digest !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;
  DELETE FROM public.anonymous_counter_quotas WHERE utc_day < today - 1;
  INSERT INTO public.anonymous_counter_quotas AS q (address_digest, utc_day, request_count)
    VALUES (address_digest, today, 1)
  ON CONFLICT ON CONSTRAINT anonymous_counter_quotas_pkey DO UPDATE SET
    request_count = CASE WHEN q.utc_day = today THEN LEAST(q.request_count + 1, 1000000) ELSE 1 END,
    utc_day = today
  RETURNING request_count INTO used;
  RETURN used <= 3;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_anonymous_counter_quota(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_anonymous_counter_quota(text) TO service_role;
COMMIT;
