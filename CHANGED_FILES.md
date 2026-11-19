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

# Danh sách file đã thay đổi — V9 → V10

## File mới (lớp V18 — toàn bộ tính năng V10 nằm ở đây)
| File | Nội dung |
|---|---|
| `v18_data.js` | Dữ liệu tập trung 30 boss mới (10/khu vực) + 10 boss cũ (chỉ để hiển thị trong Bộ Sưu Tập): ID, tên EN/VI, ảnh, hệ, độ hiếm, cấp, HP, phòng thủ, kỹ năng, điều kiện mở khóa, chế độ hỏi, độ khó, thưởng (XP/kim cương/vật phẩm/đá/danh hiệu). |
| `v18.js` | Engine chiến đấu V18: 3 khu vực, chọn ngôn ngữ EN/KO (khu vực 2), kỹ năng nguyên tố, 3 giai đoạn huyền thoại, thưởng lần đầu 1 lần, Bộ Sưu Tập, animation, SRS cho câu tiếng Anh (`mark18`), thống kê KO (`koStats`). |
| `v18.css` | Theme V18: thẻ khu vực/boss, giao diện trận đấu, thanh HP, banner giai đoạn, Bộ Sưu Tập + bộ lọc, keyframes idle/hit/attack/special/defeat/victory, responsive + `prefers-reduced-motion`. |
| `assets/bosses/v10/v10_*.png` (30 file) | Ảnh boss riêng, đã tách nền, tổng 7,9 MB. |
| `assets/bosses/v10/manifest.json` | Danh sách 30 PNG: model tách nền, kích thước, dung lượng. |
| `tools/split_bosses.py` | Script cắt + tách nền 30 boss từ 3 poster (tái tạo được). |
| `build_v10.py` | Script build: V6 HTML + v15 + v16 + v17 + v18 → `index.html`. Kiểm tra đủ 30 boss (10/10/10), 30 PNG, không trùng ID boss cũ. |
| `package_v10.py` | Script đóng gói ZIP V10 + kiểm tra nội dung ZIP. |
| `README_V10_BOSSES.md` | Hướng dẫn sử dụng 30 boss mới. |
| `CHANGELOG_V9_to_V10.md` | Changelog đầy đủ V9 → V10. |
| `ASSET_REPORT_V10.md` | Báo cáo asset: cách cắt, model tách nền từng boss, hạn chế đã biết. |
| `SMOKE_TEST_V10_2026-11-17.md` | Báo cáo kiểm thử V10 (205/205 jsdom, chạy 2 lần + 1 lần trên ZIP đã đóng gói). |

## File sửa (chỉ sửa lớp V15 của V7/V8/V9, không động vào code V6)
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V10; thêm `<style id="v18">`, `<script id="v18data">`, `<script id="v18js">`; thêm `assets/bosses/v10/` (30 PNG + manifest). |
| `v15.js` | Hub thêm tab `['collection','🏆 Bộ Sưu Tập']`; `renderTab()` chuyển tab collection sang `__v18.collectionHTML()`; `bossesHTML()` gắn thêm `__v18.arenasHTML()` sau danh sách 10 boss cũ; version `9.0.0` → `10.0.0`. Tất cả có guard nên V15 vẫn chạy nếu thiếu V18. |

## File giữ nguyên 100% (không sửa, không xóa)
- Mọi file V6 như ở mục V7 (kể cả `Korean_Vocab_Farm_V6_Bilingual.html`, `v7.js`–`v14.js`, `assets/`).
- Mọi file V7/V8/V9: `v15_data.js`, `v15_words.json`, `v16.js`, `v16.css`, `vendor/`, `samples/`, `v17.js`, `v17.css`, `v17_a1a2.js`, `v17_oxford.js`, `v17_a1a2.json`, `v17_oxford.json`, `v17_review.json`, `build_v7.py`, `build_v8.py`, `build_v9.py`, `README_V7.md`, `README_V8_IMPORT.md`, `README_V9_LIBRARY.md`, `CHANGELOG_V6_to_V7.md`, `CHANGELOG_V7_to_V8.md`, `CHANGELOG_V8_to_V9.md`, `REPORT_PDF_EXTRACTION.md`.
- 10 boss cũ V15 và luật thưởng của chúng giữ nguyên.

## Dữ liệu người chơi (localStorage) — bổ sung V10
- Khóa `hanvocab.v1` **giữ nguyên**.
- Thêm trong cùng bản lưu: `S.v7.en18` (`bosses`: boss đã thắng + vật phẩm, `stones`: đá nguyên tố, `titles`: danh hiệu, `koStats`: thống kê trận tiếng Hàn).
- Save V9 mở bằng V10 chạy bình thường, không cần chuyển đổi.

## V11 — Boss Adventure (2026-11-17)

## File mới
| File | Nội dung |
|---|---|
| `v19_data.js` | Dữ liệu V19: 10 vùng đất (z1–z10), 30 boss `v11_*`, 10 hệ nguyên tố (thêm hệ Vũ trụ 🌀), độ hiếm, cấp/HP/phòng thủ, chế độ hỏi, độ khó, 5 kỹ năng + tuyệt kỹ mỗi boss, thưởng. |
| `v19.js` | Lớp V19: bản đồ tương tác, Universal Combat Engine (5 tim, combo, chí mạng, khiên, đồng hồ), Knowledge Counterattack, hệ sao, thành thạo song ngữ, SRS qua `mark19()`. |
| `v19.css` | Kiểu bản đồ, nút vùng, đường SVG phát sáng, bảng thông tin vùng, hoạt ảnh chiến đấu 6 trạng thái, `prefers-reduced-motion`. |
| `assets/bosses/v11/v11_*.png` (30 file) | Ảnh boss riêng, tổng 1,9 MB (3 cắt nền trong suốt + 27 chân dung cắt sát). |
| `assets/bosses/v11/manifest.json` | Danh sách 30 PNG: loại ảnh (u2net/portrait), vùng cắt, kích thước, dung lượng. |
| `tools/split_bosses_v11.py` | Script cắt 30 boss từ poster V11 (tái tạo được). |
| `build_v11.py` | Script build: V6 HTML + v15 + v16 + v17 + v18 + v19 → `index.html`. Kiểm tra đủ 30 boss V11 (10 vùng × 3), 30 PNG, không trùng ID cũ/V10. |
| `package_v11.py` | Script đóng gói ZIP V11 + kiểm tra nội dung ZIP. |
| `README_V11_BOSS_ADVENTURE.md` | Hướng dẫn sử dụng bản đồ + 30 boss mới. |
| `CHANGELOG_V10_to_V11.md` | Changelog đầy đủ V10 → V11. |
| `ASSET_REPORT_V11.md` | Báo cáo asset: hình học lưới, 4 model tách nền đã thử, giới hạn poster full-bleed, danh sách từng boss. |
| `SMOKE_TEST_V11_2026-11-17.md` | Báo cáo kiểm thử V11 (342/342 jsdom ×2 + 342/342 trên ZIP đã đóng gói, hồi quy V10 18/18). |

## File sửa (chỉ sửa lớp V15/V18, không động vào code V6)
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V11; thêm `<style id="v19">`, `<script id="v19data">`, `<script id="v19js">`; thêm `assets/bosses/v11/` (30 PNG + manifest). |
| `v15.js` | Hub thêm tab `['map','🗺️ Bản Đồ Boss']`; `renderTab()` chuyển tab map sang `__v19.mapHTML()` (có guard); version `10.0.0` → `11.0.0`. |
| `v18.js` | Bộ Sưu Tập hiển thị 70 boss: `allBosses()` gộp thêm boss V19; `isWon()`/`bossUnlocked()` rẽ nhánh theo `b.zone`; `elChip`/`rarChip` dùng `el.c \|\| el.color`; `arenaName()` xử lý ID vùng; `collFiltered()` thêm bộ lọc arena `map`; `collDetail()` dùng `__V19_DATA.byId` dự phòng; `challenge()` chuyển boss V19 sang bản đồ. |
| `v19.js` | (trong quá trình kiểm thử) sửa lỗi crash khi tuyệt kỹ kích hoạt: chế độ câu hỏi dùng `F.caMode \|\| F.qmode`, banner phản công chỉ hiện khi đã có câu hỏi phản công. |

## File giữ nguyên 100% (không sửa, không xóa)
- Mọi file V6, V7, V8, V9 và V10 (kể cả `v18.js`/`v18_data.js` ngoài các sửa Bộ Sưu Tập ở trên, 30 PNG V10, `build_v10.py`, `package_v10.py`).
- 10 boss cũ V15, 30 boss V10 và luật thưởng của chúng giữ nguyên.

## Dữ liệu người chơi (localStorage) — bổ sung V11
- Khóa `hanvocab.v1` **giữ nguyên**.
- Thêm trong cùng bản lưu: `S.v7.en19` (`lang`: ngôn ngữ đang chọn trên bản đồ; `bosses`: thắng/sao theo từng ngôn ngữ EN/KO; `titles`: danh hiệu; `zoneClaimed`: vùng đã nhận thưởng theo từng ngôn ngữ; `koStats`: thống kê trận tiếng Hàn).
- Save V10 mở bằng V11 chạy bình thường, không cần chuyển đổi.

## V11.1 — Korean Boss Map Fix (2026-11-17)

## File mới
| File | Nội dung |
|---|---|
| `build_v11_1.py` | Script build V11.1: build V11 + dòng tab tiếng Hàn (xem dưới) + kiểm tra `openMapFor` và version `11.1.0`. |
| `package_v11_1.py` | Script đóng gói ZIP V11.1 + kiểm tra `openMapFor`/`v19kotab`/tiêu đề V11.1 trong ZIP. |
| `README_V11_1_KOREAN_BOSS_MAP.md` | Hướng dẫn dùng bản đồ từ Korean Hub + giải thích lỗi `window.S`. |
| `CHANGELOG_V11_to_V11_1.md` | Changelog đầy đủ V11 → V11.1. |
| `SMOKE_TEST_V11_1_2026-11-17.md` | Báo cáo kiểm thử V11.1 (98/98 jsdom ×2). |

## File sửa
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V11.1; **một dòng duy nhất** trong script V6 (dòng render `#tabs`): thêm nút `<button class="tab v19kotab" onclick="window.__v19&&__v19.openMapFor('ko')">🗺️ Bản Đồ Boss</button>` sau các tab. Không sửa gì khác trong code V6. |
| `v19.js` | Thêm `openMapFor(lang)`/`mapOrigin()` (điểm vào dùng chung, chỉ đổi ngôn ngữ chiến đấu, không đụng ngôn ngữ học chính); `openMap()` gọi `__v15.openHub('map')` thay vì `__v15.tab('map')` để mở được Hub khi Hub đang đóng; tiêu đề bản đồ theo ngôn ngữ (`보스 모험 지도` / `Legendary Boss Adventure Map`); `koCardsRaw()` — bộ câu hỏi tiếng Hàn theo deck đã chọn (≥8 thẻ) + **sửa lỗi `window.S` → `S`**; version `11.0.0` → `11.1.0`. |
| `v18.js` | Sửa `koPool()`/`distractorsKO()` (`window.S` → `S`) — trận boss tiếng Hàn ở đấu trường V10 nay hỏi tiếng Hàn thật; version `10.0.0` → `10.0.1`. |
| `v15.js` | Chỉ đổi version `11.0.0` → `11.1.0`. |
| `v19.css` | Thêm `.tab.v19kotab` (vàng nhạt, icon 🗺️). |

## File giữ nguyên 100% (không sửa, không xóa)
- Mọi file V6 khác, V7/V8/V9/V10, dữ liệu V19 (10 vùng, 30 boss), 30 PNG V10 + 30 PNG V11, 10 boss cũ V15, 30 boss V10, luật thưởng, cơ chế học tiếng Hàn cũ, đấu trường boss tiếng Hàn cũ (chế độ "Đấu boss").

## Dữ liệu người chơi (localStorage) — không đổi cấu trúc
- Khóa `hanvocab.v1` **giữ nguyên**; `S.v7.en19` giữ nguyên cấu trúc.
- Save V11 mở bằng V11.1 chạy bình thường, không cần chuyển đổi.

## V12 — Player Save & Cloud Sync (2026-11-17)

