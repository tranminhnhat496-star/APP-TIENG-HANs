// verify-v54c.js - V19.7 (layer V54) Chrome verification driver.
// Real Chrome 157 via CDP, local HTTP. Parameterised so the SAME driver
// runs on the built tree (default: private out) or the unzipped ZIP dir.
//   node tools/v54/verify-v54c.js [DIR] [httpPort] [cdpPort] [profile] [resultsFile] [shotPrefix]
// Defaults: DIR=v7build/out, http 8764, cdp 9244, profile
// chrome-v54c-prof, results tools/v54/logs/v54c-results.json, shots v54c-*.
// Ports 8764/9244 are deliberately different from the v51/v52/v53 runs.
// Exit 0 = driver completed (verdicts in the results JSON + stdout).
// Gates:
//   G0 boot clean (fresh guest, title V19.7, __v54 19.7.0, __V54_SEED 50 rows,
//      WORDS 4892, 0 console errors/warnings/dialogs)
//   G1 data view shows the "Nhap hang loat tieng Han" entry button; clicking
//      it opens the #v54hub overlay with the seed section
//   G2 dry-run by real DOM clicks: pasted 7-row TSV -> preview shows
//      total 7, willAdd 2, dupExisting 2, dupBatch 1, noSource 1, noLicense 1,
//      license CC BY-SA 2.0 KR, sample rows
//   G3 confirm by real DOM click: new deck appears, cards grow 2 -> 4,
//      new cards carry src/lic/lvl, backup key exists, batch history shows
//      the import with a Hoan tac button
//   G4 seed import by real DOM clicks: dry-run 50/50, confirm -> 70 cards,
//      KRDict deck created, all 50 carry src/lic/lvl/kid; KO Forge gate
//      opens and koSent >= 50 (the import feeds the Forge pool)
//   G5 dedup keeps distinct senses: same headword twice with different
//      meanings -> both kept; same h+m -> skipped (willAdd 1, dup 1+1)
//   G6 flag off: entry button hidden, overlay shows the flag-off message;
//      flag back on restores it
//   G7 360px: overlay has no horizontal overflow; .v54tag and .v54btn.pri
//      contrast >= 4.5 (tag >= 7)
//   G8 console/dialog summary: 0 errors, 0 warnings, 0 JS dialogs
// HONEST LIMITS: real rendering/layout/paint in headless Chrome 157;
// live-phone (real Android TTS), live-Firebase and
// first-open-on-GitHub-Pages gates stay Anh-only. No speech recognition
// is involved in V19.7.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const POLICY = '/tmp/webgl-policy.txt';
const DIR = process.argv[2] || '/home/hatch/workspace/v7build/out';
const HTTPPORT = parseInt(process.argv[3] || '8764', 10);
const PORT = parseInt(process.argv[4] || '9244', 10);
const PROFILE = process.argv[5] || 'chrome-v54c-prof';
const RESULTS_FILE = process.argv[6] || 'v54c-results.json';
const SHOT_PREFIX = process.argv[7] || 'v54c';
const TDIR = '/home/hatch/workspace/v7build/tools/v54';
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

// --- V54 in-page helpers ---
const IMP_TSV = [
  '사과\tquả táo\t\t\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
  '사과\tquả táo chua\t\t사과가 시어요.\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
  '밥\tcơm\t\t\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
  '김치\tkim chi\t\t\t\t\t\t',
  '물\tnước\t\t\t\t한국어기초사전 (KRDict)\t\t',
  '학교\ttrường học\t\t학교에 가요.\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
  '학교\ttrường học\t\t학교에 가요.\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
].join('\n');
const EXIST54 = [
  { id: 'x0', d: 'dX', g: 'Đồ ăn', h: '사과', m: 'quả táo', p: '', e: '사과를 먹어요.', box: 1 },
  { id: 'x1', d: 'dX', g: 'Đồ ăn', h: '밥', m: 'cơm', p: '', e: '밥을 먹어요.', box: 1 },
];
async function seedCards54() {
  return await ev('(function(){'
    + 'var s; try{ s=S; }catch(e){ return {err:"no S"}; }'
    + 's.cards=' + JSON.stringify(EXIST54) + ';'
    + 's.decks=[{id:"dX",name:"Deck X"},{id:"dY",name:"Deck Y"}];'
    + 's.deck="dX";'
    + 'try{ save(); }catch(e){}'
    + 'return {n:s.cards.length};'
    + '})()');
}
async function openDataView() {
  await ev(`setView('data')`);
  await sleep(900);
}
async function entryButton() {
  return await ev(`(function(){ var b=document.getElementById('v54open'); return b ? {found:true, text:b.textContent.trim(), visible: b.offsetParent!==null} : {found:false}; })()`);
}
async function clickEntryButton() {
  return await ev(`(function(){ var b=document.getElementById('v54open'); if(!b) return {found:false}; b.click(); return {found:true}; })()`);
}
async function hub54() {
  return await ev(`(function(){ var h=document.getElementById('v54hub'); if(!h) return {found:false}; return {found:true, display:h.style.display, html:h.innerHTML}; })()`);
}
async function hub54Text() {
  const h = await hub54();
  return h.found ? h.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}
