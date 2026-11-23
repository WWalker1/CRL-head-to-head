"""Exercise the publisher's boto3 requests against an in-process S3 emulator."""
from datetime import date, timedelta
import json
import os
from unittest import TestCase, mock

import boto3
from moto import mock_aws

from archive import publish


class PublishRoundTrip(TestCase):
    def test_publish_replay_and_repair(self):
        account = "a" * 32
        endpoint = f"https://{account}.r2.cloudflarestorage.com"
        bucket = "rival-royale-editorial-dev"
        settings = {
            "R2_ACCOUNT_ID": account,
            "R2_EDITORIAL_BUCKET": bucket,
            "R2_EDITORIAL_ACCESS_KEY_ID": "testing",
            "R2_EDITORIAL_SECRET_ACCESS_KEY": "testing",
            "MOTO_S3_CUSTOM_ENDPOINTS": endpoint,
            "S3_IGNORE_SUBDOMAIN_BUCKETNAME": "true",
        }
        with mock.patch.dict(os.environ, settings), mock_aws():
            s3 = boto3.client("s3", region_name="us-east-1", endpoint_url=endpoint)
            s3.create_bucket(Bucket=bucket)

            def read(name):
                response = s3.get_object(Bucket=bucket, Key="editorial/meta/" + name)
                return json.load(response["Body"])

            weeks = [date(2026, 11, 16), date(2026, 11, 23)]
            for end in weeks:
                start = end - timedelta(days=7)
                part = {
                    "windowStart": start.isoformat(), "windowEnd": end.isoformat(),
                    "sampledPlayerDeckAppearances": 6, "physicalMatches": 6,
                    "daysObserved": [start.isoformat()],
                    "decks": [{"id": "example", "wins": 4, "games": 6}],
                }
                weekly = dict(part, minGames=5)
                bundle = {"weekly": weekly, "slices": [part]}
                publish(bundle)
                self.assertEqual(read(f"weeks/{end}.json"), bundle)

            s3.delete_object(Bucket=bucket, Key="editorial/meta/months/2026-11.json")
            publish(resume_week=weeks[0])

            month = read("months/2026-11.json")
            self.assertEqual(month["sampledPlayerDeckAppearances"], 12)
            self.assertEqual(month["decks"][0]["wins"], 8)
            self.assertEqual(read("index.json"), ["2026-11"])
            self.assertEqual(read("latest.json")["windowEnd"], weeks[-1].isoformat())
