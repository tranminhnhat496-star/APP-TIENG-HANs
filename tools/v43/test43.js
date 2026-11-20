// test43.js - V18.8 BOSS-FIGHT READABILITY independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v42/test42.js (same lines 34-196); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V18.8 build.
// Usage: node tools/v43/test43.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V43 fragments,
//         V42/V41 fragments, 'Không có đường tắt' still gone, legDiff +
//         C-R2-1 deliberately unchanged)
//   section L page load (vm, real inline scripts) + __v43 + exports
//   section 43A static contrast audit — every V43 colour choice recomputed
//         in Node with WCAG relative luminance against the effective
//         backgrounds measured in real Chrome (repro r43-results.json);
//         thresholds 4.5:1 normal, 3:1 large; includes the disabled
//         pet-skill button (opacity-corrected) and the element-chip
//         45% colour-mix for every element/rarity colour
//   section 43B vm fight render — real V19 + V18 KO fights driven in vm:
//         the renderers emit the fixed classes (qcard/qword/mute/opts,
//         pet bar, passage, explain, warn); V19 KO MC question present
//   section 43R V18.7 regression (V42 fragments + V41 fixes still hold)
//   section V save schema (no en43 key, no new localStorage key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint; computed
// contrast is asserted statically here from the Chrome-measured
// backgrounds, and in real Chrome by verify-v43c.js); the painted
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
const EXPECTED_SHA = '3ad47dbf82fb2d5e508ff13b2d441ad63c061690361d18fd113c84f4466ee73b';
const EXPECTED_BYTES = 2421418;
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
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v43.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V18.8 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is the V18.8 size', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('title is V18.8 Boss-Fight Readability', html.includes('<title>Korean &amp; English Vocab Farm V18.8 — Boss-Fight Readability'));
  check('__v43 + 18.8.0 present', html.includes('window.__v43') && html.includes("VERSION='18.8.0'"));
  check('__v33–__v42 + 17.0.0/17.1.0/18.0.0/18.1.0/18.2.0/18.3.0/18.4.0/18.5.0/18.6.0/18.7.0 still present', html.includes('window.__v33') && html.includes('window.__v34') && html.includes('window.__v35') && html.includes('window.__v36') && html.includes('window.__v37') && html.includes('window.__v38') && html.includes('window.__v39') && html.includes('window.__v40') && html.includes('window.__v41') && html.includes('window.__v42') && html.includes("VERSION='17.0.0'") && html.includes("VERSION='17.1.0'") && html.includes("VERSION='18.0.0'") && html.includes("VERSION='18.1.0'") && html.includes("VERSION='18.2.0'") && html.includes("VERSION='18.3.0'") && html.includes("VERSION='18.4.0'") && html.includes("VERSION='18.5.0'") && html.includes("VERSION='18.6.0'") && html.includes("VERSION='18.7.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0', '18.6.0', '18.7.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v43', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v43', styleIds.join(','));
  check('script markers end v43', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v43', scriptIds.join(','));
  check('v43js after v42js', html.indexOf('id="v43js"') > html.indexOf('id="v42js"'));
  check("no 'Không có đường tắt' text remaining in the built index.html", !html.includes('Không có đường tắt'));
  // V43 layer fragments (one per rule group).
  check('V43 export object present', html.includes('window.__v43={version:VERSION}'));
  check('V43 V19 qword rule present', html.includes('.v19fight .v19qword{color:#fff}'));
  check('V43 V19 qcard-mute rule present', html.includes('.v19fight .v19qcard .mute{color:var(--ui-text-muted-dark,#C4B9E2)}'));
  check('V43 V19 boss-name rule present', html.includes('.v19fight .v19fight-info>b{color:#fff}'));
  check('V43 V19 info-mute rule present', html.includes('.v19fight .v19fight-info .mute{color:var(--ui-text-muted-dark,#C4B9E2)}'));
  check('V43 V19 hearts rule present', html.includes('.v19fight .v19hearts{color:#fff}'));
  check('V43 V19 opt rule present', html.includes('.v19fight .v19opt{color:#fff}'));
  check('V43 V19 opt hover rule present', html.includes('.v19fight .v19opt:hover,.v19fight .v19opt:focus-visible{background:#3a2f6e;color:#fff;border-color:#8a7bd8}'));
  check('V43 V19 passage rules present', html.includes('.v19fight .v19passage{color:#fff}') && html.includes('.v19fight .v19passage p{color:var(--ui-text-secondary,#E5DEF5)}'));
  check('V43 V19 explain-bad override present', html.includes('.v19fight .v19explain[style*="--bad"]{color:#FF8A78 !important}'));
  check('V43 V19 done rules present', html.includes('.v19fight .v19done p{color:#fff}'));
  check('V43 V19 phase rule present', html.includes('.v19fight .v19phase{background:#5B3FD4;color:#fff}'));
  check('V43 V19 blocked break-bar rules present', html.includes('.v19fight .v34bar-t{color:#fff}') && html.includes('.v19fight .v34bar.v34blocked .mute{color:var(--ui-text-muted-dark,#C4B9E2)}'));
  check('V43 V19 chip rule present', html.includes('.v19fight .v19chip{background:color-mix(in srgb,var(--ec,#888) 45%,#000);color:#fff}'));
  check('V43 V18 qword rule present', html.includes('.v18fight .v18qword{color:var(--ink)}'));
  check('V43 V18 opt rule present', html.includes('.v18fight .v18opt{color:var(--ink)}'));
  check('V43 V18 warn rule present', html.includes('.v18fight .v18warn{color:#FFE066}'));
  check('V43 V18 explain overrides present', html.includes('.v18fight .v18explain[style*="--ok"]{color:#1B7F5A !important}') && html.includes('.v18fight .v18explain[style*="--bad"]{color:#C23A30 !important}'));
  check('V43 V18 explain dark restorations present x3', countOcc(html, ':root[data-theme="dark"] .v18fight') === 3);
  check('V43 V18 phase rule present', html.includes('.v18fight .v18phase{background:linear-gradient(90deg,#6D28D9,#C1121F);color:#fff}'));
  check('V43 V18 break-bar rules present', html.includes('.v18fight .v34breaklabel{color:var(--ink)}') && html.includes('.v18fight .v34weakchip{color:#7A5B00;'));
  check('V43 V18 blocked break-bar rules present', html.includes('.v18fight .v34bar-t{color:var(--ink)}') && html.includes('.v18fight .v34bar.v34blocked .mute{color:var(--ink)}'));
  check('V43 V18 chip rule present', html.includes('.v18fight .v18chip{color:#fff;background:color-mix(in srgb,var(--ec,#999) 45%,#000);border-color:transparent}'));
  check('V43 disabled skill-button rule present', html.includes('.v23bar-fight .v23bf-skill:disabled{opacity:1;background:#6E5F3E;color:#FFF8E1;border-color:#8A7A52;cursor:not-allowed}'));
  check('V43 CSS file ships in out/', fs.existsSync(path.join(DIR, 'v43.css')) && fs.existsSync(path.join(DIR, 'v43.js')));
  check('V43 layer is CSS-only: no v43.js logic beyond the version marker', !fs.readFileSync(path.join(DIR, 'v43.js'), 'utf-8').includes('document.'));
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
  check('legDiff deliberately UNCHANGED (decision-blocked)', html.includes("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}"));
  check('C-R2-1 deliberately UNCHANGED (KO answers pay no per-answer XP)', countOcc(html, '/* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —') === 2);
  check('V19 qcard background itself UNCHANGED (dark card stays dark)', html.includes('.v19qcard{margin-top:12px;padding:12px;border-radius:12px;background:#241b42}'));
  check('V19 opt background itself UNCHANGED', html.includes('.v19opt{padding:10px;border-radius:10px;border:1px solid #4a3f7a;background:#2e2454;color:#fff;font-size:15px;cursor:pointer;text-align:left}'));

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
  if (loaded.loadErr) { console.log(`\ntest43 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15/__v18/__v19/__v23/__v42/__v43 present',
    E(ctx, `!!window.__v15 && !!window.__v18 && !!window.__v19 && !!window.__v23 && !!window.__v42 && !!window.__v43`));
  check('__v43.version is 18.8.0', E(ctx, `window.__v43.version`) === '18.8.0');
  E(ctx, `window.__v15.buildWords()`);
  const nWords = E(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);

  // ================= §43A static contrast audit =================
  section('§43A', 'static contrast audit — V43 colours vs Chrome-measured backgrounds');
  // Effective backgrounds below are the Chrome-measured composited values
  // from repro r43-results.json (light theme unless noted); thresholds
  // 4.5:1 normal text, 3:1 large text (question word, 22px/800).
  checkRatio('V19 qword #fff on #241b42 (large)', '#FFFFFF', '#241b42', 3);
  checkRatio('V19 qcard-mute #C4B9E2 on #241b42', '#C4B9E2', '#241b42', 4.5);
  checkRatio('V19 boss-name #fff on #2A243E (light-theme fight panel)', '#FFFFFF', '#2A243E', 4.5);
  checkRatio('V19 boss-name #fff on #18132E (dark-theme fight panel)', '#FFFFFF', '#18132E', 4.5);
  checkRatio('V19 info-mute #C4B9E2 on #2A243E', '#C4B9E2', '#2A243E', 4.5);
  checkRatio('V19 HP/hearts #fff on #2A243E', '#FFFFFF', '#2A243E', 4.5);
  checkRatio('V19 opt #fff on #2e2454 (default)', '#FFFFFF', '#2e2454', 4.5);
  checkRatio('V19 opt #fff on #1e5c2e (right)', '#FFFFFF', '#1e5c2e', 4.5);
  checkRatio('V19 opt #fff on #6e1b1b (wrong)', '#FFFFFF', '#6e1b1b', 4.5);
  checkRatio('V19 opt hover #fff on #3a2f6e', '#FFFFFF', '#3a2f6e', 4.5);
  checkRatio('V19 passage #fff on #1c1533', '#FFFFFF', '#1c1533', 4.5);
  checkRatio('V19 passage-p #E5DEF5 on #1c1533', '#E5DEF5', '#1c1533', 4.5);
  checkRatio('V19 explain-mute #C4B9E2 on #1c1533', '#C4B9E2', '#1c1533', 4.5);
  checkRatio('V19 explain-bad #FF8A78 on #1c1533 (light theme)', '#FF8A78', '#1c1533', 4.5);
  checkRatio('V19 explain-ok var(--ok) #2E9B52 on #1c1533 (light theme)', '#2E9B52', '#1c1533', 4.5);
  checkRatio('V19 explain-ok var(--ok) #6FCF8A on #1c1533 (dark theme)', '#6FCF8A', '#1c1533', 4.5);
  checkRatio('V19 done-p #fff on #2A243E', '#FFFFFF', '#2A243E', 4.5);
  checkRatio('V19 phase #fff on #5B3FD4', '#FFFFFF', '#5B3FD4', 4.5);
  checkRatio('V18 qword var(--ink) #3A2E22 on var(--bg) #FFF6E3 (light, large)', '#3A2E22', '#FFF6E3', 3);
  checkRatio('V18 qword var(--ink) #F1EBDD on var(--bg) #17201A (dark, large)', '#F1EBDD', '#17201A', 3);
  checkRatio('V18 qcard-mute var(--mute) #7C6B58 on #FFF6E3 (light)', '#7C6B58', '#FFF6E3', 4.5);
  checkRatio('V18 qcard-mute var(--mute) #B2A68F on #17201A (dark)', '#B2A68F', '#17201A', 4.5);
  checkRatio('V18 opt var(--ink) #3A2E22 on var(--sf) #FFFDF6 (light)', '#3A2E22', '#FFFDF6', 4.5);
  checkRatio('V18 opt var(--ink) #F1EBDD on var(--sf) #1F2B22 (dark)', '#F1EBDD', '#1F2B22', 4.5);
  checkRatio('V18 opt right #fff on #1d5c33', '#FFFFFF', '#1d5c33', 4.5);
  checkRatio('V18 opt wrong #fff on #6b1d2a', '#FFFFFF', '#6b1d2a', 4.5);
  checkRatio('V18 warn #FFE066 on #4a2b00', '#FFE066', '#4a2b00', 4.5);
  checkRatio('V18 explain-ok #1B7F5A on #FFFDF6 (light theme)', '#1B7F5A', '#FFFDF6', 4.5);
  checkRatio('V18 explain-bad #C23A30 on #FFFDF6 (light theme)', '#C23A30', '#FFFDF6', 4.5);
  checkRatio('V18 explain-ok var(--ok) #6FCF8A on #1F2B22 (dark theme)', '#6FCF8A', '#1F2B22', 4.5);
  checkRatio('V18 explain-bad var(--bad) #FF8A78 on #1F2B22 (dark theme)', '#FF8A78', '#1F2B22', 4.5);
  checkRatio('V18 phase #fff on #6D28D9 (light stop)', '#FFFFFF', '#6D28D9', 4.5);
  checkRatio('V18 phase #fff on #C1121F (dark stop)', '#FFFFFF', '#C1121F', 4.5);
  checkRatio('V18 breaklabel var(--ink) #3A2E22 on #FFFDF6 (light)', '#3A2E22', '#FFFDF6', 4.5);
  checkRatio('V18 weakchip #7A5B00 on #FFFDF6 (light)', '#7A5B00', '#FFFDF6', 4.5);
  checkRatio('V18 weakchip #FFD76A on #1F2B22 (dark)', '#FFD76A', '#1F2B22', 4.5);
  // Blocked break bar (v36.js, steady .85 opacity): the inner .mute and
  // title are blended at .85 over the card before the ratio is taken.
  checkRatio('V19 blocked-bar title #fff on #2A243E', '#FFFFFF', '#2A243E', 4.5);
  checkRatio('V19 blocked-bar mute #C4B9E2 at .85 over #2A243E', blend('#C4B9E2', '#2A243E', 0.85), '#2A243E', 4.5);
  checkRatio('V18 blocked-bar title var(--ink) #3A2E22 at .85 over #FFFDF6', blend('#3A2E22', '#FFFDF6', 0.85), '#FFFDF6', 4.5);
  checkRatio('V18 blocked-bar mute var(--ink) #3A2E22 at .85 over #FFFDF6', blend('#3A2E22', '#FFFDF6', 0.85), '#FFFDF6', 4.5);
  checkRatio('V18 blocked-bar mute var(--ink) #F1EBDD at .85 over #1F2B22 (dark)', blend('#F1EBDD', '#1F2B22', 0.85), '#1F2B22', 4.5);
  // Control: the pre-fix V18 blocked-bar mute (--mute at .85) must fail.
  check('CONTROL pre-fix V18 blocked-bar mute 3.71:1 fails', ratio(blend('#7C6B58', '#FFFDF6', 0.85), '#FFFDF6') < 4.5, ratio(blend('#7C6B58', '#FFFDF6', 0.85), '#FFFDF6').toFixed(2));
  // Pet skill button: enabled (base rule, both themes) + disabled (V43).
  checkRatio('pet skill enabled #3A2500 on #FFB020 (light stop)', '#3A2500', '#FFB020', 4.5);
  checkRatio('pet skill enabled #3A2500 on #E8890C (dark stop)', '#3A2500', '#E8890C', 4.5);
  checkRatio('pet skill DISABLED #FFF8E1 on #6E5F3E (V43, full opacity)', '#FFF8E1', '#6E5F3E', 4.5);
  // Disabled button BEFORE the fix (opacity .45, blended): must fail —
  // this is the control proving the audit can detect the bug.
  const oldBg = blend('#FFB020', '#1D1335', 0.45);
  const oldFg = blend('#3A2500', oldBg, 0.45);
  const oldR = ratio(oldFg, oldBg);
  check(`CONTROL pre-fix disabled skill button fails (blended ${oldR.toFixed(2)}:1 < 4.5)`, oldR < 4.5, oldR.toFixed(2));
  // Element/rarity chips: white on colour-mix(--ec 45%, #000), worst case.
  const elColors = ['#E8445F', '#7CC7FF', '#FFD23F', '#4FA8FF', '#8FE3C0', '#C98A4B', '#9B7BFF', '#7ED957', '#FFE066', '#C77DFF', '#B388FF'];
  let worstChip = 99, worstC = '';
  for (const c of elColors) { const bg = mixBlack(c, 0.45); const r = ratio('#FFFFFF', bg); if (r < worstChip) { worstChip = r; worstC = c; } }
  check(`element/rarity chips #fff on 45% --ec mix, worst ${worstC} = ${worstChip.toFixed(2)}:1 (need 4.5)`, worstChip >= 4.5, worstChip.toFixed(2));
  // Repro control: the ORIGINAL failure numbers must fail the audit.
  check('CONTROL pre-fix V19 qword 1.22:1 fails', ratio('#3A2E22', '#241b42') < 3, ratio('#3A2E22', '#241b42').toFixed(2));
  check('CONTROL pre-fix V19 qcard-mute 3.13:1 fails', ratio('#7C6B58', '#241b42') < 4.5, ratio('#7C6B58', '#241b42').toFixed(2));
  check('CONTROL pre-fix V19 boss-name 1.12:1 fails', ratio('#3A2E22', '#2A243E') < 4.5, ratio('#3A2E22', '#2A243E').toFixed(2));

  // ================= §43B vm fight render =================
  section('§43B', 'vm fight render — real V19 + V18 KO fights emit the fixed classes');
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
  section('§43R', 'V18.7 regression — V42 fixes still hold on V18.8');
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
  check('no en43 save key', E(ctx, `!S.v7 || !S.v7.en43`));
  check('no v43 localStorage key', E(ctx, `(function(){ for(var i=0;i<localStorage.length;i++){ if(localStorage.key(i).indexOf('v43')>=0) return false; } return true; })()`));
  check('hanvocab.v1 still the only save key', E(ctx, `localStorage.getItem('hanvocab.v1')!==null`));

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('painted V19/V18 fights at 1280x800 + 1366x768 light: computed contrast all PASS', 'needs real Chrome — see verify-v43c.js');
  skipCheck('painted fights in the dark theme: computed contrast all PASS', 'needs real Chrome — see verify-v43c.js');
  skipCheck('answer states (correct/wrong/disabled) stay readable in real Chrome', 'needs real Chrome — see verify-v43c.js');
  skipCheck('all question types (listen/grammar/read/builder/speak) in real Chrome', 'needs real Chrome — see verify-v43c.js');
  skipCheck('full fight end-to-end (damage, hearts, win) with 0 console errors', 'needs real Chrome — see verify-v43c.js');
  skipCheck('360px no-overflow + touch targets', 'needs real Chrome — see verify-v43c.js');
  skipCheck('live Firebase login/sync', "never tested live in any version — Anh must run the FIREBASE_SETUP.md checklist");
  skipCheck('real phone touch / Safari', "needs Anh's real-phone test");

  // ================= footer =================
  const total = pass + fail + skip;
  console.log(`\ntest43: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('test43 crashed:', e); process.exit(2); });
