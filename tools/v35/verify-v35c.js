// verify-v35c.js — V18.0 SKYROOT SANCTUARY Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8952 / CDP 9353, scratch profile.
// Modelled on tools/v34/verify-v34c.js (same CDP class, freshSeed,
// readSave, shot helpers). Exit 0 = driver completed (verdicts are in
// the results JSON + stdout; a FAIL verdict does not crash the driver).
// The driver spawns its own HTTP server for out/ on 8952 and kills it
// on exit (v34c required a pre-running server; this one is self-contained).
// Writes results to tools/v35/logs/v35c-results.json after EVERY step
// (best-effort: EPERM waves may block a write; stdout always carries
// the verdicts).
// Gates: V35-A region overlay + gate behavior (locked/open, per-language);
// V35-B live V19 fight vs a Skyroot boss (HP decreases, Break bar fills,
//   BREAK bonus — B-35-2 regression: bossUnlocked19 must resolve v18_*);
// V35-C Library Skyroot group renders + filters + flashcards;
// V35-D pet hub shows the 3 new Skyroot species/eggs;
// V35-E quest start/claim flow; V35-F no overflow at 360/390/430 +
//   0 console errors; V35-G V17.1 regression spot-check (Chrono gate,
//   V15 fight, Library, login).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9353;
const HTTPPORT = 8952;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8952/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v35';
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
    '--user-data-dir=/tmp/chrome-v35c-prof', `--remote-debugging-port=${PORT}`,
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
    if (r.data) writeSmall(path.join(DIR, 'shots', name + '.png'), Buffer.from(r.data, 'base64').toString('latin1'));
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
  writeSmall(path.join(DIR, 'logs', 'v35c-results.json'), JSON.stringify(R, null, 2));
}
function cleanup() {
  try { if (C) C.close(); } catch (e) {}
  try { if (chromeProc) chromeProc.kill('SIGTERM'); } catch (e) {}
  try { if (httpProc) httpProc.kill('SIGTERM'); } catch (e) {}
}

