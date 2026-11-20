// test39.js - V18.4 KOREAN BOSSES independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v38/test38.js (lines 34-188); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V18.4 build.
// Usage: node tools/v39/test39.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, fragments, src/out agree,
//         data flip counts, v18_data.js differs from pristine ONLY in lang)
//   section L page load (vm, real inline scripts) + __v39 + v17/v22 exports
//   section 39A data flip (runtime: 30 bosses 'both', old arena 'en';
//         deep-compare vs the pristine backup; collDetail language line;
//         pick screen for Challenge / grammar-mode / Legendary bosses)
//   section 39B V18 <8 KO banner (5-card fallback to English, 20-card
//         Korean, EN fight never banners; V19 parity on the same saves)
//   section 39C V18 recordAnswer wiring (spy: (ko,id,ok,boss18) once per
//         KO answer, right/wrong/cw/cr/last in en27().ko; EN answers go
//         to en27().en only; Break meter fills on KO hits with a deck;
//         KO win recorded FLAT, no per-language sub-record)
//   section 39D V19 recordAnswer wiring (spy: boss19; Knowledge
//         Counterattack path) + Chrono/Skyroot overlay language
//         propagation (fightBoss sets map lang ko, fight runs Korean)
//   section 39E V18.3 regression (picker still lists all sets, V37/V36,
//         TOTAL_BOSSES 86, Pet System present)
//   section V save schema (no en39 key, no new localStorage key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/touch/speech; innerHTML
// is a plain string, so the pick screen / banner are asserted on the arena
// HTML string and the exposed fight state F, not on painted pixels); the
// live Korean-question wording, win rewards and overlay behaviour are
// Chrome gates (verify-v39c.js), not asserted here; live-browser,
// real-phone and live-Firebase gates stay Chrome/Anh-only.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = 'af3fee2961531da00e06ca6cbb01d25692cb326cd30e3b33288eb51837c938d5';
const EXPECTED_BYTES = 2377535;
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
// test39 body — main() + footer (assembled with the test37.js harness:
// makeLS/makeEl/makeDocument/makeCtx/E/J/loadPage/fireDCL verbatim).
async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v39.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V18.4 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is 2,377,535 B', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('title is V18.4 Korean Bosses', html.includes('<title>Korean &amp; English Vocab Farm V18.4 — Korean Bosses'));
  check('__v39 + 18.4.0 present', html.includes('window.__v39') && html.includes("VERSION='18.4.0'"));
  check('__v33/__v34/__v35/__v36/__v37/__v38 + 17.0.0/17.1.0/18.0.0/18.1.0/18.2.0/18.3.0 still present', html.includes('window.__v33') && html.includes('window.__v34') && html.includes('window.__v35') && html.includes('window.__v36') && html.includes('window.__v37') && html.includes('window.__v38') && html.includes("VERSION='17.0.0'") && html.includes("VERSION='17.1.0'") && html.includes("VERSION='18.0.0'") && html.includes("VERSION='18.1.0'") && html.includes("VERSION='18.2.0'") && html.includes("VERSION='18.3.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0', '18.3.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v39', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v39', styleIds.join(','));
  check('script markers end v39', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v39', scriptIds.join(','));
  check('v39js after v38js', html.indexOf('id="v39js"') > html.indexOf('id="v38js"'));
  check('no v40 marker (no unshipped layer)', !html.includes('id="v40"') && !html.includes('id="v40js"'));
  for (const m of ['armV27Obs', 'rearmObserver', '_speakXp', 'V29 (F-05)']) {
    check(`out-of-scope marker absent: ${m}`, !html.includes(m));
  }
  // V39 fragments (one per replacement).
  check('R-V39-V18-KOCOUNT present', html.includes('function koCount18(){'));
  check('R-V39-V18-BANNER condition present', html.includes('koCount18()<8'));
  check("R-V39-V18-BANNER text present", html.includes("F.banner='⚠️ Bạn mới có '+koCount18()"));
  check("R-V39-V18-MARKKO recordAnswer present", html.includes("recordAnswer('ko',k.id,ok,'boss18')"));
  check("R-V39-V19-MARKKO19 recordAnswer present", html.includes("recordAnswer('ko',k.id,ok,'boss19')"));
  check('R-V39-V18-CALL-TRUE present', html.includes('markKO(true,F.cur.k)'));
  check('R-V39-V18-CALL-FALSE present', html.includes('markKO(false,F.cur.k)'));
  check('R-V39-V19-CALL-CA present', html.includes('markKO19(ok,F.cur.k)'));
  check('R-V39-V19-CALL-TRUE present', html.includes('markKO19(true,F.cur.k)'));
  check('R-V39-V19-CALL-FALSE present', html.includes('markKO19(false,F.cur.k)'));
  check('old markKO(ok) signature gone', countOcc(html, 'function markKO(ok){') === 0);
  check('old markKO19(ok) signature gone', countOcc(html, 'function markKO19(ok){') === 0);
  check('old markKO(true) call gone', countOcc(html, 'markKO(true);') === 0);
  check('old markKO(false) call gone', countOcc(html, 'markKO(false);') === 0);
  check('old markKO19(ok) call gone', countOcc(html, 'markKO19(ok);') === 0);
  check('old markKO19(true) call gone', countOcc(html, 'markKO19(true);') === 0);
  check('old markKO19(false) call gone', countOcc(html, 'markKO19(false);') === 0);
  check('stale V18 header comment gone', !html.includes('KO answers only touch en18.koStats'));
  check('stale V19 header comment gone', !html.includes('KO answers only touch en19.koStats'));
  // Data flip counts (whole file + v18data block).
  check("lang:'both' total is 31 (30 in v18data + 1 V19 factory)", countOcc(html, "lang:'both'") === 31, countOcc(html, "lang:'both'"));
  check("lang:'en' total is 14 (10 old-arena + 2 en19 defaults + 2 overlay ST)", countOcc(html, "lang:'en'") === 14, countOcc(html, "lang:'en'"));
  const d18blk = html.match(/<script id="v18data">([\s\S]*?)<\/script>/)[1];
  check("v18data block: lang:'both' is 30 (20 flipped + 10 Elemental)", countOcc(d18blk, "lang:'both'") === 30, countOcc(d18blk, "lang:'both'"));
  check("v18data block: lang:'en' is 10 (old arena only)", countOcc(d18blk, "lang:'en'") === 10, countOcc(d18blk, "lang:'en'"));
  check("v18data block: 10 old-arena bosses", countOcc(d18blk, "arena:'old'") === 10);
  check("v18data block: every lang:'en' line is an old-arena line", d18blk.split('\n').filter(l => l.includes("lang:'en'")).every(l => l.includes("arena:'old'")));
  // v18_data.js differs from the pristine backup ONLY in the lang field.
  const d18src = fs.readFileSync(path.join(ROOT, 'src', 'v18_data.js'), 'utf-8');
  const d18pristine = fs.readFileSync(path.join(ROOT, 'tools', 'v39', 'backup-v18.3', 'src__v18_data.js'), 'utf-8');
  const normLang = (s) => s.replace(/lang:'(en|both)'/g, "lang:'X'");
  check('src/v18_data.js differs from pristine ONLY in lang values', normLang(d18src) === normLang(d18pristine));
  check('inlined v18data block is newline + src/v18_data.js + newline', d18blk === '\n' + d18src + '\n');
  // V38 fragments survive (spot-checks, one per group).
  for (const frag of ['topics:topics,lessons:lessons,topicName:topicName,scopeName:scopeName,', 'function bossLibChange(){', 'function bossSubHTML(lib,sc){', 'function bossSubPick(el){', 'function bossSelectedSub(attr){', 'id="v22bs-lib" onchange="__v22.bossLibChange()"', "{v:'oxford',n:'Oxford 3000'}", "bossSelectedSub('t')", "bossSelectedSub('s')"]) {
    check(`V38 fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
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
  check('v39 layer files present in DIR', fs.existsSync(path.join(DIR, 'v39.js')) && fs.existsSync(path.join(DIR, 'v39.css')));
  for (const f of ['v18_data.js', 'v18.js', 'v19.js']) {
    const a = fs.readFileSync(path.join(ROOT, 'src', f), 'utf-8');
    const b = fs.existsSync(path.join(DIR, f)) ? fs.readFileSync(path.join(DIR, f), 'utf-8') : '';
    check(`src/${f} agrees with out/${f}`, a === b);
  }
  check('src/v39.js agrees with out/v39.js', fs.readFileSync(path.join(ROOT, 'src', 'v39.js'), 'utf-8') === fs.readFileSync(path.join(DIR, 'v39.js'), 'utf-8'));
  check('src/v39.css agrees with out/v39.css', fs.readFileSync(path.join(ROOT, 'src', 'v39.css'), 'utf-8') === fs.readFileSync(path.join(DIR, 'v39.css'), 'utf-8'));

  // ================= §L page load (vm, real inline scripts) =================
  section('§L', 'page load (vm, real inline scripts)');
  const ctx = makeCtx();
  dynIds.add('v15body');
  dynIds.add('v27body');
  dynIds.add('v19zonedetail');
  dynIds.add('v18fight');
  dynIds.add('v19fight');
  dynIds.add('v18colldetail');
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
  if (loaded.loadErr) { console.log(`\ntest39 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15/__v17/__v22/__v27/__v39 present',
    E(ctx, `!!window.__v15 && !!window.__v17 && !!window.__v22 && !!window.__v27 && !!window.__v39`));
  check('__v39.version is 18.4.0', E(ctx, `window.__v39.version`) === '18.4.0');
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

  // ================= §39A data flip — all 30 V18 bosses offer the pick =================
  section('§39A', 'data flip — runtime boss data + pick screen');
  // Fresh save: 20 KO seed cards. Keep a copy to restore after the 5-card tests.
  const seedCards = J(ctx, `JSON.stringify(S.cards)`);
  const seedCount = E(ctx, `S.cards.length`);
  check('fresh save has 20 KO seed cards', seedCount === 20, seedCount);
  const seedDeck = seedCards.length ? seedCards[0].d : '';
  check('seed cards carry a deck name (for the Break-meter test)', typeof seedDeck === 'string' && seedDeck.length > 0, seedDeck);
  const b18 = J(ctx, `JSON.stringify({
    en: window.__V18_BOSSES.en.map(function(b){return {id:b.id,lang:b.lang,arena:b.arena,mode:b.mode}}),
    el: window.__V18_BOSSES.el.map(function(b){return {id:b.id,lang:b.lang,arena:b.arena}}),
    leg: window.__V18_BOSSES.leg.map(function(b){return {id:b.id,lang:b.lang,arena:b.arena}}),
    old: window.__V18_BOSSES.old.map(function(b){return {id:b.id,lang:b.lang,arena:b.arena}})
  })`);
  check('Challenge arena: 10 bosses, all lang both', b18.en.length === 10 && b18.en.every(function (b) { return b.lang === 'both'; }), b18.en);
  check('Elemental arena: 10 bosses, all lang both', b18.el.length === 10 && b18.el.every(function (b) { return b.lang === 'both'; }), b18.el);
  check('Legendary arena: 10 bosses, all lang both', b18.leg.length === 10 && b18.leg.every(function (b) { return b.lang === 'both'; }), b18.leg);
  check('Old arena: 10 bosses, all lang en (untouched)', b18.old.length === 10 && b18.old.every(function (b) { return b.lang === 'en'; }), b18.old);
  // Deep-compare vs the pristine backup: every boss field except lang identical.
  let pristineOK = false, pristineErr = '';
  try {
    const ctx2 = vm.createContext({ window: {}, console });
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'tools', 'v39', 'backup-v18.3', 'src__v18_data.js'), 'utf-8'), ctx2);
    const p18 = ctx2.window.__V18_BOSSES;
    // Compare in the main ctx (same-shape data, JSON round-trip).
    const cur = J(ctx, `JSON.stringify({
      en: window.__V18_BOSSES.en, el: window.__V18_BOSSES.el,
      leg: window.__V18_BOSSES.leg, old: window.__V18_BOSSES.old })`);
    const stripAll = (o) => { const r = {}; for (const k of ['en', 'el', 'leg', 'old']) r[k] = o[k].map(function (b) { const c = Object.assign({}, b); delete c.lang; return c; }); return r; };
    pristineOK = JSON.stringify(stripAll(p18)) === JSON.stringify(stripAll(cur));
  } catch (e) { pristineErr = String(e); }
  check('no other boss data changed (ids/hp/rewards/unlocks/skills identical to pristine backup, lang excluded)', pristineOK === true, pristineErr);
  // Collection detail language line (v18.js:206 ternary).
  const leg0 = b18.leg[0].id, old0 = b18.old[0].id;
  const dragon = b18.en.find(function (b) { return b.mode === 'grammar'; });
  const langLines = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.collDetail('v10_slime');
      var h=document.getElementById('v18colldetail'); out.slime=h?String(h.innerHTML||''):null;
      window.__v18.collDetail('${leg0}');
      out.leg=h?String(h.innerHTML||''):null;
      window.__v18.collDetail('${old0}');
      out.old=h?String(h.innerHTML||''):null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('Challenge boss card says "Anh / Hàn (chọn trước trận)"', (langLines.slime || '').indexOf('Anh / Hàn (chọn trước trận)') >= 0, langLines);
  check('Legendary boss card says "Anh / Hàn (chọn trước trận)"', (langLines.leg || '').indexOf('Anh / Hàn (chọn trước trận)') >= 0, langLines);
  check('Old-arena boss card still says "Tiếng Anh"', (langLines.old || '').indexOf('Ngôn ngữ: Tiếng Anh') >= 0, langLines);
  // Pick screen: fight(id) with no lang must NOT start a fight.
  const pickSlime = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_slime');
      var h=document.getElementById('v18fight'); out.html=h?String(h.innerHTML||''):null;
      out.Fnull=window.__v18._test.F()===null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('Challenge boss with no lang: pick screen shown, no fight started', pickSlime.Fnull === true && (pickSlime.html || '').indexOf('🇰🇷 Tiếng Hàn') >= 0, pickSlime);
  check('pick screen KO button calls fight(id, ko)', (pickSlime.html || '').indexOf("__v18.fight('v10_slime','ko')") >= 0, pickSlime);
  check('pick screen EN button calls fight(id, en)', (pickSlime.html || '').indexOf("__v18.fight('v10_slime','en')") >= 0, pickSlime);
  // Grammar-mode Challenge boss (Rồng Ngữ Pháp): seed the two previous wins first.
  E(ctx, `(function(){ var e=window.__v18.en18(); e.bosses['v10_slime']={win:1,wins:1,at:Date.now()}; e.bosses['v10_goblin']={win:1,wins:1,at:Date.now()}; })()`);
  const pickDragon = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('${dragon.id}');
      var h=document.getElementById('v18fight'); out.html=h?String(h.innerHTML||''):null;
      out.Fnull=window.__v18._test.F()===null;
      window.__v18.fight('${dragon.id}','ko');
      var F=window.__v18._test.F();
      out.lang=F&&F.lang; out.qmode=F&&F.qmode;
      out.hasK=!!(F&&F.cur&&F.cur.k); out.hasW=!!(F&&F.cur&&F.cur.w);
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('grammar-mode Challenge boss shows the pick screen too', pickDragon.Fnull === true && (pickDragon.html || '').indexOf('🇰🇷 Tiếng Hàn') >= 0, pickDragon);
  check('grammar-mode KO fight maps grammar to Korean mc (qmode mc, cur.k)', pickDragon.lang === 'ko' && pickDragon.qmode === 'mc' && pickDragon.hasK === true && pickDragon.hasW === false, pickDragon);
  // Legendary boss: seed 5 Elemental wins to unlock it.
  E(ctx, `(function(){ var e=window.__v18.en18(); window.__V18_BOSSES.el.slice(0,5).forEach(function(b){ e.bosses[b.id]={win:1,wins:1,at:Date.now()}; }); })()`);
  const pickLeg = E(ctx, `(function(){
    var out={};
    try{
      window.__v18._test.close(); // the dragon KO fight from the previous check still holds F
      out.unlocked=window.__v18.bossUnlocked(window.__V18_BOSSES.leg[0]);
      window.__v18.fight('${leg0}');
      var h=document.getElementById('v18fight'); out.html=h?String(h.innerHTML||''):null;
      out.Fnull=window.__v18._test.F()===null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('Legendary boss unlocks after 5 Elemental wins (unlock chain unchanged)', pickLeg.unlocked === true, pickLeg);
  check('Legendary boss shows the pick screen too', pickLeg.Fnull === true && (pickLeg.html || '').indexOf('🇰🇷 Tiếng Hàn') >= 0, pickLeg);

  // ================= §39B V18 <8 KO banner =================
  section('§39B', 'V18 <8 KO warning banner (V19 parity)');
  E(ctx, `S.cards = ${JSON.stringify(seedCards.slice(0, 5))}`);
  check('seeded save now has 5 KO cards', E(ctx, `S.cards.length`) === 5);
  const five18 = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_slime','ko');
      var F=window.__v18._test.F();
      out.lang=F&&F.lang; out.banner=F?F.banner:null;
      out.hasK=!!(F&&F.cur&&F.cur.k); out.hasW=!!(F&&F.cur&&F.cur.w);
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('V18 KO fight, 5 cards: banner shows exactly 5/8', five18.banner === '⚠️ Bạn mới có 5/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.', five18);
  check('V18 KO fight, 5 cards: falls back to English (cur.w, no cur.k)', five18.lang === 'ko' && five18.hasW === true && five18.hasK === false, five18);
  const five18EN = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_slime','en');
      var F=window.__v18._test.F();
      out.banner=F?F.banner:null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('V18 EN fight, 5 cards: NO banner', five18EN.banner === null, five18EN);
  const five19 = E(ctx, `(function(){
    var out={};
    try{
      window.__v19.openMapFor('ko');
      window.__v19.fight('v11_fireking');
      var F=window.__v19._test.F();
      out.lang=F&&F.lang; out.banner=F?F.banner:null;
      out.hasK=!!(F&&F.cur&&F.cur.k); out.hasW=!!(F&&F.cur&&F.cur.w);
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('V19 KO fight, 5 cards: banner shows exactly 5/8 (precedent)', five19.banner === '⚠️ Bạn mới có 5/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.', five19);
  check('V19 KO fight, 5 cards: falls back to English', five19.lang === 'ko' && five19.hasW === true && five19.hasK === false, five19);
  E(ctx, `S.cards = ${JSON.stringify(seedCards)}`);
  check('restored save has 20 KO cards again', E(ctx, `S.cards.length`) === 20);
  const twenty18 = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_slime','ko');
      var F=window.__v18._test.F();
      out.banner=F?F.banner:null;
      out.hasK=!!(F&&F.cur&&F.cur.k); out.hasW=!!(F&&F.cur&&F.cur.w);
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('V18 KO fight, 20 cards: NO banner', twenty18.banner === null, twenty18);
  check('V18 KO fight, 20 cards: Korean question (cur.k, no cur.w)', twenty18.hasK === true && twenty18.hasW === false, twenty18);
  const twenty19 = E(ctx, `(function(){
    var out={};
    try{
      window.__v19.openMapFor('ko');
      window.__v19.fight('v11_fireking');
      var F=window.__v19._test.F();
      out.banner=F?F.banner:null;
      out.hasK=!!(F&&F.cur&&F.cur.k); out.hasW=!!(F&&F.cur&&F.cur.w);
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('V19 KO fight, 20 cards: NO banner, Korean question', twenty19.banner === null && twenty19.hasK === true && twenty19.hasW === false, twenty19);

  // ================= §39C V18 recordAnswer wiring + Break meter + KO win =================
  section('§39C', 'V18 KO answers reach Smart Learning (spy on recordAnswer)');
  E(ctx, `(function(){
    window.__T39 = { calls: [] };
    var orig = window.__v27.recordAnswer;
    window.__T39.orig = orig;
    window.__v27.recordAnswer = function(lang,id,ok,mode){ window.__T39.calls.push([lang,id,ok,mode]); try{ return orig(lang,id,ok,mode); }catch(e){} };
  })()`);
  // A deck must be selected for the V34 KO Break meter (koDeckSet = !!S.deck).
  E(ctx, `S.deck = ${JSON.stringify(seedDeck)}`);
  const ko1 = E(ctx, `(function(){
    var out={};
    try{
      var before=window.__v18.en18().koStats.right;
      window.__v18.fight('v10_slime','ko');
      var F=window.__v18._test.F();
      out.kid=F&&F.cur&&F.cur.k?F.cur.k.id:null;
      out.weakKind=F&&F.weak?F.weak.kind:null;
      out.brkBefore=F?F.brk:null;
      out.picked=window.__v18._test.pickCorrect();
      var F2=window.__v18._test.F();
      out.brkAfter=F2?F2.brk:null;
      out.koRightAfter=window.__v18.en18().koStats.right;
      out.koRightBefore=before;
      var d=window.__v27.en27();
      out.rec={ right:(d.ko.right[out.kid]||0), cr:(d.ko.cr[out.kid]||0), last:!!d.ko.last[out.kid] };
      out.calls=window.__T39.calls.filter(function(c){ return c[1]===out.kid; });
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('V18 KO fight: weakness kind is ko', ko1.weakKind === 'ko', ko1);
  check('V18 KO correct: Break meter fills +1 (deck selected)', ko1.brkBefore === 0 && ko1.brkAfter === 1, ko1);
  check('V18 KO correct: recordAnswer called exactly once (ko, id, true, boss18)', ko1.calls.length === 1 && ko1.calls[0][0] === 'ko' && ko1.calls[0][2] === true && ko1.calls[0][3] === 'boss18', ko1);
  check('V18 KO correct: en27().ko.right[id] is 1', ko1.rec.right === 1, ko1);
  check('V18 KO correct: en27().ko.cr[id] is 1 and last set', ko1.rec.cr === 1 && ko1.rec.last === true, ko1);
  check('V18 KO correct: en18().koStats.right +1', ko1.koRightAfter === ko1.koRightBefore + 1, ko1);
  const ko2 = E(ctx, `(function(){
    var out={};
    try{
      window.__v18._test.next();
      var F=window.__v18._test.F();
      out.kid=F&&F.cur&&F.cur.k?F.cur.k.id:null;
      out.picked=window.__v18._test.pickWrong();
      var d=window.__v27.en27();
      out.rec={ wrong:(d.ko.wrong[out.kid]||0), cw:(d.ko.cw[out.kid]||0) };
      out.calls=window.__T39.calls.filter(function(c){ return c[1]===out.kid; });
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('V18 KO wrong: recordAnswer called exactly once (ko, id, false, boss18)', ko2.calls.length === 1 && ko2.calls[0][0] === 'ko' && ko2.calls[0][2] === false && ko2.calls[0][3] === 'boss18', ko2);
  check('V18 KO wrong: en27().ko.wrong/cw are 1', ko2.rec.wrong === 1 && ko2.rec.cw === 1, ko2);
  const en1 = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_slime','en');
      var F=window.__v18._test.F();
      out.wid=F&&F.cur&&F.cur.w?F.cur.w.id:null;
      window.__v18._test.pickCorrect();
      var d=window.__v27.en27();
      out.enCr=(d.en.cr[out.wid]||0);
      out.koHasWid=!!(d.ko.right[out.wid]||d.ko.wrong[out.wid]||d.ko.last[out.wid]);
      out.calls=window.__T39.calls.filter(function(c){ return c[1]===out.wid; });
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('V18 EN correct: recordAnswer called exactly once (en, id, true, boss18)', en1.calls.length === 1 && en1.calls[0][0] === 'en' && en1.calls[0][2] === true && en1.calls[0][3] === 'boss18', en1);
  check('V18 EN correct: en27().en.cr[id] is 1', en1.enCr === 1, en1);
  check('V18 EN correct: en27().ko has NO record for the EN word id', en1.koHasWid === false, en1);
  // KO win: slime HP 70, ~14-22 dmg per correct answer → ~5 hits.
  const kowin = E(ctx, `(function(){
    var out={n:0};
    try{
      window.__v18.fight('v10_slime','ko');
      var guard=0;
      while(guard++<15){
        var F=window.__v18._test.F();
        if(!F||F.over)break;
        if(!window.__v18._test.pickCorrect()){ out.pickFail=true; break; }
        out.n++;
        var F2=window.__v18._test.F();
        if(F2&&F2.over)break;
        window.__v18._test.next();
      }
      var F3=window.__v18._test.F();
      out.over=F3?F3.over:null;
      var rec=window.__v18.en18().bosses['v10_slime']||{};
      out.won=!!rec.win; out.wins=rec.wins||0;
      out.flat=!('en' in rec) && !('ko' in rec);
      out.koRight=window.__v18.en18().koStats.right;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('V18 KO win: fight ends win after correct answers', kowin.over === 'win', kowin);
  check('V18 KO win: flat win recorded (win + wins>=1)', kowin.won === true && kowin.wins >= 1, kowin);
  check('V18 KO win: win record is FLAT (no per-language en/ko sub-record)', kowin.flat === true, kowin);
  check('V18 KO win: koStats.right grew by exactly the correct answers (1 earlier + n in the loop)', kowin.koRight === 1 + kowin.n, kowin);

  // ================= §39D V19 recordAnswer + counterattack + overlay propagation =================
  section('§39D', 'V19 KO answers reach Smart Learning + overlays propagate ko');
  const ko19 = E(ctx, `(function(){
    var out={};
    try{
      window.__v19.openMapFor('ko');
      window.__v19.fight('v11_fireking');
      var F=window.__v19._test.F();
      out.kid=F&&F.cur&&F.cur.k?F.cur.k.id:null;
      out.lang=F&&F.lang;
      window.__v19._test.pickCorrect();
      var d=window.__v27.en27();
      out.rec={ right:(d.ko.right[out.kid]||0) };
      out.calls=window.__T39.calls.filter(function(c){ return c[1]===out.kid && c[3]==='boss19'; });
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('V19 KO fight runs in Korean', ko19.lang === 'ko' && !!ko19.kid, ko19);
  check('V19 KO correct: recordAnswer called exactly once (ko, id, true, boss19)', ko19.calls.length === 1 && ko19.calls[0][0] === 'ko' && ko19.calls[0][2] === true, ko19);
  check('V19 KO correct: en27().ko.right[id] incremented', ko19.rec.right >= 1, ko19);
  // Knowledge Counterattack path: force phase 2 + low HP so the next
  // correct answer triggers the Ultimate (checkPhase: phase 2 & hp<=20%).
  const ca19 = E(ctx, `(function(){
    var out={};
    try{
      window.__v19.openMapFor('ko');
      window.__v19.fight('v11_fireking');
      var F=window.__v19._test.F();
      out.maxHp=F?F.maxHp:null;
      F.hp=Math.floor(F.maxHp*0.45);
      window.__v19._test.pickCorrect();
      window.__v19._test.next();
      var F2=window.__v19._test.F();
      F2.hp=Math.floor(F2.maxHp*0.15);
      window.__v19._test.pickCorrect();
      var F3=window.__v19._test.F();
      out.ultActive=F3?!!F3.ultActive:null;
      out.phase=F3?F3.phase:null;
      if(F3&&F3.ultActive){
        window.__v19._test.next();
        var F4=window.__v19._test.F();
        out.caQmode=F4?F4.qmode:null;
        out.caKid=F4&&F4.cur&&F4.cur.k?F4.cur.k.id:null;
        out.caHasK=!!(F4&&F4.cur&&F4.cur.k);
        window.__v19._test.pickCorrect();
        var d=window.__v27.en27();
        out.caRec=(d.ko.right[out.caKid]||0);
        out.caCalls=window.__T39.calls.filter(function(c){ return c[1]===out.caKid && c[3]==='boss19'; });
      }
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  if (ca19.ultActive === true && ca19.caHasK === true) {
    check('V19 counterattack triggers at <=20% HP in phase 2', true);
    check('V19 counterattack asks a Korean question (ca-*, cur.k)', typeof ca19.caQmode === 'string' && ca19.caQmode.indexOf('ca-') === 0, ca19);
    check('V19 counterattack correct: recordAnswer (ko, id, true, boss19) once', ca19.caCalls && ca19.caCalls.length === 1 && ca19.caCalls[0][0] === 'ko' && ca19.caCalls[0][2] === true, ca19);
    check('V19 counterattack correct: en27().ko.right[id] incremented', ca19.caRec >= 1, ca19);
  } else {
    skipCheck('V19 counterattack path (Ultimate did not trigger in the stub — live Chrome gate covers it)', 'stub could not force phase 2 + <=20% HP: ' + JSON.stringify(ca19));
  }
  // Overlay language propagation: seed the gates, spy on setLang.
  E(ctx, `(function(){
    var e19=window.__v19.en19();
    e19.bosses['v17_geargolem']=e19.bosses['v17_geargolem']||{};
    e19.bosses['v17_geargolem'].ko={win:1,wins:1,at:Date.now()};
    var e18=window.__v18.en18();
    window.__V18_BOSSES.en.concat(window.__V18_BOSSES.el,window.__V18_BOSSES.leg,window.__V18_BOSSES.old).forEach(function(b){ e18.bosses[b.id]={win:1,wins:1,at:Date.now()}; });
    window.__V19_DATA.bosses.forEach(function(b){ e19.bosses[b.id]=e19.bosses[b.id]||{}; e19.bosses[b.id].en={win:1,wins:1,at:Date.now()}; });
  })()`);
  check('Chrono gate opens after seeding 70 wins', E(ctx, `window.__v33.correctedWinCount()`) >= 70, E(ctx, `window.__v33.correctedWinCount()`));
  check('Skyroot gate opens for ko after GEAR GOLEM ko win', E(ctx, `window.__v35.gateOpen('ko')`) === true);
  E(ctx, `(function(){
    window.__T39.setLangCalls=[];
    var orig=window.__v19.setLang;
    window.__T39.origSetLang=orig;
    window.__v19.setLang=function(l){ window.__T39.setLangCalls.push(l); return orig(l); };
  })()`);
  const sky = E(ctx, `(function(){
    var out={};
    try{
      window.__T39.setLangCalls.length=0;
      window.__v35.openSkyroot('ko');
      var id=window.__v35._test.SKYROOT_IDS[0];
      out.id=id;
      window.__v35.fightBoss(id);
      var F=window.__v19._test.F();
      out.lang=F&&F.lang;
      out.hasK=!!(F&&F.cur&&F.cur.k);
      out.setLangCalls=window.__T39.setLangCalls.slice();
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('Skyroot KO overlay: fightBoss sets the map lang to ko', sky.setLangCalls.indexOf('ko') >= 0, sky);
  check('Skyroot KO overlay: fight runs in Korean (cur.k)', sky.lang === 'ko' && sky.hasK === true, sky);
  const chr = E(ctx, `(function(){
    var out={};
    try{
      window.__T39.setLangCalls.length=0;
      window.__v33.openChrono('ko');
      var id=window.__v33._test.CHRONO_IDS[0];
      out.id=id;
      window.__v33.fightBoss(id);
      var F=window.__v19._test.F();
      out.lang=F&&F.lang;
      out.hasK=!!(F&&F.cur&&F.cur.k);
      out.setLangCalls=window.__T39.setLangCalls.slice();
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('Chrono KO overlay: fightBoss sets the map lang to ko', chr.setLangCalls.indexOf('ko') >= 0, chr);
  check('Chrono KO overlay: fight runs in Korean (cur.k)', chr.lang === 'ko' && chr.hasK === true, chr);
  // Restore the spies (recordAnswer + setLang) before the save-schema section.
  E(ctx, `(function(){ if(window.__T39.orig)window.__v27.recordAnswer=window.__T39.orig; if(window.__T39.origSetLang)window.__v19.setLang=window.__T39.origSetLang; })()`);

  // ================= §39E V18.3 regression =================
  section('§39E', 'V18.3 regression — picker, layers, pets');
  const arena0 = E(ctx, `(function(){
    var out={};
    try{ window.__v15.choose('en'); window.__v18.openArena('en'); }catch(e){ out.err=String(e); }
    try{ var h=document.getElementById('v15body'); out.html=h?String(h.innerHTML||''):null; }catch(e){ out.htmlErr=String(e); }
    return out;
  })()`);
  check('openArena renders without error', !arena0.err, arena0);
  const h0 = arena0.html || '';
  const optIdx = ['<option value=""', '<option value="a1a2"', '<option value="oxford"', '<option value="chrono"', '<option value="skyroot"', '<option value="all"', '<option value="units"'].map(s => h0.indexOf(s));
  check('V18.3 picker still lists all 7 lib options in order', optIdx.every(i => i >= 0) && optIdx.slice(1).every((v, i) => v > optIdx[i]), optIdx);
  check('V18.3 picker still shows the V38 sub-picker controls', h0.indexOf('id="v22bs-lib"') >= 0 && h0.indexOf('id="v22bs-sub"') >= 0, h0);
  check('V39 layer present (__v39 18.4.0)', E(ctx, `!!window.__v39 && window.__v39.version==='18.4.0'`));
  check('V38 layer still present (__v38 18.3.0)', E(ctx, `!!window.__v38 && window.__v38.version==='18.3.0'`));
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
  check('Pet System still present (__v23)', E(ctx, `!!window.__v23`));
  check('V18 bossUnlocked still language-agnostic (flat wins unlock)', E(ctx, `window.__v18.bossUnlocked(window.__V18_BOSSES.leg[0])===true`));

  // ================= §R V18.2 regression =================
  section('§R', 'V18.3 regression — gates, fragments, probe set');
  check('V39 layer present (__v39 18.4.0)', E(ctx, `!!window.__v39 && window.__v39.version==='18.4.0'`));
  check('V38 layer still present (__v38 18.3.0)', E(ctx, `!!window.__v38 && window.__v38.version==='18.3.0'`));
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
      // §39E leaves the arena open — clear any scope first (test38's flow
      // ended with clears too), then flush explicitly: the V20 save
      // wrapper debounces 0.8s, so the persisted snapshot would
      // otherwise reflect stale pre-clear state.
      try{ window.__v15.clearScope(); }catch(e){}
      try{ if(window.__v20&&__v20.flush)__v20.flush(); }catch(e){}
      var s=JSON.parse(localStorage.getItem('hanvocab.v1')||'{}');
      out.hasV39=!!(s.v7&&s.v7.en39);
      out.hasEn15Scope=!!(s.v7&&s.v7.en15);
      out.scopeAfterTests=(s.v7&&s.v7.en15)?(s.v7.en15.scope||null):'n/a';
    }catch(e){ out.err=String(e); }
    var keys=[]; for(var i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));
    out.lsKeys=keys.sort();
    return out;
  })())`);
  check('no new en39 save key (V39 adds nothing to the save)', sav.hasV39 === false, sav);
  check('scope is null in the saved state after the clear tests', sav.scopeAfterTests === null, sav);
  check('no new localStorage key from V39 (only hanvocab.* keys)', sav.lsKeys.every(function (k) { return k.indexOf('hanvocab.') === 0; }), sav.lsKeys);

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('pick screen renders in the real DOM (44px buttons, layout)', 'needs real Chrome — see verify-v39c.js');
  skipCheck('KO fight asks Korean questions only (Hangul word + 🇰🇷 header, live)', 'needs real Chrome — see verify-v39c.js');
  skipCheck('KO win pays the reward once, live (XP/gems/item/title)', 'needs real Chrome — see verify-v39c.js');
  skipCheck('V19 Knowledge Counterattack in a live KO fight (if the vm probe skipped it)', 'needs real Chrome — see verify-v39c.js');
  skipCheck('Chrono/Skyroot KO-overlay boss fights use Korean, live', 'needs real Chrome — see verify-v39c.js');
  skipCheck('360px viewport: no horizontal overflow, all controls ≥44px', 'needs real Chrome — see verify-v39c.js');
  skipCheck('live Firebase login/sync', 'never tested live in any version — Anh must run the FIREBASE_SETUP.md checklist');
  skipCheck('real phone touch / Safari', 'needs Anh\'s real-phone test');

  // ================= footer =================
  const total = pass + fail + skip;
  console.log(`\ntest39: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('test39 crashed:', e); process.exit(2); });
