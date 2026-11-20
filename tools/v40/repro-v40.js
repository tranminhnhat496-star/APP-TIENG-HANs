// repro-v40.js - V18.5 BUG REVIEW repro driver (V18.4 base).
// Real Chrome 157 via CDP, HTTP 8957 / CDP 9358, scratch profile.
// Modelled on tools/v38/verify-v38c.js (same CDP class, ensureHttp/
// ensureChrome, shot helpers). Exit 0 = driver completed; verdicts in
// tools/v40/logs/repro-results.json + stdout. A REPRO verdict means the
// suspected bug reproduced on the pristine V18.4 base.
// Repros:
//   R1 B-8  BT scope + fresh load + Flashcards directly -> "no words"
//   R2 C-02 pet team skill vs shielded boss (v10_panda, shield 30):
//         skill damage bypasses the shield entirely
//   R3 C-12 picker "Bo chon tat ca" + Ap dung -> scope is ALL of BT
//   R4 A-F2 KO <8 warning banner disappears after Q1 (V18)
//   R5 C-04/C-05 Collection: "(40 boss)" copy + map-boss detail shows
//         no replay count despite wins
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9358;
const HTTPPORT = 8957;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8957/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v40';
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
function saveResults() { writeSmall(path.join(DIR, 'logs', 'repro-results.json'), JSON.stringify(results, null, 2)); }
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
  try { if (fs.readFileSync(POLICY, 'utf-8') !== 'hatch-webgl-all-origins-v1\n') fs.writeFileSync(POLICY, 'hatch-webgl-all-origins-v1\n'); }
  catch (e) { fs.writeFileSync(POLICY, 'hatch-webgl-all-origins-v1\n'); }
  const sha = execSync(`sha256sum ${POLICY} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
  const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
    '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
    '--user-data-dir=/tmp/chrome-v40r-prof', `--remote-debugging-port=${PORT}`,
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
  await waitLoaded();
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await C.eval('location.reload()');
  await sleep(2500);
  return C;
}
async function waitLoaded(timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 15000)) {
    await sleep(500);
    try {
      const st = await C.eval(`(function(){ return {href: location.href, rs: document.readyState}; })()`);
      if (st && st.href && st.href.indexOf('127.0.0.1:8957') >= 0 && st.rs === 'complete') return true;
    } catch (e) {}
  }
  return false;
}
async function shot(name) {
  try {
    const r = await C.send('Page.captureScreenshot', { format: 'png' });
    if (r.data) fs.writeFileSync(path.join(DIR, 'shots', name + '.png'), Buffer.from(r.data, 'base64'));
  } catch (e) { note('shot failed', name, String(e).slice(0, 120)); }
}
async function step(name, fn) {
  note(`\n== ${name} ==`);
  try {
    const r = await fn();
    results[name] = r;
    note(`DONE ${name} —`, JSON.stringify(r).slice(0, 800));
  } catch (e) {
    results[name] = { error: String(e).slice(0, 800) };
    note(`ERROR ${name} —`, String(e).slice(0, 800));
  }
  saveResults();
}
// Reseed the save in localStorage, then reload. seedFn is a string of
// JS that mutates the parsed save object `s` (hanvocab.v1).
async function reseed(seedFnSrc) {
  await C.eval(`(function(){
    var s = JSON.parse(localStorage.getItem('hanvocab.v1') || 'null');
    if (!s) return 'NO-SAVE';
    (${seedFnSrc})(s);
    localStorage.setItem('hanvocab.v1', JSON.stringify(s));
    return 'SEEDED';
  })()`);
  await C.eval('location.reload()');
  await sleep(2500);
}
function verdict(name, cond, detail) {
  note((cond ? 'REPRO ' : 'NO-REPRO ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 500) : ''));
  return cond;
}
async function openHubEn() {
  await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('bosses'); }catch(e){} })()`);
  await sleep(900);
}
async function main() {
  try {
    await openPage();
    const boot = await C.eval(`(function(){ return { v15: !!window.__v15, v18: !!window.__v18, v19: !!window.__v19, v22: !!window.__v22, v23: !!window.__v23, v40: !!window.__v40, title: document.title }; })()`);
    note('boot:', boot);
    results.boot = boot;
    saveResults();
    const err0 = C.consoleErrors.length, warn0 = C.consoleWarns.length, dlg0 = C.dialogs.length;
    const delta = () => ({ errors: C.consoleErrors.length - err0, warns: C.consoleWarns.length - warn0, dialogs: C.dialogs.length - dlg0 });

    // ---- R1: B-8 BT scope + fresh load + Flashcards directly ----
    await step('R1-B8-BT-flashcards-fresh-load', async () => {
      await reseed(`function(s){
        s.v7 = s.v7 || {}; s.v7.en15 = s.v7.en15 || {};
        s.v7.en15.scope = {kind:'lib', lib:'bt', unit:2};
      }`);
      // Fresh load: do NOT open the Library. Go straight to Flashcards.
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.tab('learn'); window.__v15.startMode('flash'); }catch(e){ return 'ERR:'+e.message; } })()`);
      await sleep(1200);
      const body = await C.eval(`(function(){ var b=document.querySelector('#v15body'); return b?(b.textContent||'').slice(0,300):'NO-BODY'; })()`);
      const btAttached = await C.eval(`(function(){ return !!(window.__V22_BT && window.__V22_BT.units); })()`);
      await shot('repro-R1-B8');
      const repro = typeof body === 'string' && body.indexOf('Không có từ nào cho bộ lọc này') >= 0;
      verdict('R1-B8', repro, { btAttached, bodySnippet: (body || '').slice(0, 120) });
      return { repro, btAttached, bodySnippet: (body || '').slice(0, 200), console: delta() };
    });

    // ---- R2: C-02 team skill vs shielded boss (v10_panda, shield 30) ----
    await step('R2-C02-teamskill-vs-shield', async () => {
      await reseed(`function(s){
        s.v7 = s.v7 || {};
        s.v7.en18 = s.v7.en18 || {bosses:{}, koStats:{right:0,wrong:0}};
        var win = function(id){ s.v7.en18.bosses[id] = {win:1, wins:1, at: Date.now(), item:'x'}; };
        ['v10_slime','v10_fairy','v10_dragon','v10_ghost','v10_spider','v10_unicorn','v10_icelong'].forEach(win);
        s.v7.en23 = s.v7.en23 || {};
        s.v7.en23.pets = { p1: {id:'p1', sp:'dragon', st:1, lv:10, xp:0, aff:0} };
        s.v7.en23.team = ['p1', null, null];
        s.v7.en23.eggs = {fire:1, forest:1};
      }`);
      await openHubEn();
      const start = await C.eval(`(function(){
        try{
          window.__v18.fight('v10_panda','en');
          var F = window.__v18._test.F();
          if(!F) return {ok:false, why:'no F'};
          return {ok:true, hp:F.hp, shield:F.shield, pet: !!F.pet, energy: F.pet?F.pet.energy:null, activeVal: F.pet?F.pet.activeVal:null};
        }catch(e){ return {ok:false, why:String(e).slice(0,200)}; }
      })()`);
      await sleep(800);
      let after = null;
      if (start.ok && start.pet) {
        after = await C.eval(`(function(){
          try{
            var F = window.__v18._test.F();
            var hp0 = F.hp, sh0 = F.shield;
            F.pet.energy = 10;
            window.__v23.castSkillInFight();
            var F2 = window.__v18._test.F();
            return {hp0: hp0, sh0: sh0, hp1: F2.hp, sh1: F2.shield, over: F2.over};
          }catch(e){ return {ok:false, why:String(e).slice(0,200)}; }
        })()`);
      }
      await shot('repro-R2-C02');
      // Dragon st=1 lv=10: activeVal = 30 + 2*10 = 50. Shield 30.
      // Bypass (bug): hp 150->100, shield stays 30. Halved (fixed): hp 150->125, shield 30->5.
      const repro = !!after && after.hp1 === 100 && after.sh1 === 30;
      verdict('R2-C02', repro, { start, after });
      return { repro, start, after, console: delta() };
    });

    // ---- R3: C-12 picker "Bo chon tat ca" + Ap dung -> ALL of BT ----
    await step('R3-C12-picker-empty-units', async () => {
      await reseed(`function(s){ return s; }`);
      await openHubEn();
      await C.eval(`(function(){ try{ window.__v18.openArena('en'); }catch(e){} })()`);
      await sleep(900);
      await C.eval(`(function(){
        var sel=document.querySelector('#v22bs-lib'); if(!sel) return 'NO-PICKER';
        sel.value='units'; sel.dispatchEvent(new Event('change', {bubbles:true})); return 'OK';
      })()`);
      await sleep(900);
      const picked = await C.eval(`(function(){
        var btns=document.querySelectorAll('#v22bs-pickall .btn');
        for(var i=0;i<btns.length;i++){ if((btns[i].textContent||'').indexOf('Bỏ chọn tất cả')>=0){ btns[i].click(); return 'CLICKED-DESELECT'; } }
        return 'NO-BUTTON';
      })()`);
      await sleep(400);
      await C.eval(`(function(){ var btns=document.querySelectorAll('.v22bscope .btn.pri'); for(var i=0;i<btns.length;i++){ if((btns[i].textContent||'').indexOf('Áp dụng')>=0){ btns[i].click(); return true; } } return false; })()`);
      // applyBossScope for BT is async via ensureData; wait for scope to settle.
      let scope = null;
      for (let i = 0; i < 30; i++) {
        await sleep(200);
        scope = await C.eval(`(function(){ try{ return window.__v15.en15().scope; }catch(e){ return 'ERR'; } })()`);
        if (scope && scope.lib === 'bt') break;
      }
      await shot('repro-R3-C12');
      const repro = !!scope && scope.kind === 'lib' && scope.lib === 'bt' && scope.unit === undefined;
      verdict('R3-C12', repro, { picked, scope });
      return { repro, picked, scope, console: delta() };
    });

    // ---- R4: A-F2 KO <8 banner disappears after Q1 (V18) ----
    await step('R4-AF2-banner-gone-Q2', async () => {
      await reseed(`function(s){
        if (s.cards && s.cards.length > 5) s.cards = s.cards.slice(0, 5);
      }`);
      await openHubEn();
      const q1 = await C.eval(`(function(){
        try{
          window.__v18.fight('v10_slime','ko');
          var F = window.__v18._test.F();
          if(!F) return {ok:false, why:'no F'};
          return {ok:true, banner: F.banner, lang: F.lang};
        }catch(e){ return {ok:false, why:String(e).slice(0,200)}; }
      })()`);
      await sleep(600);
      const q2 = await C.eval(`(function(){
        try{
          window.__v18._test.pickCorrect();
          window.__v18._test.next();
          var F = window.__v18._test.F();
          return {ok:true, banner: F.banner, q: F.q};
        }catch(e){ return {ok:false, why:String(e).slice(0,200)}; }
      })()`);
      await shot('repro-R4-AF2');
      const repro = !!q1.ok && typeof q1.banner === 'string' && q1.banner.indexOf('5/8') >= 0
        && !!q2.ok && (q2.banner === null || q2.banner === undefined);
      verdict('R4-AF2', repro, { q1, q2 });
      return { repro, q1, q2, console: delta() };
    });

    // ---- R5: C-04/C-05 Collection copy + map-boss replay count ----
    await step('R5-C0405-collection', async () => {
      await reseed(`function(s){
        s.v7 = s.v7 || {};
        s.v7.en19 = s.v7.en19 || {lang:'en', bosses:{}, titles:[], zoneClaimed:{}, koStats:{right:0,wrong:0}};
        s.v7.en19.bosses['v11_fireking'] = {en:{win:1, wins:3, stars:2, best:0}, ko:{win:1, wins:1, stars:1, best:0}};
      }`);
      await openHubEn();
      const btn = await C.eval(`(function(){
        var btns=document.querySelectorAll('.v18arenas .btn');
        for(var i=0;i<btns.length;i++){ if((btns[i].textContent||'').indexOf('Bộ Sưu Tập')>=0) return (btns[i].textContent||'').trim(); }
        return 'NO-BUTTON';
      })()`);
      await C.eval(`(function(){ try{ window.__v15.tab('collection'); }catch(e){} })()`);
      await sleep(900);
      const detail = await C.eval(`(function(){
        try{
          window.__v18.collDetail('v11_fireking');
          var host=document.querySelector('#v18colldetail');
          return host?(host.textContent||'').slice(0,400):'NO-HOST';
        }catch(e){ return 'ERR:'+String(e).slice(0,200); }
      })()`);
      await shot('repro-R5-C0405');
      const copyRepro = typeof btn === 'string' && btn.indexOf('(40 boss)') >= 0;
      const countRepro = typeof detail === 'string' && detail.indexOf('Đã thắng') >= 0 && detail.indexOf('lần)') < 0;
      verdict('R5-C05-copy', copyRepro, { btn });
      verdict('R5-C04-nocount', countRepro, { detailSnippet: (detail || '').slice(0, 200) });
      return { copyRepro, countRepro, btn, detailSnippet: (detail || '').slice(0, 300), console: delta() };
    });

    note('\nconsole totals:', JSON.stringify({ errors: C.consoleErrors.length, warns: C.consoleWarns.length, dialogs: C.dialogs.length }));
    results.consoleTotals = { errors: C.consoleErrors.length, warns: C.consoleWarns.length, dialogs: C.dialogs.length };
    saveResults();
  } catch (e) {
    note('DRIVER ERROR', e);
    results.driverError = String(e).slice(0, 600);
    saveResults();
  } finally {
    try { if (chromeProc) chromeProc.kill(); } catch (e) {}
    try { if (httpProc) httpProc.kill(); } catch (e) {}
  }
}
main();
