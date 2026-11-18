// Probe: dump the gem bonus line's exact codepoints after a streak-7 session.
const { openPage, closeTarget } = require('../v15ui/cdp.js');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SEED = fs.readFileSync(__dirname + '/../v15ui/setups/seed.js', 'utf8');
const T27 = fs.readFileSync(__dirname + '/test27.js', 'utf8');
const _ds = T27.indexOf('const DRIVER = `') + 'const DRIVER = `'.length;
const _de = T27.indexOf('`;', _ds);
const DRIVER = eval('`' + T27.slice(_ds, _de) + '`'); // the exact driver string test27 uses
const URL = 'http://127.0.0.1:8931/index.html';
(async () => {
  const c = await openPage(URL, 390, 844);
  try {
    await sleep(1500);
    await c.eval(`localStorage.clear(); location.reload()`);
    await sleep(1800);
    await c.eval(`(async()=>{ ${SEED} })()`, true);
    await c.eval(`location.reload()`);
    await sleep(1800);
    await c.eval(DRIVER);
    await c.eval(`(function(){
      const old = window.__v15.enOld(), e15 = window.__v15.en15();
      [[26, 0, 2], [27, 1, 3], [28, 0, 1]].forEach(function(s){
        const w = window.__v15.words[s[0]];
        old.box[w.id] = 1; old.right[w.id] = s[1]; old.wrong[w.id] = s[2]; e15.due[w.id] = Date.now() - 864e5;
      });
      const d = window.__v27.en27();
      d.streak.en = { d: new Date(Date.now() - 864e5).toDateString(), n: 6 };
    })()`);
    await c.eval(`window.__v27.openSmart('en'); window.__v27.startWeak('en')`);
    await sleep(800);
    const run = await c.eval(`window.__t27drive({ wrongAt: [], maxQ: 20 })`, true);
    console.log('done:', run.done, 'gems:', run.gemsStart, '->', run.gemsEnd);
    const dump = await c.eval(`(function(){
      const b = document.querySelector('#v27body .v27line.bonus');
      if (!b) return { bonusLine: null, bodyHasGem: document.querySelector('#v27body').innerHTML.indexOf('\\u{1F48E}') >= 0 };
      const t = b.textContent;
      return { text: t, codes: Array.from(t).map(function(ch){ return ch.codePointAt(0).toString(16); }),
               htmlHasGem: document.querySelector('#v27body').innerHTML.includes('\\u{1F48E}'),
               htmlSnippet: document.querySelector('#v27body').innerHTML.slice(document.querySelector('#v27body').innerHTML.indexOf('+1') - 5, document.querySelector('#v27body').innerHTML.indexOf('+1') + 60) };
    })()`, true);
    console.log(JSON.stringify(dump, null, 2));
  } finally { closeTarget(c); }
  process.exit(0);
})().catch(e => { console.error('PROBE FAIL', e); process.exit(1); });
