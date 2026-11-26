# Changelog — V19.7 → V19.8 (KO SRS Review UI, layer V55)

**Ngày:** 2026-11-26. **Base:** V19.7 (main @ `7ad41466`, PR #39 đang mở — push V19.8 chờ PR #39 merge).
**Build:** `out/index.html` sha256 `e5e716e4a1d4352a989732915c2178902ddd115b411342690eb1334f57799445`, 2,653,286 B (V19.7: `aa6333d0…`, 2,627,515 B).

## Thêm mới

- **KO SRS Review UI (cờ `koSrsUI`)** — màn hình ôn SRS riêng cho tiếng Hàn, mục #2 trong kế hoạch tiếng Hàn của Claude (2026-11-25 ~22:41):
  - **Hàng đợi từ đến hạn:** chỉ từ đã học (box ≥ 1) và due ≤ now, sắp theo due tăng dần + ưu tiên (sai nhiều / quá hạn lâu trước). Từ box 0 (mới nhập) không vào hàng đợi; từ box 5 (đã thuộc) không vào hàng đợi.
  - **Giới hạn mỗi buổi:** 30 / 40 / 50 từ, mặc định 40, chọn trong UI và được nhớ lại (lưu ở `S.v7.en55.cap`); quá giới hạn thì báo "Còn N từ".
  - **Từ yếu:** danh sách từ sai nhiều / box thấp (cùng định nghĩa `pest` của V6: w ≥ 3 và box < 4), nút **Ôn từ yếu** mở buổi riêng.
  - **Thống kê ôn tập:** đến hạn, đã học, từ yếu, đã thuộc (box 5), đã ôn hôm nay, chuỗi ngày (lấy từ `en27()` KO).
  - **Một hàm "đến hạn" dùng chung** cho EN + KO (`isDue55`: box 1–4 và due ≤ now) — hai ngôn ngữ không lệch nhau được.
  - **Buổi ôn chạy bằng engine v27 có sẵn** (`openSmart('ko')` / `startSession('ko', ids, 'srs')` / `startWeak('ko')`): trắc nghiệm / nghe / lật thẻ, khoảng lặp [0, 10 phút, 1 ngày, 3 ngày, 7 ngày, 14 ngày], sai về box 0, đúng ở box ≥ 4 xoá số lần sai.
  - **Entry:** nút **📅 Ôn SRS** trong thanh tab tiếng Hàn (MutationObserver decorator, theo mẫu V48/V54); overlay `#v55hub` (z-index 1500).
  - Từ thiếu nghĩa hiện "Chưa có nghĩa", không bịa. Chữ Hangul render đúng (đã kiểm tra 360px + `document.fonts.check`).

## Sửa (bug tìm được trong lúc kiểm thử — đã sửa trong lớp V55)

- **`V15()` không phải global (bug có từ V19.5.1):** v16 định nghĩa `V15()` trong khối IIFE nên bare `V15()` không tồn tại ở trang thật; callback lỗi của `speakKO` (v27) gọi nó không bọc try/catch → khi TTS thất bại (không có giọng), toast không hiện và lỗi uncaught ném ra console. V55 tái xuất đúng hàm v16 thành `window.V15` (1 dòng trong lớp mới, không sửa khối cũ). Sau sửa: Chrome gate 50/50, 0 lỗi console — toast lỗi TTS hiện đúng như thiết kế.

## Không đổi

- Không sửa khối nhúng nào trước đó (V48/V51/V52/V53/V54 nguyên vẹn; EN SRS, V51 Forge, V52 TTS, V53 KO pool, V54 import hồi quy đủ). `index.html` là file duy nhất thay đổi so với V19.7; thêm `v55.js`, `v55.css`, `build_v55.py`, `package_v55.py`, 3 doc, `tools/v55/*`.
- Không đổi khóa lưu cũ, không đổi ID cũ, không đổi cấu trúc save (chỉ thêm `S.v7.en55` lazy + không khóa localStorage mới). Từ nhập vào vẫn bắt đầu ở box 0.
- Cloud Sync không bị ghi đè: save vẫn qua `save()` đã bọc của V20 (debounce + xác minh đọc lại), đã kiểm tra round-trip.

## Kiểm thử

- `test55.js`: **157 PASS / 0 FAIL / 6 SKIP, ×4** trên bản build (×1 trên ZIP đóng gói — xem SMOKE_TEST).
- `verify-v55c.js`: **50/50 PASS, ×2** trên Chrome 157 thật, 0 lỗi console/cảnh báo/hộp thoại.
- `repro-v55.js`: **5/5 trên V19.7 nguyên bản → 0/5 trên V19.8**.
- Rebuild-from-scratch byte-identical. ZIP↔out byte-identity đã kiểm tra.

## Chưa làm (để phiên bản sau, theo quyết định của Claude 2026-11-25)

- KO Smart Learning daily plan (mục (b)) → sau TOPIK. #3 cloze/particle drill → #4 dictation → #5 TOPIK I path.
- TTS Android thật và Firebase live vẫn chưa kiểm thử (như mọi phiên bản).
