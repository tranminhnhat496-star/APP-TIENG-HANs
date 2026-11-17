// dbg25c.js — reproduce the EXACT §3 lr flow (learn -> mc -> review -> topic
// -> master -> goHome) and inspect group progress.
const fs = require('fs');
const { openPage } = require('../v15ui/cdp');
const OUT = 'http://127.0.0.1:8931/index.html';
const SEED = fs.readFileSync('../v15ui/setups/seed.js', 'utf8');
const MARK = fs.readFileSync('setups/mark-lib.js', 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const c = await openPage(OUT, 390, 844);
  try {
    await c.eval(`(async()=>{ ${SEED} })()`, true);
    await c.eval('location.reload()'); await sleep(2000);
    await c.eval(`(async()=>{ ${MARK} })()`, true); await sleep(2000);
    // flash first (like the fl eval before lr in test25)
    await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      window.__v15.openHub(); window.__v15.tab('learn'); await sleep(300);
      window.__v15.startMode('flash'); await sleep(500);
      document.querySelector('.v15fc').click(); await sleep(500);
      const okBtn = [...document.querySelectorAll('.v15fc~.acts .btn.ok')].find(b => b.textContent.includes('Đã nhớ'));
      if (okBtn) okBtn.click(); await sleep(500);
      return 'flash done';
    })()`, true);
    const lr = await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const R = {};
      window.__v17.learnScopeKey('a1a2'); await sleep(600);
      R.modes = document.querySelectorAll('.v15mode').length;
      window.__v15.startMode('mc'); await sleep(500);
      R.mcCard = !!document.querySelector('.v15qcard');
      window.__v15.backToLearn(); await sleep(300);
      window.__v17.reviewScopeKey('a1a2'); await sleep(1200);
      const rev = document.querySelector('#v15review');
      R.reviewHasContent = rev ? rev.textContent.trim().length > 50 : false;
      window.__v15.tab('library'); await sleep(400);
      window.__v17.openTopic('a1_education'); await sleep(500);
      const btn = [...document.querySelectorAll('.v17word-acts .btn')].find(b => b.textContent.includes('Đánh dấu đã thuộc'));
      if (btn) btn.click(); await sleep(600);
      R.badgeAfter = (document.querySelector('.v17word .v25status')||{}).textContent || '';
      window.__v17.goHome(); await sleep(600);
      R.lib = !!document.querySelector('.v17lib');
      R.gp = [...document.querySelectorAll('.v25group-progress')].map(g => g.textContent.trim().slice(0, 50));
      R.gpCount = document.querySelectorAll('.v25group-progress').length;
      // wait longer and re-check
      await sleep(1500);
      R.gpCountLater = document.querySelectorAll('.v25group-progress').length;
      R.errs = window.__errs || 'no-collector';
      return R;
    })()`, true);
    console.log(JSON.stringify(lr, null, 1));
  } finally { c.close(); }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
