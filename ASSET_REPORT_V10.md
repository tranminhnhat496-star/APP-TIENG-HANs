# Báo cáo asset V10 — 30 ảnh boss từ 3 poster

Ngày: 2026-11-17. Công cụ: Python + Pillow + rembg (background removal),
môi trường ảo `~/workspace/.v10venv`. Script tái tạo:
`tools/split_bosses.py` (được đóng gói trong ZIP, cùng `manifest.json`).

## Ảnh gốc (do Anh gửi)

| File | Nội dung | Kích thước |
|---|---|---|
| `image.jpg` | Lưới 5×2, 10 thẻ boss tiếng Anh (có khung + tên) | 3200×1510 |
| `image-2.png` | Poster Tập 2 — 10 boss nguyên tố (2 hàng × 5) | 1536×1024 |
| `image.png` | Poster Tập 3 — 10 boss huyền thoại (2 hàng × 5) | 1536×1024 |

## Quy trình

1. **Cắt từng nhân vật**: tọa độ đo trực tiếp từ ảnh (không đoán).
   - Lưới tiếng Anh: phát hiện đường viền thẻ màu tím nhạt → 5 cột
     (x 45–643, 673–1271, 1301–1899, 1929–2527, 2557–3155), 2 hàng
     (y 136–785, 818–1466); vùng nhân vật y 146–693 / 828–1375 (thanh tên
     nằm ở ~87% chiều cao thẻ, đã kiểm tra bằng cách xem ảnh cắt thử).
   - Poster: ô 307,2 px; hàng nguyên tố y 150–425 / 520–800; hàng huyền
     thoại y 80–428 / 515–800; cắt x có chồng lấn ±12–22 px để không mất
     cánh/vũ khí ở mép.
   - Ngoại lệ: hàng 1 huyền thoại, cột 1–3 bắt đầu từ y=170 (banner tiêu
     đề giữa poster kết thúc ~y175, chữ của nó lọt vào ảnh cắt); Titan
     bắt đầu y=105 (vệt thác nước); Gấu Trúc x1=918 (mép dung nham);
     Long Băng Tuyết (289, 170, 615, 425) — sửa cuối sau khi xem lại.
2. **Tách nền** (rembg, nền trong suốt): thử 4 model trên từng boss và
   chọn model tốt nhất cho từng boss bằng cách xem bảng đối chiếu trên
   nền trắng + nền tối. Model `bria-rmbg` (982 MB) **không dùng được**:
   làm tràn bộ nhớ máy ảo — không thử lại.
3. **Tăng độ đậm alpha**: alpha < 20 → 0, sau đó gamma 0,5 — để các phần
   thân "ma" (trong suốt một nửa) mà model giữ ở alpha giữa trở nên đặc.
4. **Cắt theo khung alpha** (lề 4 px), thu nhỏ tối đa 512 px, lưu PNG.

## Chọn model theo từng boss (đã xem bảng đối chiếu)

- **isnet-general-use** (13): toàn bộ 10 boss tiếng Anh, Dung Nham,
  Bạch Tuộc Biển Sâu, Sư Điểu Thần Phong, Rùa Núi, Pháp Sư Bóng Đêm,
  Lôi Thần Sư Vương, Huyền Quy Thần Thú, Cửu Vĩ Ma Ảnh.
- **isnet-anime** (8): Kỳ Lân, Long Băng Tuyết, Gấu Trúc, Tiên Hoa,
  Lang Vương Băng Sương, Titan, Phượng Hoàng, Cổ Thụ.
- **u2netp** (4): Hồ Ly Anh Đào, Hắc Long Nham Hỏa, Bóng Ma Hư Không,
  Bạch Tuộc Đại Dương.

Không có model nào thắng ở mọi trường hợp: isnet thua ở các ca ngụy trang
(tối-trên-tối: Hắc Long/Lang Vương/Titan/Bóng Ma; sáng-trên-sáng: Long Băng;
hồng-trên-hồng: Hồ Ly; trắng: Kỳ Lân; xanh-trên-xanh: Gấu Trúc/Tiên Hoa);
u2netp một mình giữ lại đĩa nền tối của các thẻ tiếng Anh.

