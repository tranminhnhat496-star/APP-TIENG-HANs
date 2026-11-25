// test52.js - V19.5.1 (layer V52) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v50/test50.js; only the EXPECTED_SHA /
// EXPECTED_BYTES constants, the §0 static checks and the V52-specific
// sections (§13-§14) were replaced/added. The V49/V50 sections (§1-§12)
// are kept as regression spot-checks (plus en52 save-key checks in §7k
// and v52 hygiene checks in §8).
// Usage: node tools/v52/test52.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// The Node process is exited explicitly at the end: the game starts
// real setInterval timers (e.g. Matching) that keep the event loop
// alive after the checks finish.
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V52
//         fragments with exact counts, old V52 fragments gone,
//         V33-V50 fragments survive, v15 speakRecord + v48 dojoListen
//         untouched)
//   section 1 D1 fixed (V49 regression) — handlers before start()
//   section 2 D2 fixed (V49 regression) — listening state
//   section 3 D3 fixed (V49 regression) — start() failure visible
//   section 4 D4 fixed (V49 regression) — onend, no freeze
//   section 5 D5 fixed (V49 regression) — timer guard + token
//   section 6 D6 fixed (V49 regression) — one message per error code
//   section 7 regressions (V49) — voice XP parity, full wizard fight
//         won by voice, non-speak boss unaffected, KO speak->mc,
//         no-SR honest state, nextQ clears speak state, v15/v48
//         untouched, WORDS 4892 / a1a2 998 / Oxford 3395, legDiff,
//         TOTAL_BOSSES 87, golem Lv 77
//   section 8 structure (V49/V50) — v49/v50.js hygiene, marker order,
//         + v52.js hygiene and __v52 version at runtime
//   section 9 F-1 FIXED (V50 regression) — fight() restart aborts the
//         live rec and the token is monotonic across fights
//   section 10 C-R5-2 FIXED (V50 regression) — due-less learned words
//         read "Đến hạn hôm nay" in classifyEN/classifyKO
//   section 11 C-R5-3 FIXED (V50 regression) — Forge score tracked
//   section 12 C-R5-4 FIXED (V50 regression, static) — KO Hub 44px
//   section 13 C-R5-1 FIXED (V52) — grammar/sentence pay +10 XP +
//         streak through the shared V46 function, wordless (both
//         engines); word SRS / recordAnswer untouched by wordless
//         answers; wrong wordless pays 0 + resets the streak; KO
//         parity; EN word-answer XP byte-identical to pristine V19.5
//   section 14 Android TTS FIXED (V52) — shared __v52 helper unit
//         tests (fake timers/clock: voice pick, delayed voices,
//         never-loads, cancel behaviour, onerror, unsupported,
//         latest-wins queue) + live speak paths (speakWord, speakKO
//         v18/v19, speakKOText v27, Dojo speakText; delayed voices;
//         no-voice honest error) + speak22 live via BT entry (async)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint); the
// painted fight card, the real click + answer states, the 360px
// overflow check, and the per-question screens are Chrome gates in
// verify-v52c.js, not asserted here; real Android audio and the
// real-microphone end-to-end stay Anh-only (headless Chrome has no
// voices, no audio, no mic); live-browser, real-phone and
// live-Firebase gates stay Chrome/Anh-only.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = '2bc0726d643765538cc18da0bc73903604220ef556851afc13c1a3b81f46ad5f';
const EXPECTED_BYTES = 2539378;
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
// (harness notes above; the V46 comment block from test47 was dropped here)


// ================= test main (V19.5 — round-5 bug fixes, Node vm) =================
// The controllable SpeechRecognition stub is installed AFTER boot:
// bossSpeak() reads window.SpeechRecognition at call time, so a
// post-boot install is exact (same technique as repro-v49.js).
const SR_STUB = `
window.SpeechRecognition = function(){
  var self=this; window.__lastSR49=self;
  self.lang=''; self.interimResults=false; self.maxAlternatives=3;
  self.onresult=null; self.onerror=null; self.onend=null;
  self._aborted=false; self._lostSync=false;
  self.start=function(){
    if(window.__SRMODE==='throw'){ throw new Error('mic-start-throw'); }
    if(window.__SRMODE==='syncfire'){
      self._lostSync = !self.onresult;
      if(self.onresult) self.onresult({results:[[{transcript: window.__SRWORD||'apple'}]]});
    }
  };
  self.abort=function(){ self._aborted=true; };
  self.stop=function(){};
  self.fireResult=function(t){ if(self.onresult) self.onresult({results:[[{transcript:t}]]}); };
  self.fireError=function(code){ if(self.onerror) self.onerror({error:code}); };
  self.fireEnd=function(){ if(self.onend) self.onend(); };
};
window.webkitSpeechRecognition = window.SpeechRecognition;`;
function installSR(ctx) { E(ctx, SR_STUB); }
function setSRMode(ctx, m) { E(ctx, `window.__SRMODE=${JSON.stringify(m)};`); }
function startWizard(ctx) {
  // Seed every non-old v18 boss won, then fight the wizard (speak, Lv 8).
  return J(ctx, `JSON.stringify((function(){
    var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
    var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
    v18.fight('v10_wizard','en');
    var F=v18._test.F();
    return {live:!!F, qmode:F&&F.qmode, word:F&&F.cur&&F.cur.w&&F.cur.w.en, boss:F&&F.boss&&F.boss.id, timer:!!(F&&F.timer), left:F&&F.left};
  })())`);
}
function F18(ctx) {
  return J(ctx, `JSON.stringify((function(){var F=window.__v18._test.F(); if(!F) return null;
    return {answered:F.answered, ok:F.ok, hearts:F.hearts, hp:F.hp, qmode:F.qmode,
      word:F.cur&&F.cur.w&&F.cur.w.en, heard:F.heard||null, listening:!!F.listening,
      err:F.speakErr||null, token:F.speakToken||0, timer:!!F.timer, left:F.left||0, over:F.over};})())`);
}
function F19(ctx) {
  return J(ctx, `JSON.stringify((function(){var F=window.__v19._test.F(); if(!F) return null;
    return {answered:F.answered, ok:F.ok, hearts:F.hearts, hp:F.hp, qmode:F.qmode,
      word:F.cur&&F.cur.w&&F.cur.w.en, heard:F.heard||null, listening:!!F.listening,
      err:F.speakErr||null, token:F.speakToken||0, timer:!!F.timer, left:F.left||0, over:F.over};})())`);
}
function fightHTML18(ctx) { return J(ctx, `JSON.stringify((document.querySelector('#v18fight')||{}).innerHTML || '')`); }
function fightHTML19(ctx) { return J(ctx, `JSON.stringify((document.querySelector('#v19fight')||{}).innerHTML || '')`); }
function xp(ctx) { return J(ctx, `S.xp||0`); }
function speakState18(ctx) { return J(ctx, `JSON.stringify(window.__v18.speakState())`); }
function speakState19(ctx) { return J(ctx, `JSON.stringify(window.__v19.speakState())`); }
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
function mulberry32(seed) { let s = seed | 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let __seed = 11;
// Load a page from arbitrary html text with an explicit seed (used by
// §13f: the same seed drives the same draws on the new build and on
// the pristine V19.5 base).
function seededCtxFrom(htmlText, seed) {
  const c = makeCtx();
  c.__seededRandom = mulberry32(seed);
  E(c, 'Math.random=__seededRandom;');
  const loaded = loadPage(c, htmlText);
  if (loaded.loadErr) { console.log('LOAD ERR (seed ' + seed + '):', loaded.loadErr); process.exit(1); }
  fireDCL(c);
  E(c, 'window.__v15.buildWords()');
  dynIds.add('v19fight');
  return c;
}
function seededCtx() {
  const seed = __seed++;
  const c = makeCtx();
  c.__seededRandom = mulberry32(seed);
  E(c, 'Math.random=__seededRandom;');
  const loaded = loadPage(c, html);
  if (loaded.loadErr) { console.log('LOAD ERR (seed ' + seed + '):', loaded.loadErr); process.exit(1); }
  fireDCL(c);
  E(c, 'window.__v15.buildWords()');
  dynIds.add('v19fight');
  return c;
}

// ---------- section 0: static build integrity ----------
section('0', 'static build integrity (V19.5.1)');
{
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, 'index.html'))).digest('hex');
  const bytes = fs.statSync(path.join(DIR, 'index.html')).size;
  check('0.1 index.html sha256 == V19.5.1 build', sha === EXPECTED_SHA, sha.slice(0, 12));
  check('0.2 index.html bytes == 2539378', bytes === EXPECTED_BYTES, bytes);
  check('0.3 title is V19.5.1 Round5 Patch', html.includes('V19.5.1 — Round5 Patch'));
  check('0.4 no V19.5 title remains', !html.includes('V19.5 — Round5 Bug Fixes'));
  check('0.5 __v52 19.5.1 present', html.includes("window.__v52={") && html.includes("VERSION='19.5.1'"));
  check('0.6 v52js marker present once', countOcc(html, 'id="v52js"') === 1);
  const styleIds = [...html.matchAll(/<style id="(v\d+)"/g)].map(m => m[1]);
  const scriptIds = [...html.matchAll(/<script id="(v\d+)js"/g)].map(m => m[1]);
  check('0.7 v50 style is still the last style marker (V52 ships no CSS)', styleIds[styleIds.length - 1] === 'v50', styleIds.slice(-3));
  check('0.8 v52 script is the last script marker', scriptIds[scriptIds.length - 1] === 'v52', scriptIds.slice(-3));
  check('0.9 v52js after v50js', html.indexOf('id="v52js"') > html.indexOf('id="v50js"'));
  check('0.10 old versions intact (19.5.0 + 19.4.0 + 19.3.0)', html.includes("VERSION='19.5.0'") && html.includes("VERSION='19.4.0'") && html.includes("VERSION='19.3.0'"));
  check('0.11 speakErrMsg 15x unchanged (3 in v49.js + 6 per engine)', countOcc(html, 'speakErrMsg') === 15, countOcc(html, 'speakErrMsg'));
  check('0.12 stopSpeak() 14x (2 defs + 6 calls + 6 comment mentions)', countOcc(html, 'stopSpeak()') === 14, countOcc(html, 'stopSpeak()'));
  check('0.13 stopSpeak() call lines x6 (next + close + startFight per engine)', countOcc(html, '  stopSpeak();') === 6, countOcc(html, '  stopSpeak();'));
  check('0.14 speakState def + export x2 each', countOcc(html, 'function speakState(){') === 2 && countOcc(html, 'speakState:speakState,') === 2);
  check('0.15 speak timer guard x2', countOcc(html, "if(F.qmode==='speak'){F.left=0;return}") === 2);
  check('0.16 nextQ speak-state clear x2', countOcc(html, 'F.listening=false;F.rec=null;F.heard=null;F.speakErr=null;') === 2);
  check('0.17 F-literal token init is now _speakSeq50 (x2), old reset gone', countOcc(html, 'speakToken:_speakSeq50,speakErr:null,') === 2 && countOcc(html, 'speakToken:0,speakErr:null,') === 0);
  check('0.18 _speakSeq50 7x (3 per engine + 1 in v50.js docstring)', countOcc(html, '_speakSeq50') === 7, countOcc(html, '_speakSeq50'));
  check('0.19 v49listen + v49err cards x2 each', countOcc(html, 'class="v49listen"') === 2 && countOcc(html, 'class="v49err"') === 2);
  check('0.20 silent start-catch survives only in v15.js:1537 (bossSpeak copies gone)', countOcc(html, '  try{rec.start()}catch(e){return}') === 1, countOcc(html, '  try{rec.start()}catch(e){return}'));
  check('0.21 old generic onerror gone', !html.includes("rec.onerror=function(){F.heard='(không nghe được)';renderFight()};"));
  check('0.22 old bossSpeak entry gone (F.cur.w unguarded)', !html.includes('  var w=F.cur.w;if(!w)return;'));
  check('0.23 v48 fragments survive (golem Lv 77, TOTAL_BOSSES 87)', html.includes('lv:77') && html.includes('var TOTAL_BOSSES=87;') && html.includes('v48kotab'));
  check('0.24 v15 speakRecord + v48 dojoListen untouched', countOcc(html, 'function speakRecord(') === 1 && countOcc(html, 'function dojoListen(') === 1);
  check('0.25 WORDS 4892 / a1a2 998 / Oxford 3395', countOcc(html, '"src": "a1a2"') === 998 && countOcc(html, '"src": "oxford"') === 3395);
  check('0.26 out/v50.js + out/v50.css == src/', fs.readFileSync(path.join(DIR, 'v50.js'), 'utf8') === fs.readFileSync(path.join(ROOT, 'src', 'v50.js'), 'utf8') && fs.readFileSync(path.join(DIR, 'v50.css'), 'utf8') === fs.readFileSync(path.join(ROOT, 'src', 'v50.css'), 'utf8'));
  check('0.27 out/v18.js + out/v19.js + out/v27.js + out/v48.js == src/', ['v18.js', 'v19.js', 'v27.js', 'v48.js'].every(n => fs.readFileSync(path.join(DIR, n), 'utf8') === fs.readFileSync(path.join(ROOT, 'src', n), 'utf8')));
  check('0.28 C-R5-2: prioOf guard x1, classify od guard x2, epoch fragments gone', countOcc(html, 'var overdue=(box>0&&due)?Math.max(0,(now-due)/864e5):0;') === 1 && countOcc(html, 'var od=due?Math.floor(Math.max(0,(now-due)/864e5)):0;') === 2 && countOcc(html, 'Math.max(0,(now-(due||0))/864e5)') === 0 && countOcc(html, 'var od=Math.floor(Math.max(0,(now-due)/864e5));') === 0);
  check('0.29 C-R5-3: scoreTotal/bestScore defaults x2, accumulation + persist + end-screen lines', countOcc(html, 'scoreTotal:0,bestScore:0') === 2 && countOcc(html, 'FS.score=(FS.score||0)+sc;') === 1 && countOcc(html, 'e.forge.scoreTotal=(e.forge.scoreTotal||0)+(FS.score||0);') === 1 && countOcc(html, 'if((e.forge.bestScore||0)<(FS.score||0))e.forge.bestScore=FS.score;') === 1 && countOcc(html, "Điểm buổi: '+(FS.score||0)+' điểm") === 1 && countOcc(html, 'score:ok?scoreSentence(cur.tokens.length,cur.tier):0') === 0);
  check('0.30 C-R5-4: 44px rules (.v7btn / :root #sk,#sn / #v21avatarbtn / .v15link / .tabs .tab)', countOcc(html, '.v7btn{min-height:44px}') === 1 && countOcc(html, ':root #sk,:root #sn{min-height:44px}') === 1 && countOcc(html, '#v21avatarbtn{min-height:44px}') === 1 && countOcc(html, '.v15link{min-height:44px}') === 1 && countOcc(html, '.tabs .tab{min-height:44px}') === 1);
  check('0.31 out/v52.js == src/v52.js', fs.readFileSync(path.join(DIR, 'v52.js'), 'utf8') === fs.readFileSync(path.join(ROOT, 'src', 'v52.js'), 'utf8'));
  check('0.32 out/v15.js + out/v22.js == src/ (V52 TTS call sites)', ['v15.js', 'v22.js'].every(n => fs.readFileSync(path.join(DIR, n), 'utf8') === fs.readFileSync(path.join(ROOT, 'src', n), 'utf8')));
  check('0.33 C-R5-1: wordlessKey defs + new mark signatures, OLD gone', countOcc(html, 'function wordlessKey18(){') === 1 && countOcc(html, 'function wordlessKey19(){') === 1 && countOcc(html, 'function mark18(ok,w,qkey){') === 1 && countOcc(html, 'function mark19(ok,w,qkey){') === 1 && countOcc(html, 'function mark18(ok,w){') === 0 && countOcc(html, 'function mark19(ok,w){') === 0);
  check('0.34 C-R5-1: wordless V46 call + fallback guard (x2 each)', countOcc(html, 'boxUp:w?(old.box[id]>before):!!ok') === 2 && countOcc(html, '    if(ok&&(w?old.box[id]>before:true)){') === 2);
  check('0.35 TTS: getVoices + voiceschanged present, all 6 delegations', countOcc(html, 'getVoices') >= 3 && countOcc(html, 'voiceschanged') >= 2 && countOcc(html, "__v52.speak(text,lang||'en-US',.85") === 1 && countOcc(html, "__v52.speak(text,'ko-KR',.8,") === 2 && countOcc(html, "__v52.speak(text,'en-US',.85") === 1 && countOcc(html, "__v52.speak(text,'ko-KR',.85") === 1 && countOcc(html, "__v52.speak(text,(lang==='ko'?'ko-KR':'en-US'),.85") === 1);
  check('0.36 TTS: honest-error message x8 (2 in v52.js + 6 call sites)', countOcc(html, 'Không phát được âm thanh — bấm Nghe lại.') === 8, countOcc(html, 'Không phát được âm thanh — bấm Nghe lại.'));
  check('0.37 TTS: OLD speak15 one-liner gone', countOcc(html, "function speak15(text,lang){try{speechSynthesis.cancel()") === 0);
}

