# HƯỚNG DẪN CẤU HÌNH FIREBASE — V12 CLOUD SYNC

Tài liệu này hướng dẫn Anh bật đồng bộ đám mây cho game. Đọc kỹ phần
**"Chưa kiểm thử trực tiếp"** ở cuối trước khi thông báo với người chơi
rằng đồng bộ đã hoạt động.

## Tổng quan

- Game chạy trên GitHub Pages (tĩnh, không có máy chủ riêng).
- Đồng bộ dùng **Firebase Authentication** (đăng nhập) + **Cloud
  Firestore** (lưu tiến trình, một document cho mỗi người chơi:
  `players/{uid}`).
- **Không cấu hình thì game vẫn chơi đầy đủ offline.** Mục Dữ liệu sẽ
  hiện "Chưa cấu hình Firebase" và mọi tính năng lưu cục bộ vẫn chạy.
- Firebase gói miễn phí (Spark) đủ dùng cho game này: Auth miễn phí,
  Firestore 1 GiB lưu trữ + 50.000 lượt đọc / 20.000 lượt ghi mỗi ngày.

## Bước 1 — Tạo project Firebase (10 phút)

1. Mở https://console.firebase.google.com , đăng nhập bằng tài khoản Google.
2. **Add project** → đặt tên, ví dụ `vocab-farm` → tắt Google Analytics
   (không cần) → **Create project**.
3. Trong project, bấm biểu tượng **Web `</>`** (Project settings → Your
   apps → Add app → Web) → đặt nickname, ví dụ `vocab-farm-web` →
   **Register app**. Trang hiện ra đoạn cấu hình `firebaseConfig` — giữ
   trang này mở, sẽ dùng ở Bước 5.

## Bước 2 — Bật phương thức đăng nhập

1. Vào **Build → Authentication → Get started**.
2. Tab **Sign-in method**:
   - Bật **Google** → chọn email hỗ trợ → Save.
   - Bật **Email/Password** → Save.
3. Tab **Settings → Authorized domains** → **Add domain** →
   nhập domain GitHub Pages của Anh, ví dụ `ten-cua-anh.github.io` →
   Add. (Bắt buộc, nếu không cửa sổ đăng nhập Google sẽ báo lỗi
   `auth/unauthorized-domain`. `localhost` đã có sẵn để test local.)

## Bước 3 — Tạo Firestore

1. Vào **Build → Firestore Database → Create database**.
2. Chọn **Start in production mode** → chọn vị trí gần nhất, ví dụ
   `asia-southeast1 (Singapore)` → Enable.
3. Vào tab **Rules** → xóa toàn bộ → dán nội dung file
   **`firestore.rules`** trong ZIP này → **Publish**.
4. Kiểm tra: Rules phải chặn đọc/ghi khi chưa đăng nhập (test bằng nút
   **Rules playground**: thử đọc `/players/abc` khi chưa xác thực →
   phải bị **Deny**).

## Bước 4 — Kiểm tra Rules (quan trọng)

- Người chơi chỉ đọc/ghi được document có ID đúng bằng UID của mình.
- Không có tài khoản → không đọc/ghi được gì.
- Ghi sai cấu trúc (thiếu `saveVersion`/`updatedAt`/`data`) → bị từ chối.

## Bước 5 — Dán cấu hình vào game

1. Trong repo **APP-TIENG-HANS**, mở file **`firebase-config.js`**.
2. Thay các chuỗi rỗng bằng cấu hình ở Bước 1:
   `apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId`, `appId`.
3. Commit + push. Đợi GitHub Pages deploy (1–2 phút).

> **Về `apiKey`:** đây là mã định danh client công khai của project
> Firebase (ai xem source cũng thấy được, Google thiết kế như vậy).
> Bảo mật thật nằm ở Authentication + Firestore Rules, không nằm ở key
> này. **Không bao giờ** dán service-account private key hay Admin SDK
> vào file này hay bất kỳ file frontend nào.

## Bước 6 — Kiểm thử trực tiếp (bắt buộc trước khi công bố)

Chạy từng mục trên GitHub Pages thật (không phải máy local):

- [ ] Mở game → mục **💾 Dữ liệu** → hiện "Đã cấu hình" (không còn
      "Chưa cấu hình Firebase").
- [ ] **Đăng nhập bằng Google** → cửa sổ popup mở, đăng nhập xong hiện
      email trong mục Dữ liệu.
- [ ] Bấm **Đồng bộ ngay** → trạng thái "Đã đồng bộ" (lần đầu: tải tiến
      trình hiện tại lên đám mây).
- [ ] Mở game trên **thiết bị thứ hai** (hoặc trình duyệt khác) → đăng
      nhập cùng tài khoản → bấm **Đồng bộ ngay** → chọn "Dùng bản trên
      đám mây" → tiến trình xuất hiện (thẻ Hàn, XP, boss, farm).
