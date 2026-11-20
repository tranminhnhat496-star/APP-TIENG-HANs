// verify-v39c.js - V18.4 KOREAN BOSSES Chrome verification driver.
// Real Chrome 157 via CDP, HTTP 8957 / CDP 9357, scratch profile.
// Modelled on tools/v39/repro-v39.js (same CDP class, ensureHttp/
// ensureChrome, shot/step/verdict helpers, seedCards). Exit 0 = driver
// completed (verdicts are in the results JSON + stdout; a FAIL verdict
// does not crash the driver). Writes results to
// tools/v39/logs/v39c-results.json after EVERY step. Screenshots in
// tools/v39/shots/v39c-*.
// Gates:
//   V39-A pick screen for every sampled V18 boss (Challenge slime +
//         grammar dragon, Elemental unicorn, Legendary firedragon) +
//         "Anh / Hàn (chọn trước trận)" card line.
//   V39-B KO fight asks Korean questions only (Hangul qword + 🇰🇷 header,
//         3/3 unicorn + dragon grammar→mc).
//   V39-C KO win recorded flat (unicorn first win +90 XP/+2 gems/stone
//         once; replay wins 2, +10 XP only, no second stone/gems).
//   V39-D 5-card KO fight: V18 shows the <8 banner + English fallback;
//         V19 parity.
//   V39-E KO answers land in en27().ko (live AND after reload);
//         en27().en unpolluted.
//   V39-F EN fights unchanged (English questions, no banner; answers in
//         en27().en only).
//   V39-G Chrono/Skyroot KO-overlay boss fights run in Korean.
//   V39-H V18.3 regression (picker lists all 7 sets, Library + Pet Hub).
//   V39-I 360px viewport: no horizontal overflow, pick buttons >=44px.
//   0 console errors/warnings/dialogs across the whole run.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9357;
const HTTPPORT = 8957;
const POLICY = '/tmp/webgl-policy.txt';
const URL = 'http://127.0.0.1:8957/index.html';
const DIR = '/home/hatch/workspace/v7build/tools/v39';
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
function saveResults() { writeSmall(path.join(DIR, 'logs', 'v39c-results.json'), JSON.stringify(results, null, 2)); }
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
    '--user-data-dir=/tmp/chrome-v39c-prof', `--remote-debugging-port=${PORT}`,
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
  // V36 precedent (freshSeed): seed a guest session so the V21 welcome
  // overlay does not cover the hub in screenshots.
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
const HANGUL = /[\uAC00-\uD7A3]/;
// 5 valid KO cards (shape matches toCards output: id,d,h,m,p,e,g,box,due).
const FIVE_KO = [
  { id: 'ko_r1', d: '', h: '사과', m: 'quả táo', p: 'sagwa', e: '사과를 먹어요.', g: '', box: 0, due: 0 },
  { id: 'ko_r2', d: '', h: '학교', m: 'trường học', p: 'hakgyo', e: '학교에 가요.', g: '', box: 0, due: 0 },
  { id: 'ko_r3', d: '', h: '물', m: 'nước', p: 'mul', e: '물을 마셔요.', g: '', box: 0, due: 0 },
  { id: 'ko_r4', d: '', h: '책', m: 'sách', p: 'chaek', e: '책을 읽어요.', g: '', box: 0, due: 0 },
  { id: 'ko_r5', d: '', h: '집', m: 'nhà', p: 'jip', e: '집에 가요.', g: '', box: 0, due: 0 },
];
const TWENTY_KO = FIVE_KO.concat([
  { id: 'ko_r6', d: '', h: '친구', m: 'bạn bè', p: 'chingu', e: '친구를 만나요.', g: '', box: 0, due: 0 },
  { id: 'ko_r7', d: '', h: '선생님', m: 'giáo viên', p: 'seonsaengnim', e: '선생님이에요.', g: '', box: 0, due: 0 },
  { id: 'ko_r8', d: '', h: '밥', m: 'cơm', p: 'bap', e: '밥을 먹어요.', g: '', box: 0, due: 0 },
  { id: 'ko_r9', d: '', h: '차', m: 'trà', p: 'cha', e: '차를 마셔요.', g: '', box: 0, due: 0 },
  { id: 'ko_r10', d: '', h: '꽃', m: 'hoa', p: 'kkot', e: '꽃이 예뻐요.', g: '', box: 0, due: 0 },
  { id: 'ko_r11', d: '', h: '강아지', m: 'chó con', p: 'gangaji', e: '강아지가 귀여워요.', g: '', box: 0, due: 0 },
  { id: 'ko_r12', d: '', h: '고양이', m: 'mèo', p: 'goyangi', e: '고양이가 자요.', g: '', box: 0, due: 0 },
  { id: 'ko_r13', d: '', h: '하늘', m: 'bầu trời', p: 'haneul', e: '하늘이 파래요.', g: '', box: 0, due: 0 },
  { id: 'ko_r14', d: '', h: '바다', m: 'biển', p: 'bada', e: '바다가 넓어요.', g: '', box: 0, due: 0 },
  { id: 'ko_r15', d: '', h: '산', m: 'núi', p: 'san', e: '산에 가요.', g: '', box: 0, due: 0 },
  { id: 'ko_r16', d: '', h: '달', m: 'mặt trăng', p: 'dal', e: '달이 떠요.', g: '', box: 0, due: 0 },
  { id: 'ko_r17', d: '', h: '별', m: 'ngôi sao', p: 'byeol', e: '별이 빛나요.', g: '', box: 0, due: 0 },
  { id: 'ko_r18', d: '', h: '해', m: 'mặt trời', p: 'hae', e: '해가 떠요.', g: '', box: 0, due: 0 },
  { id: 'ko_r19', d: '', h: '비', m: 'mưa', p: 'bi', e: '비가 와요.', g: '', box: 0, due: 0 },
  { id: 'ko_r20', d: '', h: '눈', m: 'tuyết', p: 'nun', e: '눈이 와요.', g: '', box: 0, due: 0 },
]);

