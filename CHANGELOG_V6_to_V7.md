# Changelog — V6 Bilingual → V7 English Learning Expansion

## V7.0.0 — English Farm

### Thêm mới
- **Language system (lớp V15 mới):** màn hình chọn Korean Farm / English Farm
  khi mở app lần đầu, thanh chuyển ngôn ngữ nhanh, ghi nhớ lựa chọn
  (`S.v7.en15.lang`, `S.v7.en15.langChoice`). Tiến trình Anh–Hàn lưu độc lập.
- **Từ vựng tiếng Anh: 96 → 1.096 từ.** Thêm 1.000 từ mới A1 (300), A2 (300),
  B1 (250), B2 (150), mỗi từ có IPA, loại từ, câu ví dụ + dịch. Từ mới được
  đẩy vào `__v14.ENWORDS` / `__v14.TOPICS` nên các chế độ V14 dùng chung
  danh sách mới mà không sửa code V14.
- **10 chế độ học tiếng Anh mới** trong English Hub (Flashcards, Multiple
  Choice, Typing, Listening, Sentence Builder, Grammar, Matching, Speed,
  Reading, Speaking).
- **Ngân hàng bài tập mới:** 48 câu ngữ pháp A1–B2 (có giải thích), 8 đoạn
  văn đọc hiểu + 24 câu hỏi, 40 câu xếp câu A1–B2.
- **English Farm:** 6 luống cây gắn với hộp nhớ SRS của từ (5 giai đoạn),
  tưới cây bằng câu trả lời đúng, thu hoạch phải trả lời đúng từ đó (+25 XP,
  mỗi 3 lần +1 💎), cửa hàng vật nuôi/trang trí bằng XP chung, thời tiết và
  ngày/đêm, mascot riêng Ollie the Owl (SVG).
- **10 boss tiếng Anh** (Slime, Goblin, Dragon, Ghost, Spider, Owl, Tiger,
  Wizard, Dictionary, King) với HP, kỹ năng riêng, combo, chí mạng, thưởng
  XP/💎/vật phẩm, mở khóa theo thứ tự. Tận dụng ảnh boss có sẵn trong
  `assets/bosses/`.
- **SRS tiếng Anh:** khoảng ôn 10 phút (sai) → 1/3/7/14/30 ngày (đúng),
  số từ cần ôn hôm nay, thống kê mới/đang học/đã thuộc, biểu đồ 7 ngày,
  chế độ chỉ ôn từ yếu. Lưu trong `S.v7.en15` + hộp nhớ `S.v7.en` (V14).
- **Quản lý từ vựng:** tìm kiếm, lọc cấp độ/chủ đề, thêm/sửa/xóa từ riêng,
  nhập/xuất JSON/CSV.
- **Sao lưu/khôi phục:** xuất toàn bộ bản lưu `hanvocab.v1` (.json), khôi phục
  từ file có kiểm tra hợp lệ, đặt lại riêng tiến trình tiếng Anh.

### Giữ nguyên (không thay đổi)
- Toàn bộ code V6: `Korean_Vocab_Farm_V6_Bilingual.html`, các lớp
  `v7`–`v14` (JS/CSS), toàn bộ `assets/`.
- Khóa localStorage `hanvocab.v1`, dữ liệu thẻ/bộ từ tiếng Hàn, XP, 💎,
  farm, boss, nhiệm vụ, mascot tiếng Hàn.
- Các chế độ học tiếng Anh của V14 vẫn hoạt động, nay dùng 1.096 từ.

### Sửa lỗi trong quá trình làm V7
- Kiểm tra chéo 4 đợt từ vựng phát hiện 237 từ trùng giữa các đợt (do soạn
  song song): đã thay bằng từ mới cùng cấp độ, kiểm tra lại bằng
  `validate_words.py` cho tới khi 0 lỗi (không trùng, đủ 1.000 từ mới,
  IPA đúng định dạng, ví dụ chứa đúng dạng từ).

### Hạn chế đã biết
- Speaking Practice chỉ chấm điểm khi trình duyệt hỗ trợ SpeechRecognition;
  trình duyệt không hỗ trợ dùng chế độ tự luyện và không hiển thị điểm giả.
- Phát âm TTS phụ thuộc giọng đọc có sẵn của trình duyệt/hệ điều hành.
