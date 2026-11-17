# KOREAN & ENGLISH VOCAB FARM V15 — PREMIUM PET SYSTEM

## Tóm tắt

V15 thêm **Hệ Thống Thú Cưng** hoàn chỉnh vào game (lớp V23 mới), theo đúng
phong cách 5 ảnh tham chiếu Anh cung cấp (Pet Hub, Egg Hatch, Pet Evolution,
Pet Team, Pet Battle): giao diện fantasy RPG 2D, bảng tím viền vàng phát sáng,
thú cưng chibi, tiếng Việt. Toàn bộ giao diện được xây bằng HTML/CSS/JS tương
tác thật — **không dùng ảnh poster làm màn hình, không có nút giả**.

Luồng chơi: **Thu thập trứng → Ấp trứng → Nhận thú cưng → Nuôi dưỡng → Tăng
cấp → Tiến hóa → Xếp đội hình 3 thú → Dùng kỹ năng hỗ trợ khi đánh Boss.**

- **Pet Hub** (`🐾 Thú Cưng`): nút mở ở cả 3 nơi — thanh ngôn ngữ English Hub,
  đầu trang English Hub, và tab tiếng Hàn (cạnh nút 🗺️ Bản Đồ Boss). 7 tab
  hoạt động thật: **Thú cưng, Ấp trứng, Tiến hóa, Đội hình, Kỹ năng, Sưu tập,
  Cửa hàng Pet**.
- **12 loài thú cưng × 3 hình thái = 36 hình thái**, mỗi loài có bộ kỹ năng
  riêng (đòn chủ động, bị động, tuyệt kỹ ở hình thái tối đa): Rồng Lửa, Chim
  Phượng, Hồ Ly Băng, Rùa Pha Lê, Cá Voi Nhỏ, Cú Thông Thái, Thỏ Ngọc, Gấu
  Mật Ong, Hươu Rừng, Mèo Phép, Sói Sấm, Kỳ Lân Ánh Sáng.
- **Ấp trứng theo timestamp thật**: 5 loại trứng (Lửa/Băng/Rừng/Ánh Sáng/Bóng
  Tối), mỗi loại có giá, thời gian ấp, danh sách thú có thể nhận + xác suất,
  điều kiện mở khóa. Đóng game rồi mở lại, thời gian ấp vẫn đúng. Nở đúng
  một lần — không nhận trùng từ cùng một quả trứng. Tăng tốc bằng kim cương
  (−30 phút / 5 💎, ấp ngay / 20 💎), kiểm tra số dư trước khi trừ.
- **Tiến hóa 3 giai đoạn** (ví dụ Rồng Lửa Nhỏ → Rồng Lửa → Rồng Thần Lửa):
  hiển thị hình thái hiện tại/tới, chỉ số trước–sau, kỹ năng mở khóa, nguyên
  liệu + vàng + cấp yêu cầu. Nút TIẾN HÓA chỉ bật khi đủ điều kiện; trừ
  nguyên liệu một lần duy nhất (khóa chống bấm đúp); không tiến hóa vượt
  hình thái tối đa.
- **Đội hình 3 thú**: Chủ lực / Hỗ trợ / Phòng thủ, không trùng thú ở hai vị
  trí, có gợi ý đội hình từ thú đang sở hữu (ưu tiên thú mạnh + khác hệ).
  Kỹ năng phối hợp có điều kiện, cooldown (năng lượng) và giới hạn: **Liên
  Kết Nguyên Tố** (3 hệ khác nhau +10% sát thương, tối đa +40%), **Lá Chắn
  Đồng Đội** (khiên đội hấp thụ đòn phản công của boss), **Hồi Phục Đồng Hành**
  (hồi khiên khi mất tim), **Bộ Ba Nguyên Tố** (kỹ năng đặc biệt của đội).
- **Pet Battle**: tích hợp vào Combat Engine hiện có (V18/V19), không thay
  thế nó. Trong trận, boss ở phải, 3 thú ở trái, hiển thị khiên đội, thanh
  năng lượng, nút kỹ năng đội. Trả lời đúng tích năng lượng (+1, tối đa 10),
  gây sát thương, tăng combo, cho thú +2 XP/+1 thân thiết, ấp trứng nhanh
  hơn 30 giây. Trả lời sai KHÔNG kích hoạt kỹ năng như khi đúng — khiên đội
  hấp thụ đòn phản công trước, hết khiên mới mất tim. Kỹ năng đội tốn 6 năng
  lượng: kỹ năng của thú Chủ lực (tuyệt kỹ nếu đã tiến hóa tối đa).
- **Song ngữ**: một hệ thống thú duy nhất cho cả hai Hub. Câu hỏi tiếng Anh
  lấy từ thư viện English Hub; câu hỏi tiếng Hàn lấy từ bộ thẻ Korean Hub
  (Hangul, chọn đáp án). Thú và đội hình dùng chung; tiến trình từ vựng vẫn
  tách biệt theo ngôn ngữ. Đấu boss tiếng Hàn không bao giờ sửa `S.cards`.
