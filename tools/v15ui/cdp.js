// CDP driver for the Vocab Farm UI work: real Chrome (headless) via DevTools Protocol.
// Node 24 built-in WebSocket. No external deps.
// Usage: node shot.js --url <url> --out <png> [--width 390] [--height 844]
//   [--prerun <jsfile>] [--setup <jsfile>] [--wait <ms>] [--fullpage]
//        node audit.js --url <url> [--setup <jsfile>] [--out <json>]
// Chrome binary: /opt/meta-chromium/chrome (needs the WebGL domain policy switches).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = process.env.HATCH_CHROME || '/opt/meta-chromium/chrome';
// Stock Chromium (e.g. Playwright headless-shell) needs no Hatch WebGL policy.
// Set HATCH_CHROME_NOPOLICY=1 when using one.
const NO_POLICY = !!process.env.HATCH_CHROME_NOPOLICY;
const PORT = 9333;
const POLICY = '/tmp/webgl-policy.txt';

function policySha() {
  return execSync(`sha256sum ${POLICY} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
}

let chromeProc = null;
async function ensureChrome(startUrl) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    if (r.ok) return;
  } catch (e) { /* not up */ }
  const sha = NO_POLICY ? null : policySha();
  // First navigation must go through a file:// redirect page: a fresh
  // about:blank tab is treated as a public initiator and Chrome's Local
  // Network Access check blocks loopback. file:// counts as local.
  const start = startUrl ? `file:///tmp/goto.html?u=${encodeURIComponent(startUrl)}` : 'about:blank';
  const args = [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
    '--user-data-dir=/tmp/chrome-cdp-prof',
    `--remote-debugging-port=${PORT}`,
    '--window-size=390,844', start,
  ];
  if (!NO_POLICY) {
    args.splice(6, 0, `--hatch-webgl-allowed-domains-file=${POLICY}`,
      `--hatch-webgl-allowed-domains-sha256=${sha}`);
  }
  chromeProc = spawn(CHROME, args, { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500));
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {}
  }
  throw new Error('chrome did not start');
}

async function newTarget(url) {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  const t = await r.json();
  return t;
}

class CDP {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map(); this.events = [];
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (m) => { const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) { const { res, rej } = this.pending.get(d.id); this.pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); }
      else if (d.method) this.events.push(d);
    };
  }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr, awaitPromise = false) {
    const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page eval error: ' + JSON.stringify(r.exceptionDetails).slice(0, 500));
    return r.result ? r.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

async function openPage(url, width, height) {
  await ensureChrome(url);
  // Reuse the existing page tab (its origin is the local server, so same-origin
  // navigations pass Chrome's Local Network Access checks). A fresh about:blank
  // tab is treated as a public initiator and gets blocked.
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  let t = list.find(x => x.type === 'page');
  if (!t) t = await newTarget(url);
  const c = new CDP(t.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  const w = width || 390, h = height || 844;
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
  // Navigate only via in-page JS (location.href). CDP Page.navigate is treated
  // as a public initiator and breaks the tab (LNA check).
  const here = await c.eval('location.href').catch(() => '');
  const ok = await c.eval(`location.href === ${JSON.stringify(url)} && document.title !== '127.0.0.1' && !!document.querySelector('body')`).catch(() => false);
  if (!ok) {
    await c.eval(`location.href = ${JSON.stringify(url)}`);
  }
  await new Promise(r => setTimeout(r, 1200));
  return c;
}

async function shot(c, out, fullpage) {
  const params = { format: 'png' };
  if (fullpage) {
    const m = await c.send('Page.getLayoutMetrics');
    const h = Math.ceil(m.cssContentSize.height);
    params.captureBeyondViewport = true;
    params.clip = { x: 0, y: 0, width: m.cssContentSize.width, height: h, scale: 2 };
  }
  const r = await c.send('Page.captureScreenshot', params);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(r.data, 'base64'));
}

async function closeTarget(c) { c.close(); }

function parseArgs() {
  const a = process.argv.slice(2); const o = {};
  for (let i = 0; i < a.length; i += 2) o[a[i].replace(/^--/, '')] = a[i + 1];
  return o;
}

module.exports = { openPage, shot, closeTarget, parseArgs, ensureChrome, CDP };
