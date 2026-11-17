# Korean & English Vocab Farm V15.1 — UI Readability Upgrade (lớp V24)

> **Chỉ cải thiện UI/UX, không thay đổi logic game.** Mọi chức năng, dữ liệu
> người chơi, khóa localStorage và hệ thống Firebase giữ nguyên như V15.

## Có gì mới

Lớp cộng thêm **V24** (`v24.css` + `v24.js`, version `15.1.0`) nạp **sau cùng**
nên thắng mọi rule cũ cùng độ ưu tiên — không sửa file cũ nào.

### 1. Design System tập trung (`:root` trong `v24.css`)

```css
--ui-text-primary:#FFFFFF;   --ui-text-secondary:#E5DEF5;
--ui-text-dark:#29243A;       --ui-title-gold:#FFD76A;
--ui-bg-panel:#292044;       --ui-bg-content:#372B58;
--ui-border:#B99AF7;         --ui-border-gold:#F5C86A;
--ui-success:#70F5A0;        --ui-warning:#FFD166;
--ui-danger:#FF828F;         --ui-btn-green:#2E7D32;
```

### 2. Tương phản đạt WCAG AA (4.5:1 chữ thường, 3:1 chữ lớn)

Kiểm chứng bằng trình duyệt thật (Chrome 157, 390px) trên **14 màn hình**:
**0 lỗi tương phản, 0 chữ < 12px, 0 tràn ngang** sau nâng cấp
(trước: 3–8 lỗi/màn hình, 2–9 chữ nhỏ/màn hình). Các lỗi đã sửa:

| Vị trí | Trước | Sau |
|---|---|---|
| Nút chính `.btn.pri` (mọi màn hình) | trắng trên #3FAE62 = **2.82:1** | trắng trên **#2E7D32 = 5.13:1** |
| Thanh thú trong trận đấu `.v23bar-fight` | chữ tối trên nền tím đậm = **1.14:1** | #FFF8E1, đọc rõ |
| Chip boss `.v18chip` (nguyên tố + độ hiếm) | #58B368 / #9AA5B1 = **1.5–2.5:1** | chữ #3A2E22 = **6.0:1**, viền giữ màu nguyên tố |
| Nhãn thống kê profile `.v21stat` | #8A7A63, 11.5px = **4.16:1** | #6B5B4A, 12px = **5.9:1** |
| Chữ "Còn N từ" (ban đêm, mặc định) | #7C6B58 trên #10182E = **3.44:1** | #C9BFE0 ≈ 7.3:1 |
| Nhãn "Bộ từ" / "Chỉ từ cần ôn" (ban đêm) | #3A2E22 / #7C6B58 = **1.9–3.4:1** | #E8ECF8 / #C4B9E2 |
| Ghi chú nông trại ban đêm | #7C6B58 = 3.44:1 | #D8E8D0 ≈ 5.9:1 |
| Nút đóng Account/Pet Hub | trắng trên #E63946 = 4.17:1 | trắng trên **#C1121F = 5.9:1** |
| Nút tím Pet Hub `.v23btn.pri/.evo/.ok` | đầu gradient trắng 2.3–3.4:1 | gradient đậm hơn, ≥ 4.5:1 |
| Tab thú không chọn / chữ phụ Pet Hub | #D9C8FF / #C9B8F0, 11px | #E5DEF5, 12px |
| Placeholder ô tìm kiếm Pet Hub (nền tối) | #6B5B4A ≈ 2.2:1 | #B7A6E0 ≈ 7.5:1 |
| Tab "Bản Đồ Boss"/"Thú Cưng" (ban đêm) | #7A5B00 trên nền tối | vàng #FFD76A trên thanh tab tối #1F2B22 |

### 3. Typography & nút bấm

- Font đã có sẵn (Be Vietnam Pro + Noto Sans KR + Jua) được giữ nguyên.
- Nội dung quan trọng **tối thiểu 12px** (tab dưới đáy 10px → 12px, tên luống
  11px → 12px, chữ phụ Pet Hub 11px → 12px).
- Nút `.btn.sm` và `.v23btn` đủ **44px** chạm (theo yêu cầu).
- Đáp án đúng/sai giờ có **cả màu lẫn biểu tượng** (✓ / ✗) ở `.v15opt`,
  `.v18opt`, `.v19opt` — không chỉ dùng màu.
