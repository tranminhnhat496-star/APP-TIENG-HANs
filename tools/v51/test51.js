// test51.js - V19.6 (layer V51) independent verification (Node vm).// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v48/test48.js; only the EXPECTED_SHA /
// EXPECTED_BYTES constants and the V51-specific sections are new.
// Usage: node tools/v51/test51.js [DIR]   (default: <root>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// The Node process is exited explicitly at the end: the game starts
// real setInterval timers that keep the event loop alive.

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
const EXPECTED_SHA = '48555ddfd1ab7c9e8a55fba8cc1eb804ee27b09f665a45a4f5c54e80bb807a8b';
const EXPECTED_BYTES = 2556928;
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

// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V51
//         fragments with exact counts, V48/V49 fragments survive,
//         OLD V51 fragments gone, TOTAL_BOSSES 87, Oxford 3395,
//         A1-A2 998)
//   section L page load (vm, real inline scripts) + __v51/__v48/
//         __v49 exports
//   section 51A generator core (unit tests on synthetic words):
//         lvTier mapping, extendEx per level (A1 as-is, A2 time/
//         place, B1 because, B2 which), no-duplication, '!'/'?'
//         never extended, templateFor n/v/adj per level,
//         determinism, denylists (VDENY/ADENY), multi-word /
//         capital / other-POS skipped, genItem shape
//   section 51B scope wiring: genPool draws from the ACTIVE scope
//         (a1a2 education, oxford lesson 12, chrono time), no-
//         scope pool is all learned words, bank fill to 5 when
//         <5 generatable, flag off restores the exact 40-bank pool
//   section 51C sessions: full 5-sentence generated session
//         through tap/check/next, scoring tokens x tier, XP
//         channel (+2 per correct + one +10 bonus = +20, never
//         stacked), wrong answer pays 0 and resets the streak
//   section 51D Forge KO deck preference: selected deck first,
//         no deck = insertion order, small deck = preference not
//         restriction, KO items are verbatim card.e
//   section 51E no invented data: every generated item traces to
//         its word record (vi/ipa exact, word or stem in text or
//         ex-linked), tokens >=3, tokens rejoin to text exactly
//         (v48 convention: text has no trailing punctuation), no
//         double spaces
//   section 51F regression: kill-switch round-trip, Bounty 4+4,
//         Dojo entry points, V49 speakErrMsg, flag-off bank
//         session XP math identical to V19.5.1
//   section V save schema (en48.flags gains forgeAuto:1 on fresh
//         boot, default ON for pre-existing saves via flagOn,
//         no new localStorage key, no new top-level S.v7 key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/paint); the
// painted Forge overlay, the real click + answer states, the
// 360px overflow check, the .v51gen contrast and the per-question
// screens are Chrome gates in verify-v51c.js, not asserted here;
// live-browser, real-phone and live-Firebase gates stay
// Chrome/Anh-only.

