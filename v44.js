/* ===== V44 — Legendary freeze fix (V18.9, layer V44) =====
   The fix itself lives in src/v18.js (wordPool + grammarPool): legDiff()
   is now computed ONCE per pool build instead of once per item inside
   the filters. Each legDiff() call runs V15().counts(), a full scan of
   the ~4,889-word WORDS array, so a Legendary fight start did ~4,889
   full scans synchronously (~3.7-7.8 s main-thread block in real Chrome
   157 on the pristine V18.8 base) before the first question rendered.
   Same level list, same pool membership — difficulty, questions,
   rewards, XP, SRS, pets and save schema are all unchanged.
   This file exists only as the version marker for the layer,
   following the V42/V43 pattern.
   DELIBERATELY NOT FIXED HERE (needs Anh's decision): legDiff() reads
   V15().counts().mastered, but counts is a GETTER on __v15 (not a
   method), so that call throws, the try/catch swallows it, m stays 0
   and legDiff() always returns ['A2','B1'] whatever the mastered
   count is. Fixing the read would CHANGE Legendary pools for players
   with >=200 mastered words, so it stays a pending decision item. */
(function(){
  var VERSION='18.9.0';
  window.__v44={version:VERSION};
})();
