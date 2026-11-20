// test41.js - V18.6 BUG FIXES III independent verification (Node vm).
// Harness scaffolding (localStorage/DOM stubs, vm loading, counters) is
// reused verbatim from tools/v40/test40.js (same lines 34-191); only the
// EXPECTED_SHA/EXPECTED_BYTES constants were updated to the V18.6 build.
// Usage: node tools/v41/test41.js [DIR]   (default: <repo>/out; pass the
//   unzipped ZIP dir for the packaged-ZIP run)
// Exit 0 = all runnable checks pass (skips reported, never passes).
// Covers (per task):
//   section 0 static build integrity (hash, title, markers, fragments, src/out agree,
//         V40 fragments that survive + the V41 fragments)
//   section L page load (vm, real inline scripts) + __v41 + exports
//   section 41A R1+R2 CA gate (in-flight normal answer is NOT a CA answer;
//         grammar/read/builder questions answerable under a skill-triggered CA;
//         resolveUltimate clamps caRight; R1b answer-triggered CA control 3/3)
//   section 41B C-02 shield regression (team skill halved vs shield, toast,
//         checkPhase re-runs after a non-lethal skill; lethal still resolves)
//   section 41C F1 no-opt save boots (load() defaults opt; study view renders)
//   section 41D F2 farm quiz single div (farmPlotTap removes the stale div)
//   section 41E F3 snapshot flush (importFile/backupImport flush before snapshot;
//         snapshot holds the dirty change; undo restores it)
//   section 41F F4 data dedup (raw rows 999/3395; deduped WORDS 995/3393;
//         VEHICLES 23, Oxford L38 24; may/May + side x2 untouched)
//   section 41G C-R2-2 nav CSS (v41.css min-width rule present; base crush rule kept above 640px)
//   section 41R V18.5 regression (all 12 V40 fixes: ko16 merge, plan merge,
//         BT guards, koWarn banner, break label, collection counts, sc2,
//         partial sessions, picker refuse, shield, checkPhase exports)
//   section V save schema (no en41 key, no new localStorage key)
//   section C Chrome-only (SKIP, never PASS)
// HONEST LIMITS: stub DOM (no real rendering/layout/touch/speech; innerHTML
// is a plain string, so the banner / detail / button texts are asserted on
// the arena HTML string and the exposed fight state F, not on painted
// pixels); the live fight pools, the painted banner at Q2, the 360/390px
// nav overlap measurement and the farm-quiz DOM timing are Chrome gates
// (verify-v41c.js / repro-v41.js), not asserted here; live-browser,
// real-phone and live-Firebase gates stay Chrome/Anh-only.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
const EXPECTED_SHA = 'f0576130e6ff53478727319fa54fd5d703d76717b42561c1b29b5c41849697eb';
const EXPECTED_BYTES = 2397154;
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


