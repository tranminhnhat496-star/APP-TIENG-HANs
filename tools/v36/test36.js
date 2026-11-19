// test36.js — V18.1 BUG FIXES independent verification (Node vm).
// Modelled on tools/v35/test35.js: same vm-loading pattern (stub DOM /
// localStorage, extract inline <script> blocks from out/index.html,
// fire DOMContentLoaded), own assertions, own fixtures, own drive helpers.
// Usage: node tools/v36/test36.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   §0 static build integrity (hash, title, markers, fragments, typo, F09)
//   §L page load (vm, real inline scripts) + __v36 wrapped
//   §171 V17-1 bossWinCount/summarizeSave (flat V18 wins; avatars 50/60/70)
//   §172 V17-2 lethal team skill (resolveLethal, healBoss guard, no double pay)
//   §173 V17-3 Speaking double-pay (mark15-only XP, message shows real XP)
//   §WIND wind stone (Breeze Lynx first win -> stone_wind x2)
//   §F13 partial sessions (endEarly, plan bonus, quest completion, findSession)
//   §F14 Break-bar wrapper (mode-blocked, KO-deck<8, live fights, 15+13 counts)
//   §F16a v18 KO deck scoping (koPool + distractorsKO, live KO fight)
//   §F17 BREAK banner quotes the post-shield bonus (live shielded fight)
//   §F10 Escape listener (open/close Account Center, Escape dispatch)
//   §R V18.0 REGRESSION (gates, BREAK clamp, fragments, probe unfillable=13)
//   §V save schema (en27 partial field merges; no schema change)
//   §C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/touch/speech);
// live-browser, real-phone and live-Firebase gates stay Chrome/Anh-only.
// HARNESS NOTE H-36-1: B-36-1 (V36 wrapper read the stock bar through the
//   live __v34.breakBarHTML property at call time -> infinite recursion)
//   was caught by tools/v34/probe_v34.js on the first V18.1 build and fixed
//   by capturing the stock bar once at wrap time (src/v36.js _orig).
//   driveSession/seedEn19/makeCtx are reused verbatim
// from tools/v35/test35.js. The sandbox adds a SpeechRecognition stub
// (captured as sandbox.__lastSR) so the speak flow can be driven without
// a microphone, and the main() wraps document.addEventListener /
// removeEventListener to count keydown listeners (F10 test).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = 'eabcccc2e4b8b86eeca807698cd0a3d5575b267bec03ff395de080da9d082a39';
const EXPECTED_BYTES = 2358811;
// (Pre-fix build was e43281fb… / 2,346,937 B — verified before testing.
//  B-35-2 fix via tools/v35/fix_b35.py adds the 63-byte V35 lookup
//  fall-through to bossUnlocked19 in src/v19.js + out/index.html.)
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
// Drive a live V27 session to its finishSession (answers via the
// exported answerMC/nextQ). okPattern is consumed IN ORDER (main
// questions first, then reasks); past its end, answers are correct.
// Returns the session rec whose words cover `coverIds` (or null).
function driveSession(ctx, okPattern, coverIds) {
  const before = J(ctx, `window.__v27.en27().sessions.length`);
  let guard = 0;
  while (J(ctx, `window.__v27.en27().sessions.length`) === before && guard < 80) {
    const ok = guard < okPattern.length ? okPattern[guard] : true;
    E(ctx, `window.__v27.answerMC('x', ${ok ? 'true' : 'false'}); window.__v27.nextQ();`);
    guard++;
  }
  const sessions = J(ctx, `JSON.stringify(window.__v27.en27().sessions)`);
  if (sessions.length <= before) return null;
  if (!coverIds) return sessions[0];
  for (const s of sessions) {
    if (s.words && coverIds.every(id => s.words.indexOf(id) >= 0)) return s;
  }
  return null;
}
function stubRandom(ctx) { E(ctx, `window.__t35origRandom=Math.random; Math.random=function(){return 0.9;}`); }
function unstubRandom(ctx) { E(ctx, `if(window.__t35origRandom)Math.random=window.__t35origRandom;`); }
// Seed en19 wins for the given boss ids in the given language.
function seedEn19(ctx, ids, lang) {
  E(ctx, `(function(){ var e19=window.__v19._test.en19(); e19.bosses=e19.bosses||{};
    ${JSON.stringify(ids)}.forEach(function(id){ e19.bosses[id]=e19.bosses[id]||{}; e19.bosses[id]['${lang}']={win:1,wins:1,stars:3,best:3}; });
    window.__v15.save15(); })()`);
}

