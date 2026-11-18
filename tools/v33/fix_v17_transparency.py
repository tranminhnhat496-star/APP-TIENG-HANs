#!/usr/bin/env python3
"""Fix V17 art: remove near-white/checkerboard background via border flood-fill,
resize to 512x512, save as RGBA PNG. Keeps originals in /tmp/v17_orig/."""
import os, shutil
from PIL import Image
import numpy as np
from scipy import ndimage

BASE = os.path.expanduser("~/workspace/v7build/assets")
BACKUP = "/tmp/v17_orig"
os.makedirs(BACKUP, exist_ok=True)

FILES = [
 "bosses/v17/v17_sandwisp.png","bosses/v17/v17_pendulum.png","bosses/v17/v17_specter.png",
 "bosses/v17/v17_mantis.png","bosses/v17/v17_hound.png","bosses/v17/v17_oracle.png",
 "bosses/v17/v17_titan.png","bosses/v17/v17_geargolem.png",
 "pets/v17/stardeer_s1.png","pets/v17/stardeer_s2.png","pets/v17/stardeer_s3.png",
 "pets/v17/gearbeetle_s1.png","pets/v17/gearbeetle_s2.png","pets/v17/gearbeetle_s3.png",
 "pets/v17/cosmicunicorn_s1.png","pets/v17/cosmicunicorn_s2.png","pets/v17/cosmicunicorn_s3.png",
 "pets/v17/egg_star.png","pets/v17/egg_gear.png","pets/v17/egg_cosmic.png",
]

for rel in FILES:
    p = os.path.join(BASE, rel)
    shutil.copy2(p, os.path.join(BACKUP, os.path.basename(rel)))
    im = Image.open(p).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    mn = arr.min(axis=2); mx = arr.max(axis=2)
    # background-like: bright and near-gray (covers pure white and light-gray checkerboard)
    bg_like = (mn >= 215) & ((mx - mn) <= 18)
    lab, n = ndimage.label(bg_like)
    border_ids = set(np.unique(np.concatenate([
        lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]])))
    border_ids.discard(0)
    bg = np.isin(lab, list(border_ids))
    # 1px dilation ring for anti-aliased fringe: soft alpha from distance-to-white
    ring = ndimage.binary_dilation(bg, iterations=1) & ~bg
    dist_white = np.sqrt(((arr - 255.0) ** 2).sum(axis=2))  # 0=white .. ~441=black
    alpha = np.full(arr.shape[:2], 255, dtype=np.uint8)
    alpha[bg] = 0
    ring_alpha = np.clip(dist_white / 48.0, 0, 1) * 255
    alpha[ring] = ring_alpha[ring].astype(np.uint8)
    out = np.dstack([np.asarray(im), alpha])
    out_im = Image.fromarray(out, "RGBA").resize((512, 512), Image.LANCZOS)
    out_im.save(p, "PNG", optimize=True)
    removed = float(bg.mean()) * 100
    print(f"{rel}: bg_removed={removed:.1f}% -> 512x512 RGBA, bytes={os.path.getsize(p)}")
print("DONE")
