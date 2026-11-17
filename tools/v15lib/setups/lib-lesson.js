// Mở bài Oxford đầu tiên (nút "Xem từ" đầu tiên trong nhóm Oxford 3000).
(function(){
  var g = document.querySelectorAll('.v17group')[1];
  var b = g && Array.prototype.slice.call(g.querySelectorAll('.v17card .acts .btn'))
    .find(function(x){ return x.textContent.trim() === 'Xem từ'; });
  if (b) b.click();
})();
