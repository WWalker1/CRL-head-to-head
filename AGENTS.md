# Agent entry point

Read AGENT_HANDOFF.md first, then IMPLEMENTATION_REPORT.md for the current checklist, LOCAL_DEVELOPMENT.md to run the app, and IMPLEMENTATION_PLAN.md for the design. Research-specific guidance is in models/AGENTS.md.

The model product beta lives on codex/rival-model-product. Keep production main unchanged until integration is requested. No live database migration or deployment has been performed. Do not infer live schema from migration files. Keep secrets, player datasets, checkpoints and local environments out of Git. Never print credential values. Do not launch duplicate collectors. The user prefers concise communication and limited token usage.