- [ ] Chơi trên thiết bị 2 (thắng 1 boss) → **Đồng bộ ngay** → về thiết
      bị 1 → **Đồng bộ ngay** → boss đó xuất hiện ở thiết bị 1.
- [ ] **Xung đột:** chơi khác nhau trên 2 thiết bị khi chưa đồng bộ →
      đồng bộ ở 1 bên → phải hiện bảng chọn (thiết bị / đám mây / hợp
      nhất), không tự ghi đè.
- [ ] **Mất mạng:** tắt wifi → chơi → trạng thái "mất mạng — lưu cục
      bộ" → bật wifi lại → tự đồng bộ (chỉ tải lên, không tự tải về).
- [ ] **Đăng xuất** → chơi tiếp với tư cách khách → tiến trình vẫn lưu
      trên thiết bị.
- [ ] **Tài khoản khác:** đăng nhập tài khoản B → game so sánh dữ liệu
      của B với dữ liệu cục bộ (của A) → không trộn lẫn.
- [ ] **Email:** tạo tài khoản bằng email + mật khẩu → đăng nhập lại
      bằng email đó.
- [ ] **Rules:** trong Firebase Console → Firestore → Usage: document
      `players/{uid}` xuất hiện, kích thước dưới 1 MB.

## Giới hạn đã biết — đọc trước khi công bố

- **Đồng bộ trực tiếp với Firebase thật chưa được kiểm thử từ môi
  trường phát triển** (không có project Firebase thật ở đó, không mở
  được popup đăng nhập Google). Code adapter Firebase đã viết đầy đủ;
  logic so sánh/xung đột/hợp nhất/mất mạng đã được kiểm thử bằng bộ
  giả lập trong `SMOKE_TEST_V12_2026-11-17.md`. **Anh phải chạy xong
  checklist Bước 6 thì mới nên nói đồng bộ đã hoạt động.**
- Giới hạn document Firestore là **1 MB**: bản lưu trên ~900 KB sẽ bị
  từ chối đồng bộ (game báo rõ), nhưng vẫn lưu cục bộ bình thường.
  Thư viện A1–A2/Oxford mặc định không nằm trong bản lưu nên không
  tính vào giới hạn này.
- Người chơi có thể tự sửa bản lưu của **chính mình** (bản chất của lưu
  phía client). Rules chỉ ngăn xem/sửa dữ liệu của **người khác**.
- **Chống gian lận:** nếu sau này thêm bảng xếp hạng hoặc phần thưởng
  cạnh tranh, cần Cloud Functions để xác minh điểm phía máy chủ (ví
  dụ: kiểm tra XP tăng tối đa mỗi ngày, kiểm tra boss thắng có kèm câu
  trả lời hợp lệ). V12 không có tính năng đó — đây là giới hạn có chủ
  đích của game tĩnh trên GitHub Pages.

## Khắc phục sự cố

| Lỗi | Nguyên nhân / cách sửa |
|---|---|
| `auth/unauthorized-domain` | Chưa thêm domain GitHub Pages vào Authorized domains (Bước 2). |
| `auth/operation-not-allowed` | Chưa bật Google hoặc Email/Password trong Sign-in method. |
| `Missing or insufficient permissions` | Rules chưa publish đúng (Bước 3), hoặc đang đọc document của UID khác. |
| Popup đăng nhập bị chặn | Trình duyệt chặn popup — cho phép popup cho domain game, thử lại. |
| Đồng bộ báo "bản lưu quá lớn" | Bản lưu > 900 KB — xuất JSON, xóa bớt thẻ/bộ từ ít dùng, đồng bộ lại. |
| Vẫn hiện "Chưa cấu hình" | `firebase-config.js` chưa có `apiKey`/`projectId`, hoặc trình duyệt đang cache file cũ — hard reload (Ctrl+Shift+R). |

---

# BỔ SUNG V13 — LOGIN & PLAYER ACCOUNT SYSTEM

V13 dùng đúng project Firebase đã cấu hình ở trên — không cần tạo
project mới, không đổi Rules (hồ sơ người chơi nằm trong bản lưu
`players/{uid}`, không có document riêng). Chỉ cần kiểm tra thêm các
mục dưới đây.

## V13.1 — Bật Email/Password và xác minh email (nếu chưa bật)

Bước 2 ở trên đã bật Google + Email/Password. Kiểm tra thêm:

1. Firebase Console → **Authentication → Sign-in method → Email/
   Password**: phải bật (Enabled).
2. **Authentication → Templates → Email address verification**: mẫu
   email xác minh mặc định của Firebase là đủ dùng. Nếu muốn đổi tên
   người gửi / nội dung, sửa ở đây (không cần đổi code game — game
   gọi `sendEmailVerification()` mặc định).
3. **Authentication → Templates → Password reset**: mẫu đặt lại mật
   khẩu mặc định là đủ dùng (game gọi `sendPasswordResetEmail()`).

## V13.2 — Authorized Domains cho cả popup và redirect

