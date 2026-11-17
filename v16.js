/* ============================================================
   V16 — Smart Vocabulary Import (V8)
   Lớp bổ sung cho Korean & English Vocab Farm V8.
   Không sửa logic V6/V15: chỉ ĐỌC S, S.cards, S.decks, WORDS,
   và GHI qua các hàm đã có (save/save15, ensureDeck, buildWords).
   Mọi thao tác nhập đều chạy cục bộ trong trình duyệt, không
   gửi dữ liệu lên máy chủ. Excel dùng SheetJS 0.18.5 đã đóng
   gói trong vendor/ (không CDN, không API key).
   ============================================================ */
(function(){
'use strict';

/* ---------------- tiện ích ---------------- */
function esc(s){ try{if(typeof window.esc==='function')return window.esc(s)}catch(e){} return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function pop(t){ try{var v=V15(); if(v&&typeof v.pop15==='function')return v.pop15(t);}catch(e){} try{if(typeof window.pop==='function')return window.pop(t)}catch(e){} try{alert(t)}catch(e){} }
/* V15 bọc trong IIFE nên các hàm nội bộ chỉ tới được qua window.__v15.
   Dùng accessor này — KHÔNG gọi trực tiếp buildWords/enOld/save15/dl. */
function V15(){ try{ return window.__v15||null; }catch(e){ return null; } }
function v15fn(name){ var v=V15(); return (v&&typeof v[name]==='function')?v[name]:null; }
function callBuildWords(){ var f=v15fn('buildWords'); if(f) f(); }
function callSave15(){ var f=v15fn('save15'); if(f) f(); }
function callRenderTab(){ var f=v15fn('renderTab'); if(f) f(); }
function getEnOld(){ var f=v15fn('enOld'); return f?f():null; }
function v15dl(name,text,type){ var f=v15fn('dl'); if(f){ f(name,text,type); return true; } return false; }
function uid16(){ return 'u16_'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36); }
function clampStr(s,n){ s=String(s==null?'':s).trim(); return n&&s.length>n?s.slice(0,n):s; }
function todayStr(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

/* Chuẩn hoá khoá trùng: NFKC, bỏ khoảng trắng thừa, EN thường hoá.
   KO không có chữ hoa/thường nên chỉ chuẩn hoá Unicode + khoảng trắng. */
function normKey(s,lang){
  s=String(s==null?'':s);
  try{ s=s.normalize('NFKC'); }catch(e){}
  s=s.replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim();
  if(lang==='en') s=s.toLowerCase();
  return s;
}
function hasHangul(s){ return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(String(s||'')); }
function hasLatin(s){ return /[A-Za-z]/.test(String(s||'')); }

/* ---------------- từ điển tên cột ---------------- */
/* Chuẩn hoá tên tiêu đề để so khớp: thường hoá, bỏ dấu tiếng Việt,
   bỏ khoảng trắng/gạch dưới. */
function normHeader(s){
  s=String(s==null?'':s).toLowerCase();
  try{ s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){}
  return s.replace(/[^a-z0-9\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/g,'');
}
var EN_FIELDS=['head','vi','ipa','pos','level','topic','ex','exvi'];
var KO_FIELDS=['head','vi','roman','topic','ex','level'];
var FIELD_LABEL={
  head:{en:'Từ tiếng Anh',ko:'Từ tiếng Hàn'}, vi:{en:'Nghĩa tiếng Việt',ko:'Nghĩa tiếng Việt'},
  ipa:{en:'IPA',ko:'IPA'}, pos:{en:'Từ loại (POS)',ko:'Từ loại (POS)'},
  level:{en:'Trình độ',ko:'Trình độ'}, topic:{en:'Chủ đề / Bộ',ko:'Chủ đề / Bộ'},
  ex:{en:'Câu ví dụ',ko:'Câu ví dụ'}, exvi:{en:'Dịch ví dụ',ko:'Dịch ví dụ'},
  roman:{en:'Romanization',ko:'Phiên âm'}
};
/* alias (đã chuẩn hoá bằng normHeader) -> field */
function buildAliases(){
  var m={};
  function add(field,names){ names.forEach(function(n){ m[normHeader(n)]=field; }); }
  add('head',['english','word','tu tieng anh','tu','tuvung','vocabulary','term','en','từ tiếng anh','từ','english word']);
  add('head_ko',['korean','hangul','tu tieng han','han','ko','한국어','한글','từ tiếng hàn']);
  add('vi',['vietnamese','meaning','nghia','nghia tieng viet','tieng viet','vi','translation','dich','nghĩa','nghĩa tiếng việt']);
  add('ipa',['ipa','pronunciation','phat am','phien am','phát âm','phiên âm']);
  add('pos',['pos','part of speech','tu loai','loai tu','word type','từ loại','loại từ']);
  add('level',['level','trinh do','cap do','cefr','trình độ','cấp độ']);
  add('topic',['topic','chu de','nhom','group','chude','bo','deck','chủ đề','nhóm','bộ từ','bộ']);
  add('ex',['example','vi du','cau vi du','sentence','vd','ví dụ','câu ví dụ']);
  add('exvi',['example translation','dich cau vi du','exampletranslation','exvi','dich vd','dịch câu ví dụ','dịch ví dụ']);
  add('roman',['romanization','roman','romaja','phat am','phien am','phiên âm','phát âm','romanisation']);
  return m;
}
var ALIASES=buildAliases();
function aliasField(h,lang){
  var k=normHeader(h);
  if(!k) return '';
  if(lang==='ko'&&ALIASES['head_ko']&&k in {'korean':1,'hangul':1,'tu tieng han':1,'han':1,'ko':1}) return 'head';
  var f=ALIASES[k];
  if(!f) return '';
  if(f==='head_ko') return 'head';
  if(lang==='ko'&&f==='head') return ''; /* 'english' trong file Hàn không phải cột từ gốc */
  if(lang==='en'&&f==='roman') return ''; /* romanization không dùng cho file Anh */
  return f;
}

/* ---------------- CSV / TSV / TXT ---------------- */
function stripBOM(t){ return String(t==null?'':t).replace(/^\uFEFF/,''); }
/* Đếm số cột khi tách bằng d, có tôn trọng dấu ngoặc kép. */
function countFields(line,d){
  var n=1,q=false;
  for(var i=0;i<line.length;i++){ var ch=line[i];
    if(q){ if(ch==='"'){ if(line[i+1]==='"')i++; else q=false; } }
    else if(ch==='"') q=true;
    else if(ch===d) n++;
  }
  return n;
}
/* Chấm điểm dấu phân cách trên vài dòng đầu: ưu tiên số cột cao + ổn định. */
function detectDelimiter(text){
  var lines=stripBOM(text).split(/\r\n|\r|\n/).filter(function(l){return l.trim()!==''}).slice(0,5);
  if(!lines.length) return ',';
  var cands=[',','\t',';','|'],best=',',bestScore=-1;
  cands.forEach(function(d){
    var counts=lines.map(function(l){return countFields(l,d)});
    var avg=counts.reduce(function(a,b){return a+b},0)/counts.length;
    var variance=counts.reduce(function(a,b){return a+(b-avg)*(b-avg)},0)/counts.length;
    var score=avg*10-variance*2-(avg<2?100:0);
    if(score>bestScore){bestScore=score;best=d;}
  });
  return best;
}
/* Máy trạng thái đọc CSV: xử lý BOM, \r\n, dấu ngoặc kép và "" bên trong. */
function parseDelimited(text,d){
  text=stripBOM(text);
  var rows=[],row=[],cell='',q=false;
  for(var i=0;i<text.length;i++){
    var ch=text[i];
    if(q){
      if(ch==='"'){ if(text[i+1]==='"'){cell+='"';i++;} else q=false; }
      else cell+=ch;
    } else if(ch==='"'){ q=true; }
    else if(ch===d){ row.push(cell); cell=''; }
    else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n')i++; row.push(cell); rows.push(row); row=[]; cell=''; }
    else cell+=ch;
  }
  row.push(cell); rows.push(row);
  /* bỏ các dòng trống ở cuối */
  while(rows.length&&rows[rows.length-1].every(function(c){return String(c).trim()==='';})) rows.pop();
  return rows;
}
/* ---------------- JSON ---------------- */
function jsonToAOA(text){
  var j;
  try{ j=JSON.parse(stripBOM(text)); }catch(e){ return {error:'File JSON không đúng định dạng: '+e.message}; }
  if(!Array.isArray(j)){
    if(j&&(Array.isArray(j.words)||Array.isArray(j.cards))) j=j.words||j.cards;
    else if(j&&typeof j==='object') j=[j];
    else return {error:'JSON phải là mảng các từ (hoặc {"words": [...]})'};
  }
  if(!j.length) return {aoa:[],empty:true};
  if(Array.isArray(j[0])){
    return {aoa:j.map(function(r){return r.map(function(c){return c==null?'':String(c)})})};
  }
  /* mảng object: tiêu đề = hợp các khoá (giữ thứ tự xuất hiện) */
  var keys=[],seen={};
  j.forEach(function(o){ if(o&&typeof o==='object') Object.keys(o).forEach(function(k){ if(!seen[k]){seen[k]=1;keys.push(k)} }); });
  var aoa=[keys];
  j.forEach(function(o){ aoa.push(keys.map(function(k){ var v=o?o[k]:''; return v==null?'':String(v); })); });
  return {aoa:aoa};
}

/* ---------------- Excel (SheetJS) ---------------- */
function xlsxAvailable(){ try{ return typeof window!=='undefined'&&!!window.XLSX&&typeof window.XLSX.read==='function'; }catch(e){ return false; } }
function readWorkbook(buf){
  if(!xlsxAvailable()) return {error:'Thư viện đọc Excel (SheetJS) chưa tải được. Kiểm tra file vendor/xlsx-0.18.5.full.min.js có trong thư mục dự án.'};
  try{
    var wb=window.XLSX.read(buf,{type:'array'});
    return {wb:wb,sheets:wb.SheetNames||[]};
  }catch(e){ return {error:'Không đọc được file Excel: '+e.message}; }
}
function sheetToAOA(wb,name){
  try{
    var ws=wb.Sheets[name];
    if(!ws) return {error:'Không tìm thấy sheet "'+name+'"'};
    var aoa=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
    aoa=aoa.map(function(r){ return r.map(function(c){ return c==null?'':String(c); }); });
    while(aoa.length&&aoa[aoa.length-1].every(function(c){return String(c).trim()==='';})) aoa.pop();
    return {aoa:aoa};
  }catch(e){ return {error:'Không đọc được sheet "'+name+'": '+e.message}; }
}

/* ---------------- nhận diện ---------------- */
function detectHeaderRow(aoa){
  var limit=Math.min(3,aoa.length);
  for(var i=0;i<limit;i++){
    var row=aoa[i],hits=0,nonEmpty=0;
    row.forEach(function(c){
      if(String(c).trim()==='')return; nonEmpty++;
      if(aliasField(c,'en')||aliasField(c,'ko')) hits++;
    });
    if(nonEmpty>0&&hits/nonEmpty>=0.5) return i;
  }
  return -1;
}
function guessMapping(headerRow,lang){
  var fields=lang==='ko'?KO_FIELDS:EN_FIELDS,map={},used={};
  headerRow.forEach(function(h,ci){
    var f=aliasField(h,lang);
    if(f&&fields.indexOf(f)>=0&&!used[f]){ map[ci]=f; used[f]=1; }
  });
  return map;
}
function positionalMapping(lang){
  var order=lang==='ko'?['head','vi','roman','topic','ex','level']:['head','vi','ipa','pos','level','topic','ex','exvi'];
  var map={}; order.forEach(function(f,i){ map[i]=f; }); return map;
}
function detectLangFromRows(aoa,startRow,headCol){
  var ko=0,en=0;
  for(var i=startRow;i<Math.min(aoa.length,startRow+50);i++){
    var v=(aoa[i]&&aoa[i][headCol])||'';
    if(hasHangul(v)) ko++;
    else if(hasLatin(v)) en++;
  }
  if(ko>0&&en===0) return 'ko';
  if(en>0&&ko===0) return 'en';
  if(ko>en) return 'ko';
  if(en>ko) return 'en';
  return '';
}
/* Chuẩn hoá 1 dòng thành từ vựng. Trả về {w, err}. */
var LEVELS=['A1','A2','B1','B2','C1','C2'];
function normLevel(v){
  v=String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  return LEVELS.indexOf(v)>=0?v:'';
}
function rowToWord(cells,map,lang,srcInfo){
  var w={head:'',vi:'',ipa:'',pos:'',level:'',topic:'',ex:'',exvi:'',roman:''};
  Object.keys(map).forEach(function(ci){
    var f=map[ci],v=cells[+ci];
    if(v==null)return;
    v=String(v).trim();
    if(f==='level') w.level=normLevel(v);
    else if(f==='pos') w.pos=v.toLowerCase().slice(0,12);
    else w[f]=v;
  });
  w.head=clampStr(w.head,120); w.vi=clampStr(w.vi,300);
  var err='';
  if(!w.head) err='Thiếu từ gốc';
  else if(!w.vi) err='Thiếu nghĩa tiếng Việt';
  if(!w.topic) w.topic='daily';
  if(!w.pos) w.pos='n';
  return {w:w,err:err,src:srcInfo||null};
}

/* ---------------- chỉ mục từ đã có ---------------- */
function enWordsList(){
  try{ callBuildWords(); var v=V15(); if(v&&v.words) return v.words; }catch(e){}
  return [];
}
function koLevelMap(){
  try{ if(!S.v7)S.v7={}; if(!S.v7.ko16)S.v7.ko16={levels:{}}; return S.v7.ko16.levels; }catch(e){ return {}; }
}
/* Trả về Map khoá -> {id, custom, word, deck} */
function buildExistingIndex(lang,deckId){
  var idx=new Map();
  if(lang==='en'){
    var dm={}; try{ dm=(S.v7&&S.v7.en16&&S.v7.en16.map)||{}; }catch(e){}
    enWordsList().forEach(function(w){
      var k=normKey(w.en,'en');
      /* từ người dùng tự thêm (custom) được ưu tiên khi trùng từ có sẵn:
         cập nhật sẽ sửa đúng từ của người dùng, không sửa từ gốc. */
      if(k&&(w.custom||!idx.has(k))) idx.set(k,{id:w.id,custom:!!w.custom,word:w,deck:dm[w.id]||''});
    });
  }else{
    var cards=[]; try{ cards=S.cards||[]; }catch(e){}
    cards.forEach(function(c){
      var k=normKey(c.h,'ko')+'\u0000'+(c.d||'');
      if(!idx.has(k)) idx.set(k,{id:c.id,custom:false,word:c,deck:c.d||''});
    });
  }
  return idx;
}
function dupKeyFor(w,lang,deckId){
  if(lang==='en') return normKey(w.head,'en');
  return normKey(w.head,'ko')+'\u0000'+(deckId||'');
}

/* ---------------- bộ từ ---------------- */
function en16(){
  try{
    if(!S.v7)S.v7={};
    var e=S.v7.en16;
    if(!e){ e=S.v7.en16={decks:[{id:'en0',name:'Bộ mặc định'}],map:{},overrides:{}}; }
    e.decks=e.decks||[{id:'en0',name:'Bộ mặc định'}];
    e.map=e.map||{}; e.overrides=e.overrides||{};
    return e;
  }catch(err){ return {decks:[{id:'en0',name:'Bộ mặc định'}],map:{},overrides:{}}; }
}
function koDecks(){
  try{ return S.decks||[]; }catch(e){ return []; }
}
function deckName(lang,id){
  if(!id) return 'Chưa xếp bộ';
  if(lang==='en'){ var d=en16().decks.filter(function(x){return x.id===id})[0]; return d?d.name:'Chưa xếp bộ'; }
  var k=koDecks().filter(function(x){return x.id===id})[0]; return k?k.name:'(đã xoá)';
}
function createDeck(lang,name){
  name=String(name||'').trim();
  if(!name) return {error:'Tên bộ không được để trống'};
  if(lang==='en'){
    var e=en16();
    var dup=e.decks.filter(function(d){return d.name.toLowerCase()===name.toLowerCase()})[0];
    if(dup) return {id:dup.id,exists:true};
    var id='e'+uid16(); e.decks.push({id:id,name:name});
    try{ callSave15(); }catch(err){}
    return {id:id};
  }
  try{
    if(typeof ensureDeck!=='function') return {error:'Không tạo được bộ tiếng Hàn (thiếu hàm ensureDeck)'};
    return {id:ensureDeck(name)};
  }catch(err){ return {error:String(err&&err.message||err)}; }
}
function renameDeck(lang,id,name){
  name=String(name||'').trim(); if(!name) return false;
  if(lang==='en'){ var d=en16().decks.filter(function(x){return x.id===id})[0]; if(!d)return false; d.name=name; try{callSave15()}catch(e){} return true; }
  try{ if(typeof renDeck==='function'){ renDeck(id,name); return true; } }catch(e){}
  return false;
}
function deleteDeck(lang,id){
  if(lang==='en'){
    var e=en16();
    if(e.decks.length<=1) return {error:'Phải giữ lại ít nhất một bộ tiếng Anh'};
    e.decks=e.decks.filter(function(d){return d.id!==id});
    Object.keys(e.map).forEach(function(wid){ if(e.map[wid]===id) delete e.map[wid]; });
    try{callSave15()}catch(err){}
    return {ok:true};
  }
  var decks=koDecks();
  if(decks.length<=1) return {error:'Phải giữ lại ít nhất một bộ tiếng Hàn'};
  var deflt=decks.filter(function(d){return d.id!==id})[0];
  try{
    (S.cards||[]).forEach(function(c){ if(c.d===id) c.d=deflt.id; });
    S.decks=decks.filter(function(d){return d.id!==id});
    if(S.deck===id)S.deck=deflt.id;
    if(typeof save==='function')save();
    if(typeof startSession==='function')startSession();
    return {ok:true,movedTo:deflt.name};
  }catch(err){ return {error:String(err&&err.message||err)}; }
}
function mergeDecks(lang,fromId,toId){
  if(fromId===toId) return {error:'Hai bộ phải khác nhau'};
  if(lang==='en'){
    var e=en16();
    Object.keys(e.map).forEach(function(wid){ if(e.map[wid]===fromId) e.map[wid]=toId; });
    var r=deleteDeck('en',fromId); if(r.error)return r;
    try{callSave15()}catch(err){}
    return {ok:true};
  }
  try{
    (S.cards||[]).forEach(function(c){ if(c.d===fromId) c.d=toId; });
    S.decks=koDecks().filter(function(d){return d.id!==fromId});
    if(S.deck===fromId)S.deck=toId;
    if(typeof save==='function')save();
    return {ok:true};
  }catch(err){ return {error:String(err&&err.message||err)}; }
}
function moveWord(lang,wordId,toDeckId){
  if(lang==='en'){ var e=en16(); if(toDeckId)e.map[wordId]=toDeckId; else delete e.map[wordId]; try{callSave15()}catch(err){} return true; }
  try{ var c=(S.cards||[]).filter(function(x){return x.id===wordId})[0]; if(!c)return false; c.d=toDeckId; if(typeof save==='function')save(); return true; }catch(err){ return false; }
}

/* ---------------- xuất ---------------- */
function csvEscape(s){ s=String(s==null?'':s); return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function rowsToCSV(headers,rows){ return '\uFEFF'+[headers].concat(rows).map(function(r){return r.map(csvEscape).join(',')}).join('\r\n'); }
function gatherExport(lang,deckId){
  var headers,rows=[];
  if(lang==='en'){
    headers=['English','Vietnamese','IPA','POS','Level','Topic','Example','Example Translation'];
    var dm={}; try{ dm=en16().map; }catch(e){}
    enWordsList().forEach(function(w){
      if(deckId&&deckId!=='ALL'&&(dm[w.id]||'')!==deckId) return;
      rows.push([w.en,w.vi,w.ipa||'',w.pos||'',w.lv||'',w.t||'',w.ex||'',w.exvi||'']);
    });
  }else{
    headers=['Korean','Vietnamese','Romanization','Topic','Example','Level'];
    var lv=koLevelMap();
    (S.cards||[]).forEach(function(c){
      if(deckId&&deckId!=='ALL'&&c.d!==deckId) return;
      rows.push([c.h,c.m,c.p||'',c.g||'',c.e||'',lv[c.id]||'']);
    });
  }
  return {headers:headers,rows:rows};
}
function downloadBlob(name,blob){
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1500);
}
function exportVocab(lang,deckId,format){
  var g=gatherExport(lang,deckId||'ALL');
  var tag=(deckId&&deckId!=='ALL')?deckName(lang,deckId).replace(/[^\wÀ-ỹ\-]+/g,'-'):'tat-ca';
  var base='vocab-'+lang+'-'+tag+'-'+todayStr();
  try{
    if(format==='xlsx'){
      if(!xlsxAvailable()){ pop('Thư viện Excel chưa tải được. Hãy dùng Xuất CSV hoặc JSON.'); return false; }
      var ws=window.XLSX.utils.json_to_sheet(g.rows.map(function(r){ var o={}; g.headers.forEach(function(h,i){o[h]=r[i]}); return o; }));
      var wb=window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb,ws,'Vocabulary');
      try{ window.XLSX.writeFile(wb,base+'.xlsx'); }
      catch(e){ var buf=window.XLSX.write(wb,{bookType:'xlsx',type:'array'}); downloadBlob(base+'.xlsx',new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})); }
    }else if(format==='csv'){
      downloadBlob(base+'.csv',new Blob([rowsToCSV(g.headers,g.rows)],{type:'text/csv;charset=utf-8'}));
    }else{
      var arr=g.rows.map(function(r){ var o={}; g.headers.forEach(function(h,i){o[h]=r[i]}); return o; });
      downloadBlob(base+'.json',new Blob([JSON.stringify(arr,null,2)],{type:'application/json'}));
    }
    pop('Đã xuất '+g.rows.length+' từ ('+format.toUpperCase()+').');
    return true;
  }catch(e){ pop('Xuất file lỗi: '+(e&&e.message||e)); return false; }
}

/* ============================================================
   WIZARD — trạng thái nằm trong bộ nhớ, chỉ lưu khi bấm
   "Xác nhận nhập từ vựng" ở bước 4.
   ============================================================ */
var W=null;
function defaultDeckId(lang){
  try{
    if(lang==='ko'){ if(S.deck) return S.deck; if(S.decks&&S.decks[0]) return S.decks[0].id; return ''; }
    return 'en0';
  }catch(e){ return lang==='ko'?'':'en0'; }
}
function newWizard(lang){
  return {
    lang:lang||'en', step:1, files:[], /* {name,size,kind,aoa,sheet,sheets,wb} */
    sheet:'', sheetAsDeck:false, headerRow:-1, mapping:{}, hasHeader:false,
    deckId:defaultDeckId(lang||'en'), dupMode:'skip', rows:[], /* {w,err,src,status,checked} */
    page:0, perPage:50, search:'', errOnly:false,
    cancelled:false, busy:false, stats:null, result:null, deckMgrOpen:false
  };
}
function wizardEl(){ return document.getElementById('v16ov'); }
function openWizard(lang){
  W=newWizard(lang||'en');
  if(!document.getElementById('v16ov')){
    var div=document.createElement('div');
    div.id='v16ov'; div.className='v16ov';
    document.body.appendChild(div);
  }
  renderWizard();
  var ov=wizardEl(); if(ov) ov.scrollTop=0;
}
function closeWizard(){
  if(W&&W.step<4){ if(!confirm('Huỷ nhập từ vựng? Dữ liệu chưa lưu sẽ mất.')) return; }
  W=null;
  var ov=wizardEl(); if(ov) ov.remove();
  try{ callRenderTab(); }catch(e){}
  try{ if(typeof render==='function')render(); }catch(e){}
}
function setStep(n){ if(!W)return; W.step=n; W.page=0; renderWizard(); }
function stepTitles(){ return ['1. Chọn file','2. Ánh xạ cột','3. Xem trước','4. Kết quả']; }

/* ---------- bước 1: đọc file ---------- */
function fileKind(name){
  var n=String(name||'').toLowerCase();
  if(/\.xlsx?$/.test(n)) return 'xlsx';
  if(/\.csv$/.test(n)) return 'csv';
  if(/\.tsv$/.test(n)) return 'tsv';
  if(/\.txt$/.test(n)) return 'txt';
  if(/\.json$/.test(n)) return 'json';
  return '';
}
function readFiles(fileList){
  if(!W) return;
  var files=Array.prototype.slice.call(fileList||[]);
  if(!files.length) return;
  var bad=files.filter(function(f){ return !fileKind(f.name); });
  if(bad.length){ pop('Không hỗ trợ file: '+bad.map(function(f){return f.name}).join(', ')+' — chỉ nhận .xlsx, .xls, .csv, .tsv, .txt, .json'); }
  files=files.filter(function(f){ return !!fileKind(f.name); });
  if(!files.length) return;
  W.busy=true; W.cancelled=false;
  renderWizard();
  var queue=files.slice(),done=0;
  function next(){
    if(W.cancelled){ W.busy=false; pop('Đã huỷ đọc file.'); renderWizard(); return; }
    var f=queue.shift();
    if(!f){ W.busy=false; renderWizard(); return; }
    var kind=fileKind(f.name);
    var rd=new FileReader();
    rd.onerror=function(){ W.files.push({name:f.name,size:f.size,kind:kind,error:'Không đọc được file'}); done++; renderWizard(); next(); };
    if(kind==='xlsx'){
      rd.onload=function(){
        var r=readWorkbook(rd.result);
        if(r.error){ W.files.push({name:f.name,size:f.size,kind:kind,error:r.error}); }
        else{
          var first=r.sheets[0]||'';
          var a=sheetToAOA(r.wb,first);
          W.files.push({name:f.name,size:f.size,kind:kind,wb:r.wb,sheets:r.sheets,sheet:first,aoa:a.aoa||[],error:a.error||''});
        }
        done++; renderWizard(); next();
      };
      rd.readAsArrayBuffer(f);
    }else{
      rd.onload=function(){
        var text=String(rd.result||'');
        if(kind==='json'){
          var j=jsonToAOA(text);
          W.files.push({name:f.name,size:f.size,kind:kind,aoa:j.aoa||[],error:j.error||''});
        }else{
          var d=detectDelimiter(text);
          W.files.push({name:f.name,size:f.size,kind:kind,aoa:parseDelimited(text,d),delim:d,error:''});
        }
        done++; renderWizard(); next();
      };
      rd.readAsText(f,'utf-8');
    }
  }
  next();
}
function removeFile(i){ if(!W)return; W.files.splice(i,1); if(!W.files.length){W.sheet='';} renderWizard(); }
function setSheet(fileIdx,name){
  if(!W)return;
  var f=W.files[fileIdx]; if(!f||!f.wb)return;
  var a=sheetToAOA(f.wb,name);
  f.sheet=name; f.aoa=a.aoa||[]; f.error=a.error||'';
  renderWizard();
}
/* Gộp các file đã đọc thành một AOA duy nhất (ghi rõ nguồn từng dòng). */
function collectAOA(){
  var all=[],srcs=[];
  W.files.forEach(function(f){
    if(f.error||!f.aoa||!f.aoa.length) return;
    f.aoa.forEach(function(row,i){ all.push(row); srcs.push({file:f.name,sheet:f.sheet||'',row:i+1}); });
  });
  return {aoa:all,srcs:srcs};
}
/* ---------- bước 2: nhận diện ---------- */
function runDetect(){
  if(!W||!W.files.length) return;
  var c=collectAOA();
  if(!c.aoa.length){ pop('Không đọc được dòng nào từ các file đã chọn. Kiểm tra file có nội dung và đúng định dạng.'); return; }
  var hdr=detectHeaderRow(c.aoa);
  W.headerRow=hdr; W.hasHeader=hdr>=0;
  var headRow=hdr>=0?c.aoa[hdr]:c.aoa[0];
  /* ngôn ngữ: ưu tiên lựa chọn ở bước 1, tự nhận diện để kiểm chứng */
  var headCol=0;
  var detected=detectLangFromRows(c.aoa,hdr>=0?hdr+1:0,headCol);
  if(detected&&detected!==W.lang){
    /* chỉ gợi ý, không tự đổi: người dùng đã chọn ở bước 1 */
    W.langHint=detected;
  }else W.langHint='';
  W.mapping=hdr>=0?guessMapping(headRow,W.lang):positionalMapping(W.lang);
  W._aoa=c.aoa; W._srcs=c.srcs;
  W.step=2; renderWizard();
}
function applyMappingAndClassify(done){
  if(!W) return;
  var aoa=W._aoa,srcs=W._srcs;
  var startRow=W.hasHeader?W.headerRow+1:0;
  var idx=buildExistingIndex(W.lang,W.deckId);
  var seenInFile=new Map();
  var rows=[],i=startRow;
  var totalRows=Math.max(0,aoa.length-startRow);
  W.cancelled=false; W.busy=true;
  function chunk(){
    if(W.cancelled){ W.busy=false; W.rows=[]; pop('Đã huỷ chuẩn bị nhập.'); renderWizard(); return; }
    var end=Math.min(aoa.length,i+500);
    for(;i<end;i++){
      var cells=aoa[i]||[];
      if(cells.every(function(c){return String(c).trim()==='';})) continue;
      var r=rowToWord(cells,W.mapping,W.lang,srcs[i]);
      var rec={w:r.w,err:r.err,src:r.src,status:'',checked:false,dupOf:null};
      if(!r.err){
        var k=dupKeyFor(r.w,W.lang,W.deckId);
        if(seenInFile.has(k)){ rec.status='dup-file'; rec.dupOf='trong file'; }
        else{
          seenInFile.set(k,1);
          var ex=idx.get(k);
          if(ex){ rec.status='dup-existing'; rec.dupOf=ex; }
          else rec.status='new';
        }
      }else rec.status='error';
      /* mặc định chọn: từ mới + từ lỗi không chọn; từ trùng theo chế độ */
      if(rec.status==='new') rec.checked=true;
      else if(rec.status==='dup-existing'){
        rec.checked=(W.dupMode==='update'||W.dupMode==='keep');
      }
      rows.push(rec);
    }
    var pct=totalRows?Math.round((i-startRow)/totalRows*100):100;
    var bar=document.getElementById('v16prog');
    if(bar){ bar.style.width=pct+'%'; var t=document.getElementById('v16progt'); if(t)t.textContent='Đang chuẩn bị: '+(i-startRow)+'/'+totalRows+' dòng ('+pct+'%)'; }
    if(i<aoa.length){ setTimeout(chunk,0); }
    else{
      W.busy=false; W.rows=rows; W.page=0;
      computeStats();
      W.step=3; renderWizard();
      if(typeof done==='function')done();
    }
  }
  renderWizard();
  setTimeout(chunk,30);
}
function computeStats(){
  var s={total:W.rows.length,valid:0,errors:0,dupFile:0,dupExisting:0,willAdd:0,willUpdate:0,willKeep:0,willSkip:0,selected:0};
  W.rows.forEach(function(r){
    if(r.status==='error') s.errors++;
    else s.valid++;
    if(r.status==='dup-file') s.dupFile++;
    if(r.status==='dup-existing') s.dupExisting++;
    if(!r.checked){ s.willSkip++; return; }
    s.selected++;
    if(r.status==='new') s.willAdd++;
    else if(r.status==='dup-existing'){
      if(W.dupMode==='update') s.willUpdate++;
      else if(W.dupMode==='keep') s.willKeep++;
      else s.willSkip++;
    }else if(r.status==='dup-file'){
      if(W.dupMode==='keep') s.willKeep++;
      else s.willSkip++;
    }
  });
  W.stats=s; return s;
}
function setDupMode(m){ if(!W)return; W.dupMode=m; W.rows.forEach(function(r){ if(r.status==='dup-existing'||r.status==='dup-file'){ r.checked=(m==='update'||m==='keep'); } }); computeStats(); renderWizard(); }
function visibleRows(){
  var q=(W.search||'').toLowerCase();
  return W.rows.filter(function(r){
    if(W.errOnly&&r.status!=='error') return false;
    if(!q) return true;
    return (r.w.head+' '+r.w.vi+' '+(r.w.topic||'')).toLowerCase().indexOf(q)>=0;
  });
}
function toggleRow(i,v){ var r=W.rows[i]; if(r){ r.checked=!!v; computeStats(); renderWizard(); } }
function togglePage(v){
  var vis=visibleRows();
  var start=W.page*W.perPage,end=Math.min(vis.length,start+W.perPage);
  for(var p=start;p<end;p++){ var idx=W.rows.indexOf(vis[p]); if(idx>=0)W.rows[idx].checked=!!v; }
  computeStats(); renderWizard();
}
function deleteRow(i){ if(!W)return; W.rows.splice(i,1); computeStats(); renderWizard(); }
function editCell(i,field,val){
  var r=W.rows[i]; if(!r)return;
  r.w[field]=String(val==null?'':val).trim();
  if(field==='level') r.w.level=normLevel(r.w.level);
  /* kiểm tra lại dòng */
  if(!r.w.head) r.err='Thiếu từ gốc';
  else if(!r.w.vi) r.err='Thiếu nghĩa tiếng Việt';
  else r.err='';
  r.status=r.err?'error':(r.status==='error'?'new':r.status);
  computeStats();
}

/* ---------- bước 4: áp dụng ---------- */
function storageSizeNow(){
  try{ return (localStorage.getItem('hanvocab.v1')||'').length; }catch(e){ return 0; }
}
function confirmImport(){
  if(!W) return;
  computeStats();
  var s=W.stats;
  if(!s.selected){ pop('Chưa chọn từ nào để nhập.'); return; }
  /* kiểm tra dung lượng trước khi lưu */
  var now=storageSizeNow();
  var est=0;
  W.rows.forEach(function(r){ if(r.checked) est+=JSON.stringify(r.w).length+40; });
  var LIMIT=4800000; /* ~4.8MB: ngưỡng an toàn dưới giới hạn ~5MB của localStorage */
  if(now+est>LIMIT){
    if(!confirm('Dữ liệu sau khi nhập ước tính '+((now+est)/1048576).toFixed(1)+' MB, gần/vượt giới hạn localStorage (~5 MB).\n\nBấm OK để vẫn nhập (có thể lỗi nếu đầy), hoặc Cancel để huỷ và xuất sao lưu trước.')) return;
  }
  W.step=4; W.busy=true; W.cancelled=false;
  renderWizard();
  setTimeout(function(){ applyImport(); },50);
}
function applyImport(){
  var sel=W.rows.filter(function(r){ return r.checked&&r.status!=='error'; });
  var added=0,updated=0,kept=0,skipped=0,errors=0;
  var t0=Date.now();
  try{
    if(W.lang==='en') applyEN(sel,function(c){added+=c.added;updated+=c.updated;kept+=c.kept;});
    else applyKO(sel,function(c){added+=c.added;updated+=c.updated;kept+=c.kept;});
  }catch(e){
    W.busy=false;
    W.result={ok:false,error:String(e&&e.message||e),added:added,updated:updated,kept:kept,skipped:skipped,errors:errors,ms:Date.now()-t0};
    renderWizard(); return;
  }
  W.rows.forEach(function(r){ if(!r.checked) skipped++; if(r.status==='error') errors++; });
  try{ callBuildWords(); }catch(e){}
  try{ callSave15(); }catch(e){}
  try{ if(typeof save==='function')save(); }catch(e){}
  var after=storageSizeNow();
  W.busy=false;
  W.result={ok:true,added:added,updated:updated,kept:kept,skipped:skipped,errors:errors,ms:Date.now()-t0,sizeAfter:after};
  renderWizard();
  try{ callRenderTab(); }catch(e){}
  try{ if(typeof render==='function')render(); }catch(e){}
}
function applyEN(sel,cb){
  var old=getEnOld();
  if(!old||!old.custom) throw new Error('Không truy cập được dữ liệu tiếng Anh (thiếu __v15.enOld). Dữ liệu chưa thay đổi.');
  old.custom=old.custom||[];
  var e16=en16();
  var idx=buildExistingIndex('en',W.deckId);
  var c={added:0,updated:0,kept:0};
  var deckTarget=W.deckId||'';
  sel.forEach(function(r){
    var w=r.w,k=normKey(w.head,'en');
    var ex=idx.get(k);
    if(!ex||W.dupMode==='keep'&&(r.status==='dup-existing'||r.status==='dup-file')){
      var uid=uid16();
      old.custom.push({t:w.topic||'daily',en:w.head,vi:w.vi,ipa:w.ipa||'',pos:w.pos||'n',lv:w.level||'A1',ex:w.ex||'',exvi:w.exvi||'',uid:uid});
      if(deckTarget) e16.map[uid]=deckTarget;
      idx.set(k,{id:uid,custom:true});
      if(ex) c.kept++; else c.added++;
    }else if(r.status==='dup-existing'){
      if(W.dupMode==='update'){
        if(ex.custom){
          var rec=old.custom.filter(function(x){return x.uid===ex.id})[0];
          if(rec){ rec.vi=w.vi; rec.ipa=w.ipa||rec.ipa; rec.pos=w.pos||rec.pos; rec.lv=w.level||rec.lv; rec.t=w.topic||rec.t; rec.ex=w.ex||rec.ex; rec.exvi=w.exvi||rec.exvi; }
        }else{
          e16.overrides[ex.id]=e16.overrides[ex.id]||{};
          e16.overrides[ex.id].vi=w.vi;
          if(w.ipa)e16.overrides[ex.id].ipa=w.ipa;
          if(w.pos)e16.overrides[ex.id].pos=w.pos;
          if(w.level)e16.overrides[ex.id].lv=w.level;
          if(w.topic)e16.overrides[ex.id].t=w.topic;
          if(w.ex)e16.overrides[ex.id].ex=w.ex;
          if(w.exvi)e16.overrides[ex.id].exvi=w.exvi;
        }
        if(deckTarget) e16.map[ex.id]=deckTarget;
        c.updated++;
      }
    }
  });
  cb(c);
}
function applyKO(sel,cb){
  var c={added:0,updated:0,kept:0};
  var lv=koLevelMap();
  var deckTarget=W.deckId||(S.deck||(S.decks&&S.decks[0]&&S.decks[0].id)||'');
  sel.forEach(function(r){
    var w=r.w;
    var key=normKey(w.head,'ko')+'\u0000'+deckTarget;
    var ex=null;
    (S.cards||[]).forEach(function(cd){ if(normKey(cd.h,'ko')+'\u0000'+(cd.d||'')===key) ex=cd; });
    var isDup=r.status==='dup-existing'||r.status==='dup-file';
    if(!ex||(W.dupMode==='keep'&&isDup)){
      var id=uid16();
      S.cards.push({id:id,h:w.head,m:w.vi,p:w.roman||'',e:w.ex||'',g:w.topic||'',box:0,due:0,d:deckTarget});
      if(w.level) lv[id]=w.level;
      if(ex) c.kept++; else c.added++;
    }else if(isDup&&W.dupMode==='update'){
      ex.m=w.vi;
      if(w.roman)ex.p=w.roman;
      if(w.ex)ex.e=w.ex;
      if(w.topic)ex.g=w.topic;
      if(w.level) lv[ex.id]=w.level;
      c.updated++;
    }
  });
  cb(c);
}


/* ---------------- hiển thị wizard ---------------- */
function deckOptionsHTML(lang,selId){
  var opts='';
  if(lang==='en'){
    opts+='<option value="">Chưa xếp bộ</option>';
    en16().decks.forEach(function(d){ opts+='<option value="'+d.id+'"'+(d.id===selId?' selected':'')+'>'+esc(d.name)+'</option>'; });
  }else{
    koDecks().forEach(function(d){ opts+='<option value="'+d.id+'"'+(d.id===selId?' selected':'')+'>'+esc(d.name)+'</option>'; });
  }
  return opts;
}
function deckManagerHTML(){
  var lang=W.lang;
  var decks=lang==='en'?en16().decks:koDecks();
  var h='<div class="v16deckmgr"><h4>Quản lý bộ từ '+(lang==='en'?'tiếng Anh':'tiếng Hàn')+'</h4>';
  h+='<p class="mute">Bộ từ tiếng Anh và tiếng Hàn độc lập. Xoá bộ chỉ xoá bộ, không xoá từ (từ tiếng Hàn được chuyển về bộ mặc định).</p>';
  h+=decks.map(function(d){
    var n=lang==='en'?Object.keys(en16().map).filter(function(k){return en16().map[k]===d.id}).length:(S.cards||[]).filter(function(c){return c.d===d.id}).length;
    return '<div class="v16deckrow"><input type="text" value="'+esc(d.name)+'" onchange="__v16.renameDeck(\''+lang+'\',\''+d.id+'\',this.value)">'
      +'<span class="mute">'+n+' từ</span>'
      +'<button class="btn sm" onclick="__v16.deleteDeckUI(\''+lang+'\',\''+d.id+'\')">Xoá</button></div>';
  }).join('');
  h+='<div class="v16deckrow"><input type="text" id="v16-newdeck" placeholder="Tên bộ mới…"><button class="btn sm pri" onclick="__v16.createDeckUI(\''+lang+'\')">Tạo bộ</button></div>';
  h+='<div class="v16deckrow"><span>Gộp bộ</span><select id="v16-merge-from">'+decks.map(function(d){return '<option value="'+d.id+'">'+esc(d.name)+'</option>'}).join('')+'</select><span>→</span><select id="v16-merge-to">'+decks.map(function(d){return '<option value="'+d.id+'">'+esc(d.name)+'</option>'}).join('')+'</select><button class="btn sm" onclick="__v16.mergeDeckUI(\''+lang+'\')">Gộp</button></div>';
  h+='</div>';
  return h;
}
function sampleButtonsHTML(){
  return '<div class="v16samples"><span class="mute">File mẫu (điền từ vào rồi tải lên lại):</span> '
    +'<a class="btn sm" href="samples/english-sample.xlsx" download>Excel Anh</a> '
    +'<a class="btn sm" href="samples/korean-sample.xlsx" download>Excel Hàn</a> '
    +'<a class="btn sm" href="samples/english-sample.csv" download>CSV Anh</a> '
    +'<a class="btn sm" href="samples/vocab-sample.json" download>JSON</a></div>';
}
function renderWizard(){
  var ov=wizardEl(); if(!ov||!W) return;
  var lang=W.lang;
  var h='<div class="v16card">'
    +'<div class="v16head"><b>🧠 Nhập từ vựng thông minh</b><span class="mute">V8 · xử lý ngay trên trình duyệt, không tải lên máy chủ</span>'
    +'<button class="btn sm" onclick="__v16.close()">✕ Đóng</button></div>'
    +'<div class="v16steps">'+stepTitles().map(function(t,i){
        return '<span class="v16step'+(W.step===i+1?' on':'')+(W.step>i+1?' done':'')+'">'+t+'</span>';
      }).join('<span class="v16arr">›</span>')+'</div>';
  if(W.step===1) h+=step1HTML();
  else if(W.step===2) h+=step2HTML();
  else if(W.step===3) h+=step3HTML();
  else h+=step4HTML();
  h+='</div>';
  ov.innerHTML=h;
  /* gắn drag & drop sau mỗi lần render */
  var dz=document.getElementById('v16dz');
  if(dz){
    ['dragenter','dragover'].forEach(function(ev){ dz.addEventListener(ev,function(e){ e.preventDefault(); dz.classList.add('over'); }); });
    ['dragleave','drop'].forEach(function(ev){ dz.addEventListener(ev,function(e){ e.preventDefault(); dz.classList.remove('over'); }); });
    dz.addEventListener('drop',function(e){ if(e.dataTransfer&&e.dataTransfer.files) readFiles(e.dataTransfer.files); });
  }
}
function step1HTML(){
  var h='<h3>Bước 1 — Chọn ngôn ngữ và tải file</h3>'
    +'<div class="v16langpick">'
    +'<button class="btn '+(W.lang==='en'?'pri':'')+'" onclick="__v16.setLang(\'en\')">🇬🇧 Tiếng Anh</button>'
    +'<button class="btn '+(W.lang==='ko'?'pri':'')+'" onclick="__v16.setLang(\'ko\')">🇰🇷 Tiếng Hàn</button>'
    +'<span class="mute">Hệ thống sẽ tự nhận diện lại từ nội dung file để kiểm chứng.</span></div>'
    +sampleButtonsHTML()
    +'<div id="v16dz" class="v16dz">Kéo thả file vào đây<br><span class="mute">.xlsx, .xls, .csv, .tsv, .txt, .json — được chọn nhiều file cùng lúc</span><br>'
    +'<label class="btn pri" style="margin-top:8px">Chọn file<input type="file" id="v16file" multiple accept=".xlsx,.xls,.csv,.tsv,.txt,.json" style="display:none" onchange="__v16.readFiles(this.files);this.value=\'\'"></label></div>';
  if(W.busy){
    h+='<div class="v16progwrap"><div class="v16prog"><i id="v16prog" style="width:0%"></i></div><span id="v16progt" class="mute">Đang đọc file…</span> <button class="btn sm bad" onclick="__v16.cancel()">Huỷ</button></div>';
  }
  if(W.files.length){
    h+='<h4>File đã tải ('+W.files.length+')</h4>';
    h+=W.files.map(function(f,i){
      var info=f.error?'<span class="v16err">'+esc(f.error)+'</span>':((f.aoa?f.aoa.length:0)+' dòng đọc được');
      var sheet='';
      if(f.kind==='xlsx'&&f.sheets&&f.sheets.length>1){
        sheet='<br><label>Sheet: <select onchange="__v16.setSheet('+i+',this.value)">'+f.sheets.map(function(s){return '<option'+(s===f.sheet?' selected':'')+'>'+esc(s)+'</option>'}).join('')+'</select></label>'
          +'<label class="chk"><input type="checkbox" '+(W.sheetAsDeck?'checked':'')+' onchange="__v16.setSheetAsDeck(this.checked)"> Tạo bộ từ theo tên sheet</label>';
      }else if(f.kind==='xlsx'&&f.sheets){
        sheet='<br><span class="mute">Sheet: '+esc(f.sheet||'')+'</span>';
      }
      return '<div class="v16filerow"><b>'+esc(f.name)+'</b> <span class="mute">'+(f.size/1024).toFixed(1)+' KB · '+info+'</span>'+sheet
        +' <button class="btn sm bad" onclick="__v16.removeFile('+i+')">Xoá</button></div>';
    }).join('');
    h+='<div class="acts"><button class="btn pri" onclick="__v16.runDetect()">Tiếp tục: Nhận diện cột →</button></div>';
  }
  h+='<h4>Bộ từ đích</h4><p class="mute">Từ mới sẽ vào bộ này. Có thể tạo bộ mới hoặc quản lý bộ bên dưới.</p>'
    +'<div class="v16row"><select id="v16-deck" onchange="__v16.setDeck(this.value)">'+deckOptionsHTML(W.lang,W.deckId)+'</select>'
    +'<button class="btn sm" onclick="__v16.toggleDeckMgr()">Quản lý bộ từ</button></div>';
  if(W.deckMgrOpen) h+=deckManagerHTML();
  return h;
}
function step2HTML(){
  var aoa=W._aoa||[];
  var hdr=W.hasHeader?aoa[W.headerRow]||[]:null;
  var cols=0;
  aoa.slice(0,20).forEach(function(r){ if(r.length>cols)cols=r.length; });
  var fields=W.lang==='ko'?KO_FIELDS:EN_FIELDS;
  var h='<h3>Bước 2 — Nhận diện và ánh xạ cột</h3>';
  if(W.langHint) h+='<p class="v16warn">⚠ Nội dung file giống tiếng '+(W.langHint==='ko'?'Hàn':'Anh')+' hơn lựa chọn ở bước 1. Kiểm tra lại ngôn ngữ nếu cần.</p>';
  h+='<p class="mute">Đã đọc '+aoa.length+' dòng'+(W.hasHeader?' · phát hiện dòng tiêu đề ở dòng '+(W.headerRow+1):' · không thấy dòng tiêu đề, dùng thứ tự cột mặc định')+'.</p>';
  h+='<table class="v16map"><tr><th>Cột</th><th>Tiêu đề / mẫu</th><th>Ánh xạ tới</th></tr>';
  for(var ci=0;ci<cols;ci++){
    var samples=[];
    for(var i=W.hasHeader?W.headerRow+1:0;i<Math.min(aoa.length,(W.hasHeader?W.headerRow+1:0)+3);i++){ var v=(aoa[i]||[])[ci]; if(v!=null&&String(v).trim()!=='')samples.push(String(v).slice(0,24)); }
    h+='<tr><td>Cột '+(ci+1)+'</td><td><b>'+esc(hdr?hdr[ci]||'':'(không tiêu đề)')+'</b>'+(samples.length?'<br><span class="mute">'+esc(samples.join(' · '))+'</span>':'')+'</td>'
      +'<td><select onchange="__v16.setMap('+ci+',this.value)"><option value="">— Bỏ qua cột —</option>'
      +fields.map(function(f){ return '<option value="'+f+'"'+(W.mapping[ci]===f?' selected':'')+'>'+esc(FIELD_LABEL[f][W.lang]||f)+'</option>'; }).join('')
      +'</select></td></tr>';
  }
  h+='</table>';
  h+='<div class="v16row"><label>Bộ từ đích: <select onchange="__v16.setDeck(this.value)">'+deckOptionsHTML(W.lang,W.deckId)+'</select></label></div>';
  h+='<h4>Xử lý từ trùng</h4><div class="v16row">'
    +[['skip','Bỏ qua từ trùng'],['update','Cập nhật nghĩa & thông tin từ cũ (giữ ID, giữ tiến trình)'],['keep','Giữ cả hai (nghĩa/mục từ khác nhau)'],['new','Chỉ nhập từ mới']]
    .map(function(o){ return '<label class="chk"><input type="radio" name="v16dup" value="'+o[0]+'"'+(W.dupMode===o[0]?' checked':'')+' onchange="__v16.setDupMode(this.value)"> '+o[1]+'</label>'; }).join('')
    +'</div>';
  h+='<div class="acts"><button class="btn" onclick="__v16.setStep(1)">← Quay lại</button>'
    +'<button class="btn pri" onclick="__v16.applyMapping()">Xem trước →</button></div>';
  if(W.busy) h+='<div class="v16progwrap"><div class="v16prog"><i id="v16prog" style="width:0%"></i></div><span id="v16progt" class="mute">Đang chuẩn bị…</span> <button class="btn sm bad" onclick="__v16.cancel()">Huỷ</button></div>';
  return h;
}
function statusBadge(r){
  if(r.status==='new') return '<span class="v16b ok">Mới</span>';
  if(r.status==='dup-existing') return '<span class="v16b warn">Trùng'+(W.dupMode==='update'?' → cập nhật':W.dupMode==='keep'?' → giữ cả hai':' → bỏ qua')+'</span>';
  if(r.status==='dup-file') return '<span class="v16b warn">Trùng trong file</span>';
  return '<span class="v16b bad">Lỗi: '+esc(r.err||'')+'</span>';
}
function step3HTML(){
  var s=W.stats||computeStats();
  var vis=visibleRows();
  var pages=Math.max(1,Math.ceil(vis.length/W.perPage));
  if(W.page>=pages)W.page=pages-1;
  var start=W.page*W.perPage,pageRows=vis.slice(start,start+W.perPage);
  var h='<h3>Bước 3 — Xem trước, chỉnh sửa và xử lý từ trùng</h3>'
    +'<div class="v16statgrid">'
    +'<div class="v16stat"><b>'+s.total+'</b><span>dòng đọc được</span></div>'
    +'<div class="v16stat"><b>'+s.valid+'</b><span>từ hợp lệ</span></div>'
    +'<div class="v16stat"><b>'+(s.dupExisting+s.dupFile)+'</b><span>từ trùng</span></div>'
    +'<div class="v16stat"><b>'+s.errors+'</b><span>dòng lỗi</span></div>'
    +'<div class="v16stat"><b>'+s.willAdd+'</b><span>từ mới sẽ thêm</span></div>'
    +'<div class="v16stat"><b>'+s.willUpdate+'</b><span>từ cũ sẽ cập nhật</span></div>'
    +'</div>'
    +'<div class="v16row"><input class="v15input" style="flex:1" type="text" placeholder="Tìm trong bảng xem trước…" value="'+esc(W.search)+'" oninput="__v16.setSearch(this.value)">'
    +'<label class="chk"><input type="checkbox" '+(W.errOnly?'checked':'')+' onchange="__v16.setErrOnly(this.checked)"> Chỉ hiện dòng lỗi</label>'
    +'<button class="btn sm" onclick="__v16.togglePage(true)">Chọn trang này</button>'
    +'<button class="btn sm" onclick="__v16.togglePage(false)">Bỏ chọn trang</button></div>'
    +'<p class="mute">Bấm vào một ô để sửa trực tiếp. Bỏ chọn những từ không muốn nhập. Dữ liệu chỉ được lưu khi bấm “Xác nhận nhập từ vựng”.</p>';
  h+='<table class="v16prev"><tr><th></th><th>Từ gốc</th><th>Nghĩa tiếng Việt</th><th>'+(W.lang==='en'?'IPA · Loại':'Phiên âm')+'</th><th>Chủ đề</th><th>Trạng thái</th><th></th></tr>';
  pageRows.forEach(function(r){
    var gi=W.rows.indexOf(r);
    h+='<tr class="'+(r.status==='error'?'v16errrow':'')+'"><td><input type="checkbox" '+(r.checked?'checked':'')+' onchange="__v16.toggleRow('+gi+',this.checked)"></td>'
      +'<td contenteditable="true" onblur="__v16.editCell('+gi+',\'head\',this.textContent)">'+esc(r.w.head)+'</td>'
      +'<td contenteditable="true" onblur="__v16.editCell('+gi+',\'vi\',this.textContent)">'+esc(r.w.vi)+'</td>'
      +'<td contenteditable="true" onblur="__v16.editCell('+gi+',\''+(W.lang==='en'?'ipa':'roman')+'\',this.textContent)">'+esc(W.lang==='en'?((r.w.ipa||'')+' · '+(r.w.pos||'')):(r.w.roman||''))+'</td>'
      +'<td contenteditable="true" onblur="__v16.editCell('+gi+',\'topic\',this.textContent)">'+esc(r.w.topic||'')+'</td>'
      +'<td>'+statusBadge(r)+'</td>'
      +'<td><button class="btn sm bad" onclick="__v16.deleteRow('+gi+')">✕</button></td></tr>';
  });
  h+='</table>';
  if(!pageRows.length) h+='<p class="mute">Không có dòng nào khớp bộ lọc.</p>';
  h+='<div class="v16row"><button class="btn sm" '+(W.page<=0?'disabled':'')+' onclick="__v16.setPage('+(W.page-1)+')">← Trước</button>'
    +'<span class="mute">Trang '+(W.page+1)+'/'+pages+' · '+vis.length+' dòng sau lọc</span>'
    +'<button class="btn sm" '+(W.page>=pages-1?'disabled':'')+' onclick="__v16.setPage('+(W.page+1)+')">Sau →</button></div>';
  h+='<div class="acts"><button class="btn" onclick="__v16.setStep(2)">← Quay lại</button>'
    +'<button class="btn pri" onclick="__v16.confirmImport()">✓ Xác nhận nhập từ vựng ('+(s.selected||0)+' từ)</button></div>';
  return h;
}
function step4HTML(){
  if(W.busy) return '<h3>Bước 4 — Đang nhập…</h3><div class="v16progwrap"><div class="v16prog"><i style="width:60%"></i></div><span class="mute">Đang ghi dữ liệu, vui lòng chờ…</span></div>';
  var r=W.result||{};
  if(!r.ok) return '<h3>Bước 4 — Nhập lỗi</h3><p class="v16err">'+esc(r.error||'Lỗi không xác định')+'</p><p class="mute">Dữ liệu cũ không bị thay đổi. Hãy kiểm tra lại file và thử lại.</p><div class="acts"><button class="btn" onclick="__v16.setStep(3)">← Quay lại xem trước</button><button class="btn pri" onclick="__v16.close()">Đóng</button></div>';
  var h='<h3>Bước 4 — Báo cáo kết quả nhập</h3>'
    +'<div class="v16statgrid">'
    +'<div class="v16stat"><b>'+r.added+'</b><span>từ mới đã thêm</span></div>'
    +'<div class="v16stat"><b>'+r.updated+'</b><span>từ cũ đã cập nhật</span></div>'
    +'<div class="v16stat"><b>'+r.kept+'</b><span>từ giữ cả hai</span></div>'
    +'<div class="v16stat"><b>'+r.skipped+'</b><span>từ bỏ qua</span></div>'
    +'<div class="v16stat"><b>'+r.errors+'</b><span>dòng lỗi</span></div>'
    +'<div class="v16stat"><b>'+((r.ms||0)/1000).toFixed(1)+'s</b><span>thời gian nhập</span></div>'
    +'</div>'
    +'<p class="mute">Tiến trình ôn tập (hộp SRS, số lần đúng/sai, lịch ôn) của các từ được cập nhật vẫn giữ nguyên. Bản lưu hiện tại: '+(r.sizeAfter?((r.sizeAfter/1024).toFixed(1)+' KB'):'—')+'.</p>'
    +'<div class="acts"><button class="btn sm" onclick="__v16.downloadReport()">Tải báo cáo (.json)</button>'
    +'<button class="btn pri" onclick="__v16.close()">Xong ✓</button></div>';
  return h;
}

/* ---------------- hành động UI ---------------- */
function setLang(l){ if(!W)return; W.lang=l; W.deckId=defaultDeckId(l); W.langHint=''; renderWizard(); }
function setDeck(id){ if(!W)return; W.deckId=id; renderWizard(); }
function setMap(ci,f){ if(!W)return; if(f)W.mapping[ci]=f; else delete W.mapping[ci]; }
function setSearch(v){ if(!W)return; W.search=v; W.page=0; renderWizard(); var inp=document.querySelector('#v16ov .v15input'); if(inp){inp.focus(); inp.setSelectionRange(inp.value.length,inp.value.length);} }
function setErrOnly(v){ if(!W)return; W.errOnly=!!v; W.page=0; renderWizard(); }
function setPage(p){ if(!W)return; W.page=Math.max(0,p); renderWizard(); }
function setSheetAsDeck(v){ if(!W)return; W.sheetAsDeck=!!v; }
function cancelOp(){ if(!W)return; W.cancelled=true; }
function createDeckUI(lang){
  var inp=document.getElementById('v16-newdeck');
  var name=inp?inp.value:'';
  var r=createDeck(lang,name);
  if(r.error){ pop(r.error); return; }
  pop(r.exists?'Bộ đã có, đã chọn bộ đó.':'Đã tạo bộ "'+name+'".');
  if(W){ W.deckId=r.id; renderWizard(); }
}
function renameDeckUI(lang,id,name){
  if(renameDeck(lang,id,name)) renderWizard(); else pop('Không đổi tên được.');
}
function deleteDeckUI(lang,id){
  var nm=deckName(lang,id);
  if(!confirm('Xoá bộ "'+nm+'"?\n• Từ tiếng Anh trong bộ sẽ trở về "Chưa xếp bộ".\n• Từ tiếng Hàn trong bộ sẽ chuyển về bộ mặc định.\n• Không xoá từ nào.')) return;
  var r=deleteDeck(lang,id);
  if(r.error){ pop(r.error); return; }
  if(W){ if(W.deckId===id)W.deckId=defaultDeckId(lang); renderWizard(); }
}
function mergeDeckUI(lang){
  var f=document.getElementById('v16-merge-from'),t=document.getElementById('v16-merge-to');
  if(!f||!t)return;
  if(f.value===t.value){ pop('Chọn hai bộ khác nhau để gộp.'); return; }
  if(!confirm('Gộp bộ "'+deckName(lang,f.value)+'" vào "'+deckName(lang,t.value)+'"? Bộ nguồn sẽ bị xoá sau khi gộp.')) return;
  var r=mergeDecks(lang,f.value,t.value);
  if(r.error){ pop(r.error); return; }
  pop('Đã gộp bộ.');
  if(W){ if(W.deckId===f.value)W.deckId=t.value; renderWizard(); }
}
function downloadReport(){
  if(!W||!W.result)return;
  var rep={app:'Korean & English Vocab Farm V8',date:new Date().toISOString(),lang:W.lang,deck:deckName(W.lang,W.deckId),dupMode:W.dupMode,result:W.result,
    files:(W.files||[]).map(function(f){return {name:f.name,sheet:f.sheet||'',rows:(f.aoa||[]).length}})};
  try{ if(!v15dl('import-report-'+todayStr()+'.json',JSON.stringify(rep,null,2))) downloadBlob('import-report-'+todayStr()+'.json',new Blob([JSON.stringify(rep,null,2)],{type:'application/json'})); }catch(e){ pop('Không tải được báo cáo.'); }
}

/* ---------------- file mẫu ---------------- */
function sampleRows(lang){
  if(lang==='ko') return [
    ['사과','quả táo','sagwa','Đồ ăn','사과를 먹어요.','A1'],
    ['학교','trường học','hakgyo','Trường học','학교에 가요.','A1'],
    ['사랑','tình yêu','sarang','Cảm xúc','사랑해요.','A2']
  ];
  return [
    ['apple','quả táo','/ˈæpl/','n','A1','food','I eat an apple every day.','Tôi ăn một quả táo mỗi ngày.'],
    ['run','chạy','/rʌn/','v','A1','daily','I run every morning.','Tôi chạy mỗi buổi sáng.'],
    ['beautiful','đẹp','/ˈbjuːtɪfl/','adj','A2','daily','She has a beautiful smile.','Cô ấy có nụ cười đẹp.']
  ];
}
function downloadSample(lang,format){
  try{
    if(format==='xlsx'){
      if(!xlsxAvailable()){ pop('Thư viện Excel chưa tải được.'); return; }
      var headers=lang==='ko'?['Korean','Vietnamese','Romanization','Topic','Example','Level']:['English','Vietnamese','IPA','POS','Level','Topic','Example','Example Translation'];
      var ws=window.XLSX.utils.aoa_to_sheet([headers].concat(sampleRows(lang)));
      var wb=window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb,ws,'Vocabulary');
      try{ window.XLSX.writeFile(wb,'sample-'+lang+'.xlsx'); }
      catch(e){ var buf=window.XLSX.write(wb,{bookType:'xlsx',type:'array'}); downloadBlob('sample-'+lang+'.xlsx',new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})); }
      return;
    }
    if(format==='csv'){
      var h2=lang==='ko'?['Korean','Vietnamese','Romanization','Topic','Example','Level']:['English','Vietnamese','IPA','POS','Level','Topic','Example','Example Translation'];
      downloadBlob('sample-'+lang+'.csv',new Blob([rowsToCSV(h2,sampleRows(lang))],{type:'text/csv;charset=utf-8'}));
      return;
    }
    var arr=sampleRows(lang).map(function(r){ var o={},hh=lang==='ko'?['Korean','Vietnamese','Romanization','Topic','Example','Level']:['English','Vietnamese','IPA','POS','Level','Topic','Example','Example Translation']; hh.forEach(function(k,i){o[k]=r[i]}); return o; });
    downloadBlob('sample-'+lang+'.json',new Blob([JSON.stringify(arr,null,2)],{type:'application/json'}));
  }catch(e){ pop('Không tạo được file mẫu: '+(e&&e.message||e)); }
}

