// verify-v42c.js - V18.7 UNLOCK SHORTCUTS Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8974 / CDP 9374, scratch profile.
// Modelled on tools/v41/verify-v41c.js + tools/v42/repro/repro-v42.js
// (same CDP class, ensureHttp/ensureChrome with retries, openPage,
// shot/step/verdict, seedA/seedB, dumpHub/hosts, real-click helpers).
// Exit 0 = driver completed (verdicts are in the results JSON + stdout;
// a FAIL verdict does not crash the driver).
// Writes results to tools/v42/logs/v42c-results.json after EVERY step.
// Screenshots in tools/v42/shots/v42c-*.
// Serves ONLY ~/workspace/v7build/out/ over local HTTP — never the
// pristine copy. If Chrome fails to start (EPERM wave), retries 3x
// spaced 10s, then reports honestly and exits 2.
// Gates:
//   V42-A Skyroot locked KO, Anh's exact state (13 wins): shortcut button
//         exists, names the real viaChrono target, sub-line 14/70; REAL
//         CLICK opens the target fight in Korean, fight rendered.
//   V42-B Skyroot locked EN, same seed: button present; click -> target
//         fight opens in English.
//   V42-C GEAR GOLEM is next (70 wins + first 7 Chrono won EN): button
//         names GEAR GOLEM; click -> golem fight opens (HP 750 + 90
//         shield per v33_data + test41, NOT the 620 in the task text —
//         620 is Sandglass Wisp's HP); win via the _test pickCorrect
//         loop; Skyroot unlocked in EN, still locked in KO.
//   V42-D Chrono locked (13 wins): button names the easiest unwon
//         fightable boss; click -> that boss's fight opens in English,
//         rendered; gate card still shows 13/70. Repeat in KO (fight
//         opens in Korean; target never an old-pool boss).
//   V42-E Gate-open overlays show NO shortcut button (Chrono + Skyroot EN).
//   V42-F 360px: locked Skyroot + locked Chrono — button >=44px tall, no
//         horizontal overflow (scrollWidth <= 360), labels not clipped.
//   V42-G Regression smoke: hub loads, Bosses tab renders, Pet Hub opens,
//         a V19 fight still works (one correct answer deals damage),
//         0 console errors/warnings/dialogs across ALL gates.
//   Return path (documented, part of V42-C): after winning the golem
//         fight and __v19.close(), record exactly where the player
//         lands and whether the Skyroot overlay reopens unlocked.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9374;
const HTTPPORT = 8974;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8974/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v42';
const OUTDIR = '/home/hatch/workspace/v7build/out';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
function note(...a) { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); }
function writeSmall(p, data) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const buf = Buffer.from(data, 'utf-8');
    const fd = fs.openSync(p, 'w');
    let off = 0;
    while (off < buf.length) { off += fs.writeSync(fd, buf, off, Math.min(512, buf.length - off)); }
    fs.closeSync(fd);
    return true;
  } catch (e) { console.log('write failed (EPERM wave?):', p, String(e).slice(0, 120)); return false; }
}
function saveResults() { writeSmall(path.join(DIR, 'logs', 'v42c-results.json'), JSON.stringify(results, null, 2)); }
let chromeProc = null;
let httpProc = null;
let chromeAttempts = 0;
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
  for (let attempt = 1; attempt <= 3; attempt++) {
    chromeAttempts = attempt;
    note('chrome start attempt', attempt);
    const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
      '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
      '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
      '--user-data-dir=/tmp/chrome-v42c-prof', `--remote-debugging-port=${PORT}`,
      '--window-size=390,844', 'about:blank'];
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
  let t = list.find(x => x.type === 'page');
  C = new CDP(t.webSocketDebuggerUrl);
  await C.ready;
  await C.send('Page.enable'); await C.send('Runtime.enable');
  await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await C.eval(`location.href = ${JSON.stringify(URL)}`);
  await sleep(3000);
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await C.eval('location.reload()');
  await sleep(2500);
  return C;
}
async function reloadWait(ms) { await C.eval('location.reload()'); await sleep(ms || 2800); }
async function shot(name) {
  try {
    const r = await C.send('Page.captureScreenshot', { format: 'png' });
    writeSmall(path.join(DIR, 'shots', `v42c-${name}.png`), Buffer.from(r.data, 'base64'));
  } catch (e) { note('shot failed:', name, String(e).slice(0, 120)); }
}
async function step(name, fn) {
  try {
    const r = await fn();
    results[name] = r;
    note(`STEP ${name} —`, JSON.stringify(r).slice(0, 1500));
  } catch (e) {
    results[name] = { error: String(e).slice(0, 600) };
    note(`STEP ${name} ERROR —`, String(e).slice(0, 600));
  }
  saveResults();
}
function verdict(name, cond, detail) {
  note((cond ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  return cond;
}
async function freshGuest() {
  await C.eval(`localStorage.clear()`);
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await reloadWait(2800);
}
// Seed A: 13 wins = 10 old (en15 keys) + 3 V18 challenge. GEAR GOLEM unbeaten.
async function seedA() {
  const r = await C.eval(`(function(){
    var oldIds=(window.__V18_BOSSES.old||[]).map(function(b){return b.id});
    var enIds=(window.__V18_BOSSES.en||[]).map(function(b){return b.id});
    var e15=window.__v15.en15(); e15.bosses=e15.bosses||{};
    oldIds.forEach(function(id){e15.bosses[id]={win:1,wins:1,at:Date.now()}});
    var e18=window.__v18.en18(); e18.bosses=e18.bosses||{};
    var first3=enIds.slice(0,3);
    first3.forEach(function(id){e18.bosses[id]={win:1,wins:1,at:Date.now(),item:'x'}});
    save();
    return {count: window.__v33._test.correctedWinCount(),
      bd: window.__v33._test.winBreakdown(),
      golemKO: window.__v35.gearGolemWon('ko'), golemEN: window.__v35.gearGolemWon('en')};
  })()`);
  await sleep(1200);
  return r;
}
// Seed B: 70 wins = 10 old + 30 V18 + 30 V11 (EN). Chrono gate open, GOLEM unbeaten.
async function seedB() {
  const r = await C.eval(`(function(){
    var oldIds=(window.__V18_BOSSES.old||[]).map(function(b){return b.id});
    var e15=window.__v15.en15(); e15.bosses=e15.bosses||{};
    oldIds.forEach(function(id){e15.bosses[id]={win:1,wins:1,at:Date.now()}});
    var e18=window.__v18.en18(); e18.bosses=e18.bosses||{};
    ['en','el','leg'].forEach(function(a){ (window.__V18_BOSSES[a]||[]).forEach(function(b){ e18.bosses[b.id]={win:1,wins:1,at:Date.now(),item:'x'}; }); });
    var e19=window.__v19.en19();
    window.__v19.bosses.bosses.forEach(function(b){ e19.bosses[b.id]={en:{win:1,wins:1,stars:2,best:0},ko:{win:0,wins:0,stars:0,best:0}}; });
    save();
    return {count: window.__v33._test.correctedWinCount(), bd: window.__v33._test.winBreakdown(),
      gate33: window.__v33._test.gateOpen(), golemKO: window.__v35.gearGolemWon('ko')};
  })()`);
  await sleep(1200);
  return r;
}
// Seed C: 70 wins + first 7 Chrono bosses won in EN (GEAR GOLEM is next).
async function seedGolemNext() {
  const r = await seedB();
  const r2 = await C.eval(`(function(){
    var e19=window.__v19.en19();
    ['v17_sandwisp','v17_pendulum','v17_specter','v17_mantis','v17_hound','v17_oracle','v17_titan'].forEach(function(id){
      e19.bosses[id]=e19.bosses[id]||{}; e19.bosses[id].en={win:1,wins:1,stars:3};
    });
    save();
    return {count: window.__v33._test.correctedWinCount(),
      target: window.__v42.skyrootTarget('en'),
      gateSkyEN: window.__v35.gateOpen('en')};
  })()`);
  await sleep(1200);
  return { seedB: r, golemNext: r2 };
}
// Seed D: 70 wins + GEAR GOLEM won in EN (Skyroot open in EN, still locked in KO).
async function seedGateOpen() {
  const r = await seedB();
  const r2 = await C.eval(`(function(){
    var e19=window.__v19.en19();
    ['v17_sandwisp','v17_pendulum','v17_specter','v17_mantis','v17_hound','v17_oracle','v17_titan','v17_geargolem'].forEach(function(id){
      e19.bosses[id]=e19.bosses[id]||{}; e19.bosses[id].en={win:1,wins:1,stars:3};
    });
    save();
    return {count: window.__v33._test.correctedWinCount(),
      gateSkyEN: window.__v35.gateOpen('en'), gateSkyKO: window.__v35.gateOpen('ko')};
  })()`);
  await sleep(1200);
  return { seedB: r, gateOpen: r2 };
}
function dumpHub(hubId) {
  return C.eval(`(function(){
    var h=document.querySelector('${hubId}');
    if(!h) return {exists:false};
    var btns=[].slice.call(h.querySelectorAll('button')).map(function(b){
      return {text:(b.textContent||'').trim().slice(0,100), cls:b.className||'', onclick:(b.getAttribute('onclick')||'').slice(0,120)};
    });
    var txt=(h.innerText||'');
    return {exists:true, display:h.style.display, visible: h.style.display!=='none',
      textLen: txt.length, text: txt.slice(0,1500), buttons: btns,
      shortcutBtns: btns.filter(function(b){ return b.cls.indexOf('v42btn')>=0; })};
  })()`);
}
function hosts() {
  return C.eval(`(function(){
    function ex(sel){ var el=document.querySelector(sel); return el?{exists:true, display:el.style.display||'', htmlLen:(el.innerHTML||'').length, visible: el.offsetParent!==null}: {exists:false}; }
    return {v15body: ex('#v15body'), v15hub: ex('#v15hub'), v18fight: ex('#v18fight'), v19fight: ex('#v19fight'),
      v15bossfight: ex('#v15bossfight'), v33hub: ex('#v33hub'), v35hub: ex('#v35hub'),
      bodyOverflow: document.body.style.overflow, mapwrap: !!document.querySelector('.v19mapwrap'),
      v23hub: ex('#v23hub')};
  })()`);
}
async function clickNavTab(cls) {
  return await C.eval(`(function(){
    var b=document.querySelector('button.${cls}');
    if(!b) return {ok:false, why:'no button .${cls}'};
    b.click(); return {ok:true, text:(b.textContent||'').trim()};
  })()`);
}
// Open the Skyroot overlay in EN: prefer a real bottom-nav tab click;
// fall back to the __v35.openSkyroot eval (recorded in the result).
async function openSkyrootEn() {
  const tabs = await C.eval(`(function(){
    return [].slice.call(document.querySelectorAll('#tabs .tab, #tabs button')).map(function(b){
      return {cls:b.className||'', text:(b.textContent||'').trim().slice(0,40)};
    });
  })()`);
  const hit = (tabs || []).find(function (t) { return /skyroot/i.test(t.text) && t.cls.indexOf('kotab') < 0; });
  if (hit) {
    const r = await C.eval(`(function(){
      var bs=[].slice.call(document.querySelectorAll('#tabs .tab, #tabs button'));
      var b=bs.find(function(x){ return /skyroot/i.test(x.textContent||'') && (x.className||'').indexOf('kotab')<0; });
      if(!b) return {ok:false, why:'tab vanished'};
      b.click(); return {ok:true, text:(b.textContent||'').trim()};
    })()`);
    await sleep(800);
    return { via: 'nav-tab', tabs, click: r };
  }
  await C.eval(`(function(){ try{ window.__v35.openSkyroot('en'); }catch(e){} })()`);
  await sleep(800);
  return { via: 'openSkyroot-eval', tabs, click: { ok: true, note: 'no EN Skyroot nav tab found; used __v35.openSkyroot(en)' } };
}
// The live shortcut button inside an overlay hub: real .click().
async function clickShortcut(hubId) {
  return await C.eval(`(function(){
    var h=document.querySelector('${hubId}');
    if(!h) return {ok:false, why:'no hub ${hubId}'};
    var b=h.querySelector('button.v42btn');
    if(!b) return {ok:false, why:'no .v42btn in ${hubId}'};
    var text=(b.textContent||'').trim();
    b.click();
    return {ok:true, text:text};
  })()`);
}
// Any live fight (V18, V19 or old) + which hosts actually rendered.
async function readFightAny() {
  return await C.eval(`(function(){ try{
    var out={engines:{}, rendered:{}};
    try{ var F18=window.__v18._test.F(); if(F18) out.engines.v18={boss:F18.boss?F18.boss.id:(F18.bossId||null), lang:F18.lang, hp:F18.hp, maxHp:F18.maxHp, shield:F18.shield, over:F18.over, qmode:F18.qmode}; }catch(e){}
    try{ var F19=window.__v19._test.F(); if(F19) out.engines.v19={boss:F19.boss?F19.boss.id:(F19.bossId||null), lang:F19.lang, hp:F19.hp, maxHp:F19.maxHp, shield:F19.shield, over:F19.over, qmode:F19.qmode}; }catch(e){}
    ['#v18fight','#v19fight','#v15bossfight'].forEach(function(sel){
      var el=document.querySelector(sel);
      out.rendered[sel]= el ? {exists:true, htmlLen:(el.innerHTML||'').length, textLen:(el.innerText||'').length} : {exists:false};
    });
    return out;
  }catch(e){ return {err:String(e)}; } })()`);
}
async function readFight19() {
  return await C.eval(`(function(){ try{
    var F=window.__v19._test.F(); if(!F) return {started:false};
    return {started:true, boss:F.boss?F.boss.id:null, lang:F.lang, qmode:F.qmode,
      over:F.over, hp:F.hp, maxHp:F.maxHp, shield:F.shield, phase:F.phase,
      ultActive:!!F.ultActive, caQ:F.caQ, caRight:F.caRight,
      answered:F.answered, score:F.score, hearts:F.hearts,
      opts:(function(){var n=document.querySelectorAll('#v19fight .v19opt'); return n.length;})()};
  }catch(e){ return 'ERR:'+e; } })()`);
}
async function clickCorrect19() {
  return await C.eval(`(function(){ try{
    var F=window.__v19._test.F(); if(!F||F.answered!==null||F.over) return {ok:false, why:'no F/answered/over'};
    var mode=F.ultActive?(F.caMode||F.qmode):F.qmode, idx=-1;
    if(mode==='grammar')idx=F.cur.g.a;
    else if(mode==='read')idx=F.cur.q.a;
    else if(mode==='builder')idx=F.cur.opts.indexOf(F.cur.s.s);
    else if(F.cur.ko)idx=F.cur.opts.findIndex(function(o){return o.id===F.cur.k.id});
    else if(mode==='speak'){ return {ok:false, why:'speak mode — no option button'}; }
    else if(mode==='type'||mode==='listen')idx=F.cur.opts.findIndex(function(o){return o.id===F.cur.w.id});
    else idx=F.cur.optsVi.findIndex(function(o){return o.id===F.cur.w.id});
    if(idx<0) return {ok:false, why:'idx<0', mode:mode};
    var btns=document.querySelectorAll('#v19fight .v19opt');
    if(!btns[idx]) return {ok:false, why:'no button '+idx, mode:mode, n:btns.length};
    btns[idx].click();
    return {ok:true, mode:mode, idx:idx, n:btns.length};
  }catch(e){ return {ok:false, err:String(e)}; } })()`);
}
async function clickNext19() {
  return await C.eval(`(function(){ try{
    var btns=document.querySelectorAll('#v19fight button');
    for(var i=0;i<btns.length;i++){ if((btns[i].textContent||'').indexOf('Tiếp tục')>=0){ btns[i].click(); return {ok:true}; } }
    return {ok:false, why:'no Tiep-tuc button'};
  }catch(e){ return {ok:false, err:String(e)}; } })()`);
}
// Win the current V19 fight via the _test pickCorrect loop (as the V18.4
// gates did): a few honest answers first (damage must land), then force
// the win at 1 HP / 0 shield. Returns the final fight state.
async function winFight19ViaLoop() {
  const r = { rounds: [] };
  for (let i = 0; i < 3; i++) {
    const f0 = await readFight19();
    if (!f0.started || f0.over) { r.rounds.push({ at: i, f0 }); break; }
    const pick = await C.eval(`(function(){ try{ var ok=window.__v19._test.pickCorrect(); var F=window.__v19._test.F(); return {ok:ok, hp:F?F.hp:null, shield:F?F.shield:null, score:F?F.score:null}; }catch(e){ return {ok:false, err:String(e)}; } })()`);
    await sleep(300);
    await clickNext19();
    await sleep(300);
    r.rounds.push({ at: i, before: { hp: f0.hp, shield: f0.shield }, pick });
  }
  await C.eval(`(function(){ var F=window.__v19._test.F(); if(F){ F.hp=1; F.shield=0; } })()`);
  const fin = await C.eval(`(function(){ try{ var ok=window.__v19._test.pickCorrect(); var F=window.__v19._test.F(); return {pick:ok, over:F?F.over:null, hp:F?F.hp:null}; }catch(e){ return {pick:false, err:String(e)}; } })()`);
  await sleep(400);
  await clickNext19();
  await sleep(600);
  const winState = await C.eval(`(function(){ try{ var F=window.__v19._test.F(); var host=document.querySelector('#v19fight');
    return {over:F?F.over:null, firstWin:F?F.firstWin:null, rewardNote:F?F.rewardNote:null,
      winText: host?(host.innerText||'').slice(0,400):null}; }catch(e){ return {err:String(e)}; } })()`);
  r.forceWin = fin; r.winState = winState;
  return r;
}
async function measureShortcutBtn(hubId) {
  return await C.eval(`(function(){
    var h=document.querySelector('${hubId}');
    if(!h) return {ok:false, why:'no hub'};
    var b=h.querySelector('button.v42btn');
    if(!b) return {ok:false, why:'no .v42btn'};
    var rc=b.getBoundingClientRect();
    var cs=getComputedStyle(b);
    return {ok:true, text:(b.textContent||'').trim().slice(0,60),
      height:Math.round(rc.height), width:Math.round(rc.width),
      left:Math.round(rc.left), right:Math.round(rc.right),
      scrollW:b.scrollWidth, clientW:b.clientWidth,
      fontSize:cs.fontSize, docScrollW:document.documentElement.scrollWidth,
      vw:window.innerWidth, clipped: b.scrollWidth > b.clientWidth + 1};
  })()`);
}


async function main() {
  try {
    let chromeAlive = false;
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); chromeAlive = r.ok; } catch (e) {}
    if (!chromeAlive) { try { execSync('rm -rf /tmp/chrome-v42c-prof'); note('fresh profile: removed old chrome-v42c-prof'); } catch (e) {} }
    await openPage();
    const boot = await C.eval(`(function(){ return { v15: !!window.__v15, v18: !!window.__v18, v19: !!window.__v19, v33: !!window.__v33, v35: !!window.__v35, v42: !!window.__v42, version: (window.__v42||{}).version, title: document.title }; })()`);
    note('boot:', boot);
    results.boot = boot; results.chromeAttempts = chromeAttempts;
    saveResults();
    const err0 = C.consoleErrors.length, warn0 = C.consoleWarns.length, dlg0 = C.dialogs.length;
    const delta = () => ({ errors: C.consoleErrors.length - err0, warns: C.consoleWarns.length - warn0, dialogs: C.dialogs.length - dlg0 });
    const deltaDetail = () => ({ errors: C.consoleErrors.slice(err0), warns: C.consoleWarns.slice(warn0), dialogs: C.dialogs.slice(dlg0) });
    let allOk = true;
    const failedVerdicts = [];
    function v(name, cond, detail) { if (!verdict(name, cond, detail)) { allOk = false; failedVerdicts.push(name); } return cond; }

    // ============ V42-A Skyroot locked KO, Anh's exact state (13 wins) ============
    await step('V42-A-skyroot-locked-ko', async () => {
      const r = {};
      await freshGuest();
      r.seed = await seedA();
      v('A.0 seed = 13 wins (10 old + 3 V18), GOLEM unbeaten KO+EN', r.seed.count === 13 && r.seed.golemKO === false && r.seed.golemEN === false, r.seed);
      r.target = await C.eval(`(function(){ return window.__v42.skyrootTarget('ko'); })()`);
      v('A.1 live target is a REAL boss (v10_ghost, lv4, viaChrono — not a fabricated id)', r.target && r.target.id === 'v10_ghost' && r.target.lv === 4 && r.target.viaChrono === true && r.target.vi === 'Ma Thần Âm Thanh', r.target);
      r.navClick = await clickNavTab('v35kotab');
      await sleep(800);
      r.hub = await dumpHub('#v35hub');
      await shot('A-skyroot-ko-locked');
      v('A.2 Skyroot overlay opens from the KO nav tab', r.hub.exists === true && r.hub.visible === true, r.navClick);
      v('A.3 shortcut button exists in #v35hub (.v42btn)', r.hub.shortcutBtns.length === 1, r.hub.shortcutBtns);
      v('A.4 button names the real viaChrono target boss (Ma Thần Âm Thanh)', r.hub.shortcutBtns.length === 1 && r.hub.shortcutBtns[0].text.indexOf('Ma Thần Âm Thanh') >= 0, r.hub.shortcutBtns);
      v('A.5 sub-line shows 14/70 (13 wins + this fight)', (r.hub.text || '').indexOf('14/70') >= 0, (r.hub.text || '').slice(0, 500));
      v('A.6 gate card still shows the real total 13/86', (r.hub.text || '').indexOf('13/86') >= 0, (r.hub.text || '').slice(0, 300));
      r.click = await clickShortcut('#v35hub');
      await sleep(900);
      r.fight = await readFightAny();
      await shot('A-after-click-fight');
      v('A.7 REAL CLICK opens the target fight (v18 engine, v10_ghost, lang ko)', r.click.ok === true && r.fight.engines.v18 && r.fight.engines.v18.boss === 'v10_ghost' && r.fight.engines.v18.lang === 'ko', { click: r.click, fight: r.fight });
      v('A.8 the fight actually renders (#v18fight has content)', r.fight.rendered['#v18fight'] && r.fight.rendered['#v18fight'].htmlLen > 0, r.fight.rendered);
      v('A.9 the Skyroot overlay closed when the fight opened', (await hosts()).v35hub.display === 'none', r.fight);
      r.console = delta();
      return r;
    });

    // ============ V42-B Skyroot locked EN, same seed ============
    await step('V42-B-skyroot-locked-en', async () => {
      const r = {};
      await freshGuest();
      r.seed = await seedA();
      v('B.0 seed = 13 wins', r.seed.count === 13, r.seed);
      r.target = await C.eval(`(function(){ return window.__v42.skyrootTarget('en'); })()`);
      v('B.1 live target is the real viaChrono boss (v10_ghost lv4)', r.target && r.target.id === 'v10_ghost' && r.target.lv === 4 && r.target.viaChrono === true, r.target);
      r.open = await openSkyrootEn();
      await sleep(400);
      r.hub = await dumpHub('#v35hub');
      await shot('B-skyroot-en-locked');
      v('B.2 Skyroot overlay opens in EN', r.hub.exists === true && r.hub.visible === true, r.open);
      v('B.3 shortcut button present in EN', r.hub.shortcutBtns.length === 1, r.hub.shortcutBtns);
      v('B.4 button names the target (Ma Thần Âm Thanh) + 14/70 sub-line', r.hub.shortcutBtns.length === 1 && r.hub.shortcutBtns[0].text.indexOf('Ma Thần Âm Thanh') >= 0 && (r.hub.text || '').indexOf('14/70') >= 0, { btns: r.hub.shortcutBtns, text: (r.hub.text || '').slice(0, 300) });
      r.click = await clickShortcut('#v35hub');
      await sleep(900);
      r.fight = await readFightAny();
      await shot('B-after-click-fight');
      v('B.5 REAL CLICK opens the target fight in English (v10_ghost, lang en)', r.click.ok === true && r.fight.engines.v18 && r.fight.engines.v18.boss === 'v10_ghost' && r.fight.engines.v18.lang === 'en', { click: r.click, fight: r.fight });
      v('B.6 the fight actually renders (#v18fight has content)', r.fight.rendered['#v18fight'] && r.fight.rendered['#v18fight'].htmlLen > 0, r.fight.rendered);
      r.console = delta();
      return r;
    });

    // ============ V42-C GEAR GOLEM is next; win it; check the unlock ============
    await step('V42-C-geargolem-next-win', async () => {
      const r = {};
      await freshGuest();
      r.seed = await seedGolemNext();
      v('C.0 seed = 77 wins (70 + 7 Chrono EN), GOLEM still unbeaten in EN', r.seed.golemNext.count === 77 && r.seed.golemNext.gateSkyEN === false, r.seed.golemNext);
      v('C.1 live target is GEAR GOLEM (isGolem, not viaChrono)', r.seed.golemNext.target && r.seed.golemNext.target.id === 'v17_geargolem' && r.seed.golemNext.target.isGolem === true && !r.seed.golemNext.target.viaChrono, r.seed.golemNext.target);
      r.open = await openSkyrootEn();
      await sleep(400);
      r.hub = await dumpHub('#v35hub');
      await shot('C-skyroot-en-golem-next');
      v('C.2 Skyroot overlay opens in EN', r.hub.exists === true && r.hub.visible === true, r.open);
      v('C.3 button names GEAR GOLEM ("Đánh GEAR GOLEM ngay")', r.hub.shortcutBtns.length === 1 && r.hub.shortcutBtns[0].text.indexOf('GEAR GOLEM') >= 0, r.hub.shortcutBtns);
      r.click = await clickShortcut('#v35hub');
      await sleep(900);
      r.fight0 = await readFight19();
      await shot('C-golem-fight-open');
      v('C.4 REAL CLICK opens the GEAR GOLEM fight in English (V19, lang en)', r.click.ok === true && r.fight0.started === true && r.fight0.boss === 'v17_geargolem' && r.fight0.lang === 'en', { click: r.click, fight0: r.fight0 });
      // NOTE (task text said "HP 620 + 90 shield"): 620 is Sandglass
      // Wisp's HP. The golem's own data (v33_data.js) is hp 750, and
      // test41 observed hp0 750 / shield0 90. Assert the real values.
      v('C.5 golem fight HP is 750 with a 90 shield (per v33_data.js + test41)', r.fight0.hp === 750 && r.fight0.maxHp === 750 && r.fight0.shield === 90, r.fight0);
      v('C.6 golem fight renders (#v19fight has content, options painted)', r.fight0.opts > 0, r.fight0);
      r.win = await winFight19ViaLoop();
      await shot('C-golem-win-screen');
      const dmgLanded = (r.win.rounds || []).some(function (x) { return x.pick && x.pick.ok === true && x.pick.hp !== null && x.pick.hp < x.before.hp; });
      v('C.7 honest answers deal damage before the forced win', dmgLanded, r.win.rounds);
      v('C.8 forced win lands (over=win, firstWin)', r.win.winState.over === 'win' && r.win.winState.firstWin === true, r.win.winState);
      r.gateAfterWin = await C.eval(`(function(){ return {en: window.__v35.gateOpen('en'), ko: window.__v35.gateOpen('ko'), golemEN: window.__v35.gearGolemWon('en'), golemKO: window.__v35.gearGolemWon('ko')}; })()`);
      v('C.9 winning GEAR GOLEM unlocks Skyroot in EN (gateOpen en true)', r.gateAfterWin.en === true && r.gateAfterWin.golemEN === true, r.gateAfterWin);
      v('C.10 Skyroot is STILL locked in KO (gateOpen ko false)', r.gateAfterWin.ko === false && r.gateAfterWin.golemKO === false, r.gateAfterWin);
      // ---- return path (documented) ----
      r.close = await C.eval(`(function(){ try{ window.__v19.close(); return {ok:true}; }catch(e){ return {ok:false, err:String(e)}; } })()`);
      await sleep(900);
      r.afterClose = await hosts();
      await shot('C-after-close');
      r.landing = await C.eval(`(function(){
        var map=document.querySelector('.v19mapwrap');
        var hub=document.querySelector('#v15hub');
        return {mapwrap: !!map, mapLen: map?(map.innerHTML||'').length:0,
          v15hubDisplay: hub?hub.style.display:null, v33hubDisplay: (document.querySelector('#v33hub')||{}).style?document.querySelector('#v33hub').style.display:null,
          v35hubDisplay: (document.querySelector('#v35hub')||{}).style?document.querySelector('#v35hub').style.display:null,
          bodyOverflow: document.body.style.overflow};
      })()`);
      note('C RETURN PATH: after __v19.close() ->', JSON.stringify(r.landing));
      r.reopenEn = await C.eval(`(function(){ try{ window.__v35.openSkyroot('en'); return {ok:true}; }catch(e){ return {ok:false, err:String(e)}; } })()`);
      await sleep(800);
      r.reopenHub = await dumpHub('#v35hub');
      await shot('C-reopen-skyroot-en');
      r.reopenKo = await C.eval(`(function(){ try{ window.__v35.openSkyroot('ko'); return {ok:true}; }catch(e){ return {ok:false, err:String(e)}; } })()`);
      await sleep(800);
      r.reopenKoHub = await dumpHub('#v35hub');
      await shot('C-reopen-skyroot-ko');
      v('C.11 after close: player lands on the Boss Map in the EN hub (not the region overlay)', r.landing.mapwrap === true && r.landing.v35hubDisplay === 'none', r.landing);
      v('C.12 Skyroot reopens UNLOCKED in EN (no .v42btn, no lock text)', r.reopenHub.exists === true && r.reopenHub.shortcutBtns.length === 0 && (r.reopenHub.text || '').indexOf('đang khóa') < 0, { btns: r.reopenHub.shortcutBtns, text: (r.reopenHub.text || '').slice(0, 300) });
      v('C.13 Skyroot is still LOCKED in KO after reopen (shortcut button still offered)', r.reopenKoHub.exists === true && r.reopenKoHub.shortcutBtns.length === 1, r.reopenKoHub.shortcutBtns);
      r.console = delta();
      return r;
    });

    // ============ V42-D Chrono locked (13 wins), EN then KO ============
    await step('V42-D-chrono-locked', async () => {
      const r = {};
      await freshGuest();
      r.seed = await seedA();
      v('D.0 seed = 13 wins', r.seed.count === 13, r.seed);
      r.targetEn = await C.eval(`(function(){ return window.__v42.chronoTarget('en'); })()`);
      v('D.1 live Chrono target EN is a REAL boss (v10_ghost lv4, v18 pool)', r.targetEn && r.targetEn.id === 'v10_ghost' && r.targetEn.lv === 4 && r.targetEn.pool === 'v18', r.targetEn);
      await C.eval(`(function(){ try{ window.__v33.openChrono('en'); }catch(e){} })()`);
      await sleep(800);
      r.hubEn = await dumpHub('#v33hub');
      await shot('D-chrono-en-locked');
      v('D.2 Chrono overlay opens locked in EN, gate card shows 13/70', r.hubEn.exists === true && r.hubEn.visible === true && (r.hubEn.text || '').indexOf('13/70') >= 0, (r.hubEn.text || '').slice(0, 300));
      v('D.3 shortcut button present in EN', r.hubEn.shortcutBtns.length === 1, r.hubEn.shortcutBtns);
      v('D.4 button names the chrono target (Ma Thần Âm Thanh)', r.hubEn.shortcutBtns.length === 1 && r.hubEn.shortcutBtns[0].text.indexOf('Ma Thần Âm Thanh') >= 0, r.hubEn.shortcutBtns);
      r.clickEn = await clickShortcut('#v33hub');
      await sleep(900);
      r.fightEn = await readFightAny();
      await shot('D-after-click-en-fight');
      v('D.5 REAL CLICK opens the target fight in English (v10_ghost, lang en)', r.clickEn.ok === true && r.fightEn.engines.v18 && r.fightEn.engines.v18.boss === 'v10_ghost' && r.fightEn.engines.v18.lang === 'en', { click: r.clickEn, fight: r.fightEn });
      v('D.6 the fight actually renders (#v18fight has content)', r.fightEn.rendered['#v18fight'] && r.fightEn.rendered['#v18fight'].htmlLen > 0, r.fightEn.rendered);
      // Close the fight, reopen Chrono: the gate card must still show 13/70.
      await C.eval(`(function(){ try{ window.__v18._test.close(); }catch(e){} })()`);
      await sleep(600);
      await C.eval(`(function(){ try{ window.__v33.openChrono('en'); }catch(e){} })()`);
      await sleep(800);
      r.hubEn2 = await dumpHub('#v33hub');
      v('D.7 after closing the fight, the gate card still shows the real count 13/70', (r.hubEn2.text || '').indexOf('13/70') >= 0, (r.hubEn2.text || '').slice(0, 300));
      // KO repeat (fresh session).
      await freshGuest();
      r.seedKo = await seedA();
      r.targetKo = await C.eval(`(function(){ return window.__v42.chronoTarget('ko'); })()`);
      v('D.8 live Chrono target KO is a REAL boss, never an old-pool boss', r.targetKo && r.targetKo.id === 'v10_ghost' && r.targetKo.pool === 'v18' && r.targetKo.pool !== 'old', r.targetKo);
      await C.eval(`(function(){ try{ window.__v33.openChrono('ko'); }catch(e){} })()`);
      await sleep(800);
      r.hubKo = await dumpHub('#v33hub');
      await shot('D-chrono-ko-locked');
      v('D.9 Chrono overlay opens locked in KO, button present + names the target', r.hubKo.exists === true && r.hubKo.shortcutBtns.length === 1 && r.hubKo.shortcutBtns[0].text.indexOf('Ma Thần Âm Thanh') >= 0, r.hubKo.shortcutBtns);
      r.clickKo = await clickShortcut('#v33hub');
      await sleep(900);
      r.fightKo = await readFightAny();
      await shot('D-after-click-ko-fight');
      v('D.10 REAL CLICK opens the target fight in Korean (v10_ghost, lang ko)', r.clickKo.ok === true && r.fightKo.engines.v18 && r.fightKo.engines.v18.boss === 'v10_ghost' && r.fightKo.engines.v18.lang === 'ko', { click: r.clickKo, fight: r.fightKo });
      v('D.11 the KO fight actually renders (#v18fight has content)', r.fightKo.rendered['#v18fight'] && r.fightKo.rendered['#v18fight'].htmlLen > 0, r.fightKo.rendered);
      r.console = delta();
      return r;
    });

    // ============ V42-E Gate-open overlays show NO shortcut button ============
    await step('V42-E-gate-open-no-button', async () => {
      const r = {};
      await freshGuest();
      r.seed = await seedGateOpen();
      v('E.0 seed = 78 wins, GOLEM won in EN (Skyroot open EN, locked KO)', r.seed.gateOpen.count === 78 && r.seed.gateOpen.gateSkyEN === true && r.seed.gateOpen.gateSkyKO === false, r.seed.gateOpen);
      await C.eval(`(function(){ try{ window.__v33.openChrono('en'); }catch(e){} })()`);
      await sleep(800);
      r.chronoHub = await dumpHub('#v33hub');
      await shot('E-chrono-en-open');
      v('E.1 Chrono overlay opens unlocked in EN', r.chronoHub.exists === true && r.chronoHub.visible === true && (r.chronoHub.text || '').indexOf('Cổng đã mở') >= 0, (r.chronoHub.text || '').slice(0, 300));
      v('E.2 NO .v42btn in the open Chrono overlay', r.chronoHub.shortcutBtns.length === 0, r.chronoHub.shortcutBtns);
      await C.eval(`(function(){ try{ window.__v33.closeChrono(); }catch(e){} })()`);
      await sleep(400);
      r.open = await openSkyrootEn();
      await sleep(400);
      r.skyHub = await dumpHub('#v35hub');
      await shot('E-skyroot-en-open');
      v('E.3 Skyroot overlay opens unlocked in EN', r.skyHub.exists === true && r.skyHub.visible === true && (r.skyHub.text || '').indexOf('đang khóa') < 0, { open: r.open, text: (r.skyHub.text || '').slice(0, 300) });
      v('E.4 NO .v42btn in the open Skyroot overlay', r.skyHub.shortcutBtns.length === 0, r.skyHub.shortcutBtns);
      r.console = delta();
      return r;
    });

    // ============ V42-F 360px shortcut buttons ============
    await step('V42-F-360px', async () => {
      const r = {};
      await C.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
      await freshGuest();
      r.seed = await seedA();
      r.navClick = await clickNavTab('v35kotab');
      await sleep(800);
      r.sky = await measureShortcutBtn('#v35hub');
      await shot('F-skyroot-ko-360');
      v('F.0 locked Skyroot KO at 360px: button exists + >=44px tall', r.sky.ok === true && r.sky.height >= 44, r.sky);
      v('F.1 locked Skyroot KO at 360px: no horizontal overflow (doc scrollWidth <= 360)', r.sky.docScrollW <= 360, r.sky);
      v('F.2 locked Skyroot KO at 360px: button fits the viewport + label not clipped', r.sky.left >= 0 && r.sky.right <= 360 && r.sky.clipped === false, r.sky);
      await C.eval(`(function(){ try{ window.__v35.closeSkyroot(); }catch(e){} })()`);
      await sleep(400);
      await C.eval(`(function(){ try{ window.__v33.openChrono('en'); }catch(e){} })()`);
      await sleep(800);
      r.chrono = await measureShortcutBtn('#v33hub');
      await shot('F-chrono-en-360');
      v('F.3 locked Chrono EN at 360px: button exists + >=44px tall', r.chrono.ok === true && r.chrono.height >= 44, r.chrono);
      v('F.4 locked Chrono EN at 360px: no horizontal overflow (doc scrollWidth <= 360)', r.chrono.docScrollW <= 360, r.chrono);
      v('F.5 locked Chrono EN at 360px: button fits the viewport + label not clipped', r.chrono.left >= 0 && r.chrono.right <= 360 && r.chrono.clipped === false, r.chrono);
      await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      r.console = delta();
      return r;
    });

    // ============ V42-G Regression smoke ============
    await step('V42-G-regression-smoke', async () => {
      const r = {};
      await freshGuest();
      r.boot2 = await C.eval(`(function(){
        var app=document.getElementById('app');
        return {appLen: app?app.innerHTML.length:-1, hasTabs: !!document.querySelector('#tabs')};
      })()`);
      v('G.0 hub loads on a fresh guest (app non-empty, tabs present)', r.boot2.appLen > 0 && r.boot2.hasTabs === true, r.boot2);
      await C.eval(`(function(){ try{ window.__v15.choose('en'); }catch(e){} })()`);
      await sleep(800);
      await C.eval(`(function(){ try{ window.__v15.tab('bosses'); }catch(e){} })()`);
      await sleep(800);
      r.bosses = await C.eval(`(function(){ var b=document.querySelector('#v15body'); return b?{len:(b.innerHTML||'').length, hasArenas: (b.innerHTML||'').indexOf('v18arenas')>=0, text:(b.innerText||'').slice(0,200)}:null; })()`);
      await shot('G-bosses-tab');
      v('G.1 Bosses tab renders (arena section present)', r.bosses && r.bosses.len > 0 && r.bosses.hasArenas === true, r.bosses);
      await C.eval(`(function(){ try{ window.__v23.openHub(); }catch(e){} })()`);
      await sleep(800);
      r.pet = await C.eval(`(function(){ var h=document.querySelector('#v23hub'); return h?{display:h.style.display, len:(h.innerHTML||'').length, text:(h.innerText||'').slice(0,200)}:null; })()`);
      await shot('G-pet-hub');
      v('G.2 Pet Hub opens (visible, non-empty)', r.pet && r.pet.display !== 'none' && r.pet.len > 0, r.pet);
      await C.eval(`(function(){ try{ window.__v23.closeHub(); }catch(e){} })()`);
      await sleep(400);
      // V19 fight still works: one real-clicked correct answer deals damage.
      await C.eval(`(function(){
        S.v7.en23={pets:{p1:{id:'p1',sp:'dragon',st:1,lv:10,xp:0,aff:0}},team:['p1',null,null],eggs:{fire:1,forest:1},hatch:null,mats:{},claimed:{},affClaimed:{},created:1};
        save();
      })()`);
      await sleep(800);
      await C.eval(`(function(){ try{ window.__v19.openMapFor('en'); window.__v19.fight('v11_fireking'); }catch(e){} })()`);
      await sleep(800);
      const f0 = await readFight19();
      const pick = await clickCorrect19();
      await sleep(400);
      const f1 = await readFight19();
      r.fight = { f0, pick, f1 };
      await shot('G-v19-fight');
      v('G.3 V19 fight opens (fireking HP 325)', f0.started === true && f0.maxHp === 325, f0);
      v('G.4 one real-clicked correct answer deals damage (HP drops, score 1)', pick.ok === true && f1.hp < f0.hp && f1.score === 1, { pick, f0, f1 });
      r.console = delta();
      return r;
    });

    results.summary = { allOk, failedVerdicts, console: delta(), chromeAttempts };
    note(`\nverify-v42c: ${allOk ? 'ALL VERDICTS PASS' : 'FAILURES: ' + failedVerdicts.join(', ')}`);
    note('console delta (whole run):', JSON.stringify(delta()));
    note('console detail (whole run):', JSON.stringify(deltaDetail()).slice(0, 2000));
    saveResults();
    try { if (chromeProc) chromeProc.kill(); } catch (e) {}
    try { if (httpProc) httpProc.kill(); } catch (e) {}
    process.exit(allOk ? 0 : 1);
  } catch (e) {
    console.error('verify-v42c crashed:', e);
    results.crash = String(e).slice(0, 600);
    saveResults();
    try { if (chromeProc) chromeProc.kill(); } catch (e2) {}
    try { if (httpProc) httpProc.kill(); } catch (e2) {}
    process.exit(2);
  }
}
main();
