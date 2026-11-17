#!/usr/bin/env python3
"""Build V11 index.html from the V6 Bilingual build + V15 + V16 + V17 + V18 + V19.

V6 code is kept verbatim. V15 (English expansion), V16 (Smart Import),
V17 (Built-in Vocabulary Library) and V18 (30 new bosses) and V19 (Boss Map + 30 Super Legendary bosses)
 are appended only:
  - <style id="v15">      : v15.css
  - <script id="v15data"> : v15_data.js + generated EN words (1000, A1-B2)
  - <script id="v15js">   : v15.js
  - <style id="v16">      : v16.css  (Smart Import wizard theme)
  - <script id="v16xlsx"> : vendor/xlsx-0.18.5.full.min.js (SheetJS, pinned,
                            vendored locally — no CDN, no API key)
  - <script id="v16js">   : v16.js
  - <style id="v17">      : v17.css  (Library theme)
  - <script id="v17data"> : v17_a1a2.js (1000 từ A1-A2, 19 chủ đề)
                            + v17_oxford.js (3396 từ Oxford, 136 bài)
  - <script id="v17js">   : v17.js   (Library UI)
  - <style id="v18">      : v18.css  (Boss arenas / collection / fight theme)
  - <script id="v18data"> : v18_data.js (30 boss definitions + 10 old
                            bosses for the Collection display)
  - <script id="v18js">   : v18.js   (3 arenas, Boss Collection, upgraded
                            battle engine: element skills, legendary
                            3-phase fights, once-only first-win rewards)
  - <style id="v19">      : v19.css  (Boss Map / zone detail / UCE fight theme)
  - <script id="v19data"> : v19_data.js (10 zones x 3 bosses, 5 skills each,
                            bilingual mastery, stars, zone rewards)
  - <script id="v19js">   : v19.js   (interactive Boss Map, Universal Combat
                            Engine: tactical skills, passives, ultimates
                            with Knowledge Counterattack, awakening /
                            berserk phases, once-only first-win rewards
                            per language)

V19 hooks into v15.js only through 2 guarded surgical edits: a "map" hub
tab and version '11.0.0'. V18's Collection is extended (guarded) with the
30 V11 bosses; V18's fight engine is untouched.

Boss images: src/bosses11/v11_*.png (30 PNGs cut from Anh's poster by
tools/split_bosses_v11.py — 3 transparent cutouts + 27 tight portraits;
see ASSET_REPORT_V11.md) are copied to out/assets/bosses/v11/.

V18 hooks into v15.js only through 3 guarded surgical edits (see
CHANGED_FILES.md): a "collection" hub tab, the bosses tab appending
__v18.arenasHTML(), and version '10.0.0'. The 10 original V15 bosses
still fight in v15.js untouched.

Usage:  python3 build_v11.py [--src DIR] [--out DIR]
Default src: /tmp/v6 (re-extract from the uploaded V6 ZIP if missing).
Default out: out/ next to this script.
"""
import argparse
import json
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE  # this script lives in ~/workspace/v7build/