## Kết quả — 30 PNG (tổng 8.140,5 KB ≈ 7,9 MB)

| Boss | Model | Kích thước | Dung lượng |
|---|---|---|---|
| Vua Slime Từ Vựng | isnet-general-use | 512×472 | 376,9 KB |
| Yêu Tinh Chính Tả | isnet-general-use | 512×492 | 503,2 KB |
| Rồng Ngữ Pháp | isnet-general-use | 512×504 | 491,4 KB |
| Ma Thần Âm Thanh | isnet-general-use | 511×512 | 425,3 KB |
| Nhện Câu Chữ | isnet-general-use | 512×506 | 482,3 KB |
| Cú Oxford | isnet-general-use | 512×498 | 507,6 KB |
| Hổ Tốc Độ | isnet-general-use | 512×497 | 532,8 KB |
| Pháp Sư Phát Âm | isnet-general-use | 512×497 | 509,8 KB |
| Từ Điển Bóng Tối | isnet-general-use | 512×501 | 540,3 KB |
| Vua Tiếng Anh | isnet-general-use | 512×494 | 560,3 KB |
| Kỳ Lân Thần Vũ | isnet-anime | 279×248 | 127,2 KB |
| Long Băng Tuyết | isnet-anime | 289×255 | 139,7 KB |
| Gấu Trúc Hiệp Sĩ | isnet-anime | 316×238 | 160,0 KB |
| Dung Nham Khổng Lồ | isnet-general-use | 316×209 | 128,0 KB |
| Hồ Ly Anh Đào | u2netp | 315×233 | 140,3 KB |
| Bạch Tuộc Biển Sâu | isnet-general-use | 329×264 | 168,0 KB |
| Sư Điểu Thần Phong | isnet-general-use | 317×269 | 132,3 KB |
| Rùa Núi Trường Thọ | isnet-general-use | 326×270 | 161,7 KB |
| Pháp Sư Bóng Đêm | isnet-general-use | 330×266 | 156,4 KB |
| Tiên Hoa Rừng Xanh | isnet-anime | 309×260 | 136,2 KB |
| Hắc Long Nham Hỏa | u2netp | 329×348 | 225,2 KB |
| Lang Vương Băng Sương | isnet-anime | 274×258 | 156,8 KB |
| Lôi Thần Sư Vương | isnet-general-use | 286×255 | 133,3 KB |
| Bạch Tuộc Đại Dương | u2netp | 330×258 | 165,9 KB |
| Titan Dung Nham | isnet-anime | 318×323 | 204,2 KB |
| Phượng Hoàng Thánh Quang | isnet-anime | 329×285 | 170,9 KB |
| Bóng Ma Hư Không | u2netp | 327×263 | 160,7 KB |
| Huyền Quy Thần Thú | isnet-general-use | 315×268 | 163,5 KB |
| Cửu Vĩ Ma Ảnh | isnet-general-use | 341×275 | 189,6 KB |
| Cổ Thụ Thần Mộc | isnet-anime | 319×278 | 190,7 KB |

Đã kiểm tra bằng mắt trên cả nền trắng và nền tối: cả 30 ảnh đều đầy đủ
nhân vật, không còn tên, khung, nền hay nhân vật khác. Ảnh được dùng trong
game tại `assets/bosses/v10/<id>.png` (đường dẫn lưu trong `v18_data.js`).

## Hạn chế đã biết

- **Hồ Ly Anh Đào**: còn một vệt mây hoa màu xám mờ ở góc trên-trái
  (đám mây hoa nền gốc của poster, model giữ lại một phần). Gần như không
  thấy trên nền tối của game; không cắt thêm vì sẽ mất tai hoa của nhân vật.
- **Hắc Long Nham Hỏa / Bạch Tuộc Đại Dương**: thân có vùng alpha thấp
  (hiệu ứng lửa/nước nửa trong suốt) — đã tăng độ đậm, nhân vật vẫn đặc
  và rõ trên cả hai nền.
- Ảnh poster gốc không có trong ZIP (bản quyền hình ảnh của Anh); chỉ có
  30 PNG đã cắt + script tái tạo.