// ---------- section 1: D1 fixed — handlers before start() ----------
section('1', 'D1 fixed — handlers attached before start()');
{
  const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'syncfire');
  const w = startWizard(ctx);
  check('1.1 wizard fight is live, speak question', w.live === true && w.qmode === 'speak' && typeof w.word === 'string', w);
  E(ctx, `window.__SRWORD=${JSON.stringify(w.word)};`);
  E(ctx, `window.__v18.bossSpeak()`);
  const f = F18(ctx);
  const lost = J(ctx, `window.__lastSR49._lostSync`);
  check('1.2 sync-fire result is NOT lost (handlers were attached)', lost === false, { lostSync: lost });
  check('1.3 correct transcript answers the question', f.answered !== null && f.ok === true, f);
  check('1.4 listening cleared after the result', f.listening === false);
  check('1.5 heard line shows the transcript', f.heard === w.word, f.heard);
  // A mismatched transcript must answer WRONG, not crash.
  const ctx2 = seededCtx(); installSR(ctx2); setSRMode(ctx2, 'syncfire');
  const w2 = startWizard(ctx2);
  E(ctx2, `window.__SRWORD="zzzznotaword";`);
  E(ctx2, `window.__v18.bossSpeak()`);
  const f2 = F18(ctx2);
  check('1.6 wrong transcript answers wrong (ok=false)', f2.answered !== null && f2.ok === false, f2);
}

// ---------- section 2: D2 fixed — listening state ----------
section('2', 'D2 fixed — listening state');
{
  const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
  const w = startWizard(ctx);
  E(ctx, `window.__v18.bossSpeak()`);
  const f = F18(ctx);
  const h = fightHTML18(ctx);
  const st = speakState18(ctx);
  check('2.1 F.listening is true while the mic is live', f.listening === true, f);
  check('2.2 speakState() hook reports listening', st && st.listening === true && st.answered === null, st);
  check('2.3 card shows "Đang nghe… hãy nói: <word>"', h.includes('Đang nghe… hãy nói:') && h.includes(w.word), h.slice(0, 200));
  check('2.4 Nói button is disabled while listening', /<button class="btn pri" disabled>Nói<\/button>/.test(h));
  check('2.5 no error box while listening', !h.includes('v49err'));
  // Double-tap while listening is ignored (single rec, same token).
  const tok0 = f.token;
  E(ctx, `window.__v18.bossSpeak()`);
  const f2 = F18(ctx);
  check('2.6 double-tap Nói while listening is ignored', f2.token === tok0 && f2.listening === true, { tok0, tok1: f2.token });
  // Answering by voice clears the listening state.
  E(ctx, `window.__lastSR49.fireResult(${JSON.stringify(w.word)})`);
  const f3 = F18(ctx);
  check('2.7 voice answer clears listening + token stays', f3.listening === false && f3.answered !== null && f3.ok === true, f3);
  const h3 = fightHTML18(ctx);
  check('2.8 listening line is gone after the answer', !h3.includes('Đang nghe…'));
}

// ---------- section 3: D3 fixed — start() failure is visible ----------
section('3', 'D3 fixed — start() failure shows a message, never silent');
{
  const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'throw');
  const w = startWizard(ctx);
  E(ctx, `window.__v18.bossSpeak()`);
  const f = F18(ctx);
  const h = fightHTML18(ctx);
  check('3.1 start() throw leaves the question unanswered', f.answered === null, f);
  check('3.2 listening is cleared after the failed start', f.listening === false);
  check('3.3 specific start-failed message is set', f.err && f.err.includes('Không mở được micro'), f.err);
  check('3.4 error box is rendered with a retry', h.includes('v49err') && h.includes('Không mở được micro') && h.includes('thử lại'), h.slice(0, 300));
  check('3.5 the generic "(không nghe được)" is never set', f.heard !== '(không nghe được)');
  check('3.6 speakState() hook reports the error', (() => { const st = speakState18(ctx); return st && st.err && st.err.includes('Không mở được micro') && st.listening === false; })());
  // The player can retry after the failure.
  setSRMode(ctx, 'silent');
  E(ctx, `window.__v18.bossSpeak()`);
  const f2 = F18(ctx);
  check('3.7 retry works after a failed start (listening again)', f2.listening === true && f2.err === null, f2);
  E(ctx, `window.__lastSR49.fireResult(${JSON.stringify(w.word)})`);
  const f3 = F18(ctx);
  check('3.8 retry + correct voice answer wins the question', f3.answered !== null && f3.ok === true, f3);
}

// ---------- section 4: D4 fixed — onend with no result is not a freeze ----------
section('4', 'D4 fixed — onend with no result shows a message, never freezes');
{
  const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
  const w = startWizard(ctx);
  E(ctx, `window.__v18.bossSpeak()`);
  E(ctx, `window.__lastSR49.fireEnd()`);
  const f = F18(ctx);
  const h = fightHTML18(ctx);
  check('4.1 onend with no result leaves the question unanswered', f.answered === null, f);
  check('4.2 listening is cleared after onend', f.listening === false);
  check('4.3 no-speech message is set', f.err && f.err.includes('không nghe thấy gì'), f.err);
  check('4.4 error box is rendered with a retry', h.includes('v49err') && h.includes('thử lại'));
  check('4.5 speakState() hook reports the error', (() => { const st = speakState18(ctx); return st && st.err && st.err.includes('không nghe thấy gì') && st.listening === false; })());
  // The player can re-tap "Nói" — the card is not frozen.
  E(ctx, `window.__v18.bossSpeak()`);
  const f2 = F18(ctx);
  check('4.6 re-tap Nói after onend starts listening again', f2.listening === true && f2.err === null, f2);
  E(ctx, `window.__lastSR49.fireResult(${JSON.stringify(w.word)})`);
  const f3 = F18(ctx);
  check('4.7 re-tap + correct voice answer wins the question', f3.answered !== null && f3.ok === true, f3);
}

