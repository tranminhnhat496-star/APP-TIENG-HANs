# KOREAN & ENGLISH VOCAB FARM V12 — LƯU TIẾN TRÌNH & ĐỒNG BỘ ĐÁM MÂY

## Tóm tắt

V12 thêm hệ thống lưu tiến trình chuyên nghiệp vào game:

- **Tự động lưu có kiểm soát**: ghi dồn 0,8 giây, xác minh bằng cách đọc
  lại dữ liệu sau khi ghi (ghi thất bại thì báo lỗi, không bao giờ báo
  "đã lưu" giả), tự lưu khi ẩn tab / đóng trang.
- **Trạng thái lưu luôn thấy được**: viên trạng thái ở đầu trang tiếng
  Hàn + mục Quản lý dữ liệu (thời gian lưu gần nhất, kích thước bản lưu).
- **Chuyển đổi V11 → V12**: giữ nguyên khóa `hanvocab.v1`, sao lưu toàn
  bộ dữ liệu V11 trước khi chuyển đổi, đóng dấu phiên bản, có nút khôi
  phục bản trước khi chuyển đổi.
- **Quản lý dữ liệu** (tab 💾 Dữ liệu trong English Hub, nút "Quản lý dữ
  liệu & đồng bộ" trong mục Dữ liệu tiếng Hàn): lưu ngay, xuất/khôi phục
  JSON (có kiểm tra cấu trúc + giới hạn 10 MB, sao lưu bản hiện tại
  trước khi khôi phục), xem lần lưu/đồng bộ gần nhất, đăng nhập/đăng
  xuất, đồng bộ ngay.
- **Đồng bộ đám mây (Firebase)**: đăng nhập Google hoặc Email, lưu tiến
  trình lên Cloud Firestore, đồng bộ giữa các thiết bị, xử lý xung đột
  bằng lựa chọn của người chơi (không tự ghi đè), hợp nhất an toàn
  (không cộng dồn XP/vàng), làm việc offline rồi tự đồng bộ khi có mạng.

## ⚠️ Đọc trước: đồng bộ đám mây cần Anh cấu hình

**Đồng bộ đám mây chưa được kiểm thử với Firebase thật** (môi trường
phát triển không có project Firebase, không mở được popup đăng nhập
Google). Code kết nối Firebase đã viết đầy đủ; logic so sánh / xung đột
/ hợp nhất / mất mạng đã được kiểm thử bằng bộ giả lập (xem
SMOKE_TEST_V12). **Anh phải làm theo FIREBASE_SETUP.md và chạy xong
checklist kiểm thử trực tiếp thì mới nên nói đồng bộ đã hoạt động.**

Khi chưa cấu hình, game vẫn chơi đầy đủ offline. Mục Dữ liệu sẽ hiện rõ
"Chưa cấu hình Firebase" — game không bao giờ giả vờ đã đồng bộ.

## Cách dùng (người chơi)

### Lưu cục bộ (không cần tài khoản)

Không cần làm gì: game tự lưu sau mỗi bài học, câu trả lời, trận boss,
phần thưởng, mua sắm, trồng/thu hoạch và đổi cài đặt. Viên trạng thái ở
đầu trang hiện "● Đã lưu HH:MM". Đóng game mở lại vẫn tiếp tục đúng chỗ.

### Xuất / khôi phục bản sao lưu

Mở tab **💾 Dữ liệu** (English Hub) → mục "Sao lưu & khôi phục":
**Tải file sao lưu (.json)** để giữ một bản ngoài máy; **chọn file** để
khôi phục (game kiểm tra file, sao lưu bản hiện tại trước, rồi mới hỏi
xác nhận ghi đè).

### Bật đồng bộ đám mây (cần cấu hình trước)

1. Anh (quản trị game) làm theo **FIREBASE_SETUP.md**: tạo project
   Firebase, bật Google + Email, dán Rules, thêm domain GitHub Pages,
   dán cấu hình vào `firebase-config.js`, deploy.
2. Người chơi mở tab 💾 Dữ liệu → **Đăng nhập bằng Google** (hoặc nhập
   email + mật khẩu → Đăng nhập / Tạo tài khoản mới).
3. Bấm **Đồng bộ ngay** lần đầu: tiến trình trên thiết bị được tải lên.
4. Trên thiết bị khác: đăng nhập cùng tài khoản → **Đồng bộ ngay** →
   chọn "Dùng bản trên đám mây" nếu thiết bị này chưa có gì, hoặc chọn
   cách xử lý xung đột nếu cả hai bên đều có tiến trình mới.

### Xung đột dữ liệu

Khi cả thiết bị và đám mây đều thay đổi từ lần đồng bộ trước, game hiện
bảng chọn với tóm tắt hai bên (XP, kim cương, số thẻ, số boss đã thắng,
thời gian lưu):

- **Dùng bản trên thiết bị này** — tải bản này lên đám mây.
- **Dùng bản trên đám mây** — tải bản đám mây về (bản hiện tại đã được
  sao lưu trước).
- **Hợp nhất an toàn** — boss đã thắng ở bên nào cũng tính, sao lấy mức
  cao nhất; XP/kim cương lấy mức cao nhất (không cộng dồn); thẻ từ hợp
  nhất theo ID.

Game không bao giờ tự chọn khi có xung đột. Đồng bộ tự động (khi có mạng
trở lại) chỉ tải lên, không bao giờ tự tải về hay tải lại trang.

### Mất mạng

Chơi bình thường, mọi thứ vẫn lưu trên thiết bị, trạng thái hiện "mất
mạng — lưu cục bộ". Khi có mạng lại, game tự đồng bộ phần đã thay đổi
(chỉ tải lên).

## Dữ liệu nào được đồng bộ

Toàn bộ đối tượng lưu `hanvocab.v1`: thẻ tiếng Hàn, bộ từ, cài đặt, XP,
kim cương, farm, boss V15/V10/V11, thư viện (ID đã thích/đã thuộc),
Smart Import. **Thư viện mặc định A1–A2 và Oxford 3000 không nằm trong
bản lưu** (nó là dữ liệu của game, có sẵn trong code) nên không được tải
lên tài khoản từng người.

## Giới hạn đã biết

- Document Firestore tối đa **1 MB**: bản lưu trên ~900 KB sẽ bị từ
  chối đồng bộ (game báo rõ), nhưng vẫn lưu cục bộ bình thường. Bản lưu
  thông thường (vài trăm thẻ) chỉ vài chục KB.
- Người chơi có thể tự sửa bản lưu của **chính mình** (bản chất của lưu
  phía client). Firestore Rules chỉ ngăn xem/sửa dữ liệu của **người
  khác**. Bảng xếp hạng hoặc phần thưởng cạnh tranh cần xác minh phía
  máy chủ (Cloud Functions) — V12 không có, xem FIREBASE_SETUP.md.
- Chế độ gõ Hangul bằng bàn phím và lọc câu hỏi boss theo trạng thái SRS
  vẫn chưa có (như đã ghi ở V11.1).
- Kiểm thử trình duyệt thật / GitHub Pages vẫn cần Anh làm sau khi
  deploy (như các bản trước).
