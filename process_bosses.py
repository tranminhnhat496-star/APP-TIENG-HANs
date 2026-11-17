#!/usr/bin/env python3
"""Process the 4 fantasy boss images into assets/bosses/.
- PNG sources (tiger, jellyfish queen) already have real alpha: keep it.
- JPG sources (raven, beetle) have a solid white background: remove it by
  flood-filling the near-white region connected to the border (scipy
  binary_propagation), then feather the alpha edge ~1px.
- Trim transparent borders, resize to max 1024px, save optimized PNG.
Originals are never modified."""
import pathlib
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = pathlib.Path.home() / 'workspace/user/media_library/image'
OUT = pathlib.Path(__file__).parent / 'assets' / 'bosses'
OUT.mkdir(parents=True, exist_ok=True)

JOBS = [
    ('image-4.png', 'thunder_tiger.png', 'white'),   # keep alpha
    ('image-5.png', 'coral_queen.png', 'white'),     # keep alpha
    ('image.jpg', 'astral_raven.png', 'remove'),      # white bg
    ('image-2.jpg', 'crystal_beetle_king.png', 'remove'),  # white bg
]


def remove_white_bg(im):
    """Return RGBA with the border-connected near-white background removed."""
    rgb = np.asarray(im.convert('RGB')).astype(np.int16)
    # near-white: all channels bright and low saturation (JPEG noise tolerant)
    near = (rgb.min(axis=2) > 238) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 18)
    seed = np.zeros_like(near)
    seed[0, :] = seed[-1, :] = seed[:, 0] = seed[:, -1] = True
    bg = ndimage.binary_propagation(seed & near, mask=near)
    alpha = (~bg).astype(np.float32)
    # ~1px feather on the alpha edge
    alpha = ndimage.gaussian_filter(alpha, 0.7)
    out = np.dstack([np.asarray(im.convert('RGB')), (alpha * 255).astype(np.uint8)])
    return Image.fromarray(out, 'RGBA')


for src_name, dst_name, mode in JOBS:
    im = Image.open(SRC / src_name)
    if mode == 'remove':
        rgba = remove_white_bg(im)
    else:
        rgba = im.convert('RGBA')
    # trim fully transparent border (pad 6px so glow effects are not clipped)
    a = np.asarray(rgba.getchannel('A'))
    ys, xs = np.where(a > 12)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pad = 6
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(rgba.width - 1, x1 + pad); y1 = min(rgba.height - 1, y1 + pad)
    rgba = rgba.crop((x0, y0, x1 + 1, y1 + 1))
    if max(rgba.size) > 768:
        rgba.thumbnail((768, 768), Image.LANCZOS)
    dst = OUT / dst_name
    rgba.save(dst, optimize=True)
    print(dst_name, rgba.size, rgba.mode, f'{dst.stat().st_size/1024:.0f} KB')
print('done')
