// verify-v52c.js - V19.5.1 (layer V52) Chrome verification driver.
// Real Chrome 157 via CDP, local HTTP. Parameterised so the SAME driver
// runs on the built tree (default: out) or the unzipped ZIP dir.
//   node tools/v52/verify-v52c.js [DIR] [httpPort] [cdpPort] [profile] [resultsFile] [shotPrefix]
// Defaults: DIR=out, http 8752, cdp 9232, profile chrome-v52c-prof,
// results tools/v52/logs/v52c-results.json, shots v52c-*.
// Exit 0 = driver completed (verdicts in the results JSON + stdout).
// Gates:
//   G0 boot clean (fresh guest, title V19.5.1, __v52 19.5.1, __v50 19.5.0
//      regression, WORDS 4892, 0 console errors/warnings/dialogs)
//   G1-G8 V49 regressions (listening state, error boxes, token guard,
//      error codes, contrast + 360px fight card, voice win, misc)
//   G9 F-1 FIXED live - fight() restart aborts the live rec + monotonic
//      token (v18 direct, v18 via hub navigation, v19 fireking); the
//      orphan result never answers the new question on any path
//   G10 C-R5-2 FIXED live - seeded due-less learned word reads
//      "Den han hom nay" in the Smart weak list (never "20779 ngay")
//   G11 C-R5-3 FIXED live - a 5/5 Forge session shows "Diem buoi:"
//      + "Diem cao nhat:" on the end screen in the live overlay
//   G12 C-R5-4 FIXED live - KO Hub at 360px: 0 buttons under 44px,
//      no horizontal overflow (EN hub spot-checked too)
//   G14 C-R5-1 FIXED live - mixed-mode fight XP trace (v18 EN, v19 EN,
//      v18 KO): grammar + sentence (builder) correct answers pay +10 XP
//      and advance the streak through the shared V46 function, wordless;
//      word-answer XP matches the pristine V19.5 behaviour; no qkey ever
//      lands in the word SRS maps
//   G15 Android TTS FIXED live - shared __v52 helper against a stubbed
//      speechSynthesis (Android-like: voices start empty): delayed voices
//      queue then speak with the matched voice; all live speak paths
//      (speakWord, speakKO v18+v19, speakKOText v27, Dojo speakText)
//      consult getVoices() and pick the right voice; no matching voice
//      shows the honest "Khong phat duoc am thanh - bam Nghe lai." pop;
//      cancel runs only while speaking and the utterance is deferred
//   G16 360px spot-check - the honest TTS error toast is visible at 360px
//      with no horizontal overflow
//   G17 console/dialog summary: 0 errors, 0 warnings, 0 JS dialogs
// HONEST LIMITS: real rendering/layout/paint in headless Chrome 157;
// the SpeechRecognition here is a controllable stub (no real mic -
// a real-mic end-to-end still needs Anh's phone); the speechSynthesis
// here is a controllable stub too (no real voices, no audio - real
// Android TTS end-to-end needs Anh's real Android phone); live-phone,
// live-Firebase and first-open-on-GitHub-Pages gates stay Anh-only.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const POLICY = '/tmp/webgl-policy.txt';
const DIR = process.argv[2] || '/home/hatch/workspace/v7build/out';
const HTTPPORT = parseInt(process.argv[3] || '8752', 10);
const PORT = parseInt(process.argv[4] || '9232', 10);
const PROFILE = process.argv[5] || 'chrome-v52c-prof';
const RESULTS_FILE = process.argv[6] || 'v52c-results.json';
const SHOT_PREFIX = process.argv[7] || 'v52c';
const TDIR = '/home/hatch/workspace/v7build/tools/v52';
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

// --- V49 in-page helpers ---
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
// --- V52 in-page helpers ---
// Controllable speechSynthesis stub (Android-like: the voice list starts
// EMPTY and fills only when _fireVoices is called) + a fake
// SpeechSynthesisUtterance constructor. speechSynthesis is a getter on
// Window.prototype, so plain assignment would silently fail — the stub is
// installed with Object.defineProperty. The stub's speak() clears its
// `speaking` flag after 50 ms (simulating the utterance ending, which a
// real synth reports via onend); without that, every later speak would
// take the cancel+defer path and the gate could not tell "idle" from
// "speaking". The global pop/toast are wrapped so the honest-error
// message is observable in __ttsLog.pops (every speak path funnels its
// onErr through pop15/pop18/pop19/pop22/pop48 -> the global pop).
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
async function startWizard() {
  return await ev(`(function(){
    var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
    var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
    v18.fight('v10_wizard','en');
    var F=v18._test.F();
    return {live:!!F, qmode:F&&F.qmode, word:F&&F.cur&&F.cur.w&&F.cur.w.en, boss:F&&F.boss&&F.boss.id, timer:!!(F&&F.timer), left:F&&F.left};
  })()`);
}
async function F18() {
  return await ev(`(function(){var F=window.__v18._test.F(); if(!F) return null;
    return {answered:F.answered, ok:F.ok, hearts:F.hearts, hp:F.hp, qmode:F.qmode,
      word:F.cur&&F.cur.w&&F.cur.w.en, heard:F.heard||null, listening:!!F.listening,
      err:F.speakErr||null, token:F.speakToken||0, timer:!!F.timer, left:F.left||0, over:F.over};})()`);
}
async function F19() {
  return await ev(`(function(){var F=window.__v19._test.F(); if(!F) return null;
    return {answered:F.answered, ok:F.ok, hearts:F.hearts, hp:F.hp, qmode:F.qmode,
      word:F.cur&&F.cur.w&&F.cur.w.en, heard:F.heard||null, listening:!!F.listening,
      err:F.speakErr||null, token:F.speakToken||0, timer:!!F.timer, left:F.left||0, over:F.over};})()`);
}
async function fightHTML18() { return await ev(`(document.querySelector('#v18fight')||{}).innerHTML || ''`); }
async function fightHTML19() { return await ev(`(document.querySelector('#v19fight')||{}).innerHTML || ''`); }
// WCAG contrast, computed in-page from getComputedStyle.
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
// The #v18fight host only exists after the Challenge arena is opened
// (openArena renders <div id="v18fight"> into #v15body). Every gate
// that reads the fight DOM must open the arena first.
async function openEnArena() {
  await ev(`window.__v15.openHub('bosses')`); await sleep(800);
  await ev(`window.__v18.openArena('en')`); await sleep(800);
}

