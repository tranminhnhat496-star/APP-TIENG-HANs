const fs = require('fs');
const { openPage } = require('../v15ui/cdp');
const OUT = 'http://127.0.0.1:8931/index.html';
const SEED = fs.readFileSync('../v15ui/setups/seed.js', 'utf8');
const MARK = fs.readFileSync('setups/mark-lib.js', 'utf8');
(async () => {
  const c = await openPage(OUT, 390, 844);
  try {
    await c.eval(`(async()=>{ ${SEED} })()`, true);
    await c.eval('location.reload()');
    await new Promise(r => setTimeout(r, 1500));
    await c.eval(`(async()=>{ ${MARK} })()`, true);
    await new Promise(r => setTimeout(r, 800));
    const r = await c.eval(`(() => {
      const c15 = window.__v15.counts;
      const a1 = window.__v15.words.filter(w => (w.lib||[]).indexOf('a1a2') >= 0);
      const first12 = a1.slice(0,12).map(w => w.en + '/' + (w.a1a2Topic||w.t) + '/box' + (window.__v15.enOld().box[w.id]||0));
      const edu = document.querySelectorAll('.v17card .mute');
      return { counts: c15, boxKeys: Object.keys(window.__v15.enOld().box).length,
        first12, cardMute0: edu[0] ? edu[0].textContent : null,
        cardMute1: edu[1] ? edu[1].textContent : null };
    })()`);
    console.log(JSON.stringify(r, null, 1));
  } finally { c.close(); }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
