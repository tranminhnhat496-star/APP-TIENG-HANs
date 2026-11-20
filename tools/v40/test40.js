// test40.js - V18.5 BUG FIXES II independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v39/test39.js (same lines 34-188); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V18.5 build.
// Usage: node tools/v40/test40.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, fragments, src/out agree,
//         V39 fragments that survive + the two V39 fragments V40 supersedes)
//   section L page load (vm, real inline scripts) + __v40 + exports
//   section 40A C-01 ko16 merge (per-key MAX; newer-wins regression gone)
//   section 40B C-07 Smart plan merge (per-language; same-day union; newer-wins otherwise)
//   section 40C C-02 team skill vs shield (halved, shield absorbs, toast corrected,
//         checkPhase re-runs after a non-lethal skill; lethal still resolves)
//   section 40D B-8 BT fresh-load guards (startMode + reviewStart load BT data first;
//         learnHTML prefetch; mode actually starts with BT words after load)
//   section 40E A-F2/A-N1 koWarn (banner survives next() in both engines; count computed once)
//   section 40F A-F1/C-04/C-05/C-06 (Break label, Collection detail replay count,
//         arenas button live count, Collection subtitle, sc2 keeps topic/lesson)
//   section 40G C-10 partial sessions (acc80/weak5 NOT ticked by a partial plan session;
//         complete session still ticks them; payouts still guarded)
//   section 40H C-12 picker empty Units (refuses, scope unchanged, pop shown;
//         'all' still applies whole BT; one Unit still applies)
//   section 40R V18.4 regression (picker, layers, pets, KO banner, recordAnswer, TOTAL 86)
//   section V save schema (no en40 key, no new localStorage key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/touch/speech; innerHTML
// is a plain string, so the banner / detail / button texts are asserted on
// the arena HTML string and the exposed fight state F, not on painted
// pixels); the live fight pools, the painted banner at Q2, and the 360px
// layout are Chrome gates (verify-v40c.js), not asserted here; live-browser,
// real-phone and live-Firebase gates stay Chrome/Anh-only.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = '9a2fdd741d8027dd3e95a5bcae64a4e8989bd726bcb74fe74f49f29a0e779827';
const EXPECTED_BYTES = 2390555;
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
// test39 body — main() + footer (assembled with the test37.js harness:
// makeLS/makeEl/makeDocument/makeCtx/E/J/loadPage/fireDCL verbatim).


