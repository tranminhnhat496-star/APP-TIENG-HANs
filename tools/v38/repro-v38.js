// repro-v37.js — REPRODUCE the V18.2 scope-banner bug on the PRISTINE V18.1 base.
// Real Chrome 157 via CDP, HTTP 8955 / CDP 9356, scratch profile.
// Modelled on tools/v36/verify-v36c.js (same CDP class, ensureHttp/
// ensureChrome, shot helpers). Exit 0 = driver completed; verdicts are
// in stdout + tools/v38/logs/repro-v37-results.json.
// Expected on the V18.1 base (the bug):
//   R1 hub banner: after clicking "✕ Bỏ chọn", banner STILL visible,
//      while __v15.en15().scope is null (data cleared, UI stale).
//   R2 smart banner: same for the .v27scope banner in the Smart overlay.
// A PASS verdict here means the bug REPRODUCED (the base is buggy).
// After the V37 build, verify-v37c.js must show both banners GONE.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9356;
const HTTPPORT = 8955;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8955/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v38';
const OUTDIR = process.argv[2] || '/home/hatch/workspace/v7build/out';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
function note(...a) { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); log.push(s); console.log(s); }
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
    '--user-data-dir=/tmp/chrome-v38r-prof', `--remote-debugging-port=${PORT}`,
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
function verdict(name, cond, detail) {
  note((cond ? 'REPRO ' : 'NO-REPRO ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  return cond;
}

async function main() {
  const results = {};
  try {
    await openPage();
    const boot = await C.eval(`(function(){ return { v15: !!window.__v15, v17: !!window.__v17, v18: !!window.__v18, v22: !!window.__v22, title: document.title }; })()`);
    note('boot:', boot);
    results.boot = boot;

    // Open the English Hub -> Bosses tab -> English Challenge Arena.
    // The picker (bossScopeHTML) lives in the arena view (v18.js:120).
    await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('bosses'); }catch(e){ return String(e); } })()`);
    await sleep(1200);
    await C.eval(`(function(){ try{ window.__v18.openArena('en'); }catch(e){ return String(e); } })()`);
    await sleep(1000);
    const picker = await C.eval(`(function(){
      var sel=document.querySelector('#v22bs-lib');
      if(!sel) return {present:false};
      var opts=Array.prototype.map.call(sel.options,function(o){return {v:o.value,t:o.textContent}});
      var chips=document.querySelectorAll('#v22bs-chips .v15pill');
      var chipTxt=Array.prototype.slice.call(chips,0,30).map(function(c){return (c.textContent||'').trim()});
      return {present:true, options:opts,
        typeSel: !!document.querySelector('#v22bs-type'),
        statusSel: !!document.querySelector('#v22bs-status'),
        chipCount: chips.length, chipSample: chipTxt,
        current: (document.querySelector('#v22bs-current')||{}).textContent||''};
    })()`);
    note('picker:', JSON.stringify(picker).slice(0, 900));
    results.picker = picker;
    await shot('repro-picker-bt-only');
    const vals = (picker.options||[]).map(function(o){return o.v});
    const hasLib = function(v){ return vals.indexOf(v) >= 0; };
    // The bug: only BT options exist; no library set can be picked.
    results.R1_bugReproduced = verdict('R1 lib dropdown has ONLY BT options (no a1a2/oxford/chrono/skyroot)',
      picker.present === true && hasLib('') && hasLib('all') && hasLib('units')
      && !hasLib('a1a2') && !hasLib('oxford') && !hasLib('chrono') && !hasLib('skyroot'),
      {options: vals});
    results.R2_chipsAreBTUnitsOnly = verdict('R2 chips row shows BT Units 1-24 only',
      picker.chipCount === 24 && picker.chipSample[0] === 'Unit 1' && picker.chipSample[23] === 'Unit 24',
      {chipCount: picker.chipCount, first: picker.chipSample[0], last: picker.chipSample[23]});
    results.R3_scopeNamePlaceholder = await C.eval(`(function(){
      try{ window.__v15.setScope({kind:'lib',lib:'oxford',lesson:12}); }catch(e){}
      var name=null;
      try{ var h=window.__v22.bossScopeHTML(); var a=h.indexOf('Đang chọn: <b>'); if(a>=0){ var b=h.indexOf('</b>', a); name=h.slice(a+'Đang chọn: <b>'.length, b); } }catch(e){}
      return {name: name};
    })()`);
    note('scopeName for an Oxford scope:', results.R3_scopeNamePlaceholder);
    results.R3_placeholder = verdict('R3 Oxford scope displays as "Bộ từ khác" (display path never expected other libs)',
      results.R3_scopeNamePlaceholder && results.R3_scopeNamePlaceholder.name === 'Bộ từ khác',
      results.R3_scopeNamePlaceholder);
    await C.eval(`(function(){ try{ window.__v15.clearScope(); }catch(e){} })()`);

    results.consoleErrors = C.consoleErrors;
    results.consoleWarns = C.consoleWarns;
    results.dialogs = C.dialogs;
    note('console errors:', C.consoleErrors.length, 'warnings:', C.consoleWarns.length, 'dialogs:', C.dialogs.length);
  } catch (e) {
    note('DRIVER ERROR:', String(e).slice(0, 600));
    results.driverError = String(e).slice(0, 600);
  } finally {
    writeSmall(path.join(DIR, 'logs', 'repro-v38-results.json'), JSON.stringify(results, null, 2));
    try { if (C) C.close(); } catch (e) {}
    try { if (chromeProc) chromeProc.kill(); } catch (e) {}
    try { if (httpProc) httpProc.kill(); } catch (e) {}
  }
  note('done. R1 reproduced:', results.R1_bugReproduced, 'R2 reproduced:', results.R2_chipsAreBTUnitsOnly, 'R3 reproduced:', results.R3_placeholder);
  process.exit(0);
}
main();
