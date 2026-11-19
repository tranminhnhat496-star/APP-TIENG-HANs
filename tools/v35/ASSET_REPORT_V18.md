# V18.0 SKYROOT SANCTUARY — Asset Report

Date: 2026-11-19. Art agent delivery: 20 transparent PNGs for the new Skyroot
region, chibi fantasy style matching the V17 Chrono bosses
(`assets/bosses/v17/` used as style reference — soft painterly digital
illustration, single centered character, no text/frame/background).

Staging location (what the build step copies into `out/`):
`tools/v35/assets-staging/bosses/v18/` (8) and `tools/v35/assets-staging/pets/v18/` (12).

## Verification — 20/20 PASS

Checks per file: mode RGBA, longest side exactly 512 px, all four corner
pixels alpha 0, file size sane (50 KB–1 MB), plus a visual check of every
image composited on a dark background (no white halo, no missing body parts,
one character per PNG, no text).

| File | Subject | Size (px) | Mode | Corner alpha | Bytes | Result |
|---|---|---|---|---|---|---|
| bosses/v18/v18_breeze_lynx.png | Breeze Lynx | 512×512 | RGBA | 0,0,0,0 | 370581 | PASS |
| bosses/v18/v18_thornwing_stag.png | Thornwing Stag | 256×512 | RGBA | 0,0,0,0 | 173385 | PASS |
| bosses/v18/v18_cloud_serpent.png | Cloud Serpent | 256×512 | RGBA | 0,0,0,0 | 158951 | PASS |
| bosses/v18/v18_moss_colossus.png | Moss Colossus | 256×512 | RGBA | 0,0,0,0 | 215564 | PASS |
| bosses/v18/v18_tempest_harpy.png | Tempest Harpy | 256×512 | RGBA | 0,0,0,0 | 189469 | PASS |
| bosses/v18/v18_crystal_treant.png | Crystal Treant | 256×512 | RGBA | 0,0,0,0 | 236969 | PASS |
| bosses/v18/v18_aurora_griffin.png | Aurora Griffin | 512×512 | RGBA | 0,0,0,0 | 312670 | PASS |
| bosses/v18/v18_skyroot_empress.png | Skyroot Empress | 256×512 | RGBA | 0,0,0,0 | 280333 | PASS |
| pets/v18/v18_cloudfx_s1.png | Cloud Fox stage 1 (baby) | 512×512 | RGBA | 0,0,0,0 | 243733 | PASS |
| pets/v18/v18_cloudfx_s2.png | Cloud Fox stage 2 | 512×512 | RGBA | 0,0,0,0 | 243756 | PASS |
| pets/v18/v18_cloudfx_s3.png | Cloud Fox stage 3 (adult) | 512×512 | RGBA | 0,0,0,0 | 290375 | PASS |
| pets/v18/v18_sproutowl_s1.png | Sprout Owl stage 1 (baby) | 512×512 | RGBA | 0,0,0,0 | 212436 | PASS |
| pets/v18/v18_sproutowl_s2.png | Sprout Owl stage 2 | 512×512 | RGBA | 0,0,0,0 | 159164 | PASS |
| pets/v18/v18_sproutowl_s3.png | Sprout Owl stage 3 (adult) | 512×512 | RGBA | 0,0,0,0 | 294267 | PASS |
| pets/v18/v18_stormram_s1.png | Storm Ram stage 1 (baby) | 512×512 | RGBA | 0,0,0,0 | 260399 | PASS |
| pets/v18/v18_stormram_s2.png | Storm Ram stage 2 | 512×512 | RGBA | 0,0,0,0 | 210634 | PASS |
| pets/v18/v18_stormram_s3.png | Storm Ram stage 3 (adult) | 512×512 | RGBA | 0,0,0,0 | 302165 | PASS |
| pets/v18/v18_egg_cloud.png | Cloud egg | 512×512 | RGBA | 0,0,0,0 | 144462 | PASS |
| pets/v18/v18_egg_sprout.png | Sprout egg | 512×512 | RGBA | 0,0,0,0 | 161406 | PASS |
| pets/v18/v18_egg_storm.png | Storm egg | 512×512 | RGBA | 0,0,0,0 | 135664 | PASS |

Total: 20 files, 4,596,383 bytes (~4.4 MB). No file failed verification; nothing
was shipped with a faked PASS.

