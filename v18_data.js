/* ===== V18 DATA — 30 NEW BOSSES (V10) =====
   Additive layer. 3 arenas x 10 bosses.
   - Arena 1 "en": English Challenge — new versions of the 10 English skills.
     IDs use the v10_ prefix so they never collide with the 10 V15 bosses
     (slime, goblin, dragon, ghost, spider, owl, tiger, wizard,
     dictionary, king) whose fights still run in v15.js untouched.
   - Arena 2 "el": Elemental — EN or KO questions (player picks).
   - Arena 3 "leg": Legendary — 3 phases (P1 / P2 at <=50% / P3 at <=20%).
   Images: assets/bosses/v10/<id>.png — cut from the 3 posters Anh sent
   (see tools/split_bosses.py + ASSET_REPORT_V10.md).
   Fields: id, n (EN name), vi, img, arena, el, rarity, lv, hp, def,
   skill {id,n,desc}, unlock {type}, mode, diff, lang, lib, reward
   {xp,gems,item,stone?,title?}.
   def = flat damage reduction on the player's hits (min 2 dmg).
   reward.item / .stone / .title are first-win only; replays give +10 XP.
*/
window.__V18_BOSSES = window.__V18_BOSSES || {};
window.__V18_BOSSES.arenas = [
  {id:'en', n:'English Challenge Arena', vi:'Đấu Trường Thử Thách Tiếng Anh',
   desc:'10 boss gắn với 10 kỹ năng học tiếng Anh: từ vựng, chính tả, ngữ pháp, nghe, xếp câu, đọc hiểu, tốc độ, phát âm, từ nâng cao và boss cuối tổng hợp.',
   need:'Luôn mở. Mở khóa theo thứ tự trong đấu trường.',
   icon:'🇬🇧', color:'#7C5CFF'},
  {id:'el', n:'Elemental Arena', vi:'Đấu Trường Nguyên Tố',
   desc:'10 boss nguyên tố. Trước mỗi trận, chọn học tiếng Anh hoặc tiếng Hàn. Mỗi nguyên tố có kỹ năng riêng — nhưng không kỹ năng nào làm câu hỏi trở nên không thể trả lời.',
   need:'Cần thắng tổng cộng 5 boss (boss cũ V15 + Đấu Trường 1). Mở khóa theo thứ tự trong đấu trường.',
   icon:'🔥', color:'#E8445F'},
  {id:'leg', n:'Legendary Boss Arena', vi:'Đấu Trường Huyền Thoại',
   desc:'10 boss mạnh nhất. Mỗi boss có 3 giai đoạn: P1 khởi đầu, P2 cường hóa khi HP còn 50%, P3 tuyệt kỹ khi HP còn 20%. Độ khó câu hỏi tăng theo tiến trình học của bạn.',
   need:'Cần thắng 5 boss nguyên tố. Mở khóa theo thứ tự trong đấu trường.',
   icon:'👑', color:'#F4A259'}
];
window.__V18_BOSSES.elements = {
  fire:  {n:'Lửa',       ic:'🔥', color:'#E8445F', skill:'Thiêu đốt: trả lời sai, boss hồi HP.'},
  ice:   {n:'Băng',      ic:'❄️', color:'#4FA8FF', skill:'Đóng băng: giảm thời gian trả lời.'},
  thunder:{n:'Sấm',      ic:'⚡', color:'#FFD23F', skill:'Tấn công liên tiếp khi bạn trả lời sai.'},
  water: {n:'Nước',      ic:'💧', color:'#2E9BFF', skill:'Hồi HP theo thời gian.'},
  wind:  {n:'Gió',       ic:'🌪️', color:'#7FE3D0', skill:'Tăng tốc: đồng hồ ngắn hơn, sát thương của bạn cao hơn.'},
  earth: {n:'Đất',       ic:'⛰️', color:'#B07D4F', skill:'Tạo lá chắn / phòng thủ cao.'},
  dark:  {n:'Bóng tối',  ic:'🌙', color:'#8E7CFF', skill:'Ẩn một phần gợi ý (IPA).'},
  nature:{n:'Thiên nhiên',ic:'🌿', color:'#58B368', skill:'Hồi phục theo thời gian.'},
  light: {n:'Ánh sáng',  ic:'✨', color:'#FFC93C', skill:'Thanh tẩy hiệu ứng bất lợi.'}
};
window.__V18_BOSSES.rarities = {
  common:   {n:'Thường',    color:'#9AA5B1'},
  rare:     {n:'Hiếm',      color:'#4FA8FF'},
  epic:     {n:'Sử thi',    color:'#B388FF'},
  legendary:{n:'Huyền thoại',color:'#FFB020'},
  mythic:   {n:'Thần thoại',color:'#FF5C8A'}
};

