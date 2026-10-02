# Supabase migration report — 2026-10-01

Target: the existing Clash-Royale Supabase project. Migrations 007–009 were applied on October 1, 2026, after a rollback test against the live schema.

## Live catalog findings

- Existing baseline: `public.tracked_friends`, `public.user_ratings`, `public.battles`, and `uuid-ossp` are present. `tracked_friends` has the `id`, `user_id`, and `friend_player_tag` columns required by the new history table.
- Pending feature objects: `friend_match_history`, `rivalry_shares`, `model_request_quotas`, `player_match_history`, and `consume_model_quota(text)` are absent.
- The Supabase Management API reports no migration-history entries and no available database backup for this project. Do not replay historical migrations 001–006 based on that empty history; their baseline objects already exist.

## Validation performed

- The existing local Management API token can reach the SQL write endpoint. A temporary table was created inside a transaction and rolled back.
- Migrations 007, 008, and 009 were executed in order inside one rollback transaction against the existing schema. The endpoint returned success. A subsequent read-only check confirmed the feature tables remained absent.
- Migrations 007 and 008 now wrap their statements in transactions. Migration 009 already did.
- The user chose a Supabase preview branch for staging. Branch creation was attempted with schema only and no production data, but Supabase returned HTTP 402. No branch was created. The organization must enable a plan that supports branching before this staging route can continue.

## Production application and verification

After Supabase returned HTTP 402 for preview branching, the user chose direct application to the existing project. A fresh catalog check confirmed none of the feature objects existed. Migrations 007, 008, and 009 were submitted in order inside one transaction and committed successfully (Management API HTTP 201). Their SHA-256 prefixes were `3348d0be17ccf6e1`, `ef4ba1a150e1e6b0`, and `43b4009b5af1fb45` respectively.

Read-only verification confirmed `friend_match_history`, `rivalry_shares`, `model_request_quotas`, `player_match_history`, and `consume_model_quota(text)` exist; all four tables have RLS enabled; the three intended owner-read policies exist; history tables allow authenticated SELECT; the quota table denies authenticated SELECT; and the quota function allows authenticated EXECUTE. The service role can insert into each history/share table while authenticated clients cannot. Expected history and prediction columns are present. No feature flags were enabled and no Railway or Vercel deployment was made. Signed-in end-to-end access, quota behavior, history capture, and share revocation still need integration testing once hosting credentials and a test account are available.
