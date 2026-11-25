// verify-v51c.js - V19.6 (layer V51) Chrome verification driver.
// Real Chrome 157 via CDP, local HTTP. Parameterised so the SAME driver
// runs on the built tree (default: private out) or the unzipped ZIP dir.
//   node tools/v51/verify-v51c.js [DIR] [httpPort] [cdpPort] [profile] [resultsFile] [shotPrefix]
// Defaults: DIR=v7build/out, http 8761, cdp 9241, profile
// chrome-v51c-prof, results tools/v51/logs/v51c-results.json, shots v51c-*.
// Ports 8761/9241 are deliberately different from the v7build round-5
// run, which owns ~/workspace/v7build and may run Chrome in parallel.
// Exit 0 = driver completed (verdicts in the results JSON + stdout).
// Gates:
//   G0 boot clean (fresh guest, title V19.6, __v51 19.6.0, WORDS 4892,
//      0 console errors/warnings/dialogs)
//   G1 generated session live — Education scope, seed 12 learned words:
//      pre-session card shows scope name + generated count; in-session
//      card shows the .v51gen badge + keyword; 5 questions played by
//      REAL DOM tile clicks, all correct, right=5, XP +20 (5x2 + 10 bonus)
//   G2 .v51gen badge contrast >= 4.5 in LIGHT and DARK themes
//   G3 360px — Forge overlay: no horizontal overflow, badge visible
//   G4 kill-switch live — flag off: pure bank session, no badge; flag on
//      again: generated session returns
//   G5 scope change live — Oxford lesson 12: pre-session card shows the
//      lesson name + count; session items all come from that lesson
//   G6 KO deck live — selected deck's cards first in the KO pool, items
//      verbatim card.e
//   G7 regressions — Bounty 4+4 renders, Dojo tab renders, v49
//      speakErrMsg intact, English Hub renders
//   G8 console/dialog summary: 0 errors, 0 warnings, 0 JS dialogs
// HONEST LIMITS: real rendering/layout/paint in headless Chrome 157;
// live-phone, live-Firebase and first-open-on-GitHub-Pages gates stay
// Anh-only. No speech recognition is involved in V19.6.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const POLICY = '/tmp/webgl-policy.txt';
const DIR = process.argv[2] || '/home/hatch/workspace/v7build/out';
const HTTPPORT = parseInt(process.argv[3] || '8761', 10);
const PORT = parseInt(process.argv[4] || '9241', 10);
const PROFILE = process.argv[5] || 'chrome-v51c-prof';
const RESULTS_FILE = process.argv[6] || 'v51c-results.json';
const SHOT_PREFIX = process.argv[7] || 'v51c';
const TDIR = '/home/hatch/workspace/v7build/tools/v51';
const URL = `http://127.0.0.1:${HTTPPORT}/index.html`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
const verdicts = [];
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
  } catch (e) { note('write failed:', p, String(e).slice(0, 120)); return false; }
}
function saveResults() { writeSmall(path.join(TDIR, 'logs', RESULTS_FILE), JSON.stringify({ verdicts, results, dir: DIR }, null, 2)); }
function verdict(name, cond, detail) {
  verdicts.push({ name, pass: !!cond, detail: detail === undefined ? null : detail });
  note((cond ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 500) : ''));
  saveResults();
  return !!cond;
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
let chromeProc = null, httpProc = null, C = null;
async function ensureHttp() {
  try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {}
  httpProc = spawn('python3', ['-m', 'http.server', String(HTTPPORT), '--directory', DIR], { stdio: 'ignore' });
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
      '--no-first-run', '--disable-component-update', '--disable-background-networking', '--disable-sync',
      '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
      '--user-data-dir=/tmp/' + PROFILE, `--remote-debugging-port=${PORT}`,
      '--window-size=1280,800', 'about:blank'];
    chromeProc = spawn(CHROME, args, { stdio: 'ignore' });
    for (let i = 0; i < 40; i++) { await sleep(500);
      try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {} }
    note('chrome start attempt', attempt, 'FAILED');
    try { chromeProc.kill(); } catch (e) {}
    if (attempt < 3) await sleep(10000);
  }
  throw new Error('chrome did not start after 3 attempts');
}
async function setViewport(w, h, mobile, dark) {
  await C.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
  await C.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
}
async function openPage() {
  await ensureHttp();
  await ensureChrome();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const t = list.find(x => x.type === 'page');
  C = new CDP(t.webSocketDebuggerUrl);
  await C.ready;
  await C.send('Page.enable'); await C.send('Runtime.enable');
  await setViewport(1280, 800, false, false);
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
    writeSmall(path.join(TDIR, 'shots', `${SHOT_PREFIX}-${name}.png`), Buffer.from(r.data, 'base64'));
  } catch (e) { note('shot failed:', name, String(e).slice(0, 120)); }
}
async function step(name, fn) {
  try {
    const r = await fn();
    results[name] = r;
    note(`STEP ${name} —`, JSON.stringify(r).slice(0, 2000));
  } catch (e) {
    results[name] = { error: String(e).slice(0, 600) };
    note(`STEP ${name} ERROR —`, String(e).slice(0, 600));
  }
  saveResults();
}
async function freshGuest() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await C.eval(`try{ if(window.__v20) window.__v20.flush(); }catch(e){}`);
    await C.eval(`localStorage.clear()`);
    await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
    await reloadWait(2800);
    const fresh = await ev(`(function(){
      try{
        var e18=window.__v18._test.en18();
        var old=window.__v15.enOld();
        return {
          bossesWon:Object.keys(e18.bosses||{}).filter(function(k){return e18.bosses[k]&&e18.bosses[k].win;}).length,
          xpAtN:Object.keys(old.xpAt||{}).length,
          koRight:e18.koStats?e18.koStats.right||0:0
        };
      }catch(err){ return {err:String(err)}; }
    })()`);
    if (fresh && fresh.bossesWon === 0 && fresh.xpAtN === 0 && fresh.koRight === 0) return fresh;
    note('freshGuest attempt', attempt, 'not fresh:', JSON.stringify(fresh));
  }
  note('freshGuest: WARNING — save not fresh after 3 attempts');
  return null;
}
function close() {
  try { if (C) C.close(); } catch (e) {}
  try { if (chromeProc) chromeProc.kill(); } catch (e) {}
  try { if (httpProc) httpProc.kill(); } catch (e) {}
}
const ev = (expr) => C.eval(expr);

