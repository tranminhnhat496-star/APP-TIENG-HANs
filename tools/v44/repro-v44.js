// repro-v44.js - V18.9 repro-first probe on the PRISTINE V18.8 base.
// Serves ONLY ~/workspace/v7build/tools/v44/pristine-v18.8-out/ (HTTP 8976,
// CDP 9376, profile /tmp/chrome-v44repro-prof). NEVER touches out/, src/, data/.
// Read-only probe: no game file is modified. Exit 0 = driver completed;
// verdicts live in logs/r44-results.json + stdout.
// What it proves (before any fix): tapping "Khiêu chiến" on a Legendary
// boss freezes the main thread for many seconds. Measured two ways:
//   (a) in-page performance.now() around the real UI clicks — the
//       "Khiêu chiến" button, then the 🇬🇧 Tiếng Anh language-pick button
//       (the freeze is on the second click: fight start -> nextQ ->
//       wordPool + grammarPool, each calling legDiff() once per item,
//       and legDiff() runs V15().counts(), a full WORDS scan, per call);
//   (b) direct cost of one counts() call and one legDiff() call, so the
//       O(n^2) math (WORDS x counts-scan) is grounded in measured numbers.
// Controls: a Challenge-arena (non-Legendary) fight start must be fast,
// and the "Khiêu chiến" click itself (language pick render) must be fast.
// Also captures the OLD Legendary pool (sorted word + grammar ids) at
// mastered = 0 / 250 / 700 — the reference the fixed build must match
// exactly (same levels, same membership) in test44.js / verify-v44c.js.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9376;
const HTTPPORT = 8976;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8976/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v44/repro';
const SERVE = '/home/hatch/workspace/v7build/tools/v44/pristine-v18.8-out';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
function note(...a) { console.log(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); }
function writeSmall(p, data) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const fd = fs.openSync(p, 'w');
    let off = 0;
    while (off < buf.length) { off += fs.writeSync(fd, buf, off, Math.min(512, buf.length - off)); }
    fs.closeSync(fd);
    return true;
  } catch (e) { note('write failed (EPERM wave?):', p, String(e).slice(0, 120)); return false; }
}
function saveResults() { writeSmall(path.join(DIR, 'logs', 'r44-results.json'), JSON.stringify(results, null, 2)); }
let chromeProc = null, httpProc = null;
async function ensureHttp() {
  try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {}
  httpProc = spawn('python3', ['-m', 'http.server', String(HTTPPORT), '--directory', SERVE], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500);
    try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {} }
  throw new Error('http server did not start on ' + HTTPPORT);
}
async function ensureChrome() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {}
  const sha = execSync(`sha256sum ${POLICY} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
  for (let attempt = 1; attempt <= 3; attempt++) {
    note('chrome start attempt', attempt);
    const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
      '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
      '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
      '--user-data-dir=/tmp/chrome-v44repro-prof', `--remote-debugging-port=${PORT}`,
      '--window-size=1280,800', 'about:blank'];
    chromeProc = spawn(CHROME, args, { stdio: 'ignore' });
    for (let i = 0; i < 40; i++) { await sleep(500);
      try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {} }
    note('chrome start attempt', attempt, 'FAILED (no /json/version after 20s)');
    try { chromeProc.kill(); } catch (e) {}
    if (attempt < 3) { note('waiting 10s before retry...'); await sleep(10000); }
  }
  throw new Error('chrome did not start after 3 attempts (EPERM wave?)');
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
  const t = list.find(x => x.type === 'page');
  C = new CDP(t.webSocketDebuggerUrl);
  await C.ready;
  await C.send('Page.enable'); await C.send('Runtime.enable');
  await setViewport(1280, 800, false);
  await C.eval(`location.href = ${JSON.stringify(URL)}`);
  await sleep(3000);
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await C.eval('location.reload()');
  await sleep(2500);
  return C;
}
async function setViewport(w, h, mobile, dark) {
  await C.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
  await C.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
}
async function reloadWait(ms) { await C.eval('location.reload()'); await sleep(ms || 2800); }
async function shot(name) {
  try {
    const r = await C.send('Page.captureScreenshot', { format: 'png' });
    writeSmall(path.join(DIR, 'shots', `r44-${name}.png`), Buffer.from(r.data, 'base64'));
  } catch (e) { note('shot failed:', name, String(e).slice(0, 120)); }
}
async function step(name, fn) {
  try {
    const r = await fn();
    results[name] = r;
    note(`STEP ${name} —`, JSON.stringify(r).slice(0, 3000));
  } catch (e) {
    results[name] = { error: String(e).slice(0, 600) };
    note(`STEP ${name} ERROR —`, String(e).slice(0, 600));
  }
  saveResults();
}
async function freshGuest() {
  await C.eval(`localStorage.clear()`);
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await reloadWait(2800);
}

// Seed 5 Elemental wins so the Legendary arena opens (arenaOpen('leg')
// needs arenaWins('el') >= 5). Returns the arena state.
async function seedLegUnlock() {
  return await C.eval(`(function(){
    try{
      var e=window.__v18._test.en18();
      ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
      save();
      var F=window.__v18._test.F;
      return {ok:true, elWins:window.__v18.arenaWins('el'), legOpen:window.__v18.arenaOpen('leg'),
        firedragonUnlocked:window.__v18.bossUnlocked(window.__V18_BOSSES.byId('v10_firedragon'))};
    }catch(err){return {ok:false,err:String(err)};}
  })()`);
}

// Drive mastered count N: set box=5 on the first N WORDS ids (counts15
// counts box>=5 as mastered). Returns the mastered count legDiff sees.
async function seedMastered(n) {
  return await C.eval(`(function(n){
    try{
      var st=window.__v14.state; st.box={};
      var ws=window.__v15.words;
      for(var i=0;i<n&&i<ws.length;i++) st.box[ws[i].id]=5;
      save();
      return {ok:true, n:n, words:ws.length, mastered:window.__v15.counts.mastered, legDiff:window.__v18._test.legDiff()};
    }catch(err){return {ok:false,err:String(err)};}
  })(${n})`);
}

// Sorted pool ids of the CURRENT fight (F.pools built by nextQ).
async function poolSnapshot() {
  return await C.eval(`(function(){
    try{
      var F=window.__v18._test.F(); if(!F||!F.pools) return {ok:false,why:'no pools'};
      var w=F.pools.words.map(function(x){return x.id}).sort();
      var g=F.pools.grammar.map(function(x){return x.q||x.id||''}).sort();
      var lvSet={}; w.forEach(function(id){var x=F.pools.words.filter(function(y){return y.id===id})[0];});
      var levels={}; F.pools.words.forEach(function(x){levels[x.lv]=(levels[x.lv]||0)+1;});
      var gLevels={}; F.pools.grammar.forEach(function(x){gLevels[x.lv]=(gLevels[x.lv]||0)+1;});
      return {ok:true, boss:F.boss.id, lang:F.lang, qmode:F.qmode,
        wordsN:w.length, grammarN:g.length, wordLevels:levels, grammarLevels:gLevels,
        wordIds:w, grammarIds:g, firstQ:!!document.querySelector('#v18fight .v18qword')};
    }catch(err){return {ok:false,err:String(err)};}
  })()`);
}

async function main() {
  await openPage();
  await step('boot', async () => await C.eval(`(function(){return {v15:!!window.__v15,v18:!!window.__v18,v19:!!window.__v19,
    title:document.title, words:window.__v15.words.length,
    grammar:(window.__V15_DATA&&window.__V15_DATA.grammar||[]).length}})()`));

  // ===== R0: unit costs — one counts() scan, one legDiff() call =====
  await freshGuest();
  await step('R0-unit-costs', async () => await C.eval(`(function(){
    var t0=performance.now(); var c=null;
    for(var i=0;i<20;i++) c=window.__v15.counts;
    var t1=performance.now();
    var t2=performance.now(); var lv=null;
    for(var j=0;j<20;j++) lv=window.__v18._test.legDiff();
    var t3=performance.now();
    return {words:window.__v15.words.length, countsAvgMs:((t1-t0)/20), legDiffAvgMs:((t3-t2)/20),
      mastered:c.mastered, legDiff:lv,
      // the O(n^2) prediction: wordPool filters ~WORDS items, each
      // calling legDiff() -> one full counts() scan each.
      predictedWordPoolMs:((t1-t0)/20)*window.__v15.words.length};
  })()`));
  // R0b: legDiff's mastered read — V15().counts is a GETTER (src/v15.js
  // :1787), not a method, so legDiff's V15().counts() throws, the
  // try/catch swallows it, m stays 0, and legDiff ALWAYS returns
  // ['A2','B1'] whatever the mastered count is. Verify explicitly.
  await step('R0b-legDiff-latent-bug', async () => await C.eval(`(function(){
    var countsType=typeof window.__v15.counts;
    var callErr=null; try{ window.__v15.counts(); }catch(e){ callErr=String(e.message||e).slice(0,120); }
    return {countsType:countsType, countsCallThrows:callErr,
      mastered0:window.__v15.counts.mastered, legDiff0:window.__v18._test.legDiff()};
  })()`));

  // ===== R1: CONTROL — Challenge (non-Legendary) fight start is fast =====
  await step('R1-control-challenge-start', async () => await C.eval(`(function(){
    window.__v15.openHub('bosses');
    var t0=performance.now();
    window.__v18.fight('v10_slime','en');
    var t1=performance.now();
    var F=window.__v18._test.F();
    return {startMs:(t1-t0), boss:F&&F.boss.id, qmode:F&&F.qmode,
      questionRendered:!!document.querySelector('#v18fight .v18qword'),
      poolWords:F&&F.pools?F.pools.words.length:null};
  })()`));
  await shot('control-challenge-first-q');
  await step('R1b-close', async () => { await C.eval(`window.__v18.close()`); await sleep(300); return { closed: true }; });

  // ===== R2: THE REPRO — Legendary arena, real UI clicks =====
  await step('R2-seed-leg-unlock', seedLegUnlock);
  await step('R2-open-leg-arena', async () => {
    await C.eval(`window.__v18.openArena('leg')`); await sleep(600);
    return await C.eval(`(function(){
      var btns=[].slice.call(document.querySelectorAll('#v15body .v18boss .btn.pri'));
      return {arenaButtons:btns.length,
        firedragonBtn:btns.some(function(b){return (b.getAttribute('onclick')||'').indexOf('v10_firedragon')>=0})};
    })()`);
  });
  await shot('leg-arena');
  // Click 1: "Khiêu chiến" on Hắc Long Nham Hỏa (v10_firedragon) — should
  // only render the language pick (fast).
  await step('R2-click-challenge', async () => await C.eval(`(function(){
    var btns=[].slice.call(document.querySelectorAll('#v15body .v18boss .btn.pri'));
    var b=btns.filter(function(x){return (x.getAttribute('onclick')||'').indexOf('v10_firedragon')>=0;})[0];
    if(!b) return {ok:false,why:'no firedragon button'};
    var t0=performance.now(); b.click(); var t1=performance.now();
    return {ok:true, clickMs:(t1-t0), langPickShown:!!document.querySelector('#v18fight .acts'),
      langPickText:(document.querySelector('#v18fight')||{innerText:''}).innerText.slice(0,120)};
  })()`));
  await shot('leg-lang-pick');
  // Click 2: 🇬🇧 Tiếng Anh — THIS is where the freeze lives (startFight ->
  // nextQ -> wordPool + grammarPool, legDiff() per item).
  await step('R2-click-english-FREEZE', async () => await C.eval(`(function(){
    var btns=[].slice.call(document.querySelectorAll('#v18fight .btn.pri'));
    var b=btns[0];
    if(!b) return {ok:false,why:'no lang button'};
    var t0=performance.now(); b.click(); var t1=performance.now();
    var F=window.__v18._test.F();
    return {ok:true, clickMs:(t1-t0), boss:F&&F.boss.id, lang:F&&F.lang, qmode:F&&F.qmode,
      questionRendered:!!document.querySelector('#v18fight .v18qword'),
      poolWords:F&&F.pools?F.pools.words.length:null,
      poolGrammar:F&&F.pools?F.pools.grammar.length:null};
  })()`));
  await shot('leg-first-question-after-freeze');
  await step('R2-pool-mastered-0', poolSnapshot);
  // A few correct answers prove the fight itself works once started.
  await step('R2-drive-3-correct', async () => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      await C.eval(`window.__v18._test.pickCorrect()`); await sleep(300);
      const st = await C.eval(`(function(){var F=window.__v18._test.F(); return F?{hp:F.hp,hearts:F.hearts,phase:F.phase,over:F.over,q:F.q}:null})()`);
      out.push(st);
      await C.eval(`window.__v18.next()`); await sleep(300);
    }
    return { steps: out };
  });
  await step('R2-close', async () => { await C.eval(`window.__v18.close()`); await sleep(300); return { closed: true }; });

  // ===== R3: grammar path — direct timing of the grammar filter =====
  // grammarPool is not exported; measure it via the fight start of a
  // second Legendary boss with a fresh pool, plus a synthetic replay of
  // the exact old filter shape (48 grammar items x legDiff() each).
  await step('R3-grammar-filter-replay', async () => await C.eval(`(function(){
    var g=window.__V15_DATA.grammar;
    var t0=performance.now();
    var list=g.filter(function(x){return window.__v18._test.legDiff().indexOf(x.lv)>=0;});
    var t1=performance.now();
    return {grammarItems:g.length, filtered:list.length, filterMs:(t1-t0),
      legDiffCalls:g.length, legDiffAvgMs:(t1-t0)/g.length};
  })()`));

  // ===== R4: OLD pool reference at mastered 250 and 700 =====
  // (mastered 0 already captured in R2.) Re-fight after re-seeding box.
  for (const n of [250, 700]) {
    await step(`R4-seed-mastered-${n}`, () => seedMastered(n));
    await step(`R4-fight-mastered-${n}`, async () => await C.eval(`(function(){
      var t0=performance.now();
      window.__v18.fight('v10_firedragon','en');
      var t1=performance.now();
      var F=window.__v18._test.F();
      return {ok:true, startMs:(t1-t0), boss:F&&F.boss.id, qmode:F&&F.qmode,
        poolWords:F&&F.pools?F.pools.words.length:null,
        poolGrammar:F&&F.pools?F.pools.grammar.length:null};
    })()`));
    await step(`R4-pool-mastered-${n}`, poolSnapshot);
    await C.eval(`window.__v18.close()`); await sleep(300);
  }

  // ===== R5: console / dialogs summary =====
  await step('R5-console', async () => ({ errors: C.consoleErrors, warns: C.consoleWarns, dialogs: C.dialogs }));
  note('DONE. errors:', C.consoleErrors.length, 'warns:', C.consoleWarns.length, 'dialogs:', C.dialogs.length);
  saveResults();
  try { if (chromeProc) chromeProc.kill(); } catch (e) {}
  try { if (httpProc) httpProc.kill(); } catch (e) {}
  process.exit(0);
}
main().catch(e => { note('FATAL', String(e).slice(0, 500)); saveResults(); try { if (chromeProc) chromeProc.kill(); } catch (err) {} try { if (httpProc) httpProc.kill(); } catch (err) {} process.exit(2); });
