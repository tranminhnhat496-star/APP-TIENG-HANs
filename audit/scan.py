#!/usr/bin/env python3
"""Runtime reference scan for Vocab Farm V15.3 (read-only).
Corpus: index.html + all root *.js + *.css in the clone.
Outputs provisional per-file verdicts; human review follows for UNKNOWNs.
"""
import hashlib
import json
import os
import re
import sys
from pathlib import Path

CLONE = Path('/home/hatch/workspace/v7build/audit/clone')
OUT = Path('/home/hatch/workspace/v7build/audit')

def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()

def norm(s: str) -> str:
    return re.sub(r'\s+', '', s)

# ---------- corpus ----------
html = (CLONE / 'index.html').read_text(encoding='utf-8', errors='replace')
js_files = sorted(CLONE.glob('v*.js')) + [CLONE / 'firebase-config.js']
css_files = sorted(CLONE.glob('v*.css'))
corpus_parts = {'index.html': html}
for f in js_files + css_files:
    corpus_parts[f.name] = f.read_text(encoding='utf-8', errors='replace')
corpus = '\n'.join(corpus_parts.values())
print(f"corpus files: {list(corpus_parts)}")
print(f"corpus chars: {len(corpus)}")

# ---------- 1. inline check: is each root layer file inlined in index.html? ----------
print("\n=== INLINE CHECK (root layer file content present in index.html?) ===")
for f in sorted(list(js_files) + list(css_files)):
    txt = f.read_text(encoding='utf-8', errors='replace')
    # take 3 distinctive long chunks (strip comments first? keep raw)
    lines = [l for l in txt.splitlines() if len(l.strip()) > 60]
    hits = 0
    tested = 0
    for l in lines[:6]:
        chunk = norm(l)[:150]
        if len(chunk) < 60:
            continue
        tested += 1
        if chunk in norm(html):
            hits += 1
    print(f"  {f.name:16} lines>60:{len(lines):3} tested:{tested} matched:{hits}  {'INLINED' if tested and hits == tested else ('PARTIAL' if hits else 'NOT-FOUND')}")

# ---------- 2. literal asset refs ----------
print("\n=== LITERAL 'assets/...' STRINGS IN CORPUS (unique) ===")
lits = sorted(set(re.findall(r"['\"](assets/[^'\"\)\s]+)['\"]", corpus)))
lits += sorted(set(re.findall(r"url\(\s*['\"]?(assets/[^)'\"\s]+)['\"]?\s*\)", corpus)))
for l in sorted(set(lits)):
    print("  ", l)
print("total unique literal asset refs:", len(set(lits)))

# ---------- 3. fetch / XHR / dynamic script ----------
print("\n=== FETCH/XHR/DYNAMIC-SCRIPT SITES ===")
for fname, txt in corpus_parts.items():
    for m in re.finditer(r'.{0,80}(fetch\s*\(|XMLHttpRequest|createElement\(\s*[\'"]script[\'"]|importScripts).{0,120}', txt):
        print(f"  {fname}: ...{m.group(0).strip()[:200]}")

# ---------- 4. ID sets ----------
def ids_from(pattern, files):
    out = set()
    for f in files:
        t = (CLONE / f).read_text(encoding='utf-8', errors='replace') if isinstance(f, str) else f
        out |= set(re.findall(pattern, t))
    return out

v18 = (CLONE / 'v18_data.js').read_text(encoding='utf-8', errors='replace')
v19 = (CLONE / 'v19_data.js').read_text(encoding='utf-8', errors='replace')
v23d = (CLONE / 'v23_data.js').read_text(encoding='utf-8', errors='replace')
v21 = (CLONE / 'v21.js').read_text(encoding='utf-8', errors='replace')
v10 = (CLONE / 'v10.js').read_text(encoding='utf-8', errors='replace')

print("\n=== ID SETS ===")
print("v18 img paths:", sorted(set(re.findall(r"img:'(assets/bosses/[^']+)'", v18))))
print("v19 B ids:", sorted(set(re.findall(r"B\('(v11_[^']+)'", v19))))
print("v23 stage imgs:", sorted(set(re.findall(r"img:'([a-z_]+_s[123]\.png)'", v23d))))
print("v23 egg imgs:", sorted(set(re.findall(r"img:'(egg_[a-z]+\.png)'", v23d))))
print("v21 avatar ids:", sorted(set(re.findall(r"\{id:'([a-z]+)',\s+name:", v21))))
print("v10 decor ids:", sorted(set(re.findall(r"\{id:'([a-z_]+)',n:", v10))))
print("v13 boss art usage: assets/bosses/'+b.art+'.png ; art values in v18 old bosses:",
      sorted(set(re.findall(r"img:'assets/bosses/([a-z_0-9]+\.png)'", v18))))
print("CROPS v7:", re.findall(r"var CROPS=\[([^\]]+)\]", (CLONE / 'v7.js').read_text()))
print("CROPS v15:", re.findall(r"var CROPS=\[([^\]]+)\]", (CLONE / 'v15.js').read_text()))
print("v12 icon values:", sorted(set(re.findall(r"icon:'([^']+)'", (CLONE / 'v12.js').read_text()))))
print("v13 icon values:", sorted(set(re.findall(r"icon:'([^']+)'", (CLONE / 'v13.js').read_text()))))
print("enIcon/icon15 call args:")
for f in ['v14.js', 'v15.js', 'v17.js', 'v22.js', 'v18.js', 'v19.js', 'v23.js']:
    t = (CLONE / f).read_text(encoding='utf-8', errors='replace')
    args = sorted(set(re.findall(r"(?:enIcon|icon15)\('([^']+)'\)", t)))
    if args:
        print(f"  {f}: {args}")
