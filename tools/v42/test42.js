// test42.js - V18.7 UNLOCK SHORTCUTS independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v41/test41.js (same lines 34-191); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V18.7 build.
// Usage: node tools/v42/test42.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V42 fragments,
//         gate integration call sites, 'Không có đường tắt' gone, V41 spots)
//   section L page load (vm, real inline scripts) + __v42 + exports
//   section 42A skyrootTarget (viaChrono fallback / GEAR GOLEM next /
//         4th Chrono boss in KO / null when all 8 won)
//   section 42B chronoTarget (fresh EN+KO / KO never old / V19 won-in-EN
//         never re-offered / Elemental+Legendary never while locked / null)
//   section 42C gate HTML (locked buttons name the real target, 14/70;
//         gate open -> ''; null target -> <p> only, no button)
//   section 42D go routing (stubbed __v33/__v35/__v18/__v19/__v15 +
//         document stub: viaChrono never __v33.fightBoss; direct calls
//         closeSkyroot -> setLang -> fightBoss; v18/v19/old launch paths;
//         null target pops honestly and returns false)
//   section 42R V18.6 regression (V41 fragments + ko16 merge behaviour)
//   section V save schema (no en42 key, no new localStorage key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/touch/speech; the
// gate HTML is asserted on the returned string, not painted pixels);
// the painted shortcut button, the real click into a fight, the
// 360px button metrics, the GEAR GOLEM win + unlock, and the return
// path after a fight are Chrome gates (verify-v42c.js), not asserted
// here; live-browser, real-phone and live-Firebase gates stay
// Chrome/Anh-only. Target expectations below were verified against the
// REAL boss data (probe42b): v10_slime lv1, v10_ghost lv4, v10_unicorn
// lv11, v11_lavadragon lv32, v17_mantis lv64, v17_geargolem lv68 —
// never the fabricated 'v18_king' id from the fix worker's stub harness.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = '9d4a113b72898718c3f1fbb184652a90a58b86a1696353117afadd7f239a9dd2';
const EXPECTED_BYTES = 2412801;
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


