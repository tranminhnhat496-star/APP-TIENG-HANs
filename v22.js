/* ===== V22 — Basic Tactics for Listening (English Hub Library) =====
   Bộ từ vựng sách Basic Tactics for Listening: 24 Units, 819 mục từ
   (513 từ đơn + 306 cụm từ), trích từ file Word do Anh cung cấp.
   - Dữ liệu: basic_tactics_vocabulary.json (tải lười khi cần, KHÔNG
     nằm trong localStorage, KHÔNG sao chép vào Firestore).
   - Sau khi tải, __v15.attachBT() gắn BT vào WORDS chung (từ đã có
     chỉ được gắn thêm thư viện, từ chỉ có trong BT nhận id ổn định
     'bt<unit>_<seq>' và lv 'BT') — mọi chế độ học, ôn tập SRS và boss
     đều dùng được qua phạm vi (scope) {kind:'lib', lib:'bt', ...}.
   - Không có IPA trong tài liệu gốc nên KHÔNG tự tạo IPA: giao diện
     hiện 'Chưa có phiên âm' thay vì bịa số liệu.
   - Tiến trình: S.v7.en22 = {quest:{unit:{stars,best,attempts,lastAt,
     claimed1,claimed3}}, created} — hộp SRS dùng chung S.v7.en (như
     A1–A2/Oxford), chỉ lưu ID nên đồng bộ đám mây nhẹ. */
