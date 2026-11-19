// verify-v36c.js — V18.1 BUG FIXES Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8952 / CDP 9353, scratch profile.
// Modelled on tools/v35/verify-v35c.js (same CDP class, freshSeed,
// readSave, shot helpers). Exit 0 = driver completed (verdicts are in
// the results JSON + stdout; a FAIL verdict does not crash the driver).
// The driver spawns its own HTTP server for out/ on 8952 and kills it
// on exit (v34c required a pre-running server; this one is self-contained).
// Writes results to tools/v35/logs/v35c-results.json after EVERY step
// (best-effort: EPERM waves may block a write; stdout always carries
// the verdicts).
// Gates: V36-A F-06 layering (Smart 1600 above modals, toast 1700 above Smart);
// V36-B M1 filter-row overflow at 360px + M2 touch targets >=44px;
// V36-C V17-2 live lethal team-skill fight (win once, no double pay);
// V36-D F13 live partial session (plan + quest, no bonus when abandoned);
// V36-E F09 no duplicate ids in the live DOM + F10 Escape listener;
// V36-F V17-1 avatar thresholds (summarizeSave) + V17-3 speak mode renders;
// V36-G V18.0 regression spot-check (gates, BREAK clamp, console errors 0).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9353;
const HTTPPORT = 8952;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8952/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v36';
const OUTDIR = '/home/hatch/workspace/v7build/out';
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
    '--user-data-dir=/tmp/chrome-v36c-prof', `--remote-debugging-port=${PORT}`,
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
  await ensureHttp();
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
    // B-36-3 (driver bug, inherited from verify-v35c.js): writeSmall()
    // re-encodes its input as UTF-8, which corrupts binary PNG bytes.
    // Screenshots must be written as a raw Buffer, not via writeSmall.
    if (r.data) fs.writeFileSync(path.join(DIR, 'shots', name + '.png'), Buffer.from(r.data, 'base64'));
  } catch (e) { note('shot failed', name, String(e).slice(0, 120)); }
}
// Seed a fresh save with exactly n15/n18flat/n19 boss wins (V33-local
// corrected count) + xp/gems, then reload so the game boots on it.
// golemEn adds a GEAR GOLEM win in EN (opens the Skyroot gate in EN);
// skyEn adds Skyroot wins in EN (array of v18_* ids).
function winsMutator(n15, n18, n19, xp, gems, golemEn, skyEn) {
  const sky = JSON.stringify(skyEn || []);
  return `S0.xp=${xp}; S0.v7=S0.v7||{}; S0.v7.gems=${gems};
    S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.bosses={}; for(var i=0;i<${n15};i++) S0.v7.en15.bosses['old'+i]={win:1};
    S0.v7.en18=S0.v7.en18||{}; S0.v7.en18.bosses={}; for(var i=0;i<${n18};i++) S0.v7.en18.bosses['v10_'+i]={win:1,wins:1};
    S0.v7.en19=S0.v7.en19||{bosses:{},titles:[],zoneClaimed:{},koStats:{right:0,wrong:0}}; S0.v7.en19.bosses={}; for(var i=0;i<${n19};i++) S0.v7.en19.bosses['v11_'+i]={en:{win:1,wins:1,stars:2,best:2}};
    if(${golemEn ? 'true' : 'false'}) S0.v7.en19.bosses['v17_geargolem']={en:{win:1,wins:1,stars:3,best:3}};
    ${sky}.forEach(function(id){ S0.v7.en19.bosses[id]={en:{win:1,wins:1,stars:3,best:3}}; });
    S0.v7.en15.langChoice=true; S0.v7.en15.lang='en';`;
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
      en17claimed: S0.v7&&S0.v7.en17?S0.v7.en17.claimed:null,
      en35: S0.v7&&S0.v7.en35?{quests:Object.keys(S0.v7.en35.quests||{}), region:S0.v7.en35.regionClaimed}:null,
      skyrootWins: (function(){var b=S0.v7&&S0.v7.en19&&S0.v7.en19.bosses||{};var n=0;for(var k in b) if(k.indexOf('v18_')===0&&b[k]&&b[k].en&&b[k].en.win) n++; return n})(),
      golemEn: !!(S0.v7&&S0.v7.en19&&S0.v7.en19.bosses&&S0.v7.en19.bosses['v17_geargolem']&&S0.v7.en19.bosses['v17_geargolem'].en&&S0.v7.en19.bosses['v17_geargolem'].en.win),
      en27sessions: ((S0.v7&&S0.v7.en27&&S0.v7.en27.sessions)||[]).length,
      pets: Object.keys((S0.v7&&S0.v7.en23&&S0.v7.en23.pets)||{}).length,
      mem:mem, v7keys:S0.v7?Object.keys(S0.v7):[] };
  }catch(e){ return {err:String(e)} } })()`);
}
const R = {};
async function step(name, fn) {
  try { const v = await fn(); R[name] = v; note('## ' + name, JSON.stringify(v).slice(0, 3500)); }
  catch (e) { R[name] = { ERROR: String(e).slice(0, 500) }; note('## ' + name + ' ERROR', String(e).slice(0, 500)); }
  writeSmall(path.join(DIR, 'logs', 'v36c-results.json'), JSON.stringify(R, null, 2));
}
function cleanup() {
  try { if (C) C.close(); } catch (e) {}
  try { if (chromeProc) chromeProc.kill('SIGTERM'); } catch (e) {}
  try { if (httpProc) httpProc.kill('SIGTERM'); } catch (e) {}
}

(async () => {
  await openPage();
  const boot = await C.eval(`(function(){return {href:location.href, title:document.title, hasV15:!!window.__v15, hasV17:!!window.__v17, hasV18:!!window.__v18, hasV19:!!window.__v19, hasV27:!!window.__v27, hasV33:!!window.__v33, hasV34:!!window.__v34, hasV35:!!window.__v35, v35: window.__v35?window.__v35.version:null, v34: window.__v34?window.__v34.version:null, hasV36:!!window.__v36, v36: window.__v36?window.__v36.version:null, v36wrapped: window.__v36?window.__v36.wrapped:null, hasV35data:!!window.__V35_DATA, skyrootWords: window.__v17?window.__v17.skyrootWords().length:null, totalBosses: window.__v21?window.__v21.TOTAL_BOSSES:null, configured: window.__v20sync?__v20sync.configured():null, xp: (function(){try{return S.xp}catch(e){return 'no-S'}})() }})()`);
  note('BOOT', JSON.stringify(boot));
  await step('boot', async () => boot);

  // ============ V36-A — F-06 layering (Smart 1600 / toasts 1700) ============
  await step('V36-A-layering', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10, true, []));
    const r = await C.eval(`(async()=>{ try{
      var out={};
      // v36 style rules present in the live page
      var st=document.querySelector('style#v36');
      var css=st?st.textContent:'';
      out.styleHas1600=css.indexOf('#v27hub{z-index:1600')>=0;
      out.styleHas1700=css.indexOf('#v23toast{z-index:1700')>=0;
      out.styleHasPp=css.indexOf('.pp{z-index:1700')>=0;
      out.styleHasV7toast=css.indexOf('.v7toast{z-index:1700')>=0;
      // the modal z-indexes the Smart overlay must beat (read from the
      // live stylesheets, not from a comment)
      var allCss=''; document.querySelectorAll('style').forEach(function(s){ allCss+=s.textContent+'\\n'; });
      out.v15modalZ=(allCss.match(/\.v15modal\{[^}]*z-index:([0-9]+)/)||[])[1]||null;
      out.v20modalZ=(allCss.match(/\.v20modal\{[^}]*z-index:([0-9]+)/)||[])[1]||null;
      out.accountZ=(allCss.match(/#v21account\{[^}]*z-index:([0-9]+)/)||[])[1]||null;
      // Smart overlay: computed z-index must be 1600
      window.__v27.openSmart('en');
      await new Promise(r=>setTimeout(r,800));
      var hub=document.querySelector('#v27hub');
      out.smartOpen= !!hub && hub.style.display!=='none';
      out.smartZ=getComputedStyle(hub).zIndex;
      // live toast: fire pop15 (the real toast23 path) and read the .pp
      // it creates — it lives only 1100ms, so read it immediately.
      // (B-36-2: the live toast is .pp, not #v23toast.)
      window.__v15.pop15('TEST TOAST 36');
      await new Promise(r=>setTimeout(r,200));
      var pp=document.querySelector('.pp');
      out.ppExists= !!pp;
      out.ppZ= pp?getComputedStyle(pp).zIndex:null;
      out.ppText= pp?pp.textContent.slice(0,30):null;
      // .pp is pointer-events:none, so elementFromPoint skips it by design;
      // the paint order is proven by the computed z-index (1700 > Smart
      // 1600, same body stacking context) + the live screenshot below.
      if(pp){ var rc=pp.getBoundingClientRect(); var el=document.elementFromPoint(rc.left+rc.width/2, rc.top+rc.height/2); out.topAtPp= el?(el.id||el.className||el.tagName):null; out.ppPointerEvents=getComputedStyle(pp).pointerEvents; }
      // Account Center is intentionally above everything (z-9998, by
      // design) — record it, do not assert Smart above it.
      window.__v21.openAccount();
      await new Promise(r=>setTimeout(r,700));
      out.accountOpen= !!document.querySelector('#v21account');
      out.accountZLive= getComputedStyle(document.querySelector('#v21account')).zIndex;
      window.__v21.closeAccount();
      window.__v27.closeSmart();
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v36c-layering');
    // Visual proof: fire a toast while Smart is open and screenshot it
    // immediately (the .pp lives only 1100ms).
    await C.eval(`(function(){ try{ window.__v27.openSmart('en'); window.__v15.pop15('TEST TOAST 36'); }catch(e){} })()`);
    await sleep(250);
    await shot('v36c-toast-live');
    await C.eval(`(function(){ try{ window.__v27.closeSmart(); }catch(e){} })()`);
    return r;
  });

  // ============ V36-B — M1 overflow at 360 + M2 touch targets ============
  await step('V36-B-widths-targets', async () => {
    const widths = {};
    await C.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 844, deviceScaleFactor: 2, mobile: true });
    // M1/M2 live in the LEARN view (.v15filters, pills, selects, back)
    await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('learn'); }catch(e){} })()`);
    await sleep(900);
    widths.w360 = await C.eval(`(function(){ try{
      var de=document.documentElement;
      var hub=document.querySelector('#v15hub');
      var fr=document.querySelector('.v15filters');
      return {innerWidth: window.innerWidth, docScrollW: de.scrollWidth, noDocOverflow: de.scrollWidth<=window.innerWidth,
        hubPresent: !!hub, filtersPresent: !!fr,
        filtersScrollW: fr?fr.scrollWidth:null, filtersClientW: fr?fr.clientWidth:null,
        filtersNoOverflow: fr?fr.scrollWidth<=fr.clientWidth+1:null};
    }catch(e){ return {err:String(e)} } })()`);
    await shot('v36c-learn-360');
    // M2: the six fixed controls (learn view first; .v15back lives in
    // the MODE header, so start a mode to measure it)
    widths.targetsLearn = await C.eval(`(function(){ try{
      function h(sel){ var el=document.querySelector(sel); if(!el) return null; var r=el.getBoundingClientRect(); return Math.round(r.height*10)/10; }
      return {v15x: h('.v15x'), pill: h('.v15pill'), sel: h('.v15learn-head .v15sel')};
    }catch(e){ return {err:String(e)} } })()`);
    await C.eval(`(function(){ try{ window.__v15.startMode('flash'); }catch(e){} })()`);
    await sleep(700);
    widths.targetsMode = await C.eval(`(function(){ try{
      function h(sel){ var el=document.querySelector(sel); if(!el) return null; var r=el.getBoundingClientRect(); return Math.round(r.height*10)/10; }
      return {back: h('.v15back'), modeHeadPresent: !!document.querySelector('.v15mode-head')};
    }catch(e){ return {err:String(e)} } })()`);
    await C.eval(`(function(){ try{ window.__v15.backToLearn(); }catch(e){} })()`);
    await sleep(400);
    // the two Library buttons live in the LIBRARY view header
    await C.eval(`(function(){ try{ window.__v15.openHub('library'); }catch(e){} })()`);
    await sleep(700);
    widths.targetsLibrary = await C.eval(`(function(){ try{
      function h(sel){ var el=document.querySelector(sel); if(!el) return null; var r=el.getBoundingClientRect(); return Math.round(r.height*10)/10; }
      return {lbBtn: h('.v15lb-btn'), lbHub: h('.v15lb-hub')};
    }catch(e){ return {err:String(e)} } })()`);
    await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(400);
    return widths;
  });

  // ============ V36-C — V17-2 live lethal team-skill fight ============
  await step('V36-C-lethal-skill', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10, true, []));
    const r = await C.eval(`(async()=>{ try{
      window.__v19._test.setLang('en');
      window.__v19.fight('v11_fireking');
      await new Promise(r=>setTimeout(r,700));
      var F=window.__v19._test.F();
      var out={fightStarted: !!F, hp0: F?F.hp:null, over0: F?F.over:null};
      var xp0=S.xp||0;
      F.hp=5;
      F.pet={energy:99,active:{type:'dmg',n:'Test Skill'},activeVal:9999,shield:0,shieldMax:0,dmgBonus:0};
      window.__v23.setFight(F);
      window.__v23.castSkillInFight();
      await new Promise(r=>setTimeout(r,400));
      F=window.__v19._test.F();
      out.over=F?F.over:null; out.hp=F?F.hp:null;
      out.winRec=!!(window.__v19._test.en19().bosses['v11_fireking']&&window.__v19._test.en19().bosses['v11_fireking'].en&&window.__v19._test.en19().bosses['v11_fireking'].en.win);
      out.xpGain=(S.xp||0)-xp0;
      out.rewardXp=F?F.boss.reward.xp:null;
      var xp1=S.xp||0;
      window.__v23.castSkillInFight();
      await new Promise(r=>setTimeout(r,300));
      out.xpGain2=(S.xp||0)-xp1;
      out.over2=window.__v19._test.F()?window.__v19._test.F().over:null;
      window.__v19.close();
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v36c-lethal');
    return r;
  });

  // ============ V36-D — F13 live partial session ============
  await step('V36-D-partial-session', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10, true, []));
    const r = await C.eval(`(async()=>{ try{
      var v27=window.__v27, v35=window.__v35, out={};
      var res=v27._test.buildPlanCore('en',10,5,10,5);
      out.planSize=res.plan?res.plan.ids.length:null;
      v27.startPlan('en');
      await new Promise(r=>setTimeout(r,500));
      for(var i=0;i<2;i++){ v27.answerMC('x',true); v27.nextQ(); }
      v27.endEarly();
      var sess=v27.en27().sessions||[];
      out.recN=sess.length;
      out.partialFlag=sess[0]?sess[0].partial:null;
      out.planClaimed=Object.keys(v27.en27().claimed||{}).some(function(k){return k.indexOf('plan:en:')===0;});
      v35.startQuest('q_temple');
      await new Promise(r=>setTimeout(r,500));
      for(var j=0;j<9;j++){ v27.answerMC('x',true); v27.nextQ(); }
      v27.endEarly();
      v35.checkCompletions();
      out.questPartialState=v35.questState('q_temple');
      out.findSkips=v35._test.findSession('q_temple')===null;
      var sess2=v27.en27().sessions||[];
      out.questRecPartial=sess2[0]?sess2[0].partial:null;
      out.questRecTotal=sess2[0]?sess2[0].total:null;
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v36c-partial');
    return r;
  });

  // ============ V36-E — F09 duplicate ids + F10 Escape ============
  await step('V36-E-ids-escape', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10, true, []));
    const r = await C.eval(`(async()=>{ try{
      var out={};
      function dupIds(){
        var seen={}, dups=[];
        document.querySelectorAll('[id]').forEach(function(el){ var id=el.id; if(seen[id]){ if(dups.indexOf(id)<0) dups.push(id); } else seen[id]=1; });
        return dups;
      }
      out.dupsBoot=dupIds();
      // open the auth views (login / register / forgot) — the v21email
      // duplicates lived in these mutually-exclusive branches
      window.__v21.openAuth('welcome');
      await new Promise(r=>setTimeout(r,600));
      out.dupsLanding=dupIds();
      out.v21emailbtnCount=document.querySelectorAll('#v21emailbtn').length;
      try{ window.__v21.closeAuth&&window.__v21.closeAuth(); }catch(e){}
      window.__v21.openAuth('login');
      await new Promise(r=>setTimeout(r,600));
      out.dupsLogin=dupIds();
      out.v21emailCount=document.querySelectorAll('#v21email').length;
      try{ window.__v21.closeAuth&&window.__v21.closeAuth(); }catch(e){}
      window.__v21.openAuth('register');
      await new Promise(r=>setTimeout(r,600));
      out.dupsRegister=dupIds();
      try{ window.__v21.closeAuth&&window.__v21.closeAuth(); }catch(e){}
      window.__v21.openAuth('forgot');
      await new Promise(r=>setTimeout(r,600));
      out.dupsForgot=dupIds();
      try{ window.__v21.closeAuth&&window.__v21.closeAuth(); }catch(e){}
      // F10: Escape closes the Account Center; a second Escape is a no-op
      window.__v21.openAccount();
      await new Promise(r=>setTimeout(r,600));
      out.accountOpen= !!document.querySelector('#v21account');
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      await new Promise(r=>setTimeout(r,400));
      out.accountClosedByEsc= !document.querySelector('#v21account');
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      await new Promise(r=>setTimeout(r,300));
      out.secondEscNoThrow=true;
      out.accountStillClosed= !document.querySelector('#v21account');
      // reopen: Escape still works exactly once (no accumulated handlers)
      window.__v21.openAccount();
      await new Promise(r=>setTimeout(r,500));
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      await new Promise(r=>setTimeout(r,400));
      out.reopenEscCloses= !document.querySelector('#v21account');
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v36c-ids-escape');
    return r;
  });

  // ============ V36-F — V17-1 avatars + V17-3 speak mode ============
  await step('V36-F-avatars-speak', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10, true, []));
    const r = await C.eval(`(async()=>{ try{
      var out={};
      function wins(){ return window.__v21.summarizeSave(S).bossWins; }
      out.seededBefore=wins(); // 10 old + 30 flat + 30 nested + 1 golem = 71
      var e15=window.__v15.en15(); e15.bosses={}; for(var i=0;i<10;i++) e15.bosses['old'+i]={win:1};
      var e18=window.__v18._test.en18(); e18.bosses={}; for(var j=0;j<25;j++) e18.bosses['v10_w'+j]={win:1,wins:1};
      var e19=window.__v19._test.en19(); e19.bosses={}; for(var k=0;k<21;k++) e19.bosses['v11_w'+k]={en:{win:1,wins:1}};
      window.__v15.save15();
      out.seeded=wins();
      var av={}; window.__v21.AVATARS.forEach(function(a){ av[a.id]=a.wins; });
      out.av=av;
      out.dragon50=wins()>=av.dragon; out.unicorn60=wins()>=av.unicorn; out.phoenix70=wins()>=av.phoenix;
      // speak mode renders (the XP assertion itself lives in test36, which
      // drives SpeechRecognition through a stub — headless Chrome has none)
      window.__v15.choose('en');
      window.__v15.startMode('speak');
      await new Promise(r=>setTimeout(r,700));
      var body=document.querySelector('#v15body');
      var t=body?body.textContent:'';
      out.speakRenders= t.indexOf('Speaking Practice')>=0;
      out.speakHasWord= !!document.querySelector('#v15body .v15qword');
      out.speakHasRecordBtn= t.indexOf('Bấm để nói')>=0 || t.indexOf('Tôi đã đọc')>=0;
      out.speakSupported= !!(window.SpeechRecognition||window.webkitSpeechRecognition);
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v36c-speak');
    return r;
  });

  // ============ V36-G — V18.0 regression spot-check ============
  await step('V36-G-regression', async () => {
    const r = {};
    r.chronoGate = await C.eval(`(function(){ try{
      return {corrected: window.__v33.correctedWinCount(), gateOpen: window.__v33.gateOpen(),
        sandwispUnlocked: window.__v33._test.bossUnlocked('v17_sandwisp','en')};
    }catch(e){ return {err:String(e)} } })()`);
    r.skyrootGate = await C.eval(`(function(){ try{
      return {golemWonEn: window.__v35._test.gearGolemWon('en'), gateOpenEn: window.__v35._test.gateOpen('en'),
        lynxUnlocked: window.__v35._test.bossUnlocked('v18_breeze_lynx','en')};
    }catch(e){ return {err:String(e)} } })()`);
    r.breakClamp = await C.eval(`(function(){ try{
      return {b60: window.__v34.breakBonus(60), b200: window.__v34.breakBonus(200), b2000: window.__v34.breakBonus(2000),
        wrapped: window.__v36.wrapped, origSaved: typeof window.__v34._breakBarHTML_orig==='function'};
    }catch(e){ return {err:String(e)} } })()`);
    r.smart = await C.eval(`(async()=>{ try{ window.__v27.openSmart('en'); await new Promise(r=>setTimeout(r,700)); var el=document.querySelector('#v27hub'); return {open: !!el && el.style.display!=='none', text:(el?el.textContent:'').slice(0,120)}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v36c-smart');
    await C.eval(`(function(){ try{ window.__v27.closeSmart(); }catch(e){} })()`); await sleep(400);
    r.library = await C.eval(`(async()=>{ try{ window.__v15.openHub('library'); await new Promise(r=>setTimeout(r,800)); var hub=document.querySelector('#v15hub'); return {open: !!hub, textLen: (hub?hub.textContent:'').length, hasChrono: (hub?hub.textContent:'').indexOf('Chrono Kingdom')>=0, hasSkyroot: (hub?hub.textContent:'').indexOf('Skyroot Sanctuary')>=0}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v36c-library2');
    r.consoleErrors = C.consoleErrors;
    r.consoleErrorCount = C.consoleErrors.length;
    r.dialogsTotal = C.dialogs.length;
    return r;
  });

  note('CONSOLE_ERRORS_TOTAL', C.consoleErrors.length, JSON.stringify(C.consoleErrors).slice(0, 2000));
  note('CONSOLE_WARNS_TOTAL', C.consoleWarns.length);
  writeSmall(path.join(DIR, 'logs', 'v36c-results.json'), JSON.stringify(R, null, 2));
  writeSmall(path.join(DIR, 'logs', 'v36c-run.log'), log.join('\n') + '\n');
  writeSmall(path.join(DIR, 'logs', 'v36c-console-errors.json'), JSON.stringify(C.consoleErrors, null, 2));
  writeSmall(path.join(DIR, 'logs', 'v36c-dialogs.json'), JSON.stringify(C.dialogs, null, 2));
  note('DONE');
  cleanup();
  setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('FATAL', e); cleanup(); process.exit(1); });