// ================= §0 static: build integrity =================
async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v42.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V18.7 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is the V18.7 size', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('title is V18.7 Unlock Shortcuts', html.includes('<title>Korean &amp; English Vocab Farm V18.7 — Unlock Shortcuts'));
  check('__v42 + 18.7.0 present', html.includes('window.__v42') && html.includes("VERSION='18.7.0'"));
  check('__v33–__v41 + 17.0.0/17.1.0/18.0.0/18.1.0/18.2.0/18.3.0/18.4.0/18.5.0/18.6.0 still present', html.includes('window.__v33') && html.includes('window.__v34') && html.includes('window.__v35') && html.includes('window.__v36') && html.includes('window.__v37') && html.includes('window.__v38') && html.includes('window.__v39') && html.includes('window.__v40') && html.includes('window.__v41') && html.includes("VERSION='17.0.0'") && html.includes("VERSION='17.1.0'") && html.includes("VERSION='18.0.0'") && html.includes("VERSION='18.1.0'") && html.includes("VERSION='18.2.0'") && html.includes("VERSION='18.3.0'") && html.includes("VERSION='18.4.0'") && html.includes("VERSION='18.5.0'") && html.includes("VERSION='18.6.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0', '18.6.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v42', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v42', styleIds.join(','));
  check('script markers end v42', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v42', scriptIds.join(','));
  check('v42js after v41js', html.indexOf('id="v42js"') > html.indexOf('id="v41js"'));
  check("no 'Không có đường tắt' text remaining in the built index.html", !html.includes('Không có đường tắt'));
  // V42 layer fragments (one per behaviour).
  check('V42 export object present', html.includes('window.__v42={'));
  check('V42 skyrootTarget definition present', html.includes('function skyrootTarget(lang){'));
  check('V42 chronoTarget definition present', html.includes('function chronoTarget(lang){'));
  check('V42 viaChrono fallback present (flagged viaChrono:true)', html.includes('viaChrono:true'));
  check('V42 fallback comment present (src/out agree)', html.includes('skyrootTarget now falls back to chronoTarget(lang)'));
  check('V42 shared pool launcher present (launchChronoTarget)', html.includes('function launchChronoTarget(lang,target){'));
  check('V42 v18 host guard present (#v15body -> openHub bosses)', html.includes("if(!document.querySelector('#v15body')"));
  check('V42 old host guard present (#v15bossfight -> openHub bosses)', html.includes("if(!document.querySelector('#v15bossfight')"));
  check('V42 goSkyroot onclick wired x3 (2 gate branches + 1 golem branch)', countOcc(html, 'window.__v42.goSkyroot(') === 3);
  check('V42 goChrono onclick wired x1', countOcc(html, 'window.__v42.goChrono(') === 1);
  check('V42 Skyroot gate integrated into the v35 overlay (1 call site)', countOcc(html, 'window.__v42?window.__v42.skyrootGateHTML(lang,gate)') === 1);
  check('V42 Chrono gate integrated into the v33 overlay (1 call site)', countOcc(html, 'window.__v42?window.__v42.chronoGateHTML(lang,gate)') === 1);
  check('V42 viaChrono button copy present', html.includes('mở đường tới GEAR GOLEM'));
  check('V42 honest null text present (Skyroot)', html.includes('Không tìm thấy boss nào có thể đánh ngay'));
  check('V42 honest null text present (Chrono)', html.includes('Không còn boss nào có thể đánh ngay'));
  // V41 fragments that survive (spot-checks, one per fix group).
  check('R-V41 CA gate present x4 (answer + pick + pickCorrect + pickWrong)', countOcc(html, "indexOf('ca-')===0") === 4);
  check('R-V41 resolveUltimate clamp present', html.includes('Math.min(3,F.caRight)'));
  check('R-V41 load() opt default present', html.includes("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}"));
  check('R-V41 importFile pre-snapshot flush present (try{ flush(); } x2)', countOcc(html, 'try{ flush(); }catch(e){}') === 2);
  check('R-V41 backupImport pre-snapshot flush present (__v20.flush guard x6)', countOcc(html, "try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") === 6);
  check('R-V40 ko16 branch survives', html.includes("else if(kk==='ko16'){") && html.includes('m16k.levels=maxMap(l16k.levels, c16k.levels);'));
  check('R-V40 plan merge survives', html.includes('m27.plan=mp;'));
  check('legDiff deliberately UNCHANGED (decision-blocked)', html.includes("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}"));

  // ================= §L page load (vm, real inline scripts) =================
  section('§L', 'page load (vm, real inline scripts)');
  const ctx = makeCtx();
  dynIds.add('v15body');
  dynIds.add('v27body');
  dynIds.add('v19zonedetail');
  dynIds.add('v18fight');
  dynIds.add('v19fight');
  dynIds.add('v18colldetail');
  dynIds.add('v22bs-lib');
  dynIds.add('v22bs-type');
  dynIds.add('v22bs-status');
  dynIds.add('v15plots');
  const btPath = fs.existsSync(path.join(DIR, 'basic_tactics_vocabulary.json')) ? path.join(DIR, 'basic_tactics_vocabulary.json') : path.join(ROOT, 'out', 'basic_tactics_vocabulary.json');
  const btJson = fs.readFileSync(btPath, 'utf-8');
  ctx.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(btJson) });
  ctx.FileReader = class FileReaderStub {
    constructor() { this.result = null; this.onload = null; }
    readAsText(f) { this.result = typeof f === 'string' ? f : (f && f.__text) || ''; if (this.onload) this.onload(); }
  };
  ctx.confirm = () => true;
  ctx.alert = () => {};
  const loaded = loadPage(ctx, html);
  check('inline script blocks extracted (>=30)', loaded.blocks >= 30, loaded.blocks);
  check('all inline scripts evaluate without error', loaded.loadErr === null, loaded.loadErr);
  if (loaded.loadErr) { console.log(`\ntest42 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15/__v33/__v35/__v42 present',
    E(ctx, `!!window.__v15 && !!window.__v33 && !!window.__v35 && !!window.__v42`));
  check('__v42.version is 18.7.0', E(ctx, `window.__v42.version`) === '18.7.0');
  check('__v42 exports all six functions',
    E(ctx, `['skyrootTarget','chronoTarget','skyrootGateHTML','chronoGateHTML','goSkyroot','goChrono'].every(function(f){ return typeof window.__v42[f]==='function'; })`));
  check('__v42._test exposes the Chrono sequence + GOLEM id',
    E(ctx, `JSON.stringify(window.__v42._test.CHRONO_IDS)`) === JSON.stringify(['v17_sandwisp', 'v17_pendulum', 'v17_specter', 'v17_mantis', 'v17_hound', 'v17_oracle', 'v17_titan', 'v17_geargolem']) && E(ctx, `window.__v42._test.GOLEM_ID`) === 'v17_geargolem');
  E(ctx, `window.__v15.buildWords()`);
  const nWords = E(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);

  // ---- shared seed helpers on the main ctx (real layers, seeded saves) ----
  E(ctx, `(function(){
    window.__T42_RESET=function(){ window.__v15.en15().bosses={}; window.__v18.en18().bosses={}; window.__v19.en19().bosses={}; };
    window.__T42_WINOLD=function(id){ window.__v15.en15().bosses[id]={win:1,wins:1,at:Date.now()}; };
    window.__T42_WIN18=function(id){ window.__v18.en18().bosses[id]={win:1,wins:1,at:Date.now(),item:'x'}; };
    window.__T42_WIN19=function(id,lang){ var e=window.__v19.en19(); e.bosses[id]=e.bosses[id]||{}; e.bosses[id][lang]={win:1,wins:1,stars:3}; };
    window.__T42_SEED13=function(){ window.__T42_RESET(); (window.__V18_BOSSES.old||[]).forEach(function(b){window.__T42_WINOLD(b.id)}); (window.__V18_BOSSES.en||[]).slice(0,3).forEach(function(b){window.__T42_WIN18(b.id)}); };
    window.__T42_SEED70=function(){ window.__T42_RESET(); (window.__V18_BOSSES.old||[]).forEach(function(b){window.__T42_WINOLD(b.id)}); ['en','el','leg'].forEach(function(ar){(window.__V18_BOSSES[ar]||[]).forEach(function(b){window.__T42_WIN18(b.id)})}); (window.__V19_DATA.bosses||[]).forEach(function(b){window.__T42_WIN19(b.id,'en')}); };
    window.__T42_WINALL18=function(){ ['en','el','leg'].forEach(function(ar){(window.__V18_BOSSES[ar]||[]).forEach(function(b){window.__T42_WIN18(b.id)})}); };
    window.__T42_WINALLOLD=function(){ (window.__V18_BOSSES.old||[]).forEach(function(b){window.__T42_WINOLD(b.id)}); };
  })()`);
  // Real id sets (membership proofs: a target must exist in the real data).
  const allIds = J(ctx, `JSON.stringify((window.__V18_BOSSES.old||[]).concat(window.__V18_BOSSES.en||[]).concat(window.__V18_BOSSES.el||[]).concat(window.__V18_BOSSES.leg||[]).concat(window.__V19_DATA.bosses||[]).concat(window.__V33_DATA.bosses||[]).map(function(b){return b.id}))`);
  const elIds = J(ctx, `JSON.stringify((window.__V18_BOSSES.el||[]).map(function(b){return b.id}))`);
  const legIds = J(ctx, `JSON.stringify((window.__V18_BOSSES.leg||[]).map(function(b){return b.id}))`);
  const en18Ids = J(ctx, `JSON.stringify((window.__V18_BOSSES.en||[]).map(function(b){return b.id}))`);
  check('real boss-data id union loaded (70 + 8 Chrono)', allIds.length === 78, allIds.length);

  // ================= §42A skyrootTarget =================
  section('§42A', 'skyrootTarget — Chrono sequence, viaChrono fallback, null');
  E(ctx, `window.__T42_SEED13()`);
  check('42A seed: correctedWinCount is 13 (10 old + 3 V18)', E(ctx, `window.__v33.correctedWinCount()`) === 13);
  const a13ko = J(ctx, `JSON.stringify(window.__v42.skyrootTarget('ko'))`);
  check('42A(a) gate closed, 0 Chrono wins, 13 total, KO -> viaChrono target (not null, viaChrono:true)', a13ko && a13ko.viaChrono === true && a13ko.id === 'v10_ghost' && a13ko.pool === 'v18' && a13ko.lv === 4, a13ko);
  check('42A(a) viaChrono target vi is the real boss name (Ma Thần Âm Thanh)', a13ko && a13ko.vi === 'Ma Thần Âm Thanh', a13ko);
  check('42A(a) viaChrono target id exists in the real boss data (never a fabricated id)', a13ko && allIds.indexOf(a13ko.id) >= 0, a13ko);
  const a13en = J(ctx, `JSON.stringify(window.__v42.skyrootTarget('en'))`);
  check('42A(a) same seed in EN -> same viaChrono target v10_ghost lv4', a13en && a13en.viaChrono === true && a13en.id === 'v10_ghost' && a13en.lv === 4, a13en);
  E(ctx, `window.__T42_SEED70(); ['v17_sandwisp','v17_pendulum','v17_specter','v17_mantis','v17_hound','v17_oracle','v17_titan'].forEach(function(id){window.__T42_WIN19(id,'en')});`);
  check('42A seed: Chrono gate open at >=70 wins', E(ctx, `window.__v33._test.gateOpen()`) === true);
  const aGolem = J(ctx, `JSON.stringify(window.__v42.skyrootTarget('en'))`);
  check('42A(b) gate open + first 7 Chrono won in EN -> target is GEAR GOLEM, isGolem true', aGolem && aGolem.id === 'v17_geargolem' && aGolem.isGolem === true && !aGolem.viaChrono, aGolem);
  check('42A(b) GEAR GOLEM vi is the real name (Golem Bánh Răng)', aGolem && aGolem.vi === 'Golem Bánh Răng', aGolem);
  check('42A(b) Skyroot still locked in EN until the golem is beaten', E(ctx, `window.__v35.gateOpen('en')`) === false);
  E(ctx, `window.__T42_SEED70(); ['v17_sandwisp','v17_pendulum','v17_specter'].forEach(function(id){window.__T42_WIN19(id,'ko')});`);
  const aMantis = J(ctx, `JSON.stringify(window.__v42.skyrootTarget('ko'))`);
  check('42A(c) first 3 Chrono won in KO, gate open -> target is the 4th Chrono boss (v17_mantis)', aMantis && aMantis.id === 'v17_mantis' && aMantis.isGolem === false && !aMantis.viaChrono, aMantis);
  check('42A(c) 4th boss vi is the real name (Bọ Ngựa Bánh Răng)', aMantis && aMantis.vi === 'Bọ Ngựa Bánh Răng', aMantis);
  E(ctx, `window.__T42_SEED70(); ['v17_sandwisp','v17_pendulum','v17_specter','v17_mantis','v17_hound','v17_oracle','v17_titan','v17_geargolem'].forEach(function(id){window.__T42_WIN19(id,'en')});`);
  check('42A(d) all 8 Chrono won in EN -> skyrootTarget(en) is null', E(ctx, `window.__v42.skyrootTarget('en')`) === null);
  const aKoStill = J(ctx, `JSON.stringify(window.__v42.skyrootTarget('ko'))`);
  check('42A(d) all 8 won in EN does NOT null out KO -> KO target is the 1st Chrono boss (sandwisp)', aKoStill && aKoStill.id === 'v17_sandwisp' && !aKoStill.viaChrono, aKoStill);

  // ================= §42B chronoTarget =================
  section('§42B', 'chronoTarget — easiest unwon, fightable boss of the 70');
  E(ctx, `window.__T42_RESET()`);
  const bFreshEn = J(ctx, `JSON.stringify(window.__v42.chronoTarget('en'))`);
  check('42B(a) fresh save EN -> lowest-lv fightable unwon boss is v10_slime lv1 (v18 wins the lv tie)', bFreshEn && bFreshEn.pool === 'v18' && bFreshEn.id === 'v10_slime' && bFreshEn.lv === 1 && bFreshEn.vi === 'Vua Slime Từ Vựng', bFreshEn);
  check('42B(a) fresh target id exists in the real boss data', bFreshEn && allIds.indexOf(bFreshEn.id) >= 0, bFreshEn);
  const bFreshKo = J(ctx, `JSON.stringify(window.__v42.chronoTarget('ko'))`);
  check('42B(b) KO mode on a fresh save never returns an old-pool boss (v10_slime, v18)', bFreshKo && bFreshKo.pool === 'v18' && bFreshKo.id === 'v10_slime', bFreshKo);
  E(ctx, `window.__T42_RESET(); (window.__V18_BOSSES.en||[]).forEach(function(b){window.__T42_WIN18(b.id)});`);
  const bKo10 = J(ctx, `JSON.stringify(window.__v42.chronoTarget('ko'))`);
  check('42B(b) KO with all 10 Challenge won + old unwon -> still never old (v10_unicorn lv11, v18)', bKo10 && bKo10.pool === 'v18' && bKo10.id === 'v10_unicorn' && bKo10.lv === 11, bKo10);
  E(ctx, `window.__T42_RESET(); window.__T42_WINALLOLD(); window.__T42_WINALL18(); window.__T42_WIN19('v11_fireking','en');`);
  check('42B(c) V19 boss won in EN is never returned for KO (fireking excluded -> null, not fireking)', E(ctx, `window.__v42.chronoTarget('ko')`) === null);
  E(ctx, `window.__T42_WIN19('v11_fireking','ko');`);
  const bC2 = J(ctx, `JSON.stringify(window.__v42.chronoTarget('ko'))`);
  check('42B(c) fireking won in EN+KO -> next v19 boss offered is lavadragon lv32, never fireking', bC2 && bC2.pool === 'v19' && bC2.id === 'v11_lavadragon' && bC2.lv === 32, bC2);
  E(ctx, `window.__T42_RESET()`);
  check('42B(d) fresh save: Elemental arena locked (<5 total wins)', E(ctx, `window.__v18.arenaOpen('el')`) === false);
  check('42B(d) fresh save: Legendary arena locked (<5 elemental wins)', E(ctx, `window.__v18.arenaOpen('leg')`) === false);
  const bFresh2 = J(ctx, `JSON.stringify(window.__v42.chronoTarget('en'))`);
  check('42B(d) fresh save: target is never an Elemental/Legendary boss', bFresh2 && elIds.indexOf(bFresh2.id) < 0 && legIds.indexOf(bFresh2.id) < 0, bFresh2);
  E(ctx, `['v10_slime','v10_goblin','v10_dragon','v10_ghost'].forEach(function(id){window.__T42_WIN18(id)});`);
  check('42B(d) 4 wins: Elemental still locked', E(ctx, `window.__v18.arenaOpen('el')`) === false);
  const b4win = J(ctx, `JSON.stringify(window.__v42.chronoTarget('en'))`);
  check('42B(d) 4 wins: target is old slime lv1, still never Elemental/Legendary', b4win && b4win.pool === 'old' && b4win.id === 'slime' && elIds.indexOf(b4win.id) < 0 && legIds.indexOf(b4win.id) < 0, b4win);
  E(ctx, `window.__T42_SEED70()`);
  check('42B(e) all 70 won -> chronoTarget(en) is null', E(ctx, `window.__v42.chronoTarget('en')`) === null);
  check('42B(e) all 70 won -> chronoTarget(ko) is null', E(ctx, `window.__v42.chronoTarget('ko')`) === null);

  // ================= §42C gate HTML =================
  section('§42C', 'gate HTML — real button naming the real target, honest null');
  E(ctx, `window.__T42_SEED13()`);
  const cSkyKo = E(ctx, `window.__v42.skyrootGateHTML('ko',false)`);
  check('42C locked Skyroot KO at 13 wins -> button present (.v42btn)', typeof cSkyKo === 'string' && cSkyKo.indexOf('<button') >= 0 && cSkyKo.indexOf('v42btn') >= 0, cSkyKo);
  check('42C locked Skyroot KO -> button names the viaChrono target (Ma Thần Âm Thanh)', typeof cSkyKo === 'string' && cSkyKo.indexOf('Ma Thần Âm Thanh') >= 0, cSkyKo);
  check("42C locked Skyroot KO -> button wires goSkyroot('ko')", typeof cSkyKo === 'string' && cSkyKo.indexOf("goSkyroot('ko')") >= 0, cSkyKo);
  check('42C locked Skyroot KO -> sub-line shows 14/70 and the GEAR GOLEM road', typeof cSkyKo === 'string' && cSkyKo.indexOf('14/70') >= 0 && cSkyKo.indexOf('mở đường tới GEAR GOLEM') >= 0, cSkyKo);
  const cChEn = E(ctx, `window.__v42.chronoGateHTML('en',false)`);
  check('42C locked Chrono EN at 13 wins -> button present (.v42btn)', typeof cChEn === 'string' && cChEn.indexOf('<button') >= 0 && cChEn.indexOf('v42btn') >= 0, cChEn);
  check('42C locked Chrono EN -> button names the chrono target (Ma Thần Âm Thanh)', typeof cChEn === 'string' && cChEn.indexOf('Ma Thần Âm Thanh') >= 0, cChEn);
  check("42C locked Chrono EN -> button wires goChrono('en') + sub-line 14/70", typeof cChEn === 'string' && cChEn.indexOf("goChrono('en')") >= 0 && cChEn.indexOf('14/70') >= 0, cChEn);
  E(ctx, `window.__T42_SEED70(); ['v17_sandwisp','v17_pendulum','v17_specter','v17_mantis','v17_hound','v17_oracle','v17_titan'].forEach(function(id){window.__T42_WIN19(id,'en')});`);
  const cGolem = E(ctx, `window.__v42.skyrootGateHTML('en',false)`);
  check('42C GEAR GOLEM is next -> button says "Đánh GEAR GOLEM ngay"', typeof cGolem === 'string' && cGolem.indexOf('Đánh GEAR GOLEM ngay') >= 0 && cGolem.indexOf('Thánh Địa Thiên Căn') >= 0, cGolem);
  check('42C gate open -> skyrootGateHTML returns empty string', E(ctx, `window.__v42.skyrootGateHTML('en',true)`) === '');
  check('42C gate open -> chronoGateHTML returns empty string', E(ctx, `window.__v42.chronoGateHTML('ko',true)`) === '');
  E(ctx, `window.__T42_SEED70(); ['v17_sandwisp','v17_pendulum','v17_specter','v17_mantis','v17_hound','v17_oracle','v17_titan','v17_geargolem'].forEach(function(id){window.__T42_WIN19(id,'en')});`);
  const cNullSky = E(ctx, `window.__v42.skyrootGateHTML('en',false)`);
  check('42C null-target Skyroot -> <p> only, no <button>', typeof cNullSky === 'string' && cNullSky.indexOf('<p') >= 0 && cNullSky.indexOf('<button') < 0 && cNullSky.indexOf('Không tìm thấy boss nào') >= 0, cNullSky);
  const cNullCh = E(ctx, `window.__v42.chronoGateHTML('en',false)`);
  check('42C null-target Chrono -> <p> only, no <button>', typeof cNullCh === 'string' && cNullCh.indexOf('<p') >= 0 && cNullCh.indexOf('<button') < 0 && cNullCh.indexOf('Không còn boss nào') >= 0, cNullCh);

  // ================= §42D go routing (stubbed layers) =================
  section('§42D', 'go routing — stubbed engines + document stub');
  const ctx2 = makeCtx();
  dynIds.add('v15body');
  dynIds.add('v18fight');
  dynIds.add('v19fight');
  dynIds.add('v15bossfight');
  const loaded2 = loadPage(ctx2, html);
  check('42D stub ctx: all inline scripts evaluate without error', loaded2.loadErr === null, loaded2.loadErr);
  fireDCL(ctx2);
  E(ctx2, `(function(){
    window.__T42_CALLS=[];
    window.__T42_CFG={count:0,en15bosses:{},en18bosses:{},
      v33unlocked:function(){return false},v33won:function(){return false},
      v18unlocked:function(){return false},v19wonAny:function(){return false},v19unlocked:function(){return false},
      fightBossRet:true};
    window.__T42_ABSENT={};
    var _dq=document.querySelector.bind(document);
    document.querySelector=function(sel){ if(window.__T42_ABSENT[sel]) return null; return _dq(sel); };
    function rec(name){ return function(){ var a=[].slice.call(arguments); window.__T42_CALLS.push([name].concat(a));
      if(name==='v18fight'||name==='v19fight'||name==='v15bossFight') return true;
      if(name==='v33fightBoss') return window.__T42_CFG.fightBossRet; }; }
    window.__v33={bossUnlocked:function(id,lang){return window.__T42_CFG.v33unlocked(id,lang)},
      isWon:function(id,lang){return window.__T42_CFG.v33won(id,lang)},
      correctedWinCount:function(){return window.__T42_CFG.count},
      setLang:rec('v33setLang'),fightBoss:rec('v33fightBoss'),closeChrono:rec('closeChrono')};
    window.__v35={closeSkyroot:rec('closeSkyroot'),setLang:rec('v35setLang')};
    window.__v18={en18:function(){return {bosses:window.__T42_CFG.en18bosses}},
      bossUnlocked:function(b){return window.__T42_CFG.v18unlocked(b.id)},fight:rec('v18fight')};
    window.__v19={isWonAny:function(id){return window.__T42_CFG.v19wonAny(id)},
      bossUnlocked:function(id,lang){return window.__T42_CFG.v19unlocked(id,lang)},
      setLang:rec('v19setLang'),fight:rec('v19fight')};
    window.__v15={en15:function(){return {bosses:window.__T42_CFG.en15bosses}},
      openHub:rec('openHub'),bossFight:rec('v15bossFight'),pop15:rec('pop15')};
  })()`);
  function calls2() { return J(ctx2, `JSON.stringify(window.__T42_CALLS)`); }
  function hasCall(calls, name, args) {
    return calls.some(function (c) {
      if (c[0] !== name) return false;
      if (!args) return true;
      for (var i = 0; i < args.length; i++) if (c[i + 1] !== args[i]) return false;
      return true;
    });
  }
  function callIndex(calls, name) { for (var i = 0; i < calls.length; i++) if (calls[i][0] === name) return i; return -1; }
  // D1: viaChrono goSkyroot (KO, 13 wins) — never __v33.fightBoss.
  E(ctx2, `window.__T42_CALLS=[]; window.__T42_ABSENT={'#v15body':true};
    window.__T42_CFG.count=13;
    window.__T42_CFG.v33unlocked=function(){return false};
    window.__T42_CFG.v33won=function(){return false};
    window.__T42_CFG.en18bosses={v10_slime:{win:1},v10_goblin:{win:1},v10_dragon:{win:1}};
    window.__T42_CFG.v18unlocked=function(id){return id==='v10_ghost'};
    window.__T42_CFG.v19wonAny=function(){return false};
    window.__T42_CFG.v19unlocked=function(){return false};
    window.__T42_CFG.en15bosses={};`);
  const d1ret = E(ctx2, `window.__v42.goSkyroot('ko')`);
  const d1 = calls2();
  check('42D(D1) goSkyroot viaChrono returns true', d1ret === true, d1ret);
  check('42D(D1) viaChrono does NOT call __v33.fightBoss (would refuse a non-Chrono boss)', !hasCall(d1, 'v33fightBoss'), d1);
  check('42D(D1) viaChrono DOES call the pool launcher __v18.fight(v10_ghost, ko)', hasCall(d1, 'v18fight', ['v10_ghost', 'ko']), d1);
  check('42D(D1) viaChrono opens the EN hub first (#v15body absent -> openHub bosses)', hasCall(d1, 'openHub', ['bosses']), d1);
  check('42D(D1) viaChrono closes the Skyroot overlay first', hasCall(d1, 'closeSkyroot'), d1);
  // D2: direct goSkyroot (GEAR GOLEM next) — closeSkyroot -> setLang -> fightBoss.
  E(ctx2, `window.__T42_CALLS=[]; window.__T42_ABSENT={};
    window.__T42_CFG.count=70;
    window.__T42_CFG.v33unlocked=function(){return true};
    window.__T42_CFG.v33won=function(id){return id!=='v17_geargolem'};
    window.__T42_CFG.en18bosses={}; window.__T42_CFG.en15bosses={};`);
  const d2ret = E(ctx2, `window.__v42.goSkyroot('en')`);
  const d2 = calls2();
  check('42D(D2) goSkyroot direct (golem) returns true', d2ret === true, d2ret);
  check('42D(D2) direct calls closeSkyroot -> setLang(en) -> fightBoss(geargolem), in order',
    hasCall(d2, 'closeSkyroot') && hasCall(d2, 'v33setLang', ['en']) && hasCall(d2, 'v33fightBoss', ['v17_geargolem'])
    && callIndex(d2, 'closeSkyroot') < callIndex(d2, 'v33setLang') && callIndex(d2, 'v33setLang') < callIndex(d2, 'v33fightBoss'), d2);
  check('42D(D2) direct does NOT touch the pool launchers or openHub', !hasCall(d2, 'v18fight') && !hasCall(d2, 'v19fight') && !hasCall(d2, 'v15bossFight') && !hasCall(d2, 'openHub'), d2);
  // D3: goChrono v18 target (KO) — openHub first, then fight(id, lang).
  E(ctx2, `window.__T42_CALLS=[]; window.__T42_ABSENT={'#v15body':true};
    window.__T42_CFG.count=13;
    window.__T42_CFG.en18bosses={v10_slime:{win:1}};
    window.__T42_CFG.v18unlocked=function(id){return id==='v10_goblin'};
    window.__T42_CFG.v19wonAny=function(){return true};
    window.__T42_CFG.v19unlocked=function(){return false};
    window.__T42_CFG.en15bosses={};`);
  const d3ret = E(ctx2, `window.__v42.goChrono('ko')`);
  const d3 = calls2();
  check('42D(D3) goChrono v18 returns true', d3ret === true, d3ret);
  check('42D(D3) goChrono v18 closes Chrono first', hasCall(d3, 'closeChrono'), d3);
  check("42D(D3) goChrono v18 calls openHub('bosses') when #v15body is absent", hasCall(d3, 'openHub', ['bosses']), d3);
  check('42D(D3) goChrono v18 calls fight(id, lang) with the overlay language (v10_goblin, ko)', hasCall(d3, 'v18fight', ['v10_goblin', 'ko']), d3);
  check('42D(D3) goChrono v18 does NOT call the v19 or old launchers', !hasCall(d3, 'v19fight') && !hasCall(d3, 'v15bossFight'), d3);
  // D4: goChrono v19 target (EN) — setLang then fight, no openHub.
  E(ctx2, `window.__T42_CALLS=[]; window.__T42_ABSENT={};
    window.__T42_CFG.en18bosses={}; ['en','el','leg'].forEach(function(ar){(window.__V18_BOSSES[ar]||[]).forEach(function(b){window.__T42_CFG.en18bosses[b.id]={win:1}})});
    window.__T42_CFG.v18unlocked=function(){return false};
    window.__T42_CFG.en15bosses={}; (window.__V18_BOSSES.old||[]).forEach(function(b){window.__T42_CFG.en15bosses[b.id]={win:1}});
    window.__T42_CFG.v19wonAny=function(id){return id!=='v11_oni'};
    window.__T42_CFG.v19unlocked=function(id){return id==='v11_oni'};`);
  const d4ret = E(ctx2, `window.__v42.goChrono('en')`);
  const d4 = calls2();
  check('42D(D4) goChrono v19 returns true', d4ret === true, d4ret);
  check('42D(D4) goChrono v19 calls setLang(en) then fight(v11_oni), in order',
    hasCall(d4, 'v19setLang', ['en']) && hasCall(d4, 'v19fight', ['v11_oni'])
    && callIndex(d4, 'v19setLang') < callIndex(d4, 'v19fight'), d4);
  check('42D(D4) goChrono v19 does NOT open the hub (V19 self-creates its host)', !hasCall(d4, 'openHub'), d4);
  // D5: goChrono old target (EN) — openHub first, then bossFight(id).
  E(ctx2, `window.__T42_CALLS=[]; window.__T42_ABSENT={'#v15bossfight':true};
    window.__T42_CFG.en18bosses={}; ['en','el','leg'].forEach(function(ar){(window.__V18_BOSSES[ar]||[]).forEach(function(b){window.__T42_CFG.en18bosses[b.id]={win:1}})});
    window.__T42_CFG.v18unlocked=function(){return false};
    window.__T42_CFG.en15bosses={};
    window.__T42_CFG.v19wonAny=function(){return true};
    window.__T42_CFG.v19unlocked=function(){return false};`);
  const d5ret = E(ctx2, `window.__v42.goChrono('en')`);
  const d5 = calls2();
  check('42D(D5) goChrono old returns true', d5ret === true, d5ret);
  check("42D(D5) goChrono old calls openHub('bosses') when #v15bossfight is absent", hasCall(d5, 'openHub', ['bosses']), d5);
  check('42D(D5) goChrono old calls bossFight(slime)', hasCall(d5, 'v15bossFight', ['slime']), d5);
  check('42D(D5) goChrono old does NOT call the v18/v19 launchers', !hasCall(d5, 'v18fight') && !hasCall(d5, 'v19fight'), d5);
  // D6: null target — honest pop, returns false, no fight launched.
  E(ctx2, `window.__T42_CALLS=[]; window.__T42_ABSENT={};
    window.__T42_CFG.count=70;
    window.__T42_CFG.v33unlocked=function(){return true};
    window.__T42_CFG.v33won=function(){return true};
    window.__T42_CFG.en18bosses={}; ['en','el','leg'].forEach(function(ar){(window.__V18_BOSSES[ar]||[]).forEach(function(b){window.__T42_CFG.en18bosses[b.id]={win:1}})});
    window.__T42_CFG.v18unlocked=function(){return false};
    window.__T42_CFG.en15bosses={}; (window.__V18_BOSSES.old||[]).forEach(function(b){window.__T42_CFG.en15bosses[b.id]={win:1}});
    window.__T42_CFG.v19wonAny=function(){return true};
    window.__T42_CFG.v19unlocked=function(){return false};`);
  const d6sky = E(ctx2, `window.__v42.goSkyroot('en')`);
  const d6a = calls2();
  check('42D(D6) goSkyroot with no target returns false', d6sky === false, d6sky);
  check('42D(D6) goSkyroot with no target pops honestly (no dead button)', hasCall(d6a, 'pop15') && String((d6a.filter(function (c) { return c[0] === 'pop15'; })[0] || [])[1] || '').indexOf('Không tìm thấy boss nào') >= 0, d6a);
  check('42D(D6) goSkyroot with no target launches no fight', !hasCall(d6a, 'v33fightBoss') && !hasCall(d6a, 'v18fight') && !hasCall(d6a, 'v19fight') && !hasCall(d6a, 'v15bossFight'), d6a);
  E(ctx2, `window.__T42_CALLS=[];`);
  const d6ch = E(ctx2, `window.__v42.goChrono('en')`);
  const d6b = calls2();
  check('42D(D6) goChrono with no target returns false', d6ch === false, d6ch);
  check('42D(D6) goChrono with no target pops honestly', hasCall(d6b, 'pop15') && String((d6b.filter(function (c) { return c[0] === 'pop15'; })[0] || [])[1] || '').indexOf('Không còn boss nào') >= 0, d6b);
  check('42D(D6) goChrono with no target launches no fight', !hasCall(d6b, 'v33fightBoss') && !hasCall(d6b, 'v18fight') && !hasCall(d6b, 'v19fight') && !hasCall(d6b, 'v15bossFight'), d6b);

  // ================= §42R V18.6 regression (fragments + one behaviour) =================
  section('§42R', 'V18.6 regression — V41 fixes still hold on V18.7');
  check('R-V41 CA gate survives x4', countOcc(html, "indexOf('ca-')===0") === 4);
  check('R-V41 resolveUltimate clamp survives', html.includes('Math.min(3,F.caRight)'));
  check('R-V41 load() opt default survives', html.includes("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}"));
  check('R-V41 pre-snapshot flush survives x2 + x6', countOcc(html, 'try{ flush(); }catch(e){}') === 2 && countOcc(html, "try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") === 6);
  check('R-V40 ko16 merge survives', html.includes("else if(kk==='ko16'){") && html.includes('m16k.levels=maxMap(l16k.levels, c16k.levels);'));
  check('R-V40 koWarn banner survives x2', countOcc(html, "F.banner=F.koWarn='⚠️ Bạn mới có '+_kc40") === 2);
  check('R-V40 checkPhase exports survive x2', countOcc(html, 'checkPhase:checkPhase') === 2);
  check('R-V39 KO boss answers still feed Smart Learning (markKO comment x2, no XP added)', countOcc(html, '/* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —') === 2);
  check('R-V36 legDiff still UNCHANGED (decision-blocked)', html.includes("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}"));
  const ko16 = E(ctx, `(function(){
    var m=window.__v20sync.mergeSaves;
    var base={cards:[],v7:{meta:{saveVersion:12}}};
    function mk(lv){ var s=JSON.parse(JSON.stringify(base)); s.v7.ko16={levels:{a:lv}}; return s; }
    var r1=m(mk(5),mk(3)); var r2=m(mk(2),mk(7));
    return {r1:r1.v7.ko16.levels.a, r2:r2.v7.ko16.levels.a};
  })()`);
  check('R-C01 ko16 merge keeps the higher level both ways (5 vs 3 -> 5; 2 vs 7 -> 7)', ko16.r1 === 5 && ko16.r2 === 7, ko16);

  // ================= §V save schema =================
  section('§V', 'save schema — no new key, no schema change');
  check('no en42 save key', E(ctx, `!S.v7 || !S.v7.en42`));
  check('no v42 localStorage key', E(ctx, `(function(){ for(var i=0;i<localStorage.length;i++){ if(localStorage.key(i).indexOf('v42')>=0) return false; } return true; })()`));
  check('hanvocab.v1 still the only save key', E(ctx, `localStorage.getItem('hanvocab.v1')!==null`));

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('painted shortcut button on the locked Skyroot + Chrono overlays', 'needs real Chrome — see verify-v42c.js');
  skipCheck('real click on the shortcut opens the target fight in the right language', 'needs real Chrome — see verify-v42c.js');
  skipCheck('GEAR GOLEM win via the shortcut unlocks Skyroot in EN only', 'needs real Chrome — see verify-v42c.js');
  skipCheck('return path after winning a shortcut fight (Boss Map vs overlay)', 'needs real Chrome — see verify-v42c.js');
  skipCheck('360px shortcut button: >=44px tall, no overflow, labels not clipped', 'needs real Chrome — see verify-v42c.js');
  skipCheck('V19 fight still works end-to-end after the V42 layer', 'needs real Chrome — see verify-v42c.js');
  skipCheck('live Firebase login/sync', "never tested live in any version — Anh must run the FIREBASE_SETUP.md checklist");
  skipCheck('real phone touch / Safari', "needs Anh's real-phone test");

  // ================= footer =================
  const total = pass + fail + skip;
  console.log(`\ntest42: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('test42 crashed:', e); process.exit(2); });
