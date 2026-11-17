# Changelog — V15 → V15.1 (UI Readability Upgrade)

**Ngày:** 2026-11-17
**Phiên bản:** 15.1.0 · **Lớp mới:** V24 (`src/v24.css`, `src/v24.js`)
**Triết lý:** chỉ cải thiện UI/UX, không thay đổi logic game; sửa lần lượt
từng màn hình thay vì thay toàn bộ CSS cùng lúc (theo yêu cầu).

## Thay đổi

### Mới — Design System (v24.css §0)
- Tokens tập trung `--ui-*` theo đúng bảng màu Anh đưa (đã chỉnh sắc độ để
  đạt WCAG AA): `--ui-text-primary/secondary/dark`, `--ui-title-gold`,
  `--ui-bg-panel/content`, `--ui-border/border-gold`,
  `--ui-success/warning/danger`, `--ui-btn-green:#2E7D32`,
  `--ui-btn-danger-dark:#C1121F`, `--ui-text-muted-dark/light`,
  `--ui-btn-min-height:44px`.

### Sửa — Tương phản (WCAG AA 4.5:1 / 3:1)
- `.btn.pri` / `.btn.ok`: #3FAE62 → **#2E7D32** (trắng 2.82:1 → 5.13:1).
  Rule gốc `:root.btn.pri` (V6 line 156) thua vì v24.css nạp sau, cùng độ
  ưu tiên.
- `.v23bar-fight`: thêm `color:#FFF8E1` (trước kế thừa mực tối → 1.14:1).
- `.v18chip`: chữ → #3A2E22 (trước mọi màu nguyên tố/độ hiếm đều < 4.5:1;
  viền vẫn giữ màu `--ec` inline nên mã màu không mất). Lưu ý: `--ec` đặt
  inline trong v18.js nên rule đổi `--ec` không có tác dụng — phải override
  trực tiếp `color`.
- `.v21stat span`: #8A7A63 11.5px → #6B5B4A 12px (4.16:1 → 5.9:1).
- `.v23x` / `.v21x`: #E63946/#C0392B → #C1121F (trắng 5.9:1).
- `.v23btn.pri/.evo/.ok`: gradient đậm hơn (đầu gradient cũ trắng 2.3–3.4:1).
- `.v23tab`, `.v23note`, `.v23cellm`, `.v23count`, `.v23lv`, `.v23rar`,
  `.v23eggcard span`, `.v23slot span`, `.v23bf-pet`, `.v23bf-note`:
  #C9B8F0/#D9C8FF → #E5DEF5, 11px → 12px.
- `.v23filter input::placeholder`: #6B5B4A (nền sáng) nhưng riêng ô tìm
  kiếm Pet Hub (nền tối #1B1033) dùng #B7A6E0 ≈ 7.5:1.
- `input::placeholder` chung: #9A9A9A → #6B5B4A.
- `.v15fc .mute` / `.v15qcard .mute` (IPA): #7C6B58 → #6B5B4A.
- `.v17lib .mute`: #7C6B58 → #6B5B4A.
- `.v15chip` (XP/gems): nền trắng 12% → đen 28% (≈ 5.5:1).
- `.v15hub-headbtns .btn` (nút 🐾 trong header EN Hub): vàng gold #FFC53D
  (trước xám nhạt như bị vô hiệu).

### Sửa — Ban đêm (mặc định của profile mới, `html[data-v7night="1"]`)
- `#stage>.mute` ("Còn N từ"): #7C6B58 → #C9BFE0 (3.44:1 → ≈ 7.3:1).
- `#decks label` ("Bộ từ"): #3A2E22 → #E8ECF8.
- `label.chk` ("Chỉ từ cần ôn"): #7C6B58 → #C4B9E2.
- `.v7farm .mute`: #7C6B58 → #D8E8D0 (≈ 5.9:1 trên #2E5A34).
- Thanh tab dưới đáy: nền tối #1F2B22 + nhãn không chọn #C4B9E2 + nhãn
  `.v19kotab`/`.v23kotab` vàng #FFD76A. (Bài học: selector
  `html[...] :root .tabs` không bao giờ khớp vì `:root` CHÍNH LÀ `<html>` —
  phải viết `html[...] .tabs`. Lỗi này từng khiến tab vàng trên nền sáng
  chỉ còn 1.36:1 và đã được sửa.)

