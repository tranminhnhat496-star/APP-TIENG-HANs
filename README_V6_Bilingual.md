# Korean Vocab Farm V5 Ultimate — xây trên V6, không ghi đè V6

## Cách chạy
Giải nén `Korean_Vocab_Farm_V5_Ultimate.zip`, để file
`Korean_Vocab_Farm_V5_Ultimate.html` cạnh thư mục `assets/`, bấm đúp để mở.
Không cần máy chủ, không cần cài đặt.

## 1. Audit dự án gốc (Giai đoạn 1)
- File gốc: `V6/Korean_Vocab_Farm_V6.html` — 1.073 dòng, ~127 KB, 1 file HTML duy nhất + thư mục `assets/` (PNG thật cho cây 5 giai đoạn, vật nuôi, nhà cửa, mascot, boss).
- Khóa dữ liệu: `hanvocab.v1` trong localStorage. Đối tượng `S` chứa `cards`, `decks`, `opt`, `xp`, `spent`, `own`, `dex`, `bw`, `rem`, `sk`, `dq`, `best`.
- Chế độ học có sẵn: Thẻ ghi nhớ, Trắc nghiệm, Gõ tiếng Hàn, Nghe và chọn, Sắp xếp câu, Đặt câu (Claude chấm), Ghép cặp, Đua 60 giây, Đấu boss cổ điển (5 boss emoji → PNG).
- Boss World (V5/V6): 28 boss trong 6 thế giới, **chỉ 10 boss chơi được** (F1, F4, N1–N8), 18 boss còn lại chỉ là bóng "Sắp ra mắt". Kỹ năng fire/web/minion/clone chưa có tác động thật.
- Nông trại: cây hiển thị theo mức nhớ `box` (0–5), thu hoạch khi `box>=4`, vật nuôi/trang trí mua bằng XP trong Cửa hàng, thời tiết V5, mascot rig V5, giếng nước.
- Âm thanh: chỉ có SFX WebAudio đơn giản (đúng/sai/thắng/thua), **chưa có nhạc nền, chưa có chỉnh âm lượng**.
- Thiếu: achievement riêng, gems, nhiệm vụ tuần, sổ sưu tầm từ vựng theo nhóm, rương hằng ngày, farm tương tác theo từng luống, ngày/đêm, boss theo 8 chủ đề học tập riêng biệt.

## 2. Nguyên tắc nâng cấp (Giai đoạn 2)
- **Không sửa logic V2–V6.** Toàn bộ code gốc được giữ nguyên verbatim trong file mới; lớp V5 Ultimate là `<style id="v7">` + `<script id="v7js">` thêm vào cuối, theo đúng pattern V3/V4/V5 (wrap hàm, không ghi đè dữ liệu).
- **Migration tương thích ngược:** dữ liệu mới chỉ nằm trong `S.v7` (`gems`, `ach`, `plots`, `boss8`, `dq`, `wq`, `totalOk`, `harvests`, `lastLogin`, `chest`, `musicOn`, `vol`, `night`, `gemOwn`). Nếu mở file sao lưu cũ, `S.v7` tự tạo giá trị mặc định. `hanvocab.v1`, `S.cards`, `S.xp`, `S.dex`, `S.bw` không đổi — file sao lưu cũ vẫn khôi phục được, file sao lưu mới vẫn chứa đủ dữ liệu cũ.
- **Không nút giả:** mọi nút trong lớp V7 đều có hàm thật. Boss chưa có hình riêng thì không đưa vào danh sách chơi được.

## 3. Những gì đã làm trong V5 Ultimate
### Đồ họa & giao diện
- HUD dính trên cùng: Lv/XP, xu XP, 💎 gems, chuỗi ngày, nút Nhiệm vụ / Thành tựu / Rương / Nhạc / Ngày-Đêm / Đấu Boss.
- Nút có hover (nổi lên), active (lún xuống), disabled (mờ). Card, tab, thanh XP bo tròn, bóng đổ, chuyển cảnh mềm.
- Ngày/đêm: tự động theo giờ (19h–6h là đêm), có nút chuyển tay, lưu trong `S.v7.night`.

### Nông trại tương tác (6 luống thật)
- Mỗi luống gắn với **một từ vựng thật** trong bộ của bạn. Gieo hạt → tưới (1 lần/ngày/luống, +2 XP) → trả lời đúng từ đó thì cây lớn thêm (theo `box` SRS) → `box>=4` thì thu hoạch (+8 XP, cây gieo lại như cơ chế gốc).
- Ảnh cây dùng đúng `assets/crops/<loại>_<giai đoạn 0–4>.png`, có hiệu ứng đung đưa, luống chín phát sáng.
- Nút "Tưới tất cả", đếm vào nhiệm vụ ngày.

### 8 boss mới — Đấu trường V5 (nút "⚔️ Đấu Boss" trên HUD)
Mỗi boss có hình PNG/SVG riêng, tên Hàn + tên Anh, độ hiếm, HP, kỹ năng, hoạt ảnh xuất hiện, hiệu ứng trúng đòn / tấn công, thanh máu, thưởng XP + 💎 (lần đầu +5 💎).

| Boss | Dạng thử thách thật | Kỹ năng |
|---|---|---|
| U1 Yêu Tinh Từ Vựng 도깨비 | Trắc nghiệm nghĩa từ (từ của bạn) | Mỗi 3 lượt chỉ có 8 giây |
| U2 Rồng Ngữ Pháp 용 | **24 câu ngữ pháp thật** (trợ từ 은/는, 을/를, 에/에서, chia thì, kính ngữ, -고 싶어요, -지 마세요…) + giải thích sau mỗi câu | Mỗi 4 lượt, sai mất thêm 1 tim |
| U3 Ma Nghe 귀신 | Nghe tiếng Hàn (SpeechSynthesis ko-KR), **không hiện chữ**, chọn nghĩa | Mỗi 3 lượt đáp án mờ 2 giây |
| U4 Quái Chính Tả 강시 | Gõ đúng tiếng Hàn | Sai thì boss hồi 1 máu; 10 giây/câu |
| U5 Hổ Hàn Quốc 호랑이 | Trắc nghiệm tốc độ (hình hổ vẽ SVG riêng, vì bộ asset gốc không có hổ) | Mỗi câu chỉ 6 giây; combo ≥3 gây gấp đôi |
| U6 Bậc Thầy Bóng Tối 그림자 | Xếp đúng thứ tự câu từ câu ví dụ thật của thẻ | Mỗi 3 lượt chỉ 7 giây |
| U7 Vệ Binh Vàng 황금 수호자 | Ghép nghĩa, 8 giây/câu | Khiên vàng mỗi 4 lượt: câu đúng đầu chỉ phá khiên |
| U8 Vua Từ Vựng 왕 | **Đổi dạng mỗi lượt**: từ vựng / ngữ pháp / nghe / chính tả / xếp câu | Dưới 50% máu biến hình: sai mất 2 tim, 20% né đòn, 7 giây/câu |

