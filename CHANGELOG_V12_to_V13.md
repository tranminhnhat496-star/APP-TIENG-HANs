# CHANGELOG — V12 → V13 (Premium Login & Player Account System, 2026-11-17)

## Tóm tắt

V13 thêm hệ thống tài khoản người chơi (lớp V21) lên trên V12, tái sử
dụng hệ thống đồng bộ V12 thay vì xây hệ thống Firebase thứ hai. Khóa
lưu `hanvocab.v1` và toàn bộ dữ liệu không đổi; đăng nhập là tùy chọn,
chơi khách vẫn đầy đủ.

## Mới

### Màn hình chào mừng (Welcome Screen)
- Lớp phủ toàn màn hình khi mở game mà chưa có phiên đăng nhập hợp lệ
  và chưa chọn chế độ khách: logo (biển gỗ CSS), mascot gà con
  (`assets/mascot-chick.png`, vẽ riêng), nền nông trại bằng CSS (bầu
  trời, mặt trời, mây trôi, đồi, hoa, lá bay).
- 4 nút: Đăng nhập bằng Google, Đăng nhập bằng Email, Tạo tài khoản,
  Chơi với tư cách khách. Đã đăng nhập thì tự vào game; đã chọn khách
  thì lần sau vào thẳng (lựa chọn ghi trong `hanvocab.v13.session`).
- Khi chưa cấu hình Firebase thì hiện rõ "Chưa cấu hình Firebase" và
  hướng dẫn quản trị viên — không giả vờ đăng nhập được.

### Đăng nhập / Đăng ký / Quên mật khẩu (`v21.js`, dùng `__v20sync`)
- Form có nhãn, hiện/ẩn mật khẩu, ghi nhớ phiên (Firebase persistence:
  Local khi tick, Session khi không), trạng thái loading, chống gửi
  nhiều lần, lỗi dịch sang tiếng Việt (sai mật khẩu không tiết lộ là
  sai email hay sai mật khẩu).
- Đăng ký: tên hiển thị + email + mật khẩu + nhập lại + chọn avatar
  (chỉ avatar đã mở khóa mới chọn được). Sau khi tạo tài khoản: đặt
  tên hiển thị lên Auth profile, gửi email xác minh thật (không chặn
  việc chơi), lưu tên + avatar vào `S.v7.profile`.
- Quên mật khẩu: `sendPasswordResetEmail` thật, thông báo chung không
  tiết lộ email có tồn tại hay không, khóa nút gửi lại 60 giây.
- Không lưu mật khẩu dưới bất kỳ dạng nào trong localStorage (mật khẩu
  chỉ đi qua Firebase SDK).

### Đăng nhập Google + phương án dự phòng
- Popup trước; khi popup bị chặn / không hỗ trợ / bị đóng thì hiện nút
  "Đăng nhập bằng chuyển trang" (`signInWithRedirect`); khi quay lại,
  `getRedirectResult` nhận diện tài khoản (V21 gọi
  `completeRedirect()` lúc khởi động khi đã cấu hình).
- Lấy tên hiển thị từ Auth profile; avatar dùng ảnh có sẵn theo ID
  (không dùng `photoURL` vì avatar là tài sản của game).

### Hồ sơ người chơi — chỉ số thật, không số mẫu
- Level = `1 + floor(XP/100)` (đúng công thức `gain()` của game gốc),
  tiến trình trong cấp = XP % 100; tiền vàng = XP − XP đã tiêu
  (`coins()` của game); kim cương = `S.v7.gems`; chuỗi ngày học liên
  tiếp = `S.sk.n` (game tự tính trong `gain()`); từ Hàn đã học/thuộc =
  thẻ có `box>=1` / `box>=3`; từ Anh đã học/thuộc = từ trong pool học
  (4.409 từ đã gộp thư viện) có `box>=1` / `box>=3`; boss đã thắng =
  đếm thắng trên cả 3 hệ (10 boss cũ + 30 V10 + 30 V11 = 70); danh
  hiệu = các title đã nhận; lần đồng bộ gần nhất = meta V12.
- Player ID hiển thị: mã 6 ký tự suy ra từ UID (hash FNV → base36),
  không lộ UID thật; có nút sao chép.

