// Probe the exact §1b sequence: langbar height WITH the EN hub open.
const fs = require('fs');
const path = require('path');
const { openPage, closeTarget } = require('../v15ui/cdp.js');
const { sleep, AUDIT_NAV } = require('./audit-nav.js');

const URL = 'http://127.0.0.1:8931/index.html';
const SEED = fs.readFileSync(path.join(__dirname, '..', 'v15ui', 'setups', 'seed.js'), 'utf8');

(async () => {
  const c = await openPage(URL, 390, 844);
  try {
    await c.eval(AUDIT_NAV);
    await c.eval(SEED);
    await c.eval('location.reload()');
    await sleep(1500);
    const before = await c.eval(`document.querySelector('#v15langbar').getBoundingClientRect().height`, true);
    await c.eval(`window.__v15 && window.__v15.openHub('library')`);
    await sleep(700);
    const r = await c.eval(`(function(){
      const lb = document.querySelector('#v15langbar');
      const inn = document.querySelector('#v15langbar .v15lb-in');
      return {
        before: ${JSON.stringify(before)},
        lbH: lb.getBoundingClientRect().height,
        innH: inn.getBoundingClientRect().height,
        innWrap: getComputedStyle(inn).flexWrap,
        children: [...inn.children].map(e => ({
          cls: e.className, txt: (e.textContent || '').trim().slice(0, 22),
          h: Math.round(e.getBoundingClientRect().height),
          top: Math.round(e.getBoundingClientRect().top),
          display: getComputedStyle(e).display,
        })),
        hubOpen: !!document.querySelector('#v15hub'),
      };
    })()`, true);
    console.log(JSON.stringify(r, null, 2));
  } finally { closeTarget(c); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
