/* ===== V46 — V19.0.1: Legendary scaling + weakness redesign + KO boss XP =====
   BALANCE change (Claude-directed DO), not a bug-fix round. Two changes,
   both gameplay-visible — see CHANGELOG_V19_0_to_V19_0_1.md.
   1) Legendary difficulty scaling (legDiff, src/v18.js) + weakness-table
      redesign (src/v34.js weakFor + this layer's data in src/v46_data.js):
      legDiff() read V15().counts() as a function, but counts is a getter
      (src/v15.js:1787), so the call threw, the try/catch swallowed it,
      m stayed 0, and legDiff() ALWAYS returned ['A2','B1'] — Legendary
      difficulty never scaled despite the arena card promising "Độ khó
      câu hỏi tăng theo tiến trình học của bạn". The read is now
      V15().counts.mastered (getter read, not called); thresholds are
      UNCHANGED (<200 -> ['A2','B1'], <600 -> ['B1'], else ['B2']); a
      failed read is console.warn-ed (never silently swallowed) and falls
      back to ['A2','B1'] — the logged fallback, not a silent default.
      The weakness table is redesigned in the SAME version so the
      blocked-boss count does not grow 26 -> 36: 23 per-boss overrides
      (src/v46_data.js) put every previously pool-blocked boss and every
      Legendary boss on a topic the live data proves fillable in its pool
      at every mastered band. Recomputed: pool-blocked 0, distinct
      blocked 15 (the 15 mode-blocked bosses, whose grammar/read/builder
      fights ask no word questions — untouched by design).
   2) Korean boss XP (C-R2-1): correct KO answers paid 0 XP while EN
      paid up to +10 for identical effort, in both engines. The ONE
      shared XP-award function below now serves mark18/markKO (v18.js)
      and mark19/markKO19 (v19.js) — same rule, same amounts, no drift:
        +10 on a "box-up" correct answer, once per item per 10 minutes
          (old.xpAt cooldown, exactly as EN had it);
        +5 every 5th consecutive correct answer (streak % 5 === 0);
        0 on a wrong answer; hist/daily bookkeeping identical.
      EN calls it with boxUp = (box rose) and streakKey 'streak' on the
      EN SRS state — byte-identical XP to V19.0 (verified in test46 §46D
      and Chrome gate G5: same cooldown, same streak cadence, same
      fight totals). KO calls it with boxUp = true on a correct answer
      (KO has no SRS box — the Korean deck is never modified by boss
      fights, V39 — so eligibility is the correct answer itself, and
      the 10-minute per-card cooldown is the throttle) and streakKey
      'koStreak' on the engine state (en18()/en19(), defaulted ||0;
      a new optional field, no save-schema change — same pattern as
      koStats). KO cooldown keys are namespaced 'ko:'+cardId inside the
      SAME old.xpAt map EN uses (KO card ids are random 10-char strings
      like 'a9msh4om92'; the prefix makes collision with EN word ids
      impossible by construction). First-win (+50 XP/+1 gem) and replay
      (+10 XP) rewards are NOT routed through this function and are
      UNCHANGED in both languages and both engines.
   Guards: every cross-layer read goes through window.__v46 with a
   guard + try/catch; if this layer ever failed to load, the EN mark
   functions fall back to their original inline XP block (kept verbatim
   in v18.js/v19.js, marked fallback-only) so EN XP can never regress
   to 0, and KO falls back to its V19.0 behaviour (0 XP). The live path
   is always this shared function (test46 §46C spies on it). */
(function(){
'use strict';
var VERSION='19.0.1';
/* ONE shared boss-answer XP rule for EN + KO, v18 + v19.
   o: {ok, id, boxUp, streakObj, streakKey, xpAt, gain, hist, daily}
   - ok: the answer was correct. id: cooldown key (EN word id, or
     'ko:'+card id for KO — see koXpKey). boxUp: EN = the SRS box rose
     for this word; KO = true on a correct answer (no box exists).
   - streakObj/streakKey: the consecutive-correct counter holder
     (EN: enOld(), 'streak'; KO: en18()/en19(), 'koStreak').
   - xpAt: the per-item 10-minute cooldown map (enOld().xpAt, shared).
   - gain: gain18/gain19. hist/daily: en15().hist / en15().daily.
   Returns the XP awarded (0 on wrong / cooldown / no streak bonus).
   The two lines below are the whole rule — identical for both
   languages by construction, so they cannot drift apart again. */
function awardBossAnswerXP(o){
  if(!o)return 0;
  var xp=0;
  try{
    if(o.ok&&o.boxUp&&o.xpAt&&o.id){
      var last=o.xpAt[o.id]||0;
      if(Date.now()-last>600000){xp=10;o.xpAt[o.id]=Date.now();}
    }
    if(o.ok&&o.streakObj){
      var st=o.streakObj[o.streakKey]||0;
      if(st>0&&st%5===0)xp+=5;
    }
    if(xp>0&&o.gain){try{o.gain(xp)}catch(e){}}
  }catch(e){}
  /* hist/daily bookkeeping — identical to the mark18/mark19 block this
     replaces (same day number, same rollover, same counters). */
  try{
    var dn=Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5);
    if(o.hist){
      o.hist[dn]=o.hist[dn]||{c:0,t:0,xp:0};
      o.hist[dn].t++;if(o.ok)o.hist[dn].c++;o.hist[dn].xp+=xp;
    }
    if(o.daily){
      var today=new Date().toDateString();
      /* Reset IN PLACE, never reassign o.daily: o.daily is the caller's
         en15().daily object, and replacing it here would orphan the
         caller's reference (the rollover would silently discard the
         day's counters — caught by test46 §46C). The original mark18
         block could reassign e.daily because e IS the state object. */
      if(o.daily.d!==today){o.daily.d=today;o.daily.correct=0;o.daily.wrong=0;o.daily.xp=0;}
      if(o.ok){o.daily.correct++;o.daily.xp+=xp;}else o.daily.wrong++;
    }
  }catch(e){}
  return xp;
}
/* KO cooldown key: namespaced inside the shared xpAt map. */
function koXpKey(id){return 'ko:'+(id||'?')}
try{
  window.__v46={
    version:VERSION,
    awardBossAnswerXP:awardBossAnswerXP,
    koXpKey:koXpKey,
    _test:{awardBossAnswerXP:awardBossAnswerXP,koXpKey:koXpKey}
  };
}catch(e){}
})();
