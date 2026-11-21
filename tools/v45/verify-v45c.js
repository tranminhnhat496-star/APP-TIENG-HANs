// verify-v45c.js - V19.0 (layer V45) Chrome verification driver.
// Real Chrome 157 via CDP, local HTTP. Parameterised so the SAME driver
// runs the BEFORE-state repro (pristine V18.9: fix gates FAIL = bug
// reproduced) and the AFTER-state verification (built V19.0: all PASS).
//   node tools/v45/verify-v45c.js [DIR] [httpPort] [cdpPort] [profile] [resultsFile] [shotPrefix]
// Defaults: DIR=out, http 8985, cdp 9385, profile chrome-v45c-prof,
// results tools/v45/logs/v45c-results.json, shots v45c-*.
// Exit 0 = driver completed (verdicts in the results JSON + stdout).
// Gates:
//   G0 boot clean (fresh guest, 0 console errors/warnings/dialogs)
//   G1 C-R3-1 fresh save: due 0 (counts + langbar + hub head)
//   G2 C-R3-1 seeded 0 truly-due: Review tab 0 + honest empty state on
//      reviewStart (no session, no box-0 question); seeded 3 truly-due:
//      due 3, Review shows 3, session starts on a box>=1 word
//   G3 C-R3-2 corrupt save: quarantine key byte-exact + warning shown;
//      card-less save: same; valid save (xp 9999): boots normally, xp kept,
//      no quarantine key created for it
//   G4 C-R3-4 snapshot keys unique under faked identical Date.now()
//   G5 NEW-1 Topics tab: 0 `undefined` icon URLs (52 cards; BT attach adds
//      a 53rd with no icon either — also covered)
//   G6 weakchip list rows: contrast >= 4.5:1 light + dark at 1280/1366/360
//   G7 regression: Legendary fight start ~10 ms (direct + real UI click);
//      C-02 shield halving; V19 Counterattack 3/3; A-F2 KO<8 banner;
//      B-8 BT flashcards on fresh load
//   G8 console/dialog summary: 0 errors, 0 warnings, 0 dialogs
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const POLICY = '/tmp/webgl-policy.txt';
const DIR = process.argv[2] || '/home/hatch/workspace/v7build/out';
const HTTPPORT = parseInt(process.argv[3] || '8985', 10);
const PORT = parseInt(process.argv[4] || '9385', 10);
const PROFILE = process.argv[5] || 'chrome-v45c-prof';
const RESULTS_FILE = process.argv[6] || 'v45c-results.json';
const SHOT_PREFIX = process.argv[7] || 'v45c';
const TDIR = '/home/hatch/workspace/v7build/tools/v45';
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
  await C.eval(`localStorage.clear()`);
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await reloadWait(2800);
}
function close() {
  try { if (C) C.close(); } catch (e) {}
  try { if (chromeProc) chromeProc.kill(); } catch (e) {}
  try { if (httpProc) httpProc.kill(); } catch (e) {}
}
const ev = (expr) => C.eval(expr);

// Poll .v7toast + .pp texts (the warning renders as .v7toast for 8 s via
// _warn45; a .pp fallback would live only 1100 ms, so a single read
// misses it on slow loads). Returns the union of all texts seen; stops
// early once the corrupt-save warning has been seen.
async function pollToasts(maxMs) {
  const seen = [];
  const t0 = Date.now();
  while (Date.now() - t0 < (maxMs || 4000)) {
    try {
      const cur = await ev(`[].map.call(document.querySelectorAll('.v7toast, .pp'),function(x){return x.textContent})`);
      (cur || []).forEach(t => { if (seen.indexOf(t) < 0) seen.push(t); });
      if (seen.some(t => t.indexOf('Không đọc được bản lưu') >= 0)) break;
    } catch (e) {}
    await sleep(400);
  }
  return seen;
}

