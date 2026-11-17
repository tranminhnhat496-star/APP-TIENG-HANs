# CHANGELOG — V14 → V15 (Premium Pet System, 2026-11-17)

## Tóm tắt

V15 thêm Hệ Thống Thú Cưng hoàn chỉnh (lớp V23) vào game: 12 loài × 3 hình
thái, ấp trứng theo timestamp thật, tiến hóa, đội hình 3 thú, kỹ năng phối
hợp, tích hợp vào Combat Engine V18/V19 (cả tiếng Anh và tiếng Hàn). Không
đổi khóa lưu `hanvocab.v1`, không xóa tính năng nào, không đổi Firebase/
Auth/Cloud Sync, không viết lại game.

## Mới

### Dữ liệu thú cưng (`src/v23_data.js`, `window.__V23_DATA`)

- 12 loài: Rồng Lửa (lửa, huyền thoại), Kỳ Lân Ánh Sáng (ánh sáng, huyền
  thoại), Chim Phượng (lửa, sử thi), Hồ Ly Băng (băng, sử thi), Rùa Pha Lê
  (nước, hiếm), Cú Thông Thái (thiên nhiên, hiếm), Mèo Phép (bóng tối, hiếm),
  Sói Sấm (sấm, hiếm), Cá Voi Nhỏ (nước, thường), Thỏ Ngọc (thiên nhiên,
  thường), Gấu Mật Ong (thiên nhiên, thường), Hươu Rừng (thiên nhiên, thường).
- Mỗi loài: 3 hình thái (tên riêng, ảnh riêng `<id>_s1/2/3.png`), chỉ số cơ
  bản + tăng theo cấp, 3 kỹ năng (chủ động / bị động / tuyệt kỹ).
- 5 trứng: Lửa 500 XP/60 phút, Rừng 600/60, Băng 800/90, Ánh Sáng 1500/180,
  Bóng Tối 2000/240; tỉ lệ từng loài trong trứng (tổng 100%).
- 9 nguyên liệu: 7 đá hệ + Lông Vàng + Trái Phép Thuật; chi phí tiến hóa
  (giai đoạn 1: đá×10 + lông×3 + trái×3 + 5.000 XP; giai đoạn 2: đá×20 +
  lông×5 + trái×10 + 20.000 XP; yêu cầu Lv 10 / Lv 20); mốc thưởng sưu tập
  (6/12/24/36 hình thái) và thân thiết (500/1000/1500); cho ăn 100 XP →
  +25 XP thú +10 thân thiết; tốc độ ấp (học đúng −30 giây, tăng tốc −30
  phút = 5 💎, ấp ngay = 20 💎); kỹ năng đội tốn 6 năng lượng (tối đa 10).

### Pet Hub (`src/v23.js` + `src/v23.css`, `window.__v23`, version 15.0.0)

- Overlay toàn màn hình `#v23hub` với 7 tab: Thú cưng, Ấp trứng, Tiến hóa,
  Đội hình, Kỹ năng, Sưu tập, Cửa hàng Pet. Mở từ: nút 🐾 Thú Cưng ở thanh
  ngôn ngữ English Hub, đầu trang English Hub, và tab tiếng Hàn (một dòng
  thêm vào dòng tab V6, cạnh nút 🗺️ Bản Đồ Boss).
- Tab Thú cưng: danh sách thú (lọc theo hệ/độ hiếm, tìm kiếm), chi tiết thú
  (tên, cấp, sao, thanh XP/thân thiết, HP/Công/Thủ/Tốc độ, kỹ năng, chuỗi
  tiến hóa), nút Cho ăn / Tiến hóa / Thêm vào đội / Ra trận.
- Tab Ấp trứng: thẻ trứng đang ấp (đồng hồ đếm ngược cập nhật mỗi giây,
  thanh tiến độ), kho trứng, nút Bắt đầu ấp / Tăng tốc / Ấp ngay / Nở trứng.
- Tab Tiến hóa: bảng so sánh chỉ số trước–sau, nguyên liệu có/cần (✓/✗),
  nút TIẾN HÓA chỉ bật khi đủ điều kiện.