Cơ chế chung: đúng gây sát thương, crit khi trả lời <3 giây, combo ≥3 tăng sát thương, ultimate mỗi 5 câu đúng liên tiếp. Sai mất tim. Thắng lưu vào `S.v7.boss8`.

### Học tập & tiến trình
- Giữ nguyên 9 chế độ học cũ + boss cổ điển + Boss World 28 boss.
- **Gems 💎:** kiếm từ đăng nhập (+3/ngày), hạ boss lần đầu (+5), thành tựu (+3), nhiệm vụ, rương. Dùng trong Cửa hàng đá quý (Cây anh đào vàng 5 💎, Mũ Vua Từ Vựng 8 💎 — mua thật, trừ gems thật).
- **12 thành tựu** có kiểm tra thật (câu đúng, Lv, boss, chuỗi ngày, từ thuộc, thu hoạch, kỷ lục đua…).
- **Nhiệm vụ ngày (3):** 10 câu đúng, hạ 1 boss, tưới 3 luống. **Nhiệm vụ tuần (2):** thuộc 5 từ mới, hạ 3 boss. Thưởng XP + gems thật.
- **Đăng nhập hằng ngày:** +20 XP, +3 💎. **Rương hằng ngày:** mở 1 lần/ngày, ngẫu nhiên XP hoặc gems, có confetti.
- **Sổ sưu tầm từ vựng:** nút trong mục Sổ sưu tầm, tiến độ thuộc theo từng nhóm.

### Animation & âm thanh
- Số sát thương bay (-2 HP, CRIT, -1 ❤), boss rung/lunge khi trúng đòn, vào trận scale-in, số XP bay, confetti khi thắng/mở rương/lên cấp.
- **Nhạc nền:** giai điệu pentatonic tự tạo bằng WebAudio (không cần file nhạc), bật/tắt trên HUD. **Âm lượng + bật/tắt hiệu ứng** trong bảng Âm thanh (bấm nút "Âm thanh: bật/tắt" ở đầu trang). SFX riêng: gieo hạt, tưới nước, xu, đánh trúng, nhận gems, mở rương.

## 4. Kiểm thử đã chạy (jsdom + Node, 2026-11-16)
- **0 lỗi JS** khi tải trang với dữ liệu cũ mô phỏng V4 (5 từ, 250 XP, không có `S.v7`/`S.bw`).
- Dữ liệu cũ được giữ: 5 từ, XP 250 → 270 sau quà đăng nhập (+20), Lv 3 đúng công thức gốc.
- Farm: gieo hạt + tưới thành công, 6 luống hiển thị.
- Boss U1 thắng sau 4 lượt (crit <3s), +5 💎 lần đầu. U2 ngữ pháp: 12 → 10 máu sau 1 câu đúng. U4 chính tả: gõ đúng → 10 → 8 máu. U3 nghe, U5 tốc độ (giới hạn 6 giây), U6 xếp câu, U7 khiên vàng (câu đúng đầu chỉ phá khiên, máu không đổi — đúng thiết kế), U8 vua (đổi dạng ngữ pháp) đều trả lời đúng/sai đúng cơ chế, sai mất 1 tim.
- Rương, nhiệm vụ, cửa hàng gems, sổ sưu tầm, boss cổ điển, Boss World (28 boss, 10 chơi được), Ghép cặp, Đua 60 giây đều mở và chạy được.
- Cú pháp: cả 6 khối `<script>` đều qua `node --check`. Mọi ảnh `assets/...` được tham chiếu đều tồn tại (đã sửa `sakura.png` → `sakura.svg`).

## 4b. V8 — Farm Scene Premium (2026-11-16, lớp `<style id="v8">` + `<script id="v8js">`)
**Vấn đề trong ảnh chụp cũ:** `.scene` dùng `farm_top.png` (ảnh vuông 394×358, nền kem) làm background `auto 100%` nên chỉ rộng ~263px ở giữa, hai bên là bầu trời trống; giếng `well.png` nằm tách biệt ở góc phải; mặt trời mờ ở góc; mưa là vệt trắng dày che cảnh. Các ảnh nhà riêng (`house/barn/windmill/well.png`) cũng là ảnh vuông có nền vẽ sẵn, không cắt rời được nên không thể xếp chồng trực tiếp.

**Cách sửa (không đổi logic game):**
- `.scene` đổi sang tỉ lệ 800/380, cao tối đa 380px (mobile 800/520). `farm_top` chuyển từ background thành ảnh hero phóng to 124% chiều cao cảnh, viền trên/dưới làm mờ bằng mask để hòa vào trời và cỏ — nhà chính, chuồng đỏ, cối xay to hơn rõ rệt, bầu trời chỉ còn ~25% khung hình.
- Phân lớp: hậu cảnh (trời + đồi xa + cỏ), trung cảnh (hero farm + cối xay + ao), tiền cảnh (cây, bụi hoa, hàng rào gỗ vẽ bằng CSS, cỏ hoa). Hai bên hero thêm cây xanh / anh đào / lá đỏ (SVG trong suốt `assets/decor/*.svg`, đung đưa) và bụi hoa `meadow.png` làm mờ viền.
- Giếng: giữ nguyên element + onclick của V5 (bấm vẫn bắn xu), chỉ đổi vị trí bằng CSS sang phải, sát mép đảo nông trại, viền trên làm mờ để hòa vào cảnh thay vì tách biệt ở góc.
- Cối xay quay: cánh quạt SVG phủ đúng vị trí cối xay trong ảnh hero, quay `16s / --wind` (gió mạnh khi bão — dùng đúng biến `--wind` của hệ thống thời tiết V5).
- Ao: 2 vòng gợn sóng lan ra đúng vị trí ao trong ảnh hero.
- Thời tiết V5 giữ nguyên (luân phiên + nút bấm): nút được thiết kế lại thành pill trắng có **icon SVG riêng** (mặt trời / mây mưa / sấm sét / cầu vồng) + nhãn "Nắng / Mưa nhẹ / Mưa lớn / Cầu vồng", tự cập nhật theo `data-w`. Mưa thưa và nhạt hơn (opacity .30, vệt 1px cách 16px), bão .50, trời nắng có quầng sáng ấm + bóng đổ và tăng bão hòa cho hero, chuyển đổi 1.5s. Cầu vồng căn giữa, rộng 52%.
- Animation chỉ dùng transform/opacity: cây đung đưa, 2 bướm bay thêm (cộng 1 bướm V4), chim + mây V4 giữ nguyên, cỏ hoa V4 giữ nguyên, mặt nước gợn sóng. Tạm dừng khi ẩn tab (`.v4pause`) và tắt khi `prefers-reduced-motion`.

