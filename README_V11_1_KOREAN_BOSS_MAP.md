# KOREAN & ENGLISH VOCAB FARM V11.1 — BẢN ĐỒ BOSS TIẾNG HÀN

Bản sửa lỗi V11.1: đưa Bản Đồ Boss Adventure (V11) vào Korean Hub.

## Vấn đề đã sửa

Ở V11, Bản Đồ Boss chỉ có trong English Hub (tab 🗺️ Bản Đồ Boss). Mở giao
diện tiếng Hàn thì không thấy mục này. V11.1 thêm một nút vào thanh điều
hướng tiếng Hàn, mở **chính bản đồ V11 đang dùng trong English Hub** — không
tạo bản sao thứ hai.

## Cách dùng

1. Mở game, ở giao diện tiếng Hàn, nhìn thanh điều hướng dưới cùng (trên
   điện thoại) hoặc phía trên khu vực học (trên máy tính).
2. Bấm nút **🗺️ Bản Đồ Boss** (nút cuối cùng của thanh, có viền vàng nhạt).
3. Bản đồ mở ngay, tiêu đề **"보스 모험 지도 – Bản Đồ Boss Tiếng Hàn"**,
   ngôn ngữ chiến đấu tự chọn **🇰🇷 Tiếng Hàn**.
4. Bấm vào một vùng đất → xem 3 boss → **Bắt đầu chiến đấu**. Câu hỏi là
   tiếng Hàn lấy từ thẻ từ của bạn.
5. Đóng bản đồ (nút ✕ ở góc trên) → quay lại đúng giao diện tiếng Hàn.

Mở từ English Hub thì mọi thứ như V11: tiêu đề "Legendary Boss Adventure
Map", ngôn ngữ chiến đấu tự chọn 🇬🇧 Tiếng Anh.

## Câu hỏi tiếng Hàn — nguồn dữ liệu

- Câu hỏi lấy từ **thẻ từ tiếng Hàn của bạn** (`S.cards`): Hàn → Việt
  (chọn nghĩa), Việt → Hàn (chọn từ Hangul), Nghe (bấm "Nghe phát âm" rồi
  chọn từ Hangul nghe được).
- Nếu bạn đã **chọn một bộ từ** ở giao diện tiếng Hàn và bộ đó có từ 8 thẻ
  trở lên, câu hỏi chỉ lấy từ bộ đó. Bộ nhỏ hơn 8 thẻ → dùng tất cả thẻ.
- Không lọc theo trạng thái SRS (từ đã thuộc hay chưa thuộc đều có thể ra).
- Nếu bạn có **dưới 8 thẻ tiếng Hàn**, trận đấu dùng câu hỏi tiếng Anh và
  hiện cảnh báo rõ ràng trên màn hình chiến đấu — không im lặng đổi ngôn ngữ.
- Trả lời tiếng Hàn **không sửa** thẻ từ của bạn, chỉ ghi thống kê
  (`S.v7.en19.koStats`). Chế độ ngữ pháp / xếp câu / đọc hiểu (chỉ có
  tiếng Anh) được chuyển thành trắc nghiệm tiếng Hàn để trận đấu luôn là
  tiếng Hàn.

## Lỗi lớn tìm thấy khi kiểm thử V11.1 (đã sửa)

**Trận boss tiếng Hàn ở V10/V11 thực ra chưa bao giờ hỏi tiếng Hàn.**
Nguyên nhân: `koPool()` trong `v18.js` và `v19.js` đọc `window.S`, nhưng
game V6 khai báo `let S` — biến toàn cục kiểu lexical, **không phải**
thuộc tính của `window`, nên `window.S` luôn là `undefined` và bộ câu hỏi
tiếng Hàn luôn rỗng. Mọi trận tiếng Hàn đều âm thầm rơi về câu hỏi tiếng
Anh (kèm banner "Bạn mới có 0/8 thẻ" — con số 0 là sai). Các bộ kiểm thử
V10/V11 chỉ kiểm tra "đã ghi nhận thắng" nên không phát hiện ra.

V11.1 sửa cả hai chỗ sang đọc trực tiếp `S` (giống `en19()` vẫn làm),
đồng thời kiểm thử nay khẳng định câu hỏi đầu tiên của trận tiếng Hàn
phải là một thẻ Hangul thật, không có từ tiếng Anh nào trong câu hỏi.

## Tiến trình hai ngôn ngữ

Không đổi: vẫn lưu trong `S.v7.en19`, thắng/sao/mở khóa riêng theo từng
ngôn ngữ. Thắng boss bằng tiếng Hàn không mở khóa gì cho tiếng Anh và
ngược lại. Thắng cả hai ngôn ngữ được huy hiệu 🌐 Song ngữ + danh hiệu
"Bậc Thầy Song Ngữ". Dữ liệu V11 mở bằng V11.1 chạy bình thường, không
cần chuyển đổi.

## Không thay đổi

- Không tạo bản đồ thứ hai, không thêm boss mới, không đổi ID boss.
- Không xóa: English Hub, Korean Hub, Smart Import, thư viện Oxford 3000,
  A1–A2, mini game, nông trại, boss cũ, 30 boss V10, 30 boss V11, XP,
  vàng, kim cương, thành tích.
- Đấu trường boss tiếng Hàn cũ (chế độ "Đấu boss" trong phần Học) giữ
  nguyên. Nút Bản Đồ Boss chỉ thêm vào, không thay tab nào.
- Lựa chọn ngôn ngữ học chính (Korean Farm / English Farm) không bị ảnh
  hưởng khi mở bản đồ — chỉ ngôn ngữ chiến đấu của bản đồ thay đổi.

## Hạn chế đã biết

- Kiểm thử trình duyệt thật vẫn chưa chạy được từ môi trường này (như các
  bản trước). Anh kiểm tra giúp trên GitHub Pages sau khi deploy: nút Bản
  Đồ Boss trên điện thoại (thanh tab dưới cùng), phát âm tiếng Hàn
  (speechSynthesis), bố cục bản đồ trên màn hình nhỏ.
- Ảnh boss V11 giữ nguyên như V11 (3 ảnh cắt nền thật + 27 chân dung).
- Bộ câu hỏi tiếng Hàn chưa lọc theo trạng thái SRS và chưa có chế độ gõ
  Hangul bằng bàn phím (chế độ "Việt → Hàn" hiện là chọn từ Hangul trong
  4 đáp án). Nếu Anh muốn, bản sau có thể thêm lựa chọn bộ từ ngay trên
  bản đồ và chế độ gõ Hangul.