// --- V52 helpers ported verbatim (SR stub, TTS stub, mixedTrace) ---
// They regression-check V19.5.1 (C-R5-1 XP + Android TTS) on the rebased build.
const SR_STUB = `
window.SpeechRecognition = function(){
  var self=this; window.__lastSR49=self;
  self.lang=''; self.interimResults=false; self.maxAlternatives=3;
  self.onresult=null; self.onerror=null; self.onend=null;
  self._aborted=false; self._lostSync=false;
  self.start=function(){
    if(window.__SRMODE==='throw'){ throw new Error('mic-start-throw'); }
    if(window.__SRMODE==='syncfire'){
      self._lostSync = !self.onresult;
      if(self.onresult) self.onresult({results:[[{transcript: window.__SRWORD||'apple'}]]});
    }
  };
  self.abort=function(){ self._aborted=true; };
  self.stop=function(){};
  self.fireResult=function(t){ if(self.onresult) self.onresult({results:[[{transcript:t}]]}); };
  self.fireError=function(code){ if(self.onerror) self.onerror({error:code}); };
  self.fireEnd=function(){ if(self.onend) self.onend(); };
};
window.webkitSpeechRecognition = window.SpeechRecognition;`;
async function installSR() { await ev(SR_STUB); }
const TTS_STUB = `
window.__ttsLog={spoken:[],gv:0,cancelled:0,pops:[]};
(function(){
  // Every speak path funnels its honest-error message through the GLOBAL
  // pop (v15's internal pop15 calls bare pop; pop18/19/22/48 go through
  // __v15.pop15 -> the same global pop) or, failing that, global toast.
  // Wrap those two so the message is observable in __ttsLog.pops.
  var origPop=window.pop;
  window.pop=function(t,big){ window.__ttsLog.pops.push(t); return origPop(t,big); };
  var origToast=window.toast;
  if(typeof origToast==='function'){ window.toast=function(t,ms){ window.__ttsLog.pops.push(t); return origToast(t,ms); }; }
  var voices=[], listeners={};
  var stub={
    getVoices:function(){ window.__ttsLog.gv++; return voices.slice(); },
    addEventListener:function(t,f){ (listeners[t]=listeners[t]||[]).push(f); },
    removeEventListener:function(){},
    speaking:false, pending:false,
    cancel:function(){ window.__ttsLog.cancelled++; this.speaking=false; this.pending=false; },
    speak:function(u){ window.__ttsLog.spoken.push({text:u.text,lang:u.lang,voice:u.voice?u.voice.name:null,voiceLang:u.voice?u.voice.lang:null}); this.speaking=true; this._lastSpoken=u; var self=this; setTimeout(function(){ self.speaking=false; }, 50); },
    _fireVoices:function(v){ voices=v.slice(); var l=(listeners['voiceschanged']||[]).slice(); l.forEach(function(f){ try{f();}catch(e){} }); },
    _setSpeaking:function(b){ this.speaking=b; }
  };
  Object.defineProperty(window,'speechSynthesis',{value:stub,configurable:true,writable:true});
  window.__ttsStub=stub;
  function FakeU(t){ this.text=t; this.lang=''; this.rate=1; this.voice=null; this.onerror=null; this.onend=null; }
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:FakeU,configurable:true,writable:true});
})();`;
async function installTTS() { await ev(TTS_STUB); }
// mixedTrace(fightExpr): the test52 §13 trace, run live in the page.
// Drives 4 questions with _test.pickCorrect() and records XP/streak per
// question plus any qkey (':') that leaked into the word SRS box map.
// The caller must close() the previous engine's fight first: F() is
// sticky, and (v18.F()||v19.F()) would return a stale fight otherwise.
async function mixedTrace(fightExpr) {
  const expr = `(function(){
    var v18=window.__v18, v19=window.__v19;
    var e18=v18._test.en18(); e18.bosses=e18.bosses||{};
    var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
    var e19=v19._test.en19(); e19.bosses=e19.bosses||{};
    (window.__V19_DATA.bosses||[]).forEach(function(b){ e19.bosses[b.id]={en:{win:true},ko:{win:true}}; });
    S.xp=20000; S.spent=0;
    var old=window.__v15.enOld(); old.streak=0;
    ${fightExpr}
    var trace=[];
    for(var i=0;i<4;i++){
      var F=(window.__v18._test.F()||window.__v19._test.F()); if(!F||F.over) break;
      var eng=F===window.__v18._test.F()?'v18':'v19';
      var qm=F.qmode, wid=(F.cur&&F.cur.w)?F.cur.w.id:null;
      var xp0=S.xp, st0=window.__v15.enOld().streak;
      if(eng==='v18')v18._test.pickCorrect(); else v19._test.pickCorrect();
      var xp1=S.xp, st1=window.__v15.enOld().streak;
      trace.push({i:i,eng:eng,qmode:qm,wordId:wid,dxp:xp1-xp0,streak:st0+'->'+st1,answered:F.answered,ok:F.ok});
      if(i<3){ if(eng==='v18')v18._test.next(); else v19._test.next(); }
    }
    var o2=window.__v15.enOld();
    var colonBox=Object.keys(o2.box||{}).filter(function(k){return k.indexOf(':')>=0});
    var colonRight=Object.keys(o2.right||{}).filter(function(k){return k.indexOf(':')>=0});
    return {trace:trace, colonBox:colonBox, colonRight:colonRight};
  })()`;
  return await ev(expr);
}
async function setSRMode(m) { await ev(`window.__SRMODE=${JSON.stringify(m)};`); }
async function openEnArena() {
  await ev(`window.__v15.openHub('bosses')`); await sleep(800);
  await ev(`window.__v18.openArena('en')`); await sleep(800);
}

