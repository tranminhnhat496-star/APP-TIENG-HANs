// Probe #v15langbar internals with the EN hub open.
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
    await c.eval(`window.__v15 && window.__v15.openHub('library')`);
    await sleep(700);
    const r = await c.eval(`(function(){
      const lb = document.querySelector('#v15langbar');
      const cs = getComputedStyle(lb);
      return {
        childCount: lb.children.length,
        childTags: [...lb.children].map(e => e.tagName + '.' + (e.className || '').toString().slice(0, 20)),
        childRects: [...lb.children].map(e => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), h: Math.round(r.height) }; }),
        csHeight: cs.height, csMinH: cs.minHeight, csPad: cs.padding, csBox: cs.boxSizing,
        csDisplay: cs.display, csPosition: cs.position, csOverflow: cs.overflow,
        htmlLen: lb.innerHTML.length,
        htmlHead: lb.innerHTML.slice(0, 400),
      };
    })()`, true);
    console.log(JSON.stringify(r, null, 2));
  } finally { closeTarget(c); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
