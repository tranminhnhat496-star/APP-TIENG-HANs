// test24.js — V15.1 UI Readability Upgrade test suite (real Chrome via CDP).
// Run:  OUT=http://127.0.0.1:8931/index.html node test24.js
// Needs the HTTP server serving the built out/ (or the extracted ZIP) and
// the CDP harness in this directory (cdp.js). Exits 0 iff all checks pass.
//
// Coverage:
//  §1  WCAG AA contrast on all 14 screens (SCROLL-AWARE auditor: the page is
//      walked in 700px steps so below-fold text is checked too; direct text
//      nodes of non-leaf LABELs are also checked — audit.js missed those).
//      0 violations + 0 text < 12px + 0 horizontal overflow per screen.
//  §2  Bug fixes: .ko chooser collision, #v18fight auto-scroll, en15 backfill.
//  §3  Functional regression: hubs, modes, pet hub, V18/V19 fights, save round-trip.
//  §4  Responsive 360px / 430px: no horizontal overflow, modal fits viewport.
//  §5  Layer/version integrity: V24 present + last, old versions unchanged.
const fs = require('fs');
const { openPage } = require('./cdp');
const OUT = process.env.OUT || 'http://127.0.0.1:8931/index.html';

let pass = 0, fail = 0; const failures = [];
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; failures.push(name + (extra ? ' — ' + extra : '')); console.log('  FAIL', name, extra || ''); }
}
function eq(a, b, name) { ok(a === b, name, `got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }

const SEED = fs.readFileSync(__dirname + '/setups/seed.js', 'utf8');
const CLEAR = fs.readFileSync(__dirname + '/setups/clear.js', 'utf8');
const CHOOSER_SEED = fs.readFileSync(__dirname + '/setups/chooser-seed.js', 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- scroll-aware WCAG auditor (injected into the page) ---
const AUDIT_SCROLL = `(() => {
  function lum(r,g,b){const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);}
  function parseRGB(s){const m=s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function ratio(c1,c2){const l1=lum(c1.r,c1.g,c1.b),l2=lum(c2.r,c2.g,c2.b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);}
  function effBg(el){
    let n=el, sawImage=false; const layers=[]; let base=null;
    while(n){
      const cs=getComputedStyle(n);
      if(cs.backgroundImage && cs.backgroundImage!=='none') sawImage=true;
      const bg=parseRGB(cs.backgroundColor);
      if(bg){ if(bg.a>=1){ base=bg; break; } if(bg.a>0) layers.push(bg); }
      n=n.parentElement;
    }
    if(!base) base={r:255,g:255,b:255};
    let cr=base.r,cg=base.g,cb=base.b;
    for(let i=layers.length-1;i>=0;i--){const l=layers[i];cr=l.r*l.a+cr*(1-l.a);cg=l.g*l.a+cg*(1-l.a);cb=l.b*l.a+cb*(1-l.a);}
    return {c:{r:Math.round(cr),g:Math.round(cg),b:Math.round(cb)}, image:sawImage};
  }
  const out={checked:0,violations:[],smallText:[],imageBg:[],overflow:{docScrollW:document.documentElement.scrollWidth,innerW:window.innerWidth,wide:[]}};
  const seen=new Set();
  function check(el, txt){
    if(!txt) return;
    const r=el.getBoundingClientRect();
    if(r.width===0||r.height===0) return;
    const cx=r.x+r.width/2, cy=r.y+r.height/2;
    if(cx<0||cy<0||cx>window.innerWidth||cy>window.innerHeight) return;
    const top=document.elementFromPoint(cx,cy);
    if(top && top!==el && !el.contains(top) && !top.contains(el)) return;
    const cs=getComputedStyle(el);
    const fg=parseRGB(cs.color); if(!fg) return;
    const bgR=effBg(el); const bg=bgR.c;
    const size=parseFloat(cs.fontSize); const weight=parseInt(cs.fontWeight)||400;
    const large = size>=24 || (size>=18.66 && weight>=700);
    const need = large?3.0:4.5; const cr=ratio(fg,bg);
    out.checked++;
    const key=el.tagName+'|'+String(el.className&&el.className.baseVal===undefined?el.className:'')+'|'+txt.slice(0,30);
    if(bgR.image && !seen.has('i'+key)){ seen.add('i'+key);
      out.imageBg.push({txt:txt.slice(0,60),ratio:+cr.toFixed(2),cls:String(el.className&&el.className.baseVal===undefined?el.className:'').slice(0,60)}); }
    if(!bgR.image && cr<need && !seen.has(key)){ seen.add(key);
      out.violations.push({txt:txt.slice(0,60),fg:cs.color,bg:'rgb('+bg.r+','+bg.g+','+bg.b+')',size,weight,ratio:+cr.toFixed(2),need,cls:String(el.className&&el.className.baseVal===undefined?el.className:'').slice(0,60),tag:el.tagName}); }
    if(size<12 && !seen.has('s'+key)){ seen.add('s'+key);
      out.smallText.push({txt:txt.slice(0,60),size,cls:String(el.className&&el.className.baseVal===undefined?el.className:'').slice(0,60),tag:el.tagName}); }
  }
  document.querySelectorAll('body *').forEach(el=>{
    // leaf text
    if(el.children.length===0) check(el,(el.textContent||'').trim());
    // direct text nodes of non-leaf elements (labels wrapping controls etc.)
    else {
      let t=''; el.childNodes.forEach(n=>{ if(n.nodeType===3) t+=n.textContent; });
      if(t.trim()) check(el,t.trim());
    }
    // placeholder text
    if((el.tagName==='INPUT'||el.tagName==='TEXTAREA') && el.placeholder){
      const cs=getComputedStyle(el,'::placeholder');
      const fg=parseRGB(cs.color);
      if(fg){ const bgR=effBg(el); const cr=ratio(fg,bgR.c);
        if(!bgR.image && cr<4.5) out.violations.push({txt:'placeholder: '+el.placeholder.slice(0,40),fg:cs.color,bg:'rgb('+bgR.c.r+','+bgR.c.g+','+bgR.c.b+')',size:parseFloat(cs.fontSize),weight:400,ratio:+cr.toFixed(2),need:4.5,cls:'::placeholder',tag:el.tagName}); }
    }
  });
  document.querySelectorAll('body *').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.right>window.innerWidth+1 && r.width>0){
      // ignore when an ancestor clips horizontally (decorations, swipe rows)
      let anc=el.parentElement, clipped=false;
      while(anc){ const ox=getComputedStyle(anc).overflowX; if(ox!=='visible'){ clipped=true; break; } anc=anc.parentElement; }
      if(!clipped) out.overflow.wide.push(el.tagName+'.'+String(el.className).slice(0,40)+' right='+Math.round(r.right));
    }
    // full-width containers that scroll internally (e.g. a fixed overlay
    // whose own scrollWidth exceeds the viewport) are real overflow even
    // though their children are "clipped" by them — unless the container
    // itself hides overflow (confetti layer .cf is overflow:hidden: its
    // pieces are clipped, nothing is visible or scrollable)
    if(el.clientWidth>=window.innerWidth-20 && el.scrollWidth>el.clientWidth+1
       && !/hidden|clip/.test(getComputedStyle(el).overflowX))
      out.overflow.wide.push('SCROLL:'+el.tagName+'.'+String(el.className).slice(0,40)+' sw='+el.scrollWidth+' cw='+el.clientWidth);
  });
  out.violations.sort((a,b)=>a.ratio-b.ratio);
  return out;
})()`;

async function auditScreen(c, name, prerun, setup, waitMs) {
  await c.eval(`(async()=>{ ${prerun || ''} })()`, true);
  await c.eval('location.reload()');
  await sleep(1500);
  if (setup) { await c.eval(`(async()=>{ ${setup} })()`, true); await sleep(waitMs || 1500); }
  // scroll through the page so below-fold text is checked too
  const docH = await c.eval('document.documentElement.scrollHeight');
  const step = 700;
  let merged = null;
  for (let y = 0; y < docH; y += step) {
    await c.eval(`window.scrollTo(0, ${y})`);
    await sleep(120);
    const part = await c.eval(AUDIT_SCROLL);
    if (!merged) merged = part;
    else {
      merged.checked += part.checked;
      for (const v of part.violations) if (!merged.violations.some(x => x.txt === v.txt && x.cls === v.cls)) merged.violations.push(v);
      for (const s of part.smallText) if (!merged.smallText.some(x => x.txt === s.txt && x.cls === s.cls)) merged.smallText.push(s);
      for (const w of part.overflow.wide) if (!merged.overflow.wide.includes(w)) merged.overflow.wide.push(w);
    }
  }
  await c.eval('window.scrollTo(0,0)');
  return merged;
}

const SCREENS = [
  { name: 'welcome', prerun: CLEAR, wait: 2000 },
  { name: 'chooser', prerun: CHOOSER_SEED, wait: 2000 },
  { name: 'korean', prerun: SEED, wait: 4000 },
  { name: 'enhub', prerun: SEED, setup: 'enhub.js' },
  { name: 'library', prerun: SEED, setup: 'library.js' },
  { name: 'flash', prerun: SEED, setup: 'flash.js' },
  { name: 'pethub', prerun: SEED, setup: 'pethub.js' },
  { name: 'hatch', prerun: SEED, setup: 'pets.js' },
  { name: 'evo', prerun: SEED, setup: 'evo.js' },
  { name: 'team', prerun: SEED, setup: 'team.js' },
  { name: 'battle', prerun: SEED, setup: 'battle.js' },
  { name: 'bossmap', prerun: SEED, setup: 'bossmap.js' },
  { name: 'login', setup: 'login.js' },
  { name: 'account', prerun: SEED, setup: 'account.js' },
];

(async () => {
  const c = await openPage(OUT, 390, 844);
  try {
    // ===== §5 layer / version integrity =====
    console.log('§5 layer integrity');
    await c.eval('location.reload()'); await sleep(1500);
    const ver = await c.eval(`(() => ({
      v24: !!document.getElementById('v24'), v24js: !!document.getElementById('v24js'),
      v24ver: (window.__v24||{}).version, v15: (window.__v15||{}).version,
      v18: (window.__v18||{}).version, v19: (window.__v19||{}).version,
      v23: (window.__v23||{}).version, title: document.title,
      lastStyle: [...document.querySelectorAll('style')].pop().id,
      lastScript: [...document.querySelectorAll('script')].pop().id,
      tokens: getComputedStyle(document.documentElement).getPropertyValue('--ui-btn-green').trim()
    }))()`);
    eq(ver.v24, true, 'v24 style present');
    eq(ver.v24js, true, 'v24 script present');
    eq(ver.v24ver, '15.1.0', '__v24 version 15.1.0');
    eq(ver.v15, '15.0.0', 'v15 version unchanged 15.0.0');
    eq(ver.v18, '15.0.0', 'v18 version unchanged 15.0.0');
    eq(ver.v19, '15.0.0', 'v19 version unchanged 15.0.0');
    eq(ver.v23, '15.0.0', 'v23 version unchanged 15.0.0');
    const titleInFile = await c.eval(`fetch(${JSON.stringify(OUT)}).then(r=>r.text()).then(t=>t.includes('<title>Korean &amp; English Vocab Farm V15.1'))`, true);
    eq(titleInFile, true, 'served index.html title is V15.1 (app overwrites live title with due-count)');
    eq(ver.lastStyle, 'v24', 'v24 style loads LAST (wins cascade)');
    eq(ver.tokens, '#2E7D32', '--ui-btn-green token present');

    // ===== §1 contrast audit, all screens =====
    console.log('§1 WCAG AA contrast (scroll-aware)');
    for (const s of SCREENS) {
      const setupJs = s.setup ? fs.readFileSync(__dirname + '/setups/' + s.setup, 'utf8') : null;
      const r = await auditScreen(c, s.name, s.prerun || '', setupJs, s.wait || 1500);
      eq(r.violations.length, 0, s.name + ': 0 contrast violations' + (r.violations.length ? ' -> ' + JSON.stringify(r.violations.slice(0, 3)) : ''));
      eq(r.smallText.length, 0, s.name + ': 0 text < 12px' + (r.smallText.length ? ' -> ' + JSON.stringify(r.smallText.slice(0, 3)) : ''));
      ok(r.overflow.docScrollW <= 390 && r.overflow.wide.length === 0, s.name + ': no horizontal overflow', 'scrollW=' + r.overflow.docScrollW + ' wide=' + JSON.stringify(r.overflow.wide.slice(0, 2)));
    }

    // ===== §1b specific fixed values =====
    console.log('§1b specific computed values');
    await c.eval(`(async()=>{ ${SEED} })()`, true);
    await c.eval('location.reload()'); await sleep(2500);
    const vals = await c.eval(`(() => {
      const cs = s => { const el = document.querySelector(s); if (!el) return null; const c = getComputedStyle(el); return {bg: c.backgroundColor, color: c.color, size: c.fontSize, minH: c.minHeight}; };
      const btn = document.querySelector('.btn.pri') || document.querySelector('.btn');
      return {
        btnPriBg: btn ? getComputedStyle(btn).backgroundColor : null,
        btnPriMinH: btn ? getComputedStyle(btn).minHeight : null,
        v21stat: cs('.v21stat span'),
        tabsBgNight: getComputedStyle(document.querySelector('.tabs')).backgroundColor,
        night: document.documentElement.dataset.v7night
      };
    })()`);
    eq(vals.btnPriBg, 'rgb(46, 125, 50)', '.btn.pri bg is #2E7D32 (white 5.13:1)');
    ok(parseInt(vals.btnPriMinH) >= 44 || vals.btnPriMinH === '48px', '.btn min-height >= 44px', vals.btnPriMinH);
    eq(vals.night, '1', 'night mode is the default profile state');
    ok(vals.tabsBgNight === 'rgb(31, 43, 34)', 'tab bar dark in night mode', vals.tabsBgNight);

    // pet battle bar + element chips (needs fight state)
    await c.eval(`(() => {
      const T = window.__v23._test;
      const en = (typeof T.en23 === 'function') ? T.en23() : T.en23;
      ['dragon','fox','owl'].forEach(sp => { const p = T.newPet(sp); en.pets[p.id] = p; });
      const ids = Object.keys(en.pets);
      T.setTeamSlot(0, ids[0]); T.setTeamSlot(1, ids[1]); T.setTeamSlot(2, ids[2]);
      window.__v15.openHub(); window.__v15.tab('bosses');
      window.__v18._test.fight('v10_slime');
      return 'fight started';
    })()`);
    await sleep(800);
    const barVals = await c.eval(`(() => {
      const bar = document.querySelector('.v23bar-fight');
      const chip = document.querySelector('.v18chip');
      return {
        barColor: bar ? getComputedStyle(bar).color : null,
        chipColor: chip ? getComputedStyle(chip).color : null,
        skillBtn: !!document.querySelector('.v23bf-skill'),
        fightVisible: !!document.querySelector('#v18fight .v18fight')
      };
    })()`);
    eq(barVals.barColor, 'rgb(255, 248, 225)', '.v23bar-fight text is #FFF8E1');
    eq(barVals.chipColor, 'rgb(58, 46, 34)', '.v18chip text is #3A2E22 (border keeps element color)');
    ok(barVals.skillBtn, 'team-skill button renders in fight');
    ok(barVals.fightVisible, 'V18 fight renders');

    // ===== §2 bug fixes =====
    console.log('§2 bug fixes');
    // 2a .ko chooser collision
    await c.eval(`(async()=>{ ${CHOOSER_SEED} })()`, true);
    await c.eval('location.reload()'); await sleep(2200);
    const ko = await c.eval(`(() => {
      const b = document.querySelector('.v15big.ko');
      if (!b) return {found: false};
      const cs = getComputedStyle(b); const r = b.getBoundingClientRect();
      return {found: true, transform: cs.transform, filter: cs.filter, animation: cs.animationName, w: Math.round(r.width), h: Math.round(r.height)};
    })()`);
    ok(ko.found, 'chooser Korean button exists');
    ok(ko.transform === 'none', 'Korean button NOT rotated', ko.transform);
    ok(ko.w > 200, 'Korean button full width', 'w=' + ko.w);
    ok(ko.filter === 'none', 'Korean button NOT grayscale', ko.filter);
    // 2b #v18fight auto-scroll (no manual scroll this time)
    await c.eval(`(async()=>{ ${SEED} })()`, true);
    await c.eval('location.reload()'); await sleep(2500);
    await c.eval(`(() => { window.__v15.openHub(); window.__v15.tab('bosses'); window.scrollTo(0,0); })()`);
    await sleep(400);
    const y0 = await c.eval('window.scrollY');
    await c.eval(`(() => { window.__v18._test.fight('v10_slime'); })()`);
    await sleep(1200);
    const scrolled = await c.eval(`(() => {
      const f = document.querySelector('#v18fight .v18fight');
      if (!f) return {fight: false};
      const r = f.getBoundingClientRect();
      return {fight: true, scrollY: Math.round(window.scrollY), top: Math.round(r.top)};
    })()`);
    ok(scrolled.fight, 'fight starts (auto-scroll test)');
    ok(scrolled.scrollY > 1000 || (scrolled.top >= 0 && scrolled.top < 844), 'fight auto-scrolled into view', JSON.stringify(scrolled) + ' (was scrollY=' + y0 + ')');
    // 2c en15 backfill: bare en15 must not crash the hub
    await c.eval(`(() => {
      const raw = localStorage.getItem('hanvocab.v1');
      const S = JSON.parse(raw); S.v7.en15 = {langChoice: true}; localStorage.setItem('hanvocab.v1', JSON.stringify(S));
      location.reload();
    })()`);
    await sleep(2500);
    const bf = await c.eval(`(() => {
      try {
        const e = window.__v15.en15();
        window.__v15.openHub();
        return {modeBest: !!e.modeBest, hub: !!document.querySelector('.v15hub'), crash: false};
      } catch (err) { return {crash: true, msg: err.message}; }
    })()`);
    ok(!bf.crash && bf.modeBest && bf.hub, 'bare en15 backfilled, hub opens without crash', JSON.stringify(bf));

    // ===== §3 functional regression =====
    console.log('§3 functional regression');
    await c.eval(`(async()=>{ ${SEED} })()`, true);
    await c.eval('location.reload()'); await sleep(2500);
    const fn = await c.eval(`(async () => {
      const R = {};
      window.__v15.openHub();
      R.hubOpen = !!document.querySelector('.v15hub');
      R.modes = document.querySelectorAll('.v15mode').length;
      window.__v15.startMode('flash');
      await new Promise(r => setTimeout(r, 600));
      R.flash = !!document.querySelector('.v15fc');
      R.flashIpa = (document.querySelector('.v15fc .mute')||{}).textContent || '';
      window.__v15.backToLearn ? window.__v15.backToLearn() : window.__v15.tab('learn');
      window.__v23.openHub('team');
      await new Promise(r => setTimeout(r, 600));
      R.petHub = !!document.querySelector('#v23hub');
      R.petTabs = document.querySelectorAll('.v23tab').length;
      const x = document.querySelector('.v23x'); if (x) x.click();
      window.__v19.openMapFor('en');
      await new Promise(r => setTimeout(r, 800));
      R.mapZones = document.querySelectorAll('.v19zone').length;
      R.mapVisible = !!document.querySelector('.v19map');
      // save round-trip
      window.__v20.saveNow();
      await new Promise(r => setTimeout(r, 1500));
      const after = JSON.parse(localStorage.getItem('hanvocab.v1'));
      R.xpKept = after.xp === 12500 && (after.v7.gems||0) === 42;
      R.en15Kept = !!(after.v7.en15 && after.v7.en15.modeBest);
      // KO fight still asks Korean questions (V11.1 regression guard)
      window.__v19.openMapFor('ko');
      await new Promise(r => setTimeout(r, 800));
      R.koMap = document.querySelectorAll('.v19zone').length;
      return R;
    })()`, true);
    ok(fn.hubOpen, 'EN hub opens');
    eq(fn.modes, 10, '10 learning modes render');
    ok(fn.flash, 'flashcard mode starts');
    ok(fn.flashIpa.includes('/'), 'flashcard shows IPA', fn.flashIpa);
    ok(fn.petHub, 'Pet Hub opens');
    ok(fn.petTabs >= 7, 'Pet Hub has 7 tabs', 'got ' + fn.petTabs);
    eq(fn.mapZones, 10, 'Boss Map has 10 zones');
    ok(fn.mapVisible, 'Boss Map renders');
    ok(fn.xpKept, 'save round-trip keeps XP 12500 + gems 42');
    ok(fn.en15Kept, 'save round-trip keeps en15.modeBest');
    eq(fn.koMap, 10, 'KO Boss Map has 10 zones');

    // ===== §4 responsive 360 / 430 (real resize via CDP metrics) =====
    console.log('§4 responsive');
    for (const w of [360, 430]) {
      const cw = await openPage(OUT, w, 844);
      try {
        await cw.eval(`(async()=>{ ${SEED} })()`, true);
        await cw.eval('location.reload()'); await sleep(2500);
        const ov = await cw.eval(`(() => {
          const wide = [];
          document.querySelectorAll('body *').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > window.innerWidth + 1 && r.width > 0) wide.push(el.tagName + '.' + String(el.className).slice(0, 30));
          });
          return {scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, wide: wide.slice(0, 3)};
        })()`);
        ok(ov.scrollW <= w && ov.wide.length === 0, w + 'px Korean home: no horizontal overflow', JSON.stringify(ov));
        // chooser modal must fit the viewport
        await cw.eval(`(async()=>{ ${CHOOSER_SEED} })()`, true);
        await cw.eval('location.reload()'); await sleep(2200);
        const mw = await cw.eval(`(() => {
          const m = document.querySelector('.v15modal');
          if (!m) return {found: false};
          const r = m.getBoundingClientRect();
          return {found: true, w: Math.round(r.width), vw: window.innerWidth, fits: r.width <= window.innerWidth && r.left >= 0};
        })()`);
        ok(mw.found && mw.fits, w + 'px chooser modal fits viewport', JSON.stringify(mw));
        // pet hub at this width
        await cw.eval(`(async()=>{ ${SEED} })()`, true);
        await cw.eval('location.reload()'); await sleep(2000);
        await cw.eval(`(() => { const T = window.__v23._test; const en = (typeof T.en23 === 'function') ? T.en23() : T.en23; ['dragon','fox','owl'].forEach(sp => { const p = T.newPet(sp); en.pets[p.id] = p; }); window.__v23.openHub('pets'); })()`);
        await sleep(800);
        const ov2 = await cw.eval(`(() => ({scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth}))()`);
        ok(ov2.scrollW <= w, w + 'px Pet Hub: no horizontal overflow', JSON.stringify(ov2));
      } finally { cw.close(); }
    }
  } finally { c.close(); }
  console.log(`\n==== test24: ${pass} passed, ${fail} failed ====`);
  if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log(' -', f)); }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST24 CRASH', e); process.exit(2); });
