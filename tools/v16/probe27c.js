// Probe: when do gems become 48 instead of 42 after a seeded fresh load?
const { openPage, closeTarget } = require('../v15ui/cdp.js');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SEED = fs.readFileSync(__dirname + '/../v15ui/setups/seed.js', 'utf8');
const URL = 'http://127.0.0.1:8931/index.html';
(async () => {
  const c = await openPage(URL, 390, 844);
  try {
    await sleep(1500);
    await c.eval(`localStorage.clear(); location.reload()`);
    await sleep(1800);
    console.log('after clear+reload:', await c.eval(`(function(){ const S = JSON.parse(localStorage.getItem('hanvocab.v1')); return { xp: S.xp, gems: S.v7 && S.v7.gems }; })()`, true));
    await c.eval(`(async()=>{ ${SEED} })()`, true);
    console.log('after seed (no reload):', await c.eval(`(function(){ const S = JSON.parse(localStorage.getItem('hanvocab.v1')); return { xp: S.xp, gems: S.v7 && S.v7.gems }; })()`, true));
    await c.eval(`location.reload()`);
    await sleep(1800);
    console.log('after seed+reload:', await c.eval(`(function(){ const S = JSON.parse(localStorage.getItem('hanvocab.v1')); return { xp: S.xp, gems: S.v7 && S.v7.gems }; })()`, true));
    await sleep(3000);
    console.log('after +3s idle:', await c.eval(`(function(){ const S = JSON.parse(localStorage.getItem('hanvocab.v1')); return { xp: S.xp, gems: S.v7 && S.v7.gems }; })()`, true));
  } finally { closeTarget(c); }
  process.exit(0);
})().catch(e => { console.error('PROBE FAIL', e); process.exit(1); });
