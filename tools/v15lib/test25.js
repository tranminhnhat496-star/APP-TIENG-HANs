// test25.js — V15.2 Vocabulary Library UI test suite (real Chrome via CDP).
// Run:  OUT=http://127.0.0.1:8931/index.html node test25.js
// Needs the HTTP server serving the built out/ and the CDP harness.
// Exits 0 iff all checks pass. Logs: tools/v15lib/test25-runN.log
//
// Coverage:
//  §1  WCAG AA contrast on all 7 library screens (same setups as the
//      baseline, so numbers are directly comparable): 0 violations +
//      0 text < 12px + 0 horizontal overflow per screen.
//  §2  V25 computed values + decorator behavior (group bands, progress,
//      status badges, button colors, search type, fav .on, type badges,
//      flashcard faces, empty states, toast).
//  §3  Functional: spec §12 items 1–14 (sets, 24 BT units, search,
//      flashcard flip + rate, speak, lesson start, review, progress,
//      boss with BT vocab, hub switch, mobile, no JS errors, no data loss).
//  §4  Responsive 360 / 430 / 768 / 1280: no horizontal overflow.
//  §5  Layer/version integrity: V25 present + last, old versions unchanged.
//
// NOTE: no jsdom suite for V15.2 — jsdom is not installed in this
// environment and cannot compute real styles anyway; the V25 layer is
// CSS + DOM decoration, verified in real Chrome instead.
const fs = require('fs');
const path = require('path');
const { openPage } = require('../v15ui/cdp');
const { auditScreen, sleep } = require('./audit-lib');
const OUT = process.env.OUT || 'http://127.0.0.1:8931/index.html';
const DIR = __dirname;