// ---------- section 5: D5 fixed — timer guard + late/stale results ----------
section('5', 'D5 fixed — timer guard + per-question token');
{
  // 5a. Forced timed speak question (v18): the tiger has an 8s timer by
  // id; mutate its mode to 'speak' in the vm data and fight it.
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    E(ctx, `(function(){
      var d=window.__v18.bosses;
      (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.id==='v10_tiger') b.mode='speak'; });
      var e18=window.__v18._test.en18(); e18.bosses=e18.bosses||{};
      (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
      window.__v18.fight('v10_tiger','en');
    })()`);
    const f = F18(ctx);
    check('5a.1 forced speak question on the timed tiger', f.qmode === 'speak' && f.word, f);
    check('5a.2 no timer runs on the speak question (left 0, no interval)', f.left === 0 && f.timer === false, f);
    // The question is still answerable by voice.
    E(ctx, `window.__v18.bossSpeak()`);
    E(ctx, `window.__lastSR49.fireResult(${JSON.stringify(f.word)})`);
    const f2 = F18(ctx);
    check('5a.3 timed speak question answers by voice', f2.answered !== null && f2.ok === true, f2);
  }
  // 5b. Same guard in the v19 engine: icequeen (skill freeze -> 15s)
  // with its mode forced to 'speak'.
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    E(ctx, `(function(){
      var v19=window.__v19, e19=v19.en19(); e19.bosses=e19.bosses||{};
      window.__V19_DATA.bosses.forEach(function(b){ if(b.id==='v11_icequeen') b.mode='speak'; e19.bosses[b.id]={en:{win:1}}; });
      v19.openMapFor('en'); v19.fight('v11_icequeen');
    })()`);
    const f = F19(ctx);
    check('5b.1 forced speak question on the timed icequeen (v19)', f.qmode === 'speak' && f.word, f);
    check('5b.2 no timer runs on the speak question (v19)', f.left === 0 && f.timer === false, f);
  }
  // 5c. A late result after the question was answered is dropped.
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    const w = startWizard(ctx);
    E(ctx, `window.__v18.bossSpeak()`);
    E(ctx, `window.__v18._test.pickWrong()`);
    const before = F18(ctx);
    E(ctx, `window.__lastSR49.fireResult(${JSON.stringify(w.word)})`);
    const after = F18(ctx);
    check('5c.1 late result after an answer is dropped (answered unchanged)', after.answered === before.answered && after.ok === before.ok, { before, after });
  }
  // 5d. A stale result after next() NEVER answers the next question
  // (the D5c corruption from the repro: the old transcript used to
  // mark the new question correct).
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    const w = startWizard(ctx);
    E(ctx, `window.__v18.bossSpeak()`);
    E(ctx, `window.__v18._test.pickWrong()`);
    E(ctx, `window.__v18.next()`);
    const q2 = F18(ctx);
    check('5d.1 next question is unanswered before the stale result', q2.answered === null, q2);
    E(ctx, `window.__lastSR49.fireResult(${JSON.stringify(w.word)})`);
    const after = F18(ctx);
    check('5d.2 stale result does NOT answer the next question', after.answered === null, after);
    check('5d.3 the next question is still a speak question', after.qmode === 'speak', after);
  }
  // 5e. next() aborts the live recognition and bumps the token.
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    startWizard(ctx);
    E(ctx, `window.__v18.bossSpeak()`);
    const t0 = F18(ctx).token;
    E(ctx, `window.__v18._test.pickWrong()`);
    E(ctx, `window.__v18.next()`);
    const aborted = J(ctx, `window.__lastSR49._aborted`);
    const f = F18(ctx);
    check('5e.1 next() aborts the live recognition', aborted === true, { aborted });
    check('5e.2 next() bumps the per-question token', f.token === t0 + 1, { t0, t1: f.token });
    check('5e.3 next() clears the listening flag', f.listening === false);
  }
  // 5f. close() aborts the live recognition and bumps the token.
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    startWizard(ctx);
    E(ctx, `window.__v18.bossSpeak()`);
    const t0 = F18(ctx).token;
    E(ctx, `window.__v18.close()`);
    const aborted = J(ctx, `window.__lastSR49._aborted`);
    const f = F18(ctx);
    check('5f.1 close() aborts the live recognition', aborted === true, { aborted });
    check('5f.2 close() clears the fight (F is null)', f === null);
    check('5f.3 speakState() is null after close', speakState18(ctx) === null);
    void t0;
  }
  // 5g. Same staleness guard in the v19 engine (forced speak state).
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    E(ctx, `(function(){
      var v19=window.__v19, e19=v19.en19(); e19.bosses=e19.bosses||{};
      window.__V19_DATA.bosses.forEach(function(b){ e19.bosses[b.id]={en:{win:1}}; });
      v19.openMapFor('en'); v19.fight('v11_fireking');
      var F=v19._test.F(); var w=window.__v15.words[0];
      F.qmode='speak'; F.cur={w:w,opts:[w]};
    })()`);
    const w = J(ctx, `JSON.stringify(window.__v15.words[0].en)`);
    E(ctx, `window.__v19.bossSpeak()`);
    const tok0 = F19(ctx).token;
    E(ctx, `window.__v19._test.pickWrong()`);
    E(ctx, `window.__v19.next()`);
    E(ctx, `window.__lastSR49.fireResult(${JSON.stringify(w)})`);
    const after = F19(ctx);
    check('5g.1 v19 stale result does NOT answer the next question', after.answered === null, after);
    check('5g.2 v19 token bumped by next()', after.token === tok0 + 1, { tok0, t1: after.token });
  }
}

// ---------- section 6: D6 fixed — one specific message per error ----------
section('6', 'D6 fixed — specific error message per error code');
{
  const cases = [
    ['not-allowed', 'Micro bị chặn'],
    ['service-not-allowed', 'Micro bị chặn'],
    ['no-speech', 'không nghe thấy gì'],
    ['audio-capture', 'Không tìm thấy micro'],
    ['network', 'Lỗi mạng'],
    ['aborted', 'Đã dừng nghe'],
    ['unknown', 'Không nghe được giọng nói'],
  ];
  for (const [code, needle] of cases) {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    const w = startWizard(ctx);
    E(ctx, `window.__v18.bossSpeak()`);
    E(ctx, `window.__lastSR49.fireError(${JSON.stringify(code)})`);
    const f = F18(ctx);
    const h = fightHTML18(ctx);
    check(`6.${code} error shows "${needle}" + retry`, f.err && f.err.includes(needle) && f.err.includes('thử lại') && h.includes('v49err') && h.includes(needle), { err: f.err });
    check(`6.${code} listening cleared + question unanswered`, f.listening === false && f.answered === null, f);
    void w;
  }
  // The generic "(không nghe được)" never appears as F.heard any more.
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    startWizard(ctx);
    E(ctx, `window.__v18.bossSpeak()`);
    E(ctx, `window.__lastSR49.fireError('not-allowed')`);
    const f = F18(ctx);
    check('6.8 generic "(không nghe được)" never set as heard', f.heard !== '(không nghe được)', f.heard);
  }
  // __v49.speakErrMsg covers every code + falls back on unknown codes.
  {
    const ctx = seededCtx();
    const arr = J(ctx, `JSON.stringify(['not-allowed','service-not-allowed','no-speech','audio-capture','network','aborted','start-failed','unknown','bogus-code'].map(function(c){ return window.__v49.speakErrMsg(c); }))`);
    check('6.9 speakErrMsg: 7 distinct messages for 9 codes (not-allowed==service-not-allowed, unknown==bogus fallback)', new Set(arr).size === 7 && arr[0] === arr[1] && arr[7] === arr[8], arr);
    check('6.10 speakErrMsg falls back on an unknown code', arr[8] === arr[7] && arr[7].includes('Không nghe được giọng nói'));
    check('6.11 __v49 version is 19.4.0', J(ctx, `JSON.stringify(window.__v49.version)`) === '19.4.0');
  }
}

