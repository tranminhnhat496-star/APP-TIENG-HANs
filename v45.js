/* ===== V45 — Round-3 bug fixes (V19.0, layer V45) =====
   Bug-fix build only — no new features, no schema change, no new save
   key. The fixes themselves live in the src files they touch (see the
   V45 comments there) and in two index-only replacements (load() +
   enIcon(), applied by build_v45.py — the V6 core has no src file):
   - C-R3-1 (MAJOR): "due" is now box 1-4 AND due<=now everywhere
     (counts15, dueTodayCount, reviewHTML/reviewStart, wordsFiltered
     onlyDue + BT status filters, v17 statsOf/filterWords, v22
     unitStats/filterEntries, v25 statsOf, v34 statsForList, v27
     dashboard dueN) — matching Smart Learning's REVIEW definition
     (v27 classifyEN/KO). Fresh players are no longer told 4,889 words
     "need review today"; Review with 0 truly-due words shows the honest
     empty state instead of silently teaching new words.
   - C-R3-2 (SEVERE): load() quarantines a corrupt / card-less save
     (hanvocab.v12.corrupt-<ms>-<n>-<rand>) BEFORE any save overwrites
     it, and sets window.__V45_CORRUPT. This file (running last) shows
     the honest warning — no fake success, no silent data loss.
   - C-R3-4 (MINOR): snapshotCurrent() keys are unique (ms + counter +
     random) — two snapshots in the same ms no longer overwrite.
   - NEW-1 (MINOR): enIcon() emits no <img> when there is no icon —
     the 20 topic cards (19 A1-A2 + Oxford, + BT) no longer render
     assets/icons/v6/undefined. No icon is invented or assigned.
   - .v34weakchip (Claude-directed DO): list-row contrast fixed in
     src/v45.css (light #7A5B00 like V18.8; dark keeps gold #FFD76A).
   - Leads fixed with vm repros: restoreRaw() size-checks before
     parsing; speedHatch() checks remaining time before spending gems;
     deleteHistoryEntry() deletes ONE same-ms entry, not all of them.
   DELIBERATELY NOT FIXED HERE (pending decisions — see the V19.0
   changelog): C-R3-3 duplicate headwords (4 pairs, distinct senses);
   legDiff scaling + weakness table + KO boss 0 XP (Claude: DO, but in
   the separate V19.0.1 / layer V46 after V19.0); all 13 pass-B items. */
(function(){
  var VERSION='19.0.0';
  window.__v45={version:VERSION};
  /* Show an 8 s warning. The V6 toast() lives inside the v7js closure
     and is NOT a global (verified in real Chrome: typeof toast is not
     'function' here, so the first version of this layer fell back to
     pop15 — a .pp that vanishes after 1.1 s, far too brief for a
     data-loss warning, and behind the farm-chooser modal). So: use the
     global toast() when it exists, else build the same .v7toast div
     directly (same class toast() uses, same 8 s life), else pop15. */
  function _warn45(msg){
    try{ if(typeof toast==='function'){toast(msg,8000);return;} }catch(e){}
    try{
      var d=document.createElement('div');
      d.className='v7toast';d.textContent=msg;
      document.body.appendChild(d);
      setTimeout(function(){try{d.remove()}catch(e){}},8000);
      return;
    }catch(e){}
    try{ if(window.__v15&&__v15.pop15)__v15.pop15(msg); }catch(e2){}
  }
  /* C-R3-2 warning: load() set window.__V45_CORRUPT when it quarantined
     an unreadable save. Show it once, after the app has rendered, as a
     long toast (8 s) — not a fake success, and the quarantine key is
     named so the player (or support) can find the original bytes. */
  try{
    var c=window.__V45_CORRUPT;
    if(c&&c.key){
      window.__v45corruptShown={key:c.key,reason:c.reason,quarantined:true};
      var msg='⚠️ Không đọc được bản lưu cũ ('+(c.reason==='no-cards'?'thiếu dữ liệu thẻ':'file hỏng')+') — đã giữ bản gốc tại '+c.key+'. Bắt đầu với dữ liệu mới; khôi phục từ Sao lưu nếu cần.';
      setTimeout(function(){_warn45(msg)},800);
    }else if(c&&c.key===null){
      window.__v45corruptShown={key:null,reason:c.reason,quarantined:false};
      setTimeout(function(){_warn45('⚠️ Không đọc được bản lưu cũ và không giữ được bản gốc (bộ nhớ đầy?) — bắt đầu với dữ liệu mới.')},800);
    }
  }catch(e){}
})();
