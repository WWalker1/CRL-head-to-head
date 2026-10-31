---
name: rival-royale-access
description: Bootstrap access and project context for Rival Royale. Use when starting or resuming work in WWalker1/CRL-head-to-head, checking service connections, running previews, or preparing database and hosting operations.
---

# Rival Royale access

## Load current context

Locate `WWalker1/CRL-head-to-head` through the workspace or GitHub. The owner's Windows checkout is `C:/Users/22wes/Programming Projects/head-to-head-royale`.

Read repository AGENTS.md, then LAUNCH_HANDOFF_2026-10-07.md first among handoffs. For unpublished work read docs/MORNING_BRIEF_2026-10-22.md and DEV_ROLLOUT_2026-10-21.md. Use AGENT_HANDOFF.md, IMPLEMENTATION_PLAN.md, DEPLOYMENT_SETUP.md, TESTING.md, and LOCAL_DEVELOPMENT.md for detail. Read models/AGENTS.md before research changes. Newer verified evidence supersedes dated status paragraphs.

Check git status, fetch upstream, and compare local HEAD with the online target before implementation. If fetch fails, disclose the failure and verify online HEAD through the connector; cached origin refs are insufficient. Preserve unpublished Windows changes. Recover and reconcile the separate unpublished cloud cron commit `0ee0a4cd238e421cb55a81f68ab180bac7e43b18` on `codex/morning-bounded-cron-20261022` before a dev release. Fresh clones contain neither unpublished change set.

## Establish access

Read [references/access-map.md](references/access-map.md) for resource identities, verified connection evidence, and recovery steps. Recheck connections needed by the task with harmless reads. Installed tools and account push metadata do not prove actual operations work.

Filter available tool names and short descriptions by relevant provider, then inspect selected schemas. Avoid dumping the tool registry. Prefer existing connectors when sufficient; load provider skills for their operations. Use existing OAuth connections and ignored local environments. Never print credential values or full hosting-variable responses, or copy secrets into this skill or Git.

The owner explicitly requested autonomous project work and Allow all actions on October 24, 2026. GitHub, Vercel, Supabase, Railway, and Linear app overrides were successfully set to full_access. Reuse existing authorization for project access setup and already-authorized work without repeated permission questions. These app settings are account-wide. Technical capability does not expand a future task's scope; preserve specific release gates and current session restrictions.

Distinguish ChatGPT app permissions, provider OAuth scopes, service credentials, host filesystem/network restrictions, and browser consent. A skill supplies context and routing, not credentials or an OAuth grant. Diagnose the failing layer. Do not route around an approval rejection. Resolve GitHub integration grants, reconnect expired Railway OAuth, and use Vercel team authorization for team-scope denial.

## Local previews and verification

Inspect the current launcher and LOCAL_DEVELOPMENT.md. Use `scripts/start-web-preview.ps1` for web preview at `http://127.0.0.1:3100/guides`; add `-EnablePublicLookup` only for that flow. Configured backend services and shared quotas still apply locally; a local URL does not mean an isolated database. Use a development database or disposable tester records for mutation checks. Do not start a duplicate server on an occupied port or share Next.js output concurrently.

Use `scripts/start-model-preview.ps1` for model-only preview after inspecting its current options. Local research Python is `models/.venv/Scripts/python.exe`. Preserve existing ignored environments/artifacts and do not start collectors to test inference. Stop temporary servers started by the task. Verify HTTP/browser behavior; a Ready message alone is not a working-preview result.

Run checks proportional to actual changes. Application release gates include Jest, TypeScript, lint, production build, relevant model tests, and signed-in/mobile flows from TESTING.md. Historical counts do not establish a current pass.

## Live invariants and completion

Keep production on main and its `/api/cron/sync-all-users` schedule at `0 2 * * *`. Keep beta free of duplicate crons; its reviewed source is codex/security-beta, not the older codex/rival-model-product. Verify deployed SHA and environment before releasing. Beta and production share the existing Supabase project.

Inspect live schema and privileges before migrations; files alone are not live evidence. Migrations through 017 were previously applied. Preserve latest-100 full histories per tracked subject and lifetime aggregates independently of pruning. Keep separate research ingestion paused. Never publish player datasets, checkpoints, local environments, or secrets.

Report access layers and blockers precisely. Distinguish permission updates, successful reads, verified writes, queued deployments, and verified releases. Sync the skill through Git; if blocked, preserve files and explicitly state that publication/installation did not complete. Repository AGENTS.md can route agents to a local skill without claiming global installation.
