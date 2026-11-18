// test31.js — V16.3 Backup & Restore Fix verification (Node vm harness).
// No external dependencies: runs with plain `node` (no jsdom, no Chrome).
// Usage: node tools/v31/test31.js [DIR]
//   DIR = build dir holding the standalone .js files + index.html
//   (default: <repo>/out). For the ZIP run, extract the ZIP and pass
//   the extraction dir. Exit 0 = all runnable checks pass (skips are
//   reported, never counted as passes).
// What this covers (PLAN_V31.md E.4, adapted to this environment):
//   vm-run: F-01/F-03/en16 merge, F-13 hasProgress + syncNow conflict,
//   F-14 localTime fallback, F-15 proto-pollution rejection, F-11
//   recordAnswer with S absent + normal path, V31 history/restore/undo/
//   verifyCloudBackup (mock adapter), post-merge report, panel wrap,
//   export wrap, F-11 export wrapper.
//   static (file reads): versions, marker order, in-scope fragments,
//   out-of-scope absence, KO entry, C1 filename, C6/C9 strings.
//   SKIP (Chrome-only, counted separately, never as PASS): F-02 race
//   behaviour, F-12 resetEN behaviour, C9 Account Center UI flow,
//   C1 export bytes, panel/Account Center rendering, WCAG/mobile.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
let pass = 0, fail = 0, skip = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 500) : ''}`); }
}
function skipCheck(name, why) { skip++; console.log(`  SKIP ${name} — ${why}`); }
function section(t) { console.log(`\n== ${t} ==`); }
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
    setTimeout, clearTimeout,
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

async function main() {
  console.log(`test31.js — DIR=${DIR}`);
  if (!fs.existsSync(path.join(DIR, 'index.html'))) { console.log('FAIL: index.html missing — run build_v31.py first'); process.exit(2); }
  if (!fs.existsSync(path.join(DIR, 'v31.js'))) { console.log('FAIL: v31.js missing — run build_v31.py first'); process.exit(2); }
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf-8');

  // ================= §0 static: versions, markers, fragments =================
  section('§0 static — build integrity');
  check('title is V16.3', html.includes('Vocab Farm V16.3'));
  check('__v31 + 16.3.0 present', html.includes('window.__v31') && html.includes("VERSION='16.3.0'"));
  for (const ver of ['13.0.0', '15.0.0', '15.1.0', '15.2.0', '15.3.0', '16.0.0']) {
    check(`old version ${ver} intact`, html.includes(ver));
  }
  const styleIds = Array.from(html.matchAll(/<style id="(v\d+)"/g)).map(m => m[1]);
  const scriptIds = Array.from(html.matchAll(/<script id="(v\d+)js"/g)).map(m => m[1]);
  check('style markers end v31', styleIds.length > 0 && styleIds[styleIds.length - 1] === 'v31', styleIds.join(','));
  check('script markers end v31', scriptIds.length > 0 && scriptIds[scriptIds.length - 1] === 'v31', scriptIds.join(','));
  check('no v28/v29 markers', !html.includes('id="v28"') && !html.includes('id="v29"') && !html.includes('__v29'));
  check('no v31kotab (KO button must not be added)', !html.includes('v31kotab'));
  check('KO Data-view entry present x1 (injectDataBtn label)', html.split('Quản lý dữ liệu &amp; đồng bộ').length - 1 === 1);
  for (const m of ['v21emailbtn', '_esc21', 'armV27Obs', 'rearmObserver', '_speakXp', 'V29 (F-05)']) {
    check(`out-of-scope marker absent: ${m}`, !html.includes(m));
  }
  const frags = [
    ['R-F-01a', '/* V31 (F-01):'],
    ['R-F-01b en', 'mEn[kEn2]=maxMap(lEn[kEn2], cEn[kEn2])'],
    ['R-F-03a due', 'm15.due=d15;'],
    ['R-F-03b claimed', 'm17.claimed=fillMissing(l17.claimed, c17.claimed)'],
    ['R-F-01-en16', 'm16[k16b]=fillMissing(l16[k16b], c16[k16b])'],
    ['R-F-13a flat win', 'if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) return true;'],
    ['R-F-13b en27', 'if(v7.en27&&v7.en27.sessions&&v7.en27.sessions.length) return true;'],
    ['R-F-14 fallback', 'loc.obj.v7.meta.migratedAt'],
    ['R-F-15 depth 6', "if(depth>6||!o||typeof o!=='object') return;"],
    ['R-F-02b flush', 'try{ flush(); }catch(e){}'],
    ['R-F-16 validate', "if(_ve&&String(_ve.message||'').indexOf('invalid save')===0) throw _ve;"],
    ['R-V31-F11', '[V31] recordAnswer dropped'],
    ['R-V31-F01-en18', '/* V31 (F-01): V18 boss records are FLAT'],
    ['R-V31-F12', '_e27.en.last={};'],
    ['R-V31-C9', '__v20.importFile(imp)'],
    ['R-V31-C6', 'if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++;'],
    ['R-V31-C1b filename', 'korean-vocab-farm-backup-v16.3.json'],
    ['R-V31-C1c started-msg', 'Đã bắt đầu tải file sao lưu'],
    ['R-V31-C6b merge copy', 'từ tiếng Anh giữ mức cao nhất từng từ (box/số câu đúng/số câu sai)'],
    ['R-V31-C6c acct copy', 'Hợp nhất: từ tiếng Anh giữ mức cao nhất từng từ;'],
  ];
  for (const [label, frag] of frags) check(`in-scope fragment ${label}`, html.includes(frag));
  check('stale v7 backup filename absent', !html.includes('korean-vocab-farm-backup-v7.json'));
  check('C9 .then handler absent', !html.includes('__v20.importFile(f).then'));

  // ================= §1 F-01/F-03/en16 merge (vm, real v20_sync.js) =================
  section('§1 F-01/F-03/en16 — mergeSaves (vm)');
  const ctx = makeCtx();
  loadFile(ctx, 'v20_sync.js', 'v20_sync');
  const S20 = evalIn(ctx, 'window.__v20sync');
  check('__v20sync loaded', !!S20 && typeof S20.mergeSaves === 'function');
  const A = baseSave({ xp: 500, v7: { gems: 3, en: { box: { w1: 2, w2: 2, w3: 2, w4: 2, w5: 2 }, right: { w1: 3, w2: 4 }, wrong: {} }, en15: { due: { w1: 100 }, bosses: { b1: 1 } }, en16: { map: { w1: 'deckA' } }, en17: { fav: ['x'], claimed: {} }, en18: { bosses: { v18_slime: { win: 1, wins: 1, at: 1000, item: 'gem' } } }, en19: { bosses: { v11_boss1: { en: { win: 1, wins: 2, stars: 2, best: 90 } } } }, en22: { quest: { q1: { stars: 2 } } }, en23: { pets: { petA: { lv: 1 } }, team: ['petA', null, null] }, en27: { sessions: [{ t: 100, c: 1 }], days: {}, en: { last: { w1: 100 }, cw: {}, cr: {} }, ko: { right: {}, wrong: {}, cw: {}, cr: {}, last: {} } } } });
  const B = baseSave({ xp: 800, v7: { gems: 5, en: { box: { w6: 3, w7: 3, w8: 3, w9: 3, w10: 3 }, right: { w6: 5 }, wrong: {} }, en15: { due: { w1: 50 }, bosses: { b2: 1 } }, en16: { map: { w1: 'deckB', w2: 'deckC' } }, en17: { fav: ['y'], claimed: { L1: 1 } }, en18: { bosses: { v18_dragon: { win: 1, wins: 3, at: 2000, item: 'coin' }, v18_slime: { win: 1, wins: 2, at: 1500, item: 'gem' } } }, en19: { bosses: { v11_boss1: { ko: { win: 1, wins: 1, stars: 3, best: 100 } }, v11_boss2: { en: { win: 1, wins: 1, stars: 1, best: 80 } } } }, en22: { quest: { q2: { stars: 3 } } }, en23: { pets: { petB: { lv: 2 } }, team: ['petB', null, null] }, en27: { sessions: [{ t: 200, c: 2 }], days: {}, en: { last: { w6: 200 }, cw: {}, cr: {} }, ko: { right: {}, wrong: {}, cw: {}, cr: {}, last: {} } } } });
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

  // ================= §2 F-13 hasProgress + syncNow conflict =================
  section('§2 F-13 — hasProgress + syncNow conflict (vm, mock adapter)');
  const hp = evalIn(ctx, 'window.__v20sync.hasProgress');
  const en27Only = baseSave({ v7: { en27: { sessions: [{ t: 1 }], en: { last: { w1: 1 }, cw: {}, cr: {} } } } });
  const petOnly = baseSave({ v7: { en23: { pets: { p1: { lv: 1 } } } } });
  const questOnly = baseSave({ v7: { en22: { quest: { q1: { stars: 1 } } } } });
  const flatWin = baseSave({ v7: { en18: { bosses: { v18_slime: { win: 1 } } } } });
  const empty = baseSave({});
  ctx.__t = en27Only; check('F-13 en27-only local has progress', evalIn(ctx, 'window.__v20sync.hasProgress(__t)') === true);
  ctx.__t = petOnly; check('F-13 en23-only local has progress', evalIn(ctx, 'window.__v20sync.hasProgress(__t)') === true);
  ctx.__t = questOnly; check('F-13 en22-only local has progress', evalIn(ctx, 'window.__v20sync.hasProgress(__t)') === true);
  ctx.__t = flatWin; check('F-13 flat V18 win counts', evalIn(ctx, 'window.__v20sync.hasProgress(__t)') === true);
  ctx.__t = empty; check('F-13 empty save has no progress', evalIn(ctx, 'window.__v20sync.hasProgress(__t)') === false);
  // syncNow must raise conflict (not download) for en27-only local vs cloud with progress
  ctx.__cloudSave = baseSave({ xp: 999, v7: { gems: 9, en27: { sessions: [{ t: 9 }] } } });
  evalIn(ctx, `
    window.__v20sync._test.setConfig({apiKey:'v31-test', projectId:'v31-test'});
    window.__v20sync._test.setUser({uid:'v31-uid'});
    window.__v20sync._test.setAdapter({ load: function(uid){ return Promise.resolve({data: window.__cloudSave, updatedAt: 2000}); }, save: function(uid, doc){ window.__savedDoc = doc; return Promise.resolve(); }, signOut: function(){ return Promise.resolve(); } });
    localStorage.setItem('hanvocab.v1', JSON.stringify(__t));
  `);
  ctx.__t = en27Only;
  evalIn(ctx, `localStorage.setItem('hanvocab.v1', JSON.stringify(__t)); localStorage.removeItem('hanvocab.v12.meta');`);
  const r13 = await evalIn(ctx, 'window.__v20sync.syncNow({auto:false})');
  check('F-13 syncNow raises conflict (not download)', r13 && r13.ok === false && r13.reason === 'conflict', r13);
  check('F-13 local bytes NOT replaced by download', (() => { const raw = ctx.__sandbox.localStorage.getItem('hanvocab.v1'); const j = JSON.parse(raw); return j.xp === 0 && (j.v7.en27.sessions || []).length === 1; })());
  check('F-13 conflict snapshots written', (() => { const keys = []; for (let i = 0; i < ctx.__sandbox.localStorage.length; i++) keys.push(ctx.__sandbox.localStorage.key(i)); return keys.some(k => k.indexOf('hanvocab.v12.conflict-local-') === 0) && keys.some(k => k.indexOf('hanvocab.v12.conflict-cloud-') === 0); })());

  // ================= §3 F-14 localTime fallback =================
  section('§3 F-14 — conflict localTime fallback (vm)');
  evalIn(ctx, `localStorage.removeItem('hanvocab.v12.meta');`);
  const loc14 = baseSave({ v7: { gems: 0, meta: { saveVersion: 12, migratedAt: 77777 }, en27: { sessions: [{ t: 5 }] } } });
  ctx.__t = loc14;
  evalIn(ctx, `localStorage.setItem('hanvocab.v1', JSON.stringify(__t));`);
  const r14 = await evalIn(ctx, 'window.__v20sync.syncNow({auto:false})');
  check('F-14 syncNow raises conflict', r14 && r14.reason === 'conflict', r14);
  const conf14 = evalIn(ctx, 'window.__v20sync.conflict()');
  check('F-14 localTime falls back to v7.meta.migratedAt (77777)', conf14 && conf14.localTime === 77777, conf14 && conf14.localTime);

  // ================= §4 F-15 proto pollution =================
  section('§4 F-15 — validateSave rejects __proto__ (vm)');
  const crafted = JSON.parse('{"cards":[{"id":"k1","h":"a","m":"b"}],"xp":1501,"v7":{"en27":{"en":{"last":{"__proto__":{"polluted":"V31MARKER"}}}}}}');
  ctx.__t = crafted;
  const v15 = evalIn(ctx, 'window.__v20sync.validateSave(__t)');
  check('F-15 validateSave rejects __proto__ key', v15 && v15.ok === false && (v15.errors || []).join(',').indexOf('bad-key:__proto__') >= 0, v15 && v15.errors);
  check('F-15 ({}).polluted stays undefined', evalIn(ctx, '({}).polluted') === undefined);
  check('F-15 Object.prototype.polluted stays undefined', evalIn(ctx, 'Object.prototype.polluted') === undefined);

  // ================= §5 F-11 recordAnswer =================
  section('§5 F-11 — recordAnswer with S absent + normal path (vm)');
  const ctx27a = makeCtx(); // NO S defined
  loadFile(ctx27a, 'v27.js', 'v27');
  const r11a = evalIn(ctx27a, `(function(){ try{ window.__v27.recordAnswer('en','w1',true,'mc'); return {ok:true}; }catch(e){ return {ok:false, err:String(e)}; } })()`);
  check('F-11 recordAnswer with S absent does not throw', r11a && r11a.ok === true, r11a);
  check('F-11 console.warn emitted mentioning F-11', ctx27a.__sandbox.__warns.some(w => w.indexOf('F-11') >= 0), ctx27a.__sandbox.__warns);
  const memAfter = evalIn(ctx27a, `window.__v27._test.en27().en.last`);
  check('F-11 _mem has no w1 after dropped write', !memAfter || memAfter.w1 === undefined, memAfter);
  const cpb = evalIn(ctx27a, `(function(){ try{ return window.__v27._test.claimPlanBonus('en'); }catch(e){ return 'ERR:'+e; } })()`);
  /* Unwrapped v27 still awards 20 into the never-persisted _mem (gainShared/saveSoon
     no-op safely, so it returns 20) — that is exactly why the V31 wrapper in §6
     exists: only the wrapper returns 0 when S is absent. */
  check('F-11 unwrapped claimPlanBonus still returns 20 (V31 wrapper guards this)', cpb === 20, cpb);
  const ctx27b = makeCtx();
  ctx27b.S = baseSave({});
  loadFile(ctx27b, 'v27.js', 'v27');
  evalIn(ctx27b, `window.__v27.recordAnswer('en','w1',true,'mc')`);
  check('F-11 normal path still records (en.last.w1 set)', typeof evalIn(ctx27b, `S.v7.en27.en.last.w1`) === 'number');
  const protoRec = evalIn(ctx27b, `(function(){ try{ window.__v27.recordAnswer('en','__proto__',true,'mc'); return {ok:true}; }catch(e){ return {ok:false, err:String(e)}; } })()`);
  check('F-11 recordAnswer(__proto__) does not throw', protoRec && protoRec.ok === true, protoRec);
  check('F-11 recordAnswer(__proto__) does not pollute', evalIn(ctx27b, '({}).polluted') === undefined && evalIn(ctx27b, 'Object.prototype.polluted') === undefined);

  // ================= §6 V31 layer (vm) =================
  section('§6 V31 layer — history, restore, undo, verify (vm)');
  const ctx31 = makeCtx();
  ctx31.S = baseSave({ xp: 100 });
  loadFile(ctx31, 'v20_sync.js', 'v20_sync');
  // fake __v20 (flush + dataPanelHTML) + __v15 (backupExport) + __v27 (recordAnswer) BEFORE loading v31.js
  evalIn(ctx31, `
    window.__v20 = { flush: function(){}, dataPanelHTML: function(){ return '<div class="v20panel" id="v20panel"><div class="v20card">x</div></div>'; }, syncNow: function(){ return Promise.resolve({ok:true, action:'already-synced'}); } };
    window.__exported = false;
    window.__v15 = { backupExport: function(){ window.__exported = true; } };
    window.__recCalls = 0;
    window.__v27 = { recordAnswer: function(){ window.__recCalls++; }, _test: { claimPlanBonus: function(){ return 20; }, claimStreak7: function(){ return 0; } } };
    localStorage.setItem('hanvocab.v1', JSON.stringify(S));
  `);
  loadFile(ctx31, 'v31.js', 'v31');
  const st31 = evalIn(ctx31, 'window.__v31.status()');
  check('V31 status() version 16.3.0', st31 && st31.version === '16.3.0', st31);
  check('V31 history starts empty (honest empty state)', st31 && st31.historyCount === 0);
  check('V31 lastVerifiedCloudAt starts 0', st31 && st31.lastVerifiedCloudAt === 0);
  // F-11 wrapper: S absent -> dropped; S present -> passthrough
  evalIn(ctx31, `delete window.__S_holder; var __savedS = S; S = undefined;`);
  // NOTE: `S = undefined` keeps the binding but falsy; hasS() is false.
  evalIn(ctx31, `window.__v27.recordAnswer('en','w1',true,'mc')`);
  check('V31 F-11 wrapper drops recordAnswer when S falsy', evalIn(ctx31, 'window.__recCalls') === 0);
  check('V31 F-11 wrapper warns', ctx31.__sandbox.__warns.some(w => w.indexOf('F-11') >= 0));
  evalIn(ctx31, `S = __savedS; window.__v27.recordAnswer('en','w1',true,'mc')`);
  check('V31 F-11 wrapper passes through when S present', evalIn(ctx31, 'window.__recCalls') === 1);
  // claim wrappers: S absent -> 0, S present -> passthrough (fake returns 20)
  evalIn(ctx31, `S = undefined;`);
  check('V31 F-11 wrapper claimPlanBonus returns 0 when S absent', evalIn(ctx31, `window.__v27._test.claimPlanBonus('en')`) === 0);
  check('V31 F-11 wrapper claimStreak7 returns 0 when S absent', evalIn(ctx31, `window.__v27._test.claimStreak7('en')`) === 0);
  evalIn(ctx31, `S = __savedS;`);
  check('V31 F-11 wrapper claimPlanBonus passes through when S present', evalIn(ctx31, `window.__v27._test.claimPlanBonus('en')`) === 20);
  // panel wrap (idempotent) + sectionHTML
  evalIn(ctx31, `window.__v31._test.wrapDataPanel(); window.__v31._test.wrapDataPanel();`);
  const panelHtml = evalIn(ctx31, `window.__v20.dataPanelHTML()`);
  check('V31 panel wrap injects exactly one #v31panel', (panelHtml.match(/id="v31panel"/g) || []).length === 1);
  check('V31 section shows honest empty history', panelHtml.indexOf('Chưa có lịch sử sao lưu.') >= 0);
  check('V31 section shows three labelled backup rows', panelHtml.indexOf('Lần lưu gần nhất trên thiết bị') >= 0 && panelHtml.indexOf('Lần đồng bộ gần nhất') >= 0 && panelHtml.indexOf('Lần sao lưu đám mây đã xác minh') >= 0);
  check('V31 section shows real size', panelHtml.indexOf('Kích thước bản lưu') >= 0);
  check('V31 cloud controls disabled when unconfigured', panelHtml.indexOf('disabled') >= 0 && panelHtml.indexOf('Chưa cấu hình Firebase') >= 0);
  // export wrap records history
  evalIn(ctx31, `window.__v15.backupExport()`);
  check('V31 export wrap calls through', evalIn(ctx31, 'window.__exported') === true);
  check('V31 export recorded in history', evalIn(ctx31, `window.__v31._test.readHistory().some(function(e){ return e.kind==='local-export'; })`) === true);
  // history cap 20
  evalIn(ctx31, `for(var i=0;i<25;i++) window.__v31.recordBackupEvent('local-export', 10, 'abcd', '', true, 't'+i);`);
  check('V31 history capped at 20', evalIn(ctx31, `window.__v31._test.readHistory().length`) === 20);
  // restoreRaw: validate + snapshot + write + reload flag
  evalIn(ctx31, `window.confirm = function(){ return true; };`);
  const restoreTarget = baseSave({ xp: 555 });
  ctx31.__rt = restoreTarget;
  evalIn(ctx31, `localStorage.setItem('hanvocab.v1', JSON.stringify(S));`);
  const rr = evalIn(ctx31, `window.__v31._test.restoreRaw(JSON.stringify(__rt), 'test')`);
  check('V31 restoreRaw valid save returns ok', rr && rr.ok === true, rr);
  check('V31 restoreRaw wrote restored bytes (XP 555)', JSON.parse(ctx31.__sandbox.localStorage.getItem('hanvocab.v1')).xp === 555);
  check('V31 restoreRaw wrote pre-restore snapshot', (() => { const keys = []; for (let i = 0; i < ctx31.__sandbox.localStorage.length; i++) keys.push(ctx31.__sandbox.localStorage.key(i)); return keys.some(k => k.indexOf('hanvocab.v12.preimport-') === 0); })());
  check('V31 restoreRaw triggered reload', evalIn(ctx31, 'window.__v31._test.reloadCalled()') === true);
  const badRaw = JSON.stringify({ cards: [{ id: 'x' }] });
  ctx31.__bad = badRaw;
  const rb = evalIn(ctx31, `window.__v31._test.restoreRaw(__bad, 'test-bad')`);
  check('V31 restoreRaw rejects bad-card save', rb && rb.ok === false, rb);
  check('V31 restoreRaw bad save leaves current save intact (XP 555)', JSON.parse(ctx31.__sandbox.localStorage.getItem('hanvocab.v1')).xp === 555);
  // undoRestore
  evalIn(ctx31, `window.__v31._test.resetReload();`);
  const ru = evalIn(ctx31, `window.__v31.undoRestore()`);
  check('V31 undoRestore returns ok', ru && ru.ok === true, ru);
  check('V31 undoRestore restores pre-restore bytes (XP 100)', JSON.parse(ctx31.__sandbox.localStorage.getItem('hanvocab.v1')).xp === 100);
  // listSystemSnapshots enumerates planted snapshot
  check('V31 listSystemSnapshots finds preimport entries', evalIn(ctx31, `window.__v31._test.listSystemSnapshots().some(function(s){ return s.key.indexOf('hanvocab.v12.preimport-')===0; })`) === true);
  // merge report
  const rep = evalIn(ctx31, `window.__v31._test.buildMergeReport(${JSON.stringify(A)}, ${JSON.stringify(B)}, ${JSON.stringify(merged)}, 1000, 2000)`);
  check('V31 merge report counts merged words 10', rep && rep.merged.enWords === 10, rep && rep.merged);
  check('V31 merge report names last-write-wins fields', rep && rep.lastWriteWins && rep.lastWriteWins.length === 4);
  check('V31 merge report newer side is cloud', rep && rep.newerSide === 'cloud');
  // verifyCloudBackup with mock adapter (upload -> read-back -> verified)
  const ctxV = makeCtx();
  ctxV.S = baseSave({ xp: 777 });
  loadFile(ctxV, 'v20_sync.js', 'v20_sync');
  loadFile(ctxV, 'v31.js', 'v31');
  evalIn(ctxV, `
    localStorage.setItem('hanvocab.v1', JSON.stringify(S));
    window.__savedCloud = null;
    window.__v20sync._test.setConfig({apiKey:'v31-test', projectId:'v31-test'});
    window.__v20sync._test.setUser({uid:'v31-uid'});
    window.__v20sync._test.setAdapter({ load: function(uid){ return Promise.resolve(window.__savedCloud ? {data: window.__savedCloud, updatedAt: Date.now()} : null); }, save: function(uid, doc){ window.__savedCloud = doc.data; return Promise.resolve(); }, signOut: function(){ return Promise.resolve(); } });
  `);
  const up = await evalIn(ctxV, 'window.__v20sync.syncNow({auto:false})');
  check('V31 verify setup: manual sync uploads (no cloud doc)', up && up.ok === true && up.action === 'uploaded', up);
  let verified = false;
  for (let i = 0; i < 20; i++) { await sleep(250); if (evalIn(ctxV, `window.__v31._test.verifyState()`) === 'verified') { verified = true; break; } }
  check('V31 verifyCloudBackup marks upload verified after read-back', verified, evalIn(ctxV, `window.__v31._test.verifyState()`));
  check('V31 lastVerifiedCloudAt set after verify', evalIn(ctxV, `window.__v31.status().lastVerifiedCloudAt`) > 0);
  check('V31 cloud-upload history entry recorded ok', evalIn(ctxV, `window.__v31._test.readHistory().some(function(e){ return e.kind==='cloud-upload' && e.ok; })`) === true);
  // offline syncNow returns offline, never success (C4)
  evalIn(ctxV, `navigator.onLine = false;`);
  const off = await evalIn(ctxV, 'window.__v20sync.syncNow({auto:false})');
  check('V31/C4 offline syncNow returns {ok:false, reason:offline}', off && off.ok === false && off.reason === 'offline', off);
  evalIn(ctxV, `navigator.onLine = true;`);

  // ================= §7 Chrome-only checks (SKIP, never PASS) =================
  section('§7 Chrome-only — skipped in this environment (see report)');
  skipCheck('F-02 race behaviour (3x per path, EN-Hub / V20 / account)', 'needs real Chrome — Trace/breakpoint trap at launch');
  skipCheck('F-12 resetEN behaviour (EN maps cleared, KO/days kept)', 'needs real Chrome (v15.js needs the full game)');
  skipCheck('C9 Account Center restore with a real File', 'needs real Chrome (file input + reload)');
  skipCheck('C1 export bytes after dirty save + filename', 'needs real Chrome (Blob download)');
  skipCheck('§7 scenarios 1-10 end-to-end (backup online/offline, 2nd profile, JSON round-trip, older-backup conflict)', 'needs real Chrome');
  skipCheck('R11 regression (Pet Hub, v18 fight, Library) + WCAG/mobile at 360-430px', 'needs real Chrome');
  skipCheck('F-02/F-01/F-13/C9 baseline FAILs as regression gates', 'needs real Chrome (drivers staged in verify-v31c.js)');

  // ================= §8 F-12/C9/C1/F-02 static logic checks =================
  section('§8 static logic — replacements present with the right semantics');
  const v15src = fs.readFileSync(path.join(DIR, 'v15.js'), 'utf-8');
  const v20src = fs.readFileSync(path.join(DIR, 'v20.js'), 'utf-8');
  const v21src = fs.readFileSync(path.join(DIR, 'v21.js'), 'utf-8');
  check('F-12 replacement clears ONLY en.last/cw/cr (no ko/days/sessions/streak/claimed)', v15src.includes('_e27.en.last={};_e27.en.cw={};_e27.en.cr={};') && !v15src.includes('_e27.ko') && !/delete S\.v7\.en27/.test(v15src));
  check('F-02a flush guard sits in backupImport (before setItem)', v15src.indexOf('try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}') >= 0);
  check('F-02b flush() sits in importFile (before setItem)', v20src.includes('try{ flush(); }catch(e){}'));
  check('F-02c/d flush guards in activate paths', (v21src.match(/try\{ if\(window\.__v20&&__v20\.flush\) __v20\.flush\(\); \}catch\(e\)\{\}/g) || []).length >= 2);
  check('C6 fixed predicate in conflictHTML sum()', v20src.includes('if(r.win||r.wins||(r.en&&r.en.win)||(r.ko&&r.ko.win)) wins++;'));
  check('C9 handler passes input element (imp), no .then', v21src.includes('__v20.importFile(imp)') && !v21src.includes('__v20.importFile(f).then'));
  check('C1 backupExport flushes before reading localStorage', v15src.indexOf('__v20.flush') < v15src.indexOf("localStorage.getItem('hanvocab.v1')||'{}'"));

  console.log(`\ntest31.js: PASS ${pass} / FAIL ${fail} / SKIP ${skip}${fail ? ' — FAILURES: ' + failures.join(', ') : ''}`);
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('test31.js harness error:', e); process.exit(2); });
