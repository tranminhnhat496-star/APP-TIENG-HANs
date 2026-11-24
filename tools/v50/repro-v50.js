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

// ================= R1: F-1 stale speech result after fight() restart =================
console.log('\n== R1 F-1: fight() restart while listening (v18 + v19) ==');
{
  // --- static: startFight() never calls stopSpeak() in either engine ---
  const v18src = fs.readFileSync(path.join(DIR, 'v18.js'), 'utf8');
  const v19src = fs.readFileSync(path.join(DIR, 'v19.js'), 'utf8');
  const sf18 = v18src.slice(v18src.indexOf('function startFight(b,lang){'), v18src.indexOf('function timerFor(){'));
  const sf19 = v19src.slice(v19src.indexOf('function startFight(b,lang){'), v19src.indexOf('function timerFor(){'));
  R('R1.0 v18 startFight() has no stopSpeak() call', !sf18.includes('stopSpeak()'), sf18.slice(0, 120));
  R('R1.0b v19 startFight() has no stopSpeak() call', !sf19.includes('stopSpeak()'), sf19.slice(0, 120));
  R('R1.0c both engines reset speakToken to 0 in the new F literal', sf18.includes('speakToken:0') && sf19.includes('speakToken:0'));

  // --- behavioural, v18: wizard speak question -> restart -> old result answers ---
  const c = seededCtx();
  installSR(c);
  const w0 = startWizard(c);
  R('R1.1 wizard fight starts on a speak question', w0.live === true && w0.qmode === 'speak' && !!w0.word, w0);
  E(c, `window.__v18.bossSpeak()`);
  const s0 = J(c, `JSON.stringify(window.__v18.speakState())`);
  R('R1.2 listening after tap Nói, token 1', s0.listening === true && s0.token === 1, s0);
  const oldRec = E(c, `window.__lastSR49`);
  E(c, `window.__v18.fight('v10_wizard','en')`);
  const after = F18(c);
  R('R1.3 restart does NOT abort the live rec', oldRec._aborted === false, { aborted: oldRec._aborted });
  R('R1.4 new fight resets speakToken to 0', after.token === 0, after);
  E(c, `window.__v18.bossSpeak()`);
  const s1 = J(c, `JSON.stringify(window.__v18.speakState())`);
  R('R1.5 new tap Nói reuses token 1 (== orphan token)', s1.token === 1, s1);
  oldRec.fireResult(w0.word);
  const fAfter = F18(c);
  R('R1.6 orphan result answers the NEW question', fAfter.answered !== null, fAfter);

  // --- behavioural, v19: forced speak on fireking, same hole ---
  const c19 = seededCtx();
  installSR(c19);
  const f19 = J(c19, `JSON.stringify((function(){
    var v19=window.__v19, e19=v19._test.en19(); e19.bosses=e19.bosses||{};
    e19.bosses['v11_fireking']={en:{win:true}};
    v19.fight('v11_fireking');
    var F=v19._test.F();
    // advance until a word question shows (speak needs F.cur.w)
    for(var i=0;i<12 && !(F&&F.cur&&F.cur.w);i++){ v19._test.next(); F=v19._test.F(); }
    if(!(F&&F.cur&&F.cur.w)) return {live:false};
    F.qmode='speak';
    return {live:true, word:F.cur.w.en};
  })())`);
  R('R1.7 v19 fireking forced to a speak question', f19.live === true && !!f19.word, f19);
  if (f19.live) {
    E(c19, `window.__v19.bossSpeak()`);
    const t0 = J(c19, `JSON.stringify(window.__v19.speakState())`);
    const old19 = E(c19, `window.__lastSR49`);
    E(c19, `window.__v19.fight('v11_fireking')`);
    const fA = F19(c19);
    R('R1.8 v19 restart does NOT abort the live rec', old19._aborted === false, { aborted: old19._aborted });
    R('R1.9 v19 new fight resets speakToken to 0', fA.token === 0, fA);
    // force the new question to speak again and tap Nói
    E(c19, `(function(){var F=window.__v19._test.F(); if(F&&F.cur&&F.cur.w){F.qmode='speak';} return 1})()`);
    E(c19, `window.__v19.bossSpeak()`);
    const t1 = J(c19, `JSON.stringify(window.__v19.speakState())`);
    R('R1.10 v19 new tap Nói reuses token 1 (== orphan token)', t1.token === 1, t1);
    old19.fireResult(f19.word);
    const fB = F19(c19);
    R('R1.11 v19 orphan result answers the NEW question', fB.answered !== null, fB);
  }
}