/* ---------- ARENA 1: ENGLISH CHALLENGE (10) ---------- */
window.__V18_BOSSES.en = [
{id:'v10_slime',n:'Vocabulary Slime King',vi:'Vua Slime Từ Vựng',img:'assets/bosses/v10/v10_slime.png',arena:'en',el:'nature',rarity:'common',lv:1,hp:70,def:0,mode:'mc',diff:'A1',lang:'both',lib:'a1a2',skill:{id:'none',n:'Làm quen',desc:'Không có kỹ năng đặc biệt — boss làm quen.'},unlock:{type:'prev'},reward:{xp:50,gems:1,item:'Slime Crown'}},
{id:'v10_goblin',n:'Spelling Goblin',vi:'Yêu Tinh Chính Tả',img:'assets/bosses/v10/v10_goblin.png',arena:'en',el:'dark',rarity:'common',lv:2,hp:80,def:0,mode:'type',diff:'A1',lang:'both',lib:'',skill:{id:'timer',n:'Đồng Hồ Cát',desc:'Đồng hồ 12 giây / câu — hết giờ tính là sai.'},unlock:{type:'prev'},reward:{xp:60,gems:1,item:'Goblin Quill'}},
{id:'v10_dragon',n:'Grammar Dragon',vi:'Rồng Ngữ Pháp',img:'assets/bosses/v10/v10_dragon.png',arena:'en',el:'fire',rarity:'common',lv:3,hp:100,def:1,mode:'grammar',diff:'A2',lang:'both',lib:'',skill:{id:'enrage_timer',n:'Nộ Long',desc:'Khi HP dưới 50%, đồng hồ 10 giây / câu.'},unlock:{type:'prev'},reward:{xp:70,gems:2,item:'Dragon Grammar'}},
{id:'v10_ghost',n:'Sound Spirit',vi:'Ma Thần Âm Thanh',img:'assets/bosses/v10/v10_ghost.png',arena:'en',el:'light',rarity:'rare',lv:4,hp:90,def:0,mode:'listen',diff:'A2',lang:'both',lib:'',skill:{id:'one_listen',n:'Tiếng Vang',desc:'Chỉ được nghe 1 lần duy nhất mỗi câu.'},unlock:{type:'prev'},reward:{xp:70,gems:2,item:'Ghost Earbuds'}},
{id:'v10_spider',n:'Sentence Spider',vi:'Nhện Câu Chữ',img:'assets/bosses/v10/v10_spider.png',arena:'en',el:'dark',rarity:'rare',lv:5,hp:100,def:1,mode:'builder',diff:'A2',lang:'both',lib:'',skill:{id:'shuffle',n:'Mạng Nhện',desc:'Câu bị xáo trộn hoàn toàn — chọn câu đúng trong 4 đáp án.'},unlock:{type:'prev'},reward:{xp:80,gems:2,item:'Spider Web'}},
{id:'v10_owl',n:'Oxford Owl',vi:'Cú Oxford',img:'assets/bosses/v10/v10_owl.png',arena:'en',el:'light',rarity:'rare',lv:6,hp:120,def:1,mode:'read',diff:'B1',lang:'both',lib:'oxford',skill:{id:'read2',n:'Mắt Cú',desc:'Đọc đoạn văn rồi trả lời 2 câu hỏi liên tiếp. Từ vựng lấy từ Oxford 3000.'},unlock:{type:'prev'},reward:{xp:90,gems:2,item:'Oxford Feather'}},
{id:'v10_tiger',n:'Speed Tiger',vi:'Hổ Tốc Độ',img:'assets/bosses/v10/v10_tiger.png',arena:'en',el:'thunder',rarity:'epic',lv:7,hp:110,def:1,mode:'speed',diff:'B1',lang:'both',lib:'',skill:{id:'speed',n:'Tốc Độ Sấm Sét',desc:'Đồng hồ 8 giây / câu, sát thương của bạn x1.5.'},unlock:{type:'prev'},reward:{xp:90,gems:2,item:'Tiger Stopwatch'}},
{id:'v10_wizard',n:'Pronunciation Wizard',vi:'Pháp Sư Phát Âm',img:'assets/bosses/v10/v10_wizard.png',arena:'en',el:'light',rarity:'epic',lv:8,hp:130,def:2,mode:'speak',diff:'B1',lang:'both',lib:'',skill:{id:'speak',n:'Giọng Thần',desc:'Nói đúng từ để gây sát thương. Không có micro? Dùng chế độ nghe-chọn thay thế.'},unlock:{type:'prev'},reward:{xp:100,gems:3,item:'Wizard Mic'}},
{id:'v10_dict',n:'Dark Dictionary',vi:'Từ Điển Bóng Tối',img:'assets/bosses/v10/v10_dict.png',arena:'en',el:'dark',rarity:'epic',lv:9,hp:150,def:2,mode:'mixed',diff:'B2',lang:'both',lib:'',skill:{id:'mixed_hard',n:'Trang Tối',desc:'Câu hỏi trộn mọi kỹ năng, độ khó tăng dần.'},unlock:{type:'prev'},reward:{xp:120,gems:3,item:'Dark Page+'}},
{id:'v10_king',n:'English King',vi:'Vua Tiếng Anh',img:'assets/bosses/v10/v10_king.png',arena:'en',el:'light',rarity:'legendary',lv:10,hp:200,def:3,mode:'mixed',diff:'B2',lang:'both',lib:'',skill:{id:'final',n:'Vương Miện',desc:'Boss cuối: trộn mọi kỹ năng + đồng hồ 12 giây. Cần thắng 9 boss trước trong đấu trường.'},unlock:{type:'prev'},reward:{xp:200,gems:5,item:'English King Crown',title:'Vua Tiếng Anh'}}
];

