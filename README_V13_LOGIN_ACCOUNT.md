# KOREAN & ENGLISH VOCAB FARM V13 — LOGIN & PLAYER ACCOUNT SYSTEM

## Tóm tắt

V13 thêm hệ thống tài khoản người chơi lên trên V12 (không thay hệ
thống đồng bộ V12, không đổi khóa lưu `hanvocab.v1`, không đổi dữ liệu):

- **Màn hình chào mừng (Welcome)** khi mở game lần đầu: logo, mascot
  gà con, nền nông trại (CSS, có lá bay + mây trôi), 4 nút — Đăng nhập
  bằng Google, Đăng nhập bằng Email, Tạo tài khoản, Chơi với tư cách
  khách. Đã đăng nhập thì tự vào game, không hỏi lại. Đã chọn khách thì
  lần sau mở game vào thẳng.
- **Đăng nhập / Đăng ký / Quên mật khẩu** bằng Firebase Authentication
  thật (không giả lập): email + mật khẩu (có nút hiện/ẩn), ghi nhớ
  phiên (Firebase persistence: Local hoặc Session), kiểm tra định dạng
  email, mật khẩu tối thiểu 6 ký tự, hai mật khẩu phải trùng, báo lỗi
  rõ bằng tiếng Việt, chống bấm gửi nhiều lần, gửi email xác minh thật
  sau khi đăng ký, gửi email đặt lại mật khẩu thật (không tiết lộ email
  có tồn tại hay không).
- **Đăng nhập Google**: popup trước; nếu trình duyệt chặn popup hoặc
  không hỗ trợ thì hiện nút "Đăng nhập bằng chuyển trang" (redirect) —
  quay lại game là tự nhận diện tài khoản.
- **Hồ sơ người chơi (Player Profile)**: avatar, tên, Player ID (mã
  6 ký tự suy ra từ tài khoản, không lộ UID), Level, XP, tiền vàng,
  kim cương, số từ Hàn/Anh đã học và đã thuộc, số boss đã thắng / 70,
  danh hiệu, số ngày học liên tiếp, lần đồng bộ gần nhất. **Tất cả đều
  tính từ dữ liệu thật của game** — Level = 1 + floor(XP/100) (đúng
  công thức của game gốc), tiền vàng = XP − XP đã tiêu, chuỗi ngày =
  S.sk của game, boss thắng đếm trên cả 3 hệ boss.
- **10 avatar fantasy** (ảnh vẽ riêng, phong cách game): Gà con chiến
  binh (miễn phí), Cáo pháp sư (3 boss), Gấu trúc võ sĩ (8), Mèo kiếm
  sĩ (15), Thỏ phép thuật (20), Cú học giả (30), Sói băng (40), Rồng
  con (50), Kỳ lân (60), Phượng hoàng (70 boss — toàn bộ). Avatar khóa
  hiện ổ khóa + điều kiện mở; chọn avatar được lưu vào tiến trình.
- **Trung tâm tài khoản (Account Center)**: nút avatar ở góc trên giao
  diện tiếng Hàn và trong thanh ngôn ngữ của English Hub; mở ra 6 mục:
  Hồ sơ, Avatar, Tài khoản, Đồng bộ đám mây, Sao lưu & Khôi phục,
  Cài đặt (gồm chế độ giảm chuyển động).
- **Chế độ khách**: chơi đầy đủ không cần tài khoản (học, boss, farm,
  XP, vật phẩm đều bình thường). Trong mục Tài khoản có nút "Liên kết
  tài khoản để bảo vệ tiến trình". Khi khách đăng nhập/đăng ký, game
  hỏi có chuyển tiến trình khách vào tài khoản hay bắt đầu mới — nếu
  tài khoản đã có tiến trình trên đám mây thì cơ chế xử lý xung đột
  của V12 vẫn hỏi tiếp sau khi vào.
- **Tách dữ liệu theo tài khoản (quan trọng)**: game luôn chơi trên
  "ô lưu hiện tại" (`hanvocab.v1`); mỗi tài khoản có một "nhà" riêng
  (`hanvocab.v1.acc.<uid>`), khách có nhà riêng (`hanvocab.v1.guest`).
  Đổi tài khoản = cất ô lưu hiện tại vào nhà của chủ cũ (ghi có kiểm
  tra), rồi lấy ô lưu của tài khoản mới ra — **tài khoản B không bao
  giờ nhận được dữ liệu của tài khoản A**, kể cả trên cùng trình duyệt.
  Trạng thái đồng bộ (lần đồng bộ gần nhất, hash) cũng tách theo từng
  tài khoản. Đăng xuất thì trả lại bản lưu khách.

## ⚠️ Đọc trước: đăng nhập cần Anh cấu hình Firebase

