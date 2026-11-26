# V19.8 — KO SRS Review UI (Ôn SRS tiếng Hàn) — 19.8.0, layer V55

**Base:** V19.7 (19.7.0, layer V54) — main @ `7ad41466` sau khi PR #39 merge.
**Build:** `out/index.html` sha256 `e5e716e4a1d4352a989732915c2178902ddd115b411342690eb1334f57799445`, 2,653,286 B. Rebuild-from-scratch byte-identical.
**ZIP:** `Korean_English_Vocab_Farm_V19_8_KO_SRS.zip` — sha256 `e9d9d1a1df68e1e5358c2c0cd987cc0c47d34a40cde722c1cb4d33e96aa1ec13`, 79,515,839 B (75.83 MB), 908 files.
**Tính năng:** màn hình ôn SRS riêng cho tiếng Hàn — **hàng đợi từ đến hạn** (chỉ từ đã học, sắp theo hạn, giới hạn mỗi buổi 30/40/50 từ), **danh sách từ yếu**, **thống kê ôn tập** (đến hạn hôm nay, đã học, từ yếu, đã thuộc, đã ôn hôm nay, chuỗi ngày). Đây là mục #2 trong kế hoạch tiếng Hàn của Claude (2026-11-25 ~22:41): due queue + weak words + stats trước; Smart Learning daily plan làm ở phiên bản sau TOPIK.

## Dùng như thế nào (người chơi)

1. Mở app → tab **📅 Ôn SRS** trong thanh tab tiếng Hàn (cạnh tab Luyện tập).
2. Màn hình hiện 6 số thống kê: **Đến hạn** (số từ box 1–4 đã quá hạn), **Đã học**, **Từ yếu**, **Đã thuộc** (box 5), **Đã ôn hôm nay**, **Chuỗi ngày**.
3. Chọn **giới hạn mỗi buổi** (30 / 40 / 50 từ, mặc định 40) — chọn này được nhớ lại lần sau.
4. Bấm **Bắt đầu ôn (N từ)** — mở buổi ôn với đúng N từ đến hạn đầu tiên trong hàng đợi. Hết buổi hiện tổng kết (đúng/sai) và số đến hạn về 0 nếu ôn hết.
5. Bấm **Ôn từ yếu (N)** — mở buổi ôn chỉ các từ yếu (sai nhiều / box thấp). Ôn xong, từ yếu đúng sẽ rời khỏi danh sách.
6. Danh sách bên dưới hiện từng từ đến hạn (từ Hàn, nghĩa, box, ngày đến hạn) và từng từ yếu (số lần sai). Từ chưa có nghĩa hiện "Chưa có nghĩa" — không bịa.

## Luật hàng đợi (cứng — theo chỉ đạo của Claude)

- **Chỉ từ đã học:** hàng đợi chỉ lấy từ box ≥ 1. Từ mới nhập (box 0, kể cả từ nhập hàng loạt V19.7) **không** tràn vào hàng đợi — phải học qua chế độ thường trước (box lên 1 mới vào hàng đợi).
- **Đã thuộc thì nghỉ:** từ box 5 (đã thuộc) không vào hàng đợi SRS, dù quá hạn.
- **Thứ tự:** đến hạn sớm nhất trước; cùng hạn thì từ sai nhiều / quá hạn lâu hơn trước (quy tắc ưu tiên dùng chung với tiếng Anh).
- **Một hàm "đến hạn" dùng chung cho cả hai ngôn ngữ** (`isDue55` — box 1–4 và due ≤ now), để EN và KO không lệch nhau (bài học từ vụ lệch XP trước đây).
- **Chỉ đọc dữ liệu cũ:** lớp này không đổi cấu trúc hay ID cũ, không sửa box/due/số lần sai ngoài luồng ôn bình thường. Giới hạn buổi lưu ở khóa mới `S.v7.en55` (lazy — chỉ tạo khi dùng tính năng). Cloud Sync không bị ghi đè (save vẫn đi qua `save()` đã bọc của V20, đã kiểm tra round-trip).
- **Học bằng dữ liệu thật:** buổi ôn chạy bằng engine Smart Learning (v27) có sẵn — các dạng câu hỏi trắc nghiệm / nghe / lật thẻ, khoảng lặp [0, 10 phút, 1 ngày, 3 ngày, 7 ngày, 14 ngày], sai thì về box 0, đúng ở box ≥ 4 thì xoá số lần sai. Không tạo câu hỏi giả.
- **Cờ `koSrsUI`:** tắt → nút 📅 Ôn SRS biến mất khỏi tab tiếng Hàn, hàng đợi/thống kê từ chối trả dữ liệu. Bật lại bằng `window.__v55.setFlag('koSrsUI', true)`.