// In-page weakchip contrast measurement (list rows only — fight chips excluded).
const MEASURE_CHIPS = `(function(){
  function parseRGB(s){var m=String(s).match(/rgba?\\(([^)]+)\\)/);if(!m)return null;var p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function lum(c){function f(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
  function blend(fg,bg){var a=(fg.a==null?1:fg.a);return {r:Math.round(fg.r*a+bg.r*(1-a)),g:Math.round(fg.g*a+bg.g*(1-a)),b:Math.round(fg.b*a+bg.b*(1-a)),a:1};}
  function effBg(el){var bg={r:255,g:255,b:255,a:1};var chain=[],n=el;while(n&&n!==document.documentElement){chain.push(n);n=n.parentElement;}chain.push(document.documentElement);
    for(var i=chain.length-1;i>=0;i--){var cs=getComputedStyle(chain[i]);var c=parseRGB(cs.backgroundColor);if(c&&c.a>0)bg=blend(c,bg);}
    return bg;}
  var out=[];
  document.querySelectorAll('.v34weakchip').forEach(function(el){
    if(el.closest('#v18fight')||el.closest('#v19fight'))return;
    var cs=getComputedStyle(el);var fg=parseRGB(cs.color)||{r:0,g:0,b:0,a:1};
    var bg=effBg(el);var f2=blend(fg,bg);
    var r=(Math.max(lum(f2),lum(bg))+0.05)/(Math.min(lum(f2),lum(bg))+0.05);
    var ctx='other';if(el.closest('.v15boss'))ctx='v15boss';else if(el.closest('.v18zonecard'))ctx='v18zone';else if(el.closest('.v19zonecard'))ctx='v19zone';else if(el.closest('.v18coll'))ctx='collection';else ctx=(el.parentElement&&el.parentElement.className)||'other';
    out.push({text:(el.textContent||'').trim().slice(0,44),color:cs.color,bg:'rgb('+bg.r+','+bg.g+','+bg.b+')',ratio:Math.round(r*100)/100,pass:r>=4.5,ctx:ctx});
  });
  return {n:out.length, allPass:out.length>0&&out.every(function(o){return o.pass}), worst:out.length?Math.min.apply(null,out.map(function(o){return o.ratio})):null, items:out.slice(0,14)};
})()`;

async function seedDue(n, dueMsFromNow) {
  return await ev(`(function(n,off){
    try{
      var st=window.__v14.state; st.box=st.box||{};
      var e15=window.__v15.en15(); e15.due=e15.due||{};
      var ws=window.__v15.words; var now=Date.now();
      for(var i=0;i<n&&i<ws.length;i++){ st.box[ws[i].id]=2; e15.due[ws[i].id]=now+off; }
      save();
      return {ok:true, seeded:n, due:window.__v15.counts.due, total:window.__v15.counts.total};
    }catch(err){return {ok:false,err:String(err)}}
  })(${n},${dueMsFromNow})`);
}
async function seedPets3() {
  return await ev(`(function(){
    try{
      var e=window.__v23._test.en23(); if(!e) return {ok:false,why:'no en23'};
      var sp=window.__v23.data().species||[];
      e.pets=e.pets||{}; e.team=e.team||[null,null,null];
      for(var i=0;i<3;i++){
        var inst=window.__v23._test.newPet(sp[i%sp.length].id);
        if(!inst) return {ok:false,why:'newPet failed'};
        inst.lv=3; inst.st=0; inst.xp=0;
        e.pets[inst.id]=inst; e.team[i]=inst.id;
      }
      save();
      return {ok:true, team:e.team.filter(Boolean).length};
    }catch(err){return {ok:false,err:String(err)}}
  })()`);
}

