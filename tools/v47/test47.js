// test47.js - V19.2 (layer V47) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused from tools/v46/test46.js with ONE correction: loadPage() now
// also resets the module-level dynIds set (test46 never reset it, so
// init15()'s v15langbar guard saw a stale id from an earlier ctx and
// skipped pushDataIntoV14() in every later ctx — WORDS 1577 instead of
// 4892). Only the EXPECTED_SHA / EXPECTED_BYTES constants were otherwise
// updated to the V19.2 build.
// Usage: node tools/v47/test47.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// The Node process is exited explicitly at the end: the game starts
// real setInterval timers (e.g. Matching) that keep the event loop
// alive after the checks finish.
// Covers (per task + review-C-c33.md §6):
//   section 0 static build integrity (hash, title, markers, V47
//         fragments with exact counts, devoted row GONE / kept row
//         once / a1a2 998 / oxford 3395, V46+V45+V44 fragments
//         survive, OLD V47 fragments gone, v14js block untouched)
//   section L page load (vm, real inline scripts) + __v47 exports
//   section 47A keying — each twin pair length 2 with distinct ids
//         (w1371/a1a2_680, w18/a1a2_806, w1469/a1a2_912); devoted
//         length 1; __v14.ENWORDS has no second-sense row; the id
//         set differs from pristine V19.0.1 by exactly the 3 twins;
//         no new id starts with w+digits
//   section 47B attach integrity — primary keeps oxLessons/oxOrdMap/
//         lib incl. oxford + Oxford extra; twin lib===['a1a2'], no
//         oxLessons, no extra; primary a1a2Topics single-element;
//         topics() counts BODY PARTS 25, EMOTIONS 119, FRUIT 53,
//         COLORS 54, CLOTHES 57, FAMILY 99; COLORS group name is
//         'COLORS AND SHAPES' (pristine mislabels it 'FRUIT AND
//         VEGETABLES'); a1a2Total()===998
//   section 47C SRS independence — mark15 on a twin moves only the
//         twin's box; counts15().total===4892; fresh profile twin
//         is new while the primary can be mastered; an existing save
//         with box['w18']===5 loads primary mastered + twin new
//   section 47D distractor guard (property test, seeded) — v15
//         Review with a forced question word: 500 draws per twin
//         per direction (primary-as-Q / twin-as-Q), all 3 pairs,
//         each under its own topic scope (primary: first topic;
//         twin: twin topic); v27 Smart mc-ev the same 500x2x3
//         (1-word lists force mc-ev) + 100x2x3 listen draws
//         (EN-text option sets never contain two identical en
//         strings); v18/v19 long scoped fights: 6 scopes per engine
//         (twin topic + primary first topic per pair), 60 pair-Q
//         observations each (>=360 per engine), zero violations on
//         opts/optsVi, with a stall detector (a fight that stops
//         advancing fails fast instead of spinning the fight cap).
//         comment in main): the t/lv pool pre-filter means only
//         sluggish's mate is a live distractor candidate on every
//         draw; orange/trip mates are already excluded by that older
//         filter, so their draws assert the no-same-en invariant
//         while the guard itself is proven tight on sluggish +
//         statically (x9 sites).
//   section 47E Match — pickPool never returns both twins in 500
//         sessions (COLORS scope); 6 distinct EN tiles every time
//   section 47F Library/rewards — COLORS reward requires the twin
//         learned (not the primary); claimed stays claimed; FAMILY
//         gates at 99; Library cards distinguishable (sense labels)
//   section 47G regression — legDiff thresholds + live Legendary
//         pools 550/250/630 + grammar 24/12/12; KO XP 8 correct =
//         +85 both engines; EN XP sequences identical to pristine
//         V19.0.1 (seeded); V19.0 C-R3-1/C-R3-2/C-R3-4/NEW-1/
//         weakchip spot-checks
//   section V save schema (no en47 key, no new localStorage key,
//         no new top-level S.v7 key vs pristine)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint); the
// painted Library cards, the real click + answer states, the 360px
// overflow check, and the per-question screens are Chrome gates in
// verify-v47c.js, not asserted here; live-browser, real-phone and
// live-Firebase gates stay Chrome/Anh-only.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = '0aff5cebb7474535c3d7f635b289aaffe81d4f023d0bc64d798ae25fb918037f';
const EXPECTED_BYTES = 2457229;
let pass = 0, fail = 0, skip = 0;
const failures = [];
const secCounts = {};
let curSec = '';
function section(id, t) { curSec = id; secCounts[id] = secCounts[id] || { pass: 0, fail: 0, skip: 0 }; console.log(`\n== ${id} ${t} ==`); }
function check(name, cond, detail) {
  if (cond) { pass++; secCounts[curSec].pass++; console.log(`  PASS ${name}`); }
  else { fail++; secCounts[curSec].fail++; failures.push(curSec + ' ' + name); console.log(`  FAIL ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 500) : ''}`); }
}
function skipCheck(name, why) { skip++; secCounts[curSec].skip++; console.log(`  SKIP ${name} — ${why}`); }
function countOcc(hay, needle) { return hay.split(needle).length - 1; }

