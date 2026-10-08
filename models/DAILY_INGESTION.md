# Daily Ranked ingestion

The Codex scheduled job **Rival daily Ranked ingestion** is paused as of October 6, 2026. Its former schedule was 03:00 local time. The research archive's `STOP` file also prevents the Python collector from running if the task is accidentally invoked. This is separate from the live Vercel nightly user sync, which remains enabled.

Run manually from the project root:

```powershell
models/.venv/Scripts/python.exe models/daily_ingest.py --new-games 200000 --max-hours 1
```

Use `--dry-run` to inspect the target without collecting. The target is **new unique inserts**, not responses or total lifetime games. A dated report fixes that UTC day's target on the first invocation, so retries resume toward the same target rather than requesting another 200,000 games. Physical-match hashing deduplicates across all days.

Each attempt is bounded to one hour, 45,000 API requests, 12 requests/second and 12 workers. A batch in flight can slightly exceed the time or game-count boundary. Locks prevent concurrent collection; STOP files are respected. A failed run or bounded partial yield is reported honestly. Do not remove a collector lock until its PID is verified dead. The daily wrapper itself is not a scheduler; Codex's local scheduled job starts it.

Artifacts:

- `data/daily/YYYY-MM-DD.json`: fixed target, actual inserts, total count, cohort distribution, yield and completion state.
- `data/daily/YYYY-MM-DD.log`: collector output and errors, never credentials.
- `data/ultimate-champion/status.json`: current collector status. The historical directory name does not imply UC-only: leagues 5/6/7 are retained explicitly.
- `data/ultimate-champion/battles.sqlite3`: compressed source records, canonical match hashes, provenance and persistent breadth-first player frontier.

The recent expanded run inserted 351,036 new games in 3,857 seconds from 22,680 player logs. This supports starting with a 200,000/day target; it does not guarantee future yield. API histories are short, so once-daily collection cannot recover every game played between polls. The local host and Codex scheduler must be available, and agent usage/API credentials must permit the run.

Validated tensor exports and training remain deliberate experiments. Daily ingestion never overwrites a frozen dataset/checkpoint or silently promotes a model. Before retraining, run `prepare_data.py` with leagues5/6/7 and exclude previously inspected test IDs; verify the export, select models on validation, calibrate on a separate window, and score on a fresh temporal holdout. Use `compare_runs.py` for a like-for-like future UC comparison. No automated deletion or production deployment is configured.
