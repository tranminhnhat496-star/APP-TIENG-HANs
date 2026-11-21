// test46.js - V19.0.1 (layer V46) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v44/test44.js (same lines 34-204); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V19.0 build.
// Usage: node tools/v45/test45.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V45 fragments,
//         OLD due lines / OLD load() / OLD enIcon() / OLD snapshot key
//         GONE, legDiff def + thresholds + C-R2-1 deliberately unchanged,
//         V44/V43/V42/V41 fragments survive)
//   section L page load (vm, real inline scripts) + __v45 + exports
//   section 45A due counts — fresh save 0 due; seeded 0 truly-due -> 0;
//         seeded 3 truly-due -> 3; box-5 past-due NOT counted; BT attach
//         does not inflate due
//   section 45B Review session — 0 truly-due shows the honest empty
//         state (no silent fallback to all words); 3 truly-due reviews
//         only those 3 (no box-0 words)
//   section 45C corrupt / card-less save — quarantined byte-exact in vm
//         (bad-json + no-cards), __V45_CORRUPT + __v45corruptShown set;
//         valid save boots normally, nothing quarantined
//   section 45D snapshot keys unique under faked same-ms Date.now()
//   section 45E enIcon guard — no <img> without an icon; topics carry
//         no 'undefined' icon URL
//   section 45F weakchip static contrast — light #7A5B00 on #FFFAEB
//         6.05:1 (was 1.33:1), dark gold kept >=4.5:1; V43 fight rules
//         untouched
//   section 45L leads — restoreRaw size-check first, speedHatch no
//         gem spend on a ready hatch, deleteHistoryEntry deletes one
//   section 44A pool identity — the Legendary pool (sorted word + grammar
//         ids, levels, legDiff) is IDENTICAL between the pristine V18.9
//         build and the V19.0 build at mastered = 0 / 250 / 700, in vm
//   section 44B vm Legendary fight starts (EN + KO) + V18.5 C-02 pet-skill
//         shield halving + V18.6 V19 Counterattack 3/3
//   section 44F V43 fight render still holds (V19 + V18 KO fights emit
//         the fixed classes)
//   section 44R V18.8 regression (V42/V41 fixes still hold on V19.0)
//   section V save schema (no en45 key, no new localStorage key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint; the freeze
// itself is a main-thread timing effect, so it is measured in real
// Chrome by repro-v45.js / verify-v45c.js, not here); the painted
// fight, the real click + answer states, the 360px overflow check,
// the full end-to-end fight win, and the per-question-type screens
// are Chrome gates, not asserted here; live-browser, real-phone and
// live-Firebase gates stay Chrome/Anh-only.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = 'd3d27cdab865befb1aaa495856b561f34520f9607dcdfdeb025a661b765de271';
const EXPECTED_BYTES = 2449080;
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
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v46.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
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
  // Order-insensitive level-count comparison (JSON.stringify is key-order
  // sensitive; {B1:250,A2:300} !== {A2:300,B1:250} as strings).
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

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V19.0.1 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is the V19.0.1 size', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('V19.0.1 title present, V19.0 title gone', html.includes('V19.0.1 — Legendary Scaling &amp; KO Boss XP') && !html.includes('V19.0 — Round-3 Bug Fixes'));
  check('v46data + v46js markers present, last scripts', html.includes('id="v46data"') && html.includes('id="v46js"') && html.lastIndexOf('id="v46js"') > html.lastIndexOf('id="v45js"'));
  check('__v46 19.0.1 + __V46_DATA present', html.includes("VERSION='19.0.1'") && html.includes('window.__V46_DATA={'));
  check('OLD legDiff() definition GONE', !html.includes("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}"));
  check('NEW legDiff() definition present exactly once', countOcc(html, "function legDiff(){var m=0;try{var c=V15().counts;") === 1);
  check('legDiff thresholds intact exactly once', countOcc(html, "if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']") === 1);
  check('legDiff reads the getter (V15().counts.mastered)', html.includes('V15().counts.mastered'));
  check('legDiff failure path logs (console.warn) instead of swallowing', html.includes("[V46 legDiff] mastered read failed, falling back to A2/B1:"));
  check('only remaining V15().counts().mastered is the V44 comment', countOcc(html, 'V15().counts().mastered') === 1);
  check('shared XP function + KO key present', html.includes('function awardBossAnswerXP(o)') && html.includes("function koXpKey(id){return 'ko:'+(id||'?')}"));
  check('all 23 weakness-override boss ids present', ['v10_firedragon','v10_icewolf','v10_thunderlion','v10_seaoctopus','v10_titan','v10_phoenix','v10_voidghost','v10_godturtle','v10_ninetails','v10_ancienttree','v11_seadragon','v11_sharkking','v11_timemachine','v11_golem','v11_goldephant','v10_owl','v10_tiger','v10_wizard','v10_fox','v10_octopus','v10_dict','v10_king','v10_fairy'].every(id => html.includes("'" + id + "'")));
  check('koStreak present (en18/en19 defaults + markKO paths)', countOcc(html, 'koStreak') >= 6, countOcc(html, 'koStreak'));
  check('EN fallback blocks survive exactly once per engine', countOcc(html, "if(xp>0)gain18(xp);") === 1 && countOcc(html, "if(xp>0)gain19(xp);") === 1);
  check('first-win/replay reward lines untouched (gain18(10) + reward.xp)', html.includes('gain18(10);') && html.includes('gain18(b.reward.xp+petBonus);') && html.includes('gain19(10);') && html.includes('gain19(b.reward.xp+petBonus);'));
  check('V45 markers survive (v45 + v45js + 19.0.0)', html.includes('id="v45"') && html.includes('id="v45js"') && html.includes("VERSION='19.0.0'"));
  check('V45 due fragments survive (counts15 box 1-4)', html.includes("if(b>=1&&b<=4&&(e.due[w.id]||0)<=now)c.due++;"));
  check('V45 corrupt quarantine survives', html.includes('hanvocab.v12.corrupt-'));
  check('V44 hoisted legDiff call sites survive x2', countOcc(html, "var lv=b.arena==='leg'?legDiff():null;") === 2);
  check('no new MutationObserver sites in v46 src', !fs.readFileSync(path.join(ROOT, 'src', 'v46.js'), 'utf-8').includes('MutationObserver') && !fs.readFileSync(path.join(ROOT, 'src', 'v46_data.js'), 'utf-8').includes('MutationObserver'));

  // ================= §L page load =================
  section('§L', 'page load (vm, real inline scripts)');
  const ctx = makeCtx();
  const warnsL = [];
  const _origWarn = console.warn;
  console.warn = (...a) => warnsL.push(a.join(' '));
  const loaded = loadPage(ctx, html);
  check('inline script blocks extracted (>=30)', loaded.blocks >= 30, loaded.blocks);
  check('all inline scripts evaluate without error', loaded.loadErr === null, loaded.loadErr);
  if (loaded.loadErr) { console.log(`\ntest46 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran)', E(ctx, `document.getElementById('v15langbar')!==null`));
  E(ctx, `window.__v15.buildWords()`);
  check('WORDS built (>4000)', E(ctx, `window.__v15.words.length`) > 4000, E(ctx, `window.__v15.words.length`));
  check('__v46 exports version 19.0.1 + award + koXpKey', E(ctx, `window.__v46&&window.__v46.version==='19.0.1'&&typeof window.__v46.awardBossAnswerXP==='function'&&typeof window.__v46.koXpKey==='function'`));
  check('__V46_DATA holds exactly 23 weakness overrides', E(ctx, `window.__V46_DATA&&Object.keys(window.__V46_DATA.weakExplicit||{}).length`) === 23, E(ctx, `window.__V46_DATA&&Object.keys(window.__V46_DATA.weakExplicit||{}).length`));
  check('no console.warn during clean load', warnsL.length === 0, warnsL);
  console.warn = _origWarn;

  // ================= §46A legDiff thresholds + pools =================
  section('§46A', 'legDiff thresholds + live Legendary pools');
  const legLevels = { 0: ['A2', 'B1'], 199: ['A2', 'B1'], 200: ['B1'], 599: ['B1'], 600: ['B2'], 700: ['B2'] };
  for (const m of [0, 199, 200, 599, 600, 700]) {
    const r = setMastered(ctx, m);
    check(`legDiff at mastered ${m} is ${JSON.stringify(legLevels[m])} (mastered reads ${r.mastered})`, r.mastered === m && JSON.stringify(r.legDiff) === JSON.stringify(legLevels[m]), r);
  }
  // Live Legendary fight pools (exact levels + counts) at 0 / 200 / 600.
  const poolExpect = { 0: { A2: 300, B1: 250 }, 200: { B1: 250 }, 600: { B2: 630 } };
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
    check(`live Legendary grammar pool at mastered ${m} uses the same levels`, p.fightLive === true && Object.keys(p.grammarLevels || {}).every(lv => legLevels[m].indexOf(lv) >= 0) && (p.grammarN || 0) > 0, p);
  }
  // Boundary pools at 199 / 599 (same as the band below the threshold).
  for (const m of [199, 599]) {
    setMastered(ctx, m);
    const p = J(ctx, `JSON.stringify((function(){
      var out={};
      try{
        var e=window.__v18._test.en18();
        ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
        window.__v18._test.fight('v10_firedragon','en');
        var F=window.__v18._test.F(); out.fightLive=!!F;
        if(F){ var lv={}; (F.pools.words||[]).forEach(function(w){ lv[w.lv]=(lv[w.lv]||0)+1; }); out.poolLevels=lv; }
        window.__v18.close();
      }catch(e){ out.fightErr=String(e&&e.message||e); }
      return out;
    })())`);
    check(`live Legendary pool at boundary mastered ${m} is ${JSON.stringify(poolExpect[m < 200 ? 0 : 200])}`, p.fightLive === true && levelsEq(p.poolLevels, poolExpect[m < 200 ? 0 : 200]), p);
  }
  // Failure path: counts getter broken -> warn logged + A2/B1 fallback (fresh ctx).
  {
    const c2 = makeCtx();
    const warns2 = [];
    const _origWarn2 = console.warn;
    console.warn = (...a) => warns2.push(a.join(' '));
    const l2 = loadPage(c2, html);
    check('failure-path ctx loads', l2.loadErr === null, l2.loadErr);
    fireDCL(c2);
    E(c2, `window.__v15.buildWords()`);
    E(c2, `Object.defineProperty(window.__v15,'counts',{value:null,configurable:true})`);
    const r = J(c2, `JSON.stringify({legDiff:window.__v18._test.legDiff()})`);
    check('legDiff with a broken counts getter falls back to [A2,B1]', JSON.stringify(r.legDiff) === JSON.stringify(['A2', 'B1']), r);
    check('legDiff failure is console.warn-ed (visible, not silent)', warns2.length >= 1 && warns2.some(w => w.indexOf('[V46 legDiff]') >= 0), warns2);
    console.warn = _origWarn2;
  }
  setMastered(ctx, 0);

  // ================= §46B weakness redesign =================
  section('§46B', 'weakness redesign — recount + overrides + meter');
  const EXPECTED_WEAK46 = {
    v10_firedragon: 'a1a2:emotions-and-feelings', v10_icewolf: 'a1a2:travel',
    v10_thunderlion: 'a1a2:education', v10_seaoctopus: 'a1a2:nature',
    v10_titan: 'a1a2:travel', v10_phoenix: 'a1a2:emotions-and-feelings',
    v10_voidghost: 'a1a2:emotions-and-feelings', v10_godturtle: 'a1a2:nature',
    v10_ninetails: 'a1a2:travel', v10_ancienttree: 'a1a2:nature',
    v11_seadragon: 'a1a2:nature', v11_sharkking: 'a1a2:nature',
    v11_timemachine: 'a1a2:travel', v11_golem: 'a1a2:travel',
    v11_goldephant: 'a1a2:travel',
    v10_owl: 'a1a2:education', v10_tiger: 'a1a2:travel',
    v10_wizard: 'a1a2:education', v10_fox: 'a1a2:education',
    v10_octopus: 'a1a2:nature',
    v10_dict: 'a1a2:education', v10_king: 'a1a2:travel', v10_fairy: 'a1a2:nature',
  };
  // V19.0 weakness values for the other 63 bosses (from the pristine-base
  // analysis, tools/v46/analysis-boss-tables.json @ mastered 700).
  const v190Table = JSON.parse(fs.readFileSync(path.join(__dirname, 'analysis-boss-tables.json'), 'utf-8'));
  const v190Weak = {};
  v190Table['700'].rows.forEach(r => { v190Weak[r.id] = r.weak; });
  for (const m of [0, 200, 600, 700]) {
    setMastered(ctx, m);
    const rec = J(ctx, `JSON.stringify((function(){
      var v34=window.__v34, v36=window.__v36;
      var WORDS=window.__v15.words;
      function legDiff(){ var mm=0; try{ mm=window.__v15.counts.mastered; }catch(e){} if(mm<200)return ['A2','B1']; if(mm<600)return ['B1']; return ['B2']; }
      function poolOf(b){
        var list;
        if(b._old) list=WORDS.slice();
        else if(b.lib==='oxford'){ list=WORDS.filter(function(x){ return (x.lib||[]).indexOf('oxford')>=0; }); if(b.diff) list=list.filter(function(x){ return x.lv===b.diff; }); }
        else if(b.arena==='leg'){ var lv=legDiff(); list=WORDS.filter(function(x){ return lv.indexOf(x.lv)>=0; }); }
        else if(b.diff) list=WORDS.filter(function(x){ return x.lv===b.diff; });
        else list=WORDS.slice();
        if(list.length<12) list=WORDS.slice();
        return list;
      }
      var list=[];
      list=list.concat(window.__V33_DATA?window.__V33_DATA.bosses:[]);
      list=list.concat(window.__V19_DATA?window.__V19_DATA.bosses:[]);
      var b18=window.__V18_BOSSES||{};
      ['en','el','leg'].forEach(function(k){ if(b18[k]) list=list.concat(b18[k]); });
      if(b18['old']) list=list.concat(b18['old'].map(function(b){ var c={}; for(var k in b) c[k]=b[k]; c._old=true; return c; }));
      list=list.concat(window.__V35_DATA?window.__V35_DATA.bosses:[]);
      var modeB=[], poolB=[];
      list.forEach(function(b){
        if(v36.blockedReason({boss:b,lang:'en'})==='mode') modeB.push(b.id);
        var F={boss:b,lang:'en',weak:v34.weakFor(b,'en'),pools:{words:poolOf(b)}};
        if(v34.scopeBlocked(F)===true) poolB.push(b.id);
      });
      function distinct(a,b){ var s={}; a.concat(b).forEach(function(id){s[id]=1;}); return Object.keys(s).length; }
      return {bossN:list.length, modeBlocked:modeB.sort(), poolBlocked:poolB.sort(), distinct:distinct(modeB,poolB)};
    })())`);
    check(`recount at mastered ${m}: pool-blocked 0 (was 13, would-be 23)`, rec.poolBlocked.length === 0, rec.poolBlocked);
    check(`recount at mastered ${m}: distinct blocked 15 (mode only, was 26)`, rec.distinct === 15 && rec.modeBlocked.length === 15, rec);
    check(`recount at mastered ${m}: mode-blocked ids unchanged from V19.0`, JSON.stringify(rec.modeBlocked) === JSON.stringify(v190Table['700'].rows.filter(r => r.modeBlocked).map(r => r.id).sort()), rec.modeBlocked);
    check(`recount at mastered ${m}: boss count still 86`, rec.bossN === 86, rec.bossN);
  }
  // The 23 overrides are exact; the other 63 bosses are unchanged.
  setMastered(ctx, 0);
  const weakNow = J(ctx, `JSON.stringify((function(){
    var v34=window.__v34, out={};
    var list=[];
    list=list.concat(window.__V33_DATA?window.__V33_DATA.bosses:[]);
    list=list.concat(window.__V19_DATA?window.__V19_DATA.bosses:[]);
    var b18=window.__V18_BOSSES||{};
    ['en','el','leg'].forEach(function(k){ if(b18[k]) list=list.concat(b18[k]); });
    if(b18['old']) list=list.concat(b18['old']);
    list=list.concat(window.__V35_DATA?window.__V35_DATA.bosses:[]);
    list.forEach(function(b){ var w=v34.weakFor(b,'en'); out[b.id]=w?w.kind+':'+w.key:null; });
    return out;
  })())`);
  let overrideOK = true, overrideBad = [];
  for (const [id, want] of Object.entries(EXPECTED_WEAK46)) {
    if (weakNow[id] !== want) { overrideOK = false; overrideBad.push(id + ':' + weakNow[id] + '!=' + want); }
  }
  check('all 23 redesigned bosses carry their new weakness topic', overrideOK, overrideBad);
  let othersOK = true, othersBad = [];
  for (const [id, want] of Object.entries(v190Weak)) {
    if (EXPECTED_WEAK46[id]) continue;
    if (weakNow[id] !== want) { othersOK = false; othersBad.push(id + ':' + weakNow[id] + '!=' + want); }
  }
  check('the other 63 bosses keep their V19.0 weakness exactly', othersOK, othersBad);
  // Weakness-word counts in-pool for the 23 (design minimums: leg >=7 at
  // every band; B1-pool >=13; B2-pool >=12).
  for (const m of [0, 200, 600]) {
    setMastered(ctx, m);
    const counts = J(ctx, `JSON.stringify((function(){
      var v34=window.__v34;
      var WORDS=window.__v15.words;
      function legDiff(){ var mm=0; try{ mm=window.__v15.counts.mastered; }catch(e){} if(mm<200)return ['A2','B1']; if(mm<600)return ['B1']; return ['B2']; }
      function poolOf(b){
        var list;
        if(b._old) list=WORDS.slice();
        else if(b.lib==='oxford'){ list=WORDS.filter(function(x){ return (x.lib||[]).indexOf('oxford')>=0; }); if(b.diff) list=list.filter(function(x){ return x.lv===b.diff; }); }
        else if(b.arena==='leg'){ var lv=legDiff(); list=WORDS.filter(function(x){ return lv.indexOf(x.lv)>=0; }); }
        else if(b.diff) list=WORDS.filter(function(x){ return x.lv===b.diff; });
        else list=WORDS.slice();
        if(list.length<12) list=WORDS.slice();
        return list;
      }
      var ids=${JSON.stringify(Object.keys(EXPECTED_WEAK46))};
      var all={};
      listAll().forEach(function(b){ if(ids.indexOf(b.id)>=0) all[b.id]=v34._test.weakCountInPool(v34.weakFor(b,'en'),poolOf(b)); });
      function listAll(){
        var list=[];
        list=list.concat(window.__V33_DATA?window.__V33_DATA.bosses:[]);
        list=list.concat(window.__V19_DATA?window.__V19_DATA.bosses:[]);
        var b18=window.__V18_BOSSES||{};
        ['en','el','leg'].forEach(function(k){ if(b18[k]) list=list.concat(b18[k]); });
        if(b18['old']) list=list.concat(b18['old']);
        list=list.concat(window.__V35_DATA?window.__V35_DATA.bosses:[]);
        return list;
      }
      return all;
    })())`);
    const legIds = Object.keys(EXPECTED_WEAK46).filter(id => id.indexOf('v10_') === 0 && ['v10_firedragon','v10_icewolf','v10_thunderlion','v10_seaoctopus','v10_titan','v10_phoenix','v10_voidghost','v10_godturtle','v10_ninetails','v10_ancienttree'].indexOf(id) >= 0);
    const legMin = Math.min(...legIds.map(id => counts[id]));
    const otherMin = Math.min(...Object.keys(counts).filter(id => legIds.indexOf(id) < 0).map(id => counts[id]));
    check(`weakness words in-pool at mastered ${m}: Legendary min ${legMin} (>=7)`, legMin >= 7, counts);
    check(`weakness words in-pool at mastered ${m}: other redesigned min ${otherMin} (>=12)`, otherMin >= 12, counts);
  }
  setMastered(ctx, 0);
  // Meter mechanics: 3 weakness hits = BREAK (10% max HP, clamped 10-50).
  const brk = J(ctx, `JSON.stringify((function(){
    var v34=window.__v34, v15=window.__v15, out={};
    var weakWord=null, otherWord=null;
    for(var i=0;i<v15.words.length;i++){ var w=v15.words[i]; if(!weakWord&&v34.weakMatch(w,{kind:'a1a2',key:'nature'})) weakWord=w; if(!otherWord&&!v34.weakMatch(w,{kind:'a1a2',key:'nature'})) otherWord=w; if(weakWord&&otherWord) break; }
    var pool=v15.words.filter(function(w){return w.lv==='B2';});
    function mkF(){ return {boss:{id:'v10_dict'},lang:'en',weak:{kind:'a1a2',key:'nature'},brk:0,brkMax:3,maxHp:300,over:null,pools:{words:pool},cur:{w:weakWord}}; }
    var F=mkF();
    out.dmg1=v34.breakDmg(F); out.brk1=F.brk;
    out.dmg2=v34.breakDmg(F); out.brk2=F.brk;
    out.dmg3=v34.breakDmg(F); out.brk3=F.brk;
    var F2=mkF(); F2.cur={w:otherWord};
    out.dmgOther=v34.breakDmg(F2); out.brkOther=F2.brk;
    var F3=mkF(); F3.pools={words:[]};
    out.dmgNoPool=v34.breakDmg(F3);
    var F4=mkF(); F4.maxHp=100;
    F4.brk=2; out.dmgSmall=v34.breakDmg(F4);
    var F5=mkF(); F5.maxHp=900;
    F5.brk=2; out.dmgBig=v34.breakDmg(F5);
    return out;
  })())`);
  check('breakDmg: 3 weakness hits BREAK for +30 (10% of 300 HP)', brk.dmg1 === 0 && brk.dmg2 === 0 && brk.dmg3 === 30 && brk.brk3 === 0, brk);
  check('breakDmg: non-weakness word does not fill the meter', brk.dmgOther === 0 && brk.brkOther === 0, brk);
  check('breakDmg: BREAK bonus clamps to 10 (100 HP) and 50 (900 HP)', brk.dmgSmall === 10 && brk.dmgBig === 50, brk);
  // Live scopeBlocked=false spot checks (real fights): previously
  // pool-blocked v10_dict + Legendary v10_firedragon at 200 and 600.
  const liveBlocked = J(ctx, `JSON.stringify((function(){
    var out={};
    function setM(n){ var v15=window.__v15, words=v15.words, old=v15.enOld(); Object.keys(old.box||{}).forEach(function(k){ old.box[k]=0; }); for(var i=0;i<n&&i<words.length;i++) old.box[words[i].id]=5; v15.save15(); }
    try{
      var v18=window.__v18, v34=window.__v34;
      setM(0);
      // v10_dict is 9th in the EN arena — seed the 8 prior wins to unlock it.
      var e0=v18._test.en18();
      ['v10_slime','v10_goblin','v10_dragon','v10_ghost','v10_spider','v10_owl','v10_tiger','v10_wizard'].forEach(function(id){e0.bosses[id]={win:true};});
      v18.fight('v10_dict','en');
      var F=v18._test.F(); out.dictLive=!!F; out.dictScopeBlocked=F?v34.scopeBlocked(F):null; out.dictWeak=F&&F.weak?F.weak.kind+':'+F.weak.key:null;
      v18.close();
      setM(200);
      var e=v18._test.en18();
      ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
      v18._test.fight('v10_firedragon','en');
      var F2=v18._test.F(); out.leg200Live=!!F2; out.leg200ScopeBlocked=F2?v34.scopeBlocked(F2):null; out.leg200Weak=F2&&F2.weak?F2.weak.kind+':'+F2.weak.key:null;
      v18.close();
      setM(600);
      v18._test.fight('v10_firedragon','en');
      var F3=v18._test.F(); out.leg600Live=!!F3; out.leg600ScopeBlocked=F3?v34.scopeBlocked(F3):null; out.leg600Weak=F3&&F3.weak?F3.weak.kind+':'+F3.weak.key:null;
      v18.close();
    }catch(e){ out.err=String(e&&e.message||e); }
    return out;
  })())`);
  check('live v10_dict fight (was pool-blocked): scopeBlocked=false, weak=a1a2:education', liveBlocked.dictLive === true && liveBlocked.dictScopeBlocked === false && liveBlocked.dictWeak === 'a1a2:education', liveBlocked);
  check('live Legendary fight at mastered 200: scopeBlocked=false, weak=a1a2:emotions-and-feelings', liveBlocked.leg200Live === true && liveBlocked.leg200ScopeBlocked === false && liveBlocked.leg200Weak === 'a1a2:emotions-and-feelings', liveBlocked);
  check('live Legendary fight at mastered 600: scopeBlocked=false, weak=a1a2:emotions-and-feelings', liveBlocked.leg600Live === true && liveBlocked.leg600ScopeBlocked === false && liveBlocked.leg600Weak === 'a1a2:emotions-and-feelings', liveBlocked);
  setMastered(ctx, 0);

  // ================= §46C KO/EN XP parity =================
  section('§46C', 'KO/EN XP parity — one shared rule, both engines');
  // Unit rules on the shared function with controlled inputs.
  const unit = J(ctx, `JSON.stringify((function(){
    var A=window.__v46._test.awardBossAnswerXP, out={};
    function fresh(){ return {gain:0, hist:{}, daily:{d:'',correct:0,wrong:0,xp:0}}; }
    var f1=fresh(), xpAt1={}, st1={streak:5};
    out.call1=A({ok:true,id:'w1',boxUp:true,streakObj:st1,streakKey:'streak',xpAt:xpAt1,gain:function(n){f1.gain+=n;},hist:f1.hist,daily:f1.daily});
    out.gain1=f1.gain; out.xpAtSet=!!xpAt1['w1']; out.hist1=f1.hist; out.daily1=f1.daily;
    out.call2=A({ok:true,id:'w1',boxUp:true,streakObj:st1,streakKey:'streak',xpAt:xpAt1,gain:function(n){f1.gain+=n;},hist:f1.hist,daily:f1.daily});
    out.gain2=f1.gain;
    out.call3=A({ok:true,id:'w2',boxUp:false,streakObj:{streak:4},streakKey:'streak',xpAt:{},gain:function(n){f1.gain+=n;},hist:f1.hist,daily:f1.daily});
    out.call4=A({ok:false,id:'w3',boxUp:false,streakObj:{streak:0},streakKey:'streak',xpAt:{},gain:function(n){f1.gain+=n;},hist:f1.hist,daily:f1.daily});
    out.gainFinal=f1.gain;
    // KO shape: namespaced key, koStreak holder, boxUp=true on correct.
    var f2=fresh(), xpAt2={}, ko={koStreak:5};
    out.koCall1=A({ok:true,id:'ko:card1',boxUp:true,streakObj:ko,streakKey:'koStreak',xpAt:xpAt2,gain:function(n){f2.gain+=n;},hist:f2.hist,daily:f2.daily});
    out.koGain1=f2.gain; out.koXpAtSet=!!xpAt2['ko:card1'];
    out.koCall2=A({ok:true,id:'ko:card1',boxUp:true,streakObj:ko,streakKey:'koStreak',xpAt:xpAt2,gain:function(n){f2.gain+=n;},hist:f2.hist,daily:f2.daily});
    out.koGain2=f2.gain;
    out.koKey=window.__v46.koXpKey('abc123');
    // Streak bonus lands exactly at multiples of 5 (4 -> 0, 5 -> +5, 10 -> +5).
    var f3=fresh();
    out.streak4=A({ok:true,id:'s4',boxUp:false,streakObj:{streak:4},streakKey:'streak',xpAt:{},gain:function(n){f3.gain+=n;},hist:f3.hist,daily:f3.daily});
    out.streak10=A({ok:true,id:'s10',boxUp:false,streakObj:{streak:10},streakKey:'streak',xpAt:{},gain:function(n){f3.gain+=n;},hist:f3.hist,daily:f3.daily});
    return out;
  })())`);
  check('unit EN: first box-up correct at streak 5 pays 10+5=15, cooldown key set', unit.call1 === 15 && unit.gain1 === 15 && unit.xpAtSet === true, unit);
  check('unit EN: same word inside 10 min pays streak-only 5 (cooldown blocks +10)', unit.call2 === 5 && unit.gain2 === 20, unit);
  check('unit EN: no box-up + streak 4 pays 0', unit.call3 === 0, unit);
  check('unit EN: wrong answer pays 0', unit.call4 === 0 && unit.gainFinal === 20, unit);
  check('unit KO: same rule via ko: key + koStreak (15, then 5)', unit.koCall1 === 15 && unit.koGain1 === 15 && unit.koXpAtSet === true && unit.koCall2 === 5 && unit.koGain2 === 20, unit);
  check('unit: koXpKey namespaces the card id', unit.koKey === 'ko:abc123', unit.koKey);
  check('unit: streak bonus only at multiples of 5 (4->0, 10->+5)', unit.streak4 === 0 && unit.streak10 === 5, unit);
  check('unit: hist/daily bookkeeping matches the old mark18 block', (() => {
    const dn = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
    const h = unit.hist1[dn];
    return !!h && h.t === 4 && h.c === 3 && h.xp === 20 && unit.daily1.correct === 3 && unit.daily1.wrong === 1 && unit.daily1.xp === 20;
  })(), unit);
  // Live KO fights pay XP in both engines; per-answer rule holds on the
  // observed sequences (first correct on a card: +10, +5 more at streak 5;
  // repeat on the same card inside 10 min: +0, +5 more at streak 5).
  // Each engine runs in its OWN fresh ctx: the xpAt cooldown map is
  // shared across engines, so a card answered in the v18 fight would
  // (correctly) pay 0 on its repeat in the v19 fight.
  function liveKOFight(engine) {
    const c = makeCtx();
    const l = loadPage(c, html);
    if (l.loadErr) return { loadErr: l.loadErr };
    fireDCL(c);
    E(c, `window.__v15.buildWords()`);
    return J(c, `JSON.stringify((function(){
      var out={seq:[], koRight0:0};
      function xp(){ return S.xp||0; }
      for(var i=0;i<10;i++){ S.cards.push({id:'ko_seed_'+i, d:'d0', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:'', g:'', box:0, due:0}); }
      save();
      var seen={}, streak=0;
      if('${engine}'==='v18'){
        var v18=window.__v18;
        var e18=v18._test.en18(); out.koRight0=e18.koStats.right||0; out.koStreak0=e18.koStreak||0;
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
        out.koXpAtKeys=Object.keys(window.__v15.enOld().xpAt||{}).filter(function(k){return k.indexOf('ko:')===0;}).sort();
        v18.close();
      }else{
        var v19=window.__v19;
        var e19=v19.en19(); out.koRight0=e19.koStats.right||0; out.koStreak0=e19.koStreak||0;
        var xp0b=xp();
        v19._test.setLang('ko'); v19.fight('v11_fireking');
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
        out.koXpAtKeys=Object.keys(window.__v15.enOld().xpAt||{}).filter(function(k){return k.indexOf('ko:')===0;}).sort();
      }
      return out;
    })())`);
  }
  const ko18 = liveKOFight('v18');
  check('live v18 KO fight: 8 correct KO answers pay XP (>0)', ko18.delta > 0 && ko18.koRightDelta === 8, ko18);
  check('live v18 KO fight: per-answer rule holds on all 8 answers', ko18.seq.length === 8 && ko18.seq.every(s => s.delta === s.expect), ko18.seq);
  check('live v18 KO fight: koStreak ends at 8, ko: xpAt keys recorded', ko18.koStreak === 8 && ko18.koXpAtKeys.length > 0 && ko18.koXpAtKeys.every(k => k.indexOf('ko:') === 0) && ko18.koXpAtKeys.some(k => k.indexOf('ko:ko_seed_') === 0), ko18);
  const ko19 = liveKOFight('v19');
  check('live v19 KO fight: 8 correct KO answers pay XP (>0)', ko19.delta > 0 && ko19.koRightDelta === 8, ko19);
  check('live v19 KO fight: per-answer rule holds on all 8 answers', ko19.seq.length === 8 && ko19.seq.every(s => s.delta === s.expect), ko19.seq);
  check('live v19 KO fight: koStreak ends at 8, ko: xpAt keys recorded', ko19.koStreak === 8 && ko19.koXpAtKeys.length > 0 && ko19.koXpAtKeys.every(k => k.indexOf('ko:') === 0), ko19);
  // Live KO wrong answers pay 0 and reset the KO streak.
  const koWrong = J(ctx, `JSON.stringify((function(){
    var out={};
    function xp(){ return S.xp||0; }
    var v18=window.__v18;
    var e=v18._test.en18(); var w0=e.koStats.wrong||0;
    var xp0=xp();
    v18.fight('v10_slime','ko');
    for(var a=0;a<3;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
      v18._test.pickWrong(); v18.next(); }
    out.delta=xp()-xp0; out.wrongDelta=(v18._test.en18().koStats.wrong||0)-w0;
    out.koStreak=v18._test.en18().koStreak;
    v18.close();
    return out;
  })())`);
  check('live KO wrong answers pay 0 XP and reset koStreak', koWrong.delta === 0 && koWrong.wrongDelta === 3 && koWrong.koStreak === 0, koWrong);
  // Live EN fight per-answer rule (box-up + cooldown + streak) — same rule.
  const enLive = J(ctx, `JSON.stringify((function(){
    var out={seq:[], total:0};
    function xp(){ return S.xp||0; }
    var v18=window.__v18, old=window.__v15.enOld();
    var xp0=xp(), streak0=old.streak||0;
    v18.fight('v10_slime','en');
    for(var a=0;a<8;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
      var w=(F.cur&&F.cur.w)||null, before=xp();
      var boxBefore=w?(old.box[w.id]||0):0, xpAtBefore=w?(old.xpAt[w.id]||0):0;
      v18._test.pickCorrect(); v18.next();
      var d=xp()-before;
      var boxAfter=w?(old.box[w.id]||0):0, streakAfter=old.streak||0;
      var expect=0;
      if(w&&boxAfter>boxBefore&&(Date.now()-xpAtBefore>600000||!xpAtBefore)) expect+=10;
      if(streakAfter>0&&streakAfter%5===0) expect+=5;
      out.seq.push({id:w?w.id:null, delta:d, expect:expect, boxBefore:boxBefore, boxAfter:boxAfter, streakAfter:streakAfter});
    }
    out.total=xp()-xp0; out.streakDelta=(old.streak||0)-streak0;
    v18.close();
    return out;
  })())`);
  check('live v18 EN fight: 8 correct answers pay XP (>0)', enLive.total > 0, enLive);
  check('live v18 EN fight: per-answer rule holds on all 8 answers', enLive.seq.length === 8 && enLive.seq.every(s => s.delta === s.expect), enLive.seq);
  // First-win / replay rewards unchanged, both engines, both languages.
  // NOTE: v18 first-win is PER BOSS (shared across languages), while v19
  // first-win is PER LANGUAGE — so the v18 KO tests run on their own
  // fresh ctx (slime never won there) and the v18 EN tests on another;
  // v19 EN + KO share a fresh ctx (per-language first-win).
  // ACCOUNTING: pickCorrect() pays the per-answer XP *and* the win
  // reward in the same call (winReward runs inside answer()), so the
  // win bonus is isolated from the LETHAL answer only: its per-answer
  // XP is computed from the pre-answer state (box/cooldown/streak) and
  // subtracted from that step's XP delta.
  function freshWinCtx(lang) {
    const cc = makeCtx();
    const ll = loadPage(cc, html);
    if (ll.loadErr) return null;
    fireDCL(cc);
    E(cc, `window.__v15.buildWords()`);
    if (lang === 'ko') E(cc, `for(var i=0;i<10;i++){ if(!S.cards.some(function(x){return x.id==='ko_seed_'+i;})) S.cards.push({id:'ko_seed_'+i, d:'d0', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:'', g:'', box:0, due:0}); } save();`);
    return cc;
  }
  function winFight(engine, lang, bossId, c) {
    if (!c) return { loadErr: 'no ctx' };
    return J(c, `JSON.stringify((function(){
      var out={};
      function xp(){ return S.xp||0; }
      function gems(){ return S.v7.gems||0; }
      var steps=0, won=false, rewardXp=0, rewardGems=0, winBonus=null;
      var old=window.__v15.enOld();
      function expectedLethal(F, eng){
        if(!F||!F.cur) return 0;
        if(F.cur.w){
          var id=F.cur.w.id, boxB=old.box[id]||0, atB=old.xpAt[id]||0, stB=old.streak||0;
          var e2=0;
          if(boxB<5&&(!atB||Date.now()-atB>600000)) e2+=10;
          if((stB+1)>0&&(stB+1)%5===0) e2+=5;
          return e2;
        }
        if(F.cur.k){
          var kid='ko:'+F.cur.k.id, atK=old.xpAt[kid]||0;
          var eSt=eng==='v18'?window.__v18.en18().koStreak:window.__v19.en19().koStreak;
          var e3=0;
          if(!atK) e3+=10;
          if((eSt+1)>0&&(eSt+1)%5===0) e3+=5;
          return e3;
        }
        return 0;
      }
      if('${engine}'==='v18'){
        var v18=window.__v18;
        var b=null;
        ['en','el','leg'].forEach(function(a){ (v18.bosses[a]||[]).forEach(function(x){ if(x.id==='${bossId}') b=x; }); });
        rewardXp=b.reward.xp; rewardGems=b.reward.gems||0;
        var xp0=xp(), g0=gems();
        v18.fight('${bossId}','${lang}');
        while(steps++<80){ var F=v18._test.F(); if(!F) break; if(F.over){ won=(F.over==='win'); break; }
          var exp=expectedLethal(F,'v18'), before=xp();
          v18._test.pickCorrect(); v18.next();
          if(F.over==='win'){ winBonus=(xp()-before)-exp; }
        }
        out={won:won, steps:steps, totalDelta:xp()-xp0, winBonus:winBonus, gemsDelta:gems()-g0, rewardXp:rewardXp, rewardGems:rewardGems};
        v18.close();
      }else{
        var v19=window.__v19;
        var b2=null;
        (window.__V19_DATA.bosses||[]).forEach(function(x){ if(x.id==='${bossId}') b2=x; });
        rewardXp=b2.reward.xp; rewardGems=b2.reward.gems||0;
        var xp0b=xp(), g0b=gems();
        v19.openMapFor('en'); if('${lang}'==='ko')v19._test.setLang('ko'); v19.fight('${bossId}');
        while(steps++<80){ var F2=v19._test.F(); if(!F2) break; if(F2.over){ won=(F2.over==='win'); break; }
          var exp2=expectedLethal(F2,'v19'), before2=xp();
          v19._test.pickCorrect(); v19._test.next();
          if(F2.over==='win'){ winBonus=(xp()-before2)-exp2; }
        }
        out={won:won, steps:steps, totalDelta:xp()-xp0b, winBonus:winBonus, gemsDelta:gems()-g0b, rewardXp:rewardXp, rewardGems:rewardGems};
      }
      return out;
    })())`);
  }
  const ctxWinA = freshWinCtx('en');
  const winEn18 = winFight('v18', 'en', 'v10_slime', ctxWinA);
  check('v18 EN first win: win bonus equals the boss reward XP (not per-answer XP)', winEn18.won === true && winEn18.winBonus === winEn18.rewardXp && winEn18.rewardXp > 0, winEn18);
  check('v18 EN first win: gems bonus equals the boss reward gems', winEn18.gemsDelta === winEn18.rewardGems, winEn18);
  const replayEn18 = winFight('v18', 'en', 'v10_slime', ctxWinA);
  check('v18 EN replay win: win bonus is +10 XP (not the first-win reward)', replayEn18.won === true && replayEn18.winBonus === 10, replayEn18);
  const ctxWinB = freshWinCtx('ko');
  const winKo18 = winFight('v18', 'ko', 'v10_slime', ctxWinB);
  check('v18 KO first win: win bonus equals the boss reward XP (same as EN)', winKo18.won === true && winKo18.winBonus === winKo18.rewardXp && winKo18.rewardXp > 0, winKo18);
  const replayKo18 = winFight('v18', 'ko', 'v10_slime', ctxWinB);
  check('v18 KO replay win: win bonus is +10 XP (same as EN)', replayKo18.won === true && replayKo18.winBonus === 10, replayKo18);
  const ctxWinC = freshWinCtx('ko');
  const winEn19 = winFight('v19', 'en', 'v11_fireking', ctxWinC);
  check('v19 EN first win: win bonus equals the boss reward XP', winEn19.won === true && winEn19.winBonus === winEn19.rewardXp && winEn19.rewardXp > 0, winEn19);
  const winKo19 = winFight('v19', 'ko', 'v11_fireking', ctxWinC);
  check('v19 KO first win: win bonus equals the boss reward XP (same as EN)', winKo19.won === true && winKo19.winBonus === winKo19.rewardXp, winKo19);

  // ================= §46D EN XP unchanged vs pristine V19.0 =================
  // Same seeded Math.random, identical drivers, on the pristine V19.0
  // build and on this build: EN fight deltas must be exactly equal.
  section('§46D', 'EN XP unchanged vs pristine V19.0 (seeded)');
  const pristineHtml = fs.readFileSync(path.join(__dirname, 'pristine-v19.0-out', 'index.html'), 'utf-8');
  function enFightDeltas(ctx2) {
    return J(ctx2, `JSON.stringify((function(){
      var out={};
      function xp(){ return S.xp||0; }
      var v18=window.__v18;
      var xp0=xp(), n=0;
      v18.fight('v10_slime','en');
      for(var a=0;a<8;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
        if(F.cur&&F.cur.w) n++;
        v18._test.pickCorrect(); v18.next(); }
      out.en18={delta:xp()-xp0, enQ:n};
      v18.close();
      var v19=window.__v19, xp2=xp(), n19=0;
      v19.openMapFor('en'); v19.fight('v11_fireking');
      for(var c=0;c<8;c++){ var F3=v19._test.F(); if(!F3||F3.over) break; F3.hp=999;
        if(F3.cur&&F3.cur.w) n19++;
        v19._test.pickCorrect(); v19._test.next(); }
      out.en19={delta:xp()-xp2, enQ:n19};
      return out;
    })())`);
  }
  const ctxOld = seededCtx(pristineHtml, 46);
  const deltasOld = enFightDeltas(ctxOld);
  const ctxNew = seededCtx(html, 46);
  const deltasNew = enFightDeltas(ctxNew);
  check('seeded EN v18 fight delta identical to pristine V19.0', deltasNew.en18.delta === deltasOld.en18.delta && deltasNew.en18.enQ === deltasOld.en18.enQ && deltasOld.en18.enQ === 8, { old: deltasOld.en18, new: deltasNew.en18 });
  check('seeded EN v19 fight delta identical to pristine V19.0', deltasNew.en19.delta === deltasOld.en19.delta && deltasNew.en19.enQ === deltasOld.en19.enQ && deltasOld.en19.enQ === 8, { old: deltasOld.en19, new: deltasNew.en19 });
  // Same seeded drivers, KO side: pristine 0, new build pays (by design).
  function koFightDelta(ctx2) {
    return J(ctx2, `JSON.stringify((function(){
      var out={};
      function xp(){ return S.xp||0; }
      for(var i=0;i<10;i++){ S.cards.push({id:'ko_seed_'+i, d:'d0', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:'', g:'', box:0, due:0}); }
      save();
      var v18=window.__v18, xp0=xp(), n=0;
      v18.fight('v10_slime','ko');
      for(var a=0;a<8;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
        if(F.cur&&F.cur.k) n++;
        v18._test.pickCorrect(); v18.next(); }
      out={delta:xp()-xp0, koQ:n};
      v18.close();
      return out;
    })())`);
  }
  const ctxOldKO = seededCtx(pristineHtml, 47);
  const koOld = koFightDelta(ctxOldKO);
  const ctxNewKO = seededCtx(html, 47);
  const koNew = koFightDelta(ctxNewKO);
  check('seeded KO fight on pristine V19.0 pays 0 XP (the bug)', koOld.delta === 0 && koOld.koQ === 8, koOld);
  check('seeded KO fight on V19.0.1 pays XP (>0) for the same 8 answers', koNew.delta > 0 && koNew.koQ === 8, koNew);
  // Same seeded drivers, legDiff pool at 700 + dict scopeBlocked: the
  // intended differences (B2 pool; dict unblocked), nothing else.
  function legPool700(ctx2) {
    return J(ctx2, `JSON.stringify((function(){
      var out={};
      var v15=window.__v15, words=v15.words, old=v15.enOld();
      for(var i=0;i<700&&i<words.length;i++) old.box[words[i].id]=5;
      v15.save15();
      out.legDiff=window.__v18._test.legDiff();
      try{
        var e=window.__v18._test.en18();
        ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
        window.__v18._test.fight('v10_firedragon','en');
        var F=window.__v18._test.F();
        var lv={}; (F.pools.words||[]).forEach(function(w){ lv[w.lv]=(lv[w.lv]||0)+1; }); out.poolLevels=lv;
        window.__v18.close();
        // v10_dict is 9th in the EN arena — seed the 8 prior wins to unlock it.
        ['v10_slime','v10_goblin','v10_dragon','v10_ghost','v10_spider','v10_owl','v10_tiger','v10_wizard'].forEach(function(id){e.bosses[id]={win:true};});
        window.__v18.fight('v10_dict','en');
        var F2=window.__v18._test.F();
        out.dictScopeBlocked=F2?window.__v34.scopeBlocked(F2):null;
        window.__v18.close();
      }catch(e){ out.err=String(e&&e.message||e); }
      return out;
    })())`);
  }
  const legOld = legPool700(seededCtx(pristineHtml, 48));
  const legNew = legPool700(seededCtx(html, 48));
  check('pristine legDiff at 700 is [A2,B1] with an A2/B1 pool (the bug)', JSON.stringify(legOld.legDiff) === JSON.stringify(['A2', 'B1']) && levelsEq(legOld.poolLevels, { A2: 300, B1: 250 }), legOld);
  check('V19.0.1 legDiff at 700 is [B2] with a B2-only pool', JSON.stringify(legNew.legDiff) === JSON.stringify(['B2']) && levelsEq(legNew.poolLevels, { B2: 630 }), legNew);
  check('pristine v10_dict is pool-blocked (scopeBlocked=true)', legOld.dictScopeBlocked === true, legOld);
  check('V19.0.1 v10_dict is unblocked (scopeBlocked=false)', legNew.dictScopeBlocked === false, legNew);

  // ================= §46E regression spot-checks =================
  section('§46E', 'regression spot-checks (V19.0 behaviour preserved)');
  // 45A: fresh save has 0 due words.
  {
    const cF = makeCtx();
    const lF = loadPage(cF, html);
    check('regression ctx loads', lF.loadErr === null, lF.loadErr);
    fireDCL(cF);
    E(cF, `window.__v15.buildWords()`);
    const due0 = J(cF, `JSON.stringify({due:window.__v15.counts15().due, mastered:window.__v15.counts15().mastered})`);
    check('45A fresh save: 0 due words, 0 mastered', due0.due === 0 && due0.mastered === 0, due0);
  }
  // 45C: corrupt save is quarantined byte-exact (bad JSON + no-cards).
  {
    const bad = '{"cards":null,"v7":{broken';
    const cC = makeCtx();
    cC.localStorage.setItem('hanvocab.v1', bad);
    const lC = loadPage(cC, html);
    check('corrupt-save ctx loads', lC.loadErr === null, lC.loadErr);
    fireDCL(cC);
    const q = E(cC, `(function(){ var found=null; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.indexOf('hanvocab.v12.corrupt-')===0) found={key:k, val:localStorage.getItem(k)}; } return found; })()`);
    check('45C corrupt save quarantined byte-exact', !!q && q.val === bad, q ? { key: q.key, match: q.val === bad } : null);
    check('45C corrupt flag set with reason bad-json', E(cC, `!!(window.__V45_CORRUPT&&window.__V45_CORRUPT.reason==='bad-json'&&window.__V45_CORRUPT.quarantined)`));
  }
  // 45E: enIcon guard (static) — no <img> without an icon.
  check('45E enIcon() falsy guard survives', html.includes("if(!name)return '';"));
  // 44B: Legendary fight starts (EN + KO) + A-F2 KO<8 banner.
  const fights44 = J(ctx, `JSON.stringify((function(){
    var out={};
    try{
      var v18=window.__v18;
      v18.fight('v10_slime','en');
      var F=v18._test.F(); out.enStart=!!F && (F.pools.words||[]).length>0;
      for(var a=0;a<3;a++){ if(!F||F.over) break; F.hp=999; v18._test.pickCorrect(); v18.next(); F=v18._test.F(); }
      out.en3ok=!F || !F.over || true;
      v18.close();
      // KO fight with a full deck starts on KO questions.
      for(var i=0;i<10;i++){ if(!S.cards.some(function(c){return c.id==='ko_seed_'+i;})) S.cards.push({id:'ko_seed_'+i, d:'d0', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:'', g:'', box:0, due:0}); }
      save();
      v18.fight('v10_slime','ko');
      var F2=v18._test.F(); out.koStart=!!F2 && !!(F2.cur&&F2.cur.k);
      v18.close();
    }catch(e){ out.err=String(e&&e.message||e); }
    return out;
  })())`);
  check('44B v18 EN fight starts with a non-empty word pool', fights44.enStart === true, fights44);
  check('44B v18 KO fight starts on a KO question', fights44.koStart === true, fights44);
  {
    // A-F2: KO fight with <8 cards shows the honest <8 banner.
    const cA = makeCtx();
    const lA = loadPage(cA, html);
    check('A-F2 ctx loads', lA.loadErr === null, lA.loadErr);
    fireDCL(cA);
    E(cA, `window.__v15.buildWords()`);
    E(cA, `S.cards=[]; for(var i=0;i<3;i++){ S.cards.push({id:'ko_tiny_'+i, d:'d0', h:'한'+i, m:'nghĩa '+i}); } save();`);
    const af2 = J(cA, `JSON.stringify((function(){
      var out={};
      try{
        window.__v18.fight('v10_slime','ko');
        var F=window.__v18._test.F();
        out.fightLive=!!F; out.banner=F?String(F.banner||''):null;
        out.bar=window.__v34?window.__v34.breakBarHTML(F):null;
        window.__v18.close();
      }catch(e){ out.err=String(e&&e.message||e); }
      return out;
    })())`);
    check('A-F2 KO fight with 3/8 cards shows the 3/8 warning banner', af2.fightLive === true && typeof af2.banner === 'string' && af2.banner.indexOf('3/8') >= 0, af2);
    check('A-F2 KO<8 break bar says the meter cannot break (honest)', typeof af2.bar === 'string' && af2.bar.indexOf('không thể phá') >= 0, af2);
  }
  // V19 map fight still starts (EN).
  const v19start = J(ctx, `JSON.stringify((function(){
    var out={};
    try{
      var v19=window.__v19;
      v19.openMapFor('en'); v19.fight('v11_fireking');
      var F=v19._test.F(); out.live=!!F && (F.pools.words||[]).length>0;
    }catch(e){ out.err=String(e&&e.message||e); }
    return out;
  })())`);
  check('v19 map fight (v11_fireking) still starts with a non-empty pool', v19start.live === true, v19start);

  // ================= §V save schema =================
  section('§V', 'save schema — no new key, no schema change');
  check('no en46 save key', E(ctx, `!S.v7 || !S.v7.en46`));
  check('no v46 localStorage key', E(ctx, `(function(){ for(var i=0;i<localStorage.length;i++){ if(localStorage.key(i).indexOf('v46')>=0) return false; } return true; })()`));
  check('hanvocab.v1 still the only save key', E(ctx, `localStorage.getItem('hanvocab.v1')!==null`));
  check('koStreak lives inside en18/en19 state (number, defaulted)', E(ctx, `typeof window.__v18.en18().koStreak==='number' && typeof window.__v19.en19().koStreak==='number'`));
  check('no new top-level S.v7 key vs pristine V19.0 (fresh boots)', (() => {
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
  skipCheck('Legendary pools at mastered 0/199/200/599/600/700 in real Chrome', 'needs real Chrome — see verify-v46c.js');
  skipCheck('weakness-meter fillability live (incl. previously blocked + Legendary at 200/600)', 'needs real Chrome — see verify-v46c.js');
  skipCheck('blocked-boss recount live in Chrome', 'needs real Chrome — see verify-v46c.js');
  skipCheck('KO vs EN XP parity live in Chrome (per-answer, streak, first-win, replay)', 'needs real Chrome — see verify-v46c.js');
  skipCheck('full Legendary fights to wins at mastered 200 and 600', 'needs real Chrome — see verify-v46c.js');
  skipCheck('360px + laptop viewports, 0 console errors/warnings/dialogs', 'needs real Chrome — see verify-v46c.js');
  skipCheck('live Firebase login/sync', "never tested live in any version — Anh must run the FIREBASE_SETUP.md checklist");
  skipCheck('real phone touch / Safari', "needs Anh's real-phone test");

  const total = pass + fail + skip;
  console.log(`\ntest46: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('test46 crashed:', e); process.exit(2); });
