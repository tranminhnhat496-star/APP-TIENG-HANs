# Performance & Deployment Report — Vocab Farm V15.3 (audit task 4 of 4)

- **Repo:** `tranminhnhat496-star/APP-TIENG-HANs`, branch `main`
- **Commit audited:** `f099a2ffccbc3818ee212e4ef3286a4147199e54` ("Upgrade to V15.3: Mobile Responsive & Pet Navigation Fix")
- **Clone audited:** `/home/hatch/workspace/v7build/audit/clone` (HEAD verified `f099a2ff`, read-only — nothing modified)
- **Measured:** 2026-11-17 ~19:22–19:29 UTC (2026-11-18 ~02:22–02:29 +07)
- **Browser:** Muse Browser (Chromium) **157.0.8103.81**, headless, via CDP (Node 24 built-in WebSocket, no deps)
- **Method script:** `audit/perf-measure.js` (raw results: `audit/perf-local.json`, `audit/perf-live.json`; screenshot: `audit/shot-local-390.png`)

## 1. GitHub Pages & CI status

- **`.github/workflows/` is absent** from the clone — confirmed by `ls` (no such directory). There is **no CI at all**: no `.github/` directory, and no other CI config anywhere in the tree (checked for `.gitlab-ci.yml`, `netlify.toml`, `vercel.json`, `travis`, `circleci` — zero matches; the only "github" filename is `GITHUB_DESKTOP_GUIDE.md`).
- **Expected Pages URL:** https://tranminhnhat496-star.github.io/APP-TIENG-HANs/
- **Live check (curl, 2026-11-17 19:22 UTC): HTTP 200.** Response headers: `Content-Type: text/html; charset=utf-8`, `Content-Length: 1930157`, `Last-Modified: Tue, 17 Nov 2026 18:32:53 GMT`, `Cache-Control: max-age=600`, `ETag: "6afc9dd5-1d73ad"`, served via Fastly (`X-Cache: MISS` on first hit).
- **The live site serves the V15.3 build, byte-for-byte.** The fetched live `index.html` has sha256 `10492d46871f89de956bcdc5612720ba91a4df625d7db1e421bb96e9bdacb7f2`, identical to the clone's `index.html`. Title: "Korean & English Vocab Farm V15.3 — Mobile Navigation Fix — …", `id="v26js"` present, 32 occurrences of `v26` in the page.
- **CI smoke tests for Pages: none exist and none were run** — there is no workflow to run. (Any CI proposal belongs in the cleanup PR; this audit does not claim CI coverage.)

## 2. Firebase — structure only (no values reproduced)

- **`firebase-config.js` (1,549 bytes) contains a real Firebase web config, not the template.** All seven standard keys are present as non-empty strings (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `measurementId`); there are no `YOUR_…` placeholders and no empty-string values. The value formats are consistent with a real project (e.g. standard-length key strings). No key, ID, or value from this file is reproduced anywhere in this report.
- **`firestore.rules` (rules_version 2) — summary.** One collection is reachable: `/players/{userId}`. Read and write are separate rules, both requiring a signed-in user whose `request.auth.uid` equals the document's `{userId}` — nobody can read or write anyone else's save, and unauthenticated/guest users cannot touch Firestore at all. Writes are additionally validated server-side: `saveVersion` must be an int, `updatedAt` must be an int (epoch ms), and `data` must be a map. Everything else in the database is denied by a catch-all `match /{document=**} { allow read, write: if false; }`. The file itself notes the honest limit: rules cannot stop a player editing their *own* save (inherent to client-side saves).
- **No other Firebase credential files exist in the clone.** Searched for `*.env*`, `*service-account*`, `*serviceAccount*`, `*credentials*`, `*.pem`, `*.key` — zero matches. No `.json` file in the tree contains `private_key`. The 13 `.json` files present are vocabulary data, manifests, and test baselines.
- **Runtime behaviour observed:** in this sandbox's headless Chrome the Firebase JS SDK (`gstatic.com/firebasejs/10.12.2/firebase-app-compat.js`) could not be fetched (see §4), so `window.firebase` was `undefined` on load — and the app still rendered and ran fully offline (farm chooser visible, no crash, no error page). Cloud sync/login therefore degrades to offline mode when the SDK is unreachable; nothing in the audit changed any user data.

