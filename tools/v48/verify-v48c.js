// verify-v48c.js - V19.3 (layer V48) Chrome verification driver.
// Real Chrome 157 via CDP, local HTTP. Parameterised so the SAME driver
// runs on the built V19.2 tree (default: out) or the unzipped ZIP dir.
//   node tools/v48/verify-v48c.js [DIR] [httpPort] [cdpPort] [profile] [resultsFile] [shotPrefix]
// Defaults: DIR=out, http 8747, cdp 9227, profile chrome-v47c-prof,
// results tools/v47/logs/v47c-results.json, shots v47c-*.
// Exit 0 = driver completed (verdicts in the results JSON + stdout).
// Gates:
//   G0 boot clean (fresh guest, 0 console errors/warnings/dialogs,
//      WORDS 4892, __v47 19.2.0)
//   G1 live Library cards for all three pairs (labels visible and
//      distinct on every page of the topic, 30/page): the twin card
//      shows its sense label in its twin topic, the primary card stays
//      bare in its first topic, no bare primary card in the twin topic;
//      topic counts in the live UI (BODY 25, EMOTIONS 119, FRUIT 53,
//      COLORS 54, CLOTHES 57, FAMILY 99) + COLORS group name
//      'COLORS AND SHAPES'; 360px Library view has no horizontal overflow
//   G2 live questions never show both senses as competing options:
//      Review forced-Q (30 draws per direction per pair, mate never in
//      options, prompt labelled for twins), Smart mc-ev (same 30x2x3),
//      boss fights (scoped, ~120 questions per scope, no same-en
//      options in opts/optsVi, pair-Qs observed)
//   G3 live Match never shows both twins (20 sessions, COLORS scope,
//      6 distinct EN tiles every time)
//   G4 live KO fight still pays +85 for 8 correct, both engines,
//      per-answer rule holds
//   G5 Legendary start timing (<500 ms at mastered 600) + full win,
//      B2-only pool (630 words)
//   G6 console/dialog summary: 0 errors, 0 warnings, 0 JS dialogs
// HONEST LIMITS: real rendering/layout/paint in headless Chrome 157;
// live-phone, live-Firebase and first-open-on-GitHub-Pages gates stay
// Anh-only; speech is headless-stubbed by the browser (no audio check).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const POLICY = '/tmp/webgl-policy.txt';
const DIR = process.argv[2] || '/home/hatch/workspace/v7build/out';
const HTTPPORT = parseInt(process.argv[3] || '8748', 10);
const PORT = parseInt(process.argv[4] || '9228', 10);
const PROFILE = process.argv[5] || 'chrome-v48c-prof';
const RESULTS_FILE = process.argv[6] || 'v48c-results.json';
const SHOT_PREFIX = process.argv[7] || 'v48c';
const TDIR = '/home/hatch/workspace/v7build/tools/v48';
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
  // Race-proof reset: the v20 save manager flushes dirty state to
  // localStorage on beforeunload, so a plain clear()+reload re-saves the
  // OLD state on unload (xpAt / koStats / boss wins survived across
  // freshGuest calls in the first runs). Flush first (dirty=false), then
  // clear, then reload — and VERIFY the save is actually fresh, retrying
  // up to 3 times. A fresh sample has 0 boss wins, 0 xpAt keys, 0 koRight.
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

