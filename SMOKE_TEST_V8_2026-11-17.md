# Kiểm thử V8 — Smart Vocabulary Import
Ngày: 2026-11-17 · Môi trường: jsdom 24 (Node, chạy code JS thật trong DOM) + Node trực tiếp
Build: `out/index.html` 653 KB (V6 + V15 + V16, SheetJS 0.18.5 vendored)

## Kết quả tổng: 80/80 kiểm tra đạt (test16.js) + 40/40 kiểm tra chức năng V7 đạt (smoke.js)

Chỉ có 1 "lỗi" ghi nhận trong cả hai lần chạy: `EPROTO ... SSL routines: wrong version number`
— đây là nhiễu mạng của máy kiểm thử khi jsdom cố tải Google Fonts (V6 dùng font ngoài),
không phải lỗi của ứng dụng; font có font dự phòng nên giao diện vẫn hiển thị.

## 11 mục bắt buộc (§11 của yêu cầu V8)

| # | Mục kiểm thử | Kết quả |
|---|---|---|
| 1 | CSV tiếng Việt có dấu | ĐẠT — BOM bị loại, dấu tiếng Việt giữ nguyên |
| 2 | CSV có dấu phẩy trong nội dung | ĐẠT — `"quả táo, ngon"` đọc đúng một ô |
| 3 | Excel nhiều sheet | ĐẠT — 2 sheet Fruits/Animals, chọn sheet Animals chỉ nhập lion/tiger |
| 4 | File thiếu cột | ĐẠT — CSV chỉ có cột English → mọi dòng báo lỗi "Thiếu nghĩa tiếng Việt" |
| 5 | File rỗng | ĐẠT — đọc được 0 dòng, báo rõ, không crash |
| 6 | File lỗi định dạng | ĐẠT — JSON sai cú pháp báo lỗi, không nhập gì |
| 7 | File 10.000 từ | ĐẠT — chuẩn bị xong trong 789 ms, xem trước phân trang 50 dòng/trang |
| 8 | File có từ trùng | ĐẠT — phát hiện trùng trong file + trùng với dữ liệu cũ |
| 9 | Nhập lại file CSV vừa xuất | ĐẠT — xuất CSV (có BOM) → đọc lại → 5/5 dòng đầu khớp hoàn toàn; xuất Excel → đọc lại đủ số dòng |
| 10 | Nhập EN không ảnh hưởng KO | ĐẠT — nhập EN: số thẻ Hàn không đổi; nhập KO: số từ EN custom không đổi |
| 11 | Cập nhật từ không xóa tiến trình | ĐẠT — cập nhật từ custom: cùng uid, box 4 / đúng 10 giữ nguyên; cập nhật từ có sẵn: override giữ id, box/due giữ nguyên (KO: box 4, due giữ nguyên) |

## Kiểm thử thêm (ngoài 11 mục)

- Nhận diện dấu phân cách: comma / semicolon / tab / pipe — đều đạt.
- Nhận diện tiêu đề tiếng Việt (Từ tiếng Anh, Nghĩa, Loại, Cấp độ...) và ánh xạ cột khi cột xáo trộn thứ tự — đạt.
- Nhận diện ngôn ngữ từ nội dung (Hangul → KO, Latin → EN) — đạt.
- Quản lý bộ từ EN: tạo, trùng tên trả về bộ cũ, đổi tên, di chuyển từ, gộp bộ, không cho xóa bộ cuối — đạt.
- Quản lý bộ từ KO: tạo (dùng ensureDeck của V6), đổi tên — đạt.
- Luồng cũ vẫn hoạt động: nhập KO bằng textarea + `importNow()`, nhập EN bằng `vocabImport()` (dạng `en | vi | ...`) — đạt.
- Hồi quy V7 (smoke.js): 40/40 kiểm tra chức năng đạt — hub, 10 chế độ, farm, boss, thống kê, sao lưu, migration save V6. (1 kiểm tra "tiêu đề file là V7" không đạt vì tiêu đề nay là V8 — đúng như thiết kế.)

## Lỗi thật tìm thấy khi kiểm thử (đã sửa trước khi đóng gói)

1. **Dòng tiêu đề bị nhập thành từ vựng** — vòng lặp chuẩn bị bắt đầu từ dòng 0 thay vì dòng sau tiêu đề. Đã sửa: bắt đầu từ `startRow` (dòng sau tiêu đề).
2. **V15 bọc trong IIFE nên V16 không gọi được `enOld`/`buildWords`/`save15`** — lần đầu `applyEN` rơi vào object dự phòng rỗng: báo cáo vẫn ghi "đã nhập" nhưng dữ liệu không lưu. Đã sửa: `window.__v15` nay công khai các hàm nội bộ cần thiết (`buildWords`, `enOld`, `en15`, `save15`, `dl`, `esc`, `pop15`, `renderTab`, `topicName`, `counts15`); V16 gọi qua accessor và báo lỗi rõ nếu không truy cập được, không im lặng ghi vào object rỗng.
3. **Từ trùng ưu tiên sai bản ghi** — khi một từ vừa có trong từ điển gốc vừa do người dùng tự thêm, hệ thống cập nhật từ gốc thay vì từ của người dùng. Đã sửa: chỉ mục trùng ưu tiên bản ghi custom.

## Chưa kiểm thử (ghi rõ theo yêu cầu)

- **Trình duyệt thật (Chrome/Firefox trên máy người dùng)**: môi trường kiểm thử này chặn localhost, chặn miền muse.ai và chặn tunnel, nên không mở được trang bằng trình duyệt thật. Cần kiểm tra trên GitHub Pages sau khi triển khai: mở file, bấm "Nhập thông minh", tải file mẫu Excel lên và nhập thử.
- **Kiểm tra giới hạn dung lượng localStorage thật**: logic cảnh báo ngưỡng ~4,8 MB đã có trong code và được kiểm tra bằng đọc code, chưa kích hoạt được lỗi quota thật trong jsdom (localStorage của jsdom không giới hạn như trình duyệt thật).
- **Giọng đọc TTS / SpeechRecognition**: không thay đổi so với V7, không kiểm thử lại ở V8.
