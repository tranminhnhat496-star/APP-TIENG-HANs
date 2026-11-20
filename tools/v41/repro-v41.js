// repro-v41.js - V18.6 BUG FIXES III repro-first driver (real Chrome 157).
// Proves each round-2 bug on the pristine V18.5 base (mode 'base') and
// proves it gone on the V41 build (mode 'fixed'). Same script, same
// steps; only the EXPECTED outcome flips with the mode.
//   node tools/v41/repro-v41.js [DIR] [base|fixed]
//   DIR defaults to <repo>/out. Results: tools/v41/logs/repro-v41-<mode>.json
//   Screenshots: tools/v41/shots/repro-<mode>-*.
// Gates: R1 (skill-triggered CA counts in-flight answer, caRight 4 ->
//   0/3 failure), R1b (answer-triggered CA control, 3/3 full break),
//   R2 (skill-triggered CA + grammar question throws), F1 (boot on a
//   save without S.opt), F2 (stale harvest-quiz div, duplicate id),
//   F3 (pre-restore snapshot misses the debounced save), F4 (raw row
//   counts + deduped counts), NAV360/390 (bottom-nav label overlap),
//   U2 (team-skill HP/shield paint lag — expected NO lag either way).
// Modelled on tools/v40/repro-v40.js + tools/v41/review-scratch/
// verify-a-v40c.js (same CDP class, seeds, real-click helpers).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9371;
const HTTPPORT = 8971;
const POLICY = '/tmp/webgl-policy.txt';
const DIR = process.argv[2] || path.resolve(__dirname, '..', '..', 'out');
const MODE = process.argv[3] || 'base'; // 'base' = expect the bug; 'fixed' = expect the fix
const FIXED = MODE === 'fixed';
const URL = `http://127.0.0.1:${HTTPPORT}/index.html`;
const TOOLDIR = '/home/hatch/workspace/v7build/tools/v41';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = { mode: MODE, dir: DIR };
function note(...a) { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); }
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
function saveResults() { writeSmall(path.join(TOOLDIR, 'logs', `repro-v41-${MODE}.json`), JSON.stringify(results, null, 2)); }
let chromeProc = null;
let httpProc = null;
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
  const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
    '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
    '--user-data-dir=/tmp/chrome-v41r-prof', `--remote-debugging-port=${PORT}`,
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
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await C.eval('location.reload()');
  await sleep(2500);
  return C;
}
async function reloadWait(ms) { await C.eval('location.reload()'); await sleep(ms || 2800); }
async function shot(name) {
  try {
    const r = await C.send('Page.captureScreenshot', { format: 'png' });
    writeSmall(path.join(TOOLDIR, 'shots', `repro-${MODE}-${name}.png`), Buffer.from(r.data, 'base64'));
  } catch (e) { note('shot failed:', name, String(e).slice(0, 120)); }
}
async function step(name, fn) {
  try {
    const r = await fn();
    results[name] = r;
    note(`STEP ${name} —`, JSON.stringify(r).slice(0, 900));
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
// Fight-wide seeds: pet team (dragon Lv10, activeVal 50), all V19 map
// bosses won EN (unlocks every zone), all V18 el+leg bosses won, old-arena
// wins in en15 (feeds the Chrono gate count). Verbatim pattern from
// tools/v41/review-scratch/verify-a-v40c.js.
async function seedFights() {
  const r = await C.eval(`(function(){
    S.v7.en23={pets:{p1:{id:'p1',sp:'dragon',st:1,lv:10,xp:0,aff:0}},team:['p1',null,null],eggs:{fire:1,forest:1},hatch:null,mats:{},claimed:{},affClaimed:{},created:1};
    var e19=window.__v19.en19();
    window.__v19.bosses.bosses.forEach(function(b){ e19.bosses[b.id]={en:{win:1,wins:1,stars:2,best:0},ko:{win:0,wins:0,stars:0,best:0}}; });
    (window.__v33._test.CHRONO_IDS||[]).concat(window.__v35._test.SKYROOT_IDS||[]).forEach(function(id){ e19.bosses[id]={en:{win:1,wins:1,stars:2,best:0},ko:{win:0,wins:0,stars:0,best:0}}; });
    var e18=window.__v18.en18();
    (window.__V18_BOSSES.el||[]).concat(window.__V18_BOSSES.leg||[]).forEach(function(b){ e18.bosses[b.id]={win:1,wins:1,at:Date.now(),item:'x'}; });
    var e15=window.__v15.en15(); e15.bosses=e15.bosses||{};
    (window.__V18_BOSSES.old||[]).forEach(function(b){ e15.bosses[b.id]={win:1,wins:1,at:Date.now()}; });
    save();
    return {en19:Object.keys(e19.bosses).length, en18:Object.keys(e18.bosses).length, en15:Object.keys(e15.bosses).length,
      gate: (function(){ try{ return window.__v33._test.correctedWinCount(); }catch(e){ return 'ERR:'+e; } })()};
  })()`);
  await sleep(1500);
  return r;
}
async function readFight19() {
  return await C.eval(`(function(){ try{
    var F=window.__v19._test.F(); if(!F) return {started:false};
    var el=document.querySelector('#v19fight');
    return {started:true, lang:F.lang, qmode:F.qmode, curKO: !!(F.cur&&F.cur.ko),
      banner:F.banner,
      bannerText:(function(){var b=document.querySelector('#v19fight .v19banner'); return b?(b.textContent||'').slice(0,140):null})(),
      over:F.over, hp:F.hp, maxHp:F.maxHp, shield:F.shield, phase:F.phase,
      ultActive:!!F.ultActive, caQ:F.caQ, caRight:F.caRight,
      caMode:(typeof F.caMode==='undefined'?'undef':F.caMode),
      answered:F.answered, score:F.score, right:F.right, hearts:F.hearts,
      opts:(function(){var n=document.querySelectorAll('#v19fight .v19opt'); return n.length;})(),
      skillBtn: !!document.querySelector('#v19fight .v23bf-skill'),
      paintedHp:(function(){var h=el?el.innerHTML:''; var m=h.match(/HP (\\d+)\\/(\\d+)/); return m?m[0]:null})()};
  }catch(e){ return 'ERR:'+e; } })()`);
}
async function clickSkill19() {
  return await C.eval(`(function(){ try{
    var F=window.__v19._test.F(); if(!F) return {ok:false, why:'no F'};
    F.pet.energy=10;
    try{ window.__v19._petRefresh(); }catch(e){}
    var b=document.querySelector('#v19fight .v23bf-skill');
    if(b && !b.disabled){ b.click(); return {ok:true, via:'button'}; }
    window.__v23.castSkillInFight();
    return {ok:true, via:'direct', btnPresent:!!b, btnDisabled:b?b.disabled:null};
  }catch(e){ return {ok:false, err:String(e)}; } })()`);
}
// Real DOM click on the CORRECT option button. The index is computed from
// F.cur with the SAFE mode fallback (qHTML's caMode||qmode) — exactly what
// a player who knows the answer would press. The press itself goes through
// the real onclick="__v19.pick(i)" handler.
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
// Answer the 3 CA questions correctly (real clicks) + the final next()
// that resolves the ultimate. Returns the fight state after resolve.
async function answerCAx3() {
  for (let i = 0; i < 3; i++) {
    const pick = await clickCorrect19();
    if (!pick.ok) return { ok: false, at: 'pick' + i, pick };
    await sleep(300);
    const nx = await clickNext19();
    if (!nx.ok) return { ok: false, at: 'next' + i, nx };
    await sleep(300);
  }
  await sleep(300);
  return await readFight19();
}


async function main() {
  try {
    let chromeAlive = false;
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); chromeAlive = r.ok; } catch (e) {}
    if (!chromeAlive) { try { execSync('rm -rf /tmp/chrome-v41r-prof'); note('fresh profile: removed old chrome-v41r-prof'); } catch (e) {} }
    await openPage();
    const boot = await C.eval(`(function(){ return { v15: !!window.__v15, v18: !!window.__v18, v19: !!window.__v19, v23: !!window.__v23, v41: !!window.__v41, title: document.title, cards: (function(){ try{ return S.cards.length; }catch(e){ return 'ERR:'+e; } })() }; })()`);
    note('boot:', boot);
    results.boot = boot;
    saveResults();
    const err0 = C.consoleErrors.length, warn0 = C.consoleWarns.length, dlg0 = C.dialogs.length;
    const delta = () => ({ errors: C.consoleErrors.length - err0, warns: C.consoleWarns.length - warn0, dialogs: C.dialogs.length - dlg0 });
    let allOk = true;
    const failedVerdicts = [];
    function v(name, cond, detail) { if (!verdict(name, cond, detail)) { allOk = false; failedVerdicts.push(name); } return cond; }

    // ============ R1: skill-triggered CA counts the in-flight answer ============
    await step('R1-skill-triggered-CA', async () => {
      const r = {};
      await freshGuest();
      r.seeds = await seedFights();
      await C.eval(`(function(){ try{ window.__v19.openMapFor('en'); window.__v19.fight('v11_fireking'); }catch(e){} })()`);
      await sleep(800);
      const f0 = await readFight19();
      r.f0 = f0;
      v('R1.0 fireking EN fight opens (HP 325, shield 0, skill button painted)', f0.started === true && f0.maxHp === 325 && f0.shield === 0 && f0.skillBtn === true, f0);
      await C.eval(`(function(){ var F=window.__v19._test.F(); if(F) F.hp=75; })()`);
      const sk = await clickSkill19();
      await sleep(400);
      const f1 = await readFight19();
      r.f1 = f1; r.skill = sk;
      v('R1.1 REAL skill click drops HP 75->25 and starts the CA at once', f1.hp === 25 && f1.ultActive === true && f1.caQ === 0 && f1.caRight === 0 && f1.phase === 2, f1);
      v('R1.2 CA warning banner is painted', typeof f1.bannerText === 'string' && f1.bannerText.indexOf('TUYỆT KỸ') >= 0, f1.bannerText);
      await shot('R1-after-skill');
      const pick = await clickCorrect19();
      await sleep(400);
      const f2 = await readFight19();
      r.f2 = f2; r.pick = pick;
      if (!FIXED) {
        v('R1.3 BUG (base): in-flight NORMAL answer counts as a CA answer (caRight 0->1, HP stays 25, score stays 0)', pick.ok === true && f2.caRight === 1 && f2.hp === 25 && f2.score === 0, f2);
      } else {
        v('R1.3 FIXED: in-flight NORMAL answer is a normal answer (caRight stays 0, HP drops, score 1)', pick.ok === true && f2.caRight === 0 && f2.hp < 25 && f2.score === 1, f2);
      }
      await clickNext19();
      await sleep(400);
      const f3 = await answerCAx3();
      r.f3 = f3;
      await shot('R1-after-resolve');
      if (!FIXED) {
        v('R1.4 BUG (base): after 3 CA correct, caRight is 4 (not 3)', f3.caRight === 4, f3);
        v('R1.5 BUG (base): perfect 4/4 run punished as 0/3 (hearts 5->3, "0/3" banner, P3)', f3.hearts === 3 && typeof f3.bannerText === 'string' && f3.bannerText.indexOf('0/3') >= 0 && f3.phase === 3 && f3.over === null, f3);
      } else {
        v('R1.4 FIXED: after 3 CA correct, caRight is 3', f3.caRight === 3, f3);
        v('R1.5 FIXED: 3/3 full break (hearts 5, "3/3" banner, P3)', f3.hearts === 5 && typeof f3.bannerText === 'string' && f3.bannerText.indexOf('3/3') >= 0 && f3.phase === 3, f3);
      }
      r.console = delta();
      return r;
    });

    // ============ R1b control: answer-triggered CA still 3/3 ============
    await step('R1b-answer-triggered-CA-control', async () => {
      const r = {};
      await C.eval(`(function(){ try{ window.__v19._test.close(); window.__v19.openMapFor('en'); window.__v19.fight('v11_fireking'); var F=window.__v19._test.F(); if(F) F.hp=70; }catch(e){} })()`);
      await sleep(800);
      const pick = await clickCorrect19();
      await sleep(400);
      const f1 = await readFight19();
      r.f1 = f1; r.pick = pick;
      v('R1b.1 answer-triggered CA starts normally (ultActive, caRight 0, HP damaged)', pick.ok === true && f1.ultActive === true && f1.caRight === 0 && f1.hp < 70, f1);
      await clickNext19();
      await sleep(400);
      const f2 = await answerCAx3();
      r.f2 = f2;
      await shot('R1b-after-resolve');
      v('R1b.2 answer-triggered CA resolves 3/3: full break, hearts untouched, P3', f2.caRight === 3 && f2.hearts === 5 && typeof f2.bannerText === 'string' && f2.bannerText.indexOf('3/3') >= 0 && f2.phase === 3, f2);
      r.console = delta();
      return r;
    });

    // ============ R2: skill-triggered CA + grammar question throws ============
    await step('R2-skill-triggered-CA-grammar', async () => {
      const r = {};
      await C.eval(`(function(){ try{ window.__v19._test.close(); window.__v19.openMapFor('en'); window.__v19.fight('v11_heavenknight'); }catch(e){} })()`);
      await sleep(800);
      const f0 = await readFight19();
      r.f0 = f0;
      v('R2.0 heavenknight EN fight opens on a grammar question (mode grammar, 4 options)', f0.started === true && f0.maxHp === 400 && f0.qmode === 'grammar' && f0.opts === 4, f0);
      await C.eval(`(function(){ var F=window.__v19._test.F(); if(F) F.hp=90; })()`);
      const sk = await clickSkill19();
      await sleep(400);
      const f1 = await readFight19();
      r.f1 = f1; r.skill = sk;
      v('R2.1 REAL skill click drops HP 90->40 and starts the CA (caMode undef)', f1.hp === 40 && f1.ultActive === true && f1.caMode === 'undef', f1);
      await shot('R2-after-skill');
      const errBefore = C.consoleErrors.length;
      const pick = await clickCorrect19();
      await sleep(400);
      const f2 = await readFight19();
      r.f2 = f2; r.pick = pick;
      r.newErrors = C.consoleErrors.slice(errBefore);
      if (!FIXED) {
        v('R2.2 BUG (base): real click on the grammar answer throws (uncaught TypeError, answered stays null, caRight 0)', r.newErrors.length >= 1 && r.newErrors.join(' ').indexOf('findIndex') >= 0 && f2.answered === null && f2.caRight === 0, { pick, f2, newErrors: r.newErrors });
      } else {
        v('R2.2 FIXED: grammar answer works under the CA (no exception, answered set, damage dealt)', r.newErrors.length === 0 && pick.ok === true && f2.answered !== null && f2.caRight === 0 && f2.hp < 40, { pick, f2, newErrors: r.newErrors });
      }
      r.console = delta();
      return r;
    });

    // ============ F1: boot on a save without S.opt ============
    await step('F1-boot-without-opt', async () => {
      const r = {};
      await freshGuest();
      const before = await C.eval(`(function(){ try{ return {appLen: (document.getElementById('app')?document.getElementById('app').innerHTML.length:-1), hasOpt: !!S.opt}; }catch(e){ return 'ERR:'+e; } })()`);
      r.before = before;
      v('F1.0 fresh guest boots with opt + rendered #app', before.hasOpt === true && before.appLen > 0, before);
      const errBefore = C.consoleErrors.length;
      await C.eval(`(function(){ var j=JSON.parse(localStorage.getItem('hanvocab.v1')); delete j.opt; localStorage.setItem('hanvocab.v1', JSON.stringify(j)); })()`);
      await reloadWait(2800);
      const after = await C.eval(`(function(){ try{ return {appLen: (document.getElementById('app')?document.getElementById('app').innerHTML.length:-1), hasOpt: (typeof S!=='undefined' && !!S.opt), opt: (typeof S!=='undefined' && S.opt)||null}; }catch(e){ return 'ERR:'+e; } })()`);
      r.after = after;
      r.newErrors = C.consoleErrors.slice(errBefore);
      if (!FIXED) {
        v('F1.1 BUG (base): no-opt save throws on boot (TypeError reading group) and #app stays empty', r.newErrors.join(' ').indexOf('group') >= 0 && after.appLen === 0, { after, newErrors: r.newErrors });
      } else {
        v('F1.1 FIXED: no-opt save boots clean (opt defaulted, #app rendered, 0 new errors)', r.newErrors.length === 0 && after.appLen > 0 && after.hasOpt === true && after.opt && after.opt.mode === 'card', { after, newErrors: r.newErrors });
      }
      // Restore a good save for the remaining gates.
      await C.eval(`(function(){ var j=JSON.parse(localStorage.getItem('hanvocab.v1')); if(!j.opt) j.opt={mode:'card',dir:'kv',group:'',due:false}; localStorage.setItem('hanvocab.v1', JSON.stringify(j)); })()`);
      await reloadWait(2800);
      r.console = delta();
      return r;
    });

    // ============ F2: stale harvest-quiz div (duplicate id) ============
    await step('F2-stale-harvest-quiz', async () => {
      const r = {};
      await freshGuest();
      const prep = await C.eval(`(function(){
        var e=window.__v15.en15();
        e.farm.harvests=2; e.farm.plots=[{wordId:'',water:0,planted:0},{wordId:'',water:0,planted:0},{wordId:'',water:0,planted:0},{wordId:'',water:0,planted:0},{wordId:'',water:0,planted:0},{wordId:'',water:0,planted:0}];
        var w=window.__v15.words.filter(function(x){ return !(window.__v15.enOld().box[x.id]); })[0];
        e.farm.plots[0]={wordId:w.id, water:0, planted:Date.now()};
        save();
        return {wordId:w.id};
      })()`);
      r.prep = prep;
      const grown = await C.eval(`(function(){
        var w=window.__v15.words.filter(function(x){ return x.id===${JSON.stringify(prep.wordId)}; })[0];
        for(var i=0;i<4;i++) window.__v15.mark15(true, w, 'mc');
        return {box: window.__v15.enOld().box[w.id], water: window.__v15.en15().farm.plots[0].water};
      })()`);
      r.grown = grown;
      v('F2.0 crop grown to box 4', grown.box === 4 && grown.water >= 2, grown);
      await C.eval(`(function(){ window.__v15.choose('en'); window.__v15.tab('farm'); })()`);
      await sleep(900);
      // Correct harvest on plot 0, then IMMEDIATELY (inside the 1200 ms
      // cleanup window) tap a second ripe crop on plot 1 and answer wrong.
      const seq = await C.eval(`(function(){
        var out={};
        window.__v15.farmPlotTap(0);
        var wid=window.__v15.en15().farm.plots[0].wordId;
        window.__v15.farmQuizPick(wid);
        out.afterCorrect={divs:document.querySelectorAll('#v15farmquiz').length, harvests:window.__v15.en15().farm.harvests, plotCleared:window.__v15.en15().farm.plots[0].wordId===''};
        var e=window.__v15.en15();
        var w=window.__v15.words.filter(function(x){ return !(window.__v15.enOld().box[x.id]); })[0];
        e.farm.plots[1]={wordId:w.id, water:2, planted:Date.now()};
        for(var i=0;i<4;i++) window.__v15.mark15(true, w, 'mc');
        window.__v15.farmPlotTap(1);
        out.afterSecondTap={divs:document.querySelectorAll('#v15farmquiz').length, html:(document.getElementById('v15farmquiz')?String(document.getElementById('v15farmquiz').innerHTML||'').slice(0,60):null)};
        var wrongId=window.__v15.words.filter(function(x){ return x.id!==w.id; })[0].id;
        window.__v15.farmQuizPick(wrongId);
        out.afterWrong={divs:document.querySelectorAll('#v15farmquiz').length, box:window.__v15.enOld().box[w.id]};
        var q=document.getElementById('v15farmquiz'); if(q) q.remove();
        out.afterRemove={divs:document.querySelectorAll('#v15farmquiz').length, stillThere:!!document.getElementById('v15farmquiz'), html:(document.getElementById('v15farmquiz')?String(document.getElementById('v15farmquiz').innerHTML||'').slice(0,60):null)};
        return out;
      })()`);
      r.seq = seq;
      await shot('F2-after-remove');
      v('F2.1 correct harvest works (harvests 2->3, plot cleared)', seq.afterCorrect.harvests === 3 && seq.afterCorrect.plotCleared === true, seq.afterCorrect);
      if (!FIXED) {
        v('F2.2 BUG (base): second tap creates a SECOND #v15farmquiz div (duplicate id)', seq.afterSecondTap.divs === 2, seq.afterSecondTap);
        v('F2.3 BUG (base): removing the new div resurfaces the STALE dog card', seq.afterRemove.stillThere === true && seq.afterRemove.divs === 1 && (seq.afterRemove.html || '').indexOf('Thu hoạch') >= 0, seq.afterRemove);
      } else {
        v('F2.2 FIXED: second tap reuses a single #v15farmquiz div', seq.afterSecondTap.divs === 1, seq.afterSecondTap);
        v('F2.3 FIXED: removing the quiz div leaves no stale card behind', seq.afterRemove.stillThere === false && seq.afterRemove.divs === 0, seq.afterRemove);
      }
      r.console = delta();
      return r;
    });


    // ============ F3: pre-restore snapshot misses the debounced save ============
    await step('F3-snapshot-misses-debounce', async () => {
      const r = {};
      await freshGuest();
      // Stored xp 777 (flushed), then a dirty in-memory change to 8888
      // + save() (debounced 800 ms) and an IMMEDIATE import in the same
      // eval, so the debounce has not fired when importFile snapshots.
      await C.eval(`(function(){ S.xp=777; save(); })()`);
      await sleep(1500);
      const stored777 = await C.eval(`(function(){ try{ return JSON.parse(localStorage.getItem('hanvocab.v1')).xp; }catch(e){ return 'ERR:'+e; } })()`);
      r.stored777 = stored777;
      v('F3.0 stored xp is 777 after flush', stored777 === 777, stored777);
      const imp = await C.eval(`(function(){
        var out={};
        try{
          S.xp=8888; save();
          var j=JSON.parse(localStorage.getItem('hanvocab.v1'));
          j.xp=1111;
          var f=new File([JSON.stringify(j)], 'save.json', {type:'application/json'});
          window.__v20.importFile({files:[f]});
          out.called=true;
        }catch(e){ out.err=String(e); }
        return out;
      })()`);
      r.importCall = imp;
      await sleep(3500); // confirm auto-accepted, import writes + reloads
      const after = await C.eval(`(function(){ try{
        var keys=[]; for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k&&k.indexOf('preimport')>=0) keys.push(k); }
        var snap=null, snapXp=null;
        if(keys.length){ snap=keys[keys.length-1]; try{ snapXp=JSON.parse(localStorage.getItem(snap)).xp; }catch(e){ snapXp='ERR:'+e; } }
        return {xp: S.xp, storedXp: JSON.parse(localStorage.getItem('hanvocab.v1')).xp, snapKey: snap, snapXp: snapXp, nSnaps: keys.length};
      }catch(e){ return 'ERR:'+e; } })()`);
      r.after = after;
      v('F3.1 import lands (xp 1111)', after.storedXp === 1111 && after.xp === 1111, after);
      if (!FIXED) {
        v('F3.2 BUG (base): pre-restore snapshot holds the STALE 777, not the dirty 8888', after.snapXp === 777, after);
      } else {
        v('F3.2 FIXED: pre-restore snapshot holds the dirty 8888', after.snapXp === 8888, after);
      }
      r.console = delta();
      return r;
    });

    // ============ F4: raw row counts + deduped counts ============
    await step('F4-raw-row-counts', async () => {
      const r = {};
      const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf-8');
      const a1a2 = JSON.parse(fs.readFileSync(path.join(DIR, 'v17_a1a2.json'), 'utf-8'));
      const ox = JSON.parse(fs.readFileSync(path.join(DIR, 'v17_oxford.json'), 'utf-8'));
      const dataA1 = JSON.parse(fs.readFileSync('/home/hatch/workspace/v7build/data/v17_a1a2.json', 'utf-8'));
      const dataOx = JSON.parse(fs.readFileSync('/home/hatch/workspace/v7build/data/v17_oxford.json', 'utf-8'));
      r.counts = {
        inlineA1: (html.match(/"src": "a1a2"/g) || []).length,
        inlineOx: (html.match(/"src": "oxford"/g) || []).length,
        outA1: a1a2.length, outOx: ox.length, dataA1: dataA1.length, dataOx: dataOx.length,
        airplane864: (html.match(/"no": 864\}/g) || []).length,
        eachOther942: (html.match(/"ord": 942/g) || []).length,
      };
      const rt = await C.eval(`(function(){ try{
        window.__v15.buildWords();
        var words=window.__v15.words;
        var uniq=function(a){ var s={}; a.forEach(function(w){ s[w.en]=1; }); return Object.keys(s).length; };
        var a1=words.filter(function(w){ return w.src==='a1a2'; });
        var oxf=words.filter(function(w){ return w.src==='oxford'; });
        var veh=words.filter(function(w){ return w.t==='a1_vehicles'; });
        var l38=words.filter(function(w){ return w.src==='oxford'&&w.lesson===38; });
        return {a1raw:a1.length, a1uniq:uniq(a1), oxRaw:oxf.length, oxUniq:uniq(oxf), veh:veh.length, vehUniq:uniq(veh), l38:l38.length, l38Uniq:uniq(l38)};
      }catch(e){ return 'ERR:'+e; } })()`);
      r.runtime = rt;
      if (!FIXED) {
        v('F4.0 BUG (base): raw A1-A2 rows 1000 (airplane x2), Oxford 3396 (each other x2)', r.counts.inlineA1 === 1000 && r.counts.inlineOx === 3396 && r.counts.outA1 === 1000 && r.counts.outOx === 3396 && r.counts.dataA1 === 1000 && r.counts.dataOx === 3396, r.counts);
      } else {
        v('F4.0 FIXED: raw A1-A2 rows 999, Oxford 3395, in every copy', r.counts.inlineA1 === 999 && r.counts.inlineOx === 3395 && r.counts.outA1 === 999 && r.counts.outOx === 3395 && r.counts.dataA1 === 999 && r.counts.dataOx === 3395, r.counts);
        v('F4.1 FIXED: dropped rows gone from the inline block (no 864 / ord 942)', r.counts.airplane864 === 0 && r.counts.eachOther942 === 0, r.counts);
      }
      v('F4.2 deduped WORDS unchanged (A1-A2 unique 995, Oxford unique 3393, VEHICLES 23, Oxford L38 24)', rt.a1uniq === 995 && rt.oxUniq === 3393 && rt.veh === 23 && rt.l38 === 24, rt);
      r.console = delta();
      return r;
    });

    // ============ NAV: bottom-nav label overlap at 360px and 390px ============
    await step('NAV-bottom-nav-overlap', async () => {
      const r = {};
      for (const w of [360, 390]) {
        await C.send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 2, mobile: true });
        await freshGuest();
        await sleep(600);
        const m = await C.eval(`(function(){
          var tabs=[].slice.call(document.querySelectorAll('#tabs .tab'));
          var labels=tabs.map(function(b){
            var spans=b.querySelectorAll('span'); var lab=spans[spans.length-1];
            var rc=lab.getBoundingClientRect(); var brc=b.getBoundingClientRect();
            return {text:(lab.textContent||'').trim(), x0:Math.round(rc.left), x1:Math.round(rc.right), y:Math.round(rc.top), h:Math.round(brc.height)};
          });
          var overlaps=[];
          for(var i=0;i<labels.length;i++) for(var j=i+1;j<labels.length;j++){
            if(Math.abs(labels[i].y-labels[j].y)<=10 && labels[i].x1>labels[j].x0 && labels[j].x1>labels[i].x0)
              overlaps.push(labels[i].text+'~'+labels[j].text+' by '+Math.round(Math.min(labels[i].x1,labels[j].x1)-Math.max(labels[i].x0,labels[j].x0))+'px');
          }
          return {n:tabs.length, labels:labels, overlaps:overlaps, minH:Math.min.apply(null, labels.map(function(l){return l.h}))};
        })()`);
        r['w' + w] = m;
        await shot('nav-' + w);
        if (!FIXED) {
          v(`NAV.${w} BUG (base): labels overlap at ${w}px`, m.overlaps.length >= 1, m.overlaps);
        } else {
          v(`NAV.${w} FIXED: no label overlaps at ${w}px, all buttons >=44px tall`, m.overlaps.length === 0 && m.minH >= 44, m);
        }
      }
      await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      r.console = delta();
      return r;
    });

    // ============ U2: team-skill HP/shield paint lag (expected: none) ============
    await step('U2-skill-paint-lag', async () => {
      const r = {};
      await freshGuest();
      await seedFights();
      await C.eval(`(function(){ try{ window.__v18.openArena('en'); window.__v18.fight('v10_panda','en'); }catch(e){} })()`);
      await sleep(800);
      const lag = await C.eval(`(function(){ try{
        var F=window.__v18._test.F(); if(!F) return {ok:false, why:'no F'};
        var before=document.querySelector('#v18fight').innerHTML.match(/HP (\\d+)\\/(\\d+)/);
        F.pet.energy=10;
        document.querySelector('#v18fight .v23bf-skill').click();
        var paintedNow=document.querySelector('#v18fight').innerHTML.match(/HP (\\d+)\\/(\\d+)/);
        var F2=window.__v18._test.F();
        return {before:before?before[0]:null, paintedNow:paintedNow?paintedNow[0]:null, stateHp:F2.hp, stateShield:F2.shield,
          paintedHp:paintedNow?parseInt(paintedNow[1],10):null, paintedShield:(function(){var m=document.querySelector('#v18fight').innerHTML.match(/Lá chắn: (\\d+)/); return m?parseInt(m[1],10):null})()};
      }catch(e){ return {ok:false, err:String(e)}; } })()`);
      r.lag = lag;
      await sleep(300);
      const lag2 = await C.eval(`(function(){ var F=window.__v18._test.F(); var m=document.querySelector('#v18fight').innerHTML.match(/HP (\\d+)\\/(\\d+)/); return {painted:m?m[0]:null, stateHp:F?F.hp:null}; })()`);
      r.lagAfter300 = lag2;
      v('U2.0 HP/shield numbers on screen update synchronously with the team skill (no lag)', lag.paintedHp === lag.stateHp && lag.paintedShield === lag.stateShield, lag);
      v('U2.1 painted HP still matches state 300 ms later', lag2.painted === ('HP ' + lag2.stateHp + '/' + (lag.before ? lag.before.split('/')[1] : '?')), lag2);
      r.console = delta();
      return r;
    });

    results.summary = { allOk, failedVerdicts, console: delta() };
    note(`\nrepro-v41 (${MODE}): ${allOk ? 'ALL VERDICTS PASS' : 'FAILURES: ' + failedVerdicts.join(', ')}`);
    note('console delta (whole run):', JSON.stringify(delta()));
    saveResults();
    try { if (chromeProc) chromeProc.kill(); } catch (e) {}
    try { if (httpProc) httpProc.kill(); } catch (e) {}
    process.exit(allOk ? 0 : 1);
  } catch (e) {
    console.error('repro-v41 crashed:', e);
    try { if (chromeProc) chromeProc.kill(); } catch (e2) {}
    try { if (httpProc) httpProc.kill(); } catch (e2) {}
    process.exit(2);
  }
}
main();
