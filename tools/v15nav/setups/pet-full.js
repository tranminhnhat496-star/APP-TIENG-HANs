// Pet Hub có thú: reset rồi tạo 3 thú (rồng Lv10, hồ ly Lv7, rùa Lv5),
// xếp đủ đội hình 3 vị trí, mở Pet Hub ở tab pets.
(function () {
  var t = window.__v23 && window.__v23._test;
  if (t && t.reset) { try { t.reset(); } catch (e) {} }
  var e = t.en23();
  e.pets = {}; e.team = [null, null, null]; e.hatch = null;
  var mk = function (sp, lv, st) {
    var p = t.newPet(sp);
    p.lv = lv; p.st = st || 0; p.xp = 0; p.aff = 500;
    e.pets[p.id] = p; return p;
  };
  var a = mk('dragon', 10, 0), b = mk('fox', 7, 0), c = mk('turtle', 5, 0);
  t.setTeamSlot(0, a.id); t.setTeamSlot(1, b.id); t.setTeamSlot(2, c.id);
  try { window.__v15 && window.__v15.save15 && window.__v15.save15(); } catch (err) {}
  window.__v23.openHub('pets');
})();
