# CHANGELOG — V11.1 → V12 (Player Save & Cloud Sync, 2026-11-17)

## Tóm tắt

V12 thêm hệ thống lưu tiến trình chuyên nghiệp (lớp V20) mà không đổi
khóa lưu, không đổi dữ liệu, không xóa tính năng nào.

## Mới

### Tự động lưu có kiểm soát (`v20.js`)
- Mọi lần lưu trong game đều đi qua một điểm duy nhất (hàm `save()` của
  V6 — `save15`/`save7`/`save19` đều gọi nó) nay được bọc lại:
  **ghi dồn 0,8 giây** (5 lần lưu liên tiếp chỉ ghi 1 lần), **xác minh
  bằng cách đọc lại và so sánh toàn bộ nội dung** sau khi ghi (hàm
  `save()` gốc tự nuốt lỗi nên không thể tin vào "không báo lỗi" —
  phải so sánh dữ liệu đọc lại mới biết ghi có thành công không),
  **tự ghi khi ẩn tab / đóng trang** (`visibilitychange`,
  `beforeunload`).
- Trạng thái lưu luôn thấy được: viên trạng thái ở đầu trang tiếng Hàn
  ("● Đã lưu HH:MM" / "○ Đang lưu…" / "⚠ Lỗi lưu") + mục Quản lý dữ
  liệu. Ghi thất bại thì báo lỗi, không bao giờ hiện "đã lưu" giả.
- Nút **Lưu tiến trình ngay** (ghi ngay, không chờ ghi dồn).

### Chuyển đổi V11 → V12 (một lần, có kiểm tra, có quay lại)
- Giữ nguyên khóa `hanvocab.v1` và toàn bộ cấu trúc dữ liệu — **không
  cần chuyển đổi dữ liệu** vì schema không đổi. "Migration" ở đây là:
  sao lưu toàn bộ bytes V11 vào khóa `hanvocab.v11-backup` (chỉ ghi một
  lần, lần sau không ghi đè), kiểm tra + sửa nhẹ các trường thiếu mà
  không lớp nào tự tạo được (`decks`, `xp`), đóng dấu
  `S.v7.meta={saveVersion:12, migratedAt, prevVersion}`.
- Các khóa con `en/en15/en16/en17/en18/en19` **không** được tạo sẵn
  trong migration: mỗi lớp tự tạo khóa của mình với đúng hình dạng mặc
  định khi cần (`enOld()`/`en15()`/`en19()`...). Tạo sẵn `{}` rỗng sẽ
  phá cơ chế tự tạo đó (đối tượng rỗng là truthy nên `||` không thay
  thế) — lỗi này đã bị kiểm thử bắt được và sửa trước khi đóng gói.
- Nút **Khôi phục bản trước khi chuyển đổi** trong mục Dữ liệu (có kiểm
  tra cấu trúc trước khi khôi phục, bản hiện tại được sao lưu trước).

### Mục Quản lý dữ liệu (tab 💾 Dữ liệu)
- Tab "Sao lưu" trong English Hub đổi tên thành **💾 Dữ liệu**, nội dung
  cũ (xuất/khôi phục JSON, đặt lại tiến trình tiếng Anh) giữ nguyên,
  thêm panel V20 phía trên: trạng thái lưu, lần lưu gần nhất, kích
  thước bản lưu, thẻ chuyển đổi + khôi phục, thẻ đồng bộ đám mây.
- Mục Dữ liệu tiếng Hàn có thêm nút **"☁️ Quản lý dữ liệu & đồng bộ"**
  mở thẳng tab Dữ liệu (chèn bằng cách bọc `setView`/`render` kiểu V16,
  không sửa code V6).
- Khôi phục JSON nay đi qua `__v20.importFile`: kiểm tra JSON, kiểm tra
  cấu trúc sâu (thẻ phải có id/h/m, chặn khóa `__proto__`/
  `constructor`/`prototype`), giới hạn 10 MB, sao lưu bản hiện tại
  trước, hỏi xác nhận rồi mới ghi. Chỉ đọc dữ liệu, không thực thi gì
  từ file.

### Đồng bộ đám mây (`v20_sync.js` + Firebase)
- Engine đồng bộ local-first: trạng thái `off/guest/ready/syncing/
  synced/offline/conflict/cloud-newer/error`; so sánh bằng hash nội
  dung + thời gian đồng bộ lần trước; **không bao giờ tự ghi đè khi
  xung đột** — hiện bảng chọn (thiết bị / đám mây / hợp nhất an toàn)
  sau khi đã sao lưu cả hai bên.
- Hợp nhất an toàn (`mergeSaves`): XP/kim cương/đá nguyên tố lấy **mức
  cao nhất** (không cộng dồn), boss thắng hợp nhất theo từng boss và
  từng ngôn ngữ (thắng ở bên nào cũng tính, sao lấy mức cao nhất), thẻ
  từ/bộ từ hợp nhất theo ID (bản mới hơn thắng khi trùng), farm/cài đặt
  lấy theo bản mới hơn. Không sửa dữ liệu đầu vào.
- Offline: lưu cục bộ tiếp tục; khi có mạng lại, tự đồng bộ **chỉ tải
  lên** (không tự tải về/tải lại). Tải về chỉ xảy ra khi người chơi bấm
  Đồng bộ ngay.
- Đổi tài khoản được chặn: đăng nhập tài khoản khác thì lần đồng bộ đầu
  tiên **không** tự tải dữ liệu cục bộ lên tài khoản mới — phải xác nhận
  rõ ràng (tham số `force`).
