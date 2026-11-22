// verify-v49c.js - V19.4 (layer V49) Chrome verification driver.
// Real Chrome 157 via CDP, local HTTP. Parameterised so the SAME driver
// runs on the built tree (default: out) or the unzipped ZIP dir.
//   node tools/v49/verify-v49c.js [DIR] [httpPort] [cdpPort] [profile] [resultsFile] [shotPrefix]
// Defaults: DIR=out, http 8750, cdp 9230, profile chrome-v49c-prof,
// results tools/v49/logs/v49c-results.json, shots v49c-*.
// Exit 0 = driver completed (verdicts in the results JSON + stdout).
// Gates:
//   G0 boot clean (fresh guest, title V19.4, __v49 19.4.0, WORDS 4892,
//      0 console errors/warnings/dialogs)
//   G1 D1+D2 live — wizard fight, stubbed SR: sync-fire result applied;
//      silent mode shows "Đang nghe… hãy nói: <word>" + disabled Nói
//      button + speakState() listening, in the live DOM
//   G2 D3+D4 live — start() throw shows the start-failed box; onend
//      with no result shows the no-speech box; retry works after both
//   G3 D5 live — late result dropped; stale result after next() never
//      answers the next question; next()/close() abort the rec
//   G4 D6 live — all 7 error codes show their specific message + retry
//      in the live DOM; generic "(không nghe được)" never appears
//   G5 contrast + 360px — .v49listen / .v49err computed contrast >= 4.5
//      in LIGHT and DARK themes, v18 + v19 panels; 360px no horizontal
//      overflow, listening chip visible
//   G6 full voice win — wizard fight won by voice in live Chrome, XP paid
//   G7 regressions — non-speak boss (slime) fight works; v15 speak mode
//      renders; v48 Dojo overlay opens; KO wizard fight is Korean MC
//   G8 console/dialog summary: 0 errors, 0 warnings, 0 JS dialogs
// HONEST LIMITS: real rendering/layout/paint in headless Chrome 157;
// the SpeechRecognition here is a controllable stub (no real mic —
// a real-mic end-to-end still needs Anh's phone); live-phone,
// live-Firebase and first-open-on-GitHub-Pages gates stay Anh-only.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const POLICY = '/tmp/webgl-policy.txt';
const DIR = process.argv[2] || '/home/hatch/workspace/v7build/out';
const HTTPPORT = parseInt(process.argv[3] || '8750', 10);
const PORT = parseInt(process.argv[4] || '9230', 10);
const PROFILE = process.argv[5] || 'chrome-v49c-prof';
const RESULTS_FILE = process.argv[6] || 'v49c-results.json';
const SHOT_PREFIX = process.argv[7] || 'v49c';
const TDIR = '/home/hatch/workspace/v7build/tools/v49';
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
    const boot = await ev(`(function(){ return {title: document.title, hasV49: !!window.__v49, v49: window.__v49&&window.__v49.version, words: (window.__v15&&window.__v15.words||[]).length, hasV18: !!window.__v18, hasV19: !!window.__v19}; })()`);
    const servedTitle = await (await fetch(URL)).text().then(t => (t.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
    verdict('G0.1 served title is V19.4 Boss Mic Fix', servedTitle.includes('V19.4 — Boss Mic Fix'), servedTitle);
    verdict('G0.2 __v49 19.4.0 present', boot.hasV49 && boot.v49 === '19.4.0', boot);
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

  // G8 — console/dialog summary for the whole run.
  await step('G8-summary', async () => {
    verdict('G8.1 0 console errors in the whole run', C.consoleErrors.length === 0, C.consoleErrors);
    verdict('G8.2 0 console warnings in the whole run', C.consoleWarns.length === 0, C.consoleWarns);
    verdict('G8.3 0 JS dialogs in the whole run', C.dialogs.length === 0, C.dialogs);
    return { errors: C.consoleErrors.length, warns: C.consoleWarns.length, dialogs: C.dialogs.length };
  });

  const passed = verdicts.filter(v => v.pass).length;
  const failed = verdicts.filter(v => !v.pass);
  note(`\n== verify-v49c summary: ${passed}/${verdicts.length} PASS ==`);
  if (failed.length) { note('FAILURES:'); failed.forEach(v => note('  - ' + v.name + ' — ' + JSON.stringify(v.detail).slice(0, 300))); }
  saveResults();
  close();
  process.exit(failed.length ? 1 : 0);
}
main().catch(e => { console.error('VERIFY DRIVER FAILED:', e); close(); process.exit(1); });
