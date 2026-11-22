"""Compile a model-selected outline against an editor-verified evidence packet."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit


def compile_article(evidence, draft):
    if set(draft) != {"slug","sections"} or draft["slug"] != evidence["slug"]:
        raise ValueError("Outline must reference the verified article")
    source = evidence["source"]
    ref = urlsplit(source["url"])
    if ref.scheme != "https" or ref.hostname not in {"supercell.com","support.supercell.com"}:
        raise ValueError("An official patch source is required")
    sections = []
    seen = set()
    if [s["kind"] for s in draft["sections"]] != ["confirmed","observed","strategy"]:
        raise ValueError("Separate confirmed changes, measured evidence and interpretation")
    for s in draft["sections"]:
        if set(s) != {"kind","ids"} or not isinstance(s["ids"],list) or not s["ids"]:
            raise ValueError("Empty or unsupported section")
        paragraphs = []
        for key in s["ids"]:
            fact = evidence["facts"].get(key)
            if not fact or fact["section"] != s["kind"] or fact["text"] in seen or len(fact["text"].strip()) < 40:
                raise ValueError("Unsupported, misplaced, duplicate or empty claim")
            seen.add(fact["text"])
            paragraphs.append(fact["text"])
        sections.append({"heading":evidence["headings"][s["kind"]],"paragraphs":paragraphs})
    return {"schemaVersion":1, **{k:evidence[k] for k in ("slug","kind","title","description")},
            "author":"Rival Royale","publishedAt":evidence["publishedAt"],"updatedAt":evidence["publishedAt"],
            "sources":[{k:source[k] for k in ("label","url")}],"sections":sections}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    for name in ("evidence","draft","output"):
        parser.add_argument(name,type=Path)
    args = parser.parse_args()
    result = compile_article(json.loads(args.evidence.read_text(encoding="utf-8")),json.loads(args.draft.read_text(encoding="utf-8")))
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
