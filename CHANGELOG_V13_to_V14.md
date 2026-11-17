# CHANGELOG — V13 → V14 (Basic Tactics Listening Vocabulary, 2026-11-17)

## Tóm tắt

V14 thêm bộ từ vựng sách Basic Tactics for Listening (lớp V22) vào English Hub:
24 Units, 819 mục từ trích trực tiếp từ file Word, hiển thị trong Thư viện từ
vựng, dùng được trong mọi chế độ học, SRS và boss, cộng thêm Listening Quest
(24 Missions) và hộp chọn bộ từ trước khi đánh boss. Không đổi khóa lưu
`hanvocab.v1`, không xóa A1–A2/Oxford 3000, không xóa từ người dùng, không đổi
Firebase/Auth/Cloud Sync.

## Mới

### Dữ liệu Basic Tactics (trích từ file Word)
- `basic_tactics_vocabulary.json` (file riêng, 74 KB): 24 Units theo đúng thứ
  tự trong tài liệu, 819 mục từ — **513 từ đơn + 306 cụm từ**. Mỗi mục có ID
  ổn định `bt<unit>_<số>`, Unit, tên Unit, loại mục, tiếng Anh, tiếng Việt,
  nguồn dữ liệu. Không có IPA trong tài liệu gốc nên không tự tạo IPA, không
  tự tạo câu ví dụ.
- Trích bằng `tools/extract_basictactics.py` (python-docx, giữ cả dấu ngắt
  dòng trong đoạn văn — lỗi thường gặp là mất dấu ngắt dòng khiến cả danh
  sách gộp thành một mục). Kết quả: **0 dòng lỗi**, 24/24 tên Unit khớp đúng
  thứ tự với yêu cầu của Anh.
- Tên Unit tiếng Việt trong file gốc viết IN HOA — đã chuẩn hóa sang dạng
  câu khi hiển thị (nghĩa không đổi, ghi trong REPORT_BASIC_TACTICS.md).
- Mục trùng: 45 đầu từ xuất hiện ở nhiều Unit (57 lần lặp lại); 5 đầu từ có
  nghĩa tiếng Việt khác nhau giữa các Unit — giữ nguyên theo từng Unit, liệt
  kê trong REPORT_BASIC_TACTICS.md và REVIEW_LIST_V14.md để Anh quyết định.

### Thư viện — nhóm Basic Tactics (V22)
- Nhóm thứ 4 trong Thư viện từ vựng (sau Oxford 3000, trước Từ vựng của
  tôi): tiêu đề “Basic Tactics for Listening – Vocabulary”, phụ đề “24 Units
  | Words, Phrases & Collocations”, 24 thẻ Unit (tên tiếng Anh + tiếng Việt,
  tổng số từ/cụm từ, số đã học, tỷ lệ hoàn thành, thanh tiến độ, sao Quest,
  nút Học ngay / Ôn tập / Kiểm tra / Xem từ).
- Xem một Unit: hai tab **Words | Phrases & Collocations**, tìm kiếm, lọc
  theo trạng thái (chưa học / đang học / đã thuộc / cần ôn / yêu thích),
  nghe phát âm, đánh dấu đã thuộc, yêu thích, sao chép sang Từ vựng của tôi.
  Thẻ từ hiện “Chưa có phiên âm” thay vì bịa IPA.
- Dữ liệu tải lười: file JSON chỉ được tải khi mở Thư viện / Unit / Quest /
  boss picker (fetch, có dự phòng XMLHttpRequest). Thẻ Unit hiển thị được
  ngay từ metadata tĩnh (không cần chờ tải); thanh tiến độ “đã học” điền vào
  sau khi dữ liệu tải xong.

### Kết nối với các chế độ học (qua phạm vi scope)
- Sau khi tải, `__v15.attachBT()` gắn BT vào WORDS chung: từ đã có (V14/V15/
  A1–A2/Oxford) chỉ được gắn thêm thư viện BT (một hồ sơ SRS cho một đầu từ);
  từ chỉ có trong BT nhận id ổn định và lv `BT`. Phạm vi mới
  `{kind:'lib', lib:'bt', unit?, type?, status?}` lọc theo Unit(s), loại mục
  (từ đơn/cụm từ) và trạng thái (chưa thuộc/cần ôn) trong `wordsFiltered` và
  `inScope15`.
- 8 chế độ đều dùng được: Flashcards, Multiple Choice, English Typing,
  Listening Challenge, Matching Game, Speed Vocabulary, Spaced Repetition
  (tab Ôn tập), Boss Battle (cả boss gốc V15 lẫn đấu trường V10/V11).
