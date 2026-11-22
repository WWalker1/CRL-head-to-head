#!/usr/bin/env python3
"""Weekly top-ranked deck snapshot. Read-only game API; R2 writes only with --publish."""
import argparse
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import math
import sys
import os
import random
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

API = os.getenv("CR_META_API_BASE", "https://proxy.royaleapi.dev/v1").rstrip("/")
MODE_ID = 72000464  # Current Ranked mode; fail closed if Supercell changes this.
TOP_PLAYERS = "/locations/global/pathoflegend/players?limit=1000"


def request_json(path):
    token = os.environ["CLASH_ROYALE_API_KEY"]
    for attempt in range(5):
        try:
            req = Request(API + path, headers={"Authorization": "Bearer " + token})
            with urlopen(req, timeout=20) as response:
                return json.load(response)
        except HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 4:
                raise
            retry_after = error.headers.get("Retry-After", "")
            try:
                pause = min(float(retry_after), 30)
            except ValueError:
                pause = min(2 ** attempt, 16) + random.random()
            time.sleep(max(0.5, pause))
        except (URLError, TimeoutError):
            if attempt == 4:
                raise
            time.sleep(min(2 ** attempt, 16) + random.random())
    raise RuntimeError("API retry budget exhausted")


def deck_key(cards):
    if not isinstance(cards, list) or len(cards) != 8:
        return None
    keys = []
    base = []
    for card in cards:
        if not isinstance(card, dict) or type(card.get("id")) is not int:
            return None
        base.append(card["id"])
        # An evolution/hero played in battle affects strategy; track its form.
        form = card.get("evolutionLevel", 0)
        if type(form) is not int or form not in (0, 1, 2):
            return None
        keys.append(f"{card['id']}:{form}")
    if len(set(base)) != 8:
        return None
    return "|".join(sorted(keys))


def ranked_battle(battle, tag, start, end):
    if not isinstance(battle, dict):
        return None
    if (battle.get("type") != "pathOfLegend"
            or not isinstance(battle.get("gameMode"), dict)
            or battle["gameMode"].get("id") not in (MODE_ID, 72000450)
            or battle.get("deckSelection") != "collection"
            or battle.get("modifiers")
            or battle.get("isHostedMatch")
            or battle.get("isLadderTournament")):
        return None
    team, opponent = battle.get("team"), battle.get("opponent")
    if not (isinstance(team, list) and len(team) == 1
            and isinstance(opponent, list) and len(opponent) == 1):
        return None
    try:
        stamp = datetime.strptime(battle["battleTime"], "%Y%m%dT%H%M%S.%fZ").replace(tzinfo=timezone.utc)
    except (KeyError, ValueError, TypeError):
        return None
    if not start <= stamp < end:
        return None
    if not all(isinstance(p, dict) and isinstance(p.get("tag"), str) and p["tag"]
               and deck_key(p.get("cards")) for p in (team[0], opponent[0])):
        return None
    if team[0]["tag"] == opponent[0]["tag"]:
        return None
    if team[0].get("tag") == tag:
        player, rival = team[0], opponent[0]
    elif opponent[0].get("tag") == tag:
        player, rival = opponent[0], team[0]
    else:
        return None
    key = deck_key(player.get("cards"))
    if key is None:
        return None
    try:
        own, other = int(player["crowns"]), int(rival["crowns"])
    except (KeyError, TypeError, ValueError):
        return None
    if any(type(p.get("crowns")) is not int or not 0 <= p["crowns"] <= 3 for p in (player, rival)) or own == other:
        return None  # Draws excluded consistently.
    identity = "|".join([battle["battleTime"], battle["type"],
                         str(battle["gameMode"]["id"]), *sorted([player.get("tag", ""), rival.get("tag", "")])])
    return (hashlib.sha256(identity.encode()).hexdigest(), key, own > other, player["cards"])


def card_view(card, catalog):
    form = card.get("evolutionLevel", 0)
    meta = catalog.get(card["id"], {})
    icons = card.get("iconUrls") or meta.get("iconUrls") or {}
    if not isinstance(icons, dict):
        icons = {}
    role = {0: "Base", 1: "Evolution", 2: "Hero"}[form]
    preferred = {0: "medium", 1: "evolutionMedium", 2: "heroMedium"}[form]
    return {"id": card["id"], "name": card.get("name") or meta.get("name", ""),
            "form": role, "evolution": form == 1, "elixir": meta.get("elixirCost"),
            "icon": icons.get(preferred) or icons.get("medium", "")}


