// probe_v34.js — V17.1 CHRONO COMPLETION runtime probe (Node vm harness).
// Loads the REAL built out/index.html inline scripts in order into a vm
// context (stub DOM/localStorage, MutationObserver stub) and drives the
// real __v15/__v17/__v18/__v19/__v27/__v33/__v34 APIs.
// Usage: node tools/v34/probe_v34.js [DIR]   (default: <repo>/out)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// HONEST LIMITS: stub DOM (no real rendering/layout/touch/speech);
// live-browser, real-phone and live-Firebase gates stay Chrome/Anh-only.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
let pass = 0, fail = 0, skip = 0;
const failures = [];
const secCounts = {};
let curSec = '';
function section(id, t) { curSec = id; secCounts[id] = secCounts[id] || { pass: 0, fail: 0, skip: 0 }; console.log(`\n== ${id} ${t} ==`); }
function check(name, cond, detail) {
  if (cond) { pass++; secCounts[curSec].pass++; console.log(`  PASS ${name}`); }
  else { fail++; secCounts[curSec].fail++; failures.push(curSec + ' ' + name); console.log(`  FAIL ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''}`); }
}
function skipCheck(name, why) { skip++; secCounts[curSec].skip++; console.log(`  SKIP ${name} — ${why}`); }

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
// ---------- minimal DOM stub ----------
// ids that exist in the real static HTML (extracted from the page) plus
// ids created dynamically by the game — getElementById returns a memoized
// stub for those, null otherwise (so guards like
// "if(document.getElementById('v15langbar'))return;" behave correctly).
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
      // Memoized stub (same rationale as document.querySelector).
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
      // Unknown selectors: return a memoized stub element (the real page
      // has these nodes; returning null would crash load-time code that
      // reads .dataset/.classList unguarded). Memoized so repeated
      // queries see the same element (e.g. innerHTML round-trips).
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
function evalIn(ctx, expr) { return vm.runInContext(expr, ctx); }

