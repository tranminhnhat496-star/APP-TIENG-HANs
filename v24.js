/* ===== V24 — UI/UX Readability Upgrade (V15.1) — JS phụ trợ =====
   Chỉ chứa hành vi UI, KHÔNG đổi logic game, KHÔNG chạm localStorage. */
(function(){
  'use strict';
  var VERSION='15.1.0';
  try{
    /* BUG FIX: V18 fight render ở cuối trang arena (~5.500px dưới fold).
       startFight/renderFight không cuộn, nên sau khi bấm "Khiêu chiến"
       người chơi vẫn nhìn danh sách boss trong khi trận đấu chờ ở dưới.
       #v18fight chỉ được v18.js tạo ra khi mở tab Bosses (không có sẵn
       lúc tải trang) nên cần observer 2 tầng: tầng 1 chờ #v18fight xuất
       hiện, tầng 2 cuộn chỉ khi nó chuyển từ rỗng → có nội dung (trận
       mới bắt đầu); trong trận innerHTML không bao giờ rỗng nên các lần
       render đáp án không cuộn lại. */
    var fightHost = null, fightWasEmpty = true, fightObs = null;
    function armFightScroll(host){
      fightHost = host; fightWasEmpty = host.innerHTML.trim() === '';
      if (fightObs) fightObs.disconnect();
      fightObs = new MutationObserver(function(){
        try{
          var empty = fightHost.innerHTML.trim() === '';
          if (fightWasEmpty && !empty) {
            fightHost.scrollIntoView({behavior:'smooth',block:'start'});
          }
          fightWasEmpty = empty;
        }catch(e){}
      });
      fightObs.observe(host, {childList:true, subtree:true});
    }
    try{
      var existing = document.getElementById('v18fight');
      if (existing) armFightScroll(existing);
      else if (window.MutationObserver) {
        var bodyObs = new MutationObserver(function(){
          try{
            var h = document.getElementById('v18fight');
            if (h) { bodyObs.disconnect(); armFightScroll(h); }
          }catch(e){}
        });
        bodyObs.observe(document.body, {childList:true, subtree:true});
      }
    }catch(e){}
    /* BUG FIX (tìm thấy khi kiểm thử V15.1): en15() trong v15.js chỉ tạo
       giá trị mặc định khi S.v7.en15 hoàn toàn chưa có; nếu bản lưu đã có
       en15 nhưng thiếu modeBest (ví dụ bản lưu được tạo/xuất từ nguồn khác,
       hoặc bị ghi đè một phần), English Hub crash ngay khi mở:
       learnHTML đọc e.modeBest[m.id] → TypeError "reading 'flash'".
       Các getter khác (en18/en19) đều backfill từng trường; en15 thì không.
       V24 backfill các trường còn thiếu bằng đúng giá trị mặc định của
       v15.js, rồi lưu lại — không sửa file cũ. */
    var v15=window.__v15;
    if(v15&&v15.en15){
      var e=v15.en15();
      if(e&&e!==null&&typeof e==='object'){
        var need=false;
        if(!e.modeBest){e.modeBest={};need=true;}
        if(!e.due){e.due={};need=true;}
        if(!e.intv){e.intv={};need=true;}
        if(!e.hist){e.hist={};need=true;}
        if(!e.daily){e.daily={d:'',correct:0,wrong:0,xp:0};need=true;}
        if(!e.bosses){e.bosses={};need=true;}
        if(!e.speakDone){e.speakDone={};need=true;}
        if(e.weakOnly===undefined){e.weakOnly=false;need=true;}
        if(!e.lang)e.lang='ko';
        if(!e.level)e.level='A1';
        if(e.topic===undefined)e.topic='';
        if(need&&v15.save15)v15.save15();
      }
    }
  }catch(e){}
  try{ window.__v24={version:VERSION}; }catch(e){}
})();