## Sửa kèm (bug tìm được trong lúc kiểm thử — đã sửa trong lớp V55)

- **Lỗi `V15()` không tồn tại (bug có từ V19.5.1, trong `speakKO` của v27):** v16 định nghĩa `function V15(){ return window.__v15||null; }` nhưng khối đó bọc trong IIFE nên `V15()` không phải global thật. Mọi nơi gọi đều bọc try/catch, trừ callback lỗi của `speakKO` — khi TTS thất bại (không có giọng đọc: Chrome headless, một số máy Android), toast "Không phát được âm thanh" không hiện mà còn ném lỗi uncaught. Lớp V55 tái xuất đúng hàm đó thành global (`window.V15 = ...`) — không sửa khối cũ nào, mọi đường gọi cũ giờ hoạt động như thiết kế ban đầu (toast hiện, không còn lỗi console).

## Những gì KHÔNG có trong V19.8

- **Không** có Smart Learning daily plan cho tiếng Hàn — đó là mục (b), làm ở phiên bản sau TOPIK (theo quyết định của Claude).
- **Không** có cloze/particle drill, dictation, hay TOPIK path — đó là các mục #3–#5, làm ở phiên bản sau.
- **Không** đổi khóa lưu cũ, không đổi ID cũ, không đổi cấu trúc save.

## Thay đổi kỹ thuật (tóm tắt)

- Thêm lớp V55 thuần cộng thêm (`src/v55.js`, `src/v55.css`; `S.v7.en55` lazy — chỉ tạo khi dùng tính năng; không đổi khóa lưu cũ, không đổi ID cũ, không sửa khối nhúng nào trước đó). `index.html` là file duy nhất thay đổi so với V19.7.
- API: `window.__v55` (`isDue55`, `dueFor55`, `dueQueue55`, `weakList55`, `koStats55`, `startReview55`, `startWeak55`, `setCap`, `flagOn`, `setFlag`, `en55`, `openSrs`, `closeSrs`).
- Nút 📅 Ôn SRS được chèn vào thanh tab tiếng Hàn bằng MutationObserver (theo mẫu V48/V54) — không đụng tới khối hub cũ.
- Overlay `#v55hub` (z-index 1500): thống kê, chọn giới hạn buổi, danh sách đến hạn / từ yếu, nút bắt đầu ôn.

## Kiểm thử (bằng chứng)

- `repro-v55.js`: **5/5 khuyết điểm tái hiện trên V19.7 nguyên bản, 0/5 trên bản V19.8** (đã sửa hết).
- `test55.js` (Node vm): **157 PASS / 0 FAIL / 6 SKIP, ×4 lần** trên bản build + **×1 trên ZIP đóng gói** (xem SMOKE_TEST). Gồm: quy tắc "đến hạn" dùng chung EN+KO, hàng đợi/giới hạn (kể cả tính xác định khi hoà điểm), từ yếu, thống kê, buổi ôn (thang khoảng lặp, sai về box 0, từ yếu ra khỏi danh sách), cờ/entry/overlay, hồi quy EN SRS + V51 + V52 + V53 + V54, save schema (chỉ đọc, round-trip).
- `verify-v55c.js`: **50/50 PASS, ×2** trên Chrome 157 thật, 0 lỗi console/cảnh báo/hộp thoại. Gồm: buổi ôn 7 từ bằng click thật (ghi đúng 7/7, hộp tăng đúng, số đến hạn về 0), buổi từ yếu 2 từ, giới hạn 30/40/50 (nhớ qua reload), cờ tắt/bật, 360px không tràn ngang, chữ Hangul render đúng, độ tương phản badge 10.02 / 11.50.
- Rebuild-from-scratch byte-identical. ZIP↔out byte-identity đã kiểm tra bởi `package_v55.py`.

## Chưa kiểm thử (thành thật)

- TTS Android thật (nghe–đọc lại trong buổi ôn KO): Chrome headless không có giọng đọc nên chỉ kiểm được đường lỗi (toast + không lỗi console). Cần Anh thử trên điện thoại thật.
- Firebase live (đăng nhập/đồng bộ) chưa kiểm thử — như mọi phiên bản.
