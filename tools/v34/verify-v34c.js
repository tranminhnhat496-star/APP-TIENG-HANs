// verify-v34c.js — V17.1 CHRONO COMPLETE Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8951 / CDP 9352, scratch profile.
// Modelled on tools/v33/verify-v33c.js (same CDP class, freshSeed,
// readSave, shot helpers). Exit 0 = driver completed (verdicts are in
// the results JSON + stdout; a FAIL verdict does not crash the driver).
// Writes results to tools/v34/logs/v34c-results.json after EVERY step
// (best-effort: EPERM waves may block a write; stdout always carries
// the verdicts). The HTTP server must already serve out/ on 8951:
//   python3 -m http.server 8951 --directory out
// Gates: V34-A Library Chrono group renders + filters + flashcards;
// V34-B live V19 Chrono fight shows the Break bar filling + BREAK bonus;
// V34-C live V18 fight shows the Break bar; V34-D Vocabulary Analytics
// renders; V34-E no overflow at 360/390/430 + 0 console errors;
// V34-F V17.0 regression spot-check (Smart, V15 fight, Library, login).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9352;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8951/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v34';
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
    '--user-data-dir=/tmp/chrome-v34c-prof', `--remote-debugging-port=${PORT}`,
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
      en17claimed: S0.v7&&S0.v7.en17?S0.v7.en17.claimed:null,
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
  writeSmall(path.join(DIR, 'logs', 'v34c-results.json'), JSON.stringify(R, null, 2));
}

