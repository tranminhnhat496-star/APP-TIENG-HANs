/* ===== V48 DATA — SENTENCE FORGE (V19.3) =====
   Boss + Bounty quest definitions only. NO invented vocabulary:
   Forge sentences come from the real __V15_DATA.builder bank (EN)
   and from the real example sentences stored on the player's own
   learned Korean cards (card.e); Bounty goals count only real
   V48 events (Forge correct answers, Dojo attempts, Tree branch
   completions). Boss art: assets/bosses/v18/v18_golem.png SHIPS in this version
   (1024x1024 RGBA, generated after the build) — the card/fight show
   the golem image; <img> onerror hiding remains as a safety net.
   Boss scale (Claude's proposal, game scale): Lv 77, HP 620.
   Lv 58 is TAKEN (v11_butterflyqueen, Lv 58, HP 540 — verified
   from src/v19_data.js: V11 bosses occupy lv 31-60 contiguously,
   V10 lv 1-30, Chrono lv 61-68, Skyroot lv 69-76, so NO free
   level exists in 32-76; the nearest free level is 77). */
(function(){
'use strict';
var BOSS48={
  id:'v18_golem',
  n:'Hangul Golem',
  vi:'Hangul Golem — Chúa Tể Phụ Âm',
  img:'assets/bosses/v18/v18_golem.png',
  zone:'golem',
  el:'earth',
  rarity:'mythic',
  lv:77,
  hp:620,
  def:8,
  mode:'mixed',
  diff:'B2',
  lang:'both',
  skills:{
    basic:{n:'Đòn Golem Phụ Âm'},
    elem:{id:'shield',n:'Giáp Đá Phụ Âm'},
    tact:{id:'tshield',n:'Khiên Âm Tiết'},
    pass:{id:'bulwark',n:'Da Đá Huyền Thạch'},
    ult:{n:'Phụ Âm Diệt Thế'}
  },
  reward:{xp:170,gems:5,item:'Bùa Phát Âm Cao Cấp',title:'Chúa Tể Phụ Âm'}
};
var GOLEM_IDS=['v18_golem'];
/* Weakness (V34 system): the golem is weak to LISTENING questions
   — a correct answer on a listen-mode question fills the Break
   meter (v34.js breakDmg 'listen' branch); word pools cannot
   express it, so weakMatch never matches a word for this kind. */
var WEAK48={v18_golem:{kind:'listen'}};
/* Bounty Board quests. progressKey is read from en48 counters
   (see v48.js bountyProgress): forgeDay = correct Forge sentences
   today, forgeTotal, forgeStreakDays = consecutive days with >=1
   Forge correct, dojoDay/dojoTotal, treeDone = claimed branches.
   Rewards are claimed-guarded per period in en48.bounty.claimed. */
var BOUNTY_DAILY=[
  {id:'d_forge5',n:'Rèn 5 câu đúng',vi:'Trả lời đúng 5 câu Lò Rèn Câu trong ngày',goal:5,key:'forgeDay',xp:20,gems:1},
  {id:'d_forge_streak3',n:'Chuỗi 3 câu đúng',vi:'3 câu Lò Rèn Câu đúng liên tiếp trong một buổi',goal:3,key:'forgeStreak',xp:20,gems:1},
  {id:'d_dojo3',n:'Luyện phát âm 3 lần',vi:'Hoàn thành 3 lượt Võ Đường Phát Âm trong ngày',goal:3,key:'dojoDay',xp:20,gems:1},
  {id:'d_tree1',n:'Hoàn thành 1 nhánh cây',vi:'Hoàn thành 1 nhánh trong Cây Họ Từ',goal:1,key:'treeDay',xp:20,gems:1}
];
var BOUNTY_WEEKLY=[
  {id:'w_forge25',n:'Rèn 25 câu đúng',vi:'Trả lời đúng 25 câu Lò Rèn Câu trong tuần',goal:25,key:'forgeWeek',xp:60,gems:2},
  {id:'w_dojo10',n:'Luyện phát âm 10 lần',vi:'Hoàn thành 10 lượt Võ Đường Phát Âm trong tuần',goal:10,key:'dojoWeek',xp:60,gems:2},
  {id:'w_tree3',n:'Hoàn thành 3 nhánh cây',vi:'Hoàn thành 3 nhánh trong Cây Họ Từ trong tuần',goal:3,key:'treeWeek',xp:60,gems:2},
  {id:'w_streak3d',n:'Rèn 3 ngày liên tiếp',vi:'Lò Rèn Câu đúng ít nhất 1 câu trong 3 ngày liên tiếp',goal:3,key:'forgeStreakDays',xp:60,gems:2}
];
var BYID48={};
BYID48[BOSS48.id]=BOSS48;
window.__V48_DATA={
  version:'19.3.0',
  boss:BOSS48,
  bosses:[BOSS48],
  byId:function(id){return BYID48[id]||null},
  weakExplicit:WEAK48,
  bountyDaily:BOUNTY_DAILY,
  bountyWeekly:BOUNTY_WEEKLY,
  golemIds:GOLEM_IDS
};
})();
