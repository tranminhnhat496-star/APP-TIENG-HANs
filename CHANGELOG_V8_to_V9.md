# Changelog V8 → V9 — Built-in Vocabulary Library

## V9 (2026-11-17) — Thư viện từ vựng tiếng Anh có sẵn trong English Hub

### Thêm mới

- **Lớp V17 — Built-in Vocabulary Library** (`v17.js`, `v17.css`, `window.__v17`):
  tab **📚 Thư viện** mới trong English Hub, hiển thị ngay khi mở Hub,
  không cần upload file.
- **Bộ A1–A2 Vocabulary — 1.000 từ, 19 chủ đề** (`v17_a1a2.js`, `v17_a1a2.json`):
  trích xuất từ `Tong-hop-1000-tu-vung-tieng-anh-A1-A2.pdf` (37 trang, STT 1–1000
  liên tục). Giữ từ tiếng Anh, nghĩa tiếng Việt, IPA chuẩn, loại từ, chủ đề gốc,
  cụm từ nhiều từ. Cả bộ ghi chung trình độ **A1–A2** (tài liệu không ghi cấp độ
  riêng từng từ nên không tự tách A1/A2).
- **Bộ Oxford 3000 — 3.396 từ, 136 bài × 25 từ** (`v17_oxford.js`, `v17_oxford.json`):
  trích xuất từ `3000_t__B1.pdf` (120 trang, No. 1–3396 liên tục — tên tài liệu
  ghi "3000" nhưng bảng thực tế có 3.396 mục, đã kiểm chứng). Giữ nguyên thứ tự
  gốc, phiên âm đơn giản của nguồn (không phải IPA chuẩn), loại từ. Không gán
  toàn bộ là B1. Có tìm kiếm + lọc theo loại từ.
- **Nhóm Từ vựng của tôi** trong Thư viện: đếm từ tự thêm / bộ từ / từ yêu thích,
  liên kết sang tab Từ vựng và Nhập thông minh V8. Từ hệ thống và từ cá nhân
  không bao giờ trộn lẫn.
- **Xem một bài/chủ đề**: tên bộ, tổng số từ, đã học / đã thuộc / cần ôn, thanh
  tiến độ, danh sách bài; thẻ từ có từ, phiên âm, nghĩa, loại từ, nút Nghe
  (Web Speech API), chủ đề/bài, đánh dấu Đã thuộc, Yêu thích, Sao chép để sửa.
  Tìm kiếm + lọc loại từ + lọc trạng thái (chưa học / đang học / đã thuộc /
  cần ôn / yêu thích), phân trang 30 từ/trang.
- **Phạm vi học (scope)**: Học ngay / Ôn tập / Đánh boss từ một bài, chủ đề hoặc
  cả bộ — các chế độ học, SRS và boss chỉ dùng từ trong phạm vi đã chọn, hiện
  banner "Đang học: …" trên mọi tab của Hub, bấm ✕ để bỏ chọn.
- **Thưởng hoàn thành bài/chủ đề** (mới, chống farm): học hết một bài Oxford
  +25 XP +1 💎; một chủ đề A1–A2 +50 XP +2 💎; toàn bộ A1–A2 +200 XP +5 💎;
  toàn bộ Oxford +300 XP +5 💎. Mỗi bài/chủ đề nhận thưởng đúng 1 lần, ghi trong
  `S.v7.en17.claimed`. XP từng câu vẫn theo luật chống farm cũ của V15.
- **Từ trùng**: một từ chỉ có một bản ghi chuẩn (chung một hồ sơ SRS) dù xuất
  hiện ở cả hai bộ (303 từ) hay hai lần trong một bộ với nghĩa khác (A1–A2: 5 từ,
  Oxford: 3 từ). Nghĩa/loại từ khác nhau lưu thành **nghĩa phụ** (`extra`) và
  hiển thị trong thẻ từ. Từ ở hai chủ đề/bài (vd `orange`, `may`) xuất hiện ở cả
  hai nơi nhưng chỉ học một lần.
- **Dữ liệu bàn giao**: `v17_a1a2.json`, `v17_oxford.json`, `v17_review.json`
  (danh sách trùng, lỗi, sửa đổi, mục cần kiểm tra) và `REPORT_PDF_EXTRACTION.md`
  (báo cáo trích xuất từng PDF: số lượng, cách xử lý, lỗi in đã sửa).

### Thay đổi (không phá dữ liệu cũ)

