// verify-v40c.js - V18.5 BUG FIXES II Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8963 / CDP 9362, scratch profile.
// Modelled on tools/v39/verify-v39c.js + tools/v38/verify-v38c.js
// (same CDP class, ensureHttp/ensureChrome, openPage, shot/step/
// verdict, seedCards). Exit 0 = driver completed (verdicts are in the
// results JSON + stdout; a FAIL verdict does not crash the driver).
// Writes results to tools/v40/logs/v40c-results.json after EVERY step.
// Screenshots in tools/v40/shots/v40c-*.
// Gates:
//   V40-A B-8 fresh load: BT scope + Flashcards directly -> loading
//         state, then BT words (no "no words").
//   V40-B C-02 team skill vs shield: panda 50-dmg skill -> HP 125,
//         shield 30->5, toast "Gây 25 sát thương" + "Khiên boss
//         chặn một nửa."; Legendary phase re-run; lethal still wins.
//   V40-C C-12 picker: units + 0 chips -> Áp dụng refuses (scope
//         unchanged + "Chọn ít nhất 1 Unit." toast); 1 chip applies.
//   V40-D A-F2 KO warning banner survives to Q2 (V18 + V19, 5 cards).
//   V40-E C-04/C-05 Collection replay count "(4 lần)", arenas button
//         "(86 boss)", subtitle names Chrono + Skyroot.
//   V40-F A-F1 KO Break bar says "từ tiếng Hàn của bạn" live.
//   V40-G U-01 duplicate-id live sweep (auth screens, Bosses, arena,
//         map, Collection, picker): every suspect id <=1 per screen.
//   V40-H U-02 360px viewport: no horizontal overflow, controls >=44px.
//   V40-I regression: V37 banner clear, picker round-trip, KO
//         recordAnswer once, Pet Hub smoke.
//   0 console errors/warnings/dialogs across the whole run.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9362;
const HTTPPORT = 8963;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8963/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v40';
const OUTDIR = '/home/hatch/workspace/v7build/out';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = {};
function note(...a) { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); }
function writeSmall(p, data) {
  try {
    const buf = Buffer.from(data, 'utf-8');
    const fd = fs.openSync(p, 'w');
    let off = 0;
    while (off < buf.length) { off += fs.writeSync(fd, buf, off, Math.min(512, buf.length - off)); }
    fs.closeSync(fd);
    return true;
  } catch (e) { console.log('write failed (EPERM wave?):', p, String(e).slice(0, 120)); return false; }
}
function saveResults() { writeSmall(path.join(DIR, 'logs', 'v40c-results.json'), JSON.stringify(results, null, 2)); }
let chromeProc = null;
let httpProc = null;
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
  const args = ['--hatch-webgl-allowed-domains-file=' + POLICY, '--hatch-webgl-allowed-domains-sha256=' + sha,
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-crashpad',
    '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
    '--user-data-dir=/tmp/chrome-v40c-prof', `--remote-debugging-port=${PORT}`,
    '--window-size=390,844', 'about:blank'];
  chromeProc = spawn(CHROME, args, { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { await sleep(500);
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {} }
  throw new Error('chrome did not start');
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
  let t = list.find(x => x.type === 'page');
  C = new CDP(t.webSocketDebuggerUrl);
  await C.ready;
  await C.send('Page.enable'); await C.send('Runtime.enable');
  await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await C.eval(`location.href = ${JSON.stringify(URL)}`);
  await sleep(3000);
  await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
  await C.eval('location.reload()');
  await sleep(2500);
  return C;
}
async function shot(name) {
  try {
    const r = await C.send('Page.captureScreenshot', { format: 'png' });
    if (r.data) fs.writeFileSync(path.join(DIR, 'shots', name + '.png'), Buffer.from(r.data, 'base64'));
  } catch (e) { note('shot failed', name, String(e).slice(0, 120)); }
}
async function step(name, fn) {
  note(`\n== ${name} ==`);
  try {
    const r = await fn();
    results[name] = r;
    note(`PASS ${name} —`, JSON.stringify(r).slice(0, 600));
  } catch (e) {
    results[name] = { error: String(e).slice(0, 600) };
    note(`FAIL ${name} —`, String(e).slice(0, 600));
  }
  saveResults();
}
function verdict(name, cond, detail) {
  note((cond ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''));
  return cond;
}
// 5 valid KO cards (shape matches toCards output: id,d,h,m,p,e,g,box,due).
const FIVE_KO = [
  { id: 'ko_r1', d: 'd0', h: '사과', m: 'quả táo', p: 'sagwa', e: '사과를 먹어요.', g: '', box: 0, due: 0 },
  { id: 'ko_r2', d: 'd0', h: '학교', m: 'trường học', p: 'hakgyo', e: '학교에 가요.', g: '', box: 0, due: 0 },
  { id: 'ko_r3', d: 'd0', h: '물', m: 'nước', p: 'mul', e: '물을 마셔요.', g: '', box: 0, due: 0 },
  { id: 'ko_r4', d: 'd0', h: '책', m: 'sách', p: 'chaek', e: '책을 읽어요.', g: '', box: 0, due: 0 },
  { id: 'ko_r5', d: 'd0', h: '집', m: 'nhà', p: 'jip', e: '집에 가요.', g: '', box: 0, due: 0 },
];
const TWENTY_KO = FIVE_KO.concat([
  { id: 'ko_r6', d: 'd0', h: '친구', m: 'bạn bè', p: 'chingu', e: '친구를 만나요.', g: '', box: 0, due: 0 },
  { id: 'ko_r7', d: 'd0', h: '선생님', m: 'giáo viên', p: 'seonsaengnim', e: '선생님이에요.', g: '', box: 0, due: 0 },
  { id: 'ko_r8', d: 'd0', h: '밥', m: 'cơm', p: 'bap', e: '밥을 먹어요.', g: '', box: 0, due: 0 },
  { id: 'ko_r9', d: 'd0', h: '차', m: 'trà', p: 'cha', e: '차를 마셔요.', g: '', box: 0, due: 0 },
  { id: 'ko_r10', d: 'd0', h: '꽃', m: 'hoa', p: 'kkot', e: '꽃이 예뻐요.', g: '', box: 0, due: 0 },
  { id: 'ko_r11', d: 'd0', h: '강아지', m: 'chó con', p: 'gangaji', e: '강아지가 귀여워요.', g: '', box: 0, due: 0 },
  { id: 'ko_r12', d: 'd0', h: '고양이', m: 'mèo', p: 'goyangi', e: '고양이가 자요.', g: '', box: 0, due: 0 },
  { id: 'ko_r13', d: 'd0', h: '하늘', m: 'bầu trời', p: 'haneul', e: '하늘이 파래요.', g: '', box: 0, due: 0 },
  { id: 'ko_r14', d: 'd0', h: '바다', m: 'biển', p: 'bada', e: '바다가 넓어요.', g: '', box: 0, due: 0 },
  { id: 'ko_r15', d: 'd0', h: '산', m: 'núi', p: 'san', e: '산에 가요.', g: '', box: 0, due: 0 },
  { id: 'ko_r16', d: 'd0', h: '달', m: 'mặt trăng', p: 'dal', e: '달이 떠요.', g: '', box: 0, due: 0 },
  { id: 'ko_r17', d: 'd0', h: '별', m: 'ngôi sao', p: 'byeol', e: '별이 빛나요.', g: '', box: 0, due: 0 },
  { id: 'ko_r18', d: 'd0', h: '해', m: 'mặt trời', p: 'hae', e: '해가 떠요.', g: '', box: 0, due: 0 },
  { id: 'ko_r19', d: 'd0', h: '비', m: 'mưa', p: 'bi', e: '비가 와요.', g: '', box: 0, due: 0 },
  { id: 'ko_r20', d: 'd0', h: '눈', m: 'tuyết', p: 'nun', e: '눈이 와요.', g: '', box: 0, due: 0 },
]);

async function seedCards(cards) {
  await C.eval(`(function(){ try{ S.cards = ${JSON.stringify(cards)}; S.deck='d0'; save(); return S.cards.length; }catch(e){ return 'ERR:'+e; } })()`);
  await sleep(1500); // V20 debounced flush (0.8s) + settle (V18.5 repro lesson)
  await C.eval('location.reload()');
  await sleep(2500);
  return await C.eval(`(function(){ try{ return {n: S.cards.length, ko: S.cards.filter(function(c){return c&&c.h&&c.m}).length, deck: S.deck}; }catch(e){ return 'ERR:'+e; } })()`);
}
async function readFight18() {
  return await C.eval(`(function(){ try{
    var F=window.__v18._test.F(); if(!F) return {started:false};
    var el=document.querySelector('#v18fight');
    return {started:true, lang:F.lang, qmode:F.qmode, curKO: !!(F.cur&&F.cur.ko),
      banner:F.banner, koWarn:F.koWarn,
      bannerText:(function(){var b=document.querySelector('#v18fight .v18banner'); return b?(b.textContent||'').slice(0,120):null})(),
      brk:F.brk, over:F.over, hp:F.hp, maxHp:F.maxHp, shield:F.shield, phase:F.phase,
      fightHtml: el?String(el.innerHTML||'').slice(0,4000):null};
  }catch(e){ return 'ERR:'+e; } })()`);
}
async function readFight19() {
  return await C.eval(`(function(){ try{
    var F=window.__v19._test.F(); if(!F) return {started:false};
    var el=document.querySelector('#v19fight');
    return {started:true, lang:F.lang, qmode:F.qmode, curKO: !!(F.cur&&F.cur.ko),
      banner:F.banner, koWarn:F.koWarn,
      bannerText:(function(){var b=document.querySelector('#v19fight .v19banner'); return b?(b.textContent||'').slice(0,120):null})(),
      over:F.over, hp:F.hp, maxHp:F.maxHp, shield:F.shield, phase:F.phase,
      fightHtml: el?String(el.innerHTML||'').slice(0,4000):null};
  }catch(e){ return 'ERR:'+e; } })()`);
}
async function toastText() {
  // V6 pop (.pp) + .v7toast: read whatever toast is currently visible.
  return await C.eval(`(function(){
    var out=[];
    document.querySelectorAll('.pp,.v7toast').forEach(function(el){ var t=(el.textContent||'').trim(); if(t) out.push(t); });
    return out;
  })()`);
}

async function main() {
  try {
    let chromeAlive = false;
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); chromeAlive = r.ok; } catch (e) {}
    if (!chromeAlive) { try { execSync('rm -rf /tmp/chrome-v40c-prof'); note('fresh profile: removed old chrome-v40c-prof'); } catch (e) {} }
    await openPage();
    const boot = await C.eval(`(function(){ return { S: typeof S, v15: !!window.__v15, v18: !!window.__v18, v19: !!window.__v19, v22: !!window.__v22, v23: !!window.__v23, v27: !!window.__v27, v34: !!window.__v34, v40: !!window.__v40, v40ver: (function(){ try{ return window.__v40.version; }catch(e){ return 'ERR:'+e; } })(), title: document.title, cards: (function(){ try{ return S.cards.length; }catch(e){ return 'ERR:'+e; } })() }; })()`);
    note('boot:', boot);
    results.boot = boot;
    saveResults();
    const err0 = C.consoleErrors.length, warn0 = C.consoleWarns.length, dlg0 = C.dialogs.length;
    const delta = () => ({ errors: C.consoleErrors.length - err0, warns: C.consoleWarns.length - warn0, dialogs: C.dialogs.length - dlg0 });
    let allOk = true;
    const failedVerdicts = [];
    function v(name, cond, detail) { if (!verdict(name, cond, detail)) { allOk = false; failedVerdicts.push(name); } return cond; }

    async function openArenaEn() {
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('bosses'); window.__v18.openArena('en'); }catch(e){} })()`);
      await sleep(900);
    }
    async function pickLib(lib) {
      return C.eval(`(function(){
        var sel=document.querySelector('#v22bs-lib'); if(!sel) return {ok:false, why:'no #v22bs-lib'};
        sel.value=${JSON.stringify(lib)};
        sel.dispatchEvent(new Event('change', {bubbles:true}));
        return {ok:true};
      })()`);
    }
    async function pickerState() {
      return C.eval(`(function(){
        var lib=document.querySelector('#v22bs-lib');
        var chips=Array.prototype.slice.call(document.querySelectorAll('#v22bs-chips .v15pill'));
        var cur=document.querySelector('#v22bs-current');
        var scope=null; try{ scope=window.__v15.en15().scope; }catch(e){}
        return {
          libValue: lib?lib.value:null,
          libOptions: lib?Array.prototype.slice.call(lib.options).map(function(o){ return o.value; }):null,
          chips: chips.length,
          chipOn: chips.filter(function(c){ return c.classList.contains('on'); }).map(function(c){ return c.getAttribute('data-u')||c.getAttribute('data-t')||c.getAttribute('data-s'); }),
          current: cur?(cur.textContent||'').trim():null,
          scope: scope
        };
      })()`);
    }
    async function clickPickerButton(text) {
      return C.eval(`(function(){
        var btns=document.querySelectorAll('.v22bscope .btn');
        for(var i=0;i<btns.length;i++){ if((btns[i].textContent||'').indexOf(${JSON.stringify(text)})>=0){ btns[i].click(); return true; } }
        return false;
      })()`);
    }

    // ============ V40-A B-8 fresh load ============
    await step('V40-A-b8-fresh-load', async () => {
      const r = {};
      // Set the BT scope in the save, then reload = a fresh page load
      // with the scope already active (the exact V18.4 repro).
      await C.eval(`(function(){ try{ window.__v15.en15().scope={kind:'lib',lib:'bt',unit:2}; save(); return true; }catch(e){ return 'ERR:'+e; } })()`);
      await sleep(1500);
      await C.eval('location.reload()');
      await sleep(2500);
      r.scopeAfterReload = await C.eval(`(function(){ try{ return window.__v15.en15().scope; }catch(e){ return 'ERR:'+e; } })()`);
      v('A1 scope survives the reload', r.scopeAfterReload && r.scopeAfterReload.lib === 'bt' && r.scopeAfterReload.unit === 2, r.scopeAfterReload);
      v('A2 BT data not attached yet on the fresh load', await C.eval(`!window.__V22_BT`));
      // Read the loading state SYNCHRONOUSLY in the same eval as
      // startMode: the local BT fetch resolves in <400ms, so a later
      // read already shows the started mode (that is the fix working).
      const loading = await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.startMode('flash'); }catch(e){} var b=document.getElementById('v15body'); return b?String(b.innerHTML||''):null; })()`);
      r.loadingHtml = loading;
      v('A3 Flashcards shows the BT loading state (not "no words")', !!loading && loading.indexOf('Đang tải bộ từ Basic Tactics') >= 0 && loading.indexOf('Không có từ nào') < 0, (loading || '').slice(0, 200));
      await shot('v40c-A-loading');
      await sleep(2500);
      const after = await C.eval(`(function(){ var b=document.getElementById('v15body'); return {body: b?String(b.innerHTML||''):null, bt: !!window.__V22_BT}; })()`);
      r.after = after;
      v('A4 BT data is attached after the wait', after.bt === true, after.bt);
      v('A5 Flashcards starts with BT words (no "no words")', (after.body || '').indexOf('Không có từ nào') < 0, (after.body || '').slice(0, 200));
      v('A6 Flashcards head renders', (after.body || '').indexOf('Flashcards') >= 0, (after.body || '').slice(0, 200));
      await shot('v40c-A-started');
      r.console = delta();
      v('A7 no console errors/warnings/dialogs in this gate', r.console.errors === 0 && r.console.warns === 0 && r.console.dialogs === 0, r.console);
      await C.eval(`(function(){ try{ window.__v15.clearScope(); }catch(e){} })()`);
      return r;
    });

    // ============ V40-B C-02 team skill vs shield ============
    await step('V40-B-c02-shield', async () => {
      const r = {};
      await C.eval(`(function(){
        var e=window.__v18.en18();
        ['v10_slime','v10_fairy','v10_dragon','v10_ghost','v10_spider','v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){ e.bosses[id]={win:1,wins:1,at:Date.now(),item:'x'}; });
        S.v7.en23={pets:{p1:{id:'p1',sp:'dragon',st:1,lv:10,xp:0,aff:0}},team:['p1',null,null],eggs:{fire:1,forest:1},hatch:null,mats:{},claimed:{},affClaimed:{},created:1};
        save();
      })()`);
      await sleep(1500);
      await C.eval(`(function(){ try{ window.__v18.fight('v10_panda','en'); }catch(e){} })()`);
      await sleep(900);
      const f0 = await readFight18();
      r.f0 = { hp: f0.hp, shield: f0.shield, started: f0.started };
      v('B1 panda fight opens: HP 150, shield 30', f0.started === true && f0.hp === 150 && f0.shield === 30, r.f0);
      const cast = await C.eval(`(function(){ try{
        var F=window.__v18._test.F();
        var activeVal=F&&F.pet?F.pet.activeVal:null;
        F.pet.energy=10;
        window.__v23.castSkillInFight();
        var F2=window.__v18._test.F();
        var toasts=[]; document.querySelectorAll('.pp,.v7toast').forEach(function(el){ var t=(el.textContent||'').trim(); if(t) toasts.push(t); });
        return {activeVal:activeVal, hp:F2.hp, shield:F2.shield, over:F2.over, toasts:toasts};
      }catch(e){ return 'ERR:'+e; } })()`);
      r.cast = cast;
      v('B2 team skill (50) vs shield 30: HP 150->125 (halved)', cast.hp === 125, cast);
      v('B3 shield absorbs the dealt damage (30->5)', cast.shield === 5, cast);
      v('B4 toast states the dealt 25, not the raw 50', cast.toasts.some(function(t){ return t.indexOf('Gây 25 sát thương') >= 0; }), cast.toasts);
      v('B5 toast notes the shield halved it', cast.toasts.some(function(t){ return t.indexOf('Khiên boss chặn một nửa.') >= 0; }), cast.toasts);
      v('B6 fight still open (non-lethal)', cast.over === null || cast.over === undefined, cast.over);
      await shot('v40c-B-skill');
      // Phase re-run on a Legendary boss.
      const legId = await C.eval(`window.__V18_BOSSES.leg[0].id`);
      await C.eval(`(function(){ try{ window.__v18._test.close(); window.__v18.fight(${JSON.stringify(legId)},'en'); }catch(e){} })()`);
      await sleep(900);
      const ph = await C.eval(`(function(){ try{
        var F=window.__v18._test.F();
        var maxHp=F.maxHp, phase0=F.phase;
        F.hp=Math.floor(F.maxHp/2)+10;
        F.pet.energy=10;
        window.__v23.castSkillInFight();
        var F2=window.__v18._test.F();
        return {maxHp:maxHp, phase0:phase0, hp:F2.hp, phase:F2.phase, banner:F2.banner};
      }catch(e){ return 'ERR:'+e; } })()`);
      r.phase = ph;
      v('B7 Legendary: skill drops boss below 50% -> phase 2 at once', ph.phase === 2, ph);
      v('B8 Legendary: phase-2 banner set', typeof ph.banner === 'string' && ph.banner.indexOf('Giai đoạn 2') >= 0, ph.banner);
      // Lethal skill still resolves the fight.
      const lethal = await C.eval(`(function(){ try{
        window.__v18._test.close();
        window.__v18.fight('v10_panda','en');
        var F=window.__v18._test.F();
        F.hp=20; F.pet.energy=10;
        window.__v23.castSkillInFight();
        var F2=window.__v18._test.F();
        return {hp:F2.hp, over:F2.over};
      }catch(e){ return 'ERR:'+e; } })()`);
      r.lethal = lethal;
      v('B9 lethal skill (25 dealt vs 20 HP): fight resolves as a win', lethal.hp === 0 && lethal.over === 'win', lethal);
      r.console = delta();
      v('B10 no console errors/warnings/dialogs in this gate', r.console.errors === 0 && r.console.warns === 0 && r.console.dialogs === 0, r.console);
      return r;
    });

    // ============ V40-C C-12 picker refuses empty Units ============
    await step('V40-C-c12-picker', async () => {
      const r = {};
      await C.eval(`(function(){ try{ window.__v15.en15().scope={kind:'lib',lib:'a1a2',topic:'a1_education'}; save(); }catch(e){} })()`);
      await sleep(1200);
      await openArenaEn();
      const before = await pickerState();
      r.before = before;
      v('C1 picker lists all 7 lib options', before.libOptions && before.libOptions.length === 7 && before.libOptions.indexOf('units') >= 0, before.libOptions);
      const picked = await pickLib('units');
      v('C2 lib select accepts units (real change event)', picked.ok === true, picked);
      await sleep(500);
      const clickedOff = await clickPickerButton('Bỏ chọn tất cả');
      v('C3 "Bỏ chọn tất cả" button clicked (real click)', clickedOff === true);
      await sleep(400);
      const st0 = await pickerState();
      r.st0 = st0;
      v('C4 0 Unit chips are on after "Bỏ chọn tất cả"', st0.chipOn.length === 0, st0.chipOn);
      const clickedApply = await clickPickerButton('Áp dụng');
      v('C5 Áp dụng button clicked (real click)', clickedApply === true);
      await sleep(500);
      const st1 = await pickerState();
      r.st1 = st1;
      v('C6 scope UNCHANGED after applying 0 Units (not silently all-BT)', st1.scope && st1.scope.lib === 'a1a2' && st1.scope.topic === 'a1_education', st1.scope);
      const toasts = await toastText();
      r.toasts = toasts;
      v('C7 refuse toast shown: "Chọn ít nhất 1 Unit."', toasts.some(function(t){ return t.indexOf('Chọn ít nhất 1 Unit.') >= 0; }), toasts);
      await shot('v40c-C-refused');
      // Now tick one Unit chip (real click) and apply: it must apply.
      const chipClicked = await C.eval(`(function(){
        var chip=document.querySelector('#v22bs-chips [data-u="2"]'); if(!chip) return false; chip.click(); return true;
      })()`);
      v('C8 Unit 2 chip clicked (real click)', chipClicked === true);
      await sleep(400);
      await clickPickerButton('Áp dụng');
      await sleep(2500); // BT applies are async via ensureData
      const st2 = await pickerState();
      r.st2 = st2;
      v('C9 units + 1 chip: scope becomes BT unit 2', st2.scope && st2.scope.lib === 'bt' && st2.scope.unit === 2, st2.scope);
      r.console = delta();
      v('C10 no console errors/warnings/dialogs in this gate', r.console.errors === 0 && r.console.warns === 0 && r.console.dialogs === 0, r.console);
      await C.eval(`(function(){ try{ window.__v15.clearScope(); }catch(e){} })()`);
      return r;
    });

    // ============ V40-D A-F2 banner survives to Q2 ============
    await step('V40-D-af2-banner', async () => {
      const r = {};
      const seeded = await seedCards(FIVE_KO);
      r.seeded = seeded;
      v('D1 5-card save seeded', seeded.n === 5 && seeded.ko === 5, seeded);
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v18.fight('v10_slime','ko'); }catch(e){} })()`);
      await sleep(900);
      const q1 = await readFight18();
      r.q1 = { banner: q1.banner, koWarn: q1.koWarn, bannerText: q1.bannerText };
      v('D2 V18 Q1: banner shows exactly 5/8', q1.banner === '⚠️ Bạn mới có 5/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.', q1.banner);
      v('D3 V18 Q1: banner element is painted', q1.bannerText !== null && q1.bannerText.indexOf('5/8') >= 0, q1.bannerText);
      await shot('v40c-D-q1');
      await C.eval(`(function(){ try{ window.__v18._test.pickCorrect(); }catch(e){} })()`);
      await sleep(600);
      await C.eval(`(function(){ try{ window.__v18.next(); }catch(e){} })()`);
      await sleep(700);
      const q2 = await readFight18();
      r.q2 = { banner: q2.banner, koWarn: q2.koWarn, bannerText: q2.bannerText };
      v('D4 V18 Q2: banner SURVIVES next() (was cleared before)', q2.banner === q1.banner, q2.banner);
      v('D5 V18 Q2: banner element still painted', q2.bannerText !== null && q2.bannerText.indexOf('5/8') >= 0, q2.bannerText);
      await shot('v40c-D-q2');
      // V19 parity.
      await C.eval(`(function(){ try{ window.__v19._test.close(); window.__v19.openMapFor('ko'); window.__v19.fight('v11_fireking'); }catch(e){} })()`);
      await sleep(900);
      const m1 = await readFight19();
      r.m1 = { banner: m1.banner, bannerText: m1.bannerText };
      v('D6 V19 Q1: banner shows exactly 5/8', m1.banner === '⚠️ Bạn mới có 5/8 thẻ tiếng Hàn — trận này dùng câu hỏi tiếng Anh cho đến khi đủ thẻ.', m1.banner);
      await C.eval(`(function(){ try{ window.__v19._test.pickCorrect(); }catch(e){} })()`);
      await sleep(600);
      await C.eval(`(function(){ try{ window.__v19.next(); }catch(e){} })()`);
      await sleep(700);
      const m2 = await readFight19();
      r.m2 = { banner: m2.banner, bannerText: m2.bannerText };
      v('D7 V19 Q2: banner SURVIVES next()', m2.banner === m1.banner, m2.banner);
      r.console = delta();
      v('D8 no console errors/warnings/dialogs in this gate', r.console.errors === 0 && r.console.warns === 0 && r.console.dialogs === 0, r.console);
      return r;
    });

    // ============ V40-E C-04/C-05 Collection counts + copy ============
    await step('V40-E-c04-c05-collection', async () => {
      const r = {};
      await seedCards(TWENTY_KO);
      await C.eval(`(function(){
        var e19=window.__v19.en19();
        e19.bosses['v11_fireking']={en:{win:1,wins:3,stars:2,best:0},ko:{win:1,wins:1,stars:1,best:0}};
        var e18=window.__v18.en18();
        e18.bosses['v10_slime']={win:1,wins:2,at:Date.now(),item:'x'};
        save();
      })()`);
      await sleep(1200);
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.tab('bosses'); }catch(e){} })()`);
      await sleep(900);
      const bossesHtml = await C.eval(`(function(){ var b=document.getElementById('v15body'); return b?String(b.innerHTML||''):''; })()`);
      r.arenasBtn = (bossesHtml.match(/Xem Bộ Sưu Tập Boss \([^)]*\)/) || [null])[0];
      v('E1 arenas button shows the live count "(86 boss)"', bossesHtml.indexOf('Xem Bộ Sưu Tập Boss (86 boss)') >= 0, r.arenasBtn);
      v('E2 arenas button no longer says "(40 boss)"', bossesHtml.indexOf('(40 boss)') < 0, r.arenasBtn);
      await shot('v40c-E-bosses');
      await C.eval(`(function(){ try{ window.__v15.tab('collection'); }catch(e){} })()`);
      await sleep(900);
      const collHtml = await C.eval(`(function(){ var b=document.getElementById('v15body'); return b?String(b.innerHTML||''):''; })()`);
      v('E3 Collection subtitle names Chrono Kingdom', collHtml.indexOf('Chrono Kingdom (V17)') >= 0, (collHtml.match(/Chrono[^<]{0,40}/) || [null])[0]);
      v('E4 Collection subtitle names Skyroot Sanctuary', collHtml.indexOf('Skyroot Sanctuary (V18)') >= 0, (collHtml.match(/Skyroot[^<]{0,40}/) || [null])[0]);
      await C.eval(`(function(){ try{ window.__v18.collDetail('v11_fireking'); }catch(e){} })()`);
      await sleep(700);
      const det = await C.eval(`(function(){ var h=document.getElementById('v18colldetail'); return h?String(h.innerHTML||''):null; })()`);
      r.det = det;
      v('E5 map boss detail shows the summed replay count "(4 lần)"', !!det && det.indexOf('(4 lần)') >= 0, (det || '').slice(0, 300));
      await C.eval(`(function(){ try{ window.__v18.collDetail('v10_slime'); }catch(e){} })()`);
      await sleep(700);
      const det2 = await C.eval(`(function(){ var h=document.getElementById('v18colldetail'); return h?String(h.innerHTML||''):null; })()`);
      v('E6 arena boss detail still shows "(2 lần)"', !!det2 && det2.indexOf('(2 lần)') >= 0, (det2 || '').slice(0, 300));
      await shot('v40c-E-detail');
      r.console = delta();
      v('E7 no console errors/warnings/dialogs in this gate', r.console.errors === 0 && r.console.warns === 0 && r.console.dialogs === 0, r.console);
      return r;
    });

    // ============ V40-F A-F1 Break label live ============
    await step('V40-F-af1-break-label', async () => {
      const r = {};
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v18.fight('v10_slime','ko'); }catch(e){} })()`);
      await sleep(900);
      const f = await readFight18();
      r.fightHtml = f.fightHtml;
      v('F1 KO fight renders (20-card deck, Break bar present)', f.started === true && !!f.fightHtml && f.fightHtml.indexOf('Điểm yếu') >= 0, (f.fightHtml || '').slice(0, 200));
      v('F2 Break bar says "từ tiếng Hàn của bạn"', !!f.fightHtml && f.fightHtml.indexOf('từ tiếng Hàn của bạn') >= 0, (f.fightHtml || '').slice(0, 400));
      v('F3 Break bar no longer says "bộ từ tiếng Hàn đã chọn"', !!f.fightHtml && f.fightHtml.indexOf('bộ từ tiếng Hàn đã chọn') < 0, (f.fightHtml || '').slice(0, 400));
      await shot('v40c-F-breakbar');
      r.console = delta();
      v('F4 no console errors/warnings/dialogs in this gate', r.console.errors === 0 && r.console.warns === 0 && r.console.dialogs === 0, r.console);
      await C.eval(`(function(){ try{ window.__v18._test.close(); }catch(e){} })()`);
      return r;
    });

    // ============ V40-G U-01 duplicate-id live sweep ============
    await step('V40-G-u01-dup-ids', async () => {
      const r = { screens: {} };
      const IDS = ['v21authmsg', 'v7opts', 'v22bs-chips', 'v21back', 'v21email', 'v21submit', 'v21emailbtn'];
      async function sweep(label) {
        const counts = await C.eval(`(function(){
          var ids=${JSON.stringify(IDS)};
          var out={};
          ids.forEach(function(id){ out[id]=document.querySelectorAll('#'+id).length; });
          return out;
        })()`);
        r.screens[label] = counts;
        const bad = Object.keys(counts).filter(function (k) { return counts[k] > 1; });
        v('G ' + label + ': every suspect id appears at most once', bad.length === 0, bad.length ? { bad: bad, counts: counts } : counts);
        return counts;
      }
      // Auth screens: drop the guest session and reload to the welcome screen.
      await C.eval(`(function(){ localStorage.removeItem('hanvocab.v13.session'); })()`);
      await C.eval('location.reload()');
      await sleep(2500);
      await sweep('welcome');
      await shot('v40c-G-welcome');
      // Walk login / register / forgot via their real buttons.
      async function clickText(text) {
        return C.eval(`(function(){
          var els=document.querySelectorAll('button');
          for(var i=0;i<els.length;i++){ if((els[i].textContent||'').indexOf(${JSON.stringify(text)})>=0){ els[i].click(); return true; } }
          return false;
        })()`);
      }
      await clickText('Đăng nhập');
      await sleep(800);
      await sweep('login');
      await clickText('Đăng ký');
      await sleep(800);
      await sweep('register');
      await clickText('Quên mật khẩu');
      await sleep(800);
      await sweep('forgot');
      // Back to guest, then the game screens.
      await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
      await C.eval('location.reload()');
      await sleep(2500);
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.tab('bosses'); }catch(e){} })()`);
      await sleep(900);
      await sweep('bosses-tab');
      await C.eval(`(function(){ try{ window.__v18.openArena('en'); }catch(e){} })()`);
      await sleep(900);
      await sweep('arena-picker');
      await C.eval(`(function(){ try{ window.__v15.tab('map'); }catch(e){} })()`);
      await sleep(900);
      await sweep('boss-map');
      await C.eval(`(function(){ try{ window.__v15.tab('collection'); }catch(e){} })()`);
      await sleep(900);
      await sweep('collection');
      r.console = delta();
      v('G9 no console errors/warnings/dialogs in this gate', r.console.errors === 0 && r.console.warns === 0 && r.console.dialogs === 0, r.console);
      return r;
    });

    // ============ V40-H U-02 360px overflow ============
    await step('V40-H-u02-360px', async () => {
      const r = {};
      await C.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
      await sleep(500);
      async function overflow(label) {
        const m = await C.eval(`(function(){
          var sw=document.documentElement.scrollWidth, cw=document.documentElement.clientWidth;
          var small=[];
          document.querySelectorAll('.v22bscope .btn, .v15tab, .btn.pri').forEach(function(el){
            var rc=el.getBoundingClientRect();
            if(rc.height>0&&rc.height<44) small.push({t:(el.textContent||'').trim().slice(0,20), h:Math.round(rc.height)});
          });
          return {scrollWidth:sw, clientWidth:cw, overflow:sw-cw, smallControls:small.slice(0,5)};
        })()`);
        r[label] = m;
        v('H ' + label + ': no horizontal overflow at 360px', m.overflow <= 0, m);
        return m;
      }
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.tab('bosses'); }catch(e){} })()`);
      await sleep(900);
      await overflow('bosses-360');
      await shot('v40c-H-bosses-360');
      await C.eval(`(function(){ try{ window.__v18.openArena('en'); }catch(e){} })()`);
      await sleep(900);
      const pk = await overflow('picker-360');
      v('H picker: Áp dụng + pick-all controls are >=44px tall', pk.smallControls.length === 0, pk.smallControls);
      await shot('v40c-H-picker-360');
      await C.eval(`(function(){ try{ window.__v15.tab('map'); }catch(e){} })()`);
      await sleep(900);
      await overflow('map-360');
      await C.eval(`(function(){ try{ window.__v15.tab('collection'); }catch(e){} })()`);
      await sleep(900);
      await overflow('collection-360');
      await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await sleep(500);
      r.console = delta();
      v('H5 no console errors/warnings/dialogs in this gate', r.console.errors === 0 && r.console.warns === 0 && r.console.dialogs === 0, r.console);
      return r;
    });

    // ============ V40-I regression ============
    await step('V40-I-regression', async () => {
      const r = {};
      // V37 scope banner clear (real click on ✕ Bỏ chọn).
      await C.eval(`(function(){ try{ window.__v15.en15().scope={kind:'lib',lib:'a1a2',topic:'a1_education'}; save(); }catch(e){} })()`);
      await sleep(1200);
      await C.eval(`(function(){ try{ window.__v15.choose('en'); }catch(e){} })()`);
      await sleep(900);
      const bannerBefore = await C.eval(`(function(){ var h=document.getElementById('v15hub'); return h?String(h.innerHTML||''):''; })()`);
      v('I1 scope banner is shown with an A1–A2 scope', bannerBefore.indexOf('Bỏ chọn') >= 0 && bannerBefore.indexOf('Education') >= 0, bannerBefore.slice(0, 200));
      const clicked = await C.eval(`(function(){
        var btns=document.querySelectorAll('#v15hub button');
        for(var i=0;i<btns.length;i++){ if((btns[i].textContent||'').indexOf('Bỏ chọn')>=0){ btns[i].click(); return true; } }
        return false;
      })()`);
      v('I2 ✕ Bỏ chọn clicked (real click)', clicked === true);
      await sleep(700);
      const bannerAfter = await C.eval(`(function(){
        var h=document.getElementById('v15hub'); var sc=null; try{ sc=window.__v15.en15().scope; }catch(e){}
        return {html: h?String(h.innerHTML||''):null, scope: sc};
      })()`);
      v('I3 banner is GONE after the click (V37 fix holds)', (bannerAfter.html || '').indexOf('Bỏ chọn') < 0, (bannerAfter.html || '').slice(0, 200));
      v('I4 scope is null after the click', bannerAfter.scope === null, bannerAfter.scope);
      // Picker round-trip: an Oxford scope set from the Library shows
      // selected in the picker.
      await C.eval(`(function(){ try{ window.__v15.en15().scope={kind:'lib',lib:'oxford',lesson:12}; save(); }catch(e){} })()`);
      await sleep(1200);
      await openArenaEn();
      const ps = await pickerState();
      r.pickerRoundTrip = ps;
      v('I5 picker shows the Oxford scope (lib oxford, lesson 12)', ps.libValue === 'oxford' && ps.current && ps.current.indexOf('Bài 12') >= 0, ps);
      // KO recordAnswer: exactly one call per correct KO answer.
      await C.eval(`(function(){
        window.__T40C = { calls: [] };
        var orig = window.__v27.recordAnswer;
        window.__T40C.orig = orig;
        window.__v27.recordAnswer = function(lang,id,ok,mode){ window.__T40C.calls.push([lang,id,ok,mode]); try{ return orig(lang,id,ok,mode); }catch(e){} };
      })()`);
      const spy = await C.eval(`(function(){ try{
        window.__v18.fight('v10_slime','ko');
        var F=window.__v18._test.F();
        var kid=F&&F.cur&&F.cur.k?F.cur.k.id:null;
        window.__v18._test.pickCorrect();
        return {kid:kid, calls:window.__T40C.calls.filter(function(c){ return c[1]===kid; })};
      }catch(e){ return 'ERR:'+e; } })()`);
      r.spy = spy;
      v('I6 KO correct: recordAnswer called exactly once (ko, true, boss18)', spy.calls.length === 1 && spy.calls[0][0] === 'ko' && spy.calls[0][2] === true && spy.calls[0][3] === 'boss18', spy);
      await C.eval(`(function(){ try{ window.__v18._test.close(); }catch(e){} })()`);
      // Pet Hub smoke.
      const pet = await C.eval(`(function(){ try{
        window.__v23.openHub();
        var h=document.getElementById('v23hub');
        return {open: !!h, html: h?String(h.innerHTML||'').slice(0,150):null};
      }catch(e){ return 'ERR:'+e; } })()`);
      r.pet = pet;
      v('I7 Pet Hub opens without error', pet.open === true, pet);
      await shot('v40c-I-pethub');
      await C.eval(`(function(){ try{ window.__v15.clearScope(); }catch(e){} })()`);
      r.console = delta();
      v('I8 no console errors/warnings/dialogs in this gate', r.console.errors === 0 && r.console.warns === 0 && r.console.dialogs === 0, r.console);
      return r;
    });

    // ============ console summary ============
    const total = { errors: C.consoleErrors.length, warns: C.consoleWarns.length, dialogs: C.dialogs.length };
    results.consoleSummary = total;
    results.failedVerdicts = failedVerdicts;
    note('\nconsole summary:', total);
    note('consoleErrors:', C.consoleErrors.slice(0, 5));
    note('consoleWarns:', C.consoleWarns.slice(0, 5));
    note('dialogs:', C.dialogs.slice(0, 5));
    const allStepsOk = Object.entries(results).every(function ([k, val]) { return k === 'boot' || k === 'consoleSummary' || k === 'failedVerdicts' || !val || !val.error; });
    const ok = allOk && allStepsOk && total.errors === 0 && total.warns === 0 && total.dialogs === 0;
    note(`\nverify-v40c: steps ${Object.keys(results).length}, verdicts failed: ${failedVerdicts.length} ${JSON.stringify(failedVerdicts)}, allOk=${ok}`);
    saveResults();
    if (C) C.close();
    if (chromeProc) chromeProc.kill();
    if (httpProc) httpProc.kill();
    process.exit(ok ? 0 : 1);
  } catch (e) {
    note('verify-v40c crashed:', String(e).slice(0, 800));
    saveResults();
    try { if (C) C.close(); } catch (_) {}
    try { if (chromeProc) chromeProc.kill(); } catch (_) {}
    try { if (httpProc) httpProc.kill(); } catch (_) {}
    process.exit(2);
  }
}
main();
