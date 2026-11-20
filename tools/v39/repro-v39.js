// repro-v39.js — V18.4 KOREAN BOSSES repro on the pristine V18.3 base.
// Real Chrome 157 via CDP, HTTP 8957 / CDP 9357, scratch profile.
// Modelled on tools/v37/verify-v37c.js (same CDP class, ensureHttp/
// ensureChrome, shot helpers, V36 freshSeed pattern). Exit 0 = driver
// completed (verdicts in the results JSON + stdout; a FAIL verdict does
// not crash the driver). Writes results to tools/v39/logs/repro-results.json
// after EVERY step. Screenshots in tools/v39/shots/repro-*.
// Gaps to reproduce (V18.3 base, all expected REPRO):
//   R0 fresh save: KO pool = 20 seed cards (baseline).
//   R1 Challenge boss card says "Ngôn ngữ: Tiếng Anh" and fight('v10_slime')
//      starts an EN fight immediately (F.lang 'en', no pick screen).
//   R2 Legendary boss (unlocked via seeded el wins) same as R1.
//   R3 V18 KO fight with a 5-card seeded save: NO <8 banner (F.banner null,
//      no .v18banner) while the question is English (fallback, silent).
//   R4 V19 KO fight with the same 5-card save: the <8 banner IS shown
//      (F.banner contains '5/8', .v19banner present) — the V19 precedent.
//   R5 KO answers in a V19 map fight do NOT reach Smart Learning:
//      after answering KO questions correctly, en27().ko has no records
//      for the fought card ids.
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
function saveResults() { writeSmall(path.join(DIR, 'logs', 'repro-results.json'), JSON.stringify(results, null, 2)); }
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
    '--user-data-dir=/tmp/chrome-v39r-prof', `--remote-debugging-port=${PORT}`,
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
    await openPage();
    const boot = await C.eval(`(function(){ return { S: typeof S, save: typeof save, v15: !!window.__v15, v18: !!window.__v18, v19: !!window.__v19, v27: !!window.__v27, v33: !!window.__v33, v35: !!window.__v35, title: document.title, koCount19: (function(){ try{ return window.__v19._test.koCount(); }catch(e){ return 'ERR:'+e; } })(), cards: (function(){ try{ return S.cards.length; }catch(e){ return 'ERR:'+e; } })() }; })()`);
    note('boot:', boot);
    results.boot = boot;
    saveResults();

    // ============ R0 — fresh-save KO pool baseline ============
    await step('R0-fresh-ko-pool-20', async () => {
      const r = { koCount: boot.koCount19, cards: boot.cards };
      r.verdict = verdict('R0 fresh save has 20 KO cards (baseline)', r.koCount === 20 && r.cards === 20, r);
      return r;
    });

    // ============ R1 — Challenge boss is EN-only ============
    await step('R1-challenge-boss-en-only', async () => {
      const r = {};
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('bosses'); }catch(e){} })()`);
      await sleep(1200);
      await C.eval(`(function(){ try{ window.__v15.tab('collection'); window.__v18.collDetail('v10_slime'); }catch(e){} })()`);
      await sleep(800);
      r.card = await C.eval(`(function(){ var h=document.querySelector('#v18colldetail'); if(!h) return {present:false}; var t=h.innerText||''; return {present:true, slimeLangEN: t.indexOf('Ngôn ngữ: Tiếng Anh')>=0, slimeBoth: (t.match(/Anh \\/ Hàn/g)||[]).length}; })()`);
      await shot('repro-r1-challenge-card');
      await C.eval(`(function(){ try{ window.__v18.openArena('en'); window.__v18.fight('v10_slime'); }catch(e){} })()`);
      await sleep(1000);
      r.fight = await C.eval(`(function(){ try{ var F=window.__v18._test.F(); if(!F) return {started:false}; var q=document.querySelector('#v18fight .v18qword'); return {started:true, lang:F.lang, qword:q?(q.textContent||'').trim():null, banner:F.banner, pickShown: !!document.querySelector('#v18fight .v18fight') && !document.querySelector('#v18fight .v18hpbar')}; }catch(e){ return 'ERR:'+e; } })()`);
      // Hangul check on the question word (English fight => no Hangul).
      r.fight.hasHangul = r.fight.qword ? HANGUL.test(r.fight.qword) : false;
      await shot('repro-r1-challenge-fight');
      r.noPick = r.fight.started === true && r.fight.lang === 'en';
      r.verdict = verdict('R1 Challenge boss EN-only, fight starts in EN with no pick', r.card.slimeLangEN === true && r.noPick, { card: r.card, fight: r.fight });
      await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`);
      await sleep(500);
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ R2 — Legendary boss is EN-only (seed el wins to unlock) ============
    await step('R2-legendary-boss-en-only', async () => {
      const r = {};
      const seeded = await C.eval(`(function(){ try{ var e=window.__v18.en18(); ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){ e.bosses[id]={win:1,wins:1,at:Date.now()}; }); save(); return {elWins: window.__v18.arenaWins('el')}; }catch(e){ return 'ERR:'+e; } })()`);
      await sleep(1200);
      r.seeded = seeded;
      await C.eval(`(function(){ try{ window.__v15.tab('collection'); window.__v18.collDetail('v10_firedragon'); }catch(e){} })()`);
      await sleep(800);
      r.card = await C.eval(`(function(){ var h=document.querySelector('#v18colldetail'); if(!h) return {present:false}; var t=h.innerText||''; return {present:true, firedragonLangEN: t.indexOf('Ngôn ngữ: Tiếng Anh')>=0}; })()`);
      await shot('repro-r2-legendary-card');
      await C.eval(`(function(){ try{ window.__v18.openArena('leg'); window.__v18.fight('v10_firedragon'); }catch(e){} })()`);
      await sleep(1000);
      r.fight = await C.eval(`(function(){ try{ var F=window.__v18._test.F(); if(!F) return {started:false}; var q=document.querySelector('#v18fight .v18qword'); return {started:true, lang:F.lang, qword:q?(q.textContent||'').trim():null, banner:F.banner}; }catch(e){ return 'ERR:'+e; } })()`);
      r.fight.hasHangul = r.fight.qword ? HANGUL.test(r.fight.qword) : false;
      await shot('repro-r2-legendary-fight');
      r.noPick = r.fight.started === true && r.fight.lang === 'en';
      r.verdict = verdict('R2 Legendary boss EN-only, fight starts in EN with no pick', r.card.firedragonLangEN === true && r.noPick, { card: r.card, fight: r.fight });
      await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`);
      await sleep(500);
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ R3 — V18 KO fight, 5-card save: NO banner, silent EN fallback ============
    await step('R3-v18-ko-5cards-no-banner', async () => {
      const r = {};
      r.seed = await seedCards(FIVE_KO);
      r.koCount = await C.eval(`(function(){ try{ return window.__v19._test.koCount(); }catch(e){ return 'ERR:'+e; } })()`);
      // The hub must be open: fight() -> openArena() needs #v15body, else
      // #v18fight is never created and nothing renders (F still exists).
      await C.eval(`(function(){ try{ window.__v15.choose('en'); window.__v15.openHub('bosses'); }catch(e){} })()`);
      await sleep(1000);
      await C.eval(`(function(){ try{ window.__v18.fight('v10_unicorn','ko'); }catch(e){} })()`);
      await sleep(1000);
      r.fight = await C.eval(`(function(){ try{ var F=window.__v18._test.F(); if(!F) return {started:false}; var q=document.querySelector('#v18fight .v18qword'); var banner=document.querySelector('#v18fight .v18banner'); return {started:true, lang:F.lang, curKO: !!(F.cur&&F.cur.ko), qword:q?(q.textContent||'').trim():null, banner:F.banner, bannerEl: !!banner}; }catch(e){ return 'ERR:'+e; } })()`);
      r.fight.hasHangul = r.fight.qword ? HANGUL.test(r.fight.qword) : false;
      await shot('repro-r3-v18-ko-5cards');
      r.silentFallback = r.fight.started === true && r.fight.lang === 'ko' && r.fight.curKO === false && r.fight.banner === null && r.fight.bannerEl === false;
      r.verdict = verdict('R3 V18 KO fight with 5 cards: silent EN fallback, NO banner', r.silentFallback, r.fight);
      await C.eval(`(function(){ try{ window.__v18.close(); }catch(e){} })()`);
      await sleep(500);
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ R4 — V19 KO fight, 5-card save: banner IS shown ============
    await step('R4-v19-ko-5cards-banner-shown', async () => {
      const r = {};
      r.koCount = await C.eval(`(function(){ try{ return window.__v19._test.koCount(); }catch(e){ return 'ERR:'+e; } })()`);
      await C.eval(`(function(){ try{ window.__v19.openMapFor('ko'); }catch(e){} })()`);
      await sleep(800);
      await C.eval(`(function(){ try{ window.__v19.fight('v11_fireking'); }catch(e){} })()`);
      await sleep(1000);
      r.fight = await C.eval(`(function(){ try{ var F=window.__v19._test.F(); if(!F) return {started:false}; var q=document.querySelector('#v19fight .v19qword'); var banner=document.querySelector('#v19fight .v19banner'); return {started:true, lang:F.lang, curKO: !!(F.cur&&F.cur.ko), qword:q?(q.textContent||'').trim():null, banner:F.banner, bannerEl: !!banner, bannerText: banner?(banner.textContent||'').slice(0,80):null}; }catch(e){ return 'ERR:'+e; } })()`);
      await shot('repro-r4-v19-ko-5cards');
      r.bannerShown = r.fight.started === true && r.fight.banner !== null && r.fight.bannerEl === true && String(r.fight.banner).indexOf('5/8') >= 0;
      r.verdict = verdict('R4 V19 KO fight with 5 cards: <8 banner SHOWN (V19 precedent)', r.bannerShown, r.fight);
      await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`);
      await sleep(500);
      r.consoleErrors = C.consoleErrors.length;
      return r;
    });

    // ============ R5 — KO answers never reach Smart Learning ============
    await step('R5-ko-answers-blind-to-smart', async () => {
      const r = {};
      r.seed = await seedCards(TWENTY_KO);
      r.koCount = await C.eval(`(function(){ try{ return window.__v19._test.koCount(); }catch(e){ return 'ERR:'+e; } })()`);
      await C.eval(`(function(){ try{ window.__v19.openMapFor('ko'); }catch(e){} })()`);
      await sleep(800);
      await C.eval(`(function(){ try{ window.__v19.fight('v11_fireking'); }catch(e){} })()`);
      await sleep(1000);
      r.fought = [];
      for (let i = 0; i < 3; i++) {
        const one = await C.eval(`(function(){ try{
          var F=window.__v19._test.F(); if(!F||F.over) return {done:true};
          if(!(F.cur&&F.cur.ko)) return {ko:false, qmode:F.qmode};
          var kid=F.cur.k.id;
          var ok=window.__v19._test.pickCorrect();
          return {ko:true, kid:kid, picked:ok};
        }catch(e){ return 'ERR:'+e; } })()`, true);
        if (!one || one.done || !one.ko) { r.fought.push(one); break; }
        r.fought.push(one);
        await sleep(600);
        await C.eval(`(function(){ try{ window.__v19.next(); }catch(e){} })()`);
        await sleep(700);
      }
      await sleep(1200); // let the debounced save flush
      r.smart = await C.eval(`(function(){ try{
        var d=window.__v27.en27(); var ko=d.ko||{};
        var ids=${JSON.stringify(r.fought.filter(x => x && x.kid).map(x => x.kid))};
        var seen={};
        ids.forEach(function(id){ seen[id]={right:(ko.right||{})[id], wrong:(ko.wrong||{})[id], cw:(ko.cw||{})[id], cr:(ko.cr||{})[id], last:(ko.last||{})[id]}; });
        return {ids:ids, seen:seen, koRightKeys:Object.keys(ko.right||{}).length, koWrongKeys:Object.keys(ko.wrong||{}).length};
      }catch(e){ return 'ERR:'+e; } })()`);
      await shot('repro-r5-smart-blind');
      const blind = r.smart && r.smart.ids && r.smart.ids.length > 0 &&
        r.smart.ids.every(function(id) { const s = r.smart.seen[id]; return s.right === undefined && s.wrong === undefined && s.cw === undefined && s.cr === undefined; });
      r.verdict = verdict('R5 KO answers do NOT reach Smart Learning (en27().ko empty for fought ids)', blind === true, { fought: r.fought, smart: r.smart });
      await C.eval(`(function(){ try{ window.__v19.close(); }catch(e){} })()`);
      await sleep(500);
      r.consoleErrors = C.consoleErrors.length;
      r.consoleWarns = C.consoleWarns.length;
      r.dialogs = C.dialogs.length;
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