/* ---------- ARENA 2: ELEMENTAL (10) ---------- */
window.__V18_BOSSES.el = [
{id:'v10_unicorn',n:'Celestial Unicorn',vi:'Kỳ Lân Thần Vũ',img:'assets/bosses/v10/v10_unicorn.png',arena:'el',el:'light',rarity:'rare',lv:11,hp:130,def:1,mode:'mc',diff:'A2',lang:'both',lib:'',skill:{id:'cleanse',n:'Thanh Tẩy',desc:'Ánh sáng thanh tẩy: lần trả lời sai đầu tiên trong trận không mất tim.'},unlock:{type:'prev'},reward:{xp:90,gems:2,item:'Unicorn Horn',stone:'Đá Ánh Sáng'}},
{id:'v10_icedragon',n:'Ice Dragon',vi:'Long Băng Tuyết',img:'assets/bosses/v10/v10_icedragon.png',arena:'el',el:'ice',rarity:'rare',lv:12,hp:140,def:1,mode:'listen',diff:'A2',lang:'both',lib:'',skill:{id:'freeze',n:'Đóng Băng',desc:'Băng giá làm chậm bạn: mỗi câu chỉ có 15 giây để trả lời.'},unlock:{type:'prev'},reward:{xp:95,gems:2,item:'Ice Scale',stone:'Đá Băng'}},
{id:'v10_panda',n:'Bamboo Knight Panda',vi:'Gấu Trúc Hiệp Sĩ',img:'assets/bosses/v10/v10_panda.png',arena:'el',el:'nature',rarity:'rare',lv:13,hp:150,def:2,mode:'builder',diff:'A2',lang:'both',lib:'',skill:{id:'shield',n:'Lá Chắn Đất',desc:'Gấu trúc dựng lá chắn 30 HP: sát thương bạn gây ra chỉ còn một nửa cho tới khi lá chắn vỡ.'},unlock:{type:'prev'},reward:{xp:100,gems:2,item:'Bamboo Staff',stone:'Đá Đất'}},
{id:'v10_magma',n:'Magma Colossus',vi:'Dung Nham Khổng Lồ',img:'assets/bosses/v10/v10_magma.png',arena:'el',el:'fire',rarity:'epic',lv:14,hp:160,def:2,mode:'type',diff:'B1',lang:'both',lib:'',skill:{id:'burn',n:'Thiêu Đốt',desc:'Lửa thiêu đốt: mỗi lần bạn trả lời sai, boss hồi 8 HP.'},unlock:{type:'prev'},reward:{xp:110,gems:3,item:'Magma Core',stone:'Đá Lửa'}},
{id:'v10_fox',n:'Cherry Blossom Fox',vi:'Hồ Ly Anh Đào',img:'assets/bosses/v10/v10_fox.png',arena:'el',el:'nature',rarity:'epic',lv:15,hp:170,def:2,mode:'grammar',diff:'B1',lang:'both',lib:'',skill:{id:'heal',n:'Hoa Anh Đào',desc:'Hồ ly hồi phục: sau mỗi 4 câu hỏi, boss hồi 6 HP.'},unlock:{type:'prev'},reward:{xp:115,gems:3,item:'Sakura Charm',stone:'Đá Hoa',title:'Bạn Của Hồ Ly'}},
{id:'v10_octopus',n:'Deep Sea Octopus',vi:'Bạch Tuộc Biển Sâu',img:'assets/bosses/v10/v10_octopus.png',arena:'el',el:'water',rarity:'epic',lv:16,hp:180,def:2,mode:'mc',diff:'B1',lang:'both',lib:'',skill:{id:'regen',n:'Dòng Chảy',desc:'Nước hồi HP: sau mỗi 2 lần bạn trả lời sai, boss hồi 10 HP.'},unlock:{type:'prev'},reward:{xp:120,gems:3,item:'Ocean Pearl',stone:'Đá Nước'}},
{id:'v10_griffin',n:'Storm Griffin',vi:'Sư Điểu Thần Phong',img:'assets/bosses/v10/v10_griffin.png',arena:'el',el:'wind',rarity:'epic',lv:17,hp:190,def:2,mode:'speed',diff:'B1',lang:'both',lib:'',skill:{id:'gale',n:'Cơn Lốc',desc:'Gió tăng tốc: đồng hồ 8 giây / câu, nhưng sát thương của bạn x1.25.'},unlock:{type:'prev'},reward:{xp:125,gems:3,item:'Storm Feather',stone:'Đá Gió'}},
{id:'v10_turtle',n:'Mountain Turtle',vi:'Rùa Núi Trường Thọ',img:'assets/bosses/v10/v10_turtle.png',arena:'el',el:'earth',rarity:'legendary',lv:18,hp:200,def:4,mode:'read',diff:'B2',lang:'both',lib:'',skill:{id:'shell',n:'Mai Rùa',desc:'Phòng thủ thép: sát thương bạn gây ra giảm 4 (tối thiểu 2).'},unlock:{type:'prev'},reward:{xp:135,gems:4,item:'Turtle Shell',stone:'Đá Núi',title:'Phá Giáp'}},
{id:'v10_mage',n:'Night Shadow Mage',vi:'Pháp Sư Bóng Đêm',img:'assets/bosses/v10/v10_mage.png',arena:'el',el:'dark',rarity:'legendary',lv:19,hp:220,def:3,mode:'speak',diff:'B2',lang:'both',lib:'',skill:{id:'veil',n:'Màn Đêm',desc:'Bóng tối che gợi ý: câu hỏi trắc nghiệm không hiện phiên âm IPA.'},unlock:{type:'prev'},reward:{xp:145,gems:4,item:'Shadow Orb',stone:'Đá Bóng Tối'}},
{id:'v10_fairy',n:'Forest Flower Fairy',vi:'Tiên Hoa Rừng Xanh',img:'assets/bosses/v10/v10_fairy.png',arena:'el',el:'nature',rarity:'legendary',lv:20,hp:240,def:3,mode:'mixed',diff:'B2',lang:'both',lib:'',skill:{id:'bloom',n:'Hoa Rừng',desc:'Thiên nhiên hồi phục: sau mỗi 3 câu hỏi, boss hồi 8 HP.'},unlock:{type:'prev'},reward:{xp:160,gems:4,item:'Fairy Bloom',stone:'Đá Rừng',title:'Người Bảo Vệ Rừng'}}
];

