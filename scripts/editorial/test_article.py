import json
from pathlib import Path
import unittest
from compile_article import compile_article


class ArticleTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parents[2] / "content/editorial"
        self.name = "october-2026-balance-changes.json"
        self.evidence = self.load("evidence")
        self.draft = self.load("drafts")

    def load(self, sub):
        return json.loads((self.root/sub/self.name).read_text(encoding="utf-8"))

    def test_approved_copy_matches_compilation(self):
        self.assertEqual(compile_article(self.evidence,self.draft),self.load("approved"))

    def test_rejects_invented_duplicate_or_misplaced_claim(self):
        for key in ("fake","cart","practice"):
            draft = self.load("drafts")
            draft["sections"][0]["ids"].append(key)
            with self.subTest(key=key), self.assertRaises(ValueError):
                compile_article(self.evidence,draft)

    def test_rejects_unverified_url(self):
        self.evidence["source"]["url"] = "https://supercell.com.example.org/post"
        with self.assertRaises(ValueError):
            compile_article(self.evidence,self.draft)
