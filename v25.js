/* ===== V25 — Vocabulary Library UI/UX Redesign (V15.2) — JS phụ trợ =====
   Chỉ thêm UI trình bày, KHÔNG đổi logic game, KHÔNG chạm localStorage,
   KHÔNG đổi tên ID/class JS đang dùng. Mọi số liệu (tiến trình bộ từ,
   nhãn trạng thái) đều đọc từ đúng kho dữ liệu của app (WORDS,
   S.v7.en box/due) nên không bao giờ là số liệu giả.
   - Nhãn trạng thái ghi nhớ (○ Chưa học / ◐ Đang học / ↻ Cần ôn /
     ✓ Đã thuộc) trên từng hàng từ.
   - Thanh tiến trình cấp bộ từ + icon cho từng nhóm trong Thư viện.
   - Phân loại nút: Ôn tập → tím đậm, Xem từ → nền sáng chữ tím.
   - Ô tìm kiếm Thư viện thành type=search (nút xóa native của Chrome).
   Chạy qua MutationObserver: Thư viện vẽ lại sau mỗi lần tìm kiếm /
   chuyển tab nên decorator phải chạy lại sau mỗi lần render. */
(function(){
'use strict';
var VERSION='15.2.0';
var V15=function(){return window.__v15||null};
var V22=function(){return window.__v22||null};

/* ---------- đọc tiến trình thật từ kho của app ---------- */
function boxOf(id){
  try{var v=V15();if(!v)return 0;var o=v.enOld();return (o.box||{})[id]||0}
  catch(e){return 0}
}
function dueOf(id){
  try{var v=V15();if(!v)return 0;var e=v.en15();return (e.due||{})[id]||0}
  catch(e){return 0}
}
function statsOf(list){
  var now=Date.now(),s={total:list.length,learned:0,mastered:0,due:0};
  list.forEach(function(w){
    var b=boxOf(w.id);
    if(b>=1)s.learned++;
    if(b>=5)s.mastered++;
    if(dueOf(w.id)<=now)s.due++;
  });
  return s;
}
function statusOf(id){
  var b=boxOf(id);
  if(b>=5)return {cls:'st-mastered',label:'✓ Đã thuộc'};
  if(b>=1)return dueOf(id)<=Date.now()
    ?{cls:'st-due',label:'↻ Cần ôn'}
    :{cls:'st-learning',label:'◐ Đang học'};
  return {cls:'st-new',label:'○ Chưa học'};
}
function idFromRow(row){
  var btns=row.querySelectorAll('button[onclick]');
  for(var i=0;i<btns.length;i++){
    var m=(btns[i].getAttribute('onclick')||'').match(/'([^']+)'/);
    if(m&&m[1])return m[1];
  }
  return '';
}

/* ---------- §1. Nhãn trạng thái trên hàng từ ---------- */
function decorateRows(root){
  var rows=root.querySelectorAll('.v17word, .v17row');
  for(var i=0;i<rows.length;i++){
    var row=rows[i];
    var id=idFromRow(row);
    if(!id)continue;
    var st=statusOf(id);
    var main=row.querySelector('.v17word-main')||row.querySelector('div');
    if(!main)continue;
    var b=main.querySelector('b');
    if(!b)continue;
    var badge=main.querySelector(':scope > .v25status');
    if(!badge){
      badge=document.createElement('span');
      /* đặt sau pill loại từ (nếu có), còn không thì ngay sau từ */
      var anchor=main.querySelector('b + span.mute')||b;
      anchor.parentNode.insertBefore(badge,anchor.nextSibling);
    }
    var cls='v25status '+st.cls;
    if(badge.className!==cls)badge.className=cls;
    if(badge.textContent!==st.label)badge.textContent=st.label;
  }
}

/* ---------- §2. Thẻ bộ từ: icon + thanh tiến trình ---------- */
function groupKey(head){
  var t=head.textContent||'';
  if(t.indexOf('A1')>=0)return 'a1a2';
  if(t.indexOf('Oxford')>=0)return 'oxford';
  if(t.indexOf('Basic Tactics')>=0)return 'bt';
  return '';
}
function groupStats(key){
  var v=V15();if(!v)return null;
  var ws=v.words||[];
  if(key==='a1a2'){
    var total=(window.__V17_A1A2||[]).length||0;
    var list=ws.filter(function(w){return (w.lib||[]).indexOf('a1a2')>=0});
    var s=statsOf(list);s.total=total||list.length;return s;
  }
  if(key==='oxford'){
    var total2=(window.__V17_OXFORD||[]).length||0;
    var list2=ws.filter(function(w){return (w.lib||[]).indexOf('oxford')>=0});
    var s2=statsOf(list2);s2.total=total2||list2.length;return s2;
  }
  if(key==='bt'){
    var v22=V22();
    if(!v22||!v22.data)return {loading:true,total:819,learned:0,mastered:0,due:0};
    var list3=ws.filter(function(w){return (w.lib||[]).indexOf('bt')>=0});
    var s3=statsOf(list3);
    var tot=0;(v22.meta||[]).forEach(function(m){tot+=m.words+m.phrases});
    s3.total=tot||819;return s3;
  }
  return null;
}
function decorateGroups(root){
  var groups=root.querySelectorAll('.v17lib .v17group');
  for(var i=0;i<groups.length;i++){
    var g=groups[i];
    var head=g.querySelector('.v17group-head b');
    if(!head)continue;
    var key=groupKey(head);
    /* icon: A1–A2 và Oxford chưa có icon trong tiêu đề (BT 🎧 và
       My Vocab 📁 đã có sẵn) — thêm một lần duy nhất. */
    if(!head.querySelector('.v25set-ic')){
      var t=head.textContent||'';
      var ic=(t.indexOf('A1')===0)?'📖':((t.indexOf('Oxford')===0)?'📕':'');
      if(ic){
        var sp=document.createElement('span');
        sp.className='v25set-ic';sp.textContent=ic;
        head.insertBefore(sp,head.firstChild);
      }
    }
    /* My Vocabulary không có "tổng số từ cần hoàn thành" nên không
       có thanh tiến trình cấp nhóm — giữ nguyên như cũ. */
    if(!key)continue;
    var s=groupStats(key);
    if(!s)continue;
    var box=g.querySelector(':scope > .v25group-progress');
    if(!box){
      box=document.createElement('div');
      box.className='v25group-progress';
      var headEl=g.querySelector('.v17group-head');
      headEl.parentNode.insertBefore(box,headEl.nextSibling);
    }
    var html;
    if(s.loading){
      html='<div class="v25gp-loading">Đang tải dữ liệu để tính tiến trình…</div>';
    }else{
      var pct=s.total?Math.round(s.learned/s.total*100):0;
      html='<div class="v25gp-line"><span><b>'+s.learned+'</b> đã học · <b>'+s.mastered+'</b> đã thuộc · <b>'+s.due+'</b> cần ôn</span><span>'+s.learned+' / '+s.total+' từ</span></div>'
        +'<div class="v17bar"><i style="width:'+pct+'%"></i></div>';
    }
    /* Chỉ ghi innerHTML khi nội dung đổi — nếu không observer sẽ
       kích hoạt chính decorator của mình vô hạn. */
    if(box._v25html!==html){box.innerHTML=html;box._v25html=html;}
  }
}

/* ---------- §3. Phân loại nút Học/Ôn/Xem ---------- */
function classifyButtons(root){
  var btns=root.querySelectorAll('.v17lib .acts .btn, .v17lesson .acts .btn');
  for(var i=0;i<btns.length;i++){
    var b=btns[i];
    if(b.classList.contains('pri')||b.classList.contains('ok'))continue;
    if(b.classList.contains('v25btn-review')||b.classList.contains('v25btn-view'))continue;
    var t=(b.textContent||'').trim();
    if(t.indexOf('Ôn tập')===0||t.indexOf('Ôn từ yếu')===0)b.classList.add('v25btn-review');
    else if(t.indexOf('Xem từ')===0||t.indexOf('Xem tất cả từ')===0||t.indexOf('Xem bài')===0)b.classList.add('v25btn-view');
  }
}

/* ---------- §4. Ô tìm kiếm: type=search để có nút xóa native ---------- */
function decorateSearch(root){
  var inputs=root.querySelectorAll('.v17lib .v15input, .v17lesson .v15input');
  for(var i=0;i<inputs.length;i++){
    if(inputs[i].getAttribute('type')!=='search')inputs[i].setAttribute('type','search');
  }
  var vq=document.querySelector('#v15body > input.v15input[placeholder*="Tìm từ"]');
  if(vq&&vq.getAttribute('type')!=='search')vq.setAttribute('type','search');
}

/* ---------- §5. Thông báo khi không tìm thấy từ (§8) ---------- */
function decorateEmpty(root){
  /* v17.js không có thông báo khi danh sách bài học bị lọc về 0 —
     chỉ còn dòng "Hiện 0/0 từ". Chèn thông báo rõ ràng vào .v17words
     đang rỗng (renderTab sẽ thay thế nó khi bộ lọc đổi). */
  var lists=root.querySelectorAll('.v17lesson .v17words');
  for(var i=0;i<lists.length;i++){
    var L=lists[i];
    if(L.querySelector('.v25empty'))continue;
    if(L.children.length===0){
      var p=document.createElement('p');
      p.className='mute v25empty';
      p.textContent='Không tìm thấy từ nào khớp với tìm kiếm hoặc bộ lọc của bạn. Hãy thử từ khóa khác.';
      L.appendChild(p);
    }
  }
  /* Các thông báo có sẵn (tìm Oxford, Unit BT) cũng nhận kiểu khung. */
  var ps=root.querySelectorAll('.v17lib p.mute, .v17lesson p.mute');
  for(var j=0;j<ps.length;j++){
    var t=(ps[j].textContent||'').trim();
    if(t.indexOf('Không tìm thấy')===0&&!ps[j].classList.contains('v25empty'))ps[j].classList.add('v25empty');
  }
}

/* ---------- chạy decorator ---------- */
function decorate(){
  try{
    var body=document.getElementById('v15body');
    if(!body)return;
    decorateRows(body);
    decorateGroups(body);
    classifyButtons(body);
    decorateSearch(body);
    decorateEmpty(body);
  }catch(e){}
}
var scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  setTimeout(function(){scheduled=false;decorate();},0);
}
/* Hai tầng observer (theo mẫu V24): tầng body phát hiện #v15body xuất
   hiện/biến mất khi mở/đóng hub; tầng hub theo dõi render bên trong. */
var bodyObs=null,hubObs=null,hubNode=null;
function armHub(){
  try{
    var b=document.getElementById('v15body');
    if(!b){if(hubObs){hubObs.disconnect();hubObs=null;}hubNode=null;return;}
    if(b===hubNode)return;
    hubNode=b;
    if(hubObs)hubObs.disconnect();
    hubObs=new MutationObserver(function(){schedule()});
    hubObs.observe(b,{childList:true,subtree:true});
    decorate();
  }catch(e){}
}
try{
  armHub();
  if(window.MutationObserver&&!bodyObs){
    bodyObs=new MutationObserver(function(){armHub();schedule();});
    bodyObs.observe(document.body,{childList:true,subtree:true});
  }
}catch(e){}
try{window.__v25={version:VERSION,decorate:decorate,statusOf:statusOf,groupStats:groupStats,idFromRow:idFromRow};}
catch(e){}
})();
