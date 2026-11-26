// verify-v55c.js - V19.8 (layer V55) Chrome verification driver.
// Real Chrome 157 via CDP, local HTTP. Parameterised so the SAME driver
// runs on the built tree (default: private out) or the unzipped ZIP dir.
//   node tools/v55/verify-v55c.js [DIR] [httpPort] [cdpPort] [profile] [resultsFile] [shotPrefix]
// Defaults: DIR=v7build/out, http 8765, cdp 9245, profile
// chrome-v55c-prof, results tools/v55/logs/v55c-results.json, shots v55c-*.
// Ports 8765/9245 are deliberately different from the v51-v54 runs.
// Exit 0 = driver completed (verdicts in the results JSON + stdout).
// Gates:
//   G0 boot clean (fresh guest, title V19.8, __v55 19.8.0, __v54 19.7.0,
//      __v53 19.6.1, WORDS 4892, 0 console errors/warnings/dialogs)
//   G1 KO Hub entry: .v55kotab button in #tabs, visible, label Ôn SRS;
//      clicking it opens the #v55hub overlay (stats + queue + weak list)
//   G2 due queue + stats by real DOM (real old-progress save: 11 cards,
//      7 due): stats due 7 / learned 9 / weak 2 / mastered 1; queue order
//      [k2,k1,k5,k6,k0,k10,k3]; start button "Bắt đầu ôn (7 từ)";
//      missing-meaning card shows "Chưa có nghĩa", never guessed
//   G3 live SRS session by real DOM clicks: answer all 7 questions
//      (MC by clicking the correct option, flash by "Nhớ rồi") ->
//      summary "Hoàn thành buổi học!", session recorded ko/7/7,
//      reopened overlay shows reviewedToday 7, due 0
//   G4 weak session by real DOM clicks: "Ôn từ yếu (2)" -> 2 questions
//      -> recorded ko/2/2; weak cards' boxes advanced
//   G5 cap: 35 due cards -> default cap 40 shows all 35; set cap 30
//      (real change event) -> 30 shown + "Còn 5 từ" text; reload ->
//      cap 30 persists in en55
//   G6 flag off: entry button hidden after reload, overlay shows the
//      flag-off message, dueQueue refuses (empty); flag back on restores it
//   G7 360px: overlay has no horizontal overflow; .v55badge.weak and
//      .v55badge.due contrast >= 4.5; Hangul renders (document.fonts.check
//      + non-zero width of a Hangul row)
//   G8 console/dialog summary: 0 errors, 0 warnings, 0 dialogs
// HONEST LIMITS: real rendering/layout/paint in headless Chrome 157;
// live-phone (real Android TTS), live-Firebase and
// first-open-on-GitHub-Pages gates stay Anh-only. The listen questions in
// G3 speak via the V52 helper; headless Chrome has no voices, so the
// honest "Không phát được âm thanh" toast may appear — answering is not
// blocked by it, and 0 console errors is still required.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const POLICY = '/tmp/webgl-policy.txt';
const DIR = process.argv[2] || '/home/hatch/workspace/v7build/out';
const HTTPPORT = parseInt(process.argv[3] || '8765', 10);
const PORT = parseInt(process.argv[4] || '9245', 10);
const PROFILE = process.argv[5] || 'chrome-v55c-prof';
const RESULTS_FILE = process.argv[6] || 'v55c-results.json';
const SHOT_PREFIX = process.argv[7] || 'v55c';
const TDIR = '/home/hatch/workspace/v7build/tools/v55';
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

