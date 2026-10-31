# Access map

Checked October 24, 2026 (America/Chicago). Revalidate task-relevant state.

| Resource | Identity | Verified access |
| --- | --- | --- |
| GitHub | WWalker1/CRL-head-to-head; repository ID 1086226680; login WWalker1 | Reads work. Online main c48fffba8f06b5c18956a2448f19d12e73a3697c matches local HEAD. Branch creation returns 403 Resource not accessible by integration despite account push/admin metadata. |
| Vercel | Team team_fABzweylokMn6qTACcenQB8h; slug wwrens-projects-9530f2aa; projects crl-head-to-head and rival-royale-beta | Scoped project list returns 403 requiring team authorization. authorize_team_access generated a consent URL; owner approval remains pending. Generate fresh links when needed; they expire in ten minutes. |
| Supabase | Project tzttcfxdgcfaksfyqmit; Clash-Royale; us-east-2 | ACTIVE_HEALTHY. Harmless SQL succeeds as postgres on database postgres, PostgreSQL 17.6. No mutation attempted. |
| Railway | https://crl-head-to-head-production-12d1.up.railway.app | Project list requires reauthentication. Model host/inference not rechecked. Resolve actual project/environment/service IDs after reconnecting. |
| Linear | Rival Royale project P-WWR-8; https://linear.app/wwrens-roost/project/rival-royale-f2bf1ea5d717 | Project list succeeds; no writes attempted. |
| Local Git | Owner's Windows checkout | FETCH_HEAD write denied. ls-remote failed with getaddrinfo() thread failed to start. Online HEAD independently verified through GitHub. |

## Permission settings and recovery

GitHub, Vercel, Supabase, Railway, and Linear each successfully changed to full_access (Allow all actions). Global full_access was explicitly rejected as unavailable. App overrides do not repair external grants, expired OAuth, or host restrictions.

- GitHub: authorize contents/ref write for this repository in the installed integration, then verify the intended branch creation. The attempted codex/rival-royale-access-skill branch was NOT created. Do not infer integration writes from permissions.push=true.
- Vercel: call authorize_team_access with the known team ID, relay its one-use URL, then retry the same request after provider consent. The error explicitly says not to ask for generic reconnection.
- Railway: reconnect Railway in ChatGPT Apps, then retry discovery. Do not create a replacement service/project as a workaround.
- Host: use supported host controls to obtain writable Git metadata and working network/loopback. Do not modify sandbox policies or evade restrictions. gh, vercel, railway, and supabase CLIs were absent from PATH; Node/npm/Python exist. CLI auth and OAuth connectors are independent.
- Skill: no Git-backed remote-skills workspace is mounted in this Windows session. Skill files are at repository skills/rival-royale-access. Publish through Git after integration writes are restored; install the synced folder through supported skill installation in a writable session for global discovery. Until then, local AGENTS.md points project agents here.

## Source and service routing

Production https://rival-royale.com uses main. Beta https://beta.rival-royale.com is a separate manually deployed project with no cron. A dev push alone does not update public beta. Old protected previews can have stale model tokens.

Model code: models/service; released bundle: models/release-bundle. Web proxy: app/api/model/[action] and lib/model-access. Game API: lib/clashRoyaleApi.ts through the RoyaleAPI proxy with IP-constrained credentials; preserve the working route unless replacement is verified.

Ignored .env.local, Next.js dependencies, and models/.venv/Scripts/python.exe exist. Presence does not prove credential validity. No secret values were printed. No deployment, migration, collector run, or production cron change occurred in this audit.

Local preview probe: launcher started Next.js on 127.0.0.1:3100, but HTTP verification failed with socket access forbidden. The temporary preview was stopped. Local browser/HTTP access remains blocked; no working-preview claim.