Note on sizes: square subjects are 512×512; tall subjects (6 bosses) are
256×512 — longest side 512 in every case, aspect preserved (the V17 script
forced square 512×512; V18 keeps the portrait ratio instead, per spec).

## Generation notes

- Generated with the media image pipeline, one call per image, 20 calls in
  5 batches of 4. Prompts specified: chibi fantasy game art, single centered
  character, fully transparent background, no text/frame/scenery/other
  characters.
- Raw generator output (as in V17): all 20 came back **opaque RGB** on a
  near-white background (1600×1600 square, or 1120×2240 portrait for 6
  bosses), 0% transparent. No image was usable as generated.

## Fixes applied (no image regenerated — all fixed from the originals)

1. **Flood-fill transparency** — `tools/v35/fix_v18_transparency.py`
   (modeled on `tools/v33/fix_v17_transparency.py`): removes the
   border-connected near-white background (bright near-gray pixels), softens
   the 1 px anti-aliased fringe, resizes longest side to 512, saves RGBA PNG
   under the final `v18_*` names. Raw generator originals are backed up in
   `tools/v35/raw-originals/`. This fixed 16/20 cleanly.
2. **White-on-white leak (4 images)** — the flood-fill leaked into pale
   character regions that touch the white background with no outline:
   `v18_cloud_serpent.png` (holes in the cloud body),
   `v18_cloudfx_s1.png` (hole in the baby fox's face),
   `v18_cloudfx_s2.png` (hole in the tail),
   `v18_egg_cloud.png` (hole in the egg interior). Found by the dark-background
   visual check, not by the numeric checks (corners/sizes were fine).
   Repaired with `tools/v35/fix_v18_white_on_white.py` using rembg
   `isnet-general-use` subject segmentation on the raw originals (input
   downscaled to 512 px first — the model rescales internally anyway).
   - The default rembg `u2net` session OOM-killed this 6 GB VM twice
     (during model load/inference); `u2netp` worked but left stray smudges
     on the serpent. `isnet-general-use` at 512 px input ran clean and gave
     the best edges on fur/cloud wisps.
   - rembg was installed in a throwaway venv (`pip install rembg
     onnxruntime` — system pip is blocked by the Debian-managed numpy, and
     `/tmp` is a 512 MB tmpfs, so the venv lived under `tools/v35/`).
     The venv (594 MB) was deleted after the repair; models are cached in
     `~/.rembg/models/`. Reinstall: `python3 -m venv <dir> &&
     <dir>/bin/pip install rembg onnxruntime pillow numpy`, then run the
     script with that venv's python.
   - rembg leaves alpha 1–2 residue in a corner pixel (seen on serpent,
     cloudfx_s1, egg_cloud); the script now forces all four corner pixels
     to alpha 0, and the three affected files were patched the same way.
3. **Staging cleanup** — raw `media-generation-*` files and JSON sidecars
   were removed from `assets-staging/` after the fixes; it now contains
   only the 20 final PNGs plus `manifest.json`.

## Known limits / visual notes

- The Cloud Serpent keeps two faint semi-transparent grey wisp remnants
  beside its body — they are part of the generated cloud-wisp artwork, not
  background residue; they read as wisps on a dark background.
- The Crystal Treant and Thornwing Stag have a higher semi-transparent
  fringe share (14.7% / 11.9% of pixels) — that is glowing crystal leaves
  and fine branch tips, verified visually, not a halo.
- Pet evolution stages were generated as separate images (not edits of one
  another), so stage-to-stage likeness is "same species, growing" rather
  than pixel-identical; visually the three Cloud Foxes, three Sprout Owls
  and three Storm Rams each read as one character growing up.
- No image contains text, a frame, a background, or a second character
  (checked visually on dark background for all 20).

## Files

- `tools/v35/assets-staging/bosses/v18/` — 8 boss PNGs
- `tools/v35/assets-staging/pets/v18/` — 9 pet forms + 3 eggs
- `tools/v35/assets-staging/manifest.json` — all 20 final paths
- `tools/v35/fix_v18_transparency.py` — flood-fill fix script
- `tools/v35/fix_v18_white_on_white.py` — rembg repair script (4 images)
- `tools/v35/raw-originals/` — the 20 raw generator originals (backup)
- `tools/v35/ASSET_REPORT_V18.md` — this report