**Kiểm thử (jsdom, 2026-11-16):** 0 lỗi mới (lỗi duy nhất `p.animate is not a function` cũng có ở bản cũ — jsdom thiếu WAAPI, trình duyệt thật có). Scene có class `v8d`, đủ hero/mill/ao/3 cây/2 bụi hoa/2 bướm/hàng rào/nút thời tiết; đổi `data-w` sang rain/storm/rainbow/sun thì nhãn nút đổi theo; bấm nút thời tiết chuyển sun → rain; bấm giếng không lỗi; render lại nông trại thì V8 tự nâng cấp lại; chế độ Trắc nghiệm vẫn chạy.

## 4c. V9 — Complete Icon Redesign (2026-11-16, lớp `<style id="v9">` + `<script id="v9js">`) → bản `Korean_Vocab_Farm_V6_Icon_Edition.html`
**Nguồn icon:** ảnh sprite sheet 6 cột × 4 hàng (24 icon) do Kenneth cung cấp. Ảnh gốc đã có kênh alpha trong suốt thật (nền đen chỉ là cách hiển thị) nên tách bằng kênh alpha, không cần xử lý nền: tìm ranh giới lưới bằng connected-component trên mặt nạ alpha, cắt từng icon theo bbox alpha + padding 4px, loại bỏ các chấm sáng lẻ xa thân icon, chuẩn hóa lên canvas 256×256 trong suốt, giữ nguyên chất lượng. Đã kiểm chứng bằng contact sheet: cả 24 icon nguyên vẹn, viền trắng còn nguyên, không bị cắt.

**Audit trước khi làm:** toàn bộ code có 193 ký tự emoji (71 loại). Lớp V3 đã tự đổi một phần emoji thành icon SVG cũ (`assets/icons/*.svg`: learn/book/shop/trophy/bell/save/speaker/heart/heart_off/unknown/medal/medal_off) qua map `M` + TreeWalker; các emoji còn lại (💎, ⚔️, 🔥, 🎁, ☀️, 🌙…) vẫn hiển thị dạng emoji. V9 nối tiếp đúng cơ chế đó, không sửa từng màn hình thủ công.

**Cách thay (chỉ đổi hiển thị, không đổi logic/dữ liệu):**
- **Đổi SVG cũ → PNG mới:** V9 quét mọi `<img src="assets/icons/*.svg">` mà V3 tạo ra và đổi `src` sang file mới theo map trong `assets/icons/v6/ICON_MAP.json` (vd: learn.svg → `seeds.png`, book.svg → `book.png`, shop.svg → `backpack.png`, trophy.svg → `defense.png`, bell.svg → `bell.svg` mới vẽ, save.svg → `settings.png`, speaker.svg → `listen.png`, heart.svg → `health.png`, heart_off → `health.png` mờ, medal.svg → `check.svg` mới, medal_off → `boss.png` mờ, unknown.svg → `question.svg` mới).
- **Đổi emoji còn lại → icon mới:** V9 chạy TreeWalker riêng (cùng pattern V3) trên các text node, đổi 💎→gem, ⭐→xp, 🪙→coin, 🔥→flame, ⚔️→attack, 🎁→chest, 👑→boss, 🌾→harvest, ☀️→weather, 🌙→moon, 🔇→listen mờ, 💧→water, 💔→health mờ, 🎯→quest, 🔒→lock, 📚→book, 🧺→harvest, 🏁→energy, ⚡→energy, 🛡→defense, 🌿→seeds, 🌊→water, 🔮→gem, ☠️→boss, 🥀/🐛→wilt mờ (trạng thái cây héo/sâu).
- **Không đụng emoji làm khóa dữ liệu:** emoji của vật nuôi, đồ trang trí, boss cổ điển, giai đoạn cây và toàn bộ luống vườn (`.pl` — V3 `garden()` đọc text để vẽ cây) được V9 bỏ qua, giữ nguyên ảnh PNG/SVG art sẵn có.
- **Nút chỉ có chữ được thêm icon:** Nhiệm vụ → quest, Thành tựu → defense, Nghe (phát âm/lại) → listen, Thu hoạch → harvest, Cứu tất cả → health, Đấu boss mới/Đấu lại → attack, Quản lý bộ → book (V9 bọc `syncHud` theo đúng pattern wrap của V7).
- **Icon trong CSS:** `.card::before` (learn.svg) → book.png, `.hp::before` → health.png, `.pp::before` → coin.png; `content:'🌾 '` trước tiêu đề nông trại và emoji trong nhãn `.v7farm::before` (☀️/🌙) đổi thành chữ thường.
- **7 icon còn thiếu vẽ thêm cùng phong cách sticker** (viền trắng dày, màu tươi, chi tiết đơn giản): `bell.svg` (nhắc học), `moon.svg` (đêm), `flame.svg` (chuỗi ngày), `check.svg` (hoàn thành), `lock.svg` (thành tựu khóa), `question.svg` (boss chưa gặp), `wilt.svg` (cây héo/sâu).
- **Hiển thị:** icon dùng class `.ic v9i` nên kế thừa mọi quy tắc cỡ sẵn có (tab 26px, tim boss 26px, thành tựu 42px…); hover phóng to 1.12× + nghiêng −3°, click thu nhỏ, rương vàng nhịp nhàng; icon mờ (tim đã mất, boss chưa gặp, nhạc tắt) dùng grayscale + opacity; tôn trọng `prefers-reduced-motion`.
- **Mapping tập trung:** `assets/icons/v6/ICON_MAP.json` (24 PNG + 7 SVG + map src/emoji/nút) để nâng cấp sau này chỉ cần sửa một file.

