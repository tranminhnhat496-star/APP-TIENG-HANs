// probe-v34c-hosts.js — one-off probe: which fight hosts exist on a cold
// page load, and does the user-path (hub -> bosses tab -> arena) create them?
const { spawn, execSync } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9353;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8951/index.html';
let chromeProc = null;
async function ensureChrome() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {}
  const sha = execSync(`sha256sum ${POLICY} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
  chromeProc = spawn(CHROME, ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
    '--user-data-dir=/tmp/chrome-v34c-prof2', `--remote-debugging-port=${PORT}`,
    '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { await sleep(500);
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {} }
  throw new Error('chrome did not start');
}
class CDP {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map();
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (m) => { const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) { const { res, rej } = this.pending.get(d.id); this.pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }; }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr, awaitPromise = false) { const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page eval error: ' + JSON.stringify(r.exceptionDetails).slice(0, 800)); return r.result ? r.result.value : undefined; }
  close() { try { this.ws.close(); } catch (e) {} }
}
(async () => {
  await ensureChrome();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const C = new CDP(list.find(x => x.type === 'page').webSocketDebuggerUrl);
  await C.ready; await C.send('Page.enable'); await C.send('Runtime.enable');
  await C.eval(`location.href = ${JSON.stringify(URL)}`); await sleep(2500);
  const cold = await C.eval(`(function(){ return {
    v15body: !!document.getElementById('v15body'),
    v15hub: !!document.getElementById('v15hub'),
    v15bossfight: !!document.getElementById('v15bossfight'),
    v18fight: !!document.getElementById('v18fight'),
    v19fight: !!document.getElementById('v19fight'),
    bodyChildren: Array.from(document.body.children).map(e=>e.id||e.tagName).slice(0,20)
  }})()`);
  console.log('COLD', JSON.stringify(cold));
  // User path: open English hub, bosses tab, then open the arena.
  const userPath = await C.eval(`(async()=>{ try{
    window.__v15.choose('en');
    window.__v15.openHub('bosses');
    await new Promise(r=>setTimeout(r,800));
    var afterHub={v15body: !!document.getElementById('v15body'), v15bossfight: !!document.getElementById('v15bossfight'), v18fight: !!document.getElementById('v18fight')};
    window.__v18.openArena('en');
    await new Promise(r=>setTimeout(r,600));
    var afterArena={v18fight: !!document.getElementById('v18fight')};
    window.__v18.fight('v10_slime','en');
    await new Promise(r=>setTimeout(r,800));
    var F=window.__v18._test.F();
    var afterFight={v18fight: !!document.getElementById('v18fight'),
      barPresent: !!document.querySelector('#v18fight .v34breakbar'),
      barLabel: (document.querySelector('#v18fight .v34breaklabel')||{textContent:''}).textContent,
      hp: F?F.hp:null, brk: F?F.brk:null, weak: F?F.weak:null};
    // Now the V15 fight via the same user path.
    window.__v18.close();
    window.__v15.tab('bosses');
    await new Promise(r=>setTimeout(r,600));
    window.__v15.bossFight('slime');
    await new Promise(r=>setTimeout(r,800));
    var host=document.querySelector('#v15bossfight');
    var v15={hostPresent: !!host, barPresent: !!document.querySelector('#v15bossfight .v34breakbar'),
      barLabel: (document.querySelector('#v15bossfight .v34breaklabel')||{textContent:''}).textContent,
      hpText: host?(host.textContent.match(/HP \\d+\\/60/)||['?'])[0]:null};
    return {afterHub, afterArena, afterFight, v15};
  }catch(e){ return {err:String(e)} } })()`, true);
  console.log('USERPATH', JSON.stringify(userPath, null, 1));
  C.close(); if (chromeProc) chromeProc.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1200);
})().catch(e => { console.error('FATAL', e); try { if (chromeProc) chromeProc.kill('SIGTERM'); } catch (_) {} process.exit(1); });
