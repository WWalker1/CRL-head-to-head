# Agent entry point

Before starting repository changes, fetch the latest GitHub refs and compare the local checkout with the online branch. Use the online repository as the source of truth and incorporate newer upstream changes before implementation or release.

Read LAUNCH_HANDOFF_2026-10-07.md first for the current launch state, then AGENT_HANDOFF.md and IMPLEMENTATION_PLAN.md for detail, DEPLOYMENT_SETUP.md for hosting, and TESTING.md for verification. Research-specific guidance is in models/AGENTS.md.

The model product is live on production `main`. Public beta is deployed from the security-updated `codex/security-beta` source; the older `codex/rival-model-product` branch predates security fixes and must not be redeployed without integration. Migrations through 017 are live, Railway serves the model, and Vercel hosts beta and production. Do not infer live schema solely from migration files. Keep secrets, player datasets, checkpoints and local environments out of Git. Never print credential values. Do not launch duplicate collectors or disable the production nightly cron. The user prefers concise communication and limited token usage.