def aggregate(records, collected, start, end, rank_limit, min_games, catalog=None, max_decks=50):
    stats = defaultdict(lambda: {"games": 0, "wins": 0, "cards": None})
    seen = set()
    physical = set()
    dates = set()
    for player_tag, battle in records:
        parsed = ranked_battle(battle, player_tag, start, end)
        if parsed is None:
            continue
        match_id, key, won, cards = parsed
        # Count a match once per sampled leaderboard player, not once per API fetch.
        distinct = (match_id, player_tag)
        if distinct in seen:
            continue
        seen.add(distinct)
        physical.add(match_id)
        dates.add(battle["battleTime"][:8])
        row = stats[key]
        row["games"] += 1
        row["wins"] += int(won)
        if row["cards"] is None:
            row["cards"] = [card_view(c, catalog or {}) for c in sorted(cards, key=lambda c: c["id"])]
    total = sum(s["games"] for s in stats.values())
    decks = []
    for key, item in stats.items():
        if item["games"] < min_games:
            continue
        cards = item["cards"]
        costs = [c["elixir"] for c in cards]
        decks.append({"averageElixir": round(sum(costs) / 8, 1) if all(type(n) is int and 0 <= n <= 10 for n in costs) else None,
                      "id": hashlib.sha256(key.encode()).hexdigest()[:16],
                      "cards": item["cards"], "games": item["games"],
                      "wins": item["wins"],
                      "winRate": round(100 * item["wins"] / item["games"], 1),
                      "usageRate": round(100 * item["games"] / total, 2) if total else 0})
    decks.sort(key=lambda r: (-r["games"], -r["wins"], r["id"]))
    return {"schemaVersion": 1, "kind": "top-ranked-decks", "publishedAt": collected.isoformat(),
            "windowStart": start.isoformat(), "windowEnd": end.isoformat(),
            "cohort": f"Global Ranked leaderboard, ranks 1–{rank_limit} at collection time",
            "sampledPlayerDeckAppearances": total, "physicalMatches": len(physical), "daysObserved": sorted(dates),
            "minGames": min_games, "decks": decks[:max_decks],
            "methodology": "One observation per sampled player per unique match, ranked constructed 1v1 only; draws excluded. The API exposes only recent battle logs, so the 7-day window is incomplete, especially for active players. Win rate = wins / decisive observations. Usage = deck observations / all valid deck observations. Non-random leaderboard sample; opponent deck not necessarily top-ranked."}


def collect(limit, pause, start, end):
    leaderboard = request_json(TOP_PLAYERS)
    entries = leaderboard.get("items") if isinstance(leaderboard, dict) else None
    if not isinstance(entries, list) or not entries:
        raise RuntimeError("Leaderboard payload missing items")
    tags = [p["tag"] for p in entries if isinstance(p, dict) and isinstance(p.get("tag"), str)
            and isinstance(p.get("rank"), int) and 1 <= p["rank"] <= limit]
    tags = list(dict.fromkeys(tags))
    if not tags:
        raise RuntimeError("No ranked leaderboard player tags")
    observations = []
    errors = 0
    for index, tag in enumerate(tags, 1):
        try:
            battles = request_json("/players/" + quote(tag, safe="") + "/battlelog")
            if not isinstance(battles, list):
                raise ValueError("Malformed battle log")
            observations.extend((tag, battle) for battle in battles)
        except (HTTPError, URLError, ValueError, TimeoutError) as exc:
            status = getattr(exc, "code", None)
            if status in (401, 403):
                raise RuntimeError(f"Game API authorization failed (HTTP {status})") from None
            errors += 1
            print(json.dumps({"event": "log_failed", "rankIndex": index, "status": status, "reason": type(exc).__name__}), file=sys.stderr)
        if index < len(tags):
            time.sleep(pause)
    # Do not publish an apparently representative report from widespread API failures.
    if len(tags) < math.ceil(limit * 0.9) or errors > len(tags) // 10:
        raise RuntimeError(f"Too many failed player logs: {errors}/{len(tags)}")
    return observations, len(tags), errors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--top", type=int, default=250)
    parser.add_argument("--pause", type=float, default=0.2)
    parser.add_argument("--min-games", type=int, default=5)
    parser.add_argument("--out", default="meta-preview.json")
    parser.add_argument("--archive-dir", type=Path)
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--resume-week", type=date.fromisoformat, help="Rebuild from immutable week ending YYYY-MM-DD; requires --publish")
    args = parser.parse_args()
    if args.resume_week:
        if not args.publish:
            parser.error("--resume-week requires --publish")
        from archive import publish
        publish(resume_week=args.resume_week)
        return
    if not 1 <= args.top <= 1000 or not 0.05 <= args.pause <= 60 or args.min_games < 1:
        parser.error("Invalid collection parameters")
    now = datetime.now(timezone.utc)
    # Published windows are fixed, half-open UTC weeks, so adjacent runs cannot overlap.
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = midnight - timedelta(days=midnight.weekday()) if args.publish else now
    start = end - timedelta(days=7)
    catalog = {c["id"]: c for c in request_json("/cards")["items"]}
    records, sampled, failed = collect(args.top, args.pause, start, end)
    def summary(left, right, minimum, maximum):
        result = aggregate(records, now, left, right, args.top, minimum, catalog, maximum)
        result.update(requestedTop=args.top, sampledPlayers=sampled-failed, playerLogsFailed=failed)
        return result
    snapshot = summary(start, end, args.min_games, 50)
    if snapshot["sampledPlayerDeckAppearances"] < 100 or not snapshot["decks"]:
        raise RuntimeError("Insufficient eligible observations or supported decks")
    Path(args.out).write_text(json.dumps(snapshot), encoding="utf-8")
    if args.archive_dir or args.publish:
        from archive import partition_months, publish, monthly_report
        slices = [summary(left, right, 1, None) for left, right in partition_months(start, end)]
        bundle = {"weekly": snapshot, "slices": slices}
        if args.archive_dir:
            args.archive_dir.mkdir(parents=True, exist_ok=True)
            for part in slices:
                month = part["windowStart"][:7]
                if part["decks"]:
                    report = monthly_report([part], month, args.min_games)
                    (args.archive_dir / (month+".json")).write_text(json.dumps(report), encoding="utf-8")
            months = sorted(p["windowStart"][:7] for p in slices if p["decks"])
            (args.archive_dir / "index.json").write_text(json.dumps(months), encoding="utf-8")
        if args.publish:
            publish(bundle)
    print(json.dumps({k: snapshot[k] for k in ("sampledPlayers","playerLogsFailed","physicalMatches","sampledPlayerDeckAppearances")}))


if __name__ == "__main__":
    main()
