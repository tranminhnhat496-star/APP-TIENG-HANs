# Changelog V7 → V8 — Smart Vocabulary Import

## V8 (2026-11-17) — Nhập, xuất và quản lý từ vựng chuyên nghiệp

### Thêm mới

- **Lớp V16 — Smart Import** (`v16.js`, `v16.css`, `window.__v16`):
  wizard 4 bước (Chọn file → Ánh xạ cột → Xem trước → Kết quả), giao diện
  mobile game 2D đồng bộ V7.
- **Tải file trực tiếp**: `.xlsx`, `.xls`, `.csv`, `.tsv`, `.txt`, `.json`;
  kéo thả hoặc chọn file, nhiều file cùng lúc, xử lý cục bộ (không gửi lên máy chủ).
- **SheetJS 0.18.5 đóng gói sẵn** trong `vendor/xlsx-0.18.5.full.min.js`
  (không CDN, không API key, chạy offline trên GitHub Pages).
- **Tự động nhận diện**: ngôn ngữ (Hangul/Latin), dòng tiêu đề, tên cột tiếng Việt
  hoặc tiếng Anh, cột xáo trộn thứ tự, dấu phân cách CSV, BOM, `\r\n`, dấu ngoặc kép;
  chọn sheet trong file Excel nhiều sheet; ánh xạ cột thủ công.
- **Xem trước**: thống kê (tổng dòng / hợp lệ / trùng / lỗi / sẽ thêm / sẽ cập nhật),
  sửa trực tiếp từng ô, xóa dòng, lọc dòng lỗi, tìm kiếm, chọn/bỏ chọn nhiều từ,
  phân trang 50 dòng/trang, hủy trước khi lưu. Chỉ lưu khi bấm "Xác nhận nhập từ vựng".
- **Phát hiện trùng**: theo ngôn ngữ + từ gốc (+ bộ từ với tiếng Hàn), chuẩn hóa
  Unicode NFKC, khoảng trắng, chữ hoa/thường (EN). 4 chế độ: bỏ qua / cập nhật /
  giữ cả hai / chỉ nhập từ mới. Cập nhật giữ nguyên ID và tiến trình SRS.
- **Quản lý bộ từ tiếng Anh** (mới): tạo, chọn, đổi tên, gộp, di chuyển từ, xóa bộ
  (không xóa từ); lọc từ theo bộ trong tab Từ vựng. Bộ tiếng Hàn dùng sẵn cơ chế
  `S.decks` của V6, nay xóa bộ sẽ chuyển từ về bộ mặc định thay vì xóa từ.
- **Xuất Excel/CSV/JSON** (toàn bộ hoặc theo bộ), nhập lại được bằng chính hệ thống;
  CSV xuất có BOM để Excel đọc đúng tiếng Việt.
- **File mẫu** trong `samples/`: `english-sample.xlsx`, `korean-sample.xlsx`,
  `english-sample.csv`, `korean-sample.csv`, `vocab-sample.json`.
- **File lớn 1.000–10.000 từ**: xử lý theo lô có thanh tiến trình + nút hủy,
  kiểm tra trùng bằng Map/Set, xem trước phân trang. Kiểm tra dung lượng
  localStorage trước khi lưu (cảnh báo ở ~4,8 MB), không tự xóa dữ liệu.

### Thay đổi (không phá dữ liệu cũ)

- `v15.js`: `window.__v15` công khai thêm các hàm nội bộ cho V16 dùng
  (`buildWords`, `enOld`, `en15`, `save15`, `dl`, `esc`, `pop15`, `renderTab`,
  `topicName`, `counts15`); `buildWords` áp dụng "ghi đè cập nhật" của V16;
  tab Từ vựng thêm nút **Nhập thông minh**, nút **Xuất Excel**, menu lọc theo bộ;
  cách nhập cũ (dán JSON / dòng `en | vi | ...`) giữ lại trong mục "Nhập nhanh (cũ)".
- `index.html`: tiêu đề đổi thành V8; thêm lớp V16 + script SheetJS vendored.
- Dữ liệu: chỉ thêm `S.v7.en16` (bộ từ EN, ánh xạ từ→bộ, ghi đè cập nhật) và
  `S.v7.ko16.levels` (trình độ thẻ Hàn). Khóa `hanvocab.v1` và mọi dữ liệu V6/V7
  giữ nguyên; V8 đọc được save V7/V6 không cần chuyển đổi.

### Lỗi tìm thấy khi kiểm thử V8 (đã sửa)

1. Dòng tiêu đề bị nhập thành một từ vựng (vòng lặp chuẩn bị bắt đầu sai dòng).
2. V15 bọc trong IIFE nên V16 gọi `enOld`/`buildWords` thất bại trong im lặng
   (báo cáo ghi "đã nhập" nhưng dữ liệu không lưu) — đã công khai API qua `__v15`
   và báo lỗi rõ thay vì ghi vào object rỗng.
3. Từ trùng ưu tiên sai bản ghi (cập nhật từ gốc thay vì từ người dùng tự thêm).

Chi tiết kiểm thử: `SMOKE_TEST_V8_2026-11-17.md` (80/80 đạt + hồi quy V7 40/40).

### Chưa kiểm thử

- Trình duyệt thật trên máy người dùng (môi trường kiểm thử chặn localhost,
  chặn miền muse.ai và tunnel). Cần kiểm tra trên GitHub Pages sau khi triển khai.
- Kích hoạt lỗi đầy bộ nhớ localStorage thật (mới kiểm tra bằng đọc code).
