/* ===== V17 — Built-in Vocabulary Library (English Hub) =====
   A1-A2 (1000 từ, 19 chủ đề) + Oxford 3000 (3396 từ, 136 bài).
   Dữ liệu: window.__V17_A1A2 / window.__V17_OXFORD (nạp trước file này).
   Từ vựng sống trong danh sách WORDS chung của V15 (buildWords gắn thông
   tin thư viện: w.lib, w.a1a2Topic, w.oxLesson, w.extra). Lớp này chỉ vẽ
   giao diện Thư viện, phạm vi học (scope), yêu thích và thưởng bài học.
   Dữ liệu người dùng: S.v7.en17 = {fav:[wordId], claimed:{key:true}} —
   chỉ lưu ID, KHÔNG sao chép từ vựng vào localStorage. */
(function(){
'use strict';
var V15=function(){return window.__v15||null};
var esc=function(s){var v=V15();return v?v.esc(s):String(s==null?'':s)};
var V={view:'home',lib:null,topic:null,lesson:0,set:null,q:'',pos:'',status:'all',page:0,oxPage:0,oxQ:'',oxPos:''};

/* ---------- dữ liệu ---------- */
function WORDS(){var v=V15();return v?v.words:[]}
function en17(){
  try{S.v7=S.v7||{};var e=S.v7.en17;
    if(!e)e=S.v7.en17={fav:[],claimed:{}};
    e.fav=e.fav||[];e.claimed=e.claimed||{};
    return e;
  }catch(err){return {fav:[],claimed:{}}}
}
function oldBox(){var v=V15();var o=v?v.enOld():null;return o||{box:{},right:{},wrong:{},review:[],done:{},custom:[]}}
function boxOf(id){var o=oldBox();return (o.box||{})[id]||0}
function statsOf(list){
  var v=V15(),e=v?v.en15():{due:{}},now=Date.now();
  var s={total:list.length,learned:0,mastered:0,due:0};
  list.forEach(function(w){
    var b=boxOf(w.id);
    if(b>=1)s.learned++;
    if(b>=5)s.mastered++;
    if((e.due[w.id]||0)<=now)s.due++;
  });
  return s;
}
function a1a2Words(){return WORDS().filter(function(w){return (w.lib||[]).indexOf('a1a2')>=0})}
function oxWords(){return WORDS().filter(function(w){return (w.lib||[]).indexOf('oxford')>=0})}
function skyrootSetName(id){
  var m={climate:'Climate & Environment',science:'Science & Innovation',society:'Society & Culture',mind:'Mind & Character'};
  return m[id]||id;
}
function skyrootWords(){return WORDS().filter(function(w){return (w.lib||[]).indexOf('skyroot')>=0})}
function skyrootSets(){
  var order=['climate','science','society','mind'],map={};
  skyrootWords().forEach(function(w){
    var k=w.skyrootSet||'climate';
    if(!map[k])map[k]={id:k,name:skyrootSetName(k),words:[]};
    map[k].words.push(w);
  });
  return order.filter(function(k){return map[k]}).map(function(k){return map[k]});
}
function skyrootSetCard(g){
  var s=statsOf(g.words);
  var pct=s.total?Math.round(s.learned/s.total*100):0;
  return '<div class="v17card"><div class="v17card-t"><b>'+esc(g.name)+'</b><span class="mute">'+g.words.length+' từ</span></div>'
    +'<div class="v17bar"><i style="width:'+pct+'%"></i></div>'
    +'<div class="mute">'+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn</div>'
    +'<div class="acts"><button class="btn sm pri" onclick="__v17.learnSkyrootSet(\''+g.id+'\')">Học ngay</button>'
    +'<button class="btn sm" onclick="__v17.reviewSkyrootSet(\''+g.id+'\')">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v17.openSkyrootSet(\''+g.id+'\')">Xem từ</button></div></div>';
}
function skyrootGroupHTML(){
  var ws=skyrootWords();
  var s=statsOf(ws);
  var pct=s.total?Math.round(s.learned/s.total*100):0;
  return '<div class="v17group"><div class="v17group-head"><b>🌿 Skyroot Sanctuary — Thánh Địa Thiên Căn</b><span class="mute">'+ws.length+' từ · 4 bộ · trình độ B2</span></div>'
    +'<p class="mute">Từ vựng Thánh Địa Thiên Căn (V18.0) — học xong mỗi bộ để nhận thưởng, dùng trong trận boss Skyroot. 120 từ dẫn bằng tiếng Hàn (từ Hàn là từ chính trong nguồn) — trong kho từ chung vẫn hiển thị đầu từ tiếng Anh kèm nghĩa Hàn.</p>'
    +'<div class="acts"><button class="btn sm pri" onclick="__v17.learnScopeKey(\'skyroot\')">Học ngay</button>'
    +'<button class="btn sm" onclick="__v17.reviewScopeKey(\'skyroot\')">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v17.openLib(\'skyroot\')">Xem tất cả từ</button></div>'
    +'<div class="mute">Tổng: '+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn</div>'
    +'<div class="v17bar"><i style="width:'+pct+'%"></i></div>'
    +'<div class="v17grid">'+skyrootSets().map(skyrootSetCard).join('')+'</div>'
    +'<p class="mute">Tiếng Hàn: từ Skyroot tiếng Hàn học qua deck tiếng Hàn đã chọn (trận boss / Học thông minh); từ Skyroot trong kho từ chung dùng đầu từ tiếng Anh.</p></div>';
}
function chronoSetName(id){
  var m={time:'Time & Calendar',space:'Space & Astronomy',machines:'Machines & Engineering',change:'Change & Sequence'};
  return m[id]||id;
}
function chronoWords(){return WORDS().filter(function(w){return (w.lib||[]).indexOf('chrono')>=0})}
function chronoSets(){
  var order=['time','space','machines','change'],map={};
  chronoWords().forEach(function(w){
    var k=w.chronoSet||'time';
    if(!map[k])map[k]={id:k,name:chronoSetName(k),words:[]};
    map[k].words.push(w);
  });
  return order.filter(function(k){return map[k]}).map(function(k){return map[k]});
}
function chronoSetCard(g){
  var s=statsOf(g.words);
  var pct=s.total?Math.round(s.learned/s.total*100):0;
  var ret='';
  try{if(window.__v34&&__v34.setStats){var st=__v34.setStats(g.id);if(st&&st.attempts>0)ret=' · nhớ đúng '+st.retention;}}catch(e){}
  return '<div class="v17card"><div class="v17card-t"><b>'+esc(g.name)+'</b><span class="mute">'+g.words.length+' từ</span></div>'
    +'<div class="v17bar"><i style="width:'+pct+'%"></i></div>'
    +'<div class="mute">'+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn'+ret+'</div>'
    +'<div class="acts"><button class="btn sm pri" onclick="__v17.learnSet(\''+g.id+'\')">Học ngay</button>'
    +'<button class="btn sm" onclick="__v17.reviewSet(\''+g.id+'\')">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v17.openSet(\''+g.id+'\')">Xem từ</button></div></div>';
}
function chronoGroupHTML(){
  var ws=chronoWords();
  var s=statsOf(ws);
  var pct=s.total?Math.round(s.learned/s.total*100):0;
  var ret='';
  try{if(window.__v34&&__v34.chronoAnalytics){var a=__v34.chronoAnalytics();if(a&&a.total&&a.total.attempts>0)ret=' · nhớ đúng '+a.total.retention;}}catch(e){}
  return '<div class="v17group"><div class="v17group-head"><b>⏳ Chrono Kingdom — Vương Quốc Thời Gian</b><span class="mute">'+ws.length+' từ · 4 bộ · trình độ B2</span></div>'
    +'<p class="mute">Từ vựng Vương Quốc Thời Gian (V17.0) — học xong mỗi bộ để nhận thưởng, dùng trong trận boss Chrono.</p>'
    +'<div class="acts"><button class="btn sm pri" onclick="__v17.learnScopeKey(\'chrono\')">Học ngay</button>'
    +'<button class="btn sm" onclick="__v17.reviewScopeKey(\'chrono\')">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v17.openLib(\'chrono\')">Xem tất cả từ</button></div>'
    +'<div class="mute">Tổng: '+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn'+ret+'</div>'
    +'<div class="v17bar"><i style="width:'+pct+'%"></i></div>'
    +'<div class="v17grid">'+chronoSets().map(chronoSetCard).join('')+'</div>'
    +'<p class="mute">Tiếng Hàn: Chưa có từ Chrono tiếng Hàn — từ Chrono hiện chỉ có bản tiếng Anh (kèm nghĩa tiếng Hàn hiển thị).</p></div>';
}
/* tổng số mục từ trong nguồn (kể cả từ trùng đầu từ ở hai chủ đề/bài) */
function a1a2Total(){return (window.__V17_A1A2||[]).length||a1a2Words().length}
function oxTotal(){return (window.__V17_OXFORD||[]).length||oxWords().length}
function topicName(id){var v=V15();return v?v.topicName(id):id}
function topics(){
  var map={};
  a1a2Words().forEach(function(w){
    /* một từ có thể thuộc nhiều chủ đề — xuất hiện trong mọi chủ đề đó */
    var ts=w.a1a2Topics||[w.a1a2Topic||w.t];
    ts.forEach(function(t){
      if(!t)return;
      if(!map[t])map[t]={id:t,name:w.a1a2TopicName||w.t,words:[]};
      map[t].words.push(w);
    });
  });
  var arr=Object.keys(map).map(function(k){return map[k]});
  var noIn=function(w,t){return ((w.a1a2NoMap||{})[t]!=null?(w.a1a2NoMap||{})[t]:(w.a1a2No||0))};
  arr.forEach(function(g){g.words.sort(function(a,b){return noIn(a,g.id)-noIn(b,g.id)})});
  /* giữ thứ tự chủ đề gốc trong PDF (theo STT của từ đầu tiên) */
  arr.sort(function(a,b){return noIn(a.words[0],a.id)-noIn(b.words[0],b.id)});
  return arr;
}
function lessons(){
  var map={};
  oxWords().forEach(function(w){
    /* một từ có thể ở hai bài — xuất hiện trong cả hai bài */
    var ns=w.oxLessons||[w.oxLesson||0];
    ns.forEach(function(n){
      if(!n)return;
      if(!map[n])map[n]={n:n,words:[]};
      map[n].words.push(w);
    });
  });
  var arr=Object.keys(map).map(function(k){return map[k]});
  var ordIn=function(w,n){return ((w.oxOrdMap||{})[n]!=null?(w.oxOrdMap||{})[n]:(w.oxOrd||0))};
  arr.forEach(function(g){g.words.sort(function(a,b){return ordIn(a,g.n)-ordIn(b,g.n)})});
  arr.sort(function(a,b){return a.n-b.n});
  return arr;
}
function ordInLesson(w,n){return ((w.oxOrdMap||{})[n]!=null?(w.oxOrdMap||{})[n]:(w.oxOrd||0))}
function hasPos(w,pos){
  if(!pos)return true;
  var parts=(w.pos||'').split(',').map(function(s){return s.trim().replace(/\(.*\)/,'').trim()});
  return parts.indexOf(pos)>=0;
}
function currentScope(){
  if(V.lib==='a1a2')return V.topic?{kind:'lib',lib:'a1a2',topic:V.topic}:{kind:'lib',lib:'a1a2'};
  if(V.lib==='oxford')return V.lesson?{kind:'lib',lib:'oxford',lesson:V.lesson}:{kind:'lib',lib:'oxford'};
  if(V.lib==='chrono')return V.set?{kind:'lib',lib:'chrono',set:V.set}:{kind:'lib',lib:'chrono'};
  if(V.lib==='skyroot')return V.set?{kind:'lib',lib:'skyroot',set:V.set}:{kind:'lib',lib:'skyroot'};
  return null;
}
function scopeName(sc){
  if(!sc||sc.kind!=='lib')return '';
  if(sc.lib==='bt'){
    var u='';
    if(sc.unit){var us=Array.isArray(sc.unit)?sc.unit:[sc.unit];
      u=us.length===1?' · Unit '+us[0]:' · '+us.length+' Units';}
    var t=sc.type?(sc.type==='word'?' · Từ đơn':' · Cụm từ'):'';
    var s=sc.status?(sc.status==='unlearned'?' · Chưa thuộc':' · Cần ôn'):'';
    return 'Basic Tactics'+u+t+s;
  }
  if(sc.lib==='a1a2'){
    if(sc.topic)return 'A1–A2 · '+topicName(sc.topic);
    return 'A1–A2 Vocabulary';
  }
  if(sc.lib==='oxford'){
    if(sc.lesson)return 'Oxford 3000 · Bài '+sc.lesson;
    return 'Oxford 3000';
  }
  if(sc.lib==='chrono'){
    if(sc.set)return 'Chrono · '+chronoSetName(sc.set);
    return 'Chrono Kingdom';
  }
  if(sc.lib==='skyroot'){
    if(sc.set)return 'Skyroot · '+skyrootSetName(sc.set);
    return 'Skyroot Sanctuary';
  }
  return '';
}
function rewardFor(key){
  if(key==='a1a2:all')return {xp:200,gems:5};
  if(key==='oxford:all')return {xp:300,gems:5};
  if(key==='skyroot:all')return {xp:200,gems:5};
  if(key.indexOf('skyroot:')===0)return {xp:50,gems:2};
  if(key==='chrono:all')return {xp:200,gems:5};
  if(key.indexOf('chrono:')===0)return {xp:50,gems:2};
  if(key.indexOf('a1a2:')===0)return {xp:50,gems:2};
  return {xp:25,gems:1};
}

/* ---------- banner phạm vi (hiện trên mọi tab của hub) ---------- */
function scopeBannerHTML(){
  var v=V15();if(!v)return '';
  var sc=v.en15().scope;if(!sc||sc.kind!=='lib')return '';
  return '<div class="v17scope">Đang học: <b>'+esc(scopeName(sc))+'</b> — các chế độ học, ôn tập và boss chỉ dùng từ trong bộ này.'
    +' <button class="v17scope-x" onclick="__v17.clearScope()">✕ Bỏ chọn</button></div>';
}

/* ---------- trang chính Thư viện ---------- */
function libraryHTML(){
  /* V22: khi đang xem một Unit Basic Tactics hoặc Listening Quest,
     V22 vẽ toàn bộ nội dung thay cho trang chính của Thư viện. */
  if(window.__v22){var v22=__v22.viewHTML();if(v22)return v22}
  if(V.view==='lesson')return lessonHTML();
  var h='<div class="v17lib"><div class="v17head"><h3>📚 Thư viện từ vựng</h3>'
    +'<p class="mute">Từ vựng có sẵn — mở ra là học ngay, không cần upload. Tiến trình học lưu riêng cho từng từ, không trộn với từ của bạn.</p></div>';
  /* Nhóm 1 — A1-A2 */
  h+='<div class="v17group"><div class="v17group-head"><b>A1–A2 Vocabulary</b><span class="mute">'+a1a2Total()+' từ · 19 chủ đề · trình độ A1–A2</span></div>'
    +'<div class="acts"><button class="btn sm pri" onclick="__v17.learnScopeKey(\'a1a2\')">Học ngay</button>'
    +'<button class="btn sm" onclick="__v17.reviewScopeKey(\'a1a2\')">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v17.openLib(\'a1a2\')">Xem tất cả từ</button></div>'
    +'<div class="v17grid">'+topics().map(topicCard).join('')+'</div></div>';
  /* Nhóm 2 — Oxford 3000 */
  h+='<div class="v17group"><div class="v17group-head"><b>Oxford 3000 – Từ vựng thông dụng</b><span class="mute">'+oxTotal()+' từ · 136 bài × 25 từ · giữ nguyên thứ tự gốc</span></div>'
    +'<div class="acts"><button class="btn sm pri" onclick="__v17.learnScopeKey(\'oxford\')">Học ngay</button>'
    +'<button class="btn sm" onclick="__v17.reviewScopeKey(\'oxford\')">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v17.openLib(\'oxford\')">Xem tất cả từ</button></div>'
    +'<div class="v17ox-tools"><input class="v15input" placeholder="Tìm từ trong Oxford 3000…" value="'+esc(V.oxQ)+'" oninput="__v17.oxSearch(this.value)">'
    +posSelect('oxPos',V.oxPos)+'</div>'
    +lessonGrid()+'</div>';
  /* Nhóm 2b — Chrono Kingdom (V34, V17.1: 240 từ đã có từ V17.0) */
  h+=chronoGroupHTML();
  h+=skyrootGroupHTML();
  /* Nhóm 3 — Basic Tactics for Listening (V22, dữ liệu tải lười) */
  h+=(window.__v22&&__v22.groupHTML?__v22.groupHTML():'');
  /* Nhóm 4 — Từ vựng của tôi */
  h+=myGroupHTML();
  return h+'</div>';
}
function topicCard(g){
  var s=statsOf(g.words);
  var pct=s.total?Math.round(s.learned/s.total*100):0;
  return '<div class="v17card"><div class="v17card-t"><b>'+esc(topicName(g.id))+'</b><span class="mute">'+g.words.length+' từ</span></div>'
    +'<div class="v17bar"><i style="width:'+pct+'%"></i></div>'
    +'<div class="mute">'+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn</div>'
    +'<div class="acts"><button class="btn sm pri" onclick="__v17.learnTopic(\''+g.id+'\')">Học ngay</button>'
    +'<button class="btn sm" onclick="__v17.reviewTopic(\''+g.id+'\')">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v17.openTopic(\''+g.id+'\')">Xem từ</button></div></div>';
}
function lessonCard(g){
  var s=statsOf(g.words);
  var pct=s.total?Math.round(s.learned/s.total*100):0;
  var first=g.words[0],last=g.words[g.words.length-1];
  return '<div class="v17card"><div class="v17card-t"><b>Bài '+g.n+'</b><span class="mute">từ '+(first?ordInLesson(first,g.n):'?')+'–'+(last?ordInLesson(last,g.n):'?')+' · '+g.words.length+' từ</span></div>'
    +'<div class="v17bar"><i style="width:'+pct+'%"></i></div>'
    +'<div class="mute">'+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn</div>'
    +'<div class="acts"><button class="btn sm pri" onclick="__v17.learnLesson('+g.n+')">Học ngay</button>'
    +'<button class="btn sm" onclick="__v17.reviewLesson('+g.n+')">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v17.openLesson('+g.n+')">Xem từ</button></div></div>';
}
function lessonGrid(){
  var q=V.oxQ.toLowerCase(),pos=V.oxPos;
  if(q||pos){
    var list=oxWords().filter(function(w){
      if(pos&&!hasPos(w,pos))return false;
      if(!q)return true;
      return w.en.toLowerCase().indexOf(q)>=0||w.vi.toLowerCase().indexOf(q)>=0;
    });
    var shown=list.slice(0,30);
    var h='<div class="v17rows">'+shown.map(function(w){
      return '<div class="v17row"><div><b>'+esc(w.en)+'</b> <span class="mute">'+esc(w.ipa||'')+' · '+esc(w.pos||'')+' · Bài '+w.oxLesson+'</span><br><span>'+esc(w.vi)+'</span></div>'
        +'<div class="acts"><button class="btn sm" onclick="__v17.openLesson('+w.oxLesson+')">Xem bài '+w.oxLesson+'</button>'
        +'<button class="btn sm" onclick="__v17.speak(\''+w.id+'\')">Nghe</button></div></div>';
    }).join('')+'</div>';
    if(!list.length)h='<p class="mute">Không tìm thấy từ nào khớp.</p>';
    else if(list.length>30)h+='<p class="mute">Hiện 30/'+list.length+' từ — hãy thu hẹp tìm kiếm.</p>';
    return h;
  }
  var ls=lessons(),per=24,pages=Math.max(1,Math.ceil(ls.length/per));
  var pg=Math.max(0,Math.min(V.oxPage,pages-1));
  var slice=ls.slice(pg*per,(pg+1)*per);
  return '<div class="v17grid">'+slice.map(lessonCard).join('')+'</div>'+pagerHTML(pg,pages,'oxPage');
}
function myGroupHTML(){
  var ws=WORDS();
  var custom=ws.filter(function(w){return w.custom}).length;
  var decks=0,deckNames=[];
  try{var e16=S.v7&&S.v7.en16;if(e16&&e16.decks){decks=e16.decks.length;deckNames=e16.decks.map(function(d){return d.name})}}catch(err){}
  var fav=en17().fav.length;
  return '<div class="v17group"><div class="v17group-head"><b>📁 Từ vựng của tôi</b><span class="mute">'+custom+' từ tự thêm · '+decks+' bộ từ · '+fav+' từ yêu thích</span></div>'
    +'<p class="mute">Từ bạn tự nhập hoặc upload bằng Nhập thông minh (V8). Từ hệ thống không bị trộn vào đây.</p>'
    +'<div class="acts"><button class="btn pri" onclick="__v15.tab(\'vocab\')">Mở Từ vựng của tôi</button>'
    +'<button class="btn sm" onclick="window.__v16?__v16.open(\'en\'):__v15.vocabImport()">🧠 Nhập thông minh</button></div>'
    +(deckNames.length?'<p class="mute">Bộ từ của bạn: '+esc(deckNames.join(', '))+'</p>':'')
    +'</div>';
}

/* ---------- xem một chủ đề / bài ---------- */
function lessonHTML(){
  var list,title,key;
  if(V.lib==='a1a2'&&V.topic){
    var g=topics().filter(function(x){return x.id===V.topic})[0];
    if(!g)return '<p class="mute">Không tìm thấy chủ đề này.</p><div class="acts"><button class="btn" onclick="__v17.goHome()">← Thư viện</button></div>';
    list=g.words;title='A1–A2 · '+topicName(V.topic);key='a1a2:'+V.topic;
  }else if(V.lib==='oxford'&&V.lesson){
    var ls=lessons().filter(function(x){return x.n===V.lesson})[0];
    if(!ls)return '<p class="mute">Không tìm thấy bài này.</p><div class="acts"><button class="btn" onclick="__v17.goHome()">← Thư viện</button></div>';
    list=ls.words;title='Oxford 3000 · Bài '+V.lesson;key='oxford:'+V.lesson;
  }else if(V.lib==='chrono'&&V.set){
    var gs=chronoSets().filter(function(x){return x.id===V.set})[0];
    if(!gs)return '<p class="mute">Không tìm thấy bộ từ này.</p><div class="acts"><button class="btn" onclick="__v17.goHome()">← Thư viện</button></div>';
    list=gs.words;title='Chrono · '+gs.name;key='chrono:'+V.set;
  }else if(V.lib==='chrono'){list=chronoWords();title='Chrono Kingdom — Vương Quốc Thời Gian';key='chrono:all'}
  else if(V.lib==='skyroot'&&V.set){
    var gs=skyrootSets().filter(function(x){return x.id===V.set})[0];
    if(!gs)return '<p class="mute">Không tìm thấy bộ từ này.</p><div class="acts"><button class="btn" onclick="__v17.goHome()">← Thư viện</button></div>';
    list=gs.words;title='Skyroot · '+gs.name;key='skyroot:'+V.set;
  }else if(V.lib==='skyroot'){list=skyrootWords();title='Skyroot Sanctuary — Thánh Địa Thiên Căn';key='skyroot:all'}
  else if(V.lib==='a1a2'){list=a1a2Words();title='A1–A2 Vocabulary';key='a1a2:all'}
  else if(V.lib==='oxford'){list=oxWords();title='Oxford 3000 – Từ vựng thông dụng';key='oxford:all'}
  else return '<p class="mute">Chưa chọn bộ từ nào.</p>';
  var s=statsOf(list);
  var pct=s.total?Math.round(s.learned/s.total*100):0;
  /* tiêu đề hiện tổng số mục từ trong nguồn; danh sách hiện bản ghi riêng
     biệt (từ trùng đầu từ ở hai chủ đề/bài chỉ có một bản ghi) */
  var totalShown=list.length;
  if(V.lib==='a1a2'&&!V.topic)totalShown=a1a2Total();
  if(V.lib==='oxford'&&!V.lesson)totalShown=oxTotal();
  var f=filterWords(list);
  var per=30,pages=Math.max(1,Math.ceil(f.length/per));
  var pg=Math.max(0,Math.min(V.page,pages-1));
  var slice=f.slice(pg*per,(pg+1)*per);
  var h='<div class="v17lesson"><button class="v15back" onclick="__v17.goHome()">← Thư viện</button>'
    +'<div class="v17head"><h3>'+esc(title)+'</h3><p class="mute">'+totalShown+' từ · '+s.learned+' đã học · '+s.mastered+' đã thuộc · '+s.due+' cần ôn</p></div>'
    +'<div class="v17bar big"><i style="width:'+pct+'%"></i></div>'
    +'<div class="acts">'
    +'<button class="btn pri" onclick="__v17.learnCurrent()">Học ngay</button>'
    +'<button class="btn sm" onclick="__v17.reviewCurrent()">Ôn tập</button>'
    +'<button class="btn sm" onclick="__v17.reviewWeakCurrent()">Ôn từ yếu</button>'
    +'<button class="btn sm" onclick="__v17.bossCurrent()">Đánh boss</button>'
    +claimHTML(key,s)
    +'</div>'
    +'<div class="v17filters"><input class="v15input" placeholder="Tìm trong bộ này…" value="'+esc(V.q)+'" oninput="__v17.search(this.value)">'
    +posSelect('pos',V.pos)
    +'<select class="v15sel" onchange="__v17.setStatus(this.value)">'
    +[['all','Tất cả'],['new','Chưa học'],['learning','Đang học'],['mastered','Đã thuộc'],['due','Cần ôn'],['fav','Yêu thích']].map(function(o){return '<option value="'+o[0]+'"'+(V.status===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')
    +'</select></div>'
    +'<div class="v17words">'+slice.map(wordCard).join('')+'</div>'
    +(f.length>per?pagerHTML(pg,pages,'page'):'')
    +'<p class="mute">Hiện '+slice.length+'/'+f.length+' từ'+(f.length!==list.length?' (đã lọc từ '+list.length+' từ)':'')+'.</p></div>';
  return h;
}
function filterWords(list){
  var q=V.q.toLowerCase(),favs=en17().fav;
  var now=Date.now(),e=V15().en15();
  return list.filter(function(w){
    if(V.pos&&!hasPos(w,V.pos))return false;
    if(q&&w.en.toLowerCase().indexOf(q)<0&&w.vi.toLowerCase().indexOf(q)<0)return false;
    var b=boxOf(w.id);
    if(V.status==='new'&&b!==0)return false;
    if(V.status==='learning'&&(b<1||b>=5))return false;
    if(V.status==='mastered'&&b<5)return false;
    if(V.status==='due'&&(e.due[w.id]||0)>now)return false;
    if(V.status==='fav'&&favs.indexOf(w.id)<0)return false;
    return true;
  });
}
function claimHTML(key,s){
  var e=en17();
  if(e.claimed[key])return '<span class="v17claimed">✓ Đã nhận thưởng bộ này</span>';
  if(s.learned<s.total)return '<span class="mute">Học hết '+s.total+' từ (trả lời đúng ít nhất 1 lần) để nhận thưởng.</span>';
  var r=rewardFor(key);
  return '<button class="btn ok" onclick="__v17.claim(\''+key+'\')">🎁 Nhận thưởng +'+r.xp+' XP, +'+r.gems+' 💎</button>';
}
function wordCard(w){
  var b=boxOf(w.id),fav=en17().fav.indexOf(w.id)>=0;
  var where='';
  if(V.lib==='a1a2'&&!V.topic)where=topicName(w.a1a2Topic||w.t);
  if(V.lib==='chrono'&&!V.set)where=chronoSetName(w.chronoSet);
  if(V.lib==='skyroot'&&!V.set)where=skyrootSetName(w.skyrootSet);
  if(V.lib==='oxford'&&!V.lesson)where='Bài '+w.oxLesson;
  var extra=(w.extra||[]).map(function(x){
    var src=x.src==='oxford'?'Oxford 3000':(x.src==='bt'?'Basic Tactics':'A1–A2');
    return '<div class="v17extra">+ '+esc(x.pos||'')+' — '+esc(x.vi)+' <span class="mute">('+src+')</span></div>';
  }).join('');
  var lvLabel=w.lv==='OX'?'Oxford 3000':(w.lv||'');
  return '<div class="v17word">'
    +'<div class="v17word-main"><b>'+esc(w.en)+'</b> <span class="mute">'+esc(w.pos||'')+'</span>'
    +'<div class="v17ipa">'+(w.ipa?esc(w.ipa):'<span class="v17nodata">Chưa có phiên âm</span>')+'</div>'
    +'<div>'+esc(w.vi)+'</div>'+extra
    +(w.ex?'<div class="v17ex">“'+esc(w.ex)+'”<br><span class="mute">'+esc(w.exvi||'')+'</span></div>':'')
    +'<div class="mute">'+(where?esc(where)+' · ':'')+esc(lvLabel)+' · hộp '+b+'/5</div></div>'
    +'<div class="v17word-acts">'
    +'<button class="btn sm" onclick="__v17.speak(\''+w.id+'\')">🔊 Nghe</button>'
    +'<button class="btn sm '+(b>=5?'ok':'')+'" onclick="__v17.toggleMastered(\''+w.id+'\')">'+(b>=5?'✓ Đã thuộc':'Đánh dấu đã thuộc')+'</button>'
    +'<button class="btn sm '+(fav?'on':'')+'" onclick="__v17.toggleFav(\''+w.id+'\')">'+(fav?'★ Yêu thích':'☆ Yêu thích')+'</button>'
    +'<button class="btn sm" onclick="__v17.copyToPersonal(\''+w.id+'\')">Sao chép để sửa</button>'
    +'</div></div>';
}

/* ---------- điều khiển nhỏ ---------- */
function posSelect(id,cur){
  var opts=['','n','v','adj','adv','prep','pron','det','conj','interj'];
  var labels={'':'Mọi loại từ','n':'Danh từ','v':'Động từ','adj':'Tính từ','adv':'Trạng từ','prep':'Giới từ','pron':'Đại từ','det':'Hạn định từ','conj':'Liên từ','interj':'Thán từ'};
  return '<select class="v15sel" onchange="__v17.setPosSel(\''+id+'\',this.value)">'
    +opts.map(function(o){return '<option value="'+o+'"'+(cur===o?' selected':'')+'>'+labels[o]+'</option>'}).join('')+'</select>';
}
function pagerHTML(pg,pages,key){
  if(pages<=1)return '';
  var h='<div class="v17pager">';
  if(pg>0)h+='<button class="btn sm" onclick="__v17.setPageKey(\''+key+'\','+(pg-1)+')">← Trước</button>';
  h+='<span class="mute">Trang '+(pg+1)+'/'+pages+'</span>';
  if(pg<pages-1)h+='<button class="btn sm" onclick="__v17.setPageKey(\''+key+'\','+(pg+1)+')">Sau →</button>';
  return h+'</div>';
}
function refocus(sel){
  setTimeout(function(){
    var inp=document.querySelector('#v15body '+sel);
    if(inp){inp.focus();try{inp.setSelectionRange(inp.value.length,inp.value.length)}catch(e){}}
  },0);
}
function renderTab(){var v=V15();if(v)v.renderTab()}

/* ---------- hành động ---------- */
function goHome(){V.view='home';V.lib=null;V.topic=null;V.lesson=0;V.set=null;V.q='';V.page=0;renderTab()}
function openTopic(id){V.view='lesson';V.lib='a1a2';V.topic=id;V.lesson=0;V.set=null;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}
function openLesson(n){V.view='lesson';V.lib='oxford';V.lesson=n;V.topic=null;V.set=null;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}
function openSet(id){V.view='lesson';V.lib='chrono';V.set=id;V.topic=null;V.lesson=0;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}
function learnSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'chrono',set:id});v.tab('learn')}
function reviewSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'chrono',set:id});reviewGo(false)}
function openSkyrootSet(id){V.view='lesson';V.lib='skyroot';V.set=id;V.topic=null;V.lesson=0;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}
function learnSkyrootSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'skyroot',set:id});v.tab('learn')}
function reviewSkyrootSet(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'skyroot',set:id});reviewGo(false)}
function openLib(lib){V.view='lesson';V.lib=lib;V.topic=null;V.lesson=0;V.set=null;V.q='';V.pos='';V.status='all';V.page=0;renderTab()}
function learnScopeKey(lib){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:lib});v.tab('learn')}
function learnTopic(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'a1a2',topic:id});v.tab('learn')}
function learnLesson(n){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'oxford',lesson:n});v.tab('learn')}
function learnCurrent(){var sc=currentScope();var v=V15();if(!v||!sc)return;v.setScope(sc);v.tab('learn')}
function reviewGo(weak){
  var v=V15();if(!v)return;
  v.tab('review');
  /* reviewStart vẽ vào #v15review — đợi tab vẽ xong rồi mới bắt đầu */
  setTimeout(function(){v.reviewStart(!!weak)},0);
}
function reviewScopeKey(lib){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:lib});reviewGo(false)}
function reviewTopic(id){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'a1a2',topic:id});reviewGo(false)}
function reviewLesson(n){var v=V15();if(!v)return;v.setScope({kind:'lib',lib:'oxford',lesson:n});reviewGo(false)}
function reviewCurrent(){var sc=currentScope();var v=V15();if(!v||!sc)return;v.setScope(sc);reviewGo(false)}
function reviewWeakCurrent(){var sc=currentScope();var v=V15();if(!v||!sc)return;v.setScope(sc);reviewGo(true)}
function bossCurrent(){var sc=currentScope();var v=V15();if(!v||!sc)return;v.setScope(sc);v.tab('bosses')}
/* V37 (V18.2): the scope banner lives in the hub shell (renderHub),
   not in #v15body (renderTab) — re-render the whole hub so the
   banner disappears when the scope is cleared. */
