#!/usr/bin/env python3
"""Split the 4x3 decor sprite sheet into 12 transparent PNGs.
Sheet is RGB with a black background (no alpha). Background is removed by
a luminance ramp (lum<=8 -> transparent, lum>=48 -> opaque, linear in
between); dark interior parts survive because they are enclosed by bright
pixels and the cleanup keeps only components near the main item blob.
Grid boundaries come from the dark-gap analysis:
  X = [0, 368, 724, 1085, 1448], Y = [0, 353, 707, 1086]."""
import pathlib
from PIL import Image
import numpy as np
from scipy import ndimage

SRC = pathlib.Path('/home/hatch/workspace/user/media_library/image/image-3.png')
OUT = pathlib.Path(__file__).parent / 'assets' / 'decor'
NAMES = [
    ['ancient_tree', 'pumpkin', 'farmhouse', 'tractor'],
    ['cherry_blossom', 'watermelon_garden', 'wind_chime', 'autumn_tree'],
    ['snowman', 'butterflies', 'roasted_sweet_potato', 'moon_lantern'],
]
X = [0, 368, 724, 1085, 1448]
Y = [0, 353, 707, 1086]
SIZE = 512
FIT = 480
PAD = 6

im = Image.open(SRC).convert('RGB')
arr = np.array(im).astype(float)
lum = arr.mean(axis=2)


def make_alpha(cell_lum):
    return np.clip((cell_lum - 8) / 40.0, 0, 1) * 255


def clean_cell(rgba):
    """Drop stray dots far from the main item blob."""
    al = rgba[:, :, 3]
    mask = al > 30
    if not mask.any():
        return rgba
    lab, n = ndimage.label(mask)
    sizes = ndimage.sum_labels(mask, lab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    ys, xs = np.where(lab == main)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    keep = np.zeros_like(mask)
    for i in range(1, n + 1):
        if sizes[i - 1] < 60:
            continue
        ys2, xs2 = np.where(lab == i)
        if sizes[i - 1] > 400 or (ys2.min() <= y1 + 16 and ys2.max() >= y0 - 16
                                  and xs2.min() <= x1 + 16 and xs2.max() >= x0 - 16):
            keep |= (lab == i)
    out = rgba.copy()
    out[:, :, 3] = np.where(keep, out[:, :, 3], 0)
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for r in range(3):
        for c in range(4):
            cell_rgb = arr[Y[r]:Y[r + 1], X[c]:X[c + 1]]
            cell_lum = lum[Y[r]:Y[r + 1], X[c]:X[c + 1]]
            rgba = np.dstack([cell_rgb, make_alpha(cell_lum)]).astype(np.uint8)
            rgba = clean_cell(rgba)
            cell = Image.fromarray(rgba, 'RGBA')
            a = np.array(cell)[:, :, 3]
            ys, xs = np.where(a > 30)
            x0 = max(0, xs.min() - PAD); x1 = min(cell.width, xs.max() + PAD + 1)
            y0 = max(0, ys.min() - PAD); y1 = min(cell.height, ys.max() + PAD + 1)
            cropped = cell.crop((x0, y0, x1, y1))
            scale = min(FIT / cropped.width, FIT / cropped.height)
            nw, nh = max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))
            resized = cropped.resize((nw, nh), Image.LANCZOS)
            canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
            canvas.paste(resized, ((SIZE - nw) // 2, (SIZE - nh) // 2), resized)
            name = NAMES[r][c]
            canvas.save(OUT / f'{name}.png', optimize=True)
            print(f'{name:22s} crop {cropped.width}x{cropped.height} -> {nw}x{nh}  {round((OUT / f"{name}.png").stat().st_size/1024)} KB')


if __name__ == '__main__':
    main()
