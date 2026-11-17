// dbg25e.js — xác minh edge case: scope BT còn lưu + mở flash ngay sau
// khi tải lại trang (chưa mở Thư viện để tải dữ liệu BT) thì flash có rỗng?
const fs = require('fs');
const path = require('path');
const { openPage } = require('../v15ui/cdp');
const OUT = 'http://127.0.0.1:8931/index.html';
const DIR = __dirname;
const SEED = fs.readFileSync(path.join(DIR, '../v15ui/setups/seed.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const c = await openPage(OUT, 390, 844);
  try {
    // Đặt scope BT Unit 1 vào localStorage rồi tải lại (mô phỏng người dùng
    // đã chọn scope, đóng tab, mở lại game).
    await c.eval(`(async()=>{ ${SEED}; try{var _s=JSON.parse(localStorage.getItem('hanvocab.v1'));_s.v7.en15.scope={kind:'lib',lib:'bt',unit:1};localStorage.setItem('hanvocab.v1',JSON.stringify(_s));}catch(e){} })()`, true);
    await c.eval('location.reload()'); await sleep(2000);
    const r1 = await c.eval(`(async () => {
      window.__v15.openHub(); window.__v15.startMode('flash');
      await new Promise(r => setTimeout(r, 500));
      return {fc: !!document.querySelector('.v15fc'),
              empty: (document.querySelector('#v15body')||{}).textContent.includes('Không có từ nào'),
              btLoaded: !!window.__V22_BT,
              scope: JSON.stringify(window.__v15.en15().scope)};
    })()`, true);
    console.log('fresh load + BT scope + flash ngay:', JSON.stringify(r1));
    // Mở Thư viện (tải dữ liệu BT) rồi quay lại flash.
    const r2 = await c.eval(`(async () => {
      window.__v15.tab('library');
      await window.__v22.ensureData();
      await new Promise(r => setTimeout(r, 800));
      window.__v15.tab('learn'); window.__v15.startMode('flash');
      await new Promise(r => setTimeout(r, 500));
      return {fc: !!document.querySelector('.v15fc'),
              empty: (document.querySelector('#v15body')||{}).textContent.includes('Không có từ nào'),
              btLoaded: !!window.__V22_BT,
              words: window.__v15.words.length};
    })()`, true);
    console.log('sau khi mở Thư viện + flash lại:', JSON.stringify(r2));
  } finally { c.close(); }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
