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
