// repro-v43.js - V18.8 repro-first probe on the PRISTINE V18.7 base.
// Serves ONLY ~/workspace/v7build/tools/v43/pristine-v18.7-out/ (HTTP 8975,
// CDP 9375, profile /tmp/chrome-v43repro-prof). NEVER touches out/, src/, data/.
// Read-only probe: no game file is modified. Exit 0 = driver completed;
// verdicts live in logs/r43-results.json + stdout.
// What it proves (before any fix): the boss-fight Q&A contrast failure Anh
// reported, measured from COMPUTED styles in real Chrome 157, with the
// winning CSS rule behind each dark-on-dark element, at laptop viewports
// (1280x800, 1366x768, light + dark theme) and 360px mobile baseline,
// in BOTH combat renderers (V19 map boss, V18 arena boss), KO word MC.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9375;
const HTTPPORT = 8975;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8975/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v43/repro';
const SERVE = '/home/hatch/workspace/v7build/tools/v43/pristine-v18.7-out';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
function note(...a) { console.log(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); }
function writeSmall(p, data) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const fd = fs.openSync(p, 'w');
    let off = 0;
    while (off < buf.length) { off += fs.writeSync(fd, buf, off, Math.min(512, buf.length - off)); }
    fs.closeSync(fd);
    return true;
  } catch (e) { note('write failed (EPERM wave?):', p, String(e).slice(0, 120)); return false; }
}
function saveResults() { writeSmall(path.join(DIR, 'logs', 'r43-results.json'), JSON.stringify(results, null, 2)); }
let chromeProc = null, httpProc = null;
async function ensureHttp() {
  try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {}
  httpProc = spawn('python3', ['-m', 'http.server', String(HTTPPORT), '--directory', SERVE], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500);
    try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {} }
  throw new Error('http server did not start on ' + HTTPPORT);
}
async function ensureChrome() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {}
  const sha = execSync(`sha256sum ${POLICY} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
  for (let attempt = 1; attempt <= 3; attempt++) {
    note('chrome start attempt', attempt);
    const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
      '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
      '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
      '--user-data-dir=/tmp/chrome-v43repro-prof', `--remote-debugging-port=${PORT}`,
      '--window-size=1280,800', 'about:blank'];
    chromeProc = spawn(CHROME, args, { stdio: 'ignore' });
    for (let i = 0; i < 40; i++) { await sleep(500);
      try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {} }
    note('chrome start attempt', attempt, 'FAILED (no /json/version after 20s)');
    try { chromeProc.kill(); } catch (e) {}
    if (attempt < 3) { note('waiting 10s before retry...'); await sleep(10000); }
  }
  throw new Error('chrome did not start after 3 attempts (EPERM wave?)');
}
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map(); this.events = [];
    this.dialogs = []; this.consoleErrors = []; this.consoleWarns = [];
    this.ready = new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) { const { res, rej } = this.pending.get(d.id); this.pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); }
      else if (d.method) {
        this.events.push(d);
        if (d.method === 'Page.javascriptDialogOpening') {
          this.dialogs.push({ type: d.params.type, message: d.params.message, at: Date.now() });
          this.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
        }
        if (d.method === 'Runtime.exceptionThrown') this.consoleErrors.push(JSON.stringify(d.params.exceptionDetails).slice(0, 600));
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') this.consoleErrors.push(JSON.stringify(d.params.args).slice(0, 600));
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'warning') this.consoleWarns.push(JSON.stringify(d.params.args).slice(0, 300));
      }
    };
  }
  send(method, params = {}) { const id = ++this.id; return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expr, awaitPromise = false) {
    const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page eval error: ' + JSON.stringify(r.exceptionDetails).slice(0, 800));
    return r.result ? r.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (e) {} }
}
let C = null;
async function openPage() {
  await ensureHttp();
  await ensureChrome();
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const t = list.find(x => x.type === 'page');
  C = new CDP(t.webSocketDebuggerUrl);
  await C.ready;
  await C.send('Page.enable'); await C.send('Runtime.enable');
  await setViewport(1280, 800, false);
  await C.eval(`location.href = ${JSON.stringify(URL)}`);
  await sleep(3000);
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await C.eval('location.reload()');
  await sleep(2500);
  return C;
}
async function setViewport(w, h, mobile, dark) {
  await C.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
  await C.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
}
async function reloadWait(ms) { await C.eval('location.reload()'); await sleep(ms || 2800); }
async function shot(name) {
  try {
    const r = await C.send('Page.captureScreenshot', { format: 'png' });
    writeSmall(path.join(DIR, 'shots', `r43-${name}.png`), Buffer.from(r.data, 'base64'));
  } catch (e) { note('shot failed:', name, String(e).slice(0, 120)); }
}
async function step(name, fn) {
  try {
    const r = await fn();
    results[name] = r;
    note(`STEP ${name} —`, JSON.stringify(r).slice(0, 3000));
  } catch (e) {
    results[name] = { error: String(e).slice(0, 600) };
    note(`STEP ${name} ERROR —`, String(e).slice(0, 600));
  }
  saveResults();
}
async function freshGuest() {
  await C.eval(`localStorage.clear()`);
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await reloadWait(2800);
}

// ---- in-page contrast measurement (injected once per page load) ----
const MEASURE_JS = `
window.__r43 = (function(){
  function parseRGB(s){var m=String(s).match(/rgba?\\(([^)]+)\\)/);if(!m)return null;var p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function lum(c){function f(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
  function blend(fg,bg){var a=fg.a;return {r:Math.round(fg.r*a+bg.r*(1-a)),g:Math.round(fg.g*a+bg.g*(1-a)),b:Math.round(fg.b*a+bg.b*(1-a)),a:1};}
  function effBg(el){
    var chain=[],n=el;
    while(n&&n!==document.documentElement){var c=parseRGB(getComputedStyle(n).backgroundColor);if(c)chain.push(c);n=n.parentElement;}
    var base={r:255,g:255,b:255,a:1};
    // composite from outermost (last in chain) down to the element itself
    for(var i=chain.length-1;i>=0;i--){base=blend(chain[i],base);if(chain[i].a>=1&&i===chain.length-1){}}
    // recompute properly: start from the outermost opaque colour
    var acc=null;
    for(var j=chain.length-1;j>=0;j--){if(!acc)acc={r:chain[j].r,g:chain[j].g,b:chain[j].b,a:chain[j].a};else acc=blend(chain[j],acc);}
    if(!acc)acc={r:255,g:255,b:255,a:1};
    if(acc.a<1)acc=blend(acc,{r:255,g:255,b:255,a:1});
    return acc;
  }
  function winRule(el,props){
    var out={};
    props.forEach(function(p){out[p]=null;});
    // inline style wins over every stylesheet rule
    props.forEach(function(p){if(el.style&&el.style.getPropertyValue(p))out[p]='inline style: '+p+': '+el.style.getPropertyValue(p);});
    for(var si=0;si<document.styleSheets.length;si++){
      var sh;try{sh=document.styleSheets[si];}catch(e){continue;}
      var rules;try{rules=sh.cssRules;}catch(e){continue;}
      if(!rules)continue;
      (function walk(rs){
        for(var i=0;i<rs.length;i++){
          var r=rs[i];
          if(r.cssRules){var ok=true;try{ok=!r.conditionText||window.matchMedia(r.conditionText).matches;}catch(e){} if(ok)walk(r.cssRules);continue;}
          if(!r.selectorText)continue;
          var sels=r.selectorText.split(',');
          for(var k=0;k<sels.length;k++){
            var sel=sels[k].trim();var hit=false;
            try{hit=el.matches(sel);}catch(e){hit=false;}
            if(!hit)continue;
            props.forEach(function(p){
              var v=r.style.getPropertyValue(p);
              if(v)out[p]='sheet#'+si+' :: '+sel+' { '+p+': '+v+' }';
            });
          }
        }
      })(rules);
    }
    return out;
  }
  function measureOne(el,label){
    if(!el)return {label:label,exists:false};
    var cs=getComputedStyle(el);
    var fg=parseRGB(cs.color)||{r:0,g:0,b:0,a:1};
    var bg=effBg(el);
    var r=(Math.max(lum(fg),lum(bg))+0.05)/(Math.min(lum(fg),lum(bg))+0.05);
    var fs=parseFloat(cs.fontSize),fw=parseInt(cs.fontWeight)||400;
    var large=(fs>=24)||(fs>=18.66&&fw>=700);
    var need=large?3:4.5;
    return {label:label,exists:true,text:(el.innerText||el.textContent||'').trim().slice(0,60),
      color:cs.color,bg:'rgb('+bg.r+', '+bg.g+', '+bg.b+')',fontSize:cs.fontSize,fontWeight:cs.fontWeight,
      large:large,ratio:Math.round(r*100)/100,need:need,pass:r>=need,
      win:winRule(el,['color','background-color','background'])};
  }
  function theme(){
    var cs=getComputedStyle(document.documentElement);
    return {prefersDark:window.matchMedia('(prefers-color-scheme: dark)').matches,
      dataTheme:document.documentElement.getAttribute('data-theme'),
      ink:cs.getPropertyValue('--ink').trim(),bg:cs.getPropertyValue('--bg').trim(),
      mute:cs.getPropertyValue('--mute').trim(),sf:cs.getPropertyValue('--sf').trim(),
      bodyBg:getComputedStyle(document.body).backgroundColor,bodyColor:getComputedStyle(document.body).color,
      innerWidth:window.innerWidth,scrollW:document.documentElement.scrollWidth};
  }
  function fightState(engine){
    try{
      var F=(engine==='v19'?window.__v19._test.F():window.__v18._test.F());
      if(!F)return {started:false};
      return {started:true,boss:F.boss?F.boss.id:null,lang:F.lang,qmode:F.qmode,ko:!!(F.cur&&F.cur.ko),
        qword:F.cur?(F.cur.k?F.cur.k.h:(F.cur.w?F.cur.w.en:(F.cur.g?F.cur.g.q:''))):null,
        answered:F.answered,over:F.over,hp:F.hp,hearts:F.hearts,pet:!!F.pet};
    }catch(e){return {err:String(e)};}
  }
  function measureFight(engine){
    var p=engine==='v19'?'v19':'v18';
    var out={theme:theme(),state:fightState(engine),items:{}};
    function one(sel,label){var el=document.querySelector(sel);out.items[label]=measureOne(el,label);}
    function all(sel,label){var els=document.querySelectorAll(sel);for(var i=0;i<els.length;i++)out.items[label+'['+i+']']=measureOne(els[i],label+'['+i+']');}
    one('#'+p+'fight .'+p+'qcard .'+p+'qword','qword');
    one('#'+p+'fight .'+p+'qcard .mute','qcard-mute');
    all('#'+p+'fight .'+p+'opt','opt');
    one('#'+p+'fight .'+p+'fight-info > b','boss-name');
    all('#'+p+'fight .'+p+'fight-info .mute','info-mute');
    one('#'+p+'fight .'+p+'fight-info > span:not(.mute)','skill-line');
    one('#'+p+'fight .'+p+'hearts','hearts');
    one('#'+p+'fight .'+p+'explain','explain');
    if(document.querySelector('#'+p+'fight .'+p+'explain .mute'))one('#'+p+'fight .'+p+'explain .mute','explain-mute');
    one('#'+p+'fight .'+p+'passage','passage');
    if(document.querySelector('#'+p+'fight .'+p+'passage p'))one('#'+p+'fight .'+p+'passage p','passage-p');
    one('#'+p+'fight .'+p+'banner','banner');
    one('#'+p+'fight .'+p+'warn','warn');
    // HP label: the span whose text starts with HP
    var hps=document.querySelectorAll('#'+p+'fight .'+p+'fight-info span');
    for(var i=0;i<hps.length;i++){if((hps[i].textContent||'').indexOf('HP ')===0){out.items['hp-label']=measureOne(hps[i],'hp-label');break;}}
    // pet bar (shared v23)
    one('#'+p+'fight .v23bf-note','pet-note');
    all('#'+p+'fight .v23bf-row > span','pet-row-span');
    all('#'+p+'fight .v23bf-pet i','pet-lv');
    one('#'+p+'fight .v23bf-skill','pet-skill');
    one('#'+p+'fight .v23done-big','done-big');
    return out;
  }
  return {measureFight:measureFight,theme:theme,fightState:fightState};
})();
'1';
`;

// Seed a 3-pet Lv.3 team (matches Anh's screenshot: pet Lv.3 badges) so the
// v23 battle bar renders inside the fight. Returns what it did.
async function seedPets() {
  return await C.eval(`(function(){
    try{
      var e=window.__v23._test.en23(); if(!e) return {ok:false,why:'no en23'};
      var sp=window.__v23.data().species||[];
      var have=Object.keys(e.pets||{}).length;
      if(have>=3 && (e.team||[]).filter(Boolean).length>=1)
        return {ok:true,already:true,pets:have,team:(e.team||[]).filter(Boolean).length,spIds:sp.slice(0,3).map(function(s){return s.id})};
      e.pets=e.pets||{}; e.team=e.team||[null,null,null];
      var ids=[];
      for(var i=0;i<3;i++){
        var inst=window.__v23._test.newPet(sp[i%sp.length].id);
        if(!inst) return {ok:false,why:'newPet failed sp '+sp[i%sp.length].id};
        inst.lv=3; inst.st=0; inst.xp=0;
        e.pets[inst.id]=inst; ids.push(inst.id); e.team[i]=inst.id;
      }
      save();
      return {ok:true,seeded:ids.length,spIds:sp.slice(0,3).map(function(s){return s.id}),team:e.team};
    }catch(err){return {ok:false,err:String(err)};}
  })()`);
}

// Drive a V19 KO fight until the current question is a KO word MC
// (qmode 'mc', cur.ko). Returns the fight state.
async function driveV19KOMC(maxSteps) {
  for (let i = 0; i < (maxSteps || 14); i++) {
    const st = await C.eval(`(function(){var F=window.__v19._test.F(); if(!F) return null;
      return {qmode:F.qmode, ko:!!(F.cur&&F.cur.ko), word:F.cur&&F.cur.k?F.cur.k.h:null,
        answered:F.answered, over:F.over, q:F.q}; })()`);
    if (!st) return { ok: false, why: 'no F' };
    if (st.over) return { ok: false, why: 'fight over', st };
    if (st.qmode === 'mc' && st.ko && st.answered === null) return { ok: true, st, steps: i };
    if (st.answered === null) { await C.eval(`window.__v19._test.pickCorrect()`); await sleep(400); }
    await C.eval(`window.__v19.next()`); await sleep(500);
  }
  return { ok: false, why: 'no KO MC reached in steps' };
}
async function driveV18KOMC(maxSteps) {
  for (let i = 0; i < (maxSteps || 14); i++) {
    const st = await C.eval(`(function(){var F=window.__v18._test.F(); if(!F) return null;
      return {qmode:F.qmode, ko:!!(F.cur&&F.cur.ko), word:F.cur&&F.cur.k?F.cur.k.h:null,
        answered:F.answered, over:F.over, q:F.q}; })()`);
    if (!st) return { ok: false, why: 'no F' };
    if (st.over) return { ok: false, why: 'fight over', st };
    if (st.qmode === 'mc' && st.ko && st.answered === null) return { ok: true, st, steps: i };
    if (st.answered === null) { await C.eval(`window.__v18._test.pickCorrect()`); await sleep(400); }
    await C.eval(`window.__v18.next()`); await sleep(500);
  }
  return { ok: false, why: 'no KO MC reached in steps' };
}

async function main() {
  await openPage();
  await C.eval(MEASURE_JS);
  await step('boot', async () => await C.eval(`(function(){return {v15:!!window.__v15,v18:!!window.__v18,v19:!!window.__v19,v23:!!window.__v23,v42:!!window.__v42,version:(window.__v42||{}).version,title:document.title}})()`));

  // ===== R1: V19 KO fight, laptop 1280x800, light theme (headless default) =====
  await setViewport(1280, 800, false, false);
  await freshGuest();
  await C.eval(MEASURE_JS);
  await step('R1-seed-pets', seedPets);
  await step('R1-start-v19-ko', async () => {
    await C.eval(`window.__v19.openMap()`); await sleep(800);
    await C.eval(`window.__v19._test.setLang('ko')`); await sleep(400);
    const r = await C.eval(`(function(){window.__v19.fight('v11_fireking'); return window.__v19._test.F()?{boss:window.__v19._test.F().boss.id,lang:window.__v19._test.F().lang,koCount:window.__v19._test.koCount()}:null})()`);
    await sleep(800);
    return r;
  });
  await step('R1-drive-ko-mc', () => driveV19KOMC(14));
  await shot('v19-ko-1280-light');
  await step('R1-measure-v19-ko-1280-light', async () => await C.eval(`window.__r43.measureFight('v19')`));

  // ===== R2: same fight, 1366x768 light =====
  await setViewport(1366, 768, false, false);
  await sleep(600);
  await shot('v19-ko-1366-light');
  await step('R2-measure-v19-ko-1366-light', async () => await C.eval(`window.__r43.measureFight('v19')`));

  // ===== R3: same fight, 1280x800 DARK theme (emulated prefers-color-scheme) =====
  await setViewport(1280, 800, false, true);
  await reloadWait(2800);
  await C.eval(MEASURE_JS);
  await step('R3-start-v19-ko-dark', async () => {
    await seedPets();
    await C.eval(`window.__v19.openMap()`); await sleep(800);
    await C.eval(`window.__v19._test.setLang('ko')`); await sleep(400);
    await C.eval(`window.__v19.fight('v11_fireking')`); await sleep(800);
    return await driveV19KOMC(14);
  });
  await shot('v19-ko-1280-dark');
  await step('R3-measure-v19-ko-1280-dark', async () => await C.eval(`window.__r43.measureFight('v19')`));

  // ===== R4: V19 KO fight, mobile 360px light =====
  await setViewport(360, 800, true, false);
  await reloadWait(2800);
  await C.eval(MEASURE_JS);
  await step('R4-start-v19-ko-360', async () => {
    await seedPets();
    await C.eval(`window.__v19.openMap()`); await sleep(800);
    await C.eval(`window.__v19._test.setLang('ko')`); await sleep(400);
    await C.eval(`window.__v19.fight('v11_fireking')`); await sleep(800);
    return await driveV19KOMC(14);
  });
  await shot('v19-ko-360-light');
  await step('R4-measure-v19-ko-360-light', async () => await C.eval(`window.__r43.measureFight('v19')`));

  // ===== R5: V18 KO fight, laptop 1280x800 light =====
  await setViewport(1280, 800, false, false);
  await reloadWait(2800);
  await C.eval(MEASURE_JS);
  await step('R5-start-v18-ko-1280', async () => {
    await seedPets();
    const r = await C.eval(`(function(){var id=(window.__V18_BOSSES.en||[])[0]?window.__V18_BOSSES.en[0].id:null;
      if(!id) return {ok:false,why:'no en boss'};
      window.__v18.fight(id,'ko'); return {ok:true,id:id}; })()`);
    await sleep(900);
    return { start: r, drive: await driveV18KOMC(14) };
  });
  await shot('v18-ko-1280-light');
  await step('R5-measure-v18-ko-1280-light', async () => await C.eval(`window.__r43.measureFight('v18')`));

  // ===== R6: answer states in the V19 fight (correct then wrong) =====
  await step('R6-answer-states-v19', async () => {
    await C.eval(`window.__v19._test.pickCorrect()`); await sleep(600);
    const afterRight = await C.eval(`window.__r43.measureFight('v19')`);
    await C.eval(`window.__v19.next()`); await sleep(600);
    const d = await driveV19KOMC(14);
    if (!d.ok) return { afterRight, drive2: d };
    await C.eval(`window.__v19._test.pickWrong()`); await sleep(600);
    const afterWrong = await C.eval(`window.__r43.measureFight('v19')`);
    return { afterRight, drive2: d, afterWrong };
  });
  await shot('v19-ko-answered');

  // ===== R7: console / dialogs summary =====
  await step('R7-console', async () => ({ errors: C.consoleErrors, warns: C.consoleWarns, dialogs: C.dialogs }));
  note('DONE. errors:', C.consoleErrors.length, 'warns:', C.consoleWarns.length, 'dialogs:', C.dialogs.length);
  saveResults();
  try { if (chromeProc) chromeProc.kill(); } catch (e) {}
  try { if (httpProc) httpProc.kill(); } catch (e) {}
  process.exit(0);
}
main().catch(e => { note('FATAL', String(e).slice(0, 500)); saveResults(); try { if (chromeProc) chromeProc.kill(); } catch (err) {} try { if (httpProc) httpProc.kill(); } catch (err) {} process.exit(2); });