## 3. Runtime weight — tree size is NOT page weight

| Item | Bytes | Notes |
|---|---|---|
| `index.html` (the document) | 1,930,157 (~1.84 MiB) | 31 inline `<script>` blocks = **1,755,327 bytes of JS**; 25 inline `<style>` blocks = 172,161 bytes of CSS |
| Root `*.js` files (29) | 1,446,626 total | Reference copies of the v7–v26 layers; **not fetched at runtime** — every layer except two is inlined in `index.html` |
| Root `*.css` files (20) | 134,225 total | Also reference copies; **not fetched at runtime** |
| Only external scripts fetched | `vendor/xlsx-0.18.5.full.min.js` 881,922 + `firebase-config.js` 1,549 | The only two `<script src>` in the page |
| Only external stylesheet | Google Fonts CSS (Be Vietnam Pro / Noto Sans KR / Jua) | 1 `<link rel="stylesheet">` + preconnect |
| Git tree total (for contrast) | 47,933,563 bytes / 515 files (per baseline; blob total 47,809,601 / 510 blobs) | ~38.9 MiB of it is `assets/` — almost none of it is requested on first load |

## 4. Baseline first-load measurement (local server, cold cache)

**Setup:** clone served over local HTTP (`python3 -m http.server`, `127.0.0.1:8940`, no compression), fresh Chrome profile per run, cache disabled via CDP, viewport **390×844, mobile, DSF 1**. Measured navigation is a full `location.href` navigation after the domains were enabled (see §6 for why the method matters). Two clean runs were taken; run 4 (final) is reported below, run 3 agrees within ~50 ms on LCP and exactly on CLS.

### Numbers table (source: local HTTP server, 390×844, cold cache)

| Metric | Value (run 4) | Run 3 (repeat) |
|---|---|---|
| Requests sent (HTTP) | **35** | 50* |
| Requests finished / failed | 33 / **2** | 44 / 6* |
| **Transferred bytes** | **5,555,044 B (5.30 MiB)** | 6,494,484 B* |
| — of which document (`index.html`) | 1,930,347 B (34.8%) | 1,930,347 B |
| — of which images | 2,740,513 B (49.3%) | 3,679,953 B* |
| — of which scripts | 883,664 B (15.9%) | 883,664 B |
| — of which other (favicon 404) | 520 B | 520 B |
| `domInteractive` | 615 ms | 586 ms |
| `domContentLoaded` | 698 ms | 631 ms |
| `load` event | 820 ms | 788 ms |
| First paint / First contentful paint | 296 ms / 296 ms | 204 ms / 204 ms |
| **LCP** (PerformanceObserver, document-start) | **928 ms** (IMG, 39,600 px²) | **876 ms** (IMG) |
| **CLS** (PerformanceObserver) | **0.0806** (1 shift) | **0.0806** (1 shift, identical) |
| ScriptDuration (CDP `Performance.getMetrics`) | 0.231 s | 0.125 s (delta method, run 3) |
| V8CompileDuration | 0.001 s (see caveat §6) | −0.093 s delta (invalid, §6) |
| TaskDuration (main thread) | 1.01 s | 0.67 s (delta) |
| Layout / RecalcStyle | 0.010 s / 0.119 s (16 layouts, 169 recalcs) | 0.028 s / 0.141 s |
| JS heap used after load | 26.8 MB | 12.4 MB (run 3) |

\* Run 3 used a `location.reload()` instead of a fresh navigation, which let ~0.96 MB of the pre-reload load's tail leak into the Network capture (and 4 SVG requests were aborted mid-flight by the reload). Run 4 fixed the method; its Network total (5,555,044 B) reconciles with Resource Timing (3,628,242 B resources + 1,930,457 B document) to within ~4 KB. **Use run 4's numbers.**

### Largest runtime assets actually requested (top 10, run 4, by transferred bytes)

