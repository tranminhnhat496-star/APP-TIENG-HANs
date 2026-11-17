// dbg25d.js — debug the favorite toggle on a BT unit row.
const fs = require('fs');
const { openPage } = require('../v15ui/cdp');
const OUT = 'http://127.0.0.1:8931/index.html';
const SEED = fs.readFileSync('../v15ui/setups/seed.js', 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const c = await openPage(OUT, 390, 844);
  try {
    await c.eval(`(async()=>{ ${SEED} })()`, true);
    await c.eval('location.reload()'); await sleep(2000);
    await c.eval(`(async()=>{ ${fs.readFileSync('setups/lib-btunit.js', 'utf8')} })()`, true);
    await sleep(2000);
    const r = await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const btn = [...document.querySelectorAll('.v17word-acts .btn')].find(b => b.textContent.includes('Yêu thích'));
      if (!btn) return {found: false};
      const info = {
        onclick: btn.getAttribute('onclick'),
        rowWord: (btn.closest('.v17word').querySelector('.v17word-main b')||{}).textContent,
        favBefore: (window.__v15.en15(), (S.v7.en17||{}).fav || []).slice(),
        clsBefore: btn.className,
      };
      btn.click(); await sleep(600);
      const b2 = [...document.querySelectorAll('.v17word-acts .btn')].find(b => b.textContent.includes('Yêu thích'));
      info.favAfter = ((S.v7.en17||{}).fav || []).slice();
      info.clsAfter = b2 ? b2.className : 'NO-BTN';
      info.textAfter = b2 ? b2.textContent : '';
      info.stillUnit = window.__v22.state.view;
      return info;
    })()`, true);
    console.log(JSON.stringify(r, null, 1));
  } finally { c.close(); }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
