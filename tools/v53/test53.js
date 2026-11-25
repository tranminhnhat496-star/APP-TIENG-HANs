// test53.js - V19.6.1 (layer V53) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v48/test48.js via tools/v51/test51.js;
// only the EXPECTED_SHA / EXPECTED_BYTES constants and the
// V53-specific sections are new.
// Usage: node tools/v53/test53.js [DIR]   (default: <root>/out; pass the
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
const EXPECTED_SHA = 'aa865a5dde58f6844800d6c1ff798b8fca1a0c2531e671ee6a6771ea42063484';
const EXPECTED_BYTES = 2569819;
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
//   section 0 static build integrity (hash, title, markers, V51
//         fragments with exact counts, V48/V49 fragments survive,
//         OLD V51 fragments gone, TOTAL_BOSSES 87, Oxford 3395,
//         A1-A2 998)
//   section L page load (vm, real inline scripts) + __v51/__v48/
//         __v49 exports
//   section 51A generator core (unit tests on synthetic words):
//         lvTier mapping, extendEx per level (A1 as-is, A2 time/
//         place, B1 because, B2 which), no-duplication, '!'/'?'
//         never extended, templateFor n/v/adj per level,
//         determinism, denylists (VDENY/ADENY), multi-word /
//         capital / other-POS skipped, genItem shape
//   section 51B scope wiring: genPool draws from the ACTIVE scope
//         (a1a2 education, oxford lesson 12, chrono time), no-
//         scope pool is all learned words, bank fill to 5 when
//         <5 generatable, flag off restores the exact 40-bank pool
//   section 51C sessions: full 5-sentence generated session
//         through tap/check/next, scoring tokens x tier, XP
//         channel (+2 per correct + one +10 bonus = +20, never
//         stacked), wrong answer pays 0 and resets the streak
//   section 51D Forge KO deck preference: selected deck first,
//         no deck = insertion order, small deck = preference not
//         restriction, KO items are verbatim card.e
//   section 51E no invented data: every generated item traces to
//         its word record (vi/ipa exact, word or stem in text or
//         ex-linked), tokens >=3, tokens rejoin to text exactly
//         (v48 convention: text has no trailing punctuation), no
//         double spaces
//   section 51F regression: kill-switch round-trip, Bounty 4+4,
//         Dojo entry points, V49 speakErrMsg, flag-off bank
//         session XP math identical to V19.5.1
//   section V save schema (en48.flags gains forgeAuto:1 on fresh
//         boot, default ON for pre-existing saves via flagOn,
//         no new localStorage key, no new top-level S.v7 key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint); the
// painted Forge overlay, the real click + answer states, the
// 360px overflow check, the .v51gen contrast and the per-question
// screens are Chrome gates in verify-v51c.js, not asserted here;
// live-browser, real-phone and live-Firebase gates stay
// Chrome/Anh-only.

