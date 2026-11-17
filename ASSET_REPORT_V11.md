# Báo cáo tài nguyên ảnh V11 — 30 boss Siêu Huyền Thoại

## Nguồn
- Ảnh gốc: `image-3.png` (1536×1024) — lưới 3 hàng × 10 cột, mỗi ô là một
  thẻ có khung vàng + thanh tên ở dưới. Ảnh tham chiếu bản đồ: `image-4.png`
  (941×1672) — chỉ dùng làm tài liệu thiết kế vị trí 10 vùng đất, **không**
  dùng làm nền bản đồ (xem README).
- Công cụ: `tools/split_bosses_v11.py` (đi kèm trong ZIP, thư mục `tools/`).
  Kết quả: 30 file `assets/bosses/v11/v11_*.png`, tổng **1.962 KB**,
  kèm `src/bosses11/manifest_v11.json`.

## Hình học lưới (đo từ các đường phân cách tối của poster)
- Cột (x): 15–166, 170–319, 323–470, 474–619, 623–770, 774–919, 923–1069,
  1073–1219, 1223–1369, 1373–1533.
- Hàng (vùng nhân vật, đã loại thanh tên): y 132–335, 411–596, 669–849
  (đỉnh thẻ 128/407/665; thanh tên bắt đầu ở khoảng 78% chiều cao thẻ).
- Chân dung cắt sát: thụt vào 6px mỗi phía để loại khung vàng của thẻ.

## Đã thử những gì (và kết quả thật)
Poster V11 khác poster V10: đây là tranh vẽ **full-bleed** — nhân vật chạm
sát mọi mép, nền vẽ liền với nhân vật, không có vùng nền trống để tách.

| Phương pháp | Kết quả |
|---|---|
| isnet-general-use (rembg) | Giữ nguyên cả thẻ thành hình chữ nhật, hoặc "ma" (mất) các nhân vật tối |
| isnet-anime (rembg) | Làm "ma" gần hết các boss |
| u2netp (rembg) | Chỉ ra được vài bán thân, phần lớn mất nét |
| u2net (mô hình đầy đủ, 176 MB) | **Tốt nhất** — vẫn "ma" 4 boss (boneking 0.00, heavenknight 0.13, ancienttree 0.24, timemachine 0.20) và giữ hình chữ nhật ở ~18 boss |
| Đưa cả thẻ vào u2net | Tệ hơn — giữ cả thanh tên như một vật thể |
| SAM (Segment Anything) | Không chạy được: torch CPU ~850 MB tải timeout từ download-r2.pytorch.org |

Kết luận: **không thể tách nền sạch tự động cho toàn bộ 30 boss** của poster
này. Tôi không giả vờ đã tách được.

## Kết quả cuối cùng (trung thực)
- **3 boss có ảnh cắt nền trong suốt thật** (u2net): Lôi Thần Minotaur
  (bán thân đầu/sừng/vai), Thần Phượng Viêm Quang (đầu/cánh/thân),
  Đại Sư Gấu Trúc (toàn thân đầy đủ).
- **27 boss còn lại là ảnh chân dung cắt sát**: toàn bộ nhân vật, không tên,
  không khung, không nhân vật khác. Giao diện game đóng khung thống nhất
  cho mọi chân dung (bo góc + phát sáng theo hệ) nên nhìn vẫn đồng nhất
  với 3 ảnh trong suốt.
- Một vài chân dung còn **vệt trang trí vàng mờ ở mép trên** — đó là hoa văn
  vẽ sẵn ở đỉnh thẻ gốc, không phải khung còn sót. Gần như không thấy trên
  nền tối của game.
- Không dùng nguyên ảnh poster làm ảnh của bất kỳ boss nào.

## Danh sách theo boss
| Boss | Loại ảnh | Kích thước (px) | Dung lượng |
|---|---|---|---|
| Hỏa Vương Diệt Thế | chân dung | 139x203 | 71.8 KB |
| Băng Long Cực Quang | chân dung | 137x203 | 70.0 KB |
| Lôi Thần Minotaur | **cắt nền trong suốt** | 147x188 | 64.0 KB |
| Cửu Đầu Hắc Long | chân dung | 133x203 | 71.8 KB |
| Thần Phượng Viêm Quang | **cắt nền trong suốt** | 115x151 | 31.5 KB |
| Hải Long Vực Sâu | chân dung | 133x203 | 69.4 KB |
| Golem Huyền Thạch | chân dung | 134x203 | 69.3 KB |
| Kỵ Sĩ Hư Không | chân dung | 134x203 | 71.9 KB |
| Thanh Long Lục Bảo | chân dung | 134x203 | 70.3 KB |
| Mãnh Hổ Võ Thần | chân dung | 148x203 | 77.3 KB |
| Cá Voi Tinh Hà | chân dung | 139x185 | 65.8 KB |
| Hồ Ly Cửu Vĩ | chân dung | 137x185 | 62.0 KB |
| Thần Mộc Cổ Đại | chân dung | 135x185 | 67.1 KB |
| Cỗ Máy Thời Gian | chân dung | 133x185 | 67.6 KB |
| Nữ Hoàng Băng Giá | chân dung | 135x185 | 65.6 KB |
| Rồng Dung Nham | chân dung | 133x185 | 62.6 KB |
| Điểu Vương Phong Lôi | chân dung | 134x185 | 65.8 KB |
| Bạch Tuộc Vương Giả | chân dung | 134x185 | 66.4 KB |
| Vua Xương Bóng Tối | chân dung | 134x185 | 67.7 KB |
| Lộc Thần Ánh Sáng | chân dung | 148x185 | 67.0 KB |
| Voi Thần Kim Giáp | chân dung | 139x180 | 67.0 KB |
| Nữ Hoàng Bướm Mộng | chân dung | 137x180 | 66.0 KB |
| Cá Mập Bạo Chúa | chân dung | 135x180 | 63.3 KB |
| Rồng Tinh Vân | chân dung | 133x180 | 63.8 KB |
| Đại Sư Gấu Trúc | **cắt nền trong suốt** | 147x162 | 51.9 KB |
| Oni Huyết Ảnh | chân dung | 133x180 | 63.3 KB |
| Thiên Điểu Pha Lê | chân dung | 134x180 | 61.0 KB |
| Nữ Vương Xà Ảnh | chân dung | 134x180 | 66.9 KB |
| Hiệp Sĩ Thiên Giới | chân dung | 134x180 | 63.6 KB |
| Ma Long Vô Cực | chân dung | 148x180 | 70.5 KB |


(Kích thước và dung lượng chính xác từng file xem trong
`src/bosses11/manifest_v11.json` — trường `size`, `kb`, `model`,
`crop` cho từng boss.)

## Kiểm tra bằng mắt
Đã xem contact sheet của cả 3 hàng trên nền tối và nền trắng: mọi nhân vật
đầy đủ, không còn tên, không còn khung, không lẫn nhân vật khác. 3 ảnh cắt
nền trong suốt hiển thị đúng trên cả hai nền.