def load_words(data_dir):
    words = []
    seen = set()
    for name in sorted(data_dir.glob("batch-*.json")):
        batch = json.loads(name.read_text(encoding="utf-8"))
        for w in batch:
            key = (w.get("en") or "").strip().lower()
            if not key or key in seen:
                continue
            seen.add(key)
            words.append({
                "level": w.get("level", "A1"),
                "topic": w.get("topic", "daily"),
                "en": w.get("en", ""),
                "vi": w.get("vi", ""),
                "ipa": w.get("ipa", ""),
                "pos": w.get("pos", "n"),
                "ex": w.get("ex", ""),
                "exvi": w.get("exvi", ""),
            })
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="/tmp/v6")
    ap.add_argument("--out", default=str(ROOT / "out"))
    args = ap.parse_args()

    src = pathlib.Path(args.src)
    out = pathlib.Path(args.out)
    data_dir = ROOT / "data"
    src_dir = ROOT / "src"

    v6_html_path = src / "Korean_Vocab_Farm_V6_Bilingual.html"
    assert v6_html_path.exists(), f"V6 html not found: {v6_html_path}"
    html = v6_html_path.read_text(encoding="utf-8")
    assert 'id="v14js"' in html, "expected V6 Bilingual build (v14 layer missing)"
    assert 'id="v15js"' not in html, "V15 already present in input"
    assert 'id="v16js"' not in html, "V16 already present in input"
    assert 'id="v17js"' not in html, "V17 already present in input"
    assert 'id="v18js"' not in html, "V18 already present in input"
    assert 'id="v19js"' not in html, "V19 already present in input"

    words = load_words(data_dir)
    print(f"EN words from batches: {len(words)}")
    by_level = {}
    for w in words:
        by_level[w["level"]] = by_level.get(w["level"], 0) + 1
    print("by level:", by_level)
    assert len(words) >= 1000, f"only {len(words)} new EN words, need >= 1000"
    assert all(w["en"] and w["vi"] and w["ipa"] for w in words), "word missing en/vi/ipa"

    # --- V17 library data: validate counts before building ---
    a1a2 = json.loads((data_dir / "v17_a1a2.json").read_text(encoding="utf-8"))
    oxford = json.loads((data_dir / "v17_oxford.json").read_text(encoding="utf-8"))
    assert len(a1a2) == 1000, f"A1-A2 data has {len(a1a2)} words, expected 1000"
    assert len(oxford) == 3396, f"Oxford data has {len(oxford)} words, expected 3396"
    assert len({r["topic"] for r in a1a2}) == 19, "A1-A2 topics != 19"
    assert max(r["lesson"] for r in oxford) == 136, "Oxford lessons != 136"
    assert all(r["en"] and r["vi"] for r in a1a2 + oxford), "library word missing en/vi"
    print(f"V17 library: A1-A2 {len(a1a2)} words / 19 topics; Oxford {len(oxford)} words / 136 lessons")

    # --- V18 boss data: validate 30 new bosses, no ID collision ---
    v18_data = (src_dir / "v18_data.js").read_text(encoding="utf-8")
    new_ids = re.findall(r"id:'(v10_[a-z0-9_]+)'", v18_data)
    assert len(new_ids) == 30, f"V18 data has {len(new_ids)} new boss ids, expected 30"
    assert len(set(new_ids)) == 30, "duplicate V18 boss ids"
    old_ids = {'slime', 'goblin', 'dragon', 'ghost', 'spider', 'owl', 'tiger',
               'wizard', 'dictionary', 'king'}
    assert not (set(new_ids) & old_ids), "V18 id collides with a V15 boss id"
    for arena in ('en', 'el', 'leg'):
        block = re.search(r"__V18_BOSSES\." + arena + r" = \[(.*?)\];",
                          v18_data, re.S)
        assert block, f"V18 arena {arena} missing"
        n = len(re.findall(r"id:'v10_", block.group(1)))
        assert n == 10, f"V18 arena {arena} has {n} bosses, expected 10"
    boss_pngs = sorted((src_dir / "bosses").glob("v10_*.png"))
    assert len(boss_pngs) == 30, f"src/bosses has {len(boss_pngs)} PNGs, expected 30"
    for bid in new_ids:
        assert (src_dir / "bosses" / (bid + ".png")).exists(), f"missing PNG for {bid}"
    print(f"V18 bosses: 30 new (10/10/10 per arena), 30 PNGs, 0 id collisions")

    # --- V19 boss map data: validate 10 zones x 3 bosses, no ID collision ---
    v19_data = (src_dir / "v19_data.js").read_text(encoding="utf-8")
    new19_ids = re.findall(r"B\('(v11_[a-z0-9_]+)'", v19_data)
    assert len(new19_ids) == 30, f"V19 data has {len(new19_ids)} new boss ids, expected 30"
    assert len(set(new19_ids)) == 30, "duplicate V19 boss ids"
    assert not (set(new19_ids) & old_ids), "V19 id collides with a V15 boss id"
    assert not (set(new19_ids) & set(new_ids)), "V19 id collides with a V18 boss id"
    for z in range(1, 11):
        zblock = re.search(r"\{id:'z%d'.*?bosses:\[([^\]]+)\]" % z, v19_data, re.S)
        assert zblock, f"V19 zone z{z} missing"
        n = len(re.findall(r"'v11_", zblock.group(1)))
        assert n == 3, f"V19 zone z{z} has {n} bosses, expected 3"
    boss11_pngs = sorted((src_dir / "bosses11").glob("v11_*.png"))
    assert len(boss11_pngs) == 30, f"src/bosses11 has {len(boss11_pngs)} PNGs, expected 30"
    for bid in new19_ids:
        assert (src_dir / "bosses11" / (bid + ".png")).exists(), f"missing PNG for {bid}"
    print(f"V19 bosses: 30 new (10 zones x 3), 30 PNGs, 0 id collisions")

    v15_data = (src_dir / "v15_data.js").read_text(encoding="utf-8")
    v15_js = (src_dir / "v15.js").read_text(encoding="utf-8")
    v15_css = (src_dir / "v15.css").read_text(encoding="utf-8")
    v16_js = (src_dir / "v16.js").read_text(encoding="utf-8")
    v16_css = (src_dir / "v16.css").read_text(encoding="utf-8")
    xlsx_js = (src_dir / "vendor" / "xlsx-0.18.5.full.min.js").read_text(encoding="utf-8")
    v17_a1a2_js = (src_dir / "v17_a1a2.js").read_text(encoding="utf-8")
    v17_oxford_js = (src_dir / "v17_oxford.js").read_text(encoding="utf-8")
    v17_js = (src_dir / "v17.js").read_text(encoding="utf-8")
    v17_css = (src_dir / "v17.css").read_text(encoding="utf-8")
    v18_js = (src_dir / "v18.js").read_text(encoding="utf-8")
    v18_css = (src_dir / "v18.css").read_text(encoding="utf-8")
    v19_js = (src_dir / "v19.js").read_text(encoding="utf-8")
    v19_css = (src_dir / "v19.css").read_text(encoding="utf-8")
    for name, txt in [("v15_data.js", v15_data), ("v15.js", v15_js),
                      ("v15.css", v15_css), ("v16.js", v16_js),
                      ("v16.css", v16_css), ("xlsx vendor", xlsx_js),
                      ("v17_a1a2.js", v17_a1a2_js), ("v17_oxford.js", v17_oxford_js),
                      ("v17.js", v17_js), ("v17.css", v17_css),
                      ("v18_data.js", v18_data), ("v18.js", v18_js),
                      ("v18.css", v18_css), ("v19_data.js", v19_data),
                      ("v19.js", v19_js), ("v19.css", v19_css)]:
        assert "</script>" not in txt.lower(), f"{name} contains </script>"
        assert txt.strip(), f"{name} is empty"
    assert "window.XLSX" in xlsx_js or "XLSX" in xlsx_js, "vendor file is not SheetJS"
    assert "__v16" in v16_js, "v16.js does not expose __v16"
    assert "__v17" in v17_js, "v17.js does not expose __v17"
    assert "__V17_A1A2" in v17_a1a2_js, "v17_a1a2.js missing __V17_A1A2"
    assert "__V17_OXFORD" in v17_oxford_js, "v17_oxford.js missing __V17_OXFORD"
    assert "pushV17IntoV14" in v15_js, "v15.js missing V17 push (buildWords integration)"
    assert "library" in v15_js, "v15.js missing library tab"
    assert "__V18_BOSSES" in v18_data, "v18_data.js missing __V18_BOSSES"
    assert "__v18" in v18_js, "v18.js does not expose __v18"
    assert "collection" in v15_js, "v15.js missing V18 collection tab hook"
    assert "arenasHTML" in v15_js, "v15.js missing V18 arenas hook"
    assert "__V19_DATA" in v19_data, "v19_data.js missing __V19_DATA"
    assert "__v19" in v19_js, "v19.js does not expose __v19"
    assert "map" in v15_js, "v15.js missing V19 map tab hook"
    assert "zoneDetail" in v19_js, "v19.js missing zoneDetail"
    assert "resolveUltimate" in v19_js, "v19.js missing Knowledge Counterattack"
    assert "version:'11.0.0'" in v15_js, "v15.js version is not 11.0.0"

    words_js = (
        "window.__V15_DATA = window.__V15_DATA || {};\n"
        "window.__V15_DATA.words = "
        + json.dumps(words, ensure_ascii=False)
        + ";\n"
    )
    layer = (
        '\n<style id="v15">\n' + v15_css + "\n</style>\n"
        '<script id="v15data">\n' + v15_data + "\n" + words_js + "</script>\n"
        '<script id="v15js">\n' + v15_js + "\n</script>\n"
        '\n<style id="v16">\n' + v16_css + "\n</style>\n"
        '<script id="v16xlsx" src="vendor/xlsx-0.18.5.full.min.js"></script>\n'
        '<script id="v16js">\n' + v16_js + "\n</script>\n"
        '\n<style id="v17">\n' + v17_css + "\n</style>\n"
        '<script id="v17data">\n' + v17_a1a2_js + "\n" + v17_oxford_js + "\n</script>\n"
        '<script id="v17js">\n' + v17_js + "\n</script>\n"
        '\n<style id="v18">\n' + v18_css + "\n</style>\n"
        '<script id="v18data">\n' + v18_data + "\n</script>\n"
        '<script id="v18js">\n' + v18_js + "\n</script>\n"
        '\n<style id="v19">\n' + v19_css + "\n</style>\n"
        '<script id="v19data">\n' + v19_data + "\n</script>\n"
        '<script id="v19js">\n' + v19_js + "\n</script>\n"
    )
    assert "</body>" in html
    html = html.replace("</body>", layer + "</body>", 1)
    html = html.replace(
        "<title>Học từ vựng tiếng Hàn – Korean Vocab Farm V6 Bilingual</title>",
        "<title>Korean &amp; English Vocab Farm V11 — Boss Adventure — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>",
        1,
    )

    # --- copy the whole V6 tree, then overwrite index.html with the build ---
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(src, out)
    (out / "index.html").write_text(html, encoding="utf-8")
    # keep the V15/V16/V17/V18 sources alongside for future edits
    (out / "v15_data.js").write_text(v15_data, encoding="utf-8")
    (out / "v15.js").write_text(v15_js, encoding="utf-8")
    (out / "v15.css").write_text(v15_css, encoding="utf-8")
    (out / "v15_words.json").write_text(
        json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    (out / "v16.js").write_text(v16_js, encoding="utf-8")
    (out / "v16.css").write_text(v16_css, encoding="utf-8")
    (out / "vendor").mkdir(exist_ok=True)
    (out / "vendor" / "xlsx-0.18.5.full.min.js").write_text(xlsx_js, encoding="utf-8")
    (out / "v17.js").write_text(v17_js, encoding="utf-8")
    (out / "v17.css").write_text(v17_css, encoding="utf-8")
    (out / "v17_a1a2.js").write_text(v17_a1a2_js, encoding="utf-8")
    (out / "v17_oxford.js").write_text(v17_oxford_js, encoding="utf-8")
    (out / "v17_a1a2.json").write_text(
        json.dumps(a1a2, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    (out / "v17_oxford.json").write_text(
        json.dumps(oxford, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    review = json.loads((data_dir / "v17_review.json").read_text(encoding="utf-8"))
    (out / "v17_review.json").write_text(
        json.dumps(review, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    (out / "v18_data.js").write_text(v18_data, encoding="utf-8")
    (out / "v18.js").write_text(v18_js, encoding="utf-8")
    (out / "v18.css").write_text(v18_css, encoding="utf-8")
    v10_dir = out / "assets" / "bosses" / "v10"
    v10_dir.mkdir(parents=True, exist_ok=True)
    for p in boss_pngs:
        shutil.copy2(p, v10_dir / p.name)
    (out / "assets" / "bosses" / "v10" / "manifest.json").write_text(
        (src_dir / "bosses" / "manifest.json").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    # sample files (generated by gen_samples.js)
    samples = ROOT / "samples"
    assert samples.is_dir() and any(samples.iterdir()), "samples/ missing — run gen_samples.js first"
    if (out / "samples").exists():
        shutil.rmtree(out / "samples")
    shutil.copytree(samples, out / "samples")
    (out / "v19_data.js").write_text(v19_data, encoding="utf-8")
    (out / "v19.js").write_text(v19_js, encoding="utf-8")
    (out / "v19.css").write_text(v19_css, encoding="utf-8")
    v11_dir = out / "assets" / "bosses" / "v11"
    v11_dir.mkdir(parents=True, exist_ok=True)
    for p in boss11_pngs:
        shutil.copy2(p, v11_dir / p.name)
    (out / "assets" / "bosses" / "v11" / "manifest.json").write_text(
        (src_dir / "bosses11" / "manifest_v11.json").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    (out / "tools").mkdir(exist_ok=True)
    (out / "tools" / "split_bosses_v11.py").write_text(
        (HERE / "tools" / "split_bosses_v11.py").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    (out / "build_v11.py").write_text(
        (HERE / "build_v11.py").read_text(encoding="utf-8"), encoding="utf-8"
    )
    (out / "gen_samples.js").write_text(
        (HERE / "gen_samples.js").read_text(encoding="utf-8"), encoding="utf-8"
    )
    print(f"built {out / 'index.html'} ({len(html)/1024:.0f} KB)")
    print(f"total EN words in app: {96 + len(words)} V14+V15 + up to {len(a1a2)+len(oxford)} library entries (deduped into one record per word)")
    print(f"V18: 30 boss PNGs copied to assets/bosses/v10/ ({sum(p.stat().st_size for p in boss_pngs)/1024/1024:.1f} MB)")
    print(f"V19: 30 boss PNGs copied to assets/bosses/v11/ ({sum(p.stat().st_size for p in boss11_pngs)/1024/1024:.1f} MB)")
    print(f"vendor: xlsx-0.18.5.full.min.js ({len(xlsx_js)/1024:.0f} KB), samples: {sorted(p.name for p in samples.iterdir())}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