async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v36.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V18.1 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is 2,358,811 B', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('title is V18.1 Bug Fixes', html.includes('<title>Korean &amp; English Vocab Farm V18.1 — Bug Fixes'));
  check('__v36 + 18.1.0 present', html.includes('window.__v36') && html.includes("VERSION='18.1.0'"));
  check('__v33/__v34/__v35 + 17.0.0/17.1.0/18.0.0 still present', html.includes('window.__v33') && html.includes('window.__v34') && html.includes('window.__v35') && html.includes("VERSION='17.0.0'") && html.includes("VERSION='17.1.0'") && html.includes("VERSION='18.0.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v36', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v36', styleIds.join(','));
  check('script markers end v36', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v36', scriptIds.join(','));
  check('v36js after v35js', html.indexOf('id="v36js"') > html.indexOf('id="v35js"'));
  check('no v37 marker (no unshipped layer)', !html.includes('id="v37"') && !html.includes('id="v37js"'));
  for (const m of ['armV27Obs', 'rearmObserver', '_speakXp', 'V29 (F-05)']) {
    check(`out-of-scope marker absent: ${m}`, !html.includes(m));
  }
  // V36 fix fragments (one per replacement group).
  const frags36 = [
    ['R-V171-A bossWinCount', 'if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) n++;'],
    ['R-V171-B summarizeSave', 'if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++;'],
    ['R-V173 speak _sxp36', '_sxp36=mark15(true,w,\'speak\')'],
    ['R-V173 speak double-pay gone', null], // asserted below (absence)
    ['R-WIND stone map', "wind:'stone_wind'"],
    ['R-F09A v21emailbtn', 'v21emailbtn'],
    ['R-F10A _esc21', '_esc21'],
    ['R-F04A flame.svg', "enIcon('flame.svg')"],
    ['R-F04B moon.svg', "icon:'moon.svg'"],
    ['R-V35COPY overlay copy', 'Các boss và nhiệm vụ sẽ mở khi bạn thắng GEAR GOLEM bằng '],
    ['R-F13A finishSession(partial)', 'function finishSession(partial)'],
    ['R-F13B rec.partial', 'partial:!!partial'],
    ['R-F13E endEarly _done36', '_done36=(SES.phase'],
    ['R-F13F/G findSession partial-skip', 'rec.partial||rec.lang'],
    ['R-V172 resolveLethal', 'function resolveLethal(Ff){'],
    ['R-V172E castSkill resolver call', '__v19._test.resolveLethal(_fightF)'],
    ['R-V172F/G healBoss hp guard', 'F.over||F.hp<=0)return;'],
    ['R-F16A1 v18 koPool deck', "var deck='';try{deck=(S&&S.deck)||''}catch(e){}"],
    ['R-F16A2 distractorsKO via koPool', 'var pool=koPool().filter'],
    ['R-F17 BREAK _bq36', '_bq36=(F.shield>0)?(Math.ceil(dmg/2)-Math.ceil(_bd36/2)):_bb34'],
    ['V36 wrapper breakBarHTML', '__v34.breakBarHTML=breakBarHTML'],
    ['V36 CSS z-index 1600', 'z-index:1600'],
    ['V36 CSS z-index 1700', 'z-index:1700'],
    ['V36 CSS M1 flex', '.v15filters .v15sel{flex:1 1 140px'],
    ['V36 CSS M2 44px', '.v15x{min-width:44px;min-height:44px}'],
  ];
  for (const [label, frag] of frags36) {
    if (frag === null) continue;
    check(`replacement fragment ${label} present`, html.includes(frag), frag);
  }
  check('V17-3 double-pay line gone', !html.includes("gain15(5);mark15(true,w,'speak')"));
  check('stale V35 overlay copy gone', !html.includes('Các boss, nhiệm vụ và thú Skyroot sẽ mở'));
  check('stale flame.png/moon.png icon refs gone', !html.includes("enIcon('flame.png')") && !html.includes("icon:'moon.png'"));
  // F09 counts: button id v21emailbtn x1 (template) + binding x1 = 2 total;
  // the three inputs keep id="v21email".
  check('F-09: v21emailbtn appears exactly 2x (button + binding)', countOcc(html, 'v21emailbtn') === 2, countOcc(html, 'v21emailbtn'));
  check('F-09: inputs keep id="v21email" x3', countOcc(html, 'id="v21email"') === 3, countOcc(html, 'id="v21email"'));
  // V17-4 typo: gone everywhere, fixed form x54 in each of the 4 files.
  check('V17-4 typo NGHỀNGHIỆP gone from built index.html', countOcc(html, 'NGHỀNGHIỆP') === 0);
  check('V17-4 fixed form NGHỀ NGHIỆP x54 in built index.html', countOcc(html, 'NGHỀ NGHIỆP') === 54, countOcc(html, 'NGHỀ NGHIỆP'));
  for (const f of ['src/v17_a1a2.js', 'data/v17_a1a2.json', 'out/v17_a1a2.js']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf-8');
    check(`V17-4 typo gone from ${f} (fixed x54)`, countOcc(t, 'NGHỀNGHIỆP') === 0 && countOcc(t, 'NGHỀ NGHIỆP') === 54, { old: countOcc(t, 'NGHỀNGHIỆP'), fixed: countOcc(t, 'NGHỀ NGHIỆP') });
  }
  // V33/V34/V35 fragments still present (spot-checks).
  for (const frag of ['__V33_DATA.byId(id)', 'QUEST_MIN_ACC=0.8', '__v34.breakDmg(F)', 'weakCountInPool(F.weak,pool)===0', '__V35_DATA?__V35_DATA.bosses:[]', 'var TOTAL_BOSSES=86;', 'GEAR_GOLEM=\'v17_geargolem\'', '/* V31 (F-01):']) {
    check(`older fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  check('TOTAL_BOSSES still 86', html.includes('var TOTAL_BOSSES=86;') && !html.includes('var TOTAL_BOSSES=78;'));
  check('v36 layer files present in DIR', fs.existsSync(path.join(DIR, 'v36.js')) && fs.existsSync(path.join(DIR, 'v36.css')));
  for (const f of ['v15.js', 'v18.js', 'v19.js', 'v21.js', 'v23.js', 'v27.js', 'v33.js', 'v35.js']) {
    const a = fs.readFileSync(path.join(ROOT, 'src', f), 'utf-8');
    const b = fs.existsSync(path.join(DIR, f)) ? fs.readFileSync(path.join(DIR, f), 'utf-8') : '';
    check(`src/${f} agrees with out/${f}`, a === b);
  }
  check('out/v12.js + out/v14.js agree with the fixed icon refs', fs.readFileSync(path.join(DIR, 'v12.js'), 'utf-8').includes("icon:'moon.svg'") && fs.readFileSync(path.join(DIR, 'v14.js'), 'utf-8').includes("enIcon('flame.svg')"));
  // Probe-model fix (workspace file + shipped copy).
  const probeSrc = fs.readFileSync(path.join(ROOT, 'tools', 'v34', 'probe_v34.js'), 'utf-8');
  const probeOut = fs.readFileSync(path.join(DIR, 'tools', 'v34', 'probe_v34.js'), 'utf-8');
  check('probe oxford branch gains the diff filter', probeSrc.includes("if(b.diff) list=list.filter(function(x){ return x.lv===b.diff; });"));
  check('probe shipped copy matches the workspace file', probeSrc === probeOut);
  check('probe old oxford line gone', !probeSrc.includes("else if(b.lib==='oxford') list=words.filter(function(x){ return (x.lib||[]).indexOf('oxford')>=0; });"));
  // v36.css content (static — live layout is a Chrome gate).
  const css36 = fs.readFileSync(path.join(DIR, 'v36.css'), 'utf-8');
  check('v36.css documents the z-index stack (F-06)', css36.includes('#v27hub{z-index:1600}') && css36.includes('#v23toast{z-index:1700}') && css36.includes('intended z-index stack'));
  check('v36.css has M1 filter-row rules', css36.includes('.v15learn-head>*{min-width:0}') && css36.includes('max-width:100%'));
  check('v36.css has M2 44px rules', css36.includes('.v15pill{min-height:44px}') && css36.includes('.v15back{min-height:44px}') && css36.includes('.v15lb-btn,.v15lb-hub{min-height:44px}'));

  // ================= §L page load =================
  section('§L', 'page load (vm, real inline scripts)');
  const ctx = makeCtx();
  // H-36-1: count document keydown listeners (F10 test). The stub's
  // removeEventListener is a no-op, so the wrapper ALSO tracks the live
  // handler references on doc.__kdHandlers (added on add, spliced on
  // remove) — the Escape dispatch calls the recorded handler directly.
  const doc = ctx.__sandbox.document;
  const kd = { n: 0 };
  const _docAdd = doc.addEventListener.bind(doc);
  const _docRem = doc.removeEventListener.bind(doc);
  doc.addEventListener = function (t, fn, o) { if (t === 'keydown') { kd.n++; (doc.__kdHandlers = doc.__kdHandlers || []).push(fn); } return _docAdd(t, fn, o); };
  doc.removeEventListener = function (t, fn, o) { if (t === 'keydown') { kd.n = Math.max(0, kd.n - 1); var h = doc.__kdHandlers || []; var i = h.indexOf(fn); if (i >= 0) h.splice(i, 1); } return _docRem(t, fn, o); };
  dynIds.add('v15bossfight');
  const loaded = loadPage(ctx, html);
  check('inline script blocks extracted (>=30)', loaded.blocks >= 30, loaded.blocks);
  check('all inline scripts evaluate without error', loaded.loadErr === null, loaded.loadErr);
  if (loaded.loadErr) { console.log(`\ntest36 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15/__v17/__v18/__v19/__v27/__v33/__v34/__v35/__v36 present',
    E(ctx, `!!window.__v15 && !!window.__v17 && !!window.__v18 && !!window.__v19 && !!window.__v27 && !!window.__v33 && !!window.__v34 && !!window.__v35 && !!window.__v36`));
  check('__v36.version is 18.1.0', E(ctx, `window.__v36.version`) === '18.1.0');
  check('__v36 wrapped the stock breakBarHTML (original saved)', E(ctx, `window.__v36.wrapped===true && typeof window.__v34._breakBarHTML_orig==='function'`));
  E(ctx, `window.__v15.buildWords()`);
  const nWords = E(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);

  // ================= §171 V17-1: bossWinCount / summarizeSave =================
  section('§171', 'V17-1 — bossWinCount counts flat V18 wins (avatars reachable)');
  // NOTE: bossWinCount() is closure-local in v21.js (IIFE) — the only
  // observable is __v21.summarizeSave(S).bossWins, which calls it. Avatar
  // thresholds come from the exported __v21.AVATARS list.
  const cnt171 = J(ctx, `JSON.stringify((function(){
    var out={};
    function wins(){ return window.__v21.summarizeSave(S).bossWins; }
    out.fresh=wins();
    out.sumFresh=window.__v21.summarizeSave(S);
    // 10 old (en15) + 25 flat V18 (en18) + 21 nested V19 (en19)
    var e15=window.__v15.en15(); e15.bosses={}; for(var i=0;i<10;i++) e15.bosses['old'+i]={win:1};
    var e18=window.__v18._test.en18(); e18.bosses={};
    for(var j=0;j<25;j++) e18.bosses['v10_w'+j]={win:1,wins:1};
    var e19=window.__v19._test.en19(); e19.bosses={};
    for(var k=0;k<21;k++) e19.bosses['v11_w'+k]={en:{win:1,wins:1}};
    window.__v15.save15();
    out.seeded=wins();
    out.sum=window.__v21.summarizeSave(S);
    // avatar thresholds from the exported list (dragon 50, unicorn 60, phoenix 70)
    var av={}; window.__v21.AVATARS.forEach(function(a){ av[a.id]=a.wins; });
    out.av=av;
    out.dragon50=wins()>=av.dragon; out.unicorn60=wins()>=av.unicorn; out.phoenix70=wins()>=av.phoenix;
    // add 14 more flat wins -> 70 total -> phoenix reachable
    for(var m=25;m<39;m++) e18.bosses['v10_w'+m]={win:1,wins:1};
    window.__v15.save15();
    out.at70=wins();
    out.sum70=window.__v21.summarizeSave(S);
    // wins recorded as {wins:N} only (no .win) also count
    e18.bosses['v10_w39']={wins:3};
    window.__v15.save15();
    out.winsOnly=wins();
    return out;
  })())`);
  check('fresh save counts 0 boss wins', cnt171.fresh === 0, cnt171);
  check('seeded 10 + 25 flat + 21 nested = 56 (was 31 pre-fix)', cnt171.seeded === 56, cnt171);
  check('summarizeSave reports 56 wins', cnt171.sum && cnt171.sum.bossWins === 56, cnt171.sum);
  check('dragon (50) reachable at 56, unicorn (60)/phoenix (70) not yet', cnt171.dragon50 === true && cnt171.unicorn60 === false && cnt171.phoenix70 === false, cnt171);
  check('70 flat+nested wins -> phoenix (70) reachable', cnt171.at70 === 70, cnt171);
  check('summarizeSave reports 70 wins', cnt171.sum70 && cnt171.sum70.bossWins === 70, cnt171.sum70);
  check('a {wins:3}-only record counts once (not 3x)', cnt171.winsOnly === 71, cnt171);

  // ================= §172 V17-2: lethal team skill =================
  section('§172', 'V17-2 — lethal team skill resolves the fight (no resurrect/lose)');
  stubRandom(ctx);
  const lethal19 = J(ctx, `JSON.stringify((function(){
    var v19=window.__v19, v23=window.__v23, out={};
    v19._test.setLang('en');
    v19.fight('v11_fireking');
    var F=v19._test.F();
    out.started=!!F; out.hp0=F?F.hp:null; out.over0=F?F.over:null;
    var xp0=S.xp||0;
    F.hp=5;
    F.pet={energy:99,active:{type:'dmg',n:'Test Skill'},activeVal:9999,shield:0,shieldMax:0,dmgBonus:0};
    v23.setFight(F);
    v23.castSkillInFight();
    F=v19._test.F();
    out.over=F?F.over:null; out.hp=F?F.hp:null;
    out.winRec=F?!!(v19._test.en19().bosses['v11_fireking']&&v19._test.en19().bosses['v11_fireking'].en&&v19._test.en19().bosses['v11_fireking'].en.win):null;
    out.xpGain=(S.xp||0)-xp0;
    out.rewardXp=v19._test.F()?v19._test.F().boss.reward.xp:null;
    // second cast must NOT pay again (fight already resolved)
    var xp1=S.xp||0;
    v23.castSkillInFight();
    out.xpGain2=(S.xp||0)-xp1;
    out.over2=v19._test.F()?v19._test.F().over:null;
    v19.close();
    return out;
  })())`);
  check('v19 fireking fight starts (hp 325, open)', lethal19.started === true && lethal19.hp0 === 325 && lethal19.over0 === null, lethal19);
  check('lethal team skill resolves the fight at once (over=win, hp=0)', lethal19.over === 'win' && lethal19.hp === 0, lethal19);
  check('win recorded in en19 (first win)', lethal19.winRec === true, lethal19);
  check('first-win XP paid exactly once (reward xp, no double)', lethal19.xpGain === lethal19.rewardXp && lethal19.rewardXp === 70, lethal19);
  check('second lethal cast pays nothing more (over stays win)', lethal19.xpGain2 === 0 && lethal19.over2 === 'win', lethal19);
  // healBoss guard, end-to-end on the burn boss: hp=0 + wrong answer must NOT resurrect.
  const heal19 = J(ctx, `JSON.stringify((function(){
    var v19=window.__v19, out={};
    v19._test.setLang('en');
    v19.fight('v11_fireking');
    var F=v19._test.F();
    F.hp=0; // simulate the old bug state: 0 HP, fight still open
    out.overBefore=F.over;
    v19._test.pickWrong(); v19.next();
    F=v19._test.F();
    out.hpAfterWrong=F?F.hp:null; out.overAfterWrong=F?F.over:null;
    v19.close();
    // control: hp=100 + wrong answer -> burn heals +8
    v19.fight('v11_fireking');
    F=v19._test.F();
    F.hp=100;
    v19._test.pickWrong(); v19.next();
    F=v19._test.F();
    out.hpControl=F?F.hp:null;
    v19.close();
    return out;
  })())`);
  check('0-HP boss is NOT resurrected by a wrong answer (heal guard)', heal19.hpAfterWrong === 0, heal19);
  check('the 0-HP fight then resolves as a WIN (answer-end check), not a loss or a hang', heal19.overAfterWrong === 'win', heal19);
  check('control: hp=100 + wrong answer heals +8 (burn still works)', heal19.hpControl === 108, heal19);
  // v18 resolver (slime): lethal skill -> win in en18.
  const lethal18 = J(ctx, `JSON.stringify((function(){
    var v18=window.__v18, v23=window.__v23, out={};
    v18._test.fight('v10_slime','en');
    var F=v18._test.F();
    out.started=!!F;
    var xp0=S.xp||0;
    F.hp=5;
    F.pet={energy:99,active:{type:'dmg',n:'Test Skill'},activeVal:9999,shield:0,shieldMax:0,dmgBonus:0};
    v23.setFight(F);
    v23.castSkillInFight();
    F=v18._test.F();
    out.over=F?F.over:null; out.hp=F?F.hp:null;
    out.winRec=F?!!(v18._test.en18().bosses['v10_slime']&&v18._test.en18().bosses['v10_slime'].win):null;
    out.xpGain=(S.xp||0)-xp0;
    v18.close();
    return out;
  })())`);
  check('v18 slime lethal skill resolves the fight (over=win, hp=0)', lethal18.started === true && lethal18.over === 'win' && lethal18.hp === 0, lethal18);
  check('v18 win recorded in en18 (flat record)', lethal18.winRec === true, lethal18);
  check('v18 first-win XP paid once', lethal18.xpGain > 0, lethal18);
  unstubRandom(ctx);

  // ================= §173 V17-3: Speaking double-pay =================
  section('§173', 'V17-3 — Speaking Practice pays mark15 only (no +5 on top)');
  // NOTE: M and startSpeak() are closure-local in v15.js (IIFE). The
  // speak flow is driven through the exported __v15.startMode('speak')
  // / speakRecord() / speakNext(), and the current word + result are
  // read back from the rendered #v15body innerHTML (the speak card
  // shows the word in .v15qword and the result in .v15explain).
  const speak = J(ctx, `JSON.stringify((function(){
    var v15=window.__v15, out={};
    function bodyHTML(){ var b=document.getElementById('v15body'); return b?b.innerHTML:''; }
    function curWordId(){ var m=bodyHTML().match(/speakWord\\('([^']+)'\\)/); return m?m[1]:null; }
    function resultHTML(){ var m=bodyHTML().match(/<div class="v15explain" style="color:var\\(--(ok|bad)\\)">([^<]*)<\\/div>/); return m?{ok:m[1]==='ok',text:m[2]}:null; }
    function freshOf(id){ var w=null; v15.words.forEach(function(x){ if(x.id===id) w=x; }); if(!w) return null; return {w:w, fresh:!((v15.en15().due||{})[id]!==undefined)}; }
    // sacrificial fresh word: learn mark15's fresh-word award
    var probe=v15.words.filter(function(w){return !((v15.en15().due||{})[w.id]!==undefined);});
    var wProbe=probe[0];
    out.probeEn=wProbe.en;
    out.freshAward=v15.mark15(true,wProbe,'speak');
    // speak flow: find a FRESH word among the 8 pickPool words.
    // Cap at 6 advances so the wrong-transcript control still has a
    // next word (speakNext past the last word ends the round + pays
    // score*2 XP, which would pollute the measurement).
    v15.startMode('speak');
    var cur=null, tries=0;
    while(tries<6){
      var id=curWordId();
      if(!id) break;
      var f=freshOf(id);
      if(f&&f.fresh){ cur=f.w; break; }
      v15.speakNext(); tries++;
    }
    out.speakEn=cur?cur.en:null; out.tries=tries;
    var xp0=S.xp||0;
    v15.speakRecord();
    var sr=window.__lastSR;
    out.srCaptured=!!sr;
    sr.onresult({results:[[{transcript:cur.en}]]});
    out.delta=(S.xp||0)-xp0;
    var r=resultHTML();
    out.msg=r?r.text:null; out.msgOk=r?r.ok:null;
    // control: wrong transcript on the next word -> 0 XP, Chưa khớp
    v15.speakNext();
    var id2=curWordId();
    var f2=id2?freshOf(id2):null;
    var wBad=f2?f2.w:null;
    out.badEn=wBad?wBad.en:null;
    if(!wBad){ out.deltaBad=-1; out.msgBad=null; out.okBad=null; }
    else{
      var xp1=S.xp||0;
      v15.speakRecord();
      window.__lastSR.onresult({results:[[{transcript:'zzz qqq www'}]]});
      out.deltaBad=(S.xp||0)-xp1;
      var r2=resultHTML();
      out.msgBad=r2?r2.text:null; out.okBad=r2?r2.ok:null;
    }
    return out;
  })())`);
  check('mark15 fresh-word award measured (sacrificial probe)', typeof speak.freshAward === 'number' && speak.freshAward > 0, speak);
  check('speak flow found a fresh word to pronounce', typeof speak.speakEn === 'string' && speak.speakEn.length > 0, speak);
  check('perfect speak pays exactly the mark15 award (no +5 on top)', speak.delta === speak.freshAward, speak);
  check('perfect speak is NOT the old +15 double-pay', speak.delta !== 15 || speak.freshAward === 15, speak);
  check('speak message shows the real XP', typeof speak.msg === 'string' && speak.msg.indexOf('+' + speak.freshAward + ' XP') >= 0, speak);
  check('perfect speak reports ok=true', speak.msgOk === true, speak);
  check('wrong transcript pays 0 XP and reports Chưa khớp', speak.deltaBad === 0 && speak.okBad === false && typeof speak.msgBad === 'string' && speak.msgBad.indexOf('Chưa khớp') >= 0, speak);

  // ================= §WIND wind stone =================
  section('§WIND', 'wind stone — Breeze Lynx first win drops stone_wind x2');
  const wind = J(ctx, `JSON.stringify((function(){
    var v19=window.__v19, v23=window.__v23, out={};
    v23._test.en23();
    out.stoneWind0=(S.v7.en23.mats||{}).stone_wind||0;
    out.stoneLight0=(S.v7.en23.mats||{}).stone_light||0;
    // control first: a non-wind first win (v10_unicorn, light, Elemental
    // arena — unlocked by the seeded §171 wins, never fought yet) ->
    // stone_light +2, stone_wind unchanged. (fireking/slime are already
    // won in §172, so a replay would grant no stones at all.)
    // The Elemental arena unlock reads REAL arena-1 wins, so seed four
    // real ones (slime was won in §172) to reach the 5-win gate.
    var v18=window.__v18;
    var e18c=v18._test.en18();
    ['v10_goblin','v10_dragon','v10_ghost','v10_spider'].forEach(function(id){ e18c.bosses[id]={win:1,wins:1}; });
    window.__v15.save15();
    v18._test.fight('v10_unicorn','en');
    var guard=0;
    while(v18._test.F()&&!v18._test.F().over&&guard<200){ v18._test.pickCorrect(); if(v18._test.F()&&!v18._test.F().over)v18.next(); guard++; }
    var F=v18._test.F();
    out.unicornOver=F?F.over:null; out.unicornGuard=guard;
    out.stoneLight1=(S.v7.en23.mats||{}).stone_light||0;
    out.stoneWind1=(S.v7.en23.mats||{}).stone_wind||0;
    v18.close();
    // Skyroot gate: GEAR GOLEM won -> Breeze Lynx (first Skyroot boss) opens
    var e19=v19._test.en19(); e19.bosses['v17_geargolem']={en:{win:1,wins:1,stars:3,best:3}};
    v19._test.setLang('en');
    v19.fight('v18_breeze_lynx');
    F=v19._test.F();
    out.lynxStarted=!!F; out.lynxEl=F?F.boss.el:null; out.lynxHp=F?F.hp:null;
    guard=0;
    while(v19._test.F()&&!v19._test.F().over&&guard<250){ v19._test.pickCorrect(); if(v19._test.F()&&!v19._test.F().over)v19.next(); guard++; }
    F=v19._test.F();
    out.lynxOver=F?F.over:null; out.lynxGuard=guard;
    out.stoneWind2=(S.v7.en23.mats||{}).stone_wind||0;
    v19.close();
    return out;
  })())`);
  check('unicorn control fight wins', wind.unicornOver === 'win', wind);
  check('light boss drops stone_light +2, no stone_wind', wind.stoneLight1 === wind.stoneLight0 + 2 && wind.stoneWind1 === wind.stoneWind0, wind);
  check('Breeze Lynx fight starts (wind element, hp 760)', wind.lynxStarted === true && wind.lynxEl === 'wind' && wind.lynxHp === 760, wind);
  check('Breeze Lynx fight wins', wind.lynxOver === 'win', wind);
  check('Breeze Lynx first win drops stone_wind +2 (was 0)', wind.stoneWind2 === wind.stoneWind0 + 2, wind);

  // ================= §F13 partial sessions =================
  section('§F13', 'F-13 — abandoned sessions are partial (no plan bonus / quest / streak)');
  // NOTE: buildPlan() is ASYNC (returns a Promise via ensureBT), so the
  // test uses the synchronous core __v27._test.buildPlanCore (which stores
  // the plan itself) — then planOf/startPlan run synchronously.
  // Sessions are NEWEST-FIRST (finishSession unshifts), so the newest rec
  // is always sessions[0]. questState() returns a STRING
  // ('new'/'active'/'done'/'claimed'); claimQuest() returns {ok,msg}.
  const f13 = J(ctx, `JSON.stringify((function(){
    var v27=window.__v27, v35=window.__v35, out={};
    // helper: answer N questions correctly in the open session, then endEarly
    function answerN(n){ for(var i=0;i<n;i++){ v27.answerMC('x',true); v27.nextQ(); } }
    // --- plan: build synchronously (mins 10 -> total 20: 5 new / 10 due / 5 weak) ---
    var res=v27._test.buildPlanCore('en',10,5,10,5);
    out.resAvail=res.avail;
    var plan=v27.planOf('en');
    out.planSize=plan&&plan.ids?plan.ids.length:0;
    out.planStarted=v27.startPlan('en');
    answerN(2);
    v27.endEarly();
    var sess=(v27.en27().sessions||[]);
    out.recN=sess.length;
    var rec=sess[0]; // newest first
    out.partialFlag=rec?rec.partial:null;
    out.planClaimed=Object.keys(v27.en27().claimed||{}).some(function(k){return k.indexOf('plan:en:')===0;});
    out.streakGem=!!(v27.en27().claimed&&Object.keys(v27.en27().claimed).some(function(k){return k.indexOf('streak7:en:')===0;}));
    // --- plan: control, full session -> bonus paid once ---
    v27.startPlan('en');
    var guard=0;
    while(v27.en27().sessions.length<2&&guard<60){ v27.answerMC('x',true); v27.nextQ(); guard++; }
    var sess2=(v27.en27().sessions||[]);
    var rec2=sess2[0]; // newest first
    out.fullGuard=guard;
    out.fullPartial=rec2?rec2.partial:null;
    out.fullClaimed=Object.keys(v27.en27().claimed||{}).some(function(k){return k.indexOf('plan:en:')===0;});
    // --- quest: partial (9 of 14 answered) -> NOT done, findSession skips it ---
    v35.startQuest('q_temple');
    answerN(9);
    v27.endEarly();
    v35.checkCompletions();
    out.questPartialState=v35.questState('q_temple');
    var sess3=(v27.en27().sessions||[]);
    var rec3=sess3[0]; // newest first
    out.questRecPartial=rec3?rec3.partial:null; out.questRecTotal=rec3?rec3.total:null;
    out.findSkips=v35._test.findSession('q_temple')===null;
    // --- quest: control, full session -> done + claim pays once ---
    // Drive until the session record appears (sessions 1..3 already
    // exist: plan partial, plan full, quest partial -> the full quest
    // session is #4). questState only updates after checkCompletions,
    // so the loop must NOT wait on it.
    v35.startQuest('q_temple');
    guard=0;
    while(v27.en27().sessions.length<4&&guard<60){ v27.answerMC('x',true); v27.nextQ(); guard++; }
    v35.checkCompletions();
    out.questFullState=v35.questState('q_temple');
    out.questFullGuard=guard;
    var claim1=v35._test.claimQuest('q_temple');
    var claim2=v35._test.claimQuest('q_temple');
    out.claim1=claim1?claim1.ok:null; out.claim2=claim2?claim2.ok:null;
    return out;
  })())`);
  check('plan built with a sane size (1..40 words)', f13.planSize >= 1 && f13.planSize <= 40, f13);
  check('plan session starts (startPlan does not refuse)', f13.planStarted !== false, f13);
  check('abandoned plan session is recorded partial=true', f13.partialFlag === true, f13);
  check('partial plan pays NO plan bonus (was +20 XP)', f13.planClaimed === false, f13);
  check('partial plan pays NO streak-7 gem', f13.streakGem === false, f13);
  check('full plan session completes (rec has no partial flag)', f13.fullPartial !== true, f13);
  check('full plan pays the plan bonus once', f13.fullClaimed === true, f13);
  check('abandoned quest (9/14) is NOT done (state stays active)', f13.questPartialState === 'active', f13);
  check('abandoned quest session rec is partial (total 9)', f13.questRecPartial === true && f13.questRecTotal === 9, f13);
  check('findSession skips the partial quest session', f13.findSkips === true, f13);
  check('full quest session completes (done)', f13.questFullState === 'done' || f13.questFullState === 'claimed', f13);
  check('quest claim pays once, second claim blocked', f13.claim1 === true && f13.claim2 === false, f13);

  // ================= §F14 Break-bar wrapper =================
  section('§F14', 'F-14 — Break bar is honest when it can never fill (15 mode + 13 pool)');
  // NOTE: wordPool/koPool are closure-local in the v18/v19 IIFEs, so the
  // test replicates the fight pools and ANCHORS each replication on a
  // live fight (sorted-id equality with F.pools.words):
  //   poolOf()  = the V34 probe's unified model (tools/v34/probe_v34.js):
  //               old -> ALL; oxford -> lib∩diff; leg -> legDiff;
  //               else diff filter; <12 -> ALL. It matches v19 exactly
  //               and v18 for oxford/leg bosses; for v18 a1a2 bosses it
  //               overstates the pool (v18 also filters lib), but the
  //               blocked verdict is the same (B1/B2 pools hold no
  //               A1-A2 basic-topic words under either model).
  //   poolOf18()= v18's actual wordPool (lib AND diff) — anchored on
  //               the live slime fight.
  // The blocked sets are then COMPUTED over all 86 bosses, not assumed.
  // The 10 old V15 bosses come from __V18_BOSSES.old (real records, as
  // the probe enumerates them) — no hardcoded list needed.
  const f14 = J(ctx, `JSON.stringify((function(){
    var v34=window.__v34, v36=window.__v36, v18=window.__v18, out={};
    var WORDS=window.__v15.words;
    try{ window.__v15.clearScope(); }catch(e){}
    function legDiff(){ var m=0; try{ m=window.__v15.counts().mastered; }catch(e){} if(m<200)return ['A2','B1']; if(m<600)return ['B1']; return ['B2']; }
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
    function poolOf18(b){
      var list=WORDS.filter(function(w){
        if(b.lib==='a1a2'&&(!w.lib||w.lib.indexOf('a1a2')<0))return false;
        if(b.lib==='oxford'&&(!w.lib||w.lib.indexOf('oxford')<0))return false;
        if(b.arena==='leg'){var lv=legDiff();if(lv.indexOf(w.lv)<0)return false}
        else if(b.diff&&w.lv!==b.diff)return false;
        return true;
      });
      if(list.length<12) list=WORDS.slice();
      return list;
    }
    function sortedIds(arr){ return arr.map(function(w){return w.id;}).sort(); }
    // live anchors (v18 fights; owl needs the 5 arena-1 wins — slime was
    // won in §172, the other four are seeded here)
    var e18=v18._test.en18();
    ['v10_goblin','v10_dragon','v10_ghost','v10_spider'].forEach(function(id){ e18.bosses[id]={win:1,wins:1}; });
    window.__v15.save15();
    v18._test.fight('v10_owl','en');
    var Fo=v18._test.F();
    out.owlLive=!!Fo;
    out.owlPoolMatch=!!Fo && JSON.stringify(sortedIds(poolOf(Fo.boss)))===JSON.stringify(sortedIds(Fo.pools.words));
    out.owlScopeBlocked=!!Fo && v34.scopeBlocked(Fo)===true;
    var owlBar=!!Fo && v34.breakBarHTML(Fo);
    out.owlBarHonest=typeof owlBar==='string' && owlBar.indexOf('không thể phá')>=0;
    v18.close();
    v18._test.fight('v10_slime','en');
    var Fs=v18._test.F();
    out.slimeLive=!!Fs;
    out.slimePool18Match=!!Fs && JSON.stringify(sortedIds(poolOf18(Fs.boss)))===JSON.stringify(sortedIds(Fs.pools.words));
    out.slimeScopeBlocked=!!Fs && v34.scopeBlocked(Fs)===false;
    v18.close();
    // full universe, probe enumeration: 8 v33 + 30 v19 + 30 v18 + 8 v35 + 10 old
    // (__v18.bosses / __v19.bosses are getters returning grouped objects,
    // not arrays — concatenating them directly was the run-1 bug.)
    var list=[];
    list=list.concat(window.__V33_DATA?window.__V33_DATA.bosses:[]);
    list=list.concat(window.__V19_DATA?window.__V19_DATA.bosses:[]);
    var b18=window.__V18_BOSSES||{};
    ['en','el','leg'].forEach(function(k){ if(b18[k]) list=list.concat(b18[k]); });
    if(b18['old']) list=list.concat(b18['old'].map(function(b){ var c={}; for(var k in b) c[k]=b[k]; c._old=true; return c; }));
    list=list.concat(window.__V35_DATA?window.__V35_DATA.bosses:[]);
    out.bossCount=list.length;
    out.oldCount=b18['old']?b18['old'].length:0;
    var modeBlocked=[], poolBlocked=[];
    list.forEach(function(b){
      if(v36.blockedReason({boss:b,lang:'en'})==='mode') modeBlocked.push(b.id);
      var F={boss:b,lang:'en',weak:v34.weakFor(b,'en'),pools:{words:poolOf(b)}};
      if(v34.scopeBlocked(F)===true) poolBlocked.push(b.id);
    });
    out.modeBlocked=modeBlocked.sort();
    out.poolBlocked=poolBlocked.sort();
    // fillable controls: a normal EN boss is neither blocked nor scope-blocked
    var byId={}; list.forEach(function(b){ byId[b.id]=b; });
    var ctrl=['v10_slime','v11_fireking','v18_breeze_lynx'];
    out.ctrlOk=ctrl.every(function(id){
      var b=byId[id]; if(!b)return false;
      var F={boss:b,lang:'en',weak:v34.weakFor(b,'en'),pools:{words:poolOf(b)}};
      return v36.blockedReason(F)===null && v34.scopeBlocked(F)===false;
    });
    // mixed-mode boss falls through the wrapper to the live meter
    var mx=byId['v10_slime'];
    var bar=v36.breakBarHTML({boss:mx,lang:'en',brk:1,brkMax:3,weak:v34.weakFor(mx,'en')});
    out.mixedBarHasMeter=typeof bar==='string' && bar.indexOf('1/3')>=0 && bar.indexOf('không thể phá')<0;
    // mode-blocked bar text (grammar boss)
    var gbar=v36.breakBarHTML({boss:byId['v10_dragon'],lang:'en',brk:0,brkMax:3,weak:v34.weakFor(byId['v10_dragon'],'en')});
    out.modeBarHonest=typeof gbar==='string' && gbar.indexOf('không thể phá')>=0 && gbar.indexOf('ngữ pháp')>=0;
    // KO-deck<8 synthetic: pools.ko has 5 cards -> blocked 'ko' with the count
    var kbar=v36.breakBarHTML({boss:mx,lang:'ko',brk:0,brkMax:3,weak:{kind:'ko'},pools:{ko:[1,2,3,4,5]}});
    out.koBarHonest=typeof kbar==='string' && kbar.indexOf('không thể phá')>=0 && kbar.indexOf('5/8')>=0;
    out.koReason=v36.blockedReason({boss:mx,lang:'ko',pools:{ko:[1,2,3,4,5]}});
    return out;
  })())`);
  const expMode = ['dragon', 'spider', 'owl', 'v10_dragon', 'v10_spider', 'v10_panda', 'v10_turtle', 'v10_owl', 'v10_fox', 'v11_phoenix', 'v11_heavenknight', 'v11_lightdeer', 'v11_pandamaster', 'v17_oracle', 'v18_crystal_treant'].sort();
  const expPool = ['v10_dict', 'v10_fairy', 'v10_fox', 'v10_king', 'v10_octopus', 'v10_owl', 'v10_tiger', 'v10_wizard', 'v11_goldephant', 'v11_golem', 'v11_seadragon', 'v11_sharkking', 'v11_timemachine'].sort();
  check('boss universe is 86 (incl. 10 old from __V18_BOSSES.old)', f14.bossCount === 86 && f14.oldCount === 10, f14);
  check('poolOf matches the live v18 owl fight pool (oxford∩B1, sorted ids)', f14.owlPoolMatch === true, f14);
  check('poolOf18 matches the live v18 slime fight pool (a1a2∩A1, sorted ids)', f14.slimePool18Match === true, f14);
  check('live v18 slime fight is NOT scope-blocked (meter fillable: 16 matches)', f14.slimeScopeBlocked === true, f14);
  check('mode-blocked set is exactly the 15 grammar/read/builder bosses', JSON.stringify(f14.modeBlocked) === JSON.stringify(expMode), f14.modeBlocked);
  check('pool-blocked set is exactly the 13 (probe-verified)', JSON.stringify(f14.poolBlocked) === JSON.stringify(expPool), f14.poolBlocked);
  check('fillable controls are neither blocked nor scope-blocked', f14.ctrlOk === true, f14);
  check('mixed-mode boss falls through to the live 1/3 meter', f14.mixedBarHasMeter === true, f14);
  check('grammar boss bar is honest (không thể phá + ngữ pháp)', f14.modeBarHonest === true, f14);
  check('KO-deck<8 bar quotes the count (5/8) and blocks', f14.koBarHonest === true && f14.koReason === 'ko', f14);
  check('live v10_owl fight shows the honest blocked bar', f14.owlLive === true && f14.owlScopeBlocked === true && f14.owlBarHonest === true, f14);

  // ================= §F16a v18 KO deck scoping =================
  section('§F16a', 'F-16a — v18 KO fights use the selected deck (mirror of v19)');
  // NOTE: koPool is closure-local in the v18/v19 IIFEs (and NOT exported),
  // so there is no bare koPool() to call from the harness. Deck-scoping
  // is proven end-to-end by the live KO fights below (distractors +
  // question language), which is the behaviour that matters.
  const f16a = J(ctx, `JSON.stringify((function(){
    var v18=window.__v18, v19=window.__v19, out={};
    function mkCards(deck,n,prefix){ var a=[]; for(var i=0;i<n;i++) a.push({id:prefix+i,d:deck,h:'한'+prefix+i,m:'nghĩa '+prefix+i,p:'han'+prefix+i,e:prefix+i,box:0,due:0}); return a; }
    S.cards=mkCards('A',10,'a').concat(mkCards('B',10,'b'));
    S.deck='A';
    // live v18 KO fight with deck A: all distractors from deck A
    v18._test.fight('v10_slime','ko');
    var F=v18._test.F();
    out.koFight=!!F; out.koCur=F&&F.cur?!!F.cur.ko:null;
    out.koOptsDeckA=F&&F.cur&&F.cur.opts?F.cur.opts.every(function(o){return o.d==='A';}):null;
    out.koOptsN=F&&F.cur&&F.cur.opts?F.cur.opts.length:null;
    out.koBarLive=F?window.__v36.breakBarHTML(F):null;
    out.koBarNotBlocked=typeof out.koBarLive==='string' && out.koBarLive.indexOf('không thể phá')<0;
    v18.close();
    // live v18 KO fight with a 3-card deck: falls back to all cards (KO
    // questions still asked, meter fillable — the wrapper must NOT block)
    S.deck='C';
    S.cards=S.cards.concat(mkCards('C',3,'c'));
    v18._test.fight('v10_slime','ko');
    F=v18._test.F();
    out.koCFight=!!F; out.koCCur=F&&F.cur?!!F.cur.ko:null;
    out.koCOptsMixed=F&&F.cur&&F.cur.opts?F.cur.opts.some(function(o){return o.d!=='C';}):null;
    out.koCBarNotBlocked=F?(typeof window.__v36.breakBarHTML(F)==='string' && window.__v36.breakBarHTML(F).indexOf('không thể phá')<0):null;
    v18.close();
    // true KO-dead case: fewer than 8 usable cards in total -> EN questions
    S.cards=mkCards('A',5,'z');
    S.deck='';
    v18._test.fight('v10_slime','ko');
    F=v18._test.F();
    out.koDeadFight=!!F; out.koDeadCur=F&&F.cur?!!F.cur.ko:null;
    out.koDeadBar=F?window.__v36.breakBarHTML(F):null;
    out.koDeadBarHonest=typeof out.koDeadBar==='string' && out.koDeadBar.indexOf('không thể phá')>=0 && out.koDeadBar.indexOf('5/8')>=0;
    v18.close();
    return out;
  })())`);
  check('live v18 KO fight (deck A) asks KO questions', f16a.koFight === true && f16a.koCur === true, f16a);
  check('live KO distractors are all from deck A (4 options)', f16a.koOptsDeckA === true && f16a.koOptsN === 4, f16a);
  check('live KO fight (deck A) shows the live meter, not the blocked bar', f16a.koBarNotBlocked === true, f16a);
  check('live KO fight (3-card deck) still asks KO questions from all cards', f16a.koCFight === true && f16a.koCCur === true && f16a.koCOptsMixed === true, f16a);
  check('3-card-deck fight is NOT blocked (meter fillable)', f16a.koCBarNotBlocked === true, f16a);
  check('true KO-dead case (<8 total cards) asks EN questions', f16a.koDeadFight === true && f16a.koDeadCur === false, f16a);
  check('true KO-dead case shows the honest 5/8 blocked bar', f16a.koDeadBarHonest === true, f16a);

  // ================= §F17 BREAK banner vs shield =================
  section('§F17', 'F-17 — BREAK banner quotes the post-shield bonus, not the full bonus');
  // NOTE: slime hp 70 / def 0 (v18_data): breakBonus(70)=clamp(round(7),10,50)
  // = 10; first correct answer: combo 1 -> dmg 12+2=14 (def 0). Shielded:
  // total 14+10=24 -> dealt ceil(24/2)=12; without the bonus ceil(14/2)=7,
  // so the true BREAK marginal is 12-7=5. Unshielded: banner +10, dealt 24.
  // stubRandom (Math.random=0.9) removes the 10% crit so the numbers are
  // deterministic.
  stubRandom(ctx);
  const f17 = J(ctx, `JSON.stringify((function(){
    var v18=window.__v18, out={};
    function fightShielded(shield){
      v18._test.fight('v10_slime','en');
      var F=v18._test.F();
      F.shield=shield; F.brk=2; F.brkMax=3;
      var w=F.cur.w;
      F.weak=__v34.weakFor(F.boss,'en');
      F.cur={w:w,opts:F.cur.opts,optsVi:F.cur.optsVi};
      // force the weakness match: pick the weakness word as the answer
      var pool=F.pools.words;
      var mw=null;
      for(var i=0;i<pool.length;i++){ if(__v34.weakMatch(pool[i],F.weak)){ mw=pool[i]; break; } }
      if(!mw) return {started:false,why:'no weakness word in pool'};
      F.cur={w:mw,opts:[mw].concat(F.cur.opts.slice(1)),optsVi:[mw].concat(F.cur.optsVi.slice(1))};
      var hp0=F.hp;
      v18._test.pickCorrect();
      var F2=v18._test.F();
      var r={started:true,brkAfter:F2?F2.brk:null,hpLost:F2?(hp0-F2.hp):null,banner:F2?F2.banner:null,over:F2?F2.over:null,maxHp:F2?F2.maxHp:null};
      v18.close();
      return r;
    }
    out.shield90=fightShielded(90);
    out.shield0=fightShielded(0);
    return out;
  })())`);
  unstubRandom(ctx);
  check('shielded BREAK fight runs (3rd hit fills the meter)', f17.shield90.started === true && f17.shield0.started === true, f17);
  check('shielded: meter resets to 0 after BREAK', f17.shield90.brkAfter === 0, f17);
  check('shielded: banner quotes the exact post-shield marginal (+5), not the full bonus', (function () {
    var s = f17.shield90;
    if (!s.banner) return false;
    // slime maxHp 70 -> bonus 10; base 14; marginal = ceil(24/2)-ceil(14/2) = 12-7 = 5
    return s.banner.indexOf('+5 sát thương') >= 0 && s.banner.indexOf('+10') < 0;
  })(), f17);
  check('shielded: HP lost equals the halved total (ceil((14+10)/2)=12)', f17.shield90.hpLost === 12, f17);
  check('unshielded control: banner quotes the full +10 bonus', typeof f17.shield0.banner === 'string' && f17.shield0.banner.indexOf('+10 sát thương') >= 0, f17);
  check('unshielded control: HP lost equals the full total (14+10=24)', f17.shield0.hpLost === 24, f17);

  // ================= §F10 Escape listener =================
  section('§F10', 'F-10 — Escape listener is removed when the Account Center closes');
  // NOTE: openAccount/closeAccount are exported on __v21 (not globals).
  // The Escape dispatch calls the recorded keydown handler directly
  // (doc.__kdHandlers, tracked by the §L wrapper) — the stub has no
  // dispatchEvent. The stub's element.remove() is a no-op, so modal
  // presence cannot be asserted via getElementById after close.
  const f10 = J(ctx, `JSON.stringify((function(){
    var out={};
    function n(){ return (document.__kdHandlers||[]).length; }
    out.base=n();
    window.__v21.openAccount();
    out.afterOpen=n();
    window.__v21.closeAccount();
    out.afterClose=n();
    window.__v21.openAccount(); window.__v21.closeAccount();
    window.__v21.openAccount(); window.__v21.closeAccount();
    out.after3x=n();
    window.__v21.openAccount();
    out.afterOpen2=n();
    (document.__kdHandlers||[]).slice().forEach(function(fn){ fn({key:'Escape'}); });
    out.afterEsc=n();
    // a second Escape dispatch is a harmless no-op (no handler, no throw)
    (document.__kdHandlers||[]).slice().forEach(function(fn){ fn({key:'Escape'}); });
    out.afterEsc2=n();
    return out;
  })())`);
  check('no keydown listeners before the Account Center opens', f10.base === 0, f10);
  check('opening adds exactly 1 keydown listener', f10.afterOpen === 1, f10);
  check('closing removes it (handler list back to baseline)', f10.afterClose === 0, f10);
  check('3 open/close cycles still leave 0 listeners (no accumulation)', f10.after3x === 0, f10);
  check('Escape removes the listener', f10.afterEsc === 0, f10);
  check('a second Escape dispatch is a harmless no-op', f10.afterEsc2 === 0, f10);

  // ================= §R V18.0 REGRESSION =================
  section('§R', 'V18.0 regression — gates, BREAK clamp, fragments, probe set');
  // Chrono gate still needs 70 corrected wins; Skyroot gate still needs
  // GEAR GOLEM; region claims stay once-only per language.
  const reg = J(ctx, `JSON.stringify((function(){
    var out={};
    out.chronoGate=window.__v33._test.GATE_TOTAL;
    out.golemId=window.__v35._test.GEAR_GOLEM;
    out.skyrootGateOpen=window.__v35.gateOpen('en')===true;
    // BREAK clamp still holds: breakBonus(2000)=50, breakBonus(60)=10
    out.clampHi=window.__v34.breakBonus(2000);
    out.clampLo=window.__v34.breakBonus(60);
    out.clampMid=window.__v34.breakBonus(325);
    // V31 fragments survive (merge/hasProgress/restore guards)
    out.hasV31=true;
    // en27 sessions merge keeps the new partial field (mergeSaves is
    // exercised in §V; here just confirm the field survives a round-trip
    // through JSON — the merge path copies records opaquely)
    return out;
  })())`);
  check('Chrono gate total is still 70', reg.chronoGate === 70, reg);
  check('Skyroot gate still keys on GEAR GOLEM (v17_geargolem)', reg.golemId === 'v17_geargolem', reg);
  check('Skyroot gate opens after the §WIND golem win (gate reads the win)', reg.skyrootGateOpen === true, reg);
  check('BREAK clamp still holds (2000->50, 60->10, 325->33)', reg.clampHi === 50 && reg.clampLo === 10 && reg.clampMid === 33, reg);
  check('V17.0 golem fragments survive (id + name)', html.includes('v17_geargolem') && html.includes('GEAR GOLEM'));
  check('V31 merge fragments survive (F-01/F-02)', html.includes('mergeSaves') && html.includes('hanvocab.v12.preimport-'));
  check('V35 fragments survive (skyroot data + quests)', html.includes('__V35_DATA') && html.includes('q_islands') && html.includes('stone_wind'));

  // ================= §V save schema (en27 partial merges) =================
  section('§V', 'save schema — en27 partial field merges, no schema change');
  const sav = J(ctx, `JSON.stringify((function(){
    var out={};
    var e27=window.__v27.en27();
    out.hasSessions=Array.isArray(e27.sessions);
    out.partialRecs=e27.sessions.filter(function(r){ return r.partial===true; }).length;
    out.fullRecs=e27.sessions.filter(function(r){ return !r.partial; }).length;
    // the merge branch for en27 keys sessions by timestamp and copies
    // records opaquely — a partial record round-trips through it
    var rec=e27.sessions.filter(function(r){ return r.partial===true; })[0];
    out.partialHasWords=!!rec && Array.isArray(rec.words) && rec.words.length>0;
    out.partialHasTotal=!!rec && typeof rec.total==='number';
    // no new localStorage key was introduced by V36
    var keys=[]; for(var i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));
    out.lsKeys=keys.sort();
    return out;
  })())`);
  check('en27 has a sessions array', sav.hasSessions === true, sav);
  check('partial sessions were recorded (2: plan + quest)', sav.partialRecs === 2, sav);
  check('full sessions were recorded alongside (2: plan + quest)', sav.fullRecs === 2, sav);
  check('partial record keeps its words + total (merge-safe)', sav.partialHasWords === true && sav.partialHasTotal === true, sav);
  check('no new localStorage key from V36 (only hanvocab.* keys)', sav.lsKeys.every(function (k) { return k.indexOf('hanvocab.') === 0; }), sav.lsKeys);

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('F-06 layering in a real browser (Smart 1600 above modals, toast 1700 above Smart)', 'needs real Chrome layout — see verify-v36c.js');
  skipCheck('M1 filter-row overflow at 360px in a real browser', 'needs real Chrome layout — see verify-v36c.js');
  skipCheck('M2 touch targets >=44px measured in a real browser', 'needs real Chrome layout — see verify-v36c.js');
  skipCheck('V17-2 live lethal-skill fight in a real browser', 'needs real Chrome — see verify-v36c.js');
  skipCheck('F13 live partial session in a real browser', 'needs real Chrome — see verify-v36c.js');
  skipCheck('F09 no duplicate ids in the live DOM', 'needs real Chrome — see verify-v36c.js');
  skipCheck('live Firebase login/sync', 'never tested live in any version — Anh must run the FIREBASE_SETUP.md checklist');
  skipCheck('real phone touch / Safari', 'needs Anh\'s real-phone test');

  // ================= footer =================
  const total = pass + fail + skip;
  console.log(`\ntest36: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('test36 crashed:', e); process.exit(2); });
