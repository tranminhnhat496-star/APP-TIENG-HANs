// verify-v47c.js - V19.2 (layer V47) Chrome verification driver.
// Real Chrome 157 via CDP, local HTTP. Parameterised so the SAME driver
// runs on the built V19.2 tree (default: out) or the unzipped ZIP dir.
//   node tools/v47/verify-v47c.js [DIR] [httpPort] [cdpPort] [profile] [resultsFile] [shotPrefix]
// Defaults: DIR=out, http 8747, cdp 9227, profile chrome-v47c-prof,
// results tools/v47/logs/v47c-results.json, shots v47c-*.
// Exit 0 = driver completed (verdicts in the results JSON + stdout).
// Gates:
//   G0 boot clean (fresh guest, 0 console errors/warnings/dialogs,
//      WORDS 4892, __v47 19.2.0)
//   G1 live Library cards for all three pairs (labels visible and
//      distinct on every page of the topic, 30/page): the twin card
//      shows its sense label in its twin topic, the primary card stays
//      bare in its first topic, no bare primary card in the twin topic;
//      topic counts in the live UI (BODY 25, EMOTIONS 119, FRUIT 53,
//      COLORS 54, CLOTHES 57, FAMILY 99) + COLORS group name
//      'COLORS AND SHAPES'; 360px Library view has no horizontal overflow
//   G2 live questions never show both senses as competing options:
//      Review forced-Q (30 draws per direction per pair, mate never in
//      options, prompt labelled for twins), Smart mc-ev (same 30x2x3),
//      boss fights (scoped, ~120 questions per scope, no same-en
//      options in opts/optsVi, pair-Qs observed)
//   G3 live Match never shows both twins (20 sessions, COLORS scope,
//      6 distinct EN tiles every time)
//   G4 live KO fight still pays +85 for 8 correct, both engines,
//      per-answer rule holds
//   G5 Legendary start timing (<500 ms at mastered 600) + full win,
//      B2-only pool (630 words)
//   G6 console/dialog summary: 0 errors, 0 warnings, 0 JS dialogs
// HONEST LIMITS: real rendering/layout/paint in headless Chrome 157;
// live-phone, live-Firebase and first-open-on-GitHub-Pages gates stay
// Anh-only; speech is headless-stubbed by the browser (no audio check).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const CHROME = '/opt/meta-chromium/chrome';
const POLICY = '/tmp/webgl-policy.txt';
const DIR = process.argv[2] || '/home/hatch/workspace/v7build/out';
const HTTPPORT = parseInt(process.argv[3] || '8747', 10);
const PORT = parseInt(process.argv[4] || '9227', 10);
const PROFILE = process.argv[5] || 'chrome-v47c-prof';
const RESULTS_FILE = process.argv[6] || 'v47c-results.json';
const SHOT_PREFIX = process.argv[7] || 'v47c';
const TDIR = '/home/hatch/workspace/v7build/tools/v47';
const URL = `http://127.0.0.1:${HTTPPORT}/index.html`;
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
  } catch (e) { note('write failed:', p, String(e).slice(0, 120)); return false; }
}
function saveResults() { writeSmall(path.join(TDIR, 'logs', RESULTS_FILE), JSON.stringify({ verdicts, results, dir: DIR }, null, 2)); }
function verdict(name, cond, detail) {
  verdicts.push({ name, pass: !!cond, detail: detail === undefined ? null : detail });
  note((cond ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 500) : ''));
  saveResults();
  return !!cond;
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
let chromeProc = null, httpProc = null, C = null;
async function ensureHttp() {
  try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {}
  httpProc = spawn('python3', ['-m', 'http.server', String(HTTPPORT), '--directory', DIR], { stdio: 'ignore' });
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
      '--no-first-run', '--disable-component-update', '--disable-background-networking', '--disable-sync',
      '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks',
      '--user-data-dir=/tmp/' + PROFILE, `--remote-debugging-port=${PORT}`,
      '--window-size=1280,800', 'about:blank'];
    chromeProc = spawn(CHROME, args, { stdio: 'ignore' });
    for (let i = 0; i < 40; i++) { await sleep(500);
      try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch (e) {} }
    note('chrome start attempt', attempt, 'FAILED');
    try { chromeProc.kill(); } catch (e) {}
    if (attempt < 3) await sleep(10000);
  }
  throw new Error('chrome did not start after 3 attempts');
}
async function setViewport(w, h, mobile, dark) {
  await C.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
  await C.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
}
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
async function reloadWait(ms) { await C.eval('location.reload()'); await sleep(ms || 2800); }
async function shot(name) {
  try {
    const r = await C.send('Page.captureScreenshot', { format: 'png' });
    writeSmall(path.join(TDIR, 'shots', `${SHOT_PREFIX}-${name}.png`), Buffer.from(r.data, 'base64'));
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
  // Race-proof reset: the v20 save manager flushes dirty state to
  // localStorage on beforeunload, so a plain clear()+reload re-saves the
  // OLD state on unload (xpAt / koStats / boss wins survived across
  // freshGuest calls in the first runs). Flush first (dirty=false), then
  // clear, then reload — and VERIFY the save is actually fresh, retrying
  // up to 3 times. A fresh sample has 0 boss wins, 0 xpAt keys, 0 koRight.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await C.eval(`try{ if(window.__v20) window.__v20.flush(); }catch(e){}`);
    await C.eval(`localStorage.clear()`);
    await C.eval(`localStorage.setItem('hanvocab.v13.session', JSON.stringify({mode:'guest', at: Date.now()}))`);
    await reloadWait(2800);
    const fresh = await ev(`(function(){
      try{
        var e18=window.__v18._test.en18();
        var old=window.__v15.enOld();
        return {
          bossesWon:Object.keys(e18.bosses||{}).filter(function(k){return e18.bosses[k]&&e18.bosses[k].win;}).length,
          xpAtN:Object.keys(old.xpAt||{}).length,
          koRight:e18.koStats?e18.koStats.right||0:0
        };
      }catch(err){ return {err:String(err)}; }
    })()`);
    if (fresh && fresh.bossesWon === 0 && fresh.xpAtN === 0 && fresh.koRight === 0) return fresh;
    note('freshGuest attempt', attempt, 'not fresh:', JSON.stringify(fresh));
  }
  note('freshGuest: WARNING — save not fresh after 3 attempts');
  return null;
}
function close() {
  try { if (C) C.close(); } catch (e) {}
  try { if (chromeProc) chromeProc.kill(); } catch (e) {}
  try { if (httpProc) httpProc.kill(); } catch (e) {}
}
const ev = (expr) => C.eval(expr);

