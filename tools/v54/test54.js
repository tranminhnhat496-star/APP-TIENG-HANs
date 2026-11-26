// test54.js - V19.7 (layer V54) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v48/test48.js via tools/v51/test51.js;
// only the EXPECTED_SHA / EXPECTED_BYTES constants and the
// V54-specific sections are new.
// Usage: node tools/v54/test54.js [DIR]   (default: <root>/out; pass the
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
  const pristinePath = path.join(ROOT, 'tools', 'v54', 'backup-v19.6.1', 'out', 'index.html');
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
    check('index.html sha256 matches the V19.7 build', sha === EXPECTED_SHA, sha.slice(0, 12));
    check('index.html bytes match', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
    check('title is V19.7 Bulk KO Import', html.includes("<title>Korean &amp; English Vocab Farm V19.7 — Bulk KO Import — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"));
    check('V19.6.1 title gone', !html.includes('V19.6.1 — KO Forge'));
    const styleIds = [...html.matchAll(/<style id="(v\d+)"/g)].map(m => m[1]);
    const scriptIds = [...html.matchAll(/<script id="(v\d+)js"/g)].map(m => m[1]);
    check('v54 style is LAST, v54js is LAST (after v53js)', styleIds[styleIds.length - 1] === 'v54' && scriptIds[scriptIds.length - 1] === 'v54' && scriptIds[scriptIds.length - 2] === 'v53', { styleIds: styleIds.slice(-3), scriptIds: scriptIds.slice(-3) });
    check('v54 markers present exactly once', countOcc(html, 'id="v54"') === 1 && countOcc(html, 'id="v54js"') === 1 && countOcc(html, 'id="v54seedjs"') === 1 && countOcc(html, "window.__v54={") === 1 && countOcc(html, "VERSION='19.7.0'") === 1);
    check('V54 function definitions present exactly once', countOcc(html, 'function dryRun54(input, opts) {') === 1 && countOcc(html, 'function confirmImport54(pv) {') === 1 && countOcc(html, 'function snapshotBeforeImport54() {') === 1 && countOcc(html, 'function parseRows54(text) {') === 1 && countOcc(html, 'function seedPreview54() {') === 1);
    check('seed block present: __V54_SEED + CC BY-SA 2.0 KR + 50 rows', countOcc(html, 'window.__V54_SEED') >= 1 && html.includes('CC BY-SA 2.0 KR') && (html.match(/"h": "/g) || []).length >= 50);
    check('.v54hub/.v54btn CSS rules present once', countOcc(html, '.v54hub') === 1 && countOcc(html, '.v54btn') >= 1);
    check('V48 markers survive', countOcc(html, 'id="v48js"') === 1 && countOcc(html, "VERSION='19.3.0'") === 1 && countOcc(html, 'window.__v48={') === 1);
    check('V51 markers survive', countOcc(html, 'id="v51js"') === 1 && countOcc(html, "VERSION='19.6.0'") === 1 && countOcc(html, 'function genPool(){') === 1 && countOcc(html, 'function koDeckFirst(cards){') === 1);
    check('V52 markers survive', countOcc(html, 'id="v52js"') === 1 && countOcc(html, "VERSION='19.5.1'") === 1 && countOcc(html, 'function mark18(ok,w,qkey)') === 1 && countOcc(html, 'function mark19(ok,w,qkey)') === 1 && countOcc(html, 'wordlessKey18') >= 1);
    check('V53 markers survive', countOcc(html, 'id="v53js"') === 1 && countOcc(html, "VERSION='19.6.1'") === 1 && countOcc(html, 'function koQuality(e){') === 1 && countOcc(html, 'function koPool53(cards, deck){') === 1 && countOcc(html, 'function bandKO(n){') === 1 && countOcc(html, 'function koOrderSession(items, n){') === 1);
    check('TOTAL_BOSSES still 87', countOcc(html, 'var TOTAL_BOSSES=87;') === 1 && countOcc(html, 'var TOTAL_BOSSES=86;') === 0);
    check('Oxford 3395 + A1-A2 998 raw rows unchanged', countOcc(html, '"src": "oxford"') === 3395 && countOcc(html, '"src": "a1a2"') === 998);
    check('all layer versions 13.0.0–19.7.0 present', ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0', '17.0.0', '17.1.0', '18.0.0', '18.1.0', '18.2.0', '18.3.0', '18.4.0', '18.5.0', '18.6.0', '18.7.0', '18.8.0', '18.9.0', '19.0.0', '19.0.1', '19.2.0', '19.3.0', '19.4.0', '19.5.0', '19.5.1', '19.6.0', '19.6.1', '19.7.0'].every(v => html.includes(v)));
    check('pristine V19.6.1 base hash is the documented one', crypto.createHash('sha256').update(pristineHtml).digest('hex') === 'aa865a5dde58f6844800d6c1ff798b8fca1a0c2531e671ee6a6771ea42063484');
    check('v54.js embedded block == src file', (() => { const src = fs.readFileSync(path.join(ROOT, 'src', 'v54.js'), 'utf-8'); return html.includes('<script id="v54js">\n' + src + '\n</script>'); })());
    check('v54_seed.js embedded block == src file', (() => { const src = fs.readFileSync(path.join(ROOT, 'src', 'v54_seed.js'), 'utf-8'); return html.includes('<script id="v54seedjs">\n' + src + '\n</script>'); })());
    check('v53.js embedded block == src file', (() => { const src = fs.readFileSync(path.join(ROOT, 'src', 'v53.js'), 'utf-8'); return html.includes('<script id="v53js">\n' + src + '\n</script>'); })());
    check('out/v54.js + out/v54_seed.js + out/v54.css == src files', fs.readFileSync(path.join(DIR, 'v54.js'), 'utf-8') === fs.readFileSync(path.join(ROOT, 'src', 'v54.js'), 'utf-8') && fs.readFileSync(path.join(DIR, 'v54_seed.js'), 'utf-8') === fs.readFileSync(path.join(ROOT, 'src', 'v54_seed.js'), 'utf-8') && fs.readFileSync(path.join(DIR, 'v54.css'), 'utf-8') === fs.readFileSync(path.join(ROOT, 'src', 'v54.css'), 'utf-8'));
  }

  // ================= §L page load =================
  section('§L', 'page load + exports');
  {
    const c = seededCtx(html, 71);
    check('page loads with no inline-script error', true);
    check('__v54 present, version 19.7.0', E(c, `window.__v54&&window.__v54.version`) === '19.7.0');
    check('__v54 exports parseRows54/dryRun54/confirmImport54/snapshotBeforeImport54/undoImport54/seedPreview54/flagOn/setFlag', E(c, `['parseRows54','dryRun54','confirmImport54','snapshotBeforeImport54','undoImport54','seedPreview54','flagOn','setFlag'].every(function(f){return typeof window.__v54[f]==='function'})`));
    check('__V54_SEED present: 50 rows, CC BY-SA 2.0 KR, KRDict source', E(c, `window.__V54_SEED&&window.__V54_SEED.rows.length===50&&window.__V54_SEED.license==='CC BY-SA 2.0 KR'&&window.__V54_SEED.source.indexOf('한국어기초사전')>=0`));
    check('__v53 present, version 19.6.1', E(c, `window.__v53&&window.__v53.version`) === '19.6.1');
    check('__v51 present, version 19.6.0, genPool exported', E(c, `window.__v51&&window.__v51.version==='19.6.0'&&typeof window.__v51.genPool==='function'`));
    check('__v48 present, version 19.3.0, _test.forgePool exported', E(c, `window.__v48&&window.__v48.version==='19.3.0'&&typeof window.__v48._test.forgePool==='function'`));
    check('__v52 present, version 19.5.1, speak exported', E(c, `window.__v52&&window.__v52.version==='19.5.1'&&typeof window.__v52.speak==='function'`));
    check('WORDS 4892 built', E(c, `window.__v15.words.length`) === 4892);
  }

  // ---------- V54 helpers ----------
  function seedCards54(ctx, cards, deckId) {
    return J(ctx, `JSON.stringify((function(){
      var s;try{s=S}catch(e){return {err:'no S'}}
      s.cards=${JSON.stringify(cards)};
      s.decks=[{id:'dX',name:'Deck X'},{id:'dY',name:'Deck Y'}];
      s.deck='${deckId || 'dX'}';
      return s.cards.length;
    })())`);
  }
  function cards54(ctx) {
    return J(ctx, `JSON.stringify(S.cards.map(function(c){return {id:c.id,d:c.d,h:c.h,m:c.m,p:c.p,e:c.e,g:c.g,box:c.box,due:c.due,src:c.src||'',lic:c.lic||'',lvl:c.lvl||'',gl:c.gl||'',kid:c.kid||''}}))`);
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

  // ================= §54A parseRows54 =================
  section('§54A', 'parseRows54 — text 5/8-col, JSON objects + aliases, invalid rows, caps');
  {
    const c = seededCtx(html, 72);
    const P = (t) => J(c, `JSON.stringify(window.__v54.parseRows54(${JSON.stringify(t)}))`);
    check('TSV 5-col: 1 row, fields right, source/license/level blank', (() => { const p = P('사과\tQuả táo\tsagwa\t사과를 먹어요\tĐồ ăn'); return p.rows.length === 1 && p.rows[0].h === '사과' && p.rows[0].m === 'Quả táo' && p.rows[0].p === 'sagwa' && p.rows[0].e === '사과를 먹어요' && p.rows[0].g === 'Đồ ăn' && p.rows[0].source === '' && p.total === 1; })());
    check('TSV 8-col: source/license/level parsed per row', (() => { const p = P('가게\tcửa hàng\t\t\t물건 사기\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급'); return p.rows.length === 1 && p.rows[0].source === '한국어기초사전 (KRDict)' && p.rows[0].license === 'CC BY-SA 2.0 KR' && p.rows[0].level === '초급'; })());
    check('CSV comma: 2 rows parsed', P('사과,Quả táo\n밥,Cơm').rows.length === 2);
    check('JSON objects + aliases (han/meaning/example) parsed', (() => { const p = P(JSON.stringify([{ han: '물', meaning: 'nước', example: '물을 마셔요.' }])); return p.rows.length === 1 && p.rows[0].h === '물' && p.rows[0].m === 'nước' && p.rows[0].e === '물을 마셔요.'; })());
    check('JSON {rows:[...]} wrapper parsed', P(JSON.stringify({ rows: [{ h: '학교', m: 'trường học' }] })).rows.length === 1);
    check('row with no meaning is KEPT (meaning stays blank)', (() => { const p = P('집\t\t\t집에 가요.'); return p.rows.length === 1 && p.rows[0].h === '집' && p.rows[0].m === ''; })());
    check('row with no headword is invalid (no-h)', (() => { const p = P('\tKhông có từ'); return p.rows.length === 0 && p.invalid.length === 1 && p.invalid[0].why === 'no-h'; })());
    check('row with Latin-only headword is invalid (no-hangul)', (() => { const p = P('apple\tquả táo'); return p.rows.length === 0 && p.invalid.length === 1 && p.invalid[0].why === 'no-hangul'; })());
    check('empty text: 0 rows, 0 invalid', (() => { const p = P('   '); return p.rows.length === 0 && p.invalid.length === 0 && p.total === 0; })());
    check('bad JSON: invalid bad-json, 0 rows', (() => { const p = P('[{h:'); return p.rows.length === 0 && p.invalid.length === 1 && p.invalid[0].why === 'bad-json'; })());
    check('tooBig: text over 2 MB refused', (() => { const p = P('가'.repeat(2 * 1024 * 1024 + 1)); return p.tooBig === true && p.rows.length === 0; })());
    check('tooBig: 5001 rows refused', (() => { const p = P(Array(5002).join('가\tnghĩa\n')); return p.tooBig === true; })());
    check('mixed batch: 2 valid + 1 no-h + 1 no-hangul counted', (() => { const p = P('가게\tcửa hàng\n\ttrống\napple\ttáo\n학교\ttrường học'); return p.rows.length === 2 && p.invalid.length === 2 && p.total === 4; })());
  }

  // ================= §54B dryRun54 =================
  section('§54B', 'dryRun54 — dedup existing + in-batch, distinct senses kept, no-source/no-license excluded');
  {
    const c = seededCtx(html, 73);
    check('seed 2 existing cards', seedCards54(c, EXIST54) === 2);
    const pv = dry54(c, `{text:${JSON.stringify(IMP_TSV)}}`, `{deckName:'Bộ test 54', source:'', license:'', level:''}`);
    check('preview ok, total 7', pv.ok === true && pv.total === 7, pv);
    check('willAdd 2 (new sense 사과/quả táo chua + 학교/trường học)', pv.willAdd === 2, pv);
    check('dupExisting 2 (사과/quả táo, 밥/cơm)', pv.dupExisting === 2, pv);
    check('dupBatch 1 (second 학교/trường học)', pv.dupBatch === 1, pv);
    check('noSource 1 (김치)', pv.noSource === 1, pv);
    check('noLicense 1 (물)', pv.noLicense === 1, pv);
    check('sample lists the 2 will-add rows in order', pv.sample.length === 2 && pv.sample[0].h === '사과' && pv.sample[0].m === 'quả táo chua' && pv.sample[1].h === '학교', pv.sample);
    check('sample rows carry source/license/level', pv.sample[0].source === '한국어기초사전 (KRDict)' && pv.sample[0].license === 'CC BY-SA 2.0 KR' && pv.sample[0].level === '초급');
    check('dups list names the existing duplicates', pv.dups.length === 3 && pv.dups.some(function (d) { return d.h === '사과' && d.m === 'quả táo'; }), pv.dups);
    check('skipped list names no-source/no-license rows with reasons', pv.skipped.some(function (d) { return d.h === '김치' && d.why === 'no-source'; }) && pv.skipped.some(function (d) { return d.h === '물' && d.why === 'no-license'; }), pv.skipped);
    check('dry-run writes nothing (cards still 2)', cards54(c).length === 2);
    check('dry-run writes nothing (no en54 backup yet)', E(c, `(function(){try{return (S.v7.en54&&S.v7.en54.backups||[]).length}catch(e){return -1}})()`) === 0);
    const pv2 = dry54(c, `{text:${JSON.stringify('김치\tkim chi\n물\tnước')}}`, `{deckName:'Bộ test 54', source:'Nguồn của tôi', license:'Tự biên soạn (của tôi)', level:'TOPIK 1'}`);
    check('form defaults fill missing per-row source/license (both rows willAdd)', pv2.ok === true && pv2.willAdd === 2 && pv2.noSource === 0 && pv2.noLicense === 0, pv2);
    check('form defaults recorded on the preview', pv2.source === 'Nguồn của tôi' && pv2.license === 'Tự biên soạn (của tôi)' && pv2.level === 'TOPIK 1');
    E(c, `window.__v54.setFlag('koImport', false)`);
    const pvOff = dry54(c, `{text:${JSON.stringify(IMP_TSV)}}`, `{}`);
    check('flag off: dry-run refuses (flag-off)', pvOff.ok === false && pvOff.why === 'flag-off', pvOff);
    E(c, `window.__v54.setFlag('koImport', true)`);
    check('flag back on: dry-run works again', dry54(c, `{text:${JSON.stringify(IMP_TSV)}}`, `{}`).ok === true);
    checkRatio('.v54tag badge: white on #1e3a5f (need 7:1)', '#ffffff', '#1e3a5f', 7);
    checkRatio('.v54msg gold #FFD76A on .v54in bg #201535 (need 4.5:1)', '#FFD76A', '#201535', 4.5);
  }

  // ================= §54C confirmImport54 =================
  section('§54C', 'confirmImport54 — new deck, new IDs, provenance on cards, old cards untouched');
  {
    const c = seededCtx(html, 74);
    check('seed 2 existing cards', seedCards54(c, EXIST54) === 2);
    const pv = dry54(c, `{text:${JSON.stringify(IMP_TSV)}}`, `{deckName:'Bộ test 54', source:'', license:'', level:''}`);
    const r = J(c, `JSON.stringify(window.__v54.confirmImport54(${JSON.stringify(pv)}))`);
    check('confirm ok, added 2, deckName kept, backupKey + batchId returned', r.ok === true && r.added === 2 && r.deckName === 'Bộ test 54' && !!r.backupKey && !!r.batchId, r);
    const all = cards54(c);
    check('cards now 4 (2 old + 2 new)', all.length === 4, all.length);
    check('new deck exists with the preview name', E(c, `S.decks.some(function(d){return d.name==='Bộ test 54'})`) === true);
    const news = all.filter(function (x) { return x.src !== ''; });
    check('exactly the 2 new cards carry src/lic/lvl', news.length === 2 && news.every(function (x) { return x.src === '한국어기초사전 (KRDict)' && x.lic === 'CC BY-SA 2.0 KR' && x.lvl === '초급'; }), news);
    check('new cards have NEW ids (not x0/x1) and box 0, due 0', news.every(function (x) { return x.id !== 'x0' && x.id !== 'x1' && x.box === 0 && x.due === 0; }), news);
    check('new cards sit in the new deck', E(c, `S.cards.filter(function(cc){return cc.src}).every(function(cc){return S.decks.filter(function(d){return d.name==='Bộ test 54'})[0].id===cc.d})`) === true);
    check('old cards untouched (ids, boxes, no src)', all.filter(function (x) { return x.id === 'x0' || x.id === 'x1'; }).length === 2 && all.filter(function (x) { return x.id === 'x0'; })[0].box === 1, all);
    const b = J(c, `JSON.stringify(S.v7.en54.batches[0])`);
    check('batch recorded: count 2, deckName, backupKey, dupSkipped 3', b.count === 2 && b.deckName === 'Bộ test 54' && b.backupKey === r.backupKey && b.dupSkipped === 3, b);
    const st = J(c, `JSON.stringify(S.v7.en54.stats)`);
    check('stats: imported 2, decks 1', st.imported === 2 && st.decks === 1, st);
    const r2 = J(c, `JSON.stringify(window.__v54.confirmImport54(${JSON.stringify(pv)}))`);
    check('confirming the SAME preview again refuses (preview-stale)', r2.ok === false && r2.why === 'preview-stale', r2);
    check('cards still 4 after the refused re-confirm', cards54(c).length === 4);
    const pvEmpty = dry54(c, `{text:''}`, `{deckName:'Trống'}`);
    const r3 = J(c, `JSON.stringify(window.__v54.confirmImport54(${JSON.stringify(pvEmpty)}))`);
    check('empty preview refuses (nothing-to-add)', r3.ok === false && r3.why === 'nothing-to-add', r3);
    const r4 = J(c, `JSON.stringify(window.__v54.confirmImport54(null))`);
    check('null preview refuses (no-preview)', r4.ok === false && r4.why === 'no-preview', r4);
  }

  // ================= §54D backup / undo =================
  section('§54D', 'backup + undo — snapshot before write, restore, cap, no-backup refusal');
  {
    const c = seededCtx(html, 75);
    check('seed 2 existing cards', seedCards54(c, EXIST54) === 2);
    const pv = dry54(c, `{text:${JSON.stringify(IMP_TSV)}}`, `{deckName:'Bộ test 54', source:'', license:'', level:''}`);
    const r = J(c, `JSON.stringify(window.__v54.confirmImport54(${JSON.stringify(pv)}))`);
    check('import ok', r.ok === true, r);
    const bk = J(c, `JSON.stringify(S.v7.en54.backups[0])`);
    check('1 backup recorded, key is preimport54, 2 cards / 2 decks snapshotted', bk.key.indexOf('hanvocab.v12.preimport54-') === 0 && bk.cards === 2 && bk.decks === 2, bk);
    const snap = J(c, `JSON.stringify(JSON.parse(localStorage.getItem(${JSON.stringify(bk.key)})))`);
    check('snapshot content is the PRE-import state (2 cards, x0/x1, no new deck)', snap.cards.length === 2 && snap.cards.some(function (x) { return x.id === 'x0'; }) && snap.decks.length === 2, { cards: snap.cards.length, decks: snap.decks.length });
    const u = J(c, `JSON.stringify(window.__v54.undoImport54(${JSON.stringify(r.batchId)}))`);
    check('undo ok, restores 2 cards', u.ok === true && u.cards === 2, u);
    check('cards back to 2 after undo', cards54(c).length === 2);
    check('new deck gone after undo', E(c, `!S.decks.some(function(d){return d.name==='Bộ test 54'})`) === true);
    check('batch removed after undo', E(c, `S.v7.en54.batches.length`) === 0);
    const u2 = J(c, `JSON.stringify(window.__v54.undoImport54(${JSON.stringify(r.batchId)}))`);
    check('undo twice refuses (no-batch)', u2.ok === false && u2.why === 'no-batch', u2);
    const rb = J(c, `JSON.stringify(window.__v54.restoreBackup54('hanvocab.v12.preimport54-nope'))`);
    check('restore of a missing key refuses (no-snapshot)', rb.ok === false && rb.why === 'no-snapshot', rb);
    // Snapshot failure must refuse the write.
    const c2 = seededCtx(html, 76);
    check('seed 2 existing cards (ctx2)', seedCards54(c2, EXIST54) === 2);
    const pv2 = dry54(c2, `{text:${JSON.stringify(IMP_TSV)}}`, `{deckName:'Bộ test 54', source:'', license:'', level:''}`);
    E(c2, `localStorage.setItem=function(){throw new Error('quota full')}`);
    const rFail = J(c2, `JSON.stringify(window.__v54.confirmImport54(${JSON.stringify(pv2)}))`);
    check('snapshot failure refuses the import (no-backup)', rFail.ok === false && rFail.why === 'no-backup', rFail);
    check('cards still 2 after the refused import', cards54(c2).length === 2);
    // Backup cap: 4 snapshots -> 3 kept, oldest key removed.
    const c3 = seededCtx(html, 77);
    check('seed 2 existing cards (ctx3)', seedCards54(c3, EXIST54) === 2);
    const keys = J(c3, `JSON.stringify([0,1,2,3].map(function(){return window.__v54.snapshotBeforeImport54()}))`);
    check('4 snapshots taken', keys.length === 4 && keys.every(function (k) { return k.indexOf('hanvocab.v12.preimport54-') === 0; }), keys);
    check('backups capped at 3', E(c3, `S.v7.en54.backups.length`) === 3);
    check('oldest snapshot key removed from localStorage', E(c3, `localStorage.getItem(${JSON.stringify(keys[0])})`) === null);
    check('newest snapshot key still present', E(c3, `localStorage.getItem(${JSON.stringify(keys[3])})`) !== null);
  }

  // ================= §54E seed import =================
  section('§54E', 'seed import — KRDict 50 rows, VI gloss, examples, provenance, dedup on re-import');
  {
    const c = seededCtx(html, 78);
    const seed = J(c, `JSON.stringify(window.__V54_SEED)`);
    check('seed: 50 rows', seed.rows.length === 50, seed.rows.length);
    check('seed: every row has a Vietnamese gloss', seed.rows.every(function (r) { return r.m && r.glossLang === 'vi'; }));
    check('seed: every row has a full-sentence example', seed.rows.every(function (r) { return r.e && r.e.split(' ').length >= 2; }));
    check('seed: every row carries source + CC BY-SA 2.0 KR + KRDict id', seed.rows.every(function (r) { return r.src && r.src.indexOf('한국어기초사전') >= 0 && r.lic === 'CC BY-SA 2.0 KR' && r.krdictId; }));
    check('seed: no row overlaps the 20 game seed headwords', (() => { const game = ['안녕하세요', '감사합니다', '죄송합니다', '네', '아니요', '물', '밥', '김치', '학교', '친구', '가족', '사랑', '시간', '공부하다', '먹다', '가다', '오다', '크다', '작다', '예쁘다']; return seed.rows.every(function (r) { return game.indexOf(r.h) < 0; }); })());
    const pv = J(c, `JSON.stringify(window.__v54.seedPreview54())`);
    check('seed dry-run ok, willAdd 50 on a fresh save', pv.ok === true && pv.willAdd === 50 && pv.total === 50, { ok: pv.ok, willAdd: pv.willAdd, total: pv.total });
    check('seed dry-run deck is the KRDict deck', pv.deckName === 'KRDict · 초급 (50 từ)', pv.deckName);
    const r = J(c, `JSON.stringify(window.__v54.importSeed54(${JSON.stringify(pv)}))`);
    check('seed import ok, added 50', r.ok === true && r.added === 50, r);
    const all = cards54(c);
    check('cards now 70 (20 game seed + 50 imported)', all.length === 70, all.length);
    const imported = all.filter(function (x) { return x.src !== ''; });
    check('all 50 imported cards carry src/lic/lvl/kid/gl=vi', imported.length === 50 && imported.every(function (x) { return x.lic === 'CC BY-SA 2.0 KR' && x.lvl === '초급' && x.kid && x.gl === 'vi'; }), imported.length);
    check('seed deck created', E(c, `S.decks.some(function(d){return d.name==='KRDict · 초급 (50 từ)'})`) === true);
    const pv2 = J(c, `JSON.stringify(window.__v54.seedPreview54())`);
    check('re-import dry-run: willAdd 0 (all 50 now dupExisting)', pv2.ok === true && pv2.willAdd === 0 && pv2.dupExisting === 50, { willAdd: pv2.willAdd, dupExisting: pv2.dupExisting });
  }

  // ================= §54F Forge pool consequence + regressions =================
  section('§54F', 'Forge pool consequence — imported seed cards feed the KO pool; EN/V51/V52/V53 hold');
  {
    const c = seededCtx(html, 79);
    const pv = J(c, `JSON.stringify(window.__v54.seedPreview54())`);
    const r = J(c, `JSON.stringify(window.__v54.importSeed54(${JSON.stringify(pv)}))`);
    check('seed import ok', r.ok === true, r);
    const learned = J(c, `JSON.stringify((function(){
      var n=0;
      S.cards.forEach(function(cc){ if(cc.src){ cc.box=1; n++; } });
      return n;
    })())`);
    check('50 imported cards marked learned', learned === 50, learned);
    const pool = J(c, `JSON.stringify((function(){
      var p=window.__v48._test.forgePool('ko');
      return {koSent:p.koSent, items:p.items.length, ids:p.items.map(function(it){return it.cardId})};
    })())`);
    const seedIds = J(c, `JSON.stringify(S.cards.filter(function(cc){return !!cc.src}).map(function(cc){return cc.id}))`);
    check('KO Forge pool now holds all 50 seed sentences (was 0 from example-less imports)', pool.koSent >= 50 && pool.items === pool.koSent && seedIds.length === 50 && seedIds.every(function (id) { return pool.ids.indexOf(id) >= 0; }), { koSent: pool.koSent, seedInPool: seedIds.filter(function (id) { return pool.ids.indexOf(id) >= 0; }).length });
    const gate = J(c, `JSON.stringify(window.__v48._test.forgeGate('ko'))`);
    check('KO Forge gate now opens', gate.ok === true, gate);
    // V53 regression: KO_A pool still 12.
    const cA = seededCtx(html, 80);
    check('KO_A seed loads (18 cards)', seedKO(cA, KO_A) === 18);
    const pA = koPool(cA);
    check('V53 regression: KO_A pool still 12 (8 learned + 4 unlearned)', pA.n === 12 && pA.learnedItems === 8 && pA.unlearnedItems === 4, pA);
    // EN Forge regression: V51 genPool still generates from a learned scope.
    const cE = seededCtx(html, 81);
    const nLearned = seedLearned(cE, function (w) { return w.en && w.en.length > 2; }, 1);
    check('EN seed: some words learned', nLearned > 50, nLearned);
    const gen = J(cE, `JSON.stringify((function(){ var g=window.__v51.genPool(); return g&&g.items?{n:g.items.length,gen:g.genCount}:null; })())`);
    check('V51 regression: genPool still generates EN sentences', gen && gen.n >= 5 && gen.gen >= 1, gen);
    check('V52 regression: __v52.speak still exported', E(cE, `typeof window.__v52.speak`) === 'function');
    check('V53 regression: __v53.koPool53 still exported', E(cE, `typeof window.__v53.koPool53`) === 'function');
  }

  // ================= §R0 repro-first =================
  section('§R0', 'repro-first — pristine V19.6.1 shows the 6 defects V19.7 fixes');
  {
    const pc = seededCtx(pristineHtml, 82);
    check('R1 pristine: no __v54 export', E(pc, `typeof window.__v54==='undefined'`));
    check('R2 pristine: no dryRun', E(pc, `typeof window.__v54==='undefined'||typeof window.__v54.dryRun!=='function'`));
    check('R3 pristine: no snapshotBeforeImport', E(pc, `typeof window.__v54==='undefined'||typeof window.__v54.snapshotBeforeImport!=='function'`));
    const r4 = J(pc, `JSON.stringify((function(){
      var rows = toCards(parseTable('사과\\tQuả táo\\tsagwa\\t사과를 먹어요\\tĐồ ăn'));
      var row = rows[0] || {};
      return {hasSrc: ('src' in row), hasLic: ('lic' in row), hasLvl: ('lvl' in row)};
    })())`);
    check('R4 pristine: imported cards carry no source/license/level', !(r4.hasSrc || r4.hasLic || r4.hasLvl), r4);
    check('R5 pristine: no __V54_SEED', E(pc, `typeof window.__V54_SEED==='undefined'`));
    const r6 = J(pc, `JSON.stringify((function(){
      var s; try{ s=S; }catch(e){ return {err:'no S'}; }
      s.cards = [0,1,2,3,4,5,6,7].map(function(i){
        return {id:'n'+i, d:'d0', h:'단어'+i, m:'từ '+i, p:'', e:'', g:'', box:1, due:0};
      });
      s.decks = [{id:'d0', name:'Bộ mặc định'}]; s.deck = 'd0';
      var p = window.__v48._test.forgePool('ko');
      var g = window.__v48._test.forgeGate('ko');
      return {koSent: p.koSent, gateOk: g.ok, why: g.why || null};
    })())`);
    check('R6 pristine: example-less imports feed 0 Forge sentences', r6.koSent === 0 && r6.gateOk === false && r6.why === 'ko-sent', r6);
  }

  // ================= §V save schema =================
  section('§V', 'save schema — en54 lazy, own keys only, no surprise localStorage keys');
  {
    const fresh = seededCtx(html, 83);
    const before = J(fresh, `JSON.stringify((function(){
      var s=S;
      var lsKeys=[];try{for(var i=0;i<localStorage.length;i++)lsKeys.push(localStorage.key(i))}catch(e){}
      return {keys:Object.keys(s.v7||{}).sort(), ls:lsKeys};
    })())`);
    check('fresh boot: no en54 key before any V54 use', before.keys.indexOf('en54') < 0, before.keys);
    check('fresh boot: no preimport54 key before any import', before.ls.filter(function (k) { return k.indexOf('preimport54') === 0; }).length === 0, before.ls);
    E(fresh, `window.__v54.en54()`);
    const afterEn = J(fresh, `JSON.stringify(Object.keys(S.v7||{}).sort())`);
    check('en54 created lazily on first use (and nothing else new)', JSON.stringify(afterEn.filter(function (k) { return k !== 'en54'; })) === JSON.stringify(before.keys), { before: before.keys, after: afterEn });
    const e54 = J(fresh, `JSON.stringify(S.v7.en54)`);
    check('en54 shape: flags koImport=1, batches/backups arrays, stats', e54.flags.koImport === 1 && Array.isArray(e54.batches) && Array.isArray(e54.backups) && typeof e54.stats.imported === 'number');
    const lsAfterEn = J(fresh, `JSON.stringify((function(){var ks=[];try{for(var i=0;i<localStorage.length;i++)ks.push(localStorage.key(i))}catch(e){}return ks})())`);
    check('no new localStorage key from merely opening en54 state', JSON.stringify(lsAfterEn) === JSON.stringify(before.ls), { before: before.ls, after: lsAfterEn });
    // An import adds exactly one new localStorage family (preimport54-*).
    const c = seededCtx(html, 84);
    check('seed 2 existing cards', seedCards54(c, EXIST54) === 2);
    const pv = dry54(c, `{text:${JSON.stringify(IMP_TSV)}}`, `{deckName:'Bộ test 54', source:'', license:'', level:''}`);
    const r = J(c, `JSON.stringify(window.__v54.confirmImport54(${JSON.stringify(pv)}))`);
    check('import ok', r.ok === true, r);
    const lsAfter = J(c, `JSON.stringify((function(){var ks=[];try{for(var i=0;i<localStorage.length;i++)ks.push(localStorage.key(i))}catch(e){}return ks})())`);
    check('after import: exactly one preimport54 key exists', lsAfter.filter(function (k) { return k.indexOf('preimport54') >= 0; }).length === 1, lsAfter);
    check('old save keys untouched (hanvocab.v1 still the only save key family)', lsAfter.filter(function (k) { return k.indexOf('hanvocab.v1') === 0; }).length >= 1);
  }

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in Node vm)');
  {
    skipCheck('C.1 import overlay paint + dry-run preview by real clicks (light + dark)', 'real Chrome gate in verify-v54c.js');
    skipCheck('C.2 360px overflow on the import overlay with the preview table', 'real Chrome gate in verify-v54c.js');
    skipCheck('C.3 live seed import end-to-end (real DOM)', 'real Chrome gate in verify-v54c.js');
    skipCheck('C.4 real Android TTS end-to-end', 'headless Chrome has no voices; Anh tests on his phone');
    skipCheck('C.5 live Firebase login/sync', 'never tested live, as in every version');
  }

  console.log(`\n== test54 summary ==\nPASS ${pass}  FAIL ${fail}  SKIP ${skip}`);
  for (const [id, sc] of Object.entries(secCounts)) console.log(`  ${id}: ${sc.pass} pass / ${sc.fail} fail / ${sc.skip} skip`);
  if (failures.length) console.log('FAILURES:\n  ' + failures.join('\n  '));
  process.exit(fail ? 1 : 0);
}
main();