**Kiểm thử (jsdom + Playwright, 2026-11-16):** 0 lỗi JS mới (2 lỗi `el.animate is not a function` chỉ xuất hiện trong jsdom thiếu WAAPI, cũng có ở bản gốc; trình duyệt thật 0 pageerror). Quét toàn bộ text hiển thị sau khi mở đủ 6 tab + 5 modal + đấu boss cổ điển + đấu trường V7: **0 emoji còn lại**; 37 ảnh trong DOM, tất cả đều tồn tại trên đĩa, **0 file SVG cũ còn được dùng**; 18 icon v6 khác nhau đã hiển thị. Tab: mầm/book/ba lô/khiên/chuông/bánh răng; HUD: sao XP/xu/gem/ngọn lửa + nút cuộn/khiên/rương/tai nghe/thời tiết/kiếm; thành tựu mở: mầm/sách/huy hiệu boss/giỏ, khóa: ổ khóa vàng; sổ boss chưa gặp: dấu "?" xanh; tim boss: tim đỏ, tim mất mờ xám; vườn cổ điển vẫn vẽ cây đúng 5 giai đoạn (V9 không phá `garden()`); dữ liệu cũ giữ nguyên (5 từ, XP 250 → 270 sau quà đăng nhập). Chụp màn hình thật desktop 900px + mobile 390px đã kiểm chứng bằng mắt.

## 4d. V10 — Premium Decor Expansion (2026-11-16, lớp `<style id="v10">` + `<script id="v10js">`) → bản `Korean_Vocab_Farm_V6_Decor_Expansion.html`
**Nguồn decor:** ảnh sprite sheet 4 cột × 3 hàng (12 món) do Kenneth cung cấp. Ảnh gốc là RGB nền đen (không có alpha), nên tách bằng độ sáng: nền đen → trong suốt theo ramp (sáng ≤8 → trong suốt, ≥48 → đục), cộng dọn các chấm lẻ xa thân món bằng connected-component. Kiểm chứng: máy kéo giữ nguyên lốp đen (gai lốp xám đủ rõ để giữ hình), cả 12 món nguyên vẹn trên nền sáng, không viền đen. Chuẩn hóa lên canvas 512×512 (món dài nhất 480px). Lưu ở `assets/decor/` với đúng tên yêu cầu: `ancient_tree, pumpkin, farmhouse, tractor, cherry_blossom, watermelon_garden, wind_chime, autumn_tree, snowman, butterflies, roasted_sweet_potato, moon_lantern.png`.

**Catalog 12 món** (trong `v10.js`, bảng `DECOR`, tên/giá/loại/độ hiếm/mùa/hiệu ứng tập trung một chỗ):
| Món | Giá | Loại | Độ hiếm | Mùa | Hiệu ứng |
|---|---|---|---|---|---|
| Cây Cổ Thụ | 150 XP | Thiên nhiên | Hiếm | Quanh năm | Lá đung đưa |
| Bí Ngô Vàng | 120 XP | Theo mùa | Phổ biến | Thu | Phát sáng dịu |
| Nhà Nông Ấm Cúng | 250 XP | Công trình | Sử thi | Quanh năm | Khói ống khói bay |
| Máy Kéo Đỏ | 300 XP | Công trình | Sử thi | Quanh năm | Bấm vào: rung máy + khói + tiếng |
| Hoa Anh Đào | 5 💎 | Theo mùa | Sử thi | Xuân | Cánh hoa rơi |
| Vườn Dưa Hấu | 180 XP | Theo mùa | Hiếm | Hạ | Lá đung đưa |
| Chuông Gió | 4 💎 | Đặc biệt | Hiếm | Đặc biệt | Rung nhẹ theo gió |
| Cây Phong Đỏ | 150 XP | Theo mùa | Hiếm | Thu | Lá vàng rơi |
| Người Tuyết | 200 XP | Theo mùa | Sử thi | Đông | Tuyết rơi nhẹ |
| Đàn Bướm | 6 💎 | Thiên nhiên | Sử thi | Xuân | Bay lượn quanh chỗ đặt |
| Khoai Lang Nướng | 100 XP | Theo mùa | Phổ biến | Thu | Khói bốc lên |
| Đèn Trăng | 8 💎 | Đặc biệt | Huyền thoại | Đặc biệt | Phát sáng mạnh vào ban đêm |

**Cửa hàng Trang trí** (mở từ banner cuối Cửa hàng nông trại cũ, hoặc nút "Trang trí nông trại" dưới vườn): modal riêng với 2 tab **Cửa hàng / Kho đồ**, bộ lọc theo loại (Thiên nhiên/Công trình/Theo mùa/Đặc biệt) + độ hiếm (select) + mùa (Xuân/Hạ/Thu/Đông/Đặc biệt), ảnh lớn, huy hiệu độ hiếm/loại/mùa, "Đang vào mùa" viền vàng cho món đúng mùa hiện tại, số lượng đã sở hữu, ví XP/💎. Mua thật: trừ XP qua `S.spent` hoặc trừ 💎 qua `S.v7.gems`, hết tiền thì nút khóa, mua xong cập nhật HUD.

**Đặt đồ thật trên nông trại:** từ Kho đồ bấm "Đặt lên nông trại" → chế độ đặt: món hiện mờ viền đứt nét trên cảnh farm, kéo thả (chuột + cảm ứng) hoặc bấm vào cảnh để di chuyển, nút **Xoay** (45° mỗi lần), **Xác nhận** / **Hủy**. Vùng đặt là dải cỏ trước cảnh farm (y 78–95%) để đồ không đè lên nhà/ao trong ảnh nền. **Kiểm tra chồng lấn:** xác nhận bị chặn + rung + báo nếu món mới nằm quá gần món đã đặt (bướm được phép gần hơn). Bấm vào món đã đặt → menu **Di chuyển / Xoay 45° / Thu hồi về kho**. Thu hồi trả lại 1 món vào kho.

