// verify-v33c.js — V17.0 CHRONO KINGDOM Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8951 / CDP 9352, scratch profile.
// Modelled on tools/v32/verify-v32c.js (same CDP class, freshSeed,
// readSave, shot helpers). Exit 0 = driver completed (verdicts are in
// the results JSON + stdout; a FAIL verdict does not crash the driver).
// Writes results to tools/v33/logs/v33c-results.json after EVERY step
// (best-effort: EPERM waves may block a write; stdout always carries
// the verdicts). The HTTP server must already serve out/ on 8951:
//   python3 -m http.server 8951 --directory out
// Gates: V33-A overlay render (locked 69 + open 70) + 0 JS errors at
// boot; V33-B EN/KO hub entry buttons + overlay at 360/390/430 with no
// overflow; V33-C real V19 fight vs a Chrono boss (sandwisp win +
// golem mechanics); V33-D real V27 quest session end-to-end;
// V33-E Pet Hub shows the 3 Chrono species + eggs in the shop;
// V33-F WCAG AA contrast on the Chrono overlay; V33-G V16.4 regression
// (Smart, Pet Hub, v18 fight, Library, login).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9352;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8951/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v33';
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
async function ensureChrome() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {}
  const sha = execSync(`sha256sum ${POLICY} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
  const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
    '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
    '--user-data-dir=/tmp/chrome-v33c-prof', `--remote-debugging-port=${PORT}`,
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
    if (r.data) writeSmall(path.join(DIR, 'shots', name + '.png'), Buffer.from(r.data, 'base64').toString('latin1'));
  } catch (e) { note('shot failed', name, String(e).slice(0, 120)); }
}
// Seed a fresh save with exactly n15/n18flat/n19 boss wins (V33-local
// corrected count) + xp/gems, then reload so the game boots on it.
function winsMutator(n15, n18, n19, xp, gems) {
  return `S0.xp=${xp}; S0.v7=S0.v7||{}; S0.v7.gems=${gems};
    S0.v7.en15=S0.v7.en15||{}; S0.v7.en15.bosses={}; for(var i=0;i<${n15};i++) S0.v7.en15.bosses['old'+i]={win:1};
    S0.v7.en18=S0.v7.en18||{}; S0.v7.en18.bosses={}; for(var i=0;i<${n18};i++) S0.v7.en18.bosses['v10_'+i]={win:1,wins:1};
    S0.v7.en19=S0.v7.en19||{bosses:{},titles:[],zoneClaimed:{},koStats:{right:0,wrong:0}}; S0.v7.en19.bosses={}; for(var i=0;i<${n19};i++) S0.v7.en19.bosses['v11_'+i]={en:{win:1,wins:1,stars:2,best:2}};
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
      en33: S0.v7&&S0.v7.en33?{quests:Object.keys(S0.v7.en33.quests||{}), region:S0.v7.en33.regionClaimed, riftBest:S0.v7.en33.rift&&S0.v7.en33.rift.best}:null,
      chronoWins: (function(){var b=S0.v7&&S0.v7.en19&&S0.v7.en19.bosses||{};var n=0;for(var k in b) if(k.indexOf('v17_')===0&&b[k]&&b[k].en&&b[k].en.win) n++; return n})(),
      en27sessions: ((S0.v7&&S0.v7.en27&&S0.v7.en27.sessions)||[]).length,
      pets: Object.keys((S0.v7&&S0.v7.en23&&S0.v7.en23.pets)||{}).length,
      mem:mem, v7keys:S0.v7?Object.keys(S0.v7):[] };
  }catch(e){ return {err:String(e)} } })()`);
}
const R = {};
async function step(name, fn) {
  try { const v = await fn(); R[name] = v; note('## ' + name, JSON.stringify(v).slice(0, 3500)); }
  catch (e) { R[name] = { ERROR: String(e).slice(0, 500) }; note('## ' + name + ' ERROR', String(e).slice(0, 500)); }
  writeSmall(path.join(DIR, 'logs', 'v33c-results.json'), JSON.stringify(R, null, 2));
}

(async () => {
  await openPage();
  const boot = await C.eval(`(function(){return {href:location.href, title:document.title, hasV15:!!window.__v15, hasV19:!!window.__v19, hasV27:!!window.__v27, hasV31:!!window.__v31, v31: window.__v31?window.__v31.version:null, hasV32:!!window.__v32, v32: window.__v32?window.__v32.version:null, hasV33:!!window.__v33, v33: window.__v33?window.__v33.version:null, hasV33data:!!window.__V33_DATA, chronoWords: window.__V33_DATA?window.__V33_DATA.words.length:null, chronoBosses: window.__V33_DATA?window.__V33_DATA.bosses.length:null, configured: window.__v20sync?__v20sync.configured():null, xp: (function(){try{return S.xp}catch(e){return 'no-S'}})() }})()`);
  note('BOOT', JSON.stringify(boot));
  await step('boot', async () => boot);

  // ============ V33-A — overlay: locked at 69, open at 70 ============
  await step('V33-A-overlay-locked-69', async () => {
    await freshSeed(winsMutator(10, 30, 29, 5000, 10));
    const r = await C.eval(`(async()=>{ try{
      window.__v33.openChrono('en'); await new Promise(r=>setTimeout(r,700));
      var h=document.querySelector('#v33hub');
      var t=h?h.textContent:'';
      return {hubVisible: !!h && h.style.display!=='none', has6970: t.indexOf('69/70')>=0,
        hasFightBtn: !!h && !!h.querySelector('.v33btn.pri'),
        hasLockText: t.indexOf('đang khóa')>=0, gateOpen: window.__v33.gateOpen(), count: window.__v33.correctedWinCount(),
        breakdown: window.__v33.winBreakdown()};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-locked-69');
    await C.eval(`(function(){ try{ window.__v33.closeChrono(); }catch(e){} })()`);
    return r;
  });
  await step('V33-A-overlay-open-70', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10));
    const r = await C.eval(`(async()=>{ try{
      window.__v33.openChrono('en'); await new Promise(r=>setTimeout(r,700));
      var h=document.querySelector('#v33hub');
      var t=h?h.textContent:'';
      var cards=h?h.querySelectorAll('.v33boss').length:0;
      return {hubVisible: !!h && h.style.display!=='none', has7070: t.indexOf('70/70')>=0,
        hasGateOpenText: t.indexOf('Cổng đã mở')>=0, bossCards: cards,
        hasQuests: t.indexOf('Nhiệm Vụ Cốt Truyện')>=0, hasRift: t.indexOf('Khe Nứt Thời Gian')>=0,
        hasEcho: t.indexOf('Time Echo')>=0, fightBtns: h?h.querySelectorAll('.v33btn.pri').length:0,
        gateOpen: window.__v33.gateOpen(), count: window.__v33.correctedWinCount()};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-open-70');
    return r;
  });

  // ============ V33-B — EN/KO entry buttons + overlay widths ============
  await step('V33-B-entry-buttons', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10));
    const r = await C.eval(`(async()=>{ try{
      window.__v15.choose('en'); window.__v15.openHub(); await new Promise(r=>setTimeout(r,900));
      var hubBtns=document.querySelectorAll('.v33hubbtn').length;
      var koTab=!!document.querySelector('.v33kotab');
      var koTabText=(document.querySelector('.v33kotab')||{}).textContent||'';
      // Click the EN hub Chrono button: the overlay must open.
      var b=document.querySelector('.v33hubbtn'); if(b) b.click();
      await new Promise(r=>setTimeout(r,700));
      var h=document.querySelector('#v33hub');
      return {hubBtns, koTab, koTabText, overlayOpenedByClick: !!h && h.style.display!=='none'};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-entry');
    await C.eval(`(function(){ try{ window.__v33.closeChrono(); }catch(e){} })()`);
    return r;
  });
  await step('V33-B-overlay-widths', async () => {
    const widths = {};
    for (const w of [360, 390, 430]) {
      await C.send('Emulation.setDeviceMetricsOverride', { width: w, height: 844, deviceScaleFactor: 2, mobile: true });
      await C.eval(`(function(){ try{ window.__v33.openChrono('en'); }catch(e){} })()`);
      await sleep(900);
      widths[w] = await C.eval(`(function(){ try{
        var de=document.documentElement;
        var hub=document.querySelector('#v33hub');
        return {innerWidth: window.innerWidth, docScrollW: de.scrollWidth, noDocOverflow: de.scrollWidth<=window.innerWidth,
          hubScrollW: hub?hub.scrollWidth:null, hubNoOverflow: hub?hub.scrollWidth<=window.innerWidth:null, hubPresent: !!hub};
      }catch(e){ return {err:String(e)} } })()`);
      await shot('v33c-overlay-' + w);
      await C.eval(`(function(){ try{ window.__v33.closeChrono(); }catch(e){} })()`);
      await sleep(300);
    }
    await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    return widths;
  });

  // ============ V33-C — real Chrono fight: sandwisp win + golem mechanics ============
  await step('V33-C-sandwisp-fight', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10));
    const r = await C.eval(`(async()=>{ try{
      var xp0=S.xp, gems0=S.v7.gems;
      window.__v19.fight('v17_sandwisp');
      await new Promise(r=>setTimeout(r,600));
      var F=window.__v19._test.F();
      var opened={hp:F?F.hp:null, phase:F?F.phase:null, over:F?F.over:null};
      var guard=0;
      while(guard++<80){ var f=window.__v19._test.F(); if(!f||f.over) break;
        window.__v19._test.pickCorrect(); window.__v19.next();
        await new Promise(r=>setTimeout(r,120)); }
      var F2=window.__v19._test.F();
      var rec=S.v7.en19.bosses['v17_sandwisp'];
      return {opened, won: F2&&F2.over==='win', right: F2?F2.right:null, wrong: F2?F2.wrong:null,
        recEn: rec&&rec.en?{win:rec.en.win, stars:rec.en.stars}:null,
        xpDelta: S.xp-xp0, gemsDelta: S.v7.gems-gems0, fightVisible: !!document.querySelector('#v19fight')};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-sandwisp-win');
    await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`); await sleep(400);
    return r;
  });
  await step('V33-C-golem-mechanics', async () => {
    const r = await C.eval(`(async()=>{ try{
      for(var i=0;i<7;i++){ var id=window.__V33_DATA.bosses[i].id; S.v7.en19.bosses[id]={en:{win:1,wins:1,stars:3,best:3}}; }
      window.__v19.fight('v17_geargolem');
      await new Promise(r=>setTimeout(r,600));
      var F=window.__v19._test.F();
      var shield0=F?F.shield:null;
      F.hp=300;
      window.__v19._test.pickCorrect(); window.__v19.next();
      await new Promise(r=>setTimeout(r,300));
      var phase2=window.__v19._test.F()?window.__v19._test.F().phase:null;
      var hpPre=window.__v19._test.F()?window.__v19._test.F().hp:null;
      window.__v19._test.pickWrong(); window.__v19.next();
      await new Promise(r=>setTimeout(r,300));
      var hpPost=window.__v19._test.F()?window.__v19._test.F().hp:null;
      var F3=window.__v19._test.F(); F3.hp=100;
      window.__v19._test.pickCorrect(); window.__v19.next();
      await new Promise(r=>setTimeout(r,300));
      var F4=window.__v19._test.F();
      var phaseTxt=(document.querySelector('#v19fight')||{innerHTML:''}).innerHTML;
      return {shield0, phase2, hpPre, hpPost, healDelta: (hpPost!==null&&hpPre!==null)?(hpPost-hpPre):null,
        phaseAfterLowHp: F4?F4.phase:null, ultActive: F4?F4.ultActive:null,
        phaseTextIsSlash2: phaseTxt.indexOf('Giai đoạn 2/2')>=0, phaseTextHasSlash3: phaseTxt.indexOf('Giai đoạn 2/3')>=0};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-golem');
    await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`); await sleep(400);
    return r;
  });

  // ============ V33-D — real V27 quest session end-to-end ============
  await step('V33-D-quest-e2e', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10));
    const r = await C.eval(`(async()=>{ try{
      var xp0=S.xp;
      var started=window.__v33.startQuest('q_clock');
      await new Promise(r=>setTimeout(r,800));
      var before=window.__v27.en27().sessions.length;
      var guard=0;
      while(window.__v27.en27().sessions.length===before && guard++<40){
        window.__v27.answerMC('x', true); window.__v27.nextQ();
        await new Promise(r=>setTimeout(r,150)); }
      var sessions=window.__v27.en27().sessions;
      var rec=sessions.length>before?sessions[0]:null;
      var done=window.__v33.checkCompletions();
      var state=window.__v33.questState('q_clock');
      var claim=window.__v33._test.claimQuest('q_clock');
      return {started, sessionRec: rec?{total:rec.total, correct:rec.correct, words:rec.words.length, kind:rec.kind}:null,
        done, state, claim, xpDelta: S.xp-xp0};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-quest');
    return r;
  });

  // ============ V33-E — Pet Hub: 3 Chrono species + eggs in the shop ============
  await step('V33-E-pets', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10));
    const r = await C.eval(`(async()=>{ try{
      var species=window.__V23_DATA.species.length, eggs=window.__V23_DATA.eggs.length;
      var ids=window.__V23_DATA.species.map(function(s){return s.id});
      var eggIds=window.__V23_DATA.eggs.map(function(e){return e.id});
      window.__v23.openHub('pets'); await new Promise(r=>setTimeout(r,800));
      var petsText=(document.querySelector('#v23hub')||document.body).textContent||'';
      window.__v23.openHub('shop'); await new Promise(r=>setTimeout(r,800));
      var shopText=(document.querySelector('#v23hub')||document.body).textContent||'';
      return {species, eggs, hasStardeer: ids.indexOf('stardeer')>=0, hasGearbeetle: ids.indexOf('gearbeetle')>=0,
        hasCosmic: ids.indexOf('cosmicunicorn')>=0, eggIds,
        petsTextHasStardeer: petsText.indexOf('Hươu Sao')>=0,
        shopHasStarEgg: shopText.indexOf('Trứng Sao')>=0, shopHasGearEgg: shopText.indexOf('Trứng Bánh Răng')>=0,
        shopHasCosmicEgg: shopText.indexOf('Trứng Vũ Trụ')>=0};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-pets');
    await C.eval(`(function(){ try{ window.__v23.closeHub(); }catch(e){} })()`); await sleep(400);
    return r;
  });

  // ============ V33-F — WCAG AA contrast on the Chrono overlay ============
  await step('V33-F-overlay-contrast', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10));
    const r = await C.eval(`(async()=>{ try{
      window.__v33.openChrono('en'); await new Promise(r=>setTimeout(r,700));
      function lum(rgb){ var m=rgb.match(/[\\d.]+/g); if(!m) return null; var c=m.slice(0,3).map(function(v){ v=Number(v)/255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; }
      function ratio(fg,bg){ var l1=lum(fg), l2=lum(bg); if(l1===null||l2===null) return null; var hi=Math.max(l1,l2), lo=Math.min(l1,l2); return (hi+0.05)/(lo+0.05); }
      function effBg(el){ var n=el; while(n){ var bg=getComputedStyle(n).backgroundColor; if(bg && bg!=='rgba(0, 0, 0, 0)' && bg!=='transparent') return bg; n=n.parentElement; } return 'rgb(255, 255, 255)'; }
      var out=[];
      var sels=['.v33title b','.v33title span','.v33card b','.v33mut','.v33boss b','.v33btn','.v33langbtn'];
      sels.forEach(function(sel){
        document.querySelectorAll('#v33hub '+sel).forEach(function(el){
          var cs=getComputedStyle(el);
          var bg=effBg(el);
          var rr=ratio(cs.color, bg);
          var fs=parseFloat(cs.fontSize);
          out.push({sel:sel, text:(el.textContent||'').slice(0,40), fg:cs.color, bg:bg, ratio: rr?Math.round(rr*100)/100:null, fontPx: fs, aa: rr!==null && rr>=(fs>=18||(fs>=14)?4.5:4.5)});
        });
      });
      var worst=out.filter(function(o){return o.ratio!==null}).sort(function(a,b){return a.ratio-b.ratio;})[0];
      return {checked: out.length, worst, failures: out.filter(function(o){return o.ratio!==null&&o.ratio<4.5}).map(function(o){return o.sel+' '+o.ratio+' "'+o.text+'"';})};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-contrast');
    await C.eval(`(function(){ try{ window.__v33.closeChrono(); }catch(e){} })()`);
    return r;
  });

  // ============ V33-G — V16.4 regression spot-check ============
  await step('V33-G-regression', async () => {
    const r = {};
    r.smart = await C.eval(`(async()=>{ try{ window.__v27.openSmart('en'); await new Promise(r=>setTimeout(r,700)); var el=document.querySelector('#v27hub'); return {open: !!el && el.style.display!=='none', text:(el?el.textContent:'').slice(0,120)}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-smart');
    await C.eval(`(function(){ try{ window.__v27.closeSmart(); }catch(e){} })()`); await sleep(400);
    r.petHub = await C.eval(`(async()=>{ try{ window.__v23.openHub('pets'); await new Promise(r=>setTimeout(r,700)); var el=document.querySelector('#v23hub,#v23body'); return {open: !!el, hasPetText: (document.body.textContent||'').indexOf('Thú cưng')>=0}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-pethub');
    await C.eval(`(function(){ try{ window.__v23.closeHub(); }catch(e){} })()`); await sleep(400);
    r.boss = await C.eval(`(async()=>{ try{
      window.__v15.choose('en');
      var f=window.__v18.fight('v10_slime','en');
      await new Promise(r=>setTimeout(r,700));
      var F=window.__v18._test.F();
      var before={hp:F?F.hp:null, over:F?F.over:null};
      var picked=window.__v18._test.pickCorrect();
      await new Promise(r=>setTimeout(r,500));
      var F2=window.__v18._test.F();
      return {fightOpened: !!F, before, picked, afterHp: F2?F2.hp:null, afterOver: F2?F2.over:null, fightVisible: !!document.querySelector('#v18fight')};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-boss');
    await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`); await sleep(400);
    r.library = await C.eval(`(async()=>{ try{ window.__v15.openHub('library'); await new Promise(r=>setTimeout(r,800)); var hub=document.querySelector('#v15hub'); return {open: !!hub, textLen: (hub?hub.textContent:'').length, snippet:(hub?hub.textContent:'').slice(0,150)}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v33c-library');
    r.login = await C.eval(`(async()=>{ try{ window.__v21.openAuth('login'); await new Promise(r=>setTimeout(r,600)); var a=document.querySelector('#v21auth'); var t=a?a.textContent:''; window.__v21.closeAuth?window.__v21.closeAuth():null; return {open: !!a, hasEmail: /Email/.test(t)}; }catch(e){ return {err:String(e)} } })()`, true);
    r.consoleErrors = C.consoleErrors;
    r.consoleErrorCount = C.consoleErrors.length;
    r.dialogsTotal = C.dialogs.length;
    return r;
  });

  note('CONSOLE_ERRORS_TOTAL', C.consoleErrors.length, JSON.stringify(C.consoleErrors).slice(0, 2000));
  note('CONSOLE_WARNS_TOTAL', C.consoleWarns.length);
  writeSmall(path.join(DIR, 'logs', 'v33c-results.json'), JSON.stringify(R, null, 2));
  writeSmall(path.join(DIR, 'logs', 'v33c-run.log'), log.join('\n') + '\n');
  writeSmall(path.join(DIR, 'logs', 'v33c-console-errors.json'), JSON.stringify(C.consoleErrors, null, 2));
  writeSmall(path.join(DIR, 'logs', 'v33c-dialogs.json'), JSON.stringify(C.dialogs, null, 2));
  note('DONE');
  try { C.close(); } catch (e) {}
  if (chromeProc) { try { chromeProc.kill('SIGTERM'); } catch (e) {} }
  setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('FATAL', e); try { if (chromeProc) chromeProc.kill('SIGTERM'); } catch (_) {} process.exit(1); });
