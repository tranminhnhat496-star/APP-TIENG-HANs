/* ===== V26 — Mobile Responsive & Pet Navigation Fix (V15.3) =====
   Lớp cộng thêm, nạp CUỐI CÙNG. Chỉ trang trí + điều hướng — KHÔNG đổi logic
   game, không đổi dữ liệu thú cưng, không đổi localStorage.
   - Nhớ tab Pet đang mở (sessionStorage, không chạm save game): các nút mở
     Pet Hub không tham số (nút 🐾 ở langbar / EN Hub / Korean Hub) sẽ mở lại
     đúng tab lần trước thay vì luôn về tab Thú cưng.
   - Tính chiều cao header Pet Hub thật (offsetHeight) và ghi vào
     --nav-head-h để thanh tab dính (sticky) nằm chính xác dưới header.
   - Cuộn tab đang chọn vào giữa thanh tab khi thanh tab tràn ngang.
   - Gộp empty state: khi chưa có thú, chỉ còn MỘT thông báo chính (hero) —
     ẩn thông báo trùng trong lưới; khi có thú nhưng lọc không khớp, hiện
     "Không tìm thấy thú cưng phù hợp." + nút "Xóa bộ lọc" thật.
   - Tiêu đề Pet Hub ngắn lại trên điện thoại (≤640px): "🐾 Thú Cưng".
   Mọi thay đổi đều có guard idempotent — renderBody() của v23 thay toàn bộ
   #v23body mỗi lần tương tác nên decorator chạy lại sau mỗi lần render. */
