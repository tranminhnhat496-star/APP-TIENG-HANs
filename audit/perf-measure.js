// perf-measure.js — CDP first-load measurement for the Vocab Farm audit.
// Usage: node perf-measure.js <url> <out-json>
// Cold load: Network cache disabled, fresh Chrome profile (caller kills
// chrome + wipes /tmp/chrome-cdp-prof before invoking).
// Viewport 390x844, mobile:true, deviceScaleFactor 1.
// Outputs JSON with network totals, navigation timing, LCP/CLS, top resources,
// and Performance.getMetrics (ScriptDuration etc.).
const fs = require('fs');
const { ensureChrome, CDP } = require('/home/hatch/workspace/v7build/tools/v15ui/cdp');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function measure(url, outJson) {
  const startedAt = new Date().toISOString();
  await ensureChrome(url);
  const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const t = list.find((x) => x.type === 'page');
  if (!t) throw new Error('no page target');
  const c = new CDP(t.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  // Let the initial goto-redirect load fully settle BEFORE enabling
  // Network, so no tail requests from it leak into the measured load.
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const st = await c.eval(`({rs: document.readyState, n: performance.getEntriesByType('resource').length})`).catch(() => null);
    if (st && st.rs === 'complete') break;
  }
  await c.send('Network.enable');
  await c.send('Performance.enable');
  await c.send('Network.clearBrowserCache');
  await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  // Install an LCP/CLS observer at document start (before the reload) so
  // entries are captured even if getEntriesByType() returns none afterwards.
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__perfLog = { lcp: [], cls: 0, shifts: 0, supported: (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes) ? PerformanceObserver.supportedEntryTypes.slice() : [] };
    try {
      const po = new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__perfLog.lcp.push({ startTime: e.startTime, size: e.size, el: e.element ? e.element.tagName : null }); });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) { window.__perfLog.lcpError = String(e); }
    try {
      const po2 = new PerformanceObserver((list) => { for (const e of list.getEntries()) { if (!e.hadRecentInput) { window.__perfLog.cls += e.value; window.__perfLog.shifts++; } } });
      po2.observe({ type: 'layout-shift', buffered: true });
    } catch (e) { window.__perfLog.clsError = String(e); }
  ` });
  // Baseline metrics before the reload, so the delta is the reload's cost.
  const m0 = await c.send('Performance.getMetrics');
  const m0Map = {};
  for (const m of m0.metrics || []) m0Map[m.name] = m.value;
  // Full navigation (not reload) AFTER Network/Performance are enabled, so
  // the measured navigation (document + all subresources + LCP/CLS +
  // ScriptDuration/V8CompileDuration) is fully captured in one clean pass.
  // (The tab may already be on the URL from ensureChrome's goto redirect;
  // assigning location.href to the same URL still triggers a full reload.)
  const navT0 = Date.now();
  await c.eval(`location.href = ${JSON.stringify(url)}`);
  // Wait for load + settle: readyState complete AND resource count stable
  // across two 1s-apart polls, max 30s.
  let lastCount = -1, stable = 0;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const st = await c.eval(`({rs: document.readyState, n: performance.getEntriesByType('resource').length})`).catch(() => null);
    if (!st) break;
    if (st.rs === 'complete' && st.n === lastCount) { stable++; if (stable >= 2) break; }
    else stable = 0;
    lastCount = st.n;
  }
  const settledMs = Date.now() - navT0;
  await sleep(500);

  const metrics = await c.send('Performance.getMetrics');
  const mMap = {};
  for (const m of metrics.metrics || []) mMap[m.name] = m.value;
  const delta = {};
  for (const k of ['ScriptDuration', 'V8CompileDuration', 'TaskDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount']) {
    if (typeof mMap[k] === 'number' && typeof m0Map[k] === 'number') delta[k] = Math.round((mMap[k] - m0Map[k]) * 1000) / 1000;
  }
  const perfLog = await c.eval(`window.__perfLog || null`).catch(() => null);
  const fbCheck = await c.eval(`({
    firebaseGlobal: typeof window.firebase,
    firebaseApp: !!(window.firebase && window.firebase.apps && window.firebase.apps.length),
    fontsStatus: (document.fonts ? document.fonts.status : 'n/a'),
    fontsLoaded: (document.fonts ? document.fonts.size : -1),
    bodyText: (document.body ? document.body.innerText.slice(0, 120) : '')
  })`).catch(() => null);

  const perf = await c.eval(`(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const res = performance.getEntriesByType('resource').map(r => ({
      name: r.name, type: r.initiatorType,
      transfer: r.transferSize, encoded: r.encodedBodySize, decoded: r.decodedBodySize,
      dur: Math.round(r.duration)
    }));
    const lcpE = performance.getEntriesByType('largest-contentful-paint');
    const lcp = lcpE.length ? lcpE[lcpE.length - 1] : null;
    const shifts = performance.getEntriesByType('layout-shift');
    const cls = shifts.filter(e => !e.hadRecentInput).reduce((s, e) => s + e.value, 0);
    const paints = performance.getEntriesByType('paint').map(p => ({ name: p.name, startTime: Math.round(p.startTime * 10) / 10 }));
    return {
      href: location.href, title: document.title,
      visibilityState: document.visibilityState,
      nav: { domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd,
        domInteractive: nav.domInteractive, responseEnd: nav.responseEnd,
        transferSize: nav.transferSize, encodedBodySize: nav.encodedBodySize,
        decodedBodySize: nav.decodedBodySize, type: nav.type },
      lcp: lcp ? { startTime: Math.round(lcp.startTime * 10) / 10, size: lcp.size,
        element: lcp.element ? (lcp.element.tagName + (lcp.element.className && typeof lcp.element.className === 'string' ? '.' + lcp.element.className.split(' ')[0] : '')) : null } : null,
      lcpEntries: lcpE.length,
      cls: Math.round(cls * 10000) / 10000,
      paints,
      layoutShiftCount: shifts.length,
      resourceCount: res.length,
      resourceTransferTotal: res.reduce((s, r) => s + r.transfer, 0),
      resources: res
    };
  })()`);

  // Network-domain totals from captured CDP events.
  const evs = c.events.filter((e) => e.method && e.method.startsWith('Network.'));
  const sent = new Map();
  const failedReqs = [];
  for (const e of evs) {
    if (e.method === 'Network.requestWillBeSent') {
      const r = e.params.request;
      if (r && /^https?:/.test(r.url)) sent.set(e.params.requestId, { url: r.url, type: null, status: null });
    }
    if (e.method === 'Network.responseReceived') {
      const s = sent.get(e.params.requestId);
      if (s) { s.type = e.params.type || e.params.response.mimeType; s.status = e.params.response.status; }
    }
    if (e.method === 'Network.loadingFailed') {
      const s = sent.get(e.params.requestId);
      failedReqs.push({ url: s ? s.url : '(unknown ' + e.params.requestId + ')', errorText: e.params.errorText, type: e.params.type, canceled: e.params.canceled });
    }
  }
  let netBytes = 0, netFinished = 0, netFailed = 0;
  const byType = {};
  const finishedReqs = [];
  for (const e of evs) {
    if (e.method === 'Network.loadingFinished') {
      const s = sent.get(e.params.requestId);
      if (!s) continue;
      netBytes += e.params.encodedDataLength || 0;
      netFinished++;
      byType[s.type || 'other'] = (byType[s.type || 'other'] || 0) + (e.params.encodedDataLength || 0);
      finishedReqs.push({ url: s.url, type: s.type, status: s.status, bytes: e.params.encodedDataLength || 0 });
    }
    if (e.method === 'Network.loadingFailed') netFailed++;
  }
  c.close();

  const result = {
    label: url, measuredAt: startedAt, settledAfterNavMs: settledMs,
    viewport: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true },
    chrome: 'Muse Browser 157.0.8103.81 (via CDP)',
    network: {
      requestsSentHttp: sent.size,
      requestsFinished: netFinished,
      requestsFailed: netFailed,
      transferredBytes: netBytes,
      transferredMiB: Math.round((netBytes / 1048576) * 100) / 100,
      bytesByType: byType,
      failedRequests: failedReqs,
      finishedRequests: finishedReqs,
    },
    perf,
    perfObserverLog: perfLog,
    firebaseCheck: fbCheck,
    cdMetrics: mMap,
    cdMetricsDeltaAcrossReload: delta,
  };
  fs.writeFileSync(outJson, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    url, requestsSent: sent.size, finished: netFinished, failed: netFailed,
    transferredBytes: netBytes, lcp: perf.lcp, cls: perf.cls,
    observerLcp: perfLog && perfLog.lcp, observerCls: perfLog && perfLog.cls,
    supportedEntryTypes: perfLog && perfLog.supported,
    loadEventEnd: perf.nav.load, domContentLoaded: perf.nav.domContentLoaded,
    ScriptDurationDelta: delta.ScriptDuration, V8CompileDelta: delta.V8CompileDuration,
    firebase: fbCheck,
  }, null, 2));
  process.exit(0);
}

measure(process.argv[2], process.argv[3]).catch((e) => { console.error('MEASURE FAIL', e); process.exit(1); });
