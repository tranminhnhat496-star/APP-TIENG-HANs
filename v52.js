/* ===== V52 — V19.5.1: shared TTS speak helper (Android voice fix) =====
   BUG (user report 2026-11-24, live game): every "Nghe" button is silent
   on Android phones while it works on desktop. Root cause, verified from
   source: the game NEVER selected a voice — zero occurrences of
   getVoices / voiceschanged anywhere. Every speak path (speak15 v15.js,
   speakKO v18.js/v19.js/v27.js, speak22 v22.js, speakText v48.js) did
   speechSynthesis.cancel() then new SpeechSynthesisUtterance, set only
   .lang (+ .rate), called speak(), and swallowed all errors. On Android
   Chrome the voice list loads asynchronously and is often EMPTY when the
   page first speaks, so an utterance with only .lang set and no matching
   voice is silently dropped — no error, no sound.
   FIX: ONE shared helper, used by ALL speak paths (each keeps its old
   body as a fallback if this layer ever fails to load):
     (a) waits for voices to load — a 'voiceschanged' listener PLUS a
         getVoices() poll every 250 ms, bounded at 2000 ms;
     (b) picks a matching voice by lang — exact lang match, then
         lang-prefix match, then the platform default voice — NEVER a
         voice for the wrong language; if voices exist but none matches
         and there is no default, the call fails honestly instead of
         speaking with a wrong voice;
     (c) attaches utterance.onerror and shows an honest user-facing
         message ("Không phát được âm thanh — bấm Nghe lại.") with a
         retry button instead of silent failure ('canceled' /
         'interrupted' from our own cancel() are ignored);
     (d) cancel() runs ONLY when something is actually speaking or
         pending, and the utterance is spoken on the next tick after a
         cancel — cancel-then-speak in the same tick can drop the
         utterance on Android;
     (e) auto-play paths (v15/v22 250 ms, v27 200 ms setTimeout speaks)
         go through the same queue: if the first attempt finds no voice
         yet, the utterance speaks automatically as soon as voices load
         (or errors honestly after the bound) — and the existing
         "Nghe lại" buttons retry on the next user tap.
   No new save key, no XP/SRS/pet/schema change, no new permissions.
   HONEST GAP: real Android TTS end-to-end cannot be verified in headless
   Chrome (no voices, no audio) — it needs the user's real Android phone.
   The vm suite (test52 §52B) and the Chrome gates (verify-v52c G6) prove
   the helper's behaviour against stubbed voices (delayed / no-match /
   never-loads), not real audio. */
(function(){
'use strict';
var VERSION='19.5.1';
var WAIT_MS=2000, POLL_MS=250;
var _pending=null; /* {text,lang,rate,onErr} waiting for voices; latest wins */
var _listening=false; /* a voiceschanged listener is attached */
var ERR_MSG='Không phát được âm thanh — bấm Nghe lại.';
function _voices(){
  try{
    if(typeof speechSynthesis==='undefined'||!speechSynthesis)return null;
    if(typeof speechSynthesis.getVoices!=='function')return [];
    return speechSynthesis.getVoices()||[];
  }catch(e){ return null; }
}
/* Voice pick, per the task contract: exact lang -> lang prefix ->
   platform default -> null (never a wrong-language voice). */
function _pickVoice(lang){
  var vs=_voices();
  if(!vs||!vs.length)return null;
  var want=String(lang||'en-US').toLowerCase();
  var prefix=want.split('-')[0];
  var i,v;
  for(i=0;i<vs.length;i++){v=vs[i];if(v&&v.lang&&String(v.lang).toLowerCase()===want)return v;}
  for(i=0;i<vs.length;i++){v=vs[i];if(v&&v.lang&&String(v.lang).toLowerCase().indexOf(prefix)===0)return v;}
  for(i=0;i<vs.length;i++){v=vs[i];if(v&&v.default)return v;}
  return null;
}
function _doSpeak(text,lang,rate,onErr){
  var v=_pickVoice(lang||'en-US');
  if(!v){ if(onErr)onErr('no-voice'); return false; }
  var u;
  try{ u=new SpeechSynthesisUtterance(text); }
  catch(e){ if(onErr)onErr('unsupported'); return false; }
  u.lang=lang||'en-US';
  if(rate)u.rate=rate;
  u.voice=v;
  u.onerror=function(ev){
    var code=ev&&ev.error?String(ev.error):'';
    if(code==='canceled'||code==='interrupted')return; /* our own cancel() */
    if(onErr)onErr('error');
  };
  try{
    if(speechSynthesis.speaking||speechSynthesis.pending){
      speechSynthesis.cancel();
      setTimeout(function(){
        try{ speechSynthesis.speak(u); }catch(e){ if(onErr)onErr('error'); }
      },100);
    }else{
      speechSynthesis.speak(u);
    }
  }catch(e){ if(onErr)onErr('error'); return false; }
  return true;
}
function _flushPending(){
  if(!_pending)return;
  var p=_pending;_pending=null;
  var vs=_voices();
  if(vs&&vs.length){ _doSpeak(p.text,p.lang,p.rate,p.onErr); return; }
  if(p.onErr)p.onErr('no-voice');
}
function _waitForVoices(p){
  _pending=p;
  var done=false;
  function finish(){ if(done)return; done=true; _flushPending(); }
  try{
    if(speechSynthesis.addEventListener){
      if(!_listening){
        _listening=true;
        speechSynthesis.addEventListener('voiceschanged',function(){
          _listening=false; finish();
        });
      }
    }else if('onvoiceschanged' in speechSynthesis){
      speechSynthesis.onvoiceschanged=function(){ finish(); };
    }
  }catch(e){}
  var t0=Date.now();
  (function poll(){
    if(done)return;
    var vs=_voices();
    if(vs&&vs.length){ finish(); return; }
    if(Date.now()-t0>=WAIT_MS){ finish(); return; }
    setTimeout(poll,POLL_MS);
  })();
}
/* speak(text, lang, rate, onErr) — onErr(code) with code in
   'unsupported' | 'no-voice' | 'error'. Returns true when the utterance
   was spoken or queued, false on an immediate honest failure. */
function speak(text,lang,rate,onErr){
  if(typeof text!=='string'||!text)return false;
  if(typeof speechSynthesis==='undefined'||!speechSynthesis||typeof SpeechSynthesisUtterance==='undefined'){
    if(onErr)onErr('unsupported'); return false;
  }
  var vs=_voices();
  if(vs&&vs.length){ return _doSpeak(text,lang,rate,onErr); }
  _waitForVoices({text:text,lang:lang,rate:rate,onErr:onErr});
  return true;
}
window.__v52={
  version:VERSION,
  speak:speak,
  errMsg:ERR_MSG,
  _test:{
    pickVoice:_pickVoice,
    voices:_voices,
    pending:function(){ return _pending; },
    flush:_flushPending,
    waitMs:WAIT_MS
  }
};
})();
