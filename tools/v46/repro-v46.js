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
// repro-v46.js — V19.0.1 (layer V46) REPRO-FIRST on the pristine V19.0 base.
// Demonstrates the CURRENT behaviour before any fix (no assertions that
// the fix holds — those live in test46.js). Run:
//   node tools/v46/repro-v46.js [DIR]   (default: <repo>/out)
// Exit 0 = repro completed (observations printed + saved to repro-v46.json).
//   R1 legDiff always returns ['A2','B1'] at mastered 700; live Legendary
//      pool is A2 300 / B1 250, never B2.
//   R2 KO correct answers pay 0 XP in BOTH engines (v18 + v19) while EN
//      correct answers pay XP (exact EN deltas recorded as the parity
//      baseline for test46 §46D).
//   R3 blocked-boss recount on the pristine base: 26 (buggy legDiff) and
//      36 if legDiff alone were fixed (the 10 extra = Legendary bosses).
async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const out = { baseSha: sha, baseBytes: fs.statSync(htmlPath).size, dir: DIR };
  console.log('base sha', sha, 'bytes', out.baseBytes);

  // ---------- R1: legDiff ----------
  {
    const ctx = makeCtx();
    const loaded = loadPage(ctx, html);
    if (loaded.loadErr) { console.log('LOAD ERR', loaded.loadErr); process.exit(1); }
    fireDCL(ctx);
    E(ctx, `window.__v15.buildWords()`);
    const r1 = J(ctx, `JSON.stringify((function(){
      var v15=window.__v15, o={};
      o.countsType=typeof v15.counts;
      try{ v15.counts(); o.countsCall='NO-THROW'; }catch(e){ o.countsCall='THROWS:'+e.constructor.name+':'+e.message; }
      var words=v15.words, old=v15.enOld();
      for(var i=0;i<700&&i<words.length;i++) old.box[words[i].id]=5;
      v15.save15();
      o.masteredSeeded=v15.counts15().mastered;
      o.masteredViaGetter=v15.counts.mastered;
      o.legDiff=window.__v18._test.legDiff();
      // live Legendary fight pool at 700 mastered
      try{
        var e=window.__v18._test.en18();
        ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
        window.__v18._test.fight('v10_firedragon','en');
        var F=window.__v18._test.F(); o.fightLive=!!F;
        if(F){ var lv={}; (F.pools.words||[]).forEach(function(w){ lv[w.lv]=(lv[w.lv]||0)+1; }); o.poolLevels=lv; o.poolN=(F.pools.words||[]).length; }
        window.__v18.close();
      }catch(e){ o.fightErr=String(e&&e.message||e); }
      return o;
    })())`);
    out.R1 = r1;
    console.log('R1 legDiff @700 mastered:', JSON.stringify(r1));
  }

  // ---------- R2: KO vs EN XP (both engines) ----------
  {
    const ctx = makeCtx();
    const loaded = loadPage(ctx, html);
    if (loaded.loadErr) { console.log('LOAD ERR', loaded.loadErr); process.exit(1); }
    fireDCL(ctx);
    E(ctx, `window.__v15.buildWords()`);
    const r2 = J(ctx, `JSON.stringify((function(){
      var out={};
      function xp(){ return S.xp||0; }
      for(var i=0;i<10;i++){ S.cards.push({id:'ko_seed_'+i, d:'d0', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:'', g:'', box:0, due:0}); }
      save();
      // v18 EN
      var v18=window.__v18, xp0=xp(), enN=0;
      v18.fight('v10_slime','en');
      for(var a=0;a<8;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
        if(F.cur&&F.cur.w) enN++;
        v18._test.pickCorrect(); v18.next(); }
      out.en18={delta:xp()-xp0, enQ:enN};
      v18.close();
      // v18 KO
      var e18=v18._test.en18(); var kr0=e18.koStats.right||0;
      var xp1=xp(), koN=0, koEn=0;
      v18.fight('v10_slime','ko');
      for(var b=0;b<8;b++){ var F2=v18._test.F(); if(!F2||F2.over) break; F2.hp=999;
        if(F2.cur&&F2.cur.k) koN++; else if(F2.cur&&F2.cur.w) koEn++;
        v18._test.pickCorrect(); v18.next(); }
      out.ko18={delta:xp()-xp1, koQ:koN, enQ:koEn, koRightDelta:(e18.koStats.right||0)-kr0};
      v18.close();
      // v19 EN
      var v19=window.__v19, xp2=xp(), enN19=0;
      v19.openMapFor('en'); v19.fight('v11_fireking');
      for(var c=0;c<8;c++){ var F3=v19._test.F(); if(!F3||F3.over) break; F3.hp=999;
        if(F3.cur&&F3.cur.w) enN19++;
        v19._test.pickCorrect(); v19._test.next(); }
      out.en19={delta:xp()-xp2, enQ:enN19};
      // v19 KO
      var e19=v19.en19(); var kr19_0=e19.koStats.right||0;
      var xp3=xp(), koN19=0, koEn19=0;
      v19._test.setLang('ko'); v19.fight('v11_fireking');
      for(var d=0;d<8;d++){ var F4=v19._test.F(); if(!F4||F4.over) break; F4.hp=999;
        if(F4.cur&&F4.cur.k) koN19++; else if(F4.cur&&F4.cur.w) koEn19++;
        v19._test.pickCorrect(); v19._test.next(); }
      out.ko19={delta:xp()-xp3, koQ:koN19, enQ:koEn19, koRightDelta:(e19.koStats.right||0)-kr19_0};
      return out;
    })())`);
    out.R2 = r2;
    console.log('R2 KO vs EN XP:', JSON.stringify(r2));
  }

  // ---------- R3: blocked-boss recount (probe-B model) ----------
  {
    const ctx = makeCtx();
    const loaded = loadPage(ctx, html);
    if (loaded.loadErr) { console.log('LOAD ERR', loaded.loadErr); process.exit(1); }
    fireDCL(ctx);
    E(ctx, `window.__v15.buildWords()`);
    const r3 = J(ctx, `JSON.stringify((function(){
      var v34=window.__v34, v36=window.__v36;
      var WORDS=window.__v15.words;
      var old=window.__v15.enOld();
      for(var i=0;i<700&&i<WORDS.length;i++) old.box[WORDS[i].id]=5;
      window.__v15.save15();
      function legDiffBuggy(){ var m=0; try{ m=window.__v15.counts().mastered; }catch(e){} if(m<200)return ['A2','B1']; if(m<600)return ['B1']; return ['B2']; }
      function legDiffFixed(){ var m=0; try{ m=window.__v15.counts15().mastered; }catch(e){} if(m<200)return ['A2','B1']; if(m<600)return ['B1']; return ['B2']; }
      function poolOf(b,legDiff){
        var list;
        if(b._old) list=WORDS.slice();
        else if(b.lib==='oxford'){ list=WORDS.filter(function(x){ return (x.lib||[]).indexOf('oxford')>=0; }); if(b.diff) list=list.filter(function(x){ return x.lv===b.diff; }); }
        else if(b.arena==='leg'){ var lv=legDiff(); list=WORDS.filter(function(x){ return lv.indexOf(x.lv)>=0; }); }
        else if(b.diff) list=WORDS.filter(function(x){ return x.lv===b.diff; });
        else list=WORDS.slice();
        if(list.length<12) list=WORDS.slice();
        return list;
      }
      var list=[];
      list=list.concat(window.__V33_DATA?window.__V33_DATA.bosses:[]);
      list=list.concat(window.__V19_DATA?window.__V19_DATA.bosses:[]);
      var b18=window.__V18_BOSSES||{};
      ['en','el','leg'].forEach(function(k){ if(b18[k]) list=list.concat(b18[k]); });
      if(b18['old']) list=list.concat(b18['old'].map(function(b){ var c={}; for(var k in b) c[k]=b[k]; c._old=true; return c; }));
      list=list.concat(window.__V35_DATA?window.__V35_DATA.bosses:[]);
      var modeB=[], poolB=[], poolF=[];
      list.forEach(function(b){
        if(v36.blockedReason({boss:b,lang:'en'})==='mode') modeB.push(b.id);
        var Fb={boss:b,lang:'en',weak:v34.weakFor(b,'en'),pools:{words:poolOf(b,legDiffBuggy)}};
        if(v34.scopeBlocked(Fb)===true) poolB.push(b.id);
        var Ff={boss:b,lang:'en',weak:v34.weakFor(b,'en'),pools:{words:poolOf(b,legDiffFixed)}};
        if(v34.scopeBlocked(Ff)===true) poolF.push(b.id);
      });
      function distinct(a,b){ var s={}; a.concat(b).forEach(function(id){s[id]=1;}); return Object.keys(s).length; }
      return {bossN:list.length, mastered:window.__v15.counts15().mastered,
        modeBlocked:modeB.sort(), poolBlockedBuggy:poolB.sort(), poolBlockedFixed:poolF.sort(),
        distinctBuggy:distinct(modeB,poolB), distinctFixed:distinct(modeB,poolF),
        extraIfFixed:poolF.filter(function(id){return poolB.indexOf(id)<0;}).sort()};
    })())`);
    out.R3 = r3;
    console.log('R3 blocked recount @700:', JSON.stringify(r3));
  }

  fs.writeFileSync(path.join(__dirname, 'repro-v46.json'), JSON.stringify(out, null, 1));
  console.log('REPRO DONE — observations in tools/v46/repro-v46.json');
}
main().catch(e => { console.error('REPRO ERROR', e); process.exit(1); });
