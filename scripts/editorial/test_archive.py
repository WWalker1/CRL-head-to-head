from copy import deepcopy
from datetime import datetime, timezone
import unittest
from archive import partition_months, publish_objects


class ArchiveTests(unittest.TestCase):
    def test_resume_across_month_boundary(self):
        left = datetime(2026, 11, 30, tzinfo=timezone.utc)
        right = datetime(2026, 12, 7, tzinfo=timezone.utc)
        slices = []
        for start, end in partition_months(left, right):
            slices.append({"windowStart":start.isoformat(),"windowEnd":end.isoformat(),
                           "decks":[{"id":"deck","games":6,"wins":2}],
                           "daysObserved":[start.strftime("%Y%m%d")],
                           "sampledPlayerDeckAppearances":6,"physicalMatches":6})
        snap = {"windowEnd":right.isoformat(),"minGames":5}
        bundle = {"weekly":snap,"slices":slices}
        objects = {}
        interrupted = True

        def read(key):
            return deepcopy(objects.get(key,(None,None)))

        def write(key,value,etag=None):
            nonlocal interrupted
            if key.endswith("index.json") and interrupted:
                interrupted = False
                raise OSError("interrupted")
            self.assertEqual(read(key)[1],etag)
            objects[key] = deepcopy(value),str(len(objects)+1)

        with self.assertRaises(OSError):
            publish_objects(bundle, read, write)
        retry = deepcopy(bundle)
        retry["slices"][0]["decks"][0]["wins"] = 6
        publish_objects(retry,read,write)
        before = deepcopy(objects)
        publish_objects(retry,read,write)
        self.assertEqual(objects,before)
        self.assertEqual(read("editorial/meta/index.json")[0],["2026-12","2026-11"])
        for month in ("2026-11","2026-12"):
            report = read("editorial/meta/months/"+month+".json")[0]
            self.assertEqual(report["decks"][0]["winRate"],33.3)
            self.assertEqual(report["decks"][0]["usageRate"],100)