(function () {
  'use strict';
  var W = window;
  var VERSION = '15.3.0';
  var TITLE_FULL = '🐾 Hệ Thống Thú Cưng';
  var TITLE_SHORT = '🐾 Thú Cưng';
  var HERO_TITLE = 'Bạn chưa có thú cưng';
  var HERO_DESC = 'Ấp quả trứng đầu tiên để nhận người bạn đồng hành!';
  var NOMATCH_TEXT = 'Không tìm thấy thú cưng phù hợp.';
  var _busy = false, _scheduled = false, _wrapped = false, _memTab = null;

  function $(s, r) { try { return (r || document).querySelector(s); } catch (e) { return null; } }
  function $$(s, r) { try { return Array.prototype.slice.call((r || document).querySelectorAll(s)); } catch (e) { return []; } }
  function storeGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return _memTab; } }
  function storeSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { _memTab = v; } }

  function ownedCount() {
    try {
      var t = W.__v23 && W.__v23._test;
      if (!t || !t.en23) return -1;
      var e = t.en23();
      return e && e.pets ? Object.keys(e.pets).length : 0;
    } catch (err) { return -1; }
  }
  function currentTab() {
    var on = $('.v23tab.on');
    if (on) { var m = (on.getAttribute('onclick') || '').match(/openHub\('(\w+)'\)/); if (m) return m[1]; }
    return null;
  }

  /* --- chiều cao header thật → --nav-head-h (tab sticky dính chính xác) --- */
  function syncHeadH() {
    try {
      var hub = $('#v23hub'), head = hub && $('.v23head', hub);
      if (!hub || !head) return;
      var h = head.offsetHeight;
      if (h > 0 && hub.style.getPropertyValue('--nav-head-h') !== h + 'px') {
        hub.style.setProperty('--nav-head-h', h + 'px');
      }
    } catch (e) {}
  }
  /* --- cuộn tab đang chọn vào giữa thanh tab (chỉ khi thanh tràn ngang) --- */
  function scrollActiveTab() {
    try {
      var tabs = $('#v23hub .v23tabs'), on = $('.v23tab.on');
      if (!tabs || !on) return;
      if (tabs.scrollWidth > tabs.clientWidth + 1) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    } catch (e) {}
  }
  /* --- tiêu đề ngắn trên điện thoại --- */
  function syncTitle() {
    try {
      var t = $('#v23hub .v23title');
      if (!t) return;
      var txt = (t.textContent || '').trim();
      if (W.innerWidth <= 640) { if (txt === TITLE_FULL) t.textContent = TITLE_SHORT; }
      else if (txt === TITLE_SHORT) { t.textContent = TITLE_FULL; }
    } catch (e) {}
  }

  /* --- hero empty state: nâng khung trống thành 1 thông báo chính --- */
  function heroify(box, withButton) {
    if (!box || box.getAttribute('data-v26hero')) return;
    box.classList.add('v26hero');
    box.setAttribute('data-v26hero', '1');
    var h3 = box.querySelector('h3'), p = box.querySelector('p');
    if (!box.querySelector('.v26hero-egg')) {
      var img = document.createElement('img');
      img.className = 'v26hero-egg';
      img.src = 'assets/pets/v15/eggs/egg_fire.png';
      img.alt = 'Trứng thú cưng';
      img.setAttribute('onerror', "this.style.display='none'");
      box.insertBefore(img, box.firstChild);
    }
    if (h3) h3.textContent = HERO_TITLE;
    if (p) p.textContent = HERO_DESC;
    var btn = box.querySelector('.v23btn');
    if (btn) {
      btn.classList.add('gold', 'big');
      btn.classList.remove('pri');
      btn.textContent = '🥚 Đi ấp trứng';
    } else if (withButton) {
      var b = document.createElement('button');
      b.className = 'v23btn gold big';
      b.textContent = '🥚 Đi ấp trứng';
      b.setAttribute('onclick', "__v23.openHub('hatch')");
      box.appendChild(b);
    }
  }

  function decorate() {
    if (_busy) return;
    var hub = $('#v23hub');
    if (!hub) return;
    _busy = true;
    try {
      syncTitle();
      syncHeadH();
      var owned = ownedCount();
      var tab = currentTab();
      var body = $('#v23body');
      if (!body) return;
      /* --- tab Thú cưng --- */
      if (tab === 'pets') {
        var gridEmpty = $('.v23grid .v23empty', body);
        var cells = $$('#v23hub .v23grid .v23cell');
        var detail = $('.v23detail.v23emptybox', body);
        if (owned === 0) {
          /* Chưa có thú: ẩn thông báo trùng trong lưới — chỉ còn hero. */
          if (gridEmpty) gridEmpty.style.display = 'none';
          if (detail) heroify(detail, false);
        } else if (owned > 0 && cells.length === 0) {
          /* Có thú nhưng lọc không khớp: thông báo riêng + nút xóa lọc thật. */
          if (gridEmpty && !gridEmpty.getAttribute('data-v26nomatch')) {
            var wrap = document.createElement('div');
            wrap.className = 'v26nomatch';
            wrap.setAttribute('data-v26nomatch', '1');
            wrap.innerHTML = '<p>' + NOMATCH_TEXT + '</p>'
              + '<button class="v23btn" onclick="__v23.setFilter(\'all\');__v23.setSearch(\'\')">Xóa bộ lọc</button>';
            gridEmpty.parentNode.replaceChild(wrap, gridEmpty);
          }
        }
      }
      /* --- tab Tiến hóa: 0 thú → gộp 2 khung trống thành 1 hero --- */
      if (tab === 'evo' && owned === 0) {
        var evoListEmpty = $('.v23evo .v23side .v23empty', body);
        if (evoListEmpty) evoListEmpty.style.display = 'none';
        var evoDetail = $('.v23evo .v23detail.v23emptybox', body);
        if (evoDetail) heroify(evoDetail, true);
      }
      /* --- tab Đội hình: 0 thú → thêm nút Đi ấp trứng ở panel trái --- */
      if (tab === 'team' && owned === 0) {
        var side = $('.v23team .v23side', body);
        if (side && !side.querySelector('[data-v26teamcta]')) {
          var cta = document.createElement('button');
          cta.className = 'v23btn gold big';
          cta.setAttribute('data-v26teamcta', '1');
          cta.textContent = '🥚 Đi ấp trứng';
          cta.setAttribute('onclick', "__v23.openHub('hatch')");
          side.appendChild(cta);
        }
      }
    } catch (e) {}
    _busy = false;
  }
  function scheduleDecorate() {
    if (_scheduled) return;
    _scheduled = true;
    requestAnimationFrame(function () { _scheduled = false; decorate(); });
  }

  /* --- nhớ tab: bọc __v23.openHub (không sửa v23.js) --- */
  function wrapOpenHub() {
    try {
      if (!W.__v23 || !W.__v23.openHub || W.__v23.__v26wrapped) return;
      var _open = W.__v23.openHub;
      W.__v23.openHub = function (tab) {
        var t = tab || storeGet('v26.petTab') || 'pets';
        storeSet('v26.petTab', t);
        _open(t);
        requestAnimationFrame(function () { syncTitle(); syncHeadH(); scrollActiveTab(); decorate(); });
      };
      W.__v23.__v26wrapped = true;
      _wrapped = true;
    } catch (e) {}
  }

  function init() {
    wrapOpenHub();
    try {
      if (W.__v23 && !W.__v23.__v26wrapped) setTimeout(wrapOpenHub, 300);
    } catch (e) {}
    try {
      if (!W.__v26observer) {
        W.__v26observer = new MutationObserver(function () { scheduleDecorate(); });
        W.__v26observer.observe(document.body, { childList: true, subtree: true });
      }
    } catch (e) {}
    var _rt = null;
    try {
      W.addEventListener('resize', function () {
        if (_rt) clearTimeout(_rt);
        _rt = setTimeout(function () { syncTitle(); syncHeadH(); }, 150);
      });
    } catch (e) {}
    decorate();
  }

  W.__v26 = {
    version: VERSION,
    decorate: decorate,
    syncHeadH: syncHeadH,
    scrollActiveTab: scrollActiveTab,
    ownedCount: ownedCount,
    lastTab: function () { try { return storeGet('v26.petTab'); } catch (e) { return _memTab; } },
    wrapped: function () { return _wrapped; },
    status: function () {
      var hub = $('#v23hub');
      return {
        version: VERSION, hub: !!hub,
        tab: currentTab(), owned: ownedCount(),
        headH: hub && $('.v23head', hub) ? $('.v23head', hub).offsetHeight : null,
        headVar: hub ? hub.style.getPropertyValue('--nav-head-h') : '',
        hero: !!$('.v26hero'), nomatch: !!$('.v26nomatch'),
        lastTab: storeGet('v26.petTab'), wrapped: _wrapped
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
