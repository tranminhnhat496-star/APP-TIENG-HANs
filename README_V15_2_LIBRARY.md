# V15.2 — Vocabulary Library UI/UX Redesign (Thư viện từ vựng)

**Phiên bản:** 15.2.0 · **Ngày:** 2026-11-17 · **Lớp mới:** V25 (`src/v25.css` + `src/v25.js`)
**ZIP:** `Korean_English_Vocab_Farm_V15_Library_UI_Upgrade.zip`

## Mục tiêu

Làm cho toàn bộ **Thư viện từ vựng** dễ nhìn, rõ chữ, bố cục gọn gàng, màu sắc đẹp
và đồng bộ với phong cách game — ưu tiên khả năng đọc và sử dụng thực tế, không
chỉ thêm hiệu ứng trang trí. Phạm vi: Thư viện A1–A2, Oxford 3000, Basic Tactics
24 Units, My Vocabulary, danh sách chủ đề/bài học, danh sách từ, flashcards,
màn hình chi tiết từ, ô tìm kiếm/bộ lọc và các popup liên quan.

## Cách làm — lớp cộng thêm V25 (giống V24)

- **Không sửa bất kỳ file cũ nào.** V25 là lớp mới nạp **CUỐI CÙNG** (sau V24),
  chỉ ghi đè CSS và trang trí DOM (decorator), không đổi logic học tập, không
  đổi dữ liệu, không đổi khóa localStorage, không migration.
- **Không nút giả, không chức năng giả.** Mọi nút vẫn là nút thật của V6–V15;
  V25 chỉ đổi màu/chữ/kích thước và thêm nhãn trạng thái, thanh tiến trình.
- Build: `python3 build_v15lib.py` (idempotent — chạy lại sẽ gỡ lớp V25 cũ rồi
  inject lại). Đóng gói: `python3 package_v15lib.py`.

