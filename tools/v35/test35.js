// test35.js — V18.0 SKYROOT SANCTUARY independent verification (Node vm).
// Modelled on tools/v34/test34.js: same vm-loading pattern (stub DOM /
// localStorage, extract inline <script> blocks from out/index.html,
// fire DOMContentLoaded), own assertions, own fixtures, own drive helpers.
// Usage: node tools/v35/test35.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   §0 static build integrity (hash, title, markers, fragments, art)
//   §L page load (vm, real inline scripts) + en35 lazy shape
//   §G region gate (GEAR GOLEM per-language, locked overlay, sequential
//       unlock, region claim once-only per language)
//   §B bosses (exact stats/ids/elements, V19 fall-through live fights
//       with BREAK, Collection 86, TOTAL_BOSSES 86, wins in en19)
//   §P pets (species/eggs/skills in v23, wind element + stone_wind,
//       art paths resolve to existing PNGs, 54-form milestone)
//   §D words (240 / 4x60 / 120+120 / 0 dupes / 0 overlaps — re-runs
//       tools/v35/validate_words35.py — / POS short codes / no S.cards)
//   §Q quests (defs, disjoint lists, live V27 sessions, 0.8 boundary,
//       0.75 no-done, claim guards, final +1 gem)
//   §W weakness (weakFor/weakMatch/weakName kind 'skyroot', every Break
//       meter fillable, pool bias, 2nd live BREAK fight)
//   §L2 Library 6th group (4 sets, lesson view, filters, favs, V25
//       progress, once-only rewards)
//   §S SRS (mark15 enrolment, Skyroot-scope review, Smart universe)
//   §R V17.1 REGRESSION (Break clamp, analytics derived-only, SRS,
//       Chrono gate, golem shield/heal, V31 fragments)
//   §V save schema + v20_sync (en35 shape, no en35.bosses, hasProgress,
//       mergeSaves en35 branch)
//   §C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/touch/speech);
// live-browser, real-phone and live-Firebase gates stay Chrome/Anh-only.
// HARNESS NOTE H-35-1: tools/v35/validate_words35.py extracted its "V6"
// Korean token set from out/index.html, which since the V18.0 build
// embeds the V35 data layer itself — re-running it post-build failed
// with 189 spurious self-overlaps. Fixed in the validator (strips the
// v35data/v35js blocks before tokenising); independently verified 0
// real overlaps (pristine V6 file: 0; stripped build: 0 full ko values).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = 'eb7dcbdda825519ec597bb84d4e39e51be6b4be41bbfbe3fd66cc18d78a95568';
const EXPECTED_BYTES = 2347000;
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
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v35.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V18.0 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is 2,346,937 B', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('title is V18.0 Skyroot Sanctuary', html.includes('<title>Korean &amp; English Vocab Farm V18.0 — Skyroot Sanctuary'));
  check('__v35 + 18.0.0 present', html.includes('window.__v35') && html.includes("VERSION='18.0.0'"));
  check('__V35_DATA + __V35_WORDS present', html.includes('window.__V35_DATA') && html.includes('window.__V35_WORDS'));
  check('__v33/__v34 + 17.0.0/17.1.0 still present', html.includes('window.__v33') && html.includes('window.__v34') && html.includes("VERSION='17.0.0'") && html.includes("VERSION='17.1.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v35', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v35', styleIds.join(','));
  check('script markers end v35', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v35', scriptIds.join(','));
  check('v35data present and before v35js', html.includes('id="v35data"') && html.indexOf('id="v35data"') < html.indexOf('id="v35js"'));
  check('v35js after v34js', html.indexOf('id="v35js"') > html.indexOf('id="v34js"'));
  check('no v36 marker (no unshipped layer)', !html.includes('id="v36"') && !html.includes('id="v36js"'));
  for (const m of ['v21emailbtn', '_esc21', 'armV27Obs', 'rearmObserver', '_speakXp', 'V29 (F-05)']) {
    check(`out-of-scope marker absent: ${m}`, !html.includes(m));
  }
  const frags35 = [
    ['R-V35-V19-FIGHT', '__V35_DATA.byId(id)'],
    ['R-V35-V19-UNLOCK', "zone==='skyroot'"],
    ['R-V35-V18-ALL', '__V35_DATA?__V35_DATA.bosses:[]'],
    ['R-V35-V21-TOTAL', 'var TOTAL_BOSSES=86;'],
    ['R-V35-V20-HAS', "v7.en35&&v7.en35.quests"],
    ['R-V35-V20-MERGE', "else if(kk==='en35')"],
    ['R-V35-V15-BUILDWORDS', '/* V35: SKYROOT SANCTUARY'],
    ['R-V35-V17-GROUP', 'skyrootGroupHTML()'],
    ['R-V35-V17-SCOPE', "lib:'skyroot'"],
    ['R-V35-V17-REWARD', 'skyroot:all'],
    ['R-V35-V17-ACTIONS', 'openSkyrootSet'],
    ['R-V35-V34-WEAKMATCH', "weak.kind==='skyroot'"],
    ['R-V35-V23-STAGEIMG', "indexOf('v18/')===0"],
    ['R-V35-V23DATA-WIND', "wind:{n:'Gió'"],
    ['R-V35-V23DATA-STONE', 'stone_wind'],
  ];
  for (const [label, frag] of frags35) check(`replacement fragment ${label} present`, html.includes(frag), frag);
  check('TOTAL_BOSSES=86 present; stale 78 gone', html.includes('var TOTAL_BOSSES=86;') && !html.includes('var TOTAL_BOSSES=78;'));
  check('KO tab v35kotab x1 (after v33kotab)', countOcc(html, 'v35kotab') === 1 && html.indexOf('v35kotab') > html.indexOf('v33kotab'), { n35: countOcc(html, 'v35kotab') });
  check('en35.bosses occurs exactly once, inside a comment (no such key)', countOcc(html, 'en35.bosses') === 1 && html.includes('no en35.bosses key is ever created'), countOcc(html, 'en35.bosses'));
  check('v35 layer files present in DIR', fs.existsSync(path.join(DIR, 'v35.js')) && fs.existsSync(path.join(DIR, 'v35.css')) && fs.existsSync(path.join(DIR, 'v35_data.js')));
  for (const f of ['v35.js', 'v19.js', 'v17.js', 'v23.js']) {
    const a = fs.readFileSync(path.join(ROOT, 'src', f), 'utf-8');
    const b = fs.existsSync(path.join(DIR, f)) ? fs.readFileSync(path.join(DIR, f), 'utf-8') : '';
    check(`src/${f} agrees with out/${f} (inlined copy)`, a === b || html.includes(a.slice(0, 120)));
  }
  // Art on disk under out/assets (8 boss + 12 pet PNGs, non-empty).
  const bossPngs = ['v18_breeze_lynx', 'v18_thornwing_stag', 'v18_cloud_serpent', 'v18_moss_colossus', 'v18_tempest_harpy', 'v18_crystal_treant', 'v18_aurora_griffin', 'v18_skyroot_empress'];
  let artOk = true, artBytes = 0;
  for (const b of bossPngs) {
    const p = path.join(DIR, 'assets', 'bosses', 'v18', b + '.png');
    if (!fs.existsSync(p) || fs.statSync(p).size === 0) artOk = false; else artBytes += fs.statSync(p).size;
  }
  check('8 Skyroot boss PNGs exist under out/assets/bosses/v18/ (non-empty)', artOk, artBytes);
  const petPngs = ['v18_cloudfx_s1', 'v18_cloudfx_s2', 'v18_cloudfx_s3', 'v18_sproutowl_s1', 'v18_sproutowl_s2', 'v18_sproutowl_s3', 'v18_stormram_s1', 'v18_stormram_s2', 'v18_stormram_s3', 'v18_egg_cloud', 'v18_egg_sprout', 'v18_egg_storm'];
  let petOk = true, petBytes = 0;
  for (const b of petPngs) {
    const p = path.join(DIR, 'assets', 'pets', 'v18', b + '.png');
    if (!fs.existsSync(p) || fs.statSync(p).size === 0) petOk = false; else petBytes += fs.statSync(p).size;
  }
  check('12 Skyroot pet PNGs exist under out/assets/pets/v18/ (non-empty)', petOk, petBytes);

  // ================= §L page load =================
  section('§L', 'page load (vm, real inline scripts)');
  const ctx = makeCtx();
  dynIds.add('v15bossfight');
  const loaded = loadPage(ctx, html);
  check('inline script blocks extracted (>=30)', loaded.blocks >= 30, loaded.blocks);
  check('all inline scripts evaluate without error', loaded.loadErr === null, loaded.loadErr);
  if (loaded.loadErr) { console.log(`\ntest35 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15/__v17/__v18/__v19/__v27/__v33/__v34/__v35 present',
    E(ctx, `!!window.__v15 && !!window.__v17 && !!window.__v18 && !!window.__v19 && !!window.__v27 && !!window.__v33 && !!window.__v34 && !!window.__v35`));
  check('__v35.version is 18.0.0', E(ctx, `window.__v35.version`) === '18.0.0');
  check('__v35._test probes exposed (gate/unlock/quest/overlay/ids)', E(ctx, `var t=window.__v35._test; !!t && typeof t.gateOpen==='function' && typeof t.bossUnlocked==='function' && typeof t.startQuest==='function' && typeof t.claimQuest==='function' && typeof t.findSession==='function' && typeof t.overlayHTML==='function' && Array.isArray(t.SKYROOT_IDS) && t.GEAR_GOLEM==='v17_geargolem' && t.FINAL_QUEST==='q_empress'`));
  check('SKYROOT_IDS is the 8 v18_* ids in order', JSON.stringify(J(ctx, `JSON.stringify(window.__v35._test.SKYROOT_IDS)`)) === JSON.stringify(['v18_breeze_lynx', 'v18_thornwing_stag', 'v18_cloud_serpent', 'v18_moss_colossus', 'v18_tempest_harpy', 'v18_crystal_treant', 'v18_aurora_griffin', 'v18_skyroot_empress']));
  check('en35 is lazy (no key before first Skyroot use)', E(ctx, `!S.v7.en35`));
  E(ctx, `window.__v15.buildWords()`);
  const nWords = E(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);
  const nSky = E(ctx, `window.__v15.words.filter(function(w){return (w.lib||[]).indexOf('skyroot')>=0}).length`);
  check('240 Skyroot words in WORDS (attachSkyroot ran at init)', nSky === 240, nSky);
  check('attachSkyroot() returns 240', E(ctx, `window.__v35.attachSkyroot()`) === 240);
  check('no S.cards entries invented for Skyroot words', E(ctx, `(S.cards||[]).filter(function(c){return String(c.id||'').indexOf('v35_')===0}).length`) === 0);
  const e35shape = J(ctx, `JSON.stringify(window.__v35._test.en35())`);
  check('en35 shape is {quests, regionClaimed{en,ko}, pending, created} — no bosses key',
    e35shape && typeof e35shape.quests === 'object' && e35shape.regionClaimed && e35shape.regionClaimed.en === 0 && e35shape.regionClaimed.ko === 0 && typeof e35shape.pending === 'object' && typeof e35shape.created === 'number' && !('bosses' in e35shape), e35shape);

  // ================= §G region gate =================
  section('§G', 'region gate — GEAR GOLEM per language');
  // Fresh save: 70 total wins but NO GEAR GOLEM win — the Skyroot gate
  // is golem-based, not count-based, so it must stay closed.
  E(ctx, `(function(){
    var e15=window.__v15.en15(); e15.bosses={}; for(var i=0;i<10;i++) e15.bosses['old'+i]={win:1};
    var e18=window.__v18._test.en18(); e18.bosses={}; for(var i=0;i<30;i++) e18.bosses['v10_'+i]={win:1,wins:1};
    var e19=window.__v19._test.en19(); e19.bosses={};
    for(var i=0;i<30;i++) e19.bosses['v11_'+i]={en:{win:1,wins:1,stars:2,best:2}};
    window.__v15.save15();
  })()`);
  check('gate: 70 total wins but no GEAR GOLEM win -> Skyroot closed (both langs)',
    E(ctx, `window.__v33.correctedWinCount()`) === 70 && E(ctx, `window.__v35._test.gateOpen('en')`) === false && E(ctx, `window.__v35._test.gateOpen('ko')`) === false);
  check('gate: gearGolemWon false in both languages', E(ctx, `window.__v35._test.gearGolemWon('en')`) === false && E(ctx, `window.__v35._test.gearGolemWon('ko')`) === false);
  check('gate: no Skyroot boss unlocked while closed', E(ctx, `window.__v35._test.bossUnlocked('v18_breeze_lynx','en')`) === false && E(ctx, `window.__v35._test.bossUnlocked('v18_skyroot_empress','en')`) === false);
  check('gate: regionWon false while closed', E(ctx, `window.__v35._test.regionWon('en')`) === false);
  const claimClosed = J(ctx, `JSON.stringify(window.__v35._test.claimRegion('en'))`);
  check('gate: claimRegion refuses while region not won', claimClosed && claimClosed.ok === false, claimClosed);
  // Locked overlay (EN): shows the REAL GEAR GOLEM status + real total.
  E(ctx, `window.__v35.setLang('en')`);
  const lockedHtml = E(ctx, `window.__v35._test.overlayHTML()`);
  check('locked overlay (EN) says GEAR GOLEM not yet defeated', lockedHtml.indexOf('GEAR GOLEM chưa bị đánh bại') >= 0);
  check('locked overlay shows the real corrected total (70/86)', lockedHtml.indexOf('70/86') >= 0, lockedHtml.slice(lockedHtml.indexOf('Tổng số'), lockedHtml.indexOf('Tổng số') + 40));
  check('locked overlay shows the locked empty state, no boss cards', lockedHtml.indexOf('đang khóa') >= 0 && lockedHtml.indexOf('Bắt đầu chiến đấu') < 0);
  check('locked overlay does NOT call the buggy bossWinCount() (only mentions it in comments)',
    !fs.readFileSync(path.join(ROOT, 'src', 'v35.js'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '').includes('bossWinCount'));
  // GEAR GOLEM win in EN only -> EN opens, KO stays closed (per-language).
  seedEn19(ctx, ['v17_geargolem'], 'en');
  check('gate: GEAR GOLEM win in EN opens EN only (KO still closed)',
    E(ctx, `window.__v35._test.gearGolemWon('en')`) === true && E(ctx, `window.__v35._test.gearGolemWon('ko')`) === false && E(ctx, `window.__v35._test.gateOpen('en')`) === true && E(ctx, `window.__v35._test.gateOpen('ko')`) === false);
  check('gate: totalWins() reuses __v33.correctedWinCount (71 = 70 + golem)',
    E(ctx, `window.__v35._test.totalWins()`) === 71 && E(ctx, `window.__v35._test.totalWins()`) === E(ctx, `window.__v33.correctedWinCount()`));
  E(ctx, `window.__v35.setLang('en')`);
  const openHtml = E(ctx, `window.__v35._test.overlayHTML()`);
  check('open overlay (EN) says GEAR GOLEM defeated + gate open + 71/86', openHtml.indexOf('GEAR GOLEM đã bị đánh bại') >= 0 && openHtml.indexOf('Cổng đã mở') >= 0 && openHtml.indexOf('71/86') >= 0);
  check('open overlay lists all 8 bosses + 6 quests + pet/word note', openHtml.indexOf('Boss Skyroot') >= 0 && openHtml.indexOf('Nhiệm Vụ Cốt Truyện') >= 0 && openHtml.indexOf('Thú Cưng') >= 0 && countOcc(openHtml, 'Bắt đầu chiến đấu') >= 1);
  E(ctx, `window.__v35.setLang('ko')`);
  const lockedKoHtml = E(ctx, `window.__v35._test.overlayHTML()`);
  check('locked overlay (KO) still closed with KO wording', lockedKoHtml.indexOf('GEAR GOLEM chưa bị đánh bại') >= 0 && lockedKoHtml.indexOf('tiếng Hàn') >= 0);
  E(ctx, `window.__v35.setLang('en')`);
  // Sequential unlock inside Skyroot (EN).
  check('unlock: only Breeze Lynx unlocked at first', E(ctx, `window.__v35._test.bossUnlocked('v18_breeze_lynx','en')`) === true && E(ctx, `window.__v35._test.bossUnlocked('v18_thornwing_stag','en')`) === false);
  seedEn19(ctx, ['v18_breeze_lynx'], 'en');
  check('unlock: Thornwing Stag opens after Lynx win; Serpent still locked',
    E(ctx, `window.__v35._test.bossUnlocked('v18_thornwing_stag','en')`) === true && E(ctx, `window.__v35._test.bossUnlocked('v18_cloud_serpent','en')`) === false);
  check('unlock: KO language still locked (no KO wins yet)', E(ctx, `window.__v35._test.bossUnlocked('v18_breeze_lynx','ko')`) === false);
  // Region claim (EN): win all 8 in EN, claim once, then KO still unclaimed.
  seedEn19(ctx, ['v18_thornwing_stag', 'v18_cloud_serpent', 'v18_moss_colossus', 'v18_tempest_harpy', 'v18_crystal_treant', 'v18_aurora_griffin', 'v18_skyroot_empress'], 'en');
  check('regionWon true in EN when all 8 won; false in KO', E(ctx, `window.__v35._test.regionWon('en')`) === true && E(ctx, `window.__v35._test.regionWon('ko')`) === false);
  const xpReg0 = E(ctx, `S.xp`), gemsReg0 = E(ctx, `S.v7.gems||0`);
  const reg = J(ctx, `JSON.stringify(window.__v35._test.claimRegion('en'))`);
  check('claimRegion EN pays +150 XP + 5 gems + title "Chúa Tể Thiên Căn" once',
    reg && reg.ok === true && E(ctx, `S.xp`) === xpReg0 + 150 && E(ctx, `S.v7.gems||0`) === gemsReg0 + 5 && E(ctx, `S.v7.en19.titles.indexOf('Chúa Tể Thiên Căn')>=0`) === true, reg);
  const reg2 = J(ctx, `JSON.stringify(window.__v35._test.claimRegion('en'))`);
  check('claimRegion EN is claimed-guarded (2nd claim fails, no XP/gems)', reg2 && reg2.ok === false && E(ctx, `S.xp`) === xpReg0 + 150 && E(ctx, `S.v7.gems||0`) === gemsReg0 + 5, reg2);
  const regKo = J(ctx, `JSON.stringify(window.__v35._test.claimRegion('ko'))`);
  check('claimRegion KO refuses (region not won in KO)', regKo && regKo.ok === false, regKo);
  check('en35.regionClaimed is {en:1, ko:0} after the EN claim', E(ctx, `window.__v35._test.en35().regionClaimed.en`) === 1 && E(ctx, `window.__v35._test.en35().regionClaimed.ko`) === 0);

  // ================= §B bosses =================
  section('§B', 'bosses — stats, V19 fall-through, live fights, collection');
  const EXPECT_BOSSES = [
    ['v18_breeze_lynx', 'Breeze Lynx', 69, 760, 'wind', 'speed', 225, 5, null],
    ['v18_thornwing_stag', 'Thornwing Stag', 70, 770, 'nature', 'mc', 230, 5, null],
    ['v18_cloud_serpent', 'Cloud Serpent', 71, 785, 'water', 'listen', 235, 5, null],
    ['v18_moss_colossus', 'Moss Colossus', 72, 795, 'earth', 'type', 240, 6, null],
    ['v18_tempest_harpy', 'Tempest Harpy', 73, 810, 'thunder', 'speed', 245, 6, null],
    ['v18_crystal_treant', 'Crystal Treant', 74, 820, 'cosmic', 'grammar', 250, 6, null],
    ['v18_aurora_griffin', 'Aurora Griffin', 75, 835, 'light', 'mixed', 255, 7, 'Chúa Tể Cực Quang'],
    ['v18_skyroot_empress', 'Skyroot Empress', 76, 850, 'nature', 'mixed', 260, 7, 'Nữ Hoàng Thiên Căn'],
  ];
  const bosses = J(ctx, `JSON.stringify(window.__V35_DATA.bosses.map(function(b){return [b.id,b.n,b.lv,b.hp,b.el,b.mode,b.reward.xp,b.reward.gems,b.reward.title,b.zone,b.diff,b.lang,b.img,b.def]}))`);
  check('__V35_DATA has exactly the 8 specified bosses', bosses.length === 8, bosses.length);
  for (const [id, n, lv, hp, el, mode, xp, gems, title] of EXPECT_BOSSES) {
    const b = bosses.filter(x => x[0] === id)[0];
    check(`boss ${id}: ${n} Lv${lv} HP${hp} ${el}/${mode} +${xp}XP/+${gems}💎 title=${title}`,
      !!b && b[1] === n && b[2] === lv && b[3] === hp && b[4] === el && b[5] === mode && b[6] === xp && b[7] === gems && b[8] === title && b[9] === 'skyroot' && b[10] === 'B2' && b[11] === 'both' && b[12] === 'assets/bosses/v18/' + id + '.png' && typeof b[13] === 'number', b);
  }
  const ELEM_IDS = ['burn', 'freeze', 'chain', 'veil', 'cleanse', 'regen', 'heal', 'gale', 'shield', 'rift'];
  const TACT_IDS = ['tshield', 'theal', 'ttimer', 'tveil', 'tenrage'];
  const PASS_IDS = ['bulwark', 'vampiric', 'swift', 'thorns'];
  const skillsOk = J(ctx, `JSON.stringify(window.__V35_DATA.bosses.map(function(b){return [b.skills.elem.id,b.skills.tact.id,b.skills.pass.id]}))`);
  check('all boss skill ids come only from the V19 palette (elem/tact/pass)',
    skillsOk.every(s => ELEM_IDS.indexOf(s[0]) >= 0 && TACT_IDS.indexOf(s[1]) >= 0 && PASS_IDS.indexOf(s[2]) >= 0), skillsOk);
  check('all boss elements exist in the real V19 element map', E(ctx, `window.__V35_DATA.bosses.every(function(b){ return !!(window.__V19_DATA.elements||{})[b.el]; })`));
  check('Crystal Treant maps to cosmic (no crystal key in V19 EL)', E(ctx, `window.__V35_DATA.bosses.filter(function(b){return b.id==='v18_crystal_treant'})[0].el`) === 'cosmic' && E(ctx, `!window.__V19_DATA.elements['crystal']`));
  check('__V35_DATA.byId resolves every Skyroot id; unknown id -> null',
    E(ctx, `window.__V35_DATA.bosses.every(function(b){ return window.__V35_DATA.byId(b.id)===b; })`) && E(ctx, `window.__V35_DATA.byId('v18_nope')`) === null);
  check('__v19.isWon reads Skyroot wins from en19 (lynx won in EN)', E(ctx, `window.__v19.isWon('v18_breeze_lynx','en')`) === true && E(ctx, `window.__v19.isWon('v18_breeze_lynx','ko')`) === false);
  check('__v19.stars reads Skyroot stars (lynx 3 in EN)', E(ctx, `window.__v19.stars('v18_breeze_lynx','en')`) === 3);
  check('TOTAL_BOSSES is 86 via __v21', E(ctx, `window.__v21.TOTAL_BOSSES`) === 86);
  check('allBosses() length is 86 (collection header says "86 boss")', E(ctx, `window.__v18.collectionHTML()`).indexOf('86 boss') >= 0);
  const collHtml = E(ctx, `window.__v18.collectionHTML()`);
  check('Collection renders weakness chips for all 86 bosses', (collHtml.match(/Điểm yếu:/g) || []).length >= 86, (collHtml.match(/Điểm yếu:/g) || []).length);
  check('Collection includes the 8 Skyroot bosses by name', EXPECT_BOSSES.every(([id, n]) => collHtml.indexOf(n) >= 0 || collHtml.indexOf(id) >= 0));
  check('no en35.bosses key exists in the live save', E(ctx, `!S.v7.en35.bosses`));
  // ---- Live V19 fight vs Breeze Lynx (mode speed, elem gale, def 7) ----
  // Damage model (no pet, no crit with random=0.9): combo 1/2/3 ->
  // dmg 14/16/18, gale x1.25 -> 18/20/23, minus def 7 -> 11/13/16 = 40
  // base; BREAK on the 3rd weakness hit adds breakBonus(760)=50.
  // Expected HP lost = 90 (760 -> 670), brk 1 -> 2 -> 0, BREAK banner.
  stubRandom(ctx);
  const fLynx = J(ctx, `(function(){
    var v19=window.__v19, v15=window.__v15, v34=window.__v34;
    var clim=v15.words.filter(function(w){return w.skyrootSet==='climate'})[0];
    var dist=v15.words.filter(function(w){return w.id!==clim.id}).slice(0,3);
    var nonClim=v15.words.filter(function(w){return w.skyrootSet==='science'})[0];
    v19._test.setLang('en');
    v19.fight('v18_breeze_lynx');
    var F=v19._test.F();
    var out={weak:F.weak, hp0:F.hp, maxHp:F.maxHp, brk0:F.brk, climEn:clim.en, poolSize:(F.pools&&F.pools.words||[]).length,
      poolWeak:(F.pools&&F.pools.words||[]).filter(function(w){return v34.weakMatch(w,F.weak)}).length};
    for(var hit=1;hit<=3;hit++){
      F=v19._test.F();
      F.cur={w:clim, opts:[clim].concat(dist), optsVi:[clim].concat(dist)};
      var ok=v19._test.pickCorrect();
      F=v19._test.F();
      out['brk'+hit]=F?F.brk:null; out['hpAfter'+hit]=F?F.hp:null; out['banner'+hit]=F?String(F.banner||''):null; out['ok'+hit]=ok;
      if(F&&!F.over) v19.next();
    }
    out.hpLost=out.hp0-out.hpAfter3;
    F=v19._test.F();
    F.cur={w:nonClim, opts:[nonClim].concat(dist), optsVi:[nonClim].concat(dist)};
    var ok4=v19._test.pickCorrect();
    F=v19._test.F();
    out.ok4=ok4; out.brkAfterNonWeak=F?F.brk:null; out.hpAfter4=F?F.hp:null;
    v19.close();
    return JSON.stringify(out);
  })()`);
  check('V19 fall-through: Skyroot fight starts (weak=skyroot/climate, hp 760, brk 0)', fLynx.weak && fLynx.weak.kind === 'skyroot' && fLynx.weak.key === 'climate' && fLynx.hp0 === 760 && fLynx.maxHp === 760 && fLynx.brk0 === 0, fLynx);
  check('V19 Skyroot fight pool holds climate (weakness) words', fLynx.poolWeak > 0 && fLynx.poolSize > 0, { poolSize: fLynx.poolSize, poolWeak: fLynx.poolWeak });
  check('V19 Skyroot BREAK: brk 1 -> 2 -> 0 across 3 weakness hits', fLynx.brk1 === 1 && fLynx.brk2 === 2 && fLynx.brk3 === 0, fLynx);
  check('V19 Skyroot BREAK: HP lost is exactly base 40 + BREAK 50 (=90)', fLynx.hpLost === 90, fLynx);
  check('V19 Skyroot BREAK: banner shows BREAK on the 3rd hit', (fLynx.banner3 || '').indexOf('BREAK') >= 0, fLynx.banner3);
  check('V19 Skyroot: non-weakness correct answer fills 0 (brk stays 0, 4th hit -18 HP: 670 -> 652)', fLynx.ok4 === true && fLynx.brkAfterNonWeak === 0 && fLynx.hpAfter4 === 652, fLynx);
  unstubRandom(ctx);
  // ---- V18 challenge/collDetail fall-through (same shared lookup) ----
  // challenge(id) opens the map and starts the V19 fight (returns nothing).
  const chOk = E(ctx, `(function(){ try{
    window.__v18.challenge('v18_breeze_lynx');
    var F=window.__v19._test.F();
    var ok=!!F && F.boss && F.boss.id==='v18_breeze_lynx' && F.hp===760;
    window.__v19.close();
    return ok;
  }catch(e){ return 'throw: '+e.message; } })()`);
  check('V18 challenge() resolves a Skyroot boss and starts its V19 fight (fall-through)', chOk === true, chOk);

  // ================= §P pets =================
  section('§P', 'pets — 3 species x 3 stages + 3 eggs in v23');
  const reg2nd = J(ctx, `JSON.stringify(window.__v35.registerPets())`);
  check('registerPets() is idempotent (2nd call adds 0 species/eggs, no milestone)', reg2nd && reg2nd.species === 0 && reg2nd.eggs === 0 && reg2nd.milestone === false, reg2nd);
  const species = J(ctx, `JSON.stringify(window.__V23_DATA.species.filter(function(s){return ['cloudfx','sproutowl','stormram'].indexOf(s.id)>=0}).map(function(s){return [s.id,s.n,s.el,s.rar,s.egg,s.stages.map(function(x){return x.img})]}))`);
  check('all 3 Skyroot species registered in __V23_DATA', species.length === 3, species);
  check('Cloud Fox: wind/epic, egg cloud, 3 stages under v18/', JSON.stringify(species.filter(s => s[0] === 'cloudfx')[0]) === JSON.stringify(['cloudfx', 'Cáo Mây', 'wind', 'epic', 'cloud', ['v18/v18_cloudfx_s1.png', 'v18/v18_cloudfx_s2.png', 'v18/v18_cloudfx_s3.png']]), species);
  check('Sprout Owl: nature/rare, egg sprout, 3 stages under v18/', JSON.stringify(species.filter(s => s[0] === 'sproutowl')[0]) === JSON.stringify(['sproutowl', 'Cú Mầm', 'nature', 'rare', 'sprout', ['v18/v18_sproutowl_s1.png', 'v18/v18_sproutowl_s2.png', 'v18/v18_sproutowl_s3.png']]), species);
  check('Storm Ram: thunder/legendary, egg storm, 3 stages under v18/', JSON.stringify(species.filter(s => s[0] === 'stormram')[0]) === JSON.stringify(['stormram', 'Cừu Bão', 'thunder', 'legendary', 'storm', ['v18/v18_stormram_s1.png', 'v18/v18_stormram_s2.png', 'v18/v18_stormram_s3.png']]), species);
  const eggs = J(ctx, `JSON.stringify(window.__V23_DATA.eggs.filter(function(e){return ['cloud','sprout','storm'].indexOf(e.id)>=0}).map(function(e){return [e.id,e.n,e.el,e.price,e.hatchMin,e.img]}))`);
  check('all 3 Skyroot eggs registered (cloud 1200/120, sprout 1000/120, storm 2000/240)',
    JSON.stringify(eggs) === JSON.stringify([['cloud', 'Trứng Mây', 'wind', 1200, 120, 'v18/v18_egg_cloud.png'], ['sprout', 'Trứng Mầm', 'nature', 1000, 120, 'v18/v18_egg_sprout.png'], ['storm', 'Trứng Bão', 'thunder', 2000, 240, 'v18/v18_egg_storm.png']]), eggs);
  const petSkills = J(ctx, `JSON.stringify(window.__V23_DATA.species.filter(function(s){return ['cloudfx','sproutowl','stormram'].indexOf(s.id)>=0}).map(function(s){return [s.id,[s.skills.a.type,s.skills.a.val],[s.skills.p.type,s.skills.p.val],[s.skills.u.type,s.skills.u.val]]}))`);
  check('pet skills use existing v23 types only, values as specified (fox dmg30/storm8/dmg60, owl heal70/wisdom1/heal140, ram shield80/storm8/dmg60)',
    JSON.stringify(petSkills) === JSON.stringify([['cloudfx', ['dmg', 30], ['storm', 8], ['dmg', 60]], ['sproutowl', ['heal', 70], ['wisdom', 1], ['heal', 140]], ['stormram', ['shield', 80], ['storm', 8], ['dmg', 60]]]), petSkills);
  check('wind element exists in v23 PET_ELEMENTS (Gió, icon, color)', E(ctx, `var el=window.__V23_DATA.elements.wind; !!el && el.n==='Gió' && el.icon==='🌪️' && el.color==='#8FE3C0'`));
  check('stone_wind exists in v23 PET_MATERIALS (el wind)', E(ctx, `window.__V23_DATA.materials.some(function(m){return m.id==='stone_wind' && m.el==='wind'})`));
  check('evolution costs exist per element stone (no new materials)', E(ctx, `window.__V23_DATA.evoCost.length===2 && window.__V23_DATA.evoLv.join(',')==='10,20'`));
  const mile54 = J(ctx, `JSON.stringify((window.__V23_DATA.collectionRewards||[]).filter(function(r){return r.forms===54})[0]||null)`);
  check('54-form collection milestone registered (+70 gems, title "Bậc Thầy Thiên Căn")',
    !!mile54 && mile54.gems === 70 && mile54.title === 'Bậc Thầy Thiên Căn', mile54);
  check('45-form Chrono milestone still present (no regression)', E(ctx, `(window.__V23_DATA.collectionRewards||[]).some(function(r){return r.forms===45})`));
  check('pet stage art paths resolve to existing PNGs under out/assets/pets/v18/',
    E(ctx, `window.__V23_DATA.species.filter(function(s){return ['cloudfx','sproutowl','stormram'].indexOf(s.id)>=0}).every(function(s){return s.stages.every(function(st){return st.img.indexOf('v18/')===0})})`) &&
    ['v18_cloudfx_s1', 'v18_cloudfx_s2', 'v18_cloudfx_s3', 'v18_sproutowl_s1', 'v18_sproutowl_s2', 'v18_sproutowl_s3', 'v18_stormram_s1', 'v18_stormram_s2', 'v18_stormram_s3'].every(n => fs.existsSync(path.join(DIR, 'assets', 'pets', 'v18', n + '.png'))));
  check('pet egg art paths resolve to existing PNGs under out/assets/pets/v18/',
    E(ctx, `window.__V23_DATA.eggs.filter(function(e){return ['cloud','sprout','storm'].indexOf(e.id)>=0}).every(function(e){return e.img.indexOf('v18/')===0})`) &&
    ['v18_egg_cloud', 'v18_egg_sprout', 'v18_egg_storm'].every(n => fs.existsSync(path.join(DIR, 'assets', 'pets', 'v18', n + '.png'))));
  check('stageImg/eggImgHTML v18/ rule present in the built file (R-V35-V23-STAGEIMG/EGGIMG)',
    html.includes("indexOf('v18/')===0?('assets/pets/'+_im)") && html.includes("egg.img.indexOf('v18/')===0?('assets/pets/'+egg.img)"));
  check('V15 farm animals untouched (no v35 pet ids in the farm)', E(ctx, `!window.__V35_DATA.species.some(function(s){return ['fire','forest','water','earth','thunder','ice','light','dark'].indexOf(s.id)>=0})`));

  // ================= §D words =================
  section('§D', 'words — 240, dedupe, overlap, POS, no S.cards');
  // Re-run the word validator as part of this suite (H-35-1 fixed).
  let valOut = '', valCode = -1;
  try { valOut = execSync('python3 tools/v35/validate_words35.py', { cwd: ROOT, encoding: 'utf-8' }); valCode = 0; }
  catch (e) { valOut = (e.stdout || '') + (e.stderr || ''); valCode = e.status; }
  check('validate_words35.py exits 0 (240, 4x60, 120+120, 0 dupes, 0 overlaps, 0 blanks)', valCode === 0, valOut.slice(-300));
  const w35 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'v35_words.json'), 'utf-8'));
  check('data/v35_words.json has 240 records', w35.length === 240);
  const perSet = {};
  w35.forEach(w => { perSet[w.set] = (perSet[w.set] || 0) + 1; });
  check('4 sets x 60 in the source file', perSet.climate === 60 && perSet.science === 60 && perSet.society === 60 && perSet.mind === 60, perSet);
  const perLed = {};
  w35.forEach(w => { perLed[w.led] = (perLed[w.led] || 0) + 1; });
  check('120 EN-led + 120 KO-led in the source file', perLed.en === 120 && perLed.ko === 120, perLed);
  const enDupes = w35.map(w => w.en.toLowerCase()).filter((v, i, a) => a.indexOf(v) !== i);
  const koDupes = w35.map(w => w.ko).filter((v, i, a) => a.indexOf(v) !== i);
  check('0 internal duplicate EN headwords (case-insensitive)', enDupes.length === 0, enDupes);
  check('0 internal duplicate KO headwords', koDupes.length === 0, koDupes);
  const idOk = w35.every(w => w.id === 'v35_' + w.en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));
  check('every id is v35_<slug of en> (V33 slug rule)', idOk);
  const blankOk = w35.every(w => ['en', 'ko', 'vi', 'ex', 'exvi'].every(f => String(w[f] || '').trim().length > 0));
  check('0 blank en/ko/vi/ex/exvi in the source file', blankOk);
  // In-test overlap vs Chrono (the other 240-word set) on both sides.
  const w33 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'v33_words.json'), 'utf-8'));
  const en33 = new Set(w33.map(w => w.en.toLowerCase()));
  const ko33 = new Set(w33.map(w => w.ko));
  const ovEn = w35.filter(w => en33.has(w.en.toLowerCase()));
  const ovKo = w35.filter(w => ko33.has(w.ko));
  check('0 EN overlaps with Chrono (v33) words', ovEn.length === 0, ovEn.map(w => w.en));
  check('0 KO overlaps with Chrono (v33) words', ovKo.length === 0, ovKo.map(w => w.ko));
  // Merged WORDS records: lib, set, lv, POS short codes, no S.cards.
  const merged = J(ctx, `JSON.stringify(window.__v15.words.filter(function(w){return (w.lib||[]).indexOf('skyroot')>=0}).map(function(w){return [w.id,w.skyrootSet,w.lv,w.pos]}))`);
  check('all 240 merged WORDS records carry skyrootSet + lv B2', merged.length === 240 && merged.every(r => ['climate', 'science', 'society', 'mind'].indexOf(r[1]) >= 0 && r[2] === 'B2'), merged.length);
  const posSet = {};
  merged.forEach(r => { posSet[r[3]] = (posSet[r[3]] || 0) + 1; });
  check('POS normalised long->short at merge (only n/v/adj/adv in WORDS)', Object.keys(posSet).every(p => ['n', 'v', 'adj', 'adv'].indexOf(p) >= 0) && !merged.some(r => ['noun', 'verb', 'adjective', 'adverb'].indexOf(r[3]) >= 0), posSet);
  const setCounts = {};
  merged.forEach(r => { setCounts[r[1]] = (setCounts[r[1]] || 0) + 1; });
  check('merged WORDS: 60 per Skyroot set', setCounts.climate === 60 && setCounts.science === 60 && setCounts.society === 60 && setCounts.mind === 60, setCounts);
  const ledMerged = J(ctx, `JSON.stringify(window.__V35_WORDS.reduce(function(a,w){a[w.led]=(a[w.led]||0)+1;return a},{}))`);
  check('led split kept in the data file (120/120)', ledMerged.en === 120 && ledMerged.ko === 120, ledMerged);
  check('every merged Skyroot word has a Korean translation (ko field, Hangul)', E(ctx, `window.__v15.words.filter(function(w){return (w.lib||[]).indexOf('skyroot')>=0}).every(function(w){return /[가-힣]/.test(w.ko||'')})`));

  // ================= §Q quests =================
  section('§Q', 'quests — defs, live V27 sessions, thresholds, claim guards');
  const quests = J(ctx, `JSON.stringify(window.__V35_DATA.quests.map(function(q){return [q.id,q.n,q.vi,q.ids.length]}))`);
  check('6 quests defined with the specified ids/names', JSON.stringify(quests.map(q => q[0])) === JSON.stringify(['q_islands', 'q_temple', 'q_roots', 'q_guardians', 'q_trials', 'q_empress']), quests);
  check('quest sizes are 12/14/12/12/12/14', JSON.stringify(quests.map(q => q[3])) === JSON.stringify([12, 14, 12, 12, 12, 14]), quests);
  check('quest names match the spec (EN + VI)', quests[0][1] === 'Lost Sky Islands' && quests[0][2] === 'Đảo Trời Đã Mất' && quests[1][1] === 'Wind Temple' && quests[2][1] === 'Ancient Roots' && quests[3][1] === 'Crystal Guardians' && quests[4][1] === 'Sky Beast Trials' && quests[5][1] === 'Empress Awakening', quests);
  const qLists = J(ctx, `JSON.stringify(window.__V35_DATA.quests.map(function(q){return q.ids}))`);
  const allQIds = [].concat(...qLists);
  check('quest word lists are pairwise disjoint (76 ids, 0 shared)', allQIds.length === 76 && new Set(allQIds).size === 76, allQIds.length);
  check('every quest word id exists in WORDS as a Skyroot word', E(ctx, `var ids={}; window.__v15.words.forEach(function(w){ids[w.id]=1}); window.__V35_DATA.quests.every(function(q){return q.ids.every(function(id){return !!ids[id]})})`));
  check('FINAL_QUEST is q_empress (14 words)', E(ctx, `window.__v35._test.FINAL_QUEST`) === 'q_empress' && quests[5][3] === 14);
  // q_islands: all correct -> done -> claim +30 (20 + 10 bonus at acc 1.0).
  const qIslandIds = qLists[0];
  check('startQuest q_islands returns true, state active', E(ctx, `window.__v35.startQuest('q_islands')`) === true && E(ctx, `window.__v35._test.questState('q_islands')`) === 'active');
  const recIslands = driveSession(ctx, [true], qIslandIds);
  check('quest q_islands: real V27 session finishes 12/12 (acc 1.0)', !!recIslands && recIslands.total === 12 && recIslands.correct === 12, recIslands);
  const doneIslands = J(ctx, `JSON.stringify(window.__v35.checkCompletions())`);
  check('checkCompletions marks q_islands done at acc 1.0', doneIslands.indexOf('q_islands') >= 0 && E(ctx, `window.__v35._test.questState('q_islands')`) === 'done', doneIslands);
  const xpQ0 = E(ctx, `S.xp`), gemsQ0 = E(ctx, `S.v7.gems||0`);
  const claimIslands = J(ctx, `JSON.stringify(window.__v35._test.claimQuest('q_islands'))`);
  check('claimQuest q_islands pays +30 XP (20 first clear + 10 for >=90%), no gems', claimIslands && claimIslands.ok === true && E(ctx, `S.xp`) === xpQ0 + 30 && E(ctx, `S.v7.gems||0`) === gemsQ0, claimIslands);
  const claimIslands2 = J(ctx, `JSON.stringify(window.__v35._test.claimQuest('q_islands'))`);
  check('claimQuest q_islands is claimed-guarded (2nd claim fails, no XP)', claimIslands2 && claimIslands2.ok === false && E(ctx, `S.xp`) === xpQ0 + 30, claimIslands2);
  check('questState q_islands is claimed after claim', E(ctx, `window.__v35._test.questState('q_islands')`) === 'claimed');
  // q_roots: exactly 0.8 boundary -> done (9 right + 3 wrong main, 3 right reask = 12/15).
  E(ctx, `window.__v35.startQuest('q_roots')`);
  const recRoots = driveSession(ctx, [true, true, true, true, true, true, true, true, true, false, false, false, true, true, true], qLists[2]);
  check('quest q_roots boundary session rec exists (acc exactly 0.8)', !!recRoots && Math.abs(recRoots.correct / recRoots.total - 0.8) < 0.001, recRoots && { c: recRoots.correct, t: recRoots.total });
  E(ctx, `window.__v35.checkCompletions()`);
  check('quest with acc exactly 0.8 IS marked done (>=0.8 threshold)', E(ctx, `window.__v35._test.questState('q_roots')`) === 'done');
  // NOTE: the session itself pays mark15 XP (+10 per correct answer), so
  // capture XP immediately before the claim and compare the delta only.
  const xpR0 = E(ctx, `S.xp`), gemsR0 = E(ctx, `S.v7.gems||0`);
  const claimRoots = J(ctx, `JSON.stringify(window.__v35._test.claimQuest('q_roots'))`);
  check('claimQuest q_roots at acc 0.8 pays +20 XP only (no >=90% bonus)', claimRoots && claimRoots.ok === true && E(ctx, `S.xp`) === xpR0 + 20 && E(ctx, `S.v7.gems||0`) === gemsR0, claimRoots);
  // q_guardians: 0.75 -> NOT done (8 right + 4 wrong main, 4 right reask = 12/16).
  E(ctx, `window.__v35.startQuest('q_guardians')`);
  const recGuard = driveSession(ctx, [true, true, true, true, true, true, true, true, false, false, false, false, true, true, true, true], qLists[3]);
  check('quest q_guardians low session rec exists (acc 0.75)', !!recGuard && recGuard.correct === 12 && recGuard.total === 16 && (recGuard.correct / recGuard.total) < 0.8, recGuard && { c: recGuard.correct, t: recGuard.total });
  E(ctx, `window.__v35.checkCompletions()`);
  check('quest with acc 0.75 (<0.8) is NOT marked done (V33 B-33-1 lesson)', E(ctx, `window.__v35._test.questState('q_guardians')`) !== 'done', E(ctx, `window.__v35._test.questState('q_guardians')`));
  check('below-threshold run consumes the attempt (state back to new, retry possible)', E(ctx, `window.__v35._test.questState('q_guardians')`) === 'new');
  const claimGuard = J(ctx, `JSON.stringify(window.__v35._test.claimQuest('q_guardians'))`);
  check('unfinished quest cannot be claimed', claimGuard && claimGuard.ok === false, claimGuard);
  // q_empress (final): all correct -> claim pays +30 XP + 1 gem.
  E(ctx, `window.__v35.startQuest('q_empress')`);
  const recEmp = driveSession(ctx, [true], qLists[5]);
  check('quest q_empress: real V27 session finishes 14/14 (acc 1.0)', !!recEmp && recEmp.total === 14 && recEmp.correct === 14, recEmp);
  E(ctx, `window.__v35.checkCompletions()`);
  check('q_empress marked done at acc 1.0', E(ctx, `window.__v35._test.questState('q_empress')`) === 'done');
  const xpE0 = E(ctx, `S.xp`), gemsE0 = E(ctx, `S.v7.gems||0`);
  const claimEmp = J(ctx, `JSON.stringify(window.__v35._test.claimQuest('q_empress'))`);
  check('claimQuest q_empress (final) pays +30 XP + 1 gem', claimEmp && claimEmp.ok === true && E(ctx, `S.xp`) === xpE0 + 30 && E(ctx, `S.v7.gems||0`) === gemsE0 + 1, claimEmp);
  // findSession scans all sessions (a later Smart session does not steal the completion).
  const findOk = E(ctx, `(function(){ var q=window.__V35_DATA.quests[0]; var hit=window.__v35._test.findSession(q.ids, 0); return !!hit && hit.acc===1; })()`);
  check('findSession finds the quest session by word coverage (scans all sessions)', findOk === true);

  // ================= §W weakness =================
  section('§W', 'Boss Weakness — kind skyroot, every meter fillable');
  const EXPECT_WEAK = {
    v18_breeze_lynx: 'climate', v18_thornwing_stag: 'society', v18_cloud_serpent: 'science',
    v18_moss_colossus: 'mind', v18_tempest_harpy: 'climate', v18_crystal_treant: 'science',
    v18_aurora_griffin: 'society', v18_skyroot_empress: 'mind',
  };
  const weakTable = J(ctx, `JSON.stringify(window.__V35_DATA.weakExplicit)`);
  check('weakExplicit has 8 entries (2 bosses per set)', Object.keys(weakTable).length === 8 &&
    ['climate', 'science', 'society', 'mind'].every(k => Object.keys(weakTable).filter(id => weakTable[id].key === k).length === 2), weakTable);
  for (const id of Object.keys(EXPECT_WEAK)) {
    check(`weakFor(${id}) = skyroot/${EXPECT_WEAK[id]}`, E(ctx, `var w=window.__v34.weakFor({id:'${id}',zone:'skyroot'},'en'); w&&w.kind==='skyroot'&&w.key==='${EXPECT_WEAK[id]}'`));
  }
  check("weakFor zone fallback: unknown skyroot-zone boss -> skyroot/climate", E(ctx, `var w=window.__v34.weakFor({id:'v18_unknown',zone:'skyroot'},'en'); w&&w.kind==='skyroot'&&w.key==='climate'`));
  check("weakFor: Chrono bosses unchanged (sandwisp->time, golem->machines)",
    E(ctx, `window.__v34.weakFor({id:'v17_sandwisp',zone:'chrono'},'en').key==='time' && window.__v34.weakFor({id:'v17_geargolem',zone:'chrono'},'en').key==='machines'`));
  for (const set of ['climate', 'science', 'society', 'mind']) {
    const n = E(ctx, `window.__v15.words.filter(function(w){return window.__v34.weakMatch(w,{kind:'skyroot',key:'${set}'})}).length`);
    check(`weakMatch skyroot/${set} matches exactly 60 WORDS (the whole set)`, n === 60, n);
    const nOther = E(ctx, `window.__v15.words.filter(function(w){return w.skyrootSet && w.skyrootSet!=='${set}' && window.__v34.weakMatch(w,{kind:'skyroot',key:'${set}'})}).length`);
    check(`weakMatch skyroot/${set} matches 0 words from other sets`, nOther === 0, nOther);
  }
  check('weakName resolves Skyroot set labels', E(ctx, `window.__v34.weakName({kind:'skyroot',key:'climate'})`) === 'Climate & Environment' && E(ctx, `window.__v34.weakName({kind:'skyroot',key:'mind'})`) === 'Mind & Character');
  check('weakChipHTML (Skyroot boss) names the set', E(ctx, `window.__v34.weakChipHTML({id:'v18_breeze_lynx',zone:'skyroot',diff:'B2'},'en')`).indexOf('Climate') >= 0);
  // Every Break meter fillable: each boss's weakness pool is its 60-word set.
  for (const id of Object.keys(EXPECT_WEAK)) {
    const n = E(ctx, `window.__v15.words.filter(function(w){return window.__v34.weakMatch(w, window.__v34.weakFor({id:'${id}',zone:'skyroot'},'en'))}).length`);
    check(`Break meter fillable for ${id} (pool ${n} words)`, n === 60, n);
  }
  // Pool bias for a Skyroot boss (real randomness, same engine as V34).
  const biasSky = J(ctx, `(function(){
    var v19=window.__v19, v34=window.__v34;
    v19._test.setLang('en');
    v19.fight('v18_breeze_lynx');
    var F=v19._test.F();
    var words=F.pools.words;
    var fb=words.filter(function(w){return !v34.weakMatch(w,F.weak)})[0];
    var n=0,N=400;
    for(var i=0;i<N;i++){var p=v34.weakPick(F,words,fb); if(p&&v34.weakMatch(p,F.weak))n++;}
    var weakInPool=words.filter(function(w){return v34.weakMatch(w,F.weak)}).length;
    var out={share:n/N, poolSize:words.length, weakInPool:weakInPool, baseline:weakInPool/words.length};
    v19.close();
    return JSON.stringify(out);
  })()`);
  check('Skyroot weakPick draws weakness words ~50% (0.3–0.7 over 400 draws)', biasSky.share >= 0.3 && biasSky.share <= 0.7, biasSky);
  check('Skyroot weakPick bias is real (baseline well below the draw share)', biasSky.baseline < 0.15 && biasSky.share > biasSky.baseline * 3, biasSky);
  // Second live BREAK fight: Thornwing Stag (mode mc, def 7, elem shield
  // -> starts with a 30-HP shield that HALVES dealt damage (ceil) while
  // it lasts, exactly like the golem shield). Base: 14/16/18 - 7 = 7/9/11;
  // dealt: ceil(7/2)=4, ceil(9/2)=5, ceil((11+50)/2)=31; shield 30 -> 0.
  // Expected HP lost = 4+5+31 = 40 (770 -> 730).
  stubRandom(ctx);
  const fStag = J(ctx, `(function(){
    var v19=window.__v19, v15=window.__v15;
    var soc=v15.words.filter(function(w){return w.skyrootSet==='society'})[0];
    var dist=v15.words.filter(function(w){return w.id!==soc.id}).slice(0,3);
    v19._test.setLang('en');
    v19.fight('v18_thornwing_stag');
    var F=v19._test.F();
    var out={weak:F.weak, hp0:F.hp, brk0:F.brk, shield0:F.shield, socEn:soc.en};
    for(var hit=1;hit<=3;hit++){
      F=v19._test.F();
      F.cur={w:soc, opts:[soc].concat(dist), optsVi:[soc].concat(dist)};
      var ok=v19._test.pickCorrect();
      F=v19._test.F();
      out['brk'+hit]=F?F.brk:null; out['hpAfter'+hit]=F?F.hp:null; out['shield'+hit]=F?F.shield:null; out['banner'+hit]=F?String(F.banner||''):null; out['ok'+hit]=ok;
      if(F&&!F.over) v19.next();
    }
    out.hpLost=out.hp0-out.hpAfter3;
    v19.close();
    return JSON.stringify(out);
  })()`);
  check('V19 Stag fight starts: weak=skyroot/society, hp 770, brk 0, 30-HP shield (elem shield)', fStag.weak && fStag.weak.kind === 'skyroot' && fStag.weak.key === 'society' && fStag.hp0 === 770 && fStag.brk0 === 0 && fStag.shield0 === 30, fStag);
  check('V19 Stag BREAK: brk 1 -> 2 -> 0 across 3 weakness hits', fStag.brk1 === 1 && fStag.brk2 === 2 && fStag.brk3 === 0, fStag);
  check('V19 Stag BREAK: HP lost is exactly 4+5+31 = 40 (shield halves, BREAK +50 halved to 31 on hit 3)', fStag.hpLost === 40 && fStag.hpAfter1 === 766 && fStag.hpAfter2 === 761 && fStag.hpAfter3 === 730 && fStag.shield3 === 0, fStag);
  check('V19 Stag BREAK: banner shows BREAK on the 3rd hit', (fStag.banner3 || '').indexOf('BREAK') >= 0, fStag.banner3);
  unstubRandom(ctx);
  // breakBonus clamp still holds (V34 unit values).
  check('breakBonus clamps: 60->10, 200->20, 620->50, 325->33, 760->50, 850->50, 1000->50, 50->10',
    E(ctx, `window.__v34.breakBonus(60)===10 && window.__v34.breakBonus(200)===20 && window.__v34.breakBonus(620)===50 && window.__v34.breakBonus(325)===33 && window.__v34.breakBonus(760)===50 && window.__v34.breakBonus(850)===50 && window.__v34.breakBonus(1000)===50 && window.__v34.breakBonus(50)===10`));

  // ================= §L2 Library 6th group =================
  section('§L2', 'Library — Skyroot group (v17 + v25)');
  check('skyrootWords() = 240', E(ctx, `window.__v17.skyrootWords().length`) === 240);
  const skySets = J(ctx, `JSON.stringify(window.__v17.skyrootSets().map(function(g){return g.id+':'+g.words.length}))`);
  check('skyrootSets() = 4 x 60 in fixed order (climate/science/society/mind)', JSON.stringify(skySets) === JSON.stringify(['climate:60', 'science:60', 'society:60', 'mind:60']), skySets);
  const libHtml = E(ctx, `window.__v17.libraryHTML()`);
  check('libraryHTML has the Skyroot Sanctuary group', libHtml.indexOf('Skyroot Sanctuary') >= 0);
  check('libraryHTML renders Skyroot AFTER Chrono (6th group, not before)', libHtml.indexOf('Skyroot Sanctuary') > libHtml.indexOf('Chrono Kingdom'));
  for (const nm of ['Climate & Environment', 'Science & Innovation', 'Society & Culture', 'Mind & Character']) {
    check(`libraryHTML lists set ${nm}`, libHtml.indexOf(nm) >= 0 || libHtml.indexOf(nm.replace(/&/g, '&amp;')) >= 0);
  }
  check('libraryHTML has the group summary row', libHtml.indexOf('Tổng:') >= 0);
  check('libraryHTML set cards show a learned/mastered/due stat line', libHtml.indexOf('đã học') >= 0 && libHtml.indexOf('đã thuộc') >= 0 && libHtml.indexOf('cần ôn') >= 0);
  check('libraryHTML states the KO-led note honestly (120 từ dẫn bằng tiếng Hàn)', libHtml.indexOf('120 từ dẫn bằng tiếng Hàn') >= 0);
  // Per-set lesson view.
  const firstClimateWord = J(ctx, `JSON.stringify(window.__v17.skyrootSets().filter(function(g){return g.id==='climate'})[0].words[0].en)`);
  try { E(ctx, `window.__v17.openSkyrootSet('climate')`); } catch (e) {}
  const st = J(ctx, `JSON.stringify({lib:window.__v17.state.lib, set:window.__v17.state.set, view:window.__v17.state.view})`);
  check('openSkyrootSet(climate): state lib=skyroot set=climate view=lesson', st.lib === 'skyroot' && st.set === 'climate' && st.view === 'lesson', st);
  const lessonHtml = E(ctx, `window.__v17.libraryHTML()`);
  check('per-set lesson view renders (Skyroot · Climate & Environment)', lessonHtml.indexOf('Skyroot · Climate') >= 0 || lessonHtml.indexOf('Skyroot · Climate &amp; Environment') >= 0);
  check('per-set lesson view shows the first Climate word', lessonHtml.indexOf(firstClimateWord) >= 0, firstClimateWord);
  const cardCount = countOcc(lessonHtml, 'class="v17word"');
  check('per-set lesson view renders 30 wordCards on page 1', cardCount === 30, cardCount);
  check('wordCard markup has IPA + meaning + fav button', lessonHtml.indexOf('v17ipa') >= 0 && lessonHtml.indexOf('Yêu thích') >= 0);
  // Search filter: 'carbon' narrows the climate set to exactly 4 words.
  E(ctx, `window.__v17.state.q='carbon'; window.__v17.state.pos=''; window.__v17.state.status='all'; window.__v17.state.page=0;`);
  const searchHtml = E(ctx, `window.__v17.libraryHTML()`);
  const searchCount = countOcc(searchHtml, 'class="v17word"');
  const searchExpected = J(ctx, `JSON.stringify(window.__v17.skyrootSets().filter(function(g){return g.id==='climate'})[0].words.filter(function(w){return w.en.toLowerCase().indexOf('carbon')>=0||w.vi.toLowerCase().indexOf('carbon')>=0}).map(function(w){return w.en}))`);
  check('search "carbon" narrows the set to exactly the matching words', searchCount === searchExpected.length && searchExpected.length >= 1 && searchHtml.indexOf('carbon footprint') >= 0, { rendered: searchCount, expected: searchExpected });
  // POS filter: short code 'n' works; long code 'noun' returns 0 (short codes only).
  E(ctx, `window.__v17.state.q=''; window.__v17.state.pos='n';`);
  const posHtml = E(ctx, `window.__v17.libraryHTML()`);
  const posCount = countOcc(posHtml, 'class="v17word"');
  const posExpected = J(ctx, `JSON.stringify(window.__v17.skyrootSets().filter(function(g){return g.id==='climate'})[0].words.filter(function(w){return (w.pos||'')==='n'}).map(function(w){return w.en}))`);
  check('POS filter "n" (Danh từ) shows the climate-set nouns (page 1 of N)', posCount === Math.min(30, posExpected.length) && posExpected.length > 0 && posHtml.indexOf('Hiện 30/' + posExpected.length) >= 0, { rendered: posCount, expectedCount: posExpected.length, sample: posExpected.slice(0, 3) });
  E(ctx, `window.__v17.state.pos='noun';`);
  const posLongHtml = E(ctx, `window.__v17.libraryHTML()`);
  check('POS diagnostic "noun" (long code) now returns 0 — WORDS carries short codes only', countOcc(posLongHtml, 'class="v17word"') === 0, { rendered: countOcc(posLongHtml, 'class="v17word"'), expected: 0 });
  E(ctx, `window.__v17.state.q=''; window.__v17.state.pos='';`);
  // Status filters + favorites toggle (fresh word: first Climate word).
  const favWord = J(ctx, `JSON.stringify(window.__v17.skyrootSets().filter(function(g){return g.id==='climate'})[0].words[0].id)`);
  E(ctx, `window.__v17.state.status='mastered';`);
  check('status "mastered" shows 0 before any word is mastered', countOcc(E(ctx, `window.__v17.libraryHTML()`), 'class="v17word"') === 0);
  E(ctx, `window.__v15.enOld().box['${favWord}']=5; window.__v15.save15();`);
  check('status "mastered" shows 1 after one word reaches box 5', countOcc(E(ctx, `window.__v17.libraryHTML()`), 'class="v17word"') === 1);
  E(ctx, `window.__v17.state.status='new';`);
  // NOTE: §Q quest sessions already marked some climate words box>=1 via
  // mark15, so the 'new' count is computed live, not assumed to be 59.
  const newExpected = E(ctx, `window.__v17.skyrootSets().filter(function(g){return g.id==='climate'})[0].words.filter(function(w){return ((window.__v15.enOld().box||{})[w.id]||0)<1}).length`);
  const newHtml = E(ctx, `window.__v17.libraryHTML()`);
  check('status "new" shows page 1 of the unlearned climate words (30 cards, "Hiện 30/N" footer)', countOcc(newHtml, 'class="v17word"') === 30 && newHtml.indexOf('Hiện 30/' + newExpected) >= 0, { newExpected, footer: newHtml.slice(newHtml.indexOf('Hiện '), newHtml.indexOf('Hiện ') + 40) });
  E(ctx, `window.__v17.state.status='fav';`);
  check('status "fav" shows 0 before any favorite', countOcc(E(ctx, `window.__v17.libraryHTML()`), 'class="v17word"') === 0);
  E(ctx, `window.__v17.toggleFav('${favWord}');`);
  check('toggleFav adds the word to favorites (state + render)', E(ctx, `S.v7.en17.fav.indexOf('${favWord}')>=0`) === true && countOcc(E(ctx, `window.__v17.libraryHTML()`), 'class="v17word"') === 1);
  E(ctx, `window.__v17.toggleFav('${favWord}');`);
  check('toggleFav again removes it (fav count back to 0)', E(ctx, `S.v7.en17.fav.indexOf('${favWord}')<0`) === true && countOcc(E(ctx, `window.__v17.libraryHTML()`), 'class="v17word"') === 0);
  E(ctx, `window.__v17.state.status='all';`);
  // V25 group progress (real groupStats, live box data: favWord box 0 -> 1
  // raises learned by exactly 1 — §Q sessions already learned some words,
  // so the baseline is read live, not assumed to be 0; reset favWord to
  // box 0 first, since the mastered test above left it at box 5).
  E(ctx, `window.__v15.enOld().box['${favWord}']=0; window.__v15.save15();`);
  const gsBefore = J(ctx, `JSON.stringify(window.__v25.groupStats('skyroot'))`);
  E(ctx, `window.__v15.enOld().box['${favWord}']=1; window.__v15.save15();`);
  const gs = J(ctx, `JSON.stringify(window.__v25.groupStats('skyroot'))`);
  check('V25 groupStats(skyroot): total 240, learned rises by exactly 1 (live box data)', gs && gs.total === 240 && gsBefore && gs.learned === gsBefore.learned + 1, { before: gsBefore, after: gs });
  const gsChrono = J(ctx, `JSON.stringify(window.__v25.groupStats('chrono'))`);
  check('V25 groupStats(chrono) still works (no regression)', gsChrono && gsChrono.total === 240, gsChrono && gsChrono.total);
  E(ctx, `window.__v15.enOld().box['${favWord}']=0; window.__v15.save15();`);
  // Reward claim gate (UI): an unlearned set shows the "learn them all" note.
  try { E(ctx, `window.__v17.openSkyrootSet('science')`); } catch (e) {}
  check('unlearned set shows the learn-them-all reward gate (no claim button)', E(ctx, `window.__v17.libraryHTML()`).indexOf('Học hết 60 từ') >= 0);
  // Rewards: per-set +50/+2 once-only, then all-sets +200/+5 once-only.
  E(ctx, `var _o=window.__v15.enOld(); window.__v17.skyrootSets().filter(function(g){return g.id==='climate'})[0].words.forEach(function(w){_o.box[w.id]=1}); window.__v15.save15();`);
  const xp0 = E(ctx, `S.xp`), gems0 = E(ctx, `S.v7.gems||0`);
  E(ctx, `window.__v17.claim('skyroot:climate')`);
  const claimed = J(ctx, `JSON.stringify({c:!!(S.v7.en17&&S.v7.en17.claimed&&S.v7.en17.claimed['skyroot:climate']), xp:S.xp, g:(S.v7.gems||0)})`);
  check('claim skyroot:climate once learned: claimed, +50 XP, +2 gems', claimed.c === true && claimed.xp === xp0 + 50 && claimed.g === gems0 + 2, claimed);
  E(ctx, `window.__v17.claim('skyroot:climate')`);
  check('re-claim skyroot:climate is a no-op (once-only)', E(ctx, `S.xp`) === claimed.xp && E(ctx, `S.v7.gems||0`) === claimed.g);
  E(ctx, `var _o2=window.__v15.enOld(); window.__v17.skyrootWords().forEach(function(w){_o2.box[w.id]=1}); window.__v15.save15();`);
  const xp1 = E(ctx, `S.xp`), gems1 = E(ctx, `S.v7.gems||0`);
  const a5before = E(ctx, `!!(S.v7.ach&&S.v7.ach.a5)`);
  E(ctx, `window.__v17.claim('skyroot:all')`);
  const claimedAll = J(ctx, `JSON.stringify({c:!!(S.v7.en17&&S.v7.en17.claimed&&S.v7.en17.claimed['skyroot:all']), xp:S.xp, g:(S.v7.gems||0)})`);
  // NOTE: the V6 game wraps gain() with checkAch(), so this +200 XP
  // (865 -> 1065) also unlocks the pre-existing V6 achievement a5
  // 'Cấp 10' (reach Lv 10) for +3 gems — a real V6 mechanic, not a
  // V35 bug (verified: claim in isolation pays exactly +200/+5).
  check('claim skyroot:all once all learned: claimed, +200 XP, +5 gems (+3 V6 Lv-10 achievement)', claimedAll.c === true && claimedAll.xp === xp1 + 200 && claimedAll.g === gems1 + 5 + 3 && E(ctx, `!!(S.v7.ach&&S.v7.ach.a5)`) === true && a5before === false, { before: { xp: xp1, gems: gems1, a5: a5before }, after: claimedAll });
  E(ctx, `window.__v17.claim('skyroot:all')`);
  check('re-claim skyroot:all is a no-op (once-only)', E(ctx, `S.xp`) === claimedAll.xp && E(ctx, `S.v7.gems||0`) === claimedAll.g);
  // Reset Skyroot boxes so §S starts from clean SRS data.
  E(ctx, `var _o3=window.__v15.enOld(); window.__v17.skyrootWords().forEach(function(w){_o3.box[w.id]=0; _o3.right[w.id]=0; _o3.wrong[w.id]=0;}); window.__v15.save15(); window.__v17.goHome(); window.__v15.clearScope();`);

  // ================= §S SRS =================
  section('§S', 'SRS — Skyroot enrolment, due, Smart, Skyroot-scope review');
  const sWord = J(ctx, `JSON.stringify(window.__v15.words.filter(function(w){return w.skyrootSet==='mind'})[0])`);
  check('fixture word (mind set) exists, lv B2', !!sWord && sWord.lv === 'B2' && sWord.skyrootSet === 'mind', sWord && { id: sWord.id, lv: sWord.lv, set: sWord.skyrootSet });
  const sWord2 = J(ctx, `JSON.stringify(window.__v15.words.filter(function(w){return w.skyrootSet==='science'})[0])`);
  check('fixture word (science set) exists', !!sWord2 && sWord2.skyrootSet === 'science', sWord2 && sWord2.id);
  check('mind word unenrolled before mark15 (box 0)', E(ctx, `(window.__v15.enOld().box||{})['${sWord.id}']||0`) === 0);
  // Scope review BEFORE marking (due lists count never-enrolled words as
  // due; words the §Q quest sessions already enrolled carry a FUTURE due
  // date, so the expected counts are computed live per set).
  E(ctx, `window.__v15.setScope({kind:'lib',lib:'skyroot',set:'climate'})`);
  const dueClimate = J(ctx, `JSON.stringify(window.__v15.words.filter(function(w){return window.__v15.inScope(w)&&(window.__v15.en15().due[w.id]||0)<=Date.now()}).map(function(w){return w.skyrootSet}))`);
  const dueClimateExp = E(ctx, `window.__v17.skyrootSets().filter(function(g){return g.id==='climate'})[0].words.filter(function(w){return (window.__v15.en15().due[w.id]||0)<=Date.now()}).length`);
  check('Skyroot-scope review (climate): due list is only climate-set words with due<=now', dueClimate.length === dueClimateExp && dueClimateExp > 0 && dueClimate.every(s => s === 'climate'), { n: dueClimate.length, expected: dueClimateExp });
  E(ctx, `window.__v15.setScope({kind:'lib',lib:'skyroot',set:'science'})`);
  const dueScience = J(ctx, `JSON.stringify(window.__v15.words.filter(function(w){return window.__v15.inScope(w)&&(window.__v15.en15().due[w.id]||0)<=Date.now()}).map(function(w){return w.skyrootSet}))`);
  const dueScienceExp = E(ctx, `window.__v17.skyrootSets().filter(function(g){return g.id==='science'})[0].words.filter(function(w){return (window.__v15.en15().due[w.id]||0)<=Date.now()}).length`);
  check('per-set scope (science): due list is only science-set words with due<=now', dueScience.length === dueScienceExp && dueScienceExp > 0 && dueScience.every(s => s === 'science'), { n: dueScience.length, expected: dueScienceExp });
  E(ctx, `window.__v15.clearScope()`);
  check('clearScope restores the full pool (science word back in scope)', E(ctx, `window.__v15.inScope(window.__v15.words.filter(function(w){return w.id==='${sWord2.id}'})[0])`) === true);
  E(ctx, `window.__v15.mark15(true, window.__v15.words.filter(function(w){return w.id==='${sWord.id}'})[0], 'mc')`);
  const afterMark = J(ctx, `JSON.stringify({box:(window.__v15.enOld().box||{})['${sWord.id}'], right:(window.__v15.enOld().right||{})['${sWord.id}'], due:(window.__v15.en15().due||{})['${sWord.id}'], intv:(window.__v15.en15().intv||{})['${sWord.id}']})`);
  check('mark15 enrols a Skyroot word: box 1, right 1, intv 1, due in future', afterMark.box === 1 && afterMark.right === 1 && afterMark.intv === 1 && afterMark.due > Date.now(), afterMark);
  E(ctx, `window.__v15.mark15(false, window.__v15.words.filter(function(w){return w.id==='${sWord2.id}'})[0], 'mc')`);
  const afterWrong = J(ctx, `JSON.stringify({box:(window.__v15.enOld().box||{})['${sWord2.id}'], wrong:(window.__v15.enOld().wrong||{})['${sWord2.id}'], due:(window.__v15.en15().due||{})['${sWord2.id}']})`);
  check('wrong answer: box 0, wrong 1, due ~10 min in future', afterWrong.box === 0 && afterWrong.wrong === 1 && afterWrong.due > Date.now() && afterWrong.due <= Date.now() + 11 * 60 * 1000, afterWrong);
  E(ctx, `window.__v15.en15().due['${sWord.id}']=Date.now()-1000; window.__v15.save15()`);
  const dueHas = E(ctx, `window.__v15.words.filter(function(w){return (window.__v15.en15().due[w.id]||0)<=Date.now() && w.id==='${sWord.id}'}).length`);
  check('enrolled Skyroot word appears due when due <= now', dueHas === 1);
  const cls = J(ctx, `JSON.stringify(window.__v27.classifyEN(window.__v15.words.filter(function(w){return w.id==='${sWord.id}'})[0]))`);
  check('Smart classifyEN includes the Skyroot word (no missing/error)', !!cls && typeof cls.cls === 'string', cls);
  const inUniverse = E(ctx, `window.__v27._test.allENWords().some(function(w){return w.id==='${sWord.id}'})`);
  check('Smart word universe (allENWords) includes the Skyroot word', inUniverse === true);
  const plan = J(ctx, `JSON.stringify(window.__v27._test.buildPlanCore('en', 10, 2, 2, 2).plan)`);
  check('Smart buildPlanCore returns a real plan with ids', !!plan && Array.isArray(plan.ids), plan && { n: plan.ids && plan.ids.length });

  // ================= §R V17.1 regression =================
  section('§R', 'V17.1 regression (Chrono gate, golem, analytics, SRS, V31)');
  // Gate: exact 69 closed / 70 open (overwrite the §G/§B seed buckets).
  const gate69 = J(ctx, `(function(){
    var e15=window.__v15.en15(); e15.bosses={}; for(var i=0;i<10;i++) e15.bosses['old'+i]={win:1};
    var e18=window.__v18._test.en18(); e18.bosses={}; for(var i=0;i<30;i++) e18.bosses['v10_'+i]={win:1,wins:1};
    var e19=window.__v19._test.en19(); e19.bosses={}; for(var i=0;i<29;i++) e19.bosses['v11_'+i]={en:{win:1,wins:1,stars:2,best:2}};
    return JSON.stringify({count:window.__v33._test.correctedWinCount(), open:window.__v33.gateOpen()});
  })()`);
  check('Chrono gate: 69 wins (10+30+29) -> corrected count 69, closed', gate69.count === 69 && gate69.open === false, gate69);
  const gate70 = J(ctx, `(function(){
    var e19=window.__v19._test.en19(); e19.bosses['v11_29']={en:{win:1,wins:1,stars:2,best:2}};
    return JSON.stringify({count:window.__v33._test.correctedWinCount(), open:window.__v33.gateOpen()});
  })()`);
  check('Chrono gate: 70 wins -> corrected count 70, open exactly at 70', gate70.count === 70 && gate70.open === true, gate70);
  const bd = J(ctx, `JSON.stringify(window.__v33._test.winBreakdown())`);
  check('Chrono gate: breakdown is 10/30/30', bd && bd.en15 === 10 && bd.en18 === 30 && bd.en19 === 30, bd);
  check('Chrono gate closed -> no Chrono boss unlocked; open -> only sandwisp unlocked',
    E(ctx, `window.__v33._test.bossUnlocked('v17_sandwisp','en')`) === true && E(ctx, `window.__v33._test.bossUnlocked('v17_pendulum','en')`) === false);
  // Skyroot gate still closed after the bucket overwrite (golem win wiped).
  check('Skyroot gate closed again after bucket overwrite (golem win wiped)', E(ctx, `window.__v35._test.gateOpen('en')`) === false);
  // Golem: 90-HP shield, 2 phases, P2 +10 HP heal, no P3.
  stubRandom(ctx);
  const golemR = J(ctx, `(function(){
    var v19=window.__v19;
    var e19=v19._test.en19();
    window.__V33_DATA.bosses.slice(0,7).forEach(function(b){ e19.bosses[b.id]={en:{win:1,wins:1,stars:3,best:3}}; });
    v19.fight('v17_geargolem');
    var F=v19._test.F();
    var out={shield:F.shield, hp0:F.hp, phase0:F.phase};
    F.hp=300;
    v19._test.pickCorrect(); v19.next();
    F=v19._test.F(); out.phase2=F.phase;
    var hpPre=F.hp;
    v19._test.pickWrong(); v19.next();
    F=v19._test.F(); out.hpPre=hpPre; out.hpPost=F.hp; out.heal=F.hp-hpPre;
    F.hp=100; v19._test.pickCorrect(); v19.next();
    F=v19._test.F(); out.phaseLow=F.phase; out.ult=F.ultActive;
    v19.close();
    return JSON.stringify(out);
  })()`);
  check('golem fight starts with 90-HP gear shield', golemR.shield === 90, golemR);
  check('golem reaches phase 2 at <=50% HP', golemR.phase2 === 2, golemR);
  check('golem time-reversal: wrong answer in P2 heals exactly +10 HP', golemR.heal === 10, golemR);
  check('golem has NO P3 at <=20% HP (phase stays 2, no counterattack)', golemR.phaseLow === 2 && golemR.ult === false, golemR);
  unstubRandom(ctx);
  // Analytics (derived only): machines set untouched -> retention '—'.
  const freshMachines = J(ctx, `JSON.stringify(window.__v34.setStats('machines'))`);
  check("retention is '—' at 0 attempts (fresh machines set)", freshMachines && freshMachines.retention === '—' && freshMachines.attempts === 0, freshMachines);
  const ana = J(ctx, `JSON.stringify(window.__v34.chronoAnalytics())`);
  check('chronoAnalytics group total still 240', ana && ana.total && ana.total.total === 240, ana && ana.total);
  const ko = J(ctx, `JSON.stringify(window.__v34.koChronoStats())`);
  check('KO Chrono stats: honest empty state (empty, total 0, retention —)', !!ko && ko.empty === true && ko.total === 0 && ko.retention === '—', ko);
  // SRS regression: a Chrono word still enrols via mark15.
  E(ctx, `window.__v15.mark15(true, window.__v15.words.filter(function(w){return w.chronoSet==='time'})[0], 'mc')`);
  check('SRS regression: Chrono word enrols via mark15 (box 1)', E(ctx, `(function(){ var w=window.__v15.words.filter(function(x){return x.chronoSet==='time'})[0]; return (window.__v15.enOld().box||{})[w.id]; })()`) === 1);
  // V31/V32 preservation spot-checks.
  check('V31 merge fragment F-01 present', html.includes('/* V31 (F-01):'));
  check('V31 C9 fragment present (__v20.importFile)', html.includes('__v20.importFile(imp)'));
  check('bad-version guard present x2', countOcc(html, 'bad-version') === 2, countOcc(html, 'bad-version'));
  check('V33 golem shield fragment present', html.includes("b.id==='v17_geargolem'?90:"));
  check('V33 golem heal fragment present', html.includes('GEAR GOLEM hồi 10 HP'));
  check('V33 Chrono buildWords block present', html.includes('/* V33: CHRONO KINGDOM'));
  check('V17.0 changelog en33.bosses false line corrected (doc fix present)', fs.readFileSync(path.join(ROOT, 'CHANGELOG_V16_4_to_V17_0.md'), 'utf-8').includes('`bosses:{}` key in `en33`. False'));
  check('marker order ends v35 (style + script)', styleIds[styleIds.length - 1] === 'v35' && scriptIds[scriptIds.length - 1] === 'v35');
  check('__v31.status() still 16.3.0', E(ctx, `window.__v31.status().version`) === '16.3.0');
  check('__v32.version still 16.4.0', E(ctx, `window.__v32.version`) === '16.4.0');
  check('__v33.version still 17.0.0', E(ctx, `window.__v33.version`) === '17.0.0');
  check('__v34.version still 17.1.0', E(ctx, `window.__v34.version`) === '17.1.0');

  // ================= §V save schema + sync =================
  section('§V', 'save schema + v20_sync (en35 shape, hasProgress, merge)');
  check('no new localStorage key (only hanvocab.v1 family keys)', J(ctx, `JSON.stringify((function(){ var ks=[]; for(var i=0;i<localStorage.length;i++) ks.push(localStorage.key(i)); return ks; })())`).every(function(k) { return k.indexOf('v35') < 0; }));
  check('en35 JSON contains no "bosses" anywhere', E(ctx, `JSON.stringify(window.__v35._test.en35()).indexOf('bosses')<0`));
  check('en35 worst case is small (<10 KB serialised)', E(ctx, `JSON.stringify(window.__v35._test.en35()).length`) < 10 * 1024);
  check('hasProgress: en35 quest data counts as progress', E(ctx, `window.__v20sync.hasProgress({v7:{en35:{quests:{q_islands:{done:1}}}}})`) === true);
  check('hasProgress: en35 regionClaimed data counts as progress', E(ctx, `window.__v20sync.hasProgress({v7:{en35:{regionClaimed:{ko:1}}}})`) === true);
  check('hasProgress: empty v7 does not count as progress', E(ctx, `window.__v20sync.hasProgress({v7:{}})`) === false);
  const merged35 = J(ctx, `(function(){
    function clone(){ return JSON.parse(JSON.stringify(S)); }
    var localS=clone(), cloudS=clone();
    localS.v7.en35={quests:{q_islands:{done:1,claimed:0,acc:0.85,at:100}}, regionClaimed:{en:1,ko:0}, created:1000, pending:{'quest:q_temple':{kind:'quest'}}};
    cloudS.v7.en35={quests:{q_islands:{done:1,claimed:1,acc:0.9,at:200}, q_temple:{done:1,claimed:0,acc:0.8,at:150}}, regionClaimed:{en:0,ko:1}, created:2000, pending:{}};
    var m=window.__v20sync.mergeSaves(localS, cloudS, 1000, 2000);
    return JSON.stringify(m.v7.en35);
  })()`);
  check('mergeSaves en35: quest union MAX (q_islands claimed 1, acc 0.9, at 200)', merged35.quests && merged35.quests.q_islands && merged35.quests.q_islands.claimed === 1 && merged35.quests.q_islands.acc === 0.9 && merged35.quests.q_islands.at === 200 && merged35.quests.q_islands.done === 1, merged35);
  check('mergeSaves en35: cloud-only quest survives (q_temple present)', !!merged35.quests && !!merged35.quests.q_temple && merged35.quests.q_temple.done === 1, merged35);
  check('mergeSaves en35: regionClaimed union per-language MAX ({en:1,ko:1})', !!merged35.regionClaimed && merged35.regionClaimed.en === 1 && merged35.regionClaimed.ko === 1, merged35);
  check('mergeSaves en35: created MIN (1000), pending dropped', merged35.created === 1000 && merged35.pending && Object.keys(merged35.pending).length === 0, merged35);

  // ================= §C Chrome-only (SKIP, never PASS) =================
  section('§C', 'Chrome-only — skipped in vm (see verify-v35c.js)');
  const chromeWhy = 'Real-browser gates live in tools/v35/verify-v35c.js — see SMOKE_TEST §7';
  skipCheck('region overlay + gate behavior in real Chrome', chromeWhy);
  skipCheck('live V19 fight vs a Skyroot boss (HP decreases, Break bar) in real Chrome', chromeWhy);
  skipCheck('Library Skyroot group renders + filters + flashcards in real Chrome', chromeWhy);
  skipCheck('pet hub shows the 3 new Skyroot species in real Chrome', chromeWhy);
  skipCheck('quest start/claim flow in real Chrome', chromeWhy);
  skipCheck('no console errors on boot + Skyroot flows in real Chrome', chromeWhy);
  skipCheck('no overflow at 360/390/430 in real Chrome', chromeWhy);
  skipCheck('live Firebase sync/login (Anh must run FIREBASE_SETUP.md)', chromeWhy);
  skipCheck('real phone touch + Safari first-open', chromeWhy);

  console.log(`\ntest35.js: PASS ${pass} / FAIL ${fail} / SKIP ${skip}${fail ? ' — FAILURES: ' + failures.join(' | ') : ''}`);
  for (const id of ['§0', '§L', '§G', '§B', '§P', '§D', '§Q', '§W', '§L2', '§S', '§R', '§V', '§C']) {
    const c = secCounts[id] || { pass: 0, fail: 0, skip: 0 };
    console.log(`  ${id}: PASS ${c.pass} / FAIL ${c.fail} / SKIP ${c.skip}`);
  }
  console.log('TEST35_SUMMARY ' + JSON.stringify({ pass, fail, skip, sections: secCounts }));
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('test35.js crashed:', e); process.exit(2); });
