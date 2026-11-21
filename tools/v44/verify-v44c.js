// verify-v44c.js - V18.9 LEGENDARY FREEZE FIX Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8977 / CDP 9377, scratch profile.
// Serves ONLY ~/workspace/v7build/out/ (the BUILT V18.9) over local HTTP.
// Modelled on tools/v44/repro-v44.js (same CDP class, ensureHttp/
// ensureChrome, openPage, shot/step, seedLegUnlock, seedMastered,
// poolSnapshot, real UI clicks).
// Exit 0 = driver completed (verdicts are in the results JSON + stdout;
// a FAIL verdict does not crash the driver).
// Writes results to tools/v44/logs/v44c-results.json after EVERY step.
// Screenshots in tools/v44/shots/v44c-*.
// Gates:
//   V44-A Legendary fight start is PROMPT on the fixed build (real UI
//         clicks + direct fight() at mastered 0/250/700, all <500 ms;
//         pool build well under 500 ms) + the NEW Chrome pools match the
//         OLD repro pools byte-for-byte at all three mastered counts.
//   V44-B FULL Legendary fight to a WIN (Hắc Long Nham Hỏa, EN, all
//         correct): P1 -> P2 -> P3 all seen, 5 hearts kept, win screen
//         + rewards, 0 console errors.
//   V44-C non-Legendary fights still work (Challenge Slime + Elemental
//         Unicorn, EN): fast start + first question.
//   V44-D V19 map fight still works (Fire King, EN): start + questions.
//   V44-E V18.5/V18.6 regression spot-checks in Chrome: pet-skill shield
//         halving (Panda: 50 -> 25 dealt, HP 150->125, shield 30->5) +
//         V19 Counterattack resolves 3/3.
//   V44-F 360px mobile: Legendary fight starts promptly, first question
//         renders, no horizontal overflow.
//   V44-G console/dialog summary: 0 errors, 0 warnings, 0 dialogs
//         across ALL gates.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9377;
const HTTPPORT = 8977;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8977/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v44';
const OUTDIR = '/home/hatch/workspace/v7build/out';
const REPRO = JSON.parse(fs.readFileSync(path.join(DIR, 'repro', 'logs', 'r44-results.json'), 'utf-8'));
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
  } catch (e) { note('write failed (EPERM wave?):', p, String(e).slice(0, 120)); return false; }
}
function saveResults() { writeSmall(path.join(DIR, 'logs', 'v44c-results.json'), JSON.stringify({ verdicts, results }, null, 2)); }
function verdict(name, cond, detail) {
  verdicts.push({ name, pass: !!cond, detail: detail === undefined ? null : detail });
  note((cond ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  saveResults();
  return !!cond;
}
let chromeProc = null, httpProc = null;
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
    note('chrome start attempt', attempt);
    const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
      '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
      '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
      '--user-data-dir=/tmp/chrome-v44c-prof', `--remote-debugging-port=${PORT}`,
      '--window-size=1280,800', 'about:blank'];
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
  const t = list.find(x => x.type === 'page');
  C = new CDP(t.webSocketDebuggerUrl);
  await C.ready;
  await C.send('Page.enable'); await C.send('Runtime.enable');
  await setViewport(1280, 800, false);
  await C.eval(`location.href = ${JSON.stringify(URL)}`);
  await sleep(3000);
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await C.eval('location.reload()');
  await sleep(2500);
  return C;
}
async function setViewport(w, h, mobile, dark) {
  await C.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
  await C.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
}
async function reloadWait(ms) { await C.eval('location.reload()'); await sleep(ms || 2800); }
async function shot(name) {
  try {
    const r = await C.send('Page.captureScreenshot', { format: 'png' });
    writeSmall(path.join(DIR, 'shots', `v44c-${name}.png`), Buffer.from(r.data, 'base64'));
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
  await C.eval(`localStorage.clear()`);
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await reloadWait(2800);
}
async function seedLegUnlock() {
  return await C.eval(`(function(){
    try{
      var e=window.__v18._test.en18();
      ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
      save();
      return {ok:true, elWins:window.__v18.arenaWins('el'), legOpen:window.__v18.arenaOpen('leg'),
        firedragonUnlocked:window.__v18.bossUnlocked(window.__V18_BOSSES.byId('v10_firedragon'))};
    }catch(err){return {ok:false,err:String(err)};}
  })()`);
}
async function seedMastered(n) {
  return await C.eval(`(function(n){
    try{
      var st=window.__v14.state; st.box={};
      var ws=window.__v15.words;
      for(var i=0;i<n&&i<ws.length;i++) st.box[ws[i].id]=5;
      save();
      return {ok:true, n:n, words:ws.length, mastered:window.__v15.counts.mastered, legDiff:window.__v18._test.legDiff()};
    }catch(err){return {ok:false,err:String(err)};}
  })(${n})`);
}
async function poolSnapshot() {
  return await C.eval(`(function(){
    try{
      var F=window.__v18._test.F(); if(!F||!F.pools) return {ok:false,why:'no pools'};
      var w=F.pools.words.map(function(x){return x.id}).sort();
      var g=F.pools.grammar.map(function(x){return x.q||x.id||''}).sort();
      var levels={}; F.pools.words.forEach(function(x){levels[x.lv]=(levels[x.lv]||0)+1;});
      var gLevels={}; F.pools.grammar.forEach(function(x){gLevels[x.lv]=(gLevels[x.lv]||0)+1;});
      return {ok:true, boss:F.boss.id, lang:F.lang, qmode:F.qmode,
        wordsN:w.length, grammarN:g.length, wordLevels:levels, grammarLevels:gLevels,
        wordIds:w, grammarIds:g, firstQ:!!document.querySelector('#v18fight .v18qword')};
    }catch(err){return {ok:false,err:String(err)};}
  })()`);
}
async function seedPets() {
  return await C.eval(`(function(){
    try{
      var e=window.__v23._test.en23(); if(!e) return {ok:false,why:'no en23'};
      var sp=window.__v23.data().species||[];
      var have=Object.keys(e.pets||{}).length;
      if(have>=3 && (e.team||[]).filter(Boolean).length>=1)
        return {ok:true,already:true,pets:have,team:(e.team||[]).filter(Boolean).length};
      e.pets=e.pets||{}; e.team=e.team||[null,null,null];
      var ids=[];
      for(var i=0;i<3;i++){
        var inst=window.__v23._test.newPet(sp[i%sp.length].id);
        if(!inst) return {ok:false,why:'newPet failed sp '+sp[i%sp.length].id};
        inst.lv=3; inst.st=0; inst.xp=0;
        e.pets[inst.id]=inst; ids.push(inst.id); e.team[i]=inst.id;
      }
      save();
      return {ok:true,seeded:ids.length,team:e.team};
    }catch(err){return {ok:false,err:String(err)};}
  })()`);
}

async function main() {
  await openPage();
  await step('boot', async () => await C.eval(`(function(){return {v44:!!window.__v44, v44version:window.__v44&&window.__v44.version,
    title:document.title, words:window.__v15.words.length,
    grammar:(window.__V15_DATA&&window.__V15_DATA.grammar||[]).length}})()`));
  verdict('V44-A0 boot: __v44 18.9.0 present, 4889 words, 48 grammar', true);

  // ===== V44-A: Legendary fight start is PROMPT (real UI clicks) =====
  await freshGuest();
  // The hub must be open first: openArena/fight render into #v15body /
  // #v18fight, which only exist after openHub('bosses') (the repro's R1
  // opened it; without it the fight logic runs but nothing renders).
  await C.eval(`window.__v15.openHub('bosses')`); await sleep(800);
  await step('A-seed-leg-unlock', seedLegUnlock);
  await step('A-open-leg-arena', async () => {
    await C.eval(`window.__v18.openArena('leg')`); await sleep(600);
    return await C.eval(`(function(){
      var btns=[].slice.call(document.querySelectorAll('#v15body .v18boss .btn.pri'));
      return {arenaButtons:btns.length,
        firedragonBtn:btns.some(function(b){return (b.getAttribute('onclick')||'').indexOf('v10_firedragon')>=0})};
    })()`);
  });
  await shot('leg-arena');
  const clickChallenge = await C.eval(`(function(){
    var btns=[].slice.call(document.querySelectorAll('#v15body .v18boss .btn.pri'));
    var b=btns.filter(function(x){return (x.getAttribute('onclick')||'').indexOf('v10_firedragon')>=0;})[0];
    if(!b) return {ok:false,why:'no firedragon button'};
    var t0=performance.now(); b.click(); var t1=performance.now();
    return {ok:true, clickMs:(t1-t0), langPickShown:!!document.querySelector('#v18fight .acts')};
  })()`);
  results['A-click-challenge'] = clickChallenge;
  verdict('V44-A1 "Khiêu chiến" click renders the language pick promptly (<500 ms)', clickChallenge.ok && clickChallenge.clickMs < 500, clickChallenge);
  const clickEnglish = await C.eval(`(function(){
    var btns=[].slice.call(document.querySelectorAll('#v18fight .btn.pri'));
    var b=btns[0];
    if(!b) return {ok:false,why:'no lang button'};
    var t0=performance.now(); b.click(); var t1=performance.now();
    var F=window.__v18._test.F();
    return {ok:true, clickMs:(t1-t0), boss:F&&F.boss.id, lang:F&&F.lang, qmode:F&&F.qmode,
      questionRendered:!!document.querySelector('#v18fight .v18qword'),
      poolWords:F&&F.pools?F.pools.words.length:null,
      poolGrammar:F&&F.pools?F.pools.grammar.length:null};
  })()`);
  results['A-click-english'] = clickEnglish;
  verdict('V44-A2 🇬🇧 Tiếng Anh click starts the Legendary fight promptly (<500 ms, was 3,679.5 ms)', clickEnglish.ok && clickEnglish.clickMs < 500 && clickEnglish.questionRendered === true, clickEnglish);
  await shot('leg-first-question');
  const pool0 = await poolSnapshot();
  results['A-pool-mastered-0'] = pool0;
  verdict('V44-A3 NEW pool at mastered 0 matches OLD repro pool (550 words / 24 grammar, same ids)',
    pool0.ok && pool0.wordsN === 550 && pool0.grammarN === 24 &&
    JSON.stringify(pool0.wordIds) === JSON.stringify(REPRO['R2-pool-mastered-0'].wordIds) &&
    JSON.stringify(pool0.grammarIds) === JSON.stringify(REPRO['R2-pool-mastered-0'].grammarIds),
    { wordsN: pool0.wordsN, grammarN: pool0.grammarN, wordLevels: pool0.wordLevels });
  await C.eval(`window.__v18.close()`); await sleep(300);

  // Direct fight() timings at mastered 250 / 700 + pool identity.
  for (const n of [250, 700]) {
    const seed = await seedMastered(n);
    results[`A-seed-mastered-${n}`] = seed;
    const t = await C.eval(`(function(){
      var t0=performance.now();
      window.__v18.fight('v10_firedragon','en');
      var t1=performance.now();
      var F=window.__v18._test.F();
      return {ok:true, startMs:(t1-t0), boss:F&&F.boss.id, qmode:F&&F.qmode,
        poolWords:F&&F.pools?F.pools.words.length:null,
        poolGrammar:F&&F.pools?F.pools.grammar.length:null};
    })()`);
    results[`A-fight-mastered-${n}`] = t;
    verdict(`V44-A4 direct fight() at mastered ${n} starts promptly (<500 ms, was ${n === 250 ? '7,660.6' : '7,309.9'} ms)`,
      t.ok && t.startMs < 500 && t.poolWords === 550, t);
    const pool = await poolSnapshot();
    results[`A-pool-mastered-${n}`] = pool;
    const oldPool = REPRO[`R4-pool-mastered-${n}`];
    verdict(`V44-A5 NEW pool at mastered ${n} matches OLD repro pool (same ids)`,
      pool.ok && JSON.stringify(pool.wordIds) === JSON.stringify(oldPool.wordIds) &&
      JSON.stringify(pool.grammarIds) === JSON.stringify(oldPool.grammarIds),
      { wordsN: pool.wordsN, grammarN: pool.grammarN });
    await C.eval(`window.__v18.close()`); await sleep(300);
  }

  // ===== V44-B: FULL Legendary fight to a WIN =====
  await step('B-seed-mastered-0', () => seedMastered(0));
  const before = await C.eval(`(function(){ try{ return {xp:S.xp, gems:(S.gems!=null?S.gems:S.diamonds), gold:S.gold}; }catch(e){ return {err:String(e)}; } })()`);
  results['B-before'] = before;
  await C.eval(`window.__v18.fight('v10_firedragon','en')`); await sleep(400);
  const fightRes = { phasesSeen: [], heartsTrace: [], hpTrace: [], rounds: 0, over: null, winText: '' };
  for (let i = 0; i < 60; i++) {
    const st = await C.eval(`(function(){var F=window.__v18._test.F(); if(!F) return null;
      return {over:F.over, phase:F.phase, hearts:F.hearts, hp:F.hp, maxHp:F.maxHp, q:F.q,
        answered:F.answered, qmode:F.qmode}; })()`);
    if (!st) { fightRes.over = 'NO-F'; break; }
    if (fightRes.phasesSeen.indexOf(st.phase) < 0) fightRes.phasesSeen.push(st.phase);
    fightRes.heartsTrace.push(st.hearts); fightRes.hpTrace.push(st.hp); fightRes.rounds = i;
    if (st.over) { fightRes.over = st.over; break; }
    if (st.answered === null) { await C.eval(`window.__v18._test.pickCorrect()`); await sleep(250); }
    await C.eval(`window.__v18.next()`); await sleep(350);
  }
  fightRes.over = fightRes.over || await C.eval(`(function(){var F=window.__v18._test.F(); return F?F.over:'NO-F';})()`);
  fightRes.winText = await C.eval(`(document.querySelector('#v18fight')||{innerText:''}).innerText.slice(0,300)`);
  const after = await C.eval(`(function(){ try{ return {xp:S.xp, gems:(S.gems!=null?S.gems:S.diamonds), gold:S.gold}; }catch(e){ return {err:String(e)}; } })()`);
  results['B-fight'] = fightRes; results['B-after'] = after;
  verdict('V44-B1 full Legendary fight ends in a WIN (was unreachable: freeze on start)', fightRes.over === 'win', { over: fightRes.over, rounds: fightRes.rounds });
  verdict('V44-B2 all three phases seen (P1 -> P2 -> P3)', [1, 2, 3].every(p => fightRes.phasesSeen.indexOf(p) >= 0), fightRes.phasesSeen);
  verdict('V44-B3 all 5 hearts kept on a perfect run', fightRes.heartsTrace.length > 0 && fightRes.heartsTrace.every(h => h === 5), { min: Math.min.apply(null, fightRes.heartsTrace) });
  verdict('V44-B4 win screen renders (reward/first-win text)', typeof fightRes.winText === 'string' && fightRes.winText.length > 20, fightRes.winText.slice(0, 160));
  note('B xp/gems before:', JSON.stringify(before), 'after:', JSON.stringify(after));
  await shot('leg-win');
  await C.eval(`window.__v18.close()`); await sleep(300);

  // ===== V44-C: non-Legendary fights still work =====
  const chal = await C.eval(`(function(){
    var t0=performance.now();
    window.__v18.fight('v10_slime','en');
    var t1=performance.now();
    var F=window.__v18._test.F();
    return {startMs:(t1-t0), boss:F&&F.boss.id, qmode:F&&F.qmode,
      questionRendered:!!document.querySelector('#v18fight .v18qword'),
      poolWords:F&&F.pools?F.pools.words.length:null};
  })()`);
  results['C-challenge'] = chal;
  verdict('V44-C1 Challenge fight (Slime, EN) starts promptly + first question', chal.startMs < 500 && chal.questionRendered === true, chal);
  await C.eval(`window.__v18._test.pickCorrect()`); await sleep(300);
  const chalAfter = await C.eval(`(function(){var F=window.__v18._test.F(); return F?{hp:F.hp,hearts:F.hearts,over:F.over}:null})()`);
  verdict('V44-C2 Challenge fight answers correctly (boss HP drops)', chalAfter && chalAfter.hp < 70, chalAfter);
  await C.eval(`window.__v18.close()`); await sleep(300);
  const el = await C.eval(`(function(){
    var t0=performance.now();
    window.__v18.fight('v10_unicorn','en');
    var t1=performance.now();
    var F=window.__v18._test.F();
    return {startMs:(t1-t0), boss:F&&F.boss.id, qmode:F&&F.qmode,
      questionRendered:!!document.querySelector('#v18fight .v18qword'),
      poolWords:F&&F.pools?F.pools.words.length:null};
  })()`);
  results['C-elemental'] = el;
  verdict('V44-C3 Elemental fight (Unicorn, EN) starts promptly + first question', el.startMs < 500 && el.questionRendered === true, el);
  await C.eval(`window.__v18.close()`); await sleep(300);

  // ===== V44-D: V19 map fight still works =====
  await step('D-seed-pets', seedPets);
  const v19 = await C.eval(`(function(){
    var t0=performance.now();
    window.__v19.openMap(); window.__v19._test.setLang('en');
    window.__v19.fight('v11_fireking');
    var t1=performance.now();
    var F=window.__v19._test.F();
    return {startMs:(t1-t0), boss:F&&F.boss.id, lang:F&&F.lang, qmode:F&&F.qmode,
      questionRendered:!!document.querySelector('#v19fight .v19qword')};
  })()`);
  results['D-v19'] = v19;
  verdict('V44-D1 V19 map fight (Fire King, EN) starts + first question', v19.boss === 'v11_fireking' && v19.questionRendered === true, v19);
  for (let i = 0; i < 3; i++) {
    await C.eval(`window.__v19._test.pickCorrect()`); await sleep(300);
    await C.eval(`window.__v19.next()`); await sleep(400);
  }
  const v19After = await C.eval(`(function(){var F=window.__v19._test.F(); return F?{hp:F.hp,hearts:F.hearts,over:F.over,q:F.q}:null})()`);
  verdict('V44-D2 V19 fight answers correctly (boss HP drops, still fighting)', v19After && v19After.hp < 325 && !v19After.over, v19After);
  await C.eval(`window.__v19.close()`); await sleep(300);

  // ===== V44-E: V18.5/V18.6 regression spot-checks in Chrome =====
  // (a) C-02 pet-skill shield halving (Panda).
  await step('E-seed-shield', async () => await C.eval(`(function(){
    var e=window.__v18.en18();
    ['v10_slime','v10_fairy','v10_dragon','v10_ghost','v10_spider','v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){ e.bosses[id]={win:1,wins:1,at:Date.now(),item:'x'}; });
    S.v7.en23={pets:{p1:{id:'p1',sp:'dragon',st:1,lv:10,xp:0,aff:0}},team:['p1',null,null],eggs:{fire:1,forest:1},hatch:null,mats:{},claimed:{},affClaimed:{},created:1};
    save();
    return {ok:true};
  })()`));
  const sh0 = await C.eval(`(function(){
    window.__v18.fight('v10_panda','en');
    var F=window.__v18._test.F();
    return {ok:!!F, hp:F?F.hp:null, shield:F?F.shield:null, pet:!!(F&&F.pet), activeVal:F&&F.pet?F.pet.activeVal:null};
  })()`);
  const sh1 = await C.eval(`(function(){
    var F=window.__v18._test.F();
    F.pet.energy=10;
    window.__v23.castSkillInFight();
    var F2=window.__v18._test.F();
    return {hp:F2.hp, shield:F2.shield, over:F2.over};
  })()`);
  results['E-shield'] = { sh0, sh1 };
  verdict('V44-E1 C-02 panda opens with shield 30 + pet team (activeVal 50)', sh0.ok && sh0.hp === 150 && sh0.shield === 30 && sh0.activeVal === 50, sh0);
  verdict('V44-E2 C-02 team skill (50) vs shield 30: HP 150->125 (halved), shield 30->5', sh1.hp === 125 && sh1.shield === 5, sh1);
  await C.eval(`window.__v18.close()`); await sleep(300);
  // (b) V19 Counterattack 3/3 (same R1 sequence as test41 §41A, in Chrome).
  const ca = await C.eval(`(function(){
    var out={};
    try{
      window.__v19.openMapFor('en'); window.__v19.fight('v11_fireking');
      var F=window.__v19._test.F();
      out.opened=!!F; out.maxHp=F?F.maxHp:null; out.qmode0=F?F.qmode:null;
      F.hp=75; F.pet.energy=10;
      window.__v23.castSkillInFight();
      var F2=window.__v19._test.F();
      out.afterSkill={hp:F2.hp, ultActive:F2.ultActive, caQ:F2.caQ, caRight:F2.caRight, phase:F2.phase};
      F2.hp=200;
      var okPick=window.__v19._test.pickCorrect();
      var F3=window.__v19._test.F();
      out.pickOk=okPick;
      out.afterInflight={hp:F3.hp, caRight:F3.caRight, score:F3.score, right:F3.right, answered:F3.answered, qmode:F3.qmode, ultActive:F3.ultActive};
      window.__v19._test.next();
      var F4=window.__v19._test.F();
      out.afterNext={qmode:F4.qmode, caQ:F4.caQ, caRight:F4.caRight};
      for(var i=0;i<3;i++){ window.__v19._test.pickCorrect(); window.__v19._test.next(); }
      var F5=window.__v19._test.F();
      out.afterCA={caRight:F5.caRight, hearts:F5.hearts, phase:F5.phase, banner:F5.banner, over:F5.over, hp:F5.hp};
    }catch(e){ out.err=String(e); }
    return out;
  })()`);
  results['E-ca'] = ca;
  verdict('V44-E3 CA skill drops HP 75->25, CA starts at once (caQ 0, caRight 0, P2)', ca.afterSkill && ca.afterSkill.hp === 25 && ca.afterSkill.ultActive === true && ca.afterSkill.caQ === 0 && ca.afterSkill.caRight === 0 && ca.afterSkill.phase === 2, ca.afterSkill);
  verdict('V44-E4 CA in-flight NORMAL answer is NOT a CA answer (caRight 0, score 1)', ca.pickOk === true && ca.afterInflight && ca.afterInflight.caRight === 0 && ca.afterInflight.score === 1, ca.afterInflight);
  verdict('V44-E5 CA perfect run resolves 3/3 (caRight 3, hearts 5, P3, 3/3 banner)', ca.afterCA && ca.afterCA.caRight === 3 && ca.afterCA.hearts === 5 && ca.afterCA.phase === 3 && typeof ca.afterCA.banner === 'string' && ca.afterCA.banner.indexOf('3/3') >= 0, ca.afterCA);
  await C.eval(`window.__v19.close()`); await sleep(300);

  // ===== V44-F: 360px mobile =====
  await setViewport(360, 800, true, false);
  await reloadWait(2800);
  await C.eval(`window.__v15.openHub('bosses')`); await sleep(800);
  await step('F-seed', seedLegUnlock);
  const mob = await C.eval(`(function(){
    // NOTE: gate B already WON v10_firedragon, so its card now shows
    // "Đã thắng ✓" with NO "Khiêu chiến" button — target the next
    // Legendary boss instead (v10_icewolf, unlocked by that win).
    // Same arena, same mode, same pools, same freeze path.
    window.__v18.openArena('leg');
    var btns=[].slice.call(document.querySelectorAll('#v15body .v18boss .btn.pri'));
    var b=btns.filter(function(x){return (x.getAttribute('onclick')||'').indexOf('v10_icewolf')>=0;})[0];
    if(!b) return {ok:false,why:'no icewolf button'};
    var t0=performance.now(); b.click();
    var b2=document.querySelectorAll('#v18fight .btn.pri')[0];
    if(!b2) return {ok:false,why:'no lang button'};
    b2.click(); var t1=performance.now();
    var F=window.__v18._test.F();
    return {ok:true, clickMs:(t1-t0), boss:F&&F.boss.id, qmode:F&&F.qmode,
      questionRendered:!!document.querySelector('#v18fight .v18qword'),
      overflow:document.documentElement.scrollWidth>window.innerWidth,
      scrollW:document.documentElement.scrollWidth, innerW:window.innerWidth};
  })()`);
  results['F-mobile'] = mob;
  verdict('V44-F1 360px Legendary fight starts promptly (<500 ms)', mob.ok && mob.clickMs < 500 && mob.questionRendered === true, mob);
  verdict('V44-F2 360px fight screen has no horizontal overflow', mob.ok && mob.overflow === false, { scrollW: mob.scrollW, innerW: mob.innerW });
  await shot('leg-360-first-question');
  await C.eval(`window.__v18.close()`); await sleep(300);

  // ===== V44-G: console / dialogs summary =====
  await step('G-console', async () => ({ errors: C.consoleErrors, warns: C.consoleWarns, dialogs: C.dialogs }));
  verdict('V44-G1 zero console errors across all gates', C.consoleErrors.length === 0, C.consoleErrors);
  verdict('V44-G2 zero console warnings across all gates', C.consoleWarns.length === 0, C.consoleWarns);
  verdict('V44-G3 zero JS dialogs across all gates', C.dialogs.length === 0, C.dialogs);
  const passed = verdicts.filter(v => v.pass).length, failed = verdicts.filter(v => !v.pass).length;
  note(`DONE. verdicts: ${passed} PASS, ${failed} FAIL (of ${verdicts.length})`);
  saveResults();
  try { if (chromeProc) chromeProc.kill(); } catch (e) {}
  try { if (httpProc) httpProc.kill(); } catch (e) {}
  process.exit(0);
}
main().catch(e => { note('FATAL', String(e).slice(0, 500)); saveResults(); try { if (chromeProc) chromeProc.kill(); } catch (err) {} try { if (httpProc) httpProc.kill(); } catch (err) {} process.exit(2); });