async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v51.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const pristinePath = path.join(ROOT, 'tools', 'v51', 'backup-v19.5.1', 'out', 'index.html');
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

  // ================= §0 static build integrity =================
  section('§0', 'static build integrity');
  {
    check('index.html sha256 matches the V19.6.1 build', sha === EXPECTED_SHA, sha.slice(0, 12));
    check('index.html bytes match', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
    check('title is V19.6.1 KO Forge', html.includes("<title>Korean &amp; English Vocab Farm V19.6.1 — KO Forge — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"));
    check('V19.6 title gone', !html.includes('V19.6 — Sentence Forge Auto'));
    const styleIds = [...html.matchAll(/<style id="(v\d+)"/g)].map(m => m[1]);
    const scriptIds = [...html.matchAll(/<script id="(v\d+)js"/g)].map(m => m[1]);
    check('v53 style is LAST, v53js is LAST (after v52js)', styleIds[styleIds.length - 1] === 'v53' && scriptIds[scriptIds.length - 1] === 'v53' && scriptIds[scriptIds.length - 2] === 'v52', { styleIds: styleIds.slice(-3), scriptIds: scriptIds.slice(-3) });
    check('v53 markers present exactly once', countOcc(html, 'id="v53"') === 1 && countOcc(html, 'id="v53js"') === 1 && countOcc(html, "window.__v53={") === 1 && countOcc(html, "VERSION='19.6.1'") === 1);
    check('V53 function definitions present exactly once', countOcc(html, 'function koQuality(e){') === 1 && countOcc(html, 'function koPool53(cards, deck){') === 1 && countOcc(html, 'function bandKO(n){') === 1 && countOcc(html, 'function koOrderSession(items, n){') === 1);
    check('.v53new CSS rule once + badge in the Forge card once', countOcc(html, '.v53new') === 1 && countOcc(html, 'class="v53new"') === 1);
    check('v53note mentions >= 3 (intro + Q1 + end screen)', countOcc(html, 'v53note') >= 3, countOcc(html, 'v53note'));
    check('OLD V53 fragment gone (old session draw)', !html.includes("  var items=shuffle(g.pool.items).slice(0,FORGE_SESSION_N);\n  FS={lang:lang,list:items,i:0,built:[],used:{},right:0,streak:0,score:0,checked:false,ok:null,sessionId:'f'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36),done:false,bonusPaid:0};"));
    check('V48 markers survive', countOcc(html, 'id="v48js"') === 1 && countOcc(html, "VERSION='19.3.0'") === 1 && countOcc(html, 'window.__v48={') === 1);
    check('V49 markers survive', countOcc(html, 'id="v49js"') === 1 && countOcc(html, "VERSION='19.4.0'") === 1 && countOcc(html, 'function speakErrMsg(code){') === 1 && countOcc(html, 'speakErrMsg') === 15);
    check('V50 markers survive', countOcc(html, 'id="v50js"') === 1 && countOcc(html, "VERSION='19.5.0'") === 1 && countOcc(html, '_speakSeq50') >= 2 && countOcc(html, 'scoreTotal') >= 2);
    check('V51 markers survive', countOcc(html, 'id="v51js"') === 1 && countOcc(html, "VERSION='19.6.0'") === 1 && countOcc(html, 'function genPool(){') === 1 && countOcc(html, 'function koDeckFirst(cards){') === 1);
    check('V52 markers survive', countOcc(html, 'id="v52js"') === 1 && countOcc(html, "VERSION='19.5.1'") === 1 && countOcc(html, 'function mark18(ok,w,qkey)') === 1 && countOcc(html, 'function mark19(ok,w,qkey)') === 1 && countOcc(html, 'wordlessKey18') >= 1);
    check('TOTAL_BOSSES still 87', countOcc(html, 'var TOTAL_BOSSES=87;') === 1 && countOcc(html, 'var TOTAL_BOSSES=86;') === 0);
    check('Oxford 3395 + A1-A2 998 raw rows unchanged', countOcc(html, '"src": "oxford"') === 3395 && countOcc(html, '"src": "a1a2"') === 998);
    check('all layer versions 13.0.0–19.6.1 present', ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0', '17.0.0', '17.1.0', '18.0.0', '18.1.0', '18.2.0', '18.3.0', '18.4.0', '18.5.0', '18.6.0', '18.7.0', '18.8.0', '18.9.0', '19.0.0', '19.0.1', '19.2.0', '19.3.0', '19.4.0', '19.5.0', '19.5.1', '19.6.0', '19.6.1'].every(v => html.includes(v)));
    const pristinePath = path.join(ROOT, 'tools', 'v53', 'backup-v19.6', 'out', 'index.html');
    const pristineHtml = fs.readFileSync(pristinePath, 'utf-8');
    check('pristine V19.6 base hash is the documented one', crypto.createHash('sha256').update(pristineHtml).digest('hex') === '48555ddfd1ab7c9e8a55fba8cc1eb804ee27b09f665a45a4f5c54e80bb807a8b');
    check('v48.js embedded block == edited src file', (() => { const src = fs.readFileSync(path.join(ROOT, 'src', 'v48.js'), 'utf-8'); return html.includes('<script id="v48js">\n' + src + '\n</script>'); })());
    check('v53.js embedded block == src file', (() => { const src = fs.readFileSync(path.join(ROOT, 'src', 'v53.js'), 'utf-8'); return html.includes('<script id="v53js">\n' + src + '\n</script>'); })());
    check('v51.js embedded block == src file', (() => { const src = fs.readFileSync(path.join(ROOT, 'src', 'v51.js'), 'utf-8'); return html.includes('<script id="v51js">\n' + src + '\n</script>'); })());
    check('out/v48.js + out/v53.js == src files', fs.readFileSync(path.join(DIR, 'v48.js'), 'utf-8') === fs.readFileSync(path.join(ROOT, 'src', 'v48.js'), 'utf-8') && fs.readFileSync(path.join(DIR, 'v53.js'), 'utf-8') === fs.readFileSync(path.join(ROOT, 'src', 'v53.js'), 'utf-8'));
  }

  // ================= §L page load =================
  section('§L', 'page load + exports');
  {
    const c = seededCtx(html, 71);
    check('page loads with no inline-script error', true);
    check('__v53 present, version 19.6.1', E(c, `window.__v53&&window.__v53.version`) === '19.6.1');
    check('__v53 exports koQuality/koPool53/bandKO/koOrderSession/tierKO/stripPunct/tokensOf', E(c, `['koQuality','koPool53','bandKO','koOrderSession','tierKO','stripPunct','tokensOf'].every(function(f){return typeof window.__v53[f]==='function'})`));
    check('__v51 present, version 19.6.0, genPool exported', E(c, `window.__v51&&window.__v51.version==='19.6.0'&&typeof window.__v51.genPool==='function'`));
    check('__v48 present, version 19.3.0, _test.forgePool exported', E(c, `window.__v48&&window.__v48.version==='19.3.0'&&typeof window.__v48._test.forgePool==='function'`));
    check('__v52 present, version 19.5.1, speak exported', E(c, `window.__v52&&window.__v52.version==='19.5.1'&&typeof window.__v52.speak==='function'`));
    check('WORDS 4892 built', E(c, `window.__v15.words.length`) === 4892);
  }

  // ================= §53A koQuality unit tests =================
  section('§53A', 'koQuality — explicit filter rules, each with a why');
  {
    const c = seededCtx(html, 72);
    const Q = (e) => J(c, `JSON.stringify(window.__v53.koQuality(${JSON.stringify(e)}))`);
    check('valid 3-token sentence passes', Q('나는 학교에 갑니다').ok === true && Q('나는 학교에 갑니다').tokens.length === 3, Q('나는 학교에 갑니다'));
    check('valid sentence with trailing period passes', Q('오늘은 날씨가 좋아요.').ok === true, Q('오늘은 날씨가 좋아요.'));
    check('valid: trailing comma mid-sentence is fine (comma at token end)', Q('안녕하세요, 만나서 반가워요').ok === true, Q('안녕하세요, 만나서 반가워요'));
    check('valid: balanced double quotes pass', Q('그는 "안녕하세요"라고 했어요').ok === true, Q('그는 "안녕하세요"라고 했어요'));
    check('valid: mid-word apostrophe is NOT unbalanced (don\'t)', Q("I don't like it, 나는 안 가요").ok === true, Q("I don't like it, 나는 안 가요"));
    check('valid: ellipsis … is allowed', Q('정말… 나는 몰라요').ok === true, Q('정말… 나는 몰라요'));
    check('valid: 2-token sentence passes', Q('밥 먹어요').ok === true, Q('밥 먹어요'));
    check('no-hangul: Latin-only sentence dropped', Q('Hello world').why === 'no-hangul' && Q('Hello world').ok === false, Q('Hello world'));
    check('too-short: one-word sentence dropped', Q('사랑해요.').why === 'too-short' && Q('사랑해요.').ok === false, Q('사랑해요.'));
    check('odd-punct: ~ placeholder dropped', Q('나는 학교에~ 갑니다').why === 'odd-punct', Q('나는 학교에~ 갑니다'));
    check('odd-punct: # dropped', Q('나는 #학교에 갑니다').why === 'odd-punct', Q('나는 #학교에 갑니다'));
    check('odd-punct: / dropped', Q('나는/학교에 갑니다').why === 'odd-punct', Q('나는/학교에 갑니다'));
    check('unbalanced: stray double quote dropped', Q('나는 "학교에 갑니다').why === 'unbalanced', Q('나는 "학교에 갑니다'));
    check('unbalanced: open paren dropped', Q('나는 (학교에 갑니다').why === 'unbalanced', Q('나는 (학교에 갑니다'));
    check('mid-punct: missing space (학생입니다.오늘) dropped', Q('학생입니다.오늘 날씨가 좋아요').why === 'mid-punct', Q('학생입니다.오늘 날씨가 좋아요'));
    check('mid-punct: comma inside a token dropped', Q('나는,오늘 학교에 갑니다').why === 'mid-punct', Q('나는,오늘 학교에 갑니다'));
    check('bad-token: lone comma tile dropped', Q('나는 , 학교에 갑니다').why === 'bad-token', Q('나는 , 학교에 갑니다'));
    check('seed deck: all 19 valid examples pass the filter', J(c, `JSON.stringify((function(){
      var bad=[];
      ${JSON.stringify(KO_A.concat(KO_L))}.forEach(function(cd){
        if(cd.e && cd.e.indexOf('"') < 0 && cd.e.indexOf('#') < 0 && cd.e.indexOf('~') < 0 && cd.e.indexOf('오늘 날씨가') < 0 && cd.e !== '나는 , 학교에 갑니다' && cd.e !== '사랑해요.'){
          var q=window.__v53.koQuality(cd.e);
          if(!q.ok) bad.push(cd.id+':'+q.why);
        }
      });
      return {bad:bad};
    })())`).bad.length === 0, J(c, `JSON.stringify((function(){
      var bad=[];
      ${JSON.stringify(KO_A.concat(KO_L))}.forEach(function(cd){
        if(cd.e && cd.e.indexOf('"') < 0 && cd.e.indexOf('#') < 0 && cd.e.indexOf('~') < 0 && cd.e.indexOf('오늘 날씨가') < 0 && cd.e !== '나는 , 학교에 갑니다' && cd.e !== '사랑해요.'){
          var q=window.__v53.koQuality(cd.e);
          if(!q.ok) bad.push(cd.id+':'+q.why);
        }
      });
      return {bad:bad};
    })())`));
    checkRatio('.v53new badge: white on #6b3a00 (need 7:1)', '#ffffff', '#6b3a00', 7);
    checkRatio('.v53note: gold #FFD76A on .v48card bg #292044 (need 7:1)', '#FFD76A', '#292044', 7);
  }

  // ================= §53B koPool53 — priority, supplement, notice, gate =================
  section('§53B', 'koPool53 — learned → deck/group → other, supplement + notice, expanded gate');
  {
    const cA = seededCtx(html, 73);
    check('seed A loads (18 cards)', seedKO(cA, KO_A) === 18);
    const pA = koPool(cA);
    check('A: pool is 8 learned + 4 unlearned = 12 (bad 5 filtered; learned counts all 14 box>=1 cards)', pA.n === 12 && pA.learnedItems === 8 && pA.unlearnedItems === 4 && pA.learned === 14 && pA.koSent === 12, pA);
    check('A: origins are learned first, then other unlearned', pA.origins === 'learned,learned,learned,learned,learned,learned,learned,learned,other,other,other,other', pA.origins);
    check('A: learnedFlags match (8 learned, 4 not)', pA.learnedFlags === '111111110000', pA.learnedFlags);
    check('A: no notice when the primary pool is full (8 >= 5)', pA.notice === null && pA.supplemented === false, pA);
    check('A: no bad example text in the pool', !/["#~]/.test(pA.texts) && pA.texts.indexOf('학생입니다.오늘') < 0 && pA.texts.indexOf('사랑해요') < 0, pA.texts);
    check('A: every item is verbatim card.e (stripped trailing punctuation only)', J(cA, `JSON.stringify((function(){
      var p=window.__v48._test.forgePool('ko'), bad=[];
      p.items.forEach(function(it){
        var cd=S.cards.filter(function(x){return x.id===it.cardId})[0];
        if(!cd||it.text!==cd.e.replace(/[.!?]+$/,'')) bad.push(it.cardId);
      });
      return {bad:bad};
    })())`).bad.length === 0);
    check('A: gate ok (learned 8, koSent 12)', koGate(cA).ok === true, koGate(cA));

    const cC = seededCtx(html, 74);
    seedKO(cC, KO_C);
    const pC = koPool(cC);
    check('C: koSent counts the EXPANDED pool (2 learned + 4 unlearned = 6)', pC.koSent === 6 && pC.learned === 8 && pC.learnedItems === 2 && pC.unlearnedItems === 4, pC);
    check('C: gate ok on the expanded pool (was NOT ok on pristine: koSent 2)', koGate(cC).ok === true, koGate(cC));

    const cS = seededCtx(html, 75);
    seedKO(cS, KO_S);
    const pS = koPool(cS);
    check('S: primary 4 (3 learned + 1 deck), tier3 6, total 10', pS.primary === 4 && pS.n === 10 && pS.learnedItems === 3 && pS.unlearnedItems === 7, pS);
    check('S: notice says supplemented, primary 4, added 1, tier3 6, total 10', pS.notice && pS.notice.supplemented === true && pS.notice.primary === 4 && pS.notice.added === 1 && pS.notice.tier3 === 6 && pS.notice.total === 10, pS.notice);
    check('S: gate NOT ok (only 3 learned < 8) — supplement does not fake the learned gate', koGate(cS).ok === false && koGate(cS).why === 'ko-words', koGate(cS));

    const cD = seededCtx(html, 76);
    seedKO(cD, KO_D);
    const pD = koPool(cD);
    check('D: 14 items (2 duplicate texts dropped at the lower tier)', pD.n === 14 && pD.learnedItems === 8 && pD.unlearnedItems === 6, pD);
    check('D: origin order learned x8 -> deck x2 -> group x2 -> other x2', pD.origins === 'learned,learned,learned,learned,learned,learned,learned,learned,deck,deck,group,group,other,other', pD.origins);
    check('D: no notice (primary 12 >= 5)', pD.notice === null, pD);
    check('D: dup texts kept once, at the highest tier (deck d8, learned d0)', pD.texts.indexOf('꽃이 아주 예뻐요') >= 0 && pD.texts.split('꽃이 아주 예뻐요').length === 2 && pD.texts.split('나는 학교에 갑니다').length === 2, pD.texts);
    check('D: deck preference still holds with unlearned cards (first 8 learned, then deck)', pD.origins.split(',').slice(0, 10).join(',') === 'learned,learned,learned,learned,learned,learned,learned,learned,deck,deck', pD.origins);
  }

  // ================= §53C koOrderSession — ladder + priority =================
  section('§53C', 'koOrderSession — token ladder 2-3 → 4-5 → 6+, priority-first draw');
  {
    const c = seededCtx(html, 77);
    check('bandKO mapping 2->1, 3->1, 4->2, 5->2, 6->3, 9->3', E(c, `window.__v53.bandKO(2)`) === 1 && E(c, `window.__v53.bandKO(3)`) === 1 && E(c, `window.__v53.bandKO(4)`) === 2 && E(c, `window.__v53.bandKO(5)`) === 2 && E(c, `window.__v53.bandKO(6)`) === 3 && E(c, `window.__v53.bandKO(9)`) === 3);
    check('tierKO (scoring) is UNCHANGED: <=4 -> 1, <=7 -> 2, else 3', E(c, `window.__v53.tierKO(4)`) === 1 && E(c, `window.__v53.tierKO(7)`) === 2 && E(c, `window.__v53.tierKO(8)`) === 3);
    check('koOrderSession(null) and ([]) return null (caller falls back to shuffle)', E(c, `window.__v53.koOrderSession(null,5)`) === null && E(c, `window.__v53.koOrderSession([],5)`) === null);
    // Ladder over 50 seeded sessions on KO_L (8 learned across all 3 bands).
    seedKO(c, KO_L);
    const lad = J(c, `JSON.stringify((function(){
      var p=window.__v48._test.forgePool('ko'), out={n:0, laddered:0, spanning:0, allLearned:0, uniq:0};
      for(var k=0;k<50;k++){
        var s=window.__v53.koOrderSession(p.items,5);
        if(!s||s.length!==5)continue;
        out.n++;
        var bands=s.map(function(it){return window.__v53.bandKO(it.tokens.length)});
        var ok=true; for(var i=1;i<bands.length;i++) if(bands[i]<bands[i-1]) ok=false;
        if(ok)out.laddered++;
        if(bands[0]<bands[bands.length-1])out.spanning++;
        if(s.every(function(it){return it.learned}))out.allLearned++;
        var ids={}; s.forEach(function(it){ids[it.cardId]=1});
        if(Object.keys(ids).length===5)out.uniq++;
      }
      return out;
    })())`);
    check('ladder 50/50: every session draws 5 unique items', lad.n === 50 && lad.uniq === 50, lad);
    check('ladder 50/50: bands never decrease within a session', lad.laddered === 50, lad);
    check('ladder 50/50: every session spans >= 2 bands (first < last)', lad.spanning === 50, lad);
    check('ladder 50/50: every session is all-learned (8 learned >= 5, priority-first)', lad.allLearned === 50, lad);
    // Mixed priority: 2 learned + 3 deck + 4 other -> session is the 5 highest-priority items, laddered.
    const cM = seededCtx(html, 78);
    seedKO(cM, KO_M);
    const mix = J(cM, `JSON.stringify((function(){
      var p=window.__v48._test.forgePool('ko');
      var s=window.__v53.koOrderSession(p.items,5);
      var ids=s.map(function(it){return it.cardId}).sort().join(',');
      var bands=s.map(function(it){return window.__v53.bandKO(it.tokens.length)});
      var ok=true; for(var i=1;i<bands.length;i++) if(bands[i]<bands[i-1]) ok=false;
      return {n:p.items.length, ids:ids, bands:bands.join(','), laddered:ok, last:s[s.length-1].cardId};
    })())`);
    check('mixed: pool is 9 (2 learned + 3 deck + 4 other), no supplement (primary 5)', mix.n === 9, mix);
    check('mixed: session picks exactly the 5 highest-priority items (m0,m1,m2,m3,m4)', mix.ids === 'm0,m1,m2,m3,m4', mix);
    check('mixed: session is laddered (bands non-decreasing)', mix.laddered === true && mix.bands === '1,1,1,2,3', mix);
    check('mixed: the 6-token learned item comes LAST (band 3)', mix.last === 'm1', mix);
  }

  // ================= §53D live KO sessions (vm, through __v48._test) =================
  section('§53D', 'live KO sessions — intro/notice/badge/end screen, XP + score');
  {
    // Seed A: full primary pool, no supplement.
    const cA = seededCtx(html, 79);
    seedKO(cA, KO_A);
    const introA = J(cA, `JSON.stringify((function(){
      var T=window.__v48._test;
      T.openForge('ko','forge');
      return T.overlayHTML();
    })())`);
    check('A intro: shows the real pool line (12 câu, 4 from unlearned)', introA.indexOf('Câu ví dụ thật: 12 câu') >= 0 && introA.indexOf('4 câu từ từ chưa học') >= 0 && introA.indexOf('chưa học') >= 0, introA.slice(0, 400));
    check('A intro: no supplement notice when the pool is full', introA.indexOf('đã bổ sung') < 0, introA.slice(0, 400));
    const sessA = playForge(cA, 'ko');
    check('A session: 5 questions, all learned, bands laddered', sessA.list.length === 5 && sessA.list.every(function (it) { return it.learned === true; }) && laddered(sessA.list), sessA.list);
    check('A session: 5/5 correct through tap/check/next', sessA.checks.length === 5 && sessA.checks.every(function (x) { return x === true; }) && sessA.right === 5, sessA);
    check('A session: XP channel +20 (5x+2 + one +10 bonus), bonus once', sessA.xpDelta === 20 && sessA.bonus === 10 && sessA.bonus2 === 0, { xpDelta: sessA.xpDelta, bonus: sessA.bonus, bonus2: sessA.bonus2 });
    check('A session: scoreTotal persisted (V50 score tracking holds for KO)', sessA.scoreTotal > 0, sessA.scoreTotal);
    check('A session: no "chưa học" badge (all items learned)', sessA.htmls.every(function (h) { return h.indexOf('class="v53new"') < 0; }), sessA.htmls.map(function (h) { return h.length; }));
    check('A end screen: no supplement line when the pool was full', sessA.endHtml.indexOf('Buổi này có') < 0, sessA.endHtml.slice(0, 300));

    // Seed S2: supplemented LIVE session — 8 learned (gate ok) but only
    // 2 valid learned examples + 1 deck; primary 3 < 5, tier3 4 -> added 2.
    const cS = seededCtx(html, 80);
    seedKO(cS, KO_S2);
    const pS2 = koPool(cS);
    check('S2 pool: primary 3 (2 learned + 1 deck), tier3 4, total 7, added 2', pS2.primary === 3 && pS2.n === 7 && pS2.notice && pS2.notice.added === 2 && pS2.notice.tier3 === 4 && pS2.notice.total === 7, pS2);
    check('S2 gate ok (learned 8, expanded koSent 7)', koGate(cS).ok === true, koGate(cS));
    const introS = J(cS, `JSON.stringify((function(){
      var T=window.__v48._test;
      T.openForge('ko','forge');
      return T.overlayHTML();
    })())`);
    check('S intro: pool line (7 câu, 5 from unlearned)', introS.indexOf('Câu ví dụ thật: 7 câu') >= 0 && introS.indexOf('5 câu từ từ chưa học') >= 0, introS.slice(0, 500));
    check('S intro: supplement notice names the short primary pool (3 câu) + the 2 added', introS.indexOf('chỉ có 3 câu ví dụ') >= 0 && introS.indexOf('đã bổ sung 2 câu') >= 0, introS.slice(0, 500));
    const sessS = playForge(cS, 'ko');
    check('S session: FS.notice is the supplement notice', sessS.notice && sessS.notice.supplemented === true && sessS.notice.primary === 3 && sessS.notice.added === 2, sessS.notice);
    check('S session: exactly 3 unlearned items in the 5 (1 deck + 2 other, priority-first draw)', sessS.list.filter(function (it) { return it.learned === false; }).length === 3, sessS.list);
    check('S session: bands laddered', laddered(sessS.list), sessS.list);
    check('S Q1 card: supplement notice line is shown on the first question', sessS.htmls[0].indexOf('Đã bổ sung 2 câu') >= 0, sessS.htmls[0].slice(0, 400));
    check('S session: exactly three question cards carry the "chưa học" badge', sessS.htmls.filter(function (h) { return h.indexOf('class="v53new"') >= 0; }).length === 3 && sessS.htmls.filter(function (h) { return h.indexOf('chưa học') >= 0; }).length >= 3, sessS.htmls.map(function (h) { return h.indexOf('class="v53new"') >= 0; }));
    check('S end screen: supplement line names the unlearned count in the session (3)', sessS.endHtml.indexOf('Buổi này có 3 câu từ từ chưa học') >= 0, sessS.endHtml.slice(0, 300));
    check('S session: 5/5 correct, XP +20, bonus 10 once', sessS.checks.every(function (x) { return x === true; }) && sessS.right === 5 && sessS.xpDelta === 20 && sessS.bonus === 10, { right: sessS.right, xpDelta: sessS.xpDelta, bonus: sessS.bonus });
  }

  // ================= §53E EN regression =================
  section('§53E', 'EN Forge regression — V51 generation, V50 score, V52 TTS hold');
  {
    const c = seededCtx(html, 81);
    seedLearned(c, function (w) { return (w.a1a2Topics || []).indexOf('a1_education') >= 0; }, 1);
    E(c, `window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_education'})`);
    const poolEn = J(c, `JSON.stringify((function(){ var p=window.__v48._test.forgePool('en'); return {n:p.items.length, gen:p.items.filter(function(i){return !!i.gen}).length}; })())`);
    check('EN pool still generates (flag on, scope a1_education)', poolEn.n >= 5 && poolEn.gen === poolEn.n, poolEn);
    const sessEn = playForge(c, 'en');
    check('EN session: 5 generated items, 5/5 correct', sessEn.list.length === 5 && sessEn.list.every(function (it) { return it.gen === true; }) && sessEn.checks.every(function (x) { return x === true; }) && sessEn.right === 5, sessEn.list);
    check('EN session: XP +20, bonus 10 once (identical to V19.6)', sessEn.xpDelta === 20 && sessEn.bonus === 10 && sessEn.bonus2 === 0, { xpDelta: sessEn.xpDelta, bonus: sessEn.bonus, bonus2: sessEn.bonus2 });
    check('EN session: no v53 badge/notice leaks into EN cards', sessEn.htmls.every(function (h) { return h.indexOf('v53new') < 0 && h.indexOf('v53note') < 0; }), sessEn.htmls.map(function (h) { return h.length; }));
    check('EN session: scoreTotal persisted', sessEn.scoreTotal > 0, sessEn.scoreTotal);
    // V52 TTS helper still works (one spot check; full suite is test52).
    const cT = seededCtx(html, 82);
    E(cT, `window.__ttsLog={spoken:[],cancelled:0};
      speechSynthesis={_voices:[{name:'Google US English',lang:'en-US',default:true},{name:'Google 한국어',lang:'ko-KR'}],
        getVoices:function(){return this._voices.slice()},
        addEventListener:function(){},
        speak:function(u){window.__ttsLog.spoken.push({text:u.text,lang:u.lang,voice:u.voice&&u.voice.lang})},
        cancel:function(){window.__ttsLog.cancelled++}};`);
    const sp = J(cT, `JSON.stringify((function(){
      var out={};
      out.koOk=window.__v52.speak('안녕','ko-KR',.85);
      out.enOk=window.__v52.speak('hello','en-US',.85);
      out.log=window.__ttsLog.spoken;
      return out;
    })())`);
    check('V52 speak() still picks the matching voice (ko-KR / en-US)', sp.koOk === true && sp.enOk === true && sp.log.length === 2 && sp.log[0].voice === 'ko-KR' && sp.log[1].voice === 'en-US', sp);
    // koDeckFirst still prefers the selected deck (test51 §51D, all-learned seed).
    const cK = seededCtx(html, 83);
    const koDeck = J(cK, `JSON.stringify((function(){
      var s;try{s=S}catch(e){return {err:'no S'}}
      s.cards=[];s.decks=[{id:'dX',name:'Deck X'},{id:'dY',name:'Deck Y'}];
      for(var i=0;i<12;i++){s.cards.push({id:'k'+i,d:i<6?'dY':'dX',h:'한글'+i,m:'nghĩa '+i,p:'',e:'나는 학교에 갑니다 '+i,box:1})}
      s.deck='dX';
      var p=window.__v48._test.forgePool('ko');
      var firstDeck=p.items.slice(0,6).filter(function(it){return it.cardId&&+it.cardId.slice(1)>=6}).length;
      return {items:p.items.length, first6Deck:firstDeck, gateOk:window.__v48._test.forgeGate('ko').ok};
    })())`);
    check('KO deck preference survives: first 6 pool items are all deck cards', koDeck.items === 12 && koDeck.first6Deck === 6 && koDeck.gateOk === true, koDeck);
  }

  // ================= §R0 repro-first on pristine V19.6 =================
  // The same seeds run against the pristine V19.6 build must show the
  // OLD behaviour — this is what V19.6.1 fixes (D1/D2/D3/D4/D5).
  section('§R0', 'repro-first — pristine V19.6 shows the 5 defects V19.6.1 fixes');
  {
    const pristinePath = path.join(ROOT, 'tools', 'v53', 'backup-v19.6', 'out', 'index.html');
    const pristineHtml = fs.readFileSync(pristinePath, 'utf-8');
    check('pristine base is V19.6 (no __v53)', !pristineHtml.includes('window.__v53={'));
    const cA = seededCtx(pristineHtml, 7);
    seedKO(cA, KO_A);
    const pA = koPool(cA);
    const d1 = J(cA, `JSON.stringify((function(){
      var p=window.__v48._test.forgePool('ko');
      var unlearned=p.items.filter(function(it){var cd=S.cards.filter(function(x){return x.id===it.cardId})[0];return cd&&(cd.box||0)<1}).length;
      return {n:p.items.length, learned:p.learned, koSent:p.koSent, unlearned:unlearned};
    })())`);
    check('D1 pristine: pool excludes unlearned examples (13 learned incl. 5 bad, 0 unlearned)', d1.n === 13 && d1.unlearned === 0 && d1.learned === 14 && d1.koSent === 13, d1);
    check('D2 pristine: no notice / no supplement fields on the pool', pA.notice === null && pA.supplemented === false, pA);
    const cE = seededCtx(pristineHtml, 7);
    seedKO(cE, KO_A);
    const badIn = J(cE, `JSON.stringify((function(){
      var p=window.__v48._test.forgePool('ko');
      var t=p.items.map(function(i){return i.text}).join(' | ');
      return {n:p.items.length, hasQuote:t.indexOf('"')>=0, hasHash:t.indexOf('#')>=0, hasTilde:t.indexOf('~')>=0, hasMid:t.indexOf('학생입니다.오늘')>=0, hasCommaTile:p.items.some(function(i){return i.tokens.indexOf(',')>=0}), hasOneWord:t.indexOf('사랑해요')>=0};
    })())`);
    check('D3 pristine: 5 bad examples enter the pool (quote, #, ~, mid-punct, comma tile); 1-word already dropped by the old >=2 filter', badIn.n === 13 && badIn.hasQuote === true && badIn.hasHash === true && badIn.hasTilde === true && badIn.hasMid === true && badIn.hasCommaTile === true && badIn.hasOneWord === false, badIn);
    seedKO(cE, KO_L);
    const lad0 = J(cE, `JSON.stringify((function(){
      var p=window.__v48._test.forgePool('ko'), laddered=0;
      for(var k=0;k<50;k++){
        var s=window.__v48._test.startForgeSession('ko');
        var FS=window.__v48._test.session();
        var bands=FS.list.map(function(it){return it.tokens.length<=3?1:(it.tokens.length<=5?2:3)});
        var ok=true; for(var i=1;i<bands.length;i++) if(bands[i]<bands[i-1]) ok=false;
        if(ok)laddered++;
      }
      return {laddered:laddered};
    })())`);
    check('D4 pristine: no ladder — at most 12/50 sessions ladder by chance (V19.6.1: 50/50)', lad0.laddered <= 12, lad0);
    const cC = seededCtx(pristineHtml, 7);
    seedKO(cC, KO_C);
    const pC = koPool(cC);
    check('D5 pristine: gate fires despite 4 valid unlearned examples (koSent 2 < 3)', pC.koSent === 2 && koGate(cC).ok === false && koGate(cC).why === 'ko-sent', { koSent: pC.koSent, gate: koGate(cC) });
    const intro0 = J(cC, `JSON.stringify((function(){
      var T=window.__v48._test;
      T.openForge('ko','forge');
      return T.overlayHTML();
    })())`);
    check('D2 pristine: intro has no "chưa học" marking and no supplement notice', intro0.indexOf('chưa học') < 0 && intro0.indexOf('đã bổ sung') < 0, intro0.slice(0, 300));
  }

  // ================= §V save schema =================
  section('§V', 'save schema — no new key, notice is session-only');
  {
    const c = seededCtx(html, 84);
    const fresh = J(c, `JSON.stringify((function(){
      var s;try{s=S}catch(e){return {err:'no S'}}
      var before={keys:Object.keys(s.v7||{}).sort()};
      var lsKeys=[];try{for(var i=0;i<localStorage.length;i++)lsKeys.push(localStorage.key(i))}catch(e){}
      return {before:before, lsBefore:lsKeys};
    })())`);
    seedKO(c, KO_S2);
    const after = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, s=S;
      T.openForge('ko','forge');
      T.startForgeSession('ko');
      var e=T.en48();
      var lsKeys=[];try{for(var i=0;i<localStorage.length;i++)lsKeys.push(localStorage.key(i))}catch(e){}
      return {keys:Object.keys(s.v7||{}).sort(), ls:lsKeys, forgeKeys:Object.keys(e.forge||{}).sort(), hasNotice:!!(e.forge&&e.forge.notice)};
    })())`);
    check('no new top-level S.v7 key vs fresh boot (en48 + en19 are both created by the pre-existing openForge path — verified identical on pristine V19.6)', JSON.stringify(fresh.before.keys) === JSON.stringify(after.keys.filter(function (k) { return k !== 'en48' && k !== 'en19'; })), { before: fresh.before.keys, after: after.keys });
    check('no new localStorage key after a KO Forge session', JSON.stringify(fresh.lsBefore) === JSON.stringify(after.ls), { before: fresh.lsBefore, after: after.ls });
    check('FS.notice is session-only — never persisted into en48.forge', after.hasNotice === false, after.forgeKeys);
  }

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in Node vm)');
  {
    skipCheck('C.1 "chưa học" badge + supplement notice paint (light + dark)', 'real Chrome gate in verify-v53c.js');
    skipCheck('C.2 360px overflow on the Forge overlay with the new lines', 'real Chrome gate in verify-v53c.js');
    skipCheck('C.3 live KO session clicks end-to-end (real DOM)', 'real Chrome gate in verify-v53c.js');
    skipCheck('C.4 real Android TTS end-to-end', 'headless Chrome has no voices; Anh tests on his phone');
    skipCheck('C.5 live Firebase login/sync', 'never tested live, as in every version');
  }

  console.log(`\n== test53 summary ==\nPASS ${pass}  FAIL ${fail}  SKIP ${skip}`);
  for (const [id, sc] of Object.entries(secCounts)) console.log(`  ${id}: ${sc.pass} pass / ${sc.fail} fail / ${sc.skip} skip`);
  if (failures.length) console.log('FAILURES:\n  ' + failures.join('\n  '));
  process.exit(fail ? 1 : 0);
}
main();
