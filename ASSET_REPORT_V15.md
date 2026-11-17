# ASSET REPORT — V15 Premium Pet System (2026-11-17)

## Tổng quan

- **41 PNG, nền trong suốt (kênh alpha), tổng 8,4 MB** (8.559 KB) sau tối ưu.
- **36 hình thái thú**: 12 loài × 3 giai đoạn, file
  `assets/pets/v15/<loài>_s<1-3>.png`.
- **5 trứng**: `assets/pets/v15/eggs/egg_<lửa|băng|rừng|ánh sáng|bóng tối>.png`.
- Tất cả hiển thị bằng `<img>` thật trong Hub/trận đấu; nếu ảnh lỗi tải, UI
  hiện vòng tròn chữ cái đầu thay vì ảnh vỡ.

## Cách tạo

1. **Vẽ mới bằng AI** (`media.generate_image`, một ảnh mỗi lần gọi, 41 lần
   gọi): mỗi loài × giai đoạn có mô tả riêng (ngoại hình, màu sắc, tư thế,
   chi tiết phân biệt giai đoạn), dùng chung hậu tố phong cách để đồng bộ:
   "Cute chibi fantasy pet, 2D mobile game art, soft cel shading, vibrant
   colors, big expressive eyes, full body, centered, facing forward, plain
   solid very light blue background, no text, no watermark, no frame, no
   other characters". **Không cắt thú từ 5 ảnh tham chiếu** — ảnh mẫu chỉ
   dùng để định phong cách (bảng tím, viền vàng, thú chibi fantasy). Một
   lần tạo lỗi được thử lại một lần với mô tả đơn giản hơn.
2. **Tách nền bằng rembg** (môi trường ảo `~/workspace/.v10venv`, model
   `u2net` / `isnet-general-use`, chạy CPU; **không dùng `bria-rmbg`** — gây
   hết bộ nhớ VM như đã biết từ V10). Mọi file đều được kiểm tra có kênh
   alpha sau khi tách.
3. **Tối ưu kích thước**: ảnh gốc 1600×1600 (≈ 51,8 MB tổng) được thu nhỏ
   còn tối đa 512 px (LANCZOS, giữ tỉ lệ) và lưu PNG optimize → **8,4 MB**.
   Kích thước hiển thị lớn nhất trong game ≈ 220 px nên 512 px vẫn dư cho
   màn hình retina.

## Danh sách file (đã kiểm tra: tồn tại, PNG, có alpha, kích thước hợp lệ)

| Loài | Giai đoạn 1 | Giai đoạn 2 | Giai đoạn 3 |
|---|---|---|---|
| Rồng Lửa (dragon) | Rồng Lửa Nhỏ 160 KB | Rồng Lửa 232 KB | Rồng Thần Lửa 360 KB |
| Chim Phượng (phoenix) | Phượng Non 174 KB | Chim Phượng 157 KB * | Phượng Hoàng Lửa 285 KB |
| Hồ Ly Băng (fox) | Hồ Ly Băng Nhỏ 167 KB | Hồ Ly Băng 264 KB | Cửu Vĩ Băng Hồ 311 KB |
| Rùa Pha Lê (turtle) | Rùa Pha Lê Nhỏ 122 KB | Rùa Pha Lê 242 KB | Huyền Quy Pha Lê 309 KB |
| Cá Voi Nhỏ (whale) | Cá Voi Nhỏ 139 KB | Cá Voi Xanh 70 KB | Kình Vương Đại Dương 251 KB |
| Cú Thông Thái (owl) | Cú Con 260 KB | Cú Thông Thái 226 KB | Cú Hiền Triết 122 KB * |
| Thỏ Ngọc (rabbit) | Thỏ Ngọc Nhỏ 166 KB | Thỏ Ngọc 195 KB | Thỏ Ngọc Thần 226 KB |
| Gấu Mật Ong (bear) | Gấu Mật Ong Nhỏ 170 KB | Gấu Mật Ong 179 KB | Gấu Mật Vàng 238 KB |
| Hươu Rừng (deer) | Hươu Rừng Nhỏ 186 KB | Hươu Rừng 251 KB | Lộc Thần Rừng Xanh 223 KB |
| Mèo Phép (cat) | Mèo Phép Nhỏ 190 KB | Mèo Phép 174 KB | Ma Pháp Miêu Vương 317 KB |
| Sói Sấm (wolf) | Sói Sấm Nhỏ 200 KB | Sói Sấm 225 KB | Lôi Lang Vương 283 KB |
| Kỳ Lân Ánh Sáng (unicorn) | Kỳ Lân Nhỏ 122 KB | Kỳ Lân Ánh Sáng 271 KB | Thánh Kỳ Lân 246 KB |

\* Hai hình thái vẽ dọc (Phượng S2, Cú S3) có kích thước **256×512** thay vì
vuông 512×512 — hiển thị bình thường trong khung ảnh của game.

| Trứng | File | Kích thước |
|---|---|---|
| Trứng Lửa | `eggs/egg_fire.png` | 173 KB |
| Trứng Băng | `eggs/egg_ice.png` | 207 KB |
| Trứng Rừng | `eggs/egg_forest.png` | 180 KB |
| Trứng Ánh Sáng | `eggs/egg_light.png` | 122 KB |
| Trứng Bóng Tối | `eggs/egg_dark.png` | 164 KB |

## Lưu ý trung thực

- **Không có bảng ghi model rembg theo từng ảnh**: điều phối viên tạo ảnh
  đã báo cáo hoàn thành nhưng không để lại bảng phân công model từng file
  (chỉ biết dùng `u2net` và `isnet-general-use`). Điều đã kiểm chứng được
  trên đĩa: đủ 41 file, đúng tên, đúng định dạng PNG, tất cả có kênh alpha,
  kích thước hợp lý — build script `build_v15.py` cũng khẳng định lại các
  điều này trước khi đóng gói.
- Ảnh AI tạo mới nên ngoại hình mỗi hình thái là diễn giải theo mô tả, có
  thể khác đôi chút so với nhân vật trong ảnh tham chiếu — nhưng giữ cùng
  phong cách chibi fantasy, màu sắc và đặc điểm nhận dạng (sừng rồng, đuôi
  hồ ly, cánh phượng...).
- File trung gian (`.webp` gốc, `media-generation-*.json`) không đưa vào
  ZIP; build chỉ lấy đúng 41 PNG đích.
