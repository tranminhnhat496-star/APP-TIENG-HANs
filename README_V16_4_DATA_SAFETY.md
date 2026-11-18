# Korean & English Vocab Farm — V16.4 Data Safety

**Version 16.4.0 — layer V32 (loads LAST). Base: V16.3 (Backup & Restore Fix). Date: 2026-11-19.**

This release adds the two Claude Top-5 items Anh chose to auto-implement:
**(1) an automated data/sync regression suite** (`tools/v32/test32.js`,
owned by the test agent — see `SMOKE_TEST_V16_4_2026-11-19.md`) and
**(2) a localStorage monitor** that warns before the browser runs out of
room to save. Nothing else changes: no new currency, no migration, no
feature removed, no save schema/key renamed.

## What V16.4 adds

### Storage monitor (in the Data Management panel + Account Center backup tab)
- **Estimated usage vs a 5 MB budget** (`5 * 1024 * 1024` bytes), with a
  progress bar and a per-key breakdown: live save, backup history,
  system snapshots, verified cloud copy, protected/other keys.
- **Levels:** under 70% = OK; 70–90% = warning (amber, "nên dọn dẹp bản
  sao lưu cũ"); 90% and over = critical (red, "có nguy cơ không lưu
  được"). The numbers are labelled **"ước tính"** (estimated): Chrome's
  quota accounting differs from UTF-8 byte counts, so the monitor is a
  conservative early warning, not a quota meter.
- **Live save version** (`S.v7.meta.saveVersion`, or "không rõ" when
  absent) shown next to the usage, so a save from an incompatible
  version is visible before it causes trouble.
- **Warnings surface in three places** when the level is warn/critical:
  (1) the monitor section itself, (2) a small dismissible floating
  badge (bottom-right, above the bottom tab bar, z-index 1100 — below
  the V20 modal at 1200 and V31 at 1400, so it never covers a modal;
  dismissed for the rest of the session), (3) `console.warn('[V32] …')`.
  The badge never appears on a fresh page at OK.
- **Checks run:** after every save (pre-save guard, see below), after
  every `__v20.flush`, after every backup event, every 30 seconds while
  the page is open, and when the tab becomes visible again.

### Safe cleanup ("Dọn dẹp an toàn")
- **Always asks first** (Vietnamese `confirm()` naming exactly what
  will be deleted). Cancelling deletes nothing.
- **Deletes ONLY:** system snapshots older than the newest 5 (newest
  by numeric suffix) and backup-history entries older than the newest
  10 (the history array is rewritten, keeping the newest 10).
- **NEVER deletes:** the live save (`hanvocab.v1`), `hanvocab.v11-backup`
  (pre-V12-migration copy), the verified cloud copy
  (`hanvocab.v16.last-verified-cloud`), `hanvocab.v12.meta`, any
  unclassified (`other`/`protected`) key, or any non-`hanvocab.*` key.
  Unknown keys are shown with "không xóa được từ đây".
- After a cleanup the monitor re-renders in place and the result (time,
  bytes freed, keys deleted) is recorded in the V31 backup history as a
  `cleanup` event.

### Pre-save guard
- V32 wraps the global `save` (verified in source: V6 HTML:947 declares
  `function save(){...}` at top level in the classic script that opens
  at line 877, so it is a plain window function; V20's `init20()` had
  already wrapped it once into a debounced `requestSave()` wrapper —
  V32 wraps that window function, calls the original FIRST, then checks
  the budget 900 ms later, past the V20 800 ms debounce, so the measured
  size is post-flush). The wrapper is idempotent, copies the `__v20`
  marker so a later `wrapSave()` call cannot capture it, and **never
  blocks, delays, or alters the save, and never deletes data to make
  room**.
- In parallel it wraps `__v20.flush` and `__v31.recordBackupEvent`
  (both idempotent, check-after), plus the 30 s interval and the
  `visibilitychange` check.

### Version check on import (R-V32-VER — the ONE build replacement)
- `validateSave` (`v20_sync.js`, `SAVE_VERSION=12`) previously checked
  structure only — a save from an incompatible future version would be
  silently accepted. It now also rejects when `v7.meta.saveVersion` is
  present and is not 12, with error `bad-version:<n>`. Absent
  `saveVersion` (pre-V12 saves have no `meta`) is still accepted, and
  12 is accepted. **This is preventive hardening, not a fix for an
  observed bug** — no bad-version save has ever been seen in the wild.

### Fixed after the first build (2026-11-19, `tools/v32/fix_b32.py`)
- **Panel duplication (B-32-2):** the Data Management panel rendered
  the V31 section and the V32 monitor twice (`#v31panel` ×2 +
  `#v32monitor` ×2), because each layer's panel wrapper guarded
  re-wrapping with only its own marker. The V32 wrappers now carry
  both markers, so the panel renders each section exactly once — on
  first render and after re-render (verified in the vm suite §8 and
  in real Chrome).
- **Account-switch race (B-32-3):** the V16.3 F-02 flush guards in
  the account-switch functions ran *after* the slot write, so a
  pending save could overwrite the just-switched account's bytes
  (real Chrome: 3/3 lost). The guards now run *first*, before any
  slot write, so switching accounts preserves both sides: the
  switched-to save loads intact, and the switched-away save keeps
  its flushed progress in its own home (verified in real Chrome:
  account→guest and guest→account both 0/3 lost).

## What is NOT in this release (out of scope)
- Claude #3 (daily-start + review boss), #4 (review-debt cap +
  welcome-back session), #5 (bulk Korean import) — follow-ups only,
  not built.
