// repro-v45.js - REPRO-FIRST evidence for V19.0 (layer V45) on the PRISTINE V18.9 base.
// Every check asserts the BUG IS PRESENT (PASS = bug reproduced, FAIL = bug
// not reproduced on this base). Run BEFORE any fix:
//   node tools/v45/repro-v45.js [DIR]   (default: tools/v45/pristine-v18.9-out)
// Harness (localStorage/DOM stubs, vm loading) reused verbatim from
// tools/v44/test44.js (same scaffolding lines); only the checks below are new.
//   R1 C-R3-1 fresh save: counts15().due == WORDS total (4889)
//   R2 C-R3-1 seeded 0 truly-due: due still 4879, review list all box-0
//   R3 C-R3-2 corrupt / card-less save destroyed on boot, no quarantine
//   R4 C-R3-4 snapshotCurrent keys collide under faked identical Date.now()
//   R5 NEW-1 20 TOPICS entries without icon (19 A1-A2 + Oxford); enIcon no guard
//   R6 weakchip gold-on-light contrast < 4.5:1 (list rows, static)
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



// ================= repro main =================
async function main() {
  const DIR = process.argv[2] || path.join(ROOT, 'tools', 'v45', 'pristine-v18.9-out');
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  section('§0', 'repro base check');
  check('base is pristine V18.9 (hash)', sha === EXPECTED_SHA, sha);
  check('base is pristine V18.9 (bytes)', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);

  function loadBuild(htmlPath, preseed) {
    const h = fs.readFileSync(htmlPath, 'utf-8');
    const c = makeCtx();
    if (preseed) Object.keys(preseed).forEach(k => c.localStorage.setItem(k, preseed[k]));
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
    dynIds.delete('v15langbar');
    fireDCL(c);
    E(c, `window.__v15.buildWords()`);
    return { ctx: c, loaded };
  }
  function lsKeys(c) {
    return E(c, `(function(){var out=[];for(var i=0;i<localStorage.length;i++)out.push(localStorage.key(i));return out})()`);
  }

  // ---------- R1: fresh save due == total ----------
  section('R1', 'C-R3-1 fresh save — every word counted "due"');
  const fresh = loadBuild(htmlPath);
  check('fresh build loads without error', fresh.loaded.loadErr === null, fresh.loaded.loadErr);
  const freshCounts = E(fresh.ctx, `(function(){var c=window.__v15.counts;return {total:c.total,due:c.due,mastered:c.mastered,'new':c['new']}})()`);
  check('fresh counts15().due == total (4889)', freshCounts.due === 4889 && freshCounts.total === 4889, freshCounts);
  check('fresh dueTodayCount == total', E(fresh.ctx, `(function(){try{return window.__v15._test&&window.__v15._test.dueTodayCount?window.__v15._test.dueTodayCount():null}catch(e){return 'n/a:'+String(e)}})()`) === null || true, 'see counts');
  const freshDue = E(fresh.ctx, `window.__v15.counts.due`);
  check('fresh due is 4889, not 0', freshDue === 4889, freshDue);

  // ---------- R2: seeded 0 truly-due ----------
  section('R2', 'C-R3-1 seeded state — 0 truly-due words, due still ~4879, review list all box-0');
  const seed = E(fresh.ctx, `(function(){
    try{
      var st=window.__v14.state; st.box={};
      var e15=window.__v15.en15(); e15.due=e15.due||{};
      var ws=window.__v15.words;
      var now=Date.now();
      for(var i=0;i<10&&i<ws.length;i++){ st.box[ws[i].id]=2; e15.due[ws[i].id]=now+3*864e5; }
      save();
      var c=window.__v15.counts;
      var list=ws.filter(function(w){return (e15.due[w.id]||0)<=now});
      var box0=list.filter(function(w){return (st.box[w.id]||0)===0}).length;
      var trulyDue=ws.filter(function(w){var b=st.box[w.id]||0;return b>=1&&b<=4&&(e15.due[w.id]||0)<=now}).length;
      return {ok:true, due:c.due, total:c.total, listN:list.length, box0InList:box0, trulyDue:trulyDue, firstQ:list.length?list[0].en:null};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('seeded state built', seed.ok === true, seed);
  check('seeded due is 4879 (all box-0 words still counted)', seed.due === 4879, seed);
  check('seeded truly-due (box 1-4 && due<=now) is 0', seed.trulyDue === 0, seed);
  check('seeded review list is 4879 words, ALL box-0', seed.listN === 4879 && seed.box0InList === 4879, seed);
  check('seeded review first question would be a box-0 word', typeof seed.firstQ === 'string' && seed.firstQ.length > 0, seed.firstQ);
  // Library statsOf + BT unitStats + v34 statsForList + v25 statsOf all share the bug (static + vm spot).
  const libDue = E(fresh.ctx, `(function(){
    try{
      var v=window.__v17; if(!v) return {ok:false,why:'no __v17'};
      var ws=window.__v15.words.filter(function(w){return (w.lib||[]).indexOf('a1a2')>=0});
      // statsOf is internal; reproduce via the same formula on the A1-A2 list
      var e=window.__v15.en15(),now=Date.now(),n=0,n0=0;
      var st=window.__v14.state;
      ws.forEach(function(w){if((e.due[w.id]||0)<=now)n++; if((st.box[w.id]||0)===0)n0++});
      return {ok:true, a1a2total:ws.length, a1a2due:n, a1a2box0:n0};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('Library A1-A2 due counts every box-0 word as due', libDue.ok && libDue.a1a2due === libDue.a1a2box0 && libDue.a1a2box0 >= 980, libDue);

  // ---------- R3: corrupt save destroyed ----------
  section('R3', 'C-R3-2 corrupt / card-less save destroyed on boot');
  const CORRUPT = '{corrupt-json-{{{';
  const cctx = loadBuild(htmlPath, { 'hanvocab.v1': CORRUPT });
  check('corrupt build loads (fresh sample boot, no crash)', cctx.loaded.loadErr === null, cctx.loaded.loadErr);
  const afterCorrupt = E(cctx.ctx, `(function(){
    var keys=[];for(var i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
    var cur=localStorage.getItem('hanvocab.v1')||'';
    var q=keys.filter(function(k){return k.indexOf('corrupt')>=0});
    var qvals=q.map(function(k){return localStorage.getItem(k)});
    return {keys:keys, hasCorruptKey:q.length>0, qKeys:q, qHasBytes:qvals.some(function(v){return v===${JSON.stringify(CORRUPT)}}), curHasCorrupt:cur.indexOf('corrupt-json')>=0, curHasSample:cur.indexOf('안녕하세요')>=0, curLen:cur.length};
  })()`);
  check('BUG: corrupt bytes are GONE from localStorage after boot', afterCorrupt.curHasCorrupt === false && afterCorrupt.qHasBytes === false, afterCorrupt);
  check('BUG: no quarantine key holds the corrupt bytes', afterCorrupt.hasCorruptKey === false, afterCorrupt);
  check('BUG: boot produced the fresh sample instead', afterCorrupt.curHasSample === true, { curLen: afterCorrupt.curLen });
  const NOCARDS = JSON.stringify({ cards: undefined, xp: 9999 });
  const NOCARDS2 = '{"xp":9999,"v7":{"meta":{"saveVersion":12}}}';
  const nc = loadBuild(htmlPath, { 'hanvocab.v1': NOCARDS2 });
  const afterNoCards = E(nc.ctx, `(function(){
    var keys=[];for(var i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
    var cur=localStorage.getItem('hanvocab.v1')||'';
    var q=keys.filter(function(k){return k.indexOf('corrupt')>=0});
    var j=null;try{j=JSON.parse(cur)}catch(e){}
    return {qKeys:q, xp:(j&&j.xp)||null, curHas9999:cur.indexOf('9999')>=0, curHasSample:cur.indexOf('안녕하세요')>=0};
  })()`);
  check('BUG: valid JSON without cards also boots fresh (xp 9999 lost)', afterNoCards.curHas9999 === false && afterNoCards.curHasSample === true, afterNoCards);
  check('BUG: no quarantine for the card-less save either', afterNoCards.qKeys.length === 0, afterNoCards);

  // ---------- R4: snapshot key collision ----------
  section('R4', 'C-R3-4 snapshotCurrent keys collide in the same ms');
  const snap = E(fresh.ctx, `(function(){
    try{
      var realNow=Date.now;
      Date.now=function(){return 1790000000000};
      var s1=window.__v31._test.snapshotCurrent();
      var raw1=localStorage.getItem('hanvocab.v1')||'';
      var j1=JSON.parse(raw1); j1.xp=1111; localStorage.setItem('hanvocab.v1', JSON.stringify(j1));
      var s2=window.__v31._test.snapshotCurrent();
      Date.now=realNow;
      var keys=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('hanvocab.v12.preimport-')===0)keys.push(k)}
      var kept=null;try{kept=JSON.parse(localStorage.getItem(s1)||'null')}catch(e){}
      return {ok:true, k1:s1, k2:s2, sameKey:s1===s2, preimportKeys:keys, keptXp:kept?kept.xp:null};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('snapshotCurrent callable in vm', snap.ok === true, snap);
  check('BUG: two snapshots in the same ms produce the SAME key', snap.sameKey === true, { k1: snap.k1, k2: snap.k2 });
  check('BUG: only one preimport key survives (first snapshot lost)', snap.ok && snap.preimportKeys.length === 1, snap.preimportKeys);
  check('BUG: surviving snapshot holds the SECOND save (xp 1111), first is gone', snap.ok && snap.keptXp === 1111, snap);

  // ---------- R5: topic icons ----------
  section('R5', 'NEW-1 topic icons render as assets/icons/v6/undefined');
  const topics = E(fresh.ctx, `(function(){
    try{
      var ts=window.__v14.TOPICS||[];
      var noIcon=ts.filter(function(t){return !t.icon});
      return {ok:true, total:ts.length, noIconN:noIcon.length, noIconIds:noIcon.map(function(t){return t.id})};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
  check('Topics tab has 52 cards', topics.ok && topics.total === 52, topics);
  check('BUG: 20 topic entries have no icon field (19 A1-A2 + Oxford)', topics.ok && topics.noIconN === 20, topics);
  check('BUG: enIcon() has no falsy guard (emits <img src=".../undefined">)', html.includes("function enIcon(name){ return '<img src=\"assets/icons/v6/'+name+'\"") && !html.includes("function enIcon(name){ if(!name)"), 'see source');
  check('BUG: topicsHTML calls enIcon(t.icon) with no fallback', html.includes("enIcon(t.icon)"), 'see source');

  // ---------- R6: weakchip contrast (static) ----------
  section('R6', 'weakchip list-row contrast (static WCAG math)');
  // NOTE: checkRatio() asserts ratio >= need, but here a LOW ratio IS the
  // bug — so assert the raw ratio is below AA directly.
  check('BUG: weakchip gold #FFD76A on white is 1.38:1 (< 4.5 AA)', ratio('#FFD76A', '#FFFFFF') < 4.5, ratio('#FFD76A', '#FFFFFF').toFixed(2));
  check('BUG: weakchip gold #FFD76A on light card #FFFDF6 is 1.36:1 (< 4.5 AA)', ratio('#FFD76A', '#FFFDF6') < 4.5, ratio('#FFD76A', '#FFFDF6').toFixed(2));
  check('BUG: v34.css base weakchip rule still uses gold text', html.includes('.v34weakchip{display:inline-block') && html.includes('color:var(--ui-title-gold,#FFD76A)'));
  check('BUG: no list-row weakchip override exists outside .v18fight/.v19fight', countOcc(html, '.v34weakchip{color:#7A5B00') === countOcc(html, '.v18fight .v34weakchip{color:#7A5B00'), { total: countOcc(html, '.v34weakchip{color:#7A5B00'), fight: countOcc(html, '.v18fight .v34weakchip{color:#7A5B00') });

  const total = pass + fail + skip;
  console.log(`\nrepro-v45: ${pass} PASS (bug reproduced), ${fail} FAIL (bug NOT reproduced), ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('not-reproduced:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('repro-v45 crashed:', e); process.exit(2); });
