// Mở Unit 1 Basic Tactics (đánh dấu tiến trình BT mẫu trước: 5 đã thuộc,
// 5 đang học + cần ôn — chỉ các mục của Unit 1).
window.__v15.openHub(); window.__v15.tab('library');
await window.__v22.ensureData();
(function(){
  var all = window.__v15.words.filter(function(w){ return (w.lib||[]).indexOf('bt') >= 0; });
  var u1 = all.filter(function(w){ return (w.btUnits||[]).indexOf(1) >= 0; });
  var list = u1.length ? u1 : all.slice(0, 10);
  var o = window.__v15.enOld(); var e = window.__v15.en15();
  list.slice(0,5).forEach(function(w){ o.box[w.id] = 5; });
  list.slice(5,10).forEach(function(w){ o.box[w.id] = 2; e.due[w.id] = Date.now() - 60000; });
})();
window.__v22.openUnit(1);