### Hệ thống Avatar (10 avatar, ảnh vẽ riêng)
- `assets/avatars/*.png` (256×256): chick (Gà con chiến binh, miễn
  phí), fox (Cáo pháp sư, 3 boss), panda (Gấu trúc võ sĩ, 8), cat
  (Mèo kiếm sĩ, 15), rabbit (Thỏ phép thuật, 20), owl (Cú học giả,
  30), wolf (Sói băng, 40), dragon (Rồng con, 50), unicorn (Kỳ lân,
  60), phoenix (Phượng hoàng, 70 boss). Ảnh do công cụ tạo ảnh của
  Muse vẽ theo phong cách chibi fantasy, đã kiểm tra bằng mắt.
- Avatar khóa hiện ổ khóa + điều kiện mở; không chọn được khi chưa đủ
  boss. Lựa chọn lưu trong `S.v7.profile.avatarId` (đồng bộ cùng bản
  lưu) và ghi ngay bằng `saveNow()` (không chờ ghi dồn).
- Chưa có tải avatar lên (cần kiểm tra định dạng/kích thước/bảo mật —
  để bản sau).

### Tách dữ liệu theo UID (cơ chế chính của V13)
- Game luôn chơi trên ô lưu `hanvocab.v1`. Mỗi danh tính có một nhà
  riêng: khách → `hanvocab.v1.guest`, tài khoản → `hanvocab.v1.acc.<uid>`.
  Đổi danh tính = cất ô lưu hiện tại vào nhà của chủ cũ (ghi có kiểm
  tra đọc lại), rồi lấy ô lưu của danh tính mới ra (hoặc để trống để
  game tạo bản mới), ghi phiên `hanvocab.v13.session`, tải lại trang.
- "Chuyển tiến trình khách vào tài khoản" chỉ được phép khi danh tính
  trước là khách hoặc chưa có phiên (bản lưu V12 chưa gắn ai); chuyển
  từ tài khoản này sang tài khoản khác không bao giờ sao chép dữ liệu.
- Đăng xuất: cất dữ liệu tài khoản vào nhà của nó, trả lại bản lưu
  khách, rồi mới tải lại.
- Trạng thái đồng bộ tách theo từng tài khoản: `hanvocab.v12.meta`
  (khách) và `hanvocab.v12.meta.<uid>` (tài khoản) — sửa trong
  `v20_sync.js` (`metaKey()`), nên việc đổi tài khoản không bao giờ
  làm lệch hash/thời gian đồng bộ của tài khoản khác.

### Trung tâm tài khoản (Account Center)
- Nút avatar ở đầu trang tiếng Hàn (cạnh viên trạng thái lưu) và trong
  thanh ngôn ngữ của English Hub (bọc `__v15.openHub`, không sửa
  v15.js). Mở ra 6 mục: Hồ sơ, Avatar, Tài khoản, Đồng bộ đám mây
  (trạng thái + Đồng bộ ngay + bảng chọn xung đột riêng của V21),
  Sao lưu & Khôi phục (dùng lại `__v20.exportFile`/`importFile`),
  Cài đặt (giảm chuyển động — tôn trọng cả cài đặt hệ điều hành qua
  `prefers-reduced-motion` — + phiên bản + mở tab 💾 Dữ liệu).
- Mục Tài khoản: trạng thái đăng nhập, email, xác minh email + gửi
  lại, đổi tên hiển thị (đồng bộ lên Auth profile), liên kết tài khoản
  (khách), đăng xuất.

### Thay đổi trong `v20_sync.js` (13.0.0)
- `metaKey()`: meta đồng bộ theo danh tính đang dùng (xem trên).
- `signInGoogleRedirect()` + `checkRedirectResult()` /
  `completeRedirect()`: đăng nhập Google bằng chuyển trang.
- `sendPasswordReset()`, `sendVerification()`,
  `updateDisplayName()`, `setPersistence()`, `emailVerified()`,
  `currentUser()`: các thao tác tài khoản mà V21 cần, đều ủy quyền
  qua adapter (mock được trong kiểm thử).
- `SAVE_VERSION` giữ 12 (schema bản lưu không đổi); version module
  lên 13.0.0. `v20.js` không đổi (12.0.0). `v15.js`/`v19.js` chỉ đổi
  version 13.0.0.

## Sửa lỗi (phát hiện khi kiểm thử V13)

1. **"Chuyển tiến trình" bị hiểu nhầm thành "bắt đầu mới"**: khi phiên
   chưa từng được ghi (bản lưu V12 nâng cấp lên), `activateAccount`
   chỉ cho chuyển khi phiên trước là khách — phiên `null` bị rơi vào
   nhánh bắt đầu mới, xóa ô lưu thay vì chuyển. Sửa: phiên chưa có
   được tính là "chưa gắn ai" và được phép chuyển.
