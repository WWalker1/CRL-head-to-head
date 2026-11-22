#!/usr/bin/env python3
"""Weekly top-ranked deck snapshot. Read-only game API; R2 writes only with --publish."""
import argparse
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import hashlib
import json
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
        if not isinstance(card, dict) or not isinstance(card.get("id"), int):
            return None
        base.append(card["id"])
        # An evolution/hero played in battle affects strategy; track its form.
        keys.append(str(card["id"]) + (":e" if card.get("evolutionLevel", 0) else ""))
    if len(set(base)) != 8:
        return None
    return "|".join(sorted(keys))


def ranked_battle(battle, tag, start, end):
    if not isinstance(battle, dict):
        return None
    if (battle.get("type") != "pathOfLegend"
            or battle.get("gameMode", {}).get("id") != MODE_ID
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
    if own == other:
        return None  # Draws excluded consistently.
    identity = "|".join([battle["battleTime"], battle["type"],
                         str(MODE_ID), *sorted([player.get("tag", ""), rival.get("tag", "")])])
    return (hashlib.sha256(identity.encode()).hexdigest(), key, own > other, player["cards"])


def aggregate(records, collected, start, end, rank_limit, min_games):
    stats = defaultdict(lambda: {"games": 0, "wins": 0, "cards": None})
    seen = set()
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
        row = stats[key]
        row["games"] += 1
        row["wins"] += int(won)
        row["cards"] = [{"id": c["id"], "name": c.get("name", ""),
                         "icon": c.get("iconUrls", {}).get("medium", ""),
                         "evolution": bool(c.get("evolutionLevel", 0))} for c in cards]
    total = sum(s["games"] for s in stats.values())
    decks = []
    for key, item in stats.items():
        if item["games"] < min_games:
            continue
        decks.append({"id": hashlib.sha256(key.encode()).hexdigest()[:16],
                      "cards": item["cards"], "games": item["games"],
                      "wins": item["wins"],
                      "winRate": round(100 * item["wins"] / item["games"], 1),
                      "usageRate": round(100 * item["games"] / total, 2) if total else 0})
    decks.sort(key=lambda r: (-r["games"], -r["wins"], r["id"]))
    return {"schemaVersion": 1, "kind": "top-ranked-decks", "publishedAt": collected.isoformat(),
            "windowStart": start.isoformat(), "windowEnd": end.isoformat(),
            "cohort": f"Top {rank_limit} global Ranked leaderboard players at sampling time",
            "sampledPlayerDeckAppearances": total, "uniquePlayerMatches": len(seen),
            "minGames": min_games, "decks": decks[:50],
            "methodology": "One observation per sampled player per unique match, ranked constructed 1v1 only; draws excluded. The API exposes only recent battle logs, so the 7-day window is incomplete, especially for active players. Win rate = wins / decisive observations. Usage = deck observations / all valid deck observations. Non-random leaderboard sample; opponent deck not necessarily top-ranked."}


def collect(limit, pause, start, end):
    leaderboard = request_json(TOP_PLAYERS)
    entries = leaderboard.get("items") if isinstance(leaderboard, dict) else None
    if not isinstance(entries, list) or not entries:
        raise RuntimeError("Leaderboard payload missing items")
    tags = [p["tag"] for p in entries if isinstance(p, dict) and isinstance(p.get("tag"), str)
            and isinstance(p.get("rank"), int) and p["rank"] <= limit]
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
        except (HTTPError, URLError, ValueError, TimeoutError):
            errors += 1
        if index < len(tags):
            time.sleep(pause)
    # Do not publish an apparently representative report from widespread API failures.
    if errors > max(2, len(tags) // 10):
        raise RuntimeError(f"Too many failed player logs: {errors}/{len(tags)}")
    return observations, len(tags), errors


def publish_r2(payload, key):
    import boto3
    required = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET")
    for name in required:
        if not os.getenv(name):
            raise RuntimeError("Missing " + name)
    client = boto3.client("s3", endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
                          aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                          aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
                          region_name="auto")
    body = json.dumps(payload, separators=(",", ":")).encode()
    client.put_object(Bucket=os.environ["R2_BUCKET"], Key=key, Body=body,
                      ContentType="application/json", CacheControl="public, max-age=300")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--top", type=int, default=250)
    parser.add_argument("--pause", type=float, default=0.1)
    parser.add_argument("--min-games", type=int, default=5)
    parser.add_argument("--out", default="meta-preview.json")
    parser.add_argument("--publish", action="store_true", help="Write to R2. Otherwise local JSON only.")
    args = parser.parse_args()
    if not 1 <= args.top <= 1000 or args.pause < 0 or args.min_games < 1:
        parser.error("Invalid collection parameters")
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=7)
    records, sampled, failed = collect(args.top, args.pause, start, end)
    snapshot = aggregate(records, end, start, end, sampled, args.min_games)
    snapshot["requestedTop"] = args.top
    snapshot["playerLogsFailed"] = failed
    snapshot["sampledPlayers"] = sampled
    if not snapshot["sampledPlayerDeckAppearances"]:
        raise RuntimeError("No eligible matches: refuse empty publication")
    with open(args.out, "w", encoding="utf-8") as output:
        json.dump(snapshot, output, indent=2)
    if args.publish:
        if snapshot["sampledPlayerDeckAppearances"] < 100 or not snapshot["decks"]:
            raise RuntimeError("Publication quality gate: insufficient ranked observations")
        week = end.strftime("%Y-%m-%d")
        publish_r2(snapshot, "editorial/meta/" + week + ".json")
        publish_r2(snapshot, "editorial/meta/latest.json")
    print(json.dumps({"mode": "published" if args.publish else "local-only", "sampled": sampled,
                      "failed": failed, "observations": snapshot["sampledPlayerDeckAppearances"],
                      "decksShown": len(snapshot["decks"])}))


if __name__ == "__main__":
    main()
