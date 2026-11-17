# CHANGELOG V15.2 → V15.3 — Mobile Responsive & Pet Navigation Fix

Ngày: 2026-11-17. Lớp mới: **V26** (`src/v26.css` + `src/v26.js`, version
**15.3.0**). Nạp cuối cùng sau V25. Không sửa file cũ, không đổi logic game,
không đổi dữ liệu thú cưng, không đổi localStorage, không đổi Firebase.

## File mới

- `src/v26.css` (9.277 byte) — token `--nav-*` theo bảng màu spec §9,
  sửa z-index, header mobile, tab cuộn ngang + sticky, empty state, filter,
  slot tràn, safe-area.
- `src/v26.js` (9.493 byte) — `window.__v26 = {version:'15.3.0', decorate,
  syncHeadH, scrollActiveTab, ownedCount, lastTab, wrapped, status}`:
  bọc `__v23.openHub` để nhớ tab (sessionStorage `v26.petTab`, không chạm
  save game), MutationObserver trang trí hero/không-khớp-lọc, đo chiều cao
  header thật để dính tab, rút ngắn tiêu đề Pet Hub trên màn hình hẹp.
- `tools/v15nav/` — harness kiểm thử: `audit-nav.js`, `baseline26.js`,
  `shots26.js`, `setups/pet-empty.js`, `setups/pet-full.js`,
  `baseline26.json`, `shots-before/` (5 ảnh trước), `restore_index.py`,
  `pw/get-browser.mjs`, `test26.js`.
- `README_V15_3_MOBILE_NAV.md`, `CHANGELOG_V15_2_to_V15_3.md`,
  `SMOKE_TEST_V15_3_2026-11-17.md`.

## File sửa (chỉ thêm, không thay nội dung cũ)

- `index.html` — đổi tiêu đề thành "Korean & English Vocab Farm V15.3 —
  Mobile Navigation Fix" + chèn `<link id="v26css">` và
  `<script id="v26js">` ngay trước `</body>`, sau V25.
- `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` — thêm mục V15.3.

## Thay đổi chi tiết

### Z-index (sửa gốc lỗi "header/menu che nội dung")
- `#v23hub` z-index 120 → **960** (trên langbar 900 + EN Hub 950, dưới
  modal 1000). Trước đây khi mở Pet Hub từ Korean Farm, langbar nổi lên
  trên và che hoàn toàn header Pet (tiêu đề, ví XP/gem, nút đóng ✕).
- `#v23toast` z-index 200 → **970** (toast append vào `document.body`,
  không nằm trong `#v23hub`).

### Header gọn trên mobile
- Pet Hub ≤640px: tiêu đề "🐾 Hệ Thống Thú Cưng" → "🐾 Thú Cưng" (JS,
  khôi phục khi màn hình rộng lại), chip ví nhỏ, nút đóng 44×44px,
  `padding-top: calc(8px + env(safe-area-inset-top,0px))`; head 128px
  (320px) → ~56px.
- Langbar ≤640px: một hàng cuộn ngang thay vì wrap 2–3 hàng; 133px → ~51px.
  Thêm (phát hiện khi kiểm thử): langbar thành 1 hàng flex ở MỌI chiều rộng
  — nút Tài khoản của V13 (`#v21hubbtn`, v21.js gắn vào cuối `#v15langbar`
  mỗi khi mở EN Hub) làm langbar thành 2 hàng (92px) cả trên desktop; hàng
  chuyển đổi co lại (`flex:1; min-width:0`) + cuộn trong, nút Tài khoản
  `flex:none` ở cuối hàng → 51px.
- EN Hub head ≤640px: phụ đề 1 dòng (ellipsis), nút thành 1 hàng cuộn;
  157–185px → ~112px ở 320px. Tổng chrome EN ở 320px: ~355px → ~160px.
- Korean Hub: `.v7hud` bỏ `position:sticky` ở ≤760px (bảng farm cuộn theo
  trang); `#stage` thêm `padding-bottom: calc(118px + safe-area)` ở ≤640px
  để nội dung cuối không bị thanh tab cố định che (baseline:
  `contentCovered=true`, `padBottom=0px` ở mọi viewport); mascot `#mas`
  đẩy lên `bottom: calc(118px + safe-area)`.

### Tab Pet + tab EN Hub
- ≤760px: `flex-wrap:nowrap; overflow-x:auto` (ẩn thanh cuộn), tab
  `flex:none; min-height:44px`; tab đang chọn nền #F7BE38 + chữ #251A38.
  Pet: 3 hàng → 1 hàng ở ≤390px; EN Hub: 4 hàng → 1 hàng ở ≤375px.
- Thanh tab Pet sticky dưới header, `top` lấy từ biến `--nav-head-h` do
  `v26.js` đo bằng `offsetHeight` thật của `.v23head` (không đoán cứng).
- JS tự cuộn tab đang chọn vào giữa khi thanh tràn ngang.
- Nhớ tab: bọc `__v23.openHub` (không sửa `v23.js`); lần mở gần nhất lưu
  `sessionStorage['v26.petTab']`; nút 🐾 không tham số mở lại đúng tab đó.
  Tham số tường minh (nút "Đi ấp trứng" → `'hatch'`) được tôn trọng.

### Trạng thái trống (một thông báo chính)
- Chưa có thú (tab Thú cưng / Tiến hóa): ẩn thông báo trùng trong lưới,
  nâng khung chi tiết thành hero: ảnh trứng lửa, tiêu đề "Bạn chưa có thú
  cưng", mô tả "Ấp quả trứng đầu tiên để nhận người bạn đồng hành!", nút lớn
  "🥚 Đi ấp trứng" (nút thật của game → `__v23.openHub('hatch')`; tab Tiến
  hóa trước đây không có nút nên JS tạo mới). Tab Đội hình (0 thú) được
  thêm nút Đi ấp trứng ở panel trái.
