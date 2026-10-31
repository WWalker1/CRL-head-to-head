# Why release and preview access are blocked

Latest correction: local Next.js Webpack dev serving and Chrome browser verification subsequently succeeded. The earlier socket failure below is historical, not a current action item. Production Webpack output still failed with EPERM creating `.next/types/app/ads.txt`. See `UI_AND_RIVALRY_PASS_2026-10-22.md` for implementation and browser evidence. Linear document writes also subsequently succeeded after owner authorization. Git metadata remains read-only under the current host policy.

Checked during the October 21 evening / October 22 UTC development session. These are observed access failures, not missing permission from the owner. The owner has explicitly authorized implementation, dev pushes, preview source uploads, testing and documentation.

| Boundary | Evidence from this session | What it prevents | What would resolve it |
| --- | --- | --- | --- |
| Local Git metadata | `git fetch origin` fails: `cannot open '.git/FETCH_HEAD': Permission denied`. Workspace policy exposes `.git` as read-only. | Fetching refs into local Git, creating local commits/branches or pushing through this checkout. | Run this project in a local Codex session/checkout whose Git metadata is writable. A connector login cannot change the filesystem policy. |
| GitHub connector writes | Creating `dev` from `main` returns HTTP 403 `Resource not accessible by integration` from `POST /git/refs`. | Connector-created dev branch and normal dev Git releases. | Grant the GitHub integration write access to repository contents/refs, or use a normal authenticated Git checkout with that access. Repository-read success does not prove write access. |
| Vercel team access | Reading project `crl-head-to-head` in `wwrens-projects-9530f2aa` returns HTTP 403, `Not authorized: Trying to access resource under scope ...`. Vercel identifies team `team_fABzweylokMn6qTACcenQB8h`. | Inspecting project state and uploading/deploying a dev preview in the intended team. | Authorize this connection for the existing Vercel team. The error recommends `authorize_team_access`, but that tool is not exposed in this session. No replacement project/team should be created. |
| Local browser verification | Next.js reports ready at `127.0.0.1:3100`, but PowerShell HTTP verification returns `An attempt was made to access a socket in a way forbidden by its access permissions`. `open_in_codex` returns an MCP app request failure. | Independently confirming browser reachability or screenshots from this session. A ready server is not proof the user's browser can reach it. | Start `scripts/start-web-preview.ps1` in a persistent local terminal with normal loopback access, or restore the app/browser bridge. |
| Turbopack build IPC | Default optimized build fails while transforming CSS: child Node process exits before Turbopack can connect. | Default Turbopack production-build verification in this restricted host. | Verify the supported Webpack build separately; do not change production infrastructure to work around this host. |

## What works

- GitHub reads: online `main` is `c48fffba8f06b5c18956a2448f19d12e73a3697c`, matching local HEAD. Upstream was checked through the connector before implementation; no newer upstream application changes were found.
- Supabase SQL reads: inspected only the definitions of existing shared budget functions. Connection works; no migration was attempted or needed for the staged public lookup.
- Linear: document and ticket reads work. The advertised `get_agent_context` tool returned `Tool get_agent_context not found`; source/docs remain authoritative.
- Application edits, Jest and TypeScript run locally. Current results belong in `DEV_ROLLOUT_2026-10-21.md` and the morning brief.
- A one-time continuation at 1 a.m. Eastern already existed; an additional one-time 6:30 a.m. Eastern continuation was created. Scheduling does not guarantee available model quota or reset limits.

## Why it worked in earlier sessions

Earlier handoffs record successful releases and migrations. That establishes what the earlier environment could do. It does not identify the exact reason the current connection or host permissions differ. The present evidence shows separate filesystem, GitHub integration, Vercel team-scope and local socket/app boundaries. A changed session, host policy, installation permission or connection scope could explain the difference; none has been proven as the historical cause.

Supabase is currently accessible. Railway access has not been rechecked in this session because no infrastructure change is needed for this batch; do not label it disconnected or inaccessible without a read result.

The earlier automatic approval rejection concerned a Vercel source upload. The owner has since explicitly authorized that upload, including source/configuration/public assets and excluding credentials, environments and datasets. That approval concern is resolved; it does not cure the Vercel team-scope denial above.

## No action needed during overnight coding

Continue independent implementation, tests and documentation. Do not repeat denied calls without evidence access changed, request the same owner permission again, bypass the host's restrictions, or claim a local change was deployed. Keep production `main`, the deployed nightly cron schedule and paused research collectors unchanged.