// ================= §0 static: build integrity =================
async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v40.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V18.5 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is 2,390,555 B', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('title is V18.5 Bug Fixes II', html.includes('<title>Korean &amp; English Vocab Farm V18.5 — Bug Fixes II'));
  check('__v40 + 18.5.0 present', html.includes('window.__v40') && html.includes("VERSION='18.5.0'"));
  check('__v33–__v39 + 17.0.0/17.1.0/18.0.0/18.1.0/18.2.0/18.3.0/18.4.0 still present', html.includes('window.__v33') && html.includes('window.__v34') && html.includes('window.__v35') && html.includes('window.__v36') && html.includes('window.__v37') && html.includes('window.__v38') && html.includes('window.__v39') && html.includes("VERSION='17.0.0'") && html.includes("VERSION='17.1.0'") && html.includes("VERSION='18.0.0'") && html.includes("VERSION='18.1.0'") && html.includes("VERSION='18.2.0'") && html.includes("VERSION='18.3.0'") && html.includes("VERSION='18.4.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0', '18.4.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v40', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v40', styleIds.join(','));
  check('script markers end v40', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v40', scriptIds.join(','));
  check('v40js after v39js', html.indexOf('id="v40js"') > html.indexOf('id="v39js"'));
  check('no v41 marker (no unshipped layer)', !html.includes('id="v41"') && !html.includes('id="v41js"'));
  for (const m of ['armV27Obs', 'rearmObserver', '_speakXp', 'V29 (F-05)']) {
    check(`out-of-scope marker absent: ${m}`, !html.includes(m));
  }
  // V40 fragments (one per replacement).
  check('R-V40-V20-KO16 branch present', html.includes("else if(kk==='ko16'){"));
  check('R-V40-V20-KO16 maxMap present', html.includes('m16k.levels=maxMap(l16k.levels, c16k.levels);'));
  check('R-V40-V20-PLAN merge loop present', html.includes("['en','ko'].forEach(function(lg){"));
  check('R-V40-V20-PLAN old line gone', !html.includes("m27.plan=n27p.plan!==undefined?n27p.plan:(o27p.plan||{en:{},ko:{}});"));
  check('R-V40-V23-SHIELD halving present', html.includes("_fightF.hp=Math.max(0,(_fightF.hp||0)-dealt);"));
  check('R-V40-V23-SHIELD old raw damage gone', !html.includes("_fightF.hp=Math.max(0,(_fightF.hp||0)-r.dmg);"));
  check('R-V40-V23-SHIELD toast correction present', html.includes('Khiên boss chặn một nửa.'));
  check('R-V40 checkPhase exports present x2', countOcc(html, 'checkPhase:checkPhase') === 2);
  check('R-V40 B-8 guards present x3', countOcc(html, "if(sc40&&sc40.kind==='lib'&&sc40.lib==='bt'") === 3);
  check('R-V40 B-8 loading states present x2', countOcc(html, 'Đang tải bộ từ Basic Tactics') === 2);
  check('R-V40 koWarn banner present x2', countOcc(html, "F.banner=F.koWarn='⚠️ Bạn mới có '+_kc40") === 2);
  check('R-V40 next() restores koWarn x2', countOcc(html, 'F.banner=F.koWarn||null;') === 2);
  check('R-V40 old next() banner-clear gone', countOcc(html, 'F.q++;F.banner=null;') === 0);
  check('R-V40 old 3x-count banner lines gone', !html.includes("F.banner='⚠️ Bạn mới có '+koCount18()") && !html.includes("F.banner='⚠️ Bạn mới có '+koCount()"));
  check('R-V40-V34-BREAKLABEL new label present', html.includes("Điểm yếu: từ tiếng Hàn của bạn — '+cur"));
  check('R-V40-V34-BREAKLABEL old label gone (break bar only)', !html.includes("Điểm yếu: bộ từ tiếng Hàn đã chọn — '+cur"));
  check('R-V40 weakChipHTML label untouched', html.includes('Điểm yếu: bộ từ tiếng Hàn đã chọn</span>'));
  check('R-V40-V18-COLLDETAIL en19 read present', html.includes("rec={wins:((r19.en&&r19.en.wins)||0)+((r19.ko&&r19.ko.wins)||0)}"));
  check('R-V40-V18-COLLDETAIL old line gone', !html.includes("var rec=b.arena==='old'?null:(e.bosses[b.id]||null);"));
  check('R-V40-V18-ARENASBTN live count present', html.includes("allBosses().length+' boss)"));
  check('R-V40-V18-ARENASBTN old (40 boss) gone', !html.includes('Xem Bộ Sưu Tập Boss (40 boss)'));
  check('R-V40-V18-COLLHEAD Chrono/Skyroot present', html.includes('+ 8 boss Chrono Kingdom (V17) và 8 boss Skyroot Sanctuary (V18)'));
  check('R-V40 sc2 topic/lesson present x2', countOcc(html, 'topic:sc.topic,lesson:sc.lesson};') === 2);
  check('R-V40 sc2 old line gone', countOcc(html, "var sc2={kind:'lib',lib:sc.lib,unit:sc.unit,type:sc.type,set:sc.set};") === 0);
  check('R-V40-V27-FINISH guarded block present', html.includes("if(!partial){\n        p.goals.complete=doneAll;"));
  check('R-V40-V27-FINISH old single-line guard gone', !html.includes('if(!partial)p.goals.complete=doneAll;'));
  check('R-V40-V22-APPLY refuse guard present', html.includes("if(lib==='units'&&!units.length){pop22('Chọn ít nhất 1 Unit.');return}"));
  // V39 fragments that survive (the two V39 banner fragments are
  // INTENTIONALLY superseded by V40 — asserted gone above).
  for (const frag of ['function koCount18(){', "recordAnswer('ko',k.id,ok,'boss18')", "recordAnswer('ko',k.id,ok,'boss19')", 'markKO(true,F.cur.k)', 'markKO(false,F.cur.k)', 'markKO19(ok,F.cur.k)', 'markKO19(true,F.cur.k)', 'markKO19(false,F.cur.k)']) {
    check(`V39 fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  // V38/V37/V36 fragments survive (spot-checks, one per group).
  for (const frag of ['topics:topics,lessons:lessons,topicName:topicName,scopeName:scopeName,', 'function bossLibChange(){', 'function bossSubHTML(lib,sc){', 'function bossSubPick(el){', 'function bossSelectedSub(attr){', 'id="v22bs-lib" onchange="__v22.bossLibChange()"', "{v:'oxford',n:'Oxford 3000'}", "bossSelectedSub('t')", "bossSelectedSub('s')"]) {
    check(`V38 fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  check('V37 renderHub export survives', html.includes('renderTab:renderTab,renderHub:renderHub,topicName:topicName,counts15:counts15,'));
  check('V37 clearScope line survives', html.includes('if(v.renderHub)v.renderHub();else renderTab()'));
  check('V37 __v27.render export survives', html.includes('goTab:goTab,goWeak:goWeak,render:render,'));
  check('V37 Smart banner onclick survives', html.includes('__v27.render&&__v27.render()'));
  for (const frag of ['function resolveLethal(Ff){', 'partial:!!partial', "wind:'stone_wind'", '_sxp36', 'v21emailbtn', 'z-index:1600', 'z-index:1700', 'NGHỀ NGHIỆP']) {
    check(`V36 fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  check('V17-4 typo still gone', countOcc(html, 'NGHỀNGHIỆP') === 0);
  for (const frag of ['__V33_DATA.byId(id)', 'QUEST_MIN_ACC=0.8', '__v34.breakDmg(F)', 'weakCountInPool(F.weak,pool)===0', '__V35_DATA?__V35_DATA.bosses:[]', 'var TOTAL_BOSSES=86;', 'GEAR_GOLEM=\'v17_geargolem\'', '/* V31 (F-01):']) {
    check(`older fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  check('TOTAL_BOSSES still 86', html.includes('var TOTAL_BOSSES=86;') && !html.includes('var TOTAL_BOSSES=78;'));
  // Deliberately UNCHANGED by V40 (needs Anh): legDiff still has the
  // counts-getter bug exactly as in V18.4.
  check('legDiff UNCHANGED (counts-getter bug kept, needs Anh)', html.includes("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}"));
  check('v40 layer files present in DIR', fs.existsSync(path.join(DIR, 'v40.js')) && fs.existsSync(path.join(DIR, 'v40.css')));
  for (const f of ['v15.js', 'v18.js', 'v19.js', 'v20_sync.js', 'v22.js', 'v23.js', 'v27.js', 'v34.js']) {
    const a = fs.readFileSync(path.join(ROOT, 'src', f), 'utf-8');
    const b = fs.existsSync(path.join(DIR, f)) ? fs.readFileSync(path.join(DIR, f), 'utf-8') : '';
    check(`src/${f} agrees with out/${f}`, a === b);
  }
  check('src/v40.js agrees with out/v40.js', fs.readFileSync(path.join(ROOT, 'src', 'v40.js'), 'utf-8') === fs.readFileSync(path.join(DIR, 'v40.js'), 'utf-8'));
  check('src/v40.css agrees with out/v40.css', fs.readFileSync(path.join(ROOT, 'src', 'v40.css'), 'utf-8') === fs.readFileSync(path.join(DIR, 'v40.css'), 'utf-8'));
  // Every touched src file differs from the pristine V18.4 backup ONLY
  // inside its V40 replacements. Line-multiset diff for v20_sync.js:
  // the ONLY removed line is the old plan line; the ONLY added lines
  // are the two V40 blocks (ko16 15 lines + plan 24 lines = 39).
  const d20 = fs.readFileSync(path.join(ROOT, 'src', 'v20_sync.js'), 'utf-8');
  const d20p = fs.readFileSync(path.join(ROOT, 'tools', 'v40', 'backup-v18.4', 'src__v20_sync.js'), 'utf-8');
  const cnt = {};
  d20.split('\n').forEach(l => { cnt[l] = (cnt[l] || 0) + 1; });
  const cntP = {};
  d20p.split('\n').forEach(l => { cntP[l] = (cntP[l] || 0) + 1; });
  const onlyA = [], onlyB = [];
  for (const l in cnt) { const d = cnt[l] - (cntP[l] || 0); for (let i = 0; i < d; i++) onlyA.push(l); }
  for (const l in cntP) { const d = cntP[l] - (cnt[l] || 0); for (let i = 0; i < d; i++) onlyB.push(l); }
  check('src/v20_sync.js vs pristine: exactly 1 removed line (the old plan line)', onlyB.length === 1 && onlyB[0].indexOf('m27.plan=n27p.plan!==undefined') >= 0, onlyB);
  check('src/v20_sync.js vs pristine: exactly 39 added lines (the two V40 blocks)', onlyA.length === 39, onlyA.length);
  check('src/v20_sync.js added lines include the ko16 branch + plan merge', onlyA.some(l => l.indexOf("else if(kk==='ko16'){") >= 0) && onlyA.some(l => l.indexOf('m27.plan=mp;') >= 0), onlyA.slice(0, 3));

  // ================= §L page load (vm, real inline scripts) =================
  section('§L', 'page load (vm, real inline scripts)');
  const ctx = makeCtx();
  dynIds.add('v15body');
  dynIds.add('v27body');
  dynIds.add('v19zonedetail');
  dynIds.add('v18fight');
  dynIds.add('v19fight');
  dynIds.add('v18colldetail');
  dynIds.add('v22bs-lib');
  dynIds.add('v22bs-type');
  dynIds.add('v22bs-status');
  // BT JSON served from disk through the sandbox fetch (ensureData fetches
  // 'basic_tactics_vocabulary.json'; see test39 H-38-1).
  const btJson = fs.readFileSync(path.join(ROOT, 'out', 'basic_tactics_vocabulary.json'), 'utf-8');
  ctx.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(btJson) });
  const loaded = loadPage(ctx, html);
  check('inline script blocks extracted (>=30)', loaded.blocks >= 30, loaded.blocks);
  check('all inline scripts evaluate without error', loaded.loadErr === null, loaded.loadErr);
  if (loaded.loadErr) { console.log(`\ntest40 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15/__v17/__v22/__v27/__v40 present',
    E(ctx, `!!window.__v15 && !!window.__v17 && !!window.__v22 && !!window.__v27 && !!window.__v40`));
  check('__v40.version is 18.5.0', E(ctx, `window.__v40.version`) === '18.5.0');
  check('R-V40 checkPhase exported on both engines', E(ctx, `typeof window.__v18._test.checkPhase==='function' && typeof window.__v19._test.checkPhase==='function'`));
  check('R-V40 __v22._test.reset exported (B-8 test helper)', E(ctx, `typeof window.__v22._test.reset==='function'`));
  E(ctx, `window.__v15.buildWords()`);
  const nWords = E(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);

  // ================= §40A C-01 ko16 merge =================
  section('§40A', 'C-01 ko16 safe-merge (SEVERE fix)');
  const ko16 = E(ctx, `(function(){
    var m=window.__v20sync.mergeSaves;
    var L={cards:[],xp:0,v7:{ko16:{levels:{cardA:3,cardB:2}}}};
    var C={cards:[],xp:0,v7:{ko16:{levels:{cardA:1,cardC:5}}}};
    return m(L,C,1000,2000).v7.ko16; // cloud newer
  })()`);
  check('C-01 cloud-newer: cardA keeps MAX 3 (not downgraded to 1)', ko16.levels.cardA === 3, ko16);
  check('C-01 cloud-newer: cardB (local-only) survives', ko16.levels.cardB === 2, ko16);
  check('C-01 cloud-newer: cardC (cloud-only) present', ko16.levels.cardC === 5, ko16);
  const ko16b = E(ctx, `(function(){
    var m=window.__v20sync.mergeSaves;
    var L={cards:[],xp:0,v7:{ko16:{levels:{cardA:3,cardB:2},note:'local'}}};
    var C={cards:[],xp:0,v7:{ko16:{levels:{cardA:1,cardC:5},note:'cloud'}}};
    return m(L,C,2000,1000).v7.ko16; // local newer — merge is symmetric for MAX
  })()`);
  check('C-01 local-newer: same MAX result (symmetric)', ko16b.levels.cardA === 3 && ko16b.levels.cardB === 2 && ko16b.levels.cardC === 5, ko16b);
  check('C-01 other ko16 keys: local-first fill-if-missing', ko16b.note === 'local', ko16b);
  const ko16c = E(ctx, `(function(){
    var m=window.__v20sync.mergeSaves;
    var L={cards:[],xp:0,v7:{}};
    var C={cards:[],xp:0,v7:{ko16:{levels:{cardX:7}}}};
    return m(L,C,1000,2000).v7.ko16;
  })()`);
  check('C-01 one-sided ko16: cloud-only key adopted whole', ko16c && ko16c.levels && ko16c.levels.cardX === 7, ko16c);

  // ================= §40B C-07 Smart plan merge =================
  section('§40B', 'C-07 Smart plan merge (per-language)');
  const planSameDay = E(ctx, `(function(){
    var m=window.__v20sync.mergeSaves;
    function d27(enP,koP){ return {v:1,created:1,en:{last:{},cw:{},cr:{}},ko:{right:{},wrong:{},cw:{},cr:{},last:{}},plan:{en:enP,ko:koP},sessions:[],days:{},streak:{en:{d:'',n:0},ko:{d:'',n:0}},claimed:{},uiLang:'en'}; }
    function P(d,ids,done,g){ return {d:d,mins:10,newN:5,dueN:10,weakN:5,ids:ids,doneIds:done,goals:g}; }
    var L={cards:[],xp:0,v7:{en27:d27(P('2026-11-20',['w1'],['w1'],{complete:true,acc80:false,weak5:false}), P('2026-11-20',['k1'],[],{complete:false,acc80:false,weak5:false}))}};
    var C={cards:[],xp:0,v7:{en27:d27(P('2026-11-20',['w2'],[],{complete:false,acc80:true,weak5:false}), P('2026-11-20',['k2'],['k2'],{complete:true,acc80:false,weak5:true}))}};
    return m(L,C,1000,2000).v7.en27.plan; // cloud newer
  })()`);
  check('C-07 same-day EN: ids union w1+w2', JSON.stringify((planSameDay.en.ids || []).slice().sort()) === JSON.stringify(['w1', 'w2']), planSameDay.en);
  check('C-07 same-day EN: doneIds union keeps w1', JSON.stringify((planSameDay.en.doneIds || []).slice().sort()) === JSON.stringify(['w1']), planSameDay.en);
  check('C-07 same-day EN: complete recomputed false (w2 not done)', planSameDay.en.goals.complete === false, planSameDay.en.goals);
  check('C-07 same-day EN: acc80 ORed true', planSameDay.en.goals.acc80 === true, planSameDay.en.goals);
  check('C-07 same-day KO: ids union k1+k2, doneIds k2', JSON.stringify((planSameDay.ko.ids || []).slice().sort()) === JSON.stringify(['k1', 'k2']) && JSON.stringify((planSameDay.ko.doneIds || []).slice().sort()) === JSON.stringify(['k2']), planSameDay.ko);
  check('C-07 same-day KO: complete false, weak5 ORed true', planSameDay.ko.goals.complete === false && planSameDay.ko.goals.weak5 === true, planSameDay.ko.goals);
  const planDiffDay = E(ctx, `(function(){
    var m=window.__v20sync.mergeSaves;
    function d27(enP,koP){ return {v:1,created:1,en:{last:{},cw:{},cr:{}},ko:{right:{},wrong:{},cw:{},cr:{},last:{}},plan:{en:enP,ko:koP},sessions:[],days:{},streak:{en:{d:'',n:0},ko:{d:'',n:0}},claimed:{},uiLang:'en'}; }
    function P(d,ids,done,g){ return {d:d,mins:10,newN:5,dueN:10,weakN:5,ids:ids,doneIds:done,goals:g}; }
    var L={cards:[],xp:0,v7:{en27:d27(P('2026-11-19',['w1'],['w1'],{complete:true,acc80:true,weak5:false}), P('2026-11-19',['k1'],['k1'],{complete:true,acc80:false,weak5:false}))}};
    var C={cards:[],xp:0,v7:{en27:d27(P('2026-11-20',['w2'],[],{complete:false,acc80:false,weak5:false}), {})}};
    return m(L,C,1000,2000).v7.en27.plan; // cloud newer
  })()`);
  check('C-07 different-day EN: newer plan wins (w2 only)', JSON.stringify(planDiffDay.en.ids) === JSON.stringify(['w2']), planDiffDay.en);
  check('C-07 different-day KO: older plan survives when newer has none (k1)', JSON.stringify(planDiffDay.ko.ids) === JSON.stringify(['k1']), planDiffDay.ko);

  // ================= §40C C-02 team skill vs shield =================
  section('§40C', 'C-02 team-skill damage through the shield (MAJOR fix)');
  E(ctx, `(function(){
    var e=window.__v18.en18();
    ['v10_slime','v10_fairy','v10_dragon','v10_ghost','v10_spider','v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){ e.bosses[id]={win:1,wins:1,at:Date.now(),item:'x'}; });
    S.v7.en23={pets:{p1:{id:'p1',sp:'dragon',st:1,lv:10,xp:0,aff:0}},team:['p1',null,null],eggs:{fire:1,forest:1},hatch:null,mats:{},claimed:{},affClaimed:{},created:1};
    window.__T40_MSGS=[];
    var orig=window.__v15.pop15;
    window.__v15.pop15=function(t){ window.__T40_MSGS.push(String(t)); try{ return orig(t); }catch(e){} };
  })()`);
  const shield0 = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_panda','en');
      var F=window.__v18._test.F();
      out.ok=!!F; out.hp=F?F.hp:null; out.shield=F?F.shield:null;
      out.pet=!!(F&&F.pet); out.activeVal=F&&F.pet?F.pet.activeVal:null;
      out.energy=F&&F.pet?F.pet.energy:null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-02 panda fight opens with shield 30, pet team joined (activeVal 50)', shield0.ok === true && shield0.hp === 150 && shield0.shield === 30 && shield0.pet === true && shield0.activeVal === 50, shield0);
  const shield1 = E(ctx, `(function(){
    var out={};
    try{
      var F=window.__v18._test.F();
      F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v18._test.F();
      out.hp=F2.hp; out.shield=F2.shield; out.over=F2.over;
      out.msg=window.__T40_MSGS[window.__T40_MSGS.length-1]||null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-02 team skill (50) vs shield 30: HP 150->125 (halved)', shield1.hp === 125, shield1);
  check('C-02 team skill: shield absorbs the dealt damage (30->5)', shield1.shield === 5, shield1);
  check('C-02 team skill: toast states the dealt 25, not the raw 50', typeof shield1.msg === 'string' && shield1.msg.indexOf('Gây 25 sát thương') >= 0 && shield1.msg.indexOf('Khiên boss chặn một nửa.') >= 0, shield1);
  check('C-02 team skill: fight still open (non-lethal)', shield1.over === null || shield1.over === undefined, shield1);
  // Phase re-run: a non-lethal skill that drops a Legendary boss below
  // 50% must trigger P2 at once (previously the phase waited for the
  // next answered question).
  const leg0 = J(ctx, `JSON.stringify({id:window.__V18_BOSSES.leg[0].id, hp:window.__V18_BOSSES.leg[0].hp})`);
  const phase = E(ctx, `(function(){
    var out={};
    try{
      window.__v18._test.close();
      window.__v18.fight('${leg0.id}','en');
      var F=window.__v18._test.F();
      out.started=!!F; out.maxHp=F?F.maxHp:null; out.phase0=F?F.phase:null;
      F.hp=Math.floor(F.maxHp/2)+10;
      F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v18._test.F();
      out.hp=F2.hp; out.phase=F2.phase; out.banner=F2.banner;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-02 Legendary: skill drops boss below 50% -> phase becomes 2 at once', phase.started === true && phase.phase === 2, phase);
  check('C-02 Legendary: phase-2 banner set', typeof phase.banner === 'string' && phase.banner.indexOf('Giai đoạn 2') >= 0, phase);
  // Lethal skill still resolves the fight (V36 path intact).
  const lethal = E(ctx, `(function(){
    var out={};
    try{
      window.__v18._test.close();
      window.__v18.fight('v10_panda','en');
      var F=window.__v18._test.F();
      F.hp=20; F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v18._test.F();
      out.hp=F2.hp; out.over=F2.over;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-02 lethal skill (25 dealt vs 20 HP): fight resolves as a win', lethal.hp === 0 && lethal.over === 'win', lethal);

  // ================= §40D B-8 BT fresh-load guards =================
  section('§40D', 'B-8 BT scope on a fresh load (MAJOR fix)');
  // Fresh-load state: BT data never attached in this vm yet (no earlier
  // section called ensureData). Set the BT scope, then open Flashcards
  // directly — the V18.4 repro showed "no words" here.
  E(ctx, `window.__v15.en15().scope={kind:'lib',lib:'bt',unit:2}`);
  const loading = E(ctx, `(function(){
    window.__v15.startMode('flash');
    var b=document.getElementById('v15body');
    return b?String(b.innerHTML||''):null;
  })()`);
  check('B-8 startMode with BT scope on a fresh load shows a loading state (not "no words")', !!loading && loading.indexOf('Đang tải bộ từ Basic Tactics') >= 0 && loading.indexOf('Không có từ nào') < 0, loading);
  await sleep(800);
  const afterLoad = E(ctx, `(function(){
    var b=document.getElementById('v15body');
    var words=[];
    try{ words=window.__v15.wordsFiltered({level:'ALL'}); }catch(e){}
    return {body:b?String(b.innerHTML||''):null, n:words.length, bt:!!window.__V22_BT};
  })()`);
  check('B-8 after BT data loads: BT data is attached', afterLoad.bt === true, afterLoad);
  check('B-8 after BT data loads: the BT scope yields words', afterLoad.n > 0, afterLoad);
  check('B-8 after BT data loads: Flashcards starts (no "no words")', (afterLoad.body || '').indexOf('Không có từ nào') < 0, afterLoad);
  check('B-8 after BT data loads: Flashcards head renders', (afterLoad.body || '').indexOf('Flashcards') >= 0, afterLoad);
  // reviewStart guard: force the fresh state again, then review.
  E(ctx, `window.__v22._test.reset()`);
  E(ctx, `window.__v15.en15().scope={kind:'lib',lib:'bt',unit:2}`);
  E(ctx, `window.__v15.reviewStart(false)`);
  await sleep(800);
  const rev = E(ctx, `(function(){
    var b=document.getElementById('v15body');
    var words=[];
    try{ words=window.__v15.wordsFiltered({level:'ALL'}); }catch(e){}
    return {body:b?String(b.innerHTML||''):null, n:words.length, bt:!!window.__V22_BT};
  })()`);
  check('B-8 reviewStart with BT scope on a fresh load: BT data is attached', rev.bt === true, rev);
  check('B-8 reviewStart with BT scope on a fresh load: the BT scope yields words', rev.n > 0, rev);
  check('B-8 reviewStart with BT scope on a fresh load: no "no words" empty state', (rev.body || '').indexOf('Không có từ nào cần ôn') < 0, rev);
  // learnHTML prefetch: force the fresh state, open the learn tab, wait.
  // choose('en') first: it creates the hub shell (#v15hub) without which
  // renderHub/renderTab never run in the vm stub DOM.
  E(ctx, `window.__v22._test.reset()`);
  E(ctx, `window.__v15.en15().scope={kind:'lib',lib:'bt',unit:2}`);
  E(ctx, `window.__v15.choose('en'); window.__v15.tab('learn')`);
  await sleep(800);
  const pre = E(ctx, `(function(){ return {bt:!!window.__V22_BT}; })()`);
  check('B-8 learnHTML prefetch: opening the learn tab with a BT scope loads the BT data', pre.bt === true, pre);
  // With BT data attached, startMode starts immediately (no loading state).
  const direct = E(ctx, `(function(){
    window.__v15.startMode('flash');
    var b=document.getElementById('v15body');
    return b?String(b.innerHTML||''):null;
  })()`);
  check('B-8 with BT data attached: startMode starts at once (no loading state)', !!direct && direct.indexOf('Đang tải bộ từ Basic Tactics') < 0 && direct.indexOf('Flashcards') >= 0, direct);
  // Clear the scope for the later sections.
  E(ctx, `window.__v15.clearScope()`);

  // ================= §40E A-F2/A-N1 koWarn =================
  section('§40E', 'A-F2/A-N1 KO warning banner lasts the whole fight');
  const seedCards = J(ctx, `JSON.stringify(S.cards)`);
  check('seed save still has 20 KO cards at this point', seedCards.length === 20, seedCards.length);
  E(ctx, `S.cards = ${JSON.stringify(seedCards.slice(0, 5))}`);
  const warn18 = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_slime','ko');
      var F=window.__v18._test.F();
      out.banner=F?F.banner:null; out.koWarn=F?F.koWarn:null; out.q=F?F.q:null;
      window.__v18._test.pickCorrect();
      window.__v18._test.next();
      var F2=window.__v18._test.F();
      out.banner2=F2?F2.banner:null; out.koWarn2=F2?F2.koWarn:null; out.q2=F2?F2.q:null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('A-F2 V18 Q1: banner shows exactly 5/8', warn18.banner === '⚠️ Bạn mới có 5/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.', warn18);
  check('A-F2 V18 Q1: koWarn holds the same string', warn18.koWarn === warn18.banner, warn18);
  check('A-F2 V18 Q2: banner SURVIVES next() (was cleared before)', warn18.banner2 === warn18.banner && warn18.q2 === 1, warn18);
  const warn19 = E(ctx, `(function(){
    var out={};
    try{
      window.__v19._test.close();
      window.__v19.openMapFor('ko');
      window.__v19.fight('v11_fireking');
      var F=window.__v19._test.F();
      out.banner=F?F.banner:null; out.koWarn=F?F.koWarn:null;
      window.__v19._test.pickCorrect();
      window.__v19._test.next();
      var F2=window.__v19._test.F();
      out.banner2=F2?F2.banner:null; out.q2=F2?F2.q:null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('A-F2 V19 Q1: banner shows exactly 5/8', warn19.banner === '⚠️ Bạn mới có 5/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.', warn19);
  check('A-F2 V19 Q2: banner SURVIVES next() (was cleared before)', warn19.banner2 === warn19.banner && warn19.q2 === 1, warn19);
  E(ctx, `S.cards = ${JSON.stringify(seedCards)}`);
  const warnFull = E(ctx, `(function(){
    var out={};
    try{
      window.__v18._test.close();
      window.__v18.fight('v10_slime','ko');
      var F=window.__v18._test.F();
      out.banner18=F?F.banner:null; out.koWarn18=F?F.koWarn:null;
      window.__v19._test.close();
      window.__v19.openMapFor('ko');
      window.__v19.fight('v11_fireking');
      var F2=window.__v19._test.F();
      out.banner19=F2?F2.banner:null; out.koWarn19=F2?F2.koWarn:null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('A-N1 20 cards: V18 KO fight has no banner and koWarn is null', warnFull.banner18 === null && warnFull.koWarn18 === null, warnFull);
  check('A-N1 20 cards: V19 KO fight has no banner and koWarn is null', warnFull.banner19 === null && warnFull.koWarn19 === null, warnFull);

  // ================= §40F A-F1 / C-04 / C-05 / C-06 =================
  section('§40F', 'A-F1 Break label, C-04 replay count, C-05 copy, C-06 sc2');
  const seedDeck = seedCards.length ? seedCards[0].d : '';
  E(ctx, `S.deck = ${JSON.stringify(seedDeck)}`);
  const brk = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_slime','ko');
      var F=window.__v18._test.F();
      out.bar=window.__v34.breakBarHTML(F);
      var h=document.getElementById('v18fight');
      out.fightHtml=h?String(h.innerHTML||''):null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('A-F1 KO Break bar says "từ tiếng Hàn của bạn" (not "bộ từ đã chọn")', (brk.bar || '').indexOf('từ tiếng Hàn của bạn') >= 0 && (brk.bar || '').indexOf('bộ từ tiếng Hàn đã chọn') < 0, brk.bar);
  check('A-F1 KO Break bar renders in the fight HTML with the new label', (brk.fightHtml || '').indexOf('từ tiếng Hàn của bạn') >= 0, brk.fightHtml);
  E(ctx, `(function(){
    var e=window.__v19.en19();
    e.bosses['v11_fireking']={en:{win:1,wins:3,stars:2,best:0},ko:{win:1,wins:1,stars:1,best:0}};
    var e18=window.__v18.en18();
    e18.bosses['v10_slime']={win:1,wins:2,at:Date.now(),item:'x'};
  })()`);
  const det = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.collDetail('v11_fireking');
      var h=document.getElementById('v18colldetail'); out.map=h?String(h.innerHTML||''):null;
      window.__v18.collDetail('v10_slime');
      out.arena=h?String(h.innerHTML||''):null;
      var oldId=window.__V18_BOSSES.old[0].id;
      window.__v18.collDetail(oldId);
      out.old=h?String(h.innerHTML||''):null; out.oldId=oldId;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-04 map boss detail shows the summed replay count "(4 lần)"', (det.map || '').indexOf('(4 lần)') >= 0 && (det.map || '').indexOf('Đã thắng') >= 0, det.map);
  check('C-04 arena boss detail still shows its count "(2 lần)"', (det.arena || '').indexOf('(2 lần)') >= 0, det.arena);
  check('C-04 old-arena boss detail shows no count (no wins field exists)', (det.old || '').indexOf('lần)') < 0, det.old);
  const copy = E(ctx, `(function(){
    var out={};
    try{
      window.__v15.choose('en'); window.__v15.tab('bosses');
      var b=document.getElementById('v15body'); out.arena=b?String(b.innerHTML||''):null;
      window.__v15.tab('collection');
      out.coll=b?String(b.innerHTML||''):null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-05 arenas button shows the live count "(86 boss)"', (copy.arena || '').indexOf('(86 boss)') >= 0, copy.arena);
  check('C-05 arenas button no longer says "(40 boss)"', (copy.arena || '').indexOf('(40 boss)') < 0, copy.arena);
  check('C-05 Collection subtitle names Chrono Kingdom', (copy.coll || '').indexOf('Chrono Kingdom (V17)') >= 0, copy.coll);
  check('C-05 Collection subtitle names Skyroot Sanctuary', (copy.coll || '').indexOf('Skyroot Sanctuary (V18)') >= 0, copy.coll);
  // C-06: force the wordPool fallback by stubbing wordsFiltered to return
  // [] on the scope-less call, and record the scope it receives next.
  const sc2a = E(ctx, `(function(){
    var out={};
    try{
      var orig=window.__v15.wordsFiltered;
      var seen=[];
      window.__v15.wordsFiltered=function(args){
        if(args && args.scope){ seen.push(args.scope); }
        if(!args || !args.scope){ return []; }
        return orig.call(window.__v15, args);
      };
      window.__v15.en15().scope={kind:'lib',lib:'a1a2',topic:'a1_colors-and-shapes'};
      window.__v18.fight('v10_slime','en');
      var F=window.__v18._test.F();
      out.seenScopes=seen;
      out.poolTopics=F&&F.pools&&F.pools.words?F.pools.words.map(function(w){return w.t}):null;
      out.poolIds=F&&F.pools&&F.pools.words?F.pools.words.map(function(w){return w.id}):null;
      window.__v15.wordsFiltered=orig;
      window.__v18._test.close();
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-06 a1a2: the fallback scope keeps topic', sc2a.seenScopes.length === 1 && sc2a.seenScopes[0].topic === 'a1_colors-and-shapes', sc2a.seenScopes);
  // The topic pool is NOT w.t-pure by design: inScope15 also matches via
  // a1a2Topics/a1a2Topic (V7 words legitimately belong to the topic —
  // it is named 'FRUIT AND VEGETABLES'). The correct C-06 assertion is
  // that the fallback pool EQUALS the direct scoped pool for the same
  // topic (old code would have returned the whole 995-word library).
  const expectedA1 = E(ctx, `JSON.stringify(window.__v15.wordsFiltered({scope:{kind:'lib',lib:'a1a2',topic:'a1_colors-and-shapes'},level:'ALL'}).map(function(w){return w.id}).sort())`);
  const gotA1 = JSON.stringify((sc2a.poolIds || []).slice().sort());
  check('C-06 a1a2: the fallback pool is exactly the topic pool (54 words, not the whole library)', gotA1 === expectedA1 && (sc2a.poolIds || []).length === 54, { got: (sc2a.poolIds || []).length, expected: 54 });
  const sc2o = E(ctx, `(function(){
    var out={};
    try{
      var orig=window.__v15.wordsFiltered;
      var seen=[];
      window.__v15.wordsFiltered=function(args){
        if(args && args.scope){ seen.push(args.scope); }
        if(!args || !args.scope){ return []; }
        return orig.call(window.__v15, args);
      };
      window.__v15.en15().scope={kind:'lib',lib:'oxford',lesson:12};
      window.__v18.fight('v10_slime','en');
      var F=window.__v18._test.F();
      out.seenScopes=seen;
      out.pool=F&&F.pools&&F.pools.words?F.pools.words.map(function(w){return {id:w.id,les:w.oxLesson,less:w.oxLessons}}):null;
      window.__v15.wordsFiltered=orig;
      window.__v18._test.close();
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-06 oxford: the fallback scope keeps lesson', sc2o.seenScopes.length === 1 && sc2o.seenScopes[0].lesson === 12, sc2o.seenScopes);
  check('C-06 oxford: the fallback pool is exactly the 25 words of Bài 12', Array.isArray(sc2o.pool) && sc2o.pool.length === 25 && sc2o.pool.every(function (w) { return w.les === 12 || (w.less || []).indexOf(12) >= 0; }), sc2o.pool);
  E(ctx, `window.__v15.clearScope()`);

  // ================= §40G C-10 partial sessions =================
  section('§40G', 'C-10 partial Smart sessions must not tick plan goals');
  const ids10 = J(ctx, `JSON.stringify(window.__v15.words.slice(0,10).map(function(w){return w.id}))`);
  // Seed 5 of the 10 as WEAK (wrong 3 > right 0) so weakFixed can reach 5.
  E(ctx, `(function(){
    var e=S.v7.en||(S.v7.en={}); e.wrong=e.wrong||{}; e.right=e.right||{};
    ${JSON.stringify(ids10.slice(0, 5))}.forEach(function(id){ e.wrong[id]=3; e.right[id]=0; });
  })()`);
  // PARTIAL: answer the 5 weak words correctly (5/5, 100%), then endEarly.
  E(ctx, `(function(){
    var d=window.__v27.en27();
    d.plan.en={d:new Date().toDateString(),mins:10,newN:5,dueN:10,weakN:5,ids:${JSON.stringify(ids10)},doneIds:[],goals:{complete:false,acc80:false,weak5:false}};
    window.__v27.startSession('en', ${JSON.stringify(ids10)}, 'plan');
  })()`);
  for (let i = 0; i < 5; i++) { E(ctx, `window.__v27.answerMC(null,true,null); window.__v27.nextQ();`); }
  E(ctx, `window.__v27.endEarly()`);
  const partial = J(ctx, `JSON.stringify({goals:window.__v27.en27().plan.en.goals, rec:window.__v27.en27().sessions[0]})`);
  check('C-10 partial 5/5 session: recorded as partial:true', partial.rec.partial === true, partial.rec);
  check('C-10 partial 5/5 session: acc80 stays false (was true before the fix)', partial.goals.acc80 === false, partial.goals);
  check('C-10 partial 5/5 session: weak5 stays false (5 weak words fixed, was true before)', partial.goals.weak5 === false, partial.goals);
  check('C-10 partial 5/5 session: complete stays false', partial.goals.complete === false, partial.goals);
  // COMPLETE: answer all 10 correctly and let the session finish.
  E(ctx, `(function(){
    var d=window.__v27.en27();
    d.plan.en={d:new Date().toDateString(),mins:10,newN:5,dueN:10,weakN:5,ids:${JSON.stringify(ids10)},doneIds:[],goals:{complete:false,acc80:false,weak5:false}};
    window.__v27.startSession('en', ${JSON.stringify(ids10)}, 'plan');
  })()`);
  for (let i = 0; i < 10; i++) { E(ctx, `window.__v27.answerMC(null,true,null); window.__v27.nextQ();`); }
  const complete = J(ctx, `JSON.stringify({goals:window.__v27.en27().plan.en.goals, rec:window.__v27.en27().sessions[0]})`);
  check('C-10 complete 10/10 session: recorded as partial:false', complete.rec.partial === false, complete.rec);
  check('C-10 complete 10/10 session: acc80 true', complete.goals.acc80 === true, complete.goals);
  check('C-10 complete 10/10 session: complete true (all doneIds filled)', complete.goals.complete === true, complete.goals);

  // ================= §40H C-12 picker empty Units =================
  section('§40H', 'C-12 picker "Bỏ chọn tất cả" + Áp dụng (MINOR fix)');
  E(ctx, `(function(){
    document.querySelectorAll=function(sel){
      if(sel==='#v22bs-chips .v15pill.on') return window.__T40_CHIPS||[];
      return [];
    };
    window.__T40_CHIPS=[];
    document.querySelector('#v22bs-lib').value='units';
  })()`);
  E(ctx, `window.__v15.en15().scope={kind:'lib',lib:'a1a2',topic:'a1_education'}`);
  E(ctx, `window.__v22.applyBossScope()`);
  const refused = J(ctx, `JSON.stringify(window.__v15.en15().scope)`);
  check('C-12 units + 0 chips: scope unchanged (not silently all-BT)', refused && refused.lib === 'a1a2' && refused.topic === 'a1_education', refused);
  E(ctx, `window.__T40_CHIPS=[{getAttribute:function(k){return '2'}}]; window.__v22.applyBossScope();`);
  await sleep(800);
  const applied = J(ctx, `JSON.stringify(window.__v15.en15().scope)`);
  check('C-12 units + 1 chip: scope becomes BT unit 2', applied && applied.lib === 'bt' && applied.unit === 2, applied);
  E(ctx, `document.querySelector('#v22bs-lib').value='all'; window.__T40_CHIPS=[]; window.__v22.applyBossScope();`);
  await sleep(800);
  const allBt = J(ctx, `JSON.stringify(window.__v15.en15().scope)`);
  check("C-12 lib 'all': still applies whole BT (unit unset)", allBt && allBt.lib === 'bt' && allBt.unit === undefined, allBt);
  E(ctx, `window.__v15.clearScope()`);

  // ================= §40R V18.4 regression =================
  section('§40R', 'V18.4 regression — picker, layers, pets, KO wiring');
  const arena0 = E(ctx, `(function(){
    var out={};
    try{ window.__v15.choose('en'); window.__v18.openArena('en'); }catch(e){ out.err=String(e); }
    try{ var h=document.getElementById('v15body'); out.html=h?String(h.innerHTML||''):null; }catch(e){ out.htmlErr=String(e); }
    return out;
  })()`);
  check('openArena renders without error', !arena0.err, arena0);
  const h0 = arena0.html || '';
  const optIdx = ['<option value=""', '<option value="a1a2"', '<option value="oxford"', '<option value="chrono"', '<option value="skyroot"', '<option value="all"', '<option value="units"'].map(s => h0.indexOf(s));
  check('V18.3 picker still lists all 7 lib options in order', optIdx.every(i => i >= 0) && optIdx.slice(1).every((v, i) => v > optIdx[i]), optIdx);
  check('V18.3 picker still shows the V38 sub-picker controls', h0.indexOf('id="v22bs-lib"') >= 0 && h0.indexOf('id="v22bs-sub"') >= 0, h0);
  check('V40 layer present (__v40 18.5.0)', E(ctx, `!!window.__v40 && window.__v40.version==='18.5.0'`));
  check('V39 layer still present (__v39 18.4.0)', E(ctx, `!!window.__v39 && window.__v39.version==='18.4.0'`));
  check('V38 layer still present (__v38 18.3.0)', E(ctx, `!!window.__v38 && window.__v38.version==='18.3.0'`));
  check('V37 layer still present (__v37 18.2.0)', E(ctx, `!!window.__v37 && window.__v37.version==='18.2.0'`));
  check('V36 layer still present (__v36 18.1.0)', E(ctx, `!!window.__v36 && window.__v36.version==='18.1.0'`));
  check('V35 layer still present (__v35 18.0.0)', E(ctx, `!!window.__v35 && window.__v35.version==='18.0.0'`));
  check('V34 layer still present (__v34 17.1.0)', E(ctx, `!!window.__v34 && window.__v34.version==='17.1.0'`));
  check('V33 layer still present (__v33 17.0.0)', E(ctx, `!!window.__v33 && window.__v33.version==='17.0.0'`));
  check('V32 layer still present (__v32 16.4.0)', E(ctx, `!!window.__v32 && window.__v32.version==='16.4.0'`));
  check('V31 layer still present (__v31 16.3.0)', E(ctx, `!!window.__v31 && window.__v31.version==='16.3.0'`));
  check('V27 layer still present (__v27 16.0.0)', E(ctx, `!!window.__v27 && window.__v27.version==='16.0.0'`));
  check('V37 renderHub export still a function', E(ctx, `typeof window.__v15.renderHub === 'function'`));
  check('V37 __v27.render still a function', E(ctx, `typeof window.__v27.render === 'function'`));
  check('V36 resolveLethal still exported (V17-2)', E(ctx, `typeof window.__v19._test.resolveLethal === 'function' && typeof window.__v18._test.resolveLethal === 'function'`));
  check('V36 breakBarHTML wrapper still active', E(ctx, `window.__v36.wrapped===true && typeof window.__v34._breakBarHTML_orig==='function'`));
  check('TOTAL_BOSSES still 86', E(ctx, `window.__v21 && window.__v21.TOTAL_BOSSES===86`) || html.includes('var TOTAL_BOSSES=86;'));
  check('Pet System still present (__v23)', E(ctx, `!!window.__v23`));
  check('V39 koCount18 still a function', E(ctx, `typeof window.__v18._test.F === 'function'`));
  // V18.4 KO recordAnswer wiring still works (spy, one call per answer).
  E(ctx, `(function(){
    window.__T40B = { calls: [] };
    var orig = window.__v27.recordAnswer;
    window.__T40B.orig = orig;
    window.__v27.recordAnswer = function(lang,id,ok,mode){ window.__T40B.calls.push([lang,id,ok,mode]); try{ return orig(lang,id,ok,mode); }catch(e){} };
  })()`);
  const koSpy = E(ctx, `(function(){
    var out={};
    try{
      window.__v18._test.close();
      window.__v18.fight('v10_slime','ko');
      var F=window.__v18._test.F();
      out.kid=F&&F.cur&&F.cur.k?F.cur.k.id:null;
      window.__v18._test.pickCorrect();
      out.calls=window.__T40B.calls.filter(function(c){ return c[1]===out.kid; });
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('V18.4 KO correct: recordAnswer called exactly once (ko, id, true, boss18)', koSpy.calls.length === 1 && koSpy.calls[0][0] === 'ko' && koSpy.calls[0][2] === true && koSpy.calls[0][3] === 'boss18', koSpy);

  // ================= §V save schema =================
  section('§V', 'save schema — no new key, no schema change');
  const sav = J(ctx, `JSON.stringify((function(){
    var out={};
    try{
      try{ window.__v15.clearScope(); }catch(e){}
      try{ if(window.__v20&&__v20.flush)__v20.flush(); }catch(e){}
      var s=JSON.parse(localStorage.getItem('hanvocab.v1')||'{}');
      out.hasV40=!!(s.v7&&s.v7.en40);
      out.hasEn15Scope=!!(s.v7&&s.v7.en15);
      out.scopeAfterTests=(s.v7&&s.v7.en15)?(s.v7.en15.scope||null):'n/a';
    }catch(e){ out.err=String(e); }
    var keys=[]; for(var i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));
    out.lsKeys=keys.sort();
    return out;
  })())`);
  check('no new en40 save key (V40 adds nothing to the save)', sav.hasV40 === false, sav);
  check('scope is null in the saved state after the clear tests', sav.scopeAfterTests === null, sav);
  check('no new localStorage key from V40 (only hanvocab.* keys)', sav.lsKeys.every(function (k) { return k.indexOf('hanvocab.') === 0; }), sav.lsKeys);

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('KO warning banner stays visible at Q2 in the real DOM (painted)', 'needs real Chrome — see verify-v40c.js');
  skipCheck('team-skill toast shows the halved damage live', 'needs real Chrome — see verify-v40c.js');
  skipCheck('BT scope + Flashcards on a fresh load in the real DOM', 'needs real Chrome — see verify-v40c.js');
  skipCheck('picker "Bỏ chọn tất cả" + Áp dụng shows the refuse toast live', 'needs real Chrome — see verify-v40c.js');
  skipCheck('Collection detail replay count + arenas button count, painted', 'needs real Chrome — see verify-v40c.js');
  skipCheck('360px viewport: no horizontal overflow, all controls ≥44px', 'needs real Chrome — see verify-v40c.js');
  skipCheck('live Firebase login/sync', 'never tested live in any version — Anh must run the FIREBASE_SETUP.md checklist');
  skipCheck('real phone touch / Safari', 'needs Anh\'s real-phone test');

  // ================= footer =================
  const total = pass + fail + skip;
  console.log(`\ntest40: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('test40 crashed:', e); process.exit(2); });
