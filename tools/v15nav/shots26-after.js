// shots26-after.js — chụp ảnh SAU (V15.3) cho các màn hình Pet Hub + hub chính.
// Chạy:  OUT=http://127.0.0.1:8931/index.html node shots26-after.js
// Kết quả: tools/v15nav/shots-after/*.png
const fs = require('fs');
const path = require('path');
const { openPage, shot } = require('../v15ui/cdp');
const { sleep } = require('./audit-nav');

const OUT = process.env.OUT || 'http://127.0.0.1:8931/index.html';
const DIR = __dirname;
const SEED = fs.readFileSync(path.join(DIR, '../v15ui/setups/seed.js'), 'utf8');
const EMPTY = fs.readFileSync(path.join(DIR, 'setups/pet-empty.js'), 'utf8');
const FULL = fs.readFileSync(path.join(DIR, 'setups/pet-full.js'), 'utf8');

async function fresh(c) {
  await c.eval(`(async()=>{ ${SEED} })()`, true);
  await c.eval('location.reload()'); await sleep(1800);
}
async function setVP(c, w, h) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await sleep(400);
}
async function snap(c, name) {
  await shot(c, path.join(DIR, 'shots-after', name + '.png'), false);
  console.log(name, '-> shots-after/' + name + '.png');
}

(async () => {
  const c = await openPage(OUT, 390, 844);
  try {
    // 390px: Korean + EN hub
    await setVP(c, 390, 844);
    await fresh(c); await snap(c, 'korean-390');
    await fresh(c);
    await c.eval(`window.__v15.openHub('learn')`, true); await sleep(600);
    await snap(c, 'enhub-390');
    // 390px: Pet Hub trống — cả 7 tab
    for (const tab of ['pets', 'hatch', 'evo', 'team', 'skills', 'collection', 'shop']) {
      await fresh(c);
      await c.eval(`(async()=>{ ${EMPTY} })()`, true); await sleep(600);
      await c.eval(`window.__v23.openHub('${tab}')`, true); await sleep(600);
      await snap(c, `pet-empty-${tab}-390`);
    }
    // 390px: Pet Hub có thú — pets + team + evo
    for (const tab of ['pets', 'team', 'evo']) {
      await fresh(c);
      await c.eval(`(async()=>{ ${FULL} })()`, true); await sleep(600);
      await c.eval(`window.__v23.openHub('${tab}')`, true); await sleep(600);
      await snap(c, `pet-full-${tab}-390`);
    }
    // 320px: trống + đội hình
    await setVP(c, 320, 640);
    await fresh(c);
    await c.eval(`(async()=>{ ${EMPTY} })()`, true); await sleep(600);
    await snap(c, 'pet-empty-pets-320');
    await fresh(c);
    await c.eval(`(async()=>{ ${FULL} })()`, true); await sleep(600);
    await c.eval(`window.__v23.openHub('team')`, true); await sleep(600);
    await snap(c, 'pet-full-team-320');
    // 1366px: có thú + EN hub (desktop đối chứng)
    await setVP(c, 1366, 768);
    await fresh(c);
    await c.eval(`(async()=>{ ${FULL} })()`, true); await sleep(600);
    await snap(c, 'pet-full-pets-1366');
    await fresh(c);
    await c.eval(`window.__v15.openHub('learn')`, true); await sleep(600);
    await snap(c, 'enhub-1366');
  } finally { c.close(); }
  process.exit(0);
})().catch(e => { console.error('SHOTS FAIL', e); process.exit(1); });