// ================= §0 static: build integrity =================
async function main() {
  const htmlPath = path.join(DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) { console.log(`FAIL: ${htmlPath} missing — run build_v41.py first`); process.exit(2); }
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(htmlPath)).digest('hex');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  section('§0', 'static — build integrity');
  check('out/index.html sha256 is the V18.6 build under test', sha === EXPECTED_SHA, sha);
  check('out/index.html is the V18.6 size', fs.statSync(htmlPath).size === EXPECTED_BYTES, fs.statSync(htmlPath).size);
  check('title is V18.6 Bug Fixes III', html.includes('<title>Korean &amp; English Vocab Farm V18.6 — Bug Fixes III'));
  check('__v41 + 18.6.0 present', html.includes('window.__v41') && html.includes("VERSION='18.6.0'"));
  check('__v33–__v40 + 17.0.0/17.1.0/18.0.0/18.1.0/18.2.0/18.3.0/18.4.0/18.5.0 still present', html.includes('window.__v33') && html.includes('window.__v34') && html.includes('window.__v35') && html.includes('window.__v36') && html.includes('window.__v37') && html.includes('window.__v38') && html.includes('window.__v39') && html.includes('window.__v40') && html.includes("VERSION='17.0.0'") && html.includes("VERSION='17.1.0'") && html.includes("VERSION='18.0.0'") && html.includes("VERSION='18.1.0'") && html.includes("VERSION='18.2.0'") && html.includes("VERSION='18.3.0'") && html.includes("VERSION='18.4.0'") && html.includes("VERSION='18.5.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0', '18.5.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v41', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v41', styleIds.join(','));
  check('script markers end v41', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v41', scriptIds.join(','));
  check('v41js after v40js', html.indexOf('id="v41js"') > html.indexOf('id="v40js"'));
  check('no v42 marker (no unshipped layer)', !html.includes('id="v42"') && !html.includes('id="v42js"'));
  for (const m of ['armV27Obs', 'rearmObserver', '_speakXp', 'V29 (F-05)']) {
    check(`out-of-scope marker absent: ${m}`, !html.includes(m));
  }
  // V41 fragments (one per replacement).
  check('R-V41 CA gate present x4 (answer + pick + pickCorrect + pickWrong)', countOcc(html, "indexOf('ca-')===0") === 4);
  check('R-V41 CA gate absent from nextQ (CA branch still sets qmode directly)', html.includes("F.qmode='ca-'+mode;F.caMode=mode;"));
  check('R-V41 resolveUltimate clamp present', html.includes('Math.min(3,F.caRight)'));
  check('R-V41 resolveUltimate old unclamped line gone', !html.includes('var b=F.boss,r=F.caRight;'));
  check('R-V41 load() opt default present', html.includes("if(!j.opt)j.opt={mode:'card',dir:'kv',group:'',due:false}"));
  check('R-V41 farmPlotTap stale-div removal present', html.includes("var old=$('#v15farmquiz');if(old)old.remove();"));
  check('R-V41 importFile pre-snapshot flush present (try{ flush(); } x2)', countOcc(html, 'try{ flush(); }catch(e){}') === 2);
  check('R-V41 backupImport pre-snapshot flush present (__v20.flush guard x6)', countOcc(html, "try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}") === 6);
  check('R-V41 nav min-width rule present (v41.css)', html.includes('flex:0 0 auto;min-width:64px'));
  check('R-V41 base <=640px crush rule still present (overridden by cascade, not edited)', html.includes(':root .tab{min-width:0;padding:6px 2px;font-size:10px}'));
  check('R-V41 F4: A1-A2 raw rows 999 in the inline block', countOcc(html, '"src": "a1a2"') === 999);
  check('R-V41 F4: Oxford raw rows 3395 in the inline block', countOcc(html, '"src": "oxford"') === 3395);
  check('R-V41 F4: dropped airplane row (no 864) gone', countOcc(html, '"no": 864}') === 0);
  check('R-V41 F4: dropped each-other row (ord 942) gone', countOcc(html, '"ord": 942') === 0);
  check('R-V41 F4: kept airplane row (no 863) present once', countOcc(html, '"no": 863}') === 1);
  check('R-V41 F4: kept each-other row (ord 941) present once', countOcc(html, '"ord": 941') === 1);
  // V40 fragments that survive (one per replacement group).
  check('R-V40 ko16 branch survives', html.includes("else if(kk==='ko16'){") && html.includes('m16k.levels=maxMap(l16k.levels, c16k.levels);'));
  check('R-V40 plan merge survives', html.includes('m27.plan=mp;'));
  check('R-V40 shield halving survives', html.includes("_fightF.hp=Math.max(0,(_fightF.hp||0)-dealt);") && html.includes('Khiên boss chặn một nửa.'));
  check('R-V40 checkPhase exports survive x2', countOcc(html, 'checkPhase:checkPhase') === 2);
  check('R-V40 B-8 guards survive x3', countOcc(html, "if(sc40&&sc40.kind==='lib'&&sc40.lib==='bt'") === 3);
  check('R-V40 koWarn banner survives x2', countOcc(html, "F.banner=F.koWarn='⚠️ Bạn mới có '+_kc40") === 2);
  check('R-V40 next() restores koWarn x2', countOcc(html, 'F.banner=F.koWarn||null;') === 2);
  check('R-V40 break label survives', html.includes("Điểm yếu: từ tiếng Hàn của bạn — '+cur"));
  check('R-V40 collection detail survives', html.includes("rec={wins:((r19.en&&r19.en.wins)||0)+((r19.ko&&r19.ko.wins)||0)}"));
  check('R-V40 arenas button + subtitle survive', html.includes("allBosses().length+' boss)") && html.includes('+ 8 boss Chrono Kingdom (V17) và 8 boss Skyroot Sanctuary (V18)'));
  check('R-V40 sc2 topic/lesson survives x2', countOcc(html, 'topic:sc.topic,lesson:sc.lesson};') === 2);
  check('R-V40 picker refuse survives', html.includes("if(lib==='units'&&!units.length){pop22('Chọn ít nhất 1 Unit.');return}"));
  // V39/V38/V37/V36 fragments survive (spot-checks).
  for (const frag of ['function koCount18(){', "recordAnswer('ko',k.id,ok,'boss18')", "recordAnswer('ko',k.id,ok,'boss19')", 'markKO(true,F.cur.k)', 'markKO19(ok,F.cur.k)']) {
    check(`V39 fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  for (const frag of ['topics:topics,lessons:lessons,topicName:topicName,scopeName:scopeName,', 'function bossLibChange(){', "bossSelectedSub('t')", "bossSelectedSub('s')"]) {
    check(`V38 fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  check('V37 renderHub export survives', html.includes('renderHub:renderHub'));
  check('V37 clearScope line survives', html.includes('if(v.renderHub)v.renderHub();else renderTab()'));
  for (const frag of ['function resolveLethal(Ff){', 'partial:!!partial', "wind:'stone_wind'", '_sxp36', 'v21emailbtn', 'z-index:1600', 'z-index:1700', 'NGHỀ NGHIỆP']) {
    check(`V36 fragment survives: ${frag.slice(0, 40)}`, html.includes(frag));
  }
  check('legDiff deliberately UNCHANGED (decision-blocked)', html.includes("function legDiff(){var m=0;try{m=V15().counts().mastered}catch(e){}"));
  check('C-R2-1 deliberately UNCHANGED: markKO/markKO19 V39 comment survives x2 (no XP award added)', countOcc(html, '/* V39 (V18.4): KO boss answers also feed Smart Learning (V27) —') === 2);
  check("lang:'both' count still 31", countOcc(html, "lang:'both'") === 31);
  check("lang:'en' count still 14", countOcc(html, "lang:'en'") === 14);
  check('NGHỀNGHIỆP typo still 0', countOcc(html, 'NGHỀNGHIỆP') === 0);

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
  dynIds.add('v15plots');
  const btJson = fs.readFileSync(path.join(ROOT, 'out', 'basic_tactics_vocabulary.json'), 'utf-8');
  ctx.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(btJson) });
  // FileReader / confirm / alert stubs (needed by the §41E import tests).
  ctx.FileReader = class FileReaderStub {
    constructor() { this.result = null; this.onload = null; }
    readAsText(f) { this.result = typeof f === 'string' ? f : (f && f.__text) || ''; if (this.onload) this.onload(); }
  };
  ctx.confirm = () => true;
  ctx.alert = () => {};
  const loaded = loadPage(ctx, html);
  check('inline script blocks extracted (>=30)', loaded.blocks >= 30, loaded.blocks);
  check('all inline scripts evaluate without error', loaded.loadErr === null, loaded.loadErr);
  if (loaded.loadErr) { console.log(`\ntest41 ABORTED at load: ${loaded.loadErr}`); process.exit(1); }
  fireDCL(ctx);
  check('DOMContentLoaded fired (init15 ran: v15langbar created)', E(ctx, `document.getElementById('v15langbar')!==null`));
  check('S (save) exists after load', E(ctx, `typeof S !== 'undefined' && !!S`));
  check('__v15/__v17/__v22/__v27/__v41 present',
    E(ctx, `!!window.__v15 && !!window.__v17 && !!window.__v22 && !!window.__v27 && !!window.__v41`));
  check('__v41.version is 18.6.0', E(ctx, `window.__v41.version`) === '18.6.0');
  check('R-V41 checkPhase exported on both engines', E(ctx, `typeof window.__v18._test.checkPhase==='function' && typeof window.__v19._test.checkPhase==='function'`));
  check('R-V41 __v22._test.reset exported (B-8 test helper)', E(ctx, `typeof window.__v22._test.reset==='function'`));
  E(ctx, `window.__v15.buildWords()`);
  const nWords = E(ctx, `window.__v15.words.length`);
  check('WORDS built (>4000)', nWords > 4000, nWords);

  // Shared pet-team seed for the fight sections (test40 §40C pattern).
  E(ctx, `(function(){
    var e=window.__v18.en18();
    ['v10_slime','v10_fairy','v10_dragon','v10_ghost','v10_spider','v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){ e.bosses[id]={win:1,wins:1,at:Date.now(),item:'x'}; });
    S.v7.en23={pets:{p1:{id:'p1',sp:'dragon',st:1,lv:10,xp:0,aff:0}},team:['p1',null,null],eggs:{fire:1,forest:1},hatch:null,mats:{},claimed:{},affClaimed:{},created:1};
  })()`);

  // ================= §41A R1+R2 CA gate =================
  section('§41A', 'R1+R2 skill-triggered Counterattack counts the in-flight answer / throws');
  // R1: fireking EN, MC Q0, skill drops HP 75 -> 25 (CA starts), answer the
  // in-flight question correctly: it must be a NORMAL answer now.
  const r1 = E(ctx, `(function(){
    var out={};
    try{
      window.__v19.openMapFor('en'); window.__v19.fight('v11_fireking');
      var F=window.__v19._test.F();
      out.opened=!!F; out.maxHp=F?F.maxHp:null; out.qmode0=F?F.qmode:null;
      F.hp=75; F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v19._test.F();
      out.afterSkill={hp:F2.hp, ultActive:F2.ultActive, caQ:F2.caQ, caRight:F2.caRight, phase:F2.phase};
      /* Top the boss back up to 200 HP before the in-flight answer:
         a crit (10% random) or weakness-break bonus on the answer can
         deal >=25 and lethally resolve the 25-HP boss via resolveLethal
         (ultActive=false, over='win'), which makes next() serve a
         normal question instead of CA Q1 — a flaky test, not a product
         bug (it bit run 2). ultActive is already true, so checkPhase
         will not re-fire; the CA still resolves from the topped-up HP. */
      F2.hp=200;
      var okPick=window.__v19._test.pickCorrect();
      var F3=window.__v19._test.F();
      out.pickOk=okPick;
      out.afterInflight={hp:F3.hp, caRight:F3.caRight, score:F3.score, right:F3.right, answered:F3.answered, qmode:F3.qmode, ultActive:F3.ultActive};
      window.__v19._test.next();
      var F4=window.__v19._test.F();
      out.afterNext={qmode:F4.qmode, caQ:F4.caQ, caRight:F4.caRight};
      for(var i=0;i<3;i++){ window.__v19._test.pickCorrect(); window.__v19._test.next(); }
      var F5=window.__v19._test.F();
      out.afterCA={caRight:F5.caRight, hearts:F5.hearts, phase:F5.phase, banner:F5.banner, over:F5.over, hp:F5.hp};
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('R1 fight opens (fireking HP 325, MC Q0)', r1.opened === true && r1.maxHp === 325 && r1.qmode0 === 'mc', r1);
  check('R1 skill drops HP 75->25 and starts the CA at once (caQ 0, caRight 0, P2)', r1.afterSkill.hp === 25 && r1.afterSkill.ultActive === true && r1.afterSkill.caQ === 0 && r1.afterSkill.caRight === 0 && r1.afterSkill.phase === 2, r1.afterSkill);
  check('R1 in-flight NORMAL answer is NOT a CA answer (caRight stays 0, HP drops from 200, score 1)', r1.pickOk === true && r1.afterInflight.caRight === 0 && r1.afterInflight.hp < 200 && r1.afterInflight.score === 1 && r1.afterInflight.right === 1, r1.afterInflight);
  check('R1 next() after the in-flight answer opens CA Q1 (qmode ca-*, caQ 1)', r1.afterNext.qmode && r1.afterNext.qmode.indexOf('ca-') === 0 && r1.afterNext.caQ === 1 && r1.afterNext.caRight === 0, r1.afterNext);
  check('R1 perfect run resolves 3/3 (caRight 3, hearts 5, P3, 3/3 banner)', r1.afterCA.caRight === 3 && r1.afterCA.hearts === 5 && r1.afterCA.phase === 3 && typeof r1.afterCA.banner === 'string' && r1.afterCA.banner.indexOf('3/3') >= 0, r1.afterCA);
  // R1b control: answer-triggered CA still resolves 3/3 (HP 70 start, one
  // correct answer triggers the CA — the trigger answer is NOT counted).
  const r1b = E(ctx, `(function(){
    var out={};
    try{
      window.__v19._test.close();
      window.__v19.openMapFor('en'); window.__v19.fight('v11_fireking');
      var F=window.__v19._test.F();
      F.hp=70;
      window.__v19._test.pickCorrect();
      var F2=window.__v19._test.F();
      out.trigger={ultActive:F2.ultActive, caRight:F2.caRight, hp:F2.hp};
      window.__v19._test.next();
      for(var i=0;i<3;i++){ window.__v19._test.pickCorrect(); window.__v19._test.next(); }
      var F3=window.__v19._test.F();
      out.afterCA={caRight:F3.caRight, hearts:F3.hearts, phase:F3.phase, banner:F3.banner};
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('R1b answer-triggered CA starts normally (trigger answer not counted, caRight 0, HP damaged)', r1b.trigger.ultActive === true && r1b.trigger.caRight === 0 && r1b.trigger.hp < 70, r1b.trigger);
  check('R1b answer-triggered CA resolves 3/3 (full break, hearts 5, P3)', r1b.afterCA.caRight === 3 && r1b.afterCA.hearts === 5 && r1b.afterCA.phase === 3 && typeof r1b.afterCA.banner === 'string' && r1b.afterCA.banner.indexOf('3/3') >= 0, r1b.afterCA);
  // R2 grammar: heavenknight EN, grammar Q0, skill 90 -> 40 (CA starts with
  // caMode undefined); pickCorrect must NOT throw and must answer normally.
  const r2g = E(ctx, `(function(){
    var out={};
    try{
      window.__v19._test.close();
      /* heavenknight is z5 idx1: seed the EN unlock chain (z1-z4 mains
         + phoenix) or fight() refuses with 'Boss này chưa mở khóa.' */
      var e19=window.__v19.en19();
      ['v11_fireking','v11_icelong','v11_thunderminotaur','v11_voidknight','v11_phoenix'].forEach(function(id){ e19.bosses[id]=e19.bosses[id]||{}; e19.bosses[id].en={win:1,wins:1,stars:3}; });
      window.__v19.openMapFor('en'); window.__v19.fight('v11_heavenknight');
      var F=window.__v19._test.F();
      out.opened=!!F; out.qmode0=F?F.qmode:null;
      F.hp=90; F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v19._test.F();
      out.afterSkill={hp:F2.hp, ultActive:F2.ultActive, caMode:(typeof F2.caMode==='undefined'?'undef':F2.caMode)};
      var okPick=window.__v19._test.pickCorrect();
      var F3=window.__v19._test.F();
      out.pickOk=okPick;
      out.afterPick={answered:F3.answered, caRight:F3.caRight, hp:F3.hp, score:F3.score};
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('R2 grammar fight opens (heavenknight, grammar Q0)', r2g.opened === true && r2g.qmode0 === 'grammar', r2g);
  check('R2 skill drops HP 90->40 and starts the CA with caMode undefined', (r2g.afterSkill||{}).hp === 40 && (r2g.afterSkill||{}).ultActive === true && (r2g.afterSkill||{}).caMode === 'undef', r2g.afterSkill);
  check('R2 grammar answer under the CA does NOT throw (pickCorrect true, answered set, damage dealt, caRight 0)', r2g.err === undefined && r2g.pickOk === true && (r2g.afterPick||{}).answered !== null && (r2g.afterPick||{}).caRight === 0 && (r2g.afterPick||{}).hp < 40, r2g);
  // R2 pickWrong on the same setup: must not throw either (same anchor).
  const r2w = E(ctx, `(function(){
    var out={};
    try{
      window.__v19._test.close();
      window.__v19.openMapFor('en'); window.__v19.fight('v11_heavenknight');
      var F=window.__v19._test.F();
      F.hp=90; F.pet.energy=10;
      window.__v23.castSkillInFight();
      var okPick=window.__v19._test.pickWrong();
      var F2=window.__v19._test.F();
      out.pickOk=okPick;
      out.afterPick={answered:F2.answered, caRight:F2.caRight, hearts:F2.hearts, banner:F2.banner};
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  /* heavenknight's elem skill is 'cleanse': the FIRST wrong answer
     costs 0 hearts by design ('Thanh Tẩy') — the point here is the
     wrong answer is processed as a NORMAL wrong (banner shows the
     cleanse, caRight stays 0), not as a CA answer and not a throw. */
  check('R2 pickWrong under the CA does NOT throw (wrong answer, cleanse absorbs it: hearts 5, caRight 0)', r2w.err === undefined && r2w.pickOk === true && (r2w.afterPick||{}).answered !== null && (r2w.afterPick||{}).caRight === 0 && (r2w.afterPick||{}).hearts === 5 && typeof (r2w.afterPick||{}).banner === 'string' && (r2w.afterPick||{}).banner.indexOf('Thanh Tẩy') >= 0, r2w);
  // R2 read: pandamaster EN, read Q0, skill-triggered CA, pickCorrect.
  const r2r = E(ctx, `(function(){
    var out={};
    try{
      window.__v19._test.close();
      /* pandamaster is z7 idx2: seed the EN unlock chain (z1-z6 mains
         + ancienttree + ninetails). */
      var e19b=window.__v19.en19();
      ['v11_fireking','v11_icelong','v11_thunderminotaur','v11_voidknight','v11_phoenix','v11_octopusking','v11_ancienttree','v11_ninetails'].forEach(function(id){ e19b.bosses[id]=e19b.bosses[id]||{}; e19b.bosses[id].en={win:1,wins:1,stars:3}; });
      window.__v19.openMapFor('en'); window.__v19.fight('v11_pandamaster');
      var F=window.__v19._test.F();
      out.opened=!!F; out.qmode0=F?F.qmode:null;
      F.hp=90; F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v19._test.F();
      out.afterSkill={hp:F2.hp, ultActive:F2.ultActive};
      var okPick=window.__v19._test.pickCorrect();
      var F3=window.__v19._test.F();
      out.pickOk=okPick;
      out.afterPick={answered:F3.answered, caRight:F3.caRight, hp:F3.hp};
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('R2 read fight opens (pandamaster, read Q0)', r2r.opened === true && r2r.qmode0 === 'read', r2r);
  check('R2 read answer under the CA does NOT throw (answered set, damage dealt, caRight 0)', r2r.err === undefined && r2r.pickOk === true && (r2r.afterPick||{}).answered !== null && (r2r.afterPick||{}).caRight === 0 && (r2r.afterPick||{}).hp < 90, r2r);
  /* R2 builder: use phoenix (mode 'builder', Q0 is builder) instead of
     fireking's mixed Q2 — the mixed-mode question order is shuffled,
     so Q2 is not deterministically builder. Phoenix is z5 idx0: seed
     the z1-z4 main wins to open the zone. */
  const r2b = E(ctx, `(function(){
    var out={};
    try{
      window.__v19._test.close();
      var e19c=window.__v19.en19();
      ['v11_fireking','v11_icelong','v11_thunderminotaur','v11_voidknight'].forEach(function(id){ e19c.bosses[id]=e19c.bosses[id]||{}; e19c.bosses[id].en={win:1,wins:1,stars:3}; });
      window.__v19.openMapFor('en'); window.__v19.fight('v11_phoenix');
      var F=window.__v19._test.F();
      out.qmode2=F?F.qmode:null;
      F.hp=90; F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v19._test.F();
      out.afterSkill={hp:F2.hp, ultActive:F2.ultActive};
      var okPick=window.__v19._test.pickCorrect();
      var F3=window.__v19._test.F();
      out.pickOk=okPick;
      out.afterPick={answered:F3.answered, caRight:F3.caRight, hp:F3.hp};
      window.__v19._test.close();
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('R2 builder question reached (phoenix Q0 is builder)', r2b.qmode2 === 'builder', r2b);
  check('R2 builder answer under the CA does NOT throw (answered set, damage dealt, caRight 0)', r2b.err === undefined && r2b.pickOk === true && (r2b.afterPick||{}).answered !== null && (r2b.afterPick||{}).caRight === 0 && (r2b.afterPick||{}).hp < 90, r2b);
  // Clamp: force caRight=4 and resolve — must behave as 3/3, never 0/3.
  const clamp = E(ctx, `(function(){
    var out={};
    try{
      window.__v19.openMapFor('en'); window.__v19.fight('v11_fireking');
      var F=window.__v19._test.F();
      F.hp=200; F.hearts=5; F.ultActive=true; F.caQ=3; F.caRight=4;
      window.__v19._test.resolveUltimate();
      var F2=window.__v19._test.F();
      out.after={caRight:F2.caRight, hearts:F2.hearts, hp:F2.hp, banner:F2.banner, phase:F2.phase};
      window.__v19._test.close();
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('R1 clamp: forced caRight=4 resolves as 3/3 (hearts 5, HP 200->160, 3/3 banner)', (clamp.after||{}).hearts === 5 && (clamp.after||{}).hp === 160 && typeof (clamp.after||{}).banner === 'string' && (clamp.after||{}).banner.indexOf('3/3') >= 0 && (clamp.after||{}).phase === 3, clamp.after);


  // ================= §41B C-02 shield regression (V40 fix holds) =================
  section('§41B', 'C-02 team-skill damage through the shield (V40 regression)');
  E(ctx, `(function(){
    window.__v15.pop15=function(t){ (window.__T41_MSGS=window.__T41_MSGS||[]).push(String(t)); };
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
      out.msg=(window.__T41_MSGS||[])[(window.__T41_MSGS||[]).length-1]||null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-02 team skill (50) vs shield 30: HP 150->125 (halved)', shield1.hp === 125, shield1);
  check('C-02 team skill: shield absorbs the dealt damage (30->5)', shield1.shield === 5, shield1);
  check('C-02 team skill: toast states the dealt 25, not the raw 50', typeof shield1.msg === 'string' && shield1.msg.indexOf('Gây 25 sát thương') >= 0 && shield1.msg.indexOf('Khiên boss chặn một nửa.') >= 0, shield1);
  check('C-02 team skill: fight still open (non-lethal)', shield1.over === null || shield1.over === undefined, shield1);
  // GEAR GOLEM shield 90: skill 50 -> 25 dealt, shield 90 -> 65.
  const golem = E(ctx, `(function(){
    var out={};
    try{
      window.__v18._test.close();
      /* GEAR GOLEM is Chrono idx7: needs the 70-win region gate plus
         the 7 prior Chrono bosses won in EN. Seed: all 30 v11 wins
         (en19) + 10 v10 wins (en18) + 7 prior Chrono wins + 25 en15
         boss keys = 72 >= 70. */
      var e19g=window.__v19.en19();
      (window.__V19_DATA.bosses||[]).forEach(function(b){ e19g.bosses[b.id]=e19g.bosses[b.id]||{}; e19g.bosses[b.id].en={win:1,wins:1,stars:3}; });
      var e18g=window.__v18.en18();
      (window.__V18_BOSSES.old||[]).forEach(function(b){ e18g.bosses[b.id]={win:1,wins:1,at:Date.now(),item:'x'}; });
      var cids=(window.__V33_DATA&&window.__V33_DATA.bosses||[]).map(function(b){ return b.id; });
      cids.slice(0,7).forEach(function(id){ e19g.bosses[id]=e19g.bosses[id]||{}; e19g.bosses[id].en={win:1,wins:1,stars:3}; });
      var e15g=window.__v15.en15(); e15g.bosses=e15g.bosses||{};
      for(var k=0;k<25;k++) e15g.bosses['seed'+k]={win:1};
      out.gate=window.__v33._test?window.__v33._test.gateOpen():null;
      out.chronoIds=cids;
      window.__v19.openMapFor('en'); window.__v19.fight('v17_geargolem');
      var F=window.__v19._test.F();
      out.opened=!!F; out.hp0=F?F.hp:null; out.shield0=F?F.shield:null;
      F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v19._test.F();
      out.hp=F2.hp; out.shield=F2.shield; out.over=F2.over;
      window.__v19._test.close();
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-02 GEAR GOLEM shield 90: skill 50 -> HP 750->725, shield 90->65', golem.opened === true && golem.hp0 === 750 && golem.shield0 === 90 && golem.hp === 725 && golem.shield === 65, golem);
  // Lethal skill still resolves the fight (V36 path intact).
  const lethal = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_panda','en');
      var F=window.__v18._test.F();
      F.hp=20; F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v18._test.F();
      out.hp=F2.hp; out.over=F2.over;
      window.__v18._test.close();
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-02 lethal skill (25 dealt vs 20 HP): fight resolves as a win', lethal.hp === 0 && lethal.over === 'win', lethal);

  // ================= §41C F1 no-opt save boots =================
  section('§41C', 'F1 boot on a save without S.opt (load() defaults opt)');
  // Fresh ctx seeded with a no-opt save BEFORE loadPage (the V18.5 repro:
  // boot threw TypeError reading 'group' and #app stayed empty).
  const ctx1 = makeCtx();
  const fiveKO = [
    { id: 'ko_r1', d: 'd0', h: '사과', m: 'quả táo', p: 'sagwa', e: '사과를 먹어요.', g: '', box: 0, due: 0 },
    { id: 'ko_r2', d: 'd0', h: '학교', m: 'trường học', p: 'hakgyo', e: '학교에 가요.', g: '', box: 0, due: 0 },
    { id: 'ko_r3', d: 'd0', h: '물', m: 'nước', p: 'mul', e: '물을 마셔요.', g: '', box: 0, due: 0 },
    { id: 'ko_r4', d: 'd0', h: '책', m: 'sách', p: 'chaek', e: '책을 읽어요.', g: '', box: 0, due: 0 },
    { id: 'ko_r5', d: 'd0', h: '집', m: 'nhà', p: 'jip', e: '집에 가요.', g: '', box: 0, due: 0 },
  ];
  const noOptSave = { cards: fiveKO, decks: [{ id: 'd0', name: 'Bộ mặc định' }], deck: 'd0', xp: 20, gems: 3, v7: {} };
  ctx1.localStorage.setItem('hanvocab.v1', JSON.stringify(noOptSave));
  const loaded1 = loadPage(ctx1, html);
  check('F1 no-opt save: all inline scripts evaluate without error (was: TypeError reading group)', loaded1.loadErr === null, loaded1.loadErr);
  if (loaded1.loadErr === null) {
    fireDCL(ctx1);
    const appLen = E(ctx1, `document.getElementById('app')?document.getElementById('app').innerHTML.length:-1`);
    check('F1 no-opt save: study view renders into #app (was: empty)', typeof appLen === 'number' && appLen > 0, appLen);
    const opt1 = J(ctx1, `JSON.stringify(S.opt)`);
    check("F1 no-opt save: S.opt defaulted to {mode:'card',dir:'kv',group:'',due:false}", opt1 && opt1.mode === 'card' && opt1.dir === 'kv' && opt1.group === '' && opt1.due === false, opt1);
    check('F1 no-opt save: cards preserved (5 KO cards)', E(ctx1, `S.cards.length`) === 5);
  } else {
    skipCheck('F1 no-opt save: study view renders into #app (was: empty)', 'load failed — see above');
    skipCheck("F1 no-opt save: S.opt defaulted", 'load failed — see above');
    skipCheck('F1 no-opt save: cards preserved (5 KO cards)', 'load failed — see above');
  }
  // A validated import of a no-opt save is accepted (validateSave does not
  // require opt) and would boot through the same load() default.
  const validNoOpt = E(ctx, `(function(){ try{ return window.__v20sync.validateSave(${JSON.stringify(noOptSave)}); }catch(e){ return {ok:false, err:String(e)}; } })()`);
  check('F1 validated import accepts a no-opt save (validateSave ok)', validNoOpt && validNoOpt.ok === true, validNoOpt);

  // ================= §41D F2 farm quiz single div =================
  section('§41D', 'F2 farmPlotTap removes the stale harvest-quiz div');
  // Install a creation registry so the stub DOM can count #v15farmquiz divs
  // (the stub's getElementById returns a fresh object per id, so the test
  // tracks the real created elements and routes getElementById to them).
  E(ctx, `(function(){
    window.__T41_REG=[];
    var doc=document;
    var origCE=doc.createElement;
    doc.createElement=function(t){ var el=origCE(t); var origRemove=el.remove; el.remove=function(){ el.__removed=true; try{return origRemove.call(el)}catch(e){} }; window.__T41_REG.push(el); return el; };
    var origGID=doc.getElementById;
    doc.getElementById=function(id){
      for(var i=window.__T41_REG.length-1;i>=0;i--){ var el=window.__T41_REG[i]; if(el.id===id&&!el.__removed) return el; }
      /* the stub's getElementById returns a fresh object per id even
         when nothing exists — for the quiz div that would fake a
         stale card after the only div was removed, so answer null
         when no live registry element matches it. */
      if(id==='v15farmquiz') return null;
      return origGID(id);
    };
  })()`);
  const f2 = E(ctx, `(function(){
    var out={};
    try{
      var e=window.__v15.en15();
      e.farm.harvests=2; e.farm.plots=[{wordId:'',water:0,planted:0},{wordId:'',water:0,planted:0},{wordId:'',water:0,planted:0},{wordId:'',water:0,planted:0},{wordId:'',water:0,planted:0},{wordId:'',water:0,planted:0}];
      var countQuiz=function(){ return window.__T41_REG.filter(function(x){ return x.id==='v15farmquiz'&&!x.__removed; }).length; };
      var w=window.__v15.words.filter(function(x){ return !(window.__v15.enOld().box[x.id]); })[0];
      e.farm.plots[0]={wordId:w.id, water:0, planted:Date.now()};
      for(var i=0;i<4;i++) window.__v15.mark15(true, w, 'mc');
      out.grown={box:window.__v15.enOld().box[w.id], water:window.__v15.en15().farm.plots[0].water};
      window.__v15.farmPlotTap(0);
      var wid=window.__v15.en15().farm.plots[0].wordId;
      window.__v15.farmQuizPick(wid);
      out.afterCorrect={n:countQuiz(), harvests:window.__v15.en15().farm.harvests, plotCleared:window.__v15.en15().farm.plots[0].wordId==='' };
      var w2=window.__v15.words.filter(function(x){ return !(window.__v15.enOld().box[x.id]); })[0];
      e.farm.plots[1]={wordId:w2.id, water:2, planted:Date.now()};
      for(var j=0;j<4;j++) window.__v15.mark15(true, w2, 'mc');
      window.__v15.farmPlotTap(1);
      out.afterSecondTap={n:countQuiz()};
      var wrongId=window.__v15.words.filter(function(x){ return x.id!==w2.id; })[0].id;
      window.__v15.farmQuizPick(wrongId);
      out.afterWrong={n:countQuiz(), box:window.__v15.enOld().box[w2.id], plotKept:window.__v15.en15().farm.plots[1].wordId===w2.id};
      var q=document.getElementById('v15farmquiz'); if(q) q.remove();
      out.afterRemove={n:countQuiz(), stillThere:!!document.getElementById('v15farmquiz')};
    }catch(err){ out.err=String(err); }
    return out;
  })()`);
  check('F2 crop grown to box 4 (water >= 2)', f2.grown && f2.grown.box === 4 && f2.grown.water >= 2, f2.grown);
  check('F2 correct harvest works (1 quiz div, harvests 2->3, plot cleared)', f2.afterCorrect.n === 1 && f2.afterCorrect.harvests === 3 && f2.afterCorrect.plotCleared === true, f2.afterCorrect);
  check('F2 second tap within the cleanup window creates NO second div (was: 2)', f2.afterSecondTap.n === 1, f2.afterSecondTap);
  check('F2 wrong harvest: box 4->0, plot keeps the word', f2.afterWrong.box === 0 && f2.afterWrong.plotKept === true, f2.afterWrong);
  check('F2 removing the quiz div leaves NO stale card behind (was: stale div resurfaces)', f2.afterRemove.n === 0 && f2.afterRemove.stillThere === false, f2.afterRemove);
  await sleep(1500); // let the correct-harvest 1200 ms renderTab timer settle

  // ================= §41E F3 snapshot flush =================
  section('§41E', 'F3 pre-restore snapshot flushes the debounced save first');
  // importFile (v20.js): stored xp 777, dirty in-memory 8888 + save()
  // (debounced 800 ms), import immediately in the same eval.
  const f3a = await (async () => {
    E(ctx, `(function(){ S.xp=777; save(); })()`);
    await sleep(1500); // let the debounce flush 777 to localStorage
    const stored777 = E(ctx, `JSON.parse(localStorage.getItem('hanvocab.v1')).xp`);
    if (stored777 !== 777) return { stored777, err: 'setup: stored xp is not 777' };
    const r = E(ctx, `(function(){
      var out={};
      try{
        S.xp=8888; save();
        var j=JSON.parse(localStorage.getItem('hanvocab.v1'));
        j.xp=1111;
        var f={__text:JSON.stringify(j)};
        window.__v20.importFile({files:[f]});
        out.called=true;
      }catch(e){ out.err=String(e); }
      return out;
    })()`);
    await sleep(1200); // let any pending debounce fire (must not change the snapshot)
    const after = E(ctx, `(function(){
      var keys=[]; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.indexOf('preimport')>=0) keys.push(k); }
      var snapXp=null;
      if(keys.length){ try{ snapXp=JSON.parse(localStorage.getItem(keys[keys.length-1])).xp; }catch(e){ snapXp='ERR:'+e; } }
      return {storedXp:JSON.parse(localStorage.getItem('hanvocab.v1')).xp, snapXp:snapXp, nSnaps:keys.length};
    })()`);
    return { stored777, called: r.called, err: r.err, after };
  })();
  check('F3 importFile setup: stored xp is 777 after flush', f3a.stored777 === 777, f3a.stored777);
  check('F3 importFile called without error', f3a.called === true && !f3a.err, f3a.err);
  check('F3 importFile lands (stored xp 1111)', f3a.after && f3a.after.storedXp === 1111, f3a.after);
  check('F3 importFile snapshot holds the DIRTY 8888 (was: stale 777)', f3a.after && f3a.after.snapXp === 8888, f3a.after);
  // backupImport (v15.js): same race, same fix (via __v20.flush).
  const f3b = await (async () => {
    E(ctx, `(function(){ S.xp=555; save(); })()`);
    await sleep(1500);
    const stored555 = E(ctx, `JSON.parse(localStorage.getItem('hanvocab.v1')).xp`);
    if (stored555 !== 555) return { stored555, err: 'setup: stored xp is not 555' };
    const r = E(ctx, `(function(){
      var out={};
      try{
        S.xp=9999; save();
        var j=JSON.parse(localStorage.getItem('hanvocab.v1'));
        j.xp=2222;
        var f={__text:JSON.stringify(j)};
        window.__v15.backupImport({files:[f]});
        out.called=true;
      }catch(e){ out.err=String(e); }
      return out;
    })()`);
    await sleep(1200);
    const after = E(ctx, `(function(){
      var keys=[]; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.indexOf('preimport')>=0) keys.push(k); }
      var snaps=keys.map(function(k){ try{ return JSON.parse(localStorage.getItem(k)).xp; }catch(e){ return 'ERR'; } });
      return {storedXp:JSON.parse(localStorage.getItem('hanvocab.v1')).xp, snaps:snaps};
    })()`);
    return { stored555, called: r.called, err: r.err, after };
  })();
  check('F3 backupImport setup: stored xp is 555 after flush', f3b.stored555 === 555, f3b.stored555);
  check('F3 backupImport called without error', f3b.called === true && !f3b.err, f3b.err);
  check('F3 backupImport lands (stored xp 2222)', f3b.after && f3b.after.storedXp === 2222, f3b.after);
  check('F3 backupImport snapshot holds the DIRTY 9999 (was: stale 555)', f3b.after && Array.isArray(f3b.after.snaps) && f3b.after.snaps.indexOf(9999) >= 0, f3b.after);
  // Restore a sane xp for the later sections.
  E(ctx, `(function(){ S.xp=20; save(); })()`);
  await sleep(1200);

  // ================= §41F F4 data dedup =================
  section('§41F', 'F4 raw data dupes removed (zero information loss)');
  const a1a2Out = JSON.parse(fs.readFileSync(path.join(DIR, 'v17_a1a2.json'), 'utf-8'));
  const oxOut = JSON.parse(fs.readFileSync(path.join(DIR, 'v17_oxford.json'), 'utf-8'));
  const a1a2Data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'v17_a1a2.json'), 'utf-8'));
  const oxData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'v17_oxford.json'), 'utf-8'));
  check('F4 out/v17_a1a2.json has 999 rows (was 1000)', a1a2Out.length === 999, a1a2Out.length);
  check('F4 out/v17_oxford.json has 3395 rows (was 3396)', oxOut.length === 3395, oxOut.length);
  check('F4 data/v17_a1a2.json has 999 rows (was 1000)', a1a2Data.length === 999, a1a2Data.length);
  check('F4 data/v17_oxford.json has 3395 rows (was 3396)', oxData.length === 3395, oxData.length);
  check('F4 airplane appears once in out json (no 863 kept, no 864)', a1a2Out.filter(r => r.en === 'airplane').length === 1 && a1a2Out.filter(r => r.en === 'airplane')[0].no === 863, a1a2Out.filter(r => r.en === 'airplane'));
  check('F4 each other appears once in out json (ord 941 kept, pos n, pro)', oxOut.filter(r => r.en === 'each other').length === 1 && oxOut.filter(r => r.en === 'each other')[0].ord === 941 && oxOut.filter(r => r.en === 'each other')[0].pos === 'n, pro', oxOut.filter(r => r.en === 'each other'));
  /* WORDS entries carry no src field — the library scope is w.lib
     (['a1a2']/['oxford']) plus a1a2Topics/oxLessons, and WORDS is
     already deduped by buildWords (one entry per lowercase headword).
     Use wordsFiltered with lib scopes, as test40 §40F does. */
  const dedup = E(ctx, `(function(){
    var wf=function(sc){ try{ return window.__v15.wordsFiltered({scope:sc,level:'ALL'}); }catch(e){ return []; } };
    var a1=wf({kind:'lib',lib:'a1a2'});
    var oxf=wf({kind:'lib',lib:'oxford'});
    var veh=wf({kind:'lib',lib:'a1a2',topic:'a1_vehicles'});
    var l38=wf({kind:'lib',lib:'oxford',lesson:38});
    var may=wf({kind:'lib',lib:'oxford',lesson:73}).filter(function(w){ return w.en==='may'||w.en==='May'; });
    var side=wf({kind:'lib',lib:'oxford',lesson:108}).filter(function(w){ return w.en==='side'; });
    return {a1:a1.length, a1u:a1.length, ox:oxf.length, oxu:oxf.length, veh:veh.length, vehU:veh.length, l38:l38.length, l38U:l38.length, may:may.map(function(w){return w.en+':'+w.vi}), side:side.map(function(w){return w.en+':'+w.vi})};
  })()`);
  check('F4 deduped WORDS unchanged: A1-A2 unique 995', dedup.a1u === 995, dedup);
  check('F4 deduped WORDS unchanged: Oxford unique 3393', dedup.oxu === 3393, dedup);
  check('F4 VEHICLES renders 23 unique words', dedup.veh === 23 && dedup.vehU === 23, dedup);
  check('F4 Oxford lesson 38 renders 24 unique words', dedup.l38 === 24 && dedup.l38U === 24, dedup);
  /* may/May and side x2 live in the RAW data, not in WORDS: WORDS
     dedupes by lowercase headword, so 'may'/'May' and the two 'side'
     rows collapse to one WORDS entry each by design. Assert on the
     raw JSON rows instead. */
  const mayRaw = oxOut.filter(r => r.lesson === 73 && r.en.toLowerCase() === 'may');
  const sideRaw = oxOut.filter(r => r.lesson === 108 && r.en === 'side');
  check('F4 may/May NOT touched (both meanings survive in lesson 73)', mayRaw.length === 2 && mayRaw.some(r => r.en === 'may') && mayRaw.some(r => r.en === 'May'), mayRaw);
  check('F4 side x2 NOT touched (both meanings survive in lesson 108)', sideRaw.length === 2 && sideRaw.some(r => r.vi === 'mặt, mặt phẳng') && sideRaw.some(r => r.vi === 'chỗ, vị trí'), sideRaw);

  // ================= §41G C-R2-2 nav CSS =================
  section('§41G', 'C-R2-2 bottom-nav CSS (scrollable row at <=640px)');
  const v41css = fs.readFileSync(path.join(ROOT, 'src', 'v41.css'), 'utf-8');
  const v41cssOut = fs.readFileSync(path.join(DIR, 'v41.css'), 'utf-8');
  check('v41.css ships the min-width rule', v41css.includes('min-width:64px') && v41css.includes('flex:0 0 auto'));
  check('out/v41.css matches src/v41.css', v41cssOut === v41css);
  check('v41.css scopes the rule to <=640px', v41css.includes('@media(max-width:640px)'));
  check('v41.css keeps the row scrollable (overflow-x:auto upstream untouched)', html.includes('.tabs{overflow-x:auto}'));
  skipCheck('bottom-nav label overlap measured live at 360px', 'needs real Chrome layout — see verify-v41c.js');
  skipCheck('bottom-nav label overlap measured live at 390px', 'needs real Chrome layout — see verify-v41c.js');


  // ================= §41R V18.5 regression (all 12 V40 fixes hold) =================
  section('§41R', 'V18.5 regression — all 12 V40 fixes hold on V18.6');
  // C-01 ko16 merge: per-key MAX both ways (test40 §40A, condensed).
  const ko16 = E(ctx, `(function(){
    var m=window.__v20sync.mergeSaves;
    var base={cards:[],v7:{meta:{saveVersion:12}}};
    function mk(lv){ var s=JSON.parse(JSON.stringify(base)); s.v7.ko16={levels:{a:lv}}; return s; }
    var r1=m(mk(5),mk(3)); var r2=m(mk(2),mk(7));
    return {r1:r1.v7.ko16.levels.a, r2:r2.v7.ko16.levels.a};
  })()`);
  check('C-01 ko16 merge keeps the higher level both ways (5 vs 3 -> 5; 2 vs 7 -> 7)', ko16.r1 === 5 && ko16.r2 === 7, ko16);
  // C-07 Smart plan merge: same-day plans union per language.
  const plan = E(ctx, `(function(){
    var m=window.__v20sync.mergeSaves;
    var base={cards:[],v7:{meta:{saveVersion:12}}};
    function mk(plan){ var s=JSON.parse(JSON.stringify(base)); s.v7.en27={plan:plan}; return s; }
    var d=new Date().toDateString();
    var newer=mk({en:{d:d,mins:10,newN:1,dueN:1,weakN:0,ids:['a'],doneIds:['a'],goals:{complete:true,acc80:false,weak5:false}},ko:{}});
    var older=mk({en:{d:d,mins:10,newN:1,dueN:1,weakN:0,ids:['b'],doneIds:[],goals:{complete:false,acc80:false,weak5:false}},ko:{}});
    var r=m(newer,older);
    return r.v7.en27.plan.en;
  })()`);
  check('C-07 same-day plan merge unions ids (a+b) and keeps doneIds', Array.isArray(plan.ids) && plan.ids.indexOf('a') >= 0 && plan.ids.indexOf('b') >= 0 && plan.doneIds.indexOf('a') >= 0, plan);
  // B-8 BT guards: startMode with a BT scope on a fresh load shows loading.
  E(ctx, `window.__v22._test.reset()`);
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
  check('B-8 after BT data loads: BT data attached + scope yields words', afterLoad.bt === true && afterLoad.n > 0, afterLoad);
  E(ctx, `window.__v15.clearScope()`);
  // A-F2/A-N1 koWarn banner survives next() in both engines.
  const seedCards = J(ctx, `JSON.stringify(S.cards)`);
  E(ctx, `S.cards = ${JSON.stringify(seedCards.slice(0, 5))}`);
  const warn18 = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_slime','ko');
      var F=window.__v18._test.F();
      out.banner=F?F.banner:null;
      window.__v18._test.pickCorrect();
      window.__v18._test.next();
      var F2=window.__v18._test.F();
      out.banner2=F2?F2.banner:null; out.q2=F2?F2.q:null;
      window.__v18._test.close();
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('A-F2 V18 Q1 banner shows exactly 5/8', warn18.banner === '⚠️ Bạn mới có 5/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.', warn18);
  check('A-F2 V18 Q2 banner SURVIVES next()', warn18.banner2 === warn18.banner && warn18.q2 === 1, warn18);
  const warn19 = E(ctx, `(function(){
    var out={};
    try{
      window.__v19.openMapFor('ko');
      window.__v19.fight('v11_fireking');
      var F=window.__v19._test.F();
      out.banner=F?F.banner:null;
      window.__v19._test.pickCorrect();
      window.__v19._test.next();
      var F2=window.__v19._test.F();
      out.banner2=F2?F2.banner:null; out.q2=F2?F2.q:null;
      window.__v19._test.close();
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('A-F2 V19 Q1 banner shows exactly 5/8', warn19.banner === '⚠️ Bạn mới có 5/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.', warn19);
  check('A-F2 V19 Q2 banner SURVIVES next()', warn19.banner2 === warn19.banner && warn19.q2 === 1, warn19);
  E(ctx, `S.cards = ${JSON.stringify(seedCards)}`);
  // A-F1 break label, C-04 replay count, C-05 live count, C-06 sc2.
  /* A-F1 is a KO-fight label (breakBarHTML renders 'từ tiếng Hàn của
     bạn' only for lang 'ko' with a deck set) — mirror test40 §40F:
     KO slime fight via __v18, check breakBarHTML + fight HTML. */
  const seedDeck = seedCards.length ? seedCards[0].d : '';
  E(ctx, `S.deck = ${JSON.stringify(seedDeck)}`);
  const f41 = E(ctx, `(function(){
    var out={};
    try{
      window.__v18.fight('v10_slime','ko');
      var F=window.__v18._test.F();
      out.bar=window.__v34.breakBarHTML(F);
      var h=document.getElementById('v18fight');
      out.fightHtml=h?String(h.innerHTML||''):null;
      out.breakLabel=out.fightHtml?out.fightHtml.indexOf('từ tiếng Hàn của bạn')>=0:null;
      window.__v18._test.close();
      var e19=window.__v19.en19();
      e19.bosses['v11_fireking']={en:{win:1,wins:3,stars:2,best:0},ko:{win:1,wins:1,stars:1,best:0}};
      window.__v18.collDetail('v11_fireking');
      var det=document.getElementById('v18colldetail');
      out.detail=det?String(det.innerHTML||''):null;
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('A-F1 KO Break bar says "từ tiếng Hàn của bạn" (not "bộ từ đã chọn")', (f41.bar || '').indexOf('từ tiếng Hàn của bạn') >= 0 && (f41.bar || '').indexOf('bộ từ tiếng Hàn đã chọn') < 0, f41.bar);
  check('A-F1 KO Break bar renders in the fight HTML with the new label', f41.breakLabel === true, f41.fightHtml);
  check('C-04 fireking detail (en 3 + ko 1) shows "(4 lần)"', !!f41.detail && f41.detail.indexOf('(4 lần)') >= 0, f41.detail);
  const c05 = E(ctx, `(function(){
    window.__v15.tab('bosses');
    var b=document.getElementById('v15body');
    return b?String(b.innerHTML||''):null;
  })()`);
  check('C-05 arenas button shows the live "(86 boss)" count', !!c05 && c05.indexOf('(86 boss)') >= 0, (c05 || '').slice(0, 200));
  // C-06 sc2 keeps topic/lesson (test40 §40F pattern): the Education
  // pool is the lib-scoped wordsFiltered result, not WORDS filtered
  // by w.t (a1a2 words keep their V14/V15 topic in w.t; the library
  // topic lives in w.a1a2Topics).
  const sc2 = E(ctx, `(function(){
    var out={};
    try{
      var edu=window.__v15.wordsFiltered({scope:{kind:'lib',lib:'a1a2',topic:'a1_education'},level:'ALL'});
      out.edu=edu.length;
      out.eduTopicOk=edu.every(function(w){ return (w.a1a2Topics||[]).indexOf('a1_education')>=0; });
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  check('C-06 A1-A2 Education pool is exactly the 20 topic words', sc2.edu === 20 && sc2.eduTopicOk === true, sc2);
  // C-10 partial sessions must not tick plan goals.
  const ids10 = J(ctx, `JSON.stringify(window.__v15.words.slice(0,10).map(function(w){return w.id}))`);
  E(ctx, `(function(){
    var e=S.v7.en||(S.v7.en={}); e.wrong=e.wrong||{}; e.right=e.right||{};
    ${JSON.stringify(ids10.slice(0, 5))}.forEach(function(id){ e.wrong[id]=3; e.right[id]=0; });
  })()`);
  E(ctx, `(function(){
    var d=window.__v27.en27();
    d.plan.en={d:new Date().toDateString(),mins:10,newN:5,dueN:10,weakN:5,ids:${JSON.stringify(ids10)},doneIds:[],goals:{complete:false,acc80:false,weak5:false}};
    window.__v27.startSession('en', ${JSON.stringify(ids10)}, 'plan');
  })()`);
  for (let i = 0; i < 5; i++) { E(ctx, `window.__v27.answerMC(null,true,null); window.__v27.nextQ();`); }
  E(ctx, `window.__v27.endEarly()`);
  const partial = J(ctx, `JSON.stringify({goals:window.__v27.en27().plan.en.goals, rec:window.__v27.en27().sessions[0]})`);
  check('C-10 partial 5/5 session: recorded as partial:true', partial.rec.partial === true, partial.rec);
  check('C-10 partial 5/5 session: acc80 + weak5 stay false', partial.goals.acc80 === false && partial.goals.weak5 === false, partial.goals);
  // C-12 picker refuses empty Units.
  E(ctx, `(function(){
    document.querySelectorAll=function(sel){
      if(sel==='#v22bs-chips .v15pill.on') return window.__T41_CHIPS||[];
      return [];
    };
    window.__T41_CHIPS=[];
    document.querySelector('#v22bs-lib').value='units';
  })()`);
  E(ctx, `window.__v15.en15().scope={kind:'lib',lib:'a1a2',topic:'a1_education'}`);
  E(ctx, `window.__v22.applyBossScope()`);
  const refused = J(ctx, `JSON.stringify(window.__v15.en15().scope)`);
  check('C-12 units + 0 chips: scope unchanged (not silently all-BT)', refused && refused.lib === 'a1a2' && refused.topic === 'a1_education', refused);
  E(ctx, `window.__T41_CHIPS=[{getAttribute:function(k){return '2'}}]; window.__v22.applyBossScope();`);
  await sleep(800);
  const applied = J(ctx, `JSON.stringify(window.__v15.en15().scope)`);
  check('C-12 units + 1 chip: scope becomes BT unit 2', applied && applied.lib === 'bt' && applied.unit === 2, applied);
  E(ctx, `window.__v15.clearScope()`);

  // ================= §V save schema =================
  section('§V', 'save schema — no new key, no schema change');
  check('no en41 save key', E(ctx, `!S.v7 || !S.v7.en41`));
  check('no v41 localStorage key', E(ctx, `(function(){ for(var i=0;i<localStorage.length;i++){ if(localStorage.key(i).indexOf('v41')>=0) return false; } return true; })()`));
  check('hanvocab.v1 still the only save key', E(ctx, `localStorage.getItem('hanvocab.v1')!==null`));

  // ================= §C Chrome-only =================
  section('§C', 'Chrome-only gates (SKIP in the Node harness)');
  skipCheck('R1/R2 painted fight: real skill-button + option clicks in Chrome', 'needs real Chrome — see repro-v41.js / verify-v41c.js');
  skipCheck('F1 no-opt save boots with the study view painted', 'needs real Chrome — see repro-v41.js');
  skipCheck('F2 stale quiz div timing in the real DOM (1200 ms window)', 'needs real Chrome — see repro-v41.js');
  skipCheck('F3 import via the real file input + undo restores the dirty change', 'needs real Chrome — see repro-v41.js');
  skipCheck('bottom-nav labels at 360px/390px: no overlap, buttons >=44px', 'needs real Chrome — see verify-v41c.js');
  skipCheck('U2 team-skill HP/shield paint lag check', 'needs real Chrome — see repro-v41.js');
  skipCheck('live Firebase login/sync', "never tested live in any version — Anh must run the FIREBASE_SETUP.md checklist");
  skipCheck('real phone touch / Safari', "needs Anh's real-phone test");

  // ================= footer =================
  const total = pass + fail + skip;
  console.log(`\ntest41: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (of ${total})`);
  if (failures.length) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); }
  for (const [s, c] of Object.entries(secCounts)) console.log(`  ${s}: ${c.pass} pass / ${c.fail} fail / ${c.skip} skip`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('test41 crashed:', e); process.exit(2); });
