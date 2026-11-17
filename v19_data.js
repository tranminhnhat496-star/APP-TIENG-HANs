/* V19 data — Boss Map: 10 zones x 3 bosses = 30 Super Legendary bosses.
   IDs use the v11_ prefix (never collide with V15 old ids or V18 v10_ ids).
   Each boss has 5 skills: basic / elemental / tactical / passive / ultimate.
   Skill EFFECTS come from a fixed palette (see v19.js); names are unique
   per boss. Elements: V18's 9 + cosmic (Vũ trụ) for the Tinh Vân / Vô Cực
   zones. Images: assets/bosses/v11/<id>.png (3 transparent cutouts +
   27 tight portraits, see ASSET_REPORT_V11.md).
   Zone order follows the reference map poster (bottom -> top):
   z1 Hỏa Ngục, z2 Băng Vực, z3 Lôi Đình, z4 Hắc Ám, z5 Thiên Giới,
   z6 Đại Dương, z7 Cổ Thụ, z8 Cơ Giới, z9 Tinh Vân, z10 Vô Cực. */
(function(){
var EL={
 fire:{n:'Lửa',ic:'🔥',c:'#E8445F'},
 ice:{n:'Băng',ic:'❄️',c:'#7CC7FF'},
 thunder:{n:'Sấm',ic:'⚡',c:'#FFD23F'},
 water:{n:'Nước',ic:'💧',c:'#4FA8FF'},
 wind:{n:'Gió',ic:'🌪️',c:'#8FE3C0'},
 earth:{n:'Đất',ic:'⛰️',c:'#C98A4B'},
 dark:{n:'Bóng tối',ic:'🌙',c:'#9B7BFF'},
 nature:{n:'Thiên nhiên',ic:'🌿',c:'#7ED957'},
 light:{n:'Ánh sáng',ic:'⭐',c:'#FFE066'},
 cosmic:{n:'Vũ trụ',ic:'🌀',c:'#C77DFF'}
};
var RAR={legendary:{n:'Huyền thoại',c:'#B388FF'},mythic:{n:'Thần thoại',c:'#FFD23F'}};
var IMG=function(id){return 'assets/bosses/v11/'+id+'.png'};
/* skills: [basicName, elemId, elemName, tactId, tactName, passId, passName, ultName]
   elem ids: burn freeze chain veil cleanse regen heal gale shield rift
   tact ids: tshield theal ttimer tveil tenrage
   pass ids: bulwark vampiric swift thorns */
function B(id,n,vi,zone,el,rar,lv,hp,def,mode,diff,sk,ult,xp,gems,item,title){
  return {id:id,n:n,vi:vi,img:IMG(id),zone:zone,el:el,rarity:rar,lv:lv,hp:hp,def:def,
    mode:mode,diff:diff,lang:'both',
    skills:{basic:{n:sk[0]},
      elem:{id:sk[1],n:sk[2]},
      tact:{id:sk[3],n:sk[4]},
      pass:{id:sk[5],n:sk[6]},
      ult:{n:ult}},
    reward:{xp:xp,gems:gems,item:item,title:title||null}};
}
var ZONES=[
 {id:'z1',n:'Fire Hell',vi:'Hỏa Ngục',el:'fire',c:'#E8445F',top:88,side:'center',
  desc:'Núi lửa và dung nham. Nơi bắt đầu hành trình chinh phục bản đồ.',
  challenge:'Từ vựng cơ bản',main:'v11_fireking',bosses:['v11_fireking','v11_lavadragon','v11_oni'],
  reward:{xp:100,gems:3,item:'Rương Hỏa Ngục'}},
 {id:'z2',n:'Ice Realm',vi:'Băng Vực',el:'ice',c:'#7CC7FF',top:79,side:'left',
  desc:'Băng tuyết vĩnh cửu. Rèn luyện tai nghe và vốn từ.',
  challenge:'Từ vựng và nghe hiểu',main:'v11_icelong',bosses:['v11_icelong','v11_icequeen','v11_crystalbird'],
  reward:{xp:100,gems:3,item:'Rương Băng Vực'}},
 {id:'z3',n:'Thunder Peaks',vi:'Lôi Đình',el:'thunder',c:'#FFD23F',top:70,side:'right',
  desc:'Đỉnh núi sấm sét. Chỉ những ai phản xạ nhanh mới đi tiếp.',
  challenge:'Trả lời nhanh',main:'v11_thunderminotaur',bosses:['v11_thunderminotaur','v11_stormeagle','v11_tigerwarrior'],
  reward:{xp:100,gems:3,item:'Rương Lôi Đình'}},
 {id:'z4',n:'Dark Abyss',vi:'Hắc Ám',el:'dark',c:'#9B7BFF',top:61,side:'left',
  desc:'Vực sâu bóng tối. Chính tả và nhận diện từ là chìa khóa.',
  challenge:'Chính tả và nhận diện từ',main:'v11_voidknight',bosses:['v11_voidknight','v11_boneking','v11_snakequeen'],
  reward:{xp:100,gems:3,item:'Rương Hắc Ám'}},
 {id:'z5',n:'Heavenly Realm',vi:'Thiên Giới',el:'light',c:'#FFE066',top:52,side:'center',
  desc:'Cõi sáng của thần thú. Thử thách cấu trúc câu.',
  challenge:'Cấu trúc câu',main:'v11_phoenix',bosses:['v11_phoenix','v11_heavenknight','v11_lightdeer'],
  reward:{xp:100,gems:3,item:'Rương Thiên Giới'}},
 {id:'z6',n:'Deep Ocean',vi:'Đại Dương',el:'water',c:'#4FA8FF',top:43,side:'right',
  desc:'Biển sâu thăm thẳm. Luyện nghe hiểu dưới áp lực.',
  challenge:'Nghe hiểu',main:'v11_octopusking',bosses:['v11_octopusking','v11_seadragon','v11_sharkking'],
  reward:{xp:100,gems:3,item:'Rương Đại Dương'}},
 {id:'z7',n:'Ancient Forest',vi:'Cổ Thụ',el:'nature',c:'#7ED957',top:34,side:'left',
  desc:'Rừng cổ đại. Ôn tập những từ khó nhất bạn từng học.',
  challenge:'Ôn tập từ khó',main:'v11_ancienttree',bosses:['v11_ancienttree','v11_ninetails','v11_pandamaster'],
  reward:{xp:100,gems:3,item:'Rương Cổ Thụ'}},
 {id:'z8',n:'Clockwork City',vi:'Cơ Giới',el:'earth',c:'#C98A4B',top:25,side:'right',
  desc:'Thành phố máy móc và thời gian. Mọi câu hỏi đều có giới hạn.',
  challenge:'Phản xạ có giới hạn thời gian',main:'v11_timemachine',bosses:['v11_timemachine','v11_golem','v11_goldephant'],
  reward:{xp:100,gems:3,item:'Rương Cơ Giới'}},
 {id:'z9',n:'Nebula Expanse',vi:'Tinh Vân',el:'cosmic',c:'#C77DFF',top:16,side:'left',
  desc:'Không gian và vũ trụ. Tổng hợp mọi kỹ năng đã học.',
  challenge:'Tổng hợp nhiều kỹ năng',main:'v11_nebuladragon',bosses:['v11_nebuladragon','v11_spacewhale','v11_ninehead'],
  reward:{xp:100,gems:3,item:'Rương Tinh Vân'}},
 {id:'z10',n:'Infinity World',vi:'Vô Cực',el:'cosmic',c:'#C77DFF',top:6,side:'center',
  desc:'Thế giới cuối. Trận chiến cuối cùng với Ma Long Vô Cực.',
  challenge:'Final Boss Battle',main:'v11_infinitydragon',bosses:['v11_infinitydragon','v11_greendragon','v11_butterflyqueen'],
  reward:{xp:200,gems:5,item:'Rương Vô Cực'}}
];
var BOSSES=[
 /* z1 Hỏa Ngục */
 B('v11_fireking','Fire King','Hỏa Vương Diệt Thế','z1','fire','mythic',33,325,3,'mc','A2',['Vuốt Lửa','burn','Hỏa Diệm Thiêu Đốt','tshield','Khiên Hỏa Diệm','bulwark','Giáp Lửa Bất Diệt'],'Diệt Thế Long Viêm',70,2,'Vương Miện Lửa','Hỏa Vương'),
 B('v11_lavadragon','Lava Dragon','Rồng Dung Nham','z1','fire','legendary',32,300,3,'type','A2',['Nanh Dung Nham','burn','Dung Nham Phun Trào','theal','Dưỡng Nham','vampiric','Hút Sinh Lực Nham'],'Nham Thạch Diệt Thế',70,2,'Vảy Dung Nham'),
 B('v11_oni','Blood Oni','Oni Huyết Ảnh','z1','dark','legendary',31,290,3,'mc','A2',['Chùy Huyết','veil','Huyết Ảnh Che Phủ','tenrage','Huyết Nộ','thorns','Gai Huyết Ảnh'],'Huyết Ảnh Diệt Hồn',70,2,'Mặt Nạ Oni'),
 /* z2 Băng Vực */
 B('v11_icelong','Polar Ice Dragon','Băng Long Cực Quang','z2','ice','mythic',36,350,4,'listen','A2',['Hơi Thở Băng','freeze','Băng Phong Cực Quang','tshield','Khiên Băng Vĩnh Cửu','bulwark','Giáp Băng Dày'],'Tuyệt Đối Băng Phong',80,2,'Vảy Băng Long','Băng Long Chúa'),
 B('v11_icequeen','Ice Queen','Nữ Hoàng Băng Giá','z2','ice','legendary',35,325,4,'listen','B1',['Trượng Băng','freeze','Băng Giá Vĩnh Cửu','ttimer','Đóng Băng Thời Gian','swift','Bước Chân Băng'],'Băng Hậu Tuyệt Kỹ',80,2,'Vương Miện Băng'),
 B('v11_crystalbird','Crystal Bird','Thiên Điểu Pha Lê','z2','ice','legendary',34,315,4,'mc','B1',['Mỏ Pha Lê','freeze','Pha Lê Băng Vũ','tveil','Sương Mù Pha Lê','swift','Đôi Cánh Băng'],'Tinh Thể Băng Phong',80,2,'Lông Pha Lê'),
 /* z3 Lôi Đình */
 B('v11_thunderminotaur','Thunder Minotaur','Lôi Thần Minotaur','z3','thunder','mythic',39,375,4,'speed','B1',['Rìu Sấm','chain','Lôi Đình Chấn Động','tenrage','Cơn Thịnh Nộ Sấm','bulwark','Giáp Sấm Bất Diệt'],'Lôi Thần Phán Quyết',90,2,'Sừng Lôi Thần','Lôi Thần'),
 B('v11_stormeagle','Storm Eagle','Điểu Vương Phong Lôi','z3','wind','legendary',38,350,4,'speed','B1',['Vuốt Gió','gale','Phong Lôi Bão Táp','ttimer','Cơn Lốc Thời Gian','swift','Đôi Cánh Bão'],'Phong Lôi Diệt Thế',90,2,'Lông Bão'),
 B('v11_tigerwarrior','Tiger Warrior','Mãnh Hổ Võ Thần','z3','thunder','legendary',37,340,4,'mc','B1',['Vuốt Hổ','chain','Hổ Gầm Sấm Sét','tshield','Giáp Hổ Vương','bulwark','Da Hổ Sét'],'Bạch Hổ Diệt Thế',90,2,'Nanh Hổ Trắng'),
 /* z4 Hắc Ám */
 B('v11_voidknight','Void Knight','Kỵ Sĩ Hư Không','z4','dark','mythic',42,400,5,'type','B1',['Kiếm Hư Không','veil','Hư Không Che Phủ','tveil','Màn Đêm Hư Không','vampiric','Hút Hồn'],'Hư Không Diệt Thế',100,3,'Kiếm Hư Không','Kỵ Sĩ Hư Không'),
 B('v11_boneking','Bone King','Vua Xương Bóng Tối','z4','dark','legendary',41,375,5,'type','B1',['Trượng Xương','veil','Xương Khô Nguyền Rủa','theal','Triệu Hồi Xương','vampiric','Hút Sinh Khí'],'Vong Hồn Quân Đoàn',100,3,'Vương Miện Xương'),
 B('v11_snakequeen','Snake Queen','Nữ Vương Xà Ảnh','z4','dark','legendary',40,365,5,'mc','B1',['Nanh Độc','veil','Xà Nhãn Mê Hoặc','tenrage','Cơn Thịnh Nộ Xà','thorns','Vảy Gai Độc'],'Xà Hậu Thạch Hóa',100,3,'Vảy Xà Hậu'),
 /* z5 Thiên Giới */
 B('v11_phoenix','Holy Phoenix','Thần Phượng Viêm Quang','z5','light','mythic',45,425,5,'builder','B1',['Lông Lửa Thiêng','cleanse','Thánh Quang Tái Sinh','theal','Niết Bàn Hồi Phục','bulwark','Lông Phượng Bất Diệt'],'Phượng Hoàng Niết Bàn',110,3,'Lông Phượng','Phượng Hoàng'),
 B('v11_heavenknight','Heaven Knight','Hiệp Sĩ Thiên Giới','z5','light','legendary',44,400,5,'grammar','B1',['Kiếm Thánh','cleanse','Thiên Giới Bảo Hộ','tshield','Khiên Thiên Sứ','bulwark','Giáp Thánh Quang'],'Thiên Giới Phán Xét',110,3,'Khiên Thiên Sứ'),
 B('v11_lightdeer','Light Deer God','Lộc Thần Ánh Sáng','z5','light','legendary',43,390,5,'builder','B2',['Gạc Sáng','cleanse','Lộc Quang Chữa Lành','ttimer','Ánh Sáng Đóng Băng','swift','Bước Chân Ánh Sáng'],'Thánh Lộc Quang Huy',110,3,'Gạc Lộc Thần'),
 /* z6 Đại Dương */
 B('v11_octopusking','Octopus King','Bạch Tuộc Vương Giả','z6','water','mythic',48,450,6,'listen','B1',['Xúc Tu','regen','Vương Giả Thủy Triều','theal','Thủy Triều Hồi Phục','vampiric','Hút Thủy Triều'],'Đại Dương Nộ Triều',120,3,'Vương Miện Biển','Vua Biển'),
 B('v11_seadragon','Abyss Sea Dragon','Hải Long Vực Sâu','z6','water','legendary',47,425,6,'listen','B2',['Vây Sóng','regen','Vực Sâu Hồi Phục','tshield','Khiên Vực Sâu','bulwark','Vảy Vực Sâu'],'Vực Sâu Diệt Thế',120,3,'Vảy Hải Long'),
 B('v11_sharkking','Shark Tyrant','Cá Mập Bạo Chúa','z6','water','legendary',46,415,6,'mc','B2',['Hàm Cá Mập','regen','Huyết Hải Cuồng Bạo','tenrage','Cơn Thịnh Nộ Biển','thorns','Vây Gai Biển'],'Huyết Hải Cuồng Triều',120,3,'Răng Cá Mập'),
 /* z7 Cổ Thụ */
 B('v11_ancienttree','Ancient Tree God','Thần Mộc Cổ Đại','z7','nature','mythic',51,475,6,'mixed','B1',['Cành Cổ Thụ','heal','Cổ Thụ Hồi Sinh','theal','Nhựa Sống Cổ Thụ','vampiric','Rễ Hút Sinh Lực'],'Cổ Thụ Vạn Niên',130,4,'Hạt Cổ Thụ','Thần Mộc'),
 B('v11_ninetails','Nine-Tailed Fox','Hồ Ly Cửu Vĩ','z7','fire','legendary',50,450,6,'mixed','B1',['Lửa Hồ Ly','burn','Hồ Hỏa Cửu Vĩ','tveil','Ảo Ảnh Cửu Vĩ','thorns','Đuôi Gai Lửa'],'Cửu Vĩ Diệt Thế',130,4,'Đuôi Hồ Ly'),
 B('v11_pandamaster','Panda Master','Đại Sư Gấu Trúc','z7','nature','legendary',49,440,6,'read','B2',['Quyền Trúc','heal','Trúc Lâm Dưỡng Sinh','tshield','Khiên Trúc Lâm','bulwark','Áo Giáp Trúc'],'Vô Cực Trúc Quyền',130,4,'Gậy Trúc'),
 /* z8 Cơ Giới */
 B('v11_timemachine','Time Machine','Cỗ Máy Thời Gian','z8','earth','mythic',54,500,7,'speed','B2',['Bánh Răng','shield','Thời Gian Hộ Giáp','ttimer','Đảo Ngược Đồng Hồ','swift','Bánh Răng Tốc Độ'],'Dòng Thời Gian Đứt Gãy',140,4,'Bánh Răng Vàng','Chúa Tể Thời Gian'),
 B('v11_golem','Mystic Golem','Golem Huyền Thạch','z8','earth','legendary',53,475,7,'speed','B2',['Nắm Đấm Đá','shield','Huyền Thạch Khiên','tshield','Khiên Huyền Thạch','bulwark','Da Đá Huyền Thạch'],'Núi Đá Sụp Đổ',140,4,'Lõi Huyền Thạch'),
 B('v11_goldephant','Golden Elephant God','Voi Thần Kim Giáp','z8','earth','legendary',52,465,7,'mc','B2',['Ngà Vàng','shield','Kim Giáp Bất Hoại','theal','Hồi Phục Kim Giáp','vampiric','Hút Vàng'],'Voi Thần Chấn Động',140,4,'Ngà Voi Vàng'),
 /* z9 Tinh Vân */
 B('v11_nebuladragon','Nebula Dragon','Rồng Tinh Vân','z9','cosmic','mythic',57,525,7,'mixed','B2',['Vuốt Tinh Vân','rift','Tinh Vân Hỗn Loạn','tveil','Sương Mù Tinh Vân','swift','Đôi Cánh Tinh Vân'],'Vũ Trụ Sụp Đổ',150,4,'Vảy Tinh Vân','Chúa Tể Tinh Vân'),
 B('v11_spacewhale','Galaxy Whale','Cá Voi Tinh Hà','z9','cosmic','legendary',56,500,7,'mixed','B2',['Vây Tinh Hà','rift','Tinh Hà Xoáy','theal','Hồi Phục Tinh Hà','vampiric','Hút Tinh Hà'],'Hố Đen Tinh Hà',150,4,'Vây Cá Voi'),
 B('v11_ninehead','Nine-Headed Dragon','Cửu Đầu Hắc Long','z9','dark','legendary',55,490,7,'mixed','B2',['Chín Đầu Rồng','veil','Cửu Đầu Ám Ảnh','tenrage','Cơn Thịnh Nộ Cửu Đầu','thorns','Vảy Gai Hắc Ám'],'Cửu Đầu Hỗn Mang',150,4,'Đầu Rồng Hắc Ám'),
 /* z10 Vô Cực */
 B('v11_infinitydragon','Infinity Dragon','Ma Long Vô Cực','z10','cosmic','mythic',60,600,8,'mixed','B2',['Vuốt Vô Cực','rift','Vô Cực Hỗn Mang','tenrage','Cơn Thịnh Nộ Vô Cực','thorns','Vảy Gai Vô Cực'],'Vô Cực Diệt Thế',160,5,'Vảy Vô Cực','Chúa Tể Vô Cực'),
 B('v11_greendragon','Emerald Dragon','Thanh Long Lục Bảo','z10','nature','legendary',59,550,8,'mixed','B2',['Vuốt Lục Bảo','heal','Lục Bảo Sinh Cơ','tshield','Khiên Lục Bảo','bulwark','Vảy Lục Bảo'],'Rừng Thiêng Nộ Diệm',160,5,'Vảy Lục Bảo'),
 B('v11_butterflyqueen','Dream Butterfly Queen','Nữ Hoàng Bướm Mộng','z10','nature','legendary',58,540,8,'mixed','B2',['Cánh Mộng','heal','Mộng Điệp Hồi Phục','theal','Giấc Mộng Hồi Phục','vampiric','Hút Giấc Mơ'],'Giấc Mộng Vĩnh Hằng',160,5,'Cánh Bướm Mộng')
];
var byId={};BOSSES.forEach(function(b){byId[b.id]=b});
var zoneById={};ZONES.forEach(function(z){zoneById[z.id]=z});
window.__V19_DATA={
  elements:EL,rarities:RAR,zones:ZONES,bosses:BOSSES,
  byId:function(id){return byId[id]||null},
  zoneById:function(id){return zoneById[id]||null},
  zoneOf:function(bossId){var b=byId[bossId];return b?zoneById[b.zone]:null},
  all:function(){return BOSSES.slice()}
};
})();