**Mùa & sự kiện:** món theo mùa có huy hiệu mùa; đặt đúng mùa được **+10 XP thưởng mùa** (mỗi món một lần mỗi mùa, lưu trong `S.v7.decor.bonus`). Bộ sưu tập theo mùa: Xuân (anh đào, bướm), Hạ (dưa hấu), Thu (phong, bí ngô, khoai lang), Đông (người tuyết), Đặc biệt (đèn trăng, chuông gió).

**Dữ liệu & kỹ thuật:** dữ liệu mới chỉ trong `S.v7.decor` (`own` số lượng từng món, `placed` mảng `{id,x,y,rot}`, `bonus`) — migration mặc định khi chưa có. Lưu qua `save()` gốc nên thoát game mở lại vẫn còn vị trí. Không sửa `ITEMS` cũ, không đổi ID cũ, decor cũ (cây/bí/ngô/máy kéo SVG ở `.yard`) vẫn hiện như trước. Animation chỉ dùng transform/opacity, tạm dừng khi ẩn tab, tắt khi `prefers-reduced-motion`.

**Kiểm thử (jsdom + Playwright, 2026-11-16):** 0 lỗi JS. Mở đủ 12 thẻ; lọc Thiên nhiên → 2, lọc Thu → 3; mua bằng XP (trừ 150) và bằng 💎 (trừ 8), mua thiếu tiền bị chặn; đặt cây → kho giảm 1, cảnh hiện ảnh; đặt bí ngô đúng mùa Thu (tháng 11) được +10 XP; đặt chồng vị trí bị chặn, dời ra thì được; xoay 45°; di chuyển sang vị trí mới; thu hồi trả lại kho; tải lại dữ liệu localStorage vẫn giữ 2 món đã đặt; banner cửa hàng cũ mở đúng modal; desktop + mobile chụp màn hình thật đã kiểm chứng bằng mắt.

## 4e. V11 — New Decor: thay thế HOÀN TOÀN decor cũ (2026-11-16, patch build `patch_new_decor()` trong `build.py` + lớp `<style id="v11">` + `<script id="v11js">`) → bản `Korean_Vocab_Farm_V6_New_Decor.html`

**Phạm vi xóa (đã kiểm chứng bằng quét toàn file: 0 emoji decor cũ, 0 tham chiếu SVG decor cũ, 0 `has(6..17)`):**
- **Cửa hàng cũ:** 4 decor cơ bản (Cây xanh, Bí ngô, Nhà nông, Máy kéo) và 8 decor theo mùa (anh đào, bướm, dưa hấu, chuông gió, lá đỏ, Trăng Chuseok, người tuyết, khoai lang) bị xóa khỏi `ITEMS` — cửa hàng cũ chỉ còn 6 vật nuôi (Gà, Chó, Heo, Bò, Cừu, Ngựa) và đổi tiêu đề thành "Cửa hàng vật nuôi".
- **Hiệu ứng gameplay gắn với decor cũ:** toàn bộ sức mạnh theo chỉ số `has(6..17)` bị gỡ về giá trị mặc định — thu hoạch +5 XP/bón (bí ngô), ×1.5 XP thu hoạch (máy kéo), +25% XP thu hoạch (lá đỏ), gieo lại sau 30 phút (cây xanh), boss 4 tim (nhà nông), boss 8 máu (chuông gió), +2 XP mỗi câu đúng (anh đào), ghép sai không mất lượt (bướm), combo Đua nhanh hơn (dưa hấu), quà Chuseok +20 XP/ngày (trăng), bảo vệ chuỗi ngày (người tuyết), thắng boss +20 XP (khoai lang). Các sức mạnh của **vật nuôi** (Gà, Chó, Heo, Bò, Cừu, Ngựa) giữ nguyên.
- **Bản đồ nghệ thuật V3:** 12 mục emoji decor cũ bị xóa khỏi bảng `M`; lính bí ngô trong Đấu Boss World đổi từ emoji 🎃 sang ảnh `pumpkin.png` mới.
- **Art cũ dùng ở nơi khác:** cây bên trái/phải và bướm trong cảnh farm V8/V4, cây anh đào vàng trong Cửa hàng đá quý V7 — tất cả đổi sang PNG decor mới (`ancient_tree`, `autumn_tree`, `cherry_blossom`, `butterflies`).
- **File đã xóa khỏi `assets/`:** toàn bộ 11 SVG decor cũ (`tree, pumpkin, sakura, tractor, watermelon, windchime, maple, moon, snowman, sweetpotato, butterflies`) và `assets/buildings/house.png` (không còn tham chiếu). Thư mục `assets/decor/` hiện chỉ chứa đúng 12 PNG mới.

**Migration (chạy trước lần render đầu tiên, chèn ngay sau định nghĩa `ITEMS`):** dữ liệu cũ `S.own` có chỉ số 6–17 (decor cũ) được lọc bỏ, giữ lại vật nuôi 0–5; **hoàn lại toàn bộ XP đã mua decor cũ** (trừ khỏi `S.spent`: Cây xanh 40, Bí ngô 60, Nhà nông 200, Máy kéo 300, mỗi món theo mùa 120–150). Lần mở game đầu tiên sau cập nhật hiện thông báo hoàn XP một lần. Không mất thẻ, XP tổng, Level, Gem hay dữ liệu học.

**Mới trong V10/V11 cho bản này:**
- Nút **Xem trước** trên mỗi thẻ trong Cửa hàng Trang trí: mở cửa sổ lớn với ảnh to, độ hiếm, loại, mùa, mô tả, hiệu ứng riêng, giá và nút Mua / Mở kho đồ.
- Banner "Cửa hàng Trang trí mới" chuyển lên **đầu** trang cửa hàng (trước tiêu đề "Cửa hàng vật nuôi") để người chơi thấy ngay.
- Handle gỡ lỗi `window.__v11.check()` trả về số món trong `ITEMS`, loại vật phẩm, số vật phẩm mồ côi trong `S.own`, emoji decor cũ còn trong văn bản hiển thị và số món decor mới.

