// repro-v55.js - V19.8 (layer V55) repro-first: the 5 KO SRS gaps on
// pristine V19.7 (layer V54). Harness scaffolding (localStorage/DOM
// stubs, vm loading) is reused verbatim from tools/v53/test53.js;
// only the EXPECTED_SHA / EXPECTED_BYTES constants and the R-checks
// are new.
// Usage: node tools/v55/repro-v55.js [DIR]   (default: the pristine
//   V19.7 backup at tools/v55/backup-v19.7/out; pass the built out/
//   dir to show the checks flipping to FIXED)
// Exit 0 = all 5 defects reproduced on the pristine base (or all 5
//   fixed on the built version); exit 1 = a mix (partial fix).
// The Node process is exited explicitly at the end: the game starts
// real setInterval timers that keep the event loop alive.

//         self-assessment counts as selfOk, never as a grade
//   section 48F Hangul Golem — Lv 77 (58 taken by
//         v11_butterflyqueen), HP 620, TOTAL_BOSSES 87, 70-win
//         unlock, listen weakness (weakFor/weakName), live UCE fight
//         with listen in the rotation, Break 50 on 3 listen hits
//         and 0 on mc answers, feature flags kill-switchable
//   section 48G regression — legDiff thresholds + live Legendary
//         pools 550/250/630 + grammar 24/12/12; KO XP 8 correct =
//         +85 both engines; EN XP sequences identical to pristine
//         V19.2 (seeded); V19.0 C-R3-1/C-R3-2/C-R3-4/NEW-1/
//         weakchip spot-checks
//   section V save schema (en48 lazy — absent on a fresh boot,
//         created on first openForge; no new localStorage key; no
//         new top-level S.v7 key vs pristine on a fresh boot)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint); the
// painted Forge overlay, the real click + answer states, the 360px
// overflow check, and the per-question screens are Chrome gates in
// verify-v48c.js, not asserted here; live-browser, real-phone and
// live-Firebase gates stay Chrome/Anh-only.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = 'aa6333d0135cc110635851ad00f274a219cb183f26a98fbe8a36796f3d057322';
const EXPECTED_BYTES = 2627515;
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

const RDIR = process.argv[2] || path.resolve(__dirname, 'backup-v19.7', 'out');
const htmlPath = path.join(RDIR, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');
let repro = 0, fixed = 0;
function rep(name, isDefect, detail) {
  if (isDefect) { repro++; console.log(`  REPRO ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : ''}`); }
  else { fixed++; console.log(`  FIXED ${name}`); }
}
const c = makeCtx();
const loaded = loadPage(c, html);
if (loaded.loadErr) { console.log('LOAD ERR:', loaded.loadErr); process.exit(2); }
fireDCL(c);
E(c, `window.__v15.buildWords()`);

// Seed: a REAL old-KO-progress save — learned cards across boxes/due,
// weak cards (w>=3), box-0 imports, box-5 mastered. now = Date.now().
const NOW = Date.now();
const SEED = [
  { id: 'k0', d: 'd0', h: '안녕하세요', m: 'xin chào', p: '', e: '', g: 'Chào hỏi', box: 1, due: NOW - 864e5, w: 0 },
  { id: 'k1', d: 'd0', h: '감사합니다', m: 'cảm ơn', p: '', e: '', g: 'Chào hỏi', box: 2, due: NOW - 2 * 864e5, w: 0 },
  { id: 'k2', d: 'd0', h: '학교', m: 'trường học', p: '', e: '', g: 'Đời sống', box: 3, due: NOW - 3 * 864e5, w: 0 },
  { id: 'k3', d: 'd0', h: '밥', m: 'cơm', p: '', e: '', g: 'Đồ ăn', box: 4, due: NOW - 864e5, w: 0 },
  { id: 'k4', d: 'd0', h: '물', m: 'nước', p: '', e: '', g: 'Đồ ăn', box: 1, due: NOW + 864e5, w: 0 },
  { id: 'k5', d: 'd0', h: '김치', m: 'kim chi', p: '', e: '', g: 'Đồ ăn', box: 2, due: NOW - 864e5, w: 4 },
  { id: 'k6', d: 'd0', h: '친구', m: 'bạn bè', p: '', e: '', g: 'Đời sống', box: 1, due: NOW - 864e5, w: 3 },
  { id: 'k7', d: 'd0', h: '가족', m: 'gia đình', p: '', e: '', g: 'Đời sống', box: 5, due: NOW - 864e5, w: 0 },
  { id: 'k8', d: 'd0', h: '사랑', m: 'tình yêu', p: '', e: '', g: 'Đời sống', box: 0, due: 0, w: 0 },
  { id: 'k9', d: 'd0', h: '시간', m: 'thời gian', p: '', e: '', g: 'Đời sống', box: 0, due: 0, w: 0 },
];
J(c, `JSON.stringify((function(){
  var s; try{ s=S; }catch(e){ return {err:'no S'}; }
  s.cards = ${JSON.stringify(SEED)};
  s.decks = [{id:'d0', name:'Bộ mặc định'}]; s.deck = 'd0';
  return s.cards.length;
})())`);

// R1 — no KO SRS layer at all: no __v55 export.
rep('R1 no __v55 KO SRS export', E(c, `typeof window.__v55==='undefined'`));

// R2 — no KO due queue: no shared due function, no dueQueue. The KO
//      scheduler itself works (wilt finds 7 due learned cards incl.
//      box 5), but there is no queue UI/function to surface them.
const r2 = J(c, `JSON.stringify((function(){
  var due = S.cards.filter(function(x){ return x.box>=1 && x.due<=Date.now(); }).map(function(x){return x.id});
  return {wiltDue: due, hasQueue: typeof window.__v55!=='undefined' && typeof window.__v55.dueQueue==='function'};
})())`);
rep('R2 due cards exist (wilt) but no KO due-queue function', r2.wiltDue.length === 7 && r2.hasQueue === false, r2);

// R3 — no KO weak-words list: pest cards exist (w>=3, box<4) but no
//      weak-list function surfaces them.
const r3 = J(c, `JSON.stringify((function(){
  var weak = S.cards.filter(function(x){ return (x.w||0)>=3 && x.box<4; }).map(function(x){return x.id});
  return {pestWeak: weak, hasWeak: typeof window.__v55!=='undefined' && typeof window.__v55.weakList==='function'};
})())`);
rep('R3 weak cards exist (pest) but no KO weak-list function', r3.pestWeak.length === 2 && r3.hasWeak === false, r3);

// R4 — no KO review stats: no koStats function; the only KO due
//      number anywhere is the V6 header count (which also counts
//      box-0 cards with due=0).
const r4 = J(c, `JSON.stringify((function(){
  var hdr = S.cards.filter(function(x){ return x.due<=Date.now(); }).length;
  return {headerDueCount: hdr, hasStats: typeof window.__v55!=='undefined' && typeof window.__v55.koStats==='function'};
})())`);
rep('R4 no KO review stats (header counts box-0 too)', r4.headerDueCount === 9 && r4.hasStats === false, r4);

// R5 — no KO SRS entry: no v55kotab in the HTML, no openSrs.
rep('R5 no KO SRS entry (v55kotab / openSrs)', !html.includes('v55kotab') && E(c, `typeof window.__v55==='undefined'||typeof window.__v55.openSrs!=='function'`));

console.log(`\n== repro-v55 summary ==\nREPRO ${repro} / ${repro + fixed}`);
process.exit(repro === 0 ? 0 : (fixed === 0 ? 0 : 1));
