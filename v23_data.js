/* ===== V23 DATA — Premium Pet System (V15) =====
   Data-driven: species / eggs / skills / materials / shop / collection.
   Art: assets/pets/v15/<id>_s<stage>.png, assets/pets/v15/eggs/egg_<el>.png
   (generated chibi art + rembg; see ASSET_REPORT_V15.md).
   Stats are on the game's own scale (boss HP 290-600, answer damage
   ~12-30) — NOT the fantasy numbers on the reference mockups. */
(function(){
'use strict';
var PET_ELEMENTS={
  fire:{n:'Lửa',icon:'🔥',color:'#FF6B35'},
  ice:{n:'Băng',icon:'❄️',color:'#5BC8E8'},
  nature:{n:'Rừng',icon:'🌿',color:'#7ED957'},
  water:{n:'Nước',icon:'💧',color:'#4A90E2'},
  thunder:{n:'Sấm',icon:'⚡',color:'#FFD93D'},
  light:{n:'Ánh Sáng',icon:'✨',color:'#FFE66D'},
  dark:{n:'Bóng Tối',icon:'🌙',color:'#9B59B6'}
};
var PET_RARITY={
  common:{n:'Thường',stars:2,color:'#B8C4CC'},
  rare:{n:'Hiếm',stars:3,color:'#5BC8E8'},
  epic:{n:'Sử thi',stars:4,color:'#B678F0'},
  legendary:{n:'Huyền thoại',stars:5,color:'#FFB020'}
};
/* Stage multipliers (stats) and level gates. Stage index 0/1/2.
   Lv cap per stage: 10 / 20 / 30. */
var PET_STAGE_MULT=[1,1.6,2.4];
var PET_STAGE_MAXLV=[10,20,30];
var PET_STAGE_DMG=[5,10,15]; /* % damage bonus per team pet by stage */
/* Skill types (battle):
   active: dmg (flat damage), shield (+team shield), heal (+team shield, nature/water/light flavour)
   passive: burn (+dmg per correct), frost (less shield drain), wisdom (+1 energy per 3-combo),
            moon/tide/honey/crystal/grove (shield at start / on heart loss), rebirth (ignore first
            heart loss once per fight), arcane (+1 starting energy), storm (+dmg when combo>=3),
            holy (restore shield on heart loss)
   ultimate: empowered active, only at stage 3 (leader). */
var PET_SPECIES=[
 {id:'dragon',n:'Rồng Lửa',el:'fire',rar:'legendary',egg:'fire',rate:0.60,
  base:{hp:100,atk:20,def:10,spd:14},perLv:{hp:8,atk:2,def:1,spd:1},
  stages:[{n:'Rồng Lửa Nhỏ',img:'dragon_s1.png'},{n:'Rồng Lửa',img:'dragon_s2.png'},{n:'Rồng Thần Lửa',img:'dragon_s3.png'}],
  skills:{
   a:{id:'firebreath',n:'Hơi Thở Lửa',type:'dmg',val:30,d:'Phun lửa gây sát thương lớn cho boss.'},
   p:{id:'burn',n:'Thiêu Đốt',type:'burn',val:5,d:'Bị động: mỗi câu trả lời đúng gây thêm 5 sát thương (lửa thiêu đốt).'},
   u:{id:'firesoul',n:'Hỏa Hồn',type:'dmg',val:60,d:'Tuyệt kỹ: ngọn lửa thần gây sát thương rất lớn cho boss.'}}},
 {id:'phoenix',n:'Chim Phượng',el:'fire',rar:'epic',egg:'fire',rate:0.40,
  base:{hp:85,atk:18,def:9,spd:18},perLv:{hp:7,atk:2,def:1,spd:1},
  stages:[{n:'Phượng Con',img:'phoenix_s1.png'},{n:'Chim Phượng',img:'phoenix_s2.png'},{n:'Phượng Hoàng Lửa',img:'phoenix_s3.png'}],
  skills:{
   a:{id:'firebreath',n:'Hơi Thở Lửa',type:'dmg',val:26,d:'Phun lửa gây sát thương lớn cho boss.'},
   p:{id:'rebirth',n:'Tái Sinh',type:'rebirth',val:1,d:'Bị động: mỗi trận một lần, bỏ qua lần mất tim đầu tiên.'},
   u:{id:'firesoul',n:'Hỏa Hồn',type:'dmg',val:55,d:'Tuyệt kỹ: ngọn lửa thần gây sát thương rất lớn cho boss.'}}},
 {id:'fox',n:'Hồ Ly Băng',el:'ice',rar:'epic',egg:'ice',rate:0.55,
  base:{hp:80,atk:17,def:11,spd:19},perLv:{hp:7,atk:2,def:1,spd:1},
  stages:[{n:'Hồ Ly Băng Nhỏ',img:'fox_s1.png'},{n:'Hồ Ly Băng',img:'fox_s2.png'},{n:'Hồ Ly Băng Thần',img:'fox_s3.png'}],
  skills:{
   a:{id:'iceshield',n:'Băng Thuẫn',type:'shield',val:80,d:'Tạo lá chắn băng hấp thụ sát thương của boss.'},
   p:{id:'frost',n:'Hàn Khí',type:'frost',val:10,d:'Bị động: boss phản công làm vỡ ít khiên hơn 10 điểm.'},
   u:{id:'iceguard',n:'Băng Thuẫn Thần',type:'shield',val:150,d:'Tuyệt kỹ: lá chắn băng lớn hấp thụ nhiều sát thương.'}}},
 {id:'turtle',n:'Rùa Pha Lê',el:'water',rar:'rare',egg:'ice',rate:0.25,
  base:{hp:110,atk:12,def:14,spd:8},perLv:{hp:9,atk:1,def:2,spd:0},
  stages:[{n:'Rùa Pha Lê Nhỏ',img:'turtle_s1.png'},{n:'Rùa Pha Lê',img:'turtle_s2.png'},{n:'Rùa Pha Lê Thần',img:'turtle_s3.png'}],
  skills:{
   a:{id:'tideheal',n:'Hồi Phục Thủy Triều',type:'heal',val:70,d:'Hồi lại khiên đội bằng dòng nước chữa lành.'},
   p:{id:'crystal',n:'Giáp Pha Lê',type:'crystal',val:15,d:'Bị động: boss phản công làm vỡ ít khiên hơn 15 điểm.'},
   u:{id:'tideguard',n:'Thủy Triều Thần',type:'heal',val:140,d:'Tuyệt kỹ: hồi lại nhiều khiên cho cả đội.'}}},
 {id:'whale',n:'Cá Voi Nhỏ',el:'water',rar:'common',egg:'ice',rate:0.20,
  base:{hp:105,atk:13,def:12,spd:9},perLv:{hp:9,atk:1,def:1,spd:1},
  stages:[{n:'Cá Voi Con',img:'whale_s1.png'},{n:'Cá Voi Nhỏ',img:'whale_s2.png'},{n:'Cá Voi Đại Dương',img:'whale_s3.png'}],
  skills:{
   a:{id:'tideheal',n:'Hồi Phục Thủy Triều',type:'heal',val:60,d:'Hồi lại khiên đội bằng dòng nước chữa lành.'},
   p:{id:'tide',n:'Thủy Triều',type:'tide',val:20,d:'Bị động: khi mất một tim, hồi lại 20 khiên.'},
   u:{id:'tideguard',n:'Thủy Triều Thần',type:'heal',val:120,d:'Tuyệt kỹ: hồi lại nhiều khiên cho cả đội.'}}},
 {id:'owl',n:'Cú Thông Thái',el:'nature',rar:'rare',egg:'forest',rate:0.30,
  base:{hp:75,atk:16,def:10,spd:16},perLv:{hp:6,atk:2,def:1,spd:1},
  stages:[{n:'Cú Con',img:'owl_s1.png'},{n:'Cú Thông Thái',img:'owl_s2.png'},{n:'Cú Hiền Triết',img:'owl_s3.png'}],
  skills:{
   a:{id:'leafheal',n:'Hồi Phục Lá',type:'heal',val:65,d:'Hồi lại khiên đội bằng sức mạnh lá rừng.'},
   p:{id:'wisdom',n:'Cổ Vũ Học Tập',type:'wisdom',val:1,d:'Bị động: mỗi chuỗi 3 câu đúng liên tiếp cho thêm 1 năng lượng.'},
   u:{id:'sageheal',n:'Hồi Phục Hiền Triết',type:'heal',val:130,d:'Tuyệt kỹ: hồi lại nhiều khiên cho cả đội.'}}},
 {id:'rabbit',n:'Thỏ Ngọc',el:'nature',rar:'common',egg:'forest',rate:0.25,
  base:{hp:70,atk:14,def:9,spd:20},perLv:{hp:6,atk:1,def:1,spd:2},
  stages:[{n:'Thỏ Ngọc Nhỏ',img:'rabbit_s1.png'},{n:'Thỏ Ngọc',img:'rabbit_s2.png'},{n:'Thỏ Ngọc Thần',img:'rabbit_s3.png'}],
  skills:{
   a:{id:'leafheal',n:'Hồi Phục Lá',type:'heal',val:55,d:'Hồi lại khiên đội bằng sức mạnh lá rừng.'},
   p:{id:'moon',n:'Ánh Trăng',type:'moon',val:10,d:'Bị động: bắt đầu trận với thêm 10 khiên.'},
   u:{id:'sageheal',n:'Hồi Phục Hiền Triết',type:'heal',val:110,d:'Tuyệt kỹ: hồi lại nhiều khiên cho cả đội.'}}},
 {id:'bear',n:'Gấu Mật Ong',el:'nature',rar:'common',egg:'forest',rate:0.25,
  base:{hp:115,atk:15,def:13,spd:7},perLv:{hp:9,atk:2,def:1,spd:0},
  stages:[{n:'Gấu Con',img:'bear_s1.png'},{n:'Gấu Mật Ong',img:'bear_s2.png'},{n:'Gấu Mật Vàng',img:'bear_s3.png'}],
  skills:{
   a:{id:'honeyheal',n:'Mật Ngọt',type:'heal',val:60,d:'Hồi lại khiên đội bằng mật ong ngọt ngào.'},
   p:{id:'honey',n:'Tổ Mật',type:'honey',val:10,d:'Bị động: bắt đầu trận với thêm 10 khiên.'},
   u:{id:'sageheal',n:'Mật Vàng Thần',type:'heal',val:120,d:'Tuyệt kỹ: hồi lại nhiều khiên cho cả đội.'}}},
 {id:'deer',n:'Hươu Rừng',el:'nature',rar:'common',egg:'forest',rate:0.20,
  base:{hp:80,atk:15,def:10,spd:18},perLv:{hp:7,atk:1,def:1,spd:1},
  stages:[{n:'Hươu Con',img:'deer_s1.png'},{n:'Hươu Rừng',img:'deer_s2.png'},{n:'Hươu Rừng Thần',img:'deer_s3.png'}],
  skills:{
   a:{id:'leafheal',n:'Hồi Phục Lá',type:'heal',val:60,d:'Hồi lại khiên đội bằng sức mạnh lá rừng.'},
   p:{id:'grove',n:'Rừng Thiêng',type:'grove',val:15,d:'Bị động: bắt đầu trận với thêm 15 khiên.'},
   u:{id:'sageheal',n:'Hồi Phục Hiền Triết',type:'heal',val:120,d:'Tuyệt kỹ: hồi lại nhiều khiên cho cả đội.'}}},
 {id:'cat',n:'Mèo Phép',el:'dark',rar:'rare',egg:'dark',rate:0.60,
  base:{hp:72,atk:19,def:8,spd:19},perLv:{hp:6,atk:2,def:1,spd:1},
  stages:[{n:'Mèo Phép Nhỏ',img:'cat_s1.png'},{n:'Mèo Phép',img:'cat_s2.png'},{n:'Mèo Phép Thuật',img:'cat_s3.png'}],
  skills:{
   a:{id:'darkbolt',n:'Tia Bóng Tối',type:'dmg',val:28,d:'Bắn tia bóng tối gây sát thương lớn cho boss.'},
   p:{id:'arcane',n:'Huyền Bí',type:'arcane',val:1,d:'Bị động: bắt đầu trận với thêm 1 năng lượng.'},
   u:{id:'darknova',n:'Bóng Tối Thần',type:'dmg',val:58,d:'Tuyệt kỹ: vụ nổ bóng tối gây sát thương rất lớn.'}}},
 {id:'wolf',n:'Sói Sấm',el:'thunder',rar:'rare',egg:'dark',rate:0.40,
  base:{hp:85,atk:19,def:10,spd:17},perLv:{hp:7,atk:2,def:1,spd:1},
  stages:[{n:'Sói Sấm Nhỏ',img:'wolf_s1.png'},{n:'Sói Sấm',img:'wolf_s2.png'},{n:'Sói Sấm Thần',img:'wolf_s3.png'}],
  skills:{
   a:{id:'thunderbolt',n:'Tia Sấm',type:'dmg',val:28,d:'Đánh tia sấm gây sát thương lớn cho boss.'},
   p:{id:'storm',n:'Bão Sấm',type:'storm',val:8,d:'Bị động: khi chuỗi đúng từ 3 trở lên, mỗi câu đúng gây thêm 8 sát thương.'},
   u:{id:'stormgod',n:'Sấm Thần',type:'dmg',val:58,d:'Tuyệt kỹ: cơn bão sấm gây sát thương rất lớn.'}}},
 {id:'unicorn',n:'Kỳ Lân Ánh Sáng',el:'light',rar:'legendary',egg:'light',rate:0.70,
  base:{hp:90,atk:17,def:12,spd:18},perLv:{hp:7,atk:2,def:1,spd:1},
  stages:[{n:'Kỳ Lân Nhỏ',img:'unicorn_s1.png'},{n:'Kỳ Lân Ánh Sáng',img:'unicorn_s2.png'},{n:'Kỳ Lân Thánh Quang',img:'unicorn_s3.png'}],
  skills:{
   a:{id:'lightheal',n:'Ánh Sáng Chữa Lành',type:'heal',val:75,d:'Hồi lại khiên đội bằng ánh sáng thánh.'},
   p:{id:'holy',n:'Thánh Quang',type:'holy',val:30,d:'Bị động: khi mất một tim, hồi lại 30 khiên.'},
   u:{id:'holyguard',n:'Thánh Quang Thần',type:'heal',val:150,d:'Tuyệt kỹ: hồi lại rất nhiều khiên cho cả đội.'}}}
];
var PET_EGGS=[
 {id:'fire',n:'Trứng Lửa',el:'fire',price:500,hatchMin:60,img:'egg_fire.png',d:'Nở ra thú hệ Lửa: Rồng Lửa, Chim Phượng.'},
 {id:'ice',n:'Trứng Băng',el:'ice',price:800,hatchMin:90,img:'egg_ice.png',d:'Nở ra thú hệ Băng/Nước: Hồ Ly Băng, Rùa Pha Lê, Cá Voi Nhỏ.'},
 {id:'forest',n:'Trứng Rừng',el:'nature',price:600,hatchMin:60,img:'egg_forest.png',d:'Nở ra thú hệ Rừng: Cú Thông Thái, Thỏ Ngọc, Gấu Mật Ong, Hươu Rừng.'},
 {id:'light',n:'Trứng Ánh Sáng',el:'light',price:1500,hatchMin:180,img:'egg_light.png',d:'Nở ra thú hệ Ánh Sáng: Kỳ Lân Ánh Sáng (và đôi khi Chim Phượng).'},
 {id:'dark',n:'Trứng Bóng Tối',el:'dark',price:2000,hatchMin:240,img:'egg_dark.png',d:'Nở ra thú hệ Bóng Tối/Sấm: Mèo Phép, Sói Sấm.'}
];
/* Light egg can also hatch a phoenix (30%) — the only cross-egg case. */
var PET_EGG_EXTRA={light:[{sp:'phoenix',rate:0.30}]};
var PET_MATERIALS=[
 {id:'stone_fire',n:'Tinh Thể Lửa',el:'fire',price:200,d:'Dùng để tiến hóa thú hệ Lửa.'},
 {id:'stone_ice',n:'Tinh Thể Băng',el:'ice',price:200,d:'Dùng để tiến hóa thú hệ Băng.'},
 {id:'stone_nature',n:'Tinh Thể Rừng',el:'nature',price:200,d:'Dùng để tiến hóa thú hệ Rừng.'},
 {id:'stone_water',n:'Tinh Thể Nước',el:'water',price:200,d:'Dùng để tiến hóa thú hệ Nước.'},
 {id:'stone_thunder',n:'Tinh Thể Sấm',el:'thunder',price:200,d:'Dùng để tiến hóa thú hệ Sấm.'},
 {id:'stone_light',n:'Tinh Thể Ánh Sáng',el:'light',price:200,d:'Dùng để tiến hóa thú hệ Ánh Sáng.'},
 {id:'stone_dark',n:'Tinh Thể Bóng Tối',el:'dark',price:200,d:'Dùng để tiến hóa thú hệ Bóng Tối.'},
 {id:'feather',n:'Lông Vàng',el:null,price:300,d:'Nguyên liệu tiến hóa chung.'},
 {id:'fruit',n:'Trái Phép Thuật',el:null,price:300,d:'Nguyên liệu tiến hóa chung.'}
];
var PET_EVO_COST=[
 {stone:10,feather:3,fruit:3,coins:5000},   /* stage 0 -> 1 */
 {stone:20,feather:5,fruit:10,coins:20000}  /* stage 1 -> 2 */
];
var PET_EVO_LV=[10,20]; /* required pet level for stage 0->1, 1->2 */
var PET_SHOP_EGGS=PET_EGGS;
/* Collection milestones: owned distinct forms -> reward (once each). */
var PET_COLLECTION_REWARDS=[
 {forms:6,gems:5,mats:{},d:'Sưu tập 6 hình thái: +5 💎'},
 {forms:12,gems:10,mats:{},egg:'forest',d:'Sưu tập 12 hình thái: +10 💎, 1 Trứng Rừng'},
 {forms:24,gems:20,mats:{feather:5,fruit:5},d:'Sưu tập 24 hình thái: +20 💎, 5 Lông Vàng, 5 Trái Phép Thuật'},
 {forms:36,gems:50,mats:{},title:'Bậc Thầy Thú Cưng',d:'Sưu tập đủ 36 hình thái: +50 💎, danh hiệu “Bậc Thầy Thú Cưng”'}
];
/* Affection milestones per pet (once each): 500/1000/1500. */
var PET_AFFECTION_REWARDS=[
 {aff:500,gems:5,d:'Thân thiết 500: +5 💎'},
 {aff:1000,gems:10,d:'Thân thiết 1000: +10 💎'},
 {aff:1500,gems:20,egg:null,d:'Thân thiết 1500: +20 💎'}
];
/* Hatch: learning speed-up + gems. */
var PET_HATCH={
  learnSecPerCorrect:30,   /* each correct answer cuts 30s off the active hatch */
  speedMin:30, speedGems:5, /* -30 min */
  instantGems:20            /* hatch now */
};
var PET_FEED={coins:100,xp:25,aff:10}; /* feed: 100 coins -> +25 XP, +10 affection */
var PET_XP_PER_CORRECT=2;              /* each correct answer: +2 XP to every team pet */
var PET_AFF_PER_CORRECT=1;             /* each correct answer: +1 affection to every team pet */
var PET_TEAM_SKILL_COST=6;             /* energy to cast the team skill */
var PET_TEAM_SKILL_MAX_ENERGY=10;
var PET_SHIELD_DRAIN=60;               /* shield lost per boss counterattack (before reductions) */
var PET_SHIELD_DRAIN_MIN=30;
window.__V23_DATA={
  version:'15.0.0',
  elements:PET_ELEMENTS,rarity:PET_RARITY,
  species:PET_SPECIES,eggs:PET_EGGS,eggExtra:PET_EGG_EXTRA,
  materials:PET_MATERIALS,evoCost:PET_EVO_COST,evoLv:PET_EVO_LV,
  collectionRewards:PET_COLLECTION_REWARDS,
  affectionRewards:PET_AFFECTION_REWARDS,
  hatch:PET_HATCH,feed:PET_FEED,
  xpPerCorrect:PET_XP_PER_CORRECT,affPerCorrect:PET_AFF_PER_CORRECT,
  teamSkillCost:PET_TEAM_SKILL_COST,teamSkillMaxEnergy:PET_TEAM_SKILL_MAX_ENERGY,
  shieldDrain:PET_SHIELD_DRAIN,shieldDrainMin:PET_SHIELD_DRAIN_MIN,
  stageMult:PET_STAGE_MULT,stageMaxLv:PET_STAGE_MAXLV,stageDmg:PET_STAGE_DMG
};
})();
