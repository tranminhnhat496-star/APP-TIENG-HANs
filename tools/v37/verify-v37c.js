// verify-v37c.js — V18.2 SCOPE BANNER FIX Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8954 / CDP 9355, scratch profile.
// Modelled on tools/v36/verify-v36c.js + tools/v37/repro-v37.js (same CDP
// class, ensureHttp/ensureChrome, shot helpers). Exit 0 = driver completed
// (verdicts are in the results JSON + stdout; a FAIL verdict does not
// crash the driver). Writes results to tools/v37/logs/v37c-results.json
// after EVERY step (best-effort: EPERM waves may block a write; stdout
// always carries the verdicts).
// Gates:
//   V37-A hub banner: Bỏ chọn -> banner GONE, scope null, renderHub exported.
//   V37-B mid-mode clear: start MC in a scope, Bỏ chọn -> same question
//         still showing, mode still functional (answer one question).
//   V37-C Smart banner: Bỏ chọn -> banner GONE, scope null.
//   V37-D V18.1 regression spot-check: hub, Library (Chrono + Skyroot),
//         bosses tab, one V18 boss fight render + close, Pet Hub open,
//         console errors 0 / warnings 0 / dialogs 0.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9355;
const HTTPPORT = 8954;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8954/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v37';
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
function saveResults() { writeSmall(path.join(DIR, 'logs', 'v37c-results.json'), JSON.stringify(results, null, 2)); }
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
  const sha = execSync(`sha256sum ${POLICY} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
  const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
    '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
    '--user-data-dir=/tmp/chrome-v37c-prof', `--remote-debugging-port=${PORT}`,
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
  await sleep(3000);
  // V36 precedent (freshSeed): seed a guest session so the V21 welcome
  // overlay does not cover the hub in screenshots. Without this the DOM
  // verdicts are still valid, but every screenshot shows the login
  // screen instead of the hub/mode/fight under test.
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await C.eval('location.reload()');
  await sleep(2500);
  return C;
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

async function main() {
  try {
    await openPage();
    const boot = await C.eval(`(function(){ return { v15: !!window.__v15, v17: !!window.__v17, v27: !!window.__v27, v37: !!window.__v37, v37ver: window.__v37 && window.__v37.version, title: document.title, renderHubFn: typeof (window.__v15 && window.__v15.renderHub), render27Fn: typeof (window.__v27 && window.__v27.render) }; })()`);
    note('boot:', boot);
    results.boot = boot;
    saveResults();

    // ============ V37-A — hub banner fixed ============
    await step('V37-A-hub-banner-fixed', async () => {
      const r = {};
      r.renderHubExported = await C.eval(`typeof window.__v15.renderHub === 'function'`);
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('library'); }catch(e){} })()`);
      await sleep(1200);
      await C.eval(`(function(){ try{ window.__v17.learnTopic('education'); }catch(e){} })()`);
      await sleep(800);
      r.before = await C.eval(`(function(){ var b=document.querySelector('.v17scope'); if(!b) return {present:false}; var rc=b.getBoundingClientRect(); return {present:true, visible: rc.width>0 && rc.height>0, text:(b.textContent||'').slice(0,80), btn: !!document.querySelector('.v17scope .v17scope-x')}; })()`);
      await shot('v37a-banner-before');
      r.clicked = await C.eval(`(function(){ var btn=document.querySelector('.v17scope .v17scope-x'); if(!btn) return false; btn.click(); return true; })()`);
      await sleep(800);
      r.after = await C.eval(`(function(){ var b=document.querySelector('.v17scope'); var scope=null; try{ scope=window.__v15.en15().scope; }catch(e){} if(!b) return {present:false, scope: scope}; var rc=b.getBoundingClientRect(); return {present:true, visible: rc.width>0 && rc.height>0, scope: scope}; })()`);
      await shot('v37a-banner-after');
      r.bannerGone = r.after.present === false;
      r.scopeNull = r.after.scope === null;
      r.verdict = verdict('V37-A banner GONE + scope null after Bỏ chọn', r.bannerGone && r.scopeNull, r.after);
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ V37-B — mid-mode clear keeps the mode ============
    await step('V37-B-mid-mode-clear', async () => {
      const r = {};
      // Re-set the scope and start Multiple Choice inside it.
      await C.eval(`(function(){ try{ window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'education'}); window.__v15.tab('learn'); window.__v15.startMode('mc'); }catch(e){} })()`);
      await sleep(1000);
      r.qBefore = await C.eval(`(function(){ var q=document.querySelector('#v15body .v15qword'); var b=document.querySelector('.v17scope'); return {qword: q?(q.textContent||'').trim():null, bannerPresent: !!b, opts: document.querySelectorAll('#v15body .v15opts button').length, learnMenuShown: !!document.querySelector('#v15body .v15modes')}; })()`);
      await shot('v37b-mode-before');
      r.clicked = await C.eval(`(function(){ var btn=document.querySelector('.v17scope .v17scope-x'); if(!btn) return false; btn.click(); return true; })()`);
      await sleep(800);
      r.qAfter = await C.eval(`(function(){ var q=document.querySelector('#v15body .v15qword'); var b=document.querySelector('.v17scope'); var scope=null; try{ scope=window.__v15.en15().scope; }catch(e){} return {qword: q?(q.textContent||'').trim():null, bannerPresent: !!b, scope: scope, opts: document.querySelectorAll('#v15body .v15opts button').length, learnMenuShown: !!document.querySelector('#v15body .v15modes')}; })()`);
      await shot('v37b-mode-after-clear');
      r.sameQuestion = r.qBefore.qword !== null && r.qBefore.qword === r.qAfter.qword;
      r.bannerGone = r.qAfter.bannerPresent === false;
      r.scopeNull = r.qAfter.scope === null;
      r.modeStillActive = r.qAfter.qword !== null && r.qAfter.learnMenuShown === false;
      r.verdict = verdict('V37-B same question + mode alive + banner gone', r.sameQuestion && r.modeStillActive && r.bannerGone && r.scopeNull, { qBefore: r.qBefore, qAfter: r.qAfter });
      // The mode must still WORK after the clear: answer one MC question.
      r.answered = await C.eval(`(async()=>{ try{
        var btn=document.querySelector('#v15body .v15opts button'); if(!btn) return {ok:false, why:'no option button'};
        btn.click(); await new Promise(x=>setTimeout(x,700));
        var q=document.querySelector('#v15body .v15qword');
        var next=document.querySelector('#v15body .v15opts button, #v15body .btn.pri');
        return {ok:true, qwordAfterAnswer: q?(q.textContent||'').trim():null, hasNextControl: !!next, learnMenuShown: !!document.querySelector('#v15body .v15modes')};
      }catch(e){ return {ok:false, err:String(e)} } })()`, true);
      await sleep(300);
      r.modeResponds = r.answered.ok === true && r.answered.learnMenuShown === false;
      r.verdict2 = verdict('V37-B mode still responds after clear (answer accepted, no crash to menu)', r.modeResponds, r.answered);
      // Leave the mode cleanly for the next gates.
      await C.eval(`(function(){ try{ window.__v15.tab('learn'); }catch(e){} })()`);
      await sleep(600);
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ V37-C — Smart banner fixed ============
    await step('V37-C-smart-banner-fixed', async () => {
      const r = {};
      r.render27Exported = await C.eval(`typeof window.__v27.render === 'function'`);
      await C.eval(`(function(){ try{ window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'education'}); window.__v27.openSmart('en'); }catch(e){} })()`);
      await sleep(1000);
      r.before = await C.eval(`(function(){ var b=document.querySelector('.v27scope'); if(!b) return {present:false}; var rc=b.getBoundingClientRect(); return {present:true, visible: rc.width>0 && rc.height>0, text:(b.textContent||'').slice(0,80), btn: !!document.querySelector('.v27scope .v27link')}; })()`);
      await shot('v37c-smart-before');
      r.clicked = await C.eval(`(function(){ var btn=document.querySelector('.v27scope .v27link'); if(!btn) return false; btn.click(); return true; })()`);
      await sleep(800);
      r.after = await C.eval(`(function(){ var b=document.querySelector('.v27scope'); var scope=null; try{ scope=window.__v15.en15().scope; }catch(e){} if(!b) return {present:false, scope: scope}; var rc=b.getBoundingClientRect(); return {present:true, visible: rc.width>0 && rc.height>0, scope: scope}; })()`);
      await shot('v37c-smart-after');
      r.bannerGone = r.after.present === false;
      r.scopeNull = r.after.scope === null;
      r.verdict = verdict('V37-C Smart banner GONE + scope null after Bỏ chọn', r.bannerGone && r.scopeNull, r.after);
      await C.eval(`(function(){ try{ window.__v27.closeSmart(); }catch(e){} })()`);
      await sleep(400);
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ V37-D — V18.1 regression spot-check ============
    await step('V37-D-regression', async () => {
      const r = {};
      r.hub = await C.eval(`(async()=>{ try{ window.__v15.openHub('learn'); await new Promise(x=>setTimeout(x,800)); var hub=document.querySelector('#v15hub'); return {open: !!hub, modes: document.querySelectorAll('#v15body .v15modes button, #v15body .v15mode').length, textLen: (hub?hub.textContent:'').length}; }catch(e){ return {err:String(e)} } })()`, true);
      r.library = await C.eval(`(async()=>{ try{ window.__v15.openHub('library'); await new Promise(x=>setTimeout(x,800)); var hub=document.querySelector('#v15hub'); return {open: !!hub, hasChrono: (hub?hub.textContent:'').indexOf('Chrono Kingdom')>=0, hasSkyroot: (hub?hub.textContent:'').indexOf('Skyroot Sanctuary')>=0, hasA1A2: (hub?hub.textContent:'').indexOf('A1')>=0}; }catch(e){ return {err:String(e)} } })()`, true);
      await shot('v37d-library');
      r.bossesTab = await C.eval(`(async()=>{ try{ window.__v15.openHub('bosses'); await new Promise(x=>setTimeout(x,800)); var hub=document.querySelector('#v15hub'); return {open: !!hub, textLen: (hub?hub.textContent:'').length}; }catch(e){ return {err:String(e)} } })()`, true);
      // One boss fight render (first unlocked V18 boss, EN).
      r.fight = await C.eval(`(async()=>{ try{
        var d=window.__V18_BOSSES||{};
        var list=((d.en||[]).concat(d.el||[],d.leg||[],d.old||[])).filter(function(b){ return window.__v18.bossUnlocked(b); });
        if(!list.length) return {ok:false, why:'no unlocked boss'};
        var id=list[0].id;
        window.__v18.fight(id,'en'); await new Promise(x=>setTimeout(x,900));
        var f=document.querySelector('#v18fight');
        var q=document.querySelector('#v18fight .v18qword, #v18fight .v18qcard, #v18fight .v15qword');
        return {ok:true, id:id, fightEl: !!f, hasQuestion: !!q, textLen: f?(f.textContent||'').length:0};
      }catch(e){ return {ok:false, err:String(e)} } })()`, true);
      await shot('v37d-fight');
      await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`);
      await sleep(500);
      r.pets = await C.eval(`(async()=>{ try{ window.__v23.openHub(); await new Promise(x=>setTimeout(x,900)); var h=document.querySelector('#v23hub'); return {open: !!h, visible: !!h && h.style.display!=='none', textLen: (h?h.textContent:'').length}; }catch(e){ return {err:String(e)} } })()`, true);
      await shot('v37d-pets');
      await C.eval(`(function(){ try{ window.__v23.closeHub&&window.__v23.closeHub(); }catch(e){} })()`);
      await sleep(400);
      r.consoleErrors = C.consoleErrors;
      r.consoleWarns = C.consoleWarns;
      r.dialogs = C.dialogs;
      r.verdict = verdict('V37-D regression clean (0 console errors/warnings/dialogs)', C.consoleErrors.length === 0 && C.consoleWarns.length === 0 && C.dialogs.length === 0, { errors: C.consoleErrors.length, warns: C.consoleWarns.length, dialogs: C.dialogs.length });
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
