// Probe-only script (not part of the test suite): inspect APIs/DOM the harness needs.
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
    await step('versions', `(() => ({ v15: window.__v15 && __v15.version, v17: window.__v17 && __v17.version, v18: window.__v18 && __v18.version, v19: window.__v19 && __v19.version, v20: window.__v20 && __v20.version, v20sync: window.__v20sync && __v20sync.version, v21: window.__v21 && __v21.version, v22: window.__v22 && __v22.version, v23: window.__v23 && __v23.version, v24: window.__v24 && __v24.version, v25: window.__v25 && __v25.version, v26: window.__v26 && __v26.version, v27: window.__v27 && __v27.version, mergeSaves: typeof (window.__v20sync && __v20sync.mergeSaves) }))()`);
    await step('words', `(() => { const w = window.__v15.words; const ox = w.find(x => x.oxLessons && x.oxLessons.length); const a1 = w.find(x => x.a1a2Topics && x.a1a2Topics.length); return { total: w.length, btBefore: w.filter(x => (x.lib || []).indexOf('bt') >= 0).length, oxSample: ox ? { id: ox.id, oxLessons: ox.oxLessons } : null, a1Sample: a1 ? { id: a1.id, topics: a1.a1a2Topics } : null, v19bosses: Object.keys(window.__v19.bosses || {}).slice(0, 3), v18bosses: Object.keys(window.__v18.bosses || {}).slice(0, 3), koCards: window.__v27._test.koCards().slice(0, 2).map(x => ({ id: x.id, h: x.h, box: x.box })) }; })()`);
    await step('fight18-start', `(async () => { window.__v15.choose('en'); window.__v15.openHub(); window.__v15.tab('bosses'); await new Promise(r => setTimeout(r, 400)); window.__v18._test.fight('v10_slime'); await new Promise(r => setTimeout(r, 600)); const F = window.__v18._test.F(); return { Fnull: F === null || F === undefined, keys: F ? Object.keys(F) : null, cur: F && F.cur ? { w: F.cur.w && F.cur.w.id, mode: F.mode, ko: !!F.cur.ko } : null, fightVisible: !!document.querySelector('#v18fight .v18fight'), fightHTML: (document.querySelector('#v18fight') || {}).innerHTML ? document.querySelector('#v18fight').innerHTML.slice(0, 200) : null }; })()`);
    await step('fight18-pick', `(async () => { const before = Object.keys(window.__v27.en27().en.last); const F = window.__v18._test.F(); const curId = F && F.cur && F.cur.w ? F.cur.w.id : null; window.__v18._test.pickCorrect(); await new Promise(r => setTimeout(r, 500)); const F2 = window.__v18._test.F(); return { curId, afterCur: F2 && F2.cur ? F2.cur.w && F2.cur.w.id : null, newLastKeys: Object.keys(window.__v27.en27().en.last).filter(k => before.indexOf(k) < 0), cr: curId ? window.__v27.en27().en.cr[curId] : null }; })()`);
    await step('fight19-start', `(async () => { window.__v19.openMapFor('en'); await new Promise(r => setTimeout(r, 500)); const b19 = Object.keys(window.__v19.bosses || {})[0]; window.__v19._test.fight(b19); await new Promise(r => setTimeout(r, 600)); const F = window.__v19._test.F(); return { boss: b19, Fnull: F === null || F === undefined, cur: F && F.cur ? { w: F.cur.w && F.cur.w.id, ko: !!F.cur.ko } : null, fightVisible: !!document.querySelector('#v19fight .v19fight') }; })()`);
    await step('fight19-pick', `(async () => { const before = Object.keys(window.__v27.en27().en.last); const F = window.__v19._test.F(); const curId = F && F.cur && F.cur.w ? F.cur.w.id : null; window.__v19._test.pickCorrect(); await new Promise(r => setTimeout(r, 500)); return { curId, newLastKeys: Object.keys(window.__v27.en27().en.last).filter(k => before.indexOf(k) < 0) }; })()`);
    await step('ko-hub', `(async () => { window.__v15.choose('ko'); await new Promise(r => setTimeout(r, 900)); return { tabs: [...document.querySelectorAll('.tabs .tab')].map(b => (b.textContent || '').trim()), stageHTML: (document.querySelector('#stage') || {}).innerHTML ? document.querySelector('#stage').innerHTML.slice(0, 800) : null }; })()`);
  } finally { closeTarget(c); }
  process.exit(0);
})().catch(e => { console.error('PROBE FAIL', e); process.exit(1); });