- `v15.js`:
  - `buildWords()`: gắn thông tin thư viện vào bản ghi chuẩn (không tạo bản ghi
    trùng); **khôi phục cấp độ thật của 1.000 từ V15** (A1 300 / A2 300 / B1 250 /
    B2 150) — ở V7/V8 mọi từ đều bị gán nhầm thành A1 nên bộ lọc cấp độ A2/B1/B2
    của tab Học không hoạt động; nay đã sửa, không đổi ID nên SRS không ảnh hưởng.
  - `pushV17IntoV14()`: đẩy dữ liệu thư viện vào `__v14.ENWORDS` / `__v14.TOPICS`
    (cùng cơ chế V15) để các chế độ V6/V14 cũng thấy từ mới.
  - `wordsFiltered()`, `reviewStart()`, `reviewHTML()`: tôn trọng phạm vi Thư viện
    khi đã chọn; `en15()` thêm `scope:null` (save cũ không có scope vẫn chạy).
  - Hub thêm tab **📚 Thư viện** (thứ 2 sau Học tập) + banner phạm vi đang chọn.
  - `window.__v15` công khai thêm `setScope`, `clearScope`, `wordsFiltered`,
    `inScope`, `gain15`; version `9.0.0`.
  - Sửa một lỗi nhỏ có sẵn: callback hiệu ứng trúng đòn của boss (450ms) có thể
    chạy sau khi đóng trận đấu và gây lỗi `B.hit` trên `null` — nay kiểm tra `B`
    còn tồn tại trước khi dùng.
- `index.html`: tiêu đề đổi thành V9; thêm lớp V17 (CSS + dữ liệu A1–A2/Oxford
  nhúng sẵn như dữ liệu V15 — chạy đồng bộ, hoạt động cả file:// và GitHub Pages,
  không cần fetch; giao diện vẫn tải theo nhu cầu: mỗi bài/chủ đề chỉ vẽ 20–30
  thẻ từ một lúc).
- Dữ liệu: chỉ thêm `S.v7.en17` (`fav`, `claimed` — chỉ lưu ID). Khóa `hanvocab.v1`
  và mọi dữ liệu V6/V7/V8 giữ nguyên; V9 đọc được save V6/V7/V8 không cần chuyển đổi.

### Xử lý dữ liệu PDF (xem chi tiết trong REPORT_PDF_EXTRACTION.md)

- Đọc toàn bộ trang bằng tọa độ (PyMuPDF); cột Nghĩa căn trên, các cột khác căn
  dưới nên dòng nghĩa đầu nằm cao hơn dòng từ ~13pt — bộ trích xuất dùng máy
  trạng thái theo số thứ tự để không gán nhầm nghĩa.
- Chuẩn hóa phiên âm Oxford (font mã hóa ký tự lạ: `´`→`ˈ`, `,`/`¸`→`ˌ`, `η`/`ɳ`→`ŋ`,
  `∫`→`ʃ`, `ә`→`ə`, `Δ`/`Λ`→`ʌ`, `з`→`ə`, `З`→`ʤ`); sửa IPA A1–A2 (`·`→`.`,
  bỏ khoảng trắng thừa).
- Chèn lại 168 khoảng trắng bị rớt trong lớp chữ của PDF (chỉ chèn khoảng trắng,
  không đổi chữ cái), sửa 54 đầu từ/loại từ (từ ngắt dòng, loại từ dính vào cột từ),
  sửa 7 lỗi in đã kiểm chứng bằng hình ảnh (`chạm chán`→`chạm trán`,
  `cấn đảm`→`can đảm`, `họat`→`hoạt`, `tư tư`→`từ từ`, `lũ lụtl`→`lũ lụt`,
  `trượtc`→`trượt`, `anybod`→`anybody`).
- Thiếu dữ liệu thật trong nguồn (không tự điền): Oxford thiếu phiên âm 91 từ,
  thiếu loại từ 40 từ; hiển thị "Chưa có phiên âm" trong ứng dụng.
- Mục cần kiểm tra (không tự đoán): `gram, gramme` ghi nghĩa `ngữ pháp` (nghi ngờ
  lỗi nguồn, giữ nguyên); `pomegranate` ghi `quả lưu` (giữ nguyên, chưa đủ bằng
  chứng sửa thành `quả lựu`).

### Lỗi tìm thấy khi kiểm thử V9 (đã sửa)

1. **V15 gán nhầm mọi từ thành A1** (xem mục Thay đổi ở trên) — bộ lọc cấp độ
   A2/B1/B2 không hoạt động từ V7. Đã khôi phục cấp độ thật từ dữ liệu V15.
2. **Từ trùng đầu từ chỉ xuất hiện ở chủ đề/bài đầu tiên** (vd `orange` chỉ ở
   chủ đề Trái cây, mất ở chủ đề Màu sắc) — đã lưu mảng chủ đề/bài
   (`a1a2Topics`, `oxLessons`) để từ xuất hiện ở mọi nơi nó thuộc về.
3. **Boss fight không vẽ gì khi mở từ tab khác** (test gọi `bossFight` khi đang ở
   tab Học — `#v15bossfight` chỉ có ở tab Bosses) — không phải lỗi app: nút
   "Đánh boss" trong Thư viện luôn mở tab Bosses trước. Test đã sửa theo đúng
   luồng người dùng.
4. **Callback hiệu ứng boss gây lỗi sau khi đóng trận đấu** (`B.hit` trên `null`) —
   đã thêm kiểm tra `B` còn tồn tại.
5. **Test V8 dùng `kiwi` làm "từ mới"** — nay `kiwi` đã là từ có sẵn trong bộ
   A1–A2 nên V16 phân loại đúng thành "từ trùng". Không phải lỗi app: bộ kiểm thử
   hồi quy V8 đã đổi từ mới mẫu thành `durian` (chưa có trong dữ liệu V9).
