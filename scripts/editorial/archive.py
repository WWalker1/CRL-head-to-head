"""Private S3-compatible report archive. Only aggregated rows are persisted."""
from datetime import timedelta
import json
import os


def partition_months(start, end):
    while start < end:
        next_month = (start.replace(day=28, hour=0, minute=0, second=0, microsecond=0)
                      + timedelta(days=4)).replace(day=1)
        stop = min(end, next_month)
        yield start, stop
        start = stop


def monthly_report(parts, month, minimum):
    ordered = sorted((p for p in parts if p["windowStart"].startswith(month)), key=lambda p: p["windowStart"])
    if not ordered or any(a["windowEnd"] > b["windowStart"] for a,b in zip(ordered,ordered[1:])):
        raise ValueError("Missing or overlapping sample windows")
    groups = {}
    total = 0
    for part in ordered:
        total += part["sampledPlayerDeckAppearances"]
        if sum(d["games"] for d in part["decks"]) != part["sampledPlayerDeckAppearances"]:
            raise ValueError("Monthly inputs require the complete deck histogram")
        for deck in part["decks"]:
            row = groups.setdefault(deck["id"], dict(deck, games=0, wins=0))
            row["games"] += deck["games"]
            row["wins"] += deck["wins"]
    ranked = sorted(groups.values(), key=lambda d: (-d["games"],-d["wins"],d["id"]))
    for deck in ranked:
        deck.update(winRate=round(100*deck["wins"]/deck["games"],1), usageRate=round(100*deck["games"]/total,2))
    report = dict(ordered[-1], windowStart=ordered[0]["windowStart"], minGames=minimum,
                  sampledPlayerDeckAppearances=total, physicalMatches=sum(p["physicalMatches"] for p in ordered),
                  daysObserved=sorted(set().union(*(p["daysObserved"] for p in ordered))),
                  decks=[d for d in ranked if d["games"] >= minimum][:50], collectionWindows=len(ordered))
    report.pop("sampledPlayers", None)
    return report


def publish(bundle):
    import boto3
    from botocore.exceptions import ClientError
    bucket = os.environ["R2_EDITORIAL_BUCKET"]
    if bucket != "rival-royale-editorial-dev":
        raise ValueError("Only the isolated development bucket is enabled")
    client = boto3.client("s3", region_name="auto", endpoint_url="https://"+os.environ["R2_ACCOUNT_ID"]+".r2.cloudflarestorage.com",
                          aws_access_key_id=os.environ["R2_EDITORIAL_ACCESS_KEY_ID"],
                          aws_secret_access_key=os.environ["R2_EDITORIAL_SECRET_ACCESS_KEY"])
    def read(key):
        try:
            obj = client.get_object(Bucket=bucket, Key=key)
            return json.load(obj["Body"]), obj["ETag"]
        except ClientError as error:
            if error.response["ResponseMetadata"]["HTTPStatusCode"] != 404:
                raise
            return None, None
    def write(key, payload, etag=None):
        client.put_object(Bucket=bucket, Key=key, ContentType="application/json",
                          Body=json.dumps(payload, separators=(",",":")).encode(),
                          **({"IfMatch":etag} if etag else {"IfNoneMatch":"*"}))
    prefix = "editorial/meta/"
    snap = bundle["weekly"]
    key = prefix+"weeks/"+snap["windowEnd"][:10]+".json"
    archived, _ = read(key)
    if archived is None:
        write(key,bundle)
    else:
        bundle = archived  # Resume interrupted publication using the original collection.
    snap = bundle["weekly"]
    for part in bundle["slices"]:
        month = part["windowStart"][:7]
        if not part["decks"]:
            continue
        # A calendar month intersects at most six fixed weekly windows.
        from datetime import date
        left = date.fromisoformat(month+"-01")
        monday = left + timedelta(days=7-left.weekday())
        parts = []
        while (monday-timedelta(days=7)).isoformat()[:7] <= month:
            week, _ = read(prefix+"weeks/"+monday.isoformat()+".json")
            if week:
                parts.extend(week["slices"])
            monday += timedelta(days=7)
        month_key = prefix+"months/"+month+".json"
        old, etag = read(month_key)
        result = monthly_report(parts, month, snap["minGames"])
        if old != result:
            write(month_key,result,etag)
    index_key = prefix+"index.json"
    old_index, etag = read(index_key)
    index = sorted(set(old_index or []).union(p["windowStart"][:7] for p in bundle["slices"] if p["decks"]), reverse=True)
    if old_index != index:
        write(index_key,index,etag)
    head, etag = read(prefix+"latest.json")
    if not head or head["windowEnd"] < snap["windowEnd"]:
        write(prefix+"latest.json",snap,etag)