**Kiểm thử (jsdom + Playwright, 2026-11-16):** 0 lỗi JS mới (2 lỗi `el.animate is not a function` chỉ có trong jsdom, đã có ở bản gốc). Seed dữ liệu cũ `own=[0,1,6,7,8,9,10,15]`, `spent=900` → sau migration `own=[0,1]`, `spent=30`, hoàn 870 XP. Cửa hàng chỉ còn 6 vật nuôi; sân chỉ hiện Gà và Chó; cây cảnh V8 dùng PNG mới; boss 3 tim / 10 máu; chuỗi ngày không còn được bảo vệ (n=1 thay vì 6); quét toàn bộ màn hình còn 0 emoji; 44/44 đường dẫn ảnh tồn tại; mua + xem trước + đặt decor mới vẫn chạy; thẻ và XP nguyên vẹn.

## 4f. V12 — Fantasy Bosses: 4 boss huyền thoại mới vào Boss World (2026-11-16, patch build `patch_fantasy_bosses()` trong `build.py` + lớp `<style id="v12">` + `<script id="v12js">`) → bản `Korean_Vocab_Farm_V6_Fantasy_Bosses.html` (dựa trên bản New Decor: decor cũ đã xóa)

**Hình ảnh (ảnh gốc của Kenneth, không vẽ lại):** 2 PNG gốc đã có alpha thật (Hổ Thần, Nữ Hoàng San Hô) giữ nguyên; 2 JPG nền trắng (Quạ Bóng Đêm, Vua Bọ Pha Lê) gỡ nền bằng flood-fill từ viền (`process_bosses.py`, scipy `binary_propagation`, viền alpha làm mềm ~1px). Cả 4 cắt viền trong suốt, resize tối đa 768px, lưu PNG trong suốt ở `assets/bosses/`: `thunder_tiger.png`, `coral_queen.png`, `astral_raven.png`, `crystal_beetle_king.png` (~1 MB/món).

**Tích hợp Boss World:** 4 boss mới là N9–N12 trong thế giới "Bộ Boss Mới V6" (luôn mở), nâng Boss World từ 28 lên **32 boss, 14 boss chơi được**. Boss cũ giữ nguyên. Điều kiện mở khóa (cổng trong `v12.js`, kiểm tra qua `bOpen` nên không thể vào lén bằng `bwStart`):
- N9 Hổ Thần Sấm Sét (Sấm Sét, Huyền thoại, 16 máu): hạ ít nhất 1 boss bất kỳ.
- N10 Nữ Hoàng San Hô (Đại Dương, Thần thoại, 18 máu): hạ ít nhất 3 boss.
- N11 Quạ Bóng Đêm Pháp Sư (Bóng Đêm, Thần thoại, 18 máu): hạ ít nhất 5 boss.
- N12 Vua Bọ Pha Lê (Pha Lê, Huyền thoại, 16 máu): đánh bại cả 3 boss Fantasy còn lại.
Số boss đã hạ tính cả 3 hệ: boss cổ điển (`S.dex`), Boss World (`S.bw.dex`) và đấu trường V7 (`S.v7.boss8`).

**Kỹ năng (gắn vào engine BW gốc qua patch, không viết lại engine):**
- **Hổ Thần:** Thunder Claw (cuồng nộ dưới 30% máu, sai một câu mất 2 tim), Lightning Storm (mỗi 4 lượt, câu sai mất thêm 1 tim), Divine Thunder (biến hình ở 50% máu, giáng đòn mạnh mất 1 tim).
- **Nữ Hoàng:** Bubble Prison (mỗi 4 lượt, câu đúng tiếp theo bị giam, không gây sát thương), hồi máu (mỗi 4 lượt hồi 1 máu, dùng lại kỹ năng `heal` gốc), Abyssal Tide (biến hình ở 50% máu, đòn mạnh).
- **Quạ:** Shadow Feather (né đòn 22%, văn bản né giờ gọi tên đúng từng boss), Dark Curse (mỗi 4 lượt, nguyền rủa 3 lượt: không cộng combo, không crit, combo về 0), Eclipse (biến hình ở 50% máu, đòn mạnh).
- **Vua Bọ:** Crystal Shield (khiên mỗi 5 lượt, dùng lại kỹ năng `shield` gốc), Gem Explosion (câu đúng phá khiên bị phản đòn, mất 1 tim — không thể thua vì đòn phản, tối thiểu còn 1 tim), Crystal Cataclysm (biến hình ở 50% máu, đòn mạnh).
Đòn Ultimate của cả 4 chỉ nổ một lần mỗi trận (cờ `ph` 1→2) và không thể kết liễu người chơi (giữ lại tối thiểu 1 tim). Cảnh báo kỹ năng hiện trong trận (bong bóng, lời nguyền, bão sét, cuồng nộ). Thẻ boss có viền màu theo hệ, chip hệ dùng icon V9 (sét/nước/trăng/đá quý), danh sách 3 kỹ năng, điều kiện khóa hiển thị khi chưa mở.

**Phần thưởng:** thắng theo công thức gốc của Boss World (Boss cuối 90 XP + 8 XP mỗi tim còn lại + 20 XP lần đầu). Lần đầu hạ mỗi boss Fantasy: **+5 💎 và một danh hiệu** (Chúa Tể Sấm Sét / Nữ Hoàng Đại Dương / Chúa Tể Bóng Đêm / Vua Pha Lê), lưu ở `S.v7.fb` và `S.v7.fbTitles`, hiện trong thẻ boss và thông báo. Thắng lại chỉ nhận XP (không farm đá quý). Số lần hạ lưu ở `S.bw.dex` như boss cũ — Boss Collection chính là bản đồ Boss World.

**Kiểm thử (jsdom + Playwright, 2026-11-16):** 0 lỗi JS. Cuồng nộ (sai 1 câu mất 2 tim ở 25% máu), bão sét (sai mất 2 tim ở lượt 4), bong bóng (câu đúng gây 0 sát thương), lời nguyền (câu đúng chỉ gây 1 sát thương, combo về 0), né đòn (0 sát thương), phản đòn (khiên chặn sát thương, mất 1 tim), biến hình + Ultimate (mất 1 tim, chỉ 1 lần), thưởng lần đầu (+5 💎, danh hiệu) và thắng lại (+0 💎), cổng khóa (N12 không vào được khi chưa đủ điều kiện), boss cũ F1/N8 và boss cổ điển vẫn chạy, 0 emoji trên màn hình, dữ liệu lưu nguyên vẹn. Ảnh chụp desktop + mobile đã kiểm tra.

