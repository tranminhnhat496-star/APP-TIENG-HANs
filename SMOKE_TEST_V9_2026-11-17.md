# Báo cáo kiểm thử V9 — 2026-11-17 (jsdom, chạy mã thật)

Môi trường: jsdom 24, Node, build V9 (`out/index.html`) chạy qua HTTP server
cục bộ. Kiểm thử trình duyệt thật (live browser) **không chạy được từ môi trường
này** (localhost bị chặn, muse.ai bị chặn bởi chính sách trình duyệt, các tunnel
công cộng không tới được) — giống V7/V8. Anh cần kiểm tra lại trên GitHub Pages
sau khi deploy, đặc biệt: phát âm (Web Speech API), kéo thả file, và hiển thị
trên điện thoại.

## Kết quả

| Bộ kiểm thử | Kết quả |
|---|---|
| **V9 mới (test17.js)** — thư viện, học ngay, SRS, XP, boss, phần thưởng, lưu trữ, KO | **45/45 đạt** (chạy lại lần 2 vẫn 45/45) |
| **Chế độ học với phạm vi (scope_modes.js)** — Builder, Speed, Matching, Listening, Typing, Grammar | **6/6 đạt** |
| **Hồi quy V8 (test16_v9.js)** — Smart Import 4 bước, trùng, bộ từ, xuất/nhập, KO | **80/80 đạt** (từ mới mẫu đổi `kiwi` → `durian` vì `kiwi` nay là từ có sẵn) |
| **Hồi quy V7 (smoke.js)** — 10 chế độ, farm, boss, backup, save V6, KO | **38/41 đạt** — 3 lỗi là kỳ vọng cũ theo phiên bản: tiêu đề "V7", tổng từ = 1096, tiêu đề hub hiện 1096 (nay là V9 / 4.409 từ) |

## V9 mới — 45 kiểm tra đã đạt (test17.js)

**A. Tích hợp dữ liệu (11)**
- Tổng WORDS = 4.410 = 4.409 đầu từ riêng biệt + 1 từ tự thêm; ENWORDS = 4.409.
- Cấp độ V15 khôi phục: A2=300, B1=250, B2=150; `achieve`.lv=B1.
- Từ chỉ có trong thư viện nhận cấp độ A1–A2 (595 từ) / OX (2.718 từ).
- `apple`: một bản ghi chuẩn duy nhất, thuộc cả hai bộ (`lib=["a1a2","oxford"]`).
- `accommodation` (đã nối từ ngắt dòng) có trong A1–A2.
- Oxford: 136 bài, bài 1 = 25 từ (ord 1–25), bài 136 = 21 từ.
- A1–A2: 19 chủ đề, EDUCATION=20, EMOTIONS AND FEELINGS=119.
- Nghĩa phụ: `orange`/`may`/`arm` giữ nghĩa khác nhau; `orange` ở cả hai chủ đề
  FRUIT và COLORS; `may` một lần trong bài 73 (24 từ riêng biệt / 25 mục).
- Thiếu IPA giữ trống: 91 từ Oxford, `advertising` không có phiên âm.
- Dấu tiếng Việt: `apple`="quả táo", `encounter` có "chạm trán",
  `gradually`="dần dần, từ từ", `politics` có "hoạt động".
- Ký tự IPA: `abandon` có `ˈ`, `boarding school` có `ɔ`.
- Từ nhiều chữ nguyên vẹn: `boarding school`, `great-grandparent`,
  `kilogram, kilogramme, kilo (abbr kg)`.

**B. Giao diện Thư viện (17)**
- Hub mở ra có tab Thư viện; 3 nhóm + số lượng 1000 / 3396.
- 19 thẻ chủ đề; thẻ EDUCATION hiện 20 từ; lưới bài trang 1 có 24 bài, 6 trang.
- Tìm kiếm Oxford "abandon" tìm thấy `abandon` + `abandoned`.
- Xem bài 3: tiêu đề, 25 từ, từ đầu `adequately` (ord 51); thẻ từ có đủ 4 nút
  Nghe / Đã thuộc / Yêu thích / Sao chép.
