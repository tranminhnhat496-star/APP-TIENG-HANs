// repro-v49c.js - V19.4 boss-mic defects, reproduced in REAL Chrome 157.
// Same defects as tools/v49/repro-v49.js (Node vm), proven on the live
// rendered page: stubbed SpeechRecognition injected before page load,
// a real wizard fight driven through __v18, DOM read back via CDP.
//   node tools/v49/repro-v49c.js [DIR] [httpPort] [cdpPort]
// Defaults: DIR=tools/v49/backup-v19.3/out (pristine V19.3), http 8749, cdp 9229.
// Exit 0 = repro ran; the table says which defects reproduced.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { openPage } = require('../v15ui/cdp.js');
const DIR = process.argv[2] || '/home/hatch/workspace/v7build/tools/v49/backup-v19.3/out';
const HTTPPORT = parseInt(process.argv[3] || '8749', 10);
const URL = `http://127.0.0.1:${HTTPPORT}/index.html`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SR_STUB = `
window.SpeechRecognition = function(){
  var self=this; window.__lastSR49=self;
  self.lang=''; self.interimResults=false; self.maxAlternatives=3;
  self.onresult=null; self.onerror=null; self.onend=null;
  self._aborted=false; self._lostSync=false;
  self.start=function(){
    if(window.__SRMODE==='throw'){ throw new Error('mic-start-throw'); }
    if(window.__SRMODE==='syncfire'){
      self._lostSync = !self.onresult;
      if(self.onresult) self.onresult({results:[[{transcript: window.__SRWORD||'apple'}]]});
    }
  };
  self.abort=function(){ self._aborted=true; };
  self.stop=function(){};
  self.fireResult=function(t){ if(self.onresult) self.onresult({results:[[{transcript:t}]]}); };
  self.fireError=function(code){ if(self.onerror) self.onerror({error:code}); };
  self.fireEnd=function(){ if(self.onend) self.onend(); };
};
window.webkitSpeechRecognition = window.SpeechRecognition;`;
let httpProc = null;
async function ensureHttp() {
  try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {}
  httpProc = spawn('python3', ['-m', 'http.server', String(HTTPPORT), '--directory', DIR], { stdio: 'ignore' });
  for (let i = 0; i < 20; i++) { await sleep(500);
    try { const r = await fetch(`http://127.0.0.1:${HTTPPORT}/index.html`); if (r.ok) return; } catch (e) {} }
  throw new Error('http server did not start on ' + HTTPPORT);
}
async function main() {
  await ensureHttp();
  const C = await openPage(URL, 1280, 800);
  await sleep(3000);
  // Install the controllable SR stub AFTER boot: bossSpeak reads
  // window.SpeechRecognition at call time, so a post-boot install is exact.
  await C.eval(SR_STUB);
  const boot = await C.eval(`(function(){ return {title: document.title, hasV18: !!window.__v18, words: (window.__v15&&window.__v15.words||[]).length}; })()`);
  console.log('boot:', JSON.stringify(boot));
  if (!boot.hasV18) throw new Error('game did not boot');
  const R = {};
  function repro(id, reproduced, evidence) {
    R[id] = reproduced;
    console.log((reproduced ? 'REPRO ' : 'NOT-REPRO ') + id + ' — ' + JSON.stringify(evidence).slice(0, 400));
  }
  async function startWizard() {
    return await C.eval(`(function(){
      var v18=window.__v18, e18=v18._test.en18(); e18.bosses=e18.bosses||{};
      var d=v18.bosses; (d.old||[]).concat(d.en||[],d.el||[],d.leg||[]).forEach(function(b){ if(b.arena!=='old') e18.bosses[b.id]={win:true}; });
      v18.fight('v10_wizard','en');
      var F=v18._test.F();
      return {live:!!F, qmode:F&&F.qmode, word:F&&F.cur&&F.cur.w&&F.cur.w.en, boss:F&&F.boss&&F.boss.id, timer:!!(F&&F.timer), left:F&&F.left};
    })()`);
  }
  async function F18() {
    return await C.eval(`(function(){var F=window.__v18._test.F(); if(!F) return null;
      return {answered:F.answered, ok:F.ok, hearts:F.hearts, hp:F.hp, qmode:F.qmode,
        word:F.cur&&F.cur.w&&F.cur.w.en, heard:F.heard||null, listening:!!F.listening};})()`);
  }
  async function fightHTML() { return await C.eval(`(document.querySelector('#v18fight')||{}).innerHTML || ''`); }
  async function setMode(m) { await C.eval(`window.__SRMODE=${JSON.stringify(m)};`); }

  // C1: sync-fire result lost
  {
    const w = await startWizard();
    await setMode('syncfire');
    await C.eval(`window.__SRWORD=${JSON.stringify(w.word)};`);
    await C.eval(`window.__v18.bossSpeak()`);
    await sleep(300);
    const f = await F18();
    const lost = await C.eval(`window.__lastSR49._lostSync`);
    repro('D1-handlers-after-start', lost === true && f.answered === null, { word: w.word, lostSync: lost, answered: f.answered });
    await C.eval(`window.__v18.close()`);
  }
  // C2: no listening state
  {
    const w = await startWizard();
    await setMode('silent');
    await C.eval(`window.__v18.bossSpeak()`);
    await sleep(300);
    const h = await fightHTML();
    const m = h.match(/<button[^>]*onclick="__v18\.bossSpeak\(\)"[^>]*>/);
    repro('D2-no-listening-state', !/Đang nghe/.test(h) && !(m && /disabled/.test(m[0])), { word: w.word, hasListeningText: /Đang nghe/.test(h), speakBtn: m ? m[0] : null });
    await C.eval(`window.__v18.close()`);
  }
  // C3: start() throws -> silent
  {
    const w = await startWizard();
    await setMode('throw');
    await C.eval(`window.__v18.bossSpeak()`);
    await sleep(300);
    const f = await F18();
    const h = await fightHTML();
    repro('D3-silent-start-failure', f.answered === null && !/thử lại/.test(h) && !/Không mở được micro|micro bị chặn|kiểm tra micro/i.test(h),
      { word: w.word, answered: f.answered });
    await C.eval(`window.__v18.close()`);
  }
  // C4: onend with no result -> frozen
  {
    const w = await startWizard();
    await setMode('silent');
    await C.eval(`window.__v18.bossSpeak()`);
    await sleep(200);
    await C.eval(`window.__lastSR49.fireEnd()`);
    await sleep(300);
    const f = await F18();
    const h = await fightHTML();
    repro('D4-no-onend-handler', f.answered === null && !/Tiếp tục/.test(h) && !/thử lại/.test(h),
      { word: w.word, answered: f.answered, hasNext: /Tiếp tục/.test(h) });
    await C.eval(`window.__v18.close()`);
  }
  // C5: stale result answers the next question
  {
    const w = await startWizard();
    await setMode('silent');
    await C.eval(`window.__v18.bossSpeak()`);
    await sleep(200);
    const w1 = (await F18()).word;
    await C.eval(`window.__v18._test.pickWrong()`);
    const closed = await F18();
    await C.eval(`window.__lastSR49.fireResult(${JSON.stringify(w1)})`);
    await sleep(200);
    const afterDrop = await F18();
    await C.eval(`window.__v18.next()`);
    await sleep(200);
    const q2 = await F18();
    await C.eval(`window.__lastSR49.fireResult(${JSON.stringify(w1)})`);
    await sleep(200);
    const corrupted = await F18();
    repro('D5b-late-result-dropped', closed.answered !== null && afterDrop.answered === closed.answered,
      { word: w1, answeredBefore: closed.answered, answeredAfter: afterDrop.answered });
    repro('D5c-stale-result-answers-next-Q', q2.answered === null && corrupted.answered !== null,
      { oldWord: w1, newWord: q2.word, answeredAfter: corrupted.answered, okAfter: corrupted.ok });
    await C.eval(`window.__v18.close()`);
  }
  // C6: generic error
  {
    const w = await startWizard();
    await setMode('silent');
    await C.eval(`window.__v18.bossSpeak()`);
    await sleep(200);
    await C.eval(`window.__lastSR49.fireError('not-allowed')`);
    await sleep(300);
    const f = await F18();
    const h = await fightHTML();
    repro('D6-generic-error', f.heard === '(không nghe được)' && !/chặn/.test(h) && !/Cho phép/.test(h) && !/thử lại/.test(h),
      { word: w.word, heard: f.heard });
    await C.eval(`window.__v18.close()`);
  }
  console.log('\n== chrome repro summary (pristine V19.3 base) ==');
  Object.keys(R).forEach(k => console.log('  ' + k + ': ' + (R[k] ? 'REPRODUCED' : 'not reproduced')));
  const errs = (C.events || []).filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params && e.params.type === 'error'));
  const warns = (C.events || []).filter(e => e.method === 'Runtime.consoleAPICalled' && e.params && e.params.type === 'warning');
  const dialogs = (C.events || []).filter(e => e.method === 'Page.javascriptDialogOpening');
  console.log('console errors:', errs.length, '| warnings:', warns.length, '| dialogs:', dialogs.length);
  if (errs.length) console.log('errors:', JSON.stringify(errs).slice(0, 800));
  C.close();
  try { if (httpProc) httpProc.kill(); } catch (e) {}
  process.exit(0);
}
main().catch(e => { console.error('REPRO DRIVER FAILED:', e); try { if (httpProc) httpProc.kill(); } catch (e2) {} process.exit(1); });
