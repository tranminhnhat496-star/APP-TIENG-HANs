// test38.js - V18.3 BOSS WORD SETS independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v37/test37.js (lines 34-188); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V18.3 build.
// The BT fetch stub serves out/basic_tactics_vocabulary.json from disk
// (see H-38-1 in section L). V38 sections below are new.
// Usage: node tools/v38/test38.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, fragments, src/out agree)
//   section L page load (vm, real inline scripts) + __v38 + v17/v22 exports
//   section 38A picker data (7 lib options, 19 topics, 136 lessons, 4+4 sets,
//         24 BT units; bossSubHTML per lib; bossLibChange; bossSubPick)
//   section 38B applyBossScope builds the exact scope per lib (whole + sub)
//   section 38C scopeName22 names for every produced scope (never 'Bo tu khac')
//   section 38D round-trip via openArena (Library scope -> picker display)
//   section 38E BT round-trip unchanged (V18.2 behaviour preserved)
//   section R V18.2 REGRESSION (layers, resolveLethal, wrapper, TOTAL_BOSSES 86)
//   section V save schema (no en38 key, no new localStorage key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/touch/speech; innerHTML
// is a plain string, so picker visibility is asserted on the arena HTML
// string, not on painted pixels); fight question-pool membership is a
// Chrome gate (verify-v38c.js), not asserted here; live-browser, real-phone
// and live-Firebase gates stay Chrome/Anh-only.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = '6b953ac1577b97ced538b3f92ff4d4af42e907e1be4b36e5e874e553eb4e6106';
const EXPECTED_BYTES = 2372032;
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
// test38 body — main() + footer (assembled with the test37.js harness:
// makeLS/makeEl/makeDocument/makeCtx/E/J/loadPage/fireDCL verbatim).
async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v38.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V18.3 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is 2,372,032 B', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('title is V18.3 Boss Word Sets', html.includes('<title>Korean &amp; English Vocab Farm V18.3 — Boss Word Sets'));
  check('__v38 + 18.3.0 present', html.includes('window.__v38') && html.includes("VERSION='18.3.0'"));
  check('__v33/__v34/__v35/__v36/__v37 + 17.0.0/17.1.0/18.0.0/18.1.0/18.2.0 still present', html.includes('window.__v33') && html.includes('window.__v34') && html.includes('window.__v35') && html.includes('window.__v36') && html.includes('window.__v37') && html.includes("VERSION='17.0.0'") && html.includes("VERSION='17.1.0'") && html.includes("VERSION='18.0.0'") && html.includes("VERSION='18.1.0'") && html.includes("VERSION='18.2.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v38', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v38', styleIds.join(','));
  check('script markers end v38', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v38', scriptIds.join(','));
  check('v38js after v37js', html.indexOf('id="v38js"') > html.indexOf('id="v37js"'));
  check('no v39 marker (no unshipped layer)', !html.includes('id="v39"') && !html.includes('id="v39js"'));
  for (const m of ['armV27Obs', 'rearmObserver', '_speakXp', 'V29 (F-05)']) {
    check(`out-of-scope marker absent: ${m}`, !html.includes(m));
  }
  // V38 fragments (one per replacement).
  check('R-V38-V17-EXPORTS present', html.includes('topics:topics,lessons:lessons,topicName:topicName,scopeName:scopeName,'));
  check('R-V38-V22-SCOPENAME delegates to __v17.scopeName', html.includes('try{var v17=V17();if(v17&&v17.scopeName){var n=v17.scopeName(sc);if(n)return n}}catch(e){}'));
  check("R-V38-V22-SCOPENAME fallback 'Bộ từ khác' is guarded by the delegation (not the primary path)", html.indexOf('v17.scopeName(sc)') >= 0 && html.indexOf('v17.scopeName(sc)') < html.indexOf("if(sc.lib!=='bt')return 'Bộ từ khác';"));
  check('R-V38-V22-HELPERS bossLibs present', html.includes('function bossLibs(){'));
  for (const entry of ["{v:'',n:'Tất cả từ vựng'}", "{v:'a1a2',n:'A1–A2 Vocabulary'}", "{v:'oxford',n:'Oxford 3000'}", "{v:'chrono',n:'Chrono Kingdom'}", "{v:'skyroot',n:'Skyroot Sanctuary'}", "{v:'all',n:'Basic Tactics — Toàn bộ 24 Units'}", "{v:'units',n:'Basic Tactics — Chọn Units…'}"]) {
    check(`R-V38-V22-HELPERS bossLibs entry: ${entry.slice(0, 40)}`, html.includes(entry));
  }
  check('R-V38-V22-HELPERS bossSubHTML present', html.includes('function bossSubHTML(lib,sc){'));
  check('R-V38-V22-HELPERS bossLibChange present', html.includes('function bossLibChange(){'));
  check('R-V38-V22-HELPERS bossSubPick present', html.includes('function bossSubPick(el){'));
  check('R-V38-V22-HELPERS bossSelectedSub present', html.includes('function bossSelectedSub(attr){'));
  check('R-V38-V22-PICKER lib onchange present', html.includes('id="v22bs-lib" onchange="__v22.bossLibChange()"'));
  check('R-V38-V22-PICKER old BT-only lib select gone', !html.includes('<option value="all">Basic Tactics — Toàn bộ 24 Units</option>'));
  check('R-V38-V22-PICKER sub area + ts/pickall wrappers present', html.includes('id="v22bs-sub"') && html.includes('id="v22bs-ts"') && html.includes('id="v22bs-pickall"'));
  check('R-V38-V22-APPLY a1a2 branch present', html.includes("bossSelectedSub('t')"));
  check('R-V38-V22-APPLY chrono/skyroot branch present', html.includes("bossSelectedSub('s')"));
  check('R-V38-V22-APPLY oxford lesson branch present', html.includes("document.querySelector('#v22bs-lesson')"));
  check('R-V38-V22-APPLY non-BT applies immediately (no BT wait)', html.includes('Các bộ Thư viện khác không cần dữ liệu BT'));
  check('R-V38-V22-EXPORTS present', html.includes('scopeName22:scopeName22,bossLibChange:bossLibChange,') && html.includes('bossSubPick:bossSubPick,bossSubHTML:bossSubHTML,bossSelectedSub:bossSelectedSub,'));
  // V37 fragments survive (spot-checks, one per group).
  check('V37 renderHub export survives', html.includes('renderTab:renderTab,renderHub:renderHub,topicName:topicName,counts15:counts15,'));
  check('V37 clearScope line survives', html.includes('if(v.renderHub)v.renderHub();else renderTab()'));
  check('V37 __v27.render export survives', html.includes('goTab:goTab,goWeak:goWeak,render:render,'));
  check('V37 Smart banner onclick survives', html.includes('__v27.render&&__v27.render()'));
  // V36 fragments survive (spot-checks, one per group).
  for (const frag of ['function resolveLethal(Ff){', 'partial:!!partial', "wind:'stone_wind'", '_sxp36', 'v21emailbtn', 'z-index:1600', 'z-index:1700', 'NGHỀ NGHIỆP']) {
    check(`V36 fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  check('V17-4 typo still gone', countOcc(html, 'NGHỀNGHIỆP') === 0);
  // V33/V34/V35 fragments still present (spot-checks).
  for (const frag of ['__V33_DATA.byId(id)', 'QUEST_MIN_ACC=0.8', '__v34.breakDmg(F)', 'weakCountInPool(F.weak,pool)===0', '__V35_DATA?__V35_DATA.bosses:[]', 'var TOTAL_BOSSES=86;', 'GEAR_GOLEM=\'v17_geargolem\'', '/* V31 (F-01):']) {
    check(`older fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  check('TOTAL_BOSSES still 86', html.includes('var TOTAL_BOSSES=86;') && !html.includes('var TOTAL_BOSSES=78;'));
  check('v38 layer files present in DIR', fs.existsSync(path.join(DIR, 'v38.js')) && fs.existsSync(path.join(DIR, 'v38.css')));
  for (const f of ['v17.js', 'v22.js']) {
    const a = fs.readFileSync(path.join(ROOT, 'src', f), 'utf-8');
    const b = fs.existsSync(path.join(DIR, f)) ? fs.readFileSync(path.join(DIR, f), 'utf-8') : '';
    check(`src/${f} agrees with out/${f}`, a === b);
  }
  check('src/v38.js agrees with out/v38.js', fs.readFileSync(path.join(ROOT, 'src', 'v38.js'), 'utf-8') === fs.readFileSync(path.join(DIR, 'v38.js'), 'utf-8'));
  check('src/v38.css agrees with out/v38.css', fs.readFileSync(path.join(ROOT, 'src', 'v38.css'), 'utf-8') === fs.readFileSync(path.join(DIR, 'v38.css'), 'utf-8'));

  // ================= §L page load (vm, real inline scripts) =================
  section('§L', 'page load (vm, real inline scripts)');
  const ctx = makeCtx();
  dynIds.add('v15body');
  dynIds.add('v27body');
  dynIds.add('v19zonedetail');
  // H-38-1: BT apply tests need the real BT JSON — serve it from disk
  // through the sandbox fetch (ensureData fetches
  // 'basic_tactics_vocabulary.json' and falls back to XMLHttpRequest,
  // which does not exist in this stub, so a failing fetch would make
  // every BT apply test fail for harness reasons, not app reasons).
  const btJson = fs.readFileSync(path.join(ROOT, 'out', 'basic_tactics_vocabulary.json'), 'utf-8');
  ctx.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(btJson) });
  const loaded = loadPage(ctx, html);
  check('inline script blocks extracted (>=30)', loaded.blocks >= 30, loaded.blocks);
  check('all inline scripts evaluate without error', loaded.loadErr === null, loaded.loadErr);
  if (loaded.loadErr) { console.log(`\ntest38 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15/__v17/__v22/__v27/__v38 present',
    E(ctx, `!!window.__v15 && !!window.__v17 && !!window.__v22 && !!window.__v27 && !!window.__v38`));
  check('__v38.version is 18.3.0', E(ctx, `window.__v38.version`) === '18.3.0');
  check('R-V38-V17-EXPORTS: __v17.topics/lessons/topicName/scopeName are functions',
    E(ctx, `typeof window.__v17.topics==='function' && typeof window.__v17.lessons==='function' && typeof window.__v17.topicName==='function' && typeof window.__v17.scopeName==='function'`));
  check('R-V38-V22-EXPORTS: __v22.scopeName22/bossLibChange/bossSubPick/bossSubHTML/bossSelectedSub are functions',
    E(ctx, `typeof window.__v22.scopeName22==='function' && typeof window.__v22.bossLibChange==='function' && typeof window.__v22.bossSubPick==='function' && typeof window.__v22.bossSubHTML==='function' && typeof window.__v22.bossSelectedSub==='function'`));
  E(ctx, `window.__v15.buildWords()`);
  const nWords = E(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);
  // Library data the picker reuses (no duplication in v22.js).
  const libData = J(ctx, `JSON.stringify({
    topics: window.__v17.topics().length,
    lessons: window.__v17.lessons().length,
    chrono: window.__v17.chronoSets().length,
    skyroot: window.__v17.skyrootSets().length,
    topicEdu: window.__v17.topicName('a1_education'),
    chrono0: window.__v17.chronoSets()[0],
    skyroot0: window.__v17.skyrootSets()[0]
  })`);
  check('A1–A2 has 19 topics', libData.topics === 19, libData);
  check('Oxford has 136 lessons', libData.lessons === 136, libData);
  check('Chrono has 4 sets', libData.chrono === 4, libData);
  check('Skyroot has 4 sets', libData.skyroot === 4, libData);
  check("topicName('a1_education') is a real name", typeof libData.topicEdu === 'string' && libData.topicEdu.length > 0, libData.topicEdu);
  check('first Chrono set has id+name', libData.chrono0 && libData.chrono0.id && libData.chrono0.name, libData.chrono0);
  check('first Skyroot set has id+name', libData.skyroot0 && libData.skyroot0.id && libData.skyroot0.name, libData.skyroot0);

  // ================= §38A picker data — dropdown + sub-picker per lib =================
  section('§38A', 'picker data — lib dropdown + sub-picker per lib');
  // The lib dropdown options are rendered at runtime from bossLibs(),
  // so assert them on the rendered arena HTML (openArena, no scope).
  const arena0 = E(ctx, `(function(){
    var out={};
    try{ window.__v15.choose('en'); window.__v18.openArena('en'); }catch(e){ out.err=String(e); }
    try{ var h=document.getElementById('v15body'); out.html=h?String(h.innerHTML||''):null; }catch(e){ out.htmlErr=String(e); }
    return out;
  })()`);
  check('openArena renders without error', !arena0.err, arena0);
  const h0 = arena0.html || '';
  const optIdx = ['<option value=""', '<option value="a1a2"', '<option value="oxford"', '<option value="chrono"', '<option value="skyroot"', '<option value="all"', '<option value="units"'].map(s => h0.indexOf(s));
  check('lib dropdown has all 7 options in order (all/A1–A2/Oxford/Chrono/Skyroot/BT-all/BT-units)', optIdx.every(i => i >= 0) && optIdx.slice(1).every((v, i) => v > optIdx[i]), optIdx);
  for (const label of ['Tất cả từ vựng', 'A1–A2 Vocabulary', 'Oxford 3000', 'Chrono Kingdom', 'Skyroot Sanctuary', 'Basic Tactics — Toàn bộ 24 Units', 'Basic Tactics — Chọn Units…']) {
    check(`lib dropdown shows label: ${label.slice(0, 30)}`, h0.indexOf(label) >= 0);
  }
  check('no scope: "Tất cả từ vựng" is selected', h0.indexOf('<option value="" selected>Tất cả từ vựng</option>') >= 0);
  check('no scope: type/status dropdowns hidden (BT-only filters)', h0.indexOf('id="v22bs-ts" style="display:none"') >= 0);
  check('no scope: pick-all buttons hidden (BT-only)', h0.indexOf('id="v22bs-pickall" style="display:none"') >= 0);
  check('no scope: no sub-selection area (no chips div)', h0.indexOf('id="v22bs-chips"') < 0);
  // bossSubHTML per lib (direct, via the __v22 export).
  const subA1a2 = E(ctx, `window.__v22.bossSubHTML('a1a2', null)`);
  check('A1–A2 sub-picker has 19 topic chips', (subA1a2.match(/data-t="/g) || []).length === 19, (subA1a2.match(/data-t="/g) || []).length);
  check('A1–A2 sub-picker has a "Tất cả chủ đề" chip', subA1a2.indexOf('Tất cả chủ đề') >= 0);
  check('A1–A2 sub-picker chips carry word counts', subA1a2.indexOf('từ') >= 0);
  const subOx = E(ctx, `window.__v22.bossSubHTML('oxford', null)`);
  check('Oxford sub-picker is a <select>, not 136 chips', subOx.indexOf('<select') >= 0 && subOx.indexOf('id="v22bs-lesson"') >= 0 && (subOx.match(/data-t="/g) || []).length === 0);
  check('Oxford sub-picker has 137 options (whole + 136 lessons)', (subOx.match(/<option/g) || []).length === 137, (subOx.match(/<option/g) || []).length);
  check('Oxford sub-picker first option is "Toàn bộ 136 bài"', subOx.indexOf('Toàn bộ 136 bài') >= 0);
  check('Oxford sub-picker last option is "Bài 136"', subOx.indexOf('>Bài 136</option>') >= 0);
  const subCh = E(ctx, `window.__v22.bossSubHTML('chrono', null)`);
  check('Chrono sub-picker has 4 set chips', (subCh.match(/data-s="/g) || []).length === 4, (subCh.match(/data-s="/g) || []).length);
  check('Chrono sub-picker has a "Tất cả 4 bộ" chip', subCh.indexOf('Tất cả 4 bộ') >= 0);
  const subSk = E(ctx, `window.__v22.bossSubHTML('skyroot', null)`);
  check('Skyroot sub-picker has 4 set chips', (subSk.match(/data-s="/g) || []).length === 4, (subSk.match(/data-s="/g) || []).length);
  check('Skyroot sub-picker has a "Tất cả 4 bộ" chip', subSk.indexOf('Tất cả 4 bộ') >= 0);
  const subBt = E(ctx, `window.__v22.bossSubHTML('units', {kind:'lib',lib:'bt'})`);
  check('BT sub-picker has 24 Unit chips', (subBt.match(/data-u="/g) || []).length === 24, (subBt.match(/data-u="/g) || []).length);
  check("bossSubHTML('') returns empty (no sub area)", E(ctx, `window.__v22.bossSubHTML('', null)`) === '');
  check("bossSubHTML('a1a2', {topic:'a1_education'}) marks that chip on",
    E(ctx, `window.__v22.bossSubHTML('a1a2', {kind:'lib',lib:'a1a2',topic:'a1_education'})`).indexOf('class="v15pill on" data-t="a1_education"') >= 0);
  check("bossSubHTML('oxford', {lesson:12}) marks Bài 12 selected",
    E(ctx, `window.__v22.bossSubHTML('oxford', {kind:'lib',lib:'oxford',lesson:12})`).indexOf('<option value="12" selected>Bài 12</option>') >= 0);
  // bossLibChange re-renders the sub area + toggles BT-only controls.
  const libChange = E(ctx, `(function(){
    var out={};
    try{
      document.querySelector('#v22bs-lib').value='oxford';
      window.__v22.bossLibChange();
      var sub=document.querySelector('#v22bs-sub'); out.subOx=sub?String(sub.innerHTML||''):null;
      var ts=document.querySelector('#v22bs-ts'); out.tsOx=ts?ts.style.display:null;
      var pa=document.querySelector('#v22bs-pickall'); out.paOx=pa?pa.style.display:null;
      document.querySelector('#v22bs-lib').value='units';
      window.__v22.bossLibChange();
      var sub2=document.querySelector('#v22bs-sub'); out.subBt=sub2?String(sub2.innerHTML||''):null;
      var ts2=document.querySelector('#v22bs-ts'); out.tsBt=ts2?ts2.style.display:null;
      var pa2=document.querySelector('#v22bs-pickall'); out.paBt=pa2?pa2.style.display:null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('bossLibChange(Oxford) renders the lesson select into #v22bs-sub', typeof libChange.subOx === 'string' && libChange.subOx.indexOf('id="v22bs-lesson"') >= 0, libChange);
  check('bossLibChange(Oxford) hides the type/status dropdowns', libChange.tsOx === 'none', libChange);
  check('bossLibChange(Oxford) hides the pick-all buttons', libChange.paOx === 'none', libChange);
  check('bossLibChange(BT units) renders the 24 Unit chips', typeof libChange.subBt === 'string' && (libChange.subBt.match(/data-u="/g) || []).length === 24, libChange);
  check('bossLibChange(BT units) shows the type/status dropdowns', libChange.tsBt === '', libChange);
  check('bossLibChange(BT units) shows the pick-all buttons', libChange.paBt === '', libChange);
  // bossSubPick single-select toggle (A1–A2 / Chrono / Skyroot chips).
  const subPick = E(ctx, `(function(){
    var out={};
    try{
      var mk=function(data,on){
        var cls=on?['on']:[];
        return { getAttribute:function(k){ var v=data[k]; return v===undefined?null:v; },
          classList:{ contains:function(c){ return cls.indexOf(c)>=0; },
            add:function(c){ if(cls.indexOf(c)<0)cls.push(c); },
            remove:function(c){ var i=cls.indexOf(c); if(i>=0)cls.splice(i,1); } } };
      };
      var all=mk({'data-all':'1'},true), t1=mk({'data-t':'education'},false), t2=mk({'data-t':'food'},false);
      var orig=document.querySelectorAll;
      document.querySelectorAll=function(sel){ if(sel==='#v22bs-chips .v15pill')return [all,t1,t2]; return orig(sel); };
      window.__v22.bossSubPick(t1);
      out.afterPick={ all:all.classList.contains('on'), t1:t1.classList.contains('on'), t2:t2.classList.contains('on') };
      window.__v22.bossSubPick(t1);
      out.afterRePick={ all:all.classList.contains('on'), t1:t1.classList.contains('on'), t2:t2.classList.contains('on') };
      document.querySelectorAll=orig;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('bossSubPick turns the picked chip on and the rest off', subPick.afterPick && subPick.afterPick.t1 === true && subPick.afterPick.all === false && subPick.afterPick.t2 === false, subPick);
  check('bossSubPick again on the same chip falls back to "Tất cả"', subPick.afterRePick && subPick.afterRePick.all === true && subPick.afterRePick.t1 === false, subPick);

  // ================= §38B applyBossScope builds the exact scope per lib =================
  section('§38B', 'applyBossScope — exact scope object per lib');
  // Install the canned picker controls (driven by window.__T38) so
  // applyBossScope reads a controlled DOM. Restored before §38D.
  E(ctx, `(function(){
    window.__T38 = { lib:'', lesson:'', type:'', status:'', chips:[] };
    window.__T38.mkChip = function(data,on){
      var cls=on?['on']:[];
      return { getAttribute:function(k){ var v=data[k]; return v===undefined?null:v; },
        classList:{ contains:function(c){ return cls.indexOf(c)>=0; },
          add:function(c){ if(cls.indexOf(c)<0)cls.push(c); },
          remove:function(c){ var i=cls.indexOf(c); if(i>=0)cls.splice(i,1); } } };
    };
    var origQS=document.querySelector.bind(document);
    var origQSA=document.querySelectorAll.bind(document);
    window.__T38._origQS=origQS; window.__T38._origQSA=origQSA;
    document.querySelector=function(sel){
      if(sel==='#v22bs-lib')return { value:window.__T38.lib };
      if(sel==='#v22bs-lesson')return { value:window.__T38.lesson };
      if(sel==='#v22bs-type')return { value:window.__T38.type };
      if(sel==='#v22bs-status')return { value:window.__T38.status };
      if(sel==='#v22bs-current')return { innerHTML:'' };
      return origQS(sel);
    };
    document.querySelectorAll=function(sel){
      if(sel==='#v22bs-chips .v15pill.on')return window.__T38.chips.filter(function(c){ return c.classList.contains('on'); });
      if(sel==='#v22bs-chips .v15pill')return window.__T38.chips;
      return origQSA(sel);
    };
  })()`);
  function apply38(cfg) {
    return E(ctx, `(function(){
      var out={};
      try{
        window.__T38.lib=${JSON.stringify(cfg.lib)};
        window.__T38.lesson=${JSON.stringify(cfg.lesson || '')};
        window.__T38.type=${JSON.stringify(cfg.type || '')};
        window.__T38.status=${JSON.stringify(cfg.status || '')};
        window.__T38.chips=(${JSON.stringify(cfg.chips || [])}).map(function(c){
          return window.__T38.mkChip(c.data, !!c.on);
        });
        window.__v22.applyBossScope();
        out.ok=true;
      }catch(e){ out.ok=false; out.err=String(e); }
      try{ out.scope=window.__v15.en15().scope; }catch(e){ out.scopeErr=String(e); }
      return out;
    })()`);
  }
  const chId = libData.chrono0.id, skId = libData.skyroot0.id;
  let r = apply38({ lib: 'oxford', lesson: '12' });
  check('Oxford Bài 12 → {kind:lib, lib:oxford, lesson:12}', r.ok === true && r.scope && r.scope.kind === 'lib' && r.scope.lib === 'oxford' && r.scope.lesson === 12, r);
  r = apply38({ lib: 'oxford', lesson: '' });
  check('Oxford "Toàn bộ" → {lib:oxford} with NO lesson key', r.ok === true && r.scope && r.scope.lib === 'oxford' && !('lesson' in r.scope), r);
  r = apply38({ lib: 'a1a2', chips: [{ data: { 'data-t': 'a1_education' }, on: true }] });
  check("A1–A2 topic → {kind:lib, lib:a1a2, topic:'a1_education'}", r.ok === true && r.scope && r.scope.lib === 'a1a2' && r.scope.topic === 'a1_education', r);
  r = apply38({ lib: 'a1a2', chips: [{ data: { 'data-all': '1' }, on: true }] });
  check('A1–A2 "Toàn bộ" → {lib:a1a2} with NO topic key', r.ok === true && r.scope && r.scope.lib === 'a1a2' && !('topic' in r.scope), r);
  r = apply38({ lib: 'chrono', chips: [{ data: { 'data-s': chId }, on: true }] });
  check(`Chrono set → {kind:lib, lib:chrono, set:'${chId}'}`, r.ok === true && r.scope && r.scope.lib === 'chrono' && r.scope.set === chId, r);
  r = apply38({ lib: 'chrono', chips: [{ data: { 'data-all': '1' }, on: true }] });
  check('Chrono "Toàn bộ" → {lib:chrono} with NO set key', r.ok === true && r.scope && r.scope.lib === 'chrono' && !('set' in r.scope), r);
  r = apply38({ lib: 'skyroot', chips: [{ data: { 'data-s': skId }, on: true }] });
  check(`Skyroot set → {kind:lib, lib:skyroot, set:'${skId}'}`, r.ok === true && r.scope && r.scope.lib === 'skyroot' && r.scope.set === skId, r);
  r = apply38({ lib: 'skyroot', chips: [{ data: { 'data-all': '1' }, on: true }] });
  check('Skyroot "Toàn bộ" → {lib:skyroot} with NO set key', r.ok === true && r.scope && r.scope.lib === 'skyroot' && !('set' in r.scope), r);
  r = apply38({ lib: '' });
  check('"Tất cả từ vựng" → scope cleared (null)', r.ok === true && r.scope === null, r);
  // BT applies go through ensureData (async fetch, stubbed to the real
  // JSON) — wait for the promise chain to settle before reading.
  r = apply38({ lib: 'units', chips: [{ data: { 'data-u': '2' }, on: true }, { data: { 'data-u': '5' }, on: true }] });
  check('BT Units 2+5 apply call itself does not throw', r.ok === true, r);
  await sleep(500);
  const btScope = J(ctx, `JSON.stringify(window.__v15.en15().scope)`);
  check('BT Units 2+5 → {kind:lib, lib:bt, unit:[2,5]}', btScope && btScope.kind === 'lib' && btScope.lib === 'bt' && Array.isArray(btScope.unit) && btScope.unit.length === 2 && btScope.unit[0] === 2 && btScope.unit[1] === 5, btScope);
  r = apply38({ lib: 'all', chips: [] });
  await sleep(500);
  const btAll = J(ctx, `JSON.stringify(window.__v15.en15().scope)`);
  check('BT "Toàn bộ 24 Units" → {lib:bt} with NO unit key', btAll && btAll.lib === 'bt' && !('unit' in btAll), btAll);
  r = apply38({ lib: 'units', type: 'word', status: 'due', chips: [{ data: { 'data-u': '3' }, on: true }] });
  await sleep(500);
  const btTS = J(ctx, `JSON.stringify(window.__v15.en15().scope)`);
  check('BT type+status kept: {lib:bt, unit:3, type:word, status:due}', btTS && btTS.lib === 'bt' && btTS.unit === 3 && btTS.type === 'word' && btTS.status === 'due', btTS);
  check('BT data actually loaded (window.__V22_BT has 24 units)', E(ctx, `!!window.__V22_BT && Array.isArray(window.__V22_BT.units) && window.__V22_BT.units.length===24`));
  // Non-BT applies must NOT wait for BT data (regression of the old
  // behaviour where even clearing waited for the BT download).
  const fastApply = await (async () => {
    const t0 = Date.now();
    const rr = apply38({ lib: 'oxford', lesson: '7' });
    return { ms: Date.now() - t0, scope: rr.scope, ok: rr.ok };
  })();
  check('Oxford apply is synchronous (no BT wait)', fastApply.ok === true && fastApply.scope && fastApply.scope.lesson === 7 && fastApply.ms < 200, fastApply);

  // ================= §38C scopeName22 names every produced scope =================
  section('§38C', 'scopeName22 — proper name for every produced scope');
  function nm(sc) { return E(ctx, `window.__v22.scopeName22(${JSON.stringify(sc)})`); }
  const chName = libData.chrono0.name, skName = libData.skyroot0.name;
  const nameCases = [
    [null, 'Tất cả từ vựng'],
    [{ kind: 'lib', lib: 'a1a2' }, 'A1–A2 Vocabulary'],
    [{ kind: 'lib', lib: 'a1a2', topic: 'a1_education' }, 'A1–A2 · ' + libData.topicEdu],
    [{ kind: 'lib', lib: 'oxford' }, 'Oxford 3000'],
    [{ kind: 'lib', lib: 'oxford', lesson: 12 }, 'Oxford 3000 · Bài 12'],
    [{ kind: 'lib', lib: 'chrono' }, 'Chrono Kingdom'],
    [{ kind: 'lib', lib: 'chrono', set: chId }, 'Chrono · ' + chName],
    [{ kind: 'lib', lib: 'skyroot' }, 'Skyroot Sanctuary'],
    [{ kind: 'lib', lib: 'skyroot', set: skId }, 'Skyroot · ' + skName],
    [{ kind: 'lib', lib: 'bt' }, 'Basic Tactics'],
    [{ kind: 'lib', lib: 'bt', unit: [2, 5] }, 'Basic Tactics · 2 Units'],
    [{ kind: 'lib', lib: 'bt', unit: 3 }, 'Basic Tactics · Unit 3'],
    [{ kind: 'lib', lib: 'bt', unit: 3, type: 'word', status: 'due' }, 'Basic Tactics · Unit 3 · Từ đơn · Cần ôn'],
    [{ kind: 'lib', lib: 'bt', type: 'phrase', status: 'unlearned' }, 'Basic Tactics · Cụm từ · Chưa thuộc'],
  ];
  for (const [sc, expected] of nameCases) {
    const got = nm(sc);
    check(`scopeName22(${JSON.stringify(sc)}) === "${expected}"`, got === expected, got);
    check(`scopeName22(${JSON.stringify(sc)}) never returns 'Bộ từ khác'`, got !== 'Bộ từ khác', got);
  }

  // ================= §38D round-trip — picker reflects an existing scope =================
  section('§38D', 'round-trip — picker reflects a scope set from the Library');
  E(ctx, `document.querySelector = window.__T38._origQS; document.querySelectorAll = window.__T38._origQSA;`);
  function arenaWithScope(sc) {
    return E(ctx, `(function(){
      var out={};
      try{ if(${JSON.stringify(sc)}===null){ window.__v15.clearScope(); } else { window.__v15.setScope(${JSON.stringify(sc)}); } }catch(e){ out.setErr=String(e); }
      try{ window.__v18.openArena('en'); }catch(e){ out.arenaErr=String(e); }
      try{ var h=document.getElementById('v15body'); out.html=h?String(h.innerHTML||''):null; }catch(e){ out.htmlErr=String(e); }
      return out;
    })()`);
  }
  let a = arenaWithScope({ kind: 'lib', lib: 'oxford', lesson: 12 });
  check('round-trip Oxford Bài 12: lib option selected', (a.html || '').indexOf('<option value="oxford" selected>Oxford 3000</option>') >= 0, a);
  check('round-trip Oxford Bài 12: Bài 12 selected in the lesson select', (a.html || '').indexOf('<option value="12" selected>Bài 12</option>') >= 0, a);
  check('round-trip Oxford Bài 12: "Đang chọn" names it', (a.html || '').indexOf('Đang chọn: <b>Oxford 3000 · Bài 12</b>') >= 0, a);
  check('round-trip Oxford Bài 12: type/status hidden', (a.html || '').indexOf('id="v22bs-ts" style="display:none"') >= 0, a);
  a = arenaWithScope({ kind: 'lib', lib: 'a1a2', topic: 'a1_education' });
  check('round-trip A1–A2 Education: lib option selected', (a.html || '').indexOf('<option value="a1a2" selected>A1–A2 Vocabulary</option>') >= 0, a);
  check('round-trip A1–A2 Education: topic chip on', (a.html || '').indexOf('class="v15pill on" data-t="a1_education"') >= 0, a);
  check('round-trip A1–A2 Education: "Đang chọn" names it', (a.html || '').indexOf('Đang chọn: <b>A1–A2 · ' + libData.topicEdu + '</b>') >= 0, a);
  a = arenaWithScope({ kind: 'lib', lib: 'chrono', set: chId });
  check('round-trip Chrono set: lib option selected', (a.html || '').indexOf('<option value="chrono" selected>Chrono Kingdom</option>') >= 0, a);
  check('round-trip Chrono set: set chip on', (a.html || '').indexOf('class="v15pill on" data-s="' + chId + '"') >= 0, a);
  check('round-trip Chrono set: "Đang chọn" names it', (a.html || '').indexOf('Đang chọn: <b>Chrono · ' + chName.replace(/&/g, '&amp;') + '</b>') >= 0, a);
  a = arenaWithScope({ kind: 'lib', lib: 'skyroot', set: skId });
  check('round-trip Skyroot set: lib option selected', (a.html || '').indexOf('<option value="skyroot" selected>Skyroot Sanctuary</option>') >= 0, a);
  check('round-trip Skyroot set: set chip on', (a.html || '').indexOf('class="v15pill on" data-s="' + skId + '"') >= 0, a);
  a = arenaWithScope({ kind: 'lib', lib: 'bt', unit: [2, 5], type: 'word', status: 'due' });
  check('round-trip BT Units 2+5: lib option selected', (a.html || '').indexOf('<option value="units" selected>Basic Tactics — Chọn Units…</option>') >= 0, a);
  check('round-trip BT Units 2+5: Unit 2 chip on', (a.html || '').indexOf('class="v15pill on" data-u="2"') >= 0, a);
  check('round-trip BT Units 2+5: Unit 5 chip on', (a.html || '').indexOf('class="v15pill on" data-u="5"') >= 0, a);
  check('round-trip BT Units 2+5: Unit 3 chip off', (a.html || '').indexOf('class="v15pill on" data-u="3"') < 0, a);
  check('round-trip BT Units 2+5: type=word selected', (a.html || '').indexOf('<option value="word" selected>Chỉ từ đơn</option>') >= 0, a);
  check('round-trip BT Units 2+5: status=due selected', (a.html || '').indexOf('<option value="due" selected>Chỉ mục cần ôn</option>') >= 0, a);
  check('round-trip BT Units 2+5: type/status dropdowns SHOWN', (a.html || '').indexOf('id="v22bs-ts" style="display:none"') < 0 && (a.html || '').indexOf('id="v22bs-ts"') >= 0, a);
  check('round-trip BT Units 2+5: pick-all buttons SHOWN', (a.html || '').indexOf('id="v22bs-pickall" style="display:none"') < 0 && (a.html || '').indexOf('id="v22bs-pickall"') >= 0, a);
  a = arenaWithScope(null);
  check('round-trip cleared scope: "Tất cả từ vựng" selected', (a.html || '').indexOf('<option value="" selected>Tất cả từ vựng</option>') >= 0, a);
  check('round-trip cleared scope: no sub-selection area', (a.html || '').indexOf('id="v22bs-chips"') < 0, a);
  check('round-trip cleared scope: "Đang chọn" shows all words', (a.html || '').indexOf('Đang chọn: <b>Tất cả từ vựng</b>') >= 0, a);

  // ================= §38E BT round-trip unchanged (V18.2 behaviour) =================
  section('§38E', 'BT round-trip unchanged — V18.2 picker behaviour preserved');
  a = arenaWithScope({ kind: 'lib', lib: 'bt' });
  check('BT whole-set: "Toàn bộ 24 Units" selected', (a.html || '').indexOf('<option value="all" selected>Basic Tactics — Toàn bộ 24 Units</option>') >= 0, a);
  check('BT whole-set: all 24 Unit chips on', (a.html.match(/class="v15pill on" data-u="/g) || []).length === 24, (a.html.match(/class="v15pill on" data-u="/g) || []).length);
  check('BT whole-set: type/status at defaults (V18.2 behaviour — "" options carry no selected attr)', (a.html || '').indexOf('<option value="">Từ đơn + Cụm từ</option>') >= 0 && (a.html || '').indexOf('<option value="">Mọi trạng thái</option>') >= 0 && (a.html || '').indexOf('<option value="word" selected>') < 0 && (a.html || '').indexOf('<option value="due" selected>') < 0, a);
  check('BT picker still has Chọn/Bỏ chọn tất cả buttons', (a.html || '').indexOf('Chọn tất cả Units') >= 0 && (a.html || '').indexOf('Bỏ chọn tất cả') >= 0, a);

  // ================= §R V18.2 regression =================
  section('§R', 'V18.2 regression — gates, fragments, probe set');
  check('V38 layer present (__v38 18.3.0)', E(ctx, `!!window.__v38 && window.__v38.version==='18.3.0'`));
  check('V37 layer still present (__v37 18.2.0)', E(ctx, `!!window.__v37 && window.__v37.version==='18.2.0'`));
  check('V36 layer still present (__v36 18.1.0)', E(ctx, `!!window.__v36 && window.__v36.version==='18.1.0'`));
  check('V35 layer still present (__v35 18.0.0)', E(ctx, `!!window.__v35 && window.__v35.version==='18.0.0'`));
  check('V34 layer still present (__v34 17.1.0)', E(ctx, `!!window.__v34 && window.__v34.version==='17.1.0'`));
  check('V33 layer still present (__v33 17.0.0)', E(ctx, `!!window.__v33 && window.__v33.version==='17.0.0'`));
  check('V32 layer still present (__v32 16.4.0)', E(ctx, `!!window.__v32 && window.__v32.version==='16.4.0'`));
  check('V31 layer still present (__v31 16.3.0)', E(ctx, `!!window.__v31 && window.__v31.version==='16.3.0'`));
  check('V27 layer still present (__v27 16.0.0)', E(ctx, `!!window.__v27 && window.__v27.version==='16.0.0'`));
  check('V37 renderHub export still a function', E(ctx, `typeof window.__v15.renderHub === 'function'`));
  check('V37 __v27.render still a function', E(ctx, `typeof window.__v27.render === 'function'`));
  check('V36 resolveLethal still exported (V17-2)', E(ctx, `typeof window.__v19._test.resolveLethal === 'function' && typeof window.__v18._test.resolveLethal === 'function'`));
  check('V36 breakBarHTML wrapper still active', E(ctx, `window.__v36.wrapped===true && typeof window.__v34._breakBarHTML_orig==='function'`));
  check('TOTAL_BOSSES still 86', E(ctx, `window.__v21 && window.__v21.TOTAL_BOSSES===86`) || html.includes('var TOTAL_BOSSES=86;'));

  // ================= §V save schema =================
  section('§V', 'save schema — no new key, no schema change');
  const sav = J(ctx, `JSON.stringify((function(){
    var out={};
    try{
      // §38E leaves a BT scope set — clear it first (test37's flow
      // ended with clears too), then flush explicitly: the V20 save
      // wrapper debounces 0.8s, so the persisted snapshot would
      // otherwise reflect stale pre-clear state.
      try{ window.__v15.clearScope(); }catch(e){}
      try{ if(window.__v20&&__v20.flush)__v20.flush(); }catch(e){}
      var s=JSON.parse(localStorage.getItem('hanvocab.v1')||'{}');
      out.hasV38=!!(s.v7&&s.v7.en38);
      out.hasEn15Scope=!!(s.v7&&s.v7.en15);
      out.scopeAfterTests=(s.v7&&s.v7.en15)?(s.v7.en15.scope||null):'n/a';
    }catch(e){ out.err=String(e); }
    var keys=[]; for(var i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));
    out.lsKeys=keys.sort();
    return out;
  })())`);
  check('no new en38 save key (V38 adds nothing to the save)', sav.hasV38 === false, sav);
  check('scope is null in the saved state after the clear tests', sav.scopeAfterTests === null, sav);
  check('no new localStorage key from V38 (only hanvocab.* keys)', sav.lsKeys.every(function (k) { return k.indexOf('hanvocab.') === 0; }), sav.lsKeys);

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('picker shows all sets on the Boss Map zone view (real DOM)', 'needs real Chrome — see verify-v38c.js');
  skipCheck('fight questions come from the picked set (Oxford 12 / A1–A2 topic / Chrono set)', 'needs real Chrome — see verify-v38c.js');
  skipCheck('BT Units 2+5 fight questions come from those units only', 'needs real Chrome — see verify-v38c.js');
  skipCheck('360px viewport: no horizontal overflow, all controls ≥44px', 'needs real Chrome — see verify-v38c.js');
  skipCheck('live Firebase login/sync', 'never tested live in any version — Anh must run the FIREBASE_SETUP.md checklist');
  skipCheck('real phone touch / Safari', 'needs Anh\'s real-phone test');

  // ================= footer =================
  const total = pass + fail + skip;
  console.log(`\ntest38: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('test38 crashed:', e); process.exit(2); });
