// verify-v32c.js — V16.4 Data Safety Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8951 / CDP 9351, scratch profile.
// Modelled on tools/v31/verify-v31c.js (same CDP class, freshSeed,
// raceTrial, fixture, shot helpers). Exit 0 = driver completed
// (verdicts are in the results JSON + stdout; a FAIL verdict does not
// crash the driver). Writes results to tools/v32/logs/v32c-results.json
// after EVERY step (best-effort: EPERM waves may block a write; stdout
// always carries the verdicts).
// Gates: V32-A monitor panel (+ B-32-2 duplication check), V32-B safe
// cleanup + reload persistence, V32-C warning badge, V32-D F-02
// real-engine race 3x per path, V32-E cloud verify + offline,
// V32-F V16.3 regression, V32-G monitor UI at 360/390/430,
// V32-H bad-version real import, V32-I C9 real-File restore,
// V32-J R2/R3/R6 regression (invalid restore, proto, export).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9351;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8951/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v32';
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
async function ensureChrome() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {}
  const sha = execSync(`sha256sum ${POLICY} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
  const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
    '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
    '--user-data-dir=/tmp/chrome-v32c-prof', `--remote-debugging-port=${PORT}`,
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
      enBox:Object.keys((S0.v7&&S0.v7.en&&S0.v7.en.box)||{}).length,
      en18wins: (function(){var b=S0.v7&&S0.v7.en18&&S0.v7.en18.bosses||{};var n=0;for(var k in b) if(b[k]&&b[k].win) n++; return n})(),
      pets: Object.keys((S0.v7&&S0.v7.en23&&S0.v7.en23.pets)||{}).length,
      en27sessions: ((S0.v7&&S0.v7.en27&&S0.v7.en27.sessions)||[]).length,
      en22quest: Object.keys((S0.v7&&S0.v7.en22&&S0.v7.en22.quest)||{}).length,
      mem:mem, keys:Object.keys(S0), v7keys:S0.v7?Object.keys(S0.v7):[] };
  }catch(e){ return {err:String(e)} } })()`);
}
function fixture(name, obj) {
  const p = path.join(DIR, 'fixtures', name);
  writeSmall(p, typeof obj === 'string' ? obj : JSON.stringify(obj));
  return p;
}
async function setFileOnInput(selector, filePath) {
  const doc = await C.send('DOM.getDocument', { depth: -1 });
  const q = await C.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
  if (!q.nodeId) return { ok: false, err: 'no-input ' + selector };
  await C.send('DOM.setFileInputFiles', { files: [filePath], nodeId: q.nodeId });
  return { ok: true };
}
async function buildRestoreSave(xp, extraJS) {
  return await C.eval(`(function(){ try{
    var S0=JSON.parse(localStorage.getItem('hanvocab.v1'));
    S0.xp=${xp}; S0.v7=S0.v7||{}; S0.v7.gems=77;
    ${extraJS || ''}
    return S0;
  }catch(e){ return {err:String(e)} } })()`);
}
const R = {};
async function step(name, fn) {
  try { const v = await fn(); R[name] = v; note('## ' + name, JSON.stringify(v).slice(0, 3500)); }
  catch (e) { R[name] = { ERROR: String(e).slice(0, 500) }; note('## ' + name + ' ERROR', String(e).slice(0, 500)); }
  writeSmall(path.join(DIR, 'logs', 'v32c-results.json'), JSON.stringify(R, null, 2));
}

