#!/usr/bin/env python3
"""Split the 6x4 icon sprite sheet into 24 transparent PNGs.
Sheet has real alpha; icons are separated by transparent gaps.
Grid boundaries come from connected-component bboxes (see analysis):
  x bounds [0,263,487,712,951,1187,1448], y bounds [0,300,545,789,1086].
Per cell: crop to alpha bbox + padding, drop stray speckle components
far from the main blob, normalize onto a 256x256 transparent canvas."""
import pathlib
from PIL import Image
import numpy as np
from scipy import ndimage

SRC = pathlib.Path('/home/hatch/workspace/user/media_library/image/image-2.png')
OUT = pathlib.Path(__file__).parent / 'assets' / 'icons' / 'v6'
NAMES = [
    ['home', 'farm', 'barn', 'backpack', 'quest', 'book'],
    ['grammar', 'listen', 'speak', 'write', 'boss', 'attack'],
    ['defense', 'health', 'energy', 'xp', 'coin', 'gem'],
    ['chest', 'settings', 'weather', 'seeds', 'water', 'harvest'],
]
X = [0, 263, 487, 712, 951, 1187, 1448]
Y = [0, 300, 545, 789, 1086]
SIZE = 256
FIT = 236
PAD = 4

im = Image.open(SRC).convert('RGBA')
arr = np.array(im)


def clean_cell(cell):
    """Keep main icon blob + nearby sparkles; drop stray dots."""
    al = np.array(cell)[:, :, 3]
    mask = al > 12
    if not mask.any():
        return cell
    lab, n = ndimage.label(mask)
    sizes = ndimage.sum_labels(mask, lab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    keep = np.zeros_like(mask)
    # main blob bbox
    ys, xs = np.where(lab == main)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    for i in range(1, n + 1):
        if sizes[i - 1] < 40:
            continue
        ys2, xs2 = np.where(lab == i)
        # keep if large, or close to the main blob
        if sizes[i - 1] > 150 or (ys2.min() <= y1 + 14 and ys2.max() >= y0 - 14
                                  and xs2.min() <= x1 + 14 and xs2.max() >= x0 - 14):
            keep |= (lab == i)
    out = np.array(cell).copy()
    out[:, :, 3] = np.where(keep, out[:, :, 3], 0)
    return Image.fromarray(out)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = []
    for r in range(4):
        for c in range(6):
            cell = im.crop((X[c], Y[r], X[c + 1], Y[r + 1]))
            cell = clean_cell(cell)
            a = np.array(cell)[:, :, 3]
            ys, xs = np.where(a > 12)
            if len(xs) == 0:
                print('EMPTY', NAMES[r][c])
                continue
            x0 = max(0, xs.min() - PAD); x1 = min(cell.width, xs.max() + PAD + 1)
            y0 = max(0, ys.min() - PAD); y1 = min(cell.height, ys.max() + PAD + 1)
            cropped = cell.crop((x0, y0, x1, y1))
            scale = min(FIT / cropped.width, FIT / cropped.height, 1.15)
            nw, nh = max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))
            resized = cropped.resize((nw, nh), Image.LANCZOS)
            canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
            canvas.paste(resized, ((SIZE - nw) // 2, (SIZE - nh) // 2), resized)
            name = NAMES[r][c]
            canvas.save(OUT / f'{name}.png')
            report.append((name, cropped.size, (nw, nh), x0 == 0 or y0 == 0 or x1 >= cell.width or y1 >= cell.height))
    for name, orig, new, edge in report:
        print(f'{name:9s} cell-crop {orig[0]}x{orig[1]} -> {new[0]}x{new[1]}' + ('  [TOUCHES CELL EDGE]' if edge else ''))
    print('saved to', OUT)


if __name__ == '__main__':
    main()
