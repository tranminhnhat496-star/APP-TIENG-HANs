// test45.js - V19.0 ROUND-3 BUG FIXES independent verification (Node vm).
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
const EXPECTED_SHA = 'd5fb0ddcd12a314b0f72a8191ec23b0fa4d04b923aa3dd53404e0ddad8e441bb';
const EXPECTED_BYTES = 2433827;
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


// ================= §0 static: build integrity =================
async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v45.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V19.0 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is the V19.0 size', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('title is V19.0 Round-3 Bug Fixes', html.includes('<title>Korean &amp; English Vocab Farm V19.0 — Round-3 Bug Fixes'));
  check('__v45 + 19.0.0 present', html.includes('window.__v45') && html.includes("VERSION='19.0.0'"));
  check('__v44 + 18.9.0 still present', html.includes('window.__v44') && html.includes("VERSION='18.9.0'"));
  check('__v43 + 18.8.0 still present', html.includes('window.__v43') && html.includes("VERSION='18.8.0'"));
  check('__v33–__v45 + 17.0.0/17.1.0/18.0.0/18.1.0/18.2.0/18.3.0/18.4.0/18.5.0/18.6.0/18.7.0/18.8.0/18.9.0 still present', html.includes('window.__v33') && html.includes('window.__v34') && html.includes('window.__v35') && html.includes('window.__v36') && html.includes('window.__v37') && html.includes('window.__v38') && html.includes('window.__v39') && html.includes('window.__v40') && html.includes('window.__v41') && html.includes('window.__v42') && html.includes('window.__v43') && html.includes('window.__v44') && html.includes('window.__v45') && html.includes("VERSION='17.0.0'") && html.includes("VERSION='17.1.0'") && html.includes("VERSION='18.0.0'") && html.includes("VERSION='18.1.0'") && html.includes("VERSION='18.2.0'") && html.includes("VERSION='18.3.0'") && html.includes("VERSION='18.4.0'") && html.includes("VERSION='18.5.0'") && html.includes("VERSION='18.6.0'") && html.includes("VERSION='18.7.0'") && html.includes("VERSION='18.8.0'") && html.includes("VERSION='18.9.0'") && html.includes("VERSION='19.0.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0', '18.6.0', '18.7.0', '18.8.0', '18.9.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v45', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v45', styleIds.join(','));
  check('script markers end v45', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v45', scriptIds.join(','));
  check('v45js after v44js', html.indexOf('id="v45js"') > html.indexOf('id="v44js"'));
  check('v45 style after v43 style', html.indexOf('id="v45"') > html.indexOf('id="v43"'));
  check("no 'Không có đường tắt' text remaining in the built index.html", !html.includes('Không có đường tắt'));
  // V45 fragments (the fixes).
  check('V45 export object present', html.includes('window.__v45={version:VERSION}'));
  check('V45 v45js marker present x1', countOcc(html, 'id="v45js"') === 1);
  check('V45 v45 style marker present x1', countOcc(html, 'id="v45"') === 1);
  check('V45 marker files ship in out/ (v45.js + v45.css)', fs.existsSync(path.join(DIR, 'v45.js')) && fs.existsSync(path.join(DIR, 'v45.css')));
  // C-R3-1: NEW due fragments present (one per site).
  check('C-R3-1 counts15 uses box 1-4', html.includes("if(b>=1&&b<=4&&(e.due[w.id]||0)<=now)c.due++;"));
  check('C-R3-1 BT inScope15 status filter uses box 1-4', html.includes("if(sc.status==='due'&&((old2.box[w.id]||0)<1||(old2.box[w.id]||0)>4||(e2.due[w.id]||0)>Date.now()))return false;"));
  check('C-R3-1 wordsFiltered status filter uses box 1-4', html.includes("if(sc.status==='due'&&((old.box[w.id]||0)<1||(old.box[w.id]||0)>4||(e.due[w.id]||0)>Date.now()))return false;"));
  check('C-R3-1 wordsFiltered onlyDue uses box 1-4', html.includes("if(o.onlyDue){var _b45=(old.box[w.id]||0);if(_b45<1||_b45>4||(e.due[w.id]||0)>Date.now())return false}"));
  check('C-R3-1 reviewHTML due list uses box 1-4', html.includes("var due=WORDS.filter(function(w){var _b45=(_o45.box[w.id]||0);return inScope15(w)&&_b45>=1&&_b45<=4&&(e.due[w.id]||0)<=now});"));
  check('C-R3-1 reviewStart due list uses box 1-4', html.includes("else list=WORDS.filter(function(w){var _b45=(_o45.box[w.id]||0);return inScope15(w)&&_b45>=1&&_b45<=4&&(e.due[w.id]||0)<=now});"));
  check('C-R3-1 v17 statsOf uses box 1-4', html.includes("if(b>=1&&b<=4&&(e.due[w.id]||0)<=now)s.due++;"));
  check('C-R3-1 v17 filterWords uses box 1-4', html.includes("if(V.status==='due'&&(b<1||b>4||(e.due[w.id]||0)>now))return false;"));
  check('C-R3-1 v22 unitStats uses box 1-4', html.includes("if(b>=1&&b<=4&&((v.en15().due)||{})[w.id]<=now)s.due++;"));
  check('C-R3-1 v22 filterEntries uses box 1-4', html.includes("if(ST.status==='due'&&w&&(b<1||b>4||(dueMap[w.id]||0)>now))return false;"));
  check('C-R3-1 v25 statsOf uses box 1-4', html.includes("if(b>=1&&b<=4&&dueOf(w.id)<=now)s.due++;"));
  check('C-R3-1 v27 dashboard dueN EN uses box 1-4', html.includes("if(c.box>=1&&c.box<=4&&c.due<=now)dueN++;"));
  check('C-R3-1 v27 dashboard dueN KO uses box 1-4', html.includes("if(cc.box>=1&&cc.box<=4&&cc.due<=now)dueN++;"));
  check('C-R3-1 v34 statsForList uses box 1-4', html.includes("if(b>=1&&b<=4&&(due[w.id]||0)<=now)s.due++;"));
  // C-R3-1: OLD due lines are GONE.
  check('OLD counts15 due line gone', !html.includes("if((e.due[w.id]||0)<=now)c.due++;"));
  check('OLD BT status filter gone', !html.includes("if(sc.status==='due'&&(e2.due[w.id]||0)>Date.now())return false;"));
  check('OLD wordsFiltered status filter gone', !html.includes("if(sc.status==='due'&&(e.due[w.id]||0)>Date.now())return false;"));
  check('OLD onlyDue line gone', !html.includes("if(o.onlyDue){var due=e.due[w.id]||0;if(due>Date.now())return false}"));
  check('OLD dueTodayCount line gone', !html.includes("WORDS.forEach(function(w){if((e.due[w.id]||0)<=now)n++});"));
  check('OLD reviewHTML due filter gone', !html.includes("var due=WORDS.filter(function(w){return inScope15(w)&&(e.due[w.id]||0)<=now});"));
  check('OLD reviewStart due filter gone', !html.includes("else list=WORDS.filter(function(w){return inScope15(w)&&(e.due[w.id]||0)<=now});"));
  check('OLD v17 statsOf due line gone', !html.includes("if((e.due[w.id]||0)<=now)s.due++;"));
  check('OLD v17 filterWords due line gone', !html.includes("if(V.status==='due'&&(e.due[w.id]||0)>now)return false;"));
  check('OLD v22 unitStats due line gone', !html.includes("if(((v.en15().due)||{})[w.id]<=now)s.due++;"));
  check('OLD v22 filterEntries due line gone', !html.includes("if(ST.status==='due'&&w&&(dueMap[w.id]||0)>now)return false;"));
  check('OLD v25 statsOf due line gone', !html.includes("if(dueOf(w.id)<=now)s.due++;"));
  check('OLD v27 dashboard dueN EN gone', !html.includes("if(c.box>=1&&c.due<=now)dueN++;"));
  check('OLD v27 dashboard dueN KO gone', !html.includes("if(cc.box>=1&&cc.due<=now)dueN++;"));
  check('OLD v34 statsForList due line gone', !html.includes("if((due[w.id]||0)<=now)s.due++;"));
  // C-R3-2: quarantine in load().
  check('C-R3-2 quarantine key pattern present x2 (load() + v45.js comment)', countOcc(html, 'hanvocab.v12.corrupt-') === 2);
  check('C-R3-2 __V45_CORRUPT present x5 (load() x2 + v45.js code + comments x2)', countOcc(html, 'window.__V45_CORRUPT') === 5);
  check('C-R3-2 __v45corruptShown present x2', countOcc(html, '__v45corruptShown') === 2);
  check('C-R3-2 warning copy present x2', countOcc(html, 'Không đọc được bản lưu cũ') === 2);
  check('C-R3-2 old load() gone (fresh-sample return without quarantine)', !html.includes("function load(){try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&j.cards)"));
  // C-R3-4 + leads.
  check('C-R3-4 snapshot key is unique (ms + counter + random)', html.includes("var k='hanvocab.v12.preimport-'+Date.now()+'-'+(++_snapSeq45)+'-'+Math.random().toString(36).slice(2,8);"));
  check('C-R3-4 old colliding snapshot key gone', !html.includes("var k='hanvocab.v12.preimport-'+Date.now();"));
  const rrIdx = html.indexOf('function restoreRaw(raw, sourceLabel){');
  check('LEAD restoreRaw size-check precedes JSON.parse (within restoreRaw)', rrIdx >= 0 && html.indexOf("reason:'file-too-large'", rrIdx) < html.indexOf('j=JSON.parse(raw)', rrIdx));
  check('LEAD speedHatch ready-hatch check precedes the gem spend', html.includes("if((e.hatch.endsAt||0)<=Date.now())return{ok:false,msg:'Trứng đã ấp xong — nhận thú cưng ngay!'};"));
  check('LEAD deleteHistoryEntry deletes one entry only', html.includes("h=h.filter(function(e){ if(!removed&&e.at===at){removed=true;return false} return true; });"));
  check('LEAD old deleteHistoryEntry (delete-all-same-ms) gone', !html.includes("var h=readHistory().filter(function(e){ return e.at!==at; });"));
  // NEW-1: enIcon guard.
  check('NEW-1 enIcon() falsy guard present x1', countOcc(html, "if(!name)return '';") === 1);
  check('NEW-1 old enIcon() (always emits <img>) gone', !html.includes("function enIcon(name){ return '<img src=\"assets/icons/v6/'+name+'\""));
  check('NEW-1 topicsHTML still calls enIcon(t.icon)', countOcc(html, 'enIcon(t.icon)') === 1);
  // weakchip list-row rules (v45.css) + V43 fight rules untouched.
  check('weakchip light list-row rule present x2 (v43 fight + v45 list)', countOcc(html, '.v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}') === 2);
  check('weakchip dark rule present x5 (v43 fight x2 + v45 list x2 + v45 v19zboss x1)', countOcc(html, '.v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}') === 5);
  check('weakchip v19zboss gold rule present x1 (dark zone cards, both themes)', countOcc(html, '.v19zboss .v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}') === 1);
  check('weakchip v45 data-theme dark rule present x1', countOcc(html, ':root[data-theme="dark"] .v34weakchip') === 1);
  check('V43 V18 fight weakchip light rule unchanged x1', countOcc(html, '.v18fight .v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}') === 1);
  check('V43 V18 fight weakchip dark rules unchanged x2', countOcc(html, '.v18fight .v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}') === 2);
  // V44 fragments (the hoists) survive.
  check('V44 export object present', html.includes('window.__v44={version:VERSION}'));
  check('V44 v44js marker present x1', countOcc(html, 'id="v44js"') === 1);
  check('V44 hoisted legDiff() line present x2 (wordPool + grammarPool)', countOcc(html, "var lv=b.arena==='leg'?legDiff():null;") === 2);
  check('V44 hoisted wordPool filter line present x1', html.includes("if(b.arena==='leg'){if(lv.indexOf(w.lv)<0)return false}"));
  check('V44 hoisted grammarPool filter line present x1', html.includes("return b.arena==='leg'?lv.indexOf(x.lv)>=0:x.lv===b.diff"));
  check('V44 wordPool comment present', html.includes('/* V44 (V18.9): legDiff() was called once PER WORD inside this filter'));
  check('V44 grammarPool comment present', html.includes('/* V44 (V18.9): same hoist as wordPool'));
  check('V44 marker file ships in out/', fs.existsSync(path.join(DIR, 'v44.js')));
  // The OLD per-item legDiff() lines are GONE.
  check('OLD wordPool block gone', !html.includes("if(b.arena==='leg'){var lv=legDiff();if(lv.indexOf(w.lv)<0)return false}"));
  check('OLD grammarPool line gone', !html.includes("legDiff().indexOf(x.lv)"));
  check('legDiff occurrences is 16 (15 in base + 1 in the v45.js header comment naming V19.0.1)', countOcc(html, 'legDiff') === 16, countOcc(html, 'legDiff'));
  // legDiff's definition + thresholds DELIBERATELY unchanged (the
  // getter-call latent bug stays exactly as it was — V19.0.1, not V19.0).
  check('legDiff definition + thresholds UNCHANGED (V19.0.1 follow-up)', html.includes("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']}"));
  check('C-R2-1 deliberately UNCHANGED (KO answers pay no per-answer XP)', countOcc(html, '/* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —') === 2);
  // V43 fragments that survive (spot-checks).
  check('R-V43 V19 qword rule survives', html.includes('.v19fight .v19qword{color:#fff}'));
  check('R-V43 V19 opt rule survives', html.includes('.v19fight .v19opt{color:#fff}'));
  check('R-V43 V18 qword rule survives', html.includes('.v18fight .v18qword{color:var(--ink)}'));
  check('R-V43 disabled skill-button rule survives', html.includes('.v23bar-fight .v23bf-skill:disabled{opacity:1;background:#6E5F3E;color:#FFF8E1;border-color:#8A7A52;cursor:not-allowed}'));
  check('R-V43 dark-theme restorations survive x3', countOcc(html, ':root[data-theme="dark"] .v18fight') === 3);
  check('R-V43 export survives', html.includes('window.__v43={version:VERSION}'));
  // V42 fragments that survive (spot-checks).
  check('R-V42 chronoGateHTML survives x6', countOcc(html, 'chronoGateHTML') === 6);
  check('R-V42 skyrootGateHTML survives x6', countOcc(html, 'skyrootGateHTML') === 6);
  check('R-V42 .v42btn rule survives', html.includes('.v42btn{min-height:44px'));
  // V41 fragments that survive (spot-checks, one per fix group).
  check('R-V41 CA gate present x4 (answer + pick + pickCorrect + pickWrong)', countOcc(html, "indexOf('ca-')===0") === 4);
  check('R-V41 resolveUltimate clamp present', html.includes('Math.min(3,F.caRight)'));
  check('R-V41 load() opt default present', html.includes("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}"));
  check('R-V41 importFile pre-snapshot flush present (try{ flush(); } x2)', countOcc(html, 'try{ flush(); }catch(e){}') === 2);
  check('R-V41 backupImport pre-snapshot flush present (__v20.flush guard x6)', countOcc(html, "try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") === 6);
  check('R-V40 ko16 branch survives', html.includes("else if(kk==='ko16'){") && html.includes('m16k.levels=maxMap(l16k.levels, c16k.levels);'));
  check('R-V40 plan merge survives', html.includes('m27.plan=mp;'));
  check('A1-A2 raw rows still 999 / Oxford still 3395', countOcc(html, '"src": "a1a2"') === 999 && countOcc(html, '"src": "oxford"') === 3395);
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
  if (loaded.loadErr) { console.log(`\ntest45 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15/__v18/__v19/__v23/__v42/__v43/__v44/__v45 present',
    E(ctx, `!!window.__v15 && !!window.__v18 && !!window.__v19 && !!window.__v23 && !!window.__v42 && !!window.__v43 && !!window.__v44 && !!window.__v45`));
  check('__v43.version is 18.8.0', E(ctx, `window.__v43.version`) === '18.8.0');
  check('__v44.version is 18.9.0', E(ctx, `window.__v44.version`) === '18.9.0');
  check('__v45.version is 19.0.0', E(ctx, `window.__v45.version`) === '19.0.0');
  E(ctx, `window.__v15.buildWords()`);
  const nWords = E(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);

  // ================= §45A due counts (C-R3-1) =================
  section('§45A', 'C-R3-1 due counts — box 1-4 AND due<=now, everywhere');
  function loadFresh(htmlPath, preseed) {
    const h = fs.readFileSync(htmlPath, 'utf-8');
    const c = makeCtx();
    if (preseed) Object.keys(preseed).forEach(k => c.localStorage.setItem(k, preseed[k]));
    ['v15body', 'v27body', 'v19zonedetail', 'v18fight', 'v19fight', 'v18colldetail', 'v22bs-lib', 'v22bs-type', 'v22bs-status', 'v15plots', 'v15review'].forEach(id => dynIds.add(id));
    const btP = fs.existsSync(path.join(DIR, 'basic_tactics_vocabulary.json')) ? path.join(DIR, 'basic_tactics_vocabulary.json') : path.join(ROOT, 'out', 'basic_tactics_vocabulary.json');
    const btJ = fs.readFileSync(btP, 'utf-8');
    c.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(btJ) });
    c.FileReader = class FileReaderStub3 {
      constructor() { this.result = null; this.onload = null; }
      readAsText(f) { this.result = typeof f === 'string' ? f : (f && f.__text) || ''; if (this.onload) this.onload(); }
    };
    c.confirm = () => true;
    c.alert = () => {};
    const loaded = loadPage(c, h);
    dynIds.delete('v15langbar');
    fireDCL(c);
    E(c, `window.__v15.buildWords()`);
    return { ctx: c, loaded };
  }
  const fresh45 = loadFresh(htmlPath);
  check('fresh build loads without error', fresh45.loaded.loadErr === null, fresh45.loaded.loadErr);
  const freshCounts45 = E(fresh45.ctx, `(function(){var c=window.__v15.counts;return {total:c.total,due:c.due,mastered:c.mastered,'new':c['new']}})()`);
  check('fresh counts15().due is 0 (was 4889 on V18.9)', freshCounts45.due === 0, freshCounts45);
  check('fresh counts15().total is 4889', freshCounts45.total === 4889, freshCounts45);
  check('fresh counts15().mastered is 0', freshCounts45.mastered === 0, freshCounts45);
  check('fresh wordsFiltered onlyDue is empty', E(fresh45.ctx, `window.__v15.wordsFiltered({level:'ALL',onlyDue:true}).length`) === 0);
  // Seeded state: 10 words box 2 due in the future (NOT due), 3 words
  // box 2 due in the past (truly due), 5 words box 5 past-due (mastered,
  // NOT due), the rest box 0 (never learned, NOT due).
  const seed45 = E(fresh45.ctx, `(function(){
    try{
      var st=window.__v14.state; st.box={};
      var e15=window.__v15.en15(); e15.due=e15.due||{};
      var ws=window.__v15.words, now=Date.now();
      for(var i=0;i<10&&i<ws.length;i++){ st.box[ws[i].id]=2; e15.due[ws[i].id]=now+3*864e5; }
      for(var i=10;i<13;i++){ st.box[ws[i].id]=2; e15.due[ws[i].id]=now-1000; }
      for(var i=13;i<18;i++){ st.box[ws[i].id]=5; e15.due[ws[i].id]=now-1000; }
      save();
      var c=window.__v15.counts;
      var od=window.__v15.wordsFiltered({level:'ALL',onlyDue:true});
      var odBox0=od.filter(function(w){return (st.box[w.id]||0)===0}).length;
      var odBox5=od.filter(function(w){return (st.box[w.id]||0)===5}).length;
      return {ok:true, due:c.due, total:c.total, mastered:c.mastered, onlyDueN:od.length, odBox0:odBox0, odBox5:odBox5, dueIds:od.map(function(w){return w.id})};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('seeded state built', seed45.ok === true, seed45);
  check('seeded counts15().due is 3 (only the truly-due words)', seed45.due === 3, seed45);
  check('seeded counts15().mastered is 5', seed45.mastered === 5, seed45);
  check('seeded wordsFiltered onlyDue returns exactly the 3 truly-due words', seed45.onlyDueN === 3, seed45);
  check('seeded onlyDue list has no box-0 words', seed45.odBox0 === 0, seed45);
  check('seeded onlyDue list has no box-5 (mastered) words', seed45.odBox5 === 0, seed45);
  // BT attach on a fresh save must not inflate due (was 4889 -> 5361).
  const btFresh = loadFresh(htmlPath);
  const btDue = await (async () => {
    try {
      await E(btFresh.ctx, `window.__v22.ensureData()`);
      return E(btFresh.ctx, `(function(){var c=window.__v15.counts;return {total:c.total,due:c.due}})()`);
    } catch (e) { return { err: String(e) }; }
  })();
  check('BT data attaches in vm (ensureData resolves)', !btDue.err, btDue);
  check('after BT attach total is 5371 (4889 + 482 BT words)', btDue.total === 5371, btDue);
  check('after BT attach due is still 0 (BT words are box-0)', btDue.due === 0, btDue);

  // ================= §45B Review session (C-R3-1) =================
  section('§45B', 'C-R3-1 Review session — honest empty state, no box-0 words');
  // Wrap the global pop() to capture the empty-state message (reviewStart
  // calls the internal pop15 -> global pop, not the __v15 export).
  // 0-truly-due case needs its own FRESH ctx (fresh45 is seeded in §45A).
  const zero45 = loadFresh(htmlPath);
  E(zero45.ctx, `window.__POP_MSGS=[]; var _pop45=pop; pop=function(t,long){try{window.__POP_MSGS.push(String(t))}catch(e){}; return _pop45(t,long);}`);
  E(zero45.ctx, `window.__v15.reviewStart(false)`);
  const popMsgs0 = E(zero45.ctx, `window.__POP_MSGS.slice()`);
  check('0 truly-due: reviewStart pops the honest empty state', popMsgs0.some(m => m.indexOf('Không có từ nào cần ôn hôm nay.') >= 0), popMsgs0);
  check('0 truly-due: reviewStart does NOT start a session (#v15review stays empty)', E(zero45.ctx, `(document.getElementById('v15review')||{innerHTML:'?'}).innerHTML`) === '');
  check('0 truly-due: no fallback pop about loading BT data', !popMsgs0.some(m => m.indexOf('Basic Tactics') >= 0), popMsgs0);
  // The 3-truly-due state (fresh45, seeded in §45A): reviewStart must
  // open a session of exactly those 3 words (câu 1/3, word is box 1-4).
  E(fresh45.ctx, `window.__POP_MSGS=[]; var _pop45=pop; pop=function(t,long){try{window.__POP_MSGS.push(String(t))}catch(e){}; return _pop45(t,long);}`);
  E(fresh45.ctx, `window.__v15.reviewStart(false)`);
  const revHtml = E(fresh45.ctx, `(document.getElementById('v15review')||{innerHTML:''}).innerHTML`);
  check('3 truly-due: reviewStart opens a session (question card renders)', revHtml.includes('v15qcard') && revHtml.includes('v15qword'), revHtml.slice(0, 200));
  check('3 truly-due: session is 3 questions (câu 1/3)', revHtml.includes('câu 1/3'), revHtml.slice(0, 200));
  const revWord = E(fresh45.ctx, `(function(){
    var ws=window.__v15.words, st=window.__v14.state, e15=window.__v15.en15(), now=Date.now();
    var trulyDue=ws.filter(function(w){var b=st.box[w.id]||0;return b>=1&&b<=4&&(e15.due[w.id]||0)<=now});
    var host=(document.getElementById('v15review')||{innerHTML:''}).innerHTML;
    return {trulyDue:trulyDue.map(function(w){return w.en}), shownIsTrulyDue:trulyDue.some(function(w){return host.indexOf(w.en)>=0})};
  })()`);
  check('3 truly-due: the shown question word is one of the truly-due words', revWord.shownIsTrulyDue === true, revWord);
  // Weak-only with no weak words: honest empty state too.
  E(fresh45.ctx, `window.__POP_MSGS=[];`);
  E(fresh45.ctx, `window.__v15.reviewStart(true)`);
  const popMsgsW = E(fresh45.ctx, `window.__POP_MSGS.slice()`);
  check('weak-only with 0 weak words: honest empty state', popMsgsW.some(m => m.indexOf('Không có từ yếu nào.') >= 0), popMsgsW);

  // ================= §45C corrupt save quarantine (C-R3-2) =================
  section('§45C', 'C-R3-2 corrupt / card-less save — quarantined byte-exact, warning shown');
  function lsKeys45(c) {
    return E(c, `(function(){var out=[];for(var i=0;i<localStorage.length;i++)out.push(localStorage.key(i));return out})()`);
  }
  const CORRUPT45 = '{corrupt-json-{{{';
  const cctx45 = loadFresh(htmlPath, { 'hanvocab.v1': CORRUPT45 });
  check('corrupt build loads (fresh sample boot, no crash)', cctx45.loaded.loadErr === null, cctx45.loaded.loadErr);
  const afterCorrupt45 = E(cctx45.ctx, `(function(){
    var keys=[];for(var i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
    var cur=localStorage.getItem('hanvocab.v1')||'';
    var q=keys.filter(function(k){return k.indexOf('hanvocab.v12.corrupt-')===0});
    var qvals=q.map(function(k){return localStorage.getItem(k)});
    return {qKeys:q, qHasBytes:qvals.some(function(v){return v===${JSON.stringify(CORRUPT45)}}), curHasCorrupt:cur.indexOf('corrupt-json')>=0, curHasSample:cur.indexOf('안녕하세요')>=0, flag:window.__V45_CORRUPT||null, shown:window.__v45corruptShown||null};
  })()`);
  check('corrupt bytes survive boot byte-exact in a quarantine key', afterCorrupt45.qHasBytes === true, afterCorrupt45);
  check('quarantine key is hanvocab.v12.corrupt-<ms>-<rand>', afterCorrupt45.qKeys.length === 1 && afterCorrupt45.qKeys[0].indexOf('hanvocab.v12.corrupt-') === 0, afterCorrupt45.qKeys);
  check('__V45_CORRUPT flag set with reason bad-json', afterCorrupt45.flag && afterCorrupt45.flag.reason === 'bad-json' && afterCorrupt45.flag.quarantined === true, afterCorrupt45.flag);
  check('__v45corruptShown set (warning will be shown)', afterCorrupt45.shown && afterCorrupt45.shown.reason === 'bad-json' && afterCorrupt45.shown.quarantined === true, afterCorrupt45.shown);
  check('boot still produces the fresh sample (game playable)', afterCorrupt45.curHasSample === true && afterCorrupt45.curHasCorrupt === false, { curHasSample: afterCorrupt45.curHasSample });
  // Card-less save (valid JSON, no cards, xp 9999).
  const NOCARDS45 = '{"xp":9999,"v7":{"meta":{"saveVersion":12}}}';
  const nc45 = loadFresh(htmlPath, { 'hanvocab.v1': NOCARDS45 });
  const afterNoCards45 = E(nc45.ctx, `(function(){
    var keys=[];for(var i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
    var cur=localStorage.getItem('hanvocab.v1')||'';
    var q=keys.filter(function(k){return k.indexOf('hanvocab.v12.corrupt-')===0});
    var qvals=q.map(function(k){return localStorage.getItem(k)});
    var j=null;try{j=JSON.parse(cur)}catch(e){}
    return {qKeys:q, qHasBytes:qvals.some(function(v){return v===${JSON.stringify(NOCARDS45)}}), curHas9999:cur.indexOf('9999')>=0, curHasSample:cur.indexOf('안녕하세요')>=0, flag:window.__V45_CORRUPT||null};
  })()`);
  check('card-less bytes survive boot byte-exact in a quarantine key', afterNoCards45.qHasBytes === true, afterNoCards45);
  check('card-less quarantine reason is no-cards', afterNoCards45.flag && afterNoCards45.flag.reason === 'no-cards', afterNoCards45.flag);
  check('card-less save boots the fresh sample (xp 9999 not silently kept)', afterNoCards45.curHas9999 === false && afterNoCards45.curHasSample === true, { curHas9999: afterNoCards45.curHas9999 });
  // Valid save boots normally: nothing quarantined, no flag, xp kept.
  const VALID45 = JSON.stringify({ cards: [{ h: '안녕', m: 'xin chào', lv: 1 }], xp: 9999, opt: { mode: 'card', dir: 'kv', group: '', due: false } });
  const vctx45 = loadFresh(htmlPath, { 'hanvocab.v1': VALID45 });
  const afterValid45 = E(vctx45.ctx, `(function(){
    var keys=[];for(var i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
    var cur=localStorage.getItem('hanvocab.v1')||'';
    var q=keys.filter(function(k){return k.indexOf('hanvocab.v12.corrupt-')===0});
    var j=null;try{j=JSON.parse(cur)}catch(e){}
    return {qKeys:q, xp:(j&&j.xp)||null, flag:window.__V45_CORRUPT||null, shown:window.__v45corruptShown||null};
  })()`);
  check('valid save: no quarantine key created', afterValid45.qKeys.length === 0, afterValid45.qKeys);
  check('valid save: no __V45_CORRUPT flag', afterValid45.flag === null, afterValid45.flag);
  check('valid save: xp preserved through boot (9999 + 20 daily-login bonus = 10019)', afterValid45.xp === 10019, afterValid45);

  // ================= §45D snapshot keys (C-R3-4) =================
  section('§45D', 'C-R3-4 snapshotCurrent keys unique under faked same-ms Date.now()');
  const snap45 = E(fresh45.ctx, `(function(){
    try{
      var realNow=Date.now;
      Date.now=function(){return 1790000000000};
      var s1=window.__v31._test.snapshotCurrent();
      var raw1=localStorage.getItem('hanvocab.v1')||'';
      var j1=JSON.parse(raw1); j1.xp=1111; localStorage.setItem('hanvocab.v1', JSON.stringify(j1));
      var s2=window.__v31._test.snapshotCurrent();
      Date.now=realNow;
      var keys=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('hanvocab.v12.preimport-')===0)keys.push(k)}
      var kept1=null,kept2=null;
      try{kept1=JSON.parse(localStorage.getItem(s1)||'null')}catch(e){}
      try{kept2=JSON.parse(localStorage.getItem(s2)||'null')}catch(e){}
      var newest=window.__v31._test.newestPreRestoreKey();
      return {ok:true, k1:s1, k2:s2, sameKey:s1===s2, preimportKeys:keys, kept1Xp:kept1?kept1.xp:null, kept2Xp:kept2?kept2.xp:null, newest:newest};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('snapshotCurrent callable in vm', snap45.ok === true, snap45);
  check('two snapshots in the same ms produce DIFFERENT keys', snap45.ok && snap45.sameKey === false, { k1: snap45.k1, k2: snap45.k2 });
  check('both preimport keys survive (first snapshot NOT lost)', snap45.ok && snap45.preimportKeys.length === 2, snap45.preimportKeys);
  check('first snapshot keeps the first save, second keeps the second (xp 1111)', snap45.ok && snap45.kept2Xp === 1111 && snap45.kept1Xp !== 1111, snap45);
  // newestPreRestoreKey() resolves by strict '>' on the parsed ms, so
  // under FROZEN time (identical ms) it returns the FIRST-created key —
  // the tie-break is by insertion, and both snapshots survive, so no
  // data is lost. In real time the ms differ and the newest wins.
  check('newestPreRestoreKey resolves one of the two surviving snapshots', snap45.ok && (snap45.newest === snap45.k1 || snap45.newest === snap45.k2), { newest: snap45.newest, k1: snap45.k1, k2: snap45.k2 });

  // ================= §45E enIcon guard (NEW-1) =================
  section('§45E', 'NEW-1 enIcon guard — no <img> without an icon');
  // NOTE: enIcon() itself lives inside the v14 IIFE, so it is not a vm
  // global — the functional probe goes through the real Topics tab
  // render instead: S.opt.mode='en' + __v14.ex('topics') -> stage() ->
  // renderEN() -> bodyHTML() -> topicsHTML() -> #stage innerHTML.
  const topicsRender = E(fresh45.ctx, `(function(){
    try{
      S.opt.mode='en';
      window.__v14.ex('topics');
      var host=document.getElementById('stage');
      var h=host?host.innerHTML:'';
      var cards=(h.match(/class="entopic"/g)||[]).length;
      var undef=(h.match(/assets\\/icons\\/v6\\/undefined/g)||[]).length;
      var imgs=(h.match(/<img /g)||[]).length;
      var emptyIc=(h.match(/<div class="entopic-ic"><\\/div>/g)||[]).length;
      return {ok:true, cards:cards, undef:undef, imgs:imgs, emptyIc:emptyIc};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('Topics tab renders in vm (52 cards)', topicsRender.ok === true && topicsRender.cards === 52, topicsRender);
  check('Topics tab has 0 "assets/icons/v6/undefined" URLs (was 20)', topicsRender.ok && topicsRender.undef === 0, topicsRender);
  check('Topics tab renders 34 <img> icons (32 icon-ful topics + 2 header icons)', topicsRender.ok && topicsRender.imgs === 34, topicsRender);
  check('the 20 icon-less topics render an empty icon slot (no broken-image glyph)', topicsRender.ok && topicsRender.emptyIc === 20, topicsRender);
  const topics45 = E(fresh45.ctx, `(function(){
    try{
      var ts=window.__v14.TOPICS||[];
      var noIcon=ts.filter(function(t){return !t.icon});
      var withUndef=ts.filter(function(t){return t.icon==='undefined'});
      return {ok:true, total:ts.length, noIconN:noIcon.length, withUndef:withUndef.length};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('Topics tab still has 52 cards (no topics dropped)', topics45.ok && topics45.total === 52, topics45);
  check('20 topic entries still have no icon field (no icon invented)', topics45.ok && topics45.noIconN === 20, topics45);
  check('no topic carries the literal string "undefined" as its icon', topics45.ok && topics45.withUndef === 0, topics45);

  // ================= §45F weakchip static contrast =================
  section('§45F', 'weakchip list-row contrast (static WCAG math)');
  check('v45.css light rule uses #7A5B00 text/border on a pale amber wash', html.includes('.v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}'));
  checkRatio('weakchip #7A5B00 on light card #FFFAEB (was 1.33:1 gold)', '#7A5B00', '#FFFAEB', 4.5);
  checkRatio('weakchip #7A5B00 on white #FFFFFF', '#7A5B00', '#FFFFFF', 4.5);
  checkRatio('weakchip #FFD76A on dark card #201535 (kept gold)', '#FFD76A', '#201535', 4.5);
  checkRatio('weakchip #FFD76A on dark input #1B1430 (kept gold)', '#FFD76A', '#1B1430', 4.5);
  check('v45.css dark override follows the V43 theme pattern (media + data-theme)', html.includes('@media (prefers-color-scheme:dark)') && html.includes(':root[data-theme="dark"] .v34weakchip'));
  check('v45.css v19zboss rule keeps gold on the dark zone cards (both themes)', html.includes('.v19zboss .v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}'));
  checkRatio('weakchip #FFD76A on zone card #241b42 (dark card, both themes)', '#FFD76A', '#241B42', 4.5);
  check('V43 V18 fight weakchip rules still present (not clobbered)', html.includes('.v18fight .v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}') && html.includes('.v18fight .v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}'));

  // ================= §45L leads (reproduced + fixed) =================
  section('§45L', 'leads — restoreRaw / speedHatch / deleteHistoryEntry');
  const rr45 = E(fresh45.ctx, `(function(){
    try{
      var big='x'.repeat(11*1024*1024); // 11 MB of invalid JSON
      var r=window.__v31._test.restoreRaw(big, 'test');
      return {ok:true, reason:r.reason};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('restoreRaw: oversize INVALID JSON returns file-too-large (not bad-json)', rr45.ok && rr45.reason === 'file-too-large', rr45);
  const rrSmall = E(fresh45.ctx, `(function(){
    try{
      var r=window.__v31._test.restoreRaw('{bad json', 'test');
      return {ok:true, reason:r.reason};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('restoreRaw: small invalid JSON still returns bad-json', rrSmall.ok && rrSmall.reason === 'bad-json', rrSmall);
  const sh45 = E(fresh45.ctx, `(function(){
    try{
      var t=window.__v23._test;
      var e=t.en23();
      var gemsBefore=(S.gems||0);
      var sp=window.__v23.data().species||[];
      var inst=t.newPet(sp[0].id);
      if(!inst) return {ok:false,why:'newPet failed'};
      e.pets=e.pets||{}; e.pets[inst.id]=inst;
      e.hatch={petId:inst.id, endsAt:Date.now()+3600000};
      save();
      t.forceHatchReady(); // hatch is now ready (endsAt == now)
      var gemsReady=(S.gems||0);
      var r=t.speedHatch();
      var gemsAfter=(S.gems||0);
      return {ok:true, msg:r.msg, okFlag:r.ok, gemsReady:gemsReady, gemsAfter:gemsAfter, spent:gemsReady-gemsAfter};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('speedHatch: ready hatch refuses (ok false, "đã ấp xong")', sh45.ok && sh45.okFlag === false && typeof sh45.msg === 'string' && sh45.msg.indexOf('đã ấp xong') >= 0, sh45);
  check('speedHatch: ready hatch spends 0 gems (was 5)', sh45.ok && sh45.spent === 0, sh45);
  const dh45 = E(fresh45.ctx, `(function(){
    try{
      var at=1790000000000;
      localStorage.setItem('hanvocab.v16.backup-history', JSON.stringify([
        {at:at, kind:'a', bytes:1, hash:'h1', key:'k1', ok:true, note:''},
        {at:at, kind:'b', bytes:2, hash:'h2', key:'k2', ok:true, note:''},
        {at:at+1, kind:'c', bytes:3, hash:'h3', key:'k3', ok:true, note:''}
      ]));
      window.__v31.deleteHistoryEntry(at);
      var h=window.__v31._test.readHistory();
      return {ok:true, n:h.length, keptKinds:h.map(function(x){return x.kind}).join(',')};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('deleteHistoryEntry: deletes exactly ONE of two same-ms entries', dh45.ok && dh45.n === 2, dh45);
  check('deleteHistoryEntry: keeps the second same-ms entry (kind b) + the other entry (kind c)', dh45.ok && dh45.keptKinds === 'b,c', dh45);

  // ================= §43A static contrast audit =================

  // ================= §44A pool identity — OLD (V18.8) vs NEW (V18.9) =================
  section('§44A', 'pool identity — Legendary pool identical before/after V19.0 (V18.9 vs V19.0)');
  // Load a build's index.html into its OWN vm context and return it.
  function loadBuild(htmlPath) {
    const h = fs.readFileSync(htmlPath, 'utf-8');
    const c = makeCtx();
    ['v15body', 'v27body', 'v19zonedetail', 'v18fight', 'v19fight', 'v18colldetail', 'v22bs-lib', 'v22bs-type', 'v22bs-status', 'v15plots'].forEach(id => dynIds.add(id));
    const btP = fs.existsSync(path.join(DIR, 'basic_tactics_vocabulary.json')) ? path.join(DIR, 'basic_tactics_vocabulary.json') : path.join(ROOT, 'out', 'basic_tactics_vocabulary.json');
    const btJ = fs.readFileSync(btP, 'utf-8');
    c.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(btJ) });
    c.FileReader = class FileReaderStub2 {
      constructor() { this.result = null; this.onload = null; }
      readAsText(f) { this.result = typeof f === 'string' ? f : (f && f.__text) || ''; if (this.onload) this.onload(); }
    };
    c.confirm = () => true;
    c.alert = () => {};
    const loaded = loadPage(c, h);
    // HARNESS TRAP (not a product bug): dynIds/staticIds are module-level
    // and SHARED across vm contexts. The FIRST context's init15() creates
    // the #v15langbar element, whose id setter adds 'v15langbar' to the
    // shared dynIds — so the SECOND context's init15() sees the bar and
    // returns early without pushDataIntoV14()/buildWords(), leaving WORDS
    // at 1,576 (96 V14 + 1,000 V15 + 240 Chrono + 240 Skyroot) instead of
    // 4,889. Drop the leaked id before firing DCL so this context's
    // init15 runs fully; its own bar creation re-adds the id right after.
    dynIds.delete('v15langbar');
    fireDCL(c);
    E(c, `window.__v15.buildWords()`);
    return { ctx: c, loaded };
  }
  function seedPets44(c) {
    return E(c, `(function(){
      try{
        var e=window.__v23._test.en23(); if(!e) return {ok:false,why:'no en23'};
        var sp=window.__v23.data().species||[];
        e.pets=e.pets||{}; e.team=e.team||[null,null,null];
        for(var i=0;i<3;i++){
          var inst=window.__v23._test.newPet(sp[i%sp.length].id);
          if(!inst) return {ok:false,why:'newPet failed'};
          inst.lv=3; inst.st=0; inst.xp=0;
          e.pets[inst.id]=inst; e.team[i]=inst.id;
        }
        save();
        return {ok:true, team:e.team.filter(Boolean).length};
      }catch(err){return {ok:false,err:String(err)};}
    })()`);
  }
  // Seed mastered=N (box=5 on the first N WORDS ids), unlock the Legendary
  // arena (5 Elemental wins), start a Legendary EN fight and snapshot the
  // pools (sorted ids, so shuffle order cannot hide a difference).
  function legPoolSnapshot(c, n) {
    return E(c, `(function(n){
      try{
        var e=window.__v18._test.en18();
        ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
        var st=window.__v14.state; st.box={};
        var ws=window.__v15.words;
        for(var i=0;i<n&&i<ws.length;i++) st.box[ws[i].id]=5;
        save();
        var mastered=window.__v15.counts.mastered;
        var lv=window.__v18._test.legDiff();
        window.__v18.fight('v10_firedragon','en');
        var F=window.__v18._test.F();
        if(!F||!F.pools) return {ok:false,why:'no F/pools'};
        var w=F.pools.words.map(function(x){return x.id}).sort();
        var g=F.pools.grammar.map(function(x){return x.q||x.id||''}).sort();
        var levels={}; F.pools.words.forEach(function(x){levels[x.lv]=(levels[x.lv]||0)+1;});
        var gLevels={}; F.pools.grammar.forEach(function(x){gLevels[x.lv]=(gLevels[x.lv]||0)+1;});
        var out={ok:true, mastered:mastered, legDiff:lv, boss:F.boss.id, lang:F.lang,
          qmode:F.qmode, wordsN:w.length, grammarN:g.length,
          wordLevels:levels, grammarLevels:gLevels, wordIds:w, grammarIds:g};
        window.__v18.close();
        return out;
      }catch(err){return {ok:false,err:String(err)};}
    })(${n})`);
  }
  const oldPath = path.join(ROOT, 'tools', 'v45', 'pristine-v18.9-out', 'index.html');
  const oldBuild = loadBuild(oldPath);
  check('OLD V18.9 build loads in vm without error', oldBuild.loaded.loadErr === null, oldBuild.loaded.loadErr);
  check('OLD build words built (>4000)', E(oldBuild.ctx, `window.__v15.words.length`) > 4000, E(oldBuild.ctx, `window.__v15.words.length`));
  const newBuild = { ctx, loaded: { blocks: 0, loadErr: null } };
  check('NEW V19.0 build is the §L context (already loaded)', !!ctx && !!E(ctx, `window.__v45`));
  const seedOld = seedPets44(oldBuild.ctx);
  const seedNew = seedPets44(ctx);
  check('vm pet teams seeded on OLD + NEW (3 Lv.3 pets each)', seedOld.ok && seedOld.team === 3 && seedNew.ok && seedNew.team === 3, { old: seedOld, new: seedNew });
  for (const n of [0, 250, 700]) {
    const o = legPoolSnapshot(oldBuild.ctx, n);
    const w = legPoolSnapshot(ctx, n);
    check(`mastered ${n}: OLD seed drives counts to ${n} (old) / ${n} (new)`, o.ok && w.ok && o.mastered === n && w.mastered === n, { oldMastered: o.mastered, newMastered: w.mastered });
    check(`mastered ${n}: legDiff identical OLD vs NEW`, o.ok && w.ok && JSON.stringify(o.legDiff) === JSON.stringify(w.legDiff), { old: o.legDiff, new: w.legDiff });
    check(`mastered ${n}: legDiff is ['A2','B1'] on BOTH (latent getter bug preserved, not fixed)`, o.ok && w.ok && JSON.stringify(o.legDiff) === JSON.stringify(['A2', 'B1']) && JSON.stringify(w.legDiff) === JSON.stringify(['A2', 'B1']), { old: o.legDiff, new: w.legDiff });
    check(`mastered ${n}: word pool size identical (550)`, o.ok && w.ok && o.wordsN === 550 && w.wordsN === 550, { old: o.wordsN, new: w.wordsN });
    check(`mastered ${n}: grammar pool size identical (24)`, o.ok && w.ok && o.grammarN === 24 && w.grammarN === 24, { old: o.grammarN, new: w.grammarN });
    check(`mastered ${n}: word LEVELS identical (A2 300 / B1 250)`, o.ok && w.ok && o.wordLevels.A2 === 300 && o.wordLevels.B1 === 250 && w.wordLevels.A2 === 300 && w.wordLevels.B1 === 250, { old: o.wordLevels, new: w.wordLevels });
    check(`mastered ${n}: grammar LEVELS identical (A2 12 / B1 12)`, o.ok && w.ok && o.grammarLevels.A2 === 12 && o.grammarLevels.B1 === 12 && w.grammarLevels.A2 === 12 && w.grammarLevels.B1 === 12, { old: o.grammarLevels, new: w.grammarLevels });
    check(`mastered ${n}: word MEMBERSHIP identical (sorted ids, OLD vs NEW)`, o.ok && w.ok && JSON.stringify(o.wordIds) === JSON.stringify(w.wordIds), o.ok && w.ok ? { first: o.wordIds.slice(0, 3), last: o.wordIds.slice(-3), n: o.wordIds.length } : { oldErr: o.err, newErr: w.err });
    check(`mastered ${n}: grammar MEMBERSHIP identical (sorted ids, OLD vs NEW)`, o.ok && w.ok && JSON.stringify(o.grammarIds) === JSON.stringify(w.grammarIds), o.ok && w.ok ? { n: o.grammarIds.length } : { oldErr: o.err, newErr: w.err });
    check(`mastered ${n}: fight opened on the same boss/lang/qmode`, o.ok && w.ok && o.boss === 'v10_firedragon' && w.boss === 'v10_firedragon' && o.lang === 'en' && w.lang === 'en' && o.qmode === 'mc' && w.qmode === 'mc', { old: [o.boss, o.lang, o.qmode], new: [w.boss, w.lang, w.qmode] });
  }

  // ================= §44B vm Legendary fight + V18.5/V18.6 regression =================
  section('§44B', 'vm Legendary fight starts + C-02 shield halving + V19 Counterattack 3/3');
  // Legendary EN fight on the NEW build (vm): pools built, first question present.
  let legOk = false, legState = null, legHtml = '';
  try {
    E(ctx, `(function(){
      var e=window.__v18._test.en18();
      ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
      window.__v14.state.box={};
      save();
    })()`);
    E(ctx, `window.__v18.fight('v10_firedragon','en')`);
    legState = J(ctx, `JSON.stringify((function(){var F=window.__v18._test.F(); return F?{boss:F.boss.id,lang:F.lang,qmode:F.qmode,phase:F.phase,hearts:F.hearts,poolWords:F.pools.words.length,poolGrammar:F.pools.grammar.length}:null})())`);
    legHtml = E(ctx, `document.getElementById('v18fight').innerHTML || ''`);
    legOk = !!legState;
  } catch (e) { legState = { err: String(e) }; }
  check('vm Legendary EN fight starts (Firedragon, en, P1, 5 hearts)', legOk && legState.lang === 'en' && legState.phase === 1 && legState.hearts === 5, legState);
  check('vm Legendary fight pools built (550 words / 24 grammar)', legOk && legState.poolWords === 550 && legState.poolGrammar === 24, legState);
  check('vm Legendary fight renders the first question', legOk && legHtml.includes('v18qcard') && legHtml.includes('v18qword') && legHtml.includes('v18opt'), legHtml.slice(0, 200));
  // Legendary KO fight (same boss, Korean): <8 cards fall back to EN
  // questions with the V40 banner (fresh vm save has the default KO deck).
  let legKo = null;
  try {
    E(ctx, `window.__v18.close()`);
    E(ctx, `window.__v18.fight('v10_firedragon','ko')`);
    legKo = J(ctx, `JSON.stringify((function(){var F=window.__v18._test.F(); return F?{boss:F.boss.id,lang:F.lang,qmode:F.qmode,ko:!!(F.cur&&F.cur.ko),banner:F.banner}:null})())`);
  } catch (e) { legKo = { err: String(e) }; }
  check('vm Legendary KO fight starts (Firedragon, ko)', legKo && legKo.lang === 'ko', legKo);
  // --- C-02 team skill vs shield (copied from tools/v40/test40.js §40C) ---
  E(ctx, `(function(){
    var e=window.__v18.en18();
    ['v10_slime','v10_fairy','v10_dragon','v10_ghost','v10_spider','v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){ e.bosses[id]={win:1,wins:1,at:Date.now(),item:'x'}; });
    S.v7.en23={pets:{p1:{id:'p1',sp:'dragon',st:1,lv:10,xp:0,aff:0}},team:['p1',null,null],eggs:{fire:1,forest:1},hatch:null,mats:{},claimed:{},affClaimed:{},created:1};
    window.__T44_MSGS=[];
    var orig=window.__v15.pop15;
    window.__v15.pop15=function(t){ window.__T44_MSGS.push(String(t)); try{ return orig(t); }catch(e){} };
  })()`);
  const shield0 = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_panda','en');
      var F=window.__v18._test.F();
      out.ok=!!F; out.hp=F?F.hp:null; out.shield=F?F.shield:null;
      out.pet=!!(F&&F.pet); out.activeVal=F&&F.pet?F.pet.activeVal:null;
      out.energy=F&&F.pet?F.pet.energy:null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-02 panda fight opens with shield 30, pet team joined (activeVal 50)', shield0.ok === true && shield0.hp === 150 && shield0.shield === 30 && shield0.pet === true && shield0.activeVal === 50, shield0);
  const shield1 = E(ctx, `(function(){
    var out={};
    try{
      var F=window.__v18._test.F();
      F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v18._test.F();
      out.hp=F2.hp; out.shield=F2.shield; out.over=F2.over;
      out.msg=window.__T44_MSGS[window.__T44_MSGS.length-1]||null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-02 team skill (50) vs shield 30: HP 150->125 (halved)', shield1.hp === 125, shield1);
  check('C-02 team skill: shield absorbs the dealt damage (30->5)', shield1.shield === 5, shield1);
  check('C-02 team skill: toast states the dealt 25, not the raw 50', typeof shield1.msg === 'string' && shield1.msg.indexOf('Gây 25 sát thương') >= 0 && shield1.msg.indexOf('Khiên boss chặn một nửa.') >= 0, shield1);
  check('C-02 team skill: fight still open (non-lethal)', shield1.over === null || shield1.over === undefined, shield1);
  // --- V19 Counterattack 3/3 (copied from tools/v41/test41.js §41A R1) ---
  const r1 = E(ctx, `(function(){
    var out={};
    try{
      window.__v19.openMapFor('en'); window.__v19.fight('v11_fireking');
      var F=window.__v19._test.F();
      out.opened=!!F; out.maxHp=F?F.maxHp:null; out.qmode0=F?F.qmode:null;
      F.hp=75; F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v19._test.F();
      out.afterSkill={hp:F2.hp, ultActive:F2.ultActive, caQ:F2.caQ, caRight:F2.caRight, phase:F2.phase};
      F2.hp=200;
      var okPick=window.__v19._test.pickCorrect();
      var F3=window.__v19._test.F();
      out.pickOk=okPick;
      out.afterInflight={hp:F3.hp, caRight:F3.caRight, score:F3.score, right:F3.right, answered:F3.answered, qmode:F3.qmode, ultActive:F3.ultActive};
      window.__v19._test.next();
      var F4=window.__v19._test.F();
      out.afterNext={qmode:F4.qmode, caQ:F4.caQ, caRight:F4.caRight};
      for(var i=0;i<3;i++){ window.__v19._test.pickCorrect(); window.__v19._test.next(); }
      var F5=window.__v19._test.F();
      out.afterCA={caRight:F5.caRight, hearts:F5.hearts, phase:F5.phase, banner:F5.banner, over:F5.over, hp:F5.hp};
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('CA R1 fight opens (fireking HP 325, MC Q0)', r1.opened === true && r1.maxHp === 325 && r1.qmode0 === 'mc', r1);
  check('CA R1 skill drops HP 75->25 and starts the CA at once (caQ 0, caRight 0, P2)', r1.afterSkill.hp === 25 && r1.afterSkill.ultActive === true && r1.afterSkill.caQ === 0 && r1.afterSkill.caRight === 0 && r1.afterSkill.phase === 2, r1.afterSkill);
  check('CA R1 in-flight NORMAL answer is NOT a CA answer (caRight stays 0, HP drops from 200, score 1)', r1.pickOk === true && r1.afterInflight.caRight === 0 && r1.afterInflight.hp < 200 && r1.afterInflight.score === 1 && r1.afterInflight.right === 1, r1.afterInflight);
  check('CA R1 next() after the in-flight answer opens CA Q1 (qmode ca-*, caQ 1)', r1.afterNext.qmode && r1.afterNext.qmode.indexOf('ca-') === 0 && r1.afterNext.caQ === 1 && r1.afterNext.caRight === 0, r1.afterNext);
  check('CA R1 perfect run resolves 3/3 (caRight 3, hearts 5, P3, 3/3 banner)', r1.afterCA.caRight === 3 && r1.afterCA.hearts === 5 && r1.afterCA.phase === 3 && typeof r1.afterCA.banner === 'string' && r1.afterCA.banner.indexOf('3/3') >= 0, r1.afterCA);
  section('§44F', 'V43 fight render still holds on V19.0 — real V19 + V18 KO fights emit the fixed classes');
  const seedPets = E(ctx, `(function(){
    try{
      var e=window.__v23._test.en23(); if(!e) return {ok:false,why:'no en23'};
      var sp=window.__v23.data().species||[];
      e.pets=e.pets||{}; e.team=e.team||[null,null,null];
      for(var i=0;i<3;i++){
        var inst=window.__v23._test.newPet(sp[i%sp.length].id);
        if(!inst) return {ok:false,why:'newPet failed'};
        inst.lv=3; inst.st=0; inst.xp=0;
        e.pets[inst.id]=inst; e.team[i]=inst.id;
      }
      save();
      return {ok:true, team:e.team.filter(Boolean).length};
    }catch(err){return {ok:false,err:String(err)};}
  })()`);
  check('vm pet team seeded (3 Lv.3 pets, like the screenshot)', seedPets.ok && seedPets.team === 3, seedPets);
  // V19 KO fight (Anh's exact case: Korean word MC).
  let f19ok = false, f19html = '', f19state = null;
  try {
    E(ctx, `window.__v19._test.setLang('ko')`);
    E(ctx, `window.__v19.fight('v11_fireking')`);
    f19state = J(ctx, `JSON.stringify((function(){var F=window.__v19._test.F(); return F?{boss:F.boss.id,lang:F.lang,qmode:F.qmode,ko:!!(F.cur&&F.cur.ko),word:F.cur&&F.cur.k?F.cur.k.h:null,pet:!!F.pet}:null})())`);
    f19html = E(ctx, `document.getElementById('v19fight').innerHTML || ''`);
    f19ok = !!f19state;
  } catch (e) { f19state = { err: String(e) }; }
  check('vm V19 KO fight starts (Fire King, ko)', f19ok && f19state.lang === 'ko', f19state);
  check('vm V19 KO fight first question is a KO word MC', f19ok && f19state.qmode === 'mc' && f19state.ko === true, f19state);
  check('vm V19 fight renders with a pet team (battle bar)', f19ok && f19state.pet === true, f19state);
  check('vm V19 fight HTML contains the fixed classes', f19html.includes('v19qcard') && f19html.includes('v19qword') && f19html.includes('v19opt') && f19html.includes('v19fight-info') && f19html.includes('v19hearts'), f19html.slice(0, 200));
  check('vm V19 fight HTML contains the pet bar note', f19html.includes('v23bf-note') && f19html.includes('v23bf-skill'), f19html.slice(0, 200));
  check('vm V19 fight HTML contains the romanization mute line', f19html.includes('class="mute"'), f19html.slice(0, 300));
  // Answer correctly in vm, then check the right/disabled states render.
  let f19after = null;
  try {
    E(ctx, `window.__v19._test.pickCorrect()`);
    f19after = E(ctx, `document.getElementById('v19fight').innerHTML || ''`);
  } catch (e) { f19after = 'ERR:' + String(e); }
  check('vm V19 correct answer renders right + explain states', typeof f19after === 'string' && f19after.includes('v19opt right') && f19after.includes('v19explain'), (f19after || '').slice(0, 200));
  // V18 KO fight (same question shape, arena engine).
  let f18ok = false, f18html = '', f18state = null;
  try {
    E(ctx, `window.__v15.openHub('bosses')`);
    E(ctx, `window.__v18.fight('v10_slime','ko')`);
    f18state = J(ctx, `JSON.stringify((function(){var F=window.__v18._test.F(); return F?{boss:F.boss.id,lang:F.lang,qmode:F.qmode,ko:!!(F.cur&&F.cur.ko),word:F.cur&&F.cur.k?F.cur.k.h:null,pet:!!F.pet}:null})())`);
    f18html = E(ctx, `document.getElementById('v18fight').innerHTML || ''`);
    f18ok = !!f18state;
  } catch (e) { f18state = { err: String(e) }; }
  check('vm V18 KO fight starts (Slime, ko)', f18ok && f18state.lang === 'ko', f18state);
  check('vm V18 KO fight first question is a KO word MC', f18ok && f18state.qmode === 'mc' && f18state.ko === true, f18state);
  check('vm V18 fight HTML contains the fixed classes', f18html.includes('v18qcard') && f18html.includes('v18qword') && f18html.includes('v18opt') && f18html.includes('v18fight-info') && f18html.includes('v18hearts'), f18html.slice(0, 200));
  check('vm V18 fight HTML contains the pet bar note', f18html.includes('v23bf-note'), f18html.slice(0, 200));

  // ================= §43R V18.7 regression =================
  section('§44R', 'V18.8 regression — V42/V41 fixes still hold on V19.0');
  check('R-V42 CA gate survives x4', countOcc(html, "indexOf('ca-')===0") === 4);
  check('R-V42 resolveUltimate clamp survives', html.includes('Math.min(3,F.caRight)'));
  check('R-V42 load() opt default survives', html.includes("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}"));
  check('R-V42 pre-snapshot flush survives x2 + x6', countOcc(html, 'try{ flush(); }catch(e){}') === 2 && countOcc(html, "try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") === 6);
  check('R-V42 ko16 merge survives', html.includes("else if(kk==='ko16'){") && html.includes('m16k.levels=maxMap(l16k.levels, c16k.levels);'));
  check('R-V42 koWarn banner survives x2', countOcc(html, "F.banner=F.koWarn='⚠️ Bạn mới có '+_kc40") === 2);
  check('R-V42 checkPhase exports survive x2', countOcc(html, 'checkPhase:checkPhase') === 2);
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
  check('no en45 save key', E(ctx, `!S.v7 || !S.v7.en45`));
  check('no v45 localStorage key', E(ctx, `(function(){ for(var i=0;i<localStorage.length;i++){ if(localStorage.key(i).indexOf('v45')>=0) return false; } return true; })()`));
  check('hanvocab.v1 still the only save key', E(ctx, `localStorage.getItem('hanvocab.v1')!==null`));

  // ================= §C Chrome-only =================
  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('Legendary fight start is prompt (<500 ms pool build) in real Chrome', 'needs real Chrome — see verify-v45c.js');
  skipCheck('full Legendary fight end-to-end (P1/P2/P3, hearts, win, rewards) with 0 console errors', 'needs real Chrome — see verify-v45c.js');
  skipCheck('non-Legendary (Challenge/Elemental) fight + V19 map fight still work in real Chrome', 'needs real Chrome — see verify-v45c.js');
  skipCheck('360px no-overflow + laptop viewports', 'needs real Chrome — see verify-v45c.js');
  skipCheck('painted V19/V18 fights: contrast still PASS (V43 rules survive)', 'needs real Chrome — see verify-v45c.js');
  skipCheck('live Firebase login/sync', "never tested live in any version — Anh must run the FIREBASE_SETUP.md checklist");
  skipCheck('real phone touch / Safari', "needs Anh's real-phone test");

  const total = pass + fail + skip;
  console.log(`\ntest45: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('test45 crashed:', e); process.exit(2); });