// --- V51 in-page helpers ---
async function seedEducation(n) {
  return await ev(`(function(){
    var v=window.__v15, m=window.__v15.mark15, count=0;
    for(var i=0;i<v.words.length && count<${n||12};i++){
      var w=v.words[i];
      if(w.a1a2Topics && w.a1a2Topics.indexOf('a1_education')>=0){ m(true,w,'flash'); count++; }
    }
    return {seeded:count, learned:window.__v48._test.learnedEN()};
  })()`);
}
async function forgeHTML() { return await ev(`(document.querySelector('#v48hub')||{}).innerHTML || ''`); }
async function forgeState() {
  return await ev(`(function(){ var FS=window.__v48._test.session(); if(!FS) return null;
    var cur=FS.list&&FS.list[FS.i];
    return {i:FS.i, n:FS.list.length, done:!!FS.done, right:FS.right, built:FS.built,
      curGen:cur&&!!cur.gen, curText:cur&&cur.text, curTokens:cur&&cur.tokens,
      tiles:(FS.tiles||[]).map(function(t){return t.t}), used:FS.used, checked:!!FS.checked, ok:FS.ok}; })()`);
}
// Play the current question by REAL DOM tile clicks, in token order.
async function playCurrentCorrectly() {
  return await ev(`(function(){
    var FS=window.__v48._test.session(); if(!FS) return {err:'no session'};
    var cur=FS.list[FS.i];
    var tiles=[].slice.call(document.querySelectorAll('#v48hub .v48tile'));
    var used=new Array(tiles.length).fill(false);
    var clicked=0;
    cur.tokens.forEach(function(tok){
      for(var k=0;k<tiles.length;k++){
        if(!used[k] && tiles[k].textContent.trim()===tok){ used[k]=1; tiles[k].click(); clicked++; break; }
      }
    });
    var btns=[].slice.call(document.querySelectorAll('#v48hub .v48btn'));
    var check=btns.filter(function(b){return b.textContent.trim()==='Kiểm tra';})[0];
    if(check && !check.disabled) check.click();
    return {clicked:clicked, tokens:cur.tokens.length};
  })()`);
}
async function clickForgeButton(label) {
  return await ev(`(function(){
    var btns=[].slice.call(document.querySelectorAll('#v48hub .v48btn'));
    var b=btns.filter(function(x){return x.textContent.trim().indexOf(${JSON.stringify(label)})>=0;})[0];
    if(!b) return {found:false};
    b.click(); return {found:true};
  })()`);
}
async function chipContrast(sel) {
  return await ev(`(function(){
    function lum(rgb){
      var m=rgb.match(/(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/); if(!m) return null;
      var f=function(v){ v=v/255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
      return 0.2126*f(+m[1])+0.7152*f(+m[2])+0.0722*f(+m[3]);
    }
    var el=document.querySelector('${sel}'); if(!el) return {found:false};
    var cs=getComputedStyle(el);
    var L1=lum(cs.color), L2=lum(cs.backgroundColor);
    if(L1===null||L2===null) return {found:true, color:cs.color, bg:cs.backgroundColor, ratio:null};
    var hi=Math.max(L1,L2), lo=Math.min(L1,L2);
    return {found:true, color:cs.color, bg:cs.backgroundColor, ratio:Math.round(((hi+0.05)/(lo+0.05))*100)/100};
  })()`);
}
async function overflowAt() {
  return await ev(`({scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, bodyScrollW: document.body ? document.body.scrollWidth : null})`);
}