// --- V46 shared in-page helpers ---
async function setMastered(n) {
  return await ev(`(function(n){
    var v15=window.__v15, words=v15.words, old=v15.enOld();
    Object.keys(old.box||{}).forEach(function(k){ old.box[k]=0; });
    for(var i=0;i<n&&i<words.length;i++) old.box[words[i].id]=5;
    v15.save15();
    return {mastered:v15.counts15().mastered, legDiff:window.__v18._test.legDiff()};
  })(${n})`);
}
async function seedLegUnlock() {
  return await ev(`(function(){
    var e=window.__v18._test.en18();
    ['v10_unicorn','v10_icedragon','v10_panda','v10_magma','v10_fox'].forEach(function(id){e.bosses[id]={win:true};});
    save(); return true;
  })()`);
}
// EN arena unlocks are sequential (boss i needs boss i-1 won): seed a win
// for EVERY EN-arena boss so dict/owl (late in the list) are fightable.
async function seedEnWins() {
  return await ev(`(function(){
    var e=window.__v18._test.en18();
    (window.__V18_BOSSES.en||[]).forEach(function(b){ e.bosses[b.id]={win:true}; });
    save(); return (window.__V18_BOSSES.en||[]).length;
  })()`);
}
async function seedKOCards() {
  return await ev(`(function(){
    for(var i=0;i<10;i++){ if(!S.cards.some(function(c){return c.id==='ko_seed_'+i;})) S.cards.push({id:'ko_seed_'+i, d:'d0', h:'한국어'+i, m:'nghĩa '+i, p:'p'+i, e:'', g:'', box:0, due:0}); }
    save(); return S.cards.filter(function(c){return (c.id||'').indexOf('ko_seed_')===0;}).length;
  })()`);
}
async function openLegArena() {
  await ev(`window.__v15.openHub('bosses')`); await sleep(800);
  await ev(`window.__v18.openArena('leg')`); await sleep(800);
}
async function openEnArena() {
  await ev(`window.__v15.openHub('bosses')`); await sleep(800);
  await ev(`window.__v18.openArena('en')`); await sleep(800);
}
async function legPoolAt(m) {
  await setMastered(m);
  await seedLegUnlock();
  await openLegArena();
  const p = await ev(`(function(){
    var out={};
    try{
      window.__v18.fight('v10_firedragon','en');
      var F=window.__v18._test.F(); out.fightLive=!!F;
      if(F){ var lv={}; (F.pools.words||[]).forEach(function(w){ lv[w.lv]=(lv[w.lv]||0)+1; }); out.poolLevels=lv; out.poolN=(F.pools.words||[]).length;
        var gl={}; (F.pools.grammar||[]).forEach(function(g){ gl[g.lv]=(gl[g.lv]||0)+1; }); out.grammarLevels=gl; out.grammarN=(F.pools.grammar||[]).length; }
      window.__v18.close();
    }catch(err){ out.fightErr=String(err&&err.message||err); }
    return out;
  })()`);
  return p;
}
// Fight a boss answering correctly (hp pinned so the fight cannot end
// early) and watch the weakness meter: max brk reached + whether a
// BREAK banner appeared. Returns {maxBrk, sawBreak, wordQ, weakHits, steps}.
async function meterRun(engine, bossId, lang, maxSteps) {
  return await ev(`(function(){
    var out={maxBrk:0, sawBreak:false, wordQ:0, weakHits:0, steps:0, weak:null, qmode:null};
    try{
      var T=window.__v18._test, F=null;
      if('${engine}'==='v18'){
        window.__v18.fight('${bossId}','${lang}');
        F=window.__v18._test.F();
      }else{
        window.__v19.openMapFor('en'); if('${lang}'==='ko')window.__v19._test.setLang('ko'); window.__v19.fight('${bossId}');
        F=window.__v19._test.F();
      }
      if(!F) return {ok:false, why:'no fight'};
      out.weak=F.weak?{kind:F.weak.kind,key:F.weak.key}:null; out.qmode=F.qmode;
      var weakName=window.__v34?window.__v34.weakName(F.weak):null;
      for(var i=0;i<${maxSteps||40};i++){
        F=('${engine}'==='v18')?window.__v18._test.F():window.__v19._test.F();
        if(i===0) out.dbgFirst={fNull:!F, over:F?F.over:undefined, hasCur:!!(F&&F.cur), curW:!!(F&&F.cur&&F.cur.w)};
        if(!F||F.over) break;
        F.hp=999;
        if(F.cur&&F.cur.w) out.wordQ++;
        var wasWeak=(F.cur&&F.cur.w&&window.__v34)?window.__v34.weakMatch(F.cur.w,F.weak):false;
        if('${engine}'==='v18')window.__v18._test.pickCorrect();else window.__v19._test.pickCorrect();
        if(wasWeak) out.weakHits++;
        if(F.brk>out.maxBrk) out.maxBrk=F.brk;
        if(F.banner&&(F.banner.indexOf('BREAK')>=0)) out.sawBreak=true;
        if(out.sawBreak) out.maxBrk=3; // BREAK only fires at brk 3 (meter resets inside breakDmg)
        if('${engine}'==='v18')window.__v18.next();else window.__v19._test.next();
        out.steps++;
      }
      if('${engine}'==='v18')window.__v18.close();
      out.weakName=weakName;
      return out;
    }catch(err){ return {ok:false, err:String(err&&err.message||err)}; }
  })()`);
}

