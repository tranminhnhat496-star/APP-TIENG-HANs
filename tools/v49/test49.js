// test49.js - V19.4 (layer V49) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v48/test48.js (which reused tools/v47/test47.js);
// only the EXPECTED_SHA / EXPECTED_BYTES constants and the V49-specific
// sections were replaced.
// Usage: node tools/v49/test49.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// The Node process is exited explicitly at the end: the game starts
// real setInterval timers (e.g. Matching) that keep the event loop
// alive after the checks finish.
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V49
//         fragments with exact counts, old V49 fragments gone,
//         V33-V48 fragments survive, v15 speakRecord + v48 dojoListen
//         untouched)
//   section 1 D1 fixed — handlers before start(): a result fired
//         synchronously inside start() is applied (sync-fire stub)
//   section 2 D2 fixed — listening state: "Đang nghe… hãy nói:
//         <word>", Nói button disabled while listening, speakState()
//         hook reports it
//   section 3 D3 fixed — start() throwing shows the start-failed
//         message with a retry, never silent
//   section 4 D4 fixed — onend with no result shows the no-speech
//         message, never a freeze; the player can re-tap "Nói"
//   section 5 D5 fixed — timer guard (forced timed speak question:
//         F.left 0, no timer) + late results dropped + stale results
//         never answer the next question (both engines; per-question
//         token; next()/close() abort + bump the token)
//   section 6 D6 fixed — one specific message per error code
//         (not-allowed / service-not-allowed / no-speech /
//         audio-capture / network / aborted / unknown); the generic
//         "(không nghe được)" never appears as F.heard again
//   section 7 regressions — voice XP parity with MC answers (+10
//         per fresh correct word, 0 on wrong), full wizard fight won
//         by voice, non-speak boss unaffected, KO fights map
//         speak->mc, no-SR honest state, double-tap ignored, nextQ
//         clears stale speak state, v15 speakRecord + v48 Dojo
//         untouched, WORDS 4892 / a1a2 998 / Oxford 3395, legDiff
//         thresholds, TOTAL_BOSSES 87, golem Lv 77
//   section 8 structure — v49.js never uses window.S or
//         localStorage, no new save key, marker order (v49 last)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint); the
// painted fight card, the real click + answer states, the 360px
// overflow check, and the per-question screens are Chrome gates in
// verify-v49c.js, not asserted here; live-browser, real-phone and
// live-Firebase gates stay Chrome/Anh-only.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = '0b9139ef154096254edd4748cb8a76abc050cb6d1c00c9e0afb17705906a2d65';
const EXPECTED_BYTES = 2522575;
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


