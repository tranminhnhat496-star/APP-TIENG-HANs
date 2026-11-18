// test33.js — V17.0 CHRONO KINGDOM verification (Node vm harness).
// No external dependencies: runs with plain `node` (no jsdom, no Chrome).
// Usage: node tools/v33/test33.js [DIR]
//   DIR = build dir holding the standalone .js files + index.html
//   (default: <repo>/out). For the ZIP run, extract the ZIP and pass
//   the extraction dir. Exit 0 = all runnable checks pass (skips are
//   reported, never counted as passes).
// What this covers (BRIEF_V33.md §Tests):
//   §0 static build integrity (markers, title, replacements, art).
//   §1 gate (corrected count incl. flat V18 wins; closed at 69,
//      open at 70; sequential unlock; gate enforced in the UCE path).
//   §2 bosses (real v19_data.js + v19.js + v33.js in vm): stats on
//      game scale, skill/element palette, real sandwisp fight to a
//      win, GEAR GOLEM 90-HP shield + P2 time-reversal heal + no P3,
//      Collection shows 78 bosses, TOTAL_BOSSES 78.
//   §3 pets (real v23_data.js + v23.js + v33.js): registration
//      idempotent, teamBattle aggregation with the 3 new species,
//      leader XP bonus, Chrono egg hatch, evolution guards,
//      45-form milestone.
//   §4 quests (real v27.js + v33.js): startSession exported, real
//      V27 session driven to completion, completion detection via
//      session recs, claimed-guarded rewards, <0.8 not done.
//   §5 Time Echo (cw records -> list, most-wrong first, cap 10;
//      empty state).
//   §6 Chrono Rift (floor gating, accuracy-scaled rewards, once/day,
//      day rollover) — floor 1 driven through a real V27 session.
//   §7 words (data/v33_words.json + v33_data.js + the REAL V33
//      buildWords block extracted from src/v15.js and eval'd):
//      4x60, 0 dupes, merge into WORDS with v33_<slug> ids, lv B2,
//      no duplicate record for an overlapping word.
//   §8 merge/hasProgress/validate/export/conflict for en33 (real
//      v20_sync.js + V31 regression subset).
//   §9 Chrome-only (SKIP, never PASS).
// HONEST LIMITS of this harness (see SMOKE_TEST): the full
// question-answering flow is driven here through the real V27 engine
// with a stub DOM (§4/§6), but real-browser rendering, touch, speech
// and live Firebase stay Chrome/Anh-only gates (§9).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const ROOT = path.resolve(__dirname, '..', '..');
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  ls._map = m;
  return ls;
}
// ---------- minimal DOM stub (persistent elements by id, children tracked) ----------
function makeEl(tag) {
  const el = {
    tagName: (tag || 'DIV').toUpperCase(), children: [], style: {}, dataset: {},
    className: '', id: '', textContent: '', innerHTML: '',
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c) { if (this._s.has(c)) this._s.delete(c); else this._s.add(c); }, contains(c) { return this._s.has(c); } },
    setAttribute(k, v) { el['_attr_' + k] = v; },
    getAttribute(k) { const v = el['_attr_' + k]; return v === undefined ? null : v; },
    appendChild(c) { el.children.push(c); return c; },
    insertBefore(c, ref) { const i = el.children.indexOf(ref); if (i >= 0) el.children.splice(i, 0, c); else el.children.push(c); return c; },
    addEventListener() {}, removeEventListener() {}, scrollIntoView() {},
    remove() {}, focus() {}, click() {},
    querySelector(sel) {
      if (sel.startsWith('.')) { const cls = sel.slice(1); return el.children.find(c => String(c.className || '').split(' ').includes(cls)) || null; }
      if (sel.startsWith('#')) { const id = sel.slice(1); return el.children.find(c => c.id === id) || null; }
      return null;
    },
    querySelectorAll() { return []; },
  };
  return el;
}
function makeDocument() {
  const byId = {};
  const body = makeEl('body');
  const doc = {
    readyState: 'complete',
    addEventListener() {}, removeEventListener() {},
    getElementById(id) { if (!byId[id]) { const e = makeEl('div'); e.id = id; byId[id] = e; } return byId[id]; },
    querySelector(sel) {
      if (doc.__queryMap && doc.__queryMap[sel]) return doc.__queryMap[sel];
      if (sel.startsWith('#') && sel.indexOf(' ') < 0) return doc.getElementById(sel.slice(1));
      if (sel === 'body') return body;
      return null;
    },
    querySelectorAll() { return []; },
    createElement: (t) => makeEl(t),
    head: makeEl('head'), body,
  };
  doc._byId = byId;
  doc.__queryMap = {};
  return doc;
}
function makeCtx(extra) {
  const warns = [], errors = [];
  const sandbox = {
    console: { log(...a) { console.log(...a); }, warn(...a) { warns.push(a.map(String).join(' ')); }, error(...a) { errors.push(a.map(String).join(' ')); } },
    setTimeout, clearTimeout, setInterval, clearInterval,
    navigator: { onLine: true },
    location: { reload() { sandbox.__reloadCalled = true; } },
    __reloadCalled: false,
    __warns: warns, __errors: errors,
  };
  sandbox.window = sandbox;
  sandbox.document = makeDocument();
  sandbox.localStorage = makeLS();
  sandbox.window.addEventListener = function () {};
  Object.assign(sandbox, extra || {});
  const ctx = vm.createContext(sandbox);
  ctx.__sandbox = sandbox;
  return ctx;
}
function loadFile(ctx, file, label) {
  const code = fs.readFileSync(path.join(DIR, file), 'utf-8');
  vm.runInContext(code, ctx, { filename: file });
  return code;
}
function evalIn(ctx, expr) { return vm.runInContext(expr, ctx); }

// ---------- fixture builders ----------
function baseSave(over) {
  const s = {
    cards: [{ id: 'k1', h: 'a', m: 'b' }],
    xp: 0, sk: { n: 0, d: '' },
    v7: { gems: 0, meta: { saveVersion: 12 }, en: { box: {}, right: {}, wrong: {} }, en15: { due: {} } },
  };
  return Object.assign(s, over || {});
}
function winsSave(n15, n18flat, n18nested, n19) {
  // Builds a save with exactly the requested win counts per bucket.
  const s = baseSave({ xp: 5000 });
  s.v7.en15 = { bosses: {} };
  for (let i = 0; i < n15; i++) s.v7.en15.bosses['old' + i] = { win: 1 };
  s.v7.en18 = { bosses: {} };
  for (let i = 0; i < n18flat; i++) s.v7.en18.bosses['v10_flat' + i] = { win: 1, wins: 1 };
  for (let i = 0; i < n18nested; i++) s.v7.en18.bosses['v10_nest' + i] = { en: { win: 1, wins: 1 } };
  s.v7.en19 = { bosses: {}, titles: [], zoneClaimed: {}, koStats: { right: 0, wrong: 0 } };
  for (let i = 0; i < n19; i++) s.v7.en19.bosses['v11_boss' + i] = { en: { win: 1, wins: 1, stars: 2, best: 2 } };
  return s;
}
function lsKeys(ctx) {
  const keys = [];
  for (let i = 0; i < ctx.__sandbox.localStorage.length; i++) keys.push(ctx.__sandbox.localStorage.key(i));
  return keys;
}
function countOcc(hay, needle) { return hay.split(needle).length - 1; }

