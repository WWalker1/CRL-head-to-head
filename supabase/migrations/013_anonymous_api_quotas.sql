-- Shared public API limits. The application submits only a keyed address digest.
BEGIN;
CREATE TABLE IF NOT EXISTS public.anonymous_api_quotas (
  address_digest text NOT NULL CHECK (address_digest ~ '^[0-9a-f]{64}$'),
  operation text NOT NULL CHECK (operation IN ('model_read', 'player_validation')),
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL,
  PRIMARY KEY (address_digest, operation)
);
ALTER TABLE public.anonymous_api_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anonymous_api_quotas FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS anonymous_api_quotas_expiry_idx ON public.anonymous_api_quotas (window_start);

CREATE OR REPLACE FUNCTION public.consume_anonymous_api_quota(operation text, address_digest text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  bucket timestamptz := date_trunc('minute', now());
  used integer;
  cap integer;
BEGIN
  IF operation NOT IN ('model_read', 'player_validation')
    OR address_digest !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;
  cap := CASE WHEN operation = 'model_read' THEN 60 ELSE 10 END;
  DELETE FROM public.anonymous_api_quotas WHERE window_start < now() - interval '1 day';
  INSERT INTO public.anonymous_api_quotas AS q (address_digest, operation, window_start, request_count)
    VALUES (address_digest, operation, bucket, 1)
  ON CONFLICT ON CONSTRAINT anonymous_api_quotas_pkey DO UPDATE SET
    request_count = CASE WHEN q.window_start = bucket THEN LEAST(q.request_count + 1, 1000000) ELSE 1 END,
    window_start = bucket
  RETURNING request_count INTO used;
  RETURN used <= cap;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_anonymous_api_quota(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_anonymous_api_quota(text, text) TO service_role;
COMMIT;
