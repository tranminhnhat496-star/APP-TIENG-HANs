// test48.js - V19.3 (layer V48) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v47/test47.js; only the EXPECTED_SHA /
// EXPECTED_BYTES constants and the V47-specific sections were replaced.
// Usage: node tools/v48/test48.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// The Node process is exited explicitly at the end: the game starts
// real setInterval timers (e.g. Matching) that keep the event loop
// alive after the checks finish.
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V48
//         fragments with exact counts, TOTAL_BOSSES 87, KO button,
//         V47 fragments survive, OLD V48 fragments gone, v14js block
//         untouched)
//   section L page load (vm, real inline scripts) + __v48/__V48_DATA
//         exports + __v47 regression exports
//   section 48A Forge EN — real builder bank (40), gates, scoring,
//         full 5-sentence session through tap/check/next, XP channel
//         (+2 per correct + one +10 session bonus = +20, never
//         stacked), wrong answer pays 0 and resets the streak
//   section 48B Forge KO — learned gates (ko-words / ko-sent) +
//         pool is exactly the real example sentences on the
//         player's own learned cards, nothing invented
//   section 48C Bounty Board — 4 daily + 4 weekly quests, progress
//         from real V48 events, chests claimed-guarded (second claim
//         refused), day streak yesterday 2 + correct today -> 3
//   section 48D Word Family Tree — relations are real WORDS/card
//         records, synonym/antonym/Sino-Korean branches honestly
//         empty, branch completes at box 3, +10 XP once
//   section 48E Pronunciation Dojo — gradeTranscript Tốt/Khá/Lệch
//         thresholds (incl. KO), gates, advanced tier locked before
//         a golem win and derived from the real en19 win record,
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
const EXPECTED_SHA = 'dc971a6c1f386b6bc27a3423d9352ff606697d057d156e7e0141777f82dc36bd';
const EXPECTED_BYTES = 2513911;
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