/* ---------- ARENA 3: LEGENDARY (10) ---------- */
window.__V18_BOSSES.leg = [
{id:'v10_firedragon',n:'Inferno Dragon',vi:'Hắc Long Nham Hỏa',img:'assets/bosses/v10/v10_firedragon.png',arena:'leg',el:'fire',rarity:'epic',lv:21,hp:220,def:2,mode:'mixed',diff:'B1',lang:'both',lib:'',skill:{id:'inferno',n:'Hỏa Ngục',desc:'P2 (HP ≤50%): đồng hồ 10 giây / câu. P3 (HP ≤20%): tuyệt kỹ Hỏa Ngục — trả lời sai mất 2 tim.'},unlock:{type:'prev'},reward:{xp:160,gems:4,item:'Inferno Fang',title:'Kẻ Săn Rồng'}},
{id:'v10_icewolf',n:'Frost Wolf King',vi:'Lang Vương Băng Sương',img:'assets/bosses/v10/v10_icewolf.png',arena:'leg',el:'ice',rarity:'epic',lv:22,hp:240,def:2,mode:'mixed',diff:'B1',lang:'both',lib:'',skill:{id:'blizzard',n:'Bão Tuyết',desc:'P2: đồng hồ 10 giây / câu. P3: tuyệt kỹ Bão Tuyết — trả lời sai mất 2 tim.'},unlock:{type:'prev'},reward:{xp:170,gems:4,item:'Frost Fang',title:'Thợ Săn Tuyết'}},
{id:'v10_thunderlion',n:'Thunder Lion God',vi:'Lôi Thần Sư Vương',img:'assets/bosses/v10/v10_thunderlion.png',arena:'leg',el:'thunder',rarity:'epic',lv:23,hp:260,def:3,mode:'mixed',diff:'B2',lang:'both',lib:'',skill:{id:'storm',n:'Bão Sấm',desc:'P2: boss đánh liên tiếp — trả lời sai mất 2 tim. P3: tuyệt kỹ Bão Sấm, đồng hồ 8 giây / câu.'},unlock:{type:'prev'},reward:{xp:180,gems:5,item:'Thunder Mane',title:'Chúa Tể Sấm Sét'}},
{id:'v10_seaoctopus',n:'Ocean King Octopus',vi:'Bạch Tuộc Đại Dương',img:'assets/bosses/v10/v10_seaoctopus.png',arena:'leg',el:'water',rarity:'epic',lv:24,hp:280,def:3,mode:'mixed',diff:'B2',lang:'both',lib:'',skill:{id:'tide',n:'Thủy Triều',desc:'P2: boss hồi 10 HP sau mỗi 3 câu hỏi. P3: tuyệt kỹ Thủy Triều — trả lời sai mất 2 tim.'},unlock:{type:'prev'},reward:{xp:190,gems:5,item:'Tide Crown',title:'Vua Biển'}},
{id:'v10_titan',n:'Magma Titan',vi:'Titan Dung Nham',img:'assets/bosses/v10/v10_titan.png',arena:'leg',el:'fire',rarity:'legendary',lv:25,hp:300,def:3,mode:'mixed',diff:'B2',lang:'both',lib:'',skill:{id:'quake',n:'Địa Chấn',desc:'P2: lá chắn 40 HP (sát thương giảm một nửa tới khi vỡ). P3: tuyệt kỹ Địa Chấn — trả lời sai mất 2 tim.'},unlock:{type:'prev'},reward:{xp:210,gems:5,item:'Titan Heart',title:'Kẻ Hạ Titan'}},
{id:'v10_phoenix',n:'Holy Phoenix',vi:'Phượng Hoàng Thánh Quang',img:'assets/bosses/v10/v10_phoenix.png',arena:'leg',el:'light',rarity:'legendary',lv:26,hp:320,def:3,mode:'mixed',diff:'B2',lang:'both',lib:'',skill:{id:'rebirth',n:'Tái Sinh',desc:'P2: phượng hoàng hồi 20 HP một lần khi HP xuống dưới 50%. P3: tuyệt kỹ Thánh Quang — trả lời sai mất 2 tim.'},unlock:{type:'prev'},reward:{xp:230,gems:6,item:'Phoenix Feather',title:'Người Tái Sinh'}},
{id:'v10_voidghost',n:'Void Phantom',vi:'Bóng Ma Hư Không',img:'assets/bosses/v10/v10_voidghost.png',arena:'leg',el:'dark',rarity:'legendary',lv:27,hp:340,def:4,mode:'mixed',diff:'B2',lang:'both',lib:'',skill:{id:'void',n:'Hư Không',desc:'P2: ẩn IPA trong câu hỏi trắc nghiệm. P3: tuyệt kỹ Hư Không — trả lời sai mất 2 tim.'},unlock:{type:'prev'},reward:{xp:250,gems:6,item:'Void Shard',title:'Kẻ Nhìn Xuyên Bóng Tối'}},
{id:'v10_godturtle',n:'Divine Tortoise',vi:'Huyền Quy Thần Thú',img:'assets/bosses/v10/v10_godturtle.png',arena:'leg',el:'earth',rarity:'legendary',lv:28,hp:360,def:5,mode:'mixed',diff:'B2',lang:'both',lib:'',skill:{id:'mountain',n:'Núi Thần',desc:'P2: phòng thủ tăng thêm (sát thương bạn gây ra giảm thêm 3). P3: tuyệt kỹ Núi Thần — trả lời sai mất 2 tim.'},unlock:{type:'prev'},reward:{xp:270,gems:7,item:'Divine Shell',title:'Phá Núi Thần'}},
{id:'v10_ninetails',n:'Nine-Tailed Fox',vi:'Cửu Vĩ Ma Ảnh',img:'assets/bosses/v10/v10_ninetails.png',arena:'leg',el:'dark',rarity:'legendary',lv:29,hp:380,def:4,mode:'mixed',diff:'B2',lang:'both',lib:'',skill:{id:'illusion',n:'Ảo Ảnh',desc:'P2: đáp án bị xáo trộn thêm một lần nữa. P3: tuyệt kỹ Ảo Ảnh — trả lời sai mất 2 tim.'},unlock:{type:'prev'},reward:{xp:290,gems:7,item:'Nine Tails',title:'Người Thuần Hồ Ly'}},
{id:'v10_ancienttree',n:'Ancient Tree God',vi:'Cổ Thụ Thần Mộc',img:'assets/bosses/v10/v10_ancienttree.png',arena:'leg',el:'nature',rarity:'mythic',lv:30,hp:420,def:5,mode:'mixed',diff:'B2',lang:'both',lib:'',skill:{id:'worldtree',n:'Cội Nguồn',desc:'P2: boss hồi 12 HP sau mỗi 3 câu hỏi. P3: tuyệt kỹ Cội Nguồn — trả lời sai mất 2 tim, đồng hồ 8 giây / câu.'},unlock:{type:'prev'},reward:{xp:320,gems:8,item:'World Seed',title:'Chúa Tể Rừng Xanh'}}
];

