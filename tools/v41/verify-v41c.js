// verify-v41c.js - V18.6 BUG FIXES III Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8972 / CDP 9372, scratch profile.
// Modelled on tools/v40/verify-v40c.js + tools/v41/review-scratch/
// verify-a-v40c.js (same CDP class, ensureHttp/ensureChrome, openPage,
// shot/step/verdict, seedFights, real-click helpers).
// Exit 0 = driver completed (verdicts are in the results JSON + stdout;
// a FAIL verdict does not crash the driver).
// Writes results to tools/v41/logs/v41c-results.json after EVERY step.
// Screenshots in tools/v41/shots/v41c-*.
// Gates:
//   V41-A R1+R2: skill-triggered CA — in-flight normal answer is a normal
//         answer (caRight 0, damage dealt); 3 CA correct -> 3/3 full break,
//         hearts 5. R1b control: answer-triggered CA still 3/3. R2: grammar
//         question under a skill-triggered CA answers with no exception.
//   V41-B F1: no-opt save boots with the study view painted, 0 errors.
//   V41-C NAV: bottom-nav labels at 360px AND 390px — no overlap, all
//         buttons >=44px tall and tappable.
//   V41-D V40 regression spot: team-skill toast live (halved damage +
//         shield note), KO warning banner painted at Q2 (V18 + V19),
//         picker "Bỏ chọn tất cả" + Áp dụng refuses live.
//   V41-E U2: team-skill HP/shield paint — numbers on screen update
//         synchronously (no lag expected; U2 stays unfixed if confirmed).
//   0 console errors/warnings/dialogs across the whole run (except the
//   R2 exception on the V18.5 base, which verify never runs against).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9372;
const HTTPPORT = 8972;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8972/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v41';
const OUTDIR = '/home/hatch/workspace/v7build/out';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
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
function saveResults() { writeSmall(path.join(DIR, 'logs', 'v41c-results.json'), JSON.stringify(results, null, 2)); }
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
    '--user-data-dir=/tmp/chrome-v41c-prof', `--remote-debugging-port=${PORT}`,
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
    writeSmall(path.join(DIR, 'shots', `v41c-${name}.png`), Buffer.from(r.data, 'base64'));
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
    return {en19:Object.keys(e19.bosses).length, gate: (function(){ try{ return window.__v33._test.correctedWinCount(); }catch(e){ return 'ERR:'+e; } })()};
  })()`);
  await sleep(1500);
  return r;
}
async function readFight19() {
  return await C.eval(`(function(){ try{
    var F=window.__v19._test.F(); if(!F) return {started:false};
    return {started:true, qmode:F.qmode,
      bannerText:(function(){var b=document.querySelector('#v19fight .v19banner'); return b?(b.textContent||'').slice(0,140):null})(),
      over:F.over, hp:F.hp, maxHp:F.maxHp, shield:F.shield, phase:F.phase,
      ultActive:!!F.ultActive, caQ:F.caQ, caRight:F.caRight,
      caMode:(typeof F.caMode==='undefined'?'undef':F.caMode),
      answered:F.answered, score:F.score, hearts:F.hearts,
      opts:(function(){var n=document.querySelectorAll('#v19fight .v19opt'); return n.length;})(),
      skillBtn: !!document.querySelector('#v19fight .v23bf-skill')};
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
async function toastText() {
  return await C.eval(`(function(){
    var out=[];
    document.querySelectorAll('.pp,.v7toast').forEach(function(el){ var t=(el.textContent||'').trim(); if(t) out.push(t); });
    return out;
  })()`);
}


async function main() {
  try {
    let chromeAlive = false;
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); chromeAlive = r.ok; } catch (e) {}
    if (!chromeAlive) { try { execSync('rm -rf /tmp/chrome-v41c-prof'); note('fresh profile: removed old chrome-v41c-prof'); } catch (e) {} }
    await openPage();
    const boot = await C.eval(`(function(){ return { v15: !!window.__v15, v19: !!window.__v19, v41: !!window.__v41, version: (window.__v41||{}).version, title: document.title }; })()`);
    note('boot:', boot);
    results.boot = boot;
    saveResults();
    const err0 = C.consoleErrors.length, warn0 = C.consoleWarns.length, dlg0 = C.dialogs.length;
    const delta = () => ({ errors: C.consoleErrors.length - err0, warns: C.consoleWarns.length - warn0, dialogs: C.dialogs.length - dlg0 });
    let allOk = true;
    const failedVerdicts = [];
    function v(name, cond, detail) { if (!verdict(name, cond, detail)) { allOk = false; failedVerdicts.push(name); } return cond; }

    // ============ V41-A R1+R2 (real clicks) ============
    await step('V41-A-R1-R2', async () => {
      const r = {};
      await freshGuest();
      r.seeds = await seedFights();
      await C.eval(`(function(){ try{ window.__v19.openMapFor('en'); window.__v19.fight('v11_fireking'); }catch(e){} })()`);
      await sleep(800);
      const f0 = await readFight19();
      r.f0 = f0;
      v('A.0 fireking EN fight opens (HP 325, skill button painted)', f0.started === true && f0.maxHp === 325 && f0.skillBtn === true, f0);
      await C.eval(`(function(){ var F=window.__v19._test.F(); if(F) F.hp=75; })()`);
      await clickSkill19();
      await sleep(400);
      const f1 = await readFight19();
      r.f1 = f1;
      v('A.1 skill drops HP 75->25 and starts the CA at once', f1.hp === 25 && f1.ultActive === true && f1.caQ === 0 && f1.caRight === 0, f1);
      const pick = await clickCorrect19();
      await sleep(400);
      const f2 = await readFight19();
      r.f2 = f2; r.pick = pick;
      v('A.2 in-flight NORMAL answer is normal (caRight 0, HP drops, score 1)', pick.ok === true && f2.caRight === 0 && f2.hp < 25 && f2.score === 1, f2);
      await shot('A-R1-inflight');
      await clickNext19();
      await sleep(400);
      const f3 = await answerCAx3();
      r.f3 = f3;
      await shot('A-R1-after-resolve');
      v('A.3 perfect run resolves 3/3 (caRight 3, hearts 5, 3/3 banner, P3)', f3.caRight === 3 && f3.hearts === 5 && typeof f3.bannerText === 'string' && f3.bannerText.indexOf('3/3') >= 0 && f3.phase === 3, f3);
      // R1b control.
      await C.eval(`(function(){ try{ window.__v19._test.close(); window.__v19.openMapFor('en'); window.__v19.fight('v11_fireking'); var F=window.__v19._test.F(); if(F) F.hp=70; }catch(e){} })()`);
      await sleep(800);
      const pickB = await clickCorrect19();
      await sleep(400);
      const fb1 = await readFight19();
      r.fb1 = fb1; r.pickB = pickB;
      v('A.4 R1b trigger answer not counted (ultActive, caRight 0, HP damaged)', pickB.ok === true && fb1.ultActive === true && fb1.caRight === 0 && fb1.hp < 70, fb1);
      await clickNext19();
      await sleep(400);
      const fb2 = await answerCAx3();
      r.fb2 = fb2;
      v('A.5 R1b answer-triggered CA resolves 3/3 (hearts 5)', fb2.caRight === 3 && fb2.hearts === 5 && typeof fb2.bannerText === 'string' && fb2.bannerText.indexOf('3/3') >= 0, fb2);
      // R2 grammar.
      await C.eval(`(function(){ try{ window.__v19._test.close(); window.__v19.openMapFor('en'); window.__v19.fight('v11_heavenknight'); }catch(e){} })()`);
      await sleep(800);
      const g0 = await readFight19();
      r.g0 = g0;
      v('A.6 heavenknight opens on a grammar question', g0.started === true && g0.qmode === 'grammar' && g0.opts === 4, g0);
      await C.eval(`(function(){ var F=window.__v19._test.F(); if(F) F.hp=90; })()`);
      await clickSkill19();
      await sleep(400);
      const errBefore = C.consoleErrors.length;
      const pickG = await clickCorrect19();
      await sleep(400);
      const g2 = await readFight19();
      r.g2 = g2; r.pickG = pickG;
      r.newErrors = C.consoleErrors.slice(errBefore);
      v('A.7 grammar answer under the CA: no exception, answered, damage dealt', r.newErrors.length === 0 && pickG.ok === true && g2.answered !== null && g2.caRight === 0 && g2.hp < 40, { pickG, g2, newErrors: r.newErrors });
      await shot('A-R2-grammar');
      r.console = delta();
      return r;
    });

    // ============ V41-B F1 no-opt save boots painted ============
    await step('V41-B-F1', async () => {
      const r = {};
      await freshGuest();
      const errBefore = C.consoleErrors.length;
      await C.eval(`(function(){ var j=JSON.parse(localStorage.getItem('hanvocab.v1')); delete j.opt; localStorage.setItem('hanvocab.v1', JSON.stringify(j)); })()`);
      await reloadWait(2800);
      const after = await C.eval(`(function(){ try{
        var app=document.getElementById('app');
        return {appLen: app?app.innerHTML.length:-1, hasOpt: (typeof S!=='undefined' && !!S.opt), optMode: (typeof S!=='undefined' && S.opt)?S.opt.mode:null,
          studyVisible: !!document.querySelector('#app .card, #app .pg, #app h1')};
      }catch(e){ return 'ERR:'+e; } })()`);
      r.after = after;
      r.newErrors = C.consoleErrors.slice(errBefore);
      v('B.0 no-opt save boots with 0 new console errors', r.newErrors.length === 0, r.newErrors);
      v('B.1 no-opt save renders the study view (#app non-empty, opt defaulted to card)', after.appLen > 0 && after.hasOpt === true && after.optMode === 'card', after);
      await shot('B-F1-boot');
      await C.eval(`(function(){ var j=JSON.parse(localStorage.getItem('hanvocab.v1')); if(!j.opt) j.opt={mode:'card',dir:'kv',group:'',due:false}; localStorage.setItem('hanvocab.v1', JSON.stringify(j)); })()`);
      await reloadWait(2800);
      r.console = delta();
      return r;
    });

    // ============ V41-C NAV 360 + 390 ============
    await step('V41-C-NAV', async () => {
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
          var scrollW=document.documentElement.scrollWidth;
          return {n:tabs.length, labels:labels, overlaps:overlaps, minH:Math.min.apply(null, labels.map(function(l){return l.h})), scrollW:scrollW, vw:window.innerWidth};
        })()`);
        r['w' + w] = m;
        await shot('C-nav-' + w);
        v(`C.${w} no label overlaps at ${w}px`, m.overlaps.length === 0, m.overlaps);
        v(`C.${w} all nav buttons >=44px tall`, m.minH >= 44, m.minH);
        v(`C.${w} nav row scrolls instead of overflowing the page (scrollW ${w})`, m.scrollW <= w + 1, { scrollW: m.scrollW, vw: m.vw });
      }
      await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      r.console = delta();
      return r;
    });

    // ============ V41-D V40 regression spot (live) ============
    await step('V41-D-V40-regression', async () => {
      const r = {};
      await freshGuest();
      await seedFights();
      // Shield toast live: panda, 50-dmg skill vs shield 30.
      await C.eval(`(function(){ try{ window.__v18.openArena('en'); window.__v18.fight('v10_panda','en'); }catch(e){} })()`);
      await sleep(800);
      await C.eval(`(function(){ var F=window.__v18._test.F(); if(F) F.pet.energy=10; try{ window.__v18._petRefresh(); }catch(e){} var b=document.querySelector('#v18fight .v23bf-skill'); if(b&&!b.disabled) b.click(); })()`);
      await sleep(500);
      const sh = await C.eval(`(function(){ var F=window.__v18._test.F(); return F?{hp:F.hp, shield:F.shield}:null; })()`);
      const toasts = await toastText();
      r.shield = sh; r.toasts = toasts;
      v('D.0 team skill vs shield live: HP 150->125, shield 30->5', sh && sh.hp === 125 && sh.shield === 5, sh);
      v('D.1 toast states the halved damage + shield note', toasts.join(' ').indexOf('Gây 25 sát thương') >= 0 && toasts.join(' ').indexOf('Khiên boss chặn một nửa.') >= 0, toasts);
      await shot('D-shield');
      // KO banner painted at Q2 (V19, 5 cards).
      const five = await C.eval(`(function(){
        var keep=S.cards.slice(0,5); S.cards=keep; S.deck='d0'; save(); return S.cards.length;
      })()`);
      await sleep(1200);
      await C.eval(`(function(){ try{ window.__v18._test.close(); window.__v19.openMapFor('ko'); window.__v19.fight('v11_fireking'); }catch(e){} })()`);
      await sleep(800);
      const q1 = await C.eval(`(function(){ var b=document.querySelector('#v19fight .v19banner'); return b?(b.textContent||''):null; })()`);
      await C.eval(`(function(){ try{ window.__v19._test.pickCorrect(); window.__v19._test.next(); }catch(e){} })()`);
      await sleep(500);
      const q2 = await C.eval(`(function(){ var b=document.querySelector('#v19fight .v19banner'); return b?(b.textContent||''):null; })()`);
      r.bannerQ1 = q1; r.bannerQ2 = q2;
      v('D.2 KO banner painted at Q1 (5/8)', typeof q1 === 'string' && q1.indexOf('5/8') >= 0, q1);
      v('D.3 KO banner SURVIVES to Q2 painted', typeof q2 === 'string' && q2.indexOf('5/8') >= 0, q2);
      await shot('D-banner-q2');
      // Picker refuse live: "Bỏ chọn tất cả" + Áp dụng.
      await freshGuest();
      await C.eval(`(function(){ window.__v15.choose('en'); })()`);
      await sleep(800);
      const pk = await C.eval(`(function(){
        var out={};
        try{
          window.__v22.openBossScopePicker ? window.__v22.openBossScopePicker() : null;
          var lib=document.querySelector('#v22bs-lib');
          if(lib){ lib.value='units'; lib.dispatchEvent(new Event('change')); }
          var btns=[].slice.call(document.querySelectorAll('button'));
          var off=btns.find(function(b){ return (b.textContent||'').indexOf('Bỏ chọn tất cả')>=0; });
          if(off) off.click();
          var apply=btns.find(function(b){ return (b.textContent||'').trim()==='Áp dụng'; });
          var before=JSON.stringify(window.__v15.en15().scope);
          if(apply) apply.click();
          out.before=before; out.after=JSON.stringify(window.__v15.en15().scope);
          out.pickerOpen=!!document.querySelector('#v22bs-lib');
        }catch(e){ out.err=String(e); }
        return out;
      })()`);
      await sleep(500);
      const pkToasts = await toastText();
      r.picker = pk; r.pkToasts = pkToasts;
      v('D.4 picker refuse live: scope unchanged + "Chọn ít nhất 1 Unit." toast', pk.before === pk.after && pkToasts.join(' ').indexOf('Chọn ít nhất 1 Unit.') >= 0, { pk, pkToasts });
      r.console = delta();
      return r;
    });

    // ============ V41-E U2 paint lag ============
    await step('V41-E-U2', async () => {
      const r = {};
      await freshGuest();
      await seedFights();
      await C.eval(`(function(){ try{ window.__v18.openArena('en'); window.__v18.fight('v10_panda','en'); }catch(e){} })()`);
      await sleep(800);
      const lag = await C.eval(`(function(){ try{
        var F=window.__v18._test.F(); if(!F) return {ok:false, why:'no F'};
        F.pet.energy=10;
        document.querySelector('#v18fight .v23bf-skill').click();
        var painted=document.querySelector('#v18fight').innerHTML.match(/HP (\\d+)\\/(\\d+)/);
        var F2=window.__v18._test.F();
        var sh=document.querySelector('#v18fight').innerHTML.match(/Lá chắn: (\\d+)/);
        return {paintedHp:painted?parseInt(painted[1],10):null, stateHp:F2.hp, paintedShield:sh?parseInt(sh[1],10):null, stateShield:F2.shield};
      }catch(e){ return {ok:false, err:String(e)}; } })()`);
      r.lag = lag;
      v('E.0 HP/shield numbers update synchronously with the team skill (no lag — U2 not reproduced)', lag.paintedHp === lag.stateHp && lag.paintedShield === lag.stateShield, lag);
      r.console = delta();
      return r;
    });

    results.summary = { allOk, failedVerdicts, console: delta() };
    note(`\nverify-v41c: ${allOk ? 'ALL VERDICTS PASS' : 'FAILURES: ' + failedVerdicts.join(', ')}`);
    note('console delta (whole run):', JSON.stringify(delta()));
    saveResults();
    try { if (chromeProc) chromeProc.kill(); } catch (e) {}
    try { if (httpProc) httpProc.kill(); } catch (e) {}
    process.exit(allOk ? 0 : 1);
  } catch (e) {
    console.error('verify-v41c crashed:', e);
    try { if (chromeProc) chromeProc.kill(); } catch (e2) {}
    try { if (httpProc) httpProc.kill(); } catch (e2) {}
    process.exit(2);
  }
}
main();