async function main() {
  console.log(`test33.js — DIR=${DIR}`);
  for (const f of ['index.html', 'v33.js', 'v33.css', 'v33_data.js', 'v19.js', 'v19_data.js', 'v18.js', 'v27.js', 'v23.js', 'v23_data.js', 'v20_sync.js', 'v31.js']) {
    if (!fs.existsSync(path.join(DIR, f))) { console.log(`FAIL: ${f} missing in DIR — run build_v33.py first`); process.exit(2); }
  }
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf-8');
  const wordsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'v33_words.json'), 'utf-8'));

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('title is V17.0', html.includes('<title>Korean &amp; English Vocab Farm V17.0 — Chrono Kingdom — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>'));
  check('__v33 + 17.0.0 present', html.includes('window.__v33') && html.includes("VERSION='17.0.0'"));
  check('__V33_DATA + __V33_WORDS present', html.includes('window.__V33_DATA') && html.includes('window.__V33_WORDS'));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0', '16.4.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v33', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v33', styleIds.join(','));
  check('script markers end v33', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v33', scriptIds.join(','));
  check('v33data present and before v33js', html.includes('id="v33data"') && html.indexOf('id="v33data"') < html.indexOf('id="v33js"'));
  check('KO v33kotab button x1 (after v27kotab)', countOcc(html, 'v33kotab') === 1 && html.indexOf('v33kotab') > html.indexOf('v27kotab'));
  check('KO v27kotab button still x1', countOcc(html, '<button class="tab v27kotab"') === 1);
  check('KO v23kotab button still x1', countOcc(html, '<button class="tab v23kotab"') === 1);
  check('EN decorator class v33hubbtn present x4 (2 selectors + 2 creations)', countOcc(html, 'v33hubbtn') === 4);
  check('no v28/v29/v30 markers', !html.includes('id="v28"') && !html.includes('id="v29"') && !html.includes('id="v30"'));
  for (const m of ['v21emailbtn', '_esc21', 'armV27Obs', 'rearmObserver', '_speakXp', 'V29 (F-05)']) {
    check(`out-of-scope marker absent: ${m}`, !html.includes(m));
  }
  // Replacement fragments (each R-V33-* replacement, at least once).
  const frags33 = [
    ['R-V33-V19-FIGHT', "__V33_DATA.byId(id)"],
    ['R-V33-V19-UNLOCK', "b.zone==='chrono'&&window.__v33&&__v33.bossUnlocked"],
    ['R-V33-V19-SHIELD', "b.id==='v17_geargolem'?90:"],
    ['R-V33-V19-PHASE', "F.boss.id!=='v17_geargolem'"],
    ['R-V33-V19-HEAL', "GEAR GOLEM hồi 10 HP"],
    ['R-V33-V18-ALL', "__V33_DATA?__V33_DATA.bosses:[]"],
    ['R-V33-V21-TOTAL', 'var TOTAL_BOSSES=78;'],
    ['R-V33-V27-EXP', 'startSession:startSession'],
    ['R-V33-V20-HAS', 'v7.en33.quests'],
    ['R-V33-V20-MERGE', "else if(kk==='en33')"],
    ['R-V33-V15-BUILDWORDS', '/* V33: CHRONO KINGDOM'],
  ];
  for (const [label, frag] of frags33) check(`replacement fragment ${label} present`, html.includes(frag), frag);
  check('V18 challenge/collDetail fall-through x2 (bossById line)', countOcc(html, "var b=bossById(id)||(window.__V19_DATA&&__V19_DATA.byId?__V19_DATA.byId(id):null)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null);if(!b)return;") === 2);
  check('V19 fight fall-through x1 (D19().byId line)', countOcc(html, "var b=D19().byId(id)||(window.__V33_DATA&&__V33_DATA.byId?__V33_DATA.byId(id):null);if(!b)return;") === 1);
  check('B-33-2 fix: en33 merge regionClaimed uses per-language MAX (not unionTrue)', html.includes('m33.regionClaimed={en:Math.max(rcL.en||0,rcC.en||0),ko:Math.max(rcL.ko||0,rcC.ko||0)}'));
  check('B-33-1 fix: checkCompletions gates quest completion on QUEST_MIN_ACC', html.includes('hit.acc>=QUEST_MIN_ACC') && html.includes('QUEST_MIN_ACC=0.8'));
  check('V31 in-scope fragments still present (F-01 + C9)', html.includes('/* V31 (F-01):') && html.includes('__v20.importFile(imp)'));
  check('V32 R-V32-VER guard still present', html.includes('bad-version'));
  check('__v32 + 16.4.0 still present', html.includes('window.__v32') && html.includes("VERSION='16.4.0'"));
  check('test33.js present in the work tree (tools/v33/test33.js)', fs.existsSync(path.join(ROOT, 'tools', 'v33', 'test33.js')), 'missing in ' + ROOT);
  // Art in the package.
  const bossPngs = ['sandwisp', 'pendulum', 'specter', 'mantis', 'hound', 'oracle', 'titan', 'geargolem'];
  for (const b of bossPngs) check(`boss art assets/bosses/v17/v17_${b}.png present`, fs.existsSync(path.join(DIR, 'assets', 'bosses', 'v17', `v17_${b}.png`)));
  for (const sp of ['stardeer', 'gearbeetle', 'cosmicunicorn']) for (const s of [1, 2, 3]) {
    check(`pet art assets/pets/v15/chrono/${sp}_s${s}.png present`, fs.existsSync(path.join(DIR, 'assets', 'pets', 'v15', 'chrono', `${sp}_s${s}.png`)));
  }
  for (const eg of ['star', 'gear', 'cosmic']) check(`egg art assets/pets/v15/eggs/chrono_egg_${eg}.png present`, fs.existsSync(path.join(DIR, 'assets', 'pets', 'v15', 'eggs', `chrono_egg_${eg}.png`)));
  check('no duplicate pet art under assets/pets/v17/', !fs.existsSync(path.join(DIR, 'assets', 'pets', 'v17')));
  check('v33.js + v33.css + v33_data.js present in DIR', fs.existsSync(path.join(DIR, 'v33.js')) && fs.existsSync(path.join(DIR, 'v33.css')) && fs.existsSync(path.join(DIR, 'v33_data.js')));

  // ================= §1 gate (vm, real v33.js + v33_data.js) =================
  section('§1', '70-win gate (vm, real v33.js)');
  function gateCtx(save) {
    const c = makeCtx();
    c.S = save;
    // Minimal __v19 stub mirroring the real isWon19/stars19 semantics
    // (nested rec, win flag) — __v33.isWon delegates to __v19.isWon.
    evalIn(c, `
      window.__v19={
        isWon:function(id,lang){ var e=S.v7.en19; var r=e&&e.bosses&&e.bosses[id]; var w=r&&r[lang]; return !!(w&&w.win); },
        stars:function(id,lang){ var e=S.v7.en19; var r=e&&e.bosses&&e.bosses[id]; var w=r&&r[lang]; return w?(w.stars||0):0; }
      };
    `);
    loadFile(c, 'v33_data.js', 'v33_data');
    loadFile(c, 'v33.js', 'v33');
    return c;
  }
  const g0 = gateCtx(winsSave(0, 0, 0, 0));
  check('gate: 0 wins -> count 0, closed', evalIn(g0, 'window.__v33._test.correctedWinCount()') === 0 && evalIn(g0, 'window.__v33.gateOpen()') === false);
  const g69 = gateCtx(winsSave(10, 30, 0, 29));
  check('gate: 69 wins (10+30+0+29) -> closed', evalIn(g69, 'window.__v33._test.correctedWinCount()') === 69 && evalIn(g69, 'window.__v33.gateOpen()') === false);
  const g70 = gateCtx(winsSave(10, 30, 0, 30));
  check('gate: 70 wins (10+30+0+30) -> open exactly at 70', evalIn(g70, 'window.__v33._test.correctedWinCount()') === 70 && evalIn(g70, 'window.__v33.gateOpen()') === true);
  const g70b = gateCtx(winsSave(10, 0, 30, 30));
  check('gate: nested V18 wins count too (10+0+30+30=70) -> open', evalIn(g70b, 'window.__v33._test.correctedWinCount()') === 70 && evalIn(g70b, 'window.__v33.gateOpen()') === true);
  // A V18 boss with BOTH flat win and nested en win counts ONCE.
  const gDbl = gateCtx(winsSave(10, 29, 0, 30));
  evalIn(gDbl, `S.v7.en18.bosses['v10_both']={win:1,wins:2,en:{win:1,wins:1}};`);
  check('gate: V18 boss with flat+nested win counts once (70, not 71)', evalIn(gDbl, 'window.__v33._test.correctedWinCount()') === 70, evalIn(gDbl, 'window.__v33._test.correctedWinCount()'));
  // A V18 boss with only a KO win counts (once).
  const gKo = gateCtx(winsSave(10, 29, 0, 30));
  evalIn(gKo, `S.v7.en18.bosses['v10_koonly']={ko:{win:1,wins:1}};`);
  check('gate: V18 boss with KO-only win counts (70)', evalIn(gKo, 'window.__v33._test.correctedWinCount()') === 70, evalIn(gKo, 'window.__v33._test.correctedWinCount()'));
  // Breakdown + sequential unlock.
  const bd70 = evalIn(g70, 'window.__v33._test.winBreakdown()');
  check('gate: breakdown is 10/30/30', bd70 && bd70.en15 === 10 && bd70.en18 === 30 && bd70.en19 === 30, bd70);
  check('gate closed -> no Chrono boss unlocked', evalIn(g69, `window.__v33._test.bossUnlocked('v17_sandwisp','en')`) === false);
  check('gate open, no wins -> only sandwisp unlocked', evalIn(g70, `window.__v33._test.bossUnlocked('v17_sandwisp','en')`) === true && evalIn(g70, `window.__v33._test.bossUnlocked('v17_pendulum','en')`) === false);
  // Open overlay checks use a FRESH 70-win ctx (the sequential checks
  // below mutate g70 to 71 wins, so they must not share it).
  const g70o = gateCtx(winsSave(10, 30, 0, 30));
  const openHtml = evalIn(g70o, `window.__v33._test.overlayHTML()`);
  check('open overlay lists all 8 bosses + quests + rift', openHtml.indexOf('Boss Chrono') >= 0 && openHtml.indexOf('Nhiệm Vụ Cốt Truyện') >= 0 && openHtml.indexOf('Khe Nứt Thời Gian') >= 0 && openHtml.indexOf('Time Echo') >= 0);
  check('open overlay shows 70/70 + gate-open text', openHtml.indexOf('70/70') >= 0 && openHtml.indexOf('Cổng đã mở') >= 0);
  evalIn(g70, `S.v7.en19.bosses['v17_sandwisp']={en:{win:1,wins:1,stars:3,best:3}};`);
  check('sequential: after sandwisp EN win -> pendulum unlocked (EN), still locked (KO)', evalIn(g70, `window.__v33._test.bossUnlocked('v17_pendulum','en')`) === true && evalIn(g70, `window.__v33._test.bossUnlocked('v17_pendulum','ko')`) === false);
  check('region not won with 1/8 bosses', evalIn(g70, `window.__v33._test.regionWon('en')`) === false);
  // Locked overlay shows real progress (no fake active buttons).
  const lockedHtml = evalIn(g69, `window.__v33._test.overlayHTML()`);
  check('locked overlay shows real 69/70 progress', lockedHtml.indexOf('69/70') >= 0, lockedHtml.slice(0, 300));
  check('locked overlay has no fight button', lockedHtml.indexOf('Bắt đầu chiến đấu') < 0);
  // EN decorator: hub elements pre-registered before load -> button added once.
  const gDec = makeCtx();
  gDec.S = winsSave(10, 30, 0, 30);
  evalIn(gDec, `
    var hb = document.createElement('div'); hb.className='v15hub-headbtns';
    var x = document.createElement('button'); x.className='v15x'; hb.appendChild(x);
    var lb = document.createElement('div'); lb.className='v15lb-in';
    document.__queryMap['.v15hub-headbtns']=hb;
    document.__queryMap['#v15langbar .v15lb-in']=lb;
    window.__hubBtn=hb; window.__lbEl=lb;
  `);
  loadFile(gDec, 'v33_data.js', 'v33_data');
  loadFile(gDec, 'v33.js', 'v33');
  const decBtns = evalIn(gDec, `window.__hubBtn.children.filter(function(c){return String(c.className||'').indexOf('v33hubbtn')>=0}).length`);
  check('EN decorator adds exactly one Chrono button to the hub', decBtns === 1, decBtns);
  const decLb = evalIn(gDec, `window.__lbEl.children.filter(function(c){return String(c.className||'').indexOf('v33hubbtn')>=0}).length`);
  check('EN decorator adds exactly one Chrono button to the lang bar', decLb === 1, decLb);
  const decTxt = evalIn(gDec, `window.__hubBtn.children.filter(function(c){return String(c.className||'').indexOf('v33hubbtn')>=0})[0].textContent`);
  check('EN decorator button reads Chrono Kingdom', decTxt === '⏳ Chrono Kingdom', decTxt);

  // ================= §2 bosses (vm, real V19 UCE) =================
  section('§2', 'bosses — real V19 UCE (vm)');
  const ctx2 = makeCtx();
  ctx2.S = winsSave(10, 30, 0, 30);
  ctx2.S.xp = 5000;
  loadFile(ctx2, 'v33_data.js', 'v33_data');
  loadFile(ctx2, 'v33.js', 'v33');
  // __v15 stub (words + SRS + wallet) + __V15_DATA pools, defined in-vm
  // so they close over the vm-global S.
  evalIn(ctx2, `
    window.__enOld={box:{},right:{},wrong:{},review:[],xpAt:{}};
    window.__en15={due:{},intv:{},hist:{},daily:{correct:0,wrong:0,xp:0},modeBest:{},scope:null};
    window.__pops=[];
    window.__v15={
      words: window.__V33_DATA.words.slice(),
      enOld: function(){ return window.__enOld; },
      en15: function(){ return window.__en15; },
      buildWords: function(){ return window.__v15.words; },
      mark15: function(ok,w,mode){ var o=window.__enOld; o.box=o.box||{}; o.right=o.right||{}; o.wrong=o.wrong||{};
        if(ok){ o.right[w.id]=(o.right[w.id]||0)+1; o.box[w.id]=Math.min(5,(o.box[w.id]||0)+1); return 5; }
        o.wrong[w.id]=(o.wrong[w.id]||0)+1; o.box[w.id]=0; return 0; },
      gain15: function(n){ S.xp=(S.xp||0)+n; },
      save15: function(){}, pop15: function(t){ window.__pops.push(t); },
      speakWord: function(){}, esc: function(s){ return String(s==null?'':s); },
      openHub: function(){}, inScope: function(){ return true; },
      wordsFiltered: function(){ return window.__v15.words; }
    };
    window.__V15_DATA={grammar:[{q:'g1',o:['a','b','c','d'],a:0},{q:'g2',o:['a','b','c','d'],a:1},{q:'g3',o:['a','b','c','d'],a:2}],
      reading:[{qs:[{q:'r1',o:['a','b','c'],a:1}]}],
      builder:[{s:'the cat sat .'}]};
  `);
  loadFile(ctx2, 'v19_data.js', 'v19_data');
  loadFile(ctx2, 'v18_data.js', 'v18_data');
  loadFile(ctx2, 'v27.js', 'v27');
  loadFile(ctx2, 'v19.js', 'v19');
  loadFile(ctx2, 'v18.js', 'v18');
  const bosses = evalIn(ctx2, 'window.__V33_DATA.bosses');
  check('data: 8 Chrono bosses', bosses.length === 8, bosses.length);
  const V19EL = ['fire', 'ice', 'thunder', 'water', 'wind', 'earth', 'dark', 'nature', 'light', 'cosmic'];
  const ELEM_OK = ['burn', 'freeze', 'chain', 'veil', 'cleanse', 'regen', 'heal', 'gale', 'shield', 'rift'];
  const TACT_OK = ['tshield', 'theal', 'ttimer', 'tveil', 'tenrage'];
  const PASS_OK = ['bulwark', 'vampiric', 'swift', 'thorns'];
  let scaleOk = true, paletteOk = true;
  bosses.forEach((b, i) => {
    if (!(b.lv >= 61 && b.lv <= 68 && b.hp >= 620 && b.hp <= 750 && b.def >= 7 && b.def <= 8 && b.diff === 'B2' && b.zone === 'chrono' && b.lang === 'both')) scaleOk = false;
    if (!(V19EL.includes(b.el) && ELEM_OK.includes(b.skills.elem.id) && TACT_OK.includes(b.skills.tact.id) && PASS_OK.includes(b.skills.pass.id))) paletteOk = false;
    if (b.lv !== 61 + i || !(b.reward.xp >= 165 && b.reward.xp <= 220 && b.reward.gems >= 4 && b.reward.gems <= 6)) scaleOk = false;
    if (b.img !== 'assets/bosses/v17/' + b.id + '.png') scaleOk = false;
  });
  check('boss scale on game scale (lv 61-68, hp 620-750, def 7-8, diff B2)', scaleOk, bosses.map(b => b.lv + '/' + b.hp).join(' '));
  check('boss elements/skills from the V19 palette only', paletteOk);
  check('boss ids are v17_* and distinct from v10_/v11_', bosses.every(b => b.id.indexOf('v17_') === 0));
  check('GEAR GOLEM is the final boss (lv 68, hp 750, def 8)', bosses[7].id === 'v17_geargolem' && bosses[7].lv === 68 && bosses[7].hp === 750 && bosses[7].def === 8);
  check('element mapping (sand->earth, metal->earth, dark->dark, electric->thunder, void->cosmic, light->light, time->cosmic)',
    bosses[0].el === 'earth' && bosses[1].el === 'earth' && bosses[2].el === 'dark' && bosses[3].el === 'thunder' && bosses[4].el === 'cosmic' && bosses[5].el === 'light' && bosses[6].el === 'cosmic' && bosses[7].el === 'earth');
  check('__v27.startSession is exported (R-V33-V27-EXP)', evalIn(ctx2, `typeof window.__v27.startSession`) === 'function');
  check('__v19.bossUnlocked enforces the Chrono gate + sequence', evalIn(ctx2, `window.__v19.bossUnlocked('v17_sandwisp','en')`) === true && evalIn(ctx2, `window.__v19.bossUnlocked('v17_pendulum','en')`) === false);
  // Real sandwisp fight to a win.
  const xpBefore = evalIn(ctx2, 'S.xp');
  const gemsBefore = evalIn(ctx2, 'S.v7.gems');
  evalIn(ctx2, `window.__v19.fight('v17_sandwisp')`);
  check('sandwisp fight starts (F created, hp 620, phase 1)', evalIn(ctx2, `var F=window.__v19._test.F(); !!(F && F.hp===620 && F.phase===1)`) === true);
  let guard = 0;
  while (evalIn(ctx2, `var F=window.__v19._test.F(); F ? F.over : 'nofight'`) !== 'win' && guard++ < 300) {
    evalIn(ctx2, `window.__v19._test.pickCorrect(); window.__v19.next();`);
  }
  const F1 = evalIn(ctx2, 'window.__v19._test.F()');
  check('sandwisp fight won by answering correctly', F1 && F1.over === 'win', F1 && { over: F1.over, hp: F1.hp, right: F1.right, wrong: F1.wrong });
  const rec1 = evalIn(ctx2, `S.v7.en19.bosses['v17_sandwisp'] && S.v7.en19.bosses['v17_sandwisp'].en`);
  check('sandwisp win recorded in en19 (no duplicate en33 boss record)', rec1 && rec1.win === 1 && rec1.stars >= 1, rec1);
  // First-win XP = boss reward (165) + the real UCE per-answer XP from
  // mark19 (box-up +10 per new word / streak +5), which lands in
  // en15().daily.xp. Gems = reward only (4).
  const markXp = evalIn(ctx2, 'window.__v15.en15().daily.xp');
  check('sandwisp first-win XP+gems paid (165 + mark19 per-answer XP, 4 gems)', markXp > 0 && evalIn(ctx2, 'S.xp') === xpBefore + 165 + markXp && evalIn(ctx2, 'S.v7.gems') === gemsBefore + 4, { xp: evalIn(ctx2, 'S.xp'), markXp, gems: evalIn(ctx2, 'S.v7.gems') });
  check('no en33 boss records created (wins live in en19)', evalIn(ctx2, `(S.v7.en33||{}).bosses===undefined || Object.keys(S.v7.en33.bosses||{}).length===0`));
  // KO fights never modify S.cards (V11.1 rule, still true for Chrono).
  const cardsBefore = JSON.stringify(evalIn(ctx2, 'S.cards'));
  evalIn(ctx2, `window.__v19.close();`);
  check('KO rule: S.cards untouched by a Chrono fight', JSON.stringify(evalIn(ctx2, 'S.cards')) === cardsBefore);
  // GEAR GOLEM: 90-HP shield, P2 heal, no P3. The golem is boss #8, so
  // its 7 predecessors must be won first (sequential unlock).
  evalIn(ctx2, `for(var i=0;i<7;i++){ var id=window.__V33_DATA.bosses[i].id; S.v7.en19.bosses[id]={en:{win:1,wins:1,stars:3,best:3}}; }`);
  evalIn(ctx2, `window.__v19.fight('v17_geargolem')`);
  check('golem fight starts with 90-HP gear shield', evalIn(ctx2, `var F=window.__v19._test.F(); F && F.shield===90`) === true, evalIn(ctx2, `window.__v19._test.F() && window.__v19._test.F().shield`));
  evalIn(ctx2, `var F=window.__v19._test.F(); F.hp=300;`);
  evalIn(ctx2, `window.__v19._test.pickCorrect(); window.__v19.next();`);
  check('golem reaches phase 2 at <=50% HP', evalIn(ctx2, `window.__v19._test.F().phase`) === 2, evalIn(ctx2, `window.__v19._test.F().phase`));
  const hpPreWrong = evalIn(ctx2, `window.__v19._test.F().hp`);
  evalIn(ctx2, `window.__v19._test.pickWrong(); window.__v19.next();`);
  const hpPostWrong = evalIn(ctx2, `window.__v19._test.F().hp`);
  check('golem time-reversal: wrong answer in P2 heals exactly +10 HP', hpPostWrong === hpPreWrong + 10, { before: hpPreWrong, after: hpPostWrong });
  evalIn(ctx2, `var F=window.__v19._test.F(); F.hp=100;`);
  evalIn(ctx2, `window.__v19._test.pickCorrect(); window.__v19.next();`);
  check('golem has NO P3 at <=20% HP (phase stays 2, no counterattack)', evalIn(ctx2, `var F=window.__v19._test.F(); F.phase===2 && F.ultActive===false`) === true, evalIn(ctx2, `var F=window.__v19._test.F(); ({phase:F.phase,ult:F.ultActive})`));
  const phaseTxt = evalIn(ctx2, `document.getElementById('v19fight').innerHTML`);
  check('golem fight renders phase as /2 (not /3)', phaseTxt.indexOf('/2') >= 0 && phaseTxt.indexOf('Giai đoạn 2/3') < 0, phaseTxt.slice(0, 200));
  evalIn(ctx2, `window.__v19.close();`);
  // Collection head counts wins / 78 after the fights above.
  const collHtml = evalIn(ctx2, `window.__v18.collectionHTML()`);
  check('Collection shows 78 bosses (10+30+30+8)', collHtml.indexOf('78 boss') >= 0, collHtml.slice(0, 120));
  // 7 wins are recorded by now: the sandwisp fight win + the 6 other
  // predecessors granted for the golem fight (indices 0-6 overlap on
  // the sandwisp, so 7 distinct Chrono wins).
  check('Collection head counts 7 wins / 78 after the sandwisp win + golem setup', evalIn(ctx2, `window.__v18.collectionHTML().indexOf('7/78')>=0`) === true);
  // TOTAL_BOSSES via v21 (loaded in a guarded try — v21 is auth-heavy).
  let total78 = null, totalErr = '';
  try {
    loadFile(ctx2, 'v21.js', 'v21');
    total78 = evalIn(ctx2, 'window.__v21.TOTAL_BOSSES');
  } catch (e) { totalErr = String(e).slice(0, 200); }
  if (total78 === null) skipCheck('TOTAL_BOSSES 78 via live v21.js (load threw: ' + totalErr + ')', 'v21.js did not load in vm — static §0 check covers it');
  else check('TOTAL_BOSSES is 78 (live v21.js)', total78 === 78, total78);
  // Chrono boss detail via Collection fall-through (R-V33-V18-CH, collDetail).
  const detOk = evalIn(ctx2, `(function(){ try{ window.__v18.collDetail('v17_sandwisp'); var h=document.getElementById('v18colldetail').innerHTML; return h.indexOf('Tinh Linh')>=0; }catch(e){ return 'ERR:'+e.message; } })()`);
  check('Collection detail opens for a Chrono boss (collDetail fall-through)', detOk === true, detOk);

  // ================= §3 pets (vm, real v23) =================
  section('§3', 'pets — real v23 (vm)');
  const ctx3 = makeCtx();
  ctx3.S = baseSave({ xp: 100000 });
  ctx3.S.xp = 100000;
  evalIn(ctx3, `
    window.__pops=[];
    window.__v15={ save15:function(){}, pop15:function(t){ window.__pops.push(t); }, gain15:function(n){ S.xp=(S.xp||0)+n; } };
  `);
  loadFile(ctx3, 'v23_data.js', 'v23_data');
  loadFile(ctx3, 'v33_data.js', 'v33_data');
  loadFile(ctx3, 'v33.js', 'v33');
  loadFile(ctx3, 'v23.js', 'v23');
  check('__V23_DATA has 15 species after registration (12+3)', evalIn(ctx3, 'window.__V23_DATA.species.length') === 15, evalIn(ctx3, 'window.__V23_DATA.species.length'));
  check('__V23_DATA has 8 eggs after registration (5+3)', evalIn(ctx3, 'window.__V23_DATA.eggs.length') === 8, evalIn(ctx3, 'window.__V23_DATA.eggs.length'));
  check('new species ids present (stardeer/gearbeetle/cosmicunicorn)', evalIn(ctx3, `['stardeer','gearbeetle','cosmicunicorn'].every(function(id){ return window.__V23_DATA.species.some(function(s){ return s.id===id; }); })`) === true);
  check('new species elements are nature/thunder/light', evalIn(ctx3, `var D=window.__V23_DATA; var by=function(id){ return D.species.filter(function(s){ return s.id===id; })[0]; }; by('stardeer').el==='nature' && by('gearbeetle').el==='thunder' && by('cosmicunicorn').el==='light'`) === true);
  check('new species skills use existing v23 types only (wisdom/heal, shield/crystal, storm/dmg)',
    evalIn(ctx3, `var D=window.__V23_DATA; var by=function(id){ return D.species.filter(function(s){ return s.id===id; })[0]; };
      by('stardeer').skills.p.type==='wisdom' && by('stardeer').skills.a.type==='heal'
      && by('gearbeetle').skills.a.type==='shield' && by('gearbeetle').skills.p.type==='crystal'
      && by('cosmicunicorn').skills.p.type==='storm' && by('cosmicunicorn').skills.a.type==='dmg'`) === true);
  check('new egg data on scale (star 1200/120, gear 1000/120, cosmic 2000/240)',
    evalIn(ctx3, `var D=window.__V23_DATA; var by=function(id){ return D.eggs.filter(function(e){ return e.id===id; })[0]; };
      by('star').price===1200 && by('star').hatchMin===120 && by('gear').price===1000 && by('gear').hatchMin===120 && by('cosmic').price===2000 && by('cosmic').hatchMin===240`) === true);
  check('pet stage imgs use chrono/ subpath, egg imgs are bare chrono_egg_*.png filenames',
    evalIn(ctx3, `var D=window.__V23_DATA; var by=function(id){ return D.species.filter(function(s){ return s.id===id; })[0]; };
      by('stardeer').stages[0].img==='chrono/stardeer_s1.png' && by('cosmicunicorn').stages[2].img==='chrono/cosmicunicorn_s3.png'
      && D.eggs.filter(function(e){ return e.id==='star'; })[0].img==='chrono_egg_star.png'`) === true);
  const reg2 = evalIn(ctx3, 'window.__v33.registerPets()');
  check('registerPets is idempotent (2nd call adds 0 species / 0 eggs)', reg2 && reg2.species === 0 && reg2.eggs === 0, reg2);
  check('45-form collection milestone added (36+9)', evalIn(ctx3, `window.__V23_DATA.collectionRewards.some(function(r){ return r.forms===45 && r.gems===60; })`) === true);
  // Team of the 3 new species (lv 5) -> teamBattle aggregation.
  evalIn(ctx3, `
    var e23 = window.__v23._test.en23();
    function mkPet(sp, st, lv){ var inst = window.__v23._test.newPet(sp); inst.st=st; inst.lv=lv; return inst; }
    var p1=mkPet('stardeer',2,5), p2=mkPet('gearbeetle',0,5), p3=mkPet('cosmicunicorn',0,5);
    e23.pets[p1.id]=p1; e23.pets[p2.id]=p2; e23.pets[p3.id]=p3;
    window.__v23._test.setTeamSlot(0,p1.id); window.__v23._test.setTeamSlot(1,p2.id); window.__v23._test.setTeamSlot(2,p3.id);
    window.__teamIds=[p1.id,p2.id,p3.id];
  `);
  const tb = evalIn(ctx3, 'window.__v23.teamBattle()');
  check('teamBattle: Star Deer wisdom passive active (lv 5)', tb && tb.wisdom === true, tb);
  check('teamBattle: Cosmic Unicorn storm +8 at combo>=3', tb && tb.storm === 8, tb && tb.storm);
  check('teamBattle: Gear Beetle crystal cuts shield drain to 45 (60-15)', tb && tb.drain === 45, tb && tb.drain);
  check('teamBattle: 3 distinct elements give the elemental-link bonus path', tb && tb.elements && tb.elements.length === 3, tb && tb.elements);
  check('leader XP bonus is +20% with a stage-3 leader (existing rule, any leader)', evalIn(ctx3, 'window.__v23.learnXpBonus()') === 0.2, evalIn(ctx3, 'window.__v23.learnXpBonus()'));
  // Chrono egg hatch end-to-end.
  const buyStar = evalIn(ctx3, `window.__v23._test.buyEgg('star')`);
  check('buyEgg(star) works from the shop (1200 coins)', buyStar && buyStar.ok === true, buyStar);
  const hatchStar = evalIn(ctx3, `window.__v23._test.startHatch('star')`);
  check('startHatch(star) works', hatchStar && hatchStar.ok === true, hatchStar);
  evalIn(ctx3, `window.__v23._test.forceHatchReady();`);
  const claimed = evalIn(ctx3, `window.__v23._test.claimHatch()`);
  check('claimHatch(star) hatches a Star Deer', claimed && claimed.ok === true && claimed.pet && claimed.pet.sp === 'stardeer', claimed && claimed.pet);
  // Evolution guards + success (stone_nature + feather/fruit + coins, Lv 10).
  const evoYoung = evalIn(ctx3, `(function(){ var e=window.__v23._test.en23(); var id=window.__teamIds[1]; var p=e.pets[id]; p.lv=5; return window.__v23._test.evolvePet(id); })()`);
  check('evolvePet refuses below Lv 10', evoYoung && evoYoung.ok === false, evoYoung);
  const evoPoor = evalIn(ctx3, `(function(){ var e=window.__v23._test.en23(); var id=window.__teamIds[1]; var p=e.pets[id]; p.lv=10; return window.__v23._test.evolvePet(id); })()`);
  check('evolvePet refuses without materials', evoPoor && evoPoor.ok === false, evoPoor);
  evalIn(ctx3, `var e=window.__v23._test.en23(); e.mats.stone_thunder=10; e.mats.feather=3; e.mats.fruit=3;`);
  const evoOk = evalIn(ctx3, `(function(){ var id=window.__teamIds[1]; return window.__v23._test.evolvePet(id); })()`);
  check('evolvePet succeeds with Lv 10 + stone_thunder/feather/fruit + coins', evoOk && evoOk.ok === true && evoOk.pet.st === 1, evoOk);
  check('evolution consumed the materials (stone_thunder 0)', evalIn(ctx3, `window.__v23._test.en23().mats.stone_thunder`) === 0);
  const collPoor = evalIn(ctx3, `window.__v23._test.claimCollection(4)`);
  check('45-form milestone cannot be claimed early (guard works)', collPoor && collPoor.ok === false, collPoor);
  check('pet images resolve to the moved paths (no v17/ pet references in data)', evalIn(ctx3, `JSON.stringify(window.__V23_DATA.species).indexOf('pets/v17')<0 && JSON.stringify(window.__V23_DATA.eggs).indexOf('chrono_egg_')>=0`) === true);

  // ================= §4 quests (vm, real V27 engine) =================
  section('§4', 'quests — real V27 engine (vm)');
  function questCtx() {
    const c = makeCtx();
    c.S = winsSave(10, 30, 0, 30);
    c.S.xp = 1000;
    // Minimal __v19 stub (same semantics as the real isWon19/stars19/
    // en19) — __v33.isWon / regionWon / claimRegion delegate to __v19.
    evalIn(c, `
      window.__v19={
        isWon:function(id,lang){ var e=S.v7.en19; var r=e&&e.bosses&&e.bosses[id]; var w=r&&r[lang]; return !!(w&&w.win); },
        stars:function(id,lang){ var e=S.v7.en19; var r=e&&e.bosses&&e.bosses[id]; var w=r&&r[lang]; return w?(w.stars||0):0; },
        en19:function(){ return S.v7.en19; }
      };
    `);
    loadFile(c, 'v33_data.js', 'v33_data');
    loadFile(c, 'v33.js', 'v33');
    evalIn(c, `
      window.__enOld={box:{},right:{},wrong:{},review:[],xpAt:{}};
      window.__en15={due:{},intv:{},hist:{},daily:{correct:0,wrong:0,xp:0},modeBest:{},scope:null};
      window.__pops=[];
      window.__v15={
        // Stub words carry lib 'chrono' exactly as the real buildWords()
        // merge does (the V33 block sets lib/t/lv on merged words).
        words: window.__V33_DATA.words.map(function(w){ var c={}; for(var k in w) c[k]=w[k]; c.lib=['chrono']; c.t='chrono'; c.lv='B2'; return c; }),
        enOld: function(){ return window.__enOld; },
        en15: function(){ return window.__en15; },
        buildWords: function(){ return window.__v15.words; },
        mark15: function(ok,w,mode){ var o=window.__enOld; o.box=o.box||{}; o.right=o.right||{}; o.wrong=o.wrong||{};
          if(ok){ o.right[w.id]=(o.right[w.id]||0)+1; o.box[w.id]=Math.min(5,(o.box[w.id]||0)+1); return 5; }
          o.wrong[w.id]=(o.wrong[w.id]||0)+1; o.box[w.id]=0; return 0; },
        gain15: function(n){ S.xp=(S.xp||0)+n; },
        save15: function(){}, pop15: function(t){ window.__pops.push(t); },
        speakWord: function(){}, esc: function(s){ return String(s==null?'':s); },
        openHub: function(){}, inScope: function(){ return true; },
        wordsFiltered: function(){ return window.__v15.words; }
      };
      window.__V15_DATA={grammar:[{q:'g1',o:['a','b','c','d'],a:0}],reading:[{qs:[{q:'r1',o:['a','b','c'],a:1}]}],builder:[{s:'the cat sat .'}]};
    `);
    loadFile(c, 'v27.js', 'v27');
    return c;
  }
  // Drives the live V27 session to its finishSession (answers via the
  // exported answerMC/nextQ). okPattern is consumed IN ORDER (main
  // questions first, then reasks); past its end, answers are correct.
  function driveSession(c, okPattern) {
    const before = evalIn(c, `window.__v27.en27().sessions.length`);
    let guard = 0;
    while (evalIn(c, `window.__v27.en27().sessions.length`) === before && guard < 80) {
      const ok = guard < okPattern.length ? okPattern[guard] : true;
      evalIn(c, `window.__v27.answerMC('x', ${ok ? 'true' : 'false'}); window.__v27.nextQ();`);
      guard++;
    }
    const sessions = evalIn(c, `window.__v27.en27().sessions`);
    return sessions.length > before ? sessions[0] : null;
  }
  const ctx4 = questCtx();
  check('quest data: 6 quests, 10-14 ids each, ids exist in the 240 words',
    evalIn(ctx4, `var D=window.__V33_DATA; D.quests.length===6 && D.quests.every(function(q){ return q.ids.length>=10 && q.ids.length<=14 && q.ids.every(function(id){ return D.words.some(function(w){ return w.id===id; }); }); })`) === true);
  check('quest lists cover all 4 sets (time/space/machines/change)',
    evalIn(ctx4, `var D=window.__V33_DATA; var sets={}; D.quests.forEach(function(q){ q.ids.forEach(function(id){ var w=D.words.filter(function(x){ return x.id===id; })[0]; if(w) sets[w.set]=1; }); }); Object.keys(sets).length===4`) === true);
  const q0 = evalIn(ctx4, `window.__V33_DATA.quests[0]`);
  check('startQuest records a pending launch and starts the V27 session',
    evalIn(ctx4, `window.__v33.startQuest('q_clock')`) === true
    && evalIn(ctx4, `!!(window.__v33.en33().pending['quest:q_clock'])`) === true);
  const rec4 = driveSession(ctx4, [true]);
  check('real V27 session finishes and writes a session rec (12 correct, acc 1.0)',
    rec4 && rec4.total === 12 && rec4.correct === 12 && rec4.words.length === 12, rec4);
  check('session rec words cover the quest ids exactly',
    rec4 && q0.ids.every(id => rec4.words.indexOf(id) >= 0), rec4 && rec4.words);
  const done4 = evalIn(ctx4, `window.__v33.checkCompletions()`);
  check('checkCompletions marks the quest done (acc 1.0)', done4 && done4.indexOf('q_clock') >= 0 && evalIn(ctx4, `window.__v33.questState('q_clock')`) === 'done', done4);
  const xpBeforeClaim = evalIn(ctx4, 'S.xp');
  const gemsBeforeClaim = evalIn(ctx4, 'S.v7.gems');
  const claim4 = evalIn(ctx4, `window.__v33._test.claimQuest('q_clock')`);
  check('claimQuest pays +30 XP (20 first clear + 10 for >=90%)', claim4 && claim4.ok === true && evalIn(ctx4, 'S.xp') === xpBeforeClaim + 30, { claim4, xp: evalIn(ctx4, 'S.xp'), before: xpBeforeClaim });
  check('claimQuest does not pay a gem for a non-final quest', evalIn(ctx4, 'S.v7.gems') === gemsBeforeClaim);
  const claim4b = evalIn(ctx4, `window.__v33._test.claimQuest('q_clock')`);
  check('claimQuest is claimed-guarded (2nd claim fails, no XP)', claim4b && claim4b.ok === false && evalIn(ctx4, 'S.xp') === xpBeforeClaim + 30, claim4b);
  // A <0.8 run does NOT complete the quest.
  const ctx4b = questCtx();
  evalIn(ctx4b, `window.__v33.startQuest('q_gear')`);
  // 12 main: 8 right / 4 wrong, then 4 reasks all right -> 12/16 = 0.75.
  const rec4b = driveSession(ctx4b, [true, true, false, true, true, false, true, true, false, true, true, false, true, true, true, true]);
  check('low-accuracy session rec exists (acc 0.75)', rec4b && Math.abs(rec4b.correct / rec4b.total - 0.75) < 0.001, rec4b && { c: rec4b.correct, t: rec4b.total });
  evalIn(ctx4b, `window.__v33.checkCompletions()`);
  check('quest with acc 0.75 (<0.8) is NOT marked done', evalIn(ctx4b, `window.__v33.questState('q_gear')`) !== 'done', evalIn(ctx4b, `window.__v33.questState('q_gear')`));
  const claim4c = evalIn(ctx4b, `window.__v33._test.claimQuest('q_gear')`);
  check('unfinished quest cannot be claimed', claim4c && claim4c.ok === false, claim4c);
  // Final Countdown pays the gem on claim.
  const ctx4c = questCtx();
  evalIn(ctx4c, `window.__v33.startQuest('q_final')`);
  driveSession(ctx4c, [true]);
  evalIn(ctx4c, `window.__v33.checkCompletions()`);
  const gems4c = evalIn(ctx4c, 'S.v7.gems');
  const claim4d = evalIn(ctx4c, `window.__v33._test.claimQuest('q_final')`);
  check('Final Countdown claim pays +30 XP + 1 gem', claim4d && claim4d.ok === true && evalIn(ctx4c, 'S.v7.gems') === gems4c + 1, claim4d);
  // Region completion reward (all 8 won in one language).
  const ctx4d = questCtx();
  evalIn(ctx4d, `for(var i=0;i<8;i++){ var id=window.__V33_DATA.bosses[i].id; S.v7.en19.bosses[id]={en:{win:1,wins:1,stars:3,best:3}}; }`);
  check('regionWon true when all 8 won in EN', evalIn(ctx4d, `window.__v33._test.regionWon('en')`) === true);
  const xp4d = evalIn(ctx4d, 'S.xp');
  const reg4 = evalIn(ctx4d, `window.__v33._test.claimRegion('en')`);
  check('claimRegion pays +150 XP + 5 gems + title once', reg4 && reg4.ok === true && evalIn(ctx4d, 'S.xp') === xp4d + 150 && evalIn(ctx4d, 'S.v7.gems') === 5 && evalIn(ctx4d, `S.v7.en19.titles.indexOf('Chúa Tể Thời Gian')>=0`) === true, reg4);
  const reg4b = evalIn(ctx4d, `window.__v33._test.claimRegion('en')`);
  check('claimRegion is claimed-guarded (2nd claim fails)', reg4b && reg4b.ok === false, reg4b);

  // ================= §5 Time Echo =================
  section('§5', 'Time Echo (vm)');
  const ctx5 = makeCtx();
  ctx5.S = winsSave(10, 30, 0, 30);
  loadFile(ctx5, 'v33_data.js', 'v33_data');
  loadFile(ctx5, 'v33.js', 'v33');
  loadFile(ctx5, 'v27.js', 'v27');
  check('Echo list is empty with no wrong-word records (honest empty state)',
    evalIn(ctx5, `window.__v33.echoList().length`) === 0);
  check('startEcho with an empty list refuses honestly', evalIn(ctx5, `window.__v33.startEcho()`) === false);
  evalIn(ctx5, `var d=window.__v27.en27(); d.en.cw={}; d.en.cw['v33_alarm_clock']=3; d.en.cw['w1']=1; d.en.cw['v33_agenda']=5;`);
  const echo5 = evalIn(ctx5, `window.__v33.echoList()`);
  check('Echo list returns cw>=1 words, most-wrong first', echo5.length === 3 && echo5[0].id === 'v33_agenda' && echo5[0].cw === 5 && echo5[1].id === 'v33_alarm_clock', echo5);
  evalIn(ctx5, `var d=window.__v27.en27(); for(var i=0;i<12;i++) d.en.cw['echo_word_'+i]=i+1;`);
  check('Echo list caps at 10 (most-wrong first)', evalIn(ctx5, `window.__v33.echoList().length`) === 10 && evalIn(ctx5, `window.__v33.echoList()[0].cw`) === 12);
  evalIn(ctx5, `var d=window.__v27.en27(); d.en.cw={};`);
  check('Echo list empties again when cw records clear', evalIn(ctx5, `window.__v33.echoList().length`) === 0);

  // ================= §6 Chrono Rift =================
  section('§6', 'Chrono Rift (vm)');
  const ctx6 = questCtx();
  check('rift data: 3 floors x 7 questions, ids exist, disjoint from quests',
    evalIn(ctx6, `var D=window.__V33_DATA; D.rift.length===3 && D.rift.every(function(f){ return f.ids.length===7 && f.ids.every(function(id){ return D.words.some(function(w){ return w.id===id; }); }); })
      && D.rift.every(function(f){ return f.ids.every(function(id){ return !D.quests.some(function(q){ return q.ids.indexOf(id)>=0; }); }); })`) === true);
  check('rift floor 1 unlocked, floors 2-3 locked at start',
    evalIn(ctx6, `window.__v33.riftUnlocked(1)`) === true && evalIn(ctx6, `window.__v33.riftUnlocked(2)`) === false && evalIn(ctx6, `window.__v33.riftUnlocked(3)`) === false);
  check('startRift(2) refuses while locked', evalIn(ctx6, `window.__v33.startRift(2)`) === false);
  evalIn(ctx6, `window.__v33.startRift(1)`);
  const rec6 = driveSession(ctx6, [true]);
  check('rift floor 1 session finishes 7/7 (acc 1.0)', rec6 && rec6.total === 7 && rec6.correct === 7, rec6);
  evalIn(ctx6, `window.__v33.checkCompletions()`);
  check('rift floor 1 best recorded (1.0)', evalIn(ctx6, `window.__v33.en33().rift.best[1]`) === 1, evalIn(ctx6, `window.__v33.en33().rift`));
  check('rift floor 2 unlocks after floor 1 >= 0.7', evalIn(ctx6, `window.__v33.riftUnlocked(2)`) === true);
  const xp6 = evalIn(ctx6, 'S.xp');
  const gems6 = evalIn(ctx6, 'S.v7.gems');
  const claim6 = evalIn(ctx6, `window.__v33._test.claimRift(1)`);
  check('claimRift floor 1 at 100% pays +40 XP + 2 gems', claim6 && claim6.ok === true && evalIn(ctx6, 'S.xp') === xp6 + 40 && evalIn(ctx6, 'S.v7.gems') === gems6 + 2, claim6);
  const claim6b = evalIn(ctx6, `window.__v33._test.claimRift(1)`);
  check('claimRift once/day: 2nd claim same day fails', claim6b && claim6b.ok === false, claim6b);
  // Floor 2: 7 main (5 right / 2 wrong) + 2 reasks right -> 7/9 = 0.778.
  evalIn(ctx6, `window.__v33.startRift(2)`);
  const rec6b = driveSession(ctx6, [true, true, false, true, true, false, true, true, true]);
  check('rift floor 2 session acc is 7/9 (~0.78)', rec6b && Math.abs(rec6b.correct / rec6b.total - 7 / 9) < 0.001, rec6b && { c: rec6b.correct, t: rec6b.total });
  evalIn(ctx6, `window.__v33.checkCompletions()`);
  const xp6b = evalIn(ctx6, 'S.xp');
  const gems6b = evalIn(ctx6, 'S.v7.gems');
  const claim6c = evalIn(ctx6, `window.__v33._test.claimRift(2)`);
  check('claimRift floor 2 at ~78% pays +25 XP + 1 gem', claim6c && claim6c.ok === true && evalIn(ctx6, 'S.xp') === xp6b + 25 && evalIn(ctx6, 'S.v7.gems') === gems6b + 1, claim6c);
  check('rift floor 3 unlocks after floor 2 >= 0.7', evalIn(ctx6, `window.__v33.riftUnlocked(3)`) === true);
  // Day rollover resets the once/day claim.
  evalIn(ctx6, `window.__v33.en33().rift.day='Mon Jan 01 2024';`);
  const claim6d = evalIn(ctx6, `window.__v33._test.claimRift(1)`);
  check('claimRift works again after the day rolls over', claim6d && claim6d.ok === true, claim6d);
  check('riftRewardFor tiers (0.95->40/2, 0.8->25/1, 0.6->10/0)',
    evalIn(ctx6, `var f=window.__v33._test.riftRewardFor; f(0.95).xp===40 && f(0.95).gems===2 && f(0.8).xp===25 && f(0.8).gems===1 && f(0.6).xp===10 && f(0.6).gems===0`) === true);

  // ================= §7 words + buildWords merge =================
  section('§7', 'words + buildWords merge (vm, real V33 block)');
  check('data/v33_words.json: 240 words', wordsJson.length === 240, wordsJson.length);
  const sets7 = {};
  wordsJson.forEach(w => { sets7[w.set] = (sets7[w.set] || 0) + 1; });
  check('data: 4 sets x 60 (time/space/machines/change)', sets7.time === 60 && sets7.space === 60 && sets7.machines === 60 && sets7.change === 60, sets7);
  check('data: every word has en/ko/vi/ipa/pos/ex/exvi non-blank',
    wordsJson.every(w => ['en', 'ko', 'vi', 'ipa', 'pos', 'ex', 'exvi'].every(f => (w[f] || '').trim() !== '')));
  // The Python validator is the authority for overlap vs all 4,891
  // existing headwords (it reads every source); run it here.
  let valOut = '';
  try { valOut = execSync('python3 tools/v33/validate_words.py', { cwd: ROOT, encoding: 'utf-8' }); } catch (e) { valOut = String((e && e.stdout) || e); }
  check('tools/v33/validate_words.py PASSES (0 overlaps, 0 blanks)', valOut.indexOf('RESULT: PASS') >= 0, valOut.slice(-200));
  // Real v33_data.js word table.
  const ctx7 = makeCtx();
  loadFile(ctx7, 'v33_data.js', 'v33_data');
  const dw = evalIn(ctx7, 'window.__V33_DATA.words');
  check('v33_data.js: 240 words', dw.length === 240, dw.length);
  check('v33_data.js: ids are v33_<slug>, unique', dw.every(w => w.id.indexOf('v33_') === 0) && new Set(dw.map(w => w.id)).size === 240);
  check('v33_data.js: word ids match data/v33_words.json 1:1 (same order)',
    dw.every((w, i) => w.en === wordsJson[i].en && w.set === wordsJson[i].set));
  // Extract the REAL V33 block from src/v15.js and eval it in a mini ctx.
  const v15src = fs.readFileSync(path.join(ROOT, 'src', 'v15.js'), 'utf-8');
  const bStart = v15src.indexOf('/* V33: CHRONO KINGDOM');
  const bEnd = v15src.indexOf('/* V16: cập nhật từ có sẵn');
  check('V33 buildWords block present in src/v15.js (before the V16 block)', bStart >= 0 && bEnd > bStart, { bStart, bEnd });
  const block = v15src.slice(bStart, bEnd);
  const ctx7b = makeCtx();
  evalIn(ctx7b, `
    var WORDS=[
      {id:'w5',t:'daily',en:'alarm clock',vi:'đồng hồ báo thức (cũ)',ipa:'',pos:'noun',ex:'',exvi:'',lv:'A1',custom:false},
      {id:'w10',t:'daily',en:'apple',vi:'quả táo',ipa:'',pos:'noun',ex:'',exvi:'',lv:'A1',custom:false}
    ];
    var BYID={}; WORDS.forEach(function(w){ BYID[w.id]=w; });
    var LV={'alarm clock':'A1','apple':'A1'};
    window.__V33_WORDS = window.__V33_DATA ? window.__V33_DATA.words : [];
  `);
  loadFile(ctx7b, 'v33_data.js', 'v33_data');
  evalIn(ctx7b, `window.__V33_WORDS = window.__V33_DATA.words;`);
  evalIn(ctx7b, block);
  const merged7 = evalIn(ctx7b, 'WORDS');
  check('merge: WORDS grows by 239 (240 chrono - 1 overlap), no duplicate record for the overlap',
    merged7.length === 241, merged7.length);
  const overlap7 = merged7.filter(w => w.en === 'alarm clock');
  check('merge: overlapping word keeps its id (w5) and gains lib chrono', overlap7.length === 1 && overlap7[0].id === 'w5' && overlap7[0].lib && overlap7[0].lib.indexOf('chrono') >= 0, overlap7);
  const new7 = merged7.filter(w => w.id === 'v33_agenda');
  check('merge: chrono-only word added with id v33_<slug>, lv B2, lib chrono',
    new7.length === 1 && new7[0].lv === 'B2' && new7[0].lib && new7[0].lib[0] === 'chrono' && new7[0].t === 'chrono', new7);
  check('merge: no S.cards entries created (WORDS only)', evalIn(ctx7b, `typeof S==='undefined' || !S.cards || S.cards.length===0`) !== false);
  check('merge block is idempotent (2nd eval adds nothing)', (() => { evalIn(ctx7b, block); return evalIn(ctx7b, 'WORDS.length') === 241; })());
  check('attachChrono counts chrono words in __v15.words (live v33.js)',
    evalIn(ctx4, `window.__v33.attachChrono()`) === 240, evalIn(ctx4, `window.__v33.attachChrono()`));

  // ================= §8 en33 merge / hasProgress / validate / export / conflict =================
  section('§8', 'en33 merge + sync regressions (vm, real v20_sync.js)');
  const ctx8 = makeCtx();
  loadFile(ctx8, 'v20_sync.js', 'v20_sync');
  const S20 = evalIn(ctx8, 'window.__v20sync');
  check('__v20sync loaded', !!S20 && typeof S20.mergeSaves === 'function');
  const A8 = baseSave({ xp: 500, v7: { gems: 3, en33: { quests: { q_clock: { done: 1, claimed: 0, acc: 1, at: 1000 } }, rift: { day: 'Tue Nov 18 2026', best: { 1: 0.9 }, claimed: { 1: 1 } }, regionClaimed: { en: 1, ko: 0 }, pending: { 'quest:q_gear': { kind: 'quest' } }, created: 1000 } } });
  const B8 = baseSave({ xp: 800, v7: { gems: 5, en33: { quests: { q_clock: { done: 1, claimed: 1, acc: 0.9, at: 2000 }, q_gear: { done: 1, claimed: 0, acc: 0.85, at: 1500 } }, rift: { day: 'Tue Nov 18 2026', best: { 1: 0.75, 2: 0.8 }, claimed: { 2: 1 } }, regionClaimed: { en: 0, ko: 1 }, pending: {}, created: 500 } } });
  ctx8.__A8 = A8; ctx8.__B8 = B8;
  const m8 = evalIn(ctx8, 'window.__v20sync.mergeSaves(__A8, __B8, 1000, 2000)');
  check('en33 merge: quest done union (q_clock done)', m8.v7.en33.quests.q_clock && m8.v7.en33.quests.q_clock.done === 1, m8.v7.en33.quests.q_clock);
  check('en33 merge: quest claimed union (q_clock claimed survives)', m8.v7.en33.quests.q_clock.claimed === 1, m8.v7.en33.quests.q_clock);
  check('en33 merge: quest acc MAX (1.0, never averaged)', m8.v7.en33.quests.q_clock.acc === 1, m8.v7.en33.quests.q_clock);
  check('en33 merge: quest at MAX (2000)', m8.v7.en33.quests.q_clock.at === 2000, m8.v7.en33.quests.q_clock);
  check('en33 merge: cloud-only quest survives (q_gear)', m8.v7.en33.quests.q_gear && m8.v7.en33.quests.q_gear.done === 1, m8.v7.en33.quests.q_gear);
  check('en33 merge: rift best MAX per floor (floor1 0.9)', m8.v7.en33.rift.best[1] === 0.9, m8.v7.en33.rift.best);
  check('en33 merge: rift best cloud-only floor survives (floor2 0.8)', m8.v7.en33.rift.best[2] === 0.8, m8.v7.en33.rift.best);
  check('en33 merge: rift claimed union for the newer day', m8.v7.en33.rift.claimed[1] === 1 && m8.v7.en33.rift.claimed[2] === 1, m8.v7.en33.rift.claimed);
  check('en33 merge: regionClaimed union (en+ko)', m8.v7.en33.regionClaimed.en === 1 && m8.v7.en33.regionClaimed.ko === 1, m8.v7.en33.regionClaimed);
  check('en33 merge: created MIN (500)', m8.v7.en33.created === 500, m8.v7.en33.created);
  check('en33 merge: pending launches dropped (session-local)', Object.keys(m8.v7.en33.pending || {}).length === 0, m8.v7.en33.pending);
  check('en33 merge: XP MAX 800 (never summed)', m8.xp === 800 && m8.v7.gems === 5, { xp: m8.xp, gems: m8.v7.gems });
  check('en33 merge: does not mutate inputs', A8.v7.en33.quests.q_gear === undefined && B8.v7.en33.quests.q_clock.claimed === 1);
  const v8 = evalIn(ctx8, 'window.__v20sync.validateSave(__A8)');
  check('merged/seeded save with en33 validates', v8 && v8.ok === true, v8 && v8.errors);
  check('hasProgress true with en33 quest progress only',
    evalIn(ctx8, `window.__v20sync.hasProgress({xp:0,cards:[],v7:{gems:0,en33:{quests:{q_clock:{done:1}}}}})`) === true);
  check('hasProgress true with en33 regionClaimed only',
    evalIn(ctx8, `window.__v20sync.hasProgress({xp:0,cards:[],v7:{gems:0,en33:{quests:{},regionClaimed:{ko:1}}}})`) === true);
  check('hasProgress false for a fresh save (no en33)', evalIn(ctx8, `window.__v20sync.hasProgress({xp:0,cards:[],v7:{gems:0}})`) === false);
  // Export round-trip incl. en33 (byte-identical), via V31 restoreRaw.
  const ctx8b = makeCtx();
  ctx8b.S = baseSave({ xp: 100 });
  loadFile(ctx8b, 'v20_sync.js', 'v20_sync');
  evalIn(ctx8b, `
    window.__v20 = { flush: function(){}, dataPanelHTML: function(){ return '<div id="v20panel"><div>x</div></div>'; }, syncNow: function(){ return Promise.resolve({ok:true, action:'already-synced'}); } };
    window.confirm = function(){ return true; };
    localStorage.setItem('hanvocab.v1', JSON.stringify(S));
  `);
  loadFile(ctx8b, 'v31.js', 'v31');
  const full8 = baseSave({ xp: 1234 });
  full8.v7.en33 = { quests: { q_clock: { done: 1, claimed: 1, acc: 1, at: 1000 } }, rift: { day: 'Tue Nov 18 2026', best: { 1: 1 }, claimed: { 1: 1 } }, regionClaimed: { en: 1, ko: 0 }, pending: {}, created: 1000 };
  full8.v7.en19 = { bosses: { v17_sandwisp: { en: { win: 1, wins: 1, stars: 3 } } }, titles: [], zoneClaimed: {}, koStats: { right: 0, wrong: 0 } };
  ctx8b.__full8 = full8;
  const raw8 = JSON.stringify(full8);
  const rr8 = evalIn(ctx8b, `window.__v31._test.restoreRaw(JSON.stringify(__full8), 'test33')`);
  check('restoreRaw accepts a full save incl. en33 + a Chrono win in en19', rr8 && rr8.ok === true, rr8);
  check('restored bytes byte-identical (en33 survives export)', ctx8b.__sandbox.localStorage.getItem('hanvocab.v1') === raw8);
  check('restored en33 quests/region intact after round-trip',
    evalIn(ctx8b, `var j=JSON.parse(localStorage.getItem('hanvocab.v1')); j.v7.en33.quests.q_clock.claimed===1 && j.v7.en33.regionClaimed.en===1 && j.v7.en19.bosses.v17_sandwisp.en.win===1`) === true);
  // Conflict: en33-only local is never silently downloaded over.
  const ctx8c = makeCtx();
  loadFile(ctx8c, 'v20_sync.js', 'v20_sync');
  ctx8c.__cloudSave = baseSave({ xp: 999, v7: { gems: 9 } });
  ctx8c.__cloudUpdatedAt = 2000;
  evalIn(ctx8c, `
    window.__v20sync._test.setConfig({apiKey:'v33-test', projectId:'v33-test'});
    window.__v20sync._test.setUser({uid:'v33-uid'});
    window.__v20sync._test.setAdapter({ load: function(uid){ return Promise.resolve({data: window.__cloudSave, updatedAt: window.__cloudUpdatedAt}); }, save: function(uid, doc){ window.__savedDoc = doc; return Promise.resolve(); }, signOut: function(){ return Promise.resolve(); } });
  `);
  const en33Only = baseSave({ v7: { en33: { quests: { q_clock: { done: 1 } }, rift: { day: '', best: {}, claimed: {} }, regionClaimed: { en: 0, ko: 0 }, pending: {}, created: 1000 } } });
  ctx8c.__t8 = en33Only;
  evalIn(ctx8c, `localStorage.setItem('hanvocab.v1', JSON.stringify(__t8)); localStorage.removeItem('hanvocab.v12.meta');`);
  const r8c = await evalIn(ctx8c, 'window.__v20sync.syncNow({auto:false})');
  check('en33-only local raises conflict (not download)', r8c && r8c.ok === false && r8c.reason === 'conflict', r8c);
  check('en33-only local bytes preserved (quest done survives)',
    evalIn(ctx8c, `var j=JSON.parse(localStorage.getItem('hanvocab.v1')); j.v7.en33.quests.q_clock.done===1`) === true);
  // V31/V32 regression lock-in (spot checks from test32 §1/§8).
  const ctx8d = makeCtx();
  ctx8d.S = baseSave({ xp: 100 });
  loadFile(ctx8d, 'v20_sync.js', 'v20_sync');
  evalIn(ctx8d, `
    window.__v20 = { flush: function(){}, dataPanelHTML: function(){ return '<div class="v20panel" id="v20panel"><div class="v20card">x</div></div>'; }, syncNow: function(){ return Promise.resolve({ok:true, action:'already-synced'}); } };
    window.confirm = function(){ return true; };
  `);
  loadFile(ctx8d, 'v31.js', 'v31');
  loadFile(ctx8d, 'v32.js', 'v32');
  check('regression: __v31.status() still 16.3.0 after V32+V33', evalIn(ctx8d, 'window.__v31.status().version') === '16.3.0');
  check('regression: __v32.version still 16.4.0', evalIn(ctx8d, 'window.__v32.version') === '16.4.0');
  check('regression: bad-version guard still rejects version 99',
    evalIn(ctx8d, `window.__v20sync.validateSave({cards:[{id:'x',h:'a',m:'b'}],v7:{meta:{saveVersion:99}}}).errors.indexOf('bad-version:99')>=0`) === true);

  // ================= §9 Chrome-only (SKIP, never PASS) =================
  section('§9', 'Chrome-only — skipped in this environment (see report)');
  const chromeWhy = 'Real-browser gates live in tools/v33/verify-v33c.js — see SMOKE_TEST §4';
  skipCheck('real Chrono overlay render + 0 JS errors', chromeWhy);
  skipCheck('EN/KO hub entry buttons + overlay at 360/390/430 with no overflow', chromeWhy);
  skipCheck('real V19 fight vs a Chrono boss in the browser', chromeWhy);
  skipCheck('real V27 quest session end-to-end in the browser', chromeWhy);
  skipCheck('Pet Hub shows 3 Chrono species + eggs in the shop', chromeWhy);
  skipCheck('WCAG AA contrast on the Chrono overlay', chromeWhy);
  skipCheck('live Firebase sync/login (Anh must run FIREBASE_SETUP.md)', chromeWhy);
  skipCheck('real phone touch + Safari first-open', chromeWhy);

  console.log(`\ntest33.js: PASS ${pass} / FAIL ${fail} / SKIP ${skip}${fail ? ' — FAILURES: ' + failures.join(' | ') : ''}`);
  for (const id of ['§0', '§1', '§2', '§3', '§4', '§5', '§6', '§7', '§8', '§9']) {
    const c = secCounts[id] || { pass: 0, fail: 0, skip: 0 };
    console.log(`  ${id}: PASS ${c.pass} / FAIL ${c.fail} / SKIP ${c.skip}`);
  }
  console.log('TEST33_SUMMARY ' + JSON.stringify({ pass, fail, skip, sections: secCounts }));
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('test33.js crashed:', e); process.exit(2); });
