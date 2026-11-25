// repro-v53.js — KO Sentence Forge defects on PRISTINE V19.6 (layer V53 target).
// Run: node tools/v53/repro-v53.js [DIR]   (default: tools/v53/backup-v19.6/out)
// Exit 0 always; prints REPRO / NOT-REPRO per defect. The harness loader
// is copied verbatim from tools/v51/repro-v51.js.
const fs = require('fs'); const path = require('path'); const vm = require('vm');
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
function loadPage(ctx, html) {
  staticIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  dynIds = new Set();
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

const DIR = process.argv[2] || path.resolve(__dirname, 'backup-v19.6', 'out');
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf-8');
function mulberry32(seed) { let s = seed | 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ctx = makeCtx();
ctx.__seededRandom = mulberry32(7);
E(ctx, `Math.random=__seededRandom;`);
const loaded = loadPage(ctx, html);
if (loaded.loadErr) { console.log('LOAD ERR:', loaded.loadErr); process.exit(1); }
fireDCL(ctx);
E(ctx, `window.__v15.buildWords()`);
const R = (expr) => JSON.parse(vm.runInContext(expr, ctx));
let repro = 0, total = 0;
function rep(name, cond, detail) { total++; if (cond) { repro++; console.log('  REPRO ' + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : '')); } else console.log('  NOT-REPRO ' + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : '')); }

// ---- shared seed: 8 learned KO cards, only 2 with valid examples;
// ---- 4 unlearned KO cards with valid examples (must be excluded today).
function seedD1() {
  return R(`JSON.stringify((function(){
    var s;try{s=S}catch(e){return {err:'no S'}}
    s.cards=[];s.decks=[{id:'dX',name:'Deck X'},{id:'dY',name:'Deck Y'}];s.deck='';
    s.cards.push({id:'k0',d:'dX',g:'G1',h:'밥',m:'cơm',p:'',e:'밥을 먹어요.',box:1});
    s.cards.push({id:'k1',d:'dX',g:'G1',h:'물',m:'nước',p:'',e:'물을 마셔요.',box:1});
    for(var i=2;i<8;i++)s.cards.push({id:'k'+i,d:'dX',g:'G1',h:'한글'+i,m:'nghĩa '+i,p:'',e:'',box:1});
    for(var j=0;j<4;j++)s.cards.push({id:'u'+j,d:'dY',g:'G2',h:'학교',m:'trường',p:'',e:'학교에 가요.',box:0});
    var f=window.__v48._test;
    var p=f.forgePool('ko');
    return {items:p.items.length, koSent:p.koSent, learned:p.learned,
      hasUnlearned:p.items.some(function(it){return it.cardId&&it.cardId[0]==='u'})};
  })())`);
}
const d1 = seedD1();
rep('D1 KO pool excludes unlearned cards examples (only 2 learned items, 4 valid unlearned ignored)', d1.items === 2 && d1.koSent === 2 && d1.hasUnlearned === false, d1);

// D5: same seed — gate fires ko-sent even though 4 valid unlearned examples exist.
const d5 = R(`JSON.stringify((function(){
  var f=window.__v48._test;var g=f.forgeGate('ko');
  return {ok:g.ok, why:g.why||null, koSent:g.koSent};
})())`);
rep('D5 gate fires ko-sent (learned>=8 but learned examples <3) despite 4 valid unlearned examples', d5.ok === false && d5.why === 'ko-sent', d5);

// D3: quality filter absent — odd-punctuation / missing-space examples pass.
const d3 = R(`JSON.stringify((function(){
  var s;try{s=S}catch(e){return {err:'no S'}}
  s.cards=[];s.decks=[{id:'dX',name:'Deck X'}];s.deck='';
  var ex=[
    ['q0','그는 "학생입니다'],          // unbalanced quote
    ['q1','학교에 가요 #내일'],         // stray #
    ['q2','저는 학생입니다.오늘 날씨가 좋아요'], // mid-token period = missing space
    ['q3','안녕 , 오늘 날씨가 좋아요'],   // lone punctuation tile (comma alone)
    ['q4','저는 ~에 가요'],            // ~ placeholder
    ['q5','사랑해요.'],                // one token (already dropped today)
    ['q6','저는학생입니다'],            // no spaces at all (already dropped today)
    ['q7','밥을 먹어요.'],              // clean, 2 tokens
    ['q8','나는 학교에 가요.']          // clean, 3 tokens
  ];
  ex.forEach(function(pair,i){s.cards.push({id:pair[0],d:'dX',g:'G1',h:'한글'+i,m:'nghĩa',p:'',e:pair[1],box:1})});
  var p=window.__v48._test.forgePool('ko');
  var texts=p.items.map(function(it){return it.text});
  return {n:p.items.length, texts:texts,
    hasQuote:texts.some(function(t){return t.indexOf('"')>=0}),
    hasHash:texts.some(function(t){return t.indexOf('#')>=0}),
    hasMidPeriod:texts.some(function(t){return t.indexOf('학생입니다.오늘')>=0}),
    hasLoneComma:texts.some(function(t){return /(^| ), ?( |$)/.test(t) || t.split(' ').indexOf(',')>=0}),
    hasTilde:texts.some(function(t){return t.indexOf('~')>=0})};
})())`);
rep('D3 odd-punctuation / missing-space examples enter the pool (quote, #, mid-token period, lone comma tile, ~)', d3.hasQuote && d3.hasHash && d3.hasMidPeriod && d3.hasLoneComma && d3.hasTilde, d3);