- Tab Đội hình: 3 vị trí (Chủ lực/Hỗ trợ/Phòng thủ), thống kê đội, kỹ năng
  phối hợp, nút Gợi ý đội hình / Lưu đội hình / Ra trận.
- Tab Kỹ năng: kỹ năng đội hiện tại + bách khoa 36 kỹ năng. Tab Sưu tập:
  lưới 36 hình thái + nút nhận mốc thưởng. Tab Cửa hàng: trứng + nguyên
  liệu, mua có kiểm tra số dư.
- Ảnh lỗi tải sẽ hiện vòng tròn chữ cái đầu thay vì ảnh vỡ.
- Lưu qua `S.v7.en23` (tạo lười, không migration). Người chơi mới nhận sẵn
  1 Trứng Lửa + 1 Trứng Rừng khi mở Pet Hub lần đầu.

### Tích hợp chiến đấu (V18/V19)

- `battleStart(F)`: đội hình tạo khiên đội (tổng HP đội ÷ 5), năng lượng
  khởi đầu, thưởng sát thương (5/10/15% theo hình thái mỗi thú + 10% nếu 3
  hệ khác nhau — Liên Kết Nguyên Tố, tối đa 40%), bị động (thiêu đốt, giảm
  hao khiên, hồi khiên khi mất tim, tái sinh 1 lần/trận, +năng lượng theo
  combo...).
- Trả lời đúng: +1 năng lượng, +sát thương bị động, thú +2 XP/+1 thân
  thiết, trứng đang ấp −30 giây. Trả lời sai: khiên đội hấp thụ trước
  (mất 60 khiên, tối thiểu 30 sau giảm hao), hết khiên mới mất tim như cũ.
- Thanh chiến đấu trong trận: 3 thú + thanh khiên + thanh năng lượng + nút
  kỹ năng đội (kỹ năng của thú Chủ lực, tuyệt kỹ nếu hình thái tối đa).
- Thắng lần đầu boss có hệ (khi đã dùng thú): +2 đá đúng hệ vào kho nguyên
  liệu; XP thưởng lần đầu tăng theo hình thái Chủ lực (+5/+10/+20%).
- Nhánh tuyệt kỹ V19 (Knowledge Counterattack) cố ý không gắn hook thú
  (câu hỏi chỉ tính điểm, không gây sát thương).

### Tích hợp học tập

- `mark15` (mọi chế độ tiếng Anh + Quest): mỗi câu đúng cho thú trong đội
  +2 XP/+1 thân thiết và trứng đang ấp −30 giây. `finishRound`: XP cuối ván
  tăng theo hình thái Chủ lực, ghi rõ trong màn hình kết quả.
- Chế độ học tiếng Hàn (V6) chưa gắn hook (không có điểm móc an toàn trong
  code V6); thú vẫn nhận XP từ đánh boss tiếng Hàn và cho ăn.

### Tài sản (`assets/pets/v15/`)

- 36 PNG thú (12 loài × 3 hình thái) + 5 PNG trứng, nền trong suốt, đã tối
  ưu 512×512 (8,4 MB). Xem ASSET_REPORT_V15.md.

## Sửa (file cũ, thay đổi nhỏ có kiểm soát)

