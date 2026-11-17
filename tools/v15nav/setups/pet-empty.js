// Pet Hub trống: reset en23 về trạng thái mới (chỉ có trứng tặng, chưa có thú),
// rồi mở Pet Hub ở tab pets.
(function () {
  var t = window.__v23 && window.__v23._test;
  if (t && t.reset) { try { t.reset(); } catch (e) {} }
  var e = t ? t.en23() : null;
  if (e) { e.pets = {}; e.team = [null, null, null]; e.hatch = null; }
  try { window.__v15 && window.__v15.save15 && window.__v15.save15(); } catch (err) {}
  window.__v23.openHub('pets');
})();
