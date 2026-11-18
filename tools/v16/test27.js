// test27.js — V16 Smart Learning verification (real Chrome 157 via CDP).
// Usage: OUT=<build dir> PORT=<http port> node test27.js
//   Run 1+2 against out/ (PORT 8931), run 3 against the packaged ZIP
//   extraction (PORT 8932). Exit 0 = all checks pass.
// Sections: §0 layer integrity · §1 hook coverage · §2 no double XP
//   · §3 classification · §4 plan · §5 Smart Practice engine
//   · §6 BT ensureData · §7 KO derive-only · §8 prune guard
//   · §9 the 12 user-spec situations · §10 regression (spot).
// jsdom is NOT installed in this environment; all checks run in real Chrome.
const fs = require('fs');
const path = require('path');
const { openPage, shot, closeTarget } = require('../v15ui/cdp.js');
const { AUDIT_NAV } = require('../v15nav/audit-nav.js');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.env.OUT || path.join(ROOT, 'out');
const PORT = process.env.PORT || '8931';
const URL = `http://127.0.0.1:${PORT}/index.html`;
const SEED = fs.readFileSync(path.join(__dirname, '..', 'v15ui', 'setups', 'seed.js'), 'utf8');
const SHOTS = path.join(__dirname, 'shots-after');
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const failures = [];
// Errors are wiped by every reload, so stash them node-side before navigating.
const errLog = [];
async function stashErrs(c) {
  try {
    const e = await c.eval(`(window.__v27errs || []).slice(window.__v27errMark || 0)`, true);
    if (Array.isArray(e) && e.length) errLog.push(...e);
  } catch (err) { /* page not ready yet */ }
}
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 600) : ''}`); }
}
function section(t) { console.log(`\n== ${t} ==`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Load the page, apply a localStorage seed BEFORE reload (test26 pattern),
// then install the error collector AFTER the reload.
async function load(c, w, h, seedCode) {
  await stashErrs(c);
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: w < 800 });
  await c.eval(`location.href = ${JSON.stringify(URL)}`);
  await sleep(1500);
  await c.eval(AUDIT_NAV);
  if (seedCode) { await c.eval(seedCode, true); await c.eval(`location.reload()`); await sleep(1800); }
  else { await sleep(400); }
  await c.eval(AUDIT_NAV);
  await c.eval(`window.__v27errs = [];
    window.addEventListener('error', e => window.__v27errs.push(String(e.message || e.error)));
    window.addEventListener('unhandledrejection', e => window.__v27errs.push('rejection: ' + String(e.reason)));`);
  await c.eval(`window.__v27errMark = 0;`);
}
async function markErrs(c) { await c.eval(`window.__v27errMark = (window.__v27errs || []).length`); }
async function checkErrs(c, name) {
  const errs = await c.eval(`(window.__v27errs || []).slice(window.__v27errMark || 0)`, true);
  check(name, Array.isArray(errs) && errs.length === 0, errs);
}
async function flushSave(c) {
  await c.eval(`try{if(window.__v20&&__v20.saveNow)__v20.saveNow()}catch(e){}`);
  await sleep(250);
}
// Fresh profile + the standard seed (XP 12500, gems 42, langChoice).
const FRESH = `(async()=>{ localStorage.clear(); })()`;
const APPLY_SEED = `(async()=>{ ${SEED} })()`;
async function freshLoad(c, w, h) {
  await stashErrs(c);
  await load(c, w || 390, h || 844, FRESH);
  await c.eval(APPLY_SEED, true);
  await c.eval(`location.reload()`);
  await sleep(1800);
  await c.eval(AUDIT_NAV);
  await c.eval(`window.__v27errs = [];
    window.addEventListener('error', e => window.__v27errs.push(String(e.message || e.error)));
    window.addEventListener('unhandledrejection', e => window.__v27errs.push('rejection: ' + String(e.reason)));
    window.__v27errMark = 0;`);
}

// In-page Smart Practice driver: answers every question in the open V27
// session through real DOM clicks, snapshots live XP before/after each
// answer, and computes the mark15-rule expected XP per answer.
// opts: {wrongAt:[questionIdx...], maxQ} — wrongAt answers those questions wrong.
const DRIVER = `
window.__t27drive = async function(opts){
  opts = opts || {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const Sxp = () => { try { return (JSON.parse(localStorage.getItem('hanvocab.v1')).xp) || 0; } catch(e){ return -1; } };
  const Sgems = () => { try { return (JSON.parse(localStorage.getItem('hanvocab.v1')).v7.gems) || 0; } catch(e){ return -1; } };
  const flush = async () => { try { if (window.__v20 && __v20.saveNow) __v20.saveNow(); } catch(e){} await sleep(150); };
  const R = { answers: [], summary: null, done: false, error: null, stopped: false, xpStart: null, xpEnd: null, gemsStart: null, gemsEnd: null };
  const wrongAt = opts.wrongAt || [];
  await flush();
  R.xpStart = Sxp(); R.gemsStart = Sgems();
  let qi = 0;
  for (let guard = 0; guard < (opts.maxQ || 80); guard++) {
    const body = document.querySelector('#v27body');
    if (!body) { R.error = 'no #v27body'; break; }
    const doneEl = body.querySelector('.v27done');
    if (doneEl) { R.done = true; R.summary = doneEl.innerText; await flush(); R.xpEnd = Sxp(); R.gemsEnd = Sgems(); break; }
    const typeIn = body.querySelector('#v27type-in');
    const optBtns = Array.prototype.slice.call(body.querySelectorAll('.v27opt'));
    const flashOk = body.querySelector('.v27btn.ok');
    if (!typeIn && !optBtns.length && !flashOk) { await sleep(300); continue; }
    const wantWrong = wrongAt.indexOf(qi) >= 0;
    await flush();
    const xpBefore = Sxp();
    let id = null, kind = null, ok = null, exp = 0, before = null;
    const old = window.__v15.enOld();
    if (typeIn) {
      kind = 'type';
      const m = (body.innerHTML.match(/answerType\\('([^']+)'\\)/) || [])[1];
      id = m || null;
      const w = id ? window.__v15.words.find(function(x){ return x.id === id; }) : null;
      before = w ? { box: old.box[id] || 0, xpAt: old.xpAt[id] || 0, streak: old.streak || 0 } : null;
      ok = w ? (wantWrong ? false : true) : false;
      if (w) typeIn.value = wantWrong ? 'zzz-nope' : w.en;
      const btn = Array.prototype.slice.call(body.querySelectorAll('.v27btn.pri')).find(function(b){ return (b.getAttribute('onclick') || '').indexOf('answerType(') >= 0; });
      if (before) { const rose = ok && before.box < 5; exp = (ok && rose && (Date.now() - before.xpAt > 600000)) ? 10 : 0; const st = ok ? before.streak + 1 : 0; if (ok && st > 0 && st % 5 === 0) exp += 5; }
      if (btn) btn.click(); else { R.error = 'type: no check button'; break; }
    } else if (optBtns.length) {
      kind = body.querySelector('.v27q-prompt') && body.querySelector('.v27q-prompt').textContent.indexOf('Nghe') >= 0 ? 'listen' : 'mc';
      const m = (optBtns[0].getAttribute('onclick') || '').match(/answerMC\\('([^']+)'/);
      id = m ? m[1] : null;
      const isKO = !(window.__v15.words.find(function(x){ return x.id === id; }));
      before = { box: 0, xpAt: 0, streak: old.streak || 0 };
      if (!isKO && id) { const w = window.__v15.words.find(function(x){ return x.id === id; }); before = { box: old.box[id] || 0, xpAt: old.xpAt[id] || 0, streak: old.streak || 0 }; }
      ok = !wantWrong;
      const pick = optBtns.find(function(b){ return (b.getAttribute('onclick') || '').indexOf(ok ? ',true,' : ',false,') >= 0; });
      if (!isKO && before) { const rose = ok && before.box < 5; exp = (ok && rose && (Date.now() - before.xpAt > 600000)) ? 10 : 0; const st = ok ? before.streak + 1 : 0; if (ok && st > 0 && st % 5 === 0) exp += 5; }
      else if (isKO) { exp = ok ? 5 : 1; }
      if (pick) pick.click(); else { R.error = 'mc: no matching option'; break; }
    } else if (flashOk) {
      kind = 'flash';
      const m = (flashOk.getAttribute('onclick') || '').match(/answerFlash\\('([^']+)'/);
      id = m ? m[1] : null;
      const isKO = !(window.__v15.words.find(function(x){ return x.id === id; }));
      before = { box: 0, xpAt: 0, streak: old.streak || 0 };
      if (!isKO && id) { before = { box: old.box[id] || 0, xpAt: old.xpAt[id] || 0, streak: old.streak || 0 }; }
      ok = !wantWrong;
      if (!isKO && before) { const rose = ok && before.box < 5; exp = (ok && rose && (Date.now() - before.xpAt > 600000)) ? 10 : 0; const st = ok ? before.streak + 1 : 0; if (ok && st > 0 && st % 5 === 0) exp += 5; }
      else if (isKO) { exp = ok ? 5 : 1; }
      const btn = wantWrong ? body.querySelector('.v27btn.bad') : flashOk;
      if (btn) btn.click(); else { R.error = 'flash: no button'; break; }
    }
    await sleep(250);
    // Read XP BEFORE advancing: on the last question, nextQ() runs
    // finishSession, which pays the +20 plan bonus — that bonus belongs to
    // the session total, not to the last answer's mark15 delta.
    await flush();
    const xpAfter = Sxp();
    const fbBtn = body.querySelector('.v27fb .v27btn.pri');
    if (fbBtn) fbBtn.click();
    R.answers.push({ qi: qi, id: id, kind: kind, ok: ok, xpDelta: xpAfter - xpBefore, xpExpected: exp });
    qi++;
    if (opts.stopAfter && R.answers.length >= opts.stopAfter) { R.stopped = true; await flush(); R.xpEnd = Sxp(); R.gemsEnd = Sgems(); break; }
    await sleep(250);
  }
  if (!R.done && !R.error) R.error = 'driver guard exhausted, no summary';
  return R;
};
`;

// Seed EN SRS state for words by index WITHOUT touching en27 (J10 needs a
// save that has never seen en27; the plain seeder below calls en27()).
function seedENJSNo27(spec) {
  return `(function(){
    const old = window.__v15.enOld(), e15 = window.__v15.en15();
    const now = Date.now();
    ${JSON.stringify(spec)}.forEach(function(s){
      const w = window.__v15.words[s.i]; if (!w) return;
      const id = w.id;
      if (s.box !== undefined) old.box[id] = s.box;
      if (s.right !== undefined) old.right[id] = s.right;
      if (s.wrong !== undefined) old.wrong[id] = s.wrong;
      if (s.due === 'past') e15.due[id] = now - 2*864e5;
      else if (s.due === 'future') e15.due[id] = now + 5*864e5;
      else if (typeof s.due === 'number') e15.due[id] = s.due;
      if (s.xpAt === 'old') old.xpAt[id] = now - 3600e3;
      if (s.xpAt === 'now') old.xpAt[id] = now;
    });
    return true;
  })()`;
}
function seedENJS(spec) {
  return `(function(){
    const old = window.__v15.enOld(), e15 = window.__v15.en15(), d27 = window.__v27.en27();
    const now = Date.now();
    ${JSON.stringify(spec)}.forEach(function(s){
      const w = window.__v15.words[s.i]; if (!w) return;
      const id = w.id;
      if (s.box !== undefined) old.box[id] = s.box;
      if (s.right !== undefined) old.right[id] = s.right;
      if (s.wrong !== undefined) old.wrong[id] = s.wrong;
      if (s.due === 'past') e15.due[id] = now - 2*864e5;
      else if (s.due === 'future') e15.due[id] = now + 5*864e5;
      else if (typeof s.due === 'number') e15.due[id] = s.due;
      if (s.cw) d27.en.cw[id] = s.cw; else delete d27.en.cw[id];
      if (s.cr) d27.en.cr[id] = s.cr; else delete d27.en.cr[id];
      if (s.last === '40d') d27.en.last[id] = now - 40*864e5;
      else if (typeof s.last === 'number') d27.en.last[id] = s.last;
      else if (s.last === null) delete d27.en.last[id];
      if (s.xpAt === 'old') old.xpAt[id] = now - 3600e3;
      if (s.xpAt === 'now') old.xpAt[id] = now;
    });
    return true;
  })()`;
}

(async () => {
  const c = await openPage(URL, 390, 844);
  try {
    // ---------- §0 layer integrity ----------
    section('§0 layer integrity');
    await load(c, 390, 844, FRESH);
    const staticHtml = await c.eval(`fetch('/index.html').then(r => r.text())`, true);
    const pos = id => staticHtml.indexOf(`id="${id}"`);
    check('style markers in order v23<v24<v25<v26<v27',
      pos('v23') > 0 && pos('v23') < pos('v24') && pos('v24') < pos('v25') && pos('v25') < pos('v26') && pos('v26') < pos('v27'),
      [pos('v23'), pos('v24'), pos('v25'), pos('v26'), pos('v27')]);
    check('script markers in order v23js<...<v27js, v27js last',
      pos('v23js') < pos('v24js') && pos('v24js') < pos('v25js') && pos('v25js') < pos('v26js') && pos('v26js') < pos('v27js'),
      [pos('v23js'), pos('v24js'), pos('v25js'), pos('v26js'), pos('v27js')]);
    check('title is V16', staticHtml.includes('Vocab Farm V16'), staticHtml.slice(staticHtml.indexOf('<title>'), staticHtml.indexOf('<title>') + 120));
    check('KO tabs line structurally closed (v23 string closes before v27)',
      staticHtml.includes(`</button>'+'<button class="tab v27kotab"`), null);
    check('all 3 hooks present exactly once in built index.html',
      ['__v27.recordAnswer(\'en\',id,ok,mode)', '__v27.recordAnswer(\'en\',id,ok,\'boss18\')', '__v27.recordAnswer(\'en\',id,ok,\'boss19\')']
        .every(h => staticHtml.split(h).length - 1 === 1),
      ['mode:' + (staticHtml.split(`__v27.recordAnswer('en',id,ok,mode)`).length - 1),
       'boss18:' + (staticHtml.split(`__v27.recordAnswer('en',id,ok,'boss18')`).length - 1),
       'boss19:' + (staticHtml.split(`__v27.recordAnswer('en',id,ok,'boss19')`).length - 1)]);
    const vers = await c.eval(`({ v15: __v15.version, v17: __v17.version, v18: __v18.version, v19: __v19.version, v20: __v20.version, v20sync: __v20sync.version, v21: __v21.version, v22: __v22.version, v23: __v23.version, v24: __v24.version, v25: __v25.version, v26: __v26.version, v27: __v27.version })`, true);
    check('__v27 version 16.0.0', vers.v27 === '16.0.0', vers);
    check('old layer versions pinned', vers.v15 === '15.0.0' && vers.v17 === '10.0.0' && vers.v18 === '15.0.0' && vers.v19 === '15.0.0' && vers.v20 === '12.0.0' && vers.v20sync === '13.0.0' && vers.v21 === '13.0.0' && vers.v22 === '14.0.0' && vers.v23 === '15.0.0' && vers.v24 === '15.1.0' && vers.v25 === '15.2.0' && vers.v26 === '15.3.0', vers);
    await markErrs(c);
    check('no JS errors on load', (await c.eval(`window.__v27errs`, true)).length === 0, await c.eval(`window.__v27errs`, true));
    // KO tabs: exactly one v27kotab, and it opens the overlay (KO).
    await c.eval(`window.__v15.choose('ko')`);
    await sleep(900);
    const koTabs = await c.eval(`({ v27: document.querySelectorAll('.v27kotab').length, v19: document.querySelectorAll('.v19kotab').length, v23: document.querySelectorAll('.v23kotab').length, tabs: [...document.querySelectorAll('.tabs .tab')].map(b => (b.textContent || '').trim()) })`, true);
    check('KO hub has exactly 1 .v27kotab', koTabs.v27 === 1, koTabs);
    check('KO hub still has Boss Map + Pet tabs (1 each)', koTabs.v19 === 1 && koTabs.v23 === 1, koTabs);
    await c.eval(`document.querySelector('.v27kotab').click()`);
    await sleep(700);
    const koOpen = await c.eval(`(() => { const h = document.querySelector('#v27hub'); return { vis: !!h && h.style.display === 'flex', lang: window.__v27.en27().uiLang, dash: !!document.querySelector('#v27body .v27stats') }; })()`, true);
    check('KO tab button opens Smart overlay in KO', koOpen.vis && koOpen.lang === 'ko' && koOpen.dash, koOpen);
    await c.eval(`window.__v27.closeSmart()`);
    await sleep(400);
    // EN decorator: button injected, survives tab switches.
    await c.eval(`window.__v15.choose('en'); window.__v15.openHub('learn')`);
    await sleep(900);
    const dec1 = await c.eval(`({ head: document.querySelectorAll('.v15hub-headbtns .v27hubbtn').length, langbar: document.querySelectorAll('#v15langbar .v27hubbtn').length })`, true);
    check('EN Hub decorator injects Smart button (headbtns + langbar)', dec1.head >= 1 && dec1.langbar >= 1, dec1);
    await c.eval(`window.__v15.tab('review');`);
    await sleep(700);
    await c.eval(`window.__v15.tab('learn');`);
    await sleep(700);
    const dec2 = await c.eval(`({ head: document.querySelectorAll('.v15hub-headbtns .v27hubbtn').length, langbar: document.querySelectorAll('#v15langbar .v27hubbtn').length })`, true);
    check('Smart button re-injected after EN tab switches', dec2.head >= 1 && dec2.langbar >= 1, dec2);
    await c.eval(`document.querySelector('.v15hub-headbtns .v27hubbtn').click()`);
    await sleep(700);
    const enOpen = await c.eval(`(() => { const h = document.querySelector('#v27hub'); return { vis: !!h && h.style.display === 'flex', lang: window.__v27.en27().uiLang }; })()`, true);
    check('EN decorator button opens Smart overlay in EN', enOpen.vis && enOpen.lang === 'en', enOpen);
    await c.eval(`window.__v27.closeSmart(); window.__v15.closeHub()`);
    await checkErrs(c, '§0 no JS errors during layer checks');

    // ---------- §1 hook coverage ----------
    section('§1 hook coverage (mark15 / mark18 / mark19, exactly once)');
    await freshLoad(c, 390, 844);
    await c.eval(DRIVER);
    await markErrs(c);
    // H1: direct mark15 calls.
    const h1 = await c.eval(`(function(){
      const w = window.__v15.words[10];
      const d = window.__v27.en27();
      const snap = () => ({ last: !!d.en.last[w.id], cr: d.en.cr[w.id] || 0, cw: d.en.cw[w.id] || 0 });
      const a0 = snap();
      const xp1 = window.__v15.mark15(true, w, 'flash');
      const a1 = snap();
      const xp2 = window.__v15.mark15(true, w, 'flash');
      const a2 = snap();
      const xp3 = window.__v15.mark15(false, w, 'mc');
      const a3 = snap();
      const xp4 = window.__v15.mark15(true, w, 'mc');
      const a4 = snap();
      return { id: w.id, xp1, xp2, xp3, xp4, a0, a1, a2, a3, a4 };
    })()`, true);
    check('H1 correct records last+cr exactly once per call', h1.a1.cr === h1.a0.cr + 1 && h1.a1.last === true && h1.a2.cr === h1.a1.cr + 1, h1);
    check('H1 wrong records cw=1, clears cr', h1.a3.cw === 1 && h1.a3.cr === 0, h1);
    check('H1 correct after wrong clears cw, cr=1', h1.a4.cw === 0 && h1.a4.cr === 1, h1);
    check('H1 mark15 returns XP (10 first correct)', h1.xp1 === 10 && h1.xp3 === 0, h1);
    // H1 exactly-once: only this word's last changed across the 4 calls.
    const h1keys = await c.eval(`Object.keys(window.__v27.en27().en.last)`, true);
    check('H1 only the answered word gained a last record', h1keys.length === 1 && h1keys[0] === h1.id, h1keys);
    // H2: V18 boss fight.
    const h2 = await c.eval(`(async () => {
      const before = JSON.parse(JSON.stringify(window.__v27.en27().en));
      window.__v15.openHub(); window.__v15.tab('bosses');
      window.__v18._test.fight('v10_slime');
      await new Promise(r => setTimeout(r, 600));
      const F = window.__v18._test.F();
      const id = F.cur.w.id;
      const fightVisible = !!document.querySelector('#v18fight .v18fight');
      const b = { last: !!before.last[id], cr: before.cr[id] || 0, cw: before.cw[id] || 0 };
      window.__v18._test.pickCorrect();
      await new Promise(r => setTimeout(r, 400));
      const d = window.__v27.en27().en;
      const a = { last: !!d.last[id], cr: d.cr[id] || 0, cw: d.cw[id] || 0 };
      const newKeys = Object.keys(d.last).filter(k => !(k in before.last));
      window.__v18._test.next();
      await new Promise(r => setTimeout(r, 400));
      const F2 = window.__v18._test.F();
      const id2 = F2.cur.w.id;
      const b2 = { cr: d.cr[id2] || 0, cw: d.cw[id2] || 0 };
      window.__v18._test.pickWrong();
      await new Promise(r => setTimeout(r, 400));
      const d2 = window.__v27.en27().en;
      const a2 = { cr: d2.cr[id2] || 0, cw: d2.cw[id2] || 0 };
      window.__v18._test.close();
      return { id, id2, fightVisible, b, a, newKeys, b2, a2 };
    })()`, true);
    check('H2 V18 fight renders', h2.fightVisible === true, h2);
    check('H2 boss correct records exactly once (cr +1, one new last key)', h2.a.cr === h2.b.cr + 1 && h2.a.last === true && h2.newKeys.length === 1 && h2.newKeys[0] === h2.id, h2);
    check('H2 boss wrong then records cw=1, clears cr', h2.a2.cw === h2.b2.cw + 1 && h2.a2.cr === 0, h2);
    // H3: V19 boss fight.
    const h3 = await c.eval(`(async () => {
      const before = JSON.parse(JSON.stringify(window.__v27.en27().en));
      window.__v19.openMapFor('en');
      await new Promise(r => setTimeout(r, 500));
      window.__v19._test.fight('v11_fireking');
      await new Promise(r => setTimeout(r, 700));
      const F = window.__v19._test.F();
      const id = F.cur.w.id;
      const fightVisible = !!document.querySelector('#v19fight .v19fight');
      const b = { last: !!before.last[id], cr: before.cr[id] || 0, cw: before.cw[id] || 0 };
      window.__v19._test.pickCorrect();
      await new Promise(r => setTimeout(r, 400));
      const d = window.__v27.en27().en;
      const a = { last: !!d.last[id], cr: d.cr[id] || 0, cw: d.cw[id] || 0 };
      const newKeys = Object.keys(d.last).filter(k => !(k in before.last));
      window.__v19._test.close();
      return { id, fightVisible, b, a, newKeys };
    })()`, true);
    check('H3 V19 fight renders', h3.fightVisible === true, h3);
    check('H3 boss correct records exactly once (cr +1, one new last key)', h3.a.cr === h3.b.cr + 1 && h3.a.last === true && h3.newKeys.length === 1 && h3.newKeys[0] === h3.id, h3);
    await checkErrs(c, '§1 no JS errors during hook checks');

    // ---------- §2 no double XP ----------
    section('§2 no double XP (session XP = mark15 returns only + plan bonus once)');
    await freshLoad(c, 390, 844);
    await c.eval(DRIVER);
    await markErrs(c);
    // Seed 6 weak EN words (wrong>right) so startWeak builds a 6-word session.
    await c.eval(seedENJS([
      { i: 20, box: 1, right: 1, wrong: 3, due: 'past', xpAt: 'old' },
      { i: 21, box: 1, right: 0, wrong: 2, due: 'past', xpAt: 'old' },
      { i: 22, box: 2, right: 2, wrong: 4, due: 'past', xpAt: 'old' },
      { i: 23, box: 1, right: 1, wrong: 2, due: 'past', xpAt: 'old' },
      { i: 24, box: 1, right: 0, wrong: 1, due: 'past', xpAt: 'old' },
      { i: 25, box: 2, right: 1, wrong: 3, due: 'past', xpAt: 'old' },
    ]));
    // Reset the global answer streak so the +5-every-5th math is deterministic.
    await c.eval(`window.__v15.enOld().streak = 0`);
    await c.eval(`window.__v27.openSmart('en'); window.__v27.startWeak('en')`);
    await sleep(800);
    // Q0 wrong (re-asked at the end), the rest correct.
    const weakRun = await c.eval(`window.__t27drive({ wrongAt: [0], maxQ: 20 })`, true);
    const weakXpOk = weakRun.answers.length > 0 && weakRun.answers.every(a => a.xpDelta === a.xpExpected);
    check('weak session: every answer XP delta equals mark15-rule expected XP', weakXpOk && weakRun.done === true, { answers: weakRun.answers, done: weakRun.done, error: weakRun.error });
    check('weak session: wrong answer re-asked, summary shows improvement',
      weakRun.done && /Đã cải thiện/.test(weakRun.summary || '') && /Hoàn thành buổi học/.test(weakRun.summary || ''),
      (weakRun.summary || '').slice(0, 300));
    const weakTotal = weakRun.answers.reduce((s, a) => s + a.xpExpected, 0);
    check('weak session: total S.xp delta equals sum of per-answer XP (no end bonus)',
      weakRun.xpEnd - weakRun.xpStart === weakTotal, { xpDelta: weakRun.xpEnd - weakRun.xpStart, expected: weakTotal, answers: weakRun.answers.length });
    check('weak session: no plan bonus, no gem (kind=weak)', weakRun.gemsEnd === weakRun.gemsStart, { g0: weakRun.gemsStart, g1: weakRun.gemsEnd });
    await c.eval(`window.__v27.closeSmart()`);
    await checkErrs(c, '§2a no JS errors during weak session');

    // Plan completion bonus: build a 5-min plan, complete it, replay it.
    await c.eval(`window.__v15.enOld().streak = 0`);
    const planA = await c.eval(`(async () => { const r = await window.__v27.buildPlan('en', 5); return { ids: r.plan ? r.plan.ids.length : 0, newN: r.plan ? r.plan.newN : 0, dueN: r.plan ? r.plan.dueN : 0, weakN: r.plan ? r.plan.weakN : 0, short: r.short }; })()`, true);
    check('5-min plan builds (ids > 0)', planA.ids > 0, planA);
    await c.eval(`window.__v27.openSmart('en'); window.__v27.startPlan('en')`);
    await sleep(900);
    const planRun1 = await c.eval(`window.__t27drive({ wrongAt: [], maxQ: 40 })`, true);
    const planXpOk = planRun1.answers.length > 0 && planRun1.answers.every(a => a.xpDelta === a.xpExpected);
    check('plan session: every answer XP delta equals mark15-rule expected XP', planXpOk && planRun1.done === true, { n: planRun1.answers.length, done: planRun1.done, error: planRun1.error });
    const planAnsXp = planRun1.answers.reduce((s, a) => s + a.xpExpected, 0);
    check('plan session: S.xp delta = per-answer XP + exactly +20 plan bonus',
      planRun1.xpEnd - planRun1.xpStart === planAnsXp + 20, { xpDelta: planRun1.xpEnd - planRun1.xpStart, ansXp: planAnsXp });
    check('plan session: summary shows the +20 completion bonus',
      planRun1.done && /\+20 XP/.test(planRun1.summary || ''), (planRun1.summary || '').slice(0, 400));
    const claimed1 = await c.eval(`Object.keys(window.__v27.en27().claimed).filter(k => k.indexOf('plan:en:') === 0)`, true);
    check('plan bonus claimed flag set once', claimed1.length === 1, claimed1);
    // Replay the same completed plan the same day: no second bonus.
    await c.eval(`window.__v15.enOld().streak = 0`);
    await c.eval(`window.__v27.openSmart('en'); window.__v27.startPlan('en')`);
    await sleep(900);
    const planRun2 = await c.eval(`window.__t27drive({ wrongAt: [], maxQ: 40 })`, true);
    const planAnsXp2 = planRun2.answers.reduce((s, a) => s + a.xpExpected, 0);
    check('plan replay: S.xp delta = per-answer XP only (no second +20)',
      planRun2.done === true && planRun2.xpEnd - planRun2.xpStart === planAnsXp2, { xpDelta: planRun2.xpEnd - planRun2.xpStart, ansXp: planAnsXp2, done: planRun2.done });
    check('plan replay: summary shows no +20 bonus line',
      planRun2.done && !/\+20 XP/.test(planRun2.summary || ''), (planRun2.summary || '').slice(0, 300));
    await c.eval(`window.__v27.closeSmart()`);
    await checkErrs(c, '§2b no JS errors during plan sessions');

    // Streak-7 gem: at most once per week.
    // Seed fresh weak words: earlier sessions may have fixed all previous ones,
    // and startWeak with zero weak words starts no session at all.
    await c.eval(seedENJS([
      { i: 26, box: 1, right: 0, wrong: 2, due: 'past', xpAt: 'old' },
      { i: 27, box: 1, right: 1, wrong: 3, due: 'past', xpAt: 'old' },
      { i: 28, box: 2, right: 0, wrong: 1, due: 'past', xpAt: 'old' },
    ]));
    await c.eval(`(function(){ const d = window.__v27.en27(); d.streak.en = { d: new Date(Date.now() - 864e5).toDateString(), n: 6 }; })()`);
    await c.eval(`window.__v27.openSmart('en'); window.__v27.startWeak('en')`);
    await sleep(800);
    const gemRun1 = await c.eval(`window.__t27drive({ wrongAt: [], maxQ: 20 })`, true);
    check('streak-7 session completes', gemRun1.done === true, gemRun1.error);
    check('streak-7 gem awarded exactly +1', gemRun1.gemsEnd - gemRun1.gemsStart === 1, { g0: gemRun1.gemsStart, g1: gemRun1.gemsEnd });
    // The V9 emoji->icon decorator swaps the literal 💎 for
    // <img src="assets/icons/v6/gem.png"> in the live DOM (pre-existing V9
    // behaviour, applies to every layer incl. V27) — so innerText shows
    // "+1  — ..." and innerHTML has the gem img, not the character.
    const gemHtml = await c.eval(`(function(){ const h = document.querySelector('#v27body').innerHTML; return { img: h.indexOf('gem.png') >= 0, char: h.indexOf('💎') >= 0 }; })()`, true);
    check('streak-7 summary mentions the 7-day streak gem (icon or char)', /\+1\s*— bạn đã đạt chuỗi Học thông minh 7 ngày/.test(gemRun1.summary || '') && (gemHtml.img === true || gemHtml.char === true), { summary: (gemRun1.summary || '').slice(0, 300), gemHtml });
    await c.eval(seedENJS([
      { i: 29, box: 1, right: 0, wrong: 2, due: 'past', xpAt: 'old' },
      { i: 30, box: 1, right: 1, wrong: 3, due: 'past', xpAt: 'old' },
      { i: 31, box: 2, right: 0, wrong: 1, due: 'past', xpAt: 'old' },
    ]));
    await c.eval(`window.__v27.openSmart('en'); window.__v27.startWeak('en')`);
    await sleep(800);
    const gemRun2 = await c.eval(`window.__t27drive({ wrongAt: [], maxQ: 20 })`, true);
    check('second session same week awards no second gem', gemRun2.done === true && gemRun2.gemsEnd - gemRun2.gemsStart === 0, { g0: gemRun2.gemsStart, g1: gemRun2.gemsEnd });
    await c.eval(`window.__v27.closeSmart()`);
    await checkErrs(c, '§2c no JS errors during streak sessions');

    // ---------- §3 classification (§5.2) ----------
    section('§3 classification (design §5.2)');
    await freshLoad(c, 390, 844);
    await markErrs(c);
    await c.eval(seedENJS([
      { i: 30, box: 0, right: 0, wrong: 0, last: null },                    // NEW
      { i: 31, box: 2, right: 3, wrong: 1, due: 'future' },                // LEARNING
      { i: 32, box: 1, right: 1, wrong: 3, due: 'future' },                // WEAK (ratio)
      { i: 33, box: 2, right: 5, wrong: 3, due: 'future', cw: 2 },         // WEAK (cw>=2)
      { i: 34, box: 2, right: 2, wrong: 0, due: 'past' },                  // REVIEW
      { i: 35, box: 4, right: 3, wrong: 1, due: 'future', last: '40d' },   // MASTERED (no wrong 30d)
      { i: 36, box: 5, right: 0, wrong: 0, last: null },                   // MASTERED (legacy)
      { i: 37, box: 5, right: 5, wrong: 2, due: 'future', last: null },    // hand-marked box5, NOT mastered
      { i: 38, box: 0, right: 0, wrong: 1, due: 'past' },                  // box0 + wrong => WEAK, not NEW
    ]));
    const clsEN = await c.eval(`(function(){
      const out = {};
      [30, 31, 32, 33, 34, 35, 36, 37, 38].forEach(function(i){
        const w = window.__v15.words[i];
        out[i] = window.__v27.classifyEN(w).cls;
      });
      return out;
    })()`, true);
    check('EN NEW (box0, no history)', clsEN['30'] === 'NEW', clsEN);
    check('EN LEARNING (box2, wrong<=right)', clsEN['31'] === 'LEARNING', clsEN);
    check('EN WEAK via wrong>right', clsEN['32'] === 'WEAK', clsEN);
    check('EN WEAK via cw>=2 despite right>wrong', clsEN['33'] === 'WEAK', clsEN);
    check('EN REVIEW (box2, due, not weak)', clsEN['34'] === 'REVIEW', clsEN);
    check('EN MASTERED (box4, right>=3, no wrong in 30d)', clsEN['35'] === 'MASTERED', clsEN);
    check('EN MASTERED legacy (box5, wrong==0, no V27 history)', clsEN['36'] === 'MASTERED', clsEN);
    check('EN hand-marked box=5 with wrong>0 is NOT MASTERED', clsEN['37'] !== 'MASTERED', clsEN);
    check('EN box=0 with a wrong answer is WEAK, not NEW', clsEN['38'] === 'WEAK', clsEN);
    // Badges render in the Weak tab with Vietnamese labels.
    await c.eval(`window.__v27.openSmart('en'); window.__v27.setTab('weak')`);
    await sleep(700);
    const badges = await c.eval(`(function(){
      const t = document.querySelector('#v27body').innerText;
      return { weak: (t.match(/Từ yếu/g) || []).length, review: (t.match(/Đến hạn/g) || []).length, mastered: (t.match(/Đã thuộc/g) || []).length, rows: document.querySelectorAll('#v27body .v27row2').length };
    })()`, true);
    check('Weak tab renders rows with Vietnamese badges', badges.rows > 0 && badges.weak > 0 && badges.review > 0, badges);
    await c.eval(`window.__v27.closeSmart()`);
    // KO classification (derive rules).
    const clsKO = await c.eval(`(function(){
      const cards = window.__v27._test.koCards();
      const d = window.__v27.en27();
      const set = function(i, box, w, extra){
        const c = cards[i]; c.box = box; if (w === undefined) delete c.w; else c.w = w;
        if (extra) Object.assign(d.ko, extra);
        return c;
      };
      const out = {};
      // NEW: box0, no w, no V27 history
      let c0 = set(0, 0, undefined); out.new = window.__v27.classifyKO(c0).cls;
      // WEAK via pest rule w>=3 && box<4
      let c1 = set(1, 1, 3); out.pest = window.__v27.classifyKO(c1).cls;
      // MASTERED legacy: box5, no w, no history
      let c2 = set(2, 5, undefined); out.masteredLegacy = window.__v27.classifyKO(c2).cls;
      // box5 with w=2, no history -> NOT mastered
      let c3 = set(3, 5, 2); c3.due = Date.now() + 5 * 864e5; out.handMarked = window.__v27.classifyKO(c3).cls;
      // WEAK via V27 wrong>right
      let c4 = set(4, 2, 0); d.ko.right[c4.id] = 1; d.ko.wrong[c4.id] = 3; d.ko.last[c4.id] = Date.now(); out.v27weak = window.__v27.classifyKO(c4).cls;
      // REVIEW: box2, due past, not weak
      let c5 = set(5, 2, 0); c5.due = Date.now() - 864e5; out.review = window.__v27.classifyKO(c5).cls;
      return out;
    })()`, true);
    check('KO NEW (box0, no w, no history)', clsKO.new === 'NEW', clsKO);
    check('KO WEAK via pest rule (w>=3, box<4)', clsKO.pest === 'WEAK', clsKO);
    check('KO MASTERED legacy (box5, no w)', clsKO.masteredLegacy === 'MASTERED', clsKO);
    check('KO hand-marked box=5 with w=2 is NOT MASTERED', clsKO.handMarked !== 'MASTERED', clsKO);
    check('KO WEAK via V27 wrong>right', clsKO.v27weak === 'WEAK', clsKO);
    check('KO REVIEW (box2, due past)', clsKO.review === 'REVIEW', clsKO);
    await checkErrs(c, '§3 no JS errors during classification checks');

    // ---------- §4 plan (caps, priority, shortfall, time picker, stale) ----------
    section('§4 plan (§5.3 caps, priority, shortfall honesty, time picker, stale)');
    await freshLoad(c, 390, 844);
    await markErrs(c);
    await c.eval(seedENJS([
      { i: 50, box: 1, right: 1, wrong: 5, due: 'past', cw: 3, xpAt: 'old' },
      { i: 51, box: 1, right: 1, wrong: 3, due: 'past', xpAt: 'old' },
      { i: 52, box: 2, right: 0, wrong: 2, due: 'past', xpAt: 'old' },
      { i: 53, box: 1, right: 2, wrong: 4, due: 'past', xpAt: 'old' },
      { i: 54, box: 1, right: 1, wrong: 2, due: 'past', xpAt: 'old' },
      { i: 55, box: 2, right: 1, wrong: 2, due: 'past', xpAt: 'old' },
      { i: 56, box: 1, right: 0, wrong: 1, due: 'past', xpAt: 'old' },
      { i: 57, box: 2, right: 2, wrong: 3, due: 'past', xpAt: 'old' },
      { i: 60, box: 1, right: 0, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 61, box: 2, right: 1, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 62, box: 1, right: 1, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 63, box: 3, right: 2, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 64, box: 1, right: 0, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 65, box: 2, right: 1, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 66, box: 1, right: 1, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 67, box: 2, right: 0, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 68, box: 1, right: 1, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 69, box: 2, right: 1, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 70, box: 1, right: 0, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 71, box: 2, right: 1, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 72, box: 1, right: 0, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 73, box: 2, right: 1, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 74, box: 1, right: 1, wrong: 0, due: 'past', xpAt: 'old' },
      { i: 75, box: 2, right: 0, wrong: 0, due: 'past', xpAt: 'old' },
    ]));
    const plan10 = await c.eval(`(async () => { const r = await window.__v27.buildPlan('en', 10); return { ids: r.plan.ids, newN: r.plan.newN, dueN: r.plan.dueN, weakN: r.plan.weakN, avail: r.avail, short: r.short }; })()`, true);
    check('10-min plan caps: 5 new + 10 due + 5 weak = 20 ids', plan10.newN === 5 && plan10.dueN === 10 && plan10.weakN === 5 && plan10.ids.length === 20, plan10);
    const cw3id = await c.eval(`window.__v15.words[50].id`, true);
    check('cw>=3 word pinned at the top of the plan', plan10.ids[0] === cw3id, { first: plan10.ids[0], cw3: cw3id });
    const plan15 = await c.eval(`(async () => { const r = await window.__v27.buildPlan('en', 15); return { n: r.plan.ids.length }; })()`, true);
    check('15-min plan capped at 30 ids', plan15.n === 30, plan15);
    // Shortfall honesty: Oxford lesson 36 scope with exactly 2 due words.
    const short = await c.eval(`(async () => {
      const lesson = 36;
      const inLesson = window.__v15.words.filter(w => (w.oxLessons || []).indexOf(lesson) >= 0);
      const old = window.__v15.enOld(), e15 = window.__v15.en15(), d27 = window.__v27.en27();
      const now = Date.now();
      inLesson.forEach(function(w, k){
        if (k < 2) { old.box[w.id] = 1; old.right[w.id] = 0; old.wrong[w.id] = 0; e15.due[w.id] = now - 864e5; }
        else { old.box[w.id] = 5; old.right[w.id] = 10; old.wrong[w.id] = 0; e15.due[w.id] = now + 30 * 864e5; }
        delete d27.en.cw[w.id]; delete d27.en.cr[w.id]; delete d27.en.last[w.id];
      });
      window.__v15.setScope({ kind: 'lib', lib: 'oxford', lesson: lesson });
      const r = await window.__v27.buildPlan('en', 10);
      const allInScope = r.plan.ids.every(function(id){ const w = window.__v15.words.find(function(x){ return x.id === id; }); return w && (w.oxLessons || []).indexOf(lesson) >= 0; });
      return { lessonSize: inLesson.length, avail: r.avail, short: r.short, ids: r.plan.ids.length, allInScope, scope: r.scope };
    })()`, true);
    check('scoped plan: exactly 2 due available (seeded)', short.avail.DUE === 2, short);
    check('scoped plan: shortfall reported honestly', short.short.some(s => s.indexOf('2 từ đến hạn') >= 0), short.short);
    check('scoped plan: NO silent fallback — all ids in scope', short.allInScope === true && short.ids === 2, short);
    // The plan tab UI shows the scoped counts + banner.
    await c.eval(`window.__v27.openSmart('en'); window.__v27.setTab('plan')`);
    await sleep(700);
    const planUI = await c.eval(`(function(){ const t = document.querySelector('#v27body').innerText; return { banner: t.indexOf('Oxford 3000') >= 0, hasDue2: /2[\\s\\S]{0,20}từ đến hạn có sẵn/.test(t) || t.indexOf('từ đến hạn có sẵn') >= 0 }; })()`, true);
    check('plan tab UI shows the Oxford scope banner', planUI.banner === true, planUI);
    await c.eval(`window.__v27.closeSmart(); window.__v15.clearScope()`);
    await sleep(300);
    // Time picker mapping: 5/10/15/custom -> ~10/20/30/~14 as a LABELLED estimate.
    await c.eval(`window.__v27.openSmart('en'); window.__v27.setTab('plan')`);
    await sleep(600);
    const tp = await c.eval(`(async () => {
      const out = {};
      const txt = () => document.querySelector('#v27body').innerText;
      window.__v27.setMins(5); await new Promise(r => setTimeout(r, 300)); out.m5 = txt();
      window.__v27.setMins(10); await new Promise(r => setTimeout(r, 300)); out.m10 = txt();
      window.__v27.setMins(15); await new Promise(r => setTimeout(r, 300)); out.m15 = txt();
      const inp = document.querySelector('#v27custom-mins'); inp.value = '7';
      document.querySelector('[onclick*="setCustomMins"]').click(); await new Promise(r => setTimeout(r, 300)); out.m7 = txt();
      return out;
    })()`, true);
    check('5 min -> ~10 words (labelled estimate)', /~10 từ/.test(tp.m5) && /ước tính/.test(tp.m5), tp.m5.slice(0, 200));
    check('10 min -> ~20 words', /~20 từ/.test(tp.m10), tp.m10.slice(0, 200));
    check('15 min -> ~30 words', /~30 từ/.test(tp.m15), tp.m15.slice(0, 200));
    check('custom 7 min -> ~14 words', /~14 từ/.test(tp.m7), tp.m7.slice(0, 200));
    await c.eval(`window.__v27.closeSmart()`);
    // Stale plan is rebuilt, never reused.
    const stale = await c.eval(`(async () => {
      const d = window.__v27.en27();
      d.plan.en = { d: new Date(Date.now() - 864e5).toDateString(), mins: 10, newN: 1, dueN: 1, weakN: 0, ids: ['w0', 'w1'], doneIds: [], goals: { complete: false, acc80: false, weak5: false } };
      const before = window.__v27.planOf('en');
      window.__v27.openSmart('en');
      window.__v27.startPlan('en');
      await new Promise(r => setTimeout(r, 1200));
      const q = !!document.querySelector('#v27body .v27q');
      const after = window.__v27.planOf('en');
      return { beforeNull: before === null, questionRenders: q, afterDate: after ? after.d : null, afterIds: after ? after.ids.length : 0 };
    })()`, true);
    check('stale plan: planOf returns null for yesterday', stale.beforeNull === true, stale);
    check('stale plan: startPlan rebuilds and a question renders', stale.questionRenders === true && stale.afterIds > 2, stale);
    check('stale plan: rebuilt plan is dated today', stale.afterDate === new Date().toDateString(), stale);
    await c.eval(`window.__v27.endEarly(); window.__v27.closeSmart()`);
    await checkErrs(c, '§4 no JS errors during plan checks');

    // ---------- §5 Smart Practice engine ----------
    section('§5 Smart Practice engine (EN + KO, re-ask, double-click guard)');
    await freshLoad(c, 390, 844);
    await c.eval(DRIVER);
    await markErrs(c);
    // EN: 5 weak words -> all 5 kinds in one session (mc, mc, type, listen, flash).
    await c.eval(seedENJS([
      { i: 60, box: 1, right: 0, wrong: 2, due: 'past', xpAt: 'old' },
      { i: 61, box: 1, right: 1, wrong: 3, due: 'past', xpAt: 'old' },
      { i: 62, box: 2, right: 0, wrong: 1, due: 'past', xpAt: 'old' },
      { i: 63, box: 1, right: 1, wrong: 2, due: 'past', xpAt: 'old' },
      { i: 64, box: 1, right: 0, wrong: 2, due: 'past', xpAt: 'old' },
    ]));
    await c.eval(`window.__v15.enOld().streak = 0`);
    const srsBefore = await c.eval(`(function(){ const o = window.__v15.enOld(); const out = {}; [60, 61, 62, 63, 64].forEach(function(i){ const id = window.__v15.words[i].id; out[id] = { box: o.box[id] || 0, right: o.right[id] || 0 }; }); return out; })()`, true);
    await c.eval(`window.__v27.openSmart('en'); window.__v27.startWeak('en')`);
    await sleep(800);
    const kindsRun = await c.eval(`window.__t27drive({ wrongAt: [], maxQ: 12 })`, true);
    const kindsSeen = [...new Set(kindsRun.answers.map(a => a.kind))].sort();
    check('EN session covers MC + type + listen + flash kinds', kindsSeen.indexOf('mc') >= 0 && kindsSeen.indexOf('type') >= 0 && kindsSeen.indexOf('listen') >= 0 && kindsSeen.indexOf('flash') >= 0, { kinds: kindsSeen, answers: kindsRun.answers });
    check('EN session: 5/5 correct, summary shows next review', kindsRun.done && /5\/5/.test(kindsRun.summary || '') && /Lần ôn tiếp theo/.test(kindsRun.summary || ''), (kindsRun.summary || '').slice(0, 300));
    const srsAfter = await c.eval(`(function(){ const o = window.__v15.enOld(); const out = {}; [60, 61, 62, 63, 64].forEach(function(i){ const id = window.__v15.words[i].id; out[id] = { box: o.box[id] || 0, right: o.right[id] || 0 }; }); return out; })()`, true);
    const srsOk = Object.keys(srsBefore).every(id => srsAfter[id].right === srsBefore[id].right + 1 && srsAfter[id].box === srsBefore[id].box + 1);
    check('EN session: each word right+1 and box+1 via mark15', srsOk, { before: srsBefore, after: srsAfter });
    await c.eval(`window.__v27.closeSmart()`);
    await checkErrs(c, '§5a no JS errors during EN kinds session');
    // Still-weak: wrong in main AND wrong again in re-ask -> "Vẫn còn yếu".
    // Fresh load first: the previous session's words are still WEAK and would
    // otherwise join this session and change its question count.
    await freshLoad(c, 390, 844);
    await c.eval(DRIVER);
    await c.eval(seedENJS([
      { i: 70, box: 1, right: 0, wrong: 2, due: 'past', xpAt: 'old' },
      { i: 71, box: 1, right: 1, wrong: 3, due: 'past', xpAt: 'old' },
      { i: 72, box: 2, right: 0, wrong: 1, due: 'past', xpAt: 'old' },
    ]));
    await c.eval(`window.__v15.enOld().streak = 0`);
    await c.eval(`window.__v27.openSmart('en'); window.__v27.startWeak('en')`);
    await sleep(800);
    const weakRun2 = await c.eval(`window.__t27drive({ wrongAt: [0, 1, 2, 3], maxQ: 16 })`, true);
    check('still-weak session completes with re-ask phase', weakRun2.done === true, { error: weakRun2.error, n: weakRun2.answers.length });
    check('summary shows "Vẫn còn yếu" for the twice-wrong word', /Vẫn còn yếu/.test(weakRun2.summary || ''), (weakRun2.summary || '').slice(0, 400));
    check('summary shows "Đã cải thiện" for words fixed in re-ask', /Đã cải thiện/.test(weakRun2.summary || ''), (weakRun2.summary || '').slice(0, 400));
    await c.eval(`window.__v27.closeSmart()`);
    await checkErrs(c, '§5b no JS errors during still-weak session');
    // Double-click guard: same MC answer clicked twice + direct double call = 1 record.
    // Fresh load first, for the same weak-word pollution reason as above.
    await freshLoad(c, 390, 844);
    await c.eval(DRIVER);
    await c.eval(seedENJS([
      { i: 80, box: 1, right: 0, wrong: 2, due: 'past', xpAt: 'old' },
      { i: 81, box: 1, right: 1, wrong: 3, due: 'past', xpAt: 'old' },
    ]));
    await c.eval(`window.__v15.enOld().streak = 0`);
    const dbl = await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      window.__v27.openSmart('en'); window.__v27.startWeak('en');
      await sleep(800);
      const body = document.querySelector('#v27body');
      const opts = Array.prototype.slice.call(body.querySelectorAll('.v27opt'));
      const good = opts.find(function(b){ return (b.getAttribute('onclick') || '').indexOf(',true,') >= 0; });
      const m = (good.getAttribute('onclick') || '').match(/answerMC\\('([^']+)',true,'([^']+)'\\)/);
      const id = m[1], picked = m[2];
      const old = window.__v15.enOld(), d27 = window.__v27.en27();
      const r0 = old.right[id] || 0, cr0 = d27.en.cr[id] || 0;
      good.click(); good.click();
      window.__v27.answerMC(id, true, picked);
      window.__v27.answerMC(id, true, picked);
      await sleep(300);
      const fb = body.querySelector('.v27fb .v27btn.pri'); if (fb) fb.click();
      await sleep(300);
      window.__v27.endEarly();
      await sleep(400);
      return { id, rightDelta: (old.right[id] || 0) - r0, crDelta: (d27.en.cr[id] || 0) - cr0, summaryShown: !!document.querySelector('#v27body .v27done') };
    })()`, true);
    check('double-click / double-call records exactly one correct answer', dbl.rightDelta === 1 && dbl.crDelta === 1, dbl);
    check('session still ends cleanly after double-click test', dbl.summaryShown === true, dbl);
    await c.eval(`window.__v27.closeSmart()`);
    // KO session: MC + listen + flash, NO Hangul typing; box/due via V27.
    const koSeed = await c.eval(`(function(){
      const cards = window.__v27._test.koCards();
      const ids = [];
      for (let k = 0; k < 4; k++) { const cc = cards[k]; cc.box = 1; cc.w = 3; cc.due = Date.now() - 864e5; ids.push(cc.id); }
      return { ids, before: ids.map(function(id){ const cc = cards.find(function(x){ return x.id === id; }); return { id, box: cc.box, right: 0 }; }) };
    })()`, true);
    await c.eval(`window.__v27.openSmart('ko'); window.__v27.startWeak('ko')`);
    await sleep(800);
    const koRun = await c.eval(`window.__t27drive({ wrongAt: [], maxQ: 12 })`, true);
    const koKinds = [...new Set(koRun.answers.map(a => a.kind))].sort();
    check('KO session covers MC + listen + flash, NO type kind', koKinds.indexOf('type') < 0 && koKinds.indexOf('mc') >= 0 && koKinds.indexOf('flash') >= 0, { kinds: koKinds, answers: koRun.answers });
    check('KO session completes 4/4', koRun.done && /4\/4/.test(koRun.summary || ''), { done: koRun.done, summary: (koRun.summary || '').slice(0, 200) });
    const koAfter = await c.eval(`(function(){
      const cards = window.__v27._test.koCards();
      const d = window.__v27.en27();
      return ${JSON.stringify(koSeed.ids)}.map(function(id){
        const cc = cards.find(function(x){ return x.id === id; });
        return { id, box: cc.box, right: d.ko.right[id] || 0 };
      });
    })()`, true);
    const koOk = koAfter.every(r => r.box === 2 && r.right === 1);
    check('KO session: each card box 1->2 and ko.right +1 via V27', koOk, koAfter);
    const koXpOk = koRun.answers.every(a => a.xpDelta === a.xpExpected) && koRun.answers.every(a => a.xpExpected === 5);
    check('KO session: +5 XP per correct answer, no other channel', koXpOk, koRun.answers);
    await c.eval(`window.__v27.closeSmart()`);
    await checkErrs(c, '§5 no JS errors during Smart Practice checks');

    // ---------- §6 BT ensureData path (known V14 edge case) ----------
    section('§6 BT ensureData path (V14 edge case: BT scope + fresh load)');
    await freshLoad(c, 390, 844);
    await markErrs(c);
    const bt = await c.eval(`(async () => {
      const before = window.__v15.words.filter(w => (w.lib || []).indexOf('bt') >= 0).length;
      const btLoadedBefore = !!window.__V22_BT;
      window.__v15.setScope({ kind: 'lib', lib: 'bt' });
      const r = await window.__v27.buildPlan('en', 10);
      const after = window.__v15.words.filter(w => (w.lib || []).indexOf('bt') >= 0).length;
      const btIds = r.plan.ids.filter(function(id){ const w = window.__v15.words.find(function(x){ return x.id === id; }); return w && (w.lib || []).indexOf('bt') >= 0; }).length;
      return { before, btLoadedBefore, after, planIds: r.plan.ids.length, btIds, short: r.short };
    })()`, true);
    check('BT words NOT loaded before buildPlan (fresh load, Library never opened)', bt.before === 0 && bt.btLoadedBefore === false, bt);
    check('buildPlan loads BT data via ensureData (no "no words")', bt.after > 0 && bt.planIds > 0, bt);
    check('plan built from BT scope contains BT words', bt.btIds > 0, bt);
    // End-to-end: startPlan with the BT scope starts a real session.
    await c.eval(`window.__v27.openSmart('en'); window.__v27.startPlan('en')`);
    await sleep(1200);
    const btQ = await c.eval(`!!document.querySelector('#v27body .v27q')`, true);
    check('startPlan with BT scope starts a question (no empty state)', btQ === true, btQ);
    await c.eval(`window.__v27.endEarly(); window.__v27.closeSmart(); window.__v15.clearScope()`);
    await checkErrs(c, '§6 no JS errors during BT checks');

    // ---------- §7 KO derive-only (Q2 limit, honest) ----------
    section('§7 KO derive-only (seeded weak list + no recording from normal modes)');
    await freshLoad(c, 390, 844);
    await markErrs(c);
    const koDerive = await c.eval(`(function(){
      const cards = window.__v27._test.koCards();
      const d = window.__v27.en27();
      // Seed a spread: box<=1 / w>=3 / mastered / learning.
      cards[0].box = 0; delete cards[0].w;
      cards[1].box = 1; cards[1].w = 3;
      cards[2].box = 5; delete cards[2].w;
      cards[3].box = 2; cards[3].w = 0; cards[3].due = Date.now() + 5 * 864e5;
      cards[4].box = 1; cards[4].w = 0; cards[4].due = Date.now() - 864e5;
      // Expected weak set by the derive rule: w>=3&&box<4, or V27 wrong>right, or cw>=2.
      const expected = cards.filter(function(cc){
        const kw = d.ko.wrong[cc.id] || 0, kr = d.ko.right[cc.id] || 0, cw = d.ko.cw[cc.id] || 0;
        return (kw > kr) || cw >= 2 || ((cc.w || 0) >= 3 && cc.box < 4);
      }).map(function(cc){ return cc.id; }).sort();
      const got = cards.filter(function(cc){ return window.__v27.classifyKO(cc).cls === 'WEAK'; }).map(function(cc){ return cc.id; }).sort();
      return { expected, got, match: JSON.stringify(expected) === JSON.stringify(got),
               c0: window.__v27.classifyKO(cards[0]).cls, c1: window.__v27.classifyKO(cards[1]).cls,
               c2: window.__v27.classifyKO(cards[2]).cls, c4: window.__v27.classifyKO(cards[4]).cls };
    })()`, true);
    check('seeded KO weak list matches the derive rule exactly', koDerive.match === true, koDerive);
    check('KO derive: box0/no-w is NEW, w3/box1 is WEAK, box5 is MASTERED, box1/due is REVIEW',
      koDerive.c0 === 'NEW' && koDerive.c1 === 'WEAK' && koDerive.c2 === 'MASTERED' && koDerive.c4 === 'REVIEW', koDerive);
    // A real answer in a normal V6 mode must NOT change en27.ko (Q2: no hook).
    const koNormal = await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      window.__v15.choose('ko');
      await sleep(900);
      // Identify the card currently shown (Hangul in .hg) and snapshot it + en27.ko.
      const hg = (document.querySelector('#stage .hg') || {}).textContent;
      const card = window.__v27._test.koCards().find(function(x){ return x.h === hg; });
      if (!card) return { error: 'no current card for hg=' + hg };
      const koBefore = JSON.stringify(window.__v27.en27().ko);
      const boxBefore = card.box, wBefore = card.w || 0;
      const flipBtn = Array.prototype.slice.call(document.querySelectorAll('#stage button')).find(function(b){ return (b.getAttribute('onclick') || '').indexOf('flip()') >= 0; });
      if (flipBtn) flipBtn.click();
      await sleep(400);
      const rateBtn = Array.prototype.slice.call(document.querySelectorAll('#stage button')).find(function(b){ return (b.getAttribute('onclick') || '').indexOf('rate(true)') >= 0; });
      if (!rateBtn) return { error: 'no rate(true) button after flip' };
      rateBtn.click();
      await sleep(400);
      return { cardId: card.id, hg, boxBefore, boxAfter: card.box, wBefore, wAfter: card.w || 0,
               koChanged: JSON.stringify(window.__v27.en27().ko) !== koBefore };
    })()`, true);
    check('normal V6 flashcard answer updates the card box (real answer happened)', koNormal.boxAfter === koNormal.boxBefore + 1, koNormal);
    check('normal V6 answer does NOT touch en27.ko (Q2 limit, documented)', koNormal.koChanged === false, koNormal);
    await checkErrs(c, '§7 no JS errors during KO derive checks');

    // ---------- §8 150 KB prune guard ----------
    section('§8 150 KB prune guard (synthetic heavy en27)');
    await freshLoad(c, 390, 844);
    await markErrs(c);
    const prune = await c.eval(`(function(){
      const d = window.__v27.en27();
      const now = Date.now();
      let threw = false, sizeBefore = 0, sizeAfter = 0;
      try {
        // 1,100 entries per map (over the 1,000 cap), long KO ids to push size up.
        for (let i = 0; i < 1100; i++) {
          const enId = 'w' + (9000 + i);
          d.en.last[enId] = now - i * 1000;
          d.en.cw[enId] = 1; d.en.cr[enId] = 2;
          const koId = 'ko-heavy-test-card-' + String(100000 + i);
          d.ko.last[koId] = now - i * 1000;
          d.ko.right[koId] = 3; d.ko.wrong[koId] = 1; d.ko.cw[koId] = 1; d.ko.cr[koId] = 2;
        }
        for (let s = 0; s < 35; s++) d.sessions.unshift({ t: now - s * 1000, lang: 'en', total: 5, correct: 4, wrong: 1, xp: 40, mins: 2, weakFixed: 1, words: ['w1'] });
        for (let dd = 0; dd < 100; dd++) d.days[String(20000 + dd)] = { c: 5, t: 6, xp: 50, mins: 3 };
        sizeBefore = JSON.stringify(d).length;
        window.__v27.recordAnswer('en', 'w0', true, 'flash');
        sizeAfter = JSON.stringify(d).length;
      } catch (e) { threw = true; }
      const counts = {
        enLast: Object.keys(d.en.last).length, enCw: Object.keys(d.en.cw).length, enCr: Object.keys(d.en.cr).length,
        koLast: Object.keys(d.ko.last).length, koRight: Object.keys(d.ko.right).length, koWrong: Object.keys(d.ko.wrong).length,
        sessions: d.sessions.length, days: Object.keys(d.days).length, sizeBefore, sizeAfter };
      return { threw, counts };
    })()`, true);
    check('prune: recordAnswer does not throw on a heavy en27', prune.threw === false, prune);
    check('prune: every per-word map capped at <=1000 entries', prune.counts.enLast <= 1000 && prune.counts.enCw <= 1000 && prune.counts.enCr <= 1000 && prune.counts.koLast <= 1000 && prune.counts.koRight <= 1000 && prune.counts.koWrong <= 1000, prune.counts);
    check('prune: sessions capped at 30, days capped at 90', prune.counts.sessions <= 30 && prune.counts.days <= 90, prune.counts);
    check('prune: JSON size shrinks (was over 150 KB)', prune.counts.sizeBefore > 150 * 1024 && prune.counts.sizeAfter < prune.counts.sizeBefore, prune.counts);
    // save() still succeeds after pruning.
    await flushSave(c);
    const saveOk = await c.eval(`(function(){
      try {
        const raw = localStorage.getItem('hanvocab.v1');
        const S = JSON.parse(raw);
        return { ok: !!S.v7.en27, size: JSON.stringify(S.v7.en27).length, hasW0: !!S.v7.en27.en.last['w0'] };
      } catch (e) { return { ok: false, err: String(e) }; }
    })()`, true);
    check('prune: save succeeds and en27 round-trips through localStorage', saveOk.ok === true && saveOk.hasW0 === true, saveOk);
    await checkErrs(c, '§8 no JS errors during prune checks');

    // ---------- §9 the 12 user-spec situations ----------
    section('§9 the 12 situations from the user spec §12');
    // (1) New player, no history — honest empty states, no invented numbers.
    await freshLoad(c, 390, 844);
    await markErrs(c);
    await c.eval(`window.__v27.openSmart('en')`);
    await sleep(800);
    const j1en = await c.eval(`(function(){ const t = document.querySelector('#v27body').innerText; return { noData: (t.match(/chưa có dữ liệu/g) || []).length, learned: (t.match(/0\\/4409/) || []).length, suggest: t.indexOf('Chưa có dữ liệu') >= 0 }; })()`, true);
    check('J1 new player EN: "chưa có dữ liệu" cells, 0/4409 learned, no invented numbers', j1en.noData >= 2 && j1en.learned >= 1, j1en);
    await c.eval(`window.__v27.setLang('ko')`);
    await sleep(700);
    const j1ko = await c.eval(`(function(){ const t = document.querySelector('#v27body').innerText; return { noData: (t.match(/chưa có dữ liệu/g) || []).length, learned: (t.match(/0\\/20/) || []).length }; })()`, true);
    check('J1 new player KO: "chưa có dữ liệu" cells, 0/20 learned', j1ko.noData >= 2 && j1ko.learned >= 1, j1ko);
    await c.eval(`window.__v27.closeSmart()`);
    // (2) 100 words studied.
    const spec100 = [];
    for (let i = 100; i < 200; i++) spec100.push({ i, box: 1, right: 1, wrong: 0, due: 'future' });
    await c.eval(seedENJS(spec100));
    await c.eval(`window.__v27.openSmart('en')`);
    await sleep(800);
    const j2 = await c.eval(`(document.querySelector('#v27body').innerText.match(/100\\/4409/) || []).length`, true);
    check('J2 100 words studied: dashboard shows 100/4409 learned', j2 >= 1, j2);
    await c.eval(`window.__v27.closeSmart()`);
    // (3) Repeated wrong + (4) repeated right.
    await c.eval(seedENJS([
      { i: 200, box: 1, right: 1, wrong: 5, due: 'past', xpAt: 'old' },
      { i: 201, box: 5, right: 10, wrong: 0, due: 'future', last: null },
    ]));
    const j34 = await c.eval(`(function(){
      const w3 = window.__v15.words[200], w4 = window.__v15.words[201];
      const c3 = window.__v27.classifyEN(w3), c4 = window.__v27.classifyEN(w4);
      return { weak: c3.cls, mastered: c4.cls };
    })()`, true);
    check('J3 repeated wrong (1 right / 5 wrong) -> WEAK', j34.weak === 'WEAK', j34);
    check('J4 repeated right (10 right / 0 wrong, box 5) -> MASTERED', j34.mastered === 'MASTERED', j34);
    const j3plan = await c.eval(`(async () => { const r = await window.__v27.buildPlan('en', 10); return { first: r.plan.ids[0], target: window.__v15.words[200].id, n: r.plan.ids.length }; })()`, true);
    check('J3 repeated-wrong word is first in the plan', j3plan.first === j3plan.target, j3plan);
    // (5) 7-day absence: 15 overdue + 5 weak, capped plan from highest priority.
    await freshLoad(c, 390, 844);
    const spec5 = [];
    for (let i = 210; i < 225; i++) spec5.push({ i, box: 1, right: 1, wrong: 0, due: Date.now() - 7 * 864e5 });
    for (let i = 225; i < 230; i++) spec5.push({ i, box: 1, right: 1, wrong: 4, due: Date.now() - 7 * 864e5 });
    await c.eval(seedENJS(spec5));
    const j5 = await c.eval(`(async () => {
      const r = await window.__v27.buildPlan('en', 10);
      const weakIds = [225, 226, 227, 228, 229].map(function(i){ return window.__v15.words[i].id; });
      const firstFiveWeak = r.plan.ids.slice(0, 5).every(function(id){ return weakIds.indexOf(id) >= 0; });
      window.__v27.openSmart('en');
      await new Promise(rr => setTimeout(rr, 600));
      const stats = Array.prototype.slice.call(document.querySelectorAll('#v27body .v27stat')).map(function(s){ return s.innerText.replace(/\\n/g, ' '); });
      const dueStat = stats.find(function(s){ return s.indexOf('cần ôn') >= 0; });
      return { planN: r.plan.ids.length, firstFiveWeak, dueStat };
    })()`, true);
    check('J5 7-day absence: plan capped at 20, weak-first order', j5.planN === 20 && j5.firstFiveWeak === true, j5);
    check('J5 7-day absence: dashboard shows the true 20-word backlog', /20/.test(j5.dueStat || ''), j5);
    await c.eval(`window.__v27.closeSmart()`);
    // (6) Plan completed: completion message + suggest new words, no fake data.
    await freshLoad(c, 390, 844);
    await c.eval(DRIVER);
    await c.eval(`window.__v27.openSmart('en'); window.__v27.startPlan('en')`);
    await sleep(1000);
    const j6run = await c.eval(`window.__t27drive({ wrongAt: [], maxQ: 30 })`, true);
    check('J6 plan session completes', j6run.done === true, j6run.error);
    // Goals live on the PLAN tab (renderPlan), not the dashboard.
    await c.eval(`window.__v27.openSmart('en'); window.__v27.setTab('plan')`);
    await sleep(700);
    const j6plan = await c.eval(`(function(){ const t = document.querySelector('#v27body').innerText; return { goalDone: /✓[\\s\\S]{0,40}Hoàn thành kế hoạch hôm nay/.test(t) }; })()`, true);
    await c.eval(`window.__v27.setTab('dash')`);
    await sleep(700);
    const j6 = await c.eval(`(function(){ const t = document.querySelector('#v27body').innerText; return { suggestNew: t.indexOf('học từ mới') >= 0 }; })()`, true);
    check('J6 plan-tab goal "Hoàn thành kế hoạch" checked after completion', j6plan.goalDone === true, j6plan);
    check('J6 dashboard suggests new words when nothing is due/weak', j6.suggestNew === true, j6);
    check('J6 summary numbers are real (correct count matches answers)', j6run.done && new RegExp(j6run.answers.filter(a => a.ok).length + '/' + j6run.answers.length).test(j6run.summary || ''), (j6run.summary || '').slice(0, 200));
    await c.eval(`window.__v27.closeSmart()`);
    // (7) Offline: game keeps working with the network blocked (CDP).
    await freshLoad(c, 390, 844);
    await c.eval(DRIVER);
    await markErrs(c);
    await c.send('Network.enable', {});
    await c.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await sleep(600);
    const offState = await c.eval(`({ onLine: navigator.onLine })`, true);
    await c.eval(`window.__v27.openSmart('en')`);
    await sleep(800);
    const offBanner = await c.eval(`(function(){ const n = document.querySelector('#v27offline'); return n ? getComputedStyle(n).display : 'missing'; })()`, true);
    await c.eval(`window.__v27.startPlan('en')`);
    await sleep(1000);
    const offRun = await c.eval(`window.__t27drive({ wrongAt: [], stopAfter: 1, maxQ: 5 })`, true);
    check('J7 offline: navigator.onLine is false under CDP offline', offState.onLine === false, offState);
    check('J7 offline: offline banner shows in the overlay', offBanner === 'block', offBanner);
    check('J7 offline: a Smart question still answers and records', offRun.stopped === true && offRun.answers.length === 1 && offRun.answers[0].xpDelta === offRun.answers[0].xpExpected, offRun);
    await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await c.send('Network.disable', {});
    await c.eval(`window.__v27.endEarly(); window.__v27.closeSmart()`);
    await checkErrs(c, 'J7 no JS errors while offline');
    // (8) Reload: en27 persists across reload.
    await freshLoad(c, 390, 844);
    const j8a = await c.eval(`(function(){
      const d = window.__v27.en27();
      window.__v27.recordAnswer('en', 'w123', false, 'flash');
      window.__v27.recordAnswer('en', 'w123', false, 'flash');
      window.__v27.recordAnswer('en', 'w124', true, 'mc');
      d.streak.en = { d: new Date().toDateString(), n: 3 };
      return { cw: d.en.cw['w123'], cr: d.en.cr['w124'], streak: d.streak.en.n };
    })()`, true);
    await flushSave(c);
    await c.eval(`location.reload()`);
    await sleep(1800);
    const j8b = await c.eval(`(function(){
      const d = window.__v27.en27();
      return { cw: d.en.cw['w123'], cr: d.en.cr['w124'], streak: d.streak.en.n, last: !!d.en.last['w123'] };
    })()`, true);
    check('J8 en27 persists across reload (cw/cr/streak/last)', j8a.cw === 2 && j8b.cw === 2 && j8b.cr === 1 && j8b.streak === 3 && j8b.last === true, { before: j8a, after: j8b });
    // (9) Two-device sync, DIFFERENT progress — merge behaviour, Q1 branch ABSENT.
    const j9 = await c.eval(`(function(){
      const base = JSON.parse(localStorage.getItem('hanvocab.v1'));
      const localS = JSON.parse(JSON.stringify(base));
      const cloudS = JSON.parse(JSON.stringify(base));
      localS.v7 = localS.v7 || {}; cloudS.v7 = cloudS.v7 || {};
      localS.v7.en27 = localS.v7.en27 || { v: 1, en: { last: {}, cw: {}, cr: {} }, ko: { right: {}, wrong: {}, cw: {}, cr: {}, last: {} } };
      cloudS.v7.en27 = cloudS.v7.en27 || { v: 1, en: { last: {}, cw: {}, cr: {} }, ko: { right: {}, wrong: {}, cw: {}, cr: {}, last: {} } };
      localS.v7.en27.en.cw = { wA: 2 }; localS.v7.en27.en.last = { wA: 1000 };
      cloudS.v7.en27.en.cw = { wB: 3 }; cloudS.v7.en27.en.last = { wB: 2000 };
      localS.xp = 100; cloudS.xp = 200;
      const localBefore = JSON.stringify(localS.v7.en27);
      const merged = window.__v20sync.mergeSaves(localS, cloudS, 1000, 2000);
      return {
        mergedCw: merged.v7.en27.en.cw,
        mergedLast: merged.v7.en27.en.last,
        mergedXp: merged.xp,
        localUnchanged: JSON.stringify(localS.v7.en27) === localBefore,
        hasWA: !!merged.v7.en27.en.cw['wA'],
        hasWB: !!merged.v7.en27.en.cw['wB'],
      };
    })()`, true);
    check('J9 merge keeps the NEWER device whole en27 (last-write-wins, Q1 absent)', j9.hasWB === true && j9.hasWA === false && j9.mergedCw['wB'] === 3, j9);
    check('J9 merge does not mutate its inputs', j9.localUnchanged === true, j9);
    check('J9 merge still takes MAX xp (200)', j9.mergedXp === 200, j9);
    // (10) Old save pre-V16: en27 lazy-creates with full defaults, old SRS intact.
    await freshLoad(c, 390, 844);
    const j10pre = await c.eval(`(function(){
      const raw = JSON.parse(localStorage.getItem('hanvocab.v1'));
      return { en27absent: raw.v7.en27 === undefined };
    })()`, true);
    check('J10 fresh/old save has NO en27 before Smart is opened (lazy creation)', j10pre.en27absent === true, j10pre);
    // Seed WITHOUT touching en27 (plain seedENJS calls en27() and would create it).
    await c.eval(seedENJSNo27([{ i: 90, box: 3, right: 5, wrong: 1, due: 'future', xpAt: 'old' }]));
    await flushSave(c);
    await c.eval(`location.reload()`);
    await sleep(1800);
    const j10 = await c.eval(`(function(){
      const raw = JSON.parse(localStorage.getItem('hanvocab.v1'));
      const storedNoEn27 = raw.v7.en27 === undefined;
      const w = window.__v15.words[90];
      const old = window.__v15.enOld();
      const srsIntact = old.box[w.id] === 3 && old.right[w.id] === 5 && old.wrong[w.id] === 1;
      const xpIntact = raw.xp === 12500;
      window.__v27.openSmart('en');
      const d = window.__v27.en27();
      const defaults = d.v === 1 && Array.isArray(d.sessions) && d.sessions.length === 0 &&
        typeof d.days === 'object' && d.plan.en.mins === 10 && d.plan.en.newN === 5 &&
        d.plan.en.dueN === 10 && d.plan.en.weakN === 5 && d.uiLang === 'en';
      return { storedNoEn27, srsIntact, xpIntact, defaults };
    })()`, true);
    check('J10 stored save still has no en27 after reload (no pre-creation)', j10.storedNoEn27 === true, j10);
    check('J10 old SRS intact after reload (box/right/wrong)', j10.srsIntact === true, j10);
    check('J10 XP intact (12500)', j10.xpIntact === true, j10);
    check('J10 en27 lazy-creates with full defaults on first open', j10.defaults === true, j10);
    await c.eval(`window.__v27.closeSmart()`);
    // (11) Fast/double clicks — covered in §5; restate the measured result here.
    check('J11 double-click guard (measured in §5: one record per double answer)', dbl.rightDelta === 1 && dbl.crDelta === 1, dbl);
    // (12) Mobile 360/390/430 — overlay geometry, targets, contrast, screenshots.
    section('§9 (12) mobile overlay geometry + contrast');
    const CONTRAST = `