| # | Bytes | Asset |
|---|---|---|
| 1 | 882,027 | `vendor/xlsx-0.18.5.full.min.js` (SheetJS — loaded on every first load, only needed for import) |
| 2 | 541,540 | `assets/mascot-chick.png` (welcome/chooser chick) |
| 3 | 210,537 | `assets/mascot/sad.png` |
| 4 | 196,573 | `assets/mascot/sleep.png` |
| 5 | 189,633 | `assets/mascot/hello.png` |
| 6 | 159,483 | `assets/mascot/idle.png` (CSS background) |
| 7 | 157,905 | `assets/mascot/happy.png` |
| 8 | 148,322 | `assets/mascot/jump.png` |
| 9 | 93,762 | `assets/icons/v6/attack.png` |
| 10 | 92,982 | `assets/icons/v6/quest.png` |

All five mascot mood PNGs (~1.15 MB combined) are fetched on first load even though only one mood shows at a time; the `assets/icons/v6/*.png` set (~70–94 KB each) is also fetched eagerly. Boss art (`assets/bosses/`) and pet art (`assets/pets/`) are **not** requested on first load — they load only when those screens open. That is the concrete difference between the ~45.7 MiB tree and the ~5.3 MiB first load.

### The 2 failed requests (both external, both environmental)

| URL | Error |
|---|---|
| `fonts.googleapis.com/css2?...Be+Vietnam+Pro...` | `net::ERR_TUNNEL_CONNECTION_FAILED` |
| `www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js` | `net::ERR_TUNNEL_CONNECTION_FAILED` |

This sandbox reaches the internet through an authenticated egress proxy. `curl` from the shell reaches both hosts (HTTP 200), but this headless Chrome build's proxy tunnel fails for every external host (the live Pages document request failed the same way, §5). **These two failures are an artifact of this sandbox's Chrome, not a defect in the repo** — on a real device both would normally load. Consequences for the numbers above: the page rendered with fallback system fonts (0 webfonts loaded, `document.fonts.size === 0`) and without the Firebase SDK, so LCP/CLS here are the *no-webfont, offline* figures. A real-device load would additionally fetch the font CSS + woff2 files and the Firebase SDK (~100+ KB), and font swap could shift LCP/CLS slightly.

## 5. Live GitHub Pages measurement — NOT obtained

A live measurement was attempted with the identical method and a fresh profile against https://tranminhnhat496-star.github.io/APP-TIENG-HANs/. **It did not produce numbers:** Chrome's document request to `github.io` failed twice with `net::ERR_TUNNEL_CONNECTION_FAILED` (a third attempt was aborted), and the tab showed Chrome's built-in "This site can't be reached" error page (the only "finished" entry, 183,989 B, is that error page itself; `loadEventEnd` 130 ms and the captured LCP entry belong to the error page, not the app). The raw attempt is preserved in `audit/perf-live.json` for the record.

What is established instead, by `curl` (which does work through the proxy): the live site returns HTTP 200 and serves the V15.3 `index.html` byte-for-byte identical to the clone (sha256 match, §1). Live transfer would therefore differ from the local numbers mainly in that GitHub Pages serves gzip/brotli (the local `python3 -m http.server` serves uncompressed) and in CDN latency — but **no live transfer, LCP, or CLS number is claimed here**, because none was measured.

## 6. Method & reproducibility