// --- V55 in-page helpers ---
// Real old-KO-progress save: learned across boxes/due dates, sticky wrong
// counters, a mastered box-5 card past due, two box-0 imports, one future
// due card, and one card with a blank meaning (shows "Chưa có nghĩa").
function ko55SeedCards(now) {
  return [
    { id: 'k0', d: 'd0', h: '안녕하세요', m: 'xin chào', p: '', e: '', g: 'Chào hỏi', box: 1, due: now - 864e5, w: 0 },
    { id: 'k1', d: 'd0', h: '감사합니다', m: 'cảm ơn', p: '', e: '', g: 'Chào hỏi', box: 2, due: now - 2 * 864e5, w: 0 },
    { id: 'k2', d: 'd0', h: '학교', m: 'trường học', p: '', e: '', g: 'Đời sống', box: 3, due: now - 3 * 864e5, w: 0 },
    { id: 'k3', d: 'd0', h: '밥', m: 'cơm', p: '', e: '', g: 'Đồ ăn', box: 4, due: now - 864e5, w: 0 },
    { id: 'k4', d: 'd0', h: '물', m: 'nước', p: '', e: '', g: 'Đồ ăn', box: 1, due: now + 864e5, w: 0 },
    { id: 'k5', d: 'd0', h: '김치', m: 'kim chi', p: '', e: '', g: 'Đồ ăn', box: 2, due: now - 864e5, w: 4 },
    { id: 'k6', d: 'd0', h: '친구', m: 'bạn bè', p: '', e: '', g: 'Đời sống', box: 1, due: now - 864e5, w: 3 },
    { id: 'k7', d: 'd0', h: '가족', m: 'gia đình', p: '', e: '', g: 'Đời sống', box: 5, due: now - 864e5, w: 0 },
    { id: 'k8', d: 'd0', h: '가게', m: 'cửa hàng', p: '', e: '', g: 'Đời sống', box: 0, due: 0, w: 0 },
    { id: 'k9', d: 'd0', h: '가르치다', m: 'dạy', p: '', e: '', g: 'Hoạt động', box: 0, due: 0, w: 0 },
    { id: 'k10', d: 'd0', h: '물', m: ' ', p: '', e: '', g: 'Đồ ăn', box: 1, due: now - 864e5, w: 0 },
  ];
}
async function seedKO55() {
  const now = Date.now();
  return await ev('(function(){'
    + 'var s; try{ s=S; }catch(e){ return {err:"no S"}; }'
    + 's.cards=' + JSON.stringify(ko55SeedCards(now)) + ';'
    + 's.decks=[{id:"d0",name:"Bộ mặc định"}];'
    + 's.deck="d0";'
    + 'try{ save(); }catch(e){}'
    + 'try{ if(window.__v20) window.__v20.flush(); }catch(e){}'
    + 'return {n:s.cards.length};'
    + '})()');
}
async function seedDue35() {
  const now = Date.now();
  const cards = [];
  for (let i = 0; i < 35; i++) cards.push({ id: 'c' + i, d: 'd0', h: '단어' + i, m: 'nghĩa ' + i, p: '', e: '', g: 'Nhóm', box: 1 + (i % 2), due: now - (i + 1) * 36e5, w: 0 });
  return await ev('(function(){'
    + 'var s; try{ s=S; }catch(e){ return {err:"no S"}; }'
    + 's.cards=' + JSON.stringify(cards) + ';'
    + 's.decks=[{id:"d0",name:"Bộ mặc định"}];'
    + 's.deck="d0";'
    + 'try{ save(); }catch(e){}'
    + 'try{ if(window.__v20) window.__v20.flush(); }catch(e){}'
    + 'return {n:s.cards.length};'
    + '})()');
}
async function entryButton55() {
  return await ev(`(function(){ var b=document.querySelector('#tabs .v55kotab'); return b ? {found:true, text:b.textContent.trim(), visible: b.offsetParent!==null} : {found:false}; })()`);
}
async function clickEntry55() {
  return await ev(`(function(){ var b=document.querySelector('#tabs .v55kotab'); if(!b) return {found:false}; b.click(); return {found:true}; })()`);
}
async function hub55() {
  return await ev(`(function(){ var h=document.getElementById('v55hub'); if(!h) return {found:false}; return {found:true, display:h.style.display, html:h.innerHTML}; })()`);
}
async function hub55Text() {
  const h = await hub55();
  return h.found ? h.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}
