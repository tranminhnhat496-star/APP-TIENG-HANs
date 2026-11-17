// baseline25.js — audit TRƯỚC (V15.1) cho V15.2 Library UI.
// Chạy:  OUT=http://127.0.0.1:8931/index.html node baseline25.js
// Kết quả: tools/v15lib/baseline25.json + tools/v15lib/shots-before/*.png
// (lưu bền trong workspace ngay từ đầu — bài học V15.1: /tmp bị xóa).
const fs = require('fs');
const path = require('path');
const { openPage, shot } = require('../v15ui/cdp');
const { auditScreen, sleep } = require('./audit-lib');

const OUT = process.env.OUT || 'http://127.0.0.1:8931/index.html';
const DIR = __dirname;
const SEED = fs.readFileSync(path.join(DIR, '../v15ui/setups/seed.js'), 'utf8');
const MARK = fs.readFileSync(path.join(DIR, 'setups/mark-lib.js'), 'utf8');

const SCREENS = [
  { name: 'library', setup: MARK, wait: 2500 },
  { name: 'topic', setup: MARK + '\n' + fs.readFileSync(path.join(DIR, 'setups/lib-topic.js'), 'utf8'), wait: 2000 },
  { name: 'lesson', setup: MARK + '\n' + fs.readFileSync(path.join(DIR, 'setups/lib-lesson.js'), 'utf8'), wait: 2000 },
  { name: 'btunit', setup: fs.readFileSync(path.join(DIR, 'setups/lib-btunit.js'), 'utf8'), wait: 2500 },
  { name: 'quest', setup: fs.readFileSync(path.join(DIR, 'setups/lib-quest.js'), 'utf8'), wait: 2000 },
  { name: 'flash', setup: fs.readFileSync(path.join(DIR, 'setups/lib-flash.js'), 'utf8'), wait: 1500 },
  { name: 'vocab', setup: fs.readFileSync(path.join(DIR, 'setups/lib-vocab.js'), 'utf8'), wait: 1500 },
];

(async () => {
  const c = await openPage(OUT, 390, 844);
  const results = {};
  try {
    for (const s of SCREENS) {
      console.log('==', s.name);
      const r = await auditScreen(c, SEED, s.setup, s.wait);
      results[s.name] = {
        checked: r.checked,
        violations: r.violations,
        smallText: r.smallText,
        imageBg: r.imageBg,
        overflow: r.overflow,
      };
      console.log(`  checked=${r.checked} violations=${r.violations.length} small=${r.smallText.length} overflowWide=${r.overflow.wide.length} scrollW=${r.overflow.docScrollW}`);
      r.violations.slice(0, 5).forEach(v => console.log('   V:', JSON.stringify(v)));
      r.smallText.slice(0, 5).forEach(v => console.log('   S:', JSON.stringify(v)));
      await shot(c, path.join(DIR, 'shots-before', s.name + '.png'), false);
      console.log('  shot saved');
    }
    // fullpage library home for detailed before/after review
    await c.eval(`(async()=>{ ${SEED} })()`, true);
    await c.eval('location.reload()'); await sleep(1500);
    await c.eval(`(async()=>{ ${MARK} })()`, true); await sleep(2500);
    await shot(c, path.join(DIR, 'shots-before', 'library-full.png'), true);
    console.log('  fullpage library shot saved');
  } finally { c.close(); }
  fs.writeFileSync(path.join(DIR, 'baseline25.json'), JSON.stringify(results, null, 1));
  console.log('wrote baseline25.json');
  process.exit(0);
})().catch(e => { console.error('BASELINE FAIL', e); process.exit(1); });
