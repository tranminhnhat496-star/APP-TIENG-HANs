# V19.6.1 — KO Forge (Sentence Forge tiếng Hàn) — 19.6.1, layer V53

**Base:** V19.6 (Sentence Forge Auto, PR #37) — bản này chỉ sửa **Sentence Forge
tiếng Hàn**. Sentence Forge tiếng Anh không đổi.

## Vấn đề (đã xác nhận trên V19.6 gốc)

Sentence Forge tiếng Hàn chỉ dùng ví dụ (`card.e`) của **từ đã học** (box ≥ 1),
lọc sơ sài (chỉ cần có Hangul + ≥ 2 từ), không xếp độ khó, không báo khi bộ
từ thiếu câu. Hậu quả: người học ít từ thì Forge gần như trống; ví dụ lỗi
(dấu câu lạ, thiếu khoảng trắng, câu một từ đã lọt lưới cũ) vẫn vào bài.

## Cách sửa — theo quyết định của Claude (giám đốc, 2026-11-25), chọn (b)

**Giữ ví dụ thật làm gốc, mở rộng bộ câu. KHÔNG tự sinh câu tiếng Hàn
theo mẫu** — một câu luyện sai ngữ pháp còn tệ hơn thiếu câu (quy tắc 받침
chỉ lo được tiểu từ, còn đuôi động từ, kính ngữ, thứ tự tự nhiên đều có bẫy).

### 1. Bộ câu mở rộng — ưu tiên 3 tầng
1. Ví dụ của **từ đã học** trước.
2. Rồi ví dụ của từ **cùng nhóm (`c.g`) / cùng bộ đang chọn (`S.deck`, `c.d`)**.
3. Cuối cùng ví dụ của **từ chưa học** — các câu này được **đánh dấu rõ
   “chưa học”** (huy hiệu trên thẻ câu hỏi, dòng ghi ở màn hình cuối) để
   người chơi biết. Chỉ là hiển thị — **không thêm key lưu, không đổi schema**.
- Câu trùng chữ chỉ giữ một lần, ở tầng ưu tiên cao nhất.
- Trong tầng đã học, **bộ đang chọn vẫn được ưu tiên trước** (giữ hành vi
  `koDeckFirst` của V19.6).
- Cửa vào Forge (`đã học ≥ 8 từ` và `số câu ≥ 3`) nay đếm theo **bộ câu đã mở
  rộng**: chỉ hiện trạng thái trống “ko-sent” khi cả bộ mở rộng vẫn < 3 câu.

### 2. Thang độ khó theo số từ — xếp thứ tự trong buổi luyện
**2–3 từ → 4–5 từ → 6+ từ**, câu dễ trước, xáo trộn trong từng bậc.
Đây là **thứ tự buổi luyện**, không phải đổi tier tính điểm (`tierKO`
≤4 → 1, ≤7 → 2, còn lại 3 — giữ nguyên).

### 3. Báo thiếu câu + tự bổ sung — không bao giờ lặng lẽ bỏ thẻ
Bộ đang học (đã học + cùng nhóm/bộ) có **< 5 câu hợp lệ** thì buổi luyện
**tự bổ sung từ nhóm gần nhất** và hiện thông báo rõ ở 3 chỗ: màn hình giới
thiệu, câu hỏi đầu tiên, màn hình cuối. Không lặng lẽ bỏ thẻ nào.

### 4. Bộ lọc chất lượng — mọi ví dụ phải qua 6 quy tắc
| Quy tắc | Loại bỏ |
|---|---|
| `no-hangul` | Câu không có chữ Hangul |
| `too-short` | Câu < 2 từ (vd: `사랑해요.`) |
| `odd-punct` | Ký tự lạ ngoài Hangul/Latin/số/khoảng trắng và `.,!?;:'"()-…‘’“”` (vd: `~`, `#`, `/`) |
| `unbalanced` | Dấu `"` / `()` / `[]` không cân bằng (dấu `'` giữa từ như `don't` vẫn được) |
| `mid-punct` | Dấu câu nằm giữa từ — dấu hiệu thiếu khoảng trắng (vd: `학생입니다.오늘`) |
| `bad-token` | Từ chỉ toàn dấu câu (vd: ô dấu phẩy `,` đứng riêng) |

Mọi câu vẫn giữ **nguyên văn `card.e`** — không bịa tiếng Hàn.

## Không đổi
- Sentence Forge tiếng Anh, V51 tự sinh câu EN, V52 TTS, V50 tính điểm:
  buổi 5 câu đúng vẫn +20 XP (5×+2 + thưởng buổi +10 một lần).
- Không thêm key `localStorage`, không thêm key `S.v7`; thông báo bổ sung
  chỉ sống trong buổi luyện, không lưu vào save.
- Dữ liệu người chơi (XP, vàng, kim cương, boss, pet, SRS, farm) giữ nguyên.

## Kiểm thử (xem `SMOKE_TEST_V19_6_1_2026-11-25.md`)
- `tools/v53/repro-v53.js`: **5/5 lỗi tái hiện trên V19.6 gốc**.
- `tools/v53/test53.js` (Node vm): **115 PASS / 0 FAIL / 5 SKIP, chạy ×3**
  trên bản build + **×1 trên ZIP đã đóng gói**.
- `tools/v53/verify-v53c.js` (Chrome 157 thật): **47/47 PASS, chạy ×2**,
  0 lỗi console/warning/dialog — gồm buổi KO live bằng click chuột thật,
  huy hiệu “chưa học”, thang độ khó, thông báo bổ sung, tương phản huy hiệu
  9.42:1 và dòng thông báo 10.97:1 (sáng + tối), kiểm tra 360px.
- Build lại từ đầu cho ra `index.html` **byte-identical**;
  ZIP ↔ `out/` **byte-identical** (`index.html`).

## Hạn chế thành thật
- TTS Android thật **chưa kiểm chứng** (Chrome headless không có giọng nói)
  — Anh test trên điện thoại thật như mọi phiên bản.
- Firebase login/sync **chưa test live**, như mọi phiên bản.
- Không liên quan micro thật.
