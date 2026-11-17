# Danh sách file đã thay đổi — V6 → V7

## File mới (lớp V15 — toàn bộ tính năng V7 nằm ở đây)
| File | Nội dung |
|---|---|
| `index.html` | **Điểm khởi chạy chính.** Build từ bản V6 + lớp V15 (xem `build_v7.py`). |
| `v15.js` | Language switcher + chooser, English Hub, 10 chế độ học, English Farm, 10 boss, SRS, thống kê, quản lý từ vựng, sao lưu/khôi phục. |
| `v15.css` | Theme English Farm, hub, farm, boss, responsive mobile. |
| `v15_data.js` | 48 câu ngữ pháp, 8 bài đọc + 24 câu hỏi, 40 câu xếp câu, 20 chủ đề mới. |
| `v15_words.json` | 1.000 từ tiếng Anh mới (A1 300 / A2 300 / B1 250 / B2 150) kèm IPA + ví dụ. |
| `build_v7.py` | Script build: V6 HTML + v15 → `index.html`. Kiểm tra đủ 1.000 từ mới. |
| `validate_words.py` | Script kiểm tra từ vựng: trùng lặp, IPA, ví dụ, cấp độ, chủ đề. |
| `README_V7.md` | Hướng dẫn sử dụng V7 (file này thay cho README V6 khi deploy V7). |
| `CHANGELOG_V6_to_V7.md` | Changelog đầy đủ. |
| `CHANGED_FILES.md` | File này. |
| `GITHUB_DESKTOP_GUIDE.md` | Hướng dẫn cập nhật bằng GitHub Desktop. |

## File giữ nguyên 100% (không sửa, không xóa)
- `Korean_Vocab_Farm_V6_Bilingual.html` — bản V6 gốc, giữ lại để đối chiếu.
- `README_V6_Bilingual.md`
- `v7.js`, `v8.js`, `v9.js`, `v10.js`, `v11.js`, `v12.js`, `v13.js`, `v14.js`
- `v7.css`, `v8.css`, `v9.css`, `v10.css`, `v11.css`, `v12.css`, `v13.css`, `v14.css`
- `build.py` (script build của V6), `split_icons.py`, `split_decor.py`, `process_bosses.py`
- Toàn bộ thư mục `assets/` (boss, crops, decor, buildings, icons, maps,
  mascot, pets, scene, fx)

## Dữ liệu người chơi (localStorage)
- Khóa `hanvocab.v1` **giữ nguyên**, không đổi tên.
- Thêm khóa mới duy nhất trong cùng bản lưu: `S.v7.en15` (tiến trình V15:
  ngôn ngữ đã chọn, SRS due/intervals, lịch sử 7 ngày, farm, boss).
- Hộp nhớ từ tiếng Anh dùng lại `S.v7.en` của V14 (không tạo bản sao gây lệch).

---

# Danh sách file đã thay đổi — V7 → V8

## File mới (lớp V16 — toàn bộ tính năng V8 nằm ở đây)
| File | Nội dung |
|---|---|
| `v16.js` | Smart Import: đọc file xlsx/csv/tsv/txt/json, tự nhận diện ngôn ngữ/tiêu đề/cột/dấu phân cách, wizard 4 bước, xem trước + xử lý trùng, quản lý bộ từ EN, xuất Excel/CSV/JSON. |
| `v16.css` | Theme wizard Smart Import, bảng xem trước, responsive mobile. |
| `vendor/xlsx-0.18.5.full.min.js` | Thư viện SheetJS 0.18.5 đóng gói sẵn (đọc/ghi Excel, không CDN, không API key). |
| `samples/english-sample.xlsx` | File mẫu Excel tiếng Anh (5 từ ví dụ). |
| `samples/korean-sample.xlsx` | File mẫu Excel tiếng Hàn (5 từ ví dụ). |
| `samples/english-sample.csv` | File mẫu CSV tiếng Anh. |
| `samples/korean-sample.csv` | File mẫu CSV tiếng Hàn. |
| `samples/vocab-sample.json` | File mẫu JSON. |
| `build_v8.py` | Script build: V6 HTML + v15 + v16 → `index.html`. Kiểm tra đủ 1.000 từ, có vendor và samples. |
| `gen_samples.js` | Script tạo file mẫu (dùng SheetJS trong Node). |
| `README_V8_IMPORT.md` | Hướng dẫn nhập từ vựng V8 (định dạng file, 4 bước, xử lý trùng, bộ từ, xuất, sự cố). |
| `CHANGELOG_V7_to_V8.md` | Changelog đầy đủ V7 → V8. |
| `SMOKE_TEST_V8_2026-11-17.md` | Báo cáo kiểm thử V8 (80/80 + hồi quy V7 40/40, lỗi đã sửa, mục chưa kiểm thử). |

## File sửa (chỉ sửa lớp V15 của V7, không động vào code V6)
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V8; thêm `<style id="v16">`, `<script id="v16xlsx" src="vendor/...">`, `<script id="v16js">`. |
| `v15.js` | `window.__v15` công khai thêm hàm nội bộ cho V16 (`buildWords`, `enOld`, `en15`, `save15`, `dl`, `esc`, `pop15`, `renderTab`, `topicName`, `counts15`); `buildWords` áp dụng ghi đè cập nhật của V16; tab Từ vựng thêm nút Nhập thông minh + Xuất Excel + lọc theo bộ; cách nhập cũ giữ lại trong "Nhập nhanh (cũ)". |

