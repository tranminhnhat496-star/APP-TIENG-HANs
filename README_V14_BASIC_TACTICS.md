# KOREAN & ENGLISH VOCAB FARM V14 — BASIC TACTICS LISTENING VOCABULARY

## Tóm tắt

V14 thêm bộ từ vựng sách **Basic Tactics for Listening** vào English Hub,
dưới dạng một nhóm mới trong **Thư viện từ vựng** (cạnh A1–A2 và Oxford 3000):

- **24 Units, 819 mục từ: 513 từ đơn + 306 cụm từ**, trích trực tiếp từ file
  Word `TỔNG HỢP TỪ VỰNG SÁCH BASIC TACTIC LST.docx` do Anh cung cấp — không
  nhập lại bằng tay, không bỏ sót Unit 1 hay Unit 24.
- Mỗi Unit có hai tab **Words | Phrases & Collocations**, với tìm kiếm, lọc
  theo trạng thái (chưa học / đang học / đã thuộc / cần ôn / yêu thích),
  nghe phát âm, đánh dấu đã thuộc, yêu thích và sao chép sang Từ vựng của tôi.
- Mỗi Unit có 3 nút: **Học ngay** (Flashcards), **Ôn tập** (SRS), **Kiểm tra**
  (Trắc nghiệm) — cộng thêm **Đánh boss** và **Quest Unit**.
- **Listening Quest — 24 Missions**: mỗi Unit là một nhiệm vụ 5 phần (học từ
  đơn → học cụm từ → nhận diện nghĩa → luyện nghe bằng giọng đọc → kiểm tra
  tổng hợp), nhận sao theo độ chính xác (★★★ ≥ 90%, ★★ ≥ 80%, ★ hoàn thành),
  có màn hình kết quả và danh sách mục trả lời sai để ôn lại.
- **Chọn bộ từ trước khi đánh boss**: trong đấu trường V10 và chi tiết vùng
  bản đồ V11 có hộp chọn — một Unit, nhiều Unit, toàn bộ 24 Units, chỉ từ
  đơn, chỉ cụm từ, chỉ mục chưa thuộc, chỉ mục cần ôn. Boss hỏi đúng từ
  trong các Unit đã chọn (kể cả đáp án nhiễu), không lọt từ Hàn hay từ bộ khác.
- **Cụm từ dài được giữ nguyên cả câu**, không cắt nhỏ. Trong English Typing,
  cụm từ nhiều từ chuyển thành bài **sắp xếp các thành phần** (chạm vào các
  mảnh từ để xếp đúng thứ tự) thay vì bắt gõ nguyên câu. Nghe phát âm cả cụm
  bằng giọng đọc của trình duyệt.

## Cách dùng

Mở **English Hub → Thư viện từ vựng → Basic Tactics for Listening – Vocabulary**
→ chọn Unit → **Học ngay**.

- **Học ngay**: Flashcards của Unit đó (chỉ từ trong Unit).
- **Ôn tập**: ôn SRS những từ trong Unit đến hạn.
- **Kiểm tra**: 10 câu trắc nghiệm nghĩa của Unit đó.
- **Đánh boss**: mở tab Bosses với phạm vi là Unit đó — boss hỏi từ Unit đó.
- **Quest Unit**: làm nhiệm vụ 5 phần của Unit đó.
- **Hộp “Bộ từ đánh boss”** (trong đấu trường và bản đồ boss): chọn Unit(s),
  loại mục, trạng thái rồi bấm **Áp dụng** — mọi trận boss tiếng Anh sau đó
  dùng đúng bộ từ đã chọn cho đến khi bạn bấm **Bỏ chọn**.

## Dữ liệu nào được lưu ở đâu

| Dữ liệu | Vị trí |
|---|---|
| Bộ từ Basic Tactics (819 mục) | `basic_tactics_vocabulary.json` trong game (file riêng, tải khi cần) — **không** nằm trong localStorage, **không** sao chép vào Firestore |
| Hộp SRS, đúng/sai, lịch ôn | `S.v7.en` (chung với A1–A2/Oxford, theo ID từ) — đồng bộ cùng bản lưu |
| Sao Quest, điểm tốt nhất, số lần chơi | `S.v7.en22.quest` (chỉ lưu ID + số sao) — đồng bộ cùng bản lưu |
| Phạm vi đang chọn | `S.v7.en15.scope` (chung với A1–A2/Oxford) |

ID mỗi mục có dạng ổn định `bt<unit>_<số>` (ví dụ `bt1_001`, `bt13_052`) — cập
nhật phiên bản sau không làm mất thành tích. Từ trùng ở nhiều Unit (ví dụ
“glasses” ở Unit 2 và Unit 3) giữ nguyên trong từng Unit, nhưng dùng chung một
hồ sơ SRS — giống cách A1–A2/Oxford xử lý từ trùng từ V9.

## Giới hạn đã biết — đọc trước khi dùng

- **Không có IPA**: tài liệu gốc không có phiên âm nên game **không tự bịa
  IPA** — các thẻ từ hiện “Chưa có phiên âm”. Nếu Anh có nguồn IPA đáng tin,
  tôi sẽ bổ sung.
- **Không có audio gốc của sách**: phần nghe dùng **giọng đọc của trình duyệt**
  (Speech Synthesis). Nếu trình duyệt không hỗ trợ giọng đọc, phần nghe trong
  Quest được bỏ qua và sao tính theo các phần còn lại — game nói rõ điều này,
  không giả vờ có audio.
- **Mở file trực tiếp (file://)**: dữ liệu Basic Tactics tải bằng `fetch`
  nên cần mở game qua **GitHub Pages hoặc máy chủ web**. Mở file index.html
  trực tiếp từ máy có thể khiến nhóm Basic Tactics báo “Không tải được dữ
  liệu” (các tính năng khác vẫn chạy bình thường).
- **Hai mục V9 chưa sửa** (Anh chưa trả lời nên V14 giữ nguyên): Oxford
  “gram, gramme” nghĩa “ngữ pháp” là sai (đúng là “gam”); A1–A2 “pomegranate”
  nghĩa “quả lưu” sai chính tả (đúng là “quả lựu”). Xem REVIEW_LIST_V14.md.
- **5 đầu từ trùng nhưng nghĩa khác nhau giữa các Unit** (ví dụ “corner”:
  Unit 9 “góc”, Unit 21 “góc đường”) — game hiện nghĩa riêng của từng Unit
  theo đúng file gốc. Xem REVIEW_LIST_V14.md để quyết định nghĩa chuẩn.
- Chế độ gõ Hangul bằng bàn phím và lọc câu hỏi boss theo trạng thái SRS vẫn
  chưa có (như đã ghi ở V11.1).
- Kiểm thử trình duyệt thật / GitHub Pages vẫn cần Anh làm sau khi deploy
  (như các bản trước).
