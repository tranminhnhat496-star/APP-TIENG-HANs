# Changelog V15.1 → V15.2 — Vocabulary Library UI/UX Redesign

**Ngày:** 2026-11-17 · **Phiên bản:** 15.2.0 · **ZIP:** `Korean_English_Vocab_Farm_V15_Library_UI_Upgrade.zip`

## Tóm tắt

Thiết kế lại giao diện **Thư viện từ vựng** (A1–A2, Oxford 3000, Basic Tactics
24 Units, My Vocabulary, danh sách từ, flashcards, tìm kiếm/bộ lọc, popup) theo
bảng màu và quy định của Anh, ưu tiên tương phản WCAG AA và khả năng đọc.
Thực hiện bằng **lớp cộng thêm V25 duy nhất** — không sửa file cũ, không đổi
logic, không đổi dữ liệu, không đổi localStorage.

## File mới

| File | Nội dung |
|---|---|
| `src/v25.css` | Lớp V25: tokens `--lib-*`, thẻ nhóm/bộ từ, hàng từ, badge trạng thái, nút, tìm kiếm, BT, flashcard, vocab, toast, responsive. |
| `src/v25.js` | Lớp V25: decorator (badge trạng thái SRS, tiến trình nhóm, icon bộ từ, phân loại nút, `type=search`, trạng thái trống). Xuất `window.__v25 = {version:'15.2.0', decorate, statusOf, groupStats, idFromRow}`. |
| `build_v15lib.py` | Script build V15.2 (idempotent): gỡ lớp V25 cũ, inject V25 cuối cùng, đổi title thành V15.2, kiểm tra version các lớp cũ. |
| `package_v15lib.py` | Script đóng gói ZIP V15.2 + kiểm tra V25 nạp sau V24, đủ 30+30 PNG boss, 41 PNG thú/trứng, đủ các lớp cũ. |
| `README_V15_2_LIBRARY.md` | Hướng dẫn V15.2 (design system, thay đổi theo khu vực, bảng trước/sau, lưu ý trung thực). |
| `CHANGELOG_V15_1_to_V15_2.md` | File này. |
| `SMOKE_TEST_V15_2_2026-11-17.md` | Báo cáo kiểm thử V15.2 (test25.js 103/103 trên Chrome thật). |
| `tools/v15lib/` | Bộ kiểm thử V15.2: `test25.js`, `audit-lib.js`, `baseline25.js`, `shots25.js`, `setups/`, log 4 lần chạy, ảnh trước/sau (không đóng vào ZIP). |

## File sửa

| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V15.2; thêm lớp V25 CUỐI: `<style id="v25">`, `<script id="v25js">`. Không sửa bất kỳ lớp cũ nào. |
| `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` | Thêm mục V15.2. |

## Thay đổi chi tiết

### Tương phản — 3 vi phạm baseline đã sửa (audit Chrome thật, 390px)
1. `.v22type.wd` "Từ đơn" #2E7D32 trên #E3F2E6 = **4.42:1 ở 11px** → badge
   **#166534 trên #DCFCE7, 13px đậm**; "Cụm từ" #1E3A8A trên #E0E7FF.
2. `.btn.bad` "Chưa nhớ" (flashcard) #D9503F trên #FFFDF6 = **3.99:1** → nút
   đỏ đậm **#C1121F, chữ trắng** (5.9:1).
3. `.btn.sm.bad` "Xóa" (tab Từ vựng) #D9503F = **3.99:1** → cùng nút đỏ đậm
   #C1121F, chữ trắng.

### Tương phản — 2 lỗi phát hiện bằng đọc code (không thấy trong audit)
4. `.v17claimed` "Đã nhận thưởng" dùng `var(--ok)` #2E9B52 trên nền sáng =
   **3.3:1** → **#166534**.
5. `.v17nodata` "Chưa có dữ liệu" → **#B45309** (trước đây xám nhạt, khó đọc).

### Thẻ bộ từ và tiến trình
- Nhóm bộ từ: khung sáng #FFF9EF, bo góc 18px, viền tím; dải tiêu đề tối
  #292044 với tên vàng #FFD76A 20px, mô tả #E5DEF5.
- Thẻ bộ từ nền trắng, viền #D9C8F5, bo góc 16px; tên thẻ 17px, tự xuống
  dòng; thanh tiến trình cao 12px, nền #EDE6F8.
