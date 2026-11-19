/* ===== V15 — ENGLISH FARM V7 (additive layer) =====
   Built ON TOP of V6 Bilingual. It never edits Korean cards, decks,
   XP accounting, boss or farm code. It only:
   - pushes new EN words/topics into __v14.ENWORDS / __v14.TOPICS
     (the same arrays V14 already renders), and
   - keeps its own progress in S.v7.en15 (new key) + reuses
     S.v7.en (V14 SRS boxes) for word mastery.
   Shared currency: XP / Level / gems (S.xp, S.v7.gems) — the same
   wallet V6 uses. EN farm shop spends XP through S.spent, exactly
   like the V6 shop's buy(). */
(function(){
'use strict';
/* ---------- tiny helpers ---------- */
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function norm(s){return (s||'').toLowerCase().replace(/[^a-z0-9\s']/g,'').replace(/\s+/g,' ').trim()}
function dayNo(){return Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5)}
function todayStr(){return new Date().toDateString()}
function gain15(n){try{if(typeof gain==='function')gain(n)}catch(e){}}
function sfx15(k){try{if(typeof sfx==='function')sfx(k)}catch(e){}}
function pop15(t,long){try{if(typeof pop==='function')pop(t,long);else if(typeof toast==='function')toast(t)}catch(e){}}
function save15(){try{if(typeof save==='function')save()}catch(e){}}
function coins15(){try{if(typeof coins==='function')return coins()}catch(e){}return (S.xp||0)-(S.spent||0)}
function speak15(text,lang){try{speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);u.lang=lang||'en-US';u.rate=.85;speechSynthesis.speak(u)}catch(e){}}
function icon15(name){return '<img src="assets/icons/v6/'+name+'" class="v15ic" alt="">'}
function dl(name,text,type){var b=new Blob([text],{type:type||'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}

/* ---------- EN state (new key; V14 state untouched) ---------- */
function en15(){
  try{S.v7=S.v7||{}}catch(e){return {}}
  var e=S.v7.en15;
  if(!e){
    e=S.v7.en15={lang:'ko',langChoice:false,level:'A1',topic:'',scope:null,
      due:{},intv:{},hist:{},daily:{d:'',correct:0,wrong:0,xp:0},
      farm:{plots:[],coins:0,harvests:0,pets:[],decor:[]},
      bosses:{},modeBest:{},speakDone:{},weakOnly:false,created:Date.now()};
    for(var i=0;i<6;i++)e.farm.plots.push({wordId:'',water:0,planted:0});
  }
  e.farm=e.farm||{plots:[],coins:0,harvests:0,pets:[],decor:[]};
  if(!e.farm.plots||!e.farm.plots.length){e.farm.plots=[];for(var j=0;j<6;j++)e.farm.plots.push({wordId:'',water:0,planted:0})}
  e.bosses=e.bosses||{};e.hist=e.hist||{};e.due=e.due||{};e.intv=e.intv||{};
  e.daily=e.daily||{d:'',correct:0,wrong:0,xp:0};
  if(e.daily.d!==todayStr())e.daily={d:todayStr(),correct:0,wrong:0,xp:0};
  return e;
}
function enOld(){ /* V14 state: box/right/wrong/review/done/custom */
  try{if(window.__v14&&__v14.state)return __v14.state}catch(e){}
  try{S.v7=S.v7||{};S.v7.en=S.v7.en||{box:{},right:{},wrong:{},review:[],done:{},custom:[],dir:'ev',ex:'choice',topic:'',streak:0,lastDay:'',xpAt:{},stats:{ev:{r:0,w:0},ve:{r:0,w:0}}};return S.v7.en}catch(e){return {box:{},right:{},wrong:{},review:[],done:{},custom:[]}}
}

/* ---------- unified word list ---------- */
var WORDS=[],BYID={},LV={};
function buildWords(){
  WORDS=[];BYID={};LV={};
  var i,w;
  try{
    if(window.__v14&&__v14.ENWORDS){
      for(i=0;i<__v14.ENWORDS.length;i++){
        var r=__v14.ENWORDS[i];
        w={id:'w'+i,t:r[0],en:r[1],vi:r[2],ipa:r[3],pos:r[4],ex:r[5],exvi:r[6],lv:'A1',custom:false};
        WORDS.push(w);BYID[w.id]=w;LV[w.en.toLowerCase()]='A1';
      }
    }
  }catch(e){}
  var data=(window.__V15_DATA&&__V15_DATA.words)||[];
  var nIdx=0; /* keep V15 ids aligned with V14's allWords() ids: new words
     are pushed into __v14.ENWORDS at indices 96.., so V15 must use the
     same 'w'+index id or one word would get two SRS records. */
  for(i=0;i<data.length;i++){
    var d=data[i],key=(d.en||'').toLowerCase();
    if(!key||LV[key])continue; /* dedupe vs V14 + within batch */
    w={id:'w'+(96+nIdx),t:d.topic||'daily',en:d.en,vi:d.vi,ipa:d.ipa||'',pos:d.pos||'n',ex:d.ex||'',exvi:d.exvi||'',lv:d.level||'A1',custom:false};
    nIdx++;
    WORDS.push(w);BYID[w.id]=w;LV[key]=w.lv;
  }
  /* custom words (V14) */
  var e=enOld();
  (e.custom||[]).forEach(function(c,ci){
    w={id:c.uid||('c'+ci),t:c.t||'daily',en:c.en,vi:c.vi,ipa:c.ipa||'',pos:c.pos||'n',ex:c.ex||'',exvi:c.exvi||'',lv:c.lv||'A1',custom:true};
    if(!BYID[w.id]){WORDS.push(w);BYID[w.id]=w}
  });
  /* V17a: khôi phục cấp độ thật của từ V15. Vòng lặp V14 ở trên gán 'A1'
     cho mọi từ (kể cả từ V15 đã đẩy vào ENWORDS), nên bộ lọc cấp độ
     A2/B1/B2 của tab Học không hoạt động ở V7/V8. __V15_DATA.words có
     level đúng (A1 300, A2 300, B1 250, B2 150). Không đổi id nên SRS
     không bị ảnh hưởng; khối override V16 bên dưới vẫn thắng. */
  try{
    var lv15={};
    ((window.__V15_DATA&&__V15_DATA.words)||[]).forEach(function(d){
      var k=(d.en||'').toLowerCase();if(k&&d.level)lv15[k]=d.level;
    });
    WORDS.forEach(function(ww){var L=lv15[ww.en.toLowerCase()];if(L)ww.lv=L});
  }catch(e){}
  /* V17b: thư viện có sẵn (A1-A2 + Oxford 3000) — gắn thông tin bộ từ
     vào bản ghi chuẩn. Từ đã có (V14/V15) chỉ được gắn thêm thư viện và
     nghĩa phụ, KHÔNG tạo bản ghi mới, nên một từ chỉ có một hồ sơ SRS.
     Từ chỉ có trong thư viện (đẩy vào ENWORDS ở chỉ số >=1096) nhận
     cấp độ 'A1-A2' hoặc 'OX'. */
  try{
    var K2W={};WORDS.forEach(function(ww){if(!ww.custom)K2W[ww.en.toLowerCase()]=ww});
    var a1lib=window.__V17_A1A2||[],oxlib=window.__V17_OXFORD||[];
    var attachLib=function(a,lib){
      var key=(a.en||'').toLowerCase();if(!key)return;
      var ww=K2W[key];if(!ww)return;
      ww.lib=ww.lib||[];
      if(ww.lib.indexOf(lib)<0)ww.lib.push(lib);
      /* Từ chỉ có trong thư viện (không phải V14/V15) nhận cấp độ riêng.
         V14 giữ 'A1', V15 giữ level thật từ khối V17a ở trên. */
      var idx=parseInt((ww.id||'').slice(1),10);
      var v17only=!isNaN(idx)&&idx>=96&&!(typeof lv15!=='undefined'&&lv15&&lv15[key]);
      if(lib==='a1a2'){
        /* Một từ có thể thuộc nhiều chủ đề (vd 'orange': quả cam ở
           FRUIT AND VEGETABLES, màu cam ở COLORS AND SHAPES) — lưu mảng
           để từ xuất hiện trong mọi chủ đề của nó, vẫn một bản ghi SRS. */
        ww.a1a2Topics=ww.a1a2Topics||[];
        if(ww.a1a2Topics.indexOf(a.t)<0)ww.a1a2Topics.push(a.t);
        ww.a1a2Topic=ww.a1a2Topics[0];
        if(!ww.a1a2TopicName)ww.a1a2TopicName=a.topic;
        ww.a1a2NoMap=ww.a1a2NoMap||{};ww.a1a2NoMap[a.t]=a.no;
        ww.a1a2No=ww.a1a2NoMap[ww.a1a2Topic];
        if(v17only)ww.lv='A1-A2';
      }else{
        /* Tương tự: một từ có thể ở hai bài Oxford (vd 'may', 'side') */
        ww.oxLessons=ww.oxLessons||[];
        if(ww.oxLessons.indexOf(a.lesson)<0)ww.oxLessons.push(a.lesson);
        ww.oxLesson=ww.oxLessons[0];
        ww.oxOrdMap=ww.oxOrdMap||{};ww.oxOrdMap[a.lesson]=a.ord;
        ww.oxOrd=ww.oxOrdMap[ww.oxLesson];
        if(v17only)ww.lv='OX';
      }
      if(!ww.ipa&&a.ipa)ww.ipa=a.ipa;
      /* nghĩa phụ khác POS/nghĩa — hiển thị thêm trong thẻ từ */
      if((a.pos&&ww.pos&&a.pos!==ww.pos)||(a.vi&&ww.vi&&a.vi!==ww.vi)){
        ww.extra=ww.extra||[];var dup=false;
        for(var k=0;k<ww.extra.length;k++)if(ww.extra[k].vi===a.vi&&ww.extra[k].pos===a.pos){dup=true;break}
        if(!dup)ww.extra.push({pos:a.pos,vi:a.vi,src:lib});
      }
    };
    for(i=0;i<a1lib.length;i++)attachLib(a1lib[i],'a1a2');
    for(i=0;i<oxlib.length;i++)attachLib(oxlib[i],'oxford');
  }catch(e){}
  /* V22: Basic Tactics for Listening — gắn dữ liệu BT (tải lười qua
     window.__V22_BT) vào bản ghi chuẩn. Từ đã có (V14/V15/A1-A2/Oxford)
     chỉ được gắn thêm thư viện BT và nghĩa phụ nếu khác, KHÔNG tạo bản
     ghi mới, nên một từ chỉ có một hồ sơ SRS. Từ chỉ có trong BT nhận
     id ổn định 'bt<unit>_<seq>' và cấp độ 'BT' (không gán A1 giả). */
  try{
    var bt=(window.__V22_BT&&__V22_BT.units)||[];
    var K2W2={};WORDS.forEach(function(ww){if(!ww.custom)K2W2[ww.en.toLowerCase()]=ww});
    bt.forEach(function(u){
      (u.words||[]).concat(u.phrases||[]).forEach(function(a){
        var key=(a.en||'').toLowerCase();if(!key)return;
        var ww=K2W2[key];
        if(ww){
          ww.lib=ww.lib||[];
          if(ww.lib.indexOf('bt')<0)ww.lib.push('bt');
          ww.btUnits=ww.btUnits||[];
          if(ww.btUnits.indexOf(u.unit)<0)ww.btUnits.push(u.unit);
          ww.btMap=ww.btMap||{};ww.btMap[u.unit]={id:a.id,type:a.type};
          if(!ww.btUnit)ww.btUnit=u.unit;
          if(a.vi&&ww.vi&&a.vi!==ww.vi){
            ww.extra=ww.extra||[];var dup2=false;
            for(var k=0;k<ww.extra.length;k++)if(ww.extra[k].vi===a.vi&&ww.extra[k].src==='bt'){dup2=true;break}
            if(!dup2)ww.extra.push({pos:'',vi:a.vi,src:'bt'});
          }
        }else{
          var nw={id:a.id,t:'bt',en:a.en,vi:a.vi,ipa:'',pos:'',ex:'',exvi:'',lv:'BT',custom:false,
            lib:['bt'],btUnits:[u.unit],btMap:{},btUnit:u.unit};
          nw.btMap[u.unit]={id:a.id,type:a.type};
          WORDS.push(nw);BYID[nw.id]=nw;K2W2[key]=nw;LV[key]='BT';
        }
      });
    });
  }catch(e){}
  /* V33: CHRONO KINGDOM — gắn 240 từ Chrono (data qua
     window.__V33_WORDS, ids 'v33_<slug>') vào WORDS chung, theo mẫu
     V22 (Basic Tactics). Từ đã có chỉ được gắn thêm thư viện
     'chrono'; từ chỉ có trong Chrono nhận id ổn định 'v33_<slug>'
     và cấp độ 'B2' (boss Chrono là diff B2 nên wordPool gồm chúng).
     KHÔNG tạo S.cards — trường ko chỉ là dữ liệu hiển thị/học. */
  try{
    var ch33=(window.__V33_WORDS||[]);
    var K2W3={};WORDS.forEach(function(ww){if(!ww.custom)K2W3[ww.en.toLowerCase()]=ww});
    ch33.forEach(function(a){
      var key=(a.en||'').toLowerCase();if(!key)return;
      var ww=K2W3[key];
      if(ww){
        ww.lib=ww.lib||[];
        if(ww.lib.indexOf('chrono')<0)ww.lib.push('chrono');
        ww.chronoSet=ww.chronoSet||a.set;
        if(!ww.ko&&a.ko)ww.ko=a.ko;
      }else{
        var nw={id:a.id,t:'chrono',en:a.en,vi:a.vi,ipa:a.ipa||'',pos:(function(p){var m={noun:'n',verb:'v',adjective:'adj',adverb:'adv'};return (p||'').split(',').map(function(x){var k=x.trim();return m[k]||k}).join(', ')})(a.pos),ex:a.ex||'',exvi:a.exvi||'',lv:'B2',custom:false,
          lib:['chrono'],chronoSet:a.set,ko:a.ko||''};
        WORDS.push(nw);BYID[nw.id]=nw;K2W3[key]=nw;LV[key]='B2';
      }
    });
  }catch(e){}
  /* V35: SKYROOT SANCTUARY — gắn 240 từ Skyroot (data qua
     window.__V35_WORDS, ids 'v35_<slug>') vào WORDS chung, theo mẫu
     V33 (Chrono). Từ đã có chỉ được gắn thêm thư viện
     'skyroot'; từ chỉ có trong Skyroot nhận id ổn định 'v35_<slug>'
     và cấp độ 'B2' (boss Skyroot là diff B2 nên wordPool gồm chúng).
     POS chuẩn hóa dài->ngắn tại đây (bài học V34-BUG-1).
     KHÔNG tạo S.cards — trường ko chỉ là dữ liệu hiển thị/học. */
  try{
    var sk35=(window.__V35_WORDS||[]);
    var K2W5={};WORDS.forEach(function(ww){if(!ww.custom)K2W5[ww.en.toLowerCase()]=ww});
    sk35.forEach(function(a){
      var key=(a.en||'').toLowerCase();if(!key)return;
      var ww=K2W5[key];
      if(ww){
        ww.lib=ww.lib||[];
        if(ww.lib.indexOf('skyroot')<0)ww.lib.push('skyroot');
        ww.skyrootSet=ww.skyrootSet||a.set;
        if(!ww.ko&&a.ko)ww.ko=a.ko;
      }else{
        var nw={id:a.id,t:'skyroot',en:a.en,vi:a.vi,ipa:a.ipa||'',pos:(function(p){var m={noun:'n',verb:'v',adjective:'adj',adverb:'adv'};return (p||'').split(',').map(function(x){var k=x.trim();return m[k]||k}).join(', ')})(a.pos),ex:a.ex||'',exvi:a.exvi||'',lv:'B2',custom:false,
          lib:['skyroot'],skyrootSet:a.set,ko:a.ko||''};
        WORDS.push(nw);BYID[nw.id]=nw;K2W5[key]=nw;LV[key]='B2';
      }
    });
  }catch(e){}
  /* V16: cập nhật từ có sẵn (override) — giữ nguyên id nên tiến trình
     SRS (box/right/wrong keyed theo id) không bị mất. */
  try{
    var ov16=(S.v7&&S.v7.en16&&S.v7.en16.overrides)||null;
    if(ov16)WORDS.forEach(function(ww){
      var o=ov16[ww.id];
      if(o&&!ww.custom){
        if(o.vi!=null)ww.vi=o.vi;
        if(o.ipa!=null)ww.ipa=o.ipa;
        if(o.pos)ww.pos=o.pos;
        if(o.lv)ww.lv=o.lv;
        if(o.t)ww.t=o.t;
        if(o.ex!=null)ww.ex=o.ex;
        if(o.exvi!=null)ww.exvi=o.exvi;
      }
    });
  }catch(e){}
  return WORDS;
}
function topicName(t){
  try{if(window.__v14&&__v14.TOPICS){for(var i=0;i<__v14.TOPICS.length;i++)if(__v14.TOPICS[i].id===t)return __v14.TOPICS[i].name+' – '+__v14.TOPICS[i].vi}}catch(e){}
  return t;
}
function pushDataIntoV14(){
  /* Make V14 modes/topics see the new words (same arrays it renders). */
  try{
    if(!window.__v14||!__v14.ENWORDS||!window.__V15_DATA)return;
    var data=__V15_DATA.words||[],have={};
    __v14.ENWORDS.forEach(function(r){have[(r[1]||'').toLowerCase()]=1});
    var added=0;
    data.forEach(function(d){
      var k=(d.en||'').toLowerCase();
      if(!k||have[k])return;have[k]=1;
      __v14.ENWORDS.push([d.topic||'daily',d.en,d.vi,d.ipa||'',d.pos||'n',d.ex||'',d.exvi||'']);
      added++;
    });
    var thave={};__v14.TOPICS.forEach(function(t){thave[t.id]=1});
    (__V15_DATA.topics||[]).forEach(function(t){if(!thave[t.id]){__v14.TOPICS.push(t);thave[t.id]=1}});
    pushV17IntoV14();
    buildWords();
    return added;
  }catch(e){buildWords();return 0}
}
/* V17: đẩy dữ liệu thư viện có sẵn (A1-A2 + Oxford 3000) vào ENWORDS,
   cùng cơ chế với V15: từ trùng (V14/V15/A1-A2) chỉ giữ một bản ghi,
   thứ tự gốc của Oxford được giữ (ord/lesson gắn ở buildWords). */
function pushV17IntoV14(){
  try{
    if(!window.__v14||!__v14.ENWORDS)return 0;
    var have={};
    __v14.ENWORDS.forEach(function(r){have[(r[1]||'').toLowerCase()]=1});
    var added=0;
    var pushOne=function(a){
      var k=(a.en||'').toLowerCase();
      if(!k||have[k])return;have[k]=1;
      __v14.ENWORDS.push([a.t||'oxford',a.en,a.vi,a.ipa||'',a.pos||'',a.ex||'',a.exvi||'']);
      added++;
    };
    (window.__V17_A1A2||[]).forEach(pushOne);
    (window.__V17_OXFORD||[]).forEach(pushOne);
    /* chủ đề A1-A2 (19) + Oxford — để topicName() và bộ lọc chủ đề thấy */
    var thave={};__v14.TOPICS.forEach(function(t){thave[t.id]=1});
    var topics={};
    (window.__V17_A1A2||[]).forEach(function(a){
      if(a.t&&!topics[a.t]){
        var nm=(a.topic||a.t).toLowerCase().replace(/(^|\s)\S/g,function(m){return m.toUpperCase()})
          .replace(/\s(And|Of|The)\s/g,function(m){return m.toLowerCase()});
        topics[a.t]={id:a.t,name:nm,vi:a.tv||a.topic||a.t};
      }
    });
    Object.keys(topics).forEach(function(id){if(!thave[id]){__v14.TOPICS.push(topics[id]);thave[id]=1}});
    if(!thave['oxford']){__v14.TOPICS.push({id:'oxford',name:'Oxford 3000',vi:'Từ vựng thông dụng'});thave['oxford']=1}
    return added;
  }catch(e){return 0}
}
/* V22: Basic Tactics — gắn dữ liệu BT (đã tải lười qua __V22_BT) vào
   WORDS. Gọi từ __v22 sau khi tải xong basic_tactics_vocabulary.json.
   Từ đã có chỉ được gắn thêm thư viện BT; từ chỉ có trong BT nhận id
   ổn định 'bt<unit>_<seq>' và lv 'BT'. Trả về số bản ghi WORDS có BT. */
function attachBT(){
  try{
    if(!window.__V22_BT||!window.__V22_BT.units)return 0;
    if(window.__v14&&__v14.TOPICS&&!__v14.TOPICS.some(function(t){return t.id==='bt'}))
      __v14.TOPICS.push({id:'bt',name:'Basic Tactics',vi:'Basic Tactics for Listening'});
    buildWords();
    var n=0;WORDS.forEach(function(w){if(w.lib&&w.lib.indexOf('bt')>=0)n++});
    return n;
  }catch(e){return 0}
}
function inScope15(w){
  /* true khi từ thuộc phạm vi đang chọn trong Thư viện (hoặc không chọn) */
  var sc=en15().scope;if(!sc||sc.kind!=='lib')return true;
  if(!w.lib||w.lib.indexOf(sc.lib)<0)return false;
  if(sc.topic){
    var tt=w.a1a2Topics||[];
    if(tt.indexOf(sc.topic)<0&&w.a1a2Topic!==sc.topic&&w.t!==sc.topic)return false;
  }
  if(sc.lesson){
    var ll=w.oxLessons||[];
    if(ll.indexOf(sc.lesson)<0&&w.oxLesson!==sc.lesson)return false;
  }
  if(sc.lib==='chrono'&&sc.set){
    if(w.chronoSet!==sc.set)return false;
  }
  if(sc.lib==='skyroot'&&sc.set){
    if(w.skyrootSet!==sc.set)return false;
  }
  if(sc.lib==='bt'){
    if(sc.unit){
      var us=Array.isArray(sc.unit)?sc.unit:[sc.unit];
      var btus=w.btUnits||[];
      if(!us.some(function(u){return btus.indexOf(u)>=0}))return false;
      if(sc.type){
        var okT=false;
        us.forEach(function(u){var m=(w.btMap||{})[u];if(m&&m.type===sc.type)okT=true});
        if(!okT)return false;
      }
    }else if(sc.type){
      var anyT=false;
      (w.btUnits||[]).forEach(function(u){var m=(w.btMap||{})[u];if(m&&m.type===sc.type)anyT=true});
      if(!anyT)return false;
    }
    if(sc.status){
      var old2=enOld(),e2=en15();
      if(sc.status==='unlearned'&&(old2.box[w.id]||0)>0)return false;
      if(sc.status==='due'&&(e2.due[w.id]||0)>Date.now())return false;
    }
  }
  return true;
}
function setScope15(sc){en15().scope=sc||null;save15()}
function clearScope15(){en15().scope=null;save15()}
function wordsFiltered(o){
  o=o||{};var e=en15(),old=enOld();
  var sc=o.scope||e.scope||null;
  var list=WORDS.filter(function(w){
    if(sc&&sc.kind==='lib'){
      /* phạm vi Thư viện thắng bộ lọc cấp độ/chủ đề của tab Học */
      if(!w.lib||w.lib.indexOf(sc.lib)<0)return false;
      if(sc.topic){
        var tt=w.a1a2Topics||[];
        if(tt.indexOf(sc.topic)<0&&w.a1a2Topic!==sc.topic&&w.t!==sc.topic)return false;
      }
      if(sc.lesson){
        var ll=w.oxLessons||[];
        if(ll.indexOf(sc.lesson)<0&&w.oxLesson!==sc.lesson)return false;
      }
      if(sc.lib==='chrono'&&sc.set){
        if(w.chronoSet!==sc.set)return false;
      }
      if(sc.lib==='skyroot'&&sc.set){
        if(w.skyrootSet!==sc.set)return false;
      }
      if(sc.lib==='bt'){
        /* Basic Tactics: lọc theo Unit(s), loại mục từ và trạng thái.
           Phạm vi Thư viện thắng bộ lọc cấp độ/chủ đề của tab Học. */
        if(sc.unit){
          var us2=Array.isArray(sc.unit)?sc.unit:[sc.unit];
          var btus2=w.btUnits||[];
          if(!us2.some(function(u){return btus2.indexOf(u)>=0}))return false;
          if(sc.type){
            var okT2=false;
            us2.forEach(function(u){var m=(w.btMap||{})[u];if(m&&m.type===sc.type)okT2=true});
            if(!okT2)return false;
          }
        }else if(sc.type){
          var anyT2=false;
          (w.btUnits||[]).forEach(function(u){var m=(w.btMap||{})[u];if(m&&m.type===sc.type)anyT2=true});
          if(!anyT2)return false;
        }
        if(sc.status==='unlearned'&&(old.box[w.id]||0)>0)return false;
        if(sc.status==='due'&&(e.due[w.id]||0)>Date.now())return false;
      }
    }else{
      if(o.level&&o.level!=='ALL'&&w.lv!==o.level)return false;
      if(o.topic&&w.t!==o.topic)return false;
    }
    if(o.onlyDue){var due=e.due[w.id]||0;if(due>Date.now())return false}
    if(o.onlyWeak){if(!((old.wrong[w.id]||0)>(old.right[w.id]||0)))return false}
    if(o.onlyNew){if((old.box[w.id]||0)>0)return false}
    return true;
  });
  return list;
}
function boxOf(w){return (enOld().box[w.id]||0)}
function isMastered(w){return boxOf(w)>=5}
function isLearning(w){var b=boxOf(w);return b>=1&&b<5}

/* ---------- scoring: mirrors V14 markEN, then adds SRS + farm water ---------- */
function mark15(ok,w,mode){
  if(!w)return 0;
  var old=enOld(),e=en15(),id=w.id,before=old.box[id]||0;
  old.box=old.box||{};old.right=old.right||{};old.wrong=old.wrong||{};
  old.review=old.review||[];old.xpAt=old.xpAt||{};
  if(ok){
    old.right[id]=(old.right[id]||0)+1;
    old.streak=(old.streak||0)+1;
    old.box[id]=Math.min(5,before+1);
    var ri=old.review.indexOf(id);if(ri>=0)old.review.splice(ri,1);
    /* SRS: interval grows 1 -> 3 -> 7 -> 14 -> 30 days; wrong resets to 10 min */
    var iv=[1,3,7,14,30][Math.min(4,old.box[id]-1)]||1;
    e.intv[id]=iv;e.due[id]=Date.now()+iv*864e5;
  }else{
    old.wrong[id]=(old.wrong[id]||0)+1;
    old.streak=0;old.box[id]=0;
    if(old.review.indexOf(id)<0)old.review.push(id);
    e.intv[id]=0;e.due[id]=Date.now()+10*60*1000;
  }
  var xp=0;
  if(ok&&old.box[id]>before){
    var last=old.xpAt[id]||0;
    if(Date.now()-last>600000){xp=10;old.xpAt[id]=Date.now()}
  }
  if(ok&&old.streak>0&&old.streak%5===0)xp+=5;
  if(xp>0)gain15(xp);
  /* daily history (for the 7-day chart) */
  var dn=dayNo();e.hist[dn]=e.hist[dn]||{c:0,t:0,xp:0};
  e.hist[dn].t++;if(ok)e.hist[dn].c++;e.hist[dn].xp+=xp;
  if(ok){e.daily.correct++;e.daily.xp+=xp}else e.daily.wrong++;
  if(mode){e.modeBest[mode]=e.modeBest[mode]||{played:0,correct:0,best:0};e.modeBest[mode].played++;if(ok)e.modeBest[mode].correct++}
  if(ok)waterFarm(); /* a correct answer waters a growing crop */
  /* V23: a correct answer feeds the pet team (+2 XP, +1 affection each)
     and speeds up the active hatch by 30s. Guarded — no team/hatch = no-op. */
  if(ok){try{if(window.__v23)__v23.onLearnCorrect()}catch(e){}}
  sfx15(ok?'ok':'bad');
  try{if(window.__v27)__v27.recordAnswer('en',id,ok,mode)}catch(e){}
  save15();
  return xp;
}
function dueTodayCount(){
  var e=en15(),n=0,now=Date.now();
  WORDS.forEach(function(w){if((e.due[w.id]||0)<=now)n++});
  return n;
}
function counts15(){
  var c={total:WORDS.length,'new':0,learning:0,mastered:0,due:0,weak:0};
  var old=enOld(),e=en15(),now=Date.now();
  WORDS.forEach(function(w){
    var b=old.box[w.id]||0;
    if(b===0)c['new']++;else if(b>=5)c.mastered++;else c.learning++;
    if((e.due[w.id]||0)<=now)c.due++;
    if((old.wrong[w.id]||0)>(old.right[w.id]||0))c.weak++;
  });
  return c;
}

/* ---------- language switcher + first-run chooser ---------- */
function setLang(lang,openHub){
  var e=en15();
  e.lang=lang;e.langChoice=true;save15();
  document.documentElement.setAttribute('data-v15-lang',lang);
  document.body.classList.toggle('v15-en',lang==='en');
  document.body.classList.toggle('v15-ko',lang!=='en');
  try{
    if(lang==='en'){S.opt.mode='en';if(typeof stage==='function')stage()}
    else{if(S.opt.mode==='en')S.opt.mode='card';if(typeof stage==='function')stage()}
  }catch(err){}
  renderLangBar();
  if(openHub)openHub15('learn');
}
function renderLangBar(){
  var bar=$('#v15langbar');if(!bar)return;
  var e=en15(),c=counts15();
  bar.innerHTML='<div class="v15lb-in">'
    +'<button class="v15lb-btn '+(e.lang==='ko'?'on':'')+'" onclick="__v15.setLang(\'ko\')">🇰🇷 Korean Farm</button>'
    +'<button class="v15lb-btn '+(e.lang==='en'?'on':'')+'" onclick="__v15.setLang(\'en\')">🇬🇧 English Farm</button>'
    +'<span class="v15lb-meta">EN: '+c.mastered+' thuộc · '+c.due+' cần ôn</span>'
    +'<button class="v15lb-hub" onclick="__v15.openHub()">English Hub</button>'
    +'<button class="v15lb-hub" onclick="window.__v23&&__v23.openHub()">🐾 Thú Cưng</button>'
    +'</div>';
}
function showChooser(){
  var e=en15();if(e.langChoice)return;
  var d=document.createElement('div');d.id='v15chooser';d.className='v15modal';
  d.innerHTML='<div class="v15card v15choose">'
    +'<div class="v15mascot">'+OLLIE_SVG+'</div>'
    +'<h2>Chọn nông trại của bạn</h2><p class="mute">Choose your farm. Tiến trình tiếng Hàn và tiếng Anh lưu độc lập, XP và cấp độ dùng chung.</p>'
    +'<div class="v15choose-btns">'
    +'<button class="v15big ko" onclick="__v15.choose(\'ko\')"><b>🇰🇷 KOREAN FARM</b><span>Nông trại tiếng Hàn — giữ nguyên mọi thứ bạn đã có</span></button>'
    +'<button class="v15big en" onclick="__v15.choose(\'en\')"><b>🇬🇧 ENGLISH FARM</b><span>Nông trại tiếng Anh — 10 chế độ học, farm &amp; boss mới</span></button>'
    +'</div>'
    +'<button class="v15link" onclick="__v15.choose(null)">Để sau</button>'
    +'</div>';
  document.body.appendChild(d);
}
function choose15(lang){
  var m=$('#v15chooser');if(m)m.remove();
  if(!lang){en15().langChoice=true;save15();renderLangBar();return}
  setLang(lang,lang==='en');
}

/* ---------- English mascot: Ollie the Owl (inline SVG, distinct from Korean mascot) ---------- */
var OLLIE_SVG='<svg viewBox="0 0 120 120" class="v15ollie" aria-label="Ollie the Owl">'
 +'<ellipse cx="60" cy="104" rx="34" ry="8" fill="#0002"/>'
 +'<ellipse cx="60" cy="62" rx="42" ry="46" fill="#7C5CFF"/>'
 +'<ellipse cx="60" cy="72" rx="30" ry="30" fill="#EDE7FF"/>'
 +'<circle cx="44" cy="48" r="13" fill="#fff"/><circle cx="76" cy="48" r="13" fill="#fff"/>'
 +'<circle cx="46" cy="50" r="6" fill="#1F2A44"/><circle cx="74" cy="50" r="6" fill="#1F2A44"/>'
 +'<circle cx="48" cy="48" r="2" fill="#fff"/><circle cx="76" cy="48" r="2" fill="#fff"/>'
 +'<path d="M52 62 L60 72 L68 62" stroke="#F4A259" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
 +'<path d="M18 52 Q6 62 20 74 Q26 60 18 52Z" fill="#5B3FD4"/><path d="M102 52 Q114 62 100 74 Q94 60 102 52Z" fill="#5B3FD4"/>'
 +'<path d="M52 26 L60 12 L68 26Z" fill="#F4A259"/>'
 +'<path d="M44 92 h32" stroke="#5B3FD4" stroke-width="4" stroke-linecap="round"/>'
 +'<path d="M40 100 q20 10 40 0" stroke="#5B3FD4" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';

/* ---------- HUB ---------- */
var HUB={tab:'learn',mode:null};
var M={}; /* current mode session */
var MODES=[
{id:'flash',n:'Flashcards',d:'Lật thẻ EN–VI, đánh giá nhớ / chưa nhớ',ic:'book.png'},
{id:'mc',n:'Multiple Choice',d:'Chọn nghĩa đúng, có giải thích',ic:'question.svg'},
{id:'type',n:'English Typing',d:'Nhìn nghĩa Việt, gõ từ tiếng Anh',ic:'write.png'},
{id:'listen',n:'Listening',d:'Nghe phát âm, chọn hoặc gõ từ nghe được',ic:'listen.png'},
{id:'builder',n:'Sentence Builder',d:'Sắp xếp từ thành câu đúng ngữ pháp',ic:'grammar.png'},
{id:'grammar',n:'Grammar Challenge',d:'Ngữ pháp theo trình độ A1–B2',ic:'grammar.png'},
{id:'match',n:'Matching Game',d:'Ghép từ với nghĩa, tính giờ 90 giây',ic:'farm.png'},
{id:'speed',n:'Speed Vocabulary',d:'Trả lời càng nhiều càng tốt trong 60 giây',ic:'flame.svg'},
{id:'read',n:'Reading Challenge',d:'Đọc đoạn văn, trả lời câu hỏi nhận XP',ic:'book.png'},
{id:'speak',n:'Speaking Practice',d:'Luyện phát âm với nhận dạng giọng nói',ic:'speak.png'}
];
function openHub15(tab){
  HUB.tab=tab||HUB.tab||'learn';HUB.mode=null;
  var h=$('#v15hub');
  if(!h){h=document.createElement('div');h.id='v15hub';h.className='v15hub';document.body.appendChild(h)}
  h.style.display='flex';document.body.style.overflow='hidden';
  renderHub();
}
function closeHub15(){
  var h=$('#v15hub');if(h)h.style.display='none';
  document.body.style.overflow='';
  if(M.timer){clearInterval(M.timer);M.timer=null}
  try{if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel()}catch(e){}
  renderLangBar();
}
function hubTabs(){
  return [['learn','Học tập'],['library','📚 Thư viện'],['farm','English Farm'],['bosses','Bosses'],['collection','🏆 Bộ Sưu Tập'],['map','🗺️ Bản Đồ Boss'],['review','Ôn tập SRS'],['stats','Thống kê'],['vocab','Từ vựng'],['backup','💾 Dữ liệu']];
}
function renderHub(){
  var h=$('#v15hub');if(!h)return;
  var e=en15(),c=counts15();
  h.innerHTML='<div class="v15hub-in">'
    +'<div class="v15hub-head"><div class="v15hub-title"><span class="v15ollie-sm">'+OLLIE_SVG+'</span><div><b>English Farm</b><span>Ollie\'s Farm · '+c.mastered+'/'+c.total+' từ đã thuộc · '+c.due+' từ cần ôn hôm nay</span></div></div>'
    +'<div class="v15hub-headbtns"><span class="v15chip">'+icon15('coin.png')+' '+coins15()+' XP</span><span class="v15chip">'+icon15('gem.png')+' '+(S.v7.gems||0)+' 💎</span><button class="btn sm" onclick="window.__v23&&__v23.openHub()">🐾 Thú Cưng</button><button class="v15x" onclick="__v15.closeHub()" aria-label="Đóng">✕</button></div></div>'
    +'<div class="v15tabs">'+hubTabs().map(function(t){return '<button class="v15tab '+(HUB.tab===t[0]?'on':'')+'" onclick="__v15.tab(\''+t[0]+'\')">'+t[1]+'</button>'}).join('')+'</div>'
    +(window.__v17&&__v17.scopeBannerHTML?__v17.scopeBannerHTML():'')
    +'<div class="v15body" id="v15body"></div></div>';
  renderTab();
}
function renderTab(){
  var b=$('#v15body');if(!b)return;
  if(HUB.mode){renderMode();return}
  if(HUB.tab==='learn')b.innerHTML=learnHTML();
  else if(HUB.tab==='library')b.innerHTML=(window.__v17&&__v17.libraryHTML())||'<p class="mute">Đang tải thư viện từ vựng…</p>';
  else if(HUB.tab==='farm')b.innerHTML=farmHTML();
  else if(HUB.tab==='bosses')b.innerHTML=bossesHTML();
  else if(HUB.tab==='collection')b.innerHTML=(window.__v18&&__v18.collectionHTML())||'<p class="mute">Đang tải bộ sưu tập boss…</p>';
  else if(HUB.tab==='map')b.innerHTML=(window.__v19&&__v19.mapHTML())||'<p class="mute">Đang tải bản đồ boss…</p>';
  else if(HUB.tab==='review')b.innerHTML=reviewHTML();
  else if(HUB.tab==='stats')b.innerHTML=statsHTML();
  else if(HUB.tab==='vocab')b.innerHTML=vocabHTML();
  else if(HUB.tab==='backup')b.innerHTML=backupHTML();
  afterRender();
}
function afterRender(){
  if(HUB.tab==='farm')renderFarmPlots();
  if(HUB.tab==='stats')drawChart();
}
function setTab(t){HUB.tab=t;HUB.mode=null;if(M.timer){clearInterval(M.timer);M.timer=null}renderHub()}
function setLevel(lv){en15().level=lv;save15();renderTab()}
function setTopic(t){en15().topic=t;save15();renderTab()}
function levelTopicBar(){
  var e=en15();
  var lv=['ALL','A1','A2','B1','B2'].map(function(l){return '<button class="v15pill '+(e.level===l?'on':'')+'" onclick="__v15.setLevel(\''+l+'\')">'+(l==='ALL'?'Mọi cấp độ':l)+'</button>'}).join('');
  var topics=[''].concat((window.__V15_DATA?__V15_DATA.topics:[]).map(function(t){return t.id}));
  try{if(window.__v14&&__v14.TOPICS)__v14.TOPICS.forEach(function(t){if(topics.indexOf(t.id)<0)topics.push(t.id)})}catch(e){}
  var tp='<select class="v15sel" onchange="__v15.setTopic(this.value)"><option value="">Mọi chủ đề</option>'
    +topics.filter(Boolean).map(function(id){return '<option value="'+id+'" '+(e.topic===id?'selected':'')+'>'+esc(topicName(id))+'</option>'}).join('')+'</select>';
  return '<div class="v15filters">'+lv+tp+'</div>';
}
function learnHTML(){
  var e=en15();
  return '<div class="v15learn-head"><div><h3>Chọn chế độ học</h3><p class="mute">Trả lời đúng để nhận XP, tưới cây trong farm và tích combo. Từ sai sẽ quay lại ôn sớm (SRS).</p></div>'+levelTopicBar()+'</div>'
  +'<div class="v15modes">'+MODES.map(function(m){
    var best=e.modeBest[m.id];
    return '<button class="v15mode" onclick="__v15.startMode(\''+m.id+'\')"><span class="v15mode-ic">'+icon15(m.ic)+'</span><b>'+m.n+'</b><span>'+m.d+'</span>'+(best?'<em>Đã chơi '+best.played+' · đúng '+best.correct+'</em>':'<em>Chưa chơi</em>')+'</button>';
  }).join('')+'</div>'
  +'<div class="v15note">Muốn dùng các chế độ tiếng Anh cũ của V6 (Trắc nghiệm, Gõ từ, Ghép cặp, Điền câu, Xếp chữ, Nghe, Đua 60s, Flashcard, Ôn tập)? Đóng hub này và chọn chế độ <b>Tiếng Anh (EN–VI)</b> trong mục Học — toàn bộ vẫn hoạt động với 1.000+ từ mới.</div>';
}
function startMode(id){
  HUB.mode=id;M={mode:id,q:0,score:0,total:0,answered:null,ok:null,started:Date.now()};
  if(id==='flash')startFlash();
  else if(id==='mc')startMC();
  else if(id==='type')startType();
  else if(id==='listen')startListen();
  else if(id==='builder')startBuilder();
  else if(id==='grammar')startGrammar();
  else if(id==='match')startMatch();
  else if(id==='speed')startSpeed();
  else if(id==='read')startRead();
  else if(id==='speak')startSpeak();
  renderMode();
}
function modeHead(title,sub){
  return '<div class="v15mode-head"><button class="v15back" onclick="__v15.backToLearn()">← Tất cả chế độ</button><div><h3>'+title+'</h3><p class="mute">'+sub+'</p></div>'
  +'<div class="v15score">Điểm: <b>'+(M.score||0)+'</b> · Câu '+(M.q+1)+'/'+(M.total||10)+'</div></div>';
}
function backToLearn(){HUB.mode=null;if(M.timer){clearInterval(M.timer);M.timer=null}renderTab()}
function renderMode(){
  var b=$('#v15body');if(!b)return;
  var fn={flash:flashHTML,mc:mcHTML,type:typeHTML,listen:listenHTML,builder:builderHTML,grammar:grammarHTML,match:matchHTML,speed:speedHTML,read:readHTML,speak:speakHTML}[M.mode];
  b.innerHTML=fn?fn():learnHTML();
  if(M.mode==='type'){var inp=$('#v15-type-in');if(inp)setTimeout(function(){inp.focus()},0)}
  if(M.mode==='listen'&&M.cur&&M.cur.w&&M.answered===null&&M.autoSpeak!==false){setTimeout(function(){speak15(M.cur.w.en)},250)}
}
function finishRound(title){
  var xp=M.score*2;
  /* V23: team leader boosts learning XP (+5%/+10%/+20% by stage). */
  var petBonus=0;
  try{if(window.__v23)petBonus=Math.round(xp*__v23.learnXpBonus())}catch(e){}
  if(xp>0)gain15(xp);
  if(petBonus>0)gain15(petBonus);
  var e=en15();if(M.score>(e.modeBest[M.mode]?e.modeBest[M.mode].best||0:0)){e.modeBest[M.mode]=e.modeBest[M.mode]||{played:0,correct:0,best:0};e.modeBest[M.mode].best=M.score}
  save15();sfx15(M.score>=Math.ceil((M.total||10)*0.6)?'win':'lose');
  return '<div class="v15done"><div class="v15done-big">'+esc(title)+'</div><p>Bạn trả lời đúng <b>'+M.score+'/'+(M.total||10)+'</b> câu · +'+(xp+petBonus)+' XP thưởng cuối ván'+(petBonus>0?' (gồm +'+petBonus+' XP nhờ thú cưng hỗ trợ)':'')+'.</p><div class="acts"><button class="btn pri" onclick="__v15.startMode(\''+M.mode+'\')">Chơi lại</button><button class="btn" onclick="__v15.backToLearn()">Chế độ khác</button></div></div>';
}
function pickPool(n,onlyDue){
  var list=wordsFiltered({level:en15().level,topic:en15().topic,onlyDue:onlyDue});
  if(!list.length)list=wordsFiltered({level:'ALL'});
  return shuffle(list).slice(0,n);
}
function distractors(w,n){
  var pool=WORDS.filter(function(x){return x.id!==w.id&&(x.t===w.t||x.lv===w.lv)});
  /* V22: khi đang chọn phạm vi Thư viện (vd Basic Tactics), đáp án nhiễu
     lấy trong cùng phạm vi — lọc chủ đề/cấp độ trước làm cạn nguồn vì
     từ BT trùng với V14/V15 giữ t/lv cũ, còn từ BT-only có t='bt'. */
  try{
    var sc=en15().scope;
    if(sc&&sc.kind==='lib'){
      var inSc=WORDS.filter(function(x){return x.id!==w.id&&inScope15(x)});
      if(inSc.length>=n)pool=inSc;
    }
  }catch(e){}
  return shuffle(pool).slice(0,n);
}

/* ---------- Mode 1: Flashcards ---------- */
function startFlash(){
  M.list=pickPool(20);M.total=M.list.length;M.idx=0;M.flip=false;
}
function flashHTML(){
  if(!M.list||!M.list.length)return '<p class="mute">Không có từ nào cho bộ lọc này. Hãy đổi cấp độ / chủ đề.</p>'+'<div class="acts"><button class="btn" onclick="__v15.backToLearn()">Quay lại</button></div>';
  if(M.idx>=M.list.length)return finishRound('Hết bộ thẻ!');
  var w=M.list[M.idx];
  return modeHead('Flashcards','Bấm vào thẻ để lật · đánh giá sau khi lật')
  +'<div class="v15fc '+(M.flip?'fl':'')+'" onclick="__v15.fcFlip()"><div class="v15fc-in"><div class="v15fc-f"><div class="v15fc-word">'+esc(w.en)+'</div><div class="mute">'+esc(w.ipa)+' · '+esc(w.pos)+'</div><div class="mute">Bấm để lật thẻ</div></div>'
  +'<div class="v15fc-b"><div class="v15fc-word vi">'+esc(w.vi)+'</div><div class="mute">'+esc(w.ipa)+' · '+esc(w.pos)+' · '+esc(topicName(w.t))+'</div>'+(w.ex?'<div class="v15ex">“'+esc(w.ex)+'”<br><span class="mute">'+esc(w.exvi)+'</span></div>':'')+'</div></div></div>'
  +'<div class="acts"><button class="btn sm" onclick="__v15.fcPrev()">← Trước</button><button class="btn sm" onclick="__v15.speakWord(\''+w.id+'\')">Nghe phát âm</button><button class="btn sm" onclick="__v15.fcNext()">Sau →</button></div>'
  +(M.flip?'<div class="acts"><button class="btn bad" onclick="__v15.fcRate(false)">Chưa nhớ</button><button class="btn ok" onclick="__v15.fcRate(true)">Đã nhớ</button></div>':'')
  +'<p class="mute">Thẻ '+(M.idx+1)+' / '+M.list.length+' · hộp '+(boxOf(w))+'/5 · đúng '+(enOld().right[w.id]||0)+' · sai '+(enOld().wrong[w.id]||0)+'</p>';
}
function fcFlip(){M.flip=!M.flip;renderMode()}
function fcNext(){if(M.idx<M.list.length-1){M.idx++;M.flip=false;renderMode()}}
function fcPrev(){if(M.idx>0){M.idx--;M.flip=false;renderMode()}}
function fcRate(ok){
  var w=M.list[M.idx];mark15(ok,w,'flash');if(ok)M.score++;
  M.idx++;M.flip=false;
  if(M.idx>=M.list.length){M.q=M.total-1}
  renderMode();
}
function speakWord(id){var w=BYID[id];if(w)speak15(w.en)}

/* ---------- Mode 2: Multiple Choice ---------- */
function startMC(){
  M.list=pickPool(10);M.total=10;M.q=0;M.score=0;nextMC();
}
function nextMC(){
  var w=M.list[M.q];if(!w){M.cur=null;return}
  var opts=shuffle([w].concat(distractors(w,3)));
  M.cur={w:w,opts:opts};M.answered=null;M.ok=null;
}
function mcHTML(){
  if(M.q>=M.total)return finishRound('Hoàn thành Trắc nghiệm!');
  var c=M.cur;if(!c)return '<p class="mute">Đang chuẩn bị câu hỏi…</p>';
  var w=c.w;
  var h=modeHead('Multiple Choice','Chọn nghĩa đúng của từ');
  h+='<div class="v15qcard"><div class="v15qword">'+esc(w.en)+'</div><div class="mute">'+esc(w.ipa)+' · '+esc(w.pos)+'</div><div class="acts"><button class="btn sm" onclick="__v15.speakWord(\''+w.id+'\')">Nghe phát âm</button></div></div>';
  h+='<div class="v15opts">'+c.opts.map(function(o,i){
    var cl='';if(M.answered!==null)cl=(o.id===w.id?'right':(o.id===M.answered?'wrong':''));
    return '<button class="v15opt '+cl+'" '+(M.answered!==null?'disabled':'')+' onclick="__v15.mcPick(\''+o.id+'\')">'+(i+1)+'. '+esc(o.vi)+'</button>';
  }).join('')+'</div>';
  if(M.answered!==null){
    h+='<div class="v15explain" style="color:var(--'+(M.ok?'ok':'bad')+')">'+(M.ok?'Chính xác!':'Chưa đúng. Đáp án: <b>'+esc(w.vi)+'</b>')+'</div>';
    if(w.ex)h+='<div class="v15ex">“'+esc(w.ex)+'”<br><span class="mute">'+esc(w.exvi)+'</span></div>';
    h+='<div class="acts"><button class="btn pri" onclick="__v15.mcNext()">Câu tiếp →</button></div>';
  }
  return h;
}
function mcPick(id){
  if(M.answered!==null)return;
  M.answered=id;M.ok=(id===M.cur.w.id);
  mark15(M.ok,M.cur.w,'mc');if(M.ok)M.score++;
  renderMode();
}
function mcNext(){M.q++;if(M.q<M.total)nextMC();renderMode()}

/* ---------- Mode 3: Typing ---------- */
function startType(){
  M.list=pickPool(10);M.total=10;M.q=0;M.score=0;M.hint=0;nextType();
}
function nextType(){
  var w=M.list[M.q];M.cur={w:w};M.answered=null;M.ok=null;M.hint=0;
  /* V22: cụm từ nhiều từ (vd Basic Tactics) thì sắp xếp các thành phần
     thay vì gõ — gõ nguyên một câu dài dễ sai và không luyện thứ tự từ. */
  if(w&&/\s/.test((w.en||'').replace(/[.!?]$/,''))){
    var toks=w.en.replace(/([.!?])$/,'').split(' ');
    M.cur.arr={tokens:shuffle(toks.map(function(t,i){return {t:t,i:i}})),built:[],used:{}};
  }
}
function typeHTML(){
  if(M.q>=M.total)return finishRound('Hoàn thành English Typing!');
  /* V14: bảo vệ khi danh sách rỗng (vd phạm vi BT "Cần ôn" mà chưa có
     từ nào đến hạn) — trước đây M.cur.w là undefined và trang vỡ. */
  if(!M.cur||!M.cur.w)return '<p class="mute">Không có từ nào cho bộ lọc này. Hãy đổi cấp độ / chủ đề.</p>'+'<div class="acts"><button class="btn" onclick="__v15.backToLearn()">Quay lại</button></div>';
  var w=M.cur.w;
  var hint=w.en.slice(0,M.hint);
  var h=modeHead('English Typing','Nhìn nghĩa tiếng Việt và gõ từ tiếng Anh');
  h+='<div class="v15qcard"><div class="v15qword vi">'+esc(w.vi)+'</div><div class="mute">'+esc(w.pos)+' · '+esc(topicName(w.t))+' · '+esc(w.lv)+'</div>'+(M.hint?'<div class="mute">Gợi ý: <b>'+esc(hint)+'…</b></div>':'')+'</div>';
  if(M.cur.arr){
    var a=M.cur.arr;
    h+='<div class="v15built">'+(a.built.length?a.built.map(function(b){return esc(b.t)}).join(' '):'&nbsp;')+'</div>';
    h+='<div class="v15tiles">'+a.tokens.map(function(tok,idx){
      return '<button class="v15tile" '+(a.used[idx]?'disabled':'')+' onclick="__v15.typeArrTap('+idx+')">'+esc(tok.t)+'</button>';
    }).join('')+'</div>';
    if(M.answered===null){
      h+='<div class="acts"><button class="btn pri" onclick="__v15.typeArrCheck()">Kiểm tra</button><button class="btn sm" onclick="__v15.typeArrClear()">Xóa</button><button class="btn sm" onclick="__v15.typeArrHint()">Gợi ý từ đầu</button></div>';
    }else{
      h+='<div class="v15explain" style="color:var(--'+(M.ok?'ok':'bad')+')">'+(M.ok?'Chính xác! +XP':'Chưa đúng. Cụm đúng: <b>'+esc(w.en)+'</b>')+'</div>';
      h+='<div class="acts"><button class="btn pri" onclick="__v15.typeNext()">Câu tiếp →</button></div>';
    }
    return h;
  }
  if(M.answered===null){
    h+='<input id="v15-type-in" class="v15input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ tiếng Anh…" onkeydown="if(event.key===\'Enter\')__v15.typeSubmit()">'
    +'<div class="acts"><button class="btn pri" onclick="__v15.typeSubmit()">Kiểm tra</button><button class="btn sm" onclick="__v15.typeHint()">Gợi ý chữ cái</button><button class="btn sm" onclick="__v15.speakWord(\''+w.id+'\')">Nghe</button></div>';
  }else{
    h+='<div class="v15explain" style="color:var(--'+(M.ok?'ok':'bad')+')">'+(M.ok?'Chính xác! +XP':'Chưa đúng. Đáp án: <b>'+esc(w.en)+'</b> '+esc(w.ipa))+'</div>';
    if(w.ex)h+='<div class="v15ex">“'+esc(w.ex)+'”<br><span class="mute">'+esc(w.exvi)+'</span></div>';
    h+='<div class="acts"><button class="btn pri" onclick="__v15.typeNext()">Câu tiếp →</button></div>';
  }
  return h;
}
function typeSubmit(){
  var inp=$('#v15-type-in');if(!inp||M.answered!==null)return;
  var v=norm(inp.value),w=M.cur.w;
  M.answered=v||'—';M.ok=(v===norm(w.en));
  mark15(M.ok,w,'type');if(M.ok)M.score++;
  renderMode();
}
function typeHint(){M.hint=Math.min(M.cur.w.en.length,M.hint+1);renderMode()}
function typeNext(){M.q++;if(M.q<M.total)nextType();renderMode()}
/* V22: sắp xếp thành phần cụm từ trong English Typing (xem nextType) */
function typeArrTap(idx){
  var a=M.cur&&M.cur.arr;if(!a||M.answered!==null||a.used[idx])return;
  a.used[idx]=1;a.built.push(a.tokens[idx]);renderMode();
}
function typeArrClear(){var a=M.cur&&M.cur.arr;if(!a)return;a.built=[];a.used={};renderMode()}
function typeArrHint(){
  var a=M.cur&&M.cur.arr,w=M.cur&&M.cur.w;if(!a||!w)return;
  var first=w.en.replace(/([.!?])$/,'').split(' ')[0];
  for(var i=0;i<a.tokens.length;i++){if(a.tokens[i].t===first&&!a.used[i]){typeArrTap(i);return}}
  renderMode();
}
function typeArrCheck(){
  var a=M.cur&&M.cur.arr,w=M.cur&&M.cur.w;if(!a||!w||M.answered!==null)return;
  var built=a.built.map(function(b){return b.t}).join(' ');
  var target=w.en.replace(/([.!?])$/,'');
  M.answered=built;M.ok=(norm(built)===norm(target));
  mark15(M.ok,w,'type');if(M.ok)M.score++;
  renderMode();
}

/* ---------- Mode 4: Listening ---------- */
function startListen(){
  M.list=pickPool(10);M.total=10;M.q=0;M.score=0;M.lmode='choice';nextListen();
}
function nextListen(){
  var w=M.list[M.q];if(!w){M.cur=null;return}
  M.cur={w:w,opts:shuffle([w].concat(distractors(w,3)))};M.answered=null;M.ok=null;M.autoSpeak=true;
}
function listenHTML(){
  if(M.q>=M.total)return finishRound('Hoàn thành Listening!');
  /* V14: như typeHTML — danh sách rỗng thì hiện thông báo thay vì vỡ. */
  if(!M.cur||!M.cur.w)return '<p class="mute">Không có từ nào cho bộ lọc này. Hãy đổi cấp độ / chủ đề.</p>'+'<div class="acts"><button class="btn" onclick="__v15.backToLearn()">Quay lại</button></div>';
  var c=M.cur,w=c.w;
  var h=modeHead('Listening Challenge','Nghe phát âm và chọn / gõ từ nghe được');
  h+='<div class="v15qcard"><div class="v15qword">Nghe</div><div class="mute">Bấm nút Nghe, rồi '+(M.lmode==='choice'?'chọn từ đúng':'gõ từ bạn nghe được')+'</div><div class="acts"><button class="btn pri" onclick="__v15.speakWord(\''+w.id+'\')">Nghe phát âm</button>'
  +'<button class="btn sm" onclick="__v15.listenMode(\''+(M.lmode==='choice'?'type':'choice')+'\')">Đổi sang '+(M.lmode==='choice'?'gõ từ':'chọn đáp án')+'</button></div></div>';
  if(M.lmode==='choice'){
    h+='<div class="v15opts">'+c.opts.map(function(o,i){
      var cl='';if(M.answered!==null)cl=(o.id===w.id?'right':(o.id===M.answered?'wrong':''));
      return '<button class="v15opt '+cl+'" '+(M.answered!==null?'disabled':'')+' onclick="__v15.listenPick(\''+o.id+'\')">'+(i+1)+'. '+esc(o.en)+'</button>';
    }).join('')+'</div>';
  }else if(M.answered===null){
    h+='<input id="v15-listen-in" class="v15input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Gõ từ bạn nghe được…" onkeydown="if(event.key===\'Enter\')__v15.listenTypeSubmit()">'
    +'<div class="acts"><button class="btn pri" onclick="__v15.listenTypeSubmit()">Kiểm tra</button></div>';
  }
  if(M.answered!==null){
    h+='<div class="v15explain" style="color:var(--'+(M.ok?'ok':'bad')+')">'+(M.ok?'Chính xác!':'Chưa đúng. Từ nghe được: <b>'+esc(w.en)+'</b> '+esc(w.ipa)+' — '+esc(w.vi))+'</div>';
    if(w.ex)h+='<div class="v15ex">“'+esc(w.ex)+'”<br><span class="mute">'+esc(w.exvi)+'</span></div>';
    h+='<div class="acts"><button class="btn pri" onclick="__v15.listenNext()">Câu tiếp →</button></div>';
  }
  return h;
}
function listenMode(m){M.lmode=m;renderMode()}
function listenPick(id){
  if(M.answered!==null)return;
  M.answered=id;M.ok=(id===M.cur.w.id);
  mark15(M.ok,M.cur.w,'listen');if(M.ok)M.score++;
  renderMode();
}
function listenTypeSubmit(){
  var inp=$('#v15-listen-in');if(!inp||M.answered!==null)return;
  var v=norm(inp.value),w=M.cur.w;
  M.answered=v||'—';M.ok=(v===norm(w.en));
  mark15(M.ok,w,'listen');if(M.ok)M.score++;
  renderMode();
}
function listenNext(){M.q++;if(M.q<M.total)nextListen();renderMode()}

/* ---------- Mode 5: Sentence Builder ---------- */
function startBuilder(){
  var bank=(window.__V15_DATA&&__V15_DATA.builder)||[];
  var lv=en15().level;
  var pool=bank.filter(function(s){return lv==='ALL'||s.lv===lv});
  if(!pool.length)pool=bank;
  M.list=shuffle(pool).slice(0,10);M.total=10;M.q=0;M.score=0;nextBuilder();
}
function nextBuilder(){
  var s=M.list[M.q];if(!s){M.cur=null;return}
  var toks=s.s.replace(/([.!?])$/,'').split(' ');
  M.cur={s:s,tokens:shuffle(toks.map(function(t,i){return {t:t,i:i}})),built:[],used:{}};M.answered=null;M.ok=null;
}
function builderHTML(){
  if(M.q>=M.total)return finishRound('Hoàn thành Sentence Builder!');
  var c=M.cur,s=c.s;
  var h=modeHead('Sentence Builder','Sắp xếp các từ thành câu đúng · Nghĩa: '+esc(s.vi));
  h+='<div class="v15built">'+(c.built.length?c.built.map(function(b){return esc(b.t)}).join(' '):'&nbsp;')+'</div>';
  h+='<div class="v15tiles">'+c.tokens.map(function(tok,idx){
    return '<button class="v15tile" '+(c.used[idx]?'disabled':'')+' onclick="__v15.builderTap('+idx+')">'+esc(tok.t)+'</button>';
  }).join('')+'</div>';
  if(M.answered===null){
    h+='<div class="acts"><button class="btn pri" onclick="__v15.builderCheck()">Kiểm tra</button><button class="btn sm" onclick="__v15.builderClear()">Xóa</button><button class="btn sm" onclick="__v15.builderHint()">Gợi ý từ đầu</button></div>';
  }else{
    h+='<div class="v15explain" style="color:var(--'+(M.ok?'ok':'bad')+')">'+(M.ok?'Chính xác!':'Chưa đúng. Câu đúng: <b>'+esc(s.s)+'</b>')+'</div>';
    h+='<div class="acts"><button class="btn pri" onclick="__v15.builderNext()">Câu tiếp →</button></div>';
  }
  return h;
}
function builderTap(idx){
  var c=M.cur;if(!c||M.answered!==null||c.used[idx])return;
  c.used[idx]=1;c.built.push(c.tokens[idx]);renderMode();
}
function builderClear(){var c=M.cur;c.built=[];c.used={};renderMode()}
function builderHint(){
  var c=M.cur,s=c.s;var first=s.s.split(' ')[0];
  for(var i=0;i<c.tokens.length;i++){if(c.tokens[i].t===first&&!c.used[i]){builderTap(i);return}}
  renderMode();
}
function builderCheck(){
  var c=M.cur;if(M.answered!==null)return;
  var built=c.built.map(function(b){return b.t}).join(' ');
  var target=c.s.s.replace(/([.!?])$/,'');
  M.answered=built;M.ok=(norm(built)===norm(target));
  var w={id:'builder-'+M.q,en:target,vi:c.s.vi};
  if(M.ok)M.score++;
  /* builder has no single word to SRS; reward via daily + streak only */
  var e=en15();e.daily.correct+=M.ok?1:0;if(!M.ok)e.daily.wrong++;
  if(M.ok)gain15(5);
  save15();sfx15(M.ok?'ok':'bad');
  renderMode();
}
function builderNext(){M.q++;if(M.q<M.total)nextBuilder();renderMode()}

/* ---------- Mode 6: Grammar Challenge ---------- */
function startGrammar(){
  var bank=(window.__V15_DATA&&__V15_DATA.grammar)||[];
  var lv=en15().level;
  var pool=bank.filter(function(g){return lv==='ALL'||g.lv===lv});
  if(!pool.length)pool=bank;
  M.list=shuffle(pool).slice(0,10);M.total=10;M.q=0;M.score=0;nextGrammar();
}
function nextGrammar(){M.cur=M.list[M.q]||null;M.answered=null;M.ok=null}
function grammarHTML(){
  if(M.q>=M.total)return finishRound('Hoàn thành Grammar Challenge!');
  var g=M.cur;
  var h=modeHead('Grammar Challenge','Trình độ '+g.lv+' · chọn đáp án đúng');
  h+='<div class="v15qcard"><div class="v15qword small">'+esc(g.q)+'</div></div>';
  h+='<div class="v15opts">'+g.o.map(function(o,i){
    var cl='';if(M.answered!==null)cl=(i===g.a?'right':(i===M.answered?'wrong':''));
    return '<button class="v15opt '+cl+'" '+(M.answered!==null?'disabled':'')+' onclick="__v15.grammarPick('+i+')">'+String.fromCharCode(65+i)+'. '+esc(o)+'</button>';
  }).join('')+'</div>';
  if(M.answered!==null){
    h+='<div class="v15explain" style="color:var(--'+(M.ok?'ok':'bad')+')">'+(M.ok?'Chính xác!':'Chưa đúng. Đáp án: <b>'+esc(g.o[g.a])+'</b>')+'<br><span class="mute">'+esc(g.ex)+'</span></div>';
    h+='<div class="acts"><button class="btn pri" onclick="__v15.grammarNext()">Câu tiếp →</button></div>';
  }
  return h;
}
function grammarPick(i){
  if(M.answered!==null)return;
  M.answered=i;M.ok=(i===M.cur.a);
  if(M.ok){M.score++;gain15(5)}
  var e=en15();e.daily.correct+=M.ok?1:0;if(!M.ok)e.daily.wrong++;
  save15();sfx15(M.ok?'ok':'bad');
  renderMode();
}
function grammarNext(){M.q++;if(M.q<M.total)nextGrammar();renderMode()}

/* ---------- Mode 7: Matching Game (90s) ---------- */
function startMatch(){
  M.list=pickPool(6);M.total=6;M.q=0;M.score=0;M.left=90;
  M.pairs={};M.selEn=null;M.selVi=null;M.done=0;M.wrongPair=null;
  M.vis=shuffle(M.list);
  M.timer=setInterval(function(){
    M.left--;
    var t=$('#v15-match-t');if(t)t.textContent=M.left+'s';
    if(M.left<=0){clearInterval(M.timer);M.timer=null;M.finished=true;renderMode()}
  },1000);
}
function matchHTML(){
  if(M.finished||M.done>=M.list.length){
    if(M.timer){clearInterval(M.timer);M.timer=null}
    var xp=M.done*2;if(xp>0)gain15(xp);save15();
    return '<div class="v15done"><div class="v15done-big">'+(M.done>=M.list.length?'Hoàn thành Matching!':'Hết giờ!')+'</div><p>Bạn đã ghép đúng <b>'+M.done+'/'+M.list.length+'</b> cặp · +'+xp+' XP.</p><div class="acts"><button class="btn pri" onclick="__v15.startMode(\'match\')">Chơi lại</button><button class="btn" onclick="__v15.backToLearn()">Chế độ khác</button></div></div>';
  }
  var h=modeHead('Matching Game','Ghép từ tiếng Anh với nghĩa tiếng Việt · còn <span id="v15-match-t">'+M.left+'s</span>');
  h+='<div class="v15match"><div class="v15mcol">'+M.list.map(function(w){
    var st=M.pairs[w.id]==='ok'?'right':(M.selEn===w.id?'sel':'');
    return '<button class="v15opt '+st+'" '+(M.pairs[w.id]==='ok'?'disabled':'')+' onclick="__v15.matchClick(\'en\',\''+w.id+'\')">'+esc(w.en)+'</button>';
  }).join('')+'</div><div class="v15mcol">'+M.vis.map(function(w){
    var st=M.pairs[w.id]==='ok'?'right':(M.selVi===w.id?'sel':'');
    return '<button class="v15opt '+st+'" '+(M.pairs[w.id]==='ok'?'disabled':'')+' onclick="__v15.matchClick(\'vi\',\''+w.id+'\')">'+esc(w.vi)+'</button>';
  }).join('')+'</div></div>';
  h+='<p class="mute">Đã ghép đúng '+M.done+'/'+M.list.length+' cặp.</p>';
  return h;
}
function matchClick(side,id){
  if(M.finished)return;
  if(side==='en')M.selEn=id;else M.selVi=id;
  if(M.selEn&&M.selVi){
    if(M.selEn===M.selVi){
      M.pairs[M.selEn]='ok';M.done++;
      var w=BYID[M.selEn];if(w){mark15(true,w,'match');M.score++}
      sfx15('ok');
    }else{
      var w2=BYID[M.selEn];if(w2)mark15(false,w2,'match');
      sfx15('bad');
      var a=M.selEn,b=M.selVi;M.selEn=null;M.selVi=null;
      renderMode();
      return;
    }
    M.selEn=null;M.selVi=null;
  }
  renderMode();
}

/* ---------- Mode 8: Speed Vocabulary (60s) ---------- */
function startSpeed(){
  M.list=shuffle(wordsFiltered({level:en15().level}));
  if(!M.list.length)M.list=shuffle(wordsFiltered({level:'ALL'}));
  M.total=999;M.q=0;M.score=0;M.left=60;M.combo=0;
  M.timer=setInterval(function(){
    M.left--;
    var t=$('#v15-speed-t');if(t)t.textContent=M.left+'s';
    if(M.left<=0){clearInterval(M.timer);M.timer=null;M.finished=true;renderMode()}
  },1000);
  nextSpeed();
}
function nextSpeed(){
  var w=M.list[M.q%M.list.length];
  M.cur={w:w,opts:shuffle([w].concat(distractors(w,3)))};M.answered=null;M.ok=null;
}
function speedHTML(){
  if(M.finished){
    var xp=M.score*2;if(xp>0)gain15(xp);
    var e=en15();if(M.score>(e.modeBest.speed?e.modeBest.speed.best||0:0)){e.modeBest.speed=e.modeBest.speed||{played:0,correct:0,best:0};e.modeBest.speed.best=M.score}
    save15();
    return '<div class="v15done"><div class="v15done-big">Hết 60 giây!</div><p>Bạn trả lời đúng <b>'+M.score+'</b> từ · kỷ lục: <b>'+(e.modeBest.speed?e.modeBest.speed.best:0)+'</b> · +'+xp+' XP.</p><div class="acts"><button class="btn pri" onclick="__v15.startMode(\'speed\')">Chơi lại</button><button class="btn" onclick="__v15.backToLearn()">Chế độ khác</button></div></div>';
  }
  /* V14: như typeHTML — danh sách rỗng thì hiện thông báo thay vì vỡ. */
  if(!M.cur||!M.cur.w)return '<p class="mute">Không có từ nào cho bộ lọc này. Hãy đổi cấp độ / chủ đề.</p>'+'<div class="acts"><button class="btn" onclick="__v15.backToLearn()">Quay lại</button></div>';
  var c=M.cur,w=c.w;
  var h=modeHead('Speed Vocabulary','Trả lời càng nhanh càng tốt · còn <span id="v15-speed-t">'+M.left+'s</span> · combo x'+(M.combo||0));
  h+='<div class="v15qcard"><div class="v15qword">'+esc(w.en)+'</div><div class="mute">'+esc(w.ipa)+'</div></div>';
  h+='<div class="v15opts">'+c.opts.map(function(o,i){
    var cl='';if(M.answered!==null)cl=(o.id===w.id?'right':(o.id===M.answered?'wrong':''));
    return '<button class="v15opt '+cl+'" '+(M.answered!==null?'disabled':'')+' onclick="__v15.speedPick(\''+o.id+'\')">'+esc(o.vi)+'</button>';
  }).join('')+'</div>';
  return h;
}
function speedPick(id){
  if(M.answered!==null||M.finished)return;
  M.answered=id;var ok=(id===M.cur.w.id);M.ok=ok;
  mark15(ok,M.cur.w,'speed');
  if(ok){M.score++;M.combo=(M.combo||0)+1}else M.combo=0;
  renderMode();
  setTimeout(function(){if(!M.finished){M.q++;nextSpeed();renderMode()}},ok?250:600);
}

/* ---------- Mode 9: Reading Challenge ---------- */
function startRead(){
  var bank=(window.__V15_DATA&&__V15_DATA.reading)||[];
  var lv=en15().level;
  var pool=bank.filter(function(r){return lv==='ALL'||r.lv===lv});
  if(!pool.length)pool=bank;
  M.passage=shuffle(pool)[0];M.total=3;M.q=0;M.score=0;M.answered=null;M.ok=null;
}
function readHTML(){
  var p=M.passage;
  if(M.q>=M.total){
    var xp=M.score*5;if(xp>0)gain15(xp);save15();
    return '<div class="v15done"><div class="v15done-big">Hoàn thành Reading!</div><p>Bạn trả lời đúng <b>'+M.score+'/3</b> câu hỏi về “'+esc(p.title)+'” · +'+xp+' XP.</p><div class="acts"><button class="btn pri" onclick="__v15.startMode(\'read\')">Đoạn khác</button><button class="btn" onclick="__v15.backToLearn()">Chế độ khác</button></div></div>';
  }
  var q=p.qs[M.q];
  var h=modeHead('Reading Challenge','Đọc đoạn văn ('+p.lv+') rồi trả lời câu hỏi');
  h+='<div class="v15passage"><b>'+esc(p.title)+'</b><p>'+esc(p.text)+'</p><div class="acts"><button class="btn sm" onclick="__v15.readSpeak()">Nghe đoạn văn</button></div></div>';
  h+='<div class="v15qcard"><div class="v15qword small">'+esc(q.q)+'</div></div>';
  h+='<div class="v15opts">'+q.o.map(function(o,i){
    var cl='';if(M.answered!==null)cl=(i===q.a?'right':(i===M.answered?'wrong':''));
    return '<button class="v15opt '+cl+'" '+(M.answered!==null?'disabled':'')+' onclick="__v15.readPick('+i+')">'+String.fromCharCode(65+i)+'. '+esc(o)+'</button>';
  }).join('')+'</div>';
  if(M.answered!==null){
    h+='<div class="v15explain" style="color:var(--'+(M.ok?'ok':'bad')+')">'+(M.ok?'Chính xác!':'Chưa đúng. Đáp án: <b>'+esc(q.o[q.a])+'</b>')+'</div>';
    h+='<div class="acts"><button class="btn pri" onclick="__v15.readNext()">Câu tiếp →</button></div>';
  }
  return h;
}
function readSpeak(){if(M.passage)speak15(M.passage.text)}
function readPick(i){
  if(M.answered!==null)return;
  var q=M.passage.qs[M.q];
  M.answered=i;M.ok=(i===q.a);
  if(M.ok){M.score++;gain15(5)}
  var e=en15();e.daily.correct+=M.ok?1:0;if(!M.ok)e.daily.wrong++;
  save15();sfx15(M.ok?'ok':'bad');
  renderMode();
}
function readNext(){M.q++;M.answered=null;M.ok=null;renderMode()}

/* ---------- Mode 10: Speaking Practice ---------- */
function startSpeak(){
  M.list=pickPool(8);M.total=M.list.length;M.q=0;M.score=0;
  M.supported=(typeof window!=='undefined')&&!!(window.SpeechRecognition||window.webkitSpeechRecognition);
  M.heard='';M.result=null;M.selfRated=null;
}
function speakHTML(){
  if(M.q>=M.total)return finishRound('Hoàn thành Speaking Practice!');
  /* V14: như typeHTML — danh sách rỗng thì hiện thông báo thay vì vỡ. */
  if(!M.list||!M.list.length||!M.list[M.q])return '<p class="mute">Không có từ nào cho bộ lọc này. Hãy đổi cấp độ / chủ đề.</p>'+'<div class="acts"><button class="btn" onclick="__v15.backToLearn()">Quay lại</button></div>';
  var w=M.list[M.q];
  var h=modeHead('Speaking Practice','Nghe mẫu, đọc to từ / câu, rồi kiểm tra');
  h+='<div class="v15qcard"><div class="v15qword">'+esc(w.en)+'</div><div class="mute">'+esc(w.ipa)+' · '+esc(w.vi)+'</div>'
  +(w.ex?'<div class="v15ex">“'+esc(w.ex)+'”<br><span class="mute">'+esc(w.exvi)+'</span></div>':'')
  +'<div class="acts"><button class="btn pri" onclick="__v15.speakWord(\''+w.id+'\')">Nghe mẫu</button></div></div>';
  if(!M.supported){
    h+='<div class="v15warn"><b>Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói (SpeechRecognition).</b><br>Bạn vẫn có thể luyện tập: nghe mẫu, đọc to 3 lần, rồi tự đánh giá bên dưới. <b>Chế độ này không chấm điểm phát âm</b> — chỉ ghi nhận bạn đã luyện tập.</div>'
    +'<div class="acts"><button class="btn ok" onclick="__v15.speakSelf(true)">Tôi đã đọc trôi chảy</button><button class="btn" onclick="__v15.speakSelf(false)">Tôi cần luyện thêm</button></div>';
  }else{
    h+='<div class="acts"><button class="btn pri" onclick="__v15.speakRecord()">Bấm để nói &amp; kiểm tra</button></div>';
    if(M.listening)h+='<p class="mute">Đang nghe… hãy nói: <b>'+esc(w.en)+'</b></p>';
    if(M.heard)h+='<div class="v15explain">Máy nghe được: “<b>'+esc(M.heard)+'</b>”</div>';
  }
  if(M.result){
    h+='<div class="v15explain" style="color:var(--'+(M.result.ok?'ok':'bad')+')">'+M.result.text+'</div>';
  }
  if(M.selfRated!==null){
    h+='<div class="v15explain">Đã ghi nhận buổi luyện tập của bạn (tự đánh giá, không chấm điểm tự động).</div>';
  }
  h+='<div class="acts"><button class="btn pri" onclick="__v15.speakNext()">Từ tiếp →</button></div>';
  h+='<p class="mute">Từ '+(M.q+1)+' / '+M.total+' · Mẹo: nói chậm, rõ từng âm tiết.</p>';
  return h;
}
function speakRecord(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){renderMode();return}
  var w=M.list[M.q];
  var rec=new SR();rec.lang='en-US';rec.interimResults=false;rec.maxAlternatives=3;
  M.listening=true;renderMode();
  rec.onresult=function(ev){
    M.listening=false;
    var heard='';try{heard=ev.results[0][0].transcript||''}catch(e){}
    M.heard=heard;
    var target=norm(w.en),got=norm(heard);
    var tw=target.split(' '),gw=got.split(' ');
    var hit=tw.filter(function(t){return gw.indexOf(t)>=0}).length;
    var ratio=tw.length?hit/tw.length:0;
    var ok=ratio>=0.7||got===target;
    M.result={ok:ok,text:ok?'Khớp tốt ('+Math.round(ratio*100)+'% từ đúng)! +5 XP':'Chưa khớp lắm ('+Math.round(ratio*100)+'% từ đúng). Hãy nghe mẫu và thử lại — đáp án: '+w.en};
    if(ok){M.score++;gain15(5);mark15(true,w,'speak')}
    else mark15(false,w,'speak');
    save15();renderMode();
  };
  rec.onerror=function(){M.listening=false;M.result={ok:false,text:'Không nghe được giọng nói. Hãy kiểm tra micro và thử lại.'};renderMode()};
  rec.onend=function(){if(M.listening){M.listening=false;renderMode()}};
  try{rec.start()}catch(e){M.listening=false;renderMode()}
}
function speakSelf(good){
  var w=M.list[M.q];
  M.selfRated=good;
  var e=en15();e.speakDone[w.id]=1;
  if(good){M.score++;gain15(2)}
  save15();renderMode();
}
function speakNext(){M.q++;M.heard='';M.result=null;M.selfRated=null;M.listening=false;renderMode()}

/* ---------- ENGLISH FARM ---------- */
var CROPS=['carrot','tomato','strawberry','sunflower','wheat'];
var FARM_PETS=[{id:'dog',n:'Chó',p:100,img:'assets/pets/dog.png'},{id:'hen',n:'Gà',p:120,img:'assets/pets/hen.png'},{id:'cow',n:'Bò',p:200,img:'assets/pets/cow.png'},{id:'pig',n:'Heo',p:200,img:'assets/pets/pig.png'},{id:'sheep',n:'Cừu',p:250,img:'assets/pets/sheep.png'},{id:'horse',n:'Ngựa',p:300,img:'assets/pets/horse.png'}];
var FARM_DECOR=[{id:'farmhouse',n:'Nhà nông',p:150,img:'assets/decor/farmhouse.png'},{id:'tractor',n:'Máy kéo',p:200,img:'assets/decor/tractor.png'},{id:'cherry',n:'Cây anh đào',p:120,img:'assets/decor/cherry_blossom.png'},{id:'windmill',n:'Cối xay gió',p:180,img:'assets/buildings/windmill.png'},{id:'barn',n:'Chuồng trại',p:160,img:'assets/buildings/barn.png'},{id:'snowman',n:'Người tuyết',p:100,img:'assets/decor/snowman.png'},{id:'pumpkin',n:'Bí ngô',p:80,img:'assets/decor/pumpkin.png'},{id:'tree',n:'Cây cổ thụ',p:140,img:'assets/decor/ancient_tree.png'}];
function farmWeather(){
  var w=['Nắng đẹp','Nhiều mây','Mưa nhẹ','Gió mát'][dayNo()%4];
  var h=new Date().getHours();
  var tod=h>=19||h<6?'Đêm':(h>=17?'Hoàng hôn':(h>=11?'Trưa':'Sáng'));
  return {w:w,tod:tod,night:(h>=19||h<6)};
}
function waterFarm(){
  var e=en15();
  for(var i=0;i<e.farm.plots.length;i++){
    var p=e.farm.plots[i];
    if(p.wordId&&BYID[p.wordId]&&boxOf(BYID[p.wordId])<5&&p.water<5){p.water++;save15();return}
  }
}
function farmStage(p){
  if(!p.wordId||!BYID[p.wordId])return -1;
  return Math.min(5,boxOf(BYID[p.wordId]));
}
function farmHTML(){
  var e=en15(),fw=farmWeather(),c=counts15();
  var h='<div class="v15farm '+ (fw.night?'night':'day') +'">'
  +'<div class="v15farm-head"><div><h3>English Farm — Nông trại tiếng Anh</h3><p class="mute">'+fw.tod+' · Thời tiết: '+fw.w+' · Thu hoạch: '+e.farm.harvests+' · Vật nuôi: '+e.farm.pets.length+' · Trang trí: '+e.farm.decor.length+'</p></div>'
  +'<div class="v15farm-mascot">'+OLLIE_SVG+'<span>Ollie: “Học từ mới để gieo hạt, trả lời đúng để tưới cây!”</span></div></div>'
  +'<p class="mute">Gieo hạt = học một từ mới · Tưới cây = trả lời đúng trong bất kỳ chế độ học nào · Cây lên 5 giai đoạn theo hộp nhớ (box) của từ · Thu hoạch khi cây đạt giai đoạn 4–5 và đã tưới ít nhất 2 lần — phải trả lời đúng từ đó mới thu hoạch được.</p>'
  +'<div class="v15plots" id="v15plots"></div>'
  +'<div class="v15farm-animals"><b>Vật nuôi của bạn:</b> '+(e.farm.pets.length?e.farm.pets.map(function(id){var p=FARM_PETS.filter(function(x){return x.id===id})[0];return p?'<img src="'+p.img+'" title="'+esc(p.n)+'" alt="'+esc(p.n)+'">':''}).join(''):'<span class="mute">Chưa có — mua ở cửa hàng bên dưới bằng XP bạn kiếm được.</span>')+'</div>'
  +'<div class="v15farm-animals"><b>Trang trí:</b> '+(e.farm.decor.length?e.farm.decor.map(function(id){var d=FARM_DECOR.filter(function(x){return x.id===id})[0];return d?'<img src="'+d.img+'" title="'+esc(d.n)+'" alt="'+esc(d.n)+'">':''}).join(''):'<span class="mute">Chưa có.</span>')+'</div>'
  +'<h3>Cửa hàng nông trại (trả bằng XP — chung ví với game gốc)</h3><p class="mute">Bạn có <b>'+coins15()+' XP</b>. Mua bằng XP sẽ trừ vào ví chung (S.spent), giống cửa hàng V6.</p>'
  +'<div class="v15shop">'+FARM_PETS.map(function(p){var own=e.farm.pets.indexOf(p.id)>=0;return '<div class="v15shop-it"><img src="'+p.img+'" alt=""><b>'+esc(p.n)+'</b><span>'+p.p+' XP</span>'+(own?'<em>Đã có</em>':'<button class="btn sm '+(coins15()>=p.p?'pri':'')+'" '+(coins15()>=p.p?'':'disabled')+' onclick="__v15.farmBuy(\'pet\',\''+p.id+'\','+p.p+')">Mua</button>')+'</div>'}).join('')
  +FARM_DECOR.map(function(d){var own=e.farm.decor.indexOf(d.id)>=0;return '<div class="v15shop-it"><img src="'+d.img+'" alt=""><b>'+esc(d.n)+'</b><span>'+d.p+' XP</span>'+(own?'<em>Đã có</em>':'<button class="btn sm '+(coins15()>=d.p?'pri':'')+'" '+(coins15()>=d.p?'':'disabled')+' onclick="__v15.farmBuy(\'decor\',\''+d.id+'\','+d.p+')">Mua</button>')+'</div>'}).join('')+'</div>'
  +'</div>';
  return h;
}
function renderFarmPlots(){
  var host=$('#v15plots');if(!host)return;
  var e=en15();
  host.innerHTML=e.farm.plots.map(function(p,i){
    var st=farmStage(p);
    if(st<0)return '<div class="v15plot empty" onclick="__v15.farmPlant('+i+')"><span class="v15plot-emoji">🌱</span><b>Luống trống</b><span>Bấm để gieo hạt (học từ mới)</span></div>';
    var w=BYID[p.wordId];
    var crop=CROPS[i%CROPS.length];
    var img='assets/crops/'+crop+'_'+Math.min(4,st)+'.png';
    var ripe=st>=4&&p.water>=2;
    return '<div class="v15plot '+(ripe?'ripe':'')+'" onclick="__v15.farmPlotTap('+i+')"><img src="'+img+'" alt="" onerror="this.style.display=\'none\'"><b>'+esc(w.en)+'</b><span>'+esc(w.vi)+' · giai đoạn '+st+'/5 · tưới '+p.water+' lần</span>'+(ripe?'<em>Đã chín — bấm để thu hoạch!</em>':'<em>Bấm để xem từ</em>')+'</div>';
  }).join('');
  var q=$('#v15farmquiz');if(q&&FARM_QUIZ)q.innerHTML=farmQuizHTML();
}
var FARM_QUIZ=null;
function farmPlant(i){
  var e=en15();
  var news=wordsFiltered({level:en15().level,topic:en15().topic,onlyNew:true});
  if(!news.length)news=wordsFiltered({level:'ALL',onlyNew:true});
  if(!news.length){pop15('Bạn đã học hết từ mới ở cấp độ này!');return}
  var w=shuffle(news)[0];
  e.farm.plots[i]={wordId:w.id,water:0,planted:Date.now()};
  save15();pop15('Đã gieo hạt: '+w.en+' — học từ này để cây lớn lên!');
  renderTab();
}
function farmPlotTap(i){
  var e=en15(),p=e.farm.plots[i];if(!p||!p.wordId)return;
  var w=BYID[p.wordId],st=farmStage(p);
  if(st>=4&&p.water>=2){
    var opts=shuffle([w].concat(distractors(w,3)));
    FARM_QUIZ={plot:i,w:w,opts:opts,answered:null,ok:null};
    var host=$('#v15plots');
    var d=document.createElement('div');d.id='v15farmquiz';d.className='v15farmquiz';
    if(host&&host.parentNode)host.parentNode.insertBefore(d,host.nextSibling);
    d.innerHTML=farmQuizHTML();
    d.scrollIntoView({block:'nearest'});
  }else{
    pop15(w.en+' — '+w.vi+' · '+w.ipa+' · giai đoạn '+st+'/5, đã tưới '+p.water+' lần. Trả lời đúng để tưới thêm!');
    speak15(w.en);
  }
}
function farmQuizHTML(){
  var q=FARM_QUIZ;if(!q)return '';
  var w=q.w;
  var h='<h3>Thu hoạch: '+esc(w.en)+'?</h3><p class="mute">Trả lời đúng nghĩa của từ này để thu hoạch cây.</p><div class="v15opts">'
  +q.opts.map(function(o,idx){
    var cl='';if(q.answered!==null)cl=(o.id===w.id?'right':(o.id===q.answered?'wrong':''));
    return '<button class="v15opt '+cl+'" '+(q.answered!==null?'disabled':'')+' onclick="__v15.farmQuizPick(\''+o.id+'\')">'+esc(o.vi)+'</button>';
  }).join('')+'</div>';
  if(q.answered!==null){
    h+=q.ok?'<p style="color:var(--ok)"><b>Thu hoạch thành công! +25 XP.</b></p>':'<p style="color:var(--bad)">Chưa đúng — cây vẫn ở đó, hãy ôn từ này rồi thử lại.</p>';
    h+='<div class="acts"><button class="btn" onclick="__v15.farmQuizClose()">Đóng</button></div>';
  }
  return h;
}
function farmQuizPick(id){
  var q=FARM_QUIZ;if(!q||q.answered!==null)return;
  q.answered=id;q.ok=(id===q.w.id);
  if(q.ok){
    var e=en15();
    mark15(true,q.w,'farm');
    e.farm.plots[q.plot]={wordId:'',water:0,planted:0};
    e.farm.harvests++;
    gain15(25);
    if(e.farm.harvests%3===0){S.v7.gems=(S.v7.gems||0)+1;pop15('Thu hoạch lần thứ '+e.farm.harvests+'! +25 XP, +1 💎')}
    save15();sfx15('win');
    setTimeout(function(){FARM_QUIZ=null;renderTab()},1200);
  }else{
    mark15(false,q.w,'farm');save15();
  }
  var d=$('#v15farmquiz');if(d)d.innerHTML=farmQuizHTML();
}
function farmQuizClose(){FARM_QUIZ=null;var d=$('#v15farmquiz');if(d)d.remove();renderTab()}
function farmBuy(kind,id,price){
  var e=en15();
  if(coins15()<price){pop15('Chưa đủ XP.');return}
  if(kind==='pet'&&e.farm.pets.indexOf(id)>=0)return;
  if(kind==='decor'&&e.farm.decor.indexOf(id)>=0)return;
  S.spent=(S.spent||0)+price;
  if(kind==='pet')e.farm.pets.push(id);else e.farm.decor.push(id);
  save15();sfx15('win');pop15('Đã mua!');renderTab();
}

/* ---------- 10 ENGLISH BOSSES ---------- */
var BOSSES=[
{id:'slime',n:'Vocabulary Slime',vi:'Nhớt từ vựng',img:'assets/bosses/dokkaebi.png',hp:60,mode:'mc',skill:'Không có kỹ năng đặc biệt — boss làm quen.',reward:{xp:40,gems:1,item:'Slime Badge'}},
{id:'goblin',n:'Spelling Goblin',vi:'Yêu tinh chính tả',img:'assets/bosses/gangsi.png',hp:70,mode:'type',skill:'Đồng hồ 12 giây / câu — hết giờ tính là sai.',reward:{xp:50,gems:1,item:'Goblin Hat'}},
{id:'dragon',n:'Grammar Dragon',vi:'Rồng ngữ pháp',img:'assets/bosses/gongnyong.png',hp:90,mode:'grammar',skill:'Đồng hồ 10 giây / câu khi HP dưới 50%.',reward:{xp:60,gems:2,item:'Dragon Scale'}},
{id:'ghost',n:'Listening Ghost',vi:'Ma nghe hiểu',img:'assets/bosses/gwisin.png',hp:80,mode:'listen',skill:'Chỉ được nghe 1 lần duy nhất mỗi câu.',reward:{xp:60,gems:2,item:'Ghost Lantern'}},
{id:'spider',n:'Sentence Spider',vi:'Nhện xếp câu',img:'assets/bosses/f4_treant.png',hp:90,mode:'builder',skill:'Câu bị xáo trộn hoàn toàn — chọn câu đúng trong 4 đáp án.',reward:{xp:60,gems:2,item:'Spider Silk'}},
{id:'owl',n:'Reading Owl',vi:'Cú đọc hiểu',img:'assets/bosses/astral_raven.png',hp:100,mode:'read',skill:'Đọc đoạn văn rồi trả lời 2 câu hỏi liên tiếp.',reward:{xp:70,gems:2,item:'Owl Feather'}},
{id:'tiger',n:'Speed Tiger',vi:'Hổ tốc độ',img:'assets/bosses/thunder_tiger.png',hp:100,mode:'speed',skill:'Đồng hồ 8 giây / câu, sát thương của bạn x1.5.',reward:{xp:70,gems:2,item:'Tiger Claw'}},
{id:'wizard',n:'Pronunciation Wizard',vi:'Phù thủy phát âm',img:'assets/bosses/yong.png',hp:110,mode:'speak',skill:'Nói đúng từ để gây sát thương. Không có micro? Dùng chế độ nghe-chọn thay thế.',reward:{xp:80,gems:3,item:'Wizard Wand'}},
{id:'dictionary',n:'Dark Dictionary',vi:'Từ điển bóng tối',img:'assets/bosses/crystal_beetle_king.png',hp:130,mode:'mixed',skill:'Câu hỏi trộn mọi kỹ năng, độ khó tăng dần.',reward:{xp:90,gems:3,item:'Dark Page'}},
{id:'king',n:'English King',vi:'Vua tiếng Anh',img:'assets/bosses/coral_queen.png',hp:160,mode:'mixed',skill:'Boss cuối: trộn mọi kỹ năng + đồng hồ 12 giây. Cần thắng 9 boss trước.',reward:{xp:150,gems:5,item:'English Crown'}}
];
var B=null;
function bossUnlocked(i){
  if(i===0)return true;
  if(BOSSES[i].id==='king')return BOSSES.slice(0,9).every(function(b){return en15().bosses[b.id]&&en15().bosses[b.id].win});
  return !!(en15().bosses[BOSSES[i-1].id]&&en15().bosses[BOSSES[i-1].id].win);
}
function bossesHTML(){
  var e=en15();
  return '<h3>English Bosses — 10 boss tiếng Anh</h3><p class="mute">Trả lời đúng để tấn công (combo tăng sát thương, 10% chí mạng x2). Trả lời sai mất 1 tim. Thắng nhận XP, 💎 và vật phẩm riêng. Boss mở khóa theo thứ tự.</p>'
  +'<div class="v15bosses">'+BOSSES.map(function(b,i){
    var done=e.bosses[b.id]&&e.bosses[b.id].win;
    var un=bossUnlocked(i);
    return '<div class="v15boss '+(done?'done':'')+'"><img src="'+b.img+'" alt="" onerror="this.style.display=\'none\'"><b>'+(i+1)+'. '+esc(b.n)+'</b><span>'+esc(b.vi)+' · HP '+b.hp+' · '+esc(b.skill)+'</span>'+(window.__v34&&__v34.weakChipHTML?__v34.weakChipHTML(b):'')+'<span>Thưởng: +'+b.reward.xp+' XP, +'+b.reward.gems+' 💎, '+esc(b.reward.item)+'</span>'
    +(done?'<em>Đã thắng ✓ — '+esc(b.reward.item)+' đã nhận</em>':(un?'<button class="btn pri" onclick="__v15.bossFight(\''+b.id+'\')">Khiêu chiến</button>':'<em>🔒 Thắng boss trước để mở khóa</em>'))+'</div>';
  }).join('')+'</div>'+(window.__v18&&__v18.arenasHTML?__v18.arenasHTML():'')+'<div id="v15bossfight"></div>';
}
function bossFight(id){
  var b=BOSSES.filter(function(x){return x.id===id})[0];if(!b)return;
  var idx=BOSSES.indexOf(b);
  if(!bossUnlocked(idx)){pop15('Boss này chưa mở khóa.');return}
  B={boss:b,hp:b.hp,maxHp:b.hp,hearts:3,combo:0,score:0,q:0,skillUsed:false,over:null};
  /* V34: Boss Weakness — per-fight state only (no save change). */
  try{if(window.__v34){B.weak=__v34.weakFor(b,'en');B.brk=0;B.brkMax=3}}catch(e){}
  nextBossQ();
  renderBossFight();
}
function bossPool(mode){
  if(mode==='grammar')return shuffle((window.__V15_DATA.grammar||[])).slice(0,12);
  if(mode==='read')return shuffle((window.__V15_DATA.reading||[])).slice(0,4);
  if(mode==='builder')return shuffle((window.__V15_DATA.builder||[])).slice(0,12);
  return shuffle(wordsFiltered({level:'ALL'})).slice(0,14);
}
function nextBossQ(){
  if(!B)return;
  var mode=B.boss.mode==='mixed'?['mc','grammar','listen','builder'][B.q%4]:B.boss.mode;
  B.qmode=mode;
  if(!B.pools)B.pools={grammar:shuffle((window.__V15_DATA.grammar||[])),read:shuffle((window.__V15_DATA.reading||[])),builder:shuffle((window.__V15_DATA.builder||[])),words:shuffle(wordsFiltered({level:'ALL'}))};
  var P=B.pools;
  if(mode==='grammar'){B.cur={g:P.grammar[B.q%P.grammar.length]}}
  else if(mode==='read'){var p=P.read[B.q%P.read.length];B.cur={p:p,q:p.qs[B.q%p.qs.length]}}
  else if(mode==='builder'){var s=P.builder[B.q%P.builder.length];var toks=s.s.replace(/([.!?])$/,'').split(' ');var wrong=[];for(var k=0;k<3;k++){var sh=shuffle(toks);if(sh.join(' ')!==toks.join(' '))wrong.push(sh.join(' ')+' .')}while(wrong.length<3)wrong.push(shuffle(toks).join(' ')+' .');B.cur={s:s,opts:shuffle([s.s].concat(wrong))}}
  else if(mode==='speak'){var w=(window.__v34&&__v34.weakPick?__v34.weakPick(B,P.words,P.words[B.q%P.words.length]):P.words[B.q%P.words.length]);B.cur={w:w,opts:shuffle([w].concat(distractors(w,3)))}}
  else{var w2=(window.__v34&&__v34.weakPick?__v34.weakPick(B,P.words,P.words[B.q%P.words.length]):P.words[B.q%P.words.length]);var opts=shuffle([w2].concat(distractors(w2,3)));B.cur={w:w2,opts:opts,optsVi:shuffle([w2].concat(distractors(w2,3)))}}
  B.answered=null;B.ok=null;
  startBossTimer();
}
function startBossTimer(){
  if(B.timer){clearInterval(B.timer);B.timer=null}
  var limit=0;
  if(B.boss.id==='goblin')limit=12;
  else if(B.boss.id==='dragon'&&B.hp<=B.maxHp/2)limit=10;
  else if(B.boss.id==='tiger')limit=8;
  else if(B.boss.id==='king')limit=12;
  if(!limit)return;
  B.left=limit;
  B.timer=setInterval(function(){
    B.left--;
    var t=$('#v15boss-t');if(t)t.textContent=B.left+'s';
    if(B.left<=0){clearInterval(B.timer);B.timer=null;bossAnswer(false,true)}
  },1000);
}
function renderBossFight(){
  var host=$('#v15bossfight');if(!host)return;
  if(!B){host.innerHTML='';return}
  var b=B.boss;
  var h='<div class="v15fight '+(B.shake?'shake':'')+'">'
  +'<div class="v15fight-top"><img class="v15boss-img '+(B.hit?'hit':'')+'" src="'+b.img+'" alt=""><div class="v15fight-info"><b>'+esc(b.n)+'</b><span>'+esc(b.vi)+' · '+esc(b.skill)+'</span>'
  +'<div class="v15hpbar"><i style="width:'+Math.max(0,B.hp/B.maxHp*100)+'%"></i></div><span>HP '+Math.max(0,B.hp)+'/'+B.maxHp+'</span>'+(window.__v34&&__v34.breakBarHTML?__v34.breakBarHTML(B):'')
  +'<div class="v15hearts">Tim của bạn: '+'♥'.repeat(B.hearts)+'♡'.repeat(Math.max(0,3-B.hearts))+' · Combo x'+B.combo+' · Đúng '+B.score+'</div>'
  +(B.left?'<div class="mute">Còn <span id="v15boss-t">'+B.left+'s</span></div>':'')
  +'</div></div>';
  if(B.over){
    h+='<div class="v15done"><div class="v15done-big">'+(B.over==='win'?'CHIẾN THẮNG!':'Thua rồi…')+'</div><p>'+(B.over==='win'?'Bạn đã đánh bại '+esc(b.n)+'! +'+b.reward.xp+' XP, +'+b.reward.gems+' 💎, vật phẩm: <b>'+esc(b.reward.item)+'</b>.':'Boss còn '+Math.max(0,B.hp)+' HP. Hãy luyện thêm rồi quay lại!')+'</p><div class="acts"><button class="btn pri" onclick="__v15.bossFight(\''+b.id+'\')">Đánh lại</button><button class="btn" onclick="__v15.bossClose()">Đóng</button></div></div>';
  }else{
    h+=bossQHTML();
  }
  h+='</div>';
  host.innerHTML=h;
  var img=host.querySelector('.v15boss-img');if(img&&B.hit){setTimeout(function(){if(!B)return;B.hit=false;var hh=$('#v15bossfight');if(hh)renderBossFight()},450)}
}
function bossQHTML(){
  var c=B.cur,mode=B.qmode;
  if(mode==='grammar'){
    var g=c.g;
    return '<div class="v15qcard"><div class="v15qword small">'+esc(g.q)+'</div></div><div class="v15opts">'+g.o.map(function(o,i){
      var cl='';if(B.answered!==null)cl=(i===g.a?'right':(i===B.answered?'wrong':''));
      return '<button class="v15opt '+cl+'" '+(B.answered!==null?'disabled':'')+' onclick="__v15.bossPick('+i+')">'+esc(o)+'</button>';
    }).join('')+'</div>'+bossFeedback(g.ex);
  }
  if(mode==='read'){
    var q=c.q;
    return '<div class="v15passage"><b>'+esc(c.p.title)+'</b><p>'+esc(c.p.text)+'</p></div><div class="v15qcard"><div class="v15qword small">'+esc(q.q)+'</div></div><div class="v15opts">'+q.o.map(function(o,i){
      var cl='';if(B.answered!==null)cl=(i===q.a?'right':(i===B.answered?'wrong':''));
      return '<button class="v15opt '+cl+'" '+(B.answered!==null?'disabled':'')+' onclick="__v15.bossPick('+i+')">'+esc(o)+'</button>';
    }).join('')+'</div>'+bossFeedback('');
  }
  if(mode==='builder'){
    return '<div class="v15qcard"><div class="v15qword small">Chọn câu đúng · Nghĩa: '+esc(c.s.vi)+'</div></div><div class="v15opts">'+c.opts.map(function(o,i){
      var cl='';if(B.answered!==null)cl=(o===c.s.s?'right':(i===B.answered?'wrong':''));
      return '<button class="v15opt '+cl+'" '+(B.answered!==null?'disabled':'')+' onclick="__v15.bossPick('+i+')">'+esc(o)+'</button>';
    }).join('')+'</div>'+bossFeedback('');
  }
  if(mode==='speak'){
    var w=c.w,supported=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
    var h='<div class="v15qcard"><div class="v15qword">'+esc(w.en)+'</div><div class="mute">'+esc(w.ipa)+' · '+esc(w.vi)+'</div><div class="acts"><button class="btn sm" onclick="__v15.speakWord(\''+w.id+'\')">Nghe mẫu</button></div></div>';
    if(supported){
      h+='<p class="mute">Bấm “Nói” và đọc to từ trên. Máy sẽ so khớp phát âm của bạn.</p><div class="acts"><button class="btn pri" onclick="__v15.bossSpeak()">Nói</button></div>';
      if(B.heard)h+='<div class="v15explain">Máy nghe được: “<b>'+esc(B.heard)+'</b>”</div>';
    }else{
      h+='<div class="v15warn"><b>Trình duyệt không hỗ trợ nhận dạng giọng nói.</b> Chế độ thay thế: nghe mẫu rồi chọn từ bạn nghe được — không chấm điểm phát âm.</div><div class="v15opts">'+c.opts.map(function(o,i){
        var cl='';if(B.answered!==null)cl=(o.id===w.id?'right':(i===B.answered?'wrong':''));
        return '<button class="v15opt '+cl+'" '+(B.answered!==null?'disabled':'')+' onclick="__v15.bossPick('+i+')">'+esc(o.en)+'</button>';
      }).join('')+'</div>';
      /* for fallback, options are words; bossPick handles speak mode via opts */
      B.cur.opts=c.opts;
    }
    h+=bossFeedback('');
    return h;
  }
  /* listen + mc + type-as-mc */
  var w2=c.w;
  if(mode==='listen'){
    return '<div class="v15qcard"><div class="v15qword">Nghe</div><div class="acts"><button class="btn pri" onclick="__v15.speakWord(\''+w2.id+'\')">Nghe phát âm (1 lần)</button></div></div><div class="v15opts">'+c.opts.map(function(o,i){
      var cl='';if(B.answered!==null)cl=(o.id===w2.id?'right':(i===B.answered?'wrong':''));
      return '<button class="v15opt '+cl+'" '+(B.answered!==null?'disabled':'')+' onclick="__v15.bossPick('+i+')">'+esc(o.en)+'</button>';
    }).join('')+'</div>'+bossFeedback('');
  }
  /* type (Spelling Goblin): show Vietnamese, choose the correct English spelling */
  if(mode==='type'){
    return '<div class="v15qcard"><div class="v15qword vi">'+esc(w2.vi)+'</div><div class="mute">Chọn cách viết đúng của từ này</div></div><div class="v15opts">'+c.opts.map(function(o,i){
      var cl='';if(B.answered!==null)cl=(o.id===w2.id?'right':(i===B.answered?'wrong':''));
      return '<button class="v15opt '+cl+'" '+(B.answered!==null?'disabled':'')+' onclick="__v15.bossPick('+i+')">'+esc(o.en)+'</button>';
    }).join('')+'</div>'+bossFeedback('');
  }
  return '<div class="v15qcard"><div class="v15qword">'+esc(w2.en)+'</div><div class="mute">'+esc(w2.ipa)+' · Chọn nghĩa đúng</div></div><div class="v15opts">'+c.optsVi.map(function(o,i){
    var cl='';if(B.answered!==null)cl=(o.id===w2.id?'right':(i===B.answered?'wrong':''));
    return '<button class="v15opt '+cl+'" '+(B.answered!==null?'disabled':'')+' onclick="__v15.bossPick('+i+')">'+esc(o.vi)+'</button>';
  }).join('')+'</div>'+bossFeedback('');
}
function bossFeedback(ex){
  if(B.answered===null)return '';
  var h='<div class="v15explain" style="color:var(--'+(B.ok?'ok':'bad')+')">'+(B.ok?'Đòn đánh trúng!':'Boss phản công!')+(ex?' <span class="mute">'+esc(ex)+'</span>':'')+'</div><div class="acts"><button class="btn pri" onclick="__v15.bossNext()">Tiếp tục</button></div>';
  return h;
}
function bossPick(i){
  if(!B||B.answered!==null||B.over)return;
  var mode=B.qmode,ok=false;
  if(mode==='grammar')ok=(i===B.cur.g.a);
  else if(mode==='read')ok=(i===B.cur.q.a);
  else if(mode==='builder')ok=(B.cur.opts[i]===B.cur.s.s);
  else if(mode==='speak')ok=(B.cur.opts[i].id===B.cur.w.id);
  else if(mode==='type')ok=(B.cur.opts[i].id===B.cur.w.id);
  else if(mode==='listen')ok=(B.cur.opts[i].id===B.cur.w.id);
  else ok=(B.cur.optsVi[i].id===B.cur.w.id);
  bossAnswer(ok,false);
}
function bossAnswer(ok,timeout){
  if(!B||B.answered!==null)return;
  if(B.timer){clearInterval(B.timer);B.timer=null}
  B.answered=timeout?'timeout':1;B.ok=ok;
  if(ok){
    B.combo++;B.score++;
    var crit=Math.random()<0.1;
    var dmg=12+B.combo*2;if(B.boss.id==='tiger')dmg=Math.round(dmg*1.5);if(crit)dmg*=2;
    try{B._breakNote='';if(window.__v34){var _bb34=__v34.breakDmg(B);if(_bb34>0){dmg+=_bb34;B._breakNote='💥 BREAK! Điểm yếu bị phá vỡ! +'+_bb34+' sát thương!';}}}catch(e){}
    B.hp-=dmg;B.hit=true;
    if(B.cur.w)mark15(true,B.cur.w,'boss');
    sfx15('ok');pop15((crit?'CHÍ MẠNG! -':'-')+dmg+' HP'+(B._breakNote?' · '+B._breakNote:''));
  }else{
    B.combo=0;B.hearts--;B.shake=true;
    if(B.cur.w)mark15(false,B.cur.w,'boss');
    sfx15('bad');
    setTimeout(function(){if(B)B.shake=false},500);
  }
  if(B.hp<=0){B.over='win';B.hp=0;bossWin()}
  else if(B.hearts<=0){B.over='lose';sfx15('lose')}
  save15();renderBossFight();
}
function bossWin(){
  var b=B.boss,e=en15();
  e.bosses[b.id]={win:1,item:b.reward.item,at:Date.now()};
  gain15(b.reward.xp);
  S.v7.gems=(S.v7.gems||0)+b.reward.gems;
  save15();sfx15('win');
}
function bossNext(){
  if(!B||B.over)return;
  B.q++;nextBossQ();renderBossFight();
}
function bossClose(){if(B&&B.timer)clearInterval(B.timer);B=null;renderTab()}
function bossSpeak(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR||!B)return;
  var w=B.cur.w;
  var rec=new SR();rec.lang='en-US';rec.interimResults=false;rec.maxAlternatives=3;
  try{rec.start()}catch(e){return}
  rec.onresult=function(ev){
    var heard='';try{heard=ev.results[0][0].transcript||''}catch(e){}
    B.heard=heard;
    var ok=norm(heard)===norm(w.en)||norm(heard).indexOf(norm(w.en))>=0;
    bossAnswer(ok,false);
  };
  rec.onerror=function(){B.heard='(không nghe được)';renderBossFight()};
}

/* ---------- SRS REVIEW ---------- */
var R=null;
function reviewHTML(){
  var e=en15(),now=Date.now();
  /* V17: khi đang chọn một bộ từ trong Thư viện, chỉ đếm/ôn từ trong bộ đó */
  var due=WORDS.filter(function(w){return inScope15(w)&&(e.due[w.id]||0)<=now});
  var weak=WORDS.filter(function(w){var o=enOld();return inScope15(w)&&(o.wrong[w.id]||0)>(o.right[w.id]||0)}).slice(0,10);
  var h='<h3>Ôn tập thông minh (Spaced Repetition)</h3>'
  +'<p class="mute">Từ trả lời sai quay lại sau 10 phút. Từ đã thuộc được giãn dần: 1 → 3 → 7 → 14 → 30 ngày. Ôn tập ở đây dùng dữ liệu tiếng Anh riêng, không chạm tới từ tiếng Hàn.</p>'
  +'<div class="v15statgrid"><div class="v15stat"><b>'+due.length+'</b><span>từ cần ôn hôm nay</span></div><div class="v15stat"><b>'+weak.length+'</b><span>từ yếu (sai &gt; đúng)</span></div><div class="v15stat"><b>'+counts15().mastered+'</b><span>từ đã thuộc</span></div></div>'
  +'<div class="acts"><button class="btn pri" onclick="__v15.reviewStart(false)">Ôn tất cả từ cần ôn ('+due.length+')</button><button class="btn" onclick="__v15.reviewStart(true)">Chỉ ôn từ yếu ('+weak.length+')</button></div>'
  +'<div id="v15review"></div>'
  +(weak.length?'<h3>Từ yếu nhất</h3><div class="v15rows">'+weak.map(function(w){var o=enOld();return '<div class="v15row"><b>'+esc(w.en)+'</b><span class="mute">'+esc(w.vi)+' · sai '+(o.wrong[w.id]||0)+' · đúng '+(o.right[w.id]||0)+'</span><button class="btn sm" onclick="__v15.speakWord(\''+w.id+'\')">Nghe</button></div>'}).join('')+'</div>':'');
  return h;
}
function reviewStart(weakOnly){
  var e=en15(),now=Date.now();
  var list;
  /* V17: khi đang chọn một bộ từ trong Thư viện, chỉ ôn từ trong bộ đó */
  if(weakOnly)list=WORDS.filter(function(w){var o=enOld();return inScope15(w)&&(o.wrong[w.id]||0)>(o.right[w.id]||0)});
  else list=WORDS.filter(function(w){return inScope15(w)&&(e.due[w.id]||0)<=now});
  if(!list.length){pop15(weakOnly?'Không có từ yếu nào. Tuyệt vời!':'Không có từ nào cần ôn hôm nay.');return}
  R={list:shuffle(list).slice(0,10),idx:0,score:0,cur:null,answered:null,ok:null};
  reviewNextQ();
  renderReview();
}
function reviewNextQ(){
  var w=R.list[R.idx];if(!w){R.cur=null;return}
  R.cur={w:w,opts:shuffle([w].concat(distractors(w,3)))};R.answered=null;R.ok=null;
}
function renderReview(){
  var host=$('#v15review');if(!host)return;
  if(!R){host.innerHTML='';return}
  if(R.idx>=R.list.length){
    host.innerHTML='<div class="v15done"><div class="v15done-big">Xong buổi ôn!</div><p>Đúng <b>'+R.score+'/'+R.list.length+'</b> · +'+(R.score*2)+' XP.</p><div class="acts"><button class="btn" onclick="__v15.reviewClose()">Đóng</button></div></div>';
    gain15(R.score*2);save15();return;
  }
  var c=R.cur,w=c.w;
  host.innerHTML='<div class="v15qcard"><div class="v15qword">'+esc(w.en)+'</div><div class="mute">'+esc(w.ipa)+' · câu '+(R.idx+1)+'/'+R.list.length+'</div><div class="acts"><button class="btn sm" onclick="__v15.speakWord(\''+w.id+'\')">Nghe</button></div></div>'
  +'<div class="v15opts">'+c.opts.map(function(o,i){
    var cl='';if(R.answered!==null)cl=(o.id===w.id?'right':(o.id===R.answered?'wrong':''));
    return '<button class="v15opt '+cl+'" '+(R.answered!==null?'disabled':'')+' onclick="__v15.reviewPick(\''+o.id+'\')">'+esc(o.vi)+'</button>';
  }).join('')+'</div>'
  +(R.answered!==null?'<div class="v15explain" style="color:var(--'+(R.ok?'ok':'bad')+')">'+(R.ok?'Chính xác!':'Chưa đúng. Đáp án: <b>'+esc(w.vi)+'</b>')+'</div><div class="acts"><button class="btn pri" onclick="__v15.reviewNext()">Câu tiếp →</button></div>':'');
}
function reviewPick(id){
  if(!R||R.answered!==null)return;
  R.answered=id;R.ok=(id===R.cur.w.id);
  mark15(R.ok,R.cur.w,'review');if(R.ok)R.score++;
  renderReview();
}
function reviewNext(){R.idx++;reviewNextQ();renderReview()}
function reviewClose(){R=null;renderTab()}

/* ---------- STATS ---------- */
function statsHTML(){
  var c=counts15(),e=en15();
  var lvRows=['A1','A2','B1','B2'].map(function(lv){
    var tot=WORDS.filter(function(w){return w.lv===lv}).length;
    var mas=WORDS.filter(function(w){return w.lv===lv&&isMastered(w)}).length;
    var pct=tot?Math.round(mas/tot*100):0;
    return '<div class="v15lvrow"><span>'+lv+'</span><div class="v15bar"><i style="width:'+pct+'%"></i></div><span>'+mas+'/'+tot+' ('+pct+'%)</span></div>';
  }).join('');
  return '<h3>Thống kê tiếng Anh</h3>'
  +'<div class="v15statgrid"><div class="v15stat"><b>'+c.total+'</b><span>tổng số từ</span></div><div class="v15stat"><b>'+c['new']+'</b><span>từ mới</span></div><div class="v15stat"><b>'+c.learning+'</b><span>đang học</span></div><div class="v15stat"><b>'+c.mastered+'</b><span>đã thuộc</span></div><div class="v15stat"><b>'+c.due+'</b><span>cần ôn hôm nay</span></div><div class="v15stat"><b>'+e.daily.correct+'/'+(e.daily.correct+e.daily.wrong)+'</b><span>đúng hôm nay</span></div></div>'
  +'<h3>Tiến bộ theo cấp độ</h3>'+lvRows
  +'<h3>7 ngày gần nhất (số câu đúng / tổng câu)</h3><div class="v15chart" id="v15chart"></div>'
  +'<h3>Chế độ đã chơi</h3><div class="v15rows">'+MODES.map(function(m){var b=e.modeBest[m.id];return '<div class="v15row"><b>'+m.n+'</b><span class="mute">'+(b?('đã chơi '+b.played+' · đúng '+b.correct+' · kỷ lục '+(b.best||0)):'chưa chơi')+'</span></div>'}).join('')+'</div>'
  +'<h3>Boss đã thắng</h3><p class="mute">'+BOSSES.filter(function(b){return e.bosses[b.id]&&e.bosses[b.id].win}).map(function(b){return esc(b.n)}).join(' · ')+'</p>';
}
function drawChart(){
  var host=$('#v15chart');if(!host)return;
  var e=en15(),dn=dayNo(),cells=[];
  for(var i=6;i>=0;i--){
    var d=dn-i,h=e.hist[d]||{c:0,t:0};
    var dt=new Date((d*864e5)+new Date().getTimezoneOffset()*6e4);
    var label=(dt.getDate())+'/'+(dt.getMonth()+1);
    var pct=h.t?Math.round(h.c/h.t*100):0;
    cells.push('<div class="v15chart-col"><div class="v15chart-bar" style="height:'+Math.max(4,Math.min(100,h.t*8))+'px" title="'+h.c+'/'+h.t+' đúng"></div><b>'+h.c+'</b><span>'+label+'</span></div>');
  }
  host.innerHTML=cells.join('')+'<p class="mute">Cột cao = nhiều câu đã trả lời. Số trên cột = số câu đúng trong ngày.</p>';
}

/* ---------- VOCAB MANAGER ---------- */
var VQ='';var VDECK='';
function vocabDeckOptions(){
  if(!window.__v16) return '';
  var decks=[]; try{ decks=(S.v7.en16&&S.v7.en16.decks)||[]; }catch(e){}
  if(!decks.length) return '';
  return '<select class="v15sel" onchange="__v15.vocabDeckFilter(this.value)"><option value="">Mọi bộ từ</option><option value="__none"'+(VDECK==='__none'?' selected':'')+'>Chưa xếp bộ</option>'
    +decks.map(function(d){ return '<option value="'+d.id+'"'+(VDECK===d.id?' selected':'')+'>'+esc(d.name)+'</option>'; }).join('')+'</select>';
}
function vocabHTML(){
  var e=en15();
  var q=VQ.toLowerCase();
  var dm16={}; try{ dm16=(S.v7.en16&&S.v7.en16.map)||{}; }catch(err){}
  var list=WORDS.filter(function(w){
    if(e.level!=='ALL'&&w.lv!==e.level)return false;
    if(e.topic&&w.t!==e.topic)return false;
    if(VDECK){ if(VDECK==='__none'){ if(dm16[w.id])return false; } else if((dm16[w.id]||'')!==VDECK)return false; }
    if(!q)return true;
    return w.en.toLowerCase().indexOf(q)>=0||w.vi.toLowerCase().indexOf(q)>=0||w.t.toLowerCase().indexOf(q)>=0;
  });
  var shown=list.slice(0,60);
  var h='<h3>Từ vựng tiếng Anh — '+WORDS.length+' từ</h3><p class="mute">Từ có sẵn chỉ xem; từ bạn thêm mới được sửa / xóa. Nhập — xuất CSV / JSON ở cuối trang.</p>'
  +levelTopicBar()
  +'<input class="v15input" type="text" placeholder="Tìm từ tiếng Anh, nghĩa, chủ đề…" value="'+esc(VQ)+'" oninput="__v15.vocabSearch(this.value)">'
  +vocabDeckOptions()
  +'<div class="v15rows">'+shown.map(function(w){
    var o=enOld();
    return '<div class="v15row"><div><b>'+esc(w.en)+'</b> <span class="mute">'+esc(w.ipa)+' · '+esc(w.pos)+' · '+esc(w.lv)+' · '+esc(topicName(w.t))+'</span><br><span>'+esc(w.vi)+'</span>'+(w.ex?'<br><span class="mute">“'+esc(w.ex)+'”</span>':'')+'</div><div class="v15rowst">hộp '+(o.box[w.id]||0)+'/5 · đúng '+(o.right[w.id]||0)+' · sai '+(o.wrong[w.id]||0)+'</div>'
    +(w.custom?'<button class="btn sm" onclick="__v15.vocabEdit(\''+w.id+'\')">Sửa</button><button class="btn sm bad" onclick="__v15.vocabDel(\''+w.id+'\')">Xóa</button>':'')
    +'<button class="btn sm" onclick="__v15.speakWord(\''+w.id+'\')">Nghe</button></div>';
  }).join('')+'</div>'
  +(list.length>60?'<p class="mute">Đang hiện 60/'+list.length+' từ — hãy thu hẹp bằng tìm kiếm hoặc bộ lọc.</p>':'')
  +'<h3>Thêm từ mới</h3><div class="v15add">'
  +'<input id="v15-a-en" placeholder="Từ tiếng Anh *"><input id="v15-a-vi" placeholder="Nghĩa tiếng Việt *">'
  +'<input id="v15-a-ipa" placeholder="IPA, vd /dɔːɡ/"><select id="v15-a-pos"><option value="n">danh từ</option><option value="v">động từ</option><option value="adj">tính từ</option><option value="adv">trạng từ</option><option value="prep">giới từ</option></select>'
  +'<select id="v15-a-lv"><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select>'
  +'<select id="v15-a-t">'+((window.__V15_DATA?__V15_DATA.topics:[]).map(function(t){return '<option value="'+t.id+'">'+t.name+' – '+t.vi+'</option>'}).join(''))+'</select>'
  +'<input id="v15-a-ex" placeholder="Câu ví dụ tiếng Anh"><input id="v15-a-exvi" placeholder="Dịch câu ví dụ">'
  +'<button class="btn pri" onclick="__v15.vocabAdd()">Thêm từ</button></div>'
  +'<h3>Nhập / Xuất danh sách từ</h3><p class="mute">Nhập thông minh (V8): Excel, CSV, TSV, TXT, JSON — kéo thả file, xem trước, xử lý từ trùng. Xuất: tải toàn bộ danh sách (kể cả từ bạn thêm).</p>'
  +'<div class="acts"><button class="btn pri" onclick="window.__v16?__v16.open(\'en\'):__v15.vocabImport()">🧠 Nhập thông minh</button><button class="btn sm" onclick="window.__v16?__v16.exportVocab(\'en\',\'ALL\',\'xlsx\'):__v15.vocabExportCSV()">Xuất Excel</button><button class="btn sm" onclick="__v15.vocabExportJSON()">Xuất JSON</button><button class="btn sm" onclick="__v15.vocabExportCSV()">Xuất CSV</button></div>'
  +'<details class="v16oldimp"><summary>Nhập nhanh (cũ): dán JSON hoặc dòng en | vi | …</summary><textarea id="v15-io" rows="3" placeholder="Dán danh sách từ vào đây…"></textarea><div class="acts"><button class="btn sm" onclick="__v15.vocabImport()">Nhập từ</button></div></details>';
  return h;
}
function vocabDeckFilter(v){VDECK=v||'';renderTab()}
function vocabSearch(v){VQ=v;renderTab();var inp=document.querySelector('#v15body .v15input');if(inp){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length)}}
function vocabAdd(){
  var g=function(id){var el=document.getElementById(id);return el?el.value.trim():''};
  var en=g('v15-a-en'),vi=g('v15-a-vi');
  if(!en||!vi){pop15('Nhập từ tiếng Anh và nghĩa tiếng Việt.');return}
  var old=enOld();
  old.custom=old.custom||[];
  old.custom.push({t:g('v15-a-t')||'daily',en:en,vi:vi,ipa:g('v15-a-ipa'),pos:g('v15-a-pos')||'n',lv:g('v15-a-lv')||'A1',ex:g('v15-a-ex'),exvi:g('v15-a-exvi'),uid:'u'+Date.now().toString(36)});
  save15();buildWords();pop15('Đã thêm từ "'+en+'".');renderTab();
}
function vocabDel(id){
  var old=enOld();
  old.custom=(old.custom||[]).filter(function(c){return (c.uid||'')!==id});
  save15();buildWords();pop15('Đã xóa từ.');renderTab();
}
function vocabEdit(id){
  var old=enOld(),c=(old.custom||[]).filter(function(x){return x.uid===id})[0];
  if(!c)return;
  var vi=prompt('Nghĩa tiếng Việt cho "'+c.en+'":',c.vi);
  if(vi===null)return;
  c.vi=vi.trim()||c.vi;
  var ex=prompt('Câu ví dụ tiếng Anh (để trống nếu giữ nguyên):',c.ex||'');
  if(ex!==null)c.ex=ex.trim();
  save15();buildWords();pop15('Đã sửa từ "'+c.en+'".');renderTab();
}
function vocabImport(){
  var ta=document.getElementById('v15-io');if(!ta)return;
  var txt=ta.value.trim();if(!txt){pop15('Dán danh sách từ vào ô trước.');return}
  var old=enOld();old.custom=old.custom||[];var added=0;
  try{
    var arr=JSON.parse(txt);
    if(Array.isArray(arr))arr.forEach(function(o){
      if(o.en&&o.vi){old.custom.push({t:o.topic||o.t||'daily',en:String(o.en),vi:String(o.vi),ipa:o.ipa||'',pos:o.pos||'n',lv:o.level||o.lv||'A1',ex:o.ex||'',exvi:o.exvi||'',uid:'u'+Date.now().toString(36)+added});added++}
    });
  }catch(e){
    txt.split('\n').forEach(function(line){
      var p=line.split('|').map(function(s){return s.trim()});
      if(p[0]&&p[1]){old.custom.push({t:p[5]||'daily',en:p[0],vi:p[1],ipa:p[2]||'',pos:p[3]||'n',lv:p[4]||'A1',ex:p[6]||'',exvi:p[7]||'',uid:'u'+Date.now().toString(36)+added});added++}
    });
  }
  if(added){save15();buildWords();pop15('Đã nhập '+added+' từ.');renderTab()}
  else pop15('Không nhập được từ nào. Kiểm tra định dạng.');
}
function vocabExportJSON(){
  dl('english-words-v7.json',JSON.stringify(WORDS.map(function(w){return {level:w.lv,topic:w.t,en:w.en,vi:w.vi,ipa:w.ipa,pos:w.pos,ex:w.ex,exvi:w.exvi}}),null,2));
}
function vocabExportCSV(){
  var escCsv=function(s){s=String(s||'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
  var rows=[['level','topic','en','vi','ipa','pos','ex','exvi'].join(',')];
  WORDS.forEach(function(w){rows.push([w.lv,w.t,w.en,w.vi,w.ipa,w.pos,w.ex,w.exvi].map(escCsv).join(','))});
  dl('english-words-v7.csv',rows.join('\n'),'text/csv');
}

/* ---------- BACKUP / RESTORE ---------- */
function backupHTML(){
  var raw='';try{raw=localStorage.getItem('hanvocab.v1')||''}catch(e){}
  return (window.__v20&&__v20.dataPanelHTML?__v20.dataPanelHTML():'')
  +'<h3>Sao lưu &amp; khôi phục</h3>'
  +'<p class="mute">Dữ liệu người chơi lưu trong localStorage với khóa <b>hanvocab.v1</b> (giữ nguyên từ V6 — không đổi tên, không xóa). Sao lưu gồm toàn bộ từ tiếng Hàn, tiến trình tiếng Anh (V14 + V15), XP, 💎, farm và boss.</p>'
  +'<div class="v15statgrid"><div class="v15stat"><b>'+(raw.length/1024).toFixed(1)+' KB</b><span>kích thước bản lưu</span></div><div class="v15stat"><b>'+counts15().total+'</b><span>từ tiếng Anh</span></div><div class="v15stat"><b>'+(S.cards?S.cards.length:0)+'</b><span>thẻ tiếng Hàn</span></div></div>'
  +'<div class="acts"><button class="btn pri" onclick="__v15.backupExport()">Tải file sao lưu (.json)</button></div>'
  +'<h3>Khôi phục từ file</h3><p class="mute">Chọn file sao lưu .json đã tải trước đây. Dữ liệu hiện tại sẽ được thay thế — hãy sao lưu trước khi khôi phục.</p>'
  +'<input type="file" id="v15-restore" accept=".json,application/json" onchange="__v15.backupImport(this)">'
  +'<h3>Đặt lại tiến trình tiếng Anh</h3><p class="mute">Chỉ xóa tiến trình tiếng Anh (V14 + V15). Từ tiếng Hàn, XP và vật phẩm KHÔNG bị xóa.</p>'
  +'<div class="acts"><button class="btn bad" onclick="__v15.resetEN()">Đặt lại tiến trình tiếng Anh</button></div>';
}
function backupExport(){
  try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}
  var raw='';try{raw=localStorage.getItem('hanvocab.v1')||'{}'}catch(e){raw='{}'}
  dl('korean-vocab-farm-backup-v16.3.json',raw);
}
function backupImport(input){
  var f=input&&input.files&&input.files[0];if(!f)return;
  var rd=new FileReader();
  rd.onload=function(){
    try{
      var j=JSON.parse(rd.result);
      if(!j||!Array.isArray(j.cards))throw new Error('bad save');
      try{ var _s20=window.__v20sync; if(_s20&&_s20.validateSave){ var _v=_s20.validateSave(j); if(!_v.ok) throw new Error('invalid save: '+(_v.errors||[]).slice(0,3).join(', ')); if(_s20.snapshot){ var _cur=''; try{ _cur=localStorage.getItem('hanvocab.v1')||''; }catch(e){} _s20.snapshot('hanvocab.v12.preimport-'+Date.now(), _cur); } } }catch(_ve){ if(_ve&&String(_ve.message||'').indexOf('invalid save')===0) throw _ve; }
      if(!confirm('Khôi phục bản lưu này? Dữ liệu hiện tại sẽ bị thay thế.'))return;
      try{ if(window.__v20&&__v20.flush) __v20.flush(); }catch(e){}
      localStorage.setItem('hanvocab.v1',JSON.stringify(j));
      location.reload();
    }catch(e){alert('File sao lưu không hợp lệ: cần file JSON của game (có trường cards).')}
  };
  rd.readAsText(f);
}
function resetEN(){
  if(!confirm('Xóa toàn bộ tiến trình tiếng Anh (từ đã học, farm, boss)? Từ tiếng Hàn và XP giữ nguyên.'))return;
  try{delete S.v7.en;delete S.v7.en15;try{var _e27=S.v7&&S.v7.en27;if(_e27&&_e27.en){_e27.en.last={};_e27.en.cw={};_e27.en.cr={};}}catch(_e27e){}save15();buildWords();pop15('Đã đặt lại tiến trình tiếng Anh.');renderTab()}catch(e){}
}

/* ---------- INIT ---------- */
function init15(){
  if(document.getElementById('v15langbar'))return;
  try{pushDataIntoV14()}catch(e){buildWords()}
  buildWords();
  var bar=document.createElement('div');bar.id='v15langbar';bar.className='v15langbar';
  document.body.insertBefore(bar,document.body.firstChild);
  renderLangBar();
  var e=en15();
  if(!e.langChoice)setTimeout(showChooser,600);
  else{document.documentElement.setAttribute('data-v15-lang',e.lang);document.body.classList.toggle('v15-en',e.lang==='en')}
}
window.__v15={
  openHub:openHub15,closeHub:closeHub15,tab:setTab,setLang:setLang,choose:choose15,
  setLevel:setLevel,setTopic:setTopic,startMode:startMode,backToLearn:backToLearn,
  fcFlip:fcFlip,fcPrev:fcPrev,fcNext:fcNext,fcRate:fcRate,speakWord:speakWord,
  mcPick:mcPick,mcNext:mcNext,typeSubmit:typeSubmit,typeHint:typeHint,typeNext:typeNext,
  typeArrTap:typeArrTap,typeArrClear:typeArrClear,typeArrHint:typeArrHint,typeArrCheck:typeArrCheck,
  listenMode:listenMode,listenPick:listenPick,listenTypeSubmit:listenTypeSubmit,listenNext:listenNext,
  builderTap:builderTap,builderClear:builderClear,builderHint:builderHint,builderCheck:builderCheck,builderNext:builderNext,
  grammarPick:grammarPick,grammarNext:grammarNext,matchClick:matchClick,speedPick:speedPick,
  readSpeak:readSpeak,readPick:readPick,readNext:readNext,
  speakRecord:speakRecord,speakSelf:speakSelf,speakNext:speakNext,
  farmPlant:farmPlant,farmPlotTap:farmPlotTap,farmQuizPick:farmQuizPick,farmQuizClose:farmQuizClose,farmBuy:farmBuy,
  bossFight:bossFight,bossPick:bossPick,bossNext:bossNext,bossClose:bossClose,bossSpeak:bossSpeak,
  reviewStart:reviewStart,reviewPick:reviewPick,reviewNext:reviewNext,reviewClose:reviewClose,
  vocabSearch:vocabSearch,vocabDeckFilter:vocabDeckFilter,vocabAdd:vocabAdd,vocabDel:vocabDel,vocabEdit:vocabEdit,vocabImport:vocabImport,vocabExportJSON:vocabExportJSON,vocabExportCSV:vocabExportCSV,
  backupExport:backupExport,backupImport:backupImport,resetEN:resetEN,
  /* V16 (Smart Import) dùng các hàm nội bộ này — chỉ đọc/ghi qua API có sẵn,
     không chạm vào logic học/boss/farm. */
  buildWords:buildWords,enOld:enOld,en15:en15,save15:save15,dl:dl,esc:esc,pop15:pop15,
  renderTab:renderTab,topicName:topicName,counts15:counts15,
  /* V17 (Thư viện có sẵn): phạm vi bài/chủ đề + bộ lọc từ + thưởng bài học */
  setScope:setScope15,clearScope:clearScope15,wordsFiltered:wordsFiltered,inScope:inScope15,
  gain15:gain15,mark15:mark15,
  /* V22 (Basic Tactics): gắn dữ liệu BT đã tải lười vào WORDS */
  attachBT:attachBT,
  get words(){return WORDS},get state(){return en15()},get counts(){return counts15()},
  version:'15.0.0'
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init15);
else setTimeout(init15,0);
})();