let pass = 0, fail = 0; const failures = [];
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; failures.push(name + (extra ? ' — ' + extra : '')); console.log('  FAIL', name, extra || ''); }
}
function eq(a, b, name) { ok(a === b, name, `got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }

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

const OVERFLOW_JS = `(() => {
  const wide = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth + 1 && r.width > 0) {
      let anc = el.parentElement, clipped = false;
      while (anc) { const ox = getComputedStyle(anc).overflowX; if (ox !== 'visible') { clipped = true; break; } anc = anc.parentElement; }
      if (!clipped) wide.push(el.tagName + '.' + String(el.className).slice(0, 40) + ' right=' + Math.round(r.right));
    }
  });
  return { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, wide: wide.slice(0, 3) };
})()`;

(async () => {
  const c = await openPage(OUT, 390, 844);
  try {
    // ===== §5 layer / version integrity =====
    console.log('§5 layer integrity');
    await c.eval('location.reload()'); await sleep(1500);
    const ver = await c.eval(`(() => ({
      v25: !!document.getElementById('v25'), v25js: !!document.getElementById('v25js'),
      v25ver: (window.__v25||{}).version, v24ver: (window.__v24||{}).version,
      v15: (window.__v15||{}).version, v17: (window.__v17||{}).version,
      v22: (window.__v22||{}).version, v23: (window.__v23||{}).version,
      title: document.title,
      lastStyle: [...document.querySelectorAll('style')].pop().id,
      lastScript: [...document.querySelectorAll('script')].pop().id,
      libGreen: getComputedStyle(document.documentElement).getPropertyValue('--lib-green').trim()
    }))()`);
    eq(ver.v25, true, 'v25 style present');
    eq(ver.v25js, true, 'v25 script present');
    eq(ver.v25ver, '15.2.0', '__v25 version 15.2.0');
    eq(ver.v24ver, '15.1.0', '__v24 version unchanged 15.1.0');
    eq(ver.v15, '15.0.0', 'v15 version unchanged 15.0.0');
    eq(ver.v17, '10.0.0', 'v17 version unchanged 10.0.0');
    eq(ver.v22, '14.0.0', 'v22 version unchanged 14.0.0');
    eq(ver.v23, '15.0.0', 'v23 version unchanged 15.0.0');
    eq(ver.lastStyle, 'v25', 'v25 style loads LAST (wins cascade)');
    eq(ver.lastScript, 'v25js', 'v25 script loads LAST');
    eq(ver.libGreen, '#247A46', '--lib-green token present');
    const titleInFile = await c.eval(`fetch(${JSON.stringify(OUT)}).then(r=>r.text()).then(t=>t.includes('<title>Korean &amp; English Vocab Farm V15.2'))`, true);
    eq(titleInFile, true, 'served index.html title is V15.2');

    // ===== §1 contrast audit, all library screens =====
    console.log('§1 WCAG AA contrast (scroll-aware)');
    for (const s of SCREENS) {
      const r = await auditScreen(c, SEED, s.setup, s.wait);
      eq(r.violations.length, 0, s.name + ': 0 contrast violations' + (r.violations.length ? ' -> ' + JSON.stringify(r.violations.slice(0, 3)) : ''));
      eq(r.smallText.length, 0, s.name + ': 0 text < 12px' + (r.smallText.length ? ' -> ' + JSON.stringify(r.smallText.slice(0, 3)) : ''));
      ok(r.overflow.docScrollW <= 390 && r.overflow.wide.length === 0, s.name + ': no horizontal overflow', 'scrollW=' + r.overflow.docScrollW + ' wide=' + JSON.stringify(r.overflow.wide.slice(0, 2)));
    }

    // ===== §2 V25 computed values + decorator =====
    console.log('§2 V25 values + decorator');
    await c.eval(`(async()=>{ ${SEED} })()`, true);
    await c.eval('location.reload()'); await sleep(2000);
    await c.eval(`(async()=>{ ${MARK} })()`, true); await sleep(2500);
    const v = await c.eval(`(() => {
      const cs = s => { const el = document.querySelector(s); if (!el) return null; const c = getComputedStyle(el); return {bg: c.backgroundColor, color: c.color, size: c.fontSize, border: c.borderColor}; };
      const groups = [...document.querySelectorAll('.v17lib .v17group')];
      const gp = [...document.querySelectorAll('.v25group-progress')].map(g => g.textContent.trim().slice(0, 60));
      const pri = document.querySelector('.v17lib .btn.pri') || document.querySelector('.v17group .btn.pri');
      const review = document.querySelector('.v17lib .btn.v25btn-review');
      const view = document.querySelector('.v17lib .btn.v25btn-view');
      const inp = document.querySelector('.v17lib .v15input') || document.querySelector('.v17ox-tools .v15input');
      const head = document.querySelector('.v17lib .v17group-head');
      const headB = document.querySelector('.v17lib .v17group-head b');
      const headMeta = document.querySelector('.v17lib .v17group-head .mute');
      return {
        groupCount: groups.length,
        groupProgress: gp,
        priBg: pri ? getComputedStyle(pri).backgroundColor : null,
        reviewBg: review ? getComputedStyle(review).backgroundColor : null,
        viewBg: view ? getComputedStyle(view).backgroundColor : null,
        viewColor: view ? getComputedStyle(view).color : null,
        inputType: inp ? inp.getAttribute('type') : null,
        inputBgImg: inp ? (getComputedStyle(inp).backgroundImage !== 'none') : false,
        headBg: head ? getComputedStyle(head).backgroundColor : null,
        headTitleColor: headB ? getComputedStyle(headB).color : null,
        headTitleSize: headB ? parseFloat(getComputedStyle(headB).fontSize) : null,
        headMetaColor: headMeta ? getComputedStyle(headMeta).color : null,
        libTitleSize: cs('.v17lib .v17head h3'),
        groupIcons: [...document.querySelectorAll('.v25set-ic')].map(e => e.textContent),
      };
    })()`);
    eq(v.groupCount, 4, '4 set groups render (A1-A2, Oxford, BT, My Vocab)');
    ok(v.groupProgress.length >= 3, 'group progress bars injected (>=3 sets)', JSON.stringify(v.groupProgress));
    ok(v.groupProgress.some(t => t.includes('đã học')), 'group progress shows real learned counts', JSON.stringify(v.groupProgress));
    eq(v.priBg, 'rgb(36, 122, 70)', 'Học ngay button is spec green #247A46');
    eq(v.reviewBg, 'rgb(104, 69, 168)', 'Ôn tập button is spec purple #6845A8');
    eq(v.viewBg, 'rgb(255, 249, 239)', 'Xem từ button is light #FFF9EF');
    eq(v.viewColor, 'rgb(74, 46, 138)', 'Xem từ text is dark purple #4A2E8A');
    eq(v.inputType, 'search', 'library search input is type=search (native clear button)');
    ok(v.inputBgImg, 'search input has magnifier icon');
    eq(v.headBg, 'rgb(41, 32, 68)', 'set header band is dark #292044');
    eq(v.headTitleColor, 'rgb(255, 215, 106)', 'set title is gold #FFD76A on dark band');
    ok(v.headTitleSize >= 18 && v.headTitleSize <= 22, 'set title is 18-22px (spec)', 'got ' + v.headTitleSize + 'px');
    eq(v.headMetaColor, 'rgb(229, 222, 245)', 'set meta is #E5DEF5 on dark band');
    eq(v.libTitleSize && v.libTitleSize.size, '24px', 'library title is 24px (spec 24-28px)');
    ok(v.groupIcons.length >= 2, 'set icons added (A1-A2, Oxford)', JSON.stringify(v.groupIcons));

    // word rows: badges + sizes (checked in a topic view, not the home)
    await c.eval(`(async()=>{ window.__v17.openTopic('a1_education'); })()`, true);
    await sleep(800);
    const wr = await c.eval(`(() => {
      const badges = [...document.querySelectorAll('.v17word .v25status')].map(b => b.className + ':' + b.textContent);
      const wordB = document.querySelector('.v17word-main b');
      const ipa = document.querySelector('.v17word .v17ipa');
      const posPill = document.querySelector('.v17word-main>b+span.mute');
      return {
        badgeSample: badges.slice(0, 6),
        badgeKinds: [...new Set(badges.map(b => b.split(':')[0]))].sort(),
        wordSize: wordB ? getComputedStyle(wordB).fontSize : null,
        ipaSize: ipa ? getComputedStyle(ipa).fontSize : null,
        posBg: posPill ? getComputedStyle(posPill).backgroundColor : null,
        posColor: posPill ? getComputedStyle(posPill).color : null,
      };
    })()`);
    ok(wr.badgeKinds.length >= 3, 'status badges cover several states', JSON.stringify(wr.badgeKinds));
    eq(wr.wordSize, '19px', 'EN word is 19px (spec 18-22px)');
    eq(wr.ipaSize, '15px', 'IPA is 15px (spec 15-16px)');
    eq(wr.posBg, 'rgb(237, 230, 248)', 'POS pill bg is #EDE6F8');
    eq(wr.posColor, 'rgb(74, 46, 138)', 'POS pill text is dark purple #4A2E8A');

    // BT type badges + stars + flashcard rate buttons + fav .on + claimed + toast
    await c.eval(`(async()=>{ ${fs.readFileSync(path.join(DIR, 'setups/lib-btunit.js'), 'utf8')} })()`, true);
    await sleep(2000);
    const bt = await c.eval(`(() => {
      const wd = document.querySelector('.v22type.wd');
      const stars = document.querySelector('.v22stars');
      const tmp = (cls, txt) => { const s = document.createElement('span'); s.className = cls; s.textContent = txt || 'x'; document.body.appendChild(s); const c = getComputedStyle(s); const r = {color: c.color, bg: c.backgroundColor, size: c.fontSize}; s.remove(); return r; };
      return {
        wdColor: wd ? getComputedStyle(wd).color : null,
        wdBg: wd ? getComputedStyle(wd).backgroundColor : null,
        wdSize: wd ? getComputedStyle(wd).fontSize : null,
        starsColor: stars ? getComputedStyle(stars).color : null,
        claimed: tmp('v17claimed', '✓ Đã nhận thưởng'),
        toast: tmp('v7toast', 'Đã sao chép'),
        tabFont: (() => { const t = document.querySelector('.v22tabs .v15tab'); return t ? getComputedStyle(t).fontSize : null; })(),
      };
    })()`);
    eq(bt.wdColor, 'rgb(22, 101, 52)', '.v22type.wd text is #166534 (was 4.42:1, now AA)');
    eq(bt.wdSize, '13px', '.v22type badge is 13px (was 11px)');
    eq(bt.claimed.color, 'rgb(22, 101, 52)', '.v17claimed is #166534 (was 3.3:1)');
    eq(bt.toast.size, '15px', '.v7toast is 15px');

    // favorite toggle -> .on gets gold style (reset the state first:
    // favorites persist in localStorage across test runs)
    const fav = await c.eval(`(async () => {
      const btn = [...document.querySelectorAll('.v17word-acts .btn')].find(b => b.textContent.includes('Yêu thích'));
      if (!btn) return {found: false};
      const m = (btn.getAttribute('onclick') || '').match(/'([^']+)'/);
      const id = m && m[1];
      if (id) {
        const e = S.v7.en17 || (S.v7.en17 = {fav: [], claimed: {}});
        const i = (e.fav || []).indexOf(id);
        if (i >= 0) e.fav.splice(i, 1);
        window.__v15.renderTab();
        await new Promise(r => setTimeout(r, 400));
      }
      const btn2 = [...document.querySelectorAll('.v17word-acts .btn')].find(b => b.textContent.includes('Yêu thích'));
      if (!btn2) return {found: true, after: false};
      btn2.click();
      await new Promise(r => setTimeout(r, 500));
      const b2 = [...document.querySelectorAll('.v17word-acts .btn')].find(b => b.textContent.includes('Yêu thích'));
      if (!b2) return {found: true, after: false};
      const cs = getComputedStyle(b2);
      return {found: true, after: true, hasOn: b2.classList.contains('on'), bg: cs.backgroundColor, color: cs.color};
    })()`, true);
    ok(fav.found && fav.after && fav.hasOn, 'favorite toggle adds .on class', JSON.stringify(fav));
    eq(fav.bg, 'rgb(245, 200, 106)', 'favorited button is gold #F5C86A');
    eq(fav.color, 'rgb(58, 37, 0)', 'favorited text is dark #3A2500 on gold');

    // flashcard rate buttons: bad is filled dark red now
    await c.eval(`(async()=>{ ${fs.readFileSync(path.join(DIR, 'setups/lib-flash.js'), 'utf8')} })()`, true);
    await sleep(1200);
    const fc = await c.eval(`(() => {
      const bad = [...document.querySelectorAll('.v15fc~.acts .btn.bad')][0];
      const front = document.querySelector('.v15fc-f');
      const back = document.querySelector('.v15fc-b');
      return {
        badBg: bad ? getComputedStyle(bad).backgroundColor : null,
        badColor: bad ? getComputedStyle(bad).color : null,
        frontBg: front ? getComputedStyle(front).backgroundColor : null,
        frontBorder: front ? getComputedStyle(front).borderColor : null,
        backBg: back ? getComputedStyle(back).backgroundColor : null,
        flipped: !!document.querySelector('.v15fc.fl'),
      };
    })()`);
    eq(fc.badBg, 'rgb(193, 18, 31)', '"Chưa nhớ" button is filled #C1121F (was 3.99:1 outline)');
    eq(fc.badColor, 'rgb(255, 255, 255)', '"Chưa nhớ" text is white on dark red');
    eq(fc.frontBg, 'rgb(255, 249, 239)', 'flashcard front is #FFF9EF');
    eq(fc.backBg, 'rgb(237, 230, 248)', 'flashcard back is #EDE6F8');
    ok(fc.flipped, 'flashcard setup leaves the card flipped (back visible)');

    // ===== §3 functional (spec §12 items 1-14) =====
    console.log('§3 functional');
    await c.eval(`(async()=>{ ${SEED} })()`, true);
    await c.eval('location.reload()'); await sleep(2000);
    // error collector (installed after the last reload)
    await c.eval(`window.__errs=[]; window.addEventListener('error',function(e){window.__errs.push(String(e.message||e.error))}); window.addEventListener('unhandledrejection',function(e){window.__errs.push('rejection:'+String(e.reason))}); 'ok'`);
    const fn = await c.eval(`(async () => {
      const R = {};
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      window.__v15.openHub(); window.__v15.tab('library');
      await sleep(1200);
      // 1. open each set
      R.sets = [...document.querySelectorAll('.v17lib .v17group-head b')].map(b => b.textContent.trim());
      window.__v17.openLib('a1a2'); await sleep(400);
      R.a1a2Rows = document.querySelectorAll('.v17word').length;
      R.a1a2Total = (document.querySelector('.v17lesson .v17head p')||{}).textContent || '';
      window.__v17.openLib('oxford'); await sleep(400);
      R.oxRows = document.querySelectorAll('.v17word').length;
      window.__v17.goHome(); await sleep(400);
      R.backHome = !!document.querySelector('.v17lib');
      // my vocab group -> vocab tab
      window.__v15.tab('vocab'); await sleep(400);
      R.vocabRows = document.querySelectorAll('#v15body .v15row').length;
      window.__v15.tab('library'); await sleep(400);
      // 3. search: A1-A2 topic search + empty search message
      window.__v17.openTopic('a1_education'); await sleep(400);
      window.__v17.search('assignment'); await sleep(600);
      R.searchRows = document.querySelectorAll('.v17word').length;
      R.searchFirst = (document.querySelector('.v17word-main b')||{}).textContent || '';
      window.__v17.search('zzzzqqq-no-match'); await sleep(600);
      R.emptyMsg = (document.querySelector('.v17words .v25empty')||{}).textContent || '';
      R.emptyCount = document.querySelectorAll('.v17word').length;
      window.__v17.search(''); await sleep(400);
      // Oxford home search
      window.__v17.goHome(); await sleep(400);
      window.__v17.oxSearch('apple'); await sleep(600);
      R.oxSearchRows = document.querySelectorAll('.v17row').length;
      R.oxSearchFirst = (document.querySelector('.v17row b')||{}).textContent || '';
      window.__v17.oxSearch('zzzzqqq-no-match'); await sleep(600);
      R.oxEmpty = (document.querySelector('.v17group > p.mute.v25empty')||{}).textContent || '';
      window.__v17.oxSearch(''); await sleep(400);
      return R;
    })()`, true);
    ok(fn.sets.length === 4, '1. all 4 set groups present', JSON.stringify(fn.sets));
    ok(fn.a1a2Rows === 30, '1. A1-A2 view-all shows 30 words/page', 'got ' + fn.a1a2Rows);
    ok(fn.a1a2Total.includes('1000'), '1. A1-A2 total is 1000', fn.a1a2Total);
    ok(fn.oxRows === 30, '1. Oxford view-all shows 30 words/page', 'got ' + fn.oxRows);
    ok(fn.backHome, '1. back to library home works');
    ok(fn.vocabRows > 0, '1. My Vocabulary tab lists words', 'got ' + fn.vocabRows);
    ok(fn.searchRows >= 1 && fn.searchFirst.toLowerCase().includes('assignment'), '3. A1-A2 search finds "assignment"', fn.searchFirst + ' rows=' + fn.searchRows);
    ok(fn.emptyCount === 0 && fn.emptyMsg.includes('Không tìm thấy'), '3. empty search shows clear message', fn.emptyMsg);
    ok(fn.oxSearchRows >= 1 && fn.oxSearchFirst.toLowerCase().includes('apple'), '3. Oxford search finds "apple"', fn.oxSearchFirst + ' rows=' + fn.oxSearchRows);
    ok(fn.oxEmpty.includes('Không tìm thấy'), '3. Oxford empty search shows message', fn.oxEmpty);

    // 2. all 24 BT units open
    let unitsOk = 0; const unitFails = [];
    for (let n = 1; n <= 24; n++) {
      const r = await c.eval(`(async () => {
        window.__v22.openUnit(${n});
        await new Promise(r => setTimeout(r, 500));
        const st = window.__v22.state;
        const rows = document.querySelectorAll('.v17word').length;
        const head = (document.querySelector('.v17lesson .v17head h3')||{}).textContent || '';
        return {view: st.view, unit: st.unit, rows, head};
      })()`, true);
      if (r.view === 'unit' && r.unit === n && r.rows > 0) unitsOk++;
      else unitFails.push(n + ':' + JSON.stringify(r));
    }
    eq(unitsOk, 24, '2. all 24 BT units open with entries' + (unitFails.length ? ' fails: ' + unitFails.slice(0, 3).join('; ') : ''));
    // BT unit search + tab switch
    const btq = await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      window.__v22.openUnit(1); await sleep(600);
      window.__v22.unitSearch('accounting'); await sleep(600);
      const rows = document.querySelectorAll('.v17word').length;
      const first = (document.querySelector('.v17word-main b')||{}).textContent || '';
      // clear the search first: the filter persists across tabs by design (§8)
      window.__v22.unitSearch(''); await sleep(400);
      window.__v22.setUnitTab('phrases'); await sleep(600);
      const phRows = document.querySelectorAll('.v17word').length;
      const phBadge = (document.querySelector('.v22type.ph')||{}).textContent || '';
      window.__v22.setUnitTab('words'); await sleep(400);
      return {rows, first, phRows, phBadge};
    })()`, true);
    ok(btq.rows >= 1 && btq.first.toLowerCase().includes('accounting'), '3. BT unit search finds "accounting"', btq.first + ' rows=' + btq.rows);
    ok(btq.phRows > 0 && btq.phBadge.includes('Cụm từ'), '6. BT Phrases tab shows phrase badges', btq.phBadge + ' rows=' + btq.phRows);

    // 4. flashcard flip + rate (SRS), 5. speak
    const fl = await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      window.__v15.openHub(); window.__v15.tab('learn'); await sleep(300);
      window.__v15.startMode('flash'); await sleep(500);
      const front = (document.querySelector('.v15fc-f .v15fc-word')||{}).textContent || '';
      const frontIpa = (document.querySelector('.v15fc-f .mute')||{}).textContent || '';
      const frontIpaEl = !!document.querySelector('.v15fc-f .mute');
      document.querySelector('.v15fc').click(); await sleep(500);
      const flipped = !!document.querySelector('.v15fc.fl');
      const backVi = (document.querySelector('.v15fc-b .v15fc-word')||{}).textContent || '';
      const rateBtns = [...document.querySelectorAll('.v15fc~.acts .btn')].map(b => b.textContent.trim());
      // speak the current word (no throw)
      let speakOk = true;
      try { const w = window.__v15.words.find(x => x.en === front); if (w) window.__v15.speakWord(w.id); } catch (e) { speakOk = false; }
      // rate "Đã nhớ" -> SRS box rises, next card (reset the box first so
      // the check is deterministic regardless of the seeded progress)
      const w2 = window.__v15.words.find(x => x.en === front);
      if (w2) { window.__v15.enOld().box[w2.id] = 0; window.__v15.en15().due[w2.id] = 0; }
      const boxBefore = w2 ? (window.__v15.enOld().box[w2.id] || 0) : -1;
      const okBtn = [...document.querySelectorAll('.v15fc~.acts .btn.ok')].find(b => b.textContent.includes('Đã nhớ'));
      if (okBtn) okBtn.click(); await sleep(500);
      const boxAfter = w2 ? (window.__v15.enOld().box[w2.id] || 0) : -1;
      const foot = (document.querySelector('#v15body .mute')||{}).textContent || '';
      return {front, frontIpa, frontIpaEl, flipped, backVi, rateBtns, speakOk, boxBefore, boxAfter};
    })()`, true);
    // (một số từ thiếu IPA trong nguồn — V9 ghi rõ 91 từ Oxford không có
    // phiên âm, hiển thị trống là dữ liệu thiếu trung thực, không phải lỗi.
    // Chỉ kiểm tra mặt trước hiện từ + dòng IPA/POS có render.)
    ok(fl.front.length > 0 && fl.frontIpaEl, '4. flashcard front shows word + IPA line', fl.front + ' ' + fl.frontIpa);
    ok(fl.flipped && fl.backVi.length > 0, '4. flashcard flips to Vietnamese meaning', fl.backVi);
    ok(fl.rateBtns.includes('Đã nhớ') && fl.rateBtns.includes('Chưa nhớ'), '4. flip reveals Đã nhớ / Chưa nhớ', JSON.stringify(fl.rateBtns));
    ok(fl.speakOk, '5. speak (phát âm) runs without error');
    ok(fl.boxAfter > fl.boxBefore, '4. rating "Đã nhớ" raises the SRS box (memory kept)', 'box ' + fl.boxBefore + ' -> ' + fl.boxAfter);

    // 6. start lesson, 7. review, 8. progress after mastering, 9. boss with BT vocab
    const lr = await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const R = {};
      // Leave any BT unit view first: V22 keeps ST.view='unit' until
      // goLibrary() — otherwise the library tab keeps showing the unit.
      window.__v22.goLibrary(); await sleep(400);
      window.__v17.learnScopeKey('a1a2'); await sleep(600);
      R.modes = document.querySelectorAll('.v15mode').length;
      window.__v15.startMode('mc'); await sleep(500);
      R.mcCard = !!document.querySelector('.v15qcard');
      R.mcWord = (document.querySelector('.v15qword')||{}).textContent || '';
      window.__v15.backToLearn(); await sleep(300);
      window.__v17.reviewScopeKey('a1a2'); await sleep(1200);
      const rev = document.querySelector('#v15review');
      R.reviewHasContent = rev ? rev.textContent.trim().length > 50 : false;
      R.reviewText = rev ? rev.textContent.trim().slice(0, 80) : '';
      // 8. master a word from the topic view -> badge + group progress update
      window.__v15.tab('library'); await sleep(400);
      window.__v17.openTopic('a1_education'); await sleep(500);
      const before = (document.querySelector('.v17word .v25status')||{}).textContent || '';
      const btn = [...document.querySelectorAll('.v17word-acts .btn')].find(b => b.textContent.includes('Đánh dấu đã thuộc'));
      if (btn) btn.click(); await sleep(600);
      const after = (document.querySelector('.v17word .v25status')||{}).textContent || '';
      R.badgeBefore = before; R.badgeAfter = after;
      window.__v17.goHome(); await sleep(600);
      const gp = [...document.querySelectorAll('.v25group-progress')].map(g => g.textContent.trim().slice(0, 50));
      R.groupProgress = gp;
      // 9. boss with BT vocab
      window.__v22.bossUnit(1); await sleep(1500);
      window.__v18._test.fight('v10_slime'); await sleep(800);
      const F = window.__v18._test.F();
      R.fightRenders = !!document.querySelector('#v18fight .v18fight');
      R.fightWord = F && F.cur && F.cur.w ? F.cur.w.en : '';
      R.fightWordIsBT = !!(F && F.cur && F.cur.w && (F.cur.w.lib || []).indexOf('bt') >= 0);
      R.fightScope = (window.__v15.en15().scope || {}).lib || '';
      return R;
    })()`, true);
    eq(lr.modes, 10, '6. lesson start shows 10 modes');
    ok(lr.mcCard && lr.mcWord.length > 0, '6. MC mode starts with a question', lr.mcWord);
    ok(lr.reviewHasContent, '7. review (SRS) starts with content', lr.reviewText);
    ok(lr.badgeAfter.includes('Đã thuộc'), '8. mastering a word flips its badge to ✓ Đã thuộc', lr.badgeBefore + ' -> ' + lr.badgeAfter);
    ok(lr.groupProgress.some(t => t.includes('đã học')), '8. group progress still shows after mastering', JSON.stringify(lr.groupProgress));
    ok(lr.fightRenders, '9. boss fight renders with BT scope');
    ok(lr.fightWordIsBT, '9. boss question uses a BT word', lr.fightWord + ' scope=' + lr.fightScope);

    // 10. hub switch EN -> KO -> EN, library still renders
    const hs = await c.eval(`(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      // closeHub hides the hub (display:none) — it does NOT remove the node.
      window.__v22.goLibrary(); await sleep(300);
      window.__v15.closeHub(); await sleep(400);
      const hub = document.querySelector('.v15hub');
      const closed = !hub || getComputedStyle(hub).display === 'none';
      window.__v15.openHub(); window.__v15.tab('library'); await sleep(600);
      const libBack = !!document.querySelector('.v17lib');
      const badgesBack = document.querySelectorAll('.v17word .v25status').length;
      return {closed, libBack, badgesBack};
    })()`, true);
    ok(hs.closed && hs.libBack, '10. EN hub closes and reopens with library intact');

    // 13. no data loss: save round-trip keeps XP/gems + library state
    const dl = await c.eval(`(async () => {
      window.__v20.saveNow();
      await new Promise(r => setTimeout(r, 1500));
      const after = JSON.parse(localStorage.getItem('hanvocab.v1'));
      return {
        xp: after.xp, gems: after.v7.gems,
        words: window.__v15.words.length,
        en17: !!(after.v7.en17 && Array.isArray(after.v7.en17.fav)),
        en22: !!(after.v7.en22 && after.v7.en22.quest),
      };
    })()`, true);
    ok(dl.xp >= 12500 && dl.gems === 42, '13. save round-trip keeps XP/gems (XP grows only by legitimate gains: 12500 -> ' + dl.xp + ' = +10 from the flash "Đã nhớ" rating per the mark15 rule)', JSON.stringify(dl));
    ok(dl.words >= 4409, '13. vocabulary pool intact (>=4409 words)', 'got ' + dl.words);
    ok(dl.en17 && dl.en22, '13. library progress keys (en17, en22) intact');

    // 12. no JS errors during all of §3
    const errs = await c.eval('window.__errs');
    eq(errs.length, 0, '12. no JS errors during functional checks' + (errs.length ? ' -> ' + JSON.stringify(errs.slice(0, 3)) : ''));

    // ===== §4 responsive =====
    console.log('§4 responsive');
    for (const w of [360, 430, 768, 1280]) {
      const cw = await openPage(OUT, w, 844);
      try {
        await cw.eval(`(async()=>{ ${SEED} })()`, true);
        await cw.eval('location.reload()'); await sleep(2000);
        await cw.eval(`(async()=>{ ${MARK} })()`, true); await sleep(2000);
        const ov = await cw.eval(OVERFLOW_JS);
        ok(ov.scrollW <= w && ov.wide.length === 0, w + 'px library home: no horizontal overflow', JSON.stringify(ov));
        await cw.eval(`(async()=>{ ${fs.readFileSync(path.join(DIR, 'setups/lib-btunit.js'), 'utf8')} })()`, true);
        await sleep(2000);
        const ov2 = await cw.eval(OVERFLOW_JS);
        ok(ov2.scrollW <= w && ov2.wide.length === 0, w + 'px BT unit: no horizontal overflow', JSON.stringify(ov2));
      } finally { cw.close(); }
    }
  } finally { c.close(); }
  console.log(`\n==== test25: ${pass} passed, ${fail} failed ====`);
  if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log(' -', f)); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST25 CRASH', e); process.exit(2); });
