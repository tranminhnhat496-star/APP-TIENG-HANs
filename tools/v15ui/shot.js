// Screenshot CLI: node shot.js --url <url> --out <png> [--width 390] [--height 844]
//   [--prerun <jsfile>] [--setup <jsfile>] [--wait <ms>] [--fullpage] [--target <id>]
const fs = require('fs');
const { openPage, shot, closeTarget, parseArgs } = require('./cdp');

(async () => {
  const o = parseArgs();
  const width = parseInt(o.width || '390', 10);
  const height = parseInt(o.height || '844', 10);
  const wait = parseInt(o.wait || '800', 10);
  const c = await openPage(o.url, width, height);
  try {
    if (o.prerun) {
      const js = fs.readFileSync(o.prerun, 'utf8');
      await c.eval(`(async()=>{ ${js} })()`, true);
      await c.eval('location.reload()');
      await new Promise(r => setTimeout(r, 1500));
    }
    if (o.setup) {
      const js = fs.readFileSync(o.setup, 'utf8');
      await c.eval(`(async()=>{ ${js} })()`, true);
      await new Promise(r => setTimeout(r, wait));
    }
    await shot(c, o.out, o.fullpage === '1');
    console.log('saved', o.out);
  } finally {
    c.close();
  }
  process.exit(0);
})().catch(e => { console.error('SHOT FAIL', e.message); process.exit(1); });