- `audit/perf-measure.js` drives Chrome via CDP: `Network` + `Performance` domains enabled, cache cleared and disabled, `Page.addScriptToEvaluateOnNewDocument` installing a `PerformanceObserver` for `largest-contentful-paint` and `layout-shift` at document start, then a full navigation and a settle wait (readyState complete + resource count stable for 2 s, max 30 s). Totals come from CDP `Network.loadingFinished` `encodedDataLength`; LCP/CLS from the observer; paint/timing from the Navigation and Paint timing entries; JS cost from CDP `Performance.getMetrics`.
- **Why the observer, not `getEntriesByType`:** in this Chrome build, `performance.getEntriesByType('largest-contentful-paint')` returned **0 entries in every run** even though paints happened — while the document-start observer captured 5 entries (verified by a direct probe after the run: observer 5 entries, `getEntriesByType` 0). LCP/CLS in this report are the observer's values (the same mechanism the `web-vitals` library uses). FCP/FP come from the Paint entries, which behaved normally.
- **Why run 4 supersedes run 3:** run 3 measured a `location.reload()` issued while the initial load was still settling, contaminating the Network total with ~0.96 MB of pre-reload tail traffic. Run 4 waits for the initial load to settle before enabling Network and then performs a clean navigation. Run 3's timeline-based figures (LCP 876 ms, CLS 0.0806, DCL/load) remain valid and are shown as a repeat.
- **JS parse/compile caveat:** `Performance.getMetrics` reports `ScriptDuration ≈ 0.23 s` for the load and `V8CompileDuration ≈ 0.001 s`. The compile figure looks implausibly low for 1.76 MB of inline JS + 0.88 MB of SheetJS, and the delta-across-navigation computation even went negative in run 3 (−0.093 s), which shows these counters reset on navigation and are not reliably differenced. V8 lazily parses most function bodies, so eager compile genuinely is small — but the ~1 ms figure was **not independently verified with the Profiler**, so treat `ScriptDuration ≈ 0.23 s` as the headline JS cost and the compile figure as "reported, unverified".
- **What the measured view was:** the profile had already completed one initial load (the goto-redirect load) before the measured navigation, so `localStorage` already held a seeded save; the measured load settled into the **farm chooser view** (body text captured: Korean Farm / English Farm / English Hub / Pet / Lv 1 / 20 XP). A separate screenshot taken ~1.2 s after a navigation in the same profile (`audit/shot-local-390.png`) shows the V13 **welcome screen** instead — the app transitions welcome → chooser during the first seconds after load. LCP/CLS here describe the load settling into the chooser, not the welcome screen's first paint.
- **Run-to-run variance:** LCP 876 ms (run 3) vs 928 ms (run 4); CLS identical (0.0806) in both runs — a single deterministic shift, almost certainly the farm chooser appearing ~600 ms after load (the LCP sequence also steps at 296/492/696/896/928 ms as content appears). Single-run numbers on shared-CPU headless Chrome; treat them as baseline orders of magnitude, not device benchmarks.

## 7. HONEST — what was NOT measured or claimed

- **No live GitHub Pages performance numbers.** Chrome in this sandbox cannot reach the internet (proxy tunnel failure); only `curl` header/body checks succeeded. Any live LCP/CLS/transfer figure would be invented — none is given.
- **No real-phone, real-network, or Safari measurement.** All numbers are headless Chromium on a Linux VM, localhost server, no network throttling, no CPU throttling. A 4G phone will be slower; repeat-visit (cached) loads were not measured either.
- **No webfont numbers.** Google Fonts failed to load in this Chrome (environmental, §4), so the measured render used fallback fonts. Font CSS + woff2 bytes and any font-swap layout shift on a real device are not in the totals.
- **No Firebase login/sync test.** The SDK never loaded in this Chrome; no login, sync, or Firestore round-trip was exercised. The app's offline rendering was observed only.
- **No interaction measurements.** Only first load was measured — no Hub navigation, Boss Map, Pet Hub, battle, or mode timings.
- **LCP via `getEntriesByType` returned nothing** (observer used instead; §6). **V8CompileDuration ≈ 1 ms is reported but unverified** (§6). CLS 0.0806 is under the 0.1 "good" threshold but close to it, and comes from a single shift — it is a first-load figure only.
- **No CI or browser test was run for this audit** beyond the measurements above (there is no CI to run). Nothing in the clone or repo was modified.

## 8. Findings worth carrying into the cleanup PR

1. **No CI exists.** Any smoke test (missing asset, script/CSS marker, vocabulary data, Firebase config presence) needs a new workflow; there is nothing to "fix" — it is greenfield.
2. **First load is ~5.3 MiB cold, ~half of it images.** The document itself (1.93 MB, mostly inline JS) is the single largest item; SheetJS (0.88 MB) loads on every first load although it is only needed for import; all five mascot moods (~1.15 MB) load eagerly. These are the cheap, high-yield candidates for lazy-loading — but all are medium/high-risk changes needing regression tests, not part of this read-only audit.
3. **CLS 0.0806 is near the 0.1 threshold** and comes from one deterministic shift (chooser appearing ~600 ms in). If the cleanup touches first-load rendering, re-measure this.
4. **External dependencies are graceful when absent** (fonts fall back, Firebase SDK missing → offline mode, no crash), which is good — but it also means a broken CDN would silently degrade fonts/sync. A smoke test asserting the two external URLs are reachable from CI would catch that class of failure.
5. **Pages caching is `max-age=600`** (10 minutes) on the HTML — deploys propagate within minutes, not instantly; any "stale site" report should wait past that window.
