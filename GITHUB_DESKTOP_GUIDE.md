# Hướng dẫn cập nhật lên V7 bằng GitHub Desktop

Áp dụng khi repo GitHub Pages của bạn đang chạy bản V6.

## Chuẩn bị
1. Giải nén file ZIP V7 ra một thư mục trên máy.
2. Mở **GitHub Desktop**, mở repo của game (nếu chưa có: `File → Clone Repository`).
3. **Sao lưu trước (khuyên dùng):** trong game đang chạy, mở English Hub →
   tab **Sao lưu** → **Tải file sao lưu (.json)** và cất file đó ở nơi an toàn.
   Dữ liệu người chơi nằm trong trình duyệt của từng người dùng, việc cập nhật
   code trên GitHub **không xóa** dữ liệu đó.

## Cập nhật
1. Trong thư mục repo trên máy, **ghi đè / thêm** các file từ ZIP V7:
   - `index.html` (mới — đây là file GitHub Pages sẽ chạy)
   - `v15.js`, `v15.css`, `v15_data.js`, `v15_words.json`
   - `build_v7.py`, `validate_words.py`
   - `README_V7.md`, `CHANGELOG_V6_to_V7.md`, `CHANGED_FILES.md`,
     `GITHUB_DESKTOP_GUIDE.md`
   - Giữ nguyên mọi file V6 và thư mục `assets/` (ZIP đã chứa đầy đủ).
2. Trong GitHub Desktop, kiểm tra tab **Changes**: phải thấy `index.html` thay
   đổi (hoặc mới) và các file `v15*` mới. Không nên thấy file nào bị xóa.
3. Ghi commit message, ví dụ: `Upgrade to V7: English Farm, 1000 words, 10 modes, 10 bosses`
4. Bấm **Commit**, rồi **Push origin**.

## Kiểm tra sau khi deploy
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Lần đầu mở sẽ hiện màn hình chọn **Korean Farm / English Farm**.
3. Thử: chọn English Farm → mở English Hub → chơi 1 ván Multiple Choice →
   kiểm tra XP tăng và cây trong tab Farm được tưới.
4. Kiểm tra dữ liệu cũ: chuyển sang Korean Farm, từ vựng và tiến trình tiếng
   Hàn phải còn nguyên. Nếu thiếu, dùng file sao lưu đã tải ở bước chuẩn bị:
   English Hub → **Sao lưu** → chọn file để khôi phục.

## Quay lại V6 (nếu cần)
- Trong repo, file `Korean_Vocab_Farm_V6_Bilingual.html` vẫn còn nguyên.
  Đổi tên nó thành `index.html` (ghi đè), commit và push là quay lại V6.
  Dữ liệu người chơi (localStorage `hanvocab.v1`) không bị ảnh hưởng vì V7
  không đổi tên khóa lưu.

---

# Hướng dẫn cập nhật lên V8 bằng GitHub Desktop

Áp dụng khi repo GitHub Pages của bạn đang chạy bản V7.

## Chuẩn bị
1. Giải nén file ZIP V8 ra một thư mục trên máy.
2. Mở **GitHub Desktop**, mở repo của game.
3. **Sao lưu trước (khuyên dùng):** trong game đang chạy, mở English Hub →
   tab **Sao lưu** → **Tải file sao lưu (.json)** và cất file đó ở nơi an toàn.
   Dữ liệu người chơi nằm trong trình duyệt của từng người dùng, việc cập nhật
   code trên GitHub **không xóa** dữ liệu đó.

## Cập nhật
1. Trong thư mục repo trên máy, **ghi đè / thêm** các file từ ZIP V8:
   - `index.html` (mới — đây là file GitHub Pages sẽ chạy)
   - `v16.js`, `v16.css`, thư mục `vendor/`, thư mục `samples/`
   - `v15.js` (đã sửa — thêm API cho V16, nút Nhập thông minh, lọc theo bộ)
   - `build_v8.py`, `gen_samples.js`
   - `README_V8_IMPORT.md`, `CHANGELOG_V7_to_V8.md`, `CHANGED_FILES.md`,
     `SMOKE_TEST_V8_2026-11-17.md`, `GITHUB_DESKTOP_GUIDE.md`
   - Giữ nguyên mọi file V7 và thư mục `assets/` (ZIP đã chứa đầy đủ).
2. Trong GitHub Desktop, kiểm tra tab **Changes**: phải thấy `index.html` thay
   đổi, `v15.js` thay đổi, `v16.js`/`v16.css`/`vendor/`/`samples/` mới.
   Không nên thấy file nào bị xóa.
3. Ghi commit message, ví dụ: `Upgrade to V8: Smart Vocabulary Import (Excel/CSV/JSON, decks, preview)`
4. Bấm **Commit**, rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng — kiểm thử trên trình duyệt thật)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Thử nhập mẫu: English Hub → tab **Từ vựng** → **🧠 Nhập thông minh** →
   tải file `samples/english-sample.xlsx` lên (link mẫu có ngay trong bước 1),
   đi qua 4 bước và xác nhận nhập. 5 từ mẫu phải xuất hiện trong danh sách.
3. Thử trùng lặp: nhập lại chính file mẫu đó, chọn chế độ **Cập nhật** —
   phải báo 5 từ trùng / 0 từ mới, không tạo từ trùng.
4. Kiểm tra dữ liệu cũ: chuyển sang Korean Farm, từ vựng và tiến trình tiếng
   Hàn phải còn nguyên. Nếu thiếu, dùng file sao lưu đã tải ở bước chuẩn bị để khôi phục.
5. Thử xuất: bấm **Xuất Excel** trong tab Từ vựng, mở file tải về kiểm tra
   tiếng Việt hiển thị đúng.

## Quay lại V7 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước khi
  nâng cấp V8 → **Revert this commit** (hoặc checkout lại `index.html` và
  `v15.js` của V7), commit và push. Dữ liệu người chơi không bị ảnh hưởng vì
  V8 không đổi tên khóa lưu `hanvocab.v1`; các khóa mới `S.v7.en16` và
  `S.v7.ko16.levels` chỉ bị V7 bỏ qua.
