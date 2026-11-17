# Changelog V9 → V10 — 30 Bosses Mới

## Tóm tắt
V10 thêm **30 boss mới** (lớp V18) vào hệ thống Boss Battle, chia 3 khu vực,
kèm Bộ Sưu Tập Boss. Không đổi code V6, không đổi dữ liệu V7/V8/V9, không đổi
khóa lưu `hanvocab.v1`.

## Thêm mới
- **Lớp V18** (`v18_data.js`, `v18.js`, `v18.css`):
  - 30 boss mới, ID `v10_*`, không trùng 10 ID boss cũ (slime…king).
  - 3 khu vực: English Challenge Arena (10), Elemental Arena (10),
    Legendary Boss Arena (10). Mở khóa: khu vực 1 luôn mở, tuần tự trong
    khu vực; khu vực 2 mở khi thắng tổng 5 boss; khu vực 3 mở khi thắng
    5 boss nguyên tố.
  - Engine chiến đấu riêng: tim người chơi 3/4/5 theo khu vực; sát thương
    `12 + combo×2 − def` (tối thiểu 2); chí mạng chắc chắn ở combo 5/10/15…
    + 10% ngẫu nhiên; đồng hồ đếm ngược theo boss/giai đoạn.
  - Kỹ năng nguyên tố thật (9 hệ): Lửa hồi máu boss khi bạn sai; Băng 15s;
    Gió 8s + sát thương ×1,25; Nước hồi máu theo số lần sai; Đất khiên 30 HP
    (sát thương giảm một nửa khi còn khiên); Bóng tối ẩn phiên âm; Thiên nhiên
    hồi máu theo số câu; Ánh sáng miễn phí lần sai đầu tiên; Sấm (huyền thoại)
    sai mất 2 tim ở Phase 2.
  - Boss huyền thoại 3 giai đoạn (Phase 2 ở ≤50% HP, Phase 3 ở ≤20% HP),
    mỗi boss một hiệu ứng riêng (hồi sinh, khiên 40, phòng thủ +3, hồi máu
    định kỳ, rút ngắn thời gian, sai mất 2 tim).
  - Độ khó huyền thoại tự điều chỉnh theo số từ đã thuộc (<200: A2/B1,
    200–600: B1, >600: B2).
  - Câu hỏi tiếng Anh từ `__v15.words` (lọc theo cấp độ + thư viện a1a2/
    oxford), ngữ pháp/đọc hiểu/ghép câu từ `__V15_DATA`; câu hỏi tiếng Hàn
    từ `S.cards` (cần ≥8 thẻ, nếu không dùng tạm tiếng Anh và báo rõ);
    các dạng không có bản tiếng Hàn được chuyển thành trắc nghiệm tiếng Hàn.
  - Phần thưởng lần đầu chỉ nhận 1 lần (XP + kim cương + vật phẩm; + Đá
    Nguyên Tố ở khu vực 2; + danh hiệu ở khu vực 3 và boss cuối khu vực 1).
    Đánh lại chỉ +10 XP luyện tập.
  - Đáp án đúng trong boss tiếng Anh ghi vào SRS qua `mark18()` (cùng luật
    với `mark15`: hộp nhớ, ngày ôn, chống farm XP); đáp án tiếng Hàn chỉ
    ghi thống kê `en18.koStats`, không sửa `S.cards`.
  - **Bộ Sưu Tập Boss** (tab mới trong English Hub): 40 boss, tìm kiếm,
    lọc theo khu vực/hệ/độ hiếm/trạng thái, xem chi tiết, nút Thách đấu.
  - Animation CSS 6 trạng thái: idle/hit/attack/special/defeat/victory +
    `prefers-reduced-motion`.
- **30 ảnh boss PNG** riêng (`assets/bosses/v10/v10_*.png`, tổng 7,9 MB),
  cắt từ 3 poster, đã tách nền, kèm `manifest.json`. Xem `ASSET_REPORT_V10.md`.
- Khóa lưu mới `S.v7.en18` = `{bosses:{}, stones:{}, titles:[], koStats:{right,wrong}, created}`.

## Sửa (chỉ lớp V15, không động code V6)
- `v15.js`: thêm tab `['collection','🏆 Bộ Sưu Tập']` vào `hubTabs()`;
  `renderTab()` chuyển tab collection sang `__v18.collectionHTML()`;
  `bossesHTML()` gắn thêm `__v18.arenasHTML()` sau danh sách 10 boss cũ;
  `__v15` version `9.0.0` → `10.0.0`. Tất cả đều có guard
  (`window.__v18&&…`) nên V15 vẫn chạy nếu thiếu V18.
- `v18.js`: sửa 2 lỗi thật phát hiện khi kiểm thử —
  (1) `pick()` có chuỗi `if` bị đứt (câu ngữ pháp/đọc hiểu rơi xuống nhánh
  trắc nghiệm và crash vì `optsVi` không tồn tại) → viết lại thành một
  chuỗi `else if` duy nhất;
  (2) `pickCorrect`/`pickWrong` (test hook) không xử lý được câu hỏi Nói
  (không có nút đáp án) → đi qua cùng đường `answer()` mà callback
  SpeechRecognition dùng.

## Không đổi
- Toàn bộ code V6, dữ liệu V15 (1.000 từ), V16 (Smart Import + SheetJS),
  V17 (Thư viện A1–A2 1.000 từ + Oxford 3.396 từ), 10 boss cũ V15 và luật
  thưởng của chúng.
- Khóa lưu `hanvocab.v1`; `S.v7.en15`, `S.v7.en16`, `S.v7.en17` giữ nguyên.

## Kiểm thử
- Suite jsdom V10: **205/205** (chạy 2 lần, đều 205/0), gồm: từng nhóm
  10 boss thắng/thua, mở khóa, từng kỹ năng nguyên tố, chuyển giai đoạn
  huyền thoại, thưởng lần đầu 1 lần + đánh lại chỉ +10 XP, đá + danh hiệu,
  trận tiếng Hàn không sửa `S.cards`, Bộ Sưu Tập 40 boss + tìm kiếm/lọc/
  chi tiết, lưu và tải lại từ localStorage, hồi quy V9 (thư viện, boss cũ).
  Xem `SMOKE_TEST_V10_2026-11-17.md`.
- Chưa kiểm thử trên trình duyệt thật (giới hạn môi trường, giống V7–V9):
  cần thử trên GitHub Pages sau khi deploy (phát âm/micro, nghe, mobile,
  lần mở đầu tiên).
