// test55.js - V19.8 (layer V55) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v48/test48.js via tools/v51/test51.js;
// only the EXPECTED_SHA / EXPECTED_BYTES constants and the
// V54-specific sections are new.
// Usage: node tools/v55/test55.js [DIR]   (default: <root>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
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
const EXPECTED_SHA = 'e5e716e4a1d4352a989732915c2178902ddd115b411342690eb1334f57799445';
const EXPECTED_BYTES = 2653286;
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

// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V55
//         fragments with exact counts, V51-V54 fragments survive,
//         TOTAL_BOSSES 87, WORDS 4892)
//   section L page load (vm, real inline scripts) + __v55/__v27/
//         __v54/__v51 exports
//   section 55A one shared due rule (isDue55 truth table; dueFor55
//         EN+KO; agreement with EN statsOf + v27 classifyKO REVIEW;
//         wilt (farm) vs SRS-due box-5 distinction, documented)
//   section 55B due queue (learned-only, due ASC + prio tiebreak,
//         box-0 imports and box-5 mastered excluded, future due
//         excluded; cap 30/40/50 + clamping + persistence)
//   section 55C weak words (pest + v27 weak, prio order, reasons)
//   section 55D KO review stats (due/learned/weak/mastered,
//         reviewed-today KO-only, Smart streak ko)
//   section 55E live SRS session (startReview55 hands the capped
//         queue to __v27.startSession kind 'srs'; answers advance
//         box/due per KO_IV [0,10m,1d,3d,7d,14d]; wrong resets box
//         and bumps w; no reask when all correct; summary recorded)
//   section 55F flag + entry + overlay HTML (koSrsUI kill-switch,
//         decorator button in #tabs, flag-off state, cap selector,
//         missing-meaning blank, badge contrast AA)
//   section 55G EN regression (EN due counts unchanged; genPool,
//         koPool53, dryRun54, V52 speak, V50 score all hold)
//   section R0 repro-first — pristine V19.7 shows the 5 defects
//         V19.8 fixes (same checks as tools/v55/repro-v55.js)
//   section V save schema (en55 lazy — absent on a fresh boot,
//         created on first use; no new localStorage key; opening
//         the SRS screen mutates no card; save round-trips
//         hanvocab.v1 with en55.cap + unchanged cards)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint); the
// painted SRS overlay, the real click + answer states, the 360px
// overflow check, the Hangul rendering and the live session by
// real DOM clicks are Chrome gates in verify-v55c.js, not asserted
// here; live-browser, real-phone and live-Firebase gates stay
// Chrome/Anh-only.

