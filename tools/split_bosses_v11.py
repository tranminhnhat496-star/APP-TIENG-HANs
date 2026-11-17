#!/usr/bin/env python3
"""Split the V11 poster (image-3.png, 30 Super Legendary bosses) into 30
individual transparent PNGs.

Source: ~/workspace/user/media_library/image/image-3.png (1536x1024),
a 10x3 grid of framed cards. Card boxes measured from the dark gaps
between frames (see ASSET_REPORT_V11.md):
  cols x = [15-166, 170-319, 323-470, 474-619, 623-770,
            774-919, 923-1069, 1073-1219, 1223-1369, 1373-1533]
  rows y (character zone only, name bar excluded: bar top ~78% of height):
         [132-335, 411-596, 669-849]

Segmentation: rembg, model chosen PER BOSS after visual review of
white + dark contact sheets (no single model wins everywhere).
Post-process: trim to alpha bbox (4px pad), alpha boost (alpha<20 -> 0,
then gamma 0.5), resize to max 512px. Output: src/bosses11/<id>.png +
manifest_v11.json + contact sheets.

Usage: python3 tools/split_bosses_v11.py [--only r1|r2|r3]
"""
import argparse
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from rembg import remove, new_session

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
MEDIA = pathlib.Path.home() / 'workspace/user/media_library/image'
OUT = ROOT / 'src' / 'bosses11'
OUT.mkdir(parents=True, exist_ok=True)

COLS = [(15, 166), (170, 319), (323, 470), (474, 619), (623, 770),
        (774, 919), (923, 1069), (1073, 1219), (1223, 1369), (1373, 1533)]
ROWS = [(132, 335), (411, 596), (669, 849)]

JOBS = {
    'r1': [
        ('v11_fireking', 0), ('v11_icelong', 1), ('v11_thunderminotaur', 2),
        ('v11_ninehead', 3), ('v11_phoenix', 4), ('v11_seadragon', 5),
        ('v11_golem', 6), ('v11_voidknight', 7), ('v11_greendragon', 8),
        ('v11_tigerwarrior', 9),
    ],
    'r2': [
        ('v11_spacewhale', 0), ('v11_ninetails', 1), ('v11_ancienttree', 2),
        ('v11_timemachine', 3), ('v11_icequeen', 4), ('v11_lavadragon', 5),
        ('v11_stormeagle', 6), ('v11_octopusking', 7), ('v11_boneking', 8),
        ('v11_lightdeer', 9),
    ],
    'r3': [
        ('v11_goldephant', 0), ('v11_butterflyqueen', 1), ('v11_sharkking', 2),
        ('v11_nebuladragon', 3), ('v11_pandamaster', 4), ('v11_oni', 5),
        ('v11_crystalbird', 6), ('v11_snakequeen', 7), ('v11_heavenknight', 8),
        ('v11_infinitydragon', 9),
    ],
}

# Bosses that keep a true transparent cutout (u2net isolated the character
# well). Every other boss becomes a tight PORTRAIT crop: the poster art is
# full-bleed (character + painted background are one painting), so rembg
# either keeps the whole card as a rectangle or ghosts the character
# (tested: isnet-general-use, isnet-anime, u2netp, u2net, full-card input;
# SAM could not run — the torch CPU download times out in this environment).
# A portrait crop contains the whole character, no name bar, no poster
# frame (6px inset), no other character; the game UI frames all portraits
# uniformly (rounded corners + element glow), so cutouts and portraits
# look consistent. See ASSET_REPORT_V11.md.
TRANSPARENT = {'v11_thunderminotaur', 'v11_phoenix', 'v11_pandamaster'}

# per-boss model (default u2net — the full 176MB model segments this
# full-bleed painted poster far better than isnet-general-use (keeps the
# whole card as a rectangle / ghosts dark characters), isnet-anime
# (ghosts everything) or u2netp (partial busts); filled after review)
MODEL = {}

# per-boss crop overrides (x0, y0, x1, y1)
CROP_OVERRIDE = {}


def trim(rgba, pad=4):
    a = np.asarray(rgba.getchannel('A'))
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        return rgba
    x0, x1 = max(0, xs.min() - pad), min(rgba.width - 1, xs.max() + pad)
    y0, y1 = max(0, ys.min() - pad), min(rgba.height - 1, ys.max() + pad)
    return rgba.crop((x0, y0, x1 + 1, y1 + 1))


def boost(rgba):
    """alpha<20 -> 0 (kill haze), then gamma 0.5 (solidify ghost bodies)."""
    a = np.asarray(rgba.getchannel('A')).astype(np.float32)
    out = np.where(a < 20, 0, 255.0 * np.power(np.clip(a, 0, 255) / 255.0, 0.5))
    arr = np.asarray(rgba).copy()
    arr[:, :, 3] = np.clip(out, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', choices=['r1', 'r2', 'r3'], default=None)
    args = ap.parse_args()

    sessions = {}

    def session_for(name):
        if name not in sessions:
            sessions[name] = new_session(name)
        return sessions[name]

    poster = Image.open(MEDIA / 'image-3.png')
    manifest = []
    groups = [args.only] if args.only else ['r1', 'r2', 'r3']
    for group in groups:
        row_idx = {'r1': 0, 'r2': 1, 'r3': 2}[group]
        y0, y1 = ROWS[row_idx]
        for bid, col in JOBS[group]:
            box = CROP_OVERRIDE.get(bid) or (COLS[col][0], y0, COLS[col][1], y1)
            if bid in TRANSPARENT:
                model = MODEL.get(bid, 'u2net')
                crop = poster.crop(box)
                cut = remove(crop, session=session_for(model))
                cut = boost(trim(cut))
                kind = model
            else:
                # tight portrait: 6px inset removes the poster's gold frame
                x0, _, x1, _ = box
                cut = poster.crop((x0 + 6, y0, x1 - 6, y1)).convert('RGBA')
                kind = 'portrait'
            if max(cut.size) > 512:
                cut.thumbnail((512, 512), Image.LANCZOS)
            dst = OUT / (bid + '.png')
            cut.save(dst, optimize=True)
            frac = float((np.asarray(cut.getchannel('A')) > 200).mean())
            manifest.append({'id': bid, 'group': group, 'model': kind,
                             'crop': list(box), 'size': list(cut.size),
                             'solid_frac': round(frac, 3),
                             'kb': round(dst.stat().st_size / 1024, 1)})
            print(f'{bid:24s} {kind:18s} {cut.size} solid={frac:.2f} {dst.stat().st_size/1024:.0f} KB', flush=True)

    mpath = OUT / 'manifest_v11.json'
    if mpath.exists():
        old = json.loads(mpath.read_text(encoding='utf-8'))
        by_id = {m['id']: m for m in old}
        for m in manifest:
            by_id[m['id']] = m
        manifest = [by_id[k] for k in sorted(by_id)]
    mpath.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')

    for bg_name, bg_col in [('white', (255, 255, 255)), ('dark', (24, 20, 48))]:
        for group in groups:
            cell = 340
            sheet = Image.new('RGB', (cell * 5, cell * 2), bg_col)
            for bid, col in JOBS[group]:
                im = Image.open(OUT / (bid + '.png'))
                im.thumbnail((cell - 16, cell - 16), Image.LANCZOS)
                x = (col % 5) * cell + (cell - im.width) // 2
                y = (col // 5) * cell + (cell - im.height) // 2
                sheet.paste(im, (x, y), im)
            sheet.save(OUT / f'contact_{group}_{bg_name}.png')
    print('done:', len(manifest), 'bosses')
    return 0


if __name__ == '__main__':
    sys.exit(main())
