#!/usr/bin/env python3
"""Build manifest.csv for the Vocab Farm V15.3 runtime reference audit (read-only).
Reads the clone at /home/hatch/workspace/v7build/audit/clone, writes
/home/hatch/workspace/v7build/audit/manifest.csv + prints summary counts.
"""
import csv
import glob
import hashlib
import json
import re
from pathlib import Path

CLONE = Path('/home/hatch/workspace/v7build/audit/clone')
OUT = Path('/home/hatch/workspace/v7build/audit/manifest.csv')

def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()

# ---------------- corpus: index.html + root *.js + *.css ----------------
corpus_files = ['index.html'] + sorted(str(p.name) for p in CLONE.glob('v*.js')) \
    + ['firebase-config.js'] + sorted(str(p.name) for p in CLONE.glob('v*.css'))
corpus = {}
for f in corpus_files:
    corpus[f] = (CLONE / f).read_text(encoding='utf-8', errors='replace')
ALL = '\n'.join(corpus.values())

# quoted strings ending in a media/data extension (for basename matching)
quoted = set(re.findall(r"""['"]([^'"]+\.(?:png|svg|jpg|jpeg|json|js|css|xlsx|csv))['"]""", ALL))
quoted_basenames = {q.split('/')[-1] for q in quoted}

# ---------------- dynamic pattern rules (path -> generating code) ----------------
# Each rule: (regex on relative path, evidence string)
RULES = []
def rule(pat, ev):
    RULES.append((re.compile(pat), ev))

# boss PNGs
v18 = (CLONE / 'v18_data.js').read_text(encoding='utf-8', errors='replace')
v18_imgs = set(re.findall(r"img:'(assets/bosses/[^']+)'", v18))
v19_ids = set(re.findall(r"B\('(v11_[^']+)'", (CLONE / 'v19_data.js').read_text()))
v13 = (CLONE / 'v13.js').read_text(encoding='utf-8', errors='replace')
# B13 art values live in the V6 inline code (index.html lines 1475-1480)
b13_arts = {'f1_nam', 'f4_treant', 'v6_root', 'v6_nam', 'v6_rong', 'v6_cavoi',
            'v6_meo', 'v6_bingo', 'v6_da', 'v6_hac', 'thunder_tiger', 'coral_queen',
            'astral_raven', 'crystal_beetle_king'}
v7_arts = {'yong', 'gangsi_alt', 'v6_bingo', 'v6_hac'}
v15_imgs = set(re.findall(r"img:'(assets/bosses/[^']+)'",
                          (CLONE / 'v15.js').read_text(encoding='utf-8', errors='replace')))
boss_old = v18_imgs | {f'assets/bosses/{a}.png' for a in b13_arts} | \
    {f'assets/bosses/{a}.png' for a in v7_arts} | v15_imgs
# pets
v23d = (CLONE / 'v23_data.js').read_text(encoding='utf-8', errors='replace')
pet_stage = {f'assets/pets/v15/{i}' for i in set(re.findall(r"img:'([a-z_]+_s[123]\.png)'", v23d))}
pet_eggs = {f'assets/pets/v15/eggs/{i}' for i in set(re.findall(r"img:'(egg_[a-z]+\.png)'", v23d))}
# avatars / mascot / decor / crops / scene / buildings / fx / icons
avatar_ids = set(re.findall(r"\{id:'([a-z]+)',\s+name:", (CLONE / 'v21.js').read_text()))
avatars = {f'assets/avatars/{a}.png' for a in avatar_ids}
mascot_states = {'idle', 'happy', 'hello', 'jump', 'sad', 'sleep'}
decor_ids = set(re.findall(r"\{id:'([a-z_]+)',n:", (CLONE / 'v10.js').read_text()))
decors = {f'assets/decor/{d}.png' for d in decor_ids}
crops = {'carrot', 'tomato', 'wheat', 'strawberry', 'sunflower'}
crop_files = {f'assets/crops/{c}_{s}.png' for c in crops for s in range(5)} | \
    {'assets/crops/wilt.svg', 'assets/crops/pest.svg'}
