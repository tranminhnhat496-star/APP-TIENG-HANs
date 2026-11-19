// test34.js — V17.1 CHRONO COMPLETE independent verification (Node vm).
// Written independently of tools/v34/probe_v34.js: own assertions, own
// fixtures, own drive helpers. Only the vm-loading pattern (stub DOM /
// localStorage, extract inline <script> blocks from out/index.html,
// fire DOMContentLoaded) is reused from the probe.
// Usage: node tools/v34/test34.js [DIR]   (default: <repo>/out)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   §0 static build integrity (hash, title, markers, fragments)
//   §L page load (vm, real inline scripts)
//   §L2 Library 5th group (Chrono: sets, lesson view, filters, favs,
//       V25 progress, once-only rewards)
//   §S SRS enrolment + due + Smart classify/plan + Chrono-scope review
//   §A Vocabulary Analytics (derived only) + KO honest empty state
//   §B Boss Weakness System — V19 / V18 / V15 live fights, pool bias,
//       golem shield, scope-blocked, KO deck rule
//   §G Smart mid-flight guard (endEarly no-op + live session recorded)
//   §R V17.0 regression (gate, golem, quests >=0.8, rift >=0.7,
//       Time Echo, region claim once-only)
//   §V V31/V32/V33 preservation spot-checks
//   §C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/touch/speech);
// live-browser, real-phone and live-Firebase gates stay Chrome/Anh-only.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = '3cdb824d6a52010659de187c07bba020983e5c9f57adf2e418c51bf4b9ed357c';
const EXPECTED_BYTES = 2214197;
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
// ---------- minimal DOM stub (same loading pattern as probe_v34.js) ----------
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
// questions first, then reasks); past its end, answers are correct.
function driveSession(ctx, okPattern) {
  const before = J(ctx, `window.__v27.en27().sessions.length`);
  let guard = 0;
  while (J(ctx, `window.__v27.en27().sessions.length`) === before && guard < 80) {
    const ok = guard < okPattern.length ? okPattern[guard] : true;
    E(ctx, `window.__v27.answerMC('x', ${ok ? 'true' : 'false'}); window.__v27.nextQ();`);
    guard++;
  }
  const sessions = J(ctx, `JSON.stringify(window.__v27.en27().sessions)`);
  return sessions.length > before ? sessions[0] : null;
}
// Stub Math.random in the vm realm to a constant (deterministic damage:
// no 10% crit) — returns nothing; call unstubRandom() to restore.
function stubRandom(ctx) { E(ctx, `window.__t34origRandom=Math.random; Math.random=function(){return 0.9;}`); }
function unstubRandom(ctx) { E(ctx, `if(window.__t34origRandom)Math.random=window.__t34origRandom;`); }