/* ---------------- tích hợp view Dữ liệu (KO) ---------------- */
function injectKO(){
  try{
    var ta=document.getElementById('ta');
    if(!ta||document.getElementById('v16ko-btn')) return;
    var div=document.createElement('div');
    div.className='acts'; div.style.margin='10px 0';
    div.innerHTML='<button class="btn pri" id="v16ko-btn" onclick="__v16.open(\'ko\')">🧠 Nhập thông minh (Excel / CSV / JSON)</button>'
      +'<button class="btn" onclick="__v16.exportVocab(\'ko\',\'ALL\',\'xlsx\')">Xuất Excel</button>'
      +'<button class="btn" onclick="__v16.exportVocab(\'ko\',\'ALL\',\'csv\')">Xuất CSV</button>';
    ta.parentNode.insertBefore(div,ta);
  }catch(e){}
}
function wrapGlobals(){
  try{
    if(typeof window.setView==='function'&&!window.setView.__v16){
      var _sv=window.setView;
      var nw=function(v){ _sv(v); if(v==='data') setTimeout(injectKO,0); };
      nw.__v16=true; window.setView=nw;
    }
    if(typeof window.render==='function'&&!window.render.__v16){
      var _r=window.render;
      var nr=function(){ _r(); try{ if(typeof view!=='undefined'&&view==='data') setTimeout(injectKO,0); }catch(e){} };
      nr.__v16=true; window.render=nr;
    }
  }catch(e){}
}
wrapGlobals();