async function queueIds55() {
  return await ev(`(function(){ var q=window.__v55.dueQueue(); return {total:q.total, capped:q.capped, cap:q.cap, ids:q.items.map(function(i){return i.id})}; })()`);
}
async function stats55() {
  return await ev(`JSON.stringify(window.__v55.koStats())`).then(s => JSON.parse(s));
}
async function clickHub55Button(label) {
  return await ev(`(function(){
    var btns=[].slice.call(document.querySelectorAll('#v55hub .v55btn, #v55hub .v55x'));
    var b=btns.filter(function(x){return x.textContent.indexOf(${JSON.stringify(label)})>=0;})[0];
    if(!b) return {found:false};
    b.click(); return {found:true, disabled: !!b.disabled};
  })()`);
}
async function setCap55(n) {
  return await ev(`(function(){
    var s=document.getElementById('v55cap'); if(!s) return {found:false};
    s.value=String(${n});
    s.dispatchEvent(new Event('change', {bubbles:true}));
    return {found:true, cap:window.__v55.cap()};
  })()`);
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
// Answer ONE v27 question by a real DOM click: the correct MC option
// (onclick holds ",true,") or the flash "Nhớ rồi" button. Returns what
// it did; the caller then clicks the feedback "next" button.
async function answerOneQ() {
  return await ev(`(function(){
    var body=document.getElementById('v27body'); if(!body) return {where:'no-body'};
    if(body.innerHTML.indexOf('Hoàn thành buổi học')>=0) return {where:'summary'};
    var opts=[].slice.call(body.querySelectorAll('.v27opt'));
    var right=opts.filter(function(b){return (b.getAttribute('onclick')||'').indexOf(',true,')>=0;})[0];
    if(right){ right.click(); return {where:'mc', n:opts.length}; }
    var ok=body.querySelector('.v27btn.ok');
    if(ok){ ok.click(); return {where:'flash'}; }
    return {where:'unknown', html:body.innerHTML.slice(0,300)};
  })()`);
}
async function clickNextQ() {
  return await ev(`(function(){
    var body=document.getElementById('v27body'); if(!body) return {found:false};
    var b=[].slice.call(body.querySelectorAll('.v27btn.pri')).filter(function(x){return (x.getAttribute('onclick')||'').indexOf('nextQ')>=0;})[0];
    if(!b) return {found:false};
    b.click(); return {found:true, label:b.textContent.trim()};
  })()`);
}
async function sessionSummary() {
  return await ev(`(function(){
    var body=document.getElementById('v27body'); if(!body) return {found:false};
    var done=body.innerHTML.indexOf('Hoàn thành buổi học')>=0;
    var s=window.__v27.en27().sessions;
    // finishSession unshifts: the MOST RECENT session is s[0], not s[last].
    var last=s.length?s[0]:null;
    return {done:done, sessions:s.length, last:last?{lang:last.lang,total:last.total,correct:last.correct,wrong:last.wrong}:null};
  })()`);
}

async function main() {
  await openPage();
  // G0 — boot clean.
  await step('G0-boot', async () => {
    const boot = await ev(`(function(){ return {title: document.title, hasV55: !!window.__v55, v55: window.__v55&&window.__v55.version, hasV54: !!window.__v54, v54: window.__v54&&window.__v54.version, hasV53: !!window.__v53, v53: window.__v53&&window.__v53.version, hasV51: !!window.__v51, words: (window.__v15&&window.__v15.words||[]).length}; })()`);
    const servedTitle = await (await fetch(URL)).text().then(t => (t.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
    verdict('G0.1 served title is V19.8 KO SRS', servedTitle.includes('V19.8 — KO SRS'), servedTitle);
    verdict('G0.2 __v55 19.8.0 present', boot.hasV55 && boot.v55 === '19.8.0', boot);
    verdict('G0.3 __v54 19.7.0 + __v53 19.6.1 + __v51 present', boot.hasV54 && boot.v54 === '19.7.0' && boot.hasV53 && boot.v53 === '19.6.1' && boot.hasV51, boot);
    verdict('G0.4 WORDS 4892', boot.words === 4892, boot.words);
    verdict('G0.5 0 console errors at boot', C.consoleErrors.length === 0, C.consoleErrors);
    verdict('G0.6 0 console warnings at boot', C.consoleWarns.length === 0, C.consoleWarns);
    verdict('G0.7 0 dialogs at boot', C.dialogs.length === 0, C.dialogs);
    return boot;
  });

  // G1 — KO Hub entry button.
  await step('G1-entry-button', async () => {
    await freshGuest();
    await seedKO55();
    await reloadWait(2800);
    const btn = await entryButton55();
    verdict('G1.1 .v55kotab entry button present in #tabs, label Ôn SRS', btn.found === true && btn.text.indexOf('Ôn SRS') >= 0, btn);
    verdict('G1.2 entry button visible', btn.found === true && btn.visible === true, btn);
    const clicked = await clickEntry55();
    await sleep(700);
    const hub = await hub55();
    verdict('G1.3 click opens the #v55hub overlay', clicked.found === true && hub.found === true && hub.display === 'flex', { clicked, display: hub.display });
    const txt = await hub55Text();
    verdict('G1.4 overlay shows the title + stats + queue sections', txt.indexOf('Ôn SRS — tiếng Hàn') >= 0 && txt.indexOf('đến hạn hôm nay') >= 0 && txt.indexOf('Đến hạn') >= 0 && txt.indexOf('Từ yếu') >= 0, txt.slice(0, 300));
    await shot('g1-v55-overlay');
    return { btn, txt: txt.slice(0, 200) };
  });

  // G2 — due queue + stats by real DOM.
  await step('G2-queue-stats', async () => {
    const st = await stats55();
    verdict('G2.1 stats: due 7, learned 9, weak 2, mastered 1 (11 cards)', st.due === 7 && st.learned === 9 && st.weak === 2 && st.mastered === 1 && st.total === 11, st);
    verdict('G2.2 stats: reviewedToday 0 before any review', st.reviewedToday === 0, st);
    const q = await queueIds55();
    verdict('G2.3 queue total 7, cap 40, not capped', q.total === 7 && q.cap === 40 && q.capped === false, q);
    verdict('G2.4 queue order is due ASC + prio tiebreak [k2,k1,k5,k6,k0,k3,k10]', JSON.stringify(q.ids) === JSON.stringify(['k2', 'k1', 'k5', 'k6', 'k0', 'k3', 'k10']), q.ids);
    const txt = await hub55Text();
    verdict('G2.5 start button shows the queue size (7 từ)', txt.indexOf('Bắt đầu ôn (7 từ)') >= 0, txt.slice(0, 300));
    verdict('G2.6 weak section shows the weak cards (kim chi, bạn bè)', txt.indexOf('kim chi') >= 0 && txt.indexOf('bạn bè') >= 0, txt.slice(0, 500));
    verdict('G2.7 missing meaning shows as "Chưa có nghĩa", never guessed', txt.indexOf('Chưa có nghĩa') >= 0, txt.slice(0, 500));
    verdict('G2.8 queue rows show Hangul (학교, 감사합니다, 김치)', txt.indexOf('학교') >= 0 && txt.indexOf('감사합니다') >= 0 && txt.indexOf('김치') >= 0, txt.slice(0, 500));
    verdict('G2.9 box-0 imports (가게, 가르치다) are NOT in the queue', txt.indexOf('가게') < 0 && txt.indexOf('가르치다') < 0, txt.slice(0, 500));
    verdict('G2.10 box-5 mastered card (가족) is NOT in the queue', txt.indexOf('가족') < 0, txt.slice(0, 500));
    await shot('g2-v55-queue');
    return { st, q };
  });

  // G3 — live SRS session by real DOM clicks (7 questions).
  await step('G3-live-session', async () => {
    const clicked = await clickHub55Button('Bắt đầu ôn (7 từ)');
    await sleep(800);
    verdict('G3.1 start button clicked', clicked.found === true && clicked.disabled === false, clicked);
    const hubGone = await hub55();
    verdict('G3.2 SRS overlay closes, v27 session opens', hubGone.display === 'none', hubGone.display);
    let answered = 0, kinds = [];
    for (let i = 0; i < 12; i++) {
      const sum = await sessionSummary();
      if (sum.done) break;
      const a = await answerOneQ();
      kinds.push(a.where);
      if (a.where === 'summary' || a.where === 'no-body' || a.where === 'unknown') { note('answerOneQ stopped:', JSON.stringify(a)); break; }
      answered++;
      await sleep(450);
      const nx = await clickNextQ();
      if (!nx.found) { note('no next button after answer', i); break; }
      await sleep(450);
    }
    const sum = await sessionSummary();
    verdict('G3.3 all 7 questions answered by real clicks', answered === 7, { answered, kinds });
    verdict('G3.4 summary shows "Hoàn thành buổi học!"', sum.done === true, sum);
    verdict('G3.5 session recorded: ko, total 7, correct 7, wrong 0', sum.last && sum.last.lang === 'ko' && sum.last.total === 7 && sum.last.correct === 7 && sum.last.wrong === 0, sum.last);
    await shot('g3-v55-session-done');
    // Reopen the SRS overlay: stats must show the session's effect.
    await ev(`window.__v27.closeSmart()`);
    await sleep(400);
    await clickEntry55();
    await sleep(700);
    const st2 = await stats55();
    verdict('G3.6 reopened stats: reviewedToday 7, due 0', st2.reviewedToday === 7 && st2.due === 0, st2);
    const q2 = await queueIds55();
    verdict('G3.7 reopened queue is empty (all reviewed)', q2.total === 0, q2);
    const cards = await ev(`S.cards.filter(function(c){return ['k2','k1','k5','k6','k0','k10','k3'].indexOf(c.id)>=0}).map(function(c){return {id:c.id,box:c.box}})`);
    const wantBox = { k2: 4, k1: 3, k5: 3, k6: 2, k0: 2, k10: 2, k3: 5 };
    verdict('G3.8 all 7 answered cards advanced box by 1', cards.length === 7 && cards.every(function (c) { return c.box === wantBox[c.id]; }), cards);
    await ev(`window.__v55.closeSrs()`);
    return { answered, kinds, sum, st2 };
  });

  // G4 — weak session by real DOM clicks.
  await step('G4-weak-session', async () => {
    await clickEntry55();
    await sleep(700);
    const clicked = await clickHub55Button('Ôn từ yếu (2)');
    await sleep(800);
    verdict('G4.1 weak button clicked', clicked.found === true && clicked.disabled === false, clicked);
    let answered = 0;
    for (let i = 0; i < 6; i++) {
      const sum = await sessionSummary();
      if (sum.done) break;
      const a = await answerOneQ();
      if (a.where === 'summary' || a.where === 'no-body' || a.where === 'unknown') break;
      answered++;
      await sleep(450);
      const nx = await clickNextQ();
      if (!nx.found) break;
      await sleep(450);
    }
    const sum = await sessionSummary();
    verdict('G4.2 both weak questions answered by real clicks', answered === 2, { answered });
    verdict('G4.3 weak session recorded: ko, total 2, correct 2', sum.last && sum.last.lang === 'ko' && sum.last.total === 2 && sum.last.correct === 2 && sum.last.wrong === 0, sum.last);
    await ev(`window.__v27.closeSmart()`);
    await sleep(400);
    const wl = await ev(`JSON.stringify(window.__v55.weakList().map(function(i){return {id:i.id,w:i.w,box:i.box}}))`).then(s => JSON.parse(s));
    // k5 reached box 4 in this session, so res() cleared its sticky wrong
    // counter (correct at box>=4) and it leaves the weak list; k6 (box 3,
    // w still 3) stays weak.
    verdict('G4.4 weak list now shows only k6 (k5 left it at box 4, w cleared)', wl.length === 1 && wl[0].id === 'k6' && wl[0].w === 3, wl);
    return { answered, sum, wl };
  });

  // G5 — per-session cap.
  await step('G5-cap', async () => {
    await freshGuest();
    await seedDue35();
    await reloadWait(2800);
    await clickEntry55();
    await sleep(700);
    let q = await queueIds55();
    verdict('G5.1 35 due cards: total 35, default cap 40 shows all', q.total === 35 && q.cap === 40 && q.ids.length === 35, q);
    const set = await setCap55(30);
    await sleep(600);
    verdict('G5.2 cap selector set to 30 (real change event)', set.found === true && set.cap === 30, set);
    q = await queueIds55();
    verdict('G5.3 capped queue shows 30 of 35, capped=true', q.total === 35 && q.ids.length === 30 && q.capped === true && q.cap === 30, { total: q.total, shown: q.ids.length, capped: q.capped, cap: q.cap });
    const txt = await hub55Text();
    verdict('G5.4 capped notice names the remaining 5 words', txt.indexOf('Còn 5 từ đến hạn nữa') >= 0, txt.slice(0, 400));
    await reloadWait(2800);
    const capAfter = await ev(`window.__v55.cap()`);
    verdict('G5.5 cap 30 persists across reload (en55)', capAfter === 30, capAfter);
    await shot('g5-v55-cap');
    await ev(`window.__v55.closeSrs()`);
    return { q, capAfter };
  });

  // G6 — flag off hides the feature.
  await step('G6-flag-off', async () => {
    await ev(`window.__v55.setFlag('koSrsUI', false)`);
    await reloadWait(2800);
    const btn = await entryButton55();
    verdict('G6.1 flag off: entry button hidden after reload', btn.found === false, btn);
    await ev(`window.__v55.openSrs()`);
    await sleep(600);
    const txt = await hub55Text();
    verdict('G6.2 flag off: overlay shows the flag-off message', txt.indexOf('đang tạm tắt') >= 0 && txt.indexOf('koSrsUI') >= 0, txt.slice(0, 300));
    const q = await ev(`JSON.stringify(window.__v55.dueQueue())`).then(s => JSON.parse(s));
    verdict('G6.3 flag off: dueQueue refuses (empty)', q.total === 0 && q.items.length === 0, q);
    const sr = await ev(`window.__v55.startReview()`);
    verdict('G6.4 flag off: startReview refuses (false)', sr === false, sr);
    await ev(`window.__v55.setFlag('koSrsUI', true)`);
    await reloadWait(2800);
    const btn2 = await entryButton55();
    verdict('G6.5 flag back on: entry button returns', btn2.found === true, btn2);
    await shot('g6-v55-flag');
    return { btn, btn2 };
  });

  // G7 — 360px overflow + contrast + Hangul rendering.
  await step('G7-360px-contrast', async () => {
    await freshGuest();
    await seedKO55();
    await reloadWait(2800);
    await setViewport(360, 800, true, false);
    await reloadWait(2800);
    await clickEntry55();
    await sleep(700);
    let ov = await overflowAt();
    verdict('G7.1 360px overlay: no horizontal overflow', ov.scrollW <= ov.innerW + 1, ov);
    const weak = await chipContrast('#v55hub .v55badge.weak');
    verdict('G7.2 weak badge contrast >= 4.5 (white on #7F1D1D)', weak.found && weak.ratio !== null && weak.ratio >= 4.5, weak);
    const due = await chipContrast('#v55hub .v55badge.due');
    verdict('G7.3 due badge contrast >= 4.5 (white on #1E3A5F)', due.found && due.ratio !== null && due.ratio >= 4.5, due);
    const hangul = await ev(`(function(){
      var ok = false; try { ok = document.fonts.check('16px sans-serif', '안녕하세요'); } catch(e) { ok = 'no-fonts-api'; }
      var row = document.querySelector('#v55hub .v55row b');
      var w = row ? row.offsetWidth : 0;
      var txt = row ? row.textContent : '';
      return {fontsCheck: ok, rowWidth: w, rowText: txt};
    })()`);
    verdict('G7.4 Hangul renders: fonts.check true + queue row has width', hangul.fontsCheck === true && hangul.rowWidth > 0 && hangul.rowText.indexOf('학') >= 0, hangul);
    await shot('g7-v55-360');
    await ev(`window.__v55.closeSrs()`);
    await setViewport(1280, 800, false, false);
    await reloadWait(2800);
    return { ov, weak, due, hangul };
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
  note(`\n== verify-v55c summary: ${passed}/${verdicts.length} PASS ==`);
  if (failed.length) { note('FAILURES:'); failed.forEach(v => note('  - ' + v.name + ' — ' + JSON.stringify(v.detail).slice(0, 300))); }
  saveResults();
  close();
  process.exit(failed.length ? 1 : 0);
}

main().catch(e => { note('DRIVER FATAL:', String(e).slice(0, 800)); try { close(); } catch (_) {} process.exit(2); });
