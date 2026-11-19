// verify-v36c.js — V18.1 BUG FIXES Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8952 / CDP 9353, scratch profile.
// Modelled on tools/v35/verify-v35c.js (same CDP class, freshSeed,
// readSave, shot helpers). Exit 0 = driver completed (verdicts are in
// the results JSON + stdout; a FAIL verdict does not crash the driver).
// The driver spawns its own HTTP server for out/ on 8952 and kills it
// on exit (v34c required a pre-running server; this one is self-contained).
// Writes results to tools/v35/logs/v35c-results.json after EVERY step
// (best-effort: EPERM waves may block a write; stdout always carries
// the verdicts).
// Gates: V36-A F-06 layering (Smart 1600 above modals, toast 1700 above Smart);
// V36-B M1 filter-row overflow at 360px + M2 touch targets >=44px;
// V36-C V17-2 live lethal team-skill fight (win once, no double pay);
// V36-D F13 live partial session (plan + quest, no bonus when abandoned);
// V36-E F09 no duplicate ids in the live DOM + F10 Escape listener;
// V36-F V17-1 avatar thresholds (summarizeSave) + V17-3 speak mode renders;
// V36-G V18.0 regression spot-check (gates, BREAK clamp, console errors 0).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9353;
const HTTPPORT = 8952;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8952/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v36';
const OUTDIR = '/home/hatch/workspace/v7build/out';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
function note(...a) { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); log.push(s); console.log(s); }
function writeSmall(p, data) {
  // EPERM-safe small-chunk write (host waves block big userspace writes)
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
    '--user-data-dir=/tmp/chrome-v36c-prof', `--remote-debugging-port=${PORT}`,
    '--window-size=390,844', 'about:blank'];
  chromeProc = spawn(CHROME, args, { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { await sleep(500);
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {} }
  throw new Error('chrome did not start (Trace/breakpoint trap suspected — see baseline § Host failure)');
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
  await sleep(2500);
  return C;
}
async function reloadWait(ms = 2500) { await C.eval('location.reload()'); await sleep(ms); }
async function shot(name) {
  try {
    const r = await C.send('Page.captureScreenshot', { format: 'png' });
    if (r.data) writeSmall(path.join(DIR, 'shots', name + '.png'), Buffer.from(r.data, 'base64').toString('latin1'));
  } catch (e) { note('shot failed', name, String(e).slice(0, 120)); }
}
// Seed a fresh save with exactly n15/n18flat/n19 boss wins (V33-local
// corrected count) + xp/gems, then reload so the game boots on it.
// golemEn adds a GEAR GOLEM win in EN (opens the Skyroot gate in EN);
// skyEn adds Skyroot wins in EN (array of v18_* ids).
function winsMutator(n15, n18, n19, xp, gems, golemEn, skyEn) {
  const sky = JSON.stringify(skyEn || []);
  return `S0.xp=${xp}; S0.v7=S0.v7||{}; S0.v7.gems=${gems};
    S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.bosses={}; for(var i=0;i<${n15};i++) S0.v7.en15.bosses['old'+i]={win:1};
    S0.v7.en18=S0.v7.en18||{}; S0.v7.en18.bosses={}; for(var i=0;i<${n18};i++) S0.v7.en18.bosses['v10_'+i]={win:1,wins:1};
    S0.v7.en19=S0.v7.en19||{bosses:{},titles:[],zoneClaimed:{},koStats:{right:0,wrong:0}}; S0.v7.en19.bosses={}; for(var i=0;i<${n19};i++) S0.v7.en19.bosses['v11_'+i]={en:{win:1,wins:1,stars:2,best:2}};
    if(${golemEn ? 'true' : 'false'}) S0.v7.en19.bosses['v17_geargolem']={en:{win:1,wins:1,stars:3,best:3}};
    ${sky}.forEach(function(id){ S0.v7.en19.bosses[id]={en:{win:1,wins:1,stars:3,best:3}}; });
    S0.v7.en15.langChoice=true; S0.v7.en15.lang='en';`;
}
async function freshSeed(mutatorJS) {
  await C.eval(`localStorage.clear(); sessionStorage.clear();`);
  await reloadWait(2200);
  const r = await C.eval(`(function(){ try{
    localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}));
    var raw=localStorage.getItem('hanvocab.v1'); if(!raw) return {err:'no-save-after-load'};
    var S0=JSON.parse(raw);
    ${mutatorJS}
    localStorage.setItem('hanvocab.v1', JSON.stringify(S0));
    return {ok:true, xp:S0.xp, cards:(S0.cards||[]).length};
  }catch(e){ return {err:String(e)} } })()`);
  await reloadWait(2200);
  return r;
}
async function readSave() {
  return await C.eval(`(function(){ try{
    var raw=localStorage.getItem('hanvocab.v1')||'';
    var S0=JSON.parse(raw);
    var mem=null; try{ mem={xp:S.xp, gems:(S.v7&&S.v7.gems)||0, cards:(S.cards||[]).length}; }catch(e){}
    return {rawLen:raw.length, xp:S0.xp, gems:(S0.v7&&S0.v7.gems)||0, cards:(S0.cards||[]).length,
      en17claimed: S0.v7&&S0.v7.en17?S0.v7.en17.claimed:null,
      en35: S0.v7&&S0.v7.en35?{quests:Object.keys(S0.v7.en35.quests||{}), region:S0.v7.en35.regionClaimed}:null,
      skyrootWins: (function(){var b=S0.v7&&S0.v7.en19&&S0.v7.en19.bosses||{};var n=0;for(var k in b) if(k.indexOf('v18_')===0&&b[k]&&b[k].en&&b[k].en.win) n++; return n})(),
      golemEn: !!(S0.v7&&S0.v7.en19&&S0.v7.en19.bosses&&S0.v7.en19.bosses['v17_geargolem']&&S0.v7.en19.bosses['v17_geargolem'].en&&S0.v7.en19.bosses['v17_geargolem'].en.win),
      en27sessions: ((S0.v7&&S0.v7.en27&&S0.v7.en27.sessions)||[]).length,
      pets: Object.keys((S0.v7&&S0.v7.en23&&S0.v7.en23.pets)||{}).length,
      mem:mem, v7keys:S0.v7?Object.keys(S0.v7):[] };
  }catch(e){ return {err:String(e)} } })()`);
}
const R = {};
async function step(name, fn) {
  try { const v = await fn(); R[name] = v; note('## ' + name, JSON.stringify(v).slice(0, 3500)); }
  catch (e) { R[name] = { ERROR: String(e).slice(0, 500) }; note('## ' + name + ' ERROR', String(e).slice(0, 500)); }
  writeSmall(path.join(DIR, 'logs', 'v36c-results.json'), JSON.stringify(R, null, 2));
}
function cleanup() {
  try { if (C) C.close(); } catch (e) {}
  try { if (chromeProc) chromeProc.kill('SIGTERM'); } catch (e) {}
  try { if (httpProc) httpProc.kill('SIGTERM'); } catch (e) {}
}

(async () => {
  await openPage();
  try {
    const r = await C.eval(`(async()=>{ try{
      var out={typeofPop: typeof window.pop, typeofToast: typeof window.toast};
      try{ window.__v15.pop15('TEST TOAST 36'); }catch(e){ out.pop15Err=String(e); }
      await new Promise(r=>setTimeout(r,500));
      function desc(el){ if(!el) return null; var cs=getComputedStyle(el); return {cls: el.className, id: el.id, z: cs.zIndex, text: (el.textContent||'').slice(0,60)}; }
      out.v7toast=desc(document.querySelector('.v7toast'));
      out.v23toast=desc(document.querySelector('#v23toast'));
      out.allToasts=Array.from(document.querySelectorAll('[class*="toast"],[id*="toast"]')).map(function(el){ return {cls: el.className, id: el.id, z: getComputedStyle(el).zIndex}; });
      window.__v27.openSmart('en');
      await new Promise(r=>setTimeout(r,700));
      try{ window.__v15.pop15('TEST TOAST 36 SMART'); }catch(e){}
      await new Promise(r=>setTimeout(r,500));
      var t=document.querySelector('.v7toast')||document.querySelector('#v23toast');
      out.smartOpen= !!document.querySelector('#v27hub');
      out.v7toastUnderSmart=desc(t);
      if(t){ var rc=t.getBoundingClientRect(); var el=document.elementFromPoint(rc.left+rc.width/2, rc.top+rc.height/2); out.topAtToastCentre= el?(el.id||el.className||el.tagName):null; out.toastIsTop= !!(el && (el===t || t.contains(el))); }
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    console.log('TOAST_PROBE', JSON.stringify(r, null, 2));
  } finally { cleanup(); setTimeout(() => process.exit(0), 800); }
})().catch(e => { console.error('FATAL', e); cleanup(); process.exit(1); });