## Design tokens `--lib-*` (theo bảng màu của Anh)

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--lib-frame` | #FFF9EF | Nền khung sáng (nhóm bộ từ) |
| `--lib-panel` | #292044 | Nền khung tối (dải tiêu đề nhóm) |
| `--lib-panel2` | #372B58 | Nền khung phụ tối |
| `--lib-ink` | #29243A | Chữ chính trên nền sáng |
| `--lib-mute` | #51485D | Chữ phụ trên nền sáng |
| `--lib-line` | #B99AF7 | Viền tím |
| `--lib-gold-line` | #F5C86A | Viền vàng |
| `--lib-green` | #247A46 | Nút Học ngay (chữ trắng ≈ 5.5:1) |
| `--lib-purple` | #6845A8 | Nút Ôn tập (chữ trắng ≈ 6.5:1) |
| `--lib-purple-ink` | #4A2E8A | Chữ tím đậm trên nền sáng |
| `--lib-warn` | #B45309 | Cảnh báo / "Chưa có dữ liệu" |
| `--lib-gold` | #FFD76A | Tiêu đề trên nền tối |
| `--lib-danger` | #C1121F | Nút nguy hiểm (chữ trắng 5.9:1) |
| `--lib-gold-bg` / `--lib-gold-ink` | #F5C86A / #3A2500 | Nút yêu thích đang bật |

Quy tắc của Anh được giữ: không chữ trắng trên nền vàng, không chữ tím tối trên
nền tím tối, không chữ vàng nhạt trên nền trắng, không chữ xám quá nhạt cho nội
dung quan trọng, không opacity thấp làm mờ chữ. **WCAG AA tối thiểu 4.5:1
(chữ thường) / 3:1 (chữ lớn).**

## Thay đổi theo khu vực

### 1. Thẻ bộ từ (set cards)
- Mỗi nhóm (`.v17group`) thành khung sáng #FFF9EF, bo góc 18px, viền tím
  #B99AF7, bóng đổ vừa phải; các thẻ con không còn dính sát nhau.
- Tiêu đề nhóm thành **dải tối** #292044: tên bộ từ vàng #FFD76A 20px (19px ở
  ≤640px, trong khoảng spec 18–22px), mô tả #E5DEF5; viền dưới vàng.
- Tiêu đề Thư viện 24px ở mọi kích thước (spec 24–28px).
- Thẻ bộ từ (`.v17card`) nền trắng, viền #D9C8F5, bo góc 16px; tên thẻ 17px,
  tự xuống dòng (trước đây "23 / từ" bị tách dòng); thanh tiến trình cao 12px,
  nền #EDE6F8.
- Icon bộ từ: 📖 thêm vào A1–A2, 📕 thêm vào Oxford (BT 🎧 và My Vocab 📁 đã
  có sẵn trong tên).

### 2. Tiến trình nhóm (mới, số liệu thật)
- Dưới mỗi dải tiêu đề nhóm, V25 chèn dòng tiến trình thật:
  **đã học · đã thuộc · cần ôn** + thanh tiến trình (mẫu số đúng theo tiêu đề
  nhóm: A1–A2 = 1000, Oxford = 3396, BT = 819).
- BT hiển thị "Đang tải dữ liệu…" cho tới khi `__v22.data` tải xong.
- **Nhóm My Vocabulary KHÔNG có thanh tiến trình** — không tồn tại tổng số
  "hoàn thành" cho từ cá nhân (bỏ qua một cách có chủ đích, không bịa số).

### 3. Hàng từ vựng
- Từ tiếng Anh 19px (spec 18–22px), nghĩa tiếng Việt 16px (15–17px),
  IPA 15px (15–16px), nội dung phụ 13px.
- Loại từ (POS) thành **pill**: nền #EDE6F8, chữ tím đậm #4A2E8A; span POS
  rỗng được ẩn (không còn khoảng trống lạ).
- "Chưa có dữ liệu" (thiếu IPA/POS) màu #B45309 thay vì xanh lá nhạt 3.3:1;
  "Đã nhận thưởng" màu #166534 thay vì #2E9B52 3.3:1.

### 4. Nhãn trạng thái ghi nhớ (mới, không chỉ dùng màu)
Mỗi hàng từ có badge trạng thái, tính từ hộp SRS + lịch ôn thật
(`enOld().box[id]`, `en15().due[id]`), có biểu tượng **và** chữ:

| Trạng thái | Nhãn | Màu |
|---|---|---|
| Chưa học | ○ Chưa học | #475569 trên #F1F5F9 |
| Đang học | ◐ Đang học | #92400E trên #FEF3C7 |
| Đã thuộc | ✓ Đã thuộc | #166534 trên #DCFCE7 |
| Cần ôn tập | ↻ Cần ôn | #9A3412 trên #FFEDD5 |

Badge 13px đậm, có viền, đạt WCAG AA. Cập nhật tự động khi hộp SRS đổi
(MutationObserver 2 tầng, giống cơ chế cuộn trận đấu của V24).

### 5. Nút bấm (chuẩn hóa theo spec)
- **Học ngay:** nền xanh đậm #247A46, chữ trắng.
- **Ôn tập / Ôn từ yếu:** nền tím đậm #6845A8, chữ trắng.
- **Xem từ / Xem tất cả từ / Xem bài:** nền sáng #FFF9EF, chữ tím đậm #4A2E8A.
- **Yêu thích đang bật (`.btn.on`):** nền vàng #F5C86A, chữ #3A2500 — trước
  đây trạng thái yêu thích chỉ đổi glyph ☆→★, không có màu nền phân biệt.
- **Chưa nhớ / Xóa (`.btn.bad` trong Thư viện):** nền đỏ đậm #C1121F, chữ
  trắng (sửa 2 lỗi tương phản 3.99:1 của baseline).
- **← Thư viện:** pill tím, cao 44px, vị trí thống nhất.
- Tất cả nút trong Thư viện 15px, chiều cao tối thiểu 44px trên điện thoại.

### 6. Basic Tactics 24 Units
- Badge loại mục từ: **Từ đơn** #166534 trên #DCFCE7, **Cụm từ** #1E3A8A trên
  #E0E7FF, 13px đậm (sửa lỗi 4.42:1 ở 11px của baseline).
- Tab Words | Phrases & Collocations 15px / cao 48px.
- `.v22stars` màu #B45309 (đọc rõ trên nền sáng); `.v22bscope` thành khung
  sáng có viền tím.
- Tên Unit dài tự xuống dòng (đã có sẵn, giữ nguyên).

### 7. Flashcards
- Mặt trước nền #FFF9EF, mặt sau nền #EDE6F8, viền tím #B99AF7, bo góc 18px;
  từ tiếng Anh lớn ở giữa, IPA đọc rõ, ví dụ (nếu có) hiển thị đầy đủ.
- Nút **Đã nhớ** xanh #247A46, **Chưa nhớ** đỏ #C1121F; trạng thái ghi nhớ
  không mất khi chuyển thẻ (logic `fcRate`/`mark15` giữ nguyên).
- Tắt hiệu ứng lật khi hệ thống bật `prefers-reduced-motion`.

### 8. Tìm kiếm và bộ lọc
- Ô nhập: nền trắng, chữ tối, viền tím #B99AF7, cao 48px, có **icon kính lúp**,
  `type="search"` (nút xóa nội dung gốc của trình duyệt).
- Select lọc 15px / cao 48px; trên điện thoại ô tìm kiếm chiếm trọn một hàng.
- Trạng thái trống: lesson view (trước đây chỉ hiện "Hiện 0/0 từ") nay có
  thông báo rõ "Không tìm thấy từ nào khớp với tìm kiếm hoặc bộ lọc của bạn.
  Hãy thử từ khóa khác."; các thông báo "Không tìm thấy…" sẵn có (tìm kiếm
  Oxford, BT unit) được tạo kiểu thành thẻ đứt nét, dễ thấy.
- Bộ lọc **giữ nguyên** khi chuyển màn hình (theo thiết kế sẵn có của ứng
  dụng — chỉ `goHome()` mới đặt lại), không thay đổi.

### 9. Tab Từ vựng (My Vocabulary) và popup
- Hàng từ cá nhân restyle giống hàng từ Thư viện (EN 18px, VI 16px, phụ 13px).
- Form thêm từ: input/select 15px / cao 44px.
- Toast `.v7toast` 15px, tối đa 90vw, căn giữa — không bị cắt ở mép.

### 10. Responsive
Kiểm tra 360 / 430 / 768 / 1280px (thư viện + BT unit): **0 tràn ngang** ở mọi
kích thước. Popup tối đa 94vw (kế thừa V24). Danh sách dài cuộn mượt.

## Trước / sau (kiểm tra tương phản, Chrome thật, 390px)

| Màn hình | Trước (V15.1) | Sau (V15.2) |
|---|---|---|
| Thư viện | 0 vi phạm, 0 chữ <12px | 0 vi phạm, 0 chữ <12px |
| Chủ đề (topic) | 0 vi phạm, 0 chữ <12px | 0 vi phạm, 0 chữ <12px |
| Bài học (lesson) | 0 vi phạm, 0 chữ <12px | 0 vi phạm, 0 chữ <12px |
| BT Unit | **1 vi phạm** (badge "Từ đơn" 4.42:1, 11px) | **0 vi phạm, 0 chữ <12px** |
| Listening Quest | 0 vi phạm, 0 chữ <12px | 0 vi phạm, 0 chữ <12px |
| Flashcard | **1 vi phạm** ("Chưa nhớ" 3.99:1) | **0 vi phạm, 0 chữ <12px** |
| Từ vựng (My Vocab) | **1 vi phạm** ("Xóa" 3.99:1) | **0 vi phạm, 0 chữ <12px** |

**Tổng: 3 vi phạm tương phản + 1 chữ nhỏ → 0 vi phạm + 0 chữ nhỏ trên cả 7
màn hình, 0 tràn ngang.** Ảnh trước/sau: `tools/v15lib/shots-before/` và
`tools/v15lib/shots-after/` (chỉ có trong workspace, không đóng vào ZIP).

Hai lỗi tương phản khác phát hiện bằng **đọc code** (không xuất hiện trong
audit vì trạng thái chưa được kích hoạt khi chụp): `.v17claimed` ("Đã nhận
thưởng") 3.3:1 → #166534; xem chi tiết trong CHANGELOG.

## Kiểm thử (xem SMOKE_TEST_V15_2_2026-11-17.md)

- **test25.js: 103/103 checks** trên Chrome thật (390px), chạy 1 lần sau khi
  sửa xong (các lần chạy trước: 92/103 → 99/103 → 102/103; 9 lỗi đầu đều là
  lỗi test hoặc 1 lỗi CSS về cỡ tiêu đề, không có lỗi ứng dụng).
- §1 audit tương phản 7 màn hình: 0 vi phạm. §2 giá trị tính toán + decorator.
  §3 kiểm tra chức năng theo 14 mục của spec §12 (mở từng bộ từ, đủ 24 Unit
  BT, tìm kiếm, lật flashcard, nghe phát âm, bắt đầu bài học, ôn tập, tiến
  trình, đánh boss bằng từ vựng, chuyển EN/KO hub, mobile, không lỗi JS,
  không mất dữ liệu). §4 responsive 360/430/768/1280. §5 toàn vẹn layer.
- **Không có jsdom trong môi trường này** — mọi kiểm thử đều chạy trên Chrome
  thật (xem Smoke Test).

## Giữ nguyên 100% (không đổi)

Dữ liệu từ vựng (A1–A2 1000, Oxford 3396, BT 819, từ V15 1096, từ cá nhân),
Smart Import, 10 chế độ học, SRS, Boss Battle/Map, Korean Hub, English Hub,
Pet System, Firebase Auth + Cloud Sync, XP/level/vàng/kim cương/thành tích,
localStorage (`hanvocab.v1` và mọi khóa khác), mọi layer cũ (version giữ nguyên:
v15/v18/v19/v23 = 15.0.0, v17 = 10.0.0, v20 = 12.0.0, v20_sync/v21 = 13.0.0,
v22 = 14.0.0, v24 = 15.1.0).

## Lưu ý trung thực

1. **Firebase chưa được kiểm thử live** (như mọi phiên bản trước): code
   Firebase hoàn chỉnh nhưng chưa từng chạy với project Firebase thật — Anh
   cần chạy checklist `FIREBASE_SETUP.md` (mục 6 + V13.3). V15.2 không đổi
   code Firebase; khi chưa cấu hình, game vẫn chơi offline đầy đủ và nói rõ
   "Chưa cấu hình Firebase".
2. **Edge case có sẵn từ V14 (không phải lỗi của V15.2, không sửa trong bản
   này):** nếu người chơi đã chọn scope Basic Tactics (banner "Đang học:
   Basic Tactics · Unit N") rồi đóng tab, mở lại game và vào Flashcards ngay
   mà **chưa mở Thư viện lần nào**, flashcard sẽ báo "Không có từ nào cho bộ
   lọc này" vì dữ liệu BT chưa được tải trong phiên mới. Mở Thư viện một lần
   (dữ liệu BT tải xong) rồi học lại là bình thường; hoặc bấm "✕ Bỏ chọn" trên
   banner scope. V15.2 là lớp UI, không đổi logic tải dữ liệu nên không sửa
   trường hợp này — cần quyết định riêng nếu Anh muốn sửa.
3. **Ảnh "trước" của V15.1 đã mất** (sự cố VM thay thế giữa chừng trong V15.1)
   — ảnh trước trong V15.2 là ảnh chụp trên bản V15.1 sau khi đã khôi phục
   harness, vẫn lưu trong `tools/v15lib/shots-before/`.
4. jsdom **không được cài** trong môi trường này nên không có smoke test
   jsdom cho V15.2; toàn bộ kiểm thử chạy trên Chrome thật 157.
5. Số liệu tiến trình trong ảnh chụp (vd "163 đã học") là số liệu test (hộp
   SRS được đánh dấu bởi script kiểm thử), không phải dữ liệu người chơi thật.