async function main() {
  await openPage();
  const errs0 = C.consoleErrors.length, warns0 = C.consoleWarns.length;

  // ================= G0 boot clean =================
  await step('G0-boot', async () => {
    const st = await ev(`(function(){return {hasV15:!!window.__v15, hasV45:!!window.__v45, words:window.__v15?window.__v15.words.length:0, title:document.title}})()`);
    verdict('G0 app boots with 0 console errors/warnings on fresh guest load', errs0 === 0 && warns0 === 0 && st.hasV15 && st.words > 4000, { errs: errs0, warns: warns0, st });
    return st;
  });

  // ================= G1 fresh due =================
  await freshGuest();
  await step('G1-fresh-due', async () => {
    const d = await ev(`(function(){
      var c=window.__v15.counts;
      var bar=document.getElementById('v15langbar');
      return {due:c.due, total:c.total, mastered:c.mastered, fresh:c['new'],
        langbar:bar?bar.textContent.replace(/\\s+/g,' ').trim().slice(0,160):null};
    })()`);
    verdict('G1a fresh save: counts15().due is 0 (was 4889)', d.due === 0, d);
    verdict('G1b fresh save: langbar says 0 cần ôn', typeof d.langbar === 'string' && d.langbar.indexOf('0 cần ôn') >= 0, d.langbar);
    await ev(`window.__v15.openHub('learn')`); await sleep(900);
    const head = await ev(`(function(){var h=document.querySelector('#v15hub .v15hub-title');return h?h.textContent.replace(/\\s+/g,' ').trim():null})()`);
    verdict('G1c EN hub head says 0 từ cần ôn hôm nay', typeof head === 'string' && head.indexOf('0 từ cần ôn hôm nay') >= 0, head);
    return { d, head };
  });

  // ================= G2 seeded 0 truly-due =================
  await step('G2-seeded-0-due', async () => {
    const s = await seedDue(10, 3 * 864e5); // 10 words box 2, due in 3 days
    await sleep(1200);
    verdict('G2a seeded 10 box-2 future-due words: counts.due stays 0', s.ok && s.due === 0, s);
    await ev(`window.__v15.tab('review')`); await sleep(900);
    const tab = await ev(`(function(){
      var b=document.getElementById('v15body');if(!b)return {noBody:true};
      var t=b.textContent.replace(/\\s+/g,' ').trim();
      var m=t.match(/từ cần ôn hôm nay/);
      var stat=(b.querySelector('.v15statgrid')||{}).textContent||'';
      var btn=[].map.call(b.querySelectorAll('button'),function(x){return x.textContent.trim()}).filter(function(x){return x.indexOf('Ôn tất cả')===0});
      return {stat0:stat.indexOf('0')===0, btn:btn, snippet:t.slice(0,220)};
    })()`);
    verdict('G2b Review tab shows 0 từ cần ôn (stat 0, button 0)', tab.stat0 === true && tab.btn.length === 1 && tab.btn[0].indexOf('(0)') >= 0, tab);
    await shot('review-0-due');
    // Click "Ôn tất cả từ cần ôn (0)" — must show an honest empty state, NOT start a session.
    const before = await ev(`(function(){var b=document.getElementById('v15body');return b?b.innerHTML.length:0})()`);
    const r = await ev(`(function(){
      try{
        var btns=document.querySelectorAll('#v15body button');
        for(var i=0;i<btns.length;i++){ if(btns[i].textContent.indexOf('Ôn tất cả từ cần ôn')===0){ btns[i].click(); return {ok:true, clicked:btns[i].textContent.trim()}; } }
        return {ok:false, why:'button not found'};
      }catch(err){return {ok:false,err:String(err)}}
    })()`);
    await sleep(400);
    const after = await ev(`(function(){
      var toasts=[].map.call(document.querySelectorAll('.v7toast, .pp'),function(x){return x.textContent});
      var b=document.getElementById('v15body');
      var hasQ=!!(b&&b.querySelector('.v15qcard'));
      var t=b?b.textContent:'';
      return {toasts:toasts, hasQuestionCard:hasQ, reviewTabStillShown:t.indexOf('Ôn tập thông minh')>=0, snippet:t.slice(0,200)};
    })()`);
    verdict('G2c reviewStart with 0 truly-due shows honest empty state, no session', r.ok && after.toasts.some(function(t){return t.indexOf('Không có từ nào cần ôn hôm nay')>=0}) && after.hasQuestionCard === false, { r, after });
    await shot('review-0-empty');
    // Now seed 3 TRULY-due words (box 2, due 1h ago) — due must be exactly 3.
    const s3 = await seedDue(3, -3600e3);
    await sleep(1200);
    verdict('G2d seeded 3 truly-due words (box 2, due past): counts.due is exactly 3', s3.ok && s3.due === 3, s3);
    await ev(`window.__v15.tab('review')`); await sleep(900);
    const tab3 = await ev(`(function(){
      var b=document.getElementById('v15body');if(!b)return {noBody:true};
      var stat=(b.querySelector('.v15statgrid')||{}).textContent||'';
      var btn=[].map.call(b.querySelectorAll('button'),function(x){return x.textContent.trim()}).filter(function(x){return x.indexOf('Ôn tất cả')===0});
      return {stat3:stat.indexOf('3')===0, btn:btn};
    })()`);
    verdict('G2e Review tab shows 3 từ cần ôn', tab3.stat3 === true && tab3.btn.length === 1 && tab3.btn[0].indexOf('(3)') >= 0, tab3);
    await ev(`window.__v15.reviewStart(false)`); await sleep(900);
    const sess = await ev(`(function(){
      var b=document.getElementById('v15body');if(!b)return {noBody:true};
      var q=b.querySelector('.v15qcard .v15qword');
      var w=q?q.textContent.trim():null;
      var box=w?(function(){var ws=window.__v15.words;for(var i=0;i<ws.length;i++)if(ws[i].en===w)return (window.__v14.state.box[ws[i].id]||0);return null})():null;
      return {word:w, box:box, hasQ:!!q};
    })()`);
    verdict('G2f Review session starts on a truly-due word (box>=1, not a new word)', sess.hasQ === true && sess.box >= 1, sess);
    await ev(`window.__v15.reviewClose()`); await sleep(600);
    return { s, tab, r, after, s3, tab3, sess };
  });

  // ================= G3 corrupt save =================
  await step('G3-corrupt', async () => {
    // (a) corrupt JSON
    await freshGuest();
    const seeded = await ev(`localStorage.setItem('hanvocab.v1','{corrupt-json-{{{'); location.reload(); 'reloading'`);
    await sleep(3200);
    const c = await ev(`(function(){
      var keys=[];for(var i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
      var q=keys.filter(function(k){return k.indexOf('hanvocab.v12.corrupt-')===0});
      var vals=q.map(function(k){return localStorage.getItem(k)});
      var cur=localStorage.getItem('hanvocab.v1')||'';
      var flag=window.__v45corruptShown||null;
      var toasts=[].map.call(document.querySelectorAll('.v7toast'),function(x){return x.textContent});
      return {qKeys:q, qVals:vals, curHasCorrupt:cur.indexOf('corrupt-json')>=0, curHasSample:cur.indexOf('안녕하세요')>=0, flag:flag, toasts:toasts, booted:!!window.__v15};
    })()`);
    verdict('G3a corrupt bytes survive boot byte-for-byte in a quarantine key', c.qVals.some(function(v){return v === '{corrupt-json-{{{'}), c);
    const warnedA = await pollToasts(4000);
    verdict('G3b corrupt boot shows an honest warning (flag + toast)', !!c.flag && c.flag.reason === 'bad-json' && warnedA.some(function(t){return t.indexOf('Không đọc được bản lưu') >= 0}), { c, warnedA });
    verdict('G3c corrupt boot still boots the fresh sample (no crash)', c.booted === true && c.curHasSample === true && c.curHasCorrupt === false, { booted: c.booted, curHasSample: c.curHasSample });
    await shot('corrupt-warning');
    // (b) valid JSON without cards, xp 9999
    const qBefore = c.qKeys.length;
    await ev(`localStorage.setItem('hanvocab.v1','{"xp":9999,"v7":{"meta":{"saveVersion":12}}}'); location.reload(); 'reloading'`);
    await sleep(3200);
    const nc = await ev(`(function(){
      var keys=[];for(var i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
      var q=keys.filter(function(k){return k.indexOf('hanvocab.v12.corrupt-')===0});
      var qVals=q.map(function(k){return localStorage.getItem(k)});
      var cur=localStorage.getItem('hanvocab.v1')||'';
      var flag=window.__v45corruptShown||null;
      var j=null;try{j=JSON.parse(cur)}catch(e){}
      return {qKeys:q, qVals:qVals, qN:q.length, curHas9999:cur.indexOf('9999')>=0, curHasSample:cur.indexOf('안녕하세요')>=0, flag:flag, xp:(j&&j.xp)||null};
    })()`);
    verdict('G3d card-less save is also quarantined (new key, not overwriting the first)', nc.qN === qBefore + 1 && nc.qVals.some(function(v){return v === '{"xp":9999,"v7":{"meta":{"saveVersion":12}}}'}), nc);
    const warnedB = await pollToasts(4000);
    verdict('G3e card-less boot warns (no-cards) and boots fresh', !!nc.flag && nc.flag.reason === 'no-cards' && nc.curHasSample === true && warnedB.some(function(t){return t.indexOf('Không đọc được bản lưu') >= 0}), { nc, warnedB });
    // (c) valid save boots normally, xp kept, no new quarantine key
    const valid = await ev(`(function(){
      var cur=localStorage.getItem('hanvocab.v1')||'';
      var j=JSON.parse(cur); j.xp=9999; var raw=JSON.stringify(j);
      localStorage.setItem('hanvocab.v1', raw);
      return {ok:true, cards:(j.cards||[]).length, rawLen:raw.length};
    })()`);
    const qBeforeValid = nc.qN;
    await ev(`localStorage.setItem('hanvocab.v1', (function(){var cur=localStorage.getItem('hanvocab.v1');var j=JSON.parse(cur);j.xp=9999;return JSON.stringify(j)})()); location.reload(); 'reloading'`);
    await sleep(3200);
    const v = await ev(`(function(){
      var keys=[];for(var i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
      var q=keys.filter(function(k){return k.indexOf('hanvocab.v12.corrupt-')===0});
      var j=null;try{j=JSON.parse(localStorage.getItem('hanvocab.v1')||'')}catch(e){}
      return {qN:q.length, xp:j?j.xp:null, cards:j&&j.cards?j.cards.length:null, flag:window.__v45corruptShown||null};
    })()`);
    verdict('G3f valid save boots normally (xp 9999 kept, cards kept, no quarantine)', v.xp === 9999 && v.cards === valid.cards && v.qN === qBeforeValid && !v.flag, { valid, v });
    return { c, nc, valid, v };
  });

  // ================= G4 snapshot uniqueness =================
  await step('G4-snapshot', async () => {
    const s = await ev(`(function(){
      try{
        var realNow=Date.now;
        Date.now=function(){return 1790000000000};
        var k1=window.__v31._test.snapshotCurrent();
        var j1=JSON.parse(localStorage.getItem('hanvocab.v1')||'{}'); j1.xp=1111; localStorage.setItem('hanvocab.v1', JSON.stringify(j1));
        var k2=window.__v31._test.snapshotCurrent();
        Date.now=realNow;
        var keys=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('hanvocab.v12.preimport-')===0)keys.push(k)}
        var v1=null,v2=null;try{v1=JSON.parse(localStorage.getItem(k1)||'null')}catch(e){} try{v2=JSON.parse(localStorage.getItem(k2)||'null')}catch(e){}
        var newest=window.__v31._test.newestPreRestoreKey();
        return {ok:true, k1:k1, k2:k2, distinct:k1!==k2, bothPresent:!!v1&&!!v2, xp1:v1?v1.xp:null, xp2:v2?v2.xp:null, newest:newest, preimportN:keys.length};
      }catch(err){return {ok:false,err:String(err)}}
    })()`);
    verdict('G4a two snapshots in the same ms get DISTINCT keys', s.ok && s.distinct === true, s);
    verdict('G4b both snapshots survive with their own contents', s.ok && s.bothPresent === true && s.xp2 === 1111 && s.xp1 !== 1111, s);
    verdict('G4c newestPreRestoreKey still resolves (parseInt prefix intact)', s.ok && typeof s.newest === 'string' && s.newest.indexOf('hanvocab.v12.preimport-') === 0, s);
    return s;
  });

  // ================= G5 Topics tab =================
  await step('G5-topics', async () => {
    await freshGuest();
    await ev(`S.opt.mode='en'; save(); location.reload(); 'reloading'`);
    await sleep(3000);
    await ev(`window.__v14.ex('topics')`); await sleep(1200);
    const t = await ev(`(function(){
      var cards=document.querySelectorAll('.entopic');
      var imgs=[].map.call(document.querySelectorAll('.entopic img'),function(im){return {src:im.getAttribute('src'), broken:im.complete&&im.naturalWidth===0}});
      var undef=imgs.filter(function(x){return (x.src||'').indexOf('undefined')>=0});
      var broken=imgs.filter(function(x){return x.broken});
      return {cards:cards.length, imgs:imgs.length, undefN:undef.length, undefSrcs:undef.map(function(x){return x.src}), brokenN:broken.length, brokenSrcs:broken.map(function(x){return x.src})};
    })()`);
    verdict('G5a Topics tab: 52 cards, 0 undefined icon URLs', t.cards === 52 && t.undefN === 0, t);
    verdict('G5b Topics tab: only the known #6 missing files remain broken (shop/bubble)', t.brokenN === 2 && t.brokenSrcs.every(function(s){return s.indexOf('shop.png')>=0||s.indexOf('bubble.png')>=0}), t);
    await shot('topics-tab');
    // BT attach adds a 53rd topic (bt, no icon) — guard must cover it too.
    const bt = await ev(`(function(){
      try{
        if(window.__v22&&__v22.ensureData){ return {hasEnsure:true}; }
        return {hasEnsure:false};
      }catch(err){return {ok:false,err:String(err)}}
    })()`);
    if (bt.hasEnsure) {
      await ev(`window.__v22.ensureData().then(function(){window.__v15.attachBT(); window.__v14.ex('topics')})`);
      await sleep(2500);
      const t2 = await ev(`(function(){
        var cards=document.querySelectorAll('.entopic');
        var imgs=[].map.call(document.querySelectorAll('.entopic img'),function(im){return im.getAttribute('src')});
        var undef=imgs.filter(function(s){return (s||'').indexOf('undefined')>=0});
        return {cards:cards.length, undefN:undef.length};
      })()`);
      verdict('G5c after BT attach: still 0 undefined icons (53rd BT card covered)', t2.undefN === 0, t2);
      return { t, bt, t2 };
    }
    return { t, bt };
  });

  // ================= G6 weakchip contrast =================
  async function measureChipsAt(w, h, dark, label) {
    await setViewport(w, h, w <= 430, dark);
    await sleep(900);
    const m = await ev(MEASURE_CHIPS);
    verdict(`G6 ${label}: ${m.n} list-row chips, all >= 4.5:1 (worst ${m.worst})`, m.allPass === true, m);
    return m;
  }
  await step('G6-weakchip', async () => {
    await freshGuest();
    await ev(`window.__v15.openHub('bosses')`); await sleep(1000);
    const m1280L = await measureChipsAt(1280, 800, false, 'light 1280 bosses-hub');
    await shot('weakchip-light-1280');
    const m1280D = await measureChipsAt(1280, 800, true, 'dark 1280 bosses-hub');
    await shot('weakchip-dark-1280');
    // Collection tab (same chips, different container).
    await setViewport(1280, 800, false, false); await sleep(600);
    await ev(`window.__v15.tab('collection')`); await sleep(1000);
    const mCollL = await measureChipsAt(1280, 800, false, 'light 1280 collection');
    const mCollD = await measureChipsAt(1280, 800, true, 'dark 1280 collection');
    // Zone cards: V19 map zone detail (v19zboss cards carry weakChipHTML;
    // V18 arena boss cards do NOT — verified: 10 cards, 0 chips there).
    await setViewport(1280, 800, false, false); await sleep(600);
    await ev(`window.__v19.openMap()`); await sleep(900);
    await ev(`window.__v19.zoneDetail('z1')`); await sleep(1000);
    const zoneOk = await ev(`(function(){return {zoneCards:document.querySelectorAll('.v19zboss').length, chips:document.querySelectorAll('.v19zboss .v34weakchip').length}})()`);
    verdict('G6 zone view renders V19 z1 cards with weakchips', zoneOk.zoneCards > 0 && zoneOk.chips > 0, zoneOk);
    const mZoneL = await measureChipsAt(1280, 800, false, 'light 1280 v19-zone-z1');
    const mZoneD = await measureChipsAt(1280, 800, true, 'dark 1280 v19-zone-z1');
    // 1366 + 360 viewports (reopen the bosses hub first — the arena view was showing).
    await setViewport(1366, 768, false, false); await sleep(600);
    await ev(`window.__v15.openHub('bosses')`); await sleep(900);
    const m1366L = await measureChipsAt(1366, 768, false, 'light 1366 bosses-hub');
    await ev(`window.__v15.openHub('bosses')`); await sleep(900);
    const m360L = await measureChipsAt(360, 800, false, 'light 360 bosses-hub');
    const m360D = await measureChipsAt(360, 800, true, 'dark 360 bosses-hub');
    await shot('weakchip-360');
    return { m1280L, m1280D, mCollL, mCollD, mZoneL, mZoneD, m1366L, m360L, m360D };
  });

  // ================= G7 regression =================
  await step('G7-regression', async () => {
    await freshGuest();
    await setViewport(1280, 800, false, false); await sleep(500);
    // Seed arena unlocks BEFORE opening arena views (5 Elemental wins).
    await ev(`(function(){var e=window.__v18._test.en18();['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};}); save(); return true})()`);
    await sleep(800);
    // Legendary fight start timing (direct fight(), mastered 0).
    // NOTE: #v18fight only exists inside the open hub/arena view — open it first.
    await ev(`window.__v15.openHub('bosses')`); await sleep(800);
    await ev(`window.__v18.openArena('leg')`); await sleep(800);
    const leg = await ev(`(function(){
      try{
        var e=window.__v18._test.en18();
        ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
        window.__v14.state.box={}; save();
        var t0=performance.now();
        window.__v18.fight('v10_firedragon','en');
        var dt=performance.now()-t0;
        var F=window.__v18._test.F();
        var out={ok:!!F, ms:Math.round(dt*10)/10, boss:F?F.boss.id:null, lang:F?F.lang:null, poolWords:F&&F.pools?F.pools.words.length:null, poolGrammar:F&&F.pools?F.pools.grammar.length:null};
        window.__v18.close();
        return out;
      }catch(err){return {ok:false,err:String(err)}}
    })()`);
    verdict('G7a Legendary fight start is prompt (<500 ms, pools 550/24)', leg.ok && leg.ms < 500 && leg.poolWords === 550 && leg.poolGrammar === 24, leg);
    // Real UI clicks (repro-v44 pattern): "Khiêu chiến" on the fire dragon,
    // then the 🇬🇧 Tiếng Anh language-pick button.
    const ui = await ev(`(function(){
      try{
        var btns=[].slice.call(document.querySelectorAll('#v15body .v18boss .btn.pri'));
        var b=btns.filter(function(x){return (x.getAttribute('onclick')||'').indexOf('v10_firedragon')>=0;})[0];
        if(!b) return {ok:false,why:'no firedragon button'};
        var t0=performance.now(); b.click(); var t1=performance.now();
        var langBtns=[].slice.call(document.querySelectorAll('#v18fight .btn.pri'));
        if(!langBtns.length) return {ok:false,why:'no lang button', click1Ms:Math.round((t1-t0)*10)/10};
        var t2=performance.now(); langBtns[0].click(); var t3=performance.now();
        var F=window.__v18._test.F();
        return {ok:true, click1Ms:Math.round((t1-t0)*10)/10, click2Ms:Math.round((t3-t2)*10)/10,
          boss:F&&F.boss.id, lang:F&&F.lang, qmode:F&&F.qmode,
          questionRendered:!!document.querySelector('#v18fight .v18qword'),
          poolWords:F&&F.pools?F.pools.words.length:null, poolGrammar:F&&F.pools?F.pools.grammar.length:null};
      }catch(err){return {ok:false,err:String(err)}}
    })()`);
    verdict('G7b real UI clicks are prompt ("Khiêu chiến" + Tiếng Anh, each <500 ms, first question renders)', ui.ok && ui.click1Ms < 500 && ui.click2Ms < 500 && ui.questionRendered === true && ui.poolWords === 550, ui);
    await ev(`window.__v18.close()`); await sleep(400);
    // C-02 pet-skill shield halving (Panda). The pet battle bar (which sets
    // _fightF) only renders inside the open arena view — open it first.
    await ev(`window.__v15.openHub('bosses')`); await sleep(800);
    await ev(`window.__v18.openArena('el')`); await sleep(800);
    const c02 = await ev(`(function(){
      try{
        var e=window.__v18.en18();
        ['v10_slime','v10_fairy','v10_dragon','v10_ghost','v10_spider','v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){ e.bosses[id]={win:1,wins:1,at:Date.now(),item:'x'}; });
        S.v7.en23={pets:{p1:{id:'p1',sp:'dragon',st:1,lv:10,xp:0,aff:0}},team:['p1',null,null],eggs:{fire:1,forest:1},hatch:null,mats:{},claimed:{},affClaimed:{},created:1};
        window.__T45_MSGS=[];
        var orig=window.__v15.pop15;
        window.__v15.pop15=function(t){ window.__T45_MSGS.push(String(t)); try{ return orig(t); }catch(e){} };
        window.__v18.fight('v10_panda','en');
        var F=window.__v18._test.F();
        var out0={ok:!!F, hp:F?F.hp:null, shield:F?F.shield:null, pet:!!(F&&F.pet), activeVal:F&&F.pet?F.pet.activeVal:null};
        F.pet.energy=10;
        window.__v23.castSkillInFight();
        var F2=window.__v18._test.F();
        var out={start:out0, hp:F2.hp, shield:F2.shield, over:F2.over, msg:window.__T45_MSGS[window.__T45_MSGS.length-1]||null};
        window.__v18.close();
        return out;
      }catch(err){return {ok:false,err:String(err)}}
    })()`);
    verdict('G7c C-02 team skill vs shield: HP 150->125, shield 30->5, toast "Gây 25 sát thương"', c02.start && c02.start.hp === 150 && c02.start.shield === 30 && c02.hp === 125 && c02.shield === 5 && typeof c02.msg === 'string' && c02.msg.indexOf('Gây 25 sát thương') >= 0, c02);
    // V19 Counterattack 3/3.
    const ca = await ev(`(function(){
      try{
        window.__v19.openMapFor('en'); window.__v19.fight('v11_fireking');
        var F=window.__v19._test.F();
        var out={opened:!!F, maxHp:F?F.maxHp:null, qmode0:F?F.qmode:null};
        F.hp=75; F.pet.energy=10;
        window.__v23.castSkillInFight();
        var F2=window.__v19._test.F();
        out.afterSkill={hp:F2.hp, ultActive:F2.ultActive, caQ:F2.caQ, caRight:F2.caRight, phase:F2.phase};
        F2.hp=200;
        var okPick=window.__v19._test.pickCorrect();
        var F3=window.__v19._test.F();
        out.pickOk=okPick;
        out.afterInflight={hp:F3.hp, caRight:F3.caRight, score:F3.score, right:F3.right, qmode:F3.qmode, ultActive:F3.ultActive};
        window.__v19._test.next();
        var F4=window.__v19._test.F();
        out.afterNext={qmode:F4.qmode, caQ:F4.caQ, caRight:F4.caRight};
        for(var i=0;i<3;i++){ window.__v19._test.pickCorrect(); window.__v19._test.next(); }
        var F5=window.__v19._test.F();
        out.afterCA={caRight:F5.caRight, hearts:F5.hearts, phase:F5.phase, banner:F5.banner, over:F5.over, hp:F5.hp};
        return out;
      }catch(err){return {ok:false,err:String(err)}}
    })()`);
    verdict('G7d V19 Counterattack: in-flight normal answer not counted, perfect 3/3 resolves', ca.opened && ca.maxHp === 325 && ca.afterSkill.hp === 25 && ca.afterInflight.caRight === 0 && ca.afterCA.caRight === 3 && ca.afterCA.hearts === 5, ca);
    // A-F2: KO <8 banner persists past Q1 (fresh KO deck, 3 cards).
    const af2 = await ev(`(function(){
      try{
        S.cards=(S.cards||[]).filter(function(c){return c&&c.h&&c.m;}).slice(0,3); save();
        window.__v18.fight('v10_slime','ko');
        var F=window.__v18._test.F();
        var q1={banner:F&&F.banner, koWarn:F&&F.koWarn, lang:F&&F.lang};
        window.__v18._test.pickCorrect(); window.__v18.next();
        var F2=window.__v18._test.F();
        var q2={banner:F2&&F2.banner, koWarn:F2&&F2.koWarn};
        window.__v18.close();
        return {ok:!!F, q1:q1, q2:q2};
      }catch(err){return {ok:false,err:String(err)}}
    })()`);
    verdict('G7e A-F2 KO <8 banner persists past Q1 (koWarn 3/8 at Q1, banner still koWarn at Q2)', af2.ok && typeof af2.q1.koWarn === 'string' && af2.q1.koWarn.indexOf('3/8') >= 0 && af2.q2.banner === af2.q2.koWarn && af2.q2.banner === af2.q1.koWarn, af2);
    // B-8: BT flashcards on fresh load.
    const b8 = await ev(`(function(){
      try{
        if(!window.__v22||!window.__v22.ensureData) return {ok:false,why:'no ensureData'};
        return {ok:true, hasEnsure:true};
      }catch(err){return {ok:false,err:String(err)}}
    })()`);
    if (b8.hasEnsure) {
      await ev(`window.__v22.ensureData().then(function(){ window.__v15.openHub('learn'); })`);
      await sleep(2500);
      const b8b = await ev(`(function(){
        try{
          var n=window.__v15.words.filter(function(w){return (w.lib||[]).indexOf('bt')>=0}).length;
          return {ok:true, btWords:n};
        }catch(err){return {ok:false,err:String(err)}}
      })()`);
      verdict('G7f B-8 BT words attach on fresh load (771 BT words, flashcards render)', b8b.ok && b8b.btWords >= 700, b8b);
      return { leg, ui, c02, ca, af2, b8, b8b };
    }
    return { leg, ui, c02, ca, af2, b8 };
  });

  // ================= G8 console summary =================
  await step('G8-console', async () => {
    const sum = { errors: C.consoleErrors, warns: C.consoleWarns, dialogs: C.dialogs };
    verdict('G8 0 console errors, 0 warnings, 0 JS dialogs across all gates', sum.errors.length === 0 && sum.warns.length === 0 && sum.dialogs.length === 0, sum);
    return sum;
  });

  const passed = verdicts.filter(v => v.pass).length;
  const failed = verdicts.filter(v => !v.pass);
  note(`\nverify-v45c: ${passed}/${verdicts.length} PASS` + (failed.length ? ` — FAILURES: ${failed.map(f => f.name).join(' | ')}` : ''));
  saveResults();
  close();
  process.exit(0);
}

main().catch(e => { console.error('verify-v45c crashed:', e); try { close(); } catch (_) {} process.exit(2); });
