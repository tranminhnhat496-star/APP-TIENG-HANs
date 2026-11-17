// One-off probe: why is #v15langbar 92px tall at 390px after V26?
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
    const r = await c.eval(`(function(){
      const lb = document.querySelector('#v15langbar');
      const inn = document.querySelector('#v15langbar .v15lb-in');
      const cs = getComputedStyle(lb), ci = getComputedStyle(inn);
      return {
        lb: lb.getBoundingClientRect().toJSON(),
        lbPad: cs.padding, lbH: cs.height,
        inn: inn.getBoundingClientRect().toJSON(),
        innFlexWrap: ci.flexWrap, innOverflowX: ci.overflowX, innDisplay: ci.display,
        children: [...inn.children].map(e => ({
          cls: e.className, txt: (e.textContent || '').trim().slice(0, 20),
          r: e.getBoundingClientRect().toJSON(),
          display: getComputedStyle(e).display,
        })),
      };
    })()`, true);
    console.log(JSON.stringify(r, null, 2));
  } finally { closeTarget(c); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
