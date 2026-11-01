SET LOCAL lock_timeout = '5s';
ALTER TABLE public.history_subject_totals ADD COLUMN IF NOT EXISTS last_log_digest text
  CHECK (last_log_digest IS NULL OR last_log_digest ~ '^[0-9a-f]{64}$');