## 4g. V13 — Boss World Map: 8 vùng đất trên một bản đồ (2026-11-16, patch build `patch_boss_map()` trong `build.py` + lớp `<style id="v13">` + `<script id="v13js">`) → bản `Korean_Vocab_Farm_V6_Boss_World_Map.html` (dựa trên bản Fantasy Bosses)

**Ảnh bản đồ (ảnh của Kenneth):** `assets/maps/boss_world_map.jpg` — ảnh bản đồ 8 vùng đất Kenneth cung cấp, tối ưu từ PNG 3,1 MB xuống JPEG 376 KB (giữ nguyên 1672×941, không vẽ lại). Bản đồ hiển thị 8 vùng với đường nối bằng chấm sáng có sẵn trong ảnh. Mỗi vùng có một chip hiển thị trực tiếp trên ảnh (tên, tiến trình, trạng thái khóa/hoàn thành); vị trí chip được đo chính xác từ ảnh bằng phân tích màu (dải tên + viên tiến trình), không ước lượng bằng mắt. Nút "?" mở hướng dẫn, nút "✕" quay lại boss cổ điển — cả hai đều là nút thật, đè lên đúng vị trí nút vẽ trong ảnh. Trên điện thoại (<700px), ảnh thu thành banner và các chip xếp thành lưới 2 cột để bấm được.

**8 vùng đất (đủ 32 boss, không thiếu, không xóa):**
| Vùng | Boss | Boss có thể đấu |
|---|---|---|
| Rừng Nấm | F1, F2, N2, F3 | 2 (F1, N2) |
| Rừng Cổ Đại | N1, N6, F4 | 3 |
| Thung Lũng Rồng | V1, V2, V3, N3, V4 | 1 (N3) |
| Vương Quốc Băng Giá | I1, I2, I3, N4, I4 | 1 (N4) |
| Ngôi Làng Ma | D1, D2, D3, D4 | 0 — chỉ xem |
| Núi Sấm Sét | O1, N7, N9 | 2 (N7, N9) |
| Vương Quốc San Hô | O2, O3, N10, O4 | 1 (N10) |
| Vương Quốc Huyền Bí | N5, N12, N8, N11 | 4 |
Boss cuối mỗi vùng là boss có thể đấu cuối cùng trong vùng (F3→N2, F4, N3, N4, không có, N9, O4, N11). Chi tiết mỗi vùng mở trong cửa sổ riêng: mô tả, thanh tiến trình, từng boss (ảnh, HP, độ hiếm, kỹ năng, trạng thái), boss cuối nổi bật viền vàng, nút Khiêu chiến. Màn hình kết thúc trận có thêm nút "Khu vực: …" để quay lại vùng vừa đánh.

**Cơ chế mở khóa (chuỗi vùng, thay thế cổng đếm số trận thắng của V12):** bắt đầu tại Rừng Nấm; trong vùng, boss mở theo thứ tự; hạ boss cuối của một vùng để mở vùng tiếp theo (vùng không có boss đấu được, như Ngôi Làng Ma, được bỏ qua trong chuỗi — hạ xong Vương Quốc Băng Giá sẽ mở cả Ngôi Làng Ma lẫn Núi Sấm Sét). Boss đã hạ trước đây vẫn mở được (grandfathering) nên không mất tiến trình cũ. Điều kiện mở khóa của 4 boss Fantasy đổi từ "hạ ≥1/3/5 boss" sang "đi theo chuỗi vùng" (Hổ ở Núi Sấm Sét, San Hô ở Vương Quốc San Hô, Quạ và Bọ ở Vương Quốc Huyền Bí) — boss nào đã hạ rồi thì vẫn mở. Không có điều kiện Level tối thiểu (yêu cầu chỉ nói "có thể thêm").

**Phần thưởng theo vùng:** hoàn thành một vùng (hạ hết boss có thể đấu) nhận ngay rương kho báu một lần: XP 40+20×vùng, đá quý 2+vùng (vùng 1: 40 XP + 2 💎; vùng 8: 180 XP + 9 💎) và danh hiệu "Chinh Phục <tên vùng>" (lưu ở `S.v7.map.done` và `S.v7.fbTitles`). Vùng đã hoàn thành trước khi có V13 được cấp rương bù một lần khi mở game lần đầu. Ngôi Làng Ma chưa có rương (không có boss đấu được).

**Boss Collection:** nút "Bộ sưu tập boss" trên bản đồ mở danh sách đủ 32 boss theo vùng: ảnh (hoặc "?" nếu chưa có hình), tên (hoặc "???" nếu chưa gặp và chưa có hình), độ hiếm, HP, số lần đã hạ, trạng thái (Đã hạ/Đã gặp/Chưa gặp/Sắp ra mắt), kèm danh hiệu đã nhận.

**Giới hạn trung thực:** chỉ 14/32 boss có hình và kỹ năng riêng nên mới đấu được; 18 boss còn lại hiện bóng "Sắp ra mắt" và không chặn tiến trình (tiến trình vùng chỉ tính boss có thể đấu). Ngôi Làng Ma hiện chỉ để xem. Hệ thống chiến đấu, XP, Level, dữ liệu học và KEY `hanvocab.v1` giữ nguyên.

**Kiểm thử (jsdom + Playwright, 2026-11-16):** 0 lỗi JS. Người mới: chỉ Rừng Nấm mở, chỉ F1 đấu được, boss chưa có hình và boss vùng khóa đều vào không được. Hạ F1 rồi N2 → rương vùng 1 (+2 💎, danh hiệu), Rừng Cổ Đại mở. Boss đã hạ (N9) vẫn mở dù chưa hạ N7; hạ N4 mở cả Ngôi Làng Ma và Núi Sấm Sét. Rương bù cho vùng Huyền Bí đã hoàn thành trước đây. Boss cổ điển và boss cũ vẫn đấu bình thường. 0 emoji trên màn hình. Đã chụp màn hình thật desktop + mobile.

## 4h. V14 — Bilingual English ↔ Vietnamese (2026-11-16, patch build `patch_bilingual()` trong `build.py` + lớp `<style id="v14">` + `<script id="v14js">`) → bản `Korean_Vocab_Farm_V6_Bilingual.html` (dựa trên bản Boss World Map)