async function clickHub54Button(label) {
  return await ev(`(function(){
    var btns=[].slice.call(document.querySelectorAll('#v54hub .v54btn, #v54hub .v54x'));
    var b=btns.filter(function(x){return x.textContent.indexOf(${JSON.stringify(label)})>=0;})[0];
    if(!b) return {found:false};
    b.click(); return {found:true, disabled: !!b.disabled};
  })()`);
}
async function setForm54(text, deckName, src, lic, lvl) {
  return await ev(`(function(){
    var ta=document.getElementById('v54ta'); if(ta) ta.value=${JSON.stringify(text)};
    var d=document.getElementById('v54deck'); if(d) d.value=${JSON.stringify(deckName)};
    var s=document.getElementById('v54src'); if(s) s.value=${JSON.stringify(src || '')};
    var l=document.getElementById('v54lic'); if(l) l.value=${JSON.stringify(lic || '')};
    var lv=document.getElementById('v54lvl'); if(lv) lv.value=${JSON.stringify(lvl || '')};
    return {ta: !!ta, deck: !!d};
  })()`);
}
async function cards54Live() {
  return await ev(`S.cards.map(function(c){return {id:c.id,d:c.d,h:c.h,m:c.m,box:c.box,src:c.src||'',lic:c.lic||'',lvl:c.lvl||'',kid:c.kid||''}})`);
}
async function chipContrast(sel) {
  return await ev(`(function(){
    function lum(rgb){
      var m=rgb.match(/(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)/); if(!m) return null;
      var f=function(v){ v=v/255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
      return 0.2126*f(+m[1])+0.7152*f(+m[2])+0.0722*f(+m[3]);
    }
    var el=document.querySelector('${sel}'); if(!el) return {found:false};
    var cs=getComputedStyle(el);
    var L1=lum(cs.color), L2=lum(cs.backgroundColor);
    if(L1===null||L2===null) return {found:true, color:cs.color, bg:cs.backgroundColor, ratio:null};
    var hi=Math.max(L1,L2), lo=Math.min(L1,L2);
    return {found:true, color:cs.color, bg:cs.backgroundColor, ratio:Math.round(((hi+0.05)/(lo+0.05))*100)/100};
  })()`);
}
async function overflowAt() {
  return await ev(`({scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, bodyScrollW: document.body ? document.body.scrollWidth : null})`);
}