print("icon15/enIcon with variable arg (dynamic):")
for f in ['v14.js', 'v15.js', 'v17.js', 'v22.js']:
    t = (CLONE / f).read_text(encoding='utf-8', errors='replace')
    for m in re.finditer(r"(?:enIcon|icon15)\(([^)'\"]+)\)", t):
        a = m.group(1).strip()
        if not a.startswith("'"):
            print(f"  {f}: {a}")

# ---------- 5. _old_svg / V6 html / samples references ----------
print("\n=== MISC REFERENCE CHECKS (code corpus only) ===")
for pat in ['_old_svg', 'Korean_Vocab_Farm_V6_Bilingual', 'korean-sample.csv',
            'korean-sample.xlsx', 'english-sample.csv', 'english-sample.xlsx',
            'vocab-sample.json', 'manifest.json', 'ICON_MAP.json',
            'v22_basictactics.json', 'basic_tactics_vocabulary.json',
            'v15_words.json', 'v17_a1a2.json', 'v17_oxford.json', 'v17_review.json',
            'v22_basictactics_report.json', 'xlsx', 'vendor/']:
    print(f"  {pat!r}: corpus occurrences = {corpus.count(pat)}")
print("\n=== same checks in build scripts + docs (for build/doc-only refs) ===")
import glob
for pat in ['_old_svg', 'ICON_MAP.json', 'manifest.json', 'v22_basictactics.json',
            'basic_tactics_vocabulary.json', 'v15_words.json', 'v17_a1a2.json',
            'v17_oxford.json', 'v17_review.json', 'v22_basictactics_report.json',
            'Korean_Vocab_Farm_V6_Bilingual', 'samples/', 'vendor/']:
    hits = []
    for f in sorted(glob.glob(str(CLONE / '*.py'))) + sorted(glob.glob(str(CLONE / '*.md'))):
        t = Path(f).read_text(encoding='utf-8', errors='replace')
        if pat in t:
            hits.append(Path(f).name)
    print(f"  {pat!r}: in py/md: {hits}")

# ---------- 6. data-file inlining ----------
print("\n=== DATA FILES: embedded in index.html? ===")
for f in ['v15_data.js', 'v18_data.js', 'v19_data.js', 'v23_data.js',
          'v17_a1a2.js', 'v17_oxford.js', 'v15_words.json', 'v17_a1a2.json',
          'v17_oxford.json', 'v17_review.json']:
    p = CLONE / f
    txt = p.read_text(encoding='utf-8', errors='replace')
    lines = [l for l in txt.splitlines() if len(l.strip()) > 80][:4]
    hits = 0
    for l in lines:
        if norm(l)[:150] in norm(html):
            hits += 1
    print(f"  {f:20} size={p.stat().st_size:8} sample-lines={len(lines)} matched={hits}")
print("\n=== build scripts reading data files ===")
for f in sorted(CLONE.glob('*.py')):
    t = f.read_text(encoding='utf-8', errors='replace')
    refs = [x for x in ['v15_words.json', 'v17_a1a2.json', 'v17_oxford.json', 'v17_review.json',
                        'v22_basictactics.json', 'basic_tactics_vocabulary.json',
                        'ICON_MAP.json', 'manifest.json', 'v15_data.js', 'v17_a1a2.js',
                        'v17_oxford.js', 'src/', 'data/', '/tmp/v6', 'Korean_Vocab_Farm_V6_Bilingual']
            if x in t]
    if refs:
        print(f"  {f.name}: {refs}")
print("\n=== gen_samples.js refs ===")
t = (CLONE / 'gen_samples.js').read_text(encoding='utf-8', errors='replace')
print("  ", [x for x in ['samples/', 'vocab-sample', 'korean-sample', 'english-sample'] if x in t])

# ---------- 7. duplicate content hashes (in-scope files) ----------
print("\n=== DUPLICATE CONTENT (sha256) AMONG IN-SCOPE FILES ===")
scope = []
for p in sorted(CLONE.rglob('*')):
    if '.git' in p.parts:
        continue
    if not p.is_file():
        continue
    rel = str(p.relative_to(CLONE))
    if rel.startswith('assets/') or rel.startswith('vendor/') or rel.startswith('samples/') or \
       (('/' not in rel) and (rel.endswith('.js') or rel.endswith('.css') or rel.endswith('.json') or rel.endswith('.html'))):
        scope.append(rel)
print(f"in-scope files: {len(scope)}")
from collections import defaultdict
byhash = defaultdict(list)
for rel in scope:
    byhash[sha256(CLONE / rel)].append(rel)
for h, lst in byhash.items():
    if len(lst) > 1:
        sizes = [(x, (CLONE / x).stat().st_size) for x in lst]
        print(f"  sha256 {h[:16]}... size={sizes[0][1]}: {sizes}")
print("\n=== _old_svg file list ===")
for p in sorted(CLONE.rglob('_old_svg/*')):
    if p.is_file():
        print("  ", str(p.relative_to(CLONE)), p.stat().st_size)
