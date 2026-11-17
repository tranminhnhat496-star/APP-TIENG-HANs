// dbg25b.js — reproduce the §3 "group progress after goHome" flow and inspect.
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
    const r1 = await c.eval(`(() => ({
      v25: !!(window.__v25), gpHome: document.querySelectorAll('.v25group-progress').length,
      lib: !!document.querySelector('.v17lib')
    }))()`);
    console.log('after MARK:', JSON.stringify(r1));
    const r2 = await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      window.__v17.openTopic('a1_education'); await sleep(500);
      const btn = [...document.querySelectorAll('.v17word-acts .btn')].find(b => b.textContent.includes('Đánh dấu đã thuộc'));
      if (btn) btn.click(); await sleep(600);
      const badgeAfter = (document.querySelector('.v17word .v25status')||{}).textContent || '';
      window.__v17.goHome(); await sleep(600);
      return {
        badgeAfter, lib: !!document.querySelector('.v17lib'),
        groups: document.querySelectorAll('.v17lib .v17group').length,
        gp: document.querySelectorAll('.v25group-progress').length,
        gpText: [...document.querySelectorAll('.v25group-progress')].map(g => g.textContent.trim().slice(0, 40)),
        v25: !!(window.__v25),
      };
    })()`, true);
    console.log('after goHome:', JSON.stringify(r2, null, 1));
    // manual decorate + re-check
    const r3 = await c.eval(`(() => {
      let err = '';
      try { window.__v25.decorate(); } catch (e) { err = String(e && e.message); }
      return {err, gp: document.querySelectorAll('.v25group-progress').length};
    })()`);
    console.log('after manual decorate:', JSON.stringify(r3));
    // does decorateGroups throw? call internals via a fresh decorate with error capture
    const r4 = await c.eval(`(() => {
      const groups = document.querySelectorAll('.v17lib .v17group');
      const out = [];
      groups.forEach(g => {
        const head = g.querySelector('.v17group-head b');
        out.push(head ? head.textContent.trim().slice(0, 20) : 'NO-HEAD');
      });
      let gsErr = '';
      try { const s = window.__v25.groupStats('a1a2'); out.push('a1a2stats:' + JSON.stringify(s)); }
      catch (e) { gsErr = String(e && e.message); }
      return {out, gsErr};
    })()`);
    console.log('groups+stats:', JSON.stringify(r4, null, 1));
  } finally { c.close(); }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