- IPA trong flashcard đậm hơn (#6B5B4A).

### 4. Bố cục từng màn hình

- **Korean Hub:** tiêu đề có bóng mềm để không chìm trên gradient xanh lá;
  pill `#sk/#sn` nền xanh đậm; tab đang chọn xanh đậm; tab dưới đáy cho phép
  xuống dòng — hết dính "Bản Đồ BossThú Cưng"; thanh tab có nền đặc (sáng
  ban ngày, tối #1F2B22 ban đêm).
- **English Hub:** nút 🐾 Thú Cưng trong header đổi sang vàng gold (trước
  xám nhạt như bị vô hiệu); chip XP/gems nền đen 28%.
- **Boss Map:** ở ≤480px map cao 1600px + island thu nhỏ → các zone không
  còn chồng nhau (trước "Vô Cực" đè lên "Tinh Vân").
- **Pet Hub:** grid `minmax(0,1fr)` + `min-width:0` hết tràn ngang 11px;
  tab Account Center ở điện thoại wrap 2 hàng thay vì phải vuốt ngang.
- **Popup:** không vượt quá 94vw.

### 5. Hai lỗi thật tìm thấy khi kiểm thử (đã sửa trong V24)

1. **Nút "KOREAN FARM" trong màn hình chọn nông trại bị hỏng:** class `.ko`
   của V6 (ảnh boss bị hạ: 96px, grayscale, xoay 160°) va chạm với nút
   `<button class="v15big ko">` → nút bị thu nhỏ/xoay/chồng lên đoạn văn.
   V24 khôi phục kích thước nút. (Nút English không bị vì không có rule `.en`.)
2. **Trận đấu V18 bắt đầu ở cuối trang (~5.500px dưới fold):** sau khi bấm
   "Khiêu chiến", người chơi vẫn nhìn danh sách boss trong khi trận đấu chờ
   ở dưới. V24 thêm MutationObserver (2 tầng, vì `#v18fight` chỉ được tạo
   khi mở tab Bosses) cuộn tới trận đấu **chỉ khi trận mới bắt đầu**.
3. **(Phát hiện thêm) English Hub crash khi bản lưu thiếu `modeBest`:**
   `en15()` trong v15.js chỉ tạo mặc định khi `S.v7.en15` hoàn toàn chưa có;
   nếu bản lưu đã có `en15` nhưng thiếu `modeBest` thì `learnHTML` crash
   (`reading 'flash'`). Các getter khác (en18/en19) đều backfill từng
   trường, riêng en15 thì không. V24 backfill các trường còn thiếu bằng đúng
   giá trị mặc định của v15.js rồi lưu lại — không sửa file cũ.

### 6. Không đổi

- Logic game, XP/vàng/kim cương, farm, thú cưng, boss, SRS, Smart Import,
  thư viện, Firebase Auth + Cloud Sync: **giữ nguyên**.
- Khóa localStorage (`hanvocab.v1` và các khóa phụ): **giữ nguyên**, không
  migration. Dữ liệu người chơi được kiểm chứng còn nguyên sau save round-trip
  (XP 12500 + 42 gems).
- Không nút giả, không chức năng giả. Không hiệu ứng mới che nội dung.

## Cấu trúc file mới

| File | Nội dung |
|---|---|
| `src/v24.css` | Design tokens + toàn bộ override (14 mục, có chú thích lý do từng rule) |
| `src/v24.js` | `window.__v24 = {version:'15.1.0'}` + scroll-fix + en15 backfill |
| `build_v15ui.py` | Build V15.1 từ bản V15 + inject V24 (idempotent: build lại vẫn đúng) |
| `package_v15ui.py` | Đóng ZIP `Korean_English_Vocab_Farm_V15_UI_Readability_Upgrade.zip` |
| `tools/v15ui/` | Bộ kiểm thử: `test24.js` + harness CDP (`cdp.js`, `audit.js`, `shot.js`, `batch.js`, `setups/`) + log 2 lần chạy |
| `SMOKE_TEST_V15_1_2026-11-17.md` | Báo cáo kiểm thử đầy đủ (84/84, 3 lần chạy) |
| `CHANGELOG_V15_to_V15_1.md` | Changelog chi tiết |

## Kiểm thử (tóm tắt)

- **test24.js: 84/84 checks, chạy 3 lần** (1 lần trước khi máy ảo bị thay —
  log gốc mất theo /tmp; 2 lần sau trên bản build hiện tại, log trong
  `tools/v15ui/test24-run2.log`, `test24-run3.log`): tương phản WCAG AA
  14 màn hình (auditor cuộn trang + kiểm tra cả nhãn bọc control),
  giá trị computed-style của từng điểm sửa, 3 bug fix, hồi quy chức năng
  (hub, 10 modes, flashcard + IPA, Pet Hub 7 tab, Boss Map 10 zone EN/KO,
  save round-trip), responsive 360px/430px.
- **Audit tương phản độc lập (audit.js): 0 lỗi / 0 chữ < 12px / 0 tràn ngang
  trên cả 14 màn hình** (xem SMOKE_TEST).
- **Ảnh chụp sau nâng cấp:** `tools/v15ui/shots-after/` (17 ảnh, 390px).
  Ảnh TRƯỚC đã chụp và đối chiếu trong quá trình làm nhưng bị mất khi máy
  ảo bị thay giữa chừng (thư mục /tmp bị xóa) trước khi kịp sao lưu; các
  **con số tương phản trước/sau vẫn còn đầy đủ** trong SMOKE_TEST.

## Cập nhật lên GitHub Pages

Xem `GITHUB_DESKTOP_GUIDE.md` (mục V15.1) — giống các bản trước: giải nén
ZIP đè lên repo `APP-TIENG-HANS`, commit, push. Bản lưu người chơi trong
trình duyệt **không bị ảnh hưởng** (cùng khóa `hanvocab.v1`, không migration).

## Lưu ý trung thực

- Firebase **không hề đụng tới** trong bản này và vẫn chưa được kiểm thử
  với project thật — xem `FIREBASE_SETUP.md` (Step 6 + mục V13.3) trước khi
  tuyên bố đăng nhập/đồng bộ hoạt động.
- Kiểm thử trình duyệt thật đã chạy được ngay trên máy này (Chrome CDP);
  tuy nhiên Anh vẫn nên tự kiểm tra trên GitHub Pages sau khi deploy
  (giọng nói, micro, bố cục điện thoại thật, lần mở đầu tiên).
