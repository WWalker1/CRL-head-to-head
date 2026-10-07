-- Sum compact deck counts without transferring every unique deck to the app.
BEGIN;
CREATE FUNCTION public.history_match_count(p_user_id UUID, p_subject_type TEXT, p_subject_id TEXT)
RETURNS BIGINT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(sum(match_count), 0)::BIGINT
  FROM public.history_deck_totals
  WHERE user_id = p_user_id AND subject_type = p_subject_type AND subject_id = p_subject_id;
$$;
REVOKE ALL ON FUNCTION public.history_match_count(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.history_match_count(UUID, TEXT, TEXT) TO service_role;
COMMIT;
