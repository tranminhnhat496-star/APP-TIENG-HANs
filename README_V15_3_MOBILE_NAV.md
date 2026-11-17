# Korean & English Vocab Farm V15.3 — Mobile Responsive & Pet Navigation Fix

Lớp cộng thêm **V26** (`src/v26.css` + `src/v26.js`, version **15.3.0**), nạp CUỐI
CÙNG sau V25. Không sửa file cũ, không đổi logic game, không đổi dữ liệu thú
cưng, không đổi localStorage, không đổi khóa lưu trữ.

## Vấn đề gốc (đo được trên bản V15.2, Chrome thật)

Anh gửi ảnh chụp màn hình thực tế (ảnh không đính kèm tới được phía em — em
làm việc trực tiếp trên mã nguồn và đo bằng Chrome thật ở 8 viewport
320–1366px; toàn bộ số liệu dưới đây lấy từ `tools/v15nav/baseline26.json`).

| # | Vấn đề | Nguyên nhân gốc trong mã nguồn | Số đo baseline |
|---|---|---|---|
| 1 | Mở Pet Hub thì thanh Korean/English nổi lên trên, che mất header Pet (tiêu đề, ví XP/gem, nút đóng ✕) | **z-index đảo ngược:** `#v23hub` z-index:120 thấp hơn `#v15langbar` (900) và `.v15hub` (950) | Pet header bị che hoàn toàn khi Pet Hub mở |
| 2 | Menu Pet xuống 2–3 hàng nút lớn | `.v23tabs` dùng `flex-wrap:wrap` với 7 tab | 3 hàng ở ≤390px, 2 hàng ở 414–430px |
| 3 | Menu EN Hub xuống 3–4 hàng; header + langbar + tabs chiếm ~516px ở 320px trước khi tới nội dung | `.v15tabs` `flex-wrap:wrap` (10 tab); `.v15langbar` wrap 2–3 hàng (133px); `.v15hub-head` wrap (157–185px) | tabs 198px, 4 hàng ở 320–375px |
| 4 | Thẻ đội hình thứ 3 tràn khỏi màn hình | **grid min-content:** `.v23slots` dùng `repeat(3,1fr)` = `minmax(auto,1fr)` nên slot không co dưới min-content của ảnh (110px) | tràn 38px ở 320px, 12px ở 768px |
| 5 | Nội dung cuối Korean Hub bị thanh tab dưới che | Thanh `.tabs` `position:fixed; bottom:8px` nhưng `#stage` không có `padding-bottom` | `contentCovered=true`, `padBottom=0px` ở mọi viewport |
| 6 | Hai thông báo "Chưa có thú cưng" cùng lúc | `tabPets()` render cả `<p class="v23empty">Chưa có thú cưng nào khớp bộ lọc.</p>` trong lưới VÀ khung chi tiết "Chưa có thú cưng nào" khi chưa có thú | 2 khung trống đếm được ở mọi viewport |
| 7 | Bộ lọc hệ + ô tìm kiếm chen nhau trên điện thoại | `.v23filter` luôn `display:flex` một hàng | select 128px + input 128px ở 320px |
| 8 | Header Pet Hub cao 128px ở 320px; `.v7hud` (bảng farm) dính 204–254px trên mobile | `.v23head` wrap (tiêu đề + 2 chip ví); `.v7hud` `position:sticky` | head 128px @320px, hud 204px @390px |
| 9 | Langbar vẫn 2 hàng (92px) ngay cả khi hàng chuyển đổi đã gọn 1 hàng | **Nút Tài khoản của V13** (`#v21hubbtn`, v21.js `injectHubBtn()` gắn vào cuối `#v15langbar` mỗi khi mở EN Hub); langbar là `display:block` nên nút rơi xuống hàng riêng (51px + 40px) | langbar 92px ở MỌI viewport khi EN Hub mở (đo bằng probe CDP) |