// ---------- section 7: regressions ----------
section('7', 'regressions — XP parity, no-SR state, v15/v48 untouched, counts');
{
  // 7a. Voice XP parity: one correct voice answer on a fresh word pays
  // +10 XP, exactly like an MC answer (V46 shared XP function).
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    const xp0 = xp(ctx);
    const w = startWizard(ctx);
    E(ctx, `window.__v18.bossSpeak()`);
    E(ctx, `window.__lastSR49.fireResult(${JSON.stringify(w.word)})`);
    const f = F18(ctx);
    check('7a.1 correct voice answer pays +10 XP (fresh word)', xp(ctx) === xp0 + 10 && f.ok === true, { xp0, xp1: xp(ctx) });
  }
  // 7b. Wrong voice answer pays 0 XP.
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    const xp0 = xp(ctx);
    startWizard(ctx);
    E(ctx, `window.__v18.bossSpeak()`);
    E(ctx, `window.__lastSR49.fireResult("zzzznotaword")`);
    const f = F18(ctx);
    check('7b.1 wrong voice answer pays 0 XP', xp(ctx) === xp0 && f.ok === false, { xp0, xp1: xp(ctx) });
  }
  // 7c. Full wizard fight won by voice (speak questions answered with
  // the correct transcript; the wizard has HP 130, so several rounds).
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    const xp0 = xp(ctx);
    const w = startWizard(ctx);
    let rounds = 0;
    while (rounds < 40) {
      const f = F18(ctx);
      if (!f || f.over) break;
      rounds++;
      if (f.answered !== null) { E(ctx, `window.__v18.next()`); continue; }
      if (f.qmode === 'speak') {
        E(ctx, `window.__v18.bossSpeak()`);
        E(ctx, `window.__lastSR49.fireResult(${JSON.stringify(f.word)})`);
      } else {
        E(ctx, `window.__v18._test.pickCorrect()`);
      }
    }
    const f = F18(ctx);
    check('7c.1 full wizard fight won by voice', f && f.over === 'win', { rounds, over: f && f.over, hp: f && f.hp });
    check('7c.2 voice win pays XP (first win + per-answer)', xp(ctx) > xp0, { xp0, xp1: xp(ctx) });
  }
  // 7d. Non-speak boss unaffected: no SR is ever created, MC answers work.
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    E(ctx, `(function(){
      var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
      var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
      v18.fight('v10_slime','en');
    })()`);
    const f0 = F18(ctx);
    check('7d.1 slime fight starts as mc', f0.qmode === 'mc', f0);
    E(ctx, `window.__v18._test.pickCorrect()`);
    const f1 = F18(ctx);
    check('7d.2 MC correct answer works (no SR involved)', f1.answered !== null && f1.ok === true, f1);
    check('7d.3 no SpeechRecognition was constructed', J(ctx, `window.__lastSR49 === undefined`));
  }
  // 7e. KO fights map speak->mc: no SR, Korean question.
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    E(ctx, `(function(){
      var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
      var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
      v18.fight('v10_wizard','ko');
    })()`);
    const f = F18(ctx);
    check('7e.1 KO wizard fight asks Korean MC (speak->mc)', f.qmode === 'mc', f);
    check('7e.2 no SpeechRecognition in a KO fight', J(ctx, `window.__lastSR49 === undefined`));
    check('7e.3 KO question has Korean options', J(ctx, `(function(){var F=window.__v18._test.F(); return F.cur&&F.cur.opts&&F.cur.opts.length>=2&&!!F.cur.opts[0].h;})()`));
  }
  // 7f. No SpeechRecognition at all: honest unsupported state, no throw.
  {
    const ctx = seededCtx();
    E(ctx, `window.SpeechRecognition=undefined; window.webkitSpeechRecognition=undefined;`);
    const w = startWizard(ctx);
    check('7f.1 fight still starts without SR', w.live === true && w.qmode === 'speak', w);
    E(ctx, `window.__v18.bossSpeak()`);
    const f = F18(ctx);
    const h = fightHTML18(ctx);
    check('7f.2 bossSpeak with no SR is a safe no-op', f.answered === null && f.listening === false, f);
    check('7f.3 unsupported-state warn box is shown', h.includes('v18warn') && h.includes('Trình duyệt'));
  }
  // 7g. nextQ clears stale speak state (error + heard do not leak).
  {
    const ctx = seededCtx(); installSR(ctx); setSRMode(ctx, 'silent');
    const w = startWizard(ctx);
    E(ctx, `window.__v18.bossSpeak()`);
    E(ctx, `window.__lastSR49.fireError('no-speech')`);
    check('7g.1 error is set on the first question', F18(ctx).err !== null);
    E(ctx, `window.__v18._test.pickWrong()`);
    E(ctx, `window.__v18.next()`);
    const f = F18(ctx);
    const h = fightHTML18(ctx);
    check('7g.2 nextQ clears the error', f.err === null && !h.includes('v49err'), f);
    check('7g.3 nextQ clears the heard line', f.heard === null && !h.includes('Máy nghe được'));
    check('7g.4 nextQ clears the listening flag', f.listening === false);
    void w;
  }
  // 7h. v15 speakRecord untouched: its source is byte-identical to the
  // pristine V19.3 base, and a cold call (no speak session started)
  // throws the SAME TypeError on both builds — the throw is the
  // pre-existing "call it only inside a speak session" behaviour
  // (M.list is unset until startMode('speak')), not a V49 change.
  {
    const grab = (s) => { const m = s.match(/function speakRecord\(\)\{[\s\S]*?\n\}/); return m ? m[0] : null; };
    const newSrc = grab(html);
    const oldHtml = fs.readFileSync(path.join(ROOT, 'tools', 'v50', 'backup-v19.4', 'out', 'index.html'), 'utf8');
    const oldSrc = grab(oldHtml);
    check('7h.1 v15 speakRecord source is byte-identical to pristine V19.4', newSrc !== null && newSrc === oldSrc);
    const coldCall = (h) => {
      const c = makeCtx();
      const ld = loadPage(c, h);
      if (ld.loadErr) return 'LOAD-ERR:' + ld.loadErr;
      fireDCL(c);
      try { E(c, 'window.__v15.buildWords()'); E(c, 'window.__v15.speakRecord()'); return 'no-throw'; }
      catch (e) { return String(e && e.message || e); }
    };
    const errNew = coldCall(html);
    const errOld = coldCall(oldHtml);
    check('7h.2 cold speakRecord throws the same error on both builds', errNew === errOld && /Cannot read properties of undefined/.test(errNew), { errNew, errOld });
  }
  // 7i. v48 Dojo untouched: dojoListen exists, __V48_DATA intact.
  {
    const ctx = seededCtx();
    check('7i.1 v48 dojoListen still exists', J(ctx, `JSON.stringify(typeof window.__v48.dojoListen)`) === 'function');
    check('7i.2 golem still Lv 77 / HP 620 / listen weakness', J(ctx, `window.__V48_DATA.boss.lv===77 && window.__V48_DATA.boss.hp===620`));
    check('7i.3 TOTAL_BOSSES still 87', J(ctx, `window.__v21.TOTAL_BOSSES`) === 87);
  }
  // 7j. legDiff thresholds unchanged (V46 regression, vm-level).
  {
    const ctx = seededCtx();
    const r = J(ctx, `JSON.stringify((function(){
      var v18=window.__v18;
      // legDiff reads V15().counts.mastered; seed 0 mastered.
      return v18._test.legDiff();
    })())`);
    check('7j.1 legDiff at mastered 0 is still [A2,B1]', JSON.stringify(r) === JSON.stringify(['A2','B1']), r);
  }
  // 7k. No new save key: a fresh boot has no en49/en50 subkey, and the
  // v49/v50 layers write nothing to localStorage.
  {
    const ctx = seededCtx();
    const keys = J(ctx, `JSON.stringify(Object.keys(JSON.parse(window.localStorage.getItem('hanvocab.v1')).v7||{}))`);
    check('7k.1 fresh boot has no en49 save key', !keys.includes('en49'), keys);
    check('7k.1b fresh boot has no en50 save key', !keys.includes('en50'), keys);
    check('7k.1c fresh boot has no en52 save key', !keys.includes('en52'), keys);
    const w = startWizard(ctx);
    E(ctx, `window.__v18.bossSpeak()`);
    const keys2 = J(ctx, `JSON.stringify(Object.keys(JSON.parse(window.localStorage.getItem('hanvocab.v1')).v7||{}))`);
    check('7k.2 speaking in a boss fight creates no en49 key', !keys2.includes('en49'), keys2);
    check('7k.2b speaking in a boss fight creates no en50 key', !keys2.includes('en50'), keys2);
    check('7k.2c speaking in a boss fight creates no en52 key', !keys2.includes('en52'), keys2);
    void w;
  }
  // 7l. Speak-mode boss enumeration is unchanged.
  {
    const ctx = seededCtx();
    const sp = J(ctx, `JSON.stringify((function(){
      var out={speak18:[], speak19:[], speak33:[], speak35:[], speak48:[]};
      var d18=window.__v18.bosses; (d18.old||[]).concat(d18.en||[],d18.el||[],d18.leg||[]).forEach(function(b){ if(b.mode==="speak") out.speak18.push(b.id); });
      window.__V19_DATA.bosses.forEach(function(b){ if(b.mode==="speak") out.speak19.push(b.id); });
      window.__V33_DATA.bosses.forEach(function(b){ if(b.mode==="speak") out.speak33.push(b.id); });
      window.__V35_DATA.bosses.forEach(function(b){ if(b.mode==="speak") out.speak35.push(b.id); });
      if(window.__V48_DATA.boss.mode==="speak") out.speak48.push(window.__V48_DATA.boss.id);
      return out;})())`);
    check('7l.1 speak bosses unchanged (wizard, v10_wizard, v10_mage only)', JSON.stringify(sp) === '{"speak18":["wizard","v10_wizard","v10_mage"],"speak19":[],"speak33":[],"speak35":[],"speak48":[]}', sp);
  }
}