/* ---------------- xuất API ---------------- */
window.__v16={
  open:openWizard, close:closeWizard, setStep:setStep,
  setLang:setLang, setDeck:setDeck, setMap:setMap, setSheet:setSheet, setSheetAsDeck:setSheetAsDeck,
  readFiles:readFiles, removeFile:removeFile, runDetect:runDetect,
  applyMapping:function(){ applyMappingAndClassify(); },
  setDupMode:setDupMode, setSearch:setSearch, setErrOnly:setErrOnly, setPage:setPage,
  toggleRow:toggleRow, togglePage:togglePage, deleteRow:deleteRow, editCell:editCell,
  confirmImport:confirmImport, cancel:cancelOp, downloadReport:downloadReport,
  createDeckUI:createDeckUI, renameDeck:renameDeckUI, deleteDeckUI:deleteDeckUI, mergeDeckUI:mergeDeckUI,
  toggleDeckMgr:function(){ if(W){W.deckMgrOpen=!W.deckMgrOpen; renderWizard();} },
  exportVocab:exportVocab, downloadSample:downloadSample, injectKO:injectKO,
  version:'8.0',
  _t:{ /* dùng cho kiểm thử */
    stripBOM:stripBOM, detectDelimiter:detectDelimiter, parseDelimited:parseDelimited,
    jsonToAOA:jsonToAOA, detectHeaderRow:detectHeaderRow, guessMapping:guessMapping,
    positionalMapping:positionalMapping, detectLangFromRows:detectLangFromRows,
    rowToWord:rowToWord, normKey:normKey, normHeader:normHeader, aliasField:aliasField,
    buildExistingIndex:buildExistingIndex, en16:en16, deckName:deckName,
    createDeck:createDeck, renameDeck:renameDeck, deleteDeck:deleteDeck, mergeDecks:mergeDecks,
    moveWord:moveWord, gatherExport:gatherExport, rowsToCSV:rowsToCSV,
    newWizard:newWizard, openWizard:openWizard, closeWizard:closeWizard,
    xlsxAvailable:xlsxAvailable, readWorkbook:readWorkbook, sheetToAOA:sheetToAOA
  }
};
})();