// D4: no difficulty ladder — session token counts are shuffled, not 2-3 -> 4-5 -> 6+.
const d4 = R(`JSON.stringify((function(){
  var s;try{s=S}catch(e){return {err:'no S'}}
  s.cards=[];s.decks=[{id:'dX',name:'Deck X'}];s.deck='';
  var ex2=['밥을 먹어요.','물을 마셔요.','학교에 가요.','집에 가요.'];       // 2 tokens x4
  var ex3=['나는 학교에 가요.','나는 집에 가요.'];                          // 3 tokens x2
  var ex5=['나는 오늘 아침에 학교에 가요.','나는 오늘 아침에 집에 가요.','나는 내일 아침에 학교에 가요.']; // 5 tokens x3
  var ex7=['나는 오늘 아침 일찍 친구와 학교에 가요.','나는 오늘 아침 일찍 친구와 집에 가요.','나는 내일 아침 일찍 친구와 학교에 가요.']; // 7 tokens x3
  var all=ex2.concat(ex3,ex5,ex7);
  all.forEach(function(e,i){s.cards.push({id:'L'+i,d:'dX',g:'G1',h:'한글'+i,m:'nghĩa',p:'',e:e,box:1})});
  var f=window.__v48._test;
  var laddered=0,total=0;
  for(var n=0;n<50;n++){
    var r=f.startForgeSession('ko');if(!r.ok)return {err:'gate',why:r.gate&&r.gate.why};
    var counts=r.session.list.map(function(it){return it.tokens.length});
    total++;
    var ok=true;for(var k=1;k<counts.length;k++)if(counts[k]<counts[k-1])ok=false;
    if(ok)laddered++;
  }
  return {sessions:total, laddered:laddered};
})())`);
rep('D4 session order is NOT laddered (most 50 sessions are not token-count non-decreasing)', d4.laddered !== undefined && d4.laddered < 50, d4);

// D2: no short-pool notice / supplement — pool and session carry no notice,
// and unlearned items carry no marking.
const d2 = R(`JSON.stringify((function(){
  var s;try{s=S}catch(e){return {err:'no S'}}
  s.cards=[];s.decks=[{id:'dX',name:'Deck X'},{id:'dY',name:'Deck Y'}];s.deck='dX';
  for(var i=0;i<3;i++)s.cards.push({id:'x'+i,d:'dX',g:'GX',h:'한글'+i,m:'nghĩa',p:'',e:'밥을 먹어요.',box:1});
  for(var j=0;j<10;j++)s.cards.push({id:'y'+j,d:'dY',g:'GY',h:'한글'+j,m:'nghĩa',p:'',e:'학교에 가요.',box:1});
  var f=window.__v48._test;
  var p=f.forgePool('ko');
  var r=f.startForgeSession('ko');
  return {poolNotice:(p.notice===undefined||p.notice===null)?null:p.notice,
    sessionNotice:(r.session&&r.session.notice===undefined)?'undefined':(r.session?r.session.notice:null),
    anyMarked:p.items.some(function(it){return it.learned===false||it.unlearned===true})};
})())`);
rep('D2 no short-pool notice and no unlearned marking (pool/session notice absent)', d2.poolNotice === null && (d2.sessionNotice === 'undefined' || d2.sessionNotice === null) && d2.anyMarked === false, d2);

console.log(`\n== repro-v53 summary ==\nREPRO ${repro} / ${total}`);
process.exit(0);
