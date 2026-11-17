// mark-lib.js — đánh dấu tiến trình mẫu cho A1–A2 + Oxford để thanh tiến
// độ và nhãn trạng thái hiện số liệu thật khi audit/chụp. Đánh dấu THEO
// TỪNG chủ đề / bài (3 đã thuộc, 2 đang học + cần ôn, 2 mới học) để mọi
// thẻ chủ đề/bài đều có tiến trình. Mở lại hub sau khi đánh dấu để tiêu
// đề hub ("x/4409 từ đã thuộc") cũng cập nhật.
window.__v15.openHub(); window.__v15.tab('library');
(function(){
  var ws = window.__v15.words;
  var o = window.__v15.enOld(); var e = window.__v15.en15();
  var now = Date.now();
  function mark(list, n5, n2, n1){
    list.slice(0, n5).forEach(function(w){ o.box[w.id] = 5; });
    list.slice(n5, n5+n2).forEach(function(w){ o.box[w.id] = 2; e.due[w.id] = now - 60000; });
    list.slice(n5+n2, n5+n2+n1).forEach(function(w){ o.box[w.id] = 1; });
  }
  var byTopic = {};
  ws.filter(function(w){ return (w.lib||[]).indexOf('a1a2') >= 0; }).forEach(function(w){
    var t = w.a1a2Topic || w.t; (byTopic[t] = byTopic[t] || []).push(w);
  });
  Object.keys(byTopic).forEach(function(t){ mark(byTopic[t], 3, 2, 2); });
  var byLesson = {};
  ws.filter(function(w){ return (w.lib||[]).indexOf('oxford') >= 0; }).forEach(function(w){
    var n = w.oxLesson || 0; if (n >= 1 && n <= 24) (byLesson[n] = byLesson[n] || []).push(w);
  });
  Object.keys(byLesson).forEach(function(n){ mark(byLesson[n], 3, 2, 2); });
  if (window.__v15.closeHub) window.__v15.closeHub();
  window.__v15.openHub(); window.__v15.tab('library');
})();