async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v34.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('title is V17.1', html.includes('<title>Korean &amp; English Vocab Farm V17.1 — Chrono Complete — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>'));
  check('__v34 + 17.1.0 present', html.includes('window.__v34') && html.includes("VERSION='17.1.0'"));
  check('__V34_DATA present', html.includes('window.__V34_DATA'));
  check('__v33 + 17.0.0 still present', html.includes('window.__v33') && html.includes("VERSION='17.0.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v34', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v34', styleIds.join(','));
  check('script markers end v34', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v34', scriptIds.join(','));
  check('v34data present and before v34js', html.includes('id="v34data"') && html.indexOf('id="v34data"') < html.indexOf('id="v34js"'));
  check('v34js after v33js', html.indexOf('id="v34js"') > html.indexOf('id="v33js"'));
  for (const m of ['v21emailbtn', '_esc21', 'armV27Obs', 'rearmObserver', '_speakXp', 'V29 (F-05)']) {
    check(`out-of-scope marker absent: ${m}`, !html.includes(m));
  }
  const frags34 = [
    ['R-V34-V17-DATA', 'chronoSets()'],
    ['R-V34-V17-GROUP', 'chronoGroupHTML()'],
    ['R-V34-V17-LESSON', "V.lib==='chrono'&&V.set"],
    ['R-V34-V25-KEY', "t.indexOf('Chrono')>=0"],
    ['R-V34-V15-INSCOPE', "sc.lib==='chrono'&&sc.set"],
    ['R-V34-V19-SC2/V18-SC2', 'set:sc.set'],
    ['R-V34-V19/V18-BREAK', '__v34.breakDmg(F)'],
    ['R-V34-V15-BREAK', '__v34.breakDmg(B)'],
    ['R-V34-V19/V18/V15-BIAS', '__v34.weakPick'],
    ['R-V34-V19/V18/V15-BAR', '__v34.breakBarHTML'],
    ['R-V34-V33-GUARD', "try{if(window.__v27&&__v27.endEarly)__v27.endEarly()}catch(e){}"],
  ];
  for (const [label, frag] of frags34) check(`replacement fragment ${label} present`, html.includes(frag), frag);
  for (const frag of ['__V33_DATA.byId(id)', "b.zone==='chrono'&&window.__v33&&__v33.bossUnlocked", "b.id==='v17_geargolem'?90:", 'var TOTAL_BOSSES=78;', "else if(kk==='en33')", '/* V33: CHRONO KINGDOM']) {
    check(`V33 fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  check('v34 layer files present in DIR', fs.existsSync(path.join(DIR, 'v34.js')) && fs.existsSync(path.join(DIR, 'v34.css')) && fs.existsSync(path.join(DIR, 'v34_data.js')));

  // ================= load the real page into vm =================
  section('§L', 'page load (vm, real inline scripts)');
  // Static HTML ids: getElementById must return stubs for these (real DOM),
  // null for ids the game never created (guards like init15 rely on that).
  staticIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  const ctx = makeCtx();
  const blocks = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let mm;
  while ((mm = re.exec(html)) !== null) blocks.push(mm[1]);
  check('inline script blocks extracted', blocks.length >= 30, blocks.length);
  let loadErr = null;
  for (let i = 0; i < blocks.length; i++) {
    try { vm.runInContext(blocks[i], ctx, { filename: `inline-${i}` }); }
    catch (e) { loadErr = `block ${i}: ${e.message}`; break; }
  }
  check('all inline scripts evaluate without error', loadErr === null, loadErr);
  if (loadErr) { console.log(`\nprobe ABORTED at load: ${loadErr}`); process.exit(1); }
  // Fire DOMContentLoaded: init15() (pushDataIntoV14 -> full WORDS incl.
  // A1-A2/Oxford-only rows) runs on it in the real browser.
  try {
    const ls = ctx.document.__listeners['DOMContentLoaded'] || [];
    ls.forEach(fn => { try { fn({ type: 'DOMContentLoaded' }); } catch (e) {} });
  } catch (e) {}
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', evalIn(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', evalIn(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15 present', evalIn(ctx, `!!window.__v15`));
  check('__v17/__v18/__v19/__v27/__v33/__v34 present',
    evalIn(ctx, `!!window.__v17 && !!window.__v18 && !!window.__v19 && !!window.__v27 && !!window.__v33 && !!window.__v34`));
  evalIn(ctx, `window.__v15.buildWords()`);
  const nWords = evalIn(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);
  const nChrono = evalIn(ctx, `window.__v15.words.filter(function(w){return (w.lib||[]).indexOf('chrono')>=0}).length`);
  check('240 Chrono words in WORDS', nChrono === 240, nChrono);

  // ================= §1 SRS (§2 of the task) =================
  section('§1', 'SRS enrolment — mark15 on a v33_ word');
  const w0 = evalIn(ctx, `window.__v15.words.filter(function(w){return w.id==='v33_alarm_clock'})[0]`);
  check('fixture word v33_alarm_clock exists, lv B2, set time', !!w0 && w0.lv === 'B2' && w0.chronoSet === 'time', w0 && { lv: w0.lv, set: w0.chronoSet });
  const before = evalIn(ctx, `({box:(window.__v15.enOld().box||{})['v33_alarm_clock']||0, due:(window.__v15.en15().due||{})['v33_alarm_clock']})`);
  check('word unenrolled before mark15 (box 0)', before.box === 0, before);
  evalIn(ctx, `window.__v15.mark15(true, window.__v15.words.filter(function(w){return w.id==='v33_alarm_clock'})[0], 'mc')`);
  const after = evalIn(ctx, `({box:(window.__v15.enOld().box||{})['v33_alarm_clock'], right:(window.__v15.enOld().right||{})['v33_alarm_clock'], due:(window.__v15.en15().due||{})['v33_alarm_clock'], intv:(window.__v15.en15().intv||{})['v33_alarm_clock']})`);
  check('mark15 enrols: box 1, right 1, intv 1, due in future', after.box === 1 && after.right === 1 && after.intv === 1 && after.due > Date.now(), after);
  evalIn(ctx, `window.__v15.en15().due['v33_alarm_clock']=Date.now()-1000; window.__v15.save15()`);
  const dueNow = evalIn(ctx, `window.__v15.words.filter(function(w){return (window.__v15.en15().due[w.id]||0)<=Date.now() && w.id==='v33_alarm_clock'}).length`);
  check('enrolled word appears due when due <= now', dueNow === 1);
  const cls = evalIn(ctx, `window.__v27.classifyEN(window.__v15.words.filter(function(w){return w.id==='v33_alarm_clock'})[0])`);
  check('Smart classifyEN includes the Chrono word (no missing/error)', !!cls && typeof cls.cls === 'string', cls);
  const planHas = evalIn(ctx, `window.__v27._test.buildPlanCore('en', 10, 2, 2, 2).plan.ids.indexOf('v33_alarm_clock')>=0 || window.__v27._test.allENWords().indexOf('v33_alarm_clock')>=0`);
  check('Smart word universe includes the Chrono word', planHas === true, planHas);

  // ================= §2 Library 5th group =================
  section('§2', 'Library — Chrono group (v17)');
  check('chronoWords() = 240', evalIn(ctx, `window.__v17.chronoWords().length`) === 240);
  const sets = evalIn(ctx, `window.__v17.chronoSets().map(function(g){return g.id+':'+g.words.length}).join(',')`);
  check('chronoSets() = 4 x 60 in fixed order', sets === 'time:60,space:60,machines:60,change:60', sets);
  const libHtml = evalIn(ctx, `window.__v17.libraryHTML()`);
  check('libraryHTML has Chrono group', libHtml.indexOf('Chrono Kingdom') >= 0);
  const hasName = (h, nm) => h.indexOf(nm) >= 0 || h.indexOf(nm.replace(/&/g, '&amp;')) >= 0;
  for (const nm of ['Time & Calendar', 'Space & Astronomy', 'Machines & Engineering', 'Change & Sequence']) {
    check(`libraryHTML lists set ${nm}`, hasName(libHtml, nm));
  }
  check('libraryHTML has KO empty-state note', libHtml.indexOf('Chưa có từ Chrono tiếng Hàn') >= 0);
  check('libraryHTML has group summary row', libHtml.indexOf('Tổng:') >= 0);
  try { evalIn(ctx, `window.__v17.openSet('time')`); } catch (e) { /* renderTab may touch stub DOM; state is set first */ }
  const st = evalIn(ctx, `({lib:window.__v17.state.lib, set:window.__v17.state.set, view:window.__v17.state.view})`);
  check('openSet(time): state lib=chrono set=time view=lesson', st.lib === 'chrono' && st.set === 'time' && st.view === 'lesson', st);
  const lessonHtml = evalIn(ctx, `window.__v17.libraryHTML()`);
  check('per-set lesson view renders (Chrono · Time & Calendar)', hasName(lessonHtml, 'Chrono · Time & Calendar'));
  check('per-set lesson view shows a Chrono word', lessonHtml.indexOf('alarm clock') >= 0);
  evalIn(ctx, `window.__v17.goHome()`);
  // scope: set + wordsFiltered/inScope
  evalIn(ctx, `window.__v15.setScope({kind:'lib',lib:'chrono',set:'space'})`);
  const wf = evalIn(ctx, `window.__v15.wordsFiltered({level:'ALL'})`);
  const wfOk = evalIn(ctx, `window.__v15.wordsFiltered({level:'ALL'}).every(function(w){return w.chronoSet==='space'})`);
  check('wordsFiltered with chrono/space scope = 60, all space', wf.length === 60 && wfOk, wf.length);
  const inScope = evalIn(ctx, `({t:window.__v15.inScope(window.__v15.words.filter(function(w){return w.chronoSet==='time'})[0]), s:window.__v15.inScope(window.__v15.words.filter(function(w){return w.chronoSet==='space'})[0])})`);
  check('inScope: time word OUT, space word IN under space scope', inScope.t === false && inScope.s === true, inScope);
  evalIn(ctx, `window.__v15.setScope({kind:'lib',lib:'chrono'})`);
  check('wordsFiltered with chrono (all) scope = 240', evalIn(ctx, `window.__v15.wordsFiltered({level:'ALL'}).length`) === 240);
  evalIn(ctx, `window.__v15.clearScope()`);
  // reward: claim per-set only when fully learned
  evalIn(ctx, `var _o=window.__v15.enOld(); window.__v17.chronoSets().filter(function(g){return g.id==='time'})[0].words.forEach(function(w){_o.box[w.id]=5}); window.__v15.save15()`);
  const gemsBefore = evalIn(ctx, `S.v7.gems||0`);
  evalIn(ctx, `window.__v17.claim('chrono:time')`);
  const claimed = evalIn(ctx, `({c:!!(S.v7.en17&&S.v7.en17.claimed&&S.v7.en17.claimed['chrono:time']), g:(S.v7.gems||0)})`);
  check('claim chrono:time once learned: claimed + 2 gems', claimed.c === true && claimed.g === gemsBefore + 2, claimed);
  evalIn(ctx, `window.__v17.claim('chrono:time')`);
  check('re-claim is a no-op (once-only)', evalIn(ctx, `S.v7.gems||0`) === claimed.g);
  evalIn(ctx, `var _o2=window.__v15.enOld(); window.__v17.chronoSets().filter(function(g){return g.id==='time'})[0].words.forEach(function(w){_o2.box[w.id]=0}); window.__v15.save15()`);

  // ================= §3 Analytics =================
  section('§3', 'Vocabulary Analytics (derived only)');
  const sTime = evalIn(ctx, `window.__v34.setStats('time')`);
  check('setStats(time): total 60', sTime && sTime.total === 60, sTime);
  // Retention fixture uses a CHANGE-set word (untouched by §1/§2 marks).
  evalIn(ctx, `var _cw=window.__v15.words.filter(function(w){return w.chronoSet==='change'})[0]; window.__v15.mark15(true, _cw, 'mc'); window.__v15.mark15(false, _cw, 'mc')`);
  const sChange2 = evalIn(ctx, `window.__v34.setStats('change')`);
  check('retention is a real derived ratio (1 right / 2 attempts = 50%)', sChange2 && sChange2.retention === '50%' && sChange2.attempts === 2, sChange2);
  const ana = evalIn(ctx, `window.__v34.chronoAnalytics()`);
  check('chronoAnalytics: 4 sets + total 240', !!ana && ana.total.total === 240 && ana.sets.time.total === 60 && ana.sets.change.total === 60, ana && ana.total);
  const ko = evalIn(ctx, `window.__v34.koChronoStats()`);
  check('KO Chrono stats: honest empty state, no fake zeros as progress', !!ko && ko.empty === true && ko.total === 0 && ko.note.indexOf('Chưa có từ Chrono tiếng Hàn') === 0, ko);

  // ================= §4 Boss Weakness =================
  section('§4', 'Boss Weakness System');
  const allBosses = evalIn(ctx, ` (function(){ var list=[];
    try{ list=list.concat(window.__V33_DATA.bosses); }catch(e){}
    try{ list=list.concat(window.__V19_DATA.bosses); }catch(e){}
    try{ var b18=window.__V18_BOSSES||{}; ['en','el','leg','old'].forEach(function(k){ if(b18[k]) list=list.concat(b18[k]); }); }catch(e){}
    return list; })() `);
  check('roster enumerated = 78 bosses', allBosses.length === 78, allBosses.length);
  const ids = allBosses.map(b => b.id);
  check('78 unique boss ids', new Set(ids).size === 78, new Set(ids).size);
  const weakKinds = evalIn(ctx, ` (function(){ var list=[];
    try{ list=list.concat(window.__V33_DATA.bosses); }catch(e){}
    try{ list=list.concat(window.__V19_DATA.bosses); }catch(e){}
    try{ var b18=window.__V18_BOSSES||{}; ['en','el','leg','old'].forEach(function(k){ if(b18[k]) list=list.concat(b18[k]); }); }catch(e){}
    var out={};
    list.forEach(function(b){ var w=window.__v34.weakFor(b,'en'); out[b.id]=w; });
    return out; })() `);
  const kinds = new Set(Object.values(weakKinds).map(w => w.kind));
  check('weakFor resolves every boss (kinds chrono/a1a2/t only for EN)', [...kinds].every(k => ['chrono', 'a1a2', 't'].includes(k)), [...kinds]);
  // explicit chrono 8
  const expOk = evalIn(ctx, ` [['v17_sandwisp','time'],['v17_pendulum','machines'],['v17_specter','time'],['v17_mantis','machines'],['v17_hound','space'],['v17_oracle','time'],['v17_titan','change'],['v17_geargolem','machines']].every(function(p){ var w=window.__v34.weakFor({id:p[0],zone:'chrono',diff:'B2'},'en'); return w.kind==='chrono'&&w.key===p[1]; }) `);
  check('Chrono 8 explicit weaknesses match the table', expOk === true);
  // every weakness has >=1 matching word in WORDS, and in the real fight
  // pool — modeled EXACTLY on v19/v18 wordPool (no scope): lib filter
  // (v18 en), legDiff (v18 leg), else diff filter; <12 -> ALL words.
  evalIn(ctx, `window.__v15.clearScope()`);
  const poolCheck = evalIn(ctx, ` (function(){
    var list=[];
    try{ list=list.concat(window.__V33_DATA.bosses); }catch(e){}
    try{ list=list.concat(window.__V19_DATA.bosses); }catch(e){}
    try{ var b18=window.__V18_BOSSES||{}; ['en','el','leg'].forEach(function(k){ if(b18[k]) list=list.concat(b18[k]); }); if(b18['old']) list=list.concat(b18['old'].map(function(b){ b._v34old=true; return b; })); }catch(e){}
    var words=window.__v15.words, bad=[];
    function legDiff(){ var m=0; try{ m=window.__v15.counts().mastered; }catch(e){} if(m<200)return ['A2','B1']; if(m<600)return ['B1']; return ['B2']; }
    function poolOf(b){
      var list;
      if(b._v34old) list=words.slice(); /* V15 fights use wordsFiltered ALL */
      else if(b.lib==='oxford'){ list=words.filter(function(x){ return (x.lib||[]).indexOf('oxford')>=0; }); if(b.diff) list=list.filter(function(x){ return x.lv===b.diff; }); }
      else if(b.arena==='leg'){ var lv=legDiff(); list=words.filter(function(x){ return lv.indexOf(x.lv)>=0; }); }
      else if(b.diff) list=words.filter(function(x){ return x.lv===b.diff; });
      else list=words.slice();
      if(list.length<12) list=words.slice();
      return list;
    }
    list.forEach(function(b){
      var w=window.__v34.weakFor(b,'en');
      var any=words.filter(function(x){return window.__v34.weakMatch(x,w)}).length;
      var inPool=poolOf(b).filter(function(x){return window.__v34.weakMatch(x,w)}).length;
      if(any===0||inPool===0) bad.push({id:b.id, weak:w, any:any, inPool:inPool, poolSize:poolOf(b).length});
    });
    return bad; })() `);
  // KNOWN LIMIT (data, not code): 13 bosses' weaknesses can never appear
  // in their diff-filtered fight pool — the A1-A2 basic topics
  // (animals/vehicles/clothes-and-accessories/fruit-and-vegetables/
  // food-and-drinks) have no B1/B2-level words (verified via
  // V34_DEBUG_TOPICS counts). The honest handling (blocked bar, meter
  // never fills) covers them; the spec's weakness table is kept as-is.
  // Any deviation from exactly these 13 is a real regression.
  // V18.1 correction: the list was 12 until the probe-model fix
  // (V36 R-PROBE: the oxford branch now applies the diff filter);
  // v10_owl is the 13th — its pool is Oxford ∩ B1 = 149 words, of
  // which 0 match 'clothes-and-accessories'. In-game behaviour was
  // already correct (honest blocked message); only the count was wrong.
  const expectedUnfillable = ['v11_seadragon', 'v11_sharkking', 'v11_timemachine', 'v11_golem', 'v11_goldephant', 'v10_tiger', 'v10_wizard', 'v10_dict', 'v10_king', 'v10_fox', 'v10_octopus', 'v10_fairy', 'v10_owl'];
  const gotUnfillable = poolCheck.map(b => b.id).sort();
  check('unfillable weaknesses are exactly the 13 known B1/B2 basic-topic bosses', JSON.stringify(gotUnfillable) === JSON.stringify(expectedUnfillable.slice().sort()), gotUnfillable.join(', '));
  if (process.env.V34_DUMP_POOL) fs.writeFileSync('/tmp/v34_pool_bad.json', JSON.stringify(poolCheck, null, 1));
  // Debug aid: V15-topic x level counts for the weakness topics that have
  // zero B1/B2 words via a1a2Topics (decides whether a topic-synonym
  // extension of weakMatch could ever fill those meters).
  if (process.env.V34_DEBUG_TOPICS) {
    const tc = evalIn(ctx, ` (function(){
      var topics=['animals','transport','clothes','food','fruits','vegetables','time','family','travel','education','school-objects','house-and-home','body-movements','emotions-and-feelings','colors-and-shapes','cooking-verbs'];
      var out={};
      topics.forEach(function(t){
        var byLv={};
        window.__v15.words.forEach(function(w){ if(w.t===t){ byLv[w.lv]=(byLv[w.lv]||0)+1; } });
        var byA1={};
        window.__v15.words.forEach(function(w){ if((w.a1a2Topics||[]).indexOf('a1_'+t)>=0){ byA1[w.lv]=(byA1[w.lv]||0)+1; } });
        out[t]={byV15Topic:byLv, byA1a2Topic:byA1};
      });
      return out; })() `);
    console.log('V34_DEBUG_TOPICS:', JSON.stringify(tc));
  }
  // weakMatch normalization (a1_ prefix) + t:'time'
  check("weakMatch accepts a1a2Topics 'a1_family' for key 'family'",
    evalIn(ctx, `window.__v34.weakMatch({a1a2Topics:['a1_family']},{kind:'a1a2',key:'family'})`) === true);
  check("weakMatch t:'time' matches 32 V15 words",
    evalIn(ctx, `window.__v15.words.filter(function(w){return window.__v34.weakMatch(w,{kind:'t',key:'time'})}).length`) === 32);
  check('breakBonus: 60->10, 200->20, 620->50 (clamped), 325->33',
    evalIn(ctx, `window.__v34.breakBonus(60)===10 && window.__v34.breakBonus(200)===20 && window.__v34.breakBonus(620)===50 && window.__v34.breakBonus(325)===33`));
  // breakDmg unit (fake F)
  const bd = evalIn(ctx, ` (function(){
    var F={cur:{w:{chronoSet:'time'}}, weak:{kind:'chrono',key:'time'}, brk:0, brkMax:3, maxHp:620, lang:'en'};
    var r1=window.__v34.breakDmg(F), b1=F.brk;
    var r2=window.__v34.breakDmg(F), b2=F.brk;
    var r3=window.__v34.breakDmg(F), b3=F.brk;
    var rMiss=window.__v34.breakDmg({cur:{w:{chronoSet:'space'}}, weak:{kind:'chrono',key:'time'}, brk:0, brkMax:3, maxHp:620, lang:'en'});
    var rWord=window.__v34.breakDmg({cur:{g:{}}, weak:{kind:'chrono',key:'time'}, brk:0, brkMax:3, maxHp:620, lang:'en'});
    return {r1:r1,b1:b1,r2:r2,b2:b2,r3:r3,b3:b3,rMiss:rMiss,rWord:rWord}; })() `);
  check('breakDmg: 1st/2nd hit fill (0 dmg), 3rd BREAKs +50 and resets', bd.r1 === 0 && bd.b1 === 1 && bd.r2 === 0 && bd.b2 === 2 && bd.r3 === 50 && bd.b3 === 0, bd);
  check('breakDmg: non-weakness word and grammar question fill nothing', bd.rMiss === 0 && bd.rWord === 0, bd);
  // weakPick distribution
  const wp = evalIn(ctx, ` (function(){
    var words=window.__v15.words.filter(function(w){return (w.lib||[]).indexOf('chrono')>=0});
    var F={weak:{kind:'chrono',key:'time'}, brk:0, brkMax:3, lang:'en', pools:{words:words}};
    var fb=words.filter(function(w){return w.chronoSet==='space'})[0];
    var n=0, N=400;
    for(var i=0;i<N;i++){ var p=window.__v34.weakPick(F, words, fb); if(p&&p.chronoSet==='time') n++; }
    return n/N; })() `);
  check('weakPick draws weakness words ~50% (0.3–0.7 over 400 draws)', wp >= 0.3 && wp <= 0.7, wp);
  // scopeBlocked + breakBarHTML
  const sb = evalIn(ctx, ` (function(){
    window.__v15.setScope({kind:'lib',lib:'chrono',set:'time'});
    var spaceWords=window.__v15.words.filter(function(w){return w.chronoSet==='space'});
    var timeWords=window.__v15.words.filter(function(w){return w.chronoSet==='time'});
    var F1={weak:{kind:'chrono',key:'time'}, lang:'en', pools:{words:spaceWords}};
    var F2={weak:{kind:'chrono',key:'time'}, lang:'en', pools:{words:timeWords}};
    var r={blocked:window.__v34.scopeBlocked(F1), open:window.__v34.scopeBlocked(F2)};
    r.barBlocked=window.__v34.breakBarHTML({weak:{kind:'chrono',key:'time'}, lang:'en', brk:1, brkMax:3, pools:{words:spaceWords}});
    r.barOpen=window.__v34.breakBarHTML({weak:{kind:'chrono',key:'time'}, lang:'en', brk:1, brkMax:3, pools:{words:timeWords}});
    window.__v15.clearScope();
    return r; })() `);
  check('scopeBlocked: pool without weakness words blocks, with words does not', sb.blocked === true && sb.open === false, sb);
  check('breakBarHTML (blocked) shows the honest out-of-scope message', sb.barBlocked.indexOf('ngoài phạm vi ôn tập') >= 0, sb.barBlocked);
  check('breakBarHTML (open) shows topic name + 1/3', hasName(sb.barOpen, 'Time & Calendar') && sb.barOpen.indexOf('1/3') >= 0, sb.barOpen);
  // KO: meter hidden without deck, shown with deck
  const koBar = evalIn(ctx, ` (function(){
    var r={};
    try{ S.deck=''; }catch(e){}
    r.hidden=window.__v34.breakBarHTML({weak:{kind:'ko'}, lang:'ko', brk:0, brkMax:3});
    try{ S.deck='d0'; }catch(e){}
    r.shown=window.__v34.breakBarHTML({weak:{kind:'ko'}, lang:'ko', brk:2, brkMax:3});
    r.dmgNoDeck=window.__v34.breakDmg({cur:{k:{id:'k1'}}, lang:'ko', brk:0, brkMax:3, maxHp:300});
    try{ S.deck=''; }catch(e){}
    r.dmgDeckOff=window.__v34.breakDmg({cur:{k:{id:'k1'}}, lang:'ko', brk:0, brkMax:3, maxHp:300});
    try{ S.deck='d0'; }catch(e){}
    r.dmgDeckOn=window.__v34.breakDmg({cur:{k:{id:'k1'}}, lang:'ko', brk:2, brkMax:3, maxHp:300});
    try{ S.deck=''; }catch(e){}
    return r; })() `);
  check('KO bar hidden with no deck, shown (2/3) with deck', koBar.hidden === '' && koBar.shown.indexOf('2/3') >= 0, koBar);
  check('KO breakDmg: no fill without deck, BREAKs at 3/3 with deck (+30)', koBar.dmgDeckOff === 0 && koBar.dmgDeckOn === 30, koBar);
  check('weakFor KO returns kind ko for any boss', evalIn(ctx, `window.__v34.weakFor({id:'v11_fireking',zone:'z1'},'ko').kind==='ko'`));
  // Collection / zone-detail chips render
  const chip = evalIn(ctx, `window.__v34.weakChipHTML({id:'v17_sandwisp',zone:'chrono',diff:'B2'},'en')`);
  check('weakChipHTML (Chrono boss) names the set', hasName(chip, 'Time & Calendar'), chip);
  const collHtml = evalIn(ctx, `window.__v18.collectionHTML()`);
  check('Collection renders weakness chips (all 78 cards)', (collHtml.match(/Điểm yếu:/g) || []).length >= 78, (collHtml.match(/Điểm yếu:/g) || []).length);
  // Live: an unfillable boss shows the honest blocked bar in a real fight.
  const blockedLive = evalIn(ctx, ` (function(){
    var out={};
    try{
      var v19=window.__v19;
      var e=v19._test.en19();
      window.__V19_DATA.bosses.forEach(function(b){ e.bosses[b.id]={en:{win:1,stars:3}}; });
      v19.fight('v11_seadragon');
      var F=v19._test.F();
      if(!F){ out.err='F null (still locked?)'; return out; }
      out.weak=F.weak;
      out.poolSize=(F.pools&&F.pools.words||[]).length;
      out.poolWeak=(F.pools&&F.pools.words||[]).filter(function(w){return window.__v34.weakMatch(w,F.weak)}).length;
      out.bar=window.__v34.breakBarHTML(F);
      out.brk=F.brk;
      v19.close();
    }catch(err){ out.err='throw: '+(err&&err.message); }
    return out; })() `);
  check('live unfillable fight (v11_seadragon): pool has 0 weakness words, bar shows blocked message, brk stays 0',
    blockedLive.weak && blockedLive.weak.key === 'animals' && blockedLive.poolWeak === 0 && (blockedLive.bar || '').indexOf('ngoài phạm vi ôn tập') >= 0 && blockedLive.brk === 0, blockedLive);

  // ---- real V19 fight: BREAK through the live answer() hook ----
  section('§4b', 'Boss Weakness — live V19 fight (BREAK via answer())');
  const fight19 = evalIn(ctx, ` (function(){
    var out={};
    try{
      var v19=window.__v19;
      var wFamily=window.__v15.words.filter(function(w){return (w.a1a2Topics||[]).indexOf('a1_family')>=0})[0];
      out.weakWord=wFamily?{en:wFamily.en, id:wFamily.id}:null;
      if(!wFamily){ out.err='no family word'; return out; }
      v19.fight('v11_fireking');
      var F=v19._test.F();
      if(!F){ out.err='F null after fight()'; return out; }
      out.weak=F.weak; out.hp0=F.hp; out.brk0=F.brk;
      var dist=window.__v15.words.filter(function(w){return w.id!==wFamily.id}).slice(0,3);
      var hpBefore=[];
      for(var hit=1; hit<=3; hit++){
        F=v19._test.F();
        hpBefore.push(F.hp);
        F.cur={w:wFamily, opts:[wFamily].concat(dist), optsVi:[wFamily].concat(dist)};
        var ok=v19._test.pickCorrect();
        F=v19._test.F();
        out['brk'+hit]=F?F.brk:null;
        out['hpAfter'+hit]=F?F.hp:null;
        out['banner'+hit]=F?String(F.banner||''):null;
        if(!ok){ out.err='pickCorrect failed on hit '+hit; return out; }
        if(F && !F.over) v19.next();
      }
      out.hpLost=out.hp0-out.hpAfter3;
      out.over=v19._test.F()?v19._test.F().over:null;
      v19.close();
    }catch(e){ out.err='throw: '+(e&&e.message); }
    return out; })() `);
  check('V19 fight starts: weak=z1 family, brk=0, hp=325', fight19.weak && fight19.weak.kind === 'a1a2' && fight19.weak.key === 'family' && fight19.brk0 === 0 && fight19.hp0 === 325, fight19);
  check('V19 BREAK: brk 1 -> 2 -> 0 across 3 weakness hits', fight19.brk1 === 1 && fight19.brk2 === 2 && fight19.brk3 === 0, fight19);
  check('V19 BREAK: total HP lost >= base 39 + BREAK 33 (=72)', (fight19.hpLost || 0) >= 72, fight19);
  check('V19 BREAK: banner shows BREAK on the 3rd hit', (fight19.banner3 || '').indexOf('BREAK') >= 0, fight19.banner3);

  // ---- real V18 fight: BREAK through the live answer() hook ----
  section('§4c', 'Boss Weakness — live V18 fight (BREAK via answer())');
  const fight18 = evalIn(ctx, ` (function(){
    var out={};
    try{
      var v18=window.__v18;
      var wFood=window.__v15.words.filter(function(w){return (w.a1a2Topics||[]).indexOf('a1_food-and-drinks')>=0})[0];
      out.weakWord=wFood?{en:wFood.en, id:wFood.id}:null;
      if(!wFood){ out.err='no food word'; return out; }
      v18.fight('v10_slime');
      var F=v18._test.F();
      if(!F){ out.err='F null after fight()'; return out; }
      out.weak=F.weak; out.hp0=F.hp; out.brk0=F.brk;
      var dist=window.__v15.words.filter(function(w){return w.id!==wFood.id}).slice(0,3);
      for(var hit=1; hit<=3; hit++){
        F=v18._test.F();
        F.cur={w:wFood, opts:[wFood].concat(dist), optsVi:[wFood].concat(dist)};
        var ok=v18._test.pickCorrect();
        F=v18._test.F();
        out['brk'+hit]=F?F.brk:null;
        out['hpAfter'+hit]=F?F.hp:null;
        out['banner'+hit]=F?String(F.banner||''):null;
        if(!ok){ out.err='pickCorrect failed on hit '+hit; return out; }
        if(F && !F.over) v18.next();
      }
      out.hpLost=out.hp0-out.hpAfter3;
      v18.close();
    }catch(e){ out.err='throw: '+(e&&e.message); }
    return out; })() `);
  check('V18 fight starts: weak=en/A1 food-and-drinks, brk=0, hp=70', fight18.weak && fight18.weak.kind === 'a1a2' && fight18.weak.key === 'food-and-drinks' && fight18.brk0 === 0 && fight18.hp0 === 70, fight18);
  check('V18 BREAK: brk 1 -> 2 -> 0 across 3 weakness hits', fight18.brk1 === 1 && fight18.brk2 === 2 && fight18.brk3 === 0, fight18);
  check('V18 BREAK: total HP lost >= base 48 + BREAK 10 (=58)', (fight18.hpLost || 0) >= 58, fight18);
  check('V18 BREAK: banner shows BREAK on the 3rd hit', (fight18.banner3 || '').indexOf('BREAK') >= 0, fight18.banner3);

  // ================= §5 Smart mid-flight guard =================
  section('§5', 'Smart mid-flight guard (v33 launchSession)');
  const guardNoop = evalIn(ctx, ` (function(){ try{ window.__v27.endEarly(); return 'ok'; }catch(e){ return 'throw: '+e.message; } })() `);
  check('endEarly() is a no-op with no live session (no throw)', guardNoop === 'ok', guardNoop);
  const guardFrag = html.includes("try{if(window.__v27&&__v27.endEarly)__v27.endEarly()}catch(e){}");
  check('launchSession() calls guarded endEarly() before startSession', guardFrag === true);
  // A live Smart session is finished-and-recorded, not silently replaced:
  // drive a 2-word session, end it early via the guard path, check the rec.
  const guardLive = evalIn(ctx, ` (function(){
    var out={};
    try{
      var v27=window.__v27;
      var ids=window.__v15.words.filter(function(w){return (w.lib||[]).indexOf('chrono')>=0}).slice(0,2).map(function(w){return w.id});
      var started=v27.startSession('en', ids.slice(), 'plan');
      out.started=!!started;
      if(!started){ out.err='startSession failed'; return out; }
      v27.endEarly();
      var d=v27.en27();
      out.sessions=(d.sessions||[]).length;
      out.first= (d.sessions||[])[0] ? {lang:d.sessions[0].lang, total:d.sessions[0].total, words:(d.sessions[0].words||[]).length} : null;
    }catch(e){ out.err='throw: '+(e&&e.message); }
    return out; })() `);
  check('live Smart session ended early is recorded (session rec kept)', guardLive.started === true && guardLive.sessions >= 1 && guardLive.first && guardLive.first.lang === 'en', guardLive);

  // ================= summary =================
  console.log(`\nprobe_v34: ${pass} PASS, ${fail} FAIL, ${skip} SKIP`);
  if (fail) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [id, c] of Object.entries(secCounts)) console.log(`  ${id}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('probe crashed:', e); process.exit(2); });
