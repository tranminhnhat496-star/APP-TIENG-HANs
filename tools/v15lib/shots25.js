// shots25.js — chụp ảnh SAU (V15.2) cho 7 màn hình Thư viện.
// Chạy:  OUT=http://127.0.0.1:8931/index.html node shots25.js
// Kết quả: tools/v15lib/shots-after/*.png (+ library-full.png)
const fs = require('fs');
const path = require('path');
const { openPage, shot } = require('../v15ui/cdp');
const { sleep } = require('./audit-lib');

const OUT = process.env.OUT || 'http://127.0.0.1:8931/index.html';
const DIR = __dirname;
const SEED = fs.readFileSync(path.join(DIR, '../v15ui/setups/seed.js'), 'utf8');
// Xóa scope đã lưu (test25 run 4 để lại scope BT Unit 1) trước mỗi màn
// hình, để ảnh sau khớp điều kiện ảnh trước (không có banner scope) và
// flashcard không rơi vào trạng thái rỗng do dữ liệu BT chưa tải.
const CLEAR_SCOPE = ';try{var _s=JSON.parse(localStorage.getItem("hanvocab.v1"));if(_s&&_s.v7&&_s.v7.en15){_s.v7.en15.scope=null;localStorage.setItem("hanvocab.v1",JSON.stringify(_s));}}catch(e){}';
const SEED_CLEAN = SEED + CLEAR_SCOPE;
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
  try {
    for (const s of SCREENS) {
      await c.eval(`(async()=>{ ${SEED_CLEAN} })()`, true);
      await c.eval('location.reload()'); await sleep(1500);
      await c.eval(`(async()=>{ ${s.setup} })()`, true); await sleep(s.wait);
      await shot(c, path.join(DIR, 'shots-after', s.name + '.png'), false);
      console.log(s.name, '-> shots-after/' + s.name + '.png');
    }
    await c.eval(`(async()=>{ ${SEED_CLEAN} })()`, true);
    await c.eval('location.reload()'); await sleep(1500);
    await c.eval(`(async()=>{ ${MARK} })()`, true); await sleep(2500);
    await shot(c, path.join(DIR, 'shots-after', 'library-full.png'), true);
    console.log('library-full -> shots-after/library-full.png');
  } finally { c.close(); }
  process.exit(0);
})().catch(e => { console.error('SHOTS FAIL', e); process.exit(1); });
