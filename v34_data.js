/* ===== V34 DATA — CHRONO COMPLETION (V17.1) =====
   Boss Weakness table (all 78 bosses) + Chrono set labels + A1–A2
   topic display names (Vietnamese, taken from the A1–A2 source data
   — a.tv values — not invented vocabulary).
   Weakness "kinds":
     chrono — a Chrono set (w.chronoSet === key)
     a1a2   — an A1–A2 topic slug (w.a1a2Topics holds 'a1_<slug>';
              weakMatch() accepts both 'slug' and 'a1_slug', and also
              w.t === slug for the V6 words that share the slug)
     t      — a V15/V6 word topic (w.t === key; 'time' = 32 V15 words)
     ko     — the selected Korean deck (any correct KO answer fills)
   No boss ids are invented here: every id below is a real boss id
   from __V18_DATA / __V19_DATA / __V33_DATA / V15 BOSSES. */
(function(){
'use strict';
var SET_LABELS={
  time:'Time & Calendar',
  space:'Space & Astronomy',
  machines:'Machines & Engineering',
  change:'Change & Sequence'
};
var SET_VI={
  time:'Thời gian & Lịch',
  space:'Không gian & Thiên văn',
  machines:'Máy móc & Kỹ thuật',
  change:'Thay đổi & Trình tự'
};
/* A1–A2 topic slugs -> Vietnamese display names (from the PDF data). */
var A1A2_LABELS={
  'family':'Gia đình',
  'emotions-and-feelings':'Cảm xúc',
  'body-movements':'Chuyển động cơ thể',
  'characteristics':'Tính cách',
  'education':'Giáo dục',
  'animals':'Động vật',
  'nature':'Thiên nhiên',
  'vehicles':'Phương tiện giao thông',
  'travel':'Du lịch',
  'food-and-drinks':'Ăn uống',
  'house-and-home':'Nhà cửa',
  'clothes-and-accessories':'Quần áo & phụ kiện',
  'fruit-and-vegetables':'Trái cây & rau củ',
  'cooking-verbs':'Động từ nấu ăn',
  'colors-and-shapes':'Màu sắc & hình dạng',
  'school-objects':'Đồ dùng học tập',
  'body-parts':'Bộ phận cơ thể',
  'jobs-and-occupations':'Nghề nghiệp',
  'leisure-time':'Thời gian rảnh'
};
/* Chrono 8 — explicit, own-domain sets (all B2, so in-pool). */
var WEAK_EXPLICIT={
  'v17_sandwisp':{kind:'chrono',key:'time'},
  'v17_pendulum':{kind:'chrono',key:'machines'},
  'v17_specter':{kind:'chrono',key:'time'},
  'v17_mantis':{kind:'chrono',key:'machines'},
  'v17_hound':{kind:'chrono',key:'space'},
  'v17_oracle':{kind:'chrono',key:'time'},
  'v17_titan':{kind:'chrono',key:'change'},
  'v17_geargolem':{kind:'chrono',key:'machines'}
};
/* V19 Boss Map — per zone (A1–A2 topics). z10 is NOT an A1–A2 topic:
   it maps to the Chrono 'change' set and is handled explicitly in
   weakFor() (kind 'chrono', key 'change'). */
var ZONE_WEAK={
  'z1':'family',
  'z2':'emotions-and-feelings',
  'z3':'body-movements',
  'z4':'characteristics',
  'z5':'education',
  'z6':'animals',
  'z7':'nature',
  'z8':'vehicles',
  'z9':'travel'
};
/* V18 English + Legendary arenas — per difficulty. */
var DIFF_WEAK={
  'A1':'food-and-drinks',
  'A2':'house-and-home',
  'B1':'clothes-and-accessories',
  'B2':'fruit-and-vegetables'
};
/* V18 Elemental arena — per element. */
var EL_WEAK={
  'fire':'cooking-verbs',
  'ice':'colors-and-shapes',
  'nature':'fruit-and-vegetables',
  'water':'food-and-drinks',
  'wind':'travel',
  'earth':'house-and-home',
  'dark':'emotions-and-feelings',
  'light':'school-objects',
  'thunder':'body-movements'
};
var KO_EMPTY_NOTE='Chưa có từ Chrono tiếng Hàn — từ Chrono hiện chỉ có bản tiếng Anh (kèm nghĩa tiếng Hàn hiển thị)';
window.__V34_DATA={
  version:'17.1.0',
  setLabels:SET_LABELS,
  setVi:SET_VI,
  a1a2Labels:A1A2_LABELS,
  weakExplicit:WEAK_EXPLICIT,
  zoneWeak:ZONE_WEAK,
  diffWeak:DIFF_WEAK,
  elWeak:EL_WEAK,
  koEmptyNote:KO_EMPTY_NOTE
};
})();
