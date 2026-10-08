import contextlib,copy,io,json,sqlite3,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import community_harvest as h
from test_prepare_data import fixture
from collect import identity


class CommunityTest(unittest.TestCase):
    def test_fanout_reverse_dedup_and_primary_overlap(self):
        b=fixture();reverse=copy.deepcopy(b);reverse['team'],reverse['opponent']=reverse['opponent'],reverse['team']
        class FakeClient:
            requests=0
            def get(self,path):
                self.requests+=1
                return [b if '%23A/' in path else reverse]
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);folder=root/'data/community';folder.mkdir(parents=True)
            (folder/'seeds.json').write_text(json.dumps(['#A']))
            primary=root/'data/ultimate-champion';primary.mkdir()
            db=sqlite3.connect(primary/'battles.sqlite3');db.execute('CREATE TABLE battles(id TEXT PRIMARY KEY)');db.execute('INSERT INTO battles VALUES (?)',(identity(b),));db.commit();db.close()
            with patch.object(h,'ROOT',root),patch.object(h,'credential',return_value='unused'),patch.object(h,'Client',return_value=FakeClient()),patch('sys.argv',['community_harvest','--target','3']),contextlib.redirect_stdout(io.StringIO()):
                h.main()
            status=json.loads((folder/'status.json').read_text())
            self.assertEqual(status['unique_community_matches'],1)
            self.assertEqual(status['overlap_with_primary'],1)
            self.assertEqual(status['fetched_this_run'],2)
            self.assertEqual(status['duplicate_views_this_run'],1)
            self.assertFalse((folder/'collector.lock').exists())


if __name__=='__main__':unittest.main()