2. **Màn hình chào mừng thiếu ô thông báo lỗi**: khi sửa trùng ID
   `v21authmsg`, dòng `<div id="v21authmsg">` bị xóa nhầm nên lỗi đăng
   nhập Google (popup bị chặn) không hiện được. Sửa: thêm lại ô thông
   báo duy nhất.
3. **Đổi tên / đổi avatar chưa ghi ngay**: `saveProfile()` gọi `save()`
   vốn bị ghi dồn 0,8 giây, nên kiểm tra localStorage ngay sau khi đổi
   thấy dữ liệu cũ. Sửa: ghi qua `__v20.saveNow()` (ghi ngay, có kiểm
   tra).
4. **Thông báo "Đã lưu tên" bị xóa ngay**: handler đặt thông báo rồi
   mới vẽ lại nội dung tab, nội dung mới xóa mất thông báo. Sửa: vẽ
   lại trước, đặt thông báo sau.

## File thay đổi

| File | Thay đổi |
|---|---|
| `src/v21.js` → `v21.js` | Mới: welcome/login/register/forgot, hồ sơ, Account Center, avatar, tách dữ liệu theo UID, liên kết khách. Version `13.0.0`. |
| `src/v21.css` → `v21.css` | Mới: giao diện farm (nền CSS, biển gỗ, thẻ kem, nút xanh lá), responsive, giảm chuyển động. |
| `src/avatars/*.png` (10) → `assets/avatars/` | Mới: 10 avatar 256×256 (~620 KB). |
| `src/mascot-chick.png` → `assets/mascot-chick.png` | Mới: mascot chào mừng 512×682 (~529 KB). |
| `src/v20_sync.js` → `v20_sync.js` | Thêm metaKey theo tài khoản, redirect, reset/verify/updateProfile/persistence; version `13.0.0`. |
| `src/v15.js` → `v15.js` | Chỉ đổi version `12.0.0` → `13.0.0`. |
| `src/v19.js` → `v19.js` | Chỉ đổi version `12.0.0` → `13.0.0`. |
| `index.html` | Tiêu đề → V13; thêm lớp V21 (style + script). |
| `FIREBASE_SETUP.md` | Thêm mục V13: email xác minh, redirect, Authorized Domains cho popup + redirect, checklist đăng nhập. |
| `build_v13.py` / `package_v13.py` | Mới: build + đóng gói V13, kiểm tra lớp V21 + 10 avatar + mascot. |

## Không đổi

- Khóa lưu `hanvocab.v1`, schema bản lưu, toàn bộ tính năng V6–V12
  (học Hàn/Anh, Smart Import, thư viện, farm, boss V15/V10/V11, bản
  đồ, save manager, đồng bộ V12). Bộ kiểm thử V12 chạy lại trên bản
  V13: **108/108** (chỉ đổi 2 kỳ vọng về số phiên bản).
- Không có máy chủ riêng, không có service-account key trong frontend.

## Kiểm thử

- Bộ kiểm thử V13 mới (`/tmp/v11test/test21.js`, jsdom): **138/138**,
  chạy 2 lần đều đạt: welcome + khách, đăng nhập (sai email, sai mật
  khẩu, đúng mật khẩu, ghi nhớ phiên), liên kết khách (chuyển / bắt
  đầu mới), đăng ký (sai khớp mật khẩu, mật khẩu ngắn, tạo tài khoản +
  email xác minh + tên hiển thị + avatar), Google popup bị chặn →
  redirect, quên mật khẩu (không tiết lộ tài khoản tồn tại, khóa gửi
  lại), hồ sơ (chỉ số thật), avatar (khóa/mở khóa/chọn/lưu), đổi tên,
  tách dữ liệu A → khách → B → A (B không nhận dữ liệu của A, A lấy
  lại được 900 XP), meta đồng bộ theo từng tài khoản, mất mạng, hồi
  quy V12.
- **Đăng nhập với Firebase thật CHƯA được kiểm thử** — xem
  FIREBASE_SETUP.md (mục V13, checklist kiểm thử trực tiếp). Logic
  auth đã kiểm thử bằng mock adapter; vòng lặp thật (popup Google trên
  GitHub Pages, email xác minh, đặt lại mật khẩu, đọc/ghi Firestore
  với Rules thật) cần Anh chạy checklist sau khi cấu hình.
- Chưa kiểm thử trên trình duyệt thật / GitHub Pages (giới hạn môi
  trường như các bản trước).