Ngoài ra: thông báo trong lưới Thú cưng ("Chưa có thú cưng nào khớp bộ lọc.")
nằm trong lưới 3 cột nên chỉ chiếm 1 cột (~80px) và vỡ thành 6 dòng; và khi có
thú nhưng lọc không khớp, game hiện cùng một câu như khi chưa có thú — không
phân biệt được 2 trường hợp.

## Đã sửa như thế nào (lớp V26)

### 1. Sửa z-index tận gốc (v26.css §1)
- `#v23hub` z-index **120 → 960**: nổi trên langbar (900) và EN Hub (950),
  vẫn dưới các modal (1000) nên màn hình đăng nhập / popup vẫn hiện trên Pet
  Hub như trước.
- `#v23toast` (toast Pet Hub append vào `document.body`, không nằm trong
  `#v23hub`) z-index **200 → 970** để thông báo không chìm dưới Pet Hub.

### 2. Tab Pet + tab EN Hub: một hàng cuộn ngang, dính dưới header (§3)
- `.v23tabs` và `.v15tabs` ở ≤760px: `flex-wrap:nowrap; overflow-x:auto`
  (ẩn thanh cuộn, vuốt ngang mượt), mỗi tab `flex:none; min-height:44px`,
  tab đang chọn có nền vàng #F7BE38 + chữ #251A38.
- Thanh tab Pet **dính (sticky)** dưới header: `top` lấy từ biến
  `--nav-head-h` do `v26.js` đo bằng `offsetHeight` thật của header sau mỗi
  lần mở hub / resize — không đoán cứng chiều cao.
- `v26.js` tự cuộn tab đang chọn vào giữa thanh tab khi thanh tràn ngang.
- **Nhớ tab đang mở:** `v26.js` bọc `__v23.openHub` (không sửa `v23.js`):
  tab lần mở gần nhất lưu vào `sessionStorage` (`v26.petTab`, không chạm save
  game); các nút 🐾 mở Pet Hub không tham số (langbar / EN Hub / Korean Hub)
  sẽ mở lại đúng tab đó thay vì luôn về tab Thú cưng. Nút "Đi ấp trứng" vẫn
  mở đúng tab Ấp trứng (tham số tường minh được tôn trọng).

### 3. Header gọn trên mobile (§2, §7, §8)
- **Pet Hub (≤640px):** tiêu đề rút ngắn thành "🐾 Thú Cưng" (JS đổi chữ,
  khôi phục khi màn hình rộng lại); chip ví nhỏ lại; nút đóng 44×44px;
  cộng `env(safe-area-inset-top/bottom)` cho tai thỏ / Dynamic Island.
  Header 128px → ~56px ở 320px (1 hàng).
- **Langbar (≤640px):** một hàng cuộn ngang thay vì 2–3 hàng (133px → ~51px).
  Thêm: langbar thành 1 hàng flex ở mọi chiều rộng — hàng chuyển đổi co lại
  (`flex:1; min-width:0`), nút **Tài khoản** (v21) cố định ở cuối hàng thay
  vì rơi xuống hàng thứ 2 (92px → 51px cả trên desktop).
- **EN Hub head (≤640px):** phụ đề 1 dòng (ellipsis), nút thành 1 hàng cuộn;
  head 157–185px → ~112px ở 320px.
- **EN Hub chrome tổng ở 320px:** ~355px (head + tabs, langbar ẩn sau hub)
  → ~180px.
- **Korean Hub:** `.v7hud` bỏ `position:sticky` trên mobile (≤760px) — bảng
  farm cuộn theo trang thay vì chiếm 200px+ cố định; `#stage` thêm
  `padding-bottom: calc(118px + safe-area)` ở ≤640px để nội dung cuối trang
  không bị thanh tab cố định che; mascot `#mas` đẩy lên vùng đệm dưới trang.

