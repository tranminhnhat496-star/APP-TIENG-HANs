#!/usr/bin/env python3
"""Validate V35 SKYROOT SANCTUARY vocabulary (data/v35_words.json).

Checks (modelled on tools/v33/validate_words.py, extended):
  - total 240, 60 per set (climate / science / society / mind)
  - 30 EN-led + 30 KO-led per set (120 + 120 total)
  - every entry has exactly the 10 required keys, pos in the allowed set
  - id is 'v35_<slug>' with the V33 slug rule, slugs unique
  - no duplicate `en` (case-insensitive) and no duplicate `ko` inside the 240
  - no overlap with existing game headwords, extracted live from source
    (EN side AND KO side — V33 only checked EN):
      * V7 1000 new words:  data/batch-a1/a2/b1/b2.json
      * V6 96 EN words:     out/v14.js (ENWORDS array rows)
      * V6 Korean tokens:   distinct Hangul tokens (len>=2) from
        out/index.html + out/Korean_Vocab_Farm_V6_Bilingual.html
        (the V6 Korean game has no clean 96-headword list in source;
        this conservative token set covers every Korean word the base
        game actually shows — cards, quiz items, examples)
      * Library A1-A2 1000: data/v17_a1a2.json
      * Library Oxford 3396: data/v17_oxford.json
      * Basic Tactics 819:  data/v22_basictactics.json (words + phrases)
      * Chrono 240 (EN+KO): data/v33_words.json
  - `ko` field contains Hangul; `en` field contains no Hangul
  - no blank en / ko / vi / ex / exvi; lists blank ipa (allowed, never invented)
  - every example sentence contains its headword (case-insensitive,
    except the Korean proper nouns Chuseok / Seollal / hanbok / kimjang /
    ondol / pansori / samulnori / sarangbang / jeong / nunchi / han /
    heung, whose examples use the English headword itself — same rule)

Usage: python3 tools/v35/validate_words35.py   (run from ~/workspace/v7build/)
Exit code 0 = all hard checks pass; 1 = any failure.
"""
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORDS_PATH = os.path.join(ROOT, "data", "v35_words.json")
SETS = ["climate", "science", "society", "mind"]
ALLOWED_POS = {"noun", "verb", "adjective", "adverb"}
REQUIRED_KEYS = {"id", "set", "led", "en", "ko", "vi", "ipa", "pos", "ex", "exvi"}
HANGUL = re.compile(r"[가-힣]")

failures = []


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def slug(en):
    return re.sub(r"[^a-z0-9]+", "_", (en or "").lower()).strip("_")


def extract_existing():
    """Return (en_map, ko_map, counts). Lowercased headword -> source label."""
    en, ko = {}, {}
    counts_en, counts_ko = {}, {}

    def add_en(words, src):
        n = 0
        for w in words:
            k = str(w).strip().lower()
            if k:
                n += 1
                en.setdefault(k, src)
        counts_en[src] = n

    def add_ko(words, src):
        n = 0
        for w in words:
            k = str(w).strip()
            if k:
                n += 1
                ko.setdefault(k, src)
        counts_ko[src] = n

    for name in ("a1", "a2", "b1", "b2"):
        p = os.path.join(ROOT, "data", f"batch-{name}.json")
        add_en([x["en"] for x in load_json(p)], f"V7-batch-{name}")

    p = os.path.join(ROOT, "out", "v14.js")
    txt = open(p, encoding="utf-8", errors="ignore").read()
    seg = txt[txt.index("ENWORDS=["):txt.index("];", txt.index("ENWORDS=["))]
    rows = re.findall(r"\[\s*'[^']*'\s*,\s*'((?:[^'\\]|\\.)*)'", seg)
    add_en(rows, "V6-out/v14.js")

    for fname, src in (("v17_a1a2.json", "Library-A1A2"),
                       ("v17_oxford.json", "Library-Oxford")):
        p = os.path.join(ROOT, "data", fname)
        add_en([x["en"] for x in load_json(p)], src)

    p = os.path.join(ROOT, "data", "v22_basictactics.json")
    bt = load_json(p)
    add_en([w["en"] for u in bt["units"] for w in u["words"]], "BasicTactics-words")
    add_en([w["en"] for u in bt["units"] for w in u["phrases"]], "BasicTactics-phrases")

    ch = load_json(os.path.join(ROOT, "data", "v33_words.json"))
    add_en([x["en"] for x in ch], "Chrono-v33")
    add_ko([x["ko"] for x in ch], "Chrono-v33")

    for fname, src in (("out/index.html", "V6-base-index.html"),
                       ("out/Korean_Vocab_Farm_V6_Bilingual.html", "V6-original-html")):
        t = open(os.path.join(ROOT, fname), encoding="utf-8", errors="ignore").read()
        if fname == "out/index.html":
            # H-35-1 (test-agent fix, 2026-11-19): out/index.html is the
            # CURRENT build, so it now embeds the V35 data layer itself
            # (<script id="v35data">). Tokenising it raw made all 189
            # V35 KO values "overlap" with themselves (validator exit 1
            # on a correct build; the word-prep run passed only because
            # out/ was still the V17.1 build). The words under test are
            # the subject, not "existing" words — strip the V35 blocks
            # before extracting the pre-existing Korean tokens. Verified:
            # with the strip, 0 full V35 ko values occur in the rest of
            # the build (pristine V6 file alone: 0 overlaps too).
            t = re.sub(r'<script id="v35data">.*?</script>', '', t, flags=re.S)
            t = re.sub(r'<script id="v35js">.*?</script>', '', t, flags=re.S)
        add_ko(sorted(set(re.findall(r"[가-힣]{2,}", t))), src)

    return en, ko, counts_en, counts_ko