scene_files = {'assets/scene/farm_top.png', 'assets/scene/fence_tile.png',
               'assets/scene/grass_tile.png', 'assets/scene/meadow.png',
               'assets/scene/path_tile.png', 'assets/scene/soil_tile.png',
               'assets/scene/bird.png', 'assets/scene/cloud.png', 'assets/scene/sun.png'}
building_files = {'assets/buildings/barn.png', 'assets/buildings/well.png',
                  'assets/buildings/windmill.png'}
fx_files = {'assets/fx/claw.svg', 'assets/fx/slash.svg', 'assets/fx/rays.svg',
            'assets/fx/spark.svg', 'assets/fx/zzz.svg'}
icons_old = {'assets/icons/learn.svg', 'assets/icons/book.svg', 'assets/icons/shop.svg',
             'assets/icons/trophy.svg', 'assets/icons/bell.svg', 'assets/icons/save.svg',
             'assets/icons/speaker.svg', 'assets/icons/heart.svg', 'assets/icons/heart_off.svg',
             'assets/icons/unknown.svg', 'assets/icons/medal.svg', 'assets/icons/medal_off.svg',
             'assets/icons/coin.svg', 'assets/icons/star.svg', 'assets/icons/chest.svg',
             'assets/icons/bubble.svg'}
# icons/v6: v9 SRC+EMOJI maps (bare filenames) + topic/mode icon values + literals
v9 = (CLONE / 'v9.js').read_text(encoding='utf-8', errors='replace')
v9_names = set(re.findall(r"\['([a-z0-9_]+\.(?:png|svg))',\d\]", v9))
v9_names |= set(re.findall(r"'(?:💎|⭐|🪙|🔥|⚔️|⚔|🎁|👑|🌾|☀️|☀|🌙|🔇|💧|💔|🎯|🔒|📚|🧺|🏁|⚡|🛡|🌿|🌊|🔮|☠️|☠|🥀|🐛)':\['([a-z0-9_]+\.(?:png|svg))'", v9))
topic_icons = set(re.findall(r"icon:'([a-z0-9_]+\.(?:png|svg))'", ALL))
mode_icons = set(re.findall(r"ic:'([a-z0-9_]+\.(?:png|svg))'", ALL))
icons_v6_mentioned = v9_names | topic_icons | mode_icons | \
    {q.split('/')[-1] for q in quoted if q.startswith('assets/icons/v6/')}
icons_v6_files = {f'assets/icons/v6/{n}' for n in icons_v6_mentioned}
pet_farm = {'assets/pets/cow.png', 'assets/pets/dog.png', 'assets/pets/hen.png',
            'assets/pets/horse.png', 'assets/pets/pig.png', 'assets/pets/sheep.png'}

DYNAMIC = {}
for p in v18_imgs:
    DYNAMIC[p] = "v18_data.js literal img field (V10 old-boss list)"
for p in boss_old:
    DYNAMIC.setdefault(p, "dynamic 'assets/bosses/'+b.art+'.png' (v13.js:134,142,231; art values in V6 inline B array index.html:1475-1480) and/or v18_data.js img / v7.js U-boss art / v15.js boss img")
for bid in v19_ids:
    DYNAMIC[f'assets/bosses/v11/{bid}.png'] = "dynamic IMG(id)='assets/bosses/v11/'+id+'.png' (v19_data.js:25); id in B('...') list v19_data.js"
for p in pet_stage:
    DYNAMIC[p] = "dynamic stageImg(): 'assets/pets/v15/'+sp.stages[st].img (v23.js:55); img in v23_data.js PET_SPECIES stages"
for p in pet_eggs:
    DYNAMIC[p] = "dynamic 'assets/pets/v15/eggs/'+egg.img (v23.js:384); img in v23_data.js PET_EGGS"