- Có thú nhưng lọc không khớp: "Không tìm thấy thú cưng phù hợp." + nút
  "Xóa bộ lọc" thật (`setFilter('all')` + `setSearch('')`).
- Thông báo trong lưới được `grid-column: 1 / -1` (trước đây kẹt trong 1 cột
  ~80px, vỡ thành 6 dòng).

### Bộ lọc + danh sách
- `.v23filter` ≤560px xếp 2 hàng (select trên, input dưới), mỗi ô
  `min-height:44px`.
- `.v23slots`: `repeat(3, minmax(0,1fr))` + `.v23slot{min-width:0}` — sửa
  gốc lỗi min-content (slot không co dưới 102px); ảnh slot 64px ở ≤430px.
  Tràn 38px @320px và 12px @768px → 0.
- Egg Hatch ≤430px: trứng + đồng hồ xếp dọc, ảnh 120px.
- Ô thú trong lưới 64px ở ≤430px; nhãn dài `overflow-wrap:anywhere`.

### Màu sắc
- Token `--nav-*` theo spec §9: nền tối #201535, khung #30204F, ô nhập
  #1B1430, chữ #FFFFFF, chữ phụ #E4DDF1, tiêu đề vàng #FFD76A, viền tím
  #A78BFA, nút đang chọn #F7BE38 + chữ #251A38, nút phụ #6845A8 + chữ
  trắng. Tất cả đạt WCAG AA.

### Không làm (theo spec, có chủ ý)
- Không làm menu "Thêm ▼" (4 tab + dropdown): spec cho phép "thanh tab
  ngang có thể cuộn HOẶC menu chọn chức năng" — thanh cuộn ngang đơn giản
  và bền hơn, vẫn giữ đủ 7 tab trong 1 hàng.
- Không tạo header mobile mới tách biệt: gọn 3 header sẵn có thay vì thêm
  header thứ tư trùng chức năng.
- Không đổi dữ liệu thú cưng, save, Firebase.

## Số liệu baseline (V15.2, Chrome thật, `tools/v15nav/baseline26.json`)

- Pet head: 128px @320px · 102px @360px · 76px @375–430px · 59px @768/1366.
- Pet tabs: 3 hàng @320–390px · 2 hàng @414–430px · 1 hàng @768+.
- EN langbar 133px @≤430px · hub head 185px @320px · tabs 4 hàng / 198px
  @320–375px.
- Team slots tràn 38px @320px, 12px @768px.
- Korean `.v7hud` 204–254px @≤430px; `#stage` padBottom 0px,
  contentCovered=true ở mọi viewport.
- 2 khung trống "chưa có thú" ở mọi viewport; filter không xếp dọc ở bất kỳ
  viewport nào; không tràn ngang ở cấp document; không chồng chéo sibling.

## Lịch sử kiểm thử

- Lần 1: test26.js **204/214** trên Chrome thật (out/) — phát hiện 1 lỗi
  thật: nút Tài khoản V13 (`#v21hubbtn`) gắn vào cuối `#v15langbar` làm
  langbar thành 2 hàng (92px) mỗi khi mở EN Hub; sửa trong V26 (langbar
  thành 1 hàng flex ở mọi chiều rộng → 51px). Cùng lúc sửa 4 lỗi trong
  chính bộ kiểm thử (title runtime, probe toast sai id, kỳ vọng lang sai,
  error collector cài trước reload nên không thu được lỗi nào).
- Lần 2: test26.js **214/214, 0 lỗi, exit 0** trên Chrome thật ở 8
  viewport (320/360/375/390/414/430/768/1366).
- Lần 3: test26.js **214/214, 0 lỗi, exit 0** trên ZIP đã đóng gói (giải
  nén mới `/tmp/v15nav-zip`, server 8932; log `/tmp/test26-zip.log`).
- Ảnh sau: `tools/v15nav/shots-after/` (16 ảnh, đã xem trực tiếp 3 ảnh
  chính).

Xem SMOKE_TEST_V15_3_2026-11-17.md (phương pháp, kết quả theo mục, đối
chiếu 14 mục spec §12, sự cố môi trường).

## Sự cố môi trường trong quá trình làm V15.3

- Chrome hệ thống (`/opt/meta-chromium/chrome` 157.0.8103.81) chết với SIGTRAP
  (exit 133) từ ~23:40, sau khi baseline + 5 ảnh trước đã chụp xong; không
  sinh crash dump; binary nguyên vẹn (sha256 khớp MANIFEST).
- Ghi file từ container bị EPERM ngắt quãng (đợt kéo dài phút): một lần build
  đã ghi đè `out/index.html` thành 0 byte giữa chừng (write_text truncate
  rồi EPERM). Khôi phục bằng `tools/v15nav/restore_index.py` — ghi nối tiếp
  8KB/chunk từ ZIP V15.2, xác minh sha256 khớp ZIP byte-for-byte trước khi
  build lại.
- `muse.write` / `muse.edit` không bị ảnh hưởng trong suốt thời gian này.
- Việc tải Chromium headless-shell dự phòng qua Playwright
  (`tools/v15nav/pw/get-browser.mjs`) thất bại lần 1 (exit=1 sau 301s, log
  0 byte) trong đợt EPERM; thử lại khi môi trường ổn định.