- Đăng nhập Google (popup) + Email/mật khẩu (đăng nhập + tạo tài khoản),
  đăng xuất (dữ liệu cục bộ giữ nguyên, chơi tiếp với tư cách khách).
- Firebase SDK (compat 10.12.2) chỉ tải từ CDN khi đã có cấu hình và
  người chơi mở tính năng đồng bộ; chưa cấu hình thì không tải gì thêm,
  game chạy hoàn toàn offline.
- `firebase-config.js` riêng (không nhúng vào `index.html`) để Anh dán
  cấu hình project của mình; file đi kèm để trống. `firestore.rules`
  (chỉ chủ tài khoản được đọc/ghi document của mình, kiểm tra cấu trúc
  payload, còn lại cấm hết) + `FIREBASE_SETUP.md` (từng bước tạo
  project, bật Auth, Firestore, Rules, Authorized Domains, checklist
  kiểm thử trực tiếp, khắc phục sự cố).
- Giới hạn 900 KB cho bản lưu đám mây (Firestore tối đa 1 MB/document);
  quá giới hạn thì từ chối đồng bộ nhưng vẫn lưu cục bộ.

## Sửa lỗi (phát hiện khi kiểm thử V12)

1. **Migration tạo `S.v7.en={}` rỗng làm hỏng `enOld()`**: đối tượng rỗng
   là truthy nên `S.v7.en||{...đầy đủ...}` không thay thế, `old.box`
   thành `undefined` và `counts15()` crash khi mở Hub. Sửa: migration
   không tạo sẵn các khóa con của lớp khác nữa.
2. **Xác minh ghi quá yếu**: chỉ kiểm tra số lượng thẻ thì dữ liệu cũ
   có cùng hình dạng vẫn "đạt" dù ghi thất bại (hàm `save()` gốc tự
   nuốt lỗi). Sửa: so sánh toàn bộ chuỗi đọc lại với `JSON.stringify(S)`
   hiện tại.
3. **Ghi dồn kích hoạt ngay lần đầu**: `lastFlush=0` khiến điều kiện
   "quá 5 giây" luôn đúng ở lần lưu đầu tiên, phá debounce. Sửa: theo
   dõi `dirtySince` (lúc bắt đầu chờ) thay vì `lastFlush`.
4. **Dấu thời gian đồng bộ lệch 1ms gây xung đột giả**: payload đám mây
   và meta cục bộ dùng hai lần gọi `Date.now()` khác nhau. Sửa: một
   biến `now` duy nhất cho cả hai.
5. **`window.S` trong `v20.js`**: lại là biến lexical `let S`, không
   phải thuộc tính `window` (bài học V11.1) — sửa sang đọc trực tiếp `S`
   qua `getS()` ở 4 chỗ (migration, xác minh ghi, panel).

## File thay đổi

| File | Thay đổi |
|---|---|
| `src/v20.js` → `v20.js` | Mới: save manager, migration, panel, nút tiếng Hàn, viên trạng thái. Version `12.0.0`. |
| `src/v20_sync.js` → `v20_sync.js` | Mới: sync engine + Firebase adapter + merge + validate. Version `12.0.0`. |
| `src/v20.css` → `v20.css` | Mới: kiểu panel, thẻ trạng thái, bảng chọn xung đột, form đăng nhập. |
| `firebase-config.js` | Mới: cấu hình Firebase để trống (người dùng tự điền). |
| `firestore.rules` | Mới: Security Rules. |
| `FIREBASE_SETUP.md` | Mới: hướng dẫn cấu hình + checklist kiểm thử trực tiếp. |
| `src/v15.js` → `v15.js` | Tab "Sao lưu" → "💾 Dữ liệu"; `backupHTML()` thêm panel V20; version `11.1.0` → `12.0.0`. |
| `src/v19.js` → `v19.js` | Chỉ đổi version `11.1.0` → `12.0.0`. |
| `index.html` | Tiêu đề → V12; thêm lớp V20 (style + `firebase-config.js` + sync + js). |
| `build_v12.py` / `package_v12.py` | Mới: build + đóng gói V12, kiểm tra lớp V20. |

## Không đổi

- Khóa lưu `hanvocab.v1`, toàn bộ dữ liệu người chơi, mọi tính năng
  V6–V11.1 (học Hàn/Anh, Smart Import, thư viện, farm, boss V15/V10/
  V11, bản đồ).
- Không có máy chủ riêng, không có service-account key trong frontend.

## Kiểm thử

- Bộ kiểm thử V12 mới (`/tmp/v11test/test20.js`, jsdom): **108/108**,
  chạy 2 lần đều đạt, gồm: save manager (ghi dồn, xác minh, lỗi ghi,
  lưu khi ẩn/đóng trang), migration + rollback, panel + nút tiếng Hàn,
  kiểm tra import, sync engine với mock adapter (khách, tải lên, tải
  về, xung đột + hợp nhất, offline/mất mạng, đăng xuất, đổi tài khoản,
  giới hạn kích thước), hợp nhất (hàm thuần), hồi quy (đánh boss Hàn/
  Anh, bản đồ, Collection 70).
- **Đồng bộ với Firebase thật CHƯA được kiểm thử** — xem
  FIREBASE_SETUP.md Bước 6. Logic engine đã kiểm thử bằng mock adapter;
  vòng lặp thật (popup Google trên GitHub Pages, đọc/ghi Firestore với
  Rules thật) cần Anh chạy checklist sau khi cấu hình.
- Chưa kiểm thử trên trình duyệt thật / GitHub Pages (giới hạn môi
  trường như các bản trước).