/* ---------- THE 10 ORIGINAL V15 BOSSES (display-only copy for the Collection) ----------
   Fights for these still run in v15.js untouched. This copy only lets the
   Collection show all 40 bosses in one place. Win state is read live from
   S.v7.en15.bosses via __v15.en15(). */
window.__V18_BOSSES.old = [
{id:'slime',n:'Vocabulary Slime',vi:'Nhớt từ vựng',img:'assets/bosses/dokkaebi.png',arena:'old',el:'nature',rarity:'common',lv:1,hp:60,def:0,mode:'mc',diff:'A1',lang:'en',lib:'',skill:{id:'none',n:'Làm quen',desc:'Không có kỹ năng đặc biệt — boss làm quen.'},reward:{xp:40,gems:1,item:'Slime Badge'}},
{id:'goblin',n:'Spelling Goblin',vi:'Yêu tinh chính tả',img:'assets/bosses/gangsi.png',arena:'old',el:'dark',rarity:'common',lv:2,hp:70,def:0,mode:'type',diff:'A1',lang:'en',lib:'',skill:{id:'timer',n:'Đồng Hồ Cát',desc:'Đồng hồ 12 giây / câu — hết giờ tính là sai.'},reward:{xp:50,gems:1,item:'Goblin Hat'}},
{id:'dragon',n:'Grammar Dragon',vi:'Rồng ngữ pháp',img:'assets/bosses/gongnyong.png',arena:'old',el:'fire',rarity:'common',lv:3,hp:90,def:0,mode:'grammar',diff:'A2',lang:'en',lib:'',skill:{id:'enrage_timer',n:'Nộ Long',desc:'Đồng hồ 10 giây / câu khi HP dưới 50%.'},reward:{xp:60,gems:2,item:'Dragon Scale'}},
{id:'ghost',n:'Listening Ghost',vi:'Ma nghe hiểu',img:'assets/bosses/gwisin.png',arena:'old',el:'light',rarity:'rare',lv:4,hp:80,def:0,mode:'listen',diff:'A2',lang:'en',lib:'',skill:{id:'one_listen',n:'Tiếng Vang',desc:'Chỉ được nghe 1 lần duy nhất mỗi câu.'},reward:{xp:60,gems:2,item:'Ghost Lantern'}},
{id:'spider',n:'Sentence Spider',vi:'Nhện xếp câu',img:'assets/bosses/f4_treant.png',arena:'old',el:'dark',rarity:'rare',lv:5,hp:90,def:0,mode:'builder',diff:'A2',lang:'en',lib:'',skill:{id:'shuffle',n:'Mạng Nhện',desc:'Câu bị xáo trộn hoàn toàn — chọn câu đúng trong 4 đáp án.'},reward:{xp:60,gems:2,item:'Spider Silk'}},
{id:'owl',n:'Reading Owl',vi:'Cú đọc hiểu',img:'assets/bosses/astral_raven.png',arena:'old',el:'light',rarity:'rare',lv:6,hp:100,def:0,mode:'read',diff:'B1',lang:'en',lib:'',skill:{id:'read2',n:'Mắt Cú',desc:'Đọc đoạn văn rồi trả lời 2 câu hỏi liên tiếp.'},reward:{xp:70,gems:2,item:'Owl Feather'}},
{id:'tiger',n:'Speed Tiger',vi:'Hổ tốc độ',img:'assets/bosses/thunder_tiger.png',arena:'old',el:'thunder',rarity:'epic',lv:7,hp:100,def:0,mode:'speed',diff:'B1',lang:'en',lib:'',skill:{id:'speed',n:'Tốc Độ Sấm Sét',desc:'Đồng hồ 8 giây / câu, sát thương của bạn x1.5.'},reward:{xp:70,gems:2,item:'Tiger Claw'}},
{id:'wizard',n:'Pronunciation Wizard',vi:'Phù thủy phát âm',img:'assets/bosses/yong.png',arena:'old',el:'light',rarity:'epic',lv:8,hp:110,def:0,mode:'speak',diff:'B1',lang:'en',lib:'',skill:{id:'speak',n:'Giọng Thần',desc:'Nói đúng từ để gây sát thương. Không có micro? Dùng chế độ nghe-chọn thay thế.'},reward:{xp:80,gems:3,item:'Wizard Wand'}},
{id:'dictionary',n:'Dark Dictionary',vi:'Từ điển bóng tối',img:'assets/bosses/crystal_beetle_king.png',arena:'old',el:'dark',rarity:'epic',lv:9,hp:130,def:0,mode:'mixed',diff:'B2',lang:'en',lib:'',skill:{id:'mixed_hard',n:'Trang Tối',desc:'Câu hỏi trộn mọi kỹ năng, độ khó tăng dần.'},reward:{xp:90,gems:3,item:'Dark Page'}},
{id:'king',n:'English King',vi:'Vua tiếng Anh',img:'assets/bosses/coral_queen.png',arena:'old',el:'light',rarity:'legendary',lv:10,hp:160,def:0,mode:'mixed',diff:'B2',lang:'en',lib:'',skill:{id:'final',n:'Vương Miện',desc:'Boss cuối: trộn mọi kỹ năng + đồng hồ 12 giây. Cần thắng 9 boss trước.'},reward:{xp:150,gems:5,item:'English Crown'}}
];
window.__V18_BOSSES.all = function(){
  return window.__V18_BOSSES.old.concat(
    window.__V18_BOSSES.en, window.__V18_BOSSES.el, window.__V18_BOSSES.leg);
};
window.__V18_BOSSES.byId = function(id){
  var all = window.__V18_BOSSES.all();
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
};