(async () => {
  await openPage();
  const boot = await C.eval(`(function(){return {href:location.href, title:document.title, hasV15:!!window.__v15, hasV17:!!window.__v17, hasV18:!!window.__v18, hasV19:!!window.__v19, hasV27:!!window.__v27, hasV33:!!window.__v33, hasV34:!!window.__v34, v34: window.__v34?window.__v34.version:null, v33: window.__v33?window.__v33.version:null, hasV34data:!!window.__V34_DATA, chronoWords: window.__v17?window.__v17.chronoWords().length:null, configured: window.__v20sync?__v20sync.configured():null, xp: (function(){try{return S.xp}catch(e){return 'no-S'}})() }})()`);
  note('BOOT', JSON.stringify(boot));
  await step('boot', async () => boot);

  // ============ V34-A — Library Chrono group + filters + flashcards ============
  await step('V34-A-library-chrono-group', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10));
    const r = await C.eval(`(async()=>{ try{
      window.__v15.choose('en'); window.__v15.openHub('library');
      await new Promise(r=>setTimeout(r,900));
      var hub=document.querySelector('#v15hub');
      var t=hub?hub.textContent:'';
      var out={hubOpen: !!hub, hasChronoGroup: t.indexOf('Chrono Kingdom')>=0,
        hasTime: t.indexOf('Time & Calendar')>=0, hasSpace: t.indexOf('Space & Astronomy')>=0,
        hasMachines: t.indexOf('Machines & Engineering')>=0, hasChange: t.indexOf('Change & Sequence')>=0,
        hasKONote: t.indexOf('Chưa có từ Chrono tiếng Hàn')>=0,
        hasSummary: t.indexOf('Tổng:')>=0,
        groupStats: window.__v25?window.__v25.groupStats('chrono'):null,
        analytics: window.__v34?window.__v34.chronoAnalytics():null};
      // Per-set lesson view: 30 wordCards on page 1.
      window.__v17.openSet('time');
      await new Promise(r=>setTimeout(r,700));
      out.lessonTitle=(document.querySelector('#v15hub')||{textContent:''}).textContent.indexOf('Chrono · Time & Calendar')>=0;
      out.wordCards= document.querySelectorAll('.v17word').length;
      out.firstCardWord=(document.querySelector('.v17word b')||{}).textContent||'';
      // Search filter.
      window.__v17.search('alarm');
      await new Promise(r=>setTimeout(r,500));
      out.searchCards= document.querySelectorAll('.v17word').length;
      out.searchHasAlarm= (document.querySelector('#v15hub')||{textContent:''}).textContent.indexOf('alarm clock')>=0;
      // POS filter (nouns, still searching 'alarm').
      // NOTE V34-BUG-1: the UI offers short code 'n' but Chrono words carry
      // long code 'noun' — hasPos() matches exactly, so this returns 0.
      // Recorded here as the bug repro; reset pos+q before the fav check.
      window.__v17.setPosSel('pos','n');
      await new Promise(r=>setTimeout(r,500));
      out.posCards= document.querySelectorAll('.v17word').length;
      out.posBugRepro= out.posCards===0;
      window.__v17.setPosSel('pos','');
      window.__v17.search('');
      await new Promise(r=>setTimeout(r,400));
      out.posResetCards= document.querySelectorAll('.v17word').length;
      // Status filter: favourite one word, then show favs only.
      var w0=window.__v17.chronoSets().filter(function(g){return g.id==='time'})[0].words[0];
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
    await shot('v34c-library');
    return r;
  });
  await step('V34-A-flashcards-chrono-scope', async () => {
    const r = await C.eval(`(async()=>{ try{
      window.__v17.learnSet('time');
      await new Promise(r=>setTimeout(r,700));
      var scope=window.__v15.en15().scope;
      window.__v15.startMode('flash');
      await new Promise(r=>setTimeout(r,700));
      var card=document.querySelector('.v15fc');
      var word1=(document.querySelector('.v15fc .v15fc-word')||{}).textContent||'';
      var out={scope: scope, flashcardPresent: !!card, word1: word1,
        isChronoWord: window.__v17.chronoWords().some(function(w){return w.en===word1})};
      window.__v15.fcFlip();
      await new Promise(r=>setTimeout(r,400));
      out.flipped= !!document.querySelector('.v15fc.fl');
      out.backShown= (document.querySelector('.v15fc-b')||{textContent:''}).textContent.length>0;
      window.__v15.fcNext();
      await new Promise(r=>setTimeout(r,400));
      var word2=(document.querySelector('.v15fc .v15fc-word')||{}).textContent||'';
      out.word2=word2; out.advanced= word2!=='' && word2!==word1;
      out.stillChronoScope= window.__v15.en15().scope && window.__v15.en15().scope.lib==='chrono' && window.__v15.en15().scope.set==='time';
      window.__v15.backToLearn();
      window.__v15.clearScope();
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v34c-flashcards');
    return r;
  });

  // ============ V34-B — live V19 fight: Break bar fills + BREAK bonus ============
  await step('V34-B-v19-break-fight', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10));
    const r = await C.eval(`(async()=>{ try{
      window.__v19.fight('v11_fireking');
      await new Promise(r=>setTimeout(r,700));
      var F=window.__v19._test.F();
      var out={fightVisible: !!document.querySelector('#v19fight'), weak: F?F.weak:null,
        hp0: F?F.hp:null, brk0: F?F.brk:null,
        barPresent: !!document.querySelector('#v19fight .v34breakbar'),
        barLabel: (document.querySelector('#v19fight .v34breaklabel')||{textContent:''}).textContent};
      var hits=0, guard=0, bars=[];
      function barNow(){ var el=document.querySelector('#v19fight .v34breaklabel'); return el?el.textContent:''; }
      while(hits<3 && guard++<40){
        var f=window.__v19._test.F(); if(!f||f.over) break;
        var w=f.cur&&f.cur.w;
        var isFam=w && (w.a1a2Topics||[]).indexOf('a1_family')>=0;
        if(isFam){
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
      var f3=window.__v19._test.F();
      out.over=f3?f3.over:null;
      out.fightTextHasBreak=(document.querySelector('#v19fight')||{textContent:''}).textContent.indexOf('BREAK')>=0;
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v34c-v19-break');
    await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`); await sleep(400);
    return r;
  });

  // ============ V34-C — live V18 fight: Break bar ============
  await step('V34-C-v18-break-fight', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10));
    const r = await C.eval(`(async()=>{ try{
      // User path: the fight hosts (#v15body/#v18fight) only exist after the
      // English hub + bosses tab render. A cold __v18.fight() initialises
      // state but renders nothing (no host) — driver-entry, not a bug.
      window.__v15.choose('en'); window.__v15.openHub('bosses');
      await new Promise(r=>setTimeout(r,800));
      window.__v18.fight('v10_slime','en');
      await new Promise(r=>setTimeout(r,700));
      var F=window.__v18._test.F();
      var out={fightVisible: !!document.querySelector('#v18fight'), weak: F?F.weak:null,
        hp0: F?F.hp:null, brk0: F?F.brk:null,
        barPresent: !!document.querySelector('#v18fight .v34breakbar'),
        barLabel: (document.querySelector('#v18fight .v34breaklabel')||{textContent:''}).textContent};
      var hits=0, guard=0, bars=[];
      function barNow(){ var el=document.querySelector('#v18fight .v34breaklabel'); return el?el.textContent:''; }
      while(hits<3 && guard++<40){
        var f=window.__v18._test.F(); if(!f||f.over) break;
        var w=f.cur&&f.cur.w;
        var isFood=w && (w.a1a2Topics||[]).indexOf('a1_food-and-drinks')>=0;
        if(isFood){
          window.__v18._test.pickCorrect();
          await new Promise(r=>setTimeout(r,250));
          var f2=window.__v18._test.F();
          hits++; bars.push(barNow());
          out['brk'+hits]=f2?f2.brk:null;
          out['hpAfter'+hits]=f2?f2.hp:null;
          out['banner'+hits]=f2?String(f2.banner||''):null;
          if(f2&&!f2.over) window.__v18.next();
        } else {
          window.__v18.next();
        }
        await new Promise(r=>setTimeout(r,120));
      }
      out.hits=hits; out.bars=bars;
      out.hpLost=out.hp0-(out.hpAfter3!==undefined?out.hpAfter3:out.hp0);
      out.fightTextHasBreak=(document.querySelector('#v18fight')||{textContent:''}).textContent.indexOf('BREAK')>=0;
      return out;
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v34c-v18-break');
    await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`); await sleep(400);
    return r;
  });

  // ============ V34-D — Vocabulary Analytics renders ============
  await step('V34-D-analytics-render', async () => {
    await freshSeed(winsMutator(10, 30, 30, 5000, 10));
    const r = await C.eval(`(async()=>{ try{
      var tw=window.__v17.chronoSets().filter(function(g){return g.id==='time'})[0].words;
      window.__v15.mark15(true, tw[0], 'mc');
      window.__v15.mark15(true, tw[1], 'mc');
      window.__v15.mark15(false, tw[2], 'mc');
      var stats=window.__v34.setStats('time');
      var ana=window.__v34.chronoAnalytics();
      var ko=window.__v34.koChronoStats();
      window.__v15.choose('en'); window.__v15.openHub('library');
      await new Promise(r=>setTimeout(r,900));
      var hub=document.querySelector('#v15hub');
      var t=hub?hub.textContent:'';
      return {setStats: stats, groupTotal: ana?ana.total.total:null,
        groupLearned: ana?ana.total.learned:null,
        groupRetention: ana?ana.total.retention:null,
        koEmpty: ko?ko.empty:null,
        libHasRetention: t.indexOf('nhớ đúng')>=0,
        libHasKONote: t.indexOf('Chưa có từ Chrono tiếng Hàn')>=0,
        libHasLearned: t.indexOf('đã học')>=0};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v34c-analytics');
    return r;
  });

  // ============ V34-E — overflow at 360/390/430 + console errors ============
  await step('V34-E-widths', async () => {
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
      await shot('v34c-library-' + w);
      await sleep(300);
    }
    // A live V19 fight at 390: the Break bar must fit too.
    await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await C.eval(`(function(){ try{ window.__v19.fight('v11_fireking'); }catch(e){} })()`);
    await sleep(900);
    widths.fight390 = await C.eval(`(function(){ try{
      var de=document.documentElement;
      var f=document.querySelector('#v19fight');
      var bar=document.querySelector('#v19fight .v34breakbar');
      var r={innerWidth: window.innerWidth, docScrollW: de.scrollWidth, noDocOverflow: de.scrollWidth<=window.innerWidth,
        fightPresent: !!f, fightScrollW: f?f.scrollWidth:null, barPresent: !!bar, barW: bar?bar.getBoundingClientRect().width:null};
      return r;
    }catch(e){ return {err:String(e)} } })()`);
    await shot('v34c-fight-390');
    await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`); await sleep(400);
    return widths;
  });

  // ============ V34-F — V17.0 regression spot-check ============
  await step('V34-F-regression', async () => {
    const r = {};
    r.smart = await C.eval(`(async()=>{ try{ window.__v27.openSmart('en'); await new Promise(r=>setTimeout(r,700)); var el=document.querySelector('#v27hub'); return {open: !!el && el.style.display!=='none', text:(el?el.textContent:'').slice(0,120)}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v34c-smart');
    await C.eval(`(function(){ try{ window.__v27.closeSmart(); }catch(e){} })()`); await sleep(400);
    r.v15fight = await C.eval(`(async()=>{ try{
      // User path: #v15bossfight only exists after the hub + bosses tab render.
      window.__v15.choose('en');
      window.__v15.openHub('bosses');
      await new Promise(r=>setTimeout(r,800));
      window.__v15.bossFight('slime');
      await new Promise(r=>setTimeout(r,700));
      var host=document.querySelector('#v15bossfight');
      if(!host) return {fightVisible:false, err:'no #v15bossfight host after hub+bosses tab'};
      var t=host.textContent||'';
      var hpM=t.match(/HP (\\d+)\\/60/);
      var before=hpM?+hpM[1]:null;
      // Answer the currently shown question correctly via the rendered options:
      // find the word, look up its vi, click the matching option button.
      var qm=t.match(/([A-Za-z' -]+)/);
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
      var hpM2=t2.match(/HP (\\d+)\\/60/);
      after=hpM2?+hpM2[1]:null;
      return {fightVisible: !!host, hpBefore: before, picked, hpAfter: after, barPresent: !!document.querySelector('#v15bossfight .v34breakbar')};
    }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v34c-v15fight');
    await C.eval(`(function(){ try{ window.__v15.bossClose(); }catch(e){} })()`); await sleep(400);
    r.library = await C.eval(`(async()=>{ try{ window.__v15.openHub('library'); await new Promise(r=>setTimeout(r,800)); var hub=document.querySelector('#v15hub'); return {open: !!hub, textLen: (hub?hub.textContent:'').length, hasChrono: (hub?hub.textContent:'').indexOf('Chrono Kingdom')>=0}; }catch(e){ return {err:String(e)} } })()`, true);
    await shot('v34c-library2');
    r.login = await C.eval(`(async()=>{ try{ window.__v21.openAuth('login'); await new Promise(r=>setTimeout(r,600)); var a=document.querySelector('#v21auth'); var t=a?a.textContent:''; window.__v21.closeAuth?window.__v21.closeAuth():null; return {open: !!a, hasEmail: /Email/.test(t)}; }catch(e){ return {err:String(e)} } })()`, true);
    r.consoleErrors = C.consoleErrors;
    r.consoleErrorCount = C.consoleErrors.length;
    r.dialogsTotal = C.dialogs.length;
    return r;
  });

  note('CONSOLE_ERRORS_TOTAL', C.consoleErrors.length, JSON.stringify(C.consoleErrors).slice(0, 2000));
  note('CONSOLE_WARNS_TOTAL', C.consoleWarns.length);
  writeSmall(path.join(DIR, 'logs', 'v34c-results.json'), JSON.stringify(R, null, 2));
  writeSmall(path.join(DIR, 'logs', 'v34c-run.log'), log.join('\n') + '\n');
  writeSmall(path.join(DIR, 'logs', 'v34c-console-errors.json'), JSON.stringify(C.consoleErrors, null, 2));
  writeSmall(path.join(DIR, 'logs', 'v34c-dialogs.json'), JSON.stringify(C.dialogs, null, 2));
  note('DONE');
  try { C.close(); } catch (e) {}
  if (chromeProc) { try { chromeProc.kill('SIGTERM'); } catch (e) {} }
  setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('FATAL', e); try { if (chromeProc) chromeProc.kill('SIGTERM'); } catch (_) {} process.exit(1); });