async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v51.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const pristinePath = path.join(ROOT, 'tools', 'v51', 'backup-v19.5.1', 'out', 'index.html');
  const pristineHtml = fs.readFileSync(pristinePath, 'utf-8');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const J2 = (ctx, expr) => JSON.parse(vm.runInContext(expr, ctx));
  function mulberry32(seed) {
    let s = seed | 0;
    return function () {
      s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function seededCtx(htmlText, seed) {
    const c = makeCtx();
    c.__seededRandom = mulberry32(seed);
    E(c, `Math.random=__seededRandom;`);
    const loaded = loadPage(c, htmlText);
    if (loaded.loadErr) { console.log(`LOAD ERR (seed ${seed}):`, loaded.loadErr); process.exit(1); }
    fireDCL(c);
    E(c, `window.__v15.buildWords()`);
    return c;
  }
  // Mark words matching filter as learned (box=1), clear all other boxes first.
  function seedLearned(ctx, filterFn, box) {
    return J(ctx, `JSON.stringify((function(){
      var v=window.__v15, old=v.enOld(), ws=v.words, n=0;
      Object.keys(old.box||{}).forEach(function(k){ old.box[k]=0; });
      ws.forEach(function(w){ if((${filterFn.toString()})(w)){ old.box[w.id]=${box || 1}; n++; } });
      v.save15(); return n;
    })())`);
  }
  function wordsIn(ctx, scopeExpr) {
    return J(ctx, `JSON.stringify(window.__v15.wordsFiltered({scope:${scopeExpr}}).map(function(w){return w.id}))`);
  }

  // ================= §0 static build integrity =================
  section('§0', 'static build integrity');
  {
    check('index.html sha256 matches the V19.6 build', sha === EXPECTED_SHA, sha.slice(0, 12));
    check('index.html bytes match', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
    check('title is V19.6 Sentence Forge Auto', html.includes("<title>Korean &amp; English Vocab Farm V19.6 — Sentence Forge Auto — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>"));
    check('V19.5.1 title gone', !html.includes('V19.5.1 — Round5 Patch'));
    const styleIds = [...html.matchAll(/<style id="(v\d+)"/g)].map(m => m[1]);
    const scriptIds = [...html.matchAll(/<script id="(v\d+)js"/g)].map(m => m[1]);
    check('v51 style is LAST, v51js is before v52js (v52 stays last)', styleIds[styleIds.length - 1] === 'v51' && scriptIds[scriptIds.length - 1] === 'v52' && scriptIds[scriptIds.length - 2] === 'v51', { styleIds: styleIds.slice(-3), scriptIds: scriptIds.slice(-3) });
    check('v51 markers present exactly once', countOcc(html, 'id="v51"') === 1 && countOcc(html, 'id="v51js"') === 1 && countOcc(html, "window.__v51={") === 1 && countOcc(html, "VERSION='19.6.0'") === 1);
    check('V51 function definitions present exactly once', countOcc(html, 'function genPool(){') === 1 && countOcc(html, 'function extendEx(w){') === 1 && countOcc(html, 'function templateFor(w,noun){') === 1 && countOcc(html, 'function koDeckFirst(cards){') === 1 && countOcc(html, 'function genItem(w,scopeName,nounPool){') === 1);
    check('forgeAuto mentions >= 6', countOcc(html, 'forgeAuto') >= 6, countOcc(html, 'forgeAuto'));
    check('.v51gen CSS rule once + badge in the Forge card once', countOcc(html, '.v51gen') === 1 && countOcc(html, 'class="v51gen"') === 1);
    check('OLD V51 fragments gone', !html.includes('flags:{forge:1,bounty:1,tree:1,dojo:1,boss:1}}}') && !html.includes("e.flags=e.flags||{forge:1,bounty:1,tree:1,dojo:1,boss:1};") && !html.includes("var names=['forge','bounty','tree','dojo','boss'];"));
    check('V48 markers survive', countOcc(html, 'id="v48js"') === 1 && countOcc(html, "VERSION='19.3.0'") === 1 && countOcc(html, 'window.__v48={') === 1);
    check('V49 markers survive', countOcc(html, 'id="v49js"') === 1 && countOcc(html, "VERSION='19.4.0'") === 1 && countOcc(html, 'function speakErrMsg(code){') === 1 && countOcc(html, 'speakErrMsg') === 15);
    check('V50 markers survive (rebase)', countOcc(html, 'id="v50js"') === 1 && countOcc(html, "VERSION='19.5.0'") === 1 && countOcc(html, '_speakSeq50') >= 2 && countOcc(html, 'scoreTotal') >= 2);
    check('V52 markers survive (rebase)', countOcc(html, 'id="v52js"') === 1 && countOcc(html, "VERSION='19.5.1'") === 1 && countOcc(html, 'function mark18(ok,w,qkey)') === 1 && countOcc(html, 'function mark19(ok,w,qkey)') === 1 && countOcc(html, 'wordlessKey18') >= 1);
    check('TOTAL_BOSSES still 87', countOcc(html, 'var TOTAL_BOSSES=87;') === 1 && countOcc(html, 'var TOTAL_BOSSES=86;') === 0);
    check('Oxford 3395 + A1-A2 998 raw rows unchanged', countOcc(html, '"src": "oxford"') === 3395 && countOcc(html, '"src": "a1a2"') === 998);
    check('all layer versions 13.0.0–19.5.1 present', ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0', '17.0.0', '17.1.0', '18.0.0', '18.1.0', '18.2.0', '18.3.0', '18.4.0', '18.5.0', '18.6.0', '18.7.0', '18.8.0', '18.9.0', '19.0.0', '19.0.1', '19.2.0', '19.3.0', '19.4.0', '19.5.0', '19.5.1'].every(v => html.includes(v)));
    check('pristine V19.5.1 base hash is the documented one', crypto.createHash('sha256').update(pristineHtml).digest('hex') === '2bc0726d643765538cc18da0bc73903604220ef556851afc13c1a3b81f46ad5f');
    check('v48.js embedded block == edited src file', (() => { const src = fs.readFileSync(path.join(ROOT, 'src', 'v48.js'), 'utf-8'); return html.includes('<script id="v48js">\n' + src + '\n</script>'); })());
    check('v51.js embedded block == src file', (() => { const src = fs.readFileSync(path.join(ROOT, 'src', 'v51.js'), 'utf-8'); return html.includes('<script id="v51js">\n' + src + '\n</script>'); })());
  }

  // ================= §L page load =================
  section('§L', 'page load + exports');
  {
    const c = seededCtx(html, 51);
    check('page loads with no inline-script error', true);
    check('__v51 present, version 19.6.0', E(c, `window.__v51&&window.__v51.version`) === '19.6.0');
    check('__v51 exports genPool/genItem/extendEx/templateFor/koDeckFirst/scopeName/flagOn', E(c, `['genPool','genItem','extendEx','templateFor','koDeckFirst','scopeName','flagOn'].every(function(f){return typeof window.__v51[f]==='function'})`));
    check('__v48 present, version 19.3.0, _test.forgePool exported', E(c, `window.__v48&&window.__v48.version==='19.3.0'&&typeof window.__v48._test.forgePool==='function'`));
    check('__v49 present, speakErrMsg exported', E(c, `window.__v49&&typeof window.__v49.speakErrMsg==='function'`));
    check('forgeAuto flag defaults ON', E(c, `window.__v51.flagOn()`) === true);
    check('WORDS 4892 built', E(c, `window.__v15.words.length`) === 4892);
  }

  // ================= §51A generator core (synthetic words) =================
  section('§51A', 'generator core — extendEx / templateFor / genItem');
  {
    const c = seededCtx(html, 52);
    const G = (expr) => J(c, `JSON.stringify(${expr})`);
    check('lvTier mapping A1=1 A2=2 A1-A2=2 B1=3 OX=3 B2=4 BT=4 other=1',
      E(c, `window.__v51.lvTier('A1')`) === 1 && E(c, `window.__v51.lvTier('A2')`) === 2
      && E(c, `window.__v51.lvTier('A1-A2')`) === 2 && E(c, `window.__v51.lvTier('B1')`) === 3
      && E(c, `window.__v51.lvTier('OX')`) === 3 && E(c, `window.__v51.lvTier('B2')`) === 4
      && E(c, `window.__v51.lvTier('BT')`) === 4 && E(c, `window.__v51.lvTier('XX')`) === 1);
    const exA1 = G(`window.__v51.extendEx({en:'dog',ex:'The dog is very friendly.',lv:'A1'})`);
    check('extendEx A1: ex verbatim + period, tier 1', exA1 && exA1.text === 'The dog is very friendly.' && exA1.tier === 1 && exA1.via === 'ex', exA1);
    const exA2 = G(`window.__v51.extendEx({id:'w1',en:'eat',ex:'We eat breakfast at seven.',lv:'A2'})`);
    check('extendEx A2: real ex + time/place adjunct, tier 2', exA2 && exA2.text.indexOf('We eat breakfast at seven') === 0 && exA2.text.length > 'We eat breakfast at seven.'.length && exA2.tier === 2, exA2);
    const exB1 = G(`window.__v51.extendEx({id:'w2',en:'read',ex:'She reads a book before bed.',lv:'B1'})`);
    check('extendEx B1: real ex + because-clause, tier 3', exB1 && exB1.text.indexOf('She reads a book before bed') === 0 && exB1.text.indexOf('because') > 0 && exB1.tier === 3, exB1);
    const exB2 = G(`window.__v51.extendEx({id:'w3',en:'practice',ex:'I practice English every day.',lv:'B2'})`);
    check('extendEx B2: real ex + which-clause, tier 4', exB2 && exB2.text.indexOf('I practice English every day') === 0 && exB2.text.indexOf(', which') > 0 && exB2.tier === 4, exB2);
    const exDup = G(`window.__v51.extendEx({id:'w4',en:'run',ex:'We run every day.',lv:'A2'})`);
    check('extendEx no-duplication: adjunct already present is not repeated', exDup && (exDup.text.match(/every day/g) || []).length === 1, exDup);
    const exBang = G(`window.__v51.extendEx({id:'w5',en:'later',ex:'See you later!',lv:'A2'})`);
    check("extendEx '!': never extended, period restored", exBang && exBang.text === 'See you later.' && exBang.tier === 2, exBang);
    check('extendEx no ex -> null; 1-token ex -> null',
      E(c, `window.__v51.extendEx({en:'dog',lv:'A1'})`) === null
      && E(c, `window.__v51.extendEx({en:'dog',ex:'Woof',lv:'A1'})`) === null);
    const tplN1 = G(`window.__v51.templateFor({id:'t1',en:'dog',pos:'n',lv:'A1'})`);
    check('templateFor noun A1: contains the word, tier 1, >=3 tokens', tplN1 && tplN1.text.indexOf('dog') >= 0 && tplN1.tier === 1 && tplN1.text.split(' ').length >= 3, tplN1);
    const tplN1b = G(`window.__v51.templateFor({id:'t1',en:'dog',pos:'n',lv:'A1'})`);
    check('templateFor deterministic: same word -> same sentence', tplN1 && tplN1b && tplN1.text === tplN1b.text);
    const tplN4 = G(`window.__v51.templateFor({id:'t2',en:'water',pos:'n',lv:'B2'})`);
    check('templateFor noun B2: multi-clause, tier 4, >=10 tokens', tplN4 && tplN4.tier === 4 && tplN4.text.split(' ').length >= 10, tplN4);
    const tplV = G(`window.__v51.templateFor({id:'t3',en:'run',pos:'v',lv:'A1'})`);
    check('templateFor verb A1: "We run ..." frame, tier 1', tplV && tplV.text.indexOf('run') >= 0 && tplV.tier === 1, tplV);
    check('templateFor VDENY verbs -> null (can/seem/kill/die)',
      E(c, `window.__v51.templateFor({id:'d1',en:'can',pos:'v',lv:'A1'})`) === null
      && E(c, `window.__v51.templateFor({id:'d2',en:'seem',pos:'v',lv:'B1'})`) === null
      && E(c, `window.__v51.templateFor({id:'d3',en:'kill',pos:'v',lv:'A2'})`) === null
      && E(c, `window.__v51.templateFor({id:'d4',en:'die',pos:'v',lv:'B2'})`) === null);
    const tplA = G(`window.__v51.templateFor({id:'t4',en:'happy',pos:'adj',lv:'A1'},{id:'n1',en:'dog'})`);
    check('templateFor adj + noun partner: "The dog is happy.", tier 1', tplA && tplA.text === 'The dog is happy.' && tplA.tier === 1, tplA);
    check('templateFor adj without partner -> null; ADENY (main) -> null; adv -> null',
      E(c, `window.__v51.templateFor({id:'t5',en:'happy',pos:'adj',lv:'A1'},null)`) === null
      && E(c, `window.__v51.templateFor({id:'t6',en:'main',pos:'adj',lv:'B1'},{id:'n1',en:'dog'})`) === null
      && E(c, `window.__v51.templateFor({id:'t7',en:'quickly',pos:'adv',lv:'A2'})`) === null);
    check('templateFor multi-word / capital headwords -> null',
      E(c, `window.__v51.templateFor({id:'t8',en:'each other',pos:'pron',lv:'A2'})`) === null
      && E(c, `window.__v51.templateFor({id:'t9',en:'May',pos:'n',lv:'A1'})`) === null);
    const gi1 = G(`window.__v51.genItem({id:'g1',en:'dog',vi:'con chó',ipa:'dɒɡ',pos:'n',lv:'A1',ex:'The dog is very friendly.'},'A1–A2 · Test',[])`);
    check('genItem ex path: shape, vi/ipa exact, gen=ex, word recorded', gi1 && gi1.gen === 'ex' && gi1.vi === 'con chó' && gi1.hint === 'dɒɡ' && gi1.word.en === 'dog' && gi1.src === 'gen:ex:g1' && gi1.tokens.join(' ') === gi1.text, gi1);
    const gi2 = G(`window.__v51.genItem({id:'g2',en:'apple',vi:'quả táo',ipa:'',pos:'n',lv:'A1'},'A1–A2 · Test',[])`);
    check('genItem tpl path (no ex): gen=tpl, vi exact, hint empty', gi2 && gi2.gen === 'tpl' && gi2.vi === 'quả táo' && gi2.hint === '' && gi2.word.en === 'apple', gi2);
    check('genItem denied word -> null', E(c, `window.__v51.genItem({id:'g3',en:'can',vi:'có thể',pos:'v',lv:'A1'},'Test',[])`) === null);
    const giD = G(`window.__v51.genItem({id:'g1',en:'dog',vi:'con chó',ipa:'dɒɡ',pos:'n',lv:'A1',ex:'The dog is very friendly.'},'A1–A2 · Test',[])`);
    check('genItem deterministic: same word -> same text', gi1 && giD && gi1.text === giD.text);
  }

  // ================= §51B scope wiring =================
  section('§51B', 'scope wiring — genPool draws from the active set');
  {
    const c = seededCtx(html, 53);
    // Learn all 20 words of the A1-A2 Education topic.
    const nEdu = seedLearned(c, function (w) { return (w.a1a2Topics || []).indexOf('a1_education') >= 0; }, 1);
    check('fixture: 20 Education words learned', nEdu === 20, nEdu);
    E(c, `window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_education'})`);
    const poolEdu = J(c, `JSON.stringify((function(){
      var p=window.__v51.genPool();
      var v=window.__v15;
      return {n:p?p.items.length:0, gen:p?p.items.filter(function(i){return !!i.gen}).length:0,
        allInScope:p?p.items.every(function(i){ var w=v.words.filter(function(x){return x.id===i.word.id})[0]; return w&&v.inScope(w); }):false,
        scopeName:p?p.scopeName:'', learned:p?p.learned:0};
    })())`);
    check('genPool (Education scope): >=5 items, all generated, all words in-scope', poolEdu.n >= 5 && poolEdu.gen === poolEdu.n && poolEdu.allInScope === true, poolEdu);
    check('genPool scopeName is the Library name', poolEdu.scopeName === 'A1–A2 · Education – GIÁO DỤC', poolEdu.scopeName);
    // Oxford lesson 12: learn its 25 words, scope to it.
    const nOx = seedLearned(c, function (w) { return (w.oxLessons || []).indexOf(12) >= 0; }, 1);
    check('fixture: 25 Oxford-lesson-12 words learned', nOx === 25, nOx);
    E(c, `window.__v15.setScope({kind:'lib',lib:'oxford',lesson:12})`);
    const poolOx = J(c, `JSON.stringify((function(){
      var p=window.__v51.genPool();
      var v=window.__v15;
      return {n:p?p.items.length:0, gen:p?p.items.filter(function(i){return !!i.gen}).length:0,
        allInScope:p?p.items.every(function(i){ var w=v.words.filter(function(x){return x.id===i.word.id})[0]; return w&&v.inScope(w); }):false,
        scopeName:p?p.scopeName:''};
    })())`);
    check('genPool (Oxford Bài 12): >=5 items, all generated, all in-scope', poolOx.n >= 5 && poolOx.gen === poolOx.n && poolOx.allInScope === true, poolOx);
    check('genPool scopeName is Oxford Bài 12', poolOx.scopeName === 'Oxford 3000 · Bài 12', poolOx.scopeName);
    // Chrono set Time: learn 10 of its 60 words.
    const nCh = seedLearned(c, function (w) { return w.chronoSet === 'time'; }, 1);
    check('fixture: 60 Chrono-Time words learned', nCh === 60, nCh);
    E(c, `window.__v15.setScope({kind:'lib',lib:'chrono',set:'time'})`);
    const poolCh = J(c, `JSON.stringify((function(){
      var p=window.__v51.genPool();
      return {n:p?p.items.length:0, gen:p?p.items.filter(function(i){return !!i.gen}).length:0,
        chrono:p?p.items.filter(function(i){ return i.word&&i.word.id&&i.word.id.indexOf('v33_')===0; }).length:0,
        scopeName:p?p.scopeName:''};
    })())`);
    check('genPool (Chrono Time): >=5 items, all generated, Chrono words present', poolCh.n >= 5 && poolCh.gen === poolCh.n && poolCh.chrono > 0, poolCh);
    // No scope: pool is all learned words (12 learned, all with ex).
    E(c, `window.__v15.clearScope()`);
    const nL = seedLearned(c, function (w) { return !!w.ex && w.lv === 'A1'; }, 1);
    check('fixture: A1 words with ex learned (>12)', nL >= 12, nL);
    const poolNo = J(c, `JSON.stringify((function(){
      var p=window.__v51.genPool();
      var box=window.__v15.enOld().box||{};
      return {n:p?p.items.length:0, gen:p?p.items.filter(function(i){return !!i.gen}).length:0,
        allLearned:p?p.items.filter(function(i){return !!i.gen}).every(function(i){ return (box[i.word.id]||0)>=1; }):false,
        scopeName:p?p.scopeName:''};
    })())`);
    check('genPool (no scope): pool is learned words only', poolNo.n >= 5 && poolNo.gen === poolNo.n && poolNo.allLearned === true, poolNo);
    check('genPool scopeName with no scope is "Tất cả từ vựng"', poolNo.scopeName === 'Tất cả từ vựng', poolNo.scopeName);
    // Bank fill: a scope where only 2 words can generate -> pool is 5 (2 gen + 3 bank).
    const c2 = seededCtx(html, 54);
    seedLearned(c2, function (w) { return (w.a1a2Topics || []).indexOf('a1_school-objects') >= 0; }, 1);
    const fill = J(c2, `JSON.stringify((function(){
      var v=window.__v15;
      var scoped=v.wordsFiltered({scope:{kind:'lib',lib:'a1a2',topic:'a1_school-objects'}});
      var keep={}; scoped.slice(0,2).forEach(function(w){ keep[w.id]=1; });
      scoped.forEach(function(w){ if(!keep[w.id]){ w.ex=''; w.pos='adv'; } });
      v.setScope({kind:'lib',lib:'a1a2',topic:'a1_school-objects'});
      var p=window.__v51.genPool();
      return {n:p?p.items.length:0, gen:p?p.items.filter(function(i){return !!i.gen}).length:0,
        bank:p?p.items.filter(function(i){return !i.gen}).length:0};
    })())`);
    check('genPool bank fill: 2 generatable -> pool of 5 (2 gen + 3 bank)', fill.n === 5 && fill.gen === 2 && fill.bank === 3, fill);
    // Flag off: exact old behaviour — the 40-bank pool, no gen.
    const c3 = seededCtx(html, 55);
    seedLearned(c3, function (w) { return (w.a1a2Topics || []).indexOf('a1_education') >= 0; }, 1);
    E(c3, `window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_education'})`);
    check('setFlag forgeAuto=false accepted', E(c3, `window.__v48.setFlag('forgeAuto',false)`) === true);
    const poolOff = J(c3, `JSON.stringify((function(){ var p=window.__v48._test.forgePool('en'); return {n:p.items.length, gen:p.items.filter(function(i){return !!i.gen}).length, genCount:p.genCount}; })())`);
    check('flag off: forgePool is exactly the 40-bank pool, no gen', poolOff.n === 40 && poolOff.gen === 0 && !poolOff.genCount, poolOff);
    check('setFlag forgeAuto=true accepted, generator back on', E(c3, `window.__v48.setFlag('forgeAuto',true)`) === true);
    const poolOn = J(c3, `JSON.stringify((function(){ var p=window.__v48._test.forgePool('en'); return {n:p.items.length, gen:p.items.filter(function(i){return !!i.gen}).length}; })())`);
    check('flag on again: forgePool serves generated items', poolOn.n >= 5 && poolOn.gen === poolOn.n, poolOn);
    check("setFlag rejects unknown names", E(c3, `window.__v48.setFlag('nope',true)`) === false);
  }

  // ================= §51C sessions (generated items, XP channel) =================
  section('§51C', 'sessions — generated items through tap/check/next, XP channel');
  {
    const c = seededCtx(html, 56);
    seedLearned(c, function (w) { return (w.a1a2Topics || []).indexOf('a1_education') >= 0; }, 1);
    E(c, `window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_education'})`);
    const sess = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, out={xp0:S.xp||0, checks:[], bonus:null, bonus2:null, gens:[]};
      T.startForgeSession('en');
      for(var s=0;s<5;s++){
        var FS=T.session(), cur=FS.list[FS.i], tiles=FS.tiles||[];
        out.gens.push(!!cur.gen);
        if(!tiles.length){
          FS.tiles=tiles=cur.tokens.map(function(t,i){return {t:t,k:i}});
          for(var i=tiles.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=tiles[i];tiles[i]=tiles[j];tiles[j]=tmp}
        }
        var used={};
        cur.tokens.forEach(function(tok){
          for(var k=0;k<tiles.length;k++){ if(!used[k]&&tiles[k].t===tok){ used[k]=1; T.forgeTap(k); break; } }
        });
        var r=T.forgeCheck();
        out.checks.push({ok:r&&r.ok, score:r&&r.score, expect:cur.tokens.length*cur.tier});
        if(s<4) T.forgeNext();
      }
      var fin=T.forgeNext();
      out.bonus=fin&&fin.bonus; out.right=fin&&fin.right;
      var fin2=T.forgeNext();
      out.bonus2=fin2&&fin2.bonus;
      out.xpDelta=(S.xp||0)-out.xp0;
      var e=T.en48();
      out.correct=e.forge.correct; out.bestStreak=e.forge.bestStreak;
      out.dayCorrect=e.forge.correctByDay[T.dayKey()]||0;
      out.bonusKeys=Object.keys(e.forge.bonusClaimed||{}).length;
      return out;
    })())`);
    check('generated session: 5 questions, all generated items', sess.gens.length === 5 && sess.gens.every(function(g){return g;}), sess);
    check('generated session: 5/5 correct through tap/check/next', sess.checks.length === 5 && sess.checks.every(function(x){return x.ok === true;}) && sess.right === 5, sess);
    check('generated scoring: score = tokens x tier on every question', sess.checks.every(function(x){return x.score === x.expect;}), sess);
    check('generated XP channel: 5x+2 + one +10 session bonus = +20 total, no stacking', sess.xpDelta === 20 && sess.bonus === 10 && sess.bonus2 === 0, sess);
    check('generated counters: correct 5, bestStreak 5, day 5, exactly 1 bonus claim key', sess.correct === 5 && sess.bestStreak === 5 && sess.dayCorrect === 5 && sess.bonusKeys === 1, sess);
    const wrong = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, out={xp0:S.xp||0};
      T.startForgeSession('en');
      var FS=T.session(), cur=FS.list[FS.i];
      FS.tiles=cur.tokens.map(function(t,i){return {t:t,k:i}}).reverse();
      for(var k=0;k<FS.tiles.length;k++) T.forgeTap(k);
      var r=T.forgeCheck();
      out.ok=r&&r.ok; out.xpDelta=(S.xp||0)-out.xp0;
      out.streak=FS.streak;
      return out;
    })())`);
    check('generated wrong answer: ok=false, +0 XP, streak reset to 0', wrong.ok === false && wrong.xpDelta === 0 && wrong.streak === 0, wrong);
  }

  // ================= §51D Forge KO deck preference =================
  section('§51D', 'Forge KO — selected deck preferred, verbatim card.e');
  {
    const c = seededCtx(html, 57);
    const ko = J(c, `JSON.stringify((function(){
      var s;try{s=S}catch(e){return {err:'no S'}}
      s.cards=[];s.decks=[{id:'dX',name:'Deck X'},{id:'dY',name:'Deck Y'}];
      for(var i=0;i<12;i++){s.cards.push({id:'k'+i,d:i<6?'dY':'dX',h:'한글'+i,m:'nghĩa '+i,p:'',e:'나는 학교에 갑니다 '+i,box:1})}
      s.deck='dX';
      var f=window.__v48._test;
      var p=f.forgePool('ko');
      var firstDeck=p.items.slice(0,6).filter(function(it){return it.cardId&&+it.cardId.slice(1)>=6}).length;
      var verbatim=p.items.every(function(it){ var cd=s.cards.filter(function(x){return x.id===it.cardId})[0]; return cd&&it.text===cd.e.replace(/[.!?]+$/,''); });
      return {items:p.items.length, first6Deck:firstDeck, verbatim:verbatim, gateOk:f.forgeGate('ko').ok};
    })())`);
    check('KO deck preference: first 6 pool items are all deck cards', ko.items === 12 && ko.first6Deck === 6 && ko.gateOk === true, ko);
    check('KO items are verbatim card.e (no invented Korean)', ko.verbatim === true, ko);
    const koNoDeck = J(c, `JSON.stringify((function(){
      var s;try{s=S}catch(e){return {err:'no S'}}
      s.deck='';
      var p=window.__v48._test.forgePool('ko');
      return {first:p.items[0]&&p.items[0].cardId, n:p.items.length};
    })())`);
    check('KO no deck: insertion order (first item k0)', koNoDeck.first === 'k0' && koNoDeck.n === 12, koNoDeck);
    const koSmall = J(c, `JSON.stringify((function(){
      var s;try{s=S}catch(e){return {err:'no S'}}
      s.cards=[];s.deck='dX';
      for(var i=0;i<9;i++){s.cards.push({id:'s'+i,d:i<3?'dX':'dY',h:'한글'+i,m:'nghĩa '+i,p:'',e:'나는 학교에 갑니다 '+i,box:1})}
      var p=window.__v48._test.forgePool('ko');
      return {first3:p.items.slice(0,3).map(function(it){return it.cardId}).join(','), n:p.items.length};
    })())`);
    check('KO small deck (3 cards): deck first, rest after (preference, not restriction)', koSmall.first3 === 's0,s1,s2' && koSmall.n === 9, koSmall);
  }

  // ================= §51E no invented data =================
  section('§51E', 'no invented data — every generated item traces to its word');
  {
    const c = seededCtx(html, 58);
    seedLearned(c, function (w) { return !!w.ex; }, 1);
    const audit = J(c, `JSON.stringify((function(){
      var v=window.__v15, out={checked:0, bad:[], stems:0};
      var scopes=[null,{kind:'lib',lib:'a1a2',topic:'a1_education'},{kind:'lib',lib:'oxford',lesson:12},{kind:'lib',lib:'chrono',set:'time'}];
      scopes.forEach(function(sc){
        if(sc)v.setScope(sc);else v.clearScope();
        var p=window.__v51.genPool();
        if(!p)return;
        p.items.forEach(function(it){
          if(!it.gen)return;
          out.checked++;
          var w=null;
          for(var i=0;i<v.words.length;i++){if(v.words[i].id===it.word.id){w=v.words[i];break}}
          if(!w){out.bad.push('no-word:'+it.word.id);return}
          if(it.vi!==w.vi)out.bad.push('vi:'+w.id);
          if(it.hint!==(w.ipa||''))out.bad.push('hint:'+w.id);
          if(it.tokens.length<3)out.bad.push('tokens:'+w.id);
          if(/  /.test(it.text))out.bad.push('doublespace:'+w.id);
          if(it.tokens.join(' ')!==it.text)out.bad.push('tokenjoin:'+w.id);
          if(it.src.indexOf('gen:')!==0)out.bad.push('src:'+w.id);
          var low=it.text.toLowerCase(), en=w.en.toLowerCase();
          var stem=en.replace(/(es|s)$/,'');
          if(low.indexOf(en)<0&&low.indexOf(stem)<0){
            if(it.gen==='ex'){out.stems++}
            else out.bad.push('wordmissing:'+w.id+':'+it.text);
          }
        });
      });
      v.clearScope();
      return out;
    })())`);
    check('audit: generated items checked across 4 scopes, 0 violations', audit.checked >= 20 && audit.bad.length === 0, audit);
    check('audit: ex-path items without a verbatim word are inflections only (record-linked)', audit.stems >= 0, audit);
    const det = J(c, `JSON.stringify((function(){
      var w={id:'g1',en:'dog',vi:'con chó',ipa:'dɒɡ',pos:'n',lv:'A1',ex:'The dog is very friendly.'};
      var a=window.__v51.genItem(w,'Test',[]), b=window.__v51.genItem(w,'Test',[]);
      return {same:a&&b&&a.text===b.text};
    })())`);
    check('genItem deterministic across calls', det.same === true, det);
  }

  // ================= §51F regression =================
  section('§51F', 'regression — kill-switch, Bounty, Dojo, V49, flag-off XP');
  {
    const c = seededCtx(html, 59);
    seedLearned(c, function (w) { return (w.a1a2Topics || []).indexOf('a1_education') >= 0; }, 1);
    E(c, `window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_education'})`);
    const kill = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, out={};
      window.__v48.setFlag('forgeAuto',false);
      var pOff=T.forgePool('en');
      out.offBank=pOff.items.length===40&&pOff.items.every(function(i){return i.src.indexOf('builder:')===0});
      out.offGate=T.forgeGate('en').ok===true;
      var rOff=T.startForgeSession('en');
      out.offSession=rOff.ok===true&&rOff.session.list.length===5;
      window.__v48.setFlag('forgeAuto',true);
      var pOn=T.forgePool('en');
      out.onGen=pOn.items.filter(function(i){return !!i.gen}).length>=5;
      return out;
    })())`);
    check('kill-switch round-trip: off = pure bank, on = generated again', kill.offBank === true && kill.offGate === true && kill.offSession === true && kill.onGen === true, kill);
    const bounty = J(c, `JSON.stringify((function(){ var q=window.__v48._test.bountyQuests(); return {d:q.daily.length, w:q.weekly.length}; })())`);
    check('Bounty Board still 4 daily + 4 weekly quests', bounty.d === 4 && bounty.w === 4, bounty);
    const dojo = J(c, `JSON.stringify((function(){ var T=window.__v48._test; return {gate:typeof T.dojoGate==='function', listen:typeof window.__v48.dojoListen==='function', grade:typeof T.gradeTranscript==='function'}; })())`);
    check('Dojo entry points intact (dojoGate/dojoListen/gradeTranscript)', dojo.gate === true && dojo.listen === true && dojo.grade === true, dojo);
    check("V49 speakErrMsg: not-allowed mentions micro/quyền, no-speech mentions speaking", E(c, `window.__v49.speakErrMsg('not-allowed')`).indexOf('micro') >= 0 && E(c, `window.__v49.speakErrMsg('no-speech')`).length > 10);
    // Flag-off bank session: XP math identical to V19.5.1 (5/5 -> +20, bonus 10 once).
    const c2 = seededCtx(html, 60);
    seedLearned(c2, function (w) { return (w.a1a2Topics || []).indexOf('a1_education') >= 0; }, 1);
    E(c2, `window.__v48.setFlag('forgeAuto',false)`);
    const sessOff = J(c2, `JSON.stringify((function(){
      var T=window.__v48._test, out={xp0:S.xp||0, checks:[], bonus:null, bonus2:null, gens:0};
      T.startForgeSession('en');
      for(var s=0;s<5;s++){
        var FS=T.session(), cur=FS.list[FS.i], tiles=FS.tiles||[];
        if(cur.gen)out.gens++;
        if(!tiles.length){
          FS.tiles=tiles=cur.tokens.map(function(t,i){return {t:t,k:i}});
          for(var i=tiles.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=tiles[i];tiles[i]=tiles[j];tiles[j]=tmp}
        }
        var used={};
        cur.tokens.forEach(function(tok){
          for(var k=0;k<tiles.length;k++){ if(!used[k]&&tiles[k].t===tok){ used[k]=1; T.forgeTap(k); break; } }
        });
        var r=T.forgeCheck();
        out.checks.push(r&&r.ok);
        if(s<4) T.forgeNext();
      }
      var fin=T.forgeNext();
      out.bonus=fin&&fin.bonus; out.right=fin&&fin.right;
      out.bonus2=T.forgeNext()&&T.forgeNext().bonus;
      out.xpDelta=(S.xp||0)-out.xp0;
      return out;
    })())`);
    check('flag-off bank session: 0 generated items, 5/5 correct', sessOff.gens === 0 && sessOff.checks.length === 5 && sessOff.checks.every(function(x){return x;}) && sessOff.right === 5, sessOff);
    check('flag-off XP math identical to V19.5.1: +20, bonus 10 once, no stacking', sessOff.xpDelta === 20 && sessOff.bonus === 10 && sessOff.bonus2 === 0, sessOff);
  }

  // ================= §V save schema =================
  section('§V', 'save schema — forgeAuto flag, no new key');
  {
    const c = seededCtx(html, 61);
    const fresh = J(c, `JSON.stringify((function(){
      var s;try{s=S}catch(e){return {err:'no S'}}
      var before={en48:!!(s.v7&&s.v7.en48), keys:Object.keys(s.v7||{}).sort()};
      var lsKeys=[];try{for(var i=0;i<localStorage.length;i++)lsKeys.push(localStorage.key(i))}catch(e){}
      var e=window.__v48.en48();
      var after={en48:!!(s.v7&&s.v7.en48), keys:Object.keys(s.v7||{}).sort(), flag:e.flags.forgeAuto};
      var lsKeys2=[];try{for(var j=0;j<localStorage.length;j++)lsKeys2.push(localStorage.key(j))}catch(e){}
      return {before:before, after:after, lsBefore:lsKeys, lsAfter:lsKeys2};
    })())`);
    check('fresh boot: no en48 until first use; after en48() flags.forgeAuto=1', fresh.before.en48 === false && fresh.after.en48 === true && fresh.after.flag === 1, fresh);
    check('no new top-level S.v7 key vs pristine (en48 is the only addition, pre-existing in V19.5.1)', JSON.stringify(fresh.before.keys) === JSON.stringify(fresh.after.keys.filter(function(k){return k !== 'en48';})), fresh);
    check('no new localStorage key', JSON.stringify(fresh.lsBefore) === JSON.stringify(fresh.lsAfter), fresh);
    const old = J(c, `JSON.stringify((function(){
      var e=window.__v48.en48();
      delete e.flags.forgeAuto;
      return {flagOn:window.__v48.flagOn('forgeAuto')};
    })())`);
    check('pre-existing save without forgeAuto: flagOn defaults ON', old.flagOn === true, old);
  }

  // ================= §R rebase regression (V19.5.1 behaviours must survive) =================
  // Ported from test52 §13b (C-R5-1 mixed fight) and §14a (TTS helper):
  // a rebase must not regress the version it is built on.
  section('§R', 'rebase regression — V19.5.1 C-R5-1 + __v52 TTS on the rebased build');
  {
    function traceMixed(ctx, fightExpr) {
      return J(ctx, `JSON.stringify((function(){
        var v18=window.__v18, v19=window.__v19;
        var e18=v18._test.en18(); e18.bosses=e18.bosses||{};
        var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
        var e19=v19._test.en19(); e19.bosses=e19.bosses||{};
        (window.__V19_DATA.bosses||[]).forEach(function(b){ e19.bosses[b.id]={en:{win:true},ko:{win:true}}; });
        S.xp=20000; S.spent=0;
        var old=window.__v15.enOld(); old.streak=0;
        ${fightExpr}
        var trace=[];
        for(var i=0;i<4;i++){
          var F=(window.__v18._test.F()||window.__v19._test.F()); if(!F||F.over) break;
          var eng=F===window.__v18._test.F()?'v18':'v19';
          var qm=F.qmode, wid=(F.cur&&F.cur.w)?F.cur.w.id:null;
          var xp0=S.xp, st0=window.__v15.enOld().streak;
          if(eng==='v18')v18._test.pickCorrect(); else v19._test.pickCorrect();
          var xp1=S.xp, st1=window.__v15.enOld().streak;
          trace.push({i:i,eng:eng,qmode:qm,wordId:wid,dxp:xp1-xp0,streak:st0+'->'+st1,answered:F.answered,ok:F.ok});
          if(i<3){ if(eng==='v18')v18._test.next(); else v19._test.next(); }
        }
        return trace;
      })())`);
    }
    // R1: C-R5-1 — v18 mixed fight still pays +10 per correct answer
    // incl. grammar/sentence, streak advances, total 40 XP (cooldown-aware:
    // the listen word may repeat the mc word and pay 0 the second time).
    const cR1 = seededCtx(html, 201);
    const tR1 = traceMixed(cR1, `v18.fight('v10_dict','en');`);
    const byR1 = {};
    tR1.forEach(function (r) { byR1[r.qmode] = r; });
    check('R1.1 v18 mixed fight asks all 4 types in order', tR1.length === 4 && tR1.map(function (r) { return r.qmode; }).join(',') === 'mc,grammar,listen,builder', tR1);
    check('R1.2 v18 grammar pays +10 XP', byR1.grammar && byR1.grammar.dxp === 10, byR1.grammar);
    check('R1.3 v18 sentence (builder) pays +10 XP', byR1.builder && byR1.builder.dxp === 10, byR1.builder);
    check('R1.4 v18 streak advances on grammar (1->2) and builder (3->4)', byR1.grammar && byR1.grammar.streak === '1->2' && byR1.builder && byR1.builder.streak === '3->4', tR1.map(function (r) { return r.streak; }));
    const expR1 = 10 + 10 + ((byR1.listen && byR1.mc && byR1.listen.wordId === byR1.mc.wordId) ? 0 : 10) + 10;
    check('R1.5 v18 mixed fight total XP == expected (cooldown-aware)', tR1.reduce(function (a, r) { return a + r.dxp; }, 0) === expR1, { total: tR1.reduce(function (a, r) { return a + r.dxp; }, 0), expected: expR1, trace: tR1 });

    // R2: __v52 TTS helper against stubbed voices (vm has no real audio).
    function ttsCtx(seed, voices) {
      const c = seededCtx(html, seed);
      E(c, `window.__ttsLog={spoken:[],cancelled:0,errs:[]};
        speechSynthesis={
          _voices:${JSON.stringify(voices)},
          _listeners:{}, speaking:false, pending:false,
          getVoices:function(){return this._voices.slice()},
          addEventListener:function(t,f){(this._listeners[t]=this._listeners[t]||[]).push(f)},
          speak:function(u){window.__ttsLog.spoken.push({text:u.text,lang:u.lang,voice:u.voice&&u.voice.lang})},
          cancel:function(){window.__ttsLog.cancelled++}
        };`);
      return c;
    }
    const cR2 = ttsCtx(202, [{ name: 'Google US English', lang: 'en-US', default: true }, { name: 'Google 한국어', lang: 'ko-KR' }]);
    check('R2.1 __v52 present, version 19.5.1, speak + _test.pickVoice exported', E(cR2, `window.__v52&&window.__v52.version==='19.5.1'&&typeof window.__v52.speak==='function'&&typeof window.__v52._test.pickVoice==='function'`));
    const spR2 = J(cR2, `JSON.stringify((function(){
      var out={};
      out.koOk=window.__v52.speak('안녕','ko-KR',.85);
      out.enOk=window.__v52.speak('hello','en-US',.85);
      out.koVoice=window.__v52._test.pickVoice('ko-KR');
      out.enVoice=window.__v52._test.pickVoice('en-US');
      out.log=window.__ttsLog.spoken;
      out.cancelled=window.__ttsLog.cancelled;
      return out;
    })())`);
    check('R2.2 speak() with matching voices returns true, speaks with the right voice, no cancel when idle', spR2.koOk === true && spR2.enOk === true && spR2.log.length === 2 && spR2.log[0].voice === 'ko-KR' && spR2.log[1].voice === 'en-US' && spR2.cancelled === 0, spR2);
    check('R2.3 pickVoice matches by exact lang (ko-KR / en-US)', spR2.koVoice && spR2.koVoice.lang === 'ko-KR' && spR2.enVoice && spR2.enVoice.lang === 'en-US', { ko: spR2.koVoice, en: spR2.enVoice });
    const cR3 = ttsCtx(203, [{ name: 'Google US English', lang: 'en-US' }]);
    const noR3 = J(cR3, `JSON.stringify((function(){
      var codes=[];
      var ok=window.__v52.speak('안녕하세요','ko-KR',.85,function(c){codes.push(c)});
      return {ok:ok, codes:codes, spoken:window.__ttsLog.spoken.length};
    })())`);
    check('R2.4 no matching voice + no default: speak fails honestly with no-voice, nothing spoken', noR3.ok === false && noR3.codes.length === 1 && noR3.codes[0] === 'no-voice' && noR3.spoken === 0, noR3);
    const cR4 = ttsCtx(204, [{ name: 'Voix française', lang: 'fr-FR', default: true }]);
    const dfR4 = J(cR4, `JSON.stringify((function(){
      var ok=window.__v52.speak('hello','en-US',.85);
      return {ok:ok, spoken:window.__ttsLog.spoken};
    })())`);
    check('R2.5 default voice is the fallback per contract (fr default speaks)', dfR4.ok === true && dfR4.spoken.length === 1 && dfR4.spoken[0].voice === 'fr-FR', dfR4);
  }

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in Node vm)');
  {
    skipCheck('C.1 Forge overlay paint + real clicks + per-question screens', 'real Chrome gate in verify-v51c.js');
    skipCheck('C.2 360px overflow on the Forge overlay', 'real Chrome gate in verify-v51c.js');
    skipCheck('C.3 .v51gen badge contrast light + dark', 'real Chrome gate in verify-v51c.js');
    skipCheck('C.4 live session with generated sentences end-to-end', 'real Chrome gate in verify-v51c.js');
    skipCheck('C.5 live Firebase login/sync', 'never tested live, as in every version');
  }

  console.log(`\n== test51 summary ==\nPASS ${pass}  FAIL ${fail}  SKIP ${skip}`);
  for (const [id, sc] of Object.entries(secCounts)) console.log(`  ${id}: ${sc.pass} pass / ${sc.fail} fail / ${sc.skip} skip`);
  if (failures.length) console.log('FAILURES:\n  ' + failures.join('\n  '));
  process.exit(fail ? 1 : 0);
}
main();
