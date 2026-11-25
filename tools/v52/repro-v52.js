// repro-v50.js — V19.5 round-5 fixes, REPRO-FIRST on pristine V19.4 (Node vm).
// Run BEFORE any src edit: every section must show REPRO (the defect is
// present). After the fix the same assertions must flip to FIXED (see
// test50.js, which re-asserts them as PASS on the built V19.5).
//   R1 F-1 (High): fight() restart while listening does NOT abort the live
//      rec; the new fight resets speakToken to 0, so the orphan's token
//      collides with the new question's token and its result answers it.
//   R2 C-R5-2: classifyEN/classifyKO on a learned word with no due date
//      returns reason "Đến hạn 20779 ngày" (days since epoch).
//   R3 C-R5-3: a full 5-correct Forge session stores no score anywhere;
//      the end screen shows no score.
//   R4 C-R5-4 (static): no 44px min-height rule for the KO Hub buttons
//      (.v7btn / #sk / #sn / #v21avatarbtn) in the built CSS.
// Usage: node tools/v50/repro-v50.js [DIR]   (default: <repo>/out)
// Exit 0 = all 4 defects reproduced. Exit 1 = a defect did NOT reproduce
// (base moved, or the fix is already in).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
let repro = 0, notrepro = 0;
function R(name, cond, detail) {
  if (cond) { repro++; console.log(`  REPRO ${name}`); }
  else { notrepro++; console.log(`  NOT-REPRO ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''}`); }
}
function countOcc(hay, needle) { return hay.split(needle).length - 1; }

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
// ---------- minimal DOM stub (verbatim from tools/v49/test49.js) ----------
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
const SR_STUB = `
window.SpeechRecognition = function(){
  var self=this; window.__lastSR49=self;
  self.lang=''; self.interimResults=false; self.maxAlternatives=3;
  self.onresult=null; self.onerror=null; self.onend=null;
  self._aborted=false; self._lostSync=false;
  self.start=function(){
    if(window.__SRMODE==='throw'){ throw new Error('mic-start-throw'); }
    if(window.__SRMODE==='syncfire'){
      self._lostSync = !self.onresult;
      if(self.onresult) self.onresult({results:[[{transcript: window.__SRWORD||'apple'}]]});
    }
  };
  self.abort=function(){ self._aborted=true; };
  self.stop=function(){};
  self.fireResult=function(t){ if(self.onresult) self.onresult({results:[[{transcript:t}]]}); };
  self.fireError=function(code){ if(self.onerror) self.onerror({error:code}); };
  self.fireEnd=function(){ if(self.onend) self.onend(); };
};
window.webkitSpeechRecognition = window.SpeechRecognition;`;
function installSR(ctx) { E(ctx, SR_STUB); }
function setSRMode(ctx, m) { E(ctx, `window.__SRMODE=${JSON.stringify(m)};`); }
function mulberry32(seed) { let s = seed | 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let __seed = 51;
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
function seededCtx() {
  const seed = __seed++;
  const c = makeCtx();
  c.__seededRandom = mulberry32(seed);
  E(c, 'Math.random=__seededRandom;');
  const loaded = loadPage(c, html);
  if (loaded.loadErr) { console.log('LOAD ERR (seed ' + seed + '):', loaded.loadErr); process.exit(1); }
  fireDCL(c);
  E(c, 'window.__v15.buildWords()');
  dynIds.add('v19fight');
  return c;
}
function startWizard(ctx) {
  return J(ctx, `JSON.stringify((function(){
    var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
    var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
    v18.fight('v10_wizard','en');
    var F=v18._test.F();
    return {live:!!F, qmode:F&&F.qmode, word:F&&F.cur&&F.cur.w&&F.cur.w.en, boss:F&&F.boss&&F.boss.id};
  })())`);
}
function F18(ctx) {
  return J(ctx, `JSON.stringify((function(){var F=window.__v18._test.F(); if(!F) return null;
    return {answered:F.answered, ok:F.ok, hearts:F.hearts, hp:F.hp, qmode:F.qmode,
      word:F.cur&&F.cur.w&&F.cur.w.en, heard:F.heard||null, listening:!!F.listening,
      err:F.speakErr||null, token:F.speakToken||0, over:F.over};})())`);
}
function F19(ctx) {
  return J(ctx, `JSON.stringify((function(){var F=window.__v19._test.F(); if(!F) return null;
    return {answered:F.answered, ok:F.ok, hearts:F.hearts, hp:F.hp, qmode:F.qmode,
      word:F.cur&&F.cur.w&&F.cur.w.en, heard:F.heard||null, listening:!!F.listening,
      err:F.speakErr||null, token:F.speakToken||0, over:F.over};})())`);
}


// ================= R1: C-R5-1 grammar/sentence pay 0 XP =================
console.log('\n== R1 C-R5-1: boss grammar/sentence correct answers pay 0 XP ==');
function traceMixed18(ctx) {
  return J(ctx, `JSON.stringify((function(){
    var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
    var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
    S.xp=20000; S.spent=0;
    var old=window.__v15.enOld(); old.streak=0;
    v18.fight('v10_dict','en');
    var trace=[];
    for(var i=0;i<4;i++){
      var F=v18._test.F(); if(!F||F.over) break;
      var qm=F.qmode, hasW=!!(F.cur&&F.cur.w), hasG=!!(F.cur&&F.cur.g), hasS=!!(F.cur&&F.cur.s);
      var xp0=S.xp, st0=window.__v15.enOld().streak;
      v18._test.pickCorrect();
      var xp1=S.xp, st1=window.__v15.enOld().streak;
      trace.push({i:i,qmode:qm,hasW:hasW,hasG:hasG,hasS:hasS,dxp:xp1-xp0,streak:st0+'->'+st1,answered:F.answered,ok:F.ok});
      if(i<3) v18._test.next();
    }
    return trace;
  })())`);
}
function traceMixed19(ctx) {
  return J(ctx, `JSON.stringify((function(){
    var v19=window.__v19, e19=v19._test.en19(); e19.bosses=e19.bosses||{};
    (window.__V19_DATA.bosses||[]).forEach(function(b){ e19.bosses[b.id]={en:{win:true},ko:{win:true}}; });
    S.xp=20000; S.spent=0;
    var old=window.__v15.enOld(); old.streak=0;
    v19.fight('v11_butterflyqueen');
    var trace=[];
    for(var i=0;i<4;i++){
      var F=v19._test.F(); if(!F||F.over) break;
      var qm=F.qmode, hasW=!!(F.cur&&F.cur.w), hasG=!!(F.cur&&F.cur.g), hasS=!!(F.cur&&F.cur.s);
      var xp0=S.xp, st0=window.__v15.enOld().streak;
      v19._test.pickCorrect();
      var xp1=S.xp, st1=window.__v15.enOld().streak;
      trace.push({i:i,qmode:qm,hasW:hasW,hasG:hasG,hasS:hasS,dxp:xp1-xp0,streak:st0+'->'+st1,answered:F.answered,ok:F.ok});
      if(i<3) v19._test.next();
    }
    return trace;
  })())`);
}
{
  const v18src = fs.readFileSync(path.join(DIR, 'v18.js'), 'utf8');
  const v19src = fs.readFileSync(path.join(DIR, 'v19.js'), 'utf8');
  const m18 = v18src.slice(v18src.indexOf('function mark18(ok,w){'), v18src.indexOf('function mark18(ok,w){') + 200);
  const m19 = v19src.slice(v19src.indexOf('function mark19(ok,w){'), v19src.indexOf('function mark19(ok,w){') + 200);
  R('R1.0 mark18 starts with if(!w)return;', m18.startsWith('function mark18(ok,w){\n  if(!w)return;'), m18.slice(0, 80));
  R('R1.0b mark19 starts with if(!w)return;', m19.startsWith('function mark19(ok,w){\n  if(!w)return;'), m19.slice(0, 80));
  R('R1.0c v18 call sites guard on F.cur.w (2 sites)', (v18src.match(/if\(F\.cur&&F\.cur\.w\)mark18\(/g) || []).length === 2);
  R('R1.0d v19 call sites guard on F.cur.w (3 sites)', (v19src.match(/if\(F\.cur&&F\.cur\.w\)mark19\(/g) || []).length === 3);

  const c18 = seededCtx();
  const t18 = traceMixed18(c18);
  const byMode18 = {};
  t18.forEach(function (r) { byMode18[r.qmode] = r; });
  R('R1.1 v18 mixed fight asks all 4 types in order', t18.length === 4 && t18.map(function (r) { return r.qmode; }).join(',') === 'mc,grammar,listen,builder', t18);
  R('R1.2 v18 vocab (mc) pays +10 XP', byMode18.mc && byMode18.mc.dxp === 10, byMode18.mc);
  R('R1.3 v18 grammar pays 0 XP (BUG)', byMode18.grammar && byMode18.grammar.dxp === 0, byMode18.grammar);
  R('R1.4 v18 listen pays +10 XP', byMode18.listen && byMode18.listen.dxp === 10, byMode18.listen);
  R('R1.5 v18 sentence (builder) pays 0 XP (BUG)', byMode18.builder && byMode18.builder.dxp === 0, byMode18.builder);
  R('R1.6 v18 streak frozen on grammar (0->1->1)', byMode18.grammar && byMode18.grammar.streak === '1->1', t18.map(function (r) { return r.streak; }));

  const c19 = seededCtx();
  const t19 = traceMixed19(c19);
  const byMode19 = {};
  t19.forEach(function (r) { byMode19[r.qmode] = r; });
  R('R1.7 v19 mixed fight asks all 4 types in order', t19.length === 4 && t19.map(function (r) { return r.qmode; }).join(',') === 'mc,grammar,listen,builder', t19);
  R('R1.8 v19 vocab (mc) pays +10 XP', byMode19.mc && byMode19.mc.dxp === 10, byMode19.mc);
  R('R1.9 v19 grammar pays 0 XP (BUG)', byMode19.grammar && byMode19.grammar.dxp === 0, byMode19.grammar);
  R('R1.10 v19 listen pays +10 XP', byMode19.listen && byMode19.listen.dxp === 10, byMode19.listen);
  R('R1.11 v19 sentence (builder) pays 0 XP (BUG)', byMode19.builder && byMode19.builder.dxp === 0, byMode19.builder);
  R('R1.12 v19 streak frozen on builder (2->2)', byMode19.builder && byMode19.builder.streak === '2->2', t19.map(function (r) { return r.streak; }));
}

// ================= R2: Android TTS — no voice selection =================
console.log('\n== R2 Android TTS: no getVoices/voiceschanged anywhere ==');
const TTS_STUB = `
window.__ttsLog={spoken:[],gv:0,cancelled:0,pops:[]};
window.pop=function(t){window.__ttsLog.pops.push(t)};
window.toast=function(t){window.__ttsLog.pops.push(t)};
window.speechSynthesis={
  _voices:[], _listeners:{},
  getVoices(){ window.__ttsLog.gv++; return this._voices.slice(); },
  addEventListener(t,f){ (this._listeners[t]=this._listeners[t]||[]).push(f); },
  removeEventListener(t,f){ var l=this._listeners[t]||[]; var i=l.indexOf(f); if(i>=0) l.splice(i,1); },
  cancel(){ window.__ttsLog.cancelled++; },
  speak(u){ window.__ttsLog.spoken.push({text:u.text,lang:u.lang,voice:u.voice?u.voice.name:null,voiceLang:u.voice?u.voice.lang:null}); },
  _fireVoices(v){ this._voices=v.slice(); var l=(this._listeners['voiceschanged']||[]).slice(); l.forEach(function(f){ try{f();}catch(e){} }); }
};`;
function installTTS(ctx) { E(ctx, TTS_STUB); }
function ttsLog(ctx) { return J(ctx, `JSON.stringify(window.__ttsLog)`); }
{
  R('R2.0 no getVoices anywhere in built index.html', countOcc(html, 'getVoices') === 0, countOcc(html, 'getVoices'));
  R('R2.0b no voiceschanged anywhere in built index.html', countOcc(html, 'voiceschanged') === 0, countOcc(html, 'voiceschanged'));
  R('R2.0c no __v52 helper yet', !/__v52/.test(html));
  const v15src = fs.readFileSync(path.join(DIR, 'v15.js'), 'utf8');
  const s15 = v15src.slice(v15src.indexOf('function speak15('), v15src.indexOf('function speak15(') + 400);
  R('R2.0d speak15 sets only .lang (+.rate), no .voice', /u\.lang/.test(s15) && !/\.voice\s*=/.test(s15), s15.replace(/\n/g, ' ').slice(0, 200));

  // --- Android-like: voices empty at first speak, fill later ---
  const c = seededCtx();
  installTTS(c);
  const w0 = J(c, `JSON.stringify((function(){var w=window.__v15.words[0]; return {id:w.id,en:w.en};})())`);
  E(c, `window.__v15.speakWord(${JSON.stringify(w0.id)})`);
  const logA = ttsLog(c);
  R('R2.1 old code calls speak() immediately with NO voice selected', logA.spoken.length === 1 && logA.spoken[0].voice === null, logA.spoken);
  R('R2.2 old code never consults getVoices()', logA.gv === 0, { gv: logA.gv });
  R('R2.3 old code cancels before speaking (Android drop risk)', logA.cancelled >= 1, { cancelled: logA.cancelled });
  // voices load late (the Android case) — old code never retries
  E(c, `window.speechSynthesis._fireVoices([{name:'Google US English',lang:'en-US',default:true},{name:'Google 한국어',lang:'ko-KR'}])`);
  const logB = ttsLog(c);
  R('R2.4 after voices load, old code speaks NOTHING more (no retry)', logB.spoken.length === 1, { spoken: logB.spoken.length });

  // --- No voice at all: silent failure, no honest message ---
  const c2 = seededCtx();
  installTTS(c2);
  E(c2, `window.__v18.speakKO('안녕하세요')`);
  const logC = ttsLog(c2);
  R('R2.5 no-voice case: speak() still fired with voice=null', logC.spoken.length === 1 && logC.spoken[0].voice === null, logC.spoken);
  R('R2.6 no-voice case: NO honest error shown to the user (silent)', logC.pops.length === 0, { pops: logC.pops });
  // KO speak path also never consults voices
  R('R2.7 speakKO never consults getVoices() either', logC.gv === 0, { gv: logC.gv });
}

console.log(`\nREPRO: ${repro} reproduced, ${notrepro} NOT reproduced`);
process.exit(notrepro === 0 ? 0 : 1);