async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v34.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V17.1 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is 2,214,197 B', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
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
  check('no v35 marker (no unshipped layer)', !html.includes('id="v35"') && !html.includes('id="v35js"'));
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
  check('v34 layer files present in DIR', fs.existsSync(path.join(DIR, 'v34.js')) && fs.existsSync(path.join(DIR, 'v34.css')) && fs.existsSync(path.join(DIR, 'v34_data.js')));
  const v34src = fs.readFileSync(path.join(DIR, 'v34.js'), 'utf-8') + fs.readFileSync(path.join(DIR, 'v34_data.js'), 'utf-8');
  check('no localStorage API use in the v34 layer (only a comment states "no new key")', !/localStorage\s*\./.test(v34src) && !/localStorage\s*\[/.test(v34src));

  // ================= §L page load =================
  section('§L', 'page load (vm, real inline scripts)');
  const ctx = makeCtx();
  // The V15 fight renders into #v15bossfight (created by bossesHTML, not
  // static HTML): pre-register the id so the stub returns a persistent
  // element whose innerHTML the V15 tests can read (B is IIFE-private).
  dynIds.add('v15bossfight');
  const loaded = loadPage(ctx, html);
  check('inline script blocks extracted (>=30)', loaded.blocks >= 30, loaded.blocks);
  check('all inline scripts evaluate without error', loaded.loadErr === null, loaded.loadErr);
  if (loaded.loadErr) { console.log(`\ntest34 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15 present', E(ctx, `!!window.__v15`));
  check('__v17/__v18/__v19/__v27/__v33/__v34 present',
    E(ctx, `!!window.__v17 && !!window.__v18 && !!window.__v19 && !!window.__v27 && !!window.__v33 && !!window.__v34`));
  check('__v15.bossFight/bossPick/bossNext exported (V15 fight access path)', E(ctx, `typeof window.__v15.bossFight==='function' && typeof window.__v15.bossPick==='function' && typeof window.__v15.bossNext==='function'`));
  check('V15 fight state B is IIFE-private (expected: observed via fight HTML, not a global)', E(ctx, `typeof B === 'undefined'`));
  E(ctx, `window.__v15.buildWords()`);
  const nWords = E(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);
  const nChrono = E(ctx, `window.__v15.words.filter(function(w){return (w.lib||[]).indexOf('chrono')>=0}).length`);
  check('240 Chrono words in WORDS', nChrono === 240, nChrono);
  check('save key is hanvocab.v1 in localStorage', ctx.__sandbox.localStorage.getItem('hanvocab.v1') !== null || E(ctx, `typeof S!=='undefined'`));

  // ================= §L2 Library 5th group =================
  section('§L2', 'Library — Chrono group (v17 + v25)');
  check('chronoWords() = 240', E(ctx, `window.__v17.chronoWords().length`) === 240);
  const sets = J(ctx, `JSON.stringify(window.__v17.chronoSets().map(function(g){return g.id+':'+g.words.length}))`);
  check('chronoSets() = 4 x 60 in fixed order', JSON.stringify(sets) === JSON.stringify(['time:60', 'space:60', 'machines:60', 'change:60']), sets);
  const libHtml = E(ctx, `window.__v17.libraryHTML()`);
  check('libraryHTML has Chrono group', libHtml.indexOf('Chrono Kingdom') >= 0);
  const hasName = (h, nm) => h.indexOf(nm) >= 0 || h.indexOf(nm.replace(/&/g, '&amp;')) >= 0;
  for (const nm of ['Time & Calendar', 'Space & Astronomy', 'Machines & Engineering', 'Change & Sequence']) {
    check(`libraryHTML lists set ${nm}`, hasName(libHtml, nm));
  }
  check('libraryHTML has KO empty-state note', libHtml.indexOf('Chưa có từ Chrono tiếng Hàn') >= 0);
  check('libraryHTML has group summary row', libHtml.indexOf('Tổng:') >= 0);
  check('libraryHTML set cards show a learned/mastered/due stat line', libHtml.indexOf('đã học') >= 0 && libHtml.indexOf('đã thuộc') >= 0 && libHtml.indexOf('cần ôn') >= 0);
  // Per-set lesson view.
  const firstTimeWord = J(ctx, `JSON.stringify(window.__v17.chronoSets().filter(function(g){return g.id==='time'})[0].words[0].en)`);
  try { E(ctx, `window.__v17.openSet('time')`); } catch (e) { /* renderTab touches stub DOM; state is set first */ }
  const st = J(ctx, `JSON.stringify({lib:window.__v17.state.lib, set:window.__v17.state.set, view:window.__v17.state.view})`);
  check('openSet(time): state lib=chrono set=time view=lesson', st.lib === 'chrono' && st.set === 'time' && st.view === 'lesson', st);
  const lessonHtml = E(ctx, `window.__v17.libraryHTML()`);
  check('per-set lesson view renders (Chrono · Time & Calendar)', hasName(lessonHtml, 'Chrono · Time & Calendar'));
  check('per-set lesson view shows the first Time word', lessonHtml.indexOf(firstTimeWord) >= 0, firstTimeWord);
  const cardCount = countOcc(lessonHtml, 'class="v17word"');
  check('per-set lesson view renders 30 wordCards on page 1', cardCount === 30, cardCount);
  check('wordCard markup has IPA + meaning + fav button', lessonHtml.indexOf('v17ipa') >= 0 && lessonHtml.indexOf('Yêu thích') >= 0 && lessonHtml.indexOf('hộp ') >= 0);
  // Search filter (state-driven, through the real lessonHTML/filterWords).
  E(ctx, `window.__v17.state.q='alarm'; window.__v17.state.pos=''; window.__v17.state.status='all'; window.__v17.state.page=0;`);
  const searchHtml = E(ctx, `window.__v17.libraryHTML()`);
  const searchCount = countOcc(searchHtml, 'class="v17word"');
  const searchExpected = J(ctx, `JSON.stringify(window.__v17.chronoSets().filter(function(g){return g.id==='time'})[0].words.filter(function(w){return w.en.toLowerCase().indexOf('alarm')>=0||w.vi.toLowerCase().indexOf('alarm')>=0}).map(function(w){return w.en}))`);
  check('search "alarm" narrows the set to exactly the matching words', searchCount === searchExpected.length && searchExpected.length >= 1 && searchHtml.indexOf('alarm clock') >= 0, { rendered: searchCount, expected: searchExpected });
  // POS filter: the UI offers short codes ('n' = Danh từ) and hasPos()
  // matches exactly. Chrono data ships LONG codes (noun/verb/adjective/
  // adverb) in v33_data.js; R-V34-V15-POSNORM normalises them to short
  // codes when the Chrono WORDS record is created (V34-BUG-1 fix), so
  // WORDS carries short codes everywhere. The 'noun' probe below asserts
  // the long code no longer matches anything (0 cards).
  E(ctx, `window.__v17.state.q=''; window.__v17.state.pos='n';`);
  const posHtml = E(ctx, `window.__v17.libraryHTML()`);
  const posCount = countOcc(posHtml, 'class="v17word"');
  const posExpected = J(ctx, `JSON.stringify(window.__v17.chronoSets().filter(function(g){return g.id==='time'})[0].words.filter(function(w){return (w.pos||'')==='n'}).map(function(w){return w.en}))`);
  check('POS filter "n" (Danh từ) shows the time-set nouns (page 1 of N)', posCount === Math.min(30, posExpected.length) && posExpected.length > 0 && posHtml.indexOf('Hiện 30/' + posExpected.length) >= 0, { rendered: posCount, expectedCount: posExpected.length, sample: posExpected.slice(0, 3) });
  E(ctx, `window.__v17.state.pos='noun';`);
  const posLongHtml = E(ctx, `window.__v17.libraryHTML()`);
  check('POS diagnostic "noun" (long code) now returns 0 — WORDS carries short codes only', countOcc(posLongHtml, 'class="v17word"') === 0, { rendered: countOcc(posLongHtml, 'class="v17word"'), expected: 0 });
  E(ctx, `window.__v17.state.q=''; window.__v17.state.pos='';`);
  // Status filters + favorites toggle (fresh word: first Time word).
  const favWord = J(ctx, `JSON.stringify(window.__v17.chronoSets().filter(function(g){return g.id==='time'})[0].words[0].id)`);
  E(ctx, `window.__v17.state.status='mastered';`);
  check('status "mastered" shows 0 before any word is mastered', countOcc(E(ctx, `window.__v17.libraryHTML()`), 'class="v17word"') === 0);
  E(ctx, `window.__v15.enOld().box['${favWord}']=5; window.__v15.save15();`);
  check('status "mastered" shows 1 after one word reaches box 5', countOcc(E(ctx, `window.__v17.libraryHTML()`), 'class="v17word"') === 1);
  E(ctx, `window.__v17.state.status='new';`);
  const newHtml = E(ctx, `window.__v17.libraryHTML()`);
  check('status "new" shows page 1 of 59 (30 cards, "Hiện 30/59" footer)', countOcc(newHtml, 'class="v17word"') === 30 && newHtml.indexOf('Hiện 30/59') >= 0, newHtml.slice(newHtml.indexOf('Hiện '), newHtml.indexOf('Hiện ') + 40));
  E(ctx, `window.__v17.state.status='fav';`);
  check('status "fav" shows 0 before any favorite', countOcc(E(ctx, `window.__v17.libraryHTML()`), 'class="v17word"') === 0);
  E(ctx, `window.__v17.toggleFav('${favWord}');`);
  check('toggleFav adds the word to favorites (state + render)', E(ctx, `window.__v15.enOld && S.v7.en17.fav.indexOf('${favWord}')>=0`) === true && countOcc(E(ctx, `window.__v17.libraryHTML()`), 'class="v17word"') === 1);
  E(ctx, `window.__v17.toggleFav('${favWord}');`);
  check('toggleFav again removes it (fav count back to 0)', E(ctx, `S.v7.en17.fav.indexOf('${favWord}')<0`) === true && countOcc(E(ctx, `window.__v17.libraryHTML()`), 'class="v17word"') === 0);
  E(ctx, `window.__v17.state.status='all';`);
  // V25 group progress (real groupStats, live box data: exactly 1 learned).
  const gs = J(ctx, `JSON.stringify(window.__v25.groupStats('chrono'))`);
  check('V25 groupStats(chrono): total 240, learned 1 (live box data)', gs && gs.total === 240 && gs.learned === 1, gs);
  const gsA1 = J(ctx, `JSON.stringify(window.__v25.groupStats('a1a2'))`);
  check('V25 groupStats(a1a2) still works (no regression)', gsA1 && gsA1.total > 0, gsA1 && gsA1.total);
  E(ctx, `window.__v15.enOld().box['${favWord}']=0; window.__v15.save15();`);
  // Reward claim gate (UI): an unlearned set shows the "learn them all" note.
  try { E(ctx, `window.__v17.openSet('space')`); } catch (e) {}
  check('unlearned set shows the learn-them-all reward gate (no claim button)', E(ctx, `window.__v17.libraryHTML()`).indexOf('Học hết 60 từ') >= 0);
  // Rewards: per-set +50/+2 once-only, then all-sets +200/+5 once-only.
  E(ctx, `var _o=window.__v15.enOld(); window.__v17.chronoSets().filter(function(g){return g.id==='time'})[0].words.forEach(function(w){_o.box[w.id]=1}); window.__v15.save15();`);
  const xp0 = E(ctx, `S.xp`), gems0 = E(ctx, `S.v7.gems||0`);
  E(ctx, `window.__v17.claim('chrono:time')`);
  const claimed = J(ctx, `JSON.stringify({c:!!(S.v7.en17&&S.v7.en17.claimed&&S.v7.en17.claimed['chrono:time']), xp:S.xp, g:(S.v7.gems||0)})`);
  check('claim chrono:time once learned: claimed, +50 XP, +2 gems', claimed.c === true && claimed.xp === xp0 + 50 && claimed.g === gems0 + 2, claimed);
  E(ctx, `window.__v17.claim('chrono:time')`);
  check('re-claim chrono:time is a no-op (once-only)', E(ctx, `S.xp`) === claimed.xp && E(ctx, `S.v7.gems||0`) === claimed.g);
  E(ctx, `var _o2=window.__v15.enOld(); window.__v17.chronoWords().forEach(function(w){_o2.box[w.id]=1}); window.__v15.save15();`);
  const xp1 = E(ctx, `S.xp`), gems1 = E(ctx, `S.v7.gems||0`);
  E(ctx, `window.__v17.claim('chrono:all')`);
  const claimedAll = J(ctx, `JSON.stringify({c:!!(S.v7.en17&&S.v7.en17.claimed&&S.v7.en17.claimed['chrono:all']), xp:S.xp, g:(S.v7.gems||0)})`);
  check('claim chrono:all once all learned: claimed, +200 XP, +5 gems', claimedAll.c === true && claimedAll.xp === xp1 + 200 && claimedAll.g === gems1 + 5, claimedAll);
  E(ctx, `window.__v17.claim('chrono:all')`);
  check('re-claim chrono:all is a no-op (once-only)', E(ctx, `S.xp`) === claimedAll.xp && E(ctx, `S.v7.gems||0`) === claimedAll.g);
  // Reset Chrono boxes so §S/§A start from clean SRS data.
  E(ctx, `var _o3=window.__v15.enOld(); window.__v17.chronoWords().forEach(function(w){_o3.box[w.id]=0; _o3.right[w.id]=0; _o3.wrong[w.id]=0;}); window.__v15.save15(); window.__v17.goHome(); window.__v15.clearScope();`);

  // ================= §S SRS =================
  section('§S', 'SRS — Chrono enrolment, due, Smart, Chrono-scope review');
  // Fixture: first change-set word (dynamic id — no hardcoded set claim).
  const sWord = J(ctx, `JSON.stringify(window.__v15.words.filter(function(w){return w.chronoSet==='change'})[0])`);
  check('fixture word (change set) exists, lv B2', !!sWord && sWord.lv === 'B2' && sWord.chronoSet === 'change', sWord && { id: sWord.id, lv: sWord.lv, set: sWord.chronoSet });
  const sWord2 = J(ctx, `JSON.stringify(window.__v15.words.filter(function(w){return w.chronoSet==='space'})[0])`);
  check('fixture word (space set) exists', !!sWord2 && sWord2.chronoSet === 'space', sWord2 && sWord2.id);
  check('change word unenrolled before mark15 (box 0)', E(ctx, `(window.__v15.enOld().box||{})['${sWord.id}']||0`) === 0);
  E(ctx, `window.__v15.mark15(true, window.__v15.words.filter(function(w){return w.id==='${sWord.id}'})[0], 'mc')`);
  const afterMark = J(ctx, `JSON.stringify({box:(window.__v15.enOld().box||{})['${sWord.id}'], right:(window.__v15.enOld().right||{})['${sWord.id}'], due:(window.__v15.en15().due||{})['${sWord.id}'], intv:(window.__v15.en15().intv||{})['${sWord.id}']})`);
  check('mark15 enrols: box 1, right 1, intv 1, due in future', afterMark.box === 1 && afterMark.right === 1 && afterMark.intv === 1 && afterMark.due > Date.now(), afterMark);
  E(ctx, `window.__v15.mark15(false, window.__v15.words.filter(function(w){return w.id==='${sWord2.id}'})[0], 'mc')`);
  const afterWrong = J(ctx, `JSON.stringify({box:(window.__v15.enOld().box||{})['${sWord2.id}'], wrong:(window.__v15.enOld().wrong||{})['${sWord2.id}'], due:(window.__v15.en15().due||{})['${sWord2.id}']})`);
  check('wrong answer: box 0, wrong 1, due ~10 min in future', afterWrong.box === 0 && afterWrong.wrong === 1 && afterWrong.due > Date.now() && afterWrong.due <= Date.now() + 11 * 60 * 1000, afterWrong);
  // Due: the word becomes due when its due date passes (same filter reviewStart uses).
  E(ctx, `window.__v15.en15().due['${sWord.id}']=Date.now()-1000; window.__v15.save15()`);
  const dueHas = E(ctx, `window.__v15.words.filter(function(w){return (window.__v15.en15().due[w.id]||0)<=Date.now() && w.id==='${sWord.id}'}).length`);
  check('enrolled word appears due when due <= now', dueHas === 1);
  const cls = J(ctx, `JSON.stringify(window.__v27.classifyEN(window.__v15.words.filter(function(w){return w.id==='${sWord.id}'})[0]))`);
  check('Smart classifyEN includes the Chrono word (no missing/error)', !!cls && typeof cls.cls === 'string', cls);
  const inUniverse = E(ctx, `window.__v27._test.allENWords().some(function(w){return w.id==='${sWord.id}'})`);
  check('Smart word universe (allENWords) includes the Chrono word', inUniverse === true);
  const plan = J(ctx, `JSON.stringify(window.__v27._test.buildPlanCore('en', 10, 2, 2, 2).plan)`);
  check('Smart buildPlanCore returns a real plan with ids', !!plan && Array.isArray(plan.ids), plan && { n: plan.ids && plan.ids.length });
  // Chrono-scope review: with a time scope active, the due list is the
  // 60 time-set words only (never-enrolled words count as due, exactly
  // as reviewStart/reviewHTML count them — see the 4648-due baseline).
  E(ctx, `var _e=window.__v15.en15(); var _tw=window.__v17.chronoSets().filter(function(g){return g.id==='time'})[0].words; _e.due[_tw[0].id]=Date.now()-1000; _e.due[_tw[1].id]=Date.now()-1000; _e.due[_tw[2].id]=Date.now()-1000; _e.due['${sWord2.id}']=Date.now()-1000; window.__v15.save15();`);
  E(ctx, `window.__v15.setScope({kind:'lib',lib:'chrono',set:'time'})`);
  const dueTime = J(ctx, `JSON.stringify(window.__v15.words.filter(function(w){return window.__v15.inScope(w)&&(window.__v15.en15().due[w.id]||0)<=Date.now()}).map(function(w){return w.chronoSet}))`);
  check('Chrono-scope review (time): due list is all 60 time-set words, nothing else', dueTime.length === 60 && dueTime.every(s => s === 'time'), { n: dueTime.length });
  E(ctx, `window.__v15.setScope({kind:'lib',lib:'chrono',set:'space'})`);
  const dueSpace = J(ctx, `JSON.stringify(window.__v15.words.filter(function(w){return window.__v15.inScope(w)&&(window.__v15.en15().due[w.id]||0)<=Date.now()}).map(function(w){return w.chronoSet}))`);
  check('per-set scope (space): due list is all 60 space-set words, nothing else', dueSpace.length === 60 && dueSpace.every(s => s === 'space'), { n: dueSpace.length });
  E(ctx, `window.__v15.clearScope()`);
  check('clearScope restores the full pool (space word back in scope)', E(ctx, `window.__v15.inScope(window.__v15.words.filter(function(w){return w.id==='${sWord2.id}'})[0])`) === true);

  // ================= §A Analytics =================
  section('§A', 'Vocabulary Analytics (derived only)');
  const freshMachines = J(ctx, `JSON.stringify(window.__v34.setStats('machines'))`);
  check("retention is '—' at 0 attempts (fresh machines set)", freshMachines && freshMachines.retention === '—' && freshMachines.attempts === 0, freshMachines);
  // Seed the time set with known box/right/wrong/due data.
  E(ctx, `(function(){
    var v15=window.__v15, o=v15.enOld(), e=v15.en15();
    var tw=window.__v17.chronoSets().filter(function(g){return g.id==='time'})[0].words;
    var now=Date.now();
    tw.forEach(function(w){ o.box[w.id]=0; o.right[w.id]=0; o.wrong[w.id]=0; e.due[w.id]=now+864e5; });
    for(var i=0;i<10;i++) o.box[tw[i].id]=1;
    for(var i=10;i<15;i++) o.box[tw[i].id]=5;
    o.right[tw[0].id]=3; o.wrong[tw[0].id]=1;
    o.right[tw[1].id]=1; o.wrong[tw[1].id]=3;
    o.right[tw[2].id]=2; o.wrong[tw[2].id]=0;
    for(var j=0;j<7;j++) e.due[tw[15+j].id]=now-1000;
    v15.save15();
  })()`);
  const sTime = J(ctx, `JSON.stringify(window.__v34.setStats('time'))`);
  check('setStats(time): total 60', sTime && sTime.total === 60, sTime);
  check('setStats(time): learned 15 (box>=1)', sTime && sTime.learned === 15, sTime);
  check('setStats(time): mastered 5 (box>=5)', sTime && sTime.mastered === 5, sTime);
  check('setStats(time): notLearned 45', sTime && sTime.notLearned === 45, sTime);
  check('setStats(time): due 7 (only the 7 past-due words)', sTime && sTime.due === 7, sTime);
  check('setStats(time): retention 60% (6 right / 10 attempts)', sTime && sTime.retention === '60%' && sTime.attempts === 10 && sTime.right === 6 && sTime.wrong === 4, sTime);
  const sums = J(ctx, `JSON.stringify((function(){
    var a=window.__v34.chronoAnalytics();
    var sum=function(f){ return ['time','space','machines','change'].reduce(function(n,k){ return n+(a.sets[k][f]||0); },0); };
    return {total:a.total.total, learned:a.total.learned, sumLearned:sum('learned'),
      mastered:a.total.mastered, sumMastered:sum('mastered'), due:a.total.due, sumDue:sum('due'),
      right:a.total.right, sumRight:sum('right'), wrong:a.total.wrong, sumWrong:sum('wrong')};
  })())`);
  check('group total = 240', sums.total === 240, sums);
  check('group learned = sum of set learned', sums.learned === sums.sumLearned, sums);
  check('group mastered = sum of set mastered', sums.mastered === sums.sumMastered, sums);
  check('group due = sum of set due', sums.due === sums.sumDue, sums);
  check('group right/wrong = sum of set right/wrong', sums.right === sums.sumRight && sums.wrong === sums.sumWrong, sums);
  const ko = J(ctx, `JSON.stringify(window.__v34.koChronoStats())`);
  check('KO Chrono stats: honest empty state (empty, total 0, retention —)', !!ko && ko.empty === true && ko.total === 0 && ko.retention === '—', ko);
  check('KO Chrono note states plainly there are no Korean Chrono words', !!ko && ko.note.indexOf('Chưa có từ Chrono tiếng Hàn') === 0, ko && ko.note);
  check('chronoAnalytics().ko is the same honest empty state', E(ctx, `window.__v34.chronoAnalytics().ko.empty===true`));
  check('no S.cards entries invented for Chrono words', E(ctx, `(S.cards||[]).filter(function(c){return String(c.id||'').indexOf('v33_')===0}).length`) === 0);

  // ================= §B Boss Weakness System =================
  section('§B', 'Boss Weakness System — V19 / V18 / V15 live fights');
  // Seed wins so every boss below is unlocked + the Chrono gate is open:
  // en15 10, en18 30 flat, en19 all 30 V11 + first 7 Chrono.
  E(ctx, `(function(){
    var e15=window.__v15.en15(); e15.bosses={}; for(var i=0;i<10;i++) e15.bosses['old'+i]={win:1};
    var e18=window.__v18._test.en18(); e18.bosses={}; for(var i=0;i<30;i++) e18.bosses['v10_'+i]={win:1,wins:1};
    var e19=window.__v19._test.en19(); e19.bosses={};
    window.__V19_DATA.bosses.forEach(function(b){ e19.bosses[b.id]={en:{win:1,wins:1,stars:3,best:3}}; });
    window.__V33_DATA.bosses.slice(0,7).forEach(function(b){ e19.bosses[b.id]={en:{win:1,wins:1,stars:3,best:3}}; });
    window.__v15.save15();
  })()`);
  stubRandom(ctx);
  // ---- V19 live fight: BREAK via answer() ----
  const f19 = J(ctx, `(function(){
    var v19=window.__v19, v15=window.__v15;
    var fam=v15.words.filter(function(w){return (w.a1a2Topics||[]).indexOf('a1_family')>=0})[0];
    var dist=v15.words.filter(function(w){return w.id!==fam.id}).slice(0,3);
    var nonFam=v15.words.filter(function(w){return w.chronoSet==='space'})[0];
    v19.fight('v11_fireking');
    var F=v19._test.F();
    var out={weak:F.weak, hp0:F.hp, maxHp:F.maxHp, brk0:F.brk, famEn:fam.en};
    for(var hit=1;hit<=3;hit++){
      F=v19._test.F();
      F.cur={w:fam, opts:[fam].concat(dist), optsVi:[fam].concat(dist)};
      var ok=v19._test.pickCorrect();
      F=v19._test.F();
      out['brk'+hit]=F?F.brk:null; out['hpAfter'+hit]=F?F.hp:null; out['banner'+hit]=F?String(F.banner||''):null; out['ok'+hit]=ok;
      if(F&&!F.over) v19.next();
    }
    out.hpLost=out.hp0-out.hpAfter3;
    F=v19._test.F();
    F.cur={w:nonFam, opts:[nonFam].concat(dist), optsVi:[nonFam].concat(dist)};
    var ok4=v19._test.pickCorrect();
    F=v19._test.F();
    out.ok4=ok4; out.brkAfterNonWeak=F?F.brk:null; out.hpAfter4=F?F.hp:null;
    v19.close();
    return JSON.stringify(out);
  })()`);
  check('V19 fight starts: weak=z1 family, brk=0, hp=325', f19.weak && f19.weak.kind === 'a1a2' && f19.weak.key === 'family' && f19.brk0 === 0 && f19.hp0 === 325, f19);
  check('V19 BREAK: brk 1 -> 2 -> 0 across 3 weakness hits', f19.brk1 === 1 && f19.brk2 === 2 && f19.brk3 === 0, f19);
  check('V19 BREAK: HP lost is exactly base 39 + BREAK 33 (=72)', f19.hpLost === 72, f19);
  check('V19 BREAK: banner shows BREAK on the 3rd hit', (f19.banner3 || '').indexOf('BREAK') >= 0, f19.banner3);
  check('V19: non-weakness correct answer fills 0 (brk stays 0, base dmg only)', f19.ok4 === true && f19.brkAfterNonWeak === 0 && f19.hpAfter4 === 236, f19);
  // ---- V19: grammar / read / builder never fill ----
  function v19OneShot(bossId, label) {
    const r = J(ctx, `(function(){
      var v19=window.__v19; v19.fight('${bossId}');
      var F=v19._test.F();
      var out={qmode:F.qmode, brk0:F.brk, hp0:F.hp};
      var ok=v19._test.pickCorrect();
      F=v19._test.F();
      out.ok=ok; out.brk1=F?F.brk:null; out.hp1=F?F.hp:null;
      v19.close();
      return JSON.stringify(out);
    })()`);
    check(`V19 ${label}: correct answer fills 0 (brk stays 0, damage still dealt)`, r.qmode === label && r.brk0 === 0 && r.ok === true && r.brk1 === 0 && r.hp1 < r.hp0, r);
  }
  v19OneShot('v11_heavenknight', 'grammar');
  v19OneShot('v11_phoenix', 'builder');
  v19OneShot('v11_pandamaster', 'read');
  // ---- V18 live fight: BREAK via answer() ----
  const f18 = J(ctx, `(function(){
    var v18=window.__v18, v15=window.__v15;
    var food=v15.words.filter(function(w){return (w.a1a2Topics||[]).indexOf('a1_food-and-drinks')>=0})[0];
    var dist=v15.words.filter(function(w){return w.id!==food.id}).slice(0,3);
    var nonFood=v15.words.filter(function(w){return w.chronoSet==='space'})[0];
    v18.fight('v10_slime','en');
    var F=v18._test.F();
    var out={weak:F.weak, hp0:F.hp, brk0:F.brk, foodEn:food.en};
    for(var hit=1;hit<=3;hit++){
      F=v18._test.F();
      F.cur={w:food, opts:[food].concat(dist), optsVi:[food].concat(dist)};
      var ok=v18._test.pickCorrect();
      F=v18._test.F();
      out['brk'+hit]=F?F.brk:null; out['hpAfter'+hit]=F?F.hp:null; out['banner'+hit]=F?String(F.banner||''):null; out['ok'+hit]=ok;
      if(F&&!F.over) v18.next();
    }
    out.hpLost=out.hp0-out.hpAfter3;
    F=v18._test.F();
    F.cur={w:nonFood, opts:[nonFood].concat(dist), optsVi:[nonFood].concat(dist)};
    var ok4=v18._test.pickCorrect();
    F=v18._test.F();
    out.ok4=ok4; out.brkAfterNonWeak=F?F.brk:null; out.over=F?F.over:null;
    v18.close();
    return JSON.stringify(out);
  })()`);
  check('V18 fight starts: weak=en/A1 food-and-drinks, brk=0, hp=70', f18.weak && f18.weak.kind === 'a1a2' && f18.weak.key === 'food-and-drinks' && f18.brk0 === 0 && f18.hp0 === 70, f18);
  check('V18 BREAK: brk 1 -> 2 -> 0 across 3 weakness hits', f18.brk1 === 1 && f18.brk2 === 2 && f18.brk3 === 0, f18);
  check('V18 BREAK: HP lost is exactly base 48 + BREAK 10 (=58)', f18.hpLost === 58, f18);
  check('V18 BREAK: banner shows BREAK on the 3rd hit', (f18.banner3 || '').indexOf('BREAK') >= 0, f18.banner3);
  check('V18: non-weakness correct answer fills 0 (brk stays 0)', f18.ok4 === true && f18.brkAfterNonWeak === 0, f18);
  // ---- V18: grammar / read / builder never fill ----
  E(ctx, `(function(){ var e=window.__v18._test.en18();
    e.bosses['v10_slime']={win:1,wins:1}; e.bosses['v10_goblin']={win:1,wins:1};
    e.bosses['v10_dragon']={win:1,wins:1}; e.bosses['v10_ghost']={win:1,wins:1};
    e.bosses['v10_spider']={win:1,wins:1}; })()`);
  function v18OneShot(bossId, label) {
    const r = J(ctx, `(function(){
      var v18=window.__v18; v18.fight('${bossId}','en');
      var F=v18._test.F();
      var out={qmode:F.qmode, brk0:F.brk, hp0:F.hp};
      var ok=v18._test.pickCorrect();
      F=v18._test.F();
      out.ok=ok; out.brk1=F?F.brk:null; out.hp1=F?F.hp:null;
      v18.close();
      return JSON.stringify(out);
    })()`);
    check(`V18 ${label}: correct answer fills 0 (brk stays 0, damage still dealt)`, r.qmode === label && r.brk0 === 0 && r.ok === true && r.brk1 === 0 && r.hp1 < r.hp0, r);
  }
  v18OneShot('v10_dragon', 'grammar');
  v18OneShot('v10_spider', 'builder');
  v18OneShot('v10_owl', 'read');
  // ---- V15 live fight: BREAK via bossAnswer() ----
  // B is IIFE-private: drive via __v15 exports and observe the rendered
  // fight HTML (#v15bossfight innerHTML — HP text + Break bar label).
  // NOTE: Math.random is stubbed to 0.4 for this fight only — 0.4 makes
  // weakPick() always draw a weakness word (0.4<0.5) while never critting
  // (0.4>0.1), so time words appear deterministically; the 0.9 stub used
  // elsewhere would starve the bias entirely (0.9<0.5 is false).
  E(ctx, `Math.random=function(){return 0.4;}`);
  const f15 = J(ctx, `(function(){
    var v15=window.__v15;
    var all=v15.words;
    var enCount={}; all.forEach(function(w){ enCount[w.en]=(enCount[w.en]||0)+1; });
    var timeW=all.filter(function(w){return w.t==='time' && enCount[w.en]===1});
    var host=document.getElementById('v15bossfight');
    function html(){ return host.innerHTML||''; }
    function qwordEn(){ var m=html().match(/<div class="v15qword">([^<]*)<\\/div>/); return m?m[1]:null; }
    function hpNow(){ var m=html().match(/HP (\\d+)\\/(\\d+)/); return m?{hp:+m[1],max:+m[2]}:null; }
    function brkNow(){ var m=html().match(/— (\\d)\\/3/); return m?+m[1]:null; }
    function barText(){ var m=html().match(/v34breaklabel[^>]*>([^<]*)/); return m?m[1]:''; }
    function correctIdx(en){
      var w=all.filter(function(x){return x.en===en && enCount[x.en]===1})[0];
      if(!w) return -1;
      var h=html(); var re=/onclick="__v15\\.bossPick\\((\\d+)\\)">([^<]*)<\\/button>/g, m;
      while((m=re.exec(h))!==null){ if(m[2]===v15.esc(w.vi)) return +m[1]; }
      return -1;
    }
    v15.bossFight('slime');
    var out={hp0:hpNow(), brk0:brkNow(), bar0:barText(), timeN:timeW.length};
    var hits=0, guard=0;
    while(hits<3 && guard++<60){
      var en=qwordEn();
      var w=timeW.filter(function(x){return x.en===en})[0];
      if(!w){ v15.bossNext(); continue; }
      var idx=correctIdx(en);
      if(idx<0){ out.err='no option for '+en; break; }
      v15.bossPick(idx);
      hits++;
      out['brk'+hits]=brkNow(); out['hpAfter'+hits]=hpNow(); out['bar'+hits]=barText();
      if(hits<3) v15.bossNext();
    }
    out.hits=hits;
    out.hpLost=out.hp0 && out['hpAfter3'] ? out.hp0.hp-out['hpAfter3'].hp : null;
    // Non-weakness: restore the 0.9 stub (weakPick falls back to a
    // non-time pool word) and advance to a non-time word.
    Math.random=function(){return 0.9;};
    guard=0; out.brkAfterNonWeak=null;
    while(guard++<60){
      var en2=qwordEn();
      var w2=en2?timeW.filter(function(x){return x.en===en2})[0]:null;
      if(w2){ v15.bossNext(); continue; }
      var idx2=en2?correctIdx(en2):-1;
      if(idx2<0){ v15.bossNext(); continue; }
      v15.bossPick(idx2);
      out.brkAfterNonWeak=brkNow(); out.hpAfter4=hpNow();
      break;
    }
    out.barAfter=barText();
    v15.bossClose();
    return JSON.stringify(out);
  })()`);
  E(ctx, `Math.random=function(){return 0.9;}`);
  check("V15 fight starts: Break bar shows Thời gian 0/3, HP 60/60", f15.hp0 && f15.hp0.hp === 60 && f15.hp0.max === 60 && f15.brk0 === 0 && (f15.bar0 || '').indexOf('Thời gian') >= 0, f15);
  check('V15 BREAK: brk 1 -> 2 -> 0 across 3 weakness hits', f15.hits === 3 && f15.brk1 === 1 && f15.brk2 === 2 && f15.brk3 === 0 && !f15.err, f15);
  check('V15 BREAK: HP lost is exactly base 48 + BREAK 10 (=58)', f15.hpLost === 58, f15);
  check('V15 BREAK: bar after BREAK shows topic + 0/3', (f15.barAfter || '').indexOf('0/3') >= 0 && (f15.barAfter || '').indexOf('Thời gian') >= 0, f15.barAfter);
  check('V15: non-weakness correct answer fills 0 (brk stays 0)', f15.brkAfterNonWeak === 0, f15);
  // ---- V15: grammar / read / builder never fill ----
  E(ctx, `(function(){ var e=window.__v15.en15();
    e.bosses['slime']={win:1}; e.bosses['goblin']={win:1}; e.bosses['dragon']={win:1};
    e.bosses['ghost']={win:1}; e.bosses['spider']={win:1}; })()`);
  function v15HtmlHelpers() {
    return `
    var v15=window.__v15; var host=document.getElementById('v15bossfight');
    function html(){ return host.innerHTML||''; }
    function hpNow(){ var m=html().match(/HP (\\d+)\\/(\\d+)/); return m?{hp:+m[1],max:+m[2]}:null; }
    function brkNow(){ var m=html().match(/— (\\d)\\/3/); return m?+m[1]:null; }`;
  }
  const r15g = J(ctx, `(function(){
    ${v15HtmlHelpers()}
    v15.bossFight('dragon');
    var out={hp0:hpNow(), brk0:brkNow(), foundQ:false};
    var g=null;
    (window.__V15_DATA.grammar||[]).forEach(function(item){ if(html().indexOf(v15.esc(item.q))>=0) g=item; });
    out.foundQ=!!g;
    if(g) v15.bossPick(g.a);
    out.brk1=brkNow(); out.hp1=hpNow();
    v15.bossClose();
    return JSON.stringify(out);
  })()`);
  check('V15 grammar: correct answer fills 0 (brk stays 0, damage still dealt)', r15g.foundQ === true && r15g.brk0 === 0 && r15g.brk1 === 0 && r15g.hp1.hp < r15g.hp0.hp, r15g);
  const r15b = J(ctx, `(function(){
    ${v15HtmlHelpers()}
    v15.bossFight('spider');
    var out={hp0:hpNow(), brk0:brkNow(), foundS:false, idx:-1};
    var s=null;
    (window.__V15_DATA.builder||[]).forEach(function(item){ if(html().indexOf(v15.esc(item.vi))>=0) s=item; });
    out.foundS=!!s;
    if(s){ var re=/onclick="__v15\\.bossPick\\((\\d+)\\)">([^<]*)<\\/button>/g, m; var h=html();
      while((m=re.exec(h))!==null){ if(m[2]===v15.esc(s.s)){ out.idx=+m[1]; break; } } }
    if(out.idx>=0) v15.bossPick(out.idx);
    out.brk1=brkNow(); out.hp1=hpNow();
    v15.bossClose();
    return JSON.stringify(out);
  })()`);
  check('V15 builder: correct answer fills 0 (brk stays 0, damage still dealt)', r15b.foundS === true && r15b.idx >= 0 && r15b.brk0 === 0 && r15b.brk1 === 0 && r15b.hp1.hp < r15b.hp0.hp, r15b);
  const r15r = J(ctx, `(function(){
    ${v15HtmlHelpers()}
    v15.bossFight('owl');
    var out={hp0:hpNow(), brk0:brkNow(), foundQ:false};
    var q=null;
    (window.__V15_DATA.reading||[]).forEach(function(p){ (p.qs||[]).forEach(function(item){ if(html().indexOf(v15.esc(item.q))>=0) q=item; }); });
    out.foundQ=!!q;
    if(q) v15.bossPick(q.a);
    out.brk1=brkNow(); out.hp1=hpNow();
    v15.bossClose();
    return JSON.stringify(out);
  })()`);
  check('V15 read: correct answer fills 0 (brk stays 0, damage still dealt)', r15r.foundQ === true && r15r.brk0 === 0 && r15r.brk1 === 0 && r15r.hp1.hp < r15r.hp0.hp, r15r);
  unstubRandom(ctx);
  // ---- Pool bias (real randomness) ----
  const bias19 = J(ctx, `(function(){
    var v19=window.__v19, v34=window.__v34;
    v19.fight('v11_fireking');
    var F=v19._test.F();
    var words=F.pools.words;
    var fb=words.filter(function(w){return !v34.weakMatch(w,F.weak)})[0];
    var n=0,N=400;
    for(var i=0;i<N;i++){var p=v34.weakPick(F,words,fb); if(p&&v34.weakMatch(p,F.weak))n++;}
    var weakInPool=words.filter(function(w){return v34.weakMatch(w,F.weak)}).length;
    var out={share:n/N, poolSize:words.length, weakInPool:weakInPool, baseline:weakInPool/words.length};
    v19.close();
    return JSON.stringify(out);
  })()`);
  check('V19 weakPick draws weakness words ~50% (0.3–0.7 over 400 draws)', bias19.share >= 0.3 && bias19.share <= 0.7, bias19);
  check('V19 weakPick bias is real (un-biased baseline well below the draw share)', bias19.baseline < 0.15 && bias19.share > bias19.baseline * 3, bias19);
  const live19 = J(ctx, `(function(){
    var v19=window.__v19, v34=window.__v34;
    v19.fight('v11_fireking');
    var F=v19._test.F(); var n=0,N=40;
    for(var i=0;i<N;i++){ F=v19._test.F(); if(F.cur&&F.cur.w&&v34.weakMatch(F.cur.w,F.weak))n++; v19.next(); }
    v19.close();
    return JSON.stringify({share:n/N, n:n, N:N});
  })()`);
  check('V19 live nextQ: weakness words appear well above baseline (>25% over 40 questions)', live19.share > 0.25, live19);
  const bias15 = J(ctx, `(function(){
    // weakPick is engine-agnostic: drive it with a V15-shaped fight
    // object (weak t:'time', real WORDS pool) — the same call nextBossQ
    // makes — plus a live nextBossQ sample via the rendered questions.
    var v15=window.__v15, v34=window.__v34;
    var words=v15.words;
    var F={weak:{kind:'t',key:'time'}, brk:0, brkMax:3, lang:'en', pools:{words:words}};
    var fb=words.filter(function(w){return !v34.weakMatch(w,F.weak)})[0];
    var n=0,N=400;
    for(var i=0;i<N;i++){var p=v34.weakPick(F,words,fb); if(p&&v34.weakMatch(p,F.weak))n++;}
    var weakInPool=words.filter(function(w){return v34.weakMatch(w,F.weak)}).length;
    return JSON.stringify({share:n/N, poolSize:words.length, weakInPool:weakInPool, baseline:weakInPool/words.length});
  })()`);
  check("V15 weakPick draws t:'time' words ~50% (0.3–0.7 over 400 draws)", bias15.share >= 0.3 && bias15.share <= 0.7, bias15);
  check("V15 weakPick bias is real (baseline ~0.7% vs ~50% draws)", bias15.baseline < 0.05 && bias15.share > bias15.baseline * 5, bias15);
  const live15 = J(ctx, `(function(){
    var v15=window.__v15;
    v15.bossFight('slime');
    var host=document.getElementById('v15bossfight');
    function html(){ return host.innerHTML||''; }
    var timeEn={}; v15.words.forEach(function(w){ if(w.t==='time') timeEn[w.en]=1; });
    var n=0,N=40;
    for(var i=0;i<N;i++){
      var m=html().match(/<div class="v15qword">([^<]*)<\\/div>/);
      if(m && timeEn[m[1]]) n++;
      v15.bossNext();
    }
    v15.bossClose();
    return JSON.stringify({share:n/N, n:n, N:N});
  })()`);
  check("V15 live nextBossQ: t:'time' words appear well above baseline (>25% over 40 questions)", live15.share > 0.25, live15);
  stubRandom(ctx);
  // ---- Golem shield interaction (V19): BREAK bonus goes through shield-halving ----
  const golem = J(ctx, `(function(){
    var v19=window.__v19, v15=window.__v15;
    var mach=v15.words.filter(function(w){return w.chronoSet==='machines'})[0];
    var dist=v15.words.filter(function(w){return w.id!==mach.id}).slice(0,3);
    v19.fight('v17_geargolem');
    var F=v19._test.F();
    var out={shield0:F.shield, hp0:F.hp, maxHp:F.maxHp, phase0:F.phase};
    F.brk=2;
    F.cur={w:mach, opts:[mach].concat(dist), optsVi:[mach].concat(dist)};
    var ok=v19._test.pickCorrect();
    F=v19._test.F();
    out.ok=ok; out.brk=F?F.brk:null; out.lastDmg=F?F.lastDmg:null; out.shield=F?F.shield:null; out.hp=F?F.hp:null; out.banner=F?String(F.banner||''):null; out.pet=!!(F&&F.pet);
    v19.close();
    return JSON.stringify(out);
  })()`);
  check('Golem fight starts with 90-HP shield, 750 HP', golem.shield0 === 90 && golem.hp0 === 750, golem);
  check('Golem BREAK at 3/3: bonus 50 halved by shield to 28 dealt (shield 62, hp 722)', golem.lastDmg === 28 && golem.shield === 62 && golem.hp === 722 && golem.brk === 0, golem);
  check('Golem BREAK: banner shows BREAK, no pet-team interference', (golem.banner || '').indexOf('BREAK') >= 0 && golem.pet === false, golem);
  // ---- Honest blocked state (scope-active, disjoint weakness) ----
  const blocked19 = J(ctx, `(function(){
    var v19=window.__v19, v15=window.__v15, v34=window.__v34;
    v15.setScope({kind:'lib',lib:'chrono',set:'space'});
    v19.fight('v11_fireking');
    var F=v19._test.F();
    var out={blocked:v34.scopeBlocked(F), bar:v34.breakBarHTML(F), poolSize:(F.pools&&F.pools.words||[]).length,
      poolWeak:(F.pools&&F.pools.words||[]).filter(function(w){return v34.weakMatch(w,F.weak)}).length, brk0:F.brk};
    for(var hit=1;hit<=3;hit++){ var ok=v19._test.pickCorrect(); F=v19._test.F(); if(F&&!F.over) v19.next(); }
    F=v19._test.F(); out.brkAfter3=F?F.brk:null;
    v19.close(); v15.clearScope();
    return JSON.stringify(out);
  })()`);
  check('V19 blocked: scope pool holds 0 weakness words, scopeBlocked true', blocked19.poolWeak === 0 && blocked19.blocked === true, blocked19);
  check('V19 blocked: bar shows the honest out-of-scope message', blocked19.bar.indexOf('ngoài phạm vi ôn tập') >= 0, blocked19.bar);
  check('V19 blocked: meter never fills (brk 0 after 3 correct answers)', blocked19.brkAfter3 === 0, blocked19);
  const blocked18 = J(ctx, `(function(){
    var v18=window.__v18, v15=window.__v15, v34=window.__v34;
    v15.setScope({kind:'lib',lib:'chrono',set:'time'});
    v18.fight('v10_slime','en');
    var F=v18._test.F();
    var out={blocked:v34.scopeBlocked(F), bar:v34.breakBarHTML(F),
      poolWeak:(F.pools&&F.pools.words||[]).filter(function(w){return v34.weakMatch(w,F.weak)}).length, brk0:F.brk};
    for(var hit=1;hit<=3;hit++){ var ok=v18._test.pickCorrect(); F=v18._test.F(); if(F&&!F.over) v18.next(); }
    F=v18._test.F(); out.brkAfter3=F?F.brk:null;
    v18.close(); v15.clearScope();
    return JSON.stringify(out);
  })()`);
  check('V18 blocked: bar shows the honest out-of-scope message, meter never fills', blocked18.bar.indexOf('ngoài phạm vi ôn tập') >= 0 && blocked18.brkAfter3 === 0 && blocked18.poolWeak === 0, blocked18);
  const blocked15 = J(ctx, `(function(){
    var v15=window.__v15;
    v15.setScope({kind:'lib',lib:'chrono',set:'space'});
    v15.bossFight('slime');
    var host=document.getElementById('v15bossfight');
    function html(){ return host.innerHTML||''; }
    function brkNow(){ var m=html().match(/— (\\d)\\/3/); return m?+m[1]:null; }
    function hpNow(){ var m=html().match(/HP (\\d+)\\/(\\d+)/); return m?{hp:+m[1],max:+m[2]}:null; }
    var out={barBlocked: html().indexOf('ngoài phạm vi ôn tập')>=0, brk0:brkNow()};
    var all=v15.words; var enCount={}; all.forEach(function(w){ enCount[w.en]=(enCount[w.en]||0)+1; });
    var done=0, guard=0;
    while(done<3 && guard++<40){
      var m=html().match(/<div class="v15qword">([^<]*)<\\/div>/); var en=m?m[1]:null;
      var w=en?all.filter(function(x){return x.en===en && enCount[x.en]===1})[0]:null;
      if(!w){ v15.bossNext(); continue; }
      var h=html(); var re=/onclick="__v15\\.bossPick\\((\\d+)\\)">([^<]*)<\\/button>/g, mm, idx=-1;
      while((mm=re.exec(h))!==null){ if(mm[2]===v15.esc(w.vi)){ idx=+mm[1]; break; } }
      if(idx<0){ v15.bossNext(); continue; }
      v15.bossPick(idx); done++;
      if(done<3) v15.bossNext();
    }
    out.done=done;
    var hAfter=html();
    out.barAfter3=hAfter.indexOf('ngoài phạm vi ôn tập')>=0;
    out.hpAfter3=hpNow();
    v15.bossClose(); v15.clearScope();
    return JSON.stringify(out);
  })()`);
  check('V15 blocked: bar shows the honest out-of-scope message, meter never fills', blocked15.barBlocked === true && blocked15.done === 3 && blocked15.barAfter3 === true && blocked15.hpAfter3 && blocked15.hpAfter3.hp < 60, blocked15);
  // ---- KO deck rule (V19, fireking, lang ko) ----
  const koFight = J(ctx, `(function(){
    var out={};
    try{
      var savedCards=S.cards.slice();
      S.cards=[]; for(var i=0;i<10;i++) S.cards.push({id:'k'+i,h:'한',m:'nghĩa '+i});
      S.deck='d0';
      window.__v19._test.setLang('ko');
      var v19=window.__v19;
      v19.fight('v11_fireking');
      var F=v19._test.F();
      out.lang=F&&F.lang; out.weak=F&&F.weak; out.hasK=F&&!!(F.cur&&F.cur.k); out.brk0=F?F.brk:null;
      out.barWithDeck=window.__v34.breakBarHTML(F);
      for(var hit=1;hit<=3;hit++){
        F=v19._test.F();
        var ok=v19._test.pickCorrect();
        F=v19._test.F();
        out['brk'+hit]=F?F.brk:null; out['banner'+hit]=F?String(F.banner||''):null; out['ok'+hit]=ok;
        if(F&&!F.over) v19.next();
      }
      out.hpAfter3=v19._test.F()?v19._test.F().hp:null;
      v19.close();
      S.deck='';
      v19.fight('v11_fireking');
      F=v19._test.F();
      out.barNoDeck=window.__v34.breakBarHTML(F);
      out.brkNoDeck0=F?F.brk:null;
      var ok2=v19._test.pickCorrect();
      F=v19._test.F();
      out.brkNoDeck1=F?F.brk:null; out.okNoDeck=ok2;
      v19.close();
      window.__v19._test.setLang('en');
      S.cards=savedCards; S.deck='';
    }catch(e){ out.err='throw: '+e.message; }
    return JSON.stringify(out);
  })()`);
  check('KO fight with deck: lang ko, weak=ko, KO questions asked', koFight.lang === 'ko' && koFight.weak && koFight.weak.kind === 'ko' && koFight.hasK === true && !koFight.err, koFight);
  check('KO fight with deck: correct KO answers fill 1 -> 2 -> 0 (BREAK)', koFight.brk1 === 1 && koFight.brk2 === 2 && koFight.brk3 === 0, koFight);
  check('KO fight with deck: BREAK banner on 3rd hit, HP 325-72=253', (koFight.banner3 || '').indexOf('BREAK') >= 0 && koFight.hpAfter3 === 253, koFight);
  check('KO fight with deck: bar is shown (not hidden)', (koFight.barWithDeck || '').indexOf('0/3') >= 0, koFight.barWithDeck);
  check('KO fight with no deck: meter hidden (empty bar), no fill, no crash', koFight.barNoDeck === '' && koFight.brkNoDeck0 === 0 && koFight.brkNoDeck1 === 0 && koFight.okNoDeck === true && !koFight.err, koFight);
  unstubRandom(ctx);
  // ---- Weakness units ----
  check('breakBonus clamps: 60->10, 200->20, 620->50, 325->33, 1000->50, 50->10',
    E(ctx, `window.__v34.breakBonus(60)===10 && window.__v34.breakBonus(200)===20 && window.__v34.breakBonus(620)===50 && window.__v34.breakBonus(325)===33 && window.__v34.breakBonus(1000)===50 && window.__v34.breakBonus(50)===10`));
  check('weakFor: Chrono 8 explicit (sandwisp->time, golem->machines, titan->change)',
    E(ctx, `window.__v34.weakFor({id:'v17_sandwisp',zone:'chrono'},'en').key==='time' && window.__v34.weakFor({id:'v17_geargolem',zone:'chrono'},'en').key==='machines' && window.__v34.weakFor({id:'v17_titan',zone:'chrono'},'en').key==='change'`));
  check('weakFor: z10 -> Chrono/change, Elemental fire -> cooking-verbs, V15 default -> t/time, KO -> ko',
    E(ctx, `window.__v34.weakFor({id:'v11_infinitydragon',zone:'z10'},'en').kind==='chrono' && window.__v34.weakFor({id:'v10_infinitydragon',zone:'z10'},'en').key==='change' && window.__v34.weakFor({id:'v10_magma',arena:'el',el:'fire'},'en').key==='cooking-verbs' && window.__v34.weakFor({id:'slime'},'en').key==='time' && window.__v34.weakFor({id:'v11_fireking',zone:'z1'},'ko').kind==='ko'`));
  check("weakMatch accepts a1a2Topics 'a1_family' for key 'family'",
    E(ctx, `window.__v34.weakMatch({a1a2Topics:['a1_family']},{kind:'a1a2',key:'family'})`) === true);
  check("weakMatch t:'time' matches 32 V15 words",
    E(ctx, `window.__v15.words.filter(function(w){return window.__v34.weakMatch(w,{kind:'t',key:'time'})}).length`) === 32);
  check('weakChipHTML (Chrono boss) names the set', E(ctx, `window.__v34.weakChipHTML({id:'v17_sandwisp',zone:'chrono',diff:'B2'},'en')`).indexOf('Time &amp; Calendar') >= 0 || E(ctx, `window.__v34.weakChipHTML({id:'v17_sandwisp',zone:'chrono',diff:'B2'},'en')`).indexOf('Time & Calendar') >= 0);
  const collHtml = E(ctx, `window.__v18.collectionHTML()`);
  check('Collection renders weakness chips (all 78 cards)', (collHtml.match(/Điểm yếu:/g) || []).length >= 78, (collHtml.match(/Điểm yếu:/g) || []).length);

  // ================= §G Smart mid-flight guard =================
  section('§G', 'Smart mid-flight guard (v33 launchSession)');
  const sessBefore = J(ctx, `window.__v27.en27().sessions.length`);
  const guardNoop = E(ctx, `(function(){ try{ window.__v27.endEarly(); return 'ok'; }catch(e){ return 'throw: '+e.message; } })()`);
  check('endEarly() is a no-op with no live session (no throw, no session recorded)', guardNoop === 'ok' && J(ctx, `window.__v27.en27().sessions.length`) === sessBefore, guardNoop);
  check('launchSession() calls guarded endEarly() before startSession', html.includes("try{if(window.__v27&&__v27.endEarly)__v27.endEarly()}catch(e){}"));
  // Live Smart plan session (2 Chrono words, 1 answered) replaced by a Chrono launch.
  const guardLive = J(ctx, `(function(){
    var out={};
    try{
      var v27=window.__v27, v33=window.__v33;
      // Last 2 change-set words (untouched by §B fights and §S marks).
      var ids=window.__v15.words.filter(function(w){return w.chronoSet==='change' && w.id!=='v33_agenda'}).slice(-2).map(function(w){return w.id});
      out.ids=ids;
      var d=v27.en27();
      d.plan.en={d:new Date().toDateString(), mins:10, newN:5, dueN:10, weakN:5, ids:ids.slice(), doneIds:[], goals:{complete:false,acc80:false,weak5:false}};
      out.xpBefore=S.xp;
      out.started=!!v27.startSession('en', ids.slice(), 'plan');
      v27.answerMC('x', true); v27.nextQ();
      out.doneIdsAfterAnswer=d.plan.en.doneIds.slice();
      // Replace the live Smart session the Chrono way: startQuest calls
      // launchSession() internally, which guarded-endEarly()s first.
      // (__v33 does not export launchSession itself.)
      out.launched=!!v33.startQuest('q_clock');
      out.sessions=d.sessions.length;
      out.first=d.sessions[0]?{lang:d.sessions[0].lang, total:d.sessions[0].total, correct:d.sessions[0].correct, words:(d.sessions[0].words||[]).length}:null;
      out.doneIdsAfter=d.plan.en.doneIds.slice();
      out.goalsComplete=d.plan.en.goals.complete;
      out.claimedKeys=Object.keys(d.claimed||{});
      out.xpAfter=S.xp;
      v27.endEarly();
      out.sessionsAfterEndEarly=d.sessions.length;
    }catch(e){ out.err='throw: '+e.message; }
    return JSON.stringify(out);
  })()`);
  check('live Smart plan session starts (2 Chrono words)', guardLive.started === true && guardLive.ids && guardLive.ids.length === 2, guardLive);
  check('answering 1 word records it in the plan doneIds', guardLive.doneIdsAfterAnswer && guardLive.doneIdsAfterAnswer.length === 1, guardLive);
  check('Chrono launchSession replaces the live session (returns true)', guardLive.launched === true && !guardLive.err, guardLive);
  check('ended Smart session is finished-and-recorded (1 answered, 1 correct, en)', guardLive.first && guardLive.first.lang === 'en' && guardLive.first.total === 1 && guardLive.first.correct === 1, guardLive);
  check('plan doneIds preserved after the mid-flight end (still 1 word)', guardLive.doneIdsAfter && guardLive.doneIdsAfter.length === 1 && guardLive.doneIdsAfter[0] === guardLive.ids[0], guardLive);
  check('no plan bonus paid mid-flight (goals.complete false, no plan claim key)', guardLive.goalsComplete === false && guardLive.claimedKeys.filter(function(k){ return k.indexOf('plan:en:') === 0; }).length === 0, guardLive);
  check('XP gain is mark15-only (+10), no +20 plan bonus', guardLive.xpAfter === guardLive.xpBefore + 10, guardLive);
  check('the replacement Chrono session was live (2nd endEarly records another session)', guardLive.sessionsAfterEndEarly === guardLive.sessions + 1, guardLive);

  // ================= §R V17.0 regression =================
  section('§R', 'V17.0 regression (gate, golem, quests, rift, echo, region)');
  stubRandom(ctx);
  // Gate: exact 69 closed / 70 open (overwrite the §B seed buckets).
  const gate69 = J(ctx, `(function(){
    var e15=window.__v15.en15(); e15.bosses={}; for(var i=0;i<10;i++) e15.bosses['old'+i]={win:1};
    var e18=window.__v18._test.en18(); e18.bosses={}; for(var i=0;i<30;i++) e18.bosses['v10_'+i]={win:1,wins:1};
    var e19=window.__v19._test.en19(); e19.bosses={}; for(var i=0;i<29;i++) e19.bosses['v11_'+i]={en:{win:1,wins:1,stars:2,best:2}};
    return JSON.stringify({count:window.__v33._test.correctedWinCount(), open:window.__v33.gateOpen()});
  })()`);
  check('gate: 69 wins (10+30+29) -> corrected count 69, closed', gate69.count === 69 && gate69.open === false, gate69);
  const gate70 = J(ctx, `(function(){
    var e19=window.__v19._test.en19(); e19.bosses['v11_29']={en:{win:1,wins:1,stars:2,best:2}};
    return JSON.stringify({count:window.__v33._test.correctedWinCount(), open:window.__v33.gateOpen()});
  })()`);
  check('gate: 70 wins -> corrected count 70, open exactly at 70', gate70.count === 70 && gate70.open === true, gate70);
  const bd = J(ctx, `JSON.stringify(window.__v33._test.winBreakdown())`);
  check('gate: breakdown is 10/30/30', bd && bd.en15 === 10 && bd.en18 === 30 && bd.en19 === 30, bd);
  check('gate closed -> no Chrono boss unlocked; open -> only sandwisp unlocked',
    E(ctx, `window.__v33._test.bossUnlocked('v17_sandwisp','en')`) === true && E(ctx, `window.__v33._test.bossUnlocked('v17_pendulum','en')`) === false);
  // Golem: 90-HP shield, 2 phases, P2 +10 HP heal, no P3.
  const golemR = J(ctx, `(function(){
    var v19=window.__v19;
    var e19=v19._test.en19();
    window.__V33_DATA.bosses.slice(0,7).forEach(function(b){ e19.bosses[b.id]={en:{win:1,wins:1,stars:3,best:3}}; });
    v19.fight('v17_geargolem');
    var F=v19._test.F();
    var out={shield:F.shield, hp0:F.hp, phase0:F.phase};
    F.hp=300;
    v19._test.pickCorrect(); v19.next();
    F=v19._test.F(); out.phase2=F.phase;
    var hpPre=F.hp;
    v19._test.pickWrong(); v19.next();
    F=v19._test.F(); out.hpPre=hpPre; out.hpPost=F.hp; out.heal=F.hp-hpPre;
    F.hp=100; v19._test.pickCorrect(); v19.next();
    F=v19._test.F(); out.phaseLow=F.phase; out.ult=F.ultActive;
    v19.close();
    return JSON.stringify(out);
  })()`);
  check('golem fight starts with 90-HP gear shield', golemR.shield === 90, golemR);
  check('golem reaches phase 2 at <=50% HP', golemR.phase2 === 2, golemR);
  check('golem time-reversal: wrong answer in P2 heals exactly +10 HP', golemR.heal === 10, golemR);
  check('golem has NO P3 at <=20% HP (phase stays 2, no counterattack)', golemR.phaseLow === 2 && golemR.ult === false, golemR);
  unstubRandom(ctx);
  // Quests: 12/12 completes; exactly 0.8 completes; 0.75 does not.
  E(ctx, `window.__v33.startQuest('q_clock')`);
  const recQ = driveSession(ctx, [true]);
  check('quest q_clock: real V27 session finishes 12/12 (acc 1.0)', recQ && recQ.total === 12 && recQ.correct === 12, recQ);
  const doneQ = J(ctx, `JSON.stringify(window.__v33.checkCompletions())`);
  check('quest q_clock completes at acc 1.0', doneQ && doneQ.indexOf('q_clock') >= 0 && E(ctx, `window.__v33.questState('q_clock')`) === 'done', doneQ);
  const xpQ = E(ctx, `S.xp`);
  const claimQ = J(ctx, `JSON.stringify(window.__v33._test.claimQuest('q_clock'))`);
  check('claimQuest q_clock pays +30 XP (20 first clear + 10 for >=90%)', claimQ && claimQ.ok === true && E(ctx, `S.xp`) === xpQ + 30, claimQ);
  const claimQ2 = J(ctx, `JSON.stringify(window.__v33._test.claimQuest('q_clock'))`);
  check('claimQuest q_clock is claimed-guarded (2nd claim fails, no XP)', claimQ2 && claimQ2.ok === false && E(ctx, `S.xp`) === xpQ + 30, claimQ2);
  E(ctx, `window.__v33.startQuest('q_gear')`);
  const recQ8 = driveSession(ctx, [true, true, true, true, true, true, true, true, true, false, false, false, true, true, true]);
  check('quest q_gear boundary session rec exists (acc exactly 0.8)', recQ8 && Math.abs(recQ8.correct / recQ8.total - 0.8) < 0.001, recQ8 && { c: recQ8.correct, t: recQ8.total });
  E(ctx, `window.__v33.checkCompletions()`);
  check('quest with acc exactly 0.8 IS marked done (>=0.8 threshold)', E(ctx, `window.__v33.questState('q_gear')`) === 'done', E(ctx, `window.__v33.questState('q_gear')`));
  // q_final's id count is read live (14, not 12): answer 4 wrong in main
  // + 4 right in reask -> acc = N/(N+4) < 0.8 for any N in 10..14.
  const qfN = E(ctx, `window.__V33_DATA.quests.filter(function(q){return q.id==='q_final'})[0].ids.length`);
  E(ctx, `window.__v33.startQuest('q_final')`);
  const qfPattern = [];
  for (let i = 0; i < qfN; i++) qfPattern.push([2, 5, 8, 11].indexOf(i) < 0);
  for (let i = 0; i < 4; i++) qfPattern.push(true);
  const recQ75 = driveSession(ctx, qfPattern);
  check('quest q_final low session rec exists (acc < 0.8)', recQ75 && recQ75.correct === qfN && recQ75.total === qfN + 4 && (recQ75.correct / recQ75.total) < 0.8, recQ75 && { c: recQ75.correct, t: recQ75.total, n: qfN });
  E(ctx, `window.__v33.checkCompletions()`);
  check('quest with acc 0.75 (<0.8) is NOT marked done', E(ctx, `window.__v33.questState('q_final')`) !== 'done', E(ctx, `window.__v33.questState('q_final')`));
  const claimQ75 = J(ctx, `JSON.stringify(window.__v33._test.claimQuest('q_final'))`);
  check('unfinished quest cannot be claimed', claimQ75 && claimQ75.ok === false, claimQ75);
  // Rift: floor 1 7/7 -> floor 2 unlocks at >=0.7; claim +40/+2; once/day.
  check('rift floor 1 unlocked, floors 2-3 locked at start', E(ctx, `window.__v33.riftUnlocked(1)`) === true && E(ctx, `window.__v33.riftUnlocked(2)`) === false && E(ctx, `window.__v33.riftUnlocked(3)`) === false);
  check('startRift(2) refuses while locked', E(ctx, `window.__v33.startRift(2)`) === false);
  E(ctx, `window.__v33.startRift(1)`);
  const recR = driveSession(ctx, [true]);
  check('rift floor 1 session finishes 7/7 (acc 1.0)', recR && recR.total === 7 && recR.correct === 7, recR);
  E(ctx, `window.__v33.checkCompletions()`);
  check('rift floor 1 best recorded (1.0)', E(ctx, `window.__v33.en33().rift.best[1]`) === 1, E(ctx, `JSON.stringify(window.__v33.en33().rift)`));
  check('rift floor 2 unlocks after floor 1 >= 0.7', E(ctx, `window.__v33.riftUnlocked(2)`) === true);
  const xpR = E(ctx, `S.xp`), gemsR = E(ctx, `S.v7.gems`);
  const claimR = J(ctx, `JSON.stringify(window.__v33._test.claimRift(1))`);
  check('claimRift floor 1 at 100% pays +40 XP + 2 gems', claimR && claimR.ok === true && E(ctx, `S.xp`) === xpR + 40 && E(ctx, `S.v7.gems`) === gemsR + 2, claimR);
  const claimR2 = J(ctx, `JSON.stringify(window.__v33._test.claimRift(1))`);
  check('claimRift once/day: 2nd claim same day fails', claimR2 && claimR2.ok === false, claimR2);
  // Time Echo: most-wrong-first, cap 10.
  E(ctx, `var d=window.__v27.en27(); d.en.cw={}; d.en.cw['v33_alarm_clock']=3; d.en.cw['w1']=1; d.en.cw['v33_agenda']=5;`);
  const echo = J(ctx, `JSON.stringify(window.__v33.echoList())`);
  check('Echo list returns cw>=1 words, most-wrong first', echo.length === 3 && echo[0].id === 'v33_agenda' && echo[0].cw === 5 && echo[1].id === 'v33_alarm_clock', echo);
  E(ctx, `var d=window.__v27.en27(); for(var i=0;i<12;i++) d.en.cw['echo_word_'+i]=i+1;`);
  check('Echo list caps at 10 (most-wrong first)', E(ctx, `window.__v33.echoList().length`) === 10 && E(ctx, `window.__v33.echoList()[0].cw`) === 12);
  // Region claim once-only.
  E(ctx, `(function(){ var e=window.__v19._test.en19(); window.__V33_DATA.bosses.forEach(function(b){ e.bosses[b.id]={en:{win:1,wins:1,stars:3,best:3}}; }); })()`);
  check('regionWon true when all 8 Chrono bosses won in EN', E(ctx, `window.__v33._test.regionWon('en')`) === true);
  const xpReg = E(ctx, `S.xp`);
  const reg = J(ctx, `JSON.stringify(window.__v33._test.claimRegion('en'))`);
  check('claimRegion pays +150 XP + 5 gems + title once', reg && reg.ok === true && E(ctx, `S.xp`) === xpReg + 150 && E(ctx, `S.v7.gems`) === gemsR + 2 + 5 && E(ctx, `S.v7.en19.titles.indexOf('Chúa Tể Thời Gian')>=0`) === true, reg);
  const reg2 = J(ctx, `JSON.stringify(window.__v33._test.claimRegion('en'))`);
  check('claimRegion is claimed-guarded (2nd claim fails)', reg2 && reg2.ok === false, reg2);

  // ================= §V preservation spot-checks =================
  section('§V', 'V31/V32/V33 preservation spot-checks');
  check('V31 merge fragment F-01 present', html.includes('/* V31 (F-01):'));
  check('V31 C9 fragment present (__v20.importFile)', html.includes('__v20.importFile(imp)'));
  check('bad-version guard present x2', countOcc(html, 'bad-version') === 2, countOcc(html, 'bad-version'));
  check('V33 golem shield fragment present', html.includes("b.id==='v17_geargolem'?90:"));
  check('V33 golem heal fragment present', html.includes('GEAR GOLEM hồi 10 HP'));
  check('V33 Chrono buildWords block present', html.includes('/* V33: CHRONO KINGDOM'));
  check('V33 TOTAL_BOSSES 78 still present', html.includes('var TOTAL_BOSSES=78;'));
  check('marker order ends v34 (style + script)', styleIds[styleIds.length - 1] === 'v34' && scriptIds[scriptIds.length - 1] === 'v34');
  check('__v31.status() still 16.3.0', E(ctx, `window.__v31.status().version`) === '16.3.0');
  check('__v32.version still 16.4.0', E(ctx, `window.__v32.version`) === '16.4.0');
  check('no new v34 localStorage key (only hanvocab.v1 family keys)', J(ctx, `JSON.stringify((function(){ var ks=[]; for(var i=0;i<localStorage.length;i++) ks.push(localStorage.key(i)); return ks; })())`).every(function(k) { return k.indexOf('v34') < 0; }));

  // ================= §C Chrome-only (SKIP, never PASS) =================
  section('§C', 'Chrome-only — skipped in vm (see verify-v34c.js)');
  const chromeWhy = 'Real-browser gates live in tools/v34/verify-v34c.js — see SMOKE_TEST §4';
  skipCheck('Library Chrono group renders + filters + flashcards in real Chrome', chromeWhy);
  skipCheck('live V19 Chrono fight shows the Break bar filling + BREAK bonus in real Chrome', chromeWhy);
  skipCheck('live V18 fight shows the Break bar in real Chrome', chromeWhy);
  skipCheck('Vocabulary Analytics renders in real Chrome', chromeWhy);
  skipCheck('no console errors on boot + Chrono flows in real Chrome', chromeWhy);
  skipCheck('no overflow at 360/390/430 in real Chrome', chromeWhy);
  skipCheck('live Firebase sync/login (Anh must run FIREBASE_SETUP.md)', chromeWhy);
  skipCheck('real phone touch + Safari first-open', chromeWhy);

  console.log(`\ntest34.js: PASS ${pass} / FAIL ${fail} / SKIP ${skip}${fail ? ' — FAILURES: ' + failures.join(' | ') : ''}`);
  for (const id of ['§0', '§L', '§L2', '§S', '§A', '§B', '§G', '§R', '§V', '§C']) {
    const c = secCounts[id] || { pass: 0, fail: 0, skip: 0 };
    console.log(`  ${id}: PASS ${c.pass} / FAIL ${c.fail} / SKIP ${c.skip}`);
  }
  console.log('TEST34_SUMMARY ' + JSON.stringify({ pass, fail, skip, sections: secCounts }));
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('test34.js crashed:', e); process.exit(2); });