async function seedCards(cards) {
  await C.eval(`(function(){ try{ S.cards = ${JSON.stringify(cards)}; save(); return S.cards.length; }catch(e){ return 'ERR:'+e; } })()`);
  await sleep(1500); // V20 debounced flush (0.8s)
  await C.eval('location.reload()');
  await sleep(2500);
  return await C.eval(`(function(){ try{ return {n: S.cards.length, ko: S.cards.filter(function(c){return c&&c.h&&c.m}).length}; }catch(e){ return 'ERR:'+e; } })()`);
}

async function main() {
  try {
    // Fresh profile every run: run 2 reused run 1's profile, so its save
    // was dirty (unicorn already won -> V39-C first-win assertions fail
    // on a non-first win). Only remove the profile when no Chrome is
    // alive on the port (a live Chrome owns its profile dir).
    let chromeAlive = false;
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); chromeAlive = r.ok; } catch (e) {}
    if (!chromeAlive) { try { execSync('rm -rf /tmp/chrome-v39c-prof'); note('fresh profile: removed old chrome-v39c-prof'); } catch (e) {} }
    await openPage();
    const boot = await C.eval(`(function(){ return { S: typeof S, save: typeof save, v15: !!window.__v15, v18: !!window.__v18, v19: !!window.__v19, v27: !!window.__v27, v33: !!window.__v33, v35: !!window.__v35, v39: !!window.__v39, v39ver: (function(){ try{ return window.__v39.version; }catch(e){ return 'ERR:'+e; } })(), title: document.title, xp0: (function(){ try{ return S.xp||0; }catch(e){ return 'ERR:'+e; } })(), gems0: (function(){ try{ return (S.v7&&S.v7.gems)||0; }catch(e){ return 'ERR:'+e; } })(), koCount19: (function(){ try{ return window.__v19._test.koCount(); }catch(e){ return 'ERR:'+e; } })(), cards: (function(){ try{ return S.cards.length; }catch(e){ return 'ERR:'+e; } })() }; })()`);
    note('boot:', boot);
    results.boot = boot;
    saveResults();

    // Helpers shared by the gates.
    async function openBossesHub() {
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('bosses'); }catch(e){} })()`);
      await sleep(1000);
    }
    async function readFight18() {
      return await C.eval(`(function(){ try{
        var F=window.__v18._test.F(); if(!F) return {started:false};
        var q=document.querySelector('#v18fight .v18qword');
        var hearts=document.querySelector('#v18fight .v18hearts');
        var banner=document.querySelector('#v18fight .v18banner');
        return {started:true, lang:F.lang, qmode:F.qmode, curKO: !!(F.cur&&F.cur.ko), curW: !!(F.cur&&F.cur.w),
          qword:q?(q.textContent||'').trim():null, hearts:hearts?(hearts.textContent||'').trim():null,
          banner:F.banner, bannerEl: !!banner, bannerText: banner?(banner.textContent||'').slice(0,100):null,
          brk:F.brk, weakKind:F.weak?F.weak.kind:null, over:F.over, hp:F.hp, maxHp:F.maxHp};
      }catch(e){ return 'ERR:'+e; } })()`);
    }
    async function readFight19() {
      return await C.eval(`(function(){ try{
        var F=window.__v19._test.F(); if(!F) return {started:false};
        var q=document.querySelector('#v19fight .v19qword');
        var hearts=document.querySelector('#v19fight .v19hearts');
        var banner=document.querySelector('#v19fight .v19banner');
        return {started:true, lang:F.lang, qmode:F.qmode, curKO: !!(F.cur&&F.cur.ko), curW: !!(F.cur&&F.cur.w),
          qword:q?(q.textContent||'').trim():null, hearts:hearts?(hearts.textContent||'').trim():null,
          banner:F.banner, bannerEl: !!banner, bannerText: banner?(banner.textContent||'').slice(0,100):null,
          over:F.over, hp:F.hp, maxHp:F.maxHp, ultActive: !!F.ultActive};
      }catch(e){ return 'ERR:'+e; } })()`);
    }
    async function koQuestions18(n) {
      // Answer n KO questions correctly (pickCorrect + next), collecting the fought card ids.
      const fought = [];
      for (let i = 0; i < n; i++) {
        const one = await C.eval(`(function(){ try{
          var F=window.__v18._test.F(); if(!F||F.over) return {done:true};
          if(!(F.cur&&F.cur.ko)) return {ko:false, qmode:F.qmode, qword:(document.querySelector('#v18fight .v18qword')||{}).textContent};
          var kid=F.cur.k.id;
          var ok=window.__v18._test.pickCorrect();
          return {ko:true, kid:kid, picked:ok};
        }catch(e){ return 'ERR:'+e; } })()`);
        if (!one || one.done || !one.ko) { fought.push(one); break; }
        fought.push(one);
        await sleep(600);
        await C.eval(`(function(){ try{ window.__v18.next(); }catch(e){} })()`);
        await sleep(700);
      }
      return fought;
    }
    async function koQuestions19(n) {
      const fought = [];
      for (let i = 0; i < n; i++) {
        const one = await C.eval(`(function(){ try{
          var F=window.__v19._test.F(); if(!F||F.over) return {done:true};
          if(!(F.cur&&F.cur.ko)) return {ko:false, qmode:F.qmode};
          var kid=F.cur.k.id;
          var ok=window.__v19._test.pickCorrect();
          return {ko:true, kid:kid, picked:ok};
        }catch(e){ return 'ERR:'+e; } })()`);
        if (!one || one.done || !one.ko) { fought.push(one); break; }
        fought.push(one);
        await sleep(600);
        await C.eval(`(function(){ try{ window.__v19.next(); }catch(e){} })()`);
        await sleep(700);
      }
      return fought;
    }

    // ============ V39-A pick screen for every sampled V18 boss ============
    await step('V39-A-pick-screen', async () => {
      const r = {};
      r.v39ver = boot.v39ver;
      r.xp0 = boot.xp0; r.gems0 = boot.gems0;
      // Seed 5 Challenge wins FIRST: the Elemental arena needs 5 total
      // wins to open, and the grammar dragon needs the goblin win.
      // (Unicorn + firedragon stay unwon for the V39-C first-win test.)
      await C.eval(`(function(){ try{ var e=window.__v18.en18(); window.__V18_BOSSES.en.slice(0,5).forEach(function(b){ e.bosses[b.id]={win:1,wins:1,at:Date.now()}; }); save(); }catch(e){} })()`);
      await sleep(1000);
      await openBossesHub();
      // Slime (Challenge, mc): no lang -> pick screen, no fight started.
      await C.eval(`(function(){ try{ window.__v18.openArena('en'); window.__v18.fight('v10_slime'); }catch(e){} })()`);
      await sleep(900);
      r.slime = await C.eval(`(function(){ var h=document.querySelector('#v18fight'); if(!h) return {present:false}; var t=h.innerText||''; return {present:true, hasKoBtn: t.indexOf('🇰🇷 Tiếng Hàn')>=0, hasEnBtn: t.indexOf('🇬🇧 Tiếng Anh')>=0, koOnclick: (h.innerHTML||'').indexOf("__v18.fight('v10_slime','ko')")>=0, Fnull: window.__v18._test.F()===null}; })()`);
      await shot('v39c-a-slime-pick');
      await C.eval(`(function(){ try{ window.__v15.tab('collection'); window.__v18.collDetail('v10_slime'); }catch(e){} })()`);
      await sleep(600);
      r.slimeCard = await C.eval(`(function(){ var h=document.querySelector('#v18colldetail'); if(!h) return {present:false}; var t=h.innerText||''; return {present:true, both: t.indexOf('Anh / Hàn (chọn trước trận)')>=0}; })()`);
      // Dragon (Challenge, grammar): seed the two previous wins to unlock it.
      await C.eval(`(function(){ try{ var e=window.__v18.en18(); e.bosses['v10_slime']={win:1,wins:1,at:Date.now()}; e.bosses['v10_goblin']={win:1,wins:1,at:Date.now()}; save(); }catch(e){} })()`);
      await sleep(1000);
      await C.eval(`(function(){ try{ window.__v18.openArena('en'); window.__v18.fight('v10_dragon'); }catch(e){} })()`);
      await sleep(900);
      r.dragon = await C.eval(`(function(){ var h=document.querySelector('#v18fight'); if(!h) return {present:false}; var t=h.innerText||''; return {present:true, hasKoBtn: t.indexOf('🇰🇷 Tiếng Hàn')>=0, Fnull: window.__v18._test.F()===null}; })()`);
      await shot('v39c-a-dragon-pick');
      // Unicorn (Elemental): pick screen.
      await C.eval(`(function(){ try{ window.__v18.openArena('el'); window.__v18.fight('v10_unicorn'); }catch(e){} })()`);
      await sleep(900);
      r.unicorn = await C.eval(`(function(){ var h=document.querySelector('#v18fight'); if(!h) return {present:false}; var t=h.innerText||''; return {present:true, hasKoBtn: t.indexOf('🇰🇷 Tiếng Hàn')>=0, Fnull: window.__v18._test.F()===null}; })()`);
      // Legendary: seed 5 Elemental wins (NOT unicorn — it stays unwon for the V39-C first-win test).
      await C.eval(`(function(){ try{ var e=window.__v18.en18(); ['v10_icedragon','v10_panda','v10_magma','v10_fox','v10_octopus'].forEach(function(id){ e.bosses[id]={win:1,wins:1,at:Date.now()}; }); save(); }catch(e){} })()`);
      await sleep(1000);
      r.legId = await C.eval(`(function(){ try{ return window.__V18_BOSSES.leg[0].id; }catch(e){ return 'ERR:'+e; } })()`);
      r.legUnlocked = await C.eval(`(function(){ try{ return window.__v18.bossUnlocked(window.__V18_BOSSES.leg[0]); }catch(e){ return 'ERR:'+e; } })()`);
      await C.eval(`(function(){ try{ window.__v18.openArena('leg'); window.__v18.fight('${'v10_firedragon'}'); }catch(e){} })()`);
      await sleep(900);
      r.leg = await C.eval(`(function(){ var h=document.querySelector('#v18fight'); if(!h) return {present:false}; var t=h.innerText||''; return {present:true, hasKoBtn: t.indexOf('🇰🇷 Tiếng Hàn')>=0, Fnull: window.__v18._test.F()===null}; })()`);
      await shot('v39c-a-legendary-pick');
      await C.eval(`(function(){ try{ window.__v15.tab('collection'); window.__v18.collDetail('${'v10_firedragon'}'); }catch(e){} })()`);
      await sleep(600);
      r.legCard = await C.eval(`(function(){ var h=document.querySelector('#v18colldetail'); if(!h) return {present:false}; var t=h.innerText||''; return {present:true, both: t.indexOf('Anh / Hàn (chọn trước trận)')>=0}; })()`);
      await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`);
      await sleep(400);
      r.verdict = verdict('V39-A every sampled boss shows the EN/KO pick screen + "Anh / Hàn" card line',
        r.v39ver === '18.4.0' && r.slime.hasKoBtn && r.slime.hasEnBtn && r.slime.koOnclick && r.slime.Fnull &&
        r.slimeCard.both && r.dragon.hasKoBtn && r.dragon.Fnull &&
        r.unicorn.hasKoBtn && r.unicorn.Fnull &&
        r.legUnlocked === true && r.leg.hasKoBtn && r.leg.Fnull && r.legCard.both,
        { v39ver: r.v39ver, xp0: r.xp0, gems0: r.gems0, slime: r.slime, slimeCard: r.slimeCard, dragon: r.dragon, unicorn: r.unicorn, legUnlocked: r.legUnlocked, leg: r.leg, legCard: r.legCard });
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ V39-B KO fight asks Korean questions only (live DOM) ============
    await step('V39-B-ko-questions-korean-only', async () => {
      const r = {};
      await openBossesHub();
      // Unicorn KO fight: 3 questions, every qword Hangul + 🇰🇷 header.
      await C.eval(`(function(){ try{ window.__v18.fight('v10_unicorn','ko'); }catch(e){} })()`);
      await sleep(1000);
      r.qs = [];
      for (let i = 0; i < 3; i++) {
        const f = await readFight18();
        r.qs.push({ qword: f.qword, hangul: f.qword ? HANGUL.test(f.qword) : false, heartsKo: (f.hearts || '').indexOf('🇰🇷 Tiếng Hàn') >= 0, curKO: f.curKO, banner: f.banner });
        if (i < 2) {
          await C.eval(`(function(){ try{ window.__v18._test.pickCorrect(); }catch(e){} })()`);
          await sleep(600);
          await C.eval(`(function(){ try{ window.__v18.next(); }catch(e){} })()`);
          await sleep(700);
        }
      }
      await shot('v39c-b-unicorn-ko-q');
      r.allHangul = r.qs.every(q => q.hangul === true && q.curKO === true && q.heartsKo === true && q.banner === null);
      // Grammar-mode dragon KO fight: grammar maps to KO mc, qword Hangul.
      await C.eval(`(function(){ try{ window.__v18.fight('v10_dragon','ko'); }catch(e){} })()`);
      await sleep(1000);
      r.dragon = await readFight18();
      r.dragonHangul = r.dragon.qword ? HANGUL.test(r.dragon.qword) : false;
      await shot('v39c-b-dragon-ko-q');
      await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`);
      await sleep(400);
      r.verdict = verdict('V39-B KO fights ask Korean questions only (Hangul qword + 🇰🇷 header, 3/3 unicorn + dragon grammar→mc)',
        r.allHangul && r.dragon.lang === 'ko' && r.dragon.qmode === 'mc' && r.dragon.curKO === true && r.dragonHangul === true,
        { qs: r.qs, dragon: r.dragon, dragonHangul: r.dragonHangul });
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ V39-C KO win recorded (flat win + koStats + reward once) ============
    await step('V39-C-ko-win-recorded', async () => {
      const r = {};
      r.before = await C.eval(`(function(){ try{ var e=window.__v18.en18(); return {xp:(S.xp||0), gems:(S.v7.gems||0), won:!!(e.bosses['v10_unicorn']&&e.bosses['v10_unicorn'].win), koRight:e.koStats.right, stones:(e.stones||{})['Đá Ánh Sáng']||0}; }catch(e){ return 'ERR:'+e; } })()`);
      await openBossesHub();
      await C.eval(`(function(){ try{ window.__v18.fight('v10_unicorn','ko'); }catch(e){} })()`);
      await sleep(1000);
      // Loop correct answers until the fight is won (unicorn HP 130, ~13-21 dmg/hit + BREAK bonus).
      r.n = 0; r.pickFail = false;
      for (let guard = 0; guard < 25; guard++) {
        const f = await readFight18();
        if (!f.started || f.over) break;
        const ok = await C.eval(`(function(){ try{ return window.__v18._test.pickCorrect(); }catch(e){ return 'ERR:'+e; } })()`);
        if (ok !== true) { r.pickFail = true; break; }
        r.n++;
        await sleep(600);
        const f2 = await readFight18();
        if (f2.over) break;
        await C.eval(`(function(){ try{ window.__v18.next(); }catch(e){} })()`);
        await sleep(700);
      }
      await sleep(1200); // let the debounced save flush
      r.fight = await readFight18();
      await shot('v39c-c-unicorn-ko-win');
      r.after = await C.eval(`(function(){ try{ var e=window.__v18.en18(); var rec=e.bosses['v10_unicorn']||{}; return {xp:(S.xp||0), gems:(S.v7.gems||0), win:!!rec.win, wins:rec.wins||0, item:rec.item||null, flat:!('en' in rec)&&!('ko' in rec), koRight:e.koStats.right, stones:(e.stones||{})['Đá Ánh Sáng']||0, firstWin: window.__v18._test.F()?window.__v18._test.F().firstWin:null}; }catch(e){ return 'ERR:'+e; } })()`);
      r.firstWinOk = r.fight.over === 'win' && r.after.win === true && r.after.wins === 1 && r.after.flat === true &&
        r.after.item === 'Unicorn Horn' && r.after.stones === 1 && (r.after.gems - r.before.gems) === 2 && r.after.firstWin === true &&
        r.after.koRight > r.before.koRight && (r.after.xp - r.before.xp) >= 90;
      // Replay win: wins 2, +10 XP only, NO second stone/gems.
      r.before2 = await C.eval(`(function(){ try{ var e=window.__v18.en18(); return {xp:(S.xp||0), gems:(S.v7.gems||0), stones:(e.stones||{})['Đá Ánh Sáng']||0}; }catch(e){ return 'ERR:'+e; } })()`);
      await C.eval(`(function(){ try{ window.__v18.fight('v10_unicorn','ko'); }catch(e){} })()`);
      await sleep(1000);
      r.n2 = 0;
      for (let guard = 0; guard < 25; guard++) {
        const f = await readFight18();
        if (!f.started || f.over) break;
        const ok = await C.eval(`(function(){ try{ return window.__v18._test.pickCorrect(); }catch(e){ return 'ERR:'+e; } })()`);
        if (ok !== true) break;
        r.n2++;
        await sleep(600);
        const f2 = await readFight18();
        if (f2.over) break;
        await C.eval(`(function(){ try{ window.__v18.next(); }catch(e){} })()`);
        await sleep(700);
      }
      await sleep(1200);
      r.after2 = await C.eval(`(function(){ try{ var e=window.__v18.en18(); var rec=e.bosses['v10_unicorn']||{}; return {xp:(S.xp||0), gems:(S.v7.gems||0), wins:rec.wins||0, stones:(e.stones||{})['Đá Ánh Sáng']||0}; }catch(e){ return 'ERR:'+e; } })()`);
      r.replayOk = r.after2.wins === 2 && r.after2.stones === 1 && (r.after2.gems - r.before2.gems) === 0;
      await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`);
      await sleep(400);
      r.verdict = verdict('V39-C KO win recorded flat (+90 XP/+2 gems/stone once) and replay pays nothing extra',
        r.firstWinOk === true && r.replayOk === true,
        { n: r.n, n2: r.n2, before: r.before, after: r.after, before2: r.before2, after2: r.after2, fightOver: r.fight.over });
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ V39-D 5-card KO fight: <8 banner + English fallback (V18 + V19) ============
    await step('V39-D-five-card-banner', async () => {
      const r = {};
      r.seed = await seedCards(FIVE_KO);
      r.koCount = await C.eval(`(function(){ try{ return window.__v19._test.koCount(); }catch(e){ return 'ERR:'+e; } })()`);
      await openBossesHub();
      await C.eval(`(function(){ try{ window.__v18.fight('v10_unicorn','ko'); }catch(e){} })()`);
      await sleep(1000);
      r.f18 = await readFight18();
      await shot('v39c-d-v18-ko-5cards');
      await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`);
      await sleep(400);
      await C.eval(`(function(){ try{ window.__v19.openMapFor('ko'); }catch(e){} })()`);
      await sleep(800);
      await C.eval(`(function(){ try{ window.__v19.fight('v11_fireking'); }catch(e){} })()`);
      await sleep(1000);
      r.f19 = await readFight19();
      await shot('v39c-d-v19-ko-5cards');
      await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`);
      await sleep(400);
      r.v18ok = r.f18.started === true && r.f18.lang === 'ko' && r.f18.banner !== null && String(r.f18.banner).indexOf('5/8') >= 0 &&
        r.f18.bannerEl === true && r.f18.curKO === false && r.f18.curW === true && !(r.f18.qword && HANGUL.test(r.f18.qword));
      r.v19ok = r.f19.started === true && r.f19.lang === 'ko' && r.f19.banner !== null && String(r.f19.banner).indexOf('5/8') >= 0 &&
        r.f19.bannerEl === true && r.f19.curKO === false;
      r.verdict = verdict('V39-D 5-card KO fight: V18 shows the <8 banner + English fallback; V19 parity',
        r.v18ok === true && r.v19ok === true, { f18: r.f18, f19: r.f19 });
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ V39-E KO answers appear in Smart Learning ============
    await step('V39-E-ko-answers-in-smart', async () => {
      const r = {};
      r.seed = await seedCards(TWENTY_KO);
      r.koCount = await C.eval(`(function(){ try{ return window.__v19._test.koCount(); }catch(e){ return 'ERR:'+e; } })()`);
      // V19 KO fight: 3 correct KO answers.
      await C.eval(`(function(){ try{ window.__v19.openMapFor('ko'); }catch(e){} })()`);
      await sleep(800);
      await C.eval(`(function(){ try{ window.__v19.fight('v11_fireking'); }catch(e){} })()`);
      await sleep(1000);
      r.fought19 = await koQuestions19(3);
      await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`);
      await sleep(400);
      // V18 KO fight: 2 correct KO answers.
      await openBossesHub();
      await C.eval(`(function(){ try{ window.__v18.fight('v10_unicorn','ko'); }catch(e){} })()`);
      await sleep(1000);
      r.fought18 = await koQuestions18(2);
      await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`);
      await sleep(1500); // let the debounced save flush, then reload to prove persistence
      r.smartLive = await C.eval(`(function(){ try{
        var d=window.__v27.en27(); var ko=d.ko||{}; var en=d.en||{};
        var ids=${JSON.stringify(r.fought19.concat(r.fought18).filter(x => x && x.kid).map(x => x.kid))};
        var seen={}; ids.forEach(function(id){ seen[id]={right:(ko.right||{})[id], last:!!(ko.last||{})[id]}; });
        var enPolluted=ids.some(function(id){ return (en.last||{})[id]!==undefined || (en.cr||{})[id]!==undefined || (en.cw||{})[id]!==undefined; });
        return {ids:ids, seen:seen, enPolluted:enPolluted};
      }catch(e){ return 'ERR:'+e; } })()`);
      await C.eval('location.reload()');
      await sleep(2500);
      r.smartAfterReload = await C.eval(`(function(){ try{
        var d=window.__v27.en27(); var ko=d.ko||{};
        var ids=${JSON.stringify(r.fought19.concat(r.fought18).filter(x => x && x.kid).map(x => x.kid))};
        var seen={}; ids.forEach(function(id){ seen[id]={right:(ko.right||{})[id]}; });
        return {ids:ids, seen:seen};
      }catch(e){ return 'ERR:'+e; } })()`);
      await shot('v39c-e-smart-ko');
      const ids = (r.smartLive && r.smartLive.ids) || [];
      const liveOk = ids.length >= 4 && ids.every(function (id) { const s = r.smartLive.seen[id]; return s.right >= 1 && s.last === true; }) && r.smartLive.enPolluted === false;
      const persistOk = (r.smartAfterReload.ids || []).every(function (id) { return (r.smartAfterReload.seen[id] || {}).right >= 1; });
      r.verdict = verdict('V39-E KO answers land in en27().ko (right+last, live AND after reload); en27().en unpolluted',
        liveOk === true && persistOk === true, { fought19: r.fought19, fought18: r.fought18, smartLive: r.smartLive, smartAfterReload: r.smartAfterReload });
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ V39-F EN fights unchanged ============
    await step('V39-F-en-fights-unchanged', async () => {
      const r = {};
      await openBossesHub();
      await C.eval(`(function(){ try{ window.__v18.fight('v10_slime','en'); }catch(e){} })()`);
      await sleep(1000);
      r.q1 = await readFight18();
      const wids = [];
      for (let i = 0; i < 2; i++) {
        const f = await readFight18();
        if (f.started && f.curW) {
          const wid = await C.eval(`(function(){ try{ var F=window.__v18._test.F(); return F&&F.cur&&F.cur.w?F.cur.w.id:null; }catch(e){ return 'ERR:'+e; } })()`);
          wids.push(wid);
        }
        await C.eval(`(function(){ try{ window.__v18._test.pickCorrect(); }catch(e){} })()`);
        await sleep(600);
        if (i < 1) { await C.eval(`(function(){ try{ window.__v18.next(); }catch(e){} })()`); await sleep(700); }
      }
      await sleep(1200);
      r.enRec = await C.eval(`(function(){ try{
        var d=window.__v27.en27(); var en=d.en||{}; var ko=d.ko||{};
        var seen={}; ${JSON.stringify(wids)}.forEach(function(id){ seen[id]={cr:(en.cr||{})[id], last:!!(en.last||{})[id], koHas:!!(ko.right||{})[id]||!!(ko.last||{})[id]}; });
        return {wids:${JSON.stringify(wids)}, seen:seen};
      }catch(e){ return 'ERR:'+e; } })()`);
      await shot('v39c-f-en-fight');
      await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`);
      await sleep(400);
      const enOk = r.q1.started === true && r.q1.lang === 'en' && r.q1.curW === true && r.q1.curKO === false &&
        !(r.q1.qword && HANGUL.test(r.q1.qword)) && r.q1.banner === null;
      const recOk = wids.length === 2 && wids.every(function (id) { const s = r.enRec.seen[id]; return s && s.cr >= 1 && s.last === true && s.koHas === false; });
      r.verdict = verdict('V39-F EN fight unchanged (English questions, no banner; answers in en27().en only)',
        enOk === true && recOk === true, { q1: r.q1, enRec: r.enRec });
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ V39-G Chrono/Skyroot KO-overlay fights use Korean ============
    await step('V39-G-overlay-ko-fights', async () => {
      const r = {};
      // Seed the gates: GEAR GOLEM ko win (Skyroot) + 70 total wins (Chrono).
      await C.eval(`(function(){ try{
        var e19=window.__v19.en19();
        e19.bosses['v17_geargolem']=e19.bosses['v17_geargolem']||{};
        e19.bosses['v17_geargolem'].ko={win:1,wins:1,at:Date.now()};
        var e18=window.__v18.en18();
        window.__V18_BOSSES.en.concat(window.__V18_BOSSES.el,window.__V18_BOSSES.leg,window.__V18_BOSSES.old).forEach(function(b){ e18.bosses[b.id]={win:1,wins:1,at:Date.now()}; });
        window.__V19_DATA.bosses.forEach(function(b){ e19.bosses[b.id]=e19.bosses[b.id]||{}; e19.bosses[b.id].en={win:1,wins:1,at:Date.now()}; });
        save();
      }catch(e){} })()`);
      await sleep(1200);
      r.gates = await C.eval(`(function(){ try{ return {chrono: window.__v33.correctedWinCount(), chronoOpen: window.__v33.gateOpen(), skyKo: window.__v35.gateOpen('ko')}; }catch(e){ return 'ERR:'+e; } })()`);
      // Skyroot KO overlay.
      await C.eval(`(function(){ try{ window.__v35.openSkyroot('ko'); }catch(e){} })()`);
      await sleep(900);
      r.skyId = await C.eval(`(function(){ try{ return window.__v35._test.SKYROOT_IDS[0]; }catch(e){ return 'ERR:'+e; } })()`);
      await C.eval('(function(){ try{ window.__v35.fightBoss(' + JSON.stringify(r.skyId) + '); }catch(e){} })()');
      await sleep(1200);
      r.sky = await readFight19();
      r.skyHangul = r.sky.qword ? HANGUL.test(r.sky.qword) : false;
      await shot('v39c-g-skyroot-ko-fight');
      await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`);
      await sleep(400);
      // Chrono KO overlay.
      await C.eval(`(function(){ try{ window.__v33.openChrono('ko'); }catch(e){} })()`);
      await sleep(900);
      r.chrId = await C.eval(`(function(){ try{ return window.__v33._test.CHRONO_IDS[0]; }catch(e){ return 'ERR:'+e; } })()`);
      await C.eval('(function(){ try{ window.__v33.fightBoss(' + JSON.stringify(r.chrId) + '); }catch(e){} })()');
      await sleep(1200);
      r.chr = await readFight19();
      r.chrHangul = r.chr.qword ? HANGUL.test(r.chr.qword) : false;
      await shot('v39c-g-chrono-ko-fight');
      await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`);
      await sleep(400);
      r.verdict = verdict('V39-G KO-overlay boss fights run in Korean (Skyroot + Chrono)',
        r.gates.chrono >= 70 && r.gates.chronoOpen === true && r.gates.skyKo === true &&
        r.sky.lang === 'ko' && r.sky.curKO === true && r.skyHangul === true &&
        r.chr.lang === 'ko' && r.chr.curKO === true && r.chrHangul === true,
        { gates: r.gates, skyId: r.skyId, sky: r.sky, skyHangul: r.skyHangul, chrId: r.chrId, chr: r.chr, chrHangul: r.chrHangul });
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ V39-H V18.3 regression spot-check ============
    await step('V39-H-regression', async () => {
      const r = {};
      await openBossesHub();
      await C.eval(`(function(){ try{ window.__v18.openArena('en'); }catch(e){} })()`);
      await sleep(900);
      r.picker = await C.eval(`(function(){ var h=document.getElementById('v15body'); if(!h) return {present:false}; var t=h.innerHTML||''; var opts=['value=""','value="a1a2"','value="oxford"','value="chrono"','value="skyroot"','value="all"','value="units"']; return {present:true, libs: opts.map(function(o){ return t.indexOf(o)>=0; })}; })()`);
      await C.eval(`(function(){ try{ window.__v15.openHub('library'); }catch(e){} })()`);
      await sleep(1200);
      r.library = await C.eval(`(function(){ var h=document.getElementById('v15body'); if(!h) return {present:false}; var t=h.innerText||''; return {present:true, hasOxford: t.indexOf('Oxford')>=0, hasA1A2: t.indexOf('A1')>=0, len: t.length}; })()`);
      await shot('v39c-h-library');
      await C.eval(`(function(){ try{ window.__v23.openHub(); }catch(e){} })()`);
      await sleep(1200);
      r.pets = await C.eval(`(function(){ var h=document.getElementById('v23hub'); if(!h) return {present:false}; var t=h.innerText||''; return {present:true, len: t.length, hasTabs: t.indexOf('Thú')>=0 || t.indexOf('Pet')>=0 || (h.innerHTML||'').indexOf('v23tab')>=0}; })()`);
      await shot('v39c-h-pethub');
      await C.eval(`(function(){ try{ window.__v23.closeHub(); }catch(e){} })()`);
      await sleep(400);
      r.verdict = verdict('V39-H regression: picker lists all 7 sets, Library + Pet Hub open',
        r.picker.libs.every(Boolean) && r.library.hasOxford === true && r.library.hasA1A2 === true && r.pets.present === true && r.pets.len > 100,
        { picker: r.picker, library: r.library, pets: r.pets });
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ V39-I 360px viewport ============
    await step('V39-I-viewport-360', async () => {
      const r = {};
      await C.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
      await sleep(800);
      await openBossesHub();
      await C.eval(`(function(){ try{ window.__v18.openArena('en'); window.__v18.fight('v10_slime'); }catch(e){} })()`);
      await sleep(900);
      r.metrics = await C.eval(`(function(){ try{
        var doc=document.documentElement;
        var btns=Array.from(document.querySelectorAll('#v18fight .acts .btn'));
        return {scrollW: doc.scrollWidth, clientW: doc.clientWidth, overflowX: doc.scrollWidth > doc.clientWidth + 1,
          btns: btns.map(function(b){ var r=b.getBoundingClientRect(); return {h: Math.round(r.height), w: Math.round(r.width)}; })};
      }catch(e){ return 'ERR:'+e; } })()`);
      await shot('v39c-i-360-pick');
      await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`);
      await sleep(400);
      await C.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      r.verdict = verdict('V39-I 360px: no horizontal overflow, pick buttons >=44px',
        r.metrics.overflowX === false && r.metrics.btns.length >= 2 && r.metrics.btns.every(function (b) { return b.h >= 44; }),
        r.metrics);
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    note('\n== SUMMARY ==');
    note('consoleErrors:', C.consoleErrors.length, 'warns:', C.consoleWarns.length, 'dialogs:', C.dialogs.length);
    results.summary = { consoleErrors: C.consoleErrors, consoleWarns: C.consoleWarns, dialogs: C.dialogs };
    saveResults();
  } catch (e) {
    note('DRIVER ERROR', String(e).slice(0, 800));
    results.driverError = String(e).slice(0, 800);
    saveResults();
  } finally {
    try { if (C) C.close(); } catch (e) {}
    try { if (chromeProc) chromeProc.kill(); } catch (e) {}
    try { if (httpProc) httpProc.kill(); } catch (e) {}
    process.exit(0);
  }
}
main();
