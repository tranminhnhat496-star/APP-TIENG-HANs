// verify-v38c.js - V18.3 BOSS WORD SETS Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8956 / CDP 9357, scratch profile.
// Modelled on tools/v37/verify-v37c.js (same CDP class, ensureHttp/
// ensureChrome, shot helpers). Exit 0 = driver completed (verdicts are
// in the results JSON + stdout; a FAIL verdict does not crash the driver).
// Writes results to tools/v38/logs/v38c-results.json after EVERY step.
// Gates:
//   V38-A picker shows all 7 libs on the Bosses tab; per-lib sub-picker
//         (19 A1-A2 chips / Oxford 137-option select / 4+4 set chips /
//         24 BT chips) + type/status + pick-all visibility rules.
//   V38-B picker shows all 7 libs on the Boss Map zone view.
//   V38-C fights: Oxford Bai 12 / A1-A2 Education / Chrono Time —
//         apply via real clicks, then the fight word pool must be
//         exactly the picked set (pool == expected set, cur word in).
//   V38-D BT Units 2+5 fight (regression, async BT load).
//   V38-E "Tat ca tu vung" clears the scope; Library Oxford Bai 12
//         round-trips into the picker.
//   V38-F 360px viewport: no horizontal overflow, all controls >=44px.
//   0 console errors/warnings/dialogs across the whole run.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9357;
const HTTPPORT = 8956;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8956/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v38';
const OUTDIR = '/home/hatch/workspace/v7build/out';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
function note(...a) { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); }
function writeSmall(p, data) {
  try {
    const buf = Buffer.from(data, 'utf-8');
    const fd = fs.openSync(p, 'w');
    let off = 0;
    while (off < buf.length) { off += fs.writeSync(fd, buf, off, Math.min(512, buf.length - off)); }
    fs.closeSync(fd);
    return true;
  } catch (e) { console.log('write failed (EPERM wave?):', p, String(e).slice(0, 120)); return false; }
}
function saveResults() { writeSmall(path.join(DIR, 'logs', 'v38c-results.json'), JSON.stringify(results, null, 2)); }
let chromeProc = null;
let httpProc = null;
async function ensureHttp() {
  try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {}
  httpProc = spawn('python3', ['-m', 'http.server', String(HTTPPORT), '--directory', OUTDIR], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500);
    try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {} }
  throw new Error('http server did not start on ' + HTTPPORT);
}
async function ensureChrome() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {}
  try { if (fs.readFileSync(POLICY, 'utf-8') !== 'hatch-webgl-all-origins-v1\n') fs.writeFileSync(POLICY, 'hatch-webgl-all-origins-v1\n'); }
  catch (e) { fs.writeFileSync(POLICY, 'hatch-webgl-all-origins-v1\n'); }
  const sha = execSync(`sha256sum ${POLICY} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
  const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
    '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
    '--user-data-dir=/tmp/chrome-v38c-prof', `--remote-debugging-port=${PORT}`,
    '--window-size=390,844', 'about:blank'];
  chromeProc = spawn(CHROME, args, { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { await sleep(500);
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {} }
  throw new Error('chrome did not start');
}
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map(); this.events = [];
    this.dialogs = []; this.consoleErrors = []; this.consoleWarns = [];
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) { const { res, rej } = this.pending.get(d.id); this.pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); }
      else if (d.method) {
        this.events.push(d);
        if (d.method === 'Page.javascriptDialogOpening') {
          this.dialogs.push({ type: d.params.type, message: d.params.message, at: Date.now() });
          this.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
        }
        if (d.method === 'Runtime.exceptionThrown') this.consoleErrors.push(JSON.stringify(d.params.exceptionDetails).slice(0, 600));
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') this.consoleErrors.push(JSON.stringify(d.params.args).slice(0, 600));
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'warning') this.consoleWarns.push(JSON.stringify(d.params.args).slice(0, 300));
      }
    };
  }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr, awaitPromise = false) {
    const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page eval error: ' + JSON.stringify(r.exceptionDetails).slice(0, 800));
    return r.result ? r.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (e) {} }
}
let C = null;
async function openPage() {
  await ensureHttp();
  await ensureChrome();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  let t = list.find(x => x.type === 'page');
  C = new CDP(t.webSocketDebuggerUrl);
  await C.ready;
  await C.send('Page.enable'); await C.send('Runtime.enable');
  await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await C.eval(`location.href = ${JSON.stringify(URL)}`);
  // Poll until the game page is really loaded (a fixed sleep raced with
  // first-run profile creation: localStorage on about:blank throws
  // SecurityError "Access is denied for this document").
  await waitLoaded();
  // V36 precedent (freshSeed): seed a guest session so the V21 welcome
  // overlay does not cover the hub in screenshots. Without this the DOM
  // verdicts are still valid, but every screenshot shows the login
  // screen instead of the hub/mode/fight under test.
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await C.eval('location.reload()');
  await sleep(2500);
  return C;
}
async function waitLoaded(timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 15000)) {
    await sleep(500);
    try {
      const st = await C.eval(`(function(){ return {href: location.href, rs: document.readyState}; })()`);
      if (st && st.href && st.href.indexOf('chrome-error') === 0) { results.waitLoadedErrorPage = st; }
      if (st && st.href && st.href.indexOf('127.0.0.1:8956') >= 0 && st.rs === 'complete') return true;
    } catch (e) {}
  }
  return false;
}
async function shot(name) {
  try {
    const r = await C.send('Page.captureScreenshot', { format: 'png' });
    if (r.data) fs.writeFileSync(path.join(DIR, 'shots', name + '.png'), Buffer.from(r.data, 'base64'));
  } catch (e) { note('shot failed', name, String(e).slice(0, 120)); }
}
async function step(name, fn) {
  note(`\n== ${name} ==`);
  try {
    const r = await fn();
    results[name] = r;
    note(`PASS ${name} —`, JSON.stringify(r).slice(0, 600));
  } catch (e) {
    results[name] = { error: String(e).slice(0, 600) };
    note(`FAIL ${name} —`, String(e).slice(0, 600));
  }
  saveResults();
}
function verdict(name, cond, detail) {
  note((cond ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  return cond;
}

// verify-v38c main body — gates V38-A..F (assembled with the
// verify-v37c.js CDP harness: CDP class, ensureHttp/ensureChrome,
// openPage, shot, step, verdict, saveResults).
async function main() {
  try {
    await openPage();
    const boot = await C.eval(`(function(){ return { v15: !!window.__v15, v17: !!window.__v17, v22: !!window.__v22, v27: !!window.__v27, v38: !!window.__v38, v38ver: window.__v38 && window.__v38.version, title: document.title, scopeName22Fn: typeof (window.__v22 && window.__v22.scopeName22), bossLibChangeFn: typeof (window.__v22 && window.__v22.bossLibChange) }; })()`);
    note('boot:', boot);
    results.boot = boot;
    saveResults();
    const err0 = C.consoleErrors.length, warn0 = C.consoleWarns.length, dlg0 = C.dialogs.length;
    const delta = (r) => ({ errors: C.consoleErrors.length - err0, warns: C.consoleWarns.length - warn0, dialogs: C.dialogs.length - dlg0 });

    // Helper: open the Bosses tab arena view (picker lives there).
    async function openArenaEn() {
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('bosses'); window.__v18.openArena('en'); }catch(e){} })()`);
      await sleep(900);
    }
    // Helper: pick a lib in the live picker (real change event) and read
    // the picker's current DOM state.
    async function pickLib(lib) {
      return C.eval(`(function(){
        var sel=document.querySelector('#v22bs-lib'); if(!sel) return {ok:false, why:'no #v22bs-lib'};
        sel.value=${JSON.stringify(lib)};
        sel.dispatchEvent(new Event('change', {bubbles:true}));
        return {ok:true};
      })()`);
    }
    async function pickerState() {
      return C.eval(`(function(){
        var lib=document.querySelector('#v22bs-lib');
        var sub=document.querySelector('#v22bs-sub');
        var ts=document.querySelector('#v22bs-ts');
        var pa=document.querySelector('#v22bs-pickall');
        var cur=document.querySelector('#v22bs-current');
        var chips=Array.prototype.slice.call(document.querySelectorAll('#v22bs-chips .v15pill'));
        var topicChips=document.querySelectorAll('#v22bs-chips [data-t]').length;
        var setChips=document.querySelectorAll('#v22bs-chips [data-s]').length;
        var lesson=document.querySelector('#v22bs-lesson');
        var scope=null; try{ scope=window.__v15.en15().scope; }catch(e){}
        return {
          libValue: lib?lib.value:null,
          libOptions: lib?Array.prototype.slice.call(lib.options).map(function(o){ return {v:o.value, t:o.textContent, sel:o.selected}; }):null,
          subHasLessonSelect: !!lesson,
          lessonOptions: lesson?lesson.options.length:null,
          lessonValue: lesson?lesson.value:null,
          chips: chips.length,
          topicChips: topicChips,
          setChips: setChips,
          chipOn: chips.filter(function(c){ return c.classList.contains('on'); }).map(function(c){ return c.getAttribute('data-t')||c.getAttribute('data-s')||c.getAttribute('data-u'); }),
          tsVisible: ts?ts.style.display!=='none':null,
          paVisible: pa?pa.style.display!=='none':null,
          current: cur?(cur.textContent||'').trim():null,
          scope: scope
        };
      })()`);
    }
    // Helper: click the picker's Áp dụng button (real click) and wait
    // for the scope to settle (BT applies are async via ensureData).
    async function clickApplyAndWait(expectScope, timeoutMs) {
      await C.eval(`(function(){ var btns=document.querySelectorAll('.v22bscope .btn.pri'); for(var i=0;i<btns.length;i++){ if((btns[i].textContent||'').indexOf('Áp dụng')>=0){ btns[i].click(); return true; } } return false; })()`);
      const t0 = Date.now();
      while (Date.now() - t0 < (timeoutMs || 6000)) {
        const sc = await C.eval(`(function(){ try{ return window.__v15.en15().scope; }catch(e){ return 'ERR'; } })()`);
        if (JSON.stringify(sc) === JSON.stringify(expectScope)) return { ok: true, scope: sc };
        await sleep(200);
      }
      const sc = await C.eval(`(function(){ try{ return window.__v15.en15().scope; }catch(e){ return 'ERR'; } })()`);
      return { ok: false, scope: sc, expected: expectScope };
    }
    // Helper: start a v10_slime EN fight and check the word pool.
    async function fightPoolCheck(expectScope) {
      const r = {};
      r.started = await C.eval(`(function(){
        try{
          var all=window.__v18.bosses;
          var list=((all.en||[]).concat(all.el||[],all.leg||[],all.old||[]));
          var b=list.filter(function(x){ return x.id==='v10_slime'; })[0];
          if(!b) return {ok:false, why:'no v10_slime'};
          if(!window.__v18.bossUnlocked(b)) return {ok:false, why:'v10_slime locked'};
          window.__v18.fight('v10_slime','en');
          return {ok:true, mode:b.mode};
        }catch(e){ return {ok:false, err:String(e)} }
      })()`);
      await sleep(1200);
      r.pool = await C.eval(`(function(){
        try{
          var F=window.__v18._test.F();
          if(!F) return {ok:false, why:'no F'};
          if(!F.pools||!F.pools.words) return {ok:false, why:'no pools.words'};
          var exp=window.__v15.wordsFiltered({scope:${JSON.stringify(expectScope)},level:'ALL'});
          var expIds={}; exp.forEach(function(w){ expIds[w.id]=1; });
          var pool=F.pools.words;
          var inPool=pool.filter(function(w){ return expIds[w.id]; }).length;
          var cur=F.cur&&F.cur.w?F.cur.w:null;
          var qEl=document.querySelector('#v18fight .v18qword');
          return {ok:true, poolLen:pool.length, expectedLen:exp.length, inPool:inPool,
            allIn: inPool===pool.length, poolEqExpected: pool.length===exp.length,
            curId: cur?cur.id:null, curEn: cur?cur.en:null, curIn: !!(cur&&expIds[cur.id]),
            qwordText: qEl?(qEl.textContent||'').trim():null, qwordMatchesCur: !!(qEl&&cur&&(qEl.textContent||'').trim()===cur.en)};
        }catch(e){ return {ok:false, err:String(e)} }
      })()`);
      await shot('v38c-fight-' + expectScope.lib);
      r.closed = await C.eval(`(function(){ try{ window.__v18.close(); return true; }catch(e){ return String(e); } })()`);
      await sleep(400);
      return r;
    }
    async function clearScope() {
      await C.eval(`(function(){ try{ window.__v15.clearScope(); }catch(e){} })()`);
      await sleep(400);
    }

    // ============ V38-A — picker shows all sets on the Bosses tab ============
    await step('V38-A-picker-all-sets', async () => {
      const r = {};
      await clearScope();
      await openArenaEn();
      r.picker = await pickerState();
      r.libValues = (r.picker.libOptions || []).map(o => o.v);
      r.all7 = JSON.stringify(r.libValues) === JSON.stringify(['', 'a1a2', 'oxford', 'chrono', 'skyroot', 'all', 'units']);
      r.verdictAll7 = verdict('V38-A lib dropdown has all 7 options in order', r.all7, r.libValues);
      await shot('v38a-picker-all');
      // Per-lib sub-pickers (real change events).
      await pickLib('a1a2'); await sleep(400);
      r.a1a2 = await pickerState();
      r.a1a2ok = r.a1a2.topicChips === 19 && r.a1a2.chips === 20 && r.a1a2.tsVisible === false && r.a1a2.paVisible === false;
      r.verdictA1a2 = verdict('V38-A A1–A2: 19 topic chips (+1 Tất cả), type/status + pick-all hidden', r.a1a2ok, { topicChips: r.a1a2.topicChips, chips: r.a1a2.chips, ts: r.a1a2.tsVisible, pa: r.a1a2.paVisible });
      await pickLib('oxford'); await sleep(400);
      r.oxford = await pickerState();
      r.oxfordOk = r.oxford.subHasLessonSelect === true && r.oxford.lessonOptions === 137 && r.oxford.tsVisible === false;
      r.verdictOxford = verdict('V38-A Oxford: lesson <select> with 137 options, type/status hidden', r.oxfordOk, { opts: r.oxford.lessonOptions, ts: r.oxford.tsVisible });
      await shot('v38a-picker-oxford');
      await pickLib('chrono'); await sleep(400);
      r.chrono = await pickerState();
      r.chronoOk = r.chrono.setChips === 4 && r.chrono.chips === 5 && r.chrono.tsVisible === false;
      r.verdictChrono = verdict('V38-A Chrono: 4 set chips (+1 Tất cả), type/status hidden', r.chronoOk, { setChips: r.chrono.setChips, chips: r.chrono.chips });
      await pickLib('skyroot'); await sleep(400);
      r.skyroot = await pickerState();
      r.skyrootOk = r.skyroot.setChips === 4 && r.skyroot.chips === 5 && r.skyroot.tsVisible === false;
      r.verdictSkyroot = verdict('V38-A Skyroot: 4 set chips (+1 Tất cả), type/status hidden', r.skyrootOk, { setChips: r.skyroot.setChips, chips: r.skyroot.chips });
      await pickLib('units'); await sleep(400);
      r.bt = await pickerState();
      r.btOk = r.bt.chips === 24 && r.bt.tsVisible === true && r.bt.paVisible === true;
      r.verdictBt = verdict('V38-A BT units: 24 chips, type/status + pick-all SHOWN', r.btOk, { chips: r.bt.chips, ts: r.bt.tsVisible, pa: r.bt.paVisible });
      await shot('v38a-picker-bt');
      r.delta = delta(r);
      return r;
    });

    // ============ V38-B — picker on the Boss Map zone view ============
    await step('V38-B-picker-on-boss-map', async () => {
      const r = {};
      await clearScope();
      await C.eval(`(function(){ try{ window.__v19.setLang('en'); window.__v19.openMap(); }catch(e){} })()`);
      await sleep(1000);
      await C.eval(`(function(){ try{ window.__v19.zoneDetail('z1'); }catch(e){} })()`);
      await sleep(900);
      r.zone = await C.eval(`(function(){
        var host=document.querySelector('#v19zonedetail');
        if(!host) return {present:false};
        var lib=document.querySelector('#v19zonedetail #v22bs-lib');
        var opts=lib?Array.prototype.slice.call(lib.options).map(function(o){ return o.value; }):null;
        var chips=document.querySelectorAll('#v19zonedetail #v22bs-chips .v15pill').length;
        return {present:true, libOptions:opts, chips:chips, textLen:(host.textContent||'').length};
      })()`);
      r.all7 = r.zone.libOptions && JSON.stringify(r.zone.libOptions) === JSON.stringify(['', 'a1a2', 'oxford', 'chrono', 'skyroot', 'all', 'units']);
      r.verdict = verdict('V38-B Boss Map zone view shows the picker with all 7 libs', r.all7 === true, r.zone);
      await shot('v38b-map');
      await C.eval(`(function(){ try{ window.__v19.zoneClose(); }catch(e){} })()`);
      await sleep(400);
      r.delta = delta(r);
      return r;
    });

    // ============ V38-C — Oxford 12 / A1–A2 topic / Chrono set fights ============
    await step('V38-C-fight-oxford-12', async () => {
      const r = {};
      await clearScope();
      await openArenaEn();
      await pickLib('oxford'); await sleep(400);
      r.picked = await C.eval(`(function(){ var s=document.querySelector('#v22bs-lesson'); if(!s) return {ok:false}; s.value='12'; return {ok:true, v:s.value}; })()`);
      r.applied = await clickApplyAndWait({ kind: 'lib', lib: 'oxford', lesson: 12 });
      r.state = await pickerState();
      r.currentNames = r.state.current && r.state.current.indexOf('Oxford 3000 · Bài 12') >= 0;
      r.verdictApply = verdict('V38-C Oxford Bài 12 applied, "Đang chọn" names it', r.applied.ok === true && r.currentNames, { applied: r.applied, current: r.state.current });
      await shot('v38c-oxford-picked');
      r.fight = await fightPoolCheck({ kind: 'lib', lib: 'oxford', lesson: 12 });
      r.poolOk = r.fight.pool && r.fight.pool.ok === true && r.fight.pool.allIn === true && r.fight.pool.poolEqExpected === true && r.fight.pool.curIn === true && r.fight.pool.qwordMatchesCur === true;
      r.verdictPool = verdict('V38-C fight pool is exactly Oxford lesson 12 (all words in, cur word in, qword matches)', r.poolOk, r.fight.pool);
      await clearScope();
      r.delta = delta(r);
      return r;
    });

    await step('V38-C-fight-a1a2-topic', async () => {
      const r = {};
      await clearScope();
      await openArenaEn();
      await pickLib('a1a2'); await sleep(400);
      r.chipClicked = await C.eval(`(function(){ var c=document.querySelector('#v22bs-chips [data-t="a1_education"]'); if(!c) return false; c.click(); return true; })()`);
      await sleep(300);
      r.applied = await clickApplyAndWait({ kind: 'lib', lib: 'a1a2', topic: 'a1_education' });
      r.state = await pickerState();
      r.topicName = await C.eval(`window.__v17.topicName('a1_education')`);
      r.currentNames = r.state.current && r.state.current.indexOf('A1–A2 · ' + r.topicName) >= 0;
      r.verdictApply = verdict('V38-C A1–A2 Education applied, "Đang chọn" names it', r.applied.ok === true && r.chipClicked === true && r.currentNames, { applied: r.applied, current: r.state.current });
      r.fight = await fightPoolCheck({ kind: 'lib', lib: 'a1a2', topic: 'a1_education' });
      r.poolOk = r.fight.pool && r.fight.pool.ok === true && r.fight.pool.allIn === true && r.fight.pool.poolEqExpected === true && r.fight.pool.curIn === true;
      r.verdictPool = verdict('V38-C fight pool is exactly the A1–A2 Education topic', r.poolOk, r.fight.pool);
      await clearScope();
      r.delta = delta(r);
      return r;
    });

    await step('V38-C-fight-chrono-set', async () => {
      const r = {};
      await clearScope();
      await openArenaEn();
      await pickLib('chrono'); await sleep(400);
      r.chipClicked = await C.eval(`(function(){ var c=document.querySelector('#v22bs-chips [data-s="time"]'); if(!c) return false; c.click(); return true; })()`);
      await sleep(300);
      r.applied = await clickApplyAndWait({ kind: 'lib', lib: 'chrono', set: 'time' });
      r.state = await pickerState();
      r.currentNames = r.state.current && r.state.current.indexOf('Chrono · Time') >= 0;
      r.verdictApply = verdict('V38-C Chrono Time applied, "Đang chọn" names it', r.applied.ok === true && r.chipClicked === true && r.currentNames, { applied: r.applied, current: r.state.current });
      r.fight = await fightPoolCheck({ kind: 'lib', lib: 'chrono', set: 'time' });
      r.poolOk = r.fight.pool && r.fight.pool.ok === true && r.fight.pool.allIn === true && r.fight.pool.poolEqExpected === true && r.fight.pool.curIn === true;
      r.verdictPool = verdict('V38-C fight pool is exactly the Chrono Time set', r.poolOk, r.fight.pool);
      await clearScope();
      r.delta = delta(r);
      return r;
    });

    // ============ V38-D — BT Units 2+5 (regression) ============
    await step('V38-D-fight-bt-units-2-5', async () => {
      const r = {};
      await clearScope();
      await openArenaEn();
      await pickLib('units'); await sleep(400);
      r.chipsClicked = await C.eval(`(function(){
        var out={};
        // Start from none selected, then turn on Units 2 and 5 only.
        var all=document.querySelectorAll('#v22bs-chips .v15pill');
        all.forEach(function(c){ if(c.classList.contains('on')) c.click(); });
        var c2=document.querySelector('#v22bs-chips [data-u="2"]');
        var c5=document.querySelector('#v22bs-chips [data-u="5"]');
        if(c2) c2.click(); if(c5) c5.click();
        var on=Array.prototype.slice.call(document.querySelectorAll('#v22bs-chips .v15pill.on')).map(function(c){ return c.getAttribute('data-u'); });
        out.on=on; out.ok=on.length===2&&on.indexOf('2')>=0&&on.indexOf('5')>=0;
        return out;
      })()`);
      r.applied = await clickApplyAndWait({ kind: 'lib', lib: 'bt', unit: [2, 5] }, 10000);
      r.state = await pickerState();
      r.currentNames = r.state.current && r.state.current.indexOf('Basic Tactics · 2 Units') >= 0;
      r.verdictApply = verdict('V38-D BT Units 2+5 applied (async BT load), "Đang chọn" names it', r.applied.ok === true && r.chipsClicked.ok === true && r.currentNames, { applied: r.applied, current: r.state.current, chips: r.chipsClicked });
      r.fight = await fightPoolCheck({ kind: 'lib', lib: 'bt', unit: [2, 5] });
      r.poolOk = r.fight.pool && r.fight.pool.ok === true && r.fight.pool.allIn === true && r.fight.pool.poolEqExpected === true && r.fight.pool.curIn === true;
      r.verdictPool = verdict('V38-D fight pool is exactly BT Units 2+5', r.poolOk, r.fight.pool);
      await clearScope();
      r.delta = delta(r);
      return r;
    });

    // ============ V38-E — clear-all + Library round-trip ============
    await step('V38-E-clear-and-library-roundtrip', async () => {
      const r = {};
      // (d) "Tất cả từ vựng" clears the scope.
      await C.eval(`(function(){ try{ window.__v15.setScope({kind:'lib',lib:'oxford',lesson:12}); }catch(e){} })()`);
      await sleep(300);
      await openArenaEn();
      await pickLib(''); await sleep(400);
      r.cleared = await clickApplyAndWait(null);
      r.stateAfterClear = await pickerState();
      r.clearOk = r.cleared.ok === true && r.stateAfterClear.scope === null && r.stateAfterClear.current && r.stateAfterClear.current.indexOf('Tất cả từ vựng') >= 0;
      r.verdictClear = verdict('V38-E "Tất cả từ vựng" clears the scope', r.clearOk, { cleared: r.cleared, current: r.stateAfterClear.current });
      // (e) Scope set from the Library (Oxford Bài 12) round-trips.
      await C.eval(`(function(){ try{ window.__v17.learnLesson(12); }catch(e){} })()`);
      await sleep(800);
      r.libScope = await C.eval(`(function(){ try{ return window.__v15.en15().scope; }catch(e){ return 'ERR'; } })()`);
      await openArenaEn();
      r.rt = await pickerState();
      r.rtOk = r.rt.libValue === 'oxford' && r.rt.lessonValue === '12' && r.rt.current && r.rt.current.indexOf('Oxford 3000 · Bài 12') >= 0;
      r.verdictRt = verdict('V38-E Library Oxford Bài 12 round-trips into the picker (lib + lesson + name)', r.rtOk, { libScope: r.libScope, picker: { lib: r.rt.libValue, lesson: r.rt.lessonValue, current: r.rt.current } });
      await shot('v38e-roundtrip');
      await clearScope();
      r.delta = delta(r);
      return r;
    });

    // ============ V38-F — 360px viewport, touch targets, overflow ============
    await step('V38-F-360px-mobile', async () => {
      const r = {};
      await C.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
      await C.eval('location.reload()');
      await waitLoaded();
      await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
      await C.eval('location.reload()');
      await waitLoaded();
      await clearScope();
      await openArenaEn();
      r.metrics = await C.eval(`(function(){
        var de=document.documentElement;
        return { scrollW: de.scrollWidth, clientW: de.clientWidth, innerW: window.innerWidth, overflowX: de.scrollWidth > window.innerWidth + 1 };
      })()`);
      r.noOverflow = r.metrics.overflowX === false;
      r.verdictOverflow = verdict('V38-F no horizontal overflow at 360px', r.noOverflow, r.metrics);
      // Measure every picker control at 360px (lib select, lesson select,
      // a sample of chips, type/status selects, Áp dụng button).
      await pickLib('oxford'); await sleep(400);
      r.controlsOxford = await C.eval(`(function(){
        function m(sel){ var el=document.querySelector(sel); if(!el) return null; var rc=el.getBoundingClientRect(); return {h: Math.round(rc.height*10)/10, w: Math.round(rc.width*10)/10}; }
        var chips=Array.prototype.slice.call(document.querySelectorAll('#v22bs-chips .v15pill')).slice(0,3).map(function(c){ var rc=c.getBoundingClientRect(); return Math.round(rc.height*10)/10; });
        return { lib: m('#v22bs-lib'), lesson: m('#v22bs-lesson'), chipsSample: chips, apply: (function(){ var b=null; document.querySelectorAll('.v22bscope .btn.pri').forEach(function(x){ if((x.textContent||'').indexOf('Áp dụng')>=0) b=x; }); if(!b) return null; var rc=b.getBoundingClientRect(); return {h: Math.round(rc.height*10)/10, w: Math.round(rc.width*10)/10}; })() };
      })()`);
      await pickLib('units'); await sleep(400);
      r.controlsBt = await C.eval(`(function(){
        function m(sel){ var el=document.querySelector(sel); if(!el) return null; var rc=el.getBoundingClientRect(); return {h: Math.round(rc.height*10)/10, w: Math.round(rc.width*10)/10}; }
        var chips=Array.prototype.slice.call(document.querySelectorAll('#v22bs-chips .v15pill')).slice(0,3).map(function(c){ var rc=c.getBoundingClientRect(); return Math.round(rc.height*10)/10; });
        return { type: m('#v22bs-type'), status: m('#v22bs-status'), chipsSample: chips };
      })()`);
      function all44(c) {
        if (!c) return false;
        const hs = [];
        if (c.lib) hs.push(c.lib.h);
        if (c.lesson) hs.push(c.lesson.h);
        if (c.apply) hs.push(c.apply.h);
        if (c.type) hs.push(c.type.h);
        if (c.status) hs.push(c.status.h);
        (c.chipsSample || []).forEach(h => hs.push(h));
        return hs.length > 0 && hs.every(h => h >= 44);
      }
      r.oxford44 = all44(r.controlsOxford);
      r.bt44 = all44(r.controlsBt);
      r.verdict44 = verdict('V38-F all picker controls ≥44px at 360px (Oxford + BT)', r.oxford44 && r.bt44, { oxford: r.controlsOxford, bt: r.controlsBt });
      await shot('v38f-360px');
      await clearScope();
      r.delta = delta(r);
      return r;
    });

    results.summary = {
      consoleErrors: C.consoleErrors.length,
      consoleWarns: C.consoleWarns.length,
      dialogs: C.dialogs.length,
    };
    note('\nSUMMARY errors:', C.consoleErrors.length, 'warnings:', C.consoleWarns.length, 'dialogs:', C.dialogs.length);
  } catch (e) {
    note('DRIVER ERROR:', String(e).slice(0, 600));
    results.driverError = String(e).slice(0, 600);
  } finally {
    saveResults();
    try { if (C) C.close(); } catch (e) {}
    try { if (chromeProc) chromeProc.kill(); } catch (e) {}
    try { if (httpProc) httpProc.kill(); } catch (e) {}
  }
  note('done.');
  process.exit(0);
}
main();