(async () => {
  await openPage();
  const boot = await C.eval(`(function(){return {href:location.href, title:document.title, hasV15:!!window.__v15, hasV17:!!window.__v17, hasV18:!!window.__v18, hasV19:!!window.__v19, hasV27:!!window.__v27, hasV33:!!window.__v33, hasV34:!!window.__v34, hasV35:!!window.__v35, v35: window.__v35?window.__v35.version:null, v34: window.__v34?window.__v34.version:null, hasV35data:!!window.__V35_DATA, skyrootWords: window.__v17?window.__v17.skyrootWords().length:null, totalBosses: window.__v21?window.__v21.TOTAL_BOSSES:null, configured: window.__v20sync?__v20sync.configured():null, xp: (function(){try{return S.xp}catch(e){return 'no-S'}})() }})()`);
  note('BOOT', JSON.stringify(boot));
  await step('boot', async () => boot);

  // ============ V35-A — region overlay + gate behavior ============
  await step('V35-A-gate-locked', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10, false, []));
    const r = await C.eval(`(async()=>{ try{
      var out={gateEn: window.__v35._test.gateOpen('en'), gateKo: window.__v35._test.gateOpen('ko'),
        golemEn: window.__v35._test.gearGolemWon('en'), totalWins: window.__v35._test.totalWins(),
        lynxUnlocked: window.__v35._test.bossUnlocked('v18_breeze_lynx','en')};
      window.__v35.openSkyroot('en');
      await new Promise(r=>setTimeout(r,700));
      var hub=document.querySelector('#v35hub');
      var t=hub?hub.textContent:'';
      out.overlayOpen= !!hub && hub.style.display!=='none';
      out.lockedText= t.indexOf('GEAR GOLEM chưa bị đánh bại')>=0;
      out.lockedEmpty= t.indexOf('đang khóa')>=0;
      out.noFightBtn= t.indexOf('Bắt đầu chiến đấu')<0;
      out.totalShown= t.indexOf('/86')>=0;
      window.__v35.closeSkyroot();
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v35c-gate-locked');
    return r;
  });
  await step('V35-A-gate-open', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10, true, []));
    const r = await C.eval(`(async()=>{ try{
      var out={gateEn: window.__v35._test.gateOpen('en'), gateKo: window.__v35._test.gateOpen('ko'),
        golemEn: window.__v35._test.gearGolemWon('en'), totalWins: window.__v35._test.totalWins(),
        lynxUnlocked: window.__v35._test.bossUnlocked('v18_breeze_lynx','en'),
        stagUnlocked: window.__v35._test.bossUnlocked('v18_thornwing_stag','en'),
        // B-35-2 regression: the V19 unlock lookup must resolve v18_*.
        v19UnlocksLynx: window.__v19.bossUnlocked('v18_breeze_lynx','en'),
        v19UnlocksStag: window.__v19.bossUnlocked('v18_thornwing_stag','en')};
      window.__v35.openSkyroot('en');
      await new Promise(r=>setTimeout(r,700));
      var hub=document.querySelector('#v35hub');
      var t=hub?hub.textContent:'';
      out.overlayOpen= !!hub && hub.style.display!=='none';
      out.openText= t.indexOf('Cổng đã mở')>=0;
      out.hasBosses= t.indexOf('Boss Skyroot')>=0;
      out.hasQuests= t.indexOf('Nhiệm Vụ Cốt Truyện')>=0;
      out.hasFightBtn= t.indexOf('Bắt đầu chiến đấu')>=0;
      out.bossCards= (hub?hub.querySelectorAll('.v35boss').length:null);
      window.__v35.closeSkyroot();
      // KO language still locked (per-language independence).
      window.__v35.openSkyroot('ko');
      await new Promise(r=>setTimeout(r,500));
      var hubKo=document.querySelector('#v35hub');
      out.koLocked= (hubKo?hubKo.textContent:'').indexOf('GEAR GOLEM chưa bị đánh bại')>=0;
      window.__v35.closeSkyroot();
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v35c-gate-open');
    return r;
  });

  // ============ V35-B — live V19 fight vs Breeze Lynx (BREAK) ============
  await step('V35-B-v19-skyroot-fight', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10, true, []));
    const r = await C.eval(`(async()=>{ try{
      window.__v19._test.setLang('en');
      window.__v19.fight('v18_breeze_lynx');
      await new Promise(r=>setTimeout(r,700));
      var F=window.__v19._test.F();
      var out={fightVisible: !!document.querySelector('#v19fight'), fightStarted: !!F,
        weak: F?F.weak:null, hp0: F?F.hp:null, brk0: F?F.brk:null,
        barPresent: !!document.querySelector('#v19fight .v34breakbar'),
        barLabel: (document.querySelector('#v19fight .v34breaklabel')||{textContent:''}).textContent};
      var hits=0, guard=0, bars=[];
      function barNow(){ var el=document.querySelector('#v19fight .v34breaklabel'); return el?el.textContent:''; }
      while(hits<3 && guard++<40){
        var f=window.__v19._test.F(); if(!f||f.over) break;
        var w=f.cur&&f.cur.w;
        var isClim=w && w.skyrootSet==='climate';
        if(isClim){
          window.__v19._test.pickCorrect();
          await new Promise(r=>setTimeout(r,250));
          var f2=window.__v19._test.F();
          hits++; bars.push(barNow());
          out['brk'+hits]=f2?f2.brk:null;
          out['hpAfter'+hits]=f2?f2.hp:null;
          out['banner'+hits]=f2?String(f2.banner||''):null;
          if(f2&&!f2.over) window.__v19.next();
        } else {
          window.__v19.next();
        }
        await new Promise(r=>setTimeout(r,120));
      }
      out.hits=hits; out.bars=bars;
      out.hpLost=out.hp0-(out.hpAfter3!==undefined?out.hpAfter3:out.hp0);
      out.fightTextHasBreak=(document.querySelector('#v19fight')||{textContent:''}).textContent.indexOf('BREAK')>=0;
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v35c-v19-lynx');
    await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`); await sleep(400);
    return r;
  });

  // ============ V35-C — Library Skyroot group + filters + flashcards ============
  await step('V35-C-library-skyroot-group', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10, true, []));
    const r = await C.eval(`(async()=>{ try{
      window.__v15.choose('en'); window.__v15.openHub('library');
      await new Promise(r=>setTimeout(r,900));
      var hub=document.querySelector('#v15hub');
      var t=hub?hub.textContent:'';
      var out={hubOpen: !!hub, hasSkyrootGroup: t.indexOf('Skyroot Sanctuary')>=0,
        hasClimate: t.indexOf('Climate & Environment')>=0, hasScience: t.indexOf('Science & Innovation')>=0,
        hasSociety: t.indexOf('Society & Culture')>=0, hasMind: t.indexOf('Mind & Character')>=0,
        hasKONote: t.indexOf('120 từ dẫn bằng tiếng Hàn')>=0,
        hasSummary: t.indexOf('Tổng:')>=0,
        groupStats: window.__v25?window.__v25.groupStats('skyroot'):null,
        skyrootAfterChrono: t.indexOf('Skyroot Sanctuary')>t.indexOf('Chrono Kingdom')};
      window.__v17.openSkyrootSet('climate');
      await new Promise(r=>setTimeout(r,700));
      out.lessonTitle=(document.querySelector('#v15hub')||{textContent:''}).textContent.indexOf('Skyroot · Climate')>=0;
      out.wordCards= document.querySelectorAll('.v17word').length;
      out.firstCardWord=(document.querySelector('.v17word b')||{}).textContent||'';
      window.__v17.search('carbon');
      await new Promise(r=>setTimeout(r,500));
      out.searchCards= document.querySelectorAll('.v17word').length;
      out.searchHasCarbon= (document.querySelector('#v15hub')||{textContent:''}).textContent.indexOf('carbon footprint')>=0;
      window.__v17.setPosSel('pos','n');
      await new Promise(r=>setTimeout(r,500));
      out.posCards= document.querySelectorAll('.v17word').length;
      window.__v17.setPosSel('pos','');
      window.__v17.search('');
      await new Promise(r=>setTimeout(r,400));
      out.posResetCards= document.querySelectorAll('.v17word').length;
      var w0=window.__v17.skyrootSets().filter(function(g){return g.id==='climate'})[0].words[0];
      window.__v17.toggleFav(w0.id);
      await new Promise(r=>setTimeout(r,400));
      window.__v17.setStatus('fav');
      await new Promise(r=>setTimeout(r,500));
      out.favCards= document.querySelectorAll('.v17word').length;
      out.favWordShown=(document.querySelector('.v17word b')||{}).textContent||'';
      window.__v17.toggleFav(w0.id);
      window.__v17.goHome();
      window.__v15.clearScope();
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v35c-library');
    return r;
  });
  await step('V35-C-flashcards-skyroot-scope', async () => {
    const r = await C.eval(`(async()=>{ try{
      window.__v17.learnSkyrootSet('climate');
      await new Promise(r=>setTimeout(r,700));
      var scope=window.__v15.en15().scope;
      window.__v15.startMode('flash');
      await new Promise(r=>setTimeout(r,700));
      var card=document.querySelector('.v15fc');
      var word1=(document.querySelector('.v15fc .v15fc-word')||{}).textContent||'';
      var out={scope: scope, flashcardPresent: !!card, word1: word1,
        isSkyrootWord: window.__v17.skyrootWords().some(function(w){return w.en===word1})};
      window.__v15.fcFlip();
      await new Promise(r=>setTimeout(r,400));
      out.flipped= !!document.querySelector('.v15fc.fl');
      out.backShown= (document.querySelector('.v15fc-b')||{textContent:''}).textContent.length>0;
      window.__v15.fcNext();
      await new Promise(r=>setTimeout(r,400));
      var word2=(document.querySelector('.v15fc .v15fc-word')||{}).textContent||'';
      out.word2=word2; out.advanced= word2!=='' && word2!==word1;
      out.stillSkyrootScope= window.__v15.en15().scope && window.__v15.en15().scope.lib==='skyroot' && window.__v15.en15().scope.set==='climate';
      window.__v15.backToLearn();
      window.__v15.clearScope();
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v35c-flashcards');
    return r;
  });

  // ============ V35-D — pet hub shows the new Skyroot species/eggs ============
  await step('V35-D-pet-hub-skyroot', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10, true, []));
    const r = await C.eval(`(async()=>{ try{
      var out={speciesInData: window.__V23_DATA.species.filter(function(s){return ['cloudfx','sproutowl','stormram'].indexOf(s.id)>=0}).length,
        eggsInData: window.__V23_DATA.eggs.filter(function(e){return ['cloud','sprout','storm'].indexOf(e.id)>=0}).length,
        windElement: !!(window.__V23_DATA.elements||{}).wind,
        stoneWind: (window.__V23_DATA.materials||[]).some(function(m){return m.id==='stone_wind'})};
      window.__v23.openHub('shop');
      await new Promise(r=>setTimeout(r,800));
      var shop=document.querySelector('#v23hub');
      var ts=shop?shop.textContent:'';
      out.shopOpen= !!shop;
      out.shopHasCloudEgg= ts.indexOf('Trứng Mây')>=0;
      out.shopHasSproutEgg= ts.indexOf('Trứng Mầm')>=0;
      out.shopHasStormEgg= ts.indexOf('Trứng Bão')>=0;
      window.__v23.openHub('pets');
      await new Promise(r=>setTimeout(r,800));
      var pets=document.querySelector('#v23hub');
      var tp=pets?pets.textContent:'';
      out.petsOpen= !!pets;
      // The collection tab lists species names.
      window.__v23.openHub('collection');
      await new Promise(r=>setTimeout(r,800));
      var coll=document.querySelector('#v23hub');
      var tc=coll?coll.textContent:'';
      out.collHasFox= tc.indexOf('Cáo Mây')>=0;
      out.collHasOwl= tc.indexOf('Cú Mầm')>=0;
      out.collHasRam= tc.indexOf('Cừu Bão')>=0;
      out.milestone54= (window.__V23_DATA.collectionRewards||[]).some(function(x){return x.forms===54});
      try{ window.__v23.closeHub(); }catch(e){}
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v35c-pethub');
    return r;
  });

  // ============ V35-E — quest start/claim flow ============
  await step('V35-E-quest-flow', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10, true, []));
    const r = await C.eval(`(async()=>{ try{
      var out={};
      var q=window.__V35_DATA.quests.filter(function(x){return x.id==='q_islands'})[0];
      out.questWords=q.ids.length;
      out.started= !!window.__v35.startQuest('q_islands');
      await new Promise(r=>setTimeout(r,700));
      out.stateAfterStart= window.__v35._test.questState('q_islands');
      var before=window.__v27.en27().sessions.length;
      var guard=0;
      while(window.__v27.en27().sessions.length===before && guard++<40){
        window.__v27.answerMC('x', true); window.__v27.nextQ();
        await new Promise(r=>setTimeout(r,120));
      }
      var recs=window.__v27.en27().sessions;
      var rec=null;
      for(var i=0;i<recs.length;i++){ var s=recs[i]; if(s.words && q.ids.every(function(id){return s.words.indexOf(id)>=0;})){ rec=s; break; } }
      out.sessionRec= rec?{total:rec.total, correct:rec.correct}:null;
      var done=window.__v35.checkCompletions();
      out.completed= done;
      out.stateAfterCheck= window.__v35._test.questState('q_islands');
      var xp0=S.xp, g0=(S.v7&&S.v7.gems)||0;
      var claim=window.__v35._test.claimQuest('q_islands');
      out.claim= claim;
      out.xpDelta= S.xp-xp0; out.gemsDelta= ((S.v7&&S.v7.gems)||0)-g0;
      var claim2=window.__v35._test.claimQuest('q_islands');
      out.secondClaimOk= claim2.ok;
      out.stateAfterClaim= window.__v35._test.questState('q_islands');
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v35c-quest');
    return r;
  });

  // ============ V35-F — overflow at 360/390/430 + console errors ============
  await step('V35-F-widths', async () => {
    const widths = {};
    for (const w of [360, 390, 430]) {
      await C.send('Emulation.setDeviceMetricsOverride', { width: w, height: 844, deviceScaleFactor: 2, mobile: true });
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('library'); }catch(e){} })()`);
      await sleep(900);
      widths[w] = await C.eval(`(function(){ try{
        var de=document.documentElement;
        var hub=document.querySelector('#v15hub');
        return {innerWidth: window.innerWidth, docScrollW: de.scrollWidth, noDocOverflow: de.scrollWidth<=window.innerWidth,
          hubScrollW: hub?hub.scrollWidth:null, hubNoOverflow: hub?hub.scrollWidth<=window.innerWidth:null, hubPresent: !!hub};
      }catch(e){ return {err:String(e)} } })()`);
      await shot('v35c-library-' + w);
      await sleep(300);
    }
    // Skyroot overlay at 390 must fit too.
    await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await C.eval(`(function(){ try{ window.__v35.openSkyroot('en'); }catch(e){} })()`);
    await sleep(900);
    widths.overlay390 = await C.eval(`(function(){ try{
      var de=document.documentElement;
      var h=document.querySelector('#v35hub');
      var inner=h?h.querySelector('.v35in'):null;
      return {innerWidth: window.innerWidth, docScrollW: de.scrollWidth, noDocOverflow: de.scrollWidth<=window.innerWidth,
        overlayPresent: !!h, overlayScrollW: h?h.scrollWidth:null, innerScrollW: inner?inner.scrollWidth:null};
    }catch(e){ return {err:String(e)} } })()`);
    await shot('v35c-overlay-390');
    await C.eval(`(function(){ try{ window.__v35.closeSkyroot(); }catch(e){} })()`); await sleep(400);
    // A live V19 Skyroot fight at 390: the Break bar must fit too.
    await C.eval(`(function(){ try{ window.__v19._test.setLang('en'); window.__v19.fight('v18_breeze_lynx'); }catch(e){} })()`);
    await sleep(900);
    widths.fight390 = await C.eval(`(function(){ try{
      var de=document.documentElement;
      var f=document.querySelector('#v19fight');
      var bar=document.querySelector('#v19fight .v34breakbar');
      return {innerWidth: window.innerWidth, docScrollW: de.scrollWidth, noDocOverflow: de.scrollWidth<=window.innerWidth,
        fightPresent: !!f, fightScrollW: f?f.scrollWidth:null, barPresent: !!bar, barW: bar?bar.getBoundingClientRect().width:null};
    }catch(e){ return {err:String(e)} } })()`);
    await shot('v35c-fight-390');
    await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`); await sleep(400);
    return widths;
  });

  // ============ V35-G — V17.1 regression spot-check ============
  await step('V35-G-regression', async () => {
    const r = {};
    r.chronoGate = await C.eval(`(function(){ try{
      return {corrected: window.__v33.correctedWinCount(), gateOpen: window.__v33.gateOpen(),
        sandwispUnlocked: window.__v33._test.bossUnlocked('v17_sandwisp','en')};
    }catch(e){ return {err:String(e)} } })()`);
    r.smart = await C.eval(`(async()=>{ try{ window.__v27.openSmart('en'); await new Promise(r=>setTimeout(r,700)); var el=document.querySelector('#v27hub'); return {open: !!el && el.style.display!=='none', text:(el?el.textContent:'').slice(0,120)}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v35c-smart');
    await C.eval(`(function(){ try{ window.__v27.closeSmart(); }catch(e){} })()`); await sleep(400);
    r.v15fight = await C.eval(`(async()=>{ try{
      window.__v15.choose('en');
      window.__v15.openHub('bosses');
      await new Promise(r=>setTimeout(r,800));
      window.__v15.bossFight('slime');
      await new Promise(r=>setTimeout(r,700));
      var host=document.querySelector('#v15bossfight');
      if(!host) return {fightVisible:false, err:'no #v15bossfight host after hub+bosses tab'};
      var t=host.textContent||'';
      var hpM=t.match(new RegExp('HP ([0-9]+)/60'));
      var before=hpM?+hpM[1]:null;
      var picked=false, after=null;
      var qw=(host.querySelector('.v15qword')||{}).textContent||'';
      var w=window.__v15.words.filter(function(x){return x.en===qw})[0];
      if(w){
        var btns=Array.from(host.querySelectorAll('.v15opt'));
        var b=btns.filter(function(x){return x.textContent===w.vi})[0];
        if(b){ b.click(); picked=true; }
      }
      await new Promise(r=>setTimeout(r,500));
      var t2=(document.querySelector('#v15bossfight')||{textContent:''}).textContent;
      var hpM2=t2.match(new RegExp('HP ([0-9]+)/60'));
      after=hpM2?+hpM2[1]:null;
      return {fightVisible: !!host, hpBefore: before, picked, hpAfter: after, barPresent: !!document.querySelector('#v15bossfight .v34breakbar')};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v35c-v15fight');
    await C.eval(`(function(){ try{ window.__v15.bossClose(); }catch(e){} })()`); await sleep(400);
    r.library = await C.eval(`(async()=>{ try{ window.__v15.openHub('library'); await new Promise(r=>setTimeout(r,800)); var hub=document.querySelector('#v15hub'); return {open: !!hub, textLen: (hub?hub.textContent:'').length, hasChrono: (hub?hub.textContent:'').indexOf('Chrono Kingdom')>=0, hasSkyroot: (hub?hub.textContent:'').indexOf('Skyroot Sanctuary')>=0}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v35c-library2');
    r.login = await C.eval(`(async()=>{ try{ window.__v21.openAuth('login'); await new Promise(r=>setTimeout(r,600)); var a=document.querySelector('#v21auth'); var t=a?a.textContent:''; window.__v21.closeAuth?window.__v21.closeAuth():null; return {open: !!a, hasEmail: /Email/.test(t)}; }catch(e){ return {err:String(e)} } })()`, true);
    r.consoleErrors = C.consoleErrors;
    r.consoleErrorCount = C.consoleErrors.length;
    r.dialogsTotal = C.dialogs.length;
    return r;
  });

  note('CONSOLE_ERRORS_TOTAL', C.consoleErrors.length, JSON.stringify(C.consoleErrors).slice(0, 2000));
  note('CONSOLE_WARNS_TOTAL', C.consoleWarns.length);
  writeSmall(path.join(DIR, 'logs', 'v35c-results.json'), JSON.stringify(R, null, 2));
  writeSmall(path.join(DIR, 'logs', 'v35c-run.log'), log.join('\n') + '\n');
  writeSmall(path.join(DIR, 'logs', 'v35c-console-errors.json'), JSON.stringify(C.consoleErrors, null, 2));
  writeSmall(path.join(DIR, 'logs', 'v35c-dialogs.json'), JSON.stringify(C.dialogs, null, 2));
  note('DONE');
  cleanup();
  setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('FATAL', e); cleanup(); process.exit(1); });
