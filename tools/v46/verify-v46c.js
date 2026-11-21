// verify-v46c.js - V19.0.1 (layer V46) Chrome verification driver.
// Real Chrome 157 via CDP, local HTTP. Parameterised so the SAME driver
// runs the BEFORE-state repro (pristine V19.0: fix gates FAIL = bug
// reproduced) and the AFTER-state verification (built V19.0.1: all PASS).
//   node tools/v46/verify-v46c.js [DIR] [httpPort] [cdpPort] [profile] [resultsFile] [shotPrefix]
// Defaults: DIR=out, http 8986, cdp 9386, profile chrome-v46c-prof,
// results tools/v46/logs/v46c-results.json, shots v46c-*.
// Exit 0 = driver completed (verdicts in the results JSON + stdout).
// Gates:
//   G0 boot clean (fresh guest, 0 console errors/warnings/dialogs)
//   G1 Legendary pools at mastered 0/199/200/599/600/700 (exact levels +
//      counts; grammar pools stay inside the same band)
//   G2 weakness-meter fillability: previously pool-blocked v10_dict (EN,
//      B2) fills + BREAKs; Legendary v10_firedragon fills + BREAKs at
//      mastered 200 and 600; mode-blocked v10_owl asks no word questions
//      (meter unreachable BY DESIGN — documented, not a regression)
//   G3 blocked-boss recount at mastered 0/200/600 (pool-blocked 0,
//      distinct 15, mode ids unchanged from V19.0)
//   G4 KO/EN XP parity, both engines: live KO fights pay per the shared
//      rule; KO wrong answers pay 0; streak bonus at 5; first-win/replay
//      rewards unchanged in both languages and both engines
//   G5 EN XP unchanged vs V19.0 baseline: seeded deterministic EN fight
//      (same seed, same state) — per-answer rule holds on every answer,
//      and the full delta sequence is recorded for the cross-run diff
//      against the pristine-V19.0 run of this same driver
//   G6 full Legendary fights to wins at mastered 200 and 600 (real UI
//      start at 200, direct fight at 600; prompt start, win, XP paid)
//   G7 360px + laptop viewports: bosses hub, no horizontal overflow at
//      360, Legendary arena card shows the scaling promise
//   G8 console/dialog summary: 0 errors, 0 warnings, 0 JS dialogs
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const POLICY = '/tmp/webgl-policy.txt';
const DIR = process.argv[2] || '/home/hatch/workspace/v7build/out';
const HTTPPORT = parseInt(process.argv[3] || '8986', 10);
const PORT = parseInt(process.argv[4] || '9386', 10);
const PROFILE = process.argv[5] || 'chrome-v46c-prof';
const RESULTS_FILE = process.argv[6] || 'v46c-results.json';
const SHOT_PREFIX = process.argv[7] || 'v46c';
const TDIR = '/home/hatch/workspace/v7build/tools/v46';
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
  await openPage();
  const errs0 = C.consoleErrors.length, warns0 = C.consoleWarns.length;

  // ================= G0 boot clean =================
  await step('G0-boot', async () => {
    const st = await ev(`(function(){return {hasV15:!!window.__v15, hasV46:!!window.__v46, hasV46Data:!!window.__V46_DATA, words:window.__v15?window.__v15.words.length:0, version:window.__v46?window.__v46.version:null, title:document.title}})()`);
    verdict('G0 app boots with 0 console errors/warnings on fresh guest load', errs0 === 0 && warns0 === 0 && st.hasV15 && st.words > 4000, { errs: errs0, warns: warns0, st });
    return st;
  });

  // ================= G1 Legendary pools =================
  await step('G1-legpools', async () => {
    await freshGuest();
    const legLevels = { 0: ['A2', 'B1'], 199: ['A2', 'B1'], 200: ['B1'], 599: ['B1'], 600: ['B2'], 700: ['B2'] };
    const poolExpect = { 0: { A2: 300, B1: 250 }, 200: { B1: 250 }, 600: { B2: 630 }, 700: { B2: 630 } };
    const levelsEq = (a, b) => {
      if (!a || !b) return false;
      const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
      return JSON.stringify(ka) === JSON.stringify(kb) && ka.every(k => a[k] === b[k]);
    };
    const out = {};
    for (const m of [0, 199, 200, 599, 600, 700]) {
      const r = await setMastered(m);
      out['legDiff' + m] = r;
      verdict(`G1a legDiff at mastered ${m} is ${JSON.stringify(legLevels[m])}`, r.mastered === m && JSON.stringify(r.legDiff) === JSON.stringify(legLevels[m]), r);
    }
    for (const m of [0, 200, 600, 700]) {
      const p = await legPoolAt(m);
      out['pool' + m] = p;
      verdict(`G1b live Legendary pool at mastered ${m} is exactly ${JSON.stringify(poolExpect[m])}`, p.fightLive === true && levelsEq(p.poolLevels, poolExpect[m]), p);
      verdict(`G1c live Legendary grammar pool at mastered ${m} stays inside the same band (${JSON.stringify(legLevels[m])})`, p.fightLive === true && Object.keys(p.grammarLevels || {}).every(lv => legLevels[m].indexOf(lv) >= 0) && (p.grammarN || 0) > 0, { grammarLevels: p.grammarLevels, grammarN: p.grammarN });
    }
    for (const m of [199, 599]) {
      const p = await legPoolAt(m);
      out['pool' + m] = p;
      verdict(`G1d live Legendary pool at boundary mastered ${m} matches the band below the threshold`, p.fightLive === true && levelsEq(p.poolLevels, poolExpect[m < 200 ? 0 : 200]), p);
    }
    return out;
  });

  // ================= G2 weakness-meter fillability =================
  await step('G2-meter', async () => {
    await freshGuest();
    await setMastered(0);
    await seedEnWins();
    await openEnArena();
    // Previously pool-blocked v10_dict (EN, B2, mixed): weakness now
    // education (13 B2 words in-pool) — the meter must fill + BREAK.
    const dict = await meterRun('v18', 'v10_dict', 'en', 40);
    verdict('G2a previously pool-blocked v10_dict: weakness meter fills to 3 and BREAK fires', dict.maxBrk === 3 || dict.sawBreak === true, dict);
    verdict('G2b v10_dict weakness is education (the V46 override)', dict.weakName === 'Giáo dục' || (dict.weak && dict.weak.key === 'education'), dict);
    // Legendary v10_firedragon at mastered 200 (B1-only) and 600 (B2-only).
    await setMastered(200);
    await seedLegUnlock();
    await openLegArena();
    const leg200 = await meterRun('v18', 'v10_firedragon', 'en', 40);
    verdict('G2c Legendary firedragon at mastered 200 (B1-only pool): weakness meter fills + BREAK fires', leg200.maxBrk === 3 || leg200.sawBreak === true, leg200);
    await setMastered(600);
    await seedLegUnlock();
    await openLegArena();
    const leg600 = await meterRun('v18', 'v10_firedragon', 'en', 40);
    verdict('G2d Legendary firedragon at mastered 600 (B2-only pool): weakness meter fills + BREAK fires', leg600.maxBrk === 3 || leg600.sawBreak === true, leg600);
    // Mode-blocked v10_owl (read mode): no word questions, so the meter
    // can never fill — BY DESIGN. The fight still runs; the weakness
    // chip still shows. This is not a regression.
    await setMastered(0);
    await openEnArena();
    const owl = await meterRun('v18', 'v10_owl', 'en', 10);
    verdict('G2e mode-blocked v10_owl: asks no word questions (meter unreachable by design), fight still runs', owl.wordQ === 0 && owl.qmode === 'read', owl);
    await shot('meter-dict');
    return { dict, leg200, leg600, owl };
  });

  // ================= G3 blocked-boss recount =================
  await step('G3-recount', async () => {
    const out = {};
    for (const m of [0, 200, 600]) {
      await setMastered(m);
      const rec = JSON.parse(await ev(`JSON.stringify((function(){
      var v34=window.__v34, v36=window.__v36;
      var WORDS=window.__v15.words;
      function legDiff(){ var mm=0; try{ mm=window.__v15.counts.mastered; }catch(e){} if(mm<200)return ['A2','B1']; if(mm<600)return ['B1']; return ['B2']; }
      function poolOf(b){
        var list;
        if(b._old) list=WORDS.slice();
        else if(b.lib==='oxford'){ list=WORDS.filter(function(x){ return (x.lib||[]).indexOf('oxford')>=0; }); if(b.diff) list=list.filter(function(x){ return x.lv===b.diff; }); }
        else if(b.arena==='leg'){ var lv=legDiff(); list=WORDS.filter(function(x){ return lv.indexOf(x.lv)>=0; }); }
        else if(b.diff) list=WORDS.filter(function(x){ return x.lv===b.diff; });
        else list=WORDS.slice();
        if(list.length<12) list=WORDS.slice();
        return list;
      }
      var list=[];
      list=list.concat(window.__V33_DATA?window.__V33_DATA.bosses:[]);
      list=list.concat(window.__V19_DATA?window.__V19_DATA.bosses:[]);
      var b18=window.__V18_BOSSES||{};
      ['en','el','leg'].forEach(function(k){ if(b18[k]) list=list.concat(b18[k]); });
      if(b18['old']) list=list.concat(b18['old'].map(function(b){ var c={}; for(var k in b) c[k]=b[k]; c._old=true; return c; }));
      list=list.concat(window.__V35_DATA?window.__V35_DATA.bosses:[]);
      var modeB=[], poolB=[];
      list.forEach(function(b){
        if(v36.blockedReason({boss:b,lang:'en'})==='mode') modeB.push(b.id);
        var F={boss:b,lang:'en',weak:v34.weakFor(b,'en'),pools:{words:poolOf(b)}};
        if(v34.scopeBlocked(F)===true) poolB.push(b.id);
      });
      function distinct(a,b){ var s={}; a.concat(b).forEach(function(id){s[id]=1;}); return Object.keys(s).length; }
      return {bossN:list.length, modeBlocked:modeB.sort(), poolBlocked:poolB.sort(), distinct:distinct(modeB,poolB)};
    })())`));
      out['recount' + m] = rec;
      verdict(`G3a recount at mastered ${m}: pool-blocked 0 (was 13, would-be 23 with legDiff alone)`, rec.poolBlocked.length === 0, rec.poolBlocked);
      verdict(`G3b recount at mastered ${m}: distinct blocked 15 (mode only, was 26)`, rec.distinct === 15 && rec.modeBlocked.length === 15, { distinct: rec.distinct, modeBlocked: rec.modeBlocked });
      verdict(`G3c recount at mastered ${m}: still 86 bosses`, rec.bossN === 86, rec.bossN);
    }
    return out;
  });

  // ================= G4 KO/EN XP parity =================
  await step('G4-koparity', async () => {
    // Live KO fights, both engines: per-answer rule from pre-state
    // (first correct on a card: +10, +5 more at streak 5; repeat inside
    // 10 min: +0, +5 more at streak 5). Each engine on a fresh guest.
    async function liveKOFight(engine) {
      await freshGuest();
      await seedKOCards();
      await ev(`window.__v15.openHub('bosses')`); await sleep(800);
      if (engine === 'v18') { await ev(`window.__v18.openArena('en')`); await sleep(800); }
      return JSON.parse(await ev(`JSON.stringify((function(){
      var out={seq:[], koRight0:0};
      function xp(){ return S.xp||0; }
      var seen={}, streak=0;
      if('${engine}'==='v18'){
        var v18=window.__v18;
        var e18=v18._test.en18(); out.koRight0=e18.koStats.right||0;
        var xp0=xp();
        v18.fight('v10_slime','ko');
        for(var a=0;a<8;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
          var cid=F.cur&&F.cur.k?F.cur.k.id:null, before=xp();
          v18._test.pickCorrect(); v18.next();
          var d=xp()-before; streak++;
          var expect=(seen[cid]?0:10)+((streak%5===0)?5:0);
          out.seq.push({cid:cid, delta:d, expect:expect, streak:streak});
          seen[cid]=1;
        }
        out.delta=xp()-xp0; out.koRightDelta=(v18._test.en18().koStats.right||0)-out.koRight0;
        out.koStreak=v18._test.en18().koStreak;
        out.koXpAtKeys=Object.keys(window.__v15.enOld().xpAt||{}).filter(function(k){return k.indexOf('ko:')===0;}).sort();
        v18.close();
      }else{
        var v19=window.__v19;
        var e19=v19.en19(); out.koRight0=e19.koStats.right||0;
        var xp0b=xp();
        v19.openMapFor('en'); v19._test.setLang('ko'); v19.fight('v11_fireking');
        for(var b=0;b<8;b++){ var F2=v19._test.F(); if(!F2||F2.over) break; F2.hp=999;
          var cid2=F2.cur&&F2.cur.k?F2.cur.k.id:null, before2=xp();
          v19._test.pickCorrect(); v19._test.next();
          var d2=xp()-before2; streak++;
          var expect2=(seen[cid2]?0:10)+((streak%5===0)?5:0);
          out.seq.push({cid:cid2, delta:d2, expect:expect2, streak:streak});
          seen[cid2]=1;
        }
        out.delta=xp()-xp0b; out.koRightDelta=(v19.en19().koStats.right||0)-out.koRight0;
        out.koStreak=v19.en19().koStreak;
        out.koXpAtKeys=Object.keys(window.__v15.enOld().xpAt||{}).filter(function(k){return k.indexOf('ko:')===0;}).sort();
      }
      return out;
    })())`));
    }
    const ko18 = await liveKOFight('v18');
    verdict('G4a live v18 KO fight: 8 correct answers pay XP (>0)', ko18.delta > 0 && ko18.koRightDelta === 8, ko18);
    verdict('G4b live v18 KO fight: per-answer rule holds on all 8 answers', ko18.seq.length === 8 && ko18.seq.every(s => s.delta === s.expect), ko18.seq);
    verdict('G4c live v18 KO fight: koStreak ends at 8, ko: xpAt keys recorded', ko18.koStreak === 8 && ko18.koXpAtKeys.length > 0 && ko18.koXpAtKeys.every(k => k.indexOf('ko:') === 0), ko18);
    const ko19 = await liveKOFight('v19');
    verdict('G4d live v19 KO fight: 8 correct answers pay XP (>0)', ko19.delta > 0 && ko19.koRightDelta === 8, ko19);
    verdict('G4e live v19 KO fight: per-answer rule holds on all 8 answers', ko19.seq.length === 8 && ko19.seq.every(s => s.delta === s.expect), ko19.seq);
    verdict('G4f live v19 KO fight: koStreak ends at 8, ko: xpAt keys recorded', ko19.koStreak === 8 && ko19.koXpAtKeys.length > 0, ko19);
    // KO wrong answers pay 0 and reset the KO streak (v18).
    await freshGuest();
    await seedKOCards();
    await ev(`window.__v15.openHub('bosses')`); await sleep(800);
    await ev(`window.__v18.openArena('en')`); await sleep(800);
    const koWrong = await ev(`(function(){
      var out={};
      function xp(){ return S.xp||0; }
      window.__v18.fight('v10_slime','ko');
      var xp0=xp();
      for(var a=0;a<3;a++){ var F=window.__v18._test.F(); if(!F||F.over) break; F.hp=999;
        window.__v18._test.pickWrong(); window.__v18.next(); }
      out.deltaAfterWrong=xp()-xp0; out.koStreak=window.__v18._test.en18().koStreak;
      out.koRight=window.__v18._test.en18().koStats.right||0;
      window.__v18.close();
      return out;
    })()`);
    verdict('G4g KO wrong answers pay 0 XP and leave koStreak at 0', koWrong.deltaAfterWrong === 0 && (koWrong.koStreak || 0) === 0 && koWrong.koRight === 0, koWrong);
    // First-win / replay rewards unchanged, both engines, both languages.
    // v18 first-win is PER BOSS (shared across languages): EN and KO
    // first-wins each need a fresh guest. v19 first-win is PER LANGUAGE.
    async function winFight(engine, lang, bossId) {
      await freshGuest();
      await seedKOCards();
      if (engine === 'v18') { await ev(`window.__v15.openHub('bosses')`); await sleep(800); await ev(`window.__v18.openArena('en')`); await sleep(800); }
      return JSON.parse(await ev(`JSON.stringify((function(){
      var out={};
      function xp(){ return S.xp||0; }
      function gems(){ return S.v7.gems||0; }
      var steps=0, won=false, rewardXp=0, rewardGems=0, winBonus=null;
      var old=window.__v15.enOld();
      function expectedLethal(F, eng){
        if(!F||!F.cur) return 0;
        if(F.cur.w){
          var id=F.cur.w.id, boxB=old.box[id]||0, atB=old.xpAt[id]||0, stB=old.streak||0;
          var e2=0;
          if(boxB<5&&(!atB||Date.now()-atB>600000)) e2+=10;
          if((stB+1)>0&&(stB+1)%5===0) e2+=5;
          return e2;
        }
        if(F.cur.k){
          var kid='ko:'+F.cur.k.id, atK=old.xpAt[kid]||0;
          var eSt=eng==='v18'?window.__v18.en18().koStreak:window.__v19.en19().koStreak;
          var e3=0;
          if(!atK) e3+=10;
          if((eSt+1)>0&&(eSt+1)%5===0) e3+=5;
          return e3;
        }
        return 0;
      }
      if('${engine}'==='v18'){
        var v18=window.__v18;
        var b=null;
        ['en','el','leg'].forEach(function(a){ (v18.bosses[a]||[]).forEach(function(x){ if(x.id==='${bossId}') b=x; }); });
        rewardXp=b.reward.xp; rewardGems=b.reward.gems||0;
        var xp0=xp(), g0=gems();
        v18.fight('${bossId}','${lang}');
        while(steps++<80){ var F=v18._test.F(); if(!F) break; if(F.over){ won=(F.over==='win'); break; }
          var exp=expectedLethal(F,'v18'), before=xp();
          v18._test.pickCorrect(); v18.next();
          if(F.over==='win'){ winBonus=(xp()-before)-exp; }
        }
        out={won:won, steps:steps, totalDelta:xp()-xp0, winBonus:winBonus, gemsDelta:gems()-g0, rewardXp:rewardXp, rewardGems:rewardGems};
        v18.close();
      }else{
        var v19=window.__v19;
        var b2=null;
        (window.__V19_DATA.bosses||[]).forEach(function(x){ if(x.id==='${bossId}') b2=x; });
        rewardXp=b2.reward.xp; rewardGems=b2.reward.gems||0;
        var xp0b=xp(), g0b=gems();
        v19.openMapFor('en'); if('${lang}'==='ko')v19._test.setLang('ko'); v19.fight('${bossId}');
        while(steps++<80){ var F2=v19._test.F(); if(!F2) break; if(F2.over){ won=(F2.over==='win'); break; }
          var exp2=expectedLethal(F2,'v19'), before2=xp();
          v19._test.pickCorrect(); v19._test.next();
          if(F2.over==='win'){ winBonus=(xp()-before2)-exp2; }
        }
        out={won:won, steps:steps, totalDelta:xp()-xp0b, winBonus:winBonus, gemsDelta:gems()-g0b, rewardXp:rewardXp, rewardGems:rewardGems};
      }
      return out;
    })())`));
    }
    const winEn18 = await winFight('v18', 'en', 'v10_slime');
    verdict('G4h v18 EN first win: win bonus equals the boss reward XP', winEn18.won === true && winEn18.winBonus === winEn18.rewardXp && winEn18.rewardXp > 0, winEn18);
    const winKo18 = await winFight('v18', 'ko', 'v10_slime');
    verdict('G4i v18 KO first win: win bonus equals the boss reward XP (same as EN)', winKo18.won === true && winKo18.winBonus === winKo18.rewardXp && winKo18.rewardXp > 0, winKo18);
    const winEn19 = await winFight('v19', 'en', 'v11_fireking');
    verdict('G4j v19 EN first win: win bonus equals the boss reward XP', winEn19.won === true && winEn19.winBonus === winEn19.rewardXp && winEn19.rewardXp > 0, winEn19);
    const winKo19 = await winFight('v19', 'ko', 'v11_fireking');
    verdict('G4k v19 KO first win: win bonus equals the boss reward XP (same as EN)', winKo19.won === true && winKo19.winBonus === winKo19.rewardXp, winKo19);
    return { ko18, ko19, koWrong, winEn18, winKo18, winEn19, winKo19 };
  });

  // ================= G5 EN XP unchanged (seeded) =================
  await step('G5-enxp', async () => {
    // Same seed (mulberry32 46), same fresh state, same driver: the
    // per-answer rule must hold on every answer, and the full delta
    // sequences are recorded for the cross-run diff (pristine V19.0
    // run of this same driver vs this run).
    const SEED_FN = `(function(){function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}return mulberry32(46)})()`;
    async function seededEnFight(engine) {
      await freshGuest();
      await ev(`window.__v15.openHub('bosses')`); await sleep(800);
      if (engine === 'v18') { await ev(`window.__v18.openArena('en')`); await sleep(800); }
      await ev(`Math.random=${SEED_FN}; 'seeded'`);
      return JSON.parse(await ev(`JSON.stringify((function(){
      var out={seq:[]};
      function xp(){ return S.xp||0; }
      var old=window.__v15.enOld();
      if('${engine}'==='v18'){
        var v18=window.__v18, xp0=xp(), n=0;
        v18.fight('v10_slime','en');
        for(var a=0;a<8;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
          var w=F.cur&&F.cur.w?F.cur.w:null, before=xp();
          var boxB=w?(old.box[w.id]||0):0, atB=w?(old.xpAt[w.id]||0):0, stB=old.streak||0;
          v18._test.pickCorrect(); v18.next();
          var d=xp()-before;
          var exp=0; if(w){ if(boxB<5&&(!atB||Date.now()-atB>600000)) exp+=10; if((stB+1)%5===0) exp+=5; }
          out.seq.push({delta:d, expect:exp, isWord:!!w});
          if(w) n++;
        }
        out.delta=xp()-xp0; out.enQ=n;
        v18.close();
      }else{
        var v19=window.__v19, xp0b=xp(), n19=0;
        v19.openMapFor('en'); v19.fight('v11_fireking');
        for(var c=0;c<8;c++){ var F3=v19._test.F(); if(!F3||F3.over) break; F3.hp=999;
          var w3=F3.cur&&F3.cur.w?F3.cur.w:null, before3=xp();
          var boxB3=w3?(old.box[w3.id]||0):0, atB3=w3?(old.xpAt[w3.id]||0):0, stB3=old.streak||0;
          v19._test.pickCorrect(); v19._test.next();
          var d3=xp()-before3;
          var exp3=0; if(w3){ if(boxB3<5&&(!atB3||Date.now()-atB3>600000)) exp3+=10; if((stB3+1)%5===0) exp3+=5; }
          out.seq.push({delta:d3, expect:exp3, isWord:!!w3});
          if(w3) n19++;
        }
        out.delta=xp()-xp0b; out.enQ=n19;
      }
      return out;
    })())`));
    }
    const en18 = await seededEnFight('v18');
    verdict('G5a seeded v18 EN fight: 8 word questions, per-answer rule holds on all 8', en18.enQ === 8 && en18.seq.length === 8 && en18.seq.every(s => s.delta === s.expect), en18);
    const en19 = await seededEnFight('v19');
    verdict('G5b seeded v19 EN fight: 8 word questions, per-answer rule holds on all 8', en19.enQ === 8 && en19.seq.length === 8 && en19.seq.every(s => s.delta === s.expect), en19);
    return { en18, en19 };
  });

  // ================= G6 full Legendary fights to wins =================
  await step('G6-legwins', async () => {
    // At mastered 200 (B1-only): real UI start ("Khiêu chiến" click +
    // language pick), then answer correctly to a win.
    await freshGuest();
    await setMastered(200);
    await seedLegUnlock();
    await openLegArena();
    const ui200 = await ev(`(function(){
      try{
        var btns=[].slice.call(document.querySelectorAll('#v15body .v18boss .btn.pri'));
        var b=btns.filter(function(x){return (x.getAttribute('onclick')||'').indexOf('v10_firedragon')>=0;})[0];
        if(!b) return {ok:false,why:'no firedragon button'};
        var t0=performance.now(); b.click(); var t1=performance.now();
        var langBtns=[].slice.call(document.querySelectorAll('#v18fight .btn.pri'));
        if(!langBtns.length) return {ok:false,why:'no lang button', click1Ms:Math.round((t1-t0)*10)/10};
        var t2=performance.now(); langBtns[0].click(); var t3=performance.now();
        var F=window.__v18._test.F();
        var lv={}; (F.pools.words||[]).forEach(function(w){ lv[w.lv]=(lv[w.lv]||0)+1; });
        return {ok:true, click1Ms:Math.round((t1-t0)*10)/10, click2Ms:Math.round((t3-t2)*10)/10,
          boss:F&&F.boss.id, lang:F&&F.lang, questionRendered:!!document.querySelector('#v18fight .v18qword'),
          poolLevels:lv, poolN:(F.pools.words||[]).length};
      }catch(err){return {ok:false,err:String(err)}}
    })()`);
    verdict('G6a real UI start at mastered 200: "Khiêu chiến" + Tiếng Anh, each <500 ms, B1-only pool (250)', ui200.ok && ui200.click1Ms < 500 && ui200.click2Ms < 500 && ui200.questionRendered === true && JSON.stringify(ui200.poolLevels) === JSON.stringify({ B1: 250 }), ui200);
    const win200 = await ev(`(function(){
      var out={steps:0, won:false};
      function xp(){ return S.xp||0; }
      var xp0=xp();
      try{
        for(var i=0;i<80;i++){ var F=window.__v18._test.F(); if(!F) break; if(F.over){ out.won=(F.over==='win'); break; }
          window.__v18._test.pickCorrect(); window.__v18.next(); out.steps++; }
        out.delta=xp()-xp0;
        window.__v18.close();
      }catch(err){ out.err=String(err); }
      return out;
    })()`);
    verdict('G6b full Legendary fight to a win at mastered 200 (B1-only pool)', win200.won === true && win200.delta > 0, win200);
    await shot('leg-win-200');
    // At mastered 600 (B2-only): direct fight, answer correctly to a win.
    await freshGuest();
    await setMastered(600);
    await seedLegUnlock();
    await openLegArena();
    const win600 = await ev(`(function(){
      var out={steps:0, won:false, poolLevels:null};
      function xp(){ return S.xp||0; }
      var xp0=xp();
      try{
        var t0=performance.now();
        window.__v18.fight('v10_firedragon','en');
        out.startMs=Math.round((performance.now()-t0)*10)/10;
        var F=window.__v18._test.F();
        var lv={}; (F.pools.words||[]).forEach(function(w){ lv[w.lv]=(lv[w.lv]||0)+1; });
        out.poolLevels=lv; out.poolN=(F.pools.words||[]).length;
        for(var i=0;i<80;i++){ var F2=window.__v18._test.F(); if(!F2) break; if(F2.over){ out.won=(F2.over==='win'); break; }
          window.__v18._test.pickCorrect(); window.__v18.next(); out.steps++; }
        out.delta=xp()-xp0;
        window.__v18.close();
      }catch(err){ out.err=String(err); }
      return out;
    })()`);
    verdict('G6c full Legendary fight to a win at mastered 600 (B2-only pool, 630 words)', win600.won === true && win600.delta > 0 && JSON.stringify(win600.poolLevels) === JSON.stringify({ B2: 630 }), win600);
    verdict('G6d Legendary fight start at mastered 600 is prompt (<500 ms)', win600.startMs < 500, { startMs: win600.startMs });
    await shot('leg-win-600');
    return { ui200, win200, win600 };
  });

  // ================= G7 viewports =================
  await step('G7-viewports', async () => {
    await freshGuest();
    await setViewport(1280, 800, false, false); await sleep(600);
    await ev(`window.__v15.openHub('bosses')`); await sleep(1000);
    await shot('hub-1280');
    const lap = await ev(`(function(){return {scrollW:document.documentElement.scrollWidth, innerW:window.innerWidth, hubShown:!!document.querySelector('#v15body .v18boss, #v15body .v15boss')}})()`);
    verdict('G7a laptop 1280: bosses hub renders, no horizontal overflow', lap.scrollW <= lap.innerW && lap.hubShown === true, lap);
    await setViewport(360, 800, true, false); await sleep(900);
    const m360 = await ev(`(function(){return {scrollW:document.documentElement.scrollWidth, innerW:window.innerWidth, hubShown:!!document.querySelector('#v15body .v18boss, #v15body .v15boss')}})()`);
    verdict('G7b mobile 360: bosses hub renders, no horizontal overflow', m360.scrollW <= m360.innerW && m360.hubShown === true, m360);
    await shot('hub-360');
    // Legendary arena card promises scaling (the card text V46 makes true).
    await ev(`window.__v18.openArena('leg')`); await sleep(900);
    const card = await ev(`(function(){var t=document.getElementById('v15body');return t?t.textContent.replace(/\\s+/g,' ').trim().slice(0,600):null})()`);
    verdict('G7c Legendary arena view shows the difficulty-scaling promise', typeof card === 'string' && card.indexOf('Độ khó câu hỏi tăng theo tiến trình học của bạn') >= 0, card);
    await shot('leg-arena-360');
    await setViewport(1280, 800, false, false); await sleep(600);
    return { lap, m360, card };
  });

  // ================= G8 console summary =================
  await step('G8-console', async () => {
    const sum = { errors: C.consoleErrors, warns: C.consoleWarns, dialogs: C.dialogs };
    verdict('G8 0 console errors, 0 warnings, 0 JS dialogs across all gates', sum.errors.length === 0 && sum.warns.length === 0 && sum.dialogs.length === 0, sum);
    return sum;
  });

  const passed = verdicts.filter(v => v.pass).length;
  const failed = verdicts.filter(v => !v.pass);
  note(`\nverify-v46c: ${passed}/${verdicts.length} PASS` + (failed.length ? ` — FAILURES: ${failed.map(f => f.name).join(' | ')}` : ''));
  saveResults();
  close();
  process.exit(0);
}

main().catch(e => { console.error('verify-v46c crashed:', e); try { close(); } catch (_) {} process.exit(2); });
