// test46.js - V19.0.1 (layer V46) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v44/test44.js (same lines 34-204); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V19.0 build.
// Usage: node tools/v45/test45.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V45 fragments,
//         OLD due lines / OLD load() / OLD enIcon() / OLD snapshot key
//         GONE, legDiff def + thresholds + C-R2-1 deliberately unchanged,
//         V44/V43/V42/V41 fragments survive)
//   section L page load (vm, real inline scripts) + __v45 + exports
//   section 45A due counts — fresh save 0 due; seeded 0 truly-due -> 0;
//         seeded 3 truly-due -> 3; box-5 past-due NOT counted; BT attach
//         does not inflate due
//   section 45B Review session — 0 truly-due shows the honest empty
//         state (no silent fallback to all words); 3 truly-due reviews
//         only those 3 (no box-0 words)
//   section 45C corrupt / card-less save — quarantined byte-exact in vm
//         (bad-json + no-cards), __V45_CORRUPT + __v45corruptShown set;
//         valid save boots normally, nothing quarantined
//   section 45D snapshot keys unique under faked same-ms Date.now()
//   section 45E enIcon guard — no <img> without an icon; topics carry
//         no 'undefined' icon URL
//   section 45F weakchip static contrast — light #7A5B00 on #FFFAEB
//         6.05:1 (was 1.33:1), dark gold kept >=4.5:1; V43 fight rules
//         untouched
//   section 45L leads — restoreRaw size-check first, speedHatch no
//         gem spend on a ready hatch, deleteHistoryEntry deletes one
//   section 44A pool identity — the Legendary pool (sorted word + grammar
//         ids, levels, legDiff) is IDENTICAL between the pristine V18.9
//         build and the V19.0 build at mastered = 0 / 250 / 700, in vm
//   section 44B vm Legendary fight starts (EN + KO) + V18.5 C-02 pet-skill
//         shield halving + V18.6 V19 Counterattack 3/3
//   section 44F V43 fight render still holds (V19 + V18 KO fights emit
//         the fixed classes)
//   section 44R V18.8 regression (V42/V41 fixes still hold on V19.0)
//   section V save schema (no en45 key, no new localStorage key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint; the freeze
// itself is a main-thread timing effect, so it is measured in real
// Chrome by repro-v45.js / verify-v45c.js, not here); the painted
// fight, the real click + answer states, the 360px overflow check,
// the full end-to-end fight win, and the per-question-type screens
// are Chrome gates, not asserted here; live-browser, real-phone and
// live-Firebase gates stay Chrome/Anh-only.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = 'd3d27cdab865befb1aaa495856b561f34520f9607dcdfdeb025a661b765de271';
const EXPECTED_BYTES = 2449080;
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
// test46.js - V19.0.1 (layer V46) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v45/test45.js (same lines 34-204); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V19.0.1 build.
// Usage: node tools/v46/test46.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V46 fragments,
//         OLD legDiff def + OLD mark blocks GONE, thresholds intact,
//         23 weakness overrides, EN fallbacks intact, V33-V45 survive)
//   section L page load (vm, real inline scripts) + __v46 + __V46_DATA exports
//   section 46A legDiff thresholds at mastered 0/199/200/599/600/700 +
//         live Legendary pools (exact levels + counts) + grammar pools +
//         failure path warns and falls back to A2/B1 (never silent)
//   section 46B weakness redesign — recount 0 pool-blocked / 15 distinct
//         at mastered 0/200/600/700; the 23 overrides exact; the other
//         63 bosses unchanged vs the V19.0 table; meter mechanics
//         (breakDmg 3 hits = BREAK) + live scopeBlocked=false spot checks
//   section 46C KO/EN XP parity — shared-function unit rules (box-up,
//         cooldown, streak, wrong=0, hist/daily), live KO fights pay XP
//         in both engines, per-answer rule holds on observed sequences,
//         koStreak + 'ko:' xpAt keys, first-win/replay unchanged
//   section 46D EN XP unchanged vs pristine V19.0 (seeded Math.random,
//         identical drivers on both builds: exact EN fight deltas)
//   section 46E regression spot-checks (V19.0 due counts, corrupt
//         quarantine, enIcon guard, Legendary fight starts, C-02 shield,
//         V19 Counterattack, A-F2 KO<8 banner)
//   section V save schema (no new localStorage key, koStreak inside
//         en18/en19 state only, no en46 key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint); the painted
// fight, real clicks, 360px overflow, full end-to-end fight wins at
// 200/600, and per-question screens are Chrome gates in verify-v46c.js,
// not asserted here; live-browser, real-phone and live-Firebase gates
// stay Chrome/Anh-only.
async function main() {
  // repro-v47.js — REPRO-FIRST probe for C-R3-3 (duplicate headwords).
  // Measures the CURRENT state; asserts nothing about the fix. Run on the
  // pristine V19.0.1 base first, then again on the built V19.2 tree: the
  // numbers below must move exactly as the review predicts.
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  console.log('index.html sha256:', sha, 'bytes:', fs.statSync(htmlPath).size);
  const ctx = makeCtx();
  const loaded = loadPage(ctx, html);
  console.log('inline blocks:', loaded.blocks, 'loadErr:', loaded.loadErr);
  if (loaded.loadErr) process.exit(1);
  fireDCL(ctx);
  E(ctx, `window.__v15.buildWords()`);
  const R = J(ctx, `JSON.stringify((function(){
    var v15=window.__v15, v17=window.__v17, out={};
    var W=v15.words;
    out.wordsTotal=W.length;
    out.countsTotal=v15.counts15().total;
    out.countsMastered=v15.counts15().mastered;
    ['sluggish','orange','trip','devoted'].forEach(function(en){
      var recs=W.filter(function(w){return (w.en||'').toLowerCase()===en});
      out[en]=recs.map(function(w){return {id:w.id,t:w.t,vi:w.vi,lv:w.lv,lib:w.lib,a1a2Topics:w.a1a2Topics,extra:w.extra,oxLessons:w.oxLessons}});
    });
    out.enwordsLen=window.__v14.ENWORDS.length;
    out.rawA1A2=window.__V17_A1A2.length;
    out.a1a2Total=window.__V17_A1A2.length;
    out.a1a2Words=W.filter(function(w){return (w.lib||[]).indexOf('a1a2')>=0}).length;
    out.topics={};
    v17.topics().forEach(function(g){ out.topics[g.name]=g.words.length; });
    out.rawDevoted=window.__V17_A1A2.filter(function(a){return a.en==='devoted'}).map(function(a){return a.no});
    out.rawSluggish=window.__V17_A1A2.filter(function(a){return a.en==='sluggish'}).map(function(a){return a.no});
    out.rawOrange=window.__V17_A1A2.filter(function(a){return a.en==='orange'}).map(function(a){return a.no});
    out.rawTrip=window.__V17_A1A2.filter(function(a){return a.en==='trip'}).map(function(a){return a.no});
    // orange mastered once: learned in how many topics?
    var old=v15.enOld();
    var ow=W.filter(function(w){return w.en==='orange'})[0];
    old.box[ow.id]=5; v15.save15();
    out.orangeTopicsAfterMaster=v17.topics().filter(function(g){return g.words.some(function(w){return w.id===ow.id})}).map(function(g){return g.name});
    out.orangeLearnedTopics=v17.topics().filter(function(g){return g.words.some(function(w){return (old.box[w.id]||0)>=1})}).map(function(g){return g.name});
    out.hasLabelOf=typeof labelOf==='function';
    out.hasV47=!!window.__v47;
    out.twinIds=W.filter(function(w){return (w.id||'').indexOf('a1a2_')===0}).map(function(w){return w.id});
    out.enwordsPairs=window.__v14.ENWORDS.filter(function(r){return ['sluggish','orange','trip','devoted'].indexOf((r[1]||'').toLowerCase())>=0}).map(function(r){return r[1]+' | '+r[2]});
    out.enwordsTwinVi=window.__v14.ENWORDS.filter(function(r){return ['lờ đờ, chậm chạp','màu cam','cuộc du ngoạn, dạo chơi','tận tâm, tận tụy'].indexOf(r[2])>=0}).map(function(r){return r[1]+' | '+r[2]});
    return out;
  })())`);
  console.log(JSON.stringify(R, null, 2));
  console.log('static: guard string present in html?', html.includes("(x.en||'').toLowerCase()!==(w.en||'').toLowerCase()"));
  console.log('static: labelOf present in html?', html.includes('function labelOf'));
  console.log('static: "__v47" present in html?', html.includes('window.__v47'));
  console.log('static: "no": 938 present in html?', html.includes('"no": 938'), '| "no": 351 present?', html.includes('"no": 351'));
  console.log('static: a1a2 raw rows in html:', (html.match(/"src": "a1a2"/g)||[]).length);
  console.log('REPRO DONE');
}
main().catch(e => { console.error('repro crashed:', e); process.exit(2); });