async function main() {
  await openPage();
  // G0 — boot clean.
  await step('G0-boot', async () => {
    const boot = await ev(`(function(){ return {title: document.title, hasV54: !!window.__v54, v54: window.__v54&&window.__v54.version, seedRows: (window.__V54_SEED&&window.__V54_SEED.rows||[]).length, seedLic: window.__V54_SEED&&window.__V54_SEED.license, hasV53: !!window.__v53, v53: window.__v53&&window.__v53.version, hasV51: !!window.__v51, words: (window.__v15&&window.__v15.words||[]).length}; })()`);
    const servedTitle = await (await fetch(URL)).text().then(t => (t.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
    verdict('G0.1 served title is V19.7 Bulk KO Import', servedTitle.includes('V19.7 — Bulk KO Import'), servedTitle);
    verdict('G0.2 __v54 19.7.0 present', boot.hasV54 && boot.v54 === '19.7.0', boot);
    verdict('G0.3 __V54_SEED 50 rows, CC BY-SA 2.0 KR', boot.seedRows === 50 && boot.seedLic === 'CC BY-SA 2.0 KR', boot);
    verdict('G0.4 __v53 19.6.1 + __v51 present', boot.hasV53 && boot.v53 === '19.6.1' && boot.hasV51, boot);
    verdict('G0.5 WORDS 4892', boot.words === 4892, boot.words);
    verdict('G0.6 0 console errors at boot', C.consoleErrors.length === 0, C.consoleErrors);
    verdict('G0.7 0 console warnings at boot', C.consoleWarns.length === 0, C.consoleWarns);
    verdict('G0.8 0 dialogs at boot', C.dialogs.length === 0, C.dialogs);
    return boot;
  });

  // G1 — entry button in the KO data view.
  await step('G1-entry-button', async () => {
    await freshGuest();
    await seedCards54();
    await openDataView();
    const btn = await entryButton();
    verdict('G1.1 entry button present in the data view', btn.found === true && btn.text.indexOf('Nhập hàng loạt tiếng Hàn') >= 0, btn);
    const clicked = await clickEntryButton();
    await sleep(600);
    const hub = await hub54();
    verdict('G1.2 click opens the #v54hub overlay', clicked.found === true && hub.found === true && hub.display === 'flex', { clicked, display: hub.display });
    const txt = await hub54Text();
    verdict('G1.3 overlay shows the title + seed section', txt.indexOf('Nhập hàng loạt tiếng Hàn') >= 0 && txt.indexOf('Bộ hạt giống') >= 0 && txt.indexOf('50 từ cơ bản') >= 0, txt.slice(0, 300));
    verdict('G1.4 overlay shows the backup section (empty state)', txt.indexOf('Bản sao lưu trước khi nhập') >= 0 && txt.indexOf('Chưa có lần nhập nào') >= 0, txt.slice(0, 300));
    await shot('g1-v54-overlay');
    return { btn, txt: txt.slice(0, 200) };
  });

  // G2 — dry-run preview by real DOM clicks.
  await step('G2-dry-run', async () => {
    const form = await setForm54(IMP_TSV, 'Bộ test Chrome', '', '', '');
    verdict('G2.0 form fields present and set', form.ta === true && form.deck === true, form);
    const clicked = await clickHub54Button('Xem trước (dry-run)');
    await sleep(500);
    verdict('G2.1 dry-run button clicked', clicked.found === true, clicked);
    const txt = await hub54Text();
    verdict('G2.2 preview: total 7, willAdd 2', txt.indexOf('Tổng 7 dòng') >= 0 && txt.indexOf('Sẽ thêm 2 từ mới') >= 0, txt.slice(0, 400));
    verdict('G2.3 preview: dupExisting 2, dupBatch 1', txt.indexOf('Trùng với từ đã có: 2') >= 0 && txt.indexOf('Trùng trong file: 1') >= 0, txt.slice(0, 400));
    verdict('G2.4 preview: noSource 1, noLicense 1', txt.indexOf('Thiếu nguồn (không nhập): 1') >= 0 && txt.indexOf('Thiếu giấy phép (không nhập): 1') >= 0, txt.slice(0, 400));
    verdict('G2.5 preview: license shown (per-row CC BY-SA 2.0 KR)', txt.indexOf('CC BY-SA 2.0 KR') >= 0, txt.slice(0, 400));
    verdict('G2.6 preview: sample shows the new sense 사과 / quả táo chua', txt.indexOf('quả táo chua') >= 0, txt.slice(0, 500));
    verdict('G2.7 preview: skipped rows named (김치, 물)', txt.indexOf('김치') >= 0 && txt.indexOf('물') >= 0, txt.slice(0, 600));
    await shot('g2-v54-preview');
    return { txt: txt.slice(0, 200) };
  });

  // G3 — confirm by real DOM click.
  await step('G3-confirm', async () => {
    const before = await cards54Live();
    const clicked = await clickHub54Button('Xác nhận nhập 2 từ');
    await sleep(600);
    verdict('G3.1 confirm button clicked', clicked.found === true && clicked.disabled === false, clicked);
    const txt = await hub54Text();
    verdict('G3.2 success message names the deck + backup', txt.indexOf('Đã nhập 2 từ vào bộ') >= 0 && txt.indexOf('Bộ test Chrome') >= 0 && txt.indexOf('bản sao lưu') >= 0, txt.slice(0, 300));
    const after = await cards54Live();
    verdict('G3.3 cards grow 2 -> 4', before.length === 2 && after.length === 4, { before: before.length, after: after.length });
    const news = after.filter(c => c.src !== '');
    verdict('G3.4 new deck exists', await ev(`S.decks.some(function(d){return d.name==='Bộ test Chrome'})`) === true);
    verdict('G3.5 new cards carry src/lic/lvl', news.length === 2 && news.every(c => c.src === '한국어기초사전 (KRDict)' && c.lic === 'CC BY-SA 2.0 KR' && c.lvl === '초급'), news);
    const bk = await ev(`(function(){ var e=S.v7.en54||{}; return {backs:(e.backups||[]).length, key:(e.backups||[])[0]&&e.backups[0].key, ls: localStorage.getItem((e.backups||[])[0]&&e.backups[0].key||'')!==null, batches:(e.batches||[]).length}; })()`);
    verdict('G3.6 backup recorded + snapshot key exists in localStorage', bk.backs === 1 && bk.ls === true, bk);
    verdict('G3.7 batch history shows the import with a Hoàn tác button', txt.indexOf('Lịch sử nhập (1)') >= 0 && txt.indexOf('Hoàn tác') >= 0, txt.slice(0, 400));
    verdict('G3.8 backup list shows a Khôi phục button', txt.indexOf('Khôi phục') >= 0, txt.slice(0, 400));
    await shot('g3-v54-confirmed');
    await ev(`window.__v54.close()`);
    return { before: before.length, after: after.length, bk };
  });

  // G4 — seed import by real DOM clicks.
  await step('G4-seed-import', async () => {
    await freshGuest();
    await ev(`window.__v54.open()`);
    await sleep(600);
    const clicked = await clickHub54Button('Xem trước bộ hạt giống');
    await sleep(500);
    verdict('G4.1 seed dry-run button clicked', clicked.found === true, clicked);
    const txt = await hub54Text();
    verdict('G4.2 seed preview: total 50, willAdd 50', txt.indexOf('Tổng 50 dòng') >= 0 && txt.indexOf('Sẽ thêm 50 từ mới') >= 0, txt.slice(0, 400));
    verdict('G4.3 seed preview: KRDict deck + license', txt.indexOf('KRDict · 초급 (50 từ)') >= 0 && txt.indexOf('CC BY-SA 2.0 KR') >= 0, txt.slice(0, 400));
    const c0 = await cards54Live();
    const ok = await clickHub54Button('Xác nhận nhập 50 từ');
    await sleep(800);
    verdict('G4.4 seed confirm clicked', ok.found === true, ok);
    const txt2 = await hub54Text();
    verdict('G4.5 success message: 50 words imported', txt2.indexOf('Đã nhập 50 từ vào bộ') >= 0, txt2.slice(0, 300));
    const c1 = await cards54Live();
    verdict('G4.6 cards grow 20 -> 70', c0.length === 20 && c1.length === 70, { c0: c0.length, c1: c1.length });
    const imported = c1.filter(c => c.src !== '');
    verdict('G4.7 all 50 carry src/lic/lvl/kid', imported.length === 50 && imported.every(c => c.lic === 'CC BY-SA 2.0 KR' && c.lvl === '초급' && !!c.kid), imported.length);
    verdict('G4.8 KRDict deck created', await ev(`S.decks.some(function(d){return d.name==='KRDict · 초급 (50 từ)'})`) === true);
    // The import feeds the KO Forge pool (the V19.7 consequence).
    // Imported cards start at box 0, so the gate still needs 8 LEARNED
    // cards — but the sentence shortage ('ko-sent') is gone: the blocker
    // is now 'ko-words'. Mark 8 imported cards learned and the gate opens.
    const pool = await ev(`(function(){ var p=window.__v48._test.forgePool('ko'); var g=window.__v48._test.forgeGate('ko'); return {koSent:p.koSent, gateOk:g.ok, why:g.why||null, learned:p.learned}; })()`);
    verdict('G4.9 KO Forge pool holds >= 50 seed sentences', pool.koSent >= 50, pool);
    verdict('G4.10 gate blocker is now ko-words, not ko-sent (sentences fixed)', pool.gateOk === false && pool.why === 'ko-words' && pool.learned === 0, pool);
    await ev(`(function(){ var n=0; S.cards.forEach(function(c){ if(c.src && n<8){ c.box=1; n++; } }); return n; })()`);
    const pool2 = await ev(`(function(){ var p=window.__v48._test.forgePool('ko'); var g=window.__v48._test.forgeGate('ko'); return {koSent:p.koSent, gateOk:g.ok, learned:p.learned}; })()`);
    verdict('G4.11 gate opens once 8 imported cards are learned', pool2.gateOk === true && pool2.learned === 8, pool2);
    await shot('g4-v54-seed');
    await ev(`window.__v54.close()`);
    return { c0: c0.length, c1: c1.length, pool };
  });

  // G5 — dedup keeps distinct senses.
  await step('G5-dedup-senses', async () => {
    await freshGuest();
    await seedCards54();
    await ev(`window.__v54.open()`);
    await sleep(600);
    const rows = [
      '사과\tquả táo\t\t\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
      '사과\tquả táo chua\t\t사과가 시어요.\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
      '사과\tquả táo chua\t\t사과가 시어요.\t\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급',
    ].join('\n');
    await setForm54(rows, 'Bộ test Chrome 2', '', '', '');
    await clickHub54Button('Xem trước (dry-run)');
    await sleep(500);
    const txt = await hub54Text();
    verdict('G5.1 preview: total 3, willAdd 1 (new sense only)', txt.indexOf('Tổng 3 dòng') >= 0 && txt.indexOf('Sẽ thêm 1 từ mới') >= 0, txt.slice(0, 400));
    verdict('G5.2 preview: dupExisting 1, dupBatch 1', txt.indexOf('Trùng với từ đã có: 1') >= 0 && txt.indexOf('Trùng trong file: 1') >= 0, txt.slice(0, 400));
    await clickHub54Button('Xác nhận nhập 1 từ');
    await sleep(600);
    const after = await cards54Live();
    const apples = after.filter(c => c.h === '사과');
    verdict('G5.3 both senses kept as distinct cards', apples.length === 2 && apples.some(c => c.m === 'quả táo') && apples.some(c => c.m === 'quả táo chua'), apples);
    verdict('G5.4 total cards 2 -> 3 (no merge, no duplicate)', after.length === 3, after.length);
    await ev(`window.__v54.close()`);
    return { apples };
  });

  // G6 — flag off hides the feature.
  await step('G6-flag-off', async () => {
    await ev(`window.__v54.setFlag('koImport', false)`);
    await reloadWait(2800);
    await openDataView();
    const btn = await entryButton();
    verdict('G6.1 flag off: entry button hidden in the data view', btn.found === false, btn);
    await ev(`window.__v54.open()`);
    await sleep(600);
    const txt = await hub54Text();
    verdict('G6.2 flag off: overlay shows the flag-off message', txt.indexOf('đang tạm tắt') >= 0 && txt.indexOf('koImport') >= 0, txt.slice(0, 300));
    const dry = JSON.parse(await ev(`JSON.stringify(window.__v54.dryRun54({text:'가게\\tcửa hàng'}, {}))`));
    verdict('G6.3 flag off: dry-run refuses (flag-off)', dry.ok === false && dry.why === 'flag-off', dry);
    await ev(`window.__v54.setFlag('koImport', true)`);
    await reloadWait(2800);
    await openDataView();
    const btn2 = await entryButton();
    verdict('G6.4 flag back on: entry button returns', btn2.found === true, btn2);
    await shot('g6-v54-flag');
    return { btn, btn2 };
  });

  // G7 — 360px overflow + contrast.
  await step('G7-360px-contrast', async () => {
    await setViewport(360, 800, true, false);
    await reloadWait(2800);
    await freshGuest();
    await ev(`window.__v54.open()`);
    await sleep(600);
    let ov = await overflowAt();
    verdict('G7.1 360px overlay: no horizontal overflow', ov.scrollW <= ov.innerW + 1, ov);
    await clickHub54Button('Xem trước bộ hạt giống');
    await sleep(500);
    ov = await overflowAt();
    verdict('G7.2 360px seed preview: no horizontal overflow', ov.scrollW <= ov.innerW + 1, ov);
    const tag = await chipContrast('#v54hub .v54tag');
    verdict('G7.3 .v54tag contrast >= 7 (white on #1e3a5f)', tag.found && tag.ratio !== null && tag.ratio >= 7, tag);
    const pri = await chipContrast('#v54hub .v54btn.pri');
    verdict('G7.4 .v54btn.pri contrast >= 4.5', pri.found && pri.ratio !== null && pri.ratio >= 4.5, pri);
    await shot('g7-v54-360');
    await ev(`window.__v54.close()`);
    await setViewport(1280, 800, false, false);
    await reloadWait(2800);
    return { ov, tag, pri };
  });

  // G8 — console/dialog summary for the whole run.
  await step('G8-summary', async () => {
    verdict('G8.1 0 console errors in the whole run', C.consoleErrors.length === 0, C.consoleErrors);
    verdict('G8.2 0 console warnings in the whole run', C.consoleWarns.length === 0, C.consoleWarns);
    verdict('G8.3 0 JS dialogs in the whole run', C.dialogs.length === 0, C.dialogs);
    return { errors: C.consoleErrors.length, warns: C.consoleWarns.length, dialogs: C.dialogs.length };
  });

  const passed = verdicts.filter(v => v.pass).length;
  const failed = verdicts.filter(v => !v.pass);
  note(`\n== verify-v54c summary: ${passed}/${verdicts.length} PASS ==`);
  if (failed.length) { note('FAILURES:'); failed.forEach(v => note('  - ' + v.name + ' — ' + JSON.stringify(v.detail).slice(0, 300))); }
  saveResults();
  close();
  process.exit(failed.length ? 1 : 0);
}

main().catch(e => { console.error('VERIFY DRIVER FAILED:', e); close(); process.exit(1); });