window.__t27contrast = function(){
  const parse = s => { const m = String(s).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const effBg = el => { let n = el; while (n) { const bg = parse(getComputedStyle(n).backgroundColor); if (bg && bg.a > 0) return bg; n = n.parentElement; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const blend = (fg, bg) => { const a = fg.a; return { r: Math.round(fg.r * a + bg.r * (1 - a)), g: Math.round(fg.g * a + bg.g * (1 - a)), b: Math.round(fg.b * a + bg.b * (1 - a)) }; };
  const bad = []; let checked = 0;
  document.querySelectorAll('#v27hub *').forEach(function(el){
    const hasText = Array.prototype.slice.call(el.childNodes).some(function(n){ return n.nodeType === 3 && n.textContent.trim().length > 0; });
    if (!hasText) return;
    const cs = getComputedStyle(el); const fg = parse(cs.color); if (!fg) return;
    const bg = effBg(el); const f2 = blend(fg, bg);
    const L1 = lum(f2), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const min = large ? 3 : 4.5;
    checked++;
    if (ratio < min) bad.push({ el: el.tagName + '.' + String(el.className || '').slice(0, 30), text: (el.textContent || '').trim().slice(0, 30), ratio: Math.round(ratio * 100) / 100, min: min });
  });
  return { checked: checked, bad: bad.slice(0, 8) };
};
window.__t27geom = function(){
  const vw = window.innerWidth;
  const wide = [];
  document.querySelectorAll('#v27hub *').forEach(function(el){
    const r = el.getBoundingClientRect();
    if (r.width > vw + 1) wide.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 30), w: Math.round(r.width) });
  });
  const small = [];
  document.querySelectorAll('#v27hub button, #v27hub input, #v27hub select').forEach(function(el){
    if (el.offsetParent === null && el.getClientRects().length === 0) return;
    const r = el.getBoundingClientRect();
    if (r.height < 44) small.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 30), h: Math.round(r.height) });
  });
  return { vw: vw, docScrollW: document.documentElement.scrollWidth, overflowX: document.documentElement.scrollWidth > vw + 1, wide: wide.slice(0, 6), small: small.slice(0, 8) };
};
`;
    for (const [w, tab, shotName] of [[390, 'dash', 'v27-dash-390.png'], [390, 'weak', 'v27-weak-390.png'], [390, 'plan', 'v27-plan-390.png'], [360, 'dash', 'v27-dash-360.png']]) {
      await freshLoad(c, w, 844);
      await c.eval(CONTRAST);
      await c.eval(`window.__v27.openSmart('en'); window.__v27.setTab('${tab}')`);
      await sleep(900);
      const g = await c.eval(`window.__t27geom()`, true);
      check(`[${w} ${tab}] overlay: no horizontal scroll`, g.overflowX === false, g);
      check(`[${w} ${tab}] overlay: no element wider than viewport`, g.wide.length === 0, g.wide);
      check(`[${w} ${tab}] overlay: all buttons/inputs >=44px tall`, g.small.length === 0, g.small);
      const cx = await c.eval(`window.__t27contrast()`, true);
      check(`[${w} ${tab}] overlay: WCAG AA contrast (0 violations, ${cx.checked} texts checked)`, cx.bad.length === 0, cx.bad);
      await shot(c, path.join(SHOTS, shotName), false);
      await c.eval(`window.__v27.closeSmart()`);
    }
    // 430px: geometry only (screenshots above cover 390/360).
    await freshLoad(c, 430, 932);
    await c.eval(CONTRAST);
    await c.eval(`window.__v27.openSmart('en'); window.__v27.setTab('dash')`);
    await sleep(900);
    const g430 = await c.eval(`window.__t27geom()`, true);
    check('[430 dash] overlay: no horizontal scroll', g430.overflowX === false, g430);
    check('[430 dash] overlay: no element wider than viewport', g430.wide.length === 0, g430.wide);
    check('[430 dash] overlay: all buttons/inputs >=44px tall', g430.small.length === 0, g430.small);
    const cx430 = await c.eval(`window.__t27contrast()`, true);
    check('[430 dash] overlay: WCAG AA contrast (0 violations)', cx430.bad.length === 0, cx430.bad);
    await c.eval(`window.__v27.closeSmart()`);
    await checkErrs(c, '§9 no JS errors during situation checks');

    // ---------- §10 regression (spot) ----------
    section('§10 regression (spot): hubs, library, boss fights, pets, Korean tabs');
    await freshLoad(c, 390, 844);
    await markErrs(c);
    const integ = await c.eval(`(function(){ const S = JSON.parse(localStorage.getItem('hanvocab.v1')); return { xp: S.xp, gems: S.v7.gems, ach: Object.keys(S.v7.ach || {}) }; })()`, true);
    // Seeded XP 12500 = Lv 126: the pre-existing V7 achievement check unlocks
    // a4 'Cấp 5' + a5 'Cấp 10' (+3 gems each) on the first load, once only.
    check('regression: save intact after fresh load (XP 12500, gems 42+6 achievements, a4+a5 claimed)', integ.xp === 12500 && integ.gems === 48 && integ.ach.indexOf('a4') >= 0 && integ.ach.indexOf('a5') >= 0, integ);
    const hub = await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      window.__v15.openHub('learn');
      await sleep(700);
      const hubOpen = !!document.querySelector('.v15hub') && getComputedStyle(document.querySelector('.v15hub')).display !== 'none';
      const modes = document.querySelectorAll('.v15mode').length;
      window.__v15.openHub('library');
      await sleep(900);
      const libText = (document.querySelector('#v15hub') || {}).innerText || '';
      const libOk = libText.indexOf('Oxford') >= 0 || libText.indexOf('Thư viện') >= 0;
      return { hubOpen, modes, libOk };
    })()`, true);
    check('regression: EN Hub opens with 10 modes', hub.hubOpen === true && hub.modes === 10, hub);
    check('regression: Library renders (Oxford/Thư viện)', hub.libOk === true, hub);
    const boss18 = await c.eval(`(async () => {
      window.__v15.openHub(); window.__v15.tab('bosses');
      window.__v18._test.fight('v10_slime');
      await new Promise(r => setTimeout(r, 600));
      const vis = !!document.querySelector('#v18fight .v18fight');
      window.__v18._test.pickCorrect();
      await new Promise(r => setTimeout(r, 300));
      window.__v18._test.close();
      return { vis };
    })()`, true);
    check('regression: V18 boss fight still works', boss18.vis === true, boss18);
    const boss19 = await c.eval(`(async () => {
      window.__v19.openMapFor('en');
      await new Promise(r => setTimeout(r, 600));
      const zones = document.querySelectorAll('.v19zone').length;
      window.__v19._test.fight('v11_fireking');
      await new Promise(r => setTimeout(r, 600));
      const vis = !!document.querySelector('#v19fight .v19fight');
      window.__v19._test.close();
      return { zones, vis };
    })()`, true);
    check('regression: V19 Boss Map has 10 zones and fight works', boss19.zones === 10 && boss19.vis === true, boss19);
    const pets = await c.eval(`(async () => {
      window.__v23.openHub('pets');
      await new Promise(r => setTimeout(r, 700));
      const vis = !!document.querySelector('#v23hub') && getComputedStyle(document.querySelector('#v23hub')).display !== 'none';
      const tabs = document.querySelectorAll('.v23tab').length;
      const x = document.querySelector('.v23x'); if (x) x.click();
      return { vis, tabs };
    })()`, true);
    check('regression: Pet Hub opens with 7 tabs', pets.vis === true && pets.tabs === 7, pets);
    const koReg = await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      window.__v15.choose('ko');
      await sleep(900);
      const count = () => ({ b19: document.querySelectorAll('.v19kotab').length, b23: document.querySelectorAll('.v23kotab').length, b27: document.querySelectorAll('.v27kotab').length });
      const a = count();
      setView('list'); await sleep(600);
      const b = count();
      setView('study'); await sleep(600);
      const cc = count();
      return { a, b, c: cc };
    })()`, true);
    check('regression: Korean Hub has exactly 1 Boss Map + 1 Pet + 1 Smart tab', koReg.a.b19 === 1 && koReg.a.b23 === 1 && koReg.a.b27 === 1, koReg);
    check('regression: tab counts stay 1 after view switches (render() rewrites tabs)', koReg.b.b27 === 1 && koReg.c.b27 === 1 && koReg.b.b19 === 1 && koReg.c.b23 === 1, koReg);
    await checkErrs(c, '§10 no JS errors during regression checks');

    // Final: any JS error stashed across reloads anywhere in the run.
    await stashErrs(c);
    check('no JS errors anywhere in the run (all sections incl. across reloads)', errLog.length === 0, errLog.slice(0, 5));

    console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
    if (failures.length) console.log('failures:', failures.join(' | '));
    process.exitCode = fail ? 1 : 0;
  } finally {
    closeTarget(c);
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