- **English Typing với cụm từ**: cụm từ nhiều từ chuyển thành bài sắp xếp
  các thành phần (chạm vào các mảnh từ để xếp đúng thứ tự) thay vì bắt gõ
  nguyên câu dài. Gõ từ đơn vẫn như cũ.
- Listening dùng giọng đọc của trình duyệt (Speech Synthesis) để đọc cả cụm.

### Listening Quest — 24 Missions
- Mỗi Unit là một nhiệm vụ 5 phần: (1) học từ đơn, (2) học cụm từ (xem thẻ,
  hiện nghĩa, có thể bỏ qua phần học), (3) nhận diện nghĩa — 8 câu trắc
  nghiệm EN → VI, (4) luyện nghe — 8 câu, giọng đọc đọc từ/cụm từ, chọn đáp
  án nghe được (tự động đọc khi hiện câu, có nút Nghe lại), (5) kiểm tra
  tổng hợp — 10 câu xen kẽ nghĩa + nghe.
- Sao theo độ chính xác: ★★★ ≥ 90%, ★★ ≥ 80%, ★ hoàn thành. Màn hình kết
  quả liệt kê các mục trả lời sai + nút “Ôn tập Unit ngay”. Câu trả lời đúng/
  sai ghi vào SRS chung (hộp, lịch ôn, danh sách ôn) qua `mark15`.
- Thưởng: hoàn thành nhiệm vụ lần đầu +25 XP/+1 💎; đạt 3 sao lần đầu +25 XP/
  +1 💎 (mỗi Unit một lần).
- Nếu trình duyệt không hỗ trợ giọng đọc, phần nghe được bỏ qua và sao tính
  theo các phần còn lại — game nói rõ, không giả vờ có audio.

### Chọn bộ từ trước khi đánh boss
- Hộp “Bộ từ đánh boss” trong đấu trường V10 (English Challenge, Elemental,
  Legendary) và chi tiết vùng bản đồ V11: chọn Tất cả từ vựng / Basic Tactics
  toàn bộ 24 Units / Basic Tactics chọn Units (24 chip bật/tắt), loại mục
  (từ đơn + cụm từ / chỉ từ đơn / chỉ cụm từ), trạng thái (mọi trạng thái /
  chỉ chưa thuộc / chỉ cần ôn). Bấm **Áp dụng** là mọi trận boss tiếng Anh
  sau đó dùng đúng bộ từ đã chọn.
- `wordPool` của V18/V19 giờ tôn trọng phạm vi đang chọn (trước đây boss
  V18/V19 bỏ qua phạm vi Thư viện — banner V17 nói “boss chỉ dùng từ trong
  bộ này” nhưng thực tế không đúng; V14 sửa luôn điểm này cho cả A1–A2/
  Oxford). `distractorsEN` ưu tiên đáp án nhiễu trong cùng phạm vi khi đủ.
  Phạm vi quá nhỏ (ví dụ “chỉ cần ôn” trên một Unit ít từ) thì nới bộ lọc
  trạng thái nhưng giữ nguyên lựa chọn Unit/loại từ — không bao giờ lọt từ
  ngoài phạm vi vào câu hỏi.
- Trận tiếng Hàn không đổi: hộp chọn chỉ hiện ở giao diện tiếng Anh, câu hỏi
  Hàn vẫn lấy từ bộ thẻ tiếng Hàn.

### Lưu tiến trình
- Khóa mới `S.v7.en22 = {quest:{unit:{stars,best,attempts,lastAt,claimed1,
  claimed3}}, created}` — chỉ lưu sao Quest và số liệu, không sao chép 819
  mục từ vào localStorage hay Firestore (dữ liệu BT là code, đồng bộ nhẹ như
  V17). Hộp SRS/lịch ôn dùng chung `S.v7.en` (như A1–A2/Oxford).

## Sửa lỗi (phát hiện khi kiểm thử V14)

1. **Trích xuất gộp cả danh sách thành một mục**: `paragraph.text` của
   python-docx giữ dấu ngắt dòng, nhưng hàm chuẩn hóa khoảng trắng của
   script đã gộp hết `\n` thành khoảng trắng trước khi tách dòng — mỗi Unit
   chỉ còn 1 từ + 1 cụm từ (48 mục thay vì 819). Sửa: tách dòng TRƯỚC khi
   chuẩn hóa từng dòng.
2. **ID mục từ trùng nhau**: ID tính theo số thứ tự trong từng danh sách
   (từ đơn và cụm từ riêng) nên `bt1_001` vừa là từ đơn vừa là cụm từ. Sửa:
   từ đơn và cụm từ chung một dãy số trong Unit (`bt1_001`–`bt1_012` là từ
   đơn, `bt1_013`–`bt1_022` là cụm từ).

