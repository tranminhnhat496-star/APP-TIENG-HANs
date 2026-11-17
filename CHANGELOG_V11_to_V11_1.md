# CHANGELOG — V11 → V11.1 (Korean Boss Map Fix, 2026-11-17)

## Tóm tắt

V11.1 đưa Bản Đồ Boss Adventure vào Korean Hub và sửa một lỗi lớn: trận
boss tiếng Hàn ở V10/V11 chưa bao giờ thực sự hỏi tiếng Hàn.

## Mới

- **Nút 🗺️ Bản Đồ Boss trong thanh điều hướng tiếng Hàn** (`#tabs`, V6):
  nút cuối cùng của thanh tab, dùng chung class `.tab` (nhìn như tab gốc)
  + class `.v19kotab` (viền vàng nhạt). Bấm mở thẳng bản đồ, không qua
  English Hub. Nút nằm trong chuỗi HTML của tab nên sống sót qua mọi lần
  `render()` vẽ lại thanh tab.
- **`__v19.openMapFor(language)`** — điểm vào dùng chung cho cả hai Hub:
  đặt ngôn ngữ chiến đấu (`en`/`ko`), ghi nhớ Hub xuất phát
  (`__v19.mapOrigin()`), rồi mở bản đồ. Ngôn ngữ không hợp lệ thì bỏ qua,
  không đổi gì, không crash. Không đụng tới lựa chọn ngôn ngữ học chính
  (`__v15.setLang`).
- **Tiêu đề bản đồ theo ngôn ngữ**: tiếng Hàn → "🗺️ 보스 모험 지도 –
  Bản Đồ Boss Tiếng Hàn"; tiếng Anh → "🗺️ Legendary Boss Adventure Map".
- **Bộ câu hỏi tiếng Hàn theo bộ từ đã chọn**: nếu người chơi đang chọn
  một bộ từ tiếng Hàn (`S.deck`) có ≥ 8 thẻ, câu hỏi chỉ lấy từ bộ đó;
  bộ nhỏ hơn → dùng tất cả thẻ. (Trước đây: luôn dùng tất cả thẻ.)

## Sửa lỗi

1. **Trận boss tiếng Hàn luôn hỏi tiếng Anh (V10 + V11)** — `koPool()` và
   `distractorsKO()` trong `v18.js` và `v19.js` đọc `window.S`, nhưng V6
   khai báo `let S` (biến toàn cục lexical, không phải thuộc tính
   `window`), nên `window.S` là `undefined` và bộ câu hỏi tiếng Hàn luôn
   rỗng. Mọi trận tiếng Hàn đều rơi về câu hỏi tiếng Anh, kèm banner sai
   "Bạn mới có 0/8 thẻ". Sửa: đọc trực tiếp `S` trong `try/catch`
   (giống `en19()`). Áp dụng cho cả đấu trường V10 (V18) lẫn bản đồ V11
   (V19). Bộ kiểm thử V11.1 nay khẳng định câu hỏi tiếng Hàn phải chứa
   Hangul thật và không có từ tiếng Anh.
2. **`__v19.openMap()` không mở được Hub khi Hub đang đóng** — nó gọi
   `__v15.tab('map')` (`setTab`), mà `renderHub()` thoát ngay khi
   `#v15hub` chưa tồn tại. Từ Korean Hub (Hub chưa mở) bấm nút sẽ chỉ
   đổi ngôn ngữ rồi… không có gì xảy ra. Sửa: `openMap()` gọi
   `__v15.openHub('map')`, hàm này tự tạo Hub nếu chưa có. Lối vào từ
   Collection (`__v18.challenge`) cũng được hưởng lợi.

## File thay đổi

| File | Thay đổi |
|---|---|
| `src/v19.js` → `v19.js` | Thêm `openMapFor`/`mapOrigin`; `openMap` dùng `openHub`; tiêu đề bản đồ theo ngôn ngữ; `koCardsRaw` (bộ theo deck + sửa `window.S` → `S`); export `openMapFor`/`mapOrigin`/`koCardsRaw`/`koCount` trong `_test`; version `11.0.0` → `11.1.0`. |
| `src/v18.js` → `v18.js` | Sửa `koPool`/`distractorsKO` (`window.S` → `S`); version `10.0.0` → `10.0.1`. |
| `src/v15.js` → `v15.js` | Chỉ đổi version `11.0.0` → `11.1.0`. |
| `src/v19.css` → `v19.css` | Thêm `.tab.v19kotab` (vàng nhạt, icon 🗺️). |
| `index.html` | Tiêu đề → V11.1; **một dòng duy nhất** trong script V6 (dòng render `#tabs`): thêm nút Bản Đồ Boss sau các tab. Không sửa gì khác trong code V6. |
| `build_v11_1.py` | Script build mới (từ `build_v11.py`): áp dụng dòng tab trên khi build, kiểm tra `openMapFor` + version `11.1.0`. |
| `package_v11_1.py` | Script đóng gói ZIP V11.1 + kiểm tra `openMapFor`/`v19kotab`/tiêu đề V11.1 trong ZIP. |

## Không đổi

- Dữ liệu: khóa `hanvocab.v1` giữ nguyên; `S.v7.en19` giữ nguyên cấu
  trúc. Save V11 mở bằng V11.1 bình thường.
- Không thêm/xóa boss, không đổi ID, không đổi luật thưởng, không đổi
  cơ chế học tiếng Hàn cũ.
- V19 data (10 vùng, 30 boss) không đổi.

## Kiểm thử

- Bộ kiểm thử V11.1 mới (`/tmp/v11test/test19_1.js`, jsdom): **98/98**,
  chạy 2 lần đều đạt. Bao gồm: nút tab tiếng Hàn, mở bản đồ từ cả hai
  Hub, câu hỏi tiếng Hàn thật (Hangul, không rò tiếng Anh), kỹ năng boss
  trong trận tiếng Hàn, thắng/thưởng/mở khóa tiếng Hàn, phản công kiến
  thức bằng tiếng Hàn, độc lập EN/KO, bộ câu hỏi theo deck, điều hướng/
  đóng Hub, boss Hàn cũ, boss V15 cũ, đấu trường V10 bằng tiếng Hàn,
  Collection 70 boss, lưu/tải lại.
- 3 lỗi phát hiện trong quá trình kiểm thử, 2 lỗi thật của game
  (`openMap` khi Hub đóng; `window.S`) + 1 lỗi logic của test (xem
  SMOKE_TEST_V11_1_2026-11-17.md).
- Chưa kiểm thử trên trình duyệt thật / GitHub Pages (giới hạn môi trường
  như các bản trước) — Anh kiểm tra giúp sau khi deploy.