function clearScope(){var v=V15();if(!v)return;v.clearScope();if(v.renderHub)v.renderHub();else renderTab()}
function search(q){V.q=q;V.page=0;renderTab();refocus('.v17filters .v15input')}
function oxSearch(q){V.oxQ=q;V.oxPage=0;renderTab();refocus('.v17ox-tools .v15input')}
function setPosSel(id,val){
  if(id==='oxPos'){V.oxPos=val;V.oxPage=0}else{V.pos=val;V.page=0}
  renderTab();
}
function setStatus(val){V.status=val;V.page=0;renderTab()}
function setPageKey(key,val){if(key==='oxPage')V.oxPage=val;else V.page=val;renderTab()}
function speak(id){var v=V15();if(v)v.speakWord(id)}
function toggleMastered(id){
  var v=V15();if(!v)return;
  var o=v.enOld();o.box=o.box||{};
  var e=v.en15();e.due=e.due||{};
  var cur=o.box[id]||0;
  if(cur>=5){o.box[id]=0;e.due[id]=0}
  else{o.box[id]=5;e.due[id]=Date.now()+30*864e5}
  v.save15();renderTab();
}
function toggleFav(id){
  var e=en17(),i=e.fav.indexOf(id);
  if(i>=0)e.fav.splice(i,1);else e.fav.push(id);
  var v=V15();if(v)v.save15();
  renderTab();
}
function copyToPersonal(id){
  var v=V15();if(!v)return;
  var w=null;WORDS().forEach(function(x){if(x.id===id)w=x});
  if(!w)return;
  var o=v.enOld();o.custom=o.custom||[];
  var key=(w.en||'').toLowerCase();
  if(o.custom.some(function(c){return (c.en||'').toLowerCase()===key})){v.pop15('Từ này đã có trong Từ vựng của tôi.');return}
  o.custom.push({t:w.t||'daily',en:w.en,vi:w.vi,ipa:w.ipa||'',pos:w.pos||'n',
    lv:(w.lv==='OX'?'B1':(w.lv||'A1')),ex:w.ex||'',exvi:w.exvi||'',
    uid:'u'+Date.now().toString(36)});
  v.save15();v.buildWords();v.pop15('Đã sao chép "'+w.en+'" vào Từ vựng của tôi — sửa ở tab Từ vựng.');
  renderTab();
}
function claim(key){
  var e=en17();if(e.claimed[key])return;
  var r=rewardFor(key);
  e.claimed[key]=true;
  var v=V15();
  if(v&&v.gain15)v.gain15(r.xp);
  try{S.v7.gems=(S.v7.gems||0)+r.gems}catch(err){}
  if(v){v.save15();v.pop15('Hoàn thành bộ từ! +'+r.xp+' XP, +'+r.gems+' 💎');}
  renderTab();
}

