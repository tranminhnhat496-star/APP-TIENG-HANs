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

async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  console.log('base sha', sha, 'bytes', fs.statSync(htmlPath).size);
  const ctx = makeCtx();
  const loaded = loadPage(ctx, html);
  if (loaded.loadErr) { console.log('LOAD ERR', loaded.loadErr); process.exit(1); }
  fireDCL(ctx);
  E(ctx, `window.__v15.buildWords()`);

  // ---- Part 1: WORDS / kind inventory (mastered-independent) ----
  const inv = J(ctx, `JSON.stringify((function(){
    var v15=window.__v15, v34=window.__v34;
    var WORDS=v15.words, R={wordsN:WORDS.length};
    var lvC={}; WORDS.forEach(function(w){lvC[w.lv]=(lvC[w.lv]||0)+1;}); R.byLevel=lvC;
    var libC={}; WORDS.forEach(function(w){(w.lib||['(none)']).forEach(function(l){libC[l]=(libC[l]||0)+1;});}); R.byLib=libC;
    var topics=Object.keys((window.__V34_DATA&&__V34_DATA.a1a2Labels)||{});
    var chronoSets=['time','space','machines','change'];
    var skySets=['climate','science','society','mind'];
    function cntKind(kind,key,pool){ var wk={kind:kind,key:key}, n=0; for(var i=0;i<pool.length;i++) if(v34.weakMatch(pool[i],wk)) n++; return n; }
    function legPool(levels){ return WORDS.filter(function(w){return levels.indexOf(w.lv)>=0;}); }
    var pools={m0:legPool(['A2','B1']), m200:legPool(['B1']), m600:legPool(['B2'])};
    R.poolN={m0:pools.m0.length, m200:pools.m200.length, m600:pools.m600.length};
    R.kindInLegPool={};
    topics.forEach(function(t){ R.kindInLegPool['a1a2:'+t]={m0:cntKind('a1a2',t,pools.m0),m200:cntKind('a1a2',t,pools.m200),m600:cntKind('a1a2',t,pools.m600)}; });
    chronoSets.forEach(function(s){ R.kindInLegPool['chrono:'+s]={m0:cntKind('chrono',s,pools.m0),m200:cntKind('chrono',s,pools.m200),m600:cntKind('chrono',s,pools.m600)}; });
    skySets.forEach(function(s){ R.kindInLegPool['skyroot:'+s]={m0:cntKind('skyroot',s,pools.m0),m200:cntKind('skyroot',s,pools.m200),m600:cntKind('skyroot',s,pools.m600)}; });
    R.kindInLegPool['t:time']={m0:cntKind('t','time',pools.m0),m200:cntKind('t','time',pools.m200),m600:cntKind('t','time',pools.m600)};
    R.topicByLevel={};
    topics.forEach(function(t){ var c={}; WORDS.forEach(function(w){ if(v34.weakMatch(w,{kind:'a1a2',key:t})) c[w.lv]=(c[w.lv]||0)+1; }); R.topicByLevel[t]=c; });
    R.chronoByLevel={}; chronoSets.forEach(function(s){ var c={}; WORDS.forEach(function(w){ if(w.chronoSet===s) c[w.lv]=(c[w.lv]||0)+1; }); R.chronoByLevel[s]=c; });
    R.skyByLevel={}; skySets.forEach(function(s){ var c={}; WORDS.forEach(function(w){ if(w.skyrootSet===s) c[w.lv]=(c[w.lv]||0)+1; }); R.skyByLevel[s]=c; });
    // chrono/skyroot word counts overall + their lv values
    R.chronoN=WORDS.filter(function(w){return !!w.chronoSet;}).length;
    R.skyN=WORDS.filter(function(w){return !!w.skyrootSet;}).length;
    R.sampleCards=(S.cards||[]).slice(0,3).map(function(c){return {id:c.id,h:c.h,m:c.m,d:c.d};});
    R.sampleCardN=(S.cards||[]).length;
    // EN word id prefixes (collision check for KO ids in xpAt)
    var pref={}; WORDS.forEach(function(w){ var p=String(w.id).split('_')[0]; pref[p]=(pref[p]||0)+1; });
    R.wordIdPrefixes=pref;
    return R;
  })())`);
  console.log('=== INVENTORY ===');
  console.log(JSON.stringify(inv, null, 1));

  // ---- Part 2: boss table at mastered 0 / 200 / 600 / 700 ----
  const bossBody = `
    var v34=window.__v34, v36=window.__v36, v15=window.__v15;
    var WORDS=v15.words;
    var M=MASTERED;
    var old=v15.enOld();
    Object.keys(old.box||{}).forEach(function(k){ old.box[k]=0; });
    for(var i=0;i<M&&i<WORDS.length;i++) old.box[WORDS[i].id]=5;
    v15.save15();
    var masteredNow=v15.counts15().mastered;
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
    var rows=list.map(function(b){
      var wk=v34.weakFor(b,'en');
      var mode=v36.blockedReason({boss:b,lang:'en'})==='mode';
      function pb(ld){ var F={boss:b,lang:'en',weak:wk,pools:{words:poolOf(b,ld)}}; return v34.scopeBlocked(F)===true; }
      return {id:b.id, arena:b.arena||'', zone:b.zone||'', diff:b.diff||'', mode:b.mode||'', lib:b.lib||'', el:b.el||'',
        weak: wk? (wk.kind+':'+wk.key):null, modeBlocked:mode,
        poolBuggy: pb(legDiffBuggy), poolFixed: pb(legDiffFixed)};
    });
    return JSON.stringify({masteredSet:M, masteredNow:masteredNow, legBuggy:legDiffBuggy(), legFixed:legDiffFixed(), bossN:rows.length, rows:rows});
  `;
  const levels = [0, 200, 600, 700];
  const tables = {};
  for (const M of levels) {
    const t = JSON.parse(E(ctx, `(function(){ var MASTERED=${M}; ${bossBody} })()`));
    tables[M] = t;
    const modeB = t.rows.filter(r => r.modeBlocked).map(r => r.id).sort();
    const poolB = t.rows.filter(r => r.poolBuggy).map(r => r.id).sort();
    const poolF = t.rows.filter(r => r.poolFixed).map(r => r.id).sort();
    const distB = [...new Set([...modeB, ...poolB])].length;
    const distF = [...new Set([...modeB, ...poolF])].length;
    console.log(`=== MASTERED ${M} (now=${t.masteredNow} legBuggy=${JSON.stringify(t.legBuggy)} legFixed=${JSON.stringify(t.legFixed)}) bossN=${t.bossN} ===`);
    console.log(' modeBlocked(' + modeB.length + '):', JSON.stringify(modeB));
    console.log(' poolBlocked BUGGY(' + poolB.length + '):', JSON.stringify(poolB));
    console.log(' poolBlocked FIXED(' + poolF.length + '):', JSON.stringify(poolF));
    console.log(' distinct buggy=' + distB + ' fixed=' + distF);
    console.log(' extraFixed:', JSON.stringify(poolF.filter(id => !poolB.includes(id))));
    console.log(' fixedButNotBuggy (unblocked by fix):', JSON.stringify(poolB.filter(id => !poolF.includes(id))));
  }
  fs.writeFileSync(path.join(__dirname, 'analysis-boss-tables.json'), JSON.stringify(tables, null, 1));

  // ---- Part 3: for pool-blocked bosses under FIXED @200 and @600, which kinds are fillable? ----
  const candBody = `
    var v34=window.__v34, v15=window.__v15;
    var WORDS=v15.words;
    var M=MASTERED;
    var old=v15.enOld();
    Object.keys(old.box||{}).forEach(function(k){ old.box[k]=0; });
    for(var i=0;i<M&&i<WORDS.length;i++) old.box[WORDS[i].id]=5;
    v15.save15();
    function legDiffFixed(){ var m=0; try{ m=window.__v15.counts15().mastered; }catch(e){} if(m<200)return ['A2','B1']; if(m<600)return ['B1']; return ['B2']; }
    function poolOf(b){
      var list;
      if(b._old) list=WORDS.slice();
      else if(b.lib==='oxford'){ list=WORDS.filter(function(x){ return (x.lib||[]).indexOf('oxford')>=0; }); if(b.diff) list=list.filter(function(x){ return x.lv===b.diff; }); }
      else if(b.arena==='leg'){ var lv=legDiffFixed(); list=WORDS.filter(function(x){ return lv.indexOf(x.lv)>=0; }); }
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
    var topics=Object.keys((window.__V34_DATA&&__V34_DATA.a1a2Labels)||{});
    var kinds=[];
    topics.forEach(function(t){ kinds.push({kind:'a1a2',key:t}); });
    ['time','space','machines','change'].forEach(function(s){ kinds.push({kind:'chrono',key:s}); });
    ['climate','science','society','mind'].forEach(function(s){ kinds.push({kind:'skyroot',key:s}); });
    kinds.push({kind:'t',key:'time'});
    var out=[];
    list.forEach(function(b){
      var wk=v34.weakFor(b,'en');
      var pool=poolOf(b);
      var F={boss:b,lang:'en',weak:wk,pools:{words:pool}};
      if(v34.scopeBlocked(F)!==true) return;
      var cands=[];
      kinds.forEach(function(kd){
        var n=0; for(var i=0;i<pool.length;i++) if(v34.weakMatch(pool[i],kd)) n++;
        if(n>0) cands.push(kd.kind+':'+kd.key+'='+n);
      });
      out.push({id:b.id, arena:b.arena||'', zone:b.zone||'', diff:b.diff||'', mode:b.mode||'', lib:b.lib||'', weak:wk?(wk.kind+':'+wk.key):null, poolN:pool.length, cands:cands});
    });
    return JSON.stringify({mastered:M, blocked:out});
  `;
  for (const M of [0, 200, 600]) {
    const c = JSON.parse(E(ctx, `(function(){ var MASTERED=${M}; ${candBody} })()`));
    console.log(`=== CANDIDATES for pool-blocked @ mastered ${M} (fixed legDiff) ===`);
    console.log(JSON.stringify(c.blocked, null, 1));
  }
  // ---- Part 4: Legendary bosses specifically — candidates at each level ----
  const legBody = `
    var v34=window.__v34, v15=window.__v15;
    var WORDS=v15.words;
    var M=MASTERED;
    var old=v15.enOld();
    Object.keys(old.box||{}).forEach(function(k){ old.box[k]=0; });
    for(var i=0;i<M&&i<WORDS.length;i++) old.box[WORDS[i].id]=5;
    v15.save15();
    function legDiffFixed(){ var m=0; try{ m=window.__v15.counts15().mastered; }catch(e){} if(m<200)return ['A2','B1']; if(m<600)return ['B1']; return ['B2']; }
    var lv=legDiffFixed();
    var pool=WORDS.filter(function(x){ return lv.indexOf(x.lv)>=0; });
    var topics=Object.keys((window.__V34_DATA&&__V34_DATA.a1a2Labels)||{});
    var kinds=[];
    topics.forEach(function(t){ kinds.push({kind:'a1a2',key:t}); });
    ['time','space','machines','change'].forEach(function(s){ kinds.push({kind:'chrono',key:s}); });
    ['climate','science','society','mind'].forEach(function(s){ kinds.push({kind:'skyroot',key:s}); });
    kinds.push({kind:'t',key:'time'});
    var cands=[];
    kinds.forEach(function(kd){ var n=0; for(var i=0;i<pool.length;i++) if(v34.weakMatch(pool[i],kd)) n++; if(n>0) cands.push(kd.kind+':'+kd.key+'='+n); });
    var legs=(window.__V18_BOSSES.leg||[]).map(function(b){ return {id:b.id, diff:b.diff, weak:v34.weakFor(b,'en')}; });
    return JSON.stringify({mastered:M, legDiff:lv, poolN:pool.length, legs:legs, cands:cands});
  `;
  for (const M of [0, 200, 600]) {
    const l = JSON.parse(E(ctx, `(function(){ var MASTERED=${M}; ${legBody} })()`));
    console.log(`=== LEGENDARY candidates @ mastered ${M} legDiff=${JSON.stringify(l.legDiff)} poolN=${l.poolN} ===`);
    console.log(' legs:', JSON.stringify(l.legs));
    console.log(' fillable kinds:', JSON.stringify(l.cands));
  }
  console.log('ANALYSIS DONE');
}
main().catch(e => { console.error('ANALYSIS ERROR', e); process.exit(1); });
