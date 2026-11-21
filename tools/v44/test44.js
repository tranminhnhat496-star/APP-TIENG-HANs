// test44.js - V18.9 LEGENDARY FREEZE FIX independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v43/test44.js (same lines 34-204); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V18.9 build.
// Usage: node tools/v44/test44.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V44 fragments,
//         OLD per-item legDiff() lines GONE, legDiff def + thresholds +
//         C-R2-1 deliberately unchanged, V43/V42/V41 fragments survive)
//   section L page load (vm, real inline scripts) + __v44 + exports
//   section 44A pool identity — the Legendary pool (sorted word + grammar
//         ids, levels, legDiff) is IDENTICAL between the pristine V18.8
//         build and the V18.9 build at mastered = 0 / 250 / 700, in vm
//   section 44B vm Legendary fight starts (EN + KO) + V18.5 C-02 pet-skill
//         shield halving + V18.6 V19 Counterattack 3/3
//   section 44F V43 fight render still holds (V19 + V18 KO fights emit
//         the fixed classes)
//   section 44R V18.8 regression (V42/V41 fixes still hold on V18.9)
//   section V save schema (no en44 key, no new localStorage key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint; the freeze
// itself is a main-thread timing effect, so it is measured in real
// Chrome by repro-v44.js / verify-v44c.js, not here); the painted
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
const EXPECTED_SHA = '1c409217a6511839fb2a5dfdcffda33c2adc6101116480f7d5f3b1b9229f0bdd';
const EXPECTED_BYTES = 2423227;
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
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v44.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V18.9 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is the V18.9 size', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('title is V18.9 Legendary Freeze Fix', html.includes('<title>Korean &amp; English Vocab Farm V18.9 — Legendary Freeze Fix'));
  check('__v44 + 18.9.0 present', html.includes('window.__v44') && html.includes("VERSION='18.9.0'"));
  check('__v43 + 18.8.0 still present', html.includes('window.__v43') && html.includes("VERSION='18.8.0'"));
  check('__v33–__v44 + 17.0.0/17.1.0/18.0.0/18.1.0/18.2.0/18.3.0/18.4.0/18.5.0/18.6.0/18.7.0/18.8.0 still present', html.includes('window.__v33') && html.includes('window.__v34') && html.includes('window.__v35') && html.includes('window.__v36') && html.includes('window.__v37') && html.includes('window.__v38') && html.includes('window.__v39') && html.includes('window.__v40') && html.includes('window.__v41') && html.includes('window.__v42') && html.includes('window.__v43') && html.includes('window.__v44') && html.includes("VERSION='17.0.0'") && html.includes("VERSION='17.1.0'") && html.includes("VERSION='18.0.0'") && html.includes("VERSION='18.1.0'") && html.includes("VERSION='18.2.0'") && html.includes("VERSION='18.3.0'") && html.includes("VERSION='18.4.0'") && html.includes("VERSION='18.5.0'") && html.includes("VERSION='18.6.0'") && html.includes("VERSION='18.7.0'") && html.includes("VERSION='18.8.0'") && html.includes("VERSION='18.9.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0', '18.6.0', '18.7.0', '18.8.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v43 (V44 adds no CSS)', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v43', styleIds.join(','));
  check('script markers end v44', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v44', scriptIds.join(','));
  check('v44js after v43js', html.indexOf('id="v44js"') > html.indexOf('id="v43js"'));
  check("no 'Không có đường tắt' text remaining in the built index.html", !html.includes('Không có đường tắt'));
  // V44 fragments (the hoists).
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
  check('legDiff occurrences is 15 (def + 2 hoists + export x2 + 3 old comments + 4 in v44.js + 2 in V44 comments)', countOcc(html, 'legDiff') === 15, countOcc(html, 'legDiff'));
  // legDiff's definition + thresholds DELIBERATELY unchanged (the
  // getter-call latent bug stays exactly as it was — pending decision).
  check('legDiff definition + thresholds UNCHANGED (decision-blocked)', html.includes("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']}"));
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
  if (loaded.loadErr) { console.log(`\ntest44 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15/__v18/__v19/__v23/__v42/__v43/__v44 present',
    E(ctx, `!!window.__v15 && !!window.__v18 && !!window.__v19 && !!window.__v23 && !!window.__v42 && !!window.__v43 && !!window.__v44`));
  check('__v43.version is 18.8.0', E(ctx, `window.__v43.version`) === '18.8.0');
  check('__v44.version is 18.9.0', E(ctx, `window.__v44.version`) === '18.9.0');
  E(ctx, `window.__v15.buildWords()`);
  const nWords = E(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);

  // ================= §43A static contrast audit =================

  // ================= §44A pool identity — OLD (V18.8) vs NEW (V18.9) =================
  section('§44A', 'pool identity — Legendary pool identical before/after the hoist');
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
  const oldPath = path.join(ROOT, 'tools', 'v44', 'pristine-v18.8-out', 'index.html');
  const oldBuild = loadBuild(oldPath);
  check('OLD V18.8 build loads in vm without error', oldBuild.loaded.loadErr === null, oldBuild.loaded.loadErr);
  check('OLD build words built (>4000)', E(oldBuild.ctx, `window.__v15.words.length`) > 4000, E(oldBuild.ctx, `window.__v15.words.length`));
  const newBuild = { ctx, loaded: { blocks: 0, loadErr: null } };
  check('NEW V18.9 build is the §L context (already loaded)', !!ctx && !!E(ctx, `window.__v44`));
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
  section('§44F', 'V43 fight render still holds on V18.9 — real V19 + V18 KO fights emit the fixed classes');
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
  section('§44R', 'V18.8 regression — V42/V41 fixes still hold on V18.9');
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
  check('no en44 save key', E(ctx, `!S.v7 || !S.v7.en44`));
  check('no v44 localStorage key', E(ctx, `(function(){ for(var i=0;i<localStorage.length;i++){ if(localStorage.key(i).indexOf('v44')>=0) return false; } return true; })()`));
  check('hanvocab.v1 still the only save key', E(ctx, `localStorage.getItem('hanvocab.v1')!==null`));

  // ================= §C Chrome-only =================
  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('Legendary fight start is prompt (<500 ms pool build) in real Chrome', 'needs real Chrome — see verify-v44c.js');
  skipCheck('full Legendary fight end-to-end (P1/P2/P3, hearts, win, rewards) with 0 console errors', 'needs real Chrome — see verify-v44c.js');
  skipCheck('non-Legendary (Challenge/Elemental) fight + V19 map fight still work in real Chrome', 'needs real Chrome — see verify-v44c.js');
  skipCheck('360px no-overflow + laptop viewports', 'needs real Chrome — see verify-v44c.js');
  skipCheck('painted V19/V18 fights: contrast still PASS (V43 rules survive)', 'needs real Chrome — see verify-v44c.js');
  skipCheck('live Firebase login/sync', "never tested live in any version — Anh must run the FIREBASE_SETUP.md checklist");
  skipCheck('real phone touch / Safari', "needs Anh's real-phone test");

  const total = pass + fail + skip;
  console.log(`\ntest44: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('test44 crashed:', e); process.exit(2); });