### Sửa — Typography & nút bấm
- Tab dưới đáy ≤480px: 10px + nowrap → **12px + wrap** (hết dính
  "Bản Đồ BossThú Cưng").
- `.st span`, `.v7plot .nm`, `.v7plot .st2`: 10–11px → 12px. (Lưu ý:
  selector gốc là descendant `.v7plot .nm`, không phải compound
  `.v7plot.nm` — rule đầu tiên viết sai selector nên không có tác dụng.)
- `.v19zone-meta`: 11px → 12px.
- `.btn.sm`, `.v23btn`, `.v23tab`, `.v15tab`: min-height 44px.
- Đáp án đúng/sai thêm ✓ / ✗ bằng `::after` (`.v15opt`, `.v18opt`,
  `.v19opt`) — không chỉ dùng màu, không sửa markup/logic.

### Sửa — Header & bố cục
- Korean header: `h1` + `h1 small` thêm bóng mềm, subtitle trắng #fff 600
  (trước #EAF7DD ≈ 2.2–2.6:1 ở đầu sáng gradient); pill `#sk/#sn` nền
  `rgba(20,60,25,.55)` (≈ 5:1); `.tab.on` gradient #58C16F → #257A3C/#1F6B33.
- Thanh tab dưới đáy ≤640px có nền đặc `var(--sf)` (không chữ đè lên nội
  dung cuộn).
- Boss Map ≤480px: map cao 1300px → **1600px**, zone 118px → 108px, ảnh
  74px → 64px (zone tops cách nhau 9% chiều cao; ở 1300px = 117px < island
  ~130px nên chồng nhau).
- Pet Hub ≤760px: `.v23pets/.v23evo/.v23team` dùng `minmax(0,1fr)` +
  `.v23side/.v23detail{min-width:0}` — hết tràn ngang 11px do grid blowout.
- Account Center ≤560px: `.v21sidebar` wrap 2 hàng (trước overflow-x:auto,
  tab cuối bị cắt).
- Modal: `max-width:94vw`.

### Sửa — 3 lỗi thật tìm thấy khi kiểm thử
1. **`.v15big.ko` va chạm class `.ko` (V6):** nút "KOREAN FARM" bị thu
   96px + grayscale + xoay 160°. V24: `width/height:auto; filter:none;
   animation:none; transform:none`.
2. **V18 fight không tự cuộn tới:** MutationObserver 2 tầng trong v24.js
   (tầng 1 chờ `#v18fight` được tạo khi mở tab Bosses; tầng 2 cuộn khi
   chuyển rỗng → có nội dung). Chỉ cuộn khi trận mới bắt đầu.
3. **`en15()` không backfill `modeBest`:** bản lưu có `en15` nhưng thiếu
   trường → English Hub crash (`reading 'flash'`). V24 backfill
   `modeBest/due/intv/hist/daily/bosses/speakDone/weakOnly/lang/level/topic`
   bằng đúng mặc định v15.js rồi `save15()`.

## Không đổi
- Không sửa logic game, không đổi khóa localStorage, không migration.
- Các lớp cũ giữ nguyên version: v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0,
  v20 = 12.0.0, v20_sync = 13.0.0, v21 = 13.0.0, v22 = 14.0.0.
- Firebase không đụng tới, vẫn chưa live-test.

## Kiểm thử
- test24.js: **84/84 checks × 3 lần chạy** (Chrome thật, 390px + 360/430px).
  Xem `SMOKE_TEST_V15_1_2026-11-17.md`.
- Audit tương phản độc lập: **0 lỗi / 0 chữ < 12px / 0 tràn ngang** trên
  14 màn hình (trước: 3–8 lỗi và 2–9 chữ nhỏ mỗi màn hình).