Giống V12, **đăng nhập với Firebase thật chưa được kiểm thử trực tiếp**
(môi trường phát triển không có project Firebase, không mở được popup
Google). Code gọi Firebase Authentication đã viết đầy đủ; toàn bộ luồng
(welcome, form, hồ sơ, avatar, tách dữ liệu theo UID, chuyển tiến trình
khách) đã kiểm thử 138/138 bằng bộ giả lập Firebase. **Anh phải làm
theo FIREBASE_SETUP.md (đã bổ sung mục V13) và chạy checklist kiểm thử
trực tiếp thì mới nên nói đăng nhập đã hoạt động.**

Khi chưa cấu hình, game hiện rõ "Chưa cấu hình Firebase" ở màn hình
chào mừng và các form đăng nhập, và chơi khách vẫn đầy đủ.

## Cách dùng (người chơi)

### Lần đầu mở game
- Muốn chơi ngay: bấm **Chơi với tư cách khách**. Tiến trình lưu trên
  thiết bị này.
- Muốn đồng bộ: bấm **Đăng nhập bằng Google** hoặc **Tạo tài khoản**
  (tên hiển thị, email, mật khẩu, chọn avatar) — sau khi đăng ký, kiểm
  tra email để xác minh tài khoản (không bắt buộc để chơi, nhưng nên
  làm để khôi phục mật khẩu sau này).

### Quên mật khẩu
Màn hình đăng nhập → **Quên mật khẩu?** → nhập email → **Gửi liên kết**.
Nếu email đã đăng ký, bạn nhận được liên kết đặt lại trong vài phút
(kiểm tra cả mục thư rác). Nút gửi bị khóa 60 giây sau mỗi lần gửi.

### Xem hồ sơ / đổi avatar / đổi tên
Bấm **ảnh avatar ở góc trên** màn hình chính (cả tiếng Hàn và tiếng
Anh) → **Trung tâm tài khoản**:
- **Hồ sơ**: xem Level, XP, tiền vàng, kim cương, từ đã học, boss đã
  thắng, danh hiệu, chuỗi ngày học, lần đồng bộ gần nhất. Bấm **Sao
  chép** để copy Player ID.
- **Avatar**: chọn avatar đã mở khóa (thắng đủ boss sẽ mở thêm).
- **Tài khoản**: đổi tên hiển thị, gửi lại email xác minh, đăng xuất.
  Khách thì có nút **Liên kết tài khoản**.

### Chuyển thiết bị
Đăng nhập cùng tài khoản trên thiết bị khác → mở **Trung tâm tài khoản
→ Đồng bộ đám mây → Đồng bộ ngay**. Nếu thiết bị này chưa có gì thì
bản đám mây được tải về; nếu cả hai bên đều có tiến trình mới thì game
hỏi bạn chọn (dùng bản thiết bị / dùng bản đám mây / hợp nhất an toàn)
— không tự ghi đè, không cộng dồn XP.

### Đổi tài khoản trên cùng trình duyệt
Đăng xuất ở mục Tài khoản → đăng nhập tài khoản khác. Dữ liệu của tài
khoản cũ được cất an toàn trên thiết bị và trả lại khi bạn đăng nhập
lại tài khoản đó.

## Dữ liệu nào được lưu ở đâu

| Dữ liệu | Vị trí |
|---|---|
| Bản lưu đang chơi | `hanvocab.v1` (không đổi từ V6) |
| Bản lưu khách (khi không đăng nhập) | `hanvocab.v1.guest` |
| Bản lưu của tài khoản UID | `hanvocab.v1.acc.<uid>` |
| Phiên đang dùng (khách / tài khoản nào) | `hanvocab.v13.session` |
| Hồ sơ (tên hiển thị, avatar) | trong bản lưu, `S.v7.profile` — đồng bộ cùng bản lưu |
| Trạng thái đồng bộ | `hanvocab.v12.meta` (khách) hoặc `hanvocab.v12.meta.<uid>` (tài khoản) |
| Bản sao lưu trước chuyển đổi V11 | `hanvocab.v11-backup` (không đổi) |

Avatar là ảnh có sẵn trong game (theo ID), không phải ảnh người dùng
tải lên — V13 chưa có tính năng tải avatar lên.

## Giới hạn đã biết

- Đăng nhập Google/Email, email xác minh, đặt lại mật khẩu và đồng bộ
  với Firebase thật **chưa kiểm thử trực tiếp** — xem checklist trong
  FIREBASE_SETUP.md.
- Đăng nhập Google bằng popup cần domain GitHub Pages nằm trong
  Authorized Domains (đã hướng dẫn trong FIREBASE_SETUP.md); nếu popup
  bị chặn, dùng đăng nhập bằng chuyển trang.
- Player ID là mã hiển thị suy ra từ tài khoản (6 ký tự), không phải
  UID thật — dùng để người chơi tự nhận diện hồ sơ, không dùng để
  truy cập dữ liệu của người khác.
- Chế độ gõ Hangul bằng bàn phím và lọc câu hỏi boss theo trạng thái
  SRS vẫn chưa có (như đã ghi ở V11.1).
- Kiểm thử trình duyệt thật / GitHub Pages vẫn cần Anh làm sau khi
  deploy (như các bản trước).
