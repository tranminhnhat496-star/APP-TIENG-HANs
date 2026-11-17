// baseline26.js — đo baseline V15.2 (trước V26) cho Pet Hub + hub chính.
// Chạy:  OUT=http://127.0.0.1:8931/index.html node baseline26.js
// Kết quả: tools/v15nav/baseline26.json + tools/v15nav/shots-before/*.png
const fs = require('fs');
const path = require('path');
const { openPage, shot } = require('../v15ui/cdp');
const { sleep, AUDIT_NAV } = require('./audit-nav');

const OUT = process.env.OUT || 'http://127.0.0.1:8931/index.html';
const DIR = __dirname;
const SEED = fs.readFileSync(path.join(DIR, '../v15ui/setups/seed.js'), 'utf8');
const EMPTY = fs.readFileSync(path.join(DIR, 'setups/pet-empty.js'), 'utf8');
const FULL = fs.readFileSync(path.join(DIR, 'setups/pet-full.js'), 'utf8');

const VPS = [[320, 640], [360, 740], [375, 812], [390, 844], [414, 896], [430, 932], [768, 1024], [1366, 768]];
const results = {};

async function fresh(c, w, h) {
  await c.eval(`(async()=>{ ${SEED} })()`, true);
  await c.eval('location.reload()'); await sleep(1800);
  await c.eval(AUDIT_NAV, true);
}

(async () => {
  const c = await openPage(OUT, 390, 844);
  try {
    for (const [w, h] of VPS) {
      await c.eval(`window.resizeTo(${w}, ${h})`, true);
      await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
      await sleep(400);
      const R = {};
      // Korean hub
      await fresh(c, w, h);
      R.korean = await c.eval(`window.__auditNav('korean')`, true);
      // EN hub
      await fresh(c, w, h);
      await c.eval(`window.__v15.openHub('learn')`, true); await sleep(600);
      R.enhub = await c.eval(`window.__auditNav('enhub')`, true);
      // Pet Hub — trống
      await fresh(c, w, h);
      await c.eval(`(async()=>{ ${EMPTY} })()`, true); await sleep(800);
      R.petEmpty = await c.eval(`window.__auditNav('pethub')`, true);
      // Pet Hub — có thú (tab pets)
      await fresh(c, w, h);
      await c.eval(`(async()=>{ ${FULL} })()`, true); await sleep(800);
      R.petFull = await c.eval(`window.__auditNav('pethub')`, true);
      // Pet Hub — đội hình (có thú)
      await c.eval(`window.__v23.openHub('team')`, true); await sleep(600);
      R.petTeam = await c.eval(`window.__auditNav('pethub')`, true);
      // Pet Hub — tiến hóa (có thú)
      await c.eval(`window.__v23.openHub('evo')`, true); await sleep(600);
      R.petEvo = await c.eval(`window.__auditNav('pethub')`, true);
      results[`${w}x${h}`] = R;
      console.log(w, 'done');
    }
    fs.writeFileSync(path.join(DIR, 'baseline26.json'), JSON.stringify(results, null, 1));
    console.log('wrote baseline26.json');
  } finally { c.close(); }
  process.exit(0);
})().catch(e => { console.error('BASELINE FAIL', e); process.exit(1); });