- **Nuôi dưỡng**: cho ăn (100 XP → +25 XP thú, +10 thân thiết), tăng cấp
  (giới hạn theo hình thái: Lv 10/20/30), mở khóa kỹ năng (Lv 5 mở bị động,
  hình thái 3 mở tuyệt kỹ), mốc thân thiết 500/1000/1500 nhận kim cương
  (mỗi mốc một lần). Học tiếng Anh (mọi chế độ + Quest) và đánh boss
  EN/KO đều cho thú XP. Không có vòng lặp XP/vàng vô hạn.
- **Sưu tập**: 36 hình thái, mốc thưởng 6/12/24/36 hình thái (kim cương,
  nguyên liệu, trứng, danh hiệu "Bậc Thầy Thú Cưng" ở mốc 36), mỗi mốc nhận
  một lần. Hình thái chưa sở hữu hiển thị tối với ổ khóa.
- **Cửa hàng Pet**: mua trứng và nguyên liệu bằng XP (vàng trong game), kiểm
  tra số dư trước khi trừ.

## Cách dùng

1. Mở game → bấm **🐾 Thú Cưng** (trong English Hub hoặc tab tiếng Hàn).
2. Tab **Ấp trứng**: người chơi mới đã có sẵn 1 Trứng Lửa + 1 Trứng Rừng.
   Bấm **Bắt đầu ấp** → chờ đủ thời gian (học bài giúp ấp nhanh hơn 30 giây
   mỗi câu đúng) → bấm **Nở trứng** để nhận thú.
3. Tab **Thú cưng**: chọn thú → **Cho ăn** để tăng cấp, **Tiến hóa** khi đủ
   cấp + nguyên liệu, **Thêm vào đội** để xếp đội hình.
4. Tab **Đội hình**: xếp tối đa 3 thú (Chủ lực/Hỗ trợ/Phòng thủ), bấm
   **Gợi ý đội hình** hoặc **Lưu đội hình**, rồi **Ra trận**.
5. Đánh boss (đấu trường V10 hoặc Bản Đồ Boss V11, tiếng Anh hoặc tiếng
   Hàn): khiên đội bảo vệ tim, trả lời đúng tích năng lượng, đủ 6 ⚡ bấm nút
   kỹ năng đội để tung kỹ năng của thú Chủ lực.

## Kinh tế trong game (toàn bộ dùng tiền thật của game)

- **Vàng (XP)**: `coins = XP − đã tiêu`. Trứng: Lửa 500, Rừng 600, Băng 800,
  Ánh Sáng 1500, Bóng Tối 2000. Nguyên liệu: đá hệ 200, Lông Vàng 300, Trái
  Phép Thuật 300. Cho ăn: 100. Tiến hóa: 5.000 (giai đoạn 1), 20.000 (giai
  đoạn 2).
- **Kim cương (💎)**: tăng tốc ấp −30 phút = 5 💎, ấp ngay = 20 💎. Nhận từ
  mốc thân thiết (500 → +5, 1000 → +10, 1500 → +20), mốc sưu tập
  (6 → +5, 12 → +10, 24 → +20, 36 → +50), và phần thưởng học/boss như cũ.
- **Nguyên liệu tiến hóa**: đá hệ (Lửa/Băng/Nước/Thiên nhiên/Sấm/Ánh
  sáng/Bóng tối) + Lông Vàng + Trái Phép Thuật. Nguồn: Cửa hàng Pet, và
  **thắng lần đầu một boss có hệ** trong đấu trường V10/Bản Đồ V11 sẽ rơi
  +2 đá đúng hệ của boss đó (chỉ khi người chơi đã dùng hệ thống thú).
- **Thưởng học có thú hỗ trợ**: thú Chủ lực tăng XP học/boss theo hình thái:
  +5% (hình thái 1), +10% (hình thái 2), +20% (hình thái 3). Hiển thị rõ
  trong màn hình kết thúc ván và ghi chú thưởng boss.
- **Tỉ lệ trứng** (tổng mỗi trứng = 100%): Lửa → Rồng 60% / Phượng 40%;
  Băng → Hồ Ly 55% / Rùa 25% / Cá Voi 20%; Rừng → Cú 30% / Thỏ 25% / Gấu
  25% / Hươu 20%; Ánh Sáng → Kỳ Lân 70% / Phượng 30%; Bóng Tối → Mèo 60% /
  Sói 40%.

## Chỉ số thú (thang điểm của game, không phải số trong ảnh mẫu)