// ---------- WCAG contrast helpers (same math as the Chrome probe) ----------
function hx(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function lum(rgb) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}
function ratio(fg, bg) {
  const l1 = lum(typeof fg === 'string' ? hx(fg) : fg), l2 = lum(typeof bg === 'string' ? hx(bg) : bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function toRgb(c) { return typeof c === 'string' ? hx(c) : c; }
function blend(fg, bg, a) { const f = toRgb(fg), b = toRgb(bg); return [Math.round(f[0] * a + b[0] * (1 - a)), Math.round(f[1] * a + b[1] * (1 - a)), Math.round(f[2] * a + b[2] * (1 - a))]; }
function mixBlack(hex, pct) { // colour-mix(in srgb, hex pct, #000)
  const c = hx(hex); return [Math.round(c[0] * pct), Math.round(c[1] * pct), Math.round(c[2] * pct)];
}
function checkRatio(name, fg, bg, need) {
  const r = ratio(fg, bg);
  check(`${name}: ${typeof fg === 'string' ? fg : 'rgb(' + fg.join(',') + ')'} on ${typeof bg === 'string' ? bg : 'rgb(' + bg.join(',') + ')'} = ${r.toFixed(2)}:1 (need ${need})`, r >= need, r.toFixed(2));
}

// ---------- localStorage stub ----------
function makeLS() {
  const m = new Map();
  const ls = {
    getItem(k) { const v = m.get(k); return v === undefined ? null : v; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
    clear() { m.clear(); },
    key(i) { return Array.from(m.keys())[i] || null; },
  };
  Object.defineProperty(ls, 'length', { get() { return m.size; } });
  return ls;
}
// ---------- minimal DOM stub (same loading pattern as test34.js) ----------
let staticIds = new Set(), dynIds = new Set();
function makeEl(tag) {
  const el = {
    tagName: (tag || 'DIV').toUpperCase(), children: [], style: {}, dataset: {},
    className: '', _id: '', textContent: '', innerHTML: '', value: '',
    get id() { return el._id; },
    set id(v) { el._id = v; if (v) dynIds.add(v); },
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c) { if (this._s.has(c)) this._s.delete(c); else this._s.add(c); }, contains(c) { return this._s.has(c); } },
    setAttribute(k, v) { el['_attr_' + k] = v; },
    getAttribute(k) { const v = el['_attr_' + k]; return v === undefined ? null : v; },
    appendChild(c) { el.children.push(c); return c; },
    append(...cs) { cs.forEach(c => { if (c != null) el.children.push(c); }); },
    prepend(...cs) { cs.reverse().forEach(c => { if (c != null) el.children.unshift(c); }); },
    insertBefore(c, ref) { const i = el.children.indexOf(ref); if (i >= 0) el.children.splice(i, 0, c); else el.children.push(c); return c; },
    after(...cs) { if (!el.parentNode) return; const i = el.parentNode.children.indexOf(el); el.parentNode.children.splice(i + 1, 0, ...cs.filter(c => c != null)); },
    before(...cs) { if (!el.parentNode) return; const i = el.parentNode.children.indexOf(el); el.parentNode.children.splice(Math.max(i, 0), 0, ...cs.filter(c => c != null)); },
    replaceWith(c) { if (!el.parentNode || !c) return; const i = el.parentNode.children.indexOf(el); if (i >= 0) el.parentNode.children[i] = c; },
    addEventListener() {}, removeEventListener() {}, scrollIntoView() {},
    remove() {}, focus() {}, click() {},
    querySelector(sel) {
      if (sel.startsWith('.')) { const cls = sel.slice(1); const hit = el.children.find(c => String(c.className || '').split(' ').includes(cls)); if (hit) return hit; }
      if (sel.startsWith('#')) { const id = sel.slice(1); const hit2 = el.children.find(c => c.id === id); if (hit2) return hit2; }
      if (!el.__selMap) el.__selMap = {};
      if (!el.__selMap[sel]) { const s = makeEl('div'); s._sel = sel; el.__selMap[sel] = s; }
      return el.__selMap[sel];
    },
    querySelectorAll() { return []; },
  };
  return el;
}
function makeDocument() {
  const byId = {};
  const body = makeEl('body');
  const doc = {
    readyState: 'loading',
    __listeners: {},
    addEventListener(type, fn) { (doc.__listeners[type] = doc.__listeners[type] || []).push(fn); },
    removeEventListener() {},
    getElementById(id) { if (!staticIds.has(id) && !dynIds.has(id)) return null; if (!byId[id]) { const e = makeEl('div'); e._id = id; byId[id] = e; } return byId[id]; },
    querySelector(sel) {
      if (doc.__queryMap && doc.__queryMap[sel]) return doc.__queryMap[sel];
      if (sel.startsWith('#') && sel.indexOf(' ') < 0) return doc.getElementById(sel.slice(1));
      if (sel === 'body') return body;
      if (!doc.__selMap) doc.__selMap = {};
      if (!doc.__selMap[sel]) { const e = makeEl('div'); e._sel = sel; doc.__selMap[sel] = e; }
      return doc.__selMap[sel];
    },
    querySelectorAll() { return []; },
    createElement: (t) => makeEl(t),
    createTreeWalker() { return { nextNode() { return null; }, currentNode: null }; },
    createNodeIterator() { return { nextNode() { return null; } }; },
    head: makeEl('head'), body,
    documentElement: makeEl('html'),
  };
  doc._byId = byId;
  doc.__queryMap = {};
  return doc;
}
class MutationObserverStub { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} takeRecords() { return []; } }
class AudioStub { constructor() {} play() { return Promise.resolve(); } pause() {} }
class SpeechUtteranceStub { constructor(t) { this.text = t || ''; } }
function makeCtx() {
  const sandbox = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    addEventListener() {}, removeEventListener() {},
    navigator: { onLine: true },
    location: { reload() {} },
    MutationObserver: MutationObserverStub,
    NodeFilter: { SHOW_ALL: 0xFFFFFFFF, SHOW_ELEMENT: 1, SHOW_ATTRIBUTE: 2, SHOW_TEXT: 4, SHOW_COMMENT: 128, SHOW_DOCUMENT: 256, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
    Audio: AudioStub,
    Image: class ImageStub { constructor() { this.src = ''; this.onload = null; this.onerror = null; } },
    SpeechSynthesisUtterance: SpeechUtteranceStub,
    SpeechRecognition: class SpeechRecognitionStub { constructor() { sandbox.__lastSR = this; this.lang = ''; this.interimResults = false; this.maxAlternatives = 1; this.onresult = null; this.onerror = null; this.onend = null; } start() {} stop() {} },
    speechSynthesis: { cancel() {}, speak() {} },
    Blob: class Blob { constructor() {} },
    URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
    requestAnimationFrame(cb) { return 0; },
    matchMedia() { return { matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }; },
    getComputedStyle() { return { getPropertyValue() { return ''; } }; },
    crypto: { getRandomValues(a) { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; } },
    atob(s) { return Buffer.from(s, 'base64').toString('binary'); },
    btoa(s) { return Buffer.from(s, 'binary').toString('base64'); },
    performance: { now() { return Date.now(); } },
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    fetch() { return Promise.reject(new Error('no network in probe')); },
  };
  sandbox.window = sandbox;
  sandbox.document = makeDocument();
  sandbox.localStorage = makeLS();
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  ctx.__sandbox = sandbox;
  return ctx;
}
function E(ctx, expr) { return vm.runInContext(expr, ctx); }
function J(ctx, expr) { return JSON.parse(vm.runInContext(expr, ctx)); }
function loadPage(ctx, html) {
  staticIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  dynIds = new Set(); // V47 harness correction vs test46: dynIds is module-level
  // and NEVER reset by test46's loadPage. init15() early-returns when
  // getElementById('v15langbar') is non-null, and the stub returns an
  // element for any id in dynIds — so after the first ctx created the
  // bar, every later ctx skipped pushDataIntoV14() and built WORDS from
  // the unpushed 96-word ENWORDS (1577 words, V17-only primaries and
  // their twins missing). A real browser has a fresh DOM per load, so
  // this is purely a harness artifact; resetting per load restores it.
  const blocks = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let mm;
  while ((mm = re.exec(html)) !== null) blocks.push(mm[1]);
  let loadErr = null;
  for (let i = 0; i < blocks.length; i++) {
    try { vm.runInContext(blocks[i], ctx, { filename: `inline-${i}` }); }
    catch (e) { loadErr = `block ${i}: ${e.message}`; break; }
  }
  return { blocks: blocks.length, loadErr };
}
function fireDCL(ctx) {
  const ls = ctx.document.__listeners['DOMContentLoaded'] || [];
  ls.forEach(fn => { try { fn({ type: 'DOMContentLoaded' }); } catch (e) {} });
}
// test46.js - V19.0.1 (layer V46) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v45/test45.js (same lines 34-204); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V19.0.1 build.
// Usage: node tools/v46/test46.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V46 fragments,
//         OLD legDiff def + OLD mark blocks GONE, thresholds intact,
//         23 weakness overrides, EN fallbacks intact, V33-V45 survive)
//   section L page load (vm, real inline scripts) + __v46 + __V46_DATA exports
//   section 46A legDiff thresholds at mastered 0/199/200/599/600/700 +
//         live Legendary pools (exact levels + counts) + grammar pools +
//         failure path warns and falls back to A2/B1 (never silent)
//   section 46B weakness redesign — recount 0 pool-blocked / 15 distinct
//         at mastered 0/200/600/700; the 23 overrides exact; the other
//         63 bosses unchanged vs the V19.0 table; meter mechanics
//         (breakDmg 3 hits = BREAK) + live scopeBlocked=false spot checks
//   section 46C KO/EN XP parity — shared-function unit rules (box-up,
//         cooldown, streak, wrong=0, hist/daily), live KO fights pay XP
//         in both engines, per-answer rule holds on observed sequences,
//         koStreak + 'ko:' xpAt keys, first-win/replay unchanged
//   section 46D EN XP unchanged vs pristine V19.0 (seeded Math.random,
//         identical drivers on both builds: exact EN fight deltas)
//   section 46E regression spot-checks (V19.0 due counts, corrupt
//         quarantine, enIcon guard, Legendary fight starts, C-02 shield,
//         V19 Counterattack, A-F2 KO<8 banner)
//   section V save schema (no new localStorage key, koStreak inside
//         en18/en19 state only, no en46 key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint); the painted
// fight, real clicks, 360px overflow, full end-to-end fight wins at
// 200/600, and per-question screens are Chrome gates in verify-v46c.js,
// not asserted here; live-browser, real-phone and live-Firebase gates
// stay Chrome/Anh-only.
async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v47.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const pristinePath = path.join(ROOT, 'tools', 'v47', 'backup-v19.0.1', 'index.html');
  const pristineHtml = fs.readFileSync(pristinePath, 'utf-8');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const J2 = (ctx, expr) => JSON.parse(vm.runInContext(expr, ctx));
  function mulberry32(seed) {
    let s = seed | 0;
    return function () {
      s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function seededCtx(htmlText, seed) {
    const c = makeCtx();
    c.__seededRandom = mulberry32(seed);
    E(c, `Math.random=__seededRandom;`);
    const loaded = loadPage(c, htmlText);
    if (loaded.loadErr) { console.log(`LOAD ERR (seed ${seed}):`, loaded.loadErr); process.exit(1); }
    fireDCL(c);
    E(c, `window.__v15.buildWords()`);
    return c;
  }
  function levelsEq(a, b) {
    if (!a || !b) return false;
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    return JSON.stringify(ka) === JSON.stringify(kb) && ka.every(k => a[k] === b[k]);
  }
  function setMastered(ctx, n) {
    return J(ctx, `JSON.stringify((function(){
      var v15=window.__v15, words=v15.words, old=v15.enOld();
      Object.keys(old.box||{}).forEach(function(k){ old.box[k]=0; });
      for(var i=0;i<${n}&&i<words.length;i++) old.box[words[i].id]=5;
      v15.save15();
      return {mastered:v15.counts15().mastered, legDiff:window.__v18._test.legDiff()};
    })())`);
  }
  const PAIRS = [
    { en: 'sluggish', primId: 'w1371', twinId: 'a1a2_680', twinNo: 680, topic: 'a1_emotions-and-feelings', topicName: 'EMOTIONS AND FEELINGS', firstTopic: 'a1_body-parts', firstNo: 403, twinVi: 'lờ đờ, chậm chạp' },
    { en: 'orange', primId: 'w18', twinId: 'a1a2_806', twinNo: 806, topic: 'a1_colors-and-shapes', topicName: 'COLORS AND SHAPES', firstTopic: 'a1_fruit-and-vegetables', firstNo: 313, twinVi: 'màu cam' },
    { en: 'trip', primId: 'w1469', twinId: 'a1a2_912', twinNo: 912, topic: 'a1_family', topicName: 'FAMILY', firstTopic: 'a1_clothes-and-accessories', firstNo: 530, twinVi: 'cuộc du ngoạn, dạo chơi' },
  ];
  const GUARD = "(x.en||'').toLowerCase()!==(w.en||'').toLowerCase()";
  function wordsMap(ctx) {
    return J(ctx, `JSON.stringify((function(){var o={};window.__v15.words.forEach(function(w){o[w.id]={id:w.id,en:w.en,vi:w.vi,lv:w.lv,t:w.t}});return o})())`);
  }

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V19.2 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is the V19.2 size', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('V19.2 title present, V19.0.1 title gone', html.includes('V19.2 — Duplicate Senses') && !html.includes('V19.0.1 — Legendary Scaling &amp; KO Boss XP'));
  check('v47js marker present, last script, after v46js', html.includes('id="v47js"') && html.lastIndexOf('id="v47js"') > html.lastIndexOf('id="v46js"'));
  check('__v47 19.2.0 present', html.includes("window.__v47={") && html.includes("VERSION='19.2.0'"));
  check('labelOf definition + global exposure present once each', countOcc(html, 'function labelOf(w){') === 1 && countOcc(html, 'window.labelOf=labelOf;') === 1);
  check('splitDuplicateSenses definition + hook call present once each', countOcc(html, 'function splitDuplicateSenses(WORDS,BYID){') === 1 && countOcc(html, '__v47.splitDuplicateSenses(WORDS,BYID)') === 1);
  check('headword guard present x9 (v15x2 + v18x2 + v19x2 + v27x3)', countOcc(html, GUARD) === 9, countOcc(html, GUARD));
  check('labelOf(w) occurrences x7 (5 call sites + definition + header comment)', countOcc(html, 'labelOf(w)') === 7, countOcc(html, 'labelOf(w)'));
  check('labelOf(w2) call sites x3 (v15/v18/v19 boss meaning mode)', countOcc(html, 'labelOf(w2)') === 3, countOcc(html, 'labelOf(w2)'));
  check('pickPool headword dedupe present once', countOcc(html, 'var seen={},ded=[];') === 1);
  check('devoted row (no 938) GONE from the built html', !html.includes('"no": 938'));
  check('kept devoted row (no 351) present exactly once', countOcc(html, '"no": 351}') === 1);
  check('A1-A2 raw rows are 998 (was 999)', countOcc(html, '"src": "a1a2"') === 998, countOcc(html, '"src": "a1a2"'));
  check('Oxford raw rows still 3395', countOcc(html, '"src": "oxford"') === 3395);
  for (const no of [680, 806, 912]) check(`kept twin row no ${no} present exactly once`, countOcc(html, `"no": ${no}}`) === 1);
  check('OLD unguarded v15 base pool gone', !html.includes("var pool=WORDS.filter(function(x){return x.id!==w.id&&(x.t===w.t||x.lv===w.lv)});"));
  check('OLD unguarded v18/v19 base pool gone', !html.includes("var pool=words.filter(function(x){return x.id!==w.id&&(x.t===w.t||x.lv===w.lv)});"));
  check('OLD unguarded v27 base pool + rest fallback gone', !html.includes("pool=v.words.filter(function(x){return x.id!==w.id&&(x.t===w.t||x.lv===w.lv)});") && !html.includes("var rest=v.words.filter(function(x){return x.id!==w.id&&pool.indexOf(x)<0});"));
  check('OLD pickPool return (no dedupe) gone', !html.includes("return shuffle(list).slice(0,n);\n}\nfunction distractors(w,n){"));
  check('OLD v27 mc-ev prompt (bare w.en) gone', !html.includes("var q=kind==='mc-ev'?w.en:w.vi, isEv=kind==='mc-ev';"));
  check('V46 legDiff NEW def survives x1, OLD def gone, thresholds x1', countOcc(html, "function legDiff(){var m=0;try{var c=V15().counts;") === 1 && !html.includes("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}") && countOcc(html, "if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']") === 1);
  check('V46 shared XP function + koStreak survive', countOcc(html, 'awardBossAnswerXP') >= 7 && countOcc(html, 'koStreak') >= 6);
  check('V46 19.0.1 version + __V46_DATA survive', countOcc(html, "VERSION='19.0.1'") === 1 && countOcc(html, 'window.__V46_DATA={') === 1);
  check('V45 due fragment survives', html.includes("if(b>=1&&b<=4&&(e.due[w.id]||0)<=now)c.due++;"));
  check('V45 corrupt quarantine + snapshot key survive', html.includes('hanvocab.v12.corrupt-') && html.includes("var k='hanvocab.v12.preimport-'+Date.now()+'-'+(++_snapSeq45)+'-'+Math.random().toString(36).slice(2,8);"));
  check('V45 enIcon falsy guard survives', html.includes("if(!name)return '';"));
  check('weakchip light list-row rule survives x2', countOcc(html, '.v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}') === 2);
  check('weakchip dark rule survives x5', countOcc(html, '.v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}') === 5);
  check('V44 hoisted legDiff call sites survive x2', countOcc(html, "var lv=b.arena==='leg'?legDiff():null;") === 2);
  check('no new MutationObserver sites in v47 src', !fs.readFileSync(path.join(ROOT, 'src', 'v47.js'), 'utf-8').includes('MutationObserver'));
  check('v14js block untouched by V47 (no a1a2_ twin id, no labelOf inside it)', (() => {
    const m = html.match(/<script id="v14js">([\s\S]*?)<\/script>/);
    return !!m && m[1].indexOf('a1a2_') < 0 && m[1].indexOf('labelOf') < 0 && m[1].indexOf('splitDuplicateSenses') < 0;
  })());

  // ================= §L page load =================
  section('§L', 'page load (vm, real inline scripts)');
  const ctx = makeCtx();
  const warnsL = [];
  const _origWarn = console.warn;
  console.warn = (...a) => warnsL.push(a.join(' '));
  const loaded = loadPage(ctx, html);
  check('inline script blocks extracted (>=30)', loaded.blocks >= 30, loaded.blocks);
  check('all inline scripts evaluate without error', loaded.loadErr === null, loaded.loadErr);
  if (loaded.loadErr) { console.log(`\ntest47 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran)', E(ctx, `document.getElementById('v15langbar')!==null`));
  E(ctx, `window.__v15.buildWords()`);
  check('WORDS built (4892 = 4889 + 3 twins)', E(ctx, `window.__v15.words.length`) === 4892, E(ctx, `window.__v15.words.length`));
  check('__v47 exports version 19.2.0 + split + labelOf', E(ctx, `window.__v47&&window.__v47.version==='19.2.0'&&typeof window.__v47.splitDuplicateSenses==='function'&&typeof window.__v47.labelOf==='function'`));
  check('labelOf is a bare global (render sites call it directly)', E(ctx, `typeof labelOf==='function'`));
  check('split ran clean (no problems recorded)', E(ctx, `window.__v47._test.problems().length`) === 0, E(ctx, `window.__v47._test.problems()`));
  check('split made >=3 twins (init + explicit buildWords)', E(ctx, `window.__v47._test.made()`) >= 3, E(ctx, `window.__v47._test.made()`));
  check('no console.warn during clean load', warnsL.length === 0, warnsL);
  console.warn = _origWarn;

  // ================= §47A keying =================
  section('§47A', 'keying — twins are WORDS-only records, V14 blind');
  for (const p of PAIRS) {
    const recs = J(ctx, `JSON.stringify(window.__v15.words.filter(function(w){return (w.en||'').toLowerCase()==='${p.en}'}).map(function(w){return w.id}))`);
    check(`${p.en}: exactly 2 WORDS records with distinct ids (${p.primId} / ${p.twinId})`, recs.length === 2 && recs[0] === p.primId && recs[1] === p.twinId, recs);
  }
  const devRecs = J(ctx, `JSON.stringify(window.__v15.words.filter(function(w){return w.en==='devoted'}).map(function(w){return w.id}))`);
  check('devoted: exactly 1 WORDS record (w1320) after the merge', devRecs.length === 1 && devRecs[0] === 'w1320', devRecs);
  const enw = J(ctx, `JSON.stringify((function(){
    var out={};
    ['sluggish','orange','trip','devoted'].forEach(function(en){
      out[en]=window.__v14.ENWORDS.filter(function(r){return (r[1]||'').toLowerCase()===en}).map(function(r){return r[1]+' | '+r[2]});
    });
    out.twinVi=window.__v14.ENWORDS.filter(function(r){return ['lờ đờ, chậm chạp','màu cam','cuộc du ngoạn, dạo chơi'].indexOf(r[2])>=0}).length;
    return out;
  })())`);
  check('__v14.ENWORDS holds exactly one row per headword (first row wins)', PAIRS.every(p => enw[p.en].length === 1) && enw.devoted.length === 1, enw);
  check('__v14.ENWORDS has no second-sense row (twin vi absent)', enw.twinVi === 0, enw);
  check('WORDS id set differs from pristine V19.0.1 by exactly the 3 twin ids', (() => {
    function idSet(htmlText) {
      const c = makeCtx();
      const l = loadPage(c, htmlText);
      if (l.loadErr) return null;
      fireDCL(c);
      E(c, `window.__v15.buildWords()`);
      return new Set(E(c, `window.__v15.words.map(function(w){return w.id})`));
    }
    const sNew = idSet(html), sOld = idSet(pristineHtml);
    if (!sNew || !sOld) return false;
    const added = [...sNew].filter(id => !sOld.has(id)).sort();
    const removed = [...sOld].filter(id => !sNew.has(id));
    return JSON.stringify(added) === JSON.stringify(['a1a2_680', 'a1a2_806', 'a1a2_912']) && removed.length === 0;
  })());
  check('no WORDS id is a new w+digits id (twins are a1a2_NNN)', E(ctx, `(function(){var bad=[];window.__v15.words.forEach(function(w){if(/^w\\d+$/.test(w.id||'')&&parseInt(w.id.slice(1),10)>=4409)bad.push(w.id)});return bad.length===0})()`));
  check('all WORDS ids are unique', E(ctx, `(function(){var s={},d=0;window.__v15.words.forEach(function(w){if(s[w.id])d++;s[w.id]=1});return d===0})()`));
  check('counts15().total===4892', E(ctx, `window.__v15.counts15().total`) === 4892);

  // ================= §47B attach integrity =================
  section('§47B', 'attach integrity — primary keeps Oxford, twin is a1a2-only');
  for (const p of PAIRS) {
    const prim = J(ctx, `JSON.stringify((function(){var w=window.__v15.words.filter(function(x){return x.id==='${p.primId}'})[0];return {t:w.t,lv:w.lv,lib:w.lib,a1a2Topics:w.a1a2Topics,a1a2Topic:w.a1a2Topic,a1a2NoMap:w.a1a2NoMap,a1a2No:w.a1a2No,oxLessons:w.oxLessons||null,oxOrdMap:w.oxOrdMap||null,extra:(w.extra||[]).map(function(x){return x.src+':'+x.vi})}})())`);
    check(`${p.en} primary keeps its topic/level (t=${prim.t}, lv=${prim.lv})`, (p.en === 'orange' ? (prim.t === 'fruits' && prim.lv === 'A1') : (prim.lv === (p.en === 'sluggish' ? 'A1-A2' : 'OX'))), prim);
    check(`${p.en} primary restricted to its first topic [${p.firstTopic}]`, JSON.stringify(prim.a1a2Topics) === JSON.stringify([p.firstTopic]) && prim.a1a2Topic === p.firstTopic, prim);
    check(`${p.en} primary a1a2NoMap holds only the first topic (no ${p.twinNo})`, prim.a1a2NoMap && Object.keys(prim.a1a2NoMap).length === 1 && prim.a1a2NoMap[p.firstTopic] === p.firstNo && prim.a1a2No === p.firstNo, prim);
    check(`${p.en} primary twin sense removed from extra[] (no a1a2:${p.twinVi})`, !(prim.extra || []).some(x => x === 'a1a2:' + p.twinVi), prim);
    if (p.en !== 'sluggish') {
      check(`${p.en} primary keeps its Oxford extra + oxLessons + oxOrdMap`, (prim.extra || []).some(x => x.indexOf('oxford:') === 0) && Array.isArray(prim.oxLessons) && prim.oxLessons.length >= 1 && !!prim.oxOrdMap, prim);
      check(`${p.en} primary lib still includes oxford`, (prim.lib || []).indexOf('oxford') >= 0, prim);
    } else {
      check('sluggish primary has no Oxford attach (never had one)', !prim.oxLessons && !(prim.lib || []).includes('oxford'), prim);
    }
    const twin = J(ctx, `JSON.stringify((function(){var w=window.__v15.words.filter(function(x){return x.id==='${p.twinId}'})[0];return {id:w.id,t:w.t,en:w.en,vi:w.vi,ipa:w.ipa,pos:w.pos,ex:w.ex,exvi:w.exvi,lv:w.lv,custom:w.custom,lib:w.lib,a1a2Topics:w.a1a2Topics,a1a2Topic:w.a1a2Topic,a1a2TopicName:w.a1a2TopicName,a1a2NoMap:w.a1a2NoMap,a1a2No:w.a1a2No,sense:w.sense,hasExtra:!!w.extra,hasOx:!!w.oxLessons}})())`);
    check(`${p.en} twin has the exact spec record`, twin.id === p.twinId && twin.t === p.topic && twin.en === p.en && twin.vi === p.twinVi && twin.lv === 'A1-A2' && twin.custom === false && twin.ex === '' && twin.exvi === '' && JSON.stringify(twin.lib) === JSON.stringify(['a1a2']) && JSON.stringify(twin.a1a2Topics) === JSON.stringify([p.topic]) && twin.a1a2Topic === p.topic && twin.a1a2TopicName === p.topicName && twin.a1a2NoMap && twin.a1a2NoMap[p.topic] === p.twinNo && twin.a1a2No === p.twinNo && twin.sense === p.topicName, twin);
    check(`${p.en} twin has NO extra, NO oxLessons, NO Oxford attach`, twin.hasExtra === false && twin.hasOx === false, twin);
  }
  const topicCounts = J(ctx, `JSON.stringify((function(){var o={};window.__v17.topics().forEach(function(g){o[g.id]=g.words.length});return o})())`);
  check('topic counts: BODY PARTS 25, EMOTIONS 119, FRUIT 53, COLORS 54, CLOTHES 57, FAMILY 99',
    topicCounts['a1_body-parts'] === 25 && topicCounts['a1_emotions-and-feelings'] === 119 && topicCounts['a1_fruit-and-vegetables'] === 53 && topicCounts['a1_colors-and-shapes'] === 54 && topicCounts['a1_clothes-and-accessories'] === 57 && topicCounts['a1_family'] === 99, topicCounts);
  const colorName = J(ctx, `JSON.stringify(window.__v17.topics().filter(function(g){return g.id==='a1_colors-and-shapes'})[0].name)`);
  check("COLORS group is now named 'COLORS AND SHAPES' (was mislabeled by orange's topic name)", colorName === 'COLORS AND SHAPES', colorName);
  const colorNameOld = (() => {
    const c = makeCtx();
    const l = loadPage(c, pristineHtml);
    if (l.loadErr) return null;
    fireDCL(c);
    E(c, `window.__v15.buildWords()`);
    return J(c, `JSON.stringify(window.__v17.topics().filter(function(g){return g.id==='a1_colors-and-shapes'})[0].name)`);
  })();
  check("pristine COLORS group was mislabeled 'FRUIT AND VEGETABLES' (the bug this fixes as a side effect)", colorNameOld === 'FRUIT AND VEGETABLES', colorNameOld);
  check('a1a2Total()===998 (raw __V17_A1A2 length)', E(ctx, `window.__V17_A1A2.length`) === 998);
  check('deduped a1a2Words()===998 (the 999-vs-995 mismatch is gone)', E(ctx, `window.__v15.words.filter(function(w){return (w.lib||[]).indexOf('a1a2')>=0}).length`) === 998);
  check('labelOf(twin) shows the sense, labelOf(primary) is bare', E(ctx, `labelOf(window.__v15.words.filter(function(w){return w.id==='a1a2_806'})[0])==='orange (COLORS AND SHAPES)'&&labelOf(window.__v15.words.filter(function(w){return w.id==='w18'})[0])==='orange'`));

  // ================= §47C SRS independence =================
  section('§47C', 'SRS independence — one record per sense');
  const srs = J(ctx, `JSON.stringify((function(){
    var v15=window.__v15, old=v15.enOld(), out={};
    var prim=v15.words.filter(function(w){return w.id==='w18'})[0];
    var twin=v15.words.filter(function(w){return w.id==='a1a2_806'})[0];
    old.box['w18']=0; old.box['a1a2_806']=0;
    out.before={prim:old.box['w18']||0, twin:old.box['a1a2_806']||0};
    v15.mark15(true, twin, 'mc');
    out.afterTwinMark={prim:old.box['w18']||0, twin:old.box['a1a2_806']||0};
    v15.mark15(true, prim, 'mc');
    out.afterPrimMark={prim:old.box['w18']||0, twin:old.box['a1a2_806']||0};
    out.total=v15.counts15().total;
    out.mastered1=(function(){ old.box['w18']=5; old.box['a1a2_806']=0; return v15.counts15().mastered; })();
    out.mastered2=(function(){ old.box['a1a2_806']=5; return v15.counts15().mastered; })();
    return out;
  })())`);
  check('mark15(true, twin) moves only the twin box (0->1, primary stays 0)', srs.before.prim === 0 && srs.before.twin === 0 && srs.afterTwinMark.twin === 1 && srs.afterTwinMark.prim === 0, srs);
  check('mark15(true, primary) then moves only the primary box (twin stays 1)', srs.afterPrimMark.prim === 1 && srs.afterPrimMark.twin === 1, srs);
  check('counts15().total===4892', srs.total === 4892, srs);
  check('mastered counts each record separately (+1 per sense)', srs.mastered2 === srs.mastered1 + 1, srs);
  const mig = J(ctx, `JSON.stringify((function(){
    var v15=window.__v15, old=v15.enOld(), e=v15.en15(), out={};
    // Simulate an existing save: primary mastered long ago, twin never seen.
    old.box['w18']=5; delete old.box['a1a2_806']; e.due['w18']=Date.now()-86400000;
    v15.save15();
    v15.buildWords(); // rebuild as a fresh boot would
    var prim=v15.words.filter(function(w){return w.id==='w18'})[0];
    var twin=v15.words.filter(function(w){return w.id==='a1a2_806'})[0];
    out.primBox=old.box['w18']||0; out.twinBox=old.box['a1a2_806']||0;
    out.primMastered=(old.box['w18']||0)>=5; out.twinNew=(old.box['a1a2_806']||0)===0;
    out.primIdStill=prim.id; out.twinIdStill=twin.id;
    return out;
  })())`);
  check("existing save (box['w18']===5) loads primary mastered + twin new", mig.primMastered === true && mig.twinNew === true && mig.primBox === 5 && mig.twinBox === 0, mig);
  const perTopic = J(ctx, `JSON.stringify((function(){
    var v15=window.__v15, old=v15.enOld(), out={};
    var words=v15.words;
    words.forEach(function(w){ old.box[w.id]=0; });
    old.box['w18']=5; v15.save15();
    function learned(topicId){
      return window.__v17.topics().filter(function(g){return g.id===topicId})[0].words.filter(function(w){return (old.box[w.id]||0)>=1}).length;
    }
    out.fruitLearned=learned('a1_fruit-and-vegetables');
    out.colorsLearned=learned('a1_colors-and-shapes');
    old.box['a1a2_806']=1;
    out.colorsLearnedAfterTwin=learned('a1_colors-and-shapes');
    return out;
  })())`);
  check('mastering orange once counts as learned in FRUIT only (not COLORS)', perTopic.fruitLearned === 1 && perTopic.colorsLearned === 0, perTopic);
  check('COLORS counts learned only after the twin itself is learned', perTopic.colorsLearnedAfterTwin === 1, perTopic);

  // ================= §47D distractor guard (property test) =================
  section('§47D', 'distractor guard — seeded property test, all four functions');
  // Shared helpers: parse question/option word ids out of the stub-DOM HTML.
  function parseReviewQ(htmlStr) {
    const qm = htmlStr.match(/speakWord\('([^']+)'\)/);
    const opts = [...htmlStr.matchAll(/reviewPick\('([^']+)'\)/g)].map(m => m[1]);
    return { q: qm ? qm[1] : null, opts };
  }
  function assertGuardOptions(name, wm, qId, optIds) {
    const q = wm[qId];
    if (!q) return { ok: false, why: 'question id not in WORDS: ' + qId };
    const qEn = (q.en || '').toLowerCase();
    const seenEn = {};
    let skippedCorrect = false;
    for (const oid of optIds) {
      // The correct option IS the question word (MC shows 1 correct + 3
      // distractors): skip its first occurrence; a second occurrence is
      // a real violation (the question word drawn twice as an option).
      if (oid === qId && !skippedCorrect) { skippedCorrect = true; continue; }
      if (oid === qId) return { ok: false, why: `question word ${oid} appears twice among options` };
      const o = wm[oid];
      if (!o) return { ok: false, why: 'option id not in WORDS: ' + oid };
      const oEn = (o.en || '').toLowerCase();
      if (oEn === qEn) return { ok: false, why: `option ${oid} (${o.en}) shares the question headword (${q.en})` };
      if (seenEn[oEn]) return { ok: false, why: `two options share en "${o.en}"` };
      seenEn[oEn] = 1;
    }
    return { ok: true };
  }
  // --- D-v15: Review with a FORCED question word (onlyDue + topic scope).
  // Each draw: exactly one word due in the topic, so the question word IS
  // the target; the twin is a distractor candidate in every draw (in-scope
  // pool). Without the guard P(twin drawn) ~ 3/53 per draw.
  // SCOPE RULE (V47 correction): a primary lives ONLY in its first topic,
  // a twin ONLY in its twin topic — so prim-as-Q must use the primary's
  // first-topic scope and twin-as-Q the twin-topic scope. Scoping a
  // primary under the twin's topic yields qWrong=500 (not a guard failure).
  // MATE CANDIDACY (honest limit): the base pool pre-filters by
  // x.t===w.t||x.lv===w.lv, so only sluggish's mate (shared lv 'A1-A2')
  // is a live distractor candidate on every draw. Orange (A1 vs A1-A2)
  // and trip (OX vs A1-A2) mates are already excluded by that older
  // filter, so their 500 draws assert the no-same-en invariant while
  // the guard itself is proven tight on sluggish + statically (x9).
  const SCOPES47 = { sluggish: 'a1_emotions-and-feelings', orange: 'a1_colors-and-shapes', trip: 'a1_family' };
  const PRIM_SCOPES47 = { sluggish: 'a1_body-parts', orange: 'a1_fruit-and-vegetables', trip: 'a1_clothes-and-accessories' };
  for (const p of PAIRS) {
    for (const dir of ['prim', 'twin']) {
      const targetId = dir === 'prim' ? p.primId : p.twinId;
      const mateId = dir === 'prim' ? p.twinId : p.primId;
      const c = seededCtx(html, 4700 + PAIRS.indexOf(p) * 10 + (dir === 'prim' ? 0 : 1));
      E(c, `window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'${dir === 'prim' ? PRIM_SCOPES47[p.en] : SCOPES47[p.en]}'})`);
      const wm = wordsMap(c);
      let draws = 0, violations = [], qWrong = 0;
      for (let i = 0; i < 500; i++) {
        E(c, `(function(){var v15=window.__v15,old=v15.enOld(),e=v15.en15();Object.keys(old.box||{}).forEach(function(k){old.box[k]=0});old.box['${targetId}']=1;e.due['${targetId}']=Date.now()-1000;v15.save15();})()`);
        E(c, `window.__v15.reviewStart(false)`);
        const hstr = E(c, `document.getElementById('v15review').innerHTML||''`);
        const parsed = parseReviewQ(hstr);
        if (parsed.q !== targetId) { qWrong++; continue; }
        if (parsed.opts.indexOf(mateId) >= 0) violations.push('mate ' + mateId + ' in options at draw ' + i);
        const chk = assertGuardOptions('v15-review', wm, parsed.q, parsed.opts);
        if (!chk.ok) violations.push(chk.why + ' at draw ' + i);
        if (violations.length) break;
        E(c, `window.__v15.reviewPick('${targetId}');window.__v15.reviewNext()`);
        draws++;
      }
      check(`v15 distractors: 500 seeded draws, ${p.en} ${dir}-as-Q (${targetId}), mate never drawn, 0 violations`, draws === 500 && violations.length === 0 && qWrong === 0, { draws, violations: violations.slice(0, 3), qWrong });
    }
  }
  // --- D-v27: Smart mc-ev with a FORCED question word (1-word list => idx 0 => mc-ev).
  for (const p of PAIRS) {
    for (const dir of ['prim', 'twin']) {
      const targetId = dir === 'prim' ? p.primId : p.twinId;
      const mateId = dir === 'prim' ? p.twinId : p.primId;
      const c = seededCtx(html, 4800 + PAIRS.indexOf(p) * 10 + (dir === 'prim' ? 0 : 1));
      E(c, `window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'${dir === 'prim' ? PRIM_SCOPES47[p.en] : SCOPES47[p.en]}'})`);
      const wm = wordsMap(c);
      let draws = 0, violations = [], qWrong = 0, labelOK = 0;
      for (let i = 0; i < 500; i++) {
        E(c, `window.__v27.startSession('en',['${targetId}'],'mc-ev')`);
        const hstr = E(c, `document.getElementById('v27body').innerHTML||''`);
        const qm = hstr.match(/answerMC\('([^']+)',(?:true|false),'([^']+)'\)/);
        const opts = [...hstr.matchAll(/answerMC\('[^']+',(?:true|false),'([^']+)'\)/g)].map(m => m[1]);
        const qId = qm ? qm[1] : null;
        if (qId !== targetId) { qWrong++; continue; }
        if (opts.indexOf(mateId) >= 0) violations.push('mate ' + mateId + ' in options at draw ' + i);
        const chk = assertGuardOptions('v27-mcev', wm, qId, opts);
        if (!chk.ok) violations.push(chk.why + ' at draw ' + i);
        // mc-ev options are VI text: the mate's vi must never appear.
        const mateVi = wm[mateId] ? wm[mateId].vi : null;
        const optVis = opts.map(id => wm[id] ? wm[id].vi : null);
        if (mateVi && optVis.indexOf(mateVi) >= 0) violations.push('mate vi "' + mateVi + '" in mc-ev options at draw ' + i);
        // Prompt label: twins show the sense, primaries stay bare.
        const prompt = (hstr.match(/<div class="v27q-prompt">([^<]*)<\/div>/) || [])[1] || '';
        if (dir === 'twin' && prompt.indexOf(' (' + p.topicName + ')') < 0) violations.push('twin prompt missing sense label at draw ' + i + ': ' + prompt);
        else if (dir === 'twin') labelOK++;
        if (violations.length) break;
        E(c, `window.__v27.answerMC('${targetId}',true,'${targetId}');window.__v27.nextQ()`);
        draws++;
      }
      check(`v27 distractorsEN (mc-ev): 500 seeded draws, ${p.en} ${dir}-as-Q, mate never drawn, 0 violations`, draws === 500 && violations.length === 0 && qWrong === 0, { draws, violations: violations.slice(0, 3), qWrong });
      if (dir === 'twin') check(`v27 mc-ev prompt labels the ${p.en} twin with its sense`, labelOK === 500, { labelOK });
    }
  }
  // --- D-v27 listen: 4-word list puts the target at idx 3 => kind 'listen'.
  // Options are EN text: no two identical en strings, none equals the Q en.
  for (const p of PAIRS) {
    for (const dir of ['prim', 'twin']) {
      const targetId = dir === 'prim' ? p.primId : p.twinId;
      const mateId = dir === 'prim' ? p.twinId : p.primId;
      const c = seededCtx(html, 4900 + PAIRS.indexOf(p) * 10 + (dir === 'prim' ? 0 : 1));
      E(c, `window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'${dir === 'prim' ? PRIM_SCOPES47[p.en] : SCOPES47[p.en]}'})`);
      const wm = wordsMap(c);
      let draws = 0, violations = [], qWrong = 0;
      for (let i = 0; i < 100; i++) {
        const fillers = J(c, `JSON.stringify(window.__v15.words.filter(function(w){return w.id!=='${targetId}'&&w.id!=='${mateId}'&&(w.lib||[]).indexOf('a1a2')>=0}).slice(0,3).map(function(w){return w.id}))`);
        E(c, `window.__v27.startSession('en',${JSON.stringify([fillers[0], fillers[1], fillers[2], targetId])},'listen')`);
        // Walk idx 0..2 (mc-ev, mc-ve, type) by answering, then idx 3 is listen.
        for (let step = 0; step < 3; step++) {
          const hs = E(c, `document.getElementById('v27body').innerHTML||''`);
          const qm = hs.match(/answerMC\('([^']+)',(?:true|false),'([^']+)'\)/);
          if (qm) { E(c, `window.__v27.answerMC('${qm[1]}',true,'${qm[1]}');window.__v27.nextQ()`); continue; }
          const tp = hs.match(/id="v27type-in"/);
          if (tp) {
            const wid = (hs.match(/answerType\('([^']+)'\)/) || [])[1];
            if (wid) { const wEn = wm[wid] ? wm[wid].en : ''; E(c, `document.getElementById('v27type-in').value=${JSON.stringify(wEn)};window.__v27.answerType('${wid}');window.__v27.nextQ()`); continue; }
          }
          E(c, `window.__v27.nextQ()`);
        }
        const hstr = E(c, `document.getElementById('v27body').innerHTML||''`);
        const opts = [...hstr.matchAll(/answerMC\('[^']+',(?:true|false),'([^']+)'\)/g)].map(m => m[1]);
        const qm = hstr.match(/answerMC\('([^']+)',(?:true|false),'([^']+)'\)/);
        const qId = qm ? qm[1] : null;
        if (qId !== targetId) { qWrong++; continue; }
        if (opts.indexOf(mateId) >= 0) violations.push('mate in listen options at draw ' + i);
        const chk = assertGuardOptions('v27-listen', wm, qId, opts);
        if (!chk.ok) violations.push(chk.why + ' at draw ' + i);
        if (violations.length) break;
        E(c, `window.__v27.answerMC('${targetId}',true,'${targetId}');window.__v27.nextQ()`);
        draws++;
      }
      check(`v27 distractorsEN (listen): 100 seeded draws, ${p.en} ${dir}-as-Q, EN-text options distinct, 0 violations`, draws === 100 && violations.length === 0 && qWrong === 0, { draws, violations: violations.slice(0, 3), qWrong });
    }
  }

  // --- D-v18/v19: long scoped fights. Questions cycle sequentially
  // through the pool (P.words[F.q % len]), so one pinned fight per
  // scope observes each pool word as Q ~once per cycle. Each scope
  // holds exactly one member of a pair (primary: first topic; twin:
  // twin topic), so a scope can only ever show its own member as Q —
  // the per-scope target is that member's observations. State is read
  // as one cheap pipe-delimited string per step (no JSON round-trip:
  // the J()-per-step reader made the V47 run-1 attempt take 10+ min
  // and still stall in v19). Target: 60 observations per scope
  // (6 scopes = >=360 pair-Q per engine), 0 guard violations.
  // (Run-1 used 170/scope but the FAMILY scope stalled for 5+ min
  // inside the 120-fight cap — a fight that stops advancing spins
  // 600 no-op steps per fight. 60/scope keeps the same coverage shape
  // at ~1/3 the steps, and a stall detector below fails fast with a
  // diagnostic instead of spinning.)
  // HONEST LIMIT: like Review, a boss pool pre-filters by t/lv, so a
  // mate is a live candidate only for sluggish (shared lv 'A1-A2');
  // this section proves the guard holds across 360+ natural boss
  // questions per engine (no same-en options, no breakage) while the
  // tight mate-exclusion proof is the v15/v27 property test above.
  async function bossGuardRun(engine, bossId, scopeTopic, targetId, targetPairQ) {
    const c = seededCtx(html, 5000 + (engine === 'v19' ? 100 : 0) + ['a1_emotions-and-feelings', 'a1_colors-and-shapes', 'a1_family', 'a1_body-parts', 'a1_fruit-and-vegetables', 'a1_clothes-and-accessories'].indexOf(scopeTopic));
    E(c, `window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'${scopeTopic}'})`);
    // KO deck for the v19 map path (EN fight needs none, but seed anyway).
    E(c, `for(var i=0;i<10;i++){ if(!S.cards.some(function(x){return x.id==='ko_seed_'+i;})) S.cards.push({id:'ko_seed_'+i, d:'d0', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:'', g:'', box:0, due:0}); } save();`);
    const wm = wordsMap(c);
    let pairQ = 0, questions = 0, violations = [];
    let fights = 0, deadFights = 0, stalled = false;
    while (pairQ < targetPairQ && fights < 120) {
      fights++;
      const alive = E(c, `(function(){
        try{
          if('${engine}'==='v18'){ window.__v18.fight('${bossId}','en'); }
          else { window.__v19.openMapFor('en'); window.__v19.fight('${bossId}'); }
          return !!window.__v18._test.F() || !!window.__v19._test.F();
        }catch(e){ return false; }
      })()`);
      if (!alive) break;
      const qBefore = questions;
      for (let step = 0; step < 600 && pairQ < targetPairQ; step++) {
        const stStr = E(c, `(function(){
          var F=('${engine}'==='v18')?window.__v18._test.F():window.__v19._test.F();
          if(!F||F.over) return 'OVER';
          F.hp=999;
          var cur=F.cur||{};
          var o1=(cur.opts||[]).map(function(x){return x.id}).join(',');
          var o2=(cur.optsVi||[]).map(function(x){return x.id}).join(',');
          return (cur.w?cur.w.id:'')+'|'+o1+'|'+o2;
        })()`);
        if (stStr === 'OVER') break;
        const parts = String(stStr).split('|');
        const wId = parts[0] || null;
        const opts = parts[1] ? parts[1].split(',') : [];
        const optsVi = parts[2] ? parts[2].split(',') : [];
        if (wId) {
          questions++;
          if (wId === targetId) pairQ++;
          const chkO = opts.length ? assertGuardOptions(engine + '-opts', wm, wId, opts) : { ok: true };
          const chkV = optsVi.length ? assertGuardOptions(engine + '-optsVi', wm, wId, optsVi) : { ok: true };
          if (!chkO.ok) violations.push(chkO.why + ` (${engine} ${scopeTopic} step ${step})`);
          if (!chkV.ok) violations.push(chkV.why + ` (${engine} ${scopeTopic} step ${step})`);
          if (violations.length >= 3) break;
        }
        E(c, `(function(){
          try{
            if('${engine}'==='v18'){ window.__v18._test.pickCorrect(); window.__v18.next(); }
            else { window.__v19._test.pickCorrect(); window.__v19._test.next(); }
          }catch(e){}
        })()`);
      }
      E(c, `(function(){ try{ if('${engine}'==='v18')window.__v18.close(); }catch(e){} })()`);
      if (questions === qBefore) { deadFights++; } else { deadFights = 0; }
      if (fights % 20 === 0 || pairQ >= targetPairQ) console.log(`    [boss ${engine} ${scopeTopic}] fights=${fights} pairQ=${pairQ} questions=${questions} deadFights=${deadFights}`);
      if (deadFights >= 3) { stalled = true; break; }
      if (violations.length >= 3) break;
    }
    return { pairQ, questions, violations: violations.slice(0, 3), fights, stalled };
  }
  for (const engine of ['v18', 'v19']) {
    const bossId = engine === 'v18' ? 'v10_slime' : 'v11_fireking';
    let totPairQ = 0, totQ = 0, totViol = [], totPerRecord = {};
    PAIRS.forEach(p => { totPerRecord[p.twinId] = 0; totPerRecord[p.primId] = 0; });
    for (const p of PAIRS) {
      const rT = await bossGuardRun(engine, bossId, SCOPES47[p.en], p.twinId, 60);
      totPairQ += rT.pairQ; totQ += rT.questions; totViol = totViol.concat(rT.violations);
      totPerRecord[p.twinId] += rT.pairQ;
      check(`${engine} distractorsEN (${p.en} twin scope): ${rT.pairQ} twin-Q observations, 0 violations`, rT.pairQ >= 60 && rT.violations.length === 0 && rT.stalled !== true, rT);
      const rP = await bossGuardRun(engine, bossId, PRIM_SCOPES47[p.en], p.primId, 60);
      totPairQ += rP.pairQ; totQ += rP.questions; totViol = totViol.concat(rP.violations);
      totPerRecord[p.primId] += rP.pairQ;
      check(`${engine} distractorsEN (${p.en} primary scope): ${rP.pairQ} primary-Q observations, 0 violations`, rP.pairQ >= 60 && rP.violations.length === 0 && rP.stalled !== true, rP);
    }
    check(`${engine} distractorsEN: >=360 pair-Q observations total, 0 violations`, totPairQ >= 360 && totViol.length === 0, { totPairQ, totQ, totViol: totViol.slice(0, 3), totPerRecord });
    for (const p of PAIRS) {
      check(`${engine} distractorsEN: ${p.en} twin observed as Q >=60x`, totPerRecord[p.twinId] >= 60, { twinQ: totPerRecord[p.twinId], primQ: totPerRecord[p.primId] });
      check(`${engine} distractorsEN: ${p.en} primary observed as Q >=60x`, totPerRecord[p.primId] >= 60, { twinQ: totPerRecord[p.twinId], primQ: totPerRecord[p.primId] });
    }
  }

  // ================= §47E Match — pickPool headword dedupe =================
  section('§47E', 'Match — pickPool never returns both twins');
  {
    const c = seededCtx(html, 5100);
    E(c, `window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_colors-and-shapes'})`);
    const wm = wordsMap(c);
    let sessions = 0, violations = [], twinSeen = 0;
    for (let i = 0; i < 500; i++) {
      E(c, `window.__v15.startMode('match')`);
      const hstr = E(c, `document.getElementById('v15body').innerHTML||''`);
      const ids = [...hstr.matchAll(/matchClick\('en','([^']+)'\)/g)].map(m => m[1]);
      if (ids.length !== 6) { violations.push('session ' + i + ': ' + ids.length + ' EN tiles, expected 6'); break; }
      const ens = ids.map(id => (wm[id] ? wm[id].en : '?').toLowerCase());
      if (new Set(ens).size !== 6) { violations.push('session ' + i + ': duplicate EN tile: ' + JSON.stringify(ens)); break; }
      const hasPrim = ids.indexOf('w18') >= 0, hasTwin = ids.indexOf('a1a2_806') >= 0;
      if (hasPrim && hasTwin) { violations.push('session ' + i + ': both orange senses in one Match'); break; }
      if (hasPrim || hasTwin) twinSeen++;
      sessions++;
    }
    check('pickPool: 500 Match sessions in COLORS scope, 6 distinct EN tiles every time', sessions === 500 && violations.length === 0, { sessions, violations: violations.slice(0, 3), twinSeen });
    check('pickPool: no session ever contained both orange senses', violations.length === 0 && sessions === 500, { sessions });
  }

  // ================= §47F Library / rewards =================
  section('§47F', 'Library / rewards — per-sense learned, claimed stays claimed');
  {
    const c = makeCtx();
    const l = loadPage(c, html);
    check('library ctx loads', l.loadErr === null, l.loadErr);
    fireDCL(c);
    E(c, `window.__v15.buildWords()`);
    const lib = J(c, `JSON.stringify((function(){
      var v15=window.__v15, v17=window.__v17, old=v15.enOld(), out={};
      // lessonHTML() paginates at 30 words/page, so a card check must
      // collect ALL pages of the topic (orange sits on FRUIT page 2,
      // sluggish on a later EMOTIONS page — page 0 alone misses them).
      function allPagesHtml(topicId){
        v17.openTopic(topicId);
        var g=v17.topics().filter(function(x){return x.id===topicId})[0];
        var pages=Math.max(1,Math.ceil(g.words.length/30));
        var all='';
        for(var pg=0;pg<pages;pg++){ v17.state.page=pg; all+=v17.libraryHTML(); }
        v17.state.page=0;
        return all;
      }
      // COLORS: every word learned EXCEPT the twin.
      var colors=v17.topics().filter(function(g){return g.id==='a1_colors-and-shapes'})[0];
      colors.words.forEach(function(w){ old.box[w.id]=1; });
      old.box['a1a2_806']=0; v15.save15();
      v17.openTopic('a1_colors-and-shapes');
      var h1=v17.libraryHTML();
      var h1all=allPagesHtml('a1_colors-and-shapes');
      out.withoutTwin={claimBtn:h1.indexOf('Nhận thưởng')>=0, mute:h1.indexOf('Học hết')>=0, twinCard:h1all.indexOf('orange (COLORS AND SHAPES)')>=0, twinVi:h1all.indexOf('màu cam')>=0};
      // Learn the twin: the claim button appears.
      old.box['a1a2_806']=1; v15.save15();
      var h2=v17.libraryHTML();
      out.withTwin={claimBtn:h2.indexOf('Nhận thưởng')>=0};
      // Claim it: sticky. (Key format is 'a1a2:<topicId>' — the claim
      // button's own onclick passes 'a1a2:a1_colors-and-shapes'.)
      v17.claim('a1a2:a1_colors-and-shapes');
      var h3=v17.libraryHTML();
      out.afterClaim={claimedShown:h3.indexOf('Đã nhận thưởng')>=0, claimBtnGone:h3.indexOf('Nhận thưởng')<0};
      // FAMILY gates at 99 (not 100): learn all 99.
      var fam=v17.topics().filter(function(g){return g.id==='a1_family'})[0];
      out.familyN=fam.words.length;
      fam.words.forEach(function(w){ old.box[w.id]=1; });
      v15.save15();
      v17.openTopic('a1_family');
      var h4=v17.libraryHTML();
      out.family={claimBtn:h4.indexOf('Nhận thưởng')>=0, devotedOnce:(h4.match(/devoted/g)||[]).length};
      // FRUIT card for the primary stays bare 'orange' (no sense label).
      // wordCard renders <b>labelOf(w)</b>: the primary is <b>orange</b>.
      var h5=allPagesHtml('a1_fruit-and-vegetables');
      out.fruit={bareOrange:h5.indexOf('<b>orange</b>')>=0, noTwinLabel:h5.indexOf('orange (COLORS AND SHAPES)')<0};
      // EMOTIONS card for the sluggish twin carries its sense; the
      // primary lives in BODY PARTS, so no bare sluggish card here.
      var h6=allPagesHtml('a1_emotions-and-feelings');
      out.emotions={twinCard:h6.indexOf('sluggish (EMOTIONS AND FEELINGS)')>=0, noBarePrimary:h6.indexOf('<b>sluggish</b>')<0};
      return out;
    })())`);
    check('COLORS reward requires the twin learned (primary alone: no claim button)', lib.withoutTwin.claimBtn === false && lib.withoutTwin.mute === true, lib.withoutTwin);
    check('COLORS Library shows the twin card with its sense label + vi', lib.withoutTwin.twinCard === true && lib.withoutTwin.twinVi === true, lib.withoutTwin);
    check('COLORS claim button appears once the twin is learned', lib.withTwin.claimBtn === true, lib.withTwin);
    check('claimed topic stays claimed (sticky, no second claim button)', lib.afterClaim.claimedShown === true && lib.afterClaim.claimBtnGone === true, lib.afterClaim);
    check('FAMILY topic has 99 words and its reward gates at 99', lib.familyN === 99 && lib.family.claimBtn === true && lib.family.devotedOnce === 0, lib.family);
    check('FRUIT card for the primary stays bare orange (no twin label)', lib.fruit.bareOrange === true && lib.fruit.noTwinLabel === true, lib.fruit);
    check('EMOTIONS card for the sluggish twin carries its sense label', lib.emotions.twinCard === true && lib.emotions.noBarePrimary === true, lib.emotions);
  }

  // ================= §47G regression =================
  section('§47G', 'regression — V19.0.1 balance + V19.0 fixes hold');
  // legDiff thresholds + live Legendary pools (550/250/630) + grammar (24/12/12).
  const legLevels = { 0: ['A2', 'B1'], 199: ['A2', 'B1'], 200: ['B1'], 599: ['B1'], 600: ['B2'], 700: ['B2'] };
  for (const m of [0, 199, 200, 599, 600, 700]) {
    const r = setMastered(ctx, m);
    check(`legDiff at mastered ${m} is ${JSON.stringify(legLevels[m])} (thresholds unchanged)`, r.mastered === m && JSON.stringify(r.legDiff) === JSON.stringify(legLevels[m]), r);
  }
  const poolExpect = { 0: { A2: 300, B1: 250 }, 200: { B1: 250 }, 600: { B2: 630 } };
  const grammarExpect = { 0: { A2: 12, B1: 12 }, 200: { B1: 12 }, 600: { B2: 12 } };
  for (const m of [0, 200, 600]) {
    setMastered(ctx, m);
    const p = J(ctx, `JSON.stringify((function(){
      var out={};
      try{
        var e=window.__v18._test.en18();
        ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
        window.__v18._test.fight('v10_firedragon','en');
        var F=window.__v18._test.F(); out.fightLive=!!F;
        if(F){
          var lv={}; (F.pools.words||[]).forEach(function(w){ lv[w.lv]=(lv[w.lv]||0)+1; }); out.poolLevels=lv; out.poolN=(F.pools.words||[]).length;
          var gl={}; (F.pools.grammar||[]).forEach(function(g){ gl[g.lv]=(gl[g.lv]||0)+1; }); out.grammarLevels=gl; out.grammarN=(F.pools.grammar||[]).length;
        }
        window.__v18.close();
      }catch(e){ out.fightErr=String(e&&e.message||e); }
      return out;
    })())`);
    check(`live Legendary pool at mastered ${m} is exactly ${JSON.stringify(poolExpect[m])}`, p.fightLive === true && levelsEq(p.poolLevels, poolExpect[m]), p);
    check(`live Legendary grammar pool at mastered ${m} is ${JSON.stringify(grammarExpect[m])} (24/12/12)`, p.fightLive === true && levelsEq(p.grammarLevels, grammarExpect[m]) && p.grammarN === (m === 0 ? 24 : 12), p);
  }
  setMastered(ctx, 0);
  // KO XP: 8 correct = +85 in both engines (seed search for 8 distinct cards).
  function liveKOFight(engine) {
    for (let seed = 47; seed < 70; seed++) {
      const c = makeCtx();
      c.__seededRandom = mulberry32(seed);
      E(c, `Math.random=__seededRandom;`);
      const l = loadPage(c, html);
      if (l.loadErr) return { loadErr: l.loadErr };
      fireDCL(c);
      E(c, `window.__v15.buildWords()`);
      const r = J(c, `JSON.stringify((function(){
        var out={seq:[], koRight0:0};
        function xp(){ return S.xp||0; }
        for(var i=0;i<10;i++){ S.cards.push({id:'ko_seed_'+i, d:'d0', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:'', g:'', box:0, due:0}); }
        save();
        var seen={}, streak=0;
        if('${engine}'==='v18'){
          var v18=window.__v18;
          var e18=v18._test.en18(); out.koRight0=e18.koStats.right||0;
          var xp0=xp();
          v18.fight('v10_slime','ko');
          for(var a=0;a<8;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
            var cid=F.cur&&F.cur.k?F.cur.k.id:null, before=xp();
            v18._test.pickCorrect(); v18.next();
            var d=xp()-before; streak++;
            var expect=(seen[cid]?0:10)+((streak%5===0)?5:0);
            out.seq.push({cid:cid, delta:d, expect:expect, streak:streak});
            seen[cid]=1;
          }
          out.delta=xp()-xp0; out.koRightDelta=(v18._test.en18().koStats.right||0)-out.koRight0;
          out.koStreak=v18._test.en18().koStreak;
          v18.close();
        }else{
          var v19=window.__v19;
          var e19=v19.en19(); out.koRight0=e19.koStats.right||0;
          var xp0b=xp();
          v19.openMapFor('en'); v19._test.setLang('ko'); v19.fight('v11_fireking');
          for(var b=0;b<8;b++){ var F2=v19._test.F(); if(!F2||F2.over) break; F2.hp=999;
            var cid2=F2.cur&&F2.cur.k?F2.cur.k.id:null, before2=xp();
            v19._test.pickCorrect(); v19._test.next();
            var d2=xp()-before2; streak++;
            var expect2=(seen[cid2]?0:10)+((streak%5===0)?5:0);
            out.seq.push({cid:cid2, delta:d2, expect:expect2, streak:streak});
            seen[cid2]=1;
          }
          out.delta=xp()-xp0b; out.koRightDelta=(v19.en19().koStats.right||0)-out.koRight0;
          out.koStreak=v19.en19().koStreak;
        }
        return out;
      })())`);
      const cids = r.seq.map(s => s.cid);
      if (r.seq.length === 8 && new Set(cids).size === 8) { r.seed = seed; return r; }
    }
    return { loadErr: 'no seed gave 8 distinct KO cards' };
  }
  const ko18 = liveKOFight('v18');
  check('live v18 KO fight: 8 correct on 8 distinct cards pays +85 XP', ko18.delta === 85 && ko18.koRightDelta === 8 && ko18.koStreak === 8, ko18);
  check('live v18 KO fight: per-answer rule holds on all 8 answers', ko18.seq.length === 8 && ko18.seq.every(s => s.delta === s.expect), ko18.seq);
  const ko19 = liveKOFight('v19');
  check('live v19 KO fight: 8 correct on 8 distinct cards pays +85 XP', ko19.delta === 85 && ko19.koRightDelta === 8 && ko19.koStreak === 8, ko19);
  check('live v19 KO fight: per-answer rule holds on all 8 answers', ko19.seq.length === 8 && ko19.seq.every(s => s.delta === s.expect), ko19.seq);
  // EN XP identical to pristine V19.0.1 (seeded deterministic fights).
  function seededEnFight(htmlText, engine) {
    const c = makeCtx();
    c.__seededRandom = mulberry32(46);
    E(c, `Math.random=__seededRandom;`);
    const l = loadPage(c, htmlText);
    if (l.loadErr) return { loadErr: l.loadErr };
    fireDCL(c);
    E(c, `window.__v15.buildWords()`);
    return J(c, `JSON.stringify((function(){
      var out={seq:[]};
      function xp(){ return S.xp||0; }
      var old=window.__v15.enOld();
      if('${engine}'==='v18'){
        var v18=window.__v18, xp0=xp(), n=0;
        v18.fight('v10_slime','en');
        for(var a=0;a<8;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
          var w=F.cur&&F.cur.w?F.cur.w:null, before=xp();
          var boxB=w?(old.box[w.id]||0):0, atB=w?(old.xpAt[w.id]||0):0, stB=old.streak||0;
          v18._test.pickCorrect(); v18.next();
          var d=xp()-before;
          var exp=0; if(w){ if(boxB<5&&(!atB||Date.now()-atB>600000)) exp+=10; if((stB+1)%5===0) exp+=5; }
          out.seq.push({delta:d, expect:exp, isWord:!!w, id:w?w.id:null});
          if(w) n++;
        }
        out.delta=xp()-xp0; out.enQ=n;
        v18.close();
      }else{
        var v19=window.__v19, xp0b=xp(), n19=0;
        v19.openMapFor('en'); v19.fight('v11_fireking');
        for(var c2=0;c2<8;c2++){ var F3=v19._test.F(); if(!F3||F3.over) break; F3.hp=999;
          var w3=F3.cur&&F3.cur.w?F3.cur.w:null, before3=xp();
          var boxB3=w3?(old.box[w3.id]||0):0, atB3=w3?(old.xpAt[w3.id]||0):0, stB3=old.streak||0;
          v19._test.pickCorrect(); v19._test.next();
          var d3=xp()-before3;
          var exp3=0; if(w3){ if(boxB3<5&&(!atB3||Date.now()-atB3>600000)) exp3+=10; if((stB3+1)%5===0) exp3+=5; }
          out.seq.push({delta:d3, expect:exp3, isWord:!!w3, id:w3?w3.id:null});
          if(w3) n19++;
        }
        out.delta=xp()-xp0b; out.enQ=n19;
      }
      return out;
    })())`);
  }
  for (const engine of ['v18', 'v19']) {
    const enNew = seededEnFight(html, engine);
    const enOld = seededEnFight(pristineHtml, engine);
    check(`seeded ${engine} EN fight: per-answer rule holds on all 8 answers (V19.2)`, enNew.seq.length === 8 && enNew.seq.every(s => s.delta === s.expect), enNew.seq);
    check(`seeded ${engine} EN fight: XP sequence byte-identical to pristine V19.0.1`, JSON.stringify(enNew.seq) === JSON.stringify(enOld.seq) && enNew.delta === enOld.delta, { newSeq: enNew.seq, oldSeq: enOld.seq });
  }
  // V19.0 spot-checks: C-R3-1 due, C-R3-2 corrupt quarantine, C-R3-4
  // snapshot keys, NEW-1 enIcon, weakchip contrast.
  {
    const cF = makeCtx();
    const lF = loadPage(cF, html);
    check('spot-check ctx loads', lF.loadErr === null, lF.loadErr);
    fireDCL(cF);
    E(cF, `window.__v15.buildWords()`);
    const due0 = J(cF, `JSON.stringify({due:window.__v15.counts15().due, mastered:window.__v15.counts15().mastered})`);
    check('C-R3-1 fresh save: 0 due words, 0 mastered', due0.due === 0 && due0.mastered === 0, due0);
    const due3 = J(cF, `JSON.stringify((function(){
      var v15=window.__v15, old=v15.enOld(), e=v15.en15(), now=Date.now();
      var ids=v15.words.slice(0,5).map(function(w){return w.id});
      ids.slice(0,3).forEach(function(id){ old.box[id]=2; e.due[id]=now-1000; });
      ids.slice(3,5).forEach(function(id){ old.box[id]=5; e.due[id]=now-1000; });
      v15.save15();
      return {due:v15.counts15().due, mastered:v15.counts15().mastered};
    })())`);
    check('C-R3-1 seeded 3 truly-due -> 3 (box-5 past-due NOT counted)', due3.due === 3, due3);
  }
  {
    const bad = '{"cards":null,"v7":{broken';
    const cC = makeCtx();
    cC.localStorage.setItem('hanvocab.v1', bad);
    const lC = loadPage(cC, html);
    check('corrupt-save ctx loads', lC.loadErr === null, lC.loadErr);
    fireDCL(cC);
    const q = E(cC, `(function(){ var found=null; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.indexOf('hanvocab.v12.corrupt-')===0) found={key:k, val:localStorage.getItem(k)}; } return found; })()`);
    check('C-R3-2 corrupt save quarantined byte-exact', !!q && q.val === bad, q ? { key: q.key, match: q.val === bad } : null);
    check('C-R3-2 corrupt flag set with reason bad-json', E(cC, `!!(window.__V45_CORRUPT&&window.__V45_CORRUPT.reason==='bad-json'&&window.__V45_CORRUPT.quarantined)`));
  }
  {
    const cS = makeCtx();
    const lS = loadPage(cS, html);
    check('snapshot ctx loads', lS.loadErr === null, lS.loadErr);
    fireDCL(cS);
    E(cS, `window.__v15.buildWords()`);
    const snap = J(cS, `JSON.stringify((function(){
      var out={};
      var fixed=Date.now();
      Date.now=function(){ return fixed; };
      var s1=window.__v31._test.snapshotCurrent();
      var s2=window.__v31._test.snapshotCurrent();
      var keys=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('hanvocab.v12.preimport-')===0)keys.push(k)}
      out={k1:s1, k2:s2, sameKey:s1===s2, keys:keys};
      return out;
    })())`);
    check('C-R3-4 snapshot keys unique under faked same-ms Date.now()', snap.k1 !== snap.k2 && snap.keys.length >= 2 && new Set(snap.keys).size === snap.keys.length, snap);
  }
  check('NEW-1 enIcon guard survives (static)', html.includes("if(!name)return '';"));
  {
    const cN = makeCtx();
    const lN = loadPage(cN, html);
    check('NEW-1 ctx loads', lN.loadErr === null, lN.loadErr);
    fireDCL(cN);
    E(cN, `window.__v15.buildWords()`);
    const libHtml = E(cN, `window.__v17.libraryHTML()`);
    check('NEW-1 live Library HTML has no undefined icon URL', typeof libHtml === 'string' && libHtml.indexOf('undefined') < 0, libHtml ? libHtml.slice(0, 200) : null);
  }
  checkRatio('weakchip #7A5B00 on light card #FFFAEB (need 4.5)', '#7A5B00', '#FFFAEB', 4.5);

  // ================= §V save schema =================
  section('§V', 'save schema — no new key, no schema change');
  check('no en47 save key', E(ctx, `!S.v7 || !S.v7.en47`));
  check('no v47 localStorage key', E(ctx, `(function(){ for(var i=0;i<localStorage.length;i++){ if(localStorage.key(i).indexOf('v47')>=0) return false; } return true; })()`));
  check('hanvocab.v1 still the only save key', E(ctx, `localStorage.getItem('hanvocab.v1')!==null`));
  check('no new top-level S.v7 key vs pristine V19.0.1 (fresh boots)', (() => {
    function freshKeys(htmlText) {
      const c = makeCtx();
      const l = loadPage(c, htmlText);
      if (l.loadErr) return null;
      fireDCL(c);
      E(c, `window.__v15.buildWords()`);
      return E(c, `Object.keys(S.v7||{}).sort()`);
    }
    const kNew = freshKeys(html);
    const kOld = freshKeys(pristineHtml);
    return !!kNew && !!kOld && JSON.stringify(kNew) === JSON.stringify(kOld);
  })(), 'see fresh-boot key sets');

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('live Library cards for all three pairs (labels visible, distinct)', 'real Chrome in verify-v47c.js');
  skipCheck('live MC/boss/Smart questions never show both senses as competing options', 'real Chrome in verify-v47c.js');
  skipCheck('live Match never shows both twins', 'real Chrome in verify-v47c.js');
  skipCheck('topic counts in the live UI', 'real Chrome in verify-v47c.js');
  skipCheck('live KO fight still pays +85 for 8 correct', 'real Chrome in verify-v47c.js');
  skipCheck('Legendary start timing', 'real Chrome in verify-v47c.js');
  skipCheck('0 console errors/warnings/dialogs in real Chrome', 'real Chrome in verify-v47c.js');

  console.log(`\ntest47: ${pass} PASS, ${fail} FAIL, ${skip} SKIP`);
  if (fail) {
    console.log('FAILURES:');
    failures.forEach(f => console.log('  - ' + f));
    Object.keys(secCounts).forEach(id => {
      const s = secCounts[id];
      console.log(`  ${id}: ${s.pass} pass / ${s.fail} fail / ${s.skip} skip`);
    });
  } else {
    Object.keys(secCounts).forEach(id => {
      const s = secCounts[id];
      console.log(`  ${id}: ${s.pass} pass / ${s.fail} fail / ${s.skip} skip`);
    });
  }
  process.exit(fail === 0 ? 0 : 1);
}
main().catch(e => { console.error('test47 crashed:', e); process.exit(2); });