// ================= R2: C-R5-2 "Đến hạn 20779 ngày" =================
console.log('\n== R2 C-R5-2: due-less learned words (Smart weak list) ==');
{
  const c = seededCtx();
  const r = J(c, `JSON.stringify((function(){
    var v15=window.__v15, v27=window.__v27;
    var w=v15.words[0];
    var old=v15.enOld(); old.box[w.id]=2; old.right[w.id]=0; old.wrong[w.id]=0;
    var e15=window.__v15.en15st ? window.__v15.en15st() : null;
    if(e15){ e15.due=e15.due||{}; delete e15.due[w.id]; }
    var cEN=v27.classifyEN(w);
    var card=S.cards[0]; card.box=2; card.due=0; card.w=0;
    var cKO=v27.classifyKO(card);
    return {en:{reason:cEN.reason, overdue:cEN.overdue, cls:cEN.cls, due:cEN.due},
            ko:{reason:cKO.reason, overdue:cKO.overdue, cls:cKO.cls, due:cKO.due}};
  })())`);
  R('R2.1 classifyEN reason shows "20779 ngày"', /20779/.test(r.en.reason), r.en);
  R('R2.2 classifyEN overdue is days-since-epoch (~20779)', r.en.overdue > 20000, r.en);
  R('R2.3 classifyKO reason shows "20779 ngày"', /20779/.test(r.ko.reason), r.ko);
  R('R2.4 classifyKO overdue is days-since-epoch (~20779)', r.ko.overdue > 20000, r.ko);
}

// ================= R3: C-R5-3 Forge "Điểm" never tracked =================
console.log('\n== R3 C-R5-3: Forge score advertised but never stored/shown ==');
{
  const c = seededCtx();
  const r = J(c, `JSON.stringify((function(){
    var T=window.__v48._test, out={scores:[], total:0};
    var v15=window.__v15, old=v15.enOld();
    for(var i=0;i<12&&i<v15.words.length;i++) old.box[v15.words[i].id]=1;
    v15.save15();
    T.startForgeSession('en');
    for(var s=0;s<5;s++){
      var FS=T.session(), cur=FS.list[FS.i], tiles=FS.tiles||[];
      if(!tiles.length){
        FS.tiles=tiles=cur.tokens.map(function(t,i){return {t:t,k:i}});
        for(var i2=tiles.length-1;i2>0;i2--){var j=Math.floor(Math.random()*(i2+1));var tmp=tiles[i2];tiles[i2]=tiles[j];tiles[j]=tmp}
      }
      var used={};
      cur.tokens.forEach(function(tok){
        for(var k=0;k<tiles.length;k++){ if(!used[k]&&tiles[k].t===tok){ used[k]=1; T.forgeTap(k); break; } }
      });
      var chk=T.forgeCheck();
      out.scores.push(chk&&chk.score); out.total+=(chk&&chk.score)||0;
      if(s<4) T.forgeNext();
    }
    var fin=T.forgeNext();
    out.fin=fin;
    var e=T.en48();
    out.forgeKeys=Object.keys(e.forge).sort();
    out.hasScoreField=('scoreTotal' in e.forge)||('bestScore' in e.forge)||('sessionScore' in e.forge);
    out.sessionScoreInFS=('score' in T.session());
    // end screen HTML (forgeHTML via the overlay render path)
    var h='';
    try{ h=window.__v48._test.overlayHTML ? '' : ''; }catch(err){}
    out.endHTMLHasScore=false;
    try{
      // forgeHTML is closure-private; read the done screen through the
      // public overlay by opening the Forge tab and reading #v48hub.
      window.__v48.openForge('en','forge');
      var host=document.querySelector('#v48hub');
      h=host?host.innerHTML:'';
      out.endHTMLHasScore=/Điểm buổi|Điểm cao nhất|Tổng điểm/.test(h);
      out.endSnippet=h.slice(0,400);
    }catch(err){ out.endErr=String(err&&err.message); }
    return out;
  })())`);
  R('R3.1 per-answer scores exist (total > 0)', r.total > 0, { total: r.total, scores: r.scores });
  R('R3.2 session ends 5/5', r.fin && r.fin.right === 5, r.fin);
  R('R3.3 en48.forge has NO score field', r.hasScoreField === false, { keys: r.forgeKeys });
  R('R3.4 FS session state has NO score field', r.sessionScoreInFS === false, r);
  R('R3.5 end screen shows NO score', r.endHTMLHasScore === false, { snippet: (r.endSnippet || '').slice(0, 200) });
}

// ================= R4: C-R5-4 KO Hub 44px (static CSS) =================
console.log('\n== R4 C-R5-4: KO Hub touch targets (static CSS) ==');
{
  R('R4.1 no v50 layer yet (id="v50" absent)', countOcc(html, 'id="v50"') === 0);
  R('R4.2 .v7btn has no 44px min-height rule', !/\.v7btn\{[^}]*min-height:44px/.test(html), '.v7btn rule: ' + (html.match(/\.v7btn\{[^}]*\}/) || ['?'])[0].slice(0, 120));
  R('R4.3 #sk/#sn have no 44px min-height rule', !/#sk,#sn\{[^}]*min-height:44px/.test(html) && !/#sk[^{]*\{[^}]*min-height:44px/.test(html));
  R('R4.4 #v21avatarbtn has no 44px min-height rule', !/\.v21avatarbtn\{[^}]*min-height:44px/.test(html));
  R('R4.5 .tabs .tab has no 44px min-height rule at <=640px', !/\.tabs \.tab\{[^}]*min-height:44px/.test(html));
}

console.log(`\nREPRO: ${repro} reproduced, ${notrepro} NOT reproduced`);
process.exit(notrepro === 0 ? 0 : 1);
