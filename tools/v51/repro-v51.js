// probe-data.js — scratch data quantification for the V51 generator design (not part of the shipped test suite).
const fs=require('fs');const path=require('path');const vm=require('vm');
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

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf-8');
function mulberry32(seed){let s=seed|0;return function(){s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const ctx = makeCtx();
ctx.__seededRandom = mulberry32(7);
E(ctx, `Math.random=__seededRandom;`);
const loaded = loadPage(ctx, html);
if (loaded.loadErr) { console.log('LOAD ERR:', loaded.loadErr); process.exit(1); }
fireDCL(ctx);
E(ctx, `window.__v15.buildWords()`);
const R = (expr) => JSON.parse(vm.runInContext(expr, ctx));
let repro = 0, total = 0;
function rep(name, cond, detail){ total++; if(cond){repro++;console.log('  REPRO '+name+(detail!==undefined?' — '+JSON.stringify(detail).slice(0,300):''))} else console.log('  NOT-REPRO '+name+(detail!==undefined?' — '+JSON.stringify(detail).slice(0,300):'')) }

// Seed 12 learned EN words (box>=1) so the Forge EN gate passes.
E(ctx, `JSON.stringify((function(){var v=window.__v15;var old=v.enOld();var ws=v.words.slice(0,12);ws.forEach(function(w){old.box[w.id]=1});v.save15();return ws.map(function(w){return w.id})})())`);

// R1: EN pool is exactly the 40-sentence fixed bank.
const pool = R(`JSON.stringify((function(){var p=window.__v48._test.forgePool('en');return {n:p.items.length, srcs:[...new Set(p.items.map(function(i){return i.src.split(':')[0]}))], gen:p.items.filter(function(i){return i.gen}).length}})())`);
rep('R1 EN pool is exactly the 40 fixed bank sentences', pool.n===40 && pool.srcs.length===1 && pool.srcs[0]==='builder' && pool.gen===0, pool);
// R2: 200 sessions of 5 -> at most 40 distinct sentences.
const sess = R(`JSON.stringify((function(){var seen={};for(var s=0;s<200;s++){var r=window.__v48._test.startForgeSession('en');if(!r.ok)return {err:'gate'};r.session.list.forEach(function(it){seen[it.text]=1})}return {distinct:Object.keys(seen).length}})())`);
rep('R2 200 sessions x 5 serve at most 40 distinct sentences', sess.distinct===40, sess);
// R3: with an A1-A2 scope set, the pool is IDENTICAL to the no-scope pool (no scope relation).
const scoped = R(`JSON.stringify((function(){
  var v=window.__v15, f=window.__v48._test;
  var before=f.forgePool('en').items.map(function(i){return i.text}).sort();
  v.setScope({kind:'lib',lib:'a1a2',topic:'a1_education'});
  var after=f.forgePool('en').items.map(function(i){return i.text}).sort();
  var sessScoped=[];for(var s=0;s<50;s++){var r=f.startForgeSession('en');r.session.list.forEach(function(it){sessScoped.push(it.text)})}
  v.clearScope();
  return {same:JSON.stringify(before)===JSON.stringify(after), scopedDistinct:[...new Set(sessScoped)].length};
})())`);
rep('R3 scope a1a2/education does NOT change the pool or the sessions', scoped.same===true && scoped.scopedDistinct<=40, scoped);
// R4: KO pool ignores the selected deck S.deck (deck cards not preferred).
const ko = R(`JSON.stringify((function(){
  var s;try{s=S}catch(e){return {err:'no S'}}
  // seed 12 KO cards with real example sentences, 6 NOT in deck 'dX' first, 6 in deck 'dX' after
  s.cards=[];s.decks=[{id:'dX',name:'Deck X'},{id:'dY',name:'Deck Y'}];
  for(var i=0;i<12;i++){s.cards.push({id:'k'+i,d:i<6?'dY':'dX',h:'한글'+i,m:'nghĩa '+i,p:'',e:'나는 학교에 갑니다 '+i,box:1})}
  s.deck='dX';
  var f=window.__v48._test;
  var p=f.forgePool('ko');
  var firstDeck=p.items.slice(0,6).filter(function(it){return it.cardId&&+it.cardId.slice(1)>=6}).length;
  var gate=f.forgeGate('ko');
  return {items:p.items.length, first6FromDeck:firstDeck, gateOk:gate.ok};
})())`);
rep('R4 KO pool does NOT prefer the selected deck (first items are not all deck cards)', ko.items===12 && ko.first6FromDeck<6, ko);
// R5: no item carries generator metadata (gen/scopeName/word).
const meta = R(`JSON.stringify((function(){var p=window.__v48._test.forgePool('en');return {gen:p.items.filter(function(i){return i.gen||i.scopeName||i.word}).length}})())`);
rep('R5 no generated items exist today (no gen/scopeName/word fields)', meta.gen===0, meta);
console.log(`\n== repro-v51 summary ==\nREPRO ${repro} / ${total}`);
process.exit(0);