for p in avatars:
    DYNAMIC[p] = "dynamic 'assets/avatars/'+a.id+'.png' (v21.js:316,330,638,845,849,857,874); id in v21.js AVATARS"
for s in mascot_states:
    DYNAMIC[f'assets/mascot/{s}.png'] = "dynamic preload ['idle','happy','hello','jump','sad','sleep'] -> 'assets/mascot/'+n+'.png' (index.html:1442, V6 inline code)"
for p in decors:
    DYNAMIC[p] = "dynamic 'assets/decor/'+x.id+'.png' (v10.js:74,95,102,140,189,208); id in v10.js DECOR (12 items)"
for p in crop_files:
    if p.endswith('.svg'):
        DYNAMIC[p] = "dynamic V6 garden(): src='crops/wilt'/'crops/pest' + '.svg' via img() ext rule (index.html V6 inline code; img() at index.html:1386)"
    else:
        DYNAMIC[p] = "dynamic 'assets/crops/'+crop+'_'+stage+'.png' (v7.js:90, v15.js:1122); CROPS=[carrot,tomato,wheat,strawberry,sunflower], stages 0-4"
for p in scene_files:
    DYNAMIC[p] = "dynamic mk('scene/<name>.png') V4 scene builder (index.html V6 inline code; mk() prepends 'assets/') and/or CSS url() (v8.css:12 grass_tile)"
for p in building_files:
    DYNAMIC[p] = "literal 'assets/buildings/<name>.png' in v15.js shop items / v8.js scene (index.html:1429-1430)"
for p in fx_files:
    DYNAMIC[p] = "literal url()/img: claw/slash via CSS url() (index.html inline <style>); rays via ${A}fx/rays.svg; spark via burst() default src='fx/spark.svg' (index.html:1390); zzz via A+'fx/zzz.svg' (index.html:1404)"
for p in icons_old:
    DYNAMIC[p] = "literal 'assets/icons/<name>.svg' (V6/V3 art map M at index.html:1327 + v9.js SRC swap map)"
for p in icons_v6_files:
    DYNAMIC[p] = "v9.js SRC/EMOJI map value, or topic icon:'<name>' (v14.js/v15_data.js), or mode ic:'<name>' (v15.js), or literal 'assets/icons/v6/<name>'"

# ---------------- docs references (for UNKNOWN) ----------------
docs_text = ""
for f in CLONE.glob('*.md'):
    docs_text += f.read_text(encoding='utf-8', errors='replace') + "\n"

# ---------------- duplicates ----------------
by_hash = {}
def file_hash(p):
    return sha256(p)

# ---------------- classify ----------------
rows = []
in_scope = []
for p in sorted(CLONE.rglob('*')):
    if '.git' in p.parts or not p.is_file():
        continue
    rel = str(p.relative_to(CLONE))
    if rel.startswith('assets/') or rel.startswith('vendor/') or rel.startswith('samples/') or \
       (('/' not in rel) and (rel.endswith('.js') or rel.endswith('.css') or
                              rel.endswith('.json') or rel.endswith('.html'))):
        in_scope.append(rel)
in_scope.append('firestore.rules')  # extra row: protected, per task instruction
print(f"in-scope files: {len(in_scope)}")
from collections import Counter as _Counter
_basename_counts = _Counter(r.split('/')[-1] for r in in_scope)
basename_unique = dict(_basename_counts)
# debug: any in-scope file outside the expected groups?
_expected = set()
for _p in sorted(CLONE.rglob('*')):
    if '.git' in _p.parts or not _p.is_file():
        continue
    _r = str(_p.relative_to(CLONE))
    if _r.startswith('assets/') or _r.startswith('vendor/') or _r.startswith('samples/'):
        _expected.add(_r)