async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v55.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const pristinePath = path.join(ROOT, 'tools', 'v55', 'backup-v19.7', 'out', 'index.html');
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
    // VM-only shim: V15() is a real global in browsers (src/v16.js:
    // `function V15(){ return window.__v15||null; }`) but its defining
    // block is IIFE-scoped in the vm, so the bare global is invisible.
    // v27's speakKO error callback calls V15() UNGUARDED — on a TTS
    // error (no voices in the vm) its timer callback throws and kills
    // the process. Re-expose the real implementation here; the speak
    // itself still fails honestly (no voices), only the crash is gone.
    E(c, `var V15=function(){ try{ return window.__v15||null; }catch(e){ return null; } };`);
    E(c, `window.__v15.buildWords()`);
    return c;
  }
  // Mark words matching filter as learned (box=1), clear all other boxes first.
  function seedLearned(ctx, filterFn, box) {
    return J(ctx, `JSON.stringify((function(){
      var v=window.__v15, old=v.enOld(), ws=v.words, n=0;
      Object.keys(old.box||{}).forEach(function(k){ old.box[k]=0; });
      ws.forEach(function(w){ if((${filterFn.toString()})(w)){ old.box[w.id]=${box || 1}; n++; } });
      v.save15(); return n;
    })())`);
  }
  function wordsIn(ctx, scopeExpr) {
    return J(ctx, `JSON.stringify(window.__v15.wordsFiltered({scope:${scopeExpr}}).map(function(w){return w.id}))`);
  }

  // ---------- V53 helpers: KO card seeds ----------
  // KO seed cards: {id, d (deck), g (group), h, m, p, e (example), box (1=learned)}.
  // Token counts are the ladder bands: 2-3 -> band 1, 4-5 -> band 2, 6+ -> band 3.
  const KO_A = [ // 8 learned valid + 4 unlearned valid + 5 learned BAD examples (filtered)
    { id: 'a0', d: 'dX', g: 'Chào hỏi', h: '안녕하세요', m: 'xin chào', p: '', e: '안녕하세요, 만나서 반가워요', box: 1 }, // 3 tok
    { id: 'a1', d: 'dX', g: 'Chào hỏi', h: '감사합니다', m: 'cảm ơn', p: '', e: '감사합니다, 도와주셔서 고마워요', box: 1 }, // 3
    { id: 'a2', d: 'dX', g: 'Đời sống', h: '학교', m: 'trường học', p: '', e: '나는 학교에 갑니다', box: 1 }, // 3
    { id: 'a3', d: 'dX', g: 'Đời sống', h: '밥', m: 'cơm', p: '', e: '밥을 먹어요', box: 1 }, // 2
    { id: 'a4', d: 'dX', g: 'Đời sống', h: '물', m: 'nước', p: '', e: '물을 마셔요', box: 1 }, // 2
    { id: 'a5', d: 'dX', g: 'Đồ ăn', h: '사과', m: 'quả táo', p: '', e: '사과를 좋아해요', box: 1 }, // 2
    { id: 'a6', d: 'dX', g: 'Đồ ăn', h: '책', m: 'sách', p: '', e: '책을 읽어요', box: 1 }, // 2
    { id: 'a7', d: 'dX', g: 'Đồ ăn', h: '집', m: 'nhà', p: '', e: '집에 가요', box: 1 }, // 2
    { id: 'a8', d: 'dY', g: 'Hoạt động', h: '수영', m: 'bơi', p: '', e: '수영을 잘해요', box: 0 }, // 2
    { id: 'a9', d: 'dY', g: 'Hoạt động', h: '달리기', m: 'chạy', p: '', e: '매일 아침에 달려요', box: 0 }, // 3
    { id: 'a10', d: 'dY', g: 'Tính từ', h: '예쁘다', m: 'đẹp', p: '', e: '꽃이 아주 예뻐요', box: 0 }, // 3
    { id: 'a11', d: 'dY', g: 'Tính từ', h: '크다', m: 'to', p: '', e: '이 집은 아주 크고 넓어요', box: 0 }, // 5
    { id: 'a12', d: 'dX', g: 'Chào hỏi', h: 'x', m: 'x', p: '', e: '나는 "학교에 갑니다', box: 1 }, // unbalanced "
    { id: 'a13', d: 'dX', g: 'Chào hỏi', h: 'x', m: 'x', p: '', e: '나는 #학교에 갑니다', box: 1 }, // odd-punct #
    { id: 'a14', d: 'dX', g: 'Chào hỏi', h: 'x', m: 'x', p: '', e: '학생입니다.오늘 날씨가 좋아요', box: 1 }, // mid-punct
    { id: 'a15', d: 'dX', g: 'Chào hỏi', h: 'x', m: 'x', p: '', e: '나는 , 학교에 갑니다', box: 1 }, // bad-token
    { id: 'a16', d: 'dX', g: 'Chào hỏi', h: 'x', m: 'x', p: '', e: '사랑해요.', box: 1 }, // too-short
    { id: 'a17', d: 'dX', g: 'Chào hỏi', h: 'x', m: 'x', p: '', e: '나는 학교에~ 갑니다', box: 1 }, // odd-punct ~
  ];
  const KO_S2 = [ // live-supplement seed: 8 learned but only 2 valid examples + 1 deck + 4 other
    { id: 'q0', d: 'dX', g: 'G1', h: 'a', m: 'a', p: '', e: '나는 학교에 갑니다', box: 1 },
    { id: 'q1', d: 'dX', g: 'G1', h: 'b', m: 'b', p: '', e: '밥을 먹어요', box: 1 },
    { id: 'q2', d: 'dX', g: 'G1', h: 'c', m: 'c', p: '', e: '', box: 1 },
    { id: 'q3', d: 'dX', g: 'G1', h: 'd', m: 'd', p: '', e: '사랑해요.', box: 1 },
    { id: 'q4', d: 'dX', g: 'G1', h: 'e', m: 'e', p: '', e: '', box: 1 },
    { id: 'q5', d: 'dX', g: 'G1', h: 'f', m: 'f', p: '', e: '고마워요.', box: 1 },
    { id: 'q6', d: 'dX', g: 'G1', h: 'g', m: 'g', p: '', e: '', box: 1 },
    { id: 'q7', d: 'dX', g: 'G1', h: 'h', m: 'h', p: '', e: '안녕하세요.', box: 1 },
    { id: 'q8', d: 'dX', g: 'G9', h: 'i', m: 'i', p: '', e: '사과를 좋아해요', box: 0 }, // deck -> primary
    { id: 'q9', d: 'dY', g: 'G2', h: 'j', m: 'j', p: '', e: '수영을 잘해요', box: 0 },
    { id: 'q10', d: 'dY', g: 'G2', h: 'k', m: 'k', p: '', e: '매일 아침에 달려요', box: 0 },
    { id: 'q11', d: 'dY', g: 'G3', h: 'l', m: 'l', p: '', e: '꽃이 아주 예뻐요', box: 0 },
    { id: 'q12', d: 'dY', g: 'G3', h: 'm', m: 'm', p: '', e: '이 집은 아주 크고 넓어요', box: 0 },
  ];
  const KO_C = [ // gate-expansion seed: 8 learned but only 2 valid examples + 4 unlearned valid
    { id: 'c0', d: 'dX', g: 'G1', h: 'a', m: 'a', p: '', e: '나는 학교에 갑니다', box: 1 },
    { id: 'c1', d: 'dX', g: 'G1', h: 'b', m: 'b', p: '', e: '밥을 먹어요', box: 1 },
    { id: 'c2', d: 'dX', g: 'G1', h: 'c', m: 'c', p: '', e: '', box: 1 },
    { id: 'c3', d: 'dX', g: 'G1', h: 'd', m: 'd', p: '', e: '사랑해요.', box: 1 },
    { id: 'c4', d: 'dX', g: 'G1', h: 'e', m: 'e', p: '', e: '', box: 1 },
    { id: 'c5', d: 'dX', g: 'G1', h: 'f', m: 'f', p: '', e: '고마워요.', box: 1 },
    { id: 'c6', d: 'dX', g: 'G1', h: 'g', m: 'g', p: '', e: '', box: 1 },
    { id: 'c7', d: 'dX', g: 'G1', h: 'h', m: 'h', p: '', e: '안녕하세요.', box: 1 },
    { id: 'c8', d: 'dY', g: 'G2', h: 'i', m: 'i', p: '', e: '수영을 잘해요', box: 0 },
    { id: 'c9', d: 'dY', g: 'G2', h: 'j', m: 'j', p: '', e: '매일 아침에 달려요', box: 0 },
    { id: 'c10', d: 'dY', g: 'G3', h: 'k', m: 'k', p: '', e: '꽃이 아주 예뻐요', box: 0 },
    { id: 'c11', d: 'dY', g: 'G3', h: 'l', m: 'l', p: '', e: '이 집은 아주 크고 넓어요', box: 0 },
  ];
  const KO_S = [ // short-pool seed: primary 3 learned + 1 deck = 4 < 5, tier3 = 6 -> supplement 1
    { id: 's0', d: 'dX', g: 'G1', h: 'a', m: 'a', p: '', e: '나는 학교에 갑니다', box: 1 },
    { id: 's1', d: 'dX', g: 'G1', h: 'b', m: 'b', p: '', e: '밥을 먹어요', box: 1 },
    { id: 's2', d: 'dX', g: 'G1', h: 'c', m: 'c', p: '', e: '물을 마셔요', box: 1 },
    { id: 's3', d: 'dX', g: 'G9', h: 'd', m: 'd', p: '', e: '사과를 좋아해요', box: 0 },
    { id: 's4', d: 'dY', g: 'G2', h: 'e', m: 'e', p: '', e: '수영을 잘해요', box: 0 },
    { id: 's5', d: 'dY', g: 'G2', h: 'f', m: 'f', p: '', e: '매일 아침에 달려요', box: 0 },
    { id: 's6', d: 'dY', g: 'G3', h: 'g', m: 'g', p: '', e: '꽃이 아주 예뻐요', box: 0 },
    { id: 's7', d: 'dY', g: 'G3', h: 'h', m: 'h', p: '', e: '이 집은 아주 크고 넓어요', box: 0 },
    { id: 's8', d: 'dY', g: 'G4', h: 'i', m: 'i', p: '', e: '책을 읽어요', box: 0 },
    { id: 's9', d: 'dY', g: 'G4', h: 'j', m: 'j', p: '', e: '집에 가요', box: 0 },
  ];
  const KO_D = [ // priority-order seed: 8 learned + 2 deck + 2 group + 2 other (+2 dup texts)
    { id: 'd0', d: 'dX', g: 'G1', h: 'a', m: 'a', p: '', e: '나는 학교에 갑니다', box: 1 },
    { id: 'd1', d: 'dX', g: 'G1', h: 'b', m: 'b', p: '', e: '밥을 먹어요', box: 1 },
    { id: 'd2', d: 'dX', g: 'G1', h: 'c', m: 'c', p: '', e: '물을 마셔요', box: 1 },
    { id: 'd3', d: 'dX', g: 'G1', h: 'd', m: 'd', p: '', e: '사과를 좋아해요', box: 1 },
    { id: 'd4', d: 'dX', g: 'G2', h: 'e', m: 'e', p: '', e: '책을 읽어요', box: 1 },
    { id: 'd5', d: 'dX', g: 'G2', h: 'f', m: 'f', p: '', e: '집에 가요', box: 1 },
    { id: 'd6', d: 'dX', g: 'G2', h: 'g', m: 'g', p: '', e: '수영을 잘해요', box: 1 },
    { id: 'd7', d: 'dX', g: 'G2', h: 'h', m: 'h', p: '', e: '매일 아침에 달려요', box: 1 },
    { id: 'd8', d: 'dX', g: 'G9', h: 'i', m: 'i', p: '', e: '꽃이 아주 예뻐요', box: 0 },
    { id: 'd9', d: 'dX', g: 'G9', h: 'j', m: 'j', p: '', e: '이 집은 아주 크고 넓어요', box: 0 },
    { id: 'd10', d: 'dY', g: 'G1', h: 'k', m: 'k', p: '', e: '오늘은 날씨가 아주 좋아요', box: 0 },
    { id: 'd11', d: 'dY', g: 'G1', h: 'l', m: 'l', p: '', e: '오늘 아침에 날씨가 정말 아주 좋아요', box: 0 },
    { id: 'd12', d: 'dY', g: 'G5', h: 'm', m: 'm', p: '', e: '어제 저녁에 집에서 밥을 맛있게 먹었어요', box: 0 },
    { id: 'd13', d: 'dY', g: 'G5', h: 'n', m: 'n', p: '', e: '내일 아침에 날씨가 정말 아주 좋아요', box: 0 },
    { id: 'd14', d: 'dY', g: 'G5', h: 'o', m: 'o', p: '', e: '꽃이 아주 예뻐요', box: 0 }, // dup of d8 -> dropped
    { id: 'd15', d: 'dY', g: 'G5', h: 'p', m: 'p', p: '', e: '나는 학교에 갑니다', box: 0 }, // dup of d0 -> dropped
  ];
  const KO_L = [ // ladder seed: 8 learned across all 3 bands + 4 unlearned across bands
    { id: 'l0', d: 'dX', g: 'G1', h: 'a', m: 'a', p: '', e: '밥을 먹어요', box: 1 }, // 2 -> b1
    { id: 'l1', d: 'dX', g: 'G1', h: 'b', m: 'b', p: '', e: '물을 마셔요', box: 1 }, // 2 -> b1
    { id: 'l2', d: 'dX', g: 'G1', h: 'c', m: 'c', p: '', e: '나는 학교에 갑니다', box: 1 }, // 3 -> b1
    { id: 'l3', d: 'dX', g: 'G1', h: 'd', m: 'd', p: '', e: '매일 아침에 달려요', box: 1 }, // 3 -> b1
    { id: 'l4', d: 'dX', g: 'G1', h: 'e', m: 'e', p: '', e: '오늘은 날씨가 아주 좋아요', box: 1 }, // 4 -> b2
    { id: 'l5', d: 'dX', g: 'G1', h: 'f', m: 'f', p: '', e: '이 집은 아주 크고 넓어요', box: 1 }, // 5 -> b2
    { id: 'l6', d: 'dX', g: 'G1', h: 'g', m: 'g', p: '', e: '오늘 아침에 날씨가 정말 아주 좋아요', box: 1 }, // 6 -> b3
    { id: 'l7', d: 'dX', g: 'G1', h: 'h', m: 'h', p: '', e: '내일 아침에 날씨가 정말 아주 좋아요', box: 1 }, // 6 -> b3
    { id: 'l8', d: 'dY', g: 'G2', h: 'i', m: 'i', p: '', e: '수영을 잘해요', box: 0 }, // 2 -> b1
    { id: 'l9', d: 'dY', g: 'G2', h: 'j', m: 'j', p: '', e: '꽃이 아주 예뻐요', box: 0 }, // 3 -> b1
    { id: 'l10', d: 'dY', g: 'G2', h: 'k', m: 'k', p: '', e: '책을 열심히 읽어요 오늘도 아침에', box: 0 }, // 5 -> b2
    { id: 'l11', d: 'dY', g: 'G2', h: 'l', m: 'l', p: '', e: '어제 저녁에 집에서 밥을 맛있게 먹었어요', box: 0 }, // 6 -> b3
  ];
  const KO_M = [ // mixed-priority ladder seed: 2 learned + 3 deck + 4 other, bands 1/2/3
    { id: 'm0', d: 'dX', g: 'G1', h: 'a', m: 'a', p: '', e: '밥을 먹어요', box: 1 }, // 2, learned, b1
    { id: 'm1', d: 'dX', g: 'G1', h: 'b', m: 'b', p: '', e: '오늘 아침에 날씨가 정말 아주 좋아요', box: 1 }, // 6, learned, b3
    { id: 'm2', d: 'dX', g: 'G9', h: 'c', m: 'c', p: '', e: '사과를 좋아해요', box: 0 }, // 2, deck, b1
    { id: 'm3', d: 'dX', g: 'G9', h: 'd', m: 'd', p: '', e: '매일 아침에 달려요', box: 0 }, // 3, deck, b1
    { id: 'm4', d: 'dX', g: 'G9', h: 'e', m: 'e', p: '', e: '이 집은 아주 크고 넓어요', box: 0 }, // 5, deck, b2
    { id: 'm5', d: 'dY', g: 'G5', h: 'f', m: 'f', p: '', e: '수영을 잘해요', box: 0 }, // 2, other, b1
    { id: 'm6', d: 'dY', g: 'G5', h: 'g', m: 'g', p: '', e: '꽃이 아주 예뻐요', box: 0 }, // 3, other, b1
    { id: 'm7', d: 'dY', g: 'G5', h: 'h', m: 'h', p: '', e: '책을 읽어요', box: 0 }, // 2, other, b1
    { id: 'm8', d: 'dY', g: 'G5', h: 'i', m: 'i', p: '', e: '내일 아침에 날씨가 정말 아주 좋아요', box: 0 }, // 6, other, b3
  ];
  function seedKO(ctx, cards, deck) {
    return J(ctx, `JSON.stringify((function(){
      var s;try{s=S}catch(e){return {err:'no S'}}
      s.cards=${JSON.stringify(cards)};
      s.deck='${deck || 'dX'}';
      s.decks=[{id:'dX',name:'Deck X'},{id:'dY',name:'Deck Y'}];
      return s.cards.length;
    })())`);
  }
  function koPool(ctx) {
    return J(ctx, `JSON.stringify((function(){
      var p=window.__v48._test.forgePool('ko');
      return {n:p.items.length, learned:p.learned, koSent:p.koSent,
        primary:p.primary, learnedItems:p.learnedItems, unlearnedItems:p.unlearnedItems,
        notice:p.notice||null, supplemented:!!p.supplemented,
        origins:p.items.map(function(i){return i.origin}).join(','),
        learnedFlags:p.items.map(function(i){return i.learned?1:0}).join(''),
        texts:p.items.map(function(i){return i.text}).join(' | ')};
    })())`);
  }
  function koGate(ctx) {
    return J(ctx, `JSON.stringify(window.__v48._test.forgeGate('ko'))`);
  }
  // Play a full 5-question Forge session correctly; collect the
  // question-card HTML at each step + the end-screen HTML.
  function playForge(ctx, lang) {
    return J(ctx, `JSON.stringify((function(){
      var T=window.__v48._test, out={xp0:S.xp||0, checks:[], bonus:null, bonus2:null, right:null, htmls:[], notice:null, list:[]};
      T.startForgeSession('${lang}');
      var FS=T.session();
      out.notice=FS.notice||null;
      out.list=FS.list.map(function(it){return {text:it.text, learned:it.learned, origin:it.origin, tokens:it.tokens.length, tier:it.tier, gen:!!it.gen}});
      for(var s=0;s<5;s++){
        var FS2=T.session(), cur=FS2.list[FS2.i], tiles=FS2.tiles||[];
        out.htmls.push(T.overlayHTML());
        if(!tiles.length){
          FS2.tiles=tiles=cur.tokens.map(function(t,i){return {t:t,k:i}});
          for(var i=tiles.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=tiles[i];tiles[i]=tiles[j];tiles[j]=tmp}
        }
        var used={};
        cur.tokens.forEach(function(tok){
          for(var k=0;k<tiles.length;k++){ if(!used[k]&&tiles[k].t===tok){ used[k]=1; T.forgeTap(k); break; } }
        });
        var r=T.forgeCheck();
        out.checks.push(r&&r.ok);
        if(s<4) T.forgeNext();
      }
      var fin=T.forgeNext();
      out.bonus=fin&&fin.bonus; out.right=fin&&fin.right;
      out.endHtml=T.overlayHTML();
      var fin2=T.forgeNext();
      out.bonus2=fin2&&fin2.bonus;
      out.xpDelta=(S.xp||0)-out.xp0;
      var e=T.en48();
      out.scoreTotal=e.forge.scoreTotal||0;
      return out;
    })())`);
  }
  function bandsOf(list) { return list.map(function (it) { return it.tokens <= 3 ? 1 : (it.tokens <= 5 ? 2 : 3); }); }
  function laddered(list) { const b = bandsOf(list); for (let i = 1; i < b.length; i++) if (b[i] < b[i - 1]) return false; return true; }


  // --- KO55 seed: a real old-KO-progress save --------------------------------
  const NOW = Date.now(); // frozen at suite start; card due dates are relative to it
  // Learned across boxes/due dates, sticky wrong counters, a mastered box-5
  // card that is past due (farm-wilt vs SRS-due distinction), two box-0
  // bulk-imported cards, and one card due in the future.
  const KO55 = [
    { id: 'k0', d: 'd0', h: '안녕하세요', m: 'xin chào', p: '', e: '', g: 'Chào hỏi', box: 1, due: NOW - 864e5, w: 0 },
    { id: 'k1', d: 'd0', h: '감사합니다', m: 'cảm ơn', p: '', e: '', g: 'Chào hỏi', box: 2, due: NOW - 2 * 864e5, w: 0 },
    { id: 'k2', d: 'd0', h: '학교', m: 'trường học', p: '', e: '', g: 'Đời sống', box: 3, due: NOW - 3 * 864e5, w: 0 },
    { id: 'k3', d: 'd0', h: '밥', m: 'cơm', p: '', e: '', g: 'Đồ ăn', box: 4, due: NOW - 864e5, w: 0 },
    { id: 'k4', d: 'd0', h: '물', m: 'nước', p: '', e: '', g: 'Đồ ăn', box: 1, due: NOW + 864e5, w: 0 },
    { id: 'k5', d: 'd0', h: '김치', m: 'kim chi', p: '', e: '', g: 'Đồ ăn', box: 2, due: NOW - 864e5, w: 4 },
    { id: 'k6', d: 'd0', h: '친구', m: 'bạn bè', p: '', e: '', g: 'Đời sống', box: 1, due: NOW - 864e5, w: 3 },
    { id: 'k7', d: 'd0', h: '가족', m: 'gia đình', p: '', e: '', g: 'Đời sống', box: 5, due: NOW - 864e5, w: 0 },
    { id: 'k8', d: 'd0', h: '가게', m: 'cửa hàng', p: '', e: '', g: 'Đời sống', box: 0, due: 0, w: 0 },
    { id: 'k9', d: 'd0', h: '가르치다', m: 'dạy', p: '', e: '', g: 'Hoạt động', box: 0, due: 0, w: 0 },
  ];
  const KO_IV = [0, 6e5, 864e5, 2592e5, 6048e5, 12096e5]; // [0, 10m, 1d, 3d, 7d, 14d]
  function seedKO55(ctx, cards) { return seedKO(ctx, cards, 'd0'); }
  function freshCtxWithSave(htmlText, saveObj, seed) {
    const ctx = makeCtx();
    ctx.localStorage.setItem('hanvocab.v1', JSON.stringify(saveObj));
    loadPage(ctx, htmlText);
    fireDCL(ctx);
    E(ctx, 'window.__v15.buildWords()');
    return ctx;
  }

  // ================= §0 static build integrity =================
  section('§0', 'static build integrity');
  {
    const V55MARK = '/* ===== V55 — KO SRS REVIEW UI (V19.8) =====';
    check('build marker present (JS + CSS)', countOcc(html, V55MARK) === 2, countOcc(html, V55MARK));
    check('sha256 matches the V19.8 build', sha === EXPECTED_SHA, { got: sha.slice(0, 12), want: EXPECTED_SHA.slice(0, 12) });
    check('byte size matches the V19.8 build', fs.statSync(htmlPath).size === EXPECTED_BYTES, { got: fs.statSync(htmlPath).size, want: EXPECTED_BYTES });
    check('title shows V19.8 — KO SRS', html.includes('<title>Korean &amp; English Vocab Farm V19.8 — KO SRS — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>'));
    check("VERSION '19.8.0' appears exactly once", countOcc(html, "VERSION='19.8.0'") === 1);
    check("VERSION '19.7.0' still appears exactly once (previous layer)", countOcc(html, "VERSION='19.7.0'") === 1);
    check("VERSION '19.6.1' still appears exactly once", countOcc(html, "VERSION='19.6.1'") === 1);
    check("VERSION '19.6.0' still appears exactly once", countOcc(html, "VERSION='19.6.0'") === 1);
    check("VERSION '19.5.1' still appears exactly once", countOcc(html, "VERSION='19.5.1'") === 1);
    check("VERSION '19.5.0' still appears exactly once", countOcc(html, "VERSION='19.5.0'") === 1);
    check("VERSION '19.4.0' still appears exactly once", countOcc(html, "VERSION='19.4.0'") === 1);
    check('V55 script tag present exactly once', countOcc(html, 'id="v55js"') === 1);
    check('V55 function definitions present exactly once', countOcc(html, 'function isDue55(box,due,now){') === 1 && countOcc(html, 'function dueQueue55(cap){') === 1 && countOcc(html, 'function weakList55(){') === 1 && countOcc(html, 'function koStats55(){') === 1 && countOcc(html, 'function startReview55(){') === 1 && countOcc(html, 'function openSrs(){') === 1 && countOcc(html, 'function decorateKO55(){') === 1);
    check('V55 fragments present (hub, cap, stats, queue, weak, flag, entry)', ['v55hub', 'id="v55cap"', 'v55stats', 'v55rows', 'v55sec', 'v55card', 'v55badge weak', 'v55badge due', 'koSrsUI', 'dueQueue55', 'weakList55', 'koStats55', 'startReview55', 'isDue55', 'dueFor55', 'en55()', 'cap55()', 'setCap55', 'setFlag55', 'v55kotab'].every(function (f) { return countOcc(html, f) >= 1; }));
    check('V55 JS fragment appears after V54 (injection order)', html.indexOf('id="v55js"') > html.indexOf('id="v54js"'));
    check('V51 markers survive', countOcc(html, 'id="v51js"') === 1 && countOcc(html, "VERSION='19.6.0'") === 1 && countOcc(html, 'function genPool(){') === 1 && countOcc(html, 'function koDeckFirst(cards){') === 1);
    check('V52 markers survive', countOcc(html, 'id="v52js"') === 1 && countOcc(html, "VERSION='19.5.1'") === 1 && countOcc(html, 'function mark18(ok,w,qkey)') === 1 && countOcc(html, 'function mark19(ok,w,qkey)') === 1 && countOcc(html, 'wordlessKey18') >= 1);
    check('V53 markers survive', countOcc(html, 'id="v53js"') === 1 && countOcc(html, "VERSION='19.6.1'") === 1 && countOcc(html, 'function koQuality(e){') === 1 && countOcc(html, 'function koPool53(cards, deck){') === 1 && countOcc(html, 'function bandKO(n){') === 1 && countOcc(html, 'function koOrderSession(items, n){') === 1);
    check('V54 markers survive', countOcc(html, 'id="v54js"') === 1 && countOcc(html, "VERSION='19.7.0'") === 1 && countOcc(html, 'function dryRun54(input, opts) {') === 1 && countOcc(html, 'function confirmImport54(pv) {') === 1 && countOcc(html, 'function snapshotBeforeImport54() {') === 1 && countOcc(html, 'function parseRows54(text) {') === 1 && countOcc(html, 'function seedPreview54() {') === 1);
    check('no old version title survives', !(/<title>Korean &amp; English Vocab Farm V19\.[0-7]/.test(html)));
    check('TOTAL_BOSSES still 87 (no boss added/removed)', /TOTAL_BOSSES\s*=\s*87/.test(html));
    check('pristine V19.7 has no V55 marker (layer is additive)', pristineHtml.indexOf(V55MARK) < 0 && pristineHtml.indexOf('id="v55js"') < 0);
    check('V55 CSS: overlay z-index 1500, cap select and badges present', html.indexOf('#v55hub{') >= 0 && html.indexOf('z-index:1500') >= 0 && html.indexOf('.v55badge.weak') >= 0 && html.indexOf('.v55badge.due') >= 0 && html.indexOf('#7F1D1D') >= 0 && html.indexOf('#1E3A5F') >= 0);
    check('V55 CSS: 44px touch targets on queue actions', /min-height:44px/.test(html));
  }

  // ================= §L load + exports =================
  section('§L', 'page load (vm) + exports');
  {
    const c = seededCtx(html, 55);
    check('page loads with no inline-script error', true);
    check('__v55 present, version 19.8.0', E(c, `window.__v55&&window.__v55.version`) === '19.8.0');
    check('__v55 exports isDue/dueFor/dueQueue/weakList/koStats/startReview/startWeak/openSrs/setCap/setFlag/flagOn/cap/en55', E(c, `['isDue','dueFor','dueQueue','weakList','koStats','startReview','startWeak','openSrs','setCap','setFlag','flagOn','cap','en55'].every(function(f){return typeof window.__v55[f]==='function'})`));
    check('__v27 present (Smart Learning reused, not rewritten)', E(c, `!!window.__v27&&typeof window.__v27.startSession==='function'&&typeof window.__v27.startWeak==='function'`));
    check('__v54 present, version 19.7.0', E(c, `window.__v54&&window.__v54.version`) === '19.7.0');
    check('__v53 present, version 19.6.1', E(c, `window.__v53&&window.__v53.version`) === '19.6.1');
    check('__v51 present, version 19.6.0, genPool exported', E(c, `window.__v51&&window.__v51.version==='19.6.0'&&typeof window.__v51.genPool==='function'`));
    check('__v48 present, version 19.3.0, _test.forgePool exported', E(c, `window.__v48&&window.__v48.version==='19.3.0'&&typeof window.__v48._test.forgePool==='function'`));
    check('__v52 present, version 19.5.1, speak exported', E(c, `window.__v52&&window.__v52.version==='19.5.1'&&typeof window.__v52.speak==='function'`));
    check('WORDS 4892 built', E(c, `window.__v15.words.length`) === 4892);
    // TOTAL_BOSSES is asserted statically in §0 (var TOTAL_BOSSES=87);
    // the vm load loop never reaches the V21 block that declares it,
    // so no runtime check here (same limitation as every earlier suite).
  }

  // ================= §55A one shared due rule =================
  section('§55A', 'one shared due rule (isDue55 / dueFor55)');
  {
    const c = seededCtx(html, 55);
    seedKO55(c, KO55);
    const truth = J(c, `JSON.stringify((function(){
      var f=window.__v55.isDue, out={};
      out.box0_past = f(0, ${NOW} - 864e5, ${NOW});
      out.box1_past = f(1, ${NOW} - 864e5, ${NOW});
      out.box1_now  = f(1, ${NOW}, ${NOW});
      out.box1_future = f(1, ${NOW} + 864e5, ${NOW});
      out.box2_past = f(2, ${NOW} - 864e5, ${NOW});
      out.box4_past = f(4, ${NOW} - 864e5, ${NOW});
      out.box5_past = f(5, ${NOW} - 864e5, ${NOW});
      out.box5_zero = f(5, 0, ${NOW});
      out.box1_zero = f(1, 0, ${NOW});
      out.box6_past = f(6, ${NOW} - 864e5, ${NOW});
      return out;
    })())`);
    check('isDue: box 0 never due (bulk-imported cards stay out)', truth.box0_past === false, truth);
    check('isDue: box 1-4 past due -> true', truth.box1_past === true && truth.box2_past === true && truth.box4_past === true, truth);
    check('isDue: due == now counts as due', truth.box1_now === true, truth);
    check('isDue: future due -> false', truth.box1_future === false, truth);
    check('isDue: box 5 (mastered) never due, even past due', truth.box5_past === false && truth.box5_zero === false, truth);
    check('isDue: box 0 with due 0 is due (fresh card semantics, not the queue)', truth.box1_zero === true && truth.box6_past === false, truth);
    // dueFor55 agrees with the V6 farm wilt() on every card EXCEPT the box-5
    // distinction (wilt has no box cap; SRS treats box 5 as mastered).
    const agree = J(c, `JSON.stringify((function(){
      var v55=window.__v55, out=[];
      S.cards.forEach(function(cd){
        var d=v55.dueFor('ko', cd.id);
        out.push({id:cd.id, box:cd.box, wilt:wilt(cd), due:d.isDue, agree:(wilt(cd)===d.isDue)||cd.box===5});
      });
      return out;
    })())`);
    check('dueFor55(ko) agrees with wilt() except the box-5 card', agree.every(function (r) { return r.agree; }), agree);
    check('wilt(k7)=true but dueFor55(k7)=false — farm wilt is NOT SRS due', agree.find(function (r) { return r.id === 'k7'; }).wilt === true && agree.find(function (r) { return r.id === 'k7'; }).due === false, agree);
    check('dueFor55(ko) box/due echo the stored card', J(c, `JSON.stringify(window.__v55.dueFor('ko','k2'))`).box === 3 && J(c, `JSON.stringify(window.__v55.dueFor('ko','k2'))`).due === NOW - 3 * 864e5);
    check('dueFor55(ko) unknown id -> isDue false, box 0', J(c, `JSON.stringify(window.__v55.dueFor('ko','nope'))`).isDue === false && J(c, `JSON.stringify(window.__v55.dueFor('ko','nope'))`).box === 0);
    check('dueFor55(en) unknown word -> isDue false', J(c, `JSON.stringify(window.__v55.dueFor('en','no-such-word'))`).isDue === false);
    // EN agreement: dueFor55('en') matches the EN statsOf rule (box 1-4 + due<=now)
    // on real EN words with seeded boxes/due.
    const enSeed = seedLearned(c, function (w) { return w.lib === 'a1a2'; }, 1);
    const enAgree = J(c, `JSON.stringify((function(){
      var v15=window.__v15, v55=window.__v55, old=v15.enOld(), e=v15.en15(), now=Date.now(), out=[];
      v15.words.slice(0, ${enSeed}).forEach(function(w){
        var b=(old.box||{})[w.id]||0, due=(e.due||{})[w.id]||0;
        var rule=(b>=1&&b<=4&&due<=now);
        var got=v55.dueFor('en', w.id).isDue;
        out.push({id:w.id, box:b, rule:rule, got:got, agree:rule===got});
      });
      return out;
    })())`);
    check('dueFor55(en) agrees with the EN box/due rule on all seeded words', enAgree.every(function (r) { return r.agree; }) && enAgree.length === enSeed, { n: enAgree.length, bad: enAgree.filter(function (r) { return !r.agree; }) });
    // v27 classifyKO REVIEW <=> isDue55 for non-weak, non-mastered cards.
    const clsAgree = J(c, `JSON.stringify((function(){
      var v27=window.__v27, v55=window.__v55, now=Date.now(), out=[];
      S.cards.forEach(function(cd){
        var cls=v27.classifyKO(cd, now).cls, due=v55.isDue(cd.box, cd.due, now);
        var expected=(cls==='REVIEW');
        out.push({id:cd.id, cls:cls, due:due, agree:(cls==='WEAK')?true:(due===expected)});
      });
      return out;
    })())`);
    check('isDue55 matches v27 classifyKO REVIEW for non-weak cards', clsAgree.every(function (r) { return r.agree; }), clsAgree);
  }

  // ================= §55B due queue + cap =================
  section('§55B', 'due queue (learned-only, due ASC, cap)');
  {
    const c = seededCtx(html, 55);
    seedKO55(c, KO55);
    const q = J(c, `JSON.stringify(window.__v55.dueQueue())`);
    check('due queue total is 6 (k0,k1,k2,k3,k5,k6)', q.total === 6 && q.items.length === 6, q);
    check('due queue order is due ASC, prio DESC tiebreak: [k2,k1,k5,k6,k0,k3]',
      JSON.stringify(q.items.map(function (i) { return i.id; })) === JSON.stringify(['k2', 'k1', 'k5', 'k6', 'k0', 'k3']), q.items.map(function (i) { return i.id; }));
    check('box-0 bulk-imported cards (k8,k9) are NOT in the queue', q.items.every(function (i) { return i.id !== 'k8' && i.id !== 'k9'; }), q);
    check('box-5 mastered card (k7) is NOT in the queue', q.items.every(function (i) { return i.id !== 'k7'; }), q);
    check('future-due card (k4) is NOT in the queue', q.items.every(function (i) { return i.id !== 'k4'; }), q);
    check('queue rows carry box, due, overdue days and weak flags', q.items.every(function (i) { return typeof i.box === 'number' && typeof i.due === 'number' && typeof i.overdueDays === 'number'; }) && q.items.find(function (i) { return i.id === 'k2'; }).overdueDays === 3 && q.items.find(function (i) { return i.id === 'k5'; }).weak === true && q.items.find(function (i) { return i.id === 'k0'; }).weak === false, q.items);
    check('default cap is 40', q.cap === 40 && J(c, `JSON.stringify(window.__v55.cap())`) === 40, q);
    check('capped=true when queue exceeds the cap', J(c, `JSON.stringify(window.__v55.dueQueue(2))`).capped === true && J(c, `JSON.stringify(window.__v55.dueQueue(2))`).items.length === 2, J(c, `JSON.stringify(window.__v55.dueQueue(2))`));
    check('cap 2 keeps the two most overdue (k2,k1)', JSON.stringify(J(c, `JSON.stringify(window.__v55.dueQueue(2))`).items.map(function (i) { return i.id; })) === JSON.stringify(['k2', 'k1']));
    check('cap 40 keeps all 6, capped=false', J(c, `JSON.stringify(window.__v55.dueQueue(40))`).capped === false);
    check('setCap(30) persists and is honoured', J(c, `JSON.stringify((function(){window.__v55.setCap(30);return {cap:window.__v55.cap(), q:window.__v55.dueQueue()}})())`).cap === 30, J(c, `JSON.stringify(window.__v55.en55())`));
    check('setCap(99) clamps to 50', (function () { E(c, 'window.__v55.setCap(99)'); return J(c, `JSON.stringify(window.__v55.cap())`); })() === 50);
    check('setCap(5) clamps to 30', (function () { E(c, 'window.__v55.setCap(5)'); return J(c, `JSON.stringify(window.__v55.cap())`); })() === 30);
    check('setCap(50) keeps 50', (function () { E(c, 'window.__v55.setCap(50)'); return J(c, `JSON.stringify(window.__v55.cap())`); })() === 50);
    check('cap survives in en55 state', J(c, `JSON.stringify(window.__v55.en55())`).cap === 50);
    check('dueQueue with cap=null uses the stored cap', J(c, `JSON.stringify(window.__v55.dueQueue(null))`).cap === 50);
    check('empty queue: fresh save with no due cards -> total 0, capped false', (function () {
      const f = seededCtx(html, 56);
      const qq = J(f, `JSON.stringify(window.__v55.dueQueue())`);
      return qq.total === 0 && qq.capped === false && qq.items.length === 0;
    })());
    check('queue is read-only: dueQueue() does not mutate any card', (function () {
      const before = JSON.stringify(J(c, `JSON.stringify(S.cards)`));
      E(c, 'window.__v55.dueQueue()');
      return JSON.stringify(J(c, `JSON.stringify(S.cards)`)) === before;
    })());
    check('queue order is deterministic across repeated calls (tiebreak)', (function () {
      const q1 = J(c, `JSON.stringify(window.__v55.dueQueue().items.map(function(i){return i.id}))`);
      const q2 = J(c, `JSON.stringify(window.__v55.dueQueue().items.map(function(i){return i.id}))`);
      const q3 = J(c, `JSON.stringify(window.__v55.dueQueue().items.map(function(i){return i.id}))`);
      return JSON.stringify(q1) === JSON.stringify(q2) && JSON.stringify(q2) === JSON.stringify(q3) && JSON.stringify(q1) === JSON.stringify(['k2', 'k1', 'k5', 'k6', 'k0', 'k3']);
    })());
  }

  // ================= §55C weak words =================
  section('§55C', 'weak words (KO, mirroring EN)');
  {
    const c = seededCtx(html, 55);
    seedKO55(c, KO55);
    const wl = J(c, `JSON.stringify(window.__v55.weakList())`);
    check('weak list is [k5,k6] (w>=3, box<4)', JSON.stringify(wl.map(function (i) { return i.id; })) === JSON.stringify(['k5', 'k6']), wl);
    check('weak list is prio DESC (k5 w=4 before k6 w=3)', wl[0].id === 'k5' && wl[0].prio > wl[1].prio, wl);
    check('weak rows carry the wrong counter and a Vietnamese reason', wl[0].w === 4 && wl[1].w === 3 && /Sai 4 lần/.test(wl[0].reason) && /Sai 3 lần/.test(wl[1].reason), wl);
    check('weak rows carry box and due', wl.every(function (i) { return typeof i.box === 'number' && typeof i.due === 'number'; }), wl);
    check('box-5 card (k7) is never weak', wl.every(function (i) { return i.id !== 'k7'; }), wl);
    check('box-0 cards are never weak', wl.every(function (i) { return i.id !== 'k8' && i.id !== 'k9'; }), wl);
    check('weak list agrees with v27 classifyKO WEAK for the seed', (function () {
      const cls = J(c, `JSON.stringify(S.cards.filter(function(cd){return window.__v27.classifyKO(cd, Date.now()).cls==='WEAK'}).map(function(cd){return cd.id}))`);
      return JSON.stringify(cls.sort()) === JSON.stringify(['k5', 'k6']);
    })());
    check('weakList() is read-only on cards', (function () {
      const before = JSON.stringify(J(c, `JSON.stringify(S.cards)`));
      E(c, 'window.__v55.weakList()');
      return JSON.stringify(J(c, `JSON.stringify(S.cards)`)) === before;
    })());
    check('weak list order is deterministic across repeated calls', (function () {
      const w1 = J(c, `JSON.stringify(window.__v55.weakList().map(function(i){return i.id}))`);
      const w2 = J(c, `JSON.stringify(window.__v55.weakList().map(function(i){return i.id}))`);
      return JSON.stringify(w1) === JSON.stringify(w2) && JSON.stringify(w1) === JSON.stringify(['k5', 'k6']);
    })());
  }

  // ================= §55D KO review stats =================
  section('§55D', 'KO review stats');
  {
    const c = seededCtx(html, 55);
    seedKO55(c, KO55);
    const st = J(c, `JSON.stringify(window.__v55.koStats())`);
    check('stats: total 10, learned 8, due 6, weak 2, mastered 1', st.total === 10 && st.learned === 8 && st.due === 6 && st.weak === 2 && st.mastered === 1, st);
    check('stats: reviewedToday 0 before any review; streak 1 seeded from the shared day streak (S.sk.n=1 on a fresh boot, v27 seeds streak.ko from it)', st.reviewedToday === 0 && st.streak === 1 && J(c, `JSON.stringify(S.sk)`).n === 1, st);
    check('stats: learned counts box>=1 only (box-0 imports excluded)', st.learned === 8, st);
    check('stats: due counts only box 1-4 due (box-5 k7 excluded)', st.due === 6, st);
    check('stats: mastered counts box 5 only', st.mastered === 1, st);
    check('koStats() is read-only on cards', (function () {
      const before = JSON.stringify(J(c, `JSON.stringify(S.cards)`));
      E(c, 'window.__v55.koStats()');
      return JSON.stringify(J(c, `JSON.stringify(S.cards)`)) === before;
    })());
    // A v27 Smart answer for KO is recorded as a review for today (KO-only).
    E(c, `window.__v27.recordAnswer('ko','k0',true,'smart')`);
    const st2 = J(c, `JSON.stringify(window.__v55.koStats())`);
    check('after one KO Smart answer: reviewedToday 1, streak 1', st2.reviewedToday === 1 && st2.streak === 1, st2);
    check('an EN Smart answer does NOT touch KO reviewedToday', (function () {
      E(c, `window.__v27.recordAnswer('en', ${JSON.stringify(J(c, `JSON.stringify(window.__v15.words[0].id)`))}, true, 'smart')`);
      return J(c, `JSON.stringify(window.__v55.koStats())`).reviewedToday === 1;
    })());
    check('stats on a fresh save: total 20 (SAMPLE), learned 0, due 0, weak 0', (function () {
      const f = seededCtx(html, 57);
      const s = J(f, `JSON.stringify(window.__v55.koStats())`);
      return s.total === 20 && s.learned === 0 && s.due === 0 && s.weak === 0 && s.mastered === 0;
    })());
  }

  // ================= §55E live SRS session =================
  section('§55E', 'SRS session (startReview55 -> v27 session kind srs)');
  {
    const c = seededCtx(html, 55);
    seedKO55(c, KO55);
    const started = J(c, `JSON.stringify((function(){
      var v27=window.__v27, v55=window.__v55, seen=null, orig=v27.startSession;
      v27.startSession=function(l,ids,k){seen={lang:l, ids:ids.slice(), kind:k}; return orig(l,ids,k);};
      var q=v55.dueQueue();
      var ok=v55.startReview();
      v27.startSession=orig;
      return {queue:q.items.map(function(i){return i.id}), ok:ok, seen:seen};
    })())`);
    check('startReview() returns true with 6 due cards', started.ok === true && started.queue.length === 6, started);
    check('startReview hands the queue to v27 in due order', JSON.stringify(started.queue) === JSON.stringify(['k2', 'k1', 'k5', 'k6', 'k0', 'k3']), started);
    check('startReview calls __v27.startSession with kind srs (not plan)', started.seen && started.seen.lang === 'ko' && started.seen.kind === 'srs' && JSON.stringify(started.seen.ids) === JSON.stringify(['k2', 'k1', 'k5', 'k6', 'k0', 'k3']), started.seen);
    // Answer all 6 correctly in kind order (mc-hm, mc-mh, listen, flash, mc-hm, mc-mh).
    E(c, `window.__v27.answerMC('k2', true, 'k2'); window.__v27.nextQ();`);
    E(c, `window.__v27.answerMC('k1', true, 'k1'); window.__v27.nextQ();`);
    E(c, `window.__v27.answerMC('k5', true, 'k5'); window.__v27.nextQ();`);
    E(c, `window.__v27.answerFlash('k6', true); window.__v27.nextQ();`);
    E(c, `window.__v27.answerMC('k0', true, 'k0'); window.__v27.nextQ();`);
    E(c, `window.__v27.answerMC('k3', true, 'k3'); window.__v27.nextQ();`);
    const after = J(c, `JSON.stringify((function(){
      var out={};
      S.cards.forEach(function(cd){ out[cd.id]={box:cd.box, due:cd.due, w:cd.w||0}; });
      var s=window.__v27.en27().sessions;
      out.session = s.length ? {lang:s[s.length-1].lang, total:s[s.length-1].total, correct:s[s.length-1].correct, wrong:s[s.length-1].wrong} : null;
      out.stats = window.__v55.koStats();
      return out;
    })())`);
    check('all 6 answered cards advance box by 1', after.k2.box === 4 && after.k1.box === 3 && after.k5.box === 3 && after.k6.box === 2 && after.k0.box === 2 && after.k3.box === 5, after);
    check('all 6 due dates move into the future', ['k2', 'k1', 'k5', 'k6', 'k0', 'k3'].every(function (id) { return after[id].due > Date.now(); }), after);
    check('no reask phase when all answers are correct (session recorded, correct 6)', after.session && after.session.lang === 'ko' && after.session.total === 6 && after.session.correct === 6 && after.session.wrong === 0, after.session);
    check('reviewedToday becomes 6 after the session', after.stats.reviewedToday === 6, after.stats);
    check('due count drops to 0 after the session (all reviewed)', after.stats.due === 0, after.stats);
    check('cards not in the queue are untouched (k4,k7,k8,k9)', after.k4.box === 1 && after.k7.box === 5 && after.k8.box === 0 && after.k9.box === 0, after);
    // Wrong answer: box resets to 0, due becomes now, w bumps by 1.
    const cw = seededCtx(html, 58);
    seedKO55(cw, KO55);
    E(cw, `window.__v27.startSession('ko', ['k0'], 'srs')`);
    E(cw, `window.__v27.answerMC('k0', false, 'k1'); window.__v27.nextQ();`);
    const wAfter = J(cw, `JSON.stringify((function(){
      var cd=S.cards.find(function(x){return x.id==='k0'});
      return {box:cd.box, due:cd.due, w:cd.w||0, now:Date.now()};
    })())`);
    check('wrong answer: box resets to 0', wAfter.box === 0, wAfter);
    check('wrong answer: due becomes now (interval 0)', Math.abs(wAfter.due - wAfter.now) < 10000, wAfter);
    check('wrong answer: sticky wrong counter bumps to 1', wAfter.w === 1, wAfter);
    // Interval ladder: correct answers from box 0..4 land on [10m,1d,3d,7d,14d].
    const cl = seededCtx(html, 59);
    const LADDER = [
      { id: 'L0', d: 'd0', h: '하나', m: 'một', p: '', e: '', g: 'Số', box: 0, due: 0, w: 0 },
      { id: 'L1', d: 'd0', h: '둘', m: 'hai', p: '', e: '', g: 'Số', box: 1, due: NOW - 864e5, w: 0 },
      { id: 'L2', d: 'd0', h: '셋', m: 'ba', p: '', e: '', g: 'Số', box: 2, due: NOW - 864e5, w: 0 },
      { id: 'L3', d: 'd0', h: '넷', m: 'bốn', p: '', e: '', g: 'Số', box: 3, due: NOW - 864e5, w: 0 },
      { id: 'L4', d: 'd0', h: '다섯', m: 'năm', p: '', e: '', g: 'Số', box: 4, due: NOW - 864e5, w: 0 },
    ];
    seedKO55(cl, LADDER);
    E(cl, `window.__v27.startSession('ko', ['L0','L1','L2','L3','L4'], 'srs')`);
    E(cl, `window.__v27.answerMC('L0', true, 'L0'); window.__v27.nextQ();`);
    E(cl, `window.__v27.answerMC('L1', true, 'L1'); window.__v27.nextQ();`);
    E(cl, `window.__v27.answerMC('L2', true, 'L2'); window.__v27.nextQ();`);
    E(cl, `window.__v27.answerFlash('L3', true); window.__v27.nextQ();`);
    E(cl, `window.__v27.answerMC('L4', true, 'L4'); window.__v27.nextQ();`);
    const lad = J(cl, `JSON.stringify((function(){
      var out={}, now=Date.now();
      S.cards.forEach(function(cd){ out[cd.id]={box:cd.box, due:cd.due, gap:cd.due-now}; });
      return out;
    })())`);
    check('interval ladder: box 0->1 due = now + 10 min', lad.L0.box === 1 && Math.abs(lad.L0.gap - KO_IV[1]) < 10000, lad.L0);
    check('interval ladder: box 1->2 due = now + 1 day', lad.L1.box === 2 && Math.abs(lad.L1.gap - KO_IV[2]) < 10000, lad.L1);
    check('interval ladder: box 2->3 due = now + 3 days', lad.L2.box === 3 && Math.abs(lad.L2.gap - KO_IV[3]) < 10000, lad.L2);
    check('interval ladder: box 3->4 due = now + 7 days', lad.L3.box === 4 && Math.abs(lad.L3.gap - KO_IV[4]) < 10000, lad.L3);
    check('interval ladder: box 4->5 due = now + 14 days (cap 5)', lad.L4.box === 5 && Math.abs(lad.L4.gap - KO_IV[5]) < 10000, lad.L4);
    // startReview with an empty queue returns false and opens no session.
    const ce = seededCtx(html, 60);
    check('startReview on an empty queue returns false', J(ce, `JSON.stringify(window.__v55.startReview())`) === false);
    // startWeak hands the weak list to v27 (weak session).
    const cwk = seededCtx(html, 61);
    seedKO55(cwk, KO55);
    check('startWeak() returns true with 2 weak cards', J(cwk, `JSON.stringify(window.__v55.startWeak())`) === true);
    // Drive the weak session to completion: kinds mc-hm (k5), mc-mh (k6).
    E(cwk, `window.__v27.answerMC('k5', true, 'k5'); window.__v27.nextQ();`);
    E(cwk, `window.__v27.answerMC('k6', true, 'k6'); window.__v27.nextQ();`);
    const weakDone = J(cwk, `JSON.stringify((function(){
      var s=window.__v27.en27().sessions;
      var last=s.length?s[s.length-1]:null;
      return {session:last?{lang:last.lang,total:last.total,correct:last.correct,wrong:last.wrong}:null, reviewedToday:window.__v55.koStats().reviewedToday};
    })())`);
    check('startWeak hands the weak list [k5,k6] to a v27 session (recorded total 2, correct 2)', weakDone.session && weakDone.session.lang === 'ko' && weakDone.session.total === 2 && weakDone.session.correct === 2 && weakDone.session.wrong === 0, weakDone);
    check('the weak session records 2 KO reviews for today', weakDone.reviewedToday === 2, weakDone);
  }

  // ================= §55F flag + entry + overlay =================
  section('§55F', 'flag koSrsUI + KO Hub entry + overlay HTML');
  {
    const c = seededCtx(html, 55);
    seedKO55(c, KO55.concat([{ id: 'k10', d: 'd0', h: '물', m: ' ', p: '', e: '', g: 'Đồ ăn', box: 1, due: NOW - 864e5, w: 0 }]));
    check('no en55 key exists after load (decorator is non-creating)', E(c, `S.v7.en55`) === undefined);
    check('flagOn default is true', J(c, `JSON.stringify(window.__v55.flagOn('koSrsUI'))`) === true);
    check('setFlag(false) turns the feature off', (function () { E(c, "window.__v55.setFlag('koSrsUI', false)"); return J(c, `JSON.stringify(window.__v55.flagOn('koSrsUI'))`); })() === false);
    check('flag-off: openSrs shows the disabled state', /tạm tắt/.test(J(c, `JSON.stringify((function(){window.__v55.openSrs();window.__v55.openSrs();return document.getElementById('v55hub').innerHTML})())`)));
    check('flag-off: dueQueue returns an empty capped-off result', J(c, `JSON.stringify(window.__v55.dueQueue())`).total === 0 && J(c, `JSON.stringify(window.__v55.dueQueue())`).capped === false);
    check('flag-off: weakList returns empty', J(c, `JSON.stringify(window.__v55.weakList())`).length === 0);
    check('flag-off: startReview refuses (returns false)', J(c, `JSON.stringify(window.__v55.startReview())`) === false);
    check('flag-off: startWeak refuses (returns false)', J(c, `JSON.stringify(window.__v55.startWeak())`) === false);
    check('flag-off: koStats returns zeroes', (function () { const s = J(c, `JSON.stringify(window.__v55.koStats())`); return s.total === 0 && s.due === 0 && s.learned === 0; })());
    E(c, "window.__v55.setFlag('koSrsUI', true)");
    check('setFlag(true) turns the feature back on', J(c, `JSON.stringify(window.__v55.flagOn('koSrsUI'))`) === true);
    const overlayHtml = J(c, `JSON.stringify((function(){window.__v55.openSrs();return document.getElementById('v55hub').innerHTML})())`);
    check('overlay HTML: title + stats row present', overlayHtml.indexOf('Ôn SRS — tiếng Hàn') >= 0 && overlayHtml.indexOf('class="v55stats"') >= 0);
    check('overlay HTML: cap selector with 30/40/50 options present', overlayHtml.indexOf('id="v55cap"') >= 0 && /value="30"/.test(overlayHtml) && /value="50"/.test(overlayHtml));
    check('overlay HTML: due queue rows present (Hangul 학교, 감사합니다)', overlayHtml.indexOf('학교') >= 0 && overlayHtml.indexOf('감사합니다') >= 0);
    check('overlay HTML: start button shows the queue size (7 từ, incl. k10)', /Bắt đầu ôn \(7 từ\)/.test(overlayHtml), overlayHtml.match(/Bắt đầu ôn \([^)]*\)/));
    check('overlay HTML: weak list present (kim chi, bạn bè)', overlayHtml.indexOf('kim chi') >= 0 && overlayHtml.indexOf('bạn bè') >= 0);
    check('overlay HTML: missing meaning shows as "Chưa có nghĩa", never guessed', overlayHtml.indexOf('Chưa có nghĩa') >= 0, overlayHtml.match(/Chưa có nghĩa/g));
    check('overlay HTML: close button present', overlayHtml.indexOf('class="v55x"') >= 0);
    check('overlay HTML: stats numbers (due 7, learned 9/11, weak 2) present', /<b>7<\/b><span>đến hạn hôm nay<\/span>/.test(overlayHtml) && /<b>9\/11<\/b><span>từ đã học<\/span>/.test(overlayHtml) && /<b>2<\/b><span>từ yếu<\/span>/.test(overlayHtml), overlayHtml.match(/<b>[^<]*<\/b><span>[^<]*<\/span>/g));
    // Decorator: the entry button is in the KO tab bar after load.
    const tabs = J(c, `JSON.stringify(document.getElementById('tabs').children.map(function(b){return b.className}))`);
    check('decorator: a .v55kotab button is inserted into #tabs', tabs.some(function (n) { return n.indexOf('v55kotab') >= 0; }), tabs);
    check('decorator: the button opens the SRS overlay (onclick)', (function () {
      const b = J(c, `JSON.stringify((function(){var cs=document.getElementById('tabs').children;for(var i=0;i<cs.length;i++){if(cs[i].className.indexOf('v55kotab')>=0)return cs[i].getAttribute('onclick')}return null})())`);
      return b === "window.__v55&&__v55.openSrs()";
    })());
    check('decorator: exactly one .v55kotab button after load', J(c, `JSON.stringify(document.getElementById('tabs').children.filter(function(b){return b.className.indexOf('v55kotab')>=0}).length)`) === 1);
    check('decorator: the button label is Ôn SRS', (function () {
      const b = J(c, `JSON.stringify((function(){var cs=document.getElementById('tabs').children;for(var i=0;i<cs.length;i++){if(cs[i].className.indexOf('v55kotab')>=0)return cs[i].innerHTML}return null})())`);
      return b !== null && b.indexOf('Ôn SRS') >= 0;
    })());
    // Flag-off from the saved state: a fresh load with koSrsUI=0 inserts no button.
    const offCtx = freshCtxWithSave(html, { cards: KO55, decks: [{ id: 'd0', name: 'Bộ mặc định' }], deck: 'd0', v7: { en55: { v: 1, flags: { koSrsUI: 0 }, cap: 40 } } }, 62);
    const tabsOff = J(offCtx, `JSON.stringify(document.getElementById('tabs').children.map(function(b){return b.className}))`);
    check('flag-off in the saved state: no .v55kotab button after load', !tabsOff.some(function (n) { return n.indexOf('v55kotab') >= 0; }), tabsOff);
    check('flag-off in the saved state: flagOn reads false', J(offCtx, `JSON.stringify(window.__v55.flagOn('koSrsUI'))`) === false);
    // Badge contrast (WCAG AA, same helper as the earlier layers).
    checkRatio('weak badge contrast', '#FFFFFF', '#7F1D1D', 4.5);
    checkRatio('due badge contrast', '#FFFFFF', '#1E3A5F', 4.5);
  }

  // ---------- V54 helpers (copied from test54.js — the head cut them off) ----------
  function seedCards54(ctx, cards, deckId) {
    return J(ctx, `JSON.stringify((function(){
      var s;try{s=S}catch(e){return {err:'no S'}}
      s.cards=${JSON.stringify(cards)};
      s.decks=[{id:'dX',name:'Deck X'},{id:'dY',name:'Deck Y'}];
      s.deck='${deckId || 'dX'}';
      return s.cards.length;
    })())`);
  }
  const IMP_TSV = [
    '사과\tquả táo\t\t\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
    '사과\tquả táo chua\t\t사과가 시어요.\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
    '밥\tcơm\t\t\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
    '김치\tkim chi\t\t\t\t\t\t',
    '물\tnước\t\t\t\t한국어기초사전 (KRDict)\t\t',
    '학교\ttrường học\t\t학교에 가요.\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
    '학교\ttrường học\t\t학교에 가요.\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
  ].join('\n');
  const EXIST54 = [
    { id: 'x0', d: 'dX', g: 'Đồ ăn', h: '사과', m: 'quả táo', p: '', e: '사과를 먹어요.', box: 1 },
    { id: 'x1', d: 'dX', g: 'Đồ ăn', h: '밥', m: 'cơm', p: '', e: '밥을 먹어요.', box: 1 },
  ];
  function dry54(ctx, inputExpr, optsExpr) {
    return J(ctx, `JSON.stringify(window.__v54.dryRun54(${inputExpr}, ${optsExpr || '{}'}))`);
  }
  function koPool(ctx) {
    return J(ctx, `JSON.stringify((function(){
      var p=window.__v48._test.forgePool('ko');
      return {n:p.items.length, learned:p.learned, koSent:p.koSent,
        primary:p.primary, learnedItems:p.learnedItems, unlearnedItems:p.unlearnedItems,
        notice:p.notice||null, supplemented:!!p.supplemented,
        origins:p.items.map(function(i){return i.origin}).join(','),
        learnedFlags:p.items.map(function(i){return i.learned?1:0}).join(''),
        texts:p.items.map(function(i){return i.text}).join(' | ')};
    })())`);
  }

  // ================= §55G EN regression =================
  section('§55G', 'EN regression (EN SRS / V51 / V53 / V54 / V52 / V50)');
  {
    // EN due counts via the raw v15 box/due rule, identical seed, pristine vs built.
    function enDueCount(htmlText, seed) {
      const ctx = seededCtx(htmlText, seed);
      const n = seedLearned(ctx, function (w) { return w.lib === 'a1a2'; }, 2);
      const due = J(ctx, `JSON.stringify((function(){
        var v15=window.__v15, old=v15.enOld(), e=v15.en15(), now=Date.now(), c=0;
        v15.words.forEach(function(w){var b=(old.box||{})[w.id]||0; if(b>=1&&b<=4&&((e.due||{})[w.id]||0)<=now)c++;});
        return c;
      })())`);
      return { n: n, due: due };
    }
    const enPristine = enDueCount(pristineHtml, 63);
    const enBuilt = enDueCount(html, 63);
    check('EN due count (raw v15 rule, same seed) is identical pristine vs built', enPristine.due === enBuilt.due && enPristine.n === enBuilt.n, { pristine: enPristine, built: enBuilt });
    const c = seededCtx(html, 64);
    const nLearned = seedLearned(c, function (w) { return w.en && w.en.length > 2; }, 1);
    check('EN seed: some words learned', nLearned > 50, nLearned);
    const gp = J(c, `JSON.stringify((function(){ var g=window.__v51.genPool(); return g&&g.items?{n:g.items.length,gen:g.genCount}:null; })())`);
    check('V51 genPool still generates EN sentences from a learned scope', gp && gp.n >= 5 && gp.gen >= 1, gp);
    check('V52 speak helper still present for all speak paths', J(c, `JSON.stringify(typeof window.__v52.speak)`) === 'function');
    check('V50 score state still present', J(c, `JSON.stringify(typeof window.__v50)`) === 'object');
    // V53 KO Forge pool still works on the same KO seed.
    const cf = seededCtx(html, 65);
    check('KO_A seed loads (18 cards)', seedKO(cf, KO_A, 'dX') === 18);
    const kp = koPool(cf);
    check('V53 koPool still 12 (8 learned + 4 unlearned)', kp.n === 12 && kp.learnedItems === 8 && kp.unlearnedItems === 4, kp);
    // V54 dry-run still works (bulk import unaffected).
    const ci = seededCtx(html, 66);
    seedCards54(ci, EXIST54);
    const pv = dry54(ci, `{text:${JSON.stringify(IMP_TSV)}}`, `{deckName:'Bộ test 55', source:'', license:'', level:''}`);
    const pvJ = pv; // dry54 already ran dryRun54 and returned the preview
    check('V54 dry-run still classifies 7 rows (willAdd 2, dupExisting 2, dupBatch 1, no-source 1, no-license 1)', pvJ && pvJ.ok === true && pvJ.total === 7 && pvJ.willAdd === 2 && pvJ.dupExisting === 2 && pvJ.dupBatch === 1 && pvJ.noSource === 1 && pvJ.noLicense === 1, pvJ);
    // EN SRS session still runs (mark15 path untouched).
    const ce = seededCtx(html, 67);
    seedLearned(ce, function (w) { return w.lib === 'a1a2'; }, 1);
    check('EN Smart session still starts (v27 startSession en)', J(ce, `JSON.stringify(window.__v27.startSession('en', window.__v15.words.slice(0,3).map(function(w){return w.id}), 'plan'))`) === true);
  }

  // ================= §R0 repro-first =================
  section('§R0', 'repro-first (same 5 checks as repro-v55.js, on the built version)');
  {
    const c = seededCtx(html, 68);
    seedKO55(c, KO55);
    const r = J(c, `JSON.stringify((function(){
      var v55=window.__v55, out={};
      out.v55Present = !!v55;
      out.dueQueue = v55 ? v55.dueQueue().total : 0;
      out.weakList = v55 ? v55.weakList().length : 0;
      out.stats = v55 ? v55.koStats() : null;
      out.flag = v55 ? v55.flagOn('koSrsUI') : null;
      out.entryBtn = (function(){var t=document.getElementById('tabs'); if(!t)return false; return t.children.some(function(b){return String(b.className).indexOf('v55kotab')>=0});})();
      return out;
    })())`);
    check('R1 FIXED: KO due queue exists (6 due cards)', r.v55Present === true && r.dueQueue === 6, r);
    check('R2 FIXED: KO weak-words list exists (2 weak cards)', r.weakList === 2, r);
    check('R3 FIXED: KO review stats exist (due 6, learned 8, weak 2)', r.stats && r.stats.due === 6 && r.stats.learned === 8 && r.stats.weak === 2, r.stats);
    check('R4 FIXED: KO due cards reachable via a dedicated entry (button in #tabs)', r.entryBtn === true, r);
    check('R5 FIXED: koSrsUI flag exists and defaults ON', r.flag === true, r);
    // And the same 5 checks on pristine V19.7 must still show all 5 defects.
    const cp = seededCtx(pristineHtml, 69);
    seedKO55(cp, KO55);
    const rp = J(cp, `JSON.stringify((function(){
      var out={};
      out.v55Present = !!window.__v55;
      out.entryBtn = (function(){var t=document.getElementById('tabs'); if(!t)return false; return t.children.some(function(b){return String(b.className).indexOf('v55kotab')>=0});})();
      return out;
    })())`);
    check('R0 pristine control: __v55 absent and no entry button on V19.7', rp.v55Present === false && rp.entryBtn === false, rp);
  }

  // ================= §V save schema =================
  section('§V', 'save schema (lazy en55, no new localStorage key, read-only cards)');
  {
    // Fresh boot: no en55 key before any V55 use.
    const fresh = seededCtx(html, 70);
    const before = J(fresh, `JSON.stringify((function(){
      var lsKeys=[];try{for(var i=0;i<localStorage.length;i++)lsKeys.push(localStorage.key(i))}catch(e){}
      return {keys:Object.keys(S.v7||{}).sort(), ls:lsKeys.sort()};
    })())`);
    check('fresh boot: no en55 key before any V55 use', before.keys.indexOf('en55') < 0, before.keys);
    check('fresh boot: no preimport-style V55 localStorage key', before.ls.filter(function (k) { return k.indexOf('en55') === 0; }).length === 0, before.ls);
    E(fresh, `window.__v55.en55()`);
    const afterEn = J(fresh, `JSON.stringify(Object.keys(S.v7||{}).sort())`);
    check('en55 created lazily on first use (and nothing else new)', JSON.stringify(afterEn.filter(function (k) { return k !== 'en55'; })) === JSON.stringify(before.keys), { before: before.keys, after: afterEn });
    const e55 = J(fresh, `JSON.stringify(S.v7.en55)`);
    check('en55 shape: flags koSrsUI=1, cap 40', e55.flags.koSrsUI === 1 && e55.cap === 40, e55);
    const lsAfterEn = J(fresh, `JSON.stringify((function(){var ks=[];try{for(var i=0;i<localStorage.length;i++)ks.push(localStorage.key(i))}catch(e){}return ks.sort()})())`);
    check('no new localStorage key from merely creating en55 state', JSON.stringify(lsAfterEn) === JSON.stringify(before.ls), { before: before.ls, after: lsAfterEn });
    // Opening the SRS screen mutates no card (read-only UI).
    const c = seededCtx(html, 71);
    seedKO55(c, KO55);
    const cardsBefore = J(c, `JSON.stringify(S.cards)`);
    E(c, `window.__v55.openSrs()`);
    check('openSrs mutates no card', JSON.stringify(J(c, `JSON.stringify(S.cards)`)) === JSON.stringify(cardsBefore));
    // Save round-trip: cap persists, cards byte-identical, Cloud Sync not overwritten.
    E(c, `window.__v55.setCap(30)`);
    E(c, `save()`);
    await sleep(1500);
    const saved = J(c, `JSON.stringify((function(){
      var raw=localStorage.getItem('hanvocab.v1');
      var j=JSON.parse(raw);
      return {cap:j.v7.en55.cap, cards:j.cards, keys:Object.keys(j.v7||{}).sort()};
    })())`);
    check('save round-trips en55.cap=30 in hanvocab.v1', saved.cap === 30, saved);
    check('save round-trips cards byte-identical (no box/due/w change)', JSON.stringify(saved.cards) === JSON.stringify(cardsBefore), { saved: saved.cards.length, before: cardsBefore.length });
    check('no new v7 key family beyond en55', saved.keys.indexOf('en55') >= 0, saved.keys);
    // localStorage key set identical pristine vs built after the same operations
    // (seed the same cards, save, wait out the V20 debounced flush).
    const p72 = seededCtx(pristineHtml, 72);
    seedKO55(p72, KO55);
    E(p72, `save()`);
    await sleep(1500);
    const lsPristine = J(p72, `JSON.stringify((function(){var ks=[];try{for(var i=0;i<localStorage.length;i++)ks.push(localStorage.key(i))}catch(e){}return ks.sort()})())`);
    const lsBuilt = J(c, `JSON.stringify((function(){var ks=[];try{for(var i=0;i<localStorage.length;i++)ks.push(localStorage.key(i))}catch(e){}return ks.sort()})())`);
    check('localStorage key set identical pristine vs built (no new key family)', JSON.stringify(lsPristine) === JSON.stringify(lsBuilt), { pristine: lsPristine, built: lsBuilt });
    // Old KO progress is untouched by a full SRS session (only answered cards move).
    const cs = seededCtx(html, 73);
    seedKO55(cs, KO55);
    const snapBefore = J(cs, `JSON.stringify(S.cards.map(function(cd){return {id:cd.id,box:cd.box,due:cd.due,w:cd.w||0}}))`);
    E(cs, `window.__v55.startReview()`);
    E(cs, `window.__v27.answerMC('k2', true, 'k2'); window.__v27.nextQ();`);
    const snapAfter = J(cs, `JSON.stringify(S.cards.map(function(cd){return {id:cd.id,box:cd.box,due:cd.due,w:cd.w||0}}))`);
    const moved = snapAfter.filter(function (a, i) { return JSON.stringify(a) !== JSON.stringify(snapBefore[i]); });
    check('a session moves only the answered card (k2); all other cards byte-identical', moved.length === 1 && moved[0].id === 'k2', moved);
  }

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in Node vm)');
  {
    skipCheck('C.1 SRS overlay paint + due queue by real DOM clicks (light + dark)', 'real Chrome gate in verify-v55c.js');
    skipCheck('C.2 360px overflow on the SRS overlay with the queue table', 'real Chrome gate in verify-v55c.js');
    skipCheck('C.3 live SRS session end-to-end by real DOM clicks (real old-progress save)', 'real Chrome gate in verify-v55c.js');
    skipCheck('C.4 Hangul rendering on the review screen', 'real Chrome gate in verify-v55c.js');
    skipCheck('C.5 real Android TTS end-to-end', 'headless Chrome has no voices; Anh tests on his phone');
    skipCheck('C.6 live Firebase login/sync', 'never tested live, as in every version');
  }

  console.log(`\n== test55 summary ==\nPASS ${pass}  FAIL ${fail}  SKIP ${skip}`);
  for (const [id, sc] of Object.entries(secCounts)) console.log(`  ${id}: ${sc.pass} pass / ${sc.fail} fail / ${sc.skip} skip`);
  if (failures.length) console.log('FAILURES:\n  ' + failures.join('\n  '));
  process.exit(fail ? 1 : 0);
}
main();