- Lọc loại từ `v` trong bài 3: đúng 9 động từ.
- Đánh dấu Đã thuộc: box 5 rồi về 0; Yêu thích lưu vào `en17.fav`.
- Sao chép vào Từ vựng của tôi: thêm từ tự thêm, từ gốc còn nguyên thư viện.
- Nhận thưởng chủ đề: nút hiện khi học hết 20 từ EDUCATION; bấm nhận +50 XP,
  +2 💎, ghi nhận 1 lần; nút biến mất sau khi nhận (không farm lại được).

**C. Chế độ học + phạm vi (7)**
- `learnLesson(3)`: scope được đặt + mở tab Học + banner "Đang học: Bài 3".
- Flashcards với scope: 25 thẻ, toàn bài 3.
- Trắc nghiệm với scope: câu hỏi là từ bài 3; trả lời đúng +10 XP (luật chống
  farm lần đầu).
- Boss với scope: thanh HP + 3 câu hỏi liên tiếp đều là từ bài 3.
- Ôn tập với scope: câu đầu tiên là từ bài 3.
- Bỏ chọn scope: bộ từ trở lại toàn bộ 4.410 từ.

**D. Lưu trữ + tiếng Hàn (6)**
- Lưu rồi đọc lại file save: yêu thích + đã nhận thưởng + box + từ tự thêm còn đủ.
- Save tiếng Hàn nguyên vẹn (3 thẻ, XP ≥ 300, 2 bộ từ).
- Tải lại trang với save đã lưu: yêu thích / đã nhận thưởng / từ tự thêm còn;
  WORDS dựng lại > 1.096; thẻ Hàn + XP còn; chuyển về tiếng Hàn thì stage vẽ được.

**Chế độ học với phạm vi (6, scope_modes.js)** — Builder vẽ tiles, Speed hỏi từ
bài 5, Matching 12 thẻ đều bài 5, Listening: từ nghe là bài 5 (đáp án gây nhiễu
lấy trong cùng bộ Oxford theo thiết kế sẵn của V15), Typing hỏi từ bài 5,
Grammar vẽ được khi đang chọn phạm vi.

## Hồi quy

- **V8 (80/80)**: toàn bộ Smart Import (đọc file, nhận diện, xem trước, xử lý
  trùng, bộ từ, xuất/nhập Excel/CSV/JSON, KO) vẫn hoạt động. Thay đổi duy nhất
  so với bản V8: từ mới mẫu `kiwi` → `durian`, vì `kiwi` nay đã có sẵn trong bộ
  A1–A2 nên V16 phân loại đúng thành từ trùng (không phải lỗi).
- **V7 (38/41)**: 10 chế độ học, farm (6 ô), boss (10 boss, HP 60/60), review,
  thống kê, vocab, backup, save V6 (XP, thẻ Hàn, box EN, gems), chế độ tiếng Hàn
  đều đạt. 3 lỗi chỉ là kỳ vọng ghi cứng theo V7 (tiêu đề "V7", tổng từ 1096,
  tiêu đề hub 1096) — nay là V9 / 4.409 từ.

## Lỗi môi trường kiểm thử (không phải lỗi app, đã loại khỏi kết quả)

- `matchMedia is not defined`, `Element.animate is not a function`: jsdom không
  có các API trình duyệt này; trình duyệt thật có. (V6 dùng `.animate()` cho
  hiệu ứng pháo giấy/tiền bay.)
- Lỗi mạng `EPROTO/ECONNRESET` khi jsdom thử tải font Google Fonts — môi trường
  kiểm thử không có internet ngoài; app chạy offline bình thường.

## Chưa kiểm thử được ở đây (cần Anh kiểm tra trên GitHub Pages)

1. Phát âm bằng Web Speech API trên trình duyệt thật (giọng en-US).
2. Nhận dạng giọng nói (Speaking Practice / boss Phù thủy phát âm) — cần micro.
3. Kéo thả file Excel/CSV trong wizard V8 trên trình duyệt thật.
4. Hiển thị Thư viện trên điện thoại (responsive) và cuộn trang bài 136.
5. Deploy GitHub Pages: mở `index.html` từ repo APP-TIENG-HANS, kiểm tra Hub
   hiện 3 nhóm ngay lần đầu, không cần upload.
