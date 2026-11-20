// repro-v40b.js - second repro pass on the V18.4 base:
//   R2 C-02 team skill vs shield (seed corrected: v10_icedragon, not
//       v10_icelong) and R4 A-F2 banner Q1 -> Q2 transition.
// Reuses the CDP driver shape of repro-v40.js; HTTP 8961 / CDP 9360.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9360;
const HTTPPORT = 8961;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8961/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v40';
const OUTDIR = '/home/hatch/workspace/v7build/out';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
function note(...a) { console.log(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); }
function writeSmall(p, data) {
  try {
    const buf = Buffer.from(data, 'utf-8');
    const fd = fs.openSync(p, 'w');
    let off = 0;
    while (off < buf.length) { off += fs.writeSync(fd, buf, off, Math.min(512, buf.length - off)); }
    fs.closeSync(fd);
    return true;
  } catch (e) { console.log('write failed:', p, String(e).slice(0, 120)); return false; }
}
function saveResults() { writeSmall(path.join(DIR, 'logs', 'repro-results-b.json'), JSON.stringify(results, null, 2)); }
let chromeProc = null, httpProc = null;
async function ensureHttp() {
  try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {}
  httpProc = spawn('python3', ['-m', 'http.server', String(HTTPPORT), '--directory', OUTDIR], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500);
    try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {} }
  throw new Error('http server did not start');
}
async function ensureChrome() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {}
  const sha = execSync(`sha256sum ${POLICY} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
  const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
    '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
    '--user-data-dir=/tmp/chrome-v40r2-prof', `--remote-debugging-port=${PORT}`,
    '--window-size=390,844', 'about:blank'];
  chromeProc = spawn(CHROME, args, { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { await sleep(500);
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {} }
  throw new Error('chrome did not start');
}
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map();
    this.consoleErrors = []; this.consoleWarns = []; this.dialogs = [];
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) { const { res, rej } = this.pending.get(d.id); this.pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); }
      else if (d.method) {
        if (d.method === 'Page.javascriptDialogOpening') { this.dialogs.push(d.params.message); this.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); }
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
async function waitLoaded() {
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    await sleep(500);
    try { const st = await C.eval(`(function(){ return {href: location.href, rs: document.readyState}; })()`);
      if (st && st.href && st.href.indexOf('127.0.0.1:8961') >= 0 && st.rs === 'complete') return true; } catch (e) {}
  }
  return false;
}
async function shot(name) {
  try { const r = await C.send('Page.captureScreenshot', { format: 'png' });
    if (r.data) fs.writeFileSync(path.join(DIR, 'shots', name + '.png'), Buffer.from(r.data, 'base64')); } catch (e) {}
}
async function reseed(fnSrc) {
  const r = await C.eval(`(function(){
    var s = JSON.parse(localStorage.getItem('hanvocab.v1') || 'null');
    if (!s) return 'NO-SAVE';
    (${fnSrc})(s);
    localStorage.setItem('hanvocab.v1', JSON.stringify(s));
    return 'SEEDED';
  })()`);
  note('reseed:', r);
  // Let any pending debounced save flush before reload, so the edit is not
  // overwritten by the in-memory save on beforeunload.
  await sleep(1500);
  await C.eval('location.reload()');
  await sleep(2500);
}
async function step(name, fn) {
  note(`\n== ${name} ==`);
  try { const r = await fn(); results[name] = r; note(`DONE ${name} —`, JSON.stringify(r).slice(0, 900)); }
  catch (e) { results[name] = { error: String(e).slice(0, 800) }; note(`ERROR ${name} —`, String(e).slice(0, 800)); }
  saveResults();
}
async function openHubEn() {
  await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('bosses'); }catch(e){} })()`);
  await sleep(900);
}
async function main() {
  try {
    await ensureHttp(); await ensureChrome();
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const t = list.find(x => x.type === 'page');
    C = new CDP(t.webSocketDebuggerUrl);
    await C.ready;
    await C.send('Page.enable'); await C.send('Runtime.enable');
    await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await C.eval(`location.href = ${JSON.stringify(URL)}`);
    await waitLoaded();
    await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
    await C.eval('location.reload()');
    await sleep(2500);

    await step('R2-C02-teamskill-vs-shield', async () => {
      await reseed(`function(s){
        s.v7 = s.v7 || {};
        s.v7.en18 = s.v7.en18 || {bosses:{}, koStats:{right:0,wrong:0}};
        var win = function(id){ s.v7.en18.bosses[id] = {win:1, wins:1, at: Date.now(), item:'x'}; };
        ['v10_slime','v10_fairy','v10_dragon','v10_ghost','v10_spider','v10_unicorn','v10_icedragon'].forEach(win);
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
          return {ok:true, hp:F.hp, shield:F.shield, pet: !!F.pet, energy: F.pet?F.pet.energy:null, activeVal: F.pet?F.pet.activeVal:null, mode: F.qmode};
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
            return {hp0: hp0, sh0: sh0, hp1: F2.hp, sh1: F2.sh1!==undefined?F2.sh1:F2.shield, over: F2.over, lastMsg: F2.pet?F2.pet.lastMsg||null:null};
          }catch(e){ return {ok:false, why:String(e).slice(0,200)}; }
        })()`);
      }
      await shot('repro-R2-C02');
      // Dragon st=1 lv=10: activeVal = 30 + 2*10 = 50. Panda shield 30, HP 150.
      // Bypass (bug): hp 150->100, shield stays 30. Halved (fixed): hp 150->125, shield 30->5.
      const repro = !!after && after.hp1 === 100 && after.sh1 === 30;
      note((repro ? 'REPRO ' : 'NO-REPRO ') + 'R2-C02 —', JSON.stringify({ start, after }));
      return { repro, start, after };
    });

    await step('R4-AF2-banner-Q1-Q2', async () => {
      await reseed(`function(s){
        if (s.cards && s.cards.length > 5) s.cards = s.cards.slice(0, 5);
        if (s.v7 && s.v7.en15) s.v7.en15.scope = null;
        if (s.v7 && s.v7.en18) s.v7.en18 = {bosses:{}, koStats:{right:0,wrong:0}};
      }`);
      await openHubEn();
      const q1 = await C.eval(`(function(){
        try{
          window.__v18.fight('v10_slime','ko');
          var F = window.__v18._test.F();
          if(!F) return {ok:false, why:'no F'};
          return {ok:true, banner: F.banner, lang: F.lang, poolKoLen: F.pools&&F.pools.ko?F.pools.ko.length:null};
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
      note((repro ? 'REPRO ' : 'NO-REPRO ') + 'R4-AF2 —', JSON.stringify({ q1, q2 }));
      return { repro, q1, q2 };
    });

    note('\nconsole totals:', JSON.stringify({ errors: C.consoleErrors.length, warns: C.consoleWarns.length, dialogs: C.dialogs.length }));
    results.consoleTotals = { errors: C.consoleErrors.length, warns: C.consoleWarns.length, dialogs: C.dialogs.length };
    saveResults();
  } catch (e) { note('DRIVER ERROR', e); results.driverError = String(e).slice(0, 600); saveResults(); }
  finally { try { if (chromeProc) chromeProc.kill(); } catch (e) {} try { if (httpProc) httpProc.kill(); } catch (e) {} }
}
main();