Đăng nhập Google bằng popup **và** bằng chuyển trang (redirect) đều
cần domain nằm trong danh sách cho phép:

1. Firebase Console → **Authentication → Settings → Authorized
   domains**.
2. Phải có: `localhost` (để kiểm thử ở máy) và domain GitHub Pages
   của Anh, ví dụ `ten-nguoi-dung.github.io`.
3. Nếu thiếu domain, đăng nhập Google báo `auth/unauthorized-domain`
   — thêm domain rồi thử lại (không cần deploy lại game).

## V13.3 — Checklist kiểm thử trực tiếp V13 (bắt buộc)

Chạy trên GitHub Pages thật, với project Firebase đã cấu hình:

| # | Kiểm tra | Đạt khi |
|---|---|---|
| 1 | Mở game lần đầu | Hiện màn hình chào mừng, đủ 4 nút, mascot và nền nông trại hiển thị đẹp trên điện thoại |
| 2 | Chơi khách | Bấm "Chơi với tư cách khách" → vào game; tải lại trang → vào thẳng, không hỏi lại |
| 3 | Tạo tài khoản email | Nhập tên + email + mật khẩu → tạo được tài khoản; nhận được email xác minh thật trong hộp thư |
| 4 | Đăng nhập email | Đăng xuất → đăng nhập lại bằng email/mật khẩu → vào đúng tài khoản, tiến trình còn nguyên |
| 5 | Đăng nhập Google (popup) | Bấm "Đăng nhập bằng Google" → popup mở → chọn tài khoản → vào game, tên hiển thị đúng |
| 6 | Đăng nhập Google (redirect) | Chặn popup trong trình duyệt → bấm "Đăng nhập bằng chuyển trang" → sau khi quay lại, tài khoản được nhận diện |
| 7 | Quên mật khẩu | Nhập email → nhận được email đặt lại mật khẩu thật; bấm liên kết → đặt được mật khẩu mới → đăng nhập được |
| 8 | Hồ sơ | Level, XP, tiền vàng, kim cương, từ đã học, boss đã thắng, danh hiệu, chuỗi ngày học khớp với tiến trình thật |
| 9 | Avatar | Chọn avatar đã mở khóa → tải lại trang → avatar còn; avatar chưa đủ boss thắng thì không chọn được |
| 10 | Đổi tên | Đổi tên hiển thị → tải lại trang → tên còn; đăng nhập lại → tên vẫn là tên mới |
| 11 | Khách → liên kết tài khoản | Chơi khách có tiến trình → liên kết tài khoản → chọn "Chuyển tiến trình" → tiến trình khách có trong tài khoản; chọn "Bắt đầu mới" → tài khoản bắt đầu mới, tiến trình khách vẫn còn khi đăng xuất |
| 12 | Hai tài khoản, cùng trình duyệt | A đăng nhập, chơi, đăng xuất → B đăng nhập → B không thấy dữ liệu của A; A đăng nhập lại → dữ liệu của A còn nguyên |
| 13 | Hai thiết bị | Đăng nhập trên thiết bị 2 → Đồng bộ ngay → tiến trình từ thiết bị 1 về đúng |
| 14 | Mất mạng | Tắt mạng → đăng nhập báo mất mạng (không tạo phiên giả); chơi khách vẫn được; bật mạng lại → đăng nhập được |
| 15 | Truy cập UID khác | (Nâng cao) Thử đọc document `players/<uid-của-người-khác>` bằng Rules Playground → phải bị từ chối |

Chỉ sau khi checklist trên đạt hết mới nên nói với người chơi rằng
đăng nhập và đồng bộ đã hoạt động.

## V13.4 — Khắc phục sự cố thêm cho V13

| Lỗi | Nguyên nhân / cách sửa |
|---|---|
| Vẫn hiện màn hình chào mừng dù đã đăng nhập | Trình duyệt chặn cookie/localStorage của bên thứ ba, hoặc Firebase SDK chưa tải xong — chờ vài giây, tải lại trang. |
| `auth/popup-closed-by-user` | Người chơi đóng popup trước khi xong — bấm lại, hoặc dùng "Đăng nhập bằng chuyển trang". |
| Không nhận được email xác minh / đặt lại mật khẩu | Kiểm tra mục thư rác; kiểm tra mẫu email trong Authentication → Templates; kiểm tra email đăng ký có đúng không. |
| Avatar không hiện | Kiểm tra `assets/avatars/` đã được copy lên repo chưa (10 file PNG) và `assets/mascot-chick.png`. |
| Đăng nhập xong nhưng tiến trình cũ biến mất | Tiến trình cũ vẫn nằm trong nhà khách (`hanvocab.v1.guest`) hoặc nhà tài khoản (`hanvocab.v1.acc.<uid>`) trên thiết bị — đăng xuất rồi đăng nhập lại đúng tài khoản để lấy về; xem README_V13 để biết vị trí các khóa. |