## File mới
| File | Nội dung |
|---|---|
| `build_v12.py` | Script build V12 (từ `build_v11_1.py`): chèn lớp V20, kiểm tra version 12.0.0 + `__v20`/`__v20sync`/`mergeSaves`. |
| `package_v12.py` | Script đóng gói ZIP V12 + kiểm tra lớp V20, `firebase-config.js`, tiêu đề V12. |
| `v20.js`, `v20_sync.js`, `v20.css` | Lớp V20 (xem dưới). Cũng có trong `src/`. |
| `firebase-config.js` | Cấu hình Firebase để trống — người dùng tự điền project của mình. |
| `firestore.rules` | Security Rules (chỉ chủ tài khoản đọc/ghi document của mình). |
| `FIREBASE_SETUP.md` | Hướng dẫn tạo project, bật Auth, Firestore, Rules, Authorized Domains + checklist kiểm thử trực tiếp. |
| `README_V12_SAVE_SYNC.md` | Hướng dẫn dùng hệ thống lưu + đồng bộ, giới hạn đã biết. |
| `CHANGELOG_V11_1_to_V12.md` | Changelog đầy đủ V11.1 → V12 (gồm 5 lỗi tìm thấy khi kiểm thử). |
| `SMOKE_TEST_V12_2026-11-17.md` | Báo cáo kiểm thử V12 (108/108 jsdom ×2). |

## File sửa
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V12; thêm lớp V20: `<style id="v20">`, `<script src="firebase-config.js">`, `<script id="v20sync">`, `<script id="v20js">`. |
| `v15.js` | Tab "Sao lưu" → "💾 Dữ liệu"; `backupHTML()` thêm panel V20 phía trên; version `11.1.0` → `12.0.0`. |
| `v19.js` | Chỉ đổi version `11.1.0` → `12.0.0`. |

## File giữ nguyên 100% (không sửa, không xóa)
- Mọi file V6 khác, V7/V8/V9/V10/V11/V11.1, dữ liệu từ vựng, 30 PNG V10 + 30 PNG V11, 10 boss cũ V15, 30 boss V10, 30 boss V11, luật thưởng, cơ chế học, farm, đấu trường boss tiếng Hàn cũ.

## Dữ liệu người chơi (localStorage) — không đổi khóa, không đổi schema
- Khóa `hanvocab.v1` **giữ nguyên**; schema không đổi nên không cần chuyển đổi dữ liệu.
- Lần mở V12 đầu tiên: sao lưu toàn bộ bytes V11 vào `hanvocab.v11-backup` (chỉ ghi một lần), đóng dấu `S.v7.meta={saveVersion:12, migratedAt, prevVersion}`.
- Meta vận hành (lần lưu/đồng bộ gần nhất, hash đồng bộ) nằm ở khóa riêng `hanvocab.v12.meta` để việc ghi meta không tự kích hoạt thêm lần lưu.
- Save V11 mở bằng V12 chạy bình thường; có nút khôi phục bản trước khi chuyển đổi.

## V13 — Premium Login & Player Account System (2026-11-17)

## File mới
| File | Nội dung |
|---|---|
| `build_v13.py` | Script build V13 (từ `build_v12.py`): chèn lớp V21, kiểm tra version 13.0.0 + `__v21` + 10 avatar + mascot. |
| `package_v13.py` | Script đóng gói ZIP V13 + kiểm tra lớp V21, avatar, tiêu đề V13. |
| `v21.js`, `v21.css` | Lớp V21 (xem dưới). Cũng có trong `src/`. |
| `assets/avatars/*.png` (10) | 10 avatar fantasy 256×256: chick, fox, panda, cat, rabbit, owl, wolf, dragon, unicorn, phoenix (~620 KB). |
| `assets/mascot-chick.png` | Mascot gà con cho màn hình chào mừng 512×682 (~529 KB). |
| `README_V13_LOGIN_ACCOUNT.md` | Hướng dẫn dùng hệ thống tài khoản, vị trí dữ liệu, giới hạn đã biết. |
| `CHANGELOG_V12_to_V13.md` | Changelog đầy đủ V12 → V13 (gồm 4 lỗi tìm thấy khi kiểm thử). |
| `SMOKE_TEST_V13_2026-11-17.md` | Báo cáo kiểm thử V13 (138/138 jsdom ×2 + hồi quy V12 108/108). |

## File sửa
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V13; thêm lớp V21: `<style id="v21">`, `<script id="v21js">`. |
| `v20_sync.js` | Thêm meta đồng bộ theo tài khoản (`metaKey`), đăng nhập Google bằng redirect (`signInGoogleRedirect`/`checkRedirectResult`/`completeRedirect`), `sendPasswordReset`, `sendVerification`, `updateDisplayName`, `setPersistence`, `emailVerified`, `currentUser`; version `12.0.0` → `13.0.0`. `SAVE_VERSION` giữ 12. |
| `v15.js` | Chỉ đổi version `12.0.0` → `13.0.0`. |
| `v19.js` | Chỉ đổi version `12.0.0` → `13.0.0`. |
| `FIREBASE_SETUP.md` | Thêm mục V13: email xác minh, redirect, Authorized Domains cho popup + redirect, checklist kiểm thử trực tiếp V13. |

## File giữ nguyên 100% (không sửa, không xóa)
- Mọi file V6 khác, V7/V8/V9/V10/V11/V11.1, `v20.js` (12.0.0), dữ liệu từ vựng, 60 PNG boss V10/V11, 10 boss cũ V15, luật thưởng, cơ chế học, farm, đấu trường boss tiếng Hàn cũ, hệ thống lưu V12.

## Dữ liệu người chơi (localStorage) — không đổi khóa chính, thêm khóa phụ
- Khóa `hanvocab.v1` **giữ nguyên** (ô lưu đang chơi); schema không đổi, chỉ thêm `S.v7.profile` (tên hiển thị + avatar).
- Khóa mới V13: `hanvocab.v13.session` (phiên đang dùng: khách / tài khoản nào), `hanvocab.v1.guest` (bản lưu khách), `hanvocab.v1.acc.<uid>` (bản lưu của từng tài khoản), `hanvocab.v13.guestid` (ID khách), `hanvocab.v13.settings` (giảm chuyển động), `hanvocab.v12.meta.<uid>` (meta đồng bộ theo tài khoản).
- Save V12 mở bằng V13 chạy bình thường; lần đăng nhập đầu tiên hỏi có chuyển tiến trình hiện tại vào tài khoản hay không (không tự chuyển).

## V14 — Basic Tactics for Listening (2026-11-17)