| File | Thay đổi |
|---|---|
| `v15.js` | `mark15`: gọi `__v23.onLearnCorrect()` khi trả lời đúng (sửa lỗi `W.__v23` → `window.__v23` vì `W` không tồn tại trong file này); `finishRound`: cộng thưởng XP thú + ghi chú; nút 🐾 Thú Cưng ở thanh ngôn ngữ (`renderLangBar`) và đầu trang Hub; version `14.0.0` → `15.0.0`. |
| `v18.js` | `startFight`: `battleStart(F)`; đáp án đúng: thưởng sát thương thú sau khi trừ giáp; đáp án sai (khi mất tim): khiên đội hấp thụ trước; `renderFight`: chèn thanh chiến đấu; `winReward`: thưởng XP có thú + rơi 2 đá hệ khi thắng lần đầu; thêm export `_petRefresh` (vẽ lại trận sau khi dùng kỹ năng đội); version `14.0.0` → `15.0.0`. |
| `v19.js` | Như v18.js (cùng 6 điểm, cho cả trận tiếng Anh và tiếng Hàn); version `14.0.0` → `15.0.0`. |
| `v23.js` | Mới, xem trên. Sau kiểm thử đã sửa 3 lỗi thật (xem mục "Lỗi tìm được khi kiểm thử"). |
| `index.html` | Tiêu đề V15; thêm lớp V23 (`<style id="v23">`, `<script id="v23data">`, `<script id="v23js">`); nút 🐾 Thú Cưng ở tab tiếng Hàn. |

## Lỗi tìm được khi kiểm thử (đã sửa trước khi bàn giao)

1. **`battleStart` không chép `team` vào `F.pet`** — `battleBarHTML` đọc
   `P.team.map(...)` nên ném lỗi, `renderFight` dừng giữa chừng, trận đấu
   không hiển thị gì (người chơi bấm đánh boss sẽ thấy màn hình trống).
   Sửa: `F.pet` nay gồm `team:tb.team`. Phát hiện bởi test23 §7.
2. **`castSkillInFight` không được export** — nút kỹ năng đội gọi
   `__v23.castSkillInFight()` nhưng hàm không có trong `W.__v23`, bấm nút
   sẽ ném lỗi và không làm gì (nút giả trá hình). Sửa: thêm
   `castSkillInFight:castSkillInFight` vào exports. Phát hiện bởi test23 §7.
3. **ID thú có thể trùng** — `newPet` tạo ID bằng `Date.now()+random`; hai
   thú tạo cùng mili-giây có thể trùng ID và ghi đè nhau trong `e.pets`
   (trong kiểm thử với `Math.random` cố định, 3 thú tạo liên tiếp trùng ID
   hoàn toàn). Sửa: thêm bộ đếm tăng dần vào ID. Phát hiện bởi test23 §6.
4. **Lỗi build (không phải lỗi game)**: regex đếm loài trong `build_v15.py`
   khớp cả kỹ năng và trứng (55 thay vì 12) — siết regex theo trường
   `rar:` chỉ loài mới có.
5. **Lỗi test (không phải lỗi game)**: sau mỗi đáp án trong trận phải gọi
   `next()` mới có câu tiếp theo (giống nút "Tiếp theo" của người chơi);
   test ban đầu gọi `pickCorrect` liên tiếp nên vòng lặp không bao giờ kết
   thúc. `learnXpBonus()` trả về phân số (0.05/0.10/0.20), không phải phần
   trăm. ID thẻ Hàn gốc trùng nhau khi `Math.random` bị stub trong kiểm
   thử (test tự gán lại ID trước trận Hàn).

## File giữ nguyên 100% (không sửa, không xóa)

- Mọi file V6 khác, V7–V14, `v20.js` (12.0.0), `v20_sync.js` (13.0.0),
  `v21.js` (13.0.0), `v22.js` (14.0.0), `firebase-config.js`,
  `firestore.rules`, dữ liệu từ vựng A1–A2/Oxford 3000/Basic Tactics,
  60 PNG boss V10/V11, 10 boss cũ V15, luật thưởng, cơ chế học, farm,
  đấu trường boss tiếng Hàn cũ, hệ thống lưu V12, hệ thống tài khoản V13.
- `resetEN()` không mở rộng sang `en23` (theo tiền lệ `en17`).

## Dữ liệu người chơi (localStorage) — không đổi khóa chính

- Khóa `hanvocab.v1` **giữ nguyên**; chỉ thêm `S.v7.en23` (xem README).
  Save V14 mở bằng V15 chạy bình thường; không cần migration.
- `S.v7.en23` nằm trong payload Firestore sẵn có (`players/{uid}`); không
  tạo project Firebase mới, không đổi `firestore.rules`.
