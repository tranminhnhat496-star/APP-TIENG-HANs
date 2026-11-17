// test26.js — V15.3 Mobile Navigation Fix verification (real Chrome via CDP).
// Usage: OUT=<build dir> PORT=<http port> node test26.js
//   [HATCH_CHROME=/path/to/chromium HATCH_CHROME_NOPOLICY=1]
//   [--zip] runs against the packaged ZIP extraction instead (OUT must point
//   at the extracted dir, PORT its server).
// Sections: §1 geometry (8 viewports) · §2 stacking · §3 decorator behaviour
//   · §4 navigation · §5 data integrity · §6 layer integrity.
// Exit 0 = all checks pass.
const fs = require('fs');
const path = require('path');
const { openPage, closeTarget } = require('../v15ui/cdp.js');
const { sleep, AUDIT_NAV } = require('./audit-nav.js');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.env.OUT || path.join(ROOT, 'out');
const PORT = process.env.PORT || '8931';
const URL = `http://127.0.0.1:${PORT}/index.html`;
const SEED = fs.readFileSync(path.join(__dirname, '..', 'v15ui', 'setups', 'seed.js'), 'utf8');
const PET_EMPTY = fs.readFileSync(path.join(__dirname, 'setups', 'pet-empty.js'), 'utf8');
const PET_FULL = fs.readFileSync(path.join(__dirname, 'setups', 'pet-full.js'), 'utf8');

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail) : ''}`); }
}
function section(t) { console.log(`\n== ${t} ==`); }

const VIEWPORTS = [
  [320, 640], [360, 740], [375, 812], [390, 844],
  [414, 896], [430, 932], [768, 1024], [1366, 768],
];

async function load(c, w, h) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: w < 800 });
  await c.eval(`location.href = ${JSON.stringify(URL)}`);
  await sleep(1500);
  await c.eval(AUDIT_NAV);
  await c.eval(SEED);
  await c.eval(`location.reload()`);
  await sleep(1500);
  await c.eval(AUDIT_NAV);
  // error collector — install AFTER the reload (a reload wipes window state)
  await c.eval(`window.__v26errs = [];
    window.addEventListener('error', e => window.__v26errs.push(String(e.message || e.error)));
    window.addEventListener('unhandledrejection', e => window.__v26errs.push('rejection: ' + String(e.reason)));`);
}

async function audit(c, which) {
  return c.eval(`window.__auditNav(${JSON.stringify(which)})`, true);
}
async function st(c) { return c.eval(`window.__v26 ? window.__v26.status() : null`, true); }

(async () => {
  const c = await openPage(URL, 390, 844);
  try {
    // ---------- §0 layer integrity (before geometry, cheap) ----------
    section('§0 layer + §6 integrity');
    await load(c, 390, 844);
    // V6 rewrites document.title at runtime ("(20) Học từ vựng tiếng Hàn"),
    // so check the static served HTML instead.
    const rawTitle = await c.eval(`fetch('/index.html').then(r => r.text()).then(t => t.includes('Vocab Farm V15.3'))`, true);
    check('title V15.3 (static HTML)', rawTitle === true, rawTitle);
    const ids = await c.eval(`[...document.querySelectorAll('script[id]')].map(s => s.id).join(',')`);
    check('v26js last script', ids.endsWith('v26js'), ids);
    check('v25js present', ids.includes('v25js'), ids);
    check('__v26 version 15.3.0', (await c.eval(`window.__v26 && window.__v26.version`)) === '15.3.0');
    check('__v25 version 15.2.0', (await c.eval(`window.__v25 && window.__v25.version`)) === '15.2.0');
    check('__v24 version 15.1.0', (await c.eval(`window.__v24 && window.__v24.version`)) === '15.1.0');
    check('__v23 version 15.0.0', (await c.eval(`window.__v23 && window.__v23.version`)) === '15.0.0');

    // ---------- §1 geometry across viewports (pet empty) ----------
    section('§1 geometry — pet empty, all viewports');
    for (const [w, h] of VIEWPORTS) {
      console.log(`-- ${w}x${h} --`);
      await load(c, w, h);
      await c.eval(PET_EMPTY);
      await sleep(700);
      const a = await audit(c, 'pethub');
      check(`[${w}] no doc overflowX`, !a.overflowX, a.docScrollW);
      check(`[${w}] no wide elements`, a.wide.length === 0, a.wide);
      check(`[${w}] pet head h<=90 (<=430) / <=70 (>430)`,
        w <= 430 ? a.pet.head.h <= 90 : a.pet.head.h <= 70, a.pet.head);
      check(`[${w}] pet head children no overlap`, a.pet.headChildrenOverlap.length === 0, a.pet.headChildrenOverlap);
      check(`[${w}] pet tabs 1 row`, a.pet.tabRows === 1, a.pet.tabRows);
      check(`[${w}] pet tab count 7`, a.pet.tabCount === 7, a.pet.tabCount);
      check(`[${w}] pet tab min-h >=44`, a.pet.tabMinH >= 44, a.pet.tabMinH);
      check(`[${w}] pet tabs no overlap`, a.pet.tabOverlap.length === 0, a.pet.tabOverlap);
      check(`[${w}] filter stacked (<=560)`, w > 560 || a.pet.filter.stacked === true, a.pet.filter);
      check(`[${w}] exactly 1 visible empty message (pets tab, 0 pets)`,
        a.pet.emptyBoxes.length === 1, a.pet.emptyBoxes);
    }

    // ---------- §1b EN hub + Korean hub geometry ----------
    section('§1b geometry — EN hub + Korean hub');
    for (const [w, h] of VIEWPORTS) {
      console.log(`-- ${w}x${h} --`);
      await load(c, w, h);
      await c.eval(`window.__v15 && window.__v15.openHub('library')`);
      await sleep(700);
      const a = await audit(c, 'enhub');
      check(`[${w}] EN langbar h<=60 (<=640) / <=96 (>640)`,
        w <= 640 ? a.en.langbar.h <= 60 : a.en.langbar.h <= 96, a.en.langbar);
      check(`[${w}] EN langbar children no overlap`, a.en.langbarChildrenOverlap.length === 0, a.en.langbarChildrenOverlap);
      check(`[${w}] EN hub head h<=130 (<=430) / <=140 (else)`,
        w <= 430 ? a.en.hubHead.h <= 130 : a.en.hubHead.h <= 140, a.en.hubHead);
      check(`[${w}] EN hub head no overlap`, a.en.hubHeadOverlap.length === 0, a.en.hubHeadOverlap);
      check(`[${w}] EN tabs 1 row (<=760)`, w > 760 || a.en.tabRows === 1, a.en.tabRows);
      check(`[${w}] EN tab count 10`, a.en.tabCount === 10, a.en.tabCount);
      check(`[${w}] EN tabs no overlap`, a.en.tabOverlap.length === 0, a.en.tabOverlap);
      // Korean hub: close EN hub, audit korean
      await c.eval(`window.__v15 && window.__v15.closeHub && window.__v15.closeHub()`);
      await sleep(400);
      const k = await audit(c, 'korean');
      check(`[${w}] KO stage padBottom >= 118 (<=640)`, w > 640 || parseInt(k.ko.stagePadBottom) >= 118, k.ko.stagePadBottom);
      check(`[${w}] KO bottom tabs no overlap`, k.ko.tabsOverlap.length === 0, k.ko.tabsOverlap);
      check(`[${w}] KO no doc overflowX`, !k.overflowX, k.docScrollW);
    }

    // ---------- §2 stacking: langbar must NOT cover the pet head ----------
    section('§2 stacking — pet hub over Korean farm');
    await load(c, 390, 844);
    await c.eval(PET_EMPTY);
    await sleep(700);
    const topAtHead = await c.eval(`(function(){
      const head = document.querySelector('#v23hub .v23head');
      const r = head.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { top: el ? (el.id || el.className || el.tagName) : null, insideHub: !!(el && el.closest('#v23hub')) };
    })()`, true);
    check('pet head center point is inside #v23hub (not langbar)', topAtHead.insideHub === true, topAtHead);
    const xBtn = await c.eval(`(function(){
      const b = document.querySelector('#v23hub .v23x');
      const r = b.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { hit: el === b || (el && b.contains(el)), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
    })()`, true);
    check('pet close button clickable (topmost at its center)', xBtn.hit === true, xBtn);
    const toastZ = await c.eval(`(function(){
      const t = document.createElement('div'); t.id = 'v23toast'; document.body.appendChild(t);
      const z = getComputedStyle(t).zIndex; t.remove(); return z;
    })()`, true);
    check('v23toast z-index >= 960', parseInt(toastZ) >= 960, toastZ);

    // ---------- §3 decorator behaviour ----------
    section('§3 decorator — empty state, filter mismatch, evo, team');
    // 3a hero, 0 pets
    await load(c, 390, 844);
    await c.eval(PET_EMPTY);
    await sleep(700);
    const hero = await c.eval(`(function(){
      const h = document.querySelector('#v23hub .v26hero');
      if (!h) return null;
      return { title: (h.querySelector('h3') || {}).textContent,
               desc: (h.querySelector('p') || {}).textContent,
               btn: (h.querySelector('button') || {}).textContent,
               img: !!(h.querySelector('img')) };
    })()`, true);
    check('hero present, 0 pets', !!hero, hero);
    check('hero title exact', hero && hero.title === 'Bạn chưa có thú cưng', hero && hero.title);
    check('hero desc exact', hero && hero.desc === 'Ấp quả trứng đầu tiên để nhận người bạn đồng hành!', hero && hero.desc);
    check('hero has egg img', hero && hero.img === true);
    check('hero button = Đi ấp trứng', hero && hero.btn.includes('Đi ấp trứng'), hero && hero.btn);
    // hero button navigates to hatch
    await c.eval(`document.querySelector('#v23hub .v26hero button').click()`);
    await sleep(500);
    check('hero button opens hatch tab', (await st(c)).tab === 'hatch', await st(c));

    // 3b filter mismatch with pets
    await load(c, 390, 844);
    await c.eval(PET_FULL);
    await sleep(700);
    await c.eval(`window.__v23.setFilter('ice'); window.__v23.setSearch('zzz-no-match')`);
    await sleep(500);
    const nm = await c.eval(`(function(){
      const n = document.querySelector('#v23hub .v26nomatch');
      if (!n) return null;
      return { text: n.textContent, btn: (n.querySelector('button') || {}).textContent };
    })()`, true);
    check('no-match box present', !!nm, nm);
    check('no-match text exact', nm && nm.text.includes('Không tìm thấy thú cưng phù hợp.'), nm && nm.text);
    check('clear-filter button present', nm && nm.btn === 'Xóa bộ lọc', nm && nm.btn);
    await c.eval(`document.querySelector('#v23hub .v26nomatch button').click()`);
    await sleep(500);
    const cellsBack = await c.eval(`document.querySelectorAll('#v23hub .v23grid .v23cell').length`, true);
    check('clear filter restores pet cells', cellsBack === 3, cellsBack);

    // 3c evo, 0 pets — hero with working button
    await load(c, 390, 844);
    await c.eval(PET_EMPTY);
    await sleep(600);
    await c.eval(`window.__v23.openHub('evo')`);
    await sleep(600);
    const evoHero = await c.eval(`(function(){
      const h = document.querySelector('#v23hub .v26hero');
      return h ? { btn: (h.querySelector('button') || {}).textContent } : null;
    })()`, true);
    check('evo 0-pets hero present with hatch button', !!(evoHero && evoHero.btn.includes('Đi ấp trứng')), evoHero);
    await c.eval(`document.querySelector('#v23hub .v26hero button').click()`);
    await sleep(500);
    check('evo hero button opens hatch', (await st(c)).tab === 'hatch', await st(c));

    // 3d team, 0 pets — CTA present; team slots, 3 pets — no overflow at 320/768
    await load(c, 390, 844);
    await c.eval(PET_EMPTY);
    await sleep(600);
    await c.eval(`window.__v23.openHub('team')`);
    await sleep(600);
    const teamCta = await c.eval(`!!document.querySelector('#v23hub [data-v26teamcta]')`, true);
    check('team 0-pets CTA present', teamCta === true);
    for (const [w, h] of [[320, 640], [768, 1024]]) {
      await load(c, w, h);
      await c.eval(PET_FULL);
      await sleep(600);
      await c.eval(`window.__v23.openHub('team')`);
      await sleep(600);
      const a = await audit(c, 'pethub');
      check(`[${w}] team slots no overflow`, a.pet.slotsOverflow === false, a.pet.slots);
      check(`[${w}] team slots count 3`, a.pet.slots.length === 3, a.pet.slots.length);
    }

    // ---------- §4 navigation ----------
    section('§4 navigation — 7 tabs, tab memory, back, KO/EN, sticky tabs');
    await load(c, 390, 844);
    await c.eval(PET_FULL);
    await sleep(600);
    const TABS = ['pets', 'hatch', 'evo', 'team', 'skills', 'collection', 'shop'];
    for (const t of TABS) {
      await c.eval(`window.__v23.openHub(${JSON.stringify(t)})`);
      await sleep(400);
      check(`tab ${t} opens`, (await st(c)).tab === t, await st(c));
      const bodyOk = await c.eval(`(document.querySelector('#v23body') || {}).textContent.length > 20`, true);
      check(`tab ${t} renders content`, bodyOk === true);
    }
    // tab memory
    await c.eval(`window.__v23.openHub('team'); window.__v23.closeHub()`);
    await sleep(400);
    await c.eval(`window.__v23.openHub()`);
    await sleep(500);
    check('bare openHub restores last tab (team)', (await st(c)).tab === 'team', await st(c));
    const memTab = await c.eval(`sessionStorage.getItem('v26.petTab')`, true);
    check('sessionStorage v26.petTab = team', memTab === 'team', memTab);
    // closeHub returns to EN hub, lang unchanged (compare before vs after;
    // en15().lang defaults to 'ko' — opening the EN hub does not change it)
    const langBefore = await c.eval(`window.__v15.en15().lang`, true);
    await c.eval(`window.__v15.openHub('library')`);
    await sleep(500);
    await c.eval(`window.__v23.openHub('pets')`);
    await sleep(400);
    await c.eval(`window.__v23.closeHub()`);
    await sleep(400);
    const backState = await c.eval(`(function(){
      const hub = document.querySelector('#v15hub');
      return { enHubVisible: !!(hub && getComputedStyle(hub).display !== 'none'),
               lang: window.__v15 ? window.__v15.en15().lang : null };
    })()`, true);
    check('closeHub returns to EN hub', backState.enHubVisible === true, backState);
    check('lang unchanged after pet hub', backState.lang === langBefore, { before: langBefore, after: backState.lang });
    // KO/EN switch
    await c.eval(`window.__v15.choose('ko')`);
    await sleep(400);
    check('choose ko works', (await c.eval(`window.__v15.en15().lang`, true)) === 'ko');
    await c.eval(`window.__v15.choose('en')`);
    await sleep(400);
    check('choose en works', (await c.eval(`window.__v15.en15().lang`, true)) === 'en');
    // sticky tabs: scroll the pet hub, tabs must sit right under the head
    await load(c, 390, 844);
    await c.eval(PET_FULL);
    await sleep(600);
    await c.eval(`document.querySelector('#v23hub').scrollTop = 400`);
    await sleep(500);
    const sticky = await c.eval(`(function(){
      const head = document.querySelector('#v23hub .v23head').getBoundingClientRect();
      const tabs = document.querySelector('#v23hub .v23tabs').getBoundingClientRect();
      const hub = document.querySelector('#v23hub');
      return { headBottom: Math.round(head.bottom), tabsTop: Math.round(tabs.top),
               headH: Math.round(head.height),
               varH: getComputedStyle(hub).getPropertyValue('--nav-head-h') };
    })()`, true);
    check('tabs stick under head after scroll (|top-bottom|<=2)', Math.abs(sticky.tabsTop - sticky.headBottom) <= 2, sticky);
    check('--nav-head-h matches measured head height', parseInt(sticky.varH) === sticky.headH, sticky);

    // ---------- §5 data integrity + no JS errors ----------
    section('§5 data integrity + no JS errors');
    const save = await c.eval(`(function(){
      const S = JSON.parse(localStorage.getItem('hanvocab.v1'));
      return { xp: S.xp, gems: S.v7.gems,
               pets: Object.keys((S.v7.en23 || {}).pets || {}).length,
               team: ((S.v7.en23 || {}).team || []).filter(Boolean).length };
    })()`, true);
    check('XP intact (12500)', save.xp === 12500, save);
    check('gems intact (42)', save.gems === 42, save);
    check('3 pets intact after navigation', save.pets === 3, save);
    check('team of 3 intact', save.team === 3, save);
    const errs = await c.eval(`window.__v26errs`, true);
    check('no JS errors collected', Array.isArray(errs) && errs.length === 0, errs);

    console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
    if (failures.length) console.log('failures:', failures.join(' | '));
    process.exitCode = fail ? 1 : 0;
  } finally {
    closeTarget(c);
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