## File mới
| File | Nội dung |
|---|---|
| `build_v14.py` | Script build V14 (từ `build_v13.py`): chèn lớp V22, kiểm tra 24 Units / 819 mục / ID duy nhất + kiểm tra bắt buộc mọi lớp `v15js`…`v22js` phải có trong HTML đã build. |
| `package_v14.py` | Script đóng gói ZIP V14 + kiểm tra lớp V22, dữ liệu BT, tiêu đề V14. |
| `v22.js`, `v22.css` | Lớp V22 (xem dưới). Cũng có trong `src/`. |
| `basic_tactics_vocabulary.json` | Dữ liệu Basic Tactics trích từ file Word: 24 Units, 513 từ + 306 cụm = 819 mục (74 KB, ở thư mục gốc, tải lười qua `fetch`). |
| `v22_basictactics.json`, `v22_basictactics_report.json` | Dữ liệu BT đầy đủ + báo cáo trùng/cờ (bản sao lưu trữ trong ZIP để đối chiếu). |
| `tools/extract_basictactics.py` | Script trích file Word (python-docx) + báo cáo trùng/cờ. |
| `data/v22_basictactics.json`, `data/v22_basictactics_report.json`, `data/bt_meta.js` | Dữ liệu BT + metadata 24 Units dùng lúc build. |
| `README_V14_BASIC_TACTICS.md` | Hướng dẫn dùng bộ từ Basic Tactics, Quest, hộp chọn bộ từ đánh boss, giới hạn đã biết (không IPA, file:// không tải được dữ liệu). |
| `CHANGELOG_V13_to_V14.md` | Changelog đầy đủ V13 → V14 (gồm 6 lỗi tìm thấy khi kiểm thử + 2 lỗi trích xuất). |
| `REPORT_BASIC_TACTICS.md` | Báo cáo số lượng mục từ theo Unit, phân tích trùng (45 từ trùng, 5 từ khác nghĩa giữa các Unit). |
| `REVIEW_LIST_V14.md` | Danh sách mục cần Anh rà soát (5 từ khác nghĩa giữa các Unit + 2 mục V9 chưa sửa). |
| `SMOKE_TEST_V14_2026-11-17.md` | Báo cáo kiểm thử V14 (106/106 jsdom ×2 + hồi quy rút gọn V13/V12 19/19). |

## File sửa
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V14; thêm lớp V22: `<style id="v22">`, `<script id="v22js">`. |
| `v15.js` | Gắn dữ liệu BT vào WORDS (`attachBT`, khối V22 trong `buildWords`), phạm vi BT trong `wordsFiltered`/`inScope15`, sắp xếp cụm từ trong English Typing (`typeArr*`), sửa lỗi tự đọc "undefined" ở chế độ Listening (`speak15(M.cur.w.en)`), đáp án nhiễu theo phạm vi, bảo vệ danh sách rỗng ở Typing/Listening/Speed/Speaking; version `13.0.0` → `14.0.0`. |
| `v17.js` | Nhóm Basic Tactics trong Thư viện (hook sang `__v22.viewHTML()`), tên phạm vi BT trong `scopeName`, nhãn nguồn 'bt' → 'Basic Tactics'; version `9.0.0` → `10.0.0`. |
| `v18.js` | `wordPool` + `distractorsEN` theo phạm vi (đáp án nhiễu trong phạm vi trước), hộp chọn bộ từ Basic Tactics trong `openArena`; version `10.0.1` → `14.0.0`. |
| `v19.js` | Như v18.js (wordPool, distractorsEN), hộp chọn bộ từ trong `zoneDetail` (chỉ tiếng Anh); version `13.0.0` → `14.0.0`. |

## File giữ nguyên 100% (không sửa, không xóa)
- Mọi file V6 khác, V7/V8/V9/V10/V11/V11.1/V12/V13, `v20.js` (12.0.0), `v20_sync.js` (13.0.0), `v21.js` (13.0.0), `firebase-config.js`, `firestore.rules`, dữ liệu từ vựng A1–A2/Oxford 3000, 60 PNG boss V10/V11, 10 boss cũ V15, luật thưởng, cơ chế học, farm, đấu trường boss tiếng Hàn cũ, hệ thống lưu V12, hệ thống tài khoản V13.

## Dữ liệu người chơi (localStorage) — không đổi khóa chính, thêm khóa phụ
- Khóa `hanvocab.v1` **giữ nguyên** (ô lưu đang chơi); schema không đổi, chỉ thêm `S.v7.en22` (tiến trình Quest Basic Tactics: sao/best/lần chơi/lần nhận thưởng theo Unit; SRS box/due của từ BT dùng chung kho `S.v7.en`/`en15` như mọi từ tiếng Anh khác).
- Dữ liệu Basic Tactics (819 mục) **không** lưu vào localStorage và **không** đưa vào payload Firestore — nó là dữ liệu cài sẵn như thư viện V17; chỉ tiến trình (ID + sao + box/due) được lưu/đồng bộ.
- Save V13 mở bằng V14 chạy bình thường; không cần migration (cùng `hanvocab.v1`, `SAVE_VERSION` giữ 12).

---

## V15 — Premium Pet System (2026-11-17)

## File mới
| File | Nội dung |
|---|---|
| `build_v15.py` | Script build V15 (từ `build_v14.py`): chèn lớp V23, kiểm tra 12 loài / 36 PNG thú + 5 PNG trứng (bắt buộc có kênh alpha) + kiểm tra bắt buộc mọi lớp `v15js`…`v23js` phải có trong HTML đã build; thêm nút 🐾 Thú Cưng vào tab tiếng Hàn. |
| `package_v15.py` | Script đóng gói ZIP V15 + kiểm tra lớp V23, 41 PNG thú/trứng, tiêu đề V15. |
| `v23_data.js`, `v23.js`, `v23.css` | Lớp V23 (xem dưới). Cũng có trong `src/`. |
| `assets/pets/v15/` | 36 PNG thú (12 loài × 3 hình thái, nền trong suốt, 512×512) + `eggs/` 5 PNG trứng (tổng 8,4 MB). |
| `README_V15_PETS.md` | Hướng dẫn dùng Hệ Thống Thú Cưng, kinh tế trong game, giới hạn đã biết (không trang bị, không thanh năng lượng, số liệu theo thang game). |
| `CHANGELOG_V14_to_V15.md` | Changelog đầy đủ V14 → V15 (gồm 3 lỗi thật tìm thấy khi kiểm thử). |
| `ASSET_REPORT_V15.md` | Báo cáo tài sản thú/trứng: cách tạo, danh sách file, kích thước. |
| `SMOKE_TEST_V15_2026-11-17.md` | Báo cáo kiểm thử V15 (128/128 jsdom ×2 trên bản build + 1 lần trên ZIP đã đóng gói). |

## File sửa
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V15; thêm lớp V23: `<style id="v23">`, `<script id="v23data">`, `<script id="v23js">`; nút 🐾 Thú Cưng ở tab tiếng Hàn (cạnh nút 🗺️ Bản Đồ Boss). |
| `v15.js` | `mark15`: gọi `__v23.onLearnCorrect()` khi trả lời đúng (sửa `W.__v23` → `window.__v23`); `finishRound`: cộng thưởng XP thú + ghi chú; nút 🐾 Thú Cưng ở thanh ngôn ngữ và đầu trang Hub; version `14.0.0` → `15.0.0`. |
| `v18.js` | Hook chiến đấu thú cưng (khiên đội, năng lượng, kỹ năng đội, rơi đá hệ khi thắng lần đầu); thêm export `_petRefresh`; version `14.0.0` → `15.0.0`. |
| `v19.js` | Như v18.js (cho cả trận tiếng Anh và tiếng Hàn); thêm export `_petRefresh`; version `14.0.0` → `15.0.0`. |
| `v23.js` | Mới (xem dưới). Sau kiểm thử đã sửa: `battleStart` chép `team` vào `F.pet` (thanh chiến đấu trước đó ném lỗi), export `castSkillInFight` (nút kỹ năng đội trước đó bấm không có tác dụng), ID thú thêm bộ đếm chống trùng. |

## File giữ nguyên 100% (không sửa, không xóa)
- Mọi file V6 khác, V7–V14, `v20.js` (12.0.0), `v20_sync.js` (13.0.0), `v21.js` (13.0.0), `v22.js` (14.0.0), `firebase-config.js`, `firestore.rules`, dữ liệu từ vựng A1–A2/Oxford 3000/Basic Tactics, 60 PNG boss V10/V11, 10 boss cũ V15, luật thưởng, cơ chế học, farm, đấu trường boss tiếng Hàn cũ, hệ thống lưu V12, hệ thống tài khoản V13.

## Dữ liệu người chơi (localStorage) — không đổi khóa chính, thêm khóa phụ
- Khóa `hanvocab.v1` **giữ nguyên** (ô lưu đang chơi); schema không đổi, chỉ thêm `S.v7.en23` (thú sở hữu, trứng, trứng đang ấp + timestamp, nguyên liệu, đội hình, mốc thưởng đã nhận). Tạo lười khi mở Pet Hub lần đầu; người chơi chưa mở Pet Hub thì bản lưu không đổi gì.
- `S.v7.en23` nằm trong payload Firestore sẵn có (`players/{uid}`); không tạo project Firebase mới, không đổi `firestore.rules`.
- Vật nuôi nông trại V6 (`S.own`) không bị chạm tới.
- Save V14 mở bằng V15 chạy bình thường; không cần migration (cùng `hanvocab.v1`, `SAVE_VERSION` giữ 12).

---

## V15.1 — UI Readability Upgrade (2026-11-17)

### File mới
| File | Nội dung |
|---|---|
| `build_v15ui.py` | Script build V15.1: lấy bản V15 trong `out/` (hoặc chạy `build_v15.py` trước nếu chưa có), inject lớp V24 CUỐI CÙNG trước `</body>`, đổi title thành V15.1, kiểm tra tokens + `.ko` fix + fight scroll + en15 backfill + version các lớp cũ. Idempotent: chạy lại sẽ gỡ lớp V24 cũ rồi inject lại. |
| `package_v15ui.py` | Script đóng gói ZIP V15.1 + kiểm tra V24 nạp sau V23, đủ 30+30 PNG boss, 41 PNG thú/trứng, đủ các lớp cũ. |
| `src/v24.css`, `src/v24.js` | Lớp V24 (xem dưới). Cũng có trong `out/` (`v24.css`, `v24.js`). |
| `README_V15_1_UI.md` | Hướng dẫn V15.1: design system, bảng lỗi tương phản trước/sau, 3 lỗi thật tìm thấy, lưu ý trung thực. |
| `CHANGELOG_V15_to_V15_1.md` | Changelog đầy đủ V15 → V15.1. |
| `SMOKE_TEST_V15_1_2026-11-17.md` | Báo cáo kiểm thử V15.1 (test24.js 84/84 × 3 lần chạy Chrome thật + audit tương phản 14 màn hình + sự cố môi trường). |
| `tools/v15ui/` | Bộ kiểm thử V15.1: `test24.js` + harness CDP (`cdp.js`, `audit.js`, `shot.js`, `batch.js`, `setups/`) + log 2 lần chạy + 17 ảnh sau nâng cấp (`shots-after/`). |

### File sửa
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V15.1; thêm lớp V24 CUỐI: `<style id="v24">`, `<script id="v24js">`. Không sửa bất kỳ lớp cũ nào. |
| `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` | Thêm mục V15.1. |

### Lớp V24 — tóm tắt nội dung (chi tiết trong README_V15_1_UI.md)
- **Design tokens** `--ui-*` (màu chữ/nền/viền/trạng thái, nút xanh lá #2E7D32, min-height 44px).
- **Tương phản WCAG AA:** nút chính #3FAE62 → #2E7D32; thanh thú trong trận đấu thêm màu chữ #FFF8E1; chip boss chữ #3A2E22; nhãn profile #6B5B4A 12px; chữ ban đêm (mute/label/farm) sáng lên; tab dưới đáy nền tối ban đêm; placeholder input tối #B7A6E0.
- **Typography:** nội dung quan trọng ≥ 12px; đáp án đúng/sai thêm ✓/✗.
- **Bố cục:** header Korean bóng mềm; tab dưới đáy wrap (hết dính nhãn); Boss Map cao 1600px ở ≤480px (hết chồng zone); Pet Hub hết tràn ngang 11px; tab Account Center wrap 2 hàng.
- **3 bug fix:** (1) nút KOREAN FARM bị xoay do va chạm class `.ko`; (2) trận V18 tự cuộn tới khi bắt đầu (MutationObserver 2 tầng); (3) backfill `en15.modeBest` (EN Hub crash với bản lưu thiếu trường).

### File giữ nguyên 100% (không sửa, không xóa)
- Mọi lớp cũ V6–V23 (version giữ nguyên: v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0, v20 = 12.0.0, v20_sync/v21 = 13.0.0, v22 = 14.0.0), mọi dữ liệu từ vựng/thú/boss, `firebase-config.js`, `firestore.rules`.

### Dữ liệu người chơi (localStorage) — không đổi
- Khóa `hanvocab.v1` giữ nguyên, không migration, không thêm khóa. V24 chỉ đọc/ghi qua API sẵn có (`__v15.en15()`, `save15()`); backfill `en15` chỉ thêm các trường còn thiếu với đúng giá trị mặc định, không xóa/không ghi đè dữ liệu hiện có.

## V15.2 — Vocabulary Library UI/UX Redesign (2026-11-17)

### File mới
| File | Nội dung |
|---|---|
| `build_v15lib.py` | Script build V15.2 (idempotent): gỡ lớp V25 cũ, inject V25 CUỐI CÙNG trước `</body>`, đổi title thành V15.2, kiểm tra version các lớp cũ (v24 dùng `var VERSION`, phải kiểm tra riêng). |
| `package_v15lib.py` | Script đóng gói ZIP V15.2 + kiểm tra V25 nạp sau V24, đủ 30+30 PNG boss, 41 PNG thú/trứng, đủ các lớp cũ, 3 tài liệu V15.2. |
| `src/v25.css`, `src/v25.js` | Lớp V25 (xem dưới). Cũng có trong `out/` (`v25.css`, `v25.js`). |
| `README_V15_2_LIBRARY.md` | Hướng dẫn V15.2: design system `--lib-*`, thay đổi theo khu vực, bảng tương phản trước/sau, lưu ý trung thực. |
| `CHANGELOG_V15_1_to_V15_2.md` | Changelog đầy đủ V15.1 → V15.2. |
| `SMOKE_TEST_V15_2_2026-11-17.md` | Báo cáo kiểm thử V15.2 (test25.js 103/103 trên Chrome thật + audit tương phản 7 màn hình Thư viện + edge case V14). |
| `tools/v15lib/` | Bộ kiểm thử V15.2: `test25.js` + harness CDP (`audit-lib.js`, `baseline25.js`, `shots25.js`, `setups/`, `dbg25*.js`) + log 4 lần chạy + ảnh trước/sau (`shots-before/`, `shots-after/`). |

### File sửa
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V15.2; thêm lớp V25 CUỐI: `<style id="v25">`, `<script id="v25js">`. Không sửa bất kỳ lớp cũ nào. |
| `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` | Thêm mục V15.2. |

### Lớp V25 — tóm tắt nội dung (chi tiết trong README_V15_2_LIBRARY.md)
- **Design tokens** `--lib-*` theo bảng màu của Anh (khung sáng #FFF9EF, khung tối #292044, xanh #247A46, tím #6845A8, vàng #FFD76A, viền #B99AF7/#F5C86A).
- **Tương phản WCAG AA:** sửa 3 vi phạm baseline (badge BT "Từ đơn" 4.42:1 ở 11px → #166534 13px; nút "Chưa nhớ" và "Xóa" 3.99:1 → nền đỏ #C1121F chữ trắng) + 2 lỗi phát hiện bằng đọc code (`.v17claimed` 3.3:1, `.v17nodata` xám nhạt). Sau V25: **0 vi phạm + 0 chữ <12px trên cả 7 màn hình Thư viện**.
- **Thẻ bộ từ:** dải tiêu đề tối + tên vàng, thẻ trắng viền tím, thanh tiến trình 12px; **tiến trình nhóm mới** (đã học · đã thuộc · cần ôn, số thật từ SRS; My Vocabulary không có thanh tiến trình vì không có tổng số hoàn thành).
- **Hàng từ:** EN 19px, VI 16px, IPA 15px; POS thành pill; **badge trạng thái mới** (○ Chưa học / ◐ Đang học / ✓ Đã thuộc / ↻ Cần ôn) từ hộp SRS + lịch ôn thật.
- **Nút chuẩn hóa:** Học ngay #247A46, Ôn tập #6845A8, Xem từ nền sáng + chữ tím đậm, yêu thích đang bật (`.btn.on`, mới) nền vàng #F5C86A; nút "← Thư viện" thành pill tím 44px.
- **Tìm kiếm/lọc:** icon kính lúp, `type=search` (nút xóa gốc), 48px; thông báo trống rõ ràng trong lesson view; bộ lọc giữ nguyên khi chuyển màn hình (thiết kế sẵn có).
- **Flashcard:** mặt trước #FFF9EF, mặt sau #EDE6F8, viền tím; Đã nhớ #247A46, Chưa nhớ #C1121F; tắt hiệu ứng lật khi `prefers-reduced-motion`.
- **Không lỗi ứng dụng nào** được tìm thấy trong V15.2 (test25.js 103/103 trên Chrome thật). Edge case có sẵn từ V14 (scope BT + mở flash ngay sau khi tải lại trang mà chưa mở Thư viện → flash báo trống) được ghi trong README/Smoke Test, không sửa trong bản này.

### File giữ nguyên 100% (không sửa, không xóa)
- Mọi lớp cũ V6–V24 (version giữ nguyên: v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0, v20 = 12.0.0, v20_sync/v21 = 13.0.0, v22 = 14.0.0, v24 = 15.1.0), mọi dữ liệu từ vựng/thú/boss, `firebase-config.js`, `firestore.rules`.

### Dữ liệu người chơi (localStorage) — không đổi
- Khóa `hanvocab.v1` giữ nguyên, không migration, không thêm khóa. V25 chỉ đọc SRS/hộp/lịch ôn qua API sẵn có (`__v15.enOld()`, `__v15.en15()`, `__v17`/`__v22`); decorator không ghi dữ liệu người chơi (chỉ thêm class/element hiển thị).

## V15.3 — Mobile Responsive & Pet Navigation Fix (2026-11-17)

### File mới
| File | Nội dung |
|---|---|
| `build_v15nav.py` | Script build V15.3 (idempotent): gỡ lớp V26 cũ, inject V26 CUỐI CÙNG trước `</body>`, đổi title thành V15.3, kiểm tra version các lớp cũ (v24/v25 dùng `var VERSION`, phải kiểm tra riêng). |
| `package_v15nav.py` | Script đóng gói ZIP V15.3 + kiểm tra V26 nạp sau V25, đủ 30+30 PNG boss, 41 PNG thú/trứng, đủ các lớp cũ, 3 tài liệu V15.3, `test26.js` có mặt. |
| `src/v26.css`, `src/v26.js` | Lớp V26 (xem dưới). Cũng có trong `out/` (`v26.css`, `v26.js`). |
| `README_V15_3_MOBILE_NAV.md` | Hướng dẫn V15.3: 6 nguyên nhân gốc + số đo baseline, thay đổi theo khu vực, lựa chọn thanh tab cuộn ngang thay vì menu "Thêm ▼", lưu ý trung thực. |
| `CHANGELOG_V15_2_to_V15_3.md` | Changelog đầy đủ V15.2 → V15.3 (kèm sự cố môi trường trong quá trình làm). |
| `SMOKE_TEST_V15_3_2026-11-17.md` | Báo cáo kiểm thử V15.3 (test26.js trên Chrome thật ở 8 viewport + chạy lại trên ZIP đã đóng gói). |
| `tools/v15nav/` | Bộ kiểm thử V15.3: `test26.js` + harness đo bố cục (`audit-nav.js`, `baseline26.js`, `shots26.js`, `setups/pet-empty.js`, `setups/pet-full.js`) + `baseline26.json` + 5 ảnh trước (`shots-before/`) + ảnh sau (`shots-after/`) + `restore_index.py` + `pw/get-browser.mjs`. |

### File sửa
| File | Thay đổi |
|---|---|
| `index.html` | Tiêu đề đổi thành V15.3; thêm lớp V26 CUỐI: `<link id="v26css">`, `<script id="v26js">`. Không sửa bất kỳ lớp cũ nào. |
| `tools/v15ui/cdp.js` | Hỗ trợ biến môi trường `HATCH_CHROME` / `HATCH_CHROME_NOPOLICY` để dùng Chromium dự phòng (headless-shell) khi Chrome hệ thống không chạy được. Hành vi mặc định không đổi. |
| `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` | Thêm mục V15.3. |

### Lớp V26 — tóm tắt nội dung (chi tiết trong README_V15_3_MOBILE_NAV.md)
- **Design tokens** `--nav-*` theo bảng màu spec §9 (nền tối #201535, khung #30204F, ô nhập #1B1430, chữ #FFFFFF/#E4DDF1, tiêu đề vàng #FFD76A, viền tím #A78BFA, nút đang chọn #F7BE38 + chữ #251A38, nút phụ #6845A8).
- **Sửa gốc lỗi z-index:** `#v23hub` 120 → 960 (trên langbar 900 + EN Hub 950, dưới modal 1000); `#v23toast` 200 → 970. Trước đây langbar che hoàn toàn header Pet (tiêu đề, ví XP/gem, nút đóng ✕) khi mở Pet Hub từ Korean Farm.
- **Tab một hàng cuộn ngang + sticky:** `.v23tabs` và `.v15tabs` ở ≤760px `flex-wrap:nowrap; overflow-x:auto`; tab Pet dính dưới header với `top` lấy từ biến `--nav-head-h` do JS đo chiều cao header thật; JS tự cuộn tab đang chọn vào giữa; **nhớ tab** qua `sessionStorage['v26.petTab']` (bọc `__v23.openHub`, không sửa `v23.js`).
- **Header gọn mobile:** Pet head 128px → ~56px ở 320px (tiêu đề rút ngắn "🐾 Thú Cưng"); langbar 133px → ~48px; EN hub head 157–185px → ~112px; tổng chrome EN ở 320px ~355px → ~160px; `.v7hud` bỏ sticky trên mobile; `#stage` thêm `padding-bottom: calc(118px + safe-area)` để nội dung cuối không bị thanh tab cố định che; mascot đẩy lên vùng đệm.
- **Trạng thái trống duy nhất:** chưa có thú → hero một thông báo ("Bạn chưa có thú cưng" + ảnh trứng + nút lớn "🥚 Đi ấp trứng" thật); có thú nhưng lọc không khớp → "Không tìm thấy thú cưng phù hợp." + nút "Xóa bộ lọc" thật. Áp dụng cho tab Thú cưng, Tiến hóa, Đội hình.
- **Bộ lọc 2 hàng** ở ≤560px (mỗi ô ≥44px); **slot đội hình sửa gốc min-content** (`repeat(3,minmax(0,1fr))`): tràn 38px @320px và 12px @768px → 0.
- **Không làm:** menu "Thêm ▼" (spec cho phép tab cuộn ngang HOẶC menu; chọn tab cuộn — giữ đủ 7 tab, không thêm trạng thái dropdown); không tạo header mobile mới; không đổi dữ liệu thú cưng / save / Firebase.

### File giữ nguyên 100% (không sửa, không xóa)
- Mọi lớp cũ V6–V25 (version giữ nguyên: v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0, v20 = 12.0.0, v20_sync/v21 = 13.0.0, v22 = 14.0.0, v24 = 15.1.0, v25 = 15.2.0), mọi dữ liệu từ vựng/thú/boss, `firebase-config.js`, `firestore.rules`.

### Dữ liệu người chơi (localStorage) — không đổi
- Khóa `hanvocab.v1` giữ nguyên, không migration, không thêm khóa. V26 chỉ đọc qua API sẵn có (`__v23._test.en23()`, `__v15.en15()`); tab nhớ trong `sessionStorage` (`v26.petTab`, mất khi đóng tab trình duyệt, không chạm save game). Decorator không ghi dữ liệu người chơi (chỉ thêm class/element hiển thị).

---

# Danh sách file đã thay đổi — V15.3 → V16 (Smart Learning)

## File mới (lớp V27 — toàn bộ tính năng V16 nằm ở đây)
| File | Nội dung |
|---|---|
| `index.html` | Tiêu đề đổi thành V16; thêm lớp V27 CUỐI: `<style id="v27">`, `<script id="v27js">`; thêm nút "Học thông minh" (`v27kotab`) vào tab Korean; 3 hook `recordAnswer` trong khối inline v15/v18/v19. Không sửa bất kỳ lớp cũ nào ngoài 3 dòng hook. |
| `v27.js` | Học Thông Minh: overlay 3 tab (Bảng điều khiển / Từ yếu / Kế hoạch ngày), nút chuyển Hàn/Anh nội bộ, kho `S.v7.en27`, phân loại từ yếu NEW/LEARNING/WEAK/REVIEW/MASTERED, điểm ưu tiên, kế hoạch ngày, bộ máy câu hỏi riêng (EN MC/gõ/nghe/tự chấm; KO MC/nghe/tự chấm, không gõ Hangul), thưởng hoàn thành kế hoạch +20 XP (chống nhận trùng) và +1 gem khi chuỗi 7 ngày. |
| `v27.css` | Theme Học Thông Minh (tím đậm, viền vàng, ≥44px, WCAG AA, không tràn ngang ở 320–430px). |
| `build_v16.py` | Script build V16 (chạy 1 lần trên bản V15.3 nguyên vẹn): inject V27 CUỐI trước `</body>`, chèn nút KO, gắn 3 hook H1/H2/H3 với assert khớp chính xác, kiểm tra thứ tự marker `… v23, v24, v25, v26, v27` và version `16.0.0`. **Không idempotent cho v27** (từ chối chạy nếu đã có marker v27 — xem CHANGELOG). |
| `package_v16.py` | Script đóng gói ZIP V16 + kiểm tra `index.html`, `v27.js`, `v27.css`, `build_v16.py`, `tools/v16/test27.js` trong ZIP và marker theo thứ tự. |
| `README_V16_SMART_LEARNING.md` | Hướng dẫn V16: tính năng, dữ liệu, thưởng, giới hạn (Q1/Q2 hoãn, Q4 +20 XP là đề xuất chờ xác nhận). |
| `CHANGELOG_V15_3_to_V16.md` | Changelog đầy đủ V15.3 → V16 (kèm lỗi nút KO tìm được lúc build và giới hạn của `build_v16.py`). |
| `SMOKE_TEST_V16_2026-11-18.md` | Báo cáo kiểm thử V16 (test27.js trên Chrome thật: 164/164 × 2 lần trên build + 1 lần trên ZIP đã đóng gói). |
| `tools/v16/` | Bộ kiểm thử V16: `test27.js` + `smoke27.js` + `TODO_Q1_merge_branch.md` (bản phác nhánh hợp nhất Firebase cho `en27`, chưa áp dụng) + `repair_kotab_2026-11-18.py` (sửa lỗi nút KO lúc build) + log 3 lần chạy + ảnh sau (`shots-after/`). |

### File sửa
| File | Thay đổi |
|---|---|
| `v15.js` | Thêm đúng 1 dòng hook H1 trong `mark15` (trước `save15();`, dòng 390): ghi đáp án EN vào `en27`. |
| `v18.js` | Thêm đúng 1 dòng hook H2 trong `mark18` (trước `save18();`, dòng 321), mode `'boss18'`. |
| `v19.js` | Thêm đúng 1 dòng hook H3 trong `mark19` (trước `save19();`, dòng 331), mode `'boss19'`. |
| `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` | Thêm mục V16. |

### Lớp V27 — tóm tắt nội dung (chi tiết trong README_V16_SMART_LEARNING.md)
- **Một overlay duy nhất, 3 tab:** Bảng điều khiển (số liệu thật từ kho dữ liệu; ô nào chưa có dữ liệu ghi "chưa có dữ liệu"), Từ yếu (tìm kiếm + lọc, hàng từ có số lần sai/ngày ôn gần nhất/hạng sao/trạng thái, nút nghe), Kế hoạch ngày (5 từ mới + 10 từ đến hạn + 5 từ yếu, chọn 5/10/15 phút hoặc tùy chỉnh, nút "Bắt đầu ôn tập").
- **Nút chuyển Hàn/Anh nội bộ** (`en27.uiLang`), không ghi `en15().lang` — không đổi ngôn ngữ học chính.
- **Vào từ cả hai Hub:** Korean Hub qua nút "Học thông minh" chèn lúc build (mẫu nút Boss/Pet); English Hub qua decorator MutationObserver (không sửa file cũ), nút tự chèn lại sau mỗi lần render.
- **Ghi đáp án:** EN qua 3 hook (mark15/mark18/mark19 đều ghi đúng 1 lần mỗi câu trả lời, kể cả đánh boss); KO chỉ ghi từ bài Học Thông Minh + ước lượng qua `box`/`due`/`w` (không gắn hook vào code V6 — Q2 hoãn).
- **Không tạo SRS thứ hai:** V27 chỉ chọn và xếp ưu tiên theo box/due có sẵn; mỗi câu trả lời EN vẫn gọi `mark15(..., 'smart')`, KO tự cập nhật `box`/`due` theo bảng khoảng V6 + `gain`/`res`. XP chỉ qua một kênh; không cộng `score*2` cuối buổi; không gọi `gain` cho câu trả lời trong boss.
- **Thưởng chống nhận trùng:** hoàn thành kế hoạch +20 XP một lần mỗi ngày mỗi ngôn ngữ (`claimed['plan:<lang>:<ngày>']`); +1 gem chỉ khi đạt chuỗi Học Thông Minh 7 ngày (`claimed['streak7:...']`). Không có tiền tệ mới. Mức +20 XP là **đề xuất, chờ Anh xác nhận** (đổi một dòng trong `claimPlanBonus()` nếu cần).
- **Hoãn theo thiết kế:** Q1 (nhánh hợp nhất Firebase cho `en27` — hợp nhất 2 máy hiện vẫn last-write-wins cho `en27`, đã kiểm thử trung thực), Q2 (hook tiếng Hàn trong code V6), Q7 (lỗi hợp nhất `S.v7.en` có sẵn). Xem `tools/v16/TODO_Q1_merge_branch.md`.
- **Lỗi tìm được lúc build (đã sửa):** nút KO bị lỗi cú pháp do build script cắt thừa 1 ký tự (`...button>'';`) — sửa bằng repair script có assert + sửa `build_v16.py` (`[:-2]` → `[:-1]`) + thêm assert cấu trúc; sau sửa, cả 32 khối `<script>` inline đều qua `node --check`.

### File giữ nguyên 100% (không sửa, không xóa)
- Mọi lớp cũ V6–V26 (version giữ nguyên: v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0, v20 = 12.0.0, v20_sync/v21 = 13.0.0, v22 = 14.0.0, v24 = 15.1.0, v25 = 15.2.0, v26 = 15.3.0), mọi dữ liệu từ vựng/thú/boss, `firebase-config.js`, `firestore.rules`. `build_v15ui.py` / `build_v15lib.py` / `build_v15nav.py` không sửa (và không được chạy lại trên bản đã xong — xem rebuild proof).

### Dữ liệu người chơi (localStorage) — không đổi khóa, có thêm khóa con mới
- Khóa `hanvocab.v1` giữ nguyên, không migration, không thêm khóa localStorage.
- Thêm khóa con duy nhất trong cùng bản lưu: `S.v7.en27` (tiến trình Học Thông Minh: `en.last/cw/cr`, `ko.right/wrong/cw/cr/last`, `plan`, `sessions` tối đa 30, `days` tối đa 90 ngày, `streak`, `claimed`, `uiLang`). Tạo lười với đầy đủ giá trị mặc định khi mở lần đầu (như `enState()`); không ghi trước trong migration. Giới hạn: mỗi map tối đa 1.000 mục, trần 150 KB có cắt tỉa khi ghi, không bao giờ chặn `save()`. Dữ liệu SRS cũ (`S.v7.en`, `S.cards`) không đổi; V27 chỉ đọc, không ghi đè.

## V16.3 — Backup & Restore Fix (2026-11-18)

### File mới
| File | Nội dung |
|---|---|
| `src/v31.js`, `src/v31.css` | Lớp V31 mới, version 16.3.0, nạp CUỐI (sau V27): Backup History, xác minh sao lưu đám mây bằng đọc lại, báo cáo hợp nhất, hoàn tác khôi phục, bọc panel Quản lý dữ liệu + decorator tab Sao lưu trong Trung tâm tài khoản, bọc F-11 cho `__v27.recordAnswer`. |
| `build_v31.py` | Script build V16.3: kiểm tra base là V16 nguyên vẹn (sha256 `c59da336…`), áp dụng 24 replacement (14 staged trong phạm vi + 10 mới V31), chèn lớp V31 cuối cùng, assert marker/thứ tự/version/KO không đổi/không có marker ngoài phạm vi, `node --check` mọi file đã chạm. Chạy đúng 1 lần, không chạy lại trên bản đã xong. |
| `package_v31.py` | Script đóng gói ZIP V16.3 + kiểm tra `index.html`, `v31.js`, `v31.css`, `build_v31.py`, `package_v31.py`, `tools/v31/test31.js` trong ZIP; marker V31 cuối cùng; replacement trong phạm vi có mặt, ngoài phạm vi vắng mặt; không có nút KO mới; `firebase-config.js` trong ZIP là placeholder. |
| `README_V16_3_BACKUP_FIX.md` | Hướng dẫn V16.3: lỗi đã sửa, tính năng mới, giới hạn (Firebase live chưa kiểm thử, Chrome bị chặn). |
| `CHANGELOG_V16_to_V16_3.md` | Changelog đầy đủ V16 → V16.3 (kèm hiệu chỉnh F-15/F-16 và cờ xác nhận F-12). |
| `SMOKE_TEST_V16_3_2026-11-18.md` | Báo cáo kiểm thử V16.3 (harness Node vm `test31.js` × 2 trên build + 1 trên ZIP; Chrome bị chặn — driver `verify-v31c.js` đã chuẩn bị sẵn). |
| `tools/v31/` | Bộ kiểm thử V16.3: `PLAN_V31.md` (kế hoạch Stage A), `VERIFY_V31_BASELINE.md` (baseline V16: R1/R4/R5 FAIL), `test31.js` + `verify-v31c.js` + fixtures + log. |

### File sửa
| File | Thay đổi |
|---|---|
| `v20_sync.js` | Hợp nhất theo từng subkey (F-01/F-03/en16): MAX theo từ cho SRS, union cho boss/pet/quest/session, `due` lấy sớm nhất, `map`/`claimed` local-first; `hasProgress` đếm en27/en23/en22 + boss thắng dạng phẳng (F-13); fallback `localTime` (F-14); độ sâu quét 4→6 (F-15). |
| `v15.js` | `flush()` trước ghi trực tiếp trong `backupImport` (F-02a); `backupImport` độc lập kiểm tra + chụp snapshot (F-16); `backupExport` flush trước khi đọc + tên file `v16.3` (C1); `resetEN` xóa thêm `en27.en.last/cw/cr` — chỉ phía EN, chờ Anh xác nhận (F-12). |
| `v20.js` | `flush()` trước ghi trong `importFile` (F-02b); `sum()` trong `conflictHTML` đếm boss thắng dạng phẳng (C6); câu chữ hợp nhất mới (C6b). |
| `v21.js` | `flush()` trước kích hoạt tài khoản/khách (F-02c/d); khôi phục Trung tâm tài khoản truyền đúng input element, bỏ `.then()` (C9); câu chữ xuất file "đã bắt đầu tải" (C1c); câu chữ hợp nhất mới (C6c). |
| `v27.js` | `recordAnswer` bỏ qua + `console.warn` khi `S` vắng mặt (F-11). |
| `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` | Thêm mục V16.3. |

### Lớp V31 — tóm tắt nội dung (chi tiết trong README_V16_3_BACKUP_FIX.md)
- **Giao diện Sao lưu & Khôi phục mới** trong panel Quản lý dữ liệu (bọc `__v20.dataPanelHTML`) và tab Sao lưu của Trung tâm tài khoản (decorator MutationObserver): trạng thái sao lưu đám mây, 3 dòng thời gian riêng (lưu cục bộ / đồng bộ / sao lưu đám mây đã xác minh), kích thước thật + giới hạn 900 KB, lịch sử sao lưu, khôi phục, xuất, đồng bộ. **Không thêm nút KO** — KO đã mở được panel qua nút Quản lý dữ liệu có sẵn.
- **Lịch sử sao lưu mới** (khóa `hanvocab.v16.backup-history`, tối đa 20 mục) + liệt kê chỉ-đọc các snapshot hệ thống `hanvocab.v12.*` đã có, khôi phục được khi hợp lệ; `hanvocab.v11-backup` không bao giờ bị V31 xóa.
- **Chụp trước khôi phục + hoàn tác:** mọi lần khôi phục đều giữ `hanvocab.v12.preimport-<ms>` trước khi ghi đè; nút "Hoàn tác lần khôi phục này" khôi phục snapshot mới nhất (tự chụp trước nên hoàn tác được hoàn tác).
- **Xác minh đám mây bằng đọc lại:** sau khi tải lên, V31 tải lại tài liệu đám mây và chỉ ghi nhận "đã sao lưu" khi hash khớp; thời gian đã xác minh lưu ở `hanvocab.v16.last-verified-cloud`. Đồng bộ tự động chưa được xác minh kiểu này (sẽ xác minh ở lần đồng bộ tay sau).
- **Báo cáo hợp nhất:** sau khi hợp nhất, panel liệt kê số lượng giữ được từ mỗi bên và các trường lấy theo bản mới hơn theo thiết kế (`en23.team`/`hatch`, `en27.plan`/`uiLang`).
- **Không đổi:** khóa `hanvocab.v1`, mọi dữ liệu người chơi, Firebase Auth/Sync, login khách, các lớp V6–V27 (version giữ nguyên: v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0, v20 = 12.0.0, v20_sync/v21 = 13.0.0, v22 = 14.0.0, v24 = 15.1.0, v25 = 15.2.0, v26 = 15.3.0, v27 = 16.0.0). `build_v16.py` không chạy lại trên bản đã xong.

### Ngoài phạm vi (không làm trong V16.3)
- Nói trùng XP (V17-3), id trùng (F-09), listener Escape (F-10), observer (F-05/F-07), V17-1/V17-2, icon F-04, lỗi chính tả V17-4, M1/M2 — thuộc dự án AUTO/V28 đã dừng, chưa sửa.

## V16.4 — Data Safety (2026-11-19)

### File mới
| File | Nội dung |
|---|---|
| `src/v32.js`, `src/v32.css` | Lớp V32 mới, version 16.4.0, nạp CUỐI (sau V31): Storage Monitor (ngân sách ước tính 5 MB, mức ok/warn/critical, liệt kê từng khóa), Safe Cleanup (chỉ xóa snapshot cũ hơn 5 bản mới nhất + lịch sử cũ hơn 10 mục mới nhất, luôn hỏi xác nhận trước), Pre-save Guard (bọc `save` toàn cục + `__v20.flush` + `__v31.recordBackupEvent`, kiểm tra mỗi 30 giây + khi tab hiện lại), badge cảnh báo nổi (z-index 1100, đóng được). |
| `build_v32.py` | Script build V16.4: kiểm tra base là V16.3 nguyên vẹn (sha256 `4378dc22…`), áp dụng đúng 1 replacement (R-V32-VER), chèn lớp V32 cuối cùng, assert marker/thứ tự/version/KO không đổi/không có marker ngoài phạm vi, `node --check` v32.js + v20_sync.js. Chạy đúng 1 lần, không chạy lại trên bản đã xong. |
| `package_v32.py` | Script đóng gói ZIP V16.4 + kiểm tra `index.html`, `v32.js`, `v32.css`, `build_v32.py`, `package_v32.py`, `tools/v32/test32.js` trong ZIP; marker V32 cuối cùng; fragment V31 còn đủ; R-V32-VER có mặt; không có nút KO mới; `firebase-config.js` trong ZIP là placeholder. |
| `README_V16_4_DATA_SAFETY.md` | Hướng dẫn V16.4: monitor, dọn dẹp an toàn, pre-save guard, giới hạn (Firebase live chưa kiểm thử, Chrome bị chặn). |
| `CHANGELOG_V16_3_to_V16_4.md` | Changelog đầy đủ V16.3 → V16.4 (kèm ghi chú build: assert `bad-version` ×2 đã sửa). |
| `SMOKE_TEST_V16_4_2026-11-19.md` | Báo cáo kiểm thử V16.4 (build gates đầy đủ; bảng số lượng test TBD cho test agent; Chrome bị chặn). |
| `tools/v32/` | Bộ kiểm thử V16.4: `PLAN_V32.md` (kế hoạch binding), `test32.js` + `verify-v32c.js` (test agent owns). |

### File sửa
| File | Thay đổi |
|---|---|
| `v20_sync.js` | `validateSave` thêm kiểm tra phiên bản (R-V32-VER): `meta.saveVersion` vắng mặt → chấp nhận, == 12 → chấp nhận, khác → từ chối với `bad-version:<n>`. Đây là hardening phòng ngừa, không phải sửa lỗi đã quan sát. |
| `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` | Thêm mục V16.4. |

### Lớp V32 — tóm tắt nội dung (chi tiết trong README_V16_4_DATA_SAFETY.md)
- **Giám sát dung lượng lưu trữ** trong panel Quản lý dữ liệu (bọc `__v20.dataPanelHTML` lần thứ hai, trên lớp bọc của V31) và tab Sao lưu của Trung tâm tài khoản (decorator MutationObserver, chèn sau `#v31acct`): tổng dùng / ngân sách 5 MB (ước tính), thanh tiến trình, ngưỡng 70%/90%, phiên bản bản lưu hiện tại, liệt kê từng khóa `hanvocab.*` với kích thước + loại. **Không thêm nút KO** — KO đã mở được panel qua nút Quản lý dữ liệu có sẵn.
- **Dọn dẹp an toàn:** chỉ xóa snapshot hệ thống cũ hơn 5 bản mới nhất và mục lịch sử sao lưu cũ hơn 10 mục mới nhất; luôn hỏi xác nhận trước (hủy = không xóa gì); không bao giờ xóa `hanvocab.v1`, `hanvocab.v11-backup`, bản sao lưu đám mây đã xác minh, `hanvocab.v12.meta`, khóa `other`/`protected` hay khóa ngoài `hanvocab.*`. Kết quả được ghi vào lịch sử sao lưu V31 (`cleanup`).
- **Pre-save guard:** bọc `save` toàn cục (đã xác minh trong source: hàm V6 ở HTML:947, V20 đã bọc một lần thành debounce — V32 bọc tiếp, gọi gốc trước rồi kiểm tra sau 900 ms, không chặn/không đổi/không xóa dữ liệu), bọc `__v20.flush` + `__v31.recordBackupEvent`, kiểm tra mỗi 30 giây và khi tab hiện lại; cảnh báo hiện ở 3 nơi (mục monitor, badge nổi đóng được, `console.warn`).
- **Không đổi:** khóa `hanvocab.v1`, mọi dữ liệu người chơi, Firebase Auth/Sync, login khách, các lớp V6–V31 (version giữ nguyên: v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0, v20 = 12.0.0, v20_sync/v21 = 13.0.0, v22 = 14.0.0, v24 = 15.1.0, v25 = 15.2.0, v26 = 15.3.0, v27 = 16.0.0, v31 = 16.3.0). Không thêm khóa localStorage mới, không migration, không tiền tệ mới. `build_v31.py` không chạy lại trên bản đã xong.

### Ngoài phạm vi (không làm trong V16.4)
- Claude #3 (daily-start + review boss), #4 (review-debt cap + welcome-back), #5 (bulk Korean import) — follow-up, chưa làm. V17-1/V17-2/V17-3, F-04/F-05/F-07/F-09/F-10, V17-4 typo, M1/M2, V9 word fixes, V14.1, PR #7 follow-ups, F-12 full-wipe (vẫn chờ Anh) — chưa sửa.

## V17.0 — CHRONO KINGDOM (2026-11-19)

**17.0.0 lấy từ bản nháp V30 Vocabulary World chưa phát hành** (file
thiết kế `v17-design.md`, giữ lại làm tham chiếu — KHÔNG xóa). Bản
này lấy số 17.0.0 cho CHRONO KINGDOM.

### File mới
| File | Nội dung |
|---|---|
| `src/v33.js`, `src/v33.css`, `src/v33_data.js` | Lớp V33 mới, version 17.0.0, nạp CUỐI (sau V32): cổng 70-win, 8 boss Chrono (UCE V19), 6 nhiệm vụ cốt truyện (V27), Time Echo, Chrono Rift, 240 từ B2, 3 loài pet mới, overlay z-index 1500, token `--ui-*`, 44 px. |
| `build_v33.py` | Script build V17.0: kiểm tra base là V16.4 nguyên vẹn (sha256 `c3639bc7…`), áp dụng đúng 13 replacement (V19 ×6, V18 ×2, V21/V27/V20 ×2, V15 ×1), thêm nút KO `v33kotab`, đổi title, chèn lớp V33 cuối cùng, assert marker/thứ tự/version/KO không đổi/không có marker ngoài phạm vi, `node --check` 8 file. Chạy đúng 1 lần, không chạy lại trên bản đã xong. (Ghi lại 2 bản sửa B-33-1/B-33-2 sau build đầu.) |
| `package_v33.py` | Script đóng gói ZIP V17.0 + kiểm tra `index.html`, `v33.js`, `v33.css`, `v33_data.js`, `build_v33.py`, `package_v33.py`, `tools/v33/test33.js` trong ZIP; marker V33 cuối cùng; fragment V31 + V33 còn đủ (kèm 2 dòng sửa B-33-1/B-33-2); PNG V10 30 / V11 30 / V17 8 / pet v15 53; không có `assets/pets/v17/`; KO 1× v33kotab; `firebase-config.js` trong ZIP là placeholder. |
| `data/v33_words.json` | 240 từ Chrono (4 set × 60: time / space / machines / change) kèm IPA + ví dụ; `tools/v33/validate_words.py` kiểm tra 0 trùng / 0 thiếu. |
| `assets/bosses/v17/v17_{sandwisp,pendulum,specter,mantis,hound,oracle,titan,geargolem}.png` | 8 ảnh boss Chrono (RGBA 512×512, nền trong suốt). |
| `assets/pets/v15/chrono/{stardeer,gearbeetle,cosmicunicorn}_s{1,2,3}.png` + `assets/pets/v15/eggs/chrono_egg_{star,gear,cosmic}.png` | 12 ảnh pet Chrono (9 form + 3 trứng) — nằm dưới cây `v15` theo quyết định MOVE (xem dưới), KHÔNG có `assets/pets/v17/`. |
| `README_V17_0_CHRONO_KINGDOM.md` | Hướng dẫn V17.0: cổng 70-win, 8 boss, 6 nhiệm vụ, Time Echo, Chrono Rift, 3 loài pet, giới hạn (Firebase live chưa kiểm thử). |
| `CHANGELOG_V16_4_to_V17_0.md` | Changelog đầy đủ V16.4 → V17.0 (kèm 2 bản sửa B-33-1/B-33-2 và 2 anchor BRIEF sai trong source). |
| `SMOKE_TEST_V17_0_2026-11-19.md` | Báo cáo kiểm thử V17.0 (build gates đầy đủ; test33 204/0/8 ×3; Chrome driver). |
| `tools/v33/` | Bộ kiểm thử V17.0: `BRIEF_V33.md` (brief binding), `gen_v33_data.py`, `validate_words.py`, `fix_v17_transparency.py`, `test33.js`, `verify-v33c.js`. |

### File sửa
| File | Thay đổi |
|---|---|
| `v19.js` | 6 replacement V33: fight/unlock fall-through sang `__V33_DATA.byId` (boss Chrono + delegate zone `chrono` cho `__v33.bossUnlocked`); khiên Golem 90 HP; bỏ P3 cho Golem; hồi +10 HP khi trả lời sai ở P2; chữ giai đoạn `/2` cho Golem. |
| `v18.js` | 2 replacement V33: `allBosses()` thêm `__V33_DATA.bosses`; `challenge()` + `collDetail()` fall-through sang `__V33_DATA.byId`. |
| `v21.js` | `TOTAL_BOSSES` 70 → 78. |
| `v27.js` | Export `startSession` trên `__v27` (1 replacement, guarded). |
| `v20_sync.js` | `hasProgress` nhận tiến trình en33; thêm nhánh merge `en33` (quest union MAX, rift best MAX + claimed union theo ngày mới hơn, regionClaimed MAX từng ngôn ngữ — sửa B-33-2, created MIN, pending bỏ). |
| `v15.js` | Khối V33 trong `buildWords()` hợp nhất `__V33_WORDS` vào `WORDS` (theo tiền lệ BT). |
| `index.html` (inlined) | Cùng 13 replacement trên + nút KO `v33kotab` sau `v27kotab` + title V17.0 + lớp V33 chèn cuối cùng. |
| `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` | Thêm mục V17.0. |

### Lớp V33 — tóm tắt nội dung (chi tiết trong README_V17_0_CHRONO_KINGDOM.md)
- **Cổng 70-win:** đếm V33-local (10 boss cũ + 30 V10 flat + 30 V11); mở đúng 70; khóa hiện `x/70` thật + breakdown. Boss mở lần lượt theo ngôn ngữ. Vào từ English Hub (decorator MutationObserver, 2 nút) + tab KO `v33kotab`.
- **8 boss Chrono** dùng UCE V19 (không engine mới), lv 61–68, hp 620–750, def 7–8, hệ + kỹ năng chỉ từ palette V19; Golem Bánh Răng: khiên 90 HP, 2 giai đoạn (không P3), hồi +10 HP khi trả lời sai ở P2. Thắng ghi vào `en19`; hoàn thành vùng +150 XP/+5 💎/danh hiệu “Chúa Tể Thời Gian” mỗi ngôn ngữ 1 lần.
- **240 từ B2** (4 set × 60) vào `WORDS` qua `buildWords()`; từ trùng (`alarm clock`) giữ id cũ + thêm tag `chrono`. Chưa có nhóm Library thứ 5.
- **6 nhiệm vụ cốt truyện** qua V27 (accuracy ≥ 80% mới hoàn thành — sửa B-33-1; +20 XP, ≥ 90% thêm +10 XP, nhiệm vụ cuối +1 💎). **Time Echo** (từ sai nhiều nhất, tối đa 10, trạng thái trống trung thực). **Chrono Rift** (3 tầng × 7 câu, mở tầng sau khi tầng trước ≥ 70%, thưởng theo accuracy 1 lần/ngày/tầng).
- **3 loài pet mới** (Hươu Sao / Bọ Bánh Răng / Kỳ Lân Vũ Trụ) + 3 trứng, đăng ký vào `__V23_DATA` (guarded + idempotent), tiến hóa theo đá/cost hiện có; mốc sưu tập 45 form (+60 💎, “Bậc Thầy Thời Gian”).
- **Quyết định MOVE (ảnh pet):** `v23.js` hardcode tiền tố `assets/pets/v15/` + subpath stage và `assets/pets/v15/eggs/` + tên file trần, nên ảnh pet Chrono CHỈ nằm ở `assets/pets/v15/chrono/` + `assets/pets/v15/eggs/chrono_egg_*.png`. Không có `assets/pets/v17/` ở đâu, không trùng byte trong ZIP.
- **Không đổi:** khóa `hanvocab.v1`, mọi dữ liệu người chơi, Firebase Auth/Sync, login khách, các lớp V6–V32 (version giữ nguyên: v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0, v20 = 12.0.0, v20_sync/v21 = 13.0.0, v22 = 14.0.0, v24 = 15.1.0, v25 = 15.2.0, v26 = 15.3.0, v27 = 16.0.0, v31 = 16.3.0, v32 = 16.4.0). Không migration, không tiền tệ mới. Thêm đúng 1 khóa lười mới `S.v7.en33` (boss thắng vẫn ghi `en19`).
- **Đã sửa sau build đầu (B-33-1, B-33-2):** nhiệm vụ cần accuracy ≥ 80% (hằng `QUEST_MIN_ACC`); merge `regionClaimed` dùng MAX từng ngôn ngữ thay vì `unionTrue` (local 0 ghi đè cloud 1). Cả hai đã trong bản build thứ hai (`out/index.html` sha256 `b04179cf…`).

### Ngoài phạm vi (không làm trong V17.0)
- Tích hợp Library (nhóm thứ 5) cho từ Chrono; gõ bàn phím Hangul trong boss fight; Claude #3/#4/#5; V9 word fixes; V14.1; PR #7 follow-ups; F-12 full-wipe (vẫn chờ Anh) — chưa sửa.

## V17.1 — CHRONO COMPLETE (2026-11-19)

Hoàn thiện tích hợp Chrono của V17.0: nhóm Library thứ 5, SRS đã xác
minh (không cần code mới), Analytics suy ra từ dữ liệu SRS, hệ thống
Điểm Yếu Boss cho cả 78 boss, và guard Smart mid-flight. Không thêm
khóa localStorage mới, không migration, không art mới, không nút mới.

### File mới
| File | Nội dung |
|---|---|
| `src/v34.js`, `src/v34.css`, `src/v34_data.js` | Lớp V34 mới, version 17.1.0, nạp CUỐI (sau V33): bảng điểm yếu (`__V34_DATA`), `__v34` (`weakFor` / `weakMatch` / `breakBonus` / `breakDmg` / `weakPick` / `scopeBlocked` / `breakBarHTML` / `weakChipHTML` / analytics), CSS chỉ class mới `.v34breakbar` / `.v34breaklabel` / `.v34weakchip`, token `--ui-*`, 44 px. |
| `build_v34.py` | Script build V17.1: kiểm tra base là V17.0 nguyên vẹn (sha256 `b04179cf…`), áp dụng đúng 36 replacement (V17 ×13, V25 ×2, V15 ×7, V19 ×6, V18 ×7, V33 ×1), đổi title V17.1, chèn lớp V34 cuối cùng, assert marker/thứ tự/version/V31+V32+V33 fragment/KO không đổi/không có marker ngoài phạm vi, `node --check` 8 file. Chạy 5 lần (2 lỗi script bắt bởi `node --check`, 1 lỗi assert validation, 1 bản sửa B-34-1 sau probe — mỗi lần đều restore base nguyên vẹn từ ZIP V17.0 rồi chạy lại, không patch tại chỗ). |
| `package_v34.py` | Script đóng gói ZIP V17.1 + kiểm tra `index.html`, `v34.js`, `v34.css`, `v34_data.js`, `build_v34.py`, `package_v34.py`, `tools/v34/probe_v34.js` trong ZIP; marker V34 cuối cùng; fragment V31 + V33 + V34 còn đủ (kèm dòng sửa B-34-1); PNG V10 30 / V11 30 / V17 8 / pet v15 53; không có `assets/pets/v17/`; KO 1× v33kotab; `firebase-config.js` trong ZIP là placeholder. Chưa chạy tới cuối — coordinator chạy sau khi test agent xong. |
| `README_V17_1_CHRONO_COMPLETE.md` | Hướng dẫn V17.1: nhóm Library thứ 5, SRS, Analytics, bảng điểm yếu đầy đủ, guard Smart, giới hạn 12 boss + B-34-1. |
| `CHANGELOG_V17_0_to_V17_1.md` | Changelog đầy đủ V17.0 → V17.1 (bảng điểm yếu đầy đủ, ghi chú sửa sai `en33.bosses`, guard Smart, trạng thái trống KO, giới hạn 12 boss, danh sách 36 replacement). |
| `SMOKE_TEST_V17_1_2026-11-19.md` | Báo cáo kiểm thử V17.1 (build gates; probe 106/0/0 ×3; B-34-1; TODO cho test agent độc lập). |
| `tools/v34/` | Bộ kiểm thử V17.1: `probe_v34.js` (Node vm, 106 check, chạy trên `out/`; cờ debug `V34_DEBUG_TOPICS` / `V34_DUMP_POOL`). |
| `tools/v34_restore_v17.py`, `tools/v34_check_anchors.py` | Script restore base V17.0 nguyên vẹn từ ZIP (chứng minh bằng cách áp lại replacement) + kiểm tra anchor trước build. |

### File sửa
| File | Thay đổi |
|---|---|
| `v17.js` | 13 replacement V34: `set` trong `V` state; `chronoWords()` / `chronoSets()` / `chronoSetName()` / `chronoSetCard()` / `chronoGroupHTML()`; `currentScope()` / `scopeName()` / `rewardFor()` (chrono +50/+2 mỗi set, +200/+5 tất cả); nhóm Chrono trong `libraryHTML()`; nhánh chrono trong `lessonHTML()`; `V.set` reset trong `openLesson` / `openLib` / `openTopic` / `goHome`. |
| `v25.js` | 2 replacement V34: nhánh `chrono` trong `groupKey()` / `groupStats()` (thanh tiến độ thật cho nhóm). |
| `v15.js` | 7 replacement V34: `sc.set` trong `inScope15()` / `wordsFiltered()`; init `B.weak` / `brk` / `brkMax` trong `bossFight`; bias `weakPick` trong `nextBossQ()`; `breakDmg` trong `bossAnswer()`; thanh Break trong `renderBossFight()`; chip điểm yếu trong `bossesHTML()`. |
| `v19.js` | 6 replacement V34: `sc2` thêm `set:sc.set`; init `F.weak` / `brk` / `brkMax` trong `startFight`; bias `weakPick` trong `nextQ()`; `breakDmg` trong `answer()`; thanh Break trong `renderFight()`; chip điểm yếu trong zone-detail. |
| `v18.js` | 7 replacement V34: như V19 (sc2, init, bias, break, bar) + chip điểm yếu trong Collection card + detail. |
| `v33.js` | 1 replacement V34: guard `__v27.endEarly()` ở đầu `launchSession()`. |
| `index.html` (inlined) | Cùng 36 replacement trên + title V17.1 + lớp V34 chèn cuối cùng. |
| `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` | Thêm mục V17.1. |

### Lớp V34 — tóm tắt nội dung (chi tiết trong README_V17_1_CHRONO_COMPLETE.md)
- **Library nhóm thứ 5:** 4 set Chrono × 60 từ, tìm kiếm / lọc POS / lọc trạng thái / yêu thích / flashcards / scope `{kind:'lib',lib:'chrono',set}` dùng chung cho mode, SRS, boss fight; thưởng +50 XP/+2 💎 mỗi set, +200 XP/+5 💎 tất cả (1 lần, qua `en17.claimed`).
- **SRS:** đã xác minh qua probe — `mark15` ghi danh từ `v33_` tự động, tới hạn ôn đúng, Smart `classifyEN`/plan đều thấy từ. Không code mới, không thưởng mới.
- **Analytics (chỉ suy ra, không lưu):** mỗi set + tổng nhóm — đã học (box ≥ 1), chưa học, thành thạo (box ≥ 5), tới hạn, retention = Σđúng/(Σđúng+Σsai) (`—` khi 0 lần thử). KO Chrono: trạng thái trống trung thực (không có từ Chrono tiếng Hàn — `ko` chỉ là nghĩa hiển thị). Link Smart chỉ ở Library (không có hook sạch trong `v27.js`); hàm `__v34` đã expose cho tương lai.
- **Điểm Yếu Boss (78 boss):** bảng đầy đủ trong README/changelog (Chrono 8 riêng; V19 theo zone z1–z10; V18 theo diff/element; V15 chung `t:'time'`). Đúng đáp án với từ điểm yếu → meter +1; 3/3 → cộng thêm `breakBonus(maxHp)` = clamp(round(maxHp×0.10),10,50), reset, banner `💥 BREAK!`; cộng trước bước chia đôi khiên. Bias p≈0.5 trong `nextQ` khi meter chưa đầy. KO: điểm yếu = deck tiếng Hàn đã chọn; chưa chọn deck → meter ẩn. Pool 0 từ điểm yếu → thanh báo “ngoài phạm vi ôn tập — đổi phạm vi để dùng”, không bao giờ đầy.
- **Guard Smart:** `launchSession()` gọi `__v27.endEarly()` có guard trước — session Smart đang chạy được kết thúc-ghi nhận thay vì bị thay lặng lẽ; `endEarly()` là no-op khi không có session.
- **Giới hạn đã biết (dữ liệu, không phải code):** 12 boss B1/B2 có điểm yếu là chủ đề A1–A2 cơ bản (`animals` / `vehicles` / `clothes-and-accessories` / `fruit-and-vegetables` / `food-and-drinks`) — các chủ đề này không có từ B1/B2 nào nên meter không bao giờ đầy (thanh báo blocked trung thực). 66/78 boss còn lại đầy bình thường. Bảng điểm yếu giữ nguyên theo spec; đổi bảng là quyết định của Anh.
- **Đã sửa sau build đầu (B-34-1):** `scopeBlocked()` lúc đầu chỉ chặn khi có scope Library — 12 boss trên hiện meter `0/3` không bao giờ đầy mà không giải thích. Nay chặn khi pool thực tế có 0 từ điểm yếu, có scope hay không. Đã trong bản build cuối (`out/index.html` sha256 `0b766dad…`).
- **Sửa sai changelog V17.0 (ghi chú, không sửa file V17.0):** `en33` KHÔNG có khóa `bosses` — thắng boss Chrono ghi vào `en19`. Đừng giả định `en33.bosses` tồn tại.
- **Không đổi:** khóa `hanvocab.v1`, mọi dữ liệu người chơi, Firebase Auth/Sync, login khách, các lớp V6–V33 (version giữ nguyên: v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0, v20 = 12.0.0, v20_sync/v21 = 13.0.0, v22 = 14.0.0, v24 = 15.1.0, v25 = 15.2.0, v26 = 15.3.0, v27 = 16.0.0, v31 = 16.3.0, v32 = 16.4.0, v33 = 17.0.0). Không migration, không tiền tệ mới, không khóa mới. Không art mới, không nút mới.

### Ngoài phạm vi (không làm trong V17.1)
- Đổi bảng điểm yếu cho 12 boss B1/B2 (quyết định của Anh); nút/link Smart overlay (không có hook sạch trong `v27.js`); V18.0 Skyroot Sanctuary; Claude #3/#4/#5; V9 word fixes; V14.1; PR #7 follow-ups; F-12 full-wipe (vẫn chờ Anh) — chưa sửa.

## V18.0 — Skyroot Sanctuary (2026-11-19)

### File mới
| File | Nội dung |
|---|---|
| `Korean_English_Vocab_Farm_V18_0_Skyroot_Sanctuary.zip` | ZIP deploy đầy đủ V18.0 (out/ + docs). |
| `src/v35.js`, `src/v35.css`, `src/v35_data.js` | Lớp V35 (18.0.0, chèn cuối cùng): overlay Skyroot, cổng GEAR GOLEM, 8 boss, 6 nhiệm vụ, đăng ký pet, `__v35` + `_test` probes. `v35_data.js` sinh bởi `tools/v35/gen_v35_data.py` từ `data/v35_words.json`. |
| `tools/v35/gen_v35_data.py` | Sinh `src/v35_data.js`: 240 từ, 8 boss, 6 nhiệm vụ (rời nhau), 3 loài pet, 3 trứng, bảng điểm yếu kind `skyroot`. |
| `build_v35.py`, `package_v35.py` | Script build (29 replacement, cổng hash V17.1, pre-pass anchor) + package (ZIP, kiểm tra V31/V33/V34/V35 fragments). |
| `README_V18_0_SKYROOT_SANCTUARY.md` | Hướng dẫn V18.0 đầy đủ (boss, từ, nhiệm vụ, pet, điểm yếu, giới hạn). |
| `CHANGELOG_V17_1_to_V18_0.md` | Changelog đầy đủ V17.1 → V18.0 (29 replacement, bảng điểm yếu, sửa sai `en33.bosses`, B-35-1). |
| `SMOKE_TEST_V18_0_2026-11-19.md` | Báo cáo kiểm thử V18.0 (build gates; TODO cho test agent độc lập). |
| `tools/v35/PUSH_MANIFESTS.md` | Manifest push §(b) V18.0 (đường dẫn chính xác; lưu ý art PNG không vào snapshot push text-only). |
| `assets/bosses/v18/` (8 PNG) | Art boss Skyroot (`v18_breeze_lynx` … `v18_skyroot_empress`), byte-identical với `tools/v35/assets-staging/`. |
| `assets/pets/v18/` (12 PNG) | Art pet Skyroot: 9 form (`v18_cloudfx/sproutowl/stormram_s1–s3`) + 3 trứng (`v18_egg_cloud/sprout/storm`). |

### File sửa
| File | Thay đổi |
|---|---|
| `v19.js` | 2 replacement V35: fight lookup fall-through `__V35_DATA.byId`; unlock ủy quyền zone `'skyroot'` cho `__v35.bossUnlocked`. |
| `v18.js` | 2 replacement V35: `allBosses()` thêm `__V35_DATA.bosses`; `challenge()`/`collDetail()` fall-through `__V35_DATA.byId` (count 2). |
| `v21.js` | 1 replacement V35: `TOTAL_BOSSES` 78 → **86**. |
| `v20_sync.js` | 2 replacement V35: `hasProgress` + merge branch cho `en35` (giống en33, không có rift). |
| `v15.js` | 3 replacement V35: khối `buildWords()` gắn 240 từ Skyroot (lib `'skyroot'`, B2, POS chuẩn hóa); `sc.set` trong `inScope15()` / `wordsFiltered()`. |
| `v17.js` | 9 replacement V35: `skyrootSetName()` / `skyrootWords()` / `skyrootSets()` / `skyrootSetCard()` / `skyrootGroupHTML()`; scope / scopeName / reward (skyroot:all +200/+5, mỗi set +50/+2); nhóm Skyroot trong `libraryHTML()`; nhánh skyroot trong `lessonHTML()`; `openSkyrootSet()` / `learnSkyrootSet()` / `reviewSkyrootSet()` + exports. |
| `v25.js` | 2 replacement V35: nhánh `'skyroot'` trong `groupKey()` / `groupStats()` (thanh tiến độ thật cho nhóm). |
| `v34.js` | 4 replacement V35: `weakFor()` (bảng `__V35_DATA.weakExplicit` + fallback zone skyroot), `weakMatch()` (`w.skyrootSet`), `weakName()` (nhãn set Skyroot). |
| `v23.js` | 2 replacement V35: `stageImg()` / `eggImgHTML()` hiểu tiền tố `'v18/'` → `assets/pets/v18/` (cũ `assets/pets/v15/` giữ nguyên). |
| `v23_data.js` | 2 replacement V35: `PET_ELEMENTS` thêm `wind` (Gió); `PET_MATERIALS` thêm `stone_wind` (Tinh Thể Gió). |
| `index.html` (inlined) | Cùng 29 replacement trên + nút KO `v35kotab` sau `v33kotab` + title V18.0 + lớp V35 chèn cuối cùng. |
| `CHANGELOG_V16_4_to_V17_0.md` | **Sửa sai tài liệu (docs-only):** bỏ khóa `bosses:{}` khỏi mô tả `en33` + ghi chú sửa sai có ngày (thắng boss Chrono ghi vào `en19`). |
| `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` | Thêm mục V18.0. |

### Lớp V35 — tóm tắt nội dung (chi tiết trong README_V18_0_SKYROOT_SANCTUARY.md)
- **Vùng Skyroot Sanctuary:** 8 boss (Lv 69–76, HP 760–850, diff B2), cổng = thắng GEAR GOLEM bằng ngôn ngữ đó; mở khóa lần lượt; thưởng hoàn thành vùng +150 XP/+5 💎/danh hiệu “Chúa Tể Thiên Căn” (mỗi ngôn ngữ, claimed-guarded). Boss tổng 86.
- **Thư viện nhóm thứ 6:** 4 set Skyroot × 60 từ (Climate & Environment / Science & Innovation / Society & Culture / Mind & Character, B2; 120 EN-led + 120 KO-led); tìm kiếm / lọc POS / lọc trạng thái / yêu thích / flashcards / scope `{kind:'lib',lib:'skyroot',set}`; thưởng +50 XP/+2 💎 mỗi set, +200 XP/+5 💎 tất cả (1 lần, qua `en17.claimed`).
- **SRS:** không code mới — `mark15` ghi danh từ `v35_` tự động; POS chuẩn hóa tại điểm gắn (bài học V34-BUG-1).
- **6 nhiệm vụ cốt truyện qua V27** (12–14 từ, rời nhau): hoàn thành ≥ 80% rồi nhận thưởng (+20 XP, ≥ 90% thêm +10 XP, nhiệm vụ cuối +1 💎; claimed-guarded trong `en35.quests`); chạy dưới ngưỡng không tính hoàn thành (bài học B-33-1); guard `__v27.endEarly()` có từ đầu (bài học V34).
- **3 thú Skyroot:** Cáo Mây (Gió, dmg/storm) · Cú Mầm (Rừng, heal/wisdom) · Cừu Bão (Sấm, shield/storm) — kỹ năng chỉ dùng type v23 có sẵn, quan sát được trong trận boss; trứng Mây 1200/Mầm 1000/Bão 2000; mốc sưu tập 54 form +70 💎/danh hiệu “Bậc Thầy Thiên Căn”.
- **Điểm Yếu Boss (8 boss Skyroot):** kind `'skyroot'`, 2 boss/set; mỗi set 60 từ B2 nên mọi thanh Break đều đầy được (không lặp lại giới hạn 12 boss Chrono V17.1).
- **Lưu `S.v7.en35`** (lazy, không migration): `{quests, regionClaimed:{en,ko}, pending, created}` — **không có khóa `bosses`** (thắng boss ghi vào `en19`); merge đám mây giống en33 (không rift).
- **Đã sửa sau khi sinh dữ liệu lần đầu (B-35-1):** `gen_v35_data.py` lấy nhầm chỉ số tuple (gems thay vì set điểm yếu) — bảng điểm yếu sinh ra `"key":5` cho cả 8 boss; đã sửa thành `b[19]`, sinh lại, kiểm tra 8 mục / 2 mỗi set.
- **Không đổi:** khóa `hanvocab.v1`, mọi dữ liệu người chơi, Firebase Auth/Sync, login khách, các lớp V6–V34 (version giữ nguyên: v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0, v20 = 12.0.0, v20_sync/v21 = 13.0.0, v22 = 14.0.0, v24 = 15.1.0, v25 = 15.2.0, v26 = 15.3.0, v27 = 16.0.0, v31 = 16.3.0, v32 = 16.4.0, v33 = 17.0.0, v34 = 17.1.0). Không migration, không tiền tệ mới, không khóa mới ngoài `en35` (lazy). Art mới 20 PNG; không nút mới ngoài nút Skyroot ở hai hub.

### Ngoài phạm vi (không làm trong V18.0)
- Bộ kiểm thử jsdom `tools/v35/test35.js` (test agent viết tiếp, dùng `__v35._test` probes); Time Echo / Rift cho Skyroot; đổi bảng điểm yếu cho 12 boss B1/B2 Chrono; V9 word fixes; V14.1; PR #7 follow-ups; F-12 full-wipe (vẫn chờ Anh) — chưa sửa.

## V18.1 — Bug Fixes (2026-11-19)

### File mới
| File | Nội dung |
|---|---|
| `Korean_English_Vocab_Farm_V18_1_Bug_Fixes.zip` | ZIP deploy đầy đủ V18.1 (out/ + docs). |
| `src/v36.js`, `src/v36.css` | Lớp V36 (18.1.0, chèn cuối cùng): wrapper `__v34.breakBarHTML` (thanh Break bị chặn — mode/KO-deck<8), CSS F-06/M1/M2, `__v36` + `wrapped` flag. Không chạm localStorage, không dùng `window.S`. |
| `build_v36.py`, `package_v36.py` | Script build (30 replacement, cổng hash V18.0 `eb7dcbdd…`, backup trước khi sửa vào `tools/v36/backup-v18.0/`) + package (ZIP, kiểm tra V31/V33/V34/V35/V36 fragments + typo 0×). |
| `README_V18_1_BUG_FIXES.md` | Hướng dẫn V18.1: từng lỗi (file + dòng + bằng chứng + mức độ), cách sửa, mục cố tình không sửa + lý do, test, giới hạn. |
| `CHANGELOG_V18_0_to_V18_1.md` | Changelog đầy đủ V18.0 → V18.1 (30 replacement, lớp V36, B-36-1/B-36-2, sửa sai số lượng boss bị chặn 12 → 13 pool + 15 mode). |
| `SMOKE_TEST_V18_1_2026-11-19.md` | Báo cáo kiểm thử V18.1 (build gates 9 lần chạy; test36 172/0/8 ×4; Chrome gates V36-A–G PASS, 0 console error). |
| `tools/v36/test36.js` | Bộ kiểm thử V18.1 (Node vm, 180 check: §0/§L/§171/§172/§173/§WIND/§F13/§F14/§F16a/§F17/§F09F10/§CSS/§R/§V/§C). |
| `tools/v36/verify-v36c.js` | Chrome gates V36-A–G (CDP, Chrome 157): layering, 360px, lethal skill, partial session, ids/Escape, avatar/speak, regression. |
| `tools/v36/probe_toast.js` | Probe toast (xác minh đường toast thật: pop15 → `.pp` z-60, `.v7toast` z-95, `#v23toast` không bao giờ xuất hiện). |
| `tools/v36/PUSH_MANIFESTS.md` | Manifest push V18.1 (26 đường dẫn; base `muse/skyroot-sanctuary-v180` @ `d354d015`, target `muse/bug-fixes-v181`, draft PR base `muse/skyroot-sanctuary-v180`). |

### File sửa
| File | Thay đổi |
|---|---|
| `v21.js` | 4 replacement V36: R-V171-A/B (`bossWinCount` + `summarizeSave` đếm cả win V18 flat — V17-1); R-F09A/B (nút welcome `v21email` → `v21emailbtn` + binding — F-09); R-F10A/B (handler Escape tên `_esc21` + `removeEventListener` trong `closeAccount` — F-10). |
| `v15.js` | 1 replacement V36: R-V173-SPEAK — bỏ `gain15(5)` trong speak, thông báo hiện XP thật từ `mark15` (`_sxp36`) — V17-3. |
| `v18.js` | 7 replacement V36: R-WIND-18 (`wind:'stone_wind'`); R-V172C/D (`resolveLethal` v18); R-V172F (`healBoss` chặn `hp<=0`); R-F16A1/A2 (`koPool`/`distractorsKO` đọc deck đã chọn); R-F17A (banner BREAK sau khiên). |
| `v19.js` | 7 replacement V36: R-WIND-19 (`wind:'stone_wind'`); R-V172A/B (`resolveLethal` v19 + export); R-V172G (`healBoss` chặn `hp<=0`); R-F17B (banner BREAK sau khiên). |
| `v23.js` | 1 replacement V36: R-V172E — `castSkillInFight()` gọi `resolveLethal` sau khi trừ HP (v19 trước, v18 sau) — V17-2. |
| `v27.js` | 5 replacement V36: R-F13A–E — `finishSession(partial)` + `endEarly()` tính xong theo phase + bỏ plan bonus / gem streak-7 / `goals.complete` khi partial — F13. |
| `v33.js` | 1 replacement V36: R-F13F — `findSession` bỏ qua `rec.partial`. |
| `v35.js` | 2 replacement V36: R-V35COPY (overlay Skyroot bỏ câu "và thú Skyroot" — pet không bị khóa vùng); R-F13G — `findSession` bỏ qua `rec.partial`. |
| `v14.js` | 1 replacement V36 (OUT_ONLY): R-F04A — `enIcon('flame.png')` → `'flame.svg'` — F-04. |
| `v12.js` | 1 replacement V36 (OUT_ONLY): R-F04B — `icon:'moon.png'` → `'moon.svg'` — F-04. |
| `v17_a1a2.js` | Sửa typo V17-4: `NGHỀNGHIỆP` → `NGHỀ NGHIỆP` (54 lần; cùng sửa trong `data/v17_a1a2.json` + `out/v17_a1a2.js` + inlined index.html). |
| `tools/v34/probe_v34.js` | Sửa model probe: nhánh Oxford của `poolOf()` áp dụng diff filter như `wordPool` thật; danh sách unfillable kỳ vọng 12 → 13 (thêm `v10_owl`). |
| `index.html` (inlined) | Cùng 30 replacement trên + typo 54× + title V18.1 + lớp V36 chèn cuối cùng. |
| `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md` | Thêm mục V18.1. |

### Lớp V36 — tóm tắt nội dung (chi tiết trong README_V18_1_BUG_FIXES.md)
- **Sửa SEVERE:** V17-2 (team-skill đánh chết boss nhưng trận không kết thúc — `resolveLethal` + chặn `healBoss` hồi sinh boss 0 HP); B-36-1 (wrapper Break-bar của chính V36 đệ quy tới crash — bắt stock bar một lần vào `_orig`).
- **Sửa MAJOR:** V17-1 (đếm thiếu win V18 flat — avatar kỳ lân/phượng hoàng không mở được); V17-3 (Speaking trả XP gấp đôi +15 thay vì +5); F13 (phiên Smart bỏ dở bị ghi thành hoàn thành — quest/plan bonus trả oan); F16a (trận KO V18 không đọc deck đã chọn).
- **Sửa MINOR:** đá tiến hóa gió (`wind:'stone_wind'` — Breeze Lynx + Stormeagle); copy overlay Skyroot (pet không bị khóa vùng); banner BREAK sau khiên; F-06 (Smart 1600, toast 1700 — gồm B-36-2: toast thật là `.pp`/`.v7toast`, không phải `#v23toast`); F-09 (id trùng `v21email`); F-10 (listener Escape tích lũy); M1 (tràn filter-row 360px); M2 (6 nút <44px → 44px); V17-4 (typo `NGHỀNGHIỆP`); wrapper thanh Break bị chặn (15 mode-blocked + KO-deck<8).
- **Sửa sai số liệu:** danh sách boss điểm yếu không bao giờ đầy: pool-blocked **13** (thêm `v10_owl`), mode-blocked **15**, riêng biệt **26/86** (60 đầy bình thường). Bảng điểm yếu giữ nguyên (chờ Anh quyết định).
- **Không đổi:** khóa `hanvocab.v1`, mọi dữ liệu người chơi, điều kiện mở vùng, phần thưởng, số liệu boss, Firebase Auth/Sync, login khách, các lớp V6–V35 (version giữ nguyên). Không migration, không tiền tệ mới, không khóa localStorage mới. Không art mới.

### Ngoài phạm vi (không làm trong V18.1 — cần Anh quyết định)
- Thu hoạch farm +35 XP thay vì +25 (`v15.js:1236-1239`) — có thể là thiết kế cố ý; chờ Anh.
- Icon bubble.png / shop.png (F-04) — cần lời của Anh (flame/moon đã sửa).
- Bảng điểm yếu (26 boss bị chặn) — quyết định thiết kế, chờ Anh.
- `legDiff()` counts-getter bug (`v18.js:244`) — sửa sẽ đổi độ khó Legendary.
- Bẫy stacking `.v20modal` (nằm trong `.v15hub` z-950) — hành vi đã biết, chấp nhận; đóng Smart trước là tới được.
- F-05 / F-07 observers — cần đo hiệu năng live. F-12 resetEN scope — chờ Anh.
- V9 word fixes; V14.1; PR #7 follow-ups; 20 PNG V18.0 (đường đẩy riêng, chờ Anh) — chưa làm.