## File giữ nguyên 100% (không sửa, không xóa)
- Mọi file V6 như ở mục V7 (kể cả `Korean_Vocab_Farm_V6_Bilingual.html`, `v7.js`–`v14.js`, `assets/`).
- Mọi file V7: `v15_data.js`, `v15_words.json`, `build_v7.py`, `validate_words.py`,
  `README_V7.md`, `CHANGELOG_V6_to_V7.md`.
- Cách nhập cũ vẫn hoạt động: `parseTable`/`importNow` (KO) và `vocabImport` (EN).

## Dữ liệu người chơi (localStorage) — bổ sung V8
- Khóa `hanvocab.v1` **giữ nguyên**.
- Thêm trong cùng bản lưu: `S.v7.en16` (bộ từ tiếng Anh, ánh xạ từ→bộ, ghi đè cập nhật)
  và `S.v7.ko16.levels` (trình độ của thẻ tiếng Hàn).
- Cập nhật từ giữ nguyên ID nên tiến trình SRS (box, đúng/sai, lịch ôn) không đổi.

---

# Danh sách file đã thay đổi — V8 → V9

## File mới (lớp V17 — toàn bộ tính năng V9 nằm ở đây)
| File | Nội dung |
|---|---|
| `v17.js` | Thư viện: 3 nhóm (A1–A2 / Oxford 3000 / Từ vựng của tôi), xem bài/chủ đề, tìm kiếm + lọc loại từ/trạng thái, yêu thích, sao chép để sửa, đánh dấu đã thuộc, nhận thưởng bài/chủ đề, phạm vi học (scope). |
| `v17.css` | Theme Thư viện (thẻ chủ đề/bài, thanh tiến độ, thẻ từ, banner phạm vi). |
| `v17_a1a2.js` | 1.000 từ A1–A2 (19 chủ đề) — dữ liệu nhúng sẵn, chạy đồng bộ. |
| `v17_oxford.js` | 3.396 từ Oxford 3000 (136 bài × 25 từ, giữ nguyên thứ tự gốc). |
| `v17_a1a2.json` | Bản JSON tương ứng của bộ A1–A2 (để đối chiếu). |
| `v17_oxford.json` | Bản JSON tương ứng của bộ Oxford 3000. |
| `v17_review.json` | Danh sách trùng, lỗi, sửa đổi, mục cần kiểm tra (đầy đủ). |
| `build_v9.py` | Script build: V6 HTML + v15 + v16 + v17 → `index.html`. Kiểm tra đủ 1.000 từ A1–A2, 3.396 từ Oxford, 19 chủ đề, 136 bài. |
| `README_V9_LIBRARY.md` | Hướng dẫn sử dụng Thư viện V9. |
| `CHANGELOG_V8_to_V9.md` | Changelog đầy đủ V8 → V9. |
| `REPORT_PDF_EXTRACTION.md` | Báo cáo trích xuất từng PDF: số lượng, cách xử lý, lỗi in đã sửa, mục cần kiểm tra. |
| `SMOKE_TEST_V9_2026-11-17.md` | Báo cáo kiểm thử V9 (45/45 + 6/6 + hồi quy V8 80/80 + hồi quy V7 38/41). |

## File sửa (chỉ sửa lớp V15 của V7/V8, không động vào code V6)
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V9; thêm `<style id="v17">`, `<script id="v17data">` (dữ liệu A1–A2 + Oxford nhúng sẵn), `<script id="v17js">`. |
| `v15.js` | `buildWords` gắn thông tin thư viện (lib/chủ đề/bài/nghĩa phụ) + khôi phục cấp độ thật của 1.000 từ V15 (sửa lỗi V7: mọi từ bị gán A1); `pushV17IntoV14` đẩy dữ liệu thư viện vào ENWORDS/TOPICS; `wordsFiltered`/`reviewStart`/`reviewHTML` tôn trọng phạm vi Thư viện; Hub thêm tab 📚 Thư viện + banner phạm vi; `__v15` công khai thêm `setScope`, `clearScope`, `wordsFiltered`, `inScope`, `gain15`; sửa lỗi callback hiệu ứng boss (`B.hit` trên `null` sau khi đóng trận đấu); version `9.0.0`. |

## File giữ nguyên 100% (không sửa, không xóa)
- Mọi file V6 như ở mục V7 (kể cả `Korean_Vocab_Farm_V6_Bilingual.html`, `v7.js`–`v14.js`, `assets/`).
- Mọi file V7/V8: `v15_data.js`, `v15_words.json`, `v16.js`, `v16.css`, `vendor/`, `samples/`, `build_v7.py`, `build_v8.py`, `README_V7.md`, `README_V8_IMPORT.md`, `CHANGELOG_V6_to_V7.md`, `CHANGELOG_V7_to_V8.md`.
- Smart Import V8 giữ nguyên: `vocabImport`, `parseTable`/`importNow` (KO), wizard V16.

## Dữ liệu người chơi (localStorage) — bổ sung V9
- Khóa `hanvocab.v1` **giữ nguyên**.
- Thêm trong cùng bản lưu: `S.v7.en17` (`fav`: ID từ yêu thích, `claimed`: bài/chủ đề đã nhận thưởng).
- `en15()` thêm `scope` (phạm vi Thư viện đang chọn; save cũ không có scope vẫn chạy, coi như không chọn).
- Từ thư viện dùng chung bản ghi và hồ sơ SRS với từ V14/V15 (không tạo bản sao); từ bạn tự nhập giữ ID riêng.