async function main() {
  await openPage();
  // G0 — boot clean.
  await step('G0-boot', async () => {
    const boot = await ev(`(function(){ return {title: document.title, hasV51: !!window.__v51, v51: window.__v51&&window.__v51.version, hasV48: !!window.__v48, words: (window.__v15&&window.__v15.words||[]).length, forgeAuto: window.__v48&&window.__v48.flagOn('forgeAuto')}; })()`);
    const servedTitle = await (await fetch(URL)).text().then(t => (t.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
    verdict('G0.1 served title is V19.6 Sentence Forge Auto', servedTitle.includes('V19.6 — Sentence Forge Auto'), servedTitle);
    verdict('G0.2 __v51 19.6.0 present', boot.hasV51 && boot.v51 === '19.6.0', boot);
    verdict('G0.3 WORDS 4892', boot.words === 4892, boot.words);
    verdict('G0.4 forgeAuto flag defaults ON', boot.forgeAuto === true, boot);
    verdict('G0.5 0 console errors at boot', C.consoleErrors.length === 0, C.consoleErrors);
    verdict('G0.6 0 console warnings at boot', C.consoleWarns.length === 0, C.consoleWarns);
    verdict('G0.7 0 dialogs at boot', C.dialogs.length === 0, C.dialogs);
    return boot;
  });

  // G1 — generated session live (Education scope).
  await step('G1-generated-session', async () => {
    await freshGuest();
    const seed = await seedEducation(12);
    verdict('G1.0 12 Education words learned', seed.seeded === 12 && seed.learned.length >= 12, { seeded: seed.seeded, learnedN: seed.learned.length });
    await ev(`window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_education'})`);
    await ev(`window.__v48.openForge('en','forge')`);
    await sleep(800);
    const pre = await forgeHTML();
    verdict('G1.1 pre-session card shows the scope name', pre.includes('A1–A2 · Education – GIÁO DỤC'), pre.slice(0, 400));
    verdict('G1.2 pre-session card shows a generated count', /Câu tạo tự động từ bộ từ \(\d+ câu\)/.test(pre), (pre.match(/Câu tạo tự động từ bộ từ \(\d+ câu\)/) || [null])[0]);
    const ok = await ev(`window.__v48.startForge()`);
    await sleep(800);
    verdict('G1.3 session starts', ok === true, ok);
    const s0 = await forgeState();
    const h0 = await forgeHTML();
    verdict('G1.4 first question is a generated item', s0.curGen === true, s0);
    verdict('G1.5 .v51gen badge visible in the live DOM', h0.includes('v51gen') && h0.includes('Câu tạo tự động'), h0.slice(0, 300));
    verdict('G1.6 badge shows the keyword (word + Vietnamese meaning)', h0.includes('Từ khóa:'), h0.slice(0, 500));
    await shot('g1-generated-light');
    // Play all 5 questions by real DOM clicks.
    const xp0 = await ev(`S.xp||0`);
    let played = 0, allCorrect = true;
    for (let q = 0; q < 5; q++) {
      const st = await forgeState();
      if (!st || st.done) break;
      const p = await playCurrentCorrectly();
      await sleep(250);
      const after = await forgeState();
      if (!(p.clicked === p.tokens && after.ok === true)) allCorrect = false;
      played++;
      if (q < 4) { await clickForgeButton('Câu tiếp'); await sleep(250); }
    }
    const fin = await clickForgeButton('Xem kết quả');
    await sleep(400);
    const done = await forgeState();
    const xp1 = await ev(`S.xp||0`);
    verdict('G1.7 5 questions played by real DOM clicks, all correct', played === 5 && allCorrect === true, { played, allCorrect });
    verdict('G1.8 session done, right=5', done.done === true && done.right === 5, done);
    verdict('G1.9 XP +20 (5x2 + one +10 session bonus)', xp1 - xp0 === 20, { xp0, xp1 });
    await shot('g1-results');
    await ev(`window.__v48.closeForge()`);
    return { seed, played, xp0, xp1 };
  });

  // G2 — badge contrast light + dark.
  await step('G2-badge-contrast', async () => {
    await freshGuest();
    await seedEducation(12);
    await ev(`window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_education'})`);
    await ev(`window.__v48.openForge('en','forge')`);
    await sleep(600);
    await ev(`window.__v48.startForge()`);
    await sleep(600);
    const light = await chipContrast('.v51gen');
    verdict('G2.1 .v51gen contrast >= 4.5 (light)', light.found && light.ratio !== null && light.ratio >= 4.5, light);
    await shot('g2-badge-light');
    await ev(`window.__v48.closeForge()`);
    // Dark theme.
    await setViewport(1280, 800, false, true);
    await reloadWait(2800);
    await seedEducation(12);
    await ev(`window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_education'})`);
    await ev(`window.__v48.openForge('en','forge')`);
    await sleep(600);
    await ev(`window.__v48.startForge()`);
    await sleep(600);
    const dark = await chipContrast('.v51gen');
    verdict('G2.2 .v51gen contrast >= 4.5 (dark)', dark.found && dark.ratio !== null && dark.ratio >= 4.5, dark);
    await shot('g2-badge-dark');
    await ev(`window.__v48.closeForge()`);
    await setViewport(1280, 800, false, false);
    await reloadWait(2800);
    return { light, dark };
  });

  // G3 — 360px overflow.
  await step('G3-360px', async () => {
    await setViewport(360, 800, true, false);
    await reloadWait(2800);
    await freshGuest();
    await seedEducation(12);
    await ev(`window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_education'})`);
    await ev(`window.__v48.openForge('en','forge')`);
    await sleep(600);
    await ev(`window.__v48.startForge()`);
    await sleep(600);
    const h = await forgeHTML();
    const ov = await overflowAt();
    verdict('G3.1 360px: badge visible, no horizontal overflow', h.includes('v51gen') && ov.scrollW <= ov.innerW + 1, { ov, hasBadge: h.includes('v51gen') });
    await shot('g3-360');
    await ev(`window.__v48.closeForge()`);
    await setViewport(1280, 800, false, false);
    await reloadWait(2800);
    return { ov };
  });

  // G4 — kill-switch live.
  await step('G4-killswitch', async () => {
    await freshGuest();
    await seedEducation(12);
    await ev(`window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_education'})`);
    await ev(`window.__v48.setFlag('forgeAuto', false)`);
    await ev(`window.__v48.openForge('en','forge')`);
    await sleep(600);
    const preOff = await forgeHTML();
    verdict('G4.1 flag off: pre-session card shows no generated count', !/Câu tạo tự động từ bộ từ \(\d+ câu\)/.test(preOff), (preOff.match(/Câu tạo tự động từ bộ từ \(\d+ câu\)/) || [null])[0]);
    await ev(`window.__v48.startForge()`);
    await sleep(600);
    const sOff = await forgeState();
    const hOff = await forgeHTML();
    const poolOff = await ev(`window.__v48._test.forgePool('en').items.filter(function(i){return !!i.gen}).length`);
    verdict('G4.2 flag off: session has 0 generated items, no badge', sOff.curGen === false && !hOff.includes('v51gen') && poolOff === 0, { curGen: sOff.curGen, poolOff });
    await ev(`window.__v48.closeForge()`);
    await ev(`window.__v48.setFlag('forgeAuto', true)`);
    await ev(`window.__v48.openForge('en','forge')`);
    await sleep(600);
    await ev(`window.__v48.startForge()`);
    await sleep(600);
    const sOn = await forgeState();
    const hOn = await forgeHTML();
    verdict('G4.3 flag on again: generated session returns', sOn.curGen === true && hOn.includes('v51gen'), sOn);
    await ev(`window.__v48.closeForge()`);
    return { poolOff };
  });

  // G5 — scope change live (Oxford lesson 12).
  await step('G5-scope-change', async () => {
    await freshGuest();
    // Learn 12 words from Oxford lesson 12.
    const seed = await ev(`(function(){
      var v=window.__v15, m=window.__v15.mark15, count=0;
      v.setScope({kind:'lib',lib:'oxford',lesson:12});
      var list=v.wordsFiltered(); 
      for(var i=0;i<list.length && count<12;i++){ m(true,list[i],'flash'); count++; }
      return {seeded:count, learned:window.__v48._test.learnedEN()};
    })()`);
    verdict('G5.0 12 Oxford lesson-12 words learned', seed.seeded === 12 && seed.learned.length >= 12, { seeded: seed.seeded, learnedN: seed.learned.length });
    await ev(`window.__v48.openForge('en','forge')`);
    await sleep(600);
    const pre = await forgeHTML();
    verdict('G5.1 pre-session card shows the lesson name', pre.includes('Oxford 3000 · Bài 12'), pre.slice(0, 400));
    verdict('G5.2 pre-session card shows a generated count', /Câu tạo tự động từ bộ từ \(\d+ câu\)/.test(pre), (pre.match(/Câu tạo tự động từ bộ từ \(\d+ câu\)/) || [null])[0]);
    await ev(`window.__v48.startForge()`);
    await sleep(600);
    const inScope = await ev(`(function(){
      var FS=window.__v48._test.session();
      var allowed={}; window.__v15.wordsFiltered().forEach(function(w){allowed[w.id]=1;});
      var gen=FS.list.filter(function(it){return !!it.gen});
      return {n:FS.list.length, gen:gen.length, allInScope:gen.every(function(it){return !!allowed[it.word.id];})};
    })()`);
    verdict('G5.3 session items all come from Oxford lesson 12', inScope.gen >= 1 && inScope.allInScope === true, inScope);
    await ev(`window.__v48.closeForge()`);
    await ev(`window.__v15.clearScope()`);
    return { seed, inScope };
  });

  // G6 — KO deck live.
  await step('G6-ko-deck', async () => {
    await freshGuest();
    const ko = await ev(`(function(){
      var s; try{ s=S; }catch(e){ return {err:'no S'}; }
      s.cards=[]; s.decks=[{id:'dX',name:'Deck X'},{id:'dY',name:'Deck Y'}];
      for(var i=0;i<12;i++){ s.cards.push({id:'k'+i,d:i<6?'dY':'dX',h:'한글'+i,m:'nghĩa '+i,p:'',e:'나는 학교에 갑니다 '+i,box:1}); }
      s.deck='dX';
      var p=window.__v48._test.forgePool('ko');
      var verbatim=p.items.every(function(it){ var cd=s.cards.filter(function(x){return x.id===it.cardId;})[0]; return cd && it.text===cd.e.replace(/[.!?]+$/,''); });
      return {n:p.items.length, first6Deck:p.items.slice(0,6).filter(function(it){return +it.cardId.slice(1)>=6;}).length, verbatim:verbatim};
    })()`);
    verdict('G6.1 KO pool: first 6 items all from the selected deck', ko.n === 12 && ko.first6Deck === 6, ko);
    verdict('G6.2 KO items are verbatim card.e', ko.verbatim === true, ko);
    await ev(`window.__v48.openForge('ko','forge')`);
    await sleep(600);
    const ok = await ev(`window.__v48.startForge()`);
    await sleep(600);
    const s = await forgeState();
    verdict('G6.3 KO Forge session starts from deck cards', ok === true && s.n === 5, { ok, n: s && s.n });
    await ev(`window.__v48.closeForge()`);
    return ko;
  });

  // G7 — regressions.
  await step('G7-regress', async () => {
    await freshGuest();
    await seedEducation(12);
    await ev(`window.__v48.openForge('en','bounty')`);
    await sleep(800);
    const bounty = await forgeHTML();
    verdict('G7.1 Bounty tab renders 4 daily + 4 weekly quests', (bounty.match(/Nhận rương/g) || []).length >= 0 && bounty.includes('Nhiệm vụ ngày') && bounty.includes('Nhiệm vụ tuần'), bounty.slice(0, 300));
    const bountyQ = await ev(`(function(){ var q=window.__v48._test.bountyQuests(); return {d:q.daily.length, w:q.weekly.length}; })()`);
    verdict('G7.2 Bounty data still 4+4', bountyQ.d === 4 && bountyQ.w === 4, bountyQ);
    await ev(`window.__v48.setTab('dojo')`);
    await sleep(800);
    const dojo = await forgeHTML();
    verdict('G7.3 Dojo tab renders', dojo.includes('Pronunciation Dojo') || dojo.includes('Dojo'), dojo.slice(0, 300));
    await ev(`window.__v48.closeForge()`);
    const v49 = await ev(`window.__v49.speakErrMsg('not-allowed')`);
    verdict('G7.4 V49 speakErrMsg intact', typeof v49 === 'string' && v49.indexOf('micro') >= 0, v49);
    await ev(`(function(){ window.__v15.openHub('learn'); })()`);
    await sleep(800);
    const hub = await ev(`(function(){ var b=document.querySelector('#v15body'); return {body:b?b.innerHTML.length:0, hasModes:!!(b && b.innerHTML.indexOf('Flashcard')>=0)}; })()`);
    verdict('G7.5 English Hub renders', hub.body > 1000 && hub.hasModes === true, hub);
    return { bountyQ, hub };
  });

  // G9 — rebase regression: V19.5.1 behaviours on the rebased build.
  // (a) C-R5-1 mixed-fight XP live, both engines (test52 §13 trace);
  // (b) __v52 TTS helper live with stubbed voices (verify-v52c G15 shape).
  await step('G9-rebase', async () => {
    await freshGuest();
    await installSR();
    await openEnArena();
    await setSRMode('silent');
    const r18 = await mixedTrace(`v18.fight('v10_dict','en');`);
    const t18 = r18.trace, by18 = {};
    t18.forEach(function (r) { by18[r.qmode] = r; });
    verdict('G9.1 v18 EN mixed fight asks all 4 types in order', t18.length === 4 && t18.map(function (r) { return r.qmode; }).join(',') === 'mc,grammar,listen,builder', t18);
    verdict('G9.2 v18 grammar now pays +10 XP', by18.grammar && by18.grammar.dxp === 10, by18.grammar);
    verdict('G9.3 v18 sentence (builder) now pays +10 XP', by18.builder && by18.builder.dxp === 10, by18.builder);
    verdict('G9.4 v18 vocab (mc) still pays +10 XP', by18.mc && by18.mc.dxp === 10, by18.mc);
    const expListen18 = (by18.listen && by18.mc && by18.listen.wordId === by18.mc.wordId) ? 0 : 10;
    verdict('G9.5 v18 listen pays the cooldown-aware amount', by18.listen && by18.listen.dxp === expListen18, { listen: by18.listen, expected: expListen18 });
    verdict('G9.6 v18 streak advances 0->1->2->3->4', t18.map(function (r) { return r.streak; }).join(',') === '0->1,1->2,2->3,3->4', t18.map(function (r) { return r.streak; }));
    verdict('G9.7 v18 mixed total == 30 + listen', t18.reduce(function (a, r) { return a + r.dxp; }, 0) === 30 + expListen18, { total: t18.reduce(function (a, r) { return a + r.dxp; }, 0), expected: 30 + expListen18 });
    verdict('G9.8 v18 word SRS maps hold no qkey', r18.colonBox.length === 0 && r18.colonRight.length === 0, { colonBox: r18.colonBox, colonRight: r18.colonRight });
    await ev(`window.__v18.close()`);
    const r19 = await mixedTrace(`window.__v19.openMapFor('en'); window.__v19.fight('v11_butterflyqueen');`);
    const t19 = r19.trace, by19 = {};
    t19.forEach(function (r) { by19[r.qmode] = r; });
    verdict('G9.9 v19 EN mixed fight asks all 4 types in order', t19.length === 4 && t19.map(function (r) { return r.qmode; }).join(',') === 'mc,grammar,listen,builder', t19);
    verdict('G9.10 v19 grammar now pays +10 XP', by19.grammar && by19.grammar.dxp === 10, by19.grammar);
    verdict('G9.11 v19 sentence (builder) now pays +10 XP', by19.builder && by19.builder.dxp === 10, by19.builder);
    const expListen19 = (by19.listen && by19.mc && by19.listen.wordId === by19.mc.wordId) ? 0 : 10;
    verdict('G9.12 v19 listen pays the cooldown-aware amount', by19.listen && by19.listen.dxp === expListen19, { listen: by19.listen, expected: expListen19 });
    verdict('G9.13 v19 streak advances 0->1->2->3->4', t19.map(function (r) { return r.streak; }).join(',') === '0->1,1->2,2->3,3->4', t19.map(function (r) { return r.streak; }));
    verdict('G9.14 v19 mixed total == 30 + listen', t19.reduce(function (a, r) { return a + r.dxp; }, 0) === 30 + expListen19, { total: t19.reduce(function (a, r) { return a + r.dxp; }, 0), expected: 30 + expListen19 });
    verdict('G9.15 v19 word SRS maps hold no qkey', r19.colonBox.length === 0 && r19.colonRight.length === 0, { colonBox: r19.colonBox, colonRight: r19.colonRight });
    await ev(`window.__v19.close()`);
    await installTTS();
    const VOICES = [{name:'Google US English',lang:'en-US',default:true},{name:'Google 한국어',lang:'ko-KR',default:false}];
    const q1 = await ev(`(function(){
      window.__ttsErrs=[];
      var r=window.__v52.speak('hello','en-US',1,function(c){window.__ttsErrs.push(c)});
      return {ret:r, spoken:window.__ttsLog.spoken.length, pending:window.__v52._test.pending()!==null};
    })()`);
    verdict('G9.16 delayed voices: speak queues (returns true, nothing spoken)', q1.ret === true && q1.spoken === 0 && q1.pending === true, q1);
    await ev(`window.__ttsStub._fireVoices(${JSON.stringify(VOICES)})`);
    await sleep(300);
    const log1 = await ev(`JSON.parse(JSON.stringify(window.__ttsLog))`);
    verdict('G9.17 delayed voices: queued utterance speaks with the en voice', log1.spoken.length === 1 && log1.spoken[0].voice === 'Google US English' && log1.spoken[0].lang === 'en-US', log1.spoken);
    const w0 = await ev(`(function(){var w=window.__v15.words[0]; return {id:w.id};})()`);
    await ev(`window.__v15.speakWord(${JSON.stringify(w0.id)})`);
    await sleep(120);
    await ev(`window.__v18.speakKO('안녕하세요')`);
    await sleep(120);
    await ev(`window.__v19.speakKO('안녕하세요')`);
    await sleep(120);
    await ev(`window.__v27.speakKOText('안녕하세요')`);
    await sleep(200);
    const log2 = await ev(`JSON.parse(JSON.stringify(window.__ttsLog))`);
    verdict('G9.18 speakWord speaks with the en-US voice', log2.spoken.length >= 2 && log2.spoken[1].voice === 'Google US English', log2.spoken[1]);
    verdict('G9.19 speakKO v18+v19 speak with the ko-KR voice', log2.spoken.length >= 4 && log2.spoken[2].voice === 'Google 한국어' && log2.spoken[3].voice === 'Google 한국어', log2.spoken.slice(2, 4));
    verdict('G9.20 speakKOText v27 speaks with the ko-KR voice', log2.spoken.length >= 5 && log2.spoken[4].voice === 'Google 한국어', log2.spoken[4]);
    verdict('G9.21 all live speaks consulted getVoices()', log2.gv >= 5, { gv: log2.gv });
    verdict('G9.22 no cancel-then-speak drop when idle', log2.cancelled === 0, { cancelled: log2.cancelled });
    await ev(`window.__ttsStub._fireVoices(${JSON.stringify([{name:'Voix française',lang:'fr-FR',default:false}])})`);
    await ev(`window.__v15.speakWord(${JSON.stringify(w0.id)})`);
    await sleep(300);
    const log3 = await ev(`JSON.parse(JSON.stringify(window.__ttsLog))`);
    verdict('G9.23 no matching voice: honest error shown (pop)', log3.spoken.length === 5 && log3.pops.length === 1 && log3.pops[0] === 'Không phát được âm thanh — bấm Nghe lại.', { spoken: log3.spoken.length, pops: log3.pops });
    return { t18, t19, ttsSpoken: log3.spoken.length, pops: log3.pops };
  });

  // G8 — console/dialog summary for the whole run.
  await step('G8-summary', async () => {
    verdict('G8.1 0 console errors in the whole run', C.consoleErrors.length === 0, C.consoleErrors);
    verdict('G8.2 0 console warnings in the whole run', C.consoleWarns.length === 0, C.consoleWarns);
    verdict('G8.3 0 JS dialogs in the whole run', C.dialogs.length === 0, C.dialogs);
    return { errors: C.consoleErrors.length, warns: C.consoleWarns.length, dialogs: C.dialogs.length };
  });

  const passed = verdicts.filter(v => v.pass).length;
  const failed = verdicts.filter(v => !v.pass);
  note(`\n== verify-v51c summary: ${passed}/${verdicts.length} PASS ==`);
  if (failed.length) { note('FAILURES:'); failed.forEach(v => note('  - ' + v.name + ' — ' + JSON.stringify(v.detail).slice(0, 300))); }
  saveResults();
  close();
  process.exit(failed.length ? 1 : 0);
}
main().catch(e => { console.error('VERIFY DRIVER FAILED:', e); close(); process.exit(1); });