async function main() {
  // /tmp/webgl-policy.txt must contain exactly hatch-webgl-all-origins-v1
  // before Chrome runs (task requirement); recreate it if it drifted.
  try {
    const pol = fs.readFileSync(POLICY, 'utf8').trim();
    if (pol !== 'hatch-webgl-all-origins-v1') { fs.writeFileSync(POLICY, 'hatch-webgl-all-origins-v1'); note('webgl policy recreated'); }
  } catch (e) { fs.writeFileSync(POLICY, 'hatch-webgl-all-origins-v1'); note('webgl policy created'); }
  await openPage();
  const errs0 = C.consoleErrors.length, warns0 = C.consoleWarns.length;
  const PAIRS = [
    { en: 'sluggish', primId: 'w1371', twinId: 'a1a2_680', twinTopic: 'a1_emotions-and-feelings', twinTopicName: 'EMOTIONS AND FEELINGS', firstTopic: 'a1_body-parts', firstTopicName: 'BODY PARTS' },
    { en: 'orange', primId: 'w18', twinId: 'a1a2_806', twinTopic: 'a1_colors-and-shapes', twinTopicName: 'COLORS AND SHAPES', firstTopic: 'a1_fruit-and-vegetables', firstTopicName: 'FRUIT AND VEGETABLES' },
    { en: 'trip', primId: 'w1469', twinId: 'a1a2_912', twinTopic: 'a1_family', twinTopicName: 'FAMILY', firstTopic: 'a1_clothes-and-accessories', firstTopicName: 'CLOTHES AND ACCESSORIES' },
  ];
  const TOPIC_COUNTS = { 'a1_body-parts': 25, 'a1_emotions-and-feelings': 119, 'a1_fruit-and-vegetables': 53, 'a1_colors-and-shapes': 54, 'a1_clothes-and-accessories': 57, 'a1_family': 99 };
  // WORDS id -> en map (Node side) for the same-en option checks.
  const wordsMap = await ev(`JSON.stringify((function(){var o={};window.__v15.words.forEach(function(w){o[w.id]=(w.en||'').toLowerCase()});return o})())`).then(s => JSON.parse(s));
  function guardCheck(qId, optIds) {
    const qEn = wordsMap[qId];
    if (qEn === undefined) return { ok: false, why: 'question id not in WORDS: ' + qId };
    let skippedCorrect = false;
    const seen = {};
    for (const oid of optIds) {
      if (oid === qId && !skippedCorrect) { skippedCorrect = true; continue; }
      if (oid === qId) return { ok: false, why: 'question word ' + oid + ' appears twice among options' };
      const oEn = wordsMap[oid];
      if (oEn === undefined) return { ok: false, why: 'option id not in WORDS: ' + oid };
      if (oEn === qEn) return { ok: false, why: 'option ' + oid + ' shares the question headword' };
      if (seen[oEn]) return { ok: false, why: 'two options share en "' + oEn + '"' };
      seen[oEn] = 1;
    }
    return { ok: true };
  }
  async function openLibrary() {
    await ev(`window.__v15.openHub('library')`); await sleep(800);
  }
  // Collect the RENDERED HTML of every page of a topic (30/page).
  // innerHTML (not innerText): wordCard renders <b>labelOf(w)</b>, so
  // the bare-vs-labelled distinction is only visible in the markup.
  async function topicAllHtml(topicId) {
    await ev(`window.__v17.openTopic('${topicId}')`); await sleep(400);
    const n = await ev(`window.__v17.topics().filter(function(g){return g.id==='${topicId}'})[0].words.length`);
    const pages = Math.max(1, Math.ceil(n / 30));
    let all = '';
    for (let pg = 0; pg < pages; pg++) {
      await ev(`window.__v17.setPageKey('page',${pg})`); await sleep(250);
      all += await ev(`document.getElementById('v15body')?document.getElementById('v15body').innerHTML:''`) + '\n---PAGE---\n';
    }
    await ev(`window.__v17.setPageKey('page',0)`);
    return { html: all, pages };
  }

  // ================= G0 boot clean =================
  await step('G0-boot', async () => {
    const st = await ev(`(function(){return {hasV15:!!window.__v15, hasV47:!!window.__v47, version:window.__v47?window.__v47.version:null, words:window.__v15?window.__v15.words.length:0, title:document.title, countsTotal:window.__v15?window.__v15.counts15().total:0}})()`);
    verdict('G0 app boots with 0 console errors/warnings, WORDS 4892, __v47 19.2.0', errs0 === 0 && warns0 === 0 && st.hasV15 && st.hasV47 && st.version === '19.2.0' && st.words === 4892 && st.countsTotal === 4892, { errs: errs0, warns: warns0, st });
    return st;
  });

  // ================= G1 Library cards + topic counts =================
  await step('G1-library', async () => {
    await freshGuest();
    await openLibrary();
    // Topic counts + COLORS group name on the Library home.
    const home = await ev(`(function(){
      var cards=[].slice.call(document.querySelectorAll('#v15body .v17card'));
      var out={};
      cards.forEach(function(card){
        var t=card.querySelector('.v17card-t b'); if(!t) return;
        var n=(card.querySelector('.v17card-t .mute')||{}).textContent||'';
        out[t.textContent.trim()]=n.trim();
      });
      return out;
    })()`);
    // Topic card titles are topicName() = name + ' – ' + vi (v15.js).
    const expectedHome = { 'Body Parts – BỘ PHẬN CƠ THỂ': '25 từ', 'Emotions and Feelings – CẢM XÚC': '119 từ', 'Fruit and Vegetables – RAU QUẢ': '53 từ', 'Colors and Shapes – MÀU SẮC VÀ HÌNH DẠNG': '54 từ', 'Clothes and Accessories – QUẦN ÁO VÀ PHỤ KIỆN': '57 từ', 'Family – GIA ĐÌNH': '99 từ' };
    let homeOK = true;
    for (const k of Object.keys(expectedHome)) if (home[k] !== expectedHome[k]) homeOK = false;
    verdict('G1a Library home shows the six pair topics with exact counts (BODY 25, EMOTIONS 119, FRUIT 53, COLORS 54, CLOTHES 57, FAMILY 99)', homeOK, home);
    verdict("G1b COLORS group is named 'Colors and Shapes – MÀU SẮC VÀ HÌNH DẠNG' in the live UI (not 'Fruit and Vegetables – RAU QUẢ')", home['Colors and Shapes – MÀU SẮC VÀ HÌNH DẠNG'] === '54 từ', home);
    await shot('library-home');
    // Per-pair cards across all pages.
    const out = {};
    for (const p of PAIRS) {
      const twin = await topicAllHtml(p.twinTopic);
      const twinLabel = `${p.en} (${p.twinTopicName})`;
      out[p.en + 'Twin'] = {
        twinLabelFound: twin.html.indexOf(`<b>${twinLabel}</b>`) >= 0,
        barePrimaryAbsent: twin.html.indexOf(`<b>${p.en}</b>`) < 0,
        pages: twin.pages,
      };
      verdict(`G1c ${p.en} twin card shows its sense label '${twinLabel}' in the ${p.twinTopicName} topic (all ${twin.pages} pages), no bare primary card there`, out[p.en + 'Twin'].twinLabelFound && out[p.en + 'Twin'].barePrimaryAbsent, out[p.en + 'Twin']);
      const prim = await topicAllHtml(p.firstTopic);
      out[p.en + 'Prim'] = {
        barePrimaryFound: prim.html.indexOf(`<b>${p.en}</b>`) >= 0,
        twinLabelAbsent: prim.html.indexOf(`<b>${twinLabel}</b>`) < 0,
        pages: prim.pages,
      };
      verdict(`G1d ${p.en} primary card stays bare in the ${p.firstTopicName} topic, no twin label there`, out[p.en + 'Prim'].barePrimaryFound && out[p.en + 'Prim'].twinLabelAbsent, out[p.en + 'Prim']);
    }
    await shot('library-colors');
    // 360px: Library home has no horizontal overflow.
    await setViewport(360, 800, true, false); await sleep(900);
    await ev(`window.__v17.goHome()`); await sleep(600);
    const m360 = await ev(`(function(){return {scrollW:document.documentElement.scrollWidth, innerW:window.innerWidth}})()`);
    verdict('G1e mobile 360: Library home renders with no horizontal overflow', m360.scrollW <= m360.innerW, m360);
    await shot('library-360');
    await setViewport(1280, 800, false, false); await sleep(600);
    return { home, out, m360 };
  });

  // ================= G2 live questions never show both senses =================
  await step('G2-questions', async () => {
    await freshGuest();
    // The v15 hub is closed after freshGuest's reload: #v15body and
    // #v15review do not exist until openHub renders them. ReviewStart
    // renders into #v15review, so open the review tab first.
    await ev(`window.__v15.openHub('review')`); await sleep(800);
    const out = {};
    // --- G2a Review forced-Q: 30 draws per direction per pair.
    for (const p of PAIRS) {
      for (const dir of ['prim', 'twin']) {
        const targetId = dir === 'prim' ? p.primId : p.twinId;
        const mateId = dir === 'prim' ? p.twinId : p.primId;
        const scopeTopic = dir === 'prim' ? p.firstTopic : p.twinTopic;
        await ev(`window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'${scopeTopic}'})`);
        let draws = 0, violations = [], qWrong = 0, labelOK = 0;
        for (let i = 0; i < 30; i++) {
          await ev(`(function(){var v15=window.__v15,old=v15.enOld(),e=v15.en15();Object.keys(old.box||{}).forEach(function(k){old.box[k]=0});old.box['${targetId}']=1;e.due['${targetId}']=Date.now()-1000;v15.save15();})()`);
          await ev(`window.__v15.reviewStart(false)`); await sleep(120);
          const hstr = await ev(`document.getElementById('v15review')?document.getElementById('v15review').innerHTML:''`);
          const qm = hstr.match(/speakWord\('([^']+)'\)/);
          const opts = [...hstr.matchAll(/reviewPick\('([^']+)'\)/g)].map(m => m[1]);
          const qId = qm ? qm[1] : null;
          if (qId !== targetId) { qWrong++; continue; }
          if (opts.indexOf(mateId) >= 0) violations.push('mate in options at draw ' + i);
          const chk = guardCheck(qId, opts);
          if (!chk.ok) violations.push(chk.why + ' at draw ' + i);
          const txt = await ev(`document.getElementById('v15review')?document.getElementById('v15review').innerText:''`);
          if (dir === 'twin' && txt.indexOf(`${p.en} (${p.twinTopicName})`) >= 0) labelOK++;
          if (violations.length) break;
          await ev(`window.__v15.reviewPick('${targetId}');window.__v15.reviewNext()`); await sleep(60);
          draws++;
        }
        out[`review-${p.en}-${dir}`] = { draws, violations: violations.slice(0, 3), qWrong, labelOK };
        verdict(`G2a Review: 30 draws, ${p.en} ${dir}-as-Q, mate never drawn, 0 violations`, draws === 30 && violations.length === 0 && qWrong === 0, out[`review-${p.en}-${dir}`]);
        if (dir === 'twin') verdict(`G2a Review prompt labels the ${p.en} twin with its sense`, labelOK === 30, { labelOK });
      }
    }
    await shot('review-twin');
    // --- G2b Smart mc-ev: 30 draws per direction per pair (1-word list).
    // renderQuestion() needs #v27body, which only exists inside the
    // Smart hub — openSmart('en') first (probe47-chrome confirmed).
    await ev(`window.__v27.openSmart('en')`); await sleep(800);
    for (const p of PAIRS) {
      for (const dir of ['prim', 'twin']) {
        const targetId = dir === 'prim' ? p.primId : p.twinId;
        const mateId = dir === 'prim' ? p.twinId : p.primId;
        const scopeTopic = dir === 'prim' ? p.firstTopic : p.twinTopic;
        await ev(`window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'${scopeTopic}'})`);
        let draws = 0, violations = [], qWrong = 0, labelOK = 0;
        for (let i = 0; i < 30; i++) {
          await ev(`window.__v27.startSession('en',['${targetId}'],'mc-ev')`); await sleep(120);
          const hstr = await ev(`document.getElementById('v27body')?document.getElementById('v27body').innerHTML:''`);
          const qm = hstr.match(/answerMC\('([^']+)',(?:true|false),'([^']+)'\)/);
          const opts = [...hstr.matchAll(/answerMC\('[^']+',(?:true|false),'([^']+)'\)/g)].map(m => m[1]);
          const qId = qm ? qm[1] : null;
          if (qId !== targetId) { qWrong++; continue; }
          if (opts.indexOf(mateId) >= 0) violations.push('mate in options at draw ' + i);
          const chk = guardCheck(qId, opts);
          if (!chk.ok) violations.push(chk.why + ' at draw ' + i);
          const txt = await ev(`document.getElementById('v27body')?document.getElementById('v27body').innerText:''`);
          if (dir === 'twin' && txt.indexOf(`${p.en} (${p.twinTopicName})`) >= 0) labelOK++;
          if (violations.length) break;
          await ev(`window.__v27.answerMC('${targetId}',true,'${targetId}');window.__v27.nextQ()`); await sleep(60);
          draws++;
        }
        out[`smart-${p.en}-${dir}`] = { draws, violations: violations.slice(0, 3), qWrong, labelOK };
        verdict(`G2b Smart mc-ev: 30 draws, ${p.en} ${dir}-as-Q, mate never drawn, 0 violations`, draws === 30 && violations.length === 0 && qWrong === 0, out[`smart-${p.en}-${dir}`]);
        if (dir === 'twin') verdict(`G2b Smart mc-ev prompt labels the ${p.en} twin with its sense`, labelOK === 30, { labelOK });
      }
    }
    await ev(`window.__v27.closeSmart()`); await sleep(300);
    // Full-scan: collect every question's option sets in-page and check
    // them in Node (one CDP round-trip per scope).
    async function bossScanLive(engine, bossId, scopeTopic) {
      await ev(`window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'${scopeTopic}'})`);
      await seedKOCards();
      const obs = await ev(`(function(){
        var out={obs:[], questions:0, fights:0, err:null};
        try{
          for(var f=0;f<6;f++){
            if('${engine}'==='v18'){ window.__v18.fight('${bossId}','en'); }
            else { window.__v19.openMapFor('en'); window.__v19.fight('${bossId}'); }
            var F=('${engine}'==='v18')?window.__v18._test.F():window.__v19._test.F();
            if(!F) break;
            out.fights++;
            for(var s=0;s<120;s++){
              F=('${engine}'==='v18')?window.__v18._test.F():window.__v19._test.F();
              if(!F||F.over) break;
              F.hp=999;
              var cur=F.cur||{};
              if(cur.w){
                out.questions++;
                out.obs.push({w:cur.w.id, opts:(cur.opts||[]).map(function(o){return o.id}), optsVi:(cur.optsVi||[]).map(function(o){return o.id})});
              }
              if('${engine}'==='v18'){ window.__v18._test.pickCorrect(); window.__v18.next(); }
              else { window.__v19._test.pickCorrect(); window.__v19._test.next(); }
            }
            if('${engine}'==='v18')window.__v18.close();
          }
        }catch(e){ out.err=String(e&&e.message||e); }
        return JSON.stringify(out);
      })()`).then(s => JSON.parse(s));
      let violations = [];
      const pairQ = {};
      for (const o of obs.obs) {
        if (o.w) pairQ[o.w] = (pairQ[o.w] || 0) + 1;
        const c1 = o.opts.length ? guardCheck(o.w, o.opts) : { ok: true };
        const c2 = o.optsVi.length ? guardCheck(o.w, o.optsVi) : { ok: true };
        if (!c1.ok) violations.push(c1.why + ` (${engine} ${scopeTopic} Q ${o.w})`);
        if (!c2.ok) violations.push(c2.why + ` (${engine} ${scopeTopic} Q ${o.w} optsVi)`);
        if (violations.length >= 3) break;
      }
      return { questions: obs.questions, fights: obs.fights, pairQ, violations: violations.slice(0, 3), err: obs.err };
    }
    for (const engine of ['v18', 'v19']) {
      const bossId = engine === 'v18' ? 'v10_slime' : 'v11_fireking';
      let totQ = 0, totViol = [];
      for (const p of PAIRS) {
        const rT = await bossScanLive(engine, bossId, p.twinTopic);
        totQ += rT.questions; totViol = totViol.concat(rT.violations);
        verdict(`G2c live ${engine} boss (${p.en} twin scope): ${rT.questions} questions, twin observed ${rT.pairQ[p.twinId] || 0}x, 0 violations`, (rT.pairQ[p.twinId] || 0) >= 1 && rT.violations.length === 0 && !rT.err, rT);
        const rP = await bossScanLive(engine, bossId, p.firstTopic);
        totQ += rP.questions; totViol = totViol.concat(rP.violations);
        verdict(`G2c live ${engine} boss (${p.en} primary scope): ${rP.questions} questions, primary observed ${rP.pairQ[p.primId] || 0}x, 0 violations`, (rP.pairQ[p.primId] || 0) >= 1 && rP.violations.length === 0 && !rP.err, rP);
      }
      verdict(`G2c live ${engine} boss: ${totQ} questions total across 6 scopes, 0 violations`, totQ >= 100 && totViol.length === 0, { totQ, totViol: totViol.slice(0, 3) });
    }
    await shot('boss-fight');
    return out;
  });

  // ================= G3 live Match =================
  await step('G3-match', async () => {
    await freshGuest();
    // Same hub rule as G2a: startMode renders into #v15body, which only
    // exists after openHub. Open the learn tab first.
    await ev(`window.__v15.openHub('learn')`); await sleep(800);
    await ev(`window.__v15.setScope({kind:'lib',lib:'a1a2',topic:'a1_colors-and-shapes'})`);
    let sessions = 0, violations = [], twinSeen = 0;
    for (let i = 0; i < 20; i++) {
      await ev(`window.__v15.startMode('match')`); await sleep(300);
      const hstr = await ev(`document.getElementById('v15body')?document.getElementById('v15body').innerHTML:''`);
      const ids = [...hstr.matchAll(/matchClick\('en','([^']+)'\)/g)].map(m => m[1]);
      if (ids.length !== 6) { violations.push('session ' + i + ': ' + ids.length + ' EN tiles, expected 6'); break; }
      const ens = ids.map(id => wordsMap[id] || '?');
      if (new Set(ens).size !== 6) { violations.push('session ' + i + ': duplicate EN tile: ' + JSON.stringify(ens)); break; }
      if (ids.indexOf('w18') >= 0 && ids.indexOf('a1a2_806') >= 0) { violations.push('session ' + i + ': both orange senses in one Match'); break; }
      if (ids.indexOf('w18') >= 0 || ids.indexOf('a1a2_806') >= 0) twinSeen++;
      sessions++;
    }
    verdict('G3 live Match: 20 sessions in COLORS scope, 6 distinct EN tiles every time, never both orange senses', sessions === 20 && violations.length === 0, { sessions, violations: violations.slice(0, 3), twinSeen });
    await shot('match');
    return { sessions, violations, twinSeen };
  });

  // ================= G4 live KO fight +85 =================
  await step('G4-kopay', async () => {
    async function liveKOFight(engine) {
      await freshGuest();
      await seedKOCards();
      await ev(`window.__v15.openHub('bosses')`); await sleep(800);
      if (engine === 'v18') { await ev(`window.__v18.openArena('en')`); await sleep(800); }
      return JSON.parse(await ev(`JSON.stringify((function(){
      var out={seq:[], koRight0:0};
      function xp(){ return S.xp||0; }
      var seen={}, streak=0;
      if('${engine}'==='v18'){
        var v18=window.__v18;
        var e18=v18._test.en18(); out.koRight0=e18.koStats.right||0;
        var xp0=xp();
        v18.fight('v10_slime','ko');
        for(var a=0;a<8;a++){ var F=v18._test.F(); if(!F||F.over) break; F.hp=999;
          var cid=F.cur&&F.cur.k?F.cur.k.id:null, before=xp();
          v18._test.pickCorrect(); v18.next();
          var d=xp()-before; streak++;
          var expect=(seen[cid]?0:10)+((streak%5===0)?5:0);
          out.seq.push({cid:cid, delta:d, expect:expect, streak:streak});
          seen[cid]=1;
        }
        out.delta=xp()-xp0; out.koRightDelta=(v18._test.en18().koStats.right||0)-out.koRight0;
        out.koStreak=v18._test.en18().koStreak;
        v18.close();
      }else{
        var v19=window.__v19;
        var e19=v19.en19(); out.koRight0=e19.koStats.right||0;
        var xp0b=xp();
        v19.openMapFor('en'); v19._test.setLang('ko'); v19.fight('v11_fireking');
        for(var b=0;b<8;b++){ var F2=v19._test.F(); if(!F2||F2.over) break; F2.hp=999;
          var cid2=F2.cur&&F2.cur.k?F2.cur.k.id:null, before2=xp();
          v19._test.pickCorrect(); v19._test.next();
          var d2=xp()-before2; streak++;
          var expect2=(seen[cid2]?0:10)+((streak%5===0)?5:0);
          out.seq.push({cid:cid2, delta:d2, expect:expect2, streak:streak});
          seen[cid2]=1;
        }
        out.delta=xp()-xp0b; out.koRightDelta=(v19.en19().koStats.right||0)-out.koRight0;
        out.koStreak=v19.en19().koStreak;
      }
      return out;
    })())`));
    }
    const ko18 = await liveKOFight('v18');
    verdict('G4a live v18 KO fight: 8 correct on 8 distinct cards pays +85 XP', ko18.delta === 85 && ko18.koRightDelta === 8 && ko18.koStreak === 8, ko18);
    verdict('G4b live v18 KO fight: per-answer rule holds on all 8 answers', ko18.seq.length === 8 && ko18.seq.every(s => s.delta === s.expect), ko18.seq);
    const ko19 = await liveKOFight('v19');
    verdict('G4c live v19 KO fight: 8 correct on 8 distinct cards pays +85 XP', ko19.delta === 85 && ko19.koRightDelta === 8 && ko19.koStreak === 8, ko19);
    verdict('G4d live v19 KO fight: per-answer rule holds on all 8 answers', ko19.seq.length === 8 && ko19.seq.every(s => s.delta === s.expect), ko19.seq);
    return { ko18, ko19 };
  });

  // ================= G5 Legendary start timing + win =================
  await step('G5-legtiming', async () => {
    await freshGuest();
    await setMastered(600);
    await seedLegUnlock();
    await ev(`window.__v15.openHub('bosses')`); await sleep(800);
    await ev(`window.__v18.openArena('leg')`); await sleep(800);
    const win600 = await ev(`(function(){
      var out={steps:0, won:false, poolLevels:null};
      function xp(){ return S.xp||0; }
      var xp0=xp();
      try{
        var t0=performance.now();
        window.__v18.fight('v10_firedragon','en');
        out.startMs=Math.round((performance.now()-t0)*10)/10;
        var F=window.__v18._test.F();
        var lv={}; (F.pools.words||[]).forEach(function(w){ lv[w.lv]=(lv[w.lv]||0)+1; });
        out.poolLevels=lv; out.poolN=(F.pools.words||[]).length;
        for(var i=0;i<80;i++){ var F2=window.__v18._test.F(); if(!F2) break; if(F2.over){ out.won=(F2.over==='win'); break; }
          window.__v18._test.pickCorrect(); window.__v18.next(); out.steps++; }
        out.delta=xp()-xp0;
        window.__v18.close();
      }catch(err){ out.err=String(err); }
      return out;
    })()`);
    verdict('G5a full Legendary fight to a win at mastered 600 (B2-only pool, 630 words)', win600.won === true && win600.delta > 0 && JSON.stringify(win600.poolLevels) === JSON.stringify({ B2: 630 }), win600);
    verdict('G5b Legendary fight start at mastered 600 is prompt (<500 ms)', win600.startMs < 500, { startMs: win600.startMs });
    await shot('leg-win-600');
    return win600;
  });

  // ================= G6 console summary =================
  await step('G6-console', async () => {
    const sum = { errors: C.consoleErrors, warns: C.consoleWarns, dialogs: C.dialogs };
    verdict('G6 0 console errors, 0 warnings, 0 JS dialogs across all gates', sum.errors.length === 0 && sum.warns.length === 0 && sum.dialogs.length === 0, sum);
    return sum;
  });

  const passed = verdicts.filter(v => v.pass).length;
  const failed = verdicts.filter(v => !v.pass);
  note(`\nverify-v47c: ${passed}/${verdicts.length} PASS` + (failed.length ? ` — FAILURES: ${failed.map(f => f.name).join(' | ')}` : ''));
  saveResults();
  close();
  process.exit(0);
}

main().catch(e => { console.error('verify-v47c crashed:', e); try { close(); } catch (_) {} process.exit(2); });
