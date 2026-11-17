// Tab Từ vựng (My Vocabulary): thêm 1 từ tự nhập mẫu rồi tìm nó để hiện
// hàng từ có nút Sửa / Xóa / Nghe.
window.__v15.openHub(); window.__v15.tab('vocab');
(function(){
  var o = window.__v15.enOld(); o.custom = o.custom || [];
  if (!o.custom.some(function(c){ return c.uid === 'u-test25'; }))
    o.custom.push({t:'daily',en:'testword',vi:'từ kiểm thử',ipa:'/ˈtest.wɜːd/',pos:'n',lv:'A1',ex:'This is a test word.',exvi:'Đây là một từ kiểm thử.',uid:'u-test25'});
  window.__v15.buildWords(); window.__v15.renderTab();
})();
window.__v15.vocabSearch('testword');
