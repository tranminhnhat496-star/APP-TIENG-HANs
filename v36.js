/* V36 — V18.1 BUG FIXES (18.1.0). Additive layer, loads LAST.
   Fixes verified by the V18.1 review of layers V34 (V17.1) + V35 (V18.0)
   and the AUTO audit findings (2026-11-18). This layer only ADDS code;
   the logic fixes that a runtime layer cannot reach (closure-local
   functions in v15/v18/v19/v21/v23/v27/v33/v35) are guarded
   replacements applied by build_v36.py — see CHANGELOG_V18_0_to_V18_1.md.

   What lives HERE (runtime-reachable):
   - F14/F16b: __v34.breakBarHTML wrapper. Two cases where the V34
     Break meter can never fill, but the stock bar shows a live 0/3:
       (a) mode-blocked bosses — pure grammar / read / builder bosses
           never ask a word question, so cur.w is never set and
           breakDmg() can never return > 0;
       (b) KO fights whose KO pool (the selected deck when it holds
           >= 8 cards, else all cards) has < 8 cards — the fight
           falls back to English questions, so the Korean meter
           (which needs cur.k) can never fill.
     The wrapper shows an honest blocked message instead. Everything
     else falls through to the original __v34.breakBarHTML unchanged.
     Callers (v15.js / v18.js / v19.js) look the property up on
     window.__v34 at call time, so wrapping the property is enough.
   No new save key, no schema change, no new data. */
(function(){
  "use strict";
  var VERSION='18.1.0';
  /* Modes that never ask a word question (cur.w is never set). 'mixed'
     is NOT blocked: mixed bosses ask mc/listen word questions on
     half their cycle, so their meter can fill. 'speed' maps to 'mc'. */
  var BLOCKED_MODES={grammar:1,read:1,builder:1};
  var MODE_VI={grammar:'ngữ pháp',read:'đọc hiểu',builder:'sắp xếp câu'};
  /* B-36-1 (SEVERE, found by the V34 probe on the first V18.1 build):
     the original wrapper read the stock bar through
     origBar() = window.__v34.breakBarHTML AT CALL TIME — but by then
     the property IS this wrapper, so every non-blocked boss recursed
     until "Maximum call stack size exceeded" and the fight renderer
     crashed. The stock bar must be captured ONCE at wrap time and the
     captured reference called — never the live property. */
  var _orig=null;
  /* Returns 'mode' | 'ko' | null. null = not blocked (fall through). */
  function blockedReason(F){
    if(!F||!F.boss)return null;
    var lang=F.lang||'en';
    if(lang==='ko'){
      /* KO fights ask Korean questions only when the KO pool
         (F.pools.ko — the selected deck when it holds >= 8 cards,
         else all cards; deck-scoped in v19, deck-scoped in v18 since
         V36 R-F16A) holds >= 8 cards. Below that the fight falls back
         to English questions (see the startFight banner) and cur.k is
         never set, so the Korean meter can never fill. */
      var ko=(F.pools&&F.pools.ko)||null;
      if(ko&&ko.length<8)return 'ko';
    }else{
      var m=F.boss.mode||'';
      if(BLOCKED_MODES[m])return 'mode';
    }
    return null;
  }
  function breakBarHTML(F){
    var r=blockedReason(F);
    if(r==='mode'){
      var mv=MODE_VI[F.boss.mode]||F.boss.mode;
      return '<div class="v34bar v34blocked"><div class="v34bar-t">💥 Điểm yếu: <b>không thể phá</b></div>'
        +'<div class="mute">Boss này chỉ hỏi '+mv+' nên không có từ vựng để phá Điểm yếu — đánh bại bằng câu trả lời đúng.</div></div>';
    }
    if(r==='ko'){
      var koN=(F.pools&&F.pools.ko)?F.pools.ko.length:0;
      return '<div class="v34bar v34blocked"><div class="v34bar-t">💥 Điểm yếu: <b>không thể phá</b></div>'
        +'<div class="mute">Bạn mới có '+koN+'/8 thẻ tiếng Hàn nên trận này dùng câu hỏi tiếng Anh — Điểm yếu tiếng Hàn không thể phá. Thêm từ tiếng Hàn để mở Điểm yếu.</div></div>';
    }
    var f=_orig;
    if(f)return f(F);
    return '';
  }

  /* Wrap __v34.breakBarHTML in place (callers read it dynamically).
     _orig is captured here, before the property is replaced. */
  try{
    if(window.__v34&&typeof __v34.breakBarHTML==='function'){
      _orig=__v34.breakBarHTML;
      __v34._breakBarHTML_orig=_orig;
      __v34.breakBarHTML=breakBarHTML;
    }
  }catch(e){}

  window.__v36={
    version:VERSION,
    breakBarHTML:breakBarHTML,
    blockedReason:blockedReason,
    /* Test hook: true only when the wrapper actually replaced the
       stock bar (false if __v34 was absent at load time). */
    wrapped:!!(window.__v34&&__v34._breakBarHTML_orig)
  };
})();
