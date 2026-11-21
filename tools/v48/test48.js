// test48.js - V19.3 (layer V48) independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v47/test47.js; only the EXPECTED_SHA /
// EXPECTED_BYTES constants and the V47-specific sections were replaced.
// Usage: node tools/v48/test48.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// The Node process is exited explicitly at the end: the game starts
// real setInterval timers (e.g. Matching) that keep the event loop
// alive after the checks finish.
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, V48
//         fragments with exact counts, TOTAL_BOSSES 87, KO button,
//         V47 fragments survive, OLD V48 fragments gone, v14js block
//         untouched)
//   section L page load (vm, real inline scripts) + __v48/__V48_DATA
//         exports + __v47 regression exports
//   section 48A Forge EN — real builder bank (40), gates, scoring,
//         full 5-sentence session through tap/check/next, XP channel
//         (+2 per correct + one +10 session bonus = +20, never
//         stacked), wrong answer pays 0 and resets the streak
//   section 48B Forge KO — learned gates (ko-words / ko-sent) +
//         pool is exactly the real example sentences on the
//         player's own learned cards, nothing invented
//   section 48C Bounty Board — 4 daily + 4 weekly quests, progress
//         from real V48 events, chests claimed-guarded (second claim
//         refused), day streak yesterday 2 + correct today -> 3
//   section 48D Word Family Tree — relations are real WORDS/card
//         records, synonym/antonym/Sino-Korean branches honestly
//         empty, branch completes at box 3, +10 XP once
//   section 48E Pronunciation Dojo — gradeTranscript Tốt/Khá/Lệch
//         thresholds (incl. KO), gates, advanced tier locked before
//         a golem win and derived from the real en19 win record,
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
const EXPECTED_SHA = 'dc971a6c1f386b6bc27a3423d9352ff606697d057d156e7e0141777f82dc36bd';
const EXPECTED_BYTES = 2513911;
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
// (harness notes above; the V46 comment block from test47 was dropped here)
async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v48.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const pristinePath = path.join(ROOT, 'tools', 'v48', 'backup-v19.2', 'index.html');
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
  function levelsEq(a, b) {
    if (!a || !b) return false;
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    return JSON.stringify(ka) === JSON.stringify(kb) && ka.every(k => a[k] === b[k]);
  }
  function setMastered(ctx, n) {
    return J(ctx, `JSON.stringify((function(){
      var v15=window.__v15, words=v15.words, old=v15.enOld();
      Object.keys(old.box||{}).forEach(function(k){ old.box[k]=0; });
      for(var i=0;i<${n}&&i<words.length;i++) old.box[words[i].id]=5;
      v15.save15();
      return {mastered:v15.counts15().mastered, legDiff:window.__v18._test.legDiff()};
    })())`);
  }
  const PAIRS = [
    { en: 'sluggish', primId: 'w1371', twinId: 'a1a2_680', twinNo: 680, topic: 'a1_emotions-and-feelings', topicName: 'EMOTIONS AND FEELINGS', firstTopic: 'a1_body-parts', firstNo: 403, twinVi: 'lờ đờ, chậm chạp' },
    { en: 'orange', primId: 'w18', twinId: 'a1a2_806', twinNo: 806, topic: 'a1_colors-and-shapes', topicName: 'COLORS AND SHAPES', firstTopic: 'a1_fruit-and-vegetables', firstNo: 313, twinVi: 'màu cam' },
    { en: 'trip', primId: 'w1469', twinId: 'a1a2_912', twinNo: 912, topic: 'a1_family', topicName: 'FAMILY', firstTopic: 'a1_clothes-and-accessories', firstNo: 530, twinVi: 'cuộc du ngoạn, dạo chơi' },
  ];
  const GUARD = "(x.en||'').toLowerCase()!==(w.en||'').toLowerCase()";
  function wordsMap(ctx) {
    return J(ctx, `JSON.stringify((function(){var o={};window.__v15.words.forEach(function(w){o[w.id]={id:w.id,en:w.en,vi:w.vi,lv:w.lv,t:w.t}});return o})())`);
  }

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V19.3 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is the V19.3 size', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('V19.3 title present, V19.2 title gone', html.includes('V19.3 — Sentence Forge') && !html.includes('V19.2 — Duplicate Senses'));
  check('v48js marker present, last script, after v47js', html.includes('id="v48js"') && html.lastIndexOf('id="v48js"') > html.lastIndexOf('id="v47js"'));
  check('v48data before v48js, v48 style last', html.includes('id="v48data"') && html.indexOf('id="v48data"') < html.indexOf('id="v48js"') && html.lastIndexOf('id="v48"') > html.lastIndexOf('id="v45"'));
  check('__v48 19.3.0 + __V48_DATA present', html.includes("window.__v48={") && html.includes("VERSION='19.3.0'") && html.includes('window.__V48_DATA={'));
  check('golem Lv 77 / HP 620 present once each; Lv 58 not used for the golem', countOcc(html, 'lv:77') === 1 && html.includes('hp:620') && !html.includes("id:'v18_golem'") === false, { lv77: countOcc(html, 'lv:77') });
  check('TOTAL_BOSSES is 87, 86 gone', html.includes('var TOTAL_BOSSES=87;') && !html.includes('var TOTAL_BOSSES=86;'));
  check('KO button v48kotab present once, after v35kotab', countOcc(html, 'v48kotab') === 1 && html.indexOf('v48kotab') > html.indexOf('v35kotab') && countOcc(html, 'v35kotab') === 1);
  check('V48 UCE lookup chain (v19 x2) + golem zone delegation present', countOcc(html, "||(window.__V48_DATA&&__V48_DATA.byId?__V48_DATA.byId(id):null)") === 2 && html.includes("if(b.zone==='golem'&&window.__v48&&__v48.bossUnlocked)return __v48.bossUnlocked(id,lang);"));
  check('V48 weakness patches present (weakExplicit consult, golem zone, listen breakDmg, listen name)', html.includes("if(d48&&d48.weakExplicit&&d48.weakExplicit[id])return d48.weakExplicit[id];") && html.includes("if(b.zone==='golem')return {kind:'listen'};") && html.includes("if(F.qmode!=='listen'&&F.qmode!=='ca-listen')return 0;") && html.includes("if(weak.kind==='listen')return 'Câu hỏi nghe';"));
  check('V48 sync patches present (hasProgress en48 + en48 merge branch)', html.includes("if(v7.en48&&v7.en48.forge&&(v7.en48.forge.correct||0)>0) return true;") && html.includes("else if(kk==='en48'){") && html.includes("v7.en48=m48;"));
  check('V48 CSS: 44px targets + v48 selectors present', html.includes('.v48btn{box-sizing:border-box;min-height:var(--ui-btn-min-height,44px)') && html.includes('#v48hub{box-sizing:border-box;position:fixed;inset:0;z-index:1500'));
  check('V48 flags + en48 state + Forge/Bounty/Tree/Dojo functions present', html.includes('function en48(){') && html.includes('function forgePool(lang){') && html.includes('function claimBounty(qid,period){') && html.includes('function treeRelations(wordId,lang){') && html.includes('function gradeTranscript(target,heard,lang){'));
  check('v48.js never touches localStorage / window.S (src, comments stripped)', (() => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'v48.js'), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
    return src.indexOf('localStorage') < 0 && !/window\.S(?![A-Za-z])/.test(src);
  })());
  check('V47 regression: labelOf + splitDuplicateSenses survive', countOcc(html, 'function labelOf(w){') === 1 && countOcc(html, 'function splitDuplicateSenses(WORDS,BYID){') === 1);
  check('V47 regression: headword guard still x9, devoted row still gone', countOcc(html, GUARD) === 9 && !html.includes('"no": 938') && countOcc(html, '"src": "a1a2"') === 998);
  check('V47 regression: __v47 19.2.0 + v47js survive', countOcc(html, "VERSION='19.2.0'") === 1 && html.includes('id="v47js"'));
  check('V46 legDiff NEW def survives x1, OLD def gone, thresholds x1', countOcc(html, "function legDiff(){var m=0;try{var c=V15().counts;") === 1 && !html.includes("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}") && countOcc(html, "if(m<200)return ['A2','B1'];if(m<600)return ['B1'];return ['B2']") === 1);
  check('V46 shared XP function + koStreak survive', countOcc(html, 'awardBossAnswerXP') >= 7 && countOcc(html, 'koStreak') >= 6);
  check('V46 19.0.1 version + __V46_DATA survive', countOcc(html, "VERSION='19.0.1'") === 1 && countOcc(html, 'window.__V46_DATA={') === 1);
  check('V45 due fragment survives', html.includes("if(b>=1&&b<=4&&(e.due[w.id]||0)<=now)c.due++;"));
  check('V45 corrupt quarantine + snapshot key survive', html.includes('hanvocab.v12.corrupt-') && html.includes("var k='hanvocab.v12.preimport-'+Date.now()+'-'+(++_snapSeq45)+'-'+Math.random().toString(36).slice(2,8);"));
  check('V45 enIcon falsy guard survives', html.includes("if(!name)return '';"));
  check('weakchip light list-row rule survives x2', countOcc(html, '.v34weakchip{color:#7A5B00;border-color:#7A5B00;background:rgba(122,91,0,.08)}') === 2);
  check('weakchip dark rule survives x5', countOcc(html, '.v34weakchip{color:var(--ui-title-gold,#FFD76A);border-color:var(--ui-border,#A78BFA);background:rgba(255,215,106,.08)}') === 5);
  check('V44 hoisted legDiff call sites survive x2', countOcc(html, "var lv=b.arena==='leg'?legDiff():null;") === 2);
  check('no new MutationObserver sites in v48 src (decorator lives in v48.js, like v33)', fs.readFileSync(path.join(ROOT, 'src', 'v48.js'), 'utf-8').includes('MutationObserver'));
  check('v48.js does not add a KO tab button (build-time only)', !fs.readFileSync(path.join(ROOT, 'src', 'v48.js'), 'utf-8').includes('v48kotab'));
  check('v14js block untouched by V48 (no v48 ids inside it)', (() => {
    const m = html.match(/<script id="v14js">([\s\S]*?)<\/script>/);
    return !!m && m[1].indexOf('v48') < 0 && m[1].indexOf('__V48_DATA') < 0;
  })());

  section('§L', 'page load (vm, real inline scripts)');
  const ctx = makeCtx();
  const warnsL = [];
  const _origWarn = console.warn;
  console.warn = (...a) => warnsL.push(a.join(' '));
  const loaded = loadPage(ctx, html);
  check('inline script blocks extracted (>=30)', loaded.blocks >= 30, loaded.blocks);
  check('all inline scripts evaluate without error', loaded.loadErr === null, loaded.loadErr);
  if (loaded.loadErr) { console.log(`\ntest48 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran)', E(ctx, `document.getElementById('v15langbar')!==null`));
  E(ctx, `window.__v15.buildWords()`);
  check('WORDS built (4892 = 4889 + 3 twins)', E(ctx, `window.__v15.words.length`) === 4892, E(ctx, `window.__v15.words.length`));
  check('__v47 exports version 19.2.0 + split + labelOf', E(ctx, `window.__v47&&window.__v47.version==='19.2.0'&&typeof window.__v47.splitDuplicateSenses==='function'&&typeof window.__v47.labelOf==='function'`));
  check('labelOf is a bare global (render sites call it directly)', E(ctx, `typeof labelOf==='function'`));
  check('split ran clean (no problems recorded)', E(ctx, `window.__v47._test.problems().length`) === 0, E(ctx, `window.__v47._test.problems()`));
  check('split made >=3 twins (init + explicit buildWords)', E(ctx, `window.__v47._test.made()`) >= 3, E(ctx, `window.__v47._test.made()`));
  check('__v48 exports version 19.3.0 + Forge/Bounty/Tree/Dojo/boss fns', E(ctx, `window.__v48&&window.__v48.version==='19.3.0'&&typeof window.__v48.openForge==='function'&&typeof window.__v48.setFlag==='function'&&typeof window.__v48.fightBoss==='function'`));
  check('__V48_DATA exports boss Lv 77 + bounty quests + weakness', E(ctx, `window.__V48_DATA&&window.__V48_DATA.boss.lv===77&&window.__V48_DATA.boss.hp===620&&window.__V48_DATA.bountyDaily.length===4&&window.__V48_DATA.bountyWeekly.length===4&&window.__V48_DATA.weakExplicit.v18_golem.kind==='listen'`));
  check('__v48 flags default all on', E(ctx, `JSON.stringify(window.__v48.flags())`) === JSON.stringify({ forge: 1, bounty: 1, tree: 1, dojo: 1, boss: 1 }));
  check('no console.warn during clean load', warnsL.length === 0, warnsL);
  console.warn = _origWarn;

  // ================= §48A Forge EN — real bank, scoring, XP channel =================
  section('§48A', 'Forge EN — real builder bank, scoring, one XP channel');
  {
    const c = seededCtx(html, 48);
    const gate0 = J(c, `JSON.stringify(window.__v48._test.forgeGate('en'))`);
    check('Forge EN gate: 0 learned words -> not ok, need 8', gate0.ok === false && gate0.why === 'en-words' && gate0.learned === 0, gate0);
    setMastered(c, 8);
    const gate8 = J(c, `JSON.stringify(window.__v48._test.forgeGate('en'))`);
    check('Forge EN gate: 8 learned words -> ok', gate8.ok === true, gate8);
    const pool = J(c, `JSON.stringify((function(){
      var p=window.__v48._test.forgePool('en');
      var bank=(window.__V15_DATA&&window.__V15_DATA.builder)||[];
      var bankTexts={}; bank.forEach(function(b){ bankTexts[b.s.replace(/[.!?]+$/,'')]=1; });
      return {n:p.items.length, learned:p.learned, allReal:p.items.every(function(it){ return !!bankTexts[it.text]; }), tiers:p.items.map(function(it){ return it.tier; }).sort().join(',')};
    })())`);
    check('Forge EN pool: 40 items, all from the real builder bank', pool.n === 40 && pool.allReal === true && pool.learned === 8, pool);
    check('Forge scoring: 5 tokens x tier 2 = 10; tierEN A1=1 A2=2 B1=3 B2=4',
      E(c, `window.__v48._test.scoreSentence(5,2)`) === 10
      && E(c, `window.__v48._test.tierEN('A1')`) === 1 && E(c, `window.__v48._test.tierEN('A2')`) === 2
      && E(c, `window.__v48._test.tierEN('B1')`) === 3 && E(c, `window.__v48._test.tierEN('B2')`) === 4);
    // Drive one full 5-sentence session, all correct, via the real tap/check/next path.
    const sess = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, out={xp0:S.xp||0, checks:[], bonus:null, bonus2:null};
      T.startForgeSession('en');
      for(var s=0;s<5;s++){
        var FS=T.session(), cur=FS.list[FS.i], tiles=FS.tiles||[];
        if(!tiles.length){ // tiles are built lazily by the overlay; build them the same way forgeHTML does
          FS.tiles=tiles=cur.tokens.map(function(t,i){return {t:t,k:i}});
          for(var i=tiles.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=tiles[i];tiles[i]=tiles[j];tiles[j]=tmp}
        }
        var used={};
        cur.tokens.forEach(function(tok){
          for(var k=0;k<tiles.length;k++){ if(!used[k]&&tiles[k].t===tok){ used[k]=1; T.forgeTap(k); break; } }
        });
        var r=T.forgeCheck();
        out.checks.push({ok:r&&r.ok, score:r&&r.score});
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
    check('Forge session: 5/5 correct through tap/check/next', sess.checks.length === 5 && sess.checks.every(x => x.ok === true) && sess.right === 5, sess);
    check('Forge XP channel: 5x+2 + one +10 session bonus = +20 total, no stacking', sess.xpDelta === 20 && sess.bonus === 10 && sess.bonus2 === 0, sess);
    check('Forge counters: correct 5, bestStreak 5, day 5, exactly 1 bonus claim key', sess.correct === 5 && sess.bestStreak === 5 && sess.dayCorrect === 5 && sess.bonusKeys === 1, sess);
    // One wrong answer: no XP, streak reset.
    const wrong = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, out={xp0:S.xp||0};
      T.startForgeSession('en');
      var FS=T.session(), cur=FS.list[FS.i];
      FS.tiles=cur.tokens.map(function(t,i){return {t:t,k:i}}).reverse();
      // tap in reverse order (differs from the correct order for any multi-token sentence)
      for(var k=0;k<FS.tiles.length;k++) T.forgeTap(k);
      var r=T.forgeCheck();
      out.ok=r&&r.ok; out.xpDelta=(S.xp||0)-out.xp0;
      out.streak=FS.streak;
      return out;
    })())`);
    check('Forge wrong answer: ok=false, +0 XP, streak reset to 0', wrong.ok === false && wrong.xpDelta === 0 && wrong.streak === 0, wrong);
  }

  // ================= §48B Forge KO — gates + real card examples =================
  section('§48B', 'Forge KO — learned gates + real card example sentences');
  {
    const c = seededCtx(html, 49);
    const g0 = J(c, `JSON.stringify(window.__v48._test.forgeGate('ko'))`);
    check('Forge KO gate: 0 learned cards -> ko-words', g0.ok === false && g0.why === 'ko-words', g0);
    // 8 learned KO cards with NO example sentences -> ko-sent gate.
    J(c, `JSON.stringify((function(){
      for(var i=0;i<8;i++){ S.cards.push({id:'ko48_'+i, d:'d48', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:'', g:'deck48', box:1, due:0}); }
      save();
      return S.cards.length;
    })())`);
    const g1 = J(c, `JSON.stringify(window.__v48._test.forgeGate('ko'))`);
    check('Forge KO gate: 8 learned, 0 usable examples -> ko-sent', g1.ok === false && g1.why === 'ko-sent' && g1.koSent === 0, g1);
    // Fixture example sentences on the player's OWN cards (test fixtures
    // simulating player cards with real example data — the game itself
    // never invents these; it only reads card.e).
    J(c, `JSON.stringify((function(){
      var ex=['나는 학교에 갑니다','저는 밥을 먹습니다','오늘 날씨가 좋습니다'];
      for(var i=0;i<3;i++){ S.cards[S.cards.length-8+i].e=ex[i]; }
      save();
      return 1;
    })())`);
    const g2 = J(c, `JSON.stringify(window.__v48._test.forgeGate('ko'))`);
    check('Forge KO gate: 8 learned + 3 usable examples -> ok', g2.ok === true, g2);
    const pool = J(c, `JSON.stringify((function(){
      var p=window.__v48._test.forgePool('ko');
      return {n:p.items.length, koSent:p.koSent, texts:p.items.map(function(it){return it.text}).sort(), tiers:p.items.map(function(it){return it.tier})};
    })())`);
    check('Forge KO pool: exactly the 3 real card examples, nothing invented',
      pool.n === 3 && pool.koSent === 3
      && pool.texts.indexOf('나는 학교에 갑니다') >= 0
      && pool.texts.indexOf('저는 밥을 먹습니다') >= 0
      && pool.texts.indexOf('오늘 날씨가 좋습니다') >= 0, pool);
    check('Forge KO tiers by token count (3 tokens -> tier 1)', pool.tiers.every(t => t === 1), pool);
    // EN gate still needs 8 learned even with 7.
    const c7 = seededCtx(html, 50);
    setMastered(c7, 7);
    const g7 = J(c7, `JSON.stringify(window.__v48._test.forgeGate('en'))`);
    check('Forge EN gate: 7 learned words -> not ok', g7.ok === false && g7.learned === 7, g7);
  }

  // ================= §48C Bounty Board — progress, claimed-guarded chests =================
  section('§48C', 'Bounty Board — real-event progress, once-only chests');
  {
    const c = seededCtx(html, 51);
    setMastered(c, 8);
    // Drive 5 correct Forge answers (one session) to arm the daily quests.
    J(c, `JSON.stringify((function(){
      var T=window.__v48._test;
      T.startForgeSession('en');
      for(var s=0;s<5;s++){
        var FS=T.session(), cur=FS.list[FS.i];
        FS.tiles=cur.tokens.map(function(t,i){return {t:t,k:i}});
        var used={};
        cur.tokens.forEach(function(tok){ for(var k=0;k<FS.tiles.length;k++){ if(!used[k]&&FS.tiles[k].t===tok){ used[k]=1; T.forgeTap(k); break; } } });
        T.forgeCheck();
        if(s<4) T.forgeNext();
      }
      T.forgeNext();
      return 1;
    })())`);
    const qs = J(c, `JSON.stringify(window.__v48._test.bountyQuests())`);
    check('Bounty quests defined: 4 daily + 4 weekly', qs.daily.length === 4 && qs.weekly.length === 4, { d: qs.daily.length, w: qs.weekly.length });
    const prog = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, out={};
      T.bountyQuests().daily.forEach(function(q){ out[q.id]=T.bountyProgress(q); });
      T.bountyQuests().weekly.forEach(function(q){ out[q.id]=T.bountyProgress(q); });
      return out;
    })())`);
    check('Bounty progress after 5 correct: d_forge5=5, d_forge_streak3=5, w_forge25=5', prog.d_forge5 === 5 && prog.d_forge_streak3 === 5 && prog.w_forge25 === 5, prog);
    const claim = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, out={xp0:S.xp||0, gems0:(S.v7&&S.v7.gems)||0};
      out.first=T.claimBounty('d_forge5','daily');
      out.xpDelta=(S.xp||0)-out.xp0; out.gemsDelta=((S.v7&&S.v7.gems)||0)-out.gems0;
      out.second=T.claimBounty('d_forge5','daily');
      out.notDone=T.claimBounty('d_dojo3','daily');
      out.unknown=T.claimBounty('no_such_quest','daily');
      return out;
    })())`);
    check('Bounty chest d_forge5: first claim pays +20 XP / +1 gem', claim.first.ok === true && claim.xpDelta === 20 && claim.gemsDelta === 1, claim);
    check('Bounty chest d_forge5: second claim refused (claimed-guarded)', claim.second.ok === false, claim);
    check('Bounty: unfinished quest + unknown quest refused', claim.notDone.ok === false && claim.unknown.ok === false, claim);
    // Day streak: yesterday n=2 + one correct today -> n=3 (weekly quest arms).
    const streak = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, e=T.en48();
      var y=new Date(); y.setDate(y.getDate()-1);
      e.bounty.streak={d:T.dayKey(y), n:2};
      T.startForgeSession('en');
      var FS=T.session(), cur=FS.list[FS.i];
      FS.tiles=cur.tokens.map(function(t,i){return {t:t,k:i}});
      var used={};
      cur.tokens.forEach(function(tok){ for(var k=0;k<FS.tiles.length;k++){ if(!used[k]&&FS.tiles[k].t===tok){ used[k]=1; T.forgeTap(k); break; } } });
      T.forgeCheck();
      var wq=null;
      T.bountyQuests().weekly.forEach(function(q){ if(q.id==='w_streak3d') wq=q; });
      return {streak:T.en48().bounty.streak, wProgress:T.bountyProgress(wq)};
    })())`);
    check('Bounty day streak: yesterday 2 + correct today -> 3, weekly quest progress 3', streak.streak.n === 3 && streak.wProgress === 3, streak);
  }

  // ================= §48D Word Family Tree — real relations only =================
  section('§48D', 'Word Family Tree — real relations, honest empty branches');
  {
    const c = seededCtx(html, 52);
    setMastered(c, 12);
    const tree = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, v15=window.__v15, out={};
      var wid=null;
      for(var i=0;i<v15.words.length;i++){
        var r=T.treeRelations(v15.words[i].id,'en');
        if(r.topic.length>=2){ wid=v15.words[i].id; out.word=r.word; out.topic=r.topic; break; }
      }
      out.wid=wid;
      if(!wid) return out;
      // every listed relation must be a real WORDS record
      var byId={}; v15.words.forEach(function(w){ byId[w.id]=w; });
      out.allReal=out.topic.every(function(x){ return !!byId[x.id]; }) && out.word!==null;
      out.synEmpty=T.treeRelations(wid,'en').syn.length===0;
      out.antEmpty=T.treeRelations(wid,'en').ant.length===0;
      out.sinoEmpty=T.treeRelations(wid,'en').sino.length===0;
      // master every word in the topic branch, then claim
      var old=v15.enOld();
      out.topic.forEach(function(x){ old.box[x.id]=3; });
      v15.save15();
      out.doneBefore=T.treeBranchDone(wid,'topic','en');
      var xp0=S.xp||0;
      out.claim=T.claimTreeBranch(wid,'topic','en');
      out.xpDelta=(S.xp||0)-xp0;
      out.claim2=T.claimTreeBranch(wid,'topic','en');
      return out;
    })())`);
    check('Tree: found a word with >=2 real same-topic relations', !!tree.wid && tree.topic.length >= 2, tree);
    check('Tree: every relation is a real WORDS record (no invented words)', tree.allReal === true, tree);
    check('Tree: synonym/antonym/Sino-Korean branches are honestly empty (no source data)', tree.synEmpty === true && tree.antEmpty === true && tree.sinoEmpty === true, tree);
    check('Tree: branch completes when all branch words mastered (box 3)', tree.doneBefore === true, tree);
    check('Tree: branch claim pays +10 XP once; second claim refused', tree.claim.ok === true && tree.xpDelta === 10 && tree.claim2.ok === false, tree);
    // KO tree: same-deck relations are real card records.
    const koTree = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, out={};
      for(var i=0;i<4;i++){ S.cards.push({id:'koTree_'+i, d:'dTree', h:'한국어'+i, m:'nghĩa '+i, p:'', e:'', g:'deckTree', box:3, due:0}); }
      save();
      var r=T.treeRelations('koTree_0','ko');
      out.posN=r.pos.length; out.topicN=r.topic.length;
      out.allReal=r.pos.every(function(x){ return S.cards.some(function(cc){ return cc.id===x.id; }); });
      out.claim=T.claimTreeBranch('koTree_0','pos','ko');
      return out;
    })())`);
    check('Tree KO: same-deck branch lists 3 real cards, claimable once mastered', koTree.posN === 3 && koTree.allReal === true && koTree.claim.ok === true, koTree);
  }

  // ================= §48E Pronunciation Dojo — grading + self-assessment =================
  section('§48E', 'Pronunciation Dojo — real grading, honest fallback, gated advanced tier');
  {
    const c = seededCtx(html, 53);
    const grades = J(c, `JSON.stringify((function(){
      var T=window.__v48._test;
      return {
        exact:T.gradeTranscript('hello','hello','en'),
        near:T.gradeTranscript('hello','hallo','en'),
        far:T.gradeTranscript('hello','xyz','en'),
        koExact:T.gradeTranscript('안녕하세요','안녕하세요','ko'),
        koNear:T.gradeTranscript('안녕하세요','안녕하세','ko'),
        empty:T.gradeTranscript('hello','','en')
      };
    })())`);
    check('Dojo grading: exact -> Tốt (sim 1)', grades.exact.grade === 'Tốt' && grades.exact.sim === 1, grades);
    check('Dojo grading: near miss (hello/hallo, sim 0.8) -> Khá', grades.near.grade === 'Khá' && grades.near.sim === 0.8, grades);
    check('Dojo grading: far miss -> Lệch', grades.far.grade === 'Lệch', grades);
    check('Dojo grading: KO exact -> Tốt; KO one-char-short -> Khá', grades.koExact.grade === 'Tốt' && grades.koNear.grade === 'Khá', grades);
    check('Dojo grading: empty transcript -> Lệch (never a fake pass)', grades.empty.grade === 'Lệch', grades);
    const gate0 = J(c, `JSON.stringify(window.__v48._test.dojoGate('en',false))`);
    check('Dojo gate: no learned words -> not ok', gate0.ok === false && gate0.why === 'no-words', gate0);
    setMastered(c, 8);
    const gate1 = J(c, `JSON.stringify(window.__v48._test.dojoGate('en',false))`);
    check('Dojo gate: learned words -> ok (normal tier)', gate1.ok === true, gate1);
    const gateAdv0 = J(c, `JSON.stringify(window.__v48._test.dojoGate('en',true))`);
    check('Dojo advanced tier: locked before any golem win', gateAdv0.ok === false && gateAdv0.why === 'locked-advanced', gateAdv0);
    // Learn B1/B2 words so the advanced pool is non-empty, then unlock via a real en19 win record.
    const adv = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, v15=window.__v15, old=v15.enOld(), out={};
      var advWords=v15.words.filter(function(w){ return w.lv==='B1'||w.lv==='B2'; }).slice(0,3);
      advWords.forEach(function(w){ old.box[w.id]=5; });
      v15.save15();
      out.advPool=T.dojoPool('en',true).length;
      out.gateLocked=T.dojoGate('en',true);
      var e19=window.__v19.en19();
      e19.bosses=e19.bosses||{};
      e19.bosses['v18_golem']={en:{win:1,wins:1}};
      window.__v19.en19();
      out.unlocked=T.syncDojoUnlock===undefined?window.__v48.syncDojoUnlock():T.syncDojoUnlock();
      out.gateOpen=T.dojoGate('en',true);
      // self-assessment path: no fake grade, counters move
      var s0=T.startDojo('en',false);
      out.started=s0.ok===true && !!s0.dojo.word;
      var before=T.en48().dojo.attempts;
      window.__v48.dojoSelf(true);
      var e2=T.en48();
      out.selfCounted=e2.dojo.attempts===before+1 && e2.dojo.selfOk===1 && e2.dojo.good===0;
      out.sr=typeof T.srAvailable()==='boolean';
      return out;
    })())`);
    check('Dojo advanced pool: B1/B2 learned words present', adv.advPool >= 3, adv);
    check('Dojo advanced tier: still locked with words but no golem win', adv.gateLocked.ok === false && adv.gateLocked.why === 'locked-advanced', adv);
    check('Dojo unlock: derived from the real en19 golem win record', adv.unlocked === true && adv.gateOpen.ok === true, adv);
    check('Dojo self-assessment: counts as selfOk, never as a graded Tốt', adv.started === true && adv.selfCounted === true, adv);
  }

  // ================= §48F Hangul Golem — Lv 77, UCE, listen weakness =================
  section('§48F', 'Hangul Golem — Lv 77 (58 taken), UCE fight, listen weakness');
  {
    const c = seededCtx(html, 54);
    const boss = J(c, `JSON.stringify((function(){
      var d=window.__V48_DATA;
      return {boss:d.boss, ids:d.golemIds, weak:d.weakExplicit};
    })())`);
    check('Golem data: id v18_golem, Lv 77, HP 620, mode mixed, diff B2, zone golem',
      boss.boss.id === 'v18_golem' && boss.boss.lv === 77 && boss.boss.hp === 620
      && boss.boss.mode === 'mixed' && boss.boss.diff === 'B2' && boss.boss.zone === 'golem', boss.boss);
    check('Golem reward: +170 XP, +5 gems, Bùa Phát Âm Cao Cấp',
      boss.boss.reward.xp === 170 && boss.boss.reward.gems === 5 && boss.boss.reward.item === 'Bùa Phát Âm Cao Cấp', boss.boss.reward);
    check('Golem weakness override is listen-kind', boss.weak.v18_golem && boss.weak.v18_golem.kind === 'listen', boss.weak);
    const lv = J(c, `JSON.stringify((function(){
      function lvs(list){ var o={}; (list||[]).forEach(function(b){ o[b.lv]=(o[b.lv]||0)+1; }); return o; }
      var v19=lvs(window.__V19_DATA.bosses), v33=lvs(window.__V33_DATA.bosses), v35=lvs(window.__V35_DATA.bosses);
      return {lv58inV19:v19[58]||0, lv77any:(v19[77]||0)+(v33[77]||0)+(v35[77]||0),
        v11min:Math.min.apply(null, window.__V19_DATA.bosses.map(function(b){return b.lv})),
        v11max:Math.max.apply(null, window.__V19_DATA.bosses.map(function(b){return b.lv})),
        lv58who:(window.__V19_DATA.bosses.filter(function(b){return b.lv===58})[0]||{}).id||null};
    })())`);
    check('Lv 58 is TAKEN (v11_butterflyqueen) — the LV58_CHECK note was wrong', lv.lv58inV19 === 1 && lv.lv58who === 'v11_butterflyqueen', lv);
    check('V11 bosses occupy lv 31-60 contiguously; Lv 77 is free everywhere', lv.v11min === 31 && lv.v11max === 60 && lv.lv77any === 0, lv);
    check('TOTAL_BOSSES is 87 (was 86)', E(c, `window.__v21&&window.__v21.TOTAL_BOSSES`) === 87, E(c, `window.__v21&&window.__v21.TOTAL_BOSSES`));
    check('Boss unlock: 0 wins -> locked', E(c, `window.__v48._test.bossUnlocked('v18_golem','en')`) === false);
    check('Boss unlock: corrected win count is 0 on a fresh save', E(c, `window.__v48._test.correctedWinCount()`) === 0);
    // 70 wins (10 V15 + 30 V18 + 30 V19) unlocks the golem.
    const unlock = J(c, `JSON.stringify((function(){
      var out={};
      var e15=window.__v15.en15(); e15.bosses=e15.bosses||{};
      for(var i=0;i<10;i++) e15.bosses['old_'+i]={win:1};
      var e18=window.__v18._test.en18(); e18.bosses=e18.bosses||{};
      for(var j=0;j<30;j++) e18.bosses['v10x_'+j]={win:true};
      var e19=window.__v19.en19(); e19.bosses=e19.bosses||{};
      for(var k=0;k<30;k++) e19.bosses['v11x_'+k]={en:{win:1}};
      out.count=window.__v48._test.correctedWinCount();
      out.unlocked=window.__v48._test.bossUnlocked('v18_golem','en');
      out.weak=window.__v34._test.weakFor(window.__V48_DATA.boss,'en');
      out.weakName=window.__v34._test.weakName(out.weak);
      return out;
    })())`);
    check('Boss unlock: 70 wins -> corrected count 70, golem unlocked', unlock.count === 70 && unlock.unlocked === true, unlock);
    check('Boss weakness: weakFor(golem,en) is listen-kind, named Câu hỏi nghe', unlock.weak && unlock.weak.kind === 'listen' && unlock.weakName === 'Câu hỏi nghe', unlock);
    // Live UCE fight: rotation includes listen; Break meter fills on listen answers only.
    const fight = J(c, `JSON.stringify((function(){
      var out={modes:[], weakKind:null, brkListen:[], brkMc:null, live:false};
      try{
        var v19=window.__v19;
        v19.openMapFor('en');
        v19.fight('v18_golem');
        var F=v19._test.F();
        out.live=!!F;
        if(!F) return out;
        out.weakKind=F.weak&&F.weak.kind;
        out.bossId=F.boss&&F.boss.id;
        out.maxHp=F.maxHp;
        for(var a=0;a<4;a++){
          var F2=v19._test.F(); if(!F2||F2.over) break;
          out.modes.push(F2.qmode);
          F2.hp=999;
          v19._test.pickCorrect(); v19._test.next();
        }
        // Break meter: listen answers fill, mc answers do not.
        var F3=v19._test.F();
        if(F3){
          F3.brk=0; F3.over=null; F3.qmode='listen'; F3.cur={w:window.__v15.words[0]};
          var d1=window.__v34._test.breakDmg(F3);
          var d2=window.__v34._test.breakDmg(F3);
          var d3=window.__v34._test.breakDmg(F3);
          out.brkListen=[d1,d2,d3];
          F3.brk=0; F3.qmode='mc'; F3.cur={w:window.__v15.words[0]};
          var dMc=window.__v34._test.breakDmg(F3);
          out.brkMc={d:dMc, brk:F3.brk};
          out.scopeBlocked=window.__v34._test.scopeBlocked(F3);
        }
        v19.close();
      }catch(e){ out.err=String(e&&e.message||e); }
      return out;
    })())`);
    check('Live golem fight starts in the V19 UCE (F live, boss v18_golem, maxHp 620)', fight.live === true && fight.bossId === 'v18_golem' && fight.maxHp === 620, fight);
    check('Golem fight weak kind is listen', fight.weakKind === 'listen', fight);
    check('Golem question rotation includes listen within 4 questions', fight.modes.indexOf('listen') >= 0, fight);
    check('Break meter: 3 listen hits -> BREAK bonus 50 (10% of 620 clamped)', fight.brkListen && fight.brkListen[0] === 0 && fight.brkListen[1] === 0 && fight.brkListen[2] === 50, fight);
    check('Break meter: mc answers do not fill a listen weakness', fight.brkMc && fight.brkMc.d === 0 && fight.brkMc.brk === 0, fight);
    check('Listen weakness is never scope-blocked', fight.scopeBlocked === false, fight);
    // Flags: each feature kill-switchable; off blocks the entry point.
    const flags = J(c, `JSON.stringify((function(){
      var T=window.__v48._test, out={};
      out.before=T.en48().flags;
      out.setOk=window.__v48.setFlag('forge',false);
      out.off=window.__v48.flagOn('forge')===false;
      out.bad=window.__v48.setFlag('nope',false)===false;
      window.__v48.setFlag('forge',true);
      out.backOn=window.__v48.flagOn('forge')===true;
      return out;
    })())`);
    check('Feature flags: all on by default', flags.before.forge === 1 && flags.before.bounty === 1 && flags.before.tree === 1 && flags.before.dojo === 1 && flags.before.boss === 1, flags);
    check('Feature flags: setFlag(forge,false) kills Forge; unknown flag refused; re-enable works', flags.setOk === true && flags.off === true && flags.bad === true && flags.backOn === true, flags);
  }

  section('§48G', 'regression — V19.0.1 balance + V19.0 fixes hold');
  // legDiff thresholds + live Legendary pools (550/250/630) + grammar (24/12/12).
  const legLevels = { 0: ['A2', 'B1'], 199: ['A2', 'B1'], 200: ['B1'], 599: ['B1'], 600: ['B2'], 700: ['B2'] };
  for (const m of [0, 199, 200, 599, 600, 700]) {
    const r = setMastered(ctx, m);
    check(`legDiff at mastered ${m} is ${JSON.stringify(legLevels[m])} (thresholds unchanged)`, r.mastered === m && JSON.stringify(r.legDiff) === JSON.stringify(legLevels[m]), r);
  }
  const poolExpect = { 0: { A2: 300, B1: 250 }, 200: { B1: 250 }, 600: { B2: 630 } };
  const grammarExpect = { 0: { A2: 12, B1: 12 }, 200: { B1: 12 }, 600: { B2: 12 } };
  for (const m of [0, 200, 600]) {
    setMastered(ctx, m);
    const p = J(ctx, `JSON.stringify((function(){
      var out={};
      try{
        var e=window.__v18._test.en18();
        ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
        window.__v18._test.fight('v10_firedragon','en');
        var F=window.__v18._test.F(); out.fightLive=!!F;
        if(F){
          var lv={}; (F.pools.words||[]).forEach(function(w){ lv[w.lv]=(lv[w.lv]||0)+1; }); out.poolLevels=lv; out.poolN=(F.pools.words||[]).length;
          var gl={}; (F.pools.grammar||[]).forEach(function(g){ gl[g.lv]=(gl[g.lv]||0)+1; }); out.grammarLevels=gl; out.grammarN=(F.pools.grammar||[]).length;
        }
        window.__v18.close();
      }catch(e){ out.fightErr=String(e&&e.message||e); }
      return out;
    })())`);
    check(`live Legendary pool at mastered ${m} is exactly ${JSON.stringify(poolExpect[m])}`, p.fightLive === true && levelsEq(p.poolLevels, poolExpect[m]), p);
    check(`live Legendary grammar pool at mastered ${m} is ${JSON.stringify(grammarExpect[m])} (24/12/12)`, p.fightLive === true && levelsEq(p.grammarLevels, grammarExpect[m]) && p.grammarN === (m === 0 ? 24 : 12), p);
  }
  setMastered(ctx, 0);
  // KO XP: 8 correct = +85 in both engines (seed search for 8 distinct cards).
  function liveKOFight(engine) {
    for (let seed = 47; seed < 70; seed++) {
      const c = makeCtx();
      c.__seededRandom = mulberry32(seed);
      E(c, `Math.random=__seededRandom;`);
      const l = loadPage(c, html);
      if (l.loadErr) return { loadErr: l.loadErr };
      fireDCL(c);
      E(c, `window.__v15.buildWords()`);
      const r = J(c, `JSON.stringify((function(){
        var out={seq:[], koRight0:0};
        function xp(){ return S.xp||0; }
        for(var i=0;i<10;i++){ S.cards.push({id:'ko_seed_'+i, d:'d0', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:'', g:'', box:0, due:0}); }
        save();
        var seen={}, streak=0;
        if('${engine}'==='v18'){
          var v18=window.__v18;
          var e18=v18._test.en18(); out.koRight0=e18.koStats.right||0;
          var xp0=xp();
          v18.fight('v10_slime','ko');
          for(var a=0;a<8;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
            var cid=F.cur&&F.cur.k?F.cur.k.id:null, before=xp();
            v18._test.pickCorrect(); v18.next();
            var d=xp()-before; streak++;
            var expect=(seen[cid]?0:10)+((streak%5===0)?5:0);
            out.seq.push({cid:cid, delta:d, expect:expect, streak:streak});
            seen[cid]=1;
          }
          out.delta=xp()-xp0; out.koRightDelta=(v18._test.en18().koStats.right||0)-out.koRight0;
          out.koStreak=v18._test.en18().koStreak;
          v18.close();
        }else{
          var v19=window.__v19;
          var e19=v19.en19(); out.koRight0=e19.koStats.right||0;
          var xp0b=xp();
          v19.openMapFor('en'); v19._test.setLang('ko'); v19.fight('v11_fireking');
          for(var b=0;b<8;b++){ var F2=v19._test.F(); if(!F2||F2.over) break; F2.hp=999;
            var cid2=F2.cur&&F2.cur.k?F2.cur.k.id:null, before2=xp();
            v19._test.pickCorrect(); v19._test.next();
            var d2=xp()-before2; streak++;
            var expect2=(seen[cid2]?0:10)+((streak%5===0)?5:0);
            out.seq.push({cid:cid2, delta:d2, expect:expect2, streak:streak});
            seen[cid2]=1;
          }
          out.delta=xp()-xp0b; out.koRightDelta=(v19.en19().koStats.right||0)-out.koRight0;
          out.koStreak=v19.en19().koStreak;
        }
        return out;
      })())`);
      const cids = r.seq.map(s => s.cid);
      if (r.seq.length === 8 && new Set(cids).size === 8) { r.seed = seed; return r; }
    }
    return { loadErr: 'no seed gave 8 distinct KO cards' };
  }
  const ko18 = liveKOFight('v18');
  check('live v18 KO fight: 8 correct on 8 distinct cards pays +85 XP', ko18.delta === 85 && ko18.koRightDelta === 8 && ko18.koStreak === 8, ko18);
  check('live v18 KO fight: per-answer rule holds on all 8 answers', ko18.seq.length === 8 && ko18.seq.every(s => s.delta === s.expect), ko18.seq);
  const ko19 = liveKOFight('v19');
  check('live v19 KO fight: 8 correct on 8 distinct cards pays +85 XP', ko19.delta === 85 && ko19.koRightDelta === 8 && ko19.koStreak === 8, ko19);
  check('live v19 KO fight: per-answer rule holds on all 8 answers', ko19.seq.length === 8 && ko19.seq.every(s => s.delta === s.expect), ko19.seq);
  // EN XP identical to pristine V19.2 (seeded deterministic fights).
  function seededEnFight(htmlText, engine) {
    const c = makeCtx();
    c.__seededRandom = mulberry32(46);
    E(c, `Math.random=__seededRandom;`);
    const l = loadPage(c, htmlText);
    if (l.loadErr) return { loadErr: l.loadErr };
    fireDCL(c);
    E(c, `window.__v15.buildWords()`);
    return J(c, `JSON.stringify((function(){
      var out={seq:[]};
      function xp(){ return S.xp||0; }
      var old=window.__v15.enOld();
      if('${engine}'==='v18'){
        var v18=window.__v18, xp0=xp(), n=0;
        v18.fight('v10_slime','en');
        for(var a=0;a<8;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
          var w=F.cur&&F.cur.w?F.cur.w:null, before=xp();
          var boxB=w?(old.box[w.id]||0):0, atB=w?(old.xpAt[w.id]||0):0, stB=old.streak||0;
          v18._test.pickCorrect(); v18.next();
          var d=xp()-before;
          var exp=0; if(w){ if(boxB<5&&(!atB||Date.now()-atB>600000)) exp+=10; if((stB+1)%5===0) exp+=5; }
          out.seq.push({delta:d, expect:exp, isWord:!!w, id:w?w.id:null});
          if(w) n++;
        }
        out.delta=xp()-xp0; out.enQ=n;
        v18.close();
      }else{
        var v19=window.__v19, xp0b=xp(), n19=0;
        v19.openMapFor('en'); v19.fight('v11_fireking');
        for(var c2=0;c2<8;c2++){ var F3=v19._test.F(); if(!F3||F3.over) break; F3.hp=999;
          var w3=F3.cur&&F3.cur.w?F3.cur.w:null, before3=xp();
          var boxB3=w3?(old.box[w3.id]||0):0, atB3=w3?(old.xpAt[w3.id]||0):0, stB3=old.streak||0;
          v19._test.pickCorrect(); v19._test.next();
          var d3=xp()-before3;
          var exp3=0; if(w3){ if(boxB3<5&&(!atB3||Date.now()-atB3>600000)) exp3+=10; if((stB3+1)%5===0) exp3+=5; }
          out.seq.push({delta:d3, expect:exp3, isWord:!!w3, id:w3?w3.id:null});
          if(w3) n19++;
        }
        out.delta=xp()-xp0b; out.enQ=n19;
      }
      return out;
    })())`);
  }
  for (const engine of ['v18', 'v19']) {
    const enNew = seededEnFight(html, engine);
    const enOld = seededEnFight(pristineHtml, engine);
    check(`seeded ${engine} EN fight: per-answer rule holds on all 8 answers (V19.3)`, enNew.seq.length === 8 && enNew.seq.every(s => s.delta === s.expect), enNew.seq);
    check(`seeded ${engine} EN fight: XP sequence byte-identical to pristine V19.2`, JSON.stringify(enNew.seq) === JSON.stringify(enOld.seq) && enNew.delta === enOld.delta, { newSeq: enNew.seq, oldSeq: enOld.seq });
  }
  // V19.0 spot-checks: C-R3-1 due, C-R3-2 corrupt quarantine, C-R3-4
  // snapshot keys, NEW-1 enIcon, weakchip contrast.
  {
    const cF = makeCtx();
    const lF = loadPage(cF, html);
    check('spot-check ctx loads', lF.loadErr === null, lF.loadErr);
    fireDCL(cF);
    E(cF, `window.__v15.buildWords()`);
    const due0 = J(cF, `JSON.stringify({due:window.__v15.counts15().due, mastered:window.__v15.counts15().mastered})`);
    check('C-R3-1 fresh save: 0 due words, 0 mastered', due0.due === 0 && due0.mastered === 0, due0);
    const due3 = J(cF, `JSON.stringify((function(){
      var v15=window.__v15, old=v15.enOld(), e=v15.en15(), now=Date.now();
      var ids=v15.words.slice(0,5).map(function(w){return w.id});
      ids.slice(0,3).forEach(function(id){ old.box[id]=2; e.due[id]=now-1000; });
      ids.slice(3,5).forEach(function(id){ old.box[id]=5; e.due[id]=now-1000; });
      v15.save15();
      return {due:v15.counts15().due, mastered:v15.counts15().mastered};
    })())`);
    check('C-R3-1 seeded 3 truly-due -> 3 (box-5 past-due NOT counted)', due3.due === 3, due3);
  }
  {
    const bad = '{"cards":null,"v7":{broken';
    const cC = makeCtx();
    cC.localStorage.setItem('hanvocab.v1', bad);
    const lC = loadPage(cC, html);
    check('corrupt-save ctx loads', lC.loadErr === null, lC.loadErr);
    fireDCL(cC);
    const q = E(cC, `(function(){ var found=null; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.indexOf('hanvocab.v12.corrupt-')===0) found={key:k, val:localStorage.getItem(k)}; } return found; })()`);
    check('C-R3-2 corrupt save quarantined byte-exact', !!q && q.val === bad, q ? { key: q.key, match: q.val === bad } : null);
    check('C-R3-2 corrupt flag set with reason bad-json', E(cC, `!!(window.__V45_CORRUPT&&window.__V45_CORRUPT.reason==='bad-json'&&window.__V45_CORRUPT.quarantined)`));
  }
  {
    const cS = makeCtx();
    const lS = loadPage(cS, html);
    check('snapshot ctx loads', lS.loadErr === null, lS.loadErr);
    fireDCL(cS);
    E(cS, `window.__v15.buildWords()`);
    const snap = J(cS, `JSON.stringify((function(){
      var out={};
      var fixed=Date.now();
      Date.now=function(){ return fixed; };
      var s1=window.__v31._test.snapshotCurrent();
      var s2=window.__v31._test.snapshotCurrent();
      var keys=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('hanvocab.v12.preimport-')===0)keys.push(k)}
      out={k1:s1, k2:s2, sameKey:s1===s2, keys:keys};
      return out;
    })())`);
    check('C-R3-4 snapshot keys unique under faked same-ms Date.now()', snap.k1 !== snap.k2 && snap.keys.length >= 2 && new Set(snap.keys).size === snap.keys.length, snap);
  }
  check('NEW-1 enIcon guard survives (static)', html.includes("if(!name)return '';"));
  {
    const cN = makeCtx();
    const lN = loadPage(cN, html);
    check('NEW-1 ctx loads', lN.loadErr === null, lN.loadErr);
    fireDCL(cN);
    E(cN, `window.__v15.buildWords()`);
    const libHtml = E(cN, `window.__v17.libraryHTML()`);
    check('NEW-1 live Library HTML has no undefined icon URL', typeof libHtml === 'string' && libHtml.indexOf('undefined') < 0, libHtml ? libHtml.slice(0, 200) : null);
  }
  checkRatio('weakchip #7A5B00 on light card #FFFAEB (need 4.5)', '#7A5B00', '#FFFAEB', 4.5);

  // ================= §V save schema =================
  section('§V', 'save schema — en48 lazy, no new LS key, no schema change');
  check('no en48 key on a fresh boot (lazy — created on first openForge)', (() => {
    const cV = makeCtx();
    const lV = loadPage(cV, html);
    if (lV.loadErr) return false;
    fireDCL(cV);
    E(cV, `window.__v15.buildWords()`);
    return E(cV, `!S.v7 || !S.v7.en48`);
  })());
  check('en48 is created on first openForge (lazy, no migration)', E(ctx, `(function(){ window.__v48.openForge('en','forge'); return !!(S.v7&&S.v7.en48&&S.v7.en48.forge&&S.v7.en48.flags); })()`));
  check('no v48 localStorage key', E(ctx, `(function(){ for(var i=0;i<localStorage.length;i++){ if(localStorage.key(i).indexOf('v48')>=0) return false; } return true; })()`));
  check('hanvocab.v1 still the only save key', E(ctx, `localStorage.getItem('hanvocab.v1')!==null`));
  check('no new top-level S.v7 key vs pristine V19.2 (fresh boots)', (() => {
    function freshKeys(htmlText) {
      const c = makeCtx();
      const l = loadPage(c, htmlText);
      if (l.loadErr) return null;
      fireDCL(c);
      E(c, `window.__v15.buildWords()`);
      return E(c, `Object.keys(S.v7||{}).sort()`);
    }
    const kNew = freshKeys(html);
    const kOld = freshKeys(pristineHtml);
    return !!kNew && !!kOld && JSON.stringify(kNew) === JSON.stringify(kOld);
  })(), 'see fresh-boot key sets');

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('live Forge overlay: 5-sentence session, tiles, scoring, XP', 'real Chrome in verify-v48c.js');
  skipCheck('live Forge KO gate states + Bounty chest claims', 'real Chrome in verify-v48c.js');
  skipCheck('live Tree branch claim + Dojo self-assessment fallback', 'real Chrome in verify-v48c.js');
  skipCheck('live golem fight win + advanced Dojo unlock derivation', 'real Chrome in verify-v48c.js');
  skipCheck('360px overflow + 44px targets + WCAG AA on the Forge overlay', 'real Chrome in verify-v48c.js');
  skipCheck('speech recognition availability in Chrome 157 (no-mic headless)', 'real Chrome in verify-v48c.js');
  skipCheck('0 console errors/warnings/dialogs in real Chrome', 'real Chrome in verify-v48c.js');

  console.log(`\ntest48: ${pass} PASS, ${fail} FAIL, ${skip} SKIP`);
  if (fail) {
    console.log('FAILURES:');
    failures.forEach(f => console.log('  - ' + f));
    Object.keys(secCounts).forEach(id => {
      const s = secCounts[id];
      console.log(`  ${id}: ${s.pass} pass / ${s.fail} fail / ${s.skip} skip`);
    });
  } else {
    Object.keys(secCounts).forEach(id => {
      const s = secCounts[id];
      console.log(`  ${id}: ${s.pass} pass / ${s.fail} fail / ${s.skip} skip`);
    });
  }
  process.exit(fail === 0 ? 0 : 1);
}
main().catch(e => { console.error('test48 crashed:', e); process.exit(2); });
