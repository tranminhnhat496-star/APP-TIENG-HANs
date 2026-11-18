#!/usr/bin/env python3
"""Validate V33 CHRONO KINGDOM vocabulary (data/v33_words.json).

Checks:
  - total 240, 60 per set (time / space / machines / change)
  - every entry has exactly the 8 required keys, pos in the allowed set
  - no duplicate `en` (case-insensitive) inside the 240
  - no overlap with existing game headwords, extracted live from source:
      * V7 1000 new words:  data/batch-a1.json, batch-a2.json, batch-b1.json, batch-b2.json
      * V6 96 words:        out/v14.js  (ENWORDS array rows; src/v14.js does not exist,
                             and src/v15_data.js holds no word list)
      * Library A1-A2 1000: data/v17_a1a2.json  (src/v17_a1a2.js is the same list)
      * Library Oxford 3396: data/v17_oxford.json (src/v17_oxford.js is the same list)
      * Basic Tactics:      data/v22_basictactics.json (513 entries in the file)
  - counts blank ipa / ko / vi fields

Usage: python3 tools/v33/validate_words.py   (run from ~/workspace/v7build/)
Exit code 0 = all hard checks pass; 1 = any failure.
"""
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORDS_PATH = os.path.join(ROOT, "data", "v33_words.json")
SETS = ["time", "space", "machines", "change"]
ALLOWED_POS = {"noun", "verb", "adjective", "adverb"}
REQUIRED_KEYS = {"set", "en", "ko", "vi", "ipa", "pos", "ex", "exvi"}

failures = []


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def extract_existing():
    """Return dict lowercased headword -> source label, plus per-source counts."""
    existing = {}
    counts = {}

    def add(words, src):
        n = 0
        for w in words:
            k = str(w).strip().lower()
            if k:
                n += 1
                existing.setdefault(k, src)
        counts[src] = n

    # V7 1000 new words (batch files)
    for name in ("a1", "a2", "b1", "b2"):
        p = os.path.join(ROOT, "data", f"batch-{name}.json")
        add([x["en"] for x in load_json(p)], f"V7-batch-{name}")

    # V6 96 words: ENWORDS array in out/v14.js, rows like
    # ['animals','dog','con chó','/dɔːɡ/','n','...','...'],
    p = os.path.join(ROOT, "out", "v14.js")
    txt = open(p, encoding="utf-8", errors="ignore").read()
    seg = txt[txt.index("ENWORDS=["):txt.index("];", txt.index("ENWORDS=["))]
    rows = re.findall(r"\[\s*'[^']*'\s*,\s*'((?:[^'\\]|\\.)*)'", seg)
    add(rows, "V6-out/v14.js")

    # Library A1-A2 (1000) + Oxford (3396)
    for fname, src in (("v17_a1a2.json", "Library-A1A2"),
                       ("v17_oxford.json", "Library-Oxford")):
        p = os.path.join(ROOT, "data", fname)
        add([x["en"] for x in load_json(p)], src)

    # Basic Tactics: data/v22_basictactics.json -> units[].words[].en
    # AND units[].phrases[].en (513 words + 306 phrases = 819 entries;
    # the phrases were missing from the first version of this check —
    # coordinator fix 2026-11-19, verified 0 overlaps after adding them).
    p = os.path.join(ROOT, "data", "v22_basictactics.json")
    bt = load_json(p)
    bt_words = [w["en"] for u in bt["units"] for w in u["words"]]
    bt_phrases = [w["en"] for u in bt["units"] for w in u["phrases"]]
    add(bt_words, "BasicTactics")
    add(bt_phrases, "BasicTactics-phrases")

    return existing, counts


def main():
    words = load_json(WORDS_PATH)
    print(f"V33 words file: {WORDS_PATH}")
    print(f"Total entries: {len(words)} (expected 240)")
    if len(words) != 240:
        failures.append(f"total is {len(words)}, expected 240")

    per_set = Counter(w.get("set") for w in words)
    for s in SETS:
        print(f"  set {s}: {per_set.get(s, 0)} (expected 60)")
        if per_set.get(s, 0) != 60:
            failures.append(f"set {s} has {per_set.get(s, 0)}, expected 60")
    extra_sets = sorted(set(per_set) - set(SETS))
    if extra_sets:
        failures.append(f"unexpected set values: {extra_sets}")

    # Schema checks
    for i, w in enumerate(words):
        keys = set(w.keys())
        if keys != REQUIRED_KEYS:
            failures.append(f"entry {i} ({w.get('en')!r}): keys {sorted(keys)} != {sorted(REQUIRED_KEYS)}")
        if w.get("pos") not in ALLOWED_POS:
            failures.append(f"entry {i} ({w.get('en')!r}): bad pos {w.get('pos')!r}")
        if not str(w.get("en", "")).strip():
            failures.append(f"entry {i}: empty en")
        if not str(w.get("ex", "")).strip() or not str(w.get("exvi", "")).strip():
            failures.append(f"entry {i} ({w.get('en')!r}): empty ex/exvi")

    # Duplicates inside the 240 (case-insensitive)
    seen = {}
    dupes = []
    for w in words:
        k = str(w["en"]).strip().lower()
        if k in seen:
            dupes.append(k)
        else:
            seen[k] = True
    print(f"Duplicate en inside V33 (case-insensitive): {len(dupes)} {dupes if dupes else ''}")
    if dupes:
        failures.append(f"internal duplicates: {dupes}")

    # Overlap with existing game words
    existing, counts = extract_existing()
    print("Existing headwords extracted per source:")
    for src, n in counts.items():
        print(f"  {src}: {n} rows")
    print(f"  unique existing headwords total: {len(existing)}")
    overlaps = [(w["en"], existing[w["en"].strip().lower()])
                for w in words if w["en"].strip().lower() in existing]
    print(f"Overlaps with existing game words: {len(overlaps)}")
    for en, src in overlaps:
        print(f"  OVERLAP: {en!r} (source: {src})")
    if overlaps:
        failures.append(f"{len(overlaps)} overlaps with existing words")

    # Blank-field counts
    blank_ipa = [w["en"] for w in words if not str(w.get("ipa", "")).strip()]
    blank_ko = [w["en"] for w in words if not str(w.get("ko", "")).strip()]
    blank_vi = [w["en"] for w in words if not str(w.get("vi", "")).strip()]
    print(f"Blank ipa: {len(blank_ipa)} {blank_ipa if blank_ipa else ''}")
    print(f"Blank ko:  {len(blank_ko)} {blank_ko if blank_ko else ''}")
    print(f"Blank vi:  {len(blank_vi)} {blank_vi if blank_vi else ''}")

    if failures:
        print("\nFAILURES:")
        for f in failures:
            print(f"  - {f}")
        print("RESULT: FAIL")
        return 1
    print("\nRESULT: PASS — 240 words, 60 per set, 0 internal duplicates, "
          "0 overlaps with existing game words.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