def main():
    words = load_json(WORDS_PATH)
    print(f"V35 words file: {WORDS_PATH}")
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

    per_led = Counter((w.get("set"), w.get("led")) for w in words)
    for s in SETS:
        for led in ("en", "ko"):
            n = per_led.get((s, led), 0)
            print(f"  set {s} / led {led}: {n} (expected 30)")
            if n != 30:
                failures.append(f"set {s} / led {led} has {n}, expected 30")
    print(f"  EN-led total: {sum(1 for w in words if w.get('led') == 'en')} (expected 120)")
    print(f"  KO-led total: {sum(1 for w in words if w.get('led') == 'ko')} (expected 120)")

    # Schema checks
    seen_slugs = set()
    for i, w in enumerate(words):
        keys = set(w.keys())
        if keys != REQUIRED_KEYS:
            failures.append(f"entry {i} ({w.get('en')!r}): keys {sorted(keys)} != {sorted(REQUIRED_KEYS)}")
        if w.get("pos") not in ALLOWED_POS:
            failures.append(f"entry {i} ({w.get('en')!r}): bad pos {w.get('pos')!r}")
        if w.get("led") not in ("en", "ko"):
            failures.append(f"entry {i} ({w.get('en')!r}): bad led {w.get('led')!r}")
        sl = slug(w.get("en", ""))
        if w.get("id") != "v35_" + sl:
            failures.append(f"entry {i} ({w.get('en')!r}): id {w.get('id')!r} != 'v35_{sl}'")
        if sl in seen_slugs:
            failures.append(f"entry {i} ({w.get('en')!r}): slug collision {sl!r}")
        seen_slugs.add(sl)
        for f in ("en", "ko", "vi", "ex", "exvi"):
            if not str(w.get(f, "")).strip():
                failures.append(f"entry {i} ({w.get('en')!r}): empty {f}")
        if not HANGUL.search(str(w.get("ko", ""))):
            failures.append(f"entry {i} ({w.get('en')!r}): ko {w.get('ko')!r} has no Hangul")
        if HANGUL.search(str(w.get("en", ""))):
            failures.append(f"entry {i} ({w.get('en')!r}): en contains Hangul")
        # example sentence should contain the headword (case-insensitive)
        en = str(w.get("en", ""))
        if en and en.lower() not in str(w.get("ex", "")).lower():
            failures.append(f"entry {i} ({en!r}): example does not contain headword")

    # Duplicates inside the 240 (case-insensitive EN, exact KO)
    for field, norm in (("en", lambda s: str(s).strip().lower()),
                        ("ko", lambda s: str(s).strip())):
        seen, dupes = {}, []
        for w in words:
            k = norm(w.get(field, ""))
            if k in seen:
                dupes.append(k)
            else:
                seen[k] = True
        print(f"Duplicate {field} inside V35 (case-insensitive): {len(dupes)} {dupes if dupes else ''}")
        if dupes:
            failures.append(f"internal duplicate {field}: {dupes}")

    # Overlap with existing game words (EN and KO)
    en_map, ko_map, counts_en, counts_ko = extract_existing()
    print("Existing headwords extracted per source (EN):")
    for src, n in counts_en.items():
        print(f"  {src}: {n} rows")
    print(f"  unique existing EN headwords total: {len(en_map)}")
    print("Existing headwords extracted per source (KO):")
    for src, n in counts_ko.items():
        print(f"  {src}: {n} rows")
    print(f"  unique existing KO headwords total: {len(ko_map)}")
    overlaps = []
    for w in words:
        e = str(w["en"]).strip().lower()
        k = str(w["ko"]).strip()
        if e in en_map:
            overlaps.append((w["en"], "EN", en_map[e]))
        if k in ko_map:
            overlaps.append((w["ko"], "KO", ko_map[k]))
    print(f"Overlaps with existing game words: {len(overlaps)}")
    for head, side, src in overlaps:
        print(f"  OVERLAP: {side} {head!r} (source: {src})")
    if overlaps:
        failures.append(f"{len(overlaps)} overlaps with existing words")

    # Blank-field lists (blank IPA is allowed; everything else must be filled)
    blank_ipa = [w["en"] for w in words if not str(w.get("ipa", "")).strip()]
    blank_ex = [w["en"] for w in words if not str(w.get("ex", "")).strip()]
    blank_exvi = [w["en"] for w in words if not str(w.get("exvi", "")).strip()]
    print(f"Blank ipa: {len(blank_ipa)} {blank_ipa if blank_ipa else ''}")
    print(f"Blank ex: {len(blank_ex)} {blank_ex if blank_ex else ''}")
    print(f"Blank exvi: {len(blank_exvi)} {blank_exvi if blank_exvi else ''}")
    if blank_ex or blank_exvi:
        failures.append(f"blank ex/exvi: {blank_ex + blank_exvi}")

    if failures:
        print("\nFAILURES:")
        for f in failures:
            print(f"  - {f}")
        print("RESULT: FAIL")
        return 1
    print("\nRESULT: PASS — 240 words, 60 per set, 120 EN-led + 120 KO-led, "
          "0 internal duplicates, 0 overlaps with existing game words.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