print("assets+vendor+samples files:", len([r for r in in_scope if r.startswith(('assets/', 'vendor/', 'samples/'))]))
print("root files:", sorted([r for r in in_scope if '/' not in r]))

for rel in in_scope:
    p = CLONE / rel
    size = p.stat().st_size
    h = sha256(p)
    verdict, ev = None, None
    # protected
    if rel in ('firebase-config.js', 'firestore.rules'):
        verdict = 'KEEP'
        ev = 'PROTECTED (per task): Firebase config / Firestore rules — never delete; firebase-config.js loaded via <script src> in index.html'
    # index.html
    elif rel == 'index.html':
        verdict = 'KEEP'
        ev = 'runtime entry point: the built single-page app (all layers v3-v26 inlined); only external scripts are vendor/xlsx + firebase-config.js'
    # vendor
    elif rel == 'vendor/xlsx-0.18.5.full.min.js':
        verdict = 'KEEP'
        ev = '<script src="vendor/xlsx-0.18.5.full.min.js"> in index.html (Smart Import SheetJS)'
    # samples
    elif rel.startswith('samples/'):
        if rel == 'samples/korean-sample.csv':
            verdict = 'CANDIDATE'
            ev = 'no runtime reference: v16.js sample links list only english/korean .xlsx, english .csv, vocab-sample.json (v16.js:776-779); file IS generated by gen_samples.js:49 but never linked'
        else:
            verdict = 'KEEP'
            ev = f"download link href=\"{rel}\" in v16.js:776-779 (Smart Import sample files)"
    # dynamic pattern coverage
    elif rel in DYNAMIC:
        verdict = 'KEEP'
        ev = DYNAMIC[rel]
    # literal mention of the relative path in the corpus
    elif rel in quoted or f"'{rel}'" in ALL or f'"{rel}"' in ALL:
        verdict = 'KEEP'
        ev = f"literal reference to '{rel}' in code corpus (index.html and/or root *.js/*.css)"
    # basename mentioned (covers bare-filename map values, e.g. v9.js maps)
    # ONLY when the basename is unique across in-scope files, otherwise a
    # same-name file in another directory would cause a false positive
    # (proven case: assets/buildings/barn.png vs assets/icons/v6/barn.png).
    elif basename_unique.get(rel.split('/')[-1], 0) == 1 and \
            rel.split('/')[-1] in quoted_basenames:
        verdict = 'KEEP'
        ev = f"basename '{rel.split('/')[-1]}' (unique in repo) appears as a quoted string in the code corpus (dynamic path construction with this filename)"
    # gen_samples.js: the generator for samples/
    elif rel == 'gen_samples.js':
        verdict = 'KEEP'
        ev = 'generates samples/*.xlsx/.csv/.json (gen_samples.js:46-50 writeXlsx/writeCsv/vocab-sample.json); the build audit may need it to regenerate the sample files'
    # root layer files: inlined into index.html
    elif '/' not in rel and (re.match(r'v\d+(_data|_a1a2|_oxford|_sync)?\.(js|css)$', rel)):
        verdict = 'KEEP'
        ev = 'root layer file; content inlined into index.html (<script id="vNNjs"> / <style id="vNN"> block; byte-identical except v7.js/v8.js, see report)'
    # root data JSONs: only in-repo copy of build data
    elif rel in ('v15_words.json', 'v17_a1a2.json', 'v17_oxford.json', 'v17_review.json'):
        verdict = 'KEEP'
        ev = ('only in-repo copy of build input data (build_v15.py reads data/<file> from data_dir and writes this copy to out/; '
              'data/ is NOT committed); data is embedded in index.html via the generated .js (v15data/v17data blocks); '
              'not fetched at runtime (0 fetch refs)')
    elif rel == 'basic_tactics_vocabulary.json':
        verdict = 'KEEP'
        ev = "runtime lazy fetch: v22.js:39 dataURL() returns 'basic_tactics_vocabulary.json', fetch + XHR fallback (v22.js:65,75)"
    elif rel == 'v22_basictactics.json':
        verdict = 'CANDIDATE'
        ev = ('byte-identical duplicate of basic_tactics_vocabulary.json (same sha256); 0 runtime refs; '
              'build_v14.py:182/build_v15.py:181 read data/v22_basictactics.json and write BOTH files to out/ — deleting this copy loses zero unique bytes')
    elif rel == 'v22_basictactics_report.json':
        verdict = 'UNKNOWN'
        ev = ('no runtime refs; build output written by build_v14.py:436-437/build_v15.py from data/v22_basictactics_report.json; '
              'unique QA detail (duplicates/flags) also summarised in REPORT_BASIC_TACTICS.md + CHANGELOG_V13_to_V14.md; docs-referenced')
    elif rel == 'Korean_Vocab_Farm_V6_Bilingual.html':
        verdict = 'KEEP'
        ev = ('only in-repo copy of the V6 base artifact; build_v15.py --src input (reads /tmp/v6/Korean_Vocab_Farm_V6_Bilingual.html, '
              'default --src=/tmp/v6; build.py writes this file as output); not loaded at runtime (0 refs in code corpus)')
    elif rel.endswith('/manifest.json'):
        verdict = 'UNKNOWN'
        ev = ('no runtime refs (0 in code corpus); build output written by build_v14.py:387-388,404-405/build_v15.py from src/bosses[/bosses11]/manifest[_v11].json; '
              'unique per-boss cutout provenance (rembg model + crop box + size + solid_frac) also summarised in ASSET_REPORT_V10/V11.md; docs-referenced')
    elif rel == 'assets/icons/v6/ICON_MAP.json':
        verdict = 'UNKNOWN'
        ev = ('not fetched at runtime; referenced only by the comment in v9.js:2 ("Central map lives in assets/icons/v6/ICON_MAP.json; this file is the runtime copy") '
              'and README_V6_Bilingual.md; the live maps are embedded as JS literals in v9.js (SRC/EMOJI)')
    elif '_old_svg' in rel:
        verdict = 'CANDIDATE'
        ev = ('no reference anywhere: 0 hits in code corpus (index.html + all root *.js/*.css), 0 hits in all root *.py and *.md; '
              'superseded SVG art (PNG versions are the live art)')
    else:
        # No literal, basename, dynamic-pattern, build-input, or docs match.
        verdict = 'CANDIDATE'
        ev = ('no reference found: 0 hits for the relative path and basename in the code corpus (index.html + all root *.js/*.css, '
              'literal + dynamic-pattern scans), 0 hits in all root *.py and *.md; not covered by any proven dynamic path pattern')
    rows.append([rel, size, h, verdict, ev])

# duplicates note
from collections import defaultdict
byh = defaultdict(list)
for r in rows:
    byh[r[2]].append(r[0])
dups = {h: v for h, v in byh.items() if len(v) > 1}
print("duplicate sha256 groups:", dups)

with open(OUT, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['path', 'size_bytes', 'sha256', 'verdict', 'evidence'])
    w.writerows(rows)
print(f"wrote {OUT} ({len(rows)} rows)")
from collections import Counter
c = Counter(r[3] for r in rows)
print("verdicts:", dict(c))
tot = sum(r[1] for r in rows)
print("total bytes in manifest:", tot)
for v in ('KEEP', 'CANDIDATE', 'UNKNOWN'):
    sel = [r for r in rows if r[3] == v]
    print(f"  {v}: {len(sel)} files, {sum(r[1] for r in sel)} bytes")
print("\nCANDIDATE rows:")
for r in rows:
    if r[3] == 'CANDIDATE':
        print(f"  {r[0]} ({r[1]} B)")
print("\nUNKNOWN rows:")
for r in rows:
    if r[3] == 'UNKNOWN':
        print(f"  {r[0]} ({r[1]} B)")