async function main() {
  await openPage();
  // G0 — boot clean.
  await step('G0-boot', async () => {
    const boot = await ev(`(function(){ return {title: document.title, hasV52: !!window.__v52, v52: window.__v52&&window.__v52.version, hasV50: !!window.__v50, v50: window.__v50&&window.__v50.version, hasV49: !!window.__v49, v49: window.__v49&&window.__v49.version, words: (window.__v15&&window.__v15.words||[]).length, hasV18: !!window.__v18, hasV19: !!window.__v19}; })()`);
    const servedTitle = await (await fetch(URL)).text().then(t => (t.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
    verdict('G0.1 served title is V19.5.1 Round5 Patch', servedTitle.includes('V19.5.1 — Round5 Patch'), servedTitle);
    verdict('G0.2 __v52 19.5.1 present', boot.hasV52 && boot.v52 === '19.5.1', boot);
    verdict('G0.2b __v50 19.5.0 still present (regression)', boot.hasV50 && boot.v50 === '19.5.0', boot);
    verdict('G0.2c __v49 19.4.0 still present (regression)', boot.hasV49 && boot.v49 === '19.4.0', boot);
    verdict('G0.3 WORDS 4892', boot.words === 4892, boot.words);
    verdict('G0.4 0 console errors at boot', C.consoleErrors.length === 0, C.consoleErrors);
    verdict('G0.5 0 console warnings at boot', C.consoleWarns.length === 0, C.consoleWarns);
    verdict('G0.6 0 dialogs at boot', C.dialogs.length === 0, C.dialogs);
    return boot;
  });

  // G1 — D1 + D2 live.
  await step('G1-listen', async () => {
    await freshGuest();
    await installSR();
    await openEnArena();
    // D1: sync-fire result applied.
    await setSRMode('syncfire');
    const w = await startWizard();
    verdict('G1.1 wizard fight live, speak question', w.live === true && w.qmode === 'speak' && typeof w.word === 'string', w);
    await ev(`window.__SRWORD=${JSON.stringify(w.word)};`);
    await ev(`window.__v18.bossSpeak()`);
    await sleep(300);
    const f = await F18();
    const lost = await ev(`window.__lastSR49._lostSync`);
    verdict('G1.2 sync-fire result applied (not lost)', lost === false && f.answered !== null && f.ok === true, { lostSync: lost, answered: f.answered, ok: f.ok });
    await ev(`window.__v18.close()`);
    // D2: listening state in the live DOM.
    await setSRMode('silent');
    const w2 = await startWizard();
    await ev(`window.__v18.bossSpeak()`);
    await sleep(300);
    const f2 = await F18();
    const h = await fightHTML18();
    const st = await ev(`window.__v18.speakState()`);
    verdict('G1.3 listening flag set while mic is live', f2.listening === true, f2);
    verdict('G1.4 live DOM shows "Đang nghe… hãy nói: <word>"', h.includes('Đang nghe… hãy nói:') && h.includes(w2.word), h.slice(0, 200));
    verdict('G1.5 Nói button disabled while listening', /<button class="btn pri"[^>]*disabled[^>]*>Nói<\/button>/.test(h), h.match(/<button class="btn pri"[^>]*>Nói<\/button>/)?.[0] || null);
    verdict('G1.6 speakState() hook reports listening', st && st.listening === true && st.answered === null, st);
    await shot('g1-listening-light');
    // Voice answer clears the listening state.
    await ev(`window.__lastSR49.fireResult(${JSON.stringify(w2.word)})`);
    await sleep(300);
    const f3 = await F18();
    verdict('G1.7 voice answer clears listening', f3.listening === false && f3.answered !== null && f3.ok === true, f3);
    await ev(`window.__v18.close()`);
    return { w: w.word, w2: w2.word };
  });

  // G2 — D3 + D4 live.
  await step('G2-errors', async () => {
    await installSR();
    await openEnArena();
    // D3: start() throws -> visible start-failed box + retry.
    await setSRMode('throw');
    const w = await startWizard();
    await ev(`window.__v18.bossSpeak()`);
    await sleep(300);
    const f = await F18();
    const h = await fightHTML18();
    verdict('G2.1 start() throw leaves question unanswered', f.answered === null, f);
    verdict('G2.2 start-failed box shown with retry', h.includes('v49err') && h.includes('Không mở được micro') && h.includes('thử lại'), h.slice(0, 300));
    await shot('g2-start-failed');
    // Retry after the failure.
    await setSRMode('silent');
    await ev(`window.__v18.bossSpeak()`);
    await sleep(200);
    const f2 = await F18();
    verdict('G2.3 retry works after failed start', f2.listening === true && f2.err === null, f2);
    await ev(`window.__lastSR49.fireResult(${JSON.stringify(w.word)})`);
    await sleep(200);
    const f3 = await F18();
    verdict('G2.4 retry + correct voice answer wins the question', f3.answered !== null && f3.ok === true, f3);
    await ev(`window.__v18.close()`);
    // D4: onend with no result -> no-speech box, not frozen.
    await setSRMode('silent');
    const w4 = await startWizard();
    await ev(`window.__v18.bossSpeak()`);
    await sleep(200);
    await ev(`window.__lastSR49.fireEnd()`);
    await sleep(300);
    const f4 = await F18();
    const h4 = await fightHTML18();
    verdict('G2.5 onend with no result is not a freeze', f4.answered === null && f4.listening === false, f4);
    verdict('G2.6 no-speech box shown with retry', h4.includes('v49err') && h4.includes('không nghe thấy gì') && h4.includes('thử lại'));
    await shot('g2-onend');
    await ev(`window.__v18.bossSpeak()`);
    await sleep(200);
    const f5 = await F18();
    verdict('G2.7 re-tap Nói after onend listens again', f5.listening === true && f5.err === null, f5);
    await ev(`window.__lastSR49.fireResult(${JSON.stringify(w4.word)})`);
    await sleep(200);
    const f6 = await F18();
    verdict('G2.8 re-tap + correct voice answer wins the question', f6.answered !== null && f6.ok === true, f6);
    await ev(`window.__v18.close()`);
    return { w: w.word, w4: w4.word };
  });

  // G3 — D5 live (late/stale results, abort on next/close).
  await step('G3-token', async () => {
    await installSR();
    await openEnArena();
    await setSRMode('silent');
    const w = await startWizard();
    await ev(`window.__v18.bossSpeak()`);
    await sleep(200);
    await ev(`window.__v18._test.pickWrong()`);
    const before = await F18();
    await ev(`window.__lastSR49.fireResult(${JSON.stringify(w.word)})`);
    await sleep(200);
    const afterDrop = await F18();
    verdict('G3.1 late result after an answer is dropped', afterDrop.answered === before.answered && afterDrop.ok === before.ok, { before, afterDrop });
    await ev(`window.__v18.next()`);
    await sleep(200);
    const q2 = await F18();
    verdict('G3.2 next question unanswered before stale result', q2.answered === null, q2);
    await ev(`window.__lastSR49.fireResult(${JSON.stringify(w.word)})`);
    await sleep(200);
    const corrupted = await F18();
    verdict('G3.3 stale result does NOT answer the next question', corrupted.answered === null, corrupted);
    // next() aborts + bumps the token.
    await ev(`window.__v18.bossSpeak()`);
    await sleep(200);
    const t0 = (await F18()).token;
    await ev(`window.__v18._test.pickWrong()`);
    await ev(`window.__v18.next()`);
    const aborted = await ev(`window.__lastSR49._aborted`);
    const f = await F18();
    verdict('G3.4 next() aborts the live rec + bumps the token', aborted === true && f.token === t0 + 1 && f.listening === false, { aborted, t0, t1: f.token });
    // close() aborts too.
    await ev(`window.__v18.bossSpeak()`);
    await sleep(200);
    await ev(`window.__v18.close()`);
    const aborted2 = await ev(`window.__lastSR49._aborted`);
    const fNull = await F18();
    verdict('G3.5 close() aborts the live rec + clears the fight', aborted2 === true && fNull === null, { aborted2 });
    return { w: w.word };
  });

  // G4 — D6 live (all error codes).
  await step('G4-errors', async () => {
    await installSR();
    await openEnArena();
    await setSRMode('silent');
    const cases = [
      ['not-allowed', 'Micro bị chặn'],
      ['service-not-allowed', 'Micro bị chặn'],
      ['no-speech', 'không nghe thấy gì'],
      ['audio-capture', 'Không tìm thấy micro'],
      ['network', 'Lỗi mạng'],
      ['aborted', 'Đã dừng nghe'],
      ['unknown', 'Không nghe được giọng nói'],
    ];
    for (const [code, needle] of cases) {
      const w = await startWizard();
      await ev(`window.__v18.bossSpeak()`);
      await sleep(200);
      await ev(`window.__lastSR49.fireError(${JSON.stringify(code)})`);
      await sleep(300);
      const f = await F18();
      const h = await fightHTML18();
      verdict(`G4.${code} shows "${needle}" + retry`, f.err && f.err.includes(needle) && f.err.includes('thử lại') && h.includes('v49err'), { err: f.err });
      verdict(`G4.${code} generic "(không nghe được)" never set`, f.heard !== '(không nghe được)', f.heard);
      await ev(`window.__v18.close()`);
    }
    return { cases: cases.length };
  });

  // G5 — contrast (light + dark, v18 + v19) + 360px.
  await step('G5-contrast', async () => {
    await installSR();
    await openEnArena();
    await setSRMode('silent');
    // Light theme, v18 panel: listening chip + error box.
    const w = await startWizard();
    await ev(`window.__v18.bossSpeak()`);
    await sleep(300);
    const listenLight = await chipContrast('.v49listen');
    verdict('G5.1 .v49listen contrast >= 4.5 (light, v18)', listenLight.found && listenLight.ratio !== null && listenLight.ratio >= 4.5, listenLight);
    await ev(`window.__lastSR49.fireError('not-allowed')`);
    await sleep(300);
    const errLight = await chipContrast('.v49err');
    verdict('G5.2 .v49err contrast >= 4.5 (light, v18)', errLight.found && errLight.ratio !== null && errLight.ratio >= 4.5, errLight);
    await shot('g5-error-light');
    await ev(`window.__v18.close()`);
    // Dark theme: reload with prefers-color-scheme dark.
    await setViewport(1280, 800, false, true);
    await reloadWait(2800);
    await installSR();
    await openEnArena();
    await setSRMode('silent');
    const wD = await startWizard();
    await ev(`window.__v18.bossSpeak()`);
    await sleep(300);
    const listenDark = await chipContrast('.v49listen');
    verdict('G5.3 .v49listen contrast >= 4.5 (dark, v18)', listenDark.found && listenDark.ratio !== null && listenDark.ratio >= 4.5, listenDark);
    await ev(`window.__lastSR49.fireError('not-allowed')`);
    await sleep(300);
    const errDark = await chipContrast('.v49err');
    verdict('G5.4 .v49err contrast >= 4.5 (dark, v18)', errDark.found && errDark.ratio !== null && errDark.ratio >= 4.5, errDark);
    await shot('g5-error-dark');
    await ev(`window.__v18.close()`);
    // v19 panel (fixed dark): forced speak state on fireking.
    await ev(`(function(){
      var v19=window.__v19, e19=v19.en19(); e19.bosses=e19.bosses||{};
      window.__V19_DATA.bosses.forEach(function(b){ e19.bosses[b.id]={en:{win:1}}; });
      v19.openMapFor('en'); v19.fight('v11_fireking');
      var F=v19._test.F(); var wd=window.__v15.words[0];
      F.qmode='speak'; F.cur={w:wd,opts:[wd]}; F.answered=null; F.ok=null; F.heard=null; F.speakErr=null; F.listening=false;
      v19._test.F();
    })()`);
    await ev(`window.__v19.bossSpeak()`);
    await sleep(300);
    const listenV19 = await chipContrast('.v49listen');
    verdict('G5.5 .v49listen contrast >= 4.5 (dark, v19 panel)', listenV19.found && listenV19.ratio !== null && listenV19.ratio >= 4.5, listenV19);
    await ev(`window.__lastSR49.fireError('network')`);
    await sleep(300);
    const errV19 = await chipContrast('.v49err');
    verdict('G5.6 .v49err contrast >= 4.5 (dark, v19 panel)', errV19.found && errV19.ratio !== null && errV19.ratio >= 4.5, errV19);
    await ev(`window.__v19.close()`);
    // 360px: listening chip visible, no horizontal overflow.
    await setViewport(360, 800, true, false);
    await reloadWait(2800);
    await installSR();
    await openEnArena();
    await setSRMode('silent');
    const wM = await startWizard();
    await ev(`window.__v18.bossSpeak()`);
    await sleep(300);
    const hM = await fightHTML18();
    const ov = await overflowAt();
    verdict('G5.7 360px: listening chip visible, no horizontal overflow', hM.includes('Đang nghe…') && ov.scrollW <= ov.innerW + 1, { ov, hasListen: hM.includes('Đang nghe…') });
    await shot('g5-360-listening');
    await ev(`window.__v18.close()`);
    // Back to desktop light for the remaining gates.
    await setViewport(1280, 800, false, false);
    await reloadWait(2800);
    return { listenLight, errLight, listenDark, errDark, listenV19, errV19, ov };
  });

  // G6 — full voice win in live Chrome.
  await step('G6-voice-win', async () => {
    await freshGuest();
    await installSR();
    await openEnArena();
    await setSRMode('silent');
    const xp0 = await ev(`S.xp||0`);
    const w = await startWizard();
    let rounds = 0;
    while (rounds < 40) {
      const f = await F18();
      if (!f || f.over) break;
      rounds++;
      if (f.answered !== null) { await ev(`window.__v18.next()`); continue; }
      if (f.qmode === 'speak') {
        await ev(`window.__v18.bossSpeak()`);
        await sleep(150);
        await ev(`window.__lastSR49.fireResult(${JSON.stringify(f.word)})`);
        await sleep(150);
      } else {
        await ev(`window.__v18._test.pickCorrect()`);
        await sleep(100);
      }
    }
    const f = await F18();
    const xp1 = await ev(`S.xp||0`);
    verdict('G6.1 wizard fight won by voice in live Chrome', f && f.over === 'win', { rounds, over: f && f.over, hp: f && f.hp });
    verdict('G6.2 voice win pays XP', xp1 > xp0, { xp0, xp1 });
    await shot('g6-voice-win');
    return { rounds, over: f && f.over, xp0, xp1 };
  });

  // G7 — regressions.
  await step('G7-regress', async () => {
    await freshGuest();
    await installSR();
    await openEnArena();
    // Non-speak boss: slime MC fight, no SR constructed.
    await ev(`(function(){
      var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
      var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
      v18.fight('v10_slime','en');
    })()`);
    const f0 = await F18();
    verdict('G7.1 slime fight starts as mc', f0.qmode === 'mc', f0);
    await ev(`window.__v18._test.pickCorrect()`);
    const f1 = await F18();
    verdict('G7.2 MC correct answer works (no SR involved)', f1.answered !== null && f1.ok === true, f1);
    verdict('G7.3 no SpeechRecognition constructed in an MC fight', (await ev(`window.__lastSR49 === undefined`)) === true);
    await ev(`window.__v18.close()`);
    // KO wizard fight: Korean MC, no SR.
    await ev(`(function(){
      var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
      var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
      v18.fight('v10_wizard','ko');
    })()`);
    const fK = await F18();
    verdict('G7.4 KO wizard fight is Korean MC (speak->mc)', fK.qmode === 'mc', fK);
    verdict('G7.5 no SR in a KO fight', (await ev(`window.__lastSR49 === undefined`)) === true);
    await ev(`window.__v18.close()`);
    // v15 speak mode renders (open the mode UI).
    const speakUI = await ev(`(function(){
      try { window.__v15.startMode('speak'); return {ok:true}; } catch(e){ return {ok:false, err:String(e)}; }
    })()`);
    await sleep(800);
    const speakHTML = await ev(`document.body.innerHTML.includes('Bấm để nói') || document.body.innerHTML.includes('nói')`);
    verdict('G7.6 v15 speak mode opens without errors', speakUI.ok === true && speakHTML === true, { speakUI, speakHTML });
    await ev(`window.__v15.openHub('en')`).catch(() => {});
    await sleep(500);
    // v48 Dojo overlay opens.
    const dojo = await ev(`(function(){
      try { window.__v48.openForge('en','dojo'); return {ok:true}; } catch(e){ return {ok:false, err:String(e)}; }
    })()`);
    await sleep(800);
    const dojoHTML = await ev(`!!document.querySelector('#v48hub')`);
    verdict('G7.7 v48 Dojo overlay opens', dojo.ok === true && dojoHTML === true, { dojo, dojoHTML });
    await ev(`(function(){ var h=document.querySelector('#v48hub'); if(h) h.remove(); })()`).catch(() => {});
    return { f0, fK };
  });

  // G9 — F-1 FIXED live (review-A probe 2, F5 logic, inverted).
  await step('G9-f1-restart', async () => {
    await freshGuest();
    await installSR();
    await openEnArena();
    await setSRMode('silent');
    await ev(`(function(){
      var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
      var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
    })()`);
    // (a) Direct fight() restart while listening (v18).
    await ev(`window.__v18.fight('v10_wizard','en')`); await sleep(300);
    const w0 = await F18();
    verdict('G9.1 direct: wizard speak question live', w0.qmode === 'speak' && !!w0.word, w0);
    await ev(`window.__v18.bossSpeak()`); await sleep(200);
    await ev(`window.__oldSR49 = window.__lastSR49; window.__oldSR49._aborted=false;`);
    const tokOld = (await F18()).token;
    await ev(`window.__v18.fight('v10_wizard','en')`); await sleep(300);
    const restartAborted = await ev(`window.__oldSR49._aborted`);
    const fR = await F18();
    verdict('G9.2 direct: fight() restart ABORTS the live rec', restartAborted === true, { restartAborted, tokOld, newToken: fR.token });
    verdict('G9.3 direct: new fight token is monotonic (not 0)', fR.token === 2, fR);
    await ev(`window.__v18.bossSpeak()`); await sleep(200);
    const fR2 = await F18();
    verdict('G9.4 direct: new tap Nói gets token 3 (never reuses orphan token 1)', fR2.token === 3, fR2);
    await ev(`window.__oldSR49.fireResult(${JSON.stringify(w0.word)})`); await sleep(300);
    const fAfter = await F18();
    verdict('G9.5 direct: orphan result does NOT answer the new question', fAfter.answered === null, { oldWord: w0.word, newWord: fR2.word, after: fAfter });
    await ev(`window.__v18.close()`); await sleep(200);
    // (b) Same via the hub-navigation path (review-A F5.4–F5.5).
    await ev(`window.__v18.fight('v10_wizard','en')`); await sleep(300);
    const u0 = await F18();
    await ev(`window.__v18.bossSpeak()`); await sleep(200);
    await ev(`window.__oldSR49 = window.__lastSR49; window.__oldSR49._aborted=false;`);
    await ev(`window.__v15.openHub('bosses')`); await sleep(600);
    await ev(`window.__v18.openArena('en')`); await sleep(600);
    const navAborted = await ev(`window.__oldSR49._aborted`);
    // NOTE: the V50 fix guarantees the abort at the next fight(), not
    // at hub navigation itself — record navAborted, do not gate on it.
    note('G9.6-note hub navigation aborts the live rec:', JSON.stringify(navAborted));
    await ev(`window.__v18.fight('v10_wizard','en')`); await sleep(300);
    const navAborted2 = await ev(`window.__oldSR49._aborted`);
    verdict('G9.6 hub-nav: the next fight() aborts the orphan rec', navAborted2 === true, { navAborted, navAborted2 });
    await ev(`window.__v18.bossSpeak()`); await sleep(200);
    const u1 = await F18();
    await ev(`window.__oldSR49.fireResult(${JSON.stringify(u0.word)})`); await sleep(300);
    const uAfter = await F18();
    verdict('G9.7 hub-nav: orphan result does NOT answer the new question', uAfter.answered === null, { oldWord: u0.word, newWord: u1.word, uAfter });
    await ev(`window.__v18.close()`); await sleep(200);
    // (c) v19 engine: forced speak on fireking, direct restart.
    await ev(`(function(){
      var v19=window.__v19, e19=v19.en19(); e19.bosses=e19.bosses||{};
      window.__V19_DATA.bosses.forEach(function(b){ e19.bosses[b.id]={en:{win:1}}; });
      v19.openMapFor('en'); v19.fight('v11_fireking');
      var F=v19._test.F();
      for(var i=0;i<12 && !(F&&F.cur&&F.cur.w);i++){ v19._test.next(); F=v19._test.F(); }
      if(F&&F.cur&&F.cur.w) F.qmode='speak';
    })()`);
    const v19w = await F19();
    verdict('G9.8 v19: fireking forced to a speak question', v19w.qmode === 'speak' && !!v19w.word, v19w);
    await ev(`window.__v19.bossSpeak()`); await sleep(200);
    await ev(`window.__oldSR49 = window.__lastSR49; window.__oldSR49._aborted=false;`);
    const tok19 = (await F19()).token;
    await ev(`window.__v19.fight('v11_fireking')`); await sleep(300);
    const aborted19 = await ev(`window.__oldSR49._aborted`);
    const f19R = await F19();
    verdict('G9.9 v19: restart ABORTS the live rec, token monotonic', aborted19 === true && f19R.token === 2, { aborted19, tokOld: tok19, newToken: f19R.token });
    await ev(`(function(){var F=window.__v19._test.F(); if(F&&F.cur&&F.cur.w){F.qmode='speak';} return 1})()`);
    await ev(`window.__v19.bossSpeak()`); await sleep(200);
    await ev(`window.__oldSR49.fireResult(${JSON.stringify(v19w.word)})`); await sleep(300);
    const f19After = await F19();
    verdict('G9.10 v19: orphan result does NOT answer the new question', f19After.answered === null, { oldWord: v19w.word, after: f19After });
    await ev(`window.__v19.close()`);
    return { w0: w0.word, u0: u0.word, v19w: v19w.word };
  });

  // G10 — C-R5-2 FIXED live (review-C p06b weak-list path).
  await step('G10-due-less-label', async () => {
    await freshGuest();
    const seeded = await ev(`(function(){
      var v15=window.__v15, w=v15.words[0];
      var old=v15.enOld(); old.box[w.id]=2; old.right[w.id]=0; old.wrong[w.id]=0;
      var e15=v15.en15(); e15.due=e15.due||{}; delete e15.due[w.id];
      v15.save15();
      return {word: w.en, id: w.id, cls: window.__v27.classifyEN(w)};
    })()`);
    verdict('G10.1 classifyEN (live) reason is "Đến hạn hôm nay"', seeded.cls.reason === 'Đến hạn hôm nay' && seeded.cls.overdue === 0, seeded.cls);
    await ev(`window.__v27.openSmart()`); await sleep(400);
    await ev(`window.__v27.setTab('weak')`); await sleep(500);
    // The seeded word's priority is now 0 (the phantom +30 is gone),
    // so it falls outside the rendered top-100 on "Tất cả". Filter to
    // "Đến hạn" (REVIEW only) — on a fresh save it is the only due word.
    const filterClicked = await ev(`(function(){ var bs=[...document.querySelectorAll('#v27hub button')]; var b=bs.find(function(x){return x.textContent.trim()==='Đến hạn'}); if(b) b.click(); return !!b; })()`);
    await sleep(500);
    verdict('G10.1b "Đến hạn" filter exists and was clicked', filterClicked === true, { filterClicked });
    const weakTxt = await ev(`(document.querySelector('#v27hub')||{innerText:''}).innerText`);
    verdict('G10.2 weak list shows "Đến hạn hôm nay" for the due-less word', weakTxt.includes('Đến hạn hôm nay'), weakTxt.slice(0, 400));
    verdict('G10.3 weak list never shows "20779 ngày"', !weakTxt.includes('20779'), weakTxt.slice(0, 400));
    await shot('g10-weak-list');
    return { seeded };
  });

  // G11 — C-R5-3 FIXED live (Forge session in the live overlay).
  await step('G11-forge-score', async () => {
    await freshGuest();
    const r = await ev(`(function(){
      var T=window.__v48._test, out={scores:[], total:0};
      var v15=window.__v15, old=v15.enOld();
      for(var i=0;i<12&&i<v15.words.length;i++) old.box[v15.words[i].id]=1;
      v15.save15();
      T.startForgeSession('en');
      for(var s=0;s<5;s++){
        var FS=T.session(), cur=FS.list[FS.i], tiles=FS.tiles||[];
        if(!tiles.length){
          FS.tiles=tiles=cur.tokens.map(function(t,i){return {t:t,k:i}});
          for(var i2=tiles.length-1;i2>0;i2--){var j=Math.floor(Math.random()*(i2+1));var tmp=tiles[i2];tiles[i2]=tiles[j];tiles[j]=tmp}
        }
        var used={};
        cur.tokens.forEach(function(tok){
          for(var k=0;k<tiles.length;k++){ if(!used[k]&&tiles[k].t===tok){ used[k]=1; T.forgeTap(k); break; } }
        });
        var chk=T.forgeCheck();
        out.scores.push(chk&&chk.score); out.total+=(chk&&chk.score)||0;
        if(s<4) T.forgeNext();
      }
      var fin=T.forgeNext();
      out.fin=fin;
      var e=T.en48();
      out.scoreTotal=e.forge.scoreTotal; out.bestScore=e.forge.bestScore;
      return out;
    })()`);
    verdict('G11.1 live Forge session ends 5/5 with a positive total', r.fin && r.fin.right === 5 && r.total > 0, { total: r.total, fin: r.fin });
    verdict('G11.2 live en48.forge persists scoreTotal + bestScore', r.scoreTotal === r.total && r.bestScore === r.total, { scoreTotal: r.scoreTotal, bestScore: r.bestScore, total: r.total });
    await ev(`window.__v48.openForge('en','forge')`); await sleep(700);
    const hubHTML = await ev(`(document.querySelector('#v48hub')||{innerHTML:''}).innerHTML`);
    verdict('G11.3 live end screen shows "Điểm buổi:"', hubHTML.includes('Điểm buổi:'), hubHTML.slice(0, 400));
    verdict('G11.4 live end screen shows "Điểm cao nhất:"', hubHTML.includes('Điểm cao nhất:'), hubHTML.slice(0, 400));
    await shot('g11-forge-score');
    await ev(`window.__v48.closeForge()`);
    return { total: r.total };
  });

  // G12 — C-R5-4 FIXED live (review-C p12a measurement, 360px KO hub).
  await step('G12-ko-44px', async () => {
    await freshGuest();
    await setViewport(360, 800, true, false);
    await reloadWait(2800);
    const ko = await ev(`(function(){
      function measure(rootSel){
        var root=document.querySelector(rootSel)||document.body;
        var small=[];
        root.querySelectorAll('button').forEach(function(b){
          var br=b.getBoundingClientRect();
          if(br.width>0&&br.height>0&&br.height<44) small.push({txt:(b.innerText||'').slice(0,30), h:Math.round(br.height), w:Math.round(br.width)});
        });
        return {scrollW:root.scrollWidth, clientW:root.clientWidth, smallBtns:small.slice(0,10), smallBtnCount:small.length};
      }
      return {ko: measure('#v7app'), ov: {scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth}};
    })()`);
    verdict('G12.1 KO Hub at 360px: 0 buttons under 44px', ko.ko.smallBtnCount === 0, ko.ko);
    verdict('G12.2 KO Hub at 360px: no horizontal overflow', ko.ov.scrollW <= ko.ov.innerW + 1, ko.ov);
    await shot('g12-ko-360');
    // EN hub spot-check (was already 0 in round 5 — must stay 0).
    await ev(`window.__v15.openHub('en')`); await sleep(800);
    const en = await ev(`(function(){
      var root=document.querySelector('#v15hub')||document.body; var small=[];
      root.querySelectorAll('button').forEach(function(b){ var br=b.getBoundingClientRect(); if(br.width>0&&br.height>0&&br.height<44) small.push({txt:(b.innerText||'').slice(0,30), h:Math.round(br.height)}); });
      return {scrollW:root.scrollWidth, clientW:root.clientWidth, smallBtnCount:small.length, smallBtns:small.slice(0,5)};
    })()`);
    verdict('G12.3 EN Hub at 360px: still 0 buttons under 44px', en.smallBtnCount === 0, en);
    await setViewport(1280, 800, false, false);
    await reloadWait(2800);
    return { ko, en };
  });


  // G14 — C-R5-1 FIXED live (test52 §13 trace, run in real Chrome).
  await step('G14-cr51-xp', async () => {
    await freshGuest();
    await installSR();
    await openEnArena();
    await setSRMode('silent');
    // (a) v18 EN dict fight: mc,grammar,listen,builder in order.
    const r18 = await mixedTrace(`v18.fight('v10_dict','en');`);
    const t18 = r18.trace, by18 = {};
    t18.forEach(function (r) { by18[r.qmode] = r; });
    verdict('G14.1 v18 EN mixed fight asks all 4 types in order', t18.length === 4 && t18.map(function (r) { return r.qmode; }).join(',') === 'mc,grammar,listen,builder', t18);
    verdict('G14.2 v18 grammar now pays +10 XP', by18.grammar && by18.grammar.dxp === 10, by18.grammar);
    verdict('G14.3 v18 sentence (builder) now pays +10 XP', by18.builder && by18.builder.dxp === 10, by18.builder);
    verdict('G14.4 v18 vocab (mc) still pays +10 XP', by18.mc && by18.mc.dxp === 10, by18.mc);
    const expListen18 = (by18.listen && by18.mc && by18.listen.wordId === by18.mc.wordId) ? 0 : 10;
    verdict('G14.5 v18 listen pays the cooldown-aware amount', by18.listen && by18.listen.dxp === expListen18, { listen: by18.listen, expected: expListen18 });
    verdict('G14.6 v18 streak advances 0->1->2->3->4', t18.map(function (r) { return r.streak; }).join(',') === '0->1,1->2,2->3,3->4', t18.map(function (r) { return r.streak; }));
    verdict('G14.7 v18 mixed total == 30 + listen', t18.reduce(function (a, r) { return a + r.dxp; }, 0) === 30 + expListen18, { total: t18.reduce(function (a, r) { return a + r.dxp; }, 0), expected: 30 + expListen18 });
    verdict('G14.8 v18 word SRS maps hold no qkey', r18.colonBox.length === 0 && r18.colonRight.length === 0, { colonBox: r18.colonBox, colonRight: r18.colonRight });
    await ev(`window.__v18.close()`);
    // (b) v19 EN butterflyqueen fight: same 4 types, second engine.
    const r19 = await mixedTrace(`window.__v19.openMapFor('en'); window.__v19.fight('v11_butterflyqueen');`);
    const t19 = r19.trace, by19 = {};
    t19.forEach(function (r) { by19[r.qmode] = r; });
    verdict('G14.9 v19 EN mixed fight asks all 4 types in order', t19.length === 4 && t19.map(function (r) { return r.qmode; }).join(',') === 'mc,grammar,listen,builder', t19);
    verdict('G14.10 v19 grammar now pays +10 XP', by19.grammar && by19.grammar.dxp === 10, by19.grammar);
    verdict('G14.11 v19 sentence (builder) now pays +10 XP', by19.builder && by19.builder.dxp === 10, by19.builder);
    const expListen19 = (by19.listen && by19.mc && by19.listen.wordId === by19.mc.wordId) ? 0 : 10;
    verdict('G14.12 v19 listen pays the cooldown-aware amount', by19.listen && by19.listen.dxp === expListen19, { listen: by19.listen, expected: expListen19 });
    verdict('G14.13 v19 streak advances 0->1->2->3->4', t19.map(function (r) { return r.streak; }).join(',') === '0->1,1->2,2->3,3->4', t19.map(function (r) { return r.streak; }));
    verdict('G14.14 v19 word SRS maps hold no qkey', r19.colonBox.length === 0 && r19.colonRight.length === 0, { colonBox: r19.colonBox, colonRight: r19.colonRight });
    await ev(`window.__v19.close()`);
    // (c) v18 KO dict fight: mc/type/listen rotation, Korean questions.
    const rko = await mixedTrace(`v18.fight('v10_dict','ko');`);
    const tko = rko.trace;
    verdict('G14.15 v18 KO mixed fight asks 4 questions incl. type + listen', tko.length === 4 && tko.some(function (r) { return r.qmode === 'type'; }) && tko.some(function (r) { return r.qmode === 'listen'; }), tko.map(function (r) { return r.qmode; }));
    verdict('G14.16 v18 KO every answer pays 0 or +10 XP (never negative, never partial)', tko.every(function (r) { return r.dxp === 0 || r.dxp === 10; }), tko.map(function (r) { return r.dxp; }));
    verdict('G14.17 v18 KO mixed total >= 20 XP', tko.reduce(function (a, r) { return a + r.dxp; }, 0) >= 20, { total: tko.reduce(function (a, r) { return a + r.dxp; }, 0) });
    verdict('G14.18 v18 KO word SRS maps hold no qkey', rko.colonBox.length === 0 && rko.colonRight.length === 0, { colonBox: rko.colonBox, colonRight: rko.colonRight });
    await ev(`window.__v18.close()`);
    return { t18, t19, tko };
  });

  // G15 — Android TTS FIXED live (stubbed voices: delayed / no-match /
  // never-loads). The stub is installed fresh here (earlier gates ran
  // with the real, voiceless headless speechSynthesis).
  await step('G15-tts-stub', async () => {
    await freshGuest();
    await installTTS();
    const VOICES = [{name:'Google US English',lang:'en-US',default:true},{name:'Google 한국어',lang:'ko-KR',default:false}];
    // (a) helper, delayed voices: queued, then spoken with the en voice.
    const q1 = await ev(`(function(){
      window.__ttsErrs=[];
      var r=window.__v52.speak('hello','en-US',1,function(c){window.__ttsErrs.push(c)});
      return {ret:r, spoken:window.__ttsLog.spoken.length, pending:window.__v52._test.pending()!==null};
    })()`);
    verdict('G15.1 delayed voices: speak queues (returns true, nothing spoken)', q1.ret === true && q1.spoken === 0 && q1.pending === true, q1);
    await ev(`window.__ttsStub._fireVoices(${JSON.stringify(VOICES)})`);
    await sleep(300);
    const log1 = await ev(`JSON.parse(JSON.stringify(window.__ttsLog))`);
    verdict('G15.2 delayed voices: queued utterance speaks with the en voice', log1.spoken.length === 1 && log1.spoken[0].voice === 'Google US English' && log1.spoken[0].lang === 'en-US', log1.spoken);
    // (b) live paths with voices ready. A short sleep after each call
    // lets the stub's 50 ms utterance-end clear `speaking`, so each
    // speak runs on an idle synth (deterministic order, no cancel).
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
    verdict('G15.3 speakWord speaks with the en-US voice', log2.spoken.length >= 2 && log2.spoken[1].voice === 'Google US English', log2.spoken[1]);
    verdict('G15.4 speakKO v18+v19 speak with the ko-KR voice', log2.spoken.length >= 4 && log2.spoken[2].voice === 'Google 한국어' && log2.spoken[3].voice === 'Google 한국어', log2.spoken.slice(2, 4));
    verdict('G15.5 speakKOText v27 speaks with the ko-KR voice', log2.spoken.length >= 5 && log2.spoken[4].voice === 'Google 한국어', log2.spoken[4]);
    verdict('G15.6 all live speaks consulted getVoices()', log2.gv >= 5, { gv: log2.gv });
    verdict('G15.7 no cancel-then-speak drop when idle', log2.cancelled === 0, { cancelled: log2.cancelled });
    // (c) no matching voice: honest error via pop, never silent.
    await ev(`window.__ttsStub._fireVoices(${JSON.stringify([{name:'Voix française',lang:'fr-FR',default:false}])})`);
    await ev(`window.__v15.speakWord(${JSON.stringify(w0.id)})`);
    await sleep(300);
    const log3 = await ev(`JSON.parse(JSON.stringify(window.__ttsLog))`);
    verdict('G15.8 no matching voice: honest error shown (pop)', log3.spoken.length === 5 && log3.pops.length === 1 && log3.pops[0] === 'Không phát được âm thanh — bấm Nghe lại.', { spoken: log3.spoken.length, pops: log3.pops });
    // (d) speaking: cancel runs, speak deferred to the next tick.
    await ev(`window.__ttsStub._fireVoices(${JSON.stringify(VOICES)})`);
    await ev(`window.__ttsStub._setSpeaking(true)`);
    const before = await ev(`JSON.parse(JSON.stringify(window.__ttsLog))`);
    await ev(`window.__v52.speak('deferred','en-US',1,function(){})`);
    const during = await ev(`JSON.parse(JSON.stringify(window.__ttsLog))`);
    verdict('G15.9 speaking: cancel called, speak deferred', during.cancelled === before.cancelled + 1 && during.spoken.length === before.spoken.length, { cancelled: during.cancelled, spoken: during.spoken.length });
    await sleep(300);
    const after = await ev(`JSON.parse(JSON.stringify(window.__ttsLog))`);
    verdict('G15.10 after the 100 ms tick: the deferred utterance speaks', after.spoken.length === before.spoken.length + 1 && after.spoken[after.spoken.length - 1].text === 'deferred', after.spoken[after.spoken.length - 1]);
    // (e) Dojo speakText live with stubbed voices. dojoListen() speaks
    // through __v52; if the synth is mid-utterance the speak is deferred
    // 100 ms, so the log is read after a sleep, not synchronously.
    const dojoSetup = await ev(`(function(){
      var v15=window.__v15, old=v15.enOld();
      for(var i=0;i<12&&i<v15.words.length;i++) old.box[v15.words[i].id]=1;
      v15.save15();
      var r=window.__v48._test.startDojo('en',false);
      if(!r.ok) return {ok:false, why:r.gate&&r.gate.why};
      window.__dojoWord=window.__v48._test.dojoState().word.head;
      var dl=window.__v48.dojoListen();
      return {ok:true, word:window.__dojoWord};
    })()`);
    await sleep(250);
    const dojoLog = await ev(`JSON.parse(JSON.stringify(window.__ttsLog))`);
    const dojo = { ok: dojoSetup.ok, why: dojoSetup.why, word: dojoSetup.word, spoken: dojoLog.spoken, pops: dojoLog.pops };
    verdict('G15.11 Dojo listen speaks the word with the en voice', dojo.ok === true && dojo.spoken.length >= 1 && dojo.spoken[dojo.spoken.length - 1].voice === 'Google US English' && dojo.spoken[dojo.spoken.length - 1].text === dojo.word, { word: dojo.word, last: dojo.spoken[dojo.spoken.length - 1] });
    await shot('g15-tts-stub');
    return { log2, log3, dojo };
  });

  // G16 — 360px: the honest TTS error toast is visible, no overflow.
  await step('G16-tts-360', async () => {
    await freshGuest();
    await setViewport(360, 800, true, false);
    await reloadWait(2800);
    await installTTS();
    await ev(`window.__ttsStub._fireVoices(${JSON.stringify([{name:'Voix française',lang:'fr-FR',default:false}])})`);
    const w0 = await ev(`(function(){var w=window.__v15.words[0]; return {id:w.id};})()`);
    await ev(`window.__v15.speakWord(${JSON.stringify(w0.id)})`);
    await sleep(300);
    const vis = await ev(`(function(){
      var pops=[...document.querySelectorAll('.pp,.v7toast')].map(function(d){return d.textContent});
      return {pops:pops, ov:{scrollW:document.documentElement.scrollWidth, innerW:window.innerWidth}};
    })()`);
    verdict('G16.1 360px: honest TTS error toast visible', vis.pops.some(function (t) { return t.indexOf('Không phát được âm thanh') >= 0; }), vis.pops);
    verdict('G16.2 360px: no horizontal overflow with the toast', vis.ov.scrollW <= vis.ov.innerW + 1, vis.ov);
    await shot('g16-tts-360');
    await setViewport(1280, 800, false, false);
    await reloadWait(2800);
    return vis;
  });

  // G17 — console/dialog summary for the whole run.
  await step('G17-summary', async () => {
    verdict('G17.1 0 console errors in the whole run', C.consoleErrors.length === 0, C.consoleErrors);
    verdict('G17.2 0 console warnings in the whole run', C.consoleWarns.length === 0, C.consoleWarns);
    verdict('G17.3 0 JS dialogs in the whole run', C.dialogs.length === 0, C.dialogs);
    return { errors: C.consoleErrors.length, warns: C.consoleWarns.length, dialogs: C.dialogs.length };
  });

  const passed = verdicts.filter(v => v.pass).length;
  const failed = verdicts.filter(v => !v.pass);
  note(`\n== verify-v52c summary: ${passed}/${verdicts.length} PASS ==`);
  if (failed.length) { note('FAILURES:'); failed.forEach(v => note('  - ' + v.name + ' — ' + JSON.stringify(v.detail).slice(0, 300))); }
  saveResults();
  close();
  process.exit(failed.length ? 1 : 0);
}
main().catch(e => { console.error('VERIFY DRIVER FAILED:', e); close(); process.exit(1); });