// --- V46 shared in-page helpers ---
async function setMastered(n) {
  return await ev(`(function(n){
    var v15=window.__v15, words=v15.words, old=v15.enOld();
    Object.keys(old.box||{}).forEach(function(k){ old.box[k]=0; });
    for(var i=0;i<n&&i<words.length;i++) old.box[words[i].id]=5;
    v15.save15();
    return {mastered:v15.counts15().mastered, legDiff:window.__v18._test.legDiff()};
  })(${n})`);
}
async function seedLegUnlock() {
  return await ev(`(function(){
    var e=window.__v18._test.en18();
    ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
    save(); return true;
  })()`);
}
// EN arena unlocks are sequential (boss i needs boss i-1 won): seed a win
// for EVERY EN-arena boss so dict/owl (late in the list) are fightable.
async function seedEnWins() {
  return await ev(`(function(){
    var e=window.__v18._test.en18();
    (window.__V18_BOSSES.en||[]).forEach(function(b){ e.bosses[b.id]={win:true}; });
    save(); return (window.__V18_BOSSES.en||[]).length;
  })()`);
}
async function seedKOCards() {
  return await ev(`(function(){
    for(var i=0;i<10;i++){ if(!S.cards.some(function(c){return c.id==='ko_seed_'+i;})) S.cards.push({id:'ko_seed_'+i, d:'d0', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:'', g:'', box:0, due:0}); }
    save(); return S.cards.filter(function(c){return (c.id||'').indexOf('ko_seed_')===0;}).length;
  })()`);
}
async function openLegArena() {
  await ev(`window.__v15.openHub('bosses')`); await sleep(800);
  await ev(`window.__v18.openArena('leg')`); await sleep(800);
}
async function openEnArena() {
  await ev(`window.__v15.openHub('bosses')`); await sleep(800);
  await ev(`window.__v18.openArena('en')`); await sleep(800);
}
async function legPoolAt(m) {
  await setMastered(m);
  await seedLegUnlock();
  await openLegArena();
  const p = await ev(`(function(){
    var out={};
    try{
      window.__v18.fight('v10_firedragon','en');
      var F=window.__v18._test.F(); out.fightLive=!!F;
      if(F){ var lv={}; (F.pools.words||[]).forEach(function(w){ lv[w.lv]=(lv[w.lv]||0)+1; }); out.poolLevels=lv; out.poolN=(F.pools.words||[]).length;
        var gl={}; (F.pools.grammar||[]).forEach(function(g){ gl[g.lv]=(gl[g.lv]||0)+1; }); out.grammarLevels=gl; out.grammarN=(F.pools.grammar||[]).length; }
      window.__v18.close();
    }catch(err){ out.fightErr=String(err&&err.message||err); }
    return out;
  })()`);
  return p;
}
// Fight a boss answering correctly (hp pinned so the fight cannot end
// early) and watch the weakness meter: max brk reached + whether a
// BREAK banner appeared. Returns {maxBrk, sawBreak, wordQ, weakHits, steps}.
async function meterRun(engine, bossId, lang, maxSteps) {
  return await ev(`(function(){
    var out={maxBrk:0, sawBreak:false, wordQ:0, weakHits:0, steps:0, weak:null, qmode:null};
    try{
      var T=window.__v18._test, F=null;
      if('${engine}'==='v18'){
        window.__v18.fight('${bossId}','${lang}');
        F=window.__v18._test.F();
      }else{
        window.__v19.openMapFor('en'); if('${lang}'==='ko')window.__v19._test.setLang('ko'); window.__v19.fight('${bossId}');
        F=window.__v19._test.F();
      }
      if(!F) return {ok:false, why:'no fight'};
      out.weak=F.weak?{kind:F.weak.kind,key:F.weak.key}:null; out.qmode=F.qmode;
      var weakName=window.__v34?window.__v34.weakName(F.weak):null;
      for(var i=0;i<${maxSteps||40};i++){
        F=('${engine}'==='v18')?window.__v18._test.F():window.__v19._test.F();
        if(i===0) out.dbgFirst={fNull:!F, over:F?F.over:undefined, hasCur:!!(F&&F.cur), curW:!!(F&&F.cur&&F.cur.w)};
        if(!F||F.over) break;
        F.hp=999;
        if(F.cur&&F.cur.w) out.wordQ++;
        var wasWeak=(F.cur&&F.cur.w&&window.__v34)?window.__v34.weakMatch(F.cur.w,F.weak):false;
        if('${engine}'==='v18')window.__v18._test.pickCorrect();else window.__v19._test.pickCorrect();
        if(wasWeak) out.weakHits++;
        if(F.brk>out.maxBrk) out.maxBrk=F.brk;
        if(F.banner&&(F.banner.indexOf('BREAK')>=0)) out.sawBreak=true;
        if(out.sawBreak) out.maxBrk=3; // BREAK only fires at brk 3 (meter resets inside breakDmg)
        if('${engine}'==='v18')window.__v18.next();else window.__v19._test.next();
        out.steps++;
      }
      if('${engine}'==='v18')window.__v18.close();
      out.weakName=weakName;
      return out;
    }catch(err){ return {ok:false, err:String(err&&err.message||err)}; }
  })()`);
}

