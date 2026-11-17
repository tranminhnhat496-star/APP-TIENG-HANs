# Changelog V10 → V11 — Boss Adventure (Bản Đồ + 30 Boss Siêu Huyền Thoại)

## Tóm tắt
V11 thêm **lớp V19**: bản đồ boss tương tác (10 vùng đất), **30 boss Siêu
Huyền Thoại mới** (ID `v11_*`, khác 30 boss V10), Universal Combat Engine
với Knowledge Counterattack, hệ thống sao và thành thạo song ngữ. Không đổi
code V6, không đổi dữ liệu V7/V8/V9/V10, không đổi khóa lưu `hanvocab.v1`.

## Thêm mới
- **Lớp V19** (`v19_data.js`, `v19.js`, `v19.css`):
  - 30 boss mới, ID `v11_*`, không trùng 10 ID boss cũ và 30 ID V10.
  - 10 vùng đất × 3 boss, thứ tự và vị trí theo ảnh bản đồ bạn gửi
    (đường đi uốn lượn từ dưới lên trên). Mỗi vùng có 1 boss chính
    (huyền thoại) + 2 boss phụ (huyền thoại phụ). Mở khóa: vùng 1 luôn mở;
    vùng N mở khi thắng boss chính vùng N−1 **bằng cùng ngôn ngữ**; trong
    vùng mở tuần tự boss 1 → 2 → 3.
  - **Bản đồ tương tác thật**: nút vùng là thành phần DOM riêng (ảnh boss
    chính lazy-load, tên, huy hiệu trạng thái, sao, x/3), đường nối là SVG
    phát sáng, trạng thái khóa/mở/đang chinh phục/hoàn thành/tinh thông
    suy ra trực tiếp từ dữ liệu thắng — không dùng ảnh poster tĩnh làm nền
    (poster có nhãn và boss vẽ sẵn, sẽ xung đột với trạng thái sống).
  - **Chọn ngôn ngữ trên bản đồ** (EN/KO, nhớ lựa chọn). Câu hỏi và tiến
    trình hoàn thành **độc lập theo ngôn ngữ**: thắng boss bằng tiếng Anh
    không mở khóa boss đó bằng tiếng Hàn.
  - **Universal Combat Engine**: 5 tim; sát thương `12 + combo×2 − def`
    (tối thiểu 2); chí mạng chắc chắn ở combo 5/10/15… + 10% ngẫu nhiên;
    khiên giảm một nửa sát thương; đồng hồ đếm ngược theo boss/giai đoạn.
  - Mỗi boss **5 kỹ năng riêng**: tấn công cơ bản, kỹ năng nguyên tố
    (10 hệ: lửa/băng/sấm/bóng tối/ánh sáng/nước/thiên nhiên/gió/đất/vũ trụ),
    kỹ năng chiến thuật (mỗi 5 câu), kỹ năng bị động, tuyệt kỹ.
  - **3 giai đoạn**: Phase 2 Awakening ở ≤50% HP; ở ≤20% HP boss chuẩn bị
    tuyệt kỹ → **Knowledge Counterattack** (3 câu liên tiếp, 15 giây/câu):
    đúng 3/3 phản 40 sát thương và không mất tim; 2/3 phản 15, mất 1 tim;
    1/3 mất 1 tim; 0/3 mất 2 tim. Sau đó Phase 3 Berserk (sai mất 2 tim,
    đồng hồ 10 giây, sát thương ×1,5). Sát thương phản lại có thể hạ boss
    ngay.
  - **Hệ thống sao**: 1★ thắng; 2★ đúng ≥80%; 3★ đúng ≥90% và còn ≥3 tim.
    Tiêu chí hiển thị trước trận trong bảng thông tin vùng.
  - **Phần thưởng**: thắng lần đầu mỗi ngôn ngữ nhận đủ XP + kim cương +
    vật phẩm (+ danh hiệu ở boss chính mỗi vùng); hoàn thành vùng +100 XP /
    +3 kim cương (vùng 10: +200/+5), nhận 1 lần mỗi ngôn ngữ; đánh lại chỉ
    +10 XP. **Song ngữ**: thắng boss bằng cả hai ngôn ngữ → huy hiệu
    🌐 Song Ngữ + danh hiệu "Bậc Thầy Song Ngữ" (1 lần).
  - Câu hỏi tiếng Anh từ `__v15.words` (lọc theo cấp độ + thư viện a1a2/
    oxford), ngữ pháp/đọc hiểu/ghép câu từ `__V15_DATA`; câu hỏi tiếng Hàn
    từ `S.cards` (cần ≥8 thẻ, nếu không dùng tạm tiếng Anh và báo rõ);
    các dạng không có bản tiếng Hàn được chuyển thành trắc nghiệm tiếng Hàn.
  - Đáp án đúng trong boss tiếng Anh ghi vào SRS qua `mark19()` (cùng luật
    với `mark15`/`mark18`); đáp án tiếng Hàn chỉ ghi `en19.koStats`,
    không sửa `S.cards`.
  - Animation CSS 6 trạng thái: idle/hit/attack/skill/ultimate/defeat/
    victory + `prefers-reduced-motion`; ảnh boss lazy-load; không nhúng
    base64 vào HTML; dữ liệu boss tách riêng khỏi logic chiến đấu.