## File thay đổi

| File | Thay đổi |
|---|---|
| `src/v22.js` → `v22.js` | Mới: tải lười dữ liệu, nhóm Thư viện, xem Unit, Listening Quest, hộp chọn bộ từ boss, tiến trình en22. Version `14.0.0`. |
| `src/v22.css` → `v22.css` | Mới: tab Words/Phrases, huy hiệu loại mục, sao quest, hộp chọn boss. |
| `basic_tactics_vocabulary.json` | Mới: 819 mục từ Basic Tactics (24 Units), file riêng tải lười. |
| `v22_basictactics.json`, `v22_basictactics_report.json` | Mới: dữ liệu trích + báo cáo trùng/cờ kiểm tra (để đối chiếu). |
| `src/v15.js` → `v15.js` | Thêm khối gắn BT trong `buildWords`, `attachBT()`, phạm vi BT trong `wordsFiltered`/`inScope15`, sắp xếp cụm từ trong English Typing (`typeArr*`), export `mark15`. Version `13.0.0` → `14.0.0`. |
| `src/v17.js` → `v17.js` | Thêm nhóm BT vào `libraryHTML`, hook hiển thị Unit/Quest của V22, tên phạm vi BT trong `scopeName`, nhãn “Basic Tactics” cho nghĩa phụ. Version `9.0.0` → `10.0.0`. |
| `src/v18.js` → `v18.js` | `wordPool` tôn trọng phạm vi đang chọn, `distractorsEN` ưu tiên đáp án trong phạm vi, hộp chọn bộ từ trong `openArena`. Version `10.0.1` → `14.0.0`. |
| `src/v19.js` → `v19.js` | Như v18.js (wordPool, distractorsEN), hộp chọn bộ từ trong `zoneDetail` (chỉ tiếng Anh). Version `13.0.0` → `14.0.0`. |
| `index.html` | Tiêu đề → V14; thêm lớp V22 (style + script). |
| `tools/extract_basictactics.py` | Mới: script trích file Word (kèm báo cáo trùng/cờ). |
| `build_v14.py` / `package_v14.py` | Mới: build + đóng gói V14, kiểm tra 24 Units / 819 mục / ID duy nhất. |

## Không đổi

- Khóa lưu `hanvocab.v1`, schema bản lưu, toàn bộ tính năng V6–V13 (học
  Hàn/Anh, Smart Import, thư viện A1–A2/Oxford 3000, farm, boss V15/V10/V11,
  bản đồ, save manager, đồng bộ V12, tài khoản V13). Lưu ý trung thực: bộ
  kiểm thử đầy đủ V13 (138 kiểm tra) và V12 (108 kiểm tra) đã mất cùng
  thư mục /tmp giữa hai phiên làm việc nên KHÔNG chạy lại được nguyên bộ
  trên bản V14; thay vào đó, bộ kiểm thử V14 mục 8 (Hồi quy rút gọn) kiểm
  tra lại các điểm then chốt của V13/V12 trên bản V14 và đạt 19/19 (xem
  SMOKE_TEST_V14_2026-11-17.md).
- Firebase Auth / Firestore / Rules không đổi (không có document mới, không
  đổi Rules). Đăng nhập Google/Email với Firebase thật vẫn chưa được kiểm
  thử trực tiếp (như đã ghi ở V13).

## Kiểm thử

- Bộ kiểm thử V14 mới (`/tmp/v14test/test22.js`, jsdom): xem
  SMOKE_TEST_V14_2026-11-17.md — dữ liệu (24 Units, 819 mục, đúng thứ tự,
  không trộn Unit), nhóm Thư viện, xem Unit (2 tab, tìm kiếm, lọc, yêu
  thích, đã thuộc, không IPA bịa), 8 chế độ học với phạm vi BT (kể cả sắp
  xếp cụm từ trong Typing), Quest (5 phần, sao, mục sai, bỏ qua phần nghe
  khi không có TTS), boss V18/V19 với phạm vi BT (câu hỏi + đáp án nhiễu
  chỉ trong Unit đã chọn, không lọt từ Hàn), lưu tiến trình sau khi tải lại
  trang, hồi quy V13/V12.
- Chưa kiểm thử trên trình duyệt thật / GitHub Pages (giới hạn môi trường
  như các bản trước) — Anh kiểm tra giúp phần nghe (giọng đọc), bố cục
  mobile và mở lần đầu trên GitHub Pages.
