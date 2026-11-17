# Korean & English Vocab Farm V7

Học từ vựng tiếng Hàn **và** tiếng Anh trong một nông trại game 2D — chạy hoàn toàn
trên GitHub Pages, không cần backend, không cần tài khoản.

## Chạy thử

Mở file **`index.html`** bằng trình duyệt (nhấp đúp, hoặc deploy lên GitHub Pages).
Mọi tiến trình lưu trong localStorage của trình duyệt (khóa `hanvocab.v1` — giữ nguyên từ V6).

## Có gì mới trong V7

### Chọn ngôn ngữ
- Mở app lần đầu: chọn **🇰🇷 Korean Farm** hoặc **🇬🇧 English Farm**.
- Thanh chuyển nhanh ở đầu trang (ghi nhớ lựa chọn).
- Tiến trình tiếng Hàn và tiếng Anh lưu độc lập; XP, cấp độ và 💎 dùng chung.

### Tiếng Anh — 1.096 từ (96 từ V14 + 1.000 từ mới)
- Cấp độ **A1 (300) · A2 (300) · B1 (250) · B2 (150)**, theo chủ đề.
- Mỗi từ: từ tiếng Anh, nghĩa tiếng Việt, IPA, loại từ, nút nghe phát âm
  (speech synthesis), câu ví dụ + dịch, hộp nhớ SRS 0–5, số lần đúng/sai,
  thời gian ôn tiếp theo.
- Từ mới được thêm vào cùng danh sách V14 nên các chế độ học cũ của V6
  (Trắc nghiệm, Gõ từ, Ghép cặp, Điền câu, Xếp chữ, Nghe, Đua 60s, Flashcard)
  tự động dùng được 1.096 từ.

### 10 chế độ học tiếng Anh (nút **English Hub** trên thanh ngôn ngữ)
1. Flashcards — lật thẻ, đánh giá Đã nhớ / Chưa nhớ
2. Multiple Choice — chọn nghĩa đúng, có giải thích
3. English Typing — nhìn nghĩa Việt, gõ từ tiếng Anh, có gợi ý chữ cái
4. Listening Challenge — nghe và chọn hoặc gõ từ nghe được
5. Sentence Builder — sắp xếp từ thành câu (40 câu A1–B2)
6. Grammar Challenge — 48 câu ngữ pháp A1–B2 (thì, từ loại, giới từ, điều kiện…)
7. Matching Game — ghép từ–nghĩa, giới hạn 90 giây
8. Speed Vocabulary — càng nhiều từ càng tốt trong 60 giây
9. Reading Challenge — 8 đoạn văn (A1–B1) + 24 câu hỏi
10. Speaking Practice — nhận dạng giọng nói (Web Speech API). Trình duyệt
    không hỗ trợ sẽ báo rõ và chuyển sang chế độ tự luyện có hướng dẫn —
    **không giả lập chấm phát âm**.

### English Farm
- 6 luống cây: học từ mới để gieo hạt, trả lời đúng để tưới cây, cây lớn qua
  5 giai đoạn theo hộp nhớ của từ, thu hoạch khi cây chín (phải trả lời đúng
  từ đó mới thu hoạch được).
- Thu hoạch +25 XP; mỗi 3 lần thu hoạch +1 💎.
- Cửa hàng farm: mua vật nuôi và đồ trang trí bằng XP chung (trừ vào ví như
  cửa hàng V6).
- Thời tiết và ngày/đêm thay đổi theo ngày và giờ thật; mascot riêng
  **Ollie the Owl** (cú, vẽ bằng SVG).

### 10 boss tiếng Anh
Vocabulary Slime, Spelling Goblin, Grammar Dragon, Listening Ghost,
Sentence Spider, Reading Owl, Speed Tiger, Pronunciation Wizard,
Dark Dictionary, English King (boss cuối — cần thắng 9 boss trước).
Mỗi boss: thanh HP, kỹ năng riêng (giới hạn giờ, chỉ nghe 1 lần…), combo,
10% chí mạng x2, thưởng XP + 💎 + vật phẩm riêng. Boss phát âm dùng
SpeechRecognition khi có, không có thì dùng chế độ nghe–chọn thay thế.

### Ôn tập thông minh (SRS)
- Từ sai quay lại sau 10 phút; từ thuộc giãn 1 → 3 → 7 → 14 → 30 ngày.
- Số từ cần ôn hôm nay, thống kê từ mới / đang học / đã thuộc,
  biểu đồ 7 ngày, chế độ chỉ ôn từ yếu.
- Dữ liệu ôn tiếng Anh tách riêng khỏi tiếng Hàn.

### Quản lý từ vựng & sao lưu
- Tìm kiếm, lọc theo cấp độ/chủ đề; thêm, sửa, xóa từ của bạn.
- Nhập / xuất danh sách từ bằng JSON hoặc CSV.
- Sao lưu toàn bộ dữ liệu người chơi (.json) và khôi phục từ file.
  Đặt lại chỉ tiến trình tiếng Anh mà không chạm tới từ tiếng Hàn.

## Giữ nguyên từ V6
Toàn bộ game tiếng Hàn, boss, nông trại, mascot, cây trồng, vật nuôi, vật phẩm,
nhiệm vụ và dữ liệu người chơi cũ đều giữ nguyên. Mở lại game bằng bản lưu V6:
mọi thứ vẫn ở đó, chỉ thêm lớp tiếng Anh mới.

## Cấu trúc file
- `index.html` — điểm khởi chạy duy nhất (đã build sẵn, gồm V6 + lớp V15).
- `v15.js`, `v15.css`, `v15_data.js`, `v15_words.json` — mã nguồn lớp V15
  (dùng `build_v7.py` để build lại `index.html` từ các file này).
- `v7.js` … `v14.js`, `v7.css` … `v14.css` — các lớp V6 gốc (không sửa).
- `assets/` — hình ảnh game gốc (boss, farm, mascot, pets, decor…).
- `build_v7.py`, `validate_words.py` — script build và kiểm tra từ vựng.
- `Korean_Vocab_Farm_V6_Bilingual.html` — bản V6 gốc để đối chiếu.

## Build lại từ mã nguồn
```bash
python3 build_v7.py            # đọc V6 + v15* -> out/index.html
python3 validate_words.py      # kiểm tra 1.000 từ mới
```

## Ghi chú trung thực
- Phát âm dùng speech synthesis của trình duyệt; chất lượng giọng đọc tùy
  trình duyệt và hệ điều hành.
- Speaking Practice chỉ chấm điểm khi trình duyệt hỗ trợ SpeechRecognition
  (Chrome trên máy tính/Android). Các trình duyệt khác dùng chế độ tự luyện
  và **không** hiển thị điểm phát âm giả.
- Từ vựng được soạn và kiểm tra bằng script (trùng lặp, IPA, ví dụ chứa đúng
  dạng từ); nếu phát hiện lỗi ở một từ cụ thể, hãy sửa trong `v15_words.json`
  rồi chạy lại `build_v7.py`.