- **30 ảnh boss PNG** riêng (`assets/bosses/v11/v11_*.png`, tổng 1,9 MB):
  3 ảnh cắt nền trong suốt thật + 27 ảnh chân dung cắt sát, kèm
  `manifest_v11.json`. Xem `ASSET_REPORT_V11.md` (nói rõ giới hạn tách nền
  của poster full-bleed).
- Khóa lưu mới `S.v7.en19` = `{lang, bosses:{id:{en:{win,wins,stars,best},
  ko:{…}}}, titles:[], zoneClaimed:{zoneId:{en,ko}}, koStats:{right,wrong},
  created}`.

## Sửa (chỉ lớp V15 và V18, không động code V6)
- `v15.js`: thêm tab `['map','🗺️ Bản Đồ Boss']` vào `hubTabs()`;
  `renderTab()` chuyển tab map sang `__v19.mapHTML()` (có guard);
  `__v15` version `10.0.0` → `11.0.0`.
- `v18.js` (Bộ Sưu Tập, để hiển thị 70 boss): `allBosses()` gộp thêm boss
  V19; `isWon()`/`bossUnlocked()` rẽ nhánh theo `b.zone`; `elChip`/
  `rarChip` dùng `el.c || el.color`; `arenaName()` xử lý ID vùng (`z…`);
  `collFiltered()` thêm bộ lọc arena `map`; `collDetail()` dùng
  `__V19_DATA.byId` làm dự phòng; `challenge()` chuyển boss V19 sang bản đồ.
- `v19.js`: sửa 1 lỗi thật phát hiện khi kiểm thử — khi tuyệt kỹ kích hoạt
  trong `answer()`, `renderFight()` chạy trước khi câu hỏi phản công đầu
  tiên được tạo nên `qHTML` rơi xuống nhánh trắc nghiệm và đọc `c.w.en`
  trên câu hỏi ghép câu (không có `w`) → crash. Sửa: chế độ câu hỏi khi
  đang chuẩn bị tuyệt kỹ dùng `F.caMode || F.qmode`, và banner tiến trình
  phản công chỉ hiện khi đã có câu hỏi phản công.

## Không đổi
- Toàn bộ code V6, dữ liệu V15 (1.096 từ), V16 (Smart Import + SheetJS),
  V17 (Thư viện A1–A2 1.000 từ + Oxford 3.396 từ), V18 (30 boss V10,
  3 arena, đá nguyên tố, danh hiệu V10), 10 boss cũ V15 và luật thưởng
  của chúng.
- Khóa lưu `hanvocab.v1`; `S.v7.en15`, `S.v7.en16`, `S.v7.en17`,
  `S.v7.en18` giữ nguyên.

## Kiểm thử
- Suite jsdom V11: **342/342** (chạy 2 lần, đều 342/0), gồm: tải trang +
  các lớp; hồi quy V9/V10; bản đồ (10 nút vùng, đường SVG, tiến độ 0/30,
  chuyển ngôn ngữ); chi tiết vùng + vùng khóa; **từng vùng, đủ 30 boss
  thắng bằng tiếng Anh** (mở khóa tuần tự, sao, thưởng lần đầu đúng số
  kim cương, danh hiệu, đánh lại không nhận lại, vùng tinh thông, thưởng
  vùng 1 lần); từng kỹ năng nguyên tố/chiến thuật/bị động; **phản công
  tuyệt kỹ** (3/3 phản 40, 2/3 phản 15, 0/3 mất 2 tim, chuyển phase đúng,
  sai ở Phase 3 mất 2 tim); thua trận; **độc lập EN/KO** (vùng 2 mở ở EN
  nhưng khóa ở KO, thắng KO riêng, `S.cards` không đổi, huy hiệu song ngữ);
  Bộ Sưu Tập 70 boss + tìm kiếm/lọc/chi tiết; lưu và tải lại từ
  localStorage. Xem `SMOKE_TEST_V11_2026-11-17.md`.
- Hồi quy V10 (suite riêng): **18/18** — boss cũ V15, arena V10 thắng được,
  kỹ năng lửa/đất V10, đá nguyên tố, Bộ Sưu Tập 40 boss theo bộ lọc V10.
- Chưa kiểm thử trên trình duyệt thật (giới hạn môi trường, giống V7–V10):
  cần thử trên GitHub Pages sau khi deploy (phát âm/micro, nghe, mobile,
  lần mở đầu tiên).