// ---------- section 8: structure ----------
section('8', 'structure — v49.js hygiene, marker order');
{
  const v49js = fs.readFileSync(path.join(ROOT, 'src', 'v49.js'), 'utf8');
  const v49css = fs.readFileSync(path.join(ROOT, 'src', 'v49.css'), 'utf8');
  check('8.1 v49.js never uses window.S', !/window\.S(?![A-Za-z])/.test(v49js.replace(/\/\*[\s\S]*?\*\//g, '')));
  check('8.2 v49.js never touches localStorage', !v49js.replace(/\/\*[\s\S]*?\*\//g, '').includes('localStorage'));
  check('8.3 v49.js has no </script>', !v49js.toLowerCase().includes('</script>'));
  check('8.4 v49.css has no </style> and no </body>', !v49css.toLowerCase().includes('</style>') && !v49css.includes('</body>'));
  check('8.5 v49.css carries 44px touch targets', v49css.includes('min-height:44px'));
  check('8.6 v49.css uses solid dark chips (theme-independent)', v49css.includes('#1e3a5f') && v49css.includes('#4a1f1f'));
  check('8.7 v49.js is a pure helper (no save key, no S.v7 key)', !v49js.includes('en49') && !v49js.includes('S.v7'));
  const v50js = fs.readFileSync(path.join(ROOT, 'src', 'v50.js'), 'utf8');
  const v50css = fs.readFileSync(path.join(ROOT, 'src', 'v50.css'), 'utf8');
  check('8.8 v50.js never uses window.S', !/window\.S(?![A-Za-z])/.test(v50js.replace(/\/\*[\s\S]*?\*\//g, '')));
  check('8.9 v50.js never touches localStorage', !v50js.replace(/\/\*[\s\S]*?\*\//g, '').includes('localStorage'));
  check('8.10 v50.js has no </script>', !v50js.toLowerCase().includes('</script>'));
  check('8.11 v50.css has no </style> and no </body>', !v50css.toLowerCase().includes('</style>') && !v50css.includes('</body>'));
  check('8.12 v50.css carries the five 44px rules', v50css.includes('.v7btn{min-height:44px}') && v50css.includes(':root #sk,:root #sn{min-height:44px}') && v50css.includes('#v21avatarbtn{min-height:44px}') && v50css.includes('.v15link{min-height:44px}') && v50css.includes('.tabs .tab{min-height:44px}'));
  check('8.13 v50.js is a version marker only (no functions, no save calls)', !v50js.includes('function ') && !v50js.includes('save(') && !v50js.includes('localStorage'));
  check('8.14 __v50 version is 19.5.0 at runtime', (() => { const ctx = seededCtx(); return J(ctx, `JSON.stringify(window.__v50.version)`) === '19.5.0'; })());
  const v52js = fs.readFileSync(path.join(ROOT, 'src', 'v52.js'), 'utf8');
  check('8.15 v52.js never uses window.S', !/window\\.S(?![A-Za-z])/.test(v52js.replace(/\/\*[\s\S]*?\*\//g, '')));
  check('8.16 v52.js never touches localStorage', !v52js.replace(/\/\*[\s\S]*?\*\//g, '').includes('localStorage'));
  check('8.17 v52.js has no </script>', !v52js.toLowerCase().includes('</script>'));
  check('8.18 v52.js is a pure helper (no save key, no S.v7 key)', !v52js.includes('en52') && !v52js.includes('S.v7'));
  check('8.19 __v52 version is 19.5.1 at runtime', (() => { const ctx = seededCtx(); return J(ctx, `JSON.stringify(window.__v52.version)`) === '19.5.1'; })());
  check('8.20 __v52 exposes speak + _test hooks', (() => { const ctx = seededCtx(); return J(ctx, `JSON.stringify(typeof window.__v52.speak)`) === 'function' && J(ctx, `JSON.stringify(typeof window.__v52._test.pickVoice)`) === 'function'; })());
}

// ---------- section 9: F-1 FIXED — fight() restart aborts the rec, monotonic token ----------
section('9', 'F-1 fixed — restart aborts the live rec (both engines)');
{
  // 9a. Static: startFight() calls stopSpeak() in both engines.
  {
    const v18src = fs.readFileSync(path.join(DIR, 'v18.js'), 'utf8');
    const v19src = fs.readFileSync(path.join(DIR, 'v19.js'), 'utf8');
    const sf18 = v18src.slice(v18src.indexOf('function startFight(b,lang){'), v18src.indexOf('function timerFor(){'));
    const sf19 = v19src.slice(v19src.indexOf('function startFight(b,lang){'), v19src.indexOf('function timerFor(){'));
    check('9a.1 v18 startFight() calls stopSpeak() first', sf18.includes('stopSpeak();'), sf18.slice(0, 160));
    check('9a.2 v19 startFight() calls stopSpeak() first', sf19.includes('stopSpeak();'), sf19.slice(0, 160));
    check('9a.3 no engine resets speakToken to 0 any more', !sf18.includes('speakToken:0') && !sf19.includes('speakToken:0'));
    check('9a.4 both engines seed the new F from the monotonic sequence', sf18.includes('speakToken:_speakSeq50') && sf19.includes('speakToken:_speakSeq50'));
  }
  // 9b. Behavioural, v18: wizard speak question -> restart -> orphan
  // result must NOT answer the new question (repro R1, inverted).
  {
    const c = seededCtx();
    installSR(c);
    const w0 = startWizard(c);
    check('9b.1 wizard fight starts on a speak question', w0.live === true && w0.qmode === 'speak' && !!w0.word, w0);
    E(c, `window.__v18.bossSpeak()`);
    const s0 = J(c, `JSON.stringify(window.__v18.speakState())`);
    check('9b.2 listening after tap Nói, token 1', s0.listening === true && s0.token === 1, s0);
    const oldRec = E(c, `window.__lastSR49`);
    E(c, `window.__v18.fight('v10_wizard','en')`);
    const after = F18(c);
    check('9b.3 restart ABORTS the live rec', oldRec._aborted === true, { aborted: oldRec._aborted });
    check('9b.4 new fight keeps a monotonic token (2, not 0)', after.token === 2, after);
    check('9b.5 new fight is listening=false after the abort', after.listening === false, after);
    E(c, `window.__v18.bossSpeak()`);
    const s1 = J(c, `JSON.stringify(window.__v18.speakState())`);
    check('9b.6 new tap Nói gets token 3 (never reuses the orphan token 1)', s1.token === 3, s1);
    oldRec.fireResult(w0.word);
    const fAfter = F18(c);
    check('9b.7 orphan result does NOT answer the new question', fAfter.answered === null, fAfter);
    check('9b.8 new question is still unanswered + listening', fAfter.listening === true, fAfter);
    // The new question is still answerable by voice.
    E(c, `window.__lastSR49.fireResult(${JSON.stringify(fAfter.word)})`);
    const f2 = F18(c);
    check('9b.9 new question answers by voice after the orphan is dropped', f2.answered !== null && f2.ok === true, f2);
  }
  // 9c. Behavioural, v19: forced speak on fireking, same hole closed.
  {
    const c19 = seededCtx();
    installSR(c19);
    const f19 = J(c19, `JSON.stringify((function(){
      var v19=window.__v19, e19=v19._test.en19(); e19.bosses=e19.bosses||{};
      e19.bosses['v11_fireking']={en:{win:true}};
      v19.fight('v11_fireking');
      var F=v19._test.F();
      for(var i=0;i<12 && !(F&&F.cur&&F.cur.w);i++){ v19._test.next(); F=v19._test.F(); }
      if(!(F&&F.cur&&F.cur.w)) return {live:false};
      F.qmode='speak';
      return {live:true, word:F.cur.w.en};
    })())`);
    check('9c.1 v19 fireking forced to a speak question', f19.live === true && !!f19.word, f19);
    if (f19.live) {
      E(c19, `window.__v19.bossSpeak()`);
      const t0 = J(c19, `JSON.stringify(window.__v19.speakState())`);
      check('9c.2 v19 listening after tap Nói, token 1', t0.listening === true && t0.token === 1, t0);
      const old19 = E(c19, `window.__lastSR49`);
      E(c19, `window.__v19.fight('v11_fireking')`);
      const fA = F19(c19);
      check('9c.3 v19 restart ABORTS the live rec', old19._aborted === true, { aborted: old19._aborted });
      check('9c.4 v19 new fight keeps a monotonic token (2, not 0)', fA.token === 2, fA);
      E(c19, `(function(){var F=window.__v19._test.F(); if(F&&F.cur&&F.cur.w){F.qmode='speak';} return 1})()`);
      E(c19, `window.__v19.bossSpeak()`);
      const t1 = J(c19, `JSON.stringify(window.__v19.speakState())`);
      check('9c.5 v19 new tap Nói gets token 3', t1.token === 3, t1);
      old19.fireResult(f19.word);
      const fB = F19(c19);
      check('9c.6 v19 orphan result does NOT answer the new question', fB.answered === null, fB);
    }
  }
  // 9d. Restart with NO live rec is still safe (token keeps growing).
  {
    const c = seededCtx();
    installSR(c);
    startWizard(c);
    E(c, `window.__v18.fight('v10_wizard','en')`);
    const f1 = F18(c);
    E(c, `window.__v18.fight('v10_wizard','en')`);
    const f2 = F18(c);
    check('9d.1 restart without a live rec does not throw, F stays live', f1 && f2 && f2.token >= 0, { t1: f1 && f1.token, t2: f2 && f2.token });
    check('9d.2 token grows by exactly 1 per restart (stopSpeak bumps whenever F exists)', f2.token === f1.token + 1, { t1: f1.token, t2: f2.token });
  }
}

// ---------- section 10: C-R5-2 FIXED — due-less words read "Đến hạn hôm nay" ----------
section('10', 'C-R5-2 fixed — due-less learned words (Smart weak list)');
{
  const c = seededCtx();
  const r = J(c, `JSON.stringify((function(){
    var v15=window.__v15, v27=window.__v27;
    var w=v15.words[0];
    var old=v15.enOld(); old.box[w.id]=2; old.right[w.id]=0; old.wrong[w.id]=0;
    var e15=window.__v15.en15st ? window.__v15.en15st() : null;
    if(e15){ e15.due=e15.due||{}; delete e15.due[w.id]; }
    var cEN=v27.classifyEN(w);
    var card=S.cards[0]; card.box=2; card.due=0; card.w=0;
    var cKO=v27.classifyKO(card);
    return {en:{reason:cEN.reason, overdue:cEN.overdue, cls:cEN.cls, due:cEN.due},
            ko:{reason:cKO.reason, overdue:cKO.overdue, cls:cKO.cls, due:cKO.due}};
  })())`);
  check('10.1 classifyEN reason is "Đến hạn hôm nay"', r.en.reason === 'Đến hạn hôm nay', r.en);
  check('10.2 classifyEN overdue is 0 (not days-since-epoch)', r.en.overdue === 0, r.en);
  check('10.3 classifyEN cls is REVIEW', r.en.cls === 'REVIEW', r.en);
  check('10.4 classifyKO reason is "Đến hạn hôm nay"', r.ko.reason === 'Đến hạn hôm nay', r.ko);
  check('10.5 classifyKO overdue is 0 (not days-since-epoch)', r.ko.overdue === 0, r.ko);
  check('10.6 classifyKO cls is REVIEW', r.ko.cls === 'REVIEW', r.ko);
  check('10.7 no "20779" anywhere in either reason', !/20779/.test(r.en.reason) && !/20779/.test(r.ko.reason), r);
  // A word WITH a real due date still shows its real lateness.
  // (en15st is scoped inside the v27 block; the due map itself is
  // S.v7.en15.due, reachable via __v15.en15().)
  const r2 = J(c, `JSON.stringify((function(){
    var v15=window.__v15, v27=window.__v27;
    var w=v15.words[1];
    var old=v15.enOld(); old.box[w.id]=2; old.right[w.id]=0; old.wrong[w.id]=0;
    var e15=v15.en15();
    e15.due=e15.due||{}; e15.due[w.id]=Date.now()-3*864e5;
    return v27.classifyEN(w);
  })())`);
  check('10.8 a word due 3 days ago still reads "Đến hạn 3 ngày"', r2.reason === 'Đến hạn 3 ngày', r2);
}

// ---------- section 11: C-R5-3 FIXED — Forge score tracked ----------
section('11', 'C-R5-3 fixed — Forge score tracked + shown');
{
  const c = seededCtx();
  const r = J(c, `JSON.stringify((function(){
    var T=window.__v48._test, out={scores:[], total:0};
    var v15=window.__v15, old=v15.enOld();
    for(var i=0;i<12&&i<v15.words.length;i++) old.box[v15.words[i].id]=1;
    v15.save15();
    T.startForgeSession('en');
    for(var s=0;s<5;s++){
      var FS=T.session(), cur=FS.list[FS.i], tiles=FS.tiles||[];
      if(!tiles.length){
        FS.tiles=tiles=cur.tokens.map(function(t,i){return {t:t,k:i}});
        for(var i2=tiles.length-1;i2>0;i2--){var j=Math.floor(Math.random()*(i2+1));var tmp=tiles[i2];tiles[i2]=tiles[j];tiles[j]=tmp}
      }
      var used={};
      cur.tokens.forEach(function(tok){
        for(var k=0;k<tiles.length;k++){ if(!used[k]&&tiles[k].t===tok){ used[k]=1; T.forgeTap(k); break; } }
      });
      var chk=T.forgeCheck();
      out.scores.push(chk&&chk.score); out.total+=(chk&&chk.score)||0;
      out['fsScore'+s]=FS.score;
      if(s<4) T.forgeNext();
    }
    var fin=T.forgeNext();
    out.fin=fin;
    var e=T.en48();
    out.forgeKeys=Object.keys(e.forge).sort();
    out.scoreTotal=e.forge.scoreTotal; out.bestScore=e.forge.bestScore;
    out.sessionScoreInFS=('score' in T.session());
    try{
      // NOTE: the stub DOM's getElementById fabricates a fresh element
      // for dynamically-created ids, so #v48hub reads empty here; call
      // the exposed overlayHTML() directly instead (same string the
      // overlay renders). The live-DOM read is a Chrome gate (C.3).
      var h=T.overlayHTML();
      out.endHTMLHasScore=/Điểm buổi|Điểm cao nhất|Tổng điểm/.test(h);
      out.endSnippet=h.slice(0,600);
    }catch(err){ out.endErr=String(err&&err.message); }
    return out;
  })())`);
  check('11.1 per-answer scores exist (total > 0)', r.total > 0, { total: r.total, scores: r.scores });
  check('11.2 session ends 5/5', r.fin && r.fin.right === 5, r.fin);
  check('11.3 forgeCheck returns the per-answer score', r.scores.every(s => typeof s === 'number' && s > 0), r.scores);
  check('11.4 FS session state accumulates the score', r.fsScore4 === r.total, { fsScore4: r.fsScore4, total: r.total });
  check('11.5 en48.forge.scoreTotal equals the session total', r.scoreTotal === r.total, { scoreTotal: r.scoreTotal, total: r.total });
  check('11.6 en48.forge.bestScore equals the session total (first session)', r.bestScore === r.total, { bestScore: r.bestScore, total: r.total });
  check('11.7 forgeNext returns the session score', r.fin && r.fin.score === r.total, r.fin);
  check('11.8 end/intro screen shows the score', r.endHTMLHasScore === true, { snippet: (r.endSnippet || '').slice(0, 300) });
  // A second, worse session must NOT lower the best score.
  const r2 = J(c, `JSON.stringify((function(){
    var T=window.__v48._test;
    T.startForgeSession('en');
    var FS=T.session(), cur=FS.list[FS.i], tiles=FS.tiles||[];
    if(!tiles.length){ FS.tiles=tiles=cur.tokens.map(function(t,i){return {t:t,k:i}}); }
    T.forgeTap(0); var chk=T.forgeCheck(); // deliberately wrong order -> 0
    void chk;
    T.forgeNext(); T.forgeNext(); T.forgeNext(); T.forgeNext();
    var fin=T.forgeNext(); // 5th call ends the session (no extra call: forgeNext re-persists)
    var e=T.en48();
    return {fin:fin, scoreTotal:e.forge.scoreTotal, bestScore:e.forge.bestScore};
  })())`);
  check('11.9 second session adds to scoreTotal but never lowers bestScore', r2.bestScore === r.total && r2.scoreTotal >= r.total, { best: r2.bestScore, total: r2.scoreTotal, first: r.total });
}

// ---------- section 12: C-R5-4 FIXED (static) — KO Hub 44px rules ----------
section('12', 'C-R5-4 fixed (static) — KO Hub 44px touch targets');
{
  check('12.1 v50 layer present', countOcc(html, 'id="v50"') === 1 && countOcc(html, 'id="v50js"') === 1);
  check('12.2 .v7btn has a 44px min-height rule', /\.v7btn\{[^}]*min-height:44px/.test(html), (html.match(/\.v7btn\{[^}]*\}/) || ['?'])[0].slice(0, 120));
  check('12.3 :root #sk,#sn have a 44px min-height rule (mirrors the base :root selector)', /:root #sk,:root #sn\{[^}]*min-height:44px/.test(html));
  check('12.4 #v21avatarbtn has a 44px min-height rule', /#v21avatarbtn\{[^}]*min-height:44px/.test(html));
  check('12.5 .tabs .tab has a 44px min-height rule at <=640px', /\.tabs \.tab\{[^}]*min-height:44px/.test(html));
  check('12.6 the old 34px .btn.sm rule is still there (v50 wins by specificity)', /\.btn\.sm\{[^}]*min-height:34px/.test(html) || html.includes(':root.btn.sm{min-height:34px}'));
  check('12.7 .v15link (chooser "Để sau") has a 44px min-height rule', /\.v15link\{[^}]*min-height:44px/.test(html));
}

// ---------- helpers shared by §13/§14 (V52) ----------
// Load a page from arbitrary html text with an explicit seed (so the
// same seed drives the same draws on the new build and on the pristine
// V19.5 base — the EN-XP-parity proof in §13g).
function seededCtxFrom(htmlText, seed) {
  const c = makeCtx();
  c.__seededRandom = mulberry32(seed);
  E(c, 'Math.random=__seededRandom;');
  const loaded = loadPage(c, htmlText);
  if (loaded.loadErr) { console.log('LOAD ERR (seed ' + seed + '):', loaded.loadErr); process.exit(1); }
  fireDCL(c);
  E(c, 'window.__v15.buildWords()');
  dynIds.add('v19fight');
  return c;
}
// Mixed-mode fight XP trace (v10_dict / v11_butterflyqueen, EN).
// Returns per-question {qmode, wordId, dxp, streak} for the first 4
// questions (mc, grammar, listen, builder in that order).
function traceMixed(ctx, fightExpr) {
  return J(ctx, `JSON.stringify((function(){
    var v18=window.__v18, v19=window.__v19;
    var e18=v18._test.en18(); e18.bosses=e18.bosses||{};
    var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
    var e19=v19._test.en19(); e19.bosses=e19.bosses||{};
    (window.__V19_DATA.bosses||[]).forEach(function(b){ e19.bosses[b.id]={en:{win:true},ko:{win:true}}; });
    S.xp=20000; S.spent=0;
    var old=window.__v15.enOld(); old.streak=0;
    ${fightExpr}
    var trace=[];
    for(var i=0;i<4;i++){
      var F=(window.__v18._test.F()||window.__v19._test.F()); if(!F||F.over) break;
      var eng=F===window.__v18._test.F()?'v18':'v19';
      var qm=F.qmode, wid=(F.cur&&F.cur.w)?F.cur.w.id:null;
      var xp0=S.xp, st0=window.__v15.enOld().streak;
      if(eng==='v18')v18._test.pickCorrect(); else v19._test.pickCorrect();
      var xp1=S.xp, st1=window.__v15.enOld().streak;
      trace.push({i:i,eng:eng,qmode:qm,wordId:wid,dxp:xp1-xp0,streak:st0+'->'+st1,answered:F.answered,ok:F.ok});
      if(i<3){ if(eng==='v18')v18._test.next(); else v19._test.next(); }
    }
    return trace;
  })())`);
}

// ---------- section 13: C-R5-1 FIXED — grammar/sentence pay +10 XP + streak ----------
section('13', 'C-R5-1 fixed — grammar/sentence pay +10 XP + streak (wordless, shared V46)');
{
  // 13a. Static: new signatures, wordless keys, call sites; OLD gone.
  const html13 = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  check('13a.1 wordlessKey18/19 defined once each', countOcc(html13, 'function wordlessKey18(){') === 1 && countOcc(html13, 'function wordlessKey19(){') === 1);
  check('13a.2 mark18/mark19 take (ok,w,qkey)', countOcc(html13, 'function mark18(ok,w,qkey){') === 1 && countOcc(html13, 'function mark19(ok,w,qkey){') === 1);
  check('13a.3 OLD mark signatures gone', countOcc(html13, 'function mark18(ok,w){') === 0 && countOcc(html13, 'function mark19(ok,w){') === 0);
  check('13a.4 wordless early return x2', countOcc(html13, '  if(!w&&!qkey)return;') === 2);
  check('13a.5 v18 call sites pass wordlessKey18 (x2)', countOcc(html13, 'mark18(true,F.cur&&F.cur.w,wordlessKey18());') === 1 && countOcc(html13, 'mark18(false,F.cur&&F.cur.w,wordlessKey18());') === 1);
  check('13a.6 v19 call sites pass wordlessKey19 (x3)', countOcc(html13, 'mark19(ok,F.cur&&F.cur.w,wordlessKey19());') === 1 && countOcc(html13, 'mark19(true,F.cur&&F.cur.w,wordlessKey19());') === 1 && countOcc(html13, 'mark19(false,F.cur&&F.cur.w,wordlessKey19());') === 1);
  check('13a.7 OLD guarded call sites gone', countOcc(html13, 'if(F.cur&&F.cur.w)mark18(') === 0 && countOcc(html13, 'if(F.cur&&F.cur.w)mark19(') === 0);
  check('13a.8 wordless V46 call (boxUp !!ok) x2', countOcc(html13, 'boxUp:w?(old.box[id]>before):!!ok') === 2);
  check('13a.9 wordless fallback guard x2', countOcc(html13, '    if(ok&&(w?old.box[id]>before:true)){') === 2);
  check('13a.10 recordAnswer stays word-guarded x2', countOcc(html13, "if(w){try{if(window.__v27)__v27.recordAnswer('en',id,ok,'boss18')}catch(e){}}") === 1 && countOcc(html13, "if(w){try{if(window.__v27)__v27.recordAnswer('en',id,ok,'boss19')}catch(e){}}") === 1);

  // 13b. Behavioural, v18: grammar + sentence now pay +10, streak advances.
  const c18 = seededCtxFrom(html, 101);
  E(c18, `window.__v46calls=[];
    var _ab=window.__v46.awardBossAnswerXP;
    window.__v46.awardBossAnswerXP=function(o){window.__v46calls.push({id:o.id,ok:o.ok,boxUp:o.boxUp});return _ab(o);};
    window.__recCalls=[];
    var _ra=window.__v27.recordAnswer;
    window.__v27.recordAnswer=function(l,id,ok,m){window.__recCalls.push(id);return _ra.apply(this,arguments);};`);
  const t18 = traceMixed(c18, `v18.fight('v10_dict','en');`);
  const by18 = {};
  t18.forEach(function (r) { by18[r.qmode] = r; });
  check('13b.1 v18 mixed fight asks all 4 types in order', t18.length === 4 && t18.map(function (r) { return r.qmode; }).join(',') === 'mc,grammar,listen,builder', t18);
  check('13b.2 v18 grammar now pays +10 XP', by18.grammar && by18.grammar.dxp === 10, by18.grammar);
  check('13b.3 v18 sentence (builder) now pays +10 XP', by18.builder && by18.builder.dxp === 10, by18.builder);
  check('13b.4 v18 streak advances on grammar (1->2)', by18.grammar && by18.grammar.streak === '1->2', t18.map(function (r) { return r.streak; }));
  check('13b.5 v18 streak advances on builder (3->4)', by18.builder && by18.builder.streak === '3->4', t18.map(function (r) { return r.streak; }));
  check('13b.6 v18 vocab (mc) still pays +10 XP', by18.mc && by18.mc.dxp === 10, by18.mc);
  const expTotal18 = 10 + 10 + ((by18.listen && by18.mc && by18.listen.wordId === by18.mc.wordId) ? 0 : 10) + 10;
  check('13b.7 v18 mixed fight total XP == expected (cooldown-aware)', t18.reduce(function (a, r) { return a + r.dxp; }, 0) === expTotal18, { total: t18.reduce(function (a, r) { return a + r.dxp; }, 0), expected: expTotal18, trace: t18 });
  // 13b.8/9: the shared V46 function is the path (spy), and no qkey
  // ever reaches recordAnswer / the SRS maps.
  const calls18 = J(c18, `JSON.stringify(window.__v46calls)`);
  check('13b.8 V46 called once per correct answer (x4), wordless ids are qkeys', calls18.length === 4 && calls18.every(function (c) { return c.ok === true && c.boxUp === true; }) && String(calls18[1].id).indexOf('g:') === 0 && String(calls18[3].id).indexOf('s:') === 0, calls18);
  const rec18 = J(c18, `JSON.stringify(window.__recCalls)`);
  check('13b.9 recordAnswer never sees a qkey (word ids only)', rec18.every(function (id) { return String(id).indexOf(':') < 0; }), rec18);
  const srs18 = J(c18, `JSON.stringify((function(){
    var old=window.__v15.enOld();
    var colonBox=Object.keys(old.box||{}).filter(function(k){return k.indexOf(':')>=0});
    var colonRight=Object.keys(old.right||{}).filter(function(k){return k.indexOf(':')>=0});
    var colonXp=Object.keys(old.xpAt||{}).filter(function(k){return k.indexOf(':')>=0});
    return {colonBox:colonBox, colonRight:colonRight, colonXp:colonXp};
  })())`);
  check('13b.10 word SRS maps hold no qkey (box/right clean)', srs18.colonBox.length === 0 && srs18.colonRight.length === 0, srs18);
  check('13b.11 cooldown map holds exactly the 2 qkeys (g: + s:)', srs18.colonXp.length === 2 && srs18.colonXp.some(function (k) { return k.indexOf('g:') === 0; }) && srs18.colonXp.some(function (k) { return k.indexOf('s:') === 0; }), srs18);

  // 13c. Behavioural, v19: same fix in the second engine.
  const c19 = seededCtxFrom(html, 102);
  const t19 = traceMixed(c19, `v19.fight('v11_butterflyqueen');`);
  const by19 = {};
  t19.forEach(function (r) { by19[r.qmode] = r; });
  check('13c.1 v19 mixed fight asks all 4 types in order', t19.length === 4 && t19.map(function (r) { return r.qmode; }).join(',') === 'mc,grammar,listen,builder', t19);
  check('13c.2 v19 grammar now pays +10 XP', by19.grammar && by19.grammar.dxp === 10, by19.grammar);
  check('13c.3 v19 sentence (builder) now pays +10 XP', by19.builder && by19.builder.dxp === 10, by19.builder);
  check('13c.4 v19 streak advances on grammar + builder', by19.grammar && by19.grammar.streak === '1->2' && by19.builder && by19.builder.streak === '3->4', t19.map(function (r) { return r.streak; }));

  // 13d. Wrong wordless answer: 0 XP, streak reset, no SRS entry.
  const cw = seededCtx();
  const wrongR = J(cw, `JSON.stringify((function(){
    var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
    var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
    S.xp=20000; S.spent=0;
    var old=window.__v15.enOld(); old.streak=0;
    v18.fight('v10_dict','en');
    v18._test.pickCorrect(); v18._test.next(); // q0 mc correct
    var xp0=S.xp, st0=window.__v15.enOld().streak;
    var qm=window.__v18._test.F().qmode;
    v18._test.pickWrong(); // q1 grammar wrong
    var xp1=S.xp, st1=window.__v15.enOld().streak;
    var colonBox=Object.keys(window.__v15.enOld().box||{}).filter(function(k){return k.indexOf(':')>=0});
    return {qmode:qm, dxp:xp1-xp0, streak:st0+'->'+st1, colonBox:colonBox};
  })())`);
  check('13d.1 wrong grammar question is q1 grammar', wrongR.qmode === 'grammar', wrongR);
  check('13d.2 wrong grammar pays 0 XP and resets the streak', wrongR.dxp === 0 && wrongR.streak === '1->0', wrongR);
  check('13d.3 wrong grammar creates no SRS entry', wrongR.colonBox.length === 0, wrongR);

  // 13e. KO parity: first KO correct answer still pays +10 (markKO path).
  const cko = seededCtx();
  const koR = J(cko, `JSON.stringify((function(){
    var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
    var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
    S.xp=20000; S.spent=0;
    v18.fight('v10_dict','ko');
    var F=v18._test.F();
    var xp0=S.xp;
    v18._test.pickCorrect();
    return {qmode:F.qmode, ko:!!(F.cur&&F.cur.ko), dxp:S.xp-xp0, ok:F.ok};
  })())`);
  check('13e.1 KO mixed fight asks a Korean question', koR.ko === true, koR);
  check('13e.2 first KO correct answer pays +10 XP', koR.dxp === 10, koR);

  // 13f. EN XP byte-identical on WORD answers vs the pristine V19.5 base
  // (same seed 101 drives the same draws; only grammar/builder differ).
  const pristineHtml = fs.readFileSync(path.join(ROOT, 'tools', 'v52', 'backup-v19.5', 'out', 'index.html'), 'utf8');
  const cOld = seededCtxFrom(pristineHtml, 101);
  const tOld = traceMixed(cOld, `v18.fight('v10_dict','en');`);
  const byOld = {};
  tOld.forEach(function (r) { byOld[r.qmode] = r; });
  check('13f.1 pristine V19.5 trace draws the same 4 questions', tOld.length === 4 && tOld.map(function (r) { return r.qmode; }).join(',') === 'mc,grammar,listen,builder', tOld);
  check('13f.2 pristine mc/listen word ids match the new build', byOld.mc && byOld.listen && byOld.mc.wordId === by18.mc.wordId && byOld.listen.wordId === by18.listen.wordId, { old: [byOld.mc && byOld.mc.wordId, byOld.listen && byOld.listen.wordId], now: [by18.mc.wordId, by18.listen.wordId] });
  check('13f.3 word-answer XP is byte-identical (mc + listen)', byOld.mc.dxp === by18.mc.dxp && byOld.listen.dxp === by18.listen.dxp, { old: [byOld.mc.dxp, byOld.listen.dxp], now: [by18.mc.dxp, by18.listen.dxp] });
  check('13f.4 pristine grammar/builder paid 0 (the fixed bug)', byOld.grammar.dxp === 0 && byOld.builder.dxp === 0, { old: [byOld.grammar.dxp, byOld.builder.dxp] });
}

// ---------- section 14: Android TTS FIXED — shared __v52 helper ----------
section('14', 'Android TTS fixed — shared __v52 speak helper (voice wait + match + honest error)');
// 14a. Helper unit tests in an isolated vm ctx (fake timers + fake clock).
function helperCtx() {
  let fakeNow = 1000000;
  const timerQ = [];
  function fakeSetTimeout(fn, ms) { const id = timerQ.length + 1; timerQ.push({ id: id, fn: fn, at: fakeNow + (ms || 0) }); return id; }
  function fakeClearTimeout(id) { const i = timerQ.findIndex(function (t) { return t.id === id; }); if (i >= 0) timerQ.splice(i, 1); }
  function runTimersUntil(t) {
    for (;;) {
      timerQ.sort(function (a, b) { return a.at - b.at; });
      const nx = timerQ[0];
      if (!nx || nx.at > t) { fakeNow = t; return; }
      timerQ.shift();
      fakeNow = nx.at;
      nx.fn();
    }
  }
  const log = { spoken: [], cancelled: 0, errors: [] };
  const synth = {
    _voices: [], _listeners: {},
    speaking: false, pending: false,
    getVoices: function () { return this._voices.slice(); },
    addEventListener: function (t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); },
    removeEventListener: function () {},
    cancel: function () { log.cancelled++; },
    speak: function (u) { log.spoken.push(u); },
    _fireVoices: function (v) { this._voices = v.slice(); const l = (this._listeners['voiceschanged'] || []).slice(); l.forEach(function (f) { try { f(); } catch (e) {} }); }
  };
  const sb = {
    console: console,
    setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout,
    Date: { now: function () { return fakeNow; } },
    speechSynthesis: synth,
    SpeechSynthesisUtterance: function (t) { this.text = t || ''; this.lang = ''; this.rate = 1; this.voice = null; this.onerror = null; }
  };
  sb.window = sb;
  const ctx = vm.createContext(sb);
  ctx.__h = { log: log, synth: synth, runTimersUntil: runTimersUntil, now: function () { return fakeNow; }, setNow: function (v) { fakeNow = v; } };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'v52.js'), 'utf8'), ctx, { filename: 'v52.js' });
  return ctx;
}
function hSpeak(ctx, text, lang) {
  return vm.runInContext(`window.__v52.speak(${JSON.stringify(text)},${JSON.stringify(lang)},0.85,function(code){window.__errs.push(code)})`, ctx);
}
{
  // 14a.1 voices ready: exact-lang voice picked for EN + KO.
  const c = helperCtx();
  vm.runInContext(`window.__errs=[];`, c);
  c.__h.synth._voices = [{ name: 'Google US English', lang: 'en-US', default: true }, { name: 'Google 한국어', lang: 'ko-KR' }];
  hSpeak(c, 'hello', 'en-US');
  hSpeak(c, '안녕하세요', 'ko-KR');
  check('14a.1 EN speaks with the en-US voice', c.__h.log.spoken.length === 2 && c.__h.log.spoken[0].voice.name === 'Google US English' && c.__h.log.spoken[0].lang === 'en-US', c.__h.log.spoken.map(function (u) { return { text: u.text, voice: u.voice && u.voice.name }; }));
  check('14a.2 KO speaks with the ko-KR voice', c.__h.log.spoken[1].voice.name === 'Google 한국어' && c.__h.log.spoken[1].lang === 'ko-KR', c.__h.log.spoken[1] && c.__h.log.spoken[1].voice);
  // 14a.3 exact match beats the default voice.
  const c2 = helperCtx();
  vm.runInContext(`window.__errs=[];`, c2);
  c2.__h.synth._voices = [{ name: 'Google UK English', lang: 'en-GB', default: true }, { name: 'Google US English', lang: 'en-US' }];
  hSpeak(c2, 'hello', 'en-US');
  check('14a.3 exact lang match beats the default voice', c2.__h.log.spoken.length === 1 && c2.__h.log.spoken[0].voice.lang === 'en-US', c2.__h.log.spoken[0] && c2.__h.log.spoken[0].voice);
  // 14a.4 lang-prefix match when no exact voice exists.
  const c3 = helperCtx();
  vm.runInContext(`window.__errs=[];`, c3);
  c3.__h.synth._voices = [{ name: 'Google UK English', lang: 'en-GB' }];
  hSpeak(c3, 'hello', 'en-US');
  check('14a.4 lang-prefix match (en-GB for en-US)', c3.__h.log.spoken.length === 1 && c3.__h.log.spoken[0].voice.lang === 'en-GB', c3.__h.log.spoken[0] && c3.__h.log.spoken[0].voice);
  // 14a.5 no match + no default: honest error, never a wrong-language voice.
  const c4 = helperCtx();
  vm.runInContext(`window.__errs=[];`, c4);
  c4.__h.synth._voices = [{ name: 'Google US English', lang: 'en-US' }];
  hSpeak(c4, '안녕하세요', 'ko-KR');
  const errs4 = vm.runInContext(`JSON.stringify(window.__errs)`, c4);
  check('14a.5 no matching voice: no speak, onErr no-voice', c4.__h.log.spoken.length === 0 && JSON.parse(errs4).length === 1 && JSON.parse(errs4)[0] === 'no-voice', { spoken: c4.__h.log.spoken.length, errs: errs4 });
  // 14a.6 default voice is the fallback (per contract).
  const c5 = helperCtx();
  vm.runInContext(`window.__errs=[];`, c5);
  c5.__h.synth._voices = [{ name: 'Voix française', lang: 'fr-FR', default: true }];
  hSpeak(c5, 'hello', 'en-US');
  check('14a.6 default voice is the fallback', c5.__h.log.spoken.length === 1 && c5.__h.log.spoken[0].voice.lang === 'fr-FR', c5.__h.log.spoken[0] && c5.__h.log.spoken[0].voice);
  // 14a.7 delayed voices (the Android case): queued, then spoken on load.
  const c6 = helperCtx();
  vm.runInContext(`window.__errs=[];`, c6);
  const r6 = hSpeak(c6, 'hello', 'en-US');
  check('14a.7a empty voices: speak queues (returns true), nothing spoken yet', r6 === true && c6.__h.log.spoken.length === 0 && vm.runInContext(`window.__v52._test.pending()!==null`, c6), { ret: r6, spoken: c6.__h.log.spoken.length });
  c6.__h.synth._fireVoices([{ name: 'Google US English', lang: 'en-US', default: true }, { name: 'Google 한국어', lang: 'ko-KR' }]);
  check('14a.7b after voices load: the queued utterance speaks with the en voice', c6.__h.log.spoken.length === 1 && c6.__h.log.spoken[0].voice.lang === 'en-US', c6.__h.log.spoken.map(function (u) { return u.voice && u.voice.name; }));
  // 14a.8 never loads: honest no-voice error after the 2000 ms bound.
  const c7 = helperCtx();
  vm.runInContext(`window.__errs=[];`, c7);
  hSpeak(c7, 'hello', 'en-US');
  c7.__h.runTimersUntil(c7.__h.now() + 2500);
  const errs7 = vm.runInContext(`JSON.stringify(window.__errs)`, c7);
  check('14a.8 voices never load: onErr no-voice after the bound, no speak', c7.__h.log.spoken.length === 0 && JSON.parse(errs7).length === 1 && JSON.parse(errs7)[0] === 'no-voice', { spoken: c7.__h.log.spoken.length, errs: errs7 });
  check('14a.8b wait bound is 2000 ms', vm.runInContext(`window.__v52._test.waitMs`, c7) === 2000);
  // 14a.9 cancel only when speaking; speak on the next tick after cancel.
  const c8 = helperCtx();
  vm.runInContext(`window.__errs=[];`, c8);
  c8.__h.synth._voices = [{ name: 'Google US English', lang: 'en-US', default: true }];
  c8.__h.synth.speaking = true;
  hSpeak(c8, 'hello', 'en-US');
  check('14a.9a speaking: cancel called, speak deferred', c8.__h.log.cancelled === 1 && c8.__h.log.spoken.length === 0, { cancelled: c8.__h.log.cancelled, spoken: c8.__h.log.spoken.length });
  c8.__h.runTimersUntil(c8.__h.now() + 150);
  check('14a.9b after the 100 ms tick: the utterance speaks', c8.__h.log.spoken.length === 1 && c8.__h.log.spoken[0].voice.lang === 'en-US', c8.__h.log.spoken.length);
  // 14a.10 idle: no cancel, speak at once.
  const c9 = helperCtx();
  vm.runInContext(`window.__errs=[];`, c9);
  c9.__h.synth._voices = [{ name: 'Google US English', lang: 'en-US', default: true }];
  hSpeak(c9, 'hello', 'en-US');
  check('14a.10 idle: no cancel, speak immediately', c9.__h.log.cancelled === 0 && c9.__h.log.spoken.length === 1, { cancelled: c9.__h.log.cancelled, spoken: c9.__h.log.spoken.length });
  // 14a.11 utterance onerror: real errors surface; 'canceled' is ignored.
  const c10 = helperCtx();
  vm.runInContext(`window.__errs=[];`, c10);
  c10.__h.synth._voices = [{ name: 'Google US English', lang: 'en-US', default: true }];
  hSpeak(c10, 'hello', 'en-US');
  const u10 = c10.__h.log.spoken[0];
  u10.onerror({ error: 'canceled' });
  let errs10 = JSON.parse(vm.runInContext(`JSON.stringify(window.__errs)`, c10));
  check('14a.11a canceled error is ignored (own cancel)', errs10.length === 0, errs10);
  u10.onerror({ error: 'synthesis-failed' });
  errs10 = JSON.parse(vm.runInContext(`JSON.stringify(window.__errs)`, c10));
  check('14a.11b real synthesis error surfaces as onErr error', errs10.length === 1 && errs10[0] === 'error', errs10);
  // 14a.12 unsupported: no speechSynthesis at all.
  const c11 = helperCtx();
  vm.runInContext(`window.__errs=[]; window.speechSynthesis=undefined;`, c11);
  const r11 = hSpeak(c11, 'hello', 'en-US');
  const errs11 = JSON.parse(vm.runInContext(`JSON.stringify(window.__errs)`, c11));
  check('14a.12 unsupported: returns false + onErr unsupported', r11 === false && errs11.length === 1 && errs11[0] === 'unsupported', { ret: r11, errs: errs11 });
  // 14a.13 latest-wins queue: two speaks while voices are empty.
  const c12 = helperCtx();
  vm.runInContext(`window.__errs=[];`, c12);
  hSpeak(c12, 'first', 'en-US');
  hSpeak(c12, 'second', 'en-US');
  c12.__h.synth._fireVoices([{ name: 'Google US English', lang: 'en-US', default: true }]);
  check('14a.13 latest queued utterance wins (second only)', c12.__h.log.spoken.length === 1 && c12.__h.log.spoken[0].text === 'second', c12.__h.log.spoken.map(function (u) { return u.text; }));
}
{
  // 14b. Live (full page): every exported speak path delegates to __v52.
  const TTS_STUB2 = `
window.__ttsLog={spoken:[],gv:0,cancelled:0,pops:[]};
window.pop=function(t){window.__ttsLog.pops.push(t)};
window.toast=function(t){window.__ttsLog.pops.push(t)};
window.speechSynthesis={
  _voices:[], _listeners:{},
  getVoices(){ window.__ttsLog.gv++; return this._voices.slice(); },
  addEventListener(t,f){ (this._listeners[t]=this._listeners[t]||[]).push(f); },
  removeEventListener(t,f){ var l=this._listeners[t]||[]; var i=l.indexOf(f); if(i>=0) l.splice(i,1); },
  cancel(){ window.__ttsLog.cancelled++; },
  speak(u){ window.__ttsLog.spoken.push({text:u.text,lang:u.lang,voice:u.voice?u.voice.name:null,voiceLang:u.voice?u.voice.lang:null}); },
  _fireVoices(v){ this._voices=v.slice(); var l=(this._listeners['voiceschanged']||[]).slice(); l.forEach(function(f){ try{f();}catch(e){} }); }
};`;
  function installTTS2(ctx) { E(ctx, TTS_STUB2); }
  function ttsLog2(ctx) { return J(ctx, `JSON.stringify(window.__ttsLog)`); }
  const VOICES = [{ name: 'Google US English', lang: 'en-US', default: true }, { name: 'Google 한국어', lang: 'ko-KR' }];
  // voices ready: speakWord / speakKO v18+v19 / speakKOText v27.
  const ct = seededCtx();
  installTTS2(ct);
  E(ct, `window.speechSynthesis._voices=${JSON.stringify(VOICES)}`);
  const w0 = J(ct, `JSON.stringify((function(){var w=window.__v15.words[0]; return {id:w.id,en:w.en};})())`);
  E(ct, `window.__v15.speakWord(${JSON.stringify(w0.id)})`);
  E(ct, `window.__v18.speakKO('안녕하세요')`);
  E(ct, `window.__v19.speakKO('안녕하세요')`);
  E(ct, `window.__v27.speakKOText('안녕하세요')`);
  const logT = ttsLog2(ct);
  check('14b.1 __v52 present at runtime (19.5.1)', J(ct, `JSON.stringify(window.__v52.version)`) === '19.5.1');
  check('14b.2 speakWord speaks with the en-US voice', logT.spoken.length >= 1 && logT.spoken[0].voice === 'Google US English' && logT.spoken[0].lang === 'en-US', logT.spoken[0]);
  check('14b.3 speakKO (v18) speaks with the ko-KR voice', logT.spoken.length >= 2 && logT.spoken[1].voice === 'Google 한국어' && logT.spoken[1].lang === 'ko-KR', logT.spoken[1]);
  check('14b.4 speakKO (v19) speaks with the ko-KR voice', logT.spoken.length >= 3 && logT.spoken[2].voice === 'Google 한국어', logT.spoken[2]);
  check('14b.5 speakKOText (v27) speaks with the ko-KR voice', logT.spoken.length >= 4 && logT.spoken[3].voice === 'Google 한국어', logT.spoken[3]);
  check('14b.6 all live speaks consulted getVoices()', logT.gv >= 4, { gv: logT.gv });
  check('14b.7 no cancel-then-speak drop when idle (cancel 0)', logT.cancelled === 0, { cancelled: logT.cancelled });
  // delayed voices on the live page: queued, then spoken on load.
  const cd = seededCtx();
  installTTS2(cd);
  E(cd, `window.__v15.speakWord(${JSON.stringify(w0.id)})`);
  const logD0 = ttsLog2(cd);
  check('14b.8 delayed voices: speak queues (nothing spoken yet)', logD0.spoken.length === 0 && J(cd, `window.__v52._test.pending()!==null`), logD0);
  E(cd, `window.speechSynthesis._fireVoices(${JSON.stringify(VOICES)})`);
  const logD1 = ttsLog2(cd);
  check('14b.9 delayed voices: queued utterance speaks after load (en voice)', logD1.spoken.length === 1 && logD1.spoken[0].voice === 'Google US English', logD1.spoken);
  // no voice at all: honest error via pop, never silent.
  const cn = seededCtx();
  installTTS2(cn);
  E(cn, `window.__v15.speakWord(${JSON.stringify(w0.id)})`);
  E(cn, `window.__v52._test.flush()`);
  const logN = ttsLog2(cn);
  check('14b.10 no voice ever: honest error shown (pop)', logN.spoken.length === 0 && logN.pops.length === 1 && logN.pops[0] === 'Không phát được âm thanh — bấm Nghe lại.', logN);
  // Dojo speakText live: seed learned words, start a Dojo session, listen.
  const cj = seededCtx();
  installTTS2(cj);
  E(cj, `window.speechSynthesis._voices=${JSON.stringify(VOICES)}`);
  const dojoR = J(cj, `JSON.stringify((function(){
    var v15=window.__v15, old=v15.enOld();
    for(var i=0;i<12&&i<v15.words.length;i++) old.box[v15.words[i].id]=1;
    v15.save15();
    var r=window.__v48._test.startDojo('en',false);
    if(!r.ok) return {ok:false, why:r.gate&&r.gate.why};
    var dl=window.__v48.dojoListen();
    var log=window.__ttsLog;
    return {ok:true, word:window.__v48._test.dojoState().word.head, spoken:log.spoken.slice(), pops:log.pops.slice()};
  })())`);
  check('14b.11 Dojo listen speaks the word with the en voice', dojoR.ok === true && dojoR.spoken.length >= 1 && dojoR.spoken[0].voice === 'Google US English' && dojoR.spoken[0].text === dojoR.word, dojoR);
}

// ---------- section C: Chrome-only ----------
section('C', 'Chrome-only (SKIP — real rendering, clicks, contrast)');
{
  skipCheck('C.1 real Chrome: C-R5-1 mixed-mode fight XP trace (both engines, EN + KO)', 'verify-v52c.js');
  skipCheck('C.2 real Chrome: TTS helper with stubbed voices (delayed / no-match / never-loads)', 'verify-v52c.js');
  skipCheck('C.3 real Chrome: F-1 restart repro now CLOSED in both engines (live speech stub)', 'verify-v52c.js');
  skipCheck('C.4 real Chrome: C-R5-2 "Đến hạn hôm nay" label in the Smart weak list', 'verify-v52c.js');
  skipCheck('C.5 real Chrome: C-R5-3 Forge end screen shows "Điểm buổi / Điểm cao nhất"', 'verify-v52c.js');
  skipCheck('C.6 real Chrome: C-R5-4 KO Hub at 360px — 11 buttons >= 44px, no overflow', 'verify-v52c.js');
  skipCheck('C.7 real Chrome: listening chip + error box contrast in light + dark themes', 'verify-v52c.js');
  skipCheck('C.8 real Android phone: real TTS audio end-to-end', 'Anh — headless Chrome has no voices and no audio');
  skipCheck('C.9 real phone: real microphone end-to-end', 'Anh — needs a real mic; headless Chrome has none');
  skipCheck('C.10 live Firebase login/sync', 'never tested live, as in every version');
}

// ---------- async tail: speak22 live (needs async fetch) + summary ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async function () {
  section('14c', 'Android TTS live — speak22 via BT entry (async fetch)');
  {
    // BT data loads through the sandbox fetch (test38 pattern): serve
    // the real JSON from disk so ensureData resolves in vm.
    const btJson = fs.readFileSync(path.join(ROOT, 'out', 'basic_tactics_vocabulary.json'), 'utf8');
    const ctx = makeCtx();
    ctx.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(btJson) });
    const loaded = loadPage(ctx, html);
    if (loaded.loadErr) { console.log('LOAD ERR (speak22 ctx):', loaded.loadErr); process.exit(1); }
    fireDCL(ctx);
    E(ctx, 'window.__v15.buildWords()');
    E(ctx, `
window.__ttsLog={spoken:[],gv:0,cancelled:0,pops:[]};
window.pop=function(t){window.__ttsLog.pops.push(t)};
window.toast=function(t){window.__ttsLog.pops.push(t)};
window.speechSynthesis={
  _voices:[], _listeners:{},
  getVoices(){ window.__ttsLog.gv++; return this._voices.slice(); },
  addEventListener(t,f){ (this._listeners[t]=this._listeners[t]||[]).push(f); },
  removeEventListener(t,f){},
  cancel(){ window.__ttsLog.cancelled++; },
  speak(u){ window.__ttsLog.spoken.push({text:u.text,lang:u.lang,voice:u.voice?u.voice.name:null,voiceLang:u.voice?u.voice.lang:null}); },
  _fireVoices(v){ this._voices=v.slice(); }
};`);
    E(ctx, `window.speechSynthesis._voices=[{name:'Google US English',lang:'en-US',default:true},{name:'Google 한국어',lang:'ko-KR'}]`);
    E(ctx, `window.__v22.openQuest(1)`);
    await sleep(600);
    const btLoaded = J(ctx, `JSON.stringify(!!window.__V22_BT && Array.isArray(window.__V22_BT.units) && window.__V22_BT.units.length===24)`);
    check('14c.1 BT data loaded in vm (24 units)', btLoaded === true, btLoaded);
    E(ctx, `window.__v22.speakEntryByText(1,0,0)`);
    const log22 = J(ctx, `JSON.stringify(window.__ttsLog)`);
    const spoken22 = J(ctx, `JSON.stringify(window.__v22._test.spoken())`);
    check('14c.2 speakEntryByText speaks via __v52 with the en voice', log22.spoken.length === 1 && log22.spoken[0].voice === 'Google US English' && log22.spoken[0].lang === 'en-US', log22.spoken);
    check('14c.3 SPOKEN_LOG records the BT entry', spoken22.length === 1 && typeof spoken22[0] === 'string' && spoken22[0].length > 0, spoken22);
    check('14c.4 speak22 consulted getVoices()', log22.gv >= 1, { gv: log22.gv });
  }

  console.log('\n== test52 summary ==');
  console.log(`PASS ${pass}  FAIL ${fail}  SKIP ${skip}`);
  for (const [id, c] of Object.entries(secCounts)) console.log(`  ${id}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log('  - ' + f)); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('test52 async tail failed:', e); process.exit(1); });
