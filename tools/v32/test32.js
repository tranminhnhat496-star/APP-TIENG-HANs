// test32.js — V16.4 Data Safety verification (Node vm harness).
// No external dependencies: runs with plain `node` (no jsdom, no Chrome).
// Usage: node tools/v32/test32.js [DIR]
//   DIR = build dir holding the standalone .js files + index.html
//   (default: <repo>/out). For the ZIP run, extract the ZIP and pass
//   the extraction dir. Exit 0 = all runnable checks pass (skips are
//   reported, never counted as passes).
// What this covers (PLAN_V32.md §5):
//   §0 static build integrity (incl. R-V32-VER guard text x1,
//      bad-version x2 total, test32.js present in the package under
//      test, V31 in-scope fragments still present).
//   §1 merge regressions: test31 §1 A/B fixtures + assertions
//      verbatim, PLUS en27 days/streak MAX, en23 mats MAX, en17 fav
//      union.
//   §2 F-02 flush guards: static asserts (same as test31 §8) +
//      behavioural debounce-MODEL simulation vs real V31 restoreRaw
//      (3 trials, 0 lost). The model is labelled a SIMULATION of the
//      debounce ordering, NOT the real V20 engine (real-engine gate
//      stays Chrome-only, staged in verify-v32c.js).
//   §3 restore/import validation incl. bad-version.
//   §4 pre-restore snapshot + undo + history cap 20.
//   §5 export completeness (full seeded save, byte-identical
//      round-trip).
//   §6 conflict behaviour (en27-only local + older backup never
//      silently overwrites newer local).
//   §7 cloud read-back verify (mock adapter).
//   §8 monitor (real v32.js in vm) + V31-still-intact regression
//      (__v31.status() 16.3.0, panel wrap idempotent).
//   §9 Chrome-only (SKIP, never PASS).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
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
function makeDocument() {
  const el = () => ({ style: {}, setAttribute() {}, appendChild() {}, insertBefore() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, classList: { add() {}, remove() {}, toggle() {} }, textContent: '', innerHTML: '' });
  return {
    readyState: 'complete',
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement: el,
    head: { appendChild() {} },
    body: { appendChild() {}, insertBefore() {}, querySelector() { return null; } },
  };
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
function lsKeys(ctx) {
  const keys = [];
  for (let i = 0; i < ctx.__sandbox.localStorage.length; i++) keys.push(ctx.__sandbox.localStorage.key(i));
  return keys;
}
function countOcc(hay, needle) { return hay.split(needle).length - 1; }

async function main() {
  console.log(`test32.js — DIR=${DIR}`);
  for (const f of ['index.html', 'v20_sync.js', 'v31.js', 'v32.js', 'v32.css']) {
    if (!fs.existsSync(path.join(DIR, f))) { console.log(`FAIL: ${f} missing in DIR — run build_v32.py first`); process.exit(2); }
  }
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf-8');

  // ================= §0 static: build integrity =================
  section('§0', 'static — build integrity');
  check('title is V16.4', html.includes('<title>Korean &amp; English Vocab Farm V16.4 — Data Safety — Học từ vựng tiếng Hàn &amp; tiếng Anh</title>'));
  check('__v32 + 16.4.0 present', html.includes('window.__v32') && html.includes("VERSION='16.4.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0', '16.3.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v32', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v32', styleIds.join(','));
  check('script markers end v32', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v32', scriptIds.join(','));
  check('no v28/v29/v30 markers', !html.includes('id="v28"') && !html.includes('id="v29"') && !html.includes('id="v30"') && !html.includes('__v29') && !html.includes('__v30'));
  check('no v32kotab (KO button must not be added)', !html.includes('v32kotab'));
  check('KO Data-view entry present x1 (injectDataBtn label)', countOcc(html, 'Quản lý dữ liệu &amp; đồng bộ') === 1);
  check('R-V32-VER label present x1 (v32.js header comment only)', countOcc(html, 'R-V32-VER') === 1);
  check('bad-version total x2 (1 guard + 1 v32.js header mention)', countOcc(html, 'bad-version') === 2, countOcc(html, 'bad-version'));
  check('bad-version guard text x1', countOcc(html, "bad-version:'+obj.v7.meta.saveVersion") === 1);
  check('__v31 + 16.3.0 still present (V31 regression, static)', html.includes('window.__v31') && html.includes("VERSION='16.3.0'"));
  const frags31 = [
    ['R-F-01a', '/* V31 (F-01):'],
    ['R-F-01b en', 'mEn[kEn2]=maxMap(lEn[kEn2], cEn[kEn2])'],
    ['R-F-03a due', 'm15.due=d15;'],
    ['R-F-01-en16', 'm16[k16b]=fillMissing(l16[k16b], c16[k16b])'],
    ['R-V31-F01-en18', '/* V31 (F-01): V18 boss records are FLAT'],
    ['R-V31-C9', '__v20.importFile(imp)'],
  ];
  for (const [label, frag] of frags31) check(`V31 in-scope fragment ${label} still present`, html.includes(frag));
  for (const m of ['v21emailbtn', '_esc21', 'armV27Obs', 'rearmObserver', '_speakXp', 'V29 (F-05)']) {
    check(`out-of-scope marker absent: ${m}`, !html.includes(m));
  }
  check('test32.js present in the package under test (tools/v32/test32.js)', fs.existsSync(path.join(DIR, 'tools', 'v32', 'test32.js')), 'missing in ' + DIR);
  check('v32.js + v32.css present in DIR', fs.existsSync(path.join(DIR, 'v32.js')) && fs.existsSync(path.join(DIR, 'v32.css')));

  // ================= §1 merge regressions (vm, real v20_sync.js) =================
  // test31 §1 A/B fixtures + assertions verbatim as the regression lock-in,
  // PLUS en27 days/streak MAX, en23 mats MAX, en17 fav union.
  section('§1', 'merge regressions (vm, real v20_sync.js)');
  const ctx = makeCtx();
  loadFile(ctx, 'v20_sync.js', 'v20_sync');
  const S20 = evalIn(ctx, 'window.__v20sync');
  check('__v20sync loaded', !!S20 && typeof S20.mergeSaves === 'function');
  const A = baseSave({ xp: 500, v7: { gems: 3, en: { box: { w1: 2, w2: 2, w3: 2, w4: 2, w5: 2 }, right: { w1: 3, w2: 4 }, wrong: {} }, en15: { due: { w1: 100 }, bosses: { b1: 1 } }, en16: { map: { w1: 'deckA' } }, en17: { fav: ['x'], claimed: {} }, en18: { bosses: { v18_slime: { win: 1, wins: 1, at: 1000, item: 'gem' } } }, en19: { bosses: { v11_boss1: { en: { win: 1, wins: 2, stars: 2, best: 90 } } } }, en22: { quest: { q1: { stars: 2 } } }, en23: { pets: { petA: { lv: 1 } }, team: ['petA', null, null], mats: { wood: 3, stone: 1 } }, en27: { sessions: [{ t: 100, c: 1 }], days: { '2026-11-18': { c: 2, t: 5, xp: 20, mins: 10 } }, streak: { en: { d: '2026-11-18', n: 5 }, ko: { d: '', n: 0 } }, en: { last: { w1: 100 }, cw: {}, cr: {} }, ko: { right: {}, wrong: {}, cw: {}, cr: {}, last: {} } } } });
  const B = baseSave({ xp: 800, v7: { gems: 5, en: { box: { w6: 3, w7: 3, w8: 3, w9: 3, w10: 3 }, right: { w6: 5 }, wrong: {} }, en15: { due: { w1: 50 }, bosses: { b2: 1 } }, en16: { map: { w1: 'deckB', w2: 'deckC' } }, en17: { fav: ['y'], claimed: { L1: 1 } }, en18: { bosses: { v18_dragon: { win: 1, wins: 3, at: 2000, item: 'coin' }, v18_slime: { win: 1, wins: 2, at: 1500, item: 'gem' } } }, en19: { bosses: { v11_boss1: { ko: { win: 1, wins: 1, stars: 3, best: 100 } }, v11_boss2: { en: { win: 1, wins: 1, stars: 1, best: 80 } } } }, en22: { quest: { q2: { stars: 3 } } }, en23: { pets: { petB: { lv: 2 } }, team: ['petB', null, null], mats: { wood: 2, stone: 5 } }, en27: { sessions: [{ t: 200, c: 2 }], days: { '2026-11-18': { c: 3, t: 4, xp: 15, mins: 12 } }, streak: { en: { d: '2026-11-19', n: 3 }, ko: { d: '2026-11-19', n: 2 } }, en: { last: { w6: 200 }, cw: {}, cr: {} }, ko: { right: {}, wrong: {}, cw: {}, cr: {}, last: {} } } } });
  ctx.__A = A; ctx.__B = B;
  const merged = evalIn(ctx, 'window.__v20sync.mergeSaves(__A, __B, 1000, 2000)');
  const aWords = ['w1', 'w2', 'w3', 'w4', 'w5'].filter(w => merged.v7.en.box[w] !== undefined).length;
  const bWords = ['w6', 'w7', 'w8', 'w9', 'w10'].filter(w => merged.v7.en.box[w] !== undefined).length;
  check('F-01 A words kept 5/5', aWords === 5, aWords);
  check('F-01 B words kept 5/5', bWords === 5, bWords);
  check('F-01 sessions merged 2/2', (merged.v7.en27.sessions || []).length === 2, (merged.v7.en27.sessions || []).length);
  check('F-01 XP MAX 800 (never summed)', merged.xp === 800, merged.xp);
  check('F-01 gems MAX 5', merged.v7.gems === 5, merged.v7.gems);
  check('F-01 pets union A+B', merged.v7.en23.pets.petA && merged.v7.en23.pets.petB);
  check('F-01 BT quests union', merged.v7.en22.quest.q1 && merged.v7.en22.quest.q2);
  check('F-03 en15.due takes EARLIER (50)', merged.v7.en15.due.w1 === 50, merged.v7.en15.due.w1);
  check('F-03 en15.bosses union', merged.v7.en15.bosses.b1 && merged.v7.en15.bosses.b2);
  check('F-03 en17.claimed cloud-claimed survives', merged.v7.en17.claimed && merged.v7.en17.claimed.L1 === 1);
  check('F-01-en16 map local-first on conflict (deckA)', merged.v7.en16.map.w1 === 'deckA', merged.v7.en16.map.w1);
  check('F-01-en16 map cloud-only key fills (w2=deckC)', merged.v7.en16.map.w2 === 'deckC');
  const m18 = merged.v7.en18 && merged.v7.en18.bosses;
  check('R-V31-F01-en18 flat V18 win survives (slime win)', m18 && m18.v18_slime && m18.v18_slime.win === 1, m18 && m18.v18_slime);
  check('R-V31-F01-en18 flat V18 wins MAX (slime wins 2)', m18 && m18.v18_slime && m18.v18_slime.wins === 2, m18 && m18.v18_slime && m18.v18_slime.wins);
  check('R-V31-F01-en18 flat V18 at latest (1500)', m18 && m18.v18_slime && m18.v18_slime.at === 1500, m18 && m18.v18_slime && m18.v18_slime.at);
  check('R-V31-F01-en18 flat V18 cloud-only boss survives (dragon)', m18 && m18.v18_dragon && m18.v18_dragon.win === 1);
  const m19 = merged.v7.en19 && merged.v7.en19.bosses;
  check('F-01 nested V19 en+ko both survive (boss1)', m19 && m19.v11_boss1 && m19.v11_boss1.en && m19.v11_boss1.en.win === 1 && m19.v11_boss1.ko && m19.v11_boss1.ko.win === 1);
  check('F-01 nested V19 cloud-only boss survives (boss2)', m19 && m19.v11_boss2 && m19.v11_boss2.en && m19.v11_boss2.en.win === 1);
  check('mergeSaves does not mutate inputs', A.v7.en.box.w6 === undefined && B.v7.en.box.w1 === undefined);
  ctx.__merged = merged;
  const mv = evalIn(ctx, 'window.__v20sync.validateSave(__merged)');
  check('merged save validates', mv && mv.ok === true, mv && mv.errors);
  // V16.4 additions: en27 days/streak MAX, en23 mats MAX, en17 fav union.
  const mDays = merged.v7.en27.days['2026-11-18'];
  check('en27 days c MAX (3)', mDays && mDays.c === 3, mDays);
  check('en27 days t MAX (5)', mDays && mDays.t === 5, mDays);
  check('en27 days xp MAX (20)', mDays && mDays.xp === 20, mDays);
  check('en27 days mins MAX (12)', mDays && mDays.mins === 12, mDays);
  check('en27 streak en n MAX (5)', merged.v7.en27.streak.en.n === 5, merged.v7.en27.streak.en);
  check('en27 streak en d from newer side (2026-11-19)', merged.v7.en27.streak.en.d === '2026-11-19', merged.v7.en27.streak.en);
  check('en27 streak ko n MAX (2)', merged.v7.en27.streak.ko.n === 2, merged.v7.en27.streak.ko);
  check('en23 mats wood MAX (3)', merged.v7.en23.mats.wood === 3, merged.v7.en23.mats);
  check('en23 mats stone MAX (5)', merged.v7.en23.mats.stone === 5, merged.v7.en23.mats);
  check('en17 fav union [x,y]', Array.isArray(merged.v7.en17.fav) && merged.v7.en17.fav.length === 2 && merged.v7.en17.fav.includes('x') && merged.v7.en17.fav.includes('y'), merged.v7.en17.fav);

  // ================= §2 F-02 flush guards =================
  section('§2', 'F-02 flush guards (vm + static)');
  const v15src = fs.readFileSync(path.join(DIR, 'v15.js'), 'utf-8');
  const v20src = fs.readFileSync(path.join(DIR, 'v20.js'), 'utf-8');
  const v21src = fs.readFileSync(path.join(DIR, 'v21.js'), 'utf-8');
  check('F-02a flush guard sits in backupImport (before setItem)', v15src.indexOf('try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}') >= 0);
  check('F-02b flush() sits in importFile (before setItem)', v20src.includes('try{ flush(); }catch(e){}'));
  check('F-02c/d flush guards in activate paths (x2)', (v21src.match(/try\{ if\(window\.__v20&&__v20\.flush\) __v20\.flush\(\); \}catch\(e\)\{\}/g) || []).length >= 2);
  // Behavioural simulation (NEW). SIMULATION — a model of the V20 800 ms
  // debounce ordering (dirty flag, timer, beforeunload flush) wired to
  // V31's REAL restoreRaw. This is NOT the real V20 engine; the
  // real-engine gate stays Chrome-only (§9, verify-v32c.js).
  console.log('  NOTE §2 model = SIMULATION of the debounce ordering, NOT the real V20 engine');
  const ctx2 = makeCtx();
  ctx2.S = baseSave({ xp: 1000 });
  loadFile(ctx2, 'v20_sync.js', 'v20_sync');
  evalIn(ctx2, `
    window.__model = {
      mem: null, dirty: false, timer: null,
      save: function(){
        this.dirty = true;
        var self = this;
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(function(){ self.flush(); }, 800);
      },
      flush: function(){
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        if (!this.dirty) return;
        this.dirty = false;
        try { localStorage.setItem('hanvocab.v1', JSON.stringify(this.mem)); } catch(e){}
      },
      beforeunload: function(){ this.flush(); }
    };
    window.__v20 = {
      flush: function(){ window.__model.flush(); },
      dataPanelHTML: function(){ return '<div class="v20panel" id="v20panel"><div class="v20card">x</div></div>'; },
      syncNow: function(){ return Promise.resolve({ok:true, action:'already-synced'}); }
    };
    window.confirm = function(){ return true; };
  `);
  loadFile(ctx2, 'v31.js', 'v31');
  let lostWithGuard = 0;
  for (let trial = 1; trial <= 3; trial++) {
    const targetXp = 9000 + trial;
    const target = baseSave({ xp: targetXp });
    ctx2.__target = target;
    // WITHOUT the guard: restore that only does setItem, then beforeunload flush.
    const lost = evalIn(ctx2, `(function(){
      var orig = JSON.parse(JSON.stringify(S)); orig.xp = 1000;
      localStorage.setItem('hanvocab.v1', JSON.stringify(orig));
      window.__model.mem = JSON.parse(JSON.stringify(orig)); window.__model.mem.xp = 1005;
      window.__model.dirty = false;
      window.__model.save();
      localStorage.setItem('hanvocab.v1', JSON.stringify(__target));
      window.__model.beforeunload();
      return JSON.parse(localStorage.getItem('hanvocab.v1')).xp;
    })()`);
    check(`F-02 model WITHOUT guard trial ${trial}: race reproduced (restored XP ${targetXp} lost, back to 1005)`, lost === 1005, lost);
    // WITH the guard: real V31 restoreRaw (flushes first), then beforeunload + re-read.
    const survived = evalIn(ctx2, `(function(){
      var orig = JSON.parse(JSON.stringify(S)); orig.xp = 1000;
      localStorage.setItem('hanvocab.v1', JSON.stringify(orig));
      window.__model.mem = JSON.parse(JSON.stringify(orig)); window.__model.mem.xp = 1005;
      window.__model.dirty = false;
      window.__model.save();
      var raw = JSON.stringify(__target);
      var r = window.__v31._test.restoreRaw(raw, 'test32-f02-trial');
      window.__model.beforeunload();
      var after = localStorage.getItem('hanvocab.v1');
      var reRead = localStorage.getItem('hanvocab.v1');
      return { ok: !!(r && r.ok), xp: JSON.parse(after).xp, byteIdentical: after === raw, reReadXp: JSON.parse(reRead).xp };
    })()`);
    check(`F-02 model WITH guard trial ${trial}: restored XP ${targetXp} survives beforeunload`, survived.ok && survived.xp === targetXp, survived);
    check(`F-02 model WITH guard trial ${trial}: restored bytes byte-identical + survive re-read`, survived.byteIdentical && survived.reReadXp === targetXp, survived);
    if (!(survived.ok && survived.xp === targetXp)) lostWithGuard++;
  }
  check('F-02 model WITH guard: 0/3 lost', lostWithGuard === 0, lostWithGuard + ' lost');

  // ================= §3 restore/import validation =================
  section('§3', 'restore/import validation (vm)');
  const ctx3 = makeCtx();
  ctx3.S = baseSave({ xp: 2000 });
  loadFile(ctx3, 'v20_sync.js', 'v20_sync');
  evalIn(ctx3, `
    window.__v20 = {
      flush: function(){},
      dataPanelHTML: function(){ return '<div class="v20panel" id="v20panel"><div class="v20card">x</div></div>'; },
      syncNow: function(){ return Promise.resolve({ok:true, action:'already-synced'}); }
    };
    window.confirm = function(){ return true; };
    localStorage.setItem('hanvocab.v1', JSON.stringify(S));
  `);
  loadFile(ctx3, 'v31.js', 'v31');
  const seedRaw3 = ctx3.__sandbox.localStorage.getItem('hanvocab.v1');
  const xp3 = () => JSON.parse(ctx3.__sandbox.localStorage.getItem('hanvocab.v1')).xp;
  const badJson = evalIn(ctx3, `window.__v31._test.restoreRaw('this is not json{', 'test32')`);
  check('§3 malformed JSON rejected (bad-json)', badJson && badJson.ok === false && badJson.reason === 'bad-json', badJson);
  check('§3 malformed JSON leaves bytes unchanged (XP 2000)', xp3() === 2000, xp3());
  ctx3.__t = { xp: 1 };
  const vNoCards = evalIn(ctx3, 'window.__v20sync.validateSave(__t)');
  check('§3 missing cards rejected (missing-cards)', vNoCards && vNoCards.ok === false && (vNoCards.errors || []).includes('missing-cards'), vNoCards && vNoCards.errors);
  const rNoCards = evalIn(ctx3, `window.__v31._test.restoreRaw(JSON.stringify(__t), 'test32')`);
  check('§3 restoreRaw rejects missing-cards save', rNoCards && rNoCards.ok === false, rNoCards);
  ctx3.__t = { cards: [{ id: 'x' }] };
  const vBadCard = evalIn(ctx3, 'window.__v20sync.validateSave(__t)');
  check('§3 bad card rejected (bad-card@0)', vBadCard && vBadCard.ok === false && (vBadCard.errors || []).includes('bad-card@0'), vBadCard && vBadCard.errors);
  const rBadCard = evalIn(ctx3, `window.__v31._test.restoreRaw(JSON.stringify(__t), 'test32')`);
  check('§3 restoreRaw rejects bad-card save + bytes unchanged', rBadCard && rBadCard.ok === false && xp3() === 2000, rBadCard);
  for (const badVer of [99, 11, 13]) {
    ctx3.__t = baseSave({ xp: 1, v7: { gems: 0, meta: { saveVersion: badVer } } });
    const v = evalIn(ctx3, 'window.__v20sync.validateSave(__t)');
    check(`§3 bad-version ${badVer} rejected`, v && v.ok === false && (v.errors || []).includes('bad-version:' + badVer), v && v.errors);
  }
  ctx3.__t = baseSave({ xp: 1, v7: { gems: 0, meta: { saveVersion: 99 } } });
  const v99 = evalIn(ctx3, 'window.__v20sync.validateSave(__t)');
  check('§3 bad-version:99 appears in errors', v99 && (v99.errors || []).join(',').indexOf('bad-version:99') >= 0, v99 && v99.errors);
  ctx3.__t = baseSave({ xp: 1, v7: { gems: 0, meta: { saveVersion: 12 } } });
  check('§3 saveVersion 12 accepted', evalIn(ctx3, 'window.__v20sync.validateSave(__t)').ok === true);
  ctx3.__t = baseSave({ xp: 1, v7: { gems: 0, meta: {} } });
  check('§3 saveVersion absent accepted', evalIn(ctx3, 'window.__v20sync.validateSave(__t)').ok === true);
  const bigSave = baseSave({ xp: 1 }); bigSave.pad = 'x'.repeat(11 * 1024 * 1024);
  ctx3.__big = JSON.stringify(bigSave);
  const rBig = evalIn(ctx3, `window.__v31._test.restoreRaw(__big, 'test32')`);
  check('§3 oversized payload (>10 MB) rejected (file-too-large)', rBig && rBig.ok === false && rBig.reason === 'file-too-large', rBig && rBig.reason);
  check('§3 oversized payload leaves bytes unchanged (XP 2000)', xp3() === 2000, xp3());
  const crafted = JSON.parse('{"cards":[{"id":"k1","h":"a","m":"b"}],"xp":1501,"v7":{"en27":{"en":{"last":{"__proto__":{"polluted":"V32MARKER"}}}}}}');
  ctx3.__t = crafted;
  const vProto = evalIn(ctx3, 'window.__v20sync.validateSave(__t)');
  check('§3 __proto__ rejected (bad-key:__proto__)', vProto && vProto.ok === false && (vProto.errors || []).join(',').indexOf('bad-key:__proto__') >= 0, vProto && vProto.errors);
  const rProto = evalIn(ctx3, `window.__v31._test.restoreRaw(JSON.stringify(__t), 'test32')`);
  check('§3 restoreRaw rejects __proto__ save', rProto && rProto.ok === false, rProto);
  check('§3 ({}).polluted stays undefined', evalIn(ctx3, '({}).polluted') === undefined);
  check('§3 Object.prototype.polluted stays undefined', evalIn(ctx3, 'Object.prototype.polluted') === undefined);
  const validTarget = baseSave({ xp: 3333 });
  ctx3.__rt = validTarget;
  const rValid = evalIn(ctx3, `window.__v31._test.restoreRaw(JSON.stringify(__rt), 'test32')`);
  check('§3 valid full save accepted', rValid && rValid.ok === true, rValid);
  check('§3 valid full save applied (XP 3333)', xp3() === 3333, xp3());
  // confirm gate: restoreHistoryEntry requires confirm(); false cancels.
  const cancelTarget = baseSave({ xp: 4321 });
  ctx3.__ct = cancelTarget;
  evalIn(ctx3, `localStorage.setItem('hanvocab.v12.preimport-1700000000000', JSON.stringify(__ct)); window.confirm = function(){ return false; };`);
  const rCancel = evalIn(ctx3, `window.__v31.restoreHistoryEntry('hanvocab.v12.preimport-1700000000000')`);
  check('§3 restore with confirm()===false cancelled', rCancel && rCancel.ok === false && rCancel.reason === 'cancelled', rCancel);
  check('§3 cancelled restore leaves bytes unchanged (XP 3333)', xp3() === 3333, xp3());
  evalIn(ctx3, `window.confirm = function(){ return true; };`);
  const rConfirm = evalIn(ctx3, `window.__v31.restoreHistoryEntry('hanvocab.v12.preimport-1700000000000')`);
  check('§3 restore with confirm()===true proceeds', rConfirm && rConfirm.ok === true, rConfirm);
  check('§3 confirmed restore applied (XP 4321)', xp3() === 4321, xp3());
  // No code execution from imported JSON: payload string contains code text.
  evalIn(ctx3, `window.__v32evil = undefined;`);
  const evilSave = baseSave({ xp: 4322 });
  evilSave.cards = [{ id: 'k1', h: 'a";globalThis.__v32evil=1;//', m: 'b' }];
  ctx3.__evil = evilSave;
  const rEvil = evalIn(ctx3, `window.__v31._test.restoreRaw(JSON.stringify(__evil), 'test32')`);
  check('§3 code-text payload parsed as data only (sentinel untouched)', rEvil && rEvil.ok === true && evalIn(ctx3, 'window.__v32evil') === undefined, rEvil);
  check('§3 code-text payload stored literally as data', JSON.parse(ctx3.__sandbox.localStorage.getItem('hanvocab.v1')).cards[0].h === 'a";globalThis.__v32evil=1;//');

  // ================= §4 snapshot + undo + history cap =================
  section('§4', 'pre-restore snapshot + undo + history cap (vm)');
  const ctx4a = makeCtx();
  ctx4a.S = baseSave({ xp: 100 });
  loadFile(ctx4a, 'v20_sync.js', 'v20_sync');
  evalIn(ctx4a, `
    window.__v20 = { flush: function(){}, dataPanelHTML: function(){ return '<div id="v20panel"><div>x</div></div>'; }, syncNow: function(){ return Promise.resolve({ok:true, action:'already-synced'}); } };
    window.confirm = function(){ return true; };
  `);
  loadFile(ctx4a, 'v31.js', 'v31');
  evalIn(ctx4a, `for(var i=0;i<25;i++) window.__v31.recordBackupEvent('local-export', 10, 'abcd', '', true, 't'+i);`);
  const hist4 = evalIn(ctx4a, `window.__v31._test.readHistory()`);
  check('§4 history capped at 20 after 25 events', hist4.length === 20, hist4.length);
  check('§4 oldest remaining entry is the 6th recorded (t5)', hist4[19] && hist4[19].note === 't5', hist4[19] && hist4[19].note);
  check('§4 newest remaining entry is the 25th recorded (t24)', hist4[0] && hist4[0].note === 't24', hist4[0] && hist4[0].note);
  const ctx4b = makeCtx();
  ctx4b.S = baseSave({ xp: 100 });
  loadFile(ctx4b, 'v20_sync.js', 'v20_sync');
  evalIn(ctx4b, `
    window.__v20 = { flush: function(){}, dataPanelHTML: function(){ return '<div id="v20panel"><div>x</div></div>'; }, syncNow: function(){ return Promise.resolve({ok:true, action:'already-synced'}); } };
    window.confirm = function(){ return true; };
    localStorage.setItem('hanvocab.v1', JSON.stringify(S));
    localStorage.setItem('hanvocab.v11-backup', 'v11bytes-keep-me');
  `);
  loadFile(ctx4b, 'v31.js', 'v31');
  const origRaw4 = ctx4b.__sandbox.localStorage.getItem('hanvocab.v1');
  const target4 = baseSave({ xp: 555 });
  ctx4b.__t4 = target4;
  const targetRaw4 = JSON.stringify(target4);
  const rr4 = evalIn(ctx4b, `window.__v31._test.restoreRaw(JSON.stringify(__t4), 'test32')`);
  check('§4 restoreRaw ok', rr4 && rr4.ok === true, rr4);
  const snapKeys4 = lsKeys(ctx4b).filter(k => k.indexOf('hanvocab.v12.preimport-') === 0);
  check('§4 pre-restore snapshot written BEFORE the write', snapKeys4.length >= 1, snapKeys4);
  const snapBytes4 = snapKeys4.length ? ctx4b.__sandbox.localStorage.getItem(snapKeys4[0]) : null;
  check('§4 snapshot holds the exact pre-restore bytes (XP 100)', snapBytes4 === origRaw4, snapBytes4 && snapBytes4.slice(0, 80));
  check('§4 restore applied (XP 555)', JSON.parse(ctx4b.__sandbox.localStorage.getItem('hanvocab.v1')).xp === 555);
  await sleep(15);
  const ru4 = evalIn(ctx4b, `window.__v31.undoRestore()`);
  check('§4 undoRestore ok', ru4 && ru4.ok === true, ru4);
  check('§4 undo restores EXACT pre-restore bytes (byte-identical)', ctx4b.__sandbox.localStorage.getItem('hanvocab.v1') === origRaw4);
  await sleep(15);
  const ru4b = evalIn(ctx4b, `window.__v31.undoRestore()`);
  check('§4 second undo toggles back (XP 555, bytes = target)', ru4b && ru4b.ok === true && ctx4b.__sandbox.localStorage.getItem('hanvocab.v1') === targetRaw4, ru4b);
  check('§4 hanvocab.v11-backup never deleted by any V31 path under test', ctx4b.__sandbox.localStorage.getItem('hanvocab.v11-backup') === 'v11bytes-keep-me');

  // ================= §5 export completeness =================
  section('§5', 'export completeness (vm)');
  const ctx5 = makeCtx();
  loadFile(ctx5, 'v20_sync.js', 'v20_sync');
  const fullSave = {
    cards: [{ id: 'k1', h: 'a', m: 'b' }, { id: 'k2', h: 'c', m: 'd' }],
    xp: 1234, own: { cow: 1 }, opt: { sound: true }, rem: {}, decks: [{ id: 'd1', name: 'Deck 1' }], deck: 'd1', sk: { n: 1, d: '2026-11-19' },
    v7: {
      gems: 55, meta: { saveVersion: 12 },
      en: { box: { w1: 3, w2: 2 }, right: { w1: 5 }, wrong: {}, review: [], done: {}, custom: [], streak: 2, stats: { ev: { r: 1, w: 0 }, ve: { r: 0, w: 0 } } },
      en15: { due: { w1: 100 }, bosses: { b1: 1 }, langChoice: true },
      en16: { map: { w1: 'deckA' }, decks: [] },
      en17: { fav: ['x'], claimed: { L1: 1 } },
      en18: { bosses: { v18_slime: { win: 1, wins: 2, at: 1000 } } },
      en19: { bosses: { v11_boss1: { en: { win: 1, wins: 1, stars: 2 } } } },
      en22: { quest: { q1: { stars: 3, best: 100, attempts: 1, lastAt: 1000 } } },
      en23: { pets: { pet1: { id: 'pet1', sp: 'phoenix', st: 0, lv: 5 } }, eggs: {}, hatch: null, mats: { wood: 2 }, team: ['pet1', null, null], claimed: {}, affClaimed: {}, created: 1000 },
      en27: { v: 1, created: 1000, en: { last: { w1: 100 }, cw: {}, cr: {} }, ko: { right: {}, wrong: {}, cw: {}, cr: {}, last: {} }, plan: { en: {}, ko: {} }, sessions: [{ t: 100, c: 1 }], days: {}, streak: { en: { d: '', n: 0 }, ko: { d: '', n: 0 } }, claimed: {}, uiLang: 'en' },
    },
  };
  ctx5.__full = fullSave;
  const raw5 = JSON.stringify(fullSave);
  const vFull = evalIn(ctx5, 'window.__v20sync.validateSave(__full)');
  check('§5 full seeded save validates', vFull && vFull.ok === true, vFull && vFull.errors);
  const rt5 = evalIn(ctx5, 'JSON.parse(JSON.stringify(__full))');
  for (const sub of ['en', 'en15', 'en16', 'en17', 'en18', 'en19', 'en22', 'en23', 'en27']) {
    check(`§5 round-trip preserves S.v7.${sub}`, rt5.v7 && rt5.v7[sub] !== undefined);
  }
  check('§5 round-trip preserves top-level fields (cards,xp,gems,own,opt,rem,decks)', rt5.cards && rt5.xp === 1234 && rt5.v7.gems === 55 && rt5.own && rt5.opt && rt5.rem && rt5.decks && rt5.decks.length === 1);
  check('§5 marker: one pet preserved', rt5.v7.en23.pets && rt5.v7.en23.pets.pet1 && rt5.v7.en23.pets.pet1.lv === 5);
  check('§5 marker: one en18 win preserved', rt5.v7.en18.bosses.v18_slime && rt5.v7.en18.bosses.v18_slime.win === 1);
  check('§5 marker: one en27 session preserved', (rt5.v7.en27.sessions || []).length === 1 && rt5.v7.en27.sessions[0].t === 100);
  check('§5 marker: one BT quest star preserved (q1 3★)', rt5.v7.en22.quest.q1 && rt5.v7.en22.quest.q1.stars === 3);
  check('§5 marker: two SRS words preserved (w1,w2)', rt5.v7.en.box.w1 === 3 && rt5.v7.en.box.w2 === 2);
  check('§5 round-tripped bytes identical to the original string', JSON.stringify(rt5) === raw5);
  // Export is a byte copy of hanvocab.v1 (R6 baseline): seed LS, read back.
  evalIn(ctx5, `localStorage.setItem('hanvocab.v1', JSON.stringify(__full));`);
  const exported5 = ctx5.__sandbox.localStorage.getItem('hanvocab.v1');
  check('§5 export (localStorage read-back) byte-identical to the seeded save', exported5 === raw5, exported5 && exported5.length + ' vs ' + raw5.length);

  // ================= §6 conflict behaviour =================
  section('§6', 'conflict behaviour (vm, mock adapter)');
  function makeSyncCtx(localSave, cloudSave, cloudUpdatedAt) {
    const c = makeCtx();
    loadFile(c, 'v20_sync.js', 'v20_sync');
    c.__cloudSave = cloudSave;
    c.__cloudUpdatedAt = cloudUpdatedAt;
    evalIn(c, `
      window.__v20sync._test.setConfig({apiKey:'v32-test', projectId:'v32-test'});
      window.__v20sync._test.setUser({uid:'v32-uid'});
      window.__v20sync._test.setAdapter({ load: function(uid){ return Promise.resolve({data: window.__cloudSave, updatedAt: window.__cloudUpdatedAt}); }, save: function(uid, doc){ window.__savedDoc = doc; return Promise.resolve(); }, signOut: function(){ return Promise.resolve(); } });
    `);
    c.__t = localSave;
    evalIn(c, `localStorage.setItem('hanvocab.v1', JSON.stringify(__t)); localStorage.removeItem('hanvocab.v12.meta');`);
    return c;
  }
  // Reuse test31 §2: en27-only local raises conflict, local bytes preserved.
  const en27Only = baseSave({ v7: { en27: { sessions: [{ t: 1 }], en: { last: { w1: 1 }, cw: {}, cr: {} } } } });
  const cloud6a = baseSave({ xp: 999, v7: { gems: 9, en27: { sessions: [{ t: 9 }] } } });
  const ctx6a = makeSyncCtx(en27Only, cloud6a, 2000);
  const r6a = await evalIn(ctx6a, 'window.__v20sync.syncNow({auto:false})');
  check('§6 en27-only local raises conflict (not download)', r6a && r6a.ok === false && r6a.reason === 'conflict', r6a);
  check('§6 local bytes NOT replaced by download (XP 0, 1 session)', (() => { const j = JSON.parse(ctx6a.__sandbox.localStorage.getItem('hanvocab.v1')); return j.xp === 0 && (j.v7.en27.sessions || []).length === 1; })());
  check('§6 conflict snapshots written (local + cloud)', lsKeys(ctx6a).some(k => k.indexOf('hanvocab.v12.conflict-local-') === 0) && lsKeys(ctx6a).some(k => k.indexOf('hanvocab.v12.conflict-cloud-') === 0));
  // PLUS: an older backup never silently overwrites a newer local save.
  const newerLocal = baseSave({ xp: 900, v7: { gems: 9, en27: { sessions: [{ t: 1 }] } } });
  const olderCloud = baseSave({ xp: 100, v7: { gems: 1, en27: { sessions: [{ t: 9 }] } } });
  const ctx6b = makeSyncCtx(newerLocal, olderCloud, 1000);
  const rawBefore6b = ctx6b.__sandbox.localStorage.getItem('hanvocab.v1');
  const r6b = await evalIn(ctx6b, 'window.__v20sync.syncNow({auto:false})');
  check('§6 older backup (XP 100, updatedAt 1000) vs newer local (XP 900) returns conflict, not download', r6b && r6b.ok === false && r6b.reason === 'conflict', r6b);
  check('§6 older backup never overwrites newer local (bytes byte-identical)', ctx6b.__sandbox.localStorage.getItem('hanvocab.v1') === rawBefore6b);

  // ================= §7 cloud read-back verify =================
  section('§7', 'cloud read-back verify (vm, mock adapter)');
  const ctx7 = makeCtx();
  ctx7.S = baseSave({ xp: 777 });
  loadFile(ctx7, 'v20_sync.js', 'v20_sync');
  loadFile(ctx7, 'v31.js', 'v31');
  evalIn(ctx7, `
    localStorage.setItem('hanvocab.v1', JSON.stringify(S));
    window.__savedCloud = null;
    window.__v20sync._test.setConfig({apiKey:'v32-test', projectId:'v32-test'});
    window.__v20sync._test.setUser({uid:'v32-uid'});
    window.__v20sync._test.setAdapter({ load: function(uid){ return Promise.resolve(window.__savedCloud ? {data: window.__savedCloud, updatedAt: Date.now()} : null); }, save: function(uid, doc){ window.__savedCloud = doc.data; return Promise.resolve(); }, signOut: function(){ return Promise.resolve(); } });
  `);
  const up7 = await evalIn(ctx7, 'window.__v20sync.syncNow({auto:false})');
  check('§7 manual sync uploads (no cloud doc)', up7 && up7.ok === true && up7.action === 'uploaded', up7);
  let verified7 = false;
  for (let i = 0; i < 20; i++) { await sleep(250); if (evalIn(ctx7, `window.__v31._test.verifyState()`) === 'verified') { verified7 = true; break; } }
  check('§7 upload verified after read-back', verified7, evalIn(ctx7, `window.__v31._test.verifyState()`));
  check('§7 lastVerifiedCloudAt set after verify', evalIn(ctx7, `window.__v31.status().lastVerifiedCloudAt`) > 0);
  check('§7 cloud-upload history entry recorded ok', evalIn(ctx7, `window.__v31._test.readHistory().some(function(e){ return e.kind==='cloud-upload' && e.ok; })`) === true);
  evalIn(ctx7, `navigator.onLine = false;`);
  const off7 = await evalIn(ctx7, 'window.__v20sync.syncNow({auto:false})');
  check('§7 offline syncNow returns {ok:false, reason:offline}', off7 && off7.ok === false && off7.reason === 'offline', off7);
  evalIn(ctx7, `navigator.onLine = true;`);

  // ================= §8 monitor (real v32.js) =================
  section('§8', 'monitor (vm, real v32.js)');
  const BUDGET = 5 * 1024 * 1024;
  // Seeded keys of KNOWN sizes (ASCII => byteLen == string length).
  const histEntries = [];
  for (let i = 15; i >= 1; i--) histEntries.push({ at: 1000 + i, kind: 'local-export', bytes: 10, hash: 'abcd', key: '', ok: true, note: 'h' + i });
  const histRaw8 = JSON.stringify(histEntries);
  const ctx8 = makeCtx();
  ctx8.S = baseSave({ xp: 1 });
  evalIn(ctx8, `
    window.__v31calls = 0;
    window.__v31 = {
      recordBackupEvent: function(){ window.__v31calls++; return true; },
      status: function(){ return {version:'16.3.0'}; },
      readHistory: function(){ return []; },
      listSystemSnapshots: function(){ return []; }
    };
    window.__flushCalls = 0;
    window.__v20 = {
      flush: function(){ window.__flushCalls++; },
      dataPanelHTML: function(){ return '<div class="v20panel" id="v20panel"><div class="v20card">x</div></div>'; },
      syncNow: function(){ return Promise.resolve({ok:true, action:'already-synced'}); }
    };
    window.__saveCalls = 0;
    window.save = function(){ window.__saveCalls++; };
    localStorage.setItem('hanvocab.v1', '${'x'.repeat(1000)}');
    localStorage.setItem('hanvocab.v16.backup-history', ${JSON.stringify(histRaw8)});
    localStorage.setItem('hanvocab.v12.preimport-1000', '${'x'.repeat(300)}');
    localStorage.setItem('hanvocab.v12.preimport-2000', '${'x'.repeat(500)}');
    localStorage.setItem('hanvocab.v12.preimport-3000', '${'x'.repeat(100)}');
    localStorage.setItem('hanvocab.v12.preimport-4000', '${'x'.repeat(100)}');
    localStorage.setItem('hanvocab.v12.preimport-5000', '${'x'.repeat(100)}');
    localStorage.setItem('hanvocab.v12.preimport-6000', '${'x'.repeat(100)}');
    localStorage.setItem('hanvocab.v12.preimport-7000', '${'x'.repeat(100)}');
    localStorage.setItem('hanvocab.v11-backup', '${'x'.repeat(400)}');
    localStorage.setItem('hanvocab.v16.last-verified-cloud', '${'x'.repeat(50)}');
    localStorage.setItem('other-app-key', '${'y'.repeat(999)}');
  `);
  loadFile(ctx8, 'v32.js', 'v32');
  check('§8 __v32 loaded, version 16.4.0', evalIn(ctx8, 'window.__v32 && window.__v32.version') === '16.4.0');
  const st8 = evalIn(ctx8, 'window.__v32.computeStorage()');
  const keyBytes8 = k => { const e = (st8.keys || []).find(x => x.key === k); return e ? e.bytes : null; };
  check('§8 per-key bytes exact: hanvocab.v1 = 1000 B', keyBytes8('hanvocab.v1') === 1000, keyBytes8('hanvocab.v1'));
  check('§8 per-key bytes exact: history = ' + histRaw8.length + ' B', keyBytes8('hanvocab.v16.backup-history') === histRaw8.length, keyBytes8('hanvocab.v16.backup-history'));
  check('§8 per-key bytes exact: preimport-2000 = 500 B', keyBytes8('hanvocab.v12.preimport-2000') === 500, keyBytes8('hanvocab.v12.preimport-2000'));
  check('§8 per-key bytes exact: v11-backup = 400 B', keyBytes8('hanvocab.v11-backup') === 400, keyBytes8('hanvocab.v11-backup'));
  const expectedTotal8 = 1000 + histRaw8.length + 300 + 500 + 100 * 5 + 400 + 50;
  check('§8 total = sum of hanvocab.* only (' + expectedTotal8 + ' B)', st8.totalBytes === expectedTotal8, st8.totalBytes);
  check('§8 unrelated key excluded from total and key list', keyBytes8('other-app-key') === null && st8.totalBytes === expectedTotal8);
  const expectedPct8 = Math.round((expectedTotal8 / BUDGET * 100) * 10) / 10;
  check('§8 pct exact to 0.1 (' + expectedPct8 + ')', st8.pct === expectedPct8, st8.pct);
  check('§8 level ok below 70%', st8.level === 'ok', st8.level);
  check('§8 byKind sums exact', st8.byKind && st8.byKind.save === 1000 && st8.byKind.history === histRaw8.length && st8.byKind.snapshots === 1300 && st8.byKind.verified === 50 && st8.byKind.other === 400, st8.byKind);
  const status8 = evalIn(ctx8, 'window.__v32.status()');
  check('§8 status() fields (version/budget/total/level/saveVersion/versionKnown)', status8 && status8.version === '16.4.0' && status8.budgetBytes === BUDGET && status8.totalBytes === expectedTotal8 && status8.level === 'ok' && status8.saveVersion === 12 && status8.versionKnown === true, status8);
  check('§8 levelFor 70% boundary (69.9 ok, 70 warn)', evalIn(ctx8, `window.__v32._test.levelFor(69.9)==='ok' && window.__v32._test.levelFor(70)==='warn'`));
  check('§8 levelFor 90% boundary (89.9 warn, 90 critical)', evalIn(ctx8, `window.__v32._test.levelFor(89.9)==='warn' && window.__v32._test.levelFor(90)==='critical'`));
  // Threshold totals in fresh contexts (rounded pct must cross the boundary).
  const boundaryCases = [
    [3667394, 69.9, 'ok', 'just below 70%'],
    [3670017, 70.0, 'warn', 'just above 70%'],
    [4715970, 89.9, 'warn', 'just below 90%'],
    [4718593, 90.0, 'critical', 'just above 90%'],
  ];
  for (const [bytes, pct, level, label] of boundaryCases) {
    const cb = makeCtx();
    cb.S = baseSave({ xp: 1 });
    evalIn(cb, `window.__v31 = { recordBackupEvent: function(){ return true; } }; window.__v20 = { flush: function(){}, dataPanelHTML: function(){ return '<div id="v20panel"><div>x</div></div>'; } }; localStorage.setItem('hanvocab.v1', '${'x'.repeat(10)}');`);
    // Replace the small seed with the boundary-size value (kept as one key).
    cb.__sandbox.localStorage.setItem('hanvocab.v1', 'x'.repeat(bytes));
    loadFile(cb, 'v32.js', 'v32');
    const got = evalIn(cb, 'window.__v32.computeStorage()');
    check(`§8 total ${label} (${bytes} B) -> pct ${pct}, level ${level}`, got.pct === pct && got.level === level, got);
  }
  // prunePlan: exactly the deletable keys, never protected keys.
  const plan8 = evalIn(ctx8, 'window.__v32._test.prunePlan()');
  check('§8 prunePlan lists exactly the oldest snapshots beyond newest 5', JSON.stringify(plan8.snapshotKeys) === JSON.stringify(['hanvocab.v12.preimport-2000', 'hanvocab.v12.preimport-1000']), plan8.snapshotKeys);
  check('§8 prunePlan never lists v1 / v11-backup / verified-cloud / other keys', !plan8.deletedKeys.includes('hanvocab.v1') && !plan8.deletedKeys.includes('hanvocab.v11-backup') && !plan8.deletedKeys.includes('hanvocab.v16.last-verified-cloud') && plan8.historyPrune === 5 && plan8.historyKept === 10, plan8);
  const newHistRaw8 = JSON.stringify(histEntries.slice(0, 10));
  const expectedFreed8 = 800 + Math.max(0, histRaw8.length - newHistRaw8.length);
  check('§8 prunePlan freedBytes exact (' + expectedFreed8 + ')', plan8.freedBytes === expectedFreed8, plan8.freedBytes);
  const totalBeforeCancel = evalIn(ctx8, 'window.__v32.computeStorage().totalBytes');
  const cancel8 = evalIn(ctx8, `window.__v32.cleanupSafe(function(){ return false; })`);
  check('§8 cleanupSafe confirm=false returns cancelled', cancel8 && cancel8.ok === false && cancel8.reason === 'cancelled', cancel8);
  check('§8 cleanupSafe confirm=false deletes nothing', evalIn(ctx8, 'window.__v32.computeStorage().totalBytes') === totalBeforeCancel && lsKeys(ctx8).includes('hanvocab.v12.preimport-1000') && evalIn(ctx8, `window.__v32._test.prunePlan().historyPrune`) === 5);
  const do8 = evalIn(ctx8, `window.__v32.cleanupSafe(function(){ return true; })`);
  check('§8 cleanupSafe confirm=true deletes exactly the plan', do8 && do8.ok === true && JSON.stringify(do8.deletedKeys) === JSON.stringify(plan8.snapshotKeys), do8);
  check('§8 cleanupSafe returns the exact freed bytes', do8 && do8.freedBytes === expectedFreed8, do8 && do8.freedBytes);
  check('§8 after cleanup: history kept at newest 10 (h15..h6)', (() => { const h = evalIn(ctx8, `(function(){ try{ return JSON.parse(localStorage.getItem('hanvocab.v16.backup-history')||'[]'); }catch(e){ return []; } })()`); return h.length === 10 && h[0].note === 'h15' && h[9].note === 'h6'; })());
  check('§8 after cleanup: prunePlan is empty', (() => { const p = evalIn(ctx8, 'window.__v32._test.prunePlan()'); return p.snapshotKeys.length === 0 && p.historyPrune === 0; })());
  check('§8 hanvocab.v11-backup survives cleanup', ctx8.__sandbox.localStorage.getItem('hanvocab.v11-backup') === 'x'.repeat(400));
  check('§8 hanvocab.v1 survives cleanup (1000 B)', ctx8.__sandbox.localStorage.getItem('hanvocab.v1') === 'x'.repeat(1000));
  check('§8 last-verified-cloud survives cleanup', ctx8.__sandbox.localStorage.getItem('hanvocab.v16.last-verified-cloud') === 'x'.repeat(50));
  check('§8 cleanup recorded via __v31.recordBackupEvent', evalIn(ctx8, 'window.__v31calls') === 1, evalIn(ctx8, 'window.__v31calls'));
  // monitorHTML: live values, thresholds, save version, progress bar.
  const mon8 = evalIn(ctx8, 'window.__v32.monitorHTML()');
  check('§8 monitorHTML has per-key rows + threshold text', mon8.indexOf('hanvocab.v1') >= 0 && mon8.indexOf('Cảnh báo ở 70%') >= 0 && mon8.indexOf('Nguy hiểm ở 90%') >= 0);
  check('§8 monitorHTML shows live save version + progress bar', mon8.indexOf('12') >= 0 && mon8.indexOf('v32bar') >= 0);
  // Save-wrap: fake global save, grow past 90%, warning flag set, data untouched.
  const ctx8c = makeCtx();
  ctx8c.S = baseSave({ xp: 1 });
  evalIn(ctx8c, `
    window.__v31 = { recordBackupEvent: function(){ return true; } };
    window.__v20 = { flush: function(){}, dataPanelHTML: function(){ return '<div id="v20panel"><div>x</div></div>'; } };
    window.__saveCalls = 0;
    window.save = function(){ window.__saveCalls++; };
    localStorage.setItem('hanvocab.v1', '${'x'.repeat(1000)}');
  `);
  loadFile(ctx8c, 'v32.js', 'v32');
  check('§8 save-wrap: saveWrapped() true after load', evalIn(ctx8c, 'window.__v32._test.saveWrapped()') === true);
  check('§8 save-wrap: flushWrapped() true after load', evalIn(ctx8c, 'window.__v32._test.flushWrapped()') === true);
  const rawBeforeSave = ctx8c.__sandbox.localStorage.getItem('hanvocab.v1');
  evalIn(ctx8c, `window.save();`);
  check('§8 save-wrap: original save called exactly once per call, data untouched', evalIn(ctx8c, 'window.__saveCalls') === 1 && ctx8c.__sandbox.localStorage.getItem('hanvocab.v1') === rawBeforeSave);
  ctx8c.__sandbox.localStorage.setItem('hanvocab.v1', 'x'.repeat(4715970));
  const warnsBefore89 = ctx8c.__sandbox.__warns.length;
  const callsBefore89 = evalIn(ctx8c, 'window.__saveCalls');
  evalIn(ctx8c, `window.save();`);
  await sleep(1200);
  check('§8 save-wrap at 89.9%: warning flag set ([V32] warn logged)', ctx8c.__sandbox.__warns.length > warnsBefore89 && ctx8c.__sandbox.__warns.some(w => w.indexOf('[V32]') === 0), ctx8c.__sandbox.__warns);
  check('§8 save-wrap at 89.9%: original called once more, data untouched', evalIn(ctx8c, 'window.__saveCalls') === callsBefore89 + 1 && ctx8c.__sandbox.localStorage.getItem('hanvocab.v1') === 'x'.repeat(4715970));
  ctx8c.__sandbox.localStorage.setItem('hanvocab.v1', 'x'.repeat(4718593));
  const warnsBefore90 = ctx8c.__sandbox.__warns.length;
  const callsBefore90 = evalIn(ctx8c, 'window.__saveCalls');
  evalIn(ctx8c, `window.save();`);
  await sleep(1200);
  check('§8 save-wrap past 90%: critical warning flag set', ctx8c.__sandbox.__warns.length > warnsBefore90 && ctx8c.__sandbox.__warns.some(w => w.indexOf('[V32]') === 0), ctx8c.__sandbox.__warns);
  check('§8 save-wrap past 90%: original called once more, data untouched', evalIn(ctx8c, 'window.__saveCalls') === callsBefore90 + 1 && ctx8c.__sandbox.localStorage.getItem('hanvocab.v1') === 'x'.repeat(4718593));
  // Regression: load v31 then v32 — V31 still intact.
  const ctx8d = makeCtx();
  ctx8d.S = baseSave({ xp: 100 });
  loadFile(ctx8d, 'v20_sync.js', 'v20_sync');
  evalIn(ctx8d, `
    window.__v20 = { flush: function(){}, dataPanelHTML: function(){ return '<div class="v20panel" id="v20panel"><div class="v20card">x</div></div>'; }, syncNow: function(){ return Promise.resolve({ok:true, action:'already-synced'}); } };
    window.__exported = false;
    window.__v15 = { backupExport: function(){ window.__exported = true; } };
    window.__recCalls = 0;
    window.__v27 = { recordAnswer: function(){ window.__recCalls++; }, _test: { claimPlanBonus: function(){ return 20; }, claimStreak7: function(){ return 0; } } };
    localStorage.setItem('hanvocab.v1', JSON.stringify(S));
  `);
  loadFile(ctx8d, 'v31.js', 'v31');
  loadFile(ctx8d, 'v32.js', 'v32');
  check('§8 regression: __v31.status() still reports 16.3.0 after V32 loads', evalIn(ctx8d, 'window.__v31.status().version') === '16.3.0');
  check('§8 regression: __v32.version is 16.4.0 in the same ctx', evalIn(ctx8d, 'window.__v32.version') === '16.4.0');
  const panel8d1 = evalIn(ctx8d, `window.__v20.dataPanelHTML()`);
  check('§8 regression: panel has exactly one #v31panel after V32 loads', (panel8d1.match(/id="v31panel"/g) || []).length === 1);
  check('§8 regression: panel has exactly one #v32monitor after V32 loads', (panel8d1.match(/id="v32monitor"/g) || []).length === 1);
  // Production re-init path (B-32-2, see report): both layers registered a
  // DOMContentLoaded listener (readyState 'loading' at inline-script parse
  // time), so init31 + init32 run a second time after load, in that order.
  // Each layer's wrap guard sees only its own marker, which the other
  // layer's wrapper does not carry, so both re-wrap and every panel render
  // appends the V31 section + V32 monitor twice. Asserted here via init().
  evalIn(ctx8d, `window.__v31._test.init(); window.__v32._test.init();`);
  const panel8d2 = evalIn(ctx8d, `window.__v20.dataPanelHTML()`);
  check('§8 regression: panel wrap stays idempotent after DOMContentLoaded re-init (still one #v31panel + one #v32monitor)', (panel8d2.match(/id="v31panel"/g) || []).length === 1 && (panel8d2.match(/id="v32monitor"/g) || []).length === 1, { v31: (panel8d2.match(/id="v31panel"/g) || []).length, v32: (panel8d2.match(/id="v32monitor"/g) || []).length });

  // ================= §9 Chrome-only (SKIP, never PASS) =================
  section('§9', 'Chrome-only — skipped in this environment (see report)');
  const chromeWhy = 'Chrome will not launch on this host (WebGL domain-policy error) — see SMOKE_TEST §4';
  skipCheck('real file restore round-trip', chromeWhy);
  skipCheck('offline/online backup', chromeWhy);
  skipCheck('reload persistence after monitor cleanup', chromeWhy);
  skipCheck('0 JS errors', chromeWhy);
  skipCheck('monitor UI at 360/390/430 with no overflow', chromeWhy);
  skipCheck('F-02 real-engine race (3x per path)', chromeWhy);
  skipCheck('C9 real-File restore', chromeWhy);
  skipCheck('V16.3 regression (Smart overlay, Pet Hub, v18 fight, Library, login, backup panel)', chromeWhy);

  console.log(`\ntest32.js: PASS ${pass} / FAIL ${fail} / SKIP ${skip}${fail ? ' — FAILURES: ' + failures.join(' | ') : ''}`);
  for (const id of ['§0', '§1', '§2', '§3', '§4', '§5', '§6', '§7', '§8', '§9']) {
    const c = secCounts[id] || { pass: 0, fail: 0, skip: 0 };
    console.log(`  ${id}: PASS ${c.pass} / FAIL ${c.fail} / SKIP ${c.skip}`);
  }
  console.log('TEST32_SUMMARY ' + JSON.stringify({ pass, fail, skip, sections: secCounts }));
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('test32.js harness error:', e); process.exit(2); });
