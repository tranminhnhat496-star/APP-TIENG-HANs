/* V40 — V18.5 BUG FIXES II (18.5.0). Additive layer, loads LAST.
   Systematic "RÀ LỖI" review of the V18.4 build (three review passes:
   V39 regressions, the known-unfixed list from V18.1, whole-game scan)
   found 1 SEVERE, 2 MAJOR and 9 MINOR confirmed bugs. Twelve are fixed
   here as guarded build replacements applied by build_v40.py (they live
   in closure-local code a runtime layer cannot reach):
     R-V40-V20-KO16 (C-01 SEVERE) — v20_sync.js gains a ko16 merge
       branch: ko16 = {levels:{cardId:level}} (Smart Import, v16) had
       no branch and fell to newer-wins, dropping the older side's
       imported-word levels (and downgrading levels the newer save had
       not learned yet). Per-key MAX like the en branch.
     R-V40-V20-PLAN (C-07 MINOR) — v20_sync.js merges the Smart plan
       per language instead of taking the newer save's plan for BOTH
       languages. Same-day plans union ids/doneIds and OR the goals
       (complete recomputed from coverage); otherwise newer-wins per
       language. claimed stays unioned, so no double payment.
     R-V40-V23-SHIELD (C-02 MAJOR) — v23.js castSkillInFight routes
       team-skill damage through the boss shield exactly like a correct
       answer (halved while the shield holds; the shield absorbs the
       dealt damage). Before, it bypassed the shield entirely — a
       50-dmg skill hit a 30-shield boss for 50 while the shield stayed
       at 30. The toast is corrected when the shield cuts the damage,
       and a non-lethal skill now re-runs the owning engine's phase
       check (map bosses -> V19, arenas -> V18) so P2/P3 and the
       Knowledge Counterattack trigger at once.
     R-V40-V18/V19-CHECKPHASE — checkPhase is exposed on both engines'
       _test exports (V36 resolveLethal precedent) so v23 can call it.
     R-V40-V15-STARTMODE / REVIEWSTART / LEARNHTML (B-8 MAJOR) —
       v15.js: a BT scope on a fresh load has no words attached yet
       (basic_tactics_vocabulary.json is lazy) and pickPool showed
       "no words". startMode and reviewStart now load the data first
       (guarded against leaving the tab while loading); learnHTML
       prefetches it fire-and-forget while the user browses the learn
       tab with a BT scope active.
     R-V40-V18/V19-KOWARN + NEXT (A-F2 MINOR, A-N1 nit) — the <8 KO
       warning banner is stored on F.koWarn at startFight (the count
       is computed once — koCount18()/koCount() re-shuffle the pool on
       every call) and next() restores it instead of clearing the
       banner, so it lasts the whole fight. checkPhase may still
       transiently replace it for one question's feedback.
     R-V40-V34-BREAKLABEL (A-F1 MINOR) — the KO Break bar said "bộ từ
       tiếng Hàn đã chọn" while the questions came from ALL Korean
       cards when the selected deck had <8 cards (pool fallback). It
       now says "từ tiếng Hàn của bạn". weakChipHTML is untouched
       (card-level context).
     R-V40-V18-COLLDETAIL (C-04 MINOR) — collDetail read only
       en18().bosses[id], so map bosses never showed a replay count.
       It now reads en19 (en + ko wins summed) when b.zone is set.
       Old-arena wins live in en15().bosses and carry no wins count.
     R-V40-V18-ARENASBTN / COLLHEAD (C-05 MINOR) — the arenas button
       said "(40 boss)" though the Collection holds 86; it now uses
       allBosses().length live. The Collection subtitle now also names
       Chrono Kingdom + Skyroot Sanctuary when tot19 > 70.
     R-V40-V18/V19-SC2 (C-06 MINOR) — wordPool's scope relaxation
       dropped topic/lesson, so a <8-word topic/lesson pool fell back
       to the whole A1–A2 library (995) or whole Oxford (3,393).
       sc2 now keeps topic + lesson (only status is relaxed).
     R-V40-V27-FINISH (C-10 MINOR) — finishSession ticked the plan
       goals acc80/weak5 even for partial (abandoned) sessions; they
       now sit inside the same if(!partial) guard as complete and the
       payouts (V36/F13 guarded those only).
     R-V40-V22-APPLY (C-12 MINOR) — "Bỏ chọn tất cả" + Áp dụng in the
       boss word-set picker applied the WHOLE BT library. It now
       refuses with "Chọn ít nhất 1 Unit." until a Unit is picked.
       ('Tất cả' goes through lib==='all' and is unaffected.)
   Deliberately NOT changed (need Anh's decision or accepted): the
   weakness table (26 blocked bosses) + legDiff() (fixing legDiff alone
   grows blocked 26→36 — decide together); F-12 resetEN scope (boss
   wins also survive reset though the dialog promises "farm, boss");
   farm harvest +35 vs +25 XP; bubble.png/shop.png icons; BT
   Listening Quest paying its first-completion reward at 0% accuracy;
   pet-hatch safe-merge loss (needs a refund rule); the .v20modal
   stacking trap (accepted); F-05/F-07 observers incl. the v33/v35
   double-init (fix only on live perf proof); V9 word fixes;
   V14.1 Developing Tactics; "Từ vựng của tôi" in the boss picker.
   No new save key, no schema change, no new data, no new art. */
(function(){
  "use strict";
  var VERSION='18.5.0';
  window.__v40={version:VERSION};
})();