### 4. Trạng thái trống: một thông báo chính (§6)
- Khi **chưa có thú**: `v26.js` ẩn thông báo trùng trong lưới, nâng khung chi
  tiết thành hero duy nhất: ảnh trứng lửa (trứng tặng khi mới chơi), tiêu đề
  **"Bạn chưa có thú cưng"**, mô tả **"Ấp quả trứng đầu tiên để nhận người
  bạn đồng hành!"**, nút lớn **"🥚 Đi ấp trứng"** (nút thật có sẵn của game,
  gọi `__v23.openHub('hatch')`). Áp dụng cho tab Thú cưng và tab Tiến hóa
  (tab Tiến hóa trước đây hiện 2 khung trống: danh sách + "Chọn một thú cưng
  để xem tiến hóa."). Tab Đội hình (0 thú) được thêm nút Đi ấp trứng ở panel
  trái.
- Khi **có thú nhưng lọc không khớp**: lưới hiện **"Không tìm thấy thú cưng
  phù hợp."** kèm nút **"Xóa bộ lọc"** thật (gọi `__v23.setFilter('all')` +
  `__v23.setSearch('')`). Hai trường hợp giờ phân biệt rõ.
- Thông báo trong lưới được `grid-column: 1 / -1` để chiếm trọn chiều rộng
  thay vì kẹt trong 1 cột.

### 5. Bộ lọc + danh sách (§7, §8)
- `.v23filter` ở ≤560px xếp thành **2 hàng** (select trên, input dưới), mỗi ô
  `min-height:44px`, đủ rộng.
- **Team slots:** `grid-template-columns: repeat(3, minmax(0,1fr))` +
  `.v23slot{min-width:0}` — sửa đúng nguyên nhân min-content; ảnh slot 64px
  ở ≤430px. Slot thứ 3 không còn tràn ở 320px và 768px.
- **Egg Hatch (≤430px):** trứng + đồng hồ xếp dọc, ảnh 120px.
- Ô thú trong lưới 64px ở ≤430px; nhãn dài dùng `overflow-wrap:anywhere`.

### 6. Bảng màu (§9)
Token `--nav-*` theo đúng bảng màu của spec: nền tối `#201535`, khung
`#30204F`, ô nhập `#1B1430`, chữ chính `#FFFFFF`, chữ phụ `#E4DDF1`, tiêu đề
vàng `#FFD76A`, viền tím `#A78BFA`, nút đang chọn `#F7BE38` + chữ `#251A38`,
nút phụ `#6845A8` + chữ trắng. Tất cả đều đạt WCAG AA (≥4.5:1).

### Không làm (theo spec, có chủ ý)
- **Không làm menu "Thêm ▼"** tách 4 tab + dropdown: spec cho phép "thanh tab
  ngang có thể cuộn HOẶC menu chọn chức năng" — thanh cuộn ngang đơn giản,
  bền hơn (không thêm trạng thái dropdown mới, không rủi ro che nội dung) và
  vẫn giữ đủ 7 tab trong 1 hàng. Nếu anh vẫn muốn dạng 4 + Thêm, em làm tiếp
  ở bản sau.
- **Không tạo header mobile mới** tách biệt: game đã có 3 header (langbar,
  EN Hub head, Pet Hub head) — V26 gọn chúng lại thay vì thêm header thứ tư
  trùng chức năng.
- **Không đổi dữ liệu thú cưng, không đổi save, không đổi Firebase.**

## Kiểm thử

test26.js: **214/214 kiểm tra đạt, 0 lỗi** trên Chrome thật ở 8 viewport
(320/360/375/390/414/430/768/1366) — chạy 2 lần trên `out/` và 1 lần trên ZIP
đã đóng gói (giải nén mới), xem `SMOKE_TEST_V15_3_2026-11-17.md` (đo lại toàn
bộ baseline + kiểm thử chức năng 14 mục spec §12).

Lần chạy 1: 204/214 — phát hiện 1 lỗi thật (nút Tài khoản làm langbar 2
hàng, xem nguyên nhân #9) và 4 lỗi trong chính bộ kiểm thử (đã sửa, chạy
lại đạt 214/214).

## Cập nhật

Xem `GITHUB_DESKTOP_GUIDE.md` — mục V15.3 (sao lưu trước, copy toàn bộ ZIP vào
repo APP-TIENG-HANS, commit `Upgrade to V15.3: Mobile Responsive & Pet Navigation Fix`, push; rollback về V15.2 bằng Revert this commit).