(async () => {
  await openPage();
  const boot = await C.eval(`(function(){return {href:location.href, title:document.title, hasV15:!!window.__v15, hasV20:!!window.__v20, hasV20sync:!!window.__v20sync, hasV21:!!window.__v21, hasV27:!!window.__v27, hasV31:!!window.__v31, v31: window.__v31?window.__v31.version:null, hasV32:!!window.__v32, v32: window.__v32?window.__v32.version:null, configured: window.__v20sync?__v20sync.configured():null, xp: (function(){try{return S.xp}catch(e){return 'no-S'}})() }})()`);
  note('BOOT', JSON.stringify(boot));
  await step('boot', async () => boot);

  // ============ V32-A — monitor panel (incl. B-32-2 duplication check) ============
  await step('V32-A-monitor-panel', async () => {
    await freshSeed(`S0.xp=4000; S0.v7=S0.v7||{}; S0.v7.gems=40; S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.langChoice=true; S0.v7.en15.lang='en';`);
    await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('backup'); }catch(e){} })()`);
    await sleep(900);
    const r = await C.eval(`(function(){ try{
      var mons=document.querySelectorAll('#v32monitor');
      var sec=document.querySelector('#v32monitor');
      var st=window.__v32?window.__v32.status():null;
      return { v31panel: document.querySelectorAll('#v31panel').length,
        v32monitor: mons.length,
        monText: sec?(sec.textContent||'').slice(0,900):null,
        hasRows: sec?/hanvocab\\.v1/.test(sec.textContent):false,
        hasThresholds: sec?(/Cảnh báo ở 70%/.test(sec.textContent)&&/Nguy hiểm ở 90%/.test(sec.textContent)):false,
        hasSaveVersion: sec?/Phiên bản bản lưu hiện tại/.test(sec.textContent):false,
        hasCleanupBtn: sec?!!sec.querySelector('button'):false,
        status: st };
    }catch(e){ return {err:String(e)} } })()`);
    await shot('v32c-monitor');
    await C.eval(`(function(){ try{ window.__v15.openHub('backup'); }catch(e){} })()`);
    await sleep(700);
    r.v31panelAfterRerender = await C.eval(`document.querySelectorAll('#v31panel').length`);
    r.v32monitorAfterRerender = await C.eval(`document.querySelectorAll('#v32monitor').length`);
    return r;
  });

  // ============ V32-B — safe cleanup + reload persistence ============
  await step('V32-B-cleanup', async () => {
    await freshSeed(`S0.xp=100; S0.v7=S0.v7||{}; S0.v7.gems=10; S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.langChoice=true;`);
    const d0 = C.dialogs.length;
    const seeded = await C.eval(`(function(){ try{
      function snapSave(pad){ var s=JSON.parse(localStorage.getItem('hanvocab.v1')); s.xp=100; s.pad=pad; return JSON.stringify(s); }
      for(var i=1;i<=7;i++) localStorage.setItem('hanvocab.v12.preimport-'+(1000*i), snapSave(new Array(i*100+1).join('x')));
      localStorage.setItem('hanvocab.v11-backup', JSON.stringify(JSON.parse(localStorage.getItem('hanvocab.v1'))));
      for(var j=1;j<=15;j++) window.__v31.recordBackupEvent('local-export', 10, 'abcd', '', true, 'h'+j);
      var plan=window.__v32._test.prunePlan();
      return {plan: plan, histLen: window.__v31._test.readHistory().length};
    }catch(e){ return {err:String(e)} } })()`);
    const cleaned = await C.eval(`(function(){ try{
      var r=window.__v32.cleanupSafe();
      var keys=[]; for(var i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));
      return {cleanup: r,
        snapsLeft: keys.filter(function(k){ return k.indexOf('hanvocab.v12.preimport-')===0; }),
        v11: localStorage.getItem('hanvocab.v11-backup')!==null,
        v1xp: JSON.parse(localStorage.getItem('hanvocab.v1')).xp,
        hist: window.__v31._test.readHistory().map(function(e){ return (e.kind||'')+':'+(e.note||''); })};
    }catch(e){ return {err:String(e)} } })()`);
    await reloadWait(2200);
    const afterReload = await C.eval(`(function(){ try{
      var keys=[]; for(var i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));
      return {snapsLeft: keys.filter(function(k){ return k.indexOf('hanvocab.v12.preimport-')===0; }),
        v11: localStorage.getItem('hanvocab.v11-backup')!==null,
        v1xp: JSON.parse(localStorage.getItem('hanvocab.v1')).xp,
        histLen: window.__v31._test.readHistory().length,
        status: window.__v32.status()};
    }catch(e){ return {err:String(e)} } })()`);
    return { seeded, cleaned, afterReload,
      deletedOldestTwo: cleaned && cleaned.cleanup && JSON.stringify(cleaned.cleanup.deletedKeys) === JSON.stringify(['hanvocab.v12.preimport-2000', 'hanvocab.v12.preimport-1000']),
      historyKept10plusCleanupEvent: cleaned && cleaned.hist && cleaned.hist.length === 11 && cleaned.hist[0].indexOf('cleanup') === 0 && cleaned.hist[10].indexOf('h6') >= 0,
      persistOK: afterReload && afterReload.snapsLeft && afterReload.snapsLeft.length === 5 && afterReload.v1xp === 100,
      dialogs: C.dialogs.slice(d0).map(d => d.type + ':' + d.message.slice(0, 150)) };
  });

  // ============ V32-C — warning badge at >70% ============
  await step('V32-C-badge', async () => {
    await freshSeed(`S0.xp=100; S0.v7=S0.v7||{}; S0.v7.gems=10; S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.langChoice=true;`);
    const warnsBefore = C.consoleWarns.length;
    await C.eval(`(function(){ try{
      for(var i=1;i<=8;i++) localStorage.setItem('hanvocab.v12.preimport-'+(9000+i), new Array(500*1024+1).join('x'));
    }catch(e){} })()`);
    await reloadWait(2500);
    const badge = await C.eval(`(function(){ try{
      var b=document.querySelector('#v32badge');
      var st=window.__v32?window.__v32.status():null;
      return {badgePresent: !!b, badgeText: b?(b.textContent||'').slice(0,200):null,
        pct: st?st.pct:null, level: st?st.level:null, totalBytes: st?st.totalBytes:null};
    }catch(e){ return {err:String(e)} } })()`);
    await shot('v32c-badge');
    const dismissed = await C.eval(`(function(){ try{
      var btn=document.querySelector('#v32badge .v32badge-close');
      if(btn) btn.click();
      return {clicked: !!btn};
    }catch(e){ return {err:String(e)} } })()`);
    await sleep(600);
    const afterDismiss = await C.eval(`document.querySelector('#v32badge')===null`);
    return { badge, dismissed, badgeGoneAfterDismiss: afterDismiss,
      v32WarnLogged: C.consoleWarns.slice(warnsBefore).some(w => w.indexOf('[V32]') >= 0) };
  });

  // ============ V32-D — F-02 real-engine race, 3 trials per path ============
  async function raceTrial(pathKind, trialNo, restoreXp) {
    await freshSeed(`S0.xp=1000; S0.v7=S0.v7||{}; S0.v7.gems=10; S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.langChoice=true; S0.v7.en15.lang='en';`);
    const base = await readSave();
    const saveB = await buildRestoreSave(restoreXp, `S0.v7.gems=77;`);
    const fp = fixture(`r1-${pathKind}-t${trialNo}.json`, saveB);
    let inputSel = '#v15-restore';
    if (pathKind === 'v15') {
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('backup'); }catch(e){} })()`);
      await sleep(700);
      const hasInput = await C.eval(`!!document.querySelector('#v15-restore')`);
      if (!hasInput) return { trial: trialNo, path: pathKind, err: 'no #v15-restore input after openHub(backup)' };
    } else if (pathKind === 'v20') {
      await C.eval(`(function(){ var i=document.createElement('input'); i.type='file'; i.id='v32-v20input'; document.body.appendChild(i); })()`);
      inputSel = '#v32-v20input';
    } else if (pathKind === 'acct') {
      // D-32-2 (driver setup fix, 2026-11-19): the old setup left the
      // session as guest and planted the target bytes in the guest home
      // — a guest->guest "switch". activateGuest() then legitimately
      // parks the live slot (which IS the guest's save) into the guest
      // home, overwriting the planted bytes, so no correct
      // implementation could pass (probe /tmp/probe-acct.js run B:
      // slot 1005, guest home 1005 after the switch). The real flow is
      // signOut21: account -> guest, so seed the session as an account
      // here; the planted guest home is then the switched-to identity's
      // save, and the account's flushed bytes must land in its own home
      // (asserted via acctHomeXp below).
      await C.eval(`(function(){ localStorage.setItem('hanvocab.v1.guest', ${JSON.stringify(JSON.stringify(saveB))}); localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'account', uid:'v32-acct', at: Date.now()})); })()`);
    }
    const t0 = Date.now();
    const trig = await C.eval(`(async()=>{
      var tSave=Date.now();
      try{ S.xp = S.xp + 5; }catch(e){ return {err:'no-S:'+String(e)} }
      try{ save(); }catch(e){ return {err:'save:'+String(e)} }
      var dirty = (window.__v20&&__v20._test)?__v20._test.isDirty():null;
      return {tSave, dirtyAfterSave: dirty};
    })()`, true);
    let restoreMs = null;
    if (pathKind === 'v15' || pathKind === 'v20') {
      const setR = await setFileOnInput(inputSel, fp);
      restoreMs = Date.now() - t0;
      if (!setR.ok) return { trial: trialNo, path: pathKind, trig, setR, err: 'setFile failed' };
      if (pathKind === 'v20') await C.eval(`(function(){ var i=document.querySelector('#v32-v20input'); try{ window.__v20.importFile(i); }catch(e){} })()`);
      let reloaded = false;
      for (let i = 0; i < 30; i++) { await sleep(300); const h = await C.eval(`(function(){ try{ return {xp:S.xp}; }catch(e){ return {err:String(e)} } })()`).catch(() => null); if (h && h.xp === restoreXp) { reloaded = true; break; } }
      await sleep(1200);
      const after = await readSave();
      return { trial: trialNo, path: pathKind, baseXp: base.xp, trig, restoreTriggeredMsAfterSave: restoreMs, reloadedToRestoreXp: reloaded, afterXp: after.xp, survived: after.xp === restoreXp };
    } else {
      await C.eval(`(function(){ try{ window.__v21._test.activateGuest(); }catch(e){} })()`);
      restoreMs = Date.now() - t0;
      await sleep(2500);
      const after = await readSave();
      const acctHomeXp = await C.eval(`(function(){ try{ var raw=localStorage.getItem('hanvocab.v1.acc.v32-acct'); return raw?JSON.parse(raw).xp:null; }catch(e){ return 'ERR:'+String(e); } })()`);
      return { trial: trialNo, path: pathKind, baseXp: base.xp, trig, restoreTriggeredMsAfterSave: restoreMs, afterXp: after.xp, survived: after.xp === restoreXp, acctHomeXp };
    }
  }
  await step('V32-D-race-v15', async () => {
    const trials = [];
    for (let i = 1; i <= 3; i++) trials.push(await raceTrial('v15', i, 9000 + i));
    return { trials, lost: trials.filter(t => !t.survived).length + '/3' };
  });
  await step('V32-D-race-v20', async () => {
    const trials = [];
    for (let i = 1; i <= 3; i++) trials.push(await raceTrial('v20', i, 9100 + i));
    return { trials, lost: trials.filter(t => !t.survived).length + '/3' };
  });
  await step('V32-D-race-acct', async () => {
    const trials = [];
    for (let i = 1; i <= 3; i++) trials.push(await raceTrial('acct', i, 9200 + i));
    return { trials, lost: trials.filter(t => !t.survived).length + '/3' };
  });

  // ============ V32-E — cloud verify (mock) + offline ============
  await step('V32-E-verify-cloud', async () => {
    await freshSeed(`S0.xp=777; S0.v7=S0.v7||{}; S0.v7.gems=7; S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.langChoice=true;`);
    const r = await C.eval(`(async()=>{
      try{
        window.__savedCloud=null;
        var mock={ kind:'mock',
          load:function(uid){ return Promise.resolve(window.__savedCloud?{saveVersion:12, updatedAt:Date.now(), data:window.__savedCloud}:null); },
          save:function(uid,payload){ window.__savedCloud=payload.data; return Promise.resolve({updatedAt:payload.updatedAt}); },
          signOut:function(){ return Promise.resolve(); } };
        window.__v20sync._test.setAdapter(mock);
        window.__v20sync._test.setConfig({apiKey:'v32-test', projectId:'v32-test'});
        window.__v20sync._test.setUser({uid:'v32-uid', email:'v32@test.local'});
        try{ localStorage.removeItem('hanvocab.v12.meta'); }catch(e){}
        var up=await window.__v20sync.syncNow({auto:false});
        var st0=window.__v31.status();
        var verified=false;
        for(var i=0;i<20;i++){ await new Promise(r=>setTimeout(r,250)); if(window.__v31._test.verifyState()==='verified'){ verified=true; break; } }
        var st1=window.__v31.status();
        window.__v20sync._test.setAdapter(null);
        window.__v20sync._test.setConfig({});
        window.__v20sync._test.setUser(null);
        return { upload: up, verifyStateAfterUpload: st0.verifyState, verified, lastVerifiedCloudAt: st1.lastVerifiedCloudAt,
          historyCloudOk: window.__v31._test.readHistory().some(function(e){ return e.kind==='cloud-upload' && e.ok; }) };
      }catch(e){ return {err:String(e)} }
    })()`, true);
    return r;
  });
  await step('V32-E-offline', async () => {
    await freshSeed(`S0.xp=5000; S0.v7=S0.v7||{}; S0.v7.gems=50; S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.langChoice=true;`);
    await C.eval(`(async()=>{
      var mock={ kind:'mock',
        load:function(uid){ return Promise.resolve(null); },
        save:function(uid,payload){ return Promise.resolve({updatedAt:payload.updatedAt}); },
        signOut:function(){ return Promise.resolve(); } };
      window.__v20sync._test.setAdapter(mock);
      window.__v20sync._test.setConfig({apiKey:'v32-test', projectId:'v32-test'});
      window.__v20sync._test.setUser({uid:'v32-uid', email:'v32@test.local'});
    })()`, true);
    await C.send('Network.enable');
    await C.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await sleep(600);
    const off = await C.eval(`(async()=>{
      var online=navigator.onLine;
      var res=await window.__v20sync.syncNow({});
      var st=window.__v20sync.status();
      var eng=window.__v20sync._test.engine;
      return {online, syncResult:res, cloud:st.cloud, pending:eng.pending};
    })()`, true);
    await C.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await sleep(600);
    const on = await C.eval(`(async()=>{
      window.dispatchEvent(new Event('online'));
      await new Promise(r=>setTimeout(r,1500));
      var st=window.__v20sync.status();
      var eng=window.__v20sync._test.engine;
      return {online:navigator.onLine, cloud:st.cloud, pending:eng.pending};
    })()`, true);
    await C.eval(`(function(){ try{ window.__v20sync._test.setAdapter(null); window.__v20sync._test.setConfig({}); window.__v20sync._test.setUser(null); }catch(e){} })()`);
    return { offline: off, backOnline: on };
  });

  // ============ V32-F — V16.3 regression spot-check ============
  await step('V32-F-regression', async () => {
    const r = {};
    r.smart = await C.eval(`(async()=>{ try{ window.__v27.openSmart('en'); await new Promise(r=>setTimeout(r,700)); var el=document.querySelector('#v27hub'); return {open: !!el && el.style.display!=='none', text:(el?el.textContent:'').slice(0,120)}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v32c-smart');
    await C.eval(`(function(){ try{ window.__v27.closeSmart(); }catch(e){} })()`); await sleep(400);
    r.petHub = await C.eval(`(async()=>{ try{ window.__v23.openHub('pets'); await new Promise(r=>setTimeout(r,700)); var el=document.querySelector('#v23hub,#v23body'); return {open: !!el, hasPetText: (document.body.textContent||'').indexOf('Thú cưng')>=0}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v32c-pethub');
    await C.eval(`(function(){ try{ window.__v23.closeHub(); }catch(e){} })()`); await sleep(400);
    r.boss = await C.eval(`(async()=>{ try{
      window.__v15.choose('en');
      var f=window.__v18.fight('v10_slime','en');
      await new Promise(r=>setTimeout(r,700));
      var F=window.__v18._test.F();
      var before={hp:F?F.hp:null, over:F?F.over:null};
      var picked=window.__v18._test.pickCorrect();
      await new Promise(r=>setTimeout(r,500));
      var F2=window.__v18._test.F();
      return {fightOpened: !!F, before, picked, afterHp: F2?F2.hp:null, afterOver: F2?F2.over:null, fightVisible: !!document.querySelector('#v18fight')};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v32c-boss');
    await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`); await sleep(400);
    r.library = await C.eval(`(async()=>{ try{ window.__v15.openHub('library'); await new Promise(r=>setTimeout(r,800)); var hub=document.querySelector('#v15hub'); return {open: !!hub, textLen: (hub?hub.textContent:'').length, snippet:(hub?hub.textContent:'').slice(0,150)}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v32c-library');
    r.login = await C.eval(`(async()=>{ try{ window.__v21.openAuth('login'); await new Promise(r=>setTimeout(r,600)); var a=document.querySelector('#v21auth'); var t=a?a.textContent:''; window.__v21.closeAuth?window.__v21.closeAuth():null; return {open: !!a, hasEmail: /Email/.test(t)}; }catch(e){ return {err:String(e)} } })()`, true);
    r.consoleErrors = C.consoleErrors;
    r.consoleErrorCount = C.consoleErrors.length;
    r.dialogsTotal = C.dialogs.length;
    return r;
  });

  // ============ V32-G — monitor UI at 360/390/430, no overflow ============
  await step('V32-G-monitor-widths', async () => {
    const widths = {};
    for (const w of [360, 390, 430]) {
      await C.send('Emulation.setDeviceMetricsOverride', { width: w, height: 844, deviceScaleFactor: 2, mobile: true });
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('backup'); }catch(e){} })()`);
      await sleep(900);
      widths[w] = await C.eval(`(function(){ try{
        var de=document.documentElement;
        var mon=document.querySelector('#v32monitor');
        var panel=document.querySelector('#v20panel');
        return {innerWidth: window.innerWidth, docScrollW: de.scrollWidth, noDocOverflow: de.scrollWidth<=window.innerWidth,
          monScrollW: mon?mon.scrollWidth:null, monNoOverflow: mon?mon.scrollWidth<=window.innerWidth:null,
          panelScrollW: panel?panel.scrollWidth:null, monPresent: !!mon};
      }catch(e){ return {err:String(e)} } })()`);
      await shot('v32c-monitor-' + w);
    }
    await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    return widths;
  });

  // ============ V32-H — bad-version real import ============
  await step('V32-H-bad-version-import', async () => {
    await freshSeed(`S0.xp=2000; S0.v7=S0.v7||{}; S0.v7.gems=20; S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.langChoice=true;`);
    const before = await readSave();
    const bad = await buildRestoreSave(2999, ``);
    bad.v7.meta = { saveVersion: 99 };
    const fpBad = fixture('v32h-bad-version.json', bad);
    await C.eval(`(function(){ var i=document.createElement('input'); i.type='file'; i.id='v32-hinput'; document.body.appendChild(i); })()`);
    const d0 = C.dialogs.length;
    await setFileOnInput('#v32-hinput', fpBad);
    await C.eval(`(function(){ var i=document.querySelector('#v32-hinput'); try{ window.__v20.importFile(i); }catch(e){} })()`);
    await sleep(1500);
    const afterBad = await readSave();
    const good = await buildRestoreSave(3333, `S0.v7.gems=33;`);
    good.v7.meta = { saveVersion: 12 };
    const fpGood = fixture('v32h-good-version.json', good);
    await C.eval(`(function(){ var i=document.querySelector('#v32-hinput'); i.value=''; })()`);
    await setFileOnInput('#v32-hinput', fpGood);
    await C.eval(`(function(){ var i=document.querySelector('#v32-hinput'); try{ window.__v20.importFile(i); }catch(e){} })()`);
    await sleep(2500);
    const afterGood = await readSave();
    return { beforeXp: before.xp,
      badDialogs: C.dialogs.slice(d0).map(d => d.type + ':' + d.message.slice(0, 200)),
      badRejectedIntact: afterBad.xp === before.xp,
      validApplied: afterGood.xp === 3333 && afterGood.gems === 33 };
  });

  // ============ V32-I — C9 Account Center restore ============
  await step('V32-I-c9-acct-restore', async () => {
    await freshSeed(`S0.xp=2000; S0.v7=S0.v7||{}; S0.v7.gems=20; S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.langChoice=true;`);
    const good = await buildRestoreSave(4321, `S0.v7.gems=43;`);
    const fp = fixture('v32c-c9-valid.json', good);
    await C.eval(`(function(){ try{ window.__v21.openAccount('backup'); }catch(e){} })()`);
    await sleep(900);
    const acctBefore = await C.eval(`(function(){ return {hasImport: !!document.querySelector('#v21importfile'), hasAcctSection: !!document.querySelector('#v31acct'), hasMonitor: !!document.querySelector('#v32monitor')}; })()`);
    await shot('v32c-acct');
    const d0 = C.dialogs.length;
    const setR = await setFileOnInput('#v21importfile', fp);
    await sleep(1200);
    const msg = await C.eval(`(function(){ var m=document.querySelector('#v21bakmsg'); return m?m.textContent:null; })()`);
    await sleep(2500);
    const after = await readSave();
    const bad = await buildRestoreSave(2999, ``); bad.cards = [{ id: 'x' }];
    const fpBad = fixture('v32c-c9-bad.json', bad);
    await C.eval(`(function(){ try{ window.__v21.openAccount('backup'); }catch(e){} })()`); await sleep(800);
    const d1 = C.dialogs.length;
    await setFileOnInput('#v21importfile', fpBad);
    await sleep(1500);
    const afterBad = await readSave();
    return { acctBefore, setFileOk: setR.ok, msgAfterValid: msg, afterValidXp: after.xp, validApplied: after.xp === 4321,
      badDialogs: C.dialogs.slice(d1).map(d => d.type + ':' + d.message.slice(0, 200)),
      afterBadXp: afterBad.xp, badIntact: afterBad.xp === 4321 };
  });

  // ============ V32-J — R2/R3/R6 regression (invalid restore, proto, export) ============
  await step('V32-J-r2-invalid-restore', async () => {
    await freshSeed(`S0.xp=2000; S0.v7=S0.v7||{}; S0.v7.gems=20; S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.langChoice=true; S0.v7.en15.lang='en';`);
    const before = await readSave();
    await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('backup'); }catch(e){} })()`);
    await sleep(700);
    const bad1 = await buildRestoreSave(2999, ``); bad1.cards = [{ id: 'x' }];
    const fp1 = fixture('r2-badcard.json', bad1);
    const d0 = C.dialogs.length;
    await setFileOnInput('#v15-restore', fp1);
    await sleep(1500);
    const afterBad1 = await readSave();
    const bad2 = await buildRestoreSave(2998, ``); delete bad2.cards;
    const fp2 = fixture('r2-nocards.json', bad2);
    await C.eval(`(function(){ try{ window.__v15.openHub('backup'); }catch(e){} })()`); await sleep(600);
    const d1 = C.dialogs.length;
    await setFileOnInput('#v15-restore', fp2);
    await sleep(1500);
    const afterBad2 = await readSave();
    const good = await buildRestoreSave(3333, `S0.v7.gems=33;`);
    const fp3 = fixture('r2-valid.json', good);
    await C.eval(`(function(){ try{ window.__v15.openHub('backup'); }catch(e){} })()`); await sleep(600);
    await setFileOnInput('#v15-restore', fp3);
    await sleep(2500);
    const afterGood = await readSave();
    return { beforeXp: before.xp,
      badCard: { dialogs: C.dialogs.slice(d0).map(d => d.type + ':' + d.message.slice(0, 200)), intact: afterBad1.xp === before.xp },
      noCards: { dialogs: C.dialogs.slice(d1).map(d => d.type + ':' + d.message.slice(0, 200)), intact: afterBad2.xp === before.xp },
      validApplied: afterGood.xp === 3333 && afterGood.gems === 33 };
  });
  await step('V32-J-r3-proto', async () => {
    await freshSeed(`S0.xp=1500; S0.v7=S0.v7||{}; S0.v7.gems=15; S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.langChoice=true;`);
    const crafted = await buildRestoreSave(1501, `S0.v7.en27={v:1,created:Date.now(),en:{last:{},cw:{},cr:{}},ko:{right:{},wrong:{},cw:{},cr:{},last:{}},plan:{en:{d:'',mins:10,newN:5,dueN:10,weakN:5,ids:[],doneIds:[],goals:{complete:false,acc80:false,weak5:false}},ko:{d:'',mins:10,newN:5,dueN:10,weakN:5,ids:[],doneIds:[],goals:{complete:false,acc80:false,weak5:false}}},sessions:[],days:{},streak:{en:{d:'',n:0},ko:{d:'',n:0}},claimed:{},uiLang:'en'};`);
    let rawCrafted = JSON.stringify(crafted).replace('"last":{}', '"last":{"__proto__":{"polluted":"V32MARKER"}}');
    const validateDirect = await C.eval(`(function(){ try{ var j=JSON.parse(${JSON.stringify(rawCrafted)}); return window.__v20sync.validateSave(j); }catch(e){ return {err:String(e)} } })()`);
    const fp = fixture('r3-proto.json', rawCrafted);
    await C.eval(`(function(){ var i=document.createElement('input'); i.type='file'; i.id='v32-v20input3'; document.body.appendChild(i); })()`);
    await setFileOnInput('#v32-v20input3', fp);
    await C.eval(`(function(){ var i=document.querySelector('#v32-v20input3'); try{ window.__v20.importFile(i); }catch(e){} })()`);
    await sleep(2500);
    const afterImport = await C.eval(`(function(){ try{
      var j=JSON.parse(localStorage.getItem('hanvocab.v1'));
      return {xp:j.xp, polluted: (typeof ({}).polluted==='undefined'?'undefined':String(({}).polluted)), rawHasMarker: (localStorage.getItem('hanvocab.v1')||'').indexOf('V32MARKER')>=0};
    }catch(e){ return {err:String(e)} } })()`);
    const afterRecord = await C.eval(`(function(){ try{
      window.__v27.recordAnswer('en','testword-v32',true,'smart');
      window.__v27.recordAnswer('en','__proto__',true,'smart');
      return {polluted: (typeof ({}).polluted==='undefined'?'undefined':String(({}).polluted)), protoPolluted: (typeof Object.prototype.polluted==='undefined'?'undefined':String(Object.prototype.polluted))};
    }catch(e){ return {err:String(e)} } })()`);
    return { validateSaveDirect: validateDirect, afterImport, afterRecord };
  });
  await step('V32-J-r6-export', async () => {
    await freshSeed(`S0.xp=1234; S0.v7=S0.v7||{}; S0.v7.gems=55; S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.langChoice=true;
      S0.v7.en={box:{w1:3,w2:2},right:{w1:5,w2:3},wrong:{},review:[],done:{},custom:[]};
      S0.v7.en18={bosses:{v18_slime:{win:1,wins:1,at:Date.now()}}};
      S0.v7.en23={pets:{pet1:{id:'pet1',sp:'phoenix',st:0,lv:5,xp:10,aff:20,sk:['a'],hatchedAt:Date.now()}},eggs:{fire:1,forest:1},hatch:null,mats:{},team:['pet1',null,null],claimed:{},affClaimed:{},created:Date.now()};
      S0.v7.en22={quest:{'1':{stars:3,best:100,attempts:1,lastAt:Date.now()}},created:Date.now()};`);
    const before = await readSave();
    const exp = await C.eval(`(async()=>{
      window.__v32blob=null;
      const OrigBlob=window.Blob;
      window.Blob=function(parts,opts){ try{ window.__v32blob=String(parts&&parts[0]||''); }catch(e){} return new OrigBlob(parts,opts); };
      try{ window.__v15.backupExport(); }catch(e){ return {err:String(e)} }
      await new Promise(r=>setTimeout(r,600));
      window.Blob=OrigBlob;
      if(!window.__v32blob) return {err:'no-blob-captured'};
      var j; try{ j=JSON.parse(window.__v32blob); }catch(e){ return {err:'blob-not-json:'+String(e)} }
      return {blobLen: window.__v32blob.length, rawLen:(localStorage.getItem('hanvocab.v1')||'').length,
        identicalToLocalStorage: window.__v32blob===(localStorage.getItem('hanvocab.v1')||''),
        xp:j.xp, pets:Object.keys((j.v7&&j.v7.en23&&j.v7.en23.pets)||{}),
        en18wins:(function(){var b=j.v7&&j.v7.en18&&j.v7.en18.bosses||{};var n=0;for(var k in b) if(b[k]&&b[k].win)n++;return n})(),
        en27sessions:((j.v7&&j.v7.en27&&j.v7.en27.sessions)||[]).length, en22quest:Object.keys((j.v7&&j.v7.en22&&j.v7.en22.quest)||{}) };
    })()`, true);
    await reloadWait(2000);
    const after = await readSave();
    return { before, export: exp, afterReload: after, persistOK: before.xp === after.xp && before.pets === after.pets };
  });

  note('CONSOLE_ERRORS_TOTAL', C.consoleErrors.length, JSON.stringify(C.consoleErrors).slice(0, 2000));
  note('CONSOLE_WARNS_TOTAL', C.consoleWarns.length);
  writeSmall(path.join(DIR, 'logs', 'v32c-results.json'), JSON.stringify(R, null, 2));
  writeSmall(path.join(DIR, 'logs', 'v32c-run.log'), log.join('\n') + '\n');
  writeSmall(path.join(DIR, 'logs', 'v32c-console-errors.json'), JSON.stringify(C.consoleErrors, null, 2));
  writeSmall(path.join(DIR, 'logs', 'v32c-dialogs.json'), JSON.stringify(C.dialogs, null, 2));
  note('DONE');
  try { C.close(); } catch (e) {}
  if (chromeProc) { try { chromeProc.kill('SIGTERM'); } catch (e) {} }
  setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('FATAL', e); try { if (chromeProc) chromeProc.kill('SIGTERM'); } catch (_) {} process.exit(1); });
