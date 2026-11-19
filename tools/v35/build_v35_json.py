#!/usr/bin/env python3
"""Build data/v35_words.json for V18.0 SKYROOT SANCTUARY from the authored
records in tools/v35/author_records.py.

Cross-checks every authored record against tools/v35/final_pairs.json
(the deduped 240 selection); ids are 'v35_<slug>' with the V33 slug rule
(lowercase, non-alnum -> '_'). Field order mirrors the V33 JS layer:
id, set, led, en, ko, vi, ipa, pos, ex, exvi.
('led' is new vs the V33 JSON — it records the EN-led / KO-led split;
'id' is new vs the V33 JSON but matches the V33 JS layer shape.)

Run: python3 tools/v35/build_v35_json.py   (from ~/workspace/v7build/)
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

from author_records import R  # noqa: E402


def slug(en):
    s = re.sub(r"[^a-z0-9]+", "_", (en or "").lower()).strip("_")
    assert s, f"empty slug for {en!r}"
    return s


def main():
    pairs = json.load(open(os.path.join(ROOT, "tools", "v35", "final_pairs.json"), encoding="utf-8"))
    assert len(R) == 240, f"authored records: {len(R)} (expected 240)"
    assert len(pairs) == 240, f"final pairs: {len(pairs)} (expected 240)"
    by_key = {(r[0], r[1], r[2], r[3]): r for r in R}
    assert len(by_key) == 240, "duplicate (set, led, en, ko) in authored records"
    recs = []
    seen_slugs = set()
    for p in pairs:
        key = (p["set"], p["led"], p["en"], p["ko"])
        assert key in by_key, f"authored record missing for {key}"
        _s, _led, _en, _ko, vi, ipa, pos, ex, exvi = by_key[key]
        sl = slug(p["en"])
        assert sl not in seen_slugs, f"slug collision: {sl}"
        seen_slugs.add(sl)
        recs.append({
            "id": "v35_" + sl,
            "set": p["set"],
            "led": p["led"],
            "en": p["en"],
            "ko": p["ko"],
            "vi": vi,
            "ipa": ipa,
            "pos": pos,
            "ex": ex,
            "exvi": exvi,
        })
    out = os.path.join(ROOT, "data", "v35_words.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(recs, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"wrote {out} ({len(recs)} records)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
