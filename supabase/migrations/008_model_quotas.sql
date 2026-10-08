-- Durable per-user quota shared across Vercel instances; never trust caller-supplied user IDs.
BEGIN;
CREATE TABLE IF NOT EXISTS public.model_request_quotas (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('predict', 'search')),
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL,
  PRIMARY KEY (user_id, operation)
);
ALTER TABLE public.model_request_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.model_request_quotas FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_model_quota(operation text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  caller uuid := auth.uid();
  bucket timestamptz := date_trunc('minute', now());
  used integer;
  cap integer;
BEGIN
  IF caller IS NULL OR operation IS NULL OR operation NOT IN ('predict', 'search') THEN
    RETURN false;
  END IF;
  cap := CASE WHEN operation = 'predict' THEN 120 ELSE 12 END;
  INSERT INTO public.model_request_quotas AS q (user_id, operation, window_start, request_count)
    VALUES (caller, operation, bucket, 1)
  ON CONFLICT ON CONSTRAINT model_request_quotas_pkey DO UPDATE SET
    request_count = CASE WHEN q.window_start = bucket THEN LEAST(q.request_count + 1, 1000000) ELSE 1 END,
    window_start = bucket
  RETURNING request_count INTO used;
  RETURN used <= cap;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_model_quota(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_model_quota(text) TO authenticated;
COMMIT;
