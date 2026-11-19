// test37.js — V18.2 SCOPE BANNER FIX independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v36/test36.js (lines 34-188); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V18.2 build
// and the stale V18.1 pre-fix comment removed. V37 sections below are new.
// Usage: node tools/v37/test37.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   §0 static build integrity (hash, title, markers, fragments, src/out agree)
//   §L page load (vm, real inline scripts) + __v37 + renderHub/render exports
//   §37A hub banner: __v17.clearScope() calls renderHub once, banner gone
//         from the hub shell; fallback to renderTab when renderHub absent
//   §37B Smart banner: the shipped onclick clears + calls __v27.render(),
//         banner gone from the overlay body; render() safe when hidden
//   §R V18.1 REGRESSION (layers, resolveLethal, wrapper, TOTAL_BOSSES 86)
//   §V save schema (no en37 key, no new localStorage key)
//   §C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/touch/speech; innerHTML
// is a plain string, so banner visibility is asserted on the hub-shell /
// overlay-body strings, not on painted pixels); live-browser, real-phone
// and live-Firebase gates stay Chrome/Anh-only.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = 'fe0ba353568039b8b4b1ac4df132789e5dd876cce33d756993c12600d7bcb065';
const EXPECTED_BYTES = 2361084;
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
// Drive a live V27 session to its finishSession (answers via the
// exported answerMC/nextQ). okPattern is consumed IN ORDER (main
async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v37.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V18.2 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is 2,361,084 B', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('title is V18.2 Scope Banner Fix', html.includes('<title>Korean &amp; English Vocab Farm V18.2 — Scope Banner Fix'));
  check('__v37 + 18.2.0 present', html.includes('window.__v37') && html.includes("VERSION='18.2.0'"));
  check('__v33/__v34/__v35/__v36 + 17.0.0/17.1.0/18.0.0/18.1.0 still present', html.includes('window.__v33') && html.includes('window.__v34') && html.includes('window.__v35') && html.includes('window.__v36') && html.includes("VERSION='17.0.0'") && html.includes("VERSION='17.1.0'") && html.includes("VERSION='18.0.0'") && html.includes("VERSION='18.1.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v37', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v37', styleIds.join(','));
  check('script markers end v37', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v37', scriptIds.join(','));
  check('v37js after v36js', html.indexOf('id="v37js"') > html.indexOf('id="v36js"'));
  check('no v38 marker (no unshipped layer)', !html.includes('id="v38"') && !html.includes('id="v38js"'));
  for (const m of ['armV27Obs', 'rearmObserver', '_speakXp', 'V29 (F-05)']) {
    check(`out-of-scope marker absent: ${m}`, !html.includes(m));
  }
  // V37 fix fragments (one per replacement).
  check('R-V37-V15-RENDERHUB export present', html.includes('renderTab:renderTab,renderHub:renderHub,topicName:topicName,counts15:counts15,'), 'renderHub export');
  check('R-V37-V17-CLEARSCOPE new line present', html.includes('if(v.renderHub)v.renderHub();else renderTab()'));
  check('R-V37-V17-CLEARSCOPE old line gone', !html.includes("function clearScope(){var v=V15();if(!v)return;v.clearScope();renderTab()}"));
  check('R-V37-V27-RENDER export present', html.includes('goTab:goTab,goWeak:goWeak,render:render,'));
  check('R-V37-V27-BANNER onclick calls render', html.includes('__v27.render&&__v27.render()'));
  check('R-V37-V27-BANNER old onclick gone', !html.includes("window.__v15&&__v15.clearScope&&__v15.clearScope()\">✕ Bỏ chọn"));
  check('V37 comment present in clearScope', html.includes('V37 (V18.2): the scope banner lives in the hub shell'));
  // V36 fragments survive (spot-checks, one per group).
  for (const frag of ['function resolveLethal(Ff){', 'partial:!!partial', "wind:'stone_wind'", '_sxp36', 'v21emailbtn', 'z-index:1600', 'z-index:1700', 'NGHỀ NGHIỆP']) {
    check(`V36 fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  check('V17-4 typo still gone', countOcc(html, 'NGHỀNGHIỆP') === 0);
  // V33/V34/V35 fragments still present (spot-checks).
  for (const frag of ['__V33_DATA.byId(id)', 'QUEST_MIN_ACC=0.8', '__v34.breakDmg(F)', 'weakCountInPool(F.weak,pool)===0', '__V35_DATA?__V35_DATA.bosses:[]', 'var TOTAL_BOSSES=86;', 'GEAR_GOLEM=\'v17_geargolem\'', '/* V31 (F-01):']) {
    check(`older fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  check('TOTAL_BOSSES still 86', html.includes('var TOTAL_BOSSES=86;') && !html.includes('var TOTAL_BOSSES=78;'));
  check('v37 layer files present in DIR', fs.existsSync(path.join(DIR, 'v37.js')) && fs.existsSync(path.join(DIR, 'v37.css')));
  for (const f of ['v15.js', 'v17.js', 'v27.js']) {
    const a = fs.readFileSync(path.join(ROOT, 'src', f), 'utf-8');
    const b = fs.existsSync(path.join(DIR, f)) ? fs.readFileSync(path.join(DIR, f), 'utf-8') : '';
    check(`src/${f} agrees with out/${f}`, a === b);
  }
  check('src/v37.js agrees with out/v37.js', fs.readFileSync(path.join(ROOT, 'src', 'v37.js'), 'utf-8') === fs.readFileSync(path.join(DIR, 'v37.js'), 'utf-8'));

  // ================= §L page load (vm, real inline scripts) =================
  section('§L', 'page load (vm, real inline scripts)');
  const ctx = makeCtx();
  // H-37-1: the stub DOM keeps innerHTML as a plain string (no HTML
  // parsing), so #v15body / #v27body never become real elements unless
  // pre-registered here. renderHub writes the hub shell (banner
  // included) onto the #v15hub element directly, so the banner tests
  // below read document.getElementById('v15hub').innerHTML.
  dynIds.add('v15body');
  dynIds.add('v27body');
  const loaded = loadPage(ctx, html);
  check('inline script blocks extracted (>=30)', loaded.blocks >= 30, loaded.blocks);
  check('all inline scripts evaluate without error', loaded.loadErr === null, loaded.loadErr);
  if (loaded.loadErr) { console.log(`\ntest37 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15/__v17/__v27/__v37 present',
    E(ctx, `!!window.__v15 && !!window.__v17 && !!window.__v27 && !!window.__v37`));
  check('__v37.version is 18.2.0', E(ctx, `window.__v37.version`) === '18.2.0');
  check('R-V37-V15-RENDERHUB: __v15.renderHub is a function', E(ctx, `typeof window.__v15.renderHub === 'function'`));
  check('R-V37-V27-RENDER: __v27.render is a function', E(ctx, `typeof window.__v27.render === 'function'`));
  E(ctx, `window.__v15.buildWords()`);
  const nWords = E(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);

  // ================= §37A hub banner: clearScope re-renders the hub =================
  section('§37A', 'hub banner — __v17.clearScope() re-renders the hub shell');
  // Set a Library scope through the real UI path (learnTopic -> setScope
  // + tab('learn') -> setTab -> renderHub). The banner lives in the hub
  // shell string, so it is readable via #v15hub.innerHTML in the stub.
  const hubFlow = E(ctx, `(function(){
    var out={};
    try{ window.__v15.choose('en'); window.__v15.openHub('library'); }catch(e){ out.openErr=String(e); }
    try{ window.__v17.learnTopic('education'); }catch(e){ out.topicErr=String(e); }
    try{ out.scope=window.__v15.en15().scope; }catch(e){ out.scopeErr=String(e); }
    try{ var h=document.getElementById('v15hub'); out.hubHtml=h?String(h.innerHTML||''):null; }catch(e){ out.hubErr=String(e); }
    return out;
  })()`);
  check('learnTopic sets the A1-A2 education scope', hubFlow.scope && hubFlow.scope.kind === 'lib' && hubFlow.scope.lib === 'a1a2' && hubFlow.scope.topic === 'education', hubFlow);
  check('hub shell contains the scope banner after learnTopic', typeof hubFlow.hubHtml === 'string' && hubFlow.hubHtml.indexOf('v17scope') >= 0 && hubFlow.hubHtml.indexOf('Bỏ chọn') >= 0, (hubFlow.hubHtml || '').slice(0, 200));
  // Count renderHub / renderTab calls around the clear.
  const clear1 = E(ctx, `(function(){
    var out={rh:0, rt:0};
    var oRH=window.__v15.renderHub, oRT=window.__v15.renderTab;
    window.__v15.renderHub=function(){ out.rh++; return oRH(); };
    window.__v15.renderTab=function(){ out.rt++; return oRT(); };
    try{ window.__v17.clearScope(); }catch(e){ out.err=String(e); }
    window.__v15.renderHub=oRH; window.__v15.renderTab=oRT;
    try{ out.scope=window.__v15.en15().scope; }catch(e){}
    try{ var h=document.getElementById('v15hub'); out.hubHtml=h?String(h.innerHTML||''):null; }catch(e){}
    return out;
  })()`);
  check('clearScope clears the scope (data)', clear1.scope === null, clear1);
  check('clearScope calls renderHub exactly once', clear1.rh === 1, clear1);
  check('clearScope does NOT call renderTab directly (renderHub covers it)', clear1.rt === 0, clear1);
  check('hub shell no longer contains the banner after clearScope', typeof clear1.hubHtml === 'string' && clear1.hubHtml.indexOf('v17scope') < 0, (clear1.hubHtml || '').slice(0, 200));
  // Fallback path: with renderHub absent from the export, clearScope
  // must fall back to renderTab (the old behaviour — banner stays, but
  // the scope is still cleared and nothing throws).
  const clearFb = E(ctx, `(function(){
    var out={rh:0, rt:0};
    var oRH=window.__v15.renderHub, oRT=window.__v15.renderTab;
    window.__v15.renderHub=undefined;
    window.__v15.renderTab=function(){ out.rt++; return oRT(); };
    try{ window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'education'}); window.__v15.tab('learn'); }catch(e){ out.setupErr=String(e); }
    try{ var h0=document.getElementById('v15hub'); out.bannerBefore=h0?String(h0.innerHTML||'').indexOf('v17scope')>=0:null; }catch(e){}
    try{ window.__v17.clearScope(); }catch(e){ out.err=String(e); }
    window.__v15.renderHub=oRH; window.__v15.renderTab=oRT;
    try{ out.scope=window.__v15.en15().scope; }catch(e){}
    try{ var h=document.getElementById('v15hub'); out.bannerAfter=h?String(h.innerHTML||'').indexOf('v17scope')>=0:null; }catch(e){}
    return out;
  })()`);
  check('fallback: scope re-set and banner present before clear', clearFb.bannerBefore === true, clearFb);
  check('fallback: clearScope calls renderTab exactly once when renderHub is absent', clearFb.rt === 1, clearFb);
  check('fallback: scope is still cleared', clearFb.scope === null, clearFb);
  check('fallback: banner stays (old behaviour — renderTab cannot reach the hub shell)', clearFb.bannerAfter === true, clearFb);
  check('fallback: renderHub export restored afterwards', E(ctx, `typeof window.__v15.renderHub === 'function'`));

  // ================= §37B Smart banner: button clears + re-renders =================
  section('§37B', 'Smart banner — button clears the scope and re-renders the overlay');
  // render() early-returns when the overlay is hidden (safe to call).
  const renderHidden = E(ctx, `(function(){
    var out={};
    try{ window.__v27.closeSmart(); }catch(e){}
    try{ window.__v27.render(); out.ok=true; }catch(e){ out.ok=false; out.err=String(e); }
    return out;
  })()`);
  check('__v27.render() is safe when the overlay is hidden (early return)', renderHidden.ok === true, renderHidden);
  const smartFlow = E(ctx, `(function(){
    var out={};
    try{ window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'education'}); }catch(e){ out.scopeErr=String(e); }
    try{ window.__v27.openSmart('en'); }catch(e){ out.openErr=String(e); }
    try{ var b=document.getElementById('v27body'); out.bodyHtml=b?String(b.innerHTML||''):null; }catch(e){ out.bodyErr=String(e); }
    try{ out.scope=window.__v15.en15().scope; }catch(e){}
    return out;
  })()`);
  check('Smart overlay opens with the scope set', smartFlow.scope && smartFlow.scope.kind === 'lib', smartFlow);
  check('Smart body contains the scope banner', typeof smartFlow.bodyHtml === 'string' && smartFlow.bodyHtml.indexOf('v27scope') >= 0 && smartFlow.bodyHtml.indexOf('Bỏ chọn') >= 0, (smartFlow.bodyHtml || '').slice(0, 200));
  // Execute the onclick code EXACTLY as the built banner ships it: parse
  // it out of the rendered banner HTML, then run it, then re-read.
  const smartClear = E(ctx, `(function(){
    var out={};
    try{
      var b=document.getElementById('v27body');
      var html=String(b.innerHTML||'');
      var m=html.match(/onclick="([^"]*clearScope[^"]*)"/);
      out.onclickFound=!!m;
      if(m){
        out.onclick=m[1].slice(0, 200);
        // The handler must call __v27.render() after clearing.
        out.onclickCallsRender=m[1].indexOf('__v27.render')>=0;
        eval(m[1].replace(/&amp;/g,'&'));
      }
    }catch(e){ out.err=String(e); }
    try{ out.scope=window.__v15.en15().scope; }catch(e){}
    try{ var b2=document.getElementById('v27body'); out.bodyHtml=b2?String(b2.innerHTML||''):null; }catch(e){}
    return out;
  })()`);
  check('Smart banner onclick found in the rendered HTML', smartClear.onclickFound === true, smartClear);
  check('Smart banner onclick calls __v27.render() after clearing', smartClear.onclickCallsRender === true, smartClear);
  check('Smart banner click clears the scope (data)', smartClear.scope === null, smartClear);
  check('Smart body no longer contains the banner after the click', typeof smartClear.bodyHtml === 'string' && smartClear.bodyHtml.indexOf('v27scope') < 0, (smartClear.bodyHtml || '').slice(0, 200));
  E(ctx, `try{ window.__v27.closeSmart(); }catch(e){}`);

  // ================= §R V18.1 regression =================
  section('§R', 'V18.1 regression — gates, fragments, probe set');
  check('V36 layer still present (__v36 18.1.0)', E(ctx, `!!window.__v36 && window.__v36.version==='18.1.0'`));
  check('V35 layer still present (__v35 18.0.0)', E(ctx, `!!window.__v35 && window.__v35.version==='18.0.0'`));
  check('V34 layer still present (__v34 17.1.0)', E(ctx, `!!window.__v34 && window.__v34.version==='17.1.0'`));
  check('V33 layer still present (__v33 17.0.0)', E(ctx, `!!window.__v33 && window.__v33.version==='17.0.0'`));
  check('V32 layer still present (__v32 16.4.0)', E(ctx, `!!window.__v32 && window.__v32.version==='16.4.0'`));
  check('V31 layer still present (__v31 16.3.0)', E(ctx, `!!window.__v31 && window.__v31.version==='16.3.0'`));
  check('V27 layer still present (__v27 16.0.0)', E(ctx, `!!window.__v27 && window.__v27.version==='16.0.0'`));
  check('V36 resolveLethal still exported (V17-2)', E(ctx, `typeof window.__v19._test.resolveLethal === 'function' && typeof window.__v18._test.resolveLethal === 'function'`));
  check('V36 breakBarHTML wrapper still active', E(ctx, `window.__v36.wrapped===true && typeof window.__v34._breakBarHTML_orig==='function'`));
  check('TOTAL_BOSSES still 86', E(ctx, `window.__v21 && window.__v21.TOTAL_BOSSES===86`) || html.includes('var TOTAL_BOSSES=86;'));

  // ================= §V save schema =================
  section('§V', 'save schema — no new key, no schema change');
  const sav = J(ctx, `JSON.stringify((function(){
    var out={};
    try{
      // The V20 save wrapper debounces 0.8s — flush explicitly so the
      // persisted snapshot reflects the clear tests just run.
      try{ if(window.__v20&&__v20.flush)__v20.flush(); }catch(e){}
      var s=JSON.parse(localStorage.getItem('hanvocab.v1')||'{}');
      out.hasV37=!!(s.v7&&s.v7.en37);
      out.hasEn15Scope=!!(s.v7&&s.v7.en15);
      out.scopeAfterTests=(s.v7&&s.v7.en15)?(s.v7.en15.scope||null):'n/a';
    }catch(e){ out.err=String(e); }
    var keys=[]; for(var i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));
    out.lsKeys=keys.sort();
    return out;
  })())`);
  check('no new en37 save key (V37 adds nothing to the save)', sav.hasV37 === false, sav);
  check('scope is null in the saved state after the clear tests', sav.scopeAfterTests === null, sav);
  check('no new localStorage key from V37 (only hanvocab.* keys)', sav.lsKeys.every(function (k) { return k.indexOf('hanvocab.') === 0; }), sav.lsKeys);

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('hub banner GONE in a real browser after Bỏ chọn (live DOM + visibility)', 'needs real Chrome — see verify-v37c.js');
  skipCheck('clearing the scope mid-mode keeps the active mode question (timer + state)', 'needs real Chrome — see verify-v37c.js');
  skipCheck('Smart banner GONE in a real browser after Bỏ chọn', 'needs real Chrome — see verify-v37c.js');
  skipCheck('V18.1 regression spot-check in a real browser (hub, Library, boss fight, Pet Hub)', 'needs real Chrome — see verify-v37c.js');
  skipCheck('live Firebase login/sync', 'never tested live in any version — Anh must run the FIREBASE_SETUP.md checklist');
  skipCheck('real phone touch / Safari', 'needs Anh\'s real-phone test');

  // ================= footer =================
  const total = pass + fail + skip;
  console.log(`\ntest37: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('test37 crashed:', e); process.exit(2); });