- V17-1/V17-2/V17-3, F-04/F-05/F-07/F-09/F-10, V17-4 typo, M1/M2, V9
  word fixes, V14.1, PR #7 follow-ups, F-12 full-wipe question (still
  pending Anh). No V28/V29/V30 files.

## Known limits (honest)
- **Firebase sync/login NOT tested live** — same as V16.3. The ZIP
  ships the placeholder `firebase-config.js`; Anh must run the
  `FIREBASE_SETUP.md` checklist before claiming sync/login works.
  Unconfigured, the game plays fully offline and says so.
- **Chrome testing DONE post-fix** — Chrome 157 launched with the
  correct `/tmp/webgl-policy.txt` and the full CDP driver
  (`tools/v32/verify-v32c.js`) ran to completion (exit 0): all gates
  pass, including the panel (each section ×1), the account-switch
  race (0/3 lost on all three paths), safe cleanup, the warning
  badge, bad-version import, C9 restore, and the V16.3 regression
  (Smart, Pet Hub, v18 fight, Library, login) — **0 console errors**
  across the run. Details in `SMOKE_TEST_V16_4_2026-11-19.md` §7.
  The `test32.js` Node vm suite ran 185 PASS / 0 FAIL / 8 SKIP,
  twice on the build + once on the final packaged ZIP (§1 there).
- The monitor's byte counts are UTF-8 estimates (see above), not the
  browser's exact quota accounting.
- The pre-save guard measures after the debounced flush; a save that
  is still pending inside the 800 ms debounce window is measured on
  the next check (interval / next save / tab-visible).

## How to use (player)
1. Open the game → **Dữ liệu** (Data Management panel) or Account
   Center → tab **Sao lưu**: the "Giám sát dung lượng lưu trữ — V16.4"
   section shows usage, the bar, the save version, and every stored
   key with its size.
2. If the bar turns amber/red, or the badge appears, open the section
   and press **Dọn dẹp an toàn**, then confirm. Only old system
   snapshots and old history entries are removed.
3. Nothing else changes: the live save, pets, bosses, SRS history and
   all progress are untouched by the cleanup.

## Files
| File | Nội dung |
|---|---|
| `src/v32.js`, `src/v32.css` | Lớp V32 mới, version 16.4.0, nạp CUỐI (sau V31): storage monitor, safe cleanup, pre-save guard, floating badge, panel + Account Center integration. |
| `build_v32.py` | Script build V16.4: kiểm tra base là V16.3 nguyên vẹn (sha256 `4378dc22…`), áp dụng đúng 1 replacement (R-V32-VER), chèn lớp V32 cuối cùng, assert marker/thứ tự/version/KO không đổi/không có marker ngoài phạm vi, `node --check` v32.js + v20_sync.js. Chạy đúng 1 lần, không chạy lại trên bản đã xong. (Docstring ghi lại 2 bản sửa B-32-2/B-32-3 sau build; xem `tools/v32/fix_b32.py`.) |
| `package_v32.py` | Script đóng gói ZIP V16.4 + kiểm tra `index.html`, `v32.js`, `v32.css`, `build_v32.py`, `package_v32.py`, `tools/v32/test32.js` trong ZIP; marker V32 cuối cùng; fragment V31 còn đủ; R-V32-VER có mặt; không có nút KO mới; `firebase-config.js` trong ZIP là placeholder. |
| `tools/v32/fix_b32.py` | Script sửa B-32-2 + B-32-3 trên bản V16.4 đã xong (gate theo hash pre-fix, assert số lượng chính xác, mirror ra `out/`, sửa cả block inlined trong `index.html`, verify `node --check` + marker + guard). |
| `README_V16_4_DATA_SAFETY.md` | Hướng dẫn này. |
| `CHANGELOG_V16_3_to_V16_4.md` | Changelog đầy đủ V16.3 → V16.4. |
| `SMOKE_TEST_V16_4_2026-11-19.md` | Báo cáo kiểm thử V16.4 (build gates đầy đủ; test32 185/0/8 ×3; Chrome driver tất cả gate PASS, 0 console error). |
| `tools/v32/` | `PLAN_V32.md` (kế hoạch binding) + `test32.js` + `verify-v32c.js` (test agent owns the harness + Chrome driver). |

## Update guide
1. Back up first (recommended): in the running game, English Hub →
   tab **Sao lưu** → **Xuất file sao lưu (.json)** and keep the file
   somewhere safe. Player data lives in each player's browser; updating
   the code on GitHub Pages does **not** delete it.
2. Replace `index.html` and add `v32.js`, `v32.css`, `build_v32.py`,
   `package_v32.py`, plus the three V16.4 docs. Keep every older file
   and `assets/` (the ZIP contains everything).
3. Commit + push, wait 1–2 minutes, open the GitHub Pages URL.
4. Check: open **Dữ liệu** → the "Giám sát dung lượng lưu trữ — V16.4"
   section shows usage under 70% (OK) and the live save version.
5. To roll back to V16.3: revert the V16.4 commit in GitHub Desktop.
   Player data is unaffected (V16.4 changes no save key or schema;
   `v32.js`/`v32.css` left over after a revert can be deleted — V16.3
   never loads them).