- **Tiến trình nhóm mới** (số liệu thật từ SRS): đã học · đã thuộc · cần ôn +
  thanh tiến trình; mẫu số theo tiêu đề nhóm (A1–A2 1000, Oxford 3396,
  BT 819). My Vocabulary không có thanh tiến trình (không có tổng số hoàn
  thành — bỏ qua có chủ đích, không bịa số).
- Icon: 📖 A1–A2, 📕 Oxford (BT 🎧, My Vocab 📁 đã có sẵn).

### Hàng từ vựng và nhãn trạng thái
- EN 19px, VI 16px, IPA 15px, phụ 13px; POS thành pill (#EDE6F8 / #4A2E8A),
  span POS rỗng được ẩn.
- **Badge trạng thái mới** từ hộp SRS + lịch ôn thật: ○ Chưa học / ◐ Đang học /
  ✓ Đã thuộc / ↻ Cần ôn — có biểu tượng và chữ, không chỉ dùng màu; cập nhật
  tự động qua MutationObserver.

### Nút bấm (chuẩn hóa theo spec)
- Học ngay #247A46, Ôn tập #6845A8 (chữ trắng), Xem từ nền sáng #FFF9EF +
  chữ tím đậm #4A2E8A; yêu thích đang bật (`.btn.on`, mới) nền vàng #F5C86A +
  chữ #3A2500; nút "← Thư viện" thành pill tím cao 44px.

### Tìm kiếm, bộ lọc, trạng thái trống
- Ô nhập có icon kính lúp, `type="search"` (nút xóa gốc), nền trắng, viền tím,
  cao 48px; select 15px/48px; mobile: ô tìm kiếm chiếm trọn một hàng.
- Lesson view có thêm thông báo trống rõ ràng (trước đây chỉ "Hiện 0/0 từ");
  thông báo "Không tìm thấy…" sẵn có được tạo kiểu thẻ đứt nét.
- Bộ lọc giữ nguyên khi chuyển màn hình (thiết kế sẵn có, không đổi).

### Basic Tactics, flashcards, tab Từ vựng, popup
- Tab Words/Phrases 15px/48px; `.v22stars` #B45309; `.v22bscope` khung sáng
  viền tím.
- Flashcard: mặt trước #FFF9EF, mặt sau #EDE6F8, viền tím, bo góc 18px;
  Đã nhớ #247A46, Chưa nhớ #C1121F; tắt hiệu ứng lật khi
  `prefers-reduced-motion`.
- Tab Từ vựng: hàng từ và form thêm từ restyle theo cùng hệ thống; toast
  15px, tối đa 90vw, căn giữa.

### Một sửa CSS theo spec (phát hiện trong kiểm thử)
- Tiêu đề Thư viện ở mobile từng bị ghi đè còn 22px (dưới spec 24–28px) →
  **24px ở mọi kích thước**.

## Không đổi (giữ nguyên 100%)

- Mọi dữ liệu từ vựng, mọi chế độ học, SRS, boss, farm, thú cưng, Firebase,
  XP/vàng/kim cương/thành tích, localStorage, mọi layer cũ và version của
  chúng (v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0, v20 = 12.0.0,
  v20_sync/v21 = 13.0.0, v22 = 14.0.0, v24 = 15.1.0).

## Kiểm thử và lỗi

- **test25.js: 103/103** trên Chrome thật 157 (390px). Chi tiết xem
  `SMOKE_TEST_V15_2_2026-11-17.md`.
- **Không có lỗi ứng dụng nào được tìm thấy trong V15.2.** Các lần chạy trước
  (92/103 → 99/103 → 102/103) chỉ lộ 8 lỗi test (kiểm tra nhầm màn hình, trạng
  thái còn lưu từ lần chạy trước, kỳ vọng sai về hành vi sẵn có như
  `closeHub` chỉ ẩn hub, V22 view persistence) và 1 lỗi CSS (tiêu đề 22px ở
  mobile) — tất cả đã sửa.
- **Edge case có sẵn từ V14, không sửa trong bản này:** scope BT còn lưu +
  mở flash ngay sau khi tải lại trang (chưa mở Thư viện) → flash báo trống vì
  dữ liệu BT chưa tải. Mở Thư viện một lần là hết. Xem README § "Lưu ý trung
  thực" (2).