Ảnh tham chiếu ghi HP 200.000... — đó là số trình bày của poster, không phải
thang điểm game đang dùng (boss HP 70–600, sát thương mỗi câu ~12–30). Thú
cưng dùng cùng thang điểm đó: HP cơ bản 45–110 theo loài, tăng theo cấp và
hình thái (×1 / ×1.6 / ×2.4), sát thương kỹ năng 25–150, khiên đội =
tổng HP đội ÷ 5. Mọi con số đều tính từ dữ liệu thật trong `v23_data.js`,
không có số giả.

## Những gì V15 KHÔNG làm (nói rõ, không giấu)

- **Không có nút "Trang bị"**: ảnh mẫu có nút này nhưng bản yêu cầu không
  định nghĩa vật phẩm trang bị, chỉ số hay cách nhận nào — làm nút giả sẽ vi
  phạm quy tắc "không nút giả". Nếu Anh muốn hệ trang bị, cần định nghĩa
  danh sách vật phẩm trước.
- **Không có thanh năng lượng ⚡ 120/120**: ảnh mẫu có thanh này nhưng game
  không có tiền tệ năng lượng; chỉ dùng ví thật của game (XP/kim cương).
- **Không có hệ thống trang bị/kỹ năng "hồi HP thú" vĩnh viễn**: khiên đội
  là tài nguyên theo trận (đầy lại mỗi trận), thú không bao giờ chết hay mất
  HP vĩnh viễn.
- **Pet XP từ chế độ học tiếng Hàn (V6)**: các chế độ học Hàn trong V6 không
  có điểm móc an toàn để gắn hook nên chưa cộng XP thú; thú vẫn nhận XP từ
  **đánh boss tiếng Hàn** và **cho ăn**. Nếu cần, đây là việc bổ sung sau.
- **Ảnh thú là ảnh AI tạo mới theo phong cách ảnh mẫu**, không cắt từ poster
  (xem ASSET_REPORT_V15.md). Hai hình thái vẽ dọc (Cú S3, Phượng S2) hiển
  thị 256×512 thay vì vuông 512×512.
- **Firebase không đổi code**: dữ liệu thú nằm trong bản lưu `hanvocab.v1`
  (khóa phụ `S.v7.en23`) nên đồng bộ qua cơ chế V12/V13 sẵn có; chưa kiểm
  thử live Firebase (xem FIREBASE_SETUP.md mục 6 + V13.3 — vẫn là việc của
  Anh như các phiên bản trước).

## Lưu dữ liệu

- Khóa `hanvocab.v1` **giữ nguyên**. Thêm khóa phụ `S.v7.en23`:
  `{pets:{id:{id,sp,st,lv,xp,aff,sk,hatchedAt}}, eggs:{eggId:n},
  hatch:null|{egg,startedAt,endsAt}, mats:{}, team:[id|null×3],
  claimed:{}, affClaimed:{}, created}`.
- Không tạo khóa localStorage mới, không migration (tạo lười khi mở Pet Hub
  lần đầu). Người chơi chưa bao giờ mở Pet Hub thì bản lưu không đổi gì.
- Lưu qua cơ chế V20 sẵn có (auto-save debounce + verified write + nút
  "Lưu tiến trình ngay"); đồng bộ Firebase qua payload `players/{uid}` như
  cũ (dữ liệu thú nhỏ, xa dưới giới hạn 900 KB).
- Vật nuôi nông trại V6 (`S.own`, 🐔🐶🐖🐄🐑🐴 mua bằng XP) **không bị chạm
  tới** — đó là vật nuôi trang trí vườn, khác với thú cưng chiến đấu V15.
- Save V14 mở bằng V15 chạy bình thường; không cần migration.

## File mới / sửa (xem CHANGELOG_V14_to_V15.md)

- Mới: `src/v23_data.js`, `src/v23.js`, `src/v23.css`, `assets/pets/v15/`
  (36 PNG thú + 5 PNG trứng), `build_v15.py`, `package_v15.py`, 4 tài liệu
  V15 (`README_V15_PETS.md`, `CHANGELOG_V14_to_V15.md`,
  `ASSET_REPORT_V15.md`, `SMOKE_TEST_V15_2026-11-17.md`).
- Sửa nhỏ, có kiểm soát: `v15.js` (hook học đúng + thưởng XP có thú + 2 nút
  mở Pet Hub), `v18.js` + `v19.js` (hook chiến đấu: khiên đội, năng lượng,
  kỹ năng đội, rơi đá hệ khi thắng lần đầu), `index.html` (lớp V23 + nút
  Pet Hub ở tab tiếng Hàn).
- Giữ nguyên 100%: mọi file V6 khác, V7–V14, `v20.js`/`v20_sync.js`/
  `v21.js`/`v22.js`, `firebase-config.js`, `firestore.rules`, dữ liệu từ
  vựng, 60 PNG boss V10/V11, 10 boss cũ, farm, cơ chế học, SRS, quest.
