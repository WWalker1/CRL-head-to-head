# Agent entry point

Read LAUNCH_HANDOFF_2026-10-07.md first for the current launch state, then AGENT_HANDOFF.md and IMPLEMENTATION_PLAN.md for detail, DEPLOYMENT_SETUP.md for hosting, and TESTING.md for verification. Research-specific guidance is in models/AGENTS.md.

The model product beta lives on codex/rival-model-product and beta.rival-royale.com. Production is on main; the user requested promotion after the October 7 launch gate passes. Migrations 007–012 are live, Railway serves the model, and Vercel hosts beta and production. Do not infer live schema solely from migration files. Keep secrets, player datasets, checkpoints and local environments out of Git. Never print credential values. Do not launch duplicate collectors or disable the production nightly cron. The user prefers concise communication and limited token usage.