// ================= test main (V19.4 — boss mic fix, Node vm) =================
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
section('0', 'static build integrity (V19.4)');
{
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, 'index.html'))).digest('hex');
  const bytes = fs.statSync(path.join(DIR, 'index.html')).size;
  check('0.1 index.html sha256 == V19.4 build', sha === EXPECTED_SHA, sha.slice(0, 12));
  check('0.2 index.html bytes == 2522575', bytes === EXPECTED_BYTES, bytes);
  check('0.3 title is V19.4 Boss Mic Fix', html.includes('V19.4 — Boss Mic Fix'));
  check('0.4 no V19.3 title remains', !html.includes('V19.3 — Sentence Forge'));
  check('0.5 __v49 19.4.0 present', html.includes("window.__v49={") && html.includes("VERSION='19.4.0'"));
  check('0.6 v49 style + script markers present once each', countOcc(html, 'id="v49"') === 1 && countOcc(html, 'id="v49js"') === 1);
  const styleIds = [...html.matchAll(/<style id="(v\d+)"/g)].map(m => m[1]);
  const scriptIds = [...html.matchAll(/<script id="(v\d+)js"/g)].map(m => m[1]);
  check('0.7 v49 style is the last style marker', styleIds[styleIds.length - 1] === 'v49', styleIds.slice(-3));
  check('0.8 v49 script is the last script marker', scriptIds[scriptIds.length - 1] === 'v49', scriptIds.slice(-3));
  check('0.9 v49js after v48js', html.indexOf('id="v49js"') > html.indexOf('id="v48js"'));
  check('0.10 old versions intact (19.3.0 + 19.2.0 + 19.0.1)', html.includes("VERSION='19.3.0'") && html.includes("VERSION='19.2.0'") && html.includes("VERSION='19.0.1'"));
  check('0.11 speakErrMsg 15x (3 in v49.js + 6 per engine)', countOcc(html, 'speakErrMsg') === 15, countOcc(html, 'speakErrMsg'));
  check('0.12 stopSpeak def x2 + calls x4 = 6', countOcc(html, 'stopSpeak()') === 6, countOcc(html, 'stopSpeak()'));
  check('0.13 speakState def + export x2 each', countOcc(html, 'function speakState(){') === 2 && countOcc(html, 'speakState:speakState,') === 2);
  check('0.14 speak timer guard x2', countOcc(html, "if(F.qmode==='speak'){F.left=0;return}") === 2);
  check('0.15 nextQ speak-state clear x2', countOcc(html, 'F.listening=false;F.rec=null;F.heard=null;F.speakErr=null;') === 2);
  check('0.16 F-literal speak fields x2', countOcc(html, 'listening:false,rec:null,speakToken:0,speakErr:null,') === 2);
  check('0.17 v49listen + v49err cards x2 each', countOcc(html, 'class="v49listen"') === 2 && countOcc(html, 'class="v49err"') === 2);
  check('0.18 silent start-catch survives only in v15.js:1537 (bossSpeak copies gone)', countOcc(html, '  try{rec.start()}catch(e){return}') === 1, countOcc(html, '  try{rec.start()}catch(e){return}'));
  check('0.19 old generic onerror gone', !html.includes("rec.onerror=function(){F.heard='(không nghe được)';renderFight()};"));
  check('0.20 old bossSpeak entry gone (F.cur.w unguarded)', !html.includes('  var w=F.cur.w;if(!w)return;'));
  check('0.21 v48 fragments survive (golem Lv 77, TOTAL_BOSSES 87)', html.includes('lv:77') && html.includes('var TOTAL_BOSSES=87;') && html.includes('v48kotab'));
  check('0.22 v15 speakRecord + v48 dojoListen untouched', countOcc(html, 'function speakRecord(') === 1 && countOcc(html, 'function dojoListen(') === 1);
  check('0.23 WORDS 4892 / a1a2 998 / Oxford 3395', countOcc(html, '"src": "a1a2"') === 998 && countOcc(html, '"src": "oxford"') === 3395);
  check('0.24 out/v49.js + out/v49.css == src/', fs.readFileSync(path.join(DIR, 'v49.js'), 'utf8') === fs.readFileSync(path.join(ROOT, 'src', 'v49.js'), 'utf8') && fs.readFileSync(path.join(DIR, 'v49.css'), 'utf8') === fs.readFileSync(path.join(ROOT, 'src', 'v49.css'), 'utf8'));
  check('0.25 out/v18.js + out/v19.js == src/', fs.readFileSync(path.join(DIR, 'v18.js'), 'utf8') === fs.readFileSync(path.join(ROOT, 'src', 'v18.js'), 'utf8') && fs.readFileSync(path.join(DIR, 'v19.js'), 'utf8') === fs.readFileSync(path.join(ROOT, 'src', 'v19.js'), 'utf8'));
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
    const oldHtml = fs.readFileSync(path.join(ROOT, 'tools', 'v49', 'backup-v19.3', 'out', 'index.html'), 'utf8');
    const oldSrc = grab(oldHtml);
    check('7h.1 v15 speakRecord source is byte-identical to pristine V19.3', newSrc !== null && newSrc === oldSrc);
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
  // 7k. No new save key: a fresh boot has no en49 subkey, and the
  // v49 layer writes nothing to localStorage.
  {
    const ctx = seededCtx();
    const keys = J(ctx, `JSON.stringify(Object.keys(JSON.parse(window.localStorage.getItem('hanvocab.v1')).v7||{}))`);
    check('7k.1 fresh boot has no en49 save key', !keys.includes('en49'), keys);
    const w = startWizard(ctx);
    E(ctx, `window.__v18.bossSpeak()`);
    const keys2 = J(ctx, `JSON.stringify(Object.keys(JSON.parse(window.localStorage.getItem('hanvocab.v1')).v7||{}))`);
    check('7k.2 speaking in a boss fight creates no en49 key', !keys2.includes('en49'), keys2);
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
}

// ---------- section C: Chrome-only ----------
section('C', 'Chrome-only (SKIP — real rendering, clicks, contrast)');
{
  skipCheck('C.1 real Chrome: listening chip + error box contrast in light + dark themes', 'verify-v49c.js');
  skipCheck('C.2 real Chrome: real click on "Nói" + stubbed SR end-to-end in the live DOM', 'verify-v49c.js');
  skipCheck('C.3 real Chrome: 360px fight card, no overflow, 44px targets', 'verify-v49c.js');
  skipCheck('C.4 real phone: real microphone end-to-end', 'Anh — needs a real mic; headless Chrome has none');
  skipCheck('C.5 live Firebase login/sync', 'never tested live, as in every version');
}

// ---------- summary ----------
console.log('\n== test49 summary ==');
console.log(`PASS ${pass}  FAIL ${fail}  SKIP ${skip}`);
for (const [id, c] of Object.entries(secCounts)) console.log(`  ${id}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log('  - ' + f)); }
process.exit(fail ? 1 : 0);
