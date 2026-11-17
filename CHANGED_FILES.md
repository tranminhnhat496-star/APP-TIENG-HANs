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
