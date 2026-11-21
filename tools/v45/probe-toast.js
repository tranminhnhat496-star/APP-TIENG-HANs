// probe-toast.js - focused probe: does the V45 corrupt-save warning toast
// ever appear in real Chrome after a corrupt boot? Polls .v7toast + .pp
// every 400 ms for 10 s after reload and prints a timeline.
// Usage: node tools/v45/probe-toast.js
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const CHROME = '/opt/meta-chromium/chrome';
const POLICY = '/tmp/webgl-policy.txt';
const DIR = '/home/hatch/workspace/v7build/out';
const HTTPPORT = 8986, PORT = 9386;
const URL = `http://127.0.0.1:${HTTPPORT}/index.html`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map();
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) { const { res, rej } = this.pending.get(d.id); this.pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); }
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
async function main() {
  let httpProc = spawn('python3', ['-m', 'http.server', String(HTTPPORT), '--directory', DIR], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500); try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) break; } catch (e) {} }
  const sha = execSync(`sha256sum ${POLICY} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
  const chromeProc = spawn(CHROME, ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
    '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
    '--user-data-dir=/tmp/chrome-v45-toast-prof', `--remote-debugging-port=${PORT}`,
    '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { await sleep(500); try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) break; } catch (e) {} }
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find(t => t.type === 'page');
  const C = new CDP(page.webSocketDebuggerUrl);
  await C.ready;
  await C.send('Page.enable'); await C.send('Runtime.enable');
  await C.eval(`location.href=${JSON.stringify(URL)}`);
  await sleep(2500);
  // fresh guest, then seed corrupt + reload
  await C.eval(`localStorage.clear(); location.reload(); 'ok'`);
  await sleep(2500);
  await C.eval(`localStorage.setItem('hanvocab.v1','{corrupt-json-{{{'); location.reload(); 'reloading'`);
  const t0 = Date.now();
  let sawWarn = false, sawLogin = false;
  for (let i = 0; i < 25; i++) {
    await sleep(400);
    const s = await C.eval(`(function(){
      var toasts=[].map.call(document.querySelectorAll('.v7toast'),function(x){return x.textContent});
      var pps=[].map.call(document.querySelectorAll('.pp'),function(x){return x.textContent});
      return {t:Date.now(), toasts:toasts, pps:pps, flag:window.__v45corruptShown||null, shown:!!window.__v45, chooser:!!document.querySelector('.v15chooser, .v7chooser, [class*=chooser]')};
    })()`);
    const el = Date.now() - t0;
    const hasWarn = s.toasts.concat(s.pps).some(x => x.indexOf('Không đọc được bản lưu') >= 0);
    const hasLogin = s.toasts.concat(s.pps).some(x => x.indexOf('Quà đăng nhập') >= 0);
    if (hasWarn) sawWarn = true;
    if (hasLogin) sawLogin = true;
    console.log(`+${el}ms toasts=${JSON.stringify(s.toasts)} pps=${JSON.stringify(s.pps)} flag=${JSON.stringify(s.flag)}`);
    if (hasWarn && i > 10) break;
  }
  console.log('RESULT sawWarnToast=' + sawWarn + ' sawLoginToast=' + sawLogin);
  C.close(); chromeProc.kill(); httpProc.kill();
  process.exit(0);
}
main().catch(e => { console.error('probe crashed:', e); process.exit(2); });
