/* ===== V14 Bilingual EN-VI =====
   A full English<->Vietnamese learning mode inside the Korean game.
   It reuses the base XP/Level (gain), sounds (sfx), toasts (pop),
   daily quests (dqAdd) and the save system, but keeps its own
   vocabulary, SRS boxes and progress in S.v7.en (never touching
   the Korean cards). Audio is the browser's speech synthesis
   (en-US); no audio files are bundled.
   [topic, en, vi, ipa, pos(n/v/adj), example EN, example VI] */
(()=>{
'use strict';
var TOPICS=[
  {id:'animals', name:'Animals', vi:'Động vật', icon:'farm.png'},
  {id:'food', name:'Food', vi:'Thức ăn', icon:'harvest.png'},
  {id:'fruits', name:'Fruits', vi:'Trái cây', icon:'seeds.png'},
  {id:'vegetables', name:'Vegetables', vi:'Rau củ', icon:'water.png'},
  {id:'family', name:'Family', vi:'Gia đình', icon:'health.png'},
  {id:'school', name:'School', vi:'Trường học', icon:'book.png'},
  {id:'jobs', name:'Jobs', vi:'Nghề nghiệp', icon:'settings.png'},
  {id:'clothes', name:'Clothes', vi:'Quần áo', icon:'backpack.png'},
  {id:'house', name:'House', vi:'Ngôi nhà', icon:'home.png'},
  {id:'nature', name:'Nature', vi:'Thiên nhiên', icon:'weather.png'},
  {id:'transport', name:'Transportation', vi:'Giao thông', icon:'energy.png'},
  {id:'daily', name:'Daily Activities', vi:'Hoạt động hằng ngày', icon:'quest.png'}
];
var POS={n:'danh từ', v:'động từ', adj:'tính từ'};
var ENWORDS=[
['animals','dog','con chó','/dɔːɡ/','n','The dog is very friendly.','Con chó rất thân thiện.'],
['animals','cat','con mèo','/kæt/','n','The cat is sleeping on the sofa.','Con mèo đang ngủ trên ghế sofa.'],
['animals','bird','con chim','/bɜːrd/','n','The bird can fly high.','Con chim có thể bay cao.'],
['animals','fish','con cá','/fɪʃ/','n','The fish swims in the water.','Con cá bơi trong nước.'],
['animals','elephant','con voi','/ˈelɪfənt/','n','The elephant is very big.','Con voi rất to.'],
['animals','lion','sư tử','/ˈlaɪən/','n','The lion is the king of animals.','Sư tử là vua của các loài vật.'],
['animals','monkey','con khỉ','/ˈmʌŋki/','n','The monkey likes bananas.','Con khỉ thích chuối.'],
['animals','rabbit','con thỏ','/ˈræbɪt/','n','The rabbit has long ears.','Con thỏ có đôi tai dài.'],
['food','rice','cơm, gạo','/raɪs/','n','We eat rice every day.','Chúng tôi ăn cơm mỗi ngày.'],
['food','bread','bánh mì','/bred/','n','I eat bread for breakfast.','Tôi ăn bánh mì vào bữa sáng.'],
['food','egg','quả trứng','/eɡ/','n','She eats an egg every morning.','Cô ấy ăn một quả trứng mỗi sáng.'],
['food','milk','sữa','/mɪlk/','n','The baby drinks milk.','Em bé uống sữa.'],
['food','cheese','phô mai','/tʃiːz/','n','I like cheese on my pizza.','Tôi thích phô mai trên bánh pizza.'],
['food','meat','thịt','/miːt/','n','We eat meat for dinner.','Chúng tôi ăn thịt vào bữa tối.'],
['food','soup','súp, canh','/suːp/','n','This soup is very hot.','Món súp này rất nóng.'],
['food','salad','salad, rau trộn','/ˈsæləd/','n','She makes a fresh salad.','Cô ấy làm một đĩa salad tươi.'],
['fruits','apple','quả táo','/ˈæpəl/','n','An apple a day keeps the doctor away.','Mỗi ngày một quả táo giúp bạn khỏe mạnh.'],
['fruits','banana','quả chuối','/bəˈnɑːnə/','n','Monkeys love bananas.','Khỉ rất thích chuối.'],
['fruits','orange','quả cam','/ˈɒrɪndʒ/','n','I drink orange juice.','Tôi uống nước cam.'],
['fruits','mango','quả xoài','/ˈmæŋɡəʊ/','n','This mango is very sweet.','Quả xoài này rất ngọt.'],
['fruits','grape','quả nho','/ɡreɪp/','n','Grapes are small and sweet.','Nho nhỏ và ngọt.'],
['fruits','strawberry','quả dâu tây','/ˈstrɔːbəri/','n','She likes strawberry cake.','Cô ấy thích bánh dâu tây.'],
['fruits','watermelon','quả dưa hấu','/ˈwɔːtəmelən/','n','Watermelon is good in summer.','Dưa hấu rất ngon vào mùa hè.'],
['fruits','pineapple','quả dứa','/ˈpaɪnæpəl/','n','Pineapple is yellow and sweet.','Quả dứa vàng và ngọt.'],
['vegetables','carrot','củ cà rốt','/ˈkærət/','n','Rabbits eat carrots.','Thỏ ăn cà rốt.'],
['vegetables','potato','củ khoai tây','/pəˈteɪtəʊ/','n','I like fried potatoes.','Tôi thích khoai tây chiên.'],
['vegetables','tomato','quả cà chua','/təˈmɑːtəʊ/','n','Tomatoes are red.','Cà chua có màu đỏ.'],
['vegetables','onion','củ hành','/ˈʌnjən/','n','Onions make me cry.','Hành làm tôi chảy nước mắt.'],
['vegetables','cabbage','bắp cải','/ˈkæbɪdʒ/','n','Cabbage is a green vegetable.','Bắp cải là rau màu xanh.'],
['vegetables','cucumber','quả dưa chuột','/ˈkjuːkʌmbər/','n','Cucumber is cool and fresh.','Dưa chuột mát và tươi.'],
['vegetables','spinach','rau bina','/ˈspɪnɪtʃ/','n','Spinach is good for your health.','Rau bina tốt cho sức khỏe.'],
['vegetables','corn','ngô, bắp','/kɔːrn/','n','We eat corn in the summer.','Chúng tôi ăn ngô vào mùa hè.'],
['family','father','bố','/ˈfɑːðər/','n','My father is a teacher.','Bố tôi là giáo viên.'],
['family','mother','mẹ','/ˈmʌðər/','n','My mother cooks very well.','Mẹ tôi nấu ăn rất ngon.'],
['family','brother','anh trai, em trai','/ˈbrʌðər/','n','My brother is ten years old.','Em trai tôi mười tuổi.'],
['family','sister','chị gái, em gái','/ˈsɪstər/','n','My sister likes to sing.','Chị gái tôi thích hát.'],
['family','grandmother','bà','/ˈɡrænmʌðər/','n','My grandmother tells good stories.','Bà tôi kể chuyện rất hay.'],
['family','grandfather','ông','/ˈɡrænfɑːðər/','n','My grandfather is seventy years old.','Ông tôi bảy mươi tuổi.'],
['family','baby','em bé','/ˈbeɪbi/','n','The baby is sleeping.','Em bé đang ngủ.'],
['family','uncle','chú, bác, cậu','/ˈʌŋkəl/','n','My uncle lives in Hanoi.','Chú tôi sống ở Hà Nội.'],
['school','teacher','giáo viên','/ˈtiːtʃər/','n','The teacher is kind.','Cô giáo rất tốt bụng.'],
['school','student','học sinh','/ˈstjuːdənt/','n','He is a good student.','Cậu ấy là học sinh giỏi.'],
['school','book','quyển sách','/bʊk/','n','I read a book every night.','Tôi đọc sách mỗi tối.'],
['school','pencil','bút chì','/ˈpensəl/','n','I write with a pencil.','Tôi viết bằng bút chì.'],
['school','school','trường học','/skuːl/','n','I go to school by bus.','Tôi đi học bằng xe buýt.'],
['school','classroom','phòng học','/ˈklɑːsruːm/','n','Our classroom is big.','Phòng học của chúng tôi rất rộng.'],
['school','lesson','bài học','/ˈlesən/','n',"Today's lesson is about animals.",'Bài học hôm nay về động vật.'],
['school','homework','bài tập về nhà','/ˈhəʊmwɜːrk/','n','I do my homework after school.','Tôi làm bài tập về nhà sau giờ học.'],
['jobs','doctor','bác sĩ','/ˈdɒktər/','n','The doctor helps sick people.','Bác sĩ giúp đỡ người bệnh.'],
['jobs','nurse','y tá','/nɜːrs/','n','The nurse is very kind.','Y tá rất tốt bụng.'],
['jobs','baker','thợ làm bánh','/ˈbeɪkər/','n','The baker makes fresh bread.','Thợ làm bánh làm bánh mì tươi.'],
['jobs','driver','tài xế','/ˈdraɪvər/','n','The bus driver is friendly.','Tài xế xe buýt rất thân thiện.'],
['jobs','farmer','nông dân','/ˈfɑːrmər/','n','The farmer grows rice.','Nông dân trồng lúa.'],
['jobs','singer','ca sĩ','/ˈsɪŋər/','n','She is a famous singer.','Cô ấy là ca sĩ nổi tiếng.'],
['jobs','policeman','cảnh sát','/pəˈliːsmən/','n','The policeman helps people.','Cảnh sát giúp đỡ mọi người.'],
['jobs','engineer','kỹ sư','/ˌendʒɪˈnɪər/','n','My father is an engineer.','Bố tôi là kỹ sư.'],
['clothes','shirt','áo sơ mi','/ʃɜːrt/','n','He wears a white shirt.','Anh ấy mặc áo sơ mi trắng.'],
['clothes','dress','váy, đầm','/dres/','n','She wears a red dress.','Cô ấy mặc váy đỏ.'],
['clothes','shoes','giày','/ʃuːz/','n','My shoes are new.','Giày của tôi còn mới.'],
['clothes','hat','mũ','/hæt/','n','He wears a hat in the sun.','Anh ấy đội mũ khi trời nắng.'],
['clothes','jacket','áo khoác','/ˈdʒækɪt/','n','It is cold, wear your jacket.','Trời lạnh, hãy mặc áo khoác.'],
['clothes','pants','quần dài','/pænts/','n','These pants are blue.','Chiếc quần này màu xanh.'],
['clothes','socks','tất, vớ','/sɒks/','n','I wear warm socks in winter.','Tôi mang tất ấm vào mùa đông.'],
['clothes','skirt','váy (chân váy)','/skɜːrt/','n','She likes her new skirt.','Cô ấy thích chiếc váy mới.'],
['house','house','ngôi nhà','/haʊs/','n','My house is near the school.','Nhà tôi gần trường học.'],
['house','kitchen','nhà bếp','/ˈkɪtʃɪn/','n','Mom cooks in the kitchen.','Mẹ nấu ăn trong bếp.'],
['house','bedroom','phòng ngủ','/ˈbedruːm/','n','I sleep in my bedroom.','Tôi ngủ trong phòng ngủ.'],
['house','bathroom','phòng tắm','/ˈbɑːθruːm/','n','The bathroom is clean.','Phòng tắm rất sạch.'],
['house','table','cái bàn','/ˈteɪbəl/','n','We eat at the table.','Chúng tôi ăn cơm ở bàn.'],
['house','chair','cái ghế','/tʃeər/','n','Sit on the chair, please.','Hãy ngồi lên ghế.'],
['house','bed','cái giường','/bed/','n','The bed is soft.','Cái giường rất mềm.'],
['house','door','cửa ra vào','/dɔːr/','n','Please close the door.','Hãy đóng cửa lại.'],
['nature','sun','mặt trời','/sʌn/','n','The sun is bright today.','Hôm nay mặt trời sáng chói.'],
['nature','moon','mặt trăng','/muːn/','n','The moon is beautiful tonight.','Trăng đêm nay rất đẹp.'],
['nature','star','ngôi sao','/stɑːr/','n','Stars shine at night.','Các ngôi sao tỏa sáng vào ban đêm.'],
['nature','river','con sông','/ˈrɪvər/','n','The river is very long.','Con sông rất dài.'],
['nature','mountain','ngọn núi','/ˈmaʊntən/','n','We climb the mountain.','Chúng tôi leo núi.'],
['nature','tree','cái cây','/triː/','n','The tree is tall and green.','Cái cây cao và xanh.'],
['nature','flower','bông hoa','/ˈflaʊər/','n','The flower smells sweet.','Bông hoa thơm ngát.'],
['nature','rain','cơn mưa','/reɪn/','n','Rain makes the plants grow.','Mưa giúp cây cối lớn lên.'],
['transport','car','ô tô','/kɑːr/','n','My father drives a car.','Bố tôi lái ô tô.'],
['transport','bus','xe buýt','/bʌs/','n','I take the bus to school.','Tôi đi xe buýt đến trường.'],
['transport','train','tàu hỏa','/treɪn/','n','The train is very fast.','Tàu hỏa chạy rất nhanh.'],
['transport','bicycle','xe đạp','/ˈbaɪsɪkəl/','n','She rides her bicycle every day.','Cô ấy đi xe đạp mỗi ngày.'],
['transport','airplane','máy bay','/ˈeərpleɪn/','n','The airplane flies in the sky.','Máy bay bay trên bầu trời.'],
['transport','boat','thuyền','/bəʊt/','n','We sail a boat on the lake.','Chúng tôi chèo thuyền trên hồ.'],
['transport','motorcycle','xe máy','/ˈməʊtəsaɪkəl/','n','He rides a motorcycle to work.','Anh ấy đi xe máy đến chỗ làm.'],
['transport','taxi','xe taxi','/ˈtæksi/','n',"Let's take a taxi to the station.",'Chúng ta đi taxi ra ga nhé.'],
['daily','eat','ăn','/iːt/','v','We eat breakfast at seven.','Chúng tôi ăn sáng lúc bảy giờ.'],
['daily','sleep','ngủ','/sliːp/','v','I sleep eight hours every night.','Tôi ngủ tám tiếng mỗi đêm.'],
['daily','run','chạy','/rʌn/','v','He runs in the park every morning.','Anh ấy chạy bộ trong công viên mỗi sáng.'],
['daily','read','đọc','/riːd/','v','She reads a book before bed.','Cô ấy đọc sách trước khi ngủ.'],
['daily','write','viết','/raɪt/','v','I write a letter to my friend.','Tôi viết thư cho bạn tôi.'],
['daily','swim','bơi','/swɪm/','v','They swim in the pool.','Họ bơi trong hồ bơi.'],
['daily','cook','nấu ăn','/kʊk/','v','Mom cooks dinner for us.','Mẹ nấu bữa tối cho chúng tôi.'],
['daily','walk','đi bộ','/wɔːk/','v','We walk to school together.','Chúng tôi cùng đi bộ đến trường.']
];

/* ---- state ---- */
function enState(){
  S.v7=S.v7||{};
  var e=S.v7.en;
  if(!e){
    e=S.v7.en={box:{},right:{},wrong:{},review:[],done:{},custom:[],dir:'ev',ex:'choice',topic:'',
      streak:0,lastDay:'',xpAt:{},stats:{ev:{r:0,w:0},ve:{r:0,w:0}}};
  }
  e.stats=e.stats||{ev:{r:0,w:0},ve:{r:0,w:0}};
  e.xpAt=e.xpAt||{};
  return e;
}
function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim(); }
function esc14(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function allWords(){
  var list=ENWORDS.map(function(w,i){ return {id:'w'+i,t:w[0],en:w[1],vi:w[2],ipa:w[3],pos:w[4],ex:w[5],exvi:w[6],custom:false}; });
  var e=enState();
  (e.custom||[]).forEach(function(w,i){ list.push({id:w.uid||('c'+i),t:w.t,en:w.en,vi:w.vi,ipa:w.ipa||'',pos:w.pos||'n',ex:w.ex||'',exvi:w.exvi||'',custom:true}); });
  return list;
}
function wordById(id){
  var list=allWords();
  for(var i=0;i<list.length;i++) if(list[i].id===id) return list[i];
  return null;
}
function topicOf(id){ for(var i=0;i<TOPICS.length;i++) if(TOPICS[i].id===id) return TOPICS[i]; return null; }
function topicWords(tid){ return allWords().filter(function(w){ return w.t===tid; }); }
function shuffle14(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

/* ---- session (in-memory only) ---- */
var EN={cur:null, answered:null, ok:null, fcIdx:0, fcFlip:false, fcList:null,
  mPairs:null, mSel:null, mDone:0, scTiles:null, scBuilt:'', race:null,
  sessRight:0, sessXp:0, lastId:null, reviewMode:false};

/* ---- picking ---- */
function poolWords(){
  var e=enState(), list=allWords();
  if(e.topic) list=list.filter(function(w){ return w.t===e.topic; });
  if(EN.reviewMode) list=list.filter(function(w){ return (e.wrong[w.id]||0)>0 || (e.review||[]).indexOf(w.id)>=0; });
  return list;
}
function pickWord(){
  if(EN.forceId){ var fw=wordById(EN.forceId); EN.forceId=null; if(fw) return fw; }
  var list=poolWords();
  if(!list.length) list=allWords();
  if(!list.length) return null;
  var e=enState();
  // priority: wrong words first, then low boxes, then new words
  var score=function(w){
    var wr=e.wrong[w.id]||0, bx=e.box[w.id]||0;
    return wr*10 + (5-bx)*2 + ((e.right[w.id]||0)===0?1:0);
  };
  list=list.slice().sort(function(a,b){ return score(b)-score(a)+ (Math.random()-0.5)*3; });
  var w=list[0];
  if(w.id===EN.lastId && list.length>1) w=list[1];
  EN.lastId=w.id;
  return w;
}
function distractors(w, n, field){
  var pool=allWords().filter(function(x){ return x.id!==w.id && x[field]!==w[field]; });
  return shuffle14(pool).slice(0,n);
}
function setupQuestion(){
  var e=enState(), kind=e.ex;
  if(kind==='card'||kind==='topics'||kind==='vocab'||kind==='review'){ EN.cur=null; EN.answered=null; return; }
  if(kind==='race'){ startRace(); return; }
  var w=pickWord();
  if(!w){ EN.cur=null; return; }
  var q={w:w, kind:kind, opts:null, tiles:null};
  if(kind==='choice'||kind==='listen'){
    var field=e.dir==='ev'?'vi':'en';
    if(kind==='listen'&&e.dir==='ve') field='en';
    q.opts=shuffle14([w].concat(distractors(w,3,field)));
  }
  if(kind==='fill'){
    q.opts=shuffle14([w].concat(distractors(w,3,'en')));
    q.sent=w.ex.replace(new RegExp('\\b'+w.en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i'),'_____');
    if(q.sent===w.ex) q.sent='_____ '+w.ex;
  }
  if(kind==='scramble'){
    q.tiles=shuffle14(w.en.replace(/[^a-z]/gi,'').toLowerCase().split(''));
    EN.scBuilt=''; EN.scUsed={};
  }
  if(kind==='match'){
    var ws=shuffle14(poolWords()).slice(0,4);
    if(ws.length<2) ws=shuffle14(allWords()).slice(0,4);
    q.match=ws;
    EN.mPairs={}; EN.mSel=null; EN.mDone=0;
  }
  EN.cur=q; EN.answered=null; EN.ok=null;
}

/* ---- marking (anti-farm XP) ---- */
function markEN(ok, w){
  var e=enState();
  w=w||(EN.cur&&EN.cur.w);
  if(!w) return 0;
  var id=w.id, before=e.box[id]||0;
  if(ok){
    e.right[id]=(e.right[id]||0)+1;
    e.streak=(e.streak||0)+1;
    e.box[id]=Math.min(5,before+1);
    var ri=(e.review||[]).indexOf(id); if(ri>=0) e.review.splice(ri,1);
  }else{
    e.wrong[id]=(e.wrong[id]||0)+1;
    e.streak=0;
    e.box[id]=0;
    if((e.review||[]).indexOf(id)<0) e.review.push(id);
  }
  e.stats[e.dir].r+=ok?1:0; e.stats[e.dir].w+=ok?0:1;
  var xp=0;
  if(ok && e.box[id]>before){
    var last=e.xpAt[id]||0;
    if(Date.now()-last>600000){ xp=10; e.xpAt[id]=Date.now(); }
  }
  if(ok && e.streak>0 && e.streak%5===0) xp+=5;
  if(xp>0){ gain(xp); EN.sessXp+=xp; }
  if(ok){ EN.sessRight++; try{ dqAdd('ok',1); dqAdd(e.dir==='ev'?'en':'enve',1); }catch(err){} }
  sfx(ok?'ok':'bad');
  checkTopicDone(w.t);
  save(); stats();
  return xp;
}
function checkTopicDone(tid){
  var e=enState();
  if(!tid||e.done[tid]) return;
  var ws=topicWords(tid);
  if(!ws.length) return;
  var learned=ws.filter(function(w){ return (e.box[w.id]||0)>=2; }).length;
  if(learned>=ws.length){
    e.done[tid]=1;
    gain(50); S.v7.gems=(S.v7.gems||0)+3; save();
    pop('Hoàn thành chủ đề '+(topicOf(tid)||{vi:tid}).vi+'! +50 XP, +3 💎',1);
  }
}
function topicProgress(tid){
  var e=enState(), ws=topicWords(tid);
  var learned=ws.filter(function(w){ return (e.box[w.id]||0)>=2; }).length;
  var r=0, wr=0;
  ws.forEach(function(w){ r+=(e.right[w.id]||0); wr+=(e.wrong[w.id]||0); });
  return {total:ws.length, learned:learned, right:r, wrong:wr, done:!!e.done[tid]};
}

/* ---- speech ---- */
function speakEN(t){
  try{
    speechSynthesis.cancel();
    var u=new SpeechSynthesisUtterance(t);
    u.lang='en-US'; u.rate=.85;
    speechSynthesis.speak(u);
  }catch(err){}
}

/* ---- UI ---- */
var EXTABS=[['card','Flashcard'],['choice','Trắc nghiệm'],['type','Gõ từ'],['match','Ghép cặp'],['fill','Điền câu'],['scramble','Xếp chữ'],['listen','Nghe'],['race','Đua 60s'],['review','Ôn tập'],['topics','Chủ đề'],['vocab','Từ vựng']];
function enIcon(name){ return '<img src="assets/icons/v6/'+name+'" style="width:18px;height:18px;vertical-align:-4px" alt="">'; }
function detailsHTML(w){
  return '<div class="enmeta"><span>'+esc14(w.ipa)+'</span> · <span>'+(POS[w.pos]||w.pos)+'</span> · <span>'+esc14((topicOf(w.t)||{vi:w.t}).vi)+'</span></div>'
    +(w.ex?'<div class="enex">“'+esc14(w.ex)+'”<br><span class="mute">'+esc14(w.exvi)+'</span></div>':'');
}
function renderEN(){
  var el=document.getElementById('stage'); if(!el) return;
  document.querySelectorAll('#app .ctl select[aria-label="Nhóm"], #app .ctl label.chk').forEach(function(n){ n.style.display='none'; });
  var e=enState();
  if(['choice','type','match','fill','scramble','listen'].indexOf(e.ex)>=0 && !EN.cur) setupQuestion();
  if(e.ex==='race' && !EN.race) startRace();
  var h='<div class="enwrap">';
  h+='<div class="enhead"><div class="endir">'
    +'<button class="btn '+(e.dir==='ev'?'pri':'')+'" onclick="__v14.dir(\'ev\')">EN → VI</button>'
    +'<button class="btn '+(e.dir==='ve'?'pri':'')+'" onclick="__v14.dir(\'ve\')">VI → EN</button></div>'
    +'<div class="enstats">'+enIcon('flame.png')+' '+(e.streak||0)+' · Đúng '+EN.sessRight+' · +'+EN.sessXp+' XP · '+enIcon('book.png')+' '+(e.review||[]).length+' cần ôn</div></div>';
  h+='<div class="entabs">'+EXTABS.map(function(t){ return '<button class="btn sm '+(e.ex===t[0]?'pri':'')+'" onclick="__v14.ex(\''+t[0]+'\')">'+t[1]+'</button>'; }).join('')+'</div>';
  if(['choice','type','match','fill','scramble','listen','race','card'].indexOf(e.ex)>=0){
    h+='<div class="enfilter"><select aria-label="Chủ đề tiếng Anh" onchange="__v14.topic(this.value)"><option value="">Mọi chủ đề</option>'
      +TOPICS.map(function(t){ return '<option value="'+t.id+'" '+(e.topic===t.id?'selected':'')+'>'+t.name+' – '+t.vi+'</option>'; }).join('')+'</select>'
      +(EN.reviewMode?'<span class="enchip">Đang ôn từ sai <button class="btn sm" onclick="__v14.reviewOff()">✕</button></span>':'')
      +'</div>';
  }
  h+='<div class="enbody">'+bodyHTML()+'</div></div>';
  el.innerHTML=h;
  if(e.ex==='type'&&EN.answered===null){ var inp=document.getElementById('en-in'); if(inp) setTimeout(function(){ inp.focus(); },0); }
  if(e.ex==='listen'&&EN.cur&&EN.answered===null){ var w0=EN.cur.w; setTimeout(function(){ speakEN(w0.en); },300); }
}
function metaHTML(w){
  return '<div class="enmeta"><span>'+esc14(w.ipa)+'</span> · <span>'+(POS[w.pos]||w.pos)+'</span> · <span>'+esc14((topicOf(w.t)||{vi:w.t}).vi)+'</span></div>';
}
function promptHTML(w){
  var e=enState();
  if(e.dir==='ev') return '<div class="encard s"><div class="enword">'+esc14(w.en)+'</div>'+metaHTML(w)+'<div class="acts"><button class="btn sm" onclick="__v14.speak(\''+w.id+'\')">'+enIcon('listen.png')+' Nghe phát âm</button></div></div>';
  return '<div class="encard s"><div class="enword vi">'+esc14(w.vi)+'</div><div class="mute">Nhớ từ tiếng Anh tương ứng</div></div>';
}
function bodyHTML(){
  var e=enState();
  switch(e.ex){
    case 'card': return fcHTML();
    case 'choice': return choiceHTML();
    case 'type': return typeHTML();
    case 'match': return matchHTML();
    case 'fill': return fillHTML();
    case 'scramble': return scrambleHTML();
    case 'listen': return listenHTML();
    case 'race': return raceHTML();
    case 'review': return reviewHTML();
    case 'topics': return topicsHTML();
    case 'vocab': return vocabHTML();
    default: return choiceHTML();
  }
}
function nextBtn(){ return '<div class="acts"><button class="btn pri" onclick="__v14.next()">Tiếp (Enter)</button></div>'; }
function choiceHTML(){
  var e=enState();
  if(!EN.cur) return '<p class="mute">Không có từ nào để học. Hãy thêm từ ở mục Từ vựng.</p>';
  var w=EN.cur.w, field=e.dir==='ev'?'vi':'en';
  var h='<div class="enbar"><i style="width:'+Math.min(100,(EN.sessRight%20)*5)+'%"></i></div>';
  h+=promptHTML(w);
  h+='<div class="opts">'+EN.cur.opts.map(function(o,i){
    var cl='';
    if(EN.answered!==null) cl=(o.id===w.id?'right':(o.id===EN.answered?'wrong':''));
    return '<button class="opt '+cl+'" onclick="__v14.pick(\''+o.id+'\')">'+(i+1)+'. '+esc14(o[field])+'</button>';
  }).join('')+'</div>';
  if(EN.answered!==null){
    h+='<div class="msg" style="color:var(--'+(EN.ok?'ok':'bad')+')">'+(EN.ok?'Chính xác! +'+(EN.lastXp||0)+' XP':'Chưa đúng. Đáp án: '+esc14(w[field]))+'</div>'+detailsHTML(w)+nextBtn();
  }
  return h;
}
function typeHTML(){
  var e=enState();
  if(!EN.cur) return '<p class="mute">Không có từ nào để học.</p>';
  var w=EN.cur.w;
  var h=promptHTML(w);
  if(EN.answered===null){
    h+='<input id="en-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="'+(e.dir==='ev'?'Gõ nghĩa tiếng Việt':'Gõ từ tiếng Anh')+'" aria-label="Đáp án" onkeydown="if(event.key===\'Enter\')__v14.submitType()">'
      +'<div class="acts"><button class="btn pri" onclick="__v14.submitType()">Kiểm tra</button>'
      +(e.dir==='ve'?'<button class="btn sm" onclick="__v14.hintType()">Gợi ý chữ cái</button>':'')+'</div>';
  }else{
    var exp=e.dir==='ev'?w.vi:w.en;
    h+='<div class="msg" style="color:var(--'+(EN.ok?'ok':'bad')+')">'+(EN.ok?'Chính xác! +'+(EN.lastXp||0)+' XP':'Chưa đúng. Đáp án: <b>'+esc14(exp)+'</b>')+'</div>'+detailsHTML(w)+nextBtn();
  }
  return h;
}
function matchHTML(){
  if(!EN.cur||!EN.cur.match) return '<p class="mute">Không có từ nào để ghép.</p>';
  var ws=EN.cur.match;
  var evs=ws, vis=shuffle14(ws);
  var h='<p class="mute">Bấm một từ tiếng Anh rồi bấm nghĩa tiếng Việt tương ứng.</p><div class="enmatch">';
  var mCls=function(w,side){
    var st=EN.mPairs[w.id];
    if(st==='ok') return 'right';
    if(EN.mWrong&&(EN.mWrong.a===w.id||EN.mWrong.b===w.id)) return 'wrong';
    if(EN.mSel&&EN.mSel.side===side&&EN.mSel.id===w.id) return 'sel';
    return '';
  };
  h+='<div class="encol">'+evs.map(function(w){
    var st=EN.mPairs[w.id];
    return '<button class="opt '+mCls(w,'en')+'" '+(st==='ok'?'disabled':'')+' onclick="__v14.mClick(\'en\',\''+w.id+'\')">'+esc14(w.en)+'</button>';
  }).join('')+'</div>';
  h+='<div class="encol">'+vis.map(function(w){
    var st=EN.mPairs[w.id];
    return '<button class="opt '+mCls(w,'vi')+'" '+(st==='ok'?'disabled':'')+' onclick="__v14.mClick(\'vi\',\''+w.id+'\')">'+esc14(w.vi)+'</button>';
  }).join('')+'</div></div>';
  if(EN.mDone>=ws.length) h+='<div class="msg" style="color:var(--ok)">Hoàn thành! Bạn đã ghép đúng '+ws.length+' cặp.</div><div class="acts"><button class="btn pri" onclick="__v14.next()">Ván mới</button></div>';
  return h;
}
function fillHTML(){
  if(!EN.cur) return '<p class="mute">Không có từ nào để học.</p>';
  var w=EN.cur.w;
  var h='<div class="encard s"><div class="enex big">“'+esc14(EN.cur.sent)+'”</div><div class="mute">'+esc14(w.exvi)+'</div></div>';
  h+='<div class="opts">'+EN.cur.opts.map(function(o,i){
    var cl='';
    if(EN.answered!==null) cl=(o.id===w.id?'right':(o.id===EN.answered?'wrong':''));
    return '<button class="opt '+cl+'" onclick="__v14.pick(\''+o.id+'\')">'+(i+1)+'. '+esc14(o.en)+'</button>';
  }).join('')+'</div>';
  if(EN.answered!==null){
    h+='<div class="msg" style="color:var(--'+(EN.ok?'ok':'bad')+')">'+(EN.ok?'Chính xác! +'+(EN.lastXp||0)+' XP':'Chưa đúng. Đáp án: '+esc14(w.en))+'</div>'+detailsHTML(w)+nextBtn();
  }
  return h;
}
function scrambleHTML(){
  if(!EN.cur) return '<p class="mute">Không có từ nào để học.</p>';
  var w=EN.cur.w;
  var h='<div class="encard s"><div class="enword vi">'+esc14(w.vi)+'</div><div class="mute">Xếp các chữ cái thành từ tiếng Anh</div>'
    +'<div class="acts"><button class="btn sm" onclick="__v14.speak(\''+w.id+'\')">'+enIcon('listen.png')+' Nghe phát âm</button></div></div>';
  h+='<div class="enscbuilt">'+esc14(EN.scBuilt||'&nbsp;')+'</div>';
  h+='<div class="ensctiles">'+EN.cur.tiles.map(function(ch,i){
    var used=(EN.scUsed||{})[i];
    return '<button class="ensctile" '+(used?'disabled':'')+' onclick="__v14.scClick('+i+')">'+esc14(ch.toUpperCase())+'</button>';
  }).join('')+'</div>';
  if(EN.answered===null){
    h+='<div class="acts"><button class="btn pri" onclick="__v14.scCheck()">Kiểm tra</button><button class="btn sm" onclick="__v14.scClear()">Xóa</button><button class="btn sm" onclick="__v14.scHint()">Gợi ý</button></div>';
  }else{
    h+='<div class="msg" style="color:var(--'+(EN.ok?'ok':'bad')+')">'+(EN.ok?'Chính xác! +'+(EN.lastXp||0)+' XP':'Chưa đúng. Đáp án: <b>'+esc14(w.en)+'</b>')+'</div>'+detailsHTML(w)+nextBtn();
  }
  return h;
}
function listenHTML(){
  var e=enState();
  if(!EN.cur) return '<p class="mute">Không có từ nào để học.</p>';
  var w=EN.cur.w, field=e.dir==='ev'?'vi':'en';
  var h='<div class="encard s"><div class="enword">Nghe</div><div class="mute">Nghe và chọn '+(e.dir==='ev'?'nghĩa tiếng Việt đúng':'cách viết đúng')+'</div>'
    +'<div class="acts"><button class="btn pri" onclick="__v14.speak(\''+w.id+'\')">'+enIcon('listen.png')+' Nghe lại</button></div></div>';
  h+='<div class="opts">'+EN.cur.opts.map(function(o,i){
    var cl='';
    if(EN.answered!==null) cl=(o.id===w.id?'right':(o.id===EN.answered?'wrong':''));
    return '<button class="opt '+cl+'" onclick="__v14.pick(\''+o.id+'\')">'+(i+1)+'. '+esc14(o[field])+'</button>';
  }).join('')+'</div>';
  if(EN.answered!==null){
    h+='<div class="msg" style="color:var(--'+(EN.ok?'ok':'bad')+')">'+(EN.ok?'Chính xác! +'+(EN.lastXp||0)+' XP':'Chưa đúng. Đáp án: '+esc14(w[field]))+'</div>'+detailsHTML(w)+nextBtn();
  }
  return h;
}
function raceHTML(){
  var r=EN.race;
  if(!r) return '<p class="mute">Đang chuẩn bị…</p>';
  if(r.over){
    return '<div class="encard s"><div class="enword">'+r.score+' câu đúng</div><div class="mute">Bạn trả lời đúng '+r.score+' câu trong 60 giây · +'+r.xp+' XP</div></div>'
      +'<div class="acts"><button class="btn pri" onclick="__v14.raceAgain()">Chơi lại</button></div>';
  }
  var w=r.q?r.q.w:null;
  var h='<div class="enracebar"><span id="enrace-t">'+r.left+'s</span><span>Đúng '+r.score+'</span></div>';
  if(w){
    var e=enState(), field=e.dir==='ev'?'vi':'en';
    h+='<div class="encard s"><div class="enword">'+esc14(e.dir==='ev'?w.en:w.vi)+'</div></div>';
    h+='<div class="opts">'+r.q.opts.map(function(o,i){
      var cl='';
      if(r.answered!==null) cl=(o.id===w.id?'right':(o.id===r.answered?'wrong':''));
      return '<button class="opt '+cl+'" onclick="__v14.racePick(\''+o.id+'\')">'+(i+1)+'. '+esc14(o[field])+'</button>';
    }).join('')+'</div>';
  }
  return h;
}

/* ---- flashcard ---- */
function fcList(){
  if(!EN.fcList||!EN.fcList.length) EN.fcList=poolWords();
  if(!EN.fcList.length) EN.fcList=allWords();
  return EN.fcList;
}
function fcHTML(){
  var list=fcList();
  if(!list.length) return '<p class="mute">Không có từ nào.</p>';
  if(EN.fcIdx>=list.length) EN.fcIdx=0;
  var w=list[EN.fcIdx], e=enState();
  var front=e.dir==='ev'?w.en:w.vi, back=e.dir==='ev'?w.vi:w.en;
  var h='<div class="enfcwrap"><div class="enfc '+(EN.fcFlip?'fl':'')+'" onclick="__v14.fcFlip()" role="button" tabindex="0" aria-label="Lật thẻ">'
    +'<div class="enfc-in"><div class="enfc-f"><div class="enword">'+esc14(front)+'</div><div class="mute">Bấm để lật thẻ</div></div>'
    +'<div class="enfc-b"><div class="enword">'+esc14(back)+'</div>'+detailsHTML(w)+'</div></div></div>';
  h+='<div class="acts"><button class="btn sm" onclick="__v14.fcPrev()">← Trước</button><button class="btn sm" onclick="__v14.fcNext()">Sau →</button><button class="btn sm" onclick="__v14.fcShuffle()">Trộn</button><button class="btn sm" onclick="__v14.speak(\''+w.id+'\')">'+enIcon('listen.png')+' Nghe</button></div>';
  if(EN.fcFlip) h+='<div class="acts"><button class="btn bad" onclick="__v14.fcRate(false)">Chưa nhớ</button><button class="btn ok" onclick="__v14.fcRate(true)">Đã nhớ</button></div>';
  h+='<p class="mute">Thẻ '+(EN.fcIdx+1)+' trên '+list.length+(e.topic?' · '+(topicOf(e.topic)||{vi:e.topic}).vi:'')+'</p></div>';
  return h;
}
/* ---- review / topics / vocab ---- */
function reviewHTML(){
  var e=enState();
  var rows=allWords().filter(function(w){ return (e.wrong[w.id]||0)>0; })
    .sort(function(a,b){ return (e.wrong[b.id]||0)-(e.wrong[a.id]||0); });
  var h='<div class="enhead2"><b>'+rows.length+' từ cần ôn</b><span class="mute">Sắp xếp theo số lần sai — từ hay quên nhất lên trước.</span></div>';
  if(!rows.length) return h+'<p class="mute">Chưa có từ nào sai. Trả lời sai một câu, từ đó sẽ xuất hiện ở đây để ôn lại.</p>';
  h+='<div class="acts"><button class="btn pri" onclick="__v14.reviewStart()">Ôn tất cả từ sai</button></div>';
  h+='<div class="enrows">'+rows.map(function(w){
    return '<div class="enrow"><div><b>'+esc14(w.en)+'</b> <span class="mute">'+esc14(w.ipa)+'</span><br><span>'+esc14(w.vi)+'</span></div>'
      +'<div class="enrowst">Sai '+(e.wrong[w.id]||0)+' · Đúng '+(e.right[w.id]||0)+' · hộp '+(e.box[w.id]||0)+'/5</div>'
      +'<button class="btn sm" onclick="__v14.reviewOne(\''+w.id+'\')">Ôn</button></div>';
  }).join('')+'</div>';
  return h;
}
function topicsHTML(){
  var h='<div class="entopics">'+TOPICS.map(function(t){
    var p=topicProgress(t.id), pct=p.total?Math.round(p.learned/p.total*100):0;
    return '<div class="entopic"><div class="entopic-ic">'+enIcon(t.icon)+'</div><div class="entopic-n"><b>'+t.name+'</b><br><span class="mute">'+t.vi+'</span></div>'
      +'<div class="enbar"><i style="width:'+pct+'%"></i></div><div class="mute">'+p.learned+'/'+p.total+' đã thuộc · Đúng '+p.right+' · Sai '+p.wrong+(p.done?' · Hoàn thành':'')+'</div>'
      +'<div class="acts"><button class="btn sm pri" onclick="__v14.topicGo(\''+t.id+'\',\'choice\')">Học</button><button class="btn sm" onclick="__v14.topicGo(\''+t.id+'\',\'card\')">Flashcard</button></div></div>';
  }).join('')+'</div>';
  return h;
}
function vocabRows(){
  var e=enState(), q=(EN.vq||'').toLowerCase();
  var list=allWords().filter(function(w){ return !q || (w.en+' '+w.vi+' '+w.t).toLowerCase().indexOf(q)>=0; });
  return list.slice(0,120).map(function(w){
    return '<div class="enrow"><div><b>'+esc14(w.en)+'</b> <span class="mute">'+esc14(w.ipa)+' · '+(POS[w.pos]||w.pos)+'</span><br><span>'+esc14(w.vi)+'</span> <span class="mute">· '+esc14((topicOf(w.t)||{vi:w.t}).vi)+'</span></div>'
      +'<div class="enrowst">hộp '+(e.box[w.id]||0)+'/5</div>'
      +(w.custom?'<button class="btn sm bad" onclick="__v14.delCustom(\''+w.id+'\')">Xóa</button>':'')
      +'<button class="btn sm" onclick="__v14.speak(\''+w.id+'\')">'+enIcon('listen.png')+'</button></div>';
  }).join('')||'<p class="mute">Không tìm thấy từ nào.</p>';
}
function vocabHTML(){
  var e=enState();
  var h='<div class="enhead2"><b>'+allWords().length+' từ tiếng Anh</b><span class="mute">'+ENWORDS.length+' từ có sẵn · '+e.custom.length+' từ bạn thêm</span></div>';
  h+='<input type="text" class="srch" placeholder="Tìm từ tiếng Anh, nghĩa, chủ đề" value="'+esc14(EN.vq||'')+'" oninput="__v14.vq(this.value)">';
  h+='<div class="enrows" id="enrows">'+vocabRows()+'</div>';
  h+='<h3>Thêm từ mới</h3><div class="enadd">'
    +'<input id="en-a-en" placeholder="Từ tiếng Anh *"><input id="en-a-vi" placeholder="Nghĩa tiếng Việt *">'
    +'<input id="en-a-ipa" placeholder="Phiên âm IPA, vd /dɔːɡ/"><select id="en-a-pos"><option value="n">danh từ</option><option value="v">động từ</option><option value="adj">tính từ</option></select>'
    +'<select id="en-a-t">'+TOPICS.map(function(t){ return '<option value="'+t.id+'">'+t.name+' – '+t.vi+'</option>'; }).join('')+'</select>'
    +'<input id="en-a-ex" placeholder="Câu ví dụ tiếng Anh"><input id="en-a-exvi" placeholder="Dịch câu ví dụ">'
    +'<button class="btn pri" onclick="__v14.addCustom()">Thêm từ</button></div>';
  h+='<h3>Nhập / Xuất danh sách từ</h3><p class="mute">Nhập: dán JSON (mảng các từ) hoặc mỗi dòng một từ theo dạng <b>en | vi | ipa | pos | ex | exvi</b>. Xuất: tải toàn bộ danh sách (kể cả từ bạn thêm) về file JSON.</p>'
    +'<textarea id="en-io" rows="4" placeholder="Dán danh sách từ vào đây…"></textarea>'
    +'<div class="acts"><button class="btn pri" onclick="__v14.importWords()">Nhập từ</button><button class="btn sm" onclick="__v14.exportWords()">Xuất JSON</button><button class="btn sm" onclick="__v14.copyWords()">Sao chép JSON</button></div>';
  return h;
}
/* ---- race ---- */
function startRace(){
  if(EN.race&&EN.race.iv) clearInterval(EN.race.iv);
  EN.race={left:60, score:0, q:null, answered:null, over:false, xp:0, iv:null};
  raceNext();
  EN.race.iv=setInterval(function(){
    if(!EN.race||EN.race.over) return;
    EN.race.left--;
    var t=document.getElementById('enrace-t');
    if(t) t.textContent=EN.race.left+'s';
    if(EN.race.left<=0) endRace();
  },1000);
}
function raceNext(){
  var w=pickWord();
  var e=enState(), field=e.dir==='ev'?'vi':'en';
  EN.race.q={w:w, opts:shuffle14([w].concat(distractors(w,3,field)))};
  EN.race.answered=null;
}
function raceMark(ok,w){
  var e=enState(), id=w.id;
  if(ok){ e.right[id]=(e.right[id]||0)+1; e.box[id]=Math.min(5,(e.box[id]||0)+1); var ri=(e.review||[]).indexOf(id); if(ri>=0) e.review.splice(ri,1); }
  else { e.wrong[id]=(e.wrong[id]||0)+1; e.box[id]=0; if((e.review||[]).indexOf(id)<0) e.review.push(id); }
  e.stats[e.dir].r+=ok?1:0; e.stats[e.dir].w+=ok?0:1;
  checkTopicDone(w.t);
  save();
}
function endRace(){
  var r=EN.race; if(!r) return;
  clearInterval(r.iv); r.over=true;
  r.xp=Math.min(r.score*2,30);
  if(r.xp>0){ gain(r.xp); EN.sessXp+=r.xp; }
  try{ dqAdd('race',r.score,1); dqAdd('ok',r.score); }catch(err){}
  save(); stats(); stage();
}
/* ---- actions ---- */
function next(){ EN.scUsed={}; EN.scBuilt=''; setupQuestion(); stage(); }
function pick(id){
  if(!EN.cur||EN.answered!==null) return;
  EN.answered=id;
  var w=EN.cur.w;
  EN.ok=(id===w.id);
  EN.lastXp=markEN(EN.ok,w);
  stage();
}
function submitType(){
  if(!EN.cur||EN.answered!==null) return;
  var inp=document.getElementById('en-in'); if(!inp) return;
  var v=inp.value.trim(); if(!v) return;
  var w=EN.cur.w, e=enState(), ok;
  if(e.dir==='ev') ok=w.vi.split(',').map(norm).indexOf(norm(v))>=0;
  else ok=norm(v)===norm(w.en);
  EN.answered=v; EN.ok=ok; EN.lastXp=markEN(ok,w); stage();
}
function hintType(){
  var w=EN.cur&&EN.cur.w; if(!w) return;
  var inp=document.getElementById('en-in'); if(!inp) return;
  inp.value=w.en.slice(0,1); inp.focus();
}
function mClick(side,id){
  if(!EN.cur||!EN.cur.match) return;
  if(EN.mPairs[id]==='ok') return;
  if(!EN.mSel){ EN.mSel={side:side,id:id}; stage(); return; }
  if(EN.mSel.side===side){ EN.mSel={side:side,id:id}; stage(); return; }
  var a=EN.mSel, b={side:side,id:id};
  var enId=a.side==='en'?a.id:b.id, viId=a.side==='vi'?a.id:b.id;
  if(enId===viId){
    EN.mPairs[enId]='ok'; EN.mDone++;
    markEN(true,wordById(enId));
  }else{
    EN.mWrong={a:a.id,b:b.id};
    setTimeout(function(){ EN.mWrong=null; stage(); },700);
  }
  EN.mSel=null; stage();
}
function scClick(i){
  if(!EN.cur||EN.answered!==null) return;
  EN.scUsed=EN.scUsed||{};
  if(EN.scUsed[i]) return;
  EN.scUsed[i]=1;
  EN.scBuilt=(EN.scBuilt||'')+EN.cur.tiles[i];
  stage();
}
function scClear(){ EN.scBuilt=''; EN.scUsed={}; stage(); }
function scHint(){
  if(!EN.cur||EN.answered!==null) return;
  var first=EN.cur.w.en[0].toLowerCase();
  for(var i=0;i<EN.cur.tiles.length;i++){
    if(!((EN.scUsed||{})[i])&&EN.cur.tiles[i]===first){ EN.scUsed[i]=1; EN.scBuilt=(EN.scBuilt||'')+first; break; }
  }
  stage();
}
function scCheck(){
  if(!EN.cur||EN.answered!==null) return;
  var w=EN.cur.w;
  EN.answered=EN.scBuilt||'—';
  EN.ok=norm(EN.scBuilt)===norm(w.en);
  EN.lastXp=markEN(EN.ok,w);
  stage();
}
function racePick(id){
  var r=EN.race; if(!r||r.over||r.answered!==null) return;
  r.answered=id;
  var w=r.q.w, ok=(id===w.id);
  raceMark(ok,w);
  if(ok) r.score++;
  sfx(ok?'ok':'bad');
  stage();
  setTimeout(function(){ if(EN.race&&!EN.race.over){ raceNext(); stage(); } },650);
}
function fcFlip(){ EN.fcFlip=!EN.fcFlip; stage(); }
function fcNext(){ var l=fcList(); EN.fcIdx=(EN.fcIdx+1)%l.length; EN.fcFlip=false; stage(); }
function fcPrev(){ var l=fcList(); EN.fcIdx=(EN.fcIdx-1+l.length)%l.length; EN.fcFlip=false; stage(); }
function fcShuffle(){ EN.fcList=shuffle14(poolWords()); EN.fcIdx=0; EN.fcFlip=false; stage(); }
function fcRate(ok){ var l=fcList(), w=l[EN.fcIdx]; if(!w) return; markEN(ok,w); EN.fcIdx=(EN.fcIdx+1)%l.length; EN.fcFlip=false; stage(); }
function reviewStart(){ EN.reviewMode=true; enState().ex='choice'; setupQuestion(); stage(); }
function reviewOne(id){ EN.reviewMode=true; EN.forceId=id; enState().ex='choice'; setupQuestion(); stage(); }
function reviewOff(){ EN.reviewMode=false; setupQuestion(); stage(); }
function setDir(d){ var e=enState(); e.dir=d; save(); setupQuestion(); stage(); }
function setEx(k){
  var e=enState();
  if(EN.race&&EN.race.iv){ clearInterval(EN.race.iv); EN.race=null; }
  e.ex=k; EN.fcList=null; EN.fcIdx=0; EN.fcFlip=false;
  setupQuestion(); save(); stage();
}
function setTopic(tid){ var e=enState(); e.topic=tid; EN.fcList=null; EN.fcIdx=0; EN.fcFlip=false; setupQuestion(); save(); stage(); }
function topicGo(tid,ex){ var e=enState(); e.topic=tid; e.ex=ex; EN.fcList=null; EN.fcIdx=0; EN.fcFlip=false; setupQuestion(); save(); stage(); }
function setVq(v){ EN.vq=v; var el=document.getElementById('enrows'); if(el) el.innerHTML=vocabRows(); }
function uid14(){ return 'u'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36); }
function addCustom(){
  var g=function(id){ var el=document.getElementById(id); return el?el.value.trim():''; };
  var en=g('en-a-en'), vi=g('en-a-vi');
  if(!en||!vi){ pop('Nhập từ tiếng Anh và nghĩa tiếng Việt.'); return; }
  var e=enState();
  e.custom.push({t:g('en-a-t')||'daily',en:en,vi:vi,ipa:g('en-a-ipa'),pos:g('en-a-pos')||'n',ex:g('en-a-ex'),exvi:g('en-a-exvi'),uid:uid14()});
  save(); stage(); pop('Đã thêm từ "'+en+'".');
}
function delCustom(id){
  var e=enState();
  e.custom=e.custom.filter(function(w){ return (w.uid||'')!==id; });
  save(); stage();
}
function importWords(){
  var ta=document.getElementById('en-io'); if(!ta) return;
  var txt=ta.value.trim(); if(!txt){ pop('Dán danh sách từ vào ô trước.'); return; }
  var e=enState(), added=0;
  var topic=document.getElementById('en-a-t')?document.getElementById('en-a-t').value:'daily';
  var parsed=false;
  try{
    var arr=JSON.parse(txt);
    if(Array.isArray(arr)){
      parsed=true;
      arr.forEach(function(o){
        if(o&&o.en&&o.vi){ e.custom.push({t:o.t||o.topic||topic,en:String(o.en),vi:String(o.vi),ipa:o.ipa||'',pos:o.pos||'n',ex:o.ex||'',exvi:o.exvi||'',uid:uid14()}); added++; }
      });
    }
  }catch(err){ parsed=false; }
  if(!parsed){
    txt.split('\n').forEach(function(line){
      var p=line.split('|').map(function(s){ return s.trim(); });
      if(p[0]&&p[1]){ e.custom.push({t:topic,en:p[0],vi:p[1],ipa:p[2]||'',pos:p[3]||'n',ex:p[4]||'',exvi:p[5]||'',uid:uid14()}); added++; }
    });
  }
  if(added){ save(); stage(); pop('Đã nhập '+added+' từ.'); }
  else pop('Không nhập được từ nào. Kiểm tra định dạng.');
}
function exportWords(){
  var data=JSON.stringify(allWords().map(function(w){ return {t:w.t,en:w.en,vi:w.vi,ipa:w.ipa,pos:w.pos,ex:w.ex,exvi:w.exvi}; }),null,2);
  var blob=new Blob([data],{type:'application/json'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='english-words.json'; a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); },1000);
}
function copyWords(){
  var data=JSON.stringify(allWords().map(function(w){ return {t:w.t,en:w.en,vi:w.vi,ipa:w.ipa,pos:w.pos,ex:w.ex,exvi:w.exvi}; }));
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(data).then(function(){ pop('Đã sao chép danh sách từ.'); },function(){ pop('Không sao chép được.'); }); }
  else { var ta=document.getElementById('en-io'); if(ta){ ta.value=data; ta.select(); } }
}
function speak(id){ var w=wordById(id); if(w) speakEN(w.en); }
/* ---- wiring ---- */
var ogStage=window.stage;
window.stage=function(){
  if(S.opt.mode==='en'){ renderEN(); return; }
  if(EN.race&&EN.race.iv){ clearInterval(EN.race.iv); EN.race=null; }
  return ogStage();
};
addEventListener('keydown',function(e){
  if(S.opt.mode!=='en'||view!=='study') return;
  var t=e.target;
  if(['INPUT','TEXTAREA','SELECT'].includes(t.tagName)) return;
  var ex=enState().ex;
  if(ex==='card'&&(e.key===' '||e.key==='Enter')){ e.preventDefault(); fcFlip(); }
  else if((ex==='choice'||ex==='listen'||ex==='fill')&&EN.answered!==null&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); next(); }
  else if((ex==='choice'||ex==='listen'||ex==='fill')&&/^[1-4]$/.test(e.key)&&EN.cur&&EN.cur.opts&&EN.cur.opts[+e.key-1]){ pick(EN.cur.opts[+e.key-1].id); }
});
window.__v14={dir:setDir, ex:setEx, topic:setTopic, topicGo:topicGo, next:next, pick:pick, submitType:submitType, hintType:hintType,
  mClick:mClick, scClick:scClick, scClear:scClear, scHint:scHint, scCheck:scCheck, racePick:racePick, raceAgain:startRace,
  fcFlip:fcFlip, fcNext:fcNext, fcPrev:fcPrev, fcShuffle:fcShuffle, fcRate:fcRate,
  reviewStart:reviewStart, reviewOne:reviewOne, reviewOff:reviewOff,
  vq:setVq, addCustom:addCustom, delCustom:delCustom, importWords:importWords, exportWords:exportWords, copyWords:copyWords,
  speak:speak, ENWORDS:ENWORDS, TOPICS:TOPICS, get state(){ return enState(); },
  get curW(){ return EN.cur?EN.cur.w:null; }, get sess(){ return {right:EN.sessRight,xp:EN.sessXp}; }, get race(){ return EN.race; }};
})();