window.__v17={
  libraryHTML:libraryHTML,scopeBannerHTML:scopeBannerHTML,
  goHome:goHome,openTopic:openTopic,openLesson:openLesson,openLib:openLib,
  learnScopeKey:learnScopeKey,learnTopic:learnTopic,learnLesson:learnLesson,learnCurrent:learnCurrent,learnSet:learnSet,openSet:openSet,reviewSet:reviewSet,chronoWords:chronoWords,chronoSets:chronoSets,learnSkyrootSet:learnSkyrootSet,openSkyrootSet:openSkyrootSet,reviewSkyrootSet:reviewSkyrootSet,skyrootWords:skyrootWords,skyrootSets:skyrootSets,
  reviewScopeKey:reviewScopeKey,reviewTopic:reviewTopic,reviewLesson:reviewLesson,topics:topics,lessons:lessons,topicName:topicName,scopeName:scopeName,
  reviewCurrent:reviewCurrent,reviewWeakCurrent:reviewWeakCurrent,bossCurrent:bossCurrent,
  clearScope:clearScope,search:search,oxSearch:oxSearch,setPosSel:setPosSel,setStatus:setStatus,setPageKey:setPageKey,
  speak:speak,toggleMastered:toggleMastered,toggleFav:toggleFav,copyToPersonal:copyToPersonal,claim:claim,
  get state(){return V},
  version:'10.0.0'
};
})();