// ================= repro main (V19.4 — boss mic defects, pristine V19.3 base) =================
// Each R section proves one defect from the task on the UNFIXED base.
// Exit 0 = repro ran to completion; the table says which defects reproduced.
async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log('FAIL: ' + htmlPath + ' missing'); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  console.log('base sha256:', sha, sha === EXPECTED_SHA ? '(pristine V19.3 OK)' : '(NOT the expected base!)');
  console.log('base bytes:', fs.statSync(htmlPath).size);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  function mulberry32(seed) { let s = seed | 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function seededCtx(htmlText, seed) {
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
  const SR_STUB_SRC = [
    'window.SpeechRecognition = function(){',
    '  var self=this; window.__lastSR49=self;',
    '  self.lang=""; self.interimResults=false; self.maxAlternatives=3;',
    '  self.onresult=null; self.onerror=null; self.onend=null;',
    '  self._aborted=false; self._lostSync=false;',
    '  self.start=function(){',
    '    if(window.__SRMODE==="throw"){ throw new Error("mic-start-throw"); }',
    '    if(window.__SRMODE==="syncfire"){',
    '      self._lostSync = !self.onresult;',
    '      if(self.onresult) self.onresult({results:[[{transcript: window.__SRWORD||"apple"}]]});',
    '    }',
    '  };',
    '  self.abort=function(){ self._aborted=true; };',
    '  self.stop=function(){};',
    '  self.fireResult=function(t){ if(self.onresult) self.onresult({results:[[{transcript:t}]]}); };',
    '  self.fireError=function(code){ if(self.onerror) self.onerror({error:code}); };',
    '  self.fireEnd=function(){ if(self.onend) self.onend(); };',
    '};',
    'window.webkitSpeechRecognition = window.SpeechRecognition;'
  ].join('\n');
  function installSR(ctx, mode) {
    E(ctx, SR_STUB_SRC);
    E(ctx, 'window.__SRMODE=' + JSON.stringify(mode) + ';');
  }
  function startWizard(ctx) {
    return J(ctx, 'JSON.stringify((function(){'
      + 'var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};'
      + 'var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=="old") e18.bosses[b.id]={win:true}; });'
      + 'v18.fight("v10_wizard","en");'
      + 'var F=v18._test.F();'
      + 'return {live:!!F, qmode:F&&F.qmode, word:F&&F.cur&&F.cur.w&&F.cur.w.en, boss:F&&F.boss&&F.boss.id, timer:!!(F&&F.timer), left:F&&F.left};'
      + '})())');
  }
  function F18(ctx) {
    return J(ctx, 'JSON.stringify((function(){var F=window.__v18._test.F(); if(!F) return null;'
      + 'return {answered:F.answered, ok:F.ok, hearts:F.hearts, hp:F.hp, qmode:F.qmode,'
      + ' word:F.cur&&F.cur.w&&F.cur.w.en, heard:F.heard||null, listening:!!F.listening};})())');
  }
  function fightHTML(ctx) { return E(ctx, 'document.querySelector("#v18fight").innerHTML'); }
  function speakBtn(html) { const m = html.match(/<button[^>]*onclick="__v18\.bossSpeak\(\)"[^>]*>/); return m ? m[0] : null; }
  const R = {};
  function repro(id, reproduced, evidence) {
    R[id] = reproduced;
    console.log((reproduced ? 'REPRO ' : 'NOT-REPRO ') + id + ' — ' + JSON.stringify(evidence).slice(0, 400));
  }

  // ---- R0: code identity + speak-boss enumeration ----
  {
    const v18src = fs.readFileSync(path.join(ROOT, 'src', 'v18.js'), 'utf-8');
    const v19src = fs.readFileSync(path.join(ROOT, 'src', 'v19.js'), 'utf-8');
    const grab = (s) => { const m = s.match(/function bossSpeak\(\)\{[\s\S]*?\n\}/); return m ? m[0] : null; };
    const b18 = grab(v18src), b19 = grab(v19src);
    console.log('R0 v18 bossSpeak lines:', b18 ? b18.split('\n').length : 0, '| v19 identical body:', b18 === b19);
    console.log('R0 start() before handlers in both:', b18.indexOf('rec.start()') < b18.indexOf('rec.onresult='));
    const c = seededCtx(html, 11);
    const en = J(c, 'JSON.stringify((function(){'
      + 'var out={speak18:[], speak19:[], speak33:[], speak35:[], speak48:[]};'
      + 'var d18=window.__v18.bosses; (d18.old||[]).concat(d18.en||[],d18.el||[],d18.leg||[]).forEach(function(b){ if(b.mode==="speak") out.speak18.push(b.id); });'
      + 'window.__V19_DATA.bosses.forEach(function(b){ if(b.mode==="speak") out.speak19.push(b.id); });'
      + 'window.__V33_DATA.bosses.forEach(function(b){ if(b.mode==="speak") out.speak33.push(b.id); });'
      + 'window.__V35_DATA.bosses.forEach(function(b){ if(b.mode==="speak") out.speak35.push(b.id); });'
      + 'if(window.__V48_DATA.boss.mode==="speak") out.speak48.push(window.__V48_DATA.boss.id);'
      + 'return out;})())');
    console.log('R0 speak-mode bosses:', JSON.stringify(en));
  }

  // ---- R1: rec.start() before handlers — a result fired inside start() is lost ----
  {
    const c = seededCtx(html, 11);
    const w = startWizard(c);
    installSR(c, 'syncfire');
    E(c, 'window.__SRWORD=' + JSON.stringify(w.word) + ';');
    E(c, 'window.__v18.bossSpeak()');
    const f = F18(c);
    const lost = E(c, 'window.__lastSR49._lostSync');
    repro('D1-handlers-after-start', lost === true && f.answered === null, { word: w.word, lostSync: lost, answered: f.answered, qmode: f.qmode });
  }

  // ---- R2: no listening state ----
  {
    const c = seededCtx(html, 12);
    const w = startWizard(c);
    installSR(c, 'silent');
    E(c, 'window.__v18.bossSpeak()');
    const h = fightHTML(c);
    const btn = speakBtn(h);
    repro('D2-no-listening-state', !/Đang nghe/.test(h) && !(btn && /disabled/.test(btn)), { word: w.word, hasListeningText: /Đang nghe/.test(h), speakBtn: btn });
  }

  // ---- R3: start() throws -> silent, no message ----
  {
    const c = seededCtx(html, 13);
    const w = startWizard(c);
    installSR(c, 'throw');
    E(c, 'window.__v18.bossSpeak()');
    const f = F18(c);
    const h = fightHTML(c);
    repro('D3-silent-start-failure', f.answered === null && !/thử lại/.test(h) && !/Không mở được micro|micro bị chặn|kiểm tra micro/i.test(h), { word: w.word, answered: f.answered, hasRetryText: /thử lại/.test(h) });
  }

  // ---- R4: onend with no result/error -> frozen card, no "Tiếp tục" ----
  {
    const c = seededCtx(html, 14);
    const w = startWizard(c);
    installSR(c, 'silent');
    E(c, 'window.__v18.bossSpeak()');
    E(c, 'window.__lastSR49.fireEnd()');
    const f = F18(c);
    const h = fightHTML(c);
    repro('D4-no-onend-handler', f.answered === null && !/Tiếp tục/.test(h) && !/thử lại/.test(h), { word: w.word, answered: f.answered, hasNext: /Tiếp tục/.test(h) });
  }

  // ---- R5: timer race + stale result ----
  {
    const c = seededCtx(html, 15);
    const w = startWizard(c);
    // (a) structural: no timer runs on a speak question TODAY (latent in shipped data)
    repro('D5a-no-timer-on-speak-today', w.timer === false && w.left === 0, { boss: w.boss, timer: w.timer, left: w.left });
    installSR(c, 'silent');
    E(c, 'window.__v18.bossSpeak()');
    const w1 = F18(c).word;
    // (b) simulate the timeout stealing the answer: close the question, then deliver the result
    E(c, 'window.__v18._test.pickWrong()');
    const closed = F18(c);
    E(c, 'window.__lastSR49.fireResult(' + JSON.stringify(w1) + ')');
    const afterDrop = F18(c);
    repro('D5b-late-result-dropped', closed.answered !== null && afterDrop.answered === closed.answered && afterDrop.ok === false,
      { word: w1, answeredBefore: closed.answered, answeredAfter: afterDrop.answered, okAfter: afterDrop.ok });
    // (c) stale result answers the NEXT question (old rec, old word)
    E(c, 'window.__v18.next()');
    const q2 = F18(c);
    E(c, 'window.__lastSR49.fireResult(' + JSON.stringify(w1) + ')');
    const corrupted = F18(c);
    repro('D5c-stale-result-answers-next-Q', q2.answered === null && corrupted.answered !== null,
      { oldWord: w1, newWord: q2.word, answeredBefore: q2.answered, answeredAfter: corrupted.answered, okAfter: corrupted.ok });
    // (d) v19 code is identical, so the same defects exist there (direct check via forced speak state)
    const c19 = seededCtx(html, 16);
    const r19 = J(c19, 'JSON.stringify((function(){'
      + 'var v19=window.__v19, e19=v19.en19(); e19.bosses=e19.bosses||{};'
      + 'window.__V19_DATA.bosses.forEach(function(b){ e19.bosses[b.id]={en:{win:1}}; });'
      + 'v19.openMapFor("en"); v19.fight("v11_fireking");'
      + 'var F=v19._test.F(); if(!F) return {live:false};'
      + 'var w=window.__v15.words[0]; F.qmode="speak"; F.cur={w:w,opts:[w]};'
      + 'return {live:true, qmode:F.qmode, word:w.en};'
      + '})())');
    installSR(c19, 'syncfire');
    E(c19, 'window.__SRWORD=' + JSON.stringify(r19.word) + ';');
    E(c19, 'window.__v19.bossSpeak()');
    const f19 = J(c19, 'JSON.stringify((function(){var F=window.__v19._test.F(); return {answered:F.answered, heard:F.heard||null}})())');
    const lost19 = E(c19, 'window.__lastSR49._lostSync');
    repro('D5d-v19-same-defect', lost19 === true && f19.answered === null, { word: r19.word, lostSync: lost19, answered: f19.answered });
  }

  // ---- R6: generic error, no reason, no retry guidance ----
  {
    const c = seededCtx(html, 17);
    const w = startWizard(c);
    installSR(c, 'silent');
    E(c, 'window.__v18.bossSpeak()');
    E(c, 'window.__lastSR49.fireError("not-allowed")');
    const f = F18(c);
    const h = fightHTML(c);
    repro('D6-generic-error', f.heard === '(không nghe được)' && !/chặn/.test(h) && !/Cho phép/.test(h) && !/thử lại/.test(h),
      { word: w.word, heard: f.heard, hasGuidance: /chặn|Cho phép|thử lại/.test(h) });
  }

  console.log('\n== repro summary (pristine V19.3 base) ==');
  Object.keys(R).forEach(k => console.log('  ' + k + ': ' + (R[k] ? 'REPRODUCED' : 'not reproduced')));
  const n = Object.values(R).filter(Boolean).length;
  console.log('defects reproduced: ' + n + '/' + Object.keys(R).length);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