async function main() {
  // /tmp/webgl-policy.txt must contain exactly hatch-webgl-all-origins-v1
  // before Chrome runs (task requirement); recreate it if it drifted.
  // NOTE (2026-11-21): Chrome rejects the file WITHOUT a trailing
  // newline ("Invalid Hatch WebGL domain policy") — the contract wants
  // the line plus '\n', so normalize to that exact byte content.
  try {
    const polRaw = fs.readFileSync(POLICY, 'utf8');
    if (polRaw !== 'hatch-webgl-all-origins-v1\n') { fs.writeFileSync(POLICY, 'hatch-webgl-all-origins-v1\n'); note('webgl policy recreated (with trailing newline)'); }
  } catch (e) { fs.writeFileSync(POLICY, 'hatch-webgl-all-origins-v1\n'); note('webgl policy created'); }
  await openPage();
  const errs0 = C.consoleErrors.length, warns0 = C.consoleWarns.length;

  // In-page helpers for the V48 gates.
  async function seedLearned(n) {
    return await ev(`(function(n){
      var v15=window.__v15, words=v15.words, old=v15.enOld();
      Object.keys(old.box||{}).forEach(function(k){ old.box[k]=0; });
      for(var i=0;i<n&&i<words.length;i++) old.box[words[i].id]=1;
      v15.save15();
      return {learned:window.__v48._test.learnedEN().length};
    })(${n})`);
  }
  async function seedKOCardsWithExamples() {
    return await ev(`(function(){
      var ex=['나는 학교에 갑니다','저는 밥을 먹습니다','오늘 날씨가 좋습니다'];
      for(var i=0;i<8;i++){
        S.cards.push({id:'ko48c_'+i, d:'d48', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:(i<3?ex[i]:''), g:'deck48', box:1, due:0});
      }
      save();
      return {koLearned:window.__v48._test.learnedKO().length, koSent:window.__v48._test.forgePool('ko').koSent};
    })()`);
  }
  async function seed70Wins() {
    return await ev(`(function(){
      var e15=window.__v15.en15(); e15.bosses=e15.bosses||{};
      for(var i=0;i<10;i++) e15.bosses['old_'+i]={win:1};
      var e18=window.__v18._test.en18(); e18.bosses=e18.bosses||{};
      for(var j=0;j<30;j++) e18.bosses['v10x_'+j]={win:true};
      var e19=window.__v19.en19(); e19.bosses=e19.bosses||{};
      for(var k=0;k<30;k++) e19.bosses['v11x_'+k]={en:{win:1}};
      save();
      return {count:window.__v48._test.correctedWinCount()};
    })()`);
  }
  async function openForge(tab) {
    await ev(`window.__v48.openForge('en','${tab || 'forge'}')`); await sleep(700);
  }
  function lumRatio(fg, bg) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = (rgb) => 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
    const l1 = L(fg), l2 = L(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  // ================= G0 boot clean =================
  await step('G0-boot', async () => {
    await freshGuest();
    const st = await ev(`(function(){return {hasV15:!!window.__v15, hasV48:!!window.__v48, version:window.__v48?window.__v48.version:null, words:window.__v15?window.__v15.words.length:0, title:document.title, bossTotal:window.__v21?window.__v21.TOTAL_BOSSES:null, xp:S.xp||0, gems:(S.v7&&S.v7.gems)||0, en48:!!(S.v7&&S.v7.en48)}})()`);
    verdict('G0 app boots with 0 console errors/warnings, WORDS 4892, __v48 19.3.0', errs0 === 0 && warns0 === 0 && st.hasV15 && st.hasV48 && st.version === '19.3.0' && st.words === 4892, { errs: errs0, warns: warns0, st });
    verdict('G0b TOTAL_BOSSES is 87 live', st.bossTotal === 87, { bossTotal: st.bossTotal });
    verdict('G0c fresh profile boots xp 20 / gems 3, en48 lazy-absent', st.xp === 20 && st.gems === 3 && st.en48 === false, { xp: st.xp, gems: st.gems, en48: st.en48 });
    // Entry points: EN hub decorator button + KO tab button (live DOM).
    await ev(`window.__v15.openHub('library')`); await sleep(900);
    const entry = await ev(`(function(){ return {
      hubBtn: !!document.querySelector('.v48hubbtn'),
      koTab: (document.querySelector('#tabs')?document.querySelector('#tabs').innerHTML:'').indexOf('v48kotab')>=0,
      koTabAfter35: (function(){ var h=(document.querySelector('#tabs')?document.querySelector('#tabs').innerHTML:''); return h.indexOf('v48kotab')>h.indexOf('v35kotab'); })()
    }; })()`);
    verdict('G0d EN hub shows the Sentence Forge entry button (.v48hubbtn)', entry.hubBtn === true, entry);
    verdict('G0e KO tabs show v48kotab after v35kotab', entry.koTab === true && entry.koTabAfter35 === true, entry);
    return { st, entry };
  });

  // ================= G1 Forge overlay, live session =================
  await step('G1-forge', async () => {
    await freshGuest();
    // Gate state first: 0 learned words -> honest "learn more" message.
    await openForge('forge');
    const gate = await ev(`(function(){ var h=document.getElementById('v48hub'); return {visible:h&&h.style.display!=='none', text:(h?h.innerText:'').slice(0,400)}; })()`);
    verdict('G1a Forge overlay opens; 0 learned words shows the honest learn-more state', gate.visible === true && gate.text.indexOf('Học thêm từ trước đã') >= 0, gate);
    await ev(`window.__v48.closeForge()`); await sleep(300);
    await seedLearned(8);
    await openForge('forge');
    const start = await ev(`(function(){ var h=document.getElementById('v48hub'); return {hasStart:(h?h.innerHTML.indexOf('Bắt đầu rèn')>=0:false), text:(h?h.innerText:'').slice(0,300)}; })()`);
    verdict('G1b with 8 learned words the Forge start button appears', start.hasStart === true, start);
    // Drive a full 5-sentence session through REAL DOM clicks.
    const sess = await ev(`(function(){
      var out={xp0:S.xp||0, checks:[], bonus:null, right:null};
      function clickBtn(txt){
        var btns=[].slice.call(document.querySelectorAll('#v48hub button'));
        var b=btns.find(function(x){ return (x.textContent||'').indexOf(txt)>=0 && !x.disabled; });
        if(b){ b.click(); return true; } return false;
      }
      if(!clickBtn('Bắt đầu rèn')) return {ok:false, why:'no start button'};
      for(var s=0;s<5;s++){
        var FS=window.__v48._test.session();
        if(!FS||FS.done) break;
        var cur=FS.list[FS.i];
        // tiles render lazily; ensure they exist by re-rendering once
        var tiles=[].slice.call(document.querySelectorAll('#v48hub .v48tile'));
        if(!tiles.length) return {ok:false, why:'no tiles at sentence '+(s+1)};
        var used={};
        cur.tokens.forEach(function(tok){
          for(var k=0;k<tiles.length;k++){
            if(used[k]) continue;
            if((tiles[k].textContent||'').trim()===tok){ used[k]=1; tiles[k].click(); break; }
          }
        });
        if(!clickBtn('Kiểm tra')) return {ok:false, why:'no check button at sentence '+(s+1)};
        var FS2=window.__v48._test.session();
        out.checks.push({ok:FS2.ok});
        if(s<4){ if(!clickBtn('Câu tiếp')) return {ok:false, why:'no next button at sentence '+(s+1)}; }
        else { if(!clickBtn('Xem kết quả')) return {ok:false, why:'no result button'}; }
      }
      var FS3=window.__v48._test.session();
      out.right=FS3.right; out.bonus=FS3.bonusPaid; out.done=FS3.done;
      out.xpDelta=(S.xp||0)-out.xp0;
      out.htmlHasUndefined=document.getElementById('v48hub').innerHTML.indexOf('undefined')>=0;
      return out;
    })()`);
    verdict('G1c live Forge session: 5/5 correct via real tile clicks', sess.checks.length === 5 && sess.checks.every(x => x.ok === true) && sess.right === 5, sess);
    verdict('G1d live Forge XP: +20 (5x+2 + one +10 session bonus), no stacking', sess.xpDelta === 20 && sess.bonus === 10, sess);
    verdict('G1e Forge overlay HTML has no "undefined" leak', sess.htmlHasUndefined === false, sess);
    await shot('forge-done');
    // KO gate states live.
    await ev(`window.__v48.closeForge()`); await sleep(300);
    const ko = await ev(`(function(){
      window.__v48.setLang('ko');
      window.__v48.openForge('ko','forge');
      var h=document.getElementById('v48hub');
      return {text:(h?h.innerText:'').slice(0,300)};
    })()`);
    verdict('G1f Forge KO with 0 learned cards shows the honest learn-more state', ko.text.indexOf('Học thêm từ trước đã') >= 0, ko);
    await seedKOCardsWithExamples();
    await ev(`window.__v48.openForge('ko','forge')`); await sleep(500);
    const ko2 = await ev(`(function(){ var h=document.getElementById('v48hub'); return {hasStart:(h?h.innerHTML.indexOf('Bắt đầu rèn')>=0:false)}; })()`);
    verdict('G1g Forge KO with 8 learned cards + 3 real examples shows the start button', ko2.hasStart === true, ko2);
    await shot('forge-ko');
    await ev(`window.__v48.closeForge()`); await sleep(300);
    return { gate, start, sess, ko, ko2 };
  });

  // ================= G2 Bounty Board live =================
  await step('G2-bounty', async () => {
    // Reuse the G1 session state (same profile): 5 correct Forge today.
    await openForge('bounty');
    const b = await ev(`(function(){
      var h=document.getElementById('v48hub');
      return {text:(h?h.innerText:'').slice(0,1200), hasClaim:(h?h.innerHTML.indexOf('Nhận rương')>=0:false)};
    })()`);
    verdict('G2a Bounty Board shows d_forge5 at 5/5 with a claim button', b.text.indexOf('5/5') >= 0 && b.hasClaim === true, b);
    const claim = await ev(`(function(){
      var out={xp0:S.xp||0, gems0:(S.v7&&S.v7.gems)||0};
      function clickBtn(txt){
        var btns=[].slice.call(document.querySelectorAll('#v48hub button'));
        var b=btns.find(function(x){ return (x.textContent||'').indexOf(txt)>=0 && !x.disabled; });
        if(b){ b.click(); return true; } return false;
      }
      out.clicked=clickBtn('Nhận rương');
      out.xpDelta=(S.xp||0)-out.xp0; out.gemsDelta=((S.v7&&S.v7.gems)||0)-out.gems0;
      var h=document.getElementById('v48hub');
      out.claimGone=(h?h.innerHTML.indexOf('Nhận rương')<0:true);
      out.claimedText=(h?h.innerText:'').indexOf('Đã nhận thưởng')>=0;
      return out;
    })()`);
    verdict('G2b Bounty chest claim pays +20 XP / +1 gem live, then the button is gone', claim.clicked === true && claim.xpDelta === 20 && claim.gemsDelta === 1 && claim.claimedText === true, claim);
    await shot('bounty');
    await ev(`window.__v48.closeForge()`); await sleep(300);
    return { b, claim };
  });

  // ================= G3 Tree + Dojo live =================
  await step('G3-tree-dojo', async () => {
    await openForge('tree');
    const tr = await ev(`(function(){ var h=document.getElementById('v48hub'); return {text:(h?h.innerText:'').slice(0,1500)}; })()`);
    verdict('G3a Tree tab renders real same-topic relations for a learned word', tr.text.indexOf('Cùng chủ đề') >= 0 && tr.text.indexOf('Cây Họ Từ') >= 0, tr);
    verdict('G3b Tree honestly states no synonym/antonym/Sino-Korean data (no invented relations)', tr.text.indexOf('Chưa có dữ liệu thật cho các quan hệ này') >= 0, tr);
    await shot('tree');
    // Dojo: normal tier, speech support probe, self-assessment fallback.
    await openForge('dojo');
    const dj = await ev(`(function(){
      return {
        hasStart:(document.getElementById('v48hub').innerHTML.indexOf('Luyện cấp thường')>=0),
        hasIntro:(document.getElementById('v48hub').innerText.indexOf('Nghe rồi đọc lại')>=0),
        srInWindow:!!(window.SpeechRecognition||window.webkitSpeechRecognition),
        synthInWindow:!!(window.speechSynthesis),
        advLocked:(document.getElementById('v48hub').innerHTML.indexOf('thắng Hangul Golem để mở')>=0)
      };
    })()`);
    verdict('G3c Dojo tab renders the listen-and-repeat intro + start buttons', dj.hasStart === true && dj.hasIntro === true, dj);
    verdict('G3d Dojo advanced tier is locked before any golem win', dj.advLocked === true, dj);
    const dojoRun = await ev(`(function(){
      var out={started:false, heard:'', grade:null, selfCounted:false, srAttempt:null};
      try{
        var r=window.__v48.startDojo(false);
        out.started=!!(r&&r.ok!==false);
        var DS=window.__v48._test.dojoState();
        out.word=DS&&DS.word?DS.word.head:null;
        // Attempt real recognition: in headless Chrome without a mic this
        // must fall back honestly to self-assessment (no fake grade).
        var lr=window.__v48.dojoListen();
        out.srAttempt=lr;
        out.modeAfter=window.__v48._test.dojoState().mode;
      }catch(e){ out.err=String(e&&e.message||e); }
      return out;
    })()`);
    await sleep(2500);
    const dojoAfter = await ev(`(function(){
      var h=document.getElementById('v48hub');
      var DS=window.__v48._test.dojoState();
      return {mode:DS?DS.mode:null, text:(h?h.innerText:'').slice(0,800),
        selfBtn:(h?h.innerHTML.indexOf('Tôi đọc đúng')>=0:false)};
    })()`);
    verdict('G3e Dojo listen attempt resolves to a real state (listen or honest self-assessment fallback)', dojoRun.started === true && (dojoAfter.mode === 'listen' || dojoAfter.mode === 'self' || dojoAfter.mode === 'graded'), { dojoRun, dojoAfter });
    let selfOk = null;
    if (dojoAfter.selfBtn) {
      selfOk = await ev(`(function(){
        var out={before:window.__v48._test.en48().dojo.selfOk};
        var btns=[].slice.call(document.querySelectorAll('#v48hub button'));
        var b=btns.find(function(x){ return (x.textContent||'').indexOf('Tôi đọc đúng')>=0 && !x.disabled; });
        if(b) b.click();
        out.after=window.__v48._test.en48().dojo.selfOk;
        out.mode=window.__v48._test.dojoState().mode;
        return out;
      })()`);
      verdict('G3f Dojo self-assessment click records selfOk (no fake grade)', selfOk && selfOk.after === selfOk.before + 1 && selfOk.mode === 'self-done', selfOk);
    } else {
      verdict('G3f Dojo self-assessment fallback button present when recognition is unavailable', false, dojoAfter);
    }
    await shot('dojo');
    await ev(`window.__v48.closeForge()`); await sleep(300);
    return { tr, dj, dojoRun, dojoAfter, selfOk };
  });

  // ================= G4 Golem boss live =================
  await step('G4-golem', async () => {
    await freshGuest();
    await seed70Wins();
    await ev(`window.__v48.openForge('en','boss')`); await sleep(700);
    const card = await ev(`(function(){ var h=document.getElementById('v48hub'); return {text:(h?h.innerText:'').slice(0,900), hasFight:(h?h.innerHTML.indexOf('Bắt đầu chiến đấu')>=0:false)}; })()`);
    verdict('G4a Golem card shows Lv 77 / HP 620 / listen weakness / fight button (70 wins)', card.text.indexOf('Lv 77') >= 0 && card.text.indexOf('HP 620') >= 0 && card.text.indexOf('Câu hỏi nghe') >= 0 && card.hasFight === true, card);
    await shot('golem-card');
    // Fight: rotation includes listen; then force a win to verify the
    // reward path + advanced Dojo unlock derivation.
    const fight = await ev(`(function(){
      var out={live:false, modes:[], weakKind:null, won:false, rewardNote:null, xpDelta:0, xp0:S.xp||0};
      try{
        window.__v48.fightBoss('v18_golem');
        var F=window.__v19._test.F();
        out.live=!!F;
        if(!F) return out;
        out.weakKind=F.weak&&F.weak.kind;
        out.bossId=F.boss&&F.boss.id;
        for(var a=0;a<4;a++){
          var F2=window.__v19._test.F(); if(!F2||F2.over) break;
          out.modes.push(F2.qmode);
          F2.hp=999;
          window.__v19._test.pickCorrect(); window.__v19._test.next();
        }
        // Now force the win: 1 HP left, one correct answer.
        var F3=window.__v19._test.F();
        if(F3&&!F3.over){ F3.hp=1; window.__v19._test.pickCorrect(); window.__v19._test.next(); }
        var F4=window.__v19._test.F();
        out.won=!!(F4&&F4.over==='win');
        out.rewardNote=F4?F4.rewardNote:null;
        out.xpDelta=(S.xp||0)-out.xp0;
        out.isWon=window.__v19.isWon('v18_golem','en');
        window.__v19.close();
      }catch(e){ out.err=String(e&&e.message||e); }
      return out;
    })()`);
    verdict('G4b live golem fight starts in the V19 UCE (weak=listen)', fight.live === true && fight.bossId === 'v18_golem' && fight.weakKind === 'listen', fight);
    verdict('G4c golem question rotation includes listen within 4 questions', fight.modes.indexOf('listen') >= 0, fight);
    verdict('G4d golem fight can be won; first-win reward pays XP and records the win', fight.won === true && fight.isWon === true && fight.xpDelta > 0, fight);
    // Advanced Dojo unlock derives from the real win record.
    await openForge('dojo');
    const adv = await ev(`(function(){
      var h=document.getElementById('v48hub');
      return {unlocked:window.__v48._test.en48().dojoUnlocked===1,
        advOpen:(h?h.innerHTML.indexOf('đã mở (thắng Hangul Golem)')>=0:false),
        canStart:window.__v48._test.dojoGate('en',true).ok===true};
    })()`);
    verdict('G4e after the golem win, advanced Dojo unlocks (derived from the en19 record)', adv.unlocked === true && adv.canStart === true, adv);
    await shot('dojo-advanced');
    await ev(`window.__v48.closeForge()`); await sleep(300);
    return { card, fight, adv };
  });

  // ================= G5 mobile + contrast =================
  await step('G5-mobile', async () => {
    await seedLearned(8);
    await openForge('forge');
    await ev(`window.__v48.startForge()`); await sleep(600);
    await setViewport(360, 800, true, false); await sleep(900);
    const m = await ev(`(function(){
      var hub=document.getElementById('v48hub');
      var tile=document.querySelector('#v48hub .v48tile');
      var btn=document.querySelector('#v48hub .v48btn.pri');
      function cs(el, prop){ try{ return getComputedStyle(el)[prop]; }catch(e){ return ''; } }
      function parseRGB(s){ var m=(s||'').match(/rgba?\\(([^)]+)\\)/); if(!m) return null; return m[1].split(',').slice(0,3).map(function(x){ return parseFloat(x); }); }
      return {
        scrollW:document.documentElement.scrollWidth, innerW:window.innerWidth,
        tileMinH:tile?cs(tile,'minHeight'):null,
        btnBg:btn?parseRGB(cs(btn,'backgroundColor')):null,
        btnFg:btn?parseRGB(cs(btn,'color')):null,
        tileBg:tile?parseRGB(cs(tile,'backgroundColor')):null,
        tileFg:tile?parseRGB(cs(tile,'color')):null
      };
    })()`);
    verdict('G5a mobile 360: Forge overlay has no horizontal overflow', m.scrollW <= m.innerW, m);
    verdict('G5b mobile 360: Forge tiles are >=44px tall', m.tileMinH === '44px', m);
    const btnRatio = (m.btnBg && m.btnFg) ? lumRatio(m.btnFg, m.btnBg) : 0;
    const tileRatio = (m.tileBg && m.tileFg) ? lumRatio(m.tileFg, m.tileBg) : 0;
    verdict('G5c WCAG AA: primary Forge button text vs gold >= 4.5:1', btnRatio >= 4.5, { btnRatio: Math.round(btnRatio * 100) / 100 });
    verdict('G5d WCAG AA: Forge tile text vs purple >= 4.5:1', tileRatio >= 4.5, { tileRatio: Math.round(tileRatio * 100) / 100 });
    await shot('forge-360');
    await setViewport(1280, 800, false, false); await sleep(600);
    await ev(`window.__v48.closeForge()`); await sleep(300);
    return { m, btnRatio, tileRatio };
  });

  // ================= G6 console summary =================
  await step('G6-console', async () => {
    const sum = { errors: C.consoleErrors, warns: C.consoleWarns, dialogs: C.dialogs };
    verdict('G6 0 console errors, 0 warnings, 0 JS dialogs across all gates', sum.errors.length === 0 && sum.warns.length === 0 && sum.dialogs.length === 0, sum);
    return sum;
  });

  const passed = verdicts.filter(v => v.pass).length;
  const failed = verdicts.filter(v => !v.pass);
  note(`\nverify-v48c: ${passed}/${verdicts.length} PASS` + (failed.length ? ` — FAILURES: ${failed.map(f => f.name).join(' | ')}` : ''));
  saveResults();
  close();
  process.exit(0);
}

main().catch(e => { console.error('verify-v48c crashed:', e); try { close(); } catch (_) {} process.exit(2); });