(function(){
'use strict';
var V15=function(){return window.__v15||null};
var V17=function(){return window.__v17||null};
var esc=function(s){var v=V15();return v?v.esc(s):String(s==null?'':s)};
var pop22=function(t){var v=V15();if(v&&v.pop15)v.pop15(t)};
/* Static unit metadata (no fetch needed for the library cards). */
var BT_META=[{"n": 1, "en": "Introductions and Names", "vi": "Giới thiệu và tên", "words": 12, "phrases": 10}, {"n": 2, "en": "Describing People", "vi": "Miêu tả con người", "words": 22, "phrases": 8}, {"n": 3, "en": "Clothes", "vi": "Quần áo", "words": 30, "phrases": 4}, {"n": 4, "en": "Routines", "vi": "Thói quen hằng ngày", "words": 5, "phrases": 17}, {"n": 5, "en": "Dates", "vi": "Ngày tháng", "words": 22, "phrases": 14}, {"n": 6, "en": "Jobs", "vi": "Nghề nghiệp", "words": 28, "phrases": 15}, {"n": 7, "en": "Favorites", "vi": "Những điều yêu thích", "words": 23, "phrases": 14}, {"n": 8, "en": "Sports and Exercise", "vi": "Thể thao và tập thể dục", "words": 13, "phrases": 16}, {"n": 9, "en": "Locations", "vi": "Vị trí", "words": 27, "phrases": 15}, {"n": 10, "en": "The Family", "vi": "Gia đình", "words": 21, "phrases": 8}, {"n": 11, "en": "Entertainment", "vi": "Giải trí", "words": 13, "phrases": 8}, {"n": 12, "en": "Prices", "vi": "Giá cả", "words": 19, "phrases": 21}, {"n": 13, "en": "Restaurants", "vi": "Nhà hàng", "words": 40, "phrases": 12}, {"n": 14, "en": "Small Talk", "vi": "Trò chuyện xã giao", "words": 7, "phrases": 16}, {"n": 15, "en": "Vacations", "vi": "Kỳ nghỉ", "words": 18, "phrases": 14}, {"n": 16, "en": "Apartment Living", "vi": "Cuộc sống căn hộ", "words": 21, "phrases": 9}, {"n": 17, "en": "Hopes and Plans", "vi": "Hy vọng và kế hoạch", "words": 24, "phrases": 11}, {"n": 18, "en": "The Weather", "vi": "Thời tiết", "words": 20, "phrases": 11}, {"n": 19, "en": "Shopping", "vi": "Mua sắm", "words": 26, "phrases": 20}, {"n": 20, "en": "Describing Things", "vi": "Miêu tả đồ vật", "words": 29, "phrases": 12}, {"n": 21, "en": "Directions", "vi": "Chỉ đường", "words": 11, "phrases": 14}, {"n": 22, "en": "People We Know", "vi": "Những người chúng ta biết", "words": 23, "phrases": 16}, {"n": 23, "en": "Places", "vi": "Địa điểm", "words": 25, "phrases": 7}, {"n": 24, "en": "Health", "vi": "Sức khỏe", "words": 34, "phrases": 14}];
var DATA=null,DATA_P=null,DATA_ERR='';
var SPOKEN_LOG=[];
var ST={view:null,unit:0,tab:'words',q:'',status:'all',page:0,quest:null,_dataRendered:false};

/* ---------- tiến trình (chỉ lưu ID + sao quest) ---------- */
function en22(){
  try{S.v7=S.v7||{};var e=S.v7.en22;
    if(!e)e=S.v7.en22={quest:{},created:Date.now()};
    e.quest=e.quest||{};
    return e;
  }catch(err){return {quest:{}}}
}
function save22(){var v=V15();if(v)v.save15()}
function rerenderLibrary(){var v=V15();if(v)v.renderTab()}

/* ---------- tải lười dữ liệu ---------- */
function dataURL(){return 'basic_tactics_vocabulary.json'}
function ensureData(){
  if(DATA)return Promise.resolve(DATA);
  if(DATA_P)return DATA_P;
  DATA_P=new Promise(function(resolve,reject){
    var done=function(ok,err){
      if(ok){try{var v=V15();if(v)v.attachBT()}catch(e){}DATA_P=null;resolve(DATA)}
      else{DATA_P=null;DATA_ERR=err||'Không tải được dữ liệu.';reject(new Error(DATA_ERR))}
    };
    var onText=function(txt){
      try{
        var d=JSON.parse(txt);
        if(!d||!Array.isArray(d.units)||d.units.length!==24)throw new Error('bad data');
        DATA=d;
        /* V14 BUGFIX (phát hiện khi chạy test22): DATA chỉ sống trong
           closure của v22.js, nhưng buildWords()/attachBT() trong v15.js
           đọc dữ liệu BT qua window.__V22_BT — biến này không bao giờ
           được gán nên WORDS không bao giờ có từ Basic Tactics (mọi
           chế độ học + boss với phạm vi BT đều nhận danh sách rỗng).
           Gán global ở đây để hai module thấy cùng một dữ liệu. */
        window.__V22_BT=d;
        done(true);
      }catch(e){done(false,'Dữ liệu Basic Tactics không hợp lệ.')}
    };
    var failMsg='Không tải được dữ liệu Basic Tactics. Mở game qua GitHub Pages hoặc máy chủ web (không mở file index.html trực tiếp).';
    if(typeof fetch==='function'){
      fetch(dataURL()).then(function(r){
        if(!r.ok)throw new Error('HTTP '+r.status);
        return r.text();
      }).then(onText).catch(function(){xhrLoad(onText,done,failMsg)});
    }else xhrLoad(onText,done,failMsg);
  });
  return DATA_P;
}
function xhrLoad(onText,done,failMsg){
  try{
    var x=new XMLHttpRequest();
    x.open('GET',dataURL(),true);
    x.onreadystatechange=function(){
      if(x.readyState!==4)return;
      if((x.status===200||x.status===0)&&x.responseText)onText(x.responseText);
      else done(false,failMsg);
    };
    x.send();
  }catch(e){done(false,failMsg)}
}

/* ---------- giọng đọc (Speech Synthesis của trình duyệt) ---------- */
function ttsAvailable(){
  try{return typeof speechSynthesis!=='undefined'&&typeof SpeechSynthesisUtterance!=='undefined'}catch(e){return false}
}
function speak22(text){
  SPOKEN_LOG.push(text);
  try{
    speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(text);
    u.lang='en-US';u.rate=.85;
    speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------- tra cứu WORDS ---------- */
function enMap(){
  var v=V15(),m={};
  (v?v.words:[]).forEach(function(w){var k=(w.en||'').toLowerCase();if(k&&!m[k])m[k]=w});
  return m;
}
function boxOfId(id){var v=V15();if(!v)return 0;var o=v.enOld();return (o.box||{})[id]||0}
function favIds(){
  try{return (S.v7&&S.v7.en17&&S.v7.en17.fav)||[]}catch(e){return []}
}
function unitStats(n,map){
  var m=BT_META[n-1];if(!m)return {total:0,learned:0,mastered:0,due:0};
  map=map||enMap();
  var v=V15(),now=Date.now(),s={total:m.words+m.phrases,learned:0,mastered:0,due:0};
  if(!DATA||!v)return s;
  var u=DATA.units[n-1];if(!u)return s;
  (u.words||[]).concat(u.phrases||[]).forEach(function(en){
    var w=map[(en.en||'').toLowerCase()];if(!w)return;
    var b=boxOfId(w.id);
    if(b>=1)s.learned++;
    if(b>=5)s.mastered++;
    /* V45 (V19.0, C-R3-1): due = box 1-4 AND due<=now (see counts15). */
    if(b>=1&&b<=4&&((v.en15().due)||{})[w.id]<=now)s.due++;
  });
  return s;
}
function starStr(n){return '★'.repeat(n)+'☆'.repeat(Math.max(0,3-n))}
function scopeName22(sc){
  if(!sc||sc.kind!=='lib')return 'Tất cả từ vựng';
  /* V38 (V18.3): reuse the Library's scopeName() — it already names
     every library set (A1–A2 topic, Oxford lesson, Chrono/Skyroot set,
     BT units/type/status). Fall back to the local BT formatter when
     __v17 is unavailable; 'Bộ từ khác' only for a scope this picker
     cannot produce. */
  try{var v17=V17();if(v17&&v17.scopeName){var n=v17.scopeName(sc);if(n)return n}}catch(e){}
  if(sc.lib!=='bt')return 'Bộ từ khác';
  var u='';
  if(sc.unit){var us=Array.isArray(sc.unit)?sc.unit:[sc.unit];
    u=us.length===1?' · Unit '+us[0]:' · '+us.length+' Units';}
  var t=sc.type?(sc.type==='word'?' · Từ đơn':' · Cụm từ'):'';
  var s=sc.status?(sc.status==='unlearned'?' · Chưa thuộc':' · Cần ôn'):'';
  return 'Basic Tactics'+u+t+s;
}

/* ---------- nhóm trong Thư viện ---------- */
function unitCard(m,map){
  var s=unitStats(m.n,map);
  var tot=m.words+m.phrases;
  var pct=tot?Math.round(s.learned/tot*100):0;
  var q=en22().quest[m.n]||{};
  return '<div class="v17card v22card"><div class="v17card-t"><b>Unit '+m.n+' · '+esc(m.en)+'</b><span class="mute">'+tot+' mục từ</span></div>'
    +'<div class="mute">'+esc(m.vi)+' · '+m.words+' từ đơn · '+m.phrases+' cụm từ</div>'
    +'<div class="v17bar"><i style="width:'+pct+'%"></i></div>'
    +'<div class="mute">'+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn'+(q.stars?' · Quest: '+starStr(q.stars):'')+'</div>'
    +'<div class="acts"><button class="btn sm pri" onclick="__v22.learnUnit('+m.n+')">Học ngay</button>'
    +'<button class="btn sm" onclick="__v22.reviewUnit('+m.n+')">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v22.quizUnit('+m.n+')">Kiểm tra</button>'
    +'<button class="btn sm" onclick="__v22.openUnit('+m.n+')">Xem từ</button></div></div>';
}
function groupHTML(){
  var map=enMap();
  var h='<div class="v17group v22group"><div class="v17group-head"><b>🎧 Basic Tactics for Listening – Vocabulary</b><span class="mute">24 Units · 819 mục từ · 513 từ đơn · 306 cụm từ</span></div>'
    +'<p class="mute">Từ vựng sách Basic Tactics for Listening — mở ra là học ngay, không cần upload. Cụm từ giữ nguyên cả câu, không cắt nhỏ. Tài liệu gốc không có IPA nên giao diện không tự bịa phiên âm.</p>'
    +'<div class="acts"><button class="btn sm pri" onclick="__v22.learnAll()">Học ngay</button>'
    +'<button class="btn sm" onclick="__v22.reviewAll()">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v22.openQuest()">🎧 Listening Quest — 24 Missions</button></div>'
    +'<div class="v17grid">'+BT_META.map(function(m){return unitCard(m,map)}).join('')+'</div></div>';
  /* tải dữ liệu ngầm để thanh tiến độ các Unit hiện số đã học */
  if(!DATA){
    ensureData().then(function(){
      if(!ST._dataRendered&&document.querySelector('.v22group')){ST._dataRendered=true;rerenderLibrary()}
    }).catch(function(){});
  }
  return h;
}

/* ---------- phạm vi học + các chế độ ---------- */
function setScopeAndTab(sc,tab){
  var v=V15();if(!v)return;
  ensureData().then(function(){
    v.setScope(sc);
    if(tab==='review'){v.tab('review');setTimeout(function(){v.reviewStart(false)},0)}
    else if(tab==='mc'){v.tab('learn');v.startMode('mc')}
    else if(tab==='flash'){v.tab('learn');v.startMode('flash')}
    else v.tab(tab||'learn');
  }).catch(function(){pop22(DATA_ERR||'Không tải được dữ liệu Basic Tactics.')});
}
function learnAll(){setScopeAndTab({kind:'lib',lib:'bt'},'flash')}
function reviewAll(){setScopeAndTab({kind:'lib',lib:'bt'},'review')}
function learnUnit(n){setScopeAndTab({kind:'lib',lib:'bt',unit:n},'flash')}
function reviewUnit(n){setScopeAndTab({kind:'lib',lib:'bt',unit:n},'review')}
function quizUnit(n){setScopeAndTab({kind:'lib',lib:'bt',unit:n},'mc')}
function bossUnit(n){setScopeAndTab({kind:'lib',lib:'bt',unit:n},'bosses')}

/* ---------- xem một Unit ---------- */
function goLibrary(){ST.view=null;ST.quest=null;rerenderLibrary()}
function openUnit(n){
  ST.view='unit';ST.unit=n;ST.tab='words';ST.q='';ST.status='all';ST.page=0;
  /* V14: như openQuest — ép về tab Thư viện để giao diện Unit luôn vẽ. */
  var v=V15();if(v&&v.tab)v.tab('library');else rerenderLibrary();
  ensureData().then(function(){rerenderLibrary()}).catch(function(){rerenderLibrary()});
}
function setUnitTab(t){ST.tab=t;ST.page=0;rerenderLibrary()}
function unitSearch(q){ST.q=q;ST.page=0;rerenderLibrary();refocus22('.v17filters .v15input')}
function setUnitStatus(val){ST.status=val;ST.page=0;rerenderLibrary()}
function setUnitPage(p){ST.page=p;rerenderLibrary()}
function refocus22(sel){
  setTimeout(function(){
    var inp=document.querySelector('#v15body '+sel);
    if(inp){inp.focus();try{inp.setSelectionRange(inp.value.length,inp.value.length)}catch(e){}}
  },0);
}
function filterEntries(list,map){
  var q=ST.q.toLowerCase(),favs=favIds(),now=Date.now(),v=V15();
  var dueMap=v?(v.en15().due||{}):{};
  return list.filter(function(e){
    if(q&&(e.en||'').toLowerCase().indexOf(q)<0&&(e.vi||'').toLowerCase().indexOf(q)<0)return false;
    var w=map[(e.en||'').toLowerCase()];
    var b=w?boxOfId(w.id):0;
    if(ST.status==='new'&&b!==0)return false;
    if(ST.status==='learning'&&(b<1||b>=5))return false;
    if(ST.status==='mastered'&&b<5)return false;
    if(ST.status==='due'&&w&&(b<1||b>4||(dueMap[w.id]||0)>now))return false;
    if(ST.status==='fav'&&(!w||favs.indexOf(w.id)<0))return false;
    return true;
  });
}
function pager22(pg,pages){
  if(pages<=1)return '';
  var h='<div class="v17pager">';
  if(pg>0)h+='<button class="btn sm" onclick="__v22.setUnitPage('+(pg-1)+')">← Trước</button>';
  h+='<span class="mute">Trang '+(pg+1)+'/'+pages+'</span>';
  if(pg<pages-1)h+='<button class="btn sm" onclick="__v22.setUnitPage('+(pg+1)+')">Sau →</button>';
  return h+'</div>';
}
function entryRow(e,map){
  var w=map[(e.en||'').toLowerCase()];
  var id=w?w.id:'';
  var b=id?boxOfId(id):0;
  var fav=id&&favIds().indexOf(id)>=0;
  return '<div class="v17word">'
    +'<div class="v17word-main"><b>'+esc(e.en)+'</b> <span class="v22type '+(e.type==='phrase'?'ph':'wd')+'">'+(e.type==='phrase'?'Cụm từ':'Từ đơn')+'</span>'
    +'<div class="v17ipa"><span class="v17nodata">Chưa có phiên âm</span></div>'
    +'<div>'+esc(e.vi)+'</div>'
    +'<div class="mute">Unit '+e.unit+' · hộp '+b+'/5</div></div>'
    +'<div class="v17word-acts">'
    +(id?'<button class="btn sm" onclick="__v22.speakEntry(\''+id+'\')">🔊 Nghe</button>'
      +'<button class="btn sm '+(b>=5?'ok':'')+'" onclick="__v22.toggleMastered(\''+id+'\')">'+(b>=5?'✓ Đã thuộc':'Đánh dấu đã thuộc')+'</button>'
      +'<button class="btn sm '+(fav?'on':'')+'" onclick="__v22.toggleFav(\''+id+'\')">'+(fav?'★ Yêu thích':'☆ Yêu thích')+'</button>'
      +'<button class="btn sm" onclick="__v17.copyToPersonal(\''+id+'\')">Sao chép để sửa</button>'
      :'<span class="mute">Đang tải…</span>')
    +'</div></div>';
}
function speakEntry(id){
  var v=V15();
  if(v&&v.speakWord)v.speakWord(id);
}
function toggleMastered(id){
  var v=V15();if(!v)return;
  var o=v.enOld();o.box=o.box||{};
  var e=v.en15();e.due=e.due||{};
  var cur=o.box[id]||0;
  if(cur>=5){o.box[id]=0;e.due[id]=0}
  else{o.box[id]=5;e.due[id]=Date.now()+30*864e5}
  v.save15();rerenderLibrary();
}
function toggleFav(id){
  var v17=V17();
  if(v17&&v17.toggleFav){v17.toggleFav(id);return}
  var e=en22();/* dự phòng: không có V17 thì không làm gì thêm */
  void e;
}
function unitViewHTML(){
  var m=BT_META[ST.unit-1];
  if(!m)return '<p class="mute">Không tìm thấy Unit này.</p><div class="acts"><button class="btn" onclick="__v22.goLibrary()">← Thư viện</button></div>';
  var head='<div class="v17lesson"><button class="v15back" onclick="__v22.goLibrary()">← Thư viện</button>'
    +'<div class="v17head"><h3>Unit '+m.n+' · '+esc(m.en)+'</h3><p class="mute">'+esc(m.vi)+'</p></div>';
  if(!DATA){
    return head+'<p class="mute">'+(DATA_ERR?esc(DATA_ERR):'Đang tải dữ liệu Basic Tactics…')+'</p></div>';
  }
  var u=DATA.units[ST.unit-1];
  var map=enMap();
  var s=unitStats(ST.unit,map);
  var tot=m.words+m.phrases;
  var pct=tot?Math.round(s.learned/tot*100):0;
  var list=(ST.tab==='words'?u.words:u.phrases);
  var f=filterEntries(list,map);
  var per=30,pages=Math.max(1,Math.ceil(f.length/per));
  var pg=Math.max(0,Math.min(ST.page,pages-1));
  var slice=f.slice(pg*per,(pg+1)*per);
  var q=en22().quest[ST.unit]||{};
  var h=head
    +'<p class="mute">'+tot+' mục từ · '+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn'+(q.stars?' · Quest: '+starStr(q.stars):'')+'</p>'
    +'<div class="v17bar big"><i style="width:'+pct+'%"></i></div>'
    +'<div class="acts"><button class="btn pri" onclick="__v22.learnUnit('+m.n+')">Học ngay</button>'
    +'<button class="btn sm" onclick="__v22.reviewUnit('+m.n+')">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v22.quizUnit('+m.n+')">Kiểm tra</button>'
    +'<button class="btn sm" onclick="__v22.bossUnit('+m.n+')">Đánh boss</button>'
    +'<button class="btn sm" onclick="__v22.openQuest('+m.n+')">🎧 Quest Unit '+m.n+'</button></div>'
    +'<div class="v22tabs"><button class="v15tab '+(ST.tab==='words'?'on':'')+'" onclick="__v22.setUnitTab(\'words\')">Words · '+u.words.length+'</button>'
    +'<button class="v15tab '+(ST.tab==='phrases'?'on':'')+'" onclick="__v22.setUnitTab(\'phrases\')">Phrases &amp; Collocations · '+u.phrases.length+'</button></div>'
    +'<div class="v17filters"><input class="v15input" placeholder="Tìm trong Unit '+m.n+'…" value="'+esc(ST.q)+'" oninput="__v22.unitSearch(this.value)">'
    +'<select class="v15sel" onchange="__v22.setUnitStatus(this.value)">'
    +[['all','Tất cả'],['new','Chưa học'],['learning','Đang học'],['mastered','Đã thuộc'],['due','Cần ôn'],['fav','Yêu thích']].map(function(o){return '<option value="'+o[0]+'"'+(ST.status===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')
    +'</select></div>'
    +'<div class="v17words">'+(slice.length?slice.map(function(e){return entryRow(e,map)}).join(''):'<p class="mute">Không tìm thấy mục nào khớp.</p>')+'</div>'
    +pager22(pg,pages)
    +'<p class="mute">Hiện '+slice.length+'/'+f.length+' mục'+(f.length!==list.length?' (đã lọc từ '+list.length+' mục)':'')+'.</p></div>';
  return h;
}

/* ---------- Listening Quest — 24 Missions ---------- */
function openQuest(n){
  ST.view='quest';
  ST.quest={unit:n||0,stage:-1,idx:0,right:0,total:0,wrong:[],list:[],cur:null,
    answered:null,ok:null,revealed:false,skippedListen:false,done:false};
  /* V14: ép về tab Thư viện trước khi vẽ — nếu đang ở tab khác (vd Ôn
     tập), renderTab vẽ tab đó và giao diện Quest không bao giờ hiện. */
  var v=V15();if(v&&v.tab)v.tab('library');else rerenderLibrary();
  ensureData().then(function(){rerenderLibrary()}).catch(function(){rerenderLibrary()});
}
function questHubHTML(){
  var e=en22(),tot=0,done=0;
  BT_META.forEach(function(m){var q=e.quest[m.n]||{};tot+=q.stars||0;if(q.stars)done++});
  var h='<div class="v17lesson"><button class="v15back" onclick="__v22.goLibrary()">← Thư viện</button>'
    +'<div class="v17head"><h3>🎧 Listening Quest — 24 Missions</h3><p class="mute">Mỗi Unit là một nhiệm vụ: học từ đơn → học cụm từ → nhận diện nghĩa → luyện nghe bằng giọng đọc → kiểm tra tổng hợp. Nhận sao theo độ chính xác. Chế độ này luyện nghe từ vựng bằng giọng đọc của trình duyệt — không phải bài nghe hội thoại gốc của sách.</p></div>'
    +'<p class="mute">'+done+'/24 nhiệm vụ đã hoàn thành · '+tot+'/72 sao</p>'
    +'<div class="v17grid">'+BT_META.map(function(m){
      var q=e.quest[m.n]||{};
      return '<div class="v17card v22card"><div class="v17card-t"><b>Mission '+m.n+' · '+esc(m.en)+'</b><span class="mute">'+(m.words+m.phrases)+' mục từ</span></div>'
        +'<div class="mute">'+esc(m.vi)+'</div>'
        +'<div class="mute">'+(q.stars?starStr(q.stars)+' · đúng nhất '+Math.round((q.best||0)*100)+'% · đã chơi '+q.attempts+' lần':'Chưa chơi')+'</div>'
        +'<div class="acts"><button class="btn sm pri" onclick="__v22.openQuest('+m.n+')">'+(q.stars?'Chơi lại':'Bắt đầu')+'</button></div></div>';
    }).join('')+'</div></div>';
  return h;
}
function questEntries(unit){
  var u=DATA.units[unit-1];if(!u)return [];
  return (u.words||[]).concat(u.phrases||[]);
}
function questDistractors(entry,pool,n,byVI){
  var cands=pool.filter(function(x){return x.id!==entry.id});
  /* xáo trộn bằng Math.random (đã cố định 0.99 trong kiểm thử) */
  var arr=cands.slice();
  for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=arr[i];arr[i]=arr[j];arr[j]=t}
  var out=[],seen={};
  if(byVI)seen[(entry.vi||'').toLowerCase()]=1;
  for(var k=0;k<arr.length&&out.length<n;k++){
    var key=byVI?(arr[k].vi||'').toLowerCase():(arr[k].en||'').toLowerCase();
    if(seen[key])continue;seen[key]=1;out.push(arr[k]);
  }
  return out;
}
function questStartStage(stage){
  var Q=ST.quest,pool=questEntries(Q.unit);
  Q.stage=stage;Q.idx=0;Q.answered=null;Q.ok=null;Q.revealed=false;Q.cur=null;
  if(stage===0){Q.list=DATA.units[Q.unit-1].words||[]}
  else if(stage===1){Q.list=DATA.units[Q.unit-1].phrases||[]}
  else if(stage===2){
    var qs=pool.slice();
    for(var i=qs.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=qs[i];qs[i]=qs[j];qs[j]=t}
    Q.list=qs.slice(0,8).map(function(en){
      return {entry:en,mode:'meaning',opts:shuffleOpts([en].concat(questDistractors(en,pool,3,true)))};
    });
  }else if(stage===3){
    if(!ttsAvailable()){Q.skippedListen=true;questStartStage(4);return}
    var qs2=pool.slice();
    for(var i2=qs2.length-1;i2>0;i2--){var j2=Math.floor(Math.random()*(i2+1));var t2=qs2[i2];qs2[i2]=qs2[j2];qs2[j2]=t2}
    Q.list=qs2.slice(0,8).map(function(en){
      return {entry:en,mode:'listen',opts:shuffleOpts([en].concat(questDistractors(en,pool,3,false)))};
    });
  }else if(stage===4){
    var qs3=pool.slice();
    for(var i3=qs3.length-1;i3>0;i3--){var j3=Math.floor(Math.random()*(i3+1));var t3=qs3[i3];qs3[i3]=qs3[j3];qs3[j3]=t3}
    Q.list=qs3.slice(0,10).map(function(en,ix){
      var mode=ix%2===0?'meaning':'listen';
      /* V14: không có giọng đọc thì câu nghe không thể làm bằng tai —
         đổi thành câu chọn nghĩa, chấm trên số câu còn lại. */
      if(!ttsAvailable())mode='meaning';
      return {entry:en,mode:mode,opts:shuffleOpts([en].concat(questDistractors(en,pool,3,mode==='meaning')))};
    });
  }
  Q.cur=Q.list[0]||null;
  if(Q.cur&&Q.cur.mode==='listen')setTimeout(function(){speak22(Q.cur.entry.en)},250);
  rerenderLibrary();
}
function shuffleOpts(arr){
  var a=arr.slice();
  for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}
  return a;
}
function questStartMission(){
  var Q=ST.quest;Q.right=0;Q.total=0;Q.wrong=[];Q.done=false;Q.skippedListen=false;
  questStartStage(0);
}
function questReveal(){var Q=ST.quest;Q.revealed=true;rerenderLibrary()}
function questLearnNext(){
  var Q=ST.quest;Q.idx++;Q.revealed=false;
  if(Q.idx>=Q.list.length){questStartStage(Q.stage+1);return}
  Q.cur=Q.list[Q.idx];rerenderLibrary();
}
function questSkipLearn(){var Q=ST.quest;questStartStage(Q.stage+1)}
function questSpeak(){var Q=ST.quest;if(Q.cur)speak22(Q.cur.entry.en)}
function questPick(i){
  var Q=ST.quest;if(!Q.cur||Q.answered!==null)return;
  var pick=Q.cur.opts[i];if(!pick)return;
  Q.answered=i;Q.ok=(pick.id===Q.cur.entry.id);
  Q.total++;
  if(Q.ok)Q.right++;
  else if(Q.wrong.indexOf(Q.cur.entry.id)<0)Q.wrong.push(Q.cur.entry.id);
  var v=V15(),map=enMap(),w=map[(Q.cur.entry.en||'').toLowerCase()];
  try{if(v&&v.mark15&&w)v.mark15(Q.ok,w,'quest')}catch(e){}
  rerenderLibrary();
}
function questNext(){
  var Q=ST.quest;Q.idx++;Q.answered=null;Q.ok=null;
  if(Q.idx>=Q.list.length){
    if(Q.stage>=4){finishQuest();return}
    questStartStage(Q.stage+1);return;
  }
  Q.cur=Q.list[Q.idx];
  if(Q.cur&&Q.cur.mode==='listen')setTimeout(function(){speak22(Q.cur.entry.en)},250);
  rerenderLibrary();
}
function finishQuest(){
  var Q=ST.quest,e=en22(),unit=Q.unit;
  var acc=Q.total?Q.right/Q.total:0;
  var stars=acc>=0.9?3:(acc>=0.8?2:1);
  var prev=e.quest[unit]||{};
  var rec={stars:Math.max(stars,prev.stars||0),best:Math.max(acc,prev.best||0),
    attempts:(prev.attempts||0)+1,lastAt:Date.now(),
    claimed1:!!prev.claimed1,claimed3:!!prev.claimed3};
  var v=V15();
  if(!prev.claimed1){
    rec.claimed1=true;
    if(v&&v.gain15)v.gain15(25);
    try{S.v7.gems=(S.v7.gems||0)+1}catch(err){}
  }
  if(stars>=3&&!prev.claimed3){
    rec.claimed3=true;
    if(v&&v.gain15)v.gain15(25);
    try{S.v7.gems=(S.v7.gems||0)+1}catch(err){}
  }
  e.quest[unit]=rec;save22();
  Q.done=true;Q.stars=stars;Q.acc=acc;
  rerenderLibrary();
}
function questStageName(s){
  return ['1 · Học từ đơn','2 · Học cụm từ','3 · Nhận diện nghĩa','4 · Luyện nghe','5 · Kiểm tra tổng hợp'][s]||'';
}
function questViewHTML(){
  var Q=ST.quest;
  if(!DATA){
    return '<div class="v17lesson"><button class="v15back" onclick="__v22.goLibrary()">← Thư viện</button>'
      +'<div class="v17head"><h3>🎧 Listening Quest</h3></div>'
      +'<p class="mute">'+(DATA_ERR?esc(DATA_ERR):'Đang tải dữ liệu Basic Tactics…')+'</p></div>';
  }
  if(!Q.unit)return questHubHTML();
  if(Q.done)return questResultHTML();
  if(Q.stage<0){
    var m=BT_META[Q.unit-1];
    return '<div class="v17lesson"><button class="v15back" onclick="__v22.openQuest()">← Tất cả nhiệm vụ</button>'
      +'<div class="v17head"><h3>Mission '+Q.unit+' · '+esc(m.en)+'</h3><p class="mute">'+esc(m.vi)+' · '+(m.words+m.phrases)+' mục từ</p></div>'
      +'<p>Nhiệm vụ gồm 5 phần: học từ đơn, học cụm từ, nhận diện nghĩa, luyện nghe bằng giọng đọc, kiểm tra tổng hợp. Nhận sao theo độ chính xác: ★★★ ≥ 90%, ★★ ≥ 80%, ★ hoàn thành.</p>'
      +'<p class="mute">Phần nghe dùng giọng đọc của trình duyệt (Speech Synthesis). Nếu trình duyệt không hỗ trợ giọng đọc, phần nghe sẽ được bỏ qua và sao tính theo các phần còn lại.</p>'
      +'<div class="acts"><button class="btn pri" onclick="__v22.questStartMission()">Bắt đầu nhiệm vụ</button></div></div>';
  }
  return questStageHTML();
}
function questStageHTML(){
  var Q=ST.quest,m=BT_META[Q.unit-1];
  var h='<div class="v17lesson"><button class="v15back" onclick="__v22.openQuest()">← Tất cả nhiệm vụ</button>'
    +'<div class="v17head"><h3>Mission '+Q.unit+' · '+esc(m.en)+'</h3><p class="mute">'+questStageName(Q.stage)+' · Đúng '+Q.right+'/'+Q.total+' câu đã chấm</p></div>';
  if(Q.stage===0||Q.stage===1){
    var e=Q.list[Q.idx];
    if(!e)return h+'<p class="mute">Hết phần này.</p></div>';
    h+='<div class="v15qcard"><div class="v15qword">'+esc(e.en)+'</div><div class="mute">'+(Q.stage===0?'Từ đơn':'Cụm từ')+' '+(Q.idx+1)+'/'+Q.list.length+'</div>'
      +(Q.revealed?'<div>'+esc(e.vi)+'</div>':'')
      +'</div><div class="acts">'
      +(Q.revealed
        ?'<button class="btn pri" onclick="__v22.questLearnNext()">Tiếp →</button>'
        :'<button class="btn pri" onclick="__v22.questReveal()">Hiện nghĩa</button>')
      +'<button class="btn sm" onclick="__v22.speakEntryByText('+Q.unit+','+Q.idx+','+Q.stage+')">🔊 Nghe</button>'
      +'<button class="btn sm" onclick="__v22.questSkipLearn()">Bỏ qua phần học →</button></div>';
    return h+'</div>';
  }
  var c=Q.cur;
  if(!c)return h+'<p class="mute">Hết phần này.</p></div>';
  var en=c.entry;
  if(c.mode==='meaning'){
    h+='<div class="v15qcard"><div class="v15qword">'+esc(en.en)+'</div><div class="mute">Chọn nghĩa đúng · Câu '+(Q.idx+1)+'/'+Q.list.length+'</div></div>';
  }else{
    h+='<div class="v15qcard"><div class="v15qword">Nghe</div><div class="mute">Nghe phát âm và chọn từ/cụm từ bạn nghe được · Câu '+(Q.idx+1)+'/'+Q.list.length+'</div><div class="acts"><button class="btn pri" onclick="__v22.questSpeak()">🔊 Nghe lại</button></div></div>';
  }
  h+='<div class="v15opts">'+c.opts.map(function(o,i){
    var label=c.mode==='meaning'?o.vi:o.en;
    var cl='';if(Q.answered!==null)cl=(o.id===en.id?'right':(i===Q.answered?'wrong':''));
    return '<button class="v15opt '+cl+'" '+(Q.answered!==null?'disabled':'')+' onclick="__v22.questPick('+i+')">'+(i+1)+'. '+esc(label)+'</button>';
  }).join('')+'</div>';
  if(Q.answered!==null){
    h+='<div class="v15explain" style="color:var(--'+(Q.ok?'ok':'bad')+')">'+(Q.ok?'Chính xác!':'Chưa đúng. Đáp án: <b>'+esc(en.en)+'</b> — '+esc(en.vi))+'</div>'
      +'<div class="acts"><button class="btn pri" onclick="__v22.questNext()">Câu tiếp →</button></div>';
  }
  return h+'</div>';
}
function questResultHTML(){
  var Q=ST.quest,m=BT_META[Q.unit-1];
  var map=enMap();
  var wrongList=Q.wrong.map(function(id){
    var en=null;
    questEntries(Q.unit).forEach(function(x){if(x.id===id)en=x});
    return en?'<div class="v17row"><div><b>'+esc(en.en)+'</b><br><span>'+esc(en.vi)+'</span></div></div>':'';
  }).join('');
  var h='<div class="v17lesson"><button class="v15back" onclick="__v22.openQuest()">← Tất cả nhiệm vụ</button>'
    +'<div class="v17head"><h3>Kết quả Mission '+Q.unit+' · '+esc(m.en)+'</h3></div>'
    +'<div class="v22stars">'+starStr(Q.stars)+'</div>'
    +'<p>Độ chính xác: <b>'+Q.right+'/'+Q.total+'</b> ('+Math.round(Q.acc*100)+'%)'+(Q.skippedListen?' · <span class="mute">Phần nghe đã được bỏ qua vì trình duyệt không hỗ trợ giọng đọc.</span>':'')+'</p>'
    +'<p class="mute">Hoàn thành nhiệm vụ lần đầu: +25 XP, +1 💎. Đạt 3 sao lần đầu: +25 XP, +1 💎.</p>'
    +(Q.wrong.length
      ?'<h4>Cần ôn lại ('+Q.wrong.length+' mục)</h4><div class="v17rows">'+wrongList+'</div>'
        +'<div class="acts"><button class="btn pri" onclick="__v22.reviewUnit('+Q.unit+')">Ôn tập Unit '+Q.unit+' ngay</button></div>'
      :'<p>🎉 Không có mục nào sai — xuất sắc!</p>')
    +'<div class="acts"><button class="btn pri" onclick="__v22.openQuest('+Q.unit+')">Chơi lại</button>'
    +'<button class="btn sm" onclick="__v22.goLibrary()">← Thư viện</button></div></div>';
  return h;
}
function speakEntryByText(unit,idx,stage){
  var list=stage===0?DATA.units[unit-1].words:DATA.units[unit-1].phrases;
  var e=list&&list[idx];if(e)speak22(e.en);
}

/* ---------- V38 (V18.3): chọn bộ từ đánh boss cho MỌI bộ Thư viện ----------
   V18.2 trở về trước, picker chỉ có Basic Tactics. Các bộ còn lại
   (A1–A2, Oxford, Chrono, Skyroot) đã có scope {kind:'lib',...} mà
   engine V15 hỗ trợ (inScope15/wordsFiltered) — chỉ picker là không
   tạo được chúng. "Từ vựng của tôi" KHÔNG có ở đây: từ tự thêm không
   có trường lib (v15.js tạo custom words không kèm lib) nên không có
   scope nào chọn được chúng. Loại từ (word/phrase) và trạng thái
   (chưa thuộc/cần ôn) chỉ engine mới áp dụng cho BT (btMap + khối
   if(sc.lib==='bt') trong inScope15/wordsFiltered) nên hai dropdown
   đó chỉ hiện khi chọn BT. */
function bossLibs(){
  return [
    {v:'',n:'Tất cả từ vựng'},
    {v:'a1a2',n:'A1–A2 Vocabulary'},
    {v:'oxford',n:'Oxford 3000'},
    {v:'chrono',n:'Chrono Kingdom'},
    {v:'skyroot',n:'Skyroot Sanctuary'},
    {v:'all',n:'Basic Tactics — Toàn bộ 24 Units'},
    {v:'units',n:'Basic Tactics — Chọn Units…'}
  ];
}
function bossLibOf(sc){
  if(!sc||sc.kind!=='lib')return '';
  if(sc.lib==='bt')return sc.unit?'units':'all';
  if(sc.lib==='a1a2'||sc.lib==='oxford'||sc.lib==='chrono'||sc.lib==='skyroot')return sc.lib;
  return '';
}
function bossTopics(){try{var v17=V17();return v17&&v17.topics?v17.topics():[]}catch(e){return []}}
function bossLessons(){try{var v17=V17();return v17&&v17.lessons?v17.lessons():[]}catch(e){return []}}
function bossChronoSets(){try{var v17=V17();return v17&&v17.chronoSets?v17.chronoSets():[]}catch(e){return []}}
function bossSkyrootSets(){try{var v17=V17();return v17&&v17.skyrootSets?v17.skyrootSets():[]}catch(e){return []}}
function bossTopicName(id){try{var v17=V17();return v17&&v17.topicName?v17.topicName(id):id}catch(e){return id}}
/* Vùng chọn con theo bộ. sc=null nghĩa là "toàn bộ" cho bộ đó. */
function bossSubHTML(lib,sc){
  if(!lib)return '';
  if(lib==='a1a2'){
    var ts=bossTopics();
    if(!ts.length)return '<p class="mute">Không tải được danh sách chủ đề — sẽ dùng toàn bộ A1–A2.</p>';
    var cur=sc&&sc.topic?sc.topic:null;
    return '<div class="v22chips" id="v22bs-chips">'
      +'<button type="button" class="v15pill'+(!cur?' on':'')+'" data-all="1" onclick="__v22.bossSubPick(this)">Tất cả chủ đề</button>'
      +ts.map(function(g){
        return '<button type="button" class="v15pill'+(cur===g.id?' on':'')+'" data-t="'+esc(g.id)+'" title="'+esc(g.name)+' · '+g.words.length+' từ" onclick="__v22.bossSubPick(this)">'+esc(g.name)+'</button>';
      }).join('')+'</div>';
  }
  if(lib==='oxford'){
    var ls=bossLessons(),nums=ls.length?ls.map(function(x){return x.n}):[];
    if(!nums.length){for(var i=1;i<=136;i++)nums.push(i)}
    var curL=sc&&sc.lesson?sc.lesson:0;
    return '<div class="v22chips" id="v22bs-chips"><select class="v15sel" id="v22bs-lesson" aria-label="Chọn bài Oxford">'
      +'<option value="">Toàn bộ '+nums.length+' bài</option>'
      +nums.map(function(n){return '<option value="'+n+'"'+(curL===n?' selected':'')+'>Bài '+n+'</option>'}).join('')
      +'</select></div>';
  }
  if(lib==='chrono'||lib==='skyroot'){
    var sets=lib==='chrono'?bossChronoSets():bossSkyrootSets();
    if(!sets.length)return '<p class="mute">Không tải được danh sách bộ từ — sẽ dùng toàn bộ '+(lib==='chrono'?'Chrono Kingdom':'Skyroot Sanctuary')+'.</p>';
    var curS=sc&&sc.set?sc.set:null;
    return '<div class="v22chips" id="v22bs-chips">'
      +'<button type="button" class="v15pill'+(!curS?' on':'')+'" data-all="1" onclick="__v22.bossSubPick(this)">Tất cả 4 bộ</button>'
      +sets.map(function(g){
        return '<button type="button" class="v15pill'+(curS===g.id?' on':'')+'" data-s="'+esc(g.id)+'" title="'+esc(g.name)+' · '+g.words.length+' từ" onclick="__v22.bossSubPick(this)">'+esc(g.name)+'</button>';
      }).join('')+'</div>';
  }
  /* BT: giữ nguyên chips Unit 1–24 đa chọn (hành vi V18.2). */
  var units=null,isBT=sc&&sc.kind==='lib'&&sc.lib==='bt';
  if(sc&&sc.unit)units=Array.isArray(sc.unit)?sc.unit.slice():[sc.unit];
  return '<div class="v22chips" id="v22bs-chips">'+BT_META.map(function(m){
    var on=!isBT||!units||units.indexOf(m.n)>=0;
    return '<button class="v15pill '+(on?'on':'')+'" data-u="'+m.n+'" onclick="this.classList.toggle(\'on\')">Unit '+m.n+'</button>';
  }).join('')+'</div>';
}
/* Đổi bộ trong dropdown: vẽ lại vùng chọn con (về "toàn bộ") và chỉ hiện
   dropdown loại từ/trạng thái + nút chọn tất cả khi đang chọn BT. */
function bossLibChange(){
  var sel=document.querySelector('#v22bs-lib');if(!sel)return;
  var lib=sel.value||'';
  var sub=document.querySelector('#v22bs-sub');if(sub)sub.innerHTML=bossSubHTML(lib,null);
  var isBT=(lib==='all'||lib==='units');
  var ts=document.querySelector('#v22bs-ts');if(ts)ts.style.display=isBT?'':'none';
  var pa=document.querySelector('#v22bs-pickall');if(pa)pa.style.display=isBT?'':'none';
}
/* Chọn một chip đơn chọn (chủ đề A1–A2 / bộ Chrono / bộ Skyroot). Bấm lại
   chip đang chọn thì về "Tất cả". */
function bossSubPick(el){
  if(!el)return;
  var chips=document.querySelectorAll('#v22bs-chips .v15pill');
  var wasOn=el.classList.contains('on');
  for(var i=0;i<chips.length;i++)chips[i].classList.remove('on');
  if(el.getAttribute('data-all')){el.classList.add('on');return}
  if(!wasOn){el.classList.add('on');return}
  for(var j=0;j<chips.length;j++){if(chips[j].getAttribute('data-all'))chips[j].classList.add('on')}
}
/* Chip đơn chọn đang bật (bỏ qua nút "Tất cả"): trả về data-t / data-s. */
function bossSelectedSub(attr){
  var chips=document.querySelectorAll('#v22bs-chips .v15pill.on');
  for(var i=0;i<chips.length;i++){
    if(chips[i].getAttribute('data-all'))continue;
    var val=chips[i].getAttribute('data-'+attr);
    if(val)return val;
  }
  return null;
}

/* ---------- chọn bộ từ trước khi đánh boss ---------- */
function bossScopeHTML(){
  var v=V15();if(!v)return '';
  var sc=null;try{sc=v.en15().scope}catch(e){}
  var lib=bossLibOf(sc);
  var isBT=(lib==='all'||lib==='units');
  var h='<div class="v22bscope"><b>🎧 Bộ từ đánh boss</b> <span class="mute">Chỉ áp dụng cho trận tiếng Anh — câu hỏi tiếng Hàn không đổi. <span id="v22bs-current">Đang chọn: <b>'+esc(scopeName22(sc))+'</b></span></span>'
    +'<div class="acts">'
    +'<select class="v15sel" id="v22bs-lib" onchange="__v22.bossLibChange()">'
    +bossLibs().map(function(o){return '<option value="'+o.v+'"'+(lib===o.v?' selected':'')+'>'+o.n+'</option>'}).join('')
    +'</select>'
    +'<span id="v22bs-ts" style="display:'+(isBT?'':'none')+'">'
    +'<select class="v15sel" id="v22bs-type">'
    +'<option value="">Từ đơn + Cụm từ</option>'
    +'<option value="word"'+(isBT&&sc&&sc.type==='word'?' selected':'')+'>Chỉ từ đơn</option>'
    +'<option value="phrase"'+(isBT&&sc&&sc.type==='phrase'?' selected':'')+'>Chỉ cụm từ</option>'
    +'</select>'
    +'<select class="v15sel" id="v22bs-status">'
    +'<option value="">Mọi trạng thái</option>'
    +'<option value="unlearned"'+(isBT&&sc&&sc.status==='unlearned'?' selected':'')+'>Chỉ mục chưa thuộc</option>'
    +'<option value="due"'+(isBT&&sc&&sc.status==='due'?' selected':'')+'>Chỉ mục cần ôn</option>'
    +'</select></span>'
    +'<button class="btn sm pri" onclick="__v22.applyBossScope()">Áp dụng</button></div>'
    +'<div id="v22bs-sub">'+bossSubHTML(lib,sc)+'</div>'
    +'<div class="acts" id="v22bs-pickall" style="display:'+(isBT?'':'none')+'"><button class="btn sm" onclick="__v22.bossPickAll(true)">Chọn tất cả Units</button><button class="btn sm" onclick="__v22.bossPickAll(false)">Bỏ chọn tất cả</button></div>'
    +'</div>';
  return h;
}
function bossPickAll(on){
  var chips=document.querySelectorAll('#v22bs-chips .v15pill');
  for(var i=0;i<chips.length;i++){if(on)chips[i].classList.add('on');else chips[i].classList.remove('on')}
}
function applyBossScope(){
  var lib=(document.querySelector('#v22bs-lib')||{}).value||'';
  var v=V15();if(!v)return;
  var sc=null;
  if(lib==='a1a2'){
    sc={kind:'lib',lib:'a1a2'};
    var topic=bossSelectedSub('t');
    if(topic)sc.topic=topic;
  }else if(lib==='oxford'){
    sc={kind:'lib',lib:'oxford'};
    var lsEl=document.querySelector('#v22bs-lesson');
    var lesson=lsEl?parseInt(lsEl.value,10):0;
    if(lesson)sc.lesson=lesson;
  }else if(lib==='chrono'||lib==='skyroot'){
    sc={kind:'lib',lib:lib};
    var set=bossSelectedSub('s');
    if(set)sc.set=set;
  }else if(lib==='all'||lib==='units'){
    var type=(document.querySelector('#v22bs-type')||{}).value||'';
    var status=(document.querySelector('#v22bs-status')||{}).value||'';
    var units=[];
    var chips=document.querySelectorAll('#v22bs-chips .v15pill.on');
    for(var i=0;i<chips.length;i++){var u=parseInt(chips[i].getAttribute('data-u'),10);if(u)units.push(u)}
    /* V40 (C-12): "Bỏ chọn tất cả" + Áp dụng previously applied the
       WHOLE BT library — the opposite of what the button promised.
       Refuse until at least one Unit is picked. (lib==='all' goes
       through the same branch with no chips on purpose and is
       unaffected — this guard only fires for 'units'.) */
    if(lib==='units'&&!units.length){pop22('Chọn ít nhất 1 Unit.');return}
    sc={kind:'lib',lib:'bt'};
    if(lib==='units'&&units.length&&units.length<24)sc.unit=units.length===1?units[0]:units;
    if(type)sc.type=type;
    if(status)sc.status=status;
  }
  /* lib==='' (Tất cả từ vựng): sc giữ null -> bỏ chọn phạm vi. */
  var done=function(){
    if(sc)v.setScope(sc);else v.clearScope();
    var cur=document.querySelector('#v22bs-current');
    if(cur)cur.innerHTML='Đang chọn: <b>'+esc(scopeName22(v.en15().scope))+'</b>';
    pop22('Đã chọn bộ từ đánh boss: '+scopeName22(v.en15().scope));
  };
  if(lib==='all'||lib==='units'){
    ensureData().then(function(){done()}).catch(function(){pop22(DATA_ERR||'Không tải được dữ liệu Basic Tactics.')});
  }else{
    /* Các bộ Thư viện khác không cần dữ liệu BT — áp dụng ngay, kể cả
       khi đang bỏ chọn (trước đây bỏ chọn cũng chờ tải BT xong). */
    done();
  }
}
function clearBossScope(){
  var v=V15();if(!v)return;
  v.clearScope();
  var cur=document.querySelector('#v22bs-current');
  if(cur)cur.innerHTML='Đang chọn: <b>Tất cả từ vựng</b>';
  pop22('Đã bỏ chọn bộ từ — boss dùng tất cả từ vựng.');
}

/* ---------- view hook cho Thư viện (V17 gọi) ---------- */
function viewHTML(){
  if(ST.view==='unit')return unitViewHTML();
  if(ST.view==='quest')return questViewHTML();
  return null;
}

window.__v22={
  groupHTML:groupHTML,viewHTML:viewHTML,
  learnAll:learnAll,reviewAll:reviewAll,learnUnit:learnUnit,reviewUnit:reviewUnit,
  quizUnit:quizUnit,bossUnit:bossUnit,openUnit:openUnit,goLibrary:goLibrary,
  setUnitTab:setUnitTab,unitSearch:unitSearch,setUnitStatus:setUnitStatus,setUnitPage:setUnitPage,
  speakEntry:speakEntry,toggleMastered:toggleMastered,toggleFav:toggleFav,
  openQuest:openQuest,questStartMission:questStartMission,questReveal:questReveal,
  questLearnNext:questLearnNext,questSkipLearn:questSkipLearn,questSpeak:questSpeak,
  questPick:questPick,questNext:questNext,speakEntryByText:speakEntryByText,
  bossScopeHTML:bossScopeHTML,bossPickAll:bossPickAll,applyBossScope:applyBossScope,clearBossScope:clearBossScope,scopeName22:scopeName22,bossLibChange:bossLibChange,bossSubPick:bossSubPick,bossSubHTML:bossSubHTML,bossSelectedSub:bossSelectedSub,
  ensureData:ensureData,attachBT:function(){var v=V15();return v?v.attachBT():0},
  get data(){return DATA},get meta(){return BT_META},
  get state(){return ST},get en22(){return en22()},
  _test:{spoken:function(){return SPOKEN_LOG.slice()},tts:function(){return ttsAvailable()},
    quest:function(){return ST.quest},reset:function(){DATA=null;DATA_P=null;DATA_ERR='';window.__V22_BT=null;SPOKEN_LOG.length=0;ST.view=null;ST.quest=null}},
  version:'14.0.0'
};
})();