**Vào chế độ tiếng Anh:** trong mục Học, chọn chế độ **"Tiếng Anh (EN–VI)"** trong ô chọn chế độ (cạnh "Thẻ ghi nhớ", "Trắc nghiệm", "Đấu boss"). Game lúc này có 3 hướng học: từ vựng tiếng Hàn (như cũ), English → Vietnamese và Vietnamese → English — chuyển qua lại bằng hai nút EN → VI / VI → EN trong giao diện tiếng Anh. Hệ thống tiếng Hàn, XP, Level, nhiệm vụ và Boss World giữ nguyên.

**Từ vựng (96 từ, 12 chủ đề × 8 từ):** Animals, Food, Fruits, Vegetables, Family, School, Jobs, Clothes, House, Nature, Transportation, Daily Activities. Mỗi từ có: từ tiếng Anh, nghĩa tiếng Việt, phiên âm IPA, loại từ (danh từ/động từ/tính từ), câu ví dụ tiếng Anh + bản dịch. Phát âm dùng giọng đọc tiếng Anh có sẵn của trình duyệt (SpeechSynthesis, en-US) — không kèm file âm thanh, không tạo ảnh mới (icon dùng bộ icon V9 có sẵn). Thêm/sửa/xóa từ ở mục **Từ vựng**: thêm từng từ bằng form, nhập hàng loạt bằng JSON hoặc từng dòng dạng `en | vi | ipa | pos | ex | exvi`, xuất toàn bộ danh sách ra file JSON hoặc sao chép.

**7 dạng bài + flashcard + ôn tập (11 mục):**
- **Flashcard:** thẻ hai mặt lật 3D (mặt trước: từ hoặc nghĩa theo chiều học; mặt sau: từ tương ứng, IPA, loại từ, câu ví dụ + dịch, nút nghe), nút Đã nhớ / Chưa nhớ, chuyển thẻ, trộn.
- **Trắc nghiệm:** chọn nghĩa đúng (EN→VI) hoặc chọn từ đúng (VI→EN), 4 đáp án, có IPA + nút nghe.
- **Gõ từ:** nhập nghĩa tiếng Việt (EN→VI, chấp nhận không dấu) hoặc nhập từ tiếng Anh (VI→EN, có gợi ý chữ cái, kiểm tra chính tả).
- **Ghép cặp:** nối 4 từ Anh với 4 nghĩa Việt, cặp đúng khóa xanh.
- **Điền câu:** câu ví dụ khuyết từ, chọn từ điền vào.
- **Xếp chữ:** bấm các chữ cái đã xáo trộn để xếp thành từ, có nút gợi ý và xóa.
- **Nghe:** nghe phát âm rồi chọn nghĩa (EN→VI) hoặc chọn cách viết (VI→EN), có nút nghe lại.
- **Đua 60s:** trả lời nhanh liên tục trong 60 giây, hết giờ tổng kết điểm và XP (tối đa 30 XP/ván).
- **Ôn tập:** từ trả lời sai tự vào danh sách cần ôn, xếp theo số lần sai (hay quên nhất lên trước), có nút ôn từng từ và ôn tất cả.
- **Chủ đề:** 12 thẻ chủ đề với tiến trình đã thuộc, số đúng/sai, nút Học và Flashcard riêng từng chủ đề.

**Ôn tập thông minh (SRS):** mỗi từ có hộp nhớ 0–5 (đúng lên hộp, sai về 0), số lần đúng/sai riêng, danh sách từ sai. Câu hỏi ưu tiên từ sai nhiều, hộp thấp và từ chưa học. Thống kê tiến độ theo từng chủ đề.

**XP và chống farm:** trả lời đúng khi lên hộp được **+10 XP**; trả lời đúng lại cùng một từ trong 10 phút thì hộp vẫn lên nhưng **không nhận thêm XP** (đã kiểm chứng: đúng lần 2 liên tiếp +0 XP). Combo 5 câu đúng liên tiếp +5 XP. Hoàn thành một chủ đề (cả 8 từ lên hộp ≥2) nhận **+50 XP + 3 💎** một lần. Đua 60s tối đa 30 XP/ván. Câu sai không nhận XP. Đáp án đúng tiếng Anh được tính vào nhiệm vụ ngày chung ("Trả lời đúng 20 câu ở bất kỳ chế độ nào") và 2 nhiệm vụ ngày riêng mới: 10 câu Anh → Việt và 10 câu Việt → Anh (thêm vào vòng xoay nhiệm vụ ngày, tổng 6 nhiệm vụ). Chuỗi ngày học (streak) và XP/Level dùng chung với game.

**Lưu trữ:** tiến trình tiếng Anh lưu riêng trong `S.v7.en` (hộp nhớ, đúng/sai, từ cần ôn, chủ đề đã xong, từ tự thêm, chiều học, bài tập đang chọn) — không đụng thẻ tiếng Hàn, không đổi KEY `hanvocab.v1`.

**Kiểm thử (jsdom + Playwright, 2026-11-16):** 0 lỗi JS. Trắc nghiệm/gõ/ghép/điền/xếp chữ/nghe/flashcard/ôn tập/chủ đề/thêm-nhập-xóa từ/đua 60s đều chạy; chống farm XP đúng; hoàn thành chủ đề Animals cấp +50 XP +3 💎; từ sai vào danh sách ôn; thẻ tiếng Hàn và dữ liệu cũ nguyên vẹn; 0 emoji trên màn hình; đã chụp màn hình thật desktop + mobile.

## 5. Chưa làm / giới hạn đã biết
- 18 boss Boss World cũ vẫn là bóng "Sắp ra mắt" (theo README gốc, cần vẽ hình + kỹ năng riêng cho từng boss — không bịa hình).
- Chế độ "Đặt câu (Claude chấm)" vẫn phụ thuộc môi trường Claude như bản gốc; ngoài môi trường đó sẽ tự chấm bằng tay.
- Nhạc nền là giai điệu WebAudio tự tạo, chưa phải bản nhạc thu sẵn.
- `window.__v7` là handle gỡ lỗi (xem `B7`, `BOSSES`, `GRAMMAR`, `V` trong console), không ảnh hưởng gameplay.
