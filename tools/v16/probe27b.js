// Probe 2: KO flashcard rate buttons + v19 fight with a real boss id.
const { openPage, closeTarget } = require('../v15ui/cdp.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = 'http://127.0.0.1:8931/index.html';
(async () => {
  const c = await openPage(URL, 390, 844);
  try {
    await sleep(1500);
    await c.eval(`localStorage.clear(); location.reload()`);
    await sleep(2000);
    const step = async (name, expr) => {
      try { const v = await c.eval(expr, true); console.log('## ' + name, JSON.stringify(v)); }
      catch (e) { console.log('## ' + name + ' ERROR', String(e).slice(0, 300)); }
    };
    await step('fight19-real', `(async () => { window.__v15.choose('en'); window.__v19.openMapFor('en'); await new Promise(r => setTimeout(r, 500)); window.__v19._test.fight('v11_fireking'); await new Promise(r => setTimeout(r, 700)); const F = window.__v19._test.F(); const before = Object.keys(window.__v27.en27().en.last); const curId = F && F.cur && F.cur.w ? F.cur.w.id : null; if (curId) { window.__v19._test.pickCorrect(); await new Promise(r => setTimeout(r, 500)); } return { Fnull: !F, curId, fightVisible: !!document.querySelector('#v19fight .v19fight'), newLast: Object.keys(window.__v27.en27().en.last).filter(k => before.indexOf(k) < 0), cr: curId ? window.__v27.en27().en.cr[curId] : null }; })()`);
    await step('ko-flash', `(async () => { window.__v15.choose('ko'); await new Promise(r => setTimeout(r, 900)); const card0 = window.__v27._test.koCards()[0]; const koBefore = JSON.stringify(window.__v27.en27().ko); const cardBefore = JSON.stringify({ box: card0.box, w: card0.w || 0 }); const flipBtn = [...document.querySelectorAll('#stage button')].find(b => (b.getAttribute('onclick') || '').indexOf('flip()') >= 0); if (flipBtn) flipBtn.click(); await new Promise(r => setTimeout(r, 500)); const stageBtns = [...document.querySelectorAll('#stage button')].map(b => (b.getAttribute('onclick') || '') + ' | ' + (b.textContent || '').trim()); const rateBtn = [...document.querySelectorAll('#stage button')].find(b => (b.getAttribute('onclick') || '').indexOf('rate(') >= 0); let rated = null; if (rateBtn) { rateBtn.click(); await new Promise(r => setTimeout(r, 400)); rated = { cardAfter: { box: card0.box, w: card0.w || 0 }, koChanged: JSON.stringify(window.__v27.en27().ko) !== koBefore }; } return { cardId: card0.id, cardBefore, stageBtns: stageBtns.slice(0, 8), rated }; })()`);
  } finally { closeTarget(c); }
  process.exit(0);
})().catch(e => { console.error('PROBE FAIL', e); process.exit(1); });
