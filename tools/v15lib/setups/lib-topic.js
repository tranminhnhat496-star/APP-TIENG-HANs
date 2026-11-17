// Mở chủ đề A1–A2 đầu tiên (nút "Xem từ" đầu tiên trong nhóm A1–A2).
(function(){
  var g = document.querySelectorAll('.v17group')[0];
  var b = g && Array.prototype.slice.call(g.querySelectorAll('.v17card .acts .btn'))
    .find(function(x){ return x.textContent.trim() === 'Xem từ'; });
  if (b) b.click();
})();
