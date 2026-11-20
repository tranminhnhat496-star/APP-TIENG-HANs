// verify-v43c.js - V18.8 BOSS-FIGHT READABILITY Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8977 / CDP 9377, scratch profile.
// Serves ONLY ~/workspace/v7build/out/ (the BUILT V18.8) over local HTTP.
// Modelled on tools/v42/verify-v42c.js + tools/v43/repro/repro-v43.js
// (same CDP class, ensureHttp/ensureChrome with retries, openPage,
// shot/step/verdict, seedPets, KO-MC drivers).
// Exit 0 = driver completed (verdicts are in the results JSON + stdout;
// a FAIL verdict does not crash the driver).
// Writes results to tools/v43/logs/v43c-results.json after EVERY step.
// Screenshots in tools/v43/shots/v43c-*.
// Contrast is measured from COMPUTED styles with an opacity- and
// gradient-aware compositor (the repro's plain compositor understated
// the disabled pet-skill button: the true rendered value blends the
// button's own opacity AND its gold gradient over the dark bar).
// Gates:
//   V43-A V19 KO word MC, 1280x800 light: every fight element PASSes AA.
//   V43-B same fight, 1366x768 light: every element PASSes AA.
//   V43-C same fight, 1280x800 DARK theme: every element PASSes AA.
//   V43-D same fight, 360px light: every element PASSes AA + no overflow.
//   V43-E V18 KO word MC, 1280x800 light: every element PASSes AA.
//   V43-F V18 KO word MC, 1280x800 dark: every element PASSes AA.
//   V43-G answer states (V19 + V18): correct + wrong — right/wrong/
//         disabled opts, explain + explain-mute all PASS.
//   V43-H question types: V19 EN mixed (mc/grammar/listen/builder),
//         V18 read (passage) + speak (warn + explain) — all PASS.
//   V43-I full fight end-to-end (V19 KO win via the _test loop):
//         damage, hearts, win screen readable, 0 console errors.
//   V43-J 360px V18 fight: no horizontal overflow.
//   V43-K console/dialog summary: 0 errors, 0 warnings, 0 dialogs
//         across ALL gates.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9377;
const HTTPPORT = 8977;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8977/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v43';
const OUTDIR = '/home/hatch/workspace/v7build/out';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
const verdicts = [];
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
function saveResults() { writeSmall(path.join(DIR, 'logs', 'v43c-results.json'), JSON.stringify({ verdicts, results }, null, 2)); }
function verdict(name, cond, detail) {
  verdicts.push({ name, pass: !!cond, detail: detail === undefined ? null : detail });
  note((cond ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  saveResults();
  return !!cond;
}
let chromeProc = null, httpProc = null;
async function ensureHttp() {
  try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {}
  httpProc = spawn('python3', ['-m', 'http.server', String(HTTPPORT), '--directory', OUTDIR], { stdio: 'ignore' });
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
      '--user-data-dir=/tmp/chrome-v43c-prof', `--remote-debugging-port=${PORT}`,
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
  await setViewport(1280, 800, false, false);
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
    writeSmall(path.join(DIR, 'shots', `v43c-${name}.png`), Buffer.from(r.data, 'base64'));
  } catch (e) { note('shot failed:', name, String(e).slice(0, 120)); }
}
async function step(name, fn) {
  try {
    const r = await fn();
    results[name] = r;
    note(`STEP ${name} —`, JSON.stringify(r).slice(0, 2000));
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

// ---- in-page contrast measurement: opacity- + gradient-aware ----
const MEASURE_JS = `
window.__r43 = (function(){
  function parseRGB(s){
    s=String(s);
    // Chrome serialises a resolved color-mix() as color(srgb R G B) with 0-1 channels.
    var cm=s.match(/color\\(srgb\\s+([0-9.]+)\\s+([0-9.]+)\\s+([0-9.]+)(?:\\s*\\/\\s*([0-9.]+))?\\)/);
    if(cm)return {r:Math.round(parseFloat(cm[1])*255),g:Math.round(parseFloat(cm[2])*255),b:Math.round(parseFloat(cm[3])*255),a:cm[4]?parseFloat(cm[4]):1};
    var m=s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;var p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function lum(c){function f(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
  function blend(fg,bg){var a=(fg.a==null?1:fg.a);return {r:Math.round(fg.r*a+bg.r*(1-a)),g:Math.round(fg.g*a+bg.g*(1-a)),b:Math.round(fg.b*a+bg.b*(1-a)),a:1};}
  function gradientStops(img){
    // linear-gradient(180deg,#FFB020,#E8890C) -> [colors]; darkest stop is the conservative bg
    var stops=[];var m=String(img).match(/#[0-9a-fA-F]{3,6}|rgba?\\([^)]+\\)/g);
    if(m)m.forEach(function(s){var c=(s[0]==='#')?parseRGB('rgb('+parseInt(s.slice(1,3),16)+','+parseInt(s.slice(3,5),16)+','+parseInt(s.slice(5,7),16)+')'):parseRGB(s);if(c)stops.push(c);});
    return stops;
  }
  function ownBg(el){
    var cs=getComputedStyle(el);
    var img=cs.backgroundImage;
    if(img&&img!=='none'){
      var stops=gradientStops(img);
      if(stops.length){var dark=stops[0];stops.forEach(function(s){if(lum(s)<lum(dark))dark=s;});return {rgb:dark,src:'gradient-darkest-stop '+JSON.stringify(dark)};}
    }
    var c=parseRGB(cs.backgroundColor);
    if(c&&c.a>0)return {rgb:c,src:'backgroundColor '+cs.backgroundColor};
    return null;
  }
  // Effective (fg, bg) for el, compositing opacity + backgrounds up the chain.
  function effColors(el){
    var chain=[],n=el;
    while(n&&n!==document.documentElement){chain.push(n);n=n.parentElement;}
    chain.push(document.documentElement);
    // start from the outermost (html) background over white
    var bg={r:255,g:255,b:255,a:1},bgSrc='page-white';
    for(var i=chain.length-1;i>=0;i--){
      var cs=getComputedStyle(chain[i]);
      var op=parseFloat(cs.opacity);if(isNaN(op))op=1;
      var ob=ownBg(chain[i]);
      if(ob){bg=blend({r:ob.rgb.r,g:ob.rgb.g,b:ob.rgb.b,a:ob.rgb.a*op},bg);bgSrc=ob.src+' @'+chain[i].tagName+'.'+(typeof chain[i].className==='string'?chain[i].className:'');}
    }
    var fgC=parseRGB(getComputedStyle(el).color)||{r:0,g:0,b:0,a:1};
    var opEl=parseFloat(getComputedStyle(el).opacity);if(isNaN(opEl))opEl=1;
    // ancestor opacity also fades the whole subtree: multiply the chain
    var opAll=1;chain.forEach(function(a){var o=parseFloat(getComputedStyle(a).opacity);if(!isNaN(o))opAll*=o;});
    var fg=blend({r:fgC.r,g:fgC.g,b:fgC.b,a:opAll},bg);
    return {fg:fg,bg:bg,bgSrc:bgSrc,opAll:Math.round(opAll*100)/100};
  }
  function winRule(el,props){
    var out={};
    props.forEach(function(p){out[p]=null;});
    props.forEach(function(p){if(el.style&&el.style.getPropertyValue(p))out[p]='inline style: '+p+': '+el.style.getPropertyValue(p);});
    for(var si=0;si<document.styleSheets.length;si++){
      var sh;try{sh=document.styleSheets[si];}catch(e){continue;}
      var rules;try{rules=sh.cssRules;}catch(e){continue;}
      if(!rules)continue;
      (function walk(rs){
        for(var i=0;i<rs.length;i++){
          var r=rs[i];
          // Grouping rules only (media/supports). NOTE: in this Chrome a
          // CSSStyleRule also exposes a (empty) .cssRules list, so testing
          // r.cssRules alone swallows every style rule — check .type.
          if(r.type===4||r.type===12){var ok=true;try{ok=!r.conditionText||window.matchMedia(r.conditionText).matches;}catch(e){} if(ok)walk(r.cssRules);continue;}
          if(!r.selectorText)continue;
          var sels=r.selectorText.split(',');
          for(var k=0;k<sels.length;k++){
            var sel=sels[k].trim();var hit=false;
            try{hit=el.matches(sel);}catch(e){hit=false;}
            if(!hit)continue;
            props.forEach(function(p){
              var v=r.style.getPropertyValue(p);
              if(v)out[p]='sheet#'+si+' ('+(sh.ownerNode&&sh.ownerNode.id||'?')+') :: '+sel+' { '+p+': '+v+' }';
            });
          }
        }
      })(rules);
    }
    return out;
  }
  function inheritedColorRule(el){
    var n=el;
    while(n){var w=winRule(n,['color']);if(w.color)return {from:n===el?'self':(n.tagName+'.'+(typeof n.className==='string'?n.className:'')),rule:w.color};n=n.parentElement;}
    return {from:'none',rule:null};
  }
  function measureOne(el,label){
    if(!el)return {label:label,exists:false};
    var cs=getComputedStyle(el);
    var ec=effColors(el);
    var r=(Math.max(lum(ec.fg),lum(ec.bg))+0.05)/(Math.min(lum(ec.fg),lum(ec.bg))+0.05);
    var fs=parseFloat(cs.fontSize),fw=parseInt(cs.fontWeight)||400;
    var large=(fs>=24)||(fs>=18.66&&fw>=700);
    var need=large?3:4.5;
    return {label:label,exists:true,text:(el.innerText||el.textContent||'').trim().slice(0,60),
      color:cs.color,effFg:'rgb('+ec.fg.r+', '+ec.fg.g+', '+ec.fg.b+')',
      bg:'rgb('+ec.bg.r+', '+ec.bg.g+', '+ec.bg.b+')',bgSrc:ec.bgSrc,opacity:ec.opAll,
      fontSize:cs.fontSize,fontWeight:cs.fontWeight,
      large:large,ratio:Math.round(r*100)/100,need:need,pass:r>=need,
      colorRule:inheritedColorRule(el),win:winRule(el,['color','background-color','background'])};
  }
  function theme(){
    var cs=getComputedStyle(document.documentElement);
    return {prefersDark:window.matchMedia('(prefers-color-scheme: dark)').matches,
      dataTheme:document.documentElement.getAttribute('data-theme'),
      ink:cs.getPropertyValue('--ink').trim(),bg:cs.getPropertyValue('--bg').trim(),
      mute:cs.getPropertyValue('--mute').trim(),sf:cs.getPropertyValue('--sf').trim(),
      ok:cs.getPropertyValue('--ok').trim(),bad:cs.getPropertyValue('--bad').trim(),
      bodyBg:getComputedStyle(document.body).backgroundColor,bodyColor:getComputedStyle(document.body).color,
      innerWidth:window.innerWidth,scrollW:document.documentElement.scrollWidth};
  }
  function fightState(engine){
    try{
      var F=(engine==='v19'?window.__v19._test.F():window.__v18._test.F());
      if(!F)return {started:false};
      return {started:true,boss:F.boss?F.boss.id:null,lang:F.lang,qmode:F.qmode,ko:!!(F.cur&&F.cur.ko),
        qword:F.cur?(F.cur.k?F.cur.k.h:(F.cur.w?F.cur.w.en:(F.cur.g?F.cur.g.q:(F.cur.q?F.cur.q.q:'')))):null,
        answered:F.answered,over:F.over,hp:F.hp,hearts:F.hearts,pet:!!F.pet};
    }catch(e){return {err:String(e)};}
  }
  function measureFight(engine){
    var p=engine==='v19'?'v19':'v18';
    var out={theme:theme(),state:fightState(engine),items:{},allPass:null};
    function one(sel,label){var el=document.querySelector(sel);out.items[label]=measureOne(el,label);}
    function all(sel,label){var els=document.querySelectorAll(sel);for(var i=0;i<els.length;i++)out.items[label+'['+i+']']=measureOne(els[i],label+'['+i+']');}
    one('#'+p+'fight .'+p+'qcard .'+p+'qword','qword');
    one('#'+p+'fight .'+p+'qcard .mute','qcard-mute');
    all('#'+p+'fight .'+p+'opt','opt');
    one('#'+p+'fight .'+p+'fight-info > b','boss-name');
    all('#'+p+'fight .'+p+'fight-info .mute','info-mute');
    one('#'+p+'fight .'+p+'fight-info > span:not(.mute)','hp-label');
    one('#'+p+'fight .'+p+'hearts','hearts');
    all('#'+p+'fight .'+p+'chip','chip');
    one('#'+p+'fight .'+p+'phase','phase');
    one('#'+p+'fight .'+p+'explain','explain');
    if(document.querySelector('#'+p+'fight .'+p+'explain .mute'))one('#'+p+'fight .'+p+'explain .mute','explain-mute');
    one('#'+p+'fight .'+p+'passage','passage');
    if(document.querySelector('#'+p+'fight .'+p+'passage p'))one('#'+p+'fight .'+p+'passage p','passage-p');
    if(document.querySelector('#'+p+'fight .'+p+'passage b'))one('#'+p+'fight .'+p+'passage b','passage-b');
    one('#'+p+'fight .'+p+'banner','banner');
    one('#'+p+'fight .'+p+'warn','warn');
    one('#'+p+'fight .v34breaklabel','breaklabel');
    one('#'+p+'fight .v34weakchip','weakchip');
    one('#'+p+'fight .v34bar-t','breakbar-t');
    if(document.querySelector('#'+p+'fight .v34bar .mute'))one('#'+p+'fight .v34bar .mute','breakbar-mute');
    one('#'+p+'fight .v23bf-note','pet-note');
    all('#'+p+'fight .v23bf-row > span','pet-row-span');
    all('#'+p+'fight .v23bf-pet i','pet-lv');
    one('#'+p+'fight .v23bf-skill','pet-skill');
    one('#'+p+'fight .'+p+'done-big','done-big');
    if(document.querySelector('#'+p+'fight .'+p+'done p'))one('#'+p+'fight .'+p+'done p','done-p');
    if(document.querySelector('#'+p+'fight .'+p+'done .mute'))one('#'+p+'fight .'+p+'done .mute','done-mute');
    var fails=[];
    Object.keys(out.items).forEach(function(k){var it=out.items[k];if(it.exists&&!it.pass)fails.push(k+' '+it.ratio+':1<'+it.need);});
    out.allPass=fails.length===0;out.fails=fails;
    return out;
  }
  return {measureFight:measureFight,theme:theme,fightState:fightState};
})();
'1';
`;

async function seedPets() {
  return await C.eval(`(function(){
    try{
      var e=window.__v23._test.en23(); if(!e) return {ok:false,why:'no en23'};
      var sp=window.__v23.data().species||[];
      var have=Object.keys(e.pets||{}).length;
      if(have>=3 && (e.team||[]).filter(Boolean).length>=1)
        return {ok:true,already:true,pets:have,team:(e.team||[]).filter(Boolean).length};
      e.pets=e.pets||{}; e.team=e.team||[null,null,null];
      for(var i=0;i<3;i++){
        var inst=window.__v23._test.newPet(sp[i%sp.length].id);
        if(!inst) return {ok:false,why:'newPet failed'};
        inst.lv=3; inst.st=0; inst.xp=0;
        e.pets[inst.id]=inst; e.team[i]=inst.id;
      }
      save();
      return {ok:true,seeded:3,team:e.team};
    }catch(err){return {ok:false,err:String(err)};}
  })()`);
}
async function seedAllWins() {
  return await C.eval(`(function(){
    try{
      var oldIds=(window.__V18_BOSSES.old||[]).map(function(b){return b.id});
      var e15=window.__v15.en15(); e15.bosses=e15.bosses||{};
      oldIds.forEach(function(id){e15.bosses[id]={win:1,wins:1,at:Date.now()}});
      var e18=window.__v18.en18(); e18.bosses=e18.bosses||{};
      ['en','el','leg'].forEach(function(a){ (window.__V18_BOSSES[a]||[]).forEach(function(b){ e18.bosses[b.id]={win:1,wins:1,at:Date.now(),item:'x'}; }); });
      var e19=window.__v19.en19();
      window.__v19.bosses.bosses.forEach(function(b){ e19.bosses[b.id]={en:{win:1,wins:1,stars:2,best:0},ko:{win:1,wins:1,stars:2,best:0}}; });
      save();
      return {ok:true};
    }catch(err){return {ok:false,err:String(err)};}
  })()`);
}
async function driveKOMC(engine, maxSteps) {
  const api = engine === 'v19' ? '__v19' : '__v18';
  for (let i = 0; i < (maxSteps || 14); i++) {
    const st = await C.eval(`(function(){var F=window.${api}._test.F(); if(!F) return null;
      return {qmode:F.qmode, ko:!!(F.cur&&F.cur.ko), word:F.cur&&F.cur.k?F.cur.k.h:null,
        answered:F.answered, over:F.over, q:F.q}; })()`);
    if (!st) return { ok: false, why: 'no F' };
    if (st.over) return { ok: false, why: 'fight over', st };
    if (st.qmode === 'mc' && st.ko && st.answered === null) return { ok: true, st, steps: i };
    if (st.answered === null) { await C.eval(`window.${api}._test.pickCorrect()`); await sleep(400); }
    await C.eval(`window.${api}.next()`); await sleep(500);
  }
  return { ok: false, why: 'no KO MC reached in steps' };
}
async function settleBanner() {
  // .v18banner/.v19banner fade in over .3s (v18fadein) and the fight
  // re-renders ~450ms after an answer (hit animation), restarting the
  // fade — a contrast read mid-fade is a transient, not the steady
  // state. Poll until the banner (if any) is fully opaque, max 2s.
  try {
    await C.eval(`new Promise(function(res){var t=0;var iv=setInterval(function(){var b=document.querySelector('.v18banner,.v19banner');var o=b?parseFloat(getComputedStyle(b).opacity):1;if(o>=0.99||++t>20){clearInterval(iv);res(o);}},100)})`, true);
  } catch (e) {}
  await sleep(150);
}
async function startV19KO(bossId) {
  await C.eval(`window.__v19.openMap()`); await sleep(800);
  await C.eval(`window.__v19._test.setLang('ko')`); await sleep(400);
  await C.eval(`window.__v19.fight('${bossId}')`); await sleep(800);
  return await driveKOMC('v19', 14);
}
async function startV18KO(bossId) {
  await C.eval(`window.__v15.openHub('bosses')`); await sleep(800);
  await C.eval(`window.__v18.fight('${bossId}','ko')`); await sleep(900);
  return await driveKOMC('v18', 14);
}
function summarize(m, label) {
  const fails = (m && m.fails) || [];
  const n = m ? Object.keys(m.items || {}).filter(k => m.items[k].exists).length : 0;
  return { label, measured: n, allPass: !!(m && m.allPass), fails };
}

async function main() {
  await openPage();
  await C.eval(MEASURE_JS);
  await step('boot', async () => await C.eval(`(function(){return {v15:!!window.__v15,v18:!!window.__v18,v19:!!window.__v19,v23:!!window.__v23,v43:!!window.__v43,version:(window.__v43||{}).version,title:document.title}})()`));
  verdict('boot: V18.8 loads, __v43 18.8.0 present', (results.boot || {}).version === '18.8.0', results.boot);

  // ===== V43-A: V19 KO MC, 1280x800 light =====
  await setViewport(1280, 800, false, false);
  await freshGuest();
  await C.eval(MEASURE_JS);
  await step('A-seed-pets', seedPets);
  await step('A-start-v19-ko', () => startV19KO('v11_fireking'));
  await shot('v19-ko-1280-light');
  const mA = await C.eval(`window.__r43.measureFight('v19')`);
  await step('A-measure-v19-ko-1280-light', async () => mA);
  verdict('V43-A V19 KO fight 1280x800 light: ALL measured elements pass AA', mA.allPass, summarize(mA, 'A'));

  // ===== V43-B: same fight, 1366x768 light =====
  await setViewport(1366, 768, false, false);
  await sleep(600);
  await shot('v19-ko-1366-light');
  const mB = await C.eval(`window.__r43.measureFight('v19')`);
  await step('B-measure-v19-ko-1366-light', async () => mB);
  verdict('V43-B V19 KO fight 1366x768 light: ALL measured elements pass AA', mB.allPass, summarize(mB, 'B'));

  // ===== V43-C: V19 KO MC, 1280x800 DARK =====
  await setViewport(1280, 800, false, true);
  await reloadWait(2800);
  await C.eval(MEASURE_JS);
  await step('C-start-v19-ko-dark', async () => { await seedPets(); return await startV19KO('v11_fireking'); });
  await shot('v19-ko-1280-dark');
  const mC = await C.eval(`window.__r43.measureFight('v19')`);
  await step('C-measure-v19-ko-1280-dark', async () => mC);
  verdict('V43-C V19 KO fight 1280x800 dark: ALL measured elements pass AA', mC.allPass, summarize(mC, 'C'));

  // ===== V43-D: V19 KO MC, 360px light + overflow =====
  await setViewport(360, 800, true, false);
  await reloadWait(2800);
  await C.eval(MEASURE_JS);
  await step('D-start-v19-ko-360', async () => { await seedPets(); return await startV19KO('v11_fireking'); });
  await shot('v19-ko-360-light');
  const mD = await C.eval(`window.__r43.measureFight('v19')`);
  await step('D-measure-v19-ko-360-light', async () => mD);
  verdict('V43-D V19 KO fight 360px light: ALL measured elements pass AA', mD.allPass, summarize(mD, 'D'));
  verdict('V43-D 360px: no horizontal overflow', mD.theme.scrollW <= 360, { scrollW: mD.theme.scrollW });

  // ===== V43-E: V18 KO MC, 1280x800 light =====
  await setViewport(1280, 800, false, false);
  await reloadWait(2800);
  await C.eval(MEASURE_JS);
  await step('E-start-v18-ko-1280', async () => { await seedPets(); return await startV18KO('v10_slime'); });
  await shot('v18-ko-1280-light');
  const mE = await C.eval(`window.__r43.measureFight('v18')`);
  await step('E-measure-v18-ko-1280-light', async () => mE);
  verdict('V43-E V18 KO fight 1280x800 light: ALL measured elements pass AA', mE.allPass, summarize(mE, 'E'));

  // ===== V43-F: V18 KO MC, 1280x800 dark =====
  await setViewport(1280, 800, false, true);
  await reloadWait(2800);
  await C.eval(MEASURE_JS);
  await step('F-start-v18-ko-dark', async () => { await seedPets(); return await startV18KO('v10_slime'); });
  await shot('v18-ko-1280-dark');
  const mF = await C.eval(`window.__r43.measureFight('v18')`);
  await step('F-measure-v18-ko-1280-dark', async () => mF);
  verdict('V43-F V18 KO fight 1280x800 dark: ALL measured elements pass AA', mF.allPass, summarize(mF, 'F'));

  // ===== V43-G: answer states (V19 correct + wrong; V18 correct + wrong) =====
  await setViewport(1280, 800, false, false);
  await reloadWait(2800);
  await C.eval(MEASURE_JS);
  await step('G-v19-answer-states', async () => {
    await seedPets();
    await startV19KO('v11_fireking');
    await C.eval(`window.__v19._test.pickCorrect()`); await sleep(600);
    await settleBanner();
    const afterRight = await C.eval(`window.__r43.measureFight('v19')`);
    await shot('v19-ko-answered-right');
    await C.eval(`window.__v19.next()`); await sleep(600);
    const d = await driveKOMC('v19', 14);
    if (!d.ok) return { afterRight, drive2: d };
    await C.eval(`window.__v19._test.pickWrong()`); await sleep(600);
    await settleBanner();
    const afterWrong = await C.eval(`window.__r43.measureFight('v19')`);
    await shot('v19-ko-answered-wrong');
    return { afterRight, drive2: d, afterWrong };
  });
  const gR = results['G-v19-answer-states'];
  verdict('V43-G V19 correct answer: right/wrong/disabled opts + explain all pass', !!(gR && gR.afterRight && gR.afterRight.allPass), gR && gR.afterRight ? summarize(gR.afterRight, 'G-right') : gR);
  verdict('V43-G V19 wrong answer: right/wrong/disabled opts + explain all pass', !!(gR && gR.afterWrong && gR.afterWrong.allPass), gR && gR.afterWrong ? summarize(gR.afterWrong, 'G-wrong') : gR);
  await step('G-v18-answer-states', async () => {
    await C.eval(`window.__v15.openHub('bosses')`); await sleep(600);
    await C.eval(`window.__v18.fight('v10_slime','ko')`); await sleep(900);
    const d0 = await driveKOMC('v18', 14);
    if (!d0.ok) return { drive0: d0 };
    await C.eval(`window.__v18._test.pickCorrect()`); await sleep(600);
    await settleBanner();
    const afterRight = await C.eval(`window.__r43.measureFight('v18')`);
    await C.eval(`window.__v18.next()`); await sleep(600);
    const d = await driveKOMC('v18', 14);
    if (!d.ok) return { afterRight, drive2: d };
    await C.eval(`window.__v18._test.pickWrong()`); await sleep(600);
    await settleBanner();
    const afterWrong = await C.eval(`window.__r43.measureFight('v18')`);
    return { afterRight, drive2: d, afterWrong };
  });
  const g18 = results['G-v18-answer-states'];
  verdict('V43-G V18 correct answer: right/wrong/disabled opts + explain all pass', !!(g18 && g18.afterRight && g18.afterRight.allPass), g18 && g18.afterRight ? summarize(g18.afterRight, 'G18-right') : g18);
  verdict('V43-G V18 wrong answer: right/wrong/disabled opts + explain all pass', !!(g18 && g18.afterWrong && g18.afterWrong.allPass), g18 && g18.afterWrong ? summarize(g18.afterWrong, 'G18-wrong') : g18);

  // ===== V43-H: question types =====
  await step('H-types', async () => {
    await seedAllWins();
    await seedPets();
    // V19 EN mixed boss: cycle mc -> grammar -> listen -> builder.
    const mixed = await C.eval(`(function(){var b=(window.__V19_DATA.bosses||[]).filter(function(x){return x.mode==='mixed'})[0]; return b?b.id:null})()`);
    await C.eval(`window.__v19.openMap()`); await sleep(800);
    await C.eval(`window.__v19._test.setLang('en')`); await sleep(300);
    await C.eval(`window.__v19.fight('${mixed}')`); await sleep(900);
    const modes = {};
    for (let i = 0; i < 4; i++) {
      const st = await C.eval(`(function(){var F=window.__v19._test.F(); return F?{qmode:F.qmode,answered:F.answered,over:F.over}:null})()`);
      if (!st || st.over) { modes['q' + i] = { err: 'no F/over', st }; break; }
      modes[st.qmode] = await C.eval(`window.__r43.measureFight('v19')`);
      await C.eval(`window.__v19._test.pickCorrect()`); await sleep(400);
      await C.eval(`window.__v19.next()`); await sleep(500);
    }
    // V18 read boss (passage) + speak boss (warn).
    const readId = await C.eval(`(function(){var all=[];['en','el','leg'].forEach(function(a){(window.__V18_BOSSES[a]||[]).forEach(function(b){all.push(b)})}); var b=all.filter(function(x){return x.mode==='read'})[0]; return b?b.id:null})()`);
    const speakId = await C.eval(`(function(){var all=[];['en','el','leg'].forEach(function(a){(window.__V18_BOSSES[a]||[]).forEach(function(b){all.push(b)})}); var b=all.filter(function(x){return x.mode==='speak'})[0]; return b?b.id:null})()`);
    await C.eval(`window.__v15.openHub('bosses')`); await sleep(600);
    await C.eval(`window.__v18.fight('${readId}','en')`); await sleep(900);
    const readM = await C.eval(`window.__r43.measureFight('v18')`);
    await shot('v18-read-en');
    await C.eval(`window.__v18.fight('${speakId}','en')`); await sleep(900);
    const speakM = await C.eval(`window.__r43.measureFight('v18')`);
    await shot('v18-speak-en');
    // V19 read-mode boss (blocked break bar on the dark panel).
    const read19Id = await C.eval(`(function(){var b=(window.__V19_DATA.bosses||[]).filter(function(x){return x.mode==='read'})[0]; return b?b.id:null})()`);
    await C.eval(`window.__v19.openMap()`); await sleep(800);
    await C.eval(`window.__v19._test.setLang('en')`); await sleep(300);
    await C.eval(`window.__v19.fight('${read19Id}')`); await sleep(900);
    const read19M = await C.eval(`window.__r43.measureFight('v19')`);
    await shot('v19-read-en');
    return { mixedBoss: mixed, modes, readId, readM, speakId, speakM, read19Id, read19M };
  });
  const h = results['H-types'];
  for (const mode of ['mc', 'grammar', 'listen', 'builder']) {
    const mm = h && h.modes && h.modes[mode];
    verdict(`V43-H V19 EN ${mode} question: all elements pass AA`, !!(mm && mm.allPass), mm ? summarize(mm, 'H-' + mode) : (h && h.modes));
  }
  verdict('V43-H V18 read question (passage): all elements pass AA', !!(h && h.readM && h.readM.allPass), h && h.readM ? summarize(h.readM, 'H-read') : h);
  verdict('V43-H V18 speak question (warn): all elements pass AA', !!(h && h.speakM && h.speakM.allPass), h && h.speakM ? summarize(h.speakM, 'H-speak') : h);
  verdict('V43-H V19 read question (blocked break bar): all elements pass AA', !!(h && h.read19M && h.read19M.allPass), h && h.read19M ? summarize(h.read19M, 'H-read19') : h);

  // ===== V43-I: full fight end-to-end (V19 KO win) =====
  await setViewport(1280, 800, false, false);
  await reloadWait(2800);
  await C.eval(MEASURE_JS);
  await step('I-full-fight-win', async () => {
    await seedPets();
    await startV19KO('v11_fireking');
    // pickCorrect loop, then force the final blow like verify-v42c.
    for (let i = 0; i < 40; i++) {
      const st = await C.eval(`(function(){var F=window.__v19._test.F(); if(!F) return null; return {over:F.over, hp:F.hp, answered:F.answered}; })()`);
      if (!st) return { ok: false, why: 'no F' };
      if (st.over) break;
      if (st.answered === null) { await C.eval(`window.__v19._test.pickCorrect()`); await sleep(300); }
      else {
        const hp = await C.eval(`(function(){var F=window.__v19._test.F(); return F?F.hp:null})()`);
        if (hp !== null && hp <= 60) { await C.eval(`(function(){var F=window.__v19._test.F(); if(F){F.hp=1;F.shield=0;}})()`); }
        await C.eval(`window.__v19.next()`); await sleep(400);
      }
    }
    const fin = await C.eval(`(function(){var F=window.__v19._test.F(); return F?{over:F.over,hp:F.hp,hearts:F.hearts,stars:F.stars,firstWin:F.firstWin}:null})()`);
    await sleep(600);
    const doneM = await C.eval(`window.__r43.measureFight('v19')`);
    await shot('v19-ko-win');
    return { fin, doneM };
  });
  const finI = results['I-full-fight-win'];
  verdict('V43-I full V19 KO fight ends in a win (damage + hearts tracked)', !!(finI && finI.fin && finI.fin.over === 'win'), finI && finI.fin);
  verdict('V43-I win screen readable (done-big + done text pass AA)', !!(finI && finI.doneM && finI.doneM.allPass), finI && finI.doneM ? summarize(finI.doneM, 'I-done') : finI);

  // ===== V43-J: 360px V18 fight overflow =====
  await setViewport(360, 800, true, false);
  await reloadWait(2800);
  await C.eval(MEASURE_JS);
  await step('J-v18-360', async () => {
    await seedPets();
    const d = await startV18KO('v10_slime');
    const m = await C.eval(`window.__r43.measureFight('v18')`);
    await shot('v18-ko-360-light');
    return { drive: d, m };
  });
  const j = results['J-v18-360'];
  verdict('V43-J V18 KO fight 360px light: ALL measured elements pass AA', !!(j && j.m && j.m.allPass), j && j.m ? summarize(j.m, 'J') : j);
  verdict('V43-J 360px V18: no horizontal overflow', !!(j && j.m && j.m.theme.scrollW <= 360), j && j.m ? { scrollW: j.m.theme.scrollW } : j);

  // ===== V43-K: console/dialog summary =====
  await step('K-console', async () => ({ errors: C.consoleErrors, warns: C.consoleWarns, dialogs: C.dialogs }));
  verdict('V43-K 0 console errors across all gates', C.consoleErrors.length === 0, C.consoleErrors);
  verdict('V43-K 0 console warnings across all gates', C.consoleWarns.length === 0, C.consoleWarns);
  verdict('V43-K 0 dialogs across all gates', C.dialogs.length === 0, C.dialogs);

  const passed = verdicts.filter(v => v.pass).length, failed = verdicts.filter(v => !v.pass).length;
  note(`DONE. verdicts: ${passed} PASS, ${failed} FAIL (of ${verdicts.length}); console errors: ${C.consoleErrors.length}, warns: ${C.consoleWarns.length}, dialogs: ${C.dialogs.length}`);
  saveResults();
  try { if (chromeProc) chromeProc.kill(); } catch (e) {}
  try { if (httpProc) httpProc.kill(); } catch (e) {}
  process.exit(0);
}
main().catch(e => { note('FATAL', String(e).slice(0, 500)); saveResults(); try { if (chromeProc) chromeProc.kill(); } catch (err) {} try { if (httpProc) httpProc.kill(); } catch (err) {} process.exit(2); });
