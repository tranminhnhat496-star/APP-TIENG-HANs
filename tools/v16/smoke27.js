// V16 smoke load (build agent only — NOT the test suite).
// node tools/v16/smoke27.js
// Opens the built out/index.html in real Chrome 157 via CDP, checks for JS
// errors, __v27 presence, decorator buttons, KO tab button, recordAnswer,
// plan building, and screenshots the EN dashboard at 390px.
const fs = require('fs');
const path = require('path');
const { openPage, shot } = require('../v15ui/cdp');

const URL = 'file:///home/hatch/workspace/v7build/out/index.html';
const OUT = path.join(__dirname, 'smoke27.log');
const SHOT = path.join(__dirname, 'shots-after', 'v27-dash-390.png');

(async () => {
  const log = [];
  const note = (k, v) => { log.push([k, v]); console.log(k, JSON.stringify(v)); };
  const c = await openPage(URL, 390, 844);
  try {
    await new Promise(r => setTimeout(r, 2500));
    const exc = c.events.filter(e => e.method === 'Runtime.exceptionThrown');
    note('jsExceptionsOnLoad', exc.length);
    exc.slice(0, 3).forEach(e => console.log('EXC', JSON.stringify(e.params).slice(0, 400)));
    note('v27version', await c.eval(`window.__v27 && __v27.version`));
    note('v27kotabInDOM', await c.eval(`!!document.querySelector('.v27kotab')`));
    note('v27hubbtnCount', await c.eval(`document.querySelectorAll('.v27hubbtn').length`));
    note('mascotImgOk', await c.eval(`(()=>{const i=new Image();return new Promise(res=>{i.onload=()=>res(true);i.onerror=()=>res(false);i.src='assets/mascot-chick.png'})})()`, true));
    // Dismiss the first-run chooser, then open the Smart overlay (EN).
    await c.eval(`try{window.__v15&&__v15.choose('en')}catch(e){}`);
    await new Promise(r => setTimeout(r, 800));
    await c.eval(`window.__v27.openSmart('en')`);
    await new Promise(r => setTimeout(r, 800));
    note('overlayVisible', await c.eval(`(()=>{const h=document.getElementById('v27hub');return h&&h.style.display==='flex'&&!!document.querySelector('#v27body .v27stats')})()`));
    note('hScroll', await c.eval(`document.documentElement.scrollWidth - window.innerWidth`));
    note('en27created', await c.eval(`!!(window.__v27&&__v27.en27()&&__v27.en27().v===1)`));
    // recordAnswer via a real mark15 call (hook H1 path).
    const rec = await c.eval(`(()=>{
      const w=window.__v15.words[0]; if(!w) return 'no-words';
      const before=(window.__v27.en27().en.last||{})[w.id];
      window.__v15.mark15(true,w,'flash');
      const d=window.__v27.en27();
      return {id:w.id, lastSet:!!d.en.last[w.id], cr:(d.en.cr||{})[w.id]||0, cw:(d.en.cw||{})[w.id]||0, before:!!before};
    })()`);
    note('hookH1record', rec);
    // Plan build (EN, 5 min) — exercises ensureData + classification.
    const plan = await c.eval(`(async()=>{const r=await window.__v27.buildPlan('en',5);return {ids:(r.plan&&r.plan.ids||[]).length, avail:r.avail, short:r.short}})()`, true);
    note('planEN5min', plan);
    // KO dashboard render (no cards in a fresh profile -> honest empty state).
    await c.eval(`window.__v27.setLang('ko')`);
    await new Promise(r => setTimeout(r, 500));
    note('koDashRenders', await c.eval(`!!document.querySelector('#v27body .v27stats')`));
    note('koTotal', await c.eval(`(()=>{const t=document.querySelector('#v27body .v27stat b');return t?t.textContent:null})()`));
    await c.eval(`window.__v27.setLang('en')`);
    await new Promise(r => setTimeout(r, 400));
    await shot(c, SHOT, false);
    note('screenshot', SHOT);
  } finally { c.close(); }
  fs.writeFileSync(OUT, log.map(([k, v]) => k + ': ' + JSON.stringify(v)).join('\n') + '\n');
  console.log('smoke log:', OUT);
  process.exit(0);
})().catch(e => { console.error('SMOKE FAIL', e.message); process.exit(1); });
